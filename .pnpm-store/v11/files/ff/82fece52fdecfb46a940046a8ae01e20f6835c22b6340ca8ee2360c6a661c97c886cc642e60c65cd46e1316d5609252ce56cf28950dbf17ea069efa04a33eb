import type { Address, PublicClient } from "viem";
import * as IndexerRead from "./indexerRead.js";
import type { Writer as WriterCtx } from "./writer.js";
import type { ApproveBuilderParams, TxResult } from "./trade.js";
/**
 *  A realized protocol-fee record (mirror of the indexer `ProtocolFeeRecord`
 *  entity). Amounts are raw collateral units.
 *
 * @category fees
 */
export type ProtocolFeeRecord = {
    /** Record id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** uint128 OrderId the fee was charged on (decimal string). */
    orderId: string;
    /** Fee recipient (lowercased). */
    recipient: string;
    /**
     *  Order owner who paid the fee (lowercased); null on records indexed before
     *  the payer field existed.
     */
    payer: string | null;
    /** Fee token (lowercased). */
    token: string;
    /** Fee charged (raw collateral units). */
    amount: string;
    /** true = taker rate (direct fill); false = maker rate (burn-a-pair leg). */
    isTakerSide: boolean;
    /** Market id the fee's pool belongs to (lowercased); null when unlinked. */
    market: string | null;
    /** Pool the fee was charged on (lowercased). */
    pool: string;
    /** Timestamp (unix seconds) the fee was charged. */
    timestamp: string;
    /** Tx hash the charge landed in. */
    txHash: string;
};
/**
 *  A realized builder/routing-fee record (mirror of the indexer
 *  `BuilderFeeRecord` entity). Amounts are raw collateral units.
 *
 * @category fees
 */
export type BuilderFeeRecord = {
    /** Record id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** uint128 OrderId the fee was charged on (decimal string). */
    orderId: string;
    /** Builder/routing frontend that received the fee (lowercased). */
    builder: string;
    /** Order owner who paid the fee (lowercased); null on pre-payer records. */
    payer: string | null;
    /** Fee token (lowercased). */
    token: string;
    /** Fee routed to the builder (raw collateral units). */
    amount: string;
    /** Market id the fee's pool belongs to (lowercased); null when unlinked. */
    market: string | null;
    /** Pool the fee was charged on (lowercased). */
    pool: string;
    /** Timestamp (unix seconds) the fee was charged. */
    timestamp: string;
    /** Tx hash the charge landed in. */
    txHash: string;
};
/**
 *  A realized settlement-fee record (mirror of the indexer
 *  `SettlementFeeRecord` entity) — the fee skimmed from a winning payout at
 *  redeem. Amounts are raw collateral units.
 *
 * @category fees
 */
export type SettlementFeeRecord = {
    /** Record id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** Fee recipient (lowercased). */
    recipient: string;
    /** Settlement fee skimmed from the winning backing (raw). */
    amount: string;
    /** Winning backing at charge time, before the fee (raw). */
    winningBacking: string;
    /** Market id the settlement fee belongs to (lowercased); null when unlinked. */
    market: string | null;
    /** Timestamp (unix seconds) the fee was charged (at finalize). */
    timestamp: string;
    /** Tx hash the charge landed in. */
    txHash: string;
};
export declare const ProtocolFeeFields: import("./gql/graphql.js").TypedDocumentString<import("./gql/graphql.js").ProtocolFeeFieldsFragment, unknown>;
export declare const BuilderFeeFields: import("./gql/graphql.js").TypedDocumentString<import("./gql/graphql.js").BuilderFeeFieldsFragment, unknown>;
/**
 *  Realized protocol-fee records, newest first — filter by `recipient` /
 *  `market` / `pool` / `payer`, paginate with `limit`/`offset`. Complements
 *  {@link SomniaMarketsClient.getMarketFees} (frozen config + running total) with the per-fill stream.
 */
export declare function listProtocolFees(opts: {
    recipient?: string;
    market?: string;
    pool?: string;
    payer?: string;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<ProtocolFeeRecord[]>;
/**
 *  Realized builder/routing-fee records, newest first — filter by `builder` /
 *  `market` / `payer`, paginate with `limit`/`offset`.
 */
export declare function listBuilderFees(opts: {
    builder?: string;
    market?: string;
    payer?: string;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<BuilderFeeRecord[]>;
/**
 *  Realized settlement-fee records, newest first — filter by `market` /
 *  `recipient`, paginate with `limit`/`offset`.
 */
export declare function listSettlementFees(opts: {
    market?: string;
    recipient?: string;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<SettlementFeeRecord[]>;
/**
 *  A user→builder fee approval (mirror of the indexer `BuilderApproval`
 *  entity) — the directory counterpart to the on-chain point read
 *  `client.getBuilderApproval`. `maxFeeBpsTimes1k` is the pool bps×1000 cap.
 *
 * @category fees
 */
export type BuilderApproval = {
    /** Approval id (`${market}_${user}_${builder}` — one row per triple, upserted). */
    id: string;
    /** Market id the approval applies to (lowercased). */
    market: string;
    /** Pool hosting that market's book (lowercased; joined via the market row). */
    pool: string;
    /** Granting user (lowercased). */
    user: string;
    /** Approved builder/routing frontend (lowercased). */
    builder: string;
    /** Max per-order builder fee the user approved (pool bps×1000; 0 = revoked). */
    maxFeeBpsTimes1k: string;
    /** Block of the last BuilderApproved upsert (decimal string). */
    blockNumber: string;
    /** Timestamp (unix seconds) of the last BuilderApproved upsert. */
    timestamp: string;
    /** Tx hash of the last BuilderApproved upsert. */
    txHash: string;
};
/**
 *  List builder approvals, newest-updated first — filter by `user` and/or
 *  `builder` (both indexed), paginate. The directory complement to the on-chain
 *  point read `client.getBuilderApproval`.
 */
export declare function listBuilderApprovals(opts: {
    user?: string;
    builder?: string;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<BuilderApproval[]>;
/**
 *  A pool's protocol-wide per-order builder-fee ceiling (pool bps×1000).
 *  Binary, spot and perp pools all implement it. Owner-updatable on spot and
 *  perp, so treat it as current state rather than a constant.
 */
export declare function getMaxBuilderFeeBpsTimes1k(pool: Address, client: PublicClient): Promise<bigint>;
/**
 *  Identifies one user's approval of one builder on one pool — the triple both
 *  `getBuilderApproval` and `getEffectiveBuilderApproval` key on.
 *
 * @category fees
 */
export interface BuilderApprovalRef {
    /** The pool the approval lives on (binary, spot, or perp). */
    pool: Address;
    /** The approving user. */
    user: Address;
    /** The approved builder. */
    builder: Address;
}
/** A user's raw per-builder approval cap on a pool (pool bps×1000; 0 = none). */
export declare function getBuilderApproval(ref: BuilderApprovalRef, client: PublicClient): Promise<bigint>;
/**
 *  The ENFORCED per-builder approval on a pool: the user's raw cap clamped
 *  by the pool's protocol-wide ceiling — the actual limit a `builderFeeBpsTimes1k`
 *  must not exceed.
 */
export declare function getEffectiveBuilderApproval(ref: BuilderApprovalRef, client: PublicClient): Promise<bigint>;
export declare function approveBuilder(w: WriterCtx, p: ApproveBuilderParams): Promise<TxResult>;
