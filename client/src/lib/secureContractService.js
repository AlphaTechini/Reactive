// Migrated secureContractService.js
import { ethers } from 'ethers';
import { get } from 'svelte/store';
import { walletService } from '$lib/stores/wallet.js';

const ENHANCED_PORTFOLIO_MANAGER_ABI = [
  "function setStopLoss(uint256 percentage) external",
  "function setTakeProfit(uint256 percentage) external", 
  "function activatePanicMode() external",
  "function deactivatePanicMode() external",
  "function setPortfolioAllocation(address[] memory tokens, uint256[] memory allocations) external",
  "function rebalancePortfolio() external",
  "function executeSwap((address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline) params) external",
  "function getTokenPrice(address token) external view returns (uint256 price)",
  "function updateTokenPrice(address token) external",
  "function getStopLoss(address user) external view returns (uint256)",
  "function getTakeProfit(address user) external view returns (uint256)",
  "function isPanicMode(address user) external view returns (bool)",
  "function getUserAllocatedTokens(address user) external view returns (address[] memory)",
  "function getUserTokenAllocation(address user, address token) external view returns (uint256)",
  "function getSupportedTokens() external view returns (address[] memory)",
  "function getTokenInfo(address token) external view returns ((bool isSupported, string memory symbol, uint8 decimals, uint8 category, address uniswapPool, uint24 poolFee, uint256 lastPriceUpdate))",
  "function canUserRebalance(address user) external view returns (bool)",
  "event StopLossSet(address indexed user, uint256 percentage)",
  "event TakeProfitSet(address indexed user, uint256 percentage)",
  "event PanicModeTriggered(address indexed user)",
  "event PanicModeDeactivated(address indexed user)",
  "event PortfolioRebalanced(address indexed user, address[] tokens, uint256[] allocations)",
  "event TokenSwapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
  "event PriceUpdated(address indexed token, uint256 newPrice)"
];

// Will be loaded from deployments.json or env variable
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const WEBHOOK_API_URL = import.meta.env.VITE_WEBHOOK_URL || "http://localhost:3001/api";

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
      const wallet = get(walletService.store);
      if (!wallet || !wallet.isConnected || !wallet.provider) {
        throw new Error('Wallet not connected');
      }

      this.provider = new ethers.BrowserProvider(wallet.provider);
      this.signer = this.provider.getSigner();
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, ENHANCED_PORTFOLIO_MANAGER_ABI, this.signer);
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
      SUPPORTED_TOKENS = Object.fromEntries(Array.from(this.supportedTokens.entries()).map(([addr, info]) => [info.symbol, addr]));
    } catch (error) {
      console.error('Failed to load supported tokens:', error);
    }
  }

  async setStopLoss(percentage) { if (!this.contract) await this.initialize(); try { const bps = Math.floor(percentage * 100); const tx = await this.contract.setStopLoss(bps); await tx.wait(); return tx; } catch (e) { console.error('Failed to set stop loss:', e); throw e; } }
  async setTakeProfit(percentage) { if (!this.contract) await this.initialize(); try { const bps = Math.floor(percentage * 100); const tx = await this.contract.setTakeProfit(bps); await tx.wait(); return tx; } catch (e) { console.error('Failed to set take profit:', e); throw e; } }
  async activatePanicMode() { if (!this.contract) await this.initialize(); try { const tx = await this.contract.activatePanicMode(); await tx.wait(); return tx; } catch (e) { console.error('Failed to activate panic mode:', e); throw e; } }
  async deactivatePanicMode() { if (!this.contract) await this.initialize(); try { const tx = await this.contract.deactivatePanicMode(); await tx.wait(); return tx; } catch (e) { console.error('Failed to deactivate panic mode:', e); throw e; } }
  async setPortfolioAllocation(tokens, allocations) { if (!this.contract) await this.initialize(); try { const bps = allocations.map(a => Math.floor(a * 100)); const tx = await this.contract.setPortfolioAllocation(tokens, bps); await tx.wait(); return tx; } catch (e) { console.error('Failed to set portfolio allocation:', e); throw e; } }
  async rebalancePortfolio() { if (!this.contract) await this.initialize(); try { const tx = await this.contract.rebalancePortfolio(); await tx.wait(); return tx; } catch (e) { console.error('Failed to rebalance:', e); throw e; } }

  // Mock trading - simulate percentage-based trades without real swaps
  async executeSwap(tokenInAddress, tokenOutAddress, amountIn, slippagePercent = 1) {
    if (!this.contract) await this.initialize();
    
    try {
      console.log(`🔄 Mock swap: ${amountIn} tokens from ${tokenInAddress} to ${tokenOutAddress}`);
      
      // Get mock prices from webhook service
      const prices = await this.getMockPrices();
      const tokenInPrice = prices[tokenInAddress]?.current || 1;
      const tokenOutPrice = prices[tokenOutAddress]?.current || 1;
      
      // Calculate expected output with slippage
      const expectedOut = (amountIn * tokenInPrice) / tokenOutPrice;
      const actualOut = expectedOut * (1 - slippagePercent / 100);
      
      // Simulate transaction (no real swap)
      const mockTx = {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from: await this.signer.getAddress(),
        to: CONTRACT_ADDRESS,
        value: "0",
        gasUsed: ethers.parseUnits("21000", "wei"),
        status: 1,
        wait: async () => ({ 
          transactionHash: this.hash,
          gasUsed: ethers.parseUnits("21000", "wei"),
          status: 1
        })
      };
      
      console.log(`✅ Mock swap completed: ${actualOut.toFixed(6)} tokens received`);
      
      // Emit mock event
      this.emitMockSwapEvent(tokenInAddress, tokenOutAddress, amountIn, actualOut);
      
      return mockTx;
      
    } catch (e) {
      console.error('Failed to execute mock swap:', e);
      throw e;
    }
  }

  // Get mock token price from webhook service
  async getTokenPrice(tokenAddress) {
    try {
      const prices = await this.getMockPrices();
      const priceData = prices[tokenAddress];
      
      if (priceData) {
        return priceData.current;
      }
      
      // Fallback to contract if webhook unavailable
      if (!this.contract) await this.initialize();
      const price = await this.contract.getTokenPrice(tokenAddress);
      return parseFloat(ethers.formatEther(price));
      
    } catch (e) {
      console.error('Failed to get token price:', e);
      return 0;
    }
  }
  
  // Fetch mock prices from webhook service
  async getMockPrices() {
    try {
      const response = await fetch(`${WEBHOOK_API_URL}/prices`);
      if (!response.ok) throw new Error('Webhook service unavailable');
      return await response.json();
    } catch (e) {
      console.warn('Using fallback prices, webhook service unavailable:', e.message);
      return {};
    }
  }
  async updateTokenPrice(tokenAddress) { if (!this.contract) await this.initialize(); try { const tx = await this.contract.updateTokenPrice(tokenAddress); await tx.wait(); return tx; } catch (e) { console.error('Failed to update token price:', e); throw e; } }
  async getAllTokenPrices() { const prices = {}; try { for (const [address, tokenInfo] of this.supportedTokens) { try { const price = await this.getTokenPrice(address); prices[address] = { symbol: tokenInfo.symbol, price, address }; } catch { prices[address] = { symbol: tokenInfo.symbol, price: 0, address }; } } } catch (e) { console.error('Failed to get all token prices:', e); } return prices; }
  async getStopLoss() { if (!this.contract) await this.initialize(); try { const user = await this.signer.getAddress(); const res = await this.contract.getStopLoss(user); return res.toNumber() / 100; } catch (e) { console.error('Failed to get stop loss:', e); throw e; } }
  async getTakeProfit() { if (!this.contract) await this.initialize(); try { const user = await this.signer.getAddress(); const res = await this.contract.getTakeProfit(user); return res.toNumber() / 100; } catch (e) { console.error('Failed to get take profit:', e); throw e; } }
  async isPanicMode() { if (!this.contract) await this.initialize(); try { const user = await this.signer.getAddress(); return await this.contract.isPanicMode(user); } catch (e) { console.error('Failed to check panic mode:', e); throw e; } }
  async getUserAllocatedTokens() { if (!this.contract) await this.initialize(); try { const user = await this.signer.getAddress(); return await this.contract.getUserAllocatedTokens(user); } catch (e) { console.error('Failed to get allocated tokens:', e); throw e; } }
  async getUserTokenAllocation(token) { if (!this.contract) await this.initialize(); try { const user = await this.signer.getAddress(); const res = await this.contract.getUserTokenAllocation(user, token); return res.toNumber() / 100; } catch (e) { console.error('Failed to get token allocation:', e); throw e; } }
  async canUserRebalance() { if (!this.contract) await this.initialize(); try { const user = await this.signer.getAddress(); return await this.contract.canUserRebalance(user); } catch (e) { console.error('Failed to check rebalance status:', e); throw e; } }

  subscribeToEvents(callbacks = {}) { if (!this.contract) return; if (callbacks.onStopLossSet) { this.contract.on('StopLossSet', (user, percentage, event) => { callbacks.onStopLossSet({ user, percentage: percentage.toNumber() / 100, transactionHash: event.transactionHash, blockNumber: event.blockNumber }); }); } if (callbacks.onTakeProfitSet) { this.contract.on('TakeProfitSet', (user, percentage, event) => { callbacks.onTakeProfitSet({ user, percentage: percentage.toNumber() / 100, transactionHash: event.transactionHash, blockNumber: event.blockNumber }); }); } if (callbacks.onPanicModeTriggered) { this.contract.on('PanicModeTriggered', (user, event) => { callbacks.onPanicModeTriggered({ user, transactionHash: event.transactionHash, blockNumber: event.blockNumber }); }); } if (callbacks.onPanicModeDeactivated) { this.contract.on('PanicModeDeactivated', (user, event) => { callbacks.onPanicModeDeactivated({ user, transactionHash: event.transactionHash, blockNumber: event.blockNumber }); }); } if (callbacks.onPortfolioRebalanced) { this.contract.on('PortfolioRebalanced', (user, tokens, allocations, event) => { callbacks.onPortfolioRebalanced({ user, tokens, allocations: allocations.map(a => a.toNumber() / 100), transactionHash: event.transactionHash, blockNumber: event.blockNumber }); }); } if (callbacks.onTokenSwapped) { this.contract.on('TokenSwapped', (user, tokenIn, tokenOut, amountIn, amountOut, event) => { callbacks.onTokenSwapped({ user, tokenIn, tokenOut, amountIn: ethers.formatEther(amountIn), amountOut: ethers.formatEther(amountOut), transactionHash: event.transactionHash, blockNumber: event.blockNumber }); }); } if (callbacks.onPriceUpdated) { this.contract.on('PriceUpdated', (token, newPrice, event) => { callbacks.onPriceUpdated({ token, price: parseFloat(ethers.formatEther(newPrice)), transactionHash: event.transactionHash, blockNumber: event.blockNumber }); }); } }
  unsubscribeFromEvents() { if (this.contract) { this.contract.removeAllListeners(); } }
  getSupportedTokens() { return Array.from(this.supportedTokens.values()); }
  getTokenBySymbol(symbol) { for (const [addr, info] of this.supportedTokens) { if (info.symbol === symbol) return { address: addr, ...info }; } return null; }
  getTokenByAddress(address) { return this.supportedTokens.get(address) || null; }
  // Trigger webhook-based actions
  async triggerWebhookAction(action, tokenAddress, threshold) {
    try {
      const userAddress = await this.signer.getAddress();
      
      const response = await fetch(`${WEBHOOK_API_URL}/trigger-price-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress,
          action,
          userAddress,
          threshold
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook trigger failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`🎯 Webhook ${action} triggered:`, result.message);
      return result;
      
    } catch (e) {
      console.error(`Failed to trigger webhook ${action}:`, e);
      throw e;
    }
  }
  
  // Get price history for charts
  async getPriceHistory(tokenAddress) {
    try {
      const response = await fetch(`${WEBHOOK_API_URL}/price-history/${tokenAddress}`);
      if (!response.ok) throw new Error('Failed to fetch price history');
      return await response.json();
    } catch (e) {
      console.error('Failed to get price history:', e);
      return [];
    }
  }
  
  // Emit mock events for UI updates
  emitMockSwapEvent(tokenIn, tokenOut, amountIn, amountOut) {
    // Simulate contract event emission
    const mockEvent = {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      timestamp: Date.now()
    };
    
    // Dispatch custom event for UI to catch
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mockSwap', { detail: mockEvent }));
    }
  }
  
  formatContractError(error) { if (error?.reason) return error.reason; if (error?.data?.message) return error.data.message; if (error?.message) { const msg = error.message; if (msg.includes('user rejected transaction')) return 'Transaction was rejected by user'; if (msg.includes('insufficient funds')) return 'Insufficient funds for transaction'; if (msg.includes('gas')) return 'Transaction failed due to gas issues'; return msg; } return 'Unknown contract error occurred'; }
}

export const secureContractService = new SecureContractService();
export { SUPPORTED_TOKENS };