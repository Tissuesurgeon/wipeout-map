// GraphQL documents for the account view's live stream.
//
// These are the SDK's copies of the orders capability's three subscriptions in
// `indexer/account-stream.graphql` (`AccountCapabilityWatch`, `AccountGuardWatch`,
// `AccountChangeBatchStream`) and of `AccountChangeChildren` in
// `indexer/account-view.graphql`, which reads one or more batches' changes. They must stay
// identical to the producer's operations; `test/accountViewStreams.test.ts` fails when the
// copies differ.
//
// The subscriptions run over `graphqlWs.ts`. `AccountChangeChildren` is an HTTP read
// through `indexerRead.ts`, like the snapshot's reads.

import { graphql } from "../gql/gql.js";

// prettier-ignore
export const AccountCapabilityWatchSubscription = graphql(`
  subscription AccountCapabilityWatch($capabilityId: String!) {
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
  }
`);

// prettier-ignore
export const AccountGuardWatchSubscription = graphql(`
  subscription AccountGuardWatch($guardId: String!) {
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
export const AccountChangeBatchStreamSubscription = graphql(`
  subscription AccountChangeBatchStream(
    $account: String!
    $datasetGeneration: String!
    $afterBlock: numeric!
    $batchSize: Int!
  ) {
    batches: AccountChangeBatch_stream(
      batch_size: $batchSize
      cursor: { initial_value: { blockNumber: $afterBlock }, ordering: ASC }
      where: { account: { _eq: $account }, datasetGeneration: { _eq: $datasetGeneration } }
    ) {
      id
      account
      datasetGeneration
      blockNumber
      blockHash
      digest
      predecessorBlockNumber
      predecessorBlockHash
      predecessorDigest
      orderChangeCount
      stopChangeCount
      overflow
    }
  }
`);

// prettier-ignore
export const AccountChangeChildrenQuery = graphql(`
  query AccountChangeChildren(
    $batchIds: [String!]!
    $orderChildLimit: Int!
    $stopChildLimit: Int!
  ) {
    orderChanges: AccountOrderChange(
      where: { batch_id: { _in: $batchIds } }
      order_by: [{ blockNumber: desc }, { id: asc }]
      limit: $orderChildLimit
    ) {
      id
      batch_id
      account
      datasetGeneration
      blockNumber
      operation
      physicalEntityId
      terminalCause
      market_id
      orderId
      orderIdRaw
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
    stopChanges: AccountStopChange(
      where: { batch_id: { _in: $batchIds } }
      order_by: [{ blockNumber: desc }, { id: asc }]
      limit: $stopChildLimit
    ) {
      id
      batch_id
      account
      datasetGeneration
      blockNumber
      operation
      physicalEntityId
      terminalCause
      registry
      market_id
      orderIdRaw
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
