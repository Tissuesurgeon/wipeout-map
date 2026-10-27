// `client.accountOrders`: one account's complete open orders and pending stops.
//
// `getSnapshot` reads the account through the guarded snapshot (`guardedSnapshot.ts`),
// maps the rows (`rows.ts`) and adds each stop's venue and limit price
// (`enrichment.ts`). It subscribes to nothing. Concurrent calls for one account share
// one read (`registry.ts`).
//
// `subscribe` runs one live session per account (`session.ts`), shared by every
// listener of that account (`registry.ts`), over one stream connection per engine
// (`graphqlWs.ts`). The connection opens with the first session and closes after the
// last one. On a client with a chain socket, each session's stops also follow the
// stop registries' events (`chainStops.ts`), ahead of the indexer.
//
// Every read belongs to the engine's live-read lifecycle, as the live tail's reads do.
// `stopLive()` ends a read in flight, which then rejects with `IndexerUnavailableError`
// `live-reset`, and the client stays usable. The reads never send `indexerHeaders`:
// the producer proves the account view's limits for the public role only.

import { isAddress } from "viem";
import { AccountViewError, IndexerUnavailableError, InvalidInputError, NotConfiguredError } from "../errors.js";
import type { IndexerError } from "../errors.js";
import * as GraphqlBoundary from "../graphqlBoundary.js";
import * as GraphqlWs from "../graphqlWs.js";
import * as IndexerRead from "../indexerRead.js";
import type { PerpStopOrderRead, PerpStopOrderRef } from "../perp/stops.js";
import * as Pools from "../pools.js";
import * as Raise from "../raise.js";
import * as ChainStops from "./chainStops.js";
import * as Enrichment from "./enrichment.js";
import * as Snapshot from "./guardedSnapshot.js";
import * as Outcomes from "./outcomes.js";
import * as Reads from "./reads.js";
import * as Registry from "./registry.js";
import * as Rows from "./rows.js";
import * as Session from "./session.js";
import * as Streams from "./streams.js";
import type {
  AccountOrdersData,
  AccountOrdersGetSnapshotOptions,
  AccountOrdersSnapshot,
  AccountOrdersView,
  AccountStop,
} from "./types.js";

/**
 *  Complete views of one account's open orders and pending stops, from the indexer's
 *  account view.
 *
 *  Reach it as `client.accountOrders`; the chain is the engine's own. On an exchange,
 *  use `exchange.engineFor(chainId).accountOrders`.
 *
 *  **Details**
 *
 *  A view is complete at one version: every open order and pending stop the account
 *  had at that version, and nothing else. An account the indexer cannot serve is
 *  `unavailable`, and an account larger than the view can prove complete is
 *  `tooLarge`. Neither is ever an empty account.
 *
 * @category account views
 */
export interface AccountOrdersClient {
  /**
   *  Reads one account's complete open orders and pending stops at one version.
   *
   *  **Details**
   *
   *  - `account`: The trader's address, in any letter case. The view lower-cases it.
   *  - `options`: `signal` stops the read. The caller's abort reason is rethrown unchanged.
   *  - Returns: `ready` with the account's data, `unavailable` when the indexer cannot
   *    serve an account view on this chain, or `tooLarge` when the account holds more
   *    than the view can prove complete. See {@link AccountOrdersSnapshot}.
   *
   *  The read brackets the rows with two reads of the account's version, and accepts
   *  the rows only when the version did not move. It retries a moved version twice.
   *  Then it adds each stop's venue and limit price, which the rows do not carry; a
   *  value it cannot read is `unknown`, never a guess. That step waits at most 5 s.
   *
   *  Concurrent calls for one account share one read. One caller's abort does not
   *  stop the others. While {@link AccountOrdersClient.subscribe} keeps the account's
   *  view `ready`, with no stop value still `pending`, the call returns that view and
   *  sends no request. A read that finishes after that view has moved past it hands
   *  back the view instead, or reads once more, so the call never returns an older
   *  version than the view's listeners already have.
   *
   *  **Gotchas**
   *
   *  - A `ready` view is complete at its version. It says nothing about how far the
   *    indexer is behind the chain head; `data.sync.processedHeight` is the indexer's
   *    own progress.
   *  - Order expiry follows this machine's clock. An order that expires before
   *    `data.expiryCutoffNs` is not in the view.
   *  - Check `data.coverage` before you treat a missing order as absent. A family it
   *    does not list, or a part of one it excludes, is unknown to the view. Event-contract
   *    orders stay unknown until the manifest lists `"BINARY_ORDER"`.
   *
   * **Example** (Showing an account's open orders)
   *
   *  ```ts
   *  const snapshot = await client.accountOrders.getSnapshot(account);
   *  switch (snapshot.status) {
   *    case "ready":
   *      console.log(snapshot.data.orders.length, "open orders at block", snapshot.data.version.blockNumber);
   *      break;
   *    case "unavailable":
   *      // Unknown, never an empty account: keep the reads you use today.
   *      console.log("no account view here:", snapshot.reason);
   *      break;
   *    case "tooLarge":
   *      console.log("more", snapshot.collection, "than the view holds:", snapshot.capacity);
   *      break;
   *  }
   *  ```
   *
   * @throws {@link InvalidInputError} `account` is not an address.
   * @throws {@link NotConfiguredError} The client has no indexer endpoint, or its endpoint does not index this chain.
   * @throws {@link AccountViewError} The indexer answered, but not with one complete account.
   * @throws {@link IndexerUnavailableError} The SDK held the read back, or `stopLive()` ended it.
   * @throws {@link IndexerError} A request did not complete.
   */
  getSnapshot(account: string, options?: AccountOrdersGetSnapshotOptions): Promise<AccountOrdersSnapshot>;

  /**
   *  Follows one account's complete open orders and pending stops as they change.
   *
   *  **Details**
   *
   *  - `account`: The trader's address, in any letter case. The view lower-cases it.
   *  - `onView`: Receives every state of the view, each one complete: see
   *    {@link AccountOrdersView}. Views arrive in order, a microtask after the SDK
   *    produces them, and never during this call. Listeners share each view, so it is
   *    frozen all the way down; an `error` in it is not.
   *  - Returns: The function that stops this listener. Calling it twice does nothing.
   *
   *  The view starts `loading`, then goes `ready` with a guarded snapshot. From then on
   *  the SDK applies the indexer's changes to the account in block order and delivers
   *  a new complete view after each change; changes that arrive together are published
   *  together, at most 250 ms apart. A new stop's venue and limit price are `pending`
   *  until the SDK has read them, and a later view carries them. A value whose read
   *  failed is `unknown`, and the SDK reads it again up to three times, after a backoff.
   *
   *  On a client with a chain socket, the stops do not wait for the indexer. The SDK
   *  follows the stop registries' events of the newest 1,000 spot and 1,000 perp markets
   *  over the chain socket, so a stop the account creates, links, unlinks or cancels, or
   *  that fires, shows within a block or so, on top of the indexer's view. `data.sync.chainStopsBlock` names the newest block of
   *  such a change while the indexer's version is behind it. Once the version reaches
   *  it, the stops are the indexer's again. Each subscription that opens also reads the
   *  registries' logs since the indexer's processed height, up to 1,000 blocks back.
   *
   *  When the live connection breaks, or a change cannot be applied in order, the view
   *  goes `stale` with its last complete data, and the SDK reads a new snapshot after a
   *  backoff. A read that fails without data is `failed`. An account the indexer cannot
   *  serve is `unavailable`, and one larger than the view can prove complete is
   *  `tooLarge`; the SDK watches both and checks again. None of these is ever an empty
   *  account.
   *
   *  Listeners of one account share one session. When the last one stops, the session
   *  lingers for 30 s, so a screen that comes back reuses it. `stopLive()` ends every
   *  session with a `closed` view.
   *
   *  **Gotchas**
   *
   *  - The live connection uses {@link ClientConfig.indexerWsUrl}, or the WebSocket form
   *    of an absolute `indexerUrl`. It never sends `indexerHeaders`.
   *  - The indexer's subscription server sends updates at its own interval, so an order
   *    change can reach the view a few seconds after its block. Open orders follow the
   *    chain in `accountSpotOrders` and `accountPositions`.
   *  - Only stops come from the chain, and only while the chain socket's subscription
   *    is open: while it is down they follow the indexer, and the reopened one reads
   *    what it missed. A stop created on chain has `pending` values until the SDK reads
   *    them.
   *  - A socket that stays open but goes silent is found within 30 s: after 10 s with no
   *    frame the SDK pings the indexer, and when nothing answers within 10 s more the view
   *    goes `stale` and starts again. A guard change the stream does not follow within
   *    15 s restarts it too.
   *  - A listener that throws is reported through the client's debug channel and does
   *    not stop the view.
   *
   * **Example** (Keeping a screen on an account's orders)
   *
   *  ```ts
   *  const stop = client.accountOrders.subscribe(account, (view) => {
   *    if (view.status === "ready" || view.status === "stale") render(view.data.orders, view.status === "stale");
   *    else if (view.status === "failed") showError(view.reason);
   *  });
   *  // Later, when the screen closes:
   *  stop();
   *  ```
   *
   * @throws {@link InvalidInputError} `account` is not an address, or `onView` is not a function.
   * @throws {@link NotConfiguredError} The client has no indexer endpoint, or no WebSocket endpoint for it.
   */
  subscribe(account: string, onView: (view: AccountOrdersView) => void): () => void;
}

/**
 *  Failures from {@link AccountOrdersClient.subscribe}. Failures after the call arrive as
 *  views, not as errors.
 *
 * @category account views
 */
export type AccountOrdersClientSubscribeError = InvalidInputError | NotConfiguredError;

/**
 *  Failures from {@link AccountOrdersClient.getSnapshot}. {@link accountViewFailureReason}
 *  maps each to one code.
 *
 * @category account views
 */
export type AccountOrdersClientGetSnapshotError =
  | InvalidInputError
  | NotConfiguredError
  | AccountViewError
  | IndexerUnavailableError
  | IndexerError;

export interface AccountOrdersDeps {
  readonly chainId: number;
  /** The request context of one read, bound to the live-read lifecycle at the time of the call. */
  readonly context: () => IndexerRead.RequestContext;
  /** The owner's own signal. A read it ends rejects with its reason, not with `live-reset`. */
  readonly ownerSignal: AbortSignal | undefined;
  /** The error for a read that `stopLive()` ended. */
  readonly liveReset: (operation: string) => IndexerUnavailableError;
  /** Reads perp stops from the chain. Rejects with `NotConfiguredError` when there is no chain transport. */
  readonly readPerpStops: (refs: readonly PerpStopOrderRef[]) => Promise<readonly PerpStopOrderRead[]>;
  /** The indexer WebSocket endpoint, or `undefined` when the client has none. */
  readonly wsUrl: string | undefined;
  /** The delay before retry `attempt` of a live view, counting from 0. */
  readonly backoffMs: (attempt: number) => number;
  /** Reports what a live view cannot report as a view: a listener that threw, a stream that restarted. */
  readonly warn: (message: string, data?: Record<string, unknown>) => void;
  /** Opens the stream connection. Tests replace it; by default it is {@link GraphqlWs.GraphqlWsConnection.open}. */
  readonly openConnection?: (url: string, signal: AbortSignal) => Promise<LiveConnection>;
  /** How long enrichment waits. Tests shorten it. */
  readonly enrichmentDeadlineMs?: number;
  /** The clock of `observedAtMs`, in milliseconds. */
  readonly nowMs?: () => number;
  /** How long a live view outlives its last listener. Tests shorten it. */
  readonly lingerMs?: number;
  /**
   *  The chain reads that let a live view's stops follow the stop registries' events.
   *  Absent: the stops follow the indexer alone.
   */
  readonly chainStops?: Pick<ChainStops.ChainStopsDeps, "registries" | "watch" | "logs" | "head" | "blockTime">;
}

/** A stream connection the owner can close and check. */
export interface LiveConnection extends Session.StreamConnection {
  readonly failure: IndexerError | undefined;
  close(): void;
}

/** `client.accountOrders` and the owner's handle on its live state. */
export interface AccountOrdersOwner {
  readonly client: AccountOrdersClient;
  /** Ends every live view with `closed`, stops reads in flight, and closes the stream connection. */
  stopLive(): void;
}

const OPERATION = "accountOrders.getSnapshot";
const SUBSCRIBE = "accountOrders.subscribe";

/** Whether a live view is still reading the stop's venue or limit price. */
function isPending(stop: AccountStop): boolean {
  return stop.venue.status === "pending" || stop.limitPrice.status === "pending";
}

/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;

/** Why a snapshot read cannot be handed back as it is. */
type ReadAgain = { readonly readAgain: "generation" | "older" };

/**
 *  What a finished snapshot read hands its caller, now that the live view of the same
 *  account may have moved on while it ran: the snapshot, or the live view when that is
 *  at least as new and complete. A snapshot older than what the live view's listeners
 *  already have is never handed back, because a caller that replaces its value with
 *  each result would go back in time.
 */
function settle(
  snapshot: AccountOrdersSnapshot,
  current: AccountOrdersView | undefined,
): AccountOrdersSnapshot | ReadAgain {
  if (snapshot.status !== "ready" || (current?.status !== "ready" && current?.status !== "stale")) return snapshot;
  const live = current.data.version;
  const read = snapshot.data.version;
  // Blocks of two dataset generations do not compare; a new read sees the current one.
  if (live.datasetGeneration !== read.datasetGeneration) return { readAgain: "generation" };
  if (live.blockNumber < read.blockNumber) return snapshot;
  if (current.status === "ready" && !current.data.stops.some(isPending)) return current;
  return live.blockNumber > read.blockNumber ? { readAgain: "older" } : snapshot;
}

function accountOf(account: string, operation: string): string {
  // A JavaScript caller can pass anything, so the type is checked at run time too.
  const value: unknown = account;
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new InvalidInputError(`${operation} needs account to be an address`);
  }
  // Owners are stored lower-cased, and the owner filter is case-sensitive.
  return value.toLowerCase();
}

/** Builds `client.accountOrders`. One per engine. */
export function createAccountOrdersWithDeps(deps: AccountOrdersDeps): AccountOrdersOwner {
  const registry = new Registry.AccountViewRegistry();
  const deadlineMs = deps.enrichmentDeadlineMs ?? Enrichment.ENRICHMENT_DEADLINE_MS;
  const nowMs = deps.nowMs ?? Date.now;

  const base = (account: string) => ({ chainId: deps.chainId, account, revision: registry.nextRevision() });

  /** The dataset generation of the chain's last read. Knowing it saves the next read one request. */
  let knownGeneration: string | null = null;

  /**
   *  Reads one guarded snapshot. Every request of it uses `context`, the context taken
   *  when it started, so a read that spans `stopLive()` cannot finish on the next lifecycle.
   */
  const guarded = async (
    account: string,
    context: IndexerRead.RequestContext,
    signal: AbortSignal,
  ): Promise<Snapshot.GuardedSnapshotResult> => {
    const reader = Reads.createSnapshotReader(
      { chainId: deps.chainId, context: () => context, nowNs: Reads.nowNs },
      signal,
    );
    const result = await Snapshot.guardedAccountSnapshot(account, reader, {
      chainId: deps.chainId,
      maxAttempts: Outcomes.MAX_ATTEMPTS,
      // A generation that has moved on costs the read the request it would make anyway.
      datasetGeneration: knownGeneration,
    });
    if (result.status !== "source_unavailable") knownGeneration = result.capability.datasetGeneration;
    return result;
  };

  const toSnapshot = async (
    account: string,
    result: Snapshot.GuardedSnapshotResult,
    context: IndexerRead.RequestContext,
    signal: AbortSignal,
  ): Promise<AccountOrdersSnapshot> => {
    if (result.status === "source_unavailable") {
      const outcome = Outcomes.unavailableOutcome(result, OPERATION, deps.chainId);
      if (outcome.kind === "error") throw outcome.error;
      return Object.freeze({ ...base(account), status: "unavailable", reason: outcome.reason, detail: outcome.detail });
    }
    if (result.status === "resource_limit") {
      return Object.freeze({
        ...base(account),
        status: "tooLarge",
        collection: Outcomes.collectionOf(result.collection),
        capacity: result.capacity,
        earliestExpiryNs: result.earliestExpiryNs,
      });
    }
    const { capability, version } = result;
    const orders = Rows.byId(result.orders.map((row) => Rows.toAccountOrder(row.id, row.owner, row)));
    const terms = result.stops.map((row) => Rows.toStopTerms(row.id, row.owner, row));
    // Enrichment stops with the caller's read and with the live-read lifecycle.
    const linked = GraphqlBoundary.linkSignals(signal, context.signal);
    const enriched = await Enrichment.enrichStops(
      terms,
      capability.datasetGeneration,
      {
        context,
        poolTypes: Pools.poolMarketTypes,
        readPerpStops: deps.readPerpStops,
        limitPrices: registry.limitPrices,
        deadlineMs,
      },
      linked.signal ?? Raise.unreachable("the read's own signal is always set"),
    ).finally(linked.dispose);
    const data: AccountOrdersData = Object.freeze({
      orders,
      stops: Rows.byId(enriched),
      version: Outcomes.versionOf(version),
      // The guard did not move during the read, so the version is the newest one the
      // producer had published when the read ended.
      sync: Object.freeze({
        caughtUp: true,
        latestGuardBlock: version.blockHash === null ? null : BigInt(version.blockNumber),
        processedHeight: result.processedHeight,
        chainStopsBlock: null,
      }),
      coverage: Outcomes.coverageOf(capability, deps.chainId),
      expiryCutoffNs: result.expiryCutoffNs,
      source: Outcomes.sourceOf(capability),
      observedAtMs: nowMs(),
    });
    return Object.freeze({ ...base(account), status: "ready", data });
  };

  const read = async (
    account: string,
    context: IndexerRead.RequestContext,
    signal: AbortSignal,
  ): Promise<AccountOrdersSnapshot> => {
    const lifecycle = context.signal;
    try {
      const result = await guarded(account, context, signal);
      const snapshot = await toSnapshot(account, result, context, signal);
      // `stopLive()` also closes the chain socket, which a limit-price read reports as
      // a failed read. A read the lifecycle ended must not resolve with that as data.
      if (lifecycle?.aborted === true) throw lifecycle.reason;
      return snapshot;
    } catch (error) {
      if (
        lifecycle?.aborted === true &&
        deps.ownerSignal?.aborted !== true &&
        !(error instanceof IndexerUnavailableError)
      ) {
        throw deps.liveReset(OPERATION);
      }
      throw error;
    }
  };

  // ---------------------------------------------------------------- live views

  const openConnection =
    deps.openConnection ??
    ((url: string, signal: AbortSignal) =>
      GraphqlWs.GraphqlWsConnection.open(url, {
        signal,
        onSinkError: (error) => deps.warn("an account stream frame handler threw", { error }),
      }));
  /** Aborts opens that `stopLive()` made pointless. */
  let lifecycle = new AbortController();
  let connection: LiveConnection | undefined;
  let opening: Promise<LiveConnection> | undefined;
  const streamConnection = (): Promise<LiveConnection> => {
    if (connection !== undefined && connection.failure === undefined) return Promise.resolve(connection);
    const url = deps.wsUrl ?? Raise.unreachable("subscribe refuses a client without a WebSocket endpoint");
    if (opening !== undefined) return opening;
    const signal = lifecycle.signal;
    const started = openConnection(url, signal).then(
      (opened) => {
        // `stopLive()` ran while the socket opened, or the last session left: nothing
        // wants it any more. Kept, it would stay open with no session to close it.
        if (signal.aborted || live.size === 0) {
          opened.close();
          throw deps.liveReset(SUBSCRIBE);
        }
        connection = opened;
        return opened;
      },
      (error: unknown) => {
        if (signal.aborted) throw deps.liveReset(SUBSCRIBE);
        throw error;
      },
    );
    opening = started;
    const forget = () => {
      if (opening === started) opening = undefined;
    };
    started.then(forget, forget);
    return started;
  };
  const closeConnection = () => {
    connection?.close();
    connection = undefined;
  };

  /** Adds the venue and the limit price to a live view's stops. */
  const enrich = (
    stops: readonly Rows.AccountStopTerms[],
    generation: string,
    signal: AbortSignal,
  ): Promise<readonly AccountStop[]> => {
    const context = deps.context();
    const linked = GraphqlBoundary.linkSignals(signal, context.signal);
    return Enrichment.enrichStops(
      stops,
      generation,
      {
        context,
        poolTypes: Pools.poolMarketTypes,
        readPerpStops: deps.readPerpStops,
        limitPrices: registry.limitPrices,
        deadlineMs,
      },
      linked.signal ?? Raise.unreachable("the session's own signal is always set"),
    ).finally(linked.dispose);
  };

  /** The indexer's live session of `account`. */
  const indexerSession = (account: string, publish: (view: AccountOrdersView) => void) =>
    new Session.AccountSession({
      chainId: deps.chainId,
      account,
      readSnapshot: (signal) => guarded(account, deps.context(), signal),
      readChildren: (batchIds, limits, signal) =>
        IndexerRead.gqlRequest(
          Streams.AccountChangeChildrenQuery,
          { batchIds: [...batchIds], orderChildLimit: limits.orders, stopChildLimit: limits.stops },
          deps.context(),
          undefined,
          { signal },
        ),
      connection: streamConnection,
      enrich,
      publish,
      nextRevision: () => registry.nextRevision(),
      nowMs,
      backoffMs: deps.backoffMs,
      warn: deps.warn,
    });

  const chainStops = deps.chainStops;
  const live = new Registry.LiveViews<AccountOrdersView>({
    createSession: (account, publish) =>
      chainStops === undefined
        ? indexerSession(account, publish)
        : new ChainStops.ChainStopsSession({
            ...chainStops,
            account,
            indexer: (indexerPublish) => indexerSession(account, indexerPublish),
            enrich,
            publish,
            nextRevision: () => registry.nextRevision(),
            nowMs,
            backoffMs: deps.backoffMs,
            warn: deps.warn,
          }),
    warn: deps.warn,
    onIdle: closeConnection,
    ...(deps.lingerMs === undefined ? {} : { lingerMs: deps.lingerMs }),
  });

  const stopLive = () => {
    lifecycle.abort();
    lifecycle = new AbortController();
    live.closeAll();
    closeConnection();
  };
  // The owner's close ends live views too, so no session retries against a closed client.
  deps.ownerSignal?.addEventListener("abort", stopLive, { once: true });

  const client: AccountOrdersClient = {
    async getSnapshot(input, options) {
      const account = accountOf(input, OPERATION);
      if (options?.signal?.aborted) throw options.signal.reason;
      // The owner closed the client: nothing reads for it any more.
      if (deps.ownerSignal?.aborted === true) throw deps.ownerSignal.reason;
      for (let attempt = 1; ; attempt += 1) {
        // A live view that is ready is already complete at its version, and never older
        // than what its listeners have. One that still reads a stop's values is not what
        // a snapshot returns: a snapshot is never `pending`.
        const current = live.current(account);
        if (current?.status === "ready" && !current.data.stops.some(isPending)) return current;
        const context = deps.context();
        const snapshot = await registry.snapshots.run(
          account,
          context.signal,
          (signal) => read(account, context, signal),
          options?.signal,
        );
        const settled = settle(snapshot, live.current(account));
        if (!("readAgain" in settled)) return settled;
        if (attempt < SNAPSHOT_READS) continue;
        // The live view has not caught up with a new dataset yet; the read is the newer state.
        if (settled.readAgain === "generation") return snapshot;
        throw new AccountViewError(
          OPERATION,
          "snapshotUnstable",
          "every read answered with an older version than the account's live view",
          { chainId: deps.chainId },
        );
      }
    },
    subscribe(input, onView) {
      const account = accountOf(input, SUBSCRIBE);
      if (typeof onView !== "function") throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
      // The owner closed the client: no live view starts again.
      if (deps.ownerSignal?.aborted === true) {
        return live.deliverOnce(Object.freeze({ status: "closed", ...base(account) }), onView);
      }
      if (!deps.context().url) throw new NotConfiguredError("config.indexerUrl", "account-view live updates");
      if (deps.wsUrl === undefined) {
        throw new NotConfiguredError(
          "config.indexerWsUrl",
          "account-view live updates (indexerUrl is not an absolute http(s) URL)",
        );
      }
      return live.subscribe(account, onView);
    },
  };
  return { client, stopLive };
}
