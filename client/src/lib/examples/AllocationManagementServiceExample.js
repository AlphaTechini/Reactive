/**
 * Allocation Management Service Usage Examples
 * 
 * Demonstrates how to use the AllocationManagementService for:
 * - Auto-distribute functionality
 * - Custom allocation validation
 * - Liquidity checking
 * - Real-time allocation tracking
 * - Drift notifications
 */

import { allocationManagementService } from '../services/AllocationManagementService.js';
import { enhancedPriceDisplayService } from '../services/EnhancedPriceDisplayService.js';

/**
 * Example 1: Initialize and set up auto-distribute mode
 */
export async function exampleAutoDistribute() {
  console.log('=== Auto-Distribute Example ===');
  
  try {
    // Initialize the service
    await allocationManagementService.initialize({
      minAllocationPercent: 0.01, // 0.01% minimum
      driftThreshold: 0.05 // 5% drift threshold
    });
    
    // Define tokens for auto-distribution
    const selectedTokens = [
      '0x0000000000000000000000000000000000000000', // ETH
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8', // USDC
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8'  // WBTC
    ];
    
    // Enable auto-distribute mode
    const autoDistributeResult = await allocationManagementService.setAutoDistributeMode(selectedTokens, true);
    
    console.log('Auto-distribute enabled:', autoDistributeResult);
    console.log('Equal allocation per token:', autoDistributeResult.equalPercent + '%');
    
    // Get current auto-distribute status
    const status = allocationManagementService.getAutoDistributeStatus();
    console.log('Auto-distribute status:', status);
    
    return autoDistributeResult;
    
  } catch (error) {
    console.error('Auto-distribute example failed:', error);
    throw error;
  }
}

/**
 * Example 2: Set and validate custom allocations
 */
export async function exampleCustomAllocations() {
  console.log('=== Custom Allocations Example ===');
  
  try {
    // Define custom allocation percentages
    const customAllocations = {
      '0x0000000000000000000000000000000000000000': 50.0, // ETH: 50%
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 30.0, // USDC: 30%
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 20.0  // WBTC: 20%
    };
    
    // Validate the allocations first
    const validation = allocationManagementService.validateCustomAllocations(customAllocations);
    console.log('Validation result:', validation);
    
    if (validation.canProceed) {
      // Set the custom allocations
      const result = await allocationManagementService.setCustomAllocations(customAllocations);
      console.log('Custom allocations set:', result);
      
      // Get current target allocations
      const targetAllocations = allocationManagementService.getTargetAllocations();
      console.log('Current target allocations:', targetAllocations);
      
      return result;
    } else {
      console.log('Validation failed:', validation.errors);
      return validation;
    }
    
  } catch (error) {
    console.error('Custom allocations example failed:', error);
    throw error;
  }
}

/**
 * Example 3: Check liquidity for allocations
 */
export async function exampleLiquidityCheck() {
  console.log('=== Liquidity Check Example ===');
  
  try {
    // Define allocations to check
    const allocations = {
      '0x0000000000000000000000000000000000000000': 40.0, // ETH: 40%
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 35.0, // USDC: 35%
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 25.0  // WBTC: 25%
    };
    
    const portfolioValueUSD = 50000; // $50,000 portfolio
    
    // Check liquidity for the allocations
    const liquidityAnalysis = await allocationManagementService.checkLiquidityForAllocations(
      allocations, 
      portfolioValueUSD
    );
    
    console.log('Liquidity analysis:', liquidityAnalysis);
    console.log('Overall feasible:', liquidityAnalysis.overallFeasible);
    console.log('Liquidity ratio:', liquidityAnalysis.overallLiquidityRatio.toFixed(2));
    
    // Check individual token liquidity
    for (const [tokenAddress, tokenLiquidity] of Object.entries(liquidityAnalysis.tokenLiquidity)) {
      console.log(`${tokenLiquidity.symbol} liquidity:`, {
        required: `$${tokenLiquidity.requiredValueUSD.toFixed(2)}`,
        available: `$${tokenLiquidity.availableLiquidityUSD.toFixed(2)}`,
        feasible: tokenLiquidity.isFeasible,
        warnings: tokenLiquidity.warnings
      });
    }
    
    return liquidityAnalysis;
    
  } catch (error) {
    console.error('Liquidity check example failed:', error);
    throw error;
  }
}

/**
 * Example 4: Track manual trades and allocation updates
 */
export async function exampleManualTradeTracking() {
  console.log('=== Manual Trade Tracking Example ===');
  
  try {
    // Simulate current allocations
    const currentAllocations = {
      '0x0000000000000000000000000000000000000000': 45.0, // ETH: 45%
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 35.0, // USDC: 35%
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 20.0  // WBTC: 20%
    };
    
    // Update current allocations
    allocationManagementService.updateCurrentAllocations(currentAllocations);
    
    // Simulate a manual trade: Sell ETH for USDC
    const manualTrade = {
      tokenIn: '0x0000000000000000000000000000000000000000', // ETH
      tokenOut: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8', // USDC
      amountIn: 2.5, // 2.5 ETH
      amountOut: 5000, // 5000 USDC
      priceIn: 2000, // $2000 per ETH
      priceOut: 1, // $1 per USDC
      valueUSD: 5000,
      slippage: 0.002, // 0.2%
      gasUsed: 150000,
      gasCostUSD: 15,
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };
    
    // Track the manual trade
    const trackedTrade = allocationManagementService.trackManualTrade(manualTrade);
    console.log('Tracked manual trade:', trackedTrade);
    
    // Get updated current allocations
    const updatedAllocations = allocationManagementService.getCurrentAllocations();
    console.log('Updated allocations after trade:', updatedAllocations);
    
    // Get manual trades history
    const tradesHistory = allocationManagementService.getManualTrades({ limit: 5 });
    console.log('Recent manual trades:', tradesHistory);
    
    return {
      trackedTrade,
      updatedAllocations,
      tradesHistory
    };
    
  } catch (error) {
    console.error('Manual trade tracking example failed:', error);
    throw error;
  }
}

/**
 * Example 5: Drift notifications and recommendations
 */
export async function exampleDriftNotifications() {
  console.log('=== Drift Notifications Example ===');
  
  try {
    // Set target allocations
    const targetAllocations = {
      '0x0000000000000000000000000000000000000000': 40.0, // ETH: 40%
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 35.0, // USDC: 35%
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 25.0  // WBTC: 25%
    };
    
    await allocationManagementService.setCustomAllocations(targetAllocations);
    
    // Simulate current allocations with significant drift
    const currentAllocations = {
      '0x0000000000000000000000000000000000000000': 50.0, // ETH: 50% (10% over target)
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 30.0, // USDC: 30% (5% under target)
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 20.0  // WBTC: 20% (5% under target)
    };
    
    // Update current allocations (this will trigger drift checking)
    allocationManagementService.updateCurrentAllocations(currentAllocations);
    
    // Get drift notifications
    const notifications = allocationManagementService.getDriftNotifications({
      unreadOnly: false,
      limit: 10
    });
    
    console.log('Drift notifications:', notifications);
    
    if (notifications.notifications.length > 0) {
      const latestNotification = notifications.notifications[0];
      console.log('Latest notification:', {
        title: latestNotification.title,
        message: latestNotification.message,
        severity: latestNotification.severity,
        suggestions: latestNotification.suggestions
      });
    }
    
    // Get rebalancing recommendations
    const recommendations = allocationManagementService.getRebalancingRecommendations();
    console.log('Rebalancing recommendations:', recommendations);
    
    if (recommendations.hasRecommendations) {
      console.log('Recommended actions:');
      recommendations.recommendations.forEach(rec => {
        console.log(`- ${rec.action.toUpperCase()} ${rec.symbol}: ${rec.driftPercent > 0 ? 'reduce' : 'increase'} by ${Math.abs(rec.driftPercent * 100).toFixed(2)}% ($${rec.adjustmentValueUSD.toFixed(2)})`);
      });
    }
    
    return {
      notifications,
      recommendations
    };
    
  } catch (error) {
    console.error('Drift notifications example failed:', error);
    throw error;
  }
}

/**
 * Example 6: Immediate target allocation updates
 */
export async function exampleImmediateUpdates() {
  console.log('=== Immediate Allocation Updates Example ===');
  
  try {
    // Set initial allocations
    const initialAllocations = {
      '0x0000000000000000000000000000000000000000': 50.0, // ETH: 50%
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 30.0, // USDC: 30%
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 20.0  // WBTC: 20%
    };
    
    await allocationManagementService.setCustomAllocations(initialAllocations);
    console.log('Initial allocations set:', initialAllocations);
    
    // Update single allocation immediately
    const singleUpdate = allocationManagementService.updateTargetAllocationImmediate(
      '0x0000000000000000000000000000000000000000', // ETH
      45.0 // Change from 50% to 45%
    );
    
    console.log('Single allocation update:', singleUpdate);
    
    // Batch update multiple allocations
    const batchUpdates = {
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 35.0, // USDC: 30% → 35%
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 20.0  // WBTC: keep at 20%
    };
    
    const batchUpdate = allocationManagementService.updateMultipleTargetAllocations(batchUpdates);
    console.log('Batch allocation update:', batchUpdate);
    
    // Get final allocations
    const finalAllocations = allocationManagementService.getTargetAllocations();
    console.log('Final target allocations:', finalAllocations);
    
    // Get allocation history
    const history = allocationManagementService.getAllocationHistory({ limit: 5 });
    console.log('Recent allocation history:', history);
    
    return {
      singleUpdate,
      batchUpdate,
      finalAllocations,
      history
    };
    
  } catch (error) {
    console.error('Immediate updates example failed:', error);
    throw error;
  }
}

/**
 * Example 7: Complete workflow demonstration
 */
export async function exampleCompleteWorkflow() {
  console.log('=== Complete Allocation Management Workflow ===');
  
  try {
    // 1. Initialize service
    await allocationManagementService.initialize();
    console.log('✅ Service initialized');
    
    // 2. Set up auto-distribute for 3 tokens
    const tokens = [
      '0x0000000000000000000000000000000000000000', // ETH
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8', // USDC
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8'  // WBTC
    ];
    
    await allocationManagementService.setAutoDistributeMode(tokens, true);
    console.log('✅ Auto-distribute enabled (33.33% each)');
    
    // 3. Check liquidity for $25,000 portfolio
    const liquidityCheck = await allocationManagementService.checkLiquidityForAllocations(
      allocationManagementService.getTargetAllocations(),
      25000
    );
    console.log('✅ Liquidity check completed:', liquidityCheck.overallFeasible ? 'FEASIBLE' : 'NOT FEASIBLE');
    
    // 4. Switch to custom allocations
    const customAllocations = {
      '0x0000000000000000000000000000000000000000': 45.0, // ETH: 45%
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 35.0, // USDC: 35%
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 20.0  // WBTC: 20%
    };
    
    await allocationManagementService.setCustomAllocations(customAllocations);
    console.log('✅ Custom allocations set');
    
    // 5. Simulate portfolio changes and track drift
    const driftedAllocations = {
      '0x0000000000000000000000000000000000000000': 52.0, // ETH: 52% (7% drift)
      '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 30.0, // USDC: 30% (5% drift)
      '0xB0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8': 18.0  // WBTC: 18% (2% drift)
    };
    
    allocationManagementService.updateCurrentAllocations(driftedAllocations);
    console.log('✅ Portfolio drift simulated');
    
    // 6. Check notifications and recommendations
    const notifications = allocationManagementService.getDriftNotifications();
    const recommendations = allocationManagementService.getRebalancingRecommendations();
    
    console.log('✅ Drift analysis completed');
    console.log(`   - Notifications: ${notifications.total}`);
    console.log(`   - Recommendations: ${recommendations.hasRecommendations ? recommendations.recommendations.length : 0}`);
    
    // 7. Get service status
    const status = allocationManagementService.getStatus();
    console.log('✅ Service status:', {
      initialized: status.isInitialized,
      autoDistribute: status.autoDistributeMode,
      targetTokens: status.targetAllocationsCount,
      notifications: status.unreadNotificationsCount
    });
    
    return {
      liquidityCheck,
      notifications,
      recommendations,
      status
    };
    
  } catch (error) {
    console.error('Complete workflow example failed:', error);
    throw error;
  }
}

// Export all examples for easy testing
export const allocationExamples = {
  autoDistribute: exampleAutoDistribute,
  customAllocations: exampleCustomAllocations,
  liquidityCheck: exampleLiquidityCheck,
  manualTradeTracking: exampleManualTradeTracking,
  driftNotifications: exampleDriftNotifications,
  immediateUpdates: exampleImmediateUpdates,
  completeWorkflow: exampleCompleteWorkflow
};

export default allocationExamples;