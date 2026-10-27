import { InvalidInputError } from "../errors.js";
/**
 * Time window for the metrics.
 *
 * @category analytics
 */
export type PortfolioTimeframe = "24h" | "7d" | "30d" | "all";
/**
 * A trade the account took part in, human USD-quote units.
 *
 * @category analytics
 */
export interface PortfolioTradeEvent {
    /** Event kind. */
    kind: "trade";
    /** Event time (ms). */
    timestamp: number;
    /** The market the event belongs to (any stable key; symbol works). */
    market: string;
    /** Trade direction from the account's perspective. */
    side: "buy" | "sell";
    /** Base size exchanged, human units (positive). */
    baseAmount: number;
    /** Quote value exchanged, human USD units (positive). */
    quoteAmount: number;
}
/**
 *  External capital entering or leaving the wallet — a bridge delivery, a
 *  transfer from another wallet, a withdrawal.
 *
 *  Funding events refine the MWRR capital base ONLY. They never touch the
 *  equity curve, PnL, or volume: moving money into an account is not profit,
 *  and it is not a trade.
 *
 *  Venue fills are NOT funding. A trade's settlement transfer is an internal
 *  rearrangement the trade event already carries, so a caller sourcing funding
 *  from raw token transfers MUST exclude transfers whose counterparty is a
 *  venue contract (pool, router, settlement) or the same capital is counted
 *  twice.
 *
 *  These are caller-supplied because the SDK cannot derive them: the indexer
 *  has no wallet token-transfer entity, and the public Somnia RPC caps
 *  `eth_getLogs` at 1,000 blocks. Source them from app records, bridge
 *  history, or a private RPC scan, valued in USD at the event time.
 *
 * @category analytics
 */
export interface PortfolioFundingEvent {
    /** Event kind. */
    kind: "funding";
    /** Event time (ms). */
    timestamp: number;
    /** Whether capital entered or left the wallet. */
    direction: "in" | "out";
    /** Absolute value moved, human USD units (positive). */
    valueUsd: number;
    /**
     *  Numeric chain id the movement happened on. Set it, with `transferId` and
     *  `counterpartyChainId`, on a BRIDGE leg so a multi-chain exchange can pair
     *  the origin and destination legs of one transfer between its own chains and
     *  drop both — see {@link netInternalTransfers}. Optional; a plain deposit or
     *  withdrawal leaves all three unset.
     */
    chainId?: number;
    /**
     *  The bridge transfer both legs belong to (the warp-route message id, or any
     *  id the app assigns to one transfer). Legs with the same id and opposite
     *  `direction` are one transfer.
     */
    transferId?: string;
    /** The chain the other leg of a bridge transfer lands on (out) or came from (in). */
    counterpartyChainId?: number;
}
/**
 *  Remove the bridge legs that move capital between an exchange's OWN chains
 *  from a funding list. A transfer from one configured chain to another leaves
 *  the account's capital where it was, so counting its origin leg as a
 *  withdrawal and its destination leg as a deposit distorts the capital base
 *  on both sides.
 *
 *  **Details**
 *
 *  - Two legs with the same `transferId`, opposite `direction`, and both
 *    `chainId`s in `chainIds` are one internal transfer: both are dropped.
 *  - An `out` leg whose `counterpartyChainId` is in `chainIds` but whose `in`
 *    leg is absent (still in flight, or outside the window) is dropped alone:
 *    the capital is in transit and stays in the base.
 *  - An `in` leg whose `counterpartyChainId` is in `chainIds` but whose `out`
 *    leg is absent is dropped for the same reason — the capital was already in
 *    the base on the origin chain.
 *  - Every other event, including a leg to or from a chain outside `chainIds`,
 *    is an external movement and passes through unchanged.
 *
 *  Pure: returns a new array, in the input order.
 *
 * @category analytics
 */
export declare function netInternalTransfers(events: readonly PortfolioFundingEvent[], chainIds: readonly number[]): PortfolioFundingEvent[];
/**
 * One portfolio-affecting event, human USD-quote units.
 *
 * @category analytics
 */
export type PortfolioFlowEvent = PortfolioTradeEvent | PortfolioFundingEvent;
/**
 * A market's mark-price series: [timestampMs, price][], oldest first.
 *
 * @category analytics
 */
export type MarkSeries = ReadonlyArray<readonly [number, number]>;
/**
 * Mark sources per market key, plus a fallback price for quiet markets.
 *
 * @category analytics
 */
export interface MarkSources {
    /** Candle-close series per market (oldest first). */
    series: ReadonlyMap<string, MarkSeries>;
    /** Last known price per market, used when a series has no sample yet. */
    lastPrice: ReadonlyMap<string, number>;
}
/**
 * One sample of the equity (cumulative window PnL) series.
 *
 * @category analytics
 */
export interface EquityPoint {
    /** Sample time (ms). */
    t: number;
    /** Cumulative realized + unrealized PnL since the window start, USD. */
    valueUsd: number;
}
/**
 * One sample of the holdings series: the traded book, marked.
 *
 * @category analytics
 */
export interface HoldingsPoint {
    /** Sample time (ms). */
    t: number;
    /** Marked value of the open positions this sample could price, USD. */
    valueUsd: number;
    /**
     *  How many open markets this sample could NOT price, and so left out of
     *  {@link HoldingsPoint.valueUsd}.
     *
     *  A market with no candle sample and no last price has no mark. The fold
     *  values that position at zero, which is a real price standing in for a
     *  missing one — so the level silently loses a position the wallet still
     *  holds. This count is how a caller knows. Zero means the sample priced
     *  everything and the value is the whole book.
     *
     *  Present the shortfall rather than hiding it. A wallet holding one quiet
     *  market reads as poorer than it is, which is the fault SMK-45 reports at
     *  the account level.
     */
    unpricedMarkets: number;
}
/**
 * One PnL bucket: the PnL attributed to (prevSample, t].
 *
 * @category analytics
 */
export interface PnlBucket {
    /** Bucket end time (ms). */
    t: number;
    /** Signed PnL attributed to the bucket, USD. */
    pnlUsd: number;
}
/**
 * The computed metrics plane — mirrors what a portfolio page renders.
 *
 * @category analytics
 */
export interface PortfolioAnalytics {
    timeframe: PortfolioTimeframe;
    /** Upper bound of the series (ms). */
    asOf: number;
    /** Cumulative window PnL over time, oldest first; first point is 0. */
    equity: EquityPoint[];
    /**
     *  Marked value of the traded book over time, oldest first, on the same
     *  sample grid as {@link PortfolioAnalytics.equity}. The first point is the
     *  carried-in book valued at the window start, not zero.
     *
     *  This series is a LEVEL, where `equity` is a change. It sums `qty × mark`
     *  over every open position at each sample, before the cost basis is taken
     *  off.
     *
     *  It sums SIGNED position value. Every book this fold keeps today is
     *  long-only, because `applyTrade` floors each market's quantity at zero, so
     *  today the sum cannot go below zero. Do not lock a chart axis to that. The
     *  module note above commits this fold to taking the perp plane as new event
     *  kinds, a perp book is signed, and a short marks negative.
     *
     *  The marks are the caller's, and this fold does not validate them. A
     *  negative price carries into this value unchanged, exactly as it already
     *  carries into the PnL and MWRR figures.
     *
     *  A position the sample cannot price is left OUT of the value rather than
     *  guessed at, and {@link HoldingsPoint.unpricedMarkets} counts what was
     *  left out. Check it before presenting a sample as the whole book.
     *
     *  It measures the TRADED BOOK, not the wallet. A token that arrived without
     *  a fill — bridged in, transferred in, minted — is not in the book, so it is
     *  not in this value. Idle quote balance is not a position, so it is not
     *  included either. {@link PortfolioFundingEvent}s refine the capital base
     *  only, so a deposit inside the window does not step this curve. Read
     *  balances from the chain when you need what the wallet itself is worth.
     */
    holdings: HoldingsPoint[];
    pnl: {
        /** Signed total PnL over the timeframe, USD (== last equity point). */
        totalUsd: number;
        buckets: PnlBucket[];
    };
    mwrr: {
        /**
         *  Period money-weighted return as a fraction: {@link gainUsd} over
         *  {@link weightedCapitalUsd}. Not annualized.
         *
         *  Null when the capital base is not meaningfully positive — at or below one
         *  US cent, which includes a base driven negative by withdrawals or by an
         *  account extracting more than it put in. Null is not zero: the other
         *  fields stay readable so a caller can present the window another way.
         *
         *  On the funding basis this can exceed 100% in either direction, because
         *  capital at risk for only part of the window is weighted down while the
         *  gain covers all of it. That is what a money-weighted period rate states,
         *  so it is reported rather than withheld. Read
         *  {@link weightedCapitalUsd} to see how much capital the figure measures
         *  against before presenting it as a headline.
         */
        return: number | null;
        /** Signed money gained over the period, USD. */
        gainUsd: number;
        /**
         *  Unweighted capital base: carried-in position value + the window's net
         *  flows, per {@link capitalBasis}. On the trades basis, buys deploy
         *  capital and the MATCHED proceeds of sells return it — proceeds of
         *  tokens never bought on the venue are scored nowhere, so an external
         *  seller reads 0 rather than a negative base. Signed.
         */
        depositedUsd: number;
        /**
         *  The denominator the return divides by. On the funding basis this is the
         *  Modified Dietz base: carried-in value plus each external movement
         *  weighted by the fraction of the window remaining after it. On the trades
         *  basis it equals {@link depositedUsd}, because a trade moves capital
         *  already inside the account and weighting it would collapse the base for
         *  an account that merely rearranged what it held. Signed.
         */
        weightedCapitalUsd: number;
        /**
         *  Which definition produced the capital figures. `"funding"` when the
         *  caller supplied {@link PortfolioFundingEvent}s that fall inside the
         *  window, else `"trades"` — the proxy, which cannot see capital that never
         *  passed through a trade. Funding that predates the window does not select
         *  the funding basis: it contributes no in-window flow, and any capital it
         *  left invested is already in the carried-in position's value, which both
         *  bases count. Branch on this rather than on the package version.
         */
        capitalBasis: "trades" | "funding";
    };
    volume: {
        /** Trading volume over the timeframe, USD. */
        periodUsd: number;
        /** Volume across every supplied event, USD. */
        lifetimeUsd: number;
        /** Volume since `sessionSince`, when supplied. */
        sessionUsd?: number;
    };
    feesSaved: {
        /** The comparison taker rate (bps) the savings are computed against. */
        cexRateBps: number;
        /** Volume × rate over the timeframe, USD. */
        periodUsd: number;
        /** Volume × rate across every supplied event, USD. */
        lifetimeUsd: number;
    };
}
/**
 *  Default comparison taker rate for the fees-saved metric, bps. 10 bps ≈ the
 *  common CEX taker tier the gateway compared against.
 *
 * @category analytics
 */
export declare const DEFAULT_CEX_RATE_BPS = 10;
/**
 * Options for {@link computePortfolioAnalytics}.
 *
 * @category analytics
 */
export interface PortfolioAnalyticsOptions {
    timeframe: PortfolioTimeframe;
    /** Upper bound of the series (ms) — the caller's clock. */
    asOf: number;
    /** Marks for unrealized valuation. */
    marks: MarkSources;
    /** Session start (ms) for `volume.sessionUsd`. */
    sessionSince?: number;
    /**
     * Comparison taker rate, bps.
     *
     * @default {@link DEFAULT_CEX_RATE_BPS}
     */
    cexRateBps?: number;
}
/**
 *  Every error {@link computePortfolioAnalytics} can throw.
 *
 *  The fold is pure and touches no network or chain, so a bad argument is the
 *  only way it fails.
 *
 * @category analytics
 */
export type ComputePortfolioAnalyticsError = InvalidInputError;
/**
 *  Fold portfolio flow events into the metrics plane. PURE — every input is
 *  explicit, so it runs identically in apps, bots, and tests. `events` may
 *  arrive in any order; they are sorted oldest-first internally. Events
 *  before the window establish the carried-in cost basis; events inside it
 *  drive the equity curve.
 *
 *  Supply {@link PortfolioFundingEvent}s to measure the return against real
 *  external capital. Without them the capital base falls back to a trades-only
 *  proxy that overstates the return for an account trading a small part of its
 *  balance; `mwrr.capitalBasis` reports which definition applied.
 *
 * **Gotchas**
 *
 * - Throws {@link InvalidInputError} — a sampling bound is not a finite number: `asOf`, any event's `timestamp`, or the window start they derive. The equity series is sampled from those bounds, so a non-finite one leaves the loop's exit comparison false forever and the process allocates until it dies. The offending field is named in the message. Nothing is substituted and no event is dropped — an invalid time is the caller's to fix, and guessing one would silently misplace money on the curve.
 *
 * @category analytics
 */
export declare function computePortfolioAnalytics(events: readonly PortfolioFlowEvent[], opts: PortfolioAnalyticsOptions): PortfolioAnalytics;
