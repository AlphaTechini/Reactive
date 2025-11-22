/**
 * Advanced Risk Management Service
 * 
 * Implements trailing stop-loss, multi-condition risk triggers, and panic mode execution
 * as specified in requirements 3.1, 3.2, 3.3, 3.4
 */

import { writable } from 'svelte/store';
import { enhancedPriceDisplayService } from './EnhancedPriceDisplayService.js';
import { PercentageCalculator } from '../utils/PercentageCalculator.js';

// Risk management constants
const DEFAULT_TRAILING_STOP_PERCENT = 0.05; // 5% trailing stop
const DEFAULT_STOP_LOSS_PERCENT = 0.10; // 10% stop loss
const DEFAULT_TAKE_PROFIT_PERCENT = 0.20; // 20% take profit
const PANIC_MODE_TIMEOUT = 60000; // 60 seconds for panic mode execution
const RISK_EVALUATION_INTERVAL = 5000; // 5 seconds between risk evaluations
const COOLDOWN_PERIOD = 300000; // 5 minutes cooldown between risk executions
const PRICE_STALENESS_THRESHOLD = 300000; // 5 minutes price staleness threshold

// Risk trigger priorities (higher number = higher priority)
const RISK_PRIORITIES = {
  'panic_mode': 1000,
  'stop_loss': 900,
  'trailing_stop': 800,
  'take_profit': 700,
  'position_limit': 600
};

// Reactive stores for risk management state
export const riskManagementStateStore = writable({
  isActive: false,
  panicModeActive: false,
  activeTriggers: [],
  lastExecution: null,
  cooldownUntil: null
});

export const riskParametersStore = writable({});
export const riskTriggersStore = writable({});

class RiskManagementService {
  constructor() {
    this.isInitialized = false;
    this.riskParameters = new Map(); // tokenAddress -> risk parameters
    this.activeTriggers = new Map(); // tokenAddress -> active triggers
    this.executionHistory = [];
    this.cooldownTimers = new Map(); // tokenAddress -> cooldown end time
    this.priceHistory = new Map(); // tokenAddress -> price history for trailing stops
    
    // State management
    this.state = {
      isActive: false,
      panicModeActive: false,
      activeTriggers: [],
      lastExecution: null,
      cooldownUntil: null
    };
    
    // Risk evaluation timer
    this.evaluationTimer = null;
    this.isEvaluating = false;
    
    // Panic mode state
    this.panicModeState = {
      active: false,
      startTime: null,
      progress: 0,
      conversions: [],
      errors: []
    };
  }

  /**
   * Initialize the risk management service
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('🛡️ Risk management service already initialized');
      return;
    }

    console.log('🚀 Initializing Risk Management Service...');
    
    try {
      // Ensure price service is initialized
      if (!enhancedPriceDisplayService.isInitialized) {
        await enhancedPriceDisplayService.initialize();
      }
      
      // Set default configuration
      this.defaultRiskLevel = options.defaultRiskLevel || 'moderate';
      this.autoEvaluate = options.autoEvaluate !== false; // Default to true
      this.evaluationInterval = options.evaluationInterval || RISK_EVALUATION_INTERVAL;
      
      this.isInitialized = true;
      console.log('✅ Risk Management Service initialized successfully');
      
      // Start automatic risk evaluation if enabled
      if (this.autoEvaluate) {
        this.startRiskEvaluation();
      }
      
      // Update state store
      this.updateStateStore();
      
    } catch (error) {
      console.error('❌ Failed to initialize Risk Management Service:', error);
      throw error;
    }
  }

  /**
   * Set trailing stop-loss for a token
   * Implements requirement 3.1 - trailing stop-loss calculation and adjustment logic
   */
  async setTrailingStopLoss(tokenAddress, trailPercent, stopPercent, options = {}) {
    console.log(`🎯 Setting trailing stop-loss for ${tokenAddress}: trail ${(trailPercent * 100).toFixed(2)}%, stop ${(stopPercent * 100).toFixed(2)}%`);
    
    if (!tokenAddress || typeof trailPercent !== 'number' || typeof stopPercent !== 'number') {
      throw new Error('Token address, trail percent, and stop percent are required');
    }
    
    if (trailPercent <= 0 || trailPercent > 0.5 || stopPercent <= 0 || stopPercent > 0.5) {
      throw new Error('Trail and stop percentages must be between 0% and 50%');
    }
    
    if (trailPercent >= stopPercent) {
      throw new Error('Trail percentage must be less than stop percentage');
    }
    
    // Get current price for initialization
    const priceData = enhancedPriceDisplayService.getPrice(tokenAddress);
    if (!priceData) {
      throw new Error(`Price data not available for token: ${tokenAddress}`);
    }
    
    const currentPrice = priceData.price;
    
    // Initialize or update risk parameters
    const existingParams = this.riskParameters.get(tokenAddress) || {};
    const riskParams = {
      ...existingParams,
      trailingStop: {
        enabled: true,
        trailPercent,
        stopPercent,
        highWaterMark: currentPrice, // Track highest price seen
        stopPrice: currentPrice * (1 - stopPercent), // Initial stop price
        lastUpdate: Date.now(),
        liquidationPercent: options.liquidationPercent || 0.5, // Default 50% liquidation
        ...options
      }
    };
    
    this.riskParameters.set(tokenAddress, riskParams);
    
    // Initialize price history for this token
    if (!this.priceHistory.has(tokenAddress)) {
      this.priceHistory.set(tokenAddress, []);
    }
    
    // Add current price to history
    this.addPriceToHistory(tokenAddress, currentPrice);
    
    console.log(`✅ Trailing stop-loss set: stop price ${riskParams.trailingStop.stopPrice.toFixed(6)}`);
    
    // Update stores
    this.updateRiskParametersStore();
    
    return riskParams.trailingStop;
  }

  /**
   * Update risk parameters for a token
   */
  async updateRiskParameters(tokenAddress, parameters) {
    console.log(`⚙️ Updating risk parameters for ${tokenAddress}`);
    
    if (!tokenAddress || !parameters) {
      throw new Error('Token address and parameters are required');
    }
    
    // Validate parameters against current market conditions
    const validation = await this.validateRiskParameters(tokenAddress, parameters);
    if (!validation.isValid) {
      throw new Error(`Risk parameter validation failed: ${validation.errors.join(', ')}`);
    }
    
    const existingParams = this.riskParameters.get(tokenAddress) || {};
    const updatedParams = { ...existingParams, ...parameters };
    
    // Update timestamps
    if (parameters.stopLoss) {
      updatedParams.stopLoss.lastUpdate = Date.now();
    }
    if (parameters.takeProfit) {
      updatedParams.takeProfit.lastUpdate = Date.now();
    }
    if (parameters.trailingStop) {
      updatedParams.trailingStop.lastUpdate = Date.now();
    }
    
    this.riskParameters.set(tokenAddress, updatedParams);
    
    console.log(`✅ Risk parameters updated for ${tokenAddress}`);
    
    // Update stores
    this.updateRiskParametersStore();
    
    return updatedParams;
  }

  /**
   * Validate risk parameters against current market conditions
   * Implements requirement 3.3 - risk parameter validation
   */
  async validateRiskParameters(tokenAddress, parameters) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // Get current price data
    const priceData = enhancedPriceDisplayService.getPrice(tokenAddress);
    if (!priceData) {
      validation.errors.push('Price data not available for validation');
      validation.isValid = false;
      return validation;
    }
    
    const currentPrice = priceData.price;
    
    // Validate stop-loss parameters
    if (parameters.stopLoss) {
      const { percent, price } = parameters.stopLoss;
      
      if (percent && (percent <= 0 || percent > 0.5)) {
        validation.errors.push('Stop-loss percentage must be between 0% and 50%');
        validation.isValid = false;
      }
      
      if (price && price >= currentPrice) {
        validation.errors.push('Stop-loss price must be below current price');
        validation.isValid = false;
      }
      
      // Check if stop-loss is too close to current price (might trigger immediately)
      if (percent && percent < 0.02) {
        validation.warnings.push('Stop-loss percentage is very tight (< 2%), may trigger frequently');
      }
    }
    
    // Validate take-profit parameters
    if (parameters.takeProfit) {
      const { percent, price } = parameters.takeProfit;
      
      if (percent && (percent <= 0 || percent > 2.0)) {
        validation.errors.push('Take-profit percentage must be between 0% and 200%');
        validation.isValid = false;
      }
      
      if (price && price <= currentPrice) {
        validation.errors.push('Take-profit price must be above current price');
        validation.isValid = false;
      }
    }
    
    // Validate trailing stop parameters
    if (parameters.trailingStop) {
      const { trailPercent, stopPercent } = parameters.trailingStop;
      
      if (trailPercent && (trailPercent <= 0 || trailPercent > 0.5)) {
        validation.errors.push('Trailing stop trail percentage must be between 0% and 50%');
        validation.isValid = false;
      }
      
      if (stopPercent && (stopPercent <= 0 || stopPercent > 0.5)) {
        validation.errors.push('Trailing stop stop percentage must be between 0% and 50%');
        validation.isValid = false;
      }
      
      if (trailPercent && stopPercent && trailPercent >= stopPercent) {
        validation.errors.push('Trail percentage must be less than stop percentage');
        validation.isValid = false;
      }
    }
    
    // Validate liquidation percentages
    const liquidationPercents = [
      parameters.stopLoss?.liquidationPercent,
      parameters.takeProfit?.liquidationPercent,
      parameters.trailingStop?.liquidationPercent
    ].filter(p => p !== undefined);
    
    for (const percent of liquidationPercents) {
      if (percent <= 0 || percent > 1.0) {
        validation.errors.push('Liquidation percentage must be between 0% and 100%');
        validation.isValid = false;
      }
    }
    
    return validation;
  }

  /**
   * Evaluate risk triggers for all tokens or specific token
   * Implements requirement 3.1, 3.2 - risk trigger evaluation system
   */
  async evaluateRiskTriggers(tokenAddress = null) {
    if (!this.isInitialized) {
      return [];
    }
    
    const tokensToEvaluate = tokenAddress 
      ? [tokenAddress] 
      : Array.from(this.riskParameters.keys());
    
    const triggeredRisks = [];
    
    for (const token of tokensToEvaluate) {
      try {
        const triggers = await this.evaluateTokenRiskTriggers(token);
        if (triggers.length > 0) {
          triggeredRisks.push(...triggers);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to evaluate risk triggers for ${token}:`, error.message);
      }
    }
    
    // Sort triggers by priority (requirement 3.3 - prioritize stop-loss over take-profit)
    triggeredRisks.sort((a, b) => {
      const priorityA = RISK_PRIORITIES[a.type] || 0;
      const priorityB = RISK_PRIORITIES[b.type] || 0;
      return priorityB - priorityA; // Higher priority first
    });
    
    // Update active triggers
    this.state.activeTriggers = triggeredRisks;
    this.updateTriggersStore();
    
    return triggeredRisks;
  }

  /**
   * Evaluate risk triggers for a specific token
   */
  async evaluateTokenRiskTriggers(tokenAddress) {
    const riskParams = this.riskParameters.get(tokenAddress);
    if (!riskParams) {
      return [];
    }
    
    // Check if token is in cooldown
    if (this.isInCooldown(tokenAddress)) {
      return [];
    }
    
    // Get current price data
    const priceData = enhancedPriceDisplayService.getPrice(tokenAddress);
    if (!priceData) {
      console.warn(`⚠️ No price data available for ${tokenAddress}`);
      return [];
    }
    
    // Check if price data is stale
    if (enhancedPriceDisplayService.isPriceStale(tokenAddress)) {
      console.warn(`⚠️ Price data is stale for ${tokenAddress}`);
      return [];
    }
    
    const currentPrice = priceData.price;
    const triggers = [];
    
    // Update price history and trailing stops
    this.addPriceToHistory(tokenAddress, currentPrice);
    this.updateTrailingStops(tokenAddress, currentPrice);
    
    // Evaluate trailing stop-loss
    if (riskParams.trailingStop?.enabled) {
      const trailingTrigger = this.evaluateTrailingStop(tokenAddress, currentPrice, riskParams.trailingStop);
      if (trailingTrigger) {
        triggers.push(trailingTrigger);
      }
    }
    
    // Evaluate regular stop-loss
    if (riskParams.stopLoss?.enabled) {
      const stopTrigger = this.evaluateStopLoss(tokenAddress, currentPrice, riskParams.stopLoss);
      if (stopTrigger) {
        triggers.push(stopTrigger);
      }
    }
    
    // Evaluate take-profit
    if (riskParams.takeProfit?.enabled) {
      const profitTrigger = this.evaluateTakeProfit(tokenAddress, currentPrice, riskParams.takeProfit);
      if (profitTrigger) {
        triggers.push(profitTrigger);
      }
    }
    
    // Evaluate position limits
    if (riskParams.positionLimit?.enabled) {
      const limitTrigger = this.evaluatePositionLimit(tokenAddress, riskParams.positionLimit);
      if (limitTrigger) {
        triggers.push(limitTrigger);
      }
    }
    
    return triggers;
  }

  /**
   * Update trailing stop prices based on current price
   * Implements requirement 3.1 - trailing stop price adjustment mechanism
   */
  updateTrailingStops(tokenAddress, currentPrice) {
    const riskParams = this.riskParameters.get(tokenAddress);
    if (!riskParams?.trailingStop?.enabled) {
      return;
    }
    
    const trailingStop = riskParams.trailingStop;
    
    // Update high water mark if current price is higher
    if (currentPrice > trailingStop.highWaterMark) {
      trailingStop.highWaterMark = currentPrice;
      
      // Adjust stop price based on new high water mark
      const newStopPrice = trailingStop.highWaterMark * (1 - trailingStop.trailPercent);
      
      // Only update if new stop price is higher (trailing up)
      if (newStopPrice > trailingStop.stopPrice) {
        trailingStop.stopPrice = newStopPrice;
        trailingStop.lastUpdate = Date.now();
        
        console.log(`📈 Trailing stop updated for ${tokenAddress}: new stop price ${newStopPrice.toFixed(6)}`);
        
        // Update stores
        this.updateRiskParametersStore();
      }
    }
  }

  /**
   * Evaluate trailing stop-loss trigger
   */
  evaluateTrailingStop(tokenAddress, currentPrice, trailingStopParams) {
    if (currentPrice <= trailingStopParams.stopPrice) {
      return {
        type: 'trailing_stop',
        tokenAddress,
        triggerPrice: trailingStopParams.stopPrice,
        currentPrice,
        liquidationPercent: trailingStopParams.liquidationPercent,
        priority: RISK_PRIORITIES.trailing_stop,
        timestamp: Date.now(),
        parameters: trailingStopParams
      };
    }
    return null;
  }

  /**
   * Evaluate regular stop-loss trigger
   */
  evaluateStopLoss(tokenAddress, currentPrice, stopLossParams) {
    const triggerPrice = stopLossParams.price || 
                        (stopLossParams.basePrice * (1 - stopLossParams.percent));
    
    if (currentPrice <= triggerPrice) {
      return {
        type: 'stop_loss',
        tokenAddress,
        triggerPrice,
        currentPrice,
        liquidationPercent: stopLossParams.liquidationPercent || 1.0,
        priority: RISK_PRIORITIES.stop_loss,
        timestamp: Date.now(),
        parameters: stopLossParams
      };
    }
    return null;
  }

  /**
   * Evaluate take-profit trigger
   */
  evaluateTakeProfit(tokenAddress, currentPrice, takeProfitParams) {
    const triggerPrice = takeProfitParams.price || 
                        (takeProfitParams.basePrice * (1 + takeProfitParams.percent));
    
    if (currentPrice >= triggerPrice) {
      return {
        type: 'take_profit',
        tokenAddress,
        triggerPrice,
        currentPrice,
        liquidationPercent: takeProfitParams.liquidationPercent || 0.5,
        priority: RISK_PRIORITIES.take_profit,
        timestamp: Date.now(),
        parameters: takeProfitParams
      };
    }
    return null;
  }

  /**
   * Evaluate position limit trigger
   */
  evaluatePositionLimit(tokenAddress, positionLimitParams) {
    // This would integrate with portfolio data to check position sizes
    // For now, return null as placeholder
    return null;
  }

  /**
   * Add price to history for trailing stop calculations
   */
  addPriceToHistory(tokenAddress, price) {
    if (!this.priceHistory.has(tokenAddress)) {
      this.priceHistory.set(tokenAddress, []);
    }
    
    const history = this.priceHistory.get(tokenAddress);
    history.push({
      price,
      timestamp: Date.now()
    });
    
    // Keep only last 100 price points
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Check if token is in cooldown period
   * Implements requirement 3.5 - cooldown periods between risk executions
   */
  isInCooldown(tokenAddress) {
    const cooldownEnd = this.cooldownTimers.get(tokenAddress);
    if (!cooldownEnd) {
      return false;
    }
    
    const now = Date.now();
    if (now >= cooldownEnd) {
      // Cooldown expired, remove it
      this.cooldownTimers.delete(tokenAddress);
      return false;
    }
    
    return true;
  }

  /**
   * Set cooldown period for a token
   */
  setCooldown(tokenAddress, duration = COOLDOWN_PERIOD) {
    const cooldownEnd = Date.now() + duration;
    this.cooldownTimers.set(tokenAddress, cooldownEnd);
    
    console.log(`⏰ Cooldown set for ${tokenAddress}: ${Math.ceil(duration / 1000)}s`);
  }

  /**
   * Execute panic mode - convert all non-stablecoin positions to USDC
   * Implements requirement 3.4 - panic mode execution with 60-second requirement
   */
  async executePanicMode(userAddress, options = {}) {
    console.log('🚨 PANIC MODE ACTIVATED - Converting all positions to USDC');
    
    if (this.panicModeState.active) {
      throw new Error('Panic mode already active');
    }
    
    // Initialize panic mode state
    this.panicModeState = {
      active: true,
      startTime: Date.now(),
      progress: 0,
      conversions: [],
      errors: [],
      userAddress,
      targetAsset: options.targetAsset || 'USDC',
      timeout: options.timeout || PANIC_MODE_TIMEOUT
    };
    
    this.state.panicModeActive = true;
    this.updateStateStore();
    
    try {
      // Get all user positions (this would integrate with portfolio service)
      const positions = await this.getUserPositions(userAddress);
      const nonStablecoinPositions = positions.filter(pos => 
        !this.isStablecoin(pos.tokenAddress) && pos.balance > 0
      );
      
      if (nonStablecoinPositions.length === 0) {
        console.log('✅ No non-stablecoin positions to convert');
        return this.completePanicMode('success', 'No positions to convert');
      }
      
      console.log(`🔄 Converting ${nonStablecoinPositions.length} positions to ${this.panicModeState.targetAsset}`);
      
      // Execute conversions with progress tracking
      const conversionPromises = nonStablecoinPositions.map((position, index) => 
        this.executePanicConversion(position, index, nonStablecoinPositions.length)
      );
      
      // Set timeout for panic mode execution
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Panic mode timeout exceeded')), this.panicModeState.timeout)
      );
      
      // Race between conversions and timeout
      await Promise.race([
        Promise.allSettled(conversionPromises),
        timeoutPromise
      ]);
      
      // Check results
      const successful = this.panicModeState.conversions.filter(c => c.status === 'success').length;
      const failed = this.panicModeState.conversions.filter(c => c.status === 'failed').length;
      
      const status = failed === 0 ? 'success' : (successful > 0 ? 'partial' : 'failed');
      const message = `Converted ${successful}/${nonStablecoinPositions.length} positions`;
      
      return this.completePanicMode(status, message);
      
    } catch (error) {
      console.error('❌ Panic mode execution failed:', error);
      return this.completePanicMode('failed', error.message);
    }
  }

  /**
   * Execute risk triggers with prioritization
   * Implements requirement 3.3 - priority system that favors stop-loss over take-profit
   */
  async executeRiskTriggers(triggers, options = {}) {
    console.log(`🎯 Executing ${triggers.length} risk triggers with prioritization`);
    
    if (!triggers || triggers.length === 0) {
      return { executed: [], failed: [], skipped: [] };
    }
    
    // Sort triggers by priority (already done in evaluateRiskTriggers)
    const prioritizedTriggers = [...triggers].sort((a, b) => {
      const priorityA = RISK_PRIORITIES[a.type] || 0;
      const priorityB = RISK_PRIORITIES[b.type] || 0;
      return priorityB - priorityA;
    });
    
    const results = {
      executed: [],
      failed: [],
      skipped: []
    };
    
    // Execute triggers in priority order
    for (const trigger of prioritizedTriggers) {
      try {
        // Check if token is in cooldown
        if (this.isInCooldown(trigger.tokenAddress)) {
          console.log(`⏰ Skipping trigger for ${trigger.tokenAddress} - in cooldown`);
          results.skipped.push({
            ...trigger,
            reason: 'cooldown_active',
            timestamp: Date.now()
          });
          continue;
        }
        
        // Validate trigger is still valid (price might have changed)
        const isValid = await this.validateTriggerExecution(trigger);
        if (!isValid.valid) {
          console.log(`❌ Skipping invalid trigger for ${trigger.tokenAddress}: ${isValid.reason}`);
          results.skipped.push({
            ...trigger,
            reason: isValid.reason,
            timestamp: Date.now()
          });
          continue;
        }
        
        // Execute the trigger
        const executionResult = await this.executeSingleRiskTrigger(trigger, options);
        results.executed.push(executionResult);
        
        // Set cooldown for this token
        this.setCooldown(trigger.tokenAddress);
        
        console.log(`✅ Risk trigger executed: ${trigger.type} for ${trigger.tokenAddress}`);
        
      } catch (error) {
        console.error(`❌ Risk trigger execution failed:`, error);
        results.failed.push({
          ...trigger,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // Update execution history
    this.executionHistory.push({
      type: 'risk_triggers',
      timestamp: Date.now(),
      results,
      triggerCount: triggers.length
    });
    
    // Update state
    this.state.lastExecution = Date.now();
    this.updateStateStore();
    
    console.log(`🎯 Risk trigger execution complete: ${results.executed.length} executed, ${results.failed.length} failed, ${results.skipped.length} skipped`);
    
    return results;
  }

  /**
   * Validate that a trigger is still valid for execution
   */
  async validateTriggerExecution(trigger) {
    // Get current price data
    const priceData = enhancedPriceDisplayService.getPrice(trigger.tokenAddress);
    if (!priceData) {
      return { valid: false, reason: 'price_data_unavailable' };
    }
    
    // Check if price data is stale
    if (enhancedPriceDisplayService.isPriceStale(trigger.tokenAddress)) {
      return { valid: false, reason: 'price_data_stale' };
    }
    
    const currentPrice = priceData.price;
    
    // Validate trigger condition is still met
    switch (trigger.type) {
      case 'stop_loss':
      case 'trailing_stop':
        if (currentPrice > trigger.triggerPrice) {
          return { valid: false, reason: 'price_above_trigger' };
        }
        break;
        
      case 'take_profit':
        if (currentPrice < trigger.triggerPrice) {
          return { valid: false, reason: 'price_below_trigger' };
        }
        break;
        
      default:
        return { valid: true, reason: null };
    }
    
    return { valid: true, reason: null };
  }

  /**
   * Execute a single risk trigger
   */
  async executeSingleRiskTrigger(trigger, options = {}) {
    console.log(`🔥 Executing ${trigger.type} trigger for ${trigger.tokenAddress}`);
    
    const execution = {
      id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: trigger.type,
      tokenAddress: trigger.tokenAddress,
      triggerPrice: trigger.triggerPrice,
      liquidationPercent: trigger.liquidationPercent,
      startTime: Date.now(),
      endTime: null,
      status: 'in_progress',
      transactionHash: null,
      executedAmount: 0,
      receivedAmount: 0,
      error: null
    };
    
    try {
      // Get current position for this token
      const position = await this.getTokenPosition(trigger.tokenAddress);
      if (!position || position.balance <= 0) {
        throw new Error('No position found for liquidation');
      }
      
      // Calculate liquidation amount
      const liquidationAmount = position.balance * trigger.liquidationPercent;
      
      // Execute partial position liquidation
      const liquidationResult = await this.executePartialLiquidation(
        trigger.tokenAddress,
        liquidationAmount,
        trigger.type,
        options
      );
      
      // Update execution result
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.transactionHash = liquidationResult.transactionHash;
      execution.executedAmount = liquidationResult.executedAmount;
      execution.receivedAmount = liquidationResult.receivedAmount;
      execution.executionPrice = liquidationResult.executionPrice;
      execution.slippage = liquidationResult.slippage;
      
      console.log(`✅ Risk trigger executed successfully: ${execution.executedAmount} tokens liquidated`);
      
      return execution;
      
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.error = error.message;
      
      throw error;
    }
  }

  /**
   * Execute partial position liquidation with user-defined percentages
   * Implements requirement 3.2 - partial position liquidation
   */
  async executePartialLiquidation(tokenAddress, amount, triggerType, options = {}) {
    console.log(`💰 Executing partial liquidation: ${amount} tokens of ${tokenAddress}`);
    
    // Simulate liquidation execution (would integrate with DEX in production)
    if (options.dryRun) {
      return {
        transactionHash: `0x${'0'.repeat(64)}`,
        executedAmount: amount,
        receivedAmount: amount * 1800, // Mock price
        executionPrice: 1800,
        slippage: 0,
        timestamp: Date.now()
      };
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05 && !options.forceSuccess) {
      throw new Error(`Liquidation failed: ${['Insufficient liquidity', 'Slippage exceeded', 'Network error'][Math.floor(Math.random() * 3)]}`);
    }
    
    // Simulate successful liquidation
    const executionPrice = 1800 + Math.random() * 400; // $1800-$2200 range
    const slippage = Math.random() * 0.02; // 0-2% slippage
    const executedAmount = amount * (0.98 + Math.random() * 0.02); // 98-100% execution
    const receivedAmount = executedAmount * executionPrice * (1 - slippage);
    
    return {
      transactionHash: `0x${Math.random().toString(16).substr(2, 64).padStart(64, '0')}`,
      executedAmount,
      receivedAmount,
      executionPrice,
      slippage,
      timestamp: Date.now()
    };
  }

  /**
   * Get token position (placeholder - would integrate with portfolio service)
   */
  async getTokenPosition(tokenAddress) {
    // This would integrate with the actual portfolio service
    // For now, return mock data
    const mockPositions = {
      '0x1': { tokenAddress: '0x1', symbol: 'BTC', balance: 0.5 },
      '0x2': { tokenAddress: '0x2', symbol: 'ETH', balance: 2.0 },
      '0x3': { tokenAddress: '0x3', symbol: 'USDC', balance: 1000 }
    };
    
    return mockPositions[tokenAddress] || null;
  }

  /**
   * Calculate optimal liquidation percentage based on risk level and market conditions
   */
  calculateOptimalLiquidationPercent(tokenAddress, triggerType, riskLevel = 'moderate') {
    const basePercentages = {
      'conservative': {
        'stop_loss': 1.0,      // 100% liquidation
        'trailing_stop': 0.75,  // 75% liquidation
        'take_profit': 0.5      // 50% liquidation
      },
      'moderate': {
        'stop_loss': 0.75,      // 75% liquidation
        'trailing_stop': 0.5,   // 50% liquidation
        'take_profit': 0.33     // 33% liquidation
      },
      'aggressive': {
        'stop_loss': 0.5,       // 50% liquidation
        'trailing_stop': 0.33,  // 33% liquidation
        'take_profit': 0.25     // 25% liquidation
      }
    };
    
    const basePercent = basePercentages[riskLevel]?.[triggerType] || 0.5;
    
    // Adjust based on market conditions (placeholder logic)
    const priceData = enhancedPriceDisplayService.getPrice(tokenAddress);
    if (priceData) {
      const volatility = Math.abs(priceData.percentageChange || 0) / 100;
      
      // Increase liquidation in high volatility
      if (volatility > 0.1) { // > 10% daily change
        return Math.min(basePercent * 1.2, 1.0);
      }
      
      // Decrease liquidation in low volatility
      if (volatility < 0.02) { // < 2% daily change
        return Math.max(basePercent * 0.8, 0.1);
      }
    }
    
    return basePercent;
  }

  /**
   * Execute a single panic mode conversion
   */
  async executePanicConversion(position, index, total) {
    const conversionId = `panic_${Date.now()}_${index}`;
    
    try {
      console.log(`🔄 Converting position ${index + 1}/${total}: ${position.balance} ${position.symbol}`);
      
      // Record conversion start
      const conversion = {
        id: conversionId,
        tokenAddress: position.tokenAddress,
        symbol: position.symbol,
        amount: position.balance,
        status: 'in_progress',
        startTime: Date.now(),
        endTime: null,
        transactionHash: null,
        error: null
      };
      
      this.panicModeState.conversions.push(conversion);
      
      // Execute the conversion (placeholder - would integrate with DEX)
      const result = await this.executeEmergencyConversion(position, this.panicModeState.targetAsset);
      
      // Update conversion result
      conversion.status = 'success';
      conversion.endTime = Date.now();
      conversion.transactionHash = result.transactionHash;
      conversion.executedAmount = result.executedAmount;
      conversion.receivedAmount = result.receivedAmount;
      
      // Update progress
      this.panicModeState.progress = ((index + 1) / total) * 100;
      
      console.log(`✅ Conversion ${index + 1}/${total} completed: ${result.receivedAmount} ${this.panicModeState.targetAsset}`);
      
    } catch (error) {
      console.error(`❌ Conversion ${index + 1}/${total} failed:`, error);
      
      // Update conversion with error
      const conversion = this.panicModeState.conversions.find(c => c.id === conversionId);
      if (conversion) {
        conversion.status = 'failed';
        conversion.endTime = Date.now();
        conversion.error = error.message;
      }
      
      this.panicModeState.errors.push({
        conversionId,
        tokenAddress: position.tokenAddress,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Execute emergency conversion (placeholder implementation)
   */
  async executeEmergencyConversion(position, targetAsset) {
    // Simulate conversion delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures (10% failure rate in panic mode)
    if (Math.random() < 0.1) {
      throw new Error(`Emergency conversion failed: ${['Insufficient liquidity', 'Network congestion', 'Slippage too high'][Math.floor(Math.random() * 3)]}`);
    }
    
    // Simulate successful conversion
    const executedAmount = position.balance * (0.95 + Math.random() * 0.05); // 95-100% execution
    const conversionRate = 1800 + Math.random() * 400; // Simulate price between $1800-$2200
    const receivedAmount = executedAmount * conversionRate;
    
    return {
      transactionHash: `0x${Math.random().toString(16).substr(2, 64).padStart(64, '0')}`,
      executedAmount,
      receivedAmount,
      conversionRate,
      timestamp: Date.now()
    };
  }

  /**
   * Get panic mode progress and status
   * Implements requirement 3.4 - progress tracking for 60-second execution
   */
  getPanicModeProgress() {
    if (!this.panicModeState.active) {
      return null;
    }
    
    const elapsed = Date.now() - this.panicModeState.startTime;
    const timeRemaining = Math.max(0, this.panicModeState.timeout - elapsed);
    const timeProgress = (elapsed / this.panicModeState.timeout) * 100;
    
    return {
      active: this.panicModeState.active,
      progress: this.panicModeState.progress,
      timeProgress: Math.min(timeProgress, 100),
      timeRemaining,
      timeElapsed: elapsed,
      timeout: this.panicModeState.timeout,
      conversionsTotal: this.panicModeState.conversions.length,
      conversionsCompleted: this.panicModeState.conversions.filter(c => c.status !== 'in_progress').length,
      conversionsSuccessful: this.panicModeState.conversions.filter(c => c.status === 'success').length,
      conversionsFailed: this.panicModeState.conversions.filter(c => c.status === 'failed').length,
      errors: this.panicModeState.errors.length,
      isNearTimeout: timeRemaining < 10000, // Less than 10 seconds remaining
      estimatedCompletion: this.estimatePanicModeCompletion()
    };
  }

  /**
   * Estimate panic mode completion time based on current progress
   */
  estimatePanicModeCompletion() {
    if (!this.panicModeState.active) {
      return null;
    }
    
    const completed = this.panicModeState.conversions.filter(c => c.status !== 'in_progress').length;
    const total = this.panicModeState.conversions.length;
    const elapsed = Date.now() - this.panicModeState.startTime;
    
    if (completed === 0) {
      return this.panicModeState.startTime + this.panicModeState.timeout;
    }
    
    const avgTimePerConversion = elapsed / completed;
    const remaining = total - completed;
    const estimatedTimeRemaining = remaining * avgTimePerConversion;
    
    return Date.now() + estimatedTimeRemaining;
  }

  /**
   * Cancel panic mode execution
   * Implements requirement 3.4 - panic mode state management and recovery
   */
  async cancelPanicMode(reason = 'user_cancelled') {
    if (!this.panicModeState.active) {
      throw new Error('Panic mode is not active');
    }
    
    console.log(`🛑 Cancelling panic mode: ${reason}`);
    
    const cancelTime = Date.now();
    const duration = cancelTime - this.panicModeState.startTime;
    
    // Mark any in-progress conversions as cancelled
    for (const conversion of this.panicModeState.conversions) {
      if (conversion.status === 'in_progress') {
        conversion.status = 'cancelled';
        conversion.endTime = cancelTime;
        conversion.error = `Cancelled: ${reason}`;
      }
    }
    
    const result = {
      status: 'cancelled',
      reason,
      startTime: this.panicModeState.startTime,
      endTime: cancelTime,
      duration,
      conversions: [...this.panicModeState.conversions],
      errors: [...this.panicModeState.errors],
      progress: this.panicModeState.progress,
      withinTimeout: duration <= this.panicModeState.timeout,
      completedConversions: this.panicModeState.conversions.filter(c => c.status === 'success').length,
      failedConversions: this.panicModeState.conversions.filter(c => c.status === 'failed').length,
      cancelledConversions: this.panicModeState.conversions.filter(c => c.status === 'cancelled').length
    };
    
    // Reset panic mode state
    this.panicModeState = {
      active: false,
      startTime: null,
      progress: 0,
      conversions: [],
      errors: []
    };
    
    this.state.panicModeActive = false;
    this.updateStateStore();
    
    // Add to execution history
    this.executionHistory.push({
      type: 'panic_mode',
      ...result
    });
    
    console.log(`🛑 Panic mode cancelled: ${result.completedConversions} completed, ${result.failedConversions} failed, ${result.cancelledConversions} cancelled`);
    
    return result;
  }

  /**
   * Resume panic mode execution after recovery
   * Implements requirement 3.4 - panic mode recovery
   */
  async resumePanicMode(previousState) {
    if (this.panicModeState.active) {
      throw new Error('Panic mode is already active');
    }
    
    console.log('🔄 Resuming panic mode execution from previous state');
    
    // Restore panic mode state
    this.panicModeState = {
      active: true,
      startTime: previousState.startTime || Date.now(),
      progress: previousState.progress || 0,
      conversions: previousState.conversions || [],
      errors: previousState.errors || [],
      userAddress: previousState.userAddress,
      targetAsset: previousState.targetAsset || 'USDC',
      timeout: previousState.timeout || PANIC_MODE_TIMEOUT
    };
    
    this.state.panicModeActive = true;
    this.updateStateStore();
    
    try {
      // Find incomplete conversions
      const incompleteConversions = this.panicModeState.conversions.filter(c => 
        c.status === 'in_progress' || c.status === 'failed'
      );
      
      if (incompleteConversions.length === 0) {
        console.log('✅ All conversions already completed');
        return this.completePanicMode('success', 'All conversions completed during resume');
      }
      
      // Check if we still have time
      const elapsed = Date.now() - this.panicModeState.startTime;
      const timeRemaining = this.panicModeState.timeout - elapsed;
      
      if (timeRemaining <= 0) {
        console.log('⏰ Panic mode timeout exceeded during resume');
        return this.completePanicMode('timeout', 'Timeout exceeded during resume');
      }
      
      console.log(`🔄 Resuming ${incompleteConversions.length} incomplete conversions with ${Math.ceil(timeRemaining / 1000)}s remaining`);
      
      // Retry failed conversions and complete in-progress ones
      const retryPromises = incompleteConversions.map((conversion, index) => 
        this.retryPanicConversion(conversion, index, incompleteConversions.length)
      );
      
      // Set timeout for remaining time
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Panic mode timeout exceeded during resume')), timeRemaining)
      );
      
      // Race between retries and timeout
      await Promise.race([
        Promise.allSettled(retryPromises),
        timeoutPromise
      ]);
      
      // Check final results
      const successful = this.panicModeState.conversions.filter(c => c.status === 'success').length;
      const failed = this.panicModeState.conversions.filter(c => c.status === 'failed').length;
      const total = this.panicModeState.conversions.length;
      
      const status = failed === 0 ? 'success' : (successful > 0 ? 'partial' : 'failed');
      const message = `Resumed and completed ${successful}/${total} conversions`;
      
      return this.completePanicMode(status, message);
      
    } catch (error) {
      console.error('❌ Panic mode resume failed:', error);
      return this.completePanicMode('failed', `Resume failed: ${error.message}`);
    }
  }

  /**
   * Retry a failed or incomplete panic conversion
   */
  async retryPanicConversion(conversion, index, total) {
    try {
      console.log(`🔄 Retrying conversion ${index + 1}/${total}: ${conversion.symbol}`);
      
      // Update conversion status
      conversion.status = 'in_progress';
      conversion.retryCount = (conversion.retryCount || 0) + 1;
      conversion.lastRetry = Date.now();
      
      // Get fresh position data
      const position = await this.getTokenPosition(conversion.tokenAddress);
      if (!position || position.balance <= 0) {
        throw new Error('Position no longer exists or has zero balance');
      }
      
      // Execute the retry
      const result = await this.executeEmergencyConversion(position, this.panicModeState.targetAsset);
      
      // Update conversion result
      conversion.status = 'success';
      conversion.endTime = Date.now();
      conversion.transactionHash = result.transactionHash;
      conversion.executedAmount = result.executedAmount;
      conversion.receivedAmount = result.receivedAmount;
      
      console.log(`✅ Retry ${index + 1}/${total} successful: ${result.receivedAmount} ${this.panicModeState.targetAsset}`);
      
    } catch (error) {
      console.error(`❌ Retry ${index + 1}/${total} failed:`, error);
      
      conversion.status = 'failed';
      conversion.endTime = Date.now();
      conversion.error = error.message;
      conversion.retryError = error.message;
      
      this.panicModeState.errors.push({
        conversionId: conversion.id,
        tokenAddress: conversion.tokenAddress,
        error: error.message,
        isRetry: true,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get panic mode execution statistics
   */
  getPanicModeStats() {
    const panicExecutions = this.executionHistory.filter(e => e.type === 'panic_mode');
    
    if (panicExecutions.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        averageConversions: 0,
        timeoutRate: 0
      };
    }
    
    const successful = panicExecutions.filter(e => e.status === 'success').length;
    const timedOut = panicExecutions.filter(e => !e.withinTimeout).length;
    const totalDuration = panicExecutions.reduce((sum, e) => sum + e.duration, 0);
    const totalConversions = panicExecutions.reduce((sum, e) => sum + e.conversions.length, 0);
    
    return {
      totalExecutions: panicExecutions.length,
      successRate: (successful / panicExecutions.length) * 100,
      averageDuration: totalDuration / panicExecutions.length,
      averageConversions: totalConversions / panicExecutions.length,
      timeoutRate: (timedOut / panicExecutions.length) * 100,
      lastExecution: panicExecutions[panicExecutions.length - 1]?.startTime || null
    };
  }

  /**
   * Complete panic mode execution
   */
  completePanicMode(status, message) {
    const endTime = Date.now();
    const duration = endTime - this.panicModeState.startTime;
    
    const result = {
      status,
      message,
      startTime: this.panicModeState.startTime,
      endTime,
      duration,
      conversions: [...this.panicModeState.conversions],
      errors: [...this.panicModeState.errors],
      progress: 100,
      withinTimeout: duration <= this.panicModeState.timeout,
      targetAsset: this.panicModeState.targetAsset,
      userAddress: this.panicModeState.userAddress
    };
    
    // Calculate summary statistics
    result.summary = {
      totalConversions: result.conversions.length,
      successfulConversions: result.conversions.filter(c => c.status === 'success').length,
      failedConversions: result.conversions.filter(c => c.status === 'failed').length,
      cancelledConversions: result.conversions.filter(c => c.status === 'cancelled').length,
      totalValueConverted: result.conversions
        .filter(c => c.status === 'success')
        .reduce((sum, c) => sum + (c.receivedAmount || 0), 0),
      averageConversionTime: this.calculateAverageConversionTime(result.conversions),
      errorCount: result.errors.length
    };
    
    // Reset panic mode state
    this.panicModeState = {
      active: false,
      startTime: null,
      progress: 0,
      conversions: [],
      errors: []
    };
    
    this.state.panicModeActive = false;
    this.updateStateStore();
    
    // Add to execution history
    this.executionHistory.push({
      type: 'panic_mode',
      ...result
    });
    
    console.log(`🚨 Panic mode completed: ${status} - ${message} (${duration}ms)`);
    console.log(`📊 Summary: ${result.summary.successfulConversions}/${result.summary.totalConversions} conversions, ${result.summary.totalValueConverted.toFixed(2)} ${result.targetAsset} received`);
    
    return result;
  }

  /**
   * Calculate average conversion time for completed conversions
   */
  calculateAverageConversionTime(conversions) {
    const completed = conversions.filter(c => c.endTime && c.startTime);
    if (completed.length === 0) return 0;
    
    const totalTime = completed.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);
    return totalTime / completed.length;
  }

  /**
   * Get user positions (placeholder - would integrate with portfolio service)
   */
  async getUserPositions(userAddress) {
    // This would integrate with the actual portfolio service
    // For now, return mock data
    return [
      { tokenAddress: '0x1', symbol: 'BTC', balance: 0.5, category: 'crypto' },
      { tokenAddress: '0x2', symbol: 'ETH', balance: 2.0, category: 'crypto' },
      { tokenAddress: '0x3', symbol: 'USDC', balance: 1000, category: 'stablecoin' }
    ];
  }

  /**
   * Check if token is a stablecoin
   */
  isStablecoin(tokenAddress) {
    // This would use actual token metadata
    // For now, simple check based on common stablecoin addresses/symbols
    const stablecoinSymbols = ['USDC', 'USDT', 'DAI', 'BUSD'];
    const stablecoinAddresses = ['0x3']; // Mock USDC address
    
    return stablecoinAddresses.includes(tokenAddress);
  }

  /**
   * Start automatic risk evaluation
   */
  startRiskEvaluation() {
    if (this.evaluationTimer) {
      return;
    }
    
    console.log('🔄 Starting automatic risk evaluation');
    
    this.evaluationTimer = setInterval(async () => {
      if (this.isEvaluating) {
        return; // Skip if already evaluating
      }
      
      try {
        this.isEvaluating = true;
        await this.evaluateRiskTriggers();
      } catch (error) {
        console.warn('⚠️ Risk evaluation error:', error.message);
      } finally {
        this.isEvaluating = false;
      }
    }, this.evaluationInterval);
  }

  /**
   * Stop automatic risk evaluation
   */
  stopRiskEvaluation() {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
      console.log('⏹️ Stopped automatic risk evaluation');
    }
  }

  /**
   * Update reactive stores
   */
  updateStateStore() {
    riskManagementStateStore.set(this.state);
  }

  updateRiskParametersStore() {
    const paramsObj = {};
    for (const [tokenAddress, params] of this.riskParameters) {
      paramsObj[tokenAddress] = params;
    }
    riskParametersStore.set(paramsObj);
  }

  updateTriggersStore() {
    const triggersObj = {};
    for (const [tokenAddress] of this.riskParameters) {
      const tokenTriggers = this.state.activeTriggers.filter(t => t.tokenAddress === tokenAddress);
      if (tokenTriggers.length > 0) {
        triggersObj[tokenAddress] = tokenTriggers;
      }
    }
    riskTriggersStore.set(triggersObj);
  }

  /**
   * Get risk management status and statistics
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isActive: this.state.isActive,
      panicModeActive: this.state.panicModeActive,
      autoEvaluate: this.autoEvaluate,
      evaluationInterval: this.evaluationInterval,
      managedTokens: this.riskParameters.size,
      activeTriggers: this.state.activeTriggers.length,
      executionHistory: this.executionHistory.length,
      cooldownTokens: this.cooldownTimers.size
    };
  }

  /**
   * Get risk parameters for a token
   */
  getRiskParameters(tokenAddress) {
    return this.riskParameters.get(tokenAddress) || null;
  }

  /**
   * Get all risk parameters
   */
  getAllRiskParameters() {
    const result = {};
    for (const [tokenAddress, params] of this.riskParameters) {
      result[tokenAddress] = params;
    }
    return result;
  }

  /**
   * Remove risk parameters for a token
   */
  removeRiskParameters(tokenAddress) {
    const removed = this.riskParameters.delete(tokenAddress);
    if (removed) {
      this.priceHistory.delete(tokenAddress);
      this.cooldownTimers.delete(tokenAddress);
      this.updateRiskParametersStore();
      console.log(`🗑️ Risk parameters removed for ${tokenAddress}`);
    }
    return removed;
  }

  /**
   * Get execution history with filtering
   */
  getExecutionHistory(options = {}) {
    const { limit = 10, offset = 0, type = null } = options;
    
    let filtered = [...this.executionHistory];
    
    if (type) {
      filtered = filtered.filter(execution => execution.type === type);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.startTime - a.startTime);
    
    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);
    
    return {
      executions: paginated,
      total: filtered.length,
      hasMore: offset + limit < filtered.length
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopRiskEvaluation();
    
    this.riskParameters.clear();
    this.activeTriggers.clear();
    this.executionHistory = [];
    this.cooldownTimers.clear();
    this.priceHistory.clear();
    
    this.state = {
      isActive: false,
      panicModeActive: false,
      activeTriggers: [],
      lastExecution: null,
      cooldownUntil: null
    };
    
    this.panicModeState = {
      active: false,
      startTime: null,
      progress: 0,
      conversions: [],
      errors: []
    };
    
    this.updateStateStore();
    this.updateRiskParametersStore();
    this.updateTriggersStore();
    
    this.isInitialized = false;
    
    console.log('🧹 Risk Management Service cleaned up');
  }
}

// Create and export singleton instance
export const riskManagementService = new RiskManagementService();

export default riskManagementService;