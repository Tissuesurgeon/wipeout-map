// Candles — OHLCV buckets, shared across every market kind.
//
// The indexer aggregates fills into fixed buckets; `CANDLE_INTERVALS` is the set
// it materializes, so a caller can only ask for a bucket that exists (an
// arbitrary interval would silently return nothing).
//
// Read-only: candles are derived history. An empty array means "no buckets in
// range", never "the read failed".
import { IndexerError, InvalidInputError } from "./errors.js";
import * as Raise from "./raise.js";
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
/**
 *  OHLCV candles for one pool + interval (any market type), oldest-first
 *  (ready for charting). Rows that share a bucket are ordered by their last
 *  fill: a pool serves one market at a time, so that is market order.
 */
export async function getCandles(poolAddress, intervalSeconds, opts = {}, indexerUrl) {
    const where = {
        pool: { _eq: poolAddress.toLowerCase() },
        intervalSeconds: { _eq: intervalSeconds },
    };
    if (opts.market != null) {
        if (typeof opts.market !== "string" || opts.market.length === 0) {
            throw new InvalidInputError("market must be a non-empty string");
        }
        where.market_id = { _eq: opts.market.toLowerCase() };
    }
    const bs = {};
    if (opts.from != null)
        bs._gte = opts.from;
    if (opts.to != null)
        bs._lte = opts.to;
    if (Object.keys(bs).length)
        where.bucketStart = bs;
    // Cancel before creating the request and shared binding promises. A cold
    // binding must not be left unobserved when the caller already cancelled.
    if (typeof indexerUrl !== "string" && indexerUrl.url && indexerUrl.signal?.aborted) {
        throw indexerUrl.signal.reason;
    }
    const limit = opts.limit ?? 500;
    const data = await IndexerRead.gqlRequest(CandlesQuery, { where, limit }, indexerUrl);
    assertCandleResponse(data);
    const oldest = data.Candle.at(-1)?.bucketStart;
    if (opts.market == null && data.Candle.length === limit && oldest !== undefined) {
        // A pool can have several markets in the boundary bucket. Hasura has no
        // numeric fill-position key, so read that bucket whole before trimming.
        const boundary = await IndexerRead.gqlRequest(CandlesQuery, { where: { ...where, bucketStart: { _eq: oldest } } }, indexerUrl);
        assertCandleResponse(boundary);
        return data.Candle.filter((c) => c.bucketStart !== oldest)
            .concat(boundary.Candle)
            .sort(byBucketThenLastFill)
            .slice(-limit);
    }
    return data.Candle.slice().sort(byBucketThenLastFill);
}
const CANDLE_PAGE = 500;
/**
 *  Every candle in a bounded window, oldest-first. A pool scope holds one row
 *  per market per bucket, so a window can be longer than one page.
 */
export async function getCandlesInWindow(poolAddress, intervalSeconds, opts, indexerUrl) {
    const pages = [];
    let to = opts.to;
    for (;;) {
        const page = await getCandles(poolAddress, intervalSeconds, { ...opts, to, limit: CANDLE_PAGE }, indexerUrl);
        const oldest = page[0]?.bucketStart;
        if (page.length < CANDLE_PAGE || oldest === undefined) {
            pages.unshift(page);
            return pages.flat();
        }
        // The limit can cut the oldest bucket, so the next page reads it whole.
        const whole = page.filter((c) => c.bucketStart !== oldest);
        if (whole.length === 0)
            Raise.unreachable(`more than ${CANDLE_PAGE} markets in one candle bucket`);
        pages.unshift(whole);
        to = Number(oldest);
    }
}
function byBucketThenLastFill(a, b) {
    const bucket = BigInt(a.bucketStart) - BigInt(b.bucketStart);
    if (bucket !== 0n)
        return bucket < 0n ? -1 : 1;
    const [aBlock = "0", aLog = "0"] = a.lastFillId.split("_");
    const [bBlock = "0", bLog = "0"] = b.lastFillId.split("_");
    const block = BigInt(aBlock) - BigInt(bBlock);
    if (block !== 0n)
        return block < 0n ? -1 : 1;
    return Number(aLog) - Number(bLog);
}
// Validate the selected Hasura wire shape here, before any chart/ticker fold.
// The entity uses BigInt for the numeric strings and Int for tradeCount. Keep
// the strings intact so validation cannot round protocol quantities.
function assertCandleResponse(data) {
    if (!data || typeof data !== "object" || Array.isArray(data) || !("Candle" in data)) {
        invalidCandle(data, "data");
    }
    if (!Array.isArray(data.Candle))
        invalidCandle(data.Candle, "data.Candle");
    for (const [index, row] of data.Candle.entries()) {
        const path = `data.Candle[${index}]`;
        if (!row || typeof row !== "object" || Array.isArray(row))
            invalidCandle(row, path);
        for (const field of ["bucketStart", "openPrice", "high", "low", "closePrice", "baseVolume", "quoteVolume"]) {
            const value = Reflect.get(row, field);
            if (typeof value !== "string" || !/^-?\d+$/.test(value))
                invalidCandle(value, `${path}.${field}`);
        }
        const count = Reflect.get(row, "tradeCount");
        if (typeof count !== "number" || !Number.isInteger(count) || count < -2_147_483_648 || count > 2_147_483_647) {
            invalidCandle(count, `${path}.tradeCount`);
        }
        const id = Reflect.get(row, "lastFillId");
        if (typeof id !== "string" || !/^\d+_\d+$/.test(id))
            invalidCandle(id, `${path}.lastFillId`);
    }
}
function invalidCandle(value, path) {
    throw new IndexerError("Candles", "invalid candle response", {
        cause: new TypeError(`invalid selected candle field: ${path}`, { cause: value }),
    });
}
/**
 *  Candle bucket sizes (seconds): 1m, 5m, 15m, 1h, 4h, 1d — the intervals the
 *  indexer rolls up. Keep in lockstep with `indexer/src/intervals.ts`
 *  (CANDLE_INTERVALS) so {@link SomniaMarketsClient.getCandles} is only ever asked for a bucket the
 *  indexer actually materializes.
 *
 * @category models
 */
export const CANDLE_INTERVALS = [60, 300, 900, 3600, 14400, 86400];
// Bucket ordering selects the newest history. getCandles completes the
// boundary bucket and applies numeric fill ordering before its final limit.
// prettier-ignore
const CandlesQuery = graphql(`
  query Candles($where: Candle_bool_exp!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Candle(where: $where, order_by: [{bucketStart: desc}], limit: $limit) {
          bucketStart openPrice high low closePrice baseVolume quoteVolume tradeCount lastFillId
        }
      }
`);
