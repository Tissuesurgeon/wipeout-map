import type { Address, Hex } from "viem";
import { getAddress, isAddress } from "viem";
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { buildHeatmap, type Bucket, type Cluster, type Zone } from "./buckets.js";
import { markMoved } from "./zones.js";
import { createExchange, MARK_INTERVAL_MS, NEAR_LIQ_INTERVAL_MS, NEAR_LIQ_PCT, SWEEP_INTERVAL_MS, WS_URL } from "./config.js";
import type { Db } from "./db.js";
import { insertChunks, many, one, withTx, withWriteLock, type Sql } from "./db.js";
import { discoverMarkets, sweepHolders, uniqueAccounts, type HolderRef, type MarketInfo } from "./discovery.js";
import { dec, errText, isTimeout, sleep, unitDigits } from "./format.js";
import { groupByBank, readHealth, readPositions, type HealthRow, type PositionRow } from "./health.js";
import { distancePct, liquidationPrice, marginRatio, riskStatus } from "./liqmath.js";
import { backfillLiquidations, pollLiquidations, watchLiquidations } from "./watcher.js";

export type Hub = {
  broadcast: (message: unknown) => void;
};

type StoredPosition = {
  pool: string;
  account: string;
  size_signed: string;
  entry: string;
  liq_price: string | null;
  liq_kind: string;
};

type StoredAccount = {
  account: string;
  equity: string | null;
  mm_req: string | null;
  im_req: string | null;
  cm_req: string | null;
  status: string | null;
  markets_count: number;
};

export type Engine = {
  ex: SomniaMarkets;
  ready: boolean;
  sweeping: boolean;
  markets: MarketInfo[];
  block: bigint;
  lastSweepMs: number;
  feedMode: "reactivity" | "polling";
  accountView: (address: string) => Promise<unknown>;
  preview: (body: PreviewBody) => Promise<unknown>;
  recordOrder: (body: OrderBody) => Promise<void>;
  stop: () => void;
};

type PreviewBody = {
  pool: string;
  account: string;
  isBid: boolean;
  quantity: string;
  price: string;
};

type OrderBody = {
  tx: string;
  account?: string;
  pool?: string;
  kind: string;
  params: unknown;
  status?: string;
};

export function startEngine(db: Db, hub: Hub): Engine {
  const ex = createExchange();
  const engine: Engine = {
    ex,
    ready: false,
    sweeping: false,
    markets: [],
    block: 0n,
    lastSweepMs: 0,
    feedMode: "polling",
    accountView: (address) => accountView(db, ex, engine, address),
    preview: (body) => preview(ex, body),
    recordOrder: (body) => acceptOrder(db, ex, body),
    stop: () => {},
  };

  void run(db, hub, engine);
  return engine;
}

async function run(db: Db, hub: Hub, engine: Engine): Promise<void> {
  let stopped = false;
  let stopWatch: (() => void) | null = null;
  engine.stop = () => {
    stopped = true;
    stopWatch?.();
  };
  const client = engine.ex.client.getViemClient();
  try {
    engine.markets = await discoverMarkets(engine.ex);
    console.log(`[engine] ${engine.markets.length} perp markets`);
    await persistMarkets(db, engine.markets);
    try {
      const n = await Promise.race([
        backfillLiquidations(engine.ex, db),
        sleep(15_000).then(() => {
          throw new Error("liquidation backfill timed out");
        }),
      ]);
      console.log(`[engine] backfilled ${n} liquidation rows`);
    } catch (err) {
      console.warn(`[engine] liquidation backfill skipped: ${errText(err)}`);
    }
  } catch (err) {
    console.error(`[engine] discovery failed: ${errText(err)}`);
  }

  let nextSweep = 0;
  const booked = await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM positions");
  if ((booked?.n ?? 0) > 0) {
    nextSweep = Date.now() + SWEEP_INTERVAL_MS;
    engine.ready = true;
  }
  let nextNear = Date.now() + NEAR_LIQ_INTERVAL_MS;
  let nextWatch = 0;
  let nextPoll = 0;
  let nextDrain = 0;
  let rpcPauseUntil = 0;
  const liqEngine: { address?: Address } = {};
  let watchStarting = false;
  const onLiquidation = (row: {
    tx: string;
    logIndex: number;
    pool: string;
    account: string;
    side: "long" | "short";
    size: bigint;
    price: bigint;
    block: bigint;
    predictedLiq: bigint | null;
    hit: boolean;
  }) => {
    const market = engine.markets.find((m) => m.pool.toLowerCase() === row.pool.toLowerCase());
    hub.broadcast({
      type: "liquidation",
      tx: row.tx,
      logIndex: row.logIndex,
      symbol: market?.symbol ?? row.pool,
      pool: row.pool,
      account: row.account,
      side: row.side,
      size: market ? dec(row.size < 0n ? -row.size : row.size, unitDigits(market.oneBase)) : row.size.toString(),
      price: market ? dec(row.price, market.quoteDecimals) : row.price.toString(),
      predictedLiq: row.predictedLiq && market ? dec(row.predictedLiq, market.quoteDecimals) : null,
      hit: row.hit,
      block: row.block.toString(),
    });
  };
  for (;;) {
    if (stopped) return;
    const started = Date.now();
    try {
      if (engine.markets.length === 0) {
        engine.markets = await discoverMarkets(engine.ex);
        if (engine.markets.length > 0) {
          console.log(`[engine] ${engine.markets.length} perp markets`);
          await persistMarkets(db, engine.markets);
          if (!engine.ready) nextSweep = 0;
        }
      }
      if (engine.markets.length === 0) {
        await new Promise((r) => setTimeout(r, 5_000));
        continue;
      }
      if (Date.now() < rpcPauseUntil) {
        await sleep(1_000);
        continue;
      }
      if (engine.sweeping) {
        await sleep(2_000);
        continue;
      }
      if (!stopWatch && !watchStarting && Date.now() >= nextWatch) {
        watchStarting = true;
        const bank = engine.markets[0]?.marginBank;
        void (async () => {
          try {
            if (!bank) throw new Error("no margin bank");
            const system = await Promise.race([
              engine.ex.client.getPerpSystemConfig(bank),
              sleep(8_000).then(() => {
                throw new Error("system config timed out");
              }),
            ]);
            stopWatch = watchLiquidations(WS_URL, system.liquidationEngine, db, () => engine.markets, onLiquidation, (mode) => {
              engine.feedMode = mode;
              console.log(`[engine] feed ${mode}`);
              hub.broadcast({ type: "feed_mode", mode });
            });
          } catch (err) {
            nextWatch = Date.now() + 15_000;
          console.warn(`[engine] somnia_watch: ${errText(err)}`);
          engine.feedMode = "polling";
          hub.broadcast({ type: "feed_mode", mode: "polling" });
          } finally {
            watchStarting = false;
          }
        })();
      }
      if (Date.now() >= nextSweep && !engine.sweeping) {
        engine.sweeping = true;
        const sweepStarted = Date.now();
        hub.broadcast({ type: "status", ready: engine.ready, sweeping: true, markets: engine.markets.length });
        void fullSweep(db, hub, engine).then(() => {
          engine.lastSweepMs = Date.now() - sweepStarted;
          engine.ready = true;
          nextSweep = Date.now() + SWEEP_INTERVAL_MS;
          console.log(`[engine] sweep ${engine.lastSweepMs}ms`);
          hub.broadcast({ type: "status", ready: true, sweeping: false, markets: engine.markets.length });
        }).catch((err) => {
          console.error(`[engine] sweep: ${errText(err)}`);
          nextSweep = Date.now() + 60_000;
          if (isTimeout(err)) rpcPauseUntil = Date.now() + 20_000;
        }).finally(() => {
          engine.sweeping = false;
        });
        await sleep(1_000);
        continue;
      }
      const timedOut = await refreshMarks(db, hub, engine);
      if (timedOut) {
        rpcPauseUntil = Date.now() + 20_000;
        await sleep(1_000);
        continue;
      }
      if (!zoneBusy && Date.now() >= nextDrain) {
        nextDrain = Date.now() + 20_000;
        if (await drainDirty(db, engine, 2)) zonesDirty = true;
      }
      if (zonesDirty && scheduleZones(db, hub, engine)) zonesDirty = false;
      if (Date.now() >= nextNear && !nearBusy) {
        nextNear = Date.now() + NEAR_LIQ_INTERVAL_MS;
        nearBusy = true;
        void refreshNear(db, engine).catch((err) => {
          console.warn(`[engine] near scan: ${errText(err)}`);
        }).finally(() => {
          nearBusy = false;
        });
      }
      let inserted = 0;
      if (Date.now() >= nextPoll) {
        nextPoll = Date.now() + 15_000;
        try {
          inserted = await Promise.race([
            pollLiquidations(engine.ex, client, db, engine.markets, onLiquidation, liqEngine),
            sleep(8_000).then(() => {
              throw new Error("liquidation poll timed out");
            }),
          ]);
        } catch (err) {
          console.warn(`[engine] liquidation poll skipped: ${errText(err)}`);
        }
      }
      if (inserted > 0) await drainDirty(db, engine, inserted);
      await checkAlerts(db, hub, engine);
    } catch (err) {
      console.error(`[engine] tick: ${errText(err)}`);
    }
    const elapsed = Date.now() - started;
    await new Promise((r) => setTimeout(r, Math.max(200, MARK_INTERVAL_MS - elapsed)));
  }
}

async function persistMarkets(db: Db, markets: readonly MarketInfo[]): Promise<void> {
  const now = Date.now();
  await withTx(db, async (client) => {
    for (const market of markets) {
      await client.query(
        `INSERT INTO markets (pool, symbol, margin_bank, stop_registry, quote_token, tick, lot, min_qty, im_bps, mm_bps, one_base, quote_decimals, feed_ok, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13)
         ON CONFLICT (pool) DO UPDATE SET
           symbol = EXCLUDED.symbol, margin_bank = EXCLUDED.margin_bank, stop_registry = EXCLUDED.stop_registry,
           quote_token = EXCLUDED.quote_token, tick = EXCLUDED.tick, lot = EXCLUDED.lot, min_qty = EXCLUDED.min_qty,
           im_bps = EXCLUDED.im_bps, mm_bps = EXCLUDED.mm_bps, one_base = EXCLUDED.one_base, quote_decimals = EXCLUDED.quote_decimals`,
        [
          market.pool,
          market.symbol,
          market.marginBank,
          market.stopRegistry,
          market.quoteToken,
          market.tick.toString(),
          market.lot.toString(),
          market.minQty.toString(),
          market.imBps,
          Number(market.mmBps),
          market.oneBase.toString(),
          market.quoteDecimals,
          now,
        ],
      );
    }
  });
}

async function fullSweep(db: Db, hub: Hub, engine: Engine): Promise<void> {
  const client = engine.ex.client.getViemClient();
  const { holders, asOfBlock } = await sweepHolders(engine.ex, engine.markets);
  engine.block = asOfBlock;
  const byBank = groupByBank(engine.markets);
  const positions: PositionRow[] = [];
  const health: HealthRow[] = [];
  for (const [bank, markets] of byBank) {
    const pools = new Set(markets.map((m) => m.pool));
    const mine = holders.filter((h) => pools.has(h.pool));
    const accounts = uniqueAccounts(mine);
    console.log(`[engine] ${markets[0]?.symbol ?? bank} bank: ${accounts.length} accounts, ${mine.length} positions`);
    health.push(...(await readHealth(client, bank, accounts)));
    console.log(`[engine] ${markets[0]?.symbol ?? bank} health ${health.length}`);
    positions.push(...(await readPositions(client, bank, mine)));
    console.log(`[engine] positions read ${positions.length}`);
  }
  await refreshMarks(db, hub, engine, false, true);
  const markOf = new Map(engine.markets.map((m) => [m.pool, m]));
  await withWriteLock(async () => {
    await writeBook(db, engine, holders, health, positions, markOf);
    await recomputeLocal(db, engine);
    await publishBuckets(db, hub, engine);
  });
}

async function writeBook(
  db: Db,
  engine: Engine,
  holders: readonly HolderRef[],
  health: readonly HealthRow[],
  positions: readonly PositionRow[],
  markets: Map<string, MarketInfo>,
): Promise<void> {
  const counts = new Map<string, number>();
  for (const position of positions) {
    counts.set(position.account, (counts.get(position.account) ?? 0) + 1);
  }
  const now = Date.now();
  const healthByAccount = new Map(health.map((row) => [row.account, row]));
  await withTx(db, async (client) => {
    const seen = new Set(positions.map((p) => `${p.pool}:${p.account}`));
    const existing = await many<{ pool: string; account: string }>(client, "SELECT pool, account FROM positions");
    for (const row of existing) {
      if (!seen.has(`${getAddress(row.pool)}:${getAddress(row.account)}`) && !seen.has(`${row.pool}:${row.account}`)) {
        await client.query("DELETE FROM positions WHERE pool = $1 AND account = $2", [row.pool, row.account]);
      }
    }
    await insertChunks(
      client,
      `INSERT INTO accounts (account, margin_bank, equity, mm_req, im_req, cm_req, status, markets_count, is_demo_bot, updated_block, dirty, updated_at)
       VALUES`,
      health.map((row) => [
        row.account,
        row.marginBank,
        row.equity.toString(),
        row.mmReq.toString(),
        row.imReq.toString(),
        row.cmReq.toString(),
        row.status,
        counts.get(row.account) ?? 0,
        0,
        engine.block.toString(),
        0,
        now,
      ]),
      ` ON CONFLICT (account) DO UPDATE SET
         margin_bank = EXCLUDED.margin_bank, equity = EXCLUDED.equity, mm_req = EXCLUDED.mm_req,
         im_req = EXCLUDED.im_req, cm_req = EXCLUDED.cm_req, status = EXCLUDED.status,
         markets_count = EXCLUDED.markets_count, updated_block = EXCLUDED.updated_block, dirty = 0, updated_at = EXCLUDED.updated_at`,
    );
    const marks = new Map<string, bigint>();
    const positionRows: unknown[][] = [];
    for (const position of positions) {
      const market = markets.get(position.pool);
      const account = healthByAccount.get(position.account);
      let mark = marks.get(position.pool);
      if (mark === undefined) {
        mark = await marketMark(client, position.pool);
        marks.set(position.pool, mark);
      }
      const solved = market && account && mark > 0n
        ? liquidationPrice({
            equity: account.equity,
            mmReq: account.mmReq,
            size: position.size,
            markPrice: mark,
            maintenanceMarginBps: market.mmBps,
            oneBase: market.oneBase,
          })
        : { liqPrice: 0n, kind: "unreachable" as const };
      positionRows.push([
        position.pool,
        position.account,
        position.size.toString(),
        position.entry.toString(),
        solved.kind === "finite" ? solved.liqPrice.toString() : "0",
        solved.kind,
        engine.block.toString(),
      ]);
    }
    await insertChunks(
      client,
      `INSERT INTO positions (pool, account, size_signed, entry, liq_price, liq_kind, updated_block) VALUES`,
      positionRows,
      ` ON CONFLICT (pool, account) DO UPDATE SET
         size_signed = EXCLUDED.size_signed, entry = EXCLUDED.entry, liq_price = EXCLUDED.liq_price,
         liq_kind = EXCLUDED.liq_kind, updated_block = EXCLUDED.updated_block`,
    );
  });
  void holders;
}

async function marketMark(db: Sql, pool: string): Promise<bigint> {
  const row = await one<{ mark: string | null }>(db, "SELECT mark FROM markets WHERE pool = $1", [pool]);
  return row?.mark ? BigInt(row.mark) : 0n;
}

let nextZoneRecompute = 0;
let zoneBusy = false;
let zonesDirty = false;
let nearBusy = false;

function scheduleZones(db: Db, hub: Hub, engine: Engine): boolean {
  if (zoneBusy || Date.now() < nextZoneRecompute) return false;
  zoneBusy = true;
  nextZoneRecompute = Date.now() + 60_000;
  void withWriteLock(async () => {
    await recomputeLocal(db, engine);
    await publishBuckets(db, hub, engine);
  }).catch((err) => {
    console.error(`[engine] zones: ${errText(err)}`);
  }).finally(() => {
    zoneBusy = false;
  });
  return true;
}
let markCursor = 0;

function dueMarkets(all: readonly MarketInfo[]): MarketInfo[] {
  const batch = 4;
  if (all.length <= batch) return [...all];
  const pinned = all.slice(0, 2);
  const rest = all.slice(pinned.length);
  const picked: MarketInfo[] = [];
  const count = Math.min(batch - pinned.length, rest.length);
  for (let i = 0; i < count; i += 1) {
    const market = rest[markCursor % rest.length];
    markCursor += 1;
    if (market) picked.push(market);
  }
  return [...pinned, ...picked];
}

async function refreshMarks(db: Db, hub: Hub, engine: Engine, publish = true, all = false): Promise<boolean> {
  const client = engine.ex.client.getViemClient();
  try {
    engine.block = await Promise.race([
      client.getBlockNumber(),
      sleep(6_000).then(() => {
        throw new Error("block number timed out");
      }),
    ]);
  } catch (err) {
    console.warn(`[engine] block: ${errText(err)}`);
    return isTimeout(err);
  }
  let zonesDue = false;
  let timedOut = false;
  let cursor = 0;
  const markets = all ? [...engine.markets] : dueMarkets(engine.markets);
  const workers = Array.from({ length: Math.min(2, markets.length) }, async () => {
    for (;;) {
      if (timedOut) return;
      const index = cursor;
      cursor += 1;
      const market = markets[index];
      if (!market) return;
      try {
        const previous = await marketMark(db, market.pool);
        const feed = await Promise.race([
          engine.ex.client.getPerpFeedStatus(market.pool),
          sleep(6_000).then(() => {
            throw new Error(`${market.symbol} mark timed out`);
          }),
        ]);
        if (previous > 0n && markMoved(previous, feed.markPrice)) zonesDue = true;
        const feedOk = feed.markPriceOk && feed.markPrice > 0n;
        await db.query(
          "UPDATE markets SET mark = $1, oi = $2, feed_ok = $3, updated_block = $4, updated_at = $5 WHERE pool = $6",
          [
            feed.markPrice.toString(),
            feed.openInterest.toString(),
            feedOk ? 1 : 0,
            engine.block.toString(),
            Date.now(),
            market.pool,
          ],
        );
        hub.broadcast({
          type: "mark",
          symbol: market.symbol,
          pool: market.pool,
          mark: dec(feed.markPrice, market.quoteDecimals),
          oi: dec(feed.openInterest, unitDigits(market.oneBase)),
          block: engine.block.toString(),
          ageSec: 0,
          stale: false,
          feedOk,
        });
      } catch (err) {
        console.warn(`[engine] ${market.symbol} mark: ${errText(err)}`);
        await db.query("UPDATE markets SET feed_ok = 0, updated_at = $1 WHERE pool = $2", [Date.now(), market.pool]);
        if (isTimeout(err)) timedOut = true;
      }
    }
  });
  await Promise.all(workers);
  if (publish && zonesDue) zonesDirty = true;
  return timedOut;
}

async function recomputeLocal(db: Db, engine: Engine): Promise<void> {
  await withTx(db, async (client) => {
    const accounts = new Map(
      (await many<{ account: string; equity: string | null; mm_req: string | null }>(
        client,
        "SELECT account, equity, mm_req FROM accounts",
      )).map((row) => [row.account, row]),
    );
    const updates: unknown[][] = [];
    for (const market of engine.markets) {
      const mark = await marketMark(client, market.pool);
      if (mark <= 0n) continue;
      const positions = await many<{ account: string; size_signed: string }>(
        client,
        "SELECT account, size_signed FROM positions WHERE pool = $1",
        [market.pool],
      );
      for (const position of positions) {
        const account = accounts.get(position.account);
        if (!account?.equity || !account.mm_req) continue;
        const solved = liquidationPrice({
          equity: BigInt(account.equity),
          mmReq: BigInt(account.mm_req),
          size: BigInt(position.size_signed),
          markPrice: mark,
          maintenanceMarginBps: market.mmBps,
          oneBase: market.oneBase,
        });
        updates.push([
          solved.kind === "finite" ? solved.liqPrice.toString() : "0",
          solved.kind,
          market.pool,
          position.account,
        ]);
      }
    }
    for (let offset = 0; offset < updates.length; offset += 500) {
      const chunk = updates.slice(offset, offset + 500);
      const values: unknown[] = [];
      const groups = chunk.map((row) => {
        const slots = row.map((value) => {
          values.push(value);
          return `$${values.length}::text`;
        });
        return `(${slots.join(", ")})`;
      });
      await client.query(
        `UPDATE positions AS p SET liq_price = v.liq_price, liq_kind = v.liq_kind
         FROM (VALUES ${groups.join(", ")}) AS v(liq_price, liq_kind, pool, account)
         WHERE p.pool = v.pool AND p.account = v.account`,
        values,
      );
    }
  });
}

async function publishBuckets(db: Db, hub: Hub, engine: Engine): Promise<void> {
  const now = Date.now();
  const ready: {
    market: MarketInfo;
    mark: bigint;
    heat: ReturnType<typeof buildHeatmap>;
    row: { feed_ok: number; updated_at: number; updated_block: string | null };
  }[] = [];
  for (const market of engine.markets) {
    const mark = await marketMark(db, market.pool);
    if (mark <= 0n) continue;
    const positions = await many<StoredPosition>(
      db,
      "SELECT account, size_signed, liq_price, liq_kind FROM positions WHERE pool = $1",
      [market.pool],
    );
    const heat = buildHeatmap(
      mark,
      market.tick,
      positions.map((p) => ({
        account: p.account,
        size: BigInt(p.size_signed),
        liqPrice: p.liq_kind === "finite" && p.liq_price ? BigInt(p.liq_price) : 0n,
        oneBase: market.oneBase,
      })),
      30,
      market.quoteDecimals,
    );
    const row = await one<{ feed_ok: number; updated_at: number; updated_block: string | null }>(
      db,
      "SELECT feed_ok, updated_at, updated_block FROM markets WHERE pool = $1",
      [market.pool],
    );
    if (!row) continue;
    ready.push({ market, mark, heat, row });
  }
  if (ready.length > 0) await withTx(db, async (client) => {
    const pools = ready.map((item) => item.market.pool);
    await client.query("DELETE FROM buckets WHERE pool = ANY($1::text[])", [pools]);
    await insertChunks(
      client,
      `INSERT INTO buckets (pool, side, price_lo, price_hi, notional, count, top_accounts_json, computed_at) VALUES`,
      ready.flatMap((item) => item.heat.buckets.map((bucket) => [
        item.market.pool,
        bucket.side,
        bucket.priceLo.toString(),
        bucket.priceHi.toString(),
        bucket.notional.toString(),
        bucket.count,
        JSON.stringify(bucket.topAccounts.map((a) => ({ account: a.account, notional: a.notional.toString() }))),
        now,
      ])),
    );
  });
  for (const item of ready) {
    const payload = heatmapPayload(item.market, item.heat, item.mark, item.row.updated_block ?? engine.block.toString(), item.row.updated_at, item.row.feed_ok === 1, false);
    hub.broadcast({ type: "zones", ...payload });
    hub.broadcast({ type: "bucket_update", ...payload });
  }
}

function zonePayload(market: MarketInfo, zones: readonly Zone[]) {
  return zones.map((zone) => ({
    rank: zone.rank,
    side: zone.side,
    priceLo: dec(zone.priceLo, market.quoteDecimals),
    priceHi: dec(zone.priceHi, market.quoteDecimals),
    priceMid: dec(zone.priceMid, market.quoteDecimals),
    notionalUsd: dec(zone.notionalUsd, market.quoteDecimals),
    share: zone.share,
    positionCount: zone.positionCount,
    distancePct: zone.distancePct,
    topAccounts: zone.topAccounts.map((account) => ({
      account: account.account,
      notional: dec(account.notional, market.quoteDecimals),
    })),
    callout: zone.callout,
  }));
}

export function heatmapPayload(
  market: MarketInfo,
  heat: { buckets: Bucket[]; clusters: Cluster[]; zones: Zone[]; totalAtRisk: bigint; coveragePct: number; unreachable: number; finite: number; outside: number; width: bigint; windowLo: bigint; windowHi: bigint },
  mark: bigint,
  block: string,
  updatedAt: number,
  feedOk: boolean,
  detail = false,
) {
  const age = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  return {
    symbol: market.symbol,
    pool: market.pool,
    mark: dec(mark, market.quoteDecimals),
    markRaw: mark.toString(),
    width: dec(heat.width, market.quoteDecimals),
    windowLo: dec(heat.windowLo, market.quoteDecimals),
    windowHi: dec(heat.windowHi, market.quoteDecimals),
    asOfBlock: block,
    ageSec: age,
    stale: Date.now() - updatedAt > 30_000,
    feedOk,
    unreachable: heat.unreachable,
    finite: heat.finite,
    outside: heat.outside,
    positionCount: heat.finite + heat.unreachable,
    totalAtRiskUsd: dec(heat.totalAtRisk, market.quoteDecimals),
    coveragePct: heat.coveragePct,
    zones: zonePayload(market, heat.zones),
    ...(detail
      ? {
          buckets: heat.buckets.map((b) => ({
            side: b.side,
            priceLo: dec(b.priceLo, market.quoteDecimals),
            priceHi: dec(b.priceHi, market.quoteDecimals),
            notional: dec(b.notional, market.quoteDecimals),
            count: b.count,
            topAccounts: b.topAccounts.map((a) => ({
              account: a.account,
              notional: dec(a.notional, market.quoteDecimals),
            })),
          })),
          clusters: heat.clusters.map((c) => ({
            side: c.side,
            priceLo: dec(c.priceLo, market.quoteDecimals),
            priceHi: dec(c.priceHi, market.quoteDecimals),
            notional: dec(c.notional, market.quoteDecimals),
            count: c.count,
          })),
        }
      : {}),
  };
}

async function drainDirty(db: Db, engine: Engine, limit: number): Promise<boolean> {
  const rows = await many<{ account: string; margin_bank: string }>(
    db,
    "SELECT account, margin_bank FROM accounts WHERE dirty = 1 LIMIT $1",
    [limit],
  );
  if (rows.length === 0) return false;
  const client = engine.ex.client.getViemClient();
  const byBank = new Map<string, Address[]>();
  for (const row of rows) {
    const list = byBank.get(row.margin_bank) ?? [];
    list.push(getAddress(row.account));
    byBank.set(row.margin_bank, list);
  }
  const batches: { accounts: Address[]; health: HealthRow[]; positions: PositionRow[] }[] = [];
  for (const [bank, accounts] of byBank) {
    const health = await readHealth(client, getAddress(bank), accounts);
    const holders: HolderRef[] = [];
    for (const account of accounts) {
      for (const market of engine.markets) {
        if (market.marginBank !== getAddress(bank)) continue;
        holders.push({ pool: market.pool, account, isLong: true });
      }
    }
    const positions = await readPositions(client, getAddress(bank), holders);
    batches.push({ accounts, health, positions });
  }
  await withWriteLock(async () => {
    for (const batch of batches) {
      await withTx(db, async (tx) => {
        for (const row of batch.health) {
          const count = batch.positions.filter((p) => p.account === row.account).length;
          await tx.query(
            "UPDATE accounts SET equity = $1, mm_req = $2, im_req = $3, cm_req = $4, status = $5, dirty = 0, updated_at = $6, markets_count = $7 WHERE account = $8",
            [row.equity.toString(), row.mmReq.toString(), row.imReq.toString(), row.cmReq.toString(), row.status, Date.now(), count, row.account],
          );
        }
        for (const account of batch.accounts) {
          await tx.query("DELETE FROM positions WHERE account = $1", [account]);
        }
        await insertChunks(
          tx,
          `INSERT INTO positions (pool, account, size_signed, entry, liq_price, liq_kind, updated_block) VALUES`,
          batch.positions.map((position) => [
            position.pool,
            position.account,
            position.size.toString(),
            position.entry.toString(),
            "0",
            "unreachable",
            engine.block.toString(),
          ]),
        );
      });
    }
  });
  return true;
}

async function refreshNear(db: Db, engine: Engine): Promise<void> {
  void engine;
  const rows = await many<{ account: string }>(
    db,
    `SELECT DISTINCT p.account FROM positions p
     JOIN markets m ON m.pool = p.pool
     WHERE p.liq_kind = 'finite'
       AND CAST(p.liq_price AS DOUBLE PRECISION) > 0
       AND CAST(m.mark AS DOUBLE PRECISION) > 0
       AND (
         (CAST(p.size_signed AS DOUBLE PRECISION) > 0
           AND (CAST(m.mark AS DOUBLE PRECISION) - CAST(p.liq_price AS DOUBLE PRECISION)) / CAST(m.mark AS DOUBLE PRECISION) < $1)
         OR
         (CAST(p.size_signed AS DOUBLE PRECISION) < 0
           AND (CAST(p.liq_price AS DOUBLE PRECISION) - CAST(m.mark AS DOUBLE PRECISION)) / CAST(m.mark AS DOUBLE PRECISION) < $1)
       )
     LIMIT 200`,
    [NEAR_LIQ_PCT / 100],
  );
  if (rows.length === 0) return;
  await db.query("UPDATE accounts SET dirty = 1 WHERE account = ANY($1::text[])", [rows.map((row) => row.account)]);
}

async function checkAlerts(db: Db, hub: Hub, engine: Engine): Promise<void> {
  const alerts = await many<{
    chat_id: string;
    account: string;
    threshold_pct: number;
    last_sent_at: number;
  }>(db, "SELECT chat_id, account, threshold_pct, last_sent_at FROM alerts");
  for (const alert of alerts) {
    const view = await accountView(db, engine.ex, engine, alert.account);
    const positions = (view as { positions?: { symbol: string; distancePct: number | null; status: string; liq: string | null }[] }).positions ?? [];
    for (const position of positions) {
      if (position.distancePct === null || position.distancePct >= alert.threshold_pct) continue;
      if (Date.now() - alert.last_sent_at < 10 * 60_000) continue;
      hub.broadcast({
        type: "account_risk",
        account: alert.account,
        symbol: position.symbol,
        distancePct: position.distancePct,
        status: position.status,
        liq: position.liq,
      });
      await db.query("UPDATE alerts SET last_sent_at = $1 WHERE chat_id = $2 AND account = $3", [Date.now(), alert.chat_id, alert.account]);
    }
  }
}

async function accountView(db: Db, ex: SomniaMarkets, engine: Engine, address: string): Promise<unknown> {
  if (!isAddress(address)) throw new Error("Not an address");
  const account = getAddress(address);
  const positionSql = `SELECT p.pool, p.account, p.size_signed, p.entry, p.liq_price, p.liq_kind, m.symbol, m.mark, m.quote_decimals, m.one_base, m.feed_ok, m.updated_at, m.updated_block, m.im_bps
     FROM positions p JOIN markets m ON m.pool = p.pool WHERE p.account = $1`;
  let rows = await many<StoredPosition & {
    symbol: string;
    mark: string | null;
    quote_decimals: number;
    one_base: string;
    feed_ok: number;
    updated_at: number;
    updated_block: string | null;
    im_bps: number;
  }>(db, positionSql, [account]);
  if (rows.length === 0 && engine.markets.length > 0) {
    await liveFill(db, ex, engine, account);
    rows = await many<typeof rows[number]>(db, positionSql, [account]);
  }
  const health = await one<StoredAccount>(db, "SELECT * FROM accounts WHERE account = $1", [account]);
  const equity = health?.equity ? BigInt(health.equity) : 0n;
  const mmReq = health?.mm_req ? BigInt(health.mm_req) : 0n;
  const imReq = health?.im_req ? BigInt(health.im_req) : 0n;
  return {
    account,
    asOfBlock: rows[0]?.updated_block ?? engine.block.toString(),
    ageSec: rows[0] ? Math.max(0, Math.round((Date.now() - rows[0].updated_at) / 1000)) : null,
    stale: rows[0] ? Date.now() - rows[0].updated_at > 30_000 : true,
    marginStatus: health?.status ?? null,
    equity: dec(equity),
    mmReq: dec(mmReq),
    imReq: dec(imReq),
    marginRatio: marginRatio(equity, mmReq),
    cross: (health?.markets_count ?? rows.length) > 1,
    marketsCount: health?.markets_count ?? rows.length,
    freeEquity: dec(equity > imReq ? equity - imReq : 0n),
    positions: rows.map((row) => {
      const size = BigInt(row.size_signed);
      const mark = row.mark ? BigInt(row.mark) : 0n;
      const liq = row.liq_kind === "finite" && row.liq_price ? BigInt(row.liq_price) : 0n;
      const distance = distancePct(size, mark, liq);
      const decimals = row.quote_decimals;
      return {
        pool: row.pool,
        symbol: row.symbol,
        side: size > 0n ? "long" : "short",
        size: dec(size < 0n ? -size : size, unitDigits(row.one_base)),
        entry: dec(BigInt(row.entry), decimals),
        mark: dec(mark, decimals),
        liq: liq > 0n ? dec(liq, decimals) : null,
        liqKind: row.liq_kind,
        liqLabel: "Liq price (if only this market moves)",
        distancePct: distance,
        status: riskStatus(distance),
        feedOk: row.feed_ok === 1,
        maxLeverage: row.im_bps > 0 ? 10000 / row.im_bps : 1,
        cross: (health?.markets_count ?? rows.length) > 1,
      };
    }),
  };
}

async function liveFill(db: Db, ex: SomniaMarkets, engine: Engine, account: Address): Promise<void> {
  const market = engine.markets[0];
  if (!market) return;
  const client = ex.client.getViemClient();
  const holders: HolderRef[] = engine.markets.map((m) => ({ pool: m.pool, account, isLong: true }));
  const [health] = await readHealth(client, market.marginBank, [account]);
  const positions = await readPositions(client, market.marginBank, holders);
  await withWriteLock(async () => {
    await withTx(db, async (tx) => {
      if (health) {
        await tx.query(
          `INSERT INTO accounts (account, margin_bank, equity, mm_req, im_req, cm_req, status, markets_count, is_demo_bot, updated_block, dirty, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, 0, $10)
           ON CONFLICT (account) DO UPDATE SET equity = EXCLUDED.equity, mm_req = EXCLUDED.mm_req, im_req = EXCLUDED.im_req, cm_req = EXCLUDED.cm_req, status = EXCLUDED.status, markets_count = EXCLUDED.markets_count, updated_at = EXCLUDED.updated_at`,
          [
            account,
            market.marginBank,
            health.equity.toString(),
            health.mmReq.toString(),
            health.imReq.toString(),
            health.cmReq.toString(),
            health.status,
            positions.length,
            engine.block.toString(),
            Date.now(),
          ],
        );
      }
      await insertChunks(
        tx,
        `INSERT INTO positions (pool, account, size_signed, entry, liq_price, liq_kind, updated_block) VALUES`,
        positions.map((position) => [
          position.pool,
          account,
          position.size.toString(),
          position.entry.toString(),
          "0",
          "unreachable",
          engine.block.toString(),
        ]),
        ` ON CONFLICT (pool, account) DO UPDATE SET size_signed = EXCLUDED.size_signed, entry = EXCLUDED.entry`,
      );
    });
    await recomputeLocal(db, engine);
  });
}

async function preview(ex: SomniaMarkets, body: PreviewBody): Promise<unknown> {
  const pool = getAddress(body.pool);
  const account = getAddress(body.account);
  const listed = await ex.client.listPerpMarkets();
  const market = listed.find((m) => m.poolAddress.toLowerCase() === pool.toLowerCase());
  if (!market || market.marketType !== "PERP") throw new Error("Unknown pool");
  const quantity = BigInt(body.quantity);
  const price = BigInt(body.price);
  const margin = await ex.client.previewPerpOrderMargin({
    pool,
    marginBank: getAddress(market.marginBank),
    account,
    isBid: body.isBid,
    quantity,
    price,
  });
  const liq = await ex.client.previewPerpLiquidationPrice({
    pool,
    marginBank: getAddress(market.marginBank),
    account,
    isBid: body.isBid,
    quantity,
    price,
  });
  const decimals = market.quoteDecimals;
  const ser = (value: bigint | null | undefined) => (value === null || value === undefined ? null : dec(value, decimals));
  return {
    priceable: margin.priceable && liq.priceable,
    asOfBlock: margin.asOfBlock.toString(),
    lockAmount: margin.priceable ? dec(margin.lockAmount, decimals) : null,
    currentLiquidationPrice: liq.priceable ? ser(liq.currentLiquidationPrice) : null,
    projectedLiquidationPrice: liq.priceable ? ser(liq.projectedLiquidationPrice) : null,
    projectedEquity: liq.priceable ? dec(liq.projectedEquity, decimals) : null,
  };
}

async function acceptOrder(db: Db, ex: SomniaMarkets, body: OrderBody): Promise<void> {
  if (!body.tx || !/^0x[0-9a-fA-F]{64}$/.test(body.tx)) throw new Error("tx hash is required");
  if (!body.account || !isAddress(body.account)) throw new Error("account is required");
  if (!body.pool || !isAddress(body.pool)) throw new Error("pool is required");
  const hash = body.tx as Hex;
  const client = ex.client.getViemClient();
  let receipt: { status: string } | null = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      receipt = await client.getTransactionReceipt({ hash });
      break;
    } catch {
      await sleep(800);
    }
  }
  if (!receipt || receipt.status !== "success") throw new Error("Receipt not found");
  const tx = await client.getTransaction({ hash });
  if (getAddress(tx.from) !== getAddress(body.account)) throw new Error("Transaction signer does not match the account");
  const market = await one<{ pool: string; stop_registry: string | null; margin_bank: string; quote_token: string }>(
    db,
    "SELECT pool, stop_registry, margin_bank, quote_token FROM markets WHERE lower(pool) = lower($1)",
    [body.pool],
  );
  if (!market) throw new Error("Unknown pool");
  const allowed = [market.pool, market.stop_registry, market.margin_bank, market.quote_token]
    .filter((value): value is string => Boolean(value))
    .map((value) => getAddress(value));
  if (!tx.to || !allowed.includes(getAddress(tx.to))) throw new Error("Transaction is not for this market");
  await recordOrder(db, body);
  if (body.kind === "cascade_stop" && body.account && body.pool) {
    await db.query(
      "UPDATE app_orders SET status = 'sl_signed' WHERE lower(account) = lower($1) AND lower(pool) = lower($2) AND kind = 'cascade_entry' AND status = 'sl_pending'",
      [body.account, body.pool],
    );
  }
}

async function recordOrder(db: Db, body: OrderBody): Promise<void> {
  await db.query(
    `INSERT INTO app_orders (tx, account, pool, kind, params_json, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tx) DO UPDATE SET status = EXCLUDED.status, params_json = EXCLUDED.params_json`,
    [
      body.tx,
      body.account ?? null,
      body.pool ?? null,
      body.kind,
      JSON.stringify(body.params ?? {}),
      body.status ?? "submitted",
      Date.now(),
    ],
  );
}

const HEAT_CACHE_MS = 8_000;
export type HeatPayload = ReturnType<typeof heatmapPayload>;
const heatCache = new Map<string, { at: number; heat: HeatPayload | null }>();

function heatKey(symbol: string, detail: boolean): string {
  return `${symbol.toLowerCase()}:${detail ? "1" : "0"}`;
}

export function peekHeat(symbol: string, detail = false): HeatPayload | null | undefined {
  const hit = heatCache.get(heatKey(symbol, detail));
  if (!hit || Date.now() - hit.at > HEAT_CACHE_MS) return undefined;
  return hit.heat;
}

export async function readHeatmap(db: Db, symbol: string, detail = false) {
  const cached = heatCache.get(heatKey(symbol, detail));
  if (cached && Date.now() - cached.at <= HEAT_CACHE_MS) {
    if (!cached.heat) return null;
    const fresh = await one<{
      mark: string | null;
      updated_at: number;
      updated_block: string | null;
      feed_ok: number;
      quote_decimals: number;
    }>(
      db,
      "SELECT mark, updated_at, updated_block, feed_ok, quote_decimals FROM markets WHERE lower(symbol) = lower($1)",
      [symbol],
    );
    if (!fresh?.mark) return cached.heat;
    return {
      ...cached.heat,
      mark: dec(BigInt(fresh.mark), fresh.quote_decimals),
      markRaw: fresh.mark,
      asOfBlock: fresh.updated_block ?? cached.heat.asOfBlock,
      ageSec: Math.max(0, Math.round((Date.now() - fresh.updated_at) / 1000)),
      stale: Date.now() - fresh.updated_at > 30_000,
      feedOk: fresh.feed_ok === 1,
    };
  }
  const marketRow = await one<{
    pool: string;
    symbol: string;
    tick: string;
    one_base: string;
    quote_decimals: number;
    mark: string | null;
    feed_ok: number;
    updated_at: number;
    updated_block: string | null;
    mm_bps: number;
    im_bps: number;
  }>(db, "SELECT * FROM markets WHERE lower(symbol) = lower($1)", [symbol]);
  if (!marketRow || !marketRow.mark) {
    heatCache.set(heatKey(symbol, detail), { at: Date.now(), heat: null });
    return null;
  }
  const stored = await many<{ account: string; size_signed: string; liq_price: string | null; liq_kind: string }>(
    db,
    "SELECT account, size_signed, liq_price, liq_kind FROM positions WHERE pool = $1",
    [marketRow.pool],
  );
  const market: MarketInfo = {
    pool: getAddress(marketRow.pool),
    symbol: marketRow.symbol,
    marginBank: "0x0000000000000000000000000000000000000000",
    stopRegistry: null,
    quoteToken: "0x0000000000000000000000000000000000000000",
    tick: BigInt(marketRow.tick),
    lot: 0n,
    minQty: 0n,
    imBps: marketRow.im_bps,
    mmBps: BigInt(marketRow.mm_bps),
    oneBase: BigInt(marketRow.one_base),
    quoteDecimals: marketRow.quote_decimals,
  };
  const mark = BigInt(marketRow.mark);
  const heat = buildHeatmap(
    mark,
    market.tick,
    stored.map((row) => ({
      account: row.account,
      size: BigInt(row.size_signed),
      liqPrice: row.liq_kind === "finite" && row.liq_price ? BigInt(row.liq_price) : 0n,
      oneBase: market.oneBase,
    })),
    30,
    market.quoteDecimals,
  );
  const payload = heatmapPayload(
    market,
    heat,
    mark,
    marketRow.updated_block ?? "0",
    marketRow.updated_at,
    marketRow.feed_ok === 1,
    detail,
  );
  heatCache.set(heatKey(symbol, detail), { at: Date.now(), heat: payload });
  return payload;
}
