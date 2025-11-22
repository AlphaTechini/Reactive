/**
 * Manual and Automated Trading Integration Example
 * 
 * Demonstrates how to use the integrated manual and automated trading system
 * with conflict resolution, automation control, and seamless mode switching
 */

import { 
  manualAutomatedTradingIntegration, 
  INTEGRATION_MODES 
} from '../services/ManualAutomatedTradingIntegration.js';
import { 
  integrationStateStore, 
  unifiedTradingStateStore 
} from '../services/ManualAutomatedTradingIntegration.js';

class ManualAutomatedTradingIntegrationExample {
  constructor() {
    this.integration = manualAutomatedTradingIntegration;
    this.isRunning = false;
  }

  /**
   * Initialize and demonstrate the integration system
   */
  async runExample() {
    if (this.isRunning) {
      console.log('Example already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Manual/Automated Trading Integration Example...\n');

    try {
      // Step 1: Initialize the integration system
      await this.demonstrateInitialization();

      // Step 2: Demonstrate different integration modes
      await this.demonstrateIntegrationModes();

      // Step 3: Demonstrate trade execution in different modes
      await this.demonstrateTradeExecution();

      // Step 4: Demonstrate conflict resolution
      await this.demonstrateConflictResolution();

      // Step 5: Demonstrate automation control
      await this.demonstrateAutomationControl();

      // Step 6: Demonstrate emergency scenarios
      await this.demonstrateEmergencyScenarios();

      // Step 7: Demonstrate state monitoring
      await this.demonstrateStateMonitoring();

      console.log('\n✅ Manual/Automated Trading Integration Example completed successfully!');

    } catch (error) {
      console.error('\n❌ Example failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Demonstrate system initialization
   */
  async demonstrateInitialization() {
    console.log('📋 Step 1: System Initialization');
    console.log('================================\n');

    // Initialize the integration system
    await this.integration.initialize({
      initialMode: INTEGRATION_MODES.ASSISTED,
      manual: {
        confirmationTimeout: 30000,
        overrideCooldown: 60000
      },
      automation: {
        safetyCheckTimeout: 10000,
        preservationTTL: 24 * 60 * 60 * 1000
      }
    });

    console.log('✅ Integration system initialized');
    console.log('📊 Initial status:', this.integration.getIntegrationStatus());
    console.log('');
  }

  /**
   * Demonstrate different integration modes
   */
  async demonstrateIntegrationModes() {
    console.log('📋 Step 2: Integration Modes');
    console.log('============================\n');

    // Demonstrate each integration mode
    const modes = [
      INTEGRATION_MODES.FULL_AUTO,
      INTEGRATION_MODES.ASSISTED,
      INTEGRATION_MODES.MANUAL_PRIORITY,
      INTEGRATION_MODES.MANUAL_ONLY
    ];

    for (const mode of modes) {
      console.log(`🔄 Switching to ${mode} mode...`);
      
      const result = await this.integration.setIntegrationMode(mode, {
        reason: `Demonstration of ${mode} mode`
      });
      
      console.log(`✅ Mode switched successfully:`, result);
      console.log(`📊 Current status:`, this.integration.getIntegrationStatus());
      console.log('');
      
      // Wait a bit between mode changes
      await this.delay(1000);
    }

    // Return to assisted mode for remaining demonstrations
    await this.integration.setIntegrationMode(INTEGRATION_MODES.ASSISTED);
    console.log('🔄 Returned to ASSISTED mode for remaining demonstrations\n');
  }

  /**
   * Demonstrate trade execution in different modes
   */
  async demonstrateTradeExecution() {
    console.log('📋 Step 3: Trade Execution');
    console.log('==========================\n');

    const sampleTrade = {
      tokenIn: '0x1234567890123456789012345678901234567890',
      tokenOut: '0x0987654321098765432109876543210987654321',
      amountIn: 1.5,
      expectedAmountOut: 2800,
      priceIn: 2000,
      priceOut: 1,
      valueUSD: 3000,
      slippageTolerance: 0.005
    };

    // Demonstrate trade in FULL_AUTO mode
    console.log('🤖 Testing trade execution in FULL_AUTO mode...');
    await this.integration.setIntegrationMode(INTEGRATION_MODES.FULL_AUTO);
    
    try {
      const autoResult = await this.integration.executeTrade(sampleTrade);
      console.log('✅ Automated trade result:', autoResult);
    } catch (error) {
      console.log('❌ Automated trade failed:', error.message);
    }
    console.log('');

    // Demonstrate trade in ASSISTED mode
    console.log('🤝 Testing trade execution in ASSISTED mode...');
    await this.integration.setIntegrationMode(INTEGRATION_MODES.ASSISTED);
    
    try {
      const assistedResult = await this.integration.executeTrade(sampleTrade);
      console.log('✅ Assisted trade result:', assistedResult);
      
      // If confirmation is required, simulate user confirmation
      if (assistedResult.requiresConfirmation) {
        console.log('⏳ Trade requires confirmation, simulating user approval...');
        
        const confirmationResult = await this.integration.confirmTrade(
          assistedResult.overrideRequest.id,
          {
            confirmed: true,
            acknowledgeRisks: true,
            pauseRebalancing: false,
            updateTargetAllocations: false,
            acceptHighSlippage: false
          }
        );
        
        console.log('✅ Trade confirmed:', confirmationResult);
      }
    } catch (error) {
      console.log('❌ Assisted trade failed:', error.message);
    }
    console.log('');

    // Demonstrate trade in MANUAL_ONLY mode
    console.log('👤 Testing trade execution in MANUAL_ONLY mode...');
    await this.integration.setIntegrationMode(INTEGRATION_MODES.MANUAL_ONLY);
    
    try {
      const manualResult = await this.integration.executeTrade(sampleTrade);
      console.log('✅ Manual trade result:', manualResult);
      
      if (manualResult.requiresConfirmation) {
        console.log('⏳ Manual trade requires confirmation...');
        
        const confirmationResult = await this.integration.confirmTrade(
          manualResult.overrideRequest.id,
          {
            confirmed: true,
            acknowledgeRisks: true
          }
        );
        
        console.log('✅ Manual trade confirmed:', confirmationResult);
      }
    } catch (error) {
      console.log('❌ Manual trade failed:', error.message);
    }
    console.log('');
  }

  /**
   * Demonstrate conflict resolution
   */
  async demonstrateConflictResolution() {
    console.log('📋 Step 4: Conflict Resolution');
    console.log('==============================\n');

    // Switch to assisted mode for conflict demonstration
    await this.integration.setIntegrationMode(INTEGRATION_MODES.ASSISTED);

    // Create a trade that might have conflicts
    const conflictTrade = {
      tokenIn: '0x1111111111111111111111111111111111111111',
      tokenOut: '0x2222222222222222222222222222222222222222',
      amountIn: 10, // Large trade that might cause conflicts
      expectedAmountOut: 18000,
      priceIn: 2000,
      priceOut: 1,
      valueUSD: 20000, // Large value
      slippageTolerance: 0.08 // High slippage
    };

    console.log('⚠️ Executing trade with potential conflicts...');
    
    try {
      const result = await this.integration.executeTrade(conflictTrade);
      
      if (result.conflicts && result.conflicts.length > 0) {
        console.log('🔍 Conflicts detected:', result.conflicts);
        
        // Demonstrate different conflict resolution strategies
        console.log('🔧 Demonstrating conflict resolution...');
        
        // Simulate user choosing to proceed with caution
        const resolutionResult = await this.integration.confirmTrade(
          result.overrideRequest.id,
          {
            confirmed: true,
            acknowledgeRisks: true,
            pauseRebalancing: true, // Pause rebalancing to avoid conflicts
            updateTargetAllocations: true, // Update allocations after trade
            acceptHighSlippage: true, // Accept the high slippage
            acknowledgeStopLoss: true // Acknowledge any stop-loss triggers
          }
        );
        
        console.log('✅ Conflicts resolved and trade executed:', resolutionResult);
      } else {
        console.log('✅ No conflicts detected, trade executed smoothly');
      }
    } catch (error) {
      console.log('❌ Conflict resolution failed:', error.message);
    }
    console.log('');
  }

  /**
   * Demonstrate automation control
   */
  async demonstrateAutomationControl() {
    console.log('📋 Step 5: Automation Control');
    console.log('=============================\n');

    // Get current automation status
    const initialStatus = this.integration.automationService.getAutomationStatus();
    console.log('📊 Initial automation status:', initialStatus);

    // Demonstrate disabling automation
    console.log('⏸️ Disabling automation with settings preservation...');
    
    try {
      const disableResult = await this.integration.automationService.disableAutomation({
        preserveSettings: true,
        preservationReason: 'Demonstration of automation control'
      });
      
      console.log('✅ Automation disabled:', disableResult);
      
      // Wait a moment
      await this.delay(2000);
      
      // Demonstrate re-enabling automation
      console.log('▶️ Re-enabling automation with safety checks...');
      
      const enableResult = await this.integration.automationService.enableAutomation();
      console.log('✅ Automation re-enabled:', enableResult);
      
    } catch (error) {
      console.log('❌ Automation control failed:', error.message);
    }
    console.log('');
  }

  /**
   * Demonstrate emergency scenarios
   */
  async demonstrateEmergencyScenarios() {
    console.log('📋 Step 6: Emergency Scenarios');
    console.log('==============================\n');

    // Demonstrate emergency manual mode
    console.log('🚨 Simulating emergency scenario...');
    
    try {
      const emergencyResult = await this.integration.switchToEmergencyManualMode(
        'Simulated market crash - immediate manual control required'
      );
      
      console.log('✅ Emergency manual mode activated:', emergencyResult);
      
      // Show current status in emergency mode
      const emergencyStatus = this.integration.getIntegrationStatus();
      console.log('📊 Emergency mode status:', emergencyStatus);
      
      // Wait a moment to simulate emergency handling
      await this.delay(3000);
      
      // Demonstrate restoration from emergency mode
      console.log('🔄 Restoring from emergency mode...');
      
      const restoreResult = await this.integration.restoreFromEmergencyMode(
        INTEGRATION_MODES.ASSISTED
      );
      
      console.log('✅ Restored from emergency mode:', restoreResult);
      
    } catch (error) {
      console.log('❌ Emergency scenario handling failed:', error.message);
    }
    console.log('');
  }

  /**
   * Demonstrate state monitoring
   */
  async demonstrateStateMonitoring() {
    console.log('📋 Step 7: State Monitoring');
    console.log('===========================\n');

    // Subscribe to state changes
    console.log('📡 Setting up state monitoring...');
    
    const unsubscribeIntegration = integrationStateStore.subscribe(state => {
      console.log('🔄 Integration state changed:', {
        mode: state.mode,
        manualActive: state.manualTradingActive,
        automationActive: state.automationActive,
        hasConflicts: state.conflictResolutionActive
      });
    });

    const unsubscribeUnified = unifiedTradingStateStore.subscribe(state => {
      console.log('📊 Unified trading state:', {
        canTrade: state.canTrade,
        hasConflicts: state.hasConflicts,
        recommendedMode: state.recommendedMode
      });
    });

    // Trigger some state changes to demonstrate monitoring
    console.log('🔄 Triggering state changes for monitoring demonstration...');
    
    await this.integration.setIntegrationMode(INTEGRATION_MODES.MANUAL_PRIORITY);
    await this.delay(1000);
    
    await this.integration.setIntegrationMode(INTEGRATION_MODES.FULL_AUTO);
    await this.delay(1000);
    
    await this.integration.setIntegrationMode(INTEGRATION_MODES.ASSISTED);
    
    // Get historical data
    console.log('📈 Mode change history:', this.integration.getModeHistory({ limit: 5 }));
    console.log('📋 Integration events:', this.integration.getIntegrationEvents({ limit: 5 }));

    // Clean up subscriptions
    unsubscribeIntegration();
    unsubscribeUnified();
    
    console.log('✅ State monitoring demonstration completed');
    console.log('');
  }

  /**
   * Utility function to add delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current integration status for external monitoring
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      integrationStatus: this.integration.getIntegrationStatus(),
      timestamp: Date.now()
    };
  }

  /**
   * Stop the example and clean up
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Manual/Automated Trading Integration Example stopped');
  }
}

// Create and export example instance
export const manualAutomatedTradingIntegrationExample = new ManualAutomatedTradingIntegrationExample();

// Export for direct usage
export default manualAutomatedTradingIntegrationExample;

// Example usage:
// import { manualAutomatedTradingIntegrationExample } from './ManualAutomatedTradingIntegrationExample.js';
// await manualAutomatedTradingIntegrationExample.runExample();