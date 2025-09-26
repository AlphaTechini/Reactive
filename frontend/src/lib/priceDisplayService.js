// lib/priceDisplayService.js
// Secure read-only price display service - NO TRADING LOGIC
import { contractService } from './contractService.js';

class PriceDisplayService {
  constructor() {
    this.prices = new Map();
    this.priceUpdateInterval = null;
    this.subscribers = new Set();
    this.updateInterval = 30000; // 30 seconds
    this.isInitialized = false;
  }

  /**
   * Initialize price service (read-only)
   */
  async initialize() {
    try {
      await contractService.initialize();
      this.isInitialized = true;
      this.startPriceUpdates();
      console.log('Price display service initialized (read-only)');
      return true;
    } catch (error) {
      console.error('Failed to initialize price display service:', error);
      throw error;
    }
  }

  /**
   * Start automatic price updates (read-only from contract)
   */
  startPriceUpdates() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    this.priceUpdateInterval = setInterval(async () => {
      await this.updateAllPrices();
    }, this.updateInterval);

    // Initial price fetch
    this.updateAllPrices();
  }

  /**
   * Stop automatic price updates
   */
  stopPriceUpdates() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
  }

  /**
   * Update all tracked token prices (read from contract only)
   */
  async updateAllPrices() {
    if (!this.isInitialized) return;

    try {
      // Get supported tokens from contract
      const supportedTokens = await contractService.contract.getSupportedTokens();
      
      // Fetch prices for each token from contract
      for (const tokenAddress of supportedTokens) {
        try {
          const price = await contractService.contract.getTokenPrice(tokenAddress);
          const priceInEther = ethers.formatEther(price);
          
          const oldPrice = this.prices.get(tokenAddress);
          this.prices.set(tokenAddress, {
            current: parseFloat(priceInEther),
            previous: oldPrice?.current || parseFloat(priceInEther),
            change: oldPrice ? ((parseFloat(priceInEther) - oldPrice.current) / oldPrice.current) * 100 : 0,
            timestamp: Date.now(),
            address: tokenAddress
          });
        } catch (error) {
          console.error(`Failed to get price for ${tokenAddress}:`, error);
        }
      }

      // Notify subscribers
      this.notifySubscribers();

    } catch (error) {
      console.error('Failed to update prices from contract:', error);
    }
  }

  /**
   * Get current price for a token (read-only)
   */
  getPrice(tokenAddress) {
    const priceData = this.prices.get(tokenAddress);
    return priceData ? {
      price: priceData.current,
      change: priceData.change,
      timestamp: priceData.timestamp
    } : null;
  }

  /**
   * Get all current prices (read-only)
   */
  getAllPrices() {
    const result = {};
    this.prices.forEach((priceData, address) => {
      result[address] = {
        price: priceData.current,
        change: priceData.change,
        timestamp: priceData.timestamp
      };
    });
    return result;
  }

  /**
   * Get token info from contract (read-only)
   */
  async getTokenInfo(tokenAddress) {
    if (!this.isInitialized) return null;
    
    try {
      const tokenInfo = await contractService.contract.getTokenInfo(tokenAddress);
      return {
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        isSupported: tokenInfo.isSupported,
        category: tokenInfo.category,
        address: tokenAddress
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      return null;
    }
  }

  /**
   * Get historical data (mock data for charts - no real trading history exposed)
   */
  async getHistoricalData(tokenAddress, timeframe = '1d') {
    // Generate mock historical data based on current price
    const currentPrice = this.getPrice(tokenAddress);
    if (!currentPrice) return [];

    const now = Date.now();
    const intervals = {
      '1h': { count: 60, interval: 60 * 1000 },
      '1d': { count: 24, interval: 60 * 60 * 1000 },
      '7d': { count: 7 * 24, interval: 60 * 60 * 1000 },
      '30d': { count: 30, interval: 24 * 60 * 60 * 1000 }
    };

    const { count, interval } = intervals[timeframe] || intervals['1d'];
    let price = currentPrice.price * (0.95 + Math.random() * 0.1); // Start with price ±5%
    
    const historicalData = [];
    
    for (let i = count; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const change = (Math.random() - 0.5) * 0.02; // ±1% change
      price = price * (1 + change);
      
      historicalData.push({
        timestamp,
        price: Number(price.toFixed(6))
      });
    }
    
    // Ensure last price matches current price
    if (historicalData.length > 0) {
      historicalData[historicalData.length - 1].price = currentPrice.price;
    }
    
    return historicalData;
  }

  /**
   * Subscribe to price updates
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of price updates
   */
  notifySubscribers() {
    const allPrices = this.getAllPrices();
    this.subscribers.forEach(callback => {
      try {
        callback(allPrices);
      } catch (error) {
        console.error('Error in price subscriber:', error);
      }
    });
  }

  /**
   * Format price for display
   */
  formatPrice(price, decimals = 6) {
    if (price === null || price === undefined || isNaN(price)) return '--';
    
    if (price >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(price);
    }
  }

  /**
   * Format price change for display
   */
  formatPriceChange(change) {
    if (change === null || change === undefined || isNaN(change)) return '--';
    
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  /**
   * Get token symbol from address using contract data
   */
  async getTokenSymbol(address) {
    const tokenInfo = await this.getTokenInfo(address);
    return tokenInfo ? tokenInfo.symbol : 'UNKNOWN';
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopPriceUpdates();
    this.subscribers.clear();
    this.prices.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
export const priceDisplayService = new PriceDisplayService();

// Export for use in components
export default priceDisplayService;