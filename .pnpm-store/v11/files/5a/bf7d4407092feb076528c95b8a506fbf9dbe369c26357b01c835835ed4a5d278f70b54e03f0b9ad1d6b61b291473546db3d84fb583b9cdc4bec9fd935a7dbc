import * as Enrichment from "./enrichment.js";
import type { AccountOrdersSnapshot } from "./types.js";
/**
 *  Shares one read per key between concurrent callers.
 *
 *  The read runs under its own signal, not a caller's, so one caller's abort does not
 *  fail the others. When the last caller leaves, the read is aborted and forgotten,
 *  and the next caller starts a new one. A read whose lifecycle has ended is never
 *  joined, because it can only fail.
 */
export declare class SingleFlight<V> {
    #private;
    /**
     *  Joins the read in flight for `key`, or starts one with `start`.
     *
     *  `lifecycle` is the live-read signal the read would start under. `signal` is the
     *  caller's: its abort rejects this call with its reason and leaves the others waiting.
     */
    run(key: string, lifecycle: AbortSignal | undefined, start: (signal: AbortSignal) => Promise<V>, signal?: AbortSignal): Promise<V>;
    /** How many reads are in flight. */
    get size(): number;
}
export declare class AccountViewRegistry {
    #private;
    readonly snapshots: SingleFlight<AccountOrdersSnapshot>;
    readonly limitPrices: Enrichment.LimitPriceCache;
    /** The next revision. Every result the engine produces takes one, so a newer result has a larger one. */
    nextRevision(): number;
}
/** How long a live view outlives its last listener, so a screen that comes back reuses it. */
export declare const LINGER_MS = 30000;
/** What a live session offers its registry: its last view, and its start and close. */
export interface LiveSession<V> {
    readonly view: V | undefined;
    start(): void;
    close(publishClosed: boolean): void;
}
export interface LiveViewsDeps<V> {
    /** Builds the session of one key, an account or an account in a bank. It publishes through `publish`. */
    readonly createSession: (key: string, publish: (view: V) => void) => LiveSession<V>;
    /** Receives an error a listener threw. */
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
    /** Called when the last live view is gone, so the owner can release the shared connection. */
    readonly onIdle: () => void;
    readonly lingerMs?: number;
}
/**
 *  The engine's live views, one session per account.
 *
 *  Listeners of one account share its session. Views reach each listener in the order
 *  the session published them, one microtask after, and a listener that throws cannot
 *  stop another listener or the session. When the last listener leaves, the session
 *  lingers for {@link LINGER_MS}, then closes.
 */
export declare class LiveViews<V> {
    #private;
    constructor(deps: LiveViewsDeps<V>);
    /** Adds a listener for `account` and returns the function that removes it. */
    subscribe(account: string, onView: (view: V) => void): () => void;
    /**
     *  Hands `view` to `onView` alone and starts no session, for an owner that has
     *  closed. It arrives as a session's views do, one microtask after, and the
     *  returned function stops it.
     */
    deliverOnce(view: V, onView: (view: V) => void): () => void;
    /** The current view of `account`'s live session, if one runs. */
    current(account: string): V | undefined;
    /** How many accounts have a live session. */
    get size(): number;
    /** Ends every live view with a `closed` view. Listeners that stay subscribed get nothing more. */
    closeAll(): void;
}
