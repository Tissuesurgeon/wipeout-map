// Public types of the spot orders view: what `client.accountSpotOrders` returns.
//
// A spot orders view is one account's resting spot orders on one chain, read from the
// chain: every spot pool's own list of the account's orders. The list of spot pools is
// market metadata from the indexer; nothing about the account is. A pool whose orders
// cannot be read is named with its error, and its orders are missing, not absent.
// Protocol integers are `bigint` raw units (SDK-TYPE-007). Addresses stay lower-case
// strings, as the account view's other rows keep them.

import type { ContractRevertError, IndexerError, NotConfiguredError, RpcError } from "../errors.js";

/**
 *  One resting spot order of the account, as its pool stores it.
 *
 *  The pool keeps an order until it fills or someone cancels it, an expired one too:
 *  compare `expireTimestampNs` with the time to tell an order that can still fill.
 *
 * @category account views
 */
export interface AccountSpotOrder {
  /** The row id: `<pool>_<orderId>`, lower-case, as the indexer names an order. */
  readonly id: string;
  /** The spot pool, lower-case. It is also the market id. */
  readonly pool: string;
  /** The pool's order id. */
  readonly orderId: bigint;
  /** `true` for a bid (buy), `false` for an ask (sell). */
  readonly isBid: boolean;
  /** The limit price, raw quote units per whole base. */
  readonly price: bigint;
  /** The quantity as placed, raw base units. */
  readonly fullQuantity: bigint;
  /** The quantity still resting, raw base units. */
  readonly quantityRemaining: bigint;
  /** The expiry, as a Unix time in nanoseconds. `0n` means none. */
  readonly expireTimestampNs: bigint;
  /** The caller's tag the pool echoes back. `0n` when unused. */
  readonly userData: bigint;
}

/**
 *  Why a spot pool's orders could not be read: the call reverted, or the read did not complete.
 *
 * @category account views
 */
export type AccountSpotOrdersReadError = ContractRevertError | RpcError;

/**
 *  A spot pool whose orders the view could not read. Its orders are unknown, not absent.
 *
 * @category account views
 */
export interface AccountSpotUnreadPool {
  /** The spot pool, lower-case. */
  readonly pool: string;
  /** Why its orders could not be read. */
  readonly error: AccountSpotOrdersReadError;
}

/**
 *  One account's resting spot orders in every spot pool.
 *
 * @category account views
 */
export interface AccountSpotOrdersData {
  /**
   *  The resting orders of every spot pool the view could read, sorted by id. The orders
   *  of a pool in `unreadPools` are missing from it.
   */
  readonly orders: readonly AccountSpotOrder[];
  /**
   *  The spot pools whose orders could not be read, sorted by pool, each with its error.
   *  Their orders are unknown, not absent. A live view reads them again after a backoff.
   */
  readonly unreadPools: readonly AccountSpotUnreadPool[];
  /**
   * Whether discovery and pool reads cover every resting spot order. Unknown discovery
   * coverage makes this `false` even with no `unreadPools`; a stale view keeps prior orders.
   */
  readonly complete: boolean;
  /**
   *  The newest block the view read. `getSnapshot` reads every pool at this block. A live
   *  view reads again only the pool an event names, so another pool's orders can come
   *  from an earlier read, when no event of the account's orders in that pool has arrived
   *  since. Every 30 s a live view reads every pool again at one block.
   */
  readonly blockNumber: bigint;
  /** When the view was read, as a Unix time in milliseconds on this machine. */
  readonly observedAtMs: number;
}

/**
 *  One account's resting spot orders. The result of
 *  {@link AccountSpotOrdersClient.getSnapshot}, and the `ready` state of a live view.
 *  Check `data.complete`: a pool whose orders could not be read is in `data.unreadPools`.
 *
 * @category account views
 */
export interface AccountSpotOrdersSnapshot {
  readonly status: "ready";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly data: AccountSpotOrdersData;
}

/**
 *  An error a spot orders view reports: a chain call that reverted or did not complete,
 *  the indexer's list of spot pools that could not be read, or a client with no chain
 *  transport.
 *
 * @category account views
 */
export type AccountSpotOrdersViewError = ContractRevertError | RpcError | IndexerError | NotConfiguredError;

/**
 *  A live spot orders view has no data yet: the SDK is reading the account for the first time.
 *
 * @category account views
 */
export interface AccountSpotOrdersLoading {
  readonly status: "loading";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  Why a live spot orders view shows data that may be out of date.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `refreshFailed` | The last read failed: pool discovery failed or returned an unproven empty list, the head could not be read, or no pool could. The SDK tries again after a backoff; `error` says why. |
 *  | `reconnecting` | The chain subscription to the spot pools' order events was lost. The SDK subscribes again after a backoff and reads the account then. |
 *
 * @category account views
 */
export type AccountSpotOrdersStaleReason = "refreshFailed" | "reconnecting";

/**
 *  A live spot orders view keeps its last data while it recovers. The data was right at
 *  `data.blockNumber`; newer changes may be missing.
 *
 * @category account views
 */
export interface AccountSpotOrdersStale {
  readonly status: "stale";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  /** The last data. */
  readonly data: AccountSpotOrdersData;
  readonly reason: AccountSpotOrdersStaleReason;
  /** The error behind `refreshFailed`, or `null`. */
  readonly error: AccountSpotOrdersViewError | null;
}

/**
 *  A live spot orders view has no data, because its read failed. It is never an account
 *  with no orders.
 *
 *  The SDK tries again after a backoff unless `retrying` is `false`, which means the
 *  client has no chain transport.
 *
 * @category account views
 */
export interface AccountSpotOrdersFailed {
  readonly status: "failed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly error: AccountSpotOrdersViewError;
  /** Whether the SDK tries again on its own. */
  readonly retrying: boolean;
}

/**
 *  A live spot orders view ended: `stopLive()` stopped it, or the client's `signal`
 *  aborted. No view follows. After `stopLive()`, call `subscribe` again for a new one.
 *
 * @category account views
 */
export interface AccountSpotOrdersClosed {
  readonly status: "closed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  One state of a live view from {@link AccountSpotOrdersClient.subscribe}. Switch on `status`.
 *
 *  | Status | Has data | Means |
 *  | --- | --- | --- |
 *  | `loading` | no | The first read is in flight. |
 *  | `ready` | yes | Right at `data.blockNumber`, and read again as the account's orders change. A pool that could not be read is in `data.unreadPools`. |
 *  | `stale` | yes | The last data, while the SDK recovers. |
 *  | `failed` | no | The read failed. The SDK tries again unless `retrying` is `false`. |
 *  | `closed` | no | The view ended. |
 *
 * @category account views
 */
export type AccountSpotOrdersView =
  | AccountSpotOrdersLoading
  | AccountSpotOrdersSnapshot
  | AccountSpotOrdersStale
  | AccountSpotOrdersFailed
  | AccountSpotOrdersClosed;
