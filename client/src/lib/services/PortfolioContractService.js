/**
 * Portfolio Contract Service
 * Handles all interactions with the EnhancedPortfolioManager smart contract
 * for portfolio creation, management, and on-chain data storage/retrieval
 */

import { ethers } from 'ethers';
import { get } from 'svelte/store';
import { walletService } from '$lib/stores/wallet.js';
import { notify } from '$lib/notify.js';

// Enhanced Portfolio Manager ABI - focused on portfolio management functions
const ENHANCED_PORTFOLIO_MANAGER_ABI = [
  // Portfolio allocation management
  "function setPortfolioAllocation(address[] memory tokens, uint256[] memory allocations) external",
  "function getUserAllocatedTokens(address user) external view returns (address[] memory)",
  "function getUserTokenAllocation(address user, address token) external view returns (uint256)",
  
  // Risk management
  "function setStopLoss(uint256 percentage) external",
  "function setTakeProfit(uint256 percentage) external",
  "function getStopLoss(address user) external view returns (uint256)",
  "function getTakeProfit(address user) external view returns (uint256)",
  
  // Batch operations
  "function batchUpdateAllocations((address[] tokens, uint256[] allocations, bool validateTotal)[] updates) external",
  "function batchUpdateRiskParameters((uint256 stopLossPercent, uint256 takeProfitPercent, bool updateStopLoss, bool updateTakeProfit) riskUpdate) external",
  
  // Token information
  "function getSupportedTokens() external view returns (address[] memory)",
  "function getTokenInfo(address token) external view returns ((bool isSupported, string symbol, uint8 decimals, uint8 category, address uniswapPool, uint24 poolFee, uint256 lastPriceUpdate))",
  "function getTokenPrice(address token) external view returns (uint256 price)",
  "function getBatchTokenPrices(address[] tokens) external view returns (uint256[] prices)",
  
  // Portfolio state
  "function isPanicMode(address user) external view returns (bool)",
  "function canUserRebalance(address user) external view returns (bool)",
  "function getUserRiskParameters(address user) external view returns (uint256 stopLoss, uint256 takeProfit, bool panicMode)",
  
  // Events
  "event PortfolioRebalanced(address indexed user, address[] tokens, uint256[] allocations)",
  "event StopLossSet(address indexed user, uint256 percent)",
  "event TakeProfitSet(address indexed user, uint256 percent)",
  "event BatchAllocationUpdated(address indexed user, address[] tokens, uint256[] allocations)"
];

// Contract address from environment or deployments
const CONTRACT_ADDRESS = import.meta.env.VITE_ENHANCED_PORTFOLIO_MANAGER_ADDRESS || 
                        import.meta.env.VITE_CONTRACT_ADDRESS || 
                        "0x0000000000000000000000000000000000000000";

class PortfolioContractService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.supportedTokensCache = null;
    this.tokenInfoCache = new Map();
  }

  /**
   * Initialize the contract service with wallet provider
   */
  async initialize() {
    try {
      const wallet = get(walletService.store);
      
      if (!wallet || !wallet.isConnected || !wallet.provider) {
        throw new Error('Wallet not connected');
      }

      this.provider = new ethers.BrowserProvider(wallet.provider);
      this.signer = await this.provider.getSigner();
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ENHANCED_PORTFOLIO_MANAGER_ABI,
        this.signer
      );

      console.log('✅ Portfolio contract service initialized', {
        contractAddress: CONTRACT_ADDRESS,
        signer: await this.signer.getAddress()
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize portfolio contract service:', error);
      throw error;
    }
  }

  /**
   * Ensure contract is initialized before operations
   */
  async ensureInitialized() {
    if (!this.contract) {
      await this.initialize();
    }
  }

  /**
   * Create a new portfolio on-chain by setting initial allocation
   * @param {Array<{address: string, allocation: number}>} tokenAllocations - Token addresses and allocation percentages
   * @returns {Promise<Object>} Transaction receipt
   */
  async createPortfolio(tokenAllocations) {
    await this.ensureInitialized();

    try {
      // Validate allocations sum to 100%
      const totalAllocation = tokenAllocations.reduce((sum, t) => sum + t.allocation, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        throw new Error(`Total allocation must equal 100%, got ${totalAllocation}%`);
      }

      // Convert to contract format (basis points)
      const tokens = tokenAllocations.map(t => t.address);
      const allocations = tokenAllocations.map(t => Math.floor(t.allocation * 100)); // Convert to basis points

      console.log('🚀 Creating portfolio on-chain', {
        tokens,
        allocations: tokenAllocations.map(t => `${t.allocation}%`)
      });

      // Call contract to set portfolio allocation
      const tx = await this.contract.setPortfolioAllocation(tokens, allocations);
      
      notify.info('Transaction submitted. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      console.log('✅ Portfolio created on-chain', {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Failed to create portfolio on-chain:', error);
      throw this.formatContractError(error);
    }
  }

  /**
   * Get user's portfolio allocation from blockchain
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Array>} Array of token allocations
   */
  async getPortfolioAllocation(userAddress) {
    await this.ensureInitialized();

    try {
      // Get allocated tokens
      const tokenAddresses = await this.contract.getUserAllocatedTokens(userAddress);
      
      if (tokenAddresses.length === 0) {
        return [];
      }

      // Get allocation for each token
      const allocations = await Promise.all(
        tokenAddresses.map(async (tokenAddress) => {
          const allocationBps = await this.contract.getUserTokenAllocation(userAddress, tokenAddress);
          const tokenInfo = await this.getTokenInfo(tokenAddress);
          
          return {
            address: tokenAddress,
            symbol: tokenInfo.symbol,
            allocation: Number(allocationBps) / 100, // Convert from basis points to percentage
            decimals: tokenInfo.decimals
          };
        })
      );

      return allocations;
    } catch (error) {
      console.error('Failed to get portfolio allocation:', error);
      throw this.formatContractError(error);
    }
  }

  /**
   * Update portfolio allocation on-chain
   * @param {Array<{address: string, allocation: number}>} tokenAllocations - New token allocations
   * @returns {Promise<Object>} Transaction receipt
   */
  async updatePortfolioAllocation(tokenAllocations) {
    await this.ensureInitialized();

    try {
      // Validate allocations
      const totalAllocation = tokenAllocations.reduce((sum, t) => sum + t.allocation, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        throw new Error(`Total allocation must equal 100%, got ${totalAllocation}%`);
      }

      const tokens = tokenAllocations.map(t => t.address);
      const allocations = tokenAllocations.map(t => Math.floor(t.allocation * 100));

      console.log('🔄 Updating portfolio allocation', {
        tokens,
        allocations: tokenAllocations.map(t => `${t.allocation}%`)
      });

      const tx = await this.contract.setPortfolioAllocation(tokens, allocations);
      
      notify.info('Updating allocation. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      console.log('✅ Portfolio allocation updated', {
        transactionHash: receipt.hash
      });

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Failed to update portfolio allocation:', error);
      throw this.formatContractError(error);
    }
  }

  /**
   * Set risk management parameters (stop-loss and take-profit)
   * @param {Object} riskParams - Risk parameters
   * @param {number} riskParams.stopLoss - Stop-loss percentage (optional)
   * @param {number} riskParams.takeProfit - Take-profit percentage (optional)
   * @returns {Promise<Object>} Transaction receipt
   */
  async setRiskParameters(riskParams) {
    await this.ensureInitialized();

    try {
      const transactions = [];

      // Set stop-loss if provided
      if (riskParams.stopLoss !== undefined && riskParams.stopLoss !== null) {
        const stopLossBps = Math.floor(riskParams.stopLoss * 100);
        console.log(`🛡️ Setting stop-loss to ${riskParams.stopLoss}%`);
        
        const tx = await this.contract.setStopLoss(stopLossBps);
        notify.info('Setting stop-loss. Waiting for confirmation...');
        const receipt = await tx.wait();
        
        transactions.push({
          type: 'stopLoss',
          transactionHash: receipt.hash
        });
      }

      // Set take-profit if provided
      if (riskParams.takeProfit !== undefined && riskParams.takeProfit !== null) {
        const takeProfitBps = Math.floor(riskParams.takeProfit * 100);
        console.log(`📈 Setting take-profit to ${riskParams.takeProfit}%`);
        
        const tx = await this.contract.setTakeProfit(takeProfitBps);
        notify.info('Setting take-profit. Waiting for confirmation...');
        const receipt = await tx.wait();
        
        transactions.push({
          type: 'takeProfit',
          transactionHash: receipt.hash
        });
      }

      console.log('✅ Risk parameters set successfully', transactions);

      return {
        success: true,
        transactions
      };
    } catch (error) {
      console.error('Failed to set risk parameters:', error);
      throw this.formatContractError(error);
    }
  }

  /**
   * Get user's risk parameters from blockchain
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Object>} Risk parameters
   */
  async getRiskParameters(userAddress) {
    await this.ensureInitialized();

    try {
      const [stopLossBps, takeProfitBps, panicMode] = await this.contract.getUserRiskParameters(userAddress);

      return {
        stopLoss: Number(stopLossBps) / 100, // Convert from basis points
        takeProfit: Number(takeProfitBps) / 100,
        panicMode
      };
    } catch (error) {
      console.error('Failed to get risk parameters:', error);
      throw this.formatContractError(error);
    }
  }

  /**
   * Get list of supported tokens from contract
   * @returns {Promise<Array>} Array of token addresses
   */
  async getSupportedTokens() {
    await this.ensureInitialized();

    try {
      // Use cache if available
      if (this.supportedTokensCache) {
        return this.supportedTokensCache;
      }

      const tokenAddresses = await this.contract.getSupportedTokens();
      
      // Get info for each token
      const tokens = await Promise.all(
        tokenAddresses.map(async (address) => {
          const info = await this.getTokenInfo(address);
          return {
            address,
            ...info
          };
        })
      );

      this.supportedTokensCache = tokens;
      return tokens;
    } catch (error) {
      console.error('Failed to get supported tokens:', error);
      throw this.formatContractError(error);
    }
  }

  /**
   * Get token information from contract
   * @param {string} tokenAddress - Token address
   * @returns {Promise<Object>} Token information
   */
  async getTokenInfo(tokenAddress) {
    await this.ensureInitialized();

    try {
      // Check cache first
      if (this.tokenInfoCache.has(tokenAddress)) {
        return this.tokenInfoCache.get(tokenAddress);
      }

      const info = await this.contract.getTokenInfo(tokenAddress);
      
      const tokenInfo = {
        isSupported: info.isSupported,
        symbol: info.symbol,
        decimals: info.decimals,
        category: info.category,
        uniswapPool: info.uniswapPool,
        poolFee: info.poolFee,
        lastPriceUpdate: Number(info.lastPriceUpdate)
      };

      // Cache the result
      this.tokenInfoCache.set(tokenAddress, tokenInfo);
      
      return tokenInfo;
    } catch (error) {
      console.error(`Failed to get token info for ${tokenAddress}:`, error);
      throw this.formatContractError(error);
    }
  }

  /**
   * Get token prices from contract
   * @param {Array<string>} tokenAddresses - Array of token addresses
   * @returns {Promise<Object>} Map of token addresses to prices
   */
  async getTokenPrices(tokenAddresses) {
    await this.ensureInitialized();

    try {
      const prices = await this.contract.getBatchTokenPrices(tokenAddresses);
      
      const priceMap = {};
      tokenAddresses.forEach((address, index) => {
        // Convert from 18 decimal precision to regular number
        priceMap[address] = parseFloat(ethers.formatEther(prices[index]));
      });

      return priceMap;
    } catch (error) {
      console.error('Failed to get token prices:', error);
      throw this.formatContractError(error);
    }
  }

  /**
   * Check if user can rebalance their portfolio
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<boolean>} Whether user can rebalance
   */
  async canRebalance(userAddress) {
    await this.ensureInitialized();

    try {
      return await this.contract.canUserRebalance(userAddress);
    } catch (error) {
      console.error('Failed to check rebalance status:', error);
      return false;
    }
  }

  /**
   * Subscribe to portfolio-related contract events
   * @param {Object} callbacks - Event callbacks
   * @param {Function} callbacks.onAllocationUpdated - Called when allocation is updated
   * @param {Function} callbacks.onRiskParametersSet - Called when risk parameters are set
   * @returns {Function} Unsubscribe function
   */
  subscribeToEvents(callbacks = {}) {
    if (!this.contract) {
      console.warn('Contract not initialized, cannot subscribe to events');
      return () => {};
    }

    const userAddress = this.signer.getAddress();

    // Portfolio allocation events
    if (callbacks.onAllocationUpdated) {
      this.contract.on('PortfolioRebalanced', (user, tokens, allocations, event) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          callbacks.onAllocationUpdated({
            user,
            tokens,
            allocations: allocations.map(a => Number(a) / 100),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        }
      });

      this.contract.on('BatchAllocationUpdated', (user, tokens, allocations, event) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          callbacks.onAllocationUpdated({
            user,
            tokens,
            allocations: allocations.map(a => Number(a) / 100),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        }
      });
    }

    // Risk parameter events
    if (callbacks.onRiskParametersSet) {
      this.contract.on('StopLossSet', (user, percent, event) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          callbacks.onRiskParametersSet({
            type: 'stopLoss',
            user,
            value: Number(percent) / 100,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        }
      });

      this.contract.on('TakeProfitSet', (user, percent, event) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          callbacks.onRiskParametersSet({
            type: 'takeProfit',
            user,
            value: Number(percent) / 100,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        }
      });
    }

    // Return unsubscribe function
    return () => {
      if (this.contract) {
        this.contract.removeAllListeners();
      }
    };
  }

  /**
   * Format contract errors into user-friendly messages
   * @param {Error} error - Contract error
   * @returns {Error} Formatted error
   */
  formatContractError(error) {
    let message = 'Contract interaction failed';

    if (error?.reason) {
      message = error.reason;
    } else if (error?.data?.message) {
      message = error.data.message;
    } else if (error?.message) {
      const msg = error.message;
      
      if (msg.includes('user rejected transaction')) {
        message = 'Transaction was rejected by user';
      } else if (msg.includes('insufficient funds')) {
        message = 'Insufficient funds for transaction';
      } else if (msg.includes('gas')) {
        message = 'Transaction failed due to gas issues';
      } else if (msg.includes('Token not supported')) {
        message = 'One or more tokens are not supported by the contract';
      } else if (msg.includes('Total allocation must equal 100%')) {
        message = 'Token allocations must sum to exactly 100%';
      } else if (msg.includes('Rebalance cooldown active')) {
        message = 'Portfolio was recently rebalanced. Please wait before rebalancing again.';
      } else {
        message = msg;
      }
    }

    const formattedError = new Error(message);
    formattedError.originalError = error;
    return formattedError;
  }

  /**
   * Clear cached data
   */
  clearCache() {
    this.supportedTokensCache = null;
    this.tokenInfoCache.clear();
  }
}

// Export singleton instance
export const portfolioContractService = new PortfolioContractService();
