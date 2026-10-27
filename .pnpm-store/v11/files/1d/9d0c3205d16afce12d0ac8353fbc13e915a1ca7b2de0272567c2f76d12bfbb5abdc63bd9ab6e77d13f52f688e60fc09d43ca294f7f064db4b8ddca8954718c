import { type Address, type Hex } from "viem";
import * as PinnedBatch from "./pinnedBatch.js";
/** `getOwnOpenOrders()`: it answers for its caller, so it is sent as the account. */
export declare const OWN_OPEN_ORDERS_CALL_DATA: Hex;
/** Decodes a `getOwnOpenOrders()` result. Throws on data that is not one. */
export declare function decodeOwnOpenOrders(data: Hex): readonly bigint[];
/** `getOrder(orderId)` on `pool`, as a pinned-batch call. */
export declare function orderCall(pool: Address, orderId: bigint): {
    target: `0x${string}`;
    functionName: "getOrder";
    callData: `0x${string}`;
    decode: (data: Hex) => {
        price: bigint;
        orderId: bigint;
        isBid: boolean;
        owner: `0x${string}`;
        userData: bigint;
        fullQuantity: bigint;
        quantityRemaining: bigint;
        expireTimestampNs: bigint;
    };
};
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
export declare function toRestingOrder(pool: Address, order: PoolOrder): RestingOrder;
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
export declare function readOrderIds(chain: PinnedBatch.PinnedChain, account: Address, pools: readonly OrderIdTarget[], blockNumber: bigint, signal: AbortSignal | undefined): Promise<OrderIdReads>;
