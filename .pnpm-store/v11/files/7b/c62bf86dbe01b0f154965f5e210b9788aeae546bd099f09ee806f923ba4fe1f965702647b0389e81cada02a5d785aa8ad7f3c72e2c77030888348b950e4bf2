import type { Address } from "viem";
import type { AccountBalancesRead } from "./balancesRead.js";
import type { AccountBalancesView } from "./balancesTypes.js";
/** How often the balances are read again with no event. */
export declare const REFRESH_MS = 10000;
export interface BalancesSessionDeps {
    readonly chainId: number;
    /** The accounts, as they are read. */
    readonly accounts: readonly Address[];
    /** The tokens, lower-case or `"native"`, as the views name them. */
    readonly tokens: readonly string[];
    /** One chain read of every balance. `signal` aborts when the session closes, and the read then sends no more calls. */
    readonly read: (signal: AbortSignal) => Promise<AccountBalancesRead>;
    /**
     *  Subscribes to the transfers that move the balances, and returns the release.
     *  `onLog` gets the log's block, `null` when it names none. `onError` fires at most
     *  once, when the subscription is lost, and `onOpen` once, when the node confirms it.
     *  None of them fires during the call. Throws `NotConfiguredError` when the client
     *  has no chain transport.
     */
    readonly watch: (onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen: () => void) => () => void;
    readonly publish: (view: AccountBalancesView) => void;
    readonly nextRevision: () => number;
    readonly nowMs: () => number;
    /** The delay before retry `attempt`, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
}
export declare class BalancesSession {
    #private;
    constructor(deps: BalancesSessionDeps);
    /** The last view the session published, if any. */
    get view(): AccountBalancesView | undefined;
    /** Publishes `loading`, subscribes to the transfers and reads the balances. */
    start(): void;
    /** Stops for good. `publishClosed` sends a last `closed` view. */
    close(publishClosed: boolean): void;
}
