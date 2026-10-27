import type { WireBatch, WireCapability, WireGuard, WireOrderChange, WireStopChange, WireVersion } from "./wireSchemas.js";
/** The only contract version whose batches carry a predecessor identity. */
export declare const CONTRACT_VERSION = 3;
/** Why a reader must discard its view and take a new guarded snapshot. */
export type AccountResetReason = "snapshot_required" | "generation_changed" | "version_regression" | "version_conflict" | "missing_batch" | "batch_guard_mismatch" | "overflow" | "predecessor_mismatch";
/** The observation pinned a batch the guard has already moved past; read it again. */
export type AccountRetryReason = "stale_pin";
/** Why the producer cannot serve this scope. The view must never show an empty account. */
export type AccountUnavailableReason = "capability_missing" | "capability_unavailable" | "unsupported_contract_version" | "public_role_limits_unproved" | "processed_height_missing" | "processed_height_behind" | "child_response_incomplete" | "scope_mismatch" | "invalid_response" | "snapshot_changed";
/**
 *  The producer cannot serve this scope.
 *
 *  `detail` carries the producer's own reason when it published one. Today that is
 *  the manifest's `unavailableReason` for an unavailable capability.
 */
export interface AccountUnavailable {
    status: "source_unavailable";
    reason: AccountUnavailableReason;
    detail: string | null;
}
export type AccountContinuityResult = {
    status: "usable";
    version: WireVersion;
    processedHeight: string;
    orderChanges: readonly WireOrderChange[];
    stopChanges: readonly WireStopChange[];
} | {
    status: "retry_required";
    reason: AccountRetryReason;
    processedHeight: string;
} | {
    status: "reset_required";
    reason: AccountResetReason;
    processedHeight: string;
} | AccountUnavailable;
/** One complete-block observation, as the reader received it. Rows are raw wire values. */
export interface AccountContinuityInput {
    chainId: number;
    account: string;
    /** The capability row. `null` or `undefined` means the producer returned none. */
    capability: unknown;
    /** The version of a previously accepted guarded snapshot or batch. */
    previous: WireVersion | null | undefined;
    /** The batch id the observation pinned: `<generation>:<account>:<block>`. Anything else is out of scope. */
    pinnedBatchId: string | null | undefined;
    /** The account's guard row, or `null` when the account has none. */
    guard: unknown;
    /** The pinned batch row, or `null` when the producer returned none. */
    batch: unknown;
    orderChanges: readonly unknown[];
    stopChanges: readonly unknown[];
    /** `chain_metadata.latest_processed_block`, a GraphQL `Int`. */
    processedHeight: unknown;
}
/** Whether `id` names an order the way the indexer does: `<pool>_<orderId>`. */
export declare function orderIdMatches(id: string, orderId: string): boolean;
/**
 *  Whether `id` names a stop the way the indexer does: `<registry>_<orderIdRaw>`. A
 *  removed stop carries no registry, so only the id's shape and raw id are checked.
 */
export declare function stopIdMatches(id: string, registry: string | null | undefined, orderIdRaw: string): boolean;
export declare function unavailable(reason: AccountUnavailableReason, detail?: string | null): AccountUnavailable;
/** The zero version: an account with no guard under a READY capability. */
export declare function zeroVersion(datasetGeneration: string): WireVersion;
/** Whether a version is the zero version. A real block zero has a hash and a digest. */
export declare function isZeroVersion(version: WireVersion): boolean;
export declare function sameVersion(left: WireVersion, right: WireVersion): boolean;
/** The version a guard certifies, or the zero version when there is no guard. */
export declare function versionOf(guard: WireGuard | null, datasetGeneration: string): WireVersion;
/** Chain progress on the wire is a GraphQL `Int`; any other value cannot certify a height. */
export declare function observedHeight(value: unknown): bigint | undefined;
/**
 *  A capability the reader may use: READY, in scope, and with a proved public role.
 *
 *  The two public-role limits are numbers here, because `checkCapability` has proved them.
 */
export type ReadyCapability = WireCapability & {
    readiness: "READY";
    publicRoleMaxRows: number;
    publicRoleMaxResponseBytes: number;
};
export type CapabilityCheck = {
    status: "ok";
    capability: ReadyCapability;
} | AccountUnavailable;
/**
 *  Checks a capability row and returns it validated.
 *
 *  The contract version and readiness are read first, because an older or
 *  unavailable capability may have another row shape. A READY capability must then be
 *  a complete row for this chain, and its public role must be proved to serve the
 *  capacity-plus-one reads the reader makes.
 */
export declare function checkCapability(raw: unknown, chainId: number): CapabilityCheck;
/** The producer's own reason on an unavailable capability row, or `null` when it gave none. */
export declare function unavailableReasonOf(raw: unknown): string | null;
export type GuardCheck = {
    status: "ok";
    guard: WireGuard | null;
} | AccountUnavailable;
/** Checks a guard row against the capability and account it was read for. */
export declare function checkGuard(raw: unknown, capability: ReadyCapability, account: string): GuardCheck;
/**
 *  Rebuilds the producer's digest of a batch from its row and its children.
 *
 *  A REMOVE hashes only the identity fields; a REPLACE hashes every payload field.
 *  `predecessorBlockHash` is not part of the digest (`ACCOUNT-VIEW.md`, "Canonical digest").
 */
export declare function batchDigest(batch: WireBatch, orderChanges: readonly WireOrderChange[], stopChanges: readonly WireStopChange[]): string;
/**
 *  Interprets one complete-block observation relative to an already accepted version.
 *
 *  A quiet account has no dense sequence to check. A disconnected reader must report
 *  its own loss and take a new snapshot; it cannot infer continuity from a later
 *  producer watermark.
 */
export declare function classifyAccountContinuity(input: AccountContinuityInput): AccountContinuityResult;
