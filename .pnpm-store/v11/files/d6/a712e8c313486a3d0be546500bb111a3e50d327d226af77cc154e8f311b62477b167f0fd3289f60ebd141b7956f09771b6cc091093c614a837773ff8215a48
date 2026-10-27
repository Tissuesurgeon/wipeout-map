import type { Address } from "viem";
import * as PinnedBatch from "./pinnedBatch.js";
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
export type SpotPoolRead = {
    readonly ok: true;
    /** The open order ids the pool holds for the account, for the next read's `knownOrders`. */
    readonly orderIds: readonly bigint[];
    /** The pool's resting orders of the account, sorted by id. */
    readonly orders: readonly AccountSpotOrder[];
} | {
    readonly ok: false;
    readonly error: PinnedBatch.ChainReadError;
};
export interface AccountSpotOrdersRead {
    readonly blockNumber: bigint;
    /** The pools read, lower-cased, in the order given. */
    readonly pools: readonly Address[];
    /** Each pool's orders, or why they could not be read, by pool. */
    readonly byPool: ReadonlyMap<string, SpotPoolRead>;
}
/**
 *  Reads one account's resting orders in every pool of `input.pools`, at one block.
 *
 *  A pool whose order ids, or one of whose orders' details, cannot be read settles with
 *  the read's `RpcError` or `ContractRevertError`. Rejects only when the head or a whole
 *  batch cannot be read, and with `signal`'s reason once it aborts, before the next call.
 */
export declare function readAccountSpotOrders(input: ReadAccountSpotOrdersInput, chain: PinnedBatch.PinnedChain, signal?: AbortSignal): Promise<AccountSpotOrdersRead>;
/**
 *  The error of a read that could read none of its pools: it learned nothing about the
 *  account, so it is a failed read, never an account with no orders. `undefined` when it
 *  read a pool, or had none to read.
 */
export declare function nothingRead(read: AccountSpotOrdersRead): PinnedBatch.ChainReadError | undefined;
/** The view's orders and unread pools from each pool's latest read: orders sorted by id, pools sorted by pool. */
export declare function viewOf(byPool: ReadonlyMap<string, SpotPoolRead>): {
    readonly orders: readonly AccountSpotOrder[];
    readonly unreadPools: readonly AccountSpotUnreadPool[];
};
