// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPortfolioManager {
    function getTokenPrice(address token) external view returns (uint256 price);
    function updateTokenPrice(address token) external;
    function automationStopLossOrTakeProfit(address user, address token, uint256 sellPortionBps, uint256 minAmountOut, string calldata reason) external;
}

/**
 * @title AutomationController
 * @dev Off-chain RCS trigger companion: stores per-user strategy thresholds and exposes evaluation functions
 *      callable by a designated automation operator. Keeps core PortfolioManager lean.
 */
contract AutomationController is Ownable, ReentrancyGuard {
    struct Strategy {
        bool enabled;
        address token;            // Watched token
        uint256 stopLossBps;       // Below entry by X% triggers sell (basis points)
        uint256 takeProfitBps;     // Above entry by X% triggers sell (basis points)
        uint256 entryPrice;        // Recorded at enable time (18 decimals)
        uint256 lastExecution;     // Timestamp of last action
        uint256 coolDown;          // Minimum seconds between executions
        uint256 sellPortionBps;    // % of balance to liquidate on trigger (basis points)
        uint256 slippageBps;       // Acceptable slippage vs expected USDC out (basis points)
    }

    event StrategySet(address indexed user, address indexed token, Strategy data);
    event StrategyExecuted(address indexed user, address indexed token, uint256 price, string reason, uint256 portionSold);
    event OperatorSet(address indexed operator, bool active);

    IPortfolioManager public immutable portfolio;
    address public usdc; // stable token to receive on sells
    mapping(address => mapping(address => Strategy)) public strategies; // user => token => strategy
    mapping(address => bool) public operators; // authorized automation callers

    uint256 public constant MAX_BPS = 10000;
    uint256 public constant MIN_COOLDOWN = 60; // 1 minute

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "not operator");
        _;
    }

    constructor(IPortfolioManager _portfolio, address _usdc) {
        portfolio = _portfolio;
        usdc = _usdc;
    }

    function setOperator(address op, bool active) external onlyOwner {
        operators[op] = active;
        emit OperatorSet(op, active);
    }

    function setUSDC(address _usdc) external onlyOwner { usdc = _usdc; }

    function setStrategy(
        address token,
        uint256 stopLossBps,
        uint256 takeProfitBps,
        uint256 coolDown,
        uint256 sellPortionBps,
        uint256 slippageBps,
        bool enabled
    ) external {
        require(token != address(0), "token=0");
        require(sellPortionBps > 0 && sellPortionBps <= MAX_BPS, "portion invalid");
        require(coolDown >= MIN_COOLDOWN, "cooldown too low");
        require(slippageBps <= 2000, "slippage too high"); // cap 20%
        Strategy storage s = strategies[msg.sender][token];
        s.token = token;
        s.stopLossBps = stopLossBps;
        s.takeProfitBps = takeProfitBps;
        s.coolDown = coolDown;
        s.sellPortionBps = sellPortionBps;
        s.slippageBps = slippageBps;
        if (enabled && s.entryPrice == 0) {
            // capture entry price from portfolio
            s.entryPrice = portfolio.getTokenPrice(token);
        }
        s.enabled = enabled;
        emit StrategySet(msg.sender, token, s);
    }

    function evaluate(address user, address token) external onlyOperator nonReentrant {
        Strategy storage s = strategies[user][token];
        if (!s.enabled) return;
        if (block.timestamp < s.lastExecution + s.coolDown) return;
        uint256 current = portfolio.getTokenPrice(token);
        if (current == 0 || s.entryPrice == 0) return;

        bool triggered = false;
        string memory reason = "";

        // stop-loss: price dropped >= stopLossBps from entry
        if (s.stopLossBps > 0) {
            uint256 threshold = s.entryPrice - (s.entryPrice * s.stopLossBps / MAX_BPS);
            if (current <= threshold) { triggered = true; reason = "STOP_LOSS"; }
        }
        // take-profit: price rose >= takeProfitBps from entry
        if (!triggered && s.takeProfitBps > 0) {
            uint256 tp = s.entryPrice + (s.entryPrice * s.takeProfitBps / MAX_BPS);
            if (current >= tp) { triggered = true; reason = "TAKE_PROFIT"; }
        }
        if (!triggered) return;

        uint256 balance = IERC20(token).balanceOf(user);
        if (balance == 0) return;
        uint256 portion = balance * s.sellPortionBps / MAX_BPS;
        if (portion == 0) return;

        // Move tokens from user? PortfolioManager currently expects user to call executeSwap transferring tokens first.
        // For automation, user must pre-approve this controller to transfer their tokens.
    // Execute automated liquidation through portfolio manager (will transferFrom user internally again if needed)
    // User must have approved the portfolio manager contract to spend the token. To avoid double transferFrom we first
    // try allowance logic by approving portfolio for portion if we pulled funds (legacy path). For simplicity we call
    // automationStopLossOrTakeProfit which pulls directly.
        // Compute minAmountOut using current price * portion * (1 - slippage)
        uint256 expectedValue = portion * current / 1e18; // token amount * price (USDC precision assumed 18)
        uint256 minOut = expectedValue - (expectedValue * s.slippageBps / MAX_BPS);
        if (minOut == 0) { minOut = 1; }
        portfolio.automationStopLossOrTakeProfit(user, token, s.sellPortionBps, minOut, reason);
    s.lastExecution = block.timestamp;
    emit StrategyExecuted(user, token, current, reason, portion);
    }

    function batchEvaluate(address[] calldata users, address[] calldata tokens) external onlyOperator {
        require(users.length == tokens.length, "len mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            // Ignore failures to keep batch progressing
            try this.evaluate(users[i], tokens[i]) {} catch {}
        }
    }

    // View helper
    function getStrategy(address user, address token) external view returns (Strategy memory) {
        return strategies[user][token];
    }
}
