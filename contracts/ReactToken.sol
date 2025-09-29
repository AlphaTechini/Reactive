// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReactToken - Core utility token for Reactive Portfolio
/// @notice Simple ERC20 mintable by owner (deployment account) for initial distribution.
contract ReactToken is ERC20, Ownable {
    constructor() ERC20("Reactive", "REACT") Ownable() {
        // Mint initial supply to deployer (10 million REACT)
        _mint(msg.sender, 10_000_000 ether);
    }

    /// @notice Mint new tokens (owner only) for treasury / liquidity provisioning.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
