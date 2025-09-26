// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Use audited Uniswap V3 core & periphery interfaces from npm packages instead of ad-hoc declarations
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256 price);
    function updatePrice(address token) external;
}

/**
 * @title EnhancedPortfolioManager  
 * @dev Smart contract with integrated Uniswap trading and price oracles
 * @notice Secure on-chain portfolio management with automated trading
 */
contract EnhancedPortfolioManager is ReentrancyGuard, Ownable {
    
    // Structs
    struct UserPortfolio {
        uint256 stopLossPercent;     // Basis points: 100 = 1%
        uint256 takeProfitPercent;   // Basis points: 100 = 1%
        bool panicModeActive;        // Emergency mode flag
        mapping(address => uint256) tokenAllocations; // Token => allocation %
        address[] allocatedTokens;   // Array of allocated tokens
        uint256 totalAllocation;     // Total allocation (10000 = 100%)
        uint256 lastRebalanceTime;   // Timestamp of last rebalance
    }
    
    struct TokenInfo {
        bool isSupported;
        string symbol;
        uint8 decimals;
        TokenCategory category;
        address uniswapPool;         // Primary Uniswap pool for this token
        uint24 poolFee;              // Pool fee tier (3000 = 0.3%)
        uint256 lastPriceUpdate;     // Timestamp of last price update
    }
    
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadline;
    }
    
    enum TokenCategory {
        ALTCOIN,
        MEMECOIN, 
        STABLECOIN,
        BTC
    }
    
    // State variables
    mapping(address => UserPortfolio) public userPortfolios;
    mapping(address => TokenInfo) public supportedTokens;
    mapping(address => uint256) public tokenPrices; // Token => price in USDC (18 decimals)
    address[] public tokenList;
    
    // Uniswap contracts
    IUniswapV3Factory public immutable uniswapFactory;
    ISwapRouter public immutable swapRouter;
    IPriceOracle public priceOracle;

    // Automation controller allowed to invoke automated risk actions
    address public automationController;
    
    // Reference tokens
    address public immutable WETH;
    address public immutable USDC;
    address public immutable USDT;
    
    // Constants
    uint256 public constant MAX_PERCENTAGE = 10000; // 100% in basis points
    uint256 public constant MIN_PERCENTAGE = 100;   // 1% minimum allocation
    uint256 public constant PRICE_PRECISION = 1e18; // 18 decimal precision for prices
    uint256 public constant MAX_SLIPPAGE = 500;     // 5% max slippage
    uint256 public constant REBALANCE_COOLDOWN = 1 hours; // Minimum time between rebalances
    
    // Events
    event StopLossSet(address indexed user, uint256 percent);
    event TakeProfitSet(address indexed user, uint256 percent);
    event PanicModeTriggered(address indexed user);
    event PanicModeDeactivated(address indexed user);
    event PortfolioRebalanced(address indexed user, address[] tokens, uint256[] allocations);
    event TokenSwapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event PriceUpdated(address indexed token, uint256 newPrice);
    event TokenAdded(address indexed token, string symbol, TokenCategory category);
    event AutomationControllerSet(address indexed controller);
    event AutomatedSellExecuted(address indexed user, address indexed token, uint256 amountIn, uint256 amountOut, string reason);
    
    // Modifiers
    modifier tokenSupported(address token) {
        require(supportedTokens[token].isSupported, "Token not supported");
        _;
    }
    
    modifier validPercentage(uint256 percentage) {
        require(percentage <= MAX_PERCENTAGE, "Percentage exceeds maximum");
        _;
    }
    
    modifier notInPanicMode(address user) {
        require(!userPortfolios[user].panicModeActive, "User in panic mode");
        _;
    }

    modifier onlyAutomation() {
        require(msg.sender == automationController, "Not automation");
        _;
    }
    
    modifier canRebalance(address user) {
        UserPortfolio storage portfolio = userPortfolios[user];
        require(
            block.timestamp >= portfolio.lastRebalanceTime + REBALANCE_COOLDOWN,
            "Rebalance cooldown active"
        );
        require(
            portfolio.totalAllocation == MAX_PERCENTAGE,
            "Portfolio allocation incomplete"
        );
        _;
    }
    
    /**
     * @dev Constructor
     * @param _uniswapFactory Uniswap V3 Factory address
     * @param _swapRouter Uniswap V3 SwapRouter address  
     * @param _weth WETH token address
     * @param _usdc USDC token address
     * @param _usdt USDT token address
     */
    constructor(
        address _uniswapFactory,
        address _swapRouter,
        address _weth,
        address _usdc,
        address _usdt
    ) {
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        swapRouter = ISwapRouter(_swapRouter);
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        
        // Add base tokens
        _addToken(_weth, "WETH", 18, TokenCategory.ALTCOIN, 3000);
        _addToken(_usdc, "USDC", 6, TokenCategory.STABLECOIN, 0);
        _addToken(_usdt, "USDT", 6, TokenCategory.STABLECOIN, 3000);
    }
    
    /**
     * @dev Set stop-loss percentage for user
     * @param percentage Stop-loss percentage in basis points
     */
    function setStopLoss(uint256 percentage) 
        external 
        validPercentage(percentage) 
    {
        require(percentage >= MIN_PERCENTAGE, "Percentage too low");
        require(percentage <= 5000, "Stop-loss cannot exceed 50%");
        
        userPortfolios[msg.sender].stopLossPercent = percentage;
        emit StopLossSet(msg.sender, percentage);
    }
    
    /**
     * @dev Set take-profit percentage for user
     * @param percentage Take-profit percentage in basis points
     */
    function setTakeProfit(uint256 percentage) 
        external 
        validPercentage(percentage) 
    {
        require(percentage >= MIN_PERCENTAGE, "Percentage too low");
        
        userPortfolios[msg.sender].takeProfitPercent = percentage;
        emit TakeProfitSet(msg.sender, percentage);
    }
    
    /**
     * @dev Activate panic mode - converts all positions to stablecoins
     */
    function activatePanicMode() external nonReentrant {
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        require(!portfolio.panicModeActive, "Panic mode already active");
        
        portfolio.panicModeActive = true;
        
        // Convert all non-stablecoin positions to USDC
        _executeEmergencyConversion(msg.sender);
        
        emit PanicModeTriggered(msg.sender);
    }
    
    /**
     * @dev Deactivate panic mode
     */
    function deactivatePanicMode() external {
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        require(portfolio.panicModeActive, "Panic mode not active");
        
        portfolio.panicModeActive = false;
        emit PanicModeDeactivated(msg.sender);
    }
    
    /**
     * @dev Set portfolio allocation for multiple tokens
     * @param tokens Array of token addresses
     * @param allocations Array of allocation percentages (basis points)
     */
    function setPortfolioAllocation(
        address[] calldata tokens,
        uint256[] calldata allocations
    ) external nonReentrant notInPanicMode(msg.sender) {
        require(tokens.length == allocations.length, "Array length mismatch");
        require(tokens.length > 0, "No tokens provided");
        
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        
        // Clear existing allocations
        _clearUserAllocations(msg.sender);
        
        uint256 totalAllocation = 0;
        
        // Set new allocations
        for (uint256 i = 0; i < tokens.length; i++) {
            require(supportedTokens[tokens[i]].isSupported, "Token not supported");
            require(allocations[i] >= MIN_PERCENTAGE, "Allocation too low");
            
            portfolio.tokenAllocations[tokens[i]] = allocations[i];
            portfolio.allocatedTokens.push(tokens[i]);
            totalAllocation += allocations[i];
        }
        
        require(totalAllocation == MAX_PERCENTAGE, "Total allocation must equal 100%");
        portfolio.totalAllocation = totalAllocation;
        
        emit PortfolioRebalanced(msg.sender, tokens, allocations);
    }
    
    /**
     * @dev Execute manual token swap
     * @param params Swap parameters
     */
    function executeSwap(SwapParams calldata params) 
        external 
        nonReentrant 
        tokenSupported(params.tokenIn)
        tokenSupported(params.tokenOut)
        notInPanicMode(msg.sender)
    {
        require(params.amountIn > 0, "Invalid input amount");
        require(params.deadline >= block.timestamp, "Swap expired");
        require(params.minAmountOut > 0, "Invalid minimum output");
        
        // Transfer tokens from user
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        
        // Execute swap
        uint256 amountOut = _performSwap(
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            params.minAmountOut,
            msg.sender
        );
        
        emit TokenSwapped(msg.sender, params.tokenIn, params.tokenOut, params.amountIn, amountOut);
    }
    
    /**
     * @dev Rebalance user's portfolio to target allocations
     */
    function rebalancePortfolio() 
        external 
        nonReentrant 
        notInPanicMode(msg.sender)
        canRebalance(msg.sender)
    {
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        require(portfolio.allocatedTokens.length > 0, "No allocation set");
        
        // Update all token prices first
        _updateAllPrices();
        
        // Calculate current portfolio value and target allocations
        (uint256 totalValue, uint256[] memory currentValues) = _calculatePortfolioValue(msg.sender);
        require(totalValue > 0, "No portfolio value");
        
        // Execute rebalancing swaps
        _executeRebalancing(msg.sender, totalValue, currentValues);
        
        portfolio.lastRebalanceTime = block.timestamp;
        
        emit PortfolioRebalanced(
            msg.sender, 
            portfolio.allocatedTokens, 
            _getAllocationsArray(msg.sender)
        );
    }
    
    /**
     * @dev Get current token price in USDC
     * @param token Token address
     * @return price Price in USDC (18 decimals)
     */
    function getTokenPrice(address token) 
        external 
        view 
        tokenSupported(token)
        returns (uint256 price) 
    {
        if (token == USDC || token == USDT) {
            return PRICE_PRECISION; // $1.00
        }
        
        return tokenPrices[token];
    }
    
    /**
     * @dev Update token price from Uniswap pool
     * @param token Token address to update
     */
    function updateTokenPrice(address token) external tokenSupported(token) {
        _updateTokenPrice(token);
    }
    
    /**
     * @dev Add supported token
     * @param token Token address
     * @param symbol Token symbol
     * @param decimals Token decimals
     * @param category Token category
     * @param poolFee Uniswap pool fee tier
     */
    function addToken(
        address token,
        string calldata symbol,
        uint8 decimals,
        TokenCategory category,
        uint24 poolFee
    ) external onlyOwner {
        _addToken(token, symbol, decimals, category, poolFee);
    }
    
    /**
     * @dev Set price oracle contract
     * @param _priceOracle Price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = IPriceOracle(_priceOracle);
    }

    /**
     * @dev Set automation controller contract allowed to call automated actions
     */
    function setAutomationController(address controller) external onlyOwner {
        automationController = controller;
        emit AutomationControllerSet(controller);
    }
    
    // Internal functions
    
    function _addToken(
        address token,
        string memory symbol,
        uint8 decimals,
        TokenCategory category,
        uint24 poolFee
    ) internal {
        require(!supportedTokens[token].isSupported, "Token already supported");
        
        address pool = address(0);
        if (token != USDC && token != USDT) {
            pool = uniswapFactory.getPool(token, USDC, poolFee);
            require(pool != address(0), "Uniswap pool not found");
        }
        
        supportedTokens[token] = TokenInfo({
            isSupported: true,
            symbol: symbol,
            decimals: decimals,
            category: category,
            uniswapPool: pool,
            poolFee: poolFee,
            lastPriceUpdate: 0
        });
        
        tokenList.push(token);
        
        // Initialize price
        if (token != USDC && token != USDT) {
            _updateTokenPrice(token);
        } else {
            tokenPrices[token] = PRICE_PRECISION;
        }
        
        emit TokenAdded(token, symbol, category);
    }
    
    function _updateTokenPrice(address token) internal {
        if (token == USDC || token == USDT) {
            tokenPrices[token] = PRICE_PRECISION;
            return;
        }
        
        TokenInfo storage tokenInfo = supportedTokens[token];
        require(tokenInfo.uniswapPool != address(0), "No pool available");
        
        // Get price from Uniswap pool
        IUniswapV3Pool pool = IUniswapV3Pool(tokenInfo.uniswapPool);
        (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();
        
        // Calculate price based on pool configuration
        uint256 price;
        if (pool.token0() == token) {
            // token is token0, USDC is token1
            price = _calculatePriceFromSqrt(sqrtPriceX96, tokenInfo.decimals, 6, false);
        } else {
            // token is token1, USDC is token0  
            price = _calculatePriceFromSqrt(sqrtPriceX96, 6, tokenInfo.decimals, true);
        }
        
        tokenPrices[token] = price;
        tokenInfo.lastPriceUpdate = block.timestamp;
        
        emit PriceUpdated(token, price);
    }
    
    function _calculatePriceFromSqrt(
        uint160 sqrtPriceX96,
        uint8 decimals0,
        uint8 decimals1,
        bool invert
    ) internal pure returns (uint256 price) {
        // Convert sqrtPriceX96 to price with proper decimal adjustment
        uint256 price192 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        
        if (invert) {
            price = (2**192 * 10**decimals0) / (price192 * 10**decimals1);
        } else {
            price = (price192 * 10**decimals1) / (2**192 * 10**decimals0);
        }
        
        // Normalize to 18 decimal precision
        if (decimals1 < 18) {
            price = price * 10**(18 - decimals1);
        } else if (decimals1 > 18) {
            price = price / 10**(decimals1 - 18);
        }
        
        return price;
    }
    
    function _performSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) internal returns (uint256 amountOut) {
        TokenInfo memory tokenInInfo = supportedTokens[tokenIn];
        
        // Approve swap router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Execute swap
        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: tokenInInfo.poolFee,
            recipient: recipient,
            deadline: block.timestamp + 300, // 5 minute deadline
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        return swapRouter.exactInputSingle(swapParams);
    }

    /**
     * @dev Called by automation controller to liquidate part of a user's position into USDC (stop-loss / take-profit)
     * @param user Target user whose tokens will be sold (must have approved this contract)
     * @param token Token to sell
     * @param sellPortionBps Portion (basis points) of current balance to sell
     * @param minAmountOut Minimum USDC out (can be 1 for aggressive execution)
     * @param reason Short reason string (e.g. "STOP_LOSS" or "TAKE_PROFIT")
     */
    function automationStopLossOrTakeProfit(
        address user,
        address token,
        uint256 sellPortionBps,
        uint256 minAmountOut,
        string calldata reason
    ) external onlyAutomation nonReentrant tokenSupported(token) {
        require(sellPortionBps > 0 && sellPortionBps <= MAX_PERCENTAGE, "portion invalid");
        require(token != USDC && token != USDT, "Not for stable");

        uint256 balance = IERC20(token).balanceOf(user);
        require(balance > 0, "No balance");
        uint256 amountToSell = (balance * sellPortionBps) / MAX_PERCENTAGE;
        require(amountToSell > 0, "Nothing to sell");

        // Pull tokens from user (requires prior approval to this contract)
        IERC20(token).transferFrom(user, address(this), amountToSell);

        uint256 amountOut = _performSwap(token, USDC, amountToSell, minAmountOut, user);

        emit AutomatedSellExecuted(user, token, amountToSell, amountOut, reason);
    }
    
    function _updateAllPrices() internal {
        for (uint256 i = 0; i < tokenList.length; i++) {
            _updateTokenPrice(tokenList[i]);
        }
    }
    
    function _calculatePortfolioValue(address user) 
        internal 
        view 
        returns (uint256 totalValue, uint256[] memory currentValues) 
    {
        UserPortfolio storage portfolio = userPortfolios[user];
        address[] memory tokens = portfolio.allocatedTokens;
        currentValues = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = IERC20(tokens[i]).balanceOf(user);
            uint256 price = tokenPrices[tokens[i]];
            uint256 value = (balance * price) / PRICE_PRECISION;
            
            currentValues[i] = value;
            totalValue += value;
        }
    }
    
    function _executeRebalancing(
        address user,
        uint256 totalValue,
        uint256[] memory currentValues
    ) internal {
        UserPortfolio storage portfolio = userPortfolios[user];
        address[] memory tokens = portfolio.allocatedTokens;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 targetValue = (totalValue * portfolio.tokenAllocations[tokens[i]]) / MAX_PERCENTAGE;
            uint256 currentValue = currentValues[i];
            
            if (currentValue < targetValue) {
                // Need to buy more of this token
                uint256 deficit = targetValue - currentValue;
                _buyTokenForRebalance(user, tokens[i], deficit);
            } else if (currentValue > targetValue) {
                // Need to sell some of this token
                uint256 excess = currentValue - targetValue;
                _sellTokenForRebalance(user, tokens[i], excess);
            }
        }
    }
    
    function _buyTokenForRebalance(address user, address token, uint256 valueNeeded) internal {
        // Implementation for buying tokens during rebalancing
        // This would use USDC as the base currency to buy the target token
        uint256 usdcBalance = IERC20(USDC).balanceOf(user);
        if (usdcBalance >= valueNeeded) {
            uint256 minAmountOut = (valueNeeded * (MAX_PERCENTAGE - MAX_SLIPPAGE)) / MAX_PERCENTAGE;
            _performSwap(USDC, token, valueNeeded, minAmountOut, user);
        }
    }
    
    function _sellTokenForRebalance(address user, address token, uint256 valueToSell) internal {
        // Implementation for selling tokens during rebalancing  
        uint256 tokenBalance = IERC20(token).balanceOf(user);
        uint256 tokenPrice = tokenPrices[token];
        uint256 amountToSell = (valueToSell * PRICE_PRECISION) / tokenPrice;
        
        if (tokenBalance >= amountToSell) {
            uint256 minAmountOut = (valueToSell * (MAX_PERCENTAGE - MAX_SLIPPAGE)) / MAX_PERCENTAGE;
            _performSwap(token, USDC, amountToSell, minAmountOut, user);
        }
    }
    
    function _executeEmergencyConversion(address user) internal {
        UserPortfolio storage portfolio = userPortfolios[user];
        
        for (uint256 i = 0; i < portfolio.allocatedTokens.length; i++) {
            address token = portfolio.allocatedTokens[i];
            
            // Skip stablecoins
            if (supportedTokens[token].category == TokenCategory.STABLECOIN) {
                continue;
            }
            
            uint256 balance = IERC20(token).balanceOf(user);
            if (balance > 0) {
                // Convert to USDC with high slippage tolerance for emergency
                uint256 minAmountOut = 1; // Accept any amount in emergency
                _performSwap(token, USDC, balance, minAmountOut, user);
            }
        }
    }
    
    function _clearUserAllocations(address user) internal {
        UserPortfolio storage portfolio = userPortfolios[user];
        
        // Clear existing allocations
        for (uint256 i = 0; i < portfolio.allocatedTokens.length; i++) {
            portfolio.tokenAllocations[portfolio.allocatedTokens[i]] = 0;
        }
        
        delete portfolio.allocatedTokens;
        portfolio.totalAllocation = 0;
    }
    
    function _getAllocationsArray(address user) internal view returns (uint256[] memory allocations) {
        UserPortfolio storage portfolio = userPortfolios[user];
        allocations = new uint256[](portfolio.allocatedTokens.length);
        
        for (uint256 i = 0; i < portfolio.allocatedTokens.length; i++) {
            allocations[i] = portfolio.tokenAllocations[portfolio.allocatedTokens[i]];
        }
    }
    
    // View functions
    
    function getStopLoss(address user) external view returns (uint256) {
        return userPortfolios[user].stopLossPercent;
    }
    
    function getTakeProfit(address user) external view returns (uint256) {
        return userPortfolios[user].takeProfitPercent;
    }
    
    function isPanicMode(address user) external view returns (bool) {
        return userPortfolios[user].panicModeActive;
    }
    
    function getUserAllocatedTokens(address user) external view returns (address[] memory) {
        return userPortfolios[user].allocatedTokens;
    }
    
    function getUserTokenAllocation(address user, address token) external view returns (uint256) {
        return userPortfolios[user].tokenAllocations[token];
    }
    
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }
    
    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        return supportedTokens[token];
    }
}