import { type Address, type Hex } from "viem";
import * as PositionsRead from "./positionsRead.js";
/**
 *  topic0 of the price feed's `PricesUpdated` event. The price agents write every
 *  symbol in one transaction, about once a second, and the feed emits it each time.
 */
export declare const PRICES_UPDATED_TOPIC: Hex;
/** One `somnia_watch` subscription: the logs that trigger a push, and the calls it carries. */
export interface PushRequest {
    /** The contracts whose logs trigger a push. */
    readonly address: readonly Address[];
    /** The topic filter, position by position. `null` matches any value. */
    readonly topics: readonly (Hex | null)[];
    /** The calls the node runs at the block of each matched log. `from` sends a call as that address. */
    readonly ethCalls: readonly {
        readonly from?: Address;
        readonly to: Address;
        readonly data: Hex;
    }[];
}
/** Why a push ended: the node refused the subscription, or it was lost after it opened. */
export type PushEnd = "rejected" | "lost";
/**
 *  Opens one `somnia_watch` subscription and returns its release. `onResults` receives
 *  each push's call results, in the order of `ethCalls`. `onOpen` fires once, when the
 *  node confirms the subscription. `onEnd` fires at most once.
 */
export type WatchPushes = (request: PushRequest, onResults: (results: readonly Hex[]) => void, onEnd: (end: PushEnd) => void, onOpen: () => void) => () => void;
/** What one push says. */
export type PushOutcome = {
    readonly kind: "read";
    readonly read: PositionsRead.AccountPositionsRead;
}
/** A bank lists a pool the push does not read, so only a full read is complete. */
 | {
    readonly kind: "poolsChanged";
}
/** A pool lists an order whose details the push does not read, so only a full read is complete. */
 | {
    readonly kind: "ordersChanged";
}
/** The read failed as a read can: the account state or a position is unreadable. */
 | {
    readonly kind: "failed";
    readonly error: unknown;
}
/** The results are not what the calls return. */
 | {
    readonly kind: "malformed";
};
/** The one call a push carries: the block number, then the read's `members`. */
export declare function pushCallOf(multicall: Address, members: readonly {
    readonly target: Address;
    readonly callData: Hex;
}[]): {
    readonly to: Address;
    readonly data: Hex;
};
/** The calls a push carries for `input`, and how many read members ride its `aggregate3`. */
export declare function pushCallsOf(input: PositionsRead.ReadAccountPositionsInput, multicall: Address): {
    readonly ethCalls: PushRequest["ethCalls"];
    readonly members: number;
};
/**
 *  Reads one push's results: the `aggregate3`, then one order id list per known pool.
 *  `members` is the number of read calls the `aggregate3` carries after the block number.
 *
 *  An id list that does not decode makes that pool's orders unknown, not the push
 *  malformed: a pool can refuse one call the way a member can fail.
 */
export declare function outcomeOf(input: PositionsRead.ReadAccountPositionsInput, members: number, results: readonly Hex[]): PushOutcome;
/** The account and pools a push reads, and what triggers it. */
export interface PushTarget {
    readonly account: Address;
    readonly marginBank: Address;
    /** The pools per bank that the push reads: the last read's. */
    readonly pools: ReadonlyMap<string, readonly Address[]>;
    /** The order ids per pool whose details the push reads: the last read's. */
    readonly orderIds: ReadonlyMap<string, readonly bigint[]>;
    /** The Multicall3 that runs the read. */
    readonly multicall: Address;
    /** The price feed whose updates trigger a push. `undefined` pushes on the account's events only. */
    readonly priceFeed: Address | undefined;
}
export interface PushHandlers {
    /** The node confirmed every subscription: from now on, each change pushes. */
    onOpen(): void;
    onRead(read: PositionsRead.AccountPositionsRead): void;
    /** A push listed a pool or an order the target does not read: only a full read is complete. */
    onNeedsRead(): void;
    /** A push carried a read that failed. */
    onReadFailed(error: unknown): void;
    /** The push ended. Fires at most once, and nothing follows it. */
    onEnd(end: PushEnd): void;
}
/**
 *  Opens the pushes of one account's state and returns the release. Calling it twice
 *  does nothing, and nothing follows it.
 *
 *  Results that are not what the calls return end the push as `rejected`: a node that
 *  answers so would answer so again, so the caller reads instead of retrying. When one
 *  subscription throws as it opens, the ones already open are released and the error
 *  is thrown on.
 */
export declare function openPush(target: PushTarget, watch: WatchPushes, handlers: PushHandlers): () => void;
