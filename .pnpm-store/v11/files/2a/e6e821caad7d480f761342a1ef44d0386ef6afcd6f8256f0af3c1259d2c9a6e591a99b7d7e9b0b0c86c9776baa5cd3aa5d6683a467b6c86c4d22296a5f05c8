// PriceFeed — the client-side realtime price tail, scoped by ASSET.
//
// Same shape as the order-book LiveTail (liveTail.ts): nothing is tailed by
// default; callers open ref-counted watches (watchPrice(asset)) that return a
// handle, share one subscription when watched twice, and linger briefly after
// release so an unmount/remount doesn't re-snapshot. Each watch:
//
//   1. hydrates an HTTP snapshot (feed metadata + current price + recent ticks)
//      while establishing the shared WebSocket connection, then
//   2. streams live over a Hasura WebSocket subscription (Feed for the current
//      price, PricePoint only when a reader acquires the tick tape).
//
// The two subscriptions heal differently after a reconnect. Feed is full-state:
// every push carries the current row, so re-subscribing is enough. The tape is a
// Hasura stream cursored on `requestId`, so it resumes from the newest tick it
// delivered — the cursor is the seam, and it is why the tape's variables are a
// function rather than a value. The HasuraWsClient owns reconnect with backoff.
//
// Assets share transport within one PriceFeed (one per client). Every asset on
// one WebSocket URL rides one HasuraWsClient, and each asset keeps its own
// subscription ids, cursor and health. Watches that start in the same tick are
// hydrated together: their snapshots coalesce into bounded batched requests
// (see HYDRATION_BATCH_MAX), grouped by tape demand. Latest-only acquisitions
// never share a failing tape request; each tape reader keeps its own tick budget.

import type { ClientConfig } from "../config.js";
import * as Config from "../config.js";
import type { Debug } from "../debug.js";
import { NotConfiguredError } from "../errors.js";
import * as HasuraWs from "./hasuraWs.js";
import * as OwnedWebSocket from "../webSocket.js";
import * as Query from "./query.js";
import type { PriceStore } from "./priceStore.js";
import type { PriceFeedStatus, PriceFeedHealth } from "./types.js";
import * as Raise from "../raise.js";

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

/** Recent ticks pulled by the hydration snapshot + kept live by the tape subscription. */
const SNAPSHOT_TICKS = 200;
/** Rows one tape push may carry. A push normally holds one; the headroom is for
 *  draining a backlog after a reconnect. */
const LIVE_TAPE_BATCH = 100;
/** The payload key a Hasura stream delivers under — the root field plus `_stream`. */
const TAPE_FIELD = "PricePoint_stream";
/** How long a released asset lingers before teardown (absorbs remount/navigation). */
const RELEASE_LINGER_MS = 30_000;
/** Most assets one hydration request carries. Tape readers each request at most
 *  SNAPSHOT_TICKS rows; current-only snapshots omit tape fields entirely. */
const HYDRATION_BATCH_MAX = 10;

/** The cursor before any tick has been seen. `requestId` counts from 1. */
const ZERO_CURSOR = "0";

/**
 *  The newer of two `requestId`s, compared exactly.
 *
 *  `requestId` is a `uint256` decimal, so it is carried as a string and compared
 *  as a `bigint` (SDK-TYPE-007). Going through `number` would round above 2^53 -
 *  `Number("9007199254740995")` is `9007199254740996` - and a cursor rounded UP
 *  silently skips the tick it landed past. A candidate that is not a decimal
 *  integer is ignored, so a malformed row cannot corrupt or freeze the cursor.
 */
function newerRequestId(current: string, candidate: string): string {
  if (!/^\d+$/.test(candidate)) return current;
  return BigInt(candidate) > BigInt(current) ? candidate : current;
}

/** One multiplexed socket, shared by every tailed asset on its WebSocket URL. */
interface SharedSocket {
  url: string;
  ws: HasuraWs.HasuraWsClient;
  /** Last connection state the client reported (ack ⇒ true, drop ⇒ false). */
  connected: boolean;
  /** Pending snapshots keep this socket owned even before a tail exists. */
  hydrating: number;
}

/** A snapshot waiting for its batch. `null` settles it as cancelled by `stopAll`. */
interface PendingSnapshot {
  asset: string;
  ticks: boolean;
  settle: (snapshot: Query.PriceSnapshot | null) => void;
  fail: (err: unknown) => void;
}

/** Snapshots queued in the current tick for one HTTP endpoint and quote. */
interface HydrationQueue {
  url: string;
  quote: string;
  entries: PendingSnapshot[];
}

interface TapeTail {
  unsubscribe?: () => void;
  confirmed: boolean;
  status: PriceFeedStatus;
  health: PriceFeedHealth;
  cursor: string;
}

interface AssetTail {
  socket: SharedSocket;
  unsubscribes: (() => void)[];
  priceHealth: PriceFeedHealth;
  tape?: TapeTail;
}

export class PriceFeed {
  private generation = 0;
  private readonly refs = new Map<string, number>();
  private readonly tapeRefs = new Map<string, number>();
  private readonly tapeHydrations = new Map<string, Promise<void>>();
  private readonly tapeLingers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly tails = new Map<string, AssetTail>();
  private readonly hydrations = new Map<string, Promise<void>>();
  private readonly lingers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Shared sockets, keyed by WebSocket URL. */
  private readonly sockets = new Map<string, SharedSocket>();
  /** Snapshots not yet sent, keyed by HTTP URL + quote. */
  private readonly queues = new Map<string, HydrationQueue>();
  /** Snapshot requests on the wire; `stopAll` aborts them. */
  private readonly inflight = new Set<AbortController>();

  constructor(private readonly deps: PriceFeedDeps) {}

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
  async watchPrice(asset: string, options: PriceWatchOptions = {}): Promise<PriceWatchHandle> {
    const key = this.keyOf(asset);
    const generation = this.generation;
    const ticks = options.ticks ?? true;
    this.acquire(key);
    if (ticks) {
      this.cancelTapeLinger(key);
      this.tapeRefs.set(key, (this.tapeRefs.get(key) ?? 0) + 1);
    }
    try {
      if (!this.tails.has(key)) {
        await this.ensureHydration(key, () => this.hydrate(asset, key, ticks), ticks);
      }
      if (ticks && generation === this.generation) await this.ensureTape(key);
    } catch (e) {
      if (generation === this.generation) {
        if (ticks) this.releaseTape(key);
        this.releaseNow(key);
        const tail = this.tails.get(key);
        if (!tail) {
          this.deps.store.setHealth(key, "error");
        } else if (ticks && tail.tape?.status !== "live") {
          tail.tape = { confirmed: false, status: "error", health: "error", cursor: ZERO_CURSOR };
          this.confirm(key, tail);
        }
        this.deps.store.commit();
      }
      throw e;
    }
    return this.handle(() => {
      if (generation === this.generation) {
        this.release(key);
        if (ticks) this.releaseTape(key);
      }
    });
  }

  /** Per-asset watch state (see {@link PriceFeedStatus}). */
  getStatus(asset: string, options: PriceWatchOptions = {}): PriceFeedStatus {
    const key = this.keyOf(asset);
    if (options.ticks === false && this.tails.has(key)) return "live";
    return this.deps.store.getStatus(key);
  }

  getHealth(asset: string, options: PriceWatchOptions = {}): PriceFeedHealth {
    const key = this.keyOf(asset);
    if (options.ticks === false) return this.tails.get(key)?.priceHealth ?? this.deps.store.getHealth(key);
    return this.deps.store.getHealth(key);
  }

  /**
   *  Tear down every price watch, subscription, socket, timer and pending
   *  snapshot. A watch still hydrating resolves with an inert handle. The store
   *  resets every asset to "unwatched".
   */
  stopAll(): void {
    this.generation++;
    for (const t of this.lingers.values()) clearTimeout(t);
    this.lingers.clear();
    for (const timer of this.tapeLingers.values()) clearTimeout(timer);
    this.tapeLingers.clear();
    for (const queue of this.queues.values()) for (const entry of queue.entries) entry.settle(null);
    this.queues.clear();
    for (const controller of this.inflight) controller.abort();
    this.inflight.clear();
    // The refs keys, not just the tails: a rejected asset has already lost its
    // tail (see onSubscriptionError) and would otherwise keep reporting "error"
    // after a full stop, while every healthy asset reset to "unwatched".
    for (const key of new Set([
      ...this.tails.keys(),
      ...this.refs.keys(),
      ...this.deps.store.listStatuses().map((entry) => entry.asset),
    ]))
      this.teardown(key);
    this.refs.clear();
    this.tapeRefs.clear();
    this.tapeHydrations.clear();
    this.hydrations.clear();
    const sockets = [...this.sockets.values()];
    this.sockets.clear();
    for (const socket of sockets) socket.ws.close();
    this.deps.store.setGlobalStatus({ wsConnected: false, watchCount: 0 });
    this.deps.store.commit();
  }

  // ---- hydration + subscription ----

  private async hydrate(asset: string, key: string, ticks: boolean): Promise<void> {
    const generation = this.generation;
    const feed = Config.resolvePriceFeed(this.deps.getConfig());
    // The tape streams on a `requestId` cursor, and one agent request prices
    // every symbol in the tick, so `requestId` is unique only WITHIN a feed. On a
    // base spanning several quotes the stream can hold two rows sharing one, and
    // a batch boundary between them advances the cursor past the second: the tick
    // is gone for good. Refuse the watch rather than lose data quietly - the
    // one-shot reads stay usable unpinned, where the cost is only double-counting.
    if (!feed.quote) {
      throw new NotConfiguredError(
        "config.priceFeed.quote",
        "a live price watch (the tick tape needs one quote per base to stream without dropping ticks)",
      );
    }
    const assetKey = asset.toUpperCase();
    const priorTapeError = !ticks && this.deps.store.getStatus(key) === "error";
    if (!this.tails.has(key)) {
      this.deps.store.setStatus(key, "hydrating");
      this.deps.store.setHealth(key, "hydrating");
    }
    this.deps.store.commit();
    if (generation !== this.generation) return;

    const socket = this.socketFor(feed.wsUrl);
    socket.hydrating++;
    try {
      // Construction precedes the snapshot request; opening and acknowledgement overlap it.
      await socket.ws.connect();
      if (generation !== this.generation) return;
      const snapshot = await this.snapshotOf(feed.url, feed.quote, assetKey, ticks);
      if (!snapshot || generation !== this.generation) return;
      // A sibling watch may have failed and retired its tail during this snapshot.
      const retainedTapeError = !ticks && (priorTapeError || this.deps.store.getStatus(key) === "error");
      const { info, points } = snapshot;
      const existing = this.tails.get(key);
      // Current-only and tape acquisitions may race. Never replace the current
      // stream's newer metadata with the other acquisition's older snapshot.
      if (!existing) this.deps.store.setInfo(assetKey, info);
      this.deps.store.mergeTicks(assetKey, points);
      if (!existing) this.deps.store.setHealth(key, "hydrated");

      // Seeding from the snapshot's newest requestId resumes exactly where it
      // stopped: no gap, no re-delivery.
      const seed = points.reduce((newest, p) => newerRequestId(newest, p.requestId), ZERO_CURSOR);

      // Open the live subscription only if a watch is still active (guard against a
      // stop() that raced the snapshot).
      if ((this.refs.get(key) ?? 0) > 0) {
        if (existing) {
          if (ticks && !existing.tape?.unsubscribe) this.subscribeTape(assetKey, key, existing, seed, feed.quote);
          this.confirm(key, existing);
        } else this.subscribe(assetKey, key, feed.wsUrl, ticks ? seed : undefined, feed.quote, retainedTapeError);
      }
      if (this.deps.store.getStatus(key) !== "error") this.deps.store.setStatus(key, "live");

      this.deps.store.setGlobalStatus({ watchCount: this.tails.size, wsConnected: this.anyConnected() });
      this.deps.store.commit();
    } finally {
      socket.hydrating--;
      this.closeUnusedSocket(socket);
    }
  }

  /**
   *  Queue one asset's snapshot into the batch for its endpoint and quote. The
   *  batch is sent in a microtask, so every watch started in the same tick (a
   *  `watchPrices` call, or several hooks mounting in one commit) shares it at no
   *  added latency.
   */
  private snapshotOf(url: string, quote: string, asset: string, ticks: boolean): Promise<Query.PriceSnapshot | null> {
    return new Promise((settle, fail) => {
      const id = `${url}\n${quote}\n${ticks}`;
      let queue = this.queues.get(id);
      if (!queue) {
        const created: HydrationQueue = { url, quote, entries: [] };
        this.queues.set(id, created);
        queueMicrotask(() => this.flush(id, created));
        queue = created;
      }
      queue.entries.push({ asset, ticks, settle, fail });
    });
  }

  private flush(id: string, queue: HydrationQueue): void {
    // `stopAll` already settled and dropped this queue.
    if (this.queues.get(id) !== queue) return;
    this.queues.delete(id);
    for (let i = 0; i < queue.entries.length; i += HYDRATION_BATCH_MAX) {
      void this.load(queue.url, queue.quote, queue.entries.slice(i, i + HYDRATION_BATCH_MAX));
    }
  }

  /** One batched snapshot request. Its failure rejects only the assets it carried. */
  private async load(url: string, quote: string, entries: PendingSnapshot[]): Promise<void> {
    const controller = new AbortController();
    this.inflight.add(controller);
    try {
      const snapshots = await Query.loadPriceSnapshots(
        url,
        entries.map((e) => e.asset),
        entries[0]?.ticks ? SNAPSHOT_TICKS : 0,
        quote,
        controller.signal,
      );
      for (const e of entries) {
        e.settle(snapshots.get(e.asset) ?? Raise.unreachable(`the price snapshot omitted ${e.asset}`));
      }
    } catch (err) {
      // An abort is `stopAll`: the watches resolve inert, as they did when a
      // snapshot landed after a stop.
      for (const e of entries) {
        if (controller.signal.aborted) e.settle(null);
        else e.fail(err);
      }
    } finally {
      this.inflight.delete(controller);
    }
  }

  /** The shared socket for `wsUrl`, opened on first use. */
  private socketFor(wsUrl: string): SharedSocket {
    const existing = this.sockets.get(wsUrl);
    if (existing) return existing;
    const socket: SharedSocket = {
      url: wsUrl,
      ws: new HasuraWs.HasuraWsClient(
        wsUrl,
        (connected, error) => {
          if (error && this.sockets.get(wsUrl) === socket) {
            this.deps.dbg.warn("priceFeed", "connection attempt failed", { url: wsUrl, error });
          }
          this.onConnStatus(socket, connected);
        },
        this.deps.infrastructure,
      ),
      connected: false,
      hydrating: 0,
    };
    this.sockets.set(wsUrl, socket);
    return socket;
  }

  /**
   *  End one asset's subscriptions. Its siblings on the same socket keep
   *  streaming; the socket closes only when no tail or hydration uses it.
   */
  private dropTail(key: string, tail: AssetTail): void {
    for (const u of tail.unsubscribes) u();
    tail.tape?.unsubscribe?.();
    this.tails.delete(key);
    this.closeUnusedSocket(tail.socket);
  }

  private closeUnusedSocket(socket: SharedSocket): void {
    if (socket.hydrating > 0 || [...this.tails.values()].some((t) => t.socket === socket)) return;
    if (this.sockets.get(socket.url) !== socket) return;
    this.sockets.delete(socket.url);
    socket.ws.close();
  }

  private anyConnected(): boolean {
    return [...this.tails.values()].some((t) => t.socket.connected);
  }

  private subscribe(
    asset: string,
    key: string,
    wsUrl: string,
    cursor: string | undefined,
    quote: string,
    retainedTapeError: boolean,
  ): void {
    if (this.tails.has(key)) return;
    const socket = this.socketFor(wsUrl);
    const ws = socket.ws;
    const tail: AssetTail = {
      socket,
      unsubscribes: [],
      priceHealth: "hydrated",
    };
    if (cursor === undefined && (this.tapeRefs.get(key) ?? 0) > 0) {
      // An independent current-only retry does not conceal retained tape readers'
      // fault or acquire their tape on their behalf.
      const status = retainedTapeError ? "error" : "hydrating";
      tail.tape = { confirmed: false, status, health: status, cursor: ZERO_CURSOR };
    }
    this.tails.set(key, tail);

    // `$quote` is only a declared subscription variable when the feed is
    // quote-pinned — include it in the vars only then (matches the query builders).
    const quoteVar = quote ? { quote } : {};
    tail.unsubscribes.push(
      ws.subscribe(
        Query.subscriptionFeed(quote),
        { base: asset, ...quoteVar },
        (data) => {
          if (this.tails.get(key) !== tail || !Query.isFeedPayload(data, "Feed")) return;
          const feed = Query.feedIn(data, "Feed");
          if (feed) this.deps.store.setInfo(asset, Query.parseFeed(feed, asset));
          tail.priceHealth = "streaming";
          this.confirm(key, tail);
          this.deps.store.commit();
        },
        (err) => {
          if (this.tails.get(key) === tail) this.onSubscriptionError(key, "price", err);
        },
      ),
    );
    if (cursor !== undefined) this.subscribeTape(asset, key, tail, cursor, quote);
    this.confirm(key, tail);
  }

  private subscribeTape(asset: string, key: string, tail: AssetTail, cursor: string, quote: string): void {
    const tape: TapeTail = { confirmed: false, status: "live", health: "hydrated", cursor };
    tail.tape = tape;
    tape.unsubscribe = tail.socket.ws.subscribe(
      Query.subscriptionTicksStream(quote),
      () => ({ base: asset, batch: LIVE_TAPE_BATCH, cursor: tape.cursor, quote }),
      (data) => {
        if (this.tails.get(key) !== tail || tail.tape !== tape || !Query.isTicksPayload(data, TAPE_FIELD)) return;
        tape.confirmed = true;
        tape.health = "streaming";
        this.confirm(key, tail);
        const decimals = this.deps.store.getInfo(asset)?.decimals ?? 18;
        const ticks = Query.pricePointsIn(data, TAPE_FIELD).map((r) => Query.parsePoint(r, decimals, asset));
        tape.cursor = ticks.reduce((newest, t) => newerRequestId(newest, t.requestId), tape.cursor);
        this.deps.store.mergeTicks(asset, ticks);
        this.deps.store.commit();
      },
      (err) => {
        if (this.tails.get(key) === tail && tail.tape === tape) this.onSubscriptionError(key, "ticks", err);
      },
    );
  }

  private async ensureTape(key: string): Promise<void> {
    // A current-only snapshot can finish before an already-running default
    // snapshot. Its tape readers share that pending tape instead of issuing one
    // more request during the overlap.
    const initial = this.hydrations.get(key);
    if (initial) await initial;
    const tail = this.tails.get(key);
    if (!tail || tail.tape?.status === "live") return;
    const pending = this.tapeHydrations.get(key);
    if (pending) return pending;
    const run = this.hydrateTape(key, tail).finally(() => {
      if (this.tapeHydrations.get(key) === run) this.tapeHydrations.delete(key);
    });
    // The hydration notification may synchronously close the owner.
    if (this.tails.get(key) === tail) this.tapeHydrations.set(key, run);
    return run;
  }

  private async hydrateTape(key: string, tail: AssetTail): Promise<void> {
    const generation = this.generation;
    const feed = Config.resolvePriceFeed(this.deps.getConfig());
    if (!feed.quote) throw new NotConfiguredError("config.priceFeed.quote", "a live tick tape");
    const tape: TapeTail = { confirmed: false, status: "hydrating", health: "hydrating", cursor: ZERO_CURSOR };
    tail.tape = tape;
    this.confirm(key, tail);
    this.deps.store.commit();
    if (generation !== this.generation || this.tails.get(key) !== tail || tail.tape !== tape) return;
    try {
      const snapshot = await this.snapshotOf(feed.url, feed.quote, key, true);
      if (!snapshot || this.tails.get(key) !== tail || tail.tape !== tape) return;
      // Tape upgrades must not replace a newer Feed push with older snapshot metadata.
      this.deps.store.mergeTicks(key, snapshot.points);
      const seed = snapshot.points.reduce((cursor, p) => newerRequestId(cursor, p.requestId), ZERO_CURSOR);
      this.subscribeTape(key, key, tail, seed, feed.quote);
      this.confirm(key, tail);
      this.deps.store.commit();
    } catch (error) {
      if (this.tails.get(key) === tail && tail.tape === tape) {
        tail.tape.status = "error";
        tail.tape.health = "error";
        this.confirm(key, tail);
        this.deps.store.commit();
      }
      throw error;
    }
  }

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
  private onSubscriptionError(key: string, stream: "price" | "ticks", err: unknown): void {
    const tail = this.tails.get(key);
    if (!tail) return;
    const generation = this.generation;
    this.deps.dbg.warn("priceFeed", "subscription rejected by the server", { asset: key, stream, error: err });
    if (generation !== this.generation || this.tails.get(key) !== tail) return;
    if (stream === "ticks" && (this.refs.get(key) ?? 0) > (this.tapeRefs.get(key) ?? 0)) {
      tail.tape?.unsubscribe?.();
      if (tail.tape) {
        tail.tape.status = "error";
        tail.tape.health = "error";
      }
      this.confirm(key, tail);
      this.deps.store.commit();
      return;
    }
    this.dropTail(key, tail);
    this.hydrations.delete(key);
    this.hydrations.delete(`${key}:latest`);
    this.tapeHydrations.delete(key);
    this.deps.store.setStatus(key, "error");
    this.deps.store.setHealth(key, "error");
    this.deps.store.setGlobalStatus({ watchCount: this.tails.size, wsConnected: this.anyConnected() });
    this.deps.store.commit();
  }

  /** A shared socket connected or dropped: every asset on it follows. */
  private onConnStatus(socket: SharedSocket, connected: boolean): void {
    // A retired socket reports its own close; nothing rides it any more.
    if (this.sockets.get(socket.url) !== socket) return;
    socket.connected = connected;
    if (!connected) {
      for (const [key, tail] of this.tails) {
        if (tail.socket !== socket) continue;
        tail.priceHealth = "stale";
        if (tail.tape && tail.tape.status !== "error") {
          tail.tape.confirmed = false;
          tail.tape.health = "stale";
        }
        this.confirm(key, tail);
      }
    }
    // Tail-wide flag is the OR across sockets in use — one live socket ⇒ connected.
    this.deps.store.setGlobalStatus({ wsConnected: this.anyConnected() });
    this.deps.store.commit();
  }

  private confirm(key: string, tail: AssetTail): void {
    const tape = tail.tape;
    let health = tail.priceHealth;
    let status: PriceFeedStatus = "live";
    if (tape) {
      status = tape.status;
      if (tape.health === "error" || tape.health === "hydrating") health = tape.health;
      else if (health === "streaming" && !tape.confirmed) health = tape.health;
    }
    this.deps.store.setStatus(key, status);
    this.deps.store.setHealth(key, health);
  }

  // ---- refcount + linger plumbing (mirrors LiveTail) ----

  private acquire(key: string): void {
    this.cancelLinger(key);
    this.refs.set(key, (this.refs.get(key) ?? 0) + 1);
  }

  private release(key: string): void {
    const count = (this.refs.get(key) ?? 0) - 1;
    if (count > 0) {
      this.refs.set(key, count);
      return;
    }
    this.refs.set(key, 0);
    this.linger(key, () => this.teardown(key));
  }

  private releaseNow(key: string): void {
    const count = (this.refs.get(key) ?? 0) - 1;
    if (count > 0) this.refs.set(key, count);
    else {
      this.refs.delete(key);
      // A failed tape upgrade may have been the last reference on a healthy
      // price tail. It must not retain that tail after the bounded linger.
      if (this.tails.has(key)) this.linger(key, () => this.teardown(key));
    }
  }

  private cancelTapeLinger(key: string): void {
    const timer = this.tapeLingers.get(key);
    if (timer) clearTimeout(timer);
    this.tapeLingers.delete(key);
  }

  private releaseTape(key: string): void {
    const count = (this.tapeRefs.get(key) ?? 0) - 1;
    if (count > 0) {
      this.tapeRefs.set(key, count);
      return;
    }
    this.tapeRefs.delete(key);
    this.cancelTapeLinger(key);
    if (!this.tails.has(key)) return;
    this.tapeLingers.set(
      key,
      setTimeout(() => {
        this.tapeLingers.delete(key);
        // Clearing the tape identity also invalidates a pending tape snapshot.
        const tail = this.tails.get(key);
        tail?.tape?.unsubscribe?.();
        if (tail) {
          delete tail.tape;
          this.confirm(key, tail);
        }
        this.deps.store.purgeTicks(key);
        this.deps.store.commit();
      }, RELEASE_LINGER_MS),
    );
  }

  private teardown(key: string): void {
    this.cancelTapeLinger(key);
    this.tapeRefs.delete(key);
    this.tapeHydrations.delete(key);
    this.refs.delete(key);
    this.hydrations.delete(key);
    this.hydrations.delete(`${key}:latest`);
    const tail = this.tails.get(key);
    if (tail) this.dropTail(key, tail);
    this.deps.store.purgeAsset(key);
    this.deps.store.setGlobalStatus({ watchCount: this.tails.size, wsConnected: this.anyConnected() });
    this.deps.store.commit();
  }

  private handle(stop: () => void): PriceWatchHandle {
    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
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

  private async ensureHydration(asset: string, run: () => Promise<void>, ticks: boolean): Promise<void> {
    // A latest-only acquisition never waits on a tape-bearing request. A tape
    // failure must not reject an independent current-price reader.
    const key = ticks ? asset : `${asset}:latest`;
    const inFlight = this.hydrations.get(key);
    if (inFlight) return inFlight;
    const p = run().finally(() => {
      if (this.hydrations.get(key) === p) this.hydrations.delete(key);
    });
    this.hydrations.set(key, p);
    return p;
  }

  private keyOf(asset: string): string {
    return asset.toUpperCase();
  }
}
