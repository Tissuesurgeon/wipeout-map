import { AccountViewError } from "../errors.js";
import type { AccountUnavailable, ReadyCapability } from "./continuity.js";
import type { AccountSnapshotCollection } from "./guardedSnapshot.js";
import type { WireVersion } from "./wireSchemas.js";
import type { AccountOrdersTooLarge, AccountViewCoverage, AccountOrdersSource, AccountViewUnavailableReason, AccountViewVersion } from "./types.js";
/** Snapshot attempts before a moving account is `snapshotUnstable`. The producer's own tools use three. */
export declare const MAX_ATTEMPTS = 3;
/** An unavailable result, as a public reason or as the error it becomes. */
export type UnavailableOutcome = {
    readonly kind: "unavailable";
    readonly reason: AccountViewUnavailableReason;
    readonly detail: string | null;
} | {
    readonly kind: "error";
    readonly error: AccountViewError;
};
/** What an internal `source_unavailable` result means for a caller of `operation`. */
export declare function unavailableOutcome(result: AccountUnavailable, operation: string, chainId: number): UnavailableOutcome;
/** The public name of the limit a resource-limit result exceeded. */
export declare function collectionOf(collection: AccountSnapshotCollection): AccountOrdersTooLarge["collection"];
export declare function versionOf(version: WireVersion): AccountViewVersion;
export declare function sourceOf(capability: ReadyCapability): AccountOrdersSource;
export declare function coverageOf(capability: ReadyCapability, chainId: number): AccountViewCoverage;
