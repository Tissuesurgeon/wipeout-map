// @somnia-chain/markets-sdk — the client for the Somnia Markets order books.
//
// Single entry point: `new SomniaMarkets(config)` returns the exchange — symbols,
// fetch/watch verbs, human-unit structs — which owns the whole engine (indexer
// GraphQL reads, on-chain reads, the realtime watches, writes). The raw engine
// tier is reached THROUGH it (`exchange.client` → SomniaMarketsClient,
// `exchange.trader` → the bigint write tier); it is not separately
// constructible. No global config or singleton store; each exchange is
// isolated, so one process can run several (different chains, tests).
//
// This barrel ("@somnia-chain/markets-sdk") is FRAMEWORK-AGNOSTIC — safe in Node
// (bots, scripts) and the browser. React bindings (SomniaMarketsProvider + hooks) live
// in a separate entry, "@somnia-chain/markets-sdk/react" (see react.ts). The
// reducer is the client mirror of indexer/src/handlers/orderbook.ts (the shared
// OrderBook contract core) — keep them in lockstep.

// ---- errors — the vocabulary every SDK failure speaks ----
// One class per distinct thing a caller would DO about it; branch with
// `instanceof`, never on message strings. See errors.ts for the full map.
export {
  SomniaMarketsError,
  InvalidInputError,
  FillHistoryRestartRequiredError,
  FillHistoryUnavailableError,
  PerpPositionChangesUnavailableError,
  NotConfiguredError,
  NotSupportedError,
  SignerRequiredError,
  IndexerError,
  IncompleteHistoryError,
  IncompletePortfolioError,
  IndexerUnavailableError,
  AccountsIndexerUnavailableError,
  AccountFeedRestartRequiredError,
  AccountViewError,
  IndexerWaitTimeoutError,
  RpcError,
  TransactionOutcomeUnknownError,
  ContractRevertError,
  CollateralOnWrongChainError,
  BridgeLiquidityError,
  BridgeDeliveryTimeoutError,
  type CollateralReadError,
  type IndexerRefusalReason,
  type AccountViewErrorReason,
} from "./errors.js";

// ---- the entry point ----
export type { SomniaMarketsWebSocketConstructor, SomniaMarketsSocketFailure } from "./config.js";
export {
  type SomniaMarketsClient,
  type SomniaMarketsClientGetPerpLinkedWalletRegistryError,
  type SomniaMarketsClientGetPerpMainFundingError,
  type SomniaMarketsClientGetPerpMaxLinkedChildrenError,
  type SomniaMarketsClientGetPerpWalletLinkageError,
  type SomniaMarketsClientGetPerpWalletPullCapacityError,
  type SomniaMarketsClientListPerpLinkedChildrenError,
  type SomniaMarketsClientQuotePerpFundingPayerError,
  type SomniaMarketsClientGetAccountHealthError,
  type SomniaMarketsClientGetEffectiveImfBpsError,
  type SomniaMarketsClientGetLiquidationPriceError,
  type SomniaMarketsClientGetMarginAccountError,
  type SomniaMarketsClientGetMaxPerpOrderSizeError,
  type SomniaMarketsClientGetPerpHealthSnapshotError,
  type SomniaMarketsClientGetPerpLeverageError,
  type SomniaMarketsClientGetPerpLeverageImSurchargeError,
  type SomniaMarketsClientGetPerpPositionAnalyticsError,
  type SomniaMarketsClientGetPerpRiskParamsError,
  type SomniaMarketsClientGetPerpSideHoldersError,
  type SomniaMarketsClientListPerpPositionAnalyticsError,
  type SomniaMarketsClientMeetsPerpImForFillError,
  type SomniaMarketsClientPreviewPerpClosePnlError,
  type SomniaMarketsClientPreviewPerpLiquidationPriceError,
  type SomniaMarketsClientPreviewPerpOrderMarginError,
  type SomniaMarketsClientQuoteMeetsPerpImForOrderError,
  type SomniaMarketsClientQuotePerpOrderTopUpError,
  type SomniaMarketsClientGetInsuranceFundStateError,
  type SomniaMarketsClientGetLiquidationEngineConfigError,
  type SomniaMarketsClientGetPerpCollateralBasisError,
  type SomniaMarketsClientGetPerpSystemConfigError,
  type SomniaMarketsClientTryGetPerpAccountEquityError,
  type SomniaMarketsClientGetPerpStateError,
  type SomniaMarketsClientGetPerpFundingPremiumError,
  type SomniaMarketsClientGetPerpPositionError,
  type SomniaMarketsClientGetManualVaultModeError,
  type SomniaMarketsClientGetErc20BalanceError,
  type SomniaMarketsClientGetErc20AllowanceError,
  type SomniaMarketsClientGetBuilderApprovalError,
  type SomniaMarketsClientGetEffectiveBuilderApprovalError,
  type SomniaMarketsClientGetMaxBuilderFeeBpsTimes1kError,
  type SomniaMarketsClientGetSchedulingCostError,
  type SomniaMarketsClientEarmarkedOfError,
  type SomniaMarketsClientCreditOfError,
  type SomniaMarketsClientOutstandingOfError,
  type SomniaMarketsClientWithdrawableOfError,
  type SomniaMarketsClientPayerCreditOfError,
  type SomniaMarketsClientPayerOfError,
  type SomniaMarketsClientResolveReserveError,
  type SomniaMarketsClientGetNativeBalanceError,
  type SomniaMarketsClientGetVaultBalanceError,
  type SomniaMarketsClientGetOutcomeBalanceError,
  type SomniaMarketsClientGetOnchainResolutionPriceError,
  type SomniaMarketsClientGetHeadBlockError,
  type SomniaMarketsClientGetClosingPriceError,
  type SomniaMarketsClientGetContractMetaError,
  type SomniaMarketsClientGetBankruptcyPriceError,
  type SomniaMarketsClientGetPerpMaxLeverageError,
  type SomniaMarketsClientTryGetPerpLeverageImSurchargeError,
  type SomniaMarketsClientGetBookTopsOnchainError,
  type SomniaMarketsClientGetOwnOpenOrdersOnchainError,
  type SomniaMarketsClientGetOpenOrdersOnchainError,
  type SomniaMarketsClientGetAllOpenOrdersOnchainError,
  type SomniaMarketsClientStopLiveError,
  type SomniaMarketsClientQuoteBinaryStakeError,
  type SomniaMarketsClientQuoteBinarySellError,
  type SomniaMarketsClientGetBinaryPositionPnLError,
  type SomniaMarketsClientWithObservations,
  type SomniaMarketsClientGetOpenPositionsWithPnLError,
  type SomniaMarketsClientGetClaimableError,
  type SomniaMarketsClientGetClaimablePageError,
  type SomniaMarketsClientGetPortfolioError,
  type SomniaMarketsClientCreateExecutorError,
  type SomniaMarketsClientCreateTraderError,
  type SomniaMarketsClientWatchPerpMarketsError,
  type SomniaMarketsClientGetUserFillsPageError,
  type SomniaMarketsClientGetUserFillHistoryError,
  type SomniaMarketsClientWaitForIndexedBlockError,
  type SomniaMarketsClientGetOpenOrdersError,
  type SomniaMarketsClientGetOrdersError,
  type SomniaMarketsClientCountOrdersError,
  type SomniaMarketsClientGetFillsError,
  type SomniaMarketsClientGetOrderFillsError,
  type SomniaMarketsClientGetUserFillsError,
  type SomniaMarketsClientGetFillsPageError,
  type SomniaMarketsClientGetLatestFillBlockError,
  type SomniaMarketsClientCountUserFillsError,
  type SomniaMarketsClientGetPerpStopOrderError,
  type SomniaMarketsClientGetPerpStopOrdersError,
  type SomniaMarketsClientGetMarginEventsError,
  type SomniaMarketsClientListLiquidationsError,
  type SomniaMarketsClientListPerpPositionChangesError,
  type SomniaMarketsClientListPerpPositionChangesForFillsError,
  type SomniaMarketsClientGetLiquidationsError,
  type SomniaMarketsClientListVaultPayoutFallbacksError,
  type SomniaMarketsClientGetCandlesError,
  type SomniaMarketsClientGetPerpFeedStatusError,
  type SomniaMarketsClientGetAccountEquityError,
  type SomniaMarketsClientListAccountEquitiesError,
  type SomniaMarketsClientGetPerpVoucherCampaignError,
  type SomniaMarketsClientGetPerpVoucherEligibilityError,
  type SomniaMarketsClientGetPerpVoucherError,
  type SomniaMarketsClientListRegistryMarketsCheckedError,
  type SomniaMarketsClientListPoolBindingsError,
  type SomniaMarketsClientListSeriesLatestMarketsError,
  type SomniaMarketsClientGetBinaryOrderBookError,
  type SomniaMarketsClientWatchPriceError,
  type SomniaMarketsClientWatchPricesError,
  type SomniaMarketsClientGetSpotOrderBookError,
  type SomniaMarketsClientGetOrderOnchainError,
} from "./somniaMarketsClient.js";
export {
  type ListLiveFundingPaymentsOptions,
  type ListLiveLiquidationsOptions,
  type SeedOptions,
  type WatchHandle,
  type WatchPerpMarketsOptions,
  type WatchStatus,
} from "./liveTail.js";

// ---- the exchange API (the SDK's primary surface) ----
export {
  SomniaMarkets,
  type SomniaMarketsConfig,
  type SomniaMarketsChainsConfig,
  type SomniaMarketsSignerConfig,
  type FetchOrderBookOptions,
  type SomniaMarketsFetchOrderBookError,
  type SomniaMarketsFetchTickerError,
  type SomniaMarketsConstructorError,
  type SomniaMarketsCloseError,
  type SomniaMarketsClientError,
  type SomniaMarketsTraderError,
  type SomniaMarketsTraderForError,
  type SomniaMarketsSetSignerError,
  type SomniaMarketsLoadMarketsError,
  type SomniaMarketsFetchTradesError,
  type SomniaMarketsFetchMyTradesError,
  type SomniaMarketsFetchPortfolioAnalyticsError,
  type SomniaMarketsFetchPortfolioAnalyticsOptions,
  type SomniaMarketsWatchTradesError,
  type SomniaMarketsWatchMyTradesError,
  type SomniaMarketsWatchOrderBookError,
  type SomniaMarketsGetOrderHistoryPageOptions,
  type SomniaMarketsGetOrderHistoryPageError,
  type SomniaMarketsGetOrdersPageOptions,
  type SomniaMarketsChainFilter,
  type UnifiedOrderIdentity,
  type UnifiedOrderPageItem,
  type UnifiedOrdersPage,
  type SomniaMarketsGetOrdersPageError,
  type CreateOrderParams,
  type RedeemOptions,
  type SomniaMarketsRedeemError,
} from "./unified/exchange.js";
// Chain-qualified references — pure types + guards. A market id, pool or order
// id is unique only on its chain, so a multi-chain exchange accepts these
// wherever it accepts a bare id.
export {
  type ChainMarketRef,
  type ChainOrderRef,
  type MarketHandle,
  isChainMarketRef,
  isChainOrderRef,
  chainMarketRef,
  chainOrderRef,
} from "./chainRef.js";
export {
  TIMEFRAMES,
  type UnifiedBalance,
  type UnifiedBalances,
  type UnifiedChainBalance,
  type UnifiedFundingRate,
  type UnifiedMarket,
  type UnifiedMarketType,
  type UnifiedOHLCV,
  type UnifiedOrder,
  type UnifiedOrderBook,
  type UnifiedOrderStatus,
  type UnifiedPosition,
  type UnifiedPrice,
  type UnifiedStopOrder,
  type UnifiedStopOrderStatus,
  type UnifiedTicker,
  type UnifiedTrade,
} from "./unified/structs.js";
export { type Tradable } from "./unified/symbols.js";
export {
  DEFAULT_FEES,
  DEFAULT_INDEXER_LIMITS,
  nextBackoffDelayMs,
  SOMNIA_MAINNET_PRICE_FEED,
  SOMNIA_TESTNET_PRICE_FEED,
  type ClientConfig,
  type ChainBinding,
  type IndexerLimits,
  type TailReconciliationConfig,
  type FixedFees,
  type SomniaMarketsAddresses,
  type PriceFeedConfig,
} from "./config.js";
// Per-chain protocol addresses baked in from the deployment manifests at
// release time (generated — see scripts/gen-addresses.mjs).
export { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SOMNIA_MAINNET_ADDRESSES, SOMNIA_TESTNET_ADDRESSES } from "./addresses.js";
export { consoleDebugSink, debugCollector, type DebugCollector, type DebugEvent, type Span } from "./debug.js";

// ---- realtime price feeds ----
export { type PriceWatchHandle, type PriceWatchOptions } from "./priceFeed/priceFeed.js";
export {
  PRICE_FEED_DECIMALS,
  PRICE_RESOLUTION_SECONDS,
  type LivePrice,
  type PricePoint,
  type PriceCandle,
  type PriceCandleResolution,
  type PriceFeedInfo,
  type PriceFeedStatus,
  type PriceFeedHealth,
} from "./priceFeed/types.js";

// ---- market + read types (returned by client methods) ----
// CLIENT-SCOPED RULE: anything that uses a connection (indexer reads, chain
// reads, writes) is reachable ONLY as a member of the client facade
// (`exchange.client.<name>(…)`) — never as a root free function. The barrel
// exports the TYPES those members take/return, plus pure kernels/constants/ABIs.
export {
  byNewestFirst,
  type MarketActivity,
  type MarketActivityBase,
  type MarketActivityKind,
  type MarketActivityOptions,
  type MarketTradeActivity,
  type MarketSupplyActivity,
  type MarketResolutionActivity,
  type MarketStatusActivity,
  type TransactionActivity,
  type TransactionActivityOptions,
  type BlockActivity,
  type BlockTimestampResolver,
  type BlockActivityOptions,
  type BlockMarketActivity,
  type BlockOrder,
  type BlockOrderTouch,
  type TransactionOrder,
} from "./activity.js";
export {
  type FillDetail,
  type FillOrder,
  type FillRow,
  type FillsOptions,
  type FillsPage,
  type FillsPageOptions,
  type FillsScope,
  type GetFillsOptions,
  type GetUserFillHistoryOptions,
  type GetUserFillsPageOptions,
  type LatestFillBlock,
  type UserFillHistory,
  type UserFillHistoryRead,
  type UserFillsPage,
  type MarketRef,
  type OrderFillRow,
  type TradeContext,
} from "./fills.js";
export { CANDLE_INTERVALS, type Candle, type GetCandlesOptions } from "./candles.js";
export { type PoolBindingRecord, type IndexedPool, type ListPoolBindingsOptions } from "./pools.js";
export { type RouterActionRecord, type RouterActionKind, type RouterActionsOptions } from "./router.js";
export {
  type IndexerSyncStatus,
  type IndexerFreshness,
  type IndependentHead,
  type IndexedBlockWait,
  type WaitForIndexedBlockOptions,
} from "./syncStatus.js";
// A bounded count and whether it was truncated — the return type of the client's
// `countMarketsBounded` / `countBinaryMarketsBounded`. Type-only: the count
// functions are client-scoped (sdk-root-entrypoint), so no free function here.
export { type CountResult } from "./indexerRead.js";

// ---- query-key factories (cache identity for the client's one-shot reads) ----
// Plain functions, no query-library import — exported from the root (not
// `/react`) because a non-React caller invalidating a cache wants them too.
export {
  QUERY_KEY_SCOPE,
  marketsKey,
  portfolioKey,
  candlesKey,
  marketActivityKey,
  tradeContextKey,
  transactionActivityKey,
  blockActivityKey,
  marketFeesKey,
  operatorsKey,
  marketCreatorsKey,
  oracleAdaptersKey,
  syncStatusKey,
  maxVenueFeeBpsKey,
  marketOnchainKey,
  type ClientQueryKey,
  type QueryKeyChainOptions,
  type QueryKeyElement,
} from "./queryKeys.js";
export {
  isBinaryMarket,
  isSpotMarket,
  isPerpMarket,
  type Market,
  type BaseMarket,
  type SpotMarket,
  type PerpMarket,
  type BinaryMarket,
  type MarketType,
  type MarketFees,
  type LiveBinaryMarketsFilter,
  type BinaryMarketFilter,
  type BinaryMarketCountOptions,
  type BinaryMarketOrderBy,
  type ListBinaryMarketsOptions,
  type RegistrySweep,
  type PastBinaryMarketsOptions,
  type SpotMarketFilter,
  type PerpMarketFilter,
  type MarketStatusUpdate,
} from "./markets.js";
export {
  type OpenOrder,
  type OrderMarket,
  type OrdersOptions,
  type OrderDetail,
  type OrderRow,
  type BookTop,
  type BookTopsOnchain,
  type BinaryOrderBook,
  type GetBinaryOrderBookOptions,
  type GetSpotOrderBookOptions,
  type GetOrderOnchainOptions,
  OPEN_ORDERS_ONCHAIN_MAX_POOLS,
  type GetBookTopsOnchainOptions,
  type GetOwnOpenOrdersOnchainOptions,
  type GetOpenOrdersOnchainOptions,
  type OpenOrdersOnchain,
  type BinaryBookParams,
  type ClosingPriceState,
  type SpotOrderBook,
  type SweepableOrder,
  type OnchainOrder,
} from "./orders.js";
export { type BookLevel } from "./store.js";
// The ERC-6909 outcome-token singleton ABI — exported so apps can read balances
// (`balanceOf(owner, id)`) and set the one-time operator approval (`setOperator`)
// directly, mirroring what the SDK trader does internally. The BinarySettlement
// ABI (redeem/finalizeAndRedeem/claimOwed + record views) and the module's
// v2 write/read ABIs (finalizeMarket/releasePool/free-pool views) are exported
// for keepers/tooling that call the contracts directly.
export { erc6909Abi, binarySettlementAbi } from "./readsAbi.js";
// The one public read-side ABI: WHICH OperatorPermissionsRegistry a SpotPool consults when it
// gates placeOrderFor / cancelOrderFor / reduceOrderFor. `client.getOperatorPermissionsRegistry`
// answers the same question, but it awaits its own `readContract` and returns the decoded
// address, so there is no call descriptor to hand to a caller-built multicall; reaching it also
// goes through `getClient()`, which needs a configured chain client. A caller batching the read,
// or holding only a plain viem client, needs the fragment itself — and the alternative is a
// transcription that drifts in silence.
//
// The pool is the authority: two pools on one deployment may name different registries, so read
// per pool rather than caching one answer. address(0) is a real answer meaning the pool is
// unwired, and denies every operator call.
export { spotPoolOperatorRegistryReadAbi } from "./readsAbi.js";
export { binaryModuleReadAbi, binaryModuleWriteAbi } from "./moduleAbi.js";
// The OracleHub ABI (+ its events) — exported for keepers/verifiers that call
// the hub directly (credit-only withdraw, ReserveEarmarked/SurplusCredited +
// CallbackAccounted reconciliation).
export { oracleHubAbi, oracleHubEventsAbi } from "./machineryAbi.js";
// The order-placement write ABIs + the OrderKind enum — so a caller can encode a
// placement by hand, not only via `trader.buildPlace*Order`.
//
// The rest of the set is here for the same reason as `orderBookEventsAbi` below: a
// consumer that encodes a write or decodes a receipt itself must use OUR signatures,
// because the alternative is a transcription that drifts in silence. Token approvals
// and vault funding (`erc20WriteAbi`, `erc20VaultWriteAbi`), batch order management
// (`orderBookBatchWriteAbi`), perp collateral (`marginBankWriteAbi`), the spot
// stop-order lifecycle (`spotStopRegistryWriteAbi` + `spotStopRegistryEventsAbi`) and
// operator delegation (`operatorRegistryWriteAbi`) are the ones consumers have
// actually needed.
//
// Scoped to these deliberately. One read-side ABI is public — `spotPoolOperatorRegistryReadAbi`,
// exported above beside the other `readsAbi.js` re-exports — because a consumer asked for the
// fragment itself. The REST of the read-side ABIs stay internal: publishing one freezes it as
// public API, and nothing has asked for them.
export {
  binaryPoolWriteAbi,
  spotPoolWriteAbi,
  perpPoolWriteAbi,
  erc20WriteAbi,
  erc20VaultWriteAbi,
  orderBookBatchWriteAbi,
  marginBankWriteAbi,
  spotStopRegistryWriteAbi,
  spotStopRegistryEventsAbi,
  operatorRegistryWriteAbi,
} from "./tradeAbi.js";
// `UnsignedCall` itself is exported below, beside the other build-verb shapes.
export { ORDER_KIND, type UnsignedOrder } from "./writer.js";
// The OrderBook lifecycle events (OrderPlaced/Rested/Cancelled/Expired/Reduced/
// Filled) shared by SpotPool + BinaryPool — exported so a caller that decodes a
// placement receipt itself reads the SAME signatures the SDK and the indexer do.
// Without this the only way to learn an order id from a receipt without waiting
// on indexer ingestion was to hand-copy the ABI, which is how a signature drifts
// silently: a transcription decodes nothing (or worse, decodes wrong) and the
// failure surfaces as a missing fill rather than as an error.
export { orderBookEventsAbi } from "./eventsAbi.js";
// The perp event ABIs, for the same reason. Three contracts carry the perp event
// plane, and none of it was decodable by a consumer: `perpPoolWriteAbi` and
// `marginBankWriteAbi` export zero events, and there was no MarginBank or
// LiquidationEngine event ABI at all.
//
// `perpPoolEventsAbi` is per pool (funding, open interest, the maker reason tags).
// `marginBankEventsAbi` and `liquidationEngineEventsAbi` are SINGLETONS — one
// address serves every pool and every account, so a subscription is one stream and
// the pool or account filter is an indexed topic, not a log source. Account-level
// waterfall events carry no pool at all, so a per-pool liquidation filter is lossy.
//
// The liquidation waterfall is split across the two singletons: LiquidationEngine
// emits the stages and their costs, MarginBank the settlement legs. A consumer that
// wants the whole story needs both.
export { perpPoolEventsAbi, marginBankEventsAbi, liquidationEngineEventsAbi } from "./eventsAbi.js";
// The binary event ABIs, for the same reason. `MarketCreated` and
// `MarketFinalized` each appear in two of them, with distinct topic0s.
export {
  binaryPoolEventsAbi,
  binaryMarketEventsAbi,
  binaryModuleEventsAbi,
  binarySettlementEventsAbi,
  marketCreatorEventsAbi,
} from "./eventsAbi.js";
// Revert decoding — the error table and the decoder that reads it.
//
// `decodeRevert` turns whatever a node threw into a `ContractRevertError` carrying
// the Solidity error name, and `contractErrorsAbi` is the table it decodes against.
// Both are pure over caller-held data (no transport, no client, no owner), so
// SDK-API-003 admits them at the root alongside the other ABI data.
//
// Exported because a consumer holding revert data from its OWN call had no way to
// name it: `ContractRevertError` is a passive holder that decodes nothing, and the
// exports map has no wildcard, so a deep import cannot reach either symbol. The
// alternative was a hand-copied error table, which is the same silent-drift trap
// `orderBookEventsAbi` above was exported to close.
//
// `contractErrorsAbi` is GENERATED (`pnpm errors:gen`). Publishing it freezes a
// generated artifact as public API deliberately: a consumer's copy stops drifting
// when ours is regenerated.
export { contractErrorsAbi } from "./contractErrorsAbi.js";
export { decodeRevert, type RevertContext } from "./revert.js";
export { type MarketOnchainSources } from "./markets.js";

// ---- funding-rate normalization ----
//
// A perp funding rate is a per-CALCULATION-WINDOW fraction (28800s / 8h on every live
// pool), NOT a per-interval or annual one, and each settlement interval accrues
// `rate / n` where `n = fundingWindowSec / fundingIntervalSec` — 8 on every live pool
// (28800 / 3600). It has been 96 at a 300s cadence, and the same rate value means a 12x
// different per-interval accrual across that boundary, so every row carries its own
// window and interval. These helpers are the only place that arithmetic lives; hardcoding
// the denominator produces a plausible-looking wrong chart rather than an error.
export {
  FUNDING_PRECISION,
  EIGHT_HOURS_SEC,
  ONE_HOUR_SEC,
  ONE_YEAR_SEC,
  normalizeFundingRate,
  fundingRate8h,
  fundingRate1h,
  fundingRatePerInterval,
  annualizedFundingRate,
  intervalsPerWindow,
  realizedFundingPerBase,
  isFundingStale,
  densifyFundingBuckets,
  buildFundingRateSeries,
  type FundingBucketLike,
  type FundingRateSeries,
  type FundingSeriesBucket,
} from "./funding.js";
export {
  NetworkTape,
  type NetworkTapeOptions,
  type NetworkTapeStatus,
  type TapeFill,
  type TapeOrder,
} from "./networkTape.js";
export { type SystemInfo, type MarketCreatorInfo, type TransactionSummary } from "./system.js";

// ---- P1 derived reads (analytics) — pure kernels + their result types.
// The client wires these to the live store / indexer; the kernels are exported
// for callers that already hold the raw inputs (a book, candles, fills). ----
export {
  quoteBinaryOrderOverBook,
  quoteBinaryStakeOverBook,
  quoteBinarySellOverBook,
  slippageForCrossing,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_SLIPPAGE_MIN_TICKS,
  marketStats24hFromCandles,
  pnlEventsFor,
  computePositionPnL,
  claimableFrom,
  estPayoutFor,
  type BinaryOrderQuote,
  type BinaryStakeQuote,
  type BinarySellQuote,
  type BinaryBuySide,
  type BinarySellSide,
  type BinaryCrossingParams,
  type MarketStats24h,
  type BinaryPositionPnL,
  type BinaryOutcomePositionPnL,
  type PnLEvent,
  type ClaimablePosition,
  type ClaimableInput,
  type PnlEventsForError,
  type ComputePositionPnLError,
  type EstPayoutForError,
  type ClaimableFromError,
  midYesPrice,
  averageEntryPrice,
  outcomeMarkPrice,
  markOutcomePosition,
  positionMarkState,
  type EntryTrade,
  type OutcomePositionMark,
  type PositionMarkState,
} from "./derivedReads.js";

// ---- write types (client.createTrader → Trader) ----
export {
  type Trader,
  type TraderConfig,
  type TxResult,
  type OrderFill,
  type PlaceOrderResult,
  type PlaceStopOrderResult,
  type PlacePerpStopOrderResult,
  type PlaceOrderParams,
  type CancelOrderParams,
  type ReduceOrderParams,
  type CancelExpiredOrdersParams,
  type SweepExpiredAtLevelParams,
  type CaptureCloseParams,
  type ApproveBuilderParams,
  type WithdrawVaultParams,
  ORDER_TYPE,
  type PlaceSpotOrderParams,
  type TraderBuildPlaceSpotOrderError,
  type SpotOrderRequest,
  type PlaceSpotOrdersParams,
  type PlaceSpotOrdersResult,
  type BatchPlaceOutcome,
  type CancelOrdersParams,
  type CancelOrdersResult,
  type BatchCancelOutcome,
  type CancelAllOrdersOptions,
  type CancelAllOrdersResult,
  type CancelAllOrdersEmpty,
  type CancelAllOrdersSent,
  type TraderCancelAllOrdersError,
  type TraderBuildCancelOrdersError,
  type ReduceOrderRequest,
  type ReduceOrdersParams,
  type TraderBuildReduceOrdersError,
  type TraderSignRedeemAuthError,
  type PlacePerpOrderParams,
  // ---- amend + batch order writes (one tx; N orders for the batch verbs) ----
  SELF_MATCHING_OPTION,
  type BatchOrderRequest,
  type AmendOrderParams,
  type AmendOrderResult,
  type AmendOrdersParams,
  type AmendOrdersResult,
  type DepositMarginParams,
  type WithdrawMarginParams,
  type SetPerpLeverageParams,
  // ---- linked-wallet writes (perp isolated margin: one wallet per position) ----
  // The consent handshake plus both routes home for main-funded principal. The
  // funding PULL itself has no verb: the pool performs it inside the child's own
  // placement, so `placePerpOrder` sent by the child is the whole write side.
  type PerpWalletLinkTarget,
  type ProposePerpWalletLinkParams,
  type AcceptPerpWalletLinkParams,
  type CancelPerpWalletLinkProposalParams,
  type UnlinkPerpWalletParams,
  type RepayPerpMainFundingParams,
  type RecallPerpMainFundingParams,
  // ---- credit-voucher claim (perp house money; one claim per address) ----
  type ClaimPerpVoucherParams,
  type TraderClaimPerpVoucherError,
  type TraderBuildClaimPerpVoucherError,
  type PlaceSpotStopOrderParams,
  type CancelStopOrderParams,
  type PerpStopIntent,
  type PerpStopOrderLeg,
  type PlacePerpStopOrderParams,
  type LinkPerpStopOrdersParams,
  type CancelPerpStopOrdersParams,
  type ClaimPerpStopSomiParams,
  type MintSetParams,
  type BurnSetParams,
  type RedeemParams,
  type RedeemAuthorization,
  type SignRedeemAuthParams,
  type RedeemForParams,
  type RedeemDirectParams,
  type RedeemManyParams,
  type SyncSettlementParams,
  type ClaimOwedParams,
  type FinalizeMarketParams,
  type ReleasePoolParams,
  type PokeOracleParams,
  type VoidExpiredParams,
  type DepositVaultParams,
  type DepositVaultNativeParams,
  type SetManualVaultModeParams,
  type SetOperatorApprovalForPoolParams,
  type SetOperatorApprovalGlobalParams,
  type SettlementRecord,
  type MintSetNativeParams,
  type MintSetPermit2Params,
  type RedeemNativeParams,
  type Permit2TransferFrom,
  type RouterMintBase,
  type FaucetParams,
  type ResolveParams,
  type VoidMarketParams,
} from "./trade.js";

// ---- operator/venue reads + admin writes (MarketsCore control plane) ----
// Reads are indexer-backed (IndexedOperator/IndexedVenue live in ./operatorAdmin,
// exported below); these chain helpers back only the venue fee-param forms.
export {
  MARKET_TYPE_BINARY_V1,
  decodeBinaryVenueFeeParams,
  type BinaryVenueParams,
  type VenueVoidPolicy,
} from "./operatorReads.js";
export {
  type OperatorAdmin,
  type OperatorAdminConfig,
  type VenueConfigInput,
  type RegisterOperatorParams,
  type RegisterOperatorResult,
  type UpdateOperatorParams,
  type SetOperatorEnabledParams,
  type TransferOperatorOwnershipParams,
  type AcceptOperatorOwnershipParams,
  type CreateVenueParams,
  type CreateVenueResult,
  type UpdateVenueParams,
  type SetVenueEnabledParams,
} from "./operatorAdmin.js";

// ---- operator "market machinery" admins (the OracleHub, governance,
// market creators + series). Same signer doctrine as OperatorAdmin. The
// directory reads (IndexedMarketCreator/IndexedOracleAdapter/IndexedSeries +
// the hub's OracleQuestion/OperatorHubAccount/OracleBind/OracleCallback mirrors)
// live in ./oracleHub, exported above; these are the on-chain writes + point reads.
// Oracle v2 (0.17.0, BREAKING §8e): EARMARK-AT-CREATION — the resolution reserve
// is ATTACHED to the create value and LOCKED per-market at onBind (no standing
// prepaid pre-fund; `deposit` is GONE). The OracleHub is THE one approved
// adapter. `quoteCreateMarketValue` is now `getSchedulingCost(def) +
// resolveReserve()`; surplus accrues to withdrawable credit (`withdrawableOf`),
// drawn via credit-only `withdraw`.
export {
  QUESTION_SOURCE_TYPE,
  ANSWER_TYPE,
  type OracleHubAdmin,
  type OracleHubAdminConfig,
  type QuestionDefinitionInput,
  type QuestionSourceInput,
  type QuestionIntervalInput,
  type ValidAnswersInput,
  type HubStatus,
  type HubQuestionState,
  type ScheduleQuestionParams,
  type ScheduleQuestionResult,
  type WithdrawParams,
  type WithdrawMyCreditParams,
  type FundHubParams,
  type SetHubGasParams,
  type SetHubDrainParams,
  type EnableHubReactivityParams,
} from "./oracleHub.js";
export { type GovernanceAdmin, type SetAdapterApprovedParams } from "./governanceAdmin.js";
/**
 * Signer configuration for the BinaryMarketsModule governance capability.
 *
 * @category administration
 */
export { type GovernanceAdminConfig } from "./governanceAdmin.js";
export {
  type MarketCreatorAdmin,
  type OrderBookParams,
  type CreateMarketCreatorParams,
  type CreateMarketCreatorResult,
  type FundMarketCreatorParams,
  type RegisterSeriesParams,
  type TriggerRollParams,
  type RecoverSeriesParams,
  type ArmFirstRollParams,
  type ReclaimOracleCreditParams,
  type AdoptFromParams,
  type HandoffToParams,
  type SwapCreatorParams,
  type SetReactivityGasParamsParams,
  type MarketCreatorOnchain,
  type SeriesOnchain,
} from "./marketCreatorAdmin.js";
/**
 * Signer configuration for the market-creator administration capability.
 *
 * @category administration
 */
export { type MarketCreatorAdminConfig } from "./marketCreatorAdmin.js";

// ---- MarketTypePlugin registry — the modularity seam for future order-book
// products (fee-param codec + machinery step descriptor keyed by bytes4
// marketType). Binary is the only registered type today. ----
export {
  MARKET_TYPE_PLUGINS,
  getMarketTypePlugin,
  listMarketTypePlugins,
  binaryMarketTypePlugin,
  type MarketTypePlugin,
  type MachineryStep,
} from "./marketTypes/index.js";

// ---- preflight validators — pure {ok, blockers, warnings} functions for each
// machinery wizard step (operator/venue/hub/create-quote/creator/series/roll +
// chain). Oracle v2 §8e: preflightAdapter → preflightHub (protocol-side) +
// preflightCreateQuote (user-side balance ≥ scheduling-cost + resolveReserve check). ----
export {
  preflightOperator,
  preflightVenue,
  preflightHub,
  preflightCreateQuote,
  preflightMarketCreator,
  preflightSeries,
  preflightRoll,
  preflightChain,
  isLocalPrecompileUnavailable,
  HUB_MIN_FREE_BALANCE_WEI,
  MIN_SERIES_INTERVAL_SEC,
  ZERO_ADDRESS,
  type PreflightResult,
  type OperatorPreflightInput,
  type VenuePreflightInput,
  type HubPreflightInput,
  type CreateQuotePreflightInput,
  type MarketCreatorPreflightInput,
  type SeriesPreflightInput,
  type RollPreflightInput,
} from "./preflight.js";

// ---- pure helpers + live-tail types (no client needed) ----
// BREAKING (0.13.0): `kindOf(isBid, userData)` is GONE — v2 stopped encoding the
// YES/NO side in userData (now opaque MM bookkeeping). The side comes from the
// pool's `BinaryOrderPlaced(orderId, kind)` event; map it with `sideOfKind`.
export {
  DECIMALS,
  fillKind,
  ORDER_KIND_SIDE,
  sideOfKind,
  type BinaryFillKind,
  type BinaryMarketStatus,
  type OrderStatus,
  type BinarySide,
  type LiveFill,
  type LiveFundingUpdate,
  type LiveMarket,
  type LiveOrder,
  type TailMode,
  type SeedSource,
  type PoolSeedStatus,
  type TailStatus,
  type TailFailure,
  type TailDivergence,
} from "./store.js";
// ERC-6909 outcome-id encoding helpers (settlement-extraction v2) — the single
// source of truth for `id = (pool << 72) | (nonce << 8) | idx` and the
// settlement `marketKey = id >> 8`. See ids.ts for the full scheme.
export { outcomeId, decodeOutcomeId, marketKey, type DecodedOutcomeId, type OutcomeIdx } from "./ids.js";
export {
  toHuman,
  toHumanString,
  fromHuman,
  priceToProbability,
  probabilityToPrice,
  computeBinaryPnl,
  binaryFillsFor,
  binaryFillsFromPortfolio,
  markYesPrice,
  balanceFloor,
  floorRawBalance,
  ceilRawAmount,
  snapRawToGrid,
  roundPriceToTick,
  upProbability,
  upPercent,
  type BinaryPnl,
  type BinaryOutcomePnl,
  type BinaryPnlFill,
  type RawGridDirection,
  type YesBookTop,
  type ComputeBinaryPnlError,
} from "./units.js";
export {
  estimateMarketOrder,
  fillsWithinSlippage,
  bookMidPrice,
  type MarketOrderEstimate,
  type QuoteDenomination,
  type UnifiedBookLevels,
} from "./unified/quotes.js";
export {
  computePortfolioAnalytics,
  // Pure: drops the bridge legs between an exchange's own chains from a funding
  // list before the capital-base fold sees them.
  netInternalTransfers,
  type ComputePortfolioAnalyticsError,
  DEFAULT_CEX_RATE_BPS,
  type PortfolioAnalytics,
  type PortfolioAnalyticsOptions,
  type PortfolioFlowEvent,
  type PortfolioFundingEvent,
  type PortfolioTimeframe,
  type PortfolioTradeEvent,
  type MarkSeries,
  type MarkSources,
  type EquityPoint,
  type HoldingsPoint,
  type PnlBucket,
} from "./unified/portfolioAnalytics.js";
// Series-cadence helpers — the SDK-canonical `intervalSec → "15m"/"1h"/"4h"`
// mapping. Markets/trade-history rows already serve a stamped `interval` label,
// so most callers never need these; exported for consumers that hold raw
// seconds (a series-config form, a bot) or want to re-derive/snap themselves.
export {
  resolveIntervalSec,
  snapIntervalSec,
  snapToCadence,
  cadenceBandSec,
  formatIntervalLabel,
  marketIntervalLabel,
  CADENCE_LADDER_SEC,
  CADENCE_TOLERANCE_SEC,
  type IntervalSource,
} from "./interval.js";

// React hooks are NOT exported here — import them from "@somnia-chain/markets-sdk/react".

// ---- SomniaLend (third-party protocol; an Aave v3.0 fork on Somnia) ----
// The lend ENTRY is client-scoped: apps opt in with config.addresses.lend and
// reach it through `client.lend` (which builds it — createLendWithDeps stays
// internal). The root exports only what a client can't carry: the types, the
// published deployment constants, the pure ray-math helpers, and the ABIs.
export { type LendAddresses, type LendReserve, type LendPosition, type LendAccount } from "./lend/types.js";
export {
  type Lender,
  type LenderConfig,
  type LendWriteOptions,
  type LendSupplyOptions,
  type LendWithdrawOptions,
  type LendRepayOptions,
} from "./lend/lender.js";
export { lendRayRateToApy, rayMul, accrueLinear, accrueCompounded, RAY } from "./lend/math.js";
export { lendPoolAbi, lendUiPoolDataProviderAbi, lendGatewayAbi, lendDebtTokenAbi } from "./lend/lendAbi.js";
export { type SomniaLendClient, SOMNIA_MAINNET_LEND, SOMNIA_TESTNET_LEND } from "./lend/client.js";

export {
  type ProtocolFeeRecord,
  type BuilderFeeRecord,
  type SettlementFeeRecord,
  type BuilderApproval,
  type BuilderApprovalRef,
} from "./fees.js";
export { type BalanceQuery, type Erc20Metadata } from "./balances.js";
export {
  type AccountEquity,
  type AccountEquityEntry,
  type AccountEquityScope,
  type GetAccountEquityParams,
} from "./accountEquity.js";
export {
  type OutcomeBalances,
  type Portfolio,
  type PortfolioMarket,
  type PortfolioPosition,
  type PortfolioOrder,
  type PortfolioTrade,
  type PortfolioOptions,
  type ClaimablePage,
  type GetClaimablePageOptions,
  type OpenPositionPnL,
  type VaultPayoutFallback,
  type ListVaultPayoutFallbacksOptions,
  type GetVaultBalanceParams,
  type GetOutcomeBalanceParams,
} from "./binary/portfolio.js";
export {
  type SpotPortfolio,
  type SpotPortfolioMarket,
  type SpotPortfolioOrder,
  type SpotPortfolioTrade,
} from "./spot/portfolio.js";
export { type SpotStopOrder, type StopOrderStatus } from "./spot/stops.js";
export { type GetManualVaultModeParams } from "./spot/vaultMode.js";
export {
  CANCEL_ORDER_FOR_SELECTOR,
  PLACE_ORDER_FOR_SELECTOR,
  type IsApprovedForPoolParams,
  type IsGloballyApprovedParams,
} from "./spot/operatorGrants.js";
export {
  type AutoPullRequirement,
  type GetAutoPullRequirementParams,
  type IsOperatorAuthorizedParams,
  type LockedBalance,
  type LockedTokenBreakdown,
  type TokenLockBreakdown,
} from "./spot/poolReads.js";
export { NATIVE_TOKEN_SENTINEL } from "./vault/funding.js";
export {
  type MarginAccount,
  type AccountHealth,
  type MarginStatus,
  type PerpRiskParams,
  type PerpHealthSnapshot,
  type PerpOrderMarginPreview,
  type PerpLeverage,
  type PerpLiquidationPreview,
  type PerpLiquidationPriceInputs,
  type PerpPositionAnalytics,
  type PerpPositionAnalyticsInputs,
  type PerpPositionMetrics,
  type PerpClosePreview,
  type PerpMaxOrderSize,
  type PerpMaxOrderSizeLimit,
  type PerpOrderMarginQuote,
  type PerpOrderMarginQuoteInputs,
  type PerpSideHolders,
  type PerpSideHoldersRef,
  type GetPerpSideHoldersOptions,
  type GetBankruptcyPriceOptions,
  type GetPerpMaxLeverageOptions,
  MARGIN_STATUS,
  // Margin math, not margin reads: pure, sync, no `Writer` and no client, so not
  // client-scoped. Their input and output types are already exported above.
  perpLiquidationPrice,
  perpOrderMarginQuote,
  perpPositionAnalytics,
} from "./perp/margin.js";
// ---- one side of one perp market's ADL queue: `client.perpAdlQueue` ----
export {
  PERP_ADL_QUEUE_MAX_HOLDERS,
  type PerpAdlHolder,
  type PerpAdlOrderSource,
  type PerpAdlQueue,
} from "./perp/adl.js";
export {
  type PerpAdlQueueClient,
  type PerpAdlQueueClientGetSnapshotError,
  type PerpAdlQueueClientSubscribeError,
  type PerpAdlQueueGetSnapshotOptions,
} from "./perp/adlClient.js";
export {
  type PerpAdlQueueClosed,
  type PerpAdlQueueData,
  type PerpAdlQueueFailed,
  type PerpAdlQueueLoading,
  type PerpAdlQueueSnapshot,
  type PerpAdlQueueStale,
  type PerpAdlQueueStaleReason,
  type PerpAdlQueueView,
  type PerpAdlQueueViewError,
} from "./perp/adlView.js";
export {
  type PerpSystemConfig,
  type InsuranceFundState,
  type InsuranceFundTier,
  type LiquidationEngineConfig,
  type PerpInsuranceFundEvent,
} from "./perp/system.js";
export {
  type PerpFundingPayer,
  type PerpMainFunding,
  type PerpWalletLinkage,
  type PerpWalletLinkEvent,
  type PerpMarginPull,
  type PerpMainFundingEvent,
} from "./perp/linkedWallet.js";
export {
  type PerpVoucher,
  type PerpVoucherCampaign,
  type PerpVoucherEligibility,
  type PerpVoucherIneligibleReason,
} from "./perp/voucher.js";
export {
  type PerpStopOrder,
  type PerpStopOrderMarket,
  type PerpStopDropReason,
  type PerpStopOrderOnChain,
  type PerpStopOrderRef,
  type PerpStopOrderRead,
  type PerpStopOrderReadError,
  PERP_STOP_DROP_REASON,
  // The shape `trader.buildPlacePerpStopOrder` hands back, plus the log decoder that
  // recovers the ids it cannot: the build path leaves the send to the caller, so the
  // caller is the only one holding the receipt. Pure functions of their arguments —
  // no `Writer` and no client, so they are not client-scoped and belong here.
  type UnsignedPerpStopOrder,
  decodePerpStopOrderIds,
} from "./perp/stops.js";
// The shape `trader.buildDepositMargin` hands back — see the note above.
export { type UnsignedMarginDeposit } from "./perp/margin.js";
// One unsigned call, as every `build*` verb returns it: `{ chainId, to, data, value }`
// plus a human label, ready for an executor, an ERC-4337 UserOp, a Safe batch or a relayer.
export { type UnsignedCall } from "./writer.js";
// ---- the executor seam: who signs and sends, separated from what the write is ----
// Types plus the pure pieces (the chain guard and the boundary normalizers).
// The built-in executors themselves are owner-derived:
// `client.createExecutor(spec)`.
export {
  type Executor,
  type Executed,
  type ExecuteOptions,
  type TypedDataSigner,
  type ExecutorExecuteError,
  type ExecutorSignTypedDataError,
} from "./executor/types.js";
// The boundary normalizers the built-ins use, for a custom executor that wants
// the same error contract: pure functions over a caught value.
export { asExecuteError, asSignTypedDataError } from "./executor/boundary.js";
export { type ExecutorSpec } from "./executor/create.js";
export { assertCallsOnChain, type AssertCallsOnChainError } from "./executor/guard.js";
// The smart-account variant's signer input; the executor itself comes from
// `client.createExecutor({ smartAccount, inner })`, built on `@somnia-chain/accounts-sdk`.
export { type SmartAccountSigner } from "./executor/smartAccount.js";
// ---- the smart-accounts capability: the accounts factory model through this SDK ----
// The interface `client.accounts` returns, its build shapes, and the
// exchange-level surface (`exchange.accounts`). Products consume this SDK
// alone; `@somnia-chain/accounts-sdk` is the engine room underneath.
export {
  type SmartAccountsClient,
  type SmartAccountsReadError,
  type SmartAccountsIndexedReadError,
  type SmartAccountsBuildError,
  type AccountActivityPage,
  type AccountsPage,
  type AccountFactoryHistoryPage,
  type AccountFactoryState,
  type AccountFactoryEvent,
  type AccountFactoryEventKind,
  type AccountFeedPageOptions,
  type AccountsIndexerStatus,
  type ListControlledAccountsOptions,
  type ListOwnerHistoryOptions,
  type ListModuleHistoryOptions,
  type GetActivityPageOptions,
  type GetFactoryHistoryPageOptions,
  type PreparedAccountAuthorization,
  type PreparedAccountExecution,
  type AccountAuthorizationTypedData,
  type UnsignedAccountCreation,
} from "./smartAccounts.js";
export { type ExchangeSmartAccounts, type SmartAccountInner } from "./unified/smartAccounts.js";
// ---- the account view: one account's complete open orders and pending stops ----
// The interfaces `client.accountOrders` and `client.accountPositions` return, their results and live views,
// the pure helper that maps a thrown error to its failure code, and the zod schemas
// its reads validate indexer rows with.
export {
  type AccountOrdersClient,
  type AccountOrdersClientGetSnapshotError,
  type AccountOrdersClientSubscribeError,
} from "./accountView/client.js";
export { accountViewFailureReason } from "./accountView/failure.js";
export {
  ACCOUNT_BALANCES_MAX,
  type AccountBalancesClient,
  type AccountBalancesClientGetSnapshotError,
  type AccountBalancesClientSubscribeError,
  type AccountBalancesGetSnapshotOptions,
} from "./accountView/balancesClient.js";
export {
  NATIVE_BALANCE_TOKEN,
  type AccountBalance,
  type AccountBalanceFigure,
  type AccountBalanceToken,
  type AccountBalancesData,
  type AccountBalancesClosed,
  type AccountBalancesFailed,
  type AccountBalancesLoading,
  type AccountBalancesReadError,
  type AccountBalancesSnapshot,
  type AccountBalancesStale,
  type AccountBalancesStaleReason,
  type AccountBalancesView,
  type AccountBalancesViewError,
} from "./accountView/balancesTypes.js";
export {
  type AccountPositionsClient,
  type AccountPositionsClientGetSnapshotError,
  type AccountPositionsClientSubscribeError,
  type AccountPositionsGetSnapshotOptions,
} from "./accountView/positionsClient.js";
export {
  type AccountMargin,
  type AccountMarginHealth,
  type AccountPerpOrder,
  type AccountPosition,
  type AccountPositionLiquidationPrice,
  type AccountPositionMarks,
  type AccountPositionsData,
  type AccountPositionsFigure,
  type AccountPositionsClosed,
  type AccountPositionsFailed,
  type AccountPositionsLoading,
  type AccountPositionsReadError,
  type AccountPositionsSnapshot,
  type AccountPositionsStale,
  type AccountPositionsStaleReason,
  type AccountPositionsView,
  type AccountPositionsViewError,
} from "./accountView/positionsTypes.js";
export {
  type AccountSpotOrdersClient,
  type AccountSpotOrdersClientGetSnapshotError,
  type AccountSpotOrdersClientSubscribeError,
  type AccountSpotOrdersGetSnapshotOptions,
} from "./accountView/spotOrdersClient.js";
export {
  type AccountSpotOrder,
  type AccountSpotOrdersClosed,
  type AccountSpotOrdersData,
  type AccountSpotOrdersFailed,
  type AccountSpotOrdersLoading,
  type AccountSpotOrdersReadError,
  type AccountSpotOrdersSnapshot,
  type AccountSpotOrdersStale,
  type AccountSpotOrdersStaleReason,
  type AccountSpotOrdersView,
  type AccountSpotOrdersViewError,
  type AccountSpotUnreadPool,
} from "./accountView/spotOrdersTypes.js";
export {
  type AccountOutcomePositionsClient,
  type AccountOutcomePositionsClientGetSnapshotError,
  type AccountOutcomePositionsClientSubscribeError,
  type AccountOutcomePositionsGetSnapshotOptions,
} from "./accountView/outcomePositions.js";
export {
  type AccountOutcomeClaimable,
  type AccountOutcomePosition,
  type AccountOutcomePositionsClosed,
  type AccountOutcomePositionsData,
  type AccountOutcomePositionsFailed,
  type AccountOutcomePositionsLoading,
  type AccountOutcomePositionsReady,
  type AccountOutcomePositionsSnapshot,
  type AccountOutcomePositionsStale,
  type AccountOutcomePositionsTooLarge,
  type AccountOutcomePositionsUnavailable,
  type AccountOutcomePositionsView,
  type AccountOutcomePositionsViewError,
} from "./accountView/outcomePositionsTypes.js";
export {
  accountOrderRowWireSchema,
  accountOrdersCapabilityWireSchema,
  accountOrdersGuardWireSchema,
  accountStopRowWireSchema,
} from "./accountView/schemas.js";
export {
  type AccountOrder,
  type AccountOrdersClosed,
  type AccountOrdersData,
  type AccountOrdersFailed,
  type AccountOrdersGetSnapshotOptions,
  type AccountOrdersLoading,
  type AccountOrdersReady,
  type AccountOrdersSnapshot,
  type AccountOrdersSource,
  type AccountOrdersStale,
  type AccountOrdersStaleReason,
  type AccountOrdersTooLarge,
  type AccountOrdersUnavailable,
  type AccountOrdersView,
  type AccountOrdersViewError,
  type AccountStop,
  type AccountStopLimitPrice,
  type AccountStopVenue,
  type AccountViewCoverage,
  type AccountViewExclusion,
  type AccountViewFailureReason,
  type AccountViewSync,
  type AccountViewUnavailableReason,
  type AccountViewVersion,
} from "./accountView/types.js";
// The one pure helper a scan-rendering UI needs beside the result: the honest
// coverage sentence ("none in the first N", never "none").
export { describeCoverage } from "@somnia-chain/accounts-sdk";
// The accounts-SDK result types the capability's members hand back, re-exported
// so every return value is nameable from this package alone.
export type {
  AccountAuthorization,
  AccountScan,
  AccountSlot,
  AccountTree,
  TreeNode,
  CrossChainScan,
  CrossChainSlot,
  CustodyChain,
  CustodyStep,
  OwnerSet,
  OwnerInfo,
  OwnerKind,
  Holdings,
  TokenAmount,
  HealthReport,
  Check,
  CheckStatus,
  ComparisonRow,
  Severity,
  IndexedAccount,
  AccountDerivation,
  AccountEvent,
  AccountEventKind,
  ExecutionDetail,
  ExecutionContent,
  IndexedOwner,
  IndexedModule,
  IndexedAuthorization,
} from "@somnia-chain/accounts-sdk";
export {
  decodePlaceOrder,
  decodeAmendOrder,
  decodeAmendOrders,
  type DecodedPlacement,
  type DecodedAmendment,
  type DecodedBatchAmendment,
  type DecodeAmendOrdersError,
} from "./decode/orders.js";
export { type SomniaMarketsAccount, isSomniaMarketsAccount } from "./account.js";
// The bridge as an exchange member (`exchange.bridge`) — types only; the
// implementation is owner-derived.
export {
  type ExchangeBridge,
  type ExchangeBridgeParams,
  type ExchangeBridgeResult,
  type ExchangeBridgeTransferOptions,
  type ExchangeBridgeTransferError,
  type BridgeStepEvent,
} from "./unified/bridge.js";
export {
  type PerpStateOnchain,
  type PerpFeedStatus,
  type PerpFundingPremium,
  type PerpPosition,
  type PerpPositionRef,
  type IndexedPerpPosition,
  perpMarkForPnl,
} from "./perp/state.js";
export { type PerpPoolStatus, PERP_POOL_FACTORY_MARKET_STATUS_INTERFACE_ID } from "./perp/registry.js";
export {
  type FundingPayment,
  type MarginEvent,
  type MarginEventKind,
  type GetMarginEventsOptions,
  type ListLiquidationsOptions,
  type GetLiquidationsOptions,
  LIQUIDATION_KIND,
  type LiquidationKind,
  isLiquidationKind,
  type LiquidationEvent,
  type FundingRateUpdate,
  type FundingRateCandle,
  type OpenInterestSnapshot,
  type PerpFeeRecord,
  type PerpOrderRejection,
  type PerpOrderRejectionReason,
  PERP_ORDER_REJECTION_REASON,
  type ListPerpPositionChangesOptions,
  type PerpPositionChange,
  type PerpPositionChangeKind,
} from "./perp/history.js";
export {
  type PerpPortfolio,
  type PerpPortfolioMarket,
  type PerpPortfolioOrder,
  type PerpPortfolioTrade,
  type PerpOrderHistoryRow,
  type TerminalOrderStatus,
} from "./perp/portfolio.js";
export {
  type OracleQuestionRecord,
  type OperatorHubAccountRecord,
  type OracleBindRecord,
  type OracleCallbackRecord,
} from "./oracleHub.js";
export { type IndexedOperator, type IndexedVenue, type OperatorFilter } from "./operatorAdmin.js";
export {
  type IndexedSeries,
  type ListSeriesLatestMarketsOptions,
  type SeriesLatestMarket,
  type IndexedMarketCreator,
  type IndexedOracleAdapter,
  type IndexedMarketCreatorPolicy,
  type MarketCreatorFilter,
} from "./marketCreatorAdmin.js";
export {
  binaryResolutionMode,
  boundaryPrice,
  type BinaryResolutionMode,
  type MarketOnchain,
  type OnchainResolutionPrice,
  type ContractMeta,
  type PoolMarketBinding,
  type GetPoolMarketBindingOptions,
} from "./markets.js";
export {
  type MarketResolutionEvent,
  type MarketReferenceLink,
  type OracleAnswer,
  type MarketResolutionKind,
  type ListMarketResolutionEventsOptions,
  type ListMarketReferenceLinksOptions,
} from "./binary/settlement.js";

export type {
  ObservedReadOperation,
  ObservedReadRequest,
  ObservedReadResult,
  IndexerObservation,
  ObservedReads,
  ObservedReadsReadError,
  ObservedReadsBatchError,
  SomniaMarketsClientCreateObservedReadsError,
  SomniaMarketsClientGetSyncStatusError,
  SomniaMarketsClientGetIndexerFreshnessError,
} from "./observedReads.js";

export type {
  ExchangeStatus,
  ExchangeDataStatus,
  SomniaMarketsFetchDataStatusError,
  SomniaMarketsUnwatchMarketError,
} from "./unified/exchange.js";

export { InvariantError } from "./raise.js";
export type { ObservedReadMethods } from "./observedReads.js";

export type { SomniaLendClientListReservesError, SomniaLendClientGetAccountError } from "./lend/client.js";

export type {
  TraderPlaceOrderError,
  TraderCancelOrderError,
  TraderReduceOrderError,
  TraderCancelExpiredOrdersError,
  TraderSweepExpiredAtLevelError,
  TraderCaptureCloseError,
  TraderApproveBuilderError,
  TraderGetBuilderApprovalError,
  TraderGetEffectiveBuilderApprovalError,
  TraderGetMaxBuilderFeeBpsTimes1kError,
  TraderPlaceSpotOrderError,
  TraderPlaceSpotOrdersError,
  TraderCancelOrdersError,
  TraderReduceOrdersError,
  TraderPlacePerpOrderError,
  TraderAmendOrderError,
  TraderAmendOrdersError,
  TraderBuildPlaceOrderError,
  TraderDepositMarginError,
  TraderWithdrawMarginError,
  TraderWithdrawVaultError,
  TraderDepositVaultError,
  TraderDepositVaultNativeError,
  TraderDepositVaultNativeForError,
  TraderSetManualVaultModeError,
  TraderSetOperatorApprovalForPoolError,
  TraderSetOperatorApprovalGlobalError,
  TraderSetPerpLeverageError,
  TraderProposePerpWalletLinkError,
  TraderAcceptPerpWalletLinkError,
  TraderCancelPerpWalletLinkProposalError,
  TraderUnlinkPerpWalletError,
  TraderRepayPerpMainFundingError,
  TraderRecallPerpMainFundingError,
  TraderPokeFundingError,
  TraderPlaceSpotStopOrderError,
  TraderCancelStopOrderError,
  TraderPlacePerpStopOrderError,
  TraderLinkPerpStopOrdersError,
  TraderCancelPerpStopOrderError,
  TraderCancelPerpStopOrdersError,
  TraderClaimPerpStopSomiError,
  TraderBuildPlacePerpStopOrderError,
  TraderBuildDepositMarginError,
  TraderBuildWithdrawMarginError,
  TraderBuildAcceptPerpWalletLinkError,
  TraderBuildRepayPerpMainFundingError,
  TraderMintSetError,
  TraderBurnSetError,
  TraderRedeemError,
  TraderRedeemForError,
  TraderRedeemManyError,
  TraderRedeemDirectError,
  TraderClaimOwedError,
  TraderPokeOracleError,
  TraderVoidExpiredError,
  TraderFinalizeMarketError,
  TraderSyncSettlementError,
  TraderReleasePoolError,
  TraderGetSettlementError,
  TraderGetFreePoolsError,
  TraderPoolCreatorError,
  TraderMintSetNativeError,
  TraderMintSetPermit2Error,
  TraderRedeemNativeError,
  TraderFaucetError,
  TraderResolveError,
  TraderVoidMarketError,
  TraderPokeError,
} from "./trade.js";

export type {
  LenderSupplyError,
  LenderWithdrawError,
  LenderBorrowError,
  LenderRepayError,
  LenderSetUseAsCollateralError,
  LenderSupplyNativeError,
  LenderWithdrawNativeError,
  LenderBorrowNativeError,
  LenderRepayNativeError,
} from "./lend/lender.js";

export type {
  OperatorAdminRegisterOperatorError,
  OperatorAdminUpdateOperatorError,
  OperatorAdminSetOperatorEnabledError,
  OperatorAdminTransferOperatorOwnershipError,
  OperatorAdminAcceptOperatorOwnershipError,
  OperatorAdminCreateVenueError,
  OperatorAdminUpdateVenueError,
  OperatorAdminSetVenueEnabledError,
} from "./operatorAdmin.js";

export type {
  OracleHubAdminGetSchedulingCostError,
  OracleHubAdminEarmarkedOfError,
  OracleHubAdminCreditOfError,
  OracleHubAdminOutstandingOfError,
  OracleHubAdminWithdrawableOfError,
  OracleHubAdminPayerCreditOfError,
  OracleHubAdminPayerOfError,
  OracleHubAdminResolveReserveError,
  OracleHubAdminQuoteCreateMarketValueError,
  OracleHubAdminGetQuestionStateError,
  OracleHubAdminGetQuestionIdByKeyError,
  OracleHubAdminGetBindCountError,
  OracleHubAdminGetMarketsForQuestionError,
  OracleHubAdminIsHubApprovedError,
  OracleHubAdminGetHubStatusError,
  OracleHubAdminScheduleQuestionError,
  OracleHubAdminWithdrawError,
  OracleHubAdminWithdrawMyCreditError,
  OracleHubAdminFundHubError,
  OracleHubAdminSetGasParamsError,
  OracleHubAdminSetDrainParamsError,
  OracleHubAdminEnableReactivityError,
  OracleHubAdminMigrateSubscriptionError,
} from "./oracleHub.js";

export type {
  GovernanceAdminSetAdapterApprovedError,
  GovernanceAdminGetModuleOwnerError,
  GovernanceAdminIsModuleOwnerError,
} from "./governanceAdmin.js";

export type {
  MarketCreatorAdminCreateMarketCreatorError,
  MarketCreatorAdminFundMarketCreatorError,
  MarketCreatorAdminRegisterSeriesError,
  MarketCreatorAdminUpdateSeriesError,
  MarketCreatorAdminTriggerRollError,
  MarketCreatorAdminRecoverSeriesError,
  MarketCreatorAdminArmFirstRollError,
  MarketCreatorAdminReclaimOracleCreditError,
  MarketCreatorAdminAdoptFromError,
  MarketCreatorAdminHandoffToError,
  MarketCreatorAdminSwapCreatorError,
  MarketCreatorAdminSetReactivityGasParamsError,
  MarketCreatorAdminGetMarketCreatorOnchainError,
  MarketCreatorAdminGetSeriesOnchainError,
} from "./marketCreatorAdmin.js";

export type {
  SomniaMarketsFetchBalanceError,
  SomniaMarketsFetchOpenOrdersError,
  SomniaMarketsWatchOrdersError,
  SomniaMarketsEnsureFundsError,
  SomniaMarketsCreateOrderError,
  SomniaMarketsCancelOrderError,
  SomniaMarketsCreateStopOrderError,
  SomniaMarketsCancelStopOrderError,
  SomniaMarketsFetchFundingRateError,
  SomniaMarketsFetchPositionsError,
  SomniaMarketsDepositMarginError,
  SomniaMarketsWithdrawMarginError,
  SomniaMarketsMintSetError,
  SomniaMarketsBurnSetError,
} from "./unified/exchange.js";

export type {
  SomniaMarketsClientWatchMarketError,
  SomniaMarketsClientWatchMarketsError,
} from "./somniaMarketsClient.js";

export type {
  SomniaMarketsClientGetBinaryBookParamsError,
  SomniaMarketsClientGetPerpStopOrderSomiPaymentError,
  SomniaMarketsClientGetUnclaimedPerpStopSomiError,
  SomniaMarketsClientListPerpPoolStatusesError,
  SomniaMarketsClientListTradeablePerpPoolsError,
  SomniaMarketsClientReadPerpMarketFromChainError,
  SomniaMarketsClientIsPerpPoolRegisteredError,
  SomniaMarketsClientGetAutoPullRequirementError,
  SomniaMarketsClientIsOperatorAuthorizedError,
  SomniaMarketsClientIsGloballyApprovedError,
  SomniaMarketsClientIsApprovedForPoolError,
  SomniaMarketsClientGetOperatorPermissionsRegistryError,
  SomniaMarketsClientGetOwnLockedBalanceError,
  SomniaMarketsClientGetLockedTokenBreakdownError,
  SomniaMarketsClientConvertToQuoteAtPriceCeilError,
  SomniaMarketsClientGetMarketOnchainError,
  SomniaMarketsClientGetPoolMarketBindingError,
  SomniaMarketsClientGetMarketIdOnchainError,
  SomniaMarketsClientGetPoolCreatorError,
  SomniaMarketsClientGetFreePoolsError,
  SomniaMarketsClientGetErc20MetadataError,
  SomniaMarketsClientGetBalancesError,
  SomniaMarketsClientGetStopOrderSomiPaymentError,
  SomniaMarketsClientGetTransactionSummaryError,
  SomniaMarketsClientGetSystemInfoError,
  SomniaMarketsClientEncodeBinaryVenueFeeParamsError,
  SomniaMarketsClientGetMaxVenueFeeBpsError,
  SomniaMarketsClientQuoteCreateMarketValueError,
} from "./somniaMarketsClient.js";
