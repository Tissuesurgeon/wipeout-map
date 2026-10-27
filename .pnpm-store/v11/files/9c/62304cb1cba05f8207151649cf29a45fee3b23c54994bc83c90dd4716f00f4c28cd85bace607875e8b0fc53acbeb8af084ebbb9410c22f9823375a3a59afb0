// Portfolio analytics — the equity curve / PnL / MWRR / volume metrics plane
// a portfolio page renders, computed purely from indexed activity + candle
// marks. Upstreamed from the DreamDex gateway's GET /v0/portfolio when the
// app moved onto the SDK as its sole data source.
//
// House split: a PURE kernel over typed flow events (this file) + exchange
// wiring that assembles the events from indexer reads. The kernel is
// deliberately event-shaped rather than fill-shaped so the perp account
// plane (funding payments, margin moves) can join the same fold later as new
// event kinds — an equity curve folded from fills alone stops being true the
// day funding exists.
//
// Two series come out of one walk of the books: `holdings` is a level and
// `equity` is a change. The field named `equity` has always been the change,
// and `holdings` exists because consumers read that name and plotted it as a
// level. Their published contracts are on the fields themselves.
//
// Accounting: weighted-average cost per market. Realized PnL accrues on
// sells (proceeds − avg cost of the size sold); unrealized marks the open
// quantity to the nearest candle close at-or-before each sample.
//
// The MWRR capital base has two definitions, and the result says which one it
// used. With caller-supplied funding events it is external capital: the
// carried-in position's value plus deposits minus withdrawals. Without them it
// falls back to a trades-only proxy — carried-in value plus window buys minus
// the MATCHED proceeds of window sells — which is blind to capital that never
// passed through a trade, so it overstates the return for an account that
// trades a small part of its balance.
//
// External capital movements are time-weighted (Modified Dietz), so capital that
// arrived late in the window counts for less than capital held throughout. Trade
// flows are not: a trade moves capital already inside the account, and weighting
// a sale as capital returned and a later repurchase as capital re-deployed
// collapses the base for an account that only rearranged what it held.

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
export function netInternalTransfers(
  events: readonly PortfolioFundingEvent[],
  chainIds: readonly number[],
): PortfolioFundingEvent[] {
  const own = new Set(chainIds);
  const isInternalLeg = (e: PortfolioFundingEvent): boolean =>
    e.chainId !== undefined &&
    own.has(e.chainId) &&
    e.counterpartyChainId !== undefined &&
    own.has(e.counterpartyChainId);
  // A paired transfer drops as a unit and an unpaired internal leg drops alone
  // as in-transit capital, so the rule collapses to one predicate: an internal
  // leg never reaches the fold. `transferId` is what lets a CALLER pair legs; the
  // fold only needs to know both ends are this exchange's chains.
  return events.filter((e) => !isInternalLeg(e));
}

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

/** Window lengths per timeframe (ms); "all" spans every event. */
const TIMEFRAME_MS: Record<Exclude<PortfolioTimeframe, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Equity-series bucket per timeframe (ms). */
const BUCKET_MS: Record<PortfolioTimeframe, number> = {
  "24h": 60 * 60 * 1000,
  "7d": 4 * 60 * 60 * 1000,
  "30d": 24 * 60 * 60 * 1000,
  all: 24 * 60 * 60 * 1000,
};

/**
 *  Default comparison taker rate for the fees-saved metric, bps. 10 bps ≈ the
 *  common CEX taker tier the gateway compared against.
 *
 * @category analytics
 */
export const DEFAULT_CEX_RATE_BPS = 10;

/**
 *  A weighted capital base below this (USD) yields `return: null`. Covers both
 *  ~0 (a ratio against it is ±∞ noise) and negative bases (an account that
 *  withdrew more than it put in — dividing by a negative base would flip the
 *  sign of the return).
 */
const MIN_CAPITAL_BASE_USD = 0.01;

/**
 *  Most samples one fold will produce, per output series.
 *
 *  The sampling loop walks `windowStart` to `asOf` a bucket at a time, so the
 *  point count follows the span rather than the data. A fixed timeframe is
 *  bounded by its own definition, but "all" opens at the earliest event — so a
 *  caller-supplied timestamp far enough in the past grows the array until the
 *  process dies.
 *
 *  100,000 is about 11 years of hourly buckets, or 270 years of daily ones:
 *  beyond any real portfolio, so it only rejects an implausible bound.
 */
const MAX_EQUITY_POINTS = 100_000;

interface MarketBook {
  qty: number;
  cost: number;
}

/** Nearest mark at-or-before `t`, else the series' first sample, else fallback. */
function markAt(series: MarkSeries | undefined, t: number, fallback: number): number {
  if (!series || series.length === 0) return fallback;
  let best: number | undefined;
  for (const [ts, price] of series) {
    if (ts > t) break;
    best = price;
  }
  return best ?? series[0]?.[1] ?? fallback;
}

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
export function computePortfolioAnalytics(
  events: readonly PortfolioFlowEvent[],
  opts: PortfolioAnalyticsOptions,
): PortfolioAnalytics {
  const { timeframe, asOf, marks } = opts;
  const cexRateBps = opts.cexRateBps ?? DEFAULT_CEX_RATE_BPS;

  // Validate the sampling bounds BEFORE sorting, allocating, or looping. The
  // equity loop below exits only on `sampleT >= asOf`, and a non-finite bound
  // keeps that false forever while every iteration appends a point — so the
  // process dies of memory exhaustion instead of reporting a bad argument.
  if (!Number.isFinite(asOf)) {
    throw new InvalidInputError(`asOf must be a finite epoch-ms number, got ${asOf}`);
  }
  for (let k = 0; k < events.length; k += 1) {
    const t = (events[k] as PortfolioFlowEvent).timestamp;
    if (!Number.isFinite(t)) {
      throw new InvalidInputError(`events[${k}].timestamp must be a finite epoch-ms number, got ${t}`);
    }
  }

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const windowStart = timeframe === "all" ? (sorted[0]?.timestamp ?? asOf) : asOf - TIMEFRAME_MS[timeframe];
  const bucketMs = BUCKET_MS[timeframe];
  // Both are derived, so they can only be non-finite if the timeframe table is
  // wrong — but they are the values the loop actually steps with, so check the
  // thing that matters rather than trusting the derivation. These two are
  // belt-and-braces: the checks above already reject every input that reaches
  // them today, so no test can distinguish them, and they exist so a future
  // change to the derivation cannot quietly reopen the loop. A bad `timeframe`
  // from an untyped caller reports itself here.
  if (!Number.isFinite(windowStart)) {
    throw new InvalidInputError(
      `windowStart must be a finite epoch-ms number, got ${windowStart} for timeframe "${timeframe}"`,
    );
  }
  if (!Number.isFinite(bucketMs) || bucketMs <= 0) {
    throw new InvalidInputError(
      `bucket size must be a finite positive number of ms, got ${bucketMs} for timeframe "${timeframe}"`,
    );
  }
  // Finiteness alone does not bound the loop. A fixed timeframe subtracts a
  // constant, so it samples window/bucket times (24, 42 or 30) however large
  // `asOf` is. "all" opens its window at the earliest event, so the span — and
  // the equity array — follows whatever timestamp the caller supplies. One
  // funding event dated 1e15 ms before now exhausts the heap, and
  // `fetchPortfolioAnalytics` forwards caller funding events straight into this
  // fold, so it is reachable without calling the kernel directly.
  //
  // Reject the span rather than capping the loop: a cap would silently truncate
  // the curve, which is worse than refusing an impossible question.
  const impliedPoints = (asOf - windowStart) / bucketMs;
  if (impliedPoints > MAX_EQUITY_POINTS) {
    throw new InvalidInputError(
      `timeframe "${timeframe}" spans ${Math.round(impliedPoints)} sample points ` +
        `between ${windowStart} and ${asOf}, above the ${MAX_EQUITY_POINTS} supported — ` +
        `the earliest event timestamp or asOf is implausible`,
    );
  }

  // Per-market running avg-cost book. Applying an event mutates it and
  // returns the realized PnL the event produced.
  const books = new Map<string, MarketBook>();
  const book = (market: string): MarketBook => {
    let b = books.get(market);
    if (!b) {
      b = { qty: 0, cost: 0 };
      books.set(market, b);
    }
    return b;
  };
  const applyTrade = (e: PortfolioTradeEvent): { realized: number; matchedProceeds: number } => {
    const b = book(e.market);
    if (e.side === "buy") {
      b.qty += e.baseAmount;
      b.cost += e.quoteAmount;
      return { realized: 0, matchedProceeds: 0 };
    }
    const avg = b.qty > 0 ? b.cost / b.qty : 0;
    const sold = Math.min(e.baseAmount, b.qty);
    const costOut = avg * sold;
    b.qty -= sold;
    b.cost -= costOut;
    // Proceeds are attributed pro-rata when the sell exceeds the tracked
    // position (tokens acquired outside the book): only the matched slice
    // realizes PnL, and only it counts as capital returned. The unmatched
    // remainder was sourced externally, so scoring it would push the capital
    // base negative for an account that merely sold what it already held.
    const matchedProceeds = e.baseAmount > 0 ? (e.quoteAmount * sold) / e.baseAmount : 0;
    return { realized: matchedProceeds - costOut, matchedProceeds };
  };

  // The open books marked at `t`: what they are worth, and the unrealized PnL
  // that value carries. One walk serves both series — holdings is the marked
  // figure, the equity curve is the unrealized one.
  //
  // `markedUsd` rather than `valueUsd`: `EquityPoint.valueUsd` is a cumulative
  // PnL, so reusing that name here would give one word two meanings inside one
  // file.
  //
  // Each market's difference is accumulated as a difference, which is what the
  // PnL fold has always done. Summing the values and the cost bases separately
  // and subtracting once at the end is the same arithmetic on paper, but it
  // cancels two large sums instead of many small ones, and it moved the last
  // bits of every equity, PnL and MWRR figure. Measured against this kernel
  // before the change, across 2,000 randomized multi-market books: a relative
  // shift of up to 8.6e-12. That is far below a cent, and it is still a
  // different number than the one already shipped, for no gain.
  const markBooksAt = (t: number): { markedUsd: number; unrealizedUsd: number; unpricedMarkets: number } => {
    let markedUsd = 0;
    let unrealizedUsd = 0;
    let unpricedMarkets = 0;
    for (const [market, b] of books) {
      if (b.qty <= 0) continue;
      const series = marks.series.get(market);
      const lastPrice = marks.lastPrice.get(market);
      // No candle sample and no last price is no mark at all. `markAt` stands a
      // zero in its place, and a zero is a real price: the position drops out
      // of the level worth nothing, and nothing says it did. That cancels in
      // the PnL figures, which difference two marked sums, so only the level
      // needs to report it. Counting the markets here is what lets it.
      if ((series === undefined || series.length === 0) && lastPrice === undefined) {
        unpricedMarkets += 1;
      }
      const mark = markAt(series, t, lastPrice ?? 0);
      const value = b.qty * mark;
      markedUsd += value;
      unrealizedUsd += value - b.cost;
    }
    return { markedUsd, unrealizedUsd, unpricedMarkets };
  };

  // Phase 1 — pre-window events establish the carried-in basis. Pre-window
  // funding is deliberately NOT accumulated: capital funded earlier and still
  // invested is already counted at the carried-in position's value below, and
  // capital funded earlier but never traded never entered a position this fold
  // can see. Counting it again would double it.
  let i = 0;
  while (i < sorted.length && (sorted[i] as PortfolioFlowEvent).timestamp < windowStart) {
    const e = sorted[i] as PortfolioFlowEvent;
    if (e.kind === "trade") applyTrade(e);
    i += 1;
  }

  const atStart = markBooksAt(windowStart);
  const carriedInValue = atStart.markedUsd;
  const unrealizedAtStart = atStart.unrealizedUsd;

  // Phase 2 — walk the window bucket by bucket, applying events as their
  // bucket arrives and sampling cumulative PnL at each boundary.
  const equity: EquityPoint[] = [{ t: windowStart, valueUsd: 0 }];
  const holdings: HoldingsPoint[] = [
    { t: windowStart, valueUsd: carriedInValue, unpricedMarkets: atStart.unpricedMarkets },
  ];
  let cumRealized = 0;
  let periodVolume = 0;
  // In-window capital flows, each kept at its OWN timestamp so the Dietz
  // weighting below reflects when the capital actually moved. Bucketing them
  // first and weighting at the bucket close would under-weight every flow by
  // up to one bucket — a full day on a 30-day window.
  const tradeFlows: { t: number; valueUsd: number }[] = [];
  const fundingFlows: { t: number; valueUsd: number }[] = [];

  for (let t = windowStart + bucketMs; ; t += bucketMs) {
    const sampleT = Math.min(t, asOf);
    while (i < sorted.length && (sorted[i] as PortfolioFlowEvent).timestamp <= sampleT) {
      const e = sorted[i] as PortfolioFlowEvent;
      if (e.kind === "funding") {
        // Capital base only — a deposit must not move the equity curve.
        fundingFlows.push({
          t: e.timestamp,
          valueUsd: e.direction === "in" ? e.valueUsd : -e.valueUsd,
        });
        i += 1;
        continue;
      }
      const { realized, matchedProceeds } = applyTrade(e);
      cumRealized += realized;
      periodVolume += e.quoteAmount;
      tradeFlows.push({
        t: e.timestamp,
        valueUsd: e.side === "buy" ? e.quoteAmount : -matchedProceeds,
      });
      i += 1;
    }
    const marked = markBooksAt(sampleT);
    equity.push({
      t: sampleT,
      valueUsd: cumRealized + marked.unrealizedUsd - unrealizedAtStart,
    });
    holdings.push({
      t: sampleT,
      valueUsd: marked.markedUsd,
      unpricedMarkets: marked.unpricedMarkets,
    });
    if (sampleT >= asOf) break;
  }

  const buckets: PnlBucket[] = [];
  for (let k = 1; k < equity.length; k += 1) {
    const prev = equity[k - 1] as EquityPoint;
    const cur = equity[k] as EquityPoint;
    buckets.push({ t: cur.t, pnlUsd: cur.valueUsd - prev.valueUsd });
  }

  const totalUsd = (equity[equity.length - 1] as EquityPoint).valueUsd;

  // The funding basis needs in-window funding flows to measure. A funding
  // event lying entirely before the window contributes none: the capital it
  // delivered is either still held — and so already counted at the carried-in
  // position's value, which both bases include — or was spent on trades the
  // trades basis can see. Selecting the funding basis on a pre-window event
  // alone would leave the base as carried-in value only and silently ignore
  // every in-window buy.
  const capitalBasis = fundingFlows.length > 0 ? ("funding" as const) : ("trades" as const);
  const flows = capitalBasis === "funding" ? fundingFlows : tradeFlows;

  // Time weighting applies to the FUNDING basis only, and that boundary is the
  // point rather than an optimization.
  //
  // Modified Dietz weights external contributions and withdrawals by the time
  // they were invested. A deposit arriving late genuinely earned less of the
  // window's return, so weighting it is right. Trade fills are not external
  // flows: selling a position and buying it back moves capital that never left
  // the account. Weighting them treats the sell as capital returned to the
  // investor at nearly full weight and the rebuy as fresh capital at almost
  // none, which collapses the denominator for an account that only rearranged
  // what it already held. Measured on this kernel, a 10,000 USD position sold
  // one minute into a 24-hour window and rebought at 23.9 hours, with the price
  // then halving, produced a base of 148 USD against a 5,000 USD loss — a
  // reported −3,376%, where the truth, and what the unweighted code already
  // ships, is −50%.
  //
  // Three revisions tried to keep weighting on the trades basis and screen the
  // damage with a threshold. Each failed, because the pathology is intrinsic to
  // weighting internal rearrangements rather than a tail case: measuring the net
  // flow missed the collapse entirely, since an early sell and a late rebuy
  // cancel out of the net; gross weighted flow grew with the number of flow legs
  // instead of the erosion, so it suppressed ordinary round-trip trading while
  // still admitting a collapsed base; and keying on the carried-in value was
  // evaded by opening the position just inside the window instead of just before
  // it. No threshold separates the cases, because on the trades basis the same
  // shape is both ordinary and unsound.
  //
  // So the trades basis keeps the unweighted base it has always had — the
  // documented proxy, no better and no worse than the shipped one — and the
  // funding basis, where the flows really are external, gets the weighting the
  // gateway had.
  const endT = (equity[equity.length - 1] as EquityPoint).t;
  const spanMs = endT - windowStart;
  let netFlow = 0;
  let weightedFlow = 0;
  for (const f of flows) {
    netFlow += f.valueUsd;
    const weight = spanMs > 0 ? (endT - f.t) / spanMs : 1;
    weightedFlow += weight * f.valueUsd;
  }
  const depositedUsd = carriedInValue + netFlow;
  const weightedCapitalUsd = capitalBasis === "funding" ? carriedInValue + weightedFlow : depositedUsd;
  const mwrrReturn = weightedCapitalUsd < MIN_CAPITAL_BASE_USD ? null : totalUsd / weightedCapitalUsd;

  let lifetimeVolume = 0;
  let sessionVolume = 0;
  for (const e of sorted) {
    if (e.kind !== "trade") continue;
    lifetimeVolume += e.quoteAmount;
    if (opts.sessionSince !== undefined && e.timestamp >= opts.sessionSince) {
      sessionVolume += e.quoteAmount;
    }
  }

  const rate = cexRateBps / 10_000;
  return {
    timeframe,
    asOf,
    equity,
    holdings,
    pnl: { totalUsd, buckets },
    mwrr: {
      return: mwrrReturn,
      gainUsd: totalUsd,
      depositedUsd,
      weightedCapitalUsd,
      capitalBasis,
    },
    volume: {
      periodUsd: periodVolume,
      lifetimeUsd: lifetimeVolume,
      ...(opts.sessionSince !== undefined ? { sessionUsd: sessionVolume } : {}),
    },
    feesSaved: {
      cexRateBps,
      periodUsd: periodVolume * rate,
      lifetimeUsd: lifetimeVolume * rate,
    },
  };
}
