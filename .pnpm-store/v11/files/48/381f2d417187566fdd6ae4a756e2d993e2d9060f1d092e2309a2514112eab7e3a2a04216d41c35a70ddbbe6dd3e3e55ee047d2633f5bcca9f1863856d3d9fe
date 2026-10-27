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
export function netInternalTransfers(events, chainIds) {
    const own = new Set(chainIds);
    const isInternalLeg = (e) => e.chainId !== undefined &&
        own.has(e.chainId) &&
        e.counterpartyChainId !== undefined &&
        own.has(e.counterpartyChainId);
    // A paired transfer drops as a unit and an unpaired internal leg drops alone
    // as in-transit capital, so the rule collapses to one predicate: an internal
    // leg never reaches the fold. `transferId` is what lets a CALLER pair legs; the
    // fold only needs to know both ends are this exchange's chains.
    return events.filter((e) => !isInternalLeg(e));
}
/** Window lengths per timeframe (ms); "all" spans every event. */
const TIMEFRAME_MS = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
};
/** Equity-series bucket per timeframe (ms). */
const BUCKET_MS = {
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
/** Nearest mark at-or-before `t`, else the series' first sample, else fallback. */
function markAt(series, t, fallback) {
    if (!series || series.length === 0)
        return fallback;
    let best;
    for (const [ts, price] of series) {
        if (ts > t)
            break;
        best = price;
    }
    return best ?? series[0]?.[1] ?? fallback;
}
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
export function computePortfolioAnalytics(events, opts) {
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
        const t = events[k].timestamp;
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
        throw new InvalidInputError(`windowStart must be a finite epoch-ms number, got ${windowStart} for timeframe "${timeframe}"`);
    }
    if (!Number.isFinite(bucketMs) || bucketMs <= 0) {
        throw new InvalidInputError(`bucket size must be a finite positive number of ms, got ${bucketMs} for timeframe "${timeframe}"`);
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
        throw new InvalidInputError(`timeframe "${timeframe}" spans ${Math.round(impliedPoints)} sample points ` +
            `between ${windowStart} and ${asOf}, above the ${MAX_EQUITY_POINTS} supported — ` +
            `the earliest event timestamp or asOf is implausible`);
    }
    // Per-market running avg-cost book. Applying an event mutates it and
    // returns the realized PnL the event produced.
    const books = new Map();
    const book = (market) => {
        let b = books.get(market);
        if (!b) {
            b = { qty: 0, cost: 0 };
            books.set(market, b);
        }
        return b;
    };
    const applyTrade = (e) => {
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
    const markBooksAt = (t) => {
        let markedUsd = 0;
        let unrealizedUsd = 0;
        let unpricedMarkets = 0;
        for (const [market, b] of books) {
            if (b.qty <= 0)
                continue;
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
    while (i < sorted.length && sorted[i].timestamp < windowStart) {
        const e = sorted[i];
        if (e.kind === "trade")
            applyTrade(e);
        i += 1;
    }
    const atStart = markBooksAt(windowStart);
    const carriedInValue = atStart.markedUsd;
    const unrealizedAtStart = atStart.unrealizedUsd;
    // Phase 2 — walk the window bucket by bucket, applying events as their
    // bucket arrives and sampling cumulative PnL at each boundary.
    const equity = [{ t: windowStart, valueUsd: 0 }];
    const holdings = [
        { t: windowStart, valueUsd: carriedInValue, unpricedMarkets: atStart.unpricedMarkets },
    ];
    let cumRealized = 0;
    let periodVolume = 0;
    // In-window capital flows, each kept at its OWN timestamp so the Dietz
    // weighting below reflects when the capital actually moved. Bucketing them
    // first and weighting at the bucket close would under-weight every flow by
    // up to one bucket — a full day on a 30-day window.
    const tradeFlows = [];
    const fundingFlows = [];
    for (let t = windowStart + bucketMs;; t += bucketMs) {
        const sampleT = Math.min(t, asOf);
        while (i < sorted.length && sorted[i].timestamp <= sampleT) {
            const e = sorted[i];
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
        if (sampleT >= asOf)
            break;
    }
    const buckets = [];
    for (let k = 1; k < equity.length; k += 1) {
        const prev = equity[k - 1];
        const cur = equity[k];
        buckets.push({ t: cur.t, pnlUsd: cur.valueUsd - prev.valueUsd });
    }
    const totalUsd = equity[equity.length - 1].valueUsd;
    // The funding basis needs in-window funding flows to measure. A funding
    // event lying entirely before the window contributes none: the capital it
    // delivered is either still held — and so already counted at the carried-in
    // position's value, which both bases include — or was spent on trades the
    // trades basis can see. Selecting the funding basis on a pre-window event
    // alone would leave the base as carried-in value only and silently ignore
    // every in-window buy.
    const capitalBasis = fundingFlows.length > 0 ? "funding" : "trades";
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
    const endT = equity[equity.length - 1].t;
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
        if (e.kind !== "trade")
            continue;
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
