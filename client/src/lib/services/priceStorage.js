/**
 * Centralized Price Storage Service using Helia (IPFS in JS)
 * 
 * Provides shared access to price data across all users via IPFS.
 * Every user can read from the same CID for consistent price data.
 */

import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { json } from '@helia/json';

class PriceStorageService {
  constructor() {
    this.helia = null;
    this.fs = null;
    this.jsonStorage = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Helia node with IPFS capabilities
   * Refer to: https://helia.io/docs
   */
  async initialize() {
    try {
      console.log('🌐 Initializing Helia IPFS node...');
      
      // Create Helia node with optimized configuration
      this.helia = await createHelia({
        // Optimize for web browser usage
        config: {
          Addresses: {
            Swarm: [
              '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
              '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
            ]
          }
        }
      });

      // Initialize UnixFS for file storage
      this.fs = unixfs(this.helia);
      
      // Initialize JSON storage for structured data
      this.jsonStorage = json(this.helia);

      this.isInitialized = true;
      console.log('✅ Helia IPFS node initialized successfully');
      console.log('📍 Peer ID:', this.helia.libp2p.peerId.toString());
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Helia IPFS node:', error);
      throw error;
    }
  }

  /**
   * Store price data to IPFS
   * Refer to: https://helia.io/docs/getting-started/storing-data
   * 
   * @param {Object} priceData - JSON object with price data (e.g., { BTC: 68000, ETH: 3500 })
   * @returns {string} CID string for the stored data
   */
  async storePrices(priceData) {
    if (!this.isInitialized) {
      throw new Error('PriceStorageService not initialized. Call initialize() first.');
    }

    try {
      console.log('💾 Storing price data to IPFS...', Object.keys(priceData).length, 'tokens');
      
      // Add metadata for better tracking
      const dataWithMetadata = {
        ...priceData,
        _metadata: {
          timestamp: Date.now(),
          tokenCount: Object.keys(priceData).length,
          source: 'reactive-portfolio-manager',
          version: '1.0.0'
        }
      };

      // Store JSON data using Helia JSON module
      const cid = await this.jsonStorage.add(dataWithMetadata);
      
      console.log('✅ Price data stored successfully');
      console.log('📍 CID:', cid.toString());
      console.log('🔗 IPFS URL:', `https://ipfs.io/ipfs/${cid.toString()}`);
      
      return cid.toString();
    } catch (error) {
      console.error('❌ Failed to store price data:', error);
      throw error;
    }
  }

  /**
   * Retrieve price data from IPFS
   * Refer to: https://helia.io/docs/getting-started/retrieving-data
   * 
   * @param {string} cidString - CID string to fetch data from
   * @returns {Object} Parsed JSON price data
   */
  async getPrices(cidString) {
    if (!this.isInitialized) {
      throw new Error('PriceStorageService not initialized. Call initialize() first.');
    }

    try {
      console.log('📥 Retrieving price data from IPFS...', cidString);
      
      // Parse CID string to CID object
      const { CID } = await import('multiformats/cid');
      const cid = CID.parse(cidString);
      
      // Retrieve JSON data using Helia JSON module
      const priceData = await this.jsonStorage.get(cid);
      
      console.log('✅ Price data retrieved successfully');
      console.log('📊 Tokens found:', priceData._metadata?.tokenCount || Object.keys(priceData).length);
      
      return priceData;
    } catch (error) {
      console.error('❌ Failed to retrieve price data:', error);
      throw error;
    }
  }

  /**
   * Store price data as raw bytes (alternative method)
   * Useful for custom serialization or compression
   * 
   * @param {Object} priceData - JSON object with price data
   * @returns {string} CID string for the stored data
   */
  async storePricesRaw(priceData) {
    if (!this.isInitialized) {
      throw new Error('PriceStorageService not initialized. Call initialize() first.');
    }

    try {
      console.log('💾 Storing price data as raw bytes...');
      
      // Convert JSON to Uint8Array buffer
      const jsonString = JSON.stringify(priceData);
      const encoder = new TextEncoder();
      const buffer = encoder.encode(jsonString);
      
      // Store using UnixFS
      const cid = await this.fs.addBytes(buffer);
      
      console.log('✅ Raw price data stored successfully');
      console.log('📍 CID:', cid.toString());
      
      return cid.toString();
    } catch (error) {
      console.error('❌ Failed to store raw price data:', error);
      throw error;
    }
  }

  /**
   * Retrieve price data from raw bytes
   * 
   * @param {string} cidString - CID string to fetch data from
   * @returns {Object} Parsed JSON price data
   */
  async getPricesRaw(cidString) {
    if (!this.isInitialized) {
      throw new Error('PriceStorageService not initialized. Call initialize() first.');
    }

    try {
      console.log('📥 Retrieving raw price data from IPFS...', cidString);
      
      // Parse CID string to CID object
      const { CID } = await import('multiformats/cid');
      const cid = CID.parse(cidString);
      
      // Retrieve bytes using UnixFS
      const chunks = [];
      for await (const chunk of this.fs.cat(cid)) {
        chunks.push(chunk);
      }
      
      // Combine chunks and decode
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(combined);
      const priceData = JSON.parse(jsonString);
      
      console.log('✅ Raw price data retrieved successfully');
      return priceData;
    } catch (error) {
      console.error('❌ Failed to retrieve raw price data:', error);
      throw error;
    }
  }

  /**
   * Get node information and connection status
   */
  getNodeInfo() {
    if (!this.isInitialized) {
      return { initialized: false };
    }

    return {
      initialized: true,
      peerId: this.helia.libp2p.peerId.toString(),
      connections: this.helia.libp2p.getConnections().length,
      version: this.helia.version || 'unknown'
    };
  }

  /**
   * Clean shutdown of Helia node
   */
  async shutdown() {
    if (this.helia) {
      console.log('🔴 Shutting down Helia IPFS node...');
      await this.helia.stop();
      this.isInitialized = false;
      console.log('✅ Helia IPFS node shut down');
    }
  }
}

// Create singleton instance
export const priceStorageService = new PriceStorageService();

// Export service for easy access
export default priceStorageService;

/**
 * Example usage:
 * 
 * // Initialize the service
 * await priceStorageService.initialize();
 * 
 * // Store price data
 * const priceData = { BTC: 68000, ETH: 3500, REACT: 0.05 };
 * const cid = await priceStorageService.storePrices(priceData);
 * 
 * // Retrieve price data
 * const retrievedData = await priceStorageService.getPrices(cid);
 * console.log('Retrieved prices:', retrievedData);
 * 
 * // Get node info
 * console.log('Node info:', priceStorageService.getNodeInfo());
 */