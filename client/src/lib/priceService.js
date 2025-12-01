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
    
    // Error tracking for recovery
    this.lastFetchErrors = [];
    this.consecutiveFailures = 0;
    this.MAX_CONSECUTIVE_FAILURES = 3;
    
    // Token list for price fetching - using unified backend endpoint
    this.supportedTokens = INITIAL_TOKEN_LIST.map(token => ({
      symbol: token.symbol,
      address: token.address,
      display: token.symbol,
      decimals: token.decimals,
      category: token.category
    }));
    
    // API configuration with fallback
    this.apiBaseUrl = import.meta.env.VITE_PRICE_API_URL || 'http://localhost:3001';
    this.fallbackApiUrl = import.meta.env.VITE_LOCAL_PRICE_API_URL || 'http://localhost:3001';
    
    // Webhook configuration for price alerts
    this.alertThresholds = new Map(); // user-defined price change thresholds
    this.webhookUrl = import.meta.env.VITE_WEBHOOK_URL || `${this.apiBaseUrl}/api/price-alerts`;

    // Local cache (browser) so every visitor instantly sees last known prices without waiting
    this.LOCAL_CACHE_KEY = 'reactivePriceCacheV1';
    this.LOCAL_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes aligns with backend refresh cadence
    
    // Track backend cache expiration to avoid redundant fetches
    this.backendCacheExpiresAt = 0; // Timestamp when backend cache will expire
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
      
      // Only fetch from backend if:
      // 1. We have no data, OR
      // 2. Backend cache has expired (we track this from backend's _metadata)
      const now = Date.now();
      const needsFetch = stats.priceCount === 0 || now >= this.backendCacheExpiresAt;
      
      if (needsFetch) {
        console.log('📡 Fetching from backend (cache expired or empty)...');
        await this.fetchFromBackend();
      } else {
        const secondsUntilExpiry = Math.round((this.backendCacheExpiresAt - now) / 1000);
        console.log(`✅ Using cached data (fresh for ${secondsUntilExpiry}s more)`);
      }
      
      // Start monitoring backend refresh cycles
      this.startBackendMonitoring();
      
      // Start fast price polling for immediate updates
      await fastPricePoller.startPolling();
      
      this.isInitialized = true;
      console.log('✅ Price service initialized successfully');
      
      // Subscribe to app mode changes (skip initial call)
      let isFirstCall = true;
      appMode.subscribe((mode) => {
        if (isFirstCall) {
          isFirstCall = false;
          console.log(`📍 Initial mode: ${mode}`);
          return;
        }
        
        if (this.isInitialized) {
          console.log(`🔄 Mode change detected: switching to ${mode}`);
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
    
    const fetchErrors = [];
    
    try {
      let batchPrices = null;
      
      if (mode === 'simulation') {
        // Use mock prices for simulation mode
        try {
          batchPrices = await secureContractService.getMockPrices();
          console.log('✅ Loaded mock prices for simulation');
        } catch (e) {
          const errorMsg = `Mock prices failed: ${e.message}`;
          console.error('❌', errorMsg);
          fetchErrors.push({ source: 'mock', error: errorMsg, timestamp: Date.now() });
        }
      }
      
      // Get cached data from backend endpoint (try primary, then fallback)
      if (!batchPrices) {
        const endpoints = [this.apiBaseUrl, this.fallbackApiUrl];
        
        for (const baseUrl of endpoints) {
          if (batchPrices) break; // Already got data
          
          try {
            console.log(`📡 Trying backend: ${baseUrl}`);
            const response = await fetch(`${baseUrl}/api/prices`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(10000) // 10 second timeout
            });
            
            if (response.ok) {
              batchPrices = await response.json();
              console.log(`✅ Loaded prices from backend: ${baseUrl}`);
              
              // Track backend cache expiration from metadata
              if (batchPrices._metadata) {
                console.log(`📊 Backend data: ${batchPrices._metadata.tokenCount} tokens, age: ${Math.round(batchPrices._metadata.cacheAge / 1000)}s`);
                
                // Calculate when backend cache will expire
                if (batchPrices._metadata.nextFetchIn) {
                  this.backendCacheExpiresAt = Date.now() + batchPrices._metadata.nextFetchIn;
                  const expiresInMinutes = Math.round(batchPrices._metadata.nextFetchIn / 60000);
                  console.log(`⏰ Backend cache fresh for ${expiresInMinutes} more minutes`);
                }
              }
              break; // Success, exit loop
            } else {
              const errorMsg = `Backend endpoint error (${baseUrl}): ${response.status} ${response.statusText}`;
              console.error('❌', errorMsg);
              fetchErrors.push({ source: 'backend', error: errorMsg, timestamp: Date.now() });
            }
          } catch (e) {
            const errorMsg = `Failed to load from backend (${baseUrl}): ${e.message}`;
            console.error('❌', errorMsg);
            fetchErrors.push({ source: 'backend', error: errorMsg, timestamp: Date.now() });
          }
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
      
      // Log all fetch errors if any occurred
      if (fetchErrors.length > 0) {
        console.error('❌ Price fetch errors:', fetchErrors);
        // Store errors for potential UI display
        this.lastFetchErrors = fetchErrors;
      }
      
      return 0;
    } catch (error) {
      const errorMsg = `Backend fetch failed: ${error.message}`;
      console.error('❌', errorMsg);
      fetchErrors.push({ source: 'backend', error: errorMsg, timestamp: Date.now() });
      this.lastFetchErrors = fetchErrors;
      
      // Don't re-throw in simulation mode - use fallback mock prices instead
      if (mode === 'simulation') {
        console.log('🧪 Backend failed in simulation mode, using fallback mock prices...');
        // This will be handled by the fallback logic below
      } else {
        // Re-throw to allow caller to handle in live mode
        throw new Error(errorMsg);
      }
    } finally {
      globalRefreshingStore.set(false);
    }
  }

  // Start monitoring backend refresh cycles
  startBackendMonitoring() {
    // Check for backend refreshes every minute
    setInterval(async () => {
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/health`, {
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
          const response = await fetch(`${this.apiBaseUrl}/api/prices`, {
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

  // Manual refresh all prices with error recovery
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
      
      if (updatedCount > 0) {
        console.log(`✅ Manual refresh completed, updated ${updatedCount} prices`);
        // Reset failure counter on success
        this.consecutiveFailures = 0;
        this.lastFetchErrors = [];
      } else {
        console.warn('⚠️ Manual refresh completed but no prices were updated');
        this.consecutiveFailures++;
        
        // If we have too many consecutive failures, log a warning
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          console.error(`❌ ${this.consecutiveFailures} consecutive refresh failures. Using cached data.`);
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      this.consecutiveFailures++;
      
      // Log detailed error information
      const errorDetails = {
        message: error.message,
        timestamp: Date.now(),
        consecutiveFailures: this.consecutiveFailures,
        hasCache: this.globalStorage.getStats().priceCount > 0
      };
      
      console.error('❌ Refresh error details:', errorDetails);
      
      // Store error for UI display
      this.lastFetchErrors.push({
        source: 'manual_refresh',
        error: error.message,
        timestamp: Date.now()
      });
      
      // Re-throw to allow caller to handle
      throw error;
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

  // Handle app mode changes - clear stale data and refresh
  async handleModeChange() {
    const mode = get(appMode);
    console.log(`🔄 App mode changed to: ${mode}`);
    
    // Clear stale data from previous mode to prevent cross-contamination
    console.log('🧹 Clearing stale price data from previous mode...');
    this.globalStorage.clear();
    
    // Reset backend cache expiration to force fresh fetch
    this.backendCacheExpiresAt = 0;
    
    // Reset error tracking
    this.consecutiveFailures = 0;
    this.lastFetchErrors = [];
    
    // Fetch appropriate prices for the new mode
    globalRefreshingStore.set(true);
    try {
      if (mode === 'simulation') {
        console.log('🧪 Fetching mock prices for simulation mode...');
      } else {
        console.log('🔴 Fetching backend prices for live mode...');
      }
      
      await this.fetchFromBackend();
      
      // Verify correct price source after fetch
      this.verifyPriceSource(mode);
      
      console.log(`✅ Mode switch complete: ${mode} mode prices loaded`);
    } catch (error) {
      console.error(`❌ Failed to fetch prices after mode switch:`, error);
    } finally {
      globalRefreshingStore.set(false);
    }
  }

  // Verify that prices are from the correct source for the current mode
  verifyPriceSource(mode) {
    const prices = this.globalStorage.getAllPrices();
    const priceEntries = Object.entries(prices);
    
    if (priceEntries.length === 0) {
      console.warn('⚠️ No prices available to verify source');
      return false;
    }
    
    // Check a sample of prices to verify source
    const sampleSize = Math.min(5, priceEntries.length);
    const samples = priceEntries.slice(0, sampleSize);
    
    let correctSource = 0;
    let incorrectSource = 0;
    
    for (const [address, priceData] of samples) {
      const source = priceData.source || 'unknown';
      const priceMode = priceData.mode || 'unknown';
      
      if (mode === 'simulation') {
        // In simulation mode, expect 'mock' source
        if (source === 'mock' || priceMode === 'simulation') {
          correctSource++;
        } else {
          incorrectSource++;
          console.warn(`⚠️ Price contamination detected: ${address} has source '${source}' in simulation mode`);
        }
      } else {
        // In live mode, expect 'backend' source
        if (source === 'backend' || priceMode === 'live') {
          correctSource++;
        } else if (source === 'mock' || priceMode === 'simulation') {
          incorrectSource++;
          console.warn(`⚠️ Price contamination detected: ${address} has source '${source}' in live mode`);
        } else {
          // Cache or IPFS sources are acceptable in live mode
          correctSource++;
        }
      }
    }
    
    const isValid = incorrectSource === 0;
    if (isValid) {
      console.log(`✅ Price source verification passed: ${correctSource}/${sampleSize} prices from correct source`);
    } else {
      console.error(`❌ Price source verification failed: ${incorrectSource}/${sampleSize} prices from incorrect source`);
    }
    
    return isValid;
  }

  // User wallet management
  async getUserData(walletAddress) {
    // Check local cache first
    if (this.userData.has(walletAddress)) {
      return this.userData.get(walletAddress);
    }
    
    // Fetch from backend
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/users/${walletAddress}`);
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
      const response = await fetch(`${this.apiBaseUrl}/api/users/${walletAddress}`, {
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
  
  // Get last fetch errors for error recovery UI
  getLastFetchErrors() {
    return this.lastFetchErrors;
  }
  
  // Get consecutive failure count
  getConsecutiveFailures() {
    return this.consecutiveFailures;
  }
  
  // Check if service is in degraded state (using cached data due to failures)
  isDegraded() {
    return this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES;
  }
  
  // Clear error state (useful after manual intervention)
  clearErrors() {
    this.lastFetchErrors = [];
    this.consecutiveFailures = 0;
    console.log('🧹 Price service errors cleared');
  }
  
  // Get current mode and verify price source consistency
  getModeStatus() {
    const mode = get(appMode);
    const prices = this.globalStorage.getAllPrices();
    const priceEntries = Object.entries(prices);
    
    if (priceEntries.length === 0) {
      return {
        currentMode: mode,
        priceCount: 0,
        isConsistent: true,
        message: 'No prices loaded'
      };
    }
    
    // Check all prices for consistency
    let mockCount = 0;
    let backendCount = 0;
    let otherCount = 0;
    
    for (const [, priceData] of priceEntries) {
      const source = priceData.source || 'unknown';
      const priceMode = priceData.mode || 'unknown';
      
      if (source === 'mock' || priceMode === 'simulation') {
        mockCount++;
      } else if (source === 'backend' || priceMode === 'live') {
        backendCount++;
      } else {
        otherCount++;
      }
    }
    
    const isConsistent = mode === 'simulation' 
      ? (mockCount > 0 && backendCount === 0)
      : (backendCount > 0 && mockCount === 0);
    
    return {
      currentMode: mode,
      priceCount: priceEntries.length,
      mockCount,
      backendCount,
      otherCount,
      isConsistent,
      message: isConsistent 
        ? `All ${priceEntries.length} prices are from correct source (${mode} mode)`
        : `Price source mismatch detected: ${mockCount} mock, ${backendCount} backend, ${otherCount} other in ${mode} mode`
    };
  }
}

// Create and export a singleton instance
export const priceService = new EnhancedPriceService();

export default priceService;