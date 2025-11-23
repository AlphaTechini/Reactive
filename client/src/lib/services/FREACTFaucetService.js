import { ethers } from 'ethers';
import { get } from 'svelte/store';
import { walletStore } from '../stores/wallet.js';

/**
 * FREACT Faucet Service
 * Handles interaction with the FREACT token faucet contract
 */

// FREACT Token ABI (only the functions we need)
const FREACT_ABI = [
  'function claim() external',
  'function canClaim(address account) external view returns (bool)',
  'function getNextClaimTime(address account) external view returns (uint256)',
  'function getRemainingAllowance(address account) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function getFaucetStats() external view returns (uint256 remainingSupply, uint256 totalClaims, uint256 uniqueUsers)',
  'function getClaimHistory(address account) external view returns (uint256 lastClaim, uint256 totalClaimedAmount, uint256 claimCount)',
  'function decimals() external pure returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  'event FaucetClaim(address indexed claimer, uint256 amount, uint256 timestamp)'
];

// Minimum REACT balance needed for gas (0.01 REACT)
const MIN_GAS_BALANCE = ethers.parseEther('0.01');

class FREACTFaucetService {
  constructor() {
    this.contractAddress = null;
    this.contract = null;
    this.provider = null;
    this.signer = null;
  }

  /**
   * Initialize the service with contract address
   * @param {string} contractAddress - Deployed FREACT contract address
   */
  async initialize(contractAddress) {
    if (!contractAddress) {
      throw new Error('FREACT contract address is required');
    }

    this.contractAddress = contractAddress;
    
    const wallet = get(walletStore);
    if (!wallet.provider) {
      throw new Error('Wallet not connected');
    }

    this.provider = wallet.provider;
    this.signer = wallet.signer;
    this.contract = new ethers.Contract(contractAddress, FREACT_ABI, this.signer);

    console.log('✅ FREACT Faucet Service initialized:', contractAddress);
  }

  /**
   * Check if user has enough REACT for gas
   * @param {string} address - User's wallet address
   * @returns {Promise<{hasEnough: boolean, balance: string, required: string}>}
   */
  async checkGasBalance(address) {
    if (!this.provider) {
      throw new Error('Service not initialized');
    }

    const balance = await this.provider.getBalance(address);
    const hasEnough = balance >= MIN_GAS_BALANCE;

    return {
      hasEnough,
      balance: ethers.formatEther(balance),
      required: ethers.formatEther(MIN_GAS_BALANCE),
      balanceWei: balance
    };
  }

  /**
   * Get user's FREACT balance
   * @param {string} address - User's wallet address
   * @returns {Promise<string>} Balance in FREACT
   */
  async getBalance(address) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    const balance = await this.contract.balanceOf(address);
    return ethers.formatEther(balance);
  }

  /**
   * Check if user can claim from faucet
   * @param {string} address - User's wallet address
   * @returns {Promise<boolean>}
   */
  async canClaim(address) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    return await this.contract.canClaim(address);
  }

  /**
   * Get next claim time for user
   * @param {string} address - User's wallet address
   * @returns {Promise<{canClaimNow: boolean, nextClaimTime: number, timeUntilClaim: number}>}
   */
  async getNextClaimTime(address) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    const nextClaimTimestamp = await this.contract.getNextClaimTime(address);
    const nextClaimTime = Number(nextClaimTimestamp);
    const now = Math.floor(Date.now() / 1000);
    const canClaimNow = nextClaimTime === 0 || nextClaimTime <= now;
    const timeUntilClaim = canClaimNow ? 0 : nextClaimTime - now;

    return {
      canClaimNow,
      nextClaimTime,
      timeUntilClaim
    };
  }

  /**
   * Get remaining allowance for user
   * @param {string} address - User's wallet address
   * @returns {Promise<string>} Remaining FREACT that can be claimed
   */
  async getRemainingAllowance(address) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    const remaining = await this.contract.getRemainingAllowance(address);
    return ethers.formatEther(remaining);
  }

  /**
   * Get claim history for user
   * @param {string} address - User's wallet address
   * @returns {Promise<{lastClaim: number, totalClaimed: string, claimCount: number}>}
   */
  async getClaimHistory(address) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    const [lastClaim, totalClaimedAmount, claimCount] = await this.contract.getClaimHistory(address);

    return {
      lastClaim: Number(lastClaim),
      totalClaimed: ethers.formatEther(totalClaimedAmount),
      claimCount: Number(claimCount)
    };
  }

  /**
   * Get faucet statistics
   * @returns {Promise<{remainingSupply: string, totalClaims: number, uniqueUsers: number}>}
   */
  async getFaucetStats() {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    const [remainingSupply, totalClaims, uniqueUsers] = await this.contract.getFaucetStats();

    return {
      remainingSupply: ethers.formatEther(remainingSupply),
      totalClaims: Number(totalClaims),
      uniqueUsers: Number(uniqueUsers)
    };
  }

  /**
   * Claim FREACT tokens from faucet
   * @param {string} address - User's wallet address
   * @returns {Promise<{success: boolean, txHash: string, amount: string}>}
   */
  async claimTokens(address) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    // Check gas balance first
    const gasCheck = await this.checkGasBalance(address);
    if (!gasCheck.hasEnough) {
      throw new Error(`Insufficient REACT for gas. You have ${gasCheck.balance} REACT, need at least ${gasCheck.required} REACT`);
    }

    // Check if can claim
    const canClaim = await this.canClaim(address);
    if (!canClaim) {
      const nextClaim = await this.getNextClaimTime(address);
      throw new Error(`Cannot claim yet. Next claim available in ${this.formatTimeRemaining(nextClaim.timeUntilClaim)}`);
    }

    console.log('🎯 Claiming FREACT tokens...');

    // Execute claim transaction
    const tx = await this.contract.claim();
    console.log('📝 Transaction submitted:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt.transactionHash);

    return {
      success: true,
      txHash: receipt.transactionHash,
      amount: '1000' // Fixed claim amount
    };
  }

  /**
   * Get comprehensive user status
   * @param {string} address - User's wallet address
   * @returns {Promise<Object>} Complete user faucet status
   */
  async getUserStatus(address) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    const [
      balance,
      canClaim,
      nextClaim,
      remaining,
      history,
      gasBalance
    ] = await Promise.all([
      this.getBalance(address),
      this.canClaim(address),
      this.getNextClaimTime(address),
      this.getRemainingAllowance(address),
      this.getClaimHistory(address),
      this.checkGasBalance(address)
    ]);

    return {
      freactBalance: balance,
      canClaim,
      nextClaimTime: nextClaim,
      remainingAllowance: remaining,
      claimHistory: history,
      gasBalance,
      isEligible: canClaim && gasBalance.hasEnough && parseFloat(remaining) > 0
    };
  }

  /**
   * Format time remaining in human-readable format
   * @param {number} seconds - Seconds remaining
   * @returns {string} Formatted time string
   */
  formatTimeRemaining(seconds) {
    if (seconds <= 0) return 'Now';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Get testnet faucet URL for REACT tokens
   * @returns {string} Faucet URL
   */
  getReactFaucetUrl() {
    return 'https://lasna.reactscan.net/faucet';
  }
}

// Export singleton instance
export const freactFaucetService = new FREACTFaucetService();
