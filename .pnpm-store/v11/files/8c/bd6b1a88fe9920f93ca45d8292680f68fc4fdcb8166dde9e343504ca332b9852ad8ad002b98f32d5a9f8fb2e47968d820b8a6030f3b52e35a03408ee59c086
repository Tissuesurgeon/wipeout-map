import type { Address } from "viem";
import * as SpotOrdersRead from "./spotOrdersRead.js";
import * as Events from "./spotOrdersEvents.js";
import type { AccountSpotOrdersView } from "./spotOrdersTypes.js";
/** How long after its last read of every pool the session reads every pool again. */
export declare const BACKSTOP_MS = 30000;
/** A pool's order log as the subscription delivers it. */
export interface SpotOrderLog extends Events.PoolLog {
    /** The block the log landed in; `null` when the node did not say. */
    readonly blockNumber: bigint | null;
}
export interface SpotOrdersSessionDeps {
    readonly chainId: number;
    /** The account, lower-cased. */
    readonly account: Address;
    /**
     *  One read of `pools`, lower-case, or of every spot pool when `pools` is `null`.
     *  `known` is the open order ids each pool held at its last read. `signal` aborts when
     *  the session closes, and the read then sends no more calls.
     */
    readonly read: (pools: readonly Address[] | null, known: ReadonlyMap<string, readonly bigint[]>, signal: AbortSignal) => Promise<SpotOrdersRead.AccountSpotOrdersRead>;
    /**
     *  Subscribes to the logs `filters` match, and returns the release. `onLog` gets
     *  `undefined` for a log that does not read. `onError` fires at most once, when the
     *  subscription is lost, and `onOpen` once, when the node confirms it. None of them
     *  fires during the call. Throws `NotConfiguredError` when the client has no chain
     *  transport.
     */
    readonly watch: (filters: readonly Events.PoolLogFilter[], onLog: (log: SpotOrderLog | undefined) => void, onError: () => void, onOpen: () => void) => () => void;
    readonly publish: (view: AccountSpotOrdersView) => void;
    readonly nextRevision: () => number;
    readonly nowMs: () => number;
    /** The delay before retry `attempt`, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
}
export declare class SpotOrdersSession {
    #private;
    constructor(deps: SpotOrdersSessionDeps);
    /** The last view the session published, if any. */
    get view(): AccountSpotOrdersView | undefined;
    /** Publishes `loading` and reads every pool; the subscription opens with the first read's pools. */
    start(): void;
    /** Stops for good. `publishClosed` sends a last `closed` view. */
    close(publishClosed: boolean): void;
}
