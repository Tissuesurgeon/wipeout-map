/**
 *  Funding-rate normalization.
 *
 *  The one thing to understand before reading a perp funding rate: it is a **per
 *  calculation-window** fraction, not a per-interval one and not an annual one. Every
 *  rate this SDK surfaces — `PerpState.fundingRate`, `FundingRateUpdate.fundingRate`,
 *  the raw values on chain — is scaled to `fundingWindowSec`, which is 28800 (8h) on
 *  every live pool.
 *
 *  Each settlement interval accrues `rate / n` of it, where
 *
 *  ```
 *  n = fundingWindowSec / fundingIntervalSec
 *  ```
 *
 *  `n` is **8** on every live pool (28800 / 3600). It has been **96** at a 300s
 *  settlement cadence, and the same emitted rate value means a **12x different**
 *  per-interval accrual across that boundary — which still reaches any consumer reading
 *  indexed history. That is why every row carries its own `fundingWindowSec` and why
 *  these helpers take it as an argument: hardcoding the denominator is the single most
 *  expensive mistake available here, and it produces a plausible-looking chart rather
 *  than an error.
 *
 *  @packageDocumentation
 */
/**
 * Fixed-point scale for every rate and cumulative-index value (1e18).
 *
 * @category funding
 */
export declare const FUNDING_PRECISION = 1000000000000000000n;
/**
 * Seconds in the 8-hour presentation axis.
 *
 * @category funding
 */
export declare const EIGHT_HOURS_SEC = 28800;
/**
 * Seconds in an hour.
 *
 * @category funding
 */
export declare const ONE_HOUR_SEC = 3600;
/**
 * Seconds in a 365-day year, for annualization.
 *
 * @category funding
 */
export declare const ONE_YEAR_SEC = 31536000;
/**
 *  Re-express a per-window funding rate on a different denominator.
 *
 *  `rate_target = rate * targetSec / fundingWindowSec`, in 1e18 fixed point. Truncates
 *  toward zero, matching the contract's integer arithmetic; sign is preserved.
 *
 * **Details**
 *
 * - `rate`: the rate as stored/emitted: per `fundingWindowSec`, 1e18-scaled, signed
 * - `fundingWindowSec`: the rate's denominator, from the same row or state read
 * - `targetSec`: the denominator to convert to
 *
 * **Example** (Normalizing an interval rate)
 *
 *  ```ts
 *  const perInterval = normalizeFundingRate(st.fundingRate, st.fundingWindowSec, st.fundingIntervalSec);
 *  ```
 *
 * @category funding
 */
export declare function normalizeFundingRate(rate: bigint, fundingWindowSec: number, targetSec: number): bigint;
/**
 *  The rate per 8 hours — the primary presentation axis, matching the convention used by
 *  Hyperliquid and Binance.
 *
 *  A no-op while `fundingWindowSec` is 28800, which it is on every live pool. Use it
 *  anyway: it is what keeps a chart correct across a window change.
 *
 * @category funding
 */
export declare function fundingRate8h(rate: bigint, fundingWindowSec: number): bigint;
/**
 * The rate per hour.
 *
 * @category funding
 */
export declare function fundingRate1h(rate: bigint, fundingWindowSec: number): bigint;
/**
 *  The rate that accrues per settlement interval — what an account actually pays or
 *  receives at each settlement.
 *
 * @category funding
 */
export declare function fundingRatePerInterval(rate: bigint, fundingWindowSec: number, fundingIntervalSec: number): bigint;
/**
 *  Annualized funding rate as a JS number fraction (0.01 = 1% APR).
 *
 *  Returns a `number` deliberately, unlike its siblings: APR is a display quantity, and
 *  at an 8h window this is roughly `rate x 1095`, so the 1e18 scale carries far more
 *  precision than any axis label needs. Never round-trip a settlement amount through it.
 *
 * @category funding
 */
export declare function annualizedFundingRate(rate: bigint, fundingWindowSec: number): number;
/**
 *  Intervals per calculation window — `n`. The per-interval divisor: each settlement
 *  accrues `rate / n` of the emitted per-window rate.
 *
 *  **It is not a cap on what a lazily-settled emit accrues, and never treat it as one.**
 *  The contract's catch-up horizon is ONE interval, so a settlement charges at most
 *  `rate / n` however long the gap was, and the excess is forgiven rather than deferred.
 *  Read `FundingRateUpdate.intervalsAccrued` for what a given settlement actually
 *  accrued; deriving it as `min(intervalsSettled, n)` is the specific error the protocol
 *  interface warns against, and it renders funding across intervals that were forgiven.
 *
 * @category funding
 */
export declare function intervalsPerWindow(fundingWindowSec: number, fundingIntervalSec: number): number;
/**
 *  Realized funding over a range, in raw quote units per WHOLE base unit.
 *
 *  Takes the two cumulative-index samples rather than a rate, because the cumulative
 *  index is the ground truth for accrual: the difference is exact over any range, with
 *  no interpolation, no zero-fill reasoning and no cap arithmetic. A rate-based estimate
 *  is not equivalent — it cannot see forgiven intervals or index-price movement.
 *
 *  The result is in RAW quote units (atoms). To show it as a token amount, divide by
 *  `10 ** quoteDecimals` — and note the collateral is 18dp on the live deployment, so a
 *  human figure is `(end - start) / 1e18 / 1e18`. Treating the returned value as whole
 *  tokens overstates it by the quote scale.
 *
 *  Signed: positive means longs paid shorts over the range.
 *
 * @category funding
 */
export declare function realizedFundingPerBase(cumulativeStart: bigint, cumulativeEnd: bigint): bigint;
/**
 *  Whether a pool's funding has gone stale — no settlement for `staleAfterIntervals`
 *  worth of time.
 *
 *  Settlement is permissionless and LAZY, so a due settlement simply may not have
 *  happened. One missed interval is routine; a sustained gap means funding is not
 *  accruing, and on the zero-open-interest branch it is being forgiven with no event at
 *  all. Two intervals is a deliberately forgiving default.
 *
 * @category funding
 */
export declare function isFundingStale(lastFundingUpdateAt: bigint, fundingIntervalSec: number, nowSec: bigint, staleAfterIntervals?: number): boolean;
/**
 * The subset of a funding candle this densification needs.
 *
 * @category funding
 */
export interface FundingBucketLike {
    bucketStart: string;
    intervalSeconds: number;
}
/**
 *  Fill the bucket-grid slots a candle query did not return, over `[from, to)`.
 *
 *  Rollup candles are **sparse by construction**: a window touched by no settlement's
 *  covered span produces no row, because nothing triggered a write. A chart that plots
 *  the rows as-is silently closes those gaps and draws funding that never accrued.
 *
 *  This is the ONLY densification the presentation tier should do, and the constraint is
 *  as much about what it must not do:
 *
 *  - Missing slots are emitted as **zero** rate with **zero coverage** — never as a
 *    carry-forward of the previous rate. Carrying forward is the specific error the
 *    protocol docs call out: gaps are genuinely zero-funding intervals, and carrying the
 *    last rate through the 22h outage these pools actually had would fabricate ~2.6% of
 *    funding out of nothing.
 *  - It is not interpolation. Nothing is smoothed, and no real value is altered.
 *  - `coverage: "0"` is what lets a chart hatch or grey the slot rather than draw a zero
 *    that looks like a measurement. A filled slot and a genuinely-zero measured slot are
 *    different facts, and only `coverage` distinguishes them.
 *  - **It never fills slots older than the oldest row it was given.** This is the
 *    truncation guard, and it matters because `listFundingRateCandles` pages
 *    newest-first: 30 days of hourly buckets is 720 rows against a default `limit` of
 *    500, so a caller who asks for a month gets the newest 500 and no indication that
 *    anything was dropped. Filling the 220 missing older slots would render nine days as
 *    a funding pause that never happened — reintroducing exactly the ambiguity
 *    `coverage` exists to remove, one layer up. Refusing to invent them means the window
 *    can come back SHORTER than `[from, to)`: read the first element's `bucketStart`
 *    rather than assuming it equals `from`, and page with `offset` if you need the rest.
 *
 *  Returned oldest-first, which is chart order — note that `listFundingRateCandles`
 *  serves newest-first.
 *
 * **Details**
 *
 * - `candles`: rows from {@link SomniaMarketsClient.listFundingRateCandles | client.listFundingRateCandles}, any order
 * - `intervalSeconds`: the grid resolution the rows were queried at
 * - `from`: window start, unix seconds (snapped down to the grid)
 * - `to`: window end, unix seconds (exclusive)
 *
 * @category funding
 */
export declare function densifyFundingBuckets<T extends FundingBucketLike>(candles: readonly T[], intervalSeconds: number, from: number | bigint, to: number | bigint): (T | {
    bucketStart: string;
    intervalSeconds: number;
    avgFundingRate8h: "0";
    coverage: "0";
    filled: true;
})[];
/**
 * One grid slot: either a real rollup row, or a slot no settlement covered.
 *
 * @category funding
 */
export type FundingSeriesBucket<T extends FundingBucketLike = FundingBucketLike> = (T & {
    filled?: undefined;
}) | {
    bucketStart: string;
    intervalSeconds: number;
    avgFundingRate8h: "0";
    coverage: "0";
    filled: true;
};
/**
 * Chart-ready funding buckets plus pagination evidence for the requested window.
 *
 * **Details**
 *
 * Buckets are oldest-first and gapless from the first returned real bucket.
 * `truncated` reports whether older source rows were omitted by the page limit.
 *
 * **Gotchas**
 *
 * A truncated series can start after the requested `from` value. Use
 * `firstBucketStart` and fetch another page instead of drawing the missing
 * history as zero funding.
 *
 * @category funding
 */
export type FundingRateSeries<T extends FundingBucketLike = FundingBucketLike> = {
    /** Oldest-first and gapless on the interval grid — chart order. */
    buckets: FundingSeriesBucket<T>[];
    /**
     *  The read hit its `limit`, so buckets older than `firstBucketStart` exist and were NOT
     *  returned. Page with `offset` for the rest.
     */
    truncated: boolean;
    /** First bucketStart present, unix seconds. Above the requested `from` when truncated. */
    firstBucketStart: number | null;
};
/**
 *  Densify a page of rollup rows into a chart-ready series, and report whether the page
 *  was truncated.
 *
 *  Split out of the React hook on purpose: the truncation rule is the part that misleads
 *  if it is wrong, and it is worth asserting without a DOM. `truncated` is
 *  `rows.length >= limit` — `listFundingRateCandles` pages newest-first, so a FULL page
 *  means older buckets were dropped, NOT that funding stopped. A caller that renders a
 *  truncated window without saying so shows missing history as a funding pause; the
 *  densifier declines to invent those older slots, which is why the returned window can
 *  be shorter than `[from, to)` and why `firstBucketStart` is reported rather than assumed
 *  to equal `from`.
 *
 * **Details**
 *
 * - `rows`: a page from `listFundingRateCandles`, any order
 * - `intervalSeconds`: the grid resolution the rows were queried at
 * - `from`: window start, unix seconds (snapped down to the grid)
 * - `to`: window end, unix seconds (exclusive)
 * - `limit`: the `limit` the page was requested with, for the truncation test
 *
 * @category funding
 */
export declare function buildFundingRateSeries<T extends FundingBucketLike>(rows: readonly T[], intervalSeconds: number, from: number | bigint, to: number | bigint, limit: number): FundingRateSeries<T>;
