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
        mapping(address => TrailingStopLoss) trailingStops; // Token => trailing stop config
    }
    
    struct TrailingStopLoss {
        bool enabled;
        uint256 trailPercent;        // Trailing percentage in basis points
        uint256 stopPercent;         // Stop-loss percentage in basis points
        uint256 highWaterMark;       // Highest price seen (18 decimals)
        uint256 currentStopPrice;    // Current stop price (18 decimals)
        uint256 lastUpdateTime;      // Last price update timestamp
        uint256 sellPortionBps;      // Portion to sell when triggered (basis points)
    }
    
    struct RebalancingPlan {
        address[] sellTokens;
        address[] buyTokens;
        uint256[] sellAmounts;
        uint256[] buyAmounts;
        uint256[] minAmountsOut;
        uint256 estimatedGas;
        uint256 maxGasPercent;
    }
    
    struct BatchAllocationUpdate {
        address[] tokens;
        uint256[] allocations;
        bool validateTotal;
    }
    
    struct RiskParameterUpdate {
        uint256 stopLossPercent;
        uint256 takeProfitPercent;
        bool updateStopLoss;
        bool updateTakeProfit;
    }
    
    struct BatchTrailingStopUpdate {
        address token;
        uint256 trailPercent;
        uint256 stopPercent;
        uint256 sellPortionBps;
        bool enabled;
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
    uint256 public constant MAX_GAS_PERCENT = 200;  // 2% max gas cost of trade value
    uint256 public constant GAS_ESTIMATION_BUFFER = 120; // 20% buffer for gas estimation
    
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
    event OptimizedRebalancingExecuted(address indexed user, uint256 gasUsed, uint256 gasCostPercent);
    event BatchAllocationUpdated(address indexed user, address[] tokens, uint256[] allocations);
    event RebalancingDeferred(address indexed user, uint256 gasCostPercent, uint256 maxAllowed);
    event TrailingStopLossSet(address indexed user, address indexed token, uint256 trailPercent, uint256 stopPercent);
    event TrailingStopLossTriggered(address indexed user, address indexed token, uint256 price, uint256 stopPrice);
    event TrailingStopLossUpdated(address indexed user, address indexed token, uint256 newStopPrice, uint256 highWaterMark);
    event BatchPricesUpdated(address[] tokens, uint256 count);
    event BatchRiskParametersUpdated(address indexed user, uint256 stopLoss, uint256 takeProfit);
    event BatchTrailingStopsUpdated(address indexed user, address[] tokens, uint256 count);
    
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
     * @dev Set trailing stop-loss for a specific token
     * @param token Token address to set trailing stop for
     * @param trailPercent Trailing percentage in basis points (how much to trail behind high)
     * @param stopPercent Stop-loss percentage in basis points (initial stop distance)
     * @param sellPortionBps Portion of position to sell when triggered (basis points)
     */
    function setTrailingStopLoss(
        address token,
        uint256 trailPercent,
        uint256 stopPercent,
        uint256 sellPortionBps
    ) external tokenSupported(token) validPercentage(trailPercent) validPercentage(stopPercent) {
        require(trailPercent >= MIN_PERCENTAGE, "Trail percent too low");
        require(stopPercent >= MIN_PERCENTAGE, "Stop percent too low");
        require(sellPortionBps > 0 && sellPortionBps <= MAX_PERCENTAGE, "Invalid sell portion");
        require(trailPercent <= 2000, "Trail percent too high"); // Max 20%
        require(stopPercent <= 5000, "Stop percent too high"); // Max 50%
        
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        
        // Get current token price to initialize
        uint256 currentPrice = tokenPrices[token];
        require(currentPrice > 0, "Token price not available");
        
        // Initialize trailing stop-loss
        TrailingStopLoss storage trailingStop = portfolio.trailingStops[token];
        trailingStop.enabled = true;
        trailingStop.trailPercent = trailPercent;
        trailingStop.stopPercent = stopPercent;
        trailingStop.highWaterMark = currentPrice;
        trailingStop.currentStopPrice = currentPrice - (currentPrice * stopPercent / MAX_PERCENTAGE);
        trailingStop.lastUpdateTime = block.timestamp;
        trailingStop.sellPortionBps = sellPortionBps;
        
        emit TrailingStopLossSet(msg.sender, token, trailPercent, stopPercent);
    }
    
    /**
     * @dev Update trailing stop-loss for a token based on current price
     * @param user User address
     * @param token Token address
     */
    function updateTrailingStopLoss(address user, address token) 
        external 
        tokenSupported(token) 
    {
        UserPortfolio storage portfolio = userPortfolios[user];
        TrailingStopLoss storage trailingStop = portfolio.trailingStops[token];
        
        require(trailingStop.enabled, "Trailing stop not enabled");
        
        uint256 currentPrice = tokenPrices[token];
        require(currentPrice > 0, "Token price not available");
        
        // Update high water mark if price increased
        if (currentPrice > trailingStop.highWaterMark) {
            trailingStop.highWaterMark = currentPrice;
            
            // Calculate new stop price based on trail percentage
            uint256 newStopPrice = currentPrice - (currentPrice * trailingStop.trailPercent / MAX_PERCENTAGE);
            
            // Only update stop price if it's higher (trailing up)
            if (newStopPrice > trailingStop.currentStopPrice) {
                trailingStop.currentStopPrice = newStopPrice;
                trailingStop.lastUpdateTime = block.timestamp;
                
                emit TrailingStopLossUpdated(user, token, newStopPrice, currentPrice);
            }
        }
    }
    
    /**
     * @dev Disable trailing stop-loss for a token
     * @param token Token address
     */
    function disableTrailingStopLoss(address token) external tokenSupported(token) {
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        portfolio.trailingStops[token].enabled = false;
    }
    
    /**
     * @dev Check if trailing stop-loss should be triggered and execute if needed
     * @param user User address
     * @param token Token address
     * @return triggered Whether the trailing stop was triggered
     */
    function checkAndExecuteTrailingStop(address user, address token)
        external
        onlyAutomation
        nonReentrant
        tokenSupported(token)
        returns (bool triggered)
    {
        UserPortfolio storage portfolio = userPortfolios[user];
        TrailingStopLoss storage trailingStop = portfolio.trailingStops[token];
        
        if (!trailingStop.enabled) return false;
        
        uint256 currentPrice = tokenPrices[token];
        require(currentPrice > 0, "Token price not available");
        
        // Update trailing stop first
        if (currentPrice > trailingStop.highWaterMark) {
            trailingStop.highWaterMark = currentPrice;
            uint256 newStopPrice = currentPrice - (currentPrice * trailingStop.trailPercent / MAX_PERCENTAGE);
            if (newStopPrice > trailingStop.currentStopPrice) {
                trailingStop.currentStopPrice = newStopPrice;
                trailingStop.lastUpdateTime = block.timestamp;
            }
        }
        
        // Check if stop should be triggered
        if (currentPrice <= trailingStop.currentStopPrice) {
            // Execute trailing stop-loss
            uint256 balance = IERC20(token).balanceOf(user);
            if (balance > 0) {
                uint256 amountToSell = (balance * trailingStop.sellPortionBps) / MAX_PERCENTAGE;
                if (amountToSell > 0) {
                    // Calculate minimum USDC out with slippage protection
                    uint256 expectedValue = (amountToSell * currentPrice) / PRICE_PRECISION;
                    uint256 minAmountOut = (expectedValue * (MAX_PERCENTAGE - MAX_SLIPPAGE)) / MAX_PERCENTAGE;
                    
                    // Transfer tokens from user and execute swap
                    IERC20(token).transferFrom(user, address(this), amountToSell);
                    uint256 amountOut = _performSwap(token, USDC, amountToSell, minAmountOut, user);
                    
                    // Disable trailing stop after execution
                    trailingStop.enabled = false;
                    
                    emit TrailingStopLossTriggered(user, token, currentPrice, trailingStop.currentStopPrice);
                    emit AutomatedSellExecuted(user, token, amountToSell, amountOut, "TRAILING_STOP");
                    
                    triggered = true;
                }
            }
        }
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
     * @dev Execute optimized rebalancing with gas cost analysis and deferral logic
     * @param plan Pre-calculated rebalancing plan with gas estimates
     */
    function executeOptimizedRebalancing(RebalancingPlan calldata plan)
        external
        nonReentrant
        notInPanicMode(msg.sender)
        canRebalance(msg.sender)
    {
        require(plan.sellTokens.length > 0 || plan.buyTokens.length > 0, "Empty rebalancing plan");
        require(plan.maxGasPercent <= MAX_GAS_PERCENT, "Gas percent too high");
        
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        
        // Update prices before execution
        _updateAllPrices();
        
        // Calculate current portfolio value for gas cost analysis
        (uint256 totalValue, ) = _calculatePortfolioValue(msg.sender);
        require(totalValue > 0, "No portfolio value");
        
        // Estimate actual gas cost and check if within limits
        uint256 estimatedGasCost = _estimateRebalancingGasCost(plan);
        uint256 gasCostPercent = (estimatedGasCost * MAX_PERCENTAGE) / totalValue;
        
        if (gasCostPercent > plan.maxGasPercent) {
            emit RebalancingDeferred(msg.sender, gasCostPercent, plan.maxGasPercent);
            return;
        }
        
        uint256 gasStart = gasleft();
        
        // Execute sell operations first
        for (uint256 i = 0; i < plan.sellTokens.length; i++) {
            if (plan.sellAmounts[i] > 0) {
                _performSwap(
                    plan.sellTokens[i],
                    USDC,
                    plan.sellAmounts[i],
                    plan.minAmountsOut[i],
                    msg.sender
                );
            }
        }
        
        // Execute buy operations
        for (uint256 i = 0; i < plan.buyTokens.length; i++) {
            if (plan.buyAmounts[i] > 0) {
                _performSwap(
                    USDC,
                    plan.buyTokens[i],
                    plan.buyAmounts[i],
                    plan.minAmountsOut[plan.sellTokens.length + i],
                    msg.sender
                );
            }
        }
        
        uint256 gasUsed = gasStart - gasleft();
        portfolio.lastRebalanceTime = block.timestamp;
        
        emit OptimizedRebalancingExecuted(msg.sender, gasUsed, gasCostPercent);
        emit PortfolioRebalanced(
            msg.sender,
            portfolio.allocatedTokens,
            _getAllocationsArray(msg.sender)
        );
    }
    
    /**
     * @dev Batch update multiple token allocations in a single transaction
     * @param updates Array of batch allocation updates
     */
    function batchUpdateAllocations(BatchAllocationUpdate[] calldata updates)
        external
        nonReentrant
        notInPanicMode(msg.sender)
    {
        require(updates.length > 0, "No updates provided");
        
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        
        for (uint256 i = 0; i < updates.length; i++) {
            BatchAllocationUpdate calldata update = updates[i];
            require(update.tokens.length == update.allocations.length, "Array length mismatch");
            
            uint256 totalAllocation = 0;
            
            // Update allocations for this batch
            for (uint256 j = 0; j < update.tokens.length; j++) {
                address token = update.tokens[j];
                uint256 allocation = update.allocations[j];
                
                require(supportedTokens[token].isSupported, "Token not supported");
                require(allocation >= MIN_PERCENTAGE || allocation == 0, "Allocation too low");
                
                // Update or remove allocation
                if (allocation == 0) {
                    portfolio.tokenAllocations[token] = 0;
                    _removeTokenFromAllocated(msg.sender, token);
                } else {
                    if (portfolio.tokenAllocations[token] == 0) {
                        portfolio.allocatedTokens.push(token);
                    }
                    portfolio.tokenAllocations[token] = allocation;
                }
                
                totalAllocation += allocation;
            }
            
            // Validate total if required
            if (update.validateTotal) {
                require(totalAllocation == MAX_PERCENTAGE, "Total allocation must equal 100%");
            }
            
            emit BatchAllocationUpdated(msg.sender, update.tokens, update.allocations);
        }
        
        // Recalculate total allocation
        portfolio.totalAllocation = _calculateTotalAllocation(msg.sender);
    }
    
    /**
     * @dev Batch update risk parameters (stop-loss and take-profit)
     * @param riskUpdate Risk parameter update configuration
     */
    function batchUpdateRiskParameters(RiskParameterUpdate calldata riskUpdate)
        external
        nonReentrant
        notInPanicMode(msg.sender)
    {
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        
        if (riskUpdate.updateStopLoss) {
            require(riskUpdate.stopLossPercent >= MIN_PERCENTAGE, "Stop-loss too low");
            require(riskUpdate.stopLossPercent <= 5000, "Stop-loss too high");
            portfolio.stopLossPercent = riskUpdate.stopLossPercent;
        }
        
        if (riskUpdate.updateTakeProfit) {
            require(riskUpdate.takeProfitPercent >= MIN_PERCENTAGE, "Take-profit too low");
            portfolio.takeProfitPercent = riskUpdate.takeProfitPercent;
        }
        
        emit BatchRiskParametersUpdated(
            msg.sender,
            riskUpdate.updateStopLoss ? riskUpdate.stopLossPercent : portfolio.stopLossPercent,
            riskUpdate.updateTakeProfit ? riskUpdate.takeProfitPercent : portfolio.takeProfitPercent
        );
    }
    
    /**
     * @dev Batch update trailing stop-loss configurations for multiple tokens
     * @param trailingStopUpdates Array of trailing stop updates
     */
    function batchUpdateTrailingStops(BatchTrailingStopUpdate[] calldata trailingStopUpdates)
        external
        nonReentrant
        notInPanicMode(msg.sender)
    {
        require(trailingStopUpdates.length > 0, "No updates provided");
        require(trailingStopUpdates.length <= 20, "Too many updates"); // Prevent gas limit issues
        
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        address[] memory updatedTokens = new address[](trailingStopUpdates.length);
        
        for (uint256 i = 0; i < trailingStopUpdates.length; i++) {
            BatchTrailingStopUpdate calldata update = trailingStopUpdates[i];
            
            require(supportedTokens[update.token].isSupported, "Token not supported");
            require(update.sellPortionBps > 0 && update.sellPortionBps <= MAX_PERCENTAGE, "Invalid sell portion");
            
            if (update.enabled) {
                require(update.trailPercent >= MIN_PERCENTAGE && update.trailPercent <= 2000, "Invalid trail percent");
                require(update.stopPercent >= MIN_PERCENTAGE && update.stopPercent <= 5000, "Invalid stop percent");
                
                uint256 currentPrice = tokenPrices[update.token];
                require(currentPrice > 0, "Token price not available");
                
                TrailingStopLoss storage trailingStop = portfolio.trailingStops[update.token];
                trailingStop.enabled = true;
                trailingStop.trailPercent = update.trailPercent;
                trailingStop.stopPercent = update.stopPercent;
                trailingStop.sellPortionBps = update.sellPortionBps;
                
                // Initialize or update high water mark and stop price
                if (trailingStop.highWaterMark == 0 || currentPrice > trailingStop.highWaterMark) {
                    trailingStop.highWaterMark = currentPrice;
                    trailingStop.currentStopPrice = currentPrice - (currentPrice * update.stopPercent / MAX_PERCENTAGE);
                }
                trailingStop.lastUpdateTime = block.timestamp;
            } else {
                portfolio.trailingStops[update.token].enabled = false;
            }
            
            updatedTokens[i] = update.token;
        }
        
        emit BatchTrailingStopsUpdated(msg.sender, updatedTokens, trailingStopUpdates.length);
    }
    
    /**
     * @dev Estimate gas cost for a rebalancing plan
     * @param plan Rebalancing plan to estimate
     * @return estimatedGas Estimated gas cost in wei
     */
    function estimateRebalancingGas(RebalancingPlan calldata plan)
        external
        view
        returns (uint256 estimatedGas)
    {
        return _estimateRebalancingGasCost(plan);
    }
    
    /**
     * @dev Create optimized rebalancing plan for user's current portfolio
     * @param user User address
     * @param maxGasPercent Maximum gas cost as percentage of portfolio value
     * @return plan Optimized rebalancing plan
     */
    function createRebalancingPlan(address user, uint256 maxGasPercent)
        external
        view
        returns (RebalancingPlan memory plan)
    {
        require(maxGasPercent <= MAX_GAS_PERCENT, "Gas percent too high");
        
        UserPortfolio storage portfolio = userPortfolios[user];
        require(portfolio.allocatedTokens.length > 0, "No allocation set");
        require(portfolio.totalAllocation == MAX_PERCENTAGE, "Incomplete allocation");
        
        (uint256 totalValue, uint256[] memory currentValues) = _calculatePortfolioValue(user);
        require(totalValue > 0, "No portfolio value");
        
        return _createOptimizedPlan(user, totalValue, currentValues, maxGasPercent);
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
     * @dev Batch update multiple token prices
     * @param tokens Array of token addresses to update
     */
    function batchUpdatePrices(address[] calldata tokens) external {
        require(tokens.length > 0, "No tokens provided");
        require(tokens.length <= 50, "Too many tokens"); // Prevent gas limit issues
        
        uint256 updatedCount = 0;
        address[] memory updatedTokens = new address[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (supportedTokens[tokens[i]].isSupported) {
                _updateTokenPrice(tokens[i]);
                updatedTokens[updatedCount] = tokens[i];
                updatedCount++;
            }
        }
        
        // Resize array to actual updated count
        address[] memory finalUpdatedTokens = new address[](updatedCount);
        for (uint256 i = 0; i < updatedCount; i++) {
            finalUpdatedTokens[i] = updatedTokens[i];
        }
        
        emit BatchPricesUpdated(finalUpdatedTokens, updatedCount);
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
    
    /**
     * @dev Estimate gas cost for rebalancing operations
     * @param plan Rebalancing plan
     * @return estimatedGas Estimated gas cost in wei
     */
    function _estimateRebalancingGasCost(RebalancingPlan memory plan)
        internal
        view
        returns (uint256 estimatedGas)
    {
        // Base gas cost for transaction overhead
        uint256 baseGas = 21000;
        
        // Gas per swap operation (approximate)
        uint256 swapGas = 150000;
        
        // Calculate total swaps needed
        uint256 totalSwaps = 0;
        for (uint256 i = 0; i < plan.sellAmounts.length; i++) {
            if (plan.sellAmounts[i] > 0) totalSwaps++;
        }
        for (uint256 i = 0; i < plan.buyAmounts.length; i++) {
            if (plan.buyAmounts[i] > 0) totalSwaps++;
        }
        
        estimatedGas = baseGas + (totalSwaps * swapGas);
        
        // Add buffer for gas estimation accuracy
        estimatedGas = (estimatedGas * GAS_ESTIMATION_BUFFER) / 100;
        
        // Convert to wei using current gas price (simplified)
        estimatedGas = estimatedGas * tx.gasprice;
    }
    
    /**
     * @dev Create optimized rebalancing plan
     * @param user User address
     * @param totalValue Current portfolio value
     * @param currentValues Current token values
     * @param maxGasPercent Maximum gas cost percentage
     * @return plan Optimized rebalancing plan
     */
    function _createOptimizedPlan(
        address user,
        uint256 totalValue,
        uint256[] memory currentValues,
        uint256 maxGasPercent
    ) internal view returns (RebalancingPlan memory plan) {
        UserPortfolio storage portfolio = userPortfolios[user];
        address[] memory tokens = portfolio.allocatedTokens;
        
        // Calculate required trades
        uint256 sellCount = 0;
        uint256 buyCount = 0;
        
        // First pass: count operations needed
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 targetValue = (totalValue * portfolio.tokenAllocations[tokens[i]]) / MAX_PERCENTAGE;
            uint256 currentValue = currentValues[i];
            
            if (currentValue > targetValue) {
                sellCount++;
            } else if (currentValue < targetValue) {
                buyCount++;
            }
        }
        
        // Initialize arrays
        plan.sellTokens = new address[](sellCount);
        plan.buyTokens = new address[](buyCount);
        plan.sellAmounts = new uint256[](sellCount);
        plan.buyAmounts = new uint256[](buyCount);
        plan.minAmountsOut = new uint256[](sellCount + buyCount);
        plan.maxGasPercent = maxGasPercent;
        
        // Second pass: populate trade details
        uint256 sellIndex = 0;
        uint256 buyIndex = 0;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 targetValue = (totalValue * portfolio.tokenAllocations[token]) / MAX_PERCENTAGE;
            uint256 currentValue = currentValues[i];
            
            if (currentValue > targetValue) {
                // Need to sell excess
                uint256 excessValue = currentValue - targetValue;
                uint256 tokenPrice = tokenPrices[token];
                uint256 amountToSell = (excessValue * PRICE_PRECISION) / tokenPrice;
                
                plan.sellTokens[sellIndex] = token;
                plan.sellAmounts[sellIndex] = amountToSell;
                plan.minAmountsOut[sellIndex] = (excessValue * (MAX_PERCENTAGE - MAX_SLIPPAGE)) / MAX_PERCENTAGE;
                sellIndex++;
            } else if (currentValue < targetValue) {
                // Need to buy more
                uint256 deficitValue = targetValue - currentValue;
                
                plan.buyTokens[buyIndex] = token;
                plan.buyAmounts[buyIndex] = deficitValue; // Amount in USDC to spend
                plan.minAmountsOut[sellCount + buyIndex] = _calculateMinTokensOut(token, deficitValue);
                buyIndex++;
            }
        }
        
        // Estimate gas cost
        plan.estimatedGas = _estimateRebalancingGasCost(plan);
    }
    
    /**
     * @dev Calculate minimum tokens out for a given USDC amount
     * @param token Token to buy
     * @param usdcAmount USDC amount to spend
     * @return minTokensOut Minimum tokens expected with slippage
     */
    function _calculateMinTokensOut(address token, uint256 usdcAmount)
        internal
        view
        returns (uint256 minTokensOut)
    {
        uint256 tokenPrice = tokenPrices[token];
        uint256 expectedTokens = (usdcAmount * PRICE_PRECISION) / tokenPrice;
        minTokensOut = (expectedTokens * (MAX_PERCENTAGE - MAX_SLIPPAGE)) / MAX_PERCENTAGE;
    }
    
    /**
     * @dev Remove token from user's allocated tokens array
     * @param user User address
     * @param tokenToRemove Token to remove
     */
    function _removeTokenFromAllocated(address user, address tokenToRemove) internal {
        UserPortfolio storage portfolio = userPortfolios[user];
        address[] storage allocatedTokens = portfolio.allocatedTokens;
        
        for (uint256 i = 0; i < allocatedTokens.length; i++) {
            if (allocatedTokens[i] == tokenToRemove) {
                allocatedTokens[i] = allocatedTokens[allocatedTokens.length - 1];
                allocatedTokens.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Calculate total allocation percentage for user
     * @param user User address
     * @return total Total allocation percentage
     */
    function _calculateTotalAllocation(address user) internal view returns (uint256 total) {
        UserPortfolio storage portfolio = userPortfolios[user];
        
        for (uint256 i = 0; i < portfolio.allocatedTokens.length; i++) {
            total += portfolio.tokenAllocations[portfolio.allocatedTokens[i]];
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
    
    /**
     * @dev Get trailing stop-loss configuration for user and token
     * @param user User address
     * @param token Token address
     * @return trailingStop Trailing stop-loss configuration
     */
    function getTrailingStopLoss(address user, address token) 
        external 
        view 
        returns (TrailingStopLoss memory trailingStop) 
    {
        return userPortfolios[user].trailingStops[token];
    }
    
    /**
     * @dev Check if trailing stop-loss should be triggered (view only)
     * @param user User address
     * @param token Token address
     * @return shouldTrigger Whether the trailing stop should be triggered
     * @return currentPrice Current token price
     * @return stopPrice Current stop price
     */
    function shouldTriggerTrailingStop(address user, address token)
        external
        view
        tokenSupported(token)
        returns (bool shouldTrigger, uint256 currentPrice, uint256 stopPrice)
    {
        TrailingStopLoss storage trailingStop = userPortfolios[user].trailingStops[token];
        
        if (!trailingStop.enabled) {
            return (false, 0, 0);
        }
        
        currentPrice = tokenPrices[token];
        stopPrice = trailingStop.currentStopPrice;
        
        // Calculate updated stop price if current price is higher
        if (currentPrice > trailingStop.highWaterMark) {
            uint256 newStopPrice = currentPrice - (currentPrice * trailingStop.trailPercent / MAX_PERCENTAGE);
            if (newStopPrice > stopPrice) {
                stopPrice = newStopPrice;
            }
        }
        
        shouldTrigger = currentPrice <= stopPrice && currentPrice > 0;
    }
    
    /**
     * @dev Get multiple token prices in a single call
     * @param tokens Array of token addresses
     * @return prices Array of token prices (18 decimals)
     */
    function getBatchTokenPrices(address[] calldata tokens)
        external
        view
        returns (uint256[] memory prices)
    {
        prices = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (supportedTokens[tokens[i]].isSupported) {
                if (tokens[i] == USDC || tokens[i] == USDT) {
                    prices[i] = PRICE_PRECISION;
                } else {
                    prices[i] = tokenPrices[tokens[i]];
                }
            } else {
                prices[i] = 0; // Unsupported token
            }
        }
    }
    
    /**
     * @dev Get user's risk parameters in a single call
     * @param user User address
     * @return stopLoss Stop-loss percentage
     * @return takeProfit Take-profit percentage
     * @return panicMode Panic mode status
     */
    function getUserRiskParameters(address user)
        external
        view
        returns (uint256 stopLoss, uint256 takeProfit, bool panicMode)
    {
        UserPortfolio storage portfolio = userPortfolios[user];
        return (
            portfolio.stopLossPercent,
            portfolio.takeProfitPercent,
            portfolio.panicModeActive
        );
    }
    
    /**
     * @dev Get multiple trailing stop-loss configurations
     * @param user User address
     * @param tokens Array of token addresses
     * @return trailingStops Array of trailing stop configurations
     */
    function getBatchTrailingStops(address user, address[] calldata tokens)
        external
        view
        returns (TrailingStopLoss[] memory trailingStops)
    {
        trailingStops = new TrailingStopLoss[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            trailingStops[i] = userPortfolios[user].trailingStops[tokens[i]];
        }
    }
}