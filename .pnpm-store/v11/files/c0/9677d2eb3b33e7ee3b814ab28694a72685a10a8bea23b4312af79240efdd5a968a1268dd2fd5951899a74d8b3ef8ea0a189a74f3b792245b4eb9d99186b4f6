// An account's resting orders in one pool, read from the chain: the calls the perp
// positions view and the spot orders view share.
//
// Every pool kind shares the order book's views. A pool's `getOwnOpenOrders` answers for
// its caller, so it goes out as one direct call per pool, sent as the account, never
// through Multicall3 (which would ask for Multicall3's own orders). An order's details,
// `getOrder`, do not depend on the caller, so they ride a pinned batch.

import { decodeFunctionResult, encodeFunctionData, type Address, type Hex } from "viem";
import * as Raise from "../raise.js";
import * as ReadsAbi from "../readsAbi.js";
import * as PinnedBatch from "./pinnedBatch.js";

// Every pool kind shares the order book's views.
const orderAbi = ReadsAbi.binaryPoolReadAbi;

/** At most this many `getOwnOpenOrders` calls are in flight at once. */
const ORDER_ID_CONCURRENCY = 8;

/** `getOwnOpenOrders()`: it answers for its caller, so it is sent as the account. */
export const OWN_OPEN_ORDERS_CALL_DATA: Hex = encodeFunctionData({ abi: orderAbi, functionName: "getOwnOpenOrders" });

/** Decodes a `getOwnOpenOrders()` result. Throws on data that is not one. */
export function decodeOwnOpenOrders(data: Hex): readonly bigint[] {
  return decodeFunctionResult({ abi: orderAbi, functionName: "getOwnOpenOrders", data });
}

/** `getOrder(orderId)` on `pool`, as a pinned-batch call. */
export function orderCall(pool: Address, orderId: bigint) {
  const request = { abi: orderAbi, functionName: "getOrder", args: [orderId] } as const;
  return {
    target: pool,
    functionName: request.functionName,
    callData: encodeFunctionData(request),
    decode: (data: Hex) => decodeFunctionResult({ abi: orderAbi, functionName: request.functionName, data }),
  };
}

/** An order as `getOrder` returns it. */
export type PoolOrder = ReturnType<ReturnType<typeof orderCall>["decode"]>;

/** One resting order of the account, as its pool stores it: the row both views publish. */
export interface RestingOrder {
  readonly id: string;
  readonly pool: string;
  readonly orderId: bigint;
  readonly isBid: boolean;
  readonly price: bigint;
  readonly fullQuantity: bigint;
  readonly quantityRemaining: bigint;
  readonly expireTimestampNs: bigint;
  readonly userData: bigint;
}

/** An order's row: its id is `<pool>_<orderId>`, lower-case, as the indexer names an order. */
export function toRestingOrder(pool: Address, order: PoolOrder): RestingOrder {
  const poolId = pool.toLowerCase();
  return Object.freeze({
    id: `${poolId}_${order.orderId}`,
    pool: poolId,
    orderId: order.orderId,
    isBid: order.isBid,
    price: order.price,
    fullQuantity: order.fullQuantity,
    quantityRemaining: order.quantityRemaining,
    expireTimestampNs: order.expireTimestampNs,
    userData: order.userData,
  });
}

/** A pool whose open order ids to read, and the key its result is stored under. */
export interface OrderIdTarget {
  readonly key: string;
  readonly pool: Address;
}

/** Each pool's open order ids, by key. A failed read is kept with its error. */
export type OrderIdReads = ReadonlyMap<string, PinnedBatch.Settled<readonly bigint[]>>;

/**
 *  Each pool's open order ids at `blockNumber`: one direct call per pool, sent as
 *  `account`. Rejects only with `signal`'s reason, before a call it has not sent yet.
 */
export async function readOrderIds(
  chain: PinnedBatch.PinnedChain,
  account: Address,
  pools: readonly OrderIdTarget[],
  blockNumber: bigint,
  signal: AbortSignal | undefined,
): Promise<OrderIdReads> {
  const ids = new Map<string, PinnedBatch.Settled<readonly bigint[]>>();
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < pools.length) {
      PinnedBatch.stopIfAborted(signal);
      const target = pools[next] ?? Raise.unreachable("the loop stops at the last pool");
      next += 1;
      try {
        const data = await chain.call(target.pool, OWN_OPEN_ORDERS_CALL_DATA, blockNumber, account);
        ids.set(target.key, { ok: true, value: decodeOwnOpenOrders(data) });
      } catch (caught) {
        ids.set(target.key, { ok: false, error: PinnedBatch.readErrorOf(caught, "getOwnOpenOrders", target.pool) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(ORDER_ID_CONCURRENCY, pools.length) }, worker));
  return ids;
}
