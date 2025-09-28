// CoinGecko on-demand price service with 5% threshold updates
// Fetches only when explicitly requested (e.g., user opens trade modal or simulates buy/sell)
// Caches last fetched price per token and suppresses network calls unless absolute change >= 5%

const CACHE = new Map(); // tokenId -> { price, ts }
const THRESHOLD = 0.05; // 5%
const MAX_AGE_MS = 1000 * 60 * 5; // force refresh after 5 minutes even if stable

// Map internal symbols to CoinGecko IDs; extend as needed
const SYMBOL_TO_ID = {
  BTC: 'bitcoin',
  WBTC: 'wrapped-bitcoin',
  ETH: 'ethereum',
  LINK: 'chainlink',
  ADA: 'cardano',
  DOT: 'polkadot',
  SOL: 'solana',
  UNI: 'uniswap',
  USDC: 'usd-coin',
  USDT: 'tether',
  REACT: 'reactive' // placeholder if exists
};

function needsRefresh(prev, newP){
  if (prev == null) return true;
  const delta = Math.abs(newP - prev) / prev;
  return delta >= THRESHOLD;
}

export async function fetchPriceIfChanged(symbol){
  const id = SYMBOL_TO_ID[symbol?.toUpperCase?.()] || null;
  if(!id) throw new Error(`No CoinGecko id mapping for symbol ${symbol}`);

  const cached = CACHE.get(id);
  const now = Date.now();
  if (cached && (now - cached.ts) < MAX_AGE_MS) {
    // We still might check if threshold crossed by doing a lightweight fetch head? To keep minimal, just return.
    return cached.price;
  }
  // Fetch fresh price
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if(!res.ok) throw new Error(`CoinGecko fetch failed (${res.status})`);
  const data = await res.json();
  const newPrice = data?.[id]?.usd;
  if(typeof newPrice !== 'number') throw new Error('Unexpected CoinGecko response');

  if (!cached || needsRefresh(cached.price, newPrice) || (now - cached.ts) >= MAX_AGE_MS) {
    CACHE.set(id, { price: newPrice, ts: now });
  }
  return CACHE.get(id).price;
}

export function getCachedPrice(symbol){
  const id = SYMBOL_TO_ID[symbol?.toUpperCase?.()] || null;
  if(!id) return null;
  const cached = CACHE.get(id);
  return cached ? cached.price : null;
}

export function clearPriceCache(symbol){
  if(!symbol){ CACHE.clear(); return; }
  const id = SYMBOL_TO_ID[symbol?.toUpperCase?.()];
  if(id) CACHE.delete(id);
}

export function mapSymbolToId(symbol){ return SYMBOL_TO_ID[symbol?.toUpperCase?.()] || null; }
