// Enhanced Price Service with Global Storage integration
import { writable, get } from 'svelte/store';
import { secureContractService } from '$lib/secureContractService.js';
import { appMode } from '$lib/stores/appMode.js';
import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
// Global storage integration
import { 
  globalStorage,
  globalPricesStore,
  globalRefreshingStore,
  globalDataSourceStore,
  globalLastUpdatedStore,
  globalPriceHistoryStore
} from '$lib/stores/globalStorage.js';
// Fast price polling for immediate updates
import { fastPricePoller } from '$lib/services/fastPricePoller.js';
// IPFS price storage for shared access
import { priceStorageService } from '$lib/services/priceStorage.js';

// Price stores (now linked to global storage)
export const pricesStore = globalPricesStore;
export const priceLoadingStore = globalRefreshingStore;
export const lastUpdatedStore = globalLastUpdatedStore;
export const priceHistoryStore = globalPriceHistoryStore; // Historical prices for chart backwards sliding
export const dataSourceStore = globalDataSourceStore;
export const userDataStore = writable({});

class EnhancedPriceService {
  constructor() {
    this.prices = new Map();
    this.priceHistory = new Map(); // Historical price storage
    this.isInitialized = false;
    this.isRefreshing = false;
    this.subscribers = new Set();
    this.updateInterval = null;
    this.MAX_HISTORY_POINTS = 1000; // Maximum historical data points to store
    // Frontend only consumes cached data - no own refresh intervals
    
    // Global storage integration
    this.globalStorage = globalStorage;
    this.userData = new Map();
    
    // Backend refresh monitoring
    this.backendRefreshInterval = 15 * 60 * 1000; // 15 minutes
    this.lastBackendCheck = null;
    
    // Token list for price fetching - using unified backend endpoint
    this.supportedTokens = INITIAL_TOKEN_LIST.map(token => ({
      symbol: token.symbol,
      address: token.address,
      display: token.symbol,
      decimals: token.decimals,
      category: token.category
    }));
    
    // Webhook configuration for price alerts
    this.alertThresholds = new Map(); // user-defined price change thresholds
    this.webhookUrl = import.meta.env.VITE_WEBHOOK_URL || 'http://localhost:3001/api/price-alerts';

    // Local cache (browser) so every visitor instantly sees last known prices without waiting
    this.LOCAL_CACHE_KEY = 'reactivePriceCacheV1';
    this.LOCAL_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes aligns with backend refresh cadence
  }

  // Initialize and fetch all prices at startup
  async initialize() {
    if (this.isInitialized) {
      console.log('🚀 Price service already initialized, skipping...');
      return;
    }
    
    console.log('🚀 Starting price service with global storage...');
    this.isInitialized = true; // Set early to prevent race conditions
    globalRefreshingStore.set(true);
    
    try {
      // Wait for global storage to initialize
      await this.globalStorage.initialize();
      
      // Load any existing cached data immediately
      const stats = this.globalStorage.getStats();
      if (stats.priceCount > 0) {
        console.log(`💾 Loaded ${stats.priceCount} cached prices immediately`);
        // Data is already loaded, just check if it's fresh
        const dataAge = stats.lastUpdated ? (Date.now() - stats.lastUpdated) / 1000 : Infinity;
        console.log(`📊 Cache age: ${Math.round(dataAge)}s`);
      }
      
      // Only fetch from backend if we have no data or it's very old (>15 minutes)
      const hasRecentData = stats.lastUpdated && (Date.now() - stats.lastUpdated) < 15 * 60 * 1000;
      
      if (!hasRecentData || stats.priceCount === 0) {
        console.log('📡 Fetching fresh data from backend...');
        await this.fetchFromBackend();
      } else {
        console.log('✅ Using cached data (recent enough)');
      }
      
      // Start monitoring backend refresh cycles
      this.startBackendMonitoring();
      
      // Start fast price polling for immediate updates
      await fastPricePoller.startPolling();
      
      this.isInitialized = true;
      console.log('✅ Price service initialized successfully');
      
      // Subscribe to app mode changes
      appMode.subscribe(() => {
        if (this.isInitialized) {
          this.handleModeChange();
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize price service:', error);
    } finally {
      globalRefreshingStore.set(false);
    }
  }

  // Fetch prices from backend and store in global storage
  async fetchFromBackend() {
    const mode = get(appMode);
    globalRefreshingStore.set(true);
    
    try {
      let batchPrices = null;
      
      if (mode === 'simulation') {
        // Use mock prices for simulation mode
        try {
          batchPrices = await secureContractService.getMockPrices();
          console.log('✅ Loaded mock prices for simulation');
        } catch (e) {
          console.warn('Mock prices failed:', e.message);
        }
      }
      
      // Get cached data from backend endpoint
      if (!batchPrices) {
        try {
          const response = await fetch('http://localhost:3001/api/prices', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            batchPrices = await response.json();
            console.log('✅ Loaded prices from backend');
            
            // Log cache metadata if available
            if (batchPrices._metadata) {
              console.log(`📊 Backend data: ${batchPrices._metadata.tokenCount} tokens, age: ${Math.round(batchPrices._metadata.cacheAge / 1000)}s`);
            }
          } else {
            console.warn('⚠️ Backend endpoint error:', response.status, response.statusText);
          }
        } catch (e) {
          console.warn('⚠️ Failed to load from backend:', e.message);
        }
      }
      
      // Process and store in global storage
      if (batchPrices) {
        const processedPrices = {};
        
        for (const token of this.supportedTokens) {
          const symbol = token.display || token.symbol;
          const priceData = batchPrices[symbol] || batchPrices[symbol.toUpperCase()];
          
          if (priceData && priceData.priceUSD !== null) {
            let change = 0;
            if (priceData.priceChangePercent !== null && priceData.priceChangePercent !== undefined) {
              change = priceData.priceChangePercent;
            }
            
            const pricePoint = {
              symbol: symbol,
              address: token.address,
              price: priceData.priceUSD,
              current: priceData.priceUSD,
              change: change,
              change24h: change,
              timestamp: priceData.ts || Date.now(),
              mode: mode,
              previousPrice: priceData.previousPrice || null,
              source: mode === 'simulation' ? 'mock' : 'backend'
            };
            
            processedPrices[token.address] = pricePoint;
          }
        }
        
        // Store in global storage
        await this.globalStorage.storePrices(processedPrices, { 
          source: mode === 'simulation' ? 'mock' : 'backend',
          updateCharts: true 
        });
        
        return Object.keys(processedPrices).length;
      }
      
      // Fallback to deterministic mock prices if everything fails
      if (mode === 'simulation') {
        const mockPrices = {};
        let i = 0;
        for (const token of this.supportedTokens) {
          const base = token.symbol.split('').reduce((a,c)=>a + c.charCodeAt(0), 0) + (i * 7);
          const price = (base % 500) + 5 + (base % 13)/10;
          const change = ((base % 21) - 10);
          
          mockPrices[token.address] = {
            symbol: token.symbol,
            address: token.address,
            price,
            current: price,
            change,
            change24h: change,
            timestamp: Date.now(),
            mode: 'simulation',
            previousPrice: price * (1 - change / 100),
            source: 'mock'
          };
          i++;
        }
        
        await this.globalStorage.storePrices(mockPrices, { 
          source: 'mock',
          updateCharts: true 
        });
        
        console.log(`🧪 Generated ${this.supportedTokens.length} deterministic mock prices`);
        return this.supportedTokens.length;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Backend fetch failed:', error);
      return 0;
    } finally {
      globalRefreshingStore.set(false);
    }
  }

  // Start monitoring backend refresh cycles
  startBackendMonitoring() {
    // Check for backend refreshes every minute
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health', {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const health = await response.json();
          if (health.lastRefresh && health.lastRefresh !== this.lastBackendCheck) {
            console.log('🔄 Backend refresh detected, updating prices...');
            this.lastBackendCheck = health.lastRefresh;
            globalRefreshingStore.set(true);
            await this.fetchFromBackend();
          }
        }
      } catch {
        // Silently ignore monitoring errors
      }
    }, 60 * 1000); // Check every minute
  }

  // Fetch cached token prices from backend (no additional API calls)
  async fetchCachedPricesBatch(mode = null) {
    if (!mode) mode = get(appMode);
    
    try {
      let batchPrices = null;
      
      if (mode === 'simulation') {
        // Use webhook service for simulation mode, but fall back gracefully
        try {
          batchPrices = await secureContractService.getMockPrices();
          console.log('✅ Loaded mock prices from webhook service');
        } catch (e) {
          console.warn('Webhook mock prices failed:', e.message);
        }
      }
      
      // Get cached data from backend endpoint (backend already fetched from APIs)
      if (!batchPrices) {
        try {
          const response = await fetch('http://localhost:3001/api/prices', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            batchPrices = await response.json();
            console.log('✅ Loaded prices from backend');
            
            // Log cache metadata if available
            if (batchPrices._metadata) {
              console.log(`📊 Backend data: ${batchPrices._metadata.tokenCount} tokens, age: ${Math.round(batchPrices._metadata.cacheAge / 1000)}s`);
            }
          } else {
            console.warn('⚠️ Backend cache endpoint error:', response.status, response.statusText);
          }
        } catch (e) {
          console.warn('⚠️ Failed to load from backend cache:', e.message);
        }
      }
      
      // Fallback to IPFS if backend failed and we have a known CID
      if (!batchPrices && this.enableIPFS && this.ipfsNode && this.lastKnownPricesCID) {
        try {
          console.log('🔄 Backend failed, trying IPFS fallback...');
          batchPrices = await this.fetchPricesFromIPFS(this.lastKnownPricesCID);
          console.log('✅ Successfully loaded prices from IPFS fallback');
        } catch (e) {
          console.warn('⚠️ IPFS fallback also failed:', e.message);
        }
      }
      
      // Process batch response and update local prices
      if (batchPrices) {
        const timestamp = Date.now();
        let updatedCount = 0;
        
        for (const token of this.supportedTokens) {
          const symbol = token.display || token.symbol;
          const priceData = batchPrices[symbol] || batchPrices[symbol.toUpperCase()];
          
          if (priceData && priceData.priceUSD !== null) {
            // Use backend-calculated price change if available, otherwise calculate locally
            let change = 0;
            if (priceData.priceChangePercent !== null && priceData.priceChangePercent !== undefined) {
              change = priceData.priceChangePercent;
            } else {
              // Fallback to local calculation if backend doesn't provide change
              const previousPrice = this.prices.get(token.address)?.price || priceData.priceUSD;
              change = previousPrice ? ((priceData.priceUSD - previousPrice) / previousPrice) * 100 : 0;
            }
            
            const pricePoint = {
              symbol: symbol,
              address: token.address,
              price: priceData.priceUSD,
              current: priceData.priceUSD,        // compatibility for components expecting `current`
              change: change,
              change24h: change,                  // compatibility for components expecting `change24h`
              timestamp: priceData.ts || timestamp,
              mode: mode,
              previousPrice: priceData.previousPrice || null
            };
            
            this.prices.set(token.address, pricePoint);
            this.addToHistory(token.address, pricePoint);
            this.checkPriceAlerts(token, priceData.previousPrice || priceData.priceUSD, priceData.priceUSD, change);
            updatedCount++;
          } else if (priceData && priceData.sourceError) {
            console.warn(`⚠️ No price data for ${symbol}:`, priceData.sourceError);
          }
        }
        
        console.log(`✅ Updated ${updatedCount} token prices from batch`);
        return updatedCount;
      }
      // If we reach here and still have no prices AND we're in simulation mode, fabricate deterministic mock prices
      if (mode === 'simulation') {
        const timestamp = Date.now();
        let i = 0;
        for (const token of this.supportedTokens) {
          // Base deterministic pseudo price using char codes + index
          const base = token.symbol.split('').reduce((a,c)=>a + c.charCodeAt(0), 0) + (i * 7);
            const price = (base % 500) + 5 + (base % 13)/10; // 5 .. ~505 range
          const change = ((base % 21) - 10); // -10 .. +10
          const pricePoint = {
            symbol: token.symbol,
            address: token.address,
            price,
            current: price,
            change,
            change24h: change,
            timestamp,
            mode: 'simulation',
            previousPrice: price * (1 - change / 100),
            source: 'mock'
          };
          this.prices.set(token.address, pricePoint);
          this.addToHistory(token.address, pricePoint);
          i++;
        }
        this.updateStores();
        console.log(`🧪 Generated ${this.supportedTokens.length} deterministic mock prices (simulation fallback)`);
        return this.supportedTokens.length;
      }
      return 0;
    } catch (error) {
      console.warn('⚠️ Failed to fetch batch prices:', error.message);
      return 0;
    }
  }

  // Add price point to historical data
  addToHistory(tokenAddress, pricePoint) {
    if (!this.priceHistory.has(tokenAddress)) {
      this.priceHistory.set(tokenAddress, []);
    }
    
    const history = this.priceHistory.get(tokenAddress);
    history.push({
      price: pricePoint.price,
      timestamp: pricePoint.timestamp,
      change: pricePoint.change
    });
    
    // Keep only recent history to avoid memory bloat
    if (history.length > this.MAX_HISTORY_POINTS) {
      history.splice(0, history.length - this.MAX_HISTORY_POINTS);
    }
  }

  // Check for price alert thresholds and send webhooks
  async checkPriceAlerts(token, previousPrice, currentPrice, changePercent) {
    const threshold = this.alertThresholds.get(token.address);
    if (!threshold || !threshold.enabled) return;
    
    if (Math.abs(changePercent) >= threshold.percentage) {
      console.log(`🚨 Price alert triggered for ${token.symbol}: ${changePercent.toFixed(2)}% change`);
      
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.symbol,
            address: token.address,
            previousPrice,
            currentPrice,
            changePercent,
            threshold: threshold.percentage,
            timestamp: Date.now()
          })
        });
        
        console.log(`📡 Price alert webhook sent for ${token.symbol}`);
      } catch (error) {
        console.warn('Failed to send price alert webhook:', error);
      }
    }
  }

  // Set price alert threshold for a token
  setPriceAlert(tokenAddress, percentage) {
    this.alertThresholds.set(tokenAddress, {
      percentage: Math.abs(percentage),
      enabled: true,
      createdAt: Date.now()
    });
    console.log(`🔔 Price alert set for ${tokenAddress}: ${percentage}% threshold`);
  }

  // Remove price alert threshold
  removePriceAlert(tokenAddress) {
    this.alertThresholds.delete(tokenAddress);
    console.log(`🔕 Price alert removed for ${tokenAddress}`);
  }

  // Get historical prices for chart
  getHistoricalPrices(tokenAddress, fromTimestamp = null) {
    const history = this.priceHistory.get(tokenAddress) || [];
    if (!fromTimestamp) return history;
    
    return history.filter(point => point.timestamp >= fromTimestamp);
  }

  // Manual refresh all prices
  async refreshAllPrices() {
    if (this.isRefreshing) {
      console.log('🔄 Price refresh already in progress...');
      return;
    }
    
    this.isRefreshing = true;
    globalRefreshingStore.set(true);
    
    console.log('🔄 Manual refresh started...');

    try {
      const updatedCount = await this.fetchFromBackend();
      console.log(`✅ Manual refresh completed, updated ${updatedCount} prices`);
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    } finally {
      this.isRefreshing = false;
      globalRefreshingStore.set(false);
    }
  }

  // Refresh prices from backend
  async refreshSelectedPrices() {
    console.log('🔄 Refreshing prices from backend...');
    globalRefreshingStore.set(true);

    try {
      const updatedCount = await this.fetchFromBackend();
      console.log(`✅ Refresh completed, loaded ${updatedCount} prices`);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      globalRefreshingStore.set(false);
    }
  }

  // Handle app mode changes by re-fetching data
  async handleModeChange() {
    console.log('🔄 App mode changed, refreshing prices...');
    await this.fetchFromBackend();
  }

  // User wallet management
  async getUserData(walletAddress) {
    // Check local cache first
    if (this.userData.has(walletAddress)) {
      return this.userData.get(walletAddress);
    }
    
    // Fetch from backend
    try {
      const response = await fetch(`http://localhost:3001/api/users/${walletAddress}`);
      if (response.ok) {
        const userData = await response.json();
        this.userData.set(walletAddress, userData);
        return userData;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    
    return null;
  }  async updateUserData(walletAddress, userData) {
    try {
      const response = await fetch(`http://localhost:3001/api/users/${walletAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const updatedData = await response.json();
        this.userData.set(walletAddress, updatedData);
        
        // Update reactive store
        const currentUserData = get(userDataStore);
        userDataStore.set({
          ...currentUserData,
          [walletAddress]: updatedData
        });
        
        return updatedData;
      }
    } catch (error) {
      console.error('Error updating user data:', error);
    }
    
    return null;
  }

  // Process IPFS data and update prices
  async updatePricesFromData(ipfsData) {
    if (!ipfsData || typeof ipfsData !== 'object') {
      console.warn('Invalid IPFS data provided');
      return 0;
    }
    
    const timestamp = Date.now();
    let updatedCount = 0;
    const mode = get(appMode);
    
    for (const token of this.supportedTokens) {
      const symbol = token.display || token.symbol;
      const priceData = ipfsData[symbol] || ipfsData[symbol.toUpperCase()];
      
      if (priceData && priceData.priceUSD !== null) {
        // Use IPFS-stored price change if available, otherwise calculate locally
        let change = 0;
        if (priceData.priceChangePercent !== null && priceData.priceChangePercent !== undefined) {
          change = priceData.priceChangePercent;
        } else {
          // Fallback to local calculation if IPFS doesn't provide change
          const previousPrice = this.prices.get(token.address)?.price || priceData.priceUSD;
          change = previousPrice ? ((priceData.priceUSD - previousPrice) / previousPrice) * 100 : 0;
        }
        
        const pricePoint = {
          symbol: symbol,
          address: token.address,
          price: priceData.priceUSD,
          current: priceData.priceUSD,        // compatibility for components expecting `current`
          change: change,
          change24h: change,                  // compatibility for components expecting `change24h`
          timestamp: priceData.ts || timestamp,
          mode: mode,
          previousPrice: priceData.previousPrice || null,
          source: 'ipfs'
        };
        
        this.prices.set(token.address, pricePoint);
        this.addToHistory(token.address, pricePoint);
        this.checkPriceAlerts(token, priceData.previousPrice || priceData.priceUSD, priceData.priceUSD, change);
        updatedCount++;
      } else if (priceData && priceData.sourceError) {
        console.warn(`⚠️ No price data for ${symbol}:`, priceData.sourceError);
      }
    }
    
    // Update stores with new data
    this.updateStores();
    lastUpdatedStore.set(new Date().toISOString());
    
    console.log(`✅ Updated ${updatedCount} token prices from IPFS data`);
    return updatedCount;
  }

  // Update Svelte stores with current price data
  updateStores() {
    const priceData = {};
    const historyData = {};
    
    for (const [address, priceInfo] of this.prices) {
      priceData[address] = priceInfo;
    }
    
    for (const [address, history] of this.priceHistory) {
      historyData[address] = history;
    }
    
    pricesStore.set(priceData);
    globalPriceHistoryStore.set(historyData);

    // Persist to localStorage for fast load on next visit (ignore errors quietly)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const payload = {
          prices: priceData,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(this.LOCAL_CACHE_KEY, JSON.stringify(payload));
      }
    } catch {
      // LocalStorage persistence failed (quota/serialization) – ignore
    }
  }

  // Get current price for a specific token
  getPrice(tokenAddress) {
    return this.globalStorage.getPrice(tokenAddress);
  }

  // Get all current prices
  getAllPrices() {
    return this.globalStorage.getAllPrices();
  }

  // Subscribe to price updates
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify all subscribers of price updates
  notifySubscribers() {
    const prices = this.getAllPrices();
    this.subscribers.forEach(callback => callback(prices));
  }

  // Format price with appropriate decimal places
  formatPrice(price, decimals = 4) {
    if (price === null || price === undefined || isNaN(price)) {
      return '$0.00';
    }
    
    const num = Number(price);
    if (num === 0) return '$0.00';
    
    // For very small prices, use more decimals
    if (num < 0.01) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: Math.min(8, decimals),
        maximumFractionDigits: Math.min(8, decimals)
      }).format(num);
    }
    
    // For normal prices, use standard formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.min(4, decimals)
    }).format(num);
  }

  // Format percentage change with color indicators
  formatChange(change) {
    if (change === null || change === undefined || isNaN(change)) {
      return '0.00%';
    }
    
    const num = Number(change);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  }

  /**
   * Store current prices to IPFS for shared access
   * @returns {Promise<string>} CID of stored data
   */
  async storePricesToIPFS() {
    try {
      console.log('🌐 Storing prices to IPFS...');
      
      // Initialize IPFS if needed
      await priceStorageService.initialize();
      
      // Get current prices from global storage
      const currentPrices = get(globalPricesStore);
      
      if (Object.keys(currentPrices).length === 0) {
        throw new Error('No prices available to store');
      }
      
      // Store to IPFS
      const cid = await priceStorageService.storePrices(currentPrices);
      
      console.log('✅ Prices stored to IPFS:', cid);
      return cid;
    } catch (error) {
      console.error('❌ Failed to store prices to IPFS:', error);
      throw error;
    }
  }

  /**
   * Retrieve prices from IPFS using CID
   * @param {string} cid - IPFS CID to retrieve from
   * @returns {Promise<Object>} Price data
   */
  async getPricesFromIPFS(cid) {
    try {
      console.log('🌐 Retrieving prices from IPFS:', cid);
      
      // Initialize IPFS if needed
      await priceStorageService.initialize();
      
      // Retrieve from IPFS
      const data = await priceStorageService.getPrices(cid);
      
      // Extract just the price data (remove metadata)
      const { _metadata, ...prices } = data;
      
      // Store in global storage
      await this.globalStorage.storePrices(prices, {
        source: 'ipfs',
        cid: cid,
        timestamp: _metadata?.timestamp
      });
      
      console.log('✅ Prices retrieved from IPFS and stored locally');
      return prices;
    } catch (error) {
      console.error('❌ Failed to retrieve prices from IPFS:', error);
      throw error;
    }
  }

  /**
   * Get IPFS node information
   * @returns {Object} Node info
   */
  getIPFSNodeInfo() {
    return priceStorageService.getNodeInfo();
  }

  // Cleanup method
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.subscribers.clear();
    
    // Clear global storage
    this.globalStorage.clear();
    
    console.log('🧹 Price service cleaned up');
  }
  
  // Status methods
  getStorageStatus() {
    return this.globalStorage.getStats();
  }
}

// Create and export a singleton instance
export const priceService = new EnhancedPriceService();

export default priceService;