import type { Address } from "viem";
import type { PushHandlers } from "./positionsPush.js";
import type { AccountPositionsRead, KnownAccountState } from "./positionsRead.js";
import type { AccountPositionsView } from "./positionsTypes.js";
/** How often an account with open positions is read again, for its marks, when no push arrives. */
export declare const REFRESH_MS = 5000;
/** How long the node may take to confirm a push. The account's event subscription hears it meanwhile. */
export declare const PUSH_CONFIRM_MS = 10000;
/** What a session's push reads, and whether price writes trigger it. */
export interface SessionPushTarget {
    /** The pools per bank to read: the last read's. */
    readonly pools: ReadonlyMap<string, readonly Address[]>;
    /** The order ids per pool whose details to read: the last read's. */
    readonly orderIds: ReadonlyMap<string, readonly bigint[]>;
    /** The block of the last read. */
    readonly blockNumber: bigint;
    /** Whether price writes trigger a push too: the account holds positions. */
    readonly withPrice: boolean;
}
export interface PositionsSessionDeps {
    readonly chainId: number;
    /** The MarginBank, as it is read. */
    readonly marginBank: Address;
    /** The account, as it is read. */
    readonly account: Address;
    /**
     *  One chain read. `known` is what the last read found: its pools and their order ids.
     *  `signal` aborts when the session closes, and the read then sends no more calls.
     */
    readonly read: (known: KnownAccountState | undefined, signal: AbortSignal) => Promise<AccountPositionsRead>;
    /**
     *  Subscribes to the MarginBank events that name the account, and returns the release.
     *  `onLog` gets the log's block, `null` when it names none. `onError` fires at most
     *  once, when the subscription is lost, and `onOpen` once, when the node confirms it.
     *  None of them fires during the call. Throws `NotConfiguredError` when the client
     *  has no chain transport.
     */
    readonly watch: (onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen: () => void) => () => void;
    /**
     *  Opens the node's push of the account's state for `target`, and returns the
     *  release, or `undefined` when this client cannot push. Absent: the session reads.
     *  Throws `NotConfiguredError` when the client has no chain transport.
     */
    readonly push?: (target: SessionPushTarget, handlers: PushHandlers) => (() => void) | undefined;
    readonly publish: (view: AccountPositionsView) => void;
    readonly nextRevision: () => number;
    readonly nowMs: () => number;
    /** The delay before retry `attempt`, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
}
export declare class PositionsSession {
    #private;
    constructor(deps: PositionsSessionDeps);
    /** The last view the session published, if any. */
    get view(): AccountPositionsView | undefined;
    /** Publishes `loading`, subscribes to the account's events and reads it. */
    start(): void;
    /** Stops for good. `publishClosed` sends a last `closed` view. */
    close(publishClosed: boolean): void;
}
