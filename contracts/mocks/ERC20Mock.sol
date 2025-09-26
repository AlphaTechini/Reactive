// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor(string memory name_, string memory symbol_, address initialHolder, uint256 initialSupply) ERC20(name_, symbol_) {
        _mint(initialHolder, initialSupply);
    }
}
