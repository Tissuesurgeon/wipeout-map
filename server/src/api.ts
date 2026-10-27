import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { isAddress } from "viem";
import { originAllowed, originListed } from "./cors.js";
import { repoRoot } from "./config.js";
import type { Db } from "./db.js";
import { many, one } from "./db.js";
import { preferredRank } from "./discovery.js";
import { peekHeat, readHeatmap, type Engine, type HeatPayload } from "./engine.js";
import { ageSec, dec, isStale, unitDigits } from "./format.js";

const alertHits = new Map<string, number[]>();

function oneHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function alertLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (alertHits.get(ip) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= 10) {
    alertHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  alertHits.set(ip, recent);
  return false;
}

export async function buildApi(db: Db, engine: () => Engine): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.addHook("onRequest", async (req, reply) => {
    const origin = oneHeader(req.headers.origin);
    if (!origin) return;
    if (originAllowed(origin, oneHeader(req.headers.host))) return;
    reply.code(403);
    return reply.send({ error: "origin refused" });
  });
  await app.register(cors, {
    origin: (origin, cb) => {
      cb(null, originListed(origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["content-type"],
  });

  app.get("/api/health", async () => {
    let current: Engine | null = null;
    try {
      current = engine();
    } catch {
      current = null;
    }
    if (!current) {
      return { ok: true, ready: false, sweeping: false, markets: 0, block: "0", feedMode: "polling" as const };
    }
    return {
      ok: true,
      ready: current.ready,
      sweeping: current.sweeping,
      markets: current.markets.length,
      block: current.block.toString(),
      feedMode: current.feedMode,
    };
  });

  app.get("/api/markets", async () => {
    const rows = (await many<{
      symbol: string;
      pool: string;
      mark: string | null;
      index_px: string | null;
      funding_rate: string | null;
      oi: string | null;
      quote_decimals: number;
      feed_ok: number;
      updated_at: number;
      updated_block: string | null;
      im_bps: number;
      mm_bps: number;
      next_funding_at: number | null;
      margin_bank: string;
      stop_registry: string | null;
      tick: string;
      lot: string;
      min_qty: string;
      one_base: string;
    }>(db, "SELECT * FROM markets")).sort((a, b) => preferredRank(a.symbol) - preferredRank(b.symbol) || a.symbol.localeCompare(b.symbol));
    const heats: (HeatPayload | null)[] = [];
    let built = false;
    for (const row of rows) {
      const cached = peekHeat(row.symbol);
      if (cached !== undefined) {
        heats.push(cached);
        continue;
      }
      if (!built) {
        heats.push(await readHeatmap(db, row.symbol));
        built = true;
        continue;
      }
      heats.push(null);
    }
    return {
      markets: rows.map((row, index) => {
        const lead = heats[index]?.zones[0];
        return {
        symbol: row.symbol,
        pool: row.pool,
        mark: row.mark ? dec(BigInt(row.mark), row.quote_decimals) : null,
        index: row.index_px ? dec(BigInt(row.index_px), row.quote_decimals) : null,
        fundingRate: row.funding_rate,
        openInterest: row.oi ? dec(BigInt(row.oi), unitDigits(row.one_base)) : null,
        imBps: row.im_bps,
        mmBps: row.mm_bps,
        maxLeverage: row.im_bps > 0 ? 10000 / row.im_bps : null,
        nextFundingAt: row.next_funding_at,
        feedOk: row.feed_ok === 1,
        asOfBlock: row.updated_block,
        ageSec: ageSec(row.updated_at),
        stale: isStale(row.updated_at),
        marginBank: row.margin_bank,
        stopRegistry: row.stop_registry,
        tick: row.tick,
        lot: row.lot,
        minQty: row.min_qty,
        quoteDecimals: row.quote_decimals,
        oneBase: row.one_base,
        leadNotionalUsd: lead?.notionalUsd ?? null,
        leadSide: lead?.side ?? null,
      };
      }),
    };
  });

  app.get<{ Params: { symbol: string }; Querystring: { detail?: string } }>("/api/heatmap/:symbol", async (req, reply) => {
    const heat = await readHeatmap(db, req.params.symbol, req.query.detail === "1");
    if (!heat) return reply.code(404).send({ error: "Market not ready", symbol: req.params.symbol });
    return heat;
  });

  app.get<{ Params: { symbol: string } }>("/api/zones/:symbol", async (req, reply) => {
    const heat = await readHeatmap(db, req.params.symbol, false);
    if (!heat) return reply.code(404).send({ error: "Market not ready", symbol: req.params.symbol });
    return {
      symbol: heat.symbol,
      mark: heat.mark,
      asOfBlock: heat.asOfBlock,
      ageSec: heat.ageSec,
      stale: heat.stale,
      totalAtRiskUsd: heat.totalAtRiskUsd,
      coveragePct: heat.coveragePct,
      zones: heat.zones,
    };
  });

  app.get<{ Params: { address: string } }>("/api/account/:address", async (req, reply) => {
    if (!isAddress(req.params.address)) return reply.code(400).send({ error: "Bad address" });
    try {
      return await engine().accountView(req.params.address);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "account failed" });
    }
  });

  app.post<{ Body: { pool?: string; account?: string; isBid?: boolean; quantity?: string; price?: string } }>("/api/preview", async (req, reply) => {
    const body = req.body ?? {};
    if (!body.pool || !body.account || body.isBid === undefined || !body.quantity || !body.price) {
      return reply.code(400).send({ error: "pool, account, isBid, quantity, price are required" });
    }
    try {
      return await engine().preview({
        pool: body.pool,
        account: body.account,
        isBid: body.isBid,
        quantity: body.quantity,
        price: body.price,
      });
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "preview failed" });
    }
  });

  app.get<{ Querystring: { symbol?: string; limit?: string } }>("/api/liquidations", async (req) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
    const symbol = req.query.symbol;
    const rows = symbol
      ? await many<LiqRow>(
          db,
          `SELECT l.*, m.symbol, m.quote_decimals, m.one_base FROM liquidations l
           LEFT JOIN markets m ON lower(m.pool) = lower(l.pool)
           WHERE lower(m.symbol) = lower($1)
           ORDER BY ts DESC LIMIT $2`,
          [symbol, limit],
        )
      : await many<LiqRow>(
          db,
          `SELECT l.*, m.symbol, m.quote_decimals, m.one_base FROM liquidations l
           LEFT JOIN markets m ON lower(m.pool) = lower(l.pool)
           ORDER BY ts DESC LIMIT $1`,
          [limit],
        );
    return {
      liquidations: rows.map((row) => {
        const decimals = row.quote_decimals ?? 18;
        return {
          tx: row.tx,
          logIndex: row.log_index,
          pool: row.pool,
          symbol: row.symbol,
          account: row.account,
          side: row.side,
          size: row.size ? dec(abs(BigInt(row.size)), unitDigits(row.one_base ?? "1")) : null,
          price: row.price ? dec(BigInt(row.price), decimals) : null,
          penalty: row.penalty,
          keeper: row.keeper,
          predictedLiq: row.predicted_na === 1 || !row.predicted_liq ? null : dec(BigInt(row.predicted_liq), decimals),
          predictedNa: row.predicted_na === 1 || !row.predicted_liq,
          hit: row.predicted_hit === 1,
          block: row.block,
          ts: row.ts,
        };
      }),
    };
  });

  app.post<{ Body: { code?: string; account?: string; thresholdPct?: number } }>("/api/alerts", async (req, reply) => {
    if (!process.env.TELEGRAM_BOT_TOKEN) return reply.code(403).send({ error: "Alerts bot is not configured" });
    if (alertLimited(req.ip)) return reply.code(429).send({ error: "Too many alert requests" });
    const body = req.body ?? {};
    if (!body.code || !body.account || !isAddress(body.account)) {
      return reply.code(400).send({ error: "code and account are required" });
    }
    const code = await one<{ chat_id: string; expires_at: number; used: number; attempts: number }>(
      db,
      "SELECT chat_id, expires_at, used, attempts FROM watch_codes WHERE code = $1",
      [body.code],
    );
    if (!code) return reply.code(403).send({ error: "Watch code is missing or used" });
    if (code.attempts >= 5 || code.used === 1 || code.expires_at < Date.now()) {
      await db.query("UPDATE watch_codes SET attempts = attempts + 1 WHERE code = $1", [body.code]);
      return reply.code(403).send({ error: "Watch code is missing or used" });
    }
    const threshold = body.thresholdPct ?? 15;
    await db.query("UPDATE watch_codes SET used = 1, attempts = attempts + 1 WHERE code = $1", [body.code]);
    await db.query(
      `INSERT INTO alerts (chat_id, account, threshold_pct, last_sent_at)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (chat_id, account) DO UPDATE SET threshold_pct = EXCLUDED.threshold_pct`,
      [code.chat_id, body.account, threshold],
    );
    return { ok: true };
  });

  app.get<{ Querystring: { account?: string } }>("/api/orders/pending", async (req, reply) => {
    if (!req.query.account || !isAddress(req.query.account)) return reply.code(400).send({ error: "account is required" });
    const rows = await many<{ tx: string; account: string; pool: string; kind: string; params_json: string; status: string; created_at: number }>(
      db,
      "SELECT tx, account, pool, kind, params_json, status, created_at FROM app_orders WHERE status = 'sl_pending' AND lower(account) = lower($1) ORDER BY created_at DESC",
      [req.query.account],
    );
    return {
      orders: rows.map((row) => ({
        tx: row.tx,
        account: row.account,
        pool: row.pool,
        kind: row.kind,
        params: JSON.parse(row.params_json) as unknown,
        status: row.status,
        createdAt: row.created_at,
      })),
    };
  });

  app.post<{
    Body: { tx?: string; account?: string; pool?: string; kind?: string; params?: unknown; status?: string };
  }>("/api/orders", async (req, reply) => {
    const body = req.body ?? {};
    if (!body.tx || !body.kind) return reply.code(400).send({ error: "tx and kind are required" });
    try {
      await engine().recordOrder({
        tx: body.tx,
        account: body.account,
        pool: body.pool,
        kind: body.kind,
        params: body.params ?? {},
        status: body.status,
      });
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "order rejected" });
    }
    return { ok: true };
  });

  const dist = resolve(repoRoot, "web/dist");
  if (existsSync(dist)) {
    await app.register(fastifyStatic, { root: dist });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api") || req.url.startsWith("/ws")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}

type LiqRow = {
  tx: string;
  log_index: number;
  pool: string | null;
  account: string | null;
  side: string | null;
  size: string | null;
  price: string | null;
  penalty: string | null;
  keeper: string | null;
  predicted_liq: string | null;
  predicted_hit: number | null;
  predicted_na: number | null;
  block: string | null;
  ts: number | null;
  symbol: string | null;
  quote_decimals: number | null;
  one_base: string | null;
};

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}
