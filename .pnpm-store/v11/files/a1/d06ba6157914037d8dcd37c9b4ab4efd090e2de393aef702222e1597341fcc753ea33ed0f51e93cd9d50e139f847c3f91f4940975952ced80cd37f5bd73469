import { type Address, type PublicClient } from "viem";
import { InvalidInputError, RpcError } from "../errors.js";
import type { ContractRevertError, NotConfiguredError } from "../errors.js";
import * as PositionsPush from "./positionsPush.js";
import * as PositionsRead from "./positionsRead.js";
import * as PinnedBatch from "./pinnedBatch.js";
import type { AccountPositionsSnapshot, AccountPositionsView } from "./positionsTypes.js";
/**
 *  Options for {@link AccountPositionsClient.getSnapshot}.
 *
 * @category account views
 */
export interface AccountPositionsGetSnapshotOptions {
    /** Stops waiting for the read. The caller's abort reason is rethrown unchanged. */
    readonly signal?: AbortSignal;
}
/**
 *  Failures from {@link AccountPositionsClient.getSnapshot}.
 *
 * @category account views
 */
export type AccountPositionsClientGetSnapshotError = InvalidInputError | NotConfiguredError | ContractRevertError | RpcError;
/**
 *  One account's open perp positions, resting perp orders and cross-margin state, read
 *  from the chain.
 *
 *  Reach it as `client.accountPositions`; the chain is the engine's own. On an exchange,
 *  use `exchange.engineFor(chainId).accountPositions`.
 *
 *  **Details**
 *
 *  The view reads the MarginBank's own list of the pools the account is active in, so
 *  it holds every open position: in unlisted and restricted pools too, and positions
 *  the account did not open itself, such as an ADL. The same list names the pools where
 *  the account only has resting orders, so it holds every resting order too. Every
 *  figure comes from one block.
 *
 * @category account views
 */
export interface AccountPositionsClient {
    /**
     *  Reads one account's open perp positions, resting orders and margin in one MarginBank,
     *  at one block.
     *
     *  **Details**
     *
     *  - `marginBank`: The MarginBank that holds the positions, as a perp market row names it.
     *  - `account`: The trader's address, in any letter case. The view lower-cases it.
     *  - `options`: `signal` stops waiting. Once every caller of the read has stopped, it
     *    sends no more calls. The caller's abort reason is rethrown unchanged.
     *  - Returns: A `ready` view with every open position, every resting order and the
     *    account's margin. See {@link AccountPositionsData}.
     *
     *  The read pins the chain head and reads everything at that block: usually three
     *  Multicall3 calls, one when a previous read already named the account's pools and
     *  orders, and one call per figure on a chain without Multicall3. Each pool's order ids
     *  are one more call per pool, sent as the account, because the pool answers for its
     *  caller. Each position is marked with the MarginBank's own math, and its liquidation
     *  price is solved from the same block.
     *
     *  A figure the chain could not give is `unknown` with the reason, never zero. A pool
     *  whose price feed is stale keeps its position, with its marked figures unknown. The
     *  orders are `unknown` when one pool's could not be read, and the positions stand.
     *  Concurrent calls for one account share one read. A read that finishes after a live
     *  view of the account has moved past it hands back that view instead, or reads once
     *  more, so the call never returns an older block than the view's listeners already have.
     *
     *  **Gotchas**
     *
     *  - The account's health, and so every liquidation price, is unknown while any market
     *    the account holds cannot be priced: the MarginBank's health read walks them all.
     *  - The leverage cap is the account's own setting on the pool; the margin a position
     *    needs under it is the stricter of the cap and the market's rate.
     *  - A pool keeps an order until it fills or someone cancels it, an expired one too.
     *    Compare `expireTimestampNs` with the time to tell an order that can still fill.
     *
     * **Example** (Showing an account's perp positions)
     *
     *  ```ts
     *  const snapshot = await client.accountPositions.getSnapshot(marginBank, account);
     *  for (const position of snapshot.data.positions) {
     *    const pnl = position.marks.status === "known" ? position.marks.unrealizedPnl : null;
     *    console.log(position.pool, position.size, pnl ?? "unknown");
     *  }
     *  ```
     *
     * @throws {@link InvalidInputError} `marginBank` or `account` is not an address.
     * @throws {@link NotConfiguredError} The client has no chain transport.
     * @throws {@link ContractRevertError} The account's state or a position read reverted.
     * @throws {@link RpcError} A chain read did not complete, or every read answered from an older block than the account's live view.
     */
    getSnapshot(marginBank: string, account: string, options?: AccountPositionsGetSnapshotOptions): Promise<AccountPositionsSnapshot>;
    /**
     *  Follows one account's open perp positions, resting orders and margin in one
     *  MarginBank as they change.
     *
     *  **Details**
     *
     *  - `marginBank`: The MarginBank that holds the positions, as a perp market row names it.
     *  - `account`: The trader's address, in any letter case. The view lower-cases it.
     *  - `onView`: Receives every state of the view, each one complete: see
     *    {@link AccountPositionsView}. Views arrive in order, a microtask after the SDK
     *    produces them, and never during this call. Listeners share each view, so it is
     *    frozen all the way down; an `error` in it is not.
     *  - Returns: The function that stops this listener. Calling it twice does nothing.
     *
     *  The view starts `loading`, then goes `ready` with the first read, which is the same
     *  one-block read as {@link AccountPositionsClient.getSnapshot}. After it, the Somnia
     *  node pushes that read itself (`somnia_watch`), run at the block of each change:
     *
     *  - when the MarginBank emits an event naming the account (a fill, an order's
     *    collateral lock or release, a deposit or withdrawal, a liquidation, a position
     *    transferred to it);
     *  - on every price write while the account holds positions, because their marks,
     *    PnL and liquidation prices move with the price. This needs
     *    `addresses.priceFeedScheduler` in the client's configuration.
     *
     *  Each push is one complete read, and a view is never older than the one before it;
     *  two pushes from one block give one view. Fills and cancels arrive in the push. A
     *  new order, or a pool the push does not read yet, costs one full read. Whenever the
     *  orders or pools change, the push opens again for them. Until the node confirms it,
     *  the account's events make the SDK read, as before the first push, and the SDK reads
     *  once at the confirmation, so a change made while it opened is not missed. A push the
     *  node does not confirm within 10 s is dropped and opened again after a backoff.
     *  While the account holds positions and no push arrives, the SDK reads again every
     *  5 s. A node that does not push, such as a local node, leaves the SDK on its own
     *  reads: at once on the account's events, and every 5 s while it holds positions.
     *
     *  A failed read keeps the last data as `stale`, or is `failed` when there is none,
     *  and the SDK tries again after a backoff; a push that keeps failing the same way
     *  gives one view, not one per push. A lost push gives `stale`, and the SDK reads the
     *  account at once and opens the push again after a backoff. A lost event
     *  subscription gives `stale`, and the SDK subscribes again after a backoff and
     *  reads the account then.
     *
     *  Listeners of one account share one session. When the last one stops, the session
     *  lingers for 30 s, so a screen that comes back reuses it. `stopLive()` ends every
     *  session with a `closed` view.
     *
     *  **Gotchas**
     *
     *  - Nothing is folded from the events: each push or read is the whole state. While
     *    the account holds an open position, an unannounced change shows at the next
     *    configured price push or 5 s inactivity read.
     *  - Pool `OrderAmendedInPlace` events are not watched. An amendment that leaves
     *    collateral unchanged can emit no MarginBank account event. With only resting
     *    orders, the view can keep the old order until another account event or a session
     *    restart causes a read. A ready live `getSnapshot` reuses that view without a read.
     *  - Without `addresses.priceFeedScheduler`, marks and PnL follow the 5 s read.
     *  - An account with no open position is read again only on its events.
     *  - A listener that throws is reported through the client's debug channel and does
     *    not stop the view.
     *
     * **Example** (Keeping a screen on an account's positions)
     *
     *  ```ts
     *  const stop = client.accountPositions.subscribe(marginBank, account, (view) => {
     *    if (view.status === "ready" || view.status === "stale") render(view.data.positions, view.status === "stale");
     *  });
     *  // Later, when the screen closes:
     *  stop();
     *  ```
     *
     * @throws {@link InvalidInputError} `marginBank` or `account` is not an address, or `onView` is not a function.
     */
    subscribe(marginBank: string, account: string, onView: (view: AccountPositionsView) => void): () => void;
}
/**
 *  Failures from {@link AccountPositionsClient.subscribe}. Failures after the call arrive
 *  as views, not as errors.
 *
 * @category account views
 */
export type AccountPositionsClientSubscribeError = InvalidInputError;
export interface AccountPositionsDeps {
    readonly chainId: number;
    /** The chain the reads go to. Throws `NotConfiguredError` when the client has none. */
    readonly chain: () => PositionsRead.PositionsChain;
    /**
     *  Subscribes to the MarginBank events naming `account`, and returns the release.
     *  `onLog` gets the log's block, `null` when it names none. `onError` fires at most
     *  once, and `onOpen` once, when the node confirms the subscription; neither during
     *  the call. Throws `NotConfiguredError` without a chain transport.
     */
    readonly watch: (marginBank: Address, account: Address, onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen: () => void) => () => void;
    /** Opens one `somnia_watch` subscription on the engine's socket. Absent: live views only read. */
    readonly watchPushes?: PositionsPush.WatchPushes;
    /** The price feed whose writes push the state: `addresses.priceFeedScheduler`. Absent: pushes come on the account's events only. */
    readonly priceFeed?: Address;
    /** The delay before retry `attempt` of a live view, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    /** Reports what a live view cannot report as a view: a listener that threw, a lost subscription. */
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
    /** The clock of `observedAtMs`, in milliseconds. */
    readonly nowMs?: () => number;
    /** How long a live view outlives its last listener. Tests shorten it. */
    readonly lingerMs?: number;
    /** The owner's own signal. Its abort ends every live view, as `stopLive()` does. */
    readonly ownerSignal?: AbortSignal | undefined;
}
/** `client.accountPositions` and the owner's handle on its live views. */
export interface AccountPositionsOwner {
    readonly client: AccountPositionsClient;
    /** Ends every live view with `closed`. */
    stopLive(): void;
}
/** Builds `client.accountPositions`. One per engine. */
export declare function createAccountPositionsWithDeps(deps: AccountPositionsDeps): AccountPositionsOwner;
/** The pinned-batch chain calls, on the engine's viem client. */
export declare function chainOf(client: PublicClient): PinnedBatch.PinnedChain;
