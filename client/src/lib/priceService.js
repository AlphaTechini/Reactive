// Enhanced Price Service with startup caching and optimized fetching
import { writable, get } from 'svelte/store';
import { secureContractService } from '$lib/secureContractService.js';
import { fetchPriceIfChanged, getCachedPrice, clearPriceCache } from '$lib/priceSources/coingeckoPriceService.js';
import { appMode } from '$lib/stores/appMode.js';

// Price stores
export const pricesStore = writable({});
export const priceLoadingStore = writable(false);
export const lastUpdatedStore = writable(null);

class EnhancedPriceService {
  constructor() {
    this.prices = new Map();
    this.isInitialized = false;
    this.isRefreshing = false;
    this.subscribers = new Set();
    this.updateInterval = null;
    this.BATCH_SIZE = 5; // Number of concurrent price fetches
    this.REFRESH_INTERVAL_MS = 30000; // 30 seconds
    
    // Token list for price fetching
    this.supportedTokens = [
      { symbol: 'BTC', address: '0x1111111111111111111111111111111111111111' },
      { symbol: 'WBTC', address: '0x1111111111111111111111111111111111111111' },
      { symbol: 'ETH', address: '0x2222222222222222222222222222222222222222' },
      { symbol: 'LINK', address: '0x3333333333333333333333333333333333333333' },
      { symbol: 'ADA', address: '0x4444444444444444444444444444444444444444' },
      { symbol: 'DOT', address: '0x5555555555555555555555555555555555555555' },
      { symbol: 'SOL', address: '0x6666666666666666666666666666666666666666' },
      { symbol: 'UNI', address: '0x7777777777777777777777777777777777777777' },
      { symbol: 'USDC', address: '0x8888888888888888888888888888888888888888' },
      { symbol: 'USDT', address: '0x9999999999999999999999999999999999999999' },
      { symbol: 'REACT', address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }
    ];
  }

  // Initialize and fetch all prices at startup
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Starting price service initialization...');
    priceLoadingStore.set(true);
    
    try {
      // Fetch all prices in parallel batches for better performance
      await this.fetchAllPricesStartup();
      
      // Start periodic refresh
      this.startPeriodicRefresh();
      
      this.isInitialized = true;
      console.log('✅ Price service initialized successfully');
      
      // Subscribe to app mode changes to adjust fetching strategy
      appMode.subscribe(() => {
        if (this.isInitialized) {
          this.handleModeChange();
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize price service:', error);
    } finally {
      priceLoadingStore.set(false);
      lastUpdatedStore.set(new Date().toISOString());
    }
  }

  // Fetch all prices at startup with batching for performance
  async fetchAllPricesStartup() {
    const mode = get(appMode);
    const startTime = Date.now();
    
    console.log(`📊 Fetching ${this.supportedTokens.length} token prices in ${mode} mode...`);
    
    // Process tokens in batches to avoid overwhelming APIs
    const batches = [];
    for (let i = 0; i < this.supportedTokens.length; i += this.BATCH_SIZE) {
      batches.push(this.supportedTokens.slice(i, i + this.BATCH_SIZE));
    }
    
    for (const batch of batches) {
      const promises = batch.map(token => this.fetchTokenPrice(token, mode));
      await Promise.allSettled(promises); // Continue even if some fail
    }
    
    this.updateStores();
    const duration = Date.now() - startTime;
    console.log(`⚡ Price fetching completed in ${duration}ms`);
  }

  // Fetch individual token price with mode-aware logic
  async fetchTokenPrice(token, mode = null) {
    if (!mode) mode = get(appMode);
    
    try {
      let price = null;
      
      // Check cache first for faster loading
      const cachedPrice = getCachedPrice(token.symbol);
      if (cachedPrice !== null) {
        price = cachedPrice;
      } else {
        // Fetch fresh price based on mode
        if (mode === 'simulation') {
          // Use webhook service for simulation mode, but fall back gracefully
          try {
            const prices = await secureContractService.getMockPrices();
            const priceData = prices[token.address];
            price = priceData ? priceData.current : null;
            if (price == null) {
              // fall back to CoinGecko
              price = await fetchPriceIfChanged(token.symbol);
            }
          } catch (e) {
            console.warn('Webhook fetch failed, falling back to CoinGecko for', token.symbol, e.message);
            price = await fetchPriceIfChanged(token.symbol);
          }
        } else {
          // Use CoinGecko for live mode
          price = await fetchPriceIfChanged(token.symbol);
        }
      }
      
      if (price !== null) {
        const previousPrice = this.prices.get(token.address)?.price || price;
        const change = previousPrice ? ((price - previousPrice) / previousPrice) * 100 : 0;
        
        this.prices.set(token.address, {
          symbol: token.symbol,
          address: token.address,
          price: price,
          change: change,
          timestamp: Date.now(),
          mode: mode
        });
      }
      
      return price;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch price for ${token.symbol}:`, error.message);
      return null;
    }
  }

  // Manual refresh all prices
  async refreshAllPrices() {
    if (this.isRefreshing) {
      console.log('🔄 Price refresh already in progress...');
      return;
    }
    
    this.isRefreshing = true;
    priceLoadingStore.set(true);
    
    console.log('🔄 Manually refreshing all prices...');
    
    try {
      // Clear cache to force fresh fetches
      clearPriceCache();
      
      // Fetch all prices
      await this.fetchAllPricesStartup();
      
      console.log('✅ Manual price refresh completed');
    } catch (error) {
      console.error('❌ Manual price refresh failed:', error);
    } finally {
      this.isRefreshing = false;
      priceLoadingStore.set(false);
      lastUpdatedStore.set(new Date().toISOString());
    }
  }

  // Start periodic price updates
  startPeriodicRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      if (!this.isRefreshing) {
        console.log('⏰ Periodic price update...');
        await this.refreshSelectedPrices();
      }
    }, this.REFRESH_INTERVAL_MS);
  }

  // Refresh only prices that have changed significantly or are stale
  async refreshSelectedPrices() {
    const mode = get(appMode);
    const now = Date.now();
    const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    
    const tokensToUpdate = this.supportedTokens.filter(token => {
      const cached = this.prices.get(token.address);
      return !cached || 
             (now - cached.timestamp) > STALE_THRESHOLD ||
             cached.mode !== mode;
    });
    
    if (tokensToUpdate.length > 0) {
      console.log(`🔄 Updating ${tokensToUpdate.length} stale prices...`);
      
      const promises = tokensToUpdate.map(token => this.fetchTokenPrice(token, mode));
      await Promise.allSettled(promises);
      
      this.updateStores();
      lastUpdatedStore.set(new Date().toISOString());
    }
  }

  // Handle app mode changes
  async handleModeChange() {
    console.log('🔄 App mode changed, refreshing prices...');
    
    // Clear cache and fetch fresh prices for new mode
    clearPriceCache();
    await this.refreshAllPrices();
  }

  // Update Svelte stores
  updateStores() {
    const pricesObject = {};
    this.prices.forEach((data, address) => {
      pricesObject[address] = {
        symbol: data.symbol,
        price: data.price,
        change: data.change,
        timestamp: data.timestamp
      };
    });
    
    pricesStore.set(pricesObject);
    this.notifySubscribers(pricesObject);
  }

  // Get price for specific token
  getPrice(address) {
    const data = this.prices.get(address);
    return data ? {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      timestamp: data.timestamp
    } : null;
  }

  // Get all prices
  getAllPrices() {
    const result = {};
    this.prices.forEach((data, address) => {
      result[address] = {
        symbol: data.symbol,
        price: data.price,
        change: data.change,
        timestamp: data.timestamp
      };
    });
    return result;
  }

  // Subscribe to price updates
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify subscribers
  notifySubscribers(prices) {
    this.subscribers.forEach(callback => {
      try {
        callback(prices);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }

  // Format price for display
  formatPrice(price, decimals = 6) {
    if (price == null || isNaN(price)) return '--';
    
    if (price >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(price);
  }

  // Format price change
  formatChange(change) {
    if (change == null || isNaN(change)) return '--';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.subscribers.clear();
    this.prices.clear();
    this.isInitialized = false;
    
    console.log('🧹 Price service destroyed');
  }
}

// Export singleton instance
export const enhancedPriceService = new EnhancedPriceService();