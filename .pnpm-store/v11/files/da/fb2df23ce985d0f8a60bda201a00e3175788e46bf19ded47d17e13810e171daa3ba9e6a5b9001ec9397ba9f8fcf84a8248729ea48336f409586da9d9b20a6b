import type * as GraphqlWs from "../graphqlWs.js";
import type * as Snapshot from "./guardedSnapshot.js";
import * as Rows from "./rows.js";
import type { AccountOrdersView, AccountStop } from "./types.js";
/** Batch rows per streaming frame. A longer burst arrives over several frames, still in order. */
export declare const STREAM_BATCH_SIZE = 100;
/** A guard that stays ahead of the stream this long means the stream stopped delivering. */
export declare const STREAM_STALL_MS = 15000;
/**
 *  A guard that stays behind the held version this long was a rollback, not a late
 *  frame. Hasura sends a newer guard at its next poll, so 15 s covers several polls.
 */
export declare const GUARD_BEHIND_MS = 15000;
/** The longest applied changes wait for more before the view is published. */
export declare const EMIT_WINDOW_MS = 250;
/** How often a view that is `unavailable` or `tooLarge` is read again anyway. */
export declare const RECHECK_MS: number;
/** The shortest gap between two reads that account changes trigger, and the wait of a rebuilding indexer. */
export declare const RECHECK_THROTTLE_MS = 30000;
/** How many more times a live view reads a stop's venue or limit price after a failed read. */
export declare const ENRICH_RETRIES = 3;
/** The subset of a stream connection a session uses. */
export interface StreamConnection {
    subscribe(document: string, variables: Readonly<Record<string, unknown>>, sink: GraphqlWs.GraphqlWsSink): () => void;
}
export interface SessionDeps {
    readonly chainId: number;
    /** The account, lower-cased. */
    readonly account: string;
    /** Reads one guarded snapshot. Rejects when a read does not complete. */
    readonly readSnapshot: (signal: AbortSignal) => Promise<Snapshot.GuardedSnapshotResult>;
    /** Reads the changes of the given batches with per-family limits. */
    readonly readChildren: (batchIds: readonly string[], limits: {
        readonly orders: number;
        readonly stops: number;
    }, signal: AbortSignal) => Promise<{
        readonly orderChanges: unknown;
        readonly stopChanges: unknown;
    }>;
    /** The engine's shared stream connection. Rejects with an `IndexerError` when it cannot open. */
    readonly connection: () => Promise<StreamConnection>;
    /** Adds the venue and the limit price to stops. Rejects only when `signal` aborts. */
    readonly enrich: (stops: readonly Rows.AccountStopTerms[], generation: string, signal: AbortSignal) => Promise<readonly AccountStop[]>;
    /** Hands a view to the session's listeners. */
    readonly publish: (view: AccountOrdersView) => void;
    readonly nextRevision: () => number;
    readonly nowMs: () => number;
    /** The delay before retry `attempt`, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
}
export declare class AccountSession {
    #private;
    constructor(deps: SessionDeps);
    /** The last view the session published, if any. */
    get view(): AccountOrdersView | undefined;
    /** Publishes `loading` and starts the first snapshot. */
    start(): void;
    /** Stops for good. `publishClosed` sends a last `closed` view. */
    close(publishClosed: boolean): void;
}
