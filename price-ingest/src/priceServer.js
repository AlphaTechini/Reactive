// Unified price endpoint using tokenConfig.js
import express from 'express';
import cors from 'cors';
import { parseTokenConfig, buildBatchPriceUrl } from './tokenConfig.js';

const app = express();
const PORT = process.env.PRICE_SERVER_PORT || 3001;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://reactive-14w1.vercel.app/', 'reactive.cyberpunk.work'],
  credentials: true
}));

app.use(express.json());

// Cache for price data
let priceCache = {};
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Unified price endpoint
app.get('/api/prices', async (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (now - lastFetchTime < CACHE_DURATION && Object.keys(priceCache).length > 0) {
      console.log('Returning cached price data');
      return res.json(priceCache);
    }
    
    // Fetch fresh prices from FreeCryptoAPI
    console.log('Fetching fresh price data...');
    const batchUrl = buildBatchPriceUrl();
    
    const response = await fetch(batchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ReactivePortfolio/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`FreeCryptoAPI returned ${response.status}: ${response.statusText}`);
    }
    
    const rawData = await response.json();
    console.log('Raw API response:', Object.keys(rawData));
    
    // Transform API response to our expected format
    const { symbols } = parseTokenConfig();
    const transformedData = {};
    const timestamp = now;
    
    for (const [symbol, address] of Object.entries(symbols)) {
      const apiData = rawData[symbol] || rawData[symbol.toLowerCase()];
      
      if (apiData && typeof apiData.price === 'number') {
        transformedData[symbol] = {
          address: address,
          priceUSD: apiData.price,
          ts: timestamp
        };
      } else {
        transformedData[symbol] = {
          address: address,
          priceUSD: null,
          sourceError: 'No data returned from provider',
          ts: timestamp
        };
      }
    }
    
    // Update cache
    priceCache = transformedData;
    lastFetchTime = now;
    
    console.log(`Updated ${Object.keys(transformedData).length} token prices`);
    res.json(transformedData);
    
  } catch (error) {
    console.error('Price fetch error:', error);
    
    // Return cached data if available, otherwise error
    if (Object.keys(priceCache).length > 0) {
      console.log('Returning stale cached data due to error');
      res.json(priceCache);
    } else {
      res.status(500).json({
        error: 'Failed to fetch price data',
        message: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    cacheAge: Date.now() - lastFetchTime,
    cachedTokens: Object.keys(priceCache).length,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Price server running on http://localhost:${PORT}`);
  console.log('📊 Endpoints:');
  console.log(`   GET /api/prices - Unified batch price data`);
  console.log(`   GET /api/health - Server health check`);
});