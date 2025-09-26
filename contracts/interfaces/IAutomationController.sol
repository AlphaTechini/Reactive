// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAutomationController {
    struct Strategy {
        bool enabled;
        address token;
        uint256 stopLossBps;
        uint256 takeProfitBps;
        uint256 entryPrice;
        uint256 lastExecution;
        uint256 coolDown;
        uint256 sellPortionBps;
    }
    function getStrategy(address user, address token) external view returns (Strategy memory);
}
