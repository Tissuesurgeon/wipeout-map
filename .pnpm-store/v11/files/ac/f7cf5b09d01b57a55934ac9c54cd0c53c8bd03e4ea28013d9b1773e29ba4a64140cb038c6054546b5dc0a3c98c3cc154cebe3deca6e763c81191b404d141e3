// The guarded account snapshot.
//
// A snapshot is one account's complete open orders and pending stops at one version.
// The reader brackets the row read with two reads of the capability and the guard. It
// accepts the rows only when neither marker moved, so the rows describe exactly the
// version the guard names (`indexer/ACCOUNT-VIEW.md`, "Guarded snapshot").
//
// This is the SDK's port of `guardedAccountSnapshot` in `indexer/src/accountView.ts`.
// It adds the checks the reference leaves to the stream classifier, so both paths
// report the same reasons:
//
// - the capability must be contract version 3, in scope for this chain, and proved to
//   serve capacity-plus-one reads;
// - the guard must be in scope and well formed, and the indexer must have processed
//   its block;
// - every row must pass its schema, belong to the account, carry an id that matches
//   its identity, and sit in the query root its expiry puts it in.

import * as Raise from "../raise.js";
import * as Continuity from "./continuity.js";
import * as Wire from "./wireSchemas.js";
import type { AccountUnavailable, ReadyCapability } from "./continuity.js";
import type { WireGuard, WireOrderRow, WireStopRow, WireVersion } from "./wireSchemas.js";

/**
 *  The raw row roots of one `AccountOrderRows` response.
 *
 *  Each root should be a row list. A root that is not one makes the response broken,
 *  never an empty list.
 */
export interface AccountRowsResponse {
  ordersWithoutExpiry: unknown;
  ordersWithExpiry: unknown;
  stops: unknown;
  watermark: unknown;
}

/**
 *  One row read.
 *
 *  `responseBytes` is the measured UTF-8 size of the response. The deployed role serves an
 *  oversized response whole, so this measurement is what enforces the byte ceiling.
 *  `responseRefused` is a refusal that names the response size, which gives the same result.
 */
export type AccountRowsRead =
  | { status: "ok"; rows: AccountRowsResponse; expiryCutoffNs: bigint; responseBytes: number }
  | { status: "responseRefused" };

/** The capability row and, when the dataset generation is known, the account's guard. */
export interface AccountMarkers {
  /** `null` when the producer has no capability row; `undefined` when the response had no capability field. */
  capability: unknown;
  /** `undefined` when no generation was given; `null` when the account has no guard. */
  guard: unknown;
}

/** The transport the snapshot reads through. An adapter maps these calls onto `account-view.graphql`. */
export interface AccountSnapshotReader {
  /** Reads `SnapshotVersion`. Without a generation it reads the capability only. */
  readMarkers(account: string, datasetGeneration: string | null): Promise<AccountMarkers>;
  /** Reads `AccountOrderRows` with the given per-collection limits. */
  readRows(account: string, limits: { orders: number; stops: number }): Promise<AccountRowsRead>;
}

export interface GuardedSnapshotOptions {
  chainId: number;
  maxAttempts: number;
  /** A dataset generation already known, which saves one marker read on the first attempt. */
  datasetGeneration?: string | null;
}

export type AccountSnapshotCollection = "orders" | "stops" | "response_bytes";

export type GuardedSnapshotResult =
  | {
      status: "ok";
      capability: ReadyCapability;
      version: WireVersion;
      expiryCutoffNs: bigint;
      processedHeight: bigint;
      orders: readonly WireOrderRow[];
      stops: readonly WireStopRow[];
      responseBytes: number;
    }
  | AccountUnavailable
  | {
      status: "resource_limit";
      collection: AccountSnapshotCollection;
      capacity: number;
      capability: ReadyCapability;
      /** The earliest expiry among the orders read, so a caller knows when the account may shrink. */
      earliestExpiryNs: bigint | null;
    };

const ACCOUNT_PATTERN = /^0x[0-9a-f]{40}$/;

function sameGuard(left: WireGuard | null, right: WireGuard | null): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.id === right.id &&
    left.account === right.account &&
    left.datasetGeneration === right.datasetGeneration &&
    left.blockNumber === right.blockNumber &&
    left.blockHash === right.blockHash &&
    left.digest === right.digest
  );
}

/** A row root as a list, or `undefined` when it is not one. */
function rowList(root: unknown): readonly unknown[] | undefined {
  return Array.isArray(root) ? root : undefined;
}

type RowsCheck =
  | {
      status: "ok";
      orders: WireOrderRow[];
      stops: WireStopRow[];
      processedHeight: bigint;
      earliestExpiryNs: bigint | null;
    }
  | AccountUnavailable;

/** Validates one row response and combines its two order roots. */
function checkRows(rows: AccountRowsResponse, account: string, expiryCutoffNs: bigint): RowsCheck {
  const watermarkRows = rowList(rows.watermark);
  const withoutExpiryRows = rowList(rows.ordersWithoutExpiry);
  const withExpiryRows = rowList(rows.ordersWithExpiry);
  const stopRows = rowList(rows.stops);
  if (
    watermarkRows === undefined ||
    withoutExpiryRows === undefined ||
    withExpiryRows === undefined ||
    stopRows === undefined
  ) {
    return Continuity.unavailable("invalid_response");
  }
  const [watermark, ...extra] = watermarkRows;
  if (watermark === undefined || extra.length > 0) return Continuity.unavailable("invalid_response");
  const progress = Wire.wireWatermarkSchema.safeParse(watermark);
  if (!progress.success) return Continuity.unavailable("invalid_response");

  const orders = new Map<string, WireOrderRow>();
  let earliestExpiryNs: bigint | null = null;
  const addOrders = (raws: readonly unknown[], withExpiry: boolean): AccountUnavailable | undefined => {
    for (const raw of raws) {
      const parsed = Wire.wireOrderRowSchema.safeParse(raw);
      if (!parsed.success) return Continuity.unavailable("invalid_response");
      const order = parsed.data;
      if (order.owner !== account) return Continuity.unavailable("scope_mismatch");
      if (!Continuity.orderIdMatches(order.id, order.orderId)) return Continuity.unavailable("invalid_response");
      const expiry = BigInt(order.expireTimestampNs);
      // Each root selects one expiry class. A row outside its class is not what the query asked for.
      if (withExpiry ? expiry < expiryCutoffNs : expiry !== 0n) return Continuity.unavailable("invalid_response");
      // An order cannot be in both roots: its expiry is either zero or not.
      if (orders.has(order.id)) return Continuity.unavailable("invalid_response");
      if (withExpiry && (earliestExpiryNs === null || expiry < earliestExpiryNs)) earliestExpiryNs = expiry;
      orders.set(order.id, order);
    }
    return undefined;
  };
  const withoutExpiryFailure = addOrders(withoutExpiryRows, false);
  if (withoutExpiryFailure !== undefined) return withoutExpiryFailure;
  const withExpiryFailure = addOrders(withExpiryRows, true);
  if (withExpiryFailure !== undefined) return withExpiryFailure;

  const stops: WireStopRow[] = [];
  const stopIds = new Set<string>();
  for (const raw of stopRows) {
    const parsed = Wire.wireStopRowSchema.safeParse(raw);
    if (!parsed.success) return Continuity.unavailable("invalid_response");
    const stop = parsed.data;
    if (stop.owner !== account) return Continuity.unavailable("scope_mismatch");
    if (!Continuity.stopIdMatches(stop.id, stop.registry, stop.orderIdRaw) || stopIds.has(stop.id)) {
      return Continuity.unavailable("invalid_response");
    }
    stopIds.add(stop.id);
    stops.push(stop);
  }
  return {
    status: "ok",
    orders: [...orders.values()],
    stops,
    processedHeight: BigInt(progress.data.latest_processed_block),
    earliestExpiryNs,
  };
}

/**
 *  Checks the capability of a marker read.
 *
 *  `undefined` means the response had no capability field at all. That is a broken
 *  response, not a missing capability, so it is not read as one.
 */
function checkCapabilityRead(markers: AccountMarkers, chainId: number): Continuity.CapabilityCheck {
  if (markers.capability === undefined) return Continuity.unavailable("invalid_response");
  return Continuity.checkCapability(markers.capability, chainId);
}

type GuardRead = { status: "ok"; guard: WireGuard | null } | AccountUnavailable;

/**
 *  Checks the guard of a marker read made with a known generation.
 *
 *  `null` means the account has no guard. `undefined` means the response had no guard
 *  field at all, which is a broken response, not an empty account.
 */
function checkGuardRead(markers: AccountMarkers, capability: ReadyCapability, account: string): GuardRead {
  if (markers.guard === undefined) return Continuity.unavailable("invalid_response");
  return Continuity.checkGuard(markers.guard, capability, account);
}

/**
 *  Reads one account's complete open orders and pending stops at one version.
 *
 *  An attempt reads the markers, then the rows with capacity-plus-one limits, then the
 *  markers again. It accepts the rows only when both markers are unchanged. A changed
 *  marker starts the next attempt at once. After `maxAttempts` unstable attempts the
 *  result is `snapshot_changed`.
 *
 *  A marker read that shows the capability is no longer usable ends the read with that
 *  reason at once: the source's current state is what the caller needs, not a retry.
 *
 *  A transport failure rejects. The caller decides whether a rejection is retried.
 */
export async function guardedAccountSnapshot(
  account: string,
  reader: AccountSnapshotReader,
  options: GuardedSnapshotOptions,
): Promise<GuardedSnapshotResult> {
  if (!Number.isSafeInteger(options.maxAttempts) || options.maxAttempts <= 0) {
    Raise.unreachable("guardedAccountSnapshot needs a positive maxAttempts");
  }
  // Owners and guard ids are stored lower-cased, and the `owner` filter is
  // case-sensitive. A checksummed address would read back as an empty account.
  const normalized = account.toLowerCase();
  if (!ACCOUNT_PATTERN.test(normalized)) return Continuity.unavailable("scope_mismatch");
  let generation = options.datasetGeneration ?? null;
  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    let markers = await reader.readMarkers(normalized, generation);
    let capabilityCheck = checkCapabilityRead(markers, options.chainId);
    if (capabilityCheck.status !== "ok") return capabilityCheck;
    if (capabilityCheck.capability.datasetGeneration !== generation) {
      // The first read had no generation, or an old one, so its guard (if any) belongs
      // to another dataset. Read again under the capability's generation.
      generation = capabilityCheck.capability.datasetGeneration;
      markers = await reader.readMarkers(normalized, generation);
      capabilityCheck = checkCapabilityRead(markers, options.chainId);
      if (capabilityCheck.status !== "ok") return capabilityCheck;
      if (capabilityCheck.capability.datasetGeneration !== generation) continue;
    }
    const capability = capabilityCheck.capability;
    const beforeGuard = checkGuardRead(markers, capability, normalized);
    if (beforeGuard.status !== "ok") return beforeGuard;
    const read = await reader.readRows(normalized, {
      orders: capability.orderCapacity + 1,
      stops: capability.stopCapacity + 1,
    });
    const afterMarkers = await reader.readMarkers(normalized, generation);
    const afterCapability = checkCapabilityRead(afterMarkers, options.chainId);
    if (afterCapability.status !== "ok") return afterCapability;
    // Compare the capability first: under a new generation the guard read with the old
    // one belongs to another dataset, and checking it would report a false scope defect.
    if (!Wire.sameCapability(capability, afterCapability.capability)) continue;
    const afterGuard = checkGuardRead(afterMarkers, capability, normalized);
    if (afterGuard.status !== "ok") return afterGuard;
    if (!sameGuard(beforeGuard.guard, afterGuard.guard)) continue;

    const byteCeiling = capability.publicRoleMaxResponseBytes;
    if (read.status === "responseRefused") {
      return {
        status: "resource_limit",
        collection: "response_bytes",
        capacity: byteCeiling,
        capability,
        earliestExpiryNs: null,
      };
    }
    const rows = checkRows(read.rows, normalized, read.expiryCutoffNs);
    if (rows.status !== "ok") return rows;
    if (rows.orders.length > capability.orderCapacity) {
      return {
        status: "resource_limit",
        collection: "orders",
        capacity: capability.orderCapacity,
        capability,
        earliestExpiryNs: rows.earliestExpiryNs,
      };
    }
    if (rows.stops.length > capability.stopCapacity) {
      return {
        status: "resource_limit",
        collection: "stops",
        capacity: capability.stopCapacity,
        capability,
        earliestExpiryNs: rows.earliestExpiryNs,
      };
    }
    if (read.responseBytes > byteCeiling) {
      return {
        status: "resource_limit",
        collection: "response_bytes",
        capacity: byteCeiling,
        capability,
        earliestExpiryNs: rows.earliestExpiryNs,
      };
    }
    // A READY capability says nothing about how far the rebuild has come. Events below
    // `changeStartBlock` write no guard, so an early answer would be a partial account
    // that looks complete. A guard above the processed height is the same defect.
    if (rows.processedHeight < BigInt(capability.changeStartBlock)) {
      return Continuity.unavailable("processed_height_behind");
    }
    if (beforeGuard.guard !== null && rows.processedHeight < BigInt(beforeGuard.guard.blockNumber)) {
      return Continuity.unavailable("processed_height_behind");
    }
    return {
      status: "ok",
      capability,
      version: Continuity.versionOf(beforeGuard.guard, capability.datasetGeneration),
      expiryCutoffNs: read.expiryCutoffNs,
      processedHeight: rows.processedHeight,
      orders: rows.orders,
      stops: rows.stops,
      responseBytes: read.responseBytes,
    };
  }
  return Continuity.unavailable("snapshot_changed");
}
