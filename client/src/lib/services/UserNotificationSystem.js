/**
 * User Notification System
 * 
 * Creates status indicators for price data freshness, notifications for rebalancing deferrals,
 * and alerts for risk trigger activations as specified in requirements 1.4, 2.3, 3.3
 */

import { writable } from 'svelte/store';

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Notification categories
export const NOTIFICATION_CATEGORIES = {
  PRICE_DATA: 'price_data',
  REBALANCING: 'rebalancing',
  RISK_MANAGEMENT: 'risk_management',
  SYSTEM: 'system',
  USER_ACTION: 'user_action'
};

// Status indicator types
export const STATUS_INDICATORS = {
  PRICE_FRESHNESS: 'price_freshness',
  SERVICE_HEALTH: 'service_health',
  SYSTEM_STATUS: 'system_status',
  AUTOMATION_STATUS: 'automation_status'
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
  URGENT: 5
};

// Default notification settings
const DEFAULT_SETTINGS = {
  enableNotifications: true,
  enableSounds: false,
  enableDesktopNotifications: false,
  autoHideDelay: 5000,
  maxNotifications: 10
};

// Reactive stores for notification system
export const notificationsStore = writable([]);
export const statusIndicatorsStore = writable({});
export const notificationSettingsStore = writable(DEFAULT_SETTINGS);

class UserNotificationSystem {
  constructor() {
    this.isInitialized = false;
    this.notifications = [];
    this.statusIndicators = new Map();
    this.settings = { ...DEFAULT_SETTINGS };
    this.notificationId = 0;
    this.autoHideTimers = new Map();
    this.statusUpdateTimers = new Map();
    
    this.stats = {
      total: 0,
      unread: 0,
      byType: {},
      byCategory: {}
    };
  }

  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('🔔 User notification system already initialized');
      return;
    }

    console.log('🚀 Initializing User Notification System...');
    
    this.settings = { ...this.settings, ...options };
    this.initializeStatusIndicators();
    this.startStatusMonitoring();
    
    this.isInitialized = true;
    console.log('✅ User Notification System initialized');
    
    this.updateStores();
  }

  initializeStatusIndicators() {
    this.statusIndicators.set(STATUS_INDICATORS.PRICE_FRESHNESS, {
      id: STATUS_INDICATORS.PRICE_FRESHNESS,
      label: 'Price Data',
      status: 'unknown',
      value: null,
      icon: '💰',
      color: 'gray',
      details: { totalTokens: 0, freshPrices: 0, stalePrices: 0 }
    });
    
    this.statusIndicators.set(STATUS_INDICATORS.SERVICE_HEALTH, {
      id: STATUS_INDICATORS.SERVICE_HEALTH,
      label: 'Services',
      status: 'unknown',
      value: null,
      icon: '🏥',
      color: 'gray'
    });
  }

  showNotification(options) {
    if (!this.settings.enableNotifications) return null;
    
    const notification = {
      id: ++this.notificationId,
      type: options.type || NOTIFICATION_TYPES.INFO,
      category: options.category || NOTIFICATION_CATEGORIES.SYSTEM,
      title: options.title,
      message: options.message,
      priority: options.priority || NOTIFICATION_PRIORITIES.MEDIUM,
      autoHide: options.autoHide !== false,
      actions: options.actions || [],
      data: options.data || null,
      timestamp: Date.now(),
      read: false,
      dismissed: false
    };
    
    this.notifications.unshift(notification);
    
    if (this.notifications.length > this.settings.maxNotifications) {
      const removed = this.notifications.splice(this.settings.maxNotifications);
      removed.forEach(n => this.clearAutoHideTimer(n.id));
    }
    
    this.stats.total++;
    this.stats.unread++;
    
    if (notification.autoHide && this.settings.autoHideDelay > 0) {
      this.setAutoHideTimer(notification.id, this.settings.autoHideDelay);
    }
    
    this.updateStores();
    console.log(`🔔 Notification: ${notification.title}`);
    
    return notification;
  }

  showPriceDataStaleNotification(staleTokens, totalTokens) {
    const staleCount = staleTokens.length;
    const stalePercentage = Math.round((staleCount / totalTokens) * 100);
    
    return this.showNotification({
      type: stalePercentage >= 50 ? NOTIFICATION_TYPES.ERROR : NOTIFICATION_TYPES.WARNING,
      category: NOTIFICATION_CATEGORIES.PRICE_DATA,
      title: 'Price Data Stale',
      message: `${staleCount} of ${totalTokens} token prices are stale (${stalePercentage}%)`,
      priority: stalePercentage >= 50 ? NOTIFICATION_PRIORITIES.HIGH : NOTIFICATION_PRIORITIES.MEDIUM,
      data: { staleTokens, totalTokens, stalePercentage }
    });
  }

  showRebalancingDeferralNotification(reason, gasPercent, gasCostUSD, threshold) {
    return this.showNotification({
      type: NOTIFICATION_TYPES.WARNING,
      category: NOTIFICATION_CATEGORIES.REBALANCING,
      title: 'Rebalancing Deferred',
      message: `Rebalancing postponed: ${reason}`,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      autoHide: false,
      actions: [
        { label: 'Force Execute', action: 'force_rebalancing' },
        { label: 'Adjust Settings', action: 'adjust_gas_settings' }
      ],
      data: { reason, gasPercent, gasCostUSD, threshold }
    });
  }

  showRiskTriggerAlert(trigger) {
    const isStopLoss = trigger.type === 'stop_loss' || trigger.type === 'trailing_stop';
    
    return this.showNotification({
      type: isStopLoss ? NOTIFICATION_TYPES.ERROR : NOTIFICATION_TYPES.WARNING,
      category: NOTIFICATION_CATEGORIES.RISK_MANAGEMENT,
      title: `${trigger.type} Triggered`,
      message: `Risk trigger activated for ${trigger.tokenAddress}`,
      priority: isStopLoss ? NOTIFICATION_PRIORITIES.CRITICAL : NOTIFICATION_PRIORITIES.HIGH,
      autoHide: false,
      actions: [
        { label: 'Execute Now', action: 'execute_risk_trigger' },
        { label: 'Modify Settings', action: 'modify_risk_settings' }
      ],
      data: { trigger }
    });
  }

  updateStatusIndicator(indicatorId, status, value, details = {}) {
    const indicator = this.statusIndicators.get(indicatorId);
    if (!indicator) return;
    
    indicator.status = status;
    indicator.value = value;
    indicator.lastUpdate = Date.now();
    indicator.details = { ...indicator.details, ...details };
    indicator.color = this.getStatusColor(status);
    
    this.updateStores();
  }

  getStatusColor(status) {
    const colors = {
      'excellent': 'green',
      'good': 'blue',
      'warning': 'yellow',
      'critical': 'red',
      'unknown': 'gray'
    };
    return colors[status] || 'gray';
  }

  startStatusMonitoring() {
    this.statusUpdateTimers.set('price_freshness', setInterval(() => {
      this.updatePriceDataStatus();
    }, 30000));
    
    this.statusUpdateTimers.set('service_health', setInterval(() => {
      this.updateServiceHealthStatus();
    }, 60000));
    
    console.log('📊 Status monitoring started');
  }

  stopStatusMonitoring() {
    for (const [name, timer] of this.statusUpdateTimers) {
      clearInterval(timer);
    }
    this.statusUpdateTimers.clear();
  }

  async updatePriceDataStatus() {
    try {
      const mockStatus = {
        totalTokens: 10,
        freshPrices: 8,
        stalePrices: 2
      };
      
      const healthScore = Math.round((mockStatus.freshPrices / mockStatus.totalTokens) * 100);
      let status = 'excellent';
      
      if (mockStatus.stalePrices >= 5) status = 'critical';
      else if (mockStatus.stalePrices >= 3) status = 'warning';
      else if (mockStatus.stalePrices >= 1) status = 'good';
      
      this.updateStatusIndicator(
        STATUS_INDICATORS.PRICE_FRESHNESS,
        status,
        `${healthScore}%`,
        mockStatus
      );
    } catch (error) {
      console.warn('⚠️ Failed to update price data status:', error);
    }
  }

  async updateServiceHealthStatus() {
    try {
      const mockHealth = {
        totalServices: 5,
        healthyServices: 4
      };
      
      const healthScore = Math.round((mockHealth.healthyServices / mockHealth.totalServices) * 100);
      
      this.updateStatusIndicator(
        STATUS_INDICATORS.SERVICE_HEALTH,
        healthScore >= 80 ? 'excellent' : 'warning',
        `${healthScore}%`,
        mockHealth
      );
    } catch (error) {
      console.warn('⚠️ Failed to update service health:', error);
    }
  }

  setAutoHideTimer(notificationId, delay) {
    const timer = setTimeout(() => {
      this.hideNotification(notificationId);
    }, delay);
    this.autoHideTimers.set(notificationId, timer);
  }

  clearAutoHideTimer(notificationId) {
    const timer = this.autoHideTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      this.autoHideTimers.delete(notificationId);
    }
  }

  hideNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.clearAutoHideTimer(notificationId);
      this.updateStores();
    }
  }

  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.stats.unread = Math.max(0, this.stats.unread - 1);
      this.updateStores();
    }
  }

  clearAll() {
    this.notifications = [];
    for (const timer of this.autoHideTimers.values()) {
      clearTimeout(timer);
    }
    this.autoHideTimers.clear();
    this.updateStores();
  }

  getNotifications(filter = {}) {
    let filtered = [...this.notifications];
    
    if (filter.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }
    if (filter.category) {
      filtered = filtered.filter(n => n.category === filter.category);
    }
    if (filter.unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }
    
    return filtered;
  }

  getStatusIndicators() {
    const result = {};
    for (const [id, indicator] of this.statusIndicators) {
      result[id] = indicator;
    }
    return result;
  }

  updateStores() {
    notificationsStore.set([...this.notifications]);
    
    const indicators = {};
    for (const [id, indicator] of this.statusIndicators) {
      indicators[id] = indicator;
    }
    statusIndicatorsStore.set(indicators);
  }

  getStats() {
    return {
      ...this.stats,
      activeNotifications: this.notifications.length
    };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    notificationSettingsStore.set(this.settings);
  }

  destroy() {
    this.stopStatusMonitoring();
    this.clearAll();
    this.statusIndicators.clear();
    this.isInitialized = false;
    console.log('🧹 User Notification System cleaned up');
  }
}

// Create and export singleton instance
export const userNotificationSystem = new UserNotificationSystem();

export default userNotificationSystem;
