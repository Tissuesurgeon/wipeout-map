// Reactive in-memory store for the locally-materialized order-book state —
// spot AND binary markets, one store.
//
// Holds the entities the live tail keeps current (markets, fills, orders) in the
// same string-field shape the indexer's Hasura serves, so components consume live
// and snapshot rows interchangeably. Markets are the same discriminated
// `Market = SpotMarket | BinaryMarket` union the one-shot reads return. Exposes a
// `useSyncExternalStore`-friendly contract: a monotonic version, subscribe(), and
// `select()` which memoizes derived snapshots by version so getSnapshot returns a
// stable reference between mutations (required to avoid React render loops).
//
// This file is framework-agnostic (no React import). The reducer (reducer.ts) is
// the client mirror of the indexer's shared OrderBook core
// (indexer/src/handlers/orderbook.ts, dispatched per pool type by binary.ts /
// spot.ts) — keep the two in lockstep.

import type { SomniaMarketsSocketFailure } from "./config.js";
import type { Address } from "viem";
import type { BinaryMarket, Market } from "./markets.js";
// TYPE-ONLY, so no runtime edge is added from the store to the perp read module (which
// pulls the GraphQL boundary). The live plane rows ARE the published read types rather
// than tail-shaped look-alikes: every field comes straight off an event arg, so unlike
// `LiveFundingUpdate` there is nothing the tail cannot fill, and reusing the type makes
// "live rows match `getLiquidations` rows" a `tsc` claim instead of a test convention.
import type { FundingPayment, LiquidationEvent, ListLiquidationsOptions } from "./perp/history.js";
import * as Ids from "./ids.js";

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

// Naming: `Binary*` = binary-market-specific (YES/NO outcomes); unprefixed =
// shared by spot + binary. A binary market is a CLOB, but so is a spot market —
// so "Clob" was never the right discriminator. See markets.ts `Market`.

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
export const BINARY_MARKET_STATUS: readonly BinaryMarketStatus[] = [
  "Listed",
  "Trading",
  "Locked",
  "Settling",
  "Resolved",
  "Voided",
];

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
  local: { bids: BookLevel[]; asks: BookLevel[] };
  /** Contract levels read at the same target. */
  chain: { bids: BookLevel[]; asks: BookLevel[] };
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
 *  Both sides of a resting book, plus the block the levels are known good at.
 *  Used for the full sorted ladder and for each depth-limited slice of it.
 */
type BookLadder = { bids: BookLevel[]; asks: BookLevel[]; blockNumber?: bigint };

/**
 *  Fallback outcome-token / collateral decimals (tUSDC 6dp demo stack). Real
 *  math uses the per-market baseDecimals/quoteDecimals off the Market row.
 *
 * @category live data
 */
export const DECIMALS = 6;

/** Recent fills retained per pool (bounds memory; older ones age out). */
const MAX_FILLS_PER_POOL = 400;

/**
 *  Non-liquidity rows kept per pool beyond fill and active account history:
 *  terminal rows, final Closed rows, and Open rows past their expiry at the
 *  latest chain head (see {@link MaterializerStore.pruneExpired}).
 */
const MAX_TERMINAL_ORDERS_PER_POOL = 400;

/**
 *  Cold market rows retained beyond the protected set.
 *
 *  A market row is protected while a pool is bound to it or a retained fill or
 *  order names it; account-history pins are retained orders, so they protect
 *  their markets too. Every other row is cold. The store keeps the most
 *  recently discovered cold rows up to this allowance and evicts older ones, so the
 *  row count depends on the protected set, not on how many markets the session
 *  has seen. A late settlement event for an evicted market is a no-op; the
 *  indexer and chain reads still serve that market's details.
 *
 *  500 equals the all-markets snapshot's market limit, so one snapshot never
 *  evicts the rows it has just merged.
 */
const MAX_COLD_MARKETS = 500;

/**
 *  Recent funding updates retained per pool.
 *
 *  Higher than the fills cap because the series is the point: 500 covers ~41h at the 300s
 *  testnet cadence, which is more than any chart window the tail is asked to extend, and a
 *  funding row is small. It exists at all because `fundingUpdatesFor` scans and sorts the
 *  whole map on every recompute — unbounded growth costs CPU on each tail event, not just
 *  memory.
 */
const MAX_FUNDING_PER_POOL = 500;

/**
 *  Liquidation legs and funding settlements retained for the whole perp PLANE.
 *
 *  Plane-wide, not per pool, because the sources are singletons: one MarginBank and one
 *  LiquidationEngine serve every market, so there is no per-pool subscription to bound.
 *  A pool filter is applied at read time, which means a per-pool cap could not be
 *  enforced without dropping rows a different caller still wants.
 *
 *  One liquidation produces several legs sharing a `txHash` (stages of one waterfall), so
 *  the cap is in LEGS, not liquidations — budget roughly a dozen legs per event. Funding
 *  settlement is per (account, pool, interval), so a busy venue fills this faster than
 *  the per-pool rate series: these are the plane's most recent activity, not its history.
 *  The indexed reads stay the way to page backwards.
 */
const MAX_PLANE_ROWS = 1000;

/**
 *  Index → BinarySide for the on-chain `OrderKind` enum carried by the
 *  `BinaryOrderPlaced` event (settlement-extraction v2): 0 BUY_YES, 1 SELL_YES,
 *  2 BUY_NO, 3 SELL_NO. This is the ONLY authoritative side-attribution source —
 *  v2 no longer encodes the side in `userData` (now opaque MM bookkeeping).
 *
 * @category live data
 */
export const ORDER_KIND_SIDE: readonly BinarySide[] = ["BUY_YES", "SELL_YES", "BUY_NO", "SELL_NO"];

/**
 *  Map an on-chain `OrderKind` index (from `BinaryOrderPlaced.kind`) to a
 *  {@link BinarySide}. Replaces the v1 `(isBid, userData)` decode — the pool now
 *  states the kind explicitly, so the SDK/indexer join the `BinaryOrderPlaced`
 *  event (by orderId) instead of inferring the side from userData.
 *
 * @category live data
 */
export function sideOfKind(kind: number | bigint): BinarySide {
  return ORDER_KIND_SIDE[Number(kind)] ?? "BUY_YES";
}

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
export function fillKind(takerSide: BinarySide, makerSide: BinarySide): BinaryFillKind {
  if ((takerSide === "BUY_YES" && makerSide === "SELL_YES") || (takerSide === "SELL_YES" && makerSide === "BUY_YES"))
    return "DIRECT_YES";
  if ((takerSide === "BUY_NO" && makerSide === "SELL_NO") || (takerSide === "SELL_NO" && makerSide === "BUY_NO"))
    return "DIRECT_NO";
  if ((takerSide === "BUY_YES" && makerSide === "BUY_NO") || (takerSide === "BUY_NO" && makerSide === "BUY_YES"))
    return "MINT_A_PAIR";
  if ((takerSide === "SELL_YES" && makerSide === "SELL_NO") || (takerSide === "SELL_NO" && makerSide === "SELL_YES"))
    return "BURN_A_PAIR";
  return "DIRECT_YES"; // defensive — should never hit
}

export function orderKey(pool: Address, orderId: bigint | string): string {
  return `${pool.toLowerCase()}_${orderId}`;
}

export function fillKey(blockNumber: number | bigint, logIndex: number): string {
  return `${blockNumber}_${logIndex}`;
}

/** A GTC order's `expireTimestampNs`: type(uint64).max, which never comes due. */
const GTC_EXPIRY_NS = 2n ** 64n - 1n;

/**
 *  True once wall-clock `nowNs` has passed a resting order's `expireTimestampNs`
 *  — the client-side mirror of OrderBook.getBookLevels' `now > expiry` skip.
 *  On-chain expiry is lazy (an expired maker keeps resting with no OrderExpired
 *  event), so an event-sourced book must apply this cutoff itself. `0` is treated
 *  as "no expiry" defensively — it can never be a resting value (the matcher
 *  rejects a 0/past expiry at placement); GTC carries type(uint64).max.
 */
export function isExpired(expireTimestampNs: string, nowNs: bigint): boolean {
  const exp = BigInt(expireTimestampNs);
  return exp !== 0n && nowNs > exp;
}

type UserOrderBucket = {
  rows: Map<string, { order: LiveOrder; position: number }>;
  sorted: LiveOrder[] | null;
  slices: Map<number, LiveOrder[]>;
};

// Callers may request arbitrary limits; keep only a few stable views per owner.
const MAX_CACHED_USER_ORDER_LIMITS = 8;
/** Bounds pool-local selector cache scopes and reader keys per scope. */
const MAX_CACHED_POOL_SELECTIONS = 128;

/** Keep direct reducer and snapshot map writes in the same pool and owner-scoped indexes. */
class IndexedOrders extends Map<string, LiveOrder> {
  private readonly byPool = new Map<string, Map<string, LiveOrder>>();
  private readonly byPoolAndOwner = new Map<string, UserOrderBucket>();
  private readonly positions = new Map<string, number>();
  private nextPosition = 0;

  /**
   *  @param touch - Receives the lowercased pool of every written or deleted row.
   *  @param release - Receives every row that is deleted or replaced, and no row when the map is cleared.
   */
  constructor(
    private readonly touch: (pool: string) => void,
    private readonly release: (order?: LiveOrder) => void,
  ) {
    super();
  }

  private bucketKey(order: Pick<LiveOrder, "pool" | "owner">): string {
    return `${order.pool.toLowerCase()}:${order.owner.toLowerCase()}`;
  }

  private removeIndexed(key: string, order: LiveOrder): void {
    const pool = order.pool.toLowerCase();
    const poolRows = this.byPool.get(pool);
    poolRows?.delete(key);
    if (poolRows?.size === 0) this.byPool.delete(pool);
    const scope = this.bucketKey(order);
    const bucket = this.byPoolAndOwner.get(scope);
    if (!bucket) return;
    bucket.rows.delete(key);
    if (bucket.rows.size === 0) {
      this.byPoolAndOwner.delete(scope);
      return;
    }
    bucket.sorted = null;
    bucket.slices.clear();
  }

  override set(key: string, order: LiveOrder): this {
    const previous = super.get(key);
    const previousScope = previous === undefined ? undefined : this.bucketKey(previous);
    const nextScope = this.bucketKey(order);
    if (previous !== undefined && previousScope !== nextScope) {
      this.removeIndexed(key, previous);
      this.touch(previous.pool.toLowerCase());
    }
    if (previous !== undefined) this.release(previous);

    const position = this.positions.get(key) ?? this.nextPosition++;
    this.positions.set(key, position);
    super.set(key, order);

    const pool = order.pool.toLowerCase();
    let poolRows = this.byPool.get(pool);
    if (!poolRows) {
      poolRows = new Map();
      this.byPool.set(pool, poolRows);
    }
    poolRows.set(key, order);

    let bucket = this.byPoolAndOwner.get(nextScope);
    if (!bucket) {
      bucket = { rows: new Map(), sorted: null, slices: new Map() };
      this.byPoolAndOwner.set(nextScope, bucket);
    }
    bucket.rows.set(key, { order, position });
    bucket.sorted = null;
    bucket.slices.clear();
    this.touch(pool);
    return this;
  }

  override delete(key: string): boolean {
    const order = super.get(key);
    if (order === undefined) return false;
    this.removeIndexed(key, order);
    this.positions.delete(key);
    this.touch(order.pool.toLowerCase());
    this.release(order);
    return super.delete(key);
  }

  override clear(): void {
    for (const pool of this.byPool.keys()) this.touch(pool);
    this.release();
    super.clear();
    this.byPool.clear();
    this.byPoolAndOwner.clear();
    this.positions.clear();
    this.nextPosition = 0;
  }

  /** Rows whose pool matches `pool` case-insensitively; the caller must not mutate the store while iterating. */
  poolOrders(pool: string): Iterable<LiveOrder> {
    return this.byPool.get(pool.toLowerCase())?.values() ?? [];
  }

  /** One pool's keyed rows. Deleting the current row during iteration is safe. */
  poolOrderEntries(pool: string): Iterable<[string, LiveOrder]> {
    return this.byPool.get(pool.toLowerCase())?.entries() ?? [];
  }

  /** Lowercased pools where `owner` has rows. Scans every owner bucket, so use it only on rare events. */
  ownerPools(owner: string): string[] {
    const suffix = `:${owner.toLowerCase()}`;
    return [...this.byPoolAndOwner.keys()]
      .filter((key) => key.endsWith(suffix))
      .map((key) => key.slice(0, key.indexOf(":")));
  }

  userOrders(pool: string, user: string, limit: number): LiveOrder[] {
    const bucket = this.byPoolAndOwner.get(`${pool.toLowerCase()}:${user.toLowerCase()}`);
    if (!bucket) return [];
    const cached = bucket.slices.get(limit);
    if (cached) {
      bucket.slices.delete(limit);
      bucket.slices.set(limit, cached);
      return cached;
    }
    if (bucket.sorted === null) {
      bucket.sorted = [...bucket.rows.values()]
        .sort((a, b) => Number(b.order.createdAt) - Number(a.order.createdAt) || a.position - b.position)
        .map(({ order }) => order);
    }
    const rows = bucket.sorted.slice(0, limit);
    if (bucket.slices.size >= MAX_CACHED_USER_ORDER_LIMITS) {
      const oldest = bucket.slices.keys().next();
      if (!oldest.done) bucket.slices.delete(oldest.value);
    }
    bucket.slices.set(limit, rows);
    return rows;
  }
}

/** Pool-scoped rows (fills, funding updates) indexed by lowercased pool; reports every pool it writes. */
class PoolRows<T extends { pool: string }> extends Map<string, T> {
  private readonly byPool = new Map<string, Map<string, T>>();

  /**
   *  @param touch - Receives the lowercased pool of every written or deleted row.
   *  @param release - Receives every row that is deleted or replaced, and no row when the map is cleared.
   */
  constructor(
    private readonly touch: (pool: string) => void,
    private readonly release: (row?: T) => void = () => {},
  ) {
    super();
  }

  private unindex(key: string, row: T): void {
    const pool = row.pool.toLowerCase();
    const rows = this.byPool.get(pool);
    rows?.delete(key);
    if (rows?.size === 0) this.byPool.delete(pool);
    this.touch(pool);
  }

  override set(key: string, row: T): this {
    const previous = super.get(key);
    const pool = row.pool.toLowerCase();
    if (previous !== undefined && previous.pool.toLowerCase() !== pool) this.unindex(key, previous);
    if (previous !== undefined) this.release(previous);
    super.set(key, row);
    let rows = this.byPool.get(pool);
    if (!rows) {
      rows = new Map();
      this.byPool.set(pool, rows);
    }
    rows.set(key, row);
    this.touch(pool);
    return this;
  }

  override delete(key: string): boolean {
    const row = super.get(key);
    if (row === undefined) return false;
    this.unindex(key, row);
    this.release(row);
    return super.delete(key);
  }

  override clear(): void {
    for (const pool of this.byPool.keys()) this.touch(pool);
    this.release();
    super.clear();
    this.byPool.clear();
  }

  /** One pool's keyed rows. Deleting the current row during iteration is safe. */
  poolRows(pool: string): ReadonlyMap<string, T> | undefined {
    return this.byPool.get(pool.toLowerCase());
  }
}

/** Pool block stamps; reports every pool whose stamp changes, because Closed-order retention reads it. */
class PoolBlocks extends Map<string, bigint> {
  /** @param touch - Receives the lowercased pool of every changed stamp. */
  constructor(private readonly touch: (pool: string) => void) {
    super();
  }

  override set(pool: string, block: bigint): this {
    this.touch(pool.toLowerCase());
    return super.set(pool, block);
  }

  override delete(pool: string): boolean {
    this.touch(pool.toLowerCase());
    return super.delete(pool);
  }

  override clear(): void {
    for (const pool of this.keys()) this.touch(pool.toLowerCase());
    super.clear();
  }
}

/** Pool -> market bindings; reports every binding that is removed or re-pointed, because market retention reads it. */
class MarketBindings extends Map<string, string> {
  /** @param unbind - Called when a binding stops naming its market. */
  constructor(private readonly unbind: () => void) {
    super();
  }

  override set(pool: string, marketId: string): this {
    const previous = super.get(pool);
    if (previous !== undefined && previous !== marketId) this.unbind();
    return super.set(pool, marketId);
  }

  override delete(pool: string): boolean {
    const deleted = super.delete(pool);
    if (deleted) this.unbind();
    return deleted;
  }

  override clear(): void {
    if (this.size > 0) this.unbind();
    super.clear();
  }
}

/** The pool part of an {@link orderKey}. */
function poolOfOrderKey(id: string): string {
  return id.slice(0, id.indexOf("_"));
}

export class MaterializerStore {
  /**
   *  @param chainId - Chain of the owning engine. The reducer and the tail stamp it
   *    on every row they build, so one store holds one chain's rows.
   */
  constructor(readonly chainId: number) {}

  /**
   *  Pools whose retention inputs changed since the last `prunePerPool`.
   *
   *  Declared before the row maps, which report into it from their first write.
   *  Every input the prune reads per pool marks its pool here: fill, order and
   *  funding rows, the pool's book block, an order's live block, and pins.
   */
  private readonly prunePools = new Set<string>();
  private readonly touchPool = (pool: string): void => {
    this.prunePools.add(pool);
    this.poolSelections.delete(pool);
    this.bookLadders.delete(pool);
  };

  /**
   *  Whether a market may have lost its protection since the last full
   *  {@link MaterializerStore.pruneMarkets} scan: a pool binding was removed or
   *  re-pointed, or a fill or order row that does not name its pool's bound
   *  market was dropped or replaced. A row of its pool's bound market is never
   *  that market's last protection while the binding stands.
   */
  private marketsUnprotected = false;
  /** `markets.size` after the last full scan; a larger map holds new rows. */
  private marketsAfterScan = 0;
  private readonly unprotectMarkets = (): void => {
    this.marketsUnprotected = true;
  };
  private readonly releaseRow = (row?: { pool: string; market_id: string }): void => {
    if (row === undefined || this.poolToMarket.get(row.pool.toLowerCase()) !== row.market_id)
      this.marketsUnprotected = true;
  };

  readonly markets = new Map<string, LiveMarket>();
  private readonly poolFills = new PoolRows<LiveFill>(this.touchPool, this.releaseRow);
  readonly fills: Map<string, LiveFill> = this.poolFills;
  private readonly indexedOrders = new IndexedOrders(this.touchPool, this.releaseRow);
  readonly orders: Map<string, LiveOrder> = this.indexedOrders;
  private readonly poolFunding = new PoolRows<LiveFundingUpdate>(this.touchPool);
  /**
   *  `${blockNumber}_${logIndex}` -> funding update, appended by the live tail.
   *
   *  Separate from `markets` because a funding CHART needs the series, not just the
   *  latest value the market row carries. Keyed on (block, logIndex) rather than
   *  appended to a list so a reorg replay overwrites instead of duplicating — the same
   *  dedup the tail already applies to fills and orders.
   */
  readonly fundingUpdates: Map<string, LiveFundingUpdate> = this.poolFunding;
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
  readonly liquidations = new Map<string, LiquidationEvent>();
  /** `${txHash}_${logIndex}` -> a per-account funding settlement. Keyed like `liquidations`. */
  readonly fundingPayments = new Map<string, FundingPayment>();
  /**
   *  pool (lowercase) -> market id — the pool's CURRENT market binding, so the
   *  reducer can route a pool log to its market. Settlement-extraction v2: this
   *  binding is TIME-VARYING (a recycled pool serves successive markets, never
   *  concurrently) — `MarketCreated` opens/re-points it, `PoolReleased` closes it.
   */
  readonly poolToMarket: Map<string, string> = new MarketBindings(this.unprotectMarkets);
  /** BinaryMarket address (lowercase) -> market id (binary markets only) */
  readonly addressToMarket = new Map<string, string>();
  /**
   *  Settlement `marketKey` (decimal string) -> binary market id. The key is
   *  `yesTokenId >> 8`, so every binary row has one, including a row whose
   *  `nonce` is null. Mirror of the indexer's `SettlementMarketLink`, which is
   *  also written at creation. Settlement events carry only this key.
   */
  readonly settlementKeyToMarket = new Map<string, string>();
  /**
   *  orderKey -> BinarySide recorded from `BinaryOrderPlaced` before/after its
   *  paired base `OrderPlaced` lands (intra-tx order not guaranteed). The v2 side
   *  source — consumed (deleted) once the order row carries the side.
   */
  readonly pendingKinds = new Map<string, BinarySide>();
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
  readonly collateralDecimals = new Map<string, number>();

  readonly bookBlocks: Map<string, bigint> = new PoolBlocks(this.touchPool);

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
  readonly seedStatusByPool = new Map<string, PoolSeedStatus>();

  status: TailStatus = {
    healedGaps: 0,
    lastDivergence: null,
    failure: null,
    mode: "init",
    seedSource: null,
    seedBlock: 0,
    seedTruncated: false,
    allMarketsTruncated: false,
    fillsLoaded: false,
    snapshotBlock: 0,
    lastBlock: 0,
    headBlock: 0,
    wsConnected: false,
    watchCount: 0,
  };

  private version = 0;
  private listeners = new Set<() => void>();
  private cache = new Map<string, { v: number; val: unknown }>();
  /** Pool-local selections survive unrelated commits and are released on that pool's writes. */
  private readonly poolSelections = new Map<string, Map<string, { val: unknown }>>();
  /** Terminal row fingerprints and the order of observed transitions. */
  private terminalOrderRecency = new Map<
    string,
    Pick<LiveOrder, "status" | "fullQuantity" | "filledQuantity" | "quantityRemaining"> & { observedSeq: number | null }
  >();
  private nextTerminalSequence = 0;
  /** Open orders observed before their terminal transition. */
  private knownOpenOrderIds = new Set<string>();
  /** Last chain block that changed each order, for snapshot-seam arbitration. */
  private liveOrderBlocks = new Map<string, number>();
  /** Recent indexed orders reserved for each active account watch. */
  private userHistoryPins = new Map<string, Set<string>>();
  /** Shared account pins counted at write time, so pool release needs only keyed lookups. */
  private readonly userHistoryPinCounts = new Map<string, number>();
  /** Account history retained after its market watch releases, never book liquidity. */
  private historyOnlyOrderIds = new Set<string>();
  /** Indexed Closed rows are final; live rows wait for a later pool block. */
  private closedOrderRetention = new Map<string, bigint | null | "indexed">();
  /**
   *  Latest chain head time in ns. Retention uses the chain clock, never the
   *  wall clock, so it cannot evict an order the chain can still match.
   */
  private chainNowNs = 0n;
  /** Per pool, the earliest finite expiry among Open rows still counted as open. */
  private poolNextExpiryNs = new Map<string, bigint>();
  /**
   *  The shared sorted book ladder per pool, with every input it was derived
   *  from. Depth-independent: each depth slices this one result, so a page that
   *  reads a mid price and a full book pays one walk, not two. One entry per
   *  pool, replaced in place.
   */
  private bookLadders = new Map<
    string,
    {
      nowNs: bigint;
      nextExpiryNs: bigint | undefined;
      marketId: string | undefined;
      blockNumber: bigint | undefined;
      val: BookLadder;
    }
  >();
  /** Per-depth slices, held against the exact ladder they were cut from. */
  private bookSlices = new Map<string, Map<number, { ladder: BookLadder; val: BookLadder }>>();
  /**
   *  Consumer views of a book (see {@link selectFromBook}), grouped by the pool
   *  whose ladder they were built from. The pool is recorded when the view is
   *  made, so {@link purgePool} drops every view of that pool — pool-keyed and
   *  market-keyed alike — without reading the current market binding.
   */
  private bookViews = new Map<string, Map<string, { from: unknown; val: unknown }>>();

  getVersion(): number {
    return this.version;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Bump version and notify subscribers. Call once per processed block / status change. */
  commit(): void {
    this.version++;
    // A prior version's selections can retain arrays of rows already pruned.
    this.cache.clear();
    this.notify();
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  /** Record the block that supplied an order's locally observed state. */
  noteLiveOrderBlock(id: string, blockNumber: number): void {
    this.touchPool(poolOfOrderKey(id));
    this.historyOnlyOrderIds.delete(id);
    const previous = this.liveOrderBlocks.get(id);
    if (previous === undefined || blockNumber > previous) this.liveOrderBlocks.set(id, blockNumber);
    if (this.orders.get(id)?.status === "Closed") this.closedOrderRetention.set(id, BigInt(blockNumber));
    else this.closedOrderRetention.delete(id);
  }

  /** Reserve the bounded account snapshot before merging it into a busy pool. */
  pinUserHistory(user: string, orders: readonly LiveOrder[]): void {
    // A replaced pin set releases its old rows, so their pools need pruning too.
    const previous = this.userHistoryPins.get(user.toLowerCase());
    this.touchPinnedPools(previous);
    this.releaseHistoryPins(previous);
    const pinned = new Set(orders.map((order) => orderKey(order.pool, order.orderId)));
    for (const id of pinned) this.userHistoryPinCounts.set(id, (this.userHistoryPinCounts.get(id) ?? 0) + 1);
    this.touchPinnedPools(pinned);
    this.userHistoryPins.set(user.toLowerCase(), pinned);
  }

  private releaseHistoryPins(ids: Iterable<string> | undefined): void {
    for (const id of ids ?? []) {
      const remaining = (this.userHistoryPinCounts.get(id) ?? 0) - 1;
      if (remaining > 0) this.userHistoryPinCounts.set(id, remaining);
      else this.userHistoryPinCounts.delete(id);
    }
  }

  private touchPinnedPools(ids: Iterable<string> | undefined): void {
    for (const id of ids ?? []) this.touchPool(poolOfOrderKey(id));
  }

  private demoteOrderToHistory(id: string): void {
    this.historyOnlyOrderIds.add(id);
    this.liveOrderBlocks.delete(id);
    this.closedOrderRetention.delete(id);
    this.knownOpenOrderIds.delete(id);
    this.terminalOrderRecency.delete(id);
  }

  private dropOrder(id: string): void {
    this.orders.delete(id);
    this.historyOnlyOrderIds.delete(id);
    this.terminalOrderRecency.delete(id);
    this.knownOpenOrderIds.delete(id);
    this.liveOrderBlocks.delete(id);
    this.closedOrderRetention.delete(id);
  }

  unpinUserHistory(user: string): void {
    const released = this.userHistoryPins.get(user.toLowerCase());
    this.userHistoryPins.delete(user.toLowerCase());
    this.releaseHistoryPins(released);
    this.touchPinnedPools(released);
    // The released user's expired Open rows lose their protection.
    if (released) for (const pool of this.indexedOrders.ownerPools(user)) this.touchPool(pool);
    if (released) {
      const retained = new Set<string>();
      for (const ids of this.userHistoryPins.values()) for (const id of ids) retained.add(id);
      for (const fill of this.fills.values()) {
        retained.add(fill.makerOrder_id);
        retained.add(fill.takerOrder_id);
      }
      for (const id of released) {
        const order = this.orders.get(id);
        if (!order || retained.has(id)) continue;
        if (this.historyOnlyOrderIds.has(id) || !this.bookBlocks.has(order.pool.toLowerCase())) this.dropOrder(id);
      }
    }
    this.prunePerPool();
  }

  clearUserHistoryPins(): void {
    for (const [user, ids] of this.userHistoryPins) {
      this.touchPinnedPools(ids);
      for (const pool of this.indexedOrders.ownerPools(user)) this.touchPool(pool);
    }
    this.userHistoryPins.clear();
    this.userHistoryPinCounts.clear();
    const fillOrderIds = new Set<string>();
    for (const fill of this.fills.values()) {
      fillOrderIds.add(fill.makerOrder_id);
      fillOrderIds.add(fill.takerOrder_id);
    }
    for (const id of this.historyOnlyOrderIds) if (!fillOrderIds.has(id)) this.dropOrder(id);
    this.prunePerPool();
  }

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
  setStatus(patch: Partial<TailStatus>): void {
    if (this.patchStatus(patch)) this.commit();
  }

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
  setHeadStatus(patch: Partial<TailStatus>): void {
    if (this.patchStatus(patch)) this.notify();
  }

  /**
   *  Merge a status patch WITHOUT committing, and report whether it changed
   *  anything. Use this when the caller batches its own `commit()` — applying a
   *  block patches the status and prunes, then commits once for both.
   */
  patchStatus(patch: Partial<TailStatus>): boolean {
    const changed = (Object.keys(patch) as (keyof TailStatus)[]).some((k) => {
      const next = patch[k];
      // Only a primitive can be proved unchanged; anything else is assumed new.
      if (next !== null && (typeof next === "object" || typeof next === "function")) return true;
      return !Object.is(this.status[k], next);
    });
    if (!changed) return false;
    this.status = { ...this.status, ...patch };
    return true;
  }

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
  selectFromBook<S, T>(pool: string | undefined, key: string, from: S, compute: (from: S) => T): T {
    if (pool === undefined) return compute(from);
    const p = pool.toLowerCase();
    let views = this.bookViews.get(p);
    const hit = views?.get(key);
    if (hit && hit.from === from) return hit.val as T;
    const val = compute(from);
    if (!views) {
      views = new Map();
      this.bookViews.set(p, views);
    }
    views.set(key, { from, val });
    return val;
  }

  /** Pool-local views have bounded reader keys and never retain rows after their pool changes. */
  private selectPool<T>(pool: string | null, key: string, compute: () => T): T {
    if (pool === null) return this.select(key, compute);
    let selections = this.poolSelections.get(pool);
    const hit = selections?.get(key);
    // Each selector key fixes its result type; the heterogeneous cache cannot encode that relation.
    if (hit) return hit.val as T;
    const val = compute();
    if (!selections) {
      // Bound cold reads as well as the varying account and limit keys within a pool.
      if (this.poolSelections.size >= MAX_CACHED_POOL_SELECTIONS) {
        const oldest = this.poolSelections.keys().next();
        if (!oldest.done) this.poolSelections.delete(oldest.value);
      }
      selections = new Map();
      this.poolSelections.set(pool, selections);
    }
    if (selections.size >= MAX_CACHED_POOL_SELECTIONS) {
      const oldest = selections.keys().next();
      if (!oldest.done) selections.delete(oldest.value);
    }
    selections.set(key, { val });
    return val;
  }

  /** Memoized derived snapshot — stable reference while version is unchanged. */
  select<T>(key: string, compute: () => T): T {
    const hit = this.cache.get(key);
    if (hit && hit.v === this.version) return hit.val as T;
    const val = compute();
    this.cache.set(key, { v: this.version, val });
    return val;
  }

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
  }): void {
    for (const m of byCreationAsc(input.markets)) {
      this.indexMarket(m);
      // An indexed row's decimals came from the indexer's own `decimals()`
      // read, so learn the collateral's scale from it — that is what lets a
      // market DISCOVERED LIVE on an already-snapshotted venue reduce at the
      // right scale with no chain read of our own.
      if (m.marketType === "BINARY") this.learnCollateralDecimals(m.collateral, m.quoteDecimals);
    }
    for (const f of input.fills) this.fills.set(f.id, f);
    for (const o of input.orders) {
      const key = orderKey(o.pool, o.orderId);
      const liveBlock = this.liveOrderBlocks.get(key);
      // An indexer row from the same block can precede a locally applied rest.
      if (input.snapshotBlock !== undefined && liveBlock !== undefined && liveBlock >= input.snapshotBlock) continue;
      const wasBookOrder = this.orders.has(key) && !this.historyOnlyOrderIds.has(key);
      this.orders.set(key, o);
      // Account history can enrich an existing book row but cannot create liquidity.
      if (input.userHistory && !wasBookOrder) this.historyOnlyOrderIds.add(key);
      if (!input.userHistory) this.historyOnlyOrderIds.delete(key);
      this.liveOrderBlocks.delete(key);
      // After the seam check, an accepted indexed Closed row is final.
      // Chain seeds contain only Open rows.
      if (o.status === "Closed") this.closedOrderRetention.set(key, "indexed");
      else this.closedOrderRetention.delete(key);
    }
    this.prunePerPool();
  }

  /**
   *  Drop one pool's live rows when its watch is released. An active account
   *  watch keeps its history, but those rows cannot supply book liquidity.
   */
  purgePool(pool: string): void {
    const p = pool.toLowerCase();
    this.touchPool(p);
    this.bookBlocks.delete(p);
    this.poolNextExpiryNs.delete(p);
    // The seed status goes with the seed it describes: a rewatched pool must
    // not read the released watch's truncation or fill-lane result.
    this.seedStatusByPool.delete(p);
    // Drop the derived book with the rows it was derived from, so a rewatched
    // pool cannot be served the released watch's ladder.
    this.bookLadders.delete(p);
    this.bookSlices.delete(p);
    // Includes market-keyed views, whose keys do not contain the pool address.
    this.bookViews.delete(p);
    for (const id of this.poolFills.poolRows(p)?.keys() ?? []) this.fills.delete(id);
    for (const [id] of this.indexedOrders.poolOrderEntries(p)) {
      if (this.userHistoryPinCounts.has(id)) {
        this.demoteOrderToHistory(id);
      } else {
        this.dropOrder(id);
      }
    }
    for (const id of this.poolFunding.poolRows(p)?.keys() ?? []) this.fundingUpdates.delete(id);
  }

  /**
   *  Merge a perp-plane snapshot (upsert by row id; does not commit).
   *
   *  Both maps are append-only logs of finished facts — unlike `mergeSnapshot`, there is
   *  no locally-witnessed row to protect from being blanked, because nothing here is
   *  mutable state. A row the store already holds is simply overwritten by its identical
   *  indexed twin.
   */
  mergePerpPlaneSnapshot(input: { liquidations: LiquidationEvent[]; fundingPayments: FundingPayment[] }): void {
    for (const r of input.liquidations) this.liquidations.set(r.id, r);
    for (const r of input.fundingPayments) this.fundingPayments.set(r.id, r);
    this.prunePerPool();
  }

  /**
   *  Drop every perp-plane row (the plane watch was released). Plane-wide, like the maps
   *  themselves — there is no per-pool half to keep, because the account-level waterfall
   *  legs belong to no pool.
   */
  purgePerpPlane(): void {
    this.liquidations.clear();
    this.fundingPayments.clear();
  }

  /** Register a market + its reverse lookups. */
  indexMarket(m: LiveMarket): void {
    this.markets.set(m.id, m);
    this.poolToMarket.set(m.poolAddress.toLowerCase(), m.id);
    if (m.marketType === "BINARY") {
      this.addressToMarket.set(m.marketAddress.toLowerCase(), m.id);
      this.settlementKeyToMarket.set(settlementKeyOf(m), m.id);
    }
  }

  /** The binary market a settlement `marketKey` names, or undefined when it is not retained. */
  marketBySettlementKey(key: bigint): BinaryMarket | undefined {
    const id = this.settlementKeyToMarket.get(key.toString());
    const m = id === undefined ? undefined : this.markets.get(id);
    return m?.marketType === "BINARY" ? m : undefined;
  }

  /**
   *  Evict cold market rows beyond {@link MAX_COLD_MARKETS}, earliest
   *  discovered first. Runs after fills and orders are pruned, so the protected set is final.
   *
   *  The scan reads every fill and order, so it runs only when its result can
   *  differ from the last one: a new market row, or a market that may have lost
   *  its protection. Otherwise the last scan left a fixed point.
   */
  private pruneMarkets(): void {
    if (this.markets.size <= MAX_COLD_MARKETS) return;
    if (!this.marketsUnprotected && this.markets.size <= this.marketsAfterScan) return;
    this.marketsUnprotected = false;
    const protectedIds = new Set(this.poolToMarket.values());
    for (const f of this.fills.values()) protectedIds.add(f.market_id);
    for (const o of this.orders.values()) protectedIds.add(o.market_id);
    let excess = -MAX_COLD_MARKETS;
    for (const id of this.markets.keys()) if (!protectedIds.has(id)) excess++;
    // Map order is discovery order (re-indexing keeps the slot), so the
    // earliest-discovered cold rows go first.
    for (const [id, m] of this.markets) {
      if (excess <= 0) break;
      if (protectedIds.has(id)) continue;
      this.evictMarket(m);
      excess--;
    }
    this.marketsAfterScan = this.markets.size;
  }

  /** Drop one market row with every lookup and book view that names it. */
  private evictMarket(m: LiveMarket): void {
    this.markets.delete(m.id);
    const pool = m.poolAddress.toLowerCase();
    if (m.marketType === "BINARY") {
      const address = m.marketAddress.toLowerCase();
      if (this.addressToMarket.get(address) === m.id) this.addressToMarket.delete(address);
      const key = settlementKeyOf(m);
      if (this.settlementKeyToMarket.get(key) === m.id) this.settlementKeyToMarket.delete(key);
    }
    // Market-keyed views include the market id in their key (see selectFromBook).
    const views = this.bookViews.get(pool);
    if (!views) return;
    for (const key of views.keys()) if (key.includes(m.id)) views.delete(key);
    if (views.size === 0) this.bookViews.delete(pool);
  }

  /**
   *  Record a collateral token's ERC-20 `decimals()`.
   *
   *  Only a value that came from the chain or the indexer may be recorded —
   *  never one the reducer itself defaulted, or the fallback would teach
   *  itself as fact and every later market on the venue would inherit the
   *  guess.
   */
  learnCollateralDecimals(collateral: string, decimals: number): void {
    this.collateralDecimals.set(collateral.toLowerCase(), decimals);
  }

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
  pruneExpired(headTimestampSec: bigint): boolean {
    const nowNs = headTimestampSec * 1_000_000_000n;
    if (nowNs <= this.chainNowNs) return false;
    this.chainNowNs = nowNs;
    let due = false;
    for (const [pool, expiryNs] of this.poolNextExpiryNs) {
      if (nowNs <= expiryNs) continue;
      this.touchPool(pool);
      due = true;
    }
    if (due) this.prunePerPool();
    return due;
  }

  /**
   *  Bound historical rows while preserving every unexpired open order and retained fill join.
   *
   *  Visits only pools marked in `prunePools` since the last call. Every
   *  retention input is pool-scoped: a fill joins only orders of its own pool,
   *  and a pin change marks the pools of its order ids. An unmarked pool was
   *  already pruned to a fixed point, so revisiting it changes nothing. A bucket
   *  at or under its cap is never sorted.
   */
  prunePerPool(): void {
    if (this.prunePools.size > 0) {
      const pinnedOrderIds = new Set<string>();
      for (const ids of this.userHistoryPins.values()) for (const id of ids) pinnedOrderIds.add(id);
      // Pruning writes only to pools already in the set, so iteration stays bounded.
      for (const pool of this.prunePools) this.prunePool(pool, pinnedOrderIds);
      this.prunePools.clear();
    }

    // The perp plane is capped as a WHOLE (the sources are singletons), so this drops the
    // oldest rows across every pool and account rather than per bucket.
    trimOldest(this.liquidations, MAX_PLANE_ROWS);
    trimOldest(this.fundingPayments, MAX_PLANE_ROWS);

    this.pruneMarkets();
  }

  private prunePool(pool: string, pinnedOrderIds: ReadonlySet<string>): void {
    const fills = this.poolFills.poolRows(pool);
    if (fills !== undefined && fills.size > MAX_FILLS_PER_POOL) {
      const newestFirst = [...fills].sort(([, a], [, b]) => cmpFillDesc(a, b));
      for (const [key] of newestFirst.slice(MAX_FILLS_PER_POOL)) this.fills.delete(key);
    }

    const protectedOrderIds = new Set<string>();
    for (const fill of fills?.values() ?? []) {
      protectedOrderIds.add(fill.makerOrder_id);
      protectedOrderIds.add(fill.takerOrder_id);
    }
    const isProtected = (id: string): boolean => protectedOrderIds.has(id) || pinnedOrderIds.has(id);
    const poolBlock = this.bookBlocks.get(pool);
    let nextExpiryNs: bigint | undefined;
    for (const [id, order] of this.indexedOrders.poolOrderEntries(pool)) {
      if (this.historyOnlyOrderIds.has(id)) {
        if (!isProtected(id)) this.dropOrder(id);
        continue;
      }
      let closedReady = false;
      if (order.status === "Closed") {
        let firstSeen = this.closedOrderRetention.get(id);
        if (firstSeen === undefined || (firstSeen === null && poolBlock !== undefined)) {
          const liveBlock = this.liveOrderBlocks.get(id);
          firstSeen = liveBlock === undefined ? (poolBlock ?? null) : BigInt(liveBlock);
          this.closedOrderRetention.set(id, firstSeen);
        }
        closedReady =
          firstSeen === "indexed" ||
          (typeof firstSeen === "bigint" && poolBlock !== undefined && poolBlock > firstSeen);
      } else {
        this.closedOrderRetention.delete(id);
      }
      // An Open row past its expiry at the latest head is no longer liquidity.
      const expired = order.status === "Open" && isExpired(order.expireTimestampNs, this.chainNowNs);
      if (!isTerminalOrder(order.status) && !closedReady && !expired) {
        if (order.status === "Open") {
          this.knownOpenOrderIds.add(id);
          const expiryNs = BigInt(order.expireTimestampNs);
          const finite = expiryNs !== 0n && expiryNs !== GTC_EXPIRY_NS;
          if (finite && (nextExpiryNs === undefined || expiryNs < nextExpiryNs)) nextExpiryNs = expiryNs;
        } else {
          this.knownOpenOrderIds.delete(id);
        }
        this.terminalOrderRecency.delete(id);
        continue;
      }
      const wasOpen = this.knownOpenOrderIds.delete(id);
      const previous = this.terminalOrderRecency.get(id);
      if (
        !wasOpen &&
        previous?.status === order.status &&
        previous.fullQuantity === order.fullQuantity &&
        previous.filledQuantity === order.filledQuantity &&
        previous.quantityRemaining === order.quantityRemaining
      )
        continue;
      this.terminalOrderRecency.set(id, {
        status: order.status,
        fullQuantity: order.fullQuantity,
        filledQuantity: order.filledQuantity,
        quantityRemaining: order.quantityRemaining,
        observedSeq:
          wasOpen || previous !== undefined || this.liveOrderBlocks.has(id) ? ++this.nextTerminalSequence : null,
      });
    }
    if (nextExpiryNs === undefined) this.poolNextExpiryNs.delete(pool);
    else this.poolNextExpiryNs.set(pool, nextExpiryNs);

    // History is ranked by placement. A status transition observed on this
    // watch outranks later hydration of historical rows.
    const unreferenced: { id: string; order: LiveOrder; observedSeq: number | null }[] = [];
    for (const [id, order] of this.indexedOrders.poolOrderEntries(pool)) {
      const recency = this.terminalOrderRecency.get(id);
      if (recency === undefined || isProtected(id)) continue;
      // An expired Open row still holds escrow on chain. While its owner has an
      // active account watch, keep it so the owner can see and cancel it, even
      // when it was placed after the watch's snapshot.
      if (order.status === "Open" && this.userHistoryPins.has(order.owner.toLowerCase())) continue;
      unreferenced.push({ id, order, observedSeq: recency.observedSeq });
    }
    if (unreferenced.length > MAX_TERMINAL_ORDERS_PER_POOL) {
      unreferenced.sort((left, right) => {
        if (left.observedSeq === null && right.observedSeq !== null) return -1;
        if (left.observedSeq !== null && right.observedSeq === null) return 1;
        if (left.observedSeq !== null && right.observedSeq !== null) return left.observedSeq - right.observedSeq;
        return cmpOrderPlacedAsc(left.order, right.order);
      });
      for (const { id } of unreferenced.slice(0, unreferenced.length - MAX_TERMINAL_ORDERS_PER_POOL))
        this.dropOrder(id);
    }

    // Same treatment for the funding series, which previously had no ceiling at all: a
    // long-lived session accumulated every settlement for its whole lifetime, and
    // `fundingUpdatesFor` re-scans and re-sorts the map on each commit, so the per-event
    // cost grew with it. Rows drop by map key (`${block}_${logIndex}`), not by row id.
    const funding = this.poolFunding.poolRows(pool);
    if (funding !== undefined && funding.size > MAX_FUNDING_PER_POOL) {
      const newestFirst = [...funding].sort(([, a], [, b]) => cmpFundingDesc(a, b));
      for (const [key] of newestFirst.slice(MAX_FUNDING_PER_POOL)) this.fundingUpdates.delete(key);
    }
  }

  // ---- selectors (return Hasura-compatible row shapes) ----

  /**
   *  Resolve a fill's maker/taker owner + side from the order join. Live fills
   *  carry these as undefined (taker isn't known at OrderFilled time; maker is
   *  only filled when its resting order was witnessed live), so we back-join to
   *  the order book — populated from the snapshot's open-orders + live events.
   */
  private enrichFill(f: LiveFill): LiveFill {
    if (f.maker && f.makerSide && f.taker && f.takerSide && f.kind && f.takerIsBid !== undefined) return f;
    const mo = this.orders.get(f.makerOrder_id);
    const to = this.orders.get(f.takerOrder_id);
    if (!mo && !to) return f;
    const makerSide = f.makerSide ?? mo?.side;
    const takerSide = f.takerSide ?? to?.side;
    return {
      ...f,
      maker: f.maker ?? mo?.owner,
      makerSide,
      taker: f.taker ?? to?.owner,
      takerSide,
      // The taker's book direction — the tape's aggressor side on spot, where
      // there is no YES/NO takerSide to derive it from.
      takerIsBid: f.takerIsBid ?? to?.isBid,
      // Mirror the indexer's PendingTakerFill back-fill: classify the fill once
      // both binary sides are known (fillKind needs both). Spot fills have no
      // side → kind stays undefined. Without this, live fills carried
      // kind=undefined forever while snapshot fills had a real kind.
      kind: f.kind ?? (makerSide && takerSide ? fillKind(takerSide, makerSide) : undefined),
    };
  }

  recentFills(pool: string, limit: number): LiveFill[] {
    const p = pool.toLowerCase();
    return this.selectPool(p, `fills:${limit}`, () =>
      [...(this.poolFills.poolRows(p)?.values() ?? [])]
        .sort(cmpFillDesc)
        .slice(0, limit)
        .map((f) => this.enrichFill(f)),
    );
  }

  userFills(pool: string | null, user: string, limit: number): LiveFill[] {
    const u = user.toLowerCase();
    const p = pool?.toLowerCase() ?? null;
    return this.selectPool(p, `ufills:${p ?? "*"}:${u}:${limit}`, () =>
      [...(p === null ? this.fills.values() : (this.poolFills.poolRows(p)?.values() ?? []))]
        .filter(
          (f) =>
            (p === null || f.pool === p) &&
            // Maker is denormalized; taker is usually unresolved on the fill, so
            // also match via the takerOrder → order owner join.
            (f.maker?.toLowerCase() === u ||
              f.taker?.toLowerCase() === u ||
              this.orders.get(f.takerOrder_id)?.owner.toLowerCase() === u),
        )
        .sort(cmpFillDesc)
        .slice(0, limit)
        .map((f) => this.enrichFill(f)),
    );
  }

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
  fundingUpdatesFor(pool: string, limit = 500): LiveFundingUpdate[] {
    const p = pool.toLowerCase();
    return this.selectPool(p, `funding:${limit}`, () =>
      [...(this.poolFunding.poolRows(p)?.values() ?? [])]
        // Sort by (block, logIndex) NUMERICALLY, not by timestamp and not by id string.
        //
        // Not timestamp: several settlements can share a block timestamp, leaving the order
        // undefined. Not the id: it ends with an unpadded logIndex, so `localeCompare` puts
        // `..._10` before `..._2` and silently scrambles a same-block run — which is why
        // logIndex is carried as a number rather than parsed back out of the id.
        .sort((a, b) =>
          a.blockNumber === b.blockNumber
            ? a.logIndex - b.logIndex
            : Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)),
        )
        .slice(-limit),
    );
  }

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
  liquidationsFor(
    filter: Pick<ListLiquidationsOptions, "pool" | "account" | "counterparty" | "party" | "kind" | "kinds">,
    limit: number,
  ): LiquidationEvent[] {
    const pool = filter.pool?.toLowerCase();
    const account = filter.account?.toLowerCase();
    const counterparty = filter.counterparty?.toLowerCase();
    const party = filter.party?.toLowerCase();
    const kind = filter.kind;
    const kinds = filter.kinds && filter.kinds.length > 0 ? filter.kinds : undefined;
    const kindsKey = kinds === undefined ? undefined : [...kinds].sort();
    return this.select(`liq:${JSON.stringify([pool, account, counterparty, party, kind, kindsKey, limit])}`, () =>
      [...this.liquidations.values()]
        .filter(
          (r) =>
            (pool === undefined || r.pool === pool) &&
            (account === undefined || r.account === account) &&
            (counterparty === undefined || r.counterparty === counterparty) &&
            (party === undefined || r.account === party || r.counterparty === party) &&
            (kind === undefined || r.kind === kind) &&
            (kinds === undefined || kinds.some((candidate) => candidate === r.kind)),
        )
        .sort(cmpPlaneRowDesc)
        .slice(0, limit),
    );
  }

  /**
   *  Per-account funding settlements the tail has seen, NEWEST FIRST — the row shape
   *  `getFundingPayments` serves.
   *
   *  Newest-first, unlike `fundingUpdatesFor`: a settlement list is a ledger a wallet view
   *  reads from the top, where the per-pool RATE series is a chart consumed in time order.
   */
  fundingPaymentsFor(filter: { pool?: string; account?: string }, limit: number): FundingPayment[] {
    const pool = filter.pool?.toLowerCase();
    const account = filter.account?.toLowerCase();
    return this.select(`fpay:${pool ?? "*"}:${account ?? "*"}:${limit}`, () =>
      [...this.fundingPayments.values()]
        .filter((r) => (pool === undefined || r.pool === pool) && (account === undefined || r.account === account))
        .sort(cmpPlaneRowDesc)
        .slice(0, limit),
    );
  }

  /** All known markets (memoized — stable reference between mutations). */
  allMarkets(): LiveMarket[] {
    return this.select("markets:all", () => [...this.markets.values()]);
  }

  marketByPool(pool: string): LiveMarket | null {
    const id = this.poolToMarket.get(pool.toLowerCase());
    return this.select(`mpool:${pool.toLowerCase()}`, () => (id ? (this.markets.get(id) ?? null) : null));
  }

  /** Only binary markets have a BinaryMarket contract address. */
  marketByAddress(addr: string): BinaryMarket | null {
    const id = this.addressToMarket.get(addr.toLowerCase());
    return this.select(`maddr:${addr.toLowerCase()}`, () => {
      const m = id ? this.markets.get(id) : undefined;
      return m && m.marketType === "BINARY" ? m : null;
    });
  }

  userOrders(pool: string, user: string, limit: number): LiveOrder[] {
    const p = pool.toLowerCase();
    const u = user.toLowerCase();
    return this.select(`uorders:${p}:${u}:${limit}`, () => this.indexedOrders.userOrders(p, u, limit));
  }

  /**
   *  The locally-materialized RESTING book for a pool, aggregated by price level
   *  — the zero-round-trip mirror of the on-chain `getBookLevels`. Prices are in
   *  the book's native terms (YES terms for binary, quote-per-base for spot).
   *  Only orders witnessed as rested and still open count, matching the chain.
   */
  bookLevels(
    pool: string,
    depth: number,
    timestamp?: bigint,
  ): { bids: BookLevel[]; asks: BookLevel[]; blockNumber?: bigint } {
    const p = pool.toLowerCase();
    // The pool's CURRENT market binding. A BinaryPool is RECYCLED across markets
    // (settlement-extraction v2: one pool serves successive markets, never
    // concurrently). Orders are stamped with `market_id` at placement, so we can
    // require the order's market to equal the pool's current market STRUCTURALLY
    // — rather than relying on the (robust but implicit) fact that a prior
    // market's orders are all past-expiry by the time the pool recycles. If the
    // pool has no current binding (released, not yet re-created), there is no
    // live book → return empty.
    const binding = this.poolToMarket.get(p);
    const currentMarketId = binding !== undefined && this.markets.has(binding) ? binding : undefined;
    // Mirror the on-chain getBookLevels view, which skips any resting order with
    // `now > expireTimestampNs`. On-chain expiry is LAZY — the matching engine
    // walks past an expired maker without evicting it or emitting OrderExpired
    // (anti-griefing, F-2026-16202) — so an event-sourced book never receives a
    // removal event and must apply the wall-clock cutoff itself, or it shows
    // dead liquidity.
    //
    // `nowNs` and the market binding are resolved HERE, outside the derivation,
    // and are stored WITH the cached ladder. That is what makes sharing one
    // ladder across depths safe: a cache hit and a fresh derivation can never
    // disagree, because the entry records every input the derivation read.
    // Caching the ladder per pool alone would let a depth read for the first
    // time at this version receive a ladder built against an older clock — i.e.
    // serve expired liquidity, the failure this cutoff exists to prevent.
    const nowNs = (timestamp ?? BigInt(Math.floor(Date.now() / 1000))) * 1_000_000_000n;
    // The FULL sorted ladder, which does not depend on `depth`. Every depth is a
    // prefix of it, so one walk and one sort serve all of them: a depth-1 mid
    // reader and a depth-9 panel on the same page now share this, instead of each
    // doing an identical full walk. Memoized separately from the per-depth slice.
    let nextExpiryNs: bigint | undefined;
    const deriveLadder = (): BookLadder => {
      const blockNumber = this.bookBlocks.get(p);
      const provenance = blockNumber === undefined ? {} : { blockNumber };
      if (currentMarketId == null) return { bids: [], asks: [], ...provenance };
      const bids = new Map<string, bigint>();
      const asks = new Map<string, bigint>();
      // Only the target pool's rows are read, so derivation cost does not grow with other pools.
      for (const o of this.indexedOrders.poolOrders(p)) {
        if (this.historyOnlyOrderIds.size > 0 && this.historyOnlyOrderIds.has(orderKey(o.pool, o.orderId))) continue;
        if (o.pool !== p || o.market_id !== currentMarketId || o.status !== "Open" || !o.rested) continue;
        if (isExpired(o.expireTimestampNs, nowNs)) continue;
        const qty = BigInt(o.quantityRemaining);
        if (qty <= 0n) continue;
        const expiryNs = BigInt(o.expireTimestampNs);
        if (expiryNs !== 0n && expiryNs !== GTC_EXPIRY_NS && (nextExpiryNs === undefined || expiryNs < nextExpiryNs))
          nextExpiryNs = expiryNs;
        const side = o.isBid ? bids : asks;
        side.set(o.price, (side.get(o.price) ?? 0n) + qty);
      }
      const toLevels = (m: Map<string, bigint>, bestFirst: (a: bigint, b: bigint) => number): BookLevel[] =>
        [...m.entries()]
          .map(([price, quantity]) => ({ price: BigInt(price), quantity }))
          .sort((a, b) => bestFirst(a.price, b.price));
      const highestFirst = (a: bigint, b: bigint): number => {
        if (a === b) return 0;
        if (a > b) return -1;
        return 1;
      };
      const lowestFirst = (a: bigint, b: bigint): number => {
        if (a === b) return 0;
        if (a < b) return -1;
        return 1;
      };
      return {
        ...provenance,
        bids: toLevels(bids, highestFirst),
        asks: toLevels(asks, lowestFirst),
      };
    };
    // Slicing keeps the per-depth reference stable across reads at one version,
    // which `useSyncExternalStore` compares with `Object.is`. A fresh array per
    // call is an infinite-render hazard, not merely an extra render.
    const sliceToDepth = (ladder: BookLadder): BookLadder => {
      const { bids, asks, ...provenance } = ladder;
      return { ...provenance, bids: bids.slice(0, depth), asks: asks.slice(0, depth) };
    };
    // A fixed checkpoint capture is filtered against that block's clock, not the
    // wall clock, so it is derived fresh and never read from or written to the
    // live cache.
    if (timestamp !== undefined) return sliceToDepth(deriveLadder());
    // The shared ladder is cached per pool and re-derived whenever ANY input it
    // reads has moved — its pool's rows, a wall-clock expiry, the market
    // binding, or the book block. The book block can advance without a commit
    // (an attributable event that changes no row), so it is an input too.
    // Holding the clock in the entry rather than in the key keeps this to one
    // entry per pool: a key carrying `nowNs` would mint a new entry every second.
    const blockNumber = this.bookBlocks.get(p);
    const cached = this.bookLadders.get(p);
    const sameInputs =
      cached !== undefined && cached.marketId === currentMarketId && cached.blockNumber === blockNumber;
    const sameExpiry =
      sameInputs && nowNs >= cached.nowNs && (cached.nextExpiryNs === undefined || nowNs <= cached.nextExpiryNs);
    let ladder = sameExpiry ? cached.val : deriveLadder();
    if (sameExpiry) nextExpiryNs = cached.nextExpiryNs;
    // A backwards clock may require a walk without changing the levels.
    if (sameInputs && ladder !== cached.val && sameLadder(ladder, cached.val)) ladder = cached.val;
    if (ladder !== cached?.val || cached?.nowNs !== nowNs) {
      this.bookLadders.set(p, { nowNs, nextExpiryNs, marketId: currentMarketId, blockNumber, val: ladder });
    }
    // The per-depth slice keeps a stable reference for `useSyncExternalStore`,
    // and is rebuilt only when the ladder it slices was itself rebuilt.
    let slices = this.bookSlices.get(p);
    const hit = slices?.get(depth);
    if (hit && hit.ladder === ladder) return hit.val;
    const val = sliceToDepth(ladder);
    if (!slices) {
      slices = new Map();
      this.bookSlices.set(p, slices);
    }
    slices.set(depth, { ladder, val });
    return val;
  }

  /**
   *  Resting book for a market resolved by its `marketId` (recycle-safe). A
   *  BinaryPool is reused across markets, so this resolves the market's pool and
   *  GUARDS that the pool's CURRENT binding is still this market — if `marketId`
   *  is stale (the pool moved on to a newer market), returns `null` so a stale
   *  page renders nothing rather than the successor market's liquidity.
   */
  bookLevelsByMarket(
    marketId: string,
    depth: number,
  ): { bids: BookLevel[]; asks: BookLevel[]; blockNumber?: bigint } | null {
    const id = marketId.toLowerCase();
    const pool = this.markets.get(id)?.poolAddress?.toLowerCase();
    if (!pool || this.poolToMarket.get(pool) !== id) return null;
    return this.bookLevels(pool, depth);
  }

  /**
   *  The current status object. `patchStatus` replaces it on every change, so
   *  its reference is stable until a status field changes. It does not follow
   *  the data version, because `setHeadStatus` changes the status without one.
   */
  getStatus(): TailStatus {
    return this.status;
  }
}

/**
 *  Market rows oldest-created first. Snapshots list markets newest first, and
 *  `indexMarket` binds each row's pool, so merging in that order would bind a
 *  recycled pool to its OLDEST snapshot row and give the newest rows the
 *  earliest eviction slots. A row without a numeric `createdAtBlock` (a chain
 *  seed) sorts last: it is the pool's current market. The sort is stable.
 */
function byCreationAsc(markets: readonly LiveMarket[]): LiveMarket[] {
  const block = (m: LiveMarket): bigint | null => (/^\d+$/.test(m.createdAtBlock) ? BigInt(m.createdAtBlock) : null);
  return [...markets].sort((a, b) => {
    const x = block(a);
    const y = block(b);
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x < y ? -1 : 1;
  });
}

/** Settlement `marketKey` of a binary row as a decimal string: `yesTokenId >> 8`. */
function settlementKeyOf(m: BinaryMarket): string {
  return Ids.marketKey(BigInt(m.yesTokenId)).toString();
}

/** Newest-first: by timestamp, then logIndex (matches the indexer's tape ordering). */
function cmpFillDesc(a: LiveFill, b: LiveFill): number {
  const dt = Number(b.timestamp) - Number(a.timestamp);
  return dt !== 0 ? dt : b.logIndex - a.logIndex;
}

/** Same provenance and the same levels on both sides, in order. */
function sameLadder(a: BookLadder, b: BookLadder): boolean {
  const sameSide = (x: BookLevel[], y: BookLevel[]): boolean =>
    x.length === y.length && x.every((l, i) => l.price === y[i]?.price && l.quantity === y[i]?.quantity);
  return a.blockNumber === b.blockNumber && sameSide(a.bids, b.bids) && sameSide(a.asks, b.asks);
}

function isTerminalOrder(status: OrderStatus): boolean {
  return status === "Filled" || status === "Cancelled" || status === "Expired";
}

function cmpOrderPlacedAsc(left: LiveOrder, right: LiveOrder): number {
  const leftTime = left.createdAt === "" ? 0n : BigInt(left.createdAt);
  const rightTime = right.createdAt === "" ? 0n : BigInt(right.createdAt);
  if (leftTime < rightTime) return -1;
  if (leftTime > rightTime) return 1;
  const leftId = BigInt(left.orderId);
  const rightId = BigInt(right.orderId);
  if (leftId < rightId) return -1;
  if (leftId > rightId) return 1;
  return left.pool.localeCompare(right.pool);
}

/**
 *  Newest-first by (block, logIndex) — the reverse of what `fundingUpdatesFor` serves, and
 *  keyed the same way for the same reason: several settlements can share a block timestamp,
 *  so ordering on the timestamp leaves a same-block run undefined. Used only to decide
 *  which rows the per-pool cap drops.
 */
function cmpFundingDesc(a: LiveFundingUpdate, b: LiveFundingUpdate): number {
  if (a.blockNumber === b.blockNumber) return b.logIndex - a.logIndex;
  return Number(BigInt(b.blockNumber) - BigInt(a.blockNumber));
}

/**
 *  Newest-first by (timestamp, blockNumber, id) — byte for byte the total key
 *  `listLiquidations`, `getFundingPayments` and the plane hydration ask Hasura for, which
 *  is what lets a live page and an indexed page merge by `id` at an agreed boundary.
 *
 *  Every leg of one waterfall shares a block timestamp, so a tie-break is not optional:
 *  without one, which rows a `limit` keeps at the boundary is undefined and the three
 *  paths disagree about which rows exist.
 *
 *  `blockNumber` participates only where the rows carry it. Liquidation rows do and their
 *  indexed read sorts on it; a funding payment has no such column, so its indexed read
 *  cannot and neither does this. Comparing what is present keeps ONE comparator exact for
 *  both, rather than a second one that differs by a key.
 *
 *  The last tie-break is the id STRING, descending, and not the `logIndex` parsed out of
 *  it, because the indexed reads can only order on a column: matching them exactly matters
 *  more than ordering a same-tx run by its true log order, which no ordering available on
 *  both sides can give.
 */
function cmpPlaneRowDesc(a: PlaneRowKey, b: PlaneRowKey): number {
  // Compared as `bigint`, and only when the strings differ. `Number` collapses protocol
  // integers past 2^53 onto one value, which would drop the comparison through to the id
  // and order two distinct timestamps by transaction hash (SDK-TYPE-007).
  if (a.timestamp !== b.timestamp) return BigInt(a.timestamp) < BigInt(b.timestamp) ? 1 : -1;
  if (a.blockNumber !== undefined && b.blockNumber !== undefined && a.blockNumber !== b.blockNumber)
    return BigInt(a.blockNumber) < BigInt(b.blockNumber) ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id > b.id ? -1 : 1;
}

/** What {@link cmpPlaneRowDesc} orders on: `blockNumber` only where the row type has one. */
interface PlaneRowKey {
  id: string;
  timestamp: string;
  blockNumber?: string;
}

/** Keep the newest `max` rows of a perp-plane map, dropping the oldest. */
function trimOldest<T extends PlaneRowKey>(map: Map<string, T>, max: number): void {
  if (map.size <= max) return;
  const rows = [...map.values()].sort(cmpPlaneRowDesc);
  for (const r of rows.slice(max)) map.delete(r.id);
}
