// The account-view continuity classifier.
//
// A reader holds an accepted version of one account: a guarded snapshot or the last
// batch it applied. This module decides what one complete-block observation means for
// that reader: apply a batch, wait, or discard the view and take a new snapshot.
//
// It is the SDK's port of the reader half of `indexer/src/accountView.ts`
// (`classifyAccountContinuity`). The rules are the producer contract in
// `indexer/ACCOUNT-VIEW.md` ("Account change stream").
//
// Structure first, then relations. The capability, guard and batch rows go through
// their schemas in `wireSchemas.ts` before any comparison, so a malformed row is
// `invalid_response`. A row that is well formed but belongs to another account,
// generation or batch is `scope_mismatch`. A row that is both malformed and out of
// scope reports `invalid_response`; the reference reports the scope defect first.
//
// Change children are the exception, and match the reference. A child's envelope is
// checked before its payload: its id names its family and its batch, and its operation
// must be known. A child in the wrong family's array, from another batch, or with an
// unknown operation is `scope_mismatch`. Only then is its payload validated.
//
// Either way the view ends and nothing is applied.

import * as Canonical from "./canonical.js";
import * as Wire from "./wireSchemas.js";
import type {
  WireBatch,
  WireCapability,
  WireChangeEnvelope,
  WireGuard,
  WireOrderChange,
  WireStopChange,
  WireVersion,
} from "./wireSchemas.js";

/** The only contract version whose batches carry a predecessor identity. */
export const CONTRACT_VERSION = 3;

/** Why a reader must discard its view and take a new guarded snapshot. */
export type AccountResetReason =
  | "snapshot_required"
  | "generation_changed"
  | "version_regression"
  | "version_conflict"
  | "missing_batch"
  | "batch_guard_mismatch"
  | "overflow"
  | "predecessor_mismatch";

/** The observation pinned a batch the guard has already moved past; read it again. */
export type AccountRetryReason = "stale_pin";

/** Why the producer cannot serve this scope. The view must never show an empty account. */
export type AccountUnavailableReason =
  | "capability_missing"
  | "capability_unavailable"
  | "unsupported_contract_version"
  | "public_role_limits_unproved"
  | "processed_height_missing"
  | "processed_height_behind"
  | "child_response_incomplete"
  | "scope_mismatch"
  | "invalid_response"
  | "snapshot_changed";

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

export type AccountContinuityResult =
  | {
      status: "usable";
      version: WireVersion;
      processedHeight: string;
      orderChanges: readonly WireOrderChange[];
      stopChanges: readonly WireStopChange[];
    }
  | { status: "retry_required"; reason: AccountRetryReason; processedHeight: string }
  | { status: "reset_required"; reason: AccountResetReason; processedHeight: string }
  | AccountUnavailable;

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

const ACCOUNT_PATTERN = /^0x[0-9a-f]{40}$/;

/** A row id: an order's `<pool>_<orderId>`, or a stop's `<registry>_<orderIdRaw>`. */
const ROW_ID_PATTERN = /^(0x[0-9a-f]{40})_(0|[1-9][0-9]*)$/;

/** Whether `id` names an order the way the indexer does: `<pool>_<orderId>`. */
export function orderIdMatches(id: string, orderId: string): boolean {
  return ROW_ID_PATTERN.exec(id)?.[2] === orderId;
}

/**
 *  Whether `id` names a stop the way the indexer does: `<registry>_<orderIdRaw>`. A
 *  removed stop carries no registry, so only the id's shape and raw id are checked.
 */
export function stopIdMatches(id: string, registry: string | null | undefined, orderIdRaw: string): boolean {
  if (registry == null) return ROW_ID_PATTERN.exec(id)?.[2] === orderIdRaw;
  return id === `${registry.toLowerCase()}_${orderIdRaw}`;
}

export function unavailable(reason: AccountUnavailableReason, detail: string | null = null): AccountUnavailable {
  return { status: "source_unavailable", reason, detail };
}

/** The zero version: an account with no guard under a READY capability. */
export function zeroVersion(datasetGeneration: string): WireVersion {
  return { datasetGeneration, blockNumber: "0", blockHash: null, digest: null };
}

/** Whether a version is the zero version. A real block zero has a hash and a digest. */
export function isZeroVersion(version: WireVersion): boolean {
  return version.blockNumber === "0" && version.blockHash === null && version.digest === null;
}

export function sameVersion(left: WireVersion, right: WireVersion): boolean {
  return (
    left.datasetGeneration === right.datasetGeneration &&
    left.blockNumber === right.blockNumber &&
    left.blockHash === right.blockHash &&
    left.digest === right.digest
  );
}

/** The version a guard certifies, or the zero version when there is no guard. */
export function versionOf(guard: WireGuard | null, datasetGeneration: string): WireVersion {
  if (guard === null) return zeroVersion(datasetGeneration);
  return { datasetGeneration, blockNumber: guard.blockNumber, blockHash: guard.blockHash, digest: guard.digest };
}

/** Chain progress on the wire is a GraphQL `Int`; any other value cannot certify a height. */
export function observedHeight(value: unknown): bigint | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > Wire.GRAPHQL_INT_MAX) {
    return undefined;
  }
  return BigInt(value);
}

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

export type CapabilityCheck = { status: "ok"; capability: ReadyCapability } | AccountUnavailable;

/**
 *  Checks a capability row and returns it validated.
 *
 *  The contract version and readiness are read first, because an older or
 *  unavailable capability may have another row shape. A READY capability must then be
 *  a complete row for this chain, and its public role must be proved to serve the
 *  capacity-plus-one reads the reader makes.
 */
export function checkCapability(raw: unknown, chainId: number): CapabilityCheck {
  if (raw == null) return unavailable("capability_missing");
  const head = Wire.wireCapabilityHeadSchema.safeParse(raw);
  if (!head.success) return unavailable("invalid_response");
  // An older wire shape cannot become consumable merely by becoming READY.
  if (head.data.contractVersion !== CONTRACT_VERSION) return unavailable("unsupported_contract_version");
  if (head.data.readiness === "UNAVAILABLE") {
    return unavailable("capability_unavailable", unavailableReasonOf(raw));
  }
  if (head.data.readiness !== "READY") return unavailable("invalid_response");
  const parsed = Wire.wireCapabilitySchema.safeParse(raw);
  if (!parsed.success) return unavailable("invalid_response");
  const capability = parsed.data;
  if (
    capability.chainId !== chainId ||
    capability.id !== `${chainId}:orders` ||
    capability.capability !== "orders" ||
    capability.datasetGeneration === ""
  ) {
    return unavailable("scope_mismatch");
  }
  const { publicRoleMaxRows, publicRoleMaxResponseBytes } = capability;
  if (
    publicRoleMaxRows == null ||
    publicRoleMaxResponseBytes == null ||
    publicRoleMaxRows < Math.max(capability.orderCapacity, capability.stopCapacity) + 1
  ) {
    return unavailable("public_role_limits_unproved");
  }
  // The head check proved readiness; the guard above proved both limits.
  return {
    status: "ok",
    capability: { ...capability, readiness: "READY", publicRoleMaxRows, publicRoleMaxResponseBytes },
  };
}

/** The producer's own reason on an unavailable capability row, or `null` when it gave none. */
export function unavailableReasonOf(raw: unknown): string | null {
  const parsed = Wire.wireUnavailableReasonSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data.unavailableReason ?? null;
}

export type GuardCheck = { status: "ok"; guard: WireGuard | null } | AccountUnavailable;

/** Checks a guard row against the capability and account it was read for. */
export function checkGuard(raw: unknown, capability: ReadyCapability, account: string): GuardCheck {
  if (raw == null) return { status: "ok", guard: null };
  const parsed = Wire.wireGuardSchema.safeParse(raw);
  if (!parsed.success) return unavailable("invalid_response");
  const guard = parsed.data;
  if (
    guard.id !== `${capability.datasetGeneration}:${account}` ||
    guard.account !== account ||
    guard.datasetGeneration !== capability.datasetGeneration
  ) {
    return unavailable("scope_mismatch");
  }
  return { status: "ok", guard };
}

function selectedPayload(
  change: Readonly<Record<string, unknown>>,
  fields: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field, change[field]]));
}

/**
 *  Rebuilds the producer's digest of a batch from its row and its children.
 *
 *  A REMOVE hashes only the identity fields; a REPLACE hashes every payload field.
 *  `predecessorBlockHash` is not part of the digest (`ACCOUNT-VIEW.md`, "Canonical digest").
 */
export function batchDigest(
  batch: WireBatch,
  orderChanges: readonly WireOrderChange[],
  stopChanges: readonly WireStopChange[],
): string {
  const changes = [
    ...orderChanges.map((change) => ({
      family: "ORDER",
      physicalEntityId: change.physicalEntityId,
      operation: change.operation,
      terminalCause: change.terminalCause ?? null,
      payload: selectedPayload(
        change,
        change.operation === "REMOVE" ? Wire.ORDER_IDENTITY_FIELDS : Wire.ORDER_PAYLOAD_FIELDS,
      ),
    })),
    ...stopChanges.map((change) => ({
      family: "STOP",
      physicalEntityId: change.physicalEntityId,
      operation: change.operation,
      terminalCause: change.terminalCause ?? null,
      payload: selectedPayload(
        change,
        change.operation === "REMOVE" ? Wire.STOP_IDENTITY_FIELDS : Wire.STOP_PAYLOAD_FIELDS,
      ),
    })),
  ].sort((left, right) =>
    Canonical.compareCodeUnits(`${left.family}:${left.physicalEntityId}`, `${right.family}:${right.physicalEntityId}`),
  );
  return Canonical.payloadDigest({
    account: batch.account,
    datasetGeneration: batch.datasetGeneration,
    blockNumber: batch.blockNumber,
    blockHash: batch.blockHash,
    predecessorBlockNumber: batch.predecessorBlockNumber ?? null,
    predecessorDigest: batch.predecessorDigest ?? null,
    orderChangeCount: batch.orderChangeCount,
    stopChangeCount: batch.stopChangeCount,
    overflow: batch.overflow,
    changes,
  });
}

type ChildrenCheck =
  | { status: "ok"; orderChanges: WireOrderChange[]; stopChanges: WireStopChange[] }
  | AccountUnavailable;

/**
 *  Checks that every child belongs to `batch`, is unique, and carries a valid payload
 *  whose identity matches the row it names, as a snapshot row's must.
 */
function checkChildren(
  input: AccountContinuityInput,
  batch: WireBatch,
  account: string,
  generation: string,
): ChildrenCheck {
  const ids = new Set<string>();
  const inScope = (envelope: WireChangeEnvelope, family: "ORDER" | "STOP"): boolean =>
    envelope.batch_id === batch.id &&
    envelope.account === account &&
    envelope.datasetGeneration === generation &&
    envelope.blockNumber === batch.blockNumber &&
    envelope.physicalEntityId.trim() !== "" &&
    (envelope.operation === "REPLACE" || envelope.operation === "REMOVE") &&
    envelope.id === `${batch.id}:${family}:${envelope.physicalEntityId}` &&
    !ids.has(envelope.id);
  const orderChanges: WireOrderChange[] = [];
  for (const raw of input.orderChanges) {
    const envelope = Wire.wireChangeEnvelopeSchema.safeParse(raw);
    if (!envelope.success || !inScope(envelope.data, "ORDER")) return unavailable("scope_mismatch");
    const change = Wire.wireOrderChangeSchema.safeParse(raw);
    if (!change.success || !orderIdMatches(change.data.physicalEntityId, change.data.orderId)) {
      return unavailable("invalid_response");
    }
    ids.add(envelope.data.id);
    orderChanges.push(change.data);
  }
  const stopChanges: WireStopChange[] = [];
  for (const raw of input.stopChanges) {
    const envelope = Wire.wireChangeEnvelopeSchema.safeParse(raw);
    if (!envelope.success || !inScope(envelope.data, "STOP")) return unavailable("scope_mismatch");
    const change = Wire.wireStopChangeSchema.safeParse(raw);
    if (!change.success || !stopIdMatches(change.data.physicalEntityId, change.data.registry, change.data.orderIdRaw)) {
      return unavailable("invalid_response");
    }
    ids.add(envelope.data.id);
    stopChanges.push(change.data);
  }
  return { status: "ok", orderChanges, stopChanges };
}

/**
 *  Interprets one complete-block observation relative to an already accepted version.
 *
 *  A quiet account has no dense sequence to check. A disconnected reader must report
 *  its own loss and take a new snapshot; it cannot infer continuity from a later
 *  producer watermark.
 */
export function classifyAccountContinuity(input: AccountContinuityInput): AccountContinuityResult {
  const account = input.account.toLowerCase();
  if (!ACCOUNT_PATTERN.test(account)) return unavailable("scope_mismatch");
  const capabilityCheck = checkCapability(input.capability, input.chainId);
  if (capabilityCheck.status !== "ok") return capabilityCheck;
  const cap = capabilityCheck.capability;
  const generation = cap.datasetGeneration;

  if (input.processedHeight == null) return unavailable("processed_height_missing");
  const processed = observedHeight(input.processedHeight);
  if (processed === undefined) return unavailable("invalid_response");
  if (processed < BigInt(cap.changeStartBlock)) return unavailable("processed_height_behind");
  const processedHeight = processed.toString();
  const retry = (reason: AccountRetryReason): AccountContinuityResult => ({
    status: "retry_required",
    reason,
    processedHeight,
  });
  const reset = (reason: AccountResetReason): AccountContinuityResult => ({
    status: "reset_required",
    reason,
    processedHeight,
  });

  const guardCheck = checkGuard(input.guard, cap, account);
  if (guardCheck.status !== "ok") return guardCheck;
  const guard = guardCheck.guard;
  if (guard !== null && processed < BigInt(guard.blockNumber)) return unavailable("processed_height_behind");
  const current = versionOf(guard, generation);

  const previousRaw = input.previous;
  if (previousRaw == null) return reset("snapshot_required");
  const previousParsed = Wire.wireVersionSchema.safeParse(previousRaw);
  if (!previousParsed.success) return unavailable("invalid_response");
  const previous = previousParsed.data;
  if (previous.datasetGeneration !== generation) return reset("generation_changed");

  let batch: WireBatch | null = null;
  if (input.batch != null) {
    const parsedBatch = Wire.wireBatchSchema.safeParse(input.batch);
    if (!parsedBatch.success) return unavailable("invalid_response");
    batch = parsedBatch.data;
    if (
      batch.id !== `${generation}:${account}:${batch.blockNumber}` ||
      batch.account !== account ||
      batch.datasetGeneration !== generation
    ) {
      return unavailable("scope_mismatch");
    }
  }
  const pinned = input.pinnedBatchId;
  const pinnedPrefix = `${generation}:${account}:`;
  const pinnedSuffix =
    typeof pinned === "string" && pinned.startsWith(pinnedPrefix) ? pinned.slice(pinnedPrefix.length) : undefined;
  if (pinnedSuffix === undefined || !Wire.WIRE_HEIGHT.test(pinnedSuffix)) return unavailable("scope_mismatch");
  if (batch !== null && batch.id !== pinned) return unavailable("scope_mismatch");

  if (BigInt(current.blockNumber) < BigInt(previous.blockNumber)) return reset("version_regression");
  if (isZeroVersion(current) && !isZeroVersion(previous)) return reset("version_regression");
  const sameHeight = current.blockNumber === previous.blockNumber && isZeroVersion(current) === isZeroVersion(previous);
  if (sameHeight && (current.blockHash !== previous.blockHash || current.digest !== previous.digest)) {
    return reset("version_conflict");
  }
  const unchangedVersion = sameHeight;
  const currentBatchId = `${generation}:${account}:${current.blockNumber}`;

  // Overflow is a count-only loss marker. Children or positive counts contradict the
  // producer shape, and a new snapshot cannot make them trustworthy.
  if (
    batch?.overflow &&
    (batch.orderChangeCount !== 0 ||
      batch.stopChangeCount !== 0 ||
      input.orderChanges.length !== 0 ||
      input.stopChanges.length !== 0)
  ) {
    return unavailable("invalid_response");
  }

  // Even a quiet, unchanged guard cannot certify a different complete-block row.
  if (
    batch !== null &&
    (guard === null ||
      batch.blockNumber !== current.blockNumber ||
      batch.blockHash !== current.blockHash ||
      batch.digest !== current.digest)
  ) {
    if (guard !== null && pinned !== currentBatchId) return retry("stale_pin");
    return reset("batch_guard_mismatch");
  }
  if (pinned !== currentBatchId) return retry("stale_pin");

  let orderChanges: readonly WireOrderChange[] = [];
  let stopChanges: readonly WireStopChange[] = [];
  if (batch !== null && !batch.overflow) {
    if (batch.orderChangeCount > cap.orderCapacity || batch.stopChangeCount > cap.stopCapacity) {
      return unavailable("invalid_response");
    }
    // Every non-overflow batch closes at least one account touch.
    if (batch.orderChangeCount === 0 && batch.stopChangeCount === 0) return unavailable("invalid_response");
    if (input.orderChanges.length > batch.orderChangeCount || input.stopChanges.length > batch.stopChangeCount) {
      return unavailable("invalid_response");
    }
    if (
      !unchangedVersion &&
      (input.orderChanges.length < batch.orderChangeCount || input.stopChanges.length < batch.stopChangeCount)
    ) {
      return unavailable("child_response_incomplete");
    }
    const children = checkChildren(input, batch, account, generation);
    if (children.status !== "ok") return children;
    orderChanges = children.orderChanges;
    stopChanges = children.stopChanges;
  }
  if (unchangedVersion) {
    if (batch === null && (input.orderChanges.length !== 0 || input.stopChanges.length !== 0)) {
      return unavailable("invalid_response");
    }
    return { status: "usable", version: current, processedHeight, orderChanges: [], stopChanges: [] };
  }
  if (batch === null) return reset("missing_batch");
  // A guarded snapshot can already have accepted this exact overflow version.
  if (batch.overflow) return reset("overflow");
  // The first batch has no predecessor row. The snapshot's zero version is the only
  // version that may match absent predecessor fields.
  const predecessorMatches = isZeroVersion(previous)
    ? batch.predecessorBlockNumber == null && batch.predecessorBlockHash == null && batch.predecessorDigest == null
    : batch.predecessorBlockNumber === previous.blockNumber &&
      batch.predecessorBlockHash === previous.blockHash &&
      batch.predecessorDigest === previous.digest;
  if (!predecessorMatches) return reset("predecessor_mismatch");
  if (batchDigest(batch, orderChanges, stopChanges) !== batch.digest) return unavailable("invalid_response");
  return { status: "usable", version: current, processedHeight, orderChanges, stopChanges };
}
