import type { AccountResetReason, AccountUnavailable, ReadyCapability } from "./continuity.js";
import type { WireOrderChange, WireStopChange, WireVersion } from "./wireSchemas.js";
export type StreamResetReason = AccountResetReason | "capability_changed";
/** A verdict after which nothing can be applied. The caller takes a new snapshot. */
export type StreamTerminal = {
    status: "reset_required";
    reason: StreamResetReason;
} | AccountUnavailable | {
    status: "retry_required";
    reason: "stale_pin";
};
/**
 *  What one frame means.
 *
 *  - `applied`: a batch advanced the accepted version; apply its changes.
 *  - `duplicate`: a batch the reader already holds; nothing to do.
 *  - `pending`: the guard is ahead of the accepted version; the stream owes batches up to `target`.
 *  - `current`: the frame agrees with what the reader holds.
 *  - `guard_behind`: the guard is below the accepted version. A late frame is corrected
 *    by a newer one; a rollback is not, so the reader resets if it stays behind.
 *  - a terminal verdict: discard the view and take a new guarded snapshot.
 */
export type StreamVerdict = {
    status: "applied";
    version: WireVersion;
    orderChanges: readonly WireOrderChange[];
    stopChanges: readonly WireStopChange[];
} | {
    status: "duplicate";
} | {
    status: "pending";
    target: WireVersion;
} | {
    status: "current";
} | {
    status: "guard_behind";
} | StreamTerminal;
export interface StreamScope {
    chainId: number;
    /** The account, lower-cased. */
    account: string;
    /** The READY capability the snapshot was accepted under. */
    capability: ReadyCapability;
    /** The accepted snapshot's version: the zero version for an account with no guard. */
    version: WireVersion;
}
/**
 *  Follows one chain-and-account orders stream from an accepted guarded snapshot.
 *
 *  Feed it every capability frame, guard frame and batch (with its complete children)
 *  in arrival order. The first terminal verdict is final: every later call returns it
 *  again, because nothing after a loss can be applied safely.
 */
export declare class AccountStreamFollower {
    private readonly scope;
    private accepted;
    /** Versions this reader accepted, newest last, so a redelivered batch is not a conflict. */
    private readonly history;
    private target;
    private behind;
    private terminal;
    constructor(scope: StreamScope);
    get version(): WireVersion;
    /** The newest guard version the stream has not delivered yet, if any. */
    get pendingTarget(): WireVersion | undefined;
    /**
     *  Whether the last guard frame was below the accepted version.
     *
     *  A live-query frame computed before the stream's newer batch can arrive after it.
     *  Hasura then sends the newer guard at its next poll. A rollback sends no such
     *  correction, so the session waits a bounded time and then takes a new snapshot.
     */
    get guardBehind(): boolean;
    get failure(): StreamTerminal | undefined;
    /** An `AccountCapabilityWatch` frame. Any change to the row the snapshot used ends the view. */
    onCapability(raw: unknown): StreamVerdict;
    /** An `AccountGuardWatch` frame: the account's newest committed version. */
    onGuard(raw: unknown): StreamVerdict;
    /** One `AccountChangeBatchStream` row with the complete `AccountChangeChildren` response for it. */
    onBatch(raw: unknown, orderChanges: readonly unknown[], stopChanges: readonly unknown[]): StreamVerdict;
    /** A reader that stops receiving frames reports its own loss; the producer cannot see it. */
    onDisconnect(): StreamVerdict;
    private caughtUp;
    private known;
    private remember;
    private end;
}
