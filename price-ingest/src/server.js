import Fastify from 'fastify';
import cors from 'fastify-cors';
import { CONFIG } from './config.js';
import { ensureSchema, getClient } from './clickhouse.js';
import { ingestTick, flushCandles } from './aggregator.js';
import { z } from 'zod';

const fastify = Fastify({ logger: { transport: { target: 'pino-pretty' } } });
fastify.register(cors, { origin: true });

await ensureSchema();
const ch = getClient();

const tickSchema = z.object({
  token_address: z.string().length(42),
  symbol: z.string().max(16),
  price: z.number().positive(),
  source: z.enum(['uniswap','fallback']).default('uniswap'),
  liquidity: z.number().nonnegative().optional(),
  pool_fee: z.number().int().nonnegative().optional(),
  ts: z.number().int().optional() // ms epoch client time
});

fastify.post('/tick', async (req, reply) => {
  if (CONFIG.authToken && req.headers['x-auth-token'] !== CONFIG.authToken) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  let parsed;
  try { parsed = tickSchema.parse(req.body); } catch (e) { return reply.code(400).send({ error: e.message }); }
  const event_time = new Date(parsed.ts || Date.now());
  const row = { ...parsed, event_time };
  if (CONFIG.writeEnabled) {
    await ch.insert({
      table: 'raw_ticks',
      values: [{
        token_address: row.token_address,
        symbol: row.symbol,
        event_time: event_time.toISOString().replace('T',' ').substring(0,23),
        price: row.price,
        source: row.source,
        liquidity: row.liquidity || 0,
        pool_fee: row.pool_fee || 3000
      }],
      format: 'JSONEachRow'
    });
    ingestTick(row);
  }
  reply.code(202).send({ accepted: true });
});

fastify.get('/health', async () => ({ status: 'ok' }));

// Background flush loop
setInterval(async () => {
  try {
    const res = await flushCandles();
    if (res.written) fastify.log.info(`Flushed ${res.written} candles`);
  } catch (e) {
    fastify.log.error(e, 'flush error');
  }
}, 20000);

fastify.listen({ port: CONFIG.port, host: '0.0.0.0' }).then(addr => {
  fastify.log.info(`Ingest service listening on ${addr}`);
}).catch(err => {
  fastify.log.error(err);
  process.exit(1);
});
