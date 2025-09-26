import { createClient } from '@clickhouse/client';
import { CONFIG } from './config.js';

let client;

export function getClient() {
  if (!client) {
    client = createClient({
      host: CONFIG.clickhouseUrl,
      username: CONFIG.clickhouseUser,
      password: CONFIG.clickhousePassword
    });
  }
  return client;
}

export async function ensureSchema() {
  const ch = getClient();
  // raw ticks table
  await ch.command({
    query: `CREATE TABLE IF NOT EXISTS raw_ticks (
      token_address FixedString(42),
      symbol LowCardinality(String),
      event_time DateTime64(3, 'UTC'),
      price Decimal(18,8),
      source Enum8('uniswap'=1,'fallback'=2),
      liquidity Decimal(18,4),
      pool_fee UInt16,
      received_at DateTime DEFAULT now()
    ) ENGINE=MergeTree
    PARTITION BY toDate(event_time)
    ORDER BY (token_address, event_time)
    TTL event_time + INTERVAL 7 DAY` });

  // 1m candles (to be filled by app-level aggregation initially)
  await ch.command({
    query: `CREATE TABLE IF NOT EXISTS candles_1m (
      token_address FixedString(42),
      symbol LowCardinality(String),
      bucket_start DateTime('UTC'),
      open Decimal(18,8),
      high Decimal(18,8),
      low Decimal(18,8),
      close Decimal(18,8),
      volume_usd Decimal(24,4),
      trades UInt32,
      updated_at DateTime DEFAULT now()
    ) ENGINE=ReplacingMergeTree(updated_at)
    PARTITION BY toDate(bucket_start)
    ORDER BY (token_address, bucket_start)
    TTL bucket_start + INTERVAL 90 DAY` });
}
