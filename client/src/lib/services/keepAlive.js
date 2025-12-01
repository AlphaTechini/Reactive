/**
 * Keep Alive Service
 * Prevents Render backend from going to sleep by pinging it periodically
 */

class KeepAliveService {
  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_PRICE_API_URL || 'http://localhost:3001';
    this.pingInterval = null;
    this.isActive = false;
    
    // Ping every 10 minutes (Render sleeps after 15 minutes of inactivity)
    this.PING_INTERVAL_MS = 10 * 60 * 1000;
    
    // Only run in production (when using remote backend)
    this.shouldRun = this.apiBaseUrl.includes('render.com') || this.apiBaseUrl.includes('onrender.com');
  }

  /**
   * Start the keep-alive service
   */
  start() {
    if (!this.shouldRun) {
      console.log('🏠 Keep-alive service disabled (local development)');
      return;
    }

    if (this.isActive) {
      console.log('💓 Keep-alive service already running');
      return;
    }

    this.isActive = true;
    console.log('💓 Starting keep-alive service for backend...');
    
    // Initial ping
    this.ping();
    
    // Set up periodic pings
    this.pingInterval = setInterval(() => {
      this.ping();
    }, this.PING_INTERVAL_MS);
    
    console.log(`✅ Keep-alive service started (pinging every ${this.PING_INTERVAL_MS / 60000} minutes)`);
  }

  /**
   * Stop the keep-alive service
   */
  stop() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    console.log('🛑 Keep-alive service stopped');
  }

  /**
   * Ping the backend to keep it awake
   */
  async ping() {
    if (!this.shouldRun) {
      return;
    }

    try {
      const startTime = Date.now();
      
      // Use ping endpoint if available, fallback to health
      const endpoints = ['/api/ping', '/api/health'];
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'ReactivePortfolio-KeepAlive/1.0'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (response.ok) {
            const responseTime = Date.now() - startTime;
            console.log(`💓 Backend ping successful (${responseTime}ms) via ${endpoint}`);
            success = true;
            break;
          }
        } catch (error) {
          // Try next endpoint
          continue;
        }
      }
      
      if (!success) {
        const responseTime = Date.now() - startTime;
        console.warn(`⚠️ Backend ping failed after ${responseTime}ms (all endpoints)`);
      }
      
    } catch (error) {
      console.warn('⚠️ Keep-alive ping failed:', error.message);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      active: this.isActive,
      shouldRun: this.shouldRun,
      apiBaseUrl: this.apiBaseUrl,
      pingIntervalMinutes: this.PING_INTERVAL_MS / 60000
    };
  }
}

// Export singleton instance
export const keepAliveService = new KeepAliveService();
export default keepAliveService;