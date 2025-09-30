/**
 * Universal Global Storage Service
 * 
 * Centralized storage for price data, charts, and user preferences
 * Used by all clients/visitors regardless of wallet connection or IPFS status
 * Provides instant data access with multi-tier caching strategy
 */

import { writable } from 'svelte/store';

// Core storage stores - accessible to all components
export const globalPricesStore = writable({});
export const globalPriceHistoryStore = writable({});
export const globalChartDataStore = writable({});
export const globalLastUpdatedStore = writable(null);
export const globalRefreshingStore = writable(false);
export const globalDataSourceStore = writable('cache'); // 'cache', 'backend', 'ipfs', 'mock'

class GlobalStorageService {
  constructor() {
    this.STORAGE_KEY = 'reactiveGlobalDataV2';
    this.CHART_STORAGE_KEY = 'reactiveChartDataV1';
    this.DATA_TTL_MS = 20 * 60 * 1000; // 20 minutes (slightly longer than backend refresh)
    this.MAX_HISTORY_POINTS = 1000;
    this.MAX_CHART_POINTS = 500;
    
    // In-memory storage
    this.prices = new Map();
    this.priceHistory = new Map();
    this.chartData = new Map();
    this.metadata = {
      lastUpdated: null,
      source: 'none',
      refreshCount: 0
    };
    
    this.isInitialized = false;
    this.subscribers = new Set();
  }

  /**
   * Initialize global storage - loads cached data immediately
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('🌐 Global Storage already initialized, skipping...');
      return;
    }
    
    console.log('🌐 Initializing Global Storage Service...');
    this.isInitialized = true; // Set early to prevent race conditions
    
    try {
      // Load price data from localStorage
      await this.loadFromLocalStorage();
      
      // Load chart data separately (can be large)
      await this.loadChartDataFromStorage();
      
      // Update reactive stores
      this.updateStores();
      
      this.isInitialized = true;
      console.log('✅ Global Storage Service initialized');
      
      // Auto-cleanup old data periodically
      this.scheduleCleanup();
      
    } catch (error) {
      console.warn('⚠️ Global storage initialization failed:', error.message);
      this.isInitialized = true; // Continue with empty state
    }
  }

  /**
   * Store price data with automatic persistence
   */
  async storePrices(priceData, options = {}) {
    const timestamp = Date.now();
    const source = options.source || 'unknown';
    
    console.log(`💾 Storing ${Object.keys(priceData).length} prices from ${source}...`);
    
    // Update in-memory prices
    for (const [address, priceInfo] of Object.entries(priceData)) {
      if (priceInfo && typeof priceInfo === 'object' && priceInfo.price !== undefined) {
        const enrichedPrice = {
          ...priceInfo,
          timestamp: priceInfo.timestamp || timestamp,
          source: source
        };
        
        this.prices.set(address, enrichedPrice);
        
        // Add to price history
        this.addToPriceHistory(address, enrichedPrice);
        
        // Update chart data if needed
        if (options.updateCharts !== false) {
          this.updateChartData(address, enrichedPrice);
        }
      }
    }
    
    // Update metadata
    this.metadata.lastUpdated = timestamp;
    this.metadata.source = source;
    this.metadata.refreshCount++;
    
    // Persist to localStorage
    await this.saveToLocalStorage();
    
    // Update reactive stores
    this.updateStores();
    
    // Notify subscribers
    this.notifySubscribers({ type: 'prices', data: priceData, source });
    
    console.log(`✅ Stored prices successfully (source: ${source})`);
    globalDataSourceStore.set(source);
    globalLastUpdatedStore.set(new Date(timestamp).toISOString());
  }

  /**
   * Get all current prices
   */
  getAllPrices() {
    return Object.fromEntries(this.prices);
  }

  /**
   * Get price for specific token
   */
  getPrice(tokenAddress) {
    return this.prices.get(tokenAddress);
  }

  /**
   * Get price history for token
   */
  getPriceHistory(tokenAddress, maxPoints = null) {
    const history = this.priceHistory.get(tokenAddress) || [];
    if (maxPoints && history.length > maxPoints) {
      return history.slice(-maxPoints);
    }
    return history;
  }

  /**
   * Get chart data for token
   */
  getChartData(tokenAddress) {
    return this.chartData.get(tokenAddress) || [];
  }

  /**
   * Add price point to history
   */
  addToPriceHistory(tokenAddress, priceInfo) {
    if (!this.priceHistory.has(tokenAddress)) {
      this.priceHistory.set(tokenAddress, []);
    }
    
    const history = this.priceHistory.get(tokenAddress);
    const historyPoint = {
      price: priceInfo.price,
      timestamp: priceInfo.timestamp,
      change: priceInfo.change || 0,
      volume: priceInfo.volume || 0
    };
    
    // Avoid duplicate timestamps
    const lastPoint = history[history.length - 1];
    if (!lastPoint || lastPoint.timestamp !== historyPoint.timestamp) {
      history.push(historyPoint);
      
      // Trim to max points
      if (history.length > this.MAX_HISTORY_POINTS) {
        history.splice(0, history.length - this.MAX_HISTORY_POINTS);
      }
    }
  }

  /**
   * Update chart data optimized for visualization
   */
  updateChartData(tokenAddress, priceInfo) {
    if (!this.chartData.has(tokenAddress)) {
      this.chartData.set(tokenAddress, []);
    }
    
    const chartPoints = this.chartData.get(tokenAddress);
    const chartPoint = {
      x: priceInfo.timestamp,
      y: priceInfo.price,
      change: priceInfo.change || 0
    };
    
    // Add point
    chartPoints.push(chartPoint);
    
    // Trim for performance
    if (chartPoints.length > this.MAX_CHART_POINTS) {
      chartPoints.splice(0, chartPoints.length - this.MAX_CHART_POINTS);
    }
  }

  /**
   * Set refreshing state
   */
  setRefreshing(isRefreshing, source = null) {
    globalRefreshingStore.set(isRefreshing);
    if (source) {
      console.log(`🔄 ${isRefreshing ? 'Started' : 'Finished'} refresh from ${source}`);
    }
  }

  /**
   * Load data from localStorage
   */
  async loadFromLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      
      const data = JSON.parse(raw);
      if (!data || !data.metadata) return;
      
      // Check TTL
      const age = Date.now() - (data.metadata.lastUpdated || 0);
      if (age > this.DATA_TTL_MS) {
        console.log('📋 Cached data expired, clearing...');
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }
      
      // Restore prices
      if (data.prices) {
        this.prices.clear();
        for (const [address, price] of Object.entries(data.prices)) {
          this.prices.set(address, price);
        }
      }
      
      // Restore history
      if (data.priceHistory) {
        this.priceHistory.clear();
        for (const [address, history] of Object.entries(data.priceHistory)) {
          this.priceHistory.set(address, history);
        }
      }
      
      // Restore metadata
      this.metadata = { ...this.metadata, ...data.metadata };
      
      console.log(`💾 Loaded ${this.prices.size} cached prices (age: ${Math.round(age/1000)}s)`);
      globalDataSourceStore.set('cache');
      
    } catch (error) {
      console.warn('Failed to load from localStorage:', error.message);
    }
  }

  /**
   * Save data to localStorage
   */
  async saveToLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const data = {
        prices: Object.fromEntries(this.prices),
        priceHistory: Object.fromEntries(this.priceHistory),
        metadata: this.metadata
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      
    } catch (error) {
      console.warn('Failed to save to localStorage:', error.message);
      // Handle quota exceeded by clearing old data
      if (error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem(this.STORAGE_KEY);
          localStorage.removeItem(this.CHART_STORAGE_KEY);
          console.log('📋 Cleared localStorage due to quota exceeded');
        } catch {
          // Quota exceeded error - ignore silently
        }
      }
    }
  }

  /**
   * Load chart data from separate storage (can be large)
   */
  async loadChartDataFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const raw = localStorage.getItem(this.CHART_STORAGE_KEY);
      if (!raw) return;
      
      const data = JSON.parse(raw);
      if (data && data.chartData) {
        this.chartData.clear();
        for (const [address, points] of Object.entries(data.chartData)) {
          this.chartData.set(address, points);
        }
        console.log(`📊 Loaded chart data for ${this.chartData.size} tokens`);
      }
      
    } catch (error) {
      console.warn('Failed to load chart data:', error.message);
    }
  }

  /**
   * Save chart data separately
   */
  async saveChartDataToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const data = {
        chartData: Object.fromEntries(this.chartData),
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.CHART_STORAGE_KEY, JSON.stringify(data));
      
    } catch (error) {
      console.warn('Failed to save chart data:', error.message);
    }
  }

  /**
   * Update reactive stores
   */
  updateStores() {
    globalPricesStore.set(Object.fromEntries(this.prices));
    globalPriceHistoryStore.set(Object.fromEntries(this.priceHistory));
    globalChartDataStore.set(Object.fromEntries(this.chartData));
    
    if (this.metadata.lastUpdated) {
      globalLastUpdatedStore.set(new Date(this.metadata.lastUpdated).toISOString());
    }
  }

  /**
   * Subscribe to storage updates
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(event) {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.warn('Subscriber callback error:', error);
      }
    });
  }

  /**
   * Schedule periodic cleanup
   */
  scheduleCleanup() {
    setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Clean up old data points
   */
  cleanupOldData() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    let cleaned = 0;
    
    // Clean price history
    for (const [address, history] of this.priceHistory) {
      const before = history.length;
      const filtered = history.filter(point => point.timestamp > cutoff);
      if (filtered.length !== before) {
        this.priceHistory.set(address, filtered);
        cleaned += (before - filtered.length);
      }
    }
    
    // Clean chart data
    for (const [address, points] of this.chartData) {
      const before = points.length;
      const filtered = points.filter(point => point.x > cutoff);
      if (filtered.length !== before) {
        this.chartData.set(address, filtered);
        cleaned += (before - filtered.length);
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old data points`);
      this.saveToLocalStorage();
      this.saveChartDataToStorage();
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.prices.clear();
    this.priceHistory.clear();
    this.chartData.clear();
    this.metadata = { lastUpdated: null, source: 'none', refreshCount: 0 };
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.CHART_STORAGE_KEY);
    }
    
    this.updateStores();
    console.log('🧹 Global storage cleared');
  }

  /**
   * Get storage stats
   */
  getStats() {
    return {
      priceCount: this.prices.size,
      totalHistoryPoints: Array.from(this.priceHistory.values()).reduce((sum, h) => sum + h.length, 0),
      totalChartPoints: Array.from(this.chartData.values()).reduce((sum, c) => sum + c.length, 0),
      lastUpdated: this.metadata.lastUpdated,
      source: this.metadata.source,
      refreshCount: this.metadata.refreshCount
    };
  }
}

// Create and export singleton instance
export const globalStorage = new GlobalStorageService();

// Auto-initialize when module is imported
if (typeof window !== 'undefined') {
  globalStorage.initialize().catch(console.error);
}

export default globalStorage;