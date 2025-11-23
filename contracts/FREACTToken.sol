// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FREACTToken
 * @dev Fake React Token for simulation mode testing on Reactive testnet
 * Features:
 * - 1,000,000 FREACT initial supply
 * - Built-in faucet with 1000 FREACT per claim
 * - 24-hour cooldown between claims
 * - 10,000 FREACT maximum per address
 * - 1 FREACT = 1 USD (pegged for easy calculations)
 */
contract FREACTToken is ERC20, Ownable {
    // Faucet configuration
    uint256 public constant CLAIM_AMOUNT = 1000 * 10**18; // 1000 FREACT
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public constant MAX_PER_ADDRESS = 10000 * 10**18; // 10,000 FREACT
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1,000,000 FREACT

    // Tracking claims
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public totalClaimed;
    
    // Statistics
    uint256 public totalFaucetClaims;
    uint256 public uniqueClaimers;
    
    // Events
    event FaucetClaim(address indexed claimer, uint256 amount, uint256 timestamp);
    event FaucetRefilled(uint256 amount);

    constructor() ERC20("Fake React", "FREACT") {
        // Mint initial supply to contract for faucet distribution
        _mint(address(this), INITIAL_SUPPLY);
    }

    /**
     * @dev Claim FREACT tokens from the faucet
     * Requirements:
     * - Must wait 24 hours between claims
     * - Cannot exceed 10,000 FREACT total per address
     * - Faucet must have sufficient balance
     */
    function claim() external {
        require(canClaim(msg.sender), "FREACT: Cannot claim yet");
        require(
            totalClaimed[msg.sender] + CLAIM_AMOUNT <= MAX_PER_ADDRESS,
            "FREACT: Max claim limit reached"
        );
        require(
            balanceOf(address(this)) >= CLAIM_AMOUNT,
            "FREACT: Faucet empty"
        );

        // Track first-time claimers
        if (totalClaimed[msg.sender] == 0) {
            uniqueClaimers++;
        }

        // Update claim tracking
        lastClaimTime[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += CLAIM_AMOUNT;
        totalFaucetClaims++;

        // Transfer tokens
        _transfer(address(this), msg.sender, CLAIM_AMOUNT);

        emit FaucetClaim(msg.sender, CLAIM_AMOUNT, block.timestamp);
    }

    /**
     * @dev Check if an address can claim from the faucet
     * @param account Address to check
     * @return bool True if the address can claim
     */
    function canClaim(address account) public view returns (bool) {
        // First time claimers can always claim
        if (lastClaimTime[account] == 0) {
            return true;
        }
        
        // Check cooldown period
        return block.timestamp >= lastClaimTime[account] + COOLDOWN_PERIOD;
    }

    /**
     * @dev Get the next time an address can claim
     * @param account Address to check
     * @return uint256 Timestamp when next claim is available (0 if can claim now)
     */
    function getNextClaimTime(address account) external view returns (uint256) {
        if (canClaim(account)) {
            return 0;
        }
        return lastClaimTime[account] + COOLDOWN_PERIOD;
    }

    /**
     * @dev Get remaining allowance for an address
     * @param account Address to check
     * @return uint256 Remaining FREACT that can be claimed
     */
    function getRemainingAllowance(address account) external view returns (uint256) {
        uint256 claimed = totalClaimed[account];
        if (claimed >= MAX_PER_ADDRESS) {
            return 0;
        }
        return MAX_PER_ADDRESS - claimed;
    }

    /**
     * @dev Get faucet statistics
     * @return remainingSupply Amount of FREACT left in faucet
     * @return totalClaims Total number of claims made
     * @return uniqueUsers Number of unique addresses that have claimed
     */
    function getFaucetStats() external view returns (
        uint256 remainingSupply,
        uint256 totalClaims,
        uint256 uniqueUsers
    ) {
        return (
            balanceOf(address(this)),
            totalFaucetClaims,
            uniqueClaimers
        );
    }

    /**
     * @dev Get claim history for an address
     * @param account Address to check
     * @return lastClaim Timestamp of last claim
     * @return totalClaimedAmount Total amount claimed by address
     * @return claimCount Number of times address has claimed
     */
    function getClaimHistory(address account) external view returns (
        uint256 lastClaim,
        uint256 totalClaimedAmount,
        uint256 claimCount
    ) {
        uint256 count = totalClaimed[account] / CLAIM_AMOUNT;
        return (
            lastClaimTime[account],
            totalClaimed[account],
            count
        );
    }

    /**
     * @dev Refill the faucet (owner only)
     * @param amount Amount of FREACT to add to faucet
     */
    function refillFaucet(uint256 amount) external onlyOwner {
        _mint(address(this), amount);
        emit FaucetRefilled(amount);
    }

    /**
     * @dev Emergency withdraw (owner only)
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "FREACT: Invalid address");
        _transfer(address(this), to, amount);
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
