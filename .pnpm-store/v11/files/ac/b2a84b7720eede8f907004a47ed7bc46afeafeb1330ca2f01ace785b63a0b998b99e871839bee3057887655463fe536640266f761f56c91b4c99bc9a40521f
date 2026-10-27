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
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
import * as ReadsAbi from "./readsAbi.js";
import * as TradeAbi from "./tradeAbi.js";
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
export async function listProtocolFees(opts = {}, indexerUrl) {
    const where = {};
    if (opts.recipient != null)
        where.recipient = { _eq: opts.recipient.toLowerCase() };
    if (opts.market != null)
        where.market_id = { _eq: opts.market.toLowerCase() };
    if (opts.pool != null)
        where.pool = { _eq: opts.pool.toLowerCase() };
    if (opts.payer != null)
        where.payer = { _eq: opts.payer.toLowerCase() };
    const data = await IndexerRead.gqlRequest(ProtocolFeesQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.ProtocolFeeRecord;
}
/**
 *  Realized builder/routing-fee records, newest first — filter by `builder` /
 *  `market` / `payer`, paginate with `limit`/`offset`.
 */
export async function listBuilderFees(opts = {}, indexerUrl) {
    const where = {};
    if (opts.builder != null)
        where.builder = { _eq: opts.builder.toLowerCase() };
    if (opts.market != null)
        where.market_id = { _eq: opts.market.toLowerCase() };
    if (opts.payer != null)
        where.payer = { _eq: opts.payer.toLowerCase() };
    const data = await IndexerRead.gqlRequest(BuilderFeesQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.BuilderFeeRecord;
}
/**
 *  Realized settlement-fee records, newest first — filter by `market` /
 *  `recipient`, paginate with `limit`/`offset`.
 */
export async function listSettlementFees(opts = {}, indexerUrl) {
    const where = {};
    if (opts.market != null)
        where.market_id = { _eq: opts.market.toLowerCase() };
    if (opts.recipient != null)
        where.feeRecipient = { _eq: opts.recipient.toLowerCase() };
    const data = await IndexerRead.gqlRequest(SettlementFeesQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.SettlementFeeRecord;
}
/**
 *  List builder approvals, newest-updated first — filter by `user` and/or
 *  `builder` (both indexed), paginate. The directory complement to the on-chain
 *  point read `client.getBuilderApproval`.
 */
export async function listBuilderApprovals(opts = {}, indexerUrl) {
    const where = {};
    if (opts.user != null)
        where.user = { _eq: opts.user.toLowerCase() };
    if (opts.builder != null)
        where.builder = { _eq: opts.builder.toLowerCase() };
    const data = await IndexerRead.gqlRequest(BuilderApprovalsQuery, { where, limit: opts.limit ?? 100, offset: opts.offset ?? 0 }, indexerUrl);
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
export async function getMaxBuilderFeeBpsTimes1k(pool, client) {
    return client.readContract({
        address: pool,
        abi: ReadsAbi.binaryPoolReadAbi,
        functionName: "getMaxBuilderFeeBpsTimes1k",
    });
}
/** A user's raw per-builder approval cap on a pool (pool bps×1000; 0 = none). */
export async function getBuilderApproval(ref, client) {
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
export async function getEffectiveBuilderApproval(ref, client) {
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
export async function approveBuilder(w, p) {
    return w.execute({
        address: p.pool,
        abi: TradeAbi.binaryPoolWriteAbi,
        functionName: "approveBuilder",
        args: [p.builder, p.maxFeeBpsTimes1k],
        gas: p.gas ?? w.defaultGas,
    });
}
