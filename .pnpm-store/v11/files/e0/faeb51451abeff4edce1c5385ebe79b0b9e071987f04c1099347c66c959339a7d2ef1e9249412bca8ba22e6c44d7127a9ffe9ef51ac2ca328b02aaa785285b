import * as IndexerRead from "./indexerRead.js";
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
export declare function getCandles(poolAddress: string, intervalSeconds: number, opts: GetCandlesOptions | undefined, indexerUrl: IndexerRead.Source): Promise<Candle[]>;
/**
 *  Every candle in a bounded window, oldest-first. A pool scope holds one row
 *  per market per bucket, so a window can be longer than one page.
 */
export declare function getCandlesInWindow(poolAddress: string, intervalSeconds: number, opts: {
    from: number;
    to: number;
    market?: string;
}, indexerUrl: IndexerRead.Source): Promise<Candle[]>;
/**
 *  Candle bucket sizes (seconds): 1m, 5m, 15m, 1h, 4h, 1d — the intervals the
 *  indexer rolls up. Keep in lockstep with `indexer/src/intervals.ts`
 *  (CANDLE_INTERVALS) so {@link SomniaMarketsClient.getCandles} is only ever asked for a bucket the
 *  indexer actually materializes.
 *
 * @category models
 */
export declare const CANDLE_INTERVALS: readonly [60, 300, 900, 3600, 14400, 86400];
