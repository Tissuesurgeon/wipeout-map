import { AccountViewError, IndexerUnavailableError, InvalidInputError, NotConfiguredError } from "../errors.js";
import type { IndexerError } from "../errors.js";
import * as IndexerRead from "../indexerRead.js";
import type { PerpStopOrderRead, PerpStopOrderRef } from "../perp/stops.js";
import * as ChainStops from "./chainStops.js";
import * as Session from "./session.js";
import type { AccountOrdersGetSnapshotOptions, AccountOrdersSnapshot, AccountOrdersView } from "./types.js";
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
export type AccountOrdersClientGetSnapshotError = InvalidInputError | NotConfiguredError | AccountViewError | IndexerUnavailableError | IndexerError;
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
/** Builds `client.accountOrders`. One per engine. */
export declare function createAccountOrdersWithDeps(deps: AccountOrdersDeps): AccountOrdersOwner;
