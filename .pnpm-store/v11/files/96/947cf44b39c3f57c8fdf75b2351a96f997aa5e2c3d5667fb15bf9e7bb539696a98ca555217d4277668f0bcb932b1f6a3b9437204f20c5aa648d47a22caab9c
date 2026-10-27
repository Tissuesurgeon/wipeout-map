import { type Address } from "viem";
import { IndexerError, InvalidInputError, RpcError } from "../errors.js";
import type { ContractRevertError, NotConfiguredError } from "../errors.js";
import * as PinnedBatch from "./pinnedBatch.js";
import type * as Events from "./spotOrdersEvents.js";
import * as SpotOrdersSession from "./spotOrdersSession.js";
import type { AccountSpotOrdersSnapshot, AccountSpotOrdersView } from "./spotOrdersTypes.js";
/**
 *  Options for {@link AccountSpotOrdersClient.getSnapshot}.
 *
 * @category account views
 */
export interface AccountSpotOrdersGetSnapshotOptions {
    /** Stops waiting for the read. The caller's abort reason is rethrown unchanged. */
    readonly signal?: AbortSignal;
}
/**
 *  Failures from {@link AccountSpotOrdersClient.getSnapshot}.
 *
 * @category account views
 */
export type AccountSpotOrdersClientGetSnapshotError = InvalidInputError | NotConfiguredError | IndexerError | ContractRevertError | RpcError;
/**
 *  One account's resting spot orders, read from the chain.
 *
 *  Reach it as `client.accountSpotOrders`; the chain is the engine's own. On an exchange,
 *  use `exchange.engineFor(chainId).accountSpotOrders`.
 *
 *  **Details**
 *
 *  Every spot pool keeps its own list of an account's open orders, and the view asks each
 *  of them, so it holds every resting spot order: in unlisted markets too. The chain keeps
 *  no list of the pools an account trades in, so the view asks every spot pool the
 *  indexer's market list names. Resting perp orders are on the positions view instead,
 *  `client.accountPositions`, read at the same block as the positions.
 *
 * @category account views
 */
export interface AccountSpotOrdersClient {
    /**
     *  Reads one account's resting spot orders, at one block.
     *
     *  **Details**
     *
     *  - `account`: The trader's address, in any letter case. The view lower-cases it.
     *  - `options`: `signal` stops waiting. Once every caller of the read has stopped, it
     *    sends no more calls. The caller's abort reason is rethrown unchanged.
     *  - Returns: A `ready` view with every resting spot order. See {@link AccountSpotOrdersData}.
     *
     *  The read pins the chain head and reads everything at that block: one call per spot
     *  pool for the account's order ids, sent as the account because the pool answers for
     *  its caller, then one Multicall3 call for the orders' details (one call per order on a
     *  chain without Multicall3). Orders a previous read found ride the first round.
     *
     *  A pool whose orders cannot be read is in `data.unreadPools`, with its error, and its
     *  orders are missing from `data.orders`; `data.complete` is then `false`. A read that
     *  can read no pool fails. Empty pool discovery also fails unless its boundary proves
     *  an empty pool universe. Concurrent calls for one account share one read. While a live
     *  view of the account is `ready`, the call returns it. A read that finishes after the
     *  live view has moved past it hands back that view instead, or reads once more, so the
     *  call never returns an older block than the view's listeners already have.
     *
     *  **Gotchas**
     *
     *  - A pool keeps an order until it fills or someone cancels it, an expired one too.
     *    Compare `expireTimestampNs` with the time to tell an order that can still fill.
     *  - The list of spot pools comes from the indexer's market list. Each full read
     *    discovers it again, so a pool listed just now joins the next full read.
     *
     * **Example** (Showing an account's resting spot orders)
     *
     *  ```ts
     *  const snapshot = await client.accountSpotOrders.getSnapshot(account);
     *  for (const order of snapshot.data.orders) {
     *    console.log(order.pool, order.isBid ? "buy" : "sell", order.quantityRemaining, "at", order.price);
     *  }
     *  ```
     *
     * @throws {@link InvalidInputError} `account` is not an address.
     * @throws {@link NotConfiguredError} The client has no chain transport.
     * @throws {@link IndexerError} The indexer's list of spot pools could not be read, or empty discovery cannot prove an empty pool universe.
     * @throws {@link ContractRevertError} Every pool's order read reverted.
     * @throws {@link RpcError} The head, or every pool's orders, could not be read, or every read answered from an older block than the account's live view.
     */
    getSnapshot(account: string, options?: AccountSpotOrdersGetSnapshotOptions): Promise<AccountSpotOrdersSnapshot>;
    /**
     *  Follows one account's resting spot orders, and calls `onView` with every state of
     *  the view.
     *
     *  **Details**
     *
     *  - `account`: The trader's address, in any letter case. The view lower-cases it.
     *  - `onView`: Receives every state of the view, each one complete: see
     *    {@link AccountSpotOrdersView}. Views arrive in order, a microtask after the SDK
     *    produces them, and never during this call. Listeners share each view, so it is
     *    frozen all the way down; an `error` in it is not.
     *  - Returns: The function that stops this listener. Calling it twice does nothing.
     *
     *  The view starts `loading`, then goes `ready` with the first read, which is the same
     *  one-block read as {@link AccountSpotOrdersClient.getSnapshot}. After it, the SDK
     *  subscribes over the chain socket to every placement in every spot pool, because only
     *  a placement names its owner, and to the later events of the account's own orders by
     *  id. When one of them concerns the account, it reads again, at once, the pool that
     *  emitted it: an order the account placed, or a fill, cancel, expiry, reduce or amend of
     *  one of its orders. So a change shows within a block or so. A read that lands before
     *  the block of the event that asked for it reads that pool again. The SDK reads every
     *  pool again once the node confirms the subscription, because a change before that
     *  reached neither, and 30 s after it last read them all, so a subscription that stops
     *  without an error costs at most that.
     *
     *  A pool that cannot be read is in `data.unreadPools`, and the SDK reads it again after
     *  a backoff while the other pools stay live. A read that fails, because the head or no
     *  pool could be read, keeps the last data as `stale`, or is `failed` when there is
     *  none, and the SDK tries again after a backoff. Failed or unproven empty pool
     *  discovery keeps known orders and subscriptions, with `data.complete` set to `false`
     *  until discovery recovers. A lost subscription gives `stale`. The SDK subscribes again after a backoff and reads every pool then. A view is never
     *  older than the one before it.
     *
     *  Listeners of one account share one session. When the last one stops, the session
     *  lingers for 30 s, so a screen that comes back reuses it. `stopLive()` ends every
     *  session with a `closed` view, and so does an abort of the client's `signal`, after
     *  which `subscribe` gives only `closed`.
     *
     *  **Gotchas**
     *
     *  - The SDK reads the pool's list again on each change rather than folding the event,
     *    so each pool's orders are a whole read of that pool. An in-place amend keeps its
     *    order id; the read updates all its terms.
     *  - The subscription opens again whenever the account gains an order, so it names the
     *    new id. The old one stays until the node confirms the new one. Past 1,000 orders it
     *    follows every order event of the spot pools instead.
     *  - A listener that throws is reported through the client's debug channel and does
     *    not stop the view.
     *
     * **Example** (Keeping a screen on an account's spot orders)
     *
     *  ```ts
     *  const stop = client.accountSpotOrders.subscribe(account, (view) => {
     *    if (view.status === "ready" || view.status === "stale") render(view.data.orders, view.status === "stale");
     *  });
     *  // Later, when the screen closes:
     *  stop();
     *  ```
     *
     * @throws {@link InvalidInputError} `account` is not an address, or `onView` is not a function.
     */
    subscribe(account: string, onView: (view: AccountSpotOrdersView) => void): () => void;
}
/**
 *  Failures from {@link AccountSpotOrdersClient.subscribe}. Failures after the call
 *  arrive as views, not as errors.
 *
 * @category account views
 */
export type AccountSpotOrdersClientSubscribeError = InvalidInputError;
/** A discovery boundary that has proved the entire pool universe, including an empty one. */
export interface SpotPoolDiscovery {
    readonly pools: readonly Address[];
    readonly authoritative: true;
}
export interface AccountSpotOrdersDeps {
    readonly chainId: number;
    /** The chain the reads go to. Throws `NotConfiguredError` when the client has none. */
    readonly chain: () => PinnedBatch.PinnedChain;
    /**
     * Every spot pool, in any letter case. An empty array has unknown coverage; only an
     * authoritative result proves an empty universe. Rejects with the indexer's error.
     * The owning discovery boundary must pass `signal` to its indexer request.
     */
    readonly spotPools: (signal: AbortSignal) => Promise<readonly Address[] | SpotPoolDiscovery>;
    /**
     *  Subscribes to the logs `filters` match, and returns the release. `onLog` gets
     *  `undefined` for a log that does not read. `onError` fires at most once, and `onOpen`
     *  once, when the node confirms the subscription; neither during the call. Throws
     *  `NotConfiguredError` without a chain transport.
     */
    readonly watch: (filters: readonly Events.PoolLogFilter[], onLog: (log: SpotOrdersSession.SpotOrderLog | undefined) => void, onError: () => void, onOpen: () => void) => () => void;
    /** The delay before retry `attempt` of a live view, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    /** Reports what a live view cannot report as a view: a listener that threw, a lost subscription. */
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
    /** The clock of `observedAtMs`, in milliseconds. */
    readonly nowMs?: () => number;
    /** How long a live view outlives its last listener. Tests shorten it. */
    readonly lingerMs?: number;
    /** The owner's own signal. Its abort closes every view for good. */
    readonly ownerSignal?: AbortSignal | undefined;
    /** The resettable live-read lifecycle; snapshots never join a flight from an ended lifecycle. */
    readonly lifecycle?: () => AbortSignal | undefined;
}
/** `client.accountSpotOrders` and the owner's handle on its live views. */
export interface AccountSpotOrdersOwner {
    readonly client: AccountSpotOrdersClient;
    /** Ends every live view with `closed`. */
    stopLive(): void;
}
/** Builds `client.accountSpotOrders`. One per engine. */
export declare function createAccountSpotOrdersWithDeps(deps: AccountSpotOrdersDeps): AccountSpotOrdersOwner;
