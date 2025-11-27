/**
 * Central Storage File System
 * 
 * Creates a single shared storage file that all clients can access
 * Uses a hash-based filename stored in .env for universal access
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

class CentralStorageManager {
  constructor() {
    this.STORAGE_DIR = './storage';
    this.PRICES_FILE = process.env.CENTRAL_PRICES_HASH || 'reactive-prices-v1';
    this.USERS_FILE = process.env.CENTRAL_USERS_HASH || 'reactive-users-v1';
    this.FILE_EXTENSION = '.json';
    this.isInitialized = false;
  }

  /**
   * Initialize central storage directory and files
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.STORAGE_DIR, { recursive: true });
      
      // Generate stable hashes if not in env
      if (!process.env.CENTRAL_PRICES_HASH) {
        this.PRICES_FILE = this.generateHash('reactive-prices');
        console.log(`💾 Generated prices file hash: ${this.PRICES_FILE}`);
      }
      
      if (!process.env.CENTRAL_USERS_HASH) {
        this.USERS_FILE = this.generateHash('reactive-users');
        console.log(`👥 Generated users file hash: ${this.USERS_FILE}`);
      }
      
      // Initialize empty files if they don't exist
      await this.ensureFileExists(this.getPricesFilePath(), {
        prices: {},
        metadata: {
          lastUpdated: Date.now(),
          version: '1.0',
          tokenCount: 0
        }
      });
      
      await this.ensureFileExists(this.getUsersFilePath(), {
        users: {},
        metadata: {
          lastUpdated: Date.now(),
          version: '1.0',
          userCount: 0
        }
      });
      
      this.isInitialized = true;
      console.log('✅ Central Storage initialized');
      
    } catch (error) {
      console.error('❌ Central Storage initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate a deterministic hash for filenames
   */
  generateHash(input) {
    return crypto.createHash('sha256').update(input + Date.now().toString()).digest('hex').substring(0, 16);
  }

  /**
   * Get prices file path
   */
  getPricesFilePath() {
    return path.join(this.STORAGE_DIR, this.PRICES_FILE + this.FILE_EXTENSION);
  }

  /**
   * Get users file path
   */
  getUsersFilePath() {
    return path.join(this.STORAGE_DIR, this.USERS_FILE + this.FILE_EXTENSION);
  }

  /**
   * Ensure file exists with default content
   */
  async ensureFileExists(filePath, defaultContent) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
      console.log(`📝 Created storage file: ${path.basename(filePath)}`);
    }
  }

  /**
   * Store prices data
   */
  async storePrices(pricesData) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const filePath = this.getPricesFilePath();
      const data = {
        prices: pricesData,
        metadata: {
          lastUpdated: Date.now(),
          timestamp: new Date().toISOString(),
          tokenCount: Object.keys(pricesData).length,
          version: '1.0'
        }
      };
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`💾 Stored ${data.metadata.tokenCount} prices to central storage`);
      
      return filePath;
    } catch (error) {
      console.error('❌ Failed to store prices:', error);
      throw error;
    }
  }

  /**
   * Load prices data
   */
  async loadPrices() {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const filePath = this.getPricesFilePath();
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      console.log(`📊 Loaded ${data.metadata?.tokenCount || 0} prices from central storage`);
      return data;
    } catch (error) {
      console.warn('⚠️ Failed to load prices from central storage:', error.message);
      return null;
    }
  }

  /**
   * Store user data
   */
  async storeUsers(usersData) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const filePath = this.getUsersFilePath();
      const data = {
        users: usersData,
        metadata: {
          lastUpdated: Date.now(),
          timestamp: new Date().toISOString(),
          userCount: Object.keys(usersData).length,
          version: '1.0'
        }
      };
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`👥 Stored ${data.metadata.userCount} users to central storage`);
      
      return filePath;
    } catch (error) {
      console.error('❌ Failed to store users:', error);
      throw error;
    }
  }

  /**
   * Load user data
   */
  async loadUsers() {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const filePath = this.getUsersFilePath();
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      console.log(`👥 Loaded ${data.metadata?.userCount || 0} users from central storage`);
      return data;
    } catch (error) {
      console.warn('⚠️ Failed to load users from central storage:', error.message);
      return null;
    }
  }

  /**
   * Add or update single user
   */
  async addUser(walletAddress, userData) {
    const existingData = await this.loadUsers() || { users: {} };
    existingData.users[walletAddress] = {
      ...userData,
      lastUpdated: Date.now(),
      timestamp: new Date().toISOString()
    };
    
    await this.storeUsers(existingData.users);
    return existingData.users[walletAddress];
  }

  /**
   * Get storage file information for .env
   */
  getEnvConfig() {
    return {
      CENTRAL_PRICES_HASH: this.PRICES_FILE,
      CENTRAL_USERS_HASH: this.USERS_FILE,
      CENTRAL_STORAGE_DIR: this.STORAGE_DIR
    };
  }

  /**
   * Get file stats
   */
  async getStats() {
    const pricesData = await this.loadPrices();
    const usersData = await this.loadUsers();
    
    return {
      pricesFile: this.getPricesFilePath(),
      usersFile: this.getUsersFilePath(),
      priceCount: pricesData?.metadata?.tokenCount || 0,
      userCount: usersData?.metadata?.userCount || 0,
      lastPricesUpdate: pricesData?.metadata?.lastUpdated || null,
      lastUsersUpdate: usersData?.metadata?.lastUpdated || null
    };
  }

  /**
   * Watch for file changes (for frontend to detect updates)
   */
  watchPricesFile(callback) {
    const filePath = this.getPricesFilePath();
    
    if (typeof fs.watch === 'function') {
      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          callback();
        }
      });
      
      return () => watcher.close();
    } else {
      // Fallback to polling for environments without fs.watch
      const interval = setInterval(async () => {
        try {
          const stats = await fs.stat(filePath);
          callback(stats.mtime);
        } catch (error) {
          // File might not exist yet
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }
}

// Create and export singleton
export const centralStorage = new CentralStorageManager();

export default centralStorage;