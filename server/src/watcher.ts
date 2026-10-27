import { liquidationEngineEventsAbi, type SomniaMarkets } from "@somnia-chain/markets-sdk";
import { decodeEventLog, encodeEventTopics, type Address, type PublicClient } from "viem";
import WebSocket from "ws";
import type { Db } from "./db.js";
import { metaGet, metaSet, one, withTx, withWriteLock } from "./db.js";
import type { MarketInfo } from "./discovery.js";
import { errText } from "./format.js";

type LogRow = {
  tx: string;
  logIndex: number;
  pool: string;
  account: string;
  side: "long" | "short";
  size: bigint;
  price: bigint;
  block: bigint;
};

function topic0(): `0x${string}` | null {
  const topics = encodeEventTopics({
    abi: liquidationEngineEventsAbi,
    eventName: "PositionLiquidated",
  });
  const first = topics[0];
  return typeof first === "string" ? first : null;
}

export async function pollLiquidations(
  ex: SomniaMarkets,
  client: PublicClient,
  db: Db,
  markets: readonly MarketInfo[],
  onRow: (row: LogRow & { predictedLiq: bigint | null; hit: boolean }) => void,
  cache: { address?: Address } = {},
): Promise<number> {
  if (markets.length === 0) return 0;
  const bank = markets[0]?.marginBank;
  if (!bank) return 0;
  let engine = cache.address;
  if (!engine) {
    try {
      const system = await ex.client.getPerpSystemConfig(bank);
      engine = system.liquidationEngine;
      cache.address = engine;
    } catch (err) {
      console.warn(`[watcher] system config: ${errText(err)}`);
      return 0;
    }
  }
  const head = await client.getBlockNumber();
  const stored = await metaGet(db, "liq_block");
  const from = stored ? BigInt(stored) + 1n : head > 400n ? head - 400n : 0n;
  if (from > head) return 0;
  const topic = topic0();
  if (!topic) return 0;
  const span = head - from;
  const step = span > 900n ? 900n : span;
  let cursor = from;
  let inserted = 0;
  const pools = new Map(markets.map((m) => [m.pool.toLowerCase(), m]));
  while (cursor <= head) {
    const to = cursor + step > head ? head : cursor + step;
    const logs = await client.getLogs({
      address: engine,
      fromBlock: cursor,
      toBlock: to,
    });
    for (const log of logs) {
      if (log.topics[0] !== topic) continue;
      try {
        const decoded = decodeEventLog({
          abi: liquidationEngineEventsAbi,
          data: log.data,
          topics: log.topics,
          eventName: "PositionLiquidated",
        });
        if (decoded.eventName !== "PositionLiquidated") continue;
        const args = decoded.args;
        const size = args.sizeDelta;
        const pool = String(args.perpPool);
        const account = String(args.account);
        const market = pools.get(pool.toLowerCase());
        const predicted = await lookupPredicted(db, pool, account);
        const known = await lookupSize(db, pool, account);
        const price = args.markPrice;
        const hit = predicted !== null && market
          ? within(price, predicted, market.tick)
          : false;
        const side: "long" | "short" = known !== null
          ? (known > 0n ? "long" : "short")
          : (size < 0n ? "long" : "short");
        const row: LogRow & { predictedLiq: bigint | null; hit: boolean } = {
          tx: log.transactionHash ?? "",
          logIndex: log.logIndex ?? 0,
          pool,
          account,
          side,
          size,
          price,
          block: log.blockNumber ?? 0n,
          predictedLiq: predicted,
          hit,
        };
        if (!row.tx) continue;
        if (await insertLiquidation(db, row)) {
          inserted += 1;
          onRow(row);
        }
      } catch (err) {
        console.warn(`[watcher] decode: ${errText(err)}`);
      }
    }
    cursor = to + 1n;
  }
  await metaSet(db, "liq_block", head.toString());
  return inserted;
}

function insertLiquidation(db: Db, row: LogRow & { predictedLiq: bigint | null; hit: boolean }): Promise<boolean> {
  return withWriteLock(() => withTx(db, async (client) => {
    const info = await client.query(
      `INSERT INTO liquidations
       (tx, log_index, pool, account, side, size, price, penalty, keeper, predicted_liq, predicted_hit, predicted_na, block, ts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, $8, $9, $10, $11, $12)
       ON CONFLICT (tx, log_index) DO NOTHING`,
      [
        row.tx,
        row.logIndex,
        row.pool,
        row.account,
        row.side,
        row.size.toString(),
        row.price.toString(),
        row.predictedLiq?.toString() ?? null,
        row.predictedLiq === null ? null : row.hit ? 1 : 0,
        row.predictedLiq === null ? 1 : 0,
        row.block.toString(),
        Math.floor(Date.now() / 1000),
      ],
    );
    if ((info.rowCount ?? 0) === 0) return false;
    await client.query("UPDATE accounts SET dirty = 1 WHERE account = $1", [row.account]);
    return true;
  }));
}

type FeedMode = "reactivity" | "polling";

type WatchLog = {
  address?: string;
  data?: `0x${string}`;
  topics?: `0x${string}`[];
  transactionHash?: `0x${string}`;
  logIndex?: `0x${string}` | number;
  blockNumber?: `0x${string}` | bigint;
};

export function watchLiquidations(
  wsUrl: string,
  engine: Address,
  db: Db,
  markets: () => readonly MarketInfo[],
  onRow: (row: LogRow & { predictedLiq: bigint | null; hit: boolean }) => void,
  onMode: (mode: FeedMode) => void,
): () => void {
  const topic = topic0();
  let socket: WebSocket | null = null;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    const next = new WebSocket(wsUrl);
    socket = next;
    next.on("open", () => {
      next.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_subscribe",
        params: ["somnia_watch", {
          address: engine,
          topics: topic ? [topic] : [],
          eth_calls: [],
        }],
      }));
    });
    next.on("message", (raw) => {
      void (async () => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          id?: number;
          result?: unknown;
          error?: { message?: string };
          method?: string;
          params?: { result?: unknown };
        };
        if (msg.id === 1) {
          if (typeof msg.result === "string") onMode("reactivity");
          else onMode("polling");
          if (msg.error) console.warn(`[watcher] somnia_watch: ${msg.error.message ?? "rejected"}`);
          return;
        }
        if (msg.method !== "eth_subscription") return;
        const log = asLog(msg.params?.result);
        if (!log || (topic && log.topics?.[0] !== topic)) return;
        const row = await decodeLiquidation(db, markets(), log);
        if (row && await insertLiquidation(db, row)) onRow(row);
      } catch (err) {
        console.warn(`[watcher] subscription: ${errText(err)}`);
      }
      })();
    });
    next.on("close", () => {
      onMode("polling");
      if (!closed) timer = setTimeout(connect, 5_000);
    });
    next.on("error", () => {
      onMode("polling");
    });
  };
  connect();
  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
    socket?.close();
  };
}

function asLog(value: unknown): WatchLog | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.data === "string" && Array.isArray(record.topics)) return record as WatchLog;
  if (record.log) return asLog(record.log);
  return null;
}

function hexBig(value: `0x${string}` | bigint | number | undefined): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  return 0n;
}

async function decodeLiquidation(
  db: Db,
  markets: readonly MarketInfo[],
  log: WatchLog,
): Promise<(LogRow & { predictedLiq: bigint | null; hit: boolean }) | null> {
  if (!log.data || !log.topics || !log.topics[0]) return null;
  const decoded = decodeEventLog({
    abi: liquidationEngineEventsAbi,
    data: log.data,
    topics: [log.topics[0], ...log.topics.slice(1)],
    eventName: "PositionLiquidated",
  });
  if (decoded.eventName !== "PositionLiquidated") return null;
  const args = decoded.args;
  const size = args.sizeDelta;
  const pool = String(args.perpPool);
  const account = String(args.account);
  const market = markets.find((item) => item.pool.toLowerCase() === pool.toLowerCase());
  const predicted = await lookupPredicted(db, pool, account);
  const known = await lookupSize(db, pool, account);
  const price = args.markPrice;
  const side: "long" | "short" = known !== null
    ? (known > 0n ? "long" : "short")
    : (size < 0n ? "long" : "short");
  const tx = log.transactionHash ?? "";
  if (!tx) return null;
  return {
    tx,
    logIndex: Number(hexBig(log.logIndex)),
    pool,
    account,
    side,
    size,
    price,
    block: hexBig(log.blockNumber),
    predictedLiq: predicted,
    hit: predicted !== null && market ? within(price, predicted, market.tick) : false,
  };
}

async function lookupSize(db: Db, pool: string, account: string): Promise<bigint | null> {
  const row = await one<{ size_signed: string }>(
    db,
    "SELECT size_signed FROM positions WHERE lower(pool) = lower($1) AND lower(account) = lower($2)",
    [pool, account],
  );
  if (!row) return null;
  return BigInt(row.size_signed);
}

async function lookupPredicted(db: Db, pool: string, account: string): Promise<bigint | null> {
  const row = await one<{ liq_price: string | null; liq_kind: string }>(
    db,
    "SELECT liq_price, liq_kind FROM positions WHERE lower(pool) = lower($1) AND lower(account) = lower($2)",
    [pool, account],
  );
  if (!row || row.liq_kind !== "finite" || !row.liq_price) return null;
  return BigInt(row.liq_price);
}

function within(price: bigint, predicted: bigint, tick: bigint): boolean {
  const tol = predicted / 200n > tick ? predicted / 200n : tick;
  const diff = price > predicted ? price - predicted : predicted - price;
  return diff <= tol;
}

export async function backfillLiquidations(ex: SomniaMarkets, db: Db): Promise<number> {
  const rows = await ex.client.listLiquidations({ kind: "PositionLiquidated", limit: 50 });
  let n = 0;
  for (const row of rows) {
    const parts = row.id.split("_");
    const logIndex = Number(parts[parts.length - 1] ?? 0);
    const size = row.size ? BigInt(row.size) : 0n;
    await db.query(
      `INSERT INTO liquidations
       (tx, log_index, pool, account, side, size, price, penalty, keeper, predicted_liq, predicted_hit, predicted_na, block, ts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL, NULL, 1, $9, $10)
       ON CONFLICT (tx, log_index) DO NOTHING`,
      [
        row.txHash,
        Number.isFinite(logIndex) ? logIndex : 0,
        row.pool,
        row.account,
        size >= 0n ? "long" : "short",
        row.size,
        row.price,
        row.penalty,
        row.blockNumber,
        Number(row.timestamp),
      ],
    );
    n += 1;
  }
  return n;
}
