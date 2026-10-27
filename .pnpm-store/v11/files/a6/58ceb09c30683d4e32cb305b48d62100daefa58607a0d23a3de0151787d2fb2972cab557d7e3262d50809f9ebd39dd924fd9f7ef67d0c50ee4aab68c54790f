// Price-feed GraphQL reads (HTTP) + the shared row parsers.
//
// The price-feed indexer is read-only and auth-free. ONE endpoint serves every
// asset; every Feed/PricePoint/Candle row carries a denormalized `symbol`
// (`BTC/USDC`), `base` (`BTC`), and `quote` (`USDC`), so an asset is selected by
// filter — single (`base: {_eq}`), a batch (`base: {_in: [...]}`), or all (omit
// the filter). This mirrors how CEX ticker endpoints and Pyth's `ids[]` batch work.
//
// The feed indexes MORE THAN ONE quote per base (`BTC/USDC` and `BTC/USDT`), so
// `base` alone is not a unique feed key. Every read below takes an optional
// `quote` that adds a `{quote: {_eq}}` clause; when set (the norm), a base
// resolves to exactly one feed. Without it a multi-quote base double-counts —
// merged candle buckets share a `bucketStart` (fatal to strict-ascending charts),
// `Feed[0]` is arbitrary. The quote comes from config (see resolvePriceFeed).
//
// These are the one-shot HTTP reads (batched watch snapshot, history, candles, feed info, batch
// prices, feed catalog); the live subscription (tail) reuses the SUBSCRIPTION_*
// query strings + the same parsers so live and snapshot rows land in the store
// identically.
//
// Errors PROPAGATE: a failed request throws — an empty result always means "no
// rows", never "request failed".
import * as Types from "./types.js";
import * as GraphqlBoundary from "../graphqlBoundary.js";
import { IndexerError } from "../errors.js";
const GQL_TIMEOUT_MS = 30_000;
/**
 *  Price-feed reads go through the shared indexer boundary. The `price-feed`
 *  label distinguishes them from main-indexer failures in a caller's logs —
 *  they are separate deployments and can fail independently.
 */
async function gql(url, query, variables = {}, signal) {
    return GraphqlBoundary.postGraphql(url, query, variables, {
        timeoutMs: GQL_TIMEOUT_MS,
        signal,
        label: `price-feed ${GraphqlBoundary.operationNameOf(query)}`,
    });
}
// ---- selection sets (shared with the subscription queries) ----
//
// The feed exposes the spot index (`spot` / `latestSpot`) and its EMA-smoothed
// perpetual mark (`mark` / `latestMark` / candle `markClose`). The SDK maps these
// onto its stable `price` / `ema` / `emaClose` fields (see the parsers): `price` =
// spot, `ema` = the mark. `requestId` identifies the batched agent request that
// produced a tick - it is not per-tick globally, but it IS unique within one feed,
// which is what lets the tape cursor on it (see subscriptionTicksStream).
const FEED_FIELDS = `symbol base quote decimals description latestSpot latestMark latestBlockNumber latestBlockTimestamp latestUpdatedAtMs latestSourceUpdatedAtMs latestResynced`;
const POINT_FIELDS = `id base requestId spot mark blockNumber blockTimestamp txHash`;
const CANDLE_FIELDS = `resolution bucketStart open high low close markClose count`;
/** WHERE fragment + operation-var suffix for a base (+ optional quote) filter.
 *  `quote` is passed as a GraphQL variable ($quote), never interpolated. */
function baseQuoteFilter(quote) {
    return quote
        ? { where: "base: {_eq: $base}, quote: {_eq: $quote}", varDecl: ", $quote: String!" }
        : { where: "base: {_eq: $base}", varDecl: "" };
}
/** Live Feed subscription for one asset (the catalog row = current price). Pass
 *  `quote` to pin a multi-quote base to one feed; the caller must supply `$quote`
 *  in the subscription variables when set. */
export function subscriptionFeed(quote) {
    const { where, varDecl } = baseQuoteFilter(quote);
    return `subscription LiveFeed($base: String!${varDecl}) { Feed(where: {${where}}) { ${FEED_FIELDS} } }`;
}
/**
 *  Live tick tape for one asset, as a Hasura STREAM: each push carries only the
 *  rows after `$cursor`, not the whole window.
 *
 *  The cursor is `requestId`. Within ONE feed it is unique and strictly increases
 *  with time, so no tick is skipped and none repeats.
 *
 *  That uniqueness is per feed, not per base: one agent request prices every
 *  symbol in the tick, so `BTC/USDC` and `BTC/USDT` share a `requestId`. Pass
 *  `quote` (both shipped feed configs do) so the base resolves to one feed. Left
 *  unpinned, a base spanning several quotes puts rows with equal `requestId` in
 *  the stream, and a cursor advances past every row holding its value - so a
 *  batch boundary falling between them would drop the later one, the same way
 *  `blockTimestamp` would. The file header already warns that an unpinned
 *  multi-quote base double-counts; this is the sharper edge of it.
 *
 *  The other candidates do not work here:
 *  - `blockTimestamp` repeats. Several ticks can share one second, and a cursor
 *    advances past every row holding its value, so ticks would be dropped.
 *  - `blockNumber` is unique and monotonic, but the feed's Hasura answers a
 *    cursor on it with `database query error`, so it cannot be used.
 *
 *  Pass `quote` to pin a multi-quote base to one feed.
 */
export function subscriptionTicksStream(quote) {
    const { where, varDecl } = baseQuoteFilter(quote);
    return (`subscription LiveTicksStream($base: String!, $cursor: numeric!, $batch: Int!${varDecl}) ` +
        `{ PricePoint_stream(batch_size: $batch, cursor: {initial_value: {requestId: $cursor}, ordering: ASC}, ` +
        `where: {${where}}) { ${POINT_FIELDS} } }`);
}
// ---- parsers (1e18 → human number + exact raw string; unix-s string → number) ----
/**
 *  Divide a 1e18-scaled integer string by 10^decimals for a human number.
 *  Display-grade (IEEE double); the raw string is kept alongside for exact math.
 */
function toHumanPrice(raw, decimals) {
    if (raw === null)
        return 0;
    return Number(raw) / 10 ** decimals;
}
/** The exact 1e18-scaled string for `PricePoint.raw`. A null value field collapses
 *  to "0", matching what {@link toHumanPrice} reports for the same row, so `raw`
 *  never contradicts the human number beside it. */
function toRawAmount(raw) {
    return raw ?? "0";
}
function toSec(s) {
    return s === null ? 0 : Number(s);
}
/** Unix-MILLIsecond `numeric` string → number, or null when absent. Distinct from
 *  {@link toSec}: null stays null rather than collapsing to 0, because 0 is a
 *  real (if absurd) instant and "unknown age" must not read as "1970". */
function toMsOrNull(s) {
    if (s === null || s === undefined)
        return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
/** Asset key for a row: the denormalized `base`, uppercased (falls back to a hint). */
function assetOf(base, hint) {
    return (base ?? hint ?? "").toUpperCase();
}
export function parseFeed(feed, assetHint) {
    const asset = assetOf(feed?.base, assetHint);
    const decimals = feed?.decimals ?? Types.PRICE_FEED_DECIMALS;
    const hasLatest = !!feed && feed.latestSpot !== null;
    const latest = hasLatest
        ? {
            asset,
            price: toHumanPrice(feed.latestSpot, decimals),
            ema: toHumanPrice(feed.latestMark, decimals),
            blockNumber: toSec(feed.latestBlockNumber),
            blockTimestamp: toSec(feed.latestBlockTimestamp),
            decimals,
            raw: { price: feed.latestSpot ?? "0", ema: feed.latestMark ?? "0" },
        }
        : null;
    return {
        asset,
        decimals,
        symbol: feed?.symbol ?? null,
        base: feed?.base ?? null,
        quote: feed?.quote ?? null,
        description: feed?.description ?? null,
        updatedAtMs: toMsOrNull(feed?.latestUpdatedAtMs),
        sourceUpdatedAtMs: toMsOrNull(feed?.latestSourceUpdatedAtMs),
        resynced: feed?.latestResynced ?? null,
        latest,
    };
}
// ---- subscription payload narrowing ----
//
// A payload arrives as `unknown`. These prove its shape rather than asserting it.
/** The value under `field`, or undefined when `data` does not carry it. */
function fieldOf(data, field) {
    if (typeof data !== "object" || data === null)
        return undefined;
    if (!(field in data))
        return undefined;
    return Reflect.get(data, field);
}
/** Identity fields: a row without these cannot be placed on the tape, and
 *  `requestId` is the stream cursor, so a row missing it would stall resumption. */
const POINT_REQUIRED_KEYS = ["id", "requestId", "blockNumber", "blockTimestamp", "txHash"];
/** Value fields: present, but legitimately null. {@link parsePoint} tolerates each. */
const POINT_NULLABLE_KEYS = ["base", "spot", "mark"];
/** Every field {@link parseFeed} reads. Short of the full list, a row missing one
 *  narrows to `RawFeed` anyway and reaches the parsers as `undefined` - which
 *  `toSec` turns into `NaN` in a non-nullable public field, unlike a real null. */
const FEED_KEYS = [
    "symbol",
    "base",
    "quote",
    "decimals",
    "description",
    "latestSpot",
    "latestMark",
    "latestBlockNumber",
    "latestBlockTimestamp",
    "latestUpdatedAtMs",
    "latestSourceUpdatedAtMs",
    "latestResynced",
];
/** True when `v` is a `PricePoint` row {@link parsePoint} can read.
 *
 *  Required fields must be strings: a key-presence test would narrow a row whose
 *  `requestId` is null to a type declaring it a string, and that value goes on to
 *  seed the tape's resume cursor. Value fields must be a string OR null - null is
 *  what the feed sends for a tick recorded before a price was available, and the
 *  parsers tolerate it, but anything else would land a non-string in a public
 *  field typed as one. */
function isRawPricePoint(v) {
    if (typeof v !== "object" || v === null)
        return false;
    if (!POINT_REQUIRED_KEYS.every((k) => typeof Reflect.get(v, k) === "string"))
        return false;
    return POINT_NULLABLE_KEYS.every((k) => {
        const value = Reflect.get(v, k);
        return value === null || typeof value === "string";
    });
}
/** Fields of a `Feed` row that are a nullable STRING on the wire. */
const FEED_STRING_KEYS = [
    "symbol",
    "base",
    "quote",
    "description",
    "latestSpot",
    "latestMark",
    "latestBlockNumber",
    "latestBlockTimestamp",
    "latestUpdatedAtMs",
    "latestSourceUpdatedAtMs",
];
/** True when `v` is a `Feed` row {@link parseFeed} can read.
 *
 *  Every field is nullable, but nullable is not "anything": a numeric `latestSpot`
 *  would pass a presence test and land in `PriceFeedInfo.latest.raw.price`, which
 *  is typed as an exact 1e18 string. Each field is checked as null or its own
 *  wire type. */
function isRawFeed(v) {
    if (typeof v !== "object" || v === null)
        return false;
    const typed = (k, t) => {
        const value = Reflect.get(v, k);
        return value === null || typeof value === t;
    };
    if (!FEED_KEYS.every((k) => k in v))
        return false;
    if (!FEED_STRING_KEYS.every((k) => typed(k, "string")))
        return false;
    return typed("decimals", "number") && typed("latestResynced", "boolean");
}
/**
 *  The `PricePoint` rows under `field` of a subscription payload, oldest-first
 *  as the stream delivers them. Empty when the payload carries none.
 *
 *  @internal
 */
export function pricePointsIn(data, field) {
    const value = fieldOf(data, field);
    if (!Array.isArray(value))
        return [];
    return value.filter(isRawPricePoint);
}
/**
 *  The first `Feed` row under `field` of a subscription payload, or undefined
 *  when the payload carries none.
 *
 *  @internal
 */
export function feedIn(data, field) {
    const value = fieldOf(data, field);
    if (!Array.isArray(value))
        return undefined;
    return value.find(isRawFeed);
}
export function parsePoint(p, decimals, assetHint) {
    return {
        id: p.id,
        asset: assetOf(p.base, assetHint),
        price: toHumanPrice(p.spot, decimals),
        ema: toHumanPrice(p.mark, decimals),
        requestId: p.requestId,
        blockNumber: Number(p.blockNumber),
        blockTimestamp: Number(p.blockTimestamp),
        txHash: p.txHash,
        raw: { price: toRawAmount(p.spot), ema: toRawAmount(p.mark) },
    };
}
function parseCandle(asset, c, decimals) {
    return {
        asset,
        resolution: c.resolution,
        bucketStart: Number(c.bucketStart),
        open: toHumanPrice(c.open, decimals),
        high: toHumanPrice(c.high, decimals),
        low: toHumanPrice(c.low, decimals),
        close: toHumanPrice(c.close, decimals),
        emaClose: toHumanPrice(c.markClose, decimals),
        count: Number(c.count),
    };
}
/**
 *  Hydrate several assets in ONE request: their metadata + current price + the
 *  recent tick tape of each. Used to get fresh watches "roughly up to speed"
 *  before the live subscriptions take over.
 *
 *  Each asset's tape is its own aliased `PricePoint` field with its own `limit`,
 *  not one shared `base: {_in}` list. A shared list with a global limit would
 *  let a busy asset take the whole budget and leave a quiet one with no ticks.
 *  The `Feed` rows can share one `_in` filter: the pinned quote makes each base
 *  one row.
 *
 *  A zero tick budget omits every tape field and its variables.
 *  Returns a map keyed by the uppercased asset. An asset without a `Feed` row
 *  gets the same empty-feed info as a one-asset read.
 */
export async function loadPriceSnapshots(url, assets, ticks, quote, signal) {
    const bases = assets.map((a) => a.toUpperCase());
    const tapeBases = ticks > 0 ? bases : [];
    const baseDecls = tapeBases.map((_, i) => `, $b${i}: String!`).join("");
    const tapes = tapeBases
        .map((_, i) => `t${i}: PricePoint(where: {base: {_eq: $b${i}}, quote: {_eq: $quote}}, order_by: {blockTimestamp: desc}, limit: $limit) { ${POINT_FIELDS} }`)
        .join("\n      ");
    const data = await gql(url, `query PriceSnapshots($bases: [String!]!, $quote: String!${ticks > 0 ? ", $limit: Int!" : ""}${baseDecls}) {
      Feed(where: {base: {_in: $bases}, quote: {_eq: $quote}}) { ${FEED_FIELDS} }
      ${tapes}
    }`, {
        bases,
        quote,
        ...(ticks > 0 ? { limit: ticks } : {}),
        ...Object.fromEntries(tapeBases.map((b, i) => [`b${i}`, b])),
    }, signal);
    const feeds = new Map(data.Feed.map((f) => [assetOf(f.base), f]));
    return new Map(bases.map((base, i) => {
        const info = parseFeed(feeds.get(base), base);
        const points = ticks > 0 ? data[`t${i}`] : [];
        if (!Array.isArray(points))
            throw new IndexerError("PriceSnapshots", `Missing tape t${i} for ${base}`);
        return [base, { info, points: points.map((p) => parsePoint(p, info.decimals, base)) }];
    }));
}
/** Feed metadata + current price for one asset (one request). */
export async function getPriceFeedInfo(url, asset, quote) {
    const { where, varDecl } = baseQuoteFilter(quote);
    const data = await gql(url, `query PriceFeed($base: String!${varDecl}) { Feed(where: {${where}}) { ${FEED_FIELDS} } }`, { base: asset.toUpperCase(), ...(quote ? { quote } : {}) });
    return parseFeed(data.Feed[0], asset);
}
/**
 *  The feed catalog — metadata + current price for every tracked asset, or a
 *  filtered subset (one request). Omit `assets` for all; pass a list for a batch.
 *  An explicit empty list returns no rows (not all) — a batch of zero is zero.
 */
export async function listFeeds(url, assets, quote) {
    if (assets && assets.length === 0)
        return [];
    const filtered = assets !== undefined;
    // Compose the operation vars + where conditions from the two optional filters.
    const varDecls = [filtered ? "$bases: [String!]!" : null, quote ? "$quote: String!" : null]
        .filter(Boolean)
        .join(", ");
    const conds = [filtered ? "base: {_in: $bases}" : null, quote ? "quote: {_eq: $quote}" : null]
        .filter(Boolean)
        .join(", ");
    const whereClause = conds ? `where: {${conds}}, ` : "";
    const data = await gql(url, `query PriceFeeds${varDecls ? `(${varDecls})` : ""} { Feed(${whereClause}order_by: {base: asc}) { ${FEED_FIELDS} } }`, { ...(filtered ? { bases: assets.map((a) => a.toUpperCase()) } : {}), ...(quote ? { quote } : {}) });
    return data.Feed.map((f) => parseFeed(f));
}
/**
 *  Current price for a batch of assets (or all when `assets` is omitted), newest
 *  snapshot per asset — the multi-asset "price wall". Skips assets with no
 *  observations yet.
 */
export async function getLivePrices(url, assets, quote) {
    const feeds = await listFeeds(url, assets, quote);
    return feeds.map((f) => f.latest).filter((p) => p !== null);
}
/**
 *  Historic ticks for one asset, newest first. Window with `from`/`to` (unix
 *  seconds, chain time); page with `limit`.
 */
export async function getPriceHistory(url, asset, opts, quote) {
    // asset + quote → GraphQL variables (never interpolated); from/to are
    // Math.floor'd integers, so plain-number interpolation is injection-safe.
    const clauses = ["{base: {_eq: $base}}"];
    if (quote)
        clauses.push("{quote: {_eq: $quote}}");
    if (opts?.from !== undefined)
        clauses.push(`{blockTimestamp: {_gte: "${Math.floor(opts.from)}"}}`);
    if (opts?.to !== undefined)
        clauses.push(`{blockTimestamp: {_lte: "${Math.floor(opts.to)}"}}`);
    const data = await gql(url, `query PriceHistory($base: String!, $limit: Int!${quote ? ", $quote: String!" : ""}) {
      PricePoint(where: {_and: [${clauses.join(", ")}]}, order_by: {blockTimestamp: desc}, limit: $limit) { ${POINT_FIELDS} }
    }`, { base: asset.toUpperCase(), limit: opts?.limit ?? 500, ...(quote ? { quote } : {}) });
    // decimals is fixed at the oracle's scale (18); no Feed round-trip needed.
    return data.PricePoint.map((p) => parsePoint(p, Types.PRICE_FEED_DECIMALS, asset));
}
/**
 *  OHLC candles for one asset + resolution — the MOST RECENT `limit` (or the
 *  `from`/`to` window when given, unix seconds), returned OLDEST first so it's
 *  chart-ready. Like a klines API: omitting the window yields the latest candles,
 *  not the first ever.
 */
export async function getPriceCandles(url, asset, resolution, opts, quote) {
    // asset + quote → GraphQL variables; resolution is a typed enum literal
    // (M1|H1|D1), from/to are Math.floor'd integers — all injection-safe.
    const clauses = ["{base: {_eq: $base}}", `{resolution: {_eq: ${resolution}}}`];
    if (quote)
        clauses.push("{quote: {_eq: $quote}}");
    if (opts?.from !== undefined)
        clauses.push(`{bucketStart: {_gte: "${Math.floor(opts.from)}"}}`);
    if (opts?.to !== undefined)
        clauses.push(`{bucketStart: {_lte: "${Math.floor(opts.to)}"}}`);
    // Fetch newest-first so `limit` keeps the MOST RECENT candles (the feed now
    // holds days of history — asc + limit would pin the chart to the oldest ones),
    // then reverse to oldest→newest for charting.
    const data = await gql(url, `query PriceCandles($base: String!, $limit: Int!${quote ? ", $quote: String!" : ""}) {
      Candle(where: {_and: [${clauses.join(", ")}]}, order_by: {bucketStart: desc}, limit: $limit) { ${CANDLE_FIELDS} }
    }`, { base: asset.toUpperCase(), limit: opts?.limit ?? 500, ...(quote ? { quote } : {}) });
    return data.Candle.reverse().map((c) => parseCandle(asset.toUpperCase(), c, Types.PRICE_FEED_DECIMALS));
}
/**
 *  Validate a successful subscription payload before acknowledging delivery.
 *
 *  `field` names the payload key because the two tape subscriptions carry
 *  different ones: the price side is `Feed`, the tape is `PricePoint_stream`.
 *
 *  A payload that fails is NOT a delivery: one malformed row rejects the whole
 *  push, so it neither confirms the subscription nor mutates retained rows. An
 *  empty array is valid and confirms without inventing a price.
 */
export function isFeedPayload(value, field) {
    if (typeof value !== "object" || value === null)
        return false;
    const rows = Reflect.get(value, field);
    return (Array.isArray(rows) &&
        rows.every((row) => {
            if (typeof row !== "object" || row === null)
                return false;
            return (["symbol", "base", "quote", "description"].every((key) => nullableString(Reflect.get(row, key))) &&
                (Reflect.get(row, "decimals") === null || Number.isInteger(Reflect.get(row, "decimals"))) &&
                [
                    "latestSpot",
                    "latestMark",
                    "latestBlockNumber",
                    "latestBlockTimestamp",
                    "latestUpdatedAtMs",
                    "latestSourceUpdatedAtMs",
                ].every((key) => numericString(Reflect.get(row, key), true)) &&
                (Reflect.get(row, "latestResynced") === null || typeof Reflect.get(row, "latestResynced") === "boolean"));
        }));
}
/** As {@link isFeedPayload}, for the tick tape's rows.
 *
 *  Nullability matches {@link isRawPricePoint}, and has to: `base`, `spot` and
 *  `mark` are null on a tick recorded before a price was available. Rejecting one
 *  here rejects the whole push, and a stream cursor advances at the SERVER
 *  whether or not the client kept the rows - so the batch would be lost for good
 *  rather than retried. The identity and block fields stay strict: they are what
 *  places a row on the tape, and `requestId` is the resume cursor. */
export function isTicksPayload(value, field) {
    if (typeof value !== "object" || value === null)
        return false;
    const rows = Reflect.get(value, field);
    return (Array.isArray(rows) &&
        rows.every((row) => {
            if (typeof row !== "object" || row === null)
                return false;
            return (["id", "requestId", "txHash"].every((key) => typeof Reflect.get(row, key) === "string") &&
                nullableString(Reflect.get(row, "base")) &&
                ["blockNumber", "blockTimestamp"].every((key) => numericString(Reflect.get(row, key), false)) &&
                ["spot", "mark"].every((key) => numericString(Reflect.get(row, key), true)));
        }));
}
function nullableString(value) {
    return value === null || typeof value === "string";
}
function numericString(value, nullable) {
    return (nullable && value === null) || (typeof value === "string" && /^-?\d+$/.test(value));
}
