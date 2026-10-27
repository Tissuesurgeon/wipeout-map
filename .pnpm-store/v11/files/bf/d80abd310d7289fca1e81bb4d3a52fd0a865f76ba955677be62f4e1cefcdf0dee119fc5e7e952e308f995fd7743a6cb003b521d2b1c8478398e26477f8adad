// One account's resting spot orders, read from the chain at one block.
//
// The chain keeps no list of the spot pools an account trades in, so every spot pool is
// asked; there are few of them, and the caller names them. A live view names only the
// pool an event concerns. Each pool's `getOwnOpenOrders` answers for its caller, so it
// goes out as one direct call per pool, sent as the account. The orders' details then
// ride a pinned batch. Ids a previous read found ride the first batch, alongside the id
// reads, so a steady view costs one round.
//
// Everything is pinned to one block, so the read describes one state. A pool whose ids,
// or one of whose orders' details, cannot be read is reported on its own, with the
// error, and the other pools are still read: a list never omits a pool's orders without
// saying so. The read itself fails only when the head or a whole batch cannot be read.

import type { Address } from "viem";
import * as Raise from "../raise.js";
import * as Canonical from "./canonical.js";
import * as PinnedBatch from "./pinnedBatch.js";
import * as PoolOrders from "./poolOrders.js";
import type { AccountSpotOrder, AccountSpotUnreadPool } from "./spotOrdersTypes.js";

export interface ReadAccountSpotOrdersInput {
  /** The account, lower-cased. */
  readonly account: Address;
  /** The spot pools to read, lower-cased. */
  readonly pools: readonly Address[];
  /** Open order ids per pool from a previous read; their details ride the first batch. */
  readonly knownOrders?: ReadonlyMap<string, readonly bigint[]>;
}

/** One pool's part of a read: the account's orders in it, or why they could not be read. */
export type SpotPoolRead =
  | {
      readonly ok: true;
      /** The open order ids the pool holds for the account, for the next read's `knownOrders`. */
      readonly orderIds: readonly bigint[];
      /** The pool's resting orders of the account, sorted by id. */
      readonly orders: readonly AccountSpotOrder[];
    }
  | { readonly ok: false; readonly error: PinnedBatch.ChainReadError };

export interface AccountSpotOrdersRead {
  readonly blockNumber: bigint;
  /** The pools read, lower-cased, in the order given. */
  readonly pools: readonly Address[];
  /** Each pool's orders, or why they could not be read, by pool. */
  readonly byPool: ReadonlyMap<string, SpotPoolRead>;
}

function orderKey(pool: string, orderId: bigint): string {
  return `${pool}:${orderId}`;
}

/**
 *  Reads one account's resting orders in every pool of `input.pools`, at one block.
 *
 *  A pool whose order ids, or one of whose orders' details, cannot be read settles with
 *  the read's `RpcError` or `ContractRevertError`. Rejects only when the head or a whole
 *  batch cannot be read, and with `signal`'s reason once it aborts, before the next call.
 */
export async function readAccountSpotOrders(
  input: ReadAccountSpotOrdersInput,
  chain: PinnedBatch.PinnedChain,
  signal?: AbortSignal,
): Promise<AccountSpotOrdersRead> {
  PinnedBatch.stopIfAborted(signal);
  const blockNumber = await chain.blockNumber();
  const pools = input.pools;
  const details = new Map<string, PinnedBatch.Slot<PoolOrders.PoolOrder>>();
  const first = new PinnedBatch.Batch();
  for (const pool of pools) {
    for (const orderId of input.knownOrders?.get(pool) ?? []) {
      details.set(orderKey(pool, orderId), first.add(PoolOrders.orderCall(pool, orderId)));
    }
  }
  // The known orders' details and every pool's order ids do not wait on each other.
  const [, ids] = await Promise.all([
    first.run(chain, blockNumber, signal),
    PoolOrders.readOrderIds(
      chain,
      input.account,
      pools.map((pool) => ({ key: pool, pool })),
      blockNumber,
      signal,
    ),
  ]);

  const second = new PinnedBatch.Batch();
  for (const pool of pools) {
    const settled = ids.get(pool) ?? Raise.unreachable("every pool's order ids were asked for");
    if (!settled.ok) continue;
    for (const orderId of settled.value) {
      const key = orderKey(pool, orderId);
      if (!details.has(key)) details.set(key, second.add(PoolOrders.orderCall(pool, orderId)));
    }
  }
  await second.run(chain, blockNumber, signal);

  const byPool = new Map<string, SpotPoolRead>();
  for (const pool of pools) {
    const settled = ids.get(pool) ?? Raise.unreachable("every pool's order ids were asked for");
    byPool.set(pool, settled.ok ? poolRead(pool, settled.value, details) : { ok: false, error: settled.error });
  }
  return { blockNumber, pools, byPool };
}

/** A pool's orders from their details, or the first detail that failed: the pool's list is whole or unread. */
function poolRead(
  pool: Address,
  orderIds: readonly bigint[],
  details: ReadonlyMap<string, PinnedBatch.Slot<PoolOrders.PoolOrder>>,
): SpotPoolRead {
  const orders: AccountSpotOrder[] = [];
  for (const orderId of orderIds) {
    const slot = details.get(orderKey(pool, orderId)) ?? Raise.unreachable("every listed order was read");
    const settled = slot.result;
    if (!settled.ok) return { ok: false, error: settled.error };
    orders.push(PoolOrders.toRestingOrder(pool, settled.value));
  }
  orders.sort(compareOrders);
  return { ok: true, orderIds, orders: Object.freeze(orders) };
}

function compareOrders(left: AccountSpotOrder, right: AccountSpotOrder): number {
  return Canonical.compareCodeUnits(left.id, right.id);
}

/**
 *  The error of a read that could read none of its pools: it learned nothing about the
 *  account, so it is a failed read, never an account with no orders. `undefined` when it
 *  read a pool, or had none to read.
 */
export function nothingRead(read: AccountSpotOrdersRead): PinnedBatch.ChainReadError | undefined {
  let error: PinnedBatch.ChainReadError | undefined;
  for (const pool of read.pools) {
    const settled = read.byPool.get(pool) ?? Raise.unreachable("a read settles every pool it names");
    if (settled.ok) return undefined;
    error ??= settled.error;
  }
  return error;
}

/** The view's orders and unread pools from each pool's latest read: orders sorted by id, pools sorted by pool. */
export function viewOf(byPool: ReadonlyMap<string, SpotPoolRead>): {
  readonly orders: readonly AccountSpotOrder[];
  readonly unreadPools: readonly AccountSpotUnreadPool[];
} {
  const orders: AccountSpotOrder[] = [];
  const unreadPools: AccountSpotUnreadPool[] = [];
  for (const [pool, settled] of byPool) {
    if (settled.ok) orders.push(...settled.orders);
    else unreadPools.push({ pool, error: settled.error });
  }
  orders.sort(compareOrders);
  unreadPools.sort((left, right) => Canonical.compareCodeUnits(left.pool, right.pool));
  return { orders, unreadPools };
}
