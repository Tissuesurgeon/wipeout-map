import * as IndexerRead from "./indexerRead.js";
import { type ResultOf } from "@graphql-typed-document-node/core";
import type { Address, Hex, PublicClient } from "viem";
import type { SomniaMarketsSocketFailure } from "./config.js";
import type { BinaryMarketStatus } from "./store.js";
import type { Market_Bool_Exp } from "./gql/graphql.js";
/**
 *  The discriminator the whole market surface keys on — mirror of the indexer's
 *  `MarketType` enum. See the {@link Market} union.
 *
 * @category markets
 */
export type MarketType = "SPOT" | "PERP" | "BINARY";
/**
 * Fields every market has, regardless of type.
 *
 * @category markets
 */
export type BaseMarket = {
    /** Primary key (lowercased): bytes32 marketId for binary, pool address for spot. */
    id: string;
    /**
     *  Numeric chain id the market lives on.
     *
     *  Set on every row a {@link SomniaMarketsClient} or the {@link SomniaMarkets}
     *  facade returns, including rows the live tail materializes. Absent only on
     *  rows built by the internal data-first mappers, which know the indexer but
     *  not the chain; the owning client stamps it at its boundary. A market is
     *  unique to one chain, so `(chainId, id)` names it globally where `id` alone
     *  names it only on that chain.
     */
    chainId?: number;
    /** Discriminator — narrow on this (or the `is*Market` guards). */
    marketType: MarketType;
    /**
     *  The pool serving this market (lowercased; == id for SPOT/PERP). For binary,
     *  a TIME-VARYING binding — see the recycle caveat on {@link BinaryMarket.nonce}.
     */
    poolAddress: Address;
    /** Last fill price (raw). For binary, ≈ YES probability × 10^decimals. Null until first fill. */
    lastPrice: string | null;
    /** Timestamp (unix seconds) of the last fill; null until first fill. */
    lastTradeAt: string | null;
    /** Cumulative base/outcome-token volume (raw, decimal string). */
    cumulativeBaseVolume: string;
    /** Cumulative quote/collateral volume (raw, decimal string). */
    cumulativeQuoteVolume: string;
    /** Lifetime fill count (decimal string). */
    tradeCount: string;
    /** Base-token decimals (binary: outcome tokens mirror the collateral's decimals). */
    baseDecimals: number;
    /**
     *  Quote-token decimals (binary: the collateral's — per-venue, e.g. 6dp
     *  TestUSDC vs 18dp USDso). Format prices/amounts with this.
     */
    quoteDecimals: number;
    /** Timestamp (unix seconds) the market was created/indexed. */
    createdAtTimestamp: string;
    /**
     *  Block the market was created in. Carried for the same reason as
     *  `resolvedAtBlock`: a market is bracketed by two reads of an off-chain feed
     *  and only a BLOCK identifies which print each one saw — a `"fixed"`-mode
     *  market's `strike` IS the feed's spot at THIS block (see
     *  {@link BinaryMarket.mode}), and that print lands before `tradingStart` far
     *  more often than on it, so `createdAtTimestamp` cannot find it.
     */
    createdAtBlock: string;
};
/**
 * A spot (base/quote) order-book market.
 *
 * @category markets
 */
export type SpotMarket = BaseMarket & {
    /** Discriminator (narrowed). */
    marketType: "SPOT";
    /** Base ERC-20 address (lowercased). */
    baseToken: Address;
    /** Quote ERC-20 address (lowercased). */
    quoteToken: Address;
    /** Base token symbol (e.g. "SOMI"); null when the token exposes none. */
    baseSymbol: string | null;
    /** Quote token symbol (e.g. "USDso"); null when the token exposes none. */
    quoteSymbol: string | null;
    /** True when the base is the chain's native token (wrapped for the book). */
    baseIsNative: boolean;
    /** Price increment, raw quote units per whole base (decimal string). */
    tickSize: string;
    /** Quantity increment, raw base units (decimal string). */
    lotSize: string;
    /** Minimum order quantity, raw base units (decimal string). */
    minQuantity: string;
    /** EMA-smoothed mark price (raw quote per whole base); null until first set. */
    markPrice: string | null;
    /** Unsmoothed book midpoint feeding the mark-price EMA; null until first set. */
    rawMidpoint: string | null;
    /** Timestamp (unix seconds) the mark price last advanced; null until first set. */
    markPriceUpdatedAt: string | null;
    /** Per-pool SpotStopOrderRegistry (lowercased); null on pools without one. */
    stopRegistry: Address | null;
};
/**
 *  A perpetual-futures order-book market. Rides the same OrderBook core as
 *  spot (base/quote book, raw quote units per whole base), with a synthetic
 *  base: positions + collateral live cross-margin in the MarginBank, and the
 *  pool tracks funding against an oracle index price.
 *
 * @category markets
 */
export type PerpMarket = BaseMarket & {
    /** Discriminator (narrowed). */
    marketType: "PERP";
    /** Wrapper token standing in for the synthetic base (e.g. WBTC). */
    baseToken: Address;
    /** The MarginBank collateral token (e.g. USDso). */
    quoteToken: Address;
    /** Synthetic-base symbol (e.g. "WBTC"); null when the wrapper exposes none. */
    baseSymbol: string | null;
    /** Collateral token symbol (e.g. "USDso"); null when the token exposes none. */
    quoteSymbol: string | null;
    /**
     *  Always false — the perp base is synthetic, never native. Kept so spot-shaped
     *  base/quote code paths can treat SPOT and PERP uniformly.
     */
    baseIsNative: boolean;
    /** Price increment, raw quote units per whole base (decimal string). */
    tickSize: string;
    /** Quantity increment, raw base units (decimal string). */
    lotSize: string;
    /** Minimum order quantity, raw base units (decimal string). */
    minQuantity: string;
    /** Cross-margin MarginBank holding collateral + positions (lowercased). */
    marginBank: Address;
    /** Initial margin requirement in bps (500 = 5% = 20x max leverage). */
    initialMarginBps: number;
    /**
     *  Per-pool PerpStopOrderRegistry (lowercased); null on pools without one.
     *
     *  The registry is per-pool and every stop-order write takes it as an explicit
     *  `registry` argument ({@link Trader.placePerpStopOrder},
     *  {@link Trader.cancelPerpStopOrder}, {@link Trader.cancelPerpStopOrders}), so
     *  this is where that address comes from — same as `stopRegistry` on a
     *  {@link SpotMarket}. Null means the pool has no registry deployed, and TP/SL is
     *  unavailable on it rather than merely unfound.
     */
    stopRegistry: Address | null;
    /**
     *  Mark price sampled at FUNDING cadence (raw quote per whole base).
     *
     *  Shares the column with the spot mark price but is a different quantity, and the
     *  difference matters:
     *
     *  - It advances only when funding settles — hourly on every live pool — not per trade.
     *    For a live mark, read the chain
     *    (`getPerpState().markPrice`, which also reports `markPriceOk`).
     *  - It is null whenever the contract emitted its 0 sentinel for a stale/reverting mark
     *    feed. A stale feed leaves the PREVIOUS value in place rather than zeroing it, so a
     *    non-null value here is not by itself evidence of freshness — compare
     *    `markPriceUpdatedAt` against the settlement cadence.
     *  - It is NOT what drives funding, and not mark versus index either — the two
     *    routinely disagree in sign. The premium is the time-weighted IMPACT-price premium
     *    (quantity-weighted fill price at a configured notional on each side, deadbanded
     *    against the index). Read `getPerpState().emaPremium` for the quantity funding
     *    actually uses.
     */
    markPrice: string | null;
    /** When `markPrice` last advanced (unix seconds); null until the first settlement. */
    markPriceUpdatedAt: string | null;
    /**
     *  Funding rate for the last settlement window (1e18-scaled fraction, signed).
     *  Null until the first FundingUpdated is indexed.
     */
    fundingRate: string | null;
    /** Cumulative funding per base unit since inception (1e18-scaled, signed). */
    cumulativeFundingPerUnit: string | null;
    /** Oracle index price at the last funding update (raw quote per whole base). */
    indexPrice: string | null;
    /** Timestamp (unix seconds) of the last FundingUpdated; null until the first. */
    fundingUpdatedAt: string | null;
    /**
     *  The rate's DENOMINATOR in seconds (`fundingCalculationWindowSec`), 28800 on every
     *  live pool. `fundingRate` above is per THIS window — not per settlement interval and
     *  not annualized. Pass it to {@link normalizeFundingRate} and friends; a hardcoded
     *  denominator produces a plausible-looking wrong chart rather than an error.
     */
    fundingWindowSec: number | null;
    /**
     *  Settlement cadence in seconds. **3600 on every live pool**, so
     *  `fundingWindowSec / fundingIntervalSec` is 8. It has been 300 (n = 96), and the same
     *  rate value means a 12x different per-interval accrual across that boundary — which is
     *  why this is carried per row and never assumed. Indexed history still spans it.
     */
    fundingIntervalSec: number | null;
    /**
     *  TOTAL open interest in base units.
     *
     *  Replaces `longOpenInterest` / `shortOpenInterest`. The contract keeps ONE counter
     *  because the short side is provably equal in a matched CLOB, and the removed pair was
     *  null on every row anyway — the subscription feeding it was dead.
     */
    openInterest: string | null;
    /** Timestamp (unix seconds) of the last OpenInterestUpdated; null until the first. */
    openInterestUpdatedAt: string | null;
};
/**
 * A binary (YES/NO outcome) order-book market — the binary CLOB.
 *
 * @category markets
 */
export type BinaryMarket = BaseMarket & {
    /** Discriminator (narrowed). */
    marketType: "BINARY";
    /** bytes32 marketId (== id). */
    marketId: Hex;
    /** The BinaryMarket clone contract's address (lowercased). */
    marketAddress: Address;
    /**
     *  This market's YES/NO position ids on the ERC-6909 outcome-token singleton,
     *  as decimal strings (the indexer stores uint256 ids as strings).
     */
    yesTokenId: string;
    /** The NO position id — see {@link BinaryMarket.yesTokenId}. */
    noTokenId: string;
    /** Collateral ERC-20 backing the market (lowercased; per-venue). */
    collateral: Address;
    /** Underlying asset symbol (e.g. "BTC"). */
    asset: string;
    /** Display question text. May differ from {@link BinaryMarket.oracleQuestion}. */
    question: string;
    /**
     *  Lifecycle status (aliased from the indexer's `clobStatus`). Derived from
     *  lifecycle EVENTS only — the timestamp-implicit Listed→Trading→Settling
     *  transitions emit none, so derive the live trading state from
     *  `tradingStart`/`expiry` between events rather than trusting this alone.
     */
    status: BinaryMarketStatus;
    /**
     *  The canonical oracle question string (as registered on-chain); may differ
     *  from the display `question`. Null on markets indexed before this field.
     */
    oracleQuestion: string | null;
    /**
     *  Oracle question id the market binds to (uint256 as a decimal string, from
     *  `BinaryMarketsModule.MarketCreated`). `null` when discovered via the
     *  realtime tail or indexed before this field (filled on the next snapshot).
     */
    oracleQuestionId?: string | null;
    /**
     *  Strike the question resolves against (raw, in the oracle's price scale).
     *
     *  `null` on a market the SDK has only ever seen on chain — a chain-seeded
     *  watch (`watchMarket(pool, { seed: "chain" })`), whose pool contract does
     *  not carry the strike. It is unknown, not 0: 0 is the protocol's sentinel
     *  for reference mode, so serving it would relabel a fixed-strike market as
     *  up/down. An indexer-sourced row always carries it.
     */
    strike: string | null;
    /**
     *  How this market's threshold is established — the distinction every
     *  consumer of a binary market eventually needs, served rather than sniffed.
     *
     *  - `"reference"` — an up/down market. `strike` is 0 because the threshold
     *    IS another question's answer ("ETH closes at or above its opening
     *    price"), reached through `MarketReferenceLink` → `OracleAnswer`. Read it
     *    with `getOpeningPrices` / `getMarketResolution().openingAnswer`.
     *  - `"fixed"` — the threshold was set at creation ("at or above 77036.65")
     *    and is `strike` itself. There is no reference question, so an opening
     *    price does not exist and never will.
     *
     *  Derived from `strike` alone (see {@link binaryResolutionMode}), so it costs
     *  no extra query. Before it existed consumers inferred the mode from a LOOKUP
     *  MISS — "no opening answer, so it must be fixed-strike" — which conflates "no
     *  reference question" with "the reference question has not been answered yet".
     *  That reads as working code right up until an oracle is slow.
     *
     *  `null` when `strike` is — a chain-seeded market row, where the mode is
     *  genuinely unknown rather than `"reference"`.
     */
    mode: BinaryResolutionMode | null;
    /** Timestamp (unix seconds) trading opens. */
    tradingStart: string;
    /** Timestamp (unix seconds) trading ends and the outcome is decided. */
    expiry: string;
    /**
     *  Winning outcome (0 = YES, 1 = NO) — DERIVED by the indexer from a one-hot
     *  payout vector (Oracle v2 resolves with vectors; a one-hot vector has a
     *  unique winner). Null until Resolved and on non-one-hot (void/partial)
     *  vectors — the binary-compat field, kept alongside the vector below.
     */
    winningOutcome: number | null;
    /**
     *  Per-outcome payout numerators the market settled to (Oracle v2 vector
     *  resolution; uint256s as decimal strings — one-hot on a win; on a void, the
     *  vector the frozen void policy produced: uniform under `UNIFORM`, and
     *  `[p, D−p]` at the closing YES price on a `CLOB_SNAPSHOT` void that
     *  captured a two-sided close. Raw Σ == payoutDenominator). This vector, not
     *  {@link BinaryMarket.voidPolicy}, is what a void actually pays: every
     *  snapshot fallback stores the uniform vector. Null until resolution or void / on
     *  markets indexed before the vector fields existed.
     */
    payoutNumerators?: string[] | null;
    /**
     *  Denominator the numerators are scaled against (`PAYOUT_VECTOR_DENOMINATOR`
     *  = 10_000_000; decimal string). Null until resolution or void.
     */
    payoutDenominator?: string | null;
    /**
     * Payout numerators recorded at finalization, as decimal strings. Resolved
     * payouts include the frozen settlement fee; void payouts retain the raw
     * vector. Divide by {@link BinaryMarket.payoutDenominator}. Null or absent
     * until finalization is indexed or observed by a live watch.
     */
    settledPayoutNumerators?: string[] | null;
    /**
     * Source of the stored void vector: 0 uniform policy, 1 captured mid,
     * 2 raw book top, 3 uniform fallback. Null or absent until VoidVector is
     * indexed or observed by a live watch. The source explains the vector;
     * payout calculations use {@link BinaryMarket.payoutNumerators}.
     */
    voidVectorSource?: number | null;
    /** Block the market resolved or voided at; null until either event. */
    resolvedAtBlock: string | null;
    /** Timestamp (unix seconds) the market resolved or voided at; null until either event. */
    resolvedAtTimestamp: string | null;
    /** Tx hash the market was created in; null on markets indexed before this field. */
    createdByTx: Hex | null;
    /**
     *  Wallet that invoked createMarket (lowercased, from
     *  `BinaryMarketsModule.MarketCreated`). `null` when discovered via the
     *  realtime tail or indexed before this field (filled on the next snapshot).
     */
    creator?: Address | null;
    /** True once the market voided (payout per the frozen void policy; `payoutNumerators` carries the actual vector). */
    voided: boolean;
    /**
     *  Void payout policy frozen at creation (from `BinaryMarketsModule.MarketCreated`):
     *  0 UNIFORM (both sides redeem 1/N on a void), 2 CLOB_SNAPSHOT (a void pays
     *  `[p, D-p]` at the market's closing YES price; falls back to uniform when no
     *  two-sided close exists). `null` on pre-policy markets or tail-discovered rows.
     */
    voidPolicy?: number | null;
    /**
     *  Collateral backing complete sets on the LIVE pool (raw). Reads 0 once
     *  finalized — prefer {@link BinaryMarket.netBacking} after finalize.
     */
    backing: string;
    /**
     *  The pool's market nonce this market is bound to (settlement-extraction v2).
     *  A pool serves successive markets; `(poolAddress, nonce)` disambiguates them
     *  and encodes the outcome ids. `null` on markets indexed before v2 / discovered
     *  via a live event that doesn't carry it (filled on the next snapshot).
     *
     *  RECYCLE CAVEAT: `poolAddress` is a TIME-VARYING 1:1 binding — the same pool
     *  address serves different markets over time (never concurrently). Always key
     *  a market by `marketId`, never by `poolAddress` alone; use `nonce` to tell
     *  which of a pool's markets a given outcome id belongs to.
     */
    nonce?: string | null;
    /**
     *  Whether this market's backing has been finalized onto the BinarySettlement
     *  singleton (settlement-extraction v2). True once `finalizeMarket` swept the
     *  pool's backing over; redemption is served by settlement thereafter. `null`
     *  when unknown (pre-v2 / not yet snapshotted).
     */
    finalized?: boolean | null;
    /**
     *  The NET collateral backing recorded on the settlement singleton after
     *  finalize (post fee-skim on resolution; gross on void), decimal string. This
     *  is the authoritative post-finalize backing: `BinaryMarket.backing()` reads 0
     *  once finalized, so redemption UIs should prefer `netBacking` when set. `null`
     *  until finalize / on pre-v2 markets.
     */
    netBacking?: string | null;
    /**
     *  Opaque creator-supplied metadata bytes (hex, 0x-prefixed; '0x' when empty).
     *  The chain attaches no semantics — off-chain data only. Set once at creation.
     *  `null` on non-binary markets / markets indexed before this field existed.
     */
    context?: Hex | null;
    /**
     *  Series cadence in seconds (60=1m, 300=5m, 900=15m, 3600=1h, 14400=4h,
     *  86400=24h) — APPROXIMATE, see {@link BinaryMarketFilter.intervalSec}. DERIVED
     *  by the indexer from the market's own window (`expiry − tradingStart`) — a
     *  series' FIRST market is a bootstrap partial whose window is shorter than the
     *  steady-state cadence. `null` on SPOT / PERP.
     */
    intervalSec?: string | null;
    /**
     *  Human timeframe label for this series — `"1m"` / `"5m"` / `"15m"` / `"1h"`
     *  / `"4h"` / `"24h"` — DERIVED by the SDK from {@link BinaryMarket.intervalSec}
     *  (falling back to `expiry − tradingStart`) and snapped to its
     *  {@link CADENCE_LADDER_SEC} rung, so a roll that opened late reads as the
     *  cadence it belongs to rather than as its own (`56` → `"1m"`, not `"56s"`).
     *  A window matching no rung keeps its own value. Served ready-to-render so consumers stop
     *  re-deriving it; see {@link marketIntervalLabel}. `null` on SPOT / PERP or
     *  when no cadence is determinable.
     */
    interval?: string | null;
    /**
     *  Origin operator id the market was created under (from
     *  `BinaryMarketsModule.MarketCreated`). `null` when discovered via the
     *  realtime tail (filled on the next snapshot).
     */
    operatorId?: number | null;
    /**
     *  Origin venue id within the operator, contract-generated opaque bytes32 hex.
     *  `null` when discovered via the realtime tail (filled on the next snapshot —
     *  the live `MarketCreator.MarketCreated` event doesn't carry it).
     */
    venueId?: Hex | null;
};
/**
 * A market of any type, discriminated by `marketType`.
 *
 * @category markets
 */
export type Market = SpotMarket | PerpMarket | BinaryMarket;
/**
 *  Stamp a market row with the chain it was read from. The data-first mappers
 *  know the indexer, not the chain, so the owning client stamps every row at
 *  its boundary (`client.getMarket`, the live tail's snapshot, chain-synthesized
 *  perp rows). Returns a copy; the input is not mutated.
 *
 * @category markets
 */
export declare function withChain<T extends Market>(chainId: number, m: T): T;
/** {@link withChain} over a list, and over `null` for the single-row reads. */
export declare function withChainRows<T extends Market>(chainId: number, rows: T[]): T[];
/**
 * Narrow a {@link Market} to its binary variant.
 *
 * @category markets
 */
export declare function isBinaryMarket(m: Market): m is BinaryMarket;
/**
 * Whether a market is SETTLED: a binary market that resolved, voided or
 * finalized. Its pool is recycled onto the next market in the series, so a
 * settled market can still be redeemed and reported, but never traded, quoted
 * or watched through its pool. Spot and perp markets never settle.
 *
 * @category markets
 */
export declare function isSettledMarket(m: Market): boolean;
/**
 * Narrow a {@link Market} to its spot variant.
 *
 * @category markets
 */
export declare function isSpotMarket(m: Market): m is SpotMarket;
/**
 * Narrow a {@link Market} to its perp variant.
 *
 * @category markets
 */
export declare function isPerpMarket(m: Market): m is PerpMarket;
export declare const MarketFields: import("./gql/graphql.js").TypedDocumentString<import("./gql/graphql.js").MarketFieldsFragment, unknown>;
/**
 *  The flat row {@link MarketFields} actually returns — DERIVED from the schema,
 *  so every field name, alias, and wire type here is the indexer's, not a
 *  hand-written guess. Superseded the hand-maintained `RawMarketRow`.
 */
export type RawMarketRow = ResultOf<typeof MarketFields>;
/**
 *  {@link MarketFields} as raw GraphQL text, for the ONE query that cannot be a
 *  typed document yet: `snapshot.ts`'s `MarketsSnapshot` assembles its variable
 *  declarations and `where` clauses by string interpolation, and `graphql()`
 *  overloads key on the literal source string. Interpolating this keeps that
 *  query's selection in lockstep with the typed one (a field added here reaches
 *  both) even though its RESULT there is still hand-typed.
 *
 *  Not a permanent arrangement — `snapshot.ts` migrates with its own slice, where
 *  the dynamic text collapses into `Market_bool_exp` variables (an empty `{}`
 *  bool_exp is unconstrained, so the scoped/unscoped branch needs no string
 *  surgery). Until then this is the seam, and it is deliberately the *text*, not
 *  a second copy of the field list.
 */
export declare const MARKET_FIELDS: string;
export declare const asAddress: (s: string) => Address;
export declare const asHex: (s: string) => Hex;
/**
 *  Lowercase a `0x` value WITHOUT widening it back to `string`.
 *
 *  `Address` and `Hex` are template-literal types, so `.toLowerCase()` — which
 *  returns `string` — loses the type even though lowercasing a `0x${string}` can
 *  only ever produce another `0x${string}`. Used by the live-tail reducer, whose
 *  event args arrive already typed by viem's decoder and only need normalizing to
 *  the lowercase form the indexer and `store.ts`'s lookup maps use.
 */
export declare const lower0x: <T extends `0x${string}`>(s: T) => T;
/**
 *  Stamp the discriminated {@link Market} type onto a flat indexer row.
 *
 *  Builds one of three plain objects — {@link BinaryMarket}, {@link SpotMarket},
 *  or {@link PerpMarket} — picking only that variant's fields. Shared identity /
 *  volume / decimals land on every variant; type-specific columns do not cross
 *  the boundary (a binary row never carries `baseToken`, a spot row never
 *  carries `yesTokenId`).
 *
 *  Field names and wire types are schema-derived and compiler-checked. What
 *  remains is the ONE thing GraphQL cannot express: that `marketType` CORRELATES
 *  with which nullable columns are actually populated. The schema must declare
 *  every type-specific column nullable — a column has to be null for the other
 *  market types — so required fields are taken with `?? unreachable(...)`: an
 *  assertion the indexer's handlers uphold, not a proof. Binary also stamps the
 *  derived timeframe label (`interval`) — see {@link marketIntervalLabel}.
 *
 *  **Gotchas**
 *
 *  Throws {@link InvariantError} on a row whose own columns are not populated —
 *  an indexer/schema regression, never caller input. For LIST reads that is the
 *  wrong blast radius (one bad row would blank the page), so those map through
 *  {@link toMarkets}, which drops the offender instead. Single-row reads let it
 *  throw: there is no partial answer to degrade to.
 */
export declare function toMarket(r: RawMarketRow): Market;
/**
 *  {@link toMarket} across a list, DROPPING any row whose own columns are not
 *  populated instead of failing the whole read.
 *
 *  **When to use**
 *
 *  Every list read. `rows.map(toMarket)` is the shape to avoid: `toMarket` throws
 *  {@link InvariantError} on a malformed row, so one bad row out of 500 would
 *  reject the entire page rather than serve 499. A list has a sane partial answer
 *  and a single-row read does not — so `getMarket` and friends still let it throw.
 *
 *  **Gotchas**
 *
 *  A drop is SILENT: the SDK owns no log channel at this layer (`config.debug` is
 *  per-client and these are free functions), and the alternative — a bare
 *  `console.warn` from inside a library — is worse. The signal that something is
 *  wrong is a short count, plus `marketRowContract.ts` failing to compile once the
 *  schema drift reaches CI. Callers that must distinguish "no markets" from
 *  "markets the SDK could not parse" should compare against the row count.
 */
export declare function toMarkets(rows: readonly RawMarketRow[]): Market[];
/**
 *  How a binary market's threshold is established. See {@link BinaryMarket.mode}.
 *
 *  Not a chain enum — it is a reading of `strike`, whose 0 is the protocol's own
 *  sentinel for "this market resolves against another question's answer".
 *
 * @category markets
 */
export type BinaryResolutionMode = "reference" | "fixed";
/**
 *  Read a binary market's {@link BinaryResolutionMode} off its `strike` — the ONE
 *  place that reading happens.
 *
 *  Strike 0 is reference mode DECLARING "no fixed strike": a sentinel, never a $0
 *  threshold. `_strikeLabel` treats 0 as "no strike fragment" and reference
 *  resolution compares two numeric answers instead of reading a strike at all, so
 *  every market the current creator mints holds to it — but nothing in
 *  `_validateCreate` cross-checks it against `referenceQuestionId`, so it is
 *  convention rather than an enforced invariant. Centralized here so the day that
 *  changes is a one-line change.
 *
 *  Takes either encoding: the indexer serves `strike` as a decimal string, the
 *  contract event as a `uint256`.
 *
 * @category markets
 */
export declare function binaryResolutionMode(strike: string | bigint | null | undefined): BinaryResolutionMode;
/**
 *  Filters shared by the binary-market list queries (`listBinaryMarkets`,
 *  `listLiveBinaryMarkets`, `listPastBinaryMarkets`). Every field is optional;
 *  an omitted field does NOT constrain the query. Applied server-side (Hasura
 *  `where`), so `venueId` / `intervalSec` hit their indexes.
 *
 * @category markets
 */
export type BinaryMarketFilter = {
    /** Origin operator id (from `BinaryMarketsModule.MarketCreated`). */
    operatorId?: number;
    /** Origin venue id within the operator (contract-generated bytes32 hex). */
    venueId?: string;
    /** Underlying asset symbol, e.g. `"BTC"` | `"ETH"`. */
    asset?: string;
    /**
     *  Series cadence in seconds — a rung of {@link CADENCE_LADDER_SEC}: `60` (1m)
     *  | `300` (5m) | `900` (15m) | `3600` (1h) | `14400` (4h) | `86400` (24h).
     *
     *  Matched as a BAND of ± {@link CADENCE_TOLERANCE_SEC}, not exactly: a rolled
     *  market's indexed window is `expiry − tradingStart` and trading routinely
     *  opens a second or two late, so a 15m series is indexed at 898s and 899s as
     *  well as 900s. Passing `900` returns all three.
     */
    intervalSec?: number;
    /**
     *  Lifecycle status — `"Trading"` is active; `"Locked"` / `"Settling"` /
     *  `"Resolved"` / `"Voided"` are the not-active states.
     */
    status?: BinaryMarketStatus;
    /**
     *  Whether a TERMINAL event is indexed for the market — `false` narrows to
     *  markets with no indexed terminal event yet, `true` to markets with one.
     *  Omitted does not constrain.
     *
     *  Server-side on `resolvedAtTimestamp`, which every terminal path writes.
     *  Resolution and void both stamp it, on the module event and on the market
     *  contract's own; `voidExpired()` stamps it too even when no oracle answer
     *  arrived. That is why this is a separate facet rather than a
     *  {@link BinaryMarketFilter.status} value — `status` is derived from
     *  lifecycle EVENTS, and the timestamp-implicit Listed→Trading→Settling
     *  transitions emit none, so a market whose oracle never answers stays indexed
     *  as `"Trading"` forever. Filtering an unanswered market by status therefore
     *  finds nothing; filtering by this finds it.
     */
    resolved?: boolean;
    /**
     *  Whether the market settled by VOID — `true` narrows to voided markets,
     *  `false` to every other market, settled or not. Omitted does not constrain.
     *
     *  Server-side on `Market.voided`, the explicit flag every void path writes:
     *  the oracle's void answer delivered through the module, the market's own
     *  `voidMarket()`, and the permissionless `voidExpired()` backstop. Prefer it
     *  to `status: "Voided"` for the question "did this market void" — `status` is
     *  the event-derived lifecycle state, while this flag is written on the void
     *  itself and never cleared.
     *
     *  With {@link BinaryMarketFilter.resolvedSince} it counts the voids inside a
     *  window: the numerator of a void rate.
     */
    voided?: boolean;
    /**
     *  Lower bound, in unix seconds and inclusive, on when the market reached its
     *  terminal state: `resolvedAtTimestamp >= resolvedSince`. Omitted does not
     *  constrain. Takes either encoding, like `binaryResolutionMode` does: a
     *  `bigint` carried straight from a chain read or an indexed row, or a
     *  `number` derived from the clock. The value is sent to Hasura verbatim as a
     *  decimal string, so neither encoding is rounded on the way.
     *
     *  Server-side on the same `resolvedAtTimestamp` column as
     *  {@link BinaryMarketFilter.resolved}, so it implies `resolved: true` — a
     *  market with no terminal event has no timestamp to compare and never
     *  matches. `resolved: false` beside it selects nothing.
     *
     *  A bound on the TERMINAL timestamp, not on `expiry`, and the difference
     *  matters for a window: the protocol permits a void before expiry, so a
     *  window keyed on `expiry` misses exactly the early voids a void-rate monitor
     *  exists to count. `countBinaryMarkets` with `resolvedSince` and no `phase`
     *  counts every market that settled inside the window, whatever its expiry.
     */
    resolvedSince?: number | bigint;
    /**
     *  Exclusive upper bound on the terminal timestamp: `resolvedAtTimestamp <
     *  resolvedBefore`. Same encodings and column as
     *  {@link BinaryMarketFilter.resolvedSince}; the two AND together. Bounding
     *  at the indexer's processed block time yields a set no later block can
     *  add to, which is what makes offset paging over it exact.
     */
    resolvedBefore?: number | bigint;
    /**
     *  Free-text needle matched (case-insensitive) against the asset symbol and
     *  the question text. Server-side (`_ilike`), AND-combined with the other
     *  facets so it narrows within them.
     */
    search?: string;
    /**
     *  Wallet that invoked createMarket (from `BinaryMarketsModule.MarketCreated`).
     *  Case-insensitive (lowercased server-side).
     */
    creator?: string;
    /**
     *  Server-side sort (Hasura `order_by`). `"newest"` → createdAtTimestamp desc;
     *  `"closingSoon"` → expiry asc; `"volume"` → cumulativeQuoteVolume desc;
     *  `"tradeCount"` → tradeCount desc; `"resolvedAt"` → resolvedAtTimestamp asc, id asc
     *  (earliest-settled first, a total order so offset pages never split a tie; pair
     *  it with {@link BinaryMarketFilter.resolvedSince} to walk settlements in the
     *  order they happened). Omitted → each list keeps its own default
     *  (`listBinaryMarkets` newest-first; `listLiveBinaryMarkets` closingSoon).
     */
    orderBy?: BinaryMarketOrderBy;
};
/**
 * Sort keys for the binary-market list queries — see {@link BinaryMarketFilter.orderBy}.
 *
 * @category markets
 */
export type BinaryMarketOrderBy = "newest" | "closingSoon" | "volume" | "tradeCount" | "resolvedAt";
/**
 *  List markets of either type (or filter to one), newest first, as the
 *  discriminated {@link Market} union. For binary-only callers that want a
 *  pre-narrowed {@link BinaryMarket}[], {@link listBinaryMarkets} is the same
 *  query with the filter and narrowing baked in.
 *
 * **Details**
 *
 * - `opts.marketType`: Restrict to one kind (`"BINARY"` | `"SPOT"` | `"PERP"`).
 * - `opts.limit`: Max rows (default 50).
 */
export declare function listMarkets(opts: {
    marketType?: MarketType;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<Market[]>;
/**
 *  {@link listMarkets} with the rows it could not parse counted — see
 *  {@link RegistrySweep}. `markets.length + dropped` is the number of rows the indexer
 *  served, so a caller that asks for one row past its cap can tell a cut list.
 */
export declare function listMarketsChecked(opts: {
    marketType?: MarketType;
    limit?: number;
    offset?: number;
}, indexerUrl: IndexerRead.Source): Promise<RegistrySweep>;
/**
 *  A registry sweep with the silent drop made visible — see
 *  {@link SomniaMarketsClient.listRegistryMarketsChecked}.
 *
 * @category markets
 */
export interface RegistrySweep {
    /** The markets that parsed, exactly what `listRegistryMarkets` returns. */
    markets: Market[];
    /**
     *  Rows the indexer served that the SDK could not parse, and so are absent
     *  from `markets`. Zero means the sweep is complete: every row the registry
     *  holds is in hand.
     */
    dropped: number;
}
/**
 *  Registry sweep for the unified tier: every non-binary market plus the
 *  binary series that are still live (`finalized` false or not yet stamped),
 *  paged until exhausted.
 *
 *  **Gotchas**
 *
 *  Finalized series accumulate without bound and would swamp the symbol registry
 *  with thousands of dead markets, so they are excluded — resolve those by pool
 *  via the raw-tier lookups instead.
 *
 *  A malformed row is DROPPED silently, so the returned length alone cannot tell
 *  "no markets" from "markets this SDK could not parse". A caller whose answer
 *  depends on the sweep being exhaustive — a monitor claiming coverage, say —
 *  wants {@link listRegistryMarketsChecked}, which reports the drops.
 */
export declare function listRegistryMarkets(indexerUrl: IndexerRead.Source): Promise<Market[]>;
/**
 *  {@link listRegistryMarkets} with the dropped rows COUNTED — see
 *  {@link RegistrySweep}.
 *
 *  **When to use**
 *
 *  When a short answer must be distinguishable from a complete one. `toMarkets`
 *  drops a row it cannot parse rather than failing the page, which is the right
 *  trade for a list and the wrong one for a caller that treats absence as proof:
 *  a market missing from the sweep is missing from every count derived from it,
 *  so nothing in the plain read reveals the gap. `dropped > 0` is that signal.
 */
export declare function listRegistryMarketsChecked(indexerUrl: IndexerRead.Source): Promise<RegistrySweep>;
/**
 *  The markets the live registry holds: every SPOT and PERP market, and every
 *  BINARY market that is not finalized. A BINARY row whose `finalized` is null
 *  (not stamped yet) counts as not finalized. The all-markets snapshot applies
 *  the same filter; `test/registrySweep.test.ts` pins the two together.
 *
 *  `_in` rather than `_neq: "BINARY"`, so Postgres can serve that arm from the
 *  `marketType` index.
 */
export declare const REGISTRY_ELIGIBLE_WHERE: Market_Bool_Exp;
/**
 *  Server-side COUNT of markets, optionally of one type (Hasura `Market_aggregate`)
 *  — so a spot/perp list paginates against a real total without fetching rows.
 *  Privileged `_aggregate` role (server-only), like {@link countBinaryMarkets}.
 *
 *  WITHOUT THAT HEADER THE TOTAL IS A LOWER BOUND, capped at
 *  {@link IndexerRead.COUNT_FALLBACK_CAP}. {@link countMarketsBounded} says
 *  whether it was.
 */
export declare function countMarkets(opts: {
    marketType?: MarketType;
} | undefined, indexerUrl: IndexerRead.Source, headers?: Record<string, string>): Promise<number>;
/**
 *  {@link countMarkets}, reporting whether the read was cut short — see
 *  {@link IndexerRead.CountResult}.
 */
export declare function countMarketsBounded(opts: {
    marketType?: MarketType;
} | undefined, indexerUrl: IndexerRead.Source, headers?: Record<string, string>): Promise<IndexerRead.CountResult>;
/** Maximum primary-key selections in one settled-market request. */
export declare const RESOLVABLE_MARKET_CAPACITY = 25;
/** Internal bounded lookup; every requested alias must prove its own row or null. */
export declare function resolveMarkets(ids: readonly string[], source: IndexerRead.Source): Promise<(Market | null)[]>;
/**
 *  Fetch one market of either type by primary key, as the {@link Market} union
 *  (null if absent). {@link getBinaryMarket} is the binary-narrowed counterpart.
 */
export declare function getMarket(id: string, indexerUrl: IndexerRead.Source): Promise<Market | null>;
/**
 *  Fetch one market by its on-chain BinaryMarket ADDRESS (not the bytes32 marketId
 *  primary key). The market PK is `marketId`, so a caller that only holds the
 *  address (e.g. an explorer route keyed on the market clone address) must resolve
 *  through this. Newest first so a recycled/rebound address returns its current
 *  market. Null if the indexer has no row yet.
 */
export declare function getMarketByAddress(marketAddress: string, indexerUrl: IndexerRead.Source): Promise<Market | null>;
/** Binary-narrowed {@link getMarketByAddress}. */
export declare function getBinaryMarketByAddress(marketAddress: string, indexerUrl: IndexerRead.Source): Promise<BinaryMarket | null>;
/**
 *  Options for `listBinaryMarkets` — the {@link BinaryMarketFilter} plus a page.
 *
 * @category markets
 */
export type ListBinaryMarketsOptions = BinaryMarketFilter & {
    /** Page size (default 50). */
    limit?: number;
    /** Row offset into the filtered, ordered list (default 0). */
    offset?: number;
};
/**
 *  One page of binary markets, newest first unless `orderBy` says otherwise,
 *  pre-narrowed to {@link BinaryMarket}[]. Takes {@link ListBinaryMarketsOptions}: the
 *  {@link BinaryMarketFilter} to narrow by venue / asset / cadence / status —
 *  e.g. `{ venueId: "0x…" }` — plus `limit` (default 50) and `offset` (default
 *  0) to page. With no argument it returns the 50 newest. Note "binary", not
 *  "clob": spot markets are order books (CLOBs) too.
 *
 *  Each row carries `poolAddress` + `nonce` (settlement-extraction v2). RECYCLE
 *  CAVEAT: `poolAddress` is a TIME-VARYING binding — the same pool serves
 *  successive markets (never concurrently), so several rows can share a pool.
 *  Key markets by `marketId`; `(poolAddress, nonce)` identifies a market's slice
 *  of a pool's history and encodes its outcome ids.
 */
export declare function listBinaryMarkets(opts: ListBinaryMarketsOptions | undefined, indexerUrl: IndexerRead.Source): Promise<BinaryMarket[]>;
/**
 *  Distinct (operatorId, venueId) pairs present across binary markets — the
 *  cheap server-side source for a venue filter's options (via Hasura
 *  `distinct_on`), so a UI never has to fetch every market just to learn which
 *  venues exist. Markets with a null attribution are excluded.
 */
export declare function listBinaryVenueIds(indexerUrl: IndexerRead.Source): Promise<{
    operatorId: number;
    venueId: string;
}[]>;
/**
 *  Distinct asset symbols present across binary markets — the cheap
 *  server-side source for an asset filter's options (Hasura `distinct_on`), so
 *  a UI never fetches every market to learn which assets exist.
 */
export declare function listBinaryAssets(indexerUrl: IndexerRead.Source): Promise<string[]>;
/**
 *  Options for `countBinaryMarkets` / `countBinaryMarketsBounded` — the
 *  {@link BinaryMarketFilter} plus an optional lifecycle phase and a `now`
 *  override.
 *
 * @category markets
 */
export type BinaryMarketCountOptions = BinaryMarketFilter & {
    /**
     *  Lifecycle phase to count: `"live"` = `expiry > now`, `"past"` =
     *  `expiry <= now`. OMITTED counts across both — every binary market the
     *  filter matches, whatever its expiry. Omit it for a count keyed on
     *  something other than expiry, such as
     *  {@link BinaryMarketFilter.resolvedSince}, so an early void is not dropped
     *  by a phase it is not in yet.
     */
    phase?: "live" | "past";
    /** Override "now" (unix seconds) for the phase cut; defaults to `Date.now()`. */
    nowSec?: number;
};
/**
 *  Server-side COUNT of binary markets matching a filter, optionally split by
 *  lifecycle phase (`"live"` = `expiry > now`, `"past"` = `expiry <= now`; no
 *  `phase` counts both). Uses Hasura `Market_aggregate` so a total never
 *  requires fetching rows — the browser learns "1,240 live" in O(1), not by
 *  loading 1,240 markets.
 *
 *  WITHOUT THAT HEADER THE TOTAL IS A LOWER BOUND, capped at
 *  {@link IndexerRead.COUNT_FALLBACK_CAP} — which `Market` passes during 2026.
 *  {@link countBinaryMarketsBounded} says whether it was; a paginator gating on
 *  `rows.length < count` needs it.
 */
export declare function countBinaryMarkets(opts: BinaryMarketCountOptions | undefined, indexerUrl: IndexerRead.Source, headers?: Record<string, string>): Promise<number>;
/**
 *  {@link countBinaryMarkets}, reporting whether the read was cut short — see
 *  {@link IndexerRead.CountResult}. `truncated: true` means more markets match
 *  than `count` says, so a `rows.length < count` pagination gate would stop
 *  early.
 */
export declare function countBinaryMarketsBounded(opts: BinaryMarketCountOptions | undefined, indexerUrl: IndexerRead.Source, headers?: Record<string, string>): Promise<IndexerRead.CountResult>;
/**
 *  Fetch one binary market by primary key (lowercased bytes32 marketId),
 *  narrowed to {@link BinaryMarket} (null if absent or not binary).
 */
export declare function getBinaryMarket(id: string, indexerUrl: IndexerRead.Source): Promise<BinaryMarket | null>;
/**
 *  The origin attribution + fee config frozen into a market at creation,
 *  mirrored from `BinaryMarketsModule.MarketCreated` / `MarketFeeConfig` into the
 *  indexer's `MarketVenue` entity. Rates are standard basis points (1 = 0.01%,
 *  100 = 1%, 10_000 = 100%). Fee fields are null for markets indexed before the
 *  fee plumbing existed.
 *
 * @category markets
 */
export type MarketFees = {
    /** Origin operator id the market was created under. */
    operatorId: number;
    /** Origin venue id within the operator (bytes32 hex). */
    venueId: string;
    /** Fee recipient frozen at creation (lowercased); null on pre-plumbing markets. */
    feeRecipient: string | null;
    /** Maker fee rate (bps, decimal string); null on pre-plumbing markets. */
    makerFeeBps: string | null;
    /** Taker fee rate (bps, decimal string); null on pre-plumbing markets. */
    takerFeeBps: string | null;
    /** Cap on the per-order builder fee (bps, decimal string); null pre-plumbing. */
    maxBuilderFeeBps: string | null;
    /** Routing fee rate (bps, decimal string); null on pre-plumbing markets. */
    routingFeeBps: string | null;
    /** Settlement fee skimmed from the winning payout at redeem (bps). */
    settlementFeeBps: string | null;
    /** Realized settlement fee collected on winning redemptions so far (raw collateral). */
    settlementFeesCollected: string | null;
};
/**
 *  Fetch the fee config frozen into a market (null when the market has no venue
 *  attribution — e.g. spot/perp, or pre-plumbing binary markets).
 */
export declare function getMarketFees(marketId: string, indexerUrl: IndexerRead.Source): Promise<MarketFees | null>;
/**
 * Filters for {@link SomniaMarketsClient.listSpotMarkets}. All optional; applied server-side.
 *
 * @category markets
 */
export type SpotMarketFilter = {
    /** Base token symbol, e.g. `"SOMI"` | `"WBTC"`. */
    baseSymbol?: string;
    /** Quote token symbol, e.g. `"USDso"`. */
    quoteSymbol?: string;
};
/**
 *  List spot markets, newest first, pre-narrowed to {@link SpotMarket}[]. Pass a
 *  {@link SpotMarketFilter} (+ `limit`) to narrow by base/quote symbol.
 */
export declare function listSpotMarkets(opts: (SpotMarketFilter & {
    limit?: number;
}) | undefined, indexerUrl: IndexerRead.Source): Promise<SpotMarket[]>;
/**
 *  One spot market by pool address, or null (also null if the id resolves to
 *  another market kind).
 */
export declare function getSpotMarket(id: string, indexerUrl: IndexerRead.Source): Promise<SpotMarket | null>;
/**
 *  One entry in a market's lifecycle audit trail (from the indexer's
 *  MarketStatusUpdate entity).
 *
 * @category markets
 */
export type MarketStatusUpdate = {
    /** Status before the transition. */
    oldStatus: BinaryMarketStatus;
    /** Status after the transition. */
    newStatus: BinaryMarketStatus;
    /** Block the transition landed in (decimal string). */
    blockNumber: string;
    /** Timestamp (unix seconds) of the transition. */
    timestamp: string;
    /** Tx hash the transition landed in. */
    txHash: string;
};
/**
 *  The status-transition history for a market (e.g. Trading → Locked → Settling
 *  → Resolved), oldest-first — the resolution/lock timeline for a market page.
 */
export declare function getMarketStatusHistory(marketId: string, indexerUrl: IndexerRead.Source): Promise<MarketStatusUpdate[]>;
/**
 * Filters for {@link SomniaMarketsClient.listPerpMarkets}. All optional; applied server-side.
 *
 * @category markets
 */
export type PerpMarketFilter = {
    /** Synthetic-base token symbol, e.g. `"WBTC"`. */
    baseSymbol?: string;
    /** Collateral (quote) token symbol, e.g. `"USDso"`. */
    quoteSymbol?: string;
};
/**
 *  List perp markets, newest first, pre-narrowed to {@link PerpMarket}[].
 *
 * **Details**
 *
 * - `opts`: {@link PerpMarketFilter} plus `limit` (max rows, default 50).
 */
export declare function listPerpMarkets(opts: (PerpMarketFilter & {
    limit?: number;
}) | undefined, indexerUrl: IndexerRead.Source): Promise<PerpMarket[]>;
/**
 *  Fetch one perp market by primary key (lowercased pool address), narrowed to
 *  {@link PerpMarket} (null if absent or not a perp).
 */
export declare function getPerpMarket(id: string, indexerUrl: IndexerRead.Source): Promise<PerpMarket | null>;
/**
 *  Filters for `listLiveBinaryMarkets`. Every field is optional; an omitted
 *  field does NOT constrain the query. Applied server-side (Hasura `where`), so
 *  `venueId` / `intervalSec` hit their indexes.
 *
 * @category markets
 */
export type LiveBinaryMarketsFilter = BinaryMarketFilter & {
    /**
     *  Page size (default 50). Live is unbounded at scale (thousands of venues ×
     *  cadences), so it is ALWAYS paginated — never fetch the whole live set.
     */
    limit?: number;
    /** Row offset for cursoring the live board (default 0). */
    offset?: number;
    /** Override "now" (unix seconds); defaults to `Date.now()`. Mostly for tests. */
    nowSec?: number;
};
/**
 *  Paginated list of CURRENTLY LIVE binary markets (`expiry > now`), soonest-to-
 *  expire first. `limit` + `offset` cursor the live board exactly like
 *  {@link listPastBinaryMarkets} does the historical tail — the caller fetches
 *  page 1 server-side and more pages on demand. Pass a
 *  {@link LiveBinaryMarketsFilter} to narrow by operator / venue / asset /
 *  cadence / status / search.
 */
export declare function listLiveBinaryMarkets(filter: LiveBinaryMarketsFilter | undefined, indexerUrl: IndexerRead.Source): Promise<BinaryMarket[]>;
/**
 *  Options for `listPastBinaryMarkets` — the {@link BinaryMarketFilter}
 *  plus pagination + a `now` override.
 *
 * @category markets
 */
export type PastBinaryMarketsOptions = BinaryMarketFilter & {
    /** Page size (default 50). */
    limit?: number;
    /** Row offset for cursoring the historical tail (default 0). */
    offset?: number;
    /** Override "now" (unix seconds); defaults to `Date.now()`. */
    nowSec?: number;
};
/**
 *  Paginated list of PAST binary markets (`expiry <= now`), most-recently-
 *  expired first. `limit` + `offset` cursor the historical tail — the caller
 *  typically fetches page 1 on initial render (server-side) and additional
 *  pages client-side on user demand. Live markets are excluded; use
 *  {@link listLiveBinaryMarkets} for those. Accepts the same
 *  {@link BinaryMarketFilter} (venue / asset / cadence / status).
 */
export declare function listPastBinaryMarkets(opts: PastBinaryMarketsOptions | undefined, indexerUrl: IndexerRead.Source): Promise<BinaryMarket[]>;
/**
 *  The level a binary market's outcome is measured against, in the oracle's
 *  price scale — the one answer to that question, for every surface that asks.
 *
 *  Which source supplies it is exactly {@link BinaryMarket.mode}:
 *
 *  - `"reference"` — the posted answer to the market's reference question, from
 *    the `openingPrices` map that `client.getOpeningPrices` returns. `null` until the oracle
 *    posts it, which is a real and temporary state.
 *  - `"fixed"` — the market's own `strike`, known from creation.
 *
 *  Null on a chain-seeded market row, whose `strike`/`mode` are both null —
 *  same em dash as an unposted reference answer, which is what a surface with
 *  no boundary to show wants either way.
 *
 *  `posted` says WHICH, because it decides what a caller may CLAIM about the
 *  number: only a posted answer has an "answered at" instant, so only it may be
 *  labelled as one. Returning it here rather than letting callers re-test the
 *  map keeps the label and the value derived from one decision.
 *
 *  Lives here rather than in a UI because it is protocol knowledge, not
 *  presentation: which of two mechanisms a venue chose.
 *
 *  Scale is the caller's to apply, as with any raw oracle value.
 *
 * @category markets
 */
export declare function boundaryPrice(m: Pick<BinaryMarket, "id" | "strike" | "mode">, openingPrices: Record<string, string | null>): {
    raw: string;
    posted: boolean;
} | null;
/**
 *  Batch-fetch the OPENING price (the reference-question oracle answer) for many
 *  binary markets in ONE pair of round-trips — for list views that want to show
 *  each up/down market's opening price without an N+1 fan-out. Returns a map of
 *  lowercased marketId → raw `numericValue` (or `null` when the reference has no
 *  answer yet / the market has no reference question). Format with the market's
 *  oracle price scale (see the explorer's `fmtOraclePrice`).
 */
export declare function getOpeningPrices(marketIds: string[], indexerUrl: IndexerRead.Source): Promise<Record<string, string | null>>;
/**
 *  Batch-fetch the RESOLUTION price (the answer the market settled on) for many
 *  binary markets in ONE pair of round-trips — the settlement counterpart to
 *  {@link getOpeningPrices}, for views that mark where the price finished.
 *
 *  Joins each market's OWN `oracleQuestionId` to its {@link OracleAnswer}, so
 *  unlike the opening price this works for FIXED-STRIKE markets too: they have
 *  no reference question, but they do have a resolution one. Returns a map of
 *  lowercased marketId → raw `numericValue`, or `null` where the market is
 *  unresolved, carries no question id, or the oracle has posted nothing.
 *
 *  A VOIDED answer returns `null`, not its raw `numericValue`: the oracle
 *  declined to answer, so there is no settlement price to report.
 *
 *  SCALE IS NOT CARRIED, and that is a trap worth stating. Callers scale these
 *  by the explorer's `ORACLE_PRICE_DECIMALS` (2), which is empirical, not
 *  schema-backed: `OracleAnswer` has no decimals column, because `numericDecimals`
 *  lives in the question definition at schedule time and is not on `AnswerPosted`.
 *  Adapters genuinely differ — `getOnchainResolutionPrice` reads `PRICE_DECIMALS`
 *  for that reason and sees 18 on the price-feed adapter, 2 on OracleHub.
 *
 *  So the day the indexer starts ingesting an 18-decimal adapter's answers, this
 *  function begins returning 18-decimal values that every caller divides by 100.
 *  Worse, the on-chain fallback that WOULD read the right scale is gated on the
 *  indexed value being absent, so it switches off exactly when it is needed.
 *  Whoever lands that indexer change must carry `numericDecimals` onto
 *  `OracleAnswer` and return it here in the same commit.
 */
export declare function getResolutionPrices(marketIds: string[], indexerUrl: IndexerRead.Source): Promise<Record<string, string | null>>;
/**
 *  A BinaryMarket's wiring + live state, read straight from chain (works before
 *  the indexer has the market).
 *
 * @category markets
 */
export interface MarketOnchain {
    /** The BinaryMarket contract address (resolved from the module record). */
    marketAddress: Address;
    /** Protocol-level ERC-6909 outcome-token singleton (shared across all markets). */
    outcomeToken: Address;
    /** This market's YES position id on the singleton. */
    yesId: bigint;
    /** This market's NO position id on the singleton. */
    noId: bigint;
    /**
     *  The pool hosting (or that hosted) this market's CLOB. Settlement-extraction
     *  v2: a pool address is a TIME-VARYING binding — the same pool serves
     *  successive markets, so never key a market by pool address; `(pool, nonce)`
     *  identifies this market's slice of the pool's history.
     */
    pool: Address;
    /** The pool's market nonce for THIS market (part of the outcome-id encoding). */
    nonce: bigint;
    /** ERC-20 collateral token the market settles in (its `decimals` scale `backing`). */
    collateral: Address;
    /** MarketStatus enum: 0 Listed · 1 Trading · 2 Locked · 3 Settling · 4 Resolved · 5 Voided */
    status: number;
    /**
     *  Live collateral backing. While trading this is the pool's `setBacking` (via
     *  `market.backing()`); once the market is FINALIZED onto the settlement
     *  singleton the pool reads 0, so this falls back to the settlement record's
     *  remaining NET backing (post fee-skim, decremented by each redemption).
     */
    backing: bigint;
    /**
     *  True once the market's backing + resolution snapshot were swept to the
     *  BinarySettlement singleton (redemption is served there from then on).
     */
    finalized: boolean;
    /** Trading-close / settlement timestamp (seconds). */
    expiry: bigint;
    /** Collateral token decimals. Falls back to DECIMALS (6) only if the token lacks the decimals() view; other read failures throw. */
    decimals: number;
    /**
     *  Winning outcome (0 = YES, 1 = NO). Only meaningful when `isResolved` — the
     *  contract returns 0 by default which would otherwise read as a YES win on
     *  a market that hasn't resolved yet.
     */
    winningOutcome: number;
    /** Oracle has resolved the market to a concrete winning outcome. */
    isResolved: boolean;
    /** Oracle has voided the market (payout per the frozen void policy; see `voidPolicy`). */
    isVoided: boolean;
    /**
     *  Void payout policy frozen at creation: 0 UNIFORM, 2 CLOB_SNAPSHOT (a void
     *  pays `[p, D-p]` at the closing YES price). `null` on pre-policy market
     *  clones, which lack the selector and always void uniform.
     */
    voidPolicy: number | null;
}
/**
 *  A market's resolution price, read from the oracle adapter it was bound to —
 *  what `client.getOnchainResolutionPrice(marketId)` resolves.
 *
 * @category markets
 */
export interface OnchainResolutionPrice {
    /** Raw numeric answer as the adapter posted it, at {@link decimals} scale. */
    numericValue: string;
    /** Scale of {@link numericValue} — the adapter's `PRICE_DECIMALS`, or the fallback. */
    decimals: number;
    /** The oracle voided the question rather than answering it. */
    voided: boolean;
    /** The adapter the answer was read from (markets bind to exactly one). */
    adapter: Address;
    /** The adapter-scoped question id the answer belongs to. */
    oracleQuestionId: string;
}
/**
 *  Read a market's RESOLUTION price straight from chain: resolve the market's
 *  bound oracle adapter + question id through the module, then pull the numeric
 *  answer from that adapter.
 *
 *  This is the fallback for an answer the indexer does not have. Adapters other
 *  than the one whose events the indexer ingests still resolve markets — their
 *  answers simply never reach the `OracleAnswer` table — so a market can be
 *  settled on chain with a price no query can see. Reading through the module
 *  record means this works for ANY adapter, because the market itself names the
 *  one that resolved it.
 *
 *  Returns `null` when the question is not final: `pullNumericAnswer` reverts
 *  in that case by interface contract, which is a state, not a failure.
 *
 *  The scale is read from the adapter (`PRICE_DECIMALS`) rather than assumed —
 *  adapters genuinely differ, and mis-scaling a price by 10^16 is worse than
 *  showing none. `fallbackDecimals` covers the adapters with no getter.
 */
export declare function getOnchainResolutionPrice(marketId: Hex, sources: {
    module: Address;
    fallbackDecimals?: number;
}, client: PublicClient, ownedFailure?: (error: unknown) => error is SomniaMarketsSocketFailure, firstOwnedFailure?: () => SomniaMarketsSocketFailure | undefined): Promise<OnchainResolutionPrice | null>;
/**
 * Module/settlement wiring `getMarketOnchain` resolves the market through.
 *
 * @category markets
 */
export interface MarketOnchainSources {
    /** BinaryMarketsModule address (the on-chain market registry). */
    module: Address;
    /**
     *  BinarySettlement singleton — enables the post-finalize backing fallback.
     *  Omit on pre-v2 deploys; `finalized` then stays false and `backing` is the
     *  raw `market.backing()` value.
     */
    settlement?: Address;
}
/**
 * Read a market's wiring + live state by its bytes32 `marketId`.
 *
 * BREAKING (settlement-extraction v2, SDK 0.13.0): this took the BinaryMarket
 * contract ADDRESS before; it now takes the module `marketId` and resolves the
 * record through the BinaryMarketsModule. A pool (or its market contract
 * address) can no longer stand in for a market identity — pools are recycled
 * across successive markets — so every market-keyed read goes through
 * `marketId`. A 20-byte address is rejected loudly at runtime.
 */
export declare function getMarketOnchain(marketId: Hex, sources: MarketOnchainSources, client: PublicClient): Promise<MarketOnchain>;
/**
 *  The chain-only binding between a binary pool and the market it currently
 *  hosts. Read it with `client.getPoolMarketBinding(pool)`.
 *
 * @category markets
 */
export interface PoolMarketBinding {
    /** The pool the binding was read for, echoed back exactly as supplied. */
    pool: Address;
    /** The module id of the market this pool currently hosts (bytes32 hex). */
    marketId: Hex;
    /** The BinaryMarket contract address the pool points at. */
    marketAddress: Address;
    /**
     *  The pool's market nonce at the read block. `(pool, nonce)` identifies this
     *  market's slice of the pool's history: the nonce increments on every
     *  recycle, so a caller holding an older nonce holds a stale binding.
     */
    nonce: bigint;
    /**
     *  True once the market's backing and resolution snapshot were swept to the
     *  settlement singleton. It does NOT mean the pool was released: a finalized
     *  pool can still hold resting orders, and it stays bound to its last market
     *  until the next recycle.
     */
    finalized: boolean;
    /** The single block both reads were made at. */
    blockNumber: bigint;
}
/**
 *  Options for `client.getPoolMarketBinding(pool, opts)`.
 *
 * @category markets
 */
export interface GetPoolMarketBindingOptions {
    /**
     *  Read at this block instead of the current head. Supply it to join this
     *  binding with other reads at one state.
     */
    blockNumber?: bigint;
}
/**
 *  Read which market a binary pool currently hosts, from chain alone.
 *
 *  This is the cold-start source of the `(pool, marketId)` binding. The ordinary
 *  source is the indexer, which is the service that is unreachable when a chain
 *  seed is needed. Pass the result's `marketId` to
 *  `watchMarket(pool, { seed: "chain", marketId })` to start a live book with
 *  the indexer down.
 *
 *  The binding is exact under pool recycling. A pool serves successive markets,
 *  and `market()` names the current one; the module's reverse lookup maps that
 *  market address to its id and is written once per market and never deleted.
 *
 *  Both reads are made at ONE block. That is required, not an optimisation: if
 *  the id read landed on a node behind the pool read, it would return zero just
 *  after a recycle and this would report a false `null`.
 *
 *  Resolves to `null` only for known absence. Absence means one thing here: the
 *  pool's market does not belong to this module, so the reverse lookup answers
 *  zero. A failed read throws and never becomes `null`.
 *
 *  Hold only the market address? Use `getMarketIdOnchain(marketAddress)`, which
 *  is the same reverse lookup without the pool reads.
 *
 *  The result is verified before it is returned: the module's own record for the
 *  id must name this pool, and its nonce must equal the pool's. A mismatch means
 *  the pool and the module disagree, so the read throws rather than return a
 *  binding that would filter a book on the wrong market.
 *
 * @throws {@link InvalidInputError} when the module record contradicts the pool.
 * @category markets
 */
export declare function getPoolMarketBinding(pool: Address, module: Address, client: PublicClient, opts?: GetPoolMarketBindingOptions): Promise<PoolMarketBinding | null>;
/**
 * The clone address is immutable for one market generation. Read it afresh on
 * the owner's decorated boundary before a facade write; a cached registry row
 * can remain Trading after its pool has been recycled. This is a preflight,
 * not an atomic on-chain generation constraint.
 */
export declare function assertBinaryPoolGeneration(pool: Address, marketAddress: Address, client: PublicClient): Promise<void>;
/**
 *  Read a BinaryMarket contract address's module id, from chain alone.
 *
 *  Use this when you hold a market ADDRESS and need its `marketId` — the id is
 *  what every market-keyed read takes. A market page whose route carries the
 *  contract address is the usual case. The indexer answers the same question
 *  through `getBinaryMarketByAddress`, so this read exists for the times the
 *  indexer is unreachable.
 *
 *  The mapping is written once per market and never deleted, so an address
 *  resolves to the same id for the module's lifetime. This is the same lookup
 *  `getPoolMarketBinding` performs; use that one when you hold a pool address.
 *
 *  Resolves to `null` for known absence: this module did not create the market.
 *  A failed read throws and never becomes `null`.
 *
 * @category markets
 */
export declare function getMarketIdOnchain(marketAddress: Address, module: Address, client: PublicClient, opts?: {
    blockNumber?: bigint;
}): Promise<Hex | null>;
/**
 *  A pool's creator — its first-deploy market creator, the only party that can
 *  reuse it (settlement-extraction v2 creator-scoped pool reuse). Zero address
 *  for a pool the module never deployed. Pure chain read (no signer) — the
 *  indexer-backed equivalent is `getPool(address)`'s `creator`.
 */
export declare function getPoolCreator(pool: Address, module: Address, client: PublicClient): Promise<Address>;
/**
 *  owner / implementation / native balance for a deployed contract — the
 *  diagnostics the /system dashboard shows. `owner` is null when the contract
 *  isn't Ownable; `impl` is read from the EIP-1967 slot only when `proxy` is
 *  true (null otherwise, or when the slot is empty). Each sub-read degrades to
 *  null/0 independently so one missing getter never fails the whole card.
 *
 * @category markets
 */
export interface ContractMeta {
    /** Ownable `owner()`, or null when the contract exposes no owner getter. */
    owner: Address | null;
    /**
     *  EIP-1967 implementation address — null unless read as a proxy with a
     *  non-empty slot.
     */
    impl: Address | null;
    /** Native (SOMI) balance, raw wei (18dp); 0n when the read fails. */
    balance: bigint;
}
export declare function getContractMeta(address: Address, opts: {
    proxy?: boolean;
}, client: PublicClient, ownedFailure?: (error: unknown) => error is SomniaMarketsSocketFailure, firstOwnedFailure?: () => SomniaMarketsSocketFailure | undefined): Promise<ContractMeta>;
