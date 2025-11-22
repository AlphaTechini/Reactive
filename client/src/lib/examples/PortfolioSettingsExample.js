/**
 * Portfolio Settings Service Example
 * 
 * Demonstrates how to use the PortfolioSettingsService to manage
 * portfolio-specific risk management and rebalancing settings
 */

import { portfolioSettingsService } from '../services/PortfolioSettingsService.js';
import { riskManagementService } from '../services/RiskManagementService.js';
import { rebalancingEngine } from '../services/RebalancingEngine.js';

/**
 * Example 1: Load and save portfolio settings
 */
export async function example1_BasicSettingsManagement() {
  console.log('\n=== Example 1: Basic Settings Management ===\n');
  
  const portfolioId = 'portfolio-123';
  
  // Load settings (will return defaults if none exist)
  const settings = portfolioSettingsService.loadSettings(portfolioId);
  console.log('Loaded settings:', settings);
  
  // Modify settings
  settings.stopLossPercent = 15; // 15% stop-loss
  settings.takeProfitPercent = 30; // 30% take-profit
  settings.autoRebalanceEnabled = true;
  settings.rebalanceThreshold = 7; // 7% drift threshold
  
  // Save settings
  const savedSettings = portfolioSettingsService.saveSettings(portfolioId, settings);
  console.log('Saved settings:', savedSettings);
  
  // Get settings summary
  const summary = portfolioSettingsService.getSettingsSummary(portfolioId);
  console.log('Settings summary:', summary);
}

/**
 * Example 2: Apply settings to risk management service
 */
export async function example2_ApplyRiskSettings() {
  console.log('\n=== Example 2: Apply Risk Settings ===\n');
  
  const portfolioId = 'portfolio-123';
  
  // Mock portfolio with allocations
  const portfolio = {
    id: portfolioId,
    name: 'My Portfolio',
    balance: 10000,
    allocations: [
      {
        tokenAddress: '0x1',
        tokenSymbol: 'BTC',
        percentage: 40,
        purchasePrice: 45000
      },
      {
        tokenAddress: '0x2',
        tokenSymbol: 'ETH',
        percentage: 30,
        purchasePrice: 2500
      },
      {
        tokenAddress: '0x3',
        tokenSymbol: 'USDC',
        percentage: 30,
        purchasePrice: 1
      }
    ]
  };
  
  // Apply risk settings
  await portfolioSettingsService.applyRiskSettings(portfolioId, portfolio);
  
  // Check that risk parameters were set
  const btcRiskParams = riskManagementService.getRiskParameters('0x1');
  console.log('BTC risk parameters:', btcRiskParams);
  
  const ethRiskParams = riskManagementService.getRiskParameters('0x2');
  console.log('ETH risk parameters:', ethRiskParams);
}

/**
 * Example 3: Apply settings to rebalancing engine
 */
export async function example3_ApplyRebalancingSettings() {
  console.log('\n=== Example 3: Apply Rebalancing Settings ===\n');
  
  const portfolioId = 'portfolio-123';
  
  // Load settings
  const settings = portfolioSettingsService.loadSettings(portfolioId);
  
  // Enable auto-rebalancing
  settings.autoRebalanceEnabled = true;
  settings.rebalanceThreshold = 5; // 5% drift
  settings.maxGasPercent = 2; // Max 2% gas cost
  settings.minTradeValue = 10; // Min $10 trade
  
  portfolioSettingsService.saveSettings(portfolioId, settings);
  
  // Apply rebalancing settings
  await portfolioSettingsService.applyRebalancingSettings(portfolioId);
  
  // Check rebalancing engine configuration
  const config = rebalancingEngine.getConfiguration();
  console.log('Rebalancing engine config:', config);
}

/**
 * Example 4: Start monitoring a portfolio
 */
export async function example4_StartMonitoring() {
  console.log('\n=== Example 4: Start Portfolio Monitoring ===\n');
  
  const portfolioId = 'portfolio-123';
  
  const portfolio = {
    id: portfolioId,
    name: 'My Portfolio',
    balance: 10000,
    allocations: [
      {
        tokenAddress: '0x1',
        tokenSymbol: 'BTC',
        percentage: 50,
        purchasePrice: 45000
      },
      {
        tokenAddress: '0x2',
        tokenSymbol: 'ETH',
        percentage: 50,
        purchasePrice: 2500
      }
    ]
  };
  
  // Start monitoring (applies all settings and activates services)
  await portfolioSettingsService.startMonitoring(portfolioId, portfolio);
  
  // Check monitoring status
  const status = portfolioSettingsService.getMonitoringStatus(portfolioId);
  console.log('Monitoring status:', status);
  
  // Check if monitoring
  const isMonitoring = portfolioSettingsService.isMonitoring(portfolioId);
  console.log('Is monitoring:', isMonitoring);
  
  // Get all monitored portfolios
  const monitored = portfolioSettingsService.getMonitoredPortfolios();
  console.log('Monitored portfolios:', monitored);
}

/**
 * Example 5: Advanced settings with trailing stop-loss
 */
export async function example5_AdvancedSettings() {
  console.log('\n=== Example 5: Advanced Settings ===\n');
  
  const portfolioId = 'portfolio-advanced';
  
  // Create advanced settings
  const settings = {
    stopLossPercent: 12,
    takeProfitPercent: 25,
    autoBuyPercent: 8,
    autoRebalanceEnabled: true,
    rebalanceThreshold: 6,
    trailingStopEnabled: true, // Enable trailing stop
    trailingStopPercent: 8, // Trail 8% below high
    maxGasPercent: 1.5,
    minTradeValue: 20
  };
  
  // Save settings
  portfolioSettingsService.saveSettings(portfolioId, settings);
  
  // Mock portfolio
  const portfolio = {
    id: portfolioId,
    name: 'Advanced Portfolio',
    balance: 50000,
    allocations: [
      {
        tokenAddress: '0x1',
        tokenSymbol: 'BTC',
        percentage: 60,
        purchasePrice: 45000
      },
      {
        tokenAddress: '0x2',
        tokenSymbol: 'ETH',
        percentage: 40,
        purchasePrice: 2500
      }
    ]
  };
  
  // Apply all settings
  await portfolioSettingsService.applyAllSettings(portfolioId, portfolio);
  
  // Check that trailing stop was set
  const btcRiskParams = riskManagementService.getRiskParameters('0x1');
  console.log('BTC risk parameters with trailing stop:', btcRiskParams);
}

/**
 * Example 6: Settings validation
 */
export async function example6_SettingsValidation() {
  console.log('\n=== Example 6: Settings Validation ===\n');
  
  const portfolioId = 'portfolio-validation';
  
  // Try to save invalid settings
  const invalidSettings = {
    stopLossPercent: 60, // Invalid: > 50%
    takeProfitPercent: 20,
    autoBuyPercent: 5,
    autoRebalanceEnabled: false,
    rebalanceThreshold: 5,
    trailingStopEnabled: false,
    trailingStopPercent: 5,
    maxGasPercent: 2,
    minTradeValue: 10
  };
  
  try {
    portfolioSettingsService.saveSettings(portfolioId, invalidSettings);
    console.log('❌ Should have thrown validation error');
  } catch (error) {
    console.log('✅ Validation error caught:', error.message);
  }
  
  // Try valid settings
  const validSettings = {
    stopLossPercent: 15,
    takeProfitPercent: 30,
    autoBuyPercent: 5,
    autoRebalanceEnabled: true,
    rebalanceThreshold: 5,
    trailingStopEnabled: true,
    trailingStopPercent: 10, // Must be < stopLossPercent
    maxGasPercent: 2,
    minTradeValue: 10
  };
  
  try {
    portfolioSettingsService.saveSettings(portfolioId, validSettings);
    console.log('✅ Valid settings saved successfully');
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

/**
 * Example 7: Export and import settings
 */
export async function example7_ExportImport() {
  console.log('\n=== Example 7: Export and Import Settings ===\n');
  
  const portfolioId1 = 'portfolio-source';
  const portfolioId2 = 'portfolio-destination';
  
  // Create settings for portfolio 1
  const settings = {
    stopLossPercent: 15,
    takeProfitPercent: 30,
    autoBuyPercent: 7,
    autoRebalanceEnabled: true,
    rebalanceThreshold: 6,
    trailingStopEnabled: true,
    trailingStopPercent: 10,
    maxGasPercent: 1.8,
    minTradeValue: 15
  };
  
  portfolioSettingsService.saveSettings(portfolioId1, settings);
  
  // Export settings
  const exported = portfolioSettingsService.exportSettings(portfolioId1);
  console.log('Exported settings:', exported);
  
  // Import to portfolio 2
  portfolioSettingsService.importSettings(portfolioId2, exported);
  
  // Verify import
  const imported = portfolioSettingsService.getSettings(portfolioId2);
  console.log('Imported settings:', imported);
}

/**
 * Example 8: Multiple portfolios with different settings
 */
export async function example8_MultiplePortfolios() {
  console.log('\n=== Example 8: Multiple Portfolios ===\n');
  
  // Conservative portfolio
  const conservativeSettings = {
    stopLossPercent: 8,
    takeProfitPercent: 15,
    autoBuyPercent: 3,
    autoRebalanceEnabled: true,
    rebalanceThreshold: 3,
    trailingStopEnabled: false,
    trailingStopPercent: 5,
    maxGasPercent: 1,
    minTradeValue: 5
  };
  
  portfolioSettingsService.saveSettings('portfolio-conservative', conservativeSettings);
  
  // Aggressive portfolio
  const aggressiveSettings = {
    stopLossPercent: 20,
    takeProfitPercent: 50,
    autoBuyPercent: 10,
    autoRebalanceEnabled: true,
    rebalanceThreshold: 10,
    trailingStopEnabled: true,
    trailingStopPercent: 15,
    maxGasPercent: 3,
    minTradeValue: 20
  };
  
  portfolioSettingsService.saveSettings('portfolio-aggressive', aggressiveSettings);
  
  // Compare summaries
  const conservativeSummary = portfolioSettingsService.getSettingsSummary('portfolio-conservative');
  const aggressiveSummary = portfolioSettingsService.getSettingsSummary('portfolio-aggressive');
  
  console.log('Conservative portfolio:', conservativeSummary);
  console.log('Aggressive portfolio:', aggressiveSummary);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running Portfolio Settings Service Examples\n');
  
  try {
    await example1_BasicSettingsManagement();
    await example2_ApplyRiskSettings();
    await example3_ApplyRebalancingSettings();
    await example4_StartMonitoring();
    await example5_AdvancedSettings();
    await example6_SettingsValidation();
    await example7_ExportImport();
    await example8_MultiplePortfolios();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
  }
}

// Export for use in browser console or tests
if (typeof window !== 'undefined') {
  window.portfolioSettingsExamples = {
    example1_BasicSettingsManagement,
    example2_ApplyRiskSettings,
    example3_ApplyRebalancingSettings,
    example4_StartMonitoring,
    example5_AdvancedSettings,
    example6_SettingsValidation,
    example7_ExportImport,
    example8_MultiplePortfolios,
    runAllExamples
  };
}
