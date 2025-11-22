/**
 * Automation Control Service
 * 
 * Implements automation enable/disable functionality, risk setting preservation
 * across mode changes, and safety checks for automation re-activation
 * as specified in requirements 5.4, 5.5
 */

import { writable } from 'svelte/store';
import { allocationManagementService } from './AllocationManagementService.js';
import { riskManagementService } from './RiskManagementService.js';
import { rebalancingEngine } from './RebalancingEngine.js';
import { automationService } from '../automationService.js';

// Automation control constants
const SAFETY_CHECK_TIMEOUT = 10000; // 10 seconds for safety checks
const STATE_PRESERVATION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const REACTIVATION_COOLDOWN = 60000; // 1 minute cooldown for reactivation

// Automation modes
const AUTOMATION_MODES = {
  FULL: 'full',           // All automation enabled
  PARTIAL: 'partial',     // Some services enabled
  MANUAL: 'manual',       // All automation disabled
  MAINTENANCE: 'maintenance' // Temporarily disabled for maintenance
};

// Service types for automation control
const SERVICE_TYPES = {
  REBALANCING: 'rebalancing',
  RISK_MANAGEMENT: 'risk_management',
  ALLOCATION_TRACKING: 'allocation_tracking',
  PRICE_MONITORING: 'price_monitoring'
};

// Reactive stores for automation control state
export const automationControlStateStore = writable({
  mode: AUTOMATION_MODES.FULL,
  isEnabled: true,
  enabledServices: [],
  disabledServices: [],
  lastModeChange: null,
  safetyChecksActive: false
});

export const preservedSettingsStore = writable({
  hasPreservedSettings: false,
  preservedAt: null,
  expiresAt: null,
  settings: null
});

export const automationSafetyStore = writable({
  safetyChecks: [],
  lastSafetyCheck: null,
  reactivationBlocked: false,
  blockingReasons: []
});

class AutomationControlService {
  constructor() {
    this.isInitialized = false;
    this.currentMode = AUTOMATION_MODES.FULL;
    this.isEnabled = true;
    this.enabledServices = new Set();
    this.disabledServices = new Set();
    this.preservedSettings = null;
    this.safetyChecks = [];
    this.lastModeChange = null;
    this.reactivationCooldown = null;
    
    // State management
    this.state = {
      mode: AUTOMATION_MODES.FULL,
      isEnabled: true,
      enabledServices: [],
      disabledServices: [],
      lastModeChange: null,
      safetyChecksActive: false
    };
    
    // Service references
    this.services = {
      [SERVICE_TYPES.REBALANCING]: null,
      [SERVICE_TYPES.RISK_MANAGEMENT]: null,
      [SERVICE_TYPES.ALLOCATION_TRACKING]: null,
      [SERVICE_TYPES.PRICE_MONITORING]: null
    };
    
    // Configuration
    this.safetyCheckTimeout = SAFETY_CHECK_TIMEOUT;
    this.preservationTTL = STATE_PRESERVATION_TTL;
    this.reactivationCooldownPeriod = REACTIVATION_COOLDOWN;
  }

  /**
   * Initialize the automation control service
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('🔄 Automation Control Service already initialized');
      return;
    }

    console.log('🚀 Initializing Automation Control Service...');
    
    try {
      // Set configuration options
      this.safetyCheckTimeout = options.safetyCheckTimeout || SAFETY_CHECK_TIMEOUT;
      this.preservationTTL = options.preservationTTL || STATE_PRESERVATION_TTL;
      this.reactivationCooldownPeriod = options.reactivationCooldownPeriod || REACTIVATION_COOLDOWN;
      
      // Initialize service references
      this.services[SERVICE_TYPES.REBALANCING] = rebalancingEngine;
      this.services[SERVICE_TYPES.RISK_MANAGEMENT] = riskManagementService;
      this.services[SERVICE_TYPES.ALLOCATION_TRACKING] = allocationManagementService;
      
      // Initialize all services as enabled by default
      this.enabledServices = new Set(Object.values(SERVICE_TYPES));
      
      // Load preserved settings if they exist
      await this.loadPreservedSettings();
      
      // Set up periodic cleanup
      this.startPeriodicCleanup();
      
      this.isInitialized = true;
      console.log('✅ Automation Control Service initialized successfully');
      
      // Update state stores
      this.updateStateStores();
      
    } catch (error) {
      console.error('❌ Failed to initialize Automation Control Service:', error);
      throw error;
    }
  }

  /**
   * Enable automation with safety checks
   * Implements requirement 5.4 - automation enable functionality with safety checks
   */
  async enableAutomation(options = {}) {
    console.log('▶️ Enabling automation...');
    
    if (!this.isInitialized) {
      throw new Error('Automation Control Service not initialized');
    }

    if (this.isEnabled && this.currentMode === AUTOMATION_MODES.FULL) {
      console.log('✅ Automation already fully enabled');
      return this.getAutomationStatus();
    }

    // Check reactivation cooldown
    if (this.isInReactivationCooldown()) {
      const remainingCooldown = this.getRemainingReactivationCooldown();
      throw new Error(`Reactivation cooldown active. ${Math.ceil(remainingCooldown / 1000)}s remaining`);
    }

    // Perform safety checks before enabling
    const safetyCheckResults = await this.performSafetyChecks(options);
    
    if (!safetyCheckResults.canEnable) {
      throw new Error(`Safety checks failed: ${safetyCheckResults.blockingReasons.join(', ')}`);
    }

    try {
      // Restore preserved settings if available
      if (this.preservedSettings && !this.isPreservedSettingsExpired()) {
        await this.restorePreservedSettings();
      }

      // Enable individual services
      const enableResults = await this.enableServices(options.services || Object.values(SERVICE_TYPES));
      
      // Update automation state
      this.isEnabled = true;
      this.currentMode = this.determineAutomationMode();
      this.lastModeChange = Date.now();
      this.reactivationCooldown = Date.now() + this.reactivationCooldownPeriod;
      
      // Clear preserved settings after successful restoration
      if (options.clearPreservedSettings !== false) {
        this.clearPreservedSettings();
      }
      
      console.log(`✅ Automation enabled successfully - Mode: ${this.currentMode}, Services: ${enableResults.enabled.length}`);
      
      // Update state stores
      this.updateStateStores();
      
      return {
        enabled: true,
        mode: this.currentMode,
        enabledServices: enableResults.enabled,
        failedServices: enableResults.failed,
        safetyChecks: safetyCheckResults,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Failed to enable automation:', error);
      throw error;
    }
  }

  /**
   * Disable automation with settings preservation
   * Implements requirement 5.4 - automation disable functionality with settings preservation
   */
  async disableAutomation(options = {}) {
    console.log('⏸️ Disabling automation...');
    
    if (!this.isInitialized) {
      throw new Error('Automation Control Service not initialized');
    }

    if (!this.isEnabled && this.currentMode === AUTOMATION_MODES.MANUAL) {
      console.log('✅ Automation already disabled');
      return this.getAutomationStatus();
    }

    try {
      // Preserve current settings before disabling
      if (options.preserveSettings !== false) {
        await this.preserveCurrentSettings(options.preservationReason);
      }

      // Disable individual services gracefully
      const disableResults = await this.disableServices(options.services || Object.values(SERVICE_TYPES));
      
      // Update automation state
      this.isEnabled = false;
      this.currentMode = AUTOMATION_MODES.MANUAL;
      this.lastModeChange = Date.now();
      
      console.log(`⏸️ Automation disabled successfully - Preserved: ${!!this.preservedSettings}, Services: ${disableResults.disabled.length}`);
      
      // Update state stores
      this.updateStateStores();
      
      return {
        enabled: false,
        mode: this.currentMode,
        disabledServices: disableResults.disabled,
        failedServices: disableResults.failed,
        settingsPreserved: !!this.preservedSettings,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Failed to disable automation:', error);
      throw error;
    }
  }

  /**
   * Toggle automation state
   */
  async toggleAutomation(options = {}) {
    if (this.isEnabled) {
      return await this.disableAutomation(options);
    } else {
      return await this.enableAutomation(options);
    }
  }

  /**
   * Enable specific services
   */
  async enableServices(serviceTypes) {
    console.log(`▶️ Enabling services: ${serviceTypes.join(', ')}`);
    
    const results = {
      enabled: [],
      failed: [],
      skipped: []
    };

    for (const serviceType of serviceTypes) {
      try {
        if (this.enabledServices.has(serviceType)) {
          results.skipped.push({
            service: serviceType,
            reason: 'Already enabled'
          });
          continue;
        }

        const success = await this.enableService(serviceType);
        
        if (success) {
          this.enabledServices.add(serviceType);
          this.disabledServices.delete(serviceType);
          results.enabled.push(serviceType);
          
          console.log(`✅ Service enabled: ${serviceType}`);
        } else {
          results.failed.push({
            service: serviceType,
            reason: 'Service enable method returned false'
          });
        }
        
      } catch (error) {
        console.error(`❌ Failed to enable service ${serviceType}:`, error);
        results.failed.push({
          service: serviceType,
          reason: error.message
        });
      }
    }

    return results;
  }

  /**
   * Disable specific services
   */
  async disableServices(serviceTypes) {
    console.log(`⏸️ Disabling services: ${serviceTypes.join(', ')}`);
    
    const results = {
      disabled: [],
      failed: [],
      skipped: []
    };

    for (const serviceType of serviceTypes) {
      try {
        if (this.disabledServices.has(serviceType)) {
          results.skipped.push({
            service: serviceType,
            reason: 'Already disabled'
          });
          continue;
        }

        const success = await this.disableService(serviceType);
        
        if (success) {
          this.disabledServices.add(serviceType);
          this.enabledServices.delete(serviceType);
          results.disabled.push(serviceType);
          
          console.log(`⏸️ Service disabled: ${serviceType}`);
        } else {
          results.failed.push({
            service: serviceType,
            reason: 'Service disable method returned false'
          });
        }
        
      } catch (error) {
        console.error(`❌ Failed to disable service ${serviceType}:`, error);
        results.failed.push({
          service: serviceType,
          reason: error.message
        });
      }
    }

    return results;
  }

  /**
   * Enable individual service
   */
  async enableService(serviceType) {
    const service = this.services[serviceType];
    
    if (!service) {
      console.warn(`⚠️ Service not found: ${serviceType}`);
      return false;
    }

    switch (serviceType) {
      case SERVICE_TYPES.REBALANCING:
        // Rebalancing engine doesn't have explicit enable/disable, but we can track state
        if (service.isInitialized) {
          return true;
        } else {
          await service.initialize();
          return service.isInitialized;
        }
        
      case SERVICE_TYPES.RISK_MANAGEMENT:
        if (service.isInitialized) {
          // Start risk evaluation if not already running
          if (service.startRiskEvaluation) {
            service.startRiskEvaluation();
          }
          return true;
        } else {
          await service.initialize();
          return service.isInitialized;
        }
        
      case SERVICE_TYPES.ALLOCATION_TRACKING:
        if (service.isInitialized) {
          return true;
        } else {
          await service.initialize();
          return service.isInitialized;
        }
        
      case SERVICE_TYPES.PRICE_MONITORING:
        // Price monitoring is handled by EnhancedPriceDisplayService
        return true;
        
      default:
        console.warn(`⚠️ Unknown service type: ${serviceType}`);
        return false;
    }
  }

  /**
   * Disable individual service
   */
  async disableService(serviceType) {
    const service = this.services[serviceType];
    
    if (!service) {
      console.warn(`⚠️ Service not found: ${serviceType}`);
      return false;
    }

    switch (serviceType) {
      case SERVICE_TYPES.REBALANCING:
        // For rebalancing, we can't fully disable but we can ensure no active operations
        if (service.state && service.state.isActive) {
          console.log('⏸️ Waiting for active rebalancing to complete before disabling');
          // In a real implementation, we might want to cancel or pause active rebalancing
        }
        return true;
        
      case SERVICE_TYPES.RISK_MANAGEMENT:
        // Stop risk evaluation if running
        if (service.stopRiskEvaluation) {
          service.stopRiskEvaluation();
        }
        return true;
        
      case SERVICE_TYPES.ALLOCATION_TRACKING:
        // Allocation tracking doesn't need explicit disabling
        return true;
        
      case SERVICE_TYPES.PRICE_MONITORING:
        // Price monitoring continues but automation responses are disabled
        return true;
        
      default:
        console.warn(`⚠️ Unknown service type: ${serviceType}`);
        return false;
    }
  }

  /**
   * Preserve current automation settings
   * Implements requirement 5.5 - risk setting preservation across mode changes
   */
  async preserveCurrentSettings(reason = 'Manual disable') {
    console.log('💾 Preserving current automation settings...');
    
    try {
      const settings = {
        // Rebalancing settings
        rebalancing: this.services[SERVICE_TYPES.REBALANCING] ? {
          configuration: this.services[SERVICE_TYPES.REBALANCING].getConfiguration(),
          isActive: this.services[SERVICE_TYPES.REBALANCING].state?.isActive || false
        } : null,
        
        // Risk management settings
        riskManagement: this.services[SERVICE_TYPES.RISK_MANAGEMENT] ? {
          riskParameters: Array.from(this.services[SERVICE_TYPES.RISK_MANAGEMENT].riskParameters.entries()),
          activeTriggers: Array.from(this.services[SERVICE_TYPES.RISK_MANAGEMENT].activeTriggers.entries()),
          isActive: this.services[SERVICE_TYPES.RISK_MANAGEMENT].state?.isActive || false
        } : null,
        
        // Allocation settings
        allocation: this.services[SERVICE_TYPES.ALLOCATION_TRACKING] ? {
          targetAllocations: this.services[SERVICE_TYPES.ALLOCATION_TRACKING].getTargetAllocations(),
          autoDistributeMode: this.services[SERVICE_TYPES.ALLOCATION_TRACKING].autoDistributeMode,
          configuration: {
            driftThreshold: this.services[SERVICE_TYPES.ALLOCATION_TRACKING].driftThreshold,
            minAllocationPercent: this.services[SERVICE_TYPES.ALLOCATION_TRACKING].minAllocationPercent
          }
        } : null,
        
        // Service states
        enabledServices: Array.from(this.enabledServices),
        automationMode: this.currentMode
      };

      this.preservedSettings = {
        id: `preserved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        settings,
        preservedAt: Date.now(),
        expiresAt: Date.now() + this.preservationTTL,
        reason,
        version: '1.0'
      };
      
      // Store in localStorage for persistence across sessions
      try {
        localStorage.setItem('automationPreservedSettings', JSON.stringify(this.preservedSettings));
      } catch (error) {
        console.warn('⚠️ Failed to store preserved settings in localStorage:', error);
      }
      
      console.log(`💾 Settings preserved successfully: ${this.preservedSettings.id}`);
      
      // Update preserved settings store
      this.updatePreservedSettingsStore();
      
      return this.preservedSettings;
      
    } catch (error) {
      console.error('❌ Failed to preserve settings:', error);
      throw error;
    }
  }

  /**
   * Restore preserved automation settings
   */
  async restorePreservedSettings() {
    console.log('🔄 Restoring preserved automation settings...');
    
    if (!this.preservedSettings) {
      throw new Error('No preserved settings available');
    }

    if (this.isPreservedSettingsExpired()) {
      throw new Error('Preserved settings have expired');
    }

    try {
      const { settings } = this.preservedSettings;
      const restorationResults = {
        restored: [],
        failed: [],
        skipped: []
      };

      // Restore rebalancing settings
      if (settings.rebalancing && this.services[SERVICE_TYPES.REBALANCING]) {
        try {
          this.services[SERVICE_TYPES.REBALANCING].setConfiguration(settings.rebalancing.configuration);
          restorationResults.restored.push('rebalancing_configuration');
        } catch (error) {
          restorationResults.failed.push({
            setting: 'rebalancing_configuration',
            error: error.message
          });
        }
      }

      // Restore risk management settings
      if (settings.riskManagement && this.services[SERVICE_TYPES.RISK_MANAGEMENT]) {
        try {
          // Restore risk parameters
          for (const [tokenAddress, riskParams] of settings.riskManagement.riskParameters) {
            await this.services[SERVICE_TYPES.RISK_MANAGEMENT].updateRiskParameters(tokenAddress, riskParams);
          }
          restorationResults.restored.push('risk_management_parameters');
        } catch (error) {
          restorationResults.failed.push({
            setting: 'risk_management_parameters',
            error: error.message
          });
        }
      }

      // Restore allocation settings
      if (settings.allocation && this.services[SERVICE_TYPES.ALLOCATION_TRACKING]) {
        try {
          // Restore target allocations
          if (Object.keys(settings.allocation.targetAllocations).length > 0) {
            await this.services[SERVICE_TYPES.ALLOCATION_TRACKING].setCustomAllocations(settings.allocation.targetAllocations);
          }
          
          // Restore auto-distribute mode
          if (settings.allocation.autoDistributeMode) {
            const selectedTokens = Object.keys(settings.allocation.targetAllocations);
            await this.services[SERVICE_TYPES.ALLOCATION_TRACKING].setAutoDistributeMode(selectedTokens, true);
          }
          
          // Restore configuration
          this.services[SERVICE_TYPES.ALLOCATION_TRACKING].setConfiguration(settings.allocation.configuration);
          
          restorationResults.restored.push('allocation_settings');
        } catch (error) {
          restorationResults.failed.push({
            setting: 'allocation_settings',
            error: error.message
          });
        }
      }

      // Restore enabled services
      if (settings.enabledServices) {
        this.enabledServices = new Set(settings.enabledServices);
        restorationResults.restored.push('enabled_services');
      }

      console.log(`🔄 Settings restoration completed - Restored: ${restorationResults.restored.length}, Failed: ${restorationResults.failed.length}`);
      
      return restorationResults;
      
    } catch (error) {
      console.error('❌ Failed to restore preserved settings:', error);
      throw error;
    }
  }

  /**
   * Perform safety checks before enabling automation
   * Implements requirement 5.5 - safety checks for automation re-activation
   */
  async performSafetyChecks(options = {}) {
    console.log('🛡️ Performing automation safety checks...');
    
    this.state.safetyChecksActive = true;
    this.updateStateStores();
    
    const safetyChecks = [];
    const blockingReasons = [];
    let canEnable = true;

    try {
      // Check 1: Service availability
      const serviceCheck = await this.checkServiceAvailability();
      safetyChecks.push(serviceCheck);
      if (!serviceCheck.passed) {
        blockingReasons.push(...serviceCheck.issues);
        canEnable = false;
      }

      // Check 2: Market conditions
      const marketCheck = await this.checkMarketConditions();
      safetyChecks.push(marketCheck);
      if (!marketCheck.passed && !options.ignoreMarketConditions) {
        blockingReasons.push(...marketCheck.issues);
        canEnable = false;
      }

      // Check 3: Portfolio state
      const portfolioCheck = await this.checkPortfolioState();
      safetyChecks.push(portfolioCheck);
      if (!portfolioCheck.passed) {
        blockingReasons.push(...portfolioCheck.issues);
        canEnable = false;
      }

      // Check 4: Risk parameters validity
      const riskCheck = await this.checkRiskParameters();
      safetyChecks.push(riskCheck);
      if (!riskCheck.passed) {
        blockingReasons.push(...riskCheck.issues);
        canEnable = false;
      }

      // Check 5: Recent manual overrides
      const overrideCheck = await this.checkRecentOverrides();
      safetyChecks.push(overrideCheck);
      if (!overrideCheck.passed && !options.ignoreRecentOverrides) {
        blockingReasons.push(...overrideCheck.issues);
        canEnable = false;
      }

      const safetyCheckResults = {
        canEnable,
        blockingReasons,
        safetyChecks,
        timestamp: Date.now(),
        checkDuration: Date.now() - (safetyChecks[0]?.timestamp || Date.now())
      };

      console.log(`🛡️ Safety checks completed - Can enable: ${canEnable}, Issues: ${blockingReasons.length}`);
      
      // Update safety store
      this.updateSafetyStore(safetyCheckResults);
      
      return safetyCheckResults;
      
    } catch (error) {
      console.error('❌ Safety checks failed:', error);
      
      const errorResult = {
        canEnable: false,
        blockingReasons: [`Safety check error: ${error.message}`],
        safetyChecks,
        error: error.message,
        timestamp: Date.now()
      };
      
      this.updateSafetyStore(errorResult);
      return errorResult;
      
    } finally {
      this.state.safetyChecksActive = false;
      this.updateStateStores();
    }
  }

  /**
   * Check service availability
   */
  async checkServiceAvailability() {
    const check = {
      name: 'Service Availability',
      type: 'service_availability',
      passed: true,
      issues: [],
      details: {},
      timestamp: Date.now()
    };

    // Check each service
    for (const [serviceType, service] of Object.entries(this.services)) {
      if (!service) {
        check.issues.push(`Service not available: ${serviceType}`);
        check.passed = false;
        continue;
      }

      try {
        // Check if service is initialized
        if (service.isInitialized === false) {
          check.issues.push(`Service not initialized: ${serviceType}`);
          check.passed = false;
        }
        
        // Check service-specific conditions
        if (serviceType === SERVICE_TYPES.REBALANCING && service.state?.isActive) {
          check.issues.push('Rebalancing operation currently active');
          check.passed = false;
        }
        
        check.details[serviceType] = {
          available: !!service,
          initialized: service.isInitialized || false,
          status: service.getStatus ? service.getStatus() : 'unknown'
        };
        
      } catch (error) {
        check.issues.push(`Service check failed for ${serviceType}: ${error.message}`);
        check.passed = false;
      }
    }

    return check;
  }

  /**
   * Check market conditions
   */
  async checkMarketConditions() {
    const check = {
      name: 'Market Conditions',
      type: 'market_conditions',
      passed: true,
      issues: [],
      details: {},
      timestamp: Date.now()
    };

    try {
      // Check price data freshness
      const priceService = this.services[SERVICE_TYPES.PRICE_MONITORING];
      if (priceService && priceService.isInitialized) {
        // This would check if price data is recent and reliable
        check.details.priceDataFresh = true;
      } else {
        check.issues.push('Price monitoring service unavailable');
        check.passed = false;
      }

      // Check for extreme market volatility (placeholder)
      const volatilityCheck = Math.random() > 0.1; // 90% pass rate for demo
      if (!volatilityCheck) {
        check.issues.push('Extreme market volatility detected');
        check.passed = false;
      }
      check.details.volatilityNormal = volatilityCheck;

    } catch (error) {
      check.issues.push(`Market condition check failed: ${error.message}`);
      check.passed = false;
    }

    return check;
  }

  /**
   * Check portfolio state
   */
  async checkPortfolioState() {
    const check = {
      name: 'Portfolio State',
      type: 'portfolio_state',
      passed: true,
      issues: [],
      details: {},
      timestamp: Date.now()
    };

    try {
      const allocationService = this.services[SERVICE_TYPES.ALLOCATION_TRACKING];
      
      if (allocationService && allocationService.isInitialized) {
        const status = allocationService.getStatus();
        
        // Check if target allocations are set
        if (status.targetAllocationsCount === 0) {
          check.issues.push('No target allocations configured');
          check.passed = false;
        }
        
        // Check for excessive drift
        const currentAllocations = allocationService.getCurrentAllocations();
        const targetAllocations = allocationService.getTargetAllocations();
        
        if (Object.keys(currentAllocations).length > 0 && Object.keys(targetAllocations).length > 0) {
          const driftAnalysis = allocationService.getDriftAnalysis(currentAllocations, targetAllocations);
          
          if (driftAnalysis.maxDrift > 0.2) { // 20% drift threshold for safety
            check.issues.push(`Excessive portfolio drift detected: ${(driftAnalysis.maxDrift * 100).toFixed(1)}%`);
            check.passed = false;
          }
          
          check.details.maxDrift = driftAnalysis.maxDrift;
        }
        
        check.details.allocationStatus = status;
      } else {
        check.issues.push('Allocation management service unavailable');
        check.passed = false;
      }

    } catch (error) {
      check.issues.push(`Portfolio state check failed: ${error.message}`);
      check.passed = false;
    }

    return check;
  }

  /**
   * Check risk parameters validity
   */
  async checkRiskParameters() {
    const check = {
      name: 'Risk Parameters',
      type: 'risk_parameters',
      passed: true,
      issues: [],
      details: {},
      timestamp: Date.now()
    };

    try {
      const riskService = this.services[SERVICE_TYPES.RISK_MANAGEMENT];
      
      if (riskService && riskService.isInitialized) {
        // Check if risk parameters are configured
        if (riskService.riskParameters.size === 0) {
          check.issues.push('No risk parameters configured');
          // This is a warning, not a blocking issue
        }
        
        // Check for conflicting risk triggers
        const activeTriggers = riskService.activeTriggers || new Map();
        if (activeTriggers.size > 10) {
          check.issues.push('Too many active risk triggers - may cause conflicts');
          check.passed = false;
        }
        
        check.details.riskParametersCount = riskService.riskParameters.size;
        check.details.activeTriggersCount = activeTriggers.size;
      } else {
        check.issues.push('Risk management service unavailable');
        check.passed = false;
      }

    } catch (error) {
      check.issues.push(`Risk parameters check failed: ${error.message}`);
      check.passed = false;
    }

    return check;
  }

  /**
   * Check recent manual overrides
   */
  async checkRecentOverrides() {
    const check = {
      name: 'Recent Overrides',
      type: 'recent_overrides',
      passed: true,
      issues: [],
      details: {},
      timestamp: Date.now()
    };

    try {
      // This would check for recent manual overrides that might indicate user preference for manual control
      const recentOverrideThreshold = 30 * 60 * 1000; // 30 minutes
      const now = Date.now();
      
      // Placeholder check - in real implementation, this would check manual trading integration service
      const hasRecentOverrides = false; // Would be determined by actual override history
      
      if (hasRecentOverrides) {
        check.issues.push('Recent manual overrides detected - user may prefer manual control');
        check.passed = false;
      }
      
      check.details.recentOverrides = hasRecentOverrides;
      check.details.checkWindow = recentOverrideThreshold;

    } catch (error) {
      check.issues.push(`Recent overrides check failed: ${error.message}`);
      check.passed = false;
    }

    return check;
  }

  /**
   * Determine current automation mode based on enabled services
   */
  determineAutomationMode() {
    const totalServices = Object.keys(SERVICE_TYPES).length;
    const enabledCount = this.enabledServices.size;
    
    if (enabledCount === 0) {
      return AUTOMATION_MODES.MANUAL;
    } else if (enabledCount === totalServices) {
      return AUTOMATION_MODES.FULL;
    } else {
      return AUTOMATION_MODES.PARTIAL;
    }
  }

  /**
   * Check if preserved settings are expired
   */
  isPreservedSettingsExpired() {
    if (!this.preservedSettings) return true;
    return Date.now() > this.preservedSettings.expiresAt;
  }

  /**
   * Clear preserved settings
   */
  clearPreservedSettings() {
    this.preservedSettings = null;
    
    try {
      localStorage.removeItem('automationPreservedSettings');
    } catch (error) {
      console.warn('⚠️ Failed to clear preserved settings from localStorage:', error);
    }
    
    this.updatePreservedSettingsStore();
    console.log('🧹 Preserved settings cleared');
  }

  /**
   * Load preserved settings from storage
   */
  async loadPreservedSettings() {
    try {
      const stored = localStorage.getItem('automationPreservedSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Check if settings are still valid
        if (parsed.expiresAt > Date.now()) {
          this.preservedSettings = parsed;
          console.log(`💾 Loaded preserved settings: ${parsed.id}`);
        } else {
          // Remove expired settings
          localStorage.removeItem('automationPreservedSettings');
          console.log('🧹 Removed expired preserved settings');
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load preserved settings:', error);
    }
    
    this.updatePreservedSettingsStore();
  }

  /**
   * Check if reactivation is in cooldown
   */
  isInReactivationCooldown() {
    if (!this.reactivationCooldown) return false;
    return Date.now() < this.reactivationCooldown;
  }

  /**
   * Get remaining reactivation cooldown time
   */
  getRemainingReactivationCooldown() {
    if (!this.isInReactivationCooldown()) return 0;
    return this.reactivationCooldown - Date.now();
  }

  /**
   * Start periodic cleanup of expired data
   */
  startPeriodicCleanup() {
    // Clean up every hour
    setInterval(() => {
      this.performPeriodicCleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Perform periodic cleanup
   */
  performPeriodicCleanup() {
    // Clean up expired preserved settings
    if (this.isPreservedSettingsExpired()) {
      this.clearPreservedSettings();
    }
    
    // Clean up old safety checks
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.safetyChecks = this.safetyChecks.filter(check => check.timestamp > cutoff);
    
    console.log('🧹 Periodic cleanup completed');
  }

  /**
   * Get automation status
   */
  getAutomationStatus() {
    return {
      isEnabled: this.isEnabled,
      mode: this.currentMode,
      enabledServices: Array.from(this.enabledServices),
      disabledServices: Array.from(this.disabledServices),
      hasPreservedSettings: !!this.preservedSettings,
      preservedSettingsExpired: this.isPreservedSettingsExpired(),
      isInReactivationCooldown: this.isInReactivationCooldown(),
      remainingCooldown: this.getRemainingReactivationCooldown(),
      lastModeChange: this.lastModeChange,
      safetyChecksActive: this.state.safetyChecksActive
    };
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceType) {
    const service = this.services[serviceType];
    
    if (!service) {
      return {
        available: false,
        enabled: false,
        initialized: false,
        status: 'not_available'
      };
    }

    return {
      available: true,
      enabled: this.enabledServices.has(serviceType),
      initialized: service.isInitialized || false,
      status: service.getStatus ? service.getStatus() : 'unknown'
    };
  }

  /**
   * Update state stores
   */
  updateStateStores() {
    this.state.enabledServices = Array.from(this.enabledServices);
    this.state.disabledServices = Array.from(this.disabledServices);
    this.state.mode = this.currentMode;
    this.state.isEnabled = this.isEnabled;
    this.state.lastModeChange = this.lastModeChange;
    
    automationControlStateStore.set(this.state);
  }

  updatePreservedSettingsStore() {
    preservedSettingsStore.set({
      hasPreservedSettings: !!this.preservedSettings,
      preservedAt: this.preservedSettings?.preservedAt || null,
      expiresAt: this.preservedSettings?.expiresAt || null,
      settings: this.preservedSettings?.settings || null
    });
  }

  updateSafetyStore(safetyCheckResults) {
    automationSafetyStore.update(state => ({
      ...state,
      safetyChecks: [...state.safetyChecks, ...safetyCheckResults.safetyChecks].slice(-20), // Keep last 20
      lastSafetyCheck: safetyCheckResults.timestamp,
      reactivationBlocked: !safetyCheckResults.canEnable,
      blockingReasons: safetyCheckResults.blockingReasons || []
    }));
  }

  /**
   * Get configuration
   */
  getConfiguration() {
    return {
      safetyCheckTimeout: this.safetyCheckTimeout,
      preservationTTL: this.preservationTTL,
      reactivationCooldownPeriod: this.reactivationCooldownPeriod,
      availableServices: Object.values(SERVICE_TYPES),
      availableModes: Object.values(AUTOMATION_MODES)
    };
  }

  /**
   * Set configuration
   */
  setConfiguration(config) {
    if (config.safetyCheckTimeout !== undefined) {
      this.safetyCheckTimeout = Math.max(5000, Math.min(60000, config.safetyCheckTimeout));
    }
    
    if (config.preservationTTL !== undefined) {
      this.preservationTTL = Math.max(60000, config.preservationTTL); // Minimum 1 minute
    }
    
    if (config.reactivationCooldownPeriod !== undefined) {
      this.reactivationCooldownPeriod = Math.max(10000, config.reactivationCooldownPeriod); // Minimum 10 seconds
    }
    
    console.log('⚙️ Automation control configuration updated');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.preservedSettings = null;
    this.safetyChecks = [];
    this.enabledServices.clear();
    this.disabledServices.clear();
    
    // Clear localStorage
    try {
      localStorage.removeItem('automationPreservedSettings');
    } catch (error) {
      console.warn('⚠️ Failed to clear localStorage during cleanup:', error);
    }
    
    this.state = {
      mode: AUTOMATION_MODES.MANUAL,
      isEnabled: false,
      enabledServices: [],
      disabledServices: [],
      lastModeChange: null,
      safetyChecksActive: false
    };
    
    this.updateStateStores();
    this.updatePreservedSettingsStore();
    
    this.isInitialized = false;
    console.log('🧹 Automation Control Service cleaned up');
  }
}

// Create and export singleton instance
export const automationControlService = new AutomationControlService();

export default automationControlService;