/**
 * Fast Price Polling Service
 * 
 * Polls the central storage file for immediate price updates
 * Provides faster updates than waiting for backend API calls
 */

import { globalStorage } from '../stores/globalStorage.js';

class FastPricePoller {
  constructor() {
    this.POLL_INTERVAL_MS = 30000; // Check every 30 seconds (reduced from 2s)
    this.BACKEND_URL = 'http://localhost:3001';
    this.isPolling = false;
    this.lastModified = null;
    this.pollInterval = null;
    this.hasInitialData = false;
  }

  /**
   * Start polling for price updates
   */
  async startPolling() {
    if (this.isPolling) return;
    
    console.log('🔄 Starting price polling...');
    this.isPolling = true;
    
    // Initial fetch only if no data exists
    if (!this.hasInitialData) {
      await this.checkForUpdates();
      this.hasInitialData = true;
    }
    
    // Set up interval polling (much less frequent)
    this.pollInterval = setInterval(async () => {
      await this.checkForUpdates();
    }, this.POLL_INTERVAL_MS);
    
    console.log(`✅ Price polling started (${this.POLL_INTERVAL_MS/1000}s interval)`);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    console.log('⏹️ Fast price polling stopped');
  }

  /**
   * Check for price updates via backend API with Last-Modified header
   */
  async checkForUpdates() {
    try {
      // Use HEAD request to check if data has changed
      const response = await fetch(`${this.BACKEND_URL}/api/prices`, {
        method: 'HEAD',
        headers: this.lastModified ? {
          'If-Modified-Since': this.lastModified
        } : {}
      });
      
      // If data hasn't changed (304), skip update
      if (response.status === 304) {
        return;
      }
      
      // Data has changed, fetch full data
      if (response.ok) {
        const lastModified = response.headers.get('Last-Modified');
        if (lastModified && lastModified !== this.lastModified) {
          this.lastModified = lastModified;
          await this.fetchAndUpdatePrices();
        }
      }
      
    } catch (error) {
      // Silently handle network errors - don't spam console
      if (error.message && !error.message.includes('fetch')) {
        console.warn('Price polling error:', error.message);
      }
    }
  }

  /**
   * Fetch and update prices when changes detected
   */
  async fetchAndUpdatePrices() {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/prices`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const priceData = await response.json();
        
        // Remove metadata for storage
        const rawPrices = { ...priceData };
        delete rawPrices._metadata;
        
        // Backend returns data keyed by symbol (BTC, ETH, etc)
        // We need to transform it to be keyed by address for frontend lookups
        const pricesByAddress = {};
        
        for (const [symbol, priceInfo] of Object.entries(rawPrices)) {
          if (priceInfo && priceInfo.address) {
            // Use lowercase address as key for consistent lookups
            const address = priceInfo.address.toLowerCase();
            
            // Normalize field names: priceUSD -> price
            pricesByAddress[address] = {
              price: priceInfo.priceUSD || priceInfo.price || priceInfo.current,
              change24h: priceInfo.priceChangePercent || priceInfo.change24h || 0,
              timestamp: priceInfo.ts || Date.now(),
              symbol: symbol,
              source: 'fast-poll'
            };
          }
        }
        
        if (Object.keys(pricesByAddress).length > 0) {
          // Store in global storage keyed by address
          await globalStorage.storePrices(pricesByAddress, { 
            source: 'fast-poll',
            updateCharts: true 
          });
          
          console.log(`⚡ Fast update: ${Object.keys(pricesByAddress).length} prices stored by address`);
        }
      }
      
    } catch (error) {
      console.warn('Fast price fetch failed:', error.message);
    }
  }

  /**
   * Manual trigger for immediate update
   */
  async forceUpdate() {
    console.log('🔄 Force updating prices...');
    await this.fetchAndUpdatePrices();
  }

  /**
   * Check if polling is active
   */
  isActive() {
    return this.isPolling;
  }
}

// Create and export singleton
export const fastPricePoller = new FastPricePoller();

export default fastPricePoller;