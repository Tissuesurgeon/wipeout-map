export class TypedDocumentString extends String {
    __apiType;
    value;
    __meta__;
    constructor(value, __meta__) {
        super(value);
        this.value = value;
        this.__meta__ = __meta__;
    }
    toString() {
        return this.value;
    }
}
export const AccountOrderRowFragmentDoc = new TypedDocumentString(`
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
    `, { "fragmentName": "AccountOrderRow" });
export const ActivityFillFieldsFragmentDoc = new TypedDocumentString(`
    fragment ActivityFillFields on Fill {
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  takerIsBid
  takerOrder {
    owner
    side
  }
  blockNumber
  timestamp
  txHash
}
    `, { "fragmentName": "ActivityFillFields" });
export const ActivityRouterFieldsFragmentDoc = new TypedDocumentString(`
    fragment ActivityRouterFields on RouterActionRecord {
  id
  kind
  market: market_id
  account
  amount
  payout
  routedVia
  blockNumber
  timestamp
  txHash
}
    `, { "fragmentName": "ActivityRouterFields" });
export const ActivityResolutionFieldsFragmentDoc = new TypedDocumentString(`
    fragment ActivityResolutionFields on MarketResolutionEvent {
  id
  kind
  market: market_id
  outcomeIdx
  voided
  blockNumber
  timestamp
  txHash
}
    `, { "fragmentName": "ActivityResolutionFields" });
export const ActivityStatusFieldsFragmentDoc = new TypedDocumentString(`
    fragment ActivityStatusFields on MarketStatusUpdate {
  id
  market: market_id
  oldStatus
  newStatus
  blockNumber
  timestamp
  txHash
}
    `, { "fragmentName": "ActivityStatusFields" });
export const TransactionOrderFieldsFragmentDoc = new TypedDocumentString(`
    fragment TransactionOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}
    `, { "fragmentName": "TransactionOrderFields" });
export const BlockOrderFieldsFragmentDoc = new TypedDocumentString(`
    fragment BlockOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  cancelReason
  placedAtBlock
  placedTxHash
}
    `, { "fragmentName": "BlockOrderFields" });
export const PortfolioMarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment PortfolioMarketFields on Market {
  id
  marketAddress
  poolAddress
  asset
  question
  status: clobStatus
  lastPrice
  strike
  expiry
  winningOutcome
  voided
  payoutNumerators
  payoutDenominator
  quoteDecimals
  intervalSec
}
    `, { "fragmentName": "PortfolioMarketFields" });
export const ProtocolFeeFieldsFragmentDoc = new TypedDocumentString(`
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
    `, { "fragmentName": "ProtocolFeeFields" });
export const BuilderFeeFieldsFragmentDoc = new TypedDocumentString(`
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
    `, { "fragmentName": "BuilderFeeFields" });
export const SettlementFeeFieldsFragmentDoc = new TypedDocumentString(`
    fragment SettlementFeeFields on SettlementFeeRecord {
  id
  recipient: feeRecipient
  amount: fee
  winningBacking
  market: market_id
  timestamp
  txHash
}
    `, { "fragmentName": "SettlementFeeFields" });
export const FillQueryFieldsFragmentDoc = new TypedDocumentString(`
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}
    `, { "fragmentName": "FillQueryFields" });
export const MarketRefFieldsFragmentDoc = new TypedDocumentString(`
    fragment MarketRefFields on Market {
  id
  marketType
  poolAddress
  marketAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  asset
  question
}
    `, { "fragmentName": "MarketRefFields" });
export const TradeContextFillFieldsFragmentDoc = new TypedDocumentString(`
    fragment TradeContextFillFields on Fill {
  id
  market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  takerOrder {
    owner
    side
  }
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  blockNumber
  timestamp
  logIndex
  txHash
}
    `, { "fragmentName": "TradeContextFillFields" });
export const FillOrderFieldsFragmentDoc = new TypedDocumentString(`
    fragment FillOrderFields on Order {
  id
  orderId
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}
    `, { "fragmentName": "FillOrderFields" });
export const SeriesFieldsFragmentDoc = new TypedDocumentString(`
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}
    `, { "fragmentName": "SeriesFields" });
export const MarketCreatorFieldsFragmentDoc = new TypedDocumentString(`
    fragment MarketCreatorFields on MarketCreator {
  id
  owner
  policy
  core
  adapter
  operatorId
  venueId
  factory
  createdAtBlock
  createdAtTimestamp
}
    `, { "fragmentName": "MarketCreatorFields" });
export const OracleAdapterFieldsFragmentDoc = new TypedDocumentString(`
    fragment OracleAdapterFields on OracleAdapter {
  id
  owner
  factory
  approved
  approvedAtTimestamp
  createdAtTimestamp
}
    `, { "fragmentName": "OracleAdapterFields" });
export const MarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}
    `, { "fragmentName": "MarketFields" });
export const OperatorFieldsFragmentDoc = new TypedDocumentString(`
    fragment OperatorFields on Operator {
  operatorId
  owner
  feeRecipient
  enabled
  policy
  context
  pendingOwner
  venueCount
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}
    `, { "fragmentName": "OperatorFields" });
export const VenueFieldsFragmentDoc = new TypedDocumentString(`
    fragment VenueFields on Venue {
  venueId
  operatorId
  marketType
  feeParams
  feeRecipientOverride
  policy
  signer
  creationEnabled
  context
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}
    `, { "fragmentName": "VenueFields" });
export const OracleQuestionFieldsFragmentDoc = new TypedDocumentString(`
    fragment OracleQuestionFields on OracleQuestion {
  id
  questionKey
  scheduler
  oracleCost
  bindCount
  reuseCount
  createdAtBlock
  createdAtTimestamp
}
    `, { "fragmentName": "OracleQuestionFields" });
export const OperatorHubAccountFieldsFragmentDoc = new TypedDocumentString(`
    fragment OperatorHubAccountFields on OperatorHubAccount {
  id
  operatorId
  earmarked
  credit
  outstanding
  createdAtBlock
  createdAtTimestamp
  updatedAtBlock
  updatedAtTimestamp
}
    `, { "fragmentName": "OperatorHubAccountFields" });
export const OracleBindFieldsFragmentDoc = new TypedDocumentString(`
    fragment OracleBindFields on OracleBind {
  id
  oracleQuestionId
  bindIndex
  operatorId
  measuredGas
  overheadShare
  cost
  charged
  subsidy
  resolvedAt
  boundAtBlock
  boundAtTimestamp
  txHash
}
    `, { "fragmentName": "OracleBindFields" });
export const OracleCallbackFieldsFragmentDoc = new TypedDocumentString(`
    fragment OracleCallbackFields on OracleCallback {
  id
  marketsResolved
  gasPrice
  measuredGas
  overheadGasAttributed
  totalCost
  totalCharged
  subsidy
  pendingRemaining
  blockNumber
  timestamp
  txHash
}
    `, { "fragmentName": "OracleCallbackFields" });
export const OrderMarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}
    `, { "fragmentName": "OrderMarketFields" });
export const PerpPortfolioMarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment PerpPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  tickSize
  lotSize
  minQuantity
  lastPrice
  marginBank
  initialMarginBps
  fundingRate
  indexPrice
  stopRegistry
}
    `, { "fragmentName": "PerpPortfolioMarketFields" });
export const RouterActionFieldsFragmentDoc = new TypedDocumentString(`
    fragment RouterActionFields on RouterActionRecord {
  id
  kind
  account
  market: market_id
  amount
  payout
  routedVia
  timestamp
  txHash
}
    `, { "fragmentName": "RouterActionFields" });
export const SpotPortfolioMarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment SpotPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseToken
  quoteToken
  baseDecimals
  quoteDecimals
  baseIsNative
  tickSize
  lotSize
  minQuantity
  lastPrice
  markPrice
  stopRegistry
}
    `, { "fragmentName": "SpotPortfolioMarketFields" });
export const SpotStopOrderFieldsFragmentDoc = new TypedDocumentString(`
    fragment SpotStopOrderFields on StopOrder {
  id
  registry
  orderId: orderIdRaw
  isBid
  quantity
  triggerPrice
  triggerOperator
  orderType
  status
  placedOrderId
  createdAt
}
    `, { "fragmentName": "SpotStopOrderFields" });
export const SnapshotVersionDocument = new TypedDocumentString(`
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
export const AccountOrderRowsDocument = new TypedDocumentString(`
    query AccountOrderRows($account: String!, $chainId: Int!, $orderLimit: Int!, $stopLimit: Int!, $nowNs: numeric!) {
  watermark: chain_metadata(where: {chain_id: {_eq: $chainId}}) {
    latest_processed_block
  }
  ordersWithoutExpiry: Order(
    where: {owner: {_eq: $account}, status: {_eq: "Open"}, expireTimestampNs: {_eq: 0}}
    order_by: {id: asc}
    limit: $orderLimit
  ) {
    ...AccountOrderRow
  }
  ordersWithExpiry: Order(
    where: {owner: {_eq: $account}, status: {_eq: "Open"}, expireTimestampNs: {_gte: $nowNs}}
    order_by: [{expireTimestampNs: asc}, {id: asc}]
    limit: $orderLimit
  ) {
    ...AccountOrderRow
  }
  stops: StopOrder(
    where: {owner: {_eq: $account}, status: {_eq: "PENDING"}}
    order_by: {id: asc}
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
}`);
export const OutcomePositionsSnapshotVersionDocument = new TypedDocumentString(`
    query OutcomePositionsSnapshotVersion($capabilityId: String!, $guardId: String!) {
  capability: AccountOutcomePositionCapability_by_pk(id: $capabilityId) {
    id
    chainId
    capability
    contractVersion
    datasetGeneration
    manifestDigest
    changeStartBlock
    readiness
    unavailableReason
    positionCapacity
    publicRoleMaxRows
    publicRoleMaxResponseBytes
    indexedFields
    indexedWhenPresentFields
    enrichmentFields
  }
  guard: AccountOutcomePositionGuard_by_pk(id: $guardId) {
    id
    account
    datasetGeneration
    blockNumber
    blockHash
    digest
  }
}
    `);
export const AccountOutcomePositionRowsDocument = new TypedDocumentString(`
    query AccountOutcomePositionRows($account: String!, $chainId: Int!, $positionLimit: Int!) {
  watermark: chain_metadata(where: {chain_id: {_eq: $chainId}}) {
    latest_processed_block
  }
  positions: OutcomeBalance(
    where: {account: {_eq: $account}, balance: {_gt: 0}}
    order_by: {id: asc}
    limit: $positionLimit
  ) {
    id
    market_id
    account
    outcomeIndex
    tokenId
    balance
    updatedAtBlock
    market {
      clobStatus
      tradingStart
      expiry
      voided
      finalized
      payoutDenominator
      settledPayoutNumerators
    }
  }
}
    `);
export const AccountCapabilityWatchDocument = new TypedDocumentString(`
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
export const AccountGuardWatchDocument = new TypedDocumentString(`
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
export const AccountChangeBatchStreamDocument = new TypedDocumentString(`
    subscription AccountChangeBatchStream($account: String!, $datasetGeneration: String!, $afterBlock: numeric!, $batchSize: Int!) {
  batches: AccountChangeBatch_stream(
    batch_size: $batchSize
    cursor: {initial_value: {blockNumber: $afterBlock}, ordering: ASC}
    where: {account: {_eq: $account}, datasetGeneration: {_eq: $datasetGeneration}}
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
export const AccountChangeChildrenDocument = new TypedDocumentString(`
    query AccountChangeChildren($batchIds: [String!]!, $orderChildLimit: Int!, $stopChildLimit: Int!) {
  orderChanges: AccountOrderChange(
    where: {batch_id: {_in: $batchIds}}
    order_by: [{blockNumber: desc}, {id: asc}]
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
    where: {batch_id: {_in: $batchIds}}
    order_by: [{blockNumber: desc}, {id: asc}]
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
export const MarketActivityDocument = new TypedDocumentString(`
    query MarketActivity($fillWhere: Fill_bool_exp!, $routerWhere: RouterActionRecord_bool_exp!, $resolutionWhere: MarketResolutionEvent_bool_exp!, $statusWhere: MarketStatusUpdate_bool_exp!, $fillLimit: Int!, $routerLimit: Int!, $resolutionLimit: Int!, $statusLimit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: $fillWhere
    order_by: [{timestamp: desc}, {blockNumber: desc}, {logIndex: desc}]
    limit: $fillLimit
  ) {
    ...ActivityFillFields
  }
  RouterActionRecord(
    where: $routerWhere
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $routerLimit
  ) {
    ...ActivityRouterFields
  }
  MarketResolutionEvent(
    where: $resolutionWhere
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $resolutionLimit
  ) {
    ...ActivityResolutionFields
  }
  MarketStatusUpdate(
    where: $statusWhere
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $statusLimit
  ) {
    ...ActivityStatusFields
  }
}
    fragment ActivityFillFields on Fill {
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  takerIsBid
  takerOrder {
    owner
    side
  }
  blockNumber
  timestamp
  txHash
}
fragment ActivityRouterFields on RouterActionRecord {
  id
  kind
  market: market_id
  account
  amount
  payout
  routedVia
  blockNumber
  timestamp
  txHash
}
fragment ActivityResolutionFields on MarketResolutionEvent {
  id
  kind
  market: market_id
  outcomeIdx
  voided
  blockNumber
  timestamp
  txHash
}
fragment ActivityStatusFields on MarketStatusUpdate {
  id
  market: market_id
  oldStatus
  newStatus
  blockNumber
  timestamp
  txHash
}`);
export const TransactionEventsDocument = new TypedDocumentString(`
    query TransactionEvents($txHash: String!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(where: {txHash: {_eq: $txHash}}, order_by: {logIndex: asc}, limit: $limit) {
    ...ActivityFillFields
  }
  RouterActionRecord(
    where: {txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...ActivityRouterFields
  }
  MarketResolutionEvent(
    where: {txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...ActivityResolutionFields
  }
  MarketStatusUpdate(
    where: {txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...ActivityStatusFields
  }
}
    fragment ActivityFillFields on Fill {
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  takerIsBid
  takerOrder {
    owner
    side
  }
  blockNumber
  timestamp
  txHash
}
fragment ActivityRouterFields on RouterActionRecord {
  id
  kind
  market: market_id
  account
  amount
  payout
  routedVia
  blockNumber
  timestamp
  txHash
}
fragment ActivityResolutionFields on MarketResolutionEvent {
  id
  kind
  market: market_id
  outcomeIdx
  voided
  blockNumber
  timestamp
  txHash
}
fragment ActivityStatusFields on MarketStatusUpdate {
  id
  market: market_id
  oldStatus
  newStatus
  blockNumber
  timestamp
  txHash
}`);
export const TransactionOrderAnchorDocument = new TypedDocumentString(`
    query TransactionOrderAnchor($txHash: String!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(where: {placedTxHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {
    ...TransactionOrderFields
    placedAtBlock
  }
}
    fragment TransactionOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}`);
export const TransactionContextDocument = new TypedDocumentString(`
    query TransactionContext($txHash: String!, $timestamp: numeric!, $marketIds: [String!]!, $limit: Int!, $orderLimit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(
    where: {placedAtTimestamp: {_eq: $timestamp}, placedTxHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $orderLimit
  ) {
    ...TransactionOrderFields
  }
  ProtocolFeeRecord(
    where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...ProtocolFeeFields
  }
  BuilderFeeRecord(
    where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...BuilderFeeFields
  }
  Market(where: {id: {_in: $marketIds}}) {
    ...MarketFields
  }
}
    fragment TransactionOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}
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
fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const BlockActivityDocument = new TypedDocumentString(`
    query BlockActivity($ts: numeric!, $blk: numeric!, $limit: Int!, $offset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: {timestamp: {_eq: $ts}, blockNumber: {_eq: $blk}}
    order_by: {logIndex: asc}
    limit: $limit
    offset: $offset
  ) {
    ...ActivityFillFields
    makerOrder_id
    takerOrder_id
  }
  placed: Order(
    where: {placedAtTimestamp: {_eq: $ts}, placedAtBlock: {_eq: $blk}}
    order_by: {id: asc}
    limit: $limit
    offset: $offset
  ) {
    ...BlockOrderFields
  }
  touched: Order(
    where: {lastUpdatedAtTimestamp: {_eq: $ts}, lastUpdatedAtBlock: {_eq: $blk}}
    order_by: {id: asc}
    limit: $limit
    offset: $offset
  ) {
    ...BlockOrderFields
  }
}
    fragment ActivityFillFields on Fill {
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  takerIsBid
  takerOrder {
    owner
    side
  }
  blockNumber
  timestamp
  txHash
}
fragment BlockOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  cancelReason
  placedAtBlock
  placedTxHash
}`);
export const BlockMarketsDocument = new TypedDocumentString(`
    query BlockMarkets($marketIds: [String!]!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: {id: {_in: $marketIds}}) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const LatestActiveTimestampDocument = new TypedDocumentString(`
    query LatestActiveTimestamp {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(order_by: {timestamp: desc}, limit: 1) {
    timestamp
  }
  placed: Order(order_by: {placedAtTimestamp: desc}, limit: 1) {
    placedAtTimestamp
  }
  touched: Order(order_by: {lastUpdatedAtTimestamp: desc}, limit: 1) {
    lastUpdatedAtTimestamp
  }
}
    `);
export const ActiveBlocksAtTimestampDocument = new TypedDocumentString(`
    query ActiveBlocksAtTimestamp($ts: numeric!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(where: {timestamp: {_eq: $ts}}) {
    blockNumber
  }
  placed: Order(where: {placedAtTimestamp: {_eq: $ts}}) {
    placedAtBlock
  }
  touched: Order(where: {lastUpdatedAtTimestamp: {_eq: $ts}}) {
    lastUpdatedAtBlock
  }
}
    `);
export const AdjacentActiveBlocksDocument = new TypedDocumentString(`
    query AdjacentActiveBlocks($ts: numeric!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  prevFill: Fill(
    where: {timestamp: {_lte: $ts}}
    order_by: {timestamp: desc}
    limit: $limit
  ) {
    blockNumber
  }
  nextFill: Fill(
    where: {timestamp: {_gte: $ts}}
    order_by: {timestamp: asc}
    limit: $limit
  ) {
    blockNumber
  }
  prevPlaced: Order(
    where: {placedAtTimestamp: {_lte: $ts}}
    order_by: {placedAtTimestamp: desc}
    limit: $limit
  ) {
    placedAtBlock
  }
  nextPlaced: Order(
    where: {placedAtTimestamp: {_gte: $ts}}
    order_by: {placedAtTimestamp: asc}
    limit: $limit
  ) {
    placedAtBlock
  }
  prevTouched: Order(
    where: {lastUpdatedAtTimestamp: {_lte: $ts}}
    order_by: {lastUpdatedAtTimestamp: desc}
    limit: $limit
  ) {
    lastUpdatedAtBlock
  }
  nextTouched: Order(
    where: {lastUpdatedAtTimestamp: {_gte: $ts}}
    order_by: {lastUpdatedAtTimestamp: asc}
    limit: $limit
  ) {
    lastUpdatedAtBlock
  }
}
    `);
export const PortfolioDocument = new TypedDocumentString(`
    query Portfolio($acct: String!, $fillWhere: Fill_bool_exp!, $orderWhere: Order_bool_exp!, $ordersLimit: Int, $tradesLimit: Int, $positionsLimit: Int!, $positionsOffset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OutcomeBalance(
    where: {account: {_eq: $acct}, balance: {_gt: "0"}}
    order_by: [{balance: desc}, {id: asc}]
    limit: $positionsLimit
    offset: $positionsOffset
  ) {
    outcomeIndex
    tokenId
    balance
    market {
      ...PortfolioMarketFields
    }
  }
  ClobOrder: Order(
    where: $orderWhere
    order_by: {placedAtTimestamp: desc}
    limit: $ordersLimit
  ) {
    id
    orderId
    side
    price
    quantityRemaining
    filledQuantity
    fullQuantity
    placedAtTimestamp
    placedTxHash
    market {
      ...PortfolioMarketFields
    }
  }
  ClobFill: Fill(
    where: $fillWhere
    order_by: {timestamp: desc}
    limit: $tradesLimit
  ) {
    id
    fillPrice
    quantity
    timestamp
    txHash
    maker
    makerSide
    takerOrder {
      owner
      side
    }
    market {
      marketAddress
      asset
      quoteDecimals
    }
  }
}
    fragment PortfolioMarketFields on Market {
  id
  marketAddress
  poolAddress
  asset
  question
  status: clobStatus
  lastPrice
  strike
  expiry
  winningOutcome
  voided
  payoutNumerators
  payoutDenominator
  quoteDecimals
  intervalSec
}`);
export const OutcomeBalancesDocument = new TypedDocumentString(`
    query OutcomeBalances($acct: String!, $mkt: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OutcomeBalance(
    where: {account: {_eq: $acct}, market: {marketAddress: {_eq: $mkt}}}
  ) {
    outcomeIndex
    balance
  }
}
    `);
export const VaultPayoutFallbacksDocument = new TypedDocumentString(`
    query VaultPayoutFallbacks($where: VaultPayoutFallback_bool_exp!, $orderBy: [VaultPayoutFallback_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  VaultPayoutFallback(
    where: $where
    order_by: $orderBy
    limit: $limit
    offset: $offset
  ) {
    id
    owner
    token
    amount
    marketId: market_id
    market {
      poolAddress
    }
    timestamp
    txHash
  }
}
    `);
export const MarketResolutionDocument = new TypedDocumentString(`
    query MarketResolution($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketResolutionEvent(
    where: {market_id: {_eq: $id}}
    order_by: {timestamp: asc}
  ) {
    id
    market: market_id
    kind
    winningOutcome: outcomeIdx
    payoutNumerators
    payoutDenominator
    voided
    blockNumber
    timestamp
    txHash
  }
  MarketReferenceLink(where: {market_id: {_eq: $id}}, limit: 1) {
    id
    market: market_id
    oracleQuestionId: referenceQuestionId
    pending
    blockNumber
    timestamp
  }
  Market_by_pk(id: $id) {
    oracleQuestionId
  }
}
    `);
export const OracleAnswersDocument = new TypedDocumentString(`
    query OracleAnswers($closingQid: String!, $openingQid: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  closing: OracleAnswer_by_pk(id: $closingQid) {
    oracleQuestionId
    numericValue
    outcomeLabel
    voidReason
    resolvedAt
    txHash
  }
  opening: OracleAnswer_by_pk(id: $openingQid) {
    oracleQuestionId
    numericValue
    outcomeLabel
    voidReason
    resolvedAt
    txHash
  }
}
    `);
export const MarketResolutionEventsDocument = new TypedDocumentString(`
    query MarketResolutionEvents($where: MarketResolutionEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketResolutionEvent(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    market: market_id
    kind
    winningOutcome: outcomeIdx
    payoutNumerators
    payoutDenominator
    voided
    blockNumber
    timestamp
    txHash
  }
}
    `);
export const MarketReferenceLinksDocument = new TypedDocumentString(`
    query MarketReferenceLinks($where: MarketReferenceLink_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketReferenceLink(
    where: $where
    order_by: [{timestamp: asc}, {id: asc}]
    limit: $limit
    offset: $offset
  ) {
    id
    market: market_id
    oracleQuestionId: referenceQuestionId
    pending
    blockNumber
    timestamp
  }
}
    `);
export const CandlesDocument = new TypedDocumentString(`
    query Candles($where: Candle_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Candle(where: $where, order_by: [{bucketStart: desc}], limit: $limit) {
    bucketStart
    openPrice
    high
    low
    closePrice
    baseVolume
    quoteVolume
    tradeCount
    lastFillId
  }
}
    `);
export const BuilderApprovalsDocument = new TypedDocumentString(`
    query BuilderApprovals($where: BuilderApproval_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  BuilderApproval(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    market_id
    market {
      poolAddress
    }
    user
    builder
    maxFeeBpsTimes1k
    blockNumber
    timestamp
    txHash
  }
}
    `);
export const ProtocolFeesDocument = new TypedDocumentString(`
    query ProtocolFees($where: ProtocolFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  ProtocolFeeRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...ProtocolFeeFields
  }
}
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
}`);
export const BuilderFeesDocument = new TypedDocumentString(`
    query BuilderFees($where: BuilderFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  BuilderFeeRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...BuilderFeeFields
  }
}
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
}`);
export const SettlementFeesDocument = new TypedDocumentString(`
    query SettlementFees($where: SettlementFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  SettlementFeeRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...SettlementFeeFields
  }
}
    fragment SettlementFeeFields on SettlementFeeRecord {
  id
  recipient: feeRecipient
  amount: fee
  winningBacking
  market: market_id
  timestamp
  txHash
}`);
export const FillsDocument = new TypedDocumentString(`
    query Fills($where: Fill_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}]
    limit: $limit
    offset: $offset
  ) {
    ...FillQueryFields
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`);
export const UserFillsDocument = new TypedDocumentString(`
    query UserFills($where: Fill_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}]
    limit: $limit
    offset: $offset
  ) {
    ...FillQueryFields
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`);
export const FillsRangePageDocument = new TypedDocumentString(`
    query FillsRangePage($where: Fill_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: $where
    order_by: [{blockNumber: asc}, {logIndex: asc}]
    limit: $limit
  ) {
    ...FillQueryFields
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`);
export const LatestFillBlockDocument = new TypedDocumentString(`
    query LatestFillBlock($marketType: markettype!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: {marketType: {_eq: $marketType}}
    order_by: [{blockNumber: desc}]
    limit: 1
  ) {
    blockNumber
    timestamp
  }
}
    `);
export const UserFillsPageDocument = new TypedDocumentString(`
    query UserFillsPage($where: Fill_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  FillDataset_by_pk(id: "current") {
    generation
  }
  Fill(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}, {logIndex: desc}]
    limit: $limit
  ) {
    ...FillQueryFields
    blockNumber
    logIndex
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`);
export const FillDetailDocument = new TypedDocumentString(`
    query FillDetail($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(where: {id: {_eq: $id}}, limit: 1) {
    ...FillQueryFields
    blockNumber
    logIndex
    marketRef: market {
      ...MarketRefFields
    }
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}
fragment MarketRefFields on Market {
  id
  marketType
  poolAddress
  marketAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  asset
  question
}`);
export const OrderFillsDocument = new TypedDocumentString(`
    query OrderFills($pool: String!, $oid: numeric!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: {pool: {_eq: $pool}, _or: [{takerOrderId: {_eq: $oid}}, {makerOrderId: {_eq: $oid}}]}
    order_by: [{timestamp: desc}, {blockNumber: desc}]
    limit: $limit
  ) {
    ...FillQueryFields
    blockNumber
    logIndex
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`);
export const TradeContextDocument = new TypedDocumentString(`
    query TradeContext($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill_by_pk(id: $id) {
    ...TradeContextFillFields
    market {
      ...MarketFields
    }
    makerOrder {
      ...FillOrderFields
    }
    takerOrder {
      ...FillOrderFields
    }
  }
}
    fragment TradeContextFillFields on Fill {
  id
  market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  takerOrder {
    owner
    side
  }
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  blockNumber
  timestamp
  logIndex
  txHash
}
fragment FillOrderFields on Order {
  id
  orderId
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}
fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const FillTxContextDocument = new TypedDocumentString(`
    query FillTxContext($timestamp: numeric!, $txHash: String!, $market: String!, $id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}, id: {_neq: $id}}
    order_by: [{blockNumber: desc}, {logIndex: desc}]
    limit: 100
  ) {
    ...TradeContextFillFields
  }
  ProtocolFeeRecord(
    where: {market_id: {_eq: $market}, timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: 100
  ) {
    ...ProtocolFeeFields
  }
  BuilderFeeRecord(
    where: {market_id: {_eq: $market}, timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: 100
  ) {
    ...BuilderFeeFields
  }
}
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
fragment TradeContextFillFields on Fill {
  id
  market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  takerOrder {
    owner
    side
  }
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  blockNumber
  timestamp
  logIndex
  txHash
}`);
export const FillCountDocument = new TypedDocumentString(`
    query FillCount($where: Fill_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Fill_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `);
export const FillCountFallbackDocument = new TypedDocumentString(`
    query FillCountFallback($where: Fill_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Fill(where: $where, limit: $limit) {
    id
  }
}
    `);
export const MarketCreatorsDocument = new TypedDocumentString(`
    query MarketCreators($where: MarketCreator_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketCreator(
    where: $where
    order_by: {createdAtBlock: desc}
    limit: $limit
    offset: $offset
  ) {
    ...MarketCreatorFields
    series(order_by: {seriesId: asc}) {
      ...SeriesFields
    }
  }
}
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}
fragment MarketCreatorFields on MarketCreator {
  id
  owner
  policy
  core
  adapter
  operatorId
  venueId
  factory
  createdAtBlock
  createdAtTimestamp
}`);
export const MarketCreatorByPkDocument = new TypedDocumentString(`
    query MarketCreatorByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketCreator_by_pk(id: $id) {
    ...MarketCreatorFields
    series(order_by: {seriesId: asc}) {
      ...SeriesFields
    }
  }
}
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}
fragment MarketCreatorFields on MarketCreator {
  id
  owner
  policy
  core
  adapter
  operatorId
  venueId
  factory
  createdAtBlock
  createdAtTimestamp
}`);
export const OracleAdaptersDocument = new TypedDocumentString(`
    query OracleAdapters($where: OracleAdapter_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleAdapter(
    where: $where
    order_by: {createdAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OracleAdapterFields
  }
}
    fragment OracleAdapterFields on OracleAdapter {
  id
  owner
  factory
  approved
  approvedAtTimestamp
  createdAtTimestamp
}`);
export const OracleAdapterByPkDocument = new TypedDocumentString(`
    query OracleAdapterByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleAdapter_by_pk(id: $id) {
    ...OracleAdapterFields
  }
}
    fragment OracleAdapterFields on OracleAdapter {
  id
  owner
  factory
  approved
  approvedAtTimestamp
  createdAtTimestamp
}`);
export const SeriesByIdDocument = new TypedDocumentString(`
    query SeriesById($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Series(where: {id: {_eq: $id}}, limit: 1) {
    ...SeriesFields
  }
}
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}`);
export const SeriesListDocument = new TypedDocumentString(`
    query SeriesList($where: Series_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Series(
    where: $where
    order_by: {createdAtTimestamp: asc}
    limit: $limit
    offset: $offset
  ) {
    ...SeriesFields
  }
}
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}`);
export const SeriesLatestMarketsDocument = new TypedDocumentString(`
    query SeriesLatestMarkets($limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: {series_id: {_is_null: false}}
    distinct_on: series_id
    order_by: [{series_id: asc}, {createdAtTimestamp: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    series_id
    createdAtTimestamp
  }
}
    `);
export const RegistryMarketsDocument = new TypedDocumentString(`
    query RegistryMarkets($where: Market_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: $where
    order_by: [{createdAtTimestamp: desc}, {id: desc}]
    limit: $limit
  ) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const ResolvableMarketsDocument = new TypedDocumentString(`
    query ResolvableMarkets($id0: String! = "", $use0: Boolean! = false, $id1: String! = "", $use1: Boolean! = false, $id2: String! = "", $use2: Boolean! = false, $id3: String! = "", $use3: Boolean! = false, $id4: String! = "", $use4: Boolean! = false, $id5: String! = "", $use5: Boolean! = false, $id6: String! = "", $use6: Boolean! = false, $id7: String! = "", $use7: Boolean! = false, $id8: String! = "", $use8: Boolean! = false, $id9: String! = "", $use9: Boolean! = false, $id10: String! = "", $use10: Boolean! = false, $id11: String! = "", $use11: Boolean! = false, $id12: String! = "", $use12: Boolean! = false, $id13: String! = "", $use13: Boolean! = false, $id14: String! = "", $use14: Boolean! = false, $id15: String! = "", $use15: Boolean! = false, $id16: String! = "", $use16: Boolean! = false, $id17: String! = "", $use17: Boolean! = false, $id18: String! = "", $use18: Boolean! = false, $id19: String! = "", $use19: Boolean! = false, $id20: String! = "", $use20: Boolean! = false, $id21: String! = "", $use21: Boolean! = false, $id22: String! = "", $use22: Boolean! = false, $id23: String! = "", $use23: Boolean! = false, $id24: String! = "", $use24: Boolean! = false) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  market0: Market_by_pk(id: $id0) @include(if: $use0) {
    ...MarketFields
  }
  market1: Market_by_pk(id: $id1) @include(if: $use1) {
    ...MarketFields
  }
  market2: Market_by_pk(id: $id2) @include(if: $use2) {
    ...MarketFields
  }
  market3: Market_by_pk(id: $id3) @include(if: $use3) {
    ...MarketFields
  }
  market4: Market_by_pk(id: $id4) @include(if: $use4) {
    ...MarketFields
  }
  market5: Market_by_pk(id: $id5) @include(if: $use5) {
    ...MarketFields
  }
  market6: Market_by_pk(id: $id6) @include(if: $use6) {
    ...MarketFields
  }
  market7: Market_by_pk(id: $id7) @include(if: $use7) {
    ...MarketFields
  }
  market8: Market_by_pk(id: $id8) @include(if: $use8) {
    ...MarketFields
  }
  market9: Market_by_pk(id: $id9) @include(if: $use9) {
    ...MarketFields
  }
  market10: Market_by_pk(id: $id10) @include(if: $use10) {
    ...MarketFields
  }
  market11: Market_by_pk(id: $id11) @include(if: $use11) {
    ...MarketFields
  }
  market12: Market_by_pk(id: $id12) @include(if: $use12) {
    ...MarketFields
  }
  market13: Market_by_pk(id: $id13) @include(if: $use13) {
    ...MarketFields
  }
  market14: Market_by_pk(id: $id14) @include(if: $use14) {
    ...MarketFields
  }
  market15: Market_by_pk(id: $id15) @include(if: $use15) {
    ...MarketFields
  }
  market16: Market_by_pk(id: $id16) @include(if: $use16) {
    ...MarketFields
  }
  market17: Market_by_pk(id: $id17) @include(if: $use17) {
    ...MarketFields
  }
  market18: Market_by_pk(id: $id18) @include(if: $use18) {
    ...MarketFields
  }
  market19: Market_by_pk(id: $id19) @include(if: $use19) {
    ...MarketFields
  }
  market20: Market_by_pk(id: $id20) @include(if: $use20) {
    ...MarketFields
  }
  market21: Market_by_pk(id: $id21) @include(if: $use21) {
    ...MarketFields
  }
  market22: Market_by_pk(id: $id22) @include(if: $use22) {
    ...MarketFields
  }
  market23: Market_by_pk(id: $id23) @include(if: $use23) {
    ...MarketFields
  }
  market24: Market_by_pk(id: $id24) @include(if: $use24) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const MarketsDocument = new TypedDocumentString(`
    query Markets($where: Market_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: $where
    order_by: {createdAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const MarketByPkDocument = new TypedDocumentString(`
    query MarketByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market_by_pk(id: $id) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const MarketByAddressDocument = new TypedDocumentString(`
    query MarketByAddress($a: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: {marketAddress: {_eq: $a}}
    order_by: {createdAtTimestamp: desc}
    limit: 1
  ) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const BinaryMarketsDocument = new TypedDocumentString(`
    query BinaryMarkets($where: Market_bool_exp!, $orderBy: [Market_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const SpotMarketsDocument = new TypedDocumentString(`
    query SpotMarkets($where: Market_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: {createdAtTimestamp: desc}, limit: $limit) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const PerpMarketsDocument = new TypedDocumentString(`
    query PerpMarkets($where: Market_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: {createdAtTimestamp: desc}, limit: $limit) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const LiveBinaryMarketsDocument = new TypedDocumentString(`
    query LiveBinaryMarkets($where: Market_bool_exp!, $orderBy: [Market_order_by!], $limit: Int!, $offset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const PastBinaryMarketsDocument = new TypedDocumentString(`
    query PastBinaryMarkets($where: Market_bool_exp!, $limit: Int!, $offset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: {expiry: desc}, limit: $limit, offset: $offset) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const BinaryOriginPairsDocument = new TypedDocumentString(`
    query BinaryOriginPairs {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    distinct_on: [operatorId, venueId]
    where: {marketType: {_eq: "BINARY"}, operatorId: {_is_null: false}, venueId: {_is_null: false}}
    order_by: [{operatorId: asc}, {venueId: asc}]
  ) {
    operatorId
    venueId
  }
}
    `);
export const BinaryAssetsDocument = new TypedDocumentString(`
    query BinaryAssets {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    distinct_on: asset
    where: {marketType: {_eq: "BINARY"}, asset: {_is_null: false}}
    order_by: {asset: asc}
  ) {
    asset
  }
}
    `);
export const MarketFeesDocument = new TypedDocumentString(`
    query MarketFees($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketVenue_by_pk(id: $id) {
    operatorId
    venueId
    feeRecipient
    makerFeeBps
    takerFeeBps
    maxBuilderFeeBps
    routingFeeBps
    settlementFeeBps
    settlementFeesCollected
  }
}
    `);
export const MarketStatusHistoryDocument = new TypedDocumentString(`
    query MarketStatusHistory($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketStatusUpdate(where: {market_id: {_eq: $id}}, order_by: {timestamp: asc}) {
    oldStatus
    newStatus
    blockNumber
    timestamp
    txHash
  }
}
    `);
export const OracleAnswersByQidDocument = new TypedDocumentString(`
    query OracleAnswersByQid($qids: [String!]) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleAnswer(where: {id: {_in: $qids}}) {
    id
    numericValue
    voided
  }
}
    `);
export const ResolutionQidsDocument = new TypedDocumentString(`
    query ResolutionQids($ids: [String!]) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: {id: {_in: $ids}}) {
    id
    oracleQuestionId
  }
}
    `);
export const OpeningRefsDocument = new TypedDocumentString(`
    query OpeningRefs($ids: [String!]) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketReferenceLink(where: {market_id: {_in: $ids}}) {
    market: market_id
    referenceQuestionId
  }
}
    `);
export const MarketCountDocument = new TypedDocumentString(`
    query MarketCount($where: Market_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Market_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `);
export const MarketCountFallbackDocument = new TypedDocumentString(`
    query MarketCountFallback($where: Market_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Market(where: $where, limit: $limit) {
    id
  }
}
    `);
export const OperatorsDocument = new TypedDocumentString(`
    query Operators($where: Operator_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Operator(
    where: $where
    order_by: {operatorId: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OperatorFields
  }
}
    fragment OperatorFields on Operator {
  operatorId
  owner
  feeRecipient
  enabled
  policy
  context
  pendingOwner
  venueCount
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}`);
export const OperatorByPkDocument = new TypedDocumentString(`
    query OperatorByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Operator_by_pk(id: $id) {
    ...OperatorFields
  }
}
    fragment OperatorFields on Operator {
  operatorId
  owner
  feeRecipient
  enabled
  policy
  context
  pendingOwner
  venueCount
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}`);
export const VenuesDocument = new TypedDocumentString(`
    query Venues($where: Venue_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Venue(
    where: $where
    order_by: {createdAtTimestamp: asc}
    limit: $limit
    offset: $offset
  ) {
    ...VenueFields
  }
}
    fragment VenueFields on Venue {
  venueId
  operatorId
  marketType
  feeParams
  feeRecipientOverride
  policy
  signer
  creationEnabled
  context
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}`);
export const VenueByPkDocument = new TypedDocumentString(`
    query VenueByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Venue_by_pk(id: $id) {
    ...VenueFields
  }
}
    fragment VenueFields on Venue {
  venueId
  operatorId
  marketType
  feeParams
  feeRecipientOverride
  policy
  signer
  creationEnabled
  context
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}`);
export const OperatorCountDocument = new TypedDocumentString(`
    query OperatorCount($where: Operator_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Operator_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `);
export const OperatorCountFallbackDocument = new TypedDocumentString(`
    query OperatorCountFallback($where: Operator_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Operator(where: $where, limit: $limit) {
    id
  }
}
    `);
export const VenueCountDocument = new TypedDocumentString(`
    query VenueCount($where: Venue_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Venue_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `);
export const VenueCountFallbackDocument = new TypedDocumentString(`
    query VenueCountFallback($where: Venue_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Venue(where: $where, limit: $limit) {
    id
  }
}
    `);
export const OracleQuestionDocument = new TypedDocumentString(`
    query OracleQuestion($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleQuestion_by_pk(id: $id) {
    ...OracleQuestionFields
  }
}
    fragment OracleQuestionFields on OracleQuestion {
  id
  questionKey
  scheduler
  oracleCost
  bindCount
  reuseCount
  createdAtBlock
  createdAtTimestamp
}`);
export const OracleQuestionsDocument = new TypedDocumentString(`
    query OracleQuestions($where: OracleQuestion_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleQuestion(
    where: $where
    order_by: {createdAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OracleQuestionFields
  }
}
    fragment OracleQuestionFields on OracleQuestion {
  id
  questionKey
  scheduler
  oracleCost
  bindCount
  reuseCount
  createdAtBlock
  createdAtTimestamp
}`);
export const OperatorHubAccountDocument = new TypedDocumentString(`
    query OperatorHubAccount($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OperatorHubAccount_by_pk(id: $id) {
    ...OperatorHubAccountFields
  }
}
    fragment OperatorHubAccountFields on OperatorHubAccount {
  id
  operatorId
  earmarked
  credit
  outstanding
  createdAtBlock
  createdAtTimestamp
  updatedAtBlock
  updatedAtTimestamp
}`);
export const OperatorHubAccountsDocument = new TypedDocumentString(`
    query OperatorHubAccounts($limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OperatorHubAccount(
    order_by: {updatedAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OperatorHubAccountFields
  }
}
    fragment OperatorHubAccountFields on OperatorHubAccount {
  id
  operatorId
  earmarked
  credit
  outstanding
  createdAtBlock
  createdAtTimestamp
  updatedAtBlock
  updatedAtTimestamp
}`);
export const OracleBindsDocument = new TypedDocumentString(`
    query OracleBinds($where: OracleBind_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleBind(
    where: $where
    order_by: {boundAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OracleBindFields
  }
}
    fragment OracleBindFields on OracleBind {
  id
  oracleQuestionId
  bindIndex
  operatorId
  measuredGas
  overheadShare
  cost
  charged
  subsidy
  resolvedAt
  boundAtBlock
  boundAtTimestamp
  txHash
}`);
export const OracleCallbacksDocument = new TypedDocumentString(`
    query OracleCallbacks($limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleCallback(order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
    ...OracleCallbackFields
  }
}
    fragment OracleCallbackFields on OracleCallback {
  id
  marketsResolved
  gasPrice
  measuredGas
  overheadGasAttributed
  totalCost
  totalCharged
  subsidy
  pendingRemaining
  blockNumber
  timestamp
  txHash
}`);
export const SweepableOrdersDocument = new TypedDocumentString(`
    query SweepableOrders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(
    where: $where
    order_by: [{expireTimestampNs: asc}, {id: asc}]
    limit: $limit
    offset: $offset
  ) {
    id
    orderId
    owner
    isBid
    price
    quantityRemaining
    expireTimestampNs
    placedAtTimestamp
    market: market_id
    marketRow: market {
      poolAddress
      marketType
      ...OrderMarketFields
    }
  }
}
    fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}`);
export const OpenOrdersDocument = new TypedDocumentString(`
    query OpenOrders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(
    where: $where
    order_by: [{placedAtTimestamp: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    orderId
    userData
    side
    isBid
    price
    quantityRemaining
    market: market_id
    marketRow: market {
      poolAddress
      ...OrderMarketFields
    }
  }
}
    fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}`);
export const OrdersDocument = new TypedDocumentString(`
    query Orders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(
    where: $where
    order_by: [{placedAtTimestamp: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    orderId
    userData
    side
    isBid
    price
    quantityRemaining
    fullQuantity
    filledQuantity
    status
    rested
    expireTimestampNs
    placedTxHash
    placedAtTimestamp
    cancelReason
    amendedFromOrderId
    amendedToOrderId
    market: market_id
    marketRow: market {
      poolAddress
      ...OrderMarketFields
    }
  }
}
    fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}`);
export const OrderDetailDocument = new TypedDocumentString(`
    query OrderDetail($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(where: {id: {_eq: $id}}, limit: 1) {
    id
    orderId
    owner
    userData
    side
    isBid
    price
    quantityRemaining
    fullQuantity
    filledQuantity
    status
    rested
    expireTimestampNs
    placedTxHash
    placedAtTimestamp
    placedAtBlock
    lastUpdatedAtTimestamp
    cancelReason
    amendedFromOrderId
    amendedToOrderId
    market: market_id
    marketRow: market {
      poolAddress
      ...OrderMarketFields
    }
    marketRef: market {
      ...MarketRefFields
    }
  }
}
    fragment MarketRefFields on Market {
  id
  marketType
  poolAddress
  marketAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  asset
  question
}
fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}`);
export const BookTopsDocument = new TypedDocumentString(`
    query BookTops($bidWhere: Order_bool_exp!, $askWhere: Order_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  bids: Order(
    where: $bidWhere
    distinct_on: market_id
    order_by: [{market_id: desc}, {price: desc}]
  ) {
    market: market_id
    price
  }
  asks: Order(
    where: $askWhere
    distinct_on: market_id
    order_by: [{market_id: asc}, {price: asc}]
  ) {
    market: market_id
    price
  }
}
    `);
export const OrderCountDocument = new TypedDocumentString(`
    query OrderCount($where: Order_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Order_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `);
export const OrderCountFallbackDocument = new TypedDocumentString(`
    query OrderCountFallback($where: Order_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Order(where: $where, limit: $limit) {
    id
  }
}
    `);
export const FundingPaymentsDocument = new TypedDocumentString(`
    query FundingPayments($where: FundingPayment_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  FundingPayment(
    where: $where
    order_by: [{timestamp: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    account
    pool
    amount
    timestamp
    txHash
  }
}
    `);
export const MarginEventsDocument = new TypedDocumentString(`
    query MarginEvents($where: MarginEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarginEvent(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    account
    kind
    pool
    amount
    granter
    timestamp
    txHash
  }
}
    `);
export const LiquidationsDocument = new TypedDocumentString(`
    query Liquidations($where: LiquidationEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  LiquidationEvent(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    account
    pool
    kind
    size
    price
    counterparty
    penalty
    badDebt
    insuranceCovered
    deficit
    coverageDeclined
    collateralAmount
    equity
    positionsProcessed
    stageReached
    marginStatusBefore
    marginStatusAfter
    timestamp
    blockNumber
    txHash
  }
}
    `);
export const FundingRateHistoryDocument = new TypedDocumentString(`
    query FundingRateHistory($where: FundingRateUpdate_bool_exp!, $orderBy: [FundingRateUpdate_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  FundingRateUpdate(
    where: $where
    order_by: $orderBy
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    fundingRate
    cumulativeFundingPerUnit
    indexPrice
    markPrice
    intervalsSettled
    intervalsAccrued
    fundingWindowSec
    fundingIntervalSec
    spanStart
    spanEnd
    anchorResynced
    timestamp
    blockNumber
    txHash
  }
}
    `);
export const FundingRateCandlesDocument = new TypedDocumentString(`
    query FundingRateCandles($where: FundingRateCandle_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  FundingRateCandle(
    where: $where
    order_by: {bucketStart: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    intervalSeconds
    bucketStart
    avgFundingRate8h
    minFundingRate8h
    maxFundingRate8h
    coverage
    cumulativeFundingStart
    cumulativeFundingEnd
    fundingWindowSec
    fundingIntervalSec
    paramsChangedInBucket
    indexPriceEnd
    openInterestEnd
    updateCount
  }
}
    `);
export const PerpFeesDocument = new TypedDocumentString(`
    query PerpFees($where: PerpFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpFeeRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    account
    pool
    amount
    isRebate
    kind
    insurancePortion
    tier
    fillNotional
    builder
    timestamp
    txHash
  }
}
    `);
export const OpenInterestHistoryDocument = new TypedDocumentString(`
    query OpenInterestHistory($pool: String!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OpenInterestSnapshot(
    where: {pool: {_eq: $pool}}
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    openInterest
    timestamp
    blockNumber
  }
}
    `);
export const PerpOrderRejectionsDocument = new TypedDocumentString(`
    query PerpOrderRejections($where: PerpOrderRejection_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpOrderRejection(
    where: $where
    order_by: [{blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    owner
    pool
    reason
    requestIndex
    timestamp
    blockNumber
    txHash
  }
}
    `);
export const PerpPositionChangesDocument = new TypedDocumentString(`
    query PerpPositionChanges($where: PerpPositionChange_bool_exp!, $orderBy: [PerpPositionChange_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpPositionChange(
    where: $where
    order_by: $orderBy
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    account
    kind
    sizeBefore
    sizeAfter
    closedSize
    entryPriceBefore
    entryPriceAfter
    exitPrice
    orderId
    realizedPnl
    timestamp
    blockNumber
    logIndex
    txHash
  }
}
    `);
export const PerpWalletLinkEventsDocument = new TypedDocumentString(`
    query PerpWalletLinkEvents($where: PerpWalletLinkEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpWalletLinkEvent(
    where: $where
    order_by: [{blockNumber: desc}, {logIndex: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    kind
    main
    child
    timestamp
    blockNumber
    logIndex
    txHash
  }
}
    `);
export const PerpMarginPullsDocument = new TypedDocumentString(`
    query PerpMarginPulls($where: PerpMarginPull_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpMarginPull(
    where: $where
    order_by: [{blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    account
    pool
    orderId
    source
    amount
    payer
    timestamp
    blockNumber
    txHash
  }
}
    `);
export const PerpMainFundingEventsDocument = new TypedDocumentString(`
    query PerpMainFundingEvents($where: PerpMainFundingEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpMainFundingEvent(
    where: $where
    order_by: [{blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    account
    kind
    payer
    amount
    previousPrincipal
    outstandingPrincipal
    timestamp
    blockNumber
    txHash
  }
}
    `);
export const PerpPortfolioDocument = new TypedDocumentString(`
    query PerpPortfolio($fillWhere: Fill_bool_exp!, $orderWhere: Order_bool_exp!, $ordersLimit: Int, $tradesLimit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpOrder: Order(
    where: $orderWhere
    order_by: {placedAtTimestamp: desc}
    limit: $ordersLimit
  ) {
    id
    orderId
    isBid
    price
    quantityRemaining
    filledQuantity
    fullQuantity
    placedAtTimestamp
    placedTxHash
    market {
      ...PerpPortfolioMarketFields
    }
  }
  PerpFill: Fill(
    where: $fillWhere
    order_by: {timestamp: desc}
    limit: $tradesLimit
  ) {
    id
    fillPrice
    quantity
    quoteQuantity
    timestamp
    txHash
    maker
    taker
    takerIsBid
    market {
      ...PerpPortfolioMarketFields
    }
  }
}
    fragment PerpPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  tickSize
  lotSize
  minQuantity
  lastPrice
  marginBank
  initialMarginBps
  fundingRate
  indexPrice
  stopRegistry
}`);
export const PerpOrderHistoryDocument = new TypedDocumentString(`
    query PerpOrderHistory($where: Order_bool_exp!, $orderBy: [Order_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
    id
    orderId
    isBid
    price
    quantityRemaining
    filledQuantity
    fullQuantity
    status
    rested
    cancelReason
    expireTimestampNs
    placedAtTimestamp
    placedTxHash
    lastUpdatedAtTimestamp
    market {
      ...PerpPortfolioMarketFields
    }
  }
}
    fragment PerpPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  tickSize
  lotSize
  minQuantity
  lastPrice
  marginBank
  initialMarginBps
  fundingRate
  indexPrice
  stopRegistry
}`);
export const PerpPositionsDocument = new TypedDocumentString(`
    query PerpPositions($where: PerpPosition_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpPosition(
    where: $where
    order_by: {updatedAt: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    account
    size
    isLong
    entryPriceX18
    realizedPnl
    updatedAt
    updatedAtBlock
  }
}
    `);
export const PerpStopOrdersDocument = new TypedDocumentString(`
    query PerpStopOrders($where: StopOrder_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  StopOrder(
    where: $where
    order_by: [{createdAt: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    registry
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
    market {
      poolAddress
      baseSymbol
      quoteSymbol
      baseDecimals
      quoteDecimals
    }
  }
}
    `);
export const PerpInsuranceFundEventsDocument = new TypedDocumentString(`
    query PerpInsuranceFundEvents($where: PerpInsuranceFundEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpInsuranceFundEvent(
    where: $where
    order_by: [{blockNumber: desc}, {logIndex: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    kind
    tier
    toTier
    amount
    requested
    covered
    account
    counterparty
    caller
    timestamp
    blockNumber
    logIndex
    txHash
  }
}
    `);
export const MarketsByPoolDocument = new TypedDocumentString(`
    query MarketsByPool($pool: String!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: {poolAddress: {_eq: $pool}}
    order_by: {createdAtTimestamp: desc}
    limit: $limit
  ) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`);
export const PoolBindingsDocument = new TypedDocumentString(`
    query PoolBindings($pool: String!, $limit: Int!, $offset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PoolBinding(
    where: {poolAddress: {_eq: $pool}}
    order_by: {nonce: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    poolAddress
    marketId
    nonce
    fromBlock
    fromLogIndex
    fromTimestamp
    toBlock
    toLogIndex
    toTimestamp
    closedBy
  }
}
    `);
export const PoolByPkDocument = new TypedDocumentString(`
    query PoolByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Pool_by_pk(id: $id) {
    id
    address
    collateral
    creator
    currentMarketId
    currentNonce
    generationCount
    createdAtTimestamp
    updatedAtTimestamp
  }
}
    `);
export const PoolTypesDocument = new TypedDocumentString(`
    query PoolTypes($pools: [String!]!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: {poolAddress: {_in: $pools}}
    distinct_on: poolAddress
    order_by: [{poolAddress: asc}, {createdAtTimestamp: desc}]
    limit: $limit
  ) {
    poolAddress
    marketType
  }
}
    `);
export const PoolsByTypeDocument = new TypedDocumentString(`
    query PoolsByType($where: Market_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: $where
    distinct_on: poolAddress
    order_by: {poolAddress: asc}
    limit: $limit
  ) {
    poolAddress
  }
}
    `);
export const RouterActionsDocument = new TypedDocumentString(`
    query RouterActions($where: RouterActionRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  RouterActionRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...RouterActionFields
  }
}
    fragment RouterActionFields on RouterActionRecord {
  id
  kind
  account
  market: market_id
  amount
  payout
  routedVia
  timestamp
  txHash
}`);
export const SpotPortfolioDocument = new TypedDocumentString(`
    query SpotPortfolio($acct: String!, $fillWhere: Fill_bool_exp!, $orderWhere: Order_bool_exp!, $ordersLimit: Int, $tradesLimit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  SpotOrder: Order(
    where: $orderWhere
    order_by: {placedAtTimestamp: desc}
    limit: $ordersLimit
  ) {
    id
    orderId
    isBid
    price
    quantityRemaining
    filledQuantity
    fullQuantity
    placedAtTimestamp
    placedTxHash
    market {
      ...SpotPortfolioMarketFields
    }
  }
  SpotStopOrder: StopOrder(
    where: {owner: {_eq: $acct}, status: {_eq: "PENDING"}}
    order_by: {createdAt: desc}
    limit: $ordersLimit
  ) {
    ...SpotStopOrderFields
    market {
      ...SpotPortfolioMarketFields
    }
  }
  SpotFill: Fill(
    where: $fillWhere
    order_by: {timestamp: desc}
    limit: $tradesLimit
  ) {
    id
    fillPrice
    quantity
    quoteQuantity
    timestamp
    txHash
    maker
    taker
    takerIsBid
    market {
      ...SpotPortfolioMarketFields
    }
  }
}
    fragment SpotPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseToken
  quoteToken
  baseDecimals
  quoteDecimals
  baseIsNative
  tickSize
  lotSize
  minQuantity
  lastPrice
  markPrice
  stopRegistry
}
fragment SpotStopOrderFields on StopOrder {
  id
  registry
  orderId: orderIdRaw
  isBid
  quantity
  triggerPrice
  triggerOperator
  orderType
  status
  placedOrderId
  createdAt
}`);
export const SpotStopOrdersDocument = new TypedDocumentString(`
    query SpotStopOrders($where: StopOrder_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  StopOrder(where: $where, order_by: {createdAt: desc}, limit: $limit) {
    ...SpotStopOrderFields
    market {
      ...SpotPortfolioMarketFields
    }
  }
}
    fragment SpotPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseToken
  quoteToken
  baseDecimals
  quoteDecimals
  baseIsNative
  tickSize
  lotSize
  minQuantity
  lastPrice
  markPrice
  stopRegistry
}
fragment SpotStopOrderFields on StopOrder {
  id
  registry
  orderId: orderIdRaw
  isBid
  quantity
  triggerPrice
  triggerOperator
  orderType
  status
  placedOrderId
  createdAt
}`);
export const SyncStatusDocument = new TypedDocumentString(`
    query SyncStatus($chainId: Int!) {
  chain_metadata(where: {chain_id: {_eq: $chainId}}) {
    chain_id
    latest_processed_block
    block_height
    num_events_processed
  }
}
    `);
export const IndexedChainsDocument = new TypedDocumentString(`
    query IndexedChains {
  chain_metadata {
    chain_id
  }
}
    `);
