/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SnapshotVersion($capabilityId: String!, $guardId: String!) {\n    capability: AccountCapability_by_pk(id: $capabilityId) {\n      id\n      chainId\n      capability\n      contractVersion\n      datasetGeneration\n      manifestDigest\n      changeStartBlock\n      readiness\n      unavailableReason\n      orderCapacity\n      stopCapacity\n      retentionBatches\n      publicRoleMaxRows\n      publicRoleMaxResponseBytes\n    }\n    guard: AccountSnapshotGuard_by_pk(id: $guardId) {\n      id\n      account\n      datasetGeneration\n      blockNumber\n      blockHash\n      digest\n    }\n  }\n"): typeof import('./graphql.js').SnapshotVersionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment AccountOrderRow on Order {\n    id\n    market_id\n    orderId\n    orderIdRaw\n    owner\n    isBid\n    side\n    userData\n    price\n    fullQuantity\n    quantityRemaining\n    filledQuantity\n    expireTimestampNs\n    status\n    rested\n    cancelReason\n    amendedFromOrderId\n    amendedToOrderId\n    placedAtBlock\n    placedAtTimestamp\n    placedTxHash\n    lastUpdatedAtBlock\n    lastUpdatedAtTimestamp\n  }\n"): typeof import('./graphql.js').AccountOrderRowFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query AccountOrderRows(\n    $account: String!\n    $chainId: Int!\n    $orderLimit: Int!\n    $stopLimit: Int!\n    $nowNs: numeric!\n  ) {\n    watermark: chain_metadata(where: { chain_id: { _eq: $chainId } }) {\n      latest_processed_block\n    }\n    ordersWithoutExpiry: Order(\n      where: {\n        owner: { _eq: $account }\n        status: { _eq: \"Open\" }\n        expireTimestampNs: { _eq: 0 }\n      }\n      order_by: { id: asc }\n      limit: $orderLimit\n    ) {\n      ...AccountOrderRow\n    }\n    ordersWithExpiry: Order(\n      where: {\n        owner: { _eq: $account }\n        status: { _eq: \"Open\" }\n        expireTimestampNs: { _gte: $nowNs }\n      }\n      order_by: [{ expireTimestampNs: asc }, { id: asc }]\n      limit: $orderLimit\n    ) {\n      ...AccountOrderRow\n    }\n    stops: StopOrder(\n      where: { owner: { _eq: $account }, status: { _eq: \"PENDING\" } }\n      order_by: { id: asc }\n      limit: $stopLimit\n    ) {\n      id\n      registry\n      market_id\n      orderIdRaw\n      owner\n      isBid\n      quantity\n      triggerPrice\n      triggerOperator\n      orderType\n      builder\n      builderFeeBpsTimes1k\n      status\n      placedOrderId\n      dropReason\n      siblingOrderId\n      intent\n      cancelReason\n      createdAt\n      updatedAt\n      txHash\n    }\n  }\n"): typeof import('./graphql.js').AccountOrderRowsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OutcomePositionsSnapshotVersion($capabilityId: String!, $guardId: String!) {\n    capability: AccountOutcomePositionCapability_by_pk(id: $capabilityId) {\n      id\n      chainId\n      capability\n      contractVersion\n      datasetGeneration\n      manifestDigest\n      changeStartBlock\n      readiness\n      unavailableReason\n      positionCapacity\n      publicRoleMaxRows\n      publicRoleMaxResponseBytes\n      indexedFields\n      indexedWhenPresentFields\n      enrichmentFields\n    }\n    guard: AccountOutcomePositionGuard_by_pk(id: $guardId) {\n      id\n      account\n      datasetGeneration\n      blockNumber\n      blockHash\n      digest\n    }\n  }\n"): typeof import('./graphql.js').OutcomePositionsSnapshotVersionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query AccountOutcomePositionRows($account: String!, $chainId: Int!, $positionLimit: Int!) {\n    watermark: chain_metadata(where: { chain_id: { _eq: $chainId } }) {\n      latest_processed_block\n    }\n    positions: OutcomeBalance(\n      where: { account: { _eq: $account }, balance: { _gt: 0 } }\n      order_by: { id: asc }\n      limit: $positionLimit\n    ) {\n      id\n      market_id\n      account\n      outcomeIndex\n      tokenId\n      balance\n      updatedAtBlock\n      market {\n        clobStatus\n        tradingStart\n        expiry\n        voided\n        finalized\n        payoutDenominator\n        settledPayoutNumerators\n      }\n    }\n  }\n"): typeof import('./graphql.js').AccountOutcomePositionRowsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  subscription AccountCapabilityWatch($capabilityId: String!) {\n    capability: AccountCapability_by_pk(id: $capabilityId) {\n      id\n      chainId\n      capability\n      contractVersion\n      datasetGeneration\n      manifestDigest\n      changeStartBlock\n      readiness\n      unavailableReason\n      orderCapacity\n      stopCapacity\n      retentionBatches\n      publicRoleMaxRows\n      publicRoleMaxResponseBytes\n    }\n  }\n"): typeof import('./graphql.js').AccountCapabilityWatchDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  subscription AccountGuardWatch($guardId: String!) {\n    guard: AccountSnapshotGuard_by_pk(id: $guardId) {\n      id\n      account\n      datasetGeneration\n      blockNumber\n      blockHash\n      digest\n    }\n  }\n"): typeof import('./graphql.js').AccountGuardWatchDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  subscription AccountChangeBatchStream(\n    $account: String!\n    $datasetGeneration: String!\n    $afterBlock: numeric!\n    $batchSize: Int!\n  ) {\n    batches: AccountChangeBatch_stream(\n      batch_size: $batchSize\n      cursor: { initial_value: { blockNumber: $afterBlock }, ordering: ASC }\n      where: { account: { _eq: $account }, datasetGeneration: { _eq: $datasetGeneration } }\n    ) {\n      id\n      account\n      datasetGeneration\n      blockNumber\n      blockHash\n      digest\n      predecessorBlockNumber\n      predecessorBlockHash\n      predecessorDigest\n      orderChangeCount\n      stopChangeCount\n      overflow\n    }\n  }\n"): typeof import('./graphql.js').AccountChangeBatchStreamDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query AccountChangeChildren(\n    $batchIds: [String!]!\n    $orderChildLimit: Int!\n    $stopChildLimit: Int!\n  ) {\n    orderChanges: AccountOrderChange(\n      where: { batch_id: { _in: $batchIds } }\n      order_by: [{ blockNumber: desc }, { id: asc }]\n      limit: $orderChildLimit\n    ) {\n      id\n      batch_id\n      account\n      datasetGeneration\n      blockNumber\n      operation\n      physicalEntityId\n      terminalCause\n      market_id\n      orderId\n      orderIdRaw\n      isBid\n      side\n      userData\n      price\n      fullQuantity\n      quantityRemaining\n      filledQuantity\n      expireTimestampNs\n      status\n      rested\n      cancelReason\n      amendedFromOrderId\n      amendedToOrderId\n      placedAtBlock\n      placedAtTimestamp\n      placedTxHash\n      lastUpdatedAtBlock\n      lastUpdatedAtTimestamp\n    }\n    stopChanges: AccountStopChange(\n      where: { batch_id: { _in: $batchIds } }\n      order_by: [{ blockNumber: desc }, { id: asc }]\n      limit: $stopChildLimit\n    ) {\n      id\n      batch_id\n      account\n      datasetGeneration\n      blockNumber\n      operation\n      physicalEntityId\n      terminalCause\n      registry\n      market_id\n      orderIdRaw\n      isBid\n      quantity\n      triggerPrice\n      triggerOperator\n      orderType\n      builder\n      builderFeeBpsTimes1k\n      status\n      placedOrderId\n      dropReason\n      siblingOrderId\n      intent\n      cancelReason\n      createdAt\n      updatedAt\n      txHash\n    }\n  }\n"): typeof import('./graphql.js').AccountChangeChildrenDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment ActivityFillFields on Fill {\n    id\n    market: market_id\n    pool\n    fillPrice\n    quantity\n    quoteQuantity\n    maker\n    makerSide\n    taker\n    takerSide\n    takerIsBid\n    # The taker's ORDER, not only the denormalized copy on the fill: Fill.takerSide\n    # is backfilled by the PendingTakerFill bridge and stays null on a binary row\n    # until BinaryOrderPlaced lands, while the order names the side from the start.\n    # Same precedence fills.ts documents on FillRow.takerOrder.\n    takerOrder { owner side }\n    blockNumber\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').ActivityFillFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment ActivityRouterFields on RouterActionRecord {\n    id\n    kind\n    market: market_id\n    account\n    amount\n    payout\n    routedVia\n    blockNumber\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').ActivityRouterFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment ActivityResolutionFields on MarketResolutionEvent {\n    id\n    kind\n    market: market_id\n    outcomeIdx\n    voided\n    blockNumber\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').ActivityResolutionFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment ActivityStatusFields on MarketStatusUpdate {\n    id\n    market: market_id\n    oldStatus\n    newStatus\n    blockNumber\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').ActivityStatusFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketActivity(\n         $fillWhere: Fill_bool_exp!\n         $routerWhere: RouterActionRecord_bool_exp!\n         $resolutionWhere: MarketResolutionEvent_bool_exp!\n         $statusWhere: MarketStatusUpdate_bool_exp!\n         $fillLimit: Int!\n         $routerLimit: Int!\n         $resolutionLimit: Int!\n         $statusLimit: Int!\n       ) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Fill(where: $fillWhere, order_by: [{timestamp: desc}, {blockNumber: desc}, {logIndex: desc}], limit: $fillLimit) {\n           ...ActivityFillFields\n         }\n         RouterActionRecord(where: $routerWhere, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $routerLimit) {\n           ...ActivityRouterFields\n         }\n         MarketResolutionEvent(where: $resolutionWhere, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $resolutionLimit) {\n           ...ActivityResolutionFields\n         }\n         MarketStatusUpdate(where: $statusWhere, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $statusLimit) {\n           ...ActivityStatusFields\n         }\n       }\n"): typeof import('./graphql.js').MarketActivityDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment TransactionOrderFields on Order {\n    id\n    orderId\n    market_id\n    owner\n    isBid\n    side\n    price\n    fullQuantity\n    filledQuantity\n    quantityRemaining\n    status\n    rested\n    cancelReason\n    placedAtTimestamp\n    placedTxHash\n  }\n"): typeof import('./graphql.js').TransactionOrderFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query TransactionEvents($txHash: String!, $limit: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Fill(where: {txHash: {_eq: $txHash}}, order_by: {logIndex: asc}, limit: $limit) {\n           ...ActivityFillFields\n         }\n         RouterActionRecord(where: {txHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {\n           ...ActivityRouterFields\n         }\n         MarketResolutionEvent(where: {txHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {\n           ...ActivityResolutionFields\n         }\n         MarketStatusUpdate(where: {txHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {\n           ...ActivityStatusFields\n         }\n       }\n"): typeof import('./graphql.js').TransactionEventsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query TransactionOrderAnchor($txHash: String!, $limit: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Order(where: {placedTxHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {\n           ...TransactionOrderFields\n           placedAtBlock\n         }\n       }\n"): typeof import('./graphql.js').TransactionOrderAnchorDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query TransactionContext($txHash: String!, $timestamp: numeric!, $marketIds: [String!]!, $limit: Int!, $orderLimit: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Order(\n           where: {placedAtTimestamp: {_eq: $timestamp}, placedTxHash: {_eq: $txHash}}\n           order_by: {id: asc}\n           limit: $orderLimit\n         ) {\n           ...TransactionOrderFields\n         }\n         ProtocolFeeRecord(\n           where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}\n           order_by: {id: asc}\n           limit: $limit\n         ) {\n           ...ProtocolFeeFields\n         }\n         BuilderFeeRecord(\n           where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}\n           order_by: {id: asc}\n           limit: $limit\n         ) {\n           ...BuilderFeeFields\n         }\n         Market(where: {id: {_in: $marketIds}}) {\n           ...MarketFields\n         }\n       }\n"): typeof import('./graphql.js').TransactionContextDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment BlockOrderFields on Order {\n    id\n    orderId\n    market_id\n    owner\n    isBid\n    side\n    price\n    fullQuantity\n    cancelReason\n    placedAtBlock\n    placedTxHash\n  }\n"): typeof import('./graphql.js').BlockOrderFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query BlockActivity($ts: numeric!, $blk: numeric!, $limit: Int!, $offset: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Fill(\n           where: {timestamp: {_eq: $ts}, blockNumber: {_eq: $blk}}\n           order_by: {logIndex: asc}\n           limit: $limit\n           offset: $offset\n         ) {\n           ...ActivityFillFields\n           makerOrder_id\n           takerOrder_id\n         }\n         placed: Order(\n           where: {placedAtTimestamp: {_eq: $ts}, placedAtBlock: {_eq: $blk}}\n           order_by: {id: asc}\n           limit: $limit\n           offset: $offset\n         ) {\n           ...BlockOrderFields\n         }\n         touched: Order(\n           where: {lastUpdatedAtTimestamp: {_eq: $ts}, lastUpdatedAtBlock: {_eq: $blk}}\n           order_by: {id: asc}\n           limit: $limit\n           offset: $offset\n         ) {\n           ...BlockOrderFields\n         }\n       }\n"): typeof import('./graphql.js').BlockActivityDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query BlockMarkets($marketIds: [String!]!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Market(where: {id: {_in: $marketIds}}) {\n           ...MarketFields\n         }\n       }\n"): typeof import('./graphql.js').BlockMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query LatestActiveTimestamp {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Fill(order_by: {timestamp: desc}, limit: 1) {\n           timestamp\n         }\n         placed: Order(order_by: {placedAtTimestamp: desc}, limit: 1) {\n           placedAtTimestamp\n         }\n         touched: Order(order_by: {lastUpdatedAtTimestamp: desc}, limit: 1) {\n           lastUpdatedAtTimestamp\n         }\n       }\n"): typeof import('./graphql.js').LatestActiveTimestampDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query ActiveBlocksAtTimestamp($ts: numeric!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Fill(where: {timestamp: {_eq: $ts}}) {\n           blockNumber\n         }\n         placed: Order(where: {placedAtTimestamp: {_eq: $ts}}) {\n           placedAtBlock\n         }\n         touched: Order(where: {lastUpdatedAtTimestamp: {_eq: $ts}}) {\n           lastUpdatedAtBlock\n         }\n       }\n"): typeof import('./graphql.js').ActiveBlocksAtTimestampDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query AdjacentActiveBlocks($ts: numeric!, $limit: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         prevFill: Fill(where: {timestamp: {_lte: $ts}}, order_by: {timestamp: desc}, limit: $limit) {\n           blockNumber\n         }\n         nextFill: Fill(where: {timestamp: {_gte: $ts}}, order_by: {timestamp: asc}, limit: $limit) {\n           blockNumber\n         }\n         prevPlaced: Order(where: {placedAtTimestamp: {_lte: $ts}}, order_by: {placedAtTimestamp: desc}, limit: $limit) {\n           placedAtBlock\n         }\n         nextPlaced: Order(where: {placedAtTimestamp: {_gte: $ts}}, order_by: {placedAtTimestamp: asc}, limit: $limit) {\n           placedAtBlock\n         }\n         prevTouched: Order(where: {lastUpdatedAtTimestamp: {_lte: $ts}}, order_by: {lastUpdatedAtTimestamp: desc}, limit: $limit) {\n           lastUpdatedAtBlock\n         }\n         nextTouched: Order(where: {lastUpdatedAtTimestamp: {_gte: $ts}}, order_by: {lastUpdatedAtTimestamp: asc}, limit: $limit) {\n           lastUpdatedAtBlock\n         }\n       }\n"): typeof import('./graphql.js').AdjacentActiveBlocksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment PortfolioMarketFields on Market {\n    id\n    marketAddress\n    poolAddress\n    asset\n    question\n    status: clobStatus\n    lastPrice\n    strike\n    expiry\n    winningOutcome\n    voided\n    payoutNumerators\n    payoutDenominator\n    quoteDecimals\n    intervalSec\n  }\n"): typeof import('./graphql.js').PortfolioMarketFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query Portfolio($acct: String!, $fillWhere: Fill_bool_exp!, $orderWhere: Order_bool_exp!, $ordersLimit: Int, $tradesLimit: Int, $positionsLimit: Int!, $positionsOffset: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    OutcomeBalance(\n      where: { account: { _eq: $acct }, balance: { _gt: \"0\" } }\n      order_by: [{ balance: desc }, { id: asc }]\n      limit: $positionsLimit\n      offset: $positionsOffset\n    ) {\n      outcomeIndex\n      tokenId\n      balance\n      market {\n        ...PortfolioMarketFields\n      }\n    }\n    ClobOrder: Order(\n      where: $orderWhere\n      order_by: { placedAtTimestamp: desc }\n      limit: $ordersLimit\n    ) {\n      id\n      orderId\n      side\n      price\n      quantityRemaining\n      filledQuantity\n      fullQuantity\n      placedAtTimestamp\n      placedTxHash\n      market {\n        ...PortfolioMarketFields\n      }\n    }\n    ClobFill: Fill(where: $fillWhere, order_by: { timestamp: desc }, limit: $tradesLimit) {\n      id\n      fillPrice\n      quantity\n      timestamp\n      txHash\n      maker\n      makerSide\n      takerOrder {\n        owner\n        side\n      }\n      market {\n        marketAddress\n        asset\n        quoteDecimals\n      }\n    }\n  }\n"): typeof import('./graphql.js').PortfolioDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OutcomeBalances($acct: String!, $mkt: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        OutcomeBalance(where: {account: {_eq: $acct}, market: {marketAddress: {_eq: $mkt}}}) { outcomeIndex balance }\n      }\n"): typeof import('./graphql.js').OutcomeBalancesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query VaultPayoutFallbacks($where: VaultPayoutFallback_bool_exp!, $orderBy: [VaultPayoutFallback_order_by!], $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         VaultPayoutFallback(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {\n           id owner token amount marketId: market_id market { poolAddress } timestamp txHash\n         }\n       }\n"): typeof import('./graphql.js').VaultPayoutFallbacksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketResolution($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarketResolutionEvent(where: {market_id: {_eq: $id}}, order_by: {timestamp: asc}) {\n           id market: market_id kind winningOutcome: outcomeIdx payoutNumerators payoutDenominator voided blockNumber timestamp txHash\n         }\n         MarketReferenceLink(where: {market_id: {_eq: $id}}, limit: 1) {\n           id market: market_id oracleQuestionId: referenceQuestionId pending blockNumber timestamp\n         }\n         Market_by_pk(id: $id) { oracleQuestionId }\n       }\n"): typeof import('./graphql.js').MarketResolutionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OracleAnswers($closingQid: String!, $openingQid: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         closing: OracleAnswer_by_pk(id: $closingQid) { oracleQuestionId numericValue outcomeLabel voidReason resolvedAt txHash }\n         opening: OracleAnswer_by_pk(id: $openingQid) { oracleQuestionId numericValue outcomeLabel voidReason resolvedAt txHash }\n       }\n"): typeof import('./graphql.js').OracleAnswersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketResolutionEvents($where: MarketResolutionEvent_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarketResolutionEvent(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {\n           id market: market_id kind winningOutcome: outcomeIdx payoutNumerators payoutDenominator voided blockNumber timestamp txHash\n         }\n       }\n"): typeof import('./graphql.js').MarketResolutionEventsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketReferenceLinks($where: MarketReferenceLink_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarketReferenceLink(where: $where, order_by: [{timestamp: asc}, {id: asc}], limit: $limit, offset: $offset) {\n           id market: market_id oracleQuestionId: referenceQuestionId pending blockNumber timestamp\n         }\n       }\n"): typeof import('./graphql.js').MarketReferenceLinksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query Candles($where: Candle_bool_exp!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Candle(where: $where, order_by: [{bucketStart: desc}], limit: $limit) {\n          bucketStart openPrice high low closePrice baseVolume quoteVolume tradeCount lastFillId\n        }\n      }\n"): typeof import('./graphql.js').CandlesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment ProtocolFeeFields on ProtocolFeeRecord {\n    id\n    orderId\n    recipient\n    payer\n    token\n    amount\n    isTakerSide\n    market: market_id\n    pool\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').ProtocolFeeFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment BuilderFeeFields on BuilderFeeRecord {\n    id\n    orderId\n    builder\n    payer\n    token\n    amount\n    market: market_id\n    pool\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').BuilderFeeFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment SettlementFeeFields on SettlementFeeRecord {\n    id\n    recipient: feeRecipient\n    amount: fee\n    winningBacking\n    market: market_id\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').SettlementFeeFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query BuilderApprovals($where: BuilderApproval_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         BuilderApproval(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {\n           id market_id market { poolAddress } user builder maxFeeBpsTimes1k blockNumber timestamp txHash\n         }\n       }\n"): typeof import('./graphql.js').BuilderApprovalsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query ProtocolFees($where: ProtocolFeeRecord_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         ProtocolFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...ProtocolFeeFields }\n       }\n"): typeof import('./graphql.js').ProtocolFeesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query BuilderFees($where: BuilderFeeRecord_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         BuilderFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...BuilderFeeFields }\n       }\n"): typeof import('./graphql.js').BuilderFeesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SettlementFees($where: SettlementFeeRecord_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         SettlementFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...SettlementFeeFields }\n       }\n"): typeof import('./graphql.js').SettlementFeesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment FillQueryFields on Fill {\n    blockNumber\n    logIndex\n    id\n    market: market_id\n    pool\n    fillPrice\n    quantity\n    quoteQuantity\n    maker\n    makerSide\n    taker\n    takerSide\n    kind\n    takerIsBid\n    makerOrderId\n    takerOrderId\n    takerRemainingQuantity\n    makerRemainingQuantity\n    timestamp\n    txHash\n    # The taker's ORDER, not just the denormalized copy on the fill. On binary\n    # the fill's takerSide is backfilled by the PendingTakerFill bridge only\n    # once BinaryOrderPlaced lands, so it can still be null on a row whose\n    # taker is already stamped. The Order carries the authoritative side from\n    # the moment it exists, which is what the portfolio reads have always used.\n    takerOrder { owner side }\n  }\n"): typeof import('./graphql.js').FillQueryFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query Fills($where: Fill_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Fill(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $limit, offset: $offset) {\n          ...FillQueryFields\n        }\n      }\n"): typeof import('./graphql.js').FillsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query UserFills($where: Fill_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Fill(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $limit, offset: $offset) {\n          ...FillQueryFields\n        }\n      }\n"): typeof import('./graphql.js').UserFillsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query FillsRangePage($where: Fill_bool_exp!, $limit: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Fill(where: $where, order_by: [{blockNumber: asc}, {logIndex: asc}], limit: $limit) {\n      ...FillQueryFields\n    }\n  }\n"): typeof import('./graphql.js').FillsRangePageDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query LatestFillBlock($marketType: markettype!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Fill(where: {marketType: {_eq: $marketType}}, order_by: [{blockNumber: desc}], limit: 1) {\n      blockNumber\n      timestamp\n    }\n  }\n"): typeof import('./graphql.js').LatestFillBlockDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query UserFillsPage($where: Fill_bool_exp!, $limit: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    FillDataset_by_pk(id: \"current\") { generation }\n    Fill(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}, {logIndex: desc}], limit: $limit) {\n      ...FillQueryFields\n      blockNumber\n      logIndex\n    }\n  }\n"): typeof import('./graphql.js').UserFillsPageDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment MarketRefFields on Market {\n    id marketType poolAddress marketAddress baseSymbol quoteSymbol\n    baseDecimals quoteDecimals asset question\n  }\n"): typeof import('./graphql.js').MarketRefFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query FillDetail($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Fill(where: { id: { _eq: $id } }, limit: 1) {\n          ...FillQueryFields\n          blockNumber logIndex\n          marketRef: market { ...MarketRefFields }\n        }\n      }\n"): typeof import('./graphql.js').FillDetailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OrderFills($pool: String!, $oid: numeric!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Fill(\n          where: { pool: { _eq: $pool }, _or: [{ takerOrderId: { _eq: $oid } }, { makerOrderId: { _eq: $oid } }] }\n          order_by: [{timestamp: desc}, {blockNumber: desc}]\n          limit: $limit\n        ) {\n          ...FillQueryFields\n          blockNumber logIndex\n        }\n      }\n"): typeof import('./graphql.js').OrderFillsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment TradeContextFillFields on Fill {\n    id\n    market_id\n    pool\n    fillPrice\n    quantity\n    quoteQuantity\n    maker\n    makerSide\n    taker\n    takerSide\n    kind\n    takerIsBid\n    takerOrder { owner side }\n    makerOrderId\n    takerOrderId\n    takerRemainingQuantity\n    makerRemainingQuantity\n    blockNumber\n    timestamp\n    logIndex\n    txHash\n  }\n"): typeof import('./graphql.js').TradeContextFillFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment FillOrderFields on Order {\n    id\n    orderId\n    owner\n    isBid\n    side\n    price\n    fullQuantity\n    filledQuantity\n    quantityRemaining\n    status\n    rested\n    cancelReason\n    placedAtTimestamp\n    placedTxHash\n  }\n"): typeof import('./graphql.js').FillOrderFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query TradeContext($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Fill_by_pk(id: $id) {\n           ...TradeContextFillFields\n           market { ...MarketFields }\n           makerOrder { ...FillOrderFields }\n           takerOrder { ...FillOrderFields }\n         }\n       }\n"): typeof import('./graphql.js').TradeContextDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query FillTxContext($timestamp: numeric!, $txHash: String!, $market: String!, $id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Fill(\n           where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}, id: {_neq: $id}}\n           order_by: [{blockNumber: desc}, {logIndex: desc}]\n           limit: 100\n         ) {\n           ...TradeContextFillFields\n         }\n         ProtocolFeeRecord(\n           where: {market_id: {_eq: $market}, timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}\n           order_by: {id: asc}\n           limit: 100\n         ) {\n           ...ProtocolFeeFields\n         }\n         BuilderFeeRecord(\n           where: {market_id: {_eq: $market}, timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}\n           order_by: {id: asc}\n           limit: 100\n         ) {\n           ...BuilderFeeFields\n         }\n       }\n"): typeof import('./graphql.js').FillTxContextDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query FillCount($where: Fill_bool_exp!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      total: Fill_aggregate(where: $where) { aggregate { count } }\n    }\n  "): typeof import('./graphql.js').FillCountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query FillCountFallback($where: Fill_bool_exp!, $limit: Int!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      rows: Fill(where: $where, limit: $limit) { id }\n    }\n  "): typeof import('./graphql.js').FillCountFallbackDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment SeriesFields on Series {\n    id\n    creatorAddress\n    seriesId\n    collateral\n    asset\n    intervalSec\n    createdAtTimestamp\n    updatedAtTimestamp\n  }\n"): typeof import('./graphql.js').SeriesFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment MarketCreatorFields on MarketCreator {\n    id\n    owner\n    policy\n    core\n    adapter\n    operatorId\n    venueId\n    factory\n    createdAtBlock\n    createdAtTimestamp\n  }\n"): typeof import('./graphql.js').MarketCreatorFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment OracleAdapterFields on OracleAdapter {\n    id\n    owner\n    factory\n    approved\n    approvedAtTimestamp\n    createdAtTimestamp\n  }\n"): typeof import('./graphql.js').OracleAdapterFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketCreators($where: MarketCreator_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarketCreator(where: $where, order_by: {createdAtBlock: desc}, limit: $limit, offset: $offset) {\n           ...MarketCreatorFields\n           series(order_by: {seriesId: asc}) { ...SeriesFields }\n         }\n       }\n"): typeof import('./graphql.js').MarketCreatorsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketCreatorByPk($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarketCreator_by_pk(id: $id) {\n           ...MarketCreatorFields\n           series(order_by: {seriesId: asc}) { ...SeriesFields }\n         }\n       }\n"): typeof import('./graphql.js').MarketCreatorByPkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OracleAdapters($where: OracleAdapter_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OracleAdapter(where: $where, order_by: {createdAtTimestamp: desc}, limit: $limit, offset: $offset) { ...OracleAdapterFields }\n       }\n"): typeof import('./graphql.js').OracleAdaptersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OracleAdapterByPk($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block } OracleAdapter_by_pk(id: $id) { ...OracleAdapterFields } }\n"): typeof import('./graphql.js').OracleAdapterByPkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SeriesById($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Series(where: { id: { _eq: $id } }, limit: 1) { ...SeriesFields }\n       }\n"): typeof import('./graphql.js').SeriesByIdDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SeriesList($where: Series_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Series(where: $where, order_by: {createdAtTimestamp: asc}, limit: $limit, offset: $offset) { ...SeriesFields }\n       }\n"): typeof import('./graphql.js').SeriesListDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SeriesLatestMarkets($limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Market(where: {series_id: {_is_null: false}}, distinct_on: series_id, order_by: [{series_id: asc}, {createdAtTimestamp: desc}], limit: $limit, offset: $offset) {\n           id series_id createdAtTimestamp\n         }\n       }\n"): typeof import('./graphql.js').SeriesLatestMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment MarketFields on Market {\n    id\n    marketType\n    poolAddress\n    lastPrice\n    lastTradeAt\n    cumulativeBaseVolume\n    cumulativeQuoteVolume\n    tradeCount\n    baseDecimals\n    quoteDecimals\n    createdAtTimestamp\n    createdAtBlock\n    baseToken\n    quoteToken\n    baseSymbol\n    quoteSymbol\n    baseIsNative\n    tickSize\n    lotSize\n    minQuantity\n    markPrice\n    rawMidpoint\n    markPriceUpdatedAt\n    stopRegistry\n    marginBank\n    initialMarginBps\n    fundingRate\n    cumulativeFundingPerUnit\n    indexPrice\n    fundingUpdatedAt\n    fundingWindowSec\n    fundingIntervalSec\n    openInterest\n    openInterestUpdatedAt\n    marketId\n    marketAddress\n    yesTokenId\n    noTokenId\n    collateral\n    asset\n    question\n    oracleQuestion\n    oracleQuestionId\n    status: clobStatus\n    strike\n    tradingStart\n    expiry\n    winningOutcome\n    payoutNumerators\n    payoutDenominator\n    settledPayoutNumerators\n    voidVectorSource\n    resolvedAtBlock\n    resolvedAtTimestamp\n    createdByTx\n    creator\n    voided\n    backing\n    nonce\n    finalized\n    netBacking\n    context\n    intervalSec\n    operatorId\n    venueId\n    voidPolicy\n  }\n"): typeof import('./graphql.js').MarketFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query RegistryMarkets($where: Market_bool_exp!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(where: $where, order_by: [{ createdAtTimestamp: desc }, { id: desc }], limit: $limit) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').RegistryMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query ResolvableMarkets(\n    $id0: String! = \"\", $use0: Boolean! = false,\n    $id1: String! = \"\", $use1: Boolean! = false,\n    $id2: String! = \"\", $use2: Boolean! = false,\n    $id3: String! = \"\", $use3: Boolean! = false,\n    $id4: String! = \"\", $use4: Boolean! = false,\n    $id5: String! = \"\", $use5: Boolean! = false,\n    $id6: String! = \"\", $use6: Boolean! = false,\n    $id7: String! = \"\", $use7: Boolean! = false,\n    $id8: String! = \"\", $use8: Boolean! = false,\n    $id9: String! = \"\", $use9: Boolean! = false,\n    $id10: String! = \"\", $use10: Boolean! = false,\n    $id11: String! = \"\", $use11: Boolean! = false,\n    $id12: String! = \"\", $use12: Boolean! = false,\n    $id13: String! = \"\", $use13: Boolean! = false,\n    $id14: String! = \"\", $use14: Boolean! = false,\n    $id15: String! = \"\", $use15: Boolean! = false,\n    $id16: String! = \"\", $use16: Boolean! = false,\n    $id17: String! = \"\", $use17: Boolean! = false,\n    $id18: String! = \"\", $use18: Boolean! = false,\n    $id19: String! = \"\", $use19: Boolean! = false,\n    $id20: String! = \"\", $use20: Boolean! = false,\n    $id21: String! = \"\", $use21: Boolean! = false,\n    $id22: String! = \"\", $use22: Boolean! = false,\n    $id23: String! = \"\", $use23: Boolean! = false,\n    $id24: String! = \"\", $use24: Boolean! = false\n  ) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    market0: Market_by_pk(id: $id0) @include(if: $use0) { ...MarketFields }\n    market1: Market_by_pk(id: $id1) @include(if: $use1) { ...MarketFields }\n    market2: Market_by_pk(id: $id2) @include(if: $use2) { ...MarketFields }\n    market3: Market_by_pk(id: $id3) @include(if: $use3) { ...MarketFields }\n    market4: Market_by_pk(id: $id4) @include(if: $use4) { ...MarketFields }\n    market5: Market_by_pk(id: $id5) @include(if: $use5) { ...MarketFields }\n    market6: Market_by_pk(id: $id6) @include(if: $use6) { ...MarketFields }\n    market7: Market_by_pk(id: $id7) @include(if: $use7) { ...MarketFields }\n    market8: Market_by_pk(id: $id8) @include(if: $use8) { ...MarketFields }\n    market9: Market_by_pk(id: $id9) @include(if: $use9) { ...MarketFields }\n    market10: Market_by_pk(id: $id10) @include(if: $use10) { ...MarketFields }\n    market11: Market_by_pk(id: $id11) @include(if: $use11) { ...MarketFields }\n    market12: Market_by_pk(id: $id12) @include(if: $use12) { ...MarketFields }\n    market13: Market_by_pk(id: $id13) @include(if: $use13) { ...MarketFields }\n    market14: Market_by_pk(id: $id14) @include(if: $use14) { ...MarketFields }\n    market15: Market_by_pk(id: $id15) @include(if: $use15) { ...MarketFields }\n    market16: Market_by_pk(id: $id16) @include(if: $use16) { ...MarketFields }\n    market17: Market_by_pk(id: $id17) @include(if: $use17) { ...MarketFields }\n    market18: Market_by_pk(id: $id18) @include(if: $use18) { ...MarketFields }\n    market19: Market_by_pk(id: $id19) @include(if: $use19) { ...MarketFields }\n    market20: Market_by_pk(id: $id20) @include(if: $use20) { ...MarketFields }\n    market21: Market_by_pk(id: $id21) @include(if: $use21) { ...MarketFields }\n    market22: Market_by_pk(id: $id22) @include(if: $use22) { ...MarketFields }\n    market23: Market_by_pk(id: $id23) @include(if: $use23) { ...MarketFields }\n    market24: Market_by_pk(id: $id24) @include(if: $use24) { ...MarketFields }\n  }\n"): typeof import('./graphql.js').ResolvableMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query Markets($where: Market_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(where: $where, order_by: { createdAtTimestamp: desc }, limit: $limit, offset: $offset) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').MarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketByPk($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market_by_pk(id: $id) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').MarketByPkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketByAddress($a: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(\n      where: { marketAddress: { _eq: $a } }\n      order_by: { createdAtTimestamp: desc }\n      limit: 1\n    ) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').MarketByAddressDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query BinaryMarkets($where: Market_bool_exp!, $orderBy: [Market_order_by!], $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').BinaryMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SpotMarkets($where: Market_bool_exp!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(where: $where, order_by: { createdAtTimestamp: desc }, limit: $limit) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').SpotMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpMarkets($where: Market_bool_exp!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(where: $where, order_by: { createdAtTimestamp: desc }, limit: $limit) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').PerpMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query LiveBinaryMarkets(\n    $where: Market_bool_exp!\n    $orderBy: [Market_order_by!]\n    $limit: Int!\n    $offset: Int!\n  ) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').LiveBinaryMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PastBinaryMarkets($where: Market_bool_exp!, $limit: Int!, $offset: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(where: $where, order_by: { expiry: desc }, limit: $limit, offset: $offset) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').PastBinaryMarketsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query BinaryOriginPairs {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Market(\n           distinct_on: [operatorId, venueId],\n           where: {marketType: {_eq: \"BINARY\"}, operatorId: {_is_null: false}, venueId: {_is_null: false}},\n           order_by: [{operatorId: asc}, {venueId: asc}]\n         ) {\n           operatorId\n           venueId\n         }\n       }\n"): typeof import('./graphql.js').BinaryOriginPairsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query BinaryAssets {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Market(distinct_on: asset, where: {marketType: {_eq: \"BINARY\"}, asset: {_is_null: false}}, order_by: {asset: asc}) {\n           asset\n         }\n       }\n"): typeof import('./graphql.js').BinaryAssetsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketFees($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarketVenue_by_pk(id: $id) {\n           operatorId venueId feeRecipient\n           makerFeeBps takerFeeBps maxBuilderFeeBps routingFeeBps settlementFeeBps settlementFeesCollected\n         }\n       }\n"): typeof import('./graphql.js').MarketFeesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketStatusHistory($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarketStatusUpdate(where: {market_id: {_eq: $id}}, order_by: {timestamp: asc}) {\n           oldStatus newStatus blockNumber timestamp txHash\n         }\n       }\n"): typeof import('./graphql.js').MarketStatusHistoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OracleAnswersByQid($qids: [String!]) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OracleAnswer(where: {id: {_in: $qids}}) { id numericValue voided }\n       }\n"): typeof import('./graphql.js').OracleAnswersByQidDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query ResolutionQids($ids: [String!]) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Market(where: {id: {_in: $ids}}) { id oracleQuestionId }\n       }\n"): typeof import('./graphql.js').ResolutionQidsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OpeningRefs($ids: [String!]) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarketReferenceLink(where: {market_id: {_in: $ids}}) { market: market_id referenceQuestionId }\n       }\n"): typeof import('./graphql.js').OpeningRefsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query MarketCount($where: Market_bool_exp!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      total: Market_aggregate(where: $where) { aggregate { count } }\n    }\n  "): typeof import('./graphql.js').MarketCountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query MarketCountFallback($where: Market_bool_exp!, $limit: Int!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      rows: Market(where: $where, limit: $limit) { id }\n    }\n  "): typeof import('./graphql.js').MarketCountFallbackDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment OperatorFields on Operator {\n    operatorId\n    owner\n    feeRecipient\n    enabled\n    policy\n    context\n    pendingOwner\n    venueCount\n    createdAtTimestamp\n    updatedAtTimestamp\n    updatedAtBlock\n    marketCount\n    cumulativeQuoteVolume\n    protocolFeesCollected\n    settlementFeesCollected\n    builderFeesCollected\n  }\n"): typeof import('./graphql.js').OperatorFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment VenueFields on Venue {\n    venueId\n    operatorId\n    marketType\n    feeParams\n    feeRecipientOverride\n    policy\n    signer\n    creationEnabled\n    context\n    createdAtTimestamp\n    updatedAtTimestamp\n    updatedAtBlock\n    marketCount\n    cumulativeQuoteVolume\n    protocolFeesCollected\n    settlementFeesCollected\n    builderFeesCollected\n  }\n"): typeof import('./graphql.js').VenueFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query Operators($where: Operator_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Operator(where: $where, order_by: {operatorId: desc}, limit: $limit, offset: $offset) { ...OperatorFields }\n       }\n"): typeof import('./graphql.js').OperatorsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OperatorByPk($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block } Operator_by_pk(id: $id) { ...OperatorFields } }\n"): typeof import('./graphql.js').OperatorByPkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query Venues($where: Venue_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Venue(where: $where, order_by: {createdAtTimestamp: asc}, limit: $limit, offset: $offset) { ...VenueFields }\n       }\n"): typeof import('./graphql.js').VenuesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query VenueByPk($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block } Venue_by_pk(id: $id) { ...VenueFields } }\n"): typeof import('./graphql.js').VenueByPkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query OperatorCount($where: Operator_bool_exp!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      total: Operator_aggregate(where: $where) { aggregate { count } }\n    }\n  "): typeof import('./graphql.js').OperatorCountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query OperatorCountFallback($where: Operator_bool_exp!, $limit: Int!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      rows: Operator(where: $where, limit: $limit) { id }\n    }\n  "): typeof import('./graphql.js').OperatorCountFallbackDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query VenueCount($where: Venue_bool_exp!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      total: Venue_aggregate(where: $where) { aggregate { count } }\n    }\n  "): typeof import('./graphql.js').VenueCountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query VenueCountFallback($where: Venue_bool_exp!, $limit: Int!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      rows: Venue(where: $where, limit: $limit) { id }\n    }\n  "): typeof import('./graphql.js').VenueCountFallbackDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment OracleQuestionFields on OracleQuestion {\n    id\n    questionKey\n    scheduler\n    oracleCost\n    bindCount\n    reuseCount\n    createdAtBlock\n    createdAtTimestamp\n  }\n"): typeof import('./graphql.js').OracleQuestionFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment OperatorHubAccountFields on OperatorHubAccount {\n    id\n    operatorId\n    earmarked\n    credit\n    outstanding\n    createdAtBlock\n    createdAtTimestamp\n    updatedAtBlock\n    updatedAtTimestamp\n  }\n"): typeof import('./graphql.js').OperatorHubAccountFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment OracleBindFields on OracleBind {\n    id\n    oracleQuestionId\n    bindIndex\n    operatorId\n    measuredGas\n    overheadShare\n    cost\n    charged\n    subsidy\n    resolvedAt\n    boundAtBlock\n    boundAtTimestamp\n    txHash\n  }\n"): typeof import('./graphql.js').OracleBindFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment OracleCallbackFields on OracleCallback {\n    id\n    marketsResolved\n    gasPrice\n    measuredGas\n    overheadGasAttributed\n    totalCost\n    totalCharged\n    subsidy\n    pendingRemaining\n    blockNumber\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').OracleCallbackFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OracleQuestion($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OracleQuestion_by_pk(id: $id) { ...OracleQuestionFields }\n       }\n"): typeof import('./graphql.js').OracleQuestionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OracleQuestions($where: OracleQuestion_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OracleQuestion(where: $where, order_by: {createdAtTimestamp: desc}, limit: $limit, offset: $offset) { ...OracleQuestionFields }\n       }\n"): typeof import('./graphql.js').OracleQuestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OperatorHubAccount($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OperatorHubAccount_by_pk(id: $id) { ...OperatorHubAccountFields }\n       }\n"): typeof import('./graphql.js').OperatorHubAccountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OperatorHubAccounts($limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OperatorHubAccount(order_by: {updatedAtTimestamp: desc}, limit: $limit, offset: $offset) { ...OperatorHubAccountFields }\n       }\n"): typeof import('./graphql.js').OperatorHubAccountsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OracleBinds($where: OracleBind_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OracleBind(where: $where, order_by: {boundAtTimestamp: desc}, limit: $limit, offset: $offset) { ...OracleBindFields }\n       }\n"): typeof import('./graphql.js').OracleBindsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OracleCallbacks($limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OracleCallback(order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...OracleCallbackFields }\n       }\n"): typeof import('./graphql.js').OracleCallbacksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment OrderMarketFields on Market {\n    marketAddress\n    asset\n    question\n    expiry\n    tradingStart\n    quoteDecimals\n    intervalSec\n  }\n"): typeof import('./graphql.js').OrderMarketFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SweepableOrders($where: Order_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Order(where: $where, order_by: [{expireTimestampNs: asc}, {id: asc}], limit: $limit, offset: $offset) {\n          id orderId owner isBid price quantityRemaining expireTimestampNs placedAtTimestamp\n          market: market_id\n          marketRow: market { poolAddress marketType ...OrderMarketFields }\n        }\n      }\n"): typeof import('./graphql.js').SweepableOrdersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OpenOrders($where: Order_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Order(where: $where, order_by: [{placedAtTimestamp: desc}, {id: desc}], limit: $limit, offset: $offset) {\n          id orderId userData side isBid price quantityRemaining\n          market: market_id\n          marketRow: market { poolAddress ...OrderMarketFields }\n        }\n      }\n"): typeof import('./graphql.js').OpenOrdersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query Orders($where: Order_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Order(where: $where, order_by: [{placedAtTimestamp: desc}, {id: desc}], limit: $limit, offset: $offset) {\n          id orderId userData side isBid price quantityRemaining fullQuantity filledQuantity status\n          rested expireTimestampNs placedTxHash placedAtTimestamp\n          cancelReason amendedFromOrderId amendedToOrderId\n          market: market_id\n          marketRow: market { poolAddress ...OrderMarketFields }\n        }\n      }\n"): typeof import('./graphql.js').OrdersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OrderDetail($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n        Order(where: { id: { _eq: $id } }, limit: 1) {\n          id orderId owner userData side isBid price quantityRemaining fullQuantity filledQuantity\n          status rested expireTimestampNs placedTxHash placedAtTimestamp placedAtBlock\n          lastUpdatedAtTimestamp cancelReason amendedFromOrderId amendedToOrderId\n          market: market_id\n          marketRow: market { poolAddress ...OrderMarketFields }\n          marketRef: market { ...MarketRefFields }\n        }\n      }\n"): typeof import('./graphql.js').OrderDetailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query BookTops($bidWhere: Order_bool_exp!, $askWhere: Order_bool_exp!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         bids: Order(where: $bidWhere, distinct_on: market_id, order_by: [{market_id: desc}, {price: desc}]) {\n           market: market_id price\n         }\n         asks: Order(where: $askWhere, distinct_on: market_id, order_by: [{market_id: asc}, {price: asc}]) {\n           market: market_id price\n         }\n       }\n"): typeof import('./graphql.js').BookTopsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query OrderCount($where: Order_bool_exp!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      total: Order_aggregate(where: $where) { aggregate { count } }\n    }\n  "): typeof import('./graphql.js').OrderCountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n    query OrderCountFallback($where: Order_bool_exp!, $limit: Int!) {\n      _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n      rows: Order(where: $where, limit: $limit) { id }\n    }\n  "): typeof import('./graphql.js').OrderCountFallbackDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query FundingPayments($where: FundingPayment_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         FundingPayment(where: $where, order_by: [{timestamp: desc}, {id: desc}], limit: $limit, offset: $offset) {\n           id account pool amount timestamp txHash\n         }\n       }\n"): typeof import('./graphql.js').FundingPaymentsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarginEvents($where: MarginEvent_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         MarginEvent(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {\n           id account kind pool amount granter timestamp txHash\n         }\n       }\n"): typeof import('./graphql.js').MarginEventsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query Liquidations($where: LiquidationEvent_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         LiquidationEvent(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {\n           id account pool kind size price counterparty penalty\n           badDebt insuranceCovered deficit coverageDeclined collateralAmount equity\n           positionsProcessed stageReached marginStatusBefore marginStatusAfter\n           timestamp blockNumber txHash\n         }\n       }\n"): typeof import('./graphql.js').LiquidationsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query FundingRateHistory($where: FundingRateUpdate_bool_exp!, $orderBy: [FundingRateUpdate_order_by!], $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         FundingRateUpdate(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {\n           id pool fundingRate cumulativeFundingPerUnit indexPrice markPrice\n           intervalsSettled intervalsAccrued fundingWindowSec fundingIntervalSec\n           spanStart spanEnd anchorResynced timestamp blockNumber txHash\n         }\n       }\n"): typeof import('./graphql.js').FundingRateHistoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query FundingRateCandles($where: FundingRateCandle_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         FundingRateCandle(where: $where, order_by: {bucketStart: desc}, limit: $limit, offset: $offset) {\n           id pool intervalSeconds bucketStart\n           avgFundingRate8h minFundingRate8h maxFundingRate8h coverage\n           cumulativeFundingStart cumulativeFundingEnd\n           fundingWindowSec fundingIntervalSec paramsChangedInBucket\n           indexPriceEnd openInterestEnd updateCount\n         }\n       }\n"): typeof import('./graphql.js').FundingRateCandlesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpFees($where: PerpFeeRecord_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         PerpFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {\n           id account pool amount isRebate kind insurancePortion tier fillNotional builder timestamp txHash\n         }\n       }\n"): typeof import('./graphql.js').PerpFeesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query OpenInterestHistory($pool: String!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         OpenInterestSnapshot(where: {pool: {_eq: $pool}}, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {\n           id pool openInterest timestamp blockNumber\n         }\n       }\n"): typeof import('./graphql.js').OpenInterestHistoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpOrderRejections($where: PerpOrderRejection_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         PerpOrderRejection(where: $where, order_by: [{blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {\n           id owner pool reason requestIndex timestamp blockNumber txHash\n         }\n       }\n"): typeof import('./graphql.js').PerpOrderRejectionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpPositionChanges($where: PerpPositionChange_bool_exp!, $orderBy: [PerpPositionChange_order_by!], $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         PerpPositionChange(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {\n           id pool account kind sizeBefore sizeAfter closedSize entryPriceBefore entryPriceAfter exitPrice orderId realizedPnl timestamp blockNumber logIndex txHash\n         }\n       }\n"): typeof import('./graphql.js').PerpPositionChangesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpWalletLinkEvents($where: PerpWalletLinkEvent_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         PerpWalletLinkEvent(where: $where, order_by: [{blockNumber: desc}, {logIndex: desc}], limit: $limit, offset: $offset) {\n           id kind main child timestamp blockNumber logIndex txHash\n         }\n       }\n"): typeof import('./graphql.js').PerpWalletLinkEventsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpMarginPulls($where: PerpMarginPull_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         PerpMarginPull(where: $where, order_by: [{blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {\n           id account pool orderId source amount payer timestamp blockNumber txHash\n         }\n       }\n"): typeof import('./graphql.js').PerpMarginPullsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpMainFundingEvents($where: PerpMainFundingEvent_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         PerpMainFundingEvent(where: $where, order_by: [{blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {\n           id account kind payer amount previousPrincipal outstandingPrincipal\n           timestamp blockNumber txHash\n         }\n       }\n"): typeof import('./graphql.js').PerpMainFundingEventsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment PerpPortfolioMarketFields on Market {\n    poolAddress\n    baseSymbol\n    quoteSymbol\n    baseDecimals\n    quoteDecimals\n    tickSize\n    lotSize\n    minQuantity\n    lastPrice\n    marginBank\n    initialMarginBps\n    fundingRate\n    indexPrice\n    stopRegistry\n  }\n"): typeof import('./graphql.js').PerpPortfolioMarketFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpPortfolio(\n    $fillWhere: Fill_bool_exp!\n    $orderWhere: Order_bool_exp!\n    $ordersLimit: Int\n    $tradesLimit: Int\n  ) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    PerpOrder: Order(\n      where: $orderWhere\n      order_by: { placedAtTimestamp: desc }\n      limit: $ordersLimit\n    ) {\n      id\n      orderId\n      isBid\n      price\n      quantityRemaining\n      filledQuantity\n      fullQuantity\n      placedAtTimestamp\n      placedTxHash\n      market {\n        ...PerpPortfolioMarketFields\n      }\n    }\n    PerpFill: Fill(where: $fillWhere, order_by: { timestamp: desc }, limit: $tradesLimit) {\n      id\n      fillPrice\n      quantity\n      quoteQuantity\n      timestamp\n      txHash\n      maker\n      taker\n      takerIsBid\n      market {\n        ...PerpPortfolioMarketFields\n      }\n    }\n  }\n"): typeof import('./graphql.js').PerpPortfolioDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpOrderHistory($where: Order_bool_exp!, $orderBy: [Order_order_by!], $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Order(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {\n      id\n      orderId\n      isBid\n      price\n      quantityRemaining\n      filledQuantity\n      fullQuantity\n      status\n      rested\n      cancelReason\n      expireTimestampNs\n      placedAtTimestamp\n      placedTxHash\n      lastUpdatedAtTimestamp\n      market {\n        ...PerpPortfolioMarketFields\n      }\n    }\n  }\n"): typeof import('./graphql.js').PerpOrderHistoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpPositions($where: PerpPosition_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    PerpPosition(where: $where, order_by: { updatedAt: desc }, limit: $limit, offset: $offset) {\n      id\n      pool\n      account\n      size\n      isLong\n      entryPriceX18\n      realizedPnl\n      updatedAt\n      updatedAtBlock\n    }\n  }\n"): typeof import('./graphql.js').PerpPositionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpStopOrders($where: StopOrder_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    StopOrder(where: $where, order_by: [{ createdAt: desc }, { id: desc }], limit: $limit, offset: $offset) {\n      id\n      registry\n      orderIdRaw\n      owner\n      isBid\n      quantity\n      triggerPrice\n      triggerOperator\n      orderType\n      builder\n      builderFeeBpsTimes1k\n      status\n      placedOrderId\n      dropReason\n      siblingOrderId\n      intent\n      cancelReason\n      createdAt\n      updatedAt\n      txHash\n      market {\n        poolAddress\n        baseSymbol\n        quoteSymbol\n        baseDecimals\n        quoteDecimals\n      }\n    }\n  }\n"): typeof import('./graphql.js').PerpStopOrdersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PerpInsuranceFundEvents($where: PerpInsuranceFundEvent_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         PerpInsuranceFundEvent(where: $where, order_by: [{blockNumber: desc}, {logIndex: desc}], limit: $limit, offset: $offset) {\n           id kind tier toTier amount requested covered account counterparty caller\n           timestamp blockNumber logIndex txHash\n         }\n       }\n"): typeof import('./graphql.js').PerpInsuranceFundEventsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query MarketsByPool($pool: String!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(\n      where: { poolAddress: { _eq: $pool } }\n      order_by: { createdAtTimestamp: desc }\n      limit: $limit\n    ) {\n      ...MarketFields\n    }\n  }\n"): typeof import('./graphql.js').MarketsByPoolDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PoolBindings($pool: String!, $limit: Int!, $offset: Int!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         PoolBinding(where: {poolAddress: {_eq: $pool}}, order_by: {nonce: desc}, limit: $limit, offset: $offset) {\n           id poolAddress marketId nonce fromBlock fromLogIndex fromTimestamp\n           toBlock toLogIndex toTimestamp closedBy\n         }\n       }\n"): typeof import('./graphql.js').PoolBindingsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PoolByPk($id: String!) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         Pool_by_pk(id: $id) {\n           id address collateral creator currentMarketId currentNonce generationCount\n           createdAtTimestamp updatedAtTimestamp\n         }\n       }\n"): typeof import('./graphql.js').PoolByPkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PoolTypes($pools: [String!]!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(\n      where: { poolAddress: { _in: $pools } }\n      distinct_on: poolAddress\n      order_by: [{ poolAddress: asc }, { createdAtTimestamp: desc }]\n      limit: $limit\n    ) {\n      poolAddress\n      marketType\n    }\n  }\n"): typeof import('./graphql.js').PoolTypesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query PoolsByType($where: Market_bool_exp!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    Market(where: $where, distinct_on: poolAddress, order_by: { poolAddress: asc }, limit: $limit) {\n      poolAddress\n    }\n  }\n"): typeof import('./graphql.js').PoolsByTypeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment RouterActionFields on RouterActionRecord {\n    id\n    kind\n    account\n    market: market_id\n    amount\n    payout\n    routedVia\n    timestamp\n    txHash\n  }\n"): typeof import('./graphql.js').RouterActionFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query RouterActions($where: RouterActionRecord_bool_exp!, $limit: Int, $offset: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n         RouterActionRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...RouterActionFields }\n       }\n"): typeof import('./graphql.js').RouterActionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment SpotPortfolioMarketFields on Market {\n    poolAddress\n    baseSymbol\n    quoteSymbol\n    baseToken\n    quoteToken\n    baseDecimals\n    quoteDecimals\n    baseIsNative\n    tickSize\n    lotSize\n    minQuantity\n    lastPrice\n    markPrice\n    stopRegistry\n  }\n"): typeof import('./graphql.js').SpotPortfolioMarketFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SpotPortfolio(\n    $acct: String!\n    $fillWhere: Fill_bool_exp!\n    $orderWhere: Order_bool_exp!\n    $ordersLimit: Int\n    $tradesLimit: Int\n  ) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    SpotOrder: Order(\n      where: $orderWhere\n      order_by: { placedAtTimestamp: desc }\n      limit: $ordersLimit\n    ) {\n      id\n      orderId\n      isBid\n      price\n      quantityRemaining\n      filledQuantity\n      fullQuantity\n      placedAtTimestamp\n      placedTxHash\n      market {\n        ...SpotPortfolioMarketFields\n      }\n    }\n    SpotStopOrder: StopOrder(\n      where: { owner: { _eq: $acct }, status: { _eq: \"PENDING\" } }\n      order_by: { createdAt: desc }\n      limit: $ordersLimit\n    ) {\n      ...SpotStopOrderFields\n      market {\n        ...SpotPortfolioMarketFields\n      }\n    }\n    SpotFill: Fill(where: $fillWhere, order_by: { timestamp: desc }, limit: $tradesLimit) {\n      id\n      fillPrice\n      quantity\n      quoteQuantity\n      timestamp\n      txHash\n      maker\n      taker\n      takerIsBid\n      market {\n        ...SpotPortfolioMarketFields\n      }\n    }\n  }\n"): typeof import('./graphql.js').SpotPortfolioDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  fragment SpotStopOrderFields on StopOrder {\n    id\n    registry\n    orderId: orderIdRaw\n    isBid\n    quantity\n    triggerPrice\n    triggerOperator\n    orderType\n    status\n    placedOrderId\n    createdAt\n  }\n"): typeof import('./graphql.js').SpotStopOrderFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SpotStopOrders($where: StopOrder_bool_exp!, $limit: Int) {\n    _sdkWatermark: chain_metadata { chain_id latest_processed_block }\n    StopOrder(where: $where, order_by: { createdAt: desc }, limit: $limit) {\n      ...SpotStopOrderFields\n      market {\n        ...SpotPortfolioMarketFields\n      }\n    }\n  }\n"): typeof import('./graphql.js').SpotStopOrdersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query SyncStatus($chainId: Int!) {\n    chain_metadata(where: { chain_id: { _eq: $chainId } }) {\n      chain_id\n      latest_processed_block\n      block_height\n      num_events_processed\n    }\n  }\n"): typeof import('./graphql.js').SyncStatusDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: "\n  query IndexedChains {\n    chain_metadata {\n      chain_id\n    }\n  }\n"): typeof import('./graphql.js').IndexedChainsDocument;
