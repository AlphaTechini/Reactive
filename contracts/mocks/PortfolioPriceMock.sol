// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Minimal mock matching subset of IPortfolioManager interface used by AutomationController tests
contract PortfolioPriceMock {
    mapping(address => uint256) public prices; // 18 decimals

    function setPrice(address token, uint256 price) external {
        prices[token] = price;
    }

    function getTokenPrice(address token) external view returns (uint256 price) {
        return prices[token];
    }

    function updateTokenPrice(address) external {}
}
