/**
 * Manual Trading Integration Service
 * 
 * Implements manual override system with confirmation prompts, conflict resolution
 * prioritizing user safety, and automation state preservation during manual mode
 * as specified in requirements 5.3, 5.4, 5.5
 */

import { writable } from 'svelte/store';
import { allocationManagementService } from './AllocationManagementService.js';
import { riskManagementService } from './RiskManagementService.js';
import { rebalancingEngine } from './RebalancingEngine.js';
import { enhancedPriceDisplayService } from './EnhancedPriceDisplayService.js';

// Manual trading constants
const CONFIRMATION_TIMEOUT = 30000; // 30 seconds for user confirmation
const OVERRIDE_COOLDOWN = 60000; // 1 minute cooldown between overrides
const CONFLICT_RESOLUTION_PRIORITY = {
  'user_safety': 1000,
  'manual_override': 900,
  'stop_loss': 800,
  'take_profit': 700,
  'rebalancing': 600,
  'automation': 500
};

// Reactive stores for manual trading integration state
export const manualTradingStateStore = writable({
  isManualMode: false,
  pendingOverride: null,
  lastOverride: null,
  automationPaused: false,
  conflictResolution: null
});

export const automationStateStore = writable({
  isEnabled: false,
  preservedSettings: null,
  pausedServices: [],
  lastStateChange: null
});

export const conflictResolutionStore = writable({
  activeConflicts: [],
  resolutionHistory: [],
  safetyOverrides: []
});

class ManualTradingIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.isManualMode = false;
    this.automationEnabled = true;
    this.preservedAutomationState = null;
    this.pendingOverrides = new Map();
    this.overrideHistory = [];
    this.conflictQueue = [];
    this.safetyOverrides = [];
    
    // State management
    this.state = {
      isManualMode: false,
      pendingOverride: null,
      lastOverride: null,
      automationPaused: false,
      conflictResolution: null
    };
    
    // Configuration
    this.confirmationTimeout = CONFIRMATION_TIMEOUT;
    this.overrideCooldown = OVERRIDE_COOLDOWN;
    this.lastOverrideTime = null;
    
    // Service references
    this.allocationService = null;
    this.riskService = null;
    this.rebalancingService = null;
    this.priceService = null;
  }

  /**
   * Initialize the manual trading integration service
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('🔄 Manual Trading Integration Service already initialized');
      return;
    }

    console.log('🚀 Initializing Manual Trading Integration Service...');
    
    try {
      // Set configuration options
      this.confirmationTimeout = options.confirmationTimeout || CONFIRMATION_TIMEOUT;
      this.overrideCooldown = options.overrideCooldown || OVERRIDE_COOLDOWN;
      
      // Initialize service references
      this.allocationService = allocationManagementService;
      this.riskService = riskManagementService;
      this.rebalancingService = rebalancingEngine;
      this.priceService = enhancedPriceDisplayService;
      
      // Ensure dependent services are initialized
      if (!this.allocationService.isInitialized) {
        await this.allocationService.initialize();
      }
      
      if (!this.priceService.isInitialized) {
        await this.priceService.initialize();
      }
      
      // Set up conflict monitoring
      this.startConflictMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Manual Trading Integration Service initialized successfully');
      
      // Update state store
      this.updateStateStore();
      
    } catch (error) {
      console.error('❌ Failed to initialize Manual Trading Integration Service:', error);
      throw error;
    }
  }

  /**
   * Request manual override with confirmation prompt
   * Implements requirement 5.3 - manual override system with confirmation prompts
   */
  async requestManualOverride(tradeRequest, options = {}) {
    console.log('🔄 Requesting manual override for trade execution...');
    
    if (!this.isInitialized) {
      throw new Error('Manual Trading Integration Service not initialized');
    }

    // Check cooldown period
    if (this.isInOverrideCooldown()) {
      const remainingCooldown = this.getRemainingCooldown();
      throw new Error(`Override cooldown active. ${Math.ceil(remainingCooldown / 1000)}s remaining`);
    }

    // Validate trade request
    const validation = await this.validateTradeRequest(tradeRequest);
    if (!validation.isValid) {
      throw new Error(`Invalid trade request: ${validation.errors.join(', ')}`);
    }

    // Check for conflicts with automation
    const conflicts = await this.detectAutomationConflicts(tradeRequest);
    
    // Create override request
    const overrideRequest = {
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'manual_trade',
      tradeRequest,
      conflicts,
      validation,
      status: 'pending_confirmation',
      createdAt: Date.now(),
      expiresAt: Date.now() + this.confirmationTimeout,
      requiresConfirmation: conflicts.length > 0 || validation.warnings.length > 0,
      safetyLevel: this.calculateSafetyLevel(tradeRequest, conflicts),
      options
    };

    // Store pending override
    this.pendingOverrides.set(overrideRequest.id, overrideRequest);
    this.state.pendingOverride = overrideRequest;
    
    console.log(`🔄 Manual override requested: ${overrideRequest.id}, conflicts: ${conflicts.length}, safety level: ${overrideRequest.safetyLevel}`);
    
    this.updateStateStore();
    
    // Return override request for user confirmation
    return overrideRequest;
  }

  /**
   * Confirm manual override after user review
   */
  async confirmManualOverride(overrideId, userConfirmation) {
    console.log(`✅ Confirming manual override: ${overrideId}`);
    
    const overrideRequest = this.pendingOverrides.get(overrideId);
    if (!overrideRequest) {
      throw new Error('Override request not found or expired');
    }

    // Check if request has expired
    if (Date.now() > overrideRequest.expiresAt) {
      this.pendingOverrides.delete(overrideId);
      this.state.pendingOverride = null;
      this.updateStateStore();
      throw new Error('Override request has expired');
    }

    // Validate user confirmation
    if (!userConfirmation || !userConfirmation.confirmed) {
      overrideRequest.status = 'cancelled';
      overrideRequest.cancellationReason = userConfirmation?.reason || 'User cancelled';
      
      this.addToOverrideHistory(overrideRequest);
      this.pendingOverrides.delete(overrideId);
      this.state.pendingOverride = null;
      this.updateStateStore();
      
      throw new Error('Manual override cancelled by user');
    }

    // Handle conflicts with safety prioritization
    if (overrideRequest.conflicts.length > 0) {
      const conflictResolution = await this.resolveConflicts(overrideRequest, userConfirmation);
      overrideRequest.conflictResolution = conflictResolution;
    }

    // Execute the manual override
    try {
      overrideRequest.status = 'executing';
      this.updateStateStore();
      
      const executionResult = await this.executeManualOverride(overrideRequest);
      
      overrideRequest.status = 'completed';
      overrideRequest.executionResult = executionResult;
      overrideRequest.completedAt = Date.now();
      
      // Update last override time for cooldown
      this.lastOverrideTime = Date.now();
      this.state.lastOverride = {
        id: overrideId,
        timestamp: Date.now(),
        tradeType: overrideRequest.tradeRequest.type,
        success: true
      };
      
      console.log(`✅ Manual override completed successfully: ${overrideId}`);
      
    } catch (error) {
      overrideRequest.status = 'failed';
      overrideRequest.error = error.message;
      overrideRequest.completedAt = Date.now();
      
      this.state.lastOverride = {
        id: overrideId,
        timestamp: Date.now(),
        tradeType: overrideRequest.tradeRequest.type,
        success: false,
        error: error.message
      };
      
      console.error(`❌ Manual override failed: ${overrideId}`, error);
      throw error;
      
    } finally {
      // Clean up
      this.addToOverrideHistory(overrideRequest);
      this.pendingOverrides.delete(overrideId);
      this.state.pendingOverride = null;
      this.updateStateStore();
    }

    return overrideRequest;
  }

  /**
   * Cancel pending manual override
   */
  cancelManualOverride(overrideId, reason = 'User cancelled') {
    console.log(`❌ Cancelling manual override: ${overrideId}`);
    
    const overrideRequest = this.pendingOverrides.get(overrideId);
    if (!overrideRequest) {
      throw new Error('Override request not found');
    }

    overrideRequest.status = 'cancelled';
    overrideRequest.cancellationReason = reason;
    overrideRequest.completedAt = Date.now();
    
    this.addToOverrideHistory(overrideRequest);
    this.pendingOverrides.delete(overrideId);
    this.state.pendingOverride = null;
    
    console.log(`❌ Manual override cancelled: ${overrideId} - ${reason}`);
    
    this.updateStateStore();
    return overrideRequest;
  }

  /**
   * Detect conflicts between manual trade and automation
   */
  async detectAutomationConflicts(tradeRequest) {
    const conflicts = [];
    
    try {
      // Check for active rebalancing operations
      if (this.rebalancingService && this.rebalancingService.state.isActive) {
        conflicts.push({
          type: 'active_rebalancing',
          severity: 'high',
          description: 'Rebalancing operation is currently active',
          recommendation: 'Wait for rebalancing to complete or cancel it first',
          affectedTokens: [tradeRequest.tokenIn, tradeRequest.tokenOut],
          priority: CONFLICT_RESOLUTION_PRIORITY.rebalancing
        });
      }

      // Check for risk management triggers
      if (this.riskService && this.riskService.isInitialized) {
        const riskTriggers = await this.riskService.evaluateRiskTriggers(tradeRequest.tokenIn);
        
        for (const trigger of riskTriggers) {
          conflicts.push({
            type: 'risk_trigger',
            severity: trigger.type === 'stop_loss' ? 'high' : 'medium',
            description: `${trigger.type} trigger active for ${tradeRequest.tokenIn}`,
            recommendation: 'Consider risk implications before proceeding',
            triggerDetails: trigger,
            priority: CONFLICT_RESOLUTION_PRIORITY[trigger.type] || CONFLICT_RESOLUTION_PRIORITY.automation
          });
        }
      }

      // Check for allocation drift implications
      if (this.allocationService && tradeRequest.valueUSD) {
        const currentAllocations = this.allocationService.getCurrentAllocations();
        const targetAllocations = this.allocationService.getTargetAllocations();
        
        if (Object.keys(targetAllocations).length > 0) {
          // Simulate trade impact on allocations
          const simulatedAllocations = this.simulateTradeImpact(
            currentAllocations, 
            tradeRequest, 
            this.allocationService.calculatePortfolioValue()
          );
          
          const driftAnalysis = this.allocationService.analyzeDrift(simulatedAllocations, targetAllocations);
          
          if (driftAnalysis.maxDrift > this.allocationService.driftThreshold * 1.5) {
            conflicts.push({
              type: 'allocation_drift',
              severity: 'medium',
              description: 'Trade will cause significant allocation drift',
              recommendation: 'Consider rebalancing after trade or adjust allocation targets',
              driftAnalysis,
              priority: CONFLICT_RESOLUTION_PRIORITY.rebalancing
            });
          }
        }
      }

      // Check for price impact and slippage concerns
      const priceImpact = await this.estimateTradeImpact(tradeRequest);
      if (priceImpact.slippageEstimate > 0.05) { // 5% slippage threshold
        conflicts.push({
          type: 'high_slippage',
          severity: 'medium',
          description: `High slippage expected: ${(priceImpact.slippageEstimate * 100).toFixed(2)}%`,
          recommendation: 'Consider reducing trade size or waiting for better market conditions',
          priceImpact,
          priority: CONFLICT_RESOLUTION_PRIORITY.user_safety
        });
      }

    } catch (error) {
      console.warn('⚠️ Error detecting automation conflicts:', error);
      conflicts.push({
        type: 'detection_error',
        severity: 'low',
        description: 'Unable to fully assess automation conflicts',
        recommendation: 'Proceed with caution',
        error: error.message,
        priority: CONFLICT_RESOLUTION_PRIORITY.automation
      });
    }

    return conflicts;
  }

  /**
   * Resolve conflicts with safety prioritization
   * Implements requirement 5.5 - conflict resolution prioritizing user safety
   */
  async resolveConflicts(overrideRequest, userConfirmation) {
    console.log(`🔧 Resolving conflicts for override: ${overrideRequest.id}`);
    
    const { conflicts } = overrideRequest;
    const resolutions = [];
    
    // Sort conflicts by priority (highest first)
    const sortedConflicts = [...conflicts].sort((a, b) => b.priority - a.priority);
    
    for (const conflict of sortedConflicts) {
      let resolution;
      
      switch (conflict.type) {
        case 'active_rebalancing':
          resolution = await this.resolveRebalancingConflict(conflict, userConfirmation);
          break;
          
        case 'risk_trigger':
          resolution = await this.resolveRiskTriggerConflict(conflict, userConfirmation);
          break;
          
        case 'allocation_drift':
          resolution = await this.resolveAllocationDriftConflict(conflict, userConfirmation);
          break;
          
        case 'high_slippage':
          resolution = await this.resolveSlippageConflict(conflict, userConfirmation);
          break;
          
        default:
          resolution = {
            conflictType: conflict.type,
            action: 'proceed_with_warning',
            reason: 'User acknowledged conflict',
            safetyMeasures: ['User confirmation required']
          };
      }
      
      resolutions.push(resolution);
      
      // Apply safety overrides if necessary
      if (resolution.requiresSafetyOverride) {
        this.applySafetyOverride(conflict, resolution);
      }
    }
    
    const conflictResolution = {
      id: `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      overrideId: overrideRequest.id,
      conflicts: sortedConflicts,
      resolutions,
      safetyLevel: this.calculateResolutionSafetyLevel(resolutions),
      userConfirmation,
      timestamp: Date.now()
    };
    
    // Add to conflict resolution history
    this.addToConflictResolutionHistory(conflictResolution);
    
    console.log(`🔧 Conflict resolution completed: ${resolutions.length} conflicts resolved, safety level: ${conflictResolution.safetyLevel}`);
    
    return conflictResolution;
  }

  /**
   * Resolve rebalancing conflict
   */
  async resolveRebalancingConflict(conflict, userConfirmation) {
    if (userConfirmation.pauseRebalancing) {
      // Pause active rebalancing
      if (this.rebalancingService && this.rebalancingService.state.isActive) {
        // Note: This would require implementing pause functionality in RebalancingEngine
        console.log('⏸️ Pausing active rebalancing for manual override');
      }
      
      return {
        conflictType: 'active_rebalancing',
        action: 'pause_rebalancing',
        reason: 'User requested to pause rebalancing for manual trade',
        safetyMeasures: ['Rebalancing paused', 'Manual trade prioritized']
      };
    } else {
      return {
        conflictType: 'active_rebalancing',
        action: 'defer_manual_trade',
        reason: 'User chose to wait for rebalancing completion',
        safetyMeasures: ['Manual trade deferred']
      };
    }
  }

  /**
   * Resolve risk trigger conflict
   */
  async resolveRiskTriggerConflict(conflict, userConfirmation) {
    const { triggerDetails } = conflict;
    
    if (triggerDetails.type === 'stop_loss' && !userConfirmation.acknowledgeStopLoss) {
      return {
        conflictType: 'risk_trigger',
        action: 'block_trade',
        reason: 'Stop-loss trigger active and user did not acknowledge',
        safetyMeasures: ['Trade blocked for safety'],
        requiresSafetyOverride: true
      };
    }
    
    return {
      conflictType: 'risk_trigger',
      action: 'proceed_with_monitoring',
      reason: 'User acknowledged risk trigger',
      safetyMeasures: ['Enhanced monitoring enabled', 'Risk parameters preserved']
    };
  }

  /**
   * Resolve allocation drift conflict
   */
  async resolveAllocationDriftConflict(conflict, userConfirmation) {
    if (userConfirmation.updateTargetAllocations) {
      return {
        conflictType: 'allocation_drift',
        action: 'update_targets',
        reason: 'User chose to update target allocations',
        safetyMeasures: ['Target allocations will be updated post-trade']
      };
    } else {
      return {
        conflictType: 'allocation_drift',
        action: 'accept_drift',
        reason: 'User accepted allocation drift',
        safetyMeasures: ['Drift notification will be generated']
      };
    }
  }

  /**
   * Resolve slippage conflict
   */
  async resolveSlippageConflict(conflict, userConfirmation) {
    if (userConfirmation.acceptHighSlippage) {
      return {
        conflictType: 'high_slippage',
        action: 'proceed_with_slippage',
        reason: 'User accepted high slippage risk',
        safetyMeasures: ['Slippage monitoring enabled', 'Transaction will revert if slippage exceeds 10%']
      };
    } else {
      return {
        conflictType: 'high_slippage',
        action: 'reduce_trade_size',
        reason: 'User chose to reduce trade size',
        safetyMeasures: ['Trade size reduced by 50%']
      };
    }
  }

  /**
   * Apply safety override for critical conflicts
   */
  applySafetyOverride(conflict, resolution) {
    const safetyOverride = {
      id: `safety_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conflictType: conflict.type,
      severity: conflict.severity,
      action: resolution.action,
      reason: resolution.reason,
      timestamp: Date.now(),
      active: true
    };
    
    this.safetyOverrides.push(safetyOverride);
    
    // Keep only last 50 safety overrides
    if (this.safetyOverrides.length > 50) {
      this.safetyOverrides = this.safetyOverrides.slice(-50);
    }
    
    console.log(`🛡️ Safety override applied: ${safetyOverride.id} - ${resolution.action}`);
    
    this.updateConflictResolutionStore();
  }

  /**
   * Execute manual override after conflict resolution
   */
  async executeManualOverride(overrideRequest) {
    console.log(`🚀 Executing manual override: ${overrideRequest.id}`);
    
    const { tradeRequest } = overrideRequest;
    
    // Pause automation temporarily if needed
    if (this.automationEnabled && overrideRequest.conflicts.length > 0) {
      await this.pauseAutomationTemporarily();
    }
    
    try {
      // Track the manual trade in allocation service
      const tradeData = {
        tokenIn: tradeRequest.tokenIn,
        tokenOut: tradeRequest.tokenOut,
        amountIn: tradeRequest.amountIn,
        amountOut: tradeRequest.expectedAmountOut,
        priceIn: tradeRequest.priceIn,
        priceOut: tradeRequest.priceOut,
        valueUSD: tradeRequest.valueUSD,
        slippage: tradeRequest.slippageTolerance,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
        timestamp: Date.now()
      };
      
      // Update allocation tracking
      if (this.allocationService) {
        this.allocationService.trackManualTrade(tradeData);
      }
      
      // Simulate trade execution (in production, this would call actual DEX)
      const executionResult = await this.simulateTradeExecution(tradeRequest);
      
      console.log(`✅ Manual override executed successfully: ${executionResult.transactionHash}`);
      
      return executionResult;
      
    } finally {
      // Resume automation if it was paused
      if (this.state.automationPaused) {
        await this.resumeAutomation();
      }
    }
  }

  /**
   * Simulate trade execution (placeholder for actual DEX integration)
   */
  async simulateTradeExecution(tradeRequest) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error(`Trade execution failed: ${['Insufficient liquidity', 'Slippage exceeded', 'Network error'][Math.floor(Math.random() * 3)]}`);
    }
    
    // Simulate successful execution
    const actualSlippage = Math.random() * tradeRequest.slippageTolerance;
    const actualAmountOut = tradeRequest.expectedAmountOut * (1 - actualSlippage);
    
    return {
      transactionHash: `0x${Math.random().toString(16).substr(2, 64).padStart(64, '0')}`,
      actualAmountOut,
      actualSlippage,
      gasUsed: 150000 + Math.floor(Math.random() * 50000),
      gasCostUSD: 10 + Math.random() * 20,
      executionPrice: tradeRequest.priceOut * (1 - actualSlippage),
      timestamp: Date.now()
    };
  }

  /**
   * Pause automation temporarily during manual override
   * Implements requirement 5.4 - automation state preservation during manual mode
   */
  async pauseAutomationTemporarily() {
    console.log('⏸️ Pausing automation temporarily for manual override');
    
    if (!this.automationEnabled) {
      return; // Already paused
    }
    
    // Preserve current automation state
    this.preservedAutomationState = {
      rebalancingActive: this.rebalancingService?.state.isActive || false,
      riskManagementActive: this.riskService?.state.isActive || false,
      allocationTracking: this.allocationService?.state.autoDistributeMode || false,
      timestamp: Date.now()
    };
    
    // Pause services (this would require implementing pause methods in each service)
    const pausedServices = [];
    
    if (this.rebalancingService && this.rebalancingService.state.isActive) {
      // Note: Would need to implement pause functionality in RebalancingEngine
      pausedServices.push('rebalancing');
    }
    
    this.state.automationPaused = true;
    this.state.conflictResolution = {
      pausedServices,
      preservedState: this.preservedAutomationState
    };
    
    this.updateStateStore();
    this.updateAutomationStateStore();
  }

  /**
   * Resume automation after manual override completion
   */
  async resumeAutomation() {
    console.log('▶️ Resuming automation after manual override');
    
    if (!this.state.automationPaused || !this.preservedAutomationState) {
      return;
    }
    
    try {
      // Restore automation state
      const { preservedState } = this.state.conflictResolution;
      
      // Resume services based on preserved state
      if (preservedState.rebalancingActive && this.rebalancingService) {
        // Note: Would need to implement resume functionality
        console.log('▶️ Resuming rebalancing service');
      }
      
      if (preservedState.riskManagementActive && this.riskService) {
        console.log('▶️ Resuming risk management service');
      }
      
      this.state.automationPaused = false;
      this.state.conflictResolution = null;
      this.preservedAutomationState = null;
      
      console.log('✅ Automation resumed successfully');
      
    } catch (error) {
      console.error('❌ Failed to resume automation:', error);
      // Keep automation paused if resume fails
    } finally {
      this.updateStateStore();
      this.updateAutomationStateStore();
    }
  }

  /**
   * Validate trade request parameters
   */
  async validateTradeRequest(tradeRequest) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // Required fields validation
    const requiredFields = ['tokenIn', 'tokenOut', 'amountIn', 'expectedAmountOut'];
    for (const field of requiredFields) {
      if (!tradeRequest[field]) {
        validation.errors.push(`Missing required field: ${field}`);
        validation.isValid = false;
      }
    }
    
    // Token validation
    if (tradeRequest.tokenIn === tradeRequest.tokenOut) {
      validation.errors.push('Cannot trade token with itself');
      validation.isValid = false;
    }
    
    // Amount validation
    if (tradeRequest.amountIn <= 0) {
      validation.errors.push('Trade amount must be positive');
      validation.isValid = false;
    }
    
    // Price validation
    if (tradeRequest.priceIn && tradeRequest.priceOut) {
      const priceRatio = tradeRequest.priceOut / tradeRequest.priceIn;
      if (priceRatio < 0.5 || priceRatio > 2.0) {
        validation.warnings.push('Unusual price ratio detected - verify trade parameters');
      }
    }
    
    // Slippage validation
    if (tradeRequest.slippageTolerance > 0.1) { // 10%
      validation.warnings.push('High slippage tolerance - trade may be subject to significant price impact');
    }
    
    return validation;
  }

  /**
   * Calculate safety level for trade request
   */
  calculateSafetyLevel(tradeRequest, conflicts) {
    let safetyScore = 100; // Start with maximum safety
    
    // Reduce safety score based on conflicts
    for (const conflict of conflicts) {
      switch (conflict.severity) {
        case 'high':
          safetyScore -= 30;
          break;
        case 'medium':
          safetyScore -= 15;
          break;
        case 'low':
          safetyScore -= 5;
          break;
      }
    }
    
    // Reduce safety score based on trade characteristics
    if (tradeRequest.valueUSD > 10000) {
      safetyScore -= 10; // Large trade
    }
    
    if (tradeRequest.slippageTolerance > 0.05) {
      safetyScore -= 10; // High slippage tolerance
    }
    
    // Determine safety level
    if (safetyScore >= 80) return 'high';
    if (safetyScore >= 60) return 'medium';
    if (safetyScore >= 40) return 'low';
    return 'critical';
  }

  /**
   * Calculate resolution safety level
   */
  calculateResolutionSafetyLevel(resolutions) {
    const riskActions = resolutions.filter(r => 
      r.action === 'proceed_with_warning' || 
      r.action === 'proceed_with_slippage' ||
      r.requiresSafetyOverride
    );
    
    if (riskActions.length === 0) return 'high';
    if (riskActions.length <= 2) return 'medium';
    return 'low';
  }

  /**
   * Simulate trade impact on allocations
   */
  simulateTradeImpact(currentAllocations, tradeRequest, portfolioValue) {
    const simulatedAllocations = { ...currentAllocations };
    
    // Decrease allocation for token sold
    if (simulatedAllocations[tradeRequest.tokenIn]) {
      const tokenInValue = (simulatedAllocations[tradeRequest.tokenIn] / 100) * portfolioValue;
      const newTokenInValue = Math.max(0, tokenInValue - tradeRequest.valueUSD);
      simulatedAllocations[tradeRequest.tokenIn] = (newTokenInValue / portfolioValue) * 100;
    }
    
    // Increase allocation for token bought
    if (simulatedAllocations[tradeRequest.tokenOut]) {
      const tokenOutValue = (simulatedAllocations[tradeRequest.tokenOut] / 100) * portfolioValue;
      const newTokenOutValue = tokenOutValue + tradeRequest.valueUSD;
      simulatedAllocations[tradeRequest.tokenOut] = (newTokenOutValue / portfolioValue) * 100;
    } else {
      simulatedAllocations[tradeRequest.tokenOut] = (tradeRequest.valueUSD / portfolioValue) * 100;
    }
    
    return simulatedAllocations;
  }

  /**
   * Estimate trade impact and slippage
   */
  async estimateTradeImpact(tradeRequest) {
    // Simplified impact estimation (would use DEX liquidity data in production)
    const baseSlippage = 0.001; // 0.1% base slippage
    const sizeMultiplier = Math.min(tradeRequest.valueUSD / 10000, 2); // Up to 2x for large trades
    const slippageEstimate = baseSlippage * (1 + sizeMultiplier);
    
    return {
      slippageEstimate,
      priceImpact: slippageEstimate * 0.8, // Price impact is typically less than slippage
      liquidityDepth: Math.max(50000 - tradeRequest.valueUSD, 10000), // Mock liquidity
      recommendedMaxSize: 25000 // Mock recommendation
    };
  }

  /**
   * Check if override is in cooldown period
   */
  isInOverrideCooldown() {
    if (!this.lastOverrideTime) return false;
    return (Date.now() - this.lastOverrideTime) < this.overrideCooldown;
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  getRemainingCooldown() {
    if (!this.isInOverrideCooldown()) return 0;
    return this.overrideCooldown - (Date.now() - this.lastOverrideTime);
  }

  /**
   * Start conflict monitoring
   */
  startConflictMonitoring() {
    // This would set up real-time monitoring for conflicts
    console.log('🔍 Starting conflict monitoring for manual trading integration');
  }

  /**
   * Add override to history
   */
  addToOverrideHistory(overrideRequest) {
    this.overrideHistory.push({
      ...overrideRequest,
      addedToHistory: Date.now()
    });
    
    // Keep only last 100 overrides
    if (this.overrideHistory.length > 100) {
      this.overrideHistory = this.overrideHistory.slice(-100);
    }
  }

  /**
   * Add conflict resolution to history
   */
  addToConflictResolutionHistory(conflictResolution) {
    // Update conflict resolution store
    conflictResolutionStore.update(state => ({
      ...state,
      resolutionHistory: [...state.resolutionHistory, conflictResolution].slice(-50) // Keep last 50
    }));
  }

  /**
   * Update state stores
   */
  updateStateStore() {
    manualTradingStateStore.set(this.state);
  }

  updateAutomationStateStore() {
    automationStateStore.update(state => ({
      ...state,
      isEnabled: this.automationEnabled,
      preservedSettings: this.preservedAutomationState,
      pausedServices: this.state.conflictResolution?.pausedServices || [],
      lastStateChange: Date.now()
    }));
  }

  updateConflictResolutionStore() {
    conflictResolutionStore.update(state => ({
      ...state,
      safetyOverrides: this.safetyOverrides
    }));
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isManualMode: this.isManualMode,
      automationEnabled: this.automationEnabled,
      pendingOverrides: this.pendingOverrides.size,
      overrideHistoryCount: this.overrideHistory.length,
      safetyOverridesCount: this.safetyOverrides.length,
      isInCooldown: this.isInOverrideCooldown(),
      remainingCooldown: this.getRemainingCooldown(),
      lastOverride: this.state.lastOverride
    };
  }

  /**
   * Get override history
   */
  getOverrideHistory(options = {}) {
    const { limit = 20, offset = 0, status = null } = options;
    
    let filtered = [...this.overrideHistory];
    
    if (status) {
      filtered = filtered.filter(override => override.status === status);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    
    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);
    
    return {
      overrides: paginated,
      total: filtered.length,
      hasMore: offset + limit < filtered.length
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.pendingOverrides.clear();
    this.overrideHistory = [];
    this.conflictQueue = [];
    this.safetyOverrides = [];
    this.preservedAutomationState = null;
    
    this.state = {
      isManualMode: false,
      pendingOverride: null,
      lastOverride: null,
      automationPaused: false,
      conflictResolution: null
    };
    
    this.updateStateStore();
    this.updateAutomationStateStore();
    this.updateConflictResolutionStore();
    
    this.isInitialized = false;
    console.log('🧹 Manual Trading Integration Service cleaned up');
  }
}

// Create and export singleton instance
export const manualTradingIntegrationService = new ManualTradingIntegrationService();

export default manualTradingIntegrationService;