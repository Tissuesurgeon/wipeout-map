import type { AccountUnavailable, ReadyCapability } from "./continuity.js";
import type { WireOrderRow, WireStopRow, WireVersion } from "./wireSchemas.js";
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
export type AccountRowsRead = {
    status: "ok";
    rows: AccountRowsResponse;
    expiryCutoffNs: bigint;
    responseBytes: number;
} | {
    status: "responseRefused";
};
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
    readRows(account: string, limits: {
        orders: number;
        stops: number;
    }): Promise<AccountRowsRead>;
}
export interface GuardedSnapshotOptions {
    chainId: number;
    maxAttempts: number;
    /** A dataset generation already known, which saves one marker read on the first attempt. */
    datasetGeneration?: string | null;
}
export type AccountSnapshotCollection = "orders" | "stops" | "response_bytes";
export type GuardedSnapshotResult = {
    status: "ok";
    capability: ReadyCapability;
    version: WireVersion;
    expiryCutoffNs: bigint;
    processedHeight: bigint;
    orders: readonly WireOrderRow[];
    stops: readonly WireStopRow[];
    responseBytes: number;
} | AccountUnavailable | {
    status: "resource_limit";
    collection: AccountSnapshotCollection;
    capacity: number;
    capability: ReadyCapability;
    /** The earliest expiry among the orders read, so a caller knows when the account may shrink. */
    earliestExpiryNs: bigint | null;
};
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
export declare function guardedAccountSnapshot(account: string, reader: AccountSnapshotReader, options: GuardedSnapshotOptions): Promise<GuardedSnapshotResult>;
