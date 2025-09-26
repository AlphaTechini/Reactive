// lib/secureContractService.js
import { ethers } from 'ethers';
import { get } from 'svelte/store';
import { walletStore } from './walletService.js';

// Enhanced Portfolio Manager ABI
const ENHANCED_PORTFOLIO_MANAGER_ABI = [
  // User portfolio management
  "function setStopLoss(uint256 percentage) external",
  "function setTakeProfit(uint256 percentage) external", 
  "function activatePanicMode() external",
  "function deactivatePanicMode() external",
  "function setPortfolioAllocation(address[] memory tokens, uint256[] memory allocations) external",
  "function rebalancePortfolio() external",
  
  // Manual trading (secure, on-chain)
  "function executeSwap((address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline) params) external",
  
  // Price and data queries
  "function getTokenPrice(address token) external view returns (uint256 price)",
  "function updateTokenPrice(address token) external",
  "function getStopLoss(address user) external view returns (uint256)",
  "function getTakeProfit(address user) external view returns (uint256)",
  "function isPanicMode(address user) external view returns (bool)",
  "function getUserAllocatedTokens(address user) external view returns (address[] memory)",
  "function getUserTokenAllocation(address user, address token) external view returns (uint256)",
  "function getSupportedTokens() external view returns (address[] memory)",
  "function getTokenInfo(address token) external view returns ((bool isSupported, string memory symbol, uint8 decimals, uint8 category, address uniswapPool, uint24 poolFee, uint256 lastPriceUpdate))",
  
  // View functions
  "function canUserRebalance(address user) external view returns (bool)",
  
  // Events
  "event StopLossSet(address indexed user, uint256 percentage)",
  "event TakeProfitSet(address indexed user, uint256 percentage)",
  "event PanicModeTriggered(address indexed user)",
  "event PanicModeDeactivated(address indexed user)",
  "event PortfolioRebalanced(address indexed user, address[] tokens, uint256[] allocations)",
  "event TokenSwapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
  "event PriceUpdated(address indexed token, uint256 newPrice)"
];

// Replace with your deployed Enhanced Portfolio Manager address
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

// Known token addresses (will be fetched from contract)
let SUPPORTED_TOKENS = {};

class SecureContractService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.supportedTokens = new Map();
  }

  async initialize() {
    try {
      const wallet = get(walletStore);
      if (!wallet.isConnected || !wallet.provider) {
        throw new Error('Wallet not connected');
      }

      this.provider = new ethers.BrowserProvider(wallet.provider);
      this.signer = this.provider.getSigner();
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, ENHANCED_PORTFOLIO_MANAGER_ABI, this.signer);
      
      // Load supported tokens from contract
      await this.loadSupportedTokens();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize secure contract service:', error);
      throw error;
    }
  }

  async loadSupportedTokens() {
    try {
      const tokenAddresses = await this.contract.getSupportedTokens();
      
      for (const address of tokenAddresses) {
        const tokenInfo = await this.contract.getTokenInfo(address);
        this.supportedTokens.set(address, {
          address,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          category: tokenInfo.category,
          isSupported: tokenInfo.isSupported
        });
      }
      
      // Update global token mapping
      SUPPORTED_TOKENS = Object.fromEntries(
        Array.from(this.supportedTokens.entries()).map(([addr, info]) => [info.symbol, addr])
      );
      
      console.log('Loaded supported tokens:', SUPPORTED_TOKENS);
      
    } catch (error) {
      console.error('Failed to load supported tokens:', error);
    }
  }

  // Portfolio Management Functions (secure, on-chain)
  async setStopLoss(percentage) {
    if (!this.contract) await this.initialize();
    
    try {
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

  async setPortfolioAllocation(tokens, allocations) {
    if (!this.contract) await this.initialize();
    
    try {
      // Convert allocations to basis points
      const allocationsBasisPoints = allocations.map(alloc => Math.floor(alloc * 100));
      const tx = await this.contract.setPortfolioAllocation(tokens, allocationsBasisPoints);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to set portfolio allocation:', error);
      throw error;
    }
  }

  async rebalancePortfolio() {
    if (!this.contract) await this.initialize();
    
    try {
      const tx = await this.contract.rebalancePortfolio();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to rebalance portfolio:', error);
      throw error;
    }
  }

  // Secure Trading Functions (on-chain execution only)
  async executeSwap(tokenInAddress, tokenOutAddress, amountIn, slippagePercent = 1) {
    if (!this.contract) await this.initialize();
    
    try {
      // Calculate minimum output with slippage
      const tokenInPrice = await this.getTokenPrice(tokenInAddress);
      const tokenOutPrice = await this.getTokenPrice(tokenOutAddress);
      
      const expectedOut = (amountIn * tokenInPrice) / tokenOutPrice;
      const minAmountOut = expectedOut * (100 - slippagePercent) / 100;
      
      const swapParams = {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn: ethers.parseUnits(amountIn.toString(), 18),
        minAmountOut: ethers.parseUnits(minAmountOut.toString(), 18),
        deadline: Math.floor(Date.now() / 1000) + 1200 // 20 minutes
      };

      const tx = await this.contract.executeSwap(swapParams);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to execute swap:', error);
      throw error;
    }
  }

  // Read-only Price Functions (secure, from contract)
  async getTokenPrice(tokenAddress) {
    if (!this.contract) await this.initialize();
    
    try {
      const price = await this.contract.getTokenPrice(tokenAddress);
      // Convert from 18 decimals to regular number
      return parseFloat(ethers.formatEther(price));
    } catch (error) {
      console.error('Failed to get token price:', error);
      throw error;
    }
  }

  async updateTokenPrice(tokenAddress) {
    if (!this.contract) await this.initialize();
    
    try {
      const tx = await this.contract.updateTokenPrice(tokenAddress);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Failed to update token price:', error);
      throw error;
    }
  }

  async getAllTokenPrices() {
    const prices = {};
    
    try {
      for (const [address, tokenInfo] of this.supportedTokens) {
        try {
          const price = await this.getTokenPrice(address);
          prices[address] = {
            symbol: tokenInfo.symbol,
            price: price,
            address: address
          };
        } catch (error) {
          console.error(`Failed to get price for ${tokenInfo.symbol}:`, error);
          prices[address] = {
            symbol: tokenInfo.symbol,
            price: 0,
            address: address
          };
        }
      }
    } catch (error) {
      console.error('Failed to get all token prices:', error);
    }
    
    return prices;
  }

  // Query Functions
  async getStopLoss() {
    if (!this.contract) await this.initialize();
    
    try {
      const userAddress = await this.signer.getAddress();
      const result = await this.contract.getStopLoss(userAddress);
      return result.toNumber() / 100;
    } catch (error) {
      console.error('Failed to get stop loss:', error);
      throw error;
    }
  }

  async getTakeProfit() {
    if (!this.contract) await this.initialize();
    
    try {
      const userAddress = await this.signer.getAddress();
      const result = await this.contract.getTakeProfit(userAddress);
      return result.toNumber() / 100;
    } catch (error) {
      console.error('Failed to get take profit:', error);
      throw error;
    }
  }

  async isPanicMode() {
    if (!this.contract) await this.initialize();
    
    try {
      const userAddress = await this.signer.getAddress();
      return await this.contract.isPanicMode(userAddress);
    } catch (error) {
      console.error('Failed to check panic mode status:', error);
      throw error;
    }
  }

  async getUserAllocatedTokens() {
    if (!this.contract) await this.initialize();
    
    try {
      const userAddress = await this.signer.getAddress();
      return await this.contract.getUserAllocatedTokens(userAddress);
    } catch (error) {
      console.error('Failed to get allocated tokens:', error);
      throw error;
    }
  }

  async getUserTokenAllocation(tokenAddress) {
    if (!this.contract) await this.initialize();
    
    try {
      const userAddress = await this.signer.getAddress();
      const result = await this.contract.getUserTokenAllocation(userAddress, tokenAddress);
      return result.toNumber() / 100;
    } catch (error) {
      console.error('Failed to get token allocation:', error);
      throw error;
    }
  }

  async canUserRebalance() {
    if (!this.contract) await this.initialize();
    
    try {
      const userAddress = await this.signer.getAddress();
      return await this.contract.canUserRebalance(userAddress);
    } catch (error) {
      console.error('Failed to check rebalance status:', error);
      throw error;
    }
  }

  // Event Subscription (secure, contract events only)
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

    // Portfolio events
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

    // Trading events
    if (callbacks.onTokenSwapped) {
      this.contract.on('TokenSwapped', (user, tokenIn, tokenOut, amountIn, amountOut, event) => {
        callbacks.onTokenSwapped({
          user,
          tokenIn,
          tokenOut,
          amountIn: ethers.formatEther(amountIn),
          amountOut: ethers.formatEther(amountOut),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });
    }

    // Price update events
    if (callbacks.onPriceUpdated) {
      this.contract.on('PriceUpdated', (token, newPrice, event) => {
        callbacks.onPriceUpdated({
          token,
          price: parseFloat(ethers.formatEther(newPrice)),
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
  getSupportedTokens() {
    return Array.from(this.supportedTokens.values());
  }

  getTokenBySymbol(symbol) {
    for (const [address, tokenInfo] of this.supportedTokens) {
      if (tokenInfo.symbol === symbol) {
        return { address, ...tokenInfo };
      }
    }
    return null;
  }

  getTokenByAddress(address) {
    return this.supportedTokens.get(address) || null;
  }

  // Error formatting
  formatContractError(error) {
    if (error?.reason) {
      return error.reason;
    } else if (error?.data?.message) {
      return error.data.message;
    } else if (error?.message) {
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

export const secureContractService = new SecureContractService();
export { SUPPORTED_TOKENS };