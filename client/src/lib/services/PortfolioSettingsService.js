/**
 * Portfolio Settings Service
 * 
 * Manages portfolio-specific settings and integrates with RiskManagementService and RebalancingEngine
 */

import { writable } from 'svelte/store';
import { riskManagementService } from './RiskManagementService.js';
import { rebalancingEngine } from './RebalancingEngine.js';

// Store for portfolio settings
export const portfolioSettingsStore = writable({});

class PortfolioSettingsService {
  constructor() {
    this.settings = new Map(); // portfolioId -> settings
    this.activeMonitoring = new Map(); // portfolioId -> monitoring state
  }

  /**
   * Load settings for a portfolio
   */
  loadSettings(portfolioId) {
    try {
      // SSR guard
      if (typeof window === 'undefined') {
        return this.getDefaultSettings();
      }
      
      const savedSettings = localStorage.getItem(`portfolio_settings_${portfolioId}`);
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this.settings.set(portfolioId, settings);
        return settings;
      }
      
      // Return default settings
      const defaultSettings = this.getDefaultSettings();
      this.settings.set(portfolioId, defaultSettings);
      return defaultSettings;
      
    } catch (error) {
      console.error('Error loading portfolio settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Save settings for a portfolio
   */
  saveSettings(portfolioId, settings) {
    try {
      // Validate settings
      const validation = this.validateSettings(settings);
      if (!validation.isValid) {
        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
      }
      
      // Add timestamp
      settings.updatedAt = Date.now();
      
      // Save to localStorage (SSR guard)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`portfolio_settings_${portfolioId}`, JSON.stringify(settings));
      }
      
      // Update in-memory cache
      this.settings.set(portfolioId, settings);
      
      // Update store
      this.updateStore();
      
      console.log(`✅ Settings saved for portfolio ${portfolioId}`);
      
      return settings;
      
    } catch (error) {
      console.error('Error saving portfolio settings:', error);
      throw error;
    }
  }

  /**
   * Get settings for a portfolio
   */
  getSettings(portfolioId) {
    if (this.settings.has(portfolioId)) {
      return this.settings.get(portfolioId);
    }
    
    return this.loadSettings(portfolioId);
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      stopLossPercent: 10,
      takeProfitPercent: 20,
      autoBuyPercent: 5,
      autoRebalanceEnabled: false,
      rebalanceThreshold: 5,
      trailingStopEnabled: false,
      trailingStopPercent: 5,
      maxGasPercent: 2,
      minTradeValue: 10,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Validate settings
   */
  validateSettings(settings) {
    const validation = {
      isValid: true,
      errors: []
    };
    
    // Validate stop-loss
    if (settings.stopLossPercent < 1 || settings.stopLossPercent > 50) {
      validation.errors.push('Stop-loss must be between 1% and 50%');
      validation.isValid = false;
    }
    
    // Validate take-profit
    if (settings.takeProfitPercent < 1 || settings.takeProfitPercent > 200) {
      validation.errors.push('Take-profit must be between 1% and 200%');
      validation.isValid = false;
    }
    
    // Validate auto-buy
    if (settings.autoBuyPercent < 1 || settings.autoBuyPercent > 50) {
      validation.errors.push('Auto-buy must be between 1% and 50%');
      validation.isValid = false;
    }
    
    // Validate rebalance threshold
    if (settings.rebalanceThreshold < 1 || settings.rebalanceThreshold > 50) {
      validation.errors.push('Rebalance threshold must be between 1% and 50%');
      validation.isValid = false;
    }
    
    // Validate trailing stop
    if (settings.trailingStopEnabled) {
      if (settings.trailingStopPercent < 1 || settings.trailingStopPercent > 50) {
        validation.errors.push('Trailing stop must be between 1% and 50%');
        validation.isValid = false;
      }
      
      if (settings.trailingStopPercent >= settings.stopLossPercent) {
        validation.errors.push('Trailing stop must be less than stop-loss');
        validation.isValid = false;
      }
    }
    
    // Validate gas settings
    if (settings.maxGasPercent < 0.1 || settings.maxGasPercent > 10) {
      validation.errors.push('Max gas percent must be between 0.1% and 10%');
      validation.isValid = false;
    }
    
    if (settings.minTradeValue < 1) {
      validation.errors.push('Minimum trade value must be at least $1');
      validation.isValid = false;
    }
    
    return validation;
  }

  /**
   * Apply settings to risk management service for a portfolio
   */
  async applyRiskSettings(portfolioId, portfolio) {
    const settings = this.getSettings(portfolioId);
    
    if (!portfolio || !portfolio.allocations) {
      console.warn('Portfolio or allocations not available');
      return;
    }
    
    try {
      // Initialize risk management service if needed
      if (!riskManagementService.isInitialized) {
        await riskManagementService.initialize();
      }
      
      // Apply risk parameters for each token in the portfolio
      for (const allocation of portfolio.allocations) {
        const tokenAddress = allocation.tokenAddress;
        
        // Set stop-loss
        await riskManagementService.updateRiskParameters(tokenAddress, {
          stopLoss: {
            enabled: true,
            percent: settings.stopLossPercent / 100,
            basePrice: allocation.purchasePrice || 0,
            liquidationPercent: 1.0, // 100% liquidation on stop-loss
            lastUpdate: Date.now()
          }
        });
        
        // Set take-profit
        await riskManagementService.updateRiskParameters(tokenAddress, {
          takeProfit: {
            enabled: true,
            percent: settings.takeProfitPercent / 100,
            basePrice: allocation.purchasePrice || 0,
            liquidationPercent: 0.5, // 50% liquidation on take-profit
            lastUpdate: Date.now()
          }
        });
        
        // Set trailing stop if enabled
        if (settings.trailingStopEnabled) {
          await riskManagementService.setTrailingStopLoss(
            tokenAddress,
            settings.trailingStopPercent / 100,
            settings.stopLossPercent / 100,
            {
              liquidationPercent: 0.75 // 75% liquidation on trailing stop
            }
          );
        }
      }
      
      console.log(`✅ Risk settings applied for portfolio ${portfolioId}`);
      
    } catch (error) {
      console.error('Error applying risk settings:', error);
      throw error;
    }
  }

  /**
   * Apply settings to rebalancing engine for a portfolio
   */
  async applyRebalancingSettings(portfolioId) {
    const settings = this.getSettings(portfolioId);
    
    try {
      // Initialize rebalancing engine if needed
      if (!rebalancingEngine.isInitialized) {
        await rebalancingEngine.initialize();
      }
      
      // Configure rebalancing engine
      if (settings.autoRebalanceEnabled) {
        rebalancingEngine.setConfiguration({
          driftThreshold: settings.rebalanceThreshold / 100,
          maxGasPercent: settings.maxGasPercent / 100,
          minTradeValue: settings.minTradeValue
        });
        
        console.log(`✅ Rebalancing settings applied for portfolio ${portfolioId}`);
      } else {
        console.log(`ℹ️ Auto-rebalancing disabled for portfolio ${portfolioId}`);
      }
      
    } catch (error) {
      console.error('Error applying rebalancing settings:', error);
      throw error;
    }
  }

  /**
   * Apply all settings for a portfolio
   */
  async applyAllSettings(portfolioId, portfolio) {
    try {
      await this.applyRiskSettings(portfolioId, portfolio);
      await this.applyRebalancingSettings(portfolioId);
      
      console.log(`✅ All settings applied for portfolio ${portfolioId}`);
      
    } catch (error) {
      console.error('Error applying settings:', error);
      throw error;
    }
  }

  /**
   * Start monitoring a portfolio with its settings
   */
  async startMonitoring(portfolioId, portfolio) {
    if (this.activeMonitoring.has(portfolioId)) {
      console.log(`ℹ️ Portfolio ${portfolioId} already being monitored`);
      return;
    }
    
    try {
      // Apply settings
      await this.applyAllSettings(portfolioId, portfolio);
      
      // Mark as actively monitored
      this.activeMonitoring.set(portfolioId, {
        startTime: Date.now(),
        portfolio,
        settings: this.getSettings(portfolioId)
      });
      
      console.log(`✅ Started monitoring portfolio ${portfolioId}`);
      
    } catch (error) {
      console.error('Error starting portfolio monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring a portfolio
   */
  stopMonitoring(portfolioId) {
    if (this.activeMonitoring.has(portfolioId)) {
      this.activeMonitoring.delete(portfolioId);
      console.log(`⏹️ Stopped monitoring portfolio ${portfolioId}`);
    }
  }

  /**
   * Check if a portfolio is being monitored
   */
  isMonitoring(portfolioId) {
    return this.activeMonitoring.has(portfolioId);
  }

  /**
   * Get monitoring status for a portfolio
   */
  getMonitoringStatus(portfolioId) {
    if (!this.activeMonitoring.has(portfolioId)) {
      return null;
    }
    
    const monitoring = this.activeMonitoring.get(portfolioId);
    return {
      portfolioId,
      startTime: monitoring.startTime,
      duration: Date.now() - monitoring.startTime,
      settings: monitoring.settings
    };
  }

  /**
   * Get all monitored portfolios
   */
  getMonitoredPortfolios() {
    return Array.from(this.activeMonitoring.keys());
  }

  /**
   * Update store with current settings
   */
  updateStore() {
    const settingsObj = {};
    for (const [portfolioId, settings] of this.settings) {
      settingsObj[portfolioId] = settings;
    }
    portfolioSettingsStore.set(settingsObj);
  }

  /**
   * Reset settings for a portfolio to defaults
   */
  resetSettings(portfolioId) {
    const defaultSettings = this.getDefaultSettings();
    return this.saveSettings(portfolioId, defaultSettings);
  }

  /**
   * Delete settings for a portfolio
   */
  deleteSettings(portfolioId) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`portfolio_settings_${portfolioId}`);
      }
      this.settings.delete(portfolioId);
      this.stopMonitoring(portfolioId);
      this.updateStore();
      
      console.log(`🗑️ Settings deleted for portfolio ${portfolioId}`);
      
    } catch (error) {
      console.error('Error deleting portfolio settings:', error);
      throw error;
    }
  }

  /**
   * Export settings for a portfolio
   */
  exportSettings(portfolioId) {
    const settings = this.getSettings(portfolioId);
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings for a portfolio
   */
  importSettings(portfolioId, settingsJson) {
    try {
      const settings = JSON.parse(settingsJson);
      return this.saveSettings(portfolioId, settings);
    } catch (error) {
      console.error('Error importing settings:', error);
      throw new Error('Invalid settings format');
    }
  }

  /**
   * Get settings summary for display
   */
  getSettingsSummary(portfolioId) {
    const settings = this.getSettings(portfolioId);
    
    return {
      riskManagement: {
        stopLoss: `${settings.stopLossPercent}%`,
        takeProfit: `${settings.takeProfitPercent}%`,
        autoBuy: `${settings.autoBuyPercent}%`,
        trailingStop: settings.trailingStopEnabled ? `${settings.trailingStopPercent}%` : 'Disabled'
      },
      rebalancing: {
        enabled: settings.autoRebalanceEnabled,
        threshold: `${settings.rebalanceThreshold}%`,
        maxGas: `${settings.maxGasPercent}%`,
        minTrade: `$${settings.minTradeValue}`
      },
      lastUpdated: settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'
    };
  }
}

// Create and export singleton instance
export const portfolioSettingsService = new PortfolioSettingsService();

export default portfolioSettingsService;
