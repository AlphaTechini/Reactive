// Unified price endpoint using Fastify with 15-minute background fetching
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { parseTokenConfig } from './tokenConfig.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
// Helia IPFS integration (optional - gracefully degrades if not available)
let initHelia, updatePrices, updateUserWallets, fetchJSON, storeJSON;
try {
  const heliaModule = await import('../lib/heliaStorage.js');
  initHelia = heliaModule.initHelia;
  updatePrices = heliaModule.updatePrices;
  updateUserWallets = heliaModule.updateUserWallets;
  fetchJSON = heliaModule.fetchJSON;
  storeJSON = heliaModule.storeJSON;
} catch (e) {
  console.warn('⚠️ Helia IPFS module not available - running without IPFS support');
}

import { centralStorage } from '../lib/centralStorage.js';

// Load environment variables safely by searching upwards for a .env file
function loadEnvUpwards() {
  // First try a default load (will look in process.cwd())
  const defaultResult = dotenv.config();
  if (defaultResult.parsed) return { loaded: true, path: path.resolve(process.cwd(), '.env') };

  // Otherwise search up to 3 levels up for a .env
  let current = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.resolve(current, '.env');
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return { loaded: true, path: candidate };
    }
    current = path.resolve(current, '..');
  }

  // Nothing found
  return { loaded: false };
}

const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Now that fastify exists, perform env load logging
const envLoadResult = loadEnvUpwards();
if (envLoadResult.loaded) {
  // Do not print the key or local paths; only confirm that an .env was loaded
  fastify.log.info('Loaded environment variables from .env (found)');
} else {
  fastify.log.info('No .env file found while searching upward from working directory');
}

// Register CORS
await fastify.register(fastifyCors, {
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://reactive-14w1.vercel.app/',
    'https://reactive.cyberpunk.work',
    'https://reactive-agzd.onrender.com'
  ],
  credentials: true
});

// Cache for price data
let priceCache = {};
let previousPriceCache = {};
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const CACHE_FILE = path.resolve(process.cwd(), 'price-cache.json');

// IPFS storage
let ipfsNode = null;
let userDataCache = {};
let lastPricesCID = null;
let lastUsersCID = null;

// Try to load persisted cache from disk at startup (non-blocking)
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (parsed && typeof parsed === 'object') {
      priceCache = parsed.priceCache || {};
      previousPriceCache = parsed.previousPriceCache || {};
      lastFetchTime = parsed.lastFetchTime || 0;
      lastPricesCID = parsed.lastPricesCID || null;
      lastUsersCID = parsed.lastUsersCID || null;
      fastify.log.info(`Loaded persisted cache (${Object.keys(priceCache).length} tokens, age ${Math.round((Date.now() - lastFetchTime)/1000)}s)`);
    }
  }
} catch (e) {
  fastify.log.warn('Failed to load persisted price cache:', e.message);
}

// Initialize IPFS node
async function initializeIPFS() {
  if (!initHelia) {
    fastify.log.info('ℹ️ IPFS module not available - running without IPFS support');
    return;
  }
  
  try {
    fastify.log.info('🚀 Initializing IPFS node for decentralized storage...');
    ipfsNode = await initHelia();
    fastify.log.info('✅ IPFS node initialized successfully');
    
    // Try to load last known data from IPFS if we have CIDs
    if (lastPricesCID && Object.keys(priceCache).length === 0) {
      try {
        const ipfsData = await fetchJSON(ipfsNode.fs, lastPricesCID);
        priceCache = ipfsData;
        fastify.log.info(`📦 Restored price data from IPFS: ${lastPricesCID}`);
      } catch (e) {
        fastify.log.warn('Could not restore from IPFS:', e.message);
      }
    }
  } catch (error) {
    fastify.log.warn('⚠️ IPFS initialization failed:', error.message);
    fastify.log.warn('Continuing without IPFS - using local cache only');
  }
}

// Initialize IPFS after Fastify is ready
initializeIPFS();

// API configuration
const API_KEY = process.env.CRYPTO_API;
const API_BASE_URL = 'https://api.freecryptoapi.com/v1';

// Symbol mapping for FreeCryptoAPI - using standard resolvable symbols
const SYMBOL_MAPPING = {
  // Stablecoins
  'USDC': 'USDC',
  
  // Major - Core mapping for BTC and ETH
  'BTC': 'BTC',     // Direct BTC mapping
  'WBTC': 'BTC',    // BTC wrapped on Ethereum -> map to BTC for pricing API
  'ETH': 'ETH',     // Direct ETH mapping
  'WETH': 'ETH',    // ETH wrapped -> map to ETH for pricing API
  
  // Top 20 Altcoins
  'BNB': 'BNB',
  'SOL': 'SOL',
  'XRP': 'XRP',
  'ADA': 'ADA',
  'AVAX': 'AVAX',
  'DOT': 'DOT',
  'MATIC': 'MATIC',
  'LINK': 'LINK',
  'UNI': 'UNI',
  'ATOM': 'ATOM',
  'AAVE': 'AAVE',
  'MKR': 'MKR',
  'SUSHI': 'SUSHI',
  'LDO': 'LDO',
  'SNX': 'SNX',
  'CRV': 'CRV',
  'GRT': 'GRT',
  'FIL': 'FIL',
  'NEAR': 'NEAR',
  'ARB': 'ARB',
  
  // Memecoins
  'DOGE': 'DOGE',
  'SHIB': 'SHIB',
  'PEPE': 'PEPE',
  'FLOKI': 'FLOKI',
  'WIF': 'WIF',
  'BONK': 'BONK',
  'TURBO': 'TURBO',
  'HOSKY': 'HOSKY',
  'MOG': 'MOG',
  'PONKE': 'PONKE'
};

// Function to get mapped symbol for API calls
function getMappedSymbol(symbol) {
  return SYMBOL_MAPPING[symbol] || symbol;
}

// Function to fetch price for a single symbol using getConversion->USDC (single attempt)
async function fetchTokenPrice(symbol, address) {
  const mappedSymbol = getMappedSymbol(symbol);
  const attempt = mappedSymbol; // single canonical attempt
  const url = `${API_BASE_URL}/getConversion?from=${attempt}&to=USDC&amount=1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'User-Agent': 'ReactivePortfolio/1.0'
      }
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }

    if (!response.ok) {
      fastify.log.warn({ symbol, attempt, status: response.status, body: data }, 'Provider returned non-OK status');
      return {
        address: address,
        priceUSD: null,
        sourceError: `Provider returned status ${response.status}`,
        ts: Date.now(),
        apiSymbol: attempt
      };
    }

    if (data && typeof data.result === 'number') {
      fastify.log.info({ symbol, attempt, price: data.result }, 'Fetched price');
      return {
        address: address,
        priceUSD: data.result,
        ts: Date.now(),
        apiSymbol: attempt
      };
    }

    // Provider responded but payload was unexpected
    fastify.log.warn({ symbol, attempt, providerPayload: data }, 'Unexpected provider payload');
    return {
      address: address,
      priceUSD: null,
      sourceError: 'Unexpected provider payload',
      ts: Date.now(),
      apiSymbol: attempt
    };

  } catch (error) {
    fastify.log.error({ symbol, attempt, error: error.message }, 'Fetch error');
    return {
      address: address,
      priceUSD: null,
      sourceError: error.message,
      ts: Date.now(),
      apiSymbol: attempt
    };
  }
}

// Function to fetch all token prices using per-symbol getConversion calls
async function fetchAllTokenPrices() {
  console.log('🔄 Starting background price fetch with getConversion->USDC...');
  
  if (!API_KEY) {
    console.error('❌ CRYPTO_API key not found in environment variables');
    return {};
  }

  const { symbols } = parseTokenConfig();
  const results = {};
  const fetchPromises = [];

  // Create promises for all token price fetches
  for (const [symbol, address] of Object.entries(symbols)) {
    fetchPromises.push(
      fetchTokenPrice(symbol, address).then(result => {
        // Calculate percentage change from previous price
        const previousPrice = priceCache[symbol]?.priceUSD || null;
        let priceChange = null;
        let priceChangePercent = null;
        
        if (previousPrice && result.priceUSD) {
          priceChange = result.priceUSD - previousPrice;
          priceChangePercent = ((result.priceUSD - previousPrice) / previousPrice) * 100;
        }
        
        results[symbol] = {
          ...result,
          priceChange,
          priceChangePercent,
          previousPrice
        };
        
        // Also store under frontend display symbol for easy frontend access
        // WBTC -> BTC, WETH -> ETH for frontend compatibility
        if (symbol === 'WBTC') {
          results['BTC'] = results[symbol];
        } else if (symbol === 'WETH') {
          results['ETH'] = results[symbol];
        }
      })
    );
  }

  // Wait for all fetches to complete
  try {
    await Promise.all(fetchPromises);
    console.log(`✅ Background fetch completed: ${Object.keys(results).length} tokens processed`);
    
    // Count successful vs failed fetches
    const successful = Object.values(results).filter(r => r.priceUSD !== null).length;
    const failed = Object.values(results).filter(r => r.priceUSD === null).length;
    console.log(`📊 Results: ${successful} successful, ${failed} failed`);
    
    return results;
  } catch (error) {
    console.error('❌ Error in background fetch:', error);
    return results; // Return partial results
  }
}

// Persist cache to disk (best-effort) after successful fetch
function persistCacheToDisk() {
  try {
    const payload = {
      priceCache,
      previousPriceCache,
      lastFetchTime,
      lastPricesCID,
      lastUsersCID
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload), { encoding: 'utf8' });
    fastify.log.info('Persisted cache with IPFS CIDs to disk');
  } catch (e) {
    fastify.log.warn('Failed to persist cache to disk:', e.message);
  }
}

// Background fetching with 15-minute intervals
async function startBackgroundFetching() {
  console.log('🚀 Starting 15-minute background price fetching with USDC conversion...');
  
  // Fetch immediately on startup
  const initialData = await fetchAllTokenPrices();
  if (Object.keys(initialData).length > 0) {
    priceCache = initialData;
    lastFetchTime = Date.now();
    console.log(`💾 Initial cache populated with ${Object.keys(initialData).length} tokens`);
    console.log('⏰ 15-minute timer starting now (after initial fetch completed)');
    
    // Store to IPFS with timestamp
    if (ipfsNode) {
      try {
        const timestampedData = {
          ...initialData,
          _timestamp: lastFetchTime,
          _formatted: new Date(lastFetchTime).toISOString(),
          _tokenCount: Object.keys(initialData).length
        };
        lastPricesCID = await updatePrices(ipfsNode.fs, timestampedData, {
          source: 'freecryptoapi.com'
        });
        console.log(`🌐 Initial prices stored to IPFS: ${lastPricesCID}`);
      } catch (e) {
        console.warn('⚠️ IPFS storage failed:', e.message);
      }
    }
    
    // Persist initial cache to disk so frontend can read on restart
    persistCacheToDisk();
  }
  
  // Set up 15-minute interval (starts AFTER initial fetch completes)
  setInterval(async () => {
    console.log('⏰ 15-minute interval triggered - fetching fresh prices...');
    
    // Store previous prices before fetching new ones
    previousPriceCache = { ...priceCache };
    
    const freshData = await fetchAllTokenPrices();
    if (Object.keys(freshData).length > 0) {
      priceCache = freshData;
      lastFetchTime = Date.now();
      console.log(`💾 Cache updated with ${Object.keys(freshData).length} tokens`);
      
      // Store to IPFS with timestamp
      if (ipfsNode) {
        try {
          const timestampedData = {
            ...freshData,
            _timestamp: lastFetchTime,
            _formatted: new Date(lastFetchTime).toISOString(),
            _tokenCount: Object.keys(freshData).length
          };
          lastPricesCID = await updatePrices(ipfsNode.fs, timestampedData, {
            source: 'freecryptoapi.com'
          });
          console.log(`🌐 Prices updated in IPFS: ${lastPricesCID}`);
        } catch (e) {
          console.warn('⚠️ IPFS storage failed:', e.message);
        }
      }
      
      // Persist updated cache to disk
      persistCacheToDisk();
      
      // Log some price changes
      const changedPrices = Object.entries(freshData).filter(([symbol, data]) => 
        data.priceChangePercent !== null && Math.abs(data.priceChangePercent) > 0.1
      );
      if (changedPrices.length > 0) {
        console.log(`📈 Price changes detected for ${changedPrices.length} tokens`);
        changedPrices.slice(0, 3).forEach(([symbol, data]) => {
          const direction = data.priceChangePercent > 0 ? '📈' : '📉';
          console.log(`${direction} ${symbol}: ${data.priceChangePercent.toFixed(2)}%`);
        });
      }
    }
  }, CACHE_DURATION); // 15 minutes
  
  console.log('✅ Background fetching started (15-minute intervals)');
}

// Unified price endpoint
fastify.get('/api/prices', async (request, reply) => {
  try {
    const now = Date.now();
    
    // Only fetch if cache is truly empty or expired (single CACHE_DURATION, not double)
    if (Object.keys(priceCache).length === 0 || (now - lastFetchTime > CACHE_DURATION)) {
      console.log('🔄 Cache expired or empty, fetching fresh data...');
      
      // Store previous prices before fetching new ones
      previousPriceCache = { ...priceCache };
      
      const freshData = await fetchAllTokenPrices();
      if (Object.keys(freshData).length > 0) {
        priceCache = freshData;
        lastFetchTime = now;
        console.log(`💾 Cache updated with ${Object.keys(freshData).length} tokens`);
        
        // Store to central storage for immediate frontend access
        try {
          await centralStorage.storePrices(freshData);
          console.log('💾 Prices stored to central storage');
        } catch (e) {
          console.warn('⚠️ Central storage failed:', e.message);
        }
      }
    }
    
    // Return cached data
    const cacheAge = now - lastFetchTime;
    const timeUntilNextFetch = Math.max(0, CACHE_DURATION - cacheAge);
    console.log(`📊 Returning price data (cache age: ${Math.round(cacheAge / 1000)}s, next fetch in: ${Math.round(timeUntilNextFetch / 1000)}s)`);
    
    return {
      ...priceCache,
      _metadata: {
        cacheAge: cacheAge,
        lastFetch: new Date(lastFetchTime).toISOString(),
        tokenCount: Object.keys(priceCache).length,
        nextFetchIn: timeUntilNextFetch,
        ipfs: {
          pricesCID: lastPricesCID,
          usersCID: lastUsersCID,
          nodeActive: !!ipfsNode
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Error in /api/prices:', error);
    
    // Return cached data if available, otherwise error
    if (Object.keys(priceCache).length > 0) {
      console.log('⚠️  Returning stale cached data due to error');
      return priceCache;
    } else {
      reply.code(500);
      return {
        error: 'Failed to fetch price data',
        message: error.message
      };
    }
  }
});

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  const now = Date.now();
  const cacheAge = now - lastFetchTime;
  
  return {
    status: 'ok',
    server: 'Fastify',
    backgroundFetching: 'enabled (15-minute intervals)',
    cacheAge: cacheAge,
    cacheAgeMinutes: Math.round(cacheAge / 60000),
    ipfs: {
      nodeActive: !!ipfsNode,
      lastPricesCID,
      lastUsersCID
    }
  };
});

// Ping endpoint to prevent cold starts
fastify.get('/api/ping', async (request, reply) => {
  return {
    status: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    server: 'Fastify'
  };
});

// IPFS data fetch endpoint
fastify.get('/api/ipfs/:cid', async (request, reply) => {
  try {
    if (!ipfsNode) {
      reply.code(503);
      return { error: 'IPFS node not available' };
    }
    
    const { cid } = request.params;
    console.log(`📦 Fetching data from IPFS: ${cid}`);
    
    const data = await fetchJSON(ipfsNode.fs, cid, { timeout: 15000 });
    
    return {
      ...data,
      _ipfs: {
        cid: cid,
        fetchedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`❌ Failed to fetch from IPFS ${request.params.cid}:`, error.message);
    reply.code(404);
    return { 
      error: 'IPFS data not found', 
      message: error.message,
      cid: request.params.cid
    };
  }
});

// Portfolio management endpoints
fastify.post('/api/portfolios', async (request, reply) => {
  try {
    const { walletAddress, portfolio } = request.body;
    
    if (!walletAddress || !portfolio) {
      reply.code(400);
      return { error: 'Wallet address and portfolio data required' };
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      reply.code(400);
      return { error: 'Invalid wallet address format' };
    }
    
    // Get or create user data
    let userData = userDataCache[walletAddress] || {
      walletAddress,
      portfolios: [],
      createdAt: new Date().toISOString()
    };
    
    // Add portfolio with unique ID
    const portfolioId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPortfolio = {
      ...portfolio,
      id: portfolioId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    userData.portfolios = userData.portfolios || [];
    userData.portfolios.push(newPortfolio);
    userData.lastUpdated = new Date().toISOString();
    
    // Update cache
    userDataCache[walletAddress] = userData;
    
    // Store to IPFS if available
    if (ipfsNode) {
      try {
        lastUsersCID = await updateUserWallets(ipfsNode.fs, userDataCache);
        console.log(`📁 Portfolio created and stored to IPFS: ${lastUsersCID}`);
        persistCacheToDisk();
      } catch (e) {
        console.warn('⚠️ Failed to store portfolio to IPFS:', e.message);
      }
    }
    
    return {
      success: true,
      portfolioId,
      portfolio: newPortfolio,
      ipfs: {
        usersCID: lastUsersCID,
        stored: !!ipfsNode
      }
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to create portfolio', message: error.message };
  }
});

fastify.get('/api/portfolios/:walletAddress', async (request, reply) => {
  try {
    const { walletAddress } = request.params;
    
    // Check local cache first
    let userData = userDataCache[walletAddress];
    
    // If not in cache and we have IPFS CID, try to fetch from IPFS
    if (!userData && lastUsersCID && ipfsNode) {
      try {
        const ipfsUserData = await fetchJSON(ipfsNode.fs, lastUsersCID);
        userData = ipfsUserData[walletAddress];
        if (userData) {
          userDataCache[walletAddress] = userData;
        }
      } catch (e) {
        console.warn('Could not fetch user data from IPFS:', e.message);
      }
    }
    
    if (!userData || !userData.portfolios) {
      return {
        success: true,
        portfolios: [],
        walletAddress
      };
    }
    
    return {
      success: true,
      portfolios: userData.portfolios,
      walletAddress,
      source: userDataCache[walletAddress] ? 'cache' : 'ipfs'
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to fetch portfolios', message: error.message };
  }
});

fastify.get('/api/portfolios/:walletAddress/:portfolioId', async (request, reply) => {
  try {
    const { walletAddress, portfolioId } = request.params;
    
    // Get user data
    let userData = userDataCache[walletAddress];
    
    if (!userData && lastUsersCID && ipfsNode) {
      try {
        const ipfsUserData = await fetchJSON(ipfsNode.fs, lastUsersCID);
        userData = ipfsUserData[walletAddress];
        if (userData) {
          userDataCache[walletAddress] = userData;
        }
      } catch (e) {
        console.warn('Could not fetch user data from IPFS:', e.message);
      }
    }
    
    if (!userData || !userData.portfolios) {
      reply.code(404);
      return { error: 'Portfolio not found' };
    }
    
    const portfolio = userData.portfolios.find(p => p.id === portfolioId);
    
    if (!portfolio) {
      reply.code(404);
      return { error: 'Portfolio not found' };
    }
    
    return {
      success: true,
      portfolio,
      walletAddress
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to fetch portfolio', message: error.message };
  }
});

fastify.put('/api/portfolios/:walletAddress/:portfolioId', async (request, reply) => {
  try {
    const { walletAddress, portfolioId } = request.params;
    const updates = request.body;
    
    let userData = userDataCache[walletAddress];
    
    if (!userData || !userData.portfolios) {
      reply.code(404);
      return { error: 'Portfolio not found' };
    }
    
    const portfolioIndex = userData.portfolios.findIndex(p => p.id === portfolioId);
    
    if (portfolioIndex === -1) {
      reply.code(404);
      return { error: 'Portfolio not found' };
    }
    
    // Update portfolio
    userData.portfolios[portfolioIndex] = {
      ...userData.portfolios[portfolioIndex],
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    userData.lastUpdated = new Date().toISOString();
    userDataCache[walletAddress] = userData;
    
    // Store to IPFS if available
    if (ipfsNode) {
      try {
        lastUsersCID = await updateUserWallets(ipfsNode.fs, userDataCache);
        persistCacheToDisk();
      } catch (e) {
        console.warn('⚠️ Failed to store updated portfolio to IPFS:', e.message);
      }
    }
    
    return {
      success: true,
      portfolio: userData.portfolios[portfolioIndex],
      ipfs: {
        usersCID: lastUsersCID,
        stored: !!ipfsNode
      }
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to update portfolio', message: error.message };
  }
});

// User wallet management endpoints
fastify.post('/api/users/:walletAddress', async (request, reply) => {
  try {
    const { walletAddress } = request.params;
    const userData = request.body;
    
    if (!walletAddress || !userData) {
      reply.code(400);
      return { error: 'Wallet address and user data required' };
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      reply.code(400);
      return { error: 'Invalid wallet address format' };
    }
    
    // Update user data cache - preserve existing portfolios
    const existingData = userDataCache[walletAddress] || {};
    userDataCache[walletAddress] = {
      ...existingData,
      ...userData,
      portfolios: userData.portfolios || existingData.portfolios || [],
      walletAddress,
      lastUpdated: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    // Store to IPFS if available
    if (ipfsNode) {
      try {
        lastUsersCID = await updateUserWallets(ipfsNode.fs, userDataCache);
        console.log(`👥 User data updated in IPFS: ${lastUsersCID}`);
        persistCacheToDisk(); // Save CID to disk
      } catch (e) {
        console.warn('⚠️ Failed to store user data to IPFS:', e.message);
      }
    }
    
    return {
      success: true,
      walletAddress,
      userData: userDataCache[walletAddress],
      ipfs: {
        usersCID: lastUsersCID,
        stored: !!ipfsNode
      }
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to store user data', message: error.message };
  }
});

// Portfolio management endpoints
fastify.post('/api/users/:walletAddress/portfolios', async (request, reply) => {
  try {
    const { walletAddress } = request.params;
    const portfolioData = request.body;
    
    if (!walletAddress || !portfolioData) {
      reply.code(400);
      return { error: 'Wallet address and portfolio data required' };
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      reply.code(400);
      return { error: 'Invalid wallet address format' };
    }
    
    // Initialize user data if not exists
    if (!userDataCache[walletAddress]) {
      userDataCache[walletAddress] = {
        walletAddress,
        portfolios: [],
        createdAt: new Date().toISOString()
      };
    }
    
    // Generate portfolio ID
    const portfolioId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create portfolio object
    const portfolio = {
      id: portfolioId,
      ...portfolioData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add portfolio to user's portfolios
    userDataCache[walletAddress].portfolios = userDataCache[walletAddress].portfolios || [];
    userDataCache[walletAddress].portfolios.push(portfolio);
    userDataCache[walletAddress].lastUpdated = new Date().toISOString();
    
    // Store to IPFS if available
    if (ipfsNode) {
      try {
        lastUsersCID = await updateUserWallets(ipfsNode.fs, userDataCache);
        console.log(`📁 Portfolio created and stored in IPFS: ${lastUsersCID}`);
        persistCacheToDisk();
      } catch (e) {
        console.warn('⚠️ Failed to store portfolio to IPFS:', e.message);
      }
    }
    
    return {
      success: true,
      portfolio,
      ipfs: {
        usersCID: lastUsersCID,
        stored: !!ipfsNode
      }
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to create portfolio', message: error.message };
  }
});

fastify.get('/api/users/:walletAddress/portfolios', async (request, reply) => {
  try {
    const { walletAddress } = request.params;
    
    // Check local cache first
    let userData = userDataCache[walletAddress];
    
    // If not in cache and we have IPFS CID, try to fetch from IPFS
    if (!userData && lastUsersCID && ipfsNode) {
      try {
        const ipfsUserData = await fetchJSON(ipfsNode.fs, lastUsersCID);
        userData = ipfsUserData[walletAddress];
        if (userData) {
          userDataCache[walletAddress] = userData;
        }
      } catch (e) {
        console.warn('Could not fetch user data from IPFS:', e.message);
      }
    }
    
    if (!userData) {
      return {
        success: true,
        portfolios: [],
        walletAddress
      };
    }
    
    return {
      success: true,
      portfolios: userData.portfolios || [],
      walletAddress
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to fetch portfolios', message: error.message };
  }
});

fastify.get('/api/users/:walletAddress/portfolios/:portfolioId', async (request, reply) => {
  try {
    const { walletAddress, portfolioId } = request.params;
    
    // Check local cache first
    let userData = userDataCache[walletAddress];
    
    // If not in cache and we have IPFS CID, try to fetch from IPFS
    if (!userData && lastUsersCID && ipfsNode) {
      try {
        const ipfsUserData = await fetchJSON(ipfsNode.fs, lastUsersCID);
        userData = ipfsUserData[walletAddress];
        if (userData) {
          userDataCache[walletAddress] = userData;
        }
      } catch (e) {
        console.warn('Could not fetch user data from IPFS:', e.message);
      }
    }
    
    if (!userData || !userData.portfolios) {
      reply.code(404);
      return { error: 'Portfolio not found' };
    }
    
    const portfolio = userData.portfolios.find(p => p.id === portfolioId);
    
    if (!portfolio) {
      reply.code(404);
      return { error: 'Portfolio not found' };
    }
    
    return {
      success: true,
      portfolio
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to fetch portfolio', message: error.message };
  }
});

fastify.put('/api/users/:walletAddress/portfolios/:portfolioId', async (request, reply) => {
  try {
    const { walletAddress, portfolioId } = request.params;
    const updates = request.body;
    
    if (!userDataCache[walletAddress] || !userDataCache[walletAddress].portfolios) {
      reply.code(404);
      return { error: 'Portfolio not found' };
    }
    
    const portfolioIndex = userDataCache[walletAddress].portfolios.findIndex(p => p.id === portfolioId);
    
    if (portfolioIndex === -1) {
      reply.code(404);
      return { error: 'Portfolio not found' };
    }
    
    // Update portfolio
    userDataCache[walletAddress].portfolios[portfolioIndex] = {
      ...userDataCache[walletAddress].portfolios[portfolioIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    userDataCache[walletAddress].lastUpdated = new Date().toISOString();
    
    // Store to IPFS if available
    if (ipfsNode) {
      try {
        lastUsersCID = await updateUserWallets(ipfsNode.fs, userDataCache);
        console.log(`📝 Portfolio updated in IPFS: ${lastUsersCID}`);
        persistCacheToDisk();
      } catch (e) {
        console.warn('⚠️ Failed to store portfolio update to IPFS:', e.message);
      }
    }
    
    return {
      success: true,
      portfolio: userDataCache[walletAddress].portfolios[portfolioIndex],
      ipfs: {
        usersCID: lastUsersCID,
        stored: !!ipfsNode
      }
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to update portfolio', message: error.message };
  }
});

fastify.get('/api/users/:walletAddress', async (request, reply) => {
  try {
    const { walletAddress } = request.params;
    
    // Check local cache first
    let userData = userDataCache[walletAddress];
    
    // If not in cache and we have IPFS CID, try to fetch from IPFS
    if (!userData && lastUsersCID && ipfsNode) {
      try {
        const ipfsUserData = await fetchJSON(ipfsNode.fs, lastUsersCID);
        userData = ipfsUserData[walletAddress];
        // Update local cache
        if (userData) {
          userDataCache[walletAddress] = userData;
        }
      } catch (e) {
        console.warn('Could not fetch user data from IPFS:', e.message);
      }
    }
    
    if (!userData) {
      reply.code(404);
      return { error: 'User not found', walletAddress };
    }
    
    return {
      success: true,
      walletAddress,
      userData,
      source: userDataCache[walletAddress] ? 'cache' : 'ipfs'
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to fetch user data', message: error.message };
  }
});

fastify.get('/api/users', async (request, reply) => {
  try {
    // Return all users from cache or IPFS
    let allUsers = { ...userDataCache };
    
    // If cache is empty and we have IPFS CID, try to fetch from IPFS
    if (Object.keys(allUsers).length === 0 && lastUsersCID && ipfsNode) {
      try {
        allUsers = await fetchJSON(ipfsNode.fs, lastUsersCID);
        // Update local cache
        userDataCache = { ...allUsers };
      } catch (e) {
        console.warn('Could not fetch users from IPFS:', e.message);
      }
    }
    
    return {
      success: true,
      users: allUsers,
      userCount: Object.keys(allUsers).filter(k => !k.startsWith('_')).length,
      ipfs: {
        usersCID: lastUsersCID,
        nodeActive: !!ipfsNode
      }
    };
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to fetch users', message: error.message };
  }
});

// Manual refresh endpoint for testing
fastify.post('/api/refresh', async (request, reply) => {
  console.log('🔄 Manual refresh triggered');
  
  try {
    // Store previous prices before fetching new ones
    previousPriceCache = { ...priceCache };
    
    const freshData = await fetchAllTokenPrices();
    if (Object.keys(freshData).length > 0) {
      priceCache = freshData;
      lastFetchTime = Date.now();
      
      // Count tokens with price changes
      const changedCount = Object.values(freshData).filter(data => 
        data.priceChangePercent !== null && Math.abs(data.priceChangePercent) > 0.01
      ).length;
      
      return {
        success: true,
        message: 'Prices refreshed successfully',
        tokenCount: Object.keys(freshData).length,
        priceChangesDetected: changedCount,
        timestamp: new Date().toISOString()
      };
    } else {
      reply.code(500);
      return {
        success: false,
        message: 'Failed to fetch any price data'
      };
    }
  } catch (error) {
    console.error('❌ Error in manual refresh:', error);
    reply.code(500);
    return {
      success: false,
      message: error.message
    };
  }
});

// Start server with automatic port fallback
const start = async () => {
  const PORT = process.env.PRICE_SERVER_PORT || 3001;
  
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Fastify price server running on http://localhost:${PORT}`);
    console.log('📊 Endpoints:');
    console.log(`   GET  /api/prices  - Unified batch price data`);
    console.log(`   GET  /api/health  - Server health check`);
    console.log(`   GET  /api/ping    - Ping endpoint (cold start prevention)`);
    console.log(`   POST /api/refresh - Manual price refresh`);
    console.log(`   POST /api/users/:walletAddress/portfolios - Create portfolio`);
    console.log(`   GET  /api/users/:walletAddress/portfolios - List portfolios`);
    console.log(`   GET  /api/users/:walletAddress/portfolios/:id - Get portfolio`);
    console.log(`   PUT  /api/users/:walletAddress/portfolios/:id - Update portfolio`);
    console.log('');
    
    // Start background fetching (immediate on startup)
    await startBackgroundFetching();
    
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${PORT} in use, trying ${PORT + 1}...`);
      try {
        await fastify.listen({ port: PORT + 1, host: '0.0.0.0' });
        console.log(`🚀 Fastify price server running on http://localhost:${PORT + 1}`);
        await startBackgroundFetching();
      } catch (fallbackErr) {
        console.error('❌ Failed to start server on fallback port:', fallbackErr);
        process.exit(1);
      }
    } else {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    }
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();