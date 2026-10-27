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

// `openPrice`/`closePrice` are suffixed because `open`/`close` are envio reserved words.
/**
 *  One OHLCV candle (mirror of the indexer `Candle` entity). Candles exist for
 *  ANY pool — spot or binary — so this is unprefixed, not binary-specific.
 *  Prices are raw quote units per whole base (binary: the YES-probability
 *  scale, same as `lastPrice`); volumes are raw.
 *
 * @category models
 */
export type Candle = {
  /** Bucket-open timestamp (unix seconds), aligned to the interval. */
  bucketStart: string;
  /** First fill price in the bucket (raw). */
  openPrice: string;
  /** Highest fill price in the bucket (raw). */
  high: string;
  /** Lowest fill price in the bucket (raw). */
  low: string;
  /** Last fill price in the bucket (raw). */
  closePrice: string;
  /** Base/outcome-token volume in the bucket (raw). */
  baseVolume: string;
  /** Quote/collateral volume in the bucket (raw). */
  quoteVolume: string;
  /** Number of fills in the bucket. */
  tradeCount: number;
  /** Newest fill id in the bucket (`${blockNumber}_${logIndex}`), for exact open-bucket reconciliation. */
  lastFillId: string;
};

/**
 *  Options for {@link SomniaMarketsClient.getCandles}. All optional.
 *
 * @category models
 */
export type GetCandlesOptions = {
  /** Max buckets (default 500). */
  limit?: number;
  /** Only buckets at/after this unix-seconds timestamp. */
  from?: number;
  /** Only buckets at/before this unix-seconds timestamp. */
  to?: number;
  /**
   *  Only this market's candles (bytes32 marketId, case-insensitive).
   *
   *  A binary pool is recycled by successive markets, so the pool alone returns
   *  every market it has served, with two rows for a bucket that spans a recycle.
   *  On spot and perp the market id is the pool address.
   */
  market?: string;
};

/**
 *  OHLCV candles for one pool + interval (any market type), oldest-first
 *  (ready for charting). Rows that share a bucket are ordered by their last
 *  fill: a pool serves one market at a time, so that is market order.
 */
export async function getCandles(
  poolAddress: string,
  intervalSeconds: number,
  opts: GetCandlesOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<Candle[]> {
  const where: Record<string, unknown> = {
    pool: { _eq: poolAddress.toLowerCase() },
    intervalSeconds: { _eq: intervalSeconds },
  };
  if (opts.market != null) {
    if (typeof opts.market !== "string" || opts.market.length === 0) {
      throw new InvalidInputError("market must be a non-empty string");
    }
    where.market_id = { _eq: opts.market.toLowerCase() };
  }
  const bs: Record<string, number> = {};
  if (opts.from != null) bs._gte = opts.from;
  if (opts.to != null) bs._lte = opts.to;
  if (Object.keys(bs).length) where.bucketStart = bs;
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
    const boundary = await IndexerRead.gqlRequest(
      CandlesQuery,
      { where: { ...where, bucketStart: { _eq: oldest } } },
      indexerUrl,
    );
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
export async function getCandlesInWindow(
  poolAddress: string,
  intervalSeconds: number,
  opts: { from: number; to: number; market?: string },
  indexerUrl: IndexerRead.Source,
): Promise<Candle[]> {
  const pages: Candle[][] = [];
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
    if (whole.length === 0) Raise.unreachable(`more than ${CANDLE_PAGE} markets in one candle bucket`);
    pages.unshift(whole);
    to = Number(oldest);
  }
}

function byBucketThenLastFill(a: Candle, b: Candle): number {
  const bucket = BigInt(a.bucketStart) - BigInt(b.bucketStart);
  if (bucket !== 0n) return bucket < 0n ? -1 : 1;
  const [aBlock = "0", aLog = "0"] = a.lastFillId.split("_");
  const [bBlock = "0", bLog = "0"] = b.lastFillId.split("_");
  const block = BigInt(aBlock) - BigInt(bBlock);
  if (block !== 0n) return block < 0n ? -1 : 1;
  return Number(aLog) - Number(bLog);
}

// Validate the selected Hasura wire shape here, before any chart/ticker fold.
// The entity uses BigInt for the numeric strings and Int for tradeCount. Keep
// the strings intact so validation cannot round protocol quantities.
function assertCandleResponse(data: unknown): asserts data is { Candle: Candle[] } {
  if (!data || typeof data !== "object" || Array.isArray(data) || !("Candle" in data)) {
    invalidCandle(data, "data");
  }
  if (!Array.isArray(data.Candle)) invalidCandle(data.Candle, "data.Candle");
  for (const [index, row] of data.Candle.entries()) {
    const path = `data.Candle[${index}]`;
    if (!row || typeof row !== "object" || Array.isArray(row)) invalidCandle(row, path);
    for (const field of ["bucketStart", "openPrice", "high", "low", "closePrice", "baseVolume", "quoteVolume"]) {
      const value: unknown = Reflect.get(row, field);
      if (typeof value !== "string" || !/^-?\d+$/.test(value)) invalidCandle(value, `${path}.${field}`);
    }
    const count: unknown = Reflect.get(row, "tradeCount");
    if (typeof count !== "number" || !Number.isInteger(count) || count < -2_147_483_648 || count > 2_147_483_647) {
      invalidCandle(count, `${path}.tradeCount`);
    }
    const id: unknown = Reflect.get(row, "lastFillId");
    if (typeof id !== "string" || !/^\d+_\d+$/.test(id)) invalidCandle(id, `${path}.lastFillId`);
  }
}

function invalidCandle(value: unknown, path: string): never {
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
export const CANDLE_INTERVALS = [60, 300, 900, 3600, 14400, 86400] as const;

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
