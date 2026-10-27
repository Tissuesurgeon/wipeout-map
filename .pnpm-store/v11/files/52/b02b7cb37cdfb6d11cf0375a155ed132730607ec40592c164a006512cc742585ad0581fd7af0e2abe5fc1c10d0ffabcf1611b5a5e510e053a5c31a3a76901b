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
export { SomniaMarketsError, InvalidInputError, FillHistoryRestartRequiredError, FillHistoryUnavailableError, PerpPositionChangesUnavailableError, NotConfiguredError, NotSupportedError, SignerRequiredError, IndexerError, IncompleteHistoryError, IncompletePortfolioError, IndexerUnavailableError, AccountsIndexerUnavailableError, AccountFeedRestartRequiredError, AccountViewError, IndexerWaitTimeoutError, RpcError, TransactionOutcomeUnknownError, ContractRevertError, CollateralOnWrongChainError, BridgeLiquidityError, BridgeDeliveryTimeoutError, } from "./errors.js";
// ---- the exchange API (the SDK's primary surface) ----
export { SomniaMarkets, } from "./unified/exchange.js";
// Chain-qualified references — pure types + guards. A market id, pool or order
// id is unique only on its chain, so a multi-chain exchange accepts these
// wherever it accepts a bare id.
export { isChainMarketRef, isChainOrderRef, chainMarketRef, chainOrderRef, } from "./chainRef.js";
export { TIMEFRAMES, } from "./unified/structs.js";
export { DEFAULT_FEES, DEFAULT_INDEXER_LIMITS, nextBackoffDelayMs, SOMNIA_MAINNET_PRICE_FEED, SOMNIA_TESTNET_PRICE_FEED, } from "./config.js";
// Per-chain protocol addresses baked in from the deployment manifests at
// release time (generated — see scripts/gen-addresses.mjs).
export { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SOMNIA_MAINNET_ADDRESSES, SOMNIA_TESTNET_ADDRESSES } from "./addresses.js";
export { consoleDebugSink, debugCollector } from "./debug.js";
export { PRICE_FEED_DECIMALS, PRICE_RESOLUTION_SECONDS, } from "./priceFeed/types.js";
// ---- market + read types (returned by client methods) ----
// CLIENT-SCOPED RULE: anything that uses a connection (indexer reads, chain
// reads, writes) is reachable ONLY as a member of the client facade
// (`exchange.client.<name>(…)`) — never as a root free function. The barrel
// exports the TYPES those members take/return, plus pure kernels/constants/ABIs.
export { byNewestFirst, } from "./activity.js";
export { CANDLE_INTERVALS } from "./candles.js";
// ---- query-key factories (cache identity for the client's one-shot reads) ----
// Plain functions, no query-library import — exported from the root (not
// `/react`) because a non-React caller invalidating a cache wants them too.
export { QUERY_KEY_SCOPE, marketsKey, portfolioKey, candlesKey, marketActivityKey, tradeContextKey, transactionActivityKey, blockActivityKey, marketFeesKey, operatorsKey, marketCreatorsKey, oracleAdaptersKey, syncStatusKey, maxVenueFeeBpsKey, marketOnchainKey, } from "./queryKeys.js";
export { isBinaryMarket, isSpotMarket, isPerpMarket, } from "./markets.js";
export { OPEN_ORDERS_ONCHAIN_MAX_POOLS, } from "./orders.js";
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
export { binaryPoolWriteAbi, spotPoolWriteAbi, perpPoolWriteAbi, erc20WriteAbi, erc20VaultWriteAbi, orderBookBatchWriteAbi, marginBankWriteAbi, spotStopRegistryWriteAbi, spotStopRegistryEventsAbi, operatorRegistryWriteAbi, } from "./tradeAbi.js";
// `UnsignedCall` itself is exported below, beside the other build-verb shapes.
export { ORDER_KIND } from "./writer.js";
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
export { binaryPoolEventsAbi, binaryMarketEventsAbi, binaryModuleEventsAbi, binarySettlementEventsAbi, marketCreatorEventsAbi, } from "./eventsAbi.js";
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
export { decodeRevert } from "./revert.js";
// ---- funding-rate normalization ----
//
// A perp funding rate is a per-CALCULATION-WINDOW fraction (28800s / 8h on every live
// pool), NOT a per-interval or annual one, and each settlement interval accrues
// `rate / n` where `n = fundingWindowSec / fundingIntervalSec` — 8 on every live pool
// (28800 / 3600). It has been 96 at a 300s cadence, and the same rate value means a 12x
// different per-interval accrual across that boundary, so every row carries its own
// window and interval. These helpers are the only place that arithmetic lives; hardcoding
// the denominator produces a plausible-looking wrong chart rather than an error.
export { FUNDING_PRECISION, EIGHT_HOURS_SEC, ONE_HOUR_SEC, ONE_YEAR_SEC, normalizeFundingRate, fundingRate8h, fundingRate1h, fundingRatePerInterval, annualizedFundingRate, intervalsPerWindow, realizedFundingPerBase, isFundingStale, densifyFundingBuckets, buildFundingRateSeries, } from "./funding.js";
export { NetworkTape, } from "./networkTape.js";
// ---- P1 derived reads (analytics) — pure kernels + their result types.
// The client wires these to the live store / indexer; the kernels are exported
// for callers that already hold the raw inputs (a book, candles, fills). ----
export { quoteBinaryOrderOverBook, quoteBinaryStakeOverBook, quoteBinarySellOverBook, slippageForCrossing, DEFAULT_SLIPPAGE_BPS, DEFAULT_SLIPPAGE_MIN_TICKS, marketStats24hFromCandles, pnlEventsFor, computePositionPnL, claimableFrom, estPayoutFor, midYesPrice, averageEntryPrice, outcomeMarkPrice, markOutcomePosition, positionMarkState, } from "./derivedReads.js";
// ---- write types (client.createTrader → Trader) ----
export { ORDER_TYPE, 
// ---- amend + batch order writes (one tx; N orders for the batch verbs) ----
SELF_MATCHING_OPTION, } from "./trade.js";
// ---- operator/venue reads + admin writes (MarketsCore control plane) ----
// Reads are indexer-backed (IndexedOperator/IndexedVenue live in ./operatorAdmin,
// exported below); these chain helpers back only the venue fee-param forms.
export { MARKET_TYPE_BINARY_V1, decodeBinaryVenueFeeParams, } from "./operatorReads.js";
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
export { QUESTION_SOURCE_TYPE, ANSWER_TYPE, } from "./oracleHub.js";
// ---- MarketTypePlugin registry — the modularity seam for future order-book
// products (fee-param codec + machinery step descriptor keyed by bytes4
// marketType). Binary is the only registered type today. ----
export { MARKET_TYPE_PLUGINS, getMarketTypePlugin, listMarketTypePlugins, binaryMarketTypePlugin, } from "./marketTypes/index.js";
// ---- preflight validators — pure {ok, blockers, warnings} functions for each
// machinery wizard step (operator/venue/hub/create-quote/creator/series/roll +
// chain). Oracle v2 §8e: preflightAdapter → preflightHub (protocol-side) +
// preflightCreateQuote (user-side balance ≥ scheduling-cost + resolveReserve check). ----
export { preflightOperator, preflightVenue, preflightHub, preflightCreateQuote, preflightMarketCreator, preflightSeries, preflightRoll, preflightChain, isLocalPrecompileUnavailable, HUB_MIN_FREE_BALANCE_WEI, MIN_SERIES_INTERVAL_SEC, ZERO_ADDRESS, } from "./preflight.js";
// ---- pure helpers + live-tail types (no client needed) ----
// BREAKING (0.13.0): `kindOf(isBid, userData)` is GONE — v2 stopped encoding the
// YES/NO side in userData (now opaque MM bookkeeping). The side comes from the
// pool's `BinaryOrderPlaced(orderId, kind)` event; map it with `sideOfKind`.
export { DECIMALS, fillKind, ORDER_KIND_SIDE, sideOfKind, } from "./store.js";
// ERC-6909 outcome-id encoding helpers (settlement-extraction v2) — the single
// source of truth for `id = (pool << 72) | (nonce << 8) | idx` and the
// settlement `marketKey = id >> 8`. See ids.ts for the full scheme.
export { outcomeId, decodeOutcomeId, marketKey } from "./ids.js";
export { toHuman, toHumanString, fromHuman, priceToProbability, probabilityToPrice, computeBinaryPnl, binaryFillsFor, binaryFillsFromPortfolio, markYesPrice, balanceFloor, floorRawBalance, ceilRawAmount, snapRawToGrid, roundPriceToTick, upProbability, upPercent, } from "./units.js";
export { estimateMarketOrder, fillsWithinSlippage, bookMidPrice, } from "./unified/quotes.js";
export { computePortfolioAnalytics, 
// Pure: drops the bridge legs between an exchange's own chains from a funding
// list before the capital-base fold sees them.
netInternalTransfers, DEFAULT_CEX_RATE_BPS, } from "./unified/portfolioAnalytics.js";
// Series-cadence helpers — the SDK-canonical `intervalSec → "15m"/"1h"/"4h"`
// mapping. Markets/trade-history rows already serve a stamped `interval` label,
// so most callers never need these; exported for consumers that hold raw
// seconds (a series-config form, a bot) or want to re-derive/snap themselves.
export { resolveIntervalSec, snapIntervalSec, snapToCadence, cadenceBandSec, formatIntervalLabel, marketIntervalLabel, CADENCE_LADDER_SEC, CADENCE_TOLERANCE_SEC, } from "./interval.js";
export { lendRayRateToApy, rayMul, accrueLinear, accrueCompounded, RAY } from "./lend/math.js";
export { lendPoolAbi, lendUiPoolDataProviderAbi, lendGatewayAbi, lendDebtTokenAbi } from "./lend/lendAbi.js";
export { SOMNIA_MAINNET_LEND, SOMNIA_TESTNET_LEND } from "./lend/client.js";
export { CANCEL_ORDER_FOR_SELECTOR, PLACE_ORDER_FOR_SELECTOR, } from "./spot/operatorGrants.js";
export { NATIVE_TOKEN_SENTINEL } from "./vault/funding.js";
export { MARGIN_STATUS, 
// Margin math, not margin reads: pure, sync, no `Writer` and no client, so not
// client-scoped. Their input and output types are already exported above.
perpLiquidationPrice, perpOrderMarginQuote, perpPositionAnalytics, } from "./perp/margin.js";
// ---- one side of one perp market's ADL queue: `client.perpAdlQueue` ----
export { PERP_ADL_QUEUE_MAX_HOLDERS, } from "./perp/adl.js";
export { PERP_STOP_DROP_REASON, decodePerpStopOrderIds, } from "./perp/stops.js";
// The boundary normalizers the built-ins use, for a custom executor that wants
// the same error contract: pure functions over a caught value.
export { asExecuteError, asSignTypedDataError } from "./executor/boundary.js";
export { assertCallsOnChain } from "./executor/guard.js";
export { accountViewFailureReason } from "./accountView/failure.js";
export { ACCOUNT_BALANCES_MAX, } from "./accountView/balancesClient.js";
export { NATIVE_BALANCE_TOKEN, } from "./accountView/balancesTypes.js";
export { accountOrderRowWireSchema, accountOrdersCapabilityWireSchema, accountOrdersGuardWireSchema, accountStopRowWireSchema, } from "./accountView/schemas.js";
// The one pure helper a scan-rendering UI needs beside the result: the honest
// coverage sentence ("none in the first N", never "none").
export { describeCoverage } from "@somnia-chain/accounts-sdk";
export { decodePlaceOrder, decodeAmendOrder, decodeAmendOrders, } from "./decode/orders.js";
export { isSomniaMarketsAccount } from "./account.js";
export { perpMarkForPnl, } from "./perp/state.js";
export { PERP_POOL_FACTORY_MARKET_STATUS_INTERFACE_ID } from "./perp/registry.js";
export { LIQUIDATION_KIND, isLiquidationKind, PERP_ORDER_REJECTION_REASON, } from "./perp/history.js";
export { binaryResolutionMode, boundaryPrice, } from "./markets.js";
export { InvariantError } from "./raise.js";
