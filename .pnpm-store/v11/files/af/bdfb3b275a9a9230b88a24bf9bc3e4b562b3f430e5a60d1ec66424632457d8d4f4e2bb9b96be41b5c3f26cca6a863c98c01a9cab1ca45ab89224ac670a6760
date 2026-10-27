import type { SomniaMarketsSocketFailure } from "./config.js";
import type { Address } from "viem";
import type { BinaryMarket, Market } from "./markets.js";
import type { FundingPayment, LiquidationEvent, ListLiquidationsOptions } from "./perp/history.js";
/**
 *  Data-source mode of the live tail: `"init"` until the first watch has hydrated,
 *  `"tailing"` once the store is fed by the chain event stream.
 *
 * @category live data
 */
export type TailMode = "init" | "tailing";
/**
 *  Where a watch took its book seed. `"indexer"` reads one consistent
 *  `MarketsSnapshot`; `"chain"` drains the pool's resting orders from the pool
 *  contract at one pinned block, so startup needs no indexer.
 *
 * @category live data
 */
export type SeedSource = "indexer" | "chain";
/**
 * A side on a binary book: buy/sell the YES or NO outcome token.
 *
 * @category live data
 */
export type BinarySide = "BUY_YES" | "SELL_YES" | "BUY_NO" | "SELL_NO";
/**
 * How a binary fill settled: direct outcome trade, or a mint/burn of a YES+NO pair.
 *
 * @category live data
 */
export type BinaryFillKind = "DIRECT_YES" | "DIRECT_NO" | "MINT_A_PAIR" | "BURN_A_PAIR";
/**
 *  Order lifecycle — shared by spot and binary orders. Spot orders are born
 *  "Closed" and promoted to "Open" by OrderRested (mirror of the indexer).
 *
 * @category live data
 */
export type OrderStatus = "Open" | "Closed" | "Filled" | "Cancelled" | "Expired";
/**
 *  Binary-market lifecycle (mirror of the indexer's `ClobMarketStatus` enum).
 *  The first six mirror the on-chain `MarketStatus` enum; `"Finalized"` is an
 *  INDEXER-DERIVED terminal state (no on-chain enum member) set when the
 *  market's backing + resolution snapshot are swept to the BinarySettlement
 *  singleton — it supersedes Resolved/Voided once finalize lands, and
 *  redemptions are served by settlement thereafter.
 *
 * @category live data
 */
export type BinaryMarketStatus = "Listed" | "Trading" | "Locked" | "Settling" | "Resolved" | "Voided" | "Finalized";
/**
 *  Index → status for the on-chain MarketStatus enum (StatusChanged events).
 *  Deliberately EXCLUDES "Finalized": no StatusChanged ever carries it — the
 *  reducer derives it from the module/settlement MarketFinalized events.
 */
export declare const BINARY_MARKET_STATUS: readonly BinaryMarketStatus[];
/**
 *  One pool's own seed status, unaffected by any other watched pool.
 *
 *  {@link TailStatus} reports the same four facts for the MOST RECENT seed only,
 *  so with several watched pools its values cannot be attributed to a pool. Read
 *  this for a per-pool answer; read `TailStatus` for "what did the last seed
 *  do".
 *
 * @category live
 */
export interface PoolSeedStatus {
    /**
     *  Where THIS pool took its book seed: `"indexer"` for the indexer snapshot,
     *  `"chain"` for a `seed: "chain"` watch.
     */
    seedSource: SeedSource;
    /** Block THIS pool's seed was consistent to. */
    seedBlock: number;
    /**
     *  Whether THIS pool's chain seed hit its page budget and read a shallow
     *  book. Always false for an indexer seed.
     */
    seedTruncated: boolean;
    /**
     *  Whether fill history was loaded for THIS pool. `false` plus an empty
     *  `getLiveFills` means "never loaded"; `true` plus an empty result means
     *  "genuinely no fills in the loaded range" (SDK-IO-002).
     */
    fillsLoaded: boolean;
}
/**
 *  Live-tail health snapshot — how current the store's `getLive*` reads are:
 *  block coverage (snapshot/last/head), socket state, and active watch count.
 *
 * @category live data
 */
export interface TailStatus {
    /** Nonempty intervening ranges successfully recovered. Empty probes do not count. */
    healedGaps: number;
    /** Last observed divergence, retained after later matching checks. */
    lastDivergence: TailDivergence | null;
    /** Background failure; cleared only after the failed work succeeds. */
    failure: TailFailure | null;
    /** Current data-source mode ("init" until the first watch is hydrated). */
    mode: TailMode;
    /**
     *  Where the most recent watch took its book seed: `"indexer"` for the
     *  indexer snapshot (the default), `"chain"` for a `seed: "chain"` watch.
     *  `null` in "init", before any watch has hydrated.
     *
     *  LATEST SEED, not an aggregate. This field and the three below describe the
     *  most recent seed only, so with several watched pools they cannot be
     *  attributed to a pool. Read {@link PoolSeedStatus} through
     *  `getSeedStatus(pool)` for a per-pool answer.
     */
    seedSource: SeedSource | null;
    /**
     *  Block the seed was consistent to — the indexer snapshot block, or the
     *  pinned block every chain-seed page was read at. 0 before any watch has
     *  hydrated. Equal to {@link TailStatus.snapshotBlock}; this field names the
     *  value, while `seedSource` names where it came from.
     */
    seedBlock: number;
    /**
     *  Whether the chain seed hit its page budget and read a SHALLOW book.
     *  Always false for an indexer seed. A truncated seed is a successful bounded
     *  read, not a failure — the book is real but incomplete at its deep end.
     */
    seedTruncated: boolean;
    /**
     *  Whether the active all-markets watch left eligible markets out.
     *
     *  One `watchMarkets` snapshot hydrates at most 500 eligible markets, newest
     *  first. This is `true` when more exist: the watched markets are complete,
     *  but the oldest eligible markets are not watched. Watch those with
     *  `watchMarket(pool)`.
     *
     *  Owned by the all-markets scope alone, so a later pool or chain seed does
     *  not overwrite it. It stays set while that scope is watched or lingering,
     *  and returns to `false` when the scope is torn down. `false` when no
     *  all-markets watch exists.
     */
    allMarketsTruncated: boolean;
    /**
     *  Whether fill history was loaded for the current scope.
     *
     *  A chain seed cannot reconstruct fills from before its block: the seam
     *  backfills only snapshotBlock+1..head, and older fills live only in the
     *  indexer. So `false` plus an empty `getLiveFills` means "never loaded",
     *  while `true` plus an empty `getLiveFills` means "genuinely no fills in the
     *  loaded range". Without this flag the two are indistinguishable.
     */
    fillsLoaded: boolean;
    /**
     *  Block the most recent watch seed was consistent to — a watch's seam covers
     *  snapshotBlock+1.. either way.
     *
     *  For an indexer-seeded watch this is the indexer snapshot block, unchanged.
     *  For a chain-seeded watch it is the block every drained page was pinned to,
     *  the same value {@link TailStatus.seedBlock} reports. Read
     *  {@link TailStatus.seedSource} to tell the two apart.
     */
    snapshotBlock: number;
    /** Highest applied event or sealed scope block; heads alone do not advance it. */
    lastBlock: number;
    /** Latest chain head observed over the WS */
    headBlock: number;
    /** Whether the chain WS subscriptions are currently delivering */
    wsConnected: boolean;
    /**
     *  Active watch SCOPES: pools currently subscribed (including an all-markets watch's
     *  set), plus the perp plane as one if it is watched.
     *
     *  `0` → the tail is idle and no socket is held for it, and that invariant is the point
     *  of the field. The perp plane is counted precisely because it holds a socket while
     *  subscribing no pool at all, so a pool-only count would report an idle tail that is
     *  in fact streaming.
     */
    watchCount: number;
}
/** An observable background operation failure. @category live data */
export interface TailFailure {
    /**
     *  Failed operation; reconciliation is diagnostic and does not replace the
     *  book. `fill-history` is the indexer fills lane of a chain-seeded watch:
     *  it fails on its own, without blocking the book the chain already seeded.
     */
    operation: "recovery" | "reconciliation" | "subscription" | "fill-history";
    /** Semantic SDK failure with the original cause. */
    error: SomniaMarketsSocketFailure;
}
/** Raw native levels differing at a fixed chain checkpoint. @category live data */
export interface TailDivergence {
    /** Pool compared. */
    pool: string;
    /** Both chain sides and the local capture describe this target. */
    blockNumber: bigint;
    /** Maximum compared levels per side. */
    depth: number;
    /** Event-derived levels filtered using the target chain timestamp. */
    local: {
        bids: BookLevel[];
        asks: BookLevel[];
    };
    /** Contract levels read at the same target. */
    chain: {
        bids: BookLevel[];
        asks: BookLevel[];
    };
}
/**
 *  The live market shape IS the read-surface market union — spot and binary rows
 *  materialize into the exact shape `client.listMarkets` serves.
 *
 * @category live data
 */
export type LiveMarket = Market;
/** One executed fill (mirror of indexer Fill, plus the resolved pool address). */
/**
 *  A funding settlement observed by the live tail, shaped to splice onto the indexed
 *  `FundingRateUpdate` series.
 *
 *  Deliberately NOT the full indexed row. The tail sees only what `FundingUpdated`
 *  carries, and two of the indexed fields are DERIVED from state the tail does not have:
 *  `intervalsAccrued` needs `n` from the funding-parameters epoch series, and the covered
 *  span needs the settlement anchor. Rather than guess them, they are absent here and
 *  arrive with the indexed row a moment later.
 *
 * @category live data
 */
export interface LiveFundingUpdate {
    /** `${pool}_${blockNumber}_${logIndex}` — matches the indexer FundingRateUpdate id. */
    id: string;
    /**
     *  Chain the row came from: the chain of the engine that produced it.
     *
     *  The other identifiers are unique on one chain only, so a caller that merges
     *  rows from two engines keys on `(chainId, id)`.
     */
    chainId: number;
    /** Perp pool (lowercased). */
    pool: string;
    /** Per-CALCULATION-WINDOW rate, 1e18-scaled, signed. Normalize with `fundingWindowSec`. */
    fundingRate: string;
    /** Cumulative index AFTER this settlement (1e18 x quote per whole base, signed). */
    cumulativeFundingPerUnit: string;
    indexPrice: string;
    /** Null when the event's 0 sentinel fired for a stale mark feed. */
    markPrice: string | null;
    /** UNCLAMPED interval span, as emitted. Accrual is capped at n = window / interval. */
    intervalsSettled: string;
    /** Params as last known for the market; null before the first indexed funding row. */
    fundingWindowSec: number | null;
    fundingIntervalSec: number | null;
    timestamp: string;
    blockNumber: string;
    /** Log index within the block — with blockNumber, the settlement's position in the series. */
    logIndex: number;
}
/**
 * One fill in the live store, with indexer-compatible identifiers and raw units.
 *
 * **Details**
 *
 * Binary-side fields are enriched from the related live orders. Spot fills
 * leave the binary-only fields undefined.
 *
 * **Gotchas**
 *
 * A just-received fill can temporarily omit maker, taker, or side data because
 * the related order event can arrive later in the same transaction.
 *
 * @category live data
 */
export interface LiveFill {
    /** `${blockNumber}_${logIndex}` — matches the indexer Fill id */
    id: string;
    /**
     *  Chain the row came from: the chain of the engine that produced it.
     *
     *  The other identifiers are unique on one chain only, so a caller that merges
     *  rows from two engines keys on `(chainId, id)`.
     */
    chainId: number;
    /** Id of the market the fill executed in (Hasura FK naming; joins {@link LiveMarket}). */
    market_id: string;
    /** lowercased pool address (the log source) */
    pool: Address;
    /**
     *  Taker info is unresolved at OrderFilled emission time (the taker's
     *  OrderPlaced fires AFTER the fill in the same tx). Resolved via the
     *  takerOrder_id foreign key — enrichFill back-joins to LiveOrder.
     */
    taker: Address | undefined;
    /**
     *  Maker's address. Undefined until the maker's resting order is known — set when it
     *  was witnessed live, else back-joined from the order row via `makerOrder_id`.
     */
    maker: Address | undefined;
    /**
     *  Taker's outcome side. Undefined on spot fills, and on binary fills until the
     *  taker order is joined (see `taker`).
     */
    takerSide: BinarySide | undefined;
    /**
     *  Maker's outcome side. Undefined on spot fills, and until the maker order is
     *  joined (see `maker`).
     */
    makerSide: BinarySide | undefined;
    /**
     *  How the fill settled (see {@link BinaryFillKind}). Undefined on spot fills, and
     *  on binary fills until BOTH sides are joined (classification needs both).
     */
    kind: BinaryFillKind | undefined;
    /**
     *  True when the taker bought the base/YES (the maker was the ask) — the
     *  tape's aggressor direction, valid on every market kind. Seeded from the
     *  indexer row on snapshot fills; on live fills derived at OrderFilled from
     *  the maker's resting side (undefined only when the maker order was never
     *  witnessed, until enrichFill joins the taker's OrderPlaced).
     */
    takerIsBid: boolean | undefined;
    /** Foreign keys to LiveOrder rows for join-side recovery. */
    takerOrder_id: string;
    /** Maker-side counterpart of `takerOrder_id` (a {@link LiveOrder} key). */
    makerOrder_id: string;
    /** Raw quote/collateral units per whole base/outcome token. */
    fillPrice: string;
    /**
     *  Base/outcome tokens exchanged — raw units scaled by the market's `baseDecimals`
     *  (decimal string).
     */
    quantity: string;
    /** quote value = quantity * fillPrice / 10^baseDecimals */
    quoteQuantity: string;
    /** Taker order's unfilled size after this fill — raw base/outcome units (decimal string). */
    takerRemainingQuantity: string;
    /** Maker order's unfilled size after this fill — raw base/outcome units (decimal string). */
    makerRemainingQuantity: string;
    /** Block timestamp of the fill — unix seconds (decimal string). */
    timestamp: string;
    /** Block the fill landed in. */
    blockNumber: number;
    /** Log index within the block — with `blockNumber`, the fill's tape position. */
    logIndex: number;
    /** Transaction that produced the fill. */
    txHash: string;
}
/**
 * A resting/closed order (mirror of indexer Order).
 *
 * @category live data
 */
export interface LiveOrder {
    /** `${pool}_${orderId}` */
    id: string;
    /**
     *  Chain the row came from: the chain of the engine that produced it.
     *
     *  The other identifiers are unique on one chain only, so a caller that merges
     *  rows from two engines keys on `(chainId, id)`.
     */
    chainId: number;
    /**
     *  Id of the market the order was placed in. Pools are RECYCLED across markets
     *  (never concurrently), so book reads filter on this, not the pool alone.
     */
    market_id: string;
    /** Lowercased pool address hosting the order's book. */
    pool: Address;
    /** On-chain order id, unique per pool (decimal string). */
    orderId: string;
    /** Order owner's address (as emitted — compare case-insensitively). */
    owner: Address;
    /** Binary outcome side. Undefined on spot orders (spot has no YES/NO). */
    side: BinarySide | undefined;
    /**
     *  Which side of the book's NATIVE terms the order rests on: true = bid.
     *  Native terms are YES terms for binary, quote-per-base for spot.
     */
    isBid: boolean;
    /**
     *  Opaque caller bookkeeping from OrderPlaced, carried verbatim (uint256 decimal
     *  string) — never decoded; v2 takes the side from `BinaryOrderPlaced.kind` instead.
     */
    userData: string;
    /**
     *  Limit price in the book's native terms — raw quote/collateral units per whole
     *  base/outcome token (decimal string).
     */
    price: string;
    /** Original size at placement — raw base/outcome units (decimal string). */
    fullQuantity: string;
    /** Unfilled size still resting — raw base/outcome units (decimal string). */
    quantityRemaining: string;
    /** Cumulative size filled so far — raw base/outcome units (decimal string). */
    filledQuantity: string;
    /**
     *  Order expiry as a uint64 nanosecond timestamp (decimal string). GTC orders
     *  carry type(uint64).max, so they never expire; the matcher rejects a 0/past
     *  expiry at placement, so a resting order always has a real future ns value.
     */
    expireTimestampNs: string;
    /** Lifecycle state (see {@link OrderStatus}). */
    status: OrderStatus;
    /**
     *  True once OrderRested landed — the order is ON the book. Only rested open
     *  orders count toward the materialized book levels.
     */
    rested: boolean;
    /** Placement block timestamp — unix seconds (decimal string). */
    createdAt: string;
    /** Transaction that placed the order. */
    txHash: string;
}
/**
 * One aggregated price level of a resting book (raw units).
 *
 * @category live data
 */
export interface BookLevel {
    /**
     *  Level price — raw quote/collateral units per whole base/outcome token, in the
     *  book's native terms (YES terms for binary, quote-per-base for spot).
     */
    price: bigint;
    /** Total resting size at this price — raw base/outcome units. */
    quantity: bigint;
}
/**
 *  Fallback outcome-token / collateral decimals (tUSDC 6dp demo stack). Real
 *  math uses the per-market baseDecimals/quoteDecimals off the Market row.
 *
 * @category live data
 */
export declare const DECIMALS = 6;
/**
 *  Index → BinarySide for the on-chain `OrderKind` enum carried by the
 *  `BinaryOrderPlaced` event (settlement-extraction v2): 0 BUY_YES, 1 SELL_YES,
 *  2 BUY_NO, 3 SELL_NO. This is the ONLY authoritative side-attribution source —
 *  v2 no longer encodes the side in `userData` (now opaque MM bookkeeping).
 *
 * @category live data
 */
export declare const ORDER_KIND_SIDE: readonly BinarySide[];
/**
 *  Map an on-chain `OrderKind` index (from `BinaryOrderPlaced.kind`) to a
 *  {@link BinarySide}. Replaces the v1 `(isBid, userData)` decode — the pool now
 *  states the kind explicitly, so the SDK/indexer join the `BinaryOrderPlaced`
 *  event (by orderId) instead of inferring the side from userData.
 *
 * @category live data
 */
export declare function sideOfKind(kind: number | bigint): BinarySide;
/**
 *  Classify a binary fill from its two sides: opposite trades on ONE outcome are
 *  direct (`DIRECT_YES`/`DIRECT_NO`); two buys mint a YES+NO pair from collateral,
 *  two sells burn one back. Mirror of the indexer's `fillKind`
 *  (BinaryPool._isPair matrix — keep in lockstep).
 *
 * **Details**
 *
 * - `takerSide`: The taker's {@link BinarySide}.
 * - `makerSide`: The maker's {@link BinarySide}.
 *
 * @category live data
 */
export declare function fillKind(takerSide: BinarySide, makerSide: BinarySide): BinaryFillKind;
export declare function orderKey(pool: Address, orderId: bigint | string): string;
export declare function fillKey(blockNumber: number | bigint, logIndex: number): string;
/**
 *  True once wall-clock `nowNs` has passed a resting order's `expireTimestampNs`
 *  — the client-side mirror of OrderBook.getBookLevels' `now > expiry` skip.
 *  On-chain expiry is lazy (an expired maker keeps resting with no OrderExpired
 *  event), so an event-sourced book must apply this cutoff itself. `0` is treated
 *  as "no expiry" defensively — it can never be a resting value (the matcher
 *  rejects a 0/past expiry at placement); GTC carries type(uint64).max.
 */
export declare function isExpired(expireTimestampNs: string, nowNs: bigint): boolean;
export declare class MaterializerStore {
    readonly chainId: number;
    /**
     *  @param chainId - Chain of the owning engine. The reducer and the tail stamp it
     *    on every row they build, so one store holds one chain's rows.
     */
    constructor(chainId: number);
    /**
     *  Pools whose retention inputs changed since the last `prunePerPool`.
     *
     *  Declared before the row maps, which report into it from their first write.
     *  Every input the prune reads per pool marks its pool here: fill, order and
     *  funding rows, the pool's book block, an order's live block, and pins.
     */
    private readonly prunePools;
    private readonly touchPool;
    /**
     *  Whether a market may have lost its protection since the last full
     *  {@link MaterializerStore.pruneMarkets} scan: a pool binding was removed or
     *  re-pointed, or a fill or order row that does not name its pool's bound
     *  market was dropped or replaced. A row of its pool's bound market is never
     *  that market's last protection while the binding stands.
     */
    private marketsUnprotected;
    /** `markets.size` after the last full scan; a larger map holds new rows. */
    private marketsAfterScan;
    private readonly unprotectMarkets;
    private readonly releaseRow;
    readonly markets: Map<string, Market>;
    private readonly poolFills;
    readonly fills: Map<string, LiveFill>;
    private readonly indexedOrders;
    readonly orders: Map<string, LiveOrder>;
    private readonly poolFunding;
    /**
     *  `${blockNumber}_${logIndex}` -> funding update, appended by the live tail.
     *
     *  Separate from `markets` because a funding CHART needs the series, not just the
     *  latest value the market row carries. Keyed on (block, logIndex) rather than
     *  appended to a list so a reorg replay overwrites instead of duplicating — the same
     *  dedup the tail already applies to fills and orders.
     */
    readonly fundingUpdates: Map<string, LiveFundingUpdate>;
    /**
     *  `${txHash}_${logIndex}` -> one leg of the liquidation waterfall, held while a
     *  perp-plane watch is active.
     *
     *  Keyed on the row's own `id`, NOT on `${block}_${logIndex}` the way `fundingUpdates`
     *  is, and the reason is that this map holds hydrated rows as well as live ones:
     *  `FundingPayment` carries no block number or log index at all (only `id`, `account`,
     *  `pool`, `amount`, `timestamp`, `txHash`), so a snapshot row cannot be placed at a log
     *  position. The `id` is available on both sides and is unique per log, so it dedupes a
     *  hydrated row against its live twin — which is the join that matters here. It gives up
     *  replace-on-replay, which Somnia's instant BFT finality makes moot (see liveTail.ts).
     *
     *  Plane-wide: the legs of one account's liquidation span pools, and the account-level
     *  legs name no pool at all, so this is one map filtered at read time — never a per-pool
     *  bucket.
     */
    readonly liquidations: Map<string, LiquidationEvent>;
    /** `${txHash}_${logIndex}` -> a per-account funding settlement. Keyed like `liquidations`. */
    readonly fundingPayments: Map<string, FundingPayment>;
    /**
     *  pool (lowercase) -> market id — the pool's CURRENT market binding, so the
     *  reducer can route a pool log to its market. Settlement-extraction v2: this
     *  binding is TIME-VARYING (a recycled pool serves successive markets, never
     *  concurrently) — `MarketCreated` opens/re-points it, `PoolReleased` closes it.
     */
    readonly poolToMarket: Map<string, string>;
    /** BinaryMarket address (lowercase) -> market id (binary markets only) */
    readonly addressToMarket: Map<string, string>;
    /**
     *  Settlement `marketKey` (decimal string) -> binary market id. The key is
     *  `yesTokenId >> 8`, so every binary row has one, including a row whose
     *  `nonce` is null. Mirror of the indexer's `SettlementMarketLink`, which is
     *  also written at creation. Settlement events carry only this key.
     */
    readonly settlementKeyToMarket: Map<string, string>;
    /**
     *  orderKey -> BinarySide recorded from `BinaryOrderPlaced` before/after its
     *  paired base `OrderPlaced` lands (intra-tx order not guaranteed). The v2 side
     *  source — consumed (deleted) once the order row carries the side.
     */
    readonly pendingKinds: Map<string, BinarySide>;
    /**
     *  collateral token (lowercase) -> its ERC-20 `decimals()`.
     *
     *  Binary collateral is per-venue (6dp TestUSDC, 18dp USDso, ...) and the
     *  outcome tokens mirror it, so the scale a market's amounts carry is a
     *  property of its collateral, not a constant. The indexer reads
     *  `decimals()` once per collateral at `MarketCreated`
     *  (`indexer/src/handlers/binary.ts`); the reducer is synchronous and cannot
     *  read the chain, so it looks the value up here instead of assuming
     *  {@link DECIMALS} — a 6dp guess on an 18dp venue scales every derived
     *  quote amount by 10^12.
     *
     *  Two writers keep it warm, both via
     *  {@link MaterializerStore.learnCollateralDecimals}:
     *  {@link MaterializerStore.mergeSnapshot} records what every indexed row
     *  already carries (one collateral serves a whole venue, so the first
     *  snapshot covers all its later markets), and the live tail reads an
     *  unknown collateral on chain before it reduces any fill for the new pool.
     */
    readonly collateralDecimals: Map<string, number>;
    readonly bookBlocks: Map<string, bigint>;
    /**
     *  Seed status PER POOL, keyed by lowercased pool address.
     *
     *  {@link TailStatus} carries one set of seed fields for the whole tail, and
     *  each seed overwrites the last. With several watched pools that is not
     *  readable: pool B's seed writes `seedTruncated: false` over pool A's `true`,
     *  and `fillsLoaded` turns true when any pool's lane lands even if another
     *  pool's failed. These entries are what a consumer reads instead.
     *
     *  Written once per hydrated pool and replaced on a re-seed. Dropped with the
     *  rest of the pool's state in {@link MaterializerStore.purgePool}.
     */
    readonly seedStatusByPool: Map<string, PoolSeedStatus>;
    status: TailStatus;
    private version;
    private listeners;
    private cache;
    /** Pool-local selections survive unrelated commits and are released on that pool's writes. */
    private readonly poolSelections;
    /** Terminal row fingerprints and the order of observed transitions. */
    private terminalOrderRecency;
    private nextTerminalSequence;
    /** Open orders observed before their terminal transition. */
    private knownOpenOrderIds;
    /** Last chain block that changed each order, for snapshot-seam arbitration. */
    private liveOrderBlocks;
    /** Recent indexed orders reserved for each active account watch. */
    private userHistoryPins;
    /** Shared account pins counted at write time, so pool release needs only keyed lookups. */
    private readonly userHistoryPinCounts;
    /** Account history retained after its market watch releases, never book liquidity. */
    private historyOnlyOrderIds;
    /** Indexed Closed rows are final; live rows wait for a later pool block. */
    private closedOrderRetention;
    /**
     *  Latest chain head time in ns. Retention uses the chain clock, never the
     *  wall clock, so it cannot evict an order the chain can still match.
     */
    private chainNowNs;
    /** Per pool, the earliest finite expiry among Open rows still counted as open. */
    private poolNextExpiryNs;
    /**
     *  The shared sorted book ladder per pool, with every input it was derived
     *  from. Depth-independent: each depth slices this one result, so a page that
     *  reads a mid price and a full book pays one walk, not two. One entry per
     *  pool, replaced in place.
     */
    private bookLadders;
    /** Per-depth slices, held against the exact ladder they were cut from. */
    private bookSlices;
    /**
     *  Consumer views of a book (see {@link selectFromBook}), grouped by the pool
     *  whose ladder they were built from. The pool is recorded when the view is
     *  made, so {@link purgePool} drops every view of that pool — pool-keyed and
     *  market-keyed alike — without reading the current market binding.
     */
    private bookViews;
    getVersion(): number;
    subscribe: (listener: () => void) => (() => void);
    /** Bump version and notify subscribers. Call once per processed block / status change. */
    commit(): void;
    private notify;
    /** Record the block that supplied an order's locally observed state. */
    noteLiveOrderBlock(id: string, blockNumber: number): void;
    /** Reserve the bounded account snapshot before merging it into a busy pool. */
    pinUserHistory(user: string, orders: readonly LiveOrder[]): void;
    private releaseHistoryPins;
    private touchPinnedPools;
    private demoteOrderToHistory;
    private dropOrder;
    unpinUserHistory(user: string): void;
    clearUserHistoryPins(): void;
    /**
     *  Merge a status patch and commit — but only when the patch actually changes
     *  something.
     *
     *  A commit clears store-wide selections. Pool-local selections and books
     *  instead follow writes to their own pool, so a status change does not
     *  rebuild unchanged pool data.
     *
     *  What this actually suppresses is a REPEATED value, not a steady stream:
     *  a `watchCount` patch that lands back on the count already recorded, or a
     *  repeated `failure: null` after a clean reconcile. A head goes through
     *  {@link MaterializerStore.setHeadStatus} instead, which never invalidates
     *  data.
     *
     *  The comparison is `Object.is` per patched key, never a deep compare: a value
     *  that is not a primitive (`lastDivergence`, `failure`) is always treated as
     *  changed, so a genuine update can never be suppressed. Suppressing a real
     *  change would strand `useSyncExternalStore` on a stale snapshot, which is far
     *  worse than an extra commit.
     */
    setStatus(patch: Partial<TailStatus>): void;
    /**
     *  Merge a status patch that carries no data change, and notify subscribers
     *  WITHOUT bumping the data version.
     *
     *  A head that advances `headBlock` changes only the status. A full commit
     *  would clear store-wide `select()` memos for unchanged data. Here the
     *  memos survive: status observers see the new head through `getStatus()`,
     *  and every data reader gets its old reference back.
     *
     *  Do not use this after a data mutation. A caller that also changed rows
     *  must `commit()`.
     */
    setHeadStatus(patch: Partial<TailStatus>): void;
    /**
     *  Merge a status patch WITHOUT committing, and report whether it changed
     *  anything. Use this when the caller batches its own `commit()` — applying a
     *  block patches the status and prunes, then commits once for both.
     */
    patchStatus(patch: Partial<TailStatus>): boolean;
    /**
     *  Memoize a view built from a book read, against that exact book value.
     *
     *  A book is not keyed on the store version alone — it also tracks the
     *  wall-clock second, so an expired level drops without waiting for a block.
     *  A consumer view of a book (say the YES/NO split of a binary book) must
     *  therefore follow the book it was built from, not the version: `select()`
     *  would keep serving a pre-expiry view until the next commit, disagreeing
     *  with the levels underneath it. Identity comparison is exact and cheap,
     *  because a book value is rebuilt only when its own inputs move.
     *
     *  `pool` is the pool whose book `from` was read from. The view is held under
     *  that pool and is dropped when the pool is purged. With no known pool there
     *  is no book to follow, so the view is computed and not held. A view keyed by
     *  market must include the market id in `key`: evicting that market's row
     *  drops the view too.
     */
    selectFromBook<S, T>(pool: string | undefined, key: string, from: S, compute: (from: S) => T): T;
    /** Pool-local views have bounded reader keys and never retain rows after their pool changes. */
    private selectPool;
    /** Memoized derived snapshot — stable reference while version is unchanged. */
    select<T>(key: string, compute: () => T): T;
    /**
     * Merge a snapshot's rows into the store (upsert by key; does not commit).
     *
     *  Watches are per-scope, so hydration must NOT clear other scopes' state —
     *  watching market B leaves market A's rows untouched. A row the store
     *  already holds is replaced only when the snapshot is newer than that
     *  order's locally observed chain block. Absence from a snapshot never
     *  clears an order: a recently placed open order may still be missing from
     *  the indexer while the watch already has its on-chain event.
     */
    mergeSnapshot(input: {
        markets: LiveMarket[];
        fills: LiveFill[];
        orders: LiveOrder[];
        snapshotBlock?: number;
        userHistory?: boolean;
    }): void;
    /**
     *  Drop one pool's live rows when its watch is released. An active account
     *  watch keeps its history, but those rows cannot supply book liquidity.
     */
    purgePool(pool: string): void;
    /**
     *  Merge a perp-plane snapshot (upsert by row id; does not commit).
     *
     *  Both maps are append-only logs of finished facts — unlike `mergeSnapshot`, there is
     *  no locally-witnessed row to protect from being blanked, because nothing here is
     *  mutable state. A row the store already holds is simply overwritten by its identical
     *  indexed twin.
     */
    mergePerpPlaneSnapshot(input: {
        liquidations: LiquidationEvent[];
        fundingPayments: FundingPayment[];
    }): void;
    /**
     *  Drop every perp-plane row (the plane watch was released). Plane-wide, like the maps
     *  themselves — there is no per-pool half to keep, because the account-level waterfall
     *  legs belong to no pool.
     */
    purgePerpPlane(): void;
    /** Register a market + its reverse lookups. */
    indexMarket(m: LiveMarket): void;
    /** The binary market a settlement `marketKey` names, or undefined when it is not retained. */
    marketBySettlementKey(key: bigint): BinaryMarket | undefined;
    /**
     *  Evict cold market rows beyond {@link MAX_COLD_MARKETS}, earliest
     *  discovered first. Runs after fills and orders are pruned, so the protected set is final.
     *
     *  The scan reads every fill and order, so it runs only when its result can
     *  differ from the last one: a new market row, or a market that may have lost
     *  its protection. Otherwise the last scan left a fixed point.
     */
    private pruneMarkets;
    /** Drop one market row with every lookup and book view that names it. */
    private evictMarket;
    /**
     *  Record a collateral token's ERC-20 `decimals()`.
     *
     *  Only a value that came from the chain or the indexer may be recorded —
     *  never one the reducer itself defaulted, or the fallback would teach
     *  itself as fact and every later market on the venue would inherit the
     *  guess.
     */
    learnCollateralDecimals(collateral: string, decimals: number): void;
    /**
     *  Retention checkpoint for lazily expired orders. Call once per chain head.
     *
     *  On-chain expiry emits no event: an expired maker stays Open until a cancel
     *  or sweep. At each head, a pool whose earliest finite expiry is strictly
     *  before the head time is pruned. Its expired Open rows then stop counting
     *  as open orders and join the pool's capped non-liquidity history. A fill
     *  join or an account pin keeps a row, and so does an active account watch
     *  on the row's owner. Eviction never changes a row's status,
     *  so it never claims a refund or a terminal state; a later cancel or sweep
     *  for an evicted order is a no-op in the reducer.
     *
     *  @param headTimestampSec - The head block's timestamp in unix seconds.
     *  @returns Whether any pool was due, so the caller must commit.
     */
    pruneExpired(headTimestampSec: bigint): boolean;
    /**
     *  Bound historical rows while preserving every unexpired open order and retained fill join.
     *
     *  Visits only pools marked in `prunePools` since the last call. Every
     *  retention input is pool-scoped: a fill joins only orders of its own pool,
     *  and a pin change marks the pools of its order ids. An unmarked pool was
     *  already pruned to a fixed point, so revisiting it changes nothing. A bucket
     *  at or under its cap is never sorted.
     */
    prunePerPool(): void;
    private prunePool;
    /**
     *  Resolve a fill's maker/taker owner + side from the order join. Live fills
     *  carry these as undefined (taker isn't known at OrderFilled time; maker is
     *  only filled when its resting order was witnessed live), so we back-join to
     *  the order book — populated from the snapshot's open-orders + live events.
     */
    private enrichFill;
    recentFills(pool: string, limit: number): LiveFill[];
    userFills(pool: string | null, user: string, limit: number): LiveFill[];
    /**
     *  Funding settlements the tail has seen for a pool, OLDEST FIRST (chart order).
     *
     *  The tail's counterpart to the indexed `FundingRateUpdate` series: splice these onto
     *  the tail of a one-shot query to extend a chart past the snapshot block, rather than
     *  only overwriting the market row's latest value.
     *
     *  Oldest-first here, unlike `recentFills` — a funding chart consumes a series in time
     *  order, whereas a trade tape wants newest-first.
     *
     *  Two rows on this list carry less than their indexed equivalents, and deliberately:
     *  `intervalsAccrued` needs `n` from the parameter-epoch series and the covered span
     *  needs the settlement anchor, neither of which the tail has. They arrive with the
     *  indexed row a moment later rather than being guessed at here.
     */
    fundingUpdatesFor(pool: string, limit?: number): LiveFundingUpdate[];
    /**
     *  Liquidation waterfall legs the tail has seen, NEWEST FIRST — the same order and the
     *  same row shape `listLiquidations` serves, so the two merge by `id` (they overlap:
     *  the window is hydrated from the newest indexed rows).
     *
     *  `pool` filters on the leg's own pool, which drops the account-level legs
     *  (`AccountLiquidated`, `ResidualBadDebt`, ...) because they carry none. That is the
     *  filter's honest meaning and matches the indexed read, whose `pool` column is nullable
     *  for exactly these rows: a per-pool view of a liquidation is partial by construction.
     *  Filter by `party` for every row involving a wallet.
     */
    liquidationsFor(filter: Pick<ListLiquidationsOptions, "pool" | "account" | "counterparty" | "party" | "kind" | "kinds">, limit: number): LiquidationEvent[];
    /**
     *  Per-account funding settlements the tail has seen, NEWEST FIRST — the row shape
     *  `getFundingPayments` serves.
     *
     *  Newest-first, unlike `fundingUpdatesFor`: a settlement list is a ledger a wallet view
     *  reads from the top, where the per-pool RATE series is a chart consumed in time order.
     */
    fundingPaymentsFor(filter: {
        pool?: string;
        account?: string;
    }, limit: number): FundingPayment[];
    /** All known markets (memoized — stable reference between mutations). */
    allMarkets(): LiveMarket[];
    marketByPool(pool: string): LiveMarket | null;
    /** Only binary markets have a BinaryMarket contract address. */
    marketByAddress(addr: string): BinaryMarket | null;
    userOrders(pool: string, user: string, limit: number): LiveOrder[];
    /**
     *  The locally-materialized RESTING book for a pool, aggregated by price level
     *  — the zero-round-trip mirror of the on-chain `getBookLevels`. Prices are in
     *  the book's native terms (YES terms for binary, quote-per-base for spot).
     *  Only orders witnessed as rested and still open count, matching the chain.
     */
    bookLevels(pool: string, depth: number, timestamp?: bigint): {
        bids: BookLevel[];
        asks: BookLevel[];
        blockNumber?: bigint;
    };
    /**
     *  Resting book for a market resolved by its `marketId` (recycle-safe). A
     *  BinaryPool is reused across markets, so this resolves the market's pool and
     *  GUARDS that the pool's CURRENT binding is still this market — if `marketId`
     *  is stale (the pool moved on to a newer market), returns `null` so a stale
     *  page renders nothing rather than the successor market's liquidity.
     */
    bookLevelsByMarket(marketId: string, depth: number): {
        bids: BookLevel[];
        asks: BookLevel[];
        blockNumber?: bigint;
    } | null;
    /**
     *  The current status object. `patchStatus` replaces it on every change, so
     *  its reference is stable until a status field changes. It does not follow
     *  the data version, because `setHeadStatus` changes the status without one.
     */
    getStatus(): TailStatus;
}
