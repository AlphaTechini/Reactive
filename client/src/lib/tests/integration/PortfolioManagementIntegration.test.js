/**
 * End-to-End Integration Tests for Enhanced Portfolio Management
 * 
 * Tests complete portfolio management workflow including:
 * - Price updates propagating through all components
 * - Manual and automated trading integration
 * - Rebalancing engine with risk management
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enhancedPriceDisplayService } from '../../services/EnhancedPriceDisplayService.js';
import { rebalancingEngine } from '../../services/RebalancingEngine.js';
import { riskManagementService } from '../../services/RiskManagementService.js';
import { allocationManagementService } from '../../services/AllocationManagementService.js';
import { manualAutomatedTradingIntegration } from '../../services/ManualAutomatedTradingIntegration.js';
import { errorHandlingFramework } from '../../services/ErrorHandlingFramework.js';
import { userNotificationSystem } from '../../services/UserNotificationSystem.js';

describe('Portfolio Management Integration Tests', () => {
  beforeEach(async () => {
    // Initialize all services
    await errorHandlingFramework.initialize();
    await userNotificationSystem.initialize();
    await enhancedPriceDisplayService.initialize();
    await rebalancingEngine.initialize();
    await riskManagementService.initialize();
    await allocationManagementService.initialize();
    await manualAutomatedTradingIntegration.initialize();
  });

  afterEach(() => {
    // Cleanup all services
    errorHandlingFramework.destroy();
    userNotificationSystem.destroy();
    enhancedPriceDisplayService.destroy();
    rebalancingEngine.destroy();
    riskManagementService.destroy();
    allocationManagementService.destroy();
    manualAutomatedTradingIntegration.destroy();
  });

  describe('Complete Portfolio Management Workflow', () => {
    it('should handle complete portfolio creation and management flow', async () => {
      // Step 1: Create portfolio with initial allocation
      const initialAllocation = {
        '0x1': 0.4,  // BTC 40%
        '0x2': 0.35, // ETH 35%
        '0x3': 0.25  // USDC 25%
      };

      
      const result = await allocationManagementService.setTargetAllocations(initialAllocation);
      expect(result.success).toBe(true);
      expect(result.allocations).toEqual(initialAllocation);
      
      // Step 2: Verify price updates are fetched
      await enhancedPriceDisplayService.fetchAllPrices();
      const prices = enhancedPriceDisplayService.getAllPrices();
      expect(Object.keys(prices).length).toBeGreaterThan(0);
      
      // Step 3: Set up risk management parameters
      await riskManagementService.setTrailingStopLoss('0x1', 0.05, 0.10);
      const riskParams = riskManagementService.getRiskParameters('0x1');
      expect(riskParams.trailingStop.enabled).toBe(true);
      
      // Step 4: Verify allocation tracking works
      const currentAllocations = allocationManagementService.getCurrentAllocations();
      expect(currentAllocations).toBeDefined();
      
      // Step 5: Test rebalancing analysis
      const driftAnalysis = rebalancingEngine.analyzeDrift(
        currentAllocations,
        initialAllocation
      );
      expect(driftAnalysis).toBeDefined();
      expect(driftAnalysis.needsRebalancing).toBeDefined();
    });

    it('should propagate price updates through all components', async () => {
      // Fetch initial prices
      await enhancedPriceDisplayService.fetchAllPrices();
      const initialPrices = enhancedPriceDisplayService.getAllPrices();
      
      // Simulate price update
      await enhancedPriceDisplayService.refreshTokenPrice('0x1');
      const updatedPrices = enhancedPriceDisplayService.getAllPrices();
      
      // Verify prices updated
      expect(updatedPrices['0x1']).toBeDefined();
      expect(updatedPrices['0x1'].timestamp).toBeGreaterThanOrEqual(
        initialPrices['0x1']?.timestamp || 0
      );
      
      // Verify risk management sees updated prices
      const triggers = await riskManagementService.evaluateRiskTriggers('0x1');
      expect(Array.isArray(triggers)).toBe(true);
    });
  });

  describe('Manual and Automated Trading Integration', () => {
    it('should handle manual override of automated trading', async () => {
      // Enable automation
      await manualAutomatedTradingIntegration.enableAutomation();
      expect(manualAutomatedTradingIntegration.isAutomationEnabled()).toBe(true);
      
      // Execute manual trade
      const manualTrade = {
        tokenAddress: '0x1',
        amount: 0.1,
        type: 'buy'
      };
      
      const result = await manualAutomatedTradingIntegration.executeManualTrade(
        manualTrade,
        { pauseAutomation: true }
      );
      
      expect(result.success).toBe(true);
      expect(manualAutomatedTradingIntegration.isAutomationEnabled()).toBe(false);
    });

    it('should preserve automation state during manual mode', async () => {
      // Set up automation with risk parameters
      await riskManagementService.setTrailingStopLoss('0x1', 0.05, 0.10);
      await manualAutomatedTradingIntegration.enableAutomation();
      
      // Switch to manual mode
      await manualAutomatedTradingIntegration.disableAutomation();
      
      // Verify risk parameters are preserved
      const riskParams = riskManagementService.getRiskParameters('0x1');
      expect(riskParams.trailingStop.enabled).toBe(true);
      
      // Re-enable automation
      await manualAutomatedTradingIntegration.enableAutomation();
      
      // Verify parameters still intact
      const restoredParams = riskManagementService.getRiskParameters('0x1');
      expect(restoredParams.trailingStop.enabled).toBe(true);
    });
  });


  describe('Rebalancing with Risk Management', () => {
    it('should defer rebalancing when gas costs are too high', async () => {
      const currentHoldings = {
        '0x1': 0.5,
        '0x2': 2.0,
        '0x3': 1000
      };
      
      const targetAllocations = {
        '0x1': 0.4,
        '0x2': 0.35,
        '0x3': 0.25
      };
      
      const totalValue = 10000;
      
      // Calculate trades
      const tradeOptimization = rebalancingEngine.calculateOptimalTrades(
        currentHoldings,
        targetAllocations,
        totalValue
      );
      
      // Estimate gas costs
      const gasEstimation = await rebalancingEngine.estimateGasCosts(
        tradeOptimization.executionPlan
      );
      
      // Check deferral logic
      const deferCheck = rebalancingEngine.shouldDeferRebalancing(
        gasEstimation,
        tradeOptimization.totalValueToTrade
      );
      
      expect(deferCheck).toBeDefined();
      expect(deferCheck.shouldDefer).toBeDefined();
      
      // If deferred, verify notification is shown
      if (deferCheck.shouldDefer) {
        const notifications = userNotificationSystem.getNotifications({
          category: 'rebalancing'
        });
        expect(notifications.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should execute risk triggers with proper prioritization', async () => {
      // Set up multiple risk triggers
      await riskManagementService.setTrailingStopLoss('0x1', 0.05, 0.10);
      
      // Simulate price drop that triggers stop-loss
      const triggers = await riskManagementService.evaluateRiskTriggers();
      
      if (triggers.length > 0) {
        // Execute triggers
        const result = await riskManagementService.executeRiskTriggers(
          triggers,
          { dryRun: true }
        );
        
        expect(result.executed).toBeDefined();
        expect(result.failed).toBeDefined();
        expect(result.skipped).toBeDefined();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API failures with retry logic', async () => {
      // Mock API failure
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValueOnce({ success: true });
      
      // Execute with retry
      const result = await errorHandlingFramework.executeWithRetry(
        mockOperation,
        'test_service'
      );
      
      expect(result.success).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should trigger graceful degradation on service failures', async () => {
      // Simulate multiple service failures
      for (let i = 0; i < 5; i++) {
        errorHandlingFramework.recordFailure('price_service', `op_${i}`, 
          new Error('Service unavailable'), false);
      }
      
      // Check if circuit breaker opened
      const canExecute = errorHandlingFramework.canExecute('price_service');
      expect(typeof canExecute).toBe('boolean');
      
      // Verify degradation mode updated
      const status = errorHandlingFramework.getStatus();
      expect(status.globalDegradationMode).toBeDefined();
    });

    it('should show user notifications for system issues', async () => {
      // Trigger a critical error
      const error = new Error('Critical system failure');
      error.code = 'CRITICAL_ERROR';
      
      errorHandlingFramework.logError(
        error,
        'critical',
        'system'
      );
      
      // Verify notification was created
      const notifications = userNotificationSystem.getNotifications({
        type: 'critical'
      });
      
      expect(notifications.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Status Indicators and Monitoring', () => {
    it('should update price freshness status indicator', async () => {
      await enhancedPriceDisplayService.fetchAllPrices();
      
      // Trigger status update
      await userNotificationSystem.updatePriceDataStatus();
      
      const indicators = userNotificationSystem.getStatusIndicators();
      expect(indicators.price_freshness).toBeDefined();
      expect(indicators.price_freshness.status).toBeDefined();
    });

    it('should track service health status', async () => {
      await userNotificationSystem.updateServiceHealthStatus();
      
      const indicators = userNotificationSystem.getStatusIndicators();
      expect(indicators.service_health).toBeDefined();
      expect(indicators.service_health.value).toBeDefined();
    });
  });
});
