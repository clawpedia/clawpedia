import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

// Parse connection string and add SSL compatibility for DigitalOcean
const connectionString = config.databaseUrl.includes('uselibpqcompat')
  ? config.databaseUrl
  : config.databaseUrl.replace('sslmode=require', 'sslmode=require&uselibpqcompat=true');

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.isDev) {
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
  }
  return result;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}
