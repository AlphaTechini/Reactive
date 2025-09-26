// lib/securePriceService.js  
import { secureContractService } from './secureContractService.js';

class SecurePriceService {
  constructor() {
    this.prices = new Map();
    this.priceUpdateInterval = null;
    this.subscribers = new Set();
    this.updateInterval = 60000; // 1 minute (less frequent for on-chain data)
    this.isInitialized = false;
  }

  /**
   * Initialize price service with secure contract connection
   */
  async initialize(provider) {
    try {
      await secureContractService.initialize();
      this.isInitialized = true;
      this.startPriceUpdates();
      console.log('Secure price service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize secure price service:', error);
      throw error;
    }
  }

  /**
   * Start automatic price updates from contract
   */
  startPriceUpdates() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    this.priceUpdateInterval = setInterval(async () => {
      await this.updateAllPricesFromContract();
    }, this.updateInterval);

    // Initial price fetch
    this.updateAllPricesFromContract();
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
   * Update all prices from secure contract source
   */
  async updateAllPricesFromContract() {
    if (!this.isInitialized) return;

    try {
      const contractPrices = await secureContractService.getAllTokenPrices();
      
      // Update internal price cache
      Object.entries(contractPrices).forEach(([address, tokenData]) => {
        const oldPrice = this.prices.get(address);
        this.prices.set(address, {
          current: tokenData.price,
          previous: oldPrice?.current || tokenData.price,
          change: oldPrice ? ((tokenData.price - oldPrice.current) / oldPrice.current) * 100 : 0,
          timestamp: Date.now(),
          symbol: tokenData.symbol
        });
      });

      // Notify subscribers
      this.notifySubscribers();

    } catch (error) {
      console.error('Failed to update prices from contract:', error);
    }
  }

  /**
   * Get current price for a token (read-only from contract)
   */
  async getTokenPrice(tokenAddress) {
    try {
      if (this.prices.has(tokenAddress)) {
        const cached = this.prices.get(tokenAddress);
        // Use cache if less than 5 minutes old
        if (Date.now() - cached.timestamp < 300000) {
          return {
            price: cached.current,
            change: cached.change,
            timestamp: cached.timestamp
          };
        }
      }

      // Fetch fresh price from contract
      const price = await secureContractService.getTokenPrice(tokenAddress);
      const oldPrice = this.prices.get(tokenAddress);
      
      this.prices.set(tokenAddress, {
        current: price,
        previous: oldPrice?.current || price,
        change: oldPrice ? ((price - oldPrice.current) / oldPrice.current) * 100 : 0,
        timestamp: Date.now()
      });

      return {
        price: price,
        change: this.prices.get(tokenAddress).change,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Failed to get token price from contract:', error);
      return null;
    }
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
        timestamp: priceData.timestamp,
        symbol: priceData.symbol
      };
    });
    return result;
  }

  /**
   * Get historical data (mock for now - would need oracle integration for real data)
   */
  async getHistoricalData(tokenAddress, timeframe = '1d') {
    try {
      const currentPrice = await this.getTokenPrice(tokenAddress);
      if (!currentPrice) return [];

      // Generate realistic historical data based on current price
      const now = Date.now();
      const intervals = {
        '1h': { count: 60, interval: 60 * 1000 },      // 1 minute intervals
        '1d': { count: 24, interval: 60 * 60 * 1000 }, // 1 hour intervals
        '7d': { count: 7, interval: 24 * 60 * 60 * 1000 }, // 1 day intervals
        '30d': { count: 30, interval: 24 * 60 * 60 * 1000 } // 1 day intervals
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
      
      // Ensure last price matches current
      if (historicalData.length > 0) {
        historicalData[historicalData.length - 1].price = currentPrice.price;
      }
      
      return historicalData;

    } catch (error) {
      console.error('Failed to get historical data:', error);
      return [];
    }
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
   * Request price update from contract (triggers on-chain price refresh)
   */
  async requestPriceUpdate(tokenAddress) {
    try {
      await secureContractService.updateTokenPrice(tokenAddress);
      // Refresh local cache after contract update
      setTimeout(() => this.getTokenPrice(tokenAddress), 2000);
    } catch (error) {
      console.error('Failed to request price update:', error);
      throw error;
    }
  }

  /**
   * Format price for display
   */
  formatPrice(price, decimals = 6) {
    if (price === null || price === undefined) return '--';
    
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
    if (change === null || change === undefined) return '--';
    
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  /**
   * Get token symbol from contract data
   */
  getTokenSymbol(address) {
    const tokenInfo = secureContractService.getTokenByAddress(address);
    return tokenInfo ? tokenInfo.symbol : 'UNKNOWN';
  }

  /**
   * Get supported tokens from contract
   */
  getSupportedTokens() {
    return secureContractService.getSupportedTokens();
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
export const securePriceService = new SecurePriceService();

// Export for use in components
export default securePriceService;