// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Extremely simple swap router for testing. Owner sets rates (numerator/denominator)
/// and the router must be pre-funded with output tokens.
contract MockSwapRouter is Ownable {
    struct Rate { uint256 num; uint256 den; }
    // key: keccak256(abi.encodePacked(tokenIn, tokenOut))
    mapping(bytes32 => Rate) public rates;

    event RateSet(address indexed tokenIn, address indexed tokenOut, uint256 num, uint256 den);
    event Swapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    function setRate(address tokenIn, address tokenOut, uint256 num, uint256 den) external onlyOwner {
        require(num > 0 && den > 0, "invalid rate");
        rates[keccak256(abi.encodePacked(tokenIn, tokenOut))] = Rate({ num: num, den: den });
        emit RateSet(tokenIn, tokenOut, num, den);
    }

    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256) {
        Rate memory r = rates[keccak256(abi.encodePacked(tokenIn, tokenOut))];
        if (r.num == 0 || r.den == 0) return 0;
        return (amountIn * r.num) / r.den;
    }

    // Simplified interface compatible with common DEX routers for tests.
    function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256) external returns (uint256[] memory amounts) {
        require(path.length >= 2, "invalid path");
        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];
        uint256 amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= amountOutMin, "insufficient output amount");

        // Pull amountIn from sender
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "transferFrom failed");
        // Send amountOut to recipient
        require(IERC20(tokenOut).transfer(to, amountOut), "transfer out failed");

        amounts = new uint256[](2);
        amounts[0] = amountIn; amounts[1] = amountOut;
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        return amounts;
    }
}
