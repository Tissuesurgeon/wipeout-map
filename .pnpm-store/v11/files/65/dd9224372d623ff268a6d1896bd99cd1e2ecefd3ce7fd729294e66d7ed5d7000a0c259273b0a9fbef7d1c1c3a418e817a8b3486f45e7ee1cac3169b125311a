// Fees — the protocol's fee streams and builder-fee attribution.
//
// SHARED across market kinds: one fee doctrine serves every pool. Protocol,
// builder and settlement fees are three separate indexed streams (each an entity
// of its own), and builder approval is the one write here — a user authorizing a
// routing frontend to attribute orders to itself and collect a per-order fee.
//
// The builder-approval CHAIN reads sit next to the indexed history deliberately:
// "is this builder approved right now" and "what has it earned" are the same
// question at two freshness tiers, and a caller comparing them should not have to
// find two modules.

import type { Address, PublicClient } from "viem";
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
import * as ReadsAbi from "./readsAbi.js";
import * as TradeAbi from "./tradeAbi.js";
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

// prettier-ignore
export const ProtocolFeeFields = graphql(`
  fragment ProtocolFeeFields on ProtocolFeeRecord {
    id
    orderId
    recipient
    payer
    token
    amount
    isTakerSide
    market: market_id
    pool
    timestamp
    txHash
  }
`);

// prettier-ignore
export const BuilderFeeFields = graphql(`
  fragment BuilderFeeFields on BuilderFeeRecord {
    id
    orderId
    builder
    payer
    token
    amount
    market: market_id
    pool
    timestamp
    txHash
  }
`);

// prettier-ignore
const SettlementFeeFields = graphql(`
  fragment SettlementFeeFields on SettlementFeeRecord {
    id
    recipient: feeRecipient
    amount: fee
    winningBacking
    market: market_id
    timestamp
    txHash
  }
`);

/**
 *  Realized protocol-fee records, newest first — filter by `recipient` /
 *  `market` / `pool` / `payer`, paginate with `limit`/`offset`. Complements
 *  {@link SomniaMarketsClient.getMarketFees} (frozen config + running total) with the per-fill stream.
 */
export async function listProtocolFees(
  opts: { recipient?: string; market?: string; pool?: string; payer?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<ProtocolFeeRecord[]> {
  const where: Record<string, unknown> = {};
  if (opts.recipient != null) where.recipient = { _eq: opts.recipient.toLowerCase() };
  if (opts.market != null) where.market_id = { _eq: opts.market.toLowerCase() };
  if (opts.pool != null) where.pool = { _eq: opts.pool.toLowerCase() };
  if (opts.payer != null) where.payer = { _eq: opts.payer.toLowerCase() };
  const data = await IndexerRead.gqlRequest(
    ProtocolFeesQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.ProtocolFeeRecord;
}

/**
 *  Realized builder/routing-fee records, newest first — filter by `builder` /
 *  `market` / `payer`, paginate with `limit`/`offset`.
 */
export async function listBuilderFees(
  opts: { builder?: string; market?: string; payer?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<BuilderFeeRecord[]> {
  const where: Record<string, unknown> = {};
  if (opts.builder != null) where.builder = { _eq: opts.builder.toLowerCase() };
  if (opts.market != null) where.market_id = { _eq: opts.market.toLowerCase() };
  if (opts.payer != null) where.payer = { _eq: opts.payer.toLowerCase() };
  const data = await IndexerRead.gqlRequest(
    BuilderFeesQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.BuilderFeeRecord;
}

/**
 *  Realized settlement-fee records, newest first — filter by `market` /
 *  `recipient`, paginate with `limit`/`offset`.
 */
export async function listSettlementFees(
  opts: { market?: string; recipient?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<SettlementFeeRecord[]> {
  const where: Record<string, unknown> = {};
  if (opts.market != null) where.market_id = { _eq: opts.market.toLowerCase() };
  if (opts.recipient != null) where.feeRecipient = { _eq: opts.recipient.toLowerCase() };
  const data = await IndexerRead.gqlRequest(
    SettlementFeesQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.SettlementFeeRecord;
}

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
export async function listBuilderApprovals(
  opts: { user?: string; builder?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<BuilderApproval[]> {
  const where: Record<string, unknown> = {};
  if (opts.user != null) where.user = { _eq: opts.user.toLowerCase() };
  if (opts.builder != null) where.builder = { _eq: opts.builder.toLowerCase() };
  const data = await IndexerRead.gqlRequest(
    BuilderApprovalsQuery,
    { where, limit: opts.limit ?? 100, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.BuilderApproval.map(({ market_id, market, ...rest }) => ({
    ...rest,
    market: market_id,
    // Nullable relationship, non-null `market_id` — see getOrders.
    pool: market?.poolAddress ?? "",
  }));
}

// prettier-ignore
const BuilderApprovalsQuery = graphql(`
  query BuilderApprovals($where: BuilderApproval_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         BuilderApproval(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
           id market_id market { poolAddress } user builder maxFeeBpsTimes1k blockNumber timestamp txHash
         }
       }
`);

// prettier-ignore
const ProtocolFeesQuery = graphql(`
  query ProtocolFees($where: ProtocolFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         ProtocolFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...ProtocolFeeFields }
       }
`);

// prettier-ignore
const BuilderFeesQuery = graphql(`
  query BuilderFees($where: BuilderFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         BuilderFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...BuilderFeeFields }
       }
`);

// prettier-ignore
const SettlementFeesQuery = graphql(`
  query SettlementFees($where: SettlementFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         SettlementFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...SettlementFeeFields }
       }
`);

// ----------------------------------------------------------------- builder-fee reads
// Pool builder/routing-fee views (pool bps×1000 unit). These are READS — no
// signer — so they live on the client read surface (client.getMaxBuilderFee…),
// not only on the write-side Trader. The order form uses them to show the pool
// ceiling and decide whether a one-time approveBuilder is needed BEFORE the user
// has (or needs) a connected signer.

/**
 *  A pool's protocol-wide per-order builder-fee ceiling (pool bps×1000).
 *  Binary, spot and perp pools all implement it. Owner-updatable on spot and
 *  perp, so treat it as current state rather than a constant.
 */
export async function getMaxBuilderFeeBpsTimes1k(pool: Address, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: pool,
    abi: ReadsAbi.binaryPoolReadAbi,
    functionName: "getMaxBuilderFeeBpsTimes1k",
  });
}

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
export async function getBuilderApproval(ref: BuilderApprovalRef, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: ref.pool,
    abi: ReadsAbi.binaryPoolReadAbi,
    functionName: "getBuilderApproval",
    args: [ref.user, ref.builder],
  });
}

/**
 *  The ENFORCED per-builder approval on a pool: the user's raw cap clamped
 *  by the pool's protocol-wide ceiling — the actual limit a `builderFeeBpsTimes1k`
 *  must not exceed.
 */
export async function getEffectiveBuilderApproval(ref: BuilderApprovalRef, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: ref.pool,
    abi: ReadsAbi.binaryPoolReadAbi,
    functionName: "getEffectiveBuilderApproval",
    args: [ref.user, ref.builder],
  });
}

// ---------------------------------------------------------------------------
// Write. Takes the `Writer` first (data-first); the `Trader` facade binds it.
// ---------------------------------------------------------------------------

export async function approveBuilder(w: WriterCtx, p: ApproveBuilderParams): Promise<TxResult> {
  return w.execute({
    address: p.pool,
    abi: TradeAbi.binaryPoolWriteAbi,
    functionName: "approveBuilder",
    args: [p.builder, p.maxFeeBpsTimes1k],
    gas: p.gas ?? w.defaultGas,
  });
}
