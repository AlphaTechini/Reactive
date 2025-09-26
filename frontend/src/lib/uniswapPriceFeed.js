// uniswapPriceFeed.js
// Fetches live & historical price data (candlesticks) from Uniswap (Subgraph/API) with contract fallback.
// Display-first philosophy: we DO NOT store on-chain before showing to user.

import { contractService } from './contractService.js';

// Default Uniswap V3 Subgraph (Ethereum). For Reactive Network you must supply a compatible subgraph endpoint.
const DEFAULT_SUBGRAPH = import.meta.env?.VITE_UNISWAP_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

// Quote token (USDC) – must match deployed token address on Reactive Network.
// Placeholder; replace with real USDC address on Reactive.
export const USDC_ADDRESS = '0x0000000000000000000000000000000000001001';

// Timeframe configurations (seconds per candle & lookback count)
export const TIMEFRAMES = {
  '1m': { seconds: 60,   candles: 120 },
  '5m': { seconds: 300,  candles: 288 },
  '15m': { seconds: 900, candles: 192 },
  '1h': { seconds: 3600, candles: 168 },
  '4h': { seconds: 14400, candles: 180 },
  '1d': { seconds: 86400, candles: 120 }
};

class UniswapPriceFeed {
  constructor() {
    this.cache = new Map(); // key: token|timeframe => { candles, ts }
    this.cacheTTL = 30 * 1000; // 30s per refresh for latest segment
    this.inFlight = new Map();
    // LRU for super-fast recent timeframe reuse (keeps last N tokens * timeframes in memory)
    this.lruOrder = [];
    this.maxEntries = 100; // adjustable cache size
  }

  _cacheKey(token, timeframe) { return `${token.toLowerCase()}|${timeframe}`; }

  async getCandles(tokenAddress, timeframe = '1h') {
    const key = this._cacheKey(tokenAddress, timeframe);
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && (now - cached.ts) < this.cacheTTL) {
      this._touch(key);
      return cached.candles;
    }
    // Avoid duplicate parallel fetches
    if (this.inFlight.has(key)) return this.inFlight.get(key);
    const p = this._fetchCandles(tokenAddress, timeframe)
      .then(candles => {
        this.cache.set(key, { candles, ts: Date.now() });
        this._touch(key);
        this._evictIfNeeded();
        this.inFlight.delete(key);
        return candles;
      })
      .catch(err => { this.inFlight.delete(key); throw err; });
    this.inFlight.set(key, p);
    return p;
  }

  _touch(key) {
    const idx = this.lruOrder.indexOf(key);
    if (idx !== -1) this.lruOrder.splice(idx, 1);
    this.lruOrder.push(key);
  }

  _evictIfNeeded() {
    while (this.lruOrder.length > this.maxEntries) {
      const oldest = this.lruOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }
  }

  async _fetchCandles(tokenAddress, timeframe) {
    const cfg = TIMEFRAMES[timeframe] || TIMEFRAMES['1h'];
    const period = cfg.seconds;
    const count = cfg.candles;
    // We attempt subgraph aggregated data via swaps or tokenDayData/hourData fallback.
    // For simplicity we query hour or day data depending on timeframe granularity.
    const useDay = period >= 86400;
    const entity = useDay ? 'tokenDayDatas' : 'tokenHourDatas';
    const first = Math.min(count, 1000); // subgraph query limit consideration

    // GraphQL query (NOTE: This is Ethereum mainnet oriented; adapt indexing for Reactive Network)
    const query = `query TokenCandles($token: String!, $first: Int!) {\n  ${entity}(first: $first, orderBy: periodStartUnix, orderDirection: desc, where: { token: $token }) {\n    periodStartUnix\n    open\n    high\n    low\n    close\n    volumeUSD\n  }\n}`;

    try {
      const resp = await fetch(DEFAULT_SUBGRAPH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { token: tokenAddress.toLowerCase(), first } })
      });
      if (!resp.ok) throw new Error(`Subgraph HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
      const raw = json.data?.[entity] || [];
      if (!raw.length) return this._fallbackSynthetic(tokenAddress, timeframe);
      // Convert descending -> ascending & normalize numeric
      const candles = raw.sort((a,b)=>a.periodStartUnix-b.periodStartUnix).map(r => ({
        time: r.periodStartUnix * 1000,
        open: Number(r.open || r.close || 0),
        high: Number(r.high || r.close || 0),
        low: Number(r.low || r.close || 0),
        close: Number(r.close || 0),
        volumeUSD: Number(r.volumeUSD || 0)
      }));
      return candles.slice(-count);
    } catch (err) {
      console.warn('Subgraph candle fetch failed, using fallback:', err.message);
      return this._fallbackSynthetic(tokenAddress, timeframe);
    }
  }

  async getLatestPrice(tokenAddress) {
    // Attempt to use most recent candle close; fallback to contract slot0 price call
    try {
      const candles = await this.getCandles(tokenAddress, '1h');
      if (candles.length) return candles[candles.length - 1].close;
    } catch {}
    // Fallback: contract price (slot0 route) – expects contractService initialized
    try {
      await contractService.initialize();
      const priceBN = await contractService.contract.getTokenPrice(tokenAddress);
      // ethers may not be globally imported here; dynamic import for formatting
      const { ethers } = await import('ethers');
      return parseFloat(ethers.formatEther(priceBN));
    } catch (e) {
      console.error('Fallback contract price failed:', e.message);
      return null;
    }
  }

  _fallbackSynthetic(tokenAddress, timeframe) {
    // Synthetic random walk for development when API absent
    const cfg = TIMEFRAMES[timeframe] || TIMEFRAMES['1h'];
    const now = Date.now();
    const base = 100 + (tokenAddress.charCodeAt(2) % 50); // pseudo base
    const candles = [];
    let last = base;
    for (let i = cfg.candles; i > 0; i--) {
      const t = now - i * cfg.seconds * 1000;
      const drift = (Math.random() - 0.5) * 0.02; // ±2%
      const open = last;
      const close = open * (1 + drift);
      const high = Math.max(open, close) * (1 + Math.random()*0.005);
      const low = Math.min(open, close) * (1 - Math.random()*0.005);
      candles.push({ time: t, open, high, low, close, volumeUSD: Math.random()*1000 });
      last = close;
    }
    return candles;
  }
}

export const uniswapPriceFeed = new UniswapPriceFeed();
export default uniswapPriceFeed;