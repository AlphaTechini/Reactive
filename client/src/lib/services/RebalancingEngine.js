/**
 * Intelligent Rebalancing Engine
 * 
 * Implements drift detection, trade optimization, and gas-aware rebalancing
 * as specified in requirements 2.1, 2.2, 2.3
 */

import { writable } from 'svelte/store';
import { enhancedPriceDisplayService } from './EnhancedPriceDisplayService.js';
import { PercentageCalculator } from '../utils/PercentageCalculator.js';

// Rebalancing constants
const DEFAULT_DRIFT_THRESHOLD = 0.05; // 5% drift threshold
const MIN_TRADE_VALUE_USD = 10; // Minimum trade value in USD
const MAX_GAS_PERCENT = 0.02; // Maximum 2% of trade value for gas
const SLIPPAGE_TOLERANCE = 0.005; // 0.5% slippage tolerance
const REBALANCING_COOLDOWN = 300000; // 5 minutes cooldown between rebalances

// Reactive stores for rebalancing state
export const rebalancingStateStore = writable({
  isActive: false,
  currentOperation: null,
  progress: 0,
  lastRebalance: null,
  deferredReason: null
});

export const rebalancingAnalysisStore = writable({
  driftAnalysis: null,
  tradeOptimization: null,
  gasEstimation: null,
  recommendations: []
});

class RebalancingEngine {
  constructor() {
    this.isInitialized = false;
    this.activeRebalancing = null;
    this.rebalancingHistory = [];
    this.driftThreshold = DEFAULT_DRIFT_THRESHOLD;
    this.maxGasPercent = MAX_GAS_PERCENT;
    this.minTradeValue = MIN_TRADE_VALUE_USD;
    this.slippageTolerance = SLIPPAGE_TOLERANCE;
    this.cooldownPeriod = REBALANCING_COOLDOWN;
    
    // State management
    this.state = {
      isActive: false,
      currentOperation: null,
      progress: 0,
      lastRebalance: null,
      deferredReason: null
    };
    
    // Analysis cache
    this.analysisCache = new Map();
    this.gasPriceCache = { price: null, timestamp: null, ttl: 60000 }; // 1 minute TTL
  }

  /**
   * Initialize the rebalancing engine
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('🔄 Rebalancing engine already initialized');
      return;
    }

    console.log('🚀 Initializing Rebalancing Engine...');
    
    try {
      // Set configuration options
      this.driftThreshold = options.driftThreshold || DEFAULT_DRIFT_THRESHOLD;
      this.maxGasPercent = options.maxGasPercent || MAX_GAS_PERCENT;
      this.minTradeValue = options.minTradeValue || MIN_TRADE_VALUE_USD;
      this.slippageTolerance = options.slippageTolerance || SLIPPAGE_TOLERANCE;
      this.cooldownPeriod = options.cooldownPeriod || REBALANCING_COOLDOWN;
      
      // Ensure price service is initialized
      if (!enhancedPriceDisplayService.isInitialized) {
        await enhancedPriceDisplayService.initialize();
      }
      
      this.isInitialized = true;
      console.log('✅ Rebalancing Engine initialized successfully');
      
      // Update state store
      this.updateStateStore();
      
    } catch (error) {
      console.error('❌ Failed to initialize Rebalancing Engine:', error);
      throw error;
    }
  }

  /**
   * Analyze portfolio drift and determine if rebalancing is needed
   * Implements requirement 2.1 - drift threshold detection logic
   */
  analyzeDrift(currentAllocations, targetAllocations) {
    console.log('📊 Analyzing portfolio drift...');
    
    if (!currentAllocations || !targetAllocations) {
      throw new Error('Current and target allocations are required');
    }

    // Validate allocations sum to 100%
    const currentSum = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);
    const targetSum = Object.values(targetAllocations).reduce((sum, val) => sum + val, 0);
    
    if (Math.abs(currentSum - 1.0) > 0.001 || Math.abs(targetSum - 1.0) > 0.001) {
      throw new Error('Allocations must sum to 100% (1.0)');
    }

    const driftAnalysis = {
      tokens: {},
      totalDrift: 0,
      maxDrift: 0,
      needsRebalancing: false,
      driftThreshold: this.driftThreshold,
      timestamp: Date.now()
    };

    // Calculate drift for each token
    for (const [tokenAddress, targetPercent] of Object.entries(targetAllocations)) {
      const currentPercent = currentAllocations[tokenAddress] || 0;
      const drift = Math.abs(currentPercent - targetPercent);
      const driftPercent = drift / targetPercent; // Relative drift
      
      driftAnalysis.tokens[tokenAddress] = {
        current: currentPercent,
        target: targetPercent,
        drift: drift,
        driftPercent: driftPercent,
        needsRebalancing: driftPercent > this.driftThreshold
      };
      
      driftAnalysis.totalDrift += drift;
      driftAnalysis.maxDrift = Math.max(driftAnalysis.maxDrift, driftPercent);
    }

    // Determine if rebalancing is needed
    driftAnalysis.needsRebalancing = driftAnalysis.maxDrift > this.driftThreshold;
    
    console.log(`📈 Drift analysis complete - Max drift: ${(driftAnalysis.maxDrift * 100).toFixed(2)}%, Needs rebalancing: ${driftAnalysis.needsRebalancing}`);
    
    // Cache analysis
    const cacheKey = this.generateAnalysisCacheKey(currentAllocations, targetAllocations);
    this.analysisCache.set(cacheKey, driftAnalysis);
    
    // Update analysis store
    rebalancingAnalysisStore.update(state => ({
      ...state,
      driftAnalysis
    }));
    
    return driftAnalysis;
  }

  /**
   * Calculate optimal rebalancing trades to minimize transaction count
   * Implements requirement 2.2 - trade optimization algorithm
   */
  calculateOptimalTrades(currentHoldings, targetAllocations, totalPortfolioValue) {
    console.log('🔧 Calculating optimal rebalancing trades...');
    
    if (!currentHoldings || !targetAllocations || !totalPortfolioValue) {
      throw new Error('Current holdings, target allocations, and portfolio value are required');
    }

    const trades = [];
    const sellOrders = [];
    const buyOrders = [];
    
    // Get current prices for all tokens
    const prices = {};
    for (const tokenAddress of Object.keys(targetAllocations)) {
      const priceData = enhancedPriceDisplayService.getPrice(tokenAddress);
      if (!priceData) {
        throw new Error(`Price data not available for token: ${tokenAddress}`);
      }
      prices[tokenAddress] = priceData.price;
    }

    // Calculate target values and required trades
    for (const [tokenAddress, targetPercent] of Object.entries(targetAllocations)) {
      const currentBalance = currentHoldings[tokenAddress] || 0;
      const currentValue = currentBalance * prices[tokenAddress];
      const targetValue = totalPortfolioValue * targetPercent;
      const difference = targetValue - currentValue;
      
      if (Math.abs(difference) < this.minTradeValue) {
        // Skip trades below minimum threshold
        continue;
      }
      
      const trade = {
        tokenAddress,
        currentBalance,
        currentValue,
        targetValue,
        difference,
        price: prices[tokenAddress],
        type: difference > 0 ? 'buy' : 'sell',
        amount: Math.abs(difference) / prices[tokenAddress],
        valueUSD: Math.abs(difference)
      };
      
      if (trade.type === 'sell') {
        sellOrders.push(trade);
      } else {
        buyOrders.push(trade);
      }
      
      trades.push(trade);
    }

    // Optimize trade execution order
    const optimizedTrades = this.optimizeTradeExecution(sellOrders, buyOrders);
    
    const tradeOptimization = {
      totalTrades: optimizedTrades.length,
      totalValueToTrade: optimizedTrades.reduce((sum, trade) => sum + trade.valueUSD, 0),
      sellOrders: sellOrders.length,
      buyOrders: buyOrders.length,
      executionPlan: optimizedTrades,
      estimatedSlippage: this.estimateSlippage(optimizedTrades),
      timestamp: Date.now()
    };
    
    console.log(`⚡ Trade optimization complete - ${optimizedTrades.length} trades, $${tradeOptimization.totalValueToTrade.toFixed(2)} total value`);
    
    // Update analysis store
    rebalancingAnalysisStore.update(state => ({
      ...state,
      tradeOptimization
    }));
    
    return tradeOptimization;
  }

  /**
   * Optimize trade execution order to minimize slippage and gas costs
   */
  optimizeTradeExecution(sellOrders, buyOrders) {
    // Sort sell orders by value (largest first to provide liquidity)
    const sortedSells = sellOrders.sort((a, b) => b.valueUSD - a.valueUSD);
    
    // Sort buy orders by value (smallest first to minimize market impact)
    const sortedBuys = buyOrders.sort((a, b) => a.valueUSD - b.valueUSD);
    
    // Interleave sells and buys to maintain liquidity balance
    const optimizedTrades = [];
    const maxLength = Math.max(sortedSells.length, sortedBuys.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < sortedSells.length) {
        optimizedTrades.push({
          ...sortedSells[i],
          executionOrder: optimizedTrades.length + 1,
          estimatedGas: this.estimateTradeGas(sortedSells[i])
        });
      }
      
      if (i < sortedBuys.length) {
        optimizedTrades.push({
          ...sortedBuys[i],
          executionOrder: optimizedTrades.length + 1,
          estimatedGas: this.estimateTradeGas(sortedBuys[i])
        });
      }
    }
    
    return optimizedTrades;
  }

  /**
   * Estimate slippage for trade execution
   */
  estimateSlippage(trades) {
    // Simple slippage estimation based on trade size
    // In production, this would use DEX liquidity data
    let totalSlippage = 0;
    
    for (const trade of trades) {
      // Estimate slippage based on trade size (larger trades = more slippage)
      const baseSlippage = this.slippageTolerance;
      const sizeMultiplier = Math.min(trade.valueUSD / 10000, 2); // Cap at 2x for very large trades
      const estimatedSlippage = baseSlippage * (1 + sizeMultiplier);
      
      trade.estimatedSlippage = estimatedSlippage;
      totalSlippage += estimatedSlippage * trade.valueUSD;
    }
    
    return totalSlippage / trades.reduce((sum, trade) => sum + trade.valueUSD, 0);
  }

  /**
   * Estimate gas cost for a single trade
   */
  estimateTradeGas(trade) {
    // Base gas estimates for different trade types
    const baseGasEstimates = {
      'sell': 150000, // ERC20 transfer + DEX swap
      'buy': 180000   // ETH/stablecoin to token swap
    };
    
    const baseGas = baseGasEstimates[trade.type] || 150000;
    
    // Add complexity multiplier for larger trades
    const complexityMultiplier = Math.min(1 + (trade.valueUSD / 50000), 1.5);
    
    return Math.floor(baseGas * complexityMultiplier);
  }

  /**
   * Estimate gas costs for rebalancing trades
   * Implements requirement 2.3 - gas estimation functions
   */
  async estimateGasCosts(trades) {
    console.log('⛽ Estimating gas costs for rebalancing trades...');
    
    if (!trades || trades.length === 0) {
      return {
        totalGasEstimate: 0,
        totalGasCostUSD: 0,
        gasPrice: 0,
        trades: [],
        timestamp: Date.now()
      };
    }

    // Get current gas price
    const gasPrice = await this.getCurrentGasPrice();
    const gasPriceGwei = gasPrice / 1e9; // Convert to Gwei for display
    
    let totalGasEstimate = 0;
    const tradesWithGas = [];
    
    // Estimate gas for each trade
    for (const trade of trades) {
      const gasEstimate = this.estimateTradeGas(trade);
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostETH = gasCostWei / 1e18;
      
      // Get ETH price to convert to USD
      const ethPriceData = enhancedPriceDisplayService.getPrice('ETH') || 
                          enhancedPriceDisplayService.getPrice('0x0000000000000000000000000000000000000000'); // Fallback ETH address
      const ethPriceUSD = ethPriceData ? ethPriceData.price : 2000; // Fallback ETH price
      
      const gasCostUSD = gasCostETH * ethPriceUSD;
      const gasPercentOfTrade = (gasCostUSD / trade.valueUSD) * 100;
      
      const tradeWithGas = {
        ...trade,
        gasEstimate,
        gasCostWei,
        gasCostETH,
        gasCostUSD,
        gasPercentOfTrade,
        isGasEfficient: gasPercentOfTrade <= (this.maxGasPercent * 100)
      };
      
      tradesWithGas.push(tradeWithGas);
      totalGasEstimate += gasEstimate;
    }
    
    const totalGasCostWei = totalGasEstimate * gasPrice;
    const totalGasCostETH = totalGasCostWei / 1e18;
    const totalGasCostUSD = totalGasCostETH * (ethPriceData ? ethPriceData.price : 2000);
    
    const gasEstimation = {
      totalGasEstimate,
      totalGasCostWei,
      totalGasCostETH,
      totalGasCostUSD,
      gasPrice,
      gasPriceGwei,
      trades: tradesWithGas,
      averageGasPerTrade: totalGasEstimate / trades.length,
      timestamp: Date.now()
    };
    
    console.log(`⛽ Gas estimation complete - Total: ${totalGasEstimate.toLocaleString()} gas, $${totalGasCostUSD.toFixed(2)} USD`);
    
    // Update analysis store
    rebalancingAnalysisStore.update(state => ({
      ...state,
      gasEstimation
    }));
    
    return gasEstimation;
  }

  /**
   * Get current gas price with caching
   */
  async getCurrentGasPrice() {
    // Check cache first
    if (this.gasPriceCache.price && 
        this.gasPriceCache.timestamp && 
        (Date.now() - this.gasPriceCache.timestamp) < this.gasPriceCache.ttl) {
      return this.gasPriceCache.price;
    }
    
    try {
      // Try to get gas price from provider
      const provider = enhancedPriceDisplayService.provider || 
                      (await import('../stores/wallet.js')).rpcProvider?.subscribe ? null : null;
      
      if (provider && provider.getFeeData) {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt(20e9); // 20 Gwei fallback
        
        this.gasPriceCache = {
          price: Number(gasPrice),
          timestamp: Date.now(),
          ttl: 60000 // 1 minute cache
        };
        
        return this.gasPriceCache.price;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch gas price from provider:', error.message);
    }
    
    // Fallback to estimated gas price
    const fallbackGasPrice = 20e9; // 20 Gwei in wei
    this.gasPriceCache = {
      price: fallbackGasPrice,
      timestamp: Date.now(),
      ttl: 60000
    };
    
    return fallbackGasPrice;
  }

  /**
   * Check if rebalancing should be deferred due to high gas costs
   * Implements requirement 2.3 - defer rebalancing when gas costs exceed 2%
   */
  shouldDeferRebalancing(gasEstimation, totalTradeValue) {
    if (!gasEstimation || !totalTradeValue) {
      return { shouldDefer: false, reason: null };
    }
    
    const gasPercentOfTotal = (gasEstimation.totalGasCostUSD / totalTradeValue) * 100;
    const maxGasPercentThreshold = this.maxGasPercent * 100;
    
    if (gasPercentOfTotal > maxGasPercentThreshold) {
      return {
        shouldDefer: true,
        reason: `Gas costs too high: ${gasPercentOfTotal.toFixed(2)}% of trade value (max: ${maxGasPercentThreshold.toFixed(2)}%)`,
        gasPercent: gasPercentOfTotal,
        gasCostUSD: gasEstimation.totalGasCostUSD,
        threshold: maxGasPercentThreshold
      };
    }
    
    return { shouldDefer: false, reason: null };
  }

  /**
   * Optimize trades for gas efficiency by batching
   * Implements requirement 2.3 - trade batching for gas efficiency
   */
  optimizeTradesForGas(trades, gasEstimation) {
    console.log('⚡ Optimizing trades for gas efficiency...');
    
    if (!trades || trades.length === 0) {
      return { batches: [], gasOptimization: null };
    }
    
    // Separate efficient and inefficient trades
    const efficientTrades = [];
    const inefficientTrades = [];
    
    for (const trade of gasEstimation.trades) {
      if (trade.isGasEfficient) {
        efficientTrades.push(trade);
      } else {
        inefficientTrades.push(trade);
      }
    }
    
    // Create batches to optimize gas usage
    const batches = this.createTradeBatches(efficientTrades, inefficientTrades);
    
    // Calculate gas savings from batching
    const originalGas = gasEstimation.totalGasEstimate;
    const batchedGas = batches.reduce((total, batch) => total + batch.estimatedGas, 0);
    const gasSavings = originalGas - batchedGas;
    const gasSavingsPercent = (gasSavings / originalGas) * 100;
    
    const gasOptimization = {
      originalGas,
      batchedGas,
      gasSavings,
      gasSavingsPercent,
      batchCount: batches.length,
      efficientTradesCount: efficientTrades.length,
      inefficientTradesCount: inefficientTrades.length,
      timestamp: Date.now()
    };
    
    console.log(`⚡ Gas optimization complete - ${batches.length} batches, ${gasSavingsPercent.toFixed(2)}% gas savings`);
    
    return { batches, gasOptimization };
  }

  /**
   * Create optimized trade batches
   */
  createTradeBatches(efficientTrades, inefficientTrades) {
    const batches = [];
    const maxTradesPerBatch = 5; // Limit trades per batch to avoid gas limit issues
    
    // Batch efficient trades first
    if (efficientTrades.length > 0) {
      for (let i = 0; i < efficientTrades.length; i += maxTradesPerBatch) {
        const batchTrades = efficientTrades.slice(i, i + maxTradesPerBatch);
        const batch = this.createBatch(batchTrades, 'efficient');
        batches.push(batch);
      }
    }
    
    // Handle inefficient trades - try to combine small ones or defer large ones
    if (inefficientTrades.length > 0) {
      const smallInefficient = inefficientTrades.filter(trade => trade.valueUSD < 1000);
      const largeInefficient = inefficientTrades.filter(trade => trade.valueUSD >= 1000);
      
      // Batch small inefficient trades together
      if (smallInefficient.length > 0) {
        for (let i = 0; i < smallInefficient.length; i += maxTradesPerBatch) {
          const batchTrades = smallInefficient.slice(i, i + maxTradesPerBatch);
          const batch = this.createBatch(batchTrades, 'small_inefficient');
          batches.push(batch);
        }
      }
      
      // Create individual batches for large inefficient trades with warnings
      for (const trade of largeInefficient) {
        const batch = this.createBatch([trade], 'large_inefficient');
        batch.warning = `High gas cost: ${trade.gasPercentOfTrade.toFixed(2)}% of trade value`;
        batches.push(batch);
      }
    }
    
    return batches;
  }

  /**
   * Create a single trade batch
   */
  createBatch(trades, type) {
    const totalValue = trades.reduce((sum, trade) => sum + trade.valueUSD, 0);
    const totalGas = trades.reduce((sum, trade) => sum + trade.gasEstimate, 0);
    const totalGasCost = trades.reduce((sum, trade) => sum + trade.gasCostUSD, 0);
    
    // Estimate batch gas savings (batching typically saves 10-20% gas)
    const batchGasSavings = type === 'efficient' ? totalGas * 0.15 : totalGas * 0.1;
    const estimatedGas = Math.max(totalGas - batchGasSavings, totalGas * 0.8);
    
    return {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      trades,
      tradeCount: trades.length,
      totalValue,
      totalGas,
      estimatedGas,
      totalGasCost,
      estimatedGasCost: totalGasCost * (estimatedGas / totalGas),
      gasEfficiency: totalGasCost / totalValue,
      priority: this.calculateBatchPriority(trades, type),
      canExecute: type !== 'large_inefficient' || totalValue > 5000, // Only execute large inefficient if significant value
      timestamp: Date.now()
    };
  }

  /**
   * Calculate batch execution priority
   */
  calculateBatchPriority(trades, type) {
    const baseScore = {
      'efficient': 100,
      'small_inefficient': 50,
      'large_inefficient': 25
    }[type] || 0;
    
    // Adjust priority based on trade characteristics
    const totalValue = trades.reduce((sum, trade) => sum + trade.valueUSD, 0);
    const avgDrift = trades.reduce((sum, trade) => sum + (trade.driftPercent || 0), 0) / trades.length;
    
    // Higher value and higher drift = higher priority
    const valueScore = Math.min(totalValue / 1000, 50); // Cap at 50 points
    const driftScore = Math.min(avgDrift * 1000, 50); // Cap at 50 points
    
    return Math.round(baseScore + valueScore + driftScore);
  }

  /**
   * Validate rebalancing conditions before execution
   */
  async validateRebalancingConditions(trades) {
    console.log('✅ Validating rebalancing conditions...');
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      canProceed: false,
      timestamp: Date.now()
    };

    // Check if rebalancing is already active
    if (this.state.isActive) {
      validation.errors.push('Rebalancing operation already in progress');
      validation.isValid = false;
    }

    // Check cooldown period
    if (this.state.lastRebalance) {
      const timeSinceLastRebalance = Date.now() - this.state.lastRebalance;
      if (timeSinceLastRebalance < this.cooldownPeriod) {
        const remainingCooldown = Math.ceil((this.cooldownPeriod - timeSinceLastRebalance) / 1000);
        validation.errors.push(`Rebalancing cooldown active. ${remainingCooldown}s remaining`);
        validation.isValid = false;
      }
    }

    // Validate trade parameters
    if (!trades || trades.length === 0) {
      validation.errors.push('No trades to execute');
      validation.isValid = false;
    }

    // Check minimum trade values
    const belowMinimum = trades.filter(trade => trade.valueUSD < this.minTradeValue);
    if (belowMinimum.length > 0) {
      validation.warnings.push(`${belowMinimum.length} trades below minimum value threshold`);
    }

    // Validate price data freshness
    for (const trade of trades) {
      if (enhancedPriceDisplayService.isPriceStale(trade.tokenAddress)) {
        validation.warnings.push(`Stale price data for token: ${trade.tokenAddress}`);
      }
    }

    // Check for sufficient balance (simplified check)
    const sellTrades = trades.filter(trade => trade.type === 'sell');
    for (const trade of sellTrades) {
      if (trade.amount > trade.currentBalance) {
        validation.errors.push(`Insufficient balance for ${trade.tokenAddress}: need ${trade.amount}, have ${trade.currentBalance}`);
        validation.isValid = false;
      }
    }

    validation.canProceed = validation.isValid && validation.errors.length === 0;
    
    console.log(`✅ Validation complete - Can proceed: ${validation.canProceed}, Errors: ${validation.errors.length}, Warnings: ${validation.warnings.length}`);
    
    return validation;
  }

  /**
   * Get drift analysis for current vs target allocations
   */
  getDriftAnalysis(currentAllocations, targetAllocations) {
    // Check cache first
    const cacheKey = this.generateAnalysisCacheKey(currentAllocations, targetAllocations);
    const cached = this.analysisCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < 30000) { // 30 second cache
      return cached;
    }
    
    // Calculate fresh analysis
    return this.analyzeDrift(currentAllocations, targetAllocations);
  }

  /**
   * Generate cache key for analysis results
   */
  generateAnalysisCacheKey(currentAllocations, targetAllocations) {
    const current = JSON.stringify(currentAllocations);
    const target = JSON.stringify(targetAllocations);
    return `${current}|${target}`;
  }

  /**
   * Update the reactive state store
   */
  updateStateStore() {
    rebalancingStateStore.set(this.state);
  }

  /**
   * Set rebalancing configuration
   */
  setConfiguration(config) {
    if (config.driftThreshold !== undefined) {
      this.driftThreshold = Math.max(0.001, Math.min(0.5, config.driftThreshold)); // 0.1% to 50%
    }
    
    if (config.maxGasPercent !== undefined) {
      this.maxGasPercent = Math.max(0.001, Math.min(0.1, config.maxGasPercent)); // 0.1% to 10%
    }
    
    if (config.minTradeValue !== undefined) {
      this.minTradeValue = Math.max(1, config.minTradeValue); // Minimum $1
    }
    
    if (config.slippageTolerance !== undefined) {
      this.slippageTolerance = Math.max(0.001, Math.min(0.05, config.slippageTolerance)); // 0.1% to 5%
    }
    
    if (config.cooldownPeriod !== undefined) {
      this.cooldownPeriod = Math.max(60000, config.cooldownPeriod); // Minimum 1 minute
    }
    
    console.log('⚙️ Rebalancing configuration updated:', {
      driftThreshold: this.driftThreshold,
      maxGasPercent: this.maxGasPercent,
      minTradeValue: this.minTradeValue,
      slippageTolerance: this.slippageTolerance,
      cooldownPeriod: this.cooldownPeriod
    });
  }

  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      driftThreshold: this.driftThreshold,
      maxGasPercent: this.maxGasPercent,
      minTradeValue: this.minTradeValue,
      slippageTolerance: this.slippageTolerance,
      cooldownPeriod: this.cooldownPeriod,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Get rebalancing history
   */
  getRebalancingHistory() {
    return [...this.rebalancingHistory];
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    this.gasPriceCache = { price: null, timestamp: null, ttl: 60000 };
    console.log('🧹 Rebalancing engine cache cleared');
  }

  /**
   * Execute rebalancing with proper error handling and state management
   * Implements requirement 2.4, 2.5 - rebalancing execution and reporting
   */
  async executeRebalancing(trades, options = {}) {
    console.log('🚀 Starting rebalancing execution...');
    
    if (this.state.isActive) {
      throw new Error('Rebalancing operation already in progress');
    }
    
    // Validate conditions first
    const validation = await this.validateRebalancingConditions(trades);
    if (!validation.canProceed) {
      throw new Error(`Rebalancing validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Estimate gas costs
    const gasEstimation = await this.estimateGasCosts(trades);
    const totalTradeValue = trades.reduce((sum, trade) => sum + trade.valueUSD, 0);
    
    // Check if should defer due to gas costs
    const deferCheck = this.shouldDeferRebalancing(gasEstimation, totalTradeValue);
    if (deferCheck.shouldDefer && !options.forceExecute) {
      this.state.deferredReason = deferCheck.reason;
      this.updateStateStore();
      
      const deferralReport = {
        status: 'deferred',
        reason: deferCheck.reason,
        gasPercent: deferCheck.gasPercent,
        gasCostUSD: deferCheck.gasCostUSD,
        threshold: deferCheck.threshold,
        timestamp: Date.now()
      };
      
      console.log(`⏸️ Rebalancing deferred: ${deferCheck.reason}`);
      return deferralReport;
    }
    
    // Optimize trades for gas efficiency
    const { batches, gasOptimization } = this.optimizeTradesForGas(trades, gasEstimation);
    
    // Set active state
    this.state.isActive = true;
    this.state.currentOperation = 'executing';
    this.state.progress = 0;
    this.state.deferredReason = null;
    this.updateStateStore();
    
    const executionReport = {
      id: `rebalance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'in_progress',
      startTime: Date.now(),
      endTime: null,
      totalTrades: trades.length,
      totalBatches: batches.length,
      totalValue: totalTradeValue,
      gasEstimation,
      gasOptimization,
      batches: [],
      executedTrades: [],
      failedTrades: [],
      errors: [],
      warnings: validation.warnings || [],
      summary: null
    };
    
    try {
      // Execute batches sequentially
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        console.log(`📦 Executing batch ${i + 1}/${batches.length} (${batch.tradeCount} trades)`);
        
        this.state.currentOperation = `batch_${i + 1}`;
        this.state.progress = (i / batches.length) * 100;
        this.updateStateStore();
        
        const batchResult = await this.executeBatch(batch, options);
        executionReport.batches.push(batchResult);
        
        // Aggregate results
        executionReport.executedTrades.push(...batchResult.executedTrades);
        executionReport.failedTrades.push(...batchResult.failedTrades);
        executionReport.errors.push(...batchResult.errors);
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await this.delay(2000); // 2 second delay
        }
      }
      
      // Complete execution
      executionReport.status = executionReport.failedTrades.length === 0 ? 'completed' : 'partial';
      executionReport.endTime = Date.now();
      executionReport.duration = executionReport.endTime - executionReport.startTime;
      
      // Generate execution summary
      executionReport.summary = this.generateExecutionSummary(executionReport);
      
      // Update state
      this.state.isActive = false;
      this.state.currentOperation = null;
      this.state.progress = 100;
      this.state.lastRebalance = Date.now();
      this.updateStateStore();
      
      // Add to history
      this.rebalancingHistory.push(executionReport);
      
      console.log(`✅ Rebalancing execution ${executionReport.status}: ${executionReport.executedTrades.length}/${executionReport.totalTrades} trades successful`);
      
      return executionReport;
      
    } catch (error) {
      console.error('❌ Rebalancing execution failed:', error);
      
      // Update error state
      executionReport.status = 'failed';
      executionReport.endTime = Date.now();
      executionReport.duration = executionReport.endTime - executionReport.startTime;
      executionReport.errors.push({
        type: 'execution_error',
        message: error.message,
        timestamp: Date.now()
      });
      
      this.state.isActive = false;
      this.state.currentOperation = null;
      this.state.progress = 0;
      this.updateStateStore();
      
      // Add failed execution to history
      this.rebalancingHistory.push(executionReport);
      
      throw error;
    }
  }

  /**
   * Execute a single batch of trades
   */
  async executeBatch(batch, options = {}) {
    console.log(`📦 Executing batch: ${batch.id} (${batch.tradeCount} trades)`);
    
    const batchResult = {
      batchId: batch.id,
      batchType: batch.type,
      startTime: Date.now(),
      endTime: null,
      executedTrades: [],
      failedTrades: [],
      errors: [],
      gasUsed: 0,
      actualGasCost: 0,
      status: 'in_progress'
    };
    
    try {
      // Execute trades in the batch
      for (let i = 0; i < batch.trades.length; i++) {
        const trade = batch.trades[i];
        
        try {
          console.log(`🔄 Executing trade ${i + 1}/${batch.trades.length}: ${trade.type} ${trade.amount.toFixed(6)} ${trade.tokenAddress}`);
          
          const tradeResult = await this.executeTrade(trade, options);
          batchResult.executedTrades.push(tradeResult);
          batchResult.gasUsed += tradeResult.gasUsed || 0;
          batchResult.actualGasCost += tradeResult.gasCost || 0;
          
        } catch (tradeError) {
          console.error(`❌ Trade execution failed:`, tradeError);
          
          const failedTrade = {
            ...trade,
            error: tradeError.message,
            timestamp: Date.now()
          };
          
          batchResult.failedTrades.push(failedTrade);
          batchResult.errors.push({
            type: 'trade_error',
            tradeId: trade.tokenAddress,
            message: tradeError.message,
            timestamp: Date.now()
          });
          
          // Continue with other trades unless it's a critical error
          if (options.stopOnError) {
            throw tradeError;
          }
        }
      }
      
      batchResult.status = batchResult.failedTrades.length === 0 ? 'completed' : 'partial';
      batchResult.endTime = Date.now();
      batchResult.duration = batchResult.endTime - batchResult.startTime;
      
      console.log(`✅ Batch execution ${batchResult.status}: ${batchResult.executedTrades.length}/${batch.trades.length} trades successful`);
      
      return batchResult;
      
    } catch (error) {
      batchResult.status = 'failed';
      batchResult.endTime = Date.now();
      batchResult.duration = batchResult.endTime - batchResult.startTime;
      batchResult.errors.push({
        type: 'batch_error',
        message: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * Execute a single trade (placeholder - would integrate with actual DEX)
   */
  async executeTrade(trade, options = {}) {
    console.log(`🔄 Executing ${trade.type} trade: ${trade.amount.toFixed(6)} tokens for $${trade.valueUSD.toFixed(2)}`);
    
    // Simulate trade execution (in production, this would call actual DEX contracts)
    if (options.dryRun) {
      return {
        ...trade,
        status: 'simulated',
        transactionHash: `0x${'0'.repeat(64)}`,
        gasUsed: trade.gasEstimate,
        gasCost: trade.gasCostUSD,
        executedPrice: trade.price,
        slippage: 0,
        timestamp: Date.now()
      };
    }
    
    // Simulate network delay
    await this.delay(1000 + Math.random() * 2000);
    
    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05 && !options.forceSuccess) {
      throw new Error(`Trade execution failed: ${['Insufficient liquidity', 'Slippage too high', 'Network error'][Math.floor(Math.random() * 3)]}`);
    }
    
    // Simulate successful execution
    const executedPrice = trade.price * (1 + (Math.random() - 0.5) * 0.01); // ±0.5% price variation
    const actualSlippage = Math.abs(executedPrice - trade.price) / trade.price;
    const actualGasUsed = trade.gasEstimate * (0.9 + Math.random() * 0.2); // ±10% gas variation
    
    return {
      ...trade,
      status: 'executed',
      transactionHash: `0x${Math.random().toString(16).substr(2, 64).padStart(64, '0')}`,
      gasUsed: Math.floor(actualGasUsed),
      gasCost: (actualGasUsed / trade.gasEstimate) * trade.gasCostUSD,
      executedPrice,
      slippage: actualSlippage,
      timestamp: Date.now()
    };
  }

  /**
   * Generate detailed execution summary
   */
  generateExecutionSummary(executionReport) {
    const totalTrades = executionReport.totalTrades;
    const executedTrades = executionReport.executedTrades.length;
    const failedTrades = executionReport.failedTrades.length;
    const successRate = (executedTrades / totalTrades) * 100;
    
    const totalGasUsed = executionReport.executedTrades.reduce((sum, trade) => sum + (trade.gasUsed || 0), 0);
    const totalGasCost = executionReport.executedTrades.reduce((sum, trade) => sum + (trade.gasCost || 0), 0);
    const averageSlippage = executionReport.executedTrades.reduce((sum, trade) => sum + (trade.slippage || 0), 0) / executedTrades;
    
    const executedValue = executionReport.executedTrades.reduce((sum, trade) => sum + trade.valueUSD, 0);
    const failedValue = executionReport.failedTrades.reduce((sum, trade) => sum + trade.valueUSD, 0);
    
    return {
      successRate,
      executedTrades,
      failedTrades,
      totalTrades,
      executedValue,
      failedValue,
      totalValue: executionReport.totalValue,
      totalGasUsed,
      totalGasCost,
      averageSlippage: averageSlippage || 0,
      gasEfficiency: totalGasCost / executedValue,
      duration: executionReport.duration,
      batchCount: executionReport.totalBatches,
      errorCount: executionReport.errors.length,
      warningCount: executionReport.warnings.length,
      timestamp: Date.now()
    };
  }

  /**
   * Create detailed execution report for user display
   */
  createExecutionReport(executionResult) {
    if (!executionResult) {
      return null;
    }
    
    const report = {
      id: executionResult.id,
      status: executionResult.status,
      timestamp: executionResult.startTime,
      duration: executionResult.duration,
      summary: executionResult.summary,
      
      // Trade statistics
      trades: {
        total: executionResult.totalTrades,
        executed: executionResult.executedTrades.length,
        failed: executionResult.failedTrades.length,
        successRate: executionResult.summary.successRate
      },
      
      // Financial summary
      financial: {
        totalValue: executionResult.totalValue,
        executedValue: executionResult.summary.executedValue,
        failedValue: executionResult.summary.failedValue,
        gasCost: executionResult.summary.totalGasCost,
        gasEfficiency: executionResult.summary.gasEfficiency,
        averageSlippage: executionResult.summary.averageSlippage
      },
      
      // Gas analysis
      gas: {
        estimated: executionResult.gasEstimation.totalGasEstimate,
        used: executionResult.summary.totalGasUsed,
        efficiency: (executionResult.summary.totalGasUsed / executionResult.gasEstimation.totalGasEstimate) * 100,
        costUSD: executionResult.summary.totalGasCost,
        savings: executionResult.gasOptimization?.gasSavingsPercent || 0
      },
      
      // Batch information
      batches: executionResult.batches.map(batch => ({
        id: batch.batchId,
        type: batch.batchType,
        status: batch.status,
        trades: batch.executedTrades.length + batch.failedTrades.length,
        executed: batch.executedTrades.length,
        failed: batch.failedTrades.length,
        duration: batch.duration,
        gasUsed: batch.gasUsed,
        gasCost: batch.actualGasCost
      })),
      
      // Errors and warnings
      issues: {
        errors: executionResult.errors,
        warnings: executionResult.warnings,
        hasIssues: executionResult.errors.length > 0 || executionResult.warnings.length > 0
      }
    };
    
    return report;
  }

  /**
   * Get the latest execution report
   */
  getLatestExecutionReport() {
    if (this.rebalancingHistory.length === 0) {
      return null;
    }
    
    const latestExecution = this.rebalancingHistory[this.rebalancingHistory.length - 1];
    return this.createExecutionReport(latestExecution);
  }

  /**
   * Get execution reports with filtering and pagination
   */
  getExecutionReports(options = {}) {
    const { 
      limit = 10, 
      offset = 0, 
      status = null, 
      startDate = null, 
      endDate = null 
    } = options;
    
    let filtered = [...this.rebalancingHistory];
    
    // Filter by status
    if (status) {
      filtered = filtered.filter(execution => execution.status === status);
    }
    
    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(execution => execution.startTime >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(execution => execution.startTime <= endDate);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.startTime - a.startTime);
    
    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);
    
    return {
      reports: paginated.map(execution => this.createExecutionReport(execution)),
      total: filtered.length,
      hasMore: offset + limit < filtered.length
    };
  }

  /**
   * Utility function for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get engine status and statistics
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isActive: this.state.isActive,
      configuration: this.getConfiguration(),
      cacheSize: this.analysisCache.size,
      historyCount: this.rebalancingHistory.length,
      lastRebalance: this.state.lastRebalance,
      currentOperation: this.state.currentOperation,
      progress: this.state.progress,
      deferredReason: this.state.deferredReason
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.analysisCache.clear();
    this.rebalancingHistory = [];
    this.activeRebalancing = null;
    this.state = {
      isActive: false,
      currentOperation: null,
      progress: 0,
      lastRebalance: null,
      deferredReason: null
    };
    
    this.updateStateStore();
    this.isInitialized = false;
    
    console.log('🧹 Rebalancing Engine cleaned up');
  }
}

// Create and export singleton instance
export const rebalancingEngine = new RebalancingEngine();

export default rebalancingEngine;