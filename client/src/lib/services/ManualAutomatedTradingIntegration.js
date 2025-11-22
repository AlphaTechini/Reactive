/**
 * Manual and Automated Trading Integration
 * 
 * Provides unified interface for seamless integration between manual trading
 * and portfolio automation, combining ManualTradingIntegrationService and
 * AutomationControlService for complete workflow management
 */

import { writable, derived } from 'svelte/store';
import { manualTradingIntegrationService } from './ManualTradingIntegrationService.js';
import { automationControlService } from './AutomationControlService.js';
import { allocationManagementService } from './AllocationManagementService.js';
import { riskManagementService } from './RiskManagementService.js';
import { rebalancingEngine } from './RebalancingEngine.js';

// Integration constants
const INTEGRATION_MODES = {
  FULL_AUTO: 'full_auto',         // Full automation, no manual intervention
  ASSISTED: 'assisted',           // Automation with manual oversight
  MANUAL_PRIORITY: 'manual_priority', // Manual trades take priority
  MANUAL_ONLY: 'manual_only'      // Manual trading only
};

// Reactive stores for integration state
export const integrationStateStore = writable({
  mode: INTEGRATION_MODES.ASSISTED,
  isInitialized: false,
  manualTradingActive: false,
  automationActive: true,
  conflictResolutionActive: false,
  lastModeChange: null
});

// Derived store combining manual and automation states
export const unifiedTradingStateStore = derived(
  [
    integrationStateStore,
    manualTradingIntegrationService ? writable({}) : writable({}), // Will be updated when services are available
    automationControlService ? writable({}) : writable({})
  ],
  ([$integration, $manual, $automation]) => ({
    integration: $integration,
    manual: $manual,
    automation: $automation,
    canTrade: $integration.isInitialized && ($integration.manualTradingActive || $integration.automationActive),
    hasConflicts: $integration.conflictResolutionActive,
    recommendedMode: determineRecommendedMode($integration, $manual, $automation)
  })
);

function determineRecommendedMode(integration, manual, automation) {
  if (!integration.isInitialized) return INTEGRATION_MODES.MANUAL_ONLY;
  if (manual.pendingOverride) return INTEGRATION_MODES.MANUAL_PRIORITY;
  if (automation.safetyChecksActive) return INTEGRATION_MODES.MANUAL_ONLY;
  return INTEGRATION_MODES.ASSISTED;
}

class ManualAutomatedTradingIntegration {
  constructor() {
    this.isInitialized = false;
    this.currentMode = INTEGRATION_MODES.ASSISTED;
    this.manualService = null;
    this.automationService = null;
    this.allocationService = null;
    this.riskService = null;
    this.rebalancingService = null;
    
    // State management
    this.state = {
      mode: INTEGRATION_MODES.ASSISTED,
      isInitialized: false,
      manualTradingActive: false,
      automationActive: true,
      conflictResolutionActive: false,
      lastModeChange: null
    };
    
    // Integration history
    this.modeHistory = [];
    this.integrationEvents = [];
  }

  /**
   * Initialize the integration service
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('🔄 Manual/Automated Trading Integration already initialized');
      return;
    }

    console.log('🚀 Initializing Manual/Automated Trading Integration...');
    
    try {
      // Initialize service references
      this.manualService = manualTradingIntegrationService;
      this.automationService = automationControlService;
      this.allocationService = allocationManagementService;
      this.riskService = riskManagementService;
      this.rebalancingService = rebalancingEngine;
      
      // Initialize dependent services
      if (!this.manualService.isInitialized) {
        await this.manualService.initialize(options.manual);
      }
      
      if (!this.automationService.isInitialized) {
        await this.automationService.initialize(options.automation);
      }
      
      // Set initial mode
      this.currentMode = options.initialMode || INTEGRATION_MODES.ASSISTED;
      await this.setIntegrationMode(this.currentMode);
      
      // Set up event listeners for service state changes
      this.setupServiceEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Manual/Automated Trading Integration initialized successfully');
      
      // Update state
      this.state.isInitialized = true;
      this.updateStateStore();
      
    } catch (error) {
      console.error('❌ Failed to initialize Manual/Automated Trading Integration:', error);
      throw error;
    }
  }

  /**
   * Set integration mode
   */
  async setIntegrationMode(mode, options = {}) {
    console.log(`🔄 Setting integration mode: ${mode}`);
    
    if (!Object.values(INTEGRATION_MODES).includes(mode)) {
      throw new Error(`Invalid integration mode: ${mode}`);
    }

    const previousMode = this.currentMode;
    
    try {
      // Configure services based on mode
      switch (mode) {
        case INTEGRATION_MODES.FULL_AUTO:
          await this.configureFullAutoMode(options);
          break;
          
        case INTEGRATION_MODES.ASSISTED:
          await this.configureAssistedMode(options);
          break;
          
        case INTEGRATION_MODES.MANUAL_PRIORITY:
          await this.configureManualPriorityMode(options);
          break;
          
        case INTEGRATION_MODES.MANUAL_ONLY:
          await this.configureManualOnlyMode(options);
          break;
          
        default:
          throw new Error(`Unsupported integration mode: ${mode}`);
      }
      
      // Update state
      this.currentMode = mode;
      this.state.mode = mode;
      this.state.lastModeChange = Date.now();
      
      // Add to mode history
      this.addToModeHistory(previousMode, mode, options.reason);
      
      console.log(`✅ Integration mode set to: ${mode}`);
      
      this.updateStateStore();
      
      return {
        previousMode,
        currentMode: mode,
        timestamp: Date.now(),
        success: true
      };
      
    } catch (error) {
      console.error(`❌ Failed to set integration mode to ${mode}:`, error);
      throw error;
    }
  }

  /**
   * Configure full automation mode
   */
  async configureFullAutoMode(options = {}) {
    console.log('⚙️ Configuring full automation mode...');
    
    // Enable all automation services
    await this.automationService.enableAutomation({
      services: ['rebalancing', 'risk_management', 'allocation_tracking'],
      ...options
    });
    
    // Set manual trading to background mode (no confirmations for automation)
    this.state.automationActive = true;
    this.state.manualTradingActive = false;
    this.state.conflictResolutionActive = false;
  }

  /**
   * Configure assisted mode (default)
   */
  async configureAssistedMode(options = {}) {
    console.log('⚙️ Configuring assisted mode...');
    
    // Enable automation with manual oversight
    await this.automationService.enableAutomation({
      services: ['rebalancing', 'risk_management', 'allocation_tracking'],
      ...options
    });
    
    // Enable manual trading with conflict resolution
    this.state.automationActive = true;
    this.state.manualTradingActive = true;
    this.state.conflictResolutionActive = true;
  }

  /**
   * Configure manual priority mode
   */
  async configureManualPriorityMode(options = {}) {
    console.log('⚙️ Configuring manual priority mode...');
    
    // Keep automation enabled but with lower priority
    await this.automationService.enableAutomation({
      services: ['allocation_tracking'], // Only tracking, no active trading
      ...options
    });
    
    // Enable full manual trading capabilities
    this.state.automationActive = false;
    this.state.manualTradingActive = true;
    this.state.conflictResolutionActive = true;
  }

  /**
   * Configure manual only mode
   */
  async configureManualOnlyMode(options = {}) {
    console.log('⚙️ Configuring manual only mode...');
    
    // Disable automation
    await this.automationService.disableAutomation({
      preserveSettings: true,
      ...options
    });
    
    // Enable manual trading only
    this.state.automationActive = false;
    this.state.manualTradingActive = true;
    this.state.conflictResolutionActive = false;
  }

  /**
   * Execute trade with integrated workflow
   */
  async executeTrade(tradeRequest, options = {}) {
    console.log('🚀 Executing trade with integrated workflow...');
    
    if (!this.isInitialized) {
      throw new Error('Integration service not initialized');
    }

    // Determine execution path based on current mode
    switch (this.currentMode) {
      case INTEGRATION_MODES.FULL_AUTO:
        return await this.executeAutomatedTrade(tradeRequest, options);
        
      case INTEGRATION_MODES.ASSISTED:
        return await this.executeAssistedTrade(tradeRequest, options);
        
      case INTEGRATION_MODES.MANUAL_PRIORITY:
      case INTEGRATION_MODES.MANUAL_ONLY:
        return await this.executeManualTrade(tradeRequest, options);
        
      default:
        throw new Error(`Cannot execute trade in mode: ${this.currentMode}`);
    }
  }

  /**
   * Execute automated trade (full automation)
   */
  async executeAutomatedTrade(tradeRequest, options = {}) {
    console.log('🤖 Executing automated trade...');
    
    // In full auto mode, trades are executed directly without manual confirmation
    // This would integrate with the rebalancing engine or risk management service
    
    try {
      // Track the trade for allocation management
      if (this.allocationService) {
        const tradeData = {
          tokenIn: tradeRequest.tokenIn,
          tokenOut: tradeRequest.tokenOut,
          amountIn: tradeRequest.amountIn,
          amountOut: tradeRequest.expectedAmountOut,
          valueUSD: tradeRequest.valueUSD,
          type: 'automated',
          timestamp: Date.now()
        };
        
        this.allocationService.trackManualTrade(tradeData);
      }
      
      // Simulate automated execution
      const result = {
        type: 'automated',
        tradeRequest,
        executionResult: {
          transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          success: true,
          timestamp: Date.now()
        },
        integrationMode: this.currentMode
      };
      
      this.addToIntegrationEvents('automated_trade_executed', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Automated trade execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute assisted trade (automation with manual oversight)
   */
  async executeAssistedTrade(tradeRequest, options = {}) {
    console.log('🤝 Executing assisted trade...');
    
    try {
      // Check for conflicts with automation
      const conflicts = await this.manualService.detectAutomationConflicts(tradeRequest);
      
      if (conflicts.length === 0 || options.skipConflictCheck) {
        // No conflicts, execute directly
        return await this.executeManualTrade(tradeRequest, { ...options, skipOverride: true });
      } else {
        // Conflicts detected, require manual override
        const overrideRequest = await this.manualService.requestManualOverride(tradeRequest, options);
        
        this.addToIntegrationEvents('conflict_detected', {
          tradeRequest,
          conflicts,
          overrideRequest: overrideRequest.id
        });
        
        // Return override request for user confirmation
        return {
          type: 'assisted_with_conflicts',
          requiresConfirmation: true,
          overrideRequest,
          conflicts,
          integrationMode: this.currentMode
        };
      }
      
    } catch (error) {
      console.error('❌ Assisted trade execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute manual trade
   */
  async executeManualTrade(tradeRequest, options = {}) {
    console.log('👤 Executing manual trade...');
    
    try {
      if (options.skipOverride) {
        // Direct execution without override process
        const tradeData = {
          tokenIn: tradeRequest.tokenIn,
          tokenOut: tradeRequest.tokenOut,
          amountIn: tradeRequest.amountIn,
          amountOut: tradeRequest.expectedAmountOut,
          valueUSD: tradeRequest.valueUSD,
          type: 'manual_direct',
          timestamp: Date.now()
        };
        
        if (this.allocationService) {
          this.allocationService.trackManualTrade(tradeData);
        }
        
        const result = {
          type: 'manual_direct',
          tradeRequest,
          executionResult: {
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            success: true,
            timestamp: Date.now()
          },
          integrationMode: this.currentMode
        };
        
        this.addToIntegrationEvents('manual_trade_executed', result);
        
        return result;
      } else {
        // Use manual override process
        const overrideRequest = await this.manualService.requestManualOverride(tradeRequest, options);
        
        return {
          type: 'manual_with_override',
          requiresConfirmation: true,
          overrideRequest,
          integrationMode: this.currentMode
        };
      }
      
    } catch (error) {
      console.error('❌ Manual trade execution failed:', error);
      throw error;
    }
  }

  /**
   * Confirm pending trade (for assisted and manual modes)
   */
  async confirmTrade(overrideId, userConfirmation) {
    console.log(`✅ Confirming trade: ${overrideId}`);
    
    try {
      const result = await this.manualService.confirmManualOverride(overrideId, userConfirmation);
      
      this.addToIntegrationEvents('trade_confirmed', {
        overrideId,
        result,
        integrationMode: this.currentMode
      });
      
      return {
        type: 'confirmed',
        overrideResult: result,
        integrationMode: this.currentMode,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error(`❌ Trade confirmation failed: ${overrideId}`, error);
      throw error;
    }
  }

  /**
   * Cancel pending trade
   */
  async cancelTrade(overrideId, reason = 'User cancelled') {
    console.log(`❌ Cancelling trade: ${overrideId}`);
    
    try {
      const result = this.manualService.cancelManualOverride(overrideId, reason);
      
      this.addToIntegrationEvents('trade_cancelled', {
        overrideId,
        reason,
        integrationMode: this.currentMode
      });
      
      return {
        type: 'cancelled',
        overrideResult: result,
        reason,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error(`❌ Trade cancellation failed: ${overrideId}`, error);
      throw error;
    }
  }

  /**
   * Switch to emergency manual mode
   */
  async switchToEmergencyManualMode(reason = 'Emergency override') {
    console.log('🚨 Switching to emergency manual mode...');
    
    try {
      // Immediately disable automation
      await this.automationService.disableAutomation({
        preserveSettings: true,
        preservationReason: `Emergency: ${reason}`
      });
      
      // Switch to manual only mode
      await this.setIntegrationMode(INTEGRATION_MODES.MANUAL_ONLY, {
        reason: `Emergency: ${reason}`,
        emergency: true
      });
      
      this.addToIntegrationEvents('emergency_manual_mode', {
        reason,
        previousMode: this.currentMode,
        timestamp: Date.now()
      });
      
      console.log('🚨 Emergency manual mode activated');
      
      return {
        success: true,
        mode: INTEGRATION_MODES.MANUAL_ONLY,
        reason,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Failed to switch to emergency manual mode:', error);
      throw error;
    }
  }

  /**
   * Restore automation from emergency mode
   */
  async restoreFromEmergencyMode(targetMode = INTEGRATION_MODES.ASSISTED) {
    console.log('🔄 Restoring from emergency mode...');
    
    try {
      // Perform safety checks
      const safetyChecks = await this.automationService.performSafetyChecks({
        ignoreMarketConditions: false,
        ignoreRecentOverrides: false
      });
      
      if (!safetyChecks.canEnable) {
        throw new Error(`Cannot restore automation: ${safetyChecks.blockingReasons.join(', ')}`);
      }
      
      // Restore automation
      await this.automationService.enableAutomation();
      
      // Switch to target mode
      await this.setIntegrationMode(targetMode, {
        reason: 'Restored from emergency mode'
      });
      
      this.addToIntegrationEvents('emergency_mode_restored', {
        targetMode,
        safetyChecks,
        timestamp: Date.now()
      });
      
      console.log(`🔄 Restored from emergency mode to: ${targetMode}`);
      
      return {
        success: true,
        mode: targetMode,
        safetyChecks,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Failed to restore from emergency mode:', error);
      throw error;
    }
  }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      isInitialized: this.isInitialized,
      currentMode: this.currentMode,
      manualTradingActive: this.state.manualTradingActive,
      automationActive: this.state.automationActive,
      conflictResolutionActive: this.state.conflictResolutionActive,
      lastModeChange: this.state.lastModeChange,
      
      // Service statuses
      manualService: this.manualService ? this.manualService.getStatus() : null,
      automationService: this.automationService ? this.automationService.getAutomationStatus() : null,
      
      // Integration metrics
      modeHistoryCount: this.modeHistory.length,
      integrationEventsCount: this.integrationEvents.length,
      
      // Available modes
      availableModes: Object.values(INTEGRATION_MODES),
      recommendedMode: this.getRecommendedMode()
    };
  }

  /**
   * Get recommended integration mode based on current conditions
   */
  getRecommendedMode() {
    // Check for emergency conditions
    if (this.automationService && this.automationService.getAutomationStatus().reactivationBlocked) {
      return INTEGRATION_MODES.MANUAL_ONLY;
    }
    
    // Check for pending manual overrides
    if (this.manualService && this.manualService.state.pendingOverride) {
      return INTEGRATION_MODES.MANUAL_PRIORITY;
    }
    
    // Check automation health
    if (this.automationService && !this.automationService.getAutomationStatus().isEnabled) {
      return INTEGRATION_MODES.MANUAL_ONLY;
    }
    
    // Default to assisted mode
    return INTEGRATION_MODES.ASSISTED;
  }

  /**
   * Setup service event listeners
   */
  setupServiceEventListeners() {
    // This would set up listeners for service state changes
    // In a real implementation, services would emit events that we listen to
    console.log('🔗 Setting up service event listeners...');
  }

  /**
   * Add entry to mode history
   */
  addToModeHistory(previousMode, newMode, reason) {
    this.modeHistory.push({
      id: `mode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      previousMode,
      newMode,
      reason,
      timestamp: Date.now()
    });
    
    // Keep only last 50 entries
    if (this.modeHistory.length > 50) {
      this.modeHistory = this.modeHistory.slice(-50);
    }
  }

  /**
   * Add entry to integration events
   */
  addToIntegrationEvents(eventType, eventData) {
    this.integrationEvents.push({
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      data: eventData,
      timestamp: Date.now()
    });
    
    // Keep only last 100 events
    if (this.integrationEvents.length > 100) {
      this.integrationEvents = this.integrationEvents.slice(-100);
    }
  }

  /**
   * Get mode history
   */
  getModeHistory(options = {}) {
    const { limit = 10, offset = 0 } = options;
    
    const sorted = [...this.modeHistory].sort((a, b) => b.timestamp - a.timestamp);
    const paginated = sorted.slice(offset, offset + limit);
    
    return {
      entries: paginated,
      total: this.modeHistory.length,
      hasMore: offset + limit < this.modeHistory.length
    };
  }

  /**
   * Get integration events
   */
  getIntegrationEvents(options = {}) {
    const { limit = 20, offset = 0, eventType = null } = options;
    
    let filtered = [...this.integrationEvents];
    
    if (eventType) {
      filtered = filtered.filter(event => event.type === eventType);
    }
    
    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
    const paginated = sorted.slice(offset, offset + limit);
    
    return {
      events: paginated,
      total: filtered.length,
      hasMore: offset + limit < filtered.length
    };
  }

  /**
   * Update state store
   */
  updateStateStore() {
    integrationStateStore.set(this.state);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.modeHistory = [];
    this.integrationEvents = [];
    
    this.state = {
      mode: INTEGRATION_MODES.MANUAL_ONLY,
      isInitialized: false,
      manualTradingActive: false,
      automationActive: false,
      conflictResolutionActive: false,
      lastModeChange: null
    };
    
    this.updateStateStore();
    this.isInitialized = false;
    
    console.log('🧹 Manual/Automated Trading Integration cleaned up');
  }
}

// Create and export singleton instance
export const manualAutomatedTradingIntegration = new ManualAutomatedTradingIntegration();

// Export integration modes for external use
export { INTEGRATION_MODES };

export default manualAutomatedTradingIntegration;