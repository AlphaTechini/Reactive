/**
 * Enhanced Price Display Service
 * 
 * Provides multi-source price aggregation with validation, anomaly detection,
 * and intelligent fallback mechanisms as specified in requirements 1.1, 6.1, 6.3
 */

import { writable } from 'svelte/store';
import { fetchPriceIfChanged, getCachedPrice } from '../priceSources/coingeckoPriceService.js';
import { priceCacheService } from './PriceCacheService.js';
import { PercentageCalculator } from '../utils/PercentageCalculator.js';

// Price validation constants
const PRICE_DISCREPANCY_THRESHOLD = 0.05; // 5% as per requirements
const PRICE_STALENESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const API_TIMEOUT = 10000; // 10 seconds timeout for API calls

// Reactive stores for price data
export const enhancedPricesStore = writable({});
export const priceValidationStore = writable({});
export const priceSourceStatusStore = writable({
  uniswap: { available: true, lastError: null },
  coingecko: { available: true, lastError: null },
  priceIngest: { available: true, lastError: null }
});

class EnhancedPriceDisplayService {
  constructor() {
    this.prices = new Map();
    this.priceValidation = new Map();
    this.sourceStatus = new Map([
      ['uniswap', { available: true, lastError: null, lastSuccess: null }],
      ['coingecko', { available: true, lastError: null, lastSuccess: null }],
      ['priceIngest', { available: true, lastError: null, lastSuccess: null }]
    ]);
    
    this.subscribers = new Set();
    this.isInitialized = false;
    
    // Price source configurations
    const apiBaseUrl = import.meta.env.VITE_PRICE_API_URL || 'http://localhost:3001';
    this.priceIngestUrl = `${apiBaseUrl}/api/prices`;
    this.uniswapPriceUrl = `${apiBaseUrl}/api/uniswap-prices`; // Assuming endpoint exists
    
    // Supported tokens - will be loaded from config
    this.supportedTokens = [];
  }

  /**
   * Initialize the enhanced price display service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('🚀 Enhanced price display service already initialized');
      return;
    }

    console.log('🚀 Initializing Enhanced Price Display Service...');
    
    try {
      // Load supported tokens from existing configuration
      await this.loadSupportedTokens();
      
      // Initialize price cache service with refresh callback
      priceCacheService.initialize(async (tokenAddress) => {
        await this.refreshTokenPrice(tokenAddress);
      });
      
      // Initialize price sources
      await this.initializePriceSources();
      
      this.isInitialized = true;
      console.log('✅ Enhanced Price Display Service initialized successfully');
      
      // Perform initial price fetch
      await this.fetchAllPrices();
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Price Display Service:', error);
      throw error;
    }
  }

  /**
   * Load supported tokens from configuration
   */
  async loadSupportedTokens() {
    try {
      // Import token configuration
      const { INITIAL_TOKEN_LIST } = await import('../config/network.js');
      
      this.supportedTokens = INITIAL_TOKEN_LIST.map(token => ({
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals || 18,
        category: token.category || 'token'
      }));
      
      console.log(`📋 Loaded ${this.supportedTokens.length} supported tokens`);
    } catch (error) {
      console.warn('⚠️ Failed to load token configuration, using fallback');
      // Fallback token list
      this.supportedTokens = [
        { symbol: 'BTC', address: '0x1', decimals: 8, category: 'crypto' },
        { symbol: 'ETH', address: '0x2', decimals: 18, category: 'crypto' },
        { symbol: 'USDC', address: '0x3', decimals: 6, category: 'stablecoin' }
      ];
    }
  }

  /**
   * Initialize price source connections and validate availability
   */
  async initializePriceSources() {
    console.log('🔌 Initializing price sources...');
    
    // Test Price Ingest service
    await this.testPriceSource('priceIngest', async () => {
      const response = await fetch(`${this.priceIngestUrl}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(API_TIMEOUT)
      });
      return response.ok;
    });

    // Test CoinGecko service
    await this.testPriceSource('coingecko', async () => {
      // Test with a simple token
      const price = await fetchPriceIfChanged('BTC');
      return typeof price === 'number' && price > 0;
    });

    // Test Uniswap service (if available) - skip in simulation mode
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/simulated')) {
      await this.testPriceSource('uniswap', async () => {
        try {
          const response = await fetch(`${this.uniswapPriceUrl}`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(API_TIMEOUT)
          });
          return response.ok;
        } catch (e) {
          return false; // Service not available
        }
      });
    }

    this.updateSourceStatusStore();
  }

  /**
   * Test individual price source availability
   */
  async testPriceSource(sourceName, testFunction) {
    try {
      const isAvailable = await testFunction();
      this.sourceStatus.set(sourceName, {
        available: isAvailable,
        lastError: null,
        lastSuccess: isAvailable ? Date.now() : null
      });
      
      if (isAvailable) {
        console.log(`✅ ${sourceName} price source available`);
      } else {
        console.warn(`⚠️ ${sourceName} price source test failed`);
      }
    } catch (error) {
      console.warn(`❌ ${sourceName} price source error:`, error.message);
      this.sourceStatus.set(sourceName, {
        available: false,
        lastError: error.message,
        lastSuccess: null
      });
    }
  }

  /**
   * Fetch prices from all available sources with validation
   */
  async fetchAllPrices() {
    console.log('🔄 Fetching prices from all sources...');
    
    const results = new Map();
    const fetchErrors = [];
    
    for (const token of this.supportedTokens) {
      try {
        const priceData = await this.fetchTokenPriceMultiSource(token);
        if (priceData) {
          results.set(token.address, priceData);
        } else {
          fetchErrors.push({
            token: token.symbol,
            error: 'No price data returned',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        const errorMsg = `Failed to fetch price for ${token.symbol}: ${error.message}`;
        console.error('❌', errorMsg);
        fetchErrors.push({
          token: token.symbol,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    // Log summary of fetch errors if any
    if (fetchErrors.length > 0) {
      console.error(`❌ Failed to fetch prices for ${fetchErrors.length} tokens:`, fetchErrors);
    }

    // Update stores with results
    this.updatePriceStores(results);
    
    // Also update global storage for cross-component access
    try {
      const { globalStorage } = await import('../stores/globalStorage.js');
      const pricesObj = {};
      for (const [address, priceData] of results) {
        pricesObj[address] = {
          price: priceData.price,
          change24h: priceData.percentageChange,
          timestamp: priceData.timestamp,
          symbol: priceData.symbol
        };
      }
      await globalStorage.storePrices(pricesObj, { source: 'enhanced_price_service' });
    } catch (error) {
      console.error('❌ Failed to update global storage:', error.message);
    }
    
    console.log(`✅ Successfully fetched prices for ${results.size}/${this.supportedTokens.length} tokens`);
    
    if (fetchErrors.length > 0) {
      console.warn(`⚠️ ${fetchErrors.length} tokens failed to fetch`);
    }
    
    return results.size;
  }

  /**
   * Fetch price for a single token from multiple sources with validation
   */
  async fetchTokenPriceMultiSource(token) {
    const sourcePrices = new Map();
    const sourceErrors = new Map();

    // Fetch from Price Ingest service
    if (this.sourceStatus.get('priceIngest')?.available) {
      try {
        const price = await this.fetchFromPriceIngest(token);
        if (price !== null) {
          sourcePrices.set('priceIngest', price);
        }
      } catch (error) {
        sourceErrors.set('priceIngest', error.message);
        this.markSourceError('priceIngest', error.message);
      }
    }

    // Fetch from CoinGecko
    if (this.sourceStatus.get('coingecko')?.available) {
      try {
        const price = await this.fetchFromCoinGecko(token);
        if (price !== null) {
          sourcePrices.set('coingecko', price);
        }
      } catch (error) {
        sourceErrors.set('coingecko', error.message);
        this.markSourceError('coingecko', error.message);
      }
    }

    // Fetch from Uniswap (if available)
    if (this.sourceStatus.get('uniswap')?.available) {
      try {
        const price = await this.fetchFromUniswap(token);
        if (price !== null) {
          sourcePrices.set('uniswap', price);
        }
      } catch (error) {
        sourceErrors.set('uniswap', error.message);
        this.markSourceError('uniswap', error.message);
      }
    }

    // Validate and aggregate prices
    return this.validateAndAggregatePrice(token, sourcePrices, sourceErrors);
  }

  /**
   * Fetch price from Price Ingest service
   */
  async fetchFromPriceIngest(token) {
    try {
      const response = await fetch(this.priceIngestUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Price Ingest API error: ${response.status}`);
      }

      const data = await response.json();
      const tokenData = data[token.symbol] || data[token.symbol.toUpperCase()];
      
      if (tokenData && typeof tokenData.priceUSD === 'number') {
        this.markSourceSuccess('priceIngest');
        return tokenData.priceUSD;
      }
      
      return null;
    } catch (error) {
      throw new Error(`Price Ingest fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch price from CoinGecko service
   */
  async fetchFromCoinGecko(token) {
    try {
      // Use symbol to fetch from CoinGecko
      const price = await fetchPriceIfChanged(token.symbol);
      if (typeof price === 'number' && price > 0) {
        this.markSourceSuccess('coingecko');
        console.log(`✅ CoinGecko price for ${token.symbol}: $${price.toFixed(6)}`);
        return price;
      }
      console.warn(`⚠️ CoinGecko returned invalid price for ${token.symbol}`);
      return null;
    } catch (error) {
      console.warn(`⚠️ CoinGecko fetch failed for ${token.symbol}:`, error.message);
      throw new Error(`CoinGecko fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch price from Uniswap service (placeholder implementation)
   */
  async fetchFromUniswap(token) {
    try {
      const response = await fetch(`${this.uniswapPriceUrl}/${token.address}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Uniswap API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && typeof data.price === 'number') {
        this.markSourceSuccess('uniswap');
        return data.price;
      }
      
      return null;
    } catch (error) {
      throw new Error(`Uniswap fetch failed: ${error.message}`);
    }
  }

  /**
   * Validate prices from multiple sources and detect anomalies
   */
  validateAndAggregatePrice(token, sourcePrices, sourceErrors) {
    if (sourcePrices.size === 0) {
      console.warn(`⚠️ No valid prices found for ${token.symbol}`);
      return null;
    }

    const prices = Array.from(sourcePrices.values());
    const sources = Array.from(sourcePrices.keys());
    
    // Calculate price statistics
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceSpread = (maxPrice - minPrice) / avgPrice;

    // Detect price discrepancies (requirement 6.3)
    const hasDiscrepancy = priceSpread > PRICE_DISCREPANCY_THRESHOLD;
    
    // Choose the most reliable price
    let finalPrice = avgPrice;
    let confidence = 1.0;
    let primarySource = 'aggregated';

    if (sourcePrices.size === 1) {
      finalPrice = prices[0];
      primarySource = sources[0];
      confidence = 0.8; // Lower confidence for single source
    } else if (hasDiscrepancy) {
      // Use median price when there's high discrepancy
      const sortedPrices = [...prices].sort((a, b) => a - b);
      finalPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
      confidence = 0.6; // Lower confidence due to discrepancy
      console.warn(`⚠️ Price discrepancy detected for ${token.symbol}: ${(priceSpread * 100).toFixed(2)}%`);
    }

    // Store validation data
    const validationData = {
      hasDiscrepancy,
      priceSpread,
      sourceCount: sourcePrices.size,
      confidence,
      sources: Array.from(sourcePrices.entries()),
      errors: Array.from(sourceErrors.entries()),
      timestamp: Date.now()
    };

    this.priceValidation.set(token.address, validationData);

    // Calculate percentage change if we have previous price
    const previousPrice = this.prices.get(token.address)?.price;
    const percentageChange = previousPrice 
      ? PercentageCalculator.calculatePercentageChange(previousPrice, finalPrice)
      : 0;

    // Create price data object
    const priceData = {
      symbol: token.symbol,
      address: token.address,
      price: finalPrice,
      confidence,
      primarySource,
      timestamp: Date.now(),
      validation: validationData,
      // Calculate 18-decimal precision as per requirement 1.1
      precisePrice: this.toPreciseDecimal(finalPrice, 18),
      // Add percentage change with 2-decimal precision as per requirement 1.2
      percentageChange: PercentageCalculator.roundToPrecision(percentageChange, 2),
      previousPrice
    };

    this.prices.set(token.address, priceData);
    
    // Cache the price data
    priceCacheService.setPrice(token.address, priceData);
    
    return priceData;
  }

  /**
   * Convert price to precise decimal representation
   */
  toPreciseDecimal(price, decimals) {
    return Math.round(price * Math.pow(10, decimals));
  }

  /**
   * Mark source as having an error
   */
  markSourceError(sourceName, errorMessage) {
    const current = this.sourceStatus.get(sourceName) || {};
    this.sourceStatus.set(sourceName, {
      ...current,
      available: false,
      lastError: errorMessage,
      lastErrorTime: Date.now()
    });
    this.updateSourceStatusStore();
  }

  /**
   * Mark source as successful
   */
  markSourceSuccess(sourceName) {
    const current = this.sourceStatus.get(sourceName) || {};
    this.sourceStatus.set(sourceName, {
      ...current,
      available: true,
      lastError: null,
      lastSuccess: Date.now()
    });
    this.updateSourceStatusStore();
  }

  /**
   * Update reactive stores with current data
   */
  updatePriceStores(priceResults) {
    const pricesObj = {};
    const validationObj = {};

    for (const [address, priceData] of priceResults) {
      pricesObj[address] = priceData;
      validationObj[address] = priceData.validation;
    }

    enhancedPricesStore.set(pricesObj);
    priceValidationStore.set(validationObj);
  }

  /**
   * Update source status store
   */
  updateSourceStatusStore() {
    const statusObj = {};
    for (const [source, status] of this.sourceStatus) {
      statusObj[source] = status;
    }
    priceSourceStatusStore.set(statusObj);
  }

  /**
   * Get price for a specific token (with cache integration)
   */
  getPrice(tokenAddress) {
    // First check cache
    const cachedPrice = priceCacheService.getPrice(tokenAddress);
    if (cachedPrice && !cachedPrice.isStale) {
      return {
        ...cachedPrice.price,
        isCached: true,
        cacheAge: cachedPrice.age
      };
    }
    
    // Fallback to in-memory storage
    const memoryPrice = this.prices.get(tokenAddress);
    if (memoryPrice) {
      // Cache the price for future requests
      priceCacheService.setPrice(tokenAddress, memoryPrice);
      return memoryPrice;
    }
    
    return null;
  }

  /**
   * Get all current prices
   */
  getAllPrices() {
    const result = {};
    for (const [address, priceData] of this.prices) {
      result[address] = priceData;
    }
    return result;
  }

  /**
   * Check if price data is stale (integrated with cache)
   */
  isPriceStale(tokenAddress) {
    // Check cache first
    if (priceCacheService.hasFreshPrice(tokenAddress)) {
      return priceCacheService.isPriceStale(tokenAddress);
    }
    
    // Fallback to in-memory check
    const priceData = this.prices.get(tokenAddress);
    if (!priceData) return true;
    
    return (Date.now() - priceData.timestamp) > PRICE_STALENESS_THRESHOLD;
  }

  /**
   * Force refresh price for specific token
   */
  async refreshTokenPrice(tokenAddress) {
    const token = this.supportedTokens.find(t => t.address === tokenAddress);
    if (!token) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    console.log(`🔄 Refreshing price for ${token.symbol}...`);
    
    try {
      const priceData = await this.fetchTokenPriceMultiSource(token);
      if (priceData) {
        const results = new Map([[tokenAddress, priceData]]);
        this.updatePriceStores(results);
        console.log(`✅ Price refreshed for ${token.symbol}: $${priceData.price.toFixed(6)}`);
        return priceData;
      }
    } catch (error) {
      console.error(`❌ Failed to refresh price for ${token.symbol}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to price updates
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify subscribers of price updates
   */
  notifySubscribers() {
    const prices = this.getAllPrices();
    this.subscribers.forEach(callback => {
      try {
        callback(prices);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }

  /**
   * Get service status and statistics (including cache stats)
   */
  getServiceStatus() {
    const cacheStats = priceCacheService.getCacheStats();
    
    return {
      initialized: this.isInitialized,
      supportedTokens: this.supportedTokens.length,
      cachedPrices: this.prices.size,
      sourcesAvailable: Array.from(this.sourceStatus.values()).filter(s => s.available).length,
      sourcesTotal: this.sourceStatus.size,
      sourceStatus: Object.fromEntries(this.sourceStatus),
      cache: {
        size: cacheStats.size,
        hitRate: cacheStats.hitRate,
        stalePrices: cacheStats.stalePrices,
        expiredPrices: cacheStats.expiredPrices
      }
    };
  }

  /**
   * Calculate portfolio allocation percentages
   */
  calculatePortfolioPercentages(holdings) {
    if (!holdings || typeof holdings !== 'object') {
      throw new Error('Holdings must be an object with token addresses as keys');
    }

    const prices = {};
    for (const [tokenAddress] of Object.entries(holdings)) {
      const priceData = this.getPrice(tokenAddress);
      if (priceData) {
        prices[tokenAddress] = priceData;
      }
    }

    return PercentageCalculator.calculatePortfolioPercentages(holdings, prices);
  }

  /**
   * Calculate allocation drift between current and target allocations
   */
  calculateAllocationDrift(currentAllocations, targetAllocations) {
    return PercentageCalculator.calculateAllocationDrift(currentAllocations, targetAllocations);
  }

  /**
   * Validate allocation percentages
   */
  validateAllocations(allocations) {
    return PercentageCalculator.validateAllocationPercentages(allocations);
  }

  /**
   * Calculate equal distribution for auto-distribute mode
   */
  calculateEqualDistribution(tokenCount) {
    return PercentageCalculator.calculateEqualDistribution(tokenCount);
  }

  /**
   * Calculate percentage change for various timeframes
   */
  calculateTimeframeChange(tokenAddress, timeframe = '24h') {
    const priceData = this.getPrice(tokenAddress);
    if (!priceData) {
      return 0;
    }

    // Get historical prices from cache or service
    const historicalPrices = this.getHistoricalPrices(tokenAddress);
    return PercentageCalculator.calculateTimeframeChange(priceData.price, historicalPrices, timeframe);
  }

  /**
   * Get historical prices for a token (placeholder - would integrate with actual historical data)
   */
  getHistoricalPrices(tokenAddress) {
    // This would integrate with actual historical price data
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Format percentage for display
   */
  formatPercentage(percentage, options = {}) {
    return PercentageCalculator.formatPercentage(percentage, options);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.subscribers.clear();
    this.prices.clear();
    this.priceValidation.clear();
    
    // Cleanup cache service
    priceCacheService.destroy();
    
    this.isInitialized = false;
    console.log('🧹 Enhanced Price Display Service cleaned up');
  }
}

// Create and export singleton instance
export const enhancedPriceDisplayService = new EnhancedPriceDisplayService();

export default enhancedPriceDisplayService;