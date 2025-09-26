// Simple in-process 1m candle aggregator; production would use MV or stream processor.
import { getClient } from './clickhouse.js';

const minuteBuckets = new Map(); // key: token_address|bucketStart -> candle obj

export function ingestTick(tick) {
  const bucket = toMinuteBucket(tick.event_time);
  const key = `${tick.token_address}|${bucket}`;
  let candle = minuteBuckets.get(key);
  if (!candle) {
    candle = {
      token_address: tick.token_address,
      symbol: tick.symbol,
      bucket_start: bucket,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume_usd: tick.liquidity || 0,
      trades: 1,
      dirty: true
    };
    minuteBuckets.set(key, candle);
  } else {
    candle.high = candle.high < tick.price ? tick.price : candle.high;
    candle.low = candle.low > tick.price ? tick.price : candle.low;
    candle.close = tick.price;
    candle.volume_usd += tick.liquidity || 0;
    candle.trades += 1;
    candle.dirty = true;
  }
}

export async function flushCandles() {
  const ch = getClient();
  const toWrite = [];
  for (const [key, c] of minuteBuckets.entries()) {
    // Only persist finished buckets (older than 70s)
    if (Date.now() - c.bucket_start.getTime()*1 - 70000 > 0 && c.dirty) {
      toWrite.push(c);
      c.dirty = false;
    }
  }
  if (!toWrite.length) return { written: 0 };
  const rows = toWrite.map(c => ({
    token_address: c.token_address,
    symbol: c.symbol,
    bucket_start: c.bucket_start.toISOString().replace('T',' ').substring(0,19),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume_usd: c.volume_usd,
    trades: c.trades
  }));
  await ch.insert({
    table: 'candles_1m',
    values: rows,
    format: 'JSONEachRow'
  });
  return { written: rows.length };
}

function toMinuteBucket(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), 0, 0));
}
