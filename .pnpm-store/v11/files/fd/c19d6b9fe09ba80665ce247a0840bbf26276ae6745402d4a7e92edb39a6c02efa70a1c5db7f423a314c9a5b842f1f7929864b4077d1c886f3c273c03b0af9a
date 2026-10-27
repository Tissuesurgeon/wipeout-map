// What an internal account-view result means for a caller.
//
// `getSnapshot` and a live session turn the same internal results into the same public
// outcomes, so the two never disagree about an account's state: an unavailable source is
// an `unavailable` result, a broken answer is an `AccountViewError`, and a version,
// source or coverage reads the same in both.

import { AccountViewError } from "../errors.js";
import type { AccountUnavailable, ReadyCapability } from "./continuity.js";
import * as Coverage from "./coverage.js";
import type { AccountSnapshotCollection } from "./guardedSnapshot.js";
import type { WireVersion } from "./wireSchemas.js";
import type {
  AccountOrdersTooLarge,
  AccountViewCoverage,
  AccountOrdersSource,
  AccountViewUnavailableReason,
  AccountViewVersion,
} from "./types.js";

/** Snapshot attempts before a moving account is `snapshotUnstable`. The producer's own tools use three. */
export const MAX_ATTEMPTS = 3;

/** The internal reasons a caller can act on, and the public name of each. */
const UNAVAILABLE_REASONS = {
  capability_missing: "capabilityMissing",
  capability_unavailable: "capabilityUnavailable",
  unsupported_contract_version: "unsupportedContractVersion",
  public_role_limits_unproved: "publicRoleLimitsUnproved",
  processed_height_missing: "rebuildInProgress",
  processed_height_behind: "rebuildInProgress",
} as const satisfies Partial<Record<AccountUnavailable["reason"], AccountViewUnavailableReason>>;

/** An unavailable result, as a public reason or as the error it becomes. */
export type UnavailableOutcome =
  | { readonly kind: "unavailable"; readonly reason: AccountViewUnavailableReason; readonly detail: string | null }
  | { readonly kind: "error"; readonly error: AccountViewError };

/** What an internal `source_unavailable` result means for a caller of `operation`. */
export function unavailableOutcome(result: AccountUnavailable, operation: string, chainId: number): UnavailableOutcome {
  switch (result.reason) {
    case "capability_missing":
    case "capability_unavailable":
    case "unsupported_contract_version":
    case "public_role_limits_unproved":
    case "processed_height_missing":
    case "processed_height_behind":
      return { kind: "unavailable", reason: UNAVAILABLE_REASONS[result.reason], detail: result.detail };
    case "invalid_response":
    case "child_response_incomplete":
      return {
        kind: "error",
        error: new AccountViewError(
          operation,
          "invalidResponse",
          `the indexer served account data that breaks the account-view contract (${result.reason})`,
          { chainId },
        ),
      };
    case "scope_mismatch":
      return {
        kind: "error",
        error: new AccountViewError(
          operation,
          "scopeMismatch",
          "the indexer served account data for another account, chain or dataset",
          { chainId },
        ),
      };
    case "snapshot_changed":
      return {
        kind: "error",
        error: new AccountViewError(
          operation,
          "snapshotUnstable",
          `the account or its capability changed during each of ${MAX_ATTEMPTS} read attempts`,
          { chainId },
        ),
      };
  }
}

/** The public name of the limit a resource-limit result exceeded. */
export function collectionOf(collection: AccountSnapshotCollection): AccountOrdersTooLarge["collection"] {
  return collection === "response_bytes" ? "responseBytes" : collection;
}

export function versionOf(version: WireVersion): AccountViewVersion {
  return Object.freeze({
    datasetGeneration: version.datasetGeneration,
    blockNumber: BigInt(version.blockNumber),
    blockHash: version.blockHash,
    digest: version.digest,
  });
}

export function sourceOf(capability: ReadyCapability): AccountOrdersSource {
  return Object.freeze({
    contractVersion: capability.contractVersion,
    manifestDigest: capability.manifestDigest,
    changeStartBlock: BigInt(capability.changeStartBlock),
    orderCapacity: capability.orderCapacity,
    stopCapacity: capability.stopCapacity,
  });
}

export function coverageOf(capability: ReadyCapability, chainId: number): AccountViewCoverage {
  return Coverage.coverageOf(capability.manifestDigest, chainId);
}
