import { type Address, type Hex } from "viem";
import * as PinnedBatch from "./pinnedBatch.js";
import * as PoolOrders from "./poolOrders.js";
import type { AccountMargin, AccountPerpOrder, AccountPosition, AccountPositionsFigure } from "./positionsTypes.js";
/** The chain calls this read makes: the shared pinned-batch port. */
export type PositionsChain = PinnedBatch.PinnedChain;
/** What a previous read found, so the next read's first batch reads it at once. */
export interface KnownAccountState {
    /** Pools per bank. */
    readonly pools: ReadonlyMap<string, readonly Address[]>;
    /** Open order ids per pool, keyed `<bank>:<pool>`, lower-case. */
    readonly orderIds: ReadonlyMap<string, readonly bigint[]>;
}
export interface ReadAccountPositionsInput {
    /** The account, lower-cased. */
    readonly account: Address;
    /** The MarginBanks to read, lower-cased. */
    readonly marginBanks: readonly Address[];
    /** Pools per bank from a previous read, read in the first batch. */
    readonly knownPools?: ReadonlyMap<string, readonly Address[]>;
    /** Open order ids per known pool from a previous read, keyed `<bank>:<pool>`; their details ride the first batch. */
    readonly knownOrders?: ReadonlyMap<string, readonly bigint[]>;
}
export interface AccountPositionsRead {
    readonly blockNumber: bigint;
    readonly positions: readonly AccountPosition[];
    readonly margins: readonly AccountMargin[];
    /** The account's resting orders in every listed pool. Unknown when one pool's could not be read. */
    readonly orders: AccountPositionsFigure<readonly AccountPerpOrder[]>;
    /** The pools each bank lists for the account, for the next read's `knownPools`. */
    readonly pools: ReadonlyMap<string, readonly Address[]>;
    /** The order ids each listed pool holds for the account, for the next read's `knownOrders`. */
    readonly orderIds: ReadonlyMap<string, readonly bigint[]>;
}
/** A pool a bank lists for the account. */
export interface ListedPool {
    /** `<bank>:<pool>`, lower-case. */
    readonly key: string;
    readonly bank: Address;
    readonly pool: Address;
}
/** Each listed pool's open order ids, by pool. A failed read is kept with its error. */
export type OrderIdReads = PoolOrders.OrderIdReads;
/** The pools `input.knownPools` names, in bank order: the order a push asks for their order ids. */
export declare function knownPoolList(input: ReadAccountPositionsInput): readonly ListedPool[];
/**
 *  Reads one account's open perp positions, resting orders and margin in the given
 *  banks, at one block.
 *
 *  Rejects with the read's error when the account state or a position cannot be read,
 *  because the list would then be incomplete. An order list that cannot be read in full
 *  is unknown. Every other failure makes one figure unknown. Rejects with `signal`'s
 *  reason once it aborts, before the next call.
 */
export declare function readAccountPositions(input: ReadAccountPositionsInput, chain: PositionsChain, signal?: AbortSignal): Promise<AccountPositionsRead>;
/**
 *  The calls of a read whose pools and orders are already known, as Multicall3
 *  `aggregate3` members on `multicall`. {@link readFromResults} reads their results in
 *  this order. The pools' order ids are not among them: see {@link knownPoolList}.
 */
export declare function knownPoolCalls(input: ReadAccountPositionsInput, multicall: Address): readonly {
    readonly target: Address;
    readonly callData: Hex;
}[];
/** What the results of {@link knownPoolCalls} say. */
export type ResultsRead = {
    readonly kind: "read";
    readonly read: AccountPositionsRead;
}
/** A bank lists a pool the calls do not read. */
 | {
    readonly kind: "poolsChanged";
}
/** A pool lists an order whose details the calls do not read. */
 | {
    readonly kind: "ordersChanged";
};
/**
 *  Completes a read from the results of {@link knownPoolCalls} and the order ids of
 *  {@link knownPoolList}, made at `blockNumber`.
 *
 *  Only a full read is complete when the results miss a pool or an order: that is
 *  `poolsChanged` or `ordersChanged`. Throws as {@link readAccountPositions} rejects, and
 *  `RpcError` when the number of results is not the number of calls.
 */
export declare function readFromResults(input: ReadAccountPositionsInput, results: readonly PinnedBatch.AggregateResult[], ids: OrderIdReads, blockNumber: bigint): ResultsRead;
