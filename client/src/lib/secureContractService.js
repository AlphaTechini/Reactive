// Migrated secureContractService.js
import { ethers } from 'ethers';
import { get } from 'svelte/store';
import { appMode } from '$lib/stores/appMode.js';
import { walletService } from '$lib/stores/wallet.js';
import { rpcProvider } from '$lib/stores/wallet.js';
import { SWAP_ROUTER_ADDRESS } from '$lib/config/network.js';

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

// Minimal ERC20 ABI fragment for allowance/approval & metadata
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)'
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
      // If wallet is connected and provides an injected provider, use it for read-write
      if (wallet && wallet.isConnected && wallet.provider) {
        try {
          this.provider = new ethers.BrowserProvider(wallet.provider);
          this.signer = this.provider.getSigner();
          this.contract = new ethers.Contract(CONTRACT_ADDRESS, ENHANCED_PORTFOLIO_MANAGER_ABI, this.signer);
        } catch (e) {
          console.warn('Injected provider invalid for BrowserProvider, falling back to read-only RPC:', e);
        }
      }

      // If no interactive provider available, fall back to read-only RPC provider
      if (!this.contract) {
        let rpcVal = null;
        rpcProvider.subscribe(v => rpcVal = v)();
        if (!rpcVal) throw new Error('No available RPC provider for secure contract service');
        this.provider = rpcVal;
        this.signer = null;
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, ENHANCED_PORTFOLIO_MANAGER_ABI, this.provider);
      }
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
    const mode = get(appMode);
    if (mode === 'live') {
      // Real live-mode implementation
      try {
        if (!amountIn) throw new Error('Amount is required');
        // Normalize user input (can be string/number)
        const tokenInMeta = this.getTokenByAddress(tokenInAddress);
        const tokenOutMeta = this.getTokenByAddress(tokenOutAddress);
        if (!tokenInMeta || !tokenOutMeta) throw new Error('Unknown token selection');

        // Parse to raw units respecting decimals
        const rawAmountIn = typeof amountIn === 'string' ? ethers.parseUnits(amountIn, tokenInMeta.decimals) : ethers.parseUnits(String(amountIn), tokenInMeta.decimals);

        // Fetch on-chain stored prices (18 decimals) for rough quote
        let priceIn, priceOut;
        try { priceIn = await this.contract.getTokenPrice(tokenInAddress); } catch { priceIn = 0n; }
        try { priceOut = await this.contract.getTokenPrice(tokenOutAddress); } catch { priceOut = 0n; }

        const quote = this._estimateMinAmountOut(rawAmountIn, priceIn, priceOut, tokenInMeta.decimals, tokenOutMeta.decimals, slippagePercent);
        const { expectedOut, minAmountOut } = quote;

        // Try to use a router if configured (Uniswap-like). Otherwise fall back to contract.executeSwap
        const owner = await this.signer.getAddress();
        const erc20 = new ethers.Contract(tokenInAddress, ERC20_ABI, this.signer);

        // Helper: attempt router-based swap (MockSwapRouter or real Uniswap router)
        const tryRouterSwap = async () => {
          if (!SWAP_ROUTER_ADDRESS) return null;
          try {
            // Define router contract with both MockSwapRouter and Uniswap methods
            const router = new ethers.Contract(SWAP_ROUTER_ADDRESS, [
              // MockSwapRouter methods
              'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)',
              'function setRate(address tokenIn, address tokenOut, uint256 rate) external',
              'function getRate(address tokenIn, address tokenOut) view returns (uint256)',
              // Uniswap V3 method (fallback)
              'function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160) params) payable returns (uint256 amountOut)'
            ], this.signer);

            // Approve router if needed
            const allowance = await erc20.allowance(owner, SWAP_ROUTER_ADDRESS);
            if (allowance < rawAmountIn) {
              const approveTx = await erc20.approve(SWAP_ROUTER_ADDRESS, rawAmountIn);
              await approveTx.wait();
            }

            const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 5);
            
            // Try MockSwapRouter first (works for both mock and real Uniswap V2 routers)
            try {
              const path = [tokenInAddress, tokenOutAddress];
              const tx = await router.swapExactTokensForTokens(rawAmountIn, minAmountOut, path, owner, deadline);
              const receipt = await tx.wait();
              console.log('✅ Router swap transaction completed:', receipt.hash);
              return { type: 'router', tx, receipt };
            } catch (e) {
              console.warn('V2-style swap failed, trying V3:', e);
              // Try Uniswap V3 exactInputSingle as fallback
              try {
                const fee = tokenInMeta.poolFee || 3000; // default 0.3%
                const sqrtPriceLimitX96 = 0;
                const paramsStruct = [tokenInAddress, tokenOutAddress, fee, owner, deadline, rawAmountIn, minAmountOut, sqrtPriceLimitX96];
                const tx = await router.exactInputSingle(paramsStruct, { value: 0 });
                const receipt = await tx.wait();
                return { type: 'v3', tx, receipt };
              } catch (e2) {
                console.warn('All router swap attempts failed:', e, e2);
                return null;
              }
            }
          } catch (e) {
            console.warn('Router not usable or call failed:', e);
            return null;
          }
        };

        const routerReceipt = await tryRouterSwap();
        if (routerReceipt) {
          console.log('✅ Router swap succeeded', routerReceipt);
          return routerReceipt.receipt || routerReceipt.tx; // Return the transaction receipt
        }

        // Fall back to external contract swap call (portfolio manager executes swap logic)
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 5); // 5 minutes
        const params = {
          tokenIn: tokenInAddress,
          tokenOut: tokenOutAddress,
          amountIn: rawAmountIn,
          minAmountOut: minAmountOut,
          deadline: deadline
        };

        console.log('🚀 Executing live swap via manager contract', {
          tokenIn: tokenInMeta.symbol,
          tokenOut: tokenOutMeta.symbol,
          amountIn: amountIn.toString(),
          rawAmountIn: rawAmountIn.toString(),
          expectedOut: expectedOut.toString(),
          minAmountOut: minAmountOut.toString(),
          slippagePercent
        });

        const tx = await this.contract.executeSwap(params);
        const receipt = await tx.wait();
        console.log('✅ Swap transaction mined', receipt.transactionHash || receipt.hash || tx.hash);
        return receipt;
      } catch (e) {
        console.error('Live swap failed:', e);
        throw e;
      }
    } else {
      // Simulation mode (existing mock logic)
      try {
        console.log(`🔄 Mock swap: ${amountIn} tokens from ${tokenInAddress} to ${tokenOutAddress}`);
        const prices = await this.getMockPrices();
        const tokenInPrice = prices[tokenInAddress]?.current || 1;
        const tokenOutPrice = prices[tokenOutAddress]?.current || 1;
        const expectedOut = (amountIn * tokenInPrice) / tokenOutPrice;
        const actualOut = expectedOut * (1 - slippagePercent / 100);
        const mockTx = { hash: `0x${Math.random().toString(16).substr(2, 64)}`, from: await this.signer.getAddress(), to: CONTRACT_ADDRESS, value: "0", gasUsed: ethers.parseUnits("21000", "wei"), status: 1, wait: async () => ({ transactionHash: this.hash, gasUsed: ethers.parseUnits("21000", "wei"), status: 1 }) };
        console.log(`✅ Mock swap completed: ${actualOut.toFixed(6)} tokens received`);
        this.emitMockSwapEvent(tokenInAddress, tokenOutAddress, amountIn, actualOut);
        return mockTx;
      } catch (e) { console.error('Failed to execute mock swap:', e); throw e; }
    }
  }

  // Get mock token price from webhook service
  async getTokenPrice(tokenAddress) {
    const mode = get(appMode);
    try {
      if (mode === 'simulation') {
        const prices = await this.getMockPrices();
        const priceData = prices[tokenAddress];
        if (priceData) return priceData.current;
      }
      if (!this.contract) await this.initialize();
      const price = await this.contract.getTokenPrice(tokenAddress);
      return parseFloat(ethers.formatEther(price));
    } catch (e) { console.error('Failed to get token price:', e); return 0; }
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

  // Internal helper: derive expected & min amountOut using stored prices (both 18-decimals precision)
  _estimateMinAmountOut(rawAmountIn, priceIn, priceOut, decimalsIn, decimalsOut, slippagePercent) {
    // If prices unavailable, fallback to minAmountOut = 1 to avoid revert but warn
    if (!priceIn || !priceOut || priceIn === 0n || priceOut === 0n) {
      console.warn('⚠️ Price data missing; using minimal minAmountOut=1');
      return { expectedOut: 0n, minAmountOut: 1n };
    }
    // expectedOutRaw = amountIn * priceIn * 10^{decOut} / (priceOut * 10^{decIn})
    const ten = 10n;
    const decAdjFactor = ten ** BigInt(decimalsOut);
    const decDivisor = ten ** BigInt(decimalsIn);
    const expectedOut = (rawAmountIn * priceIn * decAdjFactor) / (priceOut * decDivisor);
    // Apply slippage
    const slipFactor = BigInt(Math.max(0, 100 - slippagePercent)); // percent integer
    const minAmountOut = (expectedOut * slipFactor) / 100n;
    return { expectedOut, minAmountOut: minAmountOut > 0n ? minAmountOut : 1n };
  }
  
  formatContractError(error) { if (error?.reason) return error.reason; if (error?.data?.message) return error.data.message; if (error?.message) { const msg = error.message; if (msg.includes('user rejected transaction')) return 'Transaction was rejected by user'; if (msg.includes('insufficient funds')) return 'Insufficient funds for transaction'; if (msg.includes('gas')) return 'Transaction failed due to gas issues'; return msg; } return 'Unknown contract error occurred'; }
}

export const secureContractService = new SecureContractService();
export { SUPPORTED_TOKENS };