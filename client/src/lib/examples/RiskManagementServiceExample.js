/**
 * Risk Management Service Usage Examples
 * 
 * Demonstrates how to use the RiskManagementService for advanced portfolio risk management
 */

import { riskManagementService } from '../services/RiskManagementService.js';

/**
 * Example: Initialize and configure risk management
 */
export async function initializeRiskManagement() {
  console.log('🚀 Initializing Risk Management Service...');
  
  try {
    // Initialize the service with custom options
    await riskManagementService.initialize({
      defaultRiskLevel: 'moderate',
      autoEvaluate: true,
      evaluationInterval: 5000 // 5 seconds
    });
    
    console.log('✅ Risk Management Service initialized');
    console.log('📊 Status:', riskManagementService.getStatus());
    
  } catch (error) {
    console.error('❌ Failed to initialize Risk Management Service:', error);
  }
}

/**
 * Example: Set up trailing stop-loss for a token
 */
export async function setupTrailingStopLoss() {
  console.log('🎯 Setting up trailing stop-loss...');
  
  try {
    const tokenAddress = '0x1'; // BTC token address
    const trailPercent = 0.05;  // 5% trailing distance
    const stopPercent = 0.10;   // 10% maximum loss
    
    const trailingStop = await riskManagementService.setTrailingStopLoss(
      tokenAddress,
      trailPercent,
      stopPercent,
      {
        liquidationPercent: 0.75, // Liquidate 75% of position when triggered
        enabled: true
      }
    );
    
    console.log('✅ Trailing stop-loss configured:', trailingStop);
    
  } catch (error) {
    console.error('❌ Failed to set trailing stop-loss:', error);
  }
}

/**
 * Example: Configure comprehensive risk parameters
 */
export async function setupComprehensiveRiskParameters() {
  console.log('⚙️ Setting up comprehensive risk parameters...');
  
  try {
    const tokenAddress = '0x2'; // ETH token address
    
    const riskParameters = {
      // Regular stop-loss
      stopLoss: {
        enabled: true,
        percent: 0.15, // 15% stop-loss
        liquidationPercent: 1.0, // 100% liquidation
        basePrice: 2000 // Base price for calculation
      },
      
      // Take-profit
      takeProfit: {
        enabled: true,
        percent: 0.25, // 25% take-profit
        liquidationPercent: 0.5, // 50% liquidation
        basePrice: 2000
      },
      
      // Trailing stop-loss
      trailingStop: {
        enabled: true,
        trailPercent: 0.08, // 8% trailing distance
        stopPercent: 0.12,  // 12% maximum loss
        liquidationPercent: 0.75,
        highWaterMark: 2000,
        stopPrice: 1760 // 12% below base price
      },
      
      // Position limits
      positionLimit: {
        enabled: true,
        maxPositionPercent: 0.3, // Maximum 30% of portfolio
        rebalanceThreshold: 0.35 // Rebalance if exceeds 35%
      }
    };
    
    const updatedParams = await riskManagementService.updateRiskParameters(
      tokenAddress,
      riskParameters
    );
    
    console.log('✅ Risk parameters configured:', updatedParams);
    
  } catch (error) {
    console.error('❌ Failed to set risk parameters:', error);
  }
}

/**
 * Example: Monitor and evaluate risk triggers
 */
export async function monitorRiskTriggers() {
  console.log('👁️ Monitoring risk triggers...');
  
  try {
    // Evaluate risk triggers for all managed tokens
    const triggers = await riskManagementService.evaluateRiskTriggers();
    
    if (triggers.length > 0) {
      console.log(`⚠️ ${triggers.length} risk triggers detected:`);
      
      triggers.forEach((trigger, index) => {
        console.log(`${index + 1}. ${trigger.type} for ${trigger.tokenAddress}`);
        console.log(`   Trigger Price: ${trigger.triggerPrice.toFixed(6)}`);
        console.log(`   Current Price: ${trigger.currentPrice.toFixed(6)}`);
        console.log(`   Liquidation %: ${(trigger.liquidationPercent * 100).toFixed(1)}%`);
        console.log(`   Priority: ${trigger.priority}`);
      });
      
      // Execute triggers with prioritization
      const results = await riskManagementService.executeRiskTriggers(triggers, {
        dryRun: false, // Set to true for simulation
        forceSuccess: false
      });
      
      console.log('📊 Execution Results:');
      console.log(`✅ Executed: ${results.executed.length}`);
      console.log(`❌ Failed: ${results.failed.length}`);
      console.log(`⏭️ Skipped: ${results.skipped.length}`);
      
    } else {
      console.log('✅ No risk triggers detected');
    }
    
  } catch (error) {
    console.error('❌ Risk monitoring failed:', error);
  }
}

/**
 * Example: Execute panic mode
 */
export async function executePanicModeExample() {
  console.log('🚨 Executing panic mode...');
  
  try {
    const userAddress = '0xUserAddress123';
    
    // Execute panic mode with custom options
    const panicResult = await riskManagementService.executePanicMode(userAddress, {
      targetAsset: 'USDC',
      timeout: 60000 // 60 seconds
    });
    
    console.log('🚨 Panic mode result:', panicResult.status);
    console.log('📊 Summary:', panicResult.summary);
    console.log(`⏱️ Duration: ${panicResult.duration}ms`);
    console.log(`✅ Successful conversions: ${panicResult.summary.successfulConversions}`);
    console.log(`❌ Failed conversions: ${panicResult.summary.failedConversions}`);
    console.log(`💰 Total value converted: ${panicResult.summary.totalValueConverted.toFixed(2)} ${panicResult.targetAsset}`);
    
  } catch (error) {
    console.error('❌ Panic mode execution failed:', error);
  }
}

/**
 * Example: Monitor panic mode progress
 */
export async function monitorPanicModeProgress() {
  console.log('📊 Monitoring panic mode progress...');
  
  const progressInterval = setInterval(() => {
    const progress = riskManagementService.getPanicModeProgress();
    
    if (!progress) {
      console.log('ℹ️ Panic mode not active');
      clearInterval(progressInterval);
      return;
    }
    
    console.log(`🚨 Panic Mode Progress: ${progress.progress.toFixed(1)}%`);
    console.log(`⏱️ Time remaining: ${Math.ceil(progress.timeRemaining / 1000)}s`);
    console.log(`📦 Conversions: ${progress.conversionsCompleted}/${progress.conversionsTotal}`);
    console.log(`✅ Successful: ${progress.conversionsSuccessful}`);
    console.log(`❌ Failed: ${progress.conversionsFailed}`);
    
    if (progress.isNearTimeout) {
      console.log('⚠️ WARNING: Panic mode approaching timeout!');
    }
    
    if (!progress.active) {
      console.log('✅ Panic mode completed');
      clearInterval(progressInterval);
    }
  }, 2000); // Update every 2 seconds
}

/**
 * Example: Get risk management statistics and history
 */
export async function getRiskManagementStats() {
  console.log('📈 Getting risk management statistics...');
  
  try {
    // Get service status
    const status = riskManagementService.getStatus();
    console.log('📊 Service Status:', status);
    
    // Get all risk parameters
    const allParams = riskManagementService.getAllRiskParameters();
    console.log('⚙️ Active Risk Parameters:', Object.keys(allParams).length, 'tokens');
    
    // Get execution history
    const history = riskManagementService.getExecutionHistory({ limit: 5 });
    console.log('📜 Recent Executions:', history.executions.length);
    
    history.executions.forEach((execution, index) => {
      console.log(`${index + 1}. ${execution.type} - ${execution.status} (${new Date(execution.startTime).toLocaleString()})`);
    });
    
    // Get panic mode statistics
    const panicStats = riskManagementService.getPanicModeStats();
    console.log('🚨 Panic Mode Stats:', panicStats);
    
  } catch (error) {
    console.error('❌ Failed to get statistics:', error);
  }
}

/**
 * Example: Clean up and destroy service
 */
export function cleanupRiskManagement() {
  console.log('🧹 Cleaning up Risk Management Service...');
  
  try {
    riskManagementService.destroy();
    console.log('✅ Risk Management Service cleaned up');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Complete example workflow
 */
export async function completeRiskManagementWorkflow() {
  console.log('🔄 Starting complete risk management workflow...');
  
  try {
    // 1. Initialize service
    await initializeRiskManagement();
    
    // 2. Set up risk parameters
    await setupTrailingStopLoss();
    await setupComprehensiveRiskParameters();
    
    // 3. Monitor for a short period
    console.log('⏱️ Monitoring for 30 seconds...');
    const monitoringInterval = setInterval(async () => {
      await monitorRiskTriggers();
    }, 10000); // Check every 10 seconds
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
      clearInterval(monitoringInterval);
      console.log('⏹️ Monitoring stopped');
    }, 30000);
    
    // 4. Get final statistics
    setTimeout(async () => {
      await getRiskManagementStats();
      console.log('✅ Complete workflow finished');
    }, 35000);
    
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  }
}

// Export all examples
export default {
  initializeRiskManagement,
  setupTrailingStopLoss,
  setupComprehensiveRiskParameters,
  monitorRiskTriggers,
  executePanicModeExample,
  monitorPanicModeProgress,
  getRiskManagementStats,
  cleanupRiskManagement,
  completeRiskManagementWorkflow
};