// GraphQL documents for the account view's guarded snapshot.
//
// These are the SDK's copies of `SnapshotVersion`, `AccountOrderRows` and the
// `AccountOrderRow` fragment in `indexer/account-view.graphql`. They must stay
// identical to the producer's operations: the capacity, byte and plan measurements
// behind a READY capability were taken with exactly these selections.
// `test/accountViewDocuments.test.ts` fails when the two copies differ.
//
// Codegen types them from the committed `hasura-schema.graphql`, so a field the
// indexer does not serve fails `pnpm gql:codegen` rather than a read.
import { graphql } from "../gql/gql.js";
// prettier-ignore
export const SnapshotVersionQuery = graphql(`
  query SnapshotVersion($capabilityId: String!, $guardId: String!) {
    capability: AccountCapability_by_pk(id: $capabilityId) {
      id
      chainId
      capability
      contractVersion
      datasetGeneration
      manifestDigest
      changeStartBlock
      readiness
      unavailableReason
      orderCapacity
      stopCapacity
      retentionBatches
      publicRoleMaxRows
      publicRoleMaxResponseBytes
    }
    guard: AccountSnapshotGuard_by_pk(id: $guardId) {
      id
      account
      datasetGeneration
      blockNumber
      blockHash
      digest
    }
  }
`);
// prettier-ignore
const AccountOrderRowFields = graphql(`
  fragment AccountOrderRow on Order {
    id
    market_id
    orderId
    orderIdRaw
    owner
    isBid
    side
    userData
    price
    fullQuantity
    quantityRemaining
    filledQuantity
    expireTimestampNs
    status
    rested
    cancelReason
    amendedFromOrderId
    amendedToOrderId
    placedAtBlock
    placedAtTimestamp
    placedTxHash
    lastUpdatedAtBlock
    lastUpdatedAtTimestamp
  }
`);
// prettier-ignore
export const AccountOrderRowsQuery = graphql(`
  query AccountOrderRows(
    $account: String!
    $chainId: Int!
    $orderLimit: Int!
    $stopLimit: Int!
    $nowNs: numeric!
  ) {
    watermark: chain_metadata(where: { chain_id: { _eq: $chainId } }) {
      latest_processed_block
    }
    ordersWithoutExpiry: Order(
      where: {
        owner: { _eq: $account }
        status: { _eq: "Open" }
        expireTimestampNs: { _eq: 0 }
      }
      order_by: { id: asc }
      limit: $orderLimit
    ) {
      ...AccountOrderRow
    }
    ordersWithExpiry: Order(
      where: {
        owner: { _eq: $account }
        status: { _eq: "Open" }
        expireTimestampNs: { _gte: $nowNs }
      }
      order_by: [{ expireTimestampNs: asc }, { id: asc }]
      limit: $orderLimit
    ) {
      ...AccountOrderRow
    }
    stops: StopOrder(
      where: { owner: { _eq: $account }, status: { _eq: "PENDING" } }
      order_by: { id: asc }
      limit: $stopLimit
    ) {
      id
      registry
      market_id
      orderIdRaw
      owner
      isBid
      quantity
      triggerPrice
      triggerOperator
      orderType
      builder
      builderFeeBpsTimes1k
      status
      placedOrderId
      dropReason
      siblingOrderId
      intent
      cancelReason
      createdAt
      updatedAt
      txHash
    }
  }
`);
