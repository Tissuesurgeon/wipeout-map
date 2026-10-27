import * as Errors from "./errors.js";
// LiveTail — the client-side zero-latency local indexer, scoped by WATCHES.
//
// Nothing is tailed by default. Callers open ref-counted watches:
//   watchMarket(pool)          — materialize ONE market (its book, fills, orders)
//   watchAllMarkets(discover)  — materialize every eligible market: SPOT, PERP
//                                and non-finalized BINARY (+ optionally discover
//                                new ones live off the MarketCreator factory
//                                AND the BinaryMarketsModule)
//   watchUser(user)            — hydrate one account's order/fill HISTORY
//   watchPerpMarkets()         — the perp PLANE: liquidation legs + per-account
//                                funding settlement, from the two singletons
// Each watch returns a handle; stop() releases it. The same scope watched twice
// shares one subscription (refcount), and a released scope lingers briefly
// before teardown so unmount/remount (React StrictMode, quick navigation)
// doesn't thrash snapshots.
//
// Per-scope seam: subscriptions start buffering
// the scope's logs FIRST, then a consistent indexer snapshot hydrates to block
// X, a one-shot getLogs backfills [X+1, head], and the buffered logs replay
// deduped by (block, logIndex). This snapshot is the ONLY indexer touch a
// scope ever makes.
//
// Reconnects never touch the indexer: each source keeps its own log coverage L,
// so a WS drop is healed by resubscribing and backfilling [L+1, head] from
// chain (with exponential backoff while the socket stays dead).
//
// Somnia has instant BFT finality — blocks never reorg — so a delivered block
// is final and there is no reorg handling. Somnia logs carry no timestamp, so
// the newHeads stream doubles as the timestamp source.

import {
  decodeEventLog,
  isAddress,
  type Address,
  type DecodeEventLogReturnType,
  type Hex,
  type Log,
  type PublicClient,
  SocketClosedError,
  TimeoutError,
  WebSocketRequestError,
} from "viem";
import { RpcError, ContractRevertError, InvalidInputError, NotConfiguredError } from "./errors.js";
import { InvariantError } from "./raise.js";
import * as Revert from "./revert.js";
import * as Orders from "./orders.js";
import * as Balances from "./balances.js";
import type { ChainHead, ChainHeadSubscriber, ChainSocketMark } from "./client.js";
import type { ClientConfig } from "./config.js";
import type { Debug } from "./debug.js";
import * as EventsAbi from "./eventsAbi.js";
import * as LogTopics from "./logTopics.js";
import * as Markets from "./markets.js";
import type { DecodedEvent } from "./reducer.js";
import * as Reducer from "./reducer.js";
import * as ReadsAbi from "./readsAbi.js";
import * as Snapshot from "./snapshot.js";
import type * as GraphqlBoundary from "./graphqlBoundary.js";
import * as Store from "./store.js";
import type { MaterializerStore } from "./store.js";
import type { LiquidationKind } from "./perp/history.js";

/**
 * Live watches hydrate their snapshot from the indexer; a client configured
 * without one (an empty string counts as absent) refuses the watch up front
 * rather than mid-stream.
 */
function requireIndexerUrl(config: { indexerUrl?: string }): string {
  const url = config.indexerUrl;
  if (!url) {
    throw new NotConfiguredError("config.indexerUrl", "a live watch (indexer snapshot hydration)");
  }
  return url;
}

/** Every topic0 `liveEventsAbi` can decode — built once, not per log. */
const LIVE_TOPIC0 = LogTopics.topic0Set(EventsAbi.liveEventsAbi);

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
export const SEEDED_FROM_CHAIN = "";

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
 *  One drained chain order → the store's live row.
 *
 *  `status: "Open"` and `rested: true` are implied by the source, not invented:
 *  the pool's view returns only orders that are resting and open. `filledQuantity`
 *  is derived (`fullQuantity - quantityRemaining`). Placement history uses
 *  {@link SEEDED_FROM_CHAIN}.
 */
function toSeededOrder(o: Orders.OnchainOrder, pool: string, marketId: string, chainId: number): Store.LiveOrder {
  return {
    id: `${pool}_${o.orderId.toString()}`,
    chainId,
    market_id: marketId,
    pool: pool as Address,
    orderId: o.orderId.toString(),
    owner: o.owner,
    // Binary YES/NO is an EVENT fact (BinaryOrderPlaced.kind); the resting-order
    // view carries only the book side, so leave it unset rather than guess.
    side: undefined,
    isBid: o.isBid,
    userData: o.userData.toString(),
    price: o.price.toString(),
    fullQuantity: o.fullQuantity.toString(),
    quantityRemaining: o.quantityRemaining.toString(),
    filledQuantity: (o.fullQuantity - o.quantityRemaining).toString(),
    expireTimestampNs: o.expireTimestampNs.toString(),
    status: "Open",
    rested: true,
    createdAt: SEEDED_FROM_CHAIN,
    txHash: SEEDED_FROM_CHAIN,
  };
}

/**
 *  The market ROW a chain seed writes for the pool it seeds.
 *
 *  The reducer resolves every order, fill and lifecycle event through this row
 *  (`marketByPool`) and DROPS the event when it is absent, so a seed that only
 *  bound the pool would seal a seam over a book that could never advance.
 *
 *  The module answers every field the reducer consumes — `marketType`,
 *  `collateral`, `baseDecimals`/`quoteDecimals`, `nonce`, plus the lifecycle
 *  state (`status`, `backing`, `finalized`, `voided`, `winningOutcome`). What
 *  it cannot answer is indexer-only prose and creation history: `question`,
 *  `asset`, `oracleQuestion`, `strike`/`mode`, `tradingStart`, `createdByTx`,
 *  `createdAtTimestamp`/`createdAtBlock`, `intervalSec`, and the origin
 *  attribution. Those take null/empty sentinels rather than being invented.
 *
 *  They are NOT filled in later: `watchMarket` skips hydration once the pool is
 *  in `hydratedPools`, `watchAllMarkets` excludes already-hydrated pools so a
 *  scoped watch keeps its seed, and `purgePool` keeps the market row on
 *  teardown. The seeded row therefore stays until cold-market eviction drops
 *  it (`MaterializerStore.pruneMarkets`). Read
 *  the indexer directly (`getBinaryMarket`) when the prose or the strike is
 *  needed.
 *
 *  Volume counters start at 0 because a chain seed loads no fill history —
 *  `getLiveStatus().fillsLoaded` is what says so.
 */
function seededMarket(marketId: string, pool: string, m: Markets.MarketOnchain): Store.LiveMarket {
  return {
    id: marketId,
    marketType: "BINARY",
    poolAddress: pool as Address,
    lastPrice: null,
    lastTradeAt: null,
    cumulativeBaseVolume: "0",
    cumulativeQuoteVolume: "0",
    tradeCount: "0",
    // The collateral's OWN scale, read on chain — binary outcome tokens mirror
    // the collateral, exactly as the indexer records it.
    baseDecimals: m.decimals,
    quoteDecimals: m.decimals,
    createdAtTimestamp: SEEDED_FROM_CHAIN,
    createdAtBlock: SEEDED_FROM_CHAIN,
    marketId: marketId as Hex,
    marketAddress: m.marketAddress.toLowerCase() as Address,
    yesTokenId: m.yesId.toString(),
    noTokenId: m.noId.toString(),
    collateral: m.collateral.toLowerCase() as Address,
    asset: SEEDED_FROM_CHAIN,
    question: SEEDED_FROM_CHAIN,
    status: Store.BINARY_MARKET_STATUS[m.status] ?? "Listed",
    oracleQuestion: null,
    // Null, not "0": the module record carries no strike, and 0 is the
    // protocol's sentinel for reference (up/down) mode — writing it would
    // permanently relabel a fixed-strike market, since nothing corrects this
    // row. `boundaryPrice` reads the null pair as "no boundary".
    strike: null,
    mode: null,
    tradingStart: SEEDED_FROM_CHAIN,
    expiry: m.expiry.toString(),
    winningOutcome: m.isResolved ? m.winningOutcome : null,
    resolvedAtBlock: null,
    resolvedAtTimestamp: null,
    createdByTx: null,
    voided: m.isVoided,
    voidPolicy: m.voidPolicy,
    backing: m.backing.toString(),
    nonce: m.nonce.toString(),
    finalized: m.finalized,
    netBacking: null,
    intervalSec: null,
    interval: null,
    operatorId: null,
    venueId: null,
  };
}

/**
 *  Fill-history-derived counters a chain seed writes as `"0"` — which is also a
 *  real value for a market that has never traded, so the sentinel rule in
 *  {@link mergeSeedOverExisting} cannot recognize them and they are named here.
 */
const SEEDED_VOLUME_FIELDS = ["cumulativeBaseVolume", "cumulativeQuoteVolume", "tradeCount"] as const;

/**
 *  Let a chain seed write its row WITHOUT blanking a richer one already there.
 *
 *  A pool can have been watched from the indexer before (`watchMarket(pool)` or
 *  `watchMarkets()`), and `purgePool` keeps the market row past teardown by
 *  design (within the store's cold-market allowance). A later chain seed for the same pool then goes through
 *  `mergeSnapshot` → `indexMarket`, which replaces the row outright — so the
 *  question text, strike, mode and volume counters the indexer had supplied
 *  vanish store-wide, for every reader, permanently (nothing re-hydrates a
 *  seeded pool).
 *
 *  The rule is per FIELD, not per row: a field the seed could not answer keeps
 *  what was there, and every field the module DID answer wins, because the
 *  module read is the fresher of the two. The sentinel a seed writes is exactly
 *  `null` or {@link SEEDED_FROM_CHAIN}, so "could not answer" needs no field
 *  list of its own to fall out of sync with `seededMarket`.
 *
 *  {@link SEEDED_VOLUME_FIELDS} is the one exception that rule cannot see, and
 *  is recovered by name.
 *
 *  With no existing row this returns the seed unchanged.
 */
function mergeSeedOverExisting(seed: Store.LiveMarket, existing: Store.LiveMarket | undefined): Store.LiveMarket {
  if (!existing) return seed;
  const merged = { ...seed };
  for (const key of Object.keys(seed) as (keyof Store.LiveMarket)[]) {
    const value = seed[key];
    if (value !== null && value !== SEEDED_FROM_CHAIN) continue;
    const prior = existing[key];
    if (prior === undefined || prior === null || prior === SEEDED_FROM_CHAIN) continue;
    // Field-wise recovery of an indexer value the chain cannot supply. The key
    // is the same property on both rows, so the types line up; TypeScript
    // cannot express that through a loop variable.
    (merged[key] as unknown) = prior;
  }
  for (const key of SEEDED_VOLUME_FIELDS) merged[key] = existing[key];
  return merged;
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

// Public Somnia RPC caps eth_getLogs at 1000 blocks — chunk to stay under it.
const GETLOGS_CHUNK = 1000;
/**
 *  Recovery chunk reads in flight or buffered at once. The tail applies chunks in
 *  block order, so a later chunk's response waits in memory until every earlier chunk
 *  is applied. At most this many responses (each at most `GETLOGS_CHUNK` blocks of logs)
 *  are held per recovery. viem's `getLogs` takes no abort signal, so a stop abandons
 *  the reads that are in flight rather than cancelling them.
 */
const RECOVERY_WINDOW = 4;
/**
 *  Extra attempts for one gap-check `getLogs` read that the RPC answered with an
 *  error, and the first wait before one (doubling). Without them, one busy answer
 *  sends the tail to the reconnect path, whose backoff reaches 8 s. Timeouts and
 *  closed sockets are not retried: the reconnect path dials a new socket.
 */
const GETLOGS_RETRIES = 2;
const GETLOGS_RETRY_MS = 250;
/** `getBlock` timestamp reads in flight at once for one applied batch. */
const TIMESTAMP_CONCURRENCY = 8;
// Reconnect backoff bounds (doubles per attempt, resets once live).
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8_000;
// A heads subscription can die SILENTLY on Somnia's WS — no error event, the
// socket still answers requests and may still deliver logs (same server-side
// quirk family the rpc-proxy exists for). Symptom: fills/probabilities keep
// streaming while lastBlock freezes. If no newHeads lands for this long while
// live, probe the chain head; if it moved, the sub is dead → heal via the
// reconnect path. Somnia mints multiple blocks per second, so 15s of silence
// with a moving chain is unambiguous. (A QUIET chain — e.g. idle local anvil,
// which only mines on demand — is not a stall; the probe rules that out.)
const HEADS_STALL_MS = 15_000;
// How long a fully-released scope lingers before teardown. Covers React
// StrictMode's mount→unmount→mount and quick back/forward navigation without
// re-snapshotting.
const RELEASE_LINGER_MS = 30_000;

/**
 *  Head timestamps kept for log decoding. After each head, the map holds fewer
 *  than `2 * BLOCK_TS_RETAIN` entries. Retention follows the head only. A source
 *  cursor must not pin it, because a quiet source never advances its cursor. A log
 *  from an older block reads its exact timestamp again through `getBlock`.
 */
const BLOCK_TS_RETAIN = 256;

type RawLog = Log<bigint, number, false>;

/** Reports whether a failed read came back from the RPC, not from a socket that timed out or closed. */
function isRetryableRead(error: unknown): boolean {
  let current: unknown = error;
  // Bounded walk: a cause chain is short, and a cyclic one must not hang.
  for (let depth = 0; depth < 16 && current instanceof Error; depth++) {
    if (
      current instanceof TimeoutError ||
      current instanceof SocketClosedError ||
      current instanceof WebSocketRequestError
    )
      return false;
    current = current.cause;
  }
  return true;
}

function evKey(blockNumber: number, logIndex: number): string {
  return `${blockNumber}_${logIndex}`;
}

class LiveTail {
  private client: PublicClient | null = null;
  private unwatchHeads: (() => void) | null = null;
  private unwatchLogs: (() => void) | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = RECONNECT_BASE_MS;

  // ---- watch registry (all keys lowercased) ----
  private poolRefs = new Map<string, number>();
  private allRefs = 0;
  private discoverRefs = 0;
  /**
   *  The all-markets scope was released in discovery mode and is lingering. Its creation
   *  sources stay subscribed through the linger, so they must stay counted and recovered
   *  too: otherwise a socket drop in the window is never healed and a remount reuses the
   *  dead subscription, missing `MarketCreated` for good.
   */
  private discoverLingering = false;
  private userRefs = new Map<string, number>();
  /** Pools covered by the all-markets watch (snapshot set + live discoveries). */
  private allPools = new Set<string>();
  private hydratedAll = false;
  /** Pools whose seam has been sealed — their store rows are current. */
  private hydratedPools = new Set<string>();
  /** Users whose history snapshot has landed. */
  private hydratedUsers = new Set<string>();
  /** Scope-keyed linger timers (pool:<addr> | all | user:<addr>). */
  private lingers = new Map<string, ReturnType<typeof setTimeout>>();
  /** In-flight scope hydrations, so concurrent watchers share one snapshot. */
  private hydrations = new Map<string, Promise<void>>();
  /** Hydrations that hold the head stream while their log sources are unknown. */
  private warmupRefs = 0;
  /** A failed warmup head stream; only its own healthy replacement may clear it. */
  private warmupFailure: Store.TailFailure | null = null;
  /** Pools whose scope is mid-hydration — their logs buffer in the inbox. */
  private pendingPools = new Set<string>();

  // ---- perp plane (one scope, two singleton log sources) ----
  private planeRefs = 0;
  /**
   *  The plane's log sources, lowercased, once resolved. Both, or neither: a plane with
   *  only a MarginBank would stream the funding settlements and silently no liquidations
   *  from the engine, which reads as a quiet venue rather than as a broken watch.
   */
  private planeAddrs: readonly string[] = [];
  /** The bank the resolved sources came from; `null` when the indexer named none. */
  private planeBank: string | null = null;
  /** The plane snapshot's seam, kept so a late bank hint wires onto it without a second fetch. */
  private planeSeam: { snapshotBlock: number; reportedHeadBlock: number } | null = null;
  private planeHydrated = false;
  /** True while the plane's seam is open — its logs buffer in the inbox. */
  private planePending = false;

  // ---- stream state ----
  private live = false;
  private reconnecting = false;
  private lastBlock = 0;
  private generation = 0;
  private subscriptionGeneration = 0;
  /** Last delivered/probed block per source, independent of other scope seams. */
  private coverage = new Map<string, number>();
  /** Fully committed ranges are structurally excluded even after dedupe pruning. */
  private closedThrough = new Map<string, number>();
  private sourceGeneration = new Map<string, number>();
  private nextSourceGeneration = 0;
  private reconciliationPending = false;
  private lastReconciliation = 0n;
  private lastHeadAt = 0;
  private sampledHead = 0;
  /** The socket the heads watchdog found silent; the next reconnect retires it. */
  private silentOn: ChainSocketMark | undefined = undefined;
  private headsWatchdog: ReturnType<typeof setInterval> | null = null;
  private probingHeads = false;
  private watchAddresses: string[] = [];
  private watchSet = new Set<string>();
  private blockTs = new Map<number, number>();
  // Exact log indices per block. Unresolved blocks have no age or size eviction:
  // only certified closure (or owner disposal) can replace their replay protection.
  private processed = new Map<number, Set<number>>();
  private processedFloor = -1;
  private inbox = new Map<string, RawLog>();

  constructor(private deps: TailDeps) {}

  /** The store's chain: the one source of the chain for seams and for every row the tail stamps. */
  private get chainId(): number {
    return this.deps.store.chainId;
  }

  /**
   *  Creation-event sources watched in discovery mode: the MarketCreator
   *  factory (its 13-field MarketCreated) AND the BinaryMarketsModule (its own
   *  19-field MarketCreated — module-created markets never pass through the
   *  MarketCreator). Either address may be absent from the config — skip it.
   */
  private get discoverySources(): string[] {
    if (this.discoverRefs === 0 && !this.discoverLingering) return [];
    const addresses = this.deps.getConfig().addresses;
    const sources: string[] = [];
    if (addresses?.marketCreator) sources.push(addresses.marketCreator.toLowerCase());
    if (addresses?.binaryModule) sources.push(addresses.binaryModule.toLowerCase());
    return sources;
  }

  /**
   *  Whether the plane scope is live OR lingering.
   *
   *  A released pool scope keeps a zero-valued entry in `poolRefs` until `teardownPool`
   *  runs, so it stays counted, subscribed and reported for the whole linger. The plane
   *  has a counter rather than a map entry, so it needs this to behave the same way —
   *  otherwise the next `ensureSubscriptions()` drops its sources mid-linger and the
   *  status reads "unwatched" while the socket is still streaming.
   */
  private get planeActive(): boolean {
    return this.planeRefs > 0 || this.lingers.has("perpPlane");
  }

  /** The plane's watch addresses while a plane watch is active. */
  private get planeSources(): readonly string[] {
    return this.planeActive ? this.planeAddrs : [];
  }

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
  private hasActiveScopes(): boolean {
    return this.warmupRefs > 0 || this.scopeCount() > 0;
  }

  /**
   *  Active watch scopes for {@link TailStatus.watchCount}: pools, plus the plane as one,
   *  plus a discovery-only all-markets watch as one.
   *
   *  The last term exists because `watchAllMarkets(true)` on a venue with no market yet
   *  holds the factory/module socket while covering no pool. Counting pools alone reports
   *  0 there, which breaks the field's "0 means no socket held" contract and, through
   *  {@link hasActiveScopes}, refuses to heal a dropped discovery stream.
   */
  private scopeCount(): number {
    const pools = this.activePools().size;
    const discoveryOnly = pools === 0 && this.discoverySources.length > 0 ? 1 : 0;
    return pools + discoveryOnly + (this.planeActive ? 1 : 0);
  }

  /** Every pool an active watch covers, including an all-markets scope's through its linger. */
  private activePools(): Set<string> {
    const pools = new Set(this.poolRefs.keys());
    if (this.allRefs > 0 || this.lingers.has("all")) for (const p of this.allPools) pools.add(p);
    for (const p of this.pendingPools) pools.add(p);
    return pools;
  }

  /**
   *  Every log source an active watch covers: the pools, the plane's two singletons, and
   *  the discovery sources.
   *
   *  A source guard built from pools alone is EMPTY for a plane-only or discovery-only
   *  session, so the recovery it guards returns having healed nothing and the watch goes
   *  quiet with no error — the same pool-counting assumption {@link hasActiveScopes}
   *  exists to avoid. For discovery that silence is a MarketCreated missed for good.
   */
  private activeSources(): Set<string> {
    const sources = this.activePools();
    for (const address of this.planeSources) sources.add(address);
    for (const address of this.discoverySources) sources.add(address);
    return sources;
  }

  // ------------------------------------------------------------------
  // Watches
  // ------------------------------------------------------------------

  /** Watch one market: hydrate its snapshot and stream its events. */
  async watchMarket(pool: string, opts?: SeedOptions): Promise<WatchHandle> {
    const generation = this.generation;
    const key = pool.toLowerCase();
    this.acquire(this.poolRefs, key, `pool:${key}`);
    try {
      // Already streamed via the all-markets watch or a prior watch → no work.
      if (!this.hydratedPools.has(key)) {
        await this.ensureHydration(`pool:${key}`, () => this.hydratePools([key], opts));
      }
    } catch (e) {
      if (generation !== this.generation) throw e;
      this.releaseNow(this.poolRefs, key);
      this.ensureSubscriptions();
      throw e;
    }
    if (generation !== this.generation) return { stop: () => {} };
    return this.handle(() => this.release(this.poolRefs, key, `pool:${key}`, () => this.teardownPool(key)));
  }

  /**
   *  Watch every eligible market (see `Snapshot.loadMarketsSnapshot`); `discover`
   *  also watches the MarketCreator factory + the BinaryMarketsModule so markets
   *  created later join live (module-created markets emit only the module's
   *  MarketCreated).
   */
  async watchAllMarkets(discover: boolean): Promise<WatchHandle> {
    const generation = this.generation;
    this.cancelLinger("all");
    this.discoverLingering = false;
    this.allRefs++;
    if (discover) this.discoverRefs++;
    try {
      if (!this.hydratedAll) await this.ensureHydration("all", () => this.withTransportWarmup(() => this.hydrateAll()));
      if (generation !== this.generation) return { stop: () => {} };
      this.ensureSubscriptions();
    } catch (e) {
      if (generation !== this.generation) throw e;
      this.allRefs--;
      if (discover) this.discoverRefs--;
      if (this.allRefs === 0) this.teardownAll();
      else this.ensureSubscriptions();
      throw e;
    }
    return this.handle(() => {
      if (discover) this.discoverRefs--;
      this.allRefs--;
      if (this.allRefs > 0) this.ensureSubscriptions();
      else {
        // The last holder: its discovery sources are still subscribed only if it held them.
        this.discoverLingering = discover;
        this.linger("all", () => this.teardownAll());
      }
    });
  }

  /**
   *  Hydrate one account's past orders + fills (indexer, once). Live events
   *  are attributed to every account on watched markets regardless — this only
   *  supplies history, and only stays current within watched markets.
   */
  async watchUser(user: string): Promise<WatchHandle> {
    const generation = this.generation;
    const key = user.toLowerCase();
    this.acquire(this.userRefs, key, `user:${key}`);
    try {
      if (!this.hydratedUsers.has(key)) {
        await this.ensureHydration(`user:${key}`, async () => {
          const indexerUrl = requireIndexerUrl(this.deps.getConfig());
          // The owner's check that its indexer serves this chain runs alongside the
          // snapshot request. The loader merges nothing until it passes.
          const binding = this.deps.verifyBinding?.();
          await Snapshot.loadUserSnapshot(this.chainId, key, {
            indexerUrl,
            binding,
            governor: this.deps.governor,
            store: this.deps.store,
            isCurrent: () => generation === this.generation,
          });
          if (generation !== this.generation) return;
          this.hydratedUsers.add(key);
          this.deps.store.commit();
        });
      }
    } catch (e) {
      if (generation !== this.generation) throw e;
      this.releaseNow(this.userRefs, key);
      if (!this.userRefs.has(key)) this.deps.store.unpinUserHistory(key);
      throw e;
    }
    if (generation !== this.generation) return { stop: () => {} };
    // No subscription of its own — nothing to tear down beyond the refcount.
    return this.handle(() =>
      this.release(this.userRefs, key, `user:${key}`, () => {
        this.userRefs.delete(key);
        this.hydratedUsers.delete(key);
        this.deps.store.unpinUserHistory(key);
        this.deps.store.commit();
      }),
    );
  }

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
  async watchPerpMarkets(opts?: WatchPerpMarketsOptions): Promise<WatchHandle> {
    const generation = this.generation;
    // Caller input, so it is validated before any network work: a malformed hint would
    // otherwise reach `readContract` and come back misreported as an RPC failure, and an
    // empty string would read as "this deployment has no plane" and resolve empty.
    const hint = opts?.marginBank === undefined ? undefined : addressOf(opts.marginBank);
    this.cancelLinger("perpPlane");
    this.planeRefs++;
    try {
      // TWO passes at most, because a hint can go unseen on the first.
      //
      // `ensureHydration` SHARES an in-flight hydration, so a call that arrives while a
      // hint-less one is running never runs its own callback and its hint is never read —
      // the ordinary React case, where a read hook acquires the plane before the watch
      // hook that carries the bank. The second pass is where that is discovered: a
      // hydrated plane, no sources, resolved from some other bank, with a hint in hand.
      for (let pass = 0; pass < 2; pass++) {
        if (this.planeHintUnused(hint)) {
          // Wire the snapshot already taken — its rows and seam stand — rather than fetch
          // it again: the plane's one-indexer-request contract holds across a late hint.
          await this.ensureHydration("perpPlane", () =>
            this.withTransportWarmup(() => this.wirePerpPlane(generation, hint ?? null)),
          );
          if (generation !== this.generation) break;
          continue;
        }
        if (this.planeHydrated) {
          this.ensureSubscriptions();
          break;
        }
        await this.ensureHydration("perpPlane", () =>
          this.withTransportWarmup(() => this.hydratePerpPlane(generation, hint)),
        );
        if (generation !== this.generation) break;
      }
    } catch (e) {
      if (generation !== this.generation) throw e;
      this.planeRefs--;
      // The snapshot can have merged rows before the wiring read failed. A released plane
      // that still answers `listLiveLiquidations` contradicts the accessors' documented
      // empty-without-a-watch contract, so the last reference out takes the rows with it.
      if (this.planeRefs === 0) this.teardownPerpPlane();
      else {
        // Holders remain, and this failure came from wiring a late hint onto their
        // source-less plane (`wirePerpPlane` has already put its state back). Nothing is
        // left in flight to finish, so settle the scope back to what they held rather than
        // leaving it reporting "hydrating" for a hydration that no longer exists.
        if (this.planeAddrs.length === 0) this.planeHydrated = true;
        this.ensureSubscriptions();
        this.deps.store.commit();
      }
      throw e;
    }
    // Disposed while hydrating: the scope belongs to a generation that no longer exists,
    // so the handle releases nothing rather than decrementing the new one's refcount.
    if (generation !== this.generation) return { stop: () => {} };
    return this.handle(() => {
      this.planeRefs--;
      if (this.planeRefs > 0) return;
      this.linger("perpPlane", () => this.teardownPerpPlane());
    });
  }

  /**
   *  Perp-plane watch state. Shares {@link WatchStatus} with the per-market one, so a UI
   *  renders both with the same three-way branch.
   */
  getPerpPlaneStatus(): WatchStatus {
    if (!this.planeActive) return "unwatched";
    if (this.planePending) return "hydrating";
    // A deployment with no plane sources — no perp market indexed, or a MarginBank
    // reporting an unwired LiquidationEngine — has nothing to subscribe to, so the
    // tail's socket flag never flips. The scope is hydrated and its empty answer IS
    // current, and "hydrating" would spin a caller waiting for something that is
    // never coming.
    if (this.planeHydrated && this.planeAddrs.length === 0) return "live";
    return this.live ? "live" : "hydrating";
  }

  /**
   *  Whether a supplied hint still has work to do: the plane is hydrated and found NO
   *  bank at all, which is the one case the option exists for.
   *
   *  Narrow on purpose. A plane that named a bank keeps it — the hint never overrides the
   *  indexer, because the hydrated rows are that bank's and streaming another one would
   *  splice two venues — and a streaming plane is never re-resolved, because that would
   *  move every holder's feed and strand them if the replacement's wiring read failed.
   */
  private planeHintUnused(hint: string | undefined): boolean {
    return hint !== undefined && this.planeHydrated && this.planeAddrs.length === 0 && this.planeBank === null;
  }

  /** Per-market watch state (see {@link WatchStatus}). */
  getWatchStatus(pool: string): WatchStatus {
    const key = pool.toLowerCase();
    if (this.pendingPools.has(key)) return "hydrating";
    const covered = this.poolRefs.has(key) || (this.allRefs > 0 && this.allPools.has(key));
    if (!covered) return "unwatched";
    return this.live ? "live" : "hydrating";
  }

  /**
   *  Tear down everything: all watches, subscriptions, timers. The store keeps
   *  its last state (reads keep answering, stale).
   */
  stopLive(): void {
    this.generation++;
    this.subscriptionGeneration++;
    // A queued drain from the old generation never runs, so it must not collect new deliveries.
    this.pendingDeliveries = [];
    this.pendingDrain = null;
    this.coverage.clear();
    this.closedThrough.clear();
    this.sourceGeneration.clear();
    this.processed.clear();
    this.processedFloor = -1;
    this.blockTs.clear();
    this.deps.store.clearUserHistoryPins();
    this.deps.store.bookBlocks.clear();
    // With it, for the same reason: both describe a watch that no longer
    // exists. Leaving the seed status behind would contradict its own
    // contract, where `null` means "no hydrated watch".
    this.deps.store.seedStatusByPool.clear();
    this.reconciliationPending = false;
    this.reconnecting = false;
    this.probingHeads = false;
    for (const t of this.lingers.values()) clearTimeout(t);
    this.lingers.clear();
    this.poolRefs.clear();
    this.userRefs.clear();
    this.allRefs = this.discoverRefs = 0;
    this.discoverLingering = false;
    this.allPools.clear();
    this.hydratedAll = false;
    this.hydratedPools.clear();
    this.hydratedUsers.clear();
    this.pendingPools.clear();
    this.planeRefs = 0;
    this.planeAddrs = [];
    this.planeBank = null;
    this.planeSeam = null;
    this.planeHydrated = false;
    this.planePending = false;
    this.hydrations.clear();
    this.warmupRefs = 0;
    this.warmupFailure = null;
    this.unwatchHeads?.();
    this.unwatchLogs?.();
    this.unwatchHeads = this.unwatchLogs = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    // The watchdog's other stop path is ensureSubscriptions() emptying the
    // watch set, which stopLive() does not go through — so it has to be
    // stopped here too, or its 15s interval outlives dispose (SDK-OWN-004).
    this.stopHeadsWatchdog();
    // Drop the memoized client so a watch started after this dispose asks the
    // owner for a fresh one. Keeping it would pin the connection the owner is
    // releasing, and reads on it would reopen a socket nothing accounts for.
    this.client = null;
    this.live = false;
    this.watchAddresses = [];
    this.watchSet.clear();
    this.inbox.clear();
    this.deps.store.setStatus({
      mode: "init",
      wsConnected: false,
      watchCount: 0,
      failure: null,
      allMarketsTruncated: false,
    });
  }

  // ---- refcount plumbing ----

  private acquire(refs: Map<string, number>, key: string, lingerKey: string): void {
    this.cancelLinger(lingerKey);
    refs.set(key, (refs.get(key) ?? 0) + 1);
  }

  private release(refs: Map<string, number>, key: string, lingerKey: string, teardown: () => void): void {
    const count = (refs.get(key) ?? 0) - 1;
    if (count > 0) {
      refs.set(key, count);
      return;
    }
    refs.set(key, 0);
    this.linger(lingerKey, teardown);
  }

  private releaseNow(refs: Map<string, number>, key: string): void {
    const count = (refs.get(key) ?? 0) - 1;
    if (count > 0) refs.set(key, count);
    else refs.delete(key);
  }

  private handle(stop: () => void): WatchHandle {
    let stopped = false;
    const generation = this.generation;
    return {
      stop: () => {
        if (stopped || generation !== this.generation) return;
        stopped = true;
        stop();
      },
    };
  }

  private linger(key: string, teardown: () => void): void {
    this.cancelLinger(key);
    this.lingers.set(
      key,
      setTimeout(() => {
        this.lingers.delete(key);
        teardown();
      }, RELEASE_LINGER_MS),
    );
  }

  private cancelLinger(key: string): void {
    const t = this.lingers.get(key);
    if (t) {
      clearTimeout(t);
      this.lingers.delete(key);
    }
  }

  private teardownPool(key: string): void {
    this.poolRefs.delete(key);
    this.hydrations.delete(`pool:${key}`);
    // Keep the market row (metadata, bounded by the store's cold-market
    // allowance); drop the heavy rows unless the
    // all-markets watch still covers this pool.
    if (!(this.allRefs > 0 && this.allPools.has(key))) {
      this.deps.store.purgePool(key);
      this.hydratedPools.delete(key);
      for (const address of this.addressesFor(new Set([key]))) {
        this.coverage.delete(address);
        this.closedThrough.delete(address);
      }
    }
    this.ensureSubscriptions();
    this.deps.store.commit();
  }

  private teardownAll(): void {
    this.hydrations.delete("all");
    this.discoverLingering = false;
    for (const p of this.allPools) {
      if (!this.poolRefs.has(p)) {
        this.deps.store.purgePool(p);
        this.hydratedPools.delete(p);
      }
    }
    this.allPools.clear();
    this.hydratedAll = false;
    this.deps.store.patchStatus({ allMarketsTruncated: false });
    this.ensureSubscriptions();
    this.deps.store.commit();
  }

  private teardownPerpPlane(): void {
    this.hydrations.delete("perpPlane");
    this.planeHydrated = false;
    this.planeAddrs = [];
    this.planeBank = null;
    this.planeSeam = null;
    this.deps.store.purgePerpPlane();
    this.ensureSubscriptions();
    this.deps.store.commit();
  }

  private async ensureHydration(key: string, run: () => Promise<void>): Promise<void> {
    const inFlight = this.hydrations.get(key);
    if (inFlight) return inFlight;
    const p = this.deps.dbg
      .span(`liveTail.hydrate:${key}`, () => run())
      .finally(() => {
        if (this.hydrations.get(key) === p) this.hydrations.delete(key);
      });
    this.hydrations.set(key, p);
    return p;
  }

  /** Open the owner's transport without guessing log addresses or sealing a source seam. */
  private async withTransportWarmup(run: () => Promise<void>): Promise<void> {
    const generation = this.generation;
    this.warmupRefs++;
    try {
      // The bound head subscriber starts connection establishment immediately.
      // Concurrent hydrations share this stream; source subscriptions still wait
      // for the snapshot to name their addresses.
      this.unwatchHeads ??= this.subscribeHeads();
      await run();
    } finally {
      if (generation === this.generation) {
        this.warmupRefs--;
        // Real sources take over the stream; an empty or failed snapshot releases it.
        this.ensureSubscriptions();
        // A source-less retry cannot backfill future sources. If the snapshot
        // arrived before a healthy head, heal those sources through the normal seam.
        if (
          this.warmupFailure &&
          this.deps.store.status.failure === this.warmupFailure &&
          this.watchAddresses.length > 0
        )
          this.scheduleReconnect();
      }
    }
  }

  // ------------------------------------------------------------------
  // Scope hydration — the seam
  // ------------------------------------------------------------------

  private async hydratePools(pools: string[], seed?: SeedOptions): Promise<void> {
    const generation = this.generation;
    for (const p of pools) this.pendingPools.add(p);
    try {
      // Subscribe FIRST so the scope's logs buffer across the seam.
      this.ensureSubscriptions();
      if (seed?.seed === "chain") {
        await this.hydratePoolsFromChain(pools, seed.marketId, seed, generation);
        if (generation !== this.generation) return;
        for (const p of pools) this.hydratedPools.add(p);
        return;
      }
      const indexerUrl = requireIndexerUrl(this.deps.getConfig());
      // The owner's check that its indexer serves this chain runs alongside the
      // snapshot request. The loader merges nothing until it passes.
      const binding = this.deps.verifyBinding?.();
      const res = await Snapshot.loadMarketsSnapshot(this.chainId, pools, {
        indexerUrl,
        binding,
        governor: this.deps.governor,
        store: this.deps.store,
        isCurrent: () => generation === this.generation,
      });
      if (generation !== this.generation) return;
      // The snapshot revealed BinaryMarket addresses — widen the subscription.
      this.ensureSubscriptions();
      await this.sealSeam(res.snapshotBlock, res.reportedHeadBlock, pools);
      if (generation !== this.generation) return;
      this.deps.store.setStatus({
        seedSource: "indexer",
        seedBlock: res.snapshotBlock,
        seedTruncated: false,
        fillsLoaded: true,
      });
      // Per pool, so a later seed on ANOTHER pool cannot overwrite what this
      // one did. The global fields above stay as "latest seed" and are
      // documented that way.
      for (const p of pools) {
        this.deps.store.seedStatusByPool.set(p, {
          seedSource: "indexer",
          seedBlock: res.snapshotBlock,
          seedTruncated: false,
          // The indexer snapshot carries this scope's fills with it.
          fillsLoaded: true,
        });
      }
      for (const p of pools) this.hydratedPools.add(p);
    } finally {
      if (generation === this.generation) for (const p of pools) this.pendingPools.delete(p);
    }
    this.markLive();
  }

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
  private async hydratePoolsFromChain(
    pools: string[],
    marketId: string,
    opts: SeedOptions,
    generation: number,
  ): Promise<void> {
    // ONE pool per chain seed. `SeedOptions` carries a single `marketId`, and a
    // pool→market binding is 1:1 at any instant — seeding a second pool here
    // would bind it to another pool's market. `watchMarket` is the only caller
    // and always passes one pool; this makes that a constraint rather than a
    // comment. Multi-pool chain seeding needs a per-pool marketId first.
    const pool = pools[0];
    if (pools.length !== 1 || pool === undefined) {
      throw new InvalidInputError(`a chain seed covers exactly one pool — got ${pools.length}`);
    }
    // Lowercase once, here: the indexer stores ids lowercased and
    // `bookLevelsByMarket` looks the binding up that way, so a caller passing a
    // checksummed id must land on the same key the snapshot would have written.
    const id = marketId.toLowerCase();
    const client = this.deps.getClient();
    // The market ROW, not just the binding. `reducer.ts` resolves every order,
    // fill and lifecycle event through `marketByPool` → the row, and drops the
    // event when it is missing — so a seed that binds without a row seals the
    // seam over a book that can never advance. The module answers every field
    // the reducer consumes; the indexer-only prose (question text, oracle
    // metadata, creation history) stays null, exactly as a market discovered by
    // the live tail does (see `reducer.ts` onMarketCreated).
    const addresses = this.deps.getConfig().addresses;
    if (!addresses?.binaryModule) {
      throw new NotConfiguredError("addresses.binaryModule", "a chain-seeded watch");
    }
    const [onchain, drained] = await Promise.all([
      Markets.getMarketOnchain(
        id as Hex,
        {
          module: addresses.binaryModule,
          settlement: addresses.binarySettlement,
        },
        client,
      ),
      Orders.drainOpenOrdersOnchain(pool as Address, client, {
        maxCount: opts.maxCount,
        maxPages: opts.maxPages,
      }),
    ]);
    if (generation !== this.generation) return;

    // The supplied binding must be the pool's CURRENT one. Book reads filter on
    // `marketId`, so a wrong id paints a book that can never advance, silently.
    //
    // Two ways to be wrong, and the pool comparison alone catches only the
    // first. A pool address is STABLE across recycles — only `marketNonce`
    // moves — so a PREVIOUS market of this same pool still names it, and a
    // stale id would pass a pool check while tagging the new market's orders
    // with the old market. The nonce is what separates the generations; this is
    // the module's own staleness test (`_requireCurrentPoolGeneration`).
    const poolNonce = await client.readContract({
      address: pool as Address,
      abi: ReadsAbi.binaryPoolReadAbi,
      functionName: "marketNonce",
      blockNumber: drained.blockNumber,
    });
    if (onchain.pool.toLowerCase() !== pool.toLowerCase()) {
      throw new InvalidInputError(
        `marketId ${marketId} belongs to pool ${onchain.pool}, not ${pool} — ` +
          "read the pool's current binding with getPoolMarketBinding(pool) instead of supplying one from another source",
      );
    }
    if (BigInt(onchain.nonce) !== BigInt(poolNonce)) {
      throw new InvalidInputError(
        `marketId ${marketId} is generation ${onchain.nonce} of pool ${pool}, which is now at ${poolNonce} — ` +
          "the pool was recycled onto a later market; read the current binding with getPoolMarketBinding(pool)",
      );
    }

    const pin = drained.blockNumber;
    const pinNumber = Number(pin);
    const truncated = drained.truncated;

    // Through mergeSnapshot — the SAME path the indexer snapshot writes. The
    // reducer owns event transitions and is mirrored by the indexer handler
    // (SDK-GEN-004); a seed is a snapshot, not an event stream.
    this.deps.store.mergeSnapshot({
      snapshotBlock: pinNumber,
      // Stamped like the indexer snapshot's market rows, so a seeded row names its chain too.
      markets: [
        mergeSeedOverExisting(
          Markets.withChain(this.chainId, seededMarket(id, pool, onchain)),
          this.deps.store.markets.get(id),
        ),
      ],
      fills: [],
      orders: [...drained.bids, ...drained.asks].map((o) => toSeededOrder(o, pool, id, this.chainId)),
    });
    this.deps.store.bookBlocks.set(pool, drained.blockNumber);

    // The seeded row revealed the BinaryMarket address — widen the subscription,
    // exactly as the indexer path does after its snapshot. `watchAddresses` is
    // what `recoverSources` iterates, so without this the market contract's
    // StatusChanged / Resolved / Voided events are dropped until some unrelated
    // watch happens to recompute the set.
    this.ensureSubscriptions();

    await this.sealSeam(pinNumber, pinNumber, pools);
    if (generation !== this.generation) return;
    this.deps.store.setStatus({
      seedSource: "chain",
      seedBlock: pinNumber,
      seedTruncated: truncated,
      // The chain seed loads no fill history. Only the detached lane below can
      // set this true, and only if it succeeds.
      fillsLoaded: false,
    });
    // This pool's OWN truncation, which another pool's later seed must not
    // erase. `seedTruncated` exists so a short book is never silent, and on the
    // global field it was silent again as soon as a second pool was watched.
    this.deps.store.seedStatusByPool.set(pool, {
      seedSource: "chain",
      seedBlock: pinNumber,
      seedTruncated: truncated,
      fillsLoaded: false,
    });
    this.deps.store.commit();
    this.markLive();
    this.loadFillHistory(pools, generation);
  }

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
  private loadFillHistory(pools: string[], generation: number): void {
    const isCurrent = (): boolean => {
      if (generation !== this.generation) return false;
      const active = this.activePools();
      return pools.some((pool) => active.has(pool));
    };
    const indexerUrl = requireIndexerUrl(this.deps.getConfig());
    const load = async (): Promise<void> => {
      // The owner's check that its indexer serves this chain runs alongside the
      // snapshot request. The loader merges nothing until it passes.
      const binding = this.deps.verifyBinding?.();
      await Snapshot.loadPoolFills(pools, {
        indexerUrl,
        binding,
        governor: this.deps.governor,
        store: this.deps.store,
        isCurrent,
      });
    };
    void load().then(
      () => {
        if (!isCurrent()) return;
        this.deps.store.setStatus({ fillsLoaded: true });
        // Only the pools THIS lane loaded. The global flag turns true when any
        // lane lands, so on the global field a failed lane for pool A read as
        // loaded as soon as pool B's lane succeeded — and A's empty tape then
        // read as "no trades" rather than "never loaded".
        for (const pool of pools) {
          const prev = this.deps.store.seedStatusByPool.get(pool);
          if (prev) this.deps.store.seedStatusByPool.set(pool, { ...prev, fillsLoaded: true });
        }
        this.deps.store.commit();
      },
      (error: unknown) => {
        if (!isCurrent()) return;
        this.deps.store.setStatus({
          failure: { operation: "fill-history", error: Snapshot.toIndexerFailure(error) },
        });
        this.deps.store.commit();
      },
    );
  }

  private async hydrateAll(): Promise<void> {
    const generation = this.generation;
    const indexerUrl = requireIndexerUrl(this.deps.getConfig());
    // The owner's check that its indexer serves this chain runs alongside the
    // snapshot request. The loader merges nothing until it passes.
    const binding = this.deps.verifyBinding?.();
    const res = await Snapshot.loadMarketsSnapshot(this.chainId, "all", {
      indexerUrl,
      binding,
      governor: this.deps.governor,
      store: this.deps.store,
      isCurrent: () => generation === this.generation,
      includePool: (pool) => !this.poolRefs.has(pool) && !this.hydratedPools.has(pool),
    });
    if (generation !== this.generation) return;
    // Existing scoped watches retain their seed and cursor. A later all-market
    // snapshot must not overwrite them or advance them past an unverified range.
    const freshPools = res.pools.filter((pool) => !this.poolRefs.has(pool) && !this.hydratedPools.has(pool));
    for (const pool of res.pools) this.allPools.add(pool);
    for (const pool of freshPools) this.pendingPools.add(pool);
    try {
      this.ensureSubscriptions();
      await this.sealSeam(res.snapshotBlock, res.reportedHeadBlock, freshPools);
      await Promise.all(res.pools.map((pool) => this.hydrations.get(`pool:${pool}`)));
      if (generation !== this.generation) return;
      // The all-markets watch is always indexer-seeded: there is no pool list
      // to drain from chain until the indexer has named the markets.
      // `allMarketsTruncated` carries the snapshot's market budget: when more
      // eligible markets exist than it hydrated, the watch says so rather
      // than reading as complete. Only this scope writes it, so a later pool
      // seed cannot erase it.
      this.deps.store.setStatus({
        seedSource: "indexer",
        seedBlock: res.snapshotBlock,
        seedTruncated: false,
        allMarketsTruncated: res.truncated,
        fillsLoaded: true,
      });
      // Per pool too, for the pools this snapshot actually seeded. Without
      // this, `getSeedStatus` answered `null` for every pool after a
      // discover-all watch, and `null` means "not hydrated" — the opposite of
      // what had happened. An already-scoped pool keeps its OWN seed: the
      // snapshot deliberately does not re-seed it.
      for (const pool of freshPools) {
        this.deps.store.seedStatusByPool.set(pool, {
          seedSource: "indexer",
          seedBlock: res.snapshotBlock,
          seedTruncated: false,
          fillsLoaded: true,
        });
      }
      for (const p of res.pools) this.hydratedPools.add(p);
      this.hydratedAll = true;
    } finally {
      if (generation === this.generation) for (const p of freshPools) this.pendingPools.delete(p);
    }
    this.markLive();
  }

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
  private async hydratePerpPlane(generation: number, marginBankHint?: string): Promise<void> {
    // Published now, not after the snapshot: the status is derived from tail fields, so a
    // `useSyncExternalStore` reader sees "hydrating" only through a commit.
    this.planePending = true;
    this.deps.store.commit();
    let res: Snapshot.PerpPlaneSnapshotResult;
    try {
      const indexerUrl = requireIndexerUrl(this.deps.getConfig());
      // The owner's check that its indexer serves this chain runs alongside the
      // snapshot request. The loader merges nothing until it passes.
      const binding = this.deps.verifyBinding?.();
      res = await Snapshot.loadPerpPlaneSnapshot(this.chainId, {
        indexerUrl,
        binding,
        store: this.deps.store,
        isCurrent: () => generation === this.generation,
      });
    } catch (error) {
      // The caller's release path commits. On success the seam stays open into the wiring.
      if (generation === this.generation) this.planePending = false;
      throw error;
    }
    if (generation !== this.generation) return;
    this.deps.store.commit();
    this.planeSeam = { snapshotBlock: res.snapshotBlock, reportedHeadBlock: res.reportedHeadBlock };
    // The INDEXED bank wins over the hint, not the other way round. The hydrated rows are
    // the indexer's plane and carry no bank of their own, so streaming another bank's
    // engine would splice two venues into one feed. The hint is the documented fallback
    // for a venue the indexer cannot name, and only that.
    await this.wirePerpPlane(generation, res.marginBank ?? marginBankHint ?? null);
  }

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
  private async wirePerpPlane(generation: number, bank: string | null): Promise<void> {
    const seam = this.planeSeam;
    if (!seam) throw new InvalidInputError("perp plane wired before its snapshot");
    this.planePending = true;
    this.planeHydrated = false;
    // A late hint turns a published source-less "live" plane back to "hydrating".
    this.deps.store.commit();
    try {
      const addrs = await this.resolvePlaneSources(bank);
      if (generation !== this.generation) return;
      this.planeBank = bank;
      this.planeAddrs = addrs;
      // No sources means no perp plane on this deployment (or a bank that reports no
      // engine). The scope stays registered and empty rather than throwing: the hydrated
      // rows, if any, are still readable, and the caller's handle still releases.
      if (addrs.length === 0) {
        this.deps.dbg.log("liveTail", "perp plane has no log sources", { marginBank: bank });
        this.planeHydrated = true;
        this.planePending = false;
        // Publish the scope even with nothing to subscribe to: `watchCount` counts the
        // plane as one, and a plane-only session reporting zero reads as an idle tail.
        // NOT `markLive()` — no socket is held, so "tailing" would be a claim too far.
        // The explicit commit publishes the settled status: `setStatus` is silent when
        // `watchCount` did not change.
        this.ensureSubscriptions();
        this.deps.store.commit();
        return;
      }

      this.ensureSubscriptions();
      const observedHead = await this.readChainHead();
      if (generation !== this.generation) return;
      await this.sealSeam(seam.snapshotBlock, seam.reportedHeadBlock, [], { addrs, observedHead });
      if (generation !== this.generation) return;
      this.planeHydrated = true;
    } catch (error) {
      if (generation === this.generation) {
        this.planeAddrs = [];
        this.planeBank = null;
        this.ensureSubscriptions();
      }
      throw error;
    } finally {
      if (generation === this.generation) this.planePending = false;
    }
    this.markLive();
  }

  /**
   *  The chain head over the request path, as one of OUR errors.
   *
   *  The decorated client's typed boundary covers `readContract` and `call` only, so a
   *  transport failure here would otherwise reject an awaited watch with a raw viem error
   *  its published union does not name.
   */
  private async readChainHead(): Promise<number> {
    const client = (this.client ??= this.deps.getClient());
    try {
      return exactBlock(await client.getBlockNumber());
    } catch (error) {
      throw tailError(error, "chain head read");
    }
  }

  /**
   *  The plane's two log sources: the MarginBank, and the LiquidationEngine it reports.
   *
   *  The engine comes from `MarginBank.getSystemConfig()` rather than from config, because
   *  that is the deployment's own view of its wiring and cannot drift from a rotation the
   *  way a constant can.
   */
  private async resolvePlaneSources(marginBank: string | null | undefined): Promise<readonly string[]> {
    if (!marginBank) return [];
    const bank = marginBank.toLowerCase();
    // Deliberately UNGUARDED. If this read fails the liquidation half cannot be watched,
    // and watching the bank alone would stream funding settlements and no liquidations —
    // indistinguishable from a venue with none. So the error propagates: the caller's
    // `watchPerpMarkets()` rejects and releases its reference.
    const client = (this.client ??= this.deps.getClient());
    const cfg = await client.readContract({
      address: bank as `0x${string}`,
      abi: ReadsAbi.marginBankReadAbi,
      functionName: "getSystemConfig",
    });
    const engine = cfg.liquidationEngine.toLowerCase();
    // A bank that reports the zero address is UNWIRED. Treated as no plane rather than as
    // an address, because watching address(0) matches nothing while looking healthy.
    if (/^0x0+$/.test(engine)) return [];
    return [bank, engine];
  }

  /**
   *  Backfill [snapshot+1, head] for the scope, then replay its buffered logs.
   *
   *  `scope.addrs` names the log sources directly, for a scope whose sources are not
   *  pools — the perp plane's two singletons — so no book block is stamped for them.
   *  `scope.observedHead` is a head read over RPC after the subscription armed: on a
   *  plane-only session the heads stream has reported nothing yet, and its silence would
   *  otherwise cap the backfill below the real chain head.
   */
  private async sealSeam(
    snapshotBlock: number,
    indexerHead: number,
    pools: string[],
    scope: { addrs?: readonly string[]; observedHead?: number } = {},
  ): Promise<void> {
    const generation = this.generation;
    await this.enqueueApply(async () => {
      let head = Math.max(indexerHead, this.deps.store.status.headBlock, scope.observedHead ?? 0);
      // A loop, not a spread: spreading a large map into Math.max overflows the stack.
      for (const block of this.blockTs.keys()) if (block > head) head = block;
      this.sampledHead = Math.max(this.sampledHead, head);
      const scopeAddrs = scope.addrs ? [...scope.addrs] : this.addressesFor(new Set(pools));
      for (const address of scopeAddrs) {
        if (!this.coverage.has(address)) {
          this.coverage.set(address, snapshotBlock);
          this.closedThrough.set(address, snapshotBlock);
        }
      }
      for (const address of this.watchAddresses) {
        if (!this.coverage.has(address) && !this.pendingPools.has(address) && !this.pendingMarketOf(address)) {
          this.coverage.set(address, snapshotBlock);
          this.closedThrough.set(address, snapshotBlock);
        }
      }
      await this.recoverNow(snapshotBlock + 1, head, scopeAddrs, false);
      if (generation !== this.generation) return;
      for (const pool of pools) this.stampPool(pool, Math.max(head, snapshotBlock));
      this.lastBlock = Math.max(this.lastBlock, head, snapshotBlock);
      await this.replayInboxNow(snapshotBlock, new Set(scopeAddrs));
      this.pruneProcessed();
      this.deps.store.setStatus({ snapshotBlock, lastBlock: this.lastBlock });
    });
  }

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
  private markLive(): void {
    if (!this.deps.store.status.failure) {
      this.live = this.watchAddresses.length > 0;
      this.retryDelay = RECONNECT_BASE_MS;
      this.deps.store.patchStatus({
        mode: this.live ? "tailing" : "init",
        lastBlock: this.lastBlock,
        watchCount: this.scopeCount(),
      });
    }
    this.deps.store.commit();
  }

  /** A scope's watch addresses: its pools + their BinaryMarket contracts. */
  private addressesFor(pools: Set<string>): string[] {
    const addrs = new Set<string>(pools);
    for (const pool of pools) {
      const id = this.deps.store.poolToMarket.get(pool);
      const m = id ? this.deps.store.markets.get(id) : undefined;
      if (m?.marketType === "BINARY") addrs.add(m.marketAddress.toLowerCase());
    }
    return [...addrs];
  }

  // ------------------------------------------------------------------
  // Subscriptions
  // ------------------------------------------------------------------

  /**
   *  Recompute the watch set (active pools ∪ their markets ∪ discovery
   *  sources) and (re)subscribe. No-op if unchanged. Opens the socket on
   *  first use.
   */
  private ensureSubscriptions(): void {
    const pools = this.activePools();
    const addrs = new Set(this.addressesFor(pools));
    for (const src of this.discoverySources) addrs.add(src);
    // Settlement-extraction v2: whenever ANY market is watched, also watch the
    // BinaryMarketsModule (its MarketFinalized / PoolReleased flip the pool→market
    // binding + finalized flag) and the BinarySettlement singleton (its
    // MarketFinalized / Redeemed drive the post-finalize `netBacking`). Either
    // may be absent from the config (pre-v2 envs) — skip then.
    if (pools.size > 0) {
      const a = this.deps.getConfig().addresses;
      if (a?.binaryModule) addrs.add(a.binaryModule.toLowerCase());
      if (a?.binarySettlement) addrs.add(a.binarySettlement.toLowerCase());
    }
    for (const src of this.planeSources) addrs.add(src);
    const next = [...addrs].sort();
    const same = next.length === this.watchAddresses.length && next.every((a, i) => a === this.watchAddresses[i]);
    this.deps.store.setStatus({ watchCount: this.scopeCount() });
    if (next.length === 0 && this.warmupRefs === 0) {
      this.unwatchHeads?.();
      this.unwatchHeads = null;
      this.stopHeadsWatchdog();
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.live = false;
      this.warmupFailure = null;
      this.deps.store.setStatus({ wsConnected: false, failure: null });
    }
    if (next.length === 0 && this.warmupRefs > 0) this.unwatchHeads ??= this.subscribeHeads();
    if (same && (this.unwatchLogs || next.length === 0)) return;

    this.unwatchLogs?.();
    this.unwatchLogs = null;
    for (const address of this.watchSet)
      if (!addrs.has(address)) {
        this.coverage.delete(address);
        this.closedThrough.delete(address);
        this.sourceGeneration.delete(address);
      }
    for (const address of next)
      if (!this.sourceGeneration.has(address)) this.sourceGeneration.set(address, ++this.nextSourceGeneration);
    this.watchAddresses = next;
    this.watchSet = new Set(next);
    this.pruneProcessed();

    if (next.length === 0) return;

    this.client ??= this.deps.getClient();
    // Heads carry the timestamps and the headBlock status.
    this.unwatchHeads ??= this.subscribeHeads();
    this.startHeadsWatchdog();
    const generation = this.generation;
    const subscription = ++this.subscriptionGeneration;
    this.unwatchLogs = this.client.watchEvent({
      address: next as `0x${string}`[],
      onLogs: (logs) => {
        if (generation !== this.generation || subscription !== this.subscriptionGeneration) return;
        void this.onLogs(logs as RawLog[]).catch((error) => {
          if (generation === this.generation) this.onWsError(error, "recovery");
        });
      },
      onError: (error) => {
        if (generation === this.generation && subscription === this.subscriptionGeneration) this.onWsError(error);
      },
    });
  }

  // ---- chain head: timestamp source for logs (which carry none) ----

  private subscribeHeads(): () => void {
    const generation = this.generation;
    return this.deps.subscribeHeads(
      (head) => {
        if (generation === this.generation)
          void this.onHead(head).catch((error) => {
            if (generation === this.generation) this.onWsError(error);
          });
      },
      () => {
        if (generation !== this.generation) return;
        this.onWsError();
        if (this.warmupRefs > 0 && this.watchAddresses.length === 0)
          this.warmupFailure = this.deps.store.status.failure;
      },
    );
  }

  private async onHead(block: ChainHead | undefined): Promise<void> {
    // Deliberately BEFORE the readability check: an unreadable frame is still a
    // frame, so it proves the subscription is alive and must not trip the stall
    // watchdog. Only silence means the stream is dead.
    this.lastHeadAt = Date.now();
    // undefined means `headOfFrame` could not read the frame — skip it; the next
    // head heals the timestamp map.
    if (!block) return;
    const n = exactBlock(block.number);
    const store = this.deps.store;
    if (this.watchAddresses.length === 0 && this.warmupFailure && store.status.failure === this.warmupFailure) {
      // A readable replacement head proves head-only warmup recovered. It does
      // not seal source coverage or erase a later log/reconciliation failure.
      this.warmupFailure = null;
      this.retryDelay = RECONNECT_BASE_MS;
      store.setStatus({ failure: null });
    }
    const status = { wsConnected: true, headBlock: Math.max(n, store.status.headBlock) };
    // Expiry emits no event, so each head is the retention checkpoint for
    // expired Open orders. An eviction changes rows: one commit covers it and
    // the head. Otherwise the head is status only, so unchanged data keeps its
    // references.
    if (store.pruneExpired(block.timestamp)) {
      store.patchStatus(status);
      store.commit();
    } else {
      store.setHeadStatus(status);
    }
    this.blockTs.set(n, Number(block.timestamp));
    this.pruneMaps(n);

    const config = this.deps.getConfig().reconciliation;
    if (
      this.live &&
      config &&
      !this.reconciliationPending &&
      block.number >= this.lastReconciliation + config.blockInterval
    ) {
      this.reconciliationPending = true;
      const generation = this.generation;
      const sources = new Map(
        [...this.activeSources()].map((address) => [address, this.sourceGeneration.get(address)]),
      );
      const isCurrent = this.sourceGuard(sources);
      void this.enqueueApply(() => this.reconcile(n, config.depth, sources))
        .catch((error) => {
          if ([...sources.keys()].some(isCurrent)) this.onWsError(error, "reconciliation");
        })
        .finally(() => {
          if (generation === this.generation) this.reconciliationPending = false;
        });
    }
  }

  // ---- logs: the realtime data path ----

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
  private applyQueue: Promise<void> = Promise.resolve();

  private enqueueApply(run: () => Promise<void>): Promise<void> {
    const generation = this.generation;
    const guarded = async () => {
      if (generation !== this.generation) return;
      try {
        await run();
      } catch (error) {
        throw tailError(error, "apply live logs");
      }
    };
    const next = this.applyQueue.then(guarded, guarded);
    // Keep the chain alive after a rejection; the caller still sees it.
    this.applyQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  /**
   *  Deliveries that arrived while the apply queue was busy, and the one queue
   *  item that applies them. Each drain makes one gap check for all its blocks,
   *  so the tail stays about one `getLogs` round trip behind the head. One check
   *  per delivered block falls further behind every second on busy pools.
   */
  private pendingDeliveries: RawLog[] = [];
  private pendingDrain: Promise<void> | null = null;

  private async onLogs(logs: RawLog[]): Promise<void> {
    this.pendingDeliveries.push(...logs);
    if (this.pendingDrain) return this.pendingDrain;
    const drain = this.enqueueApply(() => {
      const deliveries = this.pendingDeliveries;
      this.pendingDeliveries = [];
      this.pendingDrain = null;
      return this.applyDecodedLogs(deliveries);
    });
    this.pendingDrain = drain;
    return drain;
  }

  private async applyDecodedLogs(logs: RawLog[]): Promise<void> {
    const sources = new Map(this.sourceGeneration);
    const applicable: RawLog[] = [];
    for (const l of logs) {
      if (l.blockNumber === null || l.logIndex === null) continue;
      const addr = (l.address as string).toLowerCase();
      // Buffer logs for scopes that are mid-hydration (or while the whole tail
      // is re-sealing after a reconnect); apply the rest immediately.
      if (!this.live || this.pendingPools.has(addr) || this.pendingMarketOf(addr) || this.pendingPlaneLog(addr)) {
        this.inbox.set(evKey(Number(l.blockNumber), l.logIndex), l);
      } else {
        applicable.push(l);
      }
    }
    if (applicable.length === 0) return;
    const generation = this.generation;
    let lastBlock = -1;
    for (const log of applicable) lastBlock = Math.max(lastBlock, exactBlock(log.blockNumber));
    try {
      // One gap check through the newest delivered block covers every block in
      // this drain. The stream can lose one of a block's logs, and a log applied
      // after its block's later logs can leave the book wrong for good.
      await this.recoverSources(lastBlock, applicable);
    } catch (error) {
      if (generation !== this.generation) return;
      if (
        !applicable.some(
          (log) => sources.get(log.address.toLowerCase()) === this.sourceGeneration.get(log.address.toLowerCase()),
        )
      )
        return;
      for (const log of applicable) this.inbox.set(evKey(exactBlock(log.blockNumber), log.logIndex), log);
      this.onWsError(error, "recovery");
    }
  }

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
  private async reduceInOrder(
    events: DecodedEvent[],
    isCurrent: (address: string) => boolean,
    advanceCursors: boolean,
  ): Promise<DecodedEvent[]> {
    await this.warmCollateralDecimals(events, isCurrent);
    const applied: DecodedEvent[] = [];
    let changed = false;
    for (const ev of events) {
      if (!isCurrent(ev.address)) continue;
      if (this.processed.get(ev.blockNumber)?.has(ev.logIndex)) continue;
      if (ev.blockNumber <= (this.closedThrough.get(ev.address.toLowerCase()) ?? -1)) continue;
      if (Reducer.applyEvent(ev, this.deps.store)) changed = true;
      if (this.attributable(ev)) {
        applied.push(ev);
        const indices = this.processed.get(ev.blockNumber) ?? new Set<number>();
        indices.add(ev.logIndex);
        this.processed.set(ev.blockNumber, indices);
        const address = ev.address.toLowerCase();
        // Gap checks set cursors from read evidence. Advancing them here could
        // prune replay ids before the check restores its lower proven cursor.
        if (advanceCursors) {
          this.coverage.set(address, Math.max(this.coverage.get(address) ?? 0, ev.blockNumber - 1));
          this.closedThrough.set(address, Math.max(this.closedThrough.get(address) ?? -1, ev.blockNumber - 1));
        }
        const id = this.deps.store.poolToMarket.get(address) ?? this.deps.store.addressToMarket.get(address);
        let market = id === undefined ? undefined : this.deps.store.markets.get(id);
        // Shared module/settlement sources name the affected scope in their payload.
        if (!market && "marketId" in ev.args && typeof ev.args.marketId === "string") {
          market = this.deps.store.markets.get(ev.args.marketId.toLowerCase());
        }
        if (!market && "pool" in ev.args && typeof ev.args.pool === "string") {
          market = this.deps.store.marketByPool(ev.args.pool) ?? undefined;
        }
        if (market && this.watchedPoolAddress(market.poolAddress.toLowerCase())) {
          this.stampPool(market.poolAddress.toLowerCase(), ev.blockNumber);
        }
        this.lastBlock = Math.max(this.lastBlock, ev.blockNumber);
      }
    }
    // The perp singletons emit high-volume events the reducer has no case for
    // (`PositionUpdated`, `FeeCharged`, collateral flow). A block of only those changes
    // no exposed state, so it must not invalidate every memo and wake every subscriber;
    // its `lastBlock` rides the next commit.
    if (changed) {
      // One commit per applied block, not three. `patchStatus` records the new
      // lastBlock WITHOUT committing, and `prunePerPool` mutates without
      // committing, so the single explicit commit below covers both. Previously
      // setStatus committed, then prunePerPool mutated, then commit() fired
      // again — two invalidations of every select() memo for one block, the
      // first of them for state that the pruning was about to change anyway.
      this.deps.store.patchStatus({ lastBlock: this.lastBlock });
      this.deps.store.prunePerPool();
      this.deps.store.commit();
    }
    this.pruneProcessed();
    return applied;
  }

  /**
   *  Whether the store can attribute `ev` to a market, i.e. whether reducing
   *  it did (or safely could) do anything. Non-pool events — creation,
   *  module/settlement lifecycle — are always attributable: they either build
   *  the market row or address it by id.
   */
  private attributable(ev: DecodedEvent): boolean {
    const addr = ev.address.toLowerCase();
    if (this.deps.store.poolToMarket.has(addr) || this.deps.store.addressToMarket.has(addr)) return true;
    // Not a pool/market log source (factory, module, settlement singleton).
    return !this.watchedPoolAddress(addr);
  }

  /** True when `addr` is (or should be) one of the watched pools. */
  private watchedPoolAddress(addr: string): boolean {
    return this.poolRefs.has(addr) || this.allPools.has(addr) || this.pendingPools.has(addr);
  }

  /** True when `addr` is a plane source and the plane's seam is still open. */
  private pendingPlaneLog(addr: string): boolean {
    return this.planePending && this.planeAddrs.includes(addr);
  }

  /**
   *  True when `addr` is a BinaryMarket contract whose POOL is mid-hydration —
   *  its status events must buffer with the rest of the scope.
   */
  private pendingMarketOf(addr: string): boolean {
    if (this.pendingPools.size === 0) return false;
    const id = this.deps.store.addressToMarket.get(addr);
    const m = id ? this.deps.store.markets.get(id) : undefined;
    return !!m && this.pendingPools.has(m.poolAddress.toLowerCase());
  }

  /**
   *  If a batch created new markets (MarketCreated, discovery mode), grow the
   *  all-markets set + subscriptions and sweep the creation range so any
   *  same-block activity on the new pool isn't lost across the re-subscribe.
   */
  private afterApply(events: DecodedEvent[]): void {
    const created = events.filter((e) => e.eventName === "MarketCreated");
    if (created.length === 0 || this.allRefs === 0) return;
    for (const e of created) {
      const pool = (e.args.pool as string).toLowerCase();
      this.allPools.add(pool);
      // Discovered at creation — every event since block 0 of its life is
      // covered by the stream + the catch-up backfill below.
      this.hydratedPools.add(pool);
      // Per-pool seed status too. This pool never took a SEED: it was born
      // inside the stream, so its book is complete from creation rather than
      // reconstructed. Recording it as an indexer-sourced, untruncated,
      // fills-loaded pool at its creation block says exactly that, and stops
      // `getSeedStatus` answering `null` — which the accessor documents as
      // "no hydrated watch", the opposite of the truth here.
      this.deps.store.seedStatusByPool.set(pool, {
        seedSource: "indexer",
        seedBlock: e.blockNumber,
        seedTruncated: false,
        fillsLoaded: true,
      });
      // Creation materializes an empty book even if the catch-up finds no orders.
      this.stampPool(pool, e.blockNumber);
      if (!this.coverage.has(pool)) {
        this.coverage.set(pool, e.blockNumber - 1);
        this.closedThrough.set(pool, e.blockNumber - 1);
      }
    }
    this.ensureSubscriptions();
    const from = Math.min(...created.map((e) => e.blockNumber));
    const to = Math.max(this.lastBlock, this.deps.store.status.headBlock, from);
    const sources = this.addressesFor(new Set(created.map((event) => event.args.pool.toLowerCase())));
    const generation = this.generation;
    void this.backfill(from, to, sources).catch((error) => {
      if (generation === this.generation) this.onWsError(error, "recovery");
    });
  }

  // ------------------------------------------------------------------
  // Backfill + replay
  // ------------------------------------------------------------------

  /** Fetch + reduce logs for `addresses` in [from, to] (chunked). */
  private async backfill(from: number, to: number, addresses: string[]): Promise<void> {
    return this.enqueueApply(() => this.recoverNow(from, to, addresses, false));
  }

  private stampPool(pool: string, block: number): void {
    const old = this.deps.store.bookBlocks.get(pool);
    if (old === undefined || BigInt(block) > old) this.deps.store.bookBlocks.set(pool, BigInt(block));
  }

  /**
   *  Runs inside the apply queue. Up to `RECOVERY_WINDOW` chunk reads overlap, but the
   *  chunks apply strictly in block order and each applied chunk advances its own
   *  source coverage. A failed chunk stops the recovery: earlier chunks keep their
   *  coverage, later responses are dropped, and the caller's retry starts at the hole.
   */
  private async recoverNow(from: number, to: number, addresses: string[], countHeal = true): Promise<void> {
    if (addresses.length === 0 || to < from) return;
    const generation = this.generation;
    const client = (this.client ??= this.deps.getClient());
    const sources = new Map(addresses.map((address) => [address, this.sourceGeneration.get(address)]));
    const isCurrent = this.sourceGuard(sources);
    let recovered = false;
    const window: { end: number; logs: Promise<RawLog[] | null> }[] = [];
    let next = from;
    while (next <= to || window.length > 0) {
      if (!addresses.some(isCurrent)) return;
      while (window.length < RECOVERY_WINDOW && next <= to) {
        const end = Math.min(next + GETLOGS_CHUNK - 1, to);
        const logs = client
          .getLogs({
            address: addresses.filter(isCurrent).map(addressOf),
            fromBlock: BigInt(next),
            toBlock: BigInt(end),
          })
          .then(
            (logs) => logs,
            (error: unknown) => {
              // A retired source's failure belongs to no current watch.
              if (!addresses.some(isCurrent)) return null;
              throw error;
            },
          );
        // A read abandoned after an earlier failure or a stop must not reject unhandled.
        logs.catch(() => {});
        window.push({ end, logs });
        next = end + 1;
      }
      const chunk = window.shift();
      if (!chunk) return;
      const logs = await chunk.logs;
      if (logs === null || generation !== this.generation) return;
      const raw = logs.filter((log) => log.blockNumber !== null && log.logIndex !== null);
      const applied = await this.applyLogsNow(raw, sources);
      if (generation !== this.generation) return;
      recovered ||= applied.some((event) => isCurrent(event.address));
      for (const address of addresses) {
        if (!this.watchSet.has(address) || sources.get(address) !== this.sourceGeneration.get(address)) continue;
        this.coverage.set(address, Math.max(this.coverage.get(address) ?? -1, chunk.end));
        this.closedThrough.set(address, Math.max(this.closedThrough.get(address) ?? -1, chunk.end));
      }
      this.pruneProcessed();
    }
    if (countHeal && recovered) this.deps.store.setStatus({ healedGaps: this.deps.store.status.healedGaps + 1 });
  }

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
  private async recoverSources(target: number, streamed: readonly RawLog[] = []): Promise<void> {
    const generation = this.generation;
    const sources = new Map(this.sourceGeneration);
    const isCurrent = this.sourceGuard(sources);
    const readFrom = new Map<string, number>();
    for (const address of this.watchAddresses) {
      const cursor = this.coverage.get(address);
      if (cursor === undefined || cursor >= target || this.pendingPools.has(address) || this.pendingMarketOf(address))
        continue;
      readFrom.set(address, cursor + 1);
    }
    const delivered = streamed.filter((log) => exactBlock(log.blockNumber) <= target);
    const deliveredKeys = new Set(delivered.map((log) => evKey(exactBlock(log.blockNumber), log.logIndex)));
    if (readFrom.size === 0) {
      if (delivered.length > 0) await this.applyLogsNow([...delivered], sources);
      return;
    }
    // Delivered logs do not prove a range the node lacks. Reduction leaves these
    // cursors in place, and each read sets them before replay ids are pruned.
    const before = new Map(
      [...readFrom.keys()].map((address) => [
        address,
        [this.coverage.get(address) ?? -1, this.closedThrough.get(address) ?? -1] as const,
      ]),
    );
    const client = (this.client ??= this.deps.getClient());
    const window: { end: number; reads: Promise<{ start: number; addresses: string[]; logs: RawLog[] }[]> }[] = [];
    let next = Math.min(...readFrom.values());
    let previousEnd = -1;
    let complete = target;
    const healed = new Set<number>();
    while (next <= target || window.length > 0) {
      if (![...readFrom.keys()].some(isCurrent)) return;
      while (window.length < RECOVERY_WINDOW && next <= target) {
        const end = Math.min(next + GETLOGS_CHUNK - 1, target);
        const groups = new Map<number, string[]>();
        for (const [address, from] of readFrom) {
          if (from > end || !isCurrent(address)) continue;
          const start = Math.max(next, from);
          groups.set(start, [...(groups.get(start) ?? []), address]);
        }
        const reads = Promise.all(
          [...groups].map(async ([start, addresses]) => {
            const wanted = () => addresses.some(isCurrent);
            try {
              const logs = await this.readLogs(
                client,
                { address: addresses.map(addressOf), fromBlock: BigInt(start), toBlock: BigInt(end) },
                wanted,
              );
              return { start, addresses, logs };
            } catch (error) {
              // A retired source's failure belongs to no current watch.
              if (!wanted()) return { start, addresses: [], logs: [] };
              throw error;
            }
          }),
        );
        // A read abandoned after an earlier failure or a stop must not reject unhandled.
        reads.catch(() => {});
        window.push({ end, reads });
        next = end + 1;
      }
      const chunk = window.shift();
      if (!chunk) return;
      const reads = await chunk.reads;
      if (generation !== this.generation) return;
      const readStart = new Map<string, number>();
      const readHighest = new Map<string, number>();
      const seen = new Set<string>();
      const fetched: RawLog[] = [];
      for (const read of reads) {
        let highest = read.start - 1;
        for (const log of read.logs) {
          const block = log.blockNumber;
          if (block === null || log.logIndex === null) continue;
          const number = exactBlock(block);
          highest = Math.max(highest, number);
          const key = evKey(number, log.logIndex);
          seen.add(key);
          if (!deliveredKeys.has(key)) fetched.push(log);
        }
        for (const address of read.addresses) {
          readStart.set(address, read.start);
          readHighest.set(address, highest);
        }
      }
      const inChunk = delivered.filter((log) => {
        const block = exactBlock(log.blockNumber);
        return block > previousEnd && block <= chunk.end;
      });
      previousEnd = chunk.end;
      for (const log of inChunk) {
        const block = exactBlock(log.blockNumber);
        const address = log.address.toLowerCase();
        const start = readStart.get(address);
        if (start !== undefined && block >= start && !seen.has(evKey(block, log.logIndex)))
          complete = Math.min(complete, readHighest.get(address) ?? start - 1);
      }
      const applied = await this.applyLogsNow([...fetched, ...inChunk], sources, false);
      if (generation !== this.generation) return;
      for (const event of applied) {
        const from = readFrom.get(event.address.toLowerCase());
        if (from === undefined || healed.has(from) || deliveredKeys.has(evKey(event.blockNumber, event.logIndex)))
          continue;
        if (isCurrent(event.address)) healed.add(from);
      }
      for (const [address, from] of readFrom) {
        if (from > chunk.end || !isCurrent(address)) continue;
        const [coverage, closedThrough] = before.get(address) ?? [-1, -1];
        const proved = Math.min(chunk.end, complete);
        this.coverage.set(address, Math.max(coverage, proved));
        this.closedThrough.set(address, Math.max(closedThrough, proved));
      }
      this.pruneProcessed();
    }
    // One heal per group of sources that shared a cursor.
    if (healed.size > 0) this.deps.store.setStatus({ healedGaps: this.deps.store.status.healedGaps + healed.size });
  }

  /**
   *  Reads one gap-check range. Retries up to {@link GETLOGS_RETRIES} times while
   *  the read is still `wanted` and the RPC answered with an error. A timeout or
   *  a closed socket is rethrown at once.
   */
  private async readLogs(
    client: PublicClient,
    params: { address: Address[]; fromBlock: bigint; toBlock: bigint },
    wanted: () => boolean,
  ): Promise<RawLog[]> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await client.getLogs(params);
      } catch (error) {
        if (attempt >= GETLOGS_RETRIES || !wanted() || !isRetryableRead(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, GETLOGS_RETRY_MS * 2 ** attempt));
        if (!wanted()) throw error;
      }
    }
  }

  private async reconcile(
    target: number,
    depth: number,
    sources: ReadonlyMap<string, number | undefined>,
  ): Promise<void> {
    // Keep the diagnostic's original scopes through recovery, header and book reads.
    const pools = [...sources.keys()];
    const isCurrent = this.sourceGuard(sources);
    if (!pools.some(isCurrent)) return;
    await this.recoverSources(target);
    if (!pools.some(isCurrent)) return;
    const client = (this.client ??= this.deps.getClient());
    const block = await client.getBlock({ blockNumber: BigInt(target) });
    if (!pools.some(isCurrent)) return;
    for (const pool of pools) {
      if (!isCurrent(pool) || !this.hydratedPools.has(pool) || this.pendingPools.has(pool)) continue;
      // A queued target older than applied activity cannot describe this local state.
      if ((this.deps.store.bookBlocks.get(pool) ?? 0n) > BigInt(target)) continue;
      const captured = this.deps.store.bookLevels(pool, depth, block.timestamp);
      const local = { bids: captured.bids, asks: captured.asks };
      let read;
      try {
        read = await Orders.getSpotOrderBook(addressOf(pool), { depth, blockNumber: BigInt(target) }, client);
      } catch (error) {
        // A retired pool's error does not belong to other or replacement watches.
        if (!isCurrent(pool)) continue;
        throw error;
      }
      if (!isCurrent(pool)) continue;
      const chain = { bids: read.bids, asks: read.asks };
      const same = (a: Store.BookLevel[], b: Store.BookLevel[]) =>
        a.length === b.length &&
        a.every((level, i) => level.price === b[i]?.price && level.quantity === b[i]?.quantity);
      if (!same(local.bids, chain.bids) || !same(local.asks, chain.asks)) {
        this.deps.store.setStatus({ lastDivergence: { pool, blockNumber: BigInt(target), depth, local, chain } });
      }
    }
    if (!pools.some(isCurrent)) return;
    this.lastReconciliation = BigInt(target);
    this.deps.store.setStatus({ failure: null });
  }

  /**
   *  Replay buffered logs past `after` for `scope` addresses (all, if omitted);
   *  other scopes' buffered logs stay queued.
   */
  private async replayInboxNow(after: number, scope?: Set<string>): Promise<void> {
    const pending: RawLog[] = [];
    for (const [key, l] of this.inbox) {
      const addr = (l.address as string).toLowerCase();
      if (scope && !scope.has(addr)) continue;
      this.inbox.delete(key);
      if (l.blockNumber !== null && Number(l.blockNumber) > after) pending.push(l);
    }
    await this.applyLogsNow(pending);
  }

  /** Bind suspended work to the owner and source lifetimes that started it. */
  private sourceGuard(sources: ReadonlyMap<string, number | undefined>): (address: string) => boolean {
    const generation = this.generation;
    return (address) => {
      const key = address.toLowerCase();
      return (
        generation === this.generation &&
        this.watchSet.has(key) &&
        sources.has(key) &&
        sources.get(key) === this.sourceGeneration.get(key)
      );
    };
  }

  /** Decode and apply inside the existing queue. Callers must never enqueue and
   * await another queue item here: recovery has to finish before later logs. */
  private async applyLogsNow(
    raw: RawLog[],
    sources: ReadonlyMap<string, number | undefined> = new Map(this.sourceGeneration),
    advanceCursors = true,
  ): Promise<DecodedEvent[]> {
    // The source lifetime travels with the batch through every suspended read.
    // A replacement watch can load its snapshot while this queue item is paused.
    const isCurrent = this.sourceGuard(sources);
    raw = raw.filter(
      (log) =>
        isCurrent(log.address) &&
        exactBlock(log.blockNumber) > (this.closedThrough.get(log.address.toLowerCase()) ?? -1),
    );
    if (raw.length === 0) return [];
    // The batch keeps its own timestamps: a head can prune `blockTs` while this batch
    // waits for `getBlock`, and an old block would then decode with the wall clock.
    const timestamps = new Map<number, number>();
    const need = new Map<number, Set<string>>();
    for (const l of raw) {
      if (l.blockNumber === null) continue;
      const bn = Number(l.blockNumber);
      const known = this.blockTs.get(bn);
      if (known === undefined) {
        const addresses = need.get(bn) ?? new Set<string>();
        addresses.add(l.address.toLowerCase());
        need.set(bn, addresses);
      } else timestamps.set(bn, known);
    }
    const client = (this.client ??= this.deps.getClient());
    await forEachBounded([...need], TIMESTAMP_CONCURRENCY, async ([bn, addresses]) => {
      // Each block checks only its own sources, before and after the suspended read.
      // A retired source must not hide a current sibling or publish into a replacement.
      const current = () => {
        for (const address of addresses) if (isCurrent(address)) return true;
        return false;
      };
      if (!current()) return;
      try {
        const b = await client.getBlock({ blockNumber: BigInt(bn), includeTransactions: false });
        if (!current()) return;
        timestamps.set(bn, Number(b.timestamp));
        this.blockTs.set(bn, Number(b.timestamp));
      } catch (error) {
        if (current()) throw error;
      }
    });

    const events = raw
      .filter((log) => isCurrent(log.address))
      .map((l) => this.decode(l, timestamps))
      .filter((e): e is DecodedEvent => e !== null && !this.processed.get(e.blockNumber)?.has(e.logIndex))
      .sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
    const applied = await this.reduceInOrder(events, isCurrent, advanceCursors);
    const current = applied.filter((event) => isCurrent(event.address));
    this.afterApply(current);
    return current;
  }

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
  private async warmCollateralDecimals(events: DecodedEvent[], isCurrent: (address: string) => boolean): Promise<void> {
    const unknown = new Set<Address>();
    for (const e of events) {
      if (e.eventName !== "MarketCreated") continue;
      const collateral = Markets.lower0x(e.args.collateral);
      if (!this.deps.store.collateralDecimals.has(collateral)) unknown.add(collateral);
    }
    if (unknown.size === 0) return;
    const client = (this.client ??= this.deps.getClient());
    await Promise.all(
      [...unknown].map(async (collateral) => {
        // A token without the `decimals()` view is a real answer (the documented
        // fallback, in lockstep with the indexer's `BINARY_DECIMALS`);
        // `cachedErc20Decimals` returns it for that case only and rethrows a
        // transport failure, which must NOT be recorded as this venue's scale
        // (SDK-IO-002). The rejection propagates to the caller's heal path.
        const current = () =>
          events.some(
            (event) =>
              event.eventName === "MarketCreated" &&
              event.args.collateral.toLowerCase() === collateral &&
              isCurrent(event.address),
          );
        try {
          const decimals = await Balances.cachedErc20Decimals(collateral, client, Store.DECIMALS);
          if (current()) this.deps.store.learnCollateralDecimals(collateral, decimals);
        } catch (error) {
          if (current()) throw error;
        }
      }),
    );
  }

  private decode(log: RawLog, timestamps: ReadonlyMap<number, number>): DecodedEvent | null {
    if (log.blockNumber === null || log.logIndex === null) return null;
    // viem already types `log.address` as `Address`; `lower0x` normalizes to the
    // lowercase form the watch set and store keys use WITHOUT widening to `string`.
    const address = Markets.lower0x(log.address);
    if (!this.watchSet.has(address)) return null; // not one of our sources
    // No cast: `liveEventsAbi` is `as const`, so viem returns the discriminated
    // union `DecodedEvent` is built from. Widening it to
    // `{ eventName: string; args: unknown }` here is what used to force `args: any`
    // on the far side and a cast at all ~40 reads in reducer.ts.
    // Cheap membership test BEFORE the decode. Foreign logs — an ERC-20 Transfer from
    // any token touched in the same tx — are the common case here, and letting
    // decodeEventLog reject them costs a full ABI scan plus a thrown-and-swallowed
    // BaseError: 223 µs against this 29-event ABI, versus 0.054 µs for the lookup.
    // The full ABI is still what decodes, so the discriminated union above is intact.
    if (!LogTopics.isKnownTopic0(LIVE_TOPIC0, log.topics as readonly Hex[])) return null;
    let decoded: DecodeEventLogReturnType<typeof EventsAbi.liveEventsAbi>;
    try {
      decoded = decodeEventLog({ abi: EventsAbi.liveEventsAbi, data: log.data, topics: log.topics });
    } catch {
      return null; // topic0 matched but the payload did not — a malformed log
    }
    const bn = exactBlock(log.blockNumber);
    // Spread `decoded` whole rather than copying `eventName` and `args` field by
    // field: listing them separately breaks the correlation between them, and the
    // result no longer matches the discriminated union.
    return {
      ...decoded,
      address,
      blockNumber: bn,
      logIndex: log.logIndex,
      timestampSec: timestamps.get(bn) ?? Math.floor(Date.now() / 1000),
      txHash: (log.transactionHash as string) ?? "",
    };
  }

  // ------------------------------------------------------------------
  // Reconnect — chain-only healing, no indexer
  // ------------------------------------------------------------------

  private onWsError(
    error: unknown = new RpcError("live subscription", "subscription stopped delivering"),
    operation: Store.TailFailure["operation"] = "subscription",
  ): void {
    this.deps.store.setStatus({
      wsConnected: false,
      failure: { operation, error: tailError(error, `live tail ${operation}`) },
    });
    this.live = false;
    this.scheduleReconnect();
  }

  // ---- heads watchdog: catches the error-less dead subscription ----

  private startHeadsWatchdog(): void {
    if (this.headsWatchdog) return;
    this.lastHeadAt = Date.now();
    this.headsWatchdog = setInterval(() => void this.checkHeadsStall(), HEADS_STALL_MS);
  }

  private stopHeadsWatchdog(): void {
    if (this.headsWatchdog) clearInterval(this.headsWatchdog);
    this.headsWatchdog = null;
  }

  /** No newHeads for HEADS_STALL_MS while live: probe the chain head over the
   *  request path. If the chain moved without the sub telling us, the sub is
   *  dead — run the WS-error healing path (which force-resubscribes). If even
   *  the probe fails, the socket itself is gone — same path. A chain that
   *  simply hasn't minted (idle anvil) is left alone. */
  private async checkHeadsStall(): Promise<void> {
    if (!this.live || this.reconnecting || this.probingHeads || !this.client) return;
    if (Date.now() - this.lastHeadAt < HEADS_STALL_MS) return;
    this.probingHeads = true;
    const generation = this.generation;
    try {
      const head = exactBlock(await this.client.getBlockNumber());
      if (generation !== this.generation) return;
      if (head > Math.max(this.sampledHead, this.deps.store.status.headBlock)) {
        this.silentOn = this.deps.chainSocket?.mark();
        this.onWsError();
      }
    } catch (error) {
      if (generation === this.generation) this.onWsError(error);
    } finally {
      if (generation === this.generation) this.probingHeads = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.retryTimer || !this.hasActiveScopes()) return;
    const delay = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 2, RECONNECT_MAX_MS);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.reconnect();
    }, delay);
  }

  /**
   *  Heal after a socket drop: resubscribe (buffering), backfill everything the
   *  store missed since `lastBlock` straight from chain, replay, go live. The
   *  indexer is NOT consulted — the store's own state is the seam.
   */
  private async reconnect(): Promise<void> {
    if (this.reconnecting || !this.hasActiveScopes()) return;
    this.reconnecting = true;
    const generation = this.generation;
    const sources = new Map([...this.activeSources()].map((address) => [address, this.sourceGeneration.get(address)]));
    const isCurrent = this.sourceGuard(sources);
    const failure = this.deps.store.status.failure;
    try {
      // Tear down the (possibly silently-dead) handles first so
      // ensureSubscriptions actually re-arms both subs — its unchanged-set
      // no-op check and the heads `??=` would otherwise keep the stale
      // handles and the heads stream would never come back.
      try {
        this.unwatchHeads?.();
      } catch {
        /* dead socket */
      }
      try {
        this.unwatchLogs?.();
      } catch {
        /* dead socket */
      }
      this.unwatchHeads = null;
      this.unwatchLogs = null;
      // Retiring the socket fails the old logs subscription; retire its generation
      // first so that late error does not schedule another reconnect.
      this.subscriptionGeneration++;
      const silentOn = this.silentOn;
      this.silentOn = undefined;
      this.deps.chainSocket?.redial(silentOn);
      if (this.warmupRefs > 0 && this.watchAddresses.length === 0) {
        // Even configured discovery sources wait for hydration's source seam.
        // Retry only the transport while that seam has not armed any addresses.
        this.unwatchHeads = this.subscribeHeads();
        return;
      }
      this.ensureSubscriptions();
      // There is no source seam yet. Keep the replacement heads observable and
      // let snapshot hydration establish its own subscription-before-head seam.
      if (sources.size === 0) return;
      const client = (this.client ??= this.deps.getClient());
      const head = Number(await client.getBlockNumber());
      if (![...sources.keys()].some(isCurrent)) return;
      const retryDiagnostic = this.deps.store.status.failure?.operation === "reconciliation";
      await this.enqueueApply(async () => {
        const diagnostic = this.deps.getConfig().reconciliation;
        if (retryDiagnostic && diagnostic) await this.reconcile(head, diagnostic.depth, sources);
        else await this.recoverSources(head);
        if (![...sources.keys()].some(isCurrent)) return;
        await this.replayInboxNow(-1);
        if (![...sources.keys()].some(isCurrent)) return;
        // Backfill success cannot erase a new refusal of the replacement stream.
        if (this.warmupFailure && this.deps.store.status.failure && this.deps.store.status.failure !== failure) return;
        this.deps.store.setStatus({
          wsConnected: true,
          headBlock: Math.max(head, this.deps.store.status.headBlock),
          failure: null,
        });
        this.warmupFailure = null;
        this.markLive();
      });
    } catch (error) {
      if ([...sources.keys()].some(isCurrent))
        this.onWsError(error, this.deps.store.status.failure?.operation ?? "recovery");
    } finally {
      if (generation === this.generation) this.reconnecting = false;
    }
  }

  private pruneMaps(headNum: number): void {
    // Timestamps are a cache, so they follow the head and never the coverage cursors.
    // The scan runs once per BLOCK_TS_RETAIN heads and drops the oldest insertions first.
    if (this.blockTs.size >= 2 * BLOCK_TS_RETAIN) {
      for (const k of this.blockTs.keys()) {
        if (k <= headNum - BLOCK_TS_RETAIN || this.blockTs.size > BLOCK_TS_RETAIN) this.blockTs.delete(k);
      }
    }
  }

  /** Closed guards reject replay before decoding, so certified buckets need no ids.
   * A pending source without closure blocks pruning. Heads alone prove no closure.
   * Scan block keys only when the common certified frontier changes; deleting a
   * bucket releases all of its ids without traversing them. */
  private pruneProcessed(): void {
    let floor = Infinity;
    for (const address of this.watchAddresses) floor = Math.min(floor, this.closedThrough.get(address) ?? -1);
    if (floor === this.processedFloor) return;
    this.processedFloor = floor;
    for (const block of this.processed.keys()) if (block <= floor) this.processed.delete(block);
  }
}

// Each createClient() builds its own LiveTail instance from its config/store/client.
export { LiveTail };

/** Existing live rows use numbers, so reject an unsafe conversion at the boundary. */
function exactBlock(block: bigint): number {
  const value = Number(block);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new InvalidInputError("live block exceeds the exact numeric row boundary");
  return value;
}

function addressOf(value: string): Address {
  if (!isAddress(value)) throw new InvalidInputError("live source must be an address");
  return Markets.lower0x(value);
}

/** Run `task` over `items` with at most `limit` tasks in flight. The first failure stops new tasks and rejects. */
async function forEachBounded<T>(items: readonly T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  const queue = items.values();
  let failed = false;
  const worker = async (): Promise<void> => {
    for (let step = queue.next(); !failed && !step.done; step = queue.next()) {
      try {
        await task(step.value);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** Keep typed failures intact at the background and awaited queue boundaries. */
function tailError(error: unknown, operation: string): Store.TailFailure["error"] {
  const typed = Errors.sdkFailure(error, InvariantError);
  if (typed) return typed;
  const normalized = Revert.toSdkError(error, operation);
  if (normalized instanceof RpcError || normalized instanceof ContractRevertError) return normalized;
  return new RpcError(operation, "background operation failed", { cause: error });
}
