import type { AccountViewError, IndexerError, IndexerUnavailableError, NotConfiguredError } from "../errors.js";
import type { BinaryMarketStatus } from "../store.js";
import type { AccountViewFailureReason, AccountViewUnavailableReason, AccountViewVersion } from "./types.js";
/**
 *  What an outcome balance redeems for.
 *
 *  | Status | Means |
 *  | --- | --- |
 *  | `unsettled` | The market is not finalized. Nothing is claimable yet. |
 *  | `known` | `amount` is the collateral the balance redeems for, in raw units and net of the settlement fee. It is 0 on a losing side. On a voided market it is the market's stored share for that side, which is not always a half. |
 *  | `unknown` | The indexer cannot say. Show it as unknown, never as zero. |
 *
 * @category account views
 */
export type AccountOutcomeClaimable = {
    readonly status: "unsettled";
} | {
    readonly status: "known";
    readonly amount: bigint;
} | {
    readonly status: "unknown";
    readonly reason: "payoutVectorMissing" | "marketMissing";
};
/**
 *  One YES or NO balance an account holds in an event-contract market.
 *
 * @category account views
 */
export interface AccountOutcomePosition {
    /** The row's stable id. Use it as the row key: one market can have a YES and a NO row. */
    readonly id: string;
    /** The market id (bytes32 hex). Join market data on this. */
    readonly marketId: string;
    /** 0 is YES, 1 is NO. */
    readonly outcomeIndex: 0 | 1;
    /** The ERC-6909 token id of this side. */
    readonly tokenId: bigint;
    /** The balance in raw outcome-token units, which use the market collateral's decimals. Always positive. */
    readonly balance: bigint;
    /** The market's status when the view was read, or `null` when it is unknown: the indexer has no market for the row, or no trading window for it. */
    readonly status: BinaryMarketStatus | null;
    readonly claimable: AccountOutcomeClaimable;
    /** The block the row last changed in. A change to the market's status counts. */
    readonly updatedAtBlock: bigint;
}
/**
 *  One account's complete outcome positions at one version.
 *
 * @category account views
 */
export interface AccountOutcomePositionsData {
    /** Every positive balance, sorted by id. The list is complete: a larger account is `tooLarge`. */
    readonly positions: readonly AccountOutcomePosition[];
    /** The version the view is complete at. */
    readonly version: AccountViewVersion;
    /** How far the indexer had processed the chain when the view was read. */
    readonly processedHeight: bigint;
    /** When the view was read, as a Unix time in milliseconds on this machine. */
    readonly observedAtMs: number;
}
interface Scope {
    /** The chain the view is on. */
    readonly chainId: number;
    /** The account, lower-case. */
    readonly account: string;
    /** A number that grows with every result the client produces, so a newer result has a larger one. */
    readonly revision: number;
}
/** @category account views */
export interface AccountOutcomePositionsReady extends Scope {
    readonly status: "ready";
    readonly data: AccountOutcomePositionsData;
}
/**
 *  The indexer cannot serve this view on this chain. This is never an empty account.
 *
 * @category account views
 */
export interface AccountOutcomePositionsUnavailable extends Scope {
    readonly status: "unavailable";
    readonly reason: AccountViewUnavailableReason;
    /** The indexer's own reason, when it gave one. */
    readonly detail: string | null;
}
/**
 *  The account holds more positions than a view can prove complete, or its response
 *  exceeded the indexer's byte limit.
 *
 * @category account views
 */
export interface AccountOutcomePositionsTooLarge extends Scope {
    readonly status: "tooLarge";
    /** Which limit the account exceeded. */
    readonly collection: "positions" | "responseBytes";
    /** The limit: a position count, or a byte count for `responseBytes`. */
    readonly capacity: number;
}
/**
 *  The result of `client.accountOutcomePositions.getSnapshot`. Switch on `status`.
 *
 * @category account views
 */
export type AccountOutcomePositionsSnapshot = AccountOutcomePositionsReady | AccountOutcomePositionsUnavailable | AccountOutcomePositionsTooLarge;
/**
 *  An error a live outcome-positions view reports.
 *
 * @category account views
 */
export type AccountOutcomePositionsViewError = AccountViewError | IndexerUnavailableError | IndexerError | NotConfiguredError;
/** @category account views */
export interface AccountOutcomePositionsLoading extends Scope {
    readonly status: "loading";
}
/**
 *  The last refresh failed. The view keeps its last complete data and error.
 *  Recoverable failures retry with backoff to at most 60 seconds. Held market
 *  statuses still follow the clock. Missing indexer configuration is terminal.
 *
 * @category account views
 */
export interface AccountOutcomePositionsStale extends Scope {
    readonly status: "stale";
    readonly data: AccountOutcomePositionsData;
    readonly error: AccountOutcomePositionsViewError;
}
/**
 *  The first read failed, so there is no data to show. `retrying` says whether
 *  the SDK tries again. Missing indexer configuration is terminal.
 *
 * @category account views
 */
export interface AccountOutcomePositionsFailed extends Scope {
    readonly status: "failed";
    /**
     * False when missing configuration prevents a retry. Always set by the SDK.
     * Optional so callers can continue constructing the previous view shape.
     */
    readonly retrying?: boolean;
    readonly reason: AccountViewFailureReason;
    readonly error: AccountOutcomePositionsViewError;
}
/**
 *  A live view ended: `stopLive()` stopped it, or the client's `signal` aborted. No view
 *  follows. After `stopLive()`, call `subscribe` again for a new one.
 *
 * @category account views
 */
export interface AccountOutcomePositionsClosed extends Scope {
    readonly status: "closed";
}
/**
 *  What `client.accountOutcomePositions.subscribe` delivers. Switch on `status`.
 *
 * @category account views
 */
export type AccountOutcomePositionsView = AccountOutcomePositionsLoading | AccountOutcomePositionsReady | AccountOutcomePositionsStale | AccountOutcomePositionsFailed | AccountOutcomePositionsUnavailable | AccountOutcomePositionsTooLarge | AccountOutcomePositionsClosed;
export {};
