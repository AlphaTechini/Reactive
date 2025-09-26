// lib/contractService.js
import { ethers } from 'ethers';
import { get } from 'svelte/store';
import { walletStore } from './walletService.js';

// Contract ABI (simplified - you'll need to import the full ABI from your compiled contracts)
const PORTFOLIO_MANAGER_ABI = [
  "function setStopLoss(uint256 _percentage) external",
  "function setTakeProfit(uint256 _percentage) external", 
  "function activatePanicMode() external",
  "function deactivatePanicMode() external",
  "function rebalancePortfolio(address[] memory tokens, uint256[] memory targetAllocations) external",
  "function getStopLoss() external view returns (uint256)",
  "function getTakeProfit() external view returns (uint256)",
  "function isPanicMode() external view returns (bool)",
  "function getPortfolioValue() external view returns (uint256)",
  "function getUserTokenBalance(address token) external view returns (uint256)",
  "event StopLossSet(address indexed user, uint256 percentage)",
  "event TakeProfitSet(address indexed user, uint256 percentage)",
  "event PanicModeTriggered(address indexed user)",
  "event PanicModeDeactivated(address indexed user)",
  "event PortfolioRebalanced(address indexed user, address[] tokens, uint256[] allocations)"
];

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

class ContractService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
  }

  async initialize() {
    try {
      const wallet = get(walletStore);
      if (!wallet.isConnected || !wallet.provider) {
        throw new Error('Wallet not connected');
      }

      this.provider = new ethers.BrowserProvider(wallet.provider);
      this.signer = await this.provider.getSigner();
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, PORTFOLIO_MANAGER_ABI, this.signer);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize contract service:', error);
      throw error;
    }
  }

  async setStopLoss(percentage) {
    if (!this.contract) await this.initialize();
    
    try {
      // Convert percentage to basis points (e.g., 15% = 1500)
      const basisPoints = Math.floor(percentage * 100);
      const tx = await this.contract.setStopLoss(basisPoints);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to set stop loss:', error);
      throw error;
    }
  }

  async setTakeProfit(percentage) {
    if (!this.contract) await this.initialize();
    
    try {
      const basisPoints = Math.floor(percentage * 100);
      const tx = await this.contract.setTakeProfit(basisPoints);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to set take profit:', error);
      throw error;
    }
  }

  async activatePanicMode() {
    if (!this.contract) await this.initialize();
    
    try {
      const tx = await this.contract.activatePanicMode();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to activate panic mode:', error);
      throw error;
    }
  }

  async deactivatePanicMode() {
    if (!this.contract) await this.initialize();
    
    try {
      const tx = await this.contract.deactivatePanicMode();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to deactivate panic mode:', error);
      throw error;
    }
  }

  async rebalancePortfolio(tokens, allocations) {
    if (!this.contract) await this.initialize();
    
    try {
      // Convert allocations to basis points
      const allocationsBasisPoints = allocations.map(alloc => Math.floor(alloc * 100));
      const tx = await this.contract.rebalancePortfolio(tokens, allocationsBasisPoints);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to rebalance portfolio:', error);
      throw error;
    }
  }

  async getStopLoss() {
    if (!this.contract) await this.initialize();
    
    try {
      const result = await this.contract.getStopLoss();
      // Convert from basis points to percentage
      return result.toNumber() / 100;
    } catch (error) {
      console.error('Failed to get stop loss:', error);
      throw error;
    }
  }

  async getTakeProfit() {
    if (!this.contract) await this.initialize();
    
    try {
      const result = await this.contract.getTakeProfit();
      return result.toNumber() / 100;
    } catch (error) {
      console.error('Failed to get take profit:', error);
      throw error;
    }
  }

  async isPanicMode() {
    if (!this.contract) await this.initialize();
    
    try {
      return await this.contract.isPanicMode();
    } catch (error) {
      console.error('Failed to check panic mode status:', error);
      throw error;
    }
  }

  async getPortfolioValue() {
    if (!this.contract) await this.initialize();
    
    try {
      const value = await this.contract.getPortfolioValue();
      return ethers.formatEther(value);
    } catch (error) {
      console.error('Failed to get portfolio value:', error);
      throw error;
    }
  }

  async getUserTokenBalance(tokenAddress) {
    if (!this.contract) await this.initialize();
    
    try {
      const balance = await this.contract.getUserTokenBalance(tokenAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get token balance:', error);
      throw error;
    }
  }

  // Event listeners
  subscribeToEvents(callbacks = {}) {
    if (!this.contract) return;

    // Stop Loss events
    if (callbacks.onStopLossSet) {
      this.contract.on('StopLossSet', (user, percentage, event) => {
        callbacks.onStopLossSet({
          user,
          percentage: percentage.toNumber() / 100,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });
    }

    // Take Profit events
    if (callbacks.onTakeProfitSet) {
      this.contract.on('TakeProfitSet', (user, percentage, event) => {
        callbacks.onTakeProfitSet({
          user,
          percentage: percentage.toNumber() / 100,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });
    }

    // Panic Mode events
    if (callbacks.onPanicModeTriggered) {
      this.contract.on('PanicModeTriggered', (user, event) => {
        callbacks.onPanicModeTriggered({
          user,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });
    }

    if (callbacks.onPanicModeDeactivated) {
      this.contract.on('PanicModeDeactivated', (user, event) => {
        callbacks.onPanicModeDeactivated({
          user,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });
    }

    // Portfolio Rebalanced events
    if (callbacks.onPortfolioRebalanced) {
      this.contract.on('PortfolioRebalanced', (user, tokens, allocations, event) => {
        callbacks.onPortfolioRebalanced({
          user,
          tokens,
          allocations: allocations.map(alloc => alloc.toNumber() / 100),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });
    }
  }

  unsubscribeFromEvents() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }

  // Utility functions
  async estimateGas(functionName, ...args) {
    if (!this.contract) await this.initialize();
    
    try {
      return await this.contract.estimateGas[functionName](...args);
    } catch (error) {
      console.error(`Failed to estimate gas for ${functionName}:`, error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash) {
    if (!this.provider) await this.initialize();
    
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  // Format errors for user display
  formatContractError(error) {
    if (error?.reason) {
      return error.reason;
    } else if (error?.data?.message) {
      return error.data.message;
    } else if (error?.message) {
      // Clean up common ethers error messages
      const message = error.message;
      if (message.includes('user rejected transaction')) {
        return 'Transaction was rejected by user';
      } else if (message.includes('insufficient funds')) {
        return 'Insufficient funds for transaction';
      } else if (message.includes('gas')) {
        return 'Transaction failed due to gas issues';
      }
      return message;
    }
    return 'Unknown contract error occurred';
  }
}

export const contractService = new ContractService();