import pg from "pg";
import { DATABASE_URL, DB_POOL_MAX, DIRECT_URL } from "./config.js";

export type Db = pg.Pool;

export type Sql = pg.Pool | pg.PoolClient;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS markets (
  pool TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  margin_bank TEXT NOT NULL,
  stop_registry TEXT,
  quote_token TEXT NOT NULL,
  tick TEXT NOT NULL,
  lot TEXT NOT NULL,
  min_qty TEXT NOT NULL,
  im_bps INTEGER NOT NULL,
  mm_bps INTEGER NOT NULL,
  one_base TEXT NOT NULL,
  quote_decimals INTEGER NOT NULL,
  mark TEXT,
  index_px TEXT,
  funding_rate TEXT,
  oi TEXT,
  next_funding_at BIGINT,
  feed_ok INTEGER NOT NULL DEFAULT 0,
  updated_block TEXT,
  updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS accounts (
  account TEXT PRIMARY KEY,
  margin_bank TEXT NOT NULL,
  equity TEXT,
  mm_req TEXT,
  im_req TEXT,
  cm_req TEXT,
  status TEXT,
  markets_count INTEGER NOT NULL DEFAULT 0,
  is_demo_bot INTEGER NOT NULL DEFAULT 0,
  updated_block TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS positions (
  pool TEXT NOT NULL,
  account TEXT NOT NULL,
  size_signed TEXT NOT NULL,
  entry TEXT NOT NULL,
  liq_price TEXT,
  liq_kind TEXT NOT NULL,
  updated_block TEXT,
  PRIMARY KEY (pool, account)
);
CREATE TABLE IF NOT EXISTS buckets (
  pool TEXT NOT NULL,
  side TEXT NOT NULL,
  price_lo TEXT NOT NULL,
  price_hi TEXT NOT NULL,
  notional TEXT NOT NULL,
  count INTEGER NOT NULL,
  top_accounts_json TEXT NOT NULL,
  computed_at BIGINT NOT NULL,
  PRIMARY KEY (pool, side, price_lo)
);
CREATE TABLE IF NOT EXISTS liquidations (
  tx TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  pool TEXT,
  account TEXT,
  side TEXT,
  size TEXT,
  price TEXT,
  penalty TEXT,
  keeper TEXT,
  predicted_liq TEXT,
  predicted_hit INTEGER,
  predicted_na INTEGER NOT NULL DEFAULT 0,
  block TEXT,
  ts BIGINT,
  PRIMARY KEY (tx, log_index)
);
CREATE TABLE IF NOT EXISTS alerts (
  chat_id TEXT NOT NULL,
  account TEXT NOT NULL,
  threshold_pct DOUBLE PRECISION NOT NULL,
  last_sent_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (chat_id, account)
);
CREATE TABLE IF NOT EXISTS app_orders (
  tx TEXT PRIMARY KEY,
  account TEXT,
  pool TEXT,
  kind TEXT NOT NULL,
  params_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS watch_codes (
  code TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS positions_account ON positions(account);
CREATE INDEX IF NOT EXISTS liquidations_ts ON liquidations(ts);
`;

pg.types.setTypeParser(20, (value) => Number(value));

export async function openDb(): Promise<Db> {
  const client = new pg.Client({ connectionString: DIRECT_URL });
  await client.connect();
  try {
    await client.query(SCHEMA);
  } finally {
    await client.end();
  }
  return new pg.Pool({ connectionString: DATABASE_URL, max: DB_POOL_MAX });
}

export async function metaGet(db: Sql, key: string): Promise<string | null> {
  const row = await one<{ v: string }>(db, "SELECT v FROM meta WHERE k = $1", [key]);
  return row?.v ?? null;
}

export async function metaSet(db: Sql, key: string, value: string): Promise<void> {
  await db.query(
    "INSERT INTO meta (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v",
    [key, value],
  );
}

export async function one<T extends pg.QueryResultRow>(
  db: Sql,
  text: string,
  values: unknown[] = [],
): Promise<T | undefined> {
  const result = await db.query<T>(text, values);
  return result.rows[0];
}

export async function many<T extends pg.QueryResultRow>(
  db: Sql,
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await db.query<T>(text, values);
  return result.rows;
}

const CHUNK = 500;

export async function insertChunks(
  db: Sql,
  insertSql: string,
  rows: readonly (readonly unknown[])[],
  suffix = "",
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += CHUNK) {
    const chunk = rows.slice(offset, offset + CHUNK);
    const values: unknown[] = [];
    const groups = chunk.map((row) => {
      const slots = row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${slots.join(", ")})`;
    });
    await db.query(`${insertSql} ${groups.join(", ")}${suffix}`, values);
  }
}

export async function withTx<T>(db: Db, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The connection is already unusable.
    }
    throw err;
  } finally {
    client.release();
  }
}

let writeTail: Promise<void> = Promise.resolve();

export function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeTail.then(fn, fn);
  writeTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
