import { type PublicClient } from "viem";
import type { ChainHeadSubscriber, ChainSocketMark } from "./client.js";
import type { ClientConfig } from "./config.js";
import type { Debug } from "./debug.js";
import type * as GraphqlBoundary from "./graphqlBoundary.js";
import type { MaterializerStore } from "./store.js";
import type { LiquidationKind } from "./perp/history.js";
/**
 *  Sentinel for a seeded order's placement facts.
 *
 *  The pool's resting-order view answers the order's CURRENT state, never how
 *  it got there: `createdAt` and `txHash` are placement history only the
 *  indexer holds. An invented plausible value would be indistinguishable from
 *  a real one, so the seed writes this sentinel and says so here. Fields
 *  carrying it are the only {@link Store.LiveOrder} fields a chain seed cannot
 *  answer; every other field comes from the contract.
 */
export declare const SEEDED_FROM_CHAIN = "";
/** Options for a chain-seeded watch. @category live data */
export interface SeedOptions {
    /**
     *  Seed source; `"chain"` selects the indexer-free path.
     *
     *  ONE POOL PER CALL. N pools means N `watchMarket` calls, because a
     *  `(pool, marketId)` binding is 1:1 at any instant and this option carries
     *  one id. The N calls share one tail and one subscription set, so they
     *  hydrate independently and each pool keeps its own seed status — read it
     *  with `getSeedStatus(pool)`, not `getLiveStatus()`, which reports the most
     *  recent seed only.
     *
     *  Read cost per pool, worst case: `2 × maxPages` contract reads, one drain
     *  per side, plus the module read for the market row. At the defaults that is
     *  80 reads per pool, and it stops early on a side that runs out of orders.
     */
    seed: "chain";
    /**
     *  Market id the pool currently serves — book reads filter on it.
     *
     *  Read it from chain with `getPoolMarketBinding(pool)` when the indexer is
     *  unreachable; the seed rejects an id whose on-chain record names a
     *  different pool.
     */
    marketId: string;
    /** Orders per drained page. Defaults to 500. */
    maxCount?: number;
    /**
     *  Page budget per side. Defaults to 40, so the default drain covers 20,000
     *  resting orders per side. Reaching the budget is reported as
     *  `getSeedStatus(pool).seedTruncated`, not thrown. Prefer that per-pool read
     *  over `getLiveStatus().seedTruncated`, which another pool's later seed
     *  overwrites.
     */
    maxPages?: number;
}
/**
 *  A live watch. `stop()` releases it (idempotent); the underlying
 *  subscription is shared and torn down when the last handle stops.
 *
 * @category live data
 */
export interface WatchHandle {
    /**
     *  Release this handle's reference on its watch scope (idempotent — extra calls
     *  are no-ops). Handles on the same scope share one subscription; stopping the
     *  LAST one tears down the scope's local materialization after a short linger
     *  (which absorbs unmount/remount without re-snapshotting): the subscription is
     *  dropped and the market's fills/orders are purged, so `getLive*` reads for it
     *  return empty again. The market row itself is kept for list views.
     */
    stop(): void;
}
/**
 *  Per-market watch state: `"unwatched"` (no active watch — `getLive*` reads
 *  return empty), `"hydrating"` (watch registered; snapshot/backfill/reconnect
 *  in progress), `"live"` (streaming with delivered-event provenance).
 *
 * @category live data
 */
export type WatchStatus = "unwatched" | "hydrating" | "live";
/**
 *  Options for {@link SomniaMarketsClient.watchPerpMarkets}.
 *
 * @category live data
 */
export interface WatchPerpMarketsOptions {
    /**
     *  The MarginBank to read the plane's wiring from, normally UNNECESSARY: the address
     *  comes from an indexed perp market row, and `MarginBank.getSystemConfig()` reports the
     *  LiquidationEngine from there. Pass it for the one case that cannot cover — an indexer
     *  with no perp rows at all, where there is nothing to ask.
     *
     *  It fills in wiring the plane LACKS, and only that: it is used when the indexer names
     *  no bank, including on a scope a read hook hydrated moments earlier with no hint to
     *  give. It never overrides a bank the indexer DID name — the hydrated rows are that
     *  bank's plane, so streaming another one would splice two venues into one feed — and it
     *  never switches a plane that is already streaming.
     */
    marginBank?: string;
}
/**
 *  Options for {@link SomniaMarketsClient.listLiveLiquidations}.
 *
 * @category live data
 */
export interface ListLiveLiquidationsOptions {
    /**
     *  Keep only legs on this perp pool. DROPS the account-level legs (`AccountLiquidated`,
     *  `ResidualBadDebt`, ...), which carry no pool. Use `party` for every row
     *  involving one wallet.
     */
    pool?: string;
    /** Keep only legs keyed on this liquidated account, never its counterparty.
     *  Use `party` to include both sides. */
    account?: string;
    /** Keep only legs whose other side is this address. This can be a takeover
     *  bidder, ADL peer, transfer or close-out peer, keeper, or insurance fund. */
    counterparty?: string;
    /** Keep rows where this address is the liquidated account or the other side.
     *  Keeper and fund addresses also match their reward or absorption rows.
     *  Combine with `kind` or `kinds` to select position-changing legs for a wallet view.
     *  Compare each row's `account` with the wallet. If they differ, the wallet is
     *  the `counterparty`; `size` and `price` describe the liquidated account's
     *  leg. Read the LiquidationEvent field docs for each kind's meaning. */
    party?: string;
    /** Keep only this liquidation stage. */
    kind?: LiquidationKind;
    /** Keep any of these stages. An empty array adds no filter.
     *  If `kind` is also set, both filters apply. */
    kinds?: readonly LiquidationKind[];
    /** Newest-first cap. Default 50. */
    limit?: number;
}
/**
 *  Options for {@link SomniaMarketsClient.listLiveFundingPayments}.
 *
 * @category live data
 */
export interface ListLiveFundingPaymentsOptions {
    /** Keep only settlements on this perp pool. */
    pool?: string;
    /** Keep only settlements for this account. */
    account?: string;
    /** Newest-first cap. Default 50. */
    limit?: number;
}
/**
 *  What a LiveTail runs against. Each `createClient()` passes its own config +
 *  store + WebSocket client, so two clients never share tail state.
 */
export interface TailDeps {
    getConfig: () => ClientConfig;
    /** The owning client's endpoint governor, so hydration snapshots share its
     *  cap and breaker instead of going out ungoverned (SDK-IO-001). */
    governor?: GraphqlBoundary.EndpointGovernor;
    /** The owning client's one-time check that its indexer serves its chain,
     *  shared with its ordinary reads. Every hydration sends its snapshot request
     *  alongside it and merges rows only after it passes. */
    verifyBinding?: () => Promise<void> | undefined;
    store: MaterializerStore;
    getClient: () => PublicClient;
    /** Opens the `newHeads` stream on the same connection as `getClient`, already
     *  bound to it. The tail consumes parsed heads and never sees a transport. */
    subscribeHeads: ChainHeadSubscriber;
    /** Marks the chain socket when heads go silent, and retires it before the
     *  next re-subscribe, so a socket that answers reads but stopped pushing is replaced. */
    chainSocket?: {
        mark: () => ChainSocketMark | undefined;
        redial: (silentOn: ChainSocketMark | undefined) => void;
    };
    /**
     * The owning client's debug channel. It is a no-op when debugging is disabled.
     *
     * @internal
     */
    dbg: Debug;
}
declare class LiveTail {
    private deps;
    private client;
    private unwatchHeads;
    private unwatchLogs;
    private retryTimer;
    private retryDelay;
    private poolRefs;
    private allRefs;
    private discoverRefs;
    /**
     *  The all-markets scope was released in discovery mode and is lingering. Its creation
     *  sources stay subscribed through the linger, so they must stay counted and recovered
     *  too: otherwise a socket drop in the window is never healed and a remount reuses the
     *  dead subscription, missing `MarketCreated` for good.
     */
    private discoverLingering;
    private userRefs;
    /** Pools covered by the all-markets watch (snapshot set + live discoveries). */
    private allPools;
    private hydratedAll;
    /** Pools whose seam has been sealed — their store rows are current. */
    private hydratedPools;
    /** Users whose history snapshot has landed. */
    private hydratedUsers;
    /** Scope-keyed linger timers (pool:<addr> | all | user:<addr>). */
    private lingers;
    /** In-flight scope hydrations, so concurrent watchers share one snapshot. */
    private hydrations;
    /** Hydrations that hold the head stream while their log sources are unknown. */
    private warmupRefs;
    /** A failed warmup head stream; only its own healthy replacement may clear it. */
    private warmupFailure;
    /** Pools whose scope is mid-hydration — their logs buffer in the inbox. */
    private pendingPools;
    private planeRefs;
    /**
     *  The plane's log sources, lowercased, once resolved. Both, or neither: a plane with
     *  only a MarginBank would stream the funding settlements and silently no liquidations
     *  from the engine, which reads as a quiet venue rather than as a broken watch.
     */
    private planeAddrs;
    /** The bank the resolved sources came from; `null` when the indexer named none. */
    private planeBank;
    /** The plane snapshot's seam, kept so a late bank hint wires onto it without a second fetch. */
    private planeSeam;
    private planeHydrated;
    /** True while the plane's seam is open — its logs buffer in the inbox. */
    private planePending;
    private live;
    private reconnecting;
    private lastBlock;
    private generation;
    private subscriptionGeneration;
    /** Last delivered/probed block per source, independent of other scope seams. */
    private coverage;
    /** Fully committed ranges are structurally excluded even after dedupe pruning. */
    private closedThrough;
    private sourceGeneration;
    private nextSourceGeneration;
    private reconciliationPending;
    private lastReconciliation;
    private lastHeadAt;
    private sampledHead;
    /** The socket the heads watchdog found silent; the next reconnect retires it. */
    private silentOn;
    private headsWatchdog;
    private probingHeads;
    private watchAddresses;
    private watchSet;
    private blockTs;
    private processed;
    private processedFloor;
    private inbox;
    constructor(deps: TailDeps);
    /** The store's chain: the one source of the chain for seams and for every row the tail stamps. */
    private get chainId();
    /**
     *  Creation-event sources watched in discovery mode: the MarketCreator
     *  factory (its 13-field MarketCreated) AND the BinaryMarketsModule (its own
     *  19-field MarketCreated — module-created markets never pass through the
     *  MarketCreator). Either address may be absent from the config — skip it.
     */
    private get discoverySources();
    /**
     *  Whether the plane scope is live OR lingering.
     *
     *  A released pool scope keeps a zero-valued entry in `poolRefs` until `teardownPool`
     *  runs, so it stays counted, subscribed and reported for the whole linger. The plane
     *  has a counter rather than a map entry, so it needs this to behave the same way —
     *  otherwise the next `ensureSubscriptions()` drops its sources mid-linger and the
     *  status reads "unwatched" while the socket is still streaming.
     */
    private get planeActive();
    /** The plane's watch addresses while a plane watch is active. */
    private get planeSources();
    /**
     *  Whether ANY scope is still watched.
     *
     *  Distinct from `activePools().size > 0`, and the distinction is load-bearing: the perp
     *  plane watches two singletons and no pool, so a reconnect guard that counted pools
     *  would refuse to heal a socket drop for a plane-only session — the watch would go
     *  quiet with no error, which is the failure mode this tail's watchdog exists to avoid.
     *  Cold all-market hydration also holds heads before its snapshot names a pool.
     *  That warmup must remain eligible for retry without claiming a source scope.
     */
    private hasActiveScopes;
    /**
     *  Active watch scopes for {@link TailStatus.watchCount}: pools, plus the plane as one,
     *  plus a discovery-only all-markets watch as one.
     *
     *  The last term exists because `watchAllMarkets(true)` on a venue with no market yet
     *  holds the factory/module socket while covering no pool. Counting pools alone reports
     *  0 there, which breaks the field's "0 means no socket held" contract and, through
     *  {@link hasActiveScopes}, refuses to heal a dropped discovery stream.
     */
    private scopeCount;
    /** Every pool an active watch covers, including an all-markets scope's through its linger. */
    private activePools;
    /**
     *  Every log source an active watch covers: the pools, the plane's two singletons, and
     *  the discovery sources.
     *
     *  A source guard built from pools alone is EMPTY for a plane-only or discovery-only
     *  session, so the recovery it guards returns having healed nothing and the watch goes
     *  quiet with no error — the same pool-counting assumption {@link hasActiveScopes}
     *  exists to avoid. For discovery that silence is a MarketCreated missed for good.
     */
    private activeSources;
    /** Watch one market: hydrate its snapshot and stream its events. */
    watchMarket(pool: string, opts?: SeedOptions): Promise<WatchHandle>;
    /**
     *  Watch every eligible market (see `Snapshot.loadMarketsSnapshot`); `discover`
     *  also watches the MarketCreator factory + the BinaryMarketsModule so markets
     *  created later join live (module-created markets emit only the module's
     *  MarketCreated).
     */
    watchAllMarkets(discover: boolean): Promise<WatchHandle>;
    /**
     *  Hydrate one account's past orders + fills (indexer, once). Live events
     *  are attributed to every account on watched markets regardless — this only
     *  supplies history, and only stays current within watched markets.
     */
    watchUser(user: string): Promise<WatchHandle>;
    /**
     *  Watch the perp PLANE: hydrate the recent liquidation legs and funding settlements,
     *  then stream both from the two singletons.
     *
     *  ONE scope for the whole venue, not one per pool, and that is forced rather than
     *  chosen. MarginBank and LiquidationEngine are singletons, so the log subscription is
     *  one stream regardless of what the caller asks for — and the account-level waterfall
     *  legs carry no pool at all, so a per-pool scope would either drop them or attach them
     *  to every pool. Pool filtering happens at read time instead.
     */
    watchPerpMarkets(opts?: WatchPerpMarketsOptions): Promise<WatchHandle>;
    /**
     *  Perp-plane watch state. Shares {@link WatchStatus} with the per-market one, so a UI
     *  renders both with the same three-way branch.
     */
    getPerpPlaneStatus(): WatchStatus;
    /**
     *  Whether a supplied hint still has work to do: the plane is hydrated and found NO
     *  bank at all, which is the one case the option exists for.
     *
     *  Narrow on purpose. A plane that named a bank keeps it — the hint never overrides the
     *  indexer, because the hydrated rows are that bank's and streaming another one would
     *  splice two venues — and a streaming plane is never re-resolved, because that would
     *  move every holder's feed and strand them if the replacement's wiring read failed.
     */
    private planeHintUnused;
    /** Per-market watch state (see {@link WatchStatus}). */
    getWatchStatus(pool: string): WatchStatus;
    /**
     *  Tear down everything: all watches, subscriptions, timers. The store keeps
     *  its last state (reads keep answering, stale).
     */
    stopLive(): void;
    private acquire;
    private release;
    private releaseNow;
    private handle;
    private linger;
    private cancelLinger;
    private teardownPool;
    private teardownAll;
    private teardownPerpPlane;
    private ensureHydration;
    /** Open the owner's transport without guessing log addresses or sealing a source seam. */
    private withTransportWarmup;
    private hydratePools;
    /**
     *  Seed one pool's book from the pool contract, with no indexer request.
     *
     *  The seed reads the pool's market row from the module, drains both sides at
     *  ONE pinned block, and seals the seam from that same block — so the
     *  chain-sourced book is the seam's starting state exactly as an indexer
     *  snapshot would have been, and every post-seam event the reducer replays
     *  attributes to a market row that is actually there.
     *
     *  Fill history is a SEPARATE detached lane: it is the one thing the chain
     *  cannot answer, so its failure records a `fill-history` TailFailure instead
     *  of rejecting the watch whose book already painted.
     */
    private hydratePoolsFromChain;
    /**
     *  The fills lane of a chain-seeded watch, detached on purpose.
     *
     *  A rejection here records a `fill-history` failure on the status rather
     *  than propagating: the book is already painted from chain, and a dead tape
     *  must not take the watch down with it (SDK-IO-002 — an empty tape and an
     *  unloaded tape are different states, and `fillsLoaded` tells them apart).
     *
     *  The lane is detached, so it can outlive its own scope: a request settling
     *  after `stop()` plus the 30s linger would re-insert fills `purgePool` just
     *  dropped, and report `fillsLoaded` for a watch that no longer exists. The
     *  guard is the pool set, not the generation alone — a released pool leaves
     *  the generation untouched.
     */
    private loadFillHistory;
    private hydrateAll;
    /**
     *  Hydrate the perp plane, then seal its seam.
     *
     *  The ORDER here differs from the per-market scopes, deliberately. They subscribe
     *  first, because their watch addresses are the pools the caller named. The plane's two
     *  addresses are not known until they are resolved, and resolving the MarginBank from an
     *  indexed perp row is what keeps a plane watch to ONE indexer request — so the snapshot
     *  runs first and the subscription is armed after.
     *
     *  That is still gap-free, but only because the backfill's upper bound is a head read
     *  over RPC AFTER the subscription is armed, rather than whatever the heads stream has
     *  reported. The warmup heads stream may not have reported the current chain head,
     *  so trusting it would leave blocks between the indexer's head and the real chain
     *  head in neither the backfill nor the inbox — a silent hole exactly one hydration
     *  wide.
     */
    private hydratePerpPlane;
    /**
     *  Resolve the plane's sources from `bank`, arm the subscription, and seal the seam the
     *  snapshot left — the half of hydration that does not touch the indexer.
     *
     *  Separate from the snapshot so a bank hint that arrives AFTER a hint-less hydration
     *  settled on no sources can be honoured without a second indexer request: the rows and
     *  the seam from the first snapshot stand, and this wires the live half onto them.
     *
     *  On failure the plane goes back to source-less with no bank, so the holders that
     *  remain keep exactly the scope they had and a later hint can try again.
     */
    private wirePerpPlane;
    /**
     *  The chain head over the request path, as one of OUR errors.
     *
     *  The decorated client's typed boundary covers `readContract` and `call` only, so a
     *  transport failure here would otherwise reject an awaited watch with a raw viem error
     *  its published union does not name.
     */
    private readChainHead;
    /**
     *  The plane's two log sources: the MarginBank, and the LiquidationEngine it reports.
     *
     *  The engine comes from `MarginBank.getSystemConfig()` rather than from config, because
     *  that is the deployment's own view of its wiring and cannot drift from a rotation the
     *  way a constant can.
     */
    private resolvePlaneSources;
    /**
     *  Backfill [snapshot+1, head] for the scope, then replay its buffered logs.
     *
     *  `scope.addrs` names the log sources directly, for a scope whose sources are not
     *  pools — the perp plane's two singletons — so no book block is stamped for them.
     *  `scope.observedHead` is a head read over RPC after the subscription armed: on a
     *  plane-only session the heads stream has reported nothing yet, and its silence would
     *  otherwise cap the backfill below the real chain head.
     */
    private sealSeam;
    /**
     *  End of a hydration: publish the scope's rows, and go live unless a failure
     *  is pending.
     *
     *  The commit is unconditional and comes FIRST, because it is the hydration
     *  path's only guaranteed publish point. `mergeSnapshot` does not commit, and
     *  `sealSeam`'s `setStatus` publishes nothing when its patch is a no-op —
     *  which is exactly what a second pool sharing the first one's snapshot block
     *  produces. Returning early on a pending failure would then leave the new
     *  pool's rows in the store, unseen by every subscriber until some unrelated
     *  commit arrives.
     *
     *  `this.live` is tail state, not store state, and `getWatchStatus` reads it
     *  through the store's subscription, so the same commit is what moves a
     *  watcher off "hydrating".
     */
    private markLive;
    /** A scope's watch addresses: its pools + their BinaryMarket contracts. */
    private addressesFor;
    /**
     *  Recompute the watch set (active pools ∪ their markets ∪ discovery
     *  sources) and (re)subscribe. No-op if unchanged. Opens the socket on
     *  first use.
     */
    private ensureSubscriptions;
    private subscribeHeads;
    private onHead;
    /**
     *  Serializes every log-applying path onto one chain.
     *
     *  viem's `watchEvent` delivers logs by calling `onLogs` and DISCARDING the
     *  result — once per log on the WS subscribe path, and once per log per poll
     *  tick otherwise. It applies no back-pressure, so the moment the apply path
     *  contains an `await` (it does: an unseen collateral's `decimals()` must be
     *  resolved before the batch that creates its market is reduced), two
     *  invocations overlap: the second batch's reduce loop runs while the first
     *  is suspended, and a later block lands in the store before an earlier one.
     *  That is a money-path bug — worse than the mis-scaling this read exists to
     *  fix, because an OrderFilled reduced before its market exists is dropped by
     *  the handler's unknown-market guard AND marked `processed`, so the
     *  catch-up backfill dedupes it away and the fill is lost outright.
     *
     *  Chaining on a settled-or-not promise costs one microtask when idle and
     *  keeps arrival order exactly as viem produced it. Rejections are contained
     *  here so one failed batch cannot poison the chain for the next.
     */
    private applyQueue;
    private enqueueApply;
    /**
     *  Deliveries that arrived while the apply queue was busy, and the one queue
     *  item that applies them. Each drain makes one gap check for all its blocks,
     *  so the tail stays about one `getLogs` round trip behind the head. One check
     *  per delivered block falls further behind every second on busy pools.
     */
    private pendingDeliveries;
    private pendingDrain;
    private onLogs;
    private applyDecodedLogs;
    /**
     *  Resolve any new market's collateral scale, then reduce the batch in
     *  order and commit once. The single place `processed` is written.
     *
     *  An event is marked processed only if the store could actually attribute
     *  it. A pool event whose market is not in the store yet is a no-op inside
     *  the reducer (`onOrderFilled` / `onOrderPlaced` return early on an unknown
     *  market), and marking it processed anyway would make the `afterApply`
     *  catch-up backfill — the exact mechanism meant to recover it — dedupe it
     *  away, losing the fill instead of replaying it.
     */
    private reduceInOrder;
    /**
     *  Whether the store can attribute `ev` to a market, i.e. whether reducing
     *  it did (or safely could) do anything. Non-pool events — creation,
     *  module/settlement lifecycle — are always attributable: they either build
     *  the market row or address it by id.
     */
    private attributable;
    /** True when `addr` is (or should be) one of the watched pools. */
    private watchedPoolAddress;
    /** True when `addr` is a plane source and the plane's seam is still open. */
    private pendingPlaneLog;
    /**
     *  True when `addr` is a BinaryMarket contract whose POOL is mid-hydration —
     *  its status events must buffer with the rest of the scope.
     */
    private pendingMarketOf;
    /**
     *  If a batch created new markets (MarketCreated, discovery mode), grow the
     *  all-markets set + subscriptions and sweep the creation range so any
     *  same-block activity on the new pool isn't lost across the re-subscribe.
     */
    private afterApply;
    /** Fetch + reduce logs for `addresses` in [from, to] (chunked). */
    private backfill;
    private stampPool;
    /**
     *  Runs inside the apply queue. Up to `RECOVERY_WINDOW` chunk reads overlap, but the
     *  chunks apply strictly in block order and each applied chunk advances its own
     *  source coverage. A failed chunk stops the recovery: earlier chunks keep their
     *  coverage, later responses are dropped, and the caller's retry starts at the hole.
     */
    private recoverNow;
    /**
     *  The gap check. Reads every source that is behind `target` through `target`, and
     *  applies the reads with `streamed`, the deliveries not applied yet, in chain order.
     *
     *  All sources share each chunk, so events of sources with different cursors apply
     *  in block and log order. Up to `RECOVERY_WINDOW` chunk reads overlap, and chunks
     *  apply in block order. A failed chunk stops the check: earlier chunks keep their
     *  coverage, and the caller's retry starts at the hole. A delivered log that a read
     *  lacks means the node behind `getLogs` has not reached its block yet. Coverage
     *  then stops at the highest valid block returned by that read, or before its
     *  start if it returned none, so the next check covers the unproven range again.
     */
    private recoverSources;
    /**
     *  Reads one gap-check range. Retries up to {@link GETLOGS_RETRIES} times while
     *  the read is still `wanted` and the RPC answered with an error. A timeout or
     *  a closed socket is rethrown at once.
     */
    private readLogs;
    private reconcile;
    /**
     *  Replay buffered logs past `after` for `scope` addresses (all, if omitted);
     *  other scopes' buffered logs stay queued.
     */
    private replayInboxNow;
    /** Bind suspended work to the owner and source lifetimes that started it. */
    private sourceGuard;
    /** Decode and apply inside the existing queue. Callers must never enqueue and
     * await another queue item here: recovery has to finish before later logs. */
    private applyLogsNow;
    /**
     *  Resolve the collateral `decimals()` of any market this batch CREATES,
     *  before a single one of its events is reduced.
     *
     *  The reducer is synchronous, so it takes the scale from
     *  `store.collateralDecimals` (see the field's doc) rather than reading the
     *  chain itself. A snapshot already taught the map every collateral its
     *  markets use, so this only fires for a venue discovered live whose
     *  collateral has never been seen — one `decimals()` read per collateral,
     *  memoized per client by `cachedErc20Decimals`.
     *
     *  It must run BEFORE the reduce loop, not after: `onOrderFilled` folds
     *  `quoteQuantity` into `cumulativeQuoteVolume`, so a fill reduced at the
     *  wrong scale cannot be repaired by fixing the market row afterwards.
     *
     *  Awaiting here only orders the read ahead of the fills in LATER batches
     *  because every applying path is serialized on {@link applyQueue} — see the
     *  note there. Without that queue this `await` would be the bug rather than
     *  the fix, since viem calls `onLogs` without back-pressure.
     */
    private warmCollateralDecimals;
    private decode;
    private onWsError;
    private startHeadsWatchdog;
    private stopHeadsWatchdog;
    /** No newHeads for HEADS_STALL_MS while live: probe the chain head over the
     *  request path. If the chain moved without the sub telling us, the sub is
     *  dead — run the WS-error healing path (which force-resubscribes). If even
     *  the probe fails, the socket itself is gone — same path. A chain that
     *  simply hasn't minted (idle anvil) is left alone. */
    private checkHeadsStall;
    private scheduleReconnect;
    /**
     *  Heal after a socket drop: resubscribe (buffering), backfill everything the
     *  store missed since `lastBlock` straight from chain, replay, go live. The
     *  indexer is NOT consulted — the store's own state is the seam.
     */
    private reconnect;
    private pruneMaps;
    /** Closed guards reject replay before decoding, so certified buckets need no ids.
     * A pending source without closure blocks pruning. Heads alone prove no closure.
     * Scan block keys only when the common certified frontier changes; deleting a
     * bucket releases all of its ids without traversing them. */
    private pruneProcessed;
}
export { LiveTail };
