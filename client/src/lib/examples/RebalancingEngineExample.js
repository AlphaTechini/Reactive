/**
 * Example usage of the RebalancingEngine
 * 
 * This file demonstrates how to use the intelligent rebalancing engine
 * for portfolio management with drift detection and gas optimization.
 */

import { rebalancingEngine } from '../services/RebalancingEngine.js';
import { enhancedPriceDisplayService } from '../services/EnhancedPriceDisplayService.js';

/**
 * Example: Complete rebalancing workflow
 */
export async function exampleRebalancingWorkflow() {
  try {
    // Initialize services
    await enhancedPriceDisplayService.initialize();
    await rebalancingEngine.initialize({
      driftThreshold: 0.05,    // 5% drift threshold
      maxGasPercent: 0.02,     // 2% max gas cost
      minTradeValue: 10        // $10 minimum trade
    });

    // Example portfolio data
    const currentAllocations = {
      '0x1': 0.35,  // BTC: 35%
      '0x2': 0.40,  // ETH: 40%
      '0x3': 0.25   // USDC: 25%
    };

    const targetAllocations = {
      '0x1': 0.30,  // BTC: 30% (target)
      '0x2': 0.50,  // ETH: 50% (target)
      '0x3': 0.20   // USDC: 20% (target)
    };

    const currentHoldings = {
      '0x1': 0.5,    // 0.5 BTC
      '0x2': 10.0,   // 10 ETH
      '0x3': 15000   // 15,000 USDC
    };

    const totalPortfolioValue = 60000; // $60,000

    console.log('🔍 Step 1: Analyze drift...');
    const driftAnalysis = rebalancingEngine.analyzeDrift(currentAllocations, targetAllocations);
    console.log('Drift analysis:', driftAnalysis);

    if (!driftAnalysis.needsRebalancing) {
      console.log('✅ Portfolio is balanced, no rebalancing needed');
      return;
    }

    console.log('⚡ Step 2: Calculate optimal trades...');
    const tradeOptimization = rebalancingEngine.calculateOptimalTrades(
      currentHoldings,
      targetAllocations,
      totalPortfolioValue
    );
    console.log('Trade optimization:', tradeOptimization);

    console.log('⛽ Step 3: Estimate gas costs...');
    const gasEstimation = await rebalancingEngine.estimateGasCosts(tradeOptimization.executionPlan);
    console.log('Gas estimation:', gasEstimation);

    console.log('🔧 Step 4: Optimize for gas efficiency...');
    const { batches, gasOptimization } = rebalancingEngine.optimizeTradesForGas(
      tradeOptimization.executionPlan,
      gasEstimation
    );
    console.log('Gas optimization:', gasOptimization);
    console.log('Trade batches:', batches);

    console.log('✅ Step 5: Validate conditions...');
    const validation = await rebalancingEngine.validateRebalancingConditions(tradeOptimization.executionPlan);
    console.log('Validation:', validation);

    if (!validation.canProceed) {
      console.log('❌ Rebalancing cannot proceed:', validation.errors);
      return;
    }

    console.log('🚀 Step 6: Execute rebalancing...');
    const executionReport = await rebalancingEngine.executeRebalancing(
      tradeOptimization.executionPlan,
      { dryRun: true } // Set to false for actual execution
    );
    console.log('Execution report:', executionReport);

    console.log('📊 Step 7: Get execution summary...');
    const detailedReport = rebalancingEngine.createExecutionReport(executionReport);
    console.log('Detailed report:', detailedReport);

    return detailedReport;

  } catch (error) {
    console.error('❌ Rebalancing workflow failed:', error);
    throw error;
  }
}

/**
 * Example: Monitor drift and trigger rebalancing
 */
export async function exampleDriftMonitoring() {
  try {
    await rebalancingEngine.initialize();

    // Subscribe to rebalancing state updates
    const unsubscribe = rebalancingEngine.subscribe((state) => {
      console.log('Rebalancing state updated:', state);
    });

    // Example monitoring loop
    const monitoringInterval = setInterval(async () => {
      try {
        const currentAllocations = getCurrentPortfolioAllocations(); // Your implementation
        const targetAllocations = getTargetAllocations(); // Your implementation

        const driftAnalysis = rebalancingEngine.getDriftAnalysis(currentAllocations, targetAllocations);
        
        if (driftAnalysis.needsRebalancing) {
          console.log('🚨 Drift threshold exceeded, triggering rebalancing...');
          
          // Trigger automatic rebalancing
          await triggerAutomaticRebalancing(currentAllocations, targetAllocations);
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 60000); // Check every minute

    // Cleanup function
    return () => {
      clearInterval(monitoringInterval);
      unsubscribe();
    };

  } catch (error) {
    console.error('❌ Drift monitoring setup failed:', error);
    throw error;
  }
}

/**
 * Example: Gas-aware rebalancing with deferral
 */
export async function exampleGasAwareRebalancing() {
  try {
    await rebalancingEngine.initialize({
      maxGasPercent: 0.015 // 1.5% max gas cost (more conservative)
    });

    const trades = getRebalancingTrades(); // Your implementation
    const totalValue = getTotalPortfolioValue(); // Your implementation

    // Check gas conditions
    const gasEstimation = await rebalancingEngine.estimateGasCosts(trades);
    const deferCheck = rebalancingEngine.shouldDeferRebalancing(gasEstimation, totalValue);

    if (deferCheck.shouldDefer) {
      console.log('⏸️ Rebalancing deferred due to high gas costs:', deferCheck.reason);
      
      // Schedule retry in 30 minutes
      setTimeout(() => {
        console.log('🔄 Retrying rebalancing after gas cooldown...');
        exampleGasAwareRebalancing();
      }, 30 * 60 * 1000);
      
      return { status: 'deferred', reason: deferCheck.reason };
    }

    // Proceed with rebalancing
    console.log('✅ Gas costs acceptable, proceeding with rebalancing...');
    const result = await rebalancingEngine.executeRebalancing(trades);
    
    return result;

  } catch (error) {
    console.error('❌ Gas-aware rebalancing failed:', error);
    throw error;
  }
}

// Helper functions (to be implemented based on your specific needs)
function getCurrentPortfolioAllocations() {
  // Implementation depends on your portfolio data source
  return {
    '0x1': 0.35,
    '0x2': 0.40,
    '0x3': 0.25
  };
}

function getTargetAllocations() {
  // Implementation depends on your target allocation storage
  return {
    '0x1': 0.30,
    '0x2': 0.50,
    '0x3': 0.20
  };
}

function getRebalancingTrades() {
  // Implementation depends on your trade calculation logic
  return [];
}

function getTotalPortfolioValue() {
  // Implementation depends on your portfolio valuation logic
  return 60000;
}

async function triggerAutomaticRebalancing(currentAllocations, targetAllocations) {
  // Implementation depends on your automatic rebalancing logic
  console.log('Triggering automatic rebalancing...');
}

export default {
  exampleRebalancingWorkflow,
  exampleDriftMonitoring,
  exampleGasAwareRebalancing
};