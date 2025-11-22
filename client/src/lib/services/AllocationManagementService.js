/**
 * Allocation Management Service
 * 
 * Implements flexible allocation system with auto-distribute and custom percentages,
 * allocation validation, and liquidity checking as specified in requirements 4.1, 4.2, 4.3
 */

import { writable } from 'svelte/store';
import { enhancedPriceDisplayService } from './EnhancedPriceDisplayService.js';
import { 
  validateAllocationPercentages, 
  normalizeAllocations, 
  calculateEqualDistribution,
  calculateAllocationDrift,
  roundToPrecision 
} from '../utils/PercentageCalculator.js';

// Allocation constants
const MIN_ALLOCATION_PERCENT = 0.01; // 0.01% minimum allocation
const MAX_ALLOCATION_PERCENT = 100; // 100% maximum allocation
const LIQUIDITY_CHECK_TIMEOUT = 5000; // 5 seconds timeout for liquidity checks
const MIN_LIQUIDITY_USD = 1000; // Minimum $1000 liquidity required
const ALLOCATION_DRIFT_THRESHOLD = 0.05; // 5% drift threshold for notifications

// Reactive stores for allocation state
export const allocationStateStore = writable({
  isInitialized: false,
  currentAllocations: {},
  targetAllocations: {},
  supportedTokens: [],
  autoDistributeMode: false,
  lastUpdate: null
});

export const allocationAnalysisStore = writable({
  driftAnalysis: null,
  liquidityAnalysis: null,
  validationResults: null,
  recommendations: []
});

export const allocationTrackingStore = writable({
  manualTrades: [],
  allocationHistory: [],
  driftNotifications: [],
  lastTrackingUpdate: null
});

class AllocationManagementService {
  constructor() {
    this.isInitialized = false;
    this.supportedTokens = [];
    this.currentAllocations = {};
    this.targetAllocations = {};
    this.autoDistributeMode = false;
    this.liquidityCache = new Map();
    this.allocationHistory = [];
    this.manualTrades = [];
    this.driftNotifications = [];
    
    // Configuration
    this.minAllocationPercent = MIN_ALLOCATION_PERCENT;
    this.maxAllocationPercent = MAX_ALLOCATION_PERCENT;
    this.minLiquidityUSD = MIN_LIQUIDITY_USD;
    this.driftThreshold = ALLOCATION_DRIFT_THRESHOLD;
    
    // State management
    this.state = {
      isInitialized: false,
      currentAllocations: {},
      targetAllocations: {},
      supportedTokens: [],
      autoDistributeMode: false,
      lastUpdate: null
    };
  }

  /**
   * Initialize the allocation management service
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('🔄 Allocation Management Service already initialized');
      return;
    }

    console.log('🚀 Initializing Allocation Management Service...');
    
    try {
      // Set configuration options
      this.minAllocationPercent = options.minAllocationPercent || MIN_ALLOCATION_PERCENT;
      this.maxAllocationPercent = options.maxAllocationPercent || MAX_ALLOCATION_PERCENT;
      this.minLiquidityUSD = options.minLiquidityUSD || MIN_LIQUIDITY_USD;
      this.driftThreshold = options.driftThreshold || ALLOCATION_DRIFT_THRESHOLD;
      
      // Ensure price service is initialized
      if (!enhancedPriceDisplayService.isInitialized) {
        await enhancedPriceDisplayService.initialize();
      }
      
      // Load supported tokens (placeholder - would come from contract or config)
      this.supportedTokens = options.supportedTokens || [
        {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          category: 'native'
        },
        {
          address: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          category: 'stablecoin'
        },
        {
          address: '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8',
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          decimals: 8,
          category: 'crypto'
        }
      ];
      
      // Initialize state
      this.state.supportedTokens = this.supportedTokens;
      this.state.isInitialized = true;
      this.state.lastUpdate = Date.now();
      
      this.isInitialized = true;
      console.log('✅ Allocation Management Service initialized successfully');
      
      // Update state store
      this.updateStateStore();
      
    } catch (error) {
      console.error('❌ Failed to initialize Allocation Management Service:', error);
      throw error;
    }
  }

  /**
   * Implement auto-distribute functionality for equal token percentages
   * Implements requirement 4.1 - auto-distribute functionality
   */
  calculateAutoDistribution(selectedTokens) {
    console.log('📊 Calculating auto-distribution for selected tokens...');
    
    if (!selectedTokens || selectedTokens.length === 0) {
      throw new Error('At least one token must be selected for auto-distribution');
    }

    // Validate selected tokens are supported
    const unsupportedTokens = selectedTokens.filter(tokenAddress => 
      !this.supportedTokens.find(token => token.address === tokenAddress)
    );
    
    if (unsupportedTokens.length > 0) {
      throw new Error(`Unsupported tokens: ${unsupportedTokens.join(', ')}`);
    }

    // Calculate equal distribution
    const equalDistribution = calculateEqualDistribution(selectedTokens.length);
    
    // Create allocation object
    const autoAllocations = {};
    selectedTokens.forEach((tokenAddress, index) => {
      autoAllocations[tokenAddress] = equalDistribution[index];
    });
    
    // Normalize to ensure exactly 100%
    const normalizedAllocations = normalizeAllocations(autoAllocations);
    
    const distributionResult = {
      mode: 'auto-distribute',
      selectedTokens,
      allocations: normalizedAllocations.allocations,
      equalPercent: roundToPrecision(100 / selectedTokens.length, 2),
      totalPercent: normalizedAllocations.total,
      isValid: normalizedAllocations.isValid,
      timestamp: Date.now()
    };
    
    console.log(`📊 Auto-distribution calculated: ${selectedTokens.length} tokens, ${distributionResult.equalPercent}% each`);
    
    return distributionResult;
  }

  /**
   * Set auto-distribute mode and calculate allocations
   */
  async setAutoDistributeMode(selectedTokens, enable = true) {
    console.log(`🔄 ${enable ? 'Enabling' : 'Disabling'} auto-distribute mode...`);
    
    if (enable) {
      if (!selectedTokens || selectedTokens.length === 0) {
        throw new Error('Selected tokens required for auto-distribute mode');
      }
      
      // Calculate auto-distribution
      const distribution = this.calculateAutoDistribution(selectedTokens);
      
      // Update target allocations
      this.targetAllocations = distribution.allocations;
      this.autoDistributeMode = true;
      
      // Update state
      this.state.targetAllocations = this.targetAllocations;
      this.state.autoDistributeMode = true;
      this.state.lastUpdate = Date.now();
      
      console.log('✅ Auto-distribute mode enabled');
      
    } else {
      this.autoDistributeMode = false;
      this.state.autoDistributeMode = false;
      this.state.lastUpdate = Date.now();
      
      console.log('✅ Auto-distribute mode disabled');
    }
    
    this.updateStateStore();
    return this.getAutoDistributeStatus();
  }

  /**
   * Get auto-distribute status and current distribution
   */
  getAutoDistributeStatus() {
    return {
      enabled: this.autoDistributeMode,
      targetAllocations: { ...this.targetAllocations },
      selectedTokens: Object.keys(this.targetAllocations),
      tokenCount: Object.keys(this.targetAllocations).length,
      equalPercent: this.autoDistributeMode && Object.keys(this.targetAllocations).length > 0 
        ? roundToPrecision(100 / Object.keys(this.targetAllocations).length, 2) 
        : 0,
      lastUpdate: this.state.lastUpdate
    };
  }

  /**
   * Validate custom allocation ensuring 100% total
   * Implements requirement 4.2 - custom allocation validation
   */
  validateCustomAllocations(allocations) {
    console.log('✅ Validating custom allocations...');
    
    if (!allocations || typeof allocations !== 'object') {
      throw new Error('Allocations must be provided as an object');
    }

    const tokenAddresses = Object.keys(allocations);
    
    if (tokenAddresses.length === 0) {
      throw new Error('At least one token allocation must be specified');
    }

    // Validate all tokens are supported
    const unsupportedTokens = tokenAddresses.filter(tokenAddress => 
      !this.supportedTokens.find(token => token.address === tokenAddress)
    );
    
    if (unsupportedTokens.length > 0) {
      throw new Error(`Unsupported tokens: ${unsupportedTokens.join(', ')}`);
    }

    // Validate individual allocation percentages
    const validationErrors = [];
    const validationWarnings = [];
    
    for (const [tokenAddress, percent] of Object.entries(allocations)) {
      if (typeof percent !== 'number') {
        validationErrors.push(`Invalid allocation for ${tokenAddress}: must be a number`);
        continue;
      }
      
      if (percent < 0) {
        validationErrors.push(`Invalid allocation for ${tokenAddress}: cannot be negative`);
      }
      
      if (percent > this.maxAllocationPercent) {
        validationErrors.push(`Invalid allocation for ${tokenAddress}: exceeds maximum ${this.maxAllocationPercent}%`);
      }
      
      if (percent > 0 && percent < this.minAllocationPercent) {
        validationWarnings.push(`Small allocation for ${tokenAddress}: ${percent}% is below recommended minimum ${this.minAllocationPercent}%`);
      }
    }

    // Use PercentageCalculator for comprehensive validation
    let percentageValidation;
    try {
      percentageValidation = validateAllocationPercentages(allocations);
    } catch (error) {
      validationErrors.push(error.message);
      percentageValidation = { isValid: false, total: 0, deviation: 0 };
    }

    const validationResult = {
      isValid: validationErrors.length === 0 && percentageValidation.isValid,
      errors: validationErrors,
      warnings: validationWarnings,
      totalPercent: percentageValidation.total,
      deviation: percentageValidation.deviation,
      tolerance: percentageValidation.tolerance,
      normalizedAllocations: null,
      canProceed: validationErrors.length === 0,
      timestamp: Date.now()
    };

    // If valid, provide normalized allocations
    if (validationResult.isValid) {
      try {
        const normalized = normalizeAllocations(allocations);
        validationResult.normalizedAllocations = normalized.allocations;
      } catch (error) {
        validationResult.errors.push(`Normalization failed: ${error.message}`);
        validationResult.isValid = false;
        validationResult.canProceed = false;
      }
    }

    console.log(`✅ Validation complete - Valid: ${validationResult.isValid}, Errors: ${validationResult.errors.length}, Warnings: ${validationResult.warnings.length}`);
    
    // Update analysis store
    allocationAnalysisStore.update(state => ({
      ...state,
      validationResults: validationResult
    }));
    
    return validationResult;
  }

  /**
   * Set custom allocations with validation
   */
  async setCustomAllocations(allocations) {
    console.log('🎯 Setting custom allocations...');
    
    // Validate allocations first
    const validation = this.validateCustomAllocations(allocations);
    
    if (!validation.canProceed) {
      throw new Error(`Invalid allocations: ${validation.errors.join(', ')}`);
    }

    // Use normalized allocations
    this.targetAllocations = validation.normalizedAllocations || allocations;
    this.autoDistributeMode = false; // Disable auto-distribute when setting custom
    
    // Update state
    this.state.targetAllocations = this.targetAllocations;
    this.state.autoDistributeMode = false;
    this.state.lastUpdate = Date.now();
    
    // Add to allocation history
    this.addToAllocationHistory('custom_set', this.targetAllocations);
    
    console.log('✅ Custom allocations set successfully');
    
    this.updateStateStore();
    return {
      allocations: this.targetAllocations,
      validation,
      timestamp: Date.now()
    };
  }

  /**
   * Check liquidity for allocation feasibility
   * Implements requirement 4.3 - liquidity checking for allocation feasibility
   */
  async checkLiquidityForAllocations(allocations, portfolioValueUSD) {
    console.log('💧 Checking liquidity for allocation feasibility...');
    
    if (!allocations || !portfolioValueUSD) {
      throw new Error('Allocations and portfolio value are required for liquidity check');
    }

    const liquidityAnalysis = {
      totalPortfolioValue: portfolioValueUSD,
      tokenLiquidity: {},
      overallFeasible: true,
      warnings: [],
      errors: [],
      timestamp: Date.now()
    };

    // Check liquidity for each token
    for (const [tokenAddress, percent] of Object.entries(allocations)) {
      const targetValueUSD = (portfolioValueUSD * percent) / 100;
      
      try {
        const liquidityCheck = await this.checkTokenLiquidity(tokenAddress, targetValueUSD);
        liquidityAnalysis.tokenLiquidity[tokenAddress] = liquidityCheck;
        
        if (!liquidityCheck.isFeasible) {
          liquidityAnalysis.overallFeasible = false;
          liquidityAnalysis.errors.push(
            `Insufficient liquidity for ${liquidityCheck.symbol}: need $${targetValueUSD.toFixed(2)}, available $${liquidityCheck.availableLiquidityUSD.toFixed(2)}`
          );
        }
        
        if (liquidityCheck.hasWarnings) {
          liquidityAnalysis.warnings.push(...liquidityCheck.warnings);
        }
        
      } catch (error) {
        console.error(`Failed to check liquidity for ${tokenAddress}:`, error);
        liquidityAnalysis.tokenLiquidity[tokenAddress] = {
          tokenAddress,
          symbol: 'UNKNOWN',
          isFeasible: false,
          availableLiquidityUSD: 0,
          requiredValueUSD: targetValueUSD,
          liquidityRatio: 0,
          hasWarnings: true,
          warnings: [`Liquidity check failed: ${error.message}`],
          error: error.message
        };
        
        liquidityAnalysis.overallFeasible = false;
        liquidityAnalysis.errors.push(`Liquidity check failed for ${tokenAddress}: ${error.message}`);
      }
    }

    // Calculate overall liquidity metrics
    const totalRequiredLiquidity = Object.values(liquidityAnalysis.tokenLiquidity)
      .reduce((sum, token) => sum + token.requiredValueUSD, 0);
    
    const totalAvailableLiquidity = Object.values(liquidityAnalysis.tokenLiquidity)
      .reduce((sum, token) => sum + token.availableLiquidityUSD, 0);
    
    liquidityAnalysis.totalRequiredLiquidity = totalRequiredLiquidity;
    liquidityAnalysis.totalAvailableLiquidity = totalAvailableLiquidity;
    liquidityAnalysis.overallLiquidityRatio = totalAvailableLiquidity / totalRequiredLiquidity;

    console.log(`💧 Liquidity check complete - Feasible: ${liquidityAnalysis.overallFeasible}, Ratio: ${liquidityAnalysis.overallLiquidityRatio.toFixed(2)}`);
    
    // Update analysis store
    allocationAnalysisStore.update(state => ({
      ...state,
      liquidityAnalysis
    }));
    
    return liquidityAnalysis;
  }

  /**
   * Check liquidity for a specific token
   */
  async checkTokenLiquidity(tokenAddress, requiredValueUSD) {
    // Check cache first
    const cacheKey = `${tokenAddress}_${Math.floor(requiredValueUSD / 100) * 100}`; // Cache by $100 buckets
    const cached = this.liquidityCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < 60000) { // 1 minute cache
      return cached;
    }

    const token = this.supportedTokens.find(t => t.address === tokenAddress);
    const symbol = token ? token.symbol : 'UNKNOWN';
    
    try {
      // Get current price
      const priceData = enhancedPriceDisplayService.getPrice(tokenAddress);
      if (!priceData) {
        throw new Error(`Price data not available for ${symbol}`);
      }

      // Simulate liquidity check (in production, this would query DEX liquidity)
      const simulatedLiquidity = this.simulateTokenLiquidity(tokenAddress, symbol, priceData.price);
      
      const liquidityCheck = {
        tokenAddress,
        symbol,
        price: priceData.price,
        requiredValueUSD: requiredValueUSD,
        availableLiquidityUSD: simulatedLiquidity.availableLiquidityUSD,
        liquidityRatio: simulatedLiquidity.availableLiquidityUSD / requiredValueUSD,
        isFeasible: simulatedLiquidity.availableLiquidityUSD >= requiredValueUSD,
        hasWarnings: false,
        warnings: [],
        slippageEstimate: simulatedLiquidity.slippageEstimate,
        timestamp: Date.now()
      };

      // Add warnings for low liquidity
      if (liquidityCheck.liquidityRatio < 2) {
        liquidityCheck.hasWarnings = true;
        liquidityCheck.warnings.push(`Low liquidity: only ${liquidityCheck.liquidityRatio.toFixed(2)}x required amount available`);
      }
      
      if (simulatedLiquidity.slippageEstimate > 0.05) { // 5% slippage warning
        liquidityCheck.hasWarnings = true;
        liquidityCheck.warnings.push(`High slippage expected: ${(simulatedLiquidity.slippageEstimate * 100).toFixed(2)}%`);
      }

      // Cache result
      this.liquidityCache.set(cacheKey, liquidityCheck);
      
      return liquidityCheck;
      
    } catch (error) {
      const errorResult = {
        tokenAddress,
        symbol,
        requiredValueUSD,
        availableLiquidityUSD: 0,
        liquidityRatio: 0,
        isFeasible: false,
        hasWarnings: true,
        warnings: [`Liquidity check failed: ${error.message}`],
        error: error.message,
        timestamp: Date.now()
      };
      
      // Cache error result briefly
      this.liquidityCache.set(cacheKey, errorResult);
      
      return errorResult;
    }
  }

  /**
   * Simulate token liquidity (placeholder for actual DEX integration)
   */
  simulateTokenLiquidity(tokenAddress, symbol, price) {
    // Simulate different liquidity levels based on token type
    const token = this.supportedTokens.find(t => t.address === tokenAddress);
    const category = token ? token.category : 'crypto';
    
    let baseLiquidityUSD;
    let baseSlippage;
    
    switch (category) {
      case 'native':
        baseLiquidityUSD = 10000000; // $10M for ETH
        baseSlippage = 0.001; // 0.1%
        break;
      case 'stablecoin':
        baseLiquidityUSD = 5000000; // $5M for stablecoins
        baseSlippage = 0.002; // 0.2%
        break;
      default:
        baseLiquidityUSD = 1000000; // $1M for other tokens
        baseSlippage = 0.01; // 1%
    }
    
    // Add some randomness to simulate market conditions
    const liquidityMultiplier = 0.8 + Math.random() * 0.4; // 80% to 120%
    const slippageMultiplier = 0.5 + Math.random() * 1.5; // 50% to 200%
    
    return {
      availableLiquidityUSD: baseLiquidityUSD * liquidityMultiplier,
      slippageEstimate: baseSlippage * slippageMultiplier
    };
  }

  /**
   * Get current target allocations
   */
  getTargetAllocations() {
    return { ...this.targetAllocations };
  }

  /**
   * Get current allocations (from portfolio state)
   */
  getCurrentAllocations() {
    return { ...this.currentAllocations };
  }

  /**
   * Update current allocations (called when portfolio changes)
   */
  updateCurrentAllocations(allocations) {
    this.currentAllocations = { ...allocations };
    this.state.currentAllocations = this.currentAllocations;
    this.state.lastUpdate = Date.now();
    
    // Check for drift and create notifications
    this.checkAllocationDrift();
    
    this.updateStateStore();
  }

  /**
   * Track manual trade and update allocations in real-time
   * Implements requirement 5.1 - real-time allocation tracking for manual trades
   */
  trackManualTrade(tradeData) {
    console.log('📈 Tracking manual trade for allocation updates...');
    
    if (!tradeData || !tradeData.tokenIn || !tradeData.tokenOut || !tradeData.amountIn || !tradeData.amountOut) {
      throw new Error('Complete trade data required for tracking');
    }

    const trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'manual',
      tokenIn: tradeData.tokenIn,
      tokenOut: tradeData.tokenOut,
      amountIn: tradeData.amountIn,
      amountOut: tradeData.amountOut,
      priceIn: tradeData.priceIn,
      priceOut: tradeData.priceOut,
      valueUSD: tradeData.valueUSD || 0,
      slippage: tradeData.slippage || 0,
      gasUsed: tradeData.gasUsed || 0,
      gasCostUSD: tradeData.gasCostUSD || 0,
      transactionHash: tradeData.transactionHash,
      timestamp: Date.now(),
      processed: false
    };

    // Add to manual trades history
    this.manualTrades.push(trade);
    
    // Keep only last 100 trades
    if (this.manualTrades.length > 100) {
      this.manualTrades = this.manualTrades.slice(-100);
    }

    // Process the trade to update allocations
    this.processManualTradeForAllocation(trade);
    
    // Add to allocation history
    this.addToAllocationHistory('manual_trade', this.currentAllocations, {
      tradeId: trade.id,
      tokenIn: trade.tokenIn,
      tokenOut: trade.tokenOut,
      valueUSD: trade.valueUSD
    });

    console.log(`📈 Manual trade tracked: ${this.getTokenSymbol(trade.tokenIn)} → ${this.getTokenSymbol(trade.tokenOut)}, $${trade.valueUSD.toFixed(2)}`);
    
    this.updateStateStore();
    return trade;
  }

  /**
   * Process manual trade to update current allocations
   */
  processManualTradeForAllocation(trade) {
    try {
      // Get current portfolio value and token balances (simplified calculation)
      const portfolioValue = this.calculatePortfolioValue();
      
      if (portfolioValue === 0) {
        console.warn('Cannot update allocations: portfolio value is zero');
        return;
      }

      // Update allocations based on the trade
      const updatedAllocations = { ...this.currentAllocations };
      
      // Decrease allocation for token sold
      if (updatedAllocations[trade.tokenIn]) {
        const tokenInValue = (updatedAllocations[trade.tokenIn] / 100) * portfolioValue;
        const newTokenInValue = Math.max(0, tokenInValue - trade.valueUSD);
        updatedAllocations[trade.tokenIn] = (newTokenInValue / portfolioValue) * 100;
      }
      
      // Increase allocation for token bought
      if (updatedAllocations[trade.tokenOut]) {
        const tokenOutValue = (updatedAllocations[trade.tokenOut] / 100) * portfolioValue;
        const newTokenOutValue = tokenOutValue + trade.valueUSD;
        updatedAllocations[trade.tokenOut] = (newTokenOutValue / portfolioValue) * 100;
      } else {
        // New token in portfolio
        updatedAllocations[trade.tokenOut] = (trade.valueUSD / portfolioValue) * 100;
      }
      
      // Normalize allocations to ensure they sum to 100%
      const normalizedAllocations = normalizeAllocations(updatedAllocations);
      
      // Update current allocations
      this.updateCurrentAllocations(normalizedAllocations.allocations);
      
      trade.processed = true;
      
    } catch (error) {
      console.error('Failed to process manual trade for allocation:', error);
      trade.error = error.message;
    }
  }

  /**
   * Calculate current portfolio value (simplified - would integrate with actual portfolio service)
   */
  calculatePortfolioValue() {
    // Placeholder calculation - in production this would come from portfolio service
    let totalValue = 0;
    
    for (const [tokenAddress, percent] of Object.entries(this.currentAllocations)) {
      const priceData = enhancedPriceDisplayService.getPrice(tokenAddress);
      if (priceData) {
        // Assume some base portfolio value for calculation
        totalValue += (percent / 100) * 10000; // $10,000 base portfolio
      }
    }
    
    return totalValue || 10000; // Fallback to $10,000
  }

  /**
   * Get manual trades history with filtering
   */
  getManualTrades(options = {}) {
    const { 
      limit = 20, 
      offset = 0, 
      tokenAddress = null, 
      startDate = null, 
      endDate = null,
      processed = null
    } = options;
    
    let filtered = [...this.manualTrades];
    
    // Filter by token
    if (tokenAddress) {
      filtered = filtered.filter(trade => 
        trade.tokenIn === tokenAddress || trade.tokenOut === tokenAddress
      );
    }
    
    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(trade => trade.timestamp >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(trade => trade.timestamp <= endDate);
    }
    
    // Filter by processed status
    if (processed !== null) {
      filtered = filtered.filter(trade => trade.processed === processed);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);
    
    return {
      trades: paginated,
      total: filtered.length,
      hasMore: offset + limit < filtered.length
    };
  }

  /**
   * Create drift notification system
   * Implements requirement 4.4 - allocation drift notification system
   */
  createDriftNotification(driftAnalysis) {
    if (!driftAnalysis || !driftAnalysis.tokens) {
      return null;
    }

    const significantDrifts = Object.entries(driftAnalysis.tokens)
      .filter(([_, tokenDrift]) => tokenDrift.absoluteDrift > this.driftThreshold)
      .map(([tokenAddress, tokenDrift]) => ({
        tokenAddress,
        symbol: this.getTokenSymbol(tokenAddress),
        drift: tokenDrift.drift,
        absoluteDrift: tokenDrift.absoluteDrift,
        current: tokenDrift.current,
        target: tokenDrift.target,
        driftPercent: (tokenDrift.absoluteDrift * 100).toFixed(2)
      }));

    if (significantDrifts.length === 0) {
      return null;
    }

    // Determine notification severity
    let severity = 'low';
    if (driftAnalysis.maxDrift > this.driftThreshold * 3) {
      severity = 'high';
    } else if (driftAnalysis.maxDrift > this.driftThreshold * 1.5) {
      severity = 'medium';
    }

    const notification = {
      id: `drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'allocation_drift',
      severity,
      title: 'Portfolio Allocation Drift Detected',
      message: this.generateDriftMessage(significantDrifts, driftAnalysis.maxDrift),
      drifts: significantDrifts,
      maxDrift: driftAnalysis.maxDrift,
      totalDrift: driftAnalysis.totalDrift,
      thresholdPercent: (this.driftThreshold * 100).toFixed(1),
      actionRequired: severity === 'high',
      suggestions: this.generateDriftSuggestions(significantDrifts),
      timestamp: Date.now(),
      read: false,
      dismissed: false
    };

    return notification;
  }

  /**
   * Generate drift notification message
   */
  generateDriftMessage(drifts, maxDrift) {
    const driftCount = drifts.length;
    const maxDriftPercent = (maxDrift * 100).toFixed(1);
    
    if (driftCount === 1) {
      const drift = drifts[0];
      return `${drift.symbol} allocation has drifted ${drift.driftPercent}% from target`;
    } else {
      return `${driftCount} tokens have drifted from target allocations (max: ${maxDriftPercent}%)`;
    }
  }

  /**
   * Generate drift correction suggestions
   */
  generateDriftSuggestions(drifts) {
    const suggestions = [];
    
    // Sort by absolute drift (highest first)
    const sortedDrifts = [...drifts].sort((a, b) => b.absoluteDrift - a.absoluteDrift);
    
    for (const drift of sortedDrifts.slice(0, 3)) { // Top 3 drifts
      if (drift.drift > 0) {
        // Current allocation is higher than target
        suggestions.push({
          type: 'reduce',
          tokenAddress: drift.tokenAddress,
          symbol: drift.symbol,
          action: 'sell',
          message: `Consider selling ${drift.symbol} to reduce allocation by ${drift.driftPercent}%`
        });
      } else {
        // Current allocation is lower than target
        suggestions.push({
          type: 'increase',
          tokenAddress: drift.tokenAddress,
          symbol: drift.symbol,
          action: 'buy',
          message: `Consider buying ${drift.symbol} to increase allocation by ${drift.driftPercent}%`
        });
      }
    }
    
    // Add rebalancing suggestion if multiple tokens are affected
    if (drifts.length > 2) {
      suggestions.push({
        type: 'rebalance',
        action: 'rebalance',
        message: `Consider using automated rebalancing to correct ${drifts.length} token allocations`
      });
    }
    
    return suggestions;
  }

  /**
   * Enhanced drift checking with notification creation
   */
  checkAllocationDrift() {
    if (Object.keys(this.targetAllocations).length === 0 || Object.keys(this.currentAllocations).length === 0) {
      return;
    }

    try {
      const driftAnalysis = calculateAllocationDrift(this.currentAllocations, this.targetAllocations);
      
      // Create notification if significant drift detected
      const notification = this.createDriftNotification(driftAnalysis);
      
      if (notification) {
        // Check if we already have a recent similar notification
        const recentSimilar = this.driftNotifications.find(n => 
          n.type === 'allocation_drift' && 
          !n.dismissed &&
          (Date.now() - n.timestamp) < 300000 && // 5 minutes
          n.drifts.length === notification.drifts.length
        );
        
        if (!recentSimilar) {
          this.driftNotifications.push(notification);
          
          // Keep only last 20 notifications
          if (this.driftNotifications.length > 20) {
            this.driftNotifications = this.driftNotifications.slice(-20);
          }
          
          console.log(`⚠️ ${notification.title}: ${notification.message}`);
        }
      }
      
      // Update analysis store
      allocationAnalysisStore.update(state => ({
        ...state,
        driftAnalysis
      }));
      
    } catch (error) {
      console.error('Failed to check allocation drift:', error);
    }
  }

  /**
   * Implement immediate target allocation updates
   * Implements requirement 4.5 - immediate target allocation updates
   */
  updateTargetAllocationImmediate(tokenAddress, newPercent) {
    console.log(`🎯 Updating target allocation for ${this.getTokenSymbol(tokenAddress)} to ${newPercent}%`);
    
    if (!tokenAddress || typeof newPercent !== 'number') {
      throw new Error('Token address and percentage are required');
    }

    if (newPercent < 0 || newPercent > 100) {
      throw new Error('Allocation percentage must be between 0% and 100%');
    }

    // Create updated allocations
    const updatedAllocations = { ...this.targetAllocations };
    
    if (newPercent === 0) {
      // Remove token from allocations
      delete updatedAllocations[tokenAddress];
    } else {
      updatedAllocations[tokenAddress] = newPercent;
    }

    // Validate and normalize the updated allocations
    const validation = this.validateCustomAllocations(updatedAllocations);
    
    if (!validation.canProceed) {
      throw new Error(`Invalid allocation update: ${validation.errors.join(', ')}`);
    }

    // Update target allocations immediately
    this.targetAllocations = validation.normalizedAllocations || updatedAllocations;
    this.state.targetAllocations = this.targetAllocations;
    this.state.lastUpdate = Date.now();
    
    // Disable auto-distribute mode if it was enabled
    if (this.autoDistributeMode) {
      this.autoDistributeMode = false;
      this.state.autoDistributeMode = false;
      console.log('🔄 Auto-distribute mode disabled due to manual allocation update');
    }
    
    // Add to allocation history
    this.addToAllocationHistory('target_update', this.targetAllocations, {
      updatedToken: tokenAddress,
      newPercent,
      previousPercent: this.targetAllocations[tokenAddress] || 0
    });
    
    // Check for immediate drift
    this.checkAllocationDrift();
    
    console.log(`✅ Target allocation updated immediately for ${this.getTokenSymbol(tokenAddress)}`);
    
    this.updateStateStore();
    
    return {
      tokenAddress,
      symbol: this.getTokenSymbol(tokenAddress),
      newPercent,
      updatedAllocations: this.targetAllocations,
      validation,
      timestamp: Date.now()
    };
  }

  /**
   * Batch update multiple target allocations
   */
  updateMultipleTargetAllocations(allocationUpdates) {
    console.log(`🎯 Batch updating ${Object.keys(allocationUpdates).length} target allocations`);
    
    if (!allocationUpdates || typeof allocationUpdates !== 'object') {
      throw new Error('Allocation updates must be provided as an object');
    }

    // Create updated allocations by merging with existing
    const updatedAllocations = { ...this.targetAllocations };
    
    for (const [tokenAddress, newPercent] of Object.entries(allocationUpdates)) {
      if (typeof newPercent !== 'number') {
        throw new Error(`Invalid percentage for ${tokenAddress}: must be a number`);
      }
      
      if (newPercent < 0 || newPercent > 100) {
        throw new Error(`Invalid percentage for ${tokenAddress}: must be between 0% and 100%`);
      }
      
      if (newPercent === 0) {
        delete updatedAllocations[tokenAddress];
      } else {
        updatedAllocations[tokenAddress] = newPercent;
      }
    }

    // Validate the batch update
    const validation = this.validateCustomAllocations(updatedAllocations);
    
    if (!validation.canProceed) {
      throw new Error(`Invalid batch allocation update: ${validation.errors.join(', ')}`);
    }

    // Update target allocations
    this.targetAllocations = validation.normalizedAllocations || updatedAllocations;
    this.state.targetAllocations = this.targetAllocations;
    this.state.lastUpdate = Date.now();
    
    // Disable auto-distribute mode
    if (this.autoDistributeMode) {
      this.autoDistributeMode = false;
      this.state.autoDistributeMode = false;
    }
    
    // Add to allocation history
    this.addToAllocationHistory('batch_update', this.targetAllocations, {
      updatedTokens: Object.keys(allocationUpdates),
      updateCount: Object.keys(allocationUpdates).length
    });
    
    // Check for drift
    this.checkAllocationDrift();
    
    console.log(`✅ Batch target allocation update completed for ${Object.keys(allocationUpdates).length} tokens`);
    
    this.updateStateStore();
    
    return {
      updatedTokens: Object.keys(allocationUpdates),
      updatedAllocations: this.targetAllocations,
      validation,
      timestamp: Date.now()
    };
  }

  /**
   * Get rebalancing recommendations based on current drift
   */
  getRebalancingRecommendations() {
    if (Object.keys(this.targetAllocations).length === 0 || Object.keys(this.currentAllocations).length === 0) {
      return {
        hasRecommendations: false,
        recommendations: [],
        message: 'No target allocations set or current allocations unavailable'
      };
    }

    try {
      const driftAnalysis = calculateAllocationDrift(this.currentAllocations, this.targetAllocations);
      
      if (driftAnalysis.maxDrift <= this.driftThreshold) {
        return {
          hasRecommendations: false,
          recommendations: [],
          message: 'Portfolio is within drift threshold - no rebalancing needed',
          driftAnalysis
        };
      }

      const recommendations = [];
      const portfolioValue = this.calculatePortfolioValue();
      
      // Generate specific rebalancing recommendations
      for (const [tokenAddress, tokenDrift] of Object.entries(driftAnalysis.tokens)) {
        if (tokenDrift.absoluteDrift > this.driftThreshold) {
          const currentValue = (tokenDrift.current / 100) * portfolioValue;
          const targetValue = (tokenDrift.target / 100) * portfolioValue;
          const adjustmentValue = Math.abs(targetValue - currentValue);
          
          recommendations.push({
            tokenAddress,
            symbol: this.getTokenSymbol(tokenAddress),
            action: tokenDrift.drift > 0 ? 'sell' : 'buy',
            currentPercent: tokenDrift.current,
            targetPercent: tokenDrift.target,
            driftPercent: tokenDrift.drift,
            adjustmentPercent: tokenDrift.absoluteDrift,
            adjustmentValueUSD: adjustmentValue,
            priority: tokenDrift.absoluteDrift > this.driftThreshold * 2 ? 'high' : 'medium'
          });
        }
      }
      
      // Sort by priority and drift magnitude
      recommendations.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
        return b.adjustmentPercent - a.adjustmentPercent;
      });

      return {
        hasRecommendations: true,
        recommendations,
        totalAdjustmentValue: recommendations.reduce((sum, rec) => sum + rec.adjustmentValueUSD, 0),
        maxDrift: driftAnalysis.maxDrift,
        driftThreshold: this.driftThreshold,
        driftAnalysis,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Failed to generate rebalancing recommendations:', error);
      return {
        hasRecommendations: false,
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Check for allocation drift and create notifications
   */
  checkAllocationDrift() {
    if (Object.keys(this.targetAllocations).length === 0 || Object.keys(this.currentAllocations).length === 0) {
      return;
    }

    try {
      const driftAnalysis = calculateAllocationDrift(this.currentAllocations, this.targetAllocations);
      
      // Check if any token exceeds drift threshold
      const significantDrifts = Object.entries(driftAnalysis.tokens)
        .filter(([_, tokenDrift]) => tokenDrift.absoluteDrift > this.driftThreshold)
        .map(([tokenAddress, tokenDrift]) => ({
          tokenAddress,
          symbol: this.getTokenSymbol(tokenAddress),
          drift: tokenDrift.drift,
          absoluteDrift: tokenDrift.absoluteDrift,
          current: tokenDrift.current,
          target: tokenDrift.target
        }));

      if (significantDrifts.length > 0) {
        const notification = {
          id: `drift_${Date.now()}`,
          type: 'allocation_drift',
          severity: driftAnalysis.maxDrift > this.driftThreshold * 2 ? 'high' : 'medium',
          message: `Portfolio allocation drift detected: ${significantDrifts.length} tokens exceed ${(this.driftThreshold * 100).toFixed(1)}% threshold`,
          drifts: significantDrifts,
          maxDrift: driftAnalysis.maxDrift,
          totalDrift: driftAnalysis.totalDrift,
          timestamp: Date.now()
        };
        
        this.driftNotifications.push(notification);
        
        // Keep only last 10 notifications
        if (this.driftNotifications.length > 10) {
          this.driftNotifications = this.driftNotifications.slice(-10);
        }
        
        console.log(`⚠️ Allocation drift detected: ${significantDrifts.length} tokens, max drift ${(driftAnalysis.maxDrift * 100).toFixed(2)}%`);
      }
      
      // Update analysis store
      allocationAnalysisStore.update(state => ({
        ...state,
        driftAnalysis
      }));
      
    } catch (error) {
      console.error('Failed to check allocation drift:', error);
    }
  }

  /**
   * Get token symbol by address
   */
  getTokenSymbol(tokenAddress) {
    const token = this.supportedTokens.find(t => t.address === tokenAddress);
    return token ? token.symbol : tokenAddress.slice(0, 8) + '...';
  }

  /**
   * Add entry to allocation history
   */
  addToAllocationHistory(action, allocations, metadata = {}) {
    const historyEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      allocations: { ...allocations },
      metadata,
      timestamp: Date.now()
    };
    
    this.allocationHistory.push(historyEntry);
    
    // Keep only last 50 entries
    if (this.allocationHistory.length > 50) {
      this.allocationHistory = this.allocationHistory.slice(-50);
    }
  }

  /**
   * Get allocation history with filtering
   */
  getAllocationHistory(options = {}) {
    const { limit = 10, offset = 0, action = null } = options;
    
    let filtered = [...this.allocationHistory];
    
    if (action) {
      filtered = filtered.filter(entry => entry.action === action);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);
    
    return {
      entries: paginated,
      total: filtered.length,
      hasMore: offset + limit < filtered.length
    };
  }

  /**
   * Get drift notifications with enhanced filtering
   */
  getDriftNotifications(options = {}) {
    const { 
      unreadOnly = false, 
      severity = null, 
      limit = 10, 
      offset = 0,
      dismissed = false 
    } = options;
    
    let notifications = [...this.driftNotifications];
    
    // Apply filters
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    if (severity) {
      notifications = notifications.filter(n => n.severity === severity);
    }
    
    if (!dismissed) {
      notifications = notifications.filter(n => !n.dismissed);
    }
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    const paginated = notifications.slice(offset, offset + limit);
    
    return {
      notifications: paginated,
      total: notifications.length,
      hasMore: offset + limit < notifications.length,
      unreadCount: this.driftNotifications.filter(n => !n.read && !n.dismissed).length,
      highPriorityCount: this.driftNotifications.filter(n => n.severity === 'high' && !n.dismissed).length
    };
  }

  /**
   * Mark drift notification as read
   */
  markNotificationRead(notificationId) {
    const notification = this.driftNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.updateStateStore();
      return true;
    }
    return false;
  }

  /**
   * Dismiss drift notification
   */
  dismissNotification(notificationId) {
    const notification = this.driftNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.dismissed = true;
      notification.read = true;
      this.updateStateStore();
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead() {
    let markedCount = 0;
    for (const notification of this.driftNotifications) {
      if (!notification.read) {
        notification.read = true;
        markedCount++;
      }
    }
    
    if (markedCount > 0) {
      this.updateStateStore();
    }
    
    return markedCount;
  }

  /**
   * Clear old drift notifications
   */
  clearOldNotifications(olderThanMs = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - olderThanMs;
    this.driftNotifications = this.driftNotifications.filter(n => n.timestamp > cutoff);
  }

  /**
   * Update the reactive state store
   */
  updateStateStore() {
    allocationStateStore.set(this.state);
    
    // Update tracking store
    allocationTrackingStore.update(state => ({
      ...state,
      manualTrades: this.manualTrades,
      allocationHistory: this.allocationHistory,
      driftNotifications: this.driftNotifications,
      lastTrackingUpdate: Date.now()
    }));
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      autoDistributeMode: this.autoDistributeMode,
      supportedTokensCount: this.supportedTokens.length,
      targetAllocationsCount: Object.keys(this.targetAllocations).length,
      currentAllocationsCount: Object.keys(this.currentAllocations).length,
      historyCount: this.allocationHistory.length,
      notificationsCount: this.driftNotifications.length,
      unreadNotificationsCount: this.driftNotifications.filter(n => !n.read).length,
      cacheSize: this.liquidityCache.size,
      configuration: {
        minAllocationPercent: this.minAllocationPercent,
        maxAllocationPercent: this.maxAllocationPercent,
        minLiquidityUSD: this.minLiquidityUSD,
        driftThreshold: this.driftThreshold
      },
      lastUpdate: this.state.lastUpdate
    };
  }

  /**
   * Set configuration options
   */
  setConfiguration(config) {
    if (config.minAllocationPercent !== undefined) {
      this.minAllocationPercent = Math.max(0.001, Math.min(1, config.minAllocationPercent));
    }
    
    if (config.maxAllocationPercent !== undefined) {
      this.maxAllocationPercent = Math.max(1, Math.min(100, config.maxAllocationPercent));
    }
    
    if (config.minLiquidityUSD !== undefined) {
      this.minLiquidityUSD = Math.max(100, config.minLiquidityUSD);
    }
    
    if (config.driftThreshold !== undefined) {
      this.driftThreshold = Math.max(0.01, Math.min(0.5, config.driftThreshold));
    }
    
    console.log('⚙️ Allocation management configuration updated:', {
      minAllocationPercent: this.minAllocationPercent,
      maxAllocationPercent: this.maxAllocationPercent,
      minLiquidityUSD: this.minLiquidityUSD,
      driftThreshold: this.driftThreshold
    });
  }

  /**
   * Clear caches and reset state
   */
  clearCache() {
    this.liquidityCache.clear();
    console.log('🧹 Allocation management cache cleared');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.liquidityCache.clear();
    this.allocationHistory = [];
    this.manualTrades = [];
    this.driftNotifications = [];
    this.currentAllocations = {};
    this.targetAllocations = {};
    this.autoDistributeMode = false;
    
    this.state = {
      isInitialized: false,
      currentAllocations: {},
      targetAllocations: {},
      supportedTokens: [],
      autoDistributeMode: false,
      lastUpdate: null
    };
    
    this.updateStateStore();
    this.isInitialized = false;
    
    console.log('🧹 Allocation Management Service cleaned up');
  }
}

// Create and export singleton instance
export const allocationManagementService = new AllocationManagementService();

export default allocationManagementService;