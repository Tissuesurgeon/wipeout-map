import * as Errors from "./errors.js";
import type { PublicClient } from "viem";
import type { SomniaMarketsSocketFailure } from "./config.js";
import type { SomniaMarketsClient } from "./somniaMarketsClient.js";
import { IndexerError, InvalidInputError, NotConfiguredError } from "./errors.js";
import type * as IndexerRead from "./indexerRead.js";
import type { IndependentHead } from "./syncStatus.js";
/** Supported main-indexer operations. Price/oracle-service reads have no main-indexer watermark. */
export type ObservedReadOperation = "quoteBinaryStake" | "quoteBinarySell" | "getMarketStats24h" | "getBinaryPositionPnL" | "getOpenPositionsWithPnL" | "getClaimable" | "getClaimablePage" | "listMarkets" | "listRegistryMarkets" | "listRegistryMarketsChecked" | "countMarkets" | "countMarketsBounded" | "getMarket" | "listBinaryMarkets" | "listLiveBinaryMarkets" | "listBinaryVenueIds" | "listBinaryAssets" | "countBinaryMarkets" | "countBinaryMarketsBounded" | "listPastBinaryMarkets" | "getBinaryMarket" | "getBinaryMarketByAddress" | "getMarketFees" | "listSpotMarkets" | "getSpotMarket" | "getMarketStatusHistory" | "listPerpMarkets" | "getPerpMarket" | "getCandles" | "getMarketActivity" | "getTransactionActivity" | "getBlockActivity" | "getLatestActiveBlock" | "getAdjacentActiveBlocks" | "getFills" | "getTradeContext" | "getUserFills" | "getUserFillsPage" | "getFillsPage" | "getLatestFillBlock" | "getFill" | "getOrderFills" | "getOrder" | "getOpenOrders" | "getOrders" | "listSweepableOrders" | "getOutcomeBalances" | "getPortfolio" | "getSpotPortfolio" | "getSpotStopOrders" | "getPerpPortfolio" | "listPerpStopOrders" | "listPerpOrderHistory" | "getMarketByPool" | "listMarketsByPool" | "countOrders" | "countUserFills" | "getRouterActions" | "getMarketResolution" | "listMarketResolutionEvents" | "listMarketReferenceLinks" | "getOpeningPrices" | "getResolutionPrices" | "getBookTops" | "listProtocolFees" | "listBuilderFees" | "listSettlementFees" | "listBuilderApprovals" | "getVaultPayoutFallbacks" | "listVaultPayoutFallbacks" | "getFundingPayments" | "getMarginEvents" | "listLiquidations" | "getLiquidations" | "getFundingRateHistory" | "listFundingRateHistory" | "listFundingRateCandles" | "getOpenInterestHistory" | "listPerpFees" | "listPerpOrderRejections" | "listPerpPositionChanges" | "listPerpPositionChangesForFills" | "listPerpPositions" | "listPerpInsuranceFundEvents" | "listPerpWalletLinkEvents" | "listPerpMarginPulls" | "listPerpMainFundingEvents" | "listPoolBindings" | "getPool" | "listOperators" | "countOperators" | "getOperator" | "listVenues" | "countVenues" | "getVenue" | "listMarketCreators" | "getMarketCreator" | "listOracleAdapters" | "getOracleAdapter" | "listSeries" | "listSeriesLatestMarkets" | "getSeries" | "getOracleQuestion" | "listOracleQuestions" | "getOperatorHubAccount" | "listOperatorHubAccounts" | "listOracleBinds" | "listOracleCallbacks";
/** Domain method contracts supported by observed read requests. These retain the owner client's argument and data types. */
export type ObservedReadMethods = Pick<SomniaMarketsClient, ObservedReadOperation>;
/** Arguments retain each existing domain method's parameter contract. */
export type ObservedReadRequest<K extends ObservedReadOperation = ObservedReadOperation> = {
    [P in K]: {
        readonly operation: P;
        readonly args: Parameters<ObservedReadMethods[P]>;
    };
}[K];
/** Response-associated indexing watermark. This does not claim an entity changed at that block. */
export interface IndexerObservation {
    /** Configured owner chain. */
    readonly chainId: number;
    /** Conservative minimum across successful data-bearing requests; null if any metadata is missing. */
    readonly latestProcessedBlock: bigint | null;
    /** First contributing request start, in Unix milliseconds. Null for a result requiring no request. */
    readonly startedAt: number | null;
    /** Last contributing response completion, in Unix milliseconds. */
    readonly completedAt: number | null;
    /** Successful data-bearing response count; rejected aggregate attempts do not count. */
    readonly responseCount: number;
    /** Shared comparison observation, not an atomic historical snapshot. */
    readonly independentHead: IndependentHead;
}
/** Data keeps its legacy shape inside an immutable observation envelope. */
export interface ObservedReadResult<T> {
    readonly data: T;
    readonly observation: IndexerObservation;
}
/** Failures of observed reads, including mixed-tier domain methods and their validation. */
export type ObservedReadsReadError = SomniaMarketsSocketFailure | Errors.IncompletePortfolioError | Errors.PerpPositionChangesUnavailableError;
/** A batch rejects on the first failed member; no partial success is fabricated. */
export type ObservedReadsBatchError = ObservedReadsReadError;
/** Creating the capability observes the owner's head once. */
export type SomniaMarketsClientCreateObservedReadsError = SomniaMarketsSocketFailure;
/** Independent sync reads can reject validation, configuration or either service. */
export type SomniaMarketsClientGetIndexerFreshnessError = SomniaMarketsSocketFailure;
/** Metadata-only reads need no chain transport. */
export type SomniaMarketsClientGetSyncStatusError = IndexerError | InvalidInputError | NotConfiguredError;
/**
 * Owner-derived observations sharing one independent head. Create a new capability to refresh that head.
 * Each read captures its own response metadata. Concurrent reads cannot replace older observations.
 * Owner/caller cancellation retains its abort reason. The capability has no polling or separate transport.
 */
export interface ObservedReads {
    /** The independently measured head shared by these reads. */
    readonly independentHead: IndependentHead;
    /**
     * Run one supported domain read with metadata from the same response.
     * @throws {IncompletePortfolioError} getClaimable observes more positions than its bounded complete-read budget.
     * @throws {IndexerError} Indexer request or decoding failed.
     * @throws {InvalidInputError} Domain arguments or cursor are invalid.
     * @throws {NotConfiguredError} A mixed-tier domain read needs missing chain configuration.
     * @throws {RpcError} A mixed-tier chain read failed.
     * @throws {ContractRevertError} A mixed-tier contract read reverted.
     * @throws {FillHistoryUnavailableError} A fill-page read needs a compatible reindexed producer.
     * @throws {PerpPositionChangesUnavailableError} A fill-pairing read needs an indexer that serves perp position changes.
     * @throws {FillHistoryRestartRequiredError} A fill-page cursor belongs to another serving dataset or lacks a generation.
     * @throws {InvariantError} A domain invariant failed.
     * @throws {InvalidInputError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {IndexerError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {RpcError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {InvariantError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     */
    read<K extends ObservedReadOperation>(request: ObservedReadRequest<K>): Promise<ObservedReadResult<Awaited<ReturnType<ObservedReadMethods[K]>>>>;
    /**
     * Run several reads concurrently, sharing the head but not a database transaction.
     * Result order matches request order. Each result keeps its own watermark and span.
     * @throws {IncompletePortfolioError} A getClaimable member observes an incomplete bounded portfolio.
     * @throws {IndexerError} A member's indexer request failed.
     * @throws {InvalidInputError} A member's arguments are invalid.
     * @throws {NotConfiguredError} A member needs missing chain configuration.
     * @throws {RpcError} A member's chain read failed.
     * @throws {ContractRevertError} A member's contract read reverted.
     * @throws {FillHistoryUnavailableError} A fill-page member needs a compatible reindexed producer.
     * @throws {PerpPositionChangesUnavailableError} A fill-pairing member needs an indexer that serves perp position changes.
     * @throws {FillHistoryRestartRequiredError} A fill-page member requires a page-one restart.
     * @throws {InvariantError} A domain invariant failed.
     * @throws {InvalidInputError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {IndexerError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {RpcError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     * @throws {InvariantError} A mixed-tier member's supplied RPC constructor or socket throws this SDK error. Its identity is retained.
     */
    batch<const R extends readonly ObservedReadRequest[]>(requests: R): Promise<{
        readonly [P in keyof R]: ObservedReadResult<Awaited<ReturnType<ObservedReadMethods[R[P]["operation"]]>>>;
    }>;
}
/** Internal owner-derived capability factory; never exported at the package root. */
export declare function createObservedReads(owner: IndexerRead.RequestContext, bind: (context: IndexerRead.RequestContext) => ObservedReadMethods, getClient: () => PublicClient): Promise<ObservedReads>;
