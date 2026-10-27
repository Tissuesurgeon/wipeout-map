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
import * as Ids from "./ids.js";
/**
 *  Index → status for the on-chain MarketStatus enum (StatusChanged events).
 *  Deliberately EXCLUDES "Finalized": no StatusChanged ever carries it — the
 *  reducer derives it from the module/settlement MarketFinalized events.
 */
export const BINARY_MARKET_STATUS = [
    "Listed",
    "Trading",
    "Locked",
    "Settling",
    "Resolved",
    "Voided",
];
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
export const ORDER_KIND_SIDE = ["BUY_YES", "SELL_YES", "BUY_NO", "SELL_NO"];
/**
 *  Map an on-chain `OrderKind` index (from `BinaryOrderPlaced.kind`) to a
 *  {@link BinarySide}. Replaces the v1 `(isBid, userData)` decode — the pool now
 *  states the kind explicitly, so the SDK/indexer join the `BinaryOrderPlaced`
 *  event (by orderId) instead of inferring the side from userData.
 *
 * @category live data
 */
export function sideOfKind(kind) {
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
export function fillKind(takerSide, makerSide) {
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
export function orderKey(pool, orderId) {
    return `${pool.toLowerCase()}_${orderId}`;
}
export function fillKey(blockNumber, logIndex) {
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
export function isExpired(expireTimestampNs, nowNs) {
    const exp = BigInt(expireTimestampNs);
    return exp !== 0n && nowNs > exp;
}
// Callers may request arbitrary limits; keep only a few stable views per owner.
const MAX_CACHED_USER_ORDER_LIMITS = 8;
/** Bounds pool-local selector cache scopes and reader keys per scope. */
const MAX_CACHED_POOL_SELECTIONS = 128;
/** Keep direct reducer and snapshot map writes in the same pool and owner-scoped indexes. */
class IndexedOrders extends Map {
    touch;
    release;
    byPool = new Map();
    byPoolAndOwner = new Map();
    positions = new Map();
    nextPosition = 0;
    /**
     *  @param touch - Receives the lowercased pool of every written or deleted row.
     *  @param release - Receives every row that is deleted or replaced, and no row when the map is cleared.
     */
    constructor(touch, release) {
        super();
        this.touch = touch;
        this.release = release;
    }
    bucketKey(order) {
        return `${order.pool.toLowerCase()}:${order.owner.toLowerCase()}`;
    }
    removeIndexed(key, order) {
        const pool = order.pool.toLowerCase();
        const poolRows = this.byPool.get(pool);
        poolRows?.delete(key);
        if (poolRows?.size === 0)
            this.byPool.delete(pool);
        const scope = this.bucketKey(order);
        const bucket = this.byPoolAndOwner.get(scope);
        if (!bucket)
            return;
        bucket.rows.delete(key);
        if (bucket.rows.size === 0) {
            this.byPoolAndOwner.delete(scope);
            return;
        }
        bucket.sorted = null;
        bucket.slices.clear();
    }
    set(key, order) {
        const previous = super.get(key);
        const previousScope = previous === undefined ? undefined : this.bucketKey(previous);
        const nextScope = this.bucketKey(order);
        if (previous !== undefined && previousScope !== nextScope) {
            this.removeIndexed(key, previous);
            this.touch(previous.pool.toLowerCase());
        }
        if (previous !== undefined)
            this.release(previous);
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
    delete(key) {
        const order = super.get(key);
        if (order === undefined)
            return false;
        this.removeIndexed(key, order);
        this.positions.delete(key);
        this.touch(order.pool.toLowerCase());
        this.release(order);
        return super.delete(key);
    }
    clear() {
        for (const pool of this.byPool.keys())
            this.touch(pool);
        this.release();
        super.clear();
        this.byPool.clear();
        this.byPoolAndOwner.clear();
        this.positions.clear();
        this.nextPosition = 0;
    }
    /** Rows whose pool matches `pool` case-insensitively; the caller must not mutate the store while iterating. */
    poolOrders(pool) {
        return this.byPool.get(pool.toLowerCase())?.values() ?? [];
    }
    /** One pool's keyed rows. Deleting the current row during iteration is safe. */
    poolOrderEntries(pool) {
        return this.byPool.get(pool.toLowerCase())?.entries() ?? [];
    }
    /** Lowercased pools where `owner` has rows. Scans every owner bucket, so use it only on rare events. */
    ownerPools(owner) {
        const suffix = `:${owner.toLowerCase()}`;
        return [...this.byPoolAndOwner.keys()]
            .filter((key) => key.endsWith(suffix))
            .map((key) => key.slice(0, key.indexOf(":")));
    }
    userOrders(pool, user, limit) {
        const bucket = this.byPoolAndOwner.get(`${pool.toLowerCase()}:${user.toLowerCase()}`);
        if (!bucket)
            return [];
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
            if (!oldest.done)
                bucket.slices.delete(oldest.value);
        }
        bucket.slices.set(limit, rows);
        return rows;
    }
}
/** Pool-scoped rows (fills, funding updates) indexed by lowercased pool; reports every pool it writes. */
class PoolRows extends Map {
    touch;
    release;
    byPool = new Map();
    /**
     *  @param touch - Receives the lowercased pool of every written or deleted row.
     *  @param release - Receives every row that is deleted or replaced, and no row when the map is cleared.
     */
    constructor(touch, release = () => { }) {
        super();
        this.touch = touch;
        this.release = release;
    }
    unindex(key, row) {
        const pool = row.pool.toLowerCase();
        const rows = this.byPool.get(pool);
        rows?.delete(key);
        if (rows?.size === 0)
            this.byPool.delete(pool);
        this.touch(pool);
    }
    set(key, row) {
        const previous = super.get(key);
        const pool = row.pool.toLowerCase();
        if (previous !== undefined && previous.pool.toLowerCase() !== pool)
            this.unindex(key, previous);
        if (previous !== undefined)
            this.release(previous);
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
    delete(key) {
        const row = super.get(key);
        if (row === undefined)
            return false;
        this.unindex(key, row);
        this.release(row);
        return super.delete(key);
    }
    clear() {
        for (const pool of this.byPool.keys())
            this.touch(pool);
        this.release();
        super.clear();
        this.byPool.clear();
    }
    /** One pool's keyed rows. Deleting the current row during iteration is safe. */
    poolRows(pool) {
        return this.byPool.get(pool.toLowerCase());
    }
}
/** Pool block stamps; reports every pool whose stamp changes, because Closed-order retention reads it. */
class PoolBlocks extends Map {
    touch;
    /** @param touch - Receives the lowercased pool of every changed stamp. */
    constructor(touch) {
        super();
        this.touch = touch;
    }
    set(pool, block) {
        this.touch(pool.toLowerCase());
        return super.set(pool, block);
    }
    delete(pool) {
        this.touch(pool.toLowerCase());
        return super.delete(pool);
    }
    clear() {
        for (const pool of this.keys())
            this.touch(pool.toLowerCase());
        super.clear();
    }
}
/** Pool -> market bindings; reports every binding that is removed or re-pointed, because market retention reads it. */
class MarketBindings extends Map {
    unbind;
    /** @param unbind - Called when a binding stops naming its market. */
    constructor(unbind) {
        super();
        this.unbind = unbind;
    }
    set(pool, marketId) {
        const previous = super.get(pool);
        if (previous !== undefined && previous !== marketId)
            this.unbind();
        return super.set(pool, marketId);
    }
    delete(pool) {
        const deleted = super.delete(pool);
        if (deleted)
            this.unbind();
        return deleted;
    }
    clear() {
        if (this.size > 0)
            this.unbind();
        super.clear();
    }
}
/** The pool part of an {@link orderKey}. */
function poolOfOrderKey(id) {
    return id.slice(0, id.indexOf("_"));
}
export class MaterializerStore {
    chainId;
    /**
     *  @param chainId - Chain of the owning engine. The reducer and the tail stamp it
     *    on every row they build, so one store holds one chain's rows.
     */
    constructor(chainId) {
        this.chainId = chainId;
    }
    /**
     *  Pools whose retention inputs changed since the last `prunePerPool`.
     *
     *  Declared before the row maps, which report into it from their first write.
     *  Every input the prune reads per pool marks its pool here: fill, order and
     *  funding rows, the pool's book block, an order's live block, and pins.
     */
    prunePools = new Set();
    touchPool = (pool) => {
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
    marketsUnprotected = false;
    /** `markets.size` after the last full scan; a larger map holds new rows. */
    marketsAfterScan = 0;
    unprotectMarkets = () => {
        this.marketsUnprotected = true;
    };
    releaseRow = (row) => {
        if (row === undefined || this.poolToMarket.get(row.pool.toLowerCase()) !== row.market_id)
            this.marketsUnprotected = true;
    };
    markets = new Map();
    poolFills = new PoolRows(this.touchPool, this.releaseRow);
    fills = this.poolFills;
    indexedOrders = new IndexedOrders(this.touchPool, this.releaseRow);
    orders = this.indexedOrders;
    poolFunding = new PoolRows(this.touchPool);
    /**
     *  `${blockNumber}_${logIndex}` -> funding update, appended by the live tail.
     *
     *  Separate from `markets` because a funding CHART needs the series, not just the
     *  latest value the market row carries. Keyed on (block, logIndex) rather than
     *  appended to a list so a reorg replay overwrites instead of duplicating — the same
     *  dedup the tail already applies to fills and orders.
     */
    fundingUpdates = this.poolFunding;
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
    liquidations = new Map();
    /** `${txHash}_${logIndex}` -> a per-account funding settlement. Keyed like `liquidations`. */
    fundingPayments = new Map();
    /**
     *  pool (lowercase) -> market id — the pool's CURRENT market binding, so the
     *  reducer can route a pool log to its market. Settlement-extraction v2: this
     *  binding is TIME-VARYING (a recycled pool serves successive markets, never
     *  concurrently) — `MarketCreated` opens/re-points it, `PoolReleased` closes it.
     */
    poolToMarket = new MarketBindings(this.unprotectMarkets);
    /** BinaryMarket address (lowercase) -> market id (binary markets only) */
    addressToMarket = new Map();
    /**
     *  Settlement `marketKey` (decimal string) -> binary market id. The key is
     *  `yesTokenId >> 8`, so every binary row has one, including a row whose
     *  `nonce` is null. Mirror of the indexer's `SettlementMarketLink`, which is
     *  also written at creation. Settlement events carry only this key.
     */
    settlementKeyToMarket = new Map();
    /**
     *  orderKey -> BinarySide recorded from `BinaryOrderPlaced` before/after its
     *  paired base `OrderPlaced` lands (intra-tx order not guaranteed). The v2 side
     *  source — consumed (deleted) once the order row carries the side.
     */
    pendingKinds = new Map();
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
    collateralDecimals = new Map();
    bookBlocks = new PoolBlocks(this.touchPool);
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
    seedStatusByPool = new Map();
    status = {
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
    version = 0;
    listeners = new Set();
    cache = new Map();
    /** Pool-local selections survive unrelated commits and are released on that pool's writes. */
    poolSelections = new Map();
    /** Terminal row fingerprints and the order of observed transitions. */
    terminalOrderRecency = new Map();
    nextTerminalSequence = 0;
    /** Open orders observed before their terminal transition. */
    knownOpenOrderIds = new Set();
    /** Last chain block that changed each order, for snapshot-seam arbitration. */
    liveOrderBlocks = new Map();
    /** Recent indexed orders reserved for each active account watch. */
    userHistoryPins = new Map();
    /** Shared account pins counted at write time, so pool release needs only keyed lookups. */
    userHistoryPinCounts = new Map();
    /** Account history retained after its market watch releases, never book liquidity. */
    historyOnlyOrderIds = new Set();
    /** Indexed Closed rows are final; live rows wait for a later pool block. */
    closedOrderRetention = new Map();
    /**
     *  Latest chain head time in ns. Retention uses the chain clock, never the
     *  wall clock, so it cannot evict an order the chain can still match.
     */
    chainNowNs = 0n;
    /** Per pool, the earliest finite expiry among Open rows still counted as open. */
    poolNextExpiryNs = new Map();
    /**
     *  The shared sorted book ladder per pool, with every input it was derived
     *  from. Depth-independent: each depth slices this one result, so a page that
     *  reads a mid price and a full book pays one walk, not two. One entry per
     *  pool, replaced in place.
     */
    bookLadders = new Map();
    /** Per-depth slices, held against the exact ladder they were cut from. */
    bookSlices = new Map();
    /**
     *  Consumer views of a book (see {@link selectFromBook}), grouped by the pool
     *  whose ladder they were built from. The pool is recorded when the view is
     *  made, so {@link purgePool} drops every view of that pool — pool-keyed and
     *  market-keyed alike — without reading the current market binding.
     */
    bookViews = new Map();
    getVersion() {
        return this.version;
    }
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };
    /** Bump version and notify subscribers. Call once per processed block / status change. */
    commit() {
        this.version++;
        // A prior version's selections can retain arrays of rows already pruned.
        this.cache.clear();
        this.notify();
    }
    notify() {
        for (const l of this.listeners)
            l();
    }
    /** Record the block that supplied an order's locally observed state. */
    noteLiveOrderBlock(id, blockNumber) {
        this.touchPool(poolOfOrderKey(id));
        this.historyOnlyOrderIds.delete(id);
        const previous = this.liveOrderBlocks.get(id);
        if (previous === undefined || blockNumber > previous)
            this.liveOrderBlocks.set(id, blockNumber);
        if (this.orders.get(id)?.status === "Closed")
            this.closedOrderRetention.set(id, BigInt(blockNumber));
        else
            this.closedOrderRetention.delete(id);
    }
    /** Reserve the bounded account snapshot before merging it into a busy pool. */
    pinUserHistory(user, orders) {
        // A replaced pin set releases its old rows, so their pools need pruning too.
        const previous = this.userHistoryPins.get(user.toLowerCase());
        this.touchPinnedPools(previous);
        this.releaseHistoryPins(previous);
        const pinned = new Set(orders.map((order) => orderKey(order.pool, order.orderId)));
        for (const id of pinned)
            this.userHistoryPinCounts.set(id, (this.userHistoryPinCounts.get(id) ?? 0) + 1);
        this.touchPinnedPools(pinned);
        this.userHistoryPins.set(user.toLowerCase(), pinned);
    }
    releaseHistoryPins(ids) {
        for (const id of ids ?? []) {
            const remaining = (this.userHistoryPinCounts.get(id) ?? 0) - 1;
            if (remaining > 0)
                this.userHistoryPinCounts.set(id, remaining);
            else
                this.userHistoryPinCounts.delete(id);
        }
    }
    touchPinnedPools(ids) {
        for (const id of ids ?? [])
            this.touchPool(poolOfOrderKey(id));
    }
    demoteOrderToHistory(id) {
        this.historyOnlyOrderIds.add(id);
        this.liveOrderBlocks.delete(id);
        this.closedOrderRetention.delete(id);
        this.knownOpenOrderIds.delete(id);
        this.terminalOrderRecency.delete(id);
    }
    dropOrder(id) {
        this.orders.delete(id);
        this.historyOnlyOrderIds.delete(id);
        this.terminalOrderRecency.delete(id);
        this.knownOpenOrderIds.delete(id);
        this.liveOrderBlocks.delete(id);
        this.closedOrderRetention.delete(id);
    }
    unpinUserHistory(user) {
        const released = this.userHistoryPins.get(user.toLowerCase());
        this.userHistoryPins.delete(user.toLowerCase());
        this.releaseHistoryPins(released);
        this.touchPinnedPools(released);
        // The released user's expired Open rows lose their protection.
        if (released)
            for (const pool of this.indexedOrders.ownerPools(user))
                this.touchPool(pool);
        if (released) {
            const retained = new Set();
            for (const ids of this.userHistoryPins.values())
                for (const id of ids)
                    retained.add(id);
            for (const fill of this.fills.values()) {
                retained.add(fill.makerOrder_id);
                retained.add(fill.takerOrder_id);
            }
            for (const id of released) {
                const order = this.orders.get(id);
                if (!order || retained.has(id))
                    continue;
                if (this.historyOnlyOrderIds.has(id) || !this.bookBlocks.has(order.pool.toLowerCase()))
                    this.dropOrder(id);
            }
        }
        this.prunePerPool();
    }
    clearUserHistoryPins() {
        for (const [user, ids] of this.userHistoryPins) {
            this.touchPinnedPools(ids);
            for (const pool of this.indexedOrders.ownerPools(user))
                this.touchPool(pool);
        }
        this.userHistoryPins.clear();
        this.userHistoryPinCounts.clear();
        const fillOrderIds = new Set();
        for (const fill of this.fills.values()) {
            fillOrderIds.add(fill.makerOrder_id);
            fillOrderIds.add(fill.takerOrder_id);
        }
        for (const id of this.historyOnlyOrderIds)
            if (!fillOrderIds.has(id))
                this.dropOrder(id);
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
    setStatus(patch) {
        if (this.patchStatus(patch))
            this.commit();
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
    setHeadStatus(patch) {
        if (this.patchStatus(patch))
            this.notify();
    }
    /**
     *  Merge a status patch WITHOUT committing, and report whether it changed
     *  anything. Use this when the caller batches its own `commit()` — applying a
     *  block patches the status and prunes, then commits once for both.
     */
    patchStatus(patch) {
        const changed = Object.keys(patch).some((k) => {
            const next = patch[k];
            // Only a primitive can be proved unchanged; anything else is assumed new.
            if (next !== null && (typeof next === "object" || typeof next === "function"))
                return true;
            return !Object.is(this.status[k], next);
        });
        if (!changed)
            return false;
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
    selectFromBook(pool, key, from, compute) {
        if (pool === undefined)
            return compute(from);
        const p = pool.toLowerCase();
        let views = this.bookViews.get(p);
        const hit = views?.get(key);
        if (hit && hit.from === from)
            return hit.val;
        const val = compute(from);
        if (!views) {
            views = new Map();
            this.bookViews.set(p, views);
        }
        views.set(key, { from, val });
        return val;
    }
    /** Pool-local views have bounded reader keys and never retain rows after their pool changes. */
    selectPool(pool, key, compute) {
        if (pool === null)
            return this.select(key, compute);
        let selections = this.poolSelections.get(pool);
        const hit = selections?.get(key);
        // Each selector key fixes its result type; the heterogeneous cache cannot encode that relation.
        if (hit)
            return hit.val;
        const val = compute();
        if (!selections) {
            // Bound cold reads as well as the varying account and limit keys within a pool.
            if (this.poolSelections.size >= MAX_CACHED_POOL_SELECTIONS) {
                const oldest = this.poolSelections.keys().next();
                if (!oldest.done)
                    this.poolSelections.delete(oldest.value);
            }
            selections = new Map();
            this.poolSelections.set(pool, selections);
        }
        if (selections.size >= MAX_CACHED_POOL_SELECTIONS) {
            const oldest = selections.keys().next();
            if (!oldest.done)
                selections.delete(oldest.value);
        }
        selections.set(key, { val });
        return val;
    }
    /** Memoized derived snapshot — stable reference while version is unchanged. */
    select(key, compute) {
        const hit = this.cache.get(key);
        if (hit && hit.v === this.version)
            return hit.val;
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
    mergeSnapshot(input) {
        for (const m of byCreationAsc(input.markets)) {
            this.indexMarket(m);
            // An indexed row's decimals came from the indexer's own `decimals()`
            // read, so learn the collateral's scale from it — that is what lets a
            // market DISCOVERED LIVE on an already-snapshotted venue reduce at the
            // right scale with no chain read of our own.
            if (m.marketType === "BINARY")
                this.learnCollateralDecimals(m.collateral, m.quoteDecimals);
        }
        for (const f of input.fills)
            this.fills.set(f.id, f);
        for (const o of input.orders) {
            const key = orderKey(o.pool, o.orderId);
            const liveBlock = this.liveOrderBlocks.get(key);
            // An indexer row from the same block can precede a locally applied rest.
            if (input.snapshotBlock !== undefined && liveBlock !== undefined && liveBlock >= input.snapshotBlock)
                continue;
            const wasBookOrder = this.orders.has(key) && !this.historyOnlyOrderIds.has(key);
            this.orders.set(key, o);
            // Account history can enrich an existing book row but cannot create liquidity.
            if (input.userHistory && !wasBookOrder)
                this.historyOnlyOrderIds.add(key);
            if (!input.userHistory)
                this.historyOnlyOrderIds.delete(key);
            this.liveOrderBlocks.delete(key);
            // After the seam check, an accepted indexed Closed row is final.
            // Chain seeds contain only Open rows.
            if (o.status === "Closed")
                this.closedOrderRetention.set(key, "indexed");
            else
                this.closedOrderRetention.delete(key);
        }
        this.prunePerPool();
    }
    /**
     *  Drop one pool's live rows when its watch is released. An active account
     *  watch keeps its history, but those rows cannot supply book liquidity.
     */
    purgePool(pool) {
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
        for (const id of this.poolFills.poolRows(p)?.keys() ?? [])
            this.fills.delete(id);
        for (const [id] of this.indexedOrders.poolOrderEntries(p)) {
            if (this.userHistoryPinCounts.has(id)) {
                this.demoteOrderToHistory(id);
            }
            else {
                this.dropOrder(id);
            }
        }
        for (const id of this.poolFunding.poolRows(p)?.keys() ?? [])
            this.fundingUpdates.delete(id);
    }
    /**
     *  Merge a perp-plane snapshot (upsert by row id; does not commit).
     *
     *  Both maps are append-only logs of finished facts — unlike `mergeSnapshot`, there is
     *  no locally-witnessed row to protect from being blanked, because nothing here is
     *  mutable state. A row the store already holds is simply overwritten by its identical
     *  indexed twin.
     */
    mergePerpPlaneSnapshot(input) {
        for (const r of input.liquidations)
            this.liquidations.set(r.id, r);
        for (const r of input.fundingPayments)
            this.fundingPayments.set(r.id, r);
        this.prunePerPool();
    }
    /**
     *  Drop every perp-plane row (the plane watch was released). Plane-wide, like the maps
     *  themselves — there is no per-pool half to keep, because the account-level waterfall
     *  legs belong to no pool.
     */
    purgePerpPlane() {
        this.liquidations.clear();
        this.fundingPayments.clear();
    }
    /** Register a market + its reverse lookups. */
    indexMarket(m) {
        this.markets.set(m.id, m);
        this.poolToMarket.set(m.poolAddress.toLowerCase(), m.id);
        if (m.marketType === "BINARY") {
            this.addressToMarket.set(m.marketAddress.toLowerCase(), m.id);
            this.settlementKeyToMarket.set(settlementKeyOf(m), m.id);
        }
    }
    /** The binary market a settlement `marketKey` names, or undefined when it is not retained. */
    marketBySettlementKey(key) {
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
    pruneMarkets() {
        if (this.markets.size <= MAX_COLD_MARKETS)
            return;
        if (!this.marketsUnprotected && this.markets.size <= this.marketsAfterScan)
            return;
        this.marketsUnprotected = false;
        const protectedIds = new Set(this.poolToMarket.values());
        for (const f of this.fills.values())
            protectedIds.add(f.market_id);
        for (const o of this.orders.values())
            protectedIds.add(o.market_id);
        let excess = -MAX_COLD_MARKETS;
        for (const id of this.markets.keys())
            if (!protectedIds.has(id))
                excess++;
        // Map order is discovery order (re-indexing keeps the slot), so the
        // earliest-discovered cold rows go first.
        for (const [id, m] of this.markets) {
            if (excess <= 0)
                break;
            if (protectedIds.has(id))
                continue;
            this.evictMarket(m);
            excess--;
        }
        this.marketsAfterScan = this.markets.size;
    }
    /** Drop one market row with every lookup and book view that names it. */
    evictMarket(m) {
        this.markets.delete(m.id);
        const pool = m.poolAddress.toLowerCase();
        if (m.marketType === "BINARY") {
            const address = m.marketAddress.toLowerCase();
            if (this.addressToMarket.get(address) === m.id)
                this.addressToMarket.delete(address);
            const key = settlementKeyOf(m);
            if (this.settlementKeyToMarket.get(key) === m.id)
                this.settlementKeyToMarket.delete(key);
        }
        // Market-keyed views include the market id in their key (see selectFromBook).
        const views = this.bookViews.get(pool);
        if (!views)
            return;
        for (const key of views.keys())
            if (key.includes(m.id))
                views.delete(key);
        if (views.size === 0)
            this.bookViews.delete(pool);
    }
    /**
     *  Record a collateral token's ERC-20 `decimals()`.
     *
     *  Only a value that came from the chain or the indexer may be recorded —
     *  never one the reducer itself defaulted, or the fallback would teach
     *  itself as fact and every later market on the venue would inherit the
     *  guess.
     */
    learnCollateralDecimals(collateral, decimals) {
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
    pruneExpired(headTimestampSec) {
        const nowNs = headTimestampSec * 1000000000n;
        if (nowNs <= this.chainNowNs)
            return false;
        this.chainNowNs = nowNs;
        let due = false;
        for (const [pool, expiryNs] of this.poolNextExpiryNs) {
            if (nowNs <= expiryNs)
                continue;
            this.touchPool(pool);
            due = true;
        }
        if (due)
            this.prunePerPool();
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
    prunePerPool() {
        if (this.prunePools.size > 0) {
            const pinnedOrderIds = new Set();
            for (const ids of this.userHistoryPins.values())
                for (const id of ids)
                    pinnedOrderIds.add(id);
            // Pruning writes only to pools already in the set, so iteration stays bounded.
            for (const pool of this.prunePools)
                this.prunePool(pool, pinnedOrderIds);
            this.prunePools.clear();
        }
        // The perp plane is capped as a WHOLE (the sources are singletons), so this drops the
        // oldest rows across every pool and account rather than per bucket.
        trimOldest(this.liquidations, MAX_PLANE_ROWS);
        trimOldest(this.fundingPayments, MAX_PLANE_ROWS);
        this.pruneMarkets();
    }
    prunePool(pool, pinnedOrderIds) {
        const fills = this.poolFills.poolRows(pool);
        if (fills !== undefined && fills.size > MAX_FILLS_PER_POOL) {
            const newestFirst = [...fills].sort(([, a], [, b]) => cmpFillDesc(a, b));
            for (const [key] of newestFirst.slice(MAX_FILLS_PER_POOL))
                this.fills.delete(key);
        }
        const protectedOrderIds = new Set();
        for (const fill of fills?.values() ?? []) {
            protectedOrderIds.add(fill.makerOrder_id);
            protectedOrderIds.add(fill.takerOrder_id);
        }
        const isProtected = (id) => protectedOrderIds.has(id) || pinnedOrderIds.has(id);
        const poolBlock = this.bookBlocks.get(pool);
        let nextExpiryNs;
        for (const [id, order] of this.indexedOrders.poolOrderEntries(pool)) {
            if (this.historyOnlyOrderIds.has(id)) {
                if (!isProtected(id))
                    this.dropOrder(id);
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
            }
            else {
                this.closedOrderRetention.delete(id);
            }
            // An Open row past its expiry at the latest head is no longer liquidity.
            const expired = order.status === "Open" && isExpired(order.expireTimestampNs, this.chainNowNs);
            if (!isTerminalOrder(order.status) && !closedReady && !expired) {
                if (order.status === "Open") {
                    this.knownOpenOrderIds.add(id);
                    const expiryNs = BigInt(order.expireTimestampNs);
                    const finite = expiryNs !== 0n && expiryNs !== GTC_EXPIRY_NS;
                    if (finite && (nextExpiryNs === undefined || expiryNs < nextExpiryNs))
                        nextExpiryNs = expiryNs;
                }
                else {
                    this.knownOpenOrderIds.delete(id);
                }
                this.terminalOrderRecency.delete(id);
                continue;
            }
            const wasOpen = this.knownOpenOrderIds.delete(id);
            const previous = this.terminalOrderRecency.get(id);
            if (!wasOpen &&
                previous?.status === order.status &&
                previous.fullQuantity === order.fullQuantity &&
                previous.filledQuantity === order.filledQuantity &&
                previous.quantityRemaining === order.quantityRemaining)
                continue;
            this.terminalOrderRecency.set(id, {
                status: order.status,
                fullQuantity: order.fullQuantity,
                filledQuantity: order.filledQuantity,
                quantityRemaining: order.quantityRemaining,
                observedSeq: wasOpen || previous !== undefined || this.liveOrderBlocks.has(id) ? ++this.nextTerminalSequence : null,
            });
        }
        if (nextExpiryNs === undefined)
            this.poolNextExpiryNs.delete(pool);
        else
            this.poolNextExpiryNs.set(pool, nextExpiryNs);
        // History is ranked by placement. A status transition observed on this
        // watch outranks later hydration of historical rows.
        const unreferenced = [];
        for (const [id, order] of this.indexedOrders.poolOrderEntries(pool)) {
            const recency = this.terminalOrderRecency.get(id);
            if (recency === undefined || isProtected(id))
                continue;
            // An expired Open row still holds escrow on chain. While its owner has an
            // active account watch, keep it so the owner can see and cancel it, even
            // when it was placed after the watch's snapshot.
            if (order.status === "Open" && this.userHistoryPins.has(order.owner.toLowerCase()))
                continue;
            unreferenced.push({ id, order, observedSeq: recency.observedSeq });
        }
        if (unreferenced.length > MAX_TERMINAL_ORDERS_PER_POOL) {
            unreferenced.sort((left, right) => {
                if (left.observedSeq === null && right.observedSeq !== null)
                    return -1;
                if (left.observedSeq !== null && right.observedSeq === null)
                    return 1;
                if (left.observedSeq !== null && right.observedSeq !== null)
                    return left.observedSeq - right.observedSeq;
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
            for (const [key] of newestFirst.slice(MAX_FUNDING_PER_POOL))
                this.fundingUpdates.delete(key);
        }
    }
    // ---- selectors (return Hasura-compatible row shapes) ----
    /**
     *  Resolve a fill's maker/taker owner + side from the order join. Live fills
     *  carry these as undefined (taker isn't known at OrderFilled time; maker is
     *  only filled when its resting order was witnessed live), so we back-join to
     *  the order book — populated from the snapshot's open-orders + live events.
     */
    enrichFill(f) {
        if (f.maker && f.makerSide && f.taker && f.takerSide && f.kind && f.takerIsBid !== undefined)
            return f;
        const mo = this.orders.get(f.makerOrder_id);
        const to = this.orders.get(f.takerOrder_id);
        if (!mo && !to)
            return f;
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
    recentFills(pool, limit) {
        const p = pool.toLowerCase();
        return this.selectPool(p, `fills:${limit}`, () => [...(this.poolFills.poolRows(p)?.values() ?? [])]
            .sort(cmpFillDesc)
            .slice(0, limit)
            .map((f) => this.enrichFill(f)));
    }
    userFills(pool, user, limit) {
        const u = user.toLowerCase();
        const p = pool?.toLowerCase() ?? null;
        return this.selectPool(p, `ufills:${p ?? "*"}:${u}:${limit}`, () => [...(p === null ? this.fills.values() : (this.poolFills.poolRows(p)?.values() ?? []))]
            .filter((f) => (p === null || f.pool === p) &&
            // Maker is denormalized; taker is usually unresolved on the fill, so
            // also match via the takerOrder → order owner join.
            (f.maker?.toLowerCase() === u ||
                f.taker?.toLowerCase() === u ||
                this.orders.get(f.takerOrder_id)?.owner.toLowerCase() === u))
            .sort(cmpFillDesc)
            .slice(0, limit)
            .map((f) => this.enrichFill(f)));
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
    fundingUpdatesFor(pool, limit = 500) {
        const p = pool.toLowerCase();
        return this.selectPool(p, `funding:${limit}`, () => [...(this.poolFunding.poolRows(p)?.values() ?? [])]
            // Sort by (block, logIndex) NUMERICALLY, not by timestamp and not by id string.
            //
            // Not timestamp: several settlements can share a block timestamp, leaving the order
            // undefined. Not the id: it ends with an unpadded logIndex, so `localeCompare` puts
            // `..._10` before `..._2` and silently scrambles a same-block run — which is why
            // logIndex is carried as a number rather than parsed back out of the id.
            .sort((a, b) => a.blockNumber === b.blockNumber
            ? a.logIndex - b.logIndex
            : Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)))
            .slice(-limit));
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
    liquidationsFor(filter, limit) {
        const pool = filter.pool?.toLowerCase();
        const account = filter.account?.toLowerCase();
        const counterparty = filter.counterparty?.toLowerCase();
        const party = filter.party?.toLowerCase();
        const kind = filter.kind;
        const kinds = filter.kinds && filter.kinds.length > 0 ? filter.kinds : undefined;
        const kindsKey = kinds === undefined ? undefined : [...kinds].sort();
        return this.select(`liq:${JSON.stringify([pool, account, counterparty, party, kind, kindsKey, limit])}`, () => [...this.liquidations.values()]
            .filter((r) => (pool === undefined || r.pool === pool) &&
            (account === undefined || r.account === account) &&
            (counterparty === undefined || r.counterparty === counterparty) &&
            (party === undefined || r.account === party || r.counterparty === party) &&
            (kind === undefined || r.kind === kind) &&
            (kinds === undefined || kinds.some((candidate) => candidate === r.kind)))
            .sort(cmpPlaneRowDesc)
            .slice(0, limit));
    }
    /**
     *  Per-account funding settlements the tail has seen, NEWEST FIRST — the row shape
     *  `getFundingPayments` serves.
     *
     *  Newest-first, unlike `fundingUpdatesFor`: a settlement list is a ledger a wallet view
     *  reads from the top, where the per-pool RATE series is a chart consumed in time order.
     */
    fundingPaymentsFor(filter, limit) {
        const pool = filter.pool?.toLowerCase();
        const account = filter.account?.toLowerCase();
        return this.select(`fpay:${pool ?? "*"}:${account ?? "*"}:${limit}`, () => [...this.fundingPayments.values()]
            .filter((r) => (pool === undefined || r.pool === pool) && (account === undefined || r.account === account))
            .sort(cmpPlaneRowDesc)
            .slice(0, limit));
    }
    /** All known markets (memoized — stable reference between mutations). */
    allMarkets() {
        return this.select("markets:all", () => [...this.markets.values()]);
    }
    marketByPool(pool) {
        const id = this.poolToMarket.get(pool.toLowerCase());
        return this.select(`mpool:${pool.toLowerCase()}`, () => (id ? (this.markets.get(id) ?? null) : null));
    }
    /** Only binary markets have a BinaryMarket contract address. */
    marketByAddress(addr) {
        const id = this.addressToMarket.get(addr.toLowerCase());
        return this.select(`maddr:${addr.toLowerCase()}`, () => {
            const m = id ? this.markets.get(id) : undefined;
            return m && m.marketType === "BINARY" ? m : null;
        });
    }
    userOrders(pool, user, limit) {
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
    bookLevels(pool, depth, timestamp) {
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
        const nowNs = (timestamp ?? BigInt(Math.floor(Date.now() / 1000))) * 1000000000n;
        // The FULL sorted ladder, which does not depend on `depth`. Every depth is a
        // prefix of it, so one walk and one sort serve all of them: a depth-1 mid
        // reader and a depth-9 panel on the same page now share this, instead of each
        // doing an identical full walk. Memoized separately from the per-depth slice.
        let nextExpiryNs;
        const deriveLadder = () => {
            const blockNumber = this.bookBlocks.get(p);
            const provenance = blockNumber === undefined ? {} : { blockNumber };
            if (currentMarketId == null)
                return { bids: [], asks: [], ...provenance };
            const bids = new Map();
            const asks = new Map();
            // Only the target pool's rows are read, so derivation cost does not grow with other pools.
            for (const o of this.indexedOrders.poolOrders(p)) {
                if (this.historyOnlyOrderIds.size > 0 && this.historyOnlyOrderIds.has(orderKey(o.pool, o.orderId)))
                    continue;
                if (o.pool !== p || o.market_id !== currentMarketId || o.status !== "Open" || !o.rested)
                    continue;
                if (isExpired(o.expireTimestampNs, nowNs))
                    continue;
                const qty = BigInt(o.quantityRemaining);
                if (qty <= 0n)
                    continue;
                const expiryNs = BigInt(o.expireTimestampNs);
                if (expiryNs !== 0n && expiryNs !== GTC_EXPIRY_NS && (nextExpiryNs === undefined || expiryNs < nextExpiryNs))
                    nextExpiryNs = expiryNs;
                const side = o.isBid ? bids : asks;
                side.set(o.price, (side.get(o.price) ?? 0n) + qty);
            }
            const toLevels = (m, bestFirst) => [...m.entries()]
                .map(([price, quantity]) => ({ price: BigInt(price), quantity }))
                .sort((a, b) => bestFirst(a.price, b.price));
            const highestFirst = (a, b) => {
                if (a === b)
                    return 0;
                if (a > b)
                    return -1;
                return 1;
            };
            const lowestFirst = (a, b) => {
                if (a === b)
                    return 0;
                if (a < b)
                    return -1;
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
        const sliceToDepth = (ladder) => {
            const { bids, asks, ...provenance } = ladder;
            return { ...provenance, bids: bids.slice(0, depth), asks: asks.slice(0, depth) };
        };
        // A fixed checkpoint capture is filtered against that block's clock, not the
        // wall clock, so it is derived fresh and never read from or written to the
        // live cache.
        if (timestamp !== undefined)
            return sliceToDepth(deriveLadder());
        // The shared ladder is cached per pool and re-derived whenever ANY input it
        // reads has moved — its pool's rows, a wall-clock expiry, the market
        // binding, or the book block. The book block can advance without a commit
        // (an attributable event that changes no row), so it is an input too.
        // Holding the clock in the entry rather than in the key keeps this to one
        // entry per pool: a key carrying `nowNs` would mint a new entry every second.
        const blockNumber = this.bookBlocks.get(p);
        const cached = this.bookLadders.get(p);
        const sameInputs = cached !== undefined && cached.marketId === currentMarketId && cached.blockNumber === blockNumber;
        const sameExpiry = sameInputs && nowNs >= cached.nowNs && (cached.nextExpiryNs === undefined || nowNs <= cached.nextExpiryNs);
        let ladder = sameExpiry ? cached.val : deriveLadder();
        if (sameExpiry)
            nextExpiryNs = cached.nextExpiryNs;
        // A backwards clock may require a walk without changing the levels.
        if (sameInputs && ladder !== cached.val && sameLadder(ladder, cached.val))
            ladder = cached.val;
        if (ladder !== cached?.val || cached?.nowNs !== nowNs) {
            this.bookLadders.set(p, { nowNs, nextExpiryNs, marketId: currentMarketId, blockNumber, val: ladder });
        }
        // The per-depth slice keeps a stable reference for `useSyncExternalStore`,
        // and is rebuilt only when the ladder it slices was itself rebuilt.
        let slices = this.bookSlices.get(p);
        const hit = slices?.get(depth);
        if (hit && hit.ladder === ladder)
            return hit.val;
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
    bookLevelsByMarket(marketId, depth) {
        const id = marketId.toLowerCase();
        const pool = this.markets.get(id)?.poolAddress?.toLowerCase();
        if (!pool || this.poolToMarket.get(pool) !== id)
            return null;
        return this.bookLevels(pool, depth);
    }
    /**
     *  The current status object. `patchStatus` replaces it on every change, so
     *  its reference is stable until a status field changes. It does not follow
     *  the data version, because `setHeadStatus` changes the status without one.
     */
    getStatus() {
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
function byCreationAsc(markets) {
    const block = (m) => (/^\d+$/.test(m.createdAtBlock) ? BigInt(m.createdAtBlock) : null);
    return [...markets].sort((a, b) => {
        const x = block(a);
        const y = block(b);
        if (x === y)
            return 0;
        if (x === null)
            return 1;
        if (y === null)
            return -1;
        return x < y ? -1 : 1;
    });
}
/** Settlement `marketKey` of a binary row as a decimal string: `yesTokenId >> 8`. */
function settlementKeyOf(m) {
    return Ids.marketKey(BigInt(m.yesTokenId)).toString();
}
/** Newest-first: by timestamp, then logIndex (matches the indexer's tape ordering). */
function cmpFillDesc(a, b) {
    const dt = Number(b.timestamp) - Number(a.timestamp);
    return dt !== 0 ? dt : b.logIndex - a.logIndex;
}
/** Same provenance and the same levels on both sides, in order. */
function sameLadder(a, b) {
    const sameSide = (x, y) => x.length === y.length && x.every((l, i) => l.price === y[i]?.price && l.quantity === y[i]?.quantity);
    return a.blockNumber === b.blockNumber && sameSide(a.bids, b.bids) && sameSide(a.asks, b.asks);
}
function isTerminalOrder(status) {
    return status === "Filled" || status === "Cancelled" || status === "Expired";
}
function cmpOrderPlacedAsc(left, right) {
    const leftTime = left.createdAt === "" ? 0n : BigInt(left.createdAt);
    const rightTime = right.createdAt === "" ? 0n : BigInt(right.createdAt);
    if (leftTime < rightTime)
        return -1;
    if (leftTime > rightTime)
        return 1;
    const leftId = BigInt(left.orderId);
    const rightId = BigInt(right.orderId);
    if (leftId < rightId)
        return -1;
    if (leftId > rightId)
        return 1;
    return left.pool.localeCompare(right.pool);
}
/**
 *  Newest-first by (block, logIndex) — the reverse of what `fundingUpdatesFor` serves, and
 *  keyed the same way for the same reason: several settlements can share a block timestamp,
 *  so ordering on the timestamp leaves a same-block run undefined. Used only to decide
 *  which rows the per-pool cap drops.
 */
function cmpFundingDesc(a, b) {
    if (a.blockNumber === b.blockNumber)
        return b.logIndex - a.logIndex;
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
function cmpPlaneRowDesc(a, b) {
    // Compared as `bigint`, and only when the strings differ. `Number` collapses protocol
    // integers past 2^53 onto one value, which would drop the comparison through to the id
    // and order two distinct timestamps by transaction hash (SDK-TYPE-007).
    if (a.timestamp !== b.timestamp)
        return BigInt(a.timestamp) < BigInt(b.timestamp) ? 1 : -1;
    if (a.blockNumber !== undefined && b.blockNumber !== undefined && a.blockNumber !== b.blockNumber)
        return BigInt(a.blockNumber) < BigInt(b.blockNumber) ? 1 : -1;
    if (a.id === b.id)
        return 0;
    return a.id > b.id ? -1 : 1;
}
/** Keep the newest `max` rows of a perp-plane map, dropping the oldest. */
function trimOldest(map, max) {
    if (map.size <= max)
        return;
    const rows = [...map.values()].sort(cmpPlaneRowDesc);
    for (const r of rows.slice(max))
        map.delete(r.id);
}
