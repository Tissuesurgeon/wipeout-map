import { type Address, type Hex } from "viem";
/** topic 0 of every spot pool event that places, changes or ends an order. */
export declare const SPOT_ORDER_EVENT_TOPICS: readonly Hex[];
/** The most order ids a subscription names. Past it, the subscription follows every order event of the spot pools. */
export declare const MAX_FILTERED_ORDER_IDS = 1000;
/** One `logs` subscription filter: the pools, and the topics position by position. */
export interface PoolLogFilter {
    readonly address: Address[];
    /** One topic, a list any of which matches, or `null` for any. */
    readonly topics: (Hex | Hex[] | null)[];
}
/**
 *  The filters that follow one account's spot orders in `pools`: every placement, and
 *  the later events of the orders `orderIds` names. `null`: too many orders to name, so
 *  every order event.
 */
export declare function spotOrderFilters(pools: readonly Address[], orderIds: readonly bigint[] | null): PoolLogFilter[];
/** One log a spot pool emitted. */
export interface PoolLog {
    /** The pool, in any letter case. */
    readonly address: string;
    readonly topics: readonly Hex[];
    readonly data: Hex;
}
/** What a pool log says about the account. */
export type LogVerdict = {
    readonly kind: "ignore";
}
/** It changes the account's orders: read them again. */
 | {
    readonly kind: "read";
}
/** The account placed an order: read them again, and treat its id as the account's from now on. */
 | {
    readonly kind: "placed";
    readonly orderId: bigint;
};
/** Whether `orderId` is one of the account's orders in `pool` (lower-case). */
export type KnownOrder = (pool: string, orderId: bigint) => boolean;
/** Whether `log` places, changes or ends one of `account`'s orders. `account` is lower-case. */
export declare function verdictOf(log: PoolLog, account: string, known: KnownOrder): LogVerdict;
