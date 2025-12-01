// Server Warmup Service - Prevents Render cold starts
class ServerWarmupService {
  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_PRICE_API_URL || 'http://localhost:3001';
    this.isWarming = false;
    this.warmupAttempts = 0;
    this.maxAttempts = 3;
    this.warmupTimeout = 15000; // 15 seconds timeout
  }

  /**
   * Ping the server to wake it up from cold start
   * @returns {Promise<boolean>} Success status
   */
  async warmupServer() {
    if (this.isWarming) {
      console.log('🔥 Server warmup already in progress...');
      return false;
    }

    this.isWarming = true;
    console.log('🔥 Warming up server to prevent cold start...');

    try {
      const startTime = Date.now();
      
      // Try ping endpoint first (lightweight)
      const response = await fetch(`${this.apiBaseUrl}/api/ping`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(this.warmupTimeout)
      });

      const duration = Date.now() - startTime;
      
      if (response.ok) {
        console.log(`✅ Server warmed up successfully in ${duration}ms`);
        this.warmupAttempts = 0;
        return true;
      } else {
        console.warn(`⚠️ Server warmup returned ${response.status} in ${duration}ms`);
        return await this.retryWarmup();
      }
    } catch (error) {
      console.warn('⚠️ Server warmup failed:', error.message);
      return await this.retryWarmup();
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Retry warmup with exponential backoff
   * @returns {Promise<boolean>}
   */
  async retryWarmup() {
    this.warmupAttempts++;
    
    if (this.warmupAttempts >= this.maxAttempts) {
      console.error(`❌ Server warmup failed after ${this.maxAttempts} attempts`);
      // Don't fail completely - the app should still work with cached/mock data
      return false;
    }

    const delay = Math.min(1000 * Math.pow(2, this.warmupAttempts - 1), 5000); // Max 5s delay
    console.log(`🔄 Retrying server warmup in ${delay}ms (attempt ${this.warmupAttempts}/${this.maxAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.warmupServer();
  }

  /**
   * Ping server in background without blocking UI
   * @returns {Promise<void>}
   */
  async warmupInBackground() {
    // Don't await - let it run in background
    this.warmupServer().catch(error => {
      console.warn('Background server warmup failed:', error);
    });
  }

  /**
   * Check if server is responsive
   * @returns {Promise<boolean>}
   */
  async isServerResponsive() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ping`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get server status information
   * @returns {Promise<Object|null>}
   */
  async getServerStatus() {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.apiBaseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'online',
          responseTime,
          serverData: data,
          timestamp: Date.now()
        };
      } else {
        return {
          status: 'error',
          responseTime,
          error: `HTTP ${response.status}`,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        status: 'offline',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
}

// Export singleton instance
export const serverWarmup = new ServerWarmupService();
export default serverWarmup;