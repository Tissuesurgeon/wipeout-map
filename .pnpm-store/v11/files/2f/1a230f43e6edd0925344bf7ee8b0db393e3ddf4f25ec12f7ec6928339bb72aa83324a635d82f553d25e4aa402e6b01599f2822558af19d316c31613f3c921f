/**
 * Price scale of the on-chain EMA oracle: prices are 1e18-scaled integers.
 *
 * @category price feeds
 */
export declare const PRICE_FEED_DECIMALS = 18;
/**
 * Candle rollup resolutions the price-feed indexer maintains (60s / 3600s / 86400s).
 *
 * @category price feeds
 */
export type PriceCandleResolution = "M1" | "H1" | "D1";
/**
 * Seconds per {@link PriceCandleResolution}.
 *
 * @category price feeds
 */
export declare const PRICE_RESOLUTION_SECONDS: Record<PriceCandleResolution, number>;
/**
 *  The current price of one asset — the `Feed` singleton, parsed. This is what a
 *  live watch keeps current.
 *
 * @category price feeds
 */
export interface LivePrice {
    /** Asset symbol this feed tracks (e.g. "BTC", "ETH"), uppercased. */
    asset: string;
    /**
     *  Latest price, human units (raw / 1e18). Lossy past ~15 sig figs — use `raw`
     *  for exact math.
     */
    price: number;
    /** Latest EMA-smoothed mark price, human units (the feed's `mark`). */
    ema: number;
    /** Block the latest tick landed in (chain time, monotonic). */
    blockNumber: number;
    /**
     *  Block timestamp of the latest tick — unix seconds, chain time. Use this as a
     *  series x-axis; it never drifts.
     */
    blockTimestamp: number;
    /** Price scale (Feed.decimals, always 18 today). */
    decimals: number;
    /**
     *  Exact 1e18-scaled integer strings — never round-trip money through the
     *  `number` fields above.
     */
    raw: {
        /** Exact spot price — 1e18-scaled integer string. */
        price: string;
        /** Exact EMA mark — 1e18-scaled integer string. */
        ema: string;
    };
}
/**
 *  One raw tick — a `PricePoint` row (one feed tick: the spot median + its EMA
 *  mark), parsed. `price` is the spot index; `ema` is the EMA-smoothed mark.
 *
 * @category price feeds
 */
export interface PricePoint {
    /** Indexer row id (`<txHash>-<symbol>`). */
    id: string;
    /** Asset symbol this tick prices (e.g. "BTC"), uppercased. */
    asset: string;
    /**
     *  Spot index at this tick, human units (raw / 1e18). Lossy past ~15 sig figs —
     *  use `raw` for exact math.
     */
    price: number;
    /** EMA-smoothed mark at this tick, human units (the feed's `mark`). */
    ema: number;
    /**
     *  Somnia-Agents batch request that produced this tick (provenance). One request
     *  prices every symbol in the tick, so all of a tick's rows share it. Decimal
     *  string (uint256).
     */
    requestId: string;
    /** Block the tick landed in (chain time, monotonic). */
    blockNumber: number;
    /** Block timestamp of the tick — unix seconds, chain time. */
    blockTimestamp: number;
    /** Transaction that delivered the tick. */
    txHash: string;
    /** Exact 1e18-scaled integer strings for precise math. */
    raw: {
        /** Exact spot price — 1e18-scaled integer string. */
        price: string;
        /** Exact EMA mark — 1e18-scaled integer string. */
        ema: string;
    };
}
/**
 * One OHLC candle — a `Candle` row, parsed to human units.
 *
 * @category price feeds
 */
export interface PriceCandle {
    /** Asset symbol this candle rolls up (e.g. "BTC"), uppercased. */
    asset: string;
    /** Rollup bucket width — see {@link PriceCandleResolution}. */
    resolution: PriceCandleResolution;
    /** Bucket start — unix seconds, chain time. */
    bucketStart: number;
    /** Spot price at the first tick in the bucket, human units (raw / 1e18). */
    open: number;
    /** Highest spot price in the bucket, human units. */
    high: number;
    /** Lowest spot price in the bucket, human units. */
    low: number;
    /** Spot price at the last tick in the bucket, human units. */
    close: number;
    /** EMA mark at bucket close (the feed's `markClose`). */
    emaClose: number;
    /** Number of feed ticks in the bucket (update density — NOT trade volume). */
    count: number;
}
/**
 * Feed metadata + current price for one asset — the `Feed` singleton, parsed.
 *
 * @category price feeds
 */
export interface PriceFeedInfo {
    /** Asset key (the pair's base, e.g. `BTC`), uppercased. */
    asset: string;
    /** Price scale (Feed.decimals — always 18 today; raw values are 10^decimals-scaled). */
    decimals: number;
    /** The feed's on-chain pair symbol, e.g. `BTC/USDT`. */
    symbol: string | null;
    /** Base asset, e.g. `BTC`. */
    base: string | null;
    /** Quote asset, e.g. `USDT`. */
    quote: string | null;
    /** Free-form feed description from the scheduler, or null when unset. */
    description: string | null;
    /**
     *  When the oracle last WROTE this feed — unix **milliseconds**, or null if
     *  unknown. This is the freshness signal to judge a price by: the feed ticks
     *  ~1/s, so an age beyond a few seconds means the asset has stalled.
     *
     *  A live subscription does NOT keep this moving on a stalled asset — a feed
     *  that stops updating simply stops pushing, so the value freezes and its age
     *  grows. Compute age against a local clock (`Date.now() - updatedAtMs`) and
     *  re-render on a timer; do not wait for a data event that will never arrive.
     */
    updatedAtMs: number | null;
    /**
     *  When the underlying market data was timestamped at the SOURCE — unix
     *  milliseconds, or null if unknown. Compare against {@link updatedAtMs} to
     *  separate "the oracle stopped writing" from "the oracle is writing, but with
     *  stale source data": a large `updatedAtMs - sourceUpdatedAtMs` gap means the
     *  price was already old when it landed on chain.
     */
    sourceUpdatedAtMs: number | null;
    /**
     *  Whether the last write was a resync (a correction/backfill rather than a
     *  routine tick), or null if unknown.
     */
    resynced: boolean | null;
    /**
     *  Current price (same value a live watch keeps current), or null if the feed
     *  has no observations yet.
     */
    latest: LivePrice | null;
}
/**
 *  Per-asset watch state: `"unwatched"` (no active watch — live reads return
 *  null/empty), `"hydrating"` (snapshot/subscribe in progress), `"live"`
 *  (streaming; reads are current to the last pushed tick), `"error"` (the server
 *  rejected or terminated this asset's subscription).
 *
 *  The default status includes an acquired tape. A tape failure can leave the
 *  current-price stream active for latest-only readers. Pass `ticks: false` to
 *  the owner's status/health read to inspect current-price delivery alone.
 *
 *  Treat `"error"` as "a required stream has stopped and needs a new watch".
 *  Failed streams retain their last values. Check the state of the data you
 *  render so a stopped stream does not appear live. The
 *  server sends this for a validation failure (a schema change) or a permission
 *  denial, so it will not heal by itself: stop the watch and start a new one.
 *  Each rejection is also emitted as a `warn` event on the client's debug
 *  channel (see `ClientConfig.debug`) with the server payload.
 *
 * @category price feeds
 */
export type PriceFeedStatus = "unwatched" | "hydrating" | "live" | "error";
/**
 *  Per-asset watch state: `"unwatched"` (no active watch — live reads return
 *  null/empty), `"hydrating"` (snapshot/subscribe in progress), `"hydrated"`
 *  (snapshot ready), `"streaming"` (all acquired streams delivered valid data),
 *  `"stale"` (known delivery loss; last values remain), `"error"` (the server
 *  rejected or terminated this asset's subscription).
 *
 *  The default status includes an acquired tape. A tape failure can leave the
 *  current-price stream active for latest-only readers. Pass `ticks: false` to
 *  the owner's status/health read to inspect current-price delivery alone.
 *
 *  Treat `"error"` as "a required stream has stopped and needs a new watch".
 *  Failed streams retain their last values. Check the state of the data you
 *  render so a stopped stream does not appear live. The
 *  server sends this for a validation failure (a schema change) or a permission
 *  denial, so it will not heal by itself: stop the watch and start a new one.
 *  Each rejection is also emitted as a `warn` event on the client's debug
 *  channel (see `ClientConfig.debug`) with the server payload.
 *
 * @category price feeds
 */
export type PriceFeedHealth = "unwatched" | "hydrating" | "hydrated" | "streaming" | "stale" | "error";
