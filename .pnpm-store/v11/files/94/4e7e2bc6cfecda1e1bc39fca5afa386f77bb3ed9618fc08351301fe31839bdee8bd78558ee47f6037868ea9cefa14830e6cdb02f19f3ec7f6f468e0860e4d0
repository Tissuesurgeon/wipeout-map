import { type Address, type PublicClient } from "viem";
import * as IndexerRead from "../indexerRead.js";
import type { Writer as WriterCtx } from "../writer.js";
import type { TxResult } from "../trade.js";
/**
 *  A perp pool's live pricing/funding state, read straight from chain in one
 *  pipelined fan-out. Fresher than the indexed Market row (funding fields there
 *  only update when FundingUpdated fires, i.e. per settlement window).
 *
 * @category perpetual markets
 */
export interface PerpStateOnchain {
    /** EMA-smoothed oracle mark price (raw quote units per whole base). */
    markPrice: bigint;
    /**
     *  Whether the mark feed is live. When false, `markPrice` is not meaningful — the
     *  FundingUpdated event signals the same condition with a 0 sentinel.
     */
    markPriceOk: boolean;
    /** Unsmoothed oracle index price (raw quote units per whole base). */
    indexPrice: bigint;
    /** Index price oracle timestamp (seconds). */
    indexUpdatedAt: bigint;
    /** Current funding rate per settlement window (1e18-scaled fraction, signed). */
    fundingRate: bigint;
    /** Settled cumulative funding per base unit (1e18-scaled, signed). */
    cumulativeFundingPerUnit: bigint;
    /** Cumulative funding projected to now (unsettled accrual included). */
    projectedCumulativeFundingPerUnit: bigint;
    /**
     *  TOTAL open interest in base units.
     *
     *  Replaces `longOpenInterest` / `shortOpenInterest`: the contract keeps ONE counter
     *  because the short side is provably equal in a matched CLOB, and the two-field form
     *  did not match the deployed ABI at all — it made every `getPerpState` call throw.
     */
    openInterest: bigint;
    /**
     *  The rate's DENOMINATOR in seconds (`fundingCalculationWindowSec`), 28800 on every
     *  live pool. `fundingRate` is per THIS window — not per settlement interval and not
     *  annualized. Normalize with it; never with a hardcoded constant.
     */
    fundingWindowSec: number;
    /**
     *  Settlement cadence in seconds. **3600 on every live pool**, so
     *  `fundingWindowSec / fundingIntervalSec` is 8. It has been 300 (n = 96), and the same
     *  emitted rate means a 12x different per-interval accrual across that boundary — which
     *  is why this is read per pool and never assumed. Indexed history still spans it.
     */
    fundingIntervalSec: number;
    /** Last settlement, unix seconds (the chain stores nanoseconds). */
    lastFundingUpdateAt: bigint;
    /** When the next settlement becomes due. Settlement is LAZY, so it may pass unmet. */
    nextFundingAt: bigint;
    /**
     *  EMA'd premium driving the rate, and NOT mark vs index — expect it to disagree with
     *  `(mark - index) / index`, which is a different quantity by design.
     *
     *  Since DEX-2252 the underlying premium is Binance's impact-price shape rather than a
     *  book midpoint: `[max(0, impactBid - index) - max(0, index - impactAsk)] / index`,
     *  where each impact price is the quantity-weighted price of filling a configured
     *  impact notional on that side, counting only orders that pass a fillability check,
     *  and time-weighted across the settlement interval. Three consequences:
     *
     *  - **There is a deadband.** An index sitting anywhere inside the impact spread prices
     *    exactly zero, so a merely wide book is no longer charged funding for its spread.
     *  - **Zero does not mean an empty book.** A side that cannot show the impact notional
     *    of fillable depth drops out and the other side stands alone, so a ONE-SIDED book
     *    can carry a non-zero premium. Only a book with nothing priceable on either side is
     *    reliably zero.
     *  - **It lags the book**, because it is an average over the interval rather than a
     *    reading at an instant.
     *
     *  Not recoverable from events, so this read is the only source.
     */
    emaPremium: bigint;
    /**
     *  The pool's aggregator oracle contract.
     *
     *  This is the address the pool itself reads prices from, so it is the head of the
     *  chain that produces `markPrice` and `indexPrice` — the aggregator chains to the
     *  sim-controlled oracle and then to the agent EMA feed. It is a per-pool address:
     *  every live pool reports a different one, so it cannot be substituted with a
     *  per-network constant such as the deployment config's `oracleHub`.
     */
    oracle: Address;
}
/**
 *  The price to mark a perp position at, and whether it came from the mark feed.
 *
 *  Extracted and tested rather than written inline at the call site, because the inline
 *  version is a one-line regression waiting to happen. `getPerpState` reads the mark via
 *  `tryGetMarkPrice`, which REPORTS staleness rather than reverting on it — so the naive
 *  `markPrice - entryPrice` takes the meaningless 0 price word from a stale feed and
 *  produces a 100% loss on every open position. An earlier `getMarkPrice()` read reverted
 *  instead, which failed loudly; making the read more robust made the derived number
 *  silently worse until this guard.
 *
 *  The index price is the fallback rather than "no value": it is a separate oracle the
 *  pool already trusts for funding, and dropping positions out of a portfolio view is its
 *  own kind of wrong. Callers that want a MARK READING (rather than something to mark
 *  against) should report undefined on staleness instead — see `fetchFundingRate`.
 *
 * @category perpetual markets
 */
export declare function perpMarkForPnl(state: Pick<PerpStateOnchain, "markPrice" | "markPriceOk" | "indexPrice">): {
    price: bigint;
    fromIndex: boolean;
};
/**
 *  Read a perp pool's mark/index/funding/open-interest state AT ONE BLOCK.
 *
 *  Every field describes one instant. The fixed ten-view Multicall3 payload uses
 *  `batchSize: 0`, so client and chain settings cannot split it into several calls.
 *  A single aggregate needs no block lookup unless the chain declares a deployment
 *  height. That height needs a pin to detect a node before Multicall3 was deployed.
 *
 *  Without Multicall3, every individual read uses one sampled block. Only viem's
 *  `ChainDoesNotSupportContract` capability error permits fallback. RPC, revert and
 *  decode failures still throw through the owner's typed read boundary.
 *  An unexpected SDK failure while mapping decoded results rejects with
 *  `InvariantError` and the original failure as its cause.
 */
export declare function getPerpState(pool: Address, client: PublicClient): Promise<PerpStateOnchain>;
/**
 *  Whether a perp pool's MARK feed is live, and how much open interest is riding on it.
 *
 * @category perpetual markets
 */
export interface PerpFeedStatus {
    /**
     *  The pool's OWN verdict on its mark feed, from `tryGetMarkPrice`. Never re-derive it
     *  by comparing a timestamp: the staleness bound lives on `FundingParametersEpoch` per
     *  pool and moves per epoch, so an outside comparison can disagree with the pool.
     */
    markPriceOk: boolean;
    /**
     *  The mark itself, because `markPriceOk` is not the whole verdict: a feed can report
     *  ok and hand back 0, and a zero mark is never a real price for a live perp. Treat
     *  `markPriceOk && markPrice > 0n` as live — the same test {@link perpMarkForPnl} makes.
     */
    markPrice: bigint;
    /** Total open interest in base units. What makes a stale mark dangerous rather than
     *  merely untidy: margin and liquidation prices are struck against the mark. */
    openInterest: bigint;
    /**
     *  The INDEX oracle's timestamp (epoch seconds) — a DIFFERENT feed from the mark, so
     *  it corroborates a verdict rather than dating it.
     *
     *  `undefined` when that leg reverted, which is the case this read exists to survive:
     *  it is diagnostic, and it must never take the verdict down with it. See the note on
     *  {@link SomniaMarketsClient.getPerpFeedStatus | client.getPerpFeedStatus}.
     */
    indexUpdatedAt?: bigint;
}
/**
 *  Is a perp pool's mark feed live, and what is riding on it — the two reads a mark-feed
 *  MONITOR needs, and deliberately not {@link getPerpState}.
 *
 *  **Why this exists rather than reusing `getPerpState`.** That read is all-or-nothing by
 *  design: it batches with `allowFailure: false`, falls back to a `Promise.all`, and both
 *  reject whole if any leg does. One of its legs is `getIndexPrice()`, a BARE
 *  `IOracle.getPrice()` — the one index-price path the pool does not wrap in try/catch —
 *  so a dead or rotated oracle propagates its revert through the entire read. A monitor
 *  built on it therefore loses the mark verdict in exactly the situation the verdict
 *  matters most: the caller sees a failed read, not a stale feed, and a page-worthy
 *  outage degrades into "could not read this pool".
 *
 *  So the two fields that carry the verdict are read as the REQUIRED pair, and neither
 *  can revert on a dead oracle: `tryGetMarkPrice` reports staleness instead of reverting
 *  (that is the whole reason `getPerpState` moved to it), and `getOpenInterest` is a
 *  stored counter that consults no oracle. The index timestamp is then BEST EFFORT — its
 *  revert is swallowed and the field left undefined — because it is corroboration for a
 *  human, not an input to the verdict.
 *
 *  The block pin is kept for the reason {@link getPerpState} documents: the verdict and
 *  the open interest decide a SEVERITY together (a stale feed with positions open is a
 *  different incident from one without), so they must describe the same instant. The
 *  best-effort leg quotes the same block, so a reported age cannot be from a later one.
 *
 *  Three `eth_call`s plus one `eth_blockNumber`. No multicall: `allowFailure: false` is
 *  what this read exists to avoid, and batching with `allowFailure: true` would make the
 *  REQUIRED pair silently optional — the opposite of the guarantee wanted here.
 */
export declare function getPerpFeedStatus(pool: Address, client: PublicClient): Promise<PerpFeedStatus>;
/**
 *  A perp pool's funding-premium state — what the next settlement will charge, and the
 *  raw accumulator behind it.
 *
 * @category perpetual markets
 */
export interface PerpFundingPremium {
    /**
     *  The premium the NEXT settlement will charge: the time-weighted average of the
     *  order-book premium over the interval so far, PRE-clamp, 1e18-scaled and signed.
     *  Positive means the perp is rich and longs pay.
     *
     *  This is the value to build a predicted funding rate from. Do not read
     *  `lastObservedPremium` for that — see its note.
     */
    timeWeightedPremium: bigint;
    /**
     *  The standing INSTANTANEOUS sample, 1e18-scaled and signed.
     *
     *  Exposed beside `timeWeightedPremium` because the contract's getter for this kept its
     *  signature and changed its meaning: before Wave 28 it WAS the premium the next
     *  settlement would charge. Anything still treating it that way is silently wrong, and
     *  a spot reading is the one number that looks most like the right one.
     *
     *  Useful for "where is the book right now" and for reproducing the open segment. Not
     *  for predicting a charge.
     */
    lastObservedPremium: bigint;
    /** Raw premium integral accumulated since `intervalStartNs`, for exact reproduction. */
    accumulator: bigint;
    /** Start of the interval being averaged, in NANOseconds. Zero when un-armed — see `armed`. */
    intervalStartNs: bigint;
    /** When the standing sample was taken, in NANOseconds. */
    observedAtNs: bigint;
    /**
     *  When the standing sample stops accruing credit, in NANOseconds. Every nanosecond
     *  past it is credited at ZERO, which is what makes a quote's weight its resting
     *  duration rather than its presence at one instant.
     *
     *  It can legitimately sit BEHIND `observedAtNs`: a freeze writes the current time here,
     *  and an observation in the same block then advances `observedAtNs` to match. Do not
     *  subtract them without ordering them first.
     */
    validUntilNs: bigint;
    /**
     *  Whether the time-weighted mechanism is running for this market yet.
     *
     *  Derived from `intervalStartNs !== 0n`, which is the contract's own migration
     *  sentinel: it is armed by each market's FIRST settlement after the beacon upgrade.
     *  While this is `false` the pool still charges the point sample, so
     *  `timeWeightedPremium` equals `lastObservedPremium` and the accumulator is empty —
     *  correct, not missing, and it resolves on the market's next settlement.
     */
    armed: boolean;
}
/**
 *  Read a perp pool's funding-premium state AT ONE BLOCK.
 *
 *  **Why this is separate from {@link getPerpState}**
 *
 *  These three getters arrived with Wave 28 and do not exist on an older implementation.
 *  `getPerpState` batches with `allowFailure: false`, deliberately, so that a revert
 *  surfaces rather than hiding — which means folding these in would let one un-upgraded
 *  pool take a core read down entirely. Keeping them here contains that: a caller who
 *  wants the premium opts in, and a pool that cannot serve it fails only this call.
 *
 *  Reads fan out rather than using Multicall3. Three calls do not earn the batch, and the
 *  correctness that matters comes from the block pin rather than from batching — every
 *  field has to describe the same instant, because the accumulator, its interval start and
 *  the standing sample are only meaningful together. If this ever grows, share
 *  `getPerpState`'s batch instead of widening the fan-out.
 *
 *  **Gotchas**
 *
 *  Check `armed` before presenting `timeWeightedPremium` as an average. Until a market's
 *  first settlement after the upgrade it is the point sample, which is what the pool is
 *  charging — so the number is right, but calling it a time-weighted average is not.
 *
 * **Example** (Predicted premium, honestly labelled)
 *
 * ```ts
 * const p = await client.getPerpFundingPremium(pool);
 * const basis = p.armed ? "time-weighted" : "point sample (pre-upgrade)";
 * console.log(basis, p.timeWeightedPremium);
 * ```
 *
 * @category perpetual markets
 */
export declare function getPerpFundingPremium(pool: Address, client: PublicClient): Promise<PerpFundingPremium>;
/**
 *  An account's position in one perp pool (from the MarginBank). `size` is
 *  signed base units: positive = long, negative = short, zero = flat.
 *
 * @category perpetual markets
 */
export interface PerpPosition {
    /**
     *  Signed position size in raw base units: positive = long, negative = short,
     *  zero = flat.
     */
    size: bigint;
    /** Volume-weighted average entry price (raw quote units per whole base). */
    avgEntryPrice: bigint;
    /** Cumulative funding index at open / last settlement (1e18-scaled, signed). */
    entryFundingIndex: bigint;
    /** Last position update (nanoseconds). */
    lastUpdatedTimestampNs: bigint;
}
/**
 *  Identifies one account's position in one perp pool — the (bank, account,
 *  pool) triple every per-position read keys on. Shared by
 *  `getPerpPosition` and `getLiquidationPrice` (perp/margin.ts); one object
 *  instead of three positional `Address` args (which compiled fine with any two
 *  swapped).
 *
 * @category perpetual markets
 */
export interface PerpPositionRef {
    /** The MarginBank holding the position — comes off the `PerpMarket` row. */
    marginBank: Address;
    /** The position's owner. */
    account: Address;
    /** The perp pool the position is in. */
    pool: Address;
}
/** Read an account's position for one perp pool from the MarginBank. */
export declare function getPerpPosition(ref: PerpPositionRef, client: PublicClient): Promise<PerpPosition>;
/**
 *  One account's position in one perp pool as the INDEXER has it — the mirror of
 *  the `PerpPosition` entity, and the batch counterpart to the per-pool chain read
 *  `client.getPerpPosition`.
 *
 *  **This is a snapshot, not the live position.** The row is upserted on each
 *  `MarginBank.PositionUpdated`, so it is current as of {@link updatedAtBlock} and
 *  no fresher. Everything mark-dependent — unrealized PnL, liquidation price,
 *  margin health — needs a chain read on top; nothing here is marked to market.
 *
 *  Numeric fields are decimal STRINGS of raw units (the indexer wire format),
 *  unlike {@link PerpPosition}, whose chain reads are `bigint`.
 *
 * @category perpetual markets
 */
export type IndexedPerpPosition = {
    /** Row id (`${pool}_${account}`). */
    id: string;
    /** Perp pool the position is in (lowercased). */
    pool: string;
    /** Position owner (lowercased). */
    account: string;
    /**
     *  SIGNED position size in raw base units: positive = long, negative = short.
     *
     *  Normalized to match {@link PerpPosition.size}. The entity itself stores an
     *  absolute `size` plus a separate `isLong` flag; carrying that second field
     *  here would mean two exported position types whose `size` means different
     *  things, which reads correctly for longs and silently inverts every short.
     */
    size: string;
    /**
     *  Volume-weighted average entry price, raw quote units per whole base.
     *
     *  The same quantity as {@link PerpPosition.avgEntryPrice}, written straight
     *  from the event. (The underlying entity column is named `entryPriceX18`, which
     *  is a misnomer — the value is NOT 1e18-scaled. Renamed at this boundary so the
     *  name cannot imply a rescale that never happened.)
     */
    avgEntryPrice: string | null;
    /**
     *  Realized PnL since this position last opened from flat, raw collateral units
     *  (signed). Price PnL only: fees and funding are separate records. It stays on the
     *  flat row a full close leaves behind and restarts from zero when that row reopens or the position flips side.
     *
     *  Per-update rows: {@link SomniaMarketsClient.listPerpPositionChanges | client.listPerpPositionChanges}.
     *
     *  The name predates the accumulation and is kept until the next breaking release.
     *  Rows an older indexer wrote hold the last update's PnL only; a reindex rewrites them.
     */
    lastUpdateRealizedPnl: string | null;
    /**
     *  Unix SECONDS of the last update. ({@link PerpPosition} is NANOseconds — the
     *  two are 1e9 apart, so never compare them without converting.)
     */
    updatedAt: string;
    /** Block of the last update — the row is current as of this height, not head. */
    updatedAtBlock: number | null;
};
/**
 *  An account's perp positions across every pool, newest-updated first — ONE
 *  indexer round-trip instead of a chain read per market.
 *
 *  Indexer tier: history + aggregates, lags head slightly. For a single pool's
 *  authoritative current state — and for ANY funding-sensitive value, since the
 *  entry funding index is not on this row at all — use `client.getPerpPosition`,
 *  which returns `entryFundingIndex` from the MarginBank.
 *
 *  Deliberately selects only columns the CURRENTLY DEPLOYED indexer serves, so this
 *  read works against production today rather than waiting on the next reindex.
 *
 *  **Closed positions are excluded by default.** Rows are upserted and never
 *  deleted, so a fully-closed position lingers forever as a size-0 row; returning
 *  those would render phantom positions in every consumer. Pass `includeFlat` to
 *  get them (e.g. to show markets an account has touched).
 *
 *  **An empty array means the indexer has no rows, not that the account is flat.**
 *  A position opened moments ago may not be indexed yet; `updatedAtBlock` on each
 *  row is how far along the indexer was.
 *
 * **Details**
 *
 * - `account`: the position owner
 * - `opts.pool`: restrict to one perp pool
 * - `opts.includeFlat`: include size-0 (fully closed) rows; default false
 * - `opts.limit`: default 100
 */
export declare function listPerpPositions(account: string, opts: {
    pool?: string;
    includeFlat?: boolean;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<IndexedPerpPosition[]>;
export declare function pokeFunding(w: WriterCtx, p: {
    pool: Address;
    gas?: bigint;
}): Promise<TxResult>;
export declare function poke(w: WriterCtx, p: {
    market: Address;
    gas?: bigint;
}): Promise<TxResult>;
