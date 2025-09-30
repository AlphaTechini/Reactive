/**
 * Helia IPFS Storage Module for Reactive Portfolio Manager
 * 
 * Modern IPFS storage using Helia JS + UnixFS
 * Browser and Node.js compatible
 * 
 * Features:
 * - Store/fetch JSON data (crypto prices, user wallets)
 * - Mutable pointer support via IPNS (commented examples)
 * - Pinning service integration ready (Web3.Storage, Pinata)
 * - Plug-and-play for Svelte frontend or Fastify backend
 */

import { createHelia } from 'helia'
import { unixfs } from '@helia/unixfs'
// NOTE: We keep dependencies minimal; if you later need finer control over transports
// you can add @libp2p/websockets, @libp2p/webtransport, etc. For now we rely on defaults.
// Optional: for mutable pointers (IPNS)
// import { ipns } from '@helia/ipns'
// import { ed25519 } from '@libp2p/crypto/keys'

/**
 * Initialize Helia node with UnixFS interface
 * @returns {Promise<{helia: Object, fs: Object}>} Helia node and filesystem interface
 */
// Simple in-memory key normalizer (avoid Buffer dependency for browser builds)
function toKeyString(key) {
  if (key === undefined || key === null) return 'ø';
  if (typeof key === 'string') return key;
  // libp2p and Helia often use Uint8Array / Buffer for keys; normalize to hex manually
  if (key instanceof Uint8Array) {
    let hex = '';
    for (let i = 0; i < key.length; i++) hex += key[i].toString(16).padStart(2, '0');
    return hex || '00';
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(key)) return key.toString('hex');
  try { return JSON.stringify(key); } catch { return String(key); }
}

// Minimal in-memory datastore / blockstore implementing required async methods
class MemoryStore {
  constructor(label) {
    this.label = label;
    this.store = new Map();
    this._empty = new Uint8Array(0);
  }
  async open () {}
  async close () { this.store.clear(); }
  async put (key, value) {
    if (value === undefined) {
      // Defensive: avoid storing undefined which later causes decode crashes
      if (typeof console !== 'undefined') console.warn(`[MemoryStore:${this.label}] Skipping put of undefined value for key`, key);
      return key;
    }
    if (!(value instanceof Uint8Array)) {
      // Ensure value is bytes; encode JSON/string if needed
      if (typeof value === 'string') {
        value = new TextEncoder().encode(value);
      } else {
        try { value = new TextEncoder().encode(JSON.stringify(value)); }
        catch { value = this._empty; }
      }
    }
    this.store.set(toKeyString(key), value);
    return key;
  }
  async get (key) {
    const k = toKeyString(key);
    const v = this.store.get(k);
    if (v === undefined) return this._empty; // Always return bytes
    return v;
  }
  async has (key) { return this.store.has(toKeyString(key)); }
  async delete (key) { this.store.delete(toKeyString(key)); }
  async * putMany (source) {
    for await (const entry of source) {
      let key, value;
      if (entry && typeof entry === 'object' && 'key' in entry) {
        key = entry.key; value = entry.value;
      } else if (Array.isArray(entry)) {
        key = entry[0]; value = entry[1];
      }
      if (key === undefined || value === undefined) continue;
      await this.put(key, value);
      yield { key, value: await this.get(key) };
    }
  }
  async * getMany (source) {
    for await (const key of source) {
      const v = await this.get(key);
      if (v) yield v; else yield this._empty;
    }
  }
  async * deleteMany (source) {
    for await (const key of source) {
      await this.delete(key);
      yield key;
    }
  }
  batch () {
    const ops = [];
    return {
      put: (key, value) => { if (key !== undefined && value !== undefined) ops.push({ type: 'put', key, value }); },
      delete: (key) => { if (key !== undefined) ops.push({ type: 'delete', key }); },
      commit: async () => { for (const op of ops) { if (op.type === 'put') await this.put(op.key, op.value); else if (op.type === 'delete') await this.delete(op.key); } }
    };
  }
  entries () { return this.store.entries(); }
  size () { return this.store.size; }
  async * query () {
    for (const [hex, value] of this.store.entries()) {
      // Keys already hex encodings; convert back to bytes
      let keyBytes;
      if (hex === 'ø') keyBytes = new Uint8Array(0); else {
        const len = hex.length / 2;
        keyBytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) keyBytes[i] = parseInt(hex.substr(i * 2, 2), 16) || 0;
      }
      yield { key: keyBytes, value };
    }
  }
}

/**
 * Initialize Helia
 * Memory-only by default (no disk persistence) so hosting environments remain stateless.
 * Set process.env.HELIA_MEMORY_ONLY = '0' BEFORE bundling (or inject via Vite define) to allow future persistent mode.
 */
export async function initHelia() {
  try {
    console.log('🚀 Initializing Helia IPFS node...')

    const isBrowser = typeof window !== 'undefined'
    // Avoid direct process access in browser bundles; default to memoryOnly unless a global override exists
    let memoryOnly = true
    try {
      // Support both Node (process.env) and optional injected global (window.__HELIA_MEMORY_ONLY__)
      if (!isBrowser && typeof process !== 'undefined' && process.env && process.env.HELIA_MEMORY_ONLY === '0') memoryOnly = false
      if (isBrowser && typeof window !== 'undefined' && window.__HELIA_MEMORY_ONLY__ === false) memoryOnly = false
    } catch (_) { /* ignore */ }

    let blockstore, datastore
    if (memoryOnly) {
      blockstore = new MemoryStore('blockstore')
      datastore = new MemoryStore('datastore')
      // Optional debug flag (safe in browser)
      if ((!isBrowser && typeof process !== 'undefined' && process.env?.DEBUG_IPFS) || (isBrowser && window.__DEBUG_IPFS__)) {
        console.debug('💾 Helia running in MEMORY-ONLY mode (no disk persistence)')
      }
    } else {
      // Placeholder for future persistent implementation; currently still memory
      blockstore = new MemoryStore('blockstore')
      datastore = new MemoryStore('datastore')
      console.warn('⚠️ Persistent mode not implemented; falling back to memory store')
    }

    // In the browser we avoid specifying explicit Swarm listen addrs (not allowed) and
    // rely on default bootstrap peers. In Node we can keep a permissive config.
    const helia = await createHelia(
      isBrowser
        ? { blockstore, datastore }
        : {
            blockstore,
            datastore,
            config: {
              Addresses: {
                Swarm: [
                  '/ip4/0.0.0.0/tcp/4001',
                  '/ip4/127.0.0.1/tcp/4001/ws'
                ]
              }
            }
          }
    )

    const fs = unixfs(helia)

    // Gracefully handle non-fatal connection errors (like the websocket closure you saw)
    helia.libp2p.addEventListener?.('connection:close', (evt) => {
      const remote = evt.detail?.remotePeer?.toString?.() || 'unknown-peer'
      if ((!isBrowser && typeof process !== 'undefined' && process.env?.DEBUG_IPFS) || (isBrowser && window.__DEBUG_IPFS__)) {
        console.debug(`ℹ️ Connection closed: ${remote}`)
      }
    })

    helia.libp2p.addEventListener?.('peer:discovery', (evt) => {
      const pid = evt.detail?.id?.toString?.()
      if ((!isBrowser && typeof process !== 'undefined' && process.env?.DEBUG_IPFS) || (isBrowser && window.__DEBUG_IPFS__)) {
        console.debug(`🔍 Discovered peer: ${pid}`)
      }
    })

    console.log('✅ Helia node initialized successfully')
    console.log(`📍 Peer ID: ${helia.libp2p.peerId.toString()}`)

    // Attach references so helper functions can optionally access underlying stores
    fs.helia = helia
    return { helia, fs, memoryOnly }
  } catch (error) {
    console.error('❌ Failed to initialize Helia:', error)
    throw new Error(`Helia initialization failed: ${error.message}`)
  }
}

/**
 * Store JSON data in Helia and return CID
 * @param {Object} fs - UnixFS interface from initHelia()
 * @param {Object|Array} jsonData - Data to store as JSON
 * @param {Object} options - Storage options
 * @returns {Promise<string>} CID string of stored data
 */
export async function storeJSON(fs, jsonData, options = {}) {
  try {
    if (!fs) throw new Error('UnixFS interface is required')
    if (jsonData === null || jsonData === undefined) {
      throw new Error('JSON data cannot be null or undefined')
    }
    
    // Convert to JSON string and encode
    const jsonString = JSON.stringify(jsonData, null, options.pretty ? 2 : 0)
    const content = new TextEncoder().encode(jsonString)
    
    console.log(`📤 Storing JSON data (${content.length} bytes)...`)
    
    // Add to IPFS with optional filename
    const addOptions = {}
    if (options.filename) {
      addOptions.path = options.filename
    }
    
  const cid = await fs.addBytes(content, addOptions)
    const cidString = cid.toString()
    
    console.log(`✅ JSON stored successfully: ${cidString}`)
    
    // Optional: Pin to ensure persistence
    if (options.pin !== false) {
      await pinData(fs.helia, cid, options.pinningService)
    }
    
    return cidString
  } catch (error) {
    console.error('❌ Failed to store JSON:', error)
    throw new Error(`JSON storage failed: ${error.message}`)
  }
}

/**
 * Fetch JSON data from Helia by CID
 * @param {Object} fs - UnixFS interface from initHelia()
 * @param {string} cid - CID string to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object|Array>} Parsed JSON data
 */
export async function fetchJSON(fs, cid, options = {}) {
  try {
    if (!fs) throw new Error('UnixFS interface is required')
    if (!cid) throw new Error('CID is required')
    
    console.log(`📥 Fetching JSON data from CID: ${cid}`)
    
    // Collect all chunks
    const chunks = []
    const timeout = options.timeout || 30000 // 30 second default timeout
    
    // Add timeout wrapper
    const fetchPromise = (async () => {
  for await (const chunk of fs.cat(cid)) {
        chunks.push(chunk)
      }
    })()
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    })
    
    await Promise.race([fetchPromise, timeoutPromise])
    
    // Combine chunks and decode
    const combinedData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      combinedData.set(chunk, offset)
      offset += chunk.length
    }
    
    const jsonString = new TextDecoder().decode(combinedData)
    const jsonData = JSON.parse(jsonString)
    
    console.log(`✅ JSON fetched successfully (${jsonString.length} bytes)`)
    
    return jsonData
  } catch (error) {
    console.error(`❌ Failed to fetch JSON from ${cid}:`, error)
    throw new Error(`JSON fetch failed: ${error.message}`)
  }
}

/**
 * Update crypto prices JSON and return new CID
 * @param {Object} fs - UnixFS interface
 * @param {Object} prices - Price data object { symbol: price }
 * @param {Object} options - Update options
 * @returns {Promise<string>} New CID for updated prices
 */
export async function updatePrices(fs, prices, options = {}) {
  try {
    // Validate prices format
    if (!prices || typeof prices !== 'object') {
      throw new Error('Prices must be a valid object')
    }
    
    // Add metadata
    const priceData = {
      ...prices,
      _metadata: {
        timestamp: Date.now(),
        lastUpdate: new Date().toISOString(),
        tokenCount: Object.keys(prices).filter(k => !k.startsWith('_')).length,
        source: options.source || 'reactive-portfolio'
      }
    }
    
    console.log(`💰 Updating crypto prices (${priceData._metadata.tokenCount} tokens)`)
    
    const cid = await storeJSON(fs, priceData, {
      filename: 'crypto-prices.json',
      pretty: true,
      ...options
    })
    
    // TODO: Update IPNS pointer for mutable price feed
    // const ipnsKey = await loadOrCreateKey('crypto-prices')
    // await updateIPNSPointer(fs.helia, ipnsKey, cid)
    
    console.log(`✅ Crypto prices updated: ${cid}`)
    return cid
  } catch (error) {
    console.error('❌ Failed to update prices:', error)
    throw error
  }
}

/**
 * Update user wallet mapping and return new CID
 * @param {Object} fs - UnixFS interface
 * @param {Object} userMap - User mapping object { wallet: userData }
 * @param {Object} options - Update options
 * @returns {Promise<string>} New CID for updated user map
 */
export async function updateUserWallets(fs, userMap, options = {}) {
  try {
    // Validate user map format
    if (!userMap || typeof userMap !== 'object') {
      throw new Error('User map must be a valid object')
    }
    
    // Add metadata
    const userData = {
      ...userMap,
      _metadata: {
        timestamp: Date.now(),
        lastUpdate: new Date().toISOString(),
        userCount: Object.keys(userMap).filter(k => !k.startsWith('_')).length,
        version: options.version || '1.0'
      }
    }
    
    console.log(`👥 Updating user wallets (${userData._metadata.userCount} users)`)
    
    const cid = await storeJSON(fs, userData, {
      filename: 'user-wallets.json',
      pretty: true,
      ...options
    })
    
    // TODO: Update IPNS pointer for mutable user registry
    // const ipnsKey = await loadOrCreateKey('user-wallets')
    // await updateIPNSPointer(fs.helia, ipnsKey, cid)
    
    console.log(`✅ User wallets updated: ${cid}`)
    return cid
  } catch (error) {
    console.error('❌ Failed to update user wallets:', error)
    throw error
  }
}

/**
 * Pin data to ensure persistence (optional pinning service integration)
 * @param {Object} helia - Helia node
 * @param {Object} cid - CID to pin
 * @param {string} pinningService - Optional pinning service ('web3storage', 'pinata')
 */
async function pinData(helia, cid, pinningService) {
  try {
    // Local pinning (always done)
    console.log(`📌 Pinning ${cid} locally...`)
    // Note: Helia automatically pins added content locally
    
    // Optional: Pin to remote services
    if (pinningService === 'web3storage') {
      // TODO: Integrate with Web3.Storage
      // const web3Storage = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN })
      // await web3Storage.pin(cid)
      console.log(`🌐 TODO: Pin to Web3.Storage: ${cid}`)
    } else if (pinningService === 'pinata') {
      // TODO: Integrate with Pinata
      // const pinata = new PinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET)
      // await pinata.pinByHash(cid.toString())
      console.log(`🍍 TODO: Pin to Pinata: ${cid}`)
    }
  } catch (error) {
    console.warn(`⚠️ Pinning failed for ${cid}:`, error.message)
    // Don't throw - pinning failure shouldn't break storage
  }
}

/**
 * Utility: Create or load IPNS key for mutable pointers
 * @param {string} keyName - Name for the IPNS key
 * @returns {Promise<Object>} IPNS key object
 */
async function loadOrCreateKey(keyName) {
  try {
    // TODO: Implement IPNS key management
    // This would create or load a persistent key for mutable content
    // 
    // Example implementation:
    // const keyStore = new KeyStore()
    // let key = await keyStore.get(keyName)
    // if (!key) {
    //   key = await ed25519.generateKeyPair()
    //   await keyStore.set(keyName, key)
    // }
    // return key
    
    console.log(`🔑 TODO: Load/create IPNS key: ${keyName}`)
    return null
  } catch (error) {
    console.error(`Failed to load/create key ${keyName}:`, error)
    throw error
  }
}

/**
 * Utility: Update IPNS pointer to new CID
 * @param {Object} helia - Helia node
 * @param {Object} key - IPNS key
 * @param {Object} cid - New CID to point to
 */
async function updateIPNSPointer(helia, key, cid) {
  try {
    // TODO: Implement IPNS publishing
    // const ipnsService = ipns(helia)
    // await ipnsService.publish(key, cid)
    console.log(`🔄 TODO: Update IPNS pointer to: ${cid}`)
  } catch (error) {
    console.error('Failed to update IPNS pointer:', error)
    throw error
  }
}

/**
 * Utility: Stop Helia node and cleanup
 * @param {Object} helia - Helia node to stop
 */
export async function stopHelia(helia) {
  try {
    if (helia) {
      console.log('🛑 Stopping Helia node...')
      await helia.stop()
      console.log('✅ Helia node stopped')
    }
  } catch (error) {
    console.error('❌ Failed to stop Helia:', error)
  }
}

// Export all functions for convenient destructuring
export default {
  initHelia,
  storeJSON,
  fetchJSON,
  updatePrices,
  updateUserWallets,
  stopHelia
}