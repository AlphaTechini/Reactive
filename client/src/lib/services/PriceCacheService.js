/**
 * Price Cache Service with LRU eviction and TTL management
 * 
 * Implements intelligent caching system as specified in requirements 1.4, 6.2, 6.4
 * - LRU cache with 30-second TTL for price data
 * - Staleness detection for prices older than 5 minutes
 * - Cache warming and background refresh
 */

import { writable } from 'svelte/store';

// Cache configuration constants
const DEFAULT_TTL = 30 * 1000; // 30 seconds as per requirements
const STALENESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes as per requirements
const MAX_CACHE_SIZE = 1000; // Maximum number of cached entries
const BACKGROUND_REFRESH_INTERVAL = 15 * 1000; // 15 seconds for background refresh
const CACHE_WARMING_BATCH_SIZE = 10; // Number of tokens to warm at once

// Reactive stores for cache status
export const cacheStatusStore = writable({
  size: 0,
  hitRate: 0,
  missRate: 0,
  stalePrices: 0
});

export const cacheMetricsStore = writable({
  hits: 0,
  misses: 0,
  evictions: 0,
  refreshes: 0
});

/**
 * LRU Cache Node for doubly-linked list implementation
 */
class CacheNode {
  constructor(key, value, ttl = DEFAULT_TTL) {
    this.key = key;
    this.value = value;
    this.timestamp = Date.now();
    this.ttl = ttl;
    this.accessCount = 1;
    this.prev = null;
    this.next = null;
  }

  /**
   * Check if this cache entry is expired
   */
  isExpired() {
    return (Date.now() - this.timestamp) > this.ttl;
  }

  /**
   * Check if this cache entry is stale (older than staleness threshold)
   */
  isStale() {
    return (Date.now() - this.timestamp) > STALENESS_THRESHOLD;
  }

  /**
   * Get age of this cache entry in milliseconds
   */
  getAge() {
    return Date.now() - this.timestamp;
  }

  /**
   * Update the value and reset timestamp
   */
  update(newValue, newTtl = null) {
    this.value = newValue;
    this.timestamp = Date.now();
    if (newTtl !== null) {
      this.ttl = newTtl;
    }
    this.accessCount++;
  }

  /**
   * Mark as accessed (for LRU tracking)
   */
  markAccessed() {
    this.accessCount++;
  }
}

/**
 * LRU Cache with TTL support
 */
class LRUCache {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
    
    // Doubly-linked list for LRU tracking
    this.head = new CacheNode('HEAD', null);
    this.tail = new CacheNode('TAIL', null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
    
    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      refreshes: 0
    };
  }

  /**
   * Get value from cache
   */
  get(key) {
    const node = this.cache.get(key);
    
    if (!node) {
      this.metrics.misses++;
      return null;
    }

    // Check if expired
    if (node.isExpired()) {
      this.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Move to head (most recently used)
    this.moveToHead(node);
    node.markAccessed();
    this.metrics.hits++;
    
    return {
      value: node.value,
      timestamp: node.timestamp,
      age: node.getAge(),
      isStale: node.isStale(),
      accessCount: node.accessCount
    };
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = DEFAULT_TTL) {
    const existingNode = this.cache.get(key);
    
    if (existingNode) {
      // Update existing node
      existingNode.update(value, ttl);
      this.moveToHead(existingNode);
      this.metrics.refreshes++;
    } else {
      // Create new node
      const newNode = new CacheNode(key, value, ttl);
      
      // Check if cache is full
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      
      this.cache.set(key, newNode);
      this.addToHead(newNode);
    }
    
    this.updateMetrics();
  }

  /**
   * Delete entry from cache
   */
  delete(key) {
    const node = this.cache.get(key);
    if (node) {
      this.cache.delete(key);
      this.removeNode(node);
      return true;
    }
    return false;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const node = this.cache.get(key);
    return node && !node.isExpired();
  }

  /**
   * Get all stale entries
   */
  getStaleEntries() {
    const staleEntries = [];
    for (const [key, node] of this.cache) {
      if (node.isStale() && !node.isExpired()) {
        staleEntries.push({
          key,
          value: node.value,
          age: node.getAge(),
          timestamp: node.timestamp
        });
      }
    }
    return staleEntries;
  }

  /**
   * Get all expired entries
   */
  getExpiredEntries() {
    const expiredEntries = [];
    for (const [key, node] of this.cache) {
      if (node.isExpired()) {
        expiredEntries.push(key);
      }
    }
    return expiredEntries;
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const expiredKeys = this.getExpiredEntries();
    expiredKeys.forEach(key => this.delete(key));
    return expiredKeys.length;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.metrics.misses / totalRequests) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: hitRate.toFixed(2),
      missRate: missRate.toFixed(2),
      stalePrices: this.getStaleEntries().length,
      expiredPrices: this.getExpiredEntries().length,
      ...this.metrics
    };
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.metrics = { hits: 0, misses: 0, evictions: 0, refreshes: 0 };
  }

  // Private methods for LRU list management

  moveToHead(node) {
    this.removeNode(node);
    this.addToHead(node);
  }

  addToHead(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  evictLRU() {
    const lru = this.tail.prev;
    if (lru !== this.head) {
      this.cache.delete(lru.key);
      this.removeNode(lru);
      this.metrics.evictions++;
    }
  }

  updateMetrics() {
    const stats = this.getStats();
    cacheStatusStore.set({
      size: stats.size,
      hitRate: parseFloat(stats.hitRate),
      missRate: parseFloat(stats.missRate),
      stalePrices: stats.stalePrices
    });
    cacheMetricsStore.set(this.metrics);
  }
}

/**
 * Price Cache Service with background refresh and cache warming
 */
class PriceCacheService {
  constructor() {
    this.cache = new LRUCache(MAX_CACHE_SIZE);
    this.backgroundRefreshInterval = null;
    this.cacheWarmingQueue = new Set();
    this.isWarming = false;
    this.refreshCallback = null;
    
    // Track tokens that need background refresh
    this.refreshQueue = new Set();
    
    console.log('💾 Price Cache Service initialized');
  }

  /**
   * Initialize cache service with refresh callback
   */
  initialize(refreshCallback) {
    this.refreshCallback = refreshCallback;
    this.startBackgroundRefresh();
    console.log('✅ Price Cache Service started with background refresh');
  }

  /**
   * Get price from cache
   */
  getPrice(tokenAddress) {
    const cached = this.cache.get(tokenAddress);
    
    if (cached) {
      // Add to refresh queue if stale but not expired
      if (cached.isStale) {
        this.refreshQueue.add(tokenAddress);
      }
      
      return {
        price: cached.value,
        timestamp: cached.timestamp,
        age: cached.age,
        isStale: cached.isStale,
        isCached: true,
        accessCount: cached.accessCount
      };
    }
    
    // Add to warming queue if not in cache
    this.cacheWarmingQueue.add(tokenAddress);
    return null;
  }

  /**
   * Set price in cache
   */
  setPrice(tokenAddress, priceData, ttl = DEFAULT_TTL) {
    this.cache.set(tokenAddress, priceData, ttl);
    
    // Remove from refresh queue if it was there
    this.refreshQueue.delete(tokenAddress);
    this.cacheWarmingQueue.delete(tokenAddress);
    
    console.log(`💾 Cached price for ${priceData.symbol || tokenAddress}: $${priceData.price?.toFixed(6) || 'N/A'}`);
  }

  /**
   * Check if price exists in cache and is fresh
   */
  hasFreshPrice(tokenAddress) {
    return this.cache.has(tokenAddress);
  }

  /**
   * Check if price is stale
   */
  isPriceStale(tokenAddress) {
    const cached = this.cache.get(tokenAddress);
    return cached ? cached.isStale : true;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Start background refresh process
   */
  startBackgroundRefresh() {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
    }

    this.backgroundRefreshInterval = setInterval(async () => {
      await this.performBackgroundTasks();
    }, BACKGROUND_REFRESH_INTERVAL);

    console.log(`🔄 Background refresh started (${BACKGROUND_REFRESH_INTERVAL/1000}s interval)`);
  }

  /**
   * Stop background refresh process
   */
  stopBackgroundRefresh() {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
      this.backgroundRefreshInterval = null;
      console.log('⏹️ Background refresh stopped');
    }
  }

  /**
   * Perform background maintenance tasks
   */
  async performBackgroundTasks() {
    try {
      // Clean up expired entries
      const expiredCount = this.cache.cleanup();
      if (expiredCount > 0) {
        console.log(`🧹 Cleaned up ${expiredCount} expired cache entries`);
      }

      // Refresh stale prices
      if (this.refreshQueue.size > 0 && this.refreshCallback) {
        const tokensToRefresh = Array.from(this.refreshQueue).slice(0, 5); // Limit batch size
        console.log(`🔄 Background refreshing ${tokensToRefresh.length} stale prices`);
        
        for (const tokenAddress of tokensToRefresh) {
          try {
            await this.refreshCallback(tokenAddress);
            this.refreshQueue.delete(tokenAddress);
          } catch (error) {
            console.warn(`⚠️ Background refresh failed for ${tokenAddress}:`, error.message);
          }
        }
      }

      // Warm cache for requested tokens
      if (this.cacheWarmingQueue.size > 0 && !this.isWarming) {
        await this.performCacheWarming();
      }

    } catch (error) {
      console.error('❌ Background task error:', error);
    }
  }

  /**
   * Perform cache warming for requested tokens
   */
  async performCacheWarming() {
    if (this.isWarming || !this.refreshCallback) return;
    
    this.isWarming = true;
    const tokensToWarm = Array.from(this.cacheWarmingQueue).slice(0, CACHE_WARMING_BATCH_SIZE);
    
    if (tokensToWarm.length > 0) {
      console.log(`🔥 Cache warming ${tokensToWarm.length} tokens`);
      
      for (const tokenAddress of tokensToWarm) {
        try {
          await this.refreshCallback(tokenAddress);
          this.cacheWarmingQueue.delete(tokenAddress);
        } catch (error) {
          console.warn(`⚠️ Cache warming failed for ${tokenAddress}:`, error.message);
        }
      }
    }
    
    this.isWarming = false;
  }

  /**
   * Force refresh specific token
   */
  async forceRefresh(tokenAddress) {
    if (this.refreshCallback) {
      try {
        console.log(`🔄 Force refreshing ${tokenAddress}`);
        await this.refreshCallback(tokenAddress);
        this.refreshQueue.delete(tokenAddress);
        this.cacheWarmingQueue.delete(tokenAddress);
      } catch (error) {
        console.error(`❌ Force refresh failed for ${tokenAddress}:`, error);
        throw error;
      }
    }
  }

  /**
   * Warm cache for multiple tokens
   */
  async warmCache(tokenAddresses) {
    console.log(`🔥 Warming cache for ${tokenAddresses.length} tokens`);
    
    for (const tokenAddress of tokenAddresses) {
      this.cacheWarmingQueue.add(tokenAddress);
    }
    
    // Trigger immediate warming if not already in progress
    if (!this.isWarming) {
      await this.performCacheWarming();
    }
  }

  /**
   * Get all stale prices that need refresh
   */
  getStalePrices() {
    return this.cache.getStaleEntries();
  }

  /**
   * Preload cache with initial data
   */
  preloadCache(priceData) {
    console.log(`💾 Preloading cache with ${Object.keys(priceData).length} prices`);
    
    for (const [tokenAddress, data] of Object.entries(priceData)) {
      this.setPrice(tokenAddress, data);
    }
  }

  /**
   * Export cache data for persistence
   */
  exportCache() {
    const cacheData = {};
    
    for (const [key, node] of this.cache.cache) {
      if (!node.isExpired()) {
        cacheData[key] = {
          value: node.value,
          timestamp: node.timestamp,
          ttl: node.ttl,
          accessCount: node.accessCount
        };
      }
    }
    
    return {
      data: cacheData,
      exportTime: Date.now(),
      stats: this.getCacheStats()
    };
  }

  /**
   * Import cache data from persistence
   */
  importCache(cacheExport) {
    if (!cacheExport || !cacheExport.data) return;
    
    console.log(`💾 Importing cache data (${Object.keys(cacheExport.data).length} entries)`);
    
    for (const [key, entry] of Object.entries(cacheExport.data)) {
      // Check if entry is still valid
      const age = Date.now() - entry.timestamp;
      if (age < entry.ttl) {
        const remainingTtl = entry.ttl - age;
        this.cache.set(key, entry.value, remainingTtl);
      }
    }
  }

  /**
   * Clear all cache data
   */
  clearCache() {
    this.cache.clear();
    this.refreshQueue.clear();
    this.cacheWarmingQueue.clear();
    console.log('🧹 Cache cleared');
  }

  /**
   * Cleanup and shutdown
   */
  destroy() {
    this.stopBackgroundRefresh();
    this.clearCache();
    console.log('🧹 Price Cache Service destroyed');
  }
}

// Create and export singleton instance
export const priceCacheService = new PriceCacheService();

export default priceCacheService;