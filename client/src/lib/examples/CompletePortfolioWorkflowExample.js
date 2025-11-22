/**
 * Complete Portfolio Management Workflow Example
 * 
 * Demonstrates end-to-end integration of all portfolio management features:
 * - Enhanced price display with multi-source aggregation
 * - Intelligent rebalancing with gas optimization
 * - Advanced risk management with trailing stops
 * - Manual/automated trading integration
 * - Error handling and user notifications
 */

import { enhancedPriceDisplayService } from '../services/EnhancedPriceDisplayService.js';
import { rebalancingEngine } from '../services/RebalancingEngine.js';
import { riskManagementService } from '../services/RiskManagementService.js';
import { allocationManagementService } from '../services/AllocationManagementService.js';
import { manualAutomatedTradingIntegration } from '../services/ManualAutomatedTradingIntegration.js';
import { errorHandlingFramework } from '../services/ErrorHandlingFramework.js';
import { userNotificationSystem } from '../services/UserNotificationSystem.js';

/**
 * Initialize all portfolio management services
 */
async function initializePortfolioSystem() {
  console.log('🚀 Initializing Enhanced Portfolio Management System...\n');
  
  try {
    // Initialize error handling first
    await errorHandlingFramework.initialize({
      maxRetries: 3,
      enableHealthChecks: true
    });
    console.log('✅ Error handling framework initialized');
    
    // Initialize notification system
    await userNotificationSystem.initialize({
      enableNotifications: true,
      autoHideDelay: 5000
    });
    console.log('✅ User notification system initialized');
    
    // Initialize price display service
    await enhancedPriceDisplayService.initialize();
    console.log('✅ Enhanced price display service initialized');
    
    // Initialize rebalancing engine
    await rebalancingEngine.initialize({
      driftThreshold: 0.05,
      maxGasPercent: 0.02
    });
    console.log('✅ Rebalancing engine initialized');

    
    // Initialize risk management service
    await riskManagementService.initialize({
      autoEvaluate: true,
      evaluationInterval: 5000
    });
    console.log('✅ Risk management service initialized');
    
    // Initialize allocation management
    await allocationManagementService.initialize();
    console.log('✅ Allocation management service initialized');
    
    // Initialize manual/automated trading integration
    await manualAutomatedTradingIntegration.initialize();
    console.log('✅ Manual/automated trading integration initialized');
    
    console.log('\n✅ All services initialized successfully!\n');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize portfolio system:', error);
    throw error;
  }
}

/**
 * Example 1: Create and manage a portfolio with automated rebalancing
 */
async function example1_CreatePortfolioWithRebalancing() {
  console.log('📊 Example 1: Create Portfolio with Automated Rebalancing\n');
  
  // Step 1: Define target allocation
  const targetAllocation = {
    '0x1': 0.40,  // BTC 40%
    '0x2': 0.35,  // ETH 35%
    '0x3': 0.25   // USDC 25%
  };
  
  console.log('🎯 Setting target allocation:', targetAllocation);
  const allocationResult = await allocationManagementService.setTargetAllocations(targetAllocation);
  console.log('✅ Target allocation set:', allocationResult);
  
  // Step 2: Fetch current prices
  console.log('\n💰 Fetching current prices...');
  await enhancedPriceDisplayService.fetchAllPrices();
  const prices = enhancedPriceDisplayService.getAllPrices();
  console.log('✅ Prices fetched for', Object.keys(prices).length, 'tokens');
  
  // Step 3: Simulate current holdings
  const currentHoldings = {
    '0x1': 0.45,  // BTC slightly over target
    '0x2': 1.8,   // ETH slightly under target
    '0x3': 1200   // USDC
  };
  
  const totalPortfolioValue = 10000; // $10,000 portfolio
  
  // Step 4: Analyze drift
  console.log('\n📈 Analyzing portfolio drift...');
  const currentAllocations = {
    '0x1': 0.42,
    '0x2': 0.33,
    '0x3': 0.25
  };
  
  const driftAnalysis = rebalancingEngine.analyzeDrift(
    currentAllocations,
    targetAllocation
  );
  
  console.log('📊 Drift Analysis:');
  console.log('  - Max drift:', (driftAnalysis.maxDrift * 100).toFixed(2) + '%');
  console.log('  - Needs rebalancing:', driftAnalysis.needsRebalancing);
  
  // Step 5: Calculate optimal trades if rebalancing needed
  if (driftAnalysis.needsRebalancing) {
    console.log('\n⚡ Calculating optimal rebalancing trades...');
    
    const tradeOptimization = rebalancingEngine.calculateOptimalTrades(
      currentHoldings,
      targetAllocation,
      totalPortfolioValue
    );
    
    console.log('📦 Trade Optimization:');
    console.log('  - Total trades:', tradeOptimization.totalTrades);
    console.log('  - Total value:', '$' + tradeOptimization.totalValueToTrade.toFixed(2));
    
    // Step 6: Estimate gas costs
    console.log('\n⛽ Estimating gas costs...');
    const gasEstimation = await rebalancingEngine.estimateGasCosts(
      tradeOptimization.executionPlan
    );
    
    console.log('💨 Gas Estimation:');
    console.log('  - Total gas:', gasEstimation.totalGasEstimate.toLocaleString());
    console.log('  - Gas cost:', '$' + gasEstimation.totalGasCostUSD.toFixed(2));
    
    // Step 7: Check if should defer
    const deferCheck = rebalancingEngine.shouldDeferRebalancing(
      gasEstimation,
      tradeOptimization.totalValueToTrade
    );
    
    if (deferCheck.shouldDefer) {
      console.log('\n⏸️  Rebalancing deferred:', deferCheck.reason);
      
      // Show notification to user
      userNotificationSystem.showRebalancingDeferralNotification(
        deferCheck.reason,
        deferCheck.gasPercent,
        deferCheck.gasCostUSD,
        deferCheck.threshold
      );
    } else {
      console.log('\n✅ Gas costs acceptable, proceeding with rebalancing');
      
      // Execute rebalancing (dry run)
      const executionResult = await rebalancingEngine.executeRebalancing(
        tradeOptimization.executionPlan,
        { dryRun: true }
      );
      
      console.log('📊 Rebalancing Result:');
      console.log('  - Status:', executionResult.status);
      console.log('  - Executed trades:', executionResult.executedTrades?.length || 0);
    }
  }
  
  console.log('\n✅ Example 1 completed!\n');
}

/**
 * Example 2: Set up risk management with trailing stop-loss
 */
async function example2_RiskManagementWithTrailingStops() {
  console.log('🛡️  Example 2: Risk Management with Trailing Stop-Loss\n');
  
  // Step 1: Set trailing stop-loss for BTC
  console.log('🎯 Setting trailing stop-loss for BTC...');
  const trailingStop = await riskManagementService.setTrailingStopLoss(
    '0x1',      // BTC address
    0.05,       // 5% trail
    0.10,       // 10% stop
    { liquidationPercent: 0.5 }  // Liquidate 50% on trigger
  );
  
  console.log('✅ Trailing stop-loss configured:');
  console.log('  - Trail percent:', (trailingStop.trailPercent * 100) + '%');
  console.log('  - Stop percent:', (trailingStop.stopPercent * 100) + '%');
  console.log('  - Stop price:', '$' + trailingStop.stopPrice.toFixed(2));
  
  // Step 2: Evaluate risk triggers
  console.log('\n📊 Evaluating risk triggers...');
  const triggers = await riskManagementService.evaluateRiskTriggers();
  
  console.log('🔍 Active triggers:', triggers.length);
  
  if (triggers.length > 0) {
    console.log('\n⚠️  Risk triggers detected:');
    triggers.forEach((trigger, index) => {
      console.log(`  ${index + 1}. ${trigger.type} for ${trigger.tokenAddress}`);
      console.log(`     Current price: $${trigger.currentPrice.toFixed(2)}`);
      console.log(`     Trigger price: $${trigger.triggerPrice.toFixed(2)}`);
      
      // Show notification for each trigger
      userNotificationSystem.showRiskTriggerAlert(trigger);
    });
    
    // Step 3: Execute risk triggers (dry run)
    console.log('\n🔥 Executing risk triggers (dry run)...');
    const executionResult = await riskManagementService.executeRiskTriggers(
      triggers,
      { dryRun: true }
    );
    
    console.log('📊 Execution Result:');
    console.log('  - Executed:', executionResult.executed.length);
    console.log('  - Failed:', executionResult.failed.length);
    console.log('  - Skipped:', executionResult.skipped.length);
  } else {
    console.log('✅ No risk triggers activated');
  }
  
  console.log('\n✅ Example 2 completed!\n');
}

/**
 * Example 3: Manual trading with automation integration
 */
async function example3_ManualTradingIntegration() {
  console.log('🤝 Example 3: Manual Trading with Automation Integration\n');
  
  // Step 1: Enable automation
  console.log('🤖 Enabling portfolio automation...');
  await manualAutomatedTradingIntegration.enableAutomation();
  console.log('✅ Automation enabled');
  
  // Step 2: Execute manual trade
  console.log('\n💼 Executing manual trade...');
  const manualTrade = {
    tokenAddress: '0x1',
    amount: 0.1,
    type: 'buy',
    price: 45000
  };
  
  const tradeResult = await manualAutomatedTradingIntegration.executeManualTrade(
    manualTrade,
    { pauseAutomation: true }
  );
  
  console.log('✅ Manual trade executed:');
  console.log('  - Success:', tradeResult.success);
  console.log('  - Automation paused:', !manualAutomatedTradingIntegration.isAutomationEnabled());
  
  // Step 3: Update allocations based on manual trade
  console.log('\n📊 Updating allocations after manual trade...');
  await allocationManagementService.updateAllocationsAfterTrade(manualTrade);
  
  const currentAllocations = allocationManagementService.getCurrentAllocations();
  console.log('✅ Allocations updated:', currentAllocations);
  
  // Step 4: Re-enable automation
  console.log('\n🔄 Re-enabling automation...');
  await manualAutomatedTradingIntegration.enableAutomation();
  console.log('✅ Automation re-enabled');
  
  console.log('\n✅ Example 3 completed!\n');
}

/**
 * Example 4: Error handling and recovery
 */
async function example4_ErrorHandlingAndRecovery() {
  console.log('🛡️  Example 4: Error Handling and Recovery\n');
  
  // Step 1: Simulate API failure with retry
  console.log('🔄 Testing retry logic with simulated failures...');
  
  let attemptCount = 0;
  const mockOperation = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('NETWORK_ERROR: Connection timeout');
    }
    return { success: true, data: 'Operation succeeded' };
  };
  
  try {
    const result = await errorHandlingFramework.executeWithRetry(
      mockOperation,
      'test_service'
    );
    
    console.log('✅ Operation succeeded after', attemptCount, 'attempts');
    console.log('  - Result:', result);
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
  }
  
  // Step 2: Check service health
  console.log('\n🏥 Checking service health...');
  const serviceHealth = errorHandlingFramework.getServiceHealth();
  
  console.log('📊 Service Health Status:');
  Object.entries(serviceHealth).forEach(([service, status]) => {
    console.log(`  - ${service}: ${status.status}`);
  });
  
  // Step 3: View error statistics
  console.log('\n📈 Error Statistics:');
  const errorStats = errorHandlingFramework.getErrorStats();
  console.log('  - Total errors:', errorStats.totalErrors);
  console.log('  - Recovery count:', errorStats.recoveryCount);
  console.log('  - Degradation mode:', errorStats.degradationMode);
  
  // Step 4: Check notifications
  console.log('\n🔔 System Notifications:');
  const notifications = userNotificationSystem.getNotifications();
  console.log('  - Total notifications:', notifications.length);
  console.log('  - Unread:', userNotificationSystem.getStats().unread);
  
  console.log('\n✅ Example 4 completed!\n');
}

/**
 * Example 5: Status indicators and monitoring
 */
async function example5_StatusIndicatorsAndMonitoring() {
  console.log('📊 Example 5: Status Indicators and Monitoring\n');
  
  // Step 1: Update all status indicators
  console.log('🔄 Updating status indicators...');
  await userNotificationSystem.updatePriceDataStatus();
  await userNotificationSystem.updateServiceHealthStatus();
  
  // Step 2: Display status indicators
  console.log('\n📈 Current Status Indicators:');
  const indicators = userNotificationSystem.getStatusIndicators();
  
  Object.values(indicators).forEach(indicator => {
    console.log(`\n  ${indicator.icon} ${indicator.label}:`);
    console.log(`    - Status: ${indicator.status}`);
    console.log(`    - Value: ${indicator.value}`);
    console.log(`    - Color: ${indicator.color}`);
  });
  
  // Step 3: Check price data freshness
  console.log('\n💰 Price Data Freshness:');
  const priceIndicator = indicators.price_freshness;
  if (priceIndicator && priceIndicator.details) {
    console.log('  - Total tokens:', priceIndicator.details.totalTokens);
    console.log('  - Fresh prices:', priceIndicator.details.freshPrices);
    console.log('  - Stale prices:', priceIndicator.details.stalePrices);
  }
  
  console.log('\n✅ Example 5 completed!\n');
}

/**
 * Run all examples
 */
export async function runCompleteWorkflowExamples() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Enhanced Portfolio Management - Complete Workflow Examples');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Initialize system
    await initializePortfolioSystem();
    
    // Run examples
    await example1_CreatePortfolioWithRebalancing();
    await example2_RiskManagementWithTrailingStops();
    await example3_ManualTradingIntegration();
    await example4_ErrorHandlingAndRecovery();
    await example5_StatusIndicatorsAndMonitoring();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ All examples completed successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
    throw error;
  }
}

// Export individual examples
export {
  initializePortfolioSystem,
  example1_CreatePortfolioWithRebalancing,
  example2_RiskManagementWithTrailingStops,
  example3_ManualTradingIntegration,
  example4_ErrorHandlingAndRecovery,
  example5_StatusIndicatorsAndMonitoring
};
