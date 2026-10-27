import type { ClientConfig } from "../config.js";
import type { Debug } from "../debug.js";
import * as OwnedWebSocket from "../webSocket.js";
import type { PriceStore } from "./priceStore.js";
import type { PriceFeedStatus, PriceFeedHealth } from "./types.js";
/**
 * Select the data acquired by an owner-bound price watch. Direct watches
 * include a tape by default; latest/info React hooks acquire current data only.
 *
 * @category price feeds
 */
export interface PriceWatchOptions {
    /** Include 200 recent ticks and a live tape. Defaults to true for direct watches.
     * Set false for current price and metadata only. The last tape reference releases
     * its stream and rows after 30 seconds, even while current-price readers remain. */
    ticks?: boolean;
}
/** An owner-bound price watch. Stop is idempotent. @category price feeds */
export interface PriceWatchHandle {
    /**
     *  Release this handle's reference on the asset's watch (idempotent — extra calls
     *  are no-ops). Handles on the same asset share one subscription; stopping the
     *  LAST one tears the asset down after a short linger (which absorbs
     *  unmount/remount without re-snapshotting): the asset's subscriptions end, its
     *  rows are purged, and live price reads for it return null/empty again. The
     *  socket is shared by every watched asset on the endpoint; it closes when the
     *  last asset on it is torn down.
     */
    stop(): void;
}
/** What a PriceFeed runs against — its own config + price store, per client. */
export interface PriceFeedDeps {
    getConfig: () => ClientConfig;
    store: PriceStore;
    /** The owning client's debug channel. A no-op when debugging is disabled. */
    dbg: Debug;
    /** The owner's socket infrastructure, shared with its RPC sockets. */
    infrastructure?: OwnedWebSocket.Infrastructure;
}
export declare class PriceFeed {
    private readonly deps;
    private generation;
    private readonly refs;
    private readonly tapeRefs;
    private readonly tapeHydrations;
    private readonly tapeLingers;
    private readonly tails;
    private readonly hydrations;
    private readonly lingers;
    /** Shared sockets, keyed by WebSocket URL. */
    private readonly sockets;
    /** Snapshots not yet sent, keyed by HTTP URL + quote. */
    private readonly queues;
    /** Snapshot requests on the wire; `stopAll` aborts them. */
    private readonly inflight;
    constructor(deps: PriceFeedDeps);
    /**
     *  Watch one asset's price: hydrate a snapshot and stream live updates. Resolves
     *  once the snapshot has landed (reads are populated); the socket connecting (or
     *  dropping later) is handled transparently. Rejects + releases the ref on a
     *  failed snapshot or an unconfigured asset.
     *
     *  The feed must be quote-pinned: an unset `config.priceFeed.quote` rejects with
     *  a `NotConfiguredError` before any I/O, because the tape's `requestId` cursor
     *  is unique only within one quote, so an unpinned watch would silently drop
     *  ticks. One-shot reads are unaffected.
     */
    watchPrice(asset: string, options?: PriceWatchOptions): Promise<PriceWatchHandle>;
    /** Per-asset watch state (see {@link PriceFeedStatus}). */
    getStatus(asset: string, options?: PriceWatchOptions): PriceFeedStatus;
    getHealth(asset: string, options?: PriceWatchOptions): PriceFeedHealth;
    /**
     *  Tear down every price watch, subscription, socket, timer and pending
     *  snapshot. A watch still hydrating resolves with an inert handle. The store
     *  resets every asset to "unwatched".
     */
    stopAll(): void;
    private hydrate;
    /**
     *  Queue one asset's snapshot into the batch for its endpoint and quote. The
     *  batch is sent in a microtask, so every watch started in the same tick (a
     *  `watchPrices` call, or several hooks mounting in one commit) shares it at no
     *  added latency.
     */
    private snapshotOf;
    private flush;
    /** One batched snapshot request. Its failure rejects only the assets it carried. */
    private load;
    /** The shared socket for `wsUrl`, opened on first use. */
    private socketFor;
    /**
     *  End one asset's subscriptions. Its siblings on the same socket keep
     *  streaming; the socket closes only when no tail or hydration uses it.
     */
    private dropTail;
    private closeUnusedSocket;
    private anyConnected;
    private subscribe;
    private subscribeTape;
    private ensureTape;
    private hydrateTape;
    /**
     *  A server `error` frame: this subscription is dead and will not heal. Hasura
     *  sends it for a rejected or terminated operation (a validation failure after
     *  a schema change, a permission denial), so re-issuing the same document would
     *  only be rejected again — unlike a dropped socket, which HasuraWsClient
     *  already reconnects on its own.
     *
     *  Reporting it is the point: with the frame dropped, the status stayed `"live"`
     *  while the data froze, so every read kept answering with values no longer being
     *  updated.
     *
     *  Only this asset's subscriptions end. The socket is shared and stays up for
     *  its siblings, so a rejection is an asset state, never a connection state.
     *
     *  A tape rejection leaves the price stream active when latest-only readers
     *  share this asset. The aggregate status reports the tape fault; latest-only
     *  status and health report current-price delivery. A new tape reader retries
     *  tape hydration without changing current-price data.
     *
     *  With only direct/default readers it drops the tail, preserving their remedy. The
     *  status alone is not a recovery path: `watchPrice` re-hydrates only when the
     *  asset has no tail, so an errored tail left in place would swallow every later
     *  watch — the caller would stop and re-watch and still read `"error"`, with no
     *  new subscription opened. The rows survive (reads keep answering, stale) and
     *  the ref count is untouched, so the NEXT watch on this asset hydrates from
     *  scratch.
     */
    private onSubscriptionError;
    /** A shared socket connected or dropped: every asset on it follows. */
    private onConnStatus;
    private confirm;
    private acquire;
    private release;
    private releaseNow;
    private cancelTapeLinger;
    private releaseTape;
    private teardown;
    private handle;
    private linger;
    private cancelLinger;
    private ensureHydration;
    private keyOf;
}
