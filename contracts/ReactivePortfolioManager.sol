// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReactivePortfolioManager
/// @notice Holds user deposits of REACT token and tracks basic risk parameters.
/// @dev This is a simplified scaffold matching the frontend expectations. Extend for production.
contract ReactivePortfolioManager is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable reactToken; // REACT token

    struct UserConfig { uint16 stopLossBps; uint16 takeProfitBps; bool panicMode; }
    mapping(address => uint256) private _balances;        // user => deposited REACT
    mapping(address => UserConfig) private _userConfig;   // user risk parameters

    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event StopLossSet(address indexed user, uint256 percentage); // percentage in bps/100
    event TakeProfitSet(address indexed user, uint256 percentage);
    event PanicModeTriggered(address indexed user);
    event PanicModeDeactivated(address indexed user);

    constructor(address _react) Ownable() {
        require(_react != address(0), "Invalid REACT token");
        reactToken = IERC20(_react);
    }

    // --------- Core Deposit / Withdraw ---------
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount=0");
        reactToken.safeTransferFrom(msg.sender, address(this), amount);
        _balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount=0");
        uint256 bal = _balances[msg.sender];
        require(amount <= bal, "Insufficient balance");
        _balances[msg.sender] = bal - amount;
        reactToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function balanceOf(address user) external view returns (uint256) { return _balances[user]; }

    // --------- Risk Config (values stored in basis points; frontend divides by 100) ---------
    function setStopLoss(uint256 percentageBps) external { // front-end provides percentage*100
        require(percentageBps <= 10_000, "Too high");
        _userConfig[msg.sender].stopLossBps = uint16(percentageBps);
        emit StopLossSet(msg.sender, percentageBps);
    }

    function setTakeProfit(uint256 percentageBps) external {
        require(percentageBps <= 10_000, "Too high");
        _userConfig[msg.sender].takeProfitBps = uint16(percentageBps);
        emit TakeProfitSet(msg.sender, percentageBps);
    }

    function activatePanicMode() external {
        _userConfig[msg.sender].panicMode = true;
        emit PanicModeTriggered(msg.sender);
    }

    function deactivatePanicMode() external {
        _userConfig[msg.sender].panicMode = false;
        emit PanicModeDeactivated(msg.sender);
    }

    function getStopLoss() external view returns (uint256) { return _userConfig[msg.sender].stopLossBps; }
    function getTakeProfit() external view returns (uint256) { return _userConfig[msg.sender].takeProfitBps; }
    function isPanicMode() external view returns (bool) { return _userConfig[msg.sender].panicMode; }
    function getPortfolioValue() external view returns (uint256) { // simplistic: value = deposited REACT
        return _balances[msg.sender];
    }
}
