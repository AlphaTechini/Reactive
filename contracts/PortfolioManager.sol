// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PortfolioManager
 * @dev Smart contract for managing automated trading portfolios on Reactive Network
 * @notice Allows users to set stop-loss, take-profit, panic mode, and rebalancing strategies
 */
contract PortfolioManager is ReentrancyGuard, Ownable {
    
    // Structs
    struct UserPortfolio {
        uint256 stopLossPercent;     // Percentage threshold for stop-loss (basis points: 100 = 1%)
        uint256 takeProfitPercent;   // Percentage threshold for take-profit (basis points)
        bool panicModeActive;        // Emergency mode flag
        mapping(address => uint256) tokenAllocations; // Token address => allocation percentage
        address[] allocatedTokens;   // Array of tokens with allocations
        uint256 totalAllocation;     // Total allocation percentage (should equal 10000 = 100%)
    }
    
    struct TokenInfo {
        bool isSupported;
        string symbol;
        uint8 decimals;
        TokenCategory category;
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
    address[] public tokenList;
    
    // Constants
    uint256 public constant MAX_PERCENTAGE = 10000; // 100% in basis points
    uint256 public constant MIN_PERCENTAGE = 100;   // 1% minimum allocation
    
    // Events
    event StopLossSet(address indexed user, uint256 percent);
    event TakeProfitSet(address indexed user, uint256 percent);
    event PanicModeTriggered(address indexed user, uint256 timestamp);
    event PanicModeDeactivated(address indexed user, uint256 timestamp);
    event PortfolioRebalanced(address indexed user, uint256 timestamp);
    event TokenAdded(address indexed token, string symbol, TokenCategory category);
    event TokenRemoved(address indexed token);
    event AllocationUpdated(address indexed user, address indexed token, uint256 percent);
    
    // Modifiers
    modifier validPercentage(uint256 percent) {
        require(percent <= MAX_PERCENTAGE, "Percentage cannot exceed 100%");
        _;
    }
    
    modifier tokenSupported(address token) {
        require(supportedTokens[token].isSupported, "Token not supported");
        _;
    }
    
    constructor() {}
    
    /**
     * @dev Add a supported token to the platform
     * @param token Address of the ERC-20 token
     * @param symbol Token symbol (e.g., "BTC", "ETH")
     * @param category Token category (ALTCOIN, MEMECOIN, STABLECOIN, BTC)
     */
    function addSupportedToken(
        address token,
        string memory symbol,
        TokenCategory category
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token].isSupported, "Token already supported");
        
    // Get token decimals from ERC-20 contract (IERC20Metadata includes decimals)
    uint8 decimals = IERC20Metadata(token).decimals();
        
        supportedTokens[token] = TokenInfo({
            isSupported: true,
            symbol: symbol,
            decimals: decimals,
            category: category
        });
        
        tokenList.push(token);
        
        emit TokenAdded(token, symbol, category);
    }
    
    /**
     * @dev Remove a token from supported tokens
     * @param token Address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner tokenSupported(token) {
        supportedTokens[token].isSupported = false;
        
        // Remove from tokenList array
        for (uint i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        
        emit TokenRemoved(token);
    }
    
    /**
     * @dev Set stop-loss threshold for user's portfolio
     * @param percent Stop-loss percentage in basis points (100 = 1%)
     */
    function setStopLoss(uint256 percent) 
        external 
        validPercentage(percent) 
        nonReentrant 
    {
        require(percent > 0, "Stop-loss must be greater than 0");
        require(percent <= 5000, "Stop-loss cannot exceed 50%");
        
        userPortfolios[msg.sender].stopLossPercent = percent;
        
        emit StopLossSet(msg.sender, percent);
    }
    
    /**
     * @dev Set take-profit threshold for user's portfolio
     * @param percent Take-profit percentage in basis points (100 = 1%)
     */
    function setTakeProfit(uint256 percent) 
        external 
        validPercentage(percent) 
        nonReentrant 
    {
        require(percent > 0, "Take-profit must be greater than 0");
        
        userPortfolios[msg.sender].takeProfitPercent = percent;
        
        emit TakeProfitSet(msg.sender, percent);
    }
    
    /**
     * @dev Activate panic mode - converts portfolio to stablecoins
     */
    function activatePanicMode() external nonReentrant {
        require(!userPortfolios[msg.sender].panicModeActive, "Panic mode already active");
        
        userPortfolios[msg.sender].panicModeActive = true;
        
        emit PanicModeTriggered(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Deactivate panic mode
     */
    function deactivatePanicMode() external nonReentrant {
        require(userPortfolios[msg.sender].panicModeActive, "Panic mode not active");
        
        userPortfolios[msg.sender].panicModeActive = false;
        
        emit PanicModeDeactivated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Set portfolio allocation percentages for rebalancing
     * @param tokens Array of token addresses
     * @param percentages Array of allocation percentages in basis points
     */
    function rebalancePortfolio(
        address[] memory tokens,
        uint256[] memory percentages
    ) external nonReentrant {
        require(tokens.length == percentages.length, "Arrays length mismatch");
        require(tokens.length > 0, "Empty allocation not allowed");
        
        // Clear existing allocations
        _clearUserAllocations(msg.sender);
        
        uint256 totalPercent = 0;
        
        for (uint i = 0; i < tokens.length; i++) {
            require(supportedTokens[tokens[i]].isSupported, "Token not supported");
            require(percentages[i] >= MIN_PERCENTAGE, "Allocation too small");
            
            totalPercent += percentages[i];
            
            userPortfolios[msg.sender].tokenAllocations[tokens[i]] = percentages[i];
            userPortfolios[msg.sender].allocatedTokens.push(tokens[i]);
            
            emit AllocationUpdated(msg.sender, tokens[i], percentages[i]);
        }
        
        require(totalPercent == MAX_PERCENTAGE, "Total allocation must equal 100%");
        userPortfolios[msg.sender].totalAllocation = totalPercent;
        
        emit PortfolioRebalanced(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Clear user's token allocations
     * @param user User address
     */
    function _clearUserAllocations(address user) internal {
        address[] storage allocatedTokens = userPortfolios[user].allocatedTokens;
        
        for (uint i = 0; i < allocatedTokens.length; i++) {
            delete userPortfolios[user].tokenAllocations[allocatedTokens[i]];
        }
        
        delete userPortfolios[user].allocatedTokens;
        userPortfolios[user].totalAllocation = 0;
    }
    
    // View functions
    
    /**
     * @dev Get user's portfolio configuration
     * @param user User address
     * @return stopLoss Stop-loss percentage
     * @return takeProfit Take-profit percentage  
     * @return panicMode Panic mode status
     * @return totalAllocation Total allocation percentage
     */
    function getUserPortfolio(address user) 
        external 
        view 
        returns (
            uint256 stopLoss,
            uint256 takeProfit,
            bool panicMode,
            uint256 totalAllocation
        ) 
    {
        UserPortfolio storage portfolio = userPortfolios[user];
        return (
            portfolio.stopLossPercent,
            portfolio.takeProfitPercent,
            portfolio.panicModeActive,
            portfolio.totalAllocation
        );
    }
    
    /**
     * @dev Get user's token allocation
     * @param user User address
     * @param token Token address
     * @return allocation Allocation percentage
     */
    function getUserTokenAllocation(address user, address token) 
        external 
        view 
        returns (uint256 allocation) 
    {
        return userPortfolios[user].tokenAllocations[token];
    }
    
    /**
     * @dev Get user's allocated tokens
     * @param user User address
     * @return tokens Array of allocated token addresses
     */
    function getUserAllocatedTokens(address user) 
        external 
        view 
        returns (address[] memory tokens) 
    {
        return userPortfolios[user].allocatedTokens;
    }
    
    /**
     * @dev Get all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory tokens) {
        return tokenList;
    }
    
    /**
     * @dev Get token information
     * @param token Token address
     * @return info TokenInfo struct
     */
    function getTokenInfo(address token) 
        external 
        view 
        returns (TokenInfo memory info) 
    {
        return supportedTokens[token];
    }
    
    /**
     * @dev Get user's token balance
     * @param user User address
     * @param token Token address
     * @return balance Token balance
     */
    function getUserTokenBalance(address user, address token) 
        external 
        view 
        tokenSupported(token)
        returns (uint256 balance) 
    {
        return IERC20(token).balanceOf(user);
    }
    
    /**
     * @dev Check if user can execute rebalancing based on current allocation
     * @param user User address
     * @return canRebalance Whether rebalancing is possible
     */
    function canUserRebalance(address user) external view returns (bool canRebalance) {
        UserPortfolio storage portfolio = userPortfolios[user];
        return portfolio.totalAllocation == MAX_PERCENTAGE && 
               portfolio.allocatedTokens.length > 0 &&
               !portfolio.panicModeActive;
    }
}