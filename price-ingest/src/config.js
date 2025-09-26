import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  port: parseInt(process.env.INGEST_PORT || '4010', 10),
  clickhouseUrl: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  clickhouseUser: process.env.CLICKHOUSE_USER || 'default',
  clickhousePassword: process.env.CLICKHOUSE_PASSWORD || '',
  authToken: process.env.INGEST_AUTH_TOKEN || '',
  writeEnabled: (process.env.WRITE_ENABLED || 'true') === 'true'
};
