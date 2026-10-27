import type { ObservedReads } from "./observedReads.js";
import type { IndexerFreshness } from "./syncStatus.js";
// The public client surface. This module is TYPES ONLY — the fully documented
// SomniaMarketsClient interface, factored out of createClient.ts so the contract can
// be read (and reviewed, and doc-generated) without the wiring. createClient.ts
// returns an implementation of this interface.
//
// Documentation conventions used below:
//   · "live store"  — this client's in-memory MaterializerStore, kept current by
//     the live tail. Reads are SYNCHRONOUS, cost zero round-trips, and are
//     current to the last block the tail delivered.
//   · "indexer"     — the Envio/Hasura GraphQL endpoint (config.indexerUrl).
//     Reads are one HTTP round-trip, lag the chain by indexer latency
//     (~hundreds of ms), and THROW on request failure — an empty result always
//     means "no rows", never "request failed".
//   · "chain"       — a viem eth_call over this client's WebSocket. One
//     round-trip, current to head.

import type { Address, Hex, PublicClient } from "viem";
import type {
  IncompletePortfolioError,
  FillHistoryRestartRequiredError,
  FillHistoryUnavailableError,
  IndexerError,
  IndexerUnavailableError,
  InvalidInputError,
  NotConfiguredError,
  PerpPositionChangesUnavailableError,
  SignerRequiredError,
} from "./errors.js";
import type { AccountEquity, AccountEquityEntry, GetAccountEquityParams } from "./accountEquity.js";
import type { ClientConfig, SomniaMarketsSocketFailure } from "./config.js";
import type { NetworkTape, NetworkTapeOptions } from "./networkTape.js";
import type {
  ListLiveFundingPaymentsOptions,
  ListLiveLiquidationsOptions,
  SeedOptions,
  WatchHandle,
  WatchPerpMarketsOptions,
  WatchStatus,
} from "./liveTail.js";
import type {
  MarketResolutionEvent,
  MarketReferenceLink,
  OracleAnswer,
  ListMarketResolutionEventsOptions,
  ListMarketReferenceLinksOptions,
} from "./binary/settlement.js";
import type { PerpPortfolio, PerpOrderHistoryRow, TerminalOrderStatus } from "./perp/portfolio.js";
import type {
  FundingPayment,
  MarginEvent,
  GetMarginEventsOptions,
  ListLiquidationsOptions,
  LiquidationEvent,
  FundingRateUpdate,
  FundingRateCandle,
  OpenInterestSnapshot,
  PerpFeeRecord,
  PerpOrderRejection,
  ListPerpPositionChangesOptions,
  PerpPositionChange,
} from "./perp/history.js";
import type { SpotPortfolio } from "./spot/portfolio.js";
import type { SpotStopOrder, StopOrderStatus } from "./spot/stops.js";
import type { PerpStopOrder, PerpStopOrderOnChain, PerpStopOrderRead, PerpStopOrderRef } from "./perp/stops.js";
import type { GetManualVaultModeParams } from "./spot/vaultMode.js";
import type {
  AutoPullRequirement,
  GetAutoPullRequirementParams,
  IsOperatorAuthorizedParams,
  LockedBalance,
  LockedTokenBreakdown,
} from "./spot/poolReads.js";
import type { IsApprovedForPoolParams, IsGloballyApprovedParams } from "./spot/operatorGrants.js";
import type {
  GetOutcomeBalanceParams,
  GetVaultBalanceParams,
  ListVaultPayoutFallbacksOptions,
  OpenPositionPnL,
  OutcomeBalances,
  Portfolio,
  PortfolioOptions,
  GetClaimablePageOptions,
  ClaimablePage,
  VaultPayoutFallback,
} from "./binary/portfolio.js";
import type {
  ProtocolFeeRecord,
  BuilderFeeRecord,
  SettlementFeeRecord,
  BuilderApproval,
  BuilderApprovalRef,
} from "./fees.js";
import type {
  BinaryBookParams,
  GetBinaryOrderBookOptions,
  GetSpotOrderBookOptions,
  GetOrderOnchainOptions,
  ClosingPriceState,
  OnchainOrder,
  OpenOrder,
  OrderDetail,
  OrderRow,
  OrdersOptions,
  BookTop,
  BookTopsOnchain,
  GetBookTopsOnchainOptions,
  GetOwnOpenOrdersOnchainOptions,
  GetOpenOrdersOnchainOptions,
  OpenOrdersOnchain,
  SweepableOrder,
} from "./orders.js";
import type {
  BinaryMarket,
  BinaryMarketCountOptions,
  ListBinaryMarketsOptions,
  LiveBinaryMarketsFilter,
  Market,
  MarketStatusUpdate,
  MarketFees,
  MarketType,
  PastBinaryMarketsOptions,
  PerpMarket,
  PerpMarketFilter,
  RegistrySweep,
  SpotMarket,
  SpotMarketFilter,
} from "./markets.js";
import type { IndexedBlockWait, IndexerSyncStatus, WaitForIndexedBlockOptions } from "./syncStatus.js";
import type { CountResult } from "./indexerRead.js";
import type { RouterActionRecord, RouterActionsOptions } from "./router.js";
import type { PoolBindingRecord, IndexedPool, ListPoolBindingsOptions } from "./pools.js";
import type { Candle, GetCandlesOptions } from "./candles.js";
import type {
  MarketActivity,
  MarketActivityOptions,
  TransactionActivity,
  TransactionActivityOptions,
  BlockActivity,
  BlockActivityOptions,
} from "./activity.js";
import type {
  FillDetail,
  FillRow,
  GetFillsOptions,
  FillsPage,
  FillsPageOptions,
  FillsScope,
  GetUserFillHistoryOptions,
  GetUserFillsPageOptions,
  LatestFillBlock,
  UserFillHistoryRead,
  UserFillsPage,
  OrderFillRow,
  TradeContext,
} from "./fills.js";
import type {
  MarketOnchain,
  OnchainResolutionPrice,
  ContractMeta,
  PoolMarketBinding,
  GetPoolMarketBindingOptions,
} from "./markets.js";
import type {
  IndexedPerpPosition,
  PerpFundingPremium,
  PerpPosition,
  PerpPositionRef,
  PerpStateOnchain,
  PerpFeedStatus,
} from "./perp/state.js";
import type {
  MarginAccount,
  AccountHealth,
  PerpRiskParams,
  PerpHealthSnapshot,
  PerpOrderMarginPreview,
  PerpClosePreview,
  PerpLeverage,
  PerpLiquidationPreview,
  PerpMaxOrderSize,
  PerpPositionAnalytics,
  PerpSideHolders,
  PerpSideHoldersRef,
  GetPerpSideHoldersOptions,
  GetBankruptcyPriceOptions,
  GetPerpMaxLeverageOptions,
} from "./perp/margin.js";
import type { PerpPoolStatus } from "./perp/registry.js";
import type {
  PerpFundingPayer,
  PerpMainFunding,
  PerpMainFundingEvent,
  PerpMarginPull,
  PerpWalletLinkage,
  PerpWalletLinkEvent,
} from "./perp/linkedWallet.js";
import type { PerpVoucher, PerpVoucherCampaign, PerpVoucherEligibility } from "./perp/voucher.js";
import type {
  PerpSystemConfig,
  InsuranceFundState,
  LiquidationEngineConfig,
  PerpInsuranceFundEvent,
} from "./perp/system.js";
import type { BalanceQuery, Erc20Metadata } from "./balances.js";
import type { BinaryOrderBook, SpotOrderBook } from "./orders.js";
import type {
  BinarySide,
  LiveFill,
  LiveFundingUpdate,
  LiveMarket,
  LiveOrder,
  PoolSeedStatus,
  TailStatus,
} from "./store.js";
import type {
  BinaryOrderQuote,
  BinaryStakeQuote,
  BinarySellQuote,
  BinaryBuySide,
  BinarySellSide,
  MarketStats24h,
  BinaryPositionPnL,
  ClaimablePosition,
} from "./derivedReads.js";
import type { SystemInfo, TransactionSummary } from "./system.js";
import type { Trader, TraderConfig } from "./trade.js";
import type { Executor } from "./executor/types.js";
import type { ExecutorSpec } from "./executor/create.js";
import type { OperatorAdmin, OperatorAdminConfig } from "./operatorAdmin.js";
import type { OracleHubAdmin, OracleHubAdminConfig, QuestionDefinitionInput } from "./oracleHub.js";
import type { GovernanceAdmin, GovernanceAdminConfig } from "./governanceAdmin.js";
import type { MarketCreatorAdmin, MarketCreatorAdminConfig } from "./marketCreatorAdmin.js";
import type { SomniaLendClient } from "./lend/client.js";
import type { SmartAccountsClient } from "./smartAccounts.js";
import type { AccountOrdersClient } from "./accountView/client.js";
import type { AccountPositionsClient } from "./accountView/positionsClient.js";
import type { AccountSpotOrdersClient } from "./accountView/spotOrdersClient.js";
import type { AccountBalancesClient } from "./accountView/balancesClient.js";
import type { PerpAdlQueueClient } from "./perp/adlClient.js";
import type { AccountOutcomePositionsClient } from "./accountView/outcomePositions.js";
import type { BinaryVenueParams } from "./operatorReads.js";
import type {
  IndexedMarketCreator,
  IndexedOracleAdapter,
  IndexedSeries,
  ListSeriesLatestMarketsOptions,
  SeriesLatestMarket,
  MarketCreatorFilter,
} from "./marketCreatorAdmin.js";
import type { IndexedOperator, IndexedVenue, OperatorFilter } from "./operatorAdmin.js";
import type {
  OracleQuestionRecord,
  OperatorHubAccountRecord,
  OracleBindRecord,
  OracleCallbackRecord,
} from "./oracleHub.js";
import type { PriceWatchHandle, PriceWatchOptions } from "./priceFeed/priceFeed.js";
import type {
  LivePrice,
  PriceCandle,
  PriceCandleResolution,
  PriceFeedInfo,
  PriceFeedStatus,
  PriceFeedHealth,
  PricePoint,
} from "./priceFeed/types.js";

/** Failures from {@link SomniaMarketsClient.getBinaryPositionPnL}. */
export type SomniaMarketsClientGetBinaryPositionPnLError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getOpenPositionsWithPnL}. */
export type SomniaMarketsClientGetOpenPositionsWithPnLError = SomniaMarketsSocketFailure;

/**
 *  Failures from {@link SomniaMarketsClient.createTrader}: no usable signer in
 *  the config, a malformed private key, an executor bound to another chain, or
 *  no chain transport to send through.
 */
export type SomniaMarketsClientCreateTraderError = SignerRequiredError | InvalidInputError | NotConfiguredError;

/**
 *  Failures from {@link SomniaMarketsClient.createExecutor}: a spec that names no
 *  actor or more than one, a malformed private key or session seed, a wallet
 *  spec with no account to act as, a smart-account spec that the SDK refuses
 *  (its inner executor sends on another chain or is a node-side session
 *  executor, the accounts SDK has no deployment on the chain, or `through` has
 *  no way to sign), or no chain transport for a variant that sends through this
 *  client.
 */
export type SomniaMarketsClientCreateExecutorError = InvalidInputError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getClaimable}. */
export type SomniaMarketsClientGetClaimableError =
  | IncompletePortfolioError
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getClaimablePage}. */
export type SomniaMarketsClientGetClaimablePageError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getPortfolio}. */
export type SomniaMarketsClientGetPortfolioError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError;

/** Failures from bounded historical fill reads and cursor validation. */
export type SomniaMarketsClientGetUserFillsPageError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | FillHistoryUnavailableError
  | FillHistoryRestartRequiredError
  | NotConfiguredError;

/** Failures from keeping an account's fill history current. */
export type SomniaMarketsClientGetUserFillHistoryError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | FillHistoryUnavailableError
  | FillHistoryRestartRequiredError
  | NotConfiguredError;

/** Failures from the chain read for one known perp stop. */
export type SomniaMarketsClientGetPerpStopOrderError = SomniaMarketsSocketFailure;

/** Failures from the batched chain read for known perp stops. */
export type SomniaMarketsClientGetPerpStopOrdersError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getMarginEvents}. One indexed read, paged,
 *  with no chain call: the `kinds` filter is validated before the request, then only
 *  the indexer can fail. */
export type SomniaMarketsClientGetMarginEventsError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.listLiquidations}. One indexed read,
 *  no chain call and no input validation, so the indexer is the only thing that
 *  can fail. */
export type SomniaMarketsClientListLiquidationsError = IndexerError | IndexerUnavailableError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.listPerpPositionChanges}. One indexed read,
 *  paged, with no chain call: the caller's page bounds and time window are validated
 *  before the request, then only the indexer can fail. */
export type SomniaMarketsClientListPerpPositionChangesError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.listPerpPositionChangesForFills}. Indexed
 *  reads only, with no chain call: the account and the fill list are validated before
 *  the first request, then only the indexer can fail. */
export type SomniaMarketsClientListPerpPositionChangesForFillsError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError
  | PerpPositionChangesUnavailableError;

/** Failures from {@link SomniaMarketsClient.listVaultPayoutFallbacks}. One
 *  indexed read, paged, with no chain call: the indexer can fail, and so can
 *  the caller's own page bounds, which are validated before the request so an
 *  unbounded or rejected page cannot be blamed on the indexer. */
export type SomniaMarketsClientListVaultPayoutFallbacksError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError;

/** Failures from {@link SomniaMarketsClient.getLiquidations}, the deprecated
 *  alias — the same union, because it forwards verbatim.
 *
 *  @deprecated Use {@link SomniaMarketsClientListLiquidationsError}. */
export type SomniaMarketsClientGetLiquidationsError = SomniaMarketsClientListLiquidationsError;

/** Failures from {@link SomniaMarketsClient.listRegistryMarketsChecked}. One
 *  indexed read, paged, with no chain call and no input validation — so the
 *  indexer is the only thing that can fail. A row the SDK cannot parse is NOT a
 *  failure: it is counted in `dropped` and the read succeeds. */
export type SomniaMarketsClientListRegistryMarketsCheckedError =
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.listPoolBindings}. One indexed
 *  read, paged, with no chain call: the indexer can fail, and so can the
 *  caller's own page bounds, which are validated before the request. */
export type SomniaMarketsClientListPoolBindingsError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.listSeriesLatestMarkets}. One
 *  indexed read, paged, with no chain call: the indexer can fail, and so can
 *  the caller's own page bounds, which are validated before the request so an
 *  unbounded or rejected page cannot be blamed on the indexer. */
export type SomniaMarketsClientListSeriesLatestMarketsError =
  | InvalidInputError
  | IndexerError
  | IndexerUnavailableError
  | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getPerpFeedStatus}.
 *
 *  Three chain reads under one block pin, and no input validation, so the chain is
 *  most of it: transport (the pin included — it is normalized at the read boundary
 *  like the calls below it) or a revert from the pool. The INDEX leg is the
 *  exception that never reaches a caller: its revert is swallowed on purpose,
 *  because a dead oracle is what this read reports rather than fails on.
 *
 *  `NotConfiguredError` is reachable BEFORE any of that. `wsRpcUrl` is validly
 *  optional, and `createClient` defers the check to the first chain touch — which
 *  this read performs when it resolves the client for its block pin. A config with
 *  no WebSocket endpoint is supported right up until a chain read is attempted, so
 *  the union has to carry it. */
export type SomniaMarketsClientGetPerpFeedStatusError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.listAccountEquities}. The same as
 *  {@link SomniaMarketsClientGetAccountEquityError}; an unpriceable account is a
 *  result, not a failure. */
export type SomniaMarketsClientListAccountEquitiesError = SomniaMarketsClientGetAccountEquityError;

/** Failures from {@link SomniaMarketsClient.getAccountEquity}. The scope is checked
 *  first, then the chain reads can fail. */
export type SomniaMarketsClientGetAccountEquityError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getPerpVoucherCampaign}.
 *
 *  Chain reads only. `NotConfiguredError` comes from the deferred WebSocket check on
 *  the first chain touch, as for {@link SomniaMarketsClientGetPerpFeedStatusError}. A
 *  bank with no credit granter is NOT an error: the read returns `null`. */
export type SomniaMarketsClientGetPerpVoucherCampaignError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getPerpVoucherEligibility}.
 *
 *  Chain reads under one block pin. `NotConfiguredError` comes from the deferred
 *  WebSocket check on the first chain touch. `InvariantError` means the node returned a
 *  latest block with no number. An ineligible account is NOT an error: the read
 *  returns `eligible: false` with a reason. */
export type SomniaMarketsClientGetPerpVoucherEligibilityError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getPerpVoucher}.
 *
 *  Chain reads only. `NotConfiguredError` comes from the deferred WebSocket check on
 *  the first chain touch. A bank with no credit granter is NOT an error: the read
 *  returns `null`. */
export type SomniaMarketsClientGetPerpVoucherError = SomniaMarketsSocketFailure;

/**
 * Failures from the owner-scoped order reads {@link SomniaMarketsClient.getOpenOrders},
 * {@link SomniaMarketsClient.getOrders} and {@link SomniaMarketsClient.countOrders}: an
 * unusable option value, or a read that did not complete.
 */
export type SomniaMarketsClientGetOpenOrdersError = InvalidInputError | IndexerError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getOrders}. Same union as the open-order read. */
export type SomniaMarketsClientGetOrdersError = InvalidInputError | IndexerError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.countOrders}. Same union as the order list reads. */
export type SomniaMarketsClientCountOrdersError = InvalidInputError | IndexerError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getFills}: an unusable pool or option value, or a failed read. */
export type SomniaMarketsClientGetFillsError = InvalidInputError | IndexerError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getOrderFills}: an unusable pool or order id, or a failed read. */
export type SomniaMarketsClientGetOrderFillsError = InvalidInputError | IndexerError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getUserFills}: an unusable account or option value, or a failed read. */
export type SomniaMarketsClientGetUserFillsError = InvalidInputError | IndexerError | NotConfiguredError;

/**
 * Failures from {@link SomniaMarketsClient.getFillsPage}: an unusable bound,
 * kind, limit or cursor, or a read that did not complete or returned unusable
 * block positions.
 */
export type SomniaMarketsClientGetFillsPageError = InvalidInputError | IndexerError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.getLatestFillBlock}: an unusable market kind, or a failed read. */
export type SomniaMarketsClientGetLatestFillBlockError = InvalidInputError | IndexerError | NotConfiguredError;

/** Failures from {@link SomniaMarketsClient.countUserFills}: an unusable account or option value, or a failed read. */
export type SomniaMarketsClientCountUserFillsError = InvalidInputError | IndexerError | NotConfiguredError;

/**
 * Failures from {@link SomniaMarketsClient.waitForIndexedBlock}: an unusable
 * argument, a deadline that passed with the indexer still behind, a metadata
 * read that did not complete or named no row for the chain, an indexer that is
 * absent, misbound or past the RPC head, and a failed RPC head read.
 */
export type SomniaMarketsClientWaitForIndexedBlockError = SomniaMarketsSocketFailure;

/**
 *  Failures from {@link SomniaMarketsClient.watchPerpMarkets}.
 *
 *  One per stage of the hydration, and they call for different responses:
 *
 *  - {@link InvalidInputError} — `opts.marginBank` is not an address. Refused before any
 *    network work, so nothing was fetched and nothing subscribed.
 *  - {@link IndexerError} — the plane snapshot did not complete. Retry, or open the watch
 *    later; nothing has been subscribed.
 *  - {@link RpcError} — the `MarginBank.getSystemConfig()` wiring read, or the head read
 *    that bounds the seam backfill, did not complete. The LiquidationEngine is then
 *    unknown, and the watch is refused rather than opened over the bank alone, which
 *    would stream funding settlements and no liquidations — indistinguishable from a
 *    venue with none.
 *  - {@link ContractRevertError} — the resolved MarginBank REVERTED on `getSystemConfig()`.
 *    Reachable for either source of the address: a caller-supplied `opts.marginBank` that
 *    is not a MarginBank (or not one of this version), or an indexed bank whose deployment
 *    no longer answers the call. Distinct from {@link RpcError}, which is a transport
 *    failure on the same read.
 *  - {@link NotConfiguredError} — the client was built without `wsRpcUrl` or `indexerUrl`,
 *    so there is no socket to tail or no snapshot to hydrate from, or its indexer does not
 *    index the client's chain. A config fix, not a retry.
 *
 *  The reference is released on every one of them, so a failed call leaves no refcount
 *  behind and a retry hydrates from scratch.
 *
 *  Its sibling reads {@link SomniaMarketsClient.listLiveLiquidations} and
 *  {@link SomniaMarketsClient.listLiveFundingPayments} have NO union, which is
 *  SDK-ERR-002's "proven unable to fail" case rather than an omission: both are
 *  synchronous reads over rows the store already holds, with no transport and no
 *  decoding, returning empty for an unwatched plane.
 */
export type SomniaMarketsClientWatchPerpMarketsError = SomniaMarketsSocketFailure;

/**
 * Modeled failures of {@link SomniaMarketsClient.getCandles}, including default
 * caller cancellation. Custom caller abort reasons pass through verbatim and
 * can have any caller-chosen type.
 *
 * @category errors
 */
export type SomniaMarketsClientGetCandlesError =
  | InvalidInputError
  | NotConfiguredError
  | IndexerError
  | IndexerUnavailableError
  | DOMException;

/**
 * An SDK client — the single handle for all protocol I/O.
 *
 * This is the raw engine tier, reached through the exchange (`new
 * SomniaMarkets(config)` → `exchange.client`). Each exchange's engine is fully
 * isolated: its own config, live store, and (lazily opened) chain WebSocket,
 * so several can coexist in one process without sharing state.
 *
 * The read surface has three tiers — pick by freshness need:
 * 1. **Live store** (`getLive*`, synchronous): zero round-trips, updates the
 *    moment an event lands on-chain. Requires a watch ({@link watchMarket} /
 *    {@link watchMarkets}) covering the market you read.
 * 2. **Chain** (`getBinaryOrderBook`, `getMarketOnchain`, …): one `eth_call`
 *    round-trip, current to head. Works without any watch.
 * 3. **Indexer** (`listMarkets`, `getPortfolio`, …): history and aggregates;
 *    lags the chain slightly. Works without any watch or the socket.
 *
 * @category clients
 */
export interface SomniaMarketsClient {
  /** The config this client was built with. */
  readonly config: ClientConfig;

  /**
   *  This client's underlying viem client, undecorated — viem's own behaviour,
   *  over the socket this client already has.
   *
   *  **When to use**
   *
   *  Use to reach a contract or RPC method the SDK does not model: your own
   *  contracts, or plain calls like `getBalance` / `getCode` /
   *  `waitForTransactionReceipt`. Reads through it keep VIEM's error contract, so
   *  `e instanceof ContractFunctionRevertedError` and the rest of your existing
   *  viem error handling still work.
   *
   *  Building your own client instead would open a second WebSocket; this one
   *  shares the SDK's.
   *
   * **Details**
   *
   * - Returns: The undecorated viem `PublicClient` for this client's chain.
   *
   *  **Gotchas**
   *
   *  Reads through this client do NOT get the SDK's decoded protocol errors — a
   *  revert arrives as viem's error, not a {@link ContractRevertError} with an
   *  `errorName`. That is the point of the accessor, but it means you should
   *  prefer the SDK's own methods for protocol contracts, where the decoding is
   *  the value. The two clients are deliberately different: everything reachable
   *  from this interface uses the decoded one.
   *
   *  Calling this opens the WebSocket if it is not already open, and throws
   *  {@link NotConfiguredError} on a client built without `wsRpcUrl`.
   *
   *  The returned client belongs to this client's current connection. After
   *  `stopLive()` or the owner's `close()`, its requests reject with viem's
   *  `SocketClosedError`, and it never opens a socket again. Call
   *  `getViemClient()` again after `stopLive()` to get a working client.
   */
  getViemClient(): PublicClient;

  /**
   * The SomniaLend namespace — reads (`lend.listReserves()`, `lend.getAccount()`)
   * and the `lend.createLender()` write factory for the third-party Aave v3
   * money market on Somnia (mainnet + testnet). Lazily bound to
   * `config.addresses.lend` (set `SOMNIA_MAINNET_LEND` / `SOMNIA_TESTNET_LEND`
   * from the root entry); its
   * methods throw a clear error when those addresses are unset. The root entry
   * also publishes its types, deployment
   * constants, ray-math helpers and ABIs; this namespace is the only way to call
   * it, so a lend read always rides the client's own chain transport.
   */
  readonly lend: SomniaLendClient;
  /**
   *  The smart-accounts capability — the factory account model of
   *  `@somnia-chain/accounts-sdk` on this client's chain: derive and discover
   *  accounts, walk ownership, build creation / owner-management / transfer
   *  calls for an executor to send, and read holdings and health. Built
   *  lazily; reads ride this client's own chain transport. See
   *  {@link SmartAccountsClient}, and `createExecutor({ smartAccount, inner })`
   *  for sending AS an account.
   */
  readonly accounts: SmartAccountsClient;
  /**
   *  The account-view capability: one account's complete open orders and pending
   *  stops on this client's chain, read from the indexer's account view. Built
   *  lazily; its reads belong to the live-read lifecycle, so `stopLive()` ends a
   *  read in flight. See {@link AccountOrdersClient}.
   */
  readonly accountOrders: AccountOrdersClient;
  /**
   *  The perp positions capability: one account's open perp positions and cross-margin
   *  state on this client's chain, read from the chain at one block. Built lazily; its
   *  reads ride this client's own chain transport. See {@link AccountPositionsClient}.
   */
  readonly accountPositions: AccountPositionsClient;
  /**
   *  The balances capability: several accounts' wallet balances of the tokens you name,
   *  and of the native token, on this client's chain, read from the chain at one block.
   *  Built lazily; its reads ride this client's own chain transport. See
   *  {@link AccountBalancesClient}.
   */
  readonly accountBalances: AccountBalancesClient;
  /**
   *  The spot orders capability: one account's resting spot orders on this client's
   *  chain, read from the chain at one block, and followed live from the spot pools'
   *  order events. Built lazily; its reads ride this client's own chain transport. See
   *  {@link AccountSpotOrdersClient}.
   */
  readonly accountSpotOrders: AccountSpotOrdersClient;
  /**
   *  The ADL queue capability: one side of one perp market's auto-deleveraging queue on
   *  this client's chain, read from the chain at one block, and followed live from the
   *  market's MarginBank events. Built lazily; its reads ride this client's own chain
   *  transport. See {@link PerpAdlQueueClient}.
   */
  readonly perpAdlQueue: PerpAdlQueueClient;
  /**
   *  The outcome-positions capability: one account's complete YES/NO event-contract
   *  holdings on this client's chain, read from the indexer's account view. Built
   *  lazily; its reads belong to the live-read lifecycle, so `stopLive()` ends a read in
   *  flight. See {@link AccountOutcomePositionsClient}.
   */
  readonly accountOutcomePositions: AccountOutcomePositionsClient;

  // ------------------------------------------------------------------
  // Live watches — scoped, ref-counted local materialization
  // ------------------------------------------------------------------

  /**
   * Watch one market: hydrate a consistent snapshot of it (market row, recent
   * fills, its full resting order book) and stream its events — order-book
   * activity plus, for a binary market, its lifecycle/status events. While the
   * watch is active, every `getLive*` read for this pool is current to the
   * last block at zero round-trip cost.
   *
   * Watches are **ref-counted**: watching the same pool twice shares one
   * subscription and one snapshot; each handle's `stop()` releases one
   * reference, and the scope is torn down (subscription dropped, heavy rows
   * purged) shortly after the last release — a brief linger absorbs quick
   * re-watches (navigation, React remounts) without re-snapshotting.
   *
   * Resolves once the seam is sealed (snapshot + backfill + buffered replay) —
   * i.e. once reads are live. Rejects (and releases the reference) if
   * hydration fails; the socket dropping later is healed automatically by
   * reconnect + chain backfill.
   *
   * The React data hooks call this automatically while mounted.
   *
   * **Details**
   *
   * `opts` opts INTO a chain seed. Omit it and the watch seeds from the indexer
   * snapshot exactly as before, and `getLiveStatus().snapshotBlock` keeps its
   * existing meaning. Pass `{ seed: "chain", marketId }` and the book is drained
   * from the pool contract at one pinned block instead, so the watch starts with
   * the indexer unreachable. Supply the `marketId` the pool currently serves:
   * pools are recycled across markets and book reads filter on it.
   *
   * A chain seed also reads the market's row from the BinaryMarketsModule, so
   * `config.addresses.binaryModule` must be set — the row is what every later
   * order and fill event attributes through. It carries what the module answers
   * (collateral, decimals, nonce, lifecycle state); indexer-only fields such as
   * the question text, `strike`/`mode` and the creation history stay empty or
   * null and STAY that way — a seeded pool is never re-hydrated, and the row
   * outlives `stop()` until cold-market eviction drops it (see
   * {@link getLiveMarkets}). Read
   * the indexer directly ({@link getBinaryMarket}) when those fields are needed.
   * A chain seed covers exactly ONE pool. N pools means N calls, which is the
   * supported way to seed several: they share one tail and one subscription
   * set, and each pool keeps its own seed status. Read that with
   * {@link getSeedStatus}, NOT {@link getLiveStatus}, whose seed fields report
   * the most recent seed only and are overwritten by the next pool's. The
   * worst-case read cost is `2 × maxPages` contract reads per pool, 80 at the
   * defaults, plus one module read for the market row.
   *
   * A chain seed has no per-scope order cap, unlike the indexer snapshot, whose
   * budget is shared across the scope's pools and drops the OLDEST resting
   * orders first. `getSeedStatus(pool).seedTruncated` is `true` only if that
   * pool's drain hit its own page budget.
   *
   * **Gotchas**
   *
   * A chain seed loads NO fill history — the chain cannot answer fills from
   * before the seam. The tape loads on a detached lane, so `getLiveFills` may be
   * empty while the book is complete. Branch on
   * `getSeedStatus(pool).fillsLoaded`, not on the tape being empty: `false`
   * means never loaded, `true` with `[]` means genuinely no fills. The global
   * `getLiveStatus().fillsLoaded` turns true when ANY pool's lane lands, so it
   * cannot answer for one pool. A failed tape read sets `failure.operation` to
   * `"fill-history"` and does not reject this promise.
   *
   * Seeded orders carry an empty `createdAt`/`txHash`: placement history is
   * indexer-only and the seed does not invent it. `userOrders` sorts on
   * `createdAt`, so they sort last until a snapshot dates them.
   *
   * @throws {@link IndexerError} If the indexer snapshot fails (default seed only).
   * @throws {@link NotConfiguredError} If a chain seed is requested with no `addresses.binaryModule`, or the indexer does not index the client's chain.
   * @throws {@link InvalidInputError} If `opts.maxCount`/`opts.maxPages` is not a positive safe integer, or `opts.marketId` is not a bytes32 id.
   * @throws {@link ContractRevertError} If a chain-seed page read reverts.
   * @throws {@link RpcError} If a chain read or the subscription fails at the transport.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  watchMarket(pool: string, opts?: SeedOptions): Promise<WatchHandle>;

  /**
   * Watch every market whose book or lifecycle can still change — the
   * whole-protocol tail for list views and multi-market bots. Prefer {@link watchMarket} scoped to
   * what you actually trade or render: this variant's cost grows with the
   * protocol (snapshot size, subscription filter width, event volume).
   *
   * **Details**
   *
   * The watch selects markets by lifecycle, not by age. It hydrates every SPOT
   * and PERP market and every BINARY market that is not finalized, which
   * includes Locked, Settling, Resolved and Voided markets that still wait for
   * settlement events. A finalized BINARY market is left out: its status is
   * terminal, its book holds no live order, and its pool can serve a later
   * market. Its redemption ledger (`netBacking`) keeps moving on the settlement
   * contract, so read it with {@link getBinaryMarket}. {@link watchMarket}
   * applies no lifecycle filter, but it selects the market its pool serves
   * now: it hydrates a finalized market only until the pool is recycled.
   *
   * One snapshot hydrates at most 500 eligible markets, newest first, so that
   * the whole set shares one seam. When more eligible markets exist,
   * `getLiveStatus().allMarketsTruncated` is `true` while this watch is active,
   * and the oldest eligible markets are not watched. Watch those with
   * {@link watchMarket}.
   *
   * - `opts.discover`: Also watch the MarketCreator factory so markets created AFTER this call join the watch live, in their creation block (requires `config.addresses.marketCreator`). Off by default.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  watchMarkets(opts?: { discover?: boolean }): Promise<WatchHandle>;

  /**
   * Hydrate one account's order/fill **history** (one indexer fetch) so
   * {@link getLiveUserFills} / {@link getLiveUserOrders} have depth predating
   * your watches. This does not subscribe to anything by itself: live events
   * are attributed to every account automatically, but only within markets
   * covered by an active {@link watchMarket} / {@link watchMarkets} — an
   * account's activity in unwatched markets stays at snapshot state.
   * Ref-counted like market watches; supports multiple accounts at once.
   */
  watchUser(user: string): Promise<WatchHandle>;

  /**
   * Watch the perp **plane**: hydrate the recent liquidation waterfall legs and
   * per-account funding settlements, then stream both live — the same
   * snapshot-then-live guarantee {@link watchMarket} gives a book.
   *
   * ONE scope covers every perp market, and that is forced rather than chosen.
   * MarginBank and LiquidationEngine are singletons, so the log subscription is one
   * stream whatever the caller asks for — and the account-level waterfall legs
   * (`AccountLiquidated`, `ResidualBadDebt`, ...) carry no pool at all, so a per-pool
   * scope would either drop them or attach them to every pool. Filter at read time
   * with {@link listLiveLiquidations} / {@link listLiveFundingPayments} instead.
   *
   * Independent of {@link watchMarket}: watching a perp pool gives you its book,
   * funding RATE and open interest; this gives you liquidations and funding
   * SETTLEMENT. Neither implies the other, and a UI showing both wants both watches.
   *
   * Ref-counted and lingered like the other watches. Resolves once the seam is
   * sealed; a later socket drop is healed by reconnect and chain backfill, with no
   * second indexer touch.
   *
   * **Details**
   *
   * - `opts.marginBank`: The MarginBank to read the plane's wiring from. Normally UNNECESSARY — the address is taken from an indexed perp market row, and `MarginBank.getSystemConfig()` reports the LiquidationEngine from there. Pass it for the one case that cannot cover: an indexer with no perp rows at all, where there is nothing to ask. It is a FALLBACK, never an override: it is used when the indexer names no bank, including on a scope a read hook acquired moments earlier with no hint to give, and it is ignored when the indexer named one — the hydrated rows are that bank's plane, so streaming another one would splice two venues into one feed.
   *
   * @throws InvalidInputError when `opts.marginBank` is not an address.
   * @throws IndexerError when the plane snapshot fails.
   * @throws RpcError when the MarginBank wiring read or the seam's head read fails — the
   * liquidation half cannot be watched without the wiring, and watching the bank alone
   * would stream funding settlements and no liquidations, which reads as a venue with none.
   * @throws ContractRevertError when the resolved MarginBank — indexed, or supplied via
   * `opts.marginBank` — reverts on `getSystemConfig()`, i.e. it is not a MarginBank the
   * SDK can read.
   * @throws NotConfiguredError on a client built without `wsRpcUrl` or `indexerUrl`, or whose indexer does not index its chain.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  watchPerpMarkets(opts?: WatchPerpMarketsOptions): Promise<WatchHandle>;

  /**
   * Per-market watch state: `"unwatched"` (no active watch — `getLive*` reads
   * return empty for this pool, which is how you distinguish "empty book"
   * from "not watching"), `"hydrating"` (watch registered; snapshot, seam
   * backfill, or reconnect in progress), or `"live"`.
   */
  getWatchStatus(pool: string): WatchStatus;

  /**
   * Perp-plane watch state, in the same three values {@link getWatchStatus} uses —
   * so `"unwatched"` distinguishes "no liquidations happened" from "not watching".
   */
  getPerpPlaneStatus(): WatchStatus;

  /**
   *  Tear down every watch, subscription, timer, and socket this client opened
   *  (tests, shutdown), including the chain WebSocket — so a Node process that
   *  has touched the chain exits on its own afterwards. The store keeps its
   *  last state; `getLive*` and `listLive*` reads keep answering (stale), and a later chain
   *  read reopens a connection that the next `stopLive()` releases in turn.
   *  An indexer read already on the wire stays active, but one still QUEUED for
   *  an in-flight slot, or sleeping out a retry backoff, is rejected with
   *  {@link IndexerUnavailableError} (`reason: "live-reset"`), so nothing sends
   *  after the stop. The client stays usable. Existing observed-read
   *  capabilities are invalidated; create a new one before observing again.
   *
   *  Each client owns its own chain socket, even when several use the same
   *  `wsRpcUrl`, so stopping one never closes another's.
   * @throws {InvalidInputError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {NotConfiguredError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {NotSupportedError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {SignerRequiredError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {IndexerError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {IndexerUnavailableError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {IndexerWaitTimeoutError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {RpcError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {ContractRevertError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {FillHistoryUnavailableError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {IncompleteHistoryError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {CollateralOnWrongChainError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {BridgeLiquidityError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   * @throws {InvariantError} A supplied RPC socket throws this SDK error during retirement. Remaining owned cleanup is attempted before rejection.
   */
  stopLive(): void;

  /**
   * Fire `listener` after every batch of store changes — the "something
   * changed, re-read" signal (the React hooks subscribe to exactly this).
   * Re-read with any `getLive*` method; their results are memoized per store
   * version, so re-reading without a change returns the same reference.
   *
   * **Details**
   *
   * - Returns: An unsubscribe function.
   */
  subscribeLive(listener: () => void): () => void;

  /**
   *  The tail's global health: mode (`"init"` until the first watch hydrates,
   *  then `"tailing"`), the last seam block, the last locally-materialized
   *  block, the chain head, socket state, and the active watch count. For one
   *  market's state, use {@link getWatchStatus}.
   */
  getLiveStatus(): TailStatus;

  /**
   *  One watched pool's OWN seed status, or `null` when the pool is not
   *  hydrated.
   *
   *  **When to use**
   *
   *  Use it whenever more than one pool is watched. {@link getLiveStatus}
   *  reports `seedSource`, `seedBlock`, `seedTruncated` and `fillsLoaded` for
   *  the MOST RECENT seed only, so with several pools those values cannot be
   *  attributed to a pool: a later seed writes `seedTruncated: false` over an
   *  earlier `true`, and `fillsLoaded` turns true when any pool's lane lands.
   *
   *  **Gotchas**
   *
   *  `null` means this pool has no hydrated watch — never that its seed was
   *  complete. Check {@link getWatchStatus} to tell an unwatched pool from one
   *  still hydrating.
   *
   *  A released watch drops its entry, so a rewatched pool cannot read the
   *  previous watch's truncation or fill-lane result.
   *
   *  ```ts
   *  const seed = client.getSeedStatus(pool);
   *  if (seed && !seed.fillsLoaded) console.log("tape not loaded for", pool);
   *  ```
   */
  getSeedStatus(pool: string): PoolSeedStatus | null;

  /** True once at least one watch is live (`mode === "tailing"`). */
  isTailing(): boolean;

  /**
   *  Every market the store retains (spot + binary, as the discriminated
   *  {@link Market} union), from any watch, past or present. Synchronous,
   *  memoized.
   *
   *  The store always keeps a market that a pool is bound to or that a retained
   *  fill or order names. It keeps other markets (released or replaced) as
   *  metadata up to a fixed allowance of 500 rows and evicts the earliest-discovered
   *  ones after that. So the list does not grow with session age. An evicted
   *  market is also absent from {@link getLiveMarketByAddress}, and its late
   *  settlement events do not change the live store. Read it with
   *  {@link getMarket} or {@link getBinaryMarket}.
   */
  getLiveMarkets(): LiveMarket[];

  /** One market by its pool address (either kind), or null if unknown. */
  getLiveMarketByPool(pool: string): LiveMarket | null;

  /**
   *  One binary market by its BinaryMarket contract address, or null. (Spot
   *  markets have no market contract — they are identified by pool.)
   */
  getLiveMarketByAddress(marketAddress: string): BinaryMarket | null;

  /**
   * The most recent fills on one pool, newest first — the live trade tape.
   * Maker/taker owner + side are back-joined from the order map where known.
   *
   * **Details**
   *
   * - `opts.limit`: Max rows (default 40; the store retains ~400 per pool).
   */
  getLiveFills(pool: string, opts?: { limit?: number }): LiveFill[];

  /**
   * Funding settlements the live tail has seen for a perp pool, OLDEST FIRST.
   *
   * The tail's counterpart to {@link listFundingRateHistory}: splice these onto a
   * one-shot query to extend a funding chart past the snapshot block, instead of only
   * seeing the latest value on the market row. Deduped on (block, logIndex), so a reorg
   * replay overwrites rather than appending a phantom point.
   *
   * Carries less than an indexed row, deliberately: `intervalsAccrued` needs `n` from the
   * parameter-epoch series and the covered span needs the settlement anchor, neither of
   * which the tail has. Both arrive with the indexed row a moment later.
   *
   * **Details**
   *
   * - `opts.limit`: Max rows (default 500).
   */
  getLiveFundingUpdates(pool: string, opts?: { limit?: number }): LiveFundingUpdate[];

  /**
   * Liquidation waterfall legs the tail has seen, newest first — the live counterpart
   * to {@link getLiquidations}, and the SAME {@link LiquidationEvent} rows, so the two
   * merge without translation. The live window is hydrated from the newest indexed rows,
   * so it OVERLAPS the newest indexed page: merge by `id`, never by concatenation, or
   * legs and their amounts are counted twice.
   *
   * Requires an active {@link watchPerpMarkets}. Without one this returns empty, except
   * after {@link stopLive}, which keeps the store: the last rows stay readable but stale.
   * Check {@link getPerpPlaneStatus} rather than treating a non-empty result as current.
   *
   * One liquidation is SEVERAL rows sharing a `txHash` — stages of one waterfall, not
   * repetitions of one event. Read `kind` first, and read the field TSDoc on
   * {@link LiquidationEvent} before aggregating anything: only `insuranceCovered` and
   * `coverageDeclined` are flows, while `badDebt` and `deficit` are levels that
   * double-count when summed.
   *
   * **Details**
   *
   * - `opts.pool`: Restrict to one pool. This drops account-level legs, which carry no pool. Use `party` for every row involving one wallet.
   * - `opts.account`: Restrict to rows keyed on the liquidated account.
   * - `opts.counterparty`: Restrict to rows whose other side is this address.
   * - `opts.party`: Match either `account` or `counterparty`. Compare each row's `account` with the wallet before presenting its role; `size` and `price` describe the liquidated account's leg. See {@link LiquidationEvent} for each kind's fields.
   * - `opts.kind`: Restrict to one liquidation stage.
   * - `opts.kinds`: Keep any of these stages. An empty array adds no filter. If `kind` is also set, both apply.
   * - `opts.limit`: Max rows (default 50; the store retains ~1000 plane rows).
   */
  listLiveLiquidations(opts?: ListLiveLiquidationsOptions): LiquidationEvent[];

  /**
   * Per-account funding settlements the tail has seen, newest first — the live
   * counterpart to {@link getFundingPayments}, and the same {@link FundingPayment} rows.
   *
   * Requires an active {@link watchPerpMarkets}. After {@link stopLive} the last rows stay
   * readable but stale; check {@link getPerpPlaneStatus}. Distinct from
   * {@link getLiveFundingUpdates}, which is the per-pool RATE series: this is what each
   * account actually paid or received. `amount` is signed, and **positive is what the
   * account pays**.
   *
   * **Details**
   *
   * - `opts.pool`: Restrict to one pool.
   * - `opts.account`: Restrict to one account.
   * - `opts.limit`: Max rows (default 50; the store retains ~1000 plane rows).
   */
  listLiveFundingPayments(opts?: ListLiveFundingPaymentsOptions): FundingPayment[];

  /**
   * Fills `user` participated in (as maker or taker), newest first.
   *
   * **Details**
   *
   * - `pool`: Restrict to one pool, or null for all pools.
   * - `opts.limit`: Max rows (default 50).
   */
  getLiveUserFills(pool: string | null, user: string, opts?: { limit?: number }): LiveFill[];

  /**
   * `user`'s orders on one pool, newest first — every lifecycle state (open,
   * filled, cancelled, expired), so filter by `status === "Open"` for a
   * working-orders view. Keeps every unexpired open order, recent terminal
   * transitions, and terminal orders needed to attribute retained fills. An
   * `Open` order past its expiry at the latest chain head is history, not
   * liquidity: from that head it counts toward the terminal cap. Its status
   * stays `Open`, because on chain it holds its escrow until a cancel or a
   * sweep, and removal from the live store does not mean a refund. An active
   * {@link watchUser} keeps all of its user's expired open orders until the
   * watch is released. Older terminal
   * history is available from {@link getOrders}; terminal history remains bounded
   * even after a long watch. Accepted indexed `Closed` rows count toward the cap at
   * hydration. A live `Closed` row waits for a later block from its pool so a
   * delayed same-block `OrderRested` can promote it. An active {@link watchUser}
   * also retains its seeded orders until that watch is released. Rows retained
   * after a market watch ends remain account history, not book liquidity.
   *
   * **Details**
   *
   * - `opts.limit`: Max rows (default 100).
   */
  getLiveUserOrders(pool: string, user: string, opts?: { limit?: number }): LiveOrder[];

  /**
   * The locally-materialized resting book of a **binary** pool, 4-sided
   * (`yesBids`/`yesAsks` plus the NO sides derived as `1 − yesPrice`) — the
   * event-derived book with a per-scope applied-event watermark.
   * Heads alone do not advance `blockNumber`. Expiry uses the local wall clock.
   * Use the pinned chain read for an exact as-of snapshot.
   * Synchronous; safe to call every render (memoized per store version).
   *
   * **Details**
   *
   * - `opts.depth`: Price levels per side (default 10).
   */
  getLiveBinaryOrderBook(pool: string, opts?: { depth?: number }): BinaryOrderBook;

  /**
   * The locally-materialized resting book of a **binary** market, resolved by
   * its `marketId` rather than its pool address. Because a BinaryPool is
   * RECYCLED across markets (one pool serves successive markets, never
   * concurrently), a page keyed on a `marketId` must never render the pool's
   * NEXT market's orders once its own market has ended. This read resolves the
   * market's current pool and, if `marketId` is no longer the pool's current
   * binding (stale/ended), returns an EMPTY book — so a stale page renders
   * nothing rather than the successor market's liquidity. Prefer this over
   * {@link getLiveBinaryOrderBook} when you hold a `marketId` (not a live pool).
   *
   * **Details**
   *
   * - `opts.depth`: Price levels per side (default 10).
   */
  getLiveBinaryOrderBookByMarket(marketId: string, opts?: { depth?: number }): BinaryOrderBook;

  /**
   * The locally-materialized resting book of a **spot** pool (`bids`/`asks`,
   * best price first) — the zero-round-trip mirror of {@link getSpotOrderBook}.
   *
   * **Details**
   *
   * - `opts.depth`: Price levels per side (default 12).
   */
  getLiveSpotOrderBook(pool: string, opts?: { depth?: number }): SpotOrderBook;

  // ------------------------------------------------------------------
  // Derived reads — analytics the frontend needs, derived client-side from the
  // live book / candles / fills (no dedicated indexer field)
  // ------------------------------------------------------------------

  /**
   * Preview a MARKET order against the live binary book — "you'll pay ~$X,
   * average Y, slippage Z". Pure over the live store (synchronous); key it by
   * `pool` (a live pool) or `marketId` (recycle-safe — a stale market quotes
   * against an empty book). Crossing side: BUY_YES/BUY_NO consume the asks,
   * SELL_YES/SELL_NO the bids; NO prices are the YES book inverted
   * (`oneCollateral − yesPrice`). `cost` is raw collateral paid (buy) / received
   * (sell); `avgPrice` the volume-weighted fill price; `wouldRest` the unfilled
   * remainder that would rest as a maker order.
   *
   * **Details**
   *
   * - `params.quantity`: Order size in raw outcome-token units.
   * - `params.depth`: Book levels to walk per side (default 10).
   */
  quoteBinaryOrder(params: {
    pool?: string;
    marketId?: string;
    side: BinarySide;
    quantity: bigint;
    depth?: number;
  }): BinaryOrderQuote;

  /**
   * A BinaryPool's on-chain order-book grid (`tickSize`/`lotSize`/`minQuantity`)
   * — the increments the pool validates every order against. One `eth_call`,
   * cached per pool for the client's lifetime (the grid is admin-retunable but
   * never changes per-order). {@link quoteBinaryStake} and
   * {@link quoteBinarySell} read it through this cache.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getBinaryBookParams(pool: string): Promise<BinaryBookParams>;

  /**
   * A BinaryPool's captured closing price and close state — the snapshot a
   * `CLOB_SNAPSHOT` venue's void pays out against (`[p, D−p]` at the closing
   * YES price instead of the uniform half-refund). One `eth_call`.
   *
   * Resolves `null` when the pool predates the capture surface: the selector
   * doubles as the capability probe, mirroring how the module resolves a
   * market's void policy at creation. `state` is `"OPEN"` until
   * {@link Trader.captureClose} (or a normal resolution) has run.
   *
   * `null` is that capability answer and nothing else. A failed read throws:
   * `RpcError` on a transport failure, `ContractRevertError` on a revert that
   * names an error or a reason.
   *
   * @throws {@link RpcError} The chain read did not complete.
   * @throws {@link ContractRevertError} The pool declares `closingPrice()` and rejected the call.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getClosingPrice(pool: string): Promise<ClosingPriceState | null>;

  /**
   * Size a stake-denominated market BUY against the live binary book — "bet
   * $50 on Up" → the shares, protective limit, and escrow the order will
   * actually use. The inverse of {@link quoteBinaryOrder}: that prices a
   * quantity; this sizes a quantity from a collateral budget, walking the asks
   * cheapest-first while the escrow at the worst level touched stays within
   * the stake. The protective limit is padded with a slippage cushion (so the
   * IOC still crosses a moving book), tick-aligned, and the quantity re-fit
   * and lot-aligned so the escrow never exceeds the stake.
   *
   * Live store + one cached chain read ({@link getBinaryBookParams}); needs an
   * active watch for the book. The result feeds straight into
   * `trader.placeOrder({ pool, side, price: yesPrice, quantity, orderType: ORDER_TYPE.MARKET })`.
   * Resolves `null` when nothing is fillable (empty book, or a stake too small
   * to buy a single lot).
   *
   * **Details**
   *
   * - `params.side`: "BUY_YES" (Up) or "BUY_NO" (Down).
   * - `params.stake`: Collateral budget in raw units — the max loss.
   * - `params.depth`: Book levels to sweep (default 10).
   * - `params.slippageBps`: Protective-limit cushion in bps (default 300 = 3%).
   * - `params.slippageMinTicks`: Minimum cushion in ticks (default 10).
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  quoteBinaryStake(params: {
    pool?: string;
    marketId?: string;
    side: BinaryBuySide;
    stake: bigint;
    depth?: number;
    slippageBps?: bigint;
    slippageMinTicks?: bigint;
  }): Promise<BinaryStakeQuote | null>;

  /**
   * Build a market SELL that unwinds an outcome position by crossing the
   * resting bids, with a tick-aligned slippage cushion below the best bid —
   * the sell-side sibling of {@link quoteBinaryStake} (see it for the family's
   * mental model and tiering). Resolves `null` when there's no bid to cross or
   * nothing to sell — disable the Sell control rather than sending a doomed order.
   * The quote's `fillableQuantity`/`estProceeds` report what the crossable bids
   * can actually absorb — warn on a partial unwind before submitting.
   *
   * **Details**
   *
   * - `params.side`: "SELL_YES" (Up position) or "SELL_NO" (Down position).
   * - `params.quantity`: Outcome tokens to sell, raw units (lot-aligned down).
   * - `params.depth`: Book levels to resolve (default 10).
   * - `params.slippageBps`: Protective-floor cushion in bps (default 300 = 3%).
   * - `params.slippageMinTicks`: Minimum cushion in ticks (default 10).
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  quoteBinarySell(params: {
    pool?: string;
    marketId?: string;
    side: BinarySellSide;
    quantity: bigint;
    depth?: number;
    slippageBps?: bigint;
    slippageMinTicks?: bigint;
  }): Promise<BinarySellQuote | null>;

  /**
   * A market's trailing-24h stats (volume, trades, price change, high/low/open),
   * summed from 1h OHLCV candle buckets — cheaper than scanning fills. Key it by
   * `pool` or `marketId`. Prices are raw quote units; volume is raw collateral.
   *
   * On binary, key it by `marketId`: that reads only the market's own candles.
   * A `pool` key reads every market the pool has served in the window, in as
   * many indexer pages as the window needs.
   */
  getMarketStats24h(target: { pool?: string; marketId?: string }): Promise<MarketStats24h>;

  /**
   * An account's position + cost basis + PnL in one binary market, RAW units.
   * Reconstructs cost basis (weighted-average) from the account's order-book
   * fills on the market folded with complete-set mints/merges, marks the CURRENT
   * balances to the book-clamped last price (see `markYesPrice`; the settlement
   * payout once resolved), and realizes sells against the running average.
   * Best-effort over indexed fills; see {@link BinaryPositionPnL} for the
   * accounting assumptions. One fan-out of indexer reads plus one top-of-book
   * `eth_call` (skipped, falling back to `lastPrice` alone, when no chain
   * client is configured).
   *
   * Every money field is BLENDED across both outcomes; `outcomes.yes` /
   * `outcomes.no` carry each book on its own. Both are needed for a wallet
   * holding YES and NO, where the blend can read `0` while the legs are large
   * and opposite. RAW units throughout — format with `market.quoteDecimals`.
   *
   * A market that has never traded has NO price to mark against, so every
   * mark-derived field is `null`: `markValue` and `unrealizedPnl`, and
   * `markPrice` / `markValue` / `unrealizedPnl` on each leg. Show those as
   * unknown; do NOT treat them as zero. `balance`, `costBasis`, `avgCost` and
   * `realizedPnl` never depend on a mark and stay exact.
   *
   * - Throws {@link InvalidInputError} - the account is unusable.
   * - Throws {@link InvalidInputError} - no binary market with that id, or a voided
   *   market carrying a present but invalid payout vector. A legacy row with both
   *   vector fields absent keeps the documented half-payout fallback.
   * - Throws {@link IndexerError} - a fills, actions or balances read did not complete,
   *   OR an indexed fill or router action is malformed: an `id` that is not
   *   `` `${blockNumber}_${logIndex}` ``, or a `quantity`, `fillPrice` or mint/merge
   *   `amount` that is not an unsigned decimal number. This method fetches those rows
   *   itself, so a row it cannot read is corrupt indexed data, never a bad argument; the
   *   specific parse failure is on `cause`.
   * - Throws {@link RpcError} - the top-of-book `eth_call` did not complete (only with a chain client configured; a failed read is never marked on `lastPrice` as if it had succeeded).
   * - Throws {@link ContractRevertError} - the pool rejected the top-of-book read.
   * - Throws {@link NotConfiguredError} - the client has no indexer, or its indexer does not index the client's chain.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getBinaryPositionPnL(account: string, marketId: string): Promise<BinaryPositionPnL>;

  /**
   * PnL for ALL of an account's open binary positions in one call — the batched,
   * positions-list companion to {@link getBinaryPositionPnL}. Each entry is a
   * {@link OpenPositionPnL}: the position's market joined with its reliable
   * avg-cost PnL (`costBasis` / `avgCost` / `markValue` / `unrealizedPnl` /
   * `realizedPnl`, marked to the book-clamped price), computed identically to
   * `getBinaryPositionPnL` per market. Prefer this over deriving PnL from book
   * stats. Fetched in a bounded number of indexer round-trips (fills + router
   * actions + top-of-book batched across every open market), not a per-position
   * loop. Empty array when the account holds nothing.
   *
   * Still ONE entry per market, with both books on it. To render a row per
   * outcome, read `row.outcomes.yes` / `row.outcomes.no` and keep the legs whose
   * `balance > 0n` — the top-level money fields are blended across the two and
   * belong to neither.
   *
   * A market that has never traded has NO price to mark against, so its
   * `markValue` and `unrealizedPnl` are `null`, as are the same fields on each
   * leg. Show those as unknown; do NOT treat them as zero. A positions list
   * routinely mixes priced and unpriced markets, so handle `null` per row.
   *
   * **Errors**
   *
   * - Throws {@link IndexerError} when the positions, fills, router actions, or
   *   top-of-book request does not complete.
   * - Throws {@link InvalidInputError} when a voided position carries a present
   *   but invalid payout vector. A legacy row with both vector fields absent
   *   keeps the documented half-payout fallback.
   * - Throws {@link IndexerError} when an indexed fill or router action is malformed —
   *   an `id` that is not `` `${blockNumber}_${logIndex}` ``, or a `quantity`,
   *   `fillPrice` or mint/merge `amount` that is not an unsigned decimal number. This
   *   method fetches those rows itself, so a row it cannot read is corrupt indexed data,
   *   never a bad argument; the specific parse failure is on `cause`.
   * - Throws {@link NotConfiguredError} when the client has no indexer, or its
   *   indexer does not index the client's chain.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getOpenPositionsWithPnL(account: string): Promise<OpenPositionPnL[]>;

  /**
   * An account's redeemable positions across all SETTLED (resolved/voided)
   * binary markets for wallets with at most 200 nonzero positions, each shaped to feed straight into
   * `trader.redeemMany({ entries })`. Winners get `amount × (1 − settlementFee)`;
   * a voided market pays each side against the payout vector it stored — a half
   * per side under the `UNIFORM` void policy, `[p, D−p]` on a `CLOB_SNAPSHOT`
   * void that captured a two-sided close, and never a settlement fee.
   * Larger wallets throw {@link IncompletePortfolioError}; use
   * {@link getClaimablePage} to inspect bounded pages. Loser-side and
   * still-trading positions are omitted. One portfolio read, then
   * one settlement-fee read per unique winning market, with at most eight fee
   * reads in flight at a time.
   *
   * **Errors**
   *
   * - Throws {@link IndexerError} when the portfolio or settlement-fee request
   *   does not complete. After a fee read fails, no new fee read starts.
   * - Throws {@link InvalidInputError} when a voided position carries a present
   *   but invalid payout vector. A legacy row with both vector fields absent
   *   keeps the documented half-payout fallback.
   * - Throws {@link NotConfiguredError} when the client has no indexer, or its
   *   indexer does not index the client's chain.
   * @throws {IncompletePortfolioError} More than 200 nonzero positions exist; page with getClaimablePage.
   * @throws {IndexerError} The position or settlement-fee request fails.
   * @throws {IndexerUnavailableError} The configured indexer is disabled or unavailable.
   * @throws {InvalidInputError} A void payout vector is invalid.
   * @throws {NotConfiguredError} No indexer is configured for this chain.
   */
  getClaimable(account: string): Promise<ClaimablePosition[]>;

  /**
   * Inspect a bounded page of indexed nonzero binary positions and estimate the
   * redeemable claims in that page. Fees and void payouts match {@link getClaimable}.
   *
   * **Details**
   *
   * Defaults to `{ limit: 200, offset: 0 }`; limit accepts integers 1–1000.
   * `nextOffset` counts raw positions, including losers and open markets. Follow
   * it even when `claims` is empty. One sentinel position detects continuation;
   * it is not mapped or charged a fee. Balance changes can move rows between
   * offset pages; this read does not promise one pinned snapshot.
   *
   * **Example** (Inspect a bounded page and continue past an empty claims page)
   *
   * ```ts
   * const first = await exchange.client.getClaimablePage(account, { limit: 200 });
   * if (first.nextOffset !== null) {
   *   const next = await exchange.client.getClaimablePage(account, { limit: 200, offset: first.nextOffset });
   *   console.log(next.claims, next.nextOffset);
   * }
   * ```
   *
   * @param account - Holder whose indexed positions to inspect.
   * @param opts - Bounded position page.
   * @returns Claims in this page and the next raw-position offset, or null at the end.
   * @throws {InvalidInputError} Paging values are outside their documented bounds, or a void payout vector is invalid.
   * @throws {IndexerError} The position or settlement-fee request fails.
   * @throws {IndexerUnavailableError} The configured indexer is disabled or unavailable.
   * @throws {NotConfiguredError} No indexer is configured for this chain.
   */
  getClaimablePage(account: string, opts?: GetClaimablePageOptions): Promise<ClaimablePage>;

  // ------------------------------------------------------------------
  // Realtime price feeds — the on-chain EMA oracles (one endpoint, many assets)
  // ------------------------------------------------------------------

  /**
   * Watch one asset's price (e.g. `"BTC"`, `"ETH"`): hydrate a snapshot (feed
   * metadata + current price + recent ticks) to get roughly up to speed, then
   * stream live over a Hasura WebSocket subscription. While active, every
   * `getLivePrice`/`getLivePriceTicks` read for this asset is current to the
   * last pushed tick at zero round-trip cost.
   *
   * Ref-counted like {@link watchMarket}: watching the same asset twice shares
   * one subscription and one snapshot for the same tape demand; each handle's `stop()` releases one
   * reference, and a brief linger absorbs quick re-watches.
   *
   * Different assets share transport in this client: one price-feed socket per
   * endpoint, and one batched snapshot request (up to 10 assets) for watches
   * started in the same tick with the same tape demand. Current-only and tape
   * snapshots batch separately so tape failures do not reject current-only reads.
   * Each asset keeps its own ticks, cursor and status.
   *
   * `options.ticks` defaults to true: hydrate up to 200 ticks and stream the tape.
   * Set false for current price and metadata only. Adding a tape reader hydrates
   * only that asset. Its last tape reference releases the stream and cached ticks
   * after 30 seconds while current-price readers continue. Both modes share the
   * configured owner's transport and close lifecycle. No migration is required
   * for direct watches; latest/info React hooks now select `ticks: false`.
   *
   * **Example**
   * ```ts
   * const watch = await exchange.client.watchPrice("BTC", { ticks: false });
   * const price = exchange.client.getLivePrice("BTC");
   * const health = exchange.client.getPriceHealth("BTC", { ticks: false });
   * watch.stop();
   * ```
   * @throws {IndexerError} The snapshot request or response fails, or a supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {InvalidInputError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {NotConfiguredError} The price feed or its quote is not configured, or a supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {InvariantError} The snapshot map omits a requested asset, or a supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {RpcError} The price-feed socket cannot be selected or constructed; a non-SDK failure is the cause. A supplied constructor's own RpcError keeps its identity.
   * @throws {NotSupportedError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *
   * Requires `config.priceFeed`, INCLUDING its `quote`: a live watch rejects
   * with a `NotConfiguredError` naming `config.priceFeed.quote` when the feed is
   * unpinned, because the tick tape's cursor is only unique within one quote (see
   * {@link PriceFeedConfig.quote}). The one-shot `fetchPrice*` reads still work
   * unpinned. Rejects (and releases the ref) in either case.
   */
  watchPrice(asset: string, options?: PriceWatchOptions): Promise<PriceWatchHandle>;

  /**
   *  Watch a batch of assets at once (e.g. `["BTC", "ETH"]`). Returns a single
   *  handle whose `stop()` releases all of them; each asset is independently
   *  ref-counted, so this composes with per-asset {@link watchPrice} calls.
   *  The assets hydrate in batched snapshot requests and stream on one shared
   *  socket. If a snapshot request fails, this rejects and releases every asset.
   *
   *  `options.ticks` has the same default and release behavior as {@link watchPrice}.
   *  Pass false to watch only current prices and metadata across the batch.
   *  @throws {IndexerError} A snapshot request or response fails, or a supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {InvalidInputError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {NotConfiguredError} The price feed or its quote is not configured, or a supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {InvariantError} A snapshot map omits a requested asset, or a supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {RpcError} The price-feed socket cannot be selected or constructed; a non-SDK failure is the cause. A supplied constructor's own RpcError keeps its identity.
   *  @throws {NotSupportedError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {SignerRequiredError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {IndexerUnavailableError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {IndexerWaitTimeoutError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {ContractRevertError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {TransactionOutcomeUnknownError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {FillHistoryRestartRequiredError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {FillHistoryUnavailableError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {IncompleteHistoryError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {CollateralOnWrongChainError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {BridgeLiquidityError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *  @throws {BridgeDeliveryTimeoutError} A supplied owner WebSocket constructor raises this SDK error while opening the price-feed socket. Its identity is retained.
   *
   *  Requires a quote-pinned `config.priceFeed` for the same reason
   *  {@link watchPrice} does.
   */
  watchPrices(assets: string[], options?: PriceWatchOptions): Promise<PriceWatchHandle>;

  /**
   *  Per-asset price-watch state: `"unwatched"`, `"hydrating"`, `"live"`, or
   *  `"error"`. A failed required stream retains its last values. See
   *  {@link PriceFeedStatus}. `options.ticks: false` reports only the current-price
   *  stream, so a tape failure does not make a latest-only reader report error.
   */
  getPriceStatus(asset: string, options?: PriceWatchOptions): PriceFeedStatus;

  /**
   * Fire `listener` after every batch of price-store changes (React hooks
   * subscribe to exactly this). Re-read with `getLivePrice`/`getLivePriceTicks`.
   * Each read keeps its reference until that asset's own data changes, so a
   * change to another asset does not give a new value. Independent of {@link subscribeLive}
   * (prices are a separate store/service).
   *
   * **Details**
   *
   * - Returns: An unsubscribe function.
   */
  subscribePrices(listener: () => void): () => void;

  /**
   *  The current price of a watched asset (from the live store), or null if
   *  unwatched / not yet hydrated. Synchronous, memoized.
   */
  getLivePrice(asset: string): LivePrice | null;

  /**
   *  Current prices for a batch of watched assets, aligned to `assets` (each entry
   *  null if that asset is unwatched / not yet hydrated). Synchronous.
   */
  getLivePrices(assets: string[]): (LivePrice | null)[];

  /**
   *  The recent tick tape of a watched asset, newest first. Synchronous. The
   *  returned array keeps its reference until this asset receives new ticks.
   *  An asset with no ticks returns one shared empty array. Readers share the
   *  array, so it is frozen: copy it before you sort or reverse it.
   *
   * **Details**
   *
   * - `opts.limit`: Max ticks (default 100; the store retains ~1000).
   */
  getLivePriceTicks(asset: string, opts?: { limit?: number }): PricePoint[];

  /**
   *  Feed metadata + current price for a watched asset (from the live store), or
   *  null if unwatched. For a one-shot read without a watch use {@link fetchPriceFeedInfo}.
   */
  getLivePriceFeedInfo(asset: string): PriceFeedInfo | null;

  /** One-shot feed metadata + current price (one HTTP round-trip; no watch needed). */
  fetchPriceFeedInfo(asset: string): Promise<PriceFeedInfo>;

  /**
   *  One-shot current price (one HTTP round-trip), or null if the feed has no
   *  observations yet.
   */
  fetchPrice(asset: string): Promise<LivePrice | null>;

  /**
   *  One-shot current prices for a batch of assets, or ALL tracked assets when
   *  `assets` is omitted — the multi-asset "price wall" in one request. Assets
   *  with no observations yet are omitted from the result.
   */
  fetchPrices(assets?: string[]): Promise<LivePrice[]>;

  /**
   *  One-shot feed catalog — metadata + current price for every tracked asset
   *  (discovery). One HTTP round-trip; no watch needed.
   */
  listPriceFeeds(): Promise<PriceFeedInfo[]>;

  /**
   *  Historic ticks for one asset, newest first — window with `from`/`to` (unix
   *  seconds, chain time), page with `limit` (default 500).
   */
  fetchPriceHistory(asset: string, opts?: { limit?: number; from?: number; to?: number }): Promise<PricePoint[]>;

  /**
   *  OHLC candles for one asset + resolution (`"M1"`/`"H1"`/`"D1"`), oldest first
   *  (chart-ready). Window with `from`/`to` (unix seconds); page with `limit`.
   */
  fetchPriceCandles(
    asset: string,
    resolution: PriceCandleResolution,
    opts?: { limit?: number; from?: number; to?: number },
  ): Promise<PriceCandle[]>;

  // ------------------------------------------------------------------
  // Indexer reads — history + aggregates (throw on request failure)
  // ------------------------------------------------------------------

  /**
   * List markets, newest first, as the discriminated
   * `Market = SpotMarket | BinaryMarket` union.
   *
   * **Details**
   *
   * - `opts.marketType`: Filter to `"SPOT"` or `"BINARY"`; omit for both.
   * - `opts.limit`: Max rows (default 50).
   * - `opts.offset`: Row offset for pagination (default 0).
   */
  listMarkets(opts?: { marketType?: MarketType; limit?: number; offset?: number }): Promise<Market[]>;

  /**
   *  Registry sweep for the unified tier: every non-binary market plus the
   *  binary series that are still live (not finalized), paged until
   *  exhausted. Finalized series accumulate without bound; resolve those by
   *  pool via the raw-tier lookups instead.
   */
  listRegistryMarkets(): Promise<Market[]>;

  /**
   *  {@link listRegistryMarkets} with the rows the SDK could not parse COUNTED,
   *  as `{ markets, dropped }`.
   *
   *  A malformed row is dropped silently rather than failing the page, so a
   *  caller that treats the sweep as exhaustive — a monitor publishing coverage
   *  over it, say — cannot tell a short answer from a complete one. `dropped > 0`
   *  says the registry holds markets this read did not return.
   *
   * @throws {@link IndexerError} The indexed read did not complete. The complete
   *  union is {@link SomniaMarketsClientListRegistryMarketsCheckedError}.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  listRegistryMarketsChecked(): Promise<RegistrySweep>;

  /**
   *  Server-side COUNT of markets (optionally one type) for pagination totals.
   *  Needs the privileged `_aggregate` role (server-only), like {@link countBinaryMarkets}.
   *  Without it the count is a row scan capped at 10,000 and a larger total reads
   *  as exactly `10000` — {@link countMarketsBounded} reports whether it did.
   */
  countMarkets(opts?: { marketType?: MarketType }): Promise<number>;

  /**
   *  {@link countMarkets} with the truncation reported: `truncated: true` means
   *  the public-role scan hit its cap and `count` is a lower bound.
   */
  countMarketsBounded(opts?: { marketType?: MarketType }): Promise<CountResult>;

  /**
   *  One market by primary key (bytes32 marketId for binary, pool address for
   *  spot), or null if the indexer doesn't have it.
   */
  getMarket(id: string): Promise<Market | null>;

  /** {@link listMarkets} pre-narrowed to binary markets. `limit` defaults to 50, `offset` to 0. */
  listBinaryMarkets(opts?: ListBinaryMarketsOptions): Promise<BinaryMarket[]>;

  /**
   *  Currently-live binary markets (`expiry > now`), soonest-to-expire first.
   *  Call with no argument for all live markets, or pass a
   *  {@link LiveBinaryMarketsFilter} to narrow by `operatorId` / `venueId` /
   *  `asset` / `intervalSec` / `status` (e.g. `{ venueId: "0x4d41494e" }`).
   */
  listLiveBinaryMarkets(filter?: LiveBinaryMarketsFilter): Promise<BinaryMarket[]>;

  /**
   *  Distinct (operatorId, venueId) pairs across binary markets — the cheap
   *  server-side source for operator/venue filter options (so a UI never
   *  fetches every market just to enumerate origins). Excludes null attribution.
   */
  listBinaryVenueIds(): Promise<
    {
      /** The operator the venue belongs to (venue ids are operator-scoped). */
      operatorId: number;
      /** Venue id (bytes4 hex, e.g. "0x4d41494e"), unique within its operator. */
      venueId: string;
    }[]
  >;

  /**
   *  Distinct asset symbols across binary markets — the cheap server-side
   *  source for an asset filter's options.
   */
  listBinaryAssets(): Promise<string[]>;

  /**
   *  Server-side COUNT of binary markets matching a filter, optionally split by
   *  lifecycle phase (`"live"` / `"past"`; omit `phase` to count both) — a total
   *  without fetching rows (Hasura `_aggregate`). On the public role this is a
   *  row scan capped at 10,000, which `Market` passes in production during
   *  2026 — {@link countBinaryMarketsBounded} says which.
   */
  countBinaryMarkets(opts?: BinaryMarketCountOptions): Promise<number>;

  /**
   *  {@link countBinaryMarkets} with the truncation reported: `truncated: true`
   *  means the public-role scan hit its cap and `count` is a lower bound, so a
   *  `rows.length < count` pagination gate would stop early.
   */
  countBinaryMarketsBounded(opts?: BinaryMarketCountOptions): Promise<CountResult>;

  /**
   *  Past binary markets (`expiry ≤ now`), most-recently-expired first,
   *  paginated with `limit` + `offset`.
   */
  listPastBinaryMarkets(opts?: PastBinaryMarketsOptions): Promise<BinaryMarket[]>;

  /**
   *  One binary market by bytes32 marketId, or null (also null if the id
   *  resolves to a spot market).
   */
  getBinaryMarket(id: string): Promise<BinaryMarket | null>;
  /**
   *  One binary market by its on-chain BinaryMarket ADDRESS (the Market PK is the
   *  bytes32 marketId, so an address-keyed caller must resolve through this).
   *  Newest first for recycled/rebound addresses; null if not yet indexed.
   */
  getBinaryMarketByAddress(marketAddress: string): Promise<BinaryMarket | null>;
  /**
   *  Fee config frozen into the market's pool at creation (origin venue
   *  attribution + rates in bpsTimes1k), or null without attribution.
   */
  getMarketFees(id: string): Promise<MarketFees | null>;

  /**
   *  {@link listMarkets} pre-narrowed to spot markets. Pass a
   *  {@link SpotMarketFilter} (+ `limit`) to narrow by base/quote symbol.
   */
  listSpotMarkets(opts?: SpotMarketFilter & { limit?: number }): Promise<SpotMarket[]>;

  /** One spot market by pool address, or null (also null if not spot). */
  getSpotMarket(id: string): Promise<SpotMarket | null>;

  /**
   *  A market's status-transition history (Trading→Locked→Settling→Resolved…),
   *  oldest-first — the resolution/lock timeline for a market page.
   */
  getMarketStatusHistory(marketId: string): Promise<MarketStatusUpdate[]>;

  /**
   *  {@link listMarkets} pre-narrowed to perp markets. Pass a
   *  {@link PerpMarketFilter} (+ `limit`) to narrow by base/quote symbol.
   */
  listPerpMarkets(opts?: PerpMarketFilter & { limit?: number }): Promise<PerpMarket[]>;

  /**
   *  One perp market by pool address, or null (also null if the id resolves to
   *  another market kind).
   */
  getPerpMarket(id: string): Promise<PerpMarket | null>;

  /**
   * OHLCV candles for one pool + interval, oldest first (chart-ready).
   *
   * **Details**
   *
   * - `intervalSeconds`: Bucket size — one of the indexer's rollup intervals.
   * - `opts.limit`: Max buckets (default 500).
   * - `opts.from`: Only buckets at/after this unix-seconds timestamp.
   * - `opts.to`: Only buckets at/before this unix-seconds timestamp.
   * - `opts.market`: Only this market's candles. Pass it on binary: a recycled
   *   pool otherwise returns every market it has served, one row per market in
   *   a bucket that spans a recycle. Rows in one bucket are ordered by their
   *   last fill.
   *
   * ```ts
   * const candles = await client.getCandles(market.poolAddress, 3600, { market: market.id });
   * ```
   *
   * This indexer read uses the configured endpoint and signal. It preserves raw
   * integer strings without rounding. A successful empty range returns `[]`.
   * Missing or malformed selected rows, GraphQL envelopes or supplied watermark
   * metadata reject; they never become an empty range. An omitted watermark is
   * unknown. Its nullable signed Int values keep the served schema's semantics.
   * Caller cancellation retains the exact signal reason. An already-cancelled
   * configured read starts no HTTP work. This operation sends no chain request.
   *
   * @returns Validated candles in chronological order.
   * @throws {@link InvalidInputError} When a request variable cannot be serialized.
   * @throws {@link NotConfiguredError} When the endpoint is absent, its chain binding
   * is absent, or the indexer does not serve this client's chain.
   * @throws {@link IndexerError} When transport, HTTP, GraphQL, timeout or selected
   * response decoding fails. The operation is `IndexedChains` for the shared
   * endpoint binding check, or `Candles` for the candle read. Decode failures
   * retain a `TypeError` cause whose
   * cause is the invalid external value and whose message identifies its path.
   * @throws {@link IndexerUnavailableError} When the owner's endpoint governor
   * refuses the request or resets unfinished indexer work.
   * @throws `DOMException` When the configured signal cancels with the default
   * `AbortError`. Custom reasons, including `IndexerError`, pass through unchanged.
   */
  getCandles(poolAddress: string, intervalSeconds: number, opts?: GetCandlesOptions): Promise<Candle[]>;

  /**
   *  One market's activity, newest first — trades interleaved with complete-set
   *  mints and merges, redemptions, oracle resolution and lifecycle transitions.
   *
   *  This is the market's transaction history. Every row names the transaction it
   *  landed in, so a caller can follow any row to the chain. Narrow a row on its
   *  `kind` ({@link MarketActivity}).
   *
   *  Use this for a market page's activity panel. It is the one-shot INDEXER
   *  read, so it carries the history the panel needs on first paint, and it does
   *  not update itself. For trades arriving with no round-trip, read
   *  {@link getLiveFills} as well and merge on the trade rows' `id`, which is
   *  `TRADE:` followed by the fill id — FIELD BY FIELD, preferring whichever
   *  source has a value. Neither is a superset of the other: the tail leaves
   *  `taker`/`takerSide` undefined on the fills it hydrates, and the indexer's
   *  `takerIsBid` is null until its taker bridge lands. Preferring one source
   *  wholesale drops what the other knew.
   *
   *  A spot or perp market returns `TRADE` rows only — the other kinds come from
   *  binary-only entities, so asking for them there is not an error, just empty.
   *
   *  One round-trip. Page backwards with `until`, not an offset (see
   *  {@link MarketActivityOptions}).
   *
   *  @param market - The market's bytes32 marketId (case-insensitive). On spot
   *  and perp this is the pool address.
   */
  getMarketActivity(market: string, opts?: MarketActivityOptions): Promise<MarketActivity[]>;

  /**
   *  Everything the protocol did in ONE transaction — trades, complete-set mints
   *  and merges, redemptions, oracle resolution, lifecycle transitions, the
   *  orders it placed and the fees it paid ({@link TransactionActivity}).
   *
   *  The read behind a transaction detail view, and the counterpart to
   *  {@link getTradeContext}: that starts from a trade and shows its transaction as
   *  context, this starts from a transaction and shows every trade in it.
   *  `events` is the same union {@link getMarketActivity} returns, with the same
   *  row ids, so one component renders both — but in LOG order, earliest first,
   *  because a transaction reads forwards.
   *
   *  A hash the indexer has nothing for returns empty collections and a null
   *  `blockNumber` rather than throwing: an unknown hash and a transaction that
   *  touched no protocol contract are both absence.
   *
   *  Indexer first. The client asks the chain for the transaction's block only
   *  when the indexer has no event for the hash and `opts.anchor` is unset. That
   *  lookup is best-effort: if the chain cannot place the hash, the read probes
   *  the indexer's order table instead.
   *
   *  @param txHash - Transaction hash (case-insensitive).
   */
  getTransactionActivity(txHash: string, opts?: TransactionActivityOptions): Promise<TransactionActivity>;

  /**
   *  What the protocol traded in one block, grouped by market — the level above
   *  {@link getTransactionActivity}.
   *
   *  The block's own timestamp anchors every read, because no block column in the
   *  indexer schema is indexed. Resolving it is a chain read, and this client
   *  owns the transport, so it happens here: a caller never needs a second
   *  client. Reach for {@link getViemClient} only for chain work the SDK does not
   *  model.
   *
   *  A block with no markets activity — the common case, since only ~42% of
   *  blocks carry any — returns an empty `markets` array rather than throwing.
   *
   *  Order rows carry no `status`: `Order` is mutable, so its status is
   *  as-of-now and would show a state from the block's future. Use `touch`.
   *
   *  `truncated` reports a stream that came back full; page with `opts.offset`.
   *
   *  @param blockNumber - Block to read.
   *  @param opts - Rows per stream and the offset to page from.
   */
  getBlockActivity(blockNumber: bigint, opts?: BlockActivityOptions): Promise<BlockActivity>;

  /**
   *  The newest block the indexer has markets activity for, or null when it has
   *  none at all.
   *
   *  The entry point for a block view: the chain head runs ahead of the indexer,
   *  and most blocks carry no markets activity, so the head is usually a blank
   *  page. Pair with {@link getBlockActivity}.
   */
  getLatestActiveBlock(): Promise<{ blockNumber: bigint; timestamp: bigint } | null>;

  /**
   *  The closest blocks with markets activity below and above one block.
   *
   *  The read behind a block view's prev/next: most blocks carry no markets
   *  activity, so stepping by n±1 lands on a blank page more often than not.
   *  Either side is null when no active block was found within the bounded scan.
   *
   *  Anchored the same way as {@link getBlockActivity}, and for the same reason
   *  resolves that anchor itself.
   *
   *  @param blockNumber - The block being viewed; excluded from both answers.
   *  @param opts - Rows per stream per direction.
   */
  getAdjacentActiveBlocks(
    blockNumber: bigint,
    opts?: BlockActivityOptions,
  ): Promise<{ prev: bigint | null; next: bigint | null }>;

  /**
   *  Recent fills on one pool, newest first. Bound the tape with `since`/`until`
   *  in seconds, or with `sinceBlock` to resume from a processed block
   *  ({@link GetFillsOptions}).
   *
   *  On binary, pass `market` to read one market's fills. A binary pool is
   *  recycled by successive markets, so without it the tape also holds the
   *  fills of the pool's earlier markets. Each row's `kind` tells a direct
   *  trade from a complete-set mint or burn.
   *
   *  ```ts
   *  const trades = await client.getFills(market.poolAddress, { market: market.id, limit: 100 });
   *  ```
   *
   * @throws {InvalidInputError} The pool, a market id or a block bound is unusable.
   * @throws {IndexerError} The read did not complete.
   * @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getFills(pool: string, opts?: GetFillsOptions): Promise<FillRow[]>;

  /**
   *  ONE fill IN CONTEXT, by id — the trade, its market, both sides' orders
   *  resolved, the fees it paid, and the other fills its transaction produced
   *  ({@link TradeContext}).
   *
   *  {@link getFill} is the cheaper sibling: one query, the fill and its market,
   *  no surrounding context. Prefer it when a caller only renders the trade.
   *
   *  The read behind a trade detail view. `getFills` and
   *  {@link getMarketActivity} are the list reads that produce the id; this is
   *  the drill-down from one of their rows.
   *
   *  Returns `null` when no fill has this id — a stale or mistyped link, not a
   *  failure. Two round-trips: the transaction's siblings and fees are anchored
   *  on the fill's own timestamp, so the fill has to resolve first.
   *
   *  @param id - Fill id, `${blockNumber}_${logIndex}`.
   */
  getTradeContext(id: string): Promise<TradeContext | null>;

  /**
   *  Fills a user participated in (maker OR taker), newest first — the one-shot
   *  indexer counterpart to {@link getLiveUserFills}. Optionally scope to one
   *  market and/or pool, a `since`/`until` window, and a `sinceBlock` bound
   *  ({@link FillsScope}). Use `sinceBlock` to resume from a processed block:
   *  blocks can share a timestamp, so a seconds bound repeats or skips them.
   *
   *  On binary, scope by `market` rather than `pool` for one market's tape: a
   *  pool is recycled by successive markets, so `pool` also returns the fills of
   *  that pool's earlier lives. Both predicates run at the indexer, so `limit`
   *  applies to the rows you asked for.
   *
   * @throws {InvalidInputError} The account, a scope value or a block bound is unusable.
   * @throws {IndexerError} The read did not complete.
   * @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getUserFills(account: string, opts?: FillsScope): Promise<FillRow[]>;

  /**
   * Read one historical fill page through this owner's indexer. Prefer this to
   * offset paging when new fills can arrive between reads. Numeric timestamp,
   * block number and log index define a total descending order. Self-trades
   * appear once. Existing fill fields and account-side interpretation are unchanged.
   *
   * The default limit is 50; valid limits are integers from 1 to 1000. A sentinel
   * row establishes continuation without returning it. Null continuation means
   * no further row was observed, not that indexing or historical coverage is complete.
   *
   * Cursors bind account, chain, configured endpoint, normalized filters, sort,
   * and the serving Fill dataset generation. A replacement behind the same URL
   * rejects continuation with {@link FillHistoryRestartRequiredError}. A legacy
   * cursor without a generation also requires a restart. Discard all accumulated
   * pages and restart without a cursor. The generation comes from the serving
   * indexer database, so it survives Hasura replica restarts. A fresh replay with
   * changed hashed producer inputs rotates it; an identical replay does not. A
   * code-only resume preserves the old identity and therefore cannot roll out a
   * handler change that affects stored fills. An endpoint without this producer
   * contract fails closed. Newer inserts belong to a
   * fresh first-page read; a page is not a complete-history coverage guarantee.
   * Cancellation through the configured owner's signal preserves the caller's
   * abort reason rather than converting it to an IndexerError.
   *
   * @param account - Wallet participating as maker or taker.
   * @param options - Market/pool, market kind (`marketType`), inclusive time and source-block filters, bounded limit and cursor.
   * Omit `marketType` to read every kind. The cursor is scoped to the normalized filters, including `sinceBlock` and `marketType`.
   * @returns The dataset generation, existing fill rows and the next cursor, or null when this read has no next row.
   * @throws {@link InvalidInputError} For invalid input or malformed/foreign cursors.
   * @throws {@link IndexerError} When the read fails or returned position scalars are invalid.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   * @throws {@link IndexerUnavailableError} When local backpressure or the circuit breaker refuses the read.
   * @throws {@link FillHistoryUnavailableError} When the serving indexer has not initialized its dataset generation.
   * @throws {@link FillHistoryRestartRequiredError} When the cursor's generation differs from the serving dataset, or a legacy cursor lacks a generation.
   * @example
   * ```ts
   * const first = await exchange.client.getUserFillsPage(account, { limit: 100 });
   * try {
   *   if (first.nextCursor !== null) {
   *     const next = await exchange.client.getUserFillsPage(account, { limit: 100, cursor: first.nextCursor });
   *     console.log(next.fills);
   *   }
   * } catch (error) {
   *   if (error instanceof FillHistoryRestartRequiredError) {
   *     const restarted = await exchange.client.getUserFillsPage(account, { limit: 100 });
   *     console.log(restarted.fills);
   *   } else throw error;
   * }
   * ```
   */
  getUserFillsPage(account: string, options?: GetUserFillsPageOptions): Promise<UserFillsPage>;

  /**
   * Keep an account's fill history current without reading all of it again.
   * Use it when a caller holds the history between reads, such as a portfolio
   * that polls. Pass the history the last call returned as `previous`. The call
   * reads again only the fills from `overlapSeconds` (default 60) before the
   * newest held fill, puts the new fills on top, and keeps the older held rows
   * as they are. When nothing changed, it returns `previous` itself with
   * `changed: false`. That costs one page request and one small probe, and one
   * more request for each further 999 fills in the overlap. The overlap ends at
   * the newest held fill, not at the current time. So an account with more than
   * 999 fills in its overlap pays the extra requests on every call, also when
   * nothing new arrives.
   *
   * Without `previous`, the call reads the newest `maxRows` fills (default
   * 20,000) in pages of 999. The result is plain data with no endpoint or
   * credentials. Store it as it is, or after a JSON round trip, and pass it back.
   * The SDK keeps no state between calls.
   *
   * A fill never changes once the indexer serves it, and fills appear in block
   * order. The one exception is a chain reorg, which the indexer rolls back in
   * place under the same dataset generation. So the overlap is a check. When a
   * held fill in it changed, or an unheld fill appears below the newest held
   * one, or when the newest held fills are gone while newer fills are served,
   * the call reads the whole history again. When only the newest held fills
   * are not served, nothing newer is, and every other held fill in the overlap
   * still matches, the call drops them and does not read again. An indexer that
   * is behind serves exactly that,
   * for example after a cutover to a slot that is behind. The dropped fills come
   * back as new fills when it catches up. A reorg that forks more than
   * `overlapSeconds` below the newest held fill is not detected. Rows older than
   * the overlap are not read again.
   *
   * The call also reads the whole history again when the serving Fill dataset
   * changed, or when `previous` does not fit the call: another account, chain,
   * market kind or format version, or rows out of order, repeated or without a
   * usable position. An unusable `previous` is not an error. Each of these
   * returns `restarted: true`, and `restartReason` says which one it was. The
   * call makes at most two attempts: the first read or refresh, then one full
   * read when the first cannot stand. A dataset change during that full read
   * throws {@link FillHistoryRestartRequiredError}; call again.
   *
   * `truncated: true` means older fills exist that the history does not hold.
   * The history is complete from its oldest held fill onwards, but other fills
   * in that fill's second can be missing. A later call with a larger `maxRows`
   * does not load the older fills when the oldest held fill is below the
   * overlap. When the oldest held fill is inside the overlap, the refresh reads
   * past it, and the call reads the whole history again with
   * `restartReason: "previous"`. Omit `previous` to read the older fills.
   * Cancellation through the owner's signal or `options.signal` rejects with
   * that signal's reason. A rejected call returns nothing partial, so keep the
   * history you passed in.
   *
   * @param account - Wallet participating as maker or taker.
   * @param options - The held history, the row cap, the overlap, a market kind and a signal.
   * @returns The history brought up to date, whether it changed, and whether and why it was read again from the start.
   * @throws {@link InvalidInputError} The account or an option is unusable.
   * @throws {@link IndexerError} A read failed, or returned rows without a usable position or out of order.
   * @throws {@link IndexerUnavailableError} Local backpressure or the circuit breaker refused a read.
   * @throws {@link FillHistoryUnavailableError} The serving indexer has not initialized its dataset generation.
   * @throws {@link FillHistoryRestartRequiredError} The serving dataset changed during the full read that follows a first attempt that cannot stand.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   * @example
   * ```ts
   * const first = await exchange.client.getUserFillHistory(account);
   * // Later, with the history the last call returned:
   * const next = await exchange.client.getUserFillHistory(account, { previous: first.history });
   * if (next.changed) {
   *   console.log(next.history.fills.length, next.history.truncated, next.restartReason);
   * }
   * ```
   */
  getUserFillHistory(account: string, options?: GetUserFillHistoryOptions): Promise<UserFillHistoryRead>;

  /**
   *  Every fill of one MARKET KIND in an inclusive block range, across every
   *  pool of that kind, oldest first — the read behind a published trade feed.
   *
   *  Takes no pool, unlike {@link getFills}: a feed indexes the whole venue and
   *  must not enumerate its pools. The block range is what bounds the read.
   *
   *  Use blocks, not `since`/`until` seconds, whenever successive reads must
   *  tile the chain exactly. Several Somnia blocks can share a timestamp, so a
   *  seconds window drops or repeats the fills in them at every seam. Both
   *  bounds here are inclusive and `(blockNumber, logIndex)` is a total order,
   *  so `[a, b]` then `[b + 1, c]` covers every fill once.
   *
   *  Pages default to 500 rows. The cursor names the last row returned and binds
   *  the chain, endpoint, kind and both bounds, so a cursor from one range is
   *  rejected by another. A full page always returns a cursor, so a range that
   *  ends on a page boundary costs one empty final page. Drain a range until
   *  `nextCursor` is null; a null
   *  cursor means this read saw no further row IN THE RANGE, not that indexing
   *  is complete — {@link getLatestFillBlock} is what reports how far the fill
   *  data reaches.
   *
   *  Amounts stay raw strings, as everywhere on {@link FillRow}. Do not route a
   *  published feed through the human-unit market reads.
   *
   *  @param options - Kind, inclusive block range, page size and continuation.
   *  @throws {InvalidInputError} A bound, the kind, the limit or the cursor is unusable.
   *  @throws {IndexerError} The read did not complete, or returned unusable block positions.
   *  @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   *  @example
   *  ```ts
   *  let cursor: string | undefined;
   *  do {
   *    const page = await exchange.client.getFillsPage({
   *      marketType: "SPOT",
   *      sinceBlock: 441_000_000n,
   *      toBlock: 441_010_000n,
   *      cursor,
   *    });
   *    console.log(page.fills.length);
   *    cursor = page.nextCursor ?? undefined;
   *  } while (cursor !== undefined);
   *  ```
   */
  getFillsPage(options: FillsPageOptions): Promise<FillsPage>;

  /**
   *  The newest block carrying an indexed fill of one market kind, with that
   *  block's timestamp — the head marker to poll before asking for a range.
   *
   *  Taken from the fill data rather than from the indexer's processed-block
   *  watermark, so the marker can never name a block {@link getFillsPage} cannot
   *  yet serve.
   *
   *  Returns `null` when no fill of that kind is indexed — a fresh deployment or
   *  one still replaying, not a failure. {@link getLatestActiveBlock} is the
   *  wider question: the newest block with ANY markets activity, fills included.
   *
   *  @param marketType - Market kind to report on.
   *  @throws {InvalidInputError} The market kind is unusable.
   *  @throws {IndexerError} The read did not complete.
   *  @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getLatestFillBlock(marketType: MarketType): Promise<LatestFillBlock | null>;

  /**
   *  One fill by its id (`${blockNumber}_${logIndex}`) with both parties' order
   *  linkage and the market it executed on — the single lookup behind a fill
   *  detail view. Null when not indexed (a just-executed fill can lag a beat).
   */
  getFill(id: string): Promise<FillDetail | null>;

  /**
   *  Every fill one order participated in — either side, newest first.
   *  `(pool, orderId)` names exactly one order forever (ids never reuse).
   *  This bounded whole-history lookup accepts only `limit`; use `getFills` or
   *  `getUserFills` with `sinceBlock` to resume a pool or account tape.
   *
   * @throws {InvalidInputError} The pool identifier or order id is unusable.
   * @throws {IndexerError} The read did not complete.
   * @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getOrderFills(pool: string, orderId: bigint | string, opts?: { limit?: number }): Promise<OrderFillRow[]>;

  /**
   *  One order by `(pool, orderId)` — the indexer's view, including owner and
   *  full lifecycle attribution (status, cancelReason, amend chain). Null when
   *  not indexed; for chain-head truth use {@link getOrderOnchain}.
   */
  getOrder(pool: string, orderId: bigint | string): Promise<OrderDetail | null>;

  /**
   *  Every market a pool has hosted, newest first — one row for SPOT/PERP, the
   *  full recycle history for a BINARY pool. First row = the current market.
   *  The one-row shortcut is {@link getMarketByPool}.
   */
  listMarketsByPool(pool: string, opts?: { limit?: number }): Promise<Market[]>;

  /**
   * `owner`'s currently-OPEN orders, newest first. Pass {@link OrdersOptions}
   * (minus `status` — always "Open" here) to scope by `pool`/`pools`/`market`/
   * `markets`/`side`/`userData`/`sinceBlock` and page. Each row carries the placement's own
   * `userData` tag, so a caller can match a row to the order it sent.
   * NOTE: this lags the chain — for a trading loop prefer
   * {@link getLiveUserOrders} (or track the `orderId`s your own
   * `placeOrder` calls return). For non-open history use {@link getOrders}.
   *
   * @throws {InvalidInputError} The owner, a scope, tag or block bound is unusable.
   * @throws {IndexerError} The read did not complete.
   * @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getOpenOrders(owner: string, opts?: Omit<OrdersOptions, "status">): Promise<OpenOrder[]>;

  /**
   *  `owner`'s orders across ALL statuses (Open/Filled/Cancelled/Expired/Closed),
   *  newest first — the order-history counterpart to {@link getOpenOrders}. Each
   *  row carries its lifecycle `status`, fill progress and the placement's own
   *  `userData` tag. Filter by `status`/`side`/`pool`/`pools`/`market`/
   *  `markets`/`userData`/`sinceBlock` and page via {@link OrdersOptions}. `sinceBlock`
   *  bounds the PLACEMENT block, so it does not report later changes to older
   *  orders.
   *
   * @throws {InvalidInputError} The owner, a scope, tag or block bound is unusable.
   * @throws {IndexerError} The read did not complete.
   * @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getOrders(owner: string, opts?: OrdersOptions): Promise<OrderRow[]>;

  /**
   *  Orders past expiry that are STILL RESTING, across the whole book — the
   *  work-list for a permissionless expired-order sweep. Not scoped to an account.
   *
   *  Works on every market kind; scope with `pool` and/or `marketType`. Each row
   *  carries exactly what the sweep verbs need: `orderId` for
   *  `trader.cancelExpiredOrders`, and `isBid` + `price` for
   *  `trader.sweepExpiredAtLevel`.
   *
   *  **This is not `status: "Expired"`.** That status is written when the chain
   *  emits `OrderExpired` — i.e. once an order has ALREADY been removed. The sweepable
   *  set is the opposite: `status = "Open"` and `expireTimestampNs < now`, orders the
   *  book still holds because nobody has cleaned them up. They are NOT matched against
   *  — the matcher skips an expired maker — but each costs a warm SLOAD per traversal
   *  and holds a priority-index slot.
   *
   *  Longest-overdue first. GTC excludes itself because this SDK writes it as
   *  now + 50 years, not via any contract sentinel.
   */
  listSweepableOrders(opts?: {
    pool?: string;
    marketType?: MarketType;
    owner?: string;
    asOfSec?: number | bigint;
    limit?: number;
    offset?: number;
  }): Promise<SweepableOrder[]>;

  /**
   *  Indexed YES/NO outcome-token balances of `account` in one binary market
   *  ("0" when unseen). Display-grade: to gate a write, read the tokens'
   *  on-chain balances via {@link getErc20Balance} instead.
   */
  getOutcomeBalances(account: string, marketAddress: string): Promise<OutcomeBalances>;

  /**
   *  A bounded page of a wallet's binary portfolio in one round-trip once the registry is warm
   *  (a cold call resolves the market-type scope first): non-zero outcome
   *  positions, open orders, and recent trades (each with market context).
   *  Pass {@link PortfolioOptions} to page positions or bound orders/trades. Position pages default to 200 rows; follow `positionsNextOffset` while `positionsTruncated` is true. Balance changes between offset pages can move rows. Trades default to the last seven days — the bound comes back as `tradesSince`; pass `since` to widen it.
   * @throws {InvalidInputError} A position page or trade-window input is invalid.
   * @throws {IndexerError} An indexer request fails.
   * @throws {IndexerUnavailableError} The configured indexer is disabled or unavailable.
   * @throws {NotConfiguredError} No indexer is configured for this chain.
   */
  getPortfolio(account: string, opts?: PortfolioOptions): Promise<Portfolio>;

  /**
   *  A wallet's spot activity: open orders, pending stop orders, and recent
   *  trades. Token holdings are NOT here — spot balances are plain ERC-20 /
   *  native balances; read them on-chain. Pass {@link PortfolioOptions} to page. Trades default to the last seven days — the bound comes back as `tradesSince`; pass `since` to widen it.
   */
  getSpotPortfolio(account: string, opts?: PortfolioOptions): Promise<SpotPortfolio>;

  /**
   *  A wallet's spot stop orders — PENDING by default (list + cancel via
   *  `trader.cancelStopOrder`). Pass `status` to see triggered/failed/cancelled
   *  history, `pool` to scope to one market, `limit` to page.
   *
   *  Rows don't include a LIMIT stop's limit price. See {@link SpotStopOrder}.
   */
  getSpotStopOrders(
    account: string,
    opts?: { pool?: string; status?: StopOrderStatus; limit?: number },
  ): Promise<SpotStopOrder[]>;

  /**
   *  A wallet's perp activity as indexed: open perp orders + recent perp
   *  trades. Positions/collateral live in the MarginBank — read them on-chain
   *  with {@link getPerpPosition} / {@link getMarginAccount}. Pass
   *  {@link PortfolioOptions} to page. Trades default to the last seven days — the bound comes back as `tradesSince`; pass `since` to widen it.
   */
  getPerpPortfolio(account: string, opts?: PortfolioOptions): Promise<PerpPortfolio>;

  /**
   *  Perp take-profit / stop-loss orders, newest first — the read that makes TP/SL
   *  usable at all.
   *
   *  The PerpStopOrderRegistry keeps pending orders in private storage behind no
   *  enumeration getter, so there is no chain read that answers "what stops do I
   *  have". Creation and triggering both work; without this a trader cannot see, price
   *  or cancel what they created, which is why the feature shipped gated.
   *
   *  Every scope comes from the same call: `{ account }` for a trader's working stops
   *  (default status `PENDING`), `{ pool }` with no account for a market's whole
   *  pending book, and `status` for history. `account` is optional deliberately — a
   *  market-wide view of what will fire is a legitimate monitoring read.
   *
   *  Read `dropReason` before calling a `TRIGGER_FAILED` order a failure: a reduce-only
   *  drop means the stop was overtaken by events, which is ordinary; only
   *  `PlacementFailed` is a rejection.
   *
   *  Rows don't include `limitPrice`. Fetch it for live stops with
   *  {@link getPerpStopOrders}.
   */
  listPerpStopOrders(opts?: {
    account?: string;
    pool?: string;
    status?: StopOrderStatus[];
    limit?: number;
    offset?: number;
  }): Promise<PerpStopOrder[]>;

  /**
   *  One pending stop read straight from its registry — the chain tier
   *  {@link listPerpStopOrders} does not have.
   *
   *  The only way to read a LIMIT stop's `limitPrice`, its linked `siblingOrderId`
   *  and its `intent`: no event carries them, so {@link PerpStopOrder} cannot.
   *  Cannot enumerate — list ids there, then enrich each here.
   *
   *  `null` when the id is not live. **Do not infer liveness from the terms**: a
   *  dead id keeps plausible values until its slot is recycled, so `live` is the
   *  only truth.
   *
   * @throws {@link InvalidInputError} The order id is not a valid uint128 integer.
   * @throws {@link NotConfiguredError} The owner has no chain WebSocket endpoint, or its RPC serves a retired genesis of the chain.
   * @throws {@link RpcError} The registry read failed before it returned a contract result.
   * @throws {@link ContractRevertError} The registry rejected the read.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getPerpStopOrder(ref: PerpStopOrderRef): Promise<PerpStopOrderOnChain | null>;

  /**
   *  Enrich known perp stop ids with one ordered chain batch.
   *
   *  Use {@link listPerpStopOrders} to discover ids. Each result belongs to the
   *  input ref at the same index. `absent` means the registry confirmed that the
   *  stop is not live. `failed` means only that member was unreadable.
   *
   *  The configured chain uses Multicall3 when available. Other chains use a
   *  bounded point-read fallback. Both paths pin every result to one chain head.
   *  A contract revert or RPC failure for a member is returned as `failed`.
   *
   * @throws {@link InvalidInputError} An order id is not a canonical unsigned uint128 decimal.
   * @throws {@link NotConfiguredError} The owner has no chain WebSocket endpoint, or its RPC serves a retired genesis of the chain.
   * @throws {@link RpcError} The head could not be pinned or the batch result was malformed.
   * @throws {@link ContractRevertError} The Multicall3 aggregate rejected the batch.
   * @example
   * ```ts
   * const indexed = await client.listPerpStopOrders({ account: owner });
   * const refs = indexed.map((stop) => {
   *   if (!isAddress(stop.registry)) throw new Error(`Invalid registry ${stop.registry}`);
   *   return { registry: stop.registry, orderId: stop.orderIdRaw };
   * });
   * const reads = await client.getPerpStopOrders(refs);
   * for (const [index, read] of reads.entries()) {
   *   const stop = indexed[index];
   *   if (stop === undefined) throw new Error(`Missing indexed stop ${index}`);
   *   if (read.status === "present") console.log(stop.id, read.order);
   *   if (read.status === "absent") console.log(stop.id, "no longer live");
   *   if (read.status === "failed") console.error(stop.id, read.error);
   * }
   * ```
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getPerpStopOrders(refs: readonly PerpStopOrderRef[]): Promise<readonly PerpStopOrderRead[]>;

  /**
   *  SOMI a perp stop registry charges per pending order, in wei. Send exactly
   *  this with a create or it reverts; refunded on cancel, consumed on a fire.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getPerpStopOrderSomiPayment(registry: Address): Promise<bigint>;

  /**
   *  SOMI a perp stop registry owes `account`, in wei, claimable with
   *  `trader.claimPerpStopSomi`. Credited when a cancel's direct refund fails (a
   *  contract owner with no payable receiver) OR when the registry is wound down,
   *  which credits every owner — **including EOAs**.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getUnclaimedPerpStopSomi(ref: { registry: Address; account: Address }): Promise<bigint>;

  /**
   *  An account's FINISHED perp orders, most-recently-ended first — the history tab
   *  behind {@link getPerpPortfolio}'s open-orders list.
   *
   *  `getPerpPortfolio` hard-filters `status = "Open"`, so before this there was no
   *  way to see a filled, cancelled or expired perp order at all.
   *
   *  Excludes working orders by default (`status != "Open"`); pass `status` to narrow
   *  to particular outcomes. Ordered by when each order ENDED, not when it was
   *  placed — a long-resting order that just filled belongs at the top of a history
   *  view, not buried at its placement date.
   *
   *  Note `Closed` is terminal, not transitional: an IOC that partially filled
   *  without resting stays `Closed` forever, so treating it as "still working" would
   *  show a finished order as live.
   */
  listPerpOrderHistory(
    account: string,
    opts?: {
      pool?: string;
      status?: TerminalOrderStatus[];
      orderBy?: "ended" | "placed";
      limit?: number;
      offset?: number;
    },
  ): Promise<PerpOrderHistoryRow[]>;

  /**
   * Read the indexer's own metadata without chain RPC. A missing row for another chain returns null.
   * For the client's own chain, a missing row fails the first read's binding check with
   * NotConfiguredError; a row that goes missing after the check passed still returns null.
   * Use the concrete owner's getIndexerFreshness for an independent comparison.
   * @throws {InvalidInputError} A query variable is invalid.
   * @throws {IndexerError} The metadata request failed.
   * @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getSyncStatus(chainId: number): Promise<IndexerSyncStatus | null>;

  /**
   *  Wait until the indexer has processed `block` on `chainId`, then resolve with
   *  what the wait observed.
   *
   *  The step between a confirmed write and an indexer read of that write: every
   *  indexer-backed read answers from the processed height, so a read issued
   *  before the block is indexed correctly reports the row as absent. Resolving
   *  means a read issued afterwards sees what that block wrote.
   *
   *  Polls `chain_metadata` every `pollMs` (default 500) until `timeoutMs`
   *  (default 30,000). Pass `signal` to abort; the caller's abort reason is
   *  rethrown unchanged.
   *
   *  For the client's own chain, the wait reads the RPC head once when it would
   *  resolve. An indexer more than 10,000 blocks past that head follows an
   *  earlier genesis of the same chain id, so the wait rejects instead of
   *  resolving. A client with no chain endpoint skips this read.
   *
   * **Example** (Read your own write)
   *
   *  ```ts
   *  const receipt = await exchange.client.getViemClient().waitForTransactionReceipt({ hash });
   *  await exchange.client.waitForIndexedBlock(exchange.client.config.chain.id, receipt.blockNumber);
   *  const orders = await exchange.client.getOpenOrders(owner, { userData: 7n });
   *  ```
   *
   * @throws {InvalidInputError} The block height, `timeoutMs` or `pollMs` is not a usable whole number.
   * @throws {IndexerWaitTimeoutError} The deadline passed with the indexer still behind the block.
   * @throws {IndexerError} A metadata read failed, or the indexer serves no row for this chain.
   * @throws {NotConfiguredError} The client has no indexer, its indexer does not serve its own
   *  chain, or its indexer is more than 10,000 blocks past the RPC head.
   * @throws {RpcError} The RPC head read failed.
   *
   * The complete union is {@link SomniaMarketsClientWaitForIndexedBlockError}.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  waitForIndexedBlock(
    chainId: number,
    block: number | bigint,
    opts?: WaitForIndexedBlockOptions,
  ): Promise<IndexedBlockWait>;

  /**
   *  Resolve a market by its pool address (one query; no live watch), or null.
   *  Binary markets are keyed by bytes32 marketId, so this is the by-pool lookup.
   */
  getMarketByPool(pool: string): Promise<Market | null>;

  /**
   *  Server-side COUNT of `owner`'s orders matching an {@link OrdersOptions}
   *  filter — the total for an order-history page. Privileged `_aggregate` role
   *  (server-only), with a bounded row-count fallback on the public role.
   *
   *  WITHOUT THAT HEADER THE RESULT IS A LOWER BOUND, returned as if exact: the
   *  fallback scan stops at 10,000 rows and reports 10,000, and `Order` is far
   *  past that in production. There is no bounded variant of this method yet —
   *  {@link countMarketsBounded} is the shape to copy.
   *
   * @throws {InvalidInputError} The owner, a scope, tag or block bound is unusable.
   * @throws {IndexerError} The count did not complete.
   * @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  countOrders(owner: string, opts?: OrdersOptions): Promise<number>;

  /**
   *  Server-side COUNT of the fills `account` participated in (maker OR taker),
   *  optionally scoped by market and/or pool + a `since`/`until` window or
   *  inclusive `sinceBlock` source-block bound ({@link FillsScope}) — a
   *  history-page total.
   *
   *  WITHOUT THE PRIVILEGED `_aggregate` HEADER THE RESULT IS A LOWER BOUND,
   *  returned as if exact: the fallback scan stops at 10,000 rows and reports
   *  10,000, and `Fill` is the deepest counted table in production. There is no
   *  bounded variant of this method yet — {@link countMarketsBounded} is the
   *  shape to copy.
   *
   * @throws {InvalidInputError} The account, a scope value or a block bound is unusable.
   * @throws {IndexerError} The count did not complete.
   * @throws {NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  countUserFills(account: string, opts?: FillsScope): Promise<number>;

  /**
   *  An account's RouterMinter action history (redeem / mint / merge), newest
   *  first — optionally scoped to one `market` (or several via `markets`) and/or
   *  `kind`, paginated ({@link RouterActionsOptions}).
   *
   *  Mint and merge move a position's cost basis, so scope this the same way you
   *  scope the fills you fold it against: an account-wide capped read drops the
   *  OLDEST rows, which are the ones that set the basis.
   */
  getRouterActions(account: string, opts?: RouterActionsOptions): Promise<RouterActionRecord[]>;

  /**
   *  Everything the indexer knows about how a market resolves: lifecycle events,
   *  the oracle reference link, and the posted oracle answers. `closingAnswer` is
   *  the market's own resolution answer (the CLOSING price for a reference-mode
   *  up/down market); `openingAnswer` is the reference-question answer (the OPENING
   *  price it resolves against, null for fixed-strike markets). Any piece may be
   *  absent. `oracleAnswer` is a deprecated alias of `closingAnswer`.
   */
  getMarketResolution(marketId: string): Promise<{
    /** Resolution lifecycle events for the market, oldest first ([] when none yet). */
    events: MarketResolutionEvent[];
    /**
     *  The oracle reference link the market resolves against; null for
     *  fixed-strike markets (no reference question) or before it's indexed.
     */
    reference: MarketReferenceLink | null;
    /**
     *  Answer to the market's OWN resolution question — the CLOSING price for a
     *  reference-mode up/down market; null until the oracle posts it.
     */
    closingAnswer: OracleAnswer | null;
    /**
     *  Answer to the REFERENCE question — the OPENING price the market resolves
     *  against; null for fixed-strike markets or while unanswered.
     */
    openingAnswer: OracleAnswer | null;
    /**
     * Compatibility alias for `closingAnswer`.
     *
     * @deprecated Use `closingAnswer` instead.
     */
    oracleAnswer: OracleAnswer | null;
  }>;

  /**
   *  Market-resolution lifecycle events across markets, newest first — filter by
   *  `market`, `kinds` and/or `sinceTimestamp`, paginate
   *  ({@link ListMarketResolutionEventsOptions}). The cross-market counterpart to
   *  {@link getMarketResolution}, which reports one market in full.
   *
   *  One row per delivery ATTEMPT and append-only, so a monitor watching for
   *  `"Skipped"` / `"Failed"` wants `sinceTimestamp` — without a lower bound this
   *  returns every failure the deployment has ever recorded, and a count over it
   *  only ever grows.
   *
   * @throws {IndexerError} The indexer request failed or returned an error. An
   *  empty page is `[]`.
   */
  listMarketResolutionEvents(opts?: ListMarketResolutionEventsOptions): Promise<MarketResolutionEvent[]>;

  /**
   *  Reference-question links, oldest first — filter by `pending` and/or
   *  `market`, paginate ({@link ListMarketReferenceLinksOptions}).
   *
   *  `pending: true` is the set worth sweeping: markets holding their own oracle
   *  answer while the question they resolve AGAINST is not final. They stay
   *  unresolved with no on-chain retry until `pokeOracle` lands the reference or
   *  `voidExpired` backstops them. Only reference-resolved markets have a link,
   *  so this never lists fixed-strike markets.
   *
   *  Oldest first, because the rows are live state rather than a trail: the first
   *  row is the market that has been stuck longest.
   *
   * @throws {IndexerError} The indexer request failed or returned an error. An
   *  empty page is `[]`.
   */
  listMarketReferenceLinks(opts?: ListMarketReferenceLinksOptions): Promise<MarketReferenceLink[]>;

  /**
   *  Batch opening (reference-question) prices for many markets in one pair of
   *  round-trips — for list views. Map of lowercased marketId → raw oracle
   *  `numericValue` (null when no reference answer yet). Format with the market's
   *  oracle price scale.
   */
  getOpeningPrices(marketIds: string[]): Promise<Record<string, string | null>>;

  /**
   *  Batch RESOLUTION (settlement) prices for many markets in one pair of
   *  round-trips — the settlement counterpart to {@link getOpeningPrices}. Map
   *  of lowercased marketId → raw oracle `numericValue`, null where unresolved.
   *  Joins each market's OWN question, so fixed-strike markets are covered too.
   */
  getResolutionPrices(marketIds: string[]): Promise<Record<string, string | null>>;

  /**
   *  A market's RESOLUTION price read straight from CHAIN — the fallback for a
   *  settled market whose answer the indexer never saw, because its oracle
   *  adapter is not the one whose events the indexer ingests. Resolves the
   *  market's bound adapter through the module, so it works for any adapter.
   *  Null while the question is not final. Carries its own `decimals` (adapters
   *  differ — do NOT assume a scale).
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getOnchainResolutionPrice(marketId: string): Promise<OnchainResolutionPrice | null>;

  /**
   *  Batch top of book (best resting bid/ask + mid) for many markets in one
   *  round-trip — for list views that want a book-derived price without an N+1
   *  per-pool fan-out. EVERY market kind: spot and perp pool addresses and
   *  binary market ids are all valid, and may be mixed in one call. Map of
   *  lowercased marketId → {@link BookTop}, whose prices are raw and in each
   *  market's own terms; empty-book markets are absent.
   */
  getBookTops(marketIds: string[]): Promise<Record<string, BookTop>>;

  /**
   *  Realized protocol-fee records, newest first — filter by `recipient` /
   *  `market` / `pool` / `payer`, paginate. The per-fill stream behind
   *  {@link getMarketFees}'s running total.
   */
  listProtocolFees(opts?: {
    recipient?: string;
    market?: string;
    pool?: string;
    payer?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProtocolFeeRecord[]>;

  /**
   *  Realized builder/routing-fee records, newest first — filter by `builder` /
   *  `market` / `payer`, paginate.
   */
  listBuilderFees(opts?: {
    builder?: string;
    market?: string;
    payer?: string;
    limit?: number;
    offset?: number;
  }): Promise<BuilderFeeRecord[]>;

  /**
   *  Realized settlement-fee records, newest first — filter by `market` /
   *  `recipient`, paginate.
   */
  listSettlementFees(opts?: {
    market?: string;
    recipient?: string;
    limit?: number;
    offset?: number;
  }): Promise<SettlementFeeRecord[]>;

  /**
   *  Builder-approval directory, newest-updated first — filter by `user` and/or
   *  `builder`, paginate. The directory complement to the on-chain point read
   *  {@link getBuilderApproval}.
   */
  listBuilderApprovals(opts?: {
    user?: string;
    builder?: string;
    limit?: number;
    offset?: number;
  }): Promise<BuilderApproval[]>;

  /**
   *  An owner's vault-credit fallback history (append-only), newest first —
   *  optionally scoped to one `token`, paginated. The live claimable balance is
   *  the chain read {@link getVaultBalance}.
   */
  getVaultPayoutFallbacks(
    owner: string,
    opts?: { token?: string; limit?: number; offset?: number },
  ): Promise<VaultPayoutFallback[]>;

  /**
   *  Vault-credit fallbacks across EVERY owner, newest first by default — filter by
   *  `owner`, `token` and/or `pool`, window with `from`/`to`, paginate.
   *
   *  {@link getVaultPayoutFallbacks} is the per-owner view of the same log; this is
   *  the operator's: every payout that could not reach a wallet and was credited to
   *  a pool vault instead, without knowing the owners in advance. Each row names the
   *  `pool` whose vault holds the credit; the live claimable amount is the chain read
   *  {@link getVaultBalance} with that pool as the `vault`.
   *
   *  The sort is a TOTAL order — `timestamp`, then the `id` primary key — so the
   *  sequence is stable between requests. The table is live and append-only, so
   *  offset paging is approximate; to follow the log forward pass `order: "asc"`
   *  with `from` at the last row's timestamp and skip the ids already seen there.
   *
   *  Returns one {@link VaultPayoutFallback} per indexed credit, an empty array
   *  when none matches. An INDEXED read: as current as the indexer's processed
   *  block, never ahead of it (see the read tiers reference). Usage is shown in
   *  the binary markets guide under "Vault credits".
   *
   * @throws {@link InvalidInputError} `opts.limit` is not an integer from 1 to
   *  1000, `opts.offset` is not a non-negative safe integer, or `opts.from` /
   *  `opts.to` are not whole, non-negative unix seconds. Checked before the
   *  request: `NaN` and `Infinity` are ordinary `number` values that would
   *  serialize to `null` and lift the page bound, or reach the indexer as an
   *  invalid numeric and come back as its failure.
   * @throws {@link IndexerError} The indexer request failed or returned an
   *  unusable response.
   * @throws {@link IndexerUnavailableError} Local backpressure or the circuit
   *  breaker refused the read before it was sent. The union is
   *  {@link SomniaMarketsClientListVaultPayoutFallbacksError}.
   */
  listVaultPayoutFallbacks(opts?: ListVaultPayoutFallbacksOptions): Promise<VaultPayoutFallback[]>;

  /**
   *  An account's funding-payment history, newest first — optionally scoped to
   *  one `pool`, paginated.
   */
  getFundingPayments(
    account: string,
    opts?: { pool?: string; limit?: number; offset?: number },
  ): Promise<FundingPayment[]>;

  /**
   *  An account's margin-account movement history (deposits/withdraws/locks),
   *  newest first — paginated.
   *
   *  `opts.kinds` keeps only the given movement types: `Deposit`, `Withdraw`, `Locked`,
   *  `Unlocked` or `Credited`. The indexer applies the filter, so `limit` counts only
   *  rows of those kinds. Pass `{ kinds: ["Deposit", "Credited", "Withdraw"] }` to read
   *  only the money that moved into or out of the account. Order locks and unlocks then
   *  do not fill the page.
   *
   *  An empty `kinds` array matches nothing.
   *
   * @throws {@link InvalidInputError} `opts.kinds` is not an array, or holds a value that
   *  is not a {@link MarginEventKind}. Checked before the request, because an unknown
   *  kind would match no row. The complete union is
   *  {@link SomniaMarketsClientGetMarginEventsError}.
   * @throws {@link IndexerError} The indexed read did not complete.
   * @throws {@link IndexerUnavailableError} The SDK refused the read locally, before it was
   *  sent. Its `reason` names the gate that refused.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getMarginEvents(account: string, opts?: GetMarginEventsOptions): Promise<MarginEvent[]>;

  /**
   *  Liquidation events, newest first. Filter by the liquidated `account`, the other
   *  side with `counterparty`, or either side with `party`. Combine these with
   *  `pool`, `kind`, or `kinds`, then paginate. An empty `kinds` array adds no filter.
   *
   *  `kind` matters more than it looks: the rows are stages of one mechanism, so one
   *  cascade produces many rows and an unfiltered `limit` is spent mostly on stages the
   *  caller did not ask about. See {@link LiquidationEvent.kind}.
   *
   *  The sort is a TOTAL order — `timestamp`, then `blockNumber`, then the `id` primary
   *  key — so the sequence is stable between requests. That fixes tie ordering only: these
   *  are live rows, and an event indexed ahead of your offset still repeats a row while a
   *  reorg that removes one still skips a row. Offset paging here is approximate, not
   *  snapshot-consistent.
   *
   * @throws {@link IndexerError} The indexed read did not complete. The complete union is
   *  {@link SomniaMarketsClientListLiquidationsError}.
   * @throws {@link IndexerUnavailableError} Indexer backpressure or the circuit breaker refuses the read.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  listLiquidations(opts?: ListLiquidationsOptions): Promise<LiquidationEvent[]>;

  /**
   *  Liquidation events, newest first. Ties are broken by `blockNumber` and
   *  unique `id`, so offset paging is stable while the indexed rows do not change.
   *  The alias accepts the same `party`, `counterparty`, `account`, `pool`,
   *  `kind`, and `kinds` filters as `listLiquidations`.
   *
   *  @deprecated Renamed to {@link SomniaMarketsClient.listLiquidations | listLiquidations},
   *  per SDK-TYPE-006. Forwards verbatim.
   *
   * @throws {@link IndexerError} As {@link SomniaMarketsClient.listLiquidations}. The union is
   *  {@link SomniaMarketsClientGetLiquidationsError}.
   * @throws {@link IndexerUnavailableError} Indexer backpressure or the circuit breaker refuses the read.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  getLiquidations(opts?: ListLiquidationsOptions): Promise<LiquidationEvent[]>;

  /**
   *  A perp pool's funding-rate history, newest first by default.
   *
   *  `from`/`to` are unix SECONDS and are what a chart should use — settlement is hourly
   *  (24 rows per pool per day, and 288 across the retired 300s cadence still in indexed
   *  history), so paging by offset to reach a date is both slow and fragile. Normalize each
   *  row with its OWN `fundingWindowSec`.
   *
   *  Pass `order: "asc"` to make `from` a forward CURSOR. Under the default `"desc"` a page
   *  always comes off the newest end, so `from = last.timestamp + 1` re-reads the tail
   *  instead of advancing.
   *
   *  The order is total. Rows that share a timestamp are ordered by `blockNumber`, then by
   *  `id`, in the same direction as `order`. So two reads of an unchanged table return the
   *  same sequence, and an `offset` page boundary inside one timestamp does not skip or
   *  repeat a row.
   */
  listFundingRateHistory(
    pool: string,
    opts?: {
      limit?: number;
      offset?: number;
      from?: number | bigint;
      to?: number | bigint;
      order?: "asc" | "desc";
    },
  ): Promise<FundingRateUpdate[]>;

  /**
   *  A perp pool's funding-rate ROLLUPS at one resolution (3600 | 14400 | 86400), newest
   *  first — for ranges the raw series is too dense for.
   *
   *  Buckets can be ABSENT where no settlement's span reached them: zero-fill those grid
   *  slots as `{ avgFundingRate8h: 0, coverage: 0 }` and never carry the previous rate
   *  forward. Past buckets also get REVISED when a catch-up settlement reaches backwards.
   *
   *  Pages NEWEST-first against a default `limit` of 500, so a month of hourly buckets (720)
   *  silently returns its newest 500 — treat `rows.length === limit` as truncated.
   */
  listFundingRateCandles(
    pool: string,
    intervalSeconds: number,
    opts?: { limit?: number; offset?: number; from?: number | bigint; to?: number | bigint },
  ): Promise<FundingRateCandle[]>;

  /**
   *  Realized perp fees / rebates / builder credits, newest first — the perps fee rail off
   *  MarginBank, distinct from the binary/spot `listBuilderFees`.
   *
   *  `insurancePortion` is a component OF `amount`, not an addition to it: a fee total is
   *  `SUM(amount)`, an insurance inflow is `SUM(insurancePortion)`, and adding the two
   *  double-counts. `amount` is unsigned — `isRebate` carries the direction.
   */
  listPerpFees(opts?: {
    account?: string;
    pool?: string;
    builder?: string;
    kind?: string;
    limit?: number;
    offset?: number;
  }): Promise<PerpFeeRecord[]>;

  /**
   *  Orders refused inside a BATCH placement, newest first.
   *
   *  `placeOrders` / `placeOrdersFor` only — the singular entry points revert, and a
   *  revert discards its logs, so a singular placement leaves no row here. Nothing here
   *  has an `Order` row either: a rejected request never rested and never filled. Map a
   *  row back to what was sent with `requestIndex`.
   *
   *  `reason` is the decoded name and is null for a member this SDK version does not know;
   *  `reasonRaw` always carries the index. The `reason` FILTER takes the index, so a
   *  caller can select a reason this SDK cannot yet name.
   */
  listPerpOrderRejections(opts?: {
    owner?: string;
    pool?: string;
    reason?: number;
    limit?: number;
    offset?: number;
  }): Promise<PerpOrderRejection[]>;

  /**
   *  The per-update history of perp positions, newest first: one row per position
   *  update, each with the PnL it realized.
   *
   *  MarginBank emits an update per order-book fill, per auto-deleveraging or market wind-down leg, and for
   *  both sides of a liquidation takeover, so this covers every way a position closes.
   *  Filter by `account`, `pool`, `txHash` or `kinds`. Pass `kinds: ["REDUCE", "CLOSE",
   *  "FLIP"]` for the updates that realized PnL. One order that fills across several book
   *  levels makes several rows; group them by `account`, `pool` and `orderId` to show one
   *  trade.
   *
   *  Sorted in chain order (`blockNumber`, then `logIndex`), a total order. The table is
   *  live, so offset paging is approximate.
   *
   * @throws {@link InvalidInputError} `limit`, `offset`, `from` or `to` is out of range.
   *  The complete union is {@link SomniaMarketsClientListPerpPositionChangesError}.
   * @throws {@link IndexerError} The indexed read did not complete.
   * @throws {@link IndexerUnavailableError} The indexer could not be reached.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   *
   * @example Show a trader's closed trades
   * ```ts
   * const closes = await client.listPerpPositionChanges({
   *   account,
   *   kinds: ["REDUCE", "CLOSE", "FLIP"],
   *   limit: 20,
   * });
   * for (const c of closes) {
   *   console.log(c.txHash, c.kind, c.closedSize, c.realizedPnl);
   * }
   * ```
   */
  listPerpPositionChanges(opts?: ListPerpPositionChangesOptions): Promise<PerpPositionChange[]>;

  /**
   *  The position update each of an account's perp fills made: one entry per fill, in the
   *  same order, or `null`. It is what lets a trade history say "Open Long", "Close Short"
   *  or a flip rather than only buy or sell: read `kind`, and the side from the sign of
   *  `sizeBefore` for a close or `sizeAfter` for an open.
   *
   *  Pass one page of the account's fills, for example from `getUserFillsPage`, at most
   *  1,000. The read asks the indexer for the account's updates in those fills'
   *  transactions: one request for every 100 transactions, plus one more for every
   *  further 1,000 updates they hold. It pairs each fill with the update MarginBank
   *  emitted just before it for the same pool and the account's order.
   *
   *  `null` means the fill is not the account's, is not a perp fill, or its update is not
   *  indexed, so show the fill's own side instead. A fill with no log position, such as a
   *  row the caller built, is `null` too.
   *
   * @throws {@link InvalidInputError} `account` is empty, or `fills` is not an array of at most 1,000.
   *  The complete union is {@link SomniaMarketsClientListPerpPositionChangesForFillsError}.
   * @throws {@link PerpPositionChangesUnavailableError} The indexer predates position
   *  changes. Retrying cannot help until it is reindexed; show the fills' own sides.
   * @throws {@link IndexerError} The indexed read did not complete.
   * @throws {@link IndexerUnavailableError} The indexer could not be reached.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   *
   * @example Label a page of perp fills
   * ```ts
   * const page = await client.getUserFillsPage(account, { marketType: "PERP", limit: 50 });
   * const changes = await client.listPerpPositionChangesForFills(account, page.fills);
   * page.fills.forEach((fill, i) => {
   *   console.log(fill.id, changes[i]?.kind ?? "no update", changes[i]?.sizeAfter);
   * });
   * ```
   */
  listPerpPositionChangesForFills(account: string, fills: readonly FillRow[]): Promise<(PerpPositionChange | null)[]>;

  /**
   * Lists funding-rate history through the compatibility alias.
   *
   * @deprecated Use {@link listFundingRateHistory} instead. This alias forwards verbatim.
   */
  getFundingRateHistory(
    pool: string,
    opts?: { limit?: number; offset?: number; from?: number | bigint; to?: number | bigint },
  ): Promise<FundingRateUpdate[]>;

  /** A perp pool's open-interest history, newest first — paginated. */
  getOpenInterestHistory(pool: string, opts?: { limit?: number; offset?: number }): Promise<OpenInterestSnapshot[]>;

  /**
   *  An account's perp positions across every pool, newest-updated first — ONE
   *  round-trip, replacing a chain read per market.
   *
   *  A snapshot as of each row's `updatedAtBlock`, NOT marked to market: unrealized
   *  PnL, liquidation price and margin health all still need a chain read.
   *  `entryFundingIndex` is not selected — the deployed Hasura schema does not carry
   *  it yet — so anything funding-sensitive belongs on {@link getPerpPosition}.
   *
   *  Size-0 (fully closed) rows are excluded unless `includeFlat` — upserted rows
   *  are never deleted, so closed positions linger forever. An empty array means the
   *  indexer has no rows, not that the account is flat.
   */
  listPerpPositions(
    account: string,
    opts?: { pool?: string; includeFlat?: boolean; limit?: number; offset?: number },
  ): Promise<IndexedPerpPosition[]>;

  // ------------------------------------------------------------------
  // Chain reads — one eth_call round-trip, current to head
  // ------------------------------------------------------------------

  /**
   * Read a binary pool's resting book from the contract (`getBookLevels`,
   * both sides in one pipelined round-trip), 4-sided like the live variant.
   * Use when the tail isn't running or as a checksum. A live watch can serve
   * render and quote paths without another chain read.
   *
   * A binary pool can be recycled onto another market. This pool-keyed read
   * has no `marketId` guard, so an address saved for an older market can return
   * the next market's book. If you hold a `marketId` and have an active watch,
   * use {@link getLiveBinaryOrderBookByMarket} to avoid showing that book.
   * For a chain-only snapshot, read the selected market with `getMarketOnchain`,
   * compare its pool's binding with the selected id, and pass that binding's
   * `blockNumber` plus the market's collateral `decimals` to this read.
   * Return no book when the binding is absent or differs:
   *
   * ```ts
   * const market = await client.getMarketOnchain(marketId);
   * const binding = await client.getPoolMarketBinding(market.pool);
   * const book = binding?.marketId.toLowerCase() === marketId.toLowerCase()
   *   ? await client.getBinaryOrderBook(market.pool, {
   *       blockNumber: binding.blockNumber,
   *       decimals: market.decimals,
   *     })
   *   : null;
   * ```
   *
   * **Details**
   *
   * - `opts.depth`: Price levels per side (default 10).
   * - `opts.decimals`: Price scale decimals for the NO-side inversion (default 6).
   * - `opts.blockNumber`: Pin both sides to this block. Omitted: select one head.
   * Successful empty books retain the pin. This is an exact chain snapshot.
   *
   * @throws {@link InvalidInputError} If depth or the block pin is invalid.
   * @throws {@link NotConfiguredError} If the owner has no chain endpoint, or its RPC serves a retired genesis of the chain.
   * @throws {@link RpcError} If selecting the head or reading either side fails.
   * @throws {@link ContractRevertError} If the contract rejects either read.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getBinaryOrderBook(pool: Address, opts?: GetBinaryOrderBookOptions): Promise<BinaryOrderBook>;

  /**
   *  Read a spot OR perp pool's resting book from the contract (both ride the
   *  shared OrderBook base). Live variant: {@link getLiveSpotOrderBook}.
   *
   * **Details**
   *
   * - `opts.depth`: Levels per side (default 12).
   * - `opts.blockNumber`: Pin both sides to this block. Omitted: select one head.
   * Successful empty books retain the pin.
   *
   * @throws {@link InvalidInputError} If depth or the block pin is invalid.
   * @throws {@link NotConfiguredError} If the owner has no chain endpoint, or its RPC serves a retired genesis of the chain.
   * @throws {@link RpcError} If selecting the head or reading either side fails.
   * @throws {@link ContractRevertError} If the contract rejects either read.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getSpotOrderBook(pool: Address, opts?: GetSpotOrderBookOptions): Promise<SpotOrderBook>;

  /**
   *  One order's state at chain head, by `(pool, orderId)` — ids are unique per
   *  pool. Reads your own writes: answers from the block a placement landed in,
   *  while the indexed {@link getOrders} may still lag. `null` when the pool has
   *  no ACTIVE order for that id (never assigned, filled, cancelled, expired-and-swept,
   *  or replaced by an amend, which re-places under a NEW id; a `reduceOrder` keeps its
   *  id and stays active) - the indexer is the surface that keeps history.
   *
   *  `opts.blockNumber` reads at the end of that block instead - historical order
   *  state, for a consumer decoding `OrderFilled` from chain logs. That event carries
   *  the fill's own `fillPrice` (which IS the maker's resting price), `quantityFilled`
   *  and `makerRemainingQuantity`, so take those from the event; what it does not carry
   *  is the maker's SIDE, and the fill removes the maker order in the same transaction,
   *  so the last height holding it is `fill.blockNumber - 1n`.
   *
   *  That read is exact for the maker's identity - `isBid`, `owner`, `userData`,
   *  `expireTimestampNs`, none of which any fill log carries - and BLOCK-LEVEL for BOTH
   *  quantities: an earlier transaction in the fill's own block may have filled this
   *  maker, or reduced it (`reduceOrder` decrements `fullQuantity` and
   *  `quantityRemaining` together, under the same id), and no block read sees between
   *  transactions.
   *
   *  Two edges answer plausibly rather than failing: a PARTIAL fill leaves the order
   *  in place with a smaller `quantityRemaining`, so reading at the fill's own block
   *  succeeds with different numbers; and an order placed and filled inside ONE block
   *  is absent at `blockNumber - 1n`, so that read is `null` and the placement has to
   *  come from the same block's `OrderPlaced`. A pinned read far behind head needs
   *  archive state.
   *
   *  ```ts
   *  // A fill's side, for a maker this process never saw rest.
   *  const maker = await client.getOrderOnchain(pool, makerOrderId, { blockNumber: fillBlock - 1n });
   *  // `null` is an UNRESOLVED side, not a sell: an order placed and filled inside one
   *  // block has no state one block earlier, and its side is in that block's OrderPlaced.
   *  const takerBought = maker === null ? null : !maker.isBid;
   *  ```
   *
   * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
   * @throws {@link NotConfiguredError} If the owner has no chain endpoint, or its RPC serves a retired genesis of the chain.
   * @throws {@link RpcError} If the read fails.
   * @throws {@link ContractRevertError} If the contract rejects the read for any
   *  reason other than the id having no active order.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getOrderOnchain(pool: Address, orderId: bigint, opts?: GetOrderOnchainOptions): Promise<OnchainOrder | null>;

  /**
   *  Top of book for many markets, read from POOL STATE at ONE pinned block —
   *  the chain-sourced sibling of {@link getBookTops}.
   *
   *  Prefer this wherever a quote must not lag: a board, a selector, a mark for
   *  open positions. {@link getBookTops} stays the cheaper read (one indexed
   *  round-trip, no chain dependency) for an unbounded list that tolerates
   *  indexer lag.
   *
   *  Pass the market rows a view already holds — each supplies its own
   *  `poolAddress`, so nothing is resolved twice. `tops` is keyed by lowercased
   *  market id and omits empty-book markets, exactly as {@link getBookTops}
   *  does, so the two are comparable key for key. Cost is two reads per market
   *  where the chain declares no Multicall3; keep the set to what a view shows.
   *
   * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
   * @throws {@link NotConfiguredError} If the owner has no chain endpoint, or its RPC serves a retired genesis of the chain.
   * @throws {@link RpcError} If the read fails.
   * @throws {@link ContractRevertError} If a pool rejects the read.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getBookTopsOnchain(
    markets: { id: string; poolAddress: Address }[],
    opts?: GetBookTopsOnchainOptions,
  ): Promise<BookTopsOnchain>;

  /**
   *  An owner's open order ids at chain head, or at a pinned block. Any address
   *  may be asked about — the pool's view reads `msg.sender` and this
   *  impersonates via the `eth_call` sender, so no signer is involved. Indexed
   *  counterpart, with human units and history: {@link getOpenOrders}. For the
   *  full rows rather than the ids, use {@link getOpenOrdersOnchain}.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getOwnOpenOrdersOnchain(pool: Address, owner: Address, opts?: GetOwnOpenOrdersOnchainOptions): Promise<bigint[]>;

  /**
   *  One owner's full open-order rows across several pools, read from chain at
   *  ONE pinned block.
   *
   *  This is the outage-resilient companion to {@link getOpenOrders}, which is
   *  an indexer read: it throws `IndexerError` while the indexer is unreachable
   *  and lists stale rows while it lags. Point a bot that must know what it has
   *  resting at this read instead of wrapping the indexed one in a catch.
   *
   *  The caller supplies the pool list; there is no discovery, because resolving
   *  pools by symbol is itself an indexer read. Rows carry `isBid` and no YES/NO
   *  side, no market or symbol, and no history — see the function's own TSDoc
   *  for why the binary side is not derivable.
   *
   *  A pool with no resting orders contributes no rows. A failed read throws.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getOpenOrdersOnchain(
    pools: Address[],
    owner: Address,
    opts?: GetOpenOrdersOnchainOptions,
  ): Promise<OpenOrdersOnchain>;

  /**
   *  One page of every open order on one side, at chain head — the per-order
   *  detail the aggregated book reads ({@link getBinaryOrderBook},
   *  {@link getSpotOrderBook}) collapse into levels. The pool accepts this view
   *  only from the zero address, so a configured signer is never forwarded. Loop
   *  while `hasMore`, feeding `nextCursor` back as `cursor`; pin a block if pages
   *  must be mutually consistent.
   *
   * **Details**
   *
   * - `opts.maxCount`: Orders per page (default 100).
   * - `opts.blockNumber`: Read at that exact block instead of the current head,
   *   so every page of a multi-page snapshot sees one book. Sample a head with
   *   `getBlockNumber` and pass it to every page.
   *
   * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getAllOpenOrdersOnchain(
    pool: Address,
    opts: { isBid: boolean; maxCount?: number; cursor?: bigint; blockNumber?: bigint },
  ): Promise<{ orders: OnchainOrder[]; hasMore: boolean; nextCursor: bigint }>;

  /**
   * Reads a perp pool's live prices, funding and open interest at one block.
   * Use this complete chain snapshot when the indexed funding row is too old.
   *
   * **Details**
   *
   * The fixed ten-view Multicall3 aggregate sends one `eth_call`. Owner, client
   * and chain batch settings cannot split it. A declared positive Multicall3
   * deployment height also requires one head lookup. The aggregate uses that head.
   * Without a deployment-height check, the aggregate alone supplies atomicity.
   *
   * Missing Multicall3 capability, a missing multicall action, or a sampled head
   * before deployment uses ten individual reads with one sampled block pin.
   * RPC, revert and decode failures never trigger this fallback. Every started
   * fallback read settles before a failed snapshot rejects.
   *
   * **Gotchas**
   *
   * The read is all-or-nothing. A bare index-price oracle revert rejects the
   * complete snapshot. A stale mark feed instead returns `markPriceOk: false`.
   * This read accepts no signal and does not use the configured indexer signal
   * to cancel RPC. Closing the owner releases its socket; a pending read then
   * rejects with `RpcError`. Unexpected SDK mapping failures reject with
   * `InvariantError` and retain the exact original failure in `cause`. Already-typed
   * SDK errors retain their identity. See {@link SomniaMarketsClientGetPerpStateError}.
   *
   * @throws {@link NotConfiguredError} Synchronously when no WebSocket endpoint
   * is configured, or asynchronously when the RPC serves a retired chain genesis.
   * @throws {@link RpcError} When the genesis check, head lookup, aggregate or
   * individual read fails, including transport closure or unusable RPC return data.
   * @throws {@link ContractRevertError} When the pool or its oracle rejects a read.
   * @throws {@link InvariantError} When the SDK cannot map its decoded snapshot.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpState(pool: Address): Promise<PerpStateOnchain>;

  /**
   *  Is a perp pool's mark feed live, and how much open interest is riding on it — the
   *  pair a mark-feed monitor needs, with the index timestamp as best-effort corroboration.
   *
   *  Prefer this to {@link getPerpState} for MONITORING a feed. That read is
   *  all-or-nothing and one of its legs is a bare `IOracle.getPrice()`, so a dead oracle
   *  rejects the whole call and the mark verdict is lost in exactly the case it is wanted.
   *  Here the verdict cannot be taken down by the oracle: `tryGetMarkPrice` reports
   *  staleness rather than reverting, open interest consults no oracle, and only the index
   *  timestamp — which arrives `undefined` instead — is allowed to fail.
   *
   *  Read {@link getPerpState} instead when you want the full pricing and funding picture
   *  and a dead oracle is a legitimate reason to fail the call.
   *
   * @throws {@link NotConfiguredError} No WebSocket endpoint is configured — `wsRpcUrl`,
   *  or a chain whose `rpcUrls` carry one. Raised when this read resolves its client,
   *  before any request goes out.
   * @throws {@link RpcError} A chain read did not complete — the block pin included.
   * @throws {@link ContractRevertError} The pool rejected the mark or open-interest read.
   *  A reverting INDEX read is NOT among these: it is swallowed by design and surfaces as
   *  an absent `indexUpdatedAt`. The complete union is
   *  {@link SomniaMarketsClientGetPerpFeedStatusError}.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpFeedStatus(pool: Address): Promise<PerpFeedStatus>;

  /**
   *  A perp pool's funding-premium state: what the next settlement will charge, the
   *  standing instantaneous sample, and the raw accumulator behind them.
   *
   *  Separate from {@link SomniaMarketsClient.getPerpState | getPerpState} on purpose —
   *  these getters arrived with Wave 28 and do not exist on an older pool implementation,
   *  and `getPerpState` batches with `allowFailure: false`, so folding them in would let
   *  one un-upgraded pool take a core read down.
   *
   *  Read `timeWeightedPremium` for a predicted funding rate, never `lastObservedPremium`
   *  — the contract getter behind the latter kept its signature and changed its meaning.
   *  Check `armed` before calling the figure an average.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpFundingPremium(pool: Address): Promise<PerpFundingPremium>;

  /**
   *  An account's position in one perp pool, from the MarginBank (signed size:
   *  positive = long). `ref.marginBank` comes off the {@link PerpMarket} row.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpPosition(ref: PerpPositionRef): Promise<PerpPosition>;

  /**
   *  An account's cross-margin state (free/locked collateral, equity,
   *  withdrawable, active pools) from the MarginBank — now including the account
   *  health (`imReq`/`mmReq`/`cmReq`) and `marginStatus`. The client samples the
   *  chain head once and pins every component read to that block, so all fields
   *  describe one chain state.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getMarginAccount(marginBank: Address, account: Address): Promise<MarginAccount>;

  /**
   *  An account's cross-margin health alone (equity vs IM/MM/CM + the derived
   *  status) — a lighter read than {@link getMarginAccount} when only health matters.
   *  The health tuple and status are pinned to one sampled chain block.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getAccountHealth(marginBank: Address, account: Address): Promise<AccountHealth>;

  /**
   *  An account's live equity for one scope, read at one block.
   *
   *  Use it to score an account, for example in a trading competition. Take one
   *  snapshot at the start and one at the end, and compare `totalEquity`. The read
   *  has no history, so store each snapshot yourself.
   *
   *  The change between two snapshots includes deposits, withdrawals, credit-voucher
   *  grants and collateral that an order pulled from a wallet. Remove those flows
   *  before you call the change a trading gain. {@link getMarginEvents} and
   *  {@link listPerpMarginPulls} list them, and {@link listPerpMainFundingEvents}
   *  kind `Returned` lists principal sent back to a main wallet. Do not add its
   *  `Funded` rows: each one repeats a `Main` pull.
   *  These reads cannot be bounded to a block yet, so a flow close to either
   *  snapshot cannot be placed exactly.
   *
   *  Chain tier. Only `scope: "perps"` is supported.
   *
   *  Pass `params.blockNumber` to read at a fixed block instead of the head, for
   *  example to read many accounts at one block or to fill a snapshot that was
   *  missed. The RPC must still serve state at that block.
   *
   *  **Gotchas**
   *
   *  `equity` counts free collateral only. A resting order moves collateral to
   *  `lockedCollateral`, so `equity` alone drops when an account places a limit
   *  order. `totalEquity` is the sum of both.
   *
   *  A market with no fresh mark price makes the read throw. It never returns a
   *  partial or zero equity.
   *
   * @throws {@link InvalidInputError} `params.scope` is not a known scope, or the scope is `"perps"` and `account` or `params.marginBank` is not an address or `params.blockNumber` is not a non-negative bigint.
   * @throws {@link NotSupportedError} `params.scope` is `"spot"` or `"overall"`.
   * @throws {@link NotConfiguredError} `params.scope` is `"perps"` and the owner has no chain WebSocket endpoint, or its RPC serves a retired genesis of the chain.
   * @throws {@link RpcError} A chain read did not complete.
   * @throws {@link ContractRevertError} The MarginBank rejected a read, for example when a market the account holds has no fresh mark price.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getAccountEquity(account: Address, params: GetAccountEquityParams): Promise<AccountEquity>;

  /**
   *  {@link getAccountEquity} for many accounts, all read at one block.
   *
   *  Use it to snapshot a cohort. It batches the reads through Multicall3 when the
   *  chain declares one, so the request count does not grow with every account.
   *  At most 8 requests are in flight at once, whatever the cohort size.
   *  Results are in input order.
   *
   *  Chain tier. Only `scope: "perps"` is supported.
   *
   *  **Gotchas**
   *
   *  An account that holds a market with no fresh mark price comes back as
   *  `{ priceable: false }` and does not fail the other accounts. Never read it
   *  as zero equity.
   *
   * @example Score a cohort at one block, then value a late entry at that SAME block.
   * ```ts
   * const cohort = await client.listAccountEquities(accounts, { scope: "perps", marginBank });
   * const scores = new Map<Address, bigint>();
   * for (const entry of cohort) {
   *   // Narrow first: an unpriceable account has no equity, not a zero.
   *   if (!entry.priceable) {
   *     console.warn(entry.account, "unpriceable at block", entry.asOfBlock);
   *     continue;
   *   }
   *   scores.set(entry.account, entry.totalEquity);
   * }
   * // Every row carries the one block the cohort was read at. Reuse it, so an
   * // account added later is valued against the same chain state as the rest.
   * const asOfBlock = cohort[0]?.asOfBlock;
   * if (asOfBlock !== undefined) {
   *   const [late] = await client.listAccountEquities([lateAccount], {
   *     scope: "perps",
   *     marginBank,
   *     blockNumber: asOfBlock,
   *   });
   *   if (late?.priceable) scores.set(late.account, late.totalEquity);
   * }
   * ```
   *
   * @throws {@link InvalidInputError} `params.scope` is not a known scope, or the scope is `"perps"` and an account or `params.marginBank` is not an address or `params.blockNumber` is not a non-negative bigint.
   * @throws {@link NotSupportedError} `params.scope` is `"spot"` or `"overall"`.
   * @throws {@link NotConfiguredError} `params.scope` is `"perps"` and the owner has no chain WebSocket endpoint, or its RPC serves a retired genesis of the chain.
   * @throws {@link RpcError} A chain read did not complete.
   * @throws {@link ContractRevertError} The MarginBank rejected a read.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  listAccountEquities(accounts: readonly Address[], params: GetAccountEquityParams): Promise<AccountEquityEntry[]>;

  /**
   *  Estimated liquidation price for an account's position in one perp pool (raw
   *  quote units per whole base), or null when flat. Solves `equity == mmReq` with
   *  BOTH sides moving against the mark — see `perpLiquidationPrice` — over the
   *  cross-margin equity/mmReq, so it is the price at which this pool's move alone
   *  trips maintenance. Throws on a stale mark anywhere in the account.
   *
   *  This is where liquidation *triggers*. For the contract's own figure of where a
   *  position's equity is *exhausted*, see {@link getBankruptcyPrice}.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getLiquidationPrice(ref: PerpPositionRef): Promise<bigint | null>;

  /**
   *  An account's realized leverage at one position and across the whole cross-margin
   *  account, plus every ceiling that bounds it — the market's IMF-implied max, the
   *  account's own cap, the protocol limit, and the credit-voucher confinement. Ratios
   *  are bps of 1x.
   *
   *  Derived, not read: the MarginBank exposes only leverage *caps*, never a
   *  measurement of a position.
   *
   *  The ceilings are returned as stored and do not compose by taking a minimum — see
   *  {@link PerpLeverage.voucherLeverageCapX}. For whether a specific order passes,
   *  use `previewPerpOrderMargin`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpLeverage(ref: PerpPositionRef): Promise<PerpLeverage>;

  /**
   *  One position, marked — unrealized PnL, accrued funding, notional, the three
   *  margin requirements it contributes, and its return on margin. Two reads, pinned
   *  to one block.
   *
   *  The split `getAccountHealth` cannot give you: that returns one equity figure for
   *  the whole account, with every market's PnL and funding already summed and netted,
   *  so a two-position trader cannot see which one carries the loss and cannot see
   *  funding at all.
   *
   *  `accruedFunding` is **owed** — positive means the account pays. Returns
   *  `{ priceable: false }` on a stale mark rather than throwing, because in a
   *  positions table one dead feed must degrade one row, not the page.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpPositionAnalytics(ref: PerpPositionRef): Promise<PerpPositionAnalytics>;

  /**
   *  Every position the account holds, each marked — the positions-table read.
   *
   *  `1 + 2n` reads for `n` active markets, all pinned to ONE block, which is the
   *  point of having it rather than looping the single read: unpinned, the rows come
   *  from different heights and their `equityContribution`s do not re-sum to any
   *  equity the account ever had.
   *
   *  Scoped to the bank's own `activePerpPools`, so a closed position does not linger
   *  the way it does on the indexed rows.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  listPerpPositionAnalytics(p: { marginBank: Address; account: Address }): Promise<PerpPositionAnalytics[]>;

  /**
   *  The largest order this account can place at `price` — what a **Max** button should
   *  call. The inverse of `previewPerpOrderMargin`, and the protocol has no such view.
   *
   *  Does not re-derive the sizing rule: it binary-searches the forward one, so the two
   *  cannot disagree. A hand-rolled `equity / (price × imf)` drops the adverse
   *  mark-to-entry term, which is the usual reason a "max" order is rejected.
   *
   *  `maxQuantity` is aligned down to the pool's lot grid. **Check `placeable`** — a
   *  size below the pool's `minQuantity` is a revert, not a small order. `limitedBy`
   *  says which gate bound it. Market-wide `maxOpenInterest` and book depth are
   *  deliberately not modelled.
   *
   *  **Pass `autoPull` when the transaction sender will be the order owner.** That is
   *  the pool's whole gate for topping the account up from its wallet (T70), and with it
   *  on, an account with an empty bank and a funded, approved wallet goes from a max of
   *  `0n` to whatever the wallet funds. Leave it off for `placeOrderFor`, an operator
   *  grant or the stop registry, where no pull happens.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getMaxPerpOrderSize(p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    price: bigint;
    autoPull?: boolean;
    builderFeeBpsTimes1k?: bigint;
  }): Promise<PerpMaxOrderSize>;

  /**
   *  What closing a position — all of it or part — would actually realise. Backs a close
   *  modal.
   *
   *  Two things it gets right that a hand-derived figure usually does not, both silent:
   *  the close is **aligned down to the lot grid** first, so a "close all" on a position
   *  that is not a lot multiple leaves a remainder open; and funding settles on the
   *  **whole** position rather than the closed share, because `settleTrade` settles
   *  before it touches the position.
   *
   *  `netProceeds` is the number to show — `realizedPnl − fundingSettled − fee`.
   *  `fundingSettled` is positive when the account pays.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  previewPerpClosePnl(p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    quantity?: bigint;
    price?: bigint;
    asMaker?: boolean;
  }): Promise<PerpClosePreview>;

  /**
   *  Where a proposed order would leave the liquidation price if it filled in full at
   *  its limit price, alongside where it sits now — the projection an order form needs,
   *  which {@link getLiquidationPrice} cannot give for an order not yet placed.
   *
   *  Ports all four of `MarginBank.settleTrade`'s cases (open / increase / reduce /
   *  flip) and charges the fill's fee, so a reduce and an add move the answer in
   *  opposite directions. Whether the order is ACCEPTED is
   *  {@link previewPerpOrderMargin}'s question, not this one.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  previewPerpLiquidationPrice(p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    quantity: bigint;
    price: bigint;
    asMaker?: boolean;
  }): Promise<PerpLiquidationPreview>;

  /**
   *  Every account holding an open position on one side of one perp market, from
   *  the MarginBank's own per-(pool, side) holder array — the read that lets a
   *  liquidation keeper find its watch set from head state alone, no off-chain
   *  indexer.
   *
   *  Chain tier. Pages through the bank's bounded slice view (many holders per
   *  round-trip, never one call per holder), with every page pinned to ONE block
   *  — `opts.blockNumber`, or the head sampled once — so a holder entering or
   *  leaving mid-walk can neither be missed nor double-counted. The result
   *  carries `asOfBlock`; feed it into {@link getBankruptcyPrice}'s
   *  `opts.blockNumber` (and the other side's call) to keep a sweep on one
   *  consistent snapshot — the other position/health reads answer at head only.
   *
   *  The indexed counterpart, {@link listPerpPositions}, answers the inverse
   *  question (one account's positions across pools) and lags head.
   *
   * **Details**
   *
   * - `opts.blockNumber`: pin to this block instead of the current head
   * - `opts.pageSize`: holders per contract call (default 1000)
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpSideHolders(ref: PerpSideHoldersRef, opts?: GetPerpSideHoldersOptions): Promise<PerpSideHolders>;

  /**
   *  The MarginBank's OWN bankruptcy price for an account's position in one perp
   *  pool (raw quote units per whole base) — the contract-computed price at which
   *  the position's allocated equity is exhausted. What a liquidation keeper
   *  prices a bankrupt position against.
   *
   *  A different quantity from {@link getLiquidationPrice}, not a better version
   *  of it: that is the SDK's client-side estimate of where liquidation
   *  *triggers* (use it for UI/monitoring); this is the contract's figure for
   *  where there is nothing left (use it for anything that settles or bids).
   *
   *  Reverts rather than returning a sentinel — a {@link ContractRevertError}
   *  with `errorName: "NoOpenPosition"` when the account is flat in that pool
   *  (branch on `errorName`, never message text).
   *
   * **Details**
   *
   * - `opts.blockNumber`: read at this block instead of head. Pricing an enumerated holder? Pass the enumeration's `asOfBlock` — at head, a holder that closed after the snapshot reverts `NoOpenPosition`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getBankruptcyPrice(ref: PerpPositionRef, opts?: GetBankruptcyPriceOptions): Promise<bigint>;

  /**
   *  How the perps stack is wired — the address book for every other contract in the
   *  plane (collateral token, pool factory, liquidation engine, insurance fund, fee
   *  recipient), plus the protocol-wide leverage ceiling and a `fullyWired` flag.
   *
   *  Read this first: the addresses here are what the other protocol-state reads
   *  should be pointed at, so nothing is hardcoded per chain, and they are the bank's
   *  own view — the addresses it will actually call.
   *
   *  `liquidationEngine` is the PROXY. An implementation address answers reads with
   *  unset defaults (zero bidders, zero penalty), which looks like a configured-but-idle
   *  engine rather than the wrong address.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpSystemConfig(marginBank: Address): Promise<PerpSystemConfig>;

  /**
   *  The InsuranceFund's per-tier balances and the total bad debt it can absorb.
   *  Point it at `insuranceFund` from {@link getPerpSystemConfig}.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getInsuranceFundState(fund: Address): Promise<InsuranceFundState>;

  /**
   *  The InsuranceFund's tier ledger, newest first — how each tier reached the balance
   *  {@link getInsuranceFundState} reports. Indexer tier; the chain keeps no history.
   *
   *  **Do not sum `amount` bare.** It is populated on inflows, outflows and the internal
   *  `TierAllocated` move alike, so a plain total is turnover rather than a balance — fold
   *  it by `kind`. `covered` on a `BadDebtAuthorised` row restates the `TierDebited` rows
   *  beside it, and `TierCredited` restates the fee plane's `insurancePortion`.
   */
  listPerpInsuranceFundEvents(opts?: {
    kind?: string;
    tier?: number | bigint;
    account?: string;
    limit?: number;
    offset?: number;
  }): Promise<PerpInsuranceFundEvent[]>;

  /**
   *  The LiquidationEngine's configured bounds — penalty, spread range, per-block
   *  volume cap, registered backstop bidders. Not its history, which is indexed as
   *  `LiquidationEvent`.
   *
   *  `bidderCount === 0n` is an operational signal: with no registered bidders the
   *  takeover stage has nobody to take a position over, so the waterfall reaches ADL
   *  sooner than the configuration implies.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getLiquidationEngineConfig(engine: Address): Promise<LiquidationEngineConfig>;

  /**
   *  An account's equity, or `null` when it could not be computed.
   *
   *  {@link getAccountHealth} propagates an oracle failure, which is exactly when a
   *  health sweep most needs an answer. Null means "not computable right now" — an
   *  unpriceable market in the account's set — never "zero equity".
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  tryGetPerpAccountEquity(marginBank: Address, account: Address): Promise<bigint | null>;

  /**
   *  Collateral BACKING an account: `max(0, unlocked + locked)`, raw units.
   *
   *  Deliberately unlike equity — one storage pair, no market walk, no oracle, and it
   *  cannot revert. A solvency floor that survives a dead price feed; use equity when
   *  you need mark-to-market truth.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpCollateralBasis(marginBank: Address, account: Address): Promise<bigint>;

  /**
   *  Every perp market the factory has deployed, in deployment order, with the two
   *  independent gates that decide whether it is tradeable: `restricted`
   *  (close-only) and `registered` (activated on the MarginBank).
   *
   *  **Do not build a market list from the factory's raw pool list** — that is the
   *  deployment history and includes markets wound down to close-only, so listing it
   *  unfiltered presents dead markets as tradeable.
   *
   *  Chain-sourced, which makes it complete and available when the indexer is not:
   *  the indexer builds its perp set dynamically from `PerpPoolDeployed`, so a pool
   *  deployed above its current head is invisible there and present here.
   *
   *  You do not pass a MarginBank. It is a per-network singleton in practice, but
   *  each pool names its own and that is the bank its settlement path uses — so it is
   *  read per pool and returned on every row, ready for the
   *  {@link getMarginAccount} / {@link getPerpPosition} reads that follow.
   *
   *  The optional owner `addresses.marginBank` is a candidate for faster reads.
   *  Modern status views plus usable Multicall3 take two serial rounds for up to
   *  50 pools: one atomic factory/block read, then both pool-bank and candidate
   *  registration reads. Larger sets use concurrent chunks of at most 100 calls.
   *  Each pool must name the candidate at that block before its result is used.
   *  A divergent bank needs an additional authoritative round. Without a candidate
   *  or usable Multicall3, reads remain bounded to 100 calls per aggregate or 8
   *  concurrent point reads. Legacy factories retain the same output shape.
   *  Every read describes one block. Failed per-pool reads produce unknown gates;
   *  missing registration views keep the bank, while operational failures report
   *  a zero bank. Required factory or block failures reject the listing.
   *
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} The owner has no chain transport or its RPC serves a retired genesis. A supplied owner RPC constructor or socket member can also raise it; its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} Required reads or the owner genesis check fail. A supplied owner RPC constructor or socket member can also raise it; its identity is retained.
   * @throws {ContractRevertError} A required contract view reverts. A supplied owner RPC constructor or socket member can also raise it; its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A decoded aggregate violates its expected shape. A supplied owner RPC constructor or socket member can also raise it; its identity is retained.
   *
   * **Example** (Supplying a candidate from deployment wiring)
   *
   * ```ts
   * const exchange = new SomniaMarkets({
   *   chain,
   *   addresses: { perpPoolFactory: factory, marginBank },
   * });
   * const statuses = await exchange.client.listPerpPoolStatuses({ factory });
   * await exchange.close();
   * ```
   */
  listPerpPoolStatuses(p: { factory: Address }): Promise<PerpPoolStatus[]>;

  /**
   * Just the tradeable perp pools, filtered from {@link listPerpPoolStatuses}.
   * Rejects if any row has unknown tradeability. Use the full status list to
   * display unresolved markets and their restriction gates.
   *
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} The owner has no chain transport or its RPC serves a retired genesis. A supplied owner RPC constructor or socket member can also raise it; its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} Required reads, genesis validation, or tradeability cannot be determined. A supplied owner RPC constructor or socket member can also raise it; its identity is retained.
   * @throws {ContractRevertError} A required contract view reverts. A supplied owner RPC constructor or socket member can also raise it; its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A decoded aggregate violates its expected shape. A supplied owner RPC constructor or socket member can also raise it; its identity is retained.
   */
  listTradeablePerpPools(p: { factory: Address }): Promise<Address[]>;

  /**
   *  One factory-deployed perp market as a native {@link PerpMarket} row, read
   *  entirely from the chain — for a market the indexer does not carry.
   *
   *  Chain tier. Reads the pool's book grid and margin factor, the base token's
   *  symbol and decimals, and the pool's stop registry from the factory.
   *  History-derived fields come back as documented placeholders, because no chain read
   *  can supply them — see {@link UnifiedMarket.indexed} for which ones and what they
   *  mean.
   *
   * **Gotchas**
   *
   * - Throws {@link RpcError} when a read cannot be completed, and {@link ContractRevertError} when the pool or token rejects one. The grid, the margin factor and the decimals have no safe fallback, so an unreadable pool fails rather than producing a mis-scaled market. Two reads degrade instead: a token exposing no `symbol()` yields `baseSymbol: null`, and a factory predating `IPerpPoolFactoryStopRegistry` yields `stopRegistry: null`.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  readPerpMarketFromChain(p: {
    status: PerpPoolStatus;
    collateralToken: Address;
    collateralDecimals: number;
    collateralSymbol: string | null;
    factory: Address;
  }): Promise<PerpMarket>;

  /**
   *  Whether the MarginBank has one perp pool registered — the activation gate on
   *  its own. Coming from the factory only proves a pool is authentic; registration
   *  is what makes it usable.
   *
   *  Not interchangeable with `getPoolTier`, which is itself gated on registration
   *  and so returns 0 for an uncovered-but-registered market and an unregistered one
   *  alike.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  isPerpPoolRegistered(p: { marginBank: Address; pool: Address }): Promise<boolean>;

  /**
   *  A perp market's static risk configuration — initial / maintenance / close-out
   *  margin in bps, the OI and position caps, and the maker/taker fee rates.
   *
   *  This is what makes a **projected** liquidation price possible.
   *  `maintenanceMarginBps` is exposed nowhere else — the indexed market row carries
   *  only `initialMarginBps` — so without it a client can show the real liquidation
   *  price of an open position but not the prospective one for an order it has not
   *  yet placed.
   *
   *  Reads frozen storage, so unlike {@link getPerpHealthSnapshot} it cannot revert
   *  on a stale oracle. Note `initialMarginBps` is only the curve's FLOOR when
   *  dynamic IMF is on — see {@link getEffectiveImfBps}.
   */
  /**
   *  What a perp order will lock and whether the pool will accept it, computed BEFORE
   *  sending — the read behind an order form's "margin required" row and submit gate.
   *
   *  Ports `PerpPool._computeLockAmount` plus the MarginBank gate it feeds, so the
   *  number shown is the number actually reserved.
   *
   *  **Why not a contract pre-check.** `quoteMeetsIMForOrder` looks right and is not:
   *  it runs with the order's base margin treated as already reserved, because on the
   *  real path the lock has run first. Called cold it counts the order's margin
   *  nowhere and returns true for almost any size. `meetsIMForFill` does charge base
   *  margin but models neither the lock nor its adverse mark-to-entry reserve — the
   *  term that rejects a naively-sized "max" order.
   *
   *  Reports **two gates** separately, because they fail for different reasons and
   *  imply different fixes: `hasCollateralForLock` (the lock can be taken at all) vs
   *  `meetsInitialMargin` (what remains still covers the requirement) — "deposit
   *  more" vs "close something".
   *
   *  Every read is pinned to one block; a preview is a statement about that block, so
   *  re-quote near send time for anything close to the edge.
   *
   *  **Pass `autoPull` when the transaction sender will be the order owner** — the pool's
   *  whole gate for topping the account up from its wallet (T70). With it on, both gates
   *  describe the post-pull balance. Off, they describe the in-bank balance alone, which
   *  is what an operator- or registry-routed placement actually faces.
   *
   *  `topUpRequired` is the total the pull REQUESTS, not one wallet's debit: a linked
   *  child is funded by its own wallet first and its main for the residual, so show
   *  `ownWalletPull` and `mainWalletPull` beside the margin figure and read
   *  `fundingPayer` for whose wallet the second one is. Only `mainWalletPull > 0n` proves
   *  another wallet actually moves.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  previewPerpOrderMargin(p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    quantity: bigint;
    price: bigint;
    autoPull?: boolean;
    builderFeeBpsTimes1k?: bigint;
  }): Promise<PerpOrderMarginPreview>;

  /**
   *  The MarginBank's initial-margin probe for an order not yet locked — the closest
   *  single contract call to a pre-trade gate. Charges the increasing leg's base
   *  margin against free equity, but does not model the lock's adverse
   *  mark-to-entry reserve; {@link previewPerpOrderMargin} is the accurate gate.
   *
   *  `additionalSize` is the INCREASING quantity, not necessarily the whole order.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  meetsPerpImForFill(p: {
    marginBank: Address;
    account: Address;
    pool: Address;
    additionalSize: bigint;
    price: bigint;
  }): Promise<boolean>;

  /**
   *  The MarginBank's placement-time initial-margin check, verbatim.
   *
   *  **Not a pre-trade gate, despite the name** — it treats the order's base margin as
   *  already reserved, so called cold it answers true for almost any size. Correct only
   *  for a caller that has already taken the lock, i.e. for mirroring the placement
   *  check itself. For "will my order be accepted", use
   *  {@link previewPerpOrderMargin}.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  quoteMeetsPerpImForOrder(p: {
    marginBank: Address;
    account: Address;
    pool: Address;
    additionalSize: bigint;
    price: bigint;
  }): Promise<boolean>;

  /**
   *  The MarginBank's auto-pull sizing, verbatim — how much placing an order would take
   *  from the owner's wallet.
   *
   *  **For an order form use `previewPerpOrderMargin` with `autoPull` instead.** It
   *  derives `lockAmount`, `feeHeadroom` and `increasingQuantity` from the order, which
   *  is the awkward part: they come from the POOL, not the bank, so calling this directly
   *  means reproducing the same three numbers the pool would pass. This is the
   *  cross-check on that port.
   *
   *  Returns `0n` both when no pull is needed and in the three cases where a pull would
   *  be wrong rather than unnecessary — a purely reducing order, an account already in
   *  debt, and a voucher-blocked increase — so read it beside the unlocked balance.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  quotePerpOrderTopUp(p: {
    marginBank: Address;
    pool: Address;
    account: Address;
    lockAmount: bigint;
    feeHeadroom: bigint;
    increasingQuantity: bigint;
    price: bigint;
  }): Promise<bigint>;

  /**
   *  The EXTRA initial margin an account's own leverage settings demand, summed over
   *  every market where it BOTH holds a position AND has set a stricter-than-market
   *  cap.
   *
   *  This explains an `InsufficientMarginForOrder` that {@link quotePerpOrderTopUp}
   *  cannot. The two measure different things: the quote funds one order against the
   *  UNLOCKED balance, while the admission gate measures whole-account EQUITY — so an
   *  order can be fully funded on its own market and still be refused because of an
   *  override on a different one. Deposit this deliberately rather than expecting a
   *  pull to cover it.
   *
   *  Reverts if a market that is both positioned and overridden is unpriceable; use
   *  {@link tryGetPerpLeverageImSurcharge} in a sweep.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpLeverageImSurcharge(marginBank: Address, account: Address): Promise<bigint>;

  /**
   *  {@link getPerpLeverageImSurcharge} without the revert — `null` when it could not
   *  be computed.
   *
   *  `null` means "not computable right now", never "no surcharge". Substituting `0n`
   *  would under-state the requirement, which is the wrong direction to be wrong in.
   *
   *  Only a revert from the view itself becomes `null`. A read that never reached
   *  the chain throws, and so does an address that does not declare the view.
   *
   * @throws {@link RpcError} The chain read did not complete, or `marginBank` does not declare the view.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  tryGetPerpLeverageImSurcharge(marginBank: Address, account: Address): Promise<bigint | null>;

  /**
   *  One account's own leverage cap for one perp pool, as the MarginBank stores it —
   *  the cheap path to the number {@link getPerpLeverage} reports as
   *  `accountMaxLeverageX`.
   *
   *  Chain tier, exactly one storage read. Unlike {@link getPerpLeverage} it does NOT
   *  walk the account, so a stale mark on some other market cannot take it down — the
   *  cap is a setting, not a measurement, and never needed a price. Use it for a
   *  per-position badge or a leverage dialog; use {@link getPerpLeverage} when the
   *  question is realized account-wide leverage.
   *
   *  `0` means "no account cap set", never zero leverage — the market ceiling binds
   *  then. Returned unchanged for the caller to compose.
   *
   * **Details**
   *
   * - `ref`: the (bank, account, pool) triple
   * - `opts.blockNumber`: read at this block instead of head. Combining the cap with an enumeration's or analytics row's figures? Pass that row's `asOfBlock` so both describe one moment.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getPerpMaxLeverage(ref: PerpPositionRef, opts?: GetPerpMaxLeverageOptions): Promise<number>;

  /**
   *  The registry the bank resolves wallet links through, or `null` while the
   *  linked-wallet funding rail is DORMANT.
   *
   *  Read it from the bank rather than a deployment manifest: the bank decides which
   *  registry is authoritative, and a registry nobody has armed is inert. `null` means
   *  no child can draw on any main on this deployment.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpLinkedWalletRegistry(marginBank: Address): Promise<Address | null>;

  /**
   *  Whether this account's next position-increasing order would spend a main's
   *  wallet, and whose.
   *
   *  A discriminated union, because the contract's single zero collapses three cases a
   *  UI must not render alike: the rail is dormant, the wallet is unlinked, or the
   *  wallet IS a main. Only `unlinked` is the user's to fix.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  quotePerpFundingPayer(marginBank: Address, account: Address): Promise<PerpFundingPayer>;

  /**
   *  Principal a main has funded into this account and not recovered, plus the payer
   *  recorded at funding time.
   *
   *  What a main funds can be borrowed, never withdrawn — `withdraw` frees at most
   *  `balance - principal`. The payer is SNAPSHOTTED, so it is who gets repaid even if
   *  the link has since changed.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpMainFunding(marginBank: Address, account: Address): Promise<PerpMainFunding>;

  /**
   *  What a wallet could contribute to a pull right now — `min(balance, allowance)`.
   *
   *  On a MAIN this is the ceiling on what its children can collectively draw, and the
   *  number to reduce to revoke the rail without unlinking (consent is the allowance).
   *  On a CHILD it is how much of its own money it burns before reaching its main's.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpWalletPullCapacity(marginBank: Address, wallet: Address): Promise<bigint>;

  /**
   *  A wallet's link group and its ADL-netting maturity.
   *
   *  Takes the REGISTRY address — resolve it with
   *  {@link getPerpLinkedWalletRegistry} so a dormant deployment reads as dormant
   *  rather than as an empty group. `maturesAt` gates ADL netting only: the funding
   *  rail reads the raw graph, so a link can be fundable and not yet mature.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpWalletLinkage(registry: Address, wallet: Address): Promise<PerpWalletLinkage>;

  /**
   *  Every child of a main, excluding the main — the isolated buckets one treasury
   *  currently serves.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  listPerpLinkedChildren(registry: Address, main: Address): Promise<readonly Address[]>;

  /**
   *  How many children one main may hold. Owner-tunable, so read it before offering to
   *  link another wallet rather than hardcoding the cap.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpMaxLinkedChildren(registry: Address): Promise<bigint>;

  /**
   *  The linked-wallet consent graph over time, newest first.
   *
   *  **The only way to see a PENDING proposal** — the registry exposes no getter for one,
   *  so a `Proposed` row with no later row for the same pair is an offer still standing.
   *
   *  Consent is not authority: a `Linked` row grants no power over funds by itself. Ask
   *  {@link quotePerpFundingPayer} whether an order would actually spend a main's wallet.
   */
  listPerpWalletLinkEvents(opts?: {
    main?: string;
    child?: string;
    kind?: string;
    limit?: number;
    offset?: number;
  }): Promise<PerpWalletLinkEvent[]>;

  /**
   *  Margin pulled to fund placements, newest first — the POOL side of the rail, and the
   *  side that names an ORDER.
   *
   *  One placement can produce TWO rows: `source: "OwnWallet"` for what the owner's own
   *  wallet covered, then `source: "Main"` for the residual drawn from their linked main.
   *  `amount` is what that leg pulled, not the order's total requirement.
   *
   *  **Never sum these with {@link listPerpMainFundingEvents}** — one pull emits a row on
   *  each side for the same wei.
   */
  listPerpMarginPulls(opts?: {
    account?: string;
    pool?: string;
    orderId?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<PerpMarginPull[]>;

  /**
   *  A main's claim against a child over time, newest first — the BANK side of the rail,
   *  carrying the running principal. The live claim is {@link getPerpMainFunding}.
   *
   *  `amount` is **null on `Settled`** and that is not missing data: the child's own losses
   *  discharged part of the claim, so no cash moved while `outstandingPrincipal` still
   *  fell.
   *
   *  **Never sum these with {@link listPerpMarginPulls}** — same wei, two sides.
   */
  listPerpMainFundingEvents(opts?: {
    account?: string;
    payer?: string;
    kind?: string;
    limit?: number;
    offset?: number;
  }): Promise<PerpMainFundingEvent[]>;

  /**
   *  The live credit-voucher campaign behind a MarginBank, or `null` when the bank has
   *  no credit granter.
   *
   *  A credit voucher is a one-time grant of house money into a new account's
   *  MarginBank balance. The grant is non-withdrawable; profit above it is. Use this
   *  read to show the offer: the grant, the claim window, how many claims the budget
   *  still covers, and the leverage a voucher account may use.
   *
   *  Chain tier, current to the RPC head. The bank names the distributor, so this
   *  read never needs a deployment address.
   *
   *  **Gotchas**
   *
   *  `null` means the programme is off on this deployment. It is not a read failure.
   *  An open window does not mean a claim succeeds: an empty budget
   *  (`claimsRemaining === 0n`) rejects every claim. Ask
   *  {@link getPerpVoucherEligibility} for one account's answer.
   *
   * - Throws {@link NotConfiguredError} - the client has no chain transport.
   * - Throws {@link RpcError} - a chain read did not complete.
   * - Throws {@link ContractRevertError} - a read reverted, for example because `marginBank` is not a MarginBank.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpVoucherCampaign(marginBank: Address): Promise<PerpVoucherCampaign | null>;

  /**
   *  Whether an account can claim a credit voucher now, and if not, why.
   *
   *  Use it before {@link Trader.claimPerpVoucher}. A claim that fails still mines
   *  and costs gas, because not every executor simulates before it sends. The
   *  reasons follow the distributor's own check order, so `reason` names the revert
   *  a claim would produce.
   *
   *  Chain tier. Every read is pinned to one block, and the claim window is checked
   *  against that block's timestamp.
   *
   *  **Gotchas**
   *
   *  `alreadyClaimed` is permanent for that address on this distributor. The limit is
   *  once per address for the distributor's life, not once per campaign.
   *
   *  `notFlat` includes resting orders, not only positions. The account must cancel
   *  every perp order before it can claim.
   *
   * - Throws {@link NotConfiguredError} - the client has no chain transport.
   * - Throws {@link RpcError} - a chain read, or the block read that pins them, did not complete.
   * - Throws {@link ContractRevertError} - a read reverted, for example because `marginBank` is not a MarginBank.
   * - Throws {@link InvariantError} - the node returned a latest block with no number.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpVoucherEligibility(marginBank: Address, account: Address): Promise<PerpVoucherEligibility>;

  /**
   *  One account's credit-voucher state, or `null` when the bank has no credit
   *  granter.
   *
   *  Use it to show how much of the account's balance is house money, and when that
   *  money can be swept back. `floor` is the part `withdraw` cannot take out.
   *
   *  Chain tier, current to the RPC head.
   *
   *  **Gotchas**
   *
   *  After `expiresAt`, anyone can sweep the floor back to the distributor, but only
   *  while the account holds no positions or resting orders. A sweep never forces a
   *  close. A claimed account with `floor === 0n` either lost the grant in trading or
   *  was swept.
   *
   * - Throws {@link NotConfiguredError} - the client has no chain transport.
   * - Throws {@link RpcError} - a chain read did not complete.
   * - Throws {@link ContractRevertError} - a read reverted, for example because `marginBank` is not a MarginBank.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpVoucher(marginBank: Address, account: Address): Promise<PerpVoucher | null>;

  /** Read the perpetual pool's margin, position, and fee limits from chain.
   * @param pool - The perpetual pool address.
   * @returns The pool's configured risk parameters.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpRiskParams(pool: Address): Promise<PerpRiskParams>;

  /**
   *  A perp market's live health inputs in one call — mark price, projected
   *  cumulative funding, the effective (OI-scaled) IMF, and the maintenance /
   *  close-out thresholds. The contract exposes this precisely so a cross-margin
   *  health walk reads a market once instead of making five getter calls.
   *
   *  Returns a discriminated union: an unpriceable market (stale or zero mark)
   *  arrives as `{ priceable: false }` rather than an all-zero struct, so a
   *  `maintenanceMarginBps` of 0 cannot be mistaken for "no maintenance
   *  requirement". Narrow on `priceable` before reading any field.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getPerpHealthSnapshot(pool: Address): Promise<PerpHealthSnapshot>;

  /**
   *  The initial-margin factor a perp market is charging right now, in bps —
   *  OI-scaled when dynamic IMF is enabled, otherwise the static base.
   *
   *  Sizing an order off `initialMarginBps` instead under-margins it whenever open
   *  interest has pushed the curve above its floor, and the pool rejects an order
   *  the client believed fit. Reverts if dynamic IMF is on and the index is stale.
   *  {@link getPerpHealthSnapshot} returns this alongside the rest for one
   *  round-trip.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getEffectiveImfBps(pool: Address): Promise<bigint>;

  /**
   *  Claimable balance an owner can withdraw from a pool's internal ERC20Vault for
   *  `token`, raw units — the value behind the append-only
   *  {@link getVaultPayoutFallbacks} history.
   *
   *  Reads at chain head. Pass `blockNumber` to pin it, which is what an answer
   *  combining this with other reads at one height needs: the balance is contract
   *  state behind an append-only payout history, so no indexed entity reconstructs
   *  it at a past height. A pinned read far behind head needs archive state.
   *
   *  ```ts
   *  const owed = await client.getVaultBalance({ vault: pool, owner, token: quote });
   *  const owedAt = await client.getVaultBalance({ vault: pool, owner, token: quote, blockNumber: 1_234n });
   *  ```
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getVaultBalance(p: GetVaultBalanceParams): Promise<bigint>;

  /**
   *  Whether `user` has opted out of wallet auto-pull on this SpotPool, at chain
   *  head — see `trader.setManualVaultMode`. True means their orders draw only on
   *  pre-deposited vault balance and their payouts stay as vault credit.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getManualVaultMode(p: GetManualVaultModeParams): Promise<boolean>;

  /**
   *  What an order of this shape would consume from `owner`, and how far short
   *  their vault balance falls (`delta`) — the pool's own worst-case funding
   *  envelope. In auto-pull mode `delta` is what the wallet gets pulled for; under
   *  manual vault mode it is what must be deposited first.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getAutoPullRequirement(p: GetAutoPullRequirementParams): Promise<AutoPullRequirement>;

  /**
   *  Whether `owner` authorized `operator` for `selector` on this SpotPool, at
   *  chain head — resolved through the pool's OperatorPermissionsRegistry, so no
   *  indexer lag.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  isOperatorAuthorized(p: IsOperatorAuthorizedParams): Promise<boolean>;

  /**
   *  Whether a GLOBAL operator grant is on record for this owner/operator/selector,
   *  at chain head — the raw slot `trader.setOperatorApprovalGlobal` writes.
   *
   *  Independent of pool registration and of denials, so `true` here does not mean
   *  the operator can act on a given pool. For that, use
   *  {@link isOperatorAuthorized}.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  isGloballyApproved(p: IsGloballyApprovedParams): Promise<boolean>;

  /**
   *  Whether a PER-POOL operator grant is on record, at chain head — the read-back
   *  for `trader.setOperatorApprovalForPool`.
   *
   *  Ignores any global grant and any denial. For the pool's resolved decision, use
   *  {@link isOperatorAuthorized}.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  isApprovedForPool(p: IsApprovedForPoolParams): Promise<boolean>;

  /**
   *  The OperatorPermissionsRegistry this SpotPool gates operator calls through, at
   *  chain head — or `null` when the pool is unwired and denies every operator call.
   *
   *  Discovery for a caller with no `addresses.operatorPermissionsRegistry`
   *  configured: the grant writes and the two grant reads need that address and
   *  otherwise throw {@link NotConfiguredError}, and no deployment manifest carries
   *  the key yet. A configured address still wins where it is used — this read adds a
   *  path, it does not redirect one.
   *
   *  The pool is the authority: its own gate consults this registry and no other, so a
   *  grant written elsewhere admits nobody here.
   *
   *  Failures. This read needs no address of its own, but it does need chain access,
   *  and every chain client is resolved lazily on first use — so it throws
   *  {@link NotConfiguredError} when neither `wsRpcUrl` nor the chain definition's own
   *  WebSocket endpoint exists. It throws {@link ContractRevertError} when the pool
   *  rejects the call, and {@link RpcError} when the read gets no answer — which is
   *  also what an EOA or any non-pool address produces, because an empty return is
   *  classified as a failed read rather than as a revert. `null` is an answer, never a
   *  failure.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getOperatorPermissionsRegistry(pool: Address): Promise<Address | null>;

  /**
   *  Base/quote `owner` has locked in this pool's resting orders. Pair with
   *  {@link getVaultBalance} to account for everything the pool holds for them.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getOwnLockedBalance(p: { pool: Address; owner: Address }): Promise<LockedBalance>;

  /**
   *  How the pool's reserves of each token split between resting orders and
   *  leftover — venue-health introspection, not a portfolio read.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getLockedTokenBreakdown(pool: Address): Promise<LockedTokenBreakdown>;

  /**
   *  Base→quote at a price using the pool's OWN ceil rounding — for interpreting
   *  {@link getLockedTokenBreakdown} without reimplementing it.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  convertToQuoteAtPriceCeil(p: { pool: Address; baseQuantity: bigint; price: bigint }): Promise<bigint>;

  /**
   *  A binary market's full wiring + state (tokens, pool + nonce, status,
   *  expiry, resolution, finalized, decimals) straight from chain — authoritative
   *  for write eligibility, and works before the indexer has seen the market.
   *
   *  BREAKING (0.13.0): takes the bytes32 `marketId` (resolved through the
   *  BinaryMarketsModule), NOT the BinaryMarket contract address — pools are
   *  recycled across successive markets in v2, so market identity is the module
   *  id. Post-finalize, `backing` falls back to the settlement record's net
   *  backing. Requires `addresses.binaryModule` in the config.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getMarketOnchain(marketId: Hex): Promise<MarketOnchain>;

  /**
   *  Which market a binary pool currently hosts, read from chain alone — the
   *  cold-start source of the `(pool, marketId)` binding when the indexer is
   *  unreachable.
   *
   *  Feed the result's `marketId` to
   *  `watchMarket(pool, { seed: "chain", marketId })` to start a live book
   *  during an indexer outage. The ordinary source of that binding is the
   *  indexer, so without this read the chain seed only serves callers who
   *  already hold a hand-maintained market list.
   *
   *  Both chain reads are made at ONE block, and the result carries it. Resolves
   *  to `null` only when the pool's market does not belong to this module; a
   *  failed read throws. Throws `InvalidInputError` when the module's record
   *  disagrees with the pool on either the pool address or the nonce.
   *
   *  Requires `addresses.binaryModule` in the config.
   *
   *  ```ts
   *  const binding = await exchange.client.getPoolMarketBinding(pool);
   *  if (binding) await exchange.client.watchMarket(pool, { seed: "chain", marketId: binding.marketId });
   *  ```
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getPoolMarketBinding(pool: Address, opts?: GetPoolMarketBindingOptions): Promise<PoolMarketBinding | null>;

  /**
   *  A BinaryMarket contract address's module id, read from chain alone.
   *
   *  Use this when you hold a market ADDRESS and need its `marketId`, which is
   *  what every market-keyed read takes. A market page whose route carries the
   *  contract address is the usual case. `getBinaryMarketByAddress` answers the
   *  same question from the indexer, so this read is the one that survives an
   *  indexer outage.
   *
   *  Resolves to `null` when this module did not create the market. A failed
   *  read throws. Requires `addresses.binaryModule` in the config.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getMarketIdOnchain(marketAddress: Address, opts?: { blockNumber?: bigint }): Promise<Hex | null>;

  /**
   *  A pool's creator — its first-deploy market creator, the only party that
   *  can reuse it — straight from chain (`BinaryMarketsModule.poolCreator`).
   *  Zero address for a pool the module never deployed. No signer needed;
   *  requires `addresses.binaryModule`.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getPoolCreator(pool: Address): Promise<Address>;

  /**
   *  A creator's free (finalized + released, reusable) pools for `collateral`,
   *  LIFO order (the LAST entry is popped first on the creator's next
   *  createMarket), straight from chain (`BinaryMarketsModule.getFreePools`).
   *  No signer needed; requires `addresses.binaryModule`.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getFreePools(creator: Address, collateral: Address): Promise<Address[]>;

  /**
   *  One page of a pool's pool→market binding history from the indexer,
   *  newest (highest nonce) first. A recycled pool gains one binding per
   *  market and its history has no protocol cap, so this read is paged:
   *  `opts.limit` defaults to 50 and `opts.offset` to 0, and both execute at
   *  the indexer. A row with `toBlock === null` is the pool's CURRENT binding;
   *  `closedBy` says whether a past binding ended by `PoolReleased`
   *  ("Released") or by the next `MarketCreated` recycling the pool onward
   *  ("Rotated").
   *
   *  Offset pages are not a snapshot. When the pool opens new bindings
   *  between two requests, older rows move down by that many positions and
   *  the next page repeats that many rows. Deduplicate on `id` when you page to the end.
   *
   *  Replaces `getPoolBindings(pool)`, which returned the whole history in one
   *  response.
   *
   * @example
   * ```ts
   * // The whole history of a recycled pool. A short page is the end.
   * const byId = new Map<string, PoolBindingRecord>();
   * for (let offset = 0; ; offset += 1000) {
   *   const page = await exchange.client.listPoolBindings(pool, { limit: 1000, offset });
   *   for (const row of page) byId.set(row.id, row);
   *   if (page.length < 1000) break;
   * }
   * ```
   *
   * @throws {@link InvalidInputError} `opts.limit` is not an integer from 1 to
   *  1000, or `opts.offset` is not an integer from 0 to 2147483647 (GraphQL
   *  `Int`). Checked before the request, so the indexer is not blamed for the caller's own input.
   * @throws {@link IndexerError} The indexer request failed or returned an
   *  unusable response. The union is
   *  {@link SomniaMarketsClientListPoolBindingsError}.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  listPoolBindings(pool: string, opts?: ListPoolBindingsOptions): Promise<PoolBindingRecord[]>;

  /**
   *  The indexer's per-pool aggregate (creator, collateral, current binding,
   *  generation count) for a long-lived, recycled BinaryPool — null if the
   *  indexer has never seen a `MarketCreated` on that address.
   */
  getPool(address: string): Promise<IndexedPool | null>;

  /**
   *  ERC-20 `balanceOf(account)`, raw units. For outcome positions use
   *  {@link getOutcomeBalance} (ERC-6909), not this.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getErc20Balance(token: Address, account: Address): Promise<bigint>;

  /**
   *  ERC-20 `symbol`/`name`/`decimals` in one fan-out — label a token the
   *  indexer hasn't denormalized.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getErc20Metadata(token: Address): Promise<Erc20Metadata>;

  /**
   *  ERC-20 `allowance(owner, spender)`, raw units — gate a write that pulls
   *  ERC-20 collateral (outcome tokens use per-operator approval instead).
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getErc20Allowance(token: Address, owner: Address, spender: Address): Promise<bigint>;

  /**
   *  ERC-6909 `balanceOf(account, id)` on the outcome-token singleton, raw
   *  units. `p.outcomeToken` is the singleton (from {@link getMarketOnchain});
   *  `p.id` is the market's `yesId`/`noId`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getOutcomeBalance(p: GetOutcomeBalanceParams): Promise<bigint>;

  /**
   *  Batch-read many balances for one `account` in a single fan-out. Each entry
   *  is read as a plain ERC-20 `balanceOf(account)` when `id` is omitted, or as
   *  an ERC-6909 outcome position `balanceOf(account, id)` on the singleton
   *  `token` when `id` is set. Results are returned positionally, aligned to
   *  `tokens`. The explorer uses this to read a portfolio's collateral +
   *  outcome positions in one round-trip instead of N calls.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getBalances(tokens: readonly BalanceQuery[], account: Address): Promise<bigint[]>;

  /**
   *  SOMI a SpotStopOrderRegistry charges per pending stop order (funds the
   *  trigger gas; refunded on cancel). Raw wei.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getStopOrderSomiPayment(registry: Address): Promise<bigint>;

  /**
   *  A pool's protocol-wide per-order builder-fee ceiling (pool bps×1000).
   *  Read-only — no signer — for the order form's routing-fee ceiling hint.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getMaxBuilderFeeBpsTimes1k(pool: Address): Promise<bigint>;

  /** A user's raw per-builder approval cap on a pool (pool bps×1000; 0 = none).
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getBuilderApproval(ref: BuilderApprovalRef): Promise<bigint>;

  /**
   *  The ENFORCED per-builder approval on a pool: the user's raw cap
   *  clamped by the pool's protocol-wide ceiling — the limit a `builderFeeBpsTimes1k`
   *  must not exceed. Drives the order form's "approve builder first" gate.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getEffectiveBuilderApproval(ref: BuilderApprovalRef): Promise<bigint>;

  /**
   *  owner / EIP-1967 implementation / native balance for a deployed contract —
   *  the /system dashboard diagnostics. `proxy: true` reads the impl slot.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getContractMeta(address: Address, opts?: { proxy?: boolean }): Promise<ContractMeta>;

  /**
   *  Native (SOMI/STT) balance, raw wei.
   *
   *  - Throws {@link RpcError} - the balance read did not complete (`operation: "getBalance"`).
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getNativeBalance(address: Address): Promise<bigint>;

  /**
   *  Chain-direct summary of one transaction — sender, gas spent, fee paid,
   *  status — for enriching an order/fill view with what its tx cost. Null for a
   *  malformed hash and for one the node reports as not found.
   *
   *  A read that did not complete throws, so "it never landed" stays distinct
   *  from "the node could not be reached".
   *
   * @throws {@link RpcError} The chain read did not complete.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getTransactionSummary(hash: string): Promise<TransactionSummary | null>;

  /**
   *  The network-wide order-flow firehose: one topics-only chain-log
   *  subscription that sees OrderPlaced/OrderFilled from EVERY pool (including
   *  pools created later), no indexer on the hot path. Nothing connects until
   *  the tape's first `subscribe`; the last unsubscribe closes the socket.
   *  Each call returns an independent tape.
   */
  createNetworkTape(opts?: NetworkTapeOptions): NetworkTape;

  /** Latest block number as the RPC sees it.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getHeadBlock(): Promise<number>;

  /**
   *  Deployed protocol state (impl pointers, oracle, collateral) for ops
   *  dashboards. Needs `config.addresses`.
   *
   *  A `null` field means the contract is not configured or not wired. A failed
   *  read throws, so the snapshot never reports a zero the chain did not answer.
   *
   * @throws {@link RpcError} A chain read did not complete.
   * @throws {@link ContractRevertError} A configured contract rejected its read (usually an ABI mismatch).
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getSystemInfo(): Promise<SystemInfo>;

  // ------------------------------------------------------------------
  // Control plane — operators + venues (indexer-backed, like the market list)
  // ------------------------------------------------------------------

  /**
   *  List operators, newest-first by id, paginated. Pass `owner` to scope to
   *  one owner's operators (the indexed "my operators", no log scan), `enabled`
   *  to filter by the kill switch, `limit`/`offset` to page. Indexer read.
   */
  listOperators(opts?: OperatorFilter & { limit?: number; offset?: number }): Promise<IndexedOperator[]>;
  /**
   *  Server-side COUNT of operators matching a filter (for directory
   *  pagination). Needs the privileged `_aggregate` role (server-only), like
   *  {@link countBinaryMarkets}.
   *
   *  Without that header the total is bounded at 10,000 by the row-scan
   *  fallback, and past it would be a lower bound reported as exact. `Operator`
   *  is orders of magnitude below the cap, so no bounded variant exists.
   */
  countOperators(opts?: OperatorFilter): Promise<number>;
  /** One operator by id, or null if never registered. Indexer read. */
  getOperator(operatorId: number): Promise<IndexedOperator | null>;
  /**
   *  List venues, creation-order, optionally scoped to one operator and/or
   *  market type and/or the venue-level creation flag. Paginated. Indexer read.
   */
  listVenues(opts?: {
    operatorId?: number;
    marketType?: string;
    creationEnabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<IndexedVenue[]>;
  /**
   *  Server-side COUNT of venues matching a filter (for per-operator venue
   *  pagination). Needs the privileged `_aggregate` role (server-only).
   *
   *  Without that header the total is bounded at 10,000 by the row-scan
   *  fallback, like {@link countOperators}; `Venue` is far below the cap, so no
   *  bounded variant exists.
   */
  countVenues(opts?: { operatorId?: number; marketType?: string }): Promise<number>;
  /** One venue by its opaque bytes32 id, or null. Indexer read. */
  getVenue(venueId: string): Promise<IndexedVenue | null>;
  /**
   *  Build a BINARY_V1 venue's `feeParams` bytes from plain-bps rates via the
   *  deployed BinaryMarketsModule's `encodeVenueFeeParams` — the on-chain
   *  ground truth for the version tag + struct shape (used by the create/edit
   *  venue forms). Needs `config.addresses.binaryModule`.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  encodeBinaryVenueFeeParams(vp: BinaryVenueParams): Promise<Hex>;
  /**
   *  The module's protocol-level ceiling on any single venue fee rate, in plain
   *  bps (e.g. 1_000 = 10%). Needs `config.addresses.binaryModule`.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  getMaxVenueFeeBps(): Promise<number>;

  // ------------------------------------------------------------------
  // Operator "market machinery" — MarketCreators + oracle adapters + series
  // (indexer-backed directory, like the operator/venue list). On-chain point
  // reads + writes live on the machinery admins (createMarketCreatorAdmin /
  // createOracleHubAdmin / createGovernanceAdmin).
  // ------------------------------------------------------------------

  /**
   *  List MarketCreators, newest-first, paginated. Pass `owner` for "my
   *  machinery", `operatorId`/`venueId` to scope. Each row carries its nested
   *  `series`. Indexer read.
   */
  listMarketCreators(opts?: MarketCreatorFilter & { limit?: number; offset?: number }): Promise<IndexedMarketCreator[]>;
  /** One MarketCreator by address (with its series), or null. Indexer read. */
  getMarketCreator(creator: string): Promise<IndexedMarketCreator | null>;
  /**
   *  List oracle adapters, newest-first, paginated. Pass `owner` to scope,
   *  `approved` to filter by the module-approval gate. Oracle v2: the one
   *  approved adapter is the OracleHub — this directory tracks
   *  `AdapterApproved` history. Indexer read.
   */
  listOracleAdapters(opts?: {
    owner?: string;
    approved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<IndexedOracleAdapter[]>;
  /** One oracle adapter by address, or null. Indexer read. */
  getOracleAdapter(adapter: string): Promise<IndexedOracleAdapter | null>;
  /** List series, creation-order, optionally scoped to one creator. Indexer read. */
  listSeries(opts?: { creator?: string; limit?: number; offset?: number }): Promise<IndexedSeries[]>;
  /**
   *  The most recent market of every series that has rolled at least once -
   *  one row per series, joined server-side. The read behind a "has this
   *  series stopped rolling" monitor. Paginated over series. Indexer read.
   *
   *  A series with no market yet has NO row; see {@link SeriesLatestMarket}.
   *
   * @example
   * ```ts
   * // Which of an owner's series have gone quiet. Page to exhaustion: the read
   * // is bounded per call, so a short page is the end and a full one is not.
   * const latest = new Map<string, bigint>();
   * for (let offset = 0; ; offset += 100) {
   *   const page = await exchange.client.listSeriesLatestMarkets({ limit: 100, offset });
   *   for (const row of page) latest.set(row.series, BigInt(row.createdAtTimestamp));
   *   if (page.length < 100) break;
   * }
   *
   * // A series with NO row has never rolled - that is "unanchored", NOT
   * // "stalled". Nothing indexed says when a first roll is due, so judging a
   * // missing row as late pages every newly registered series.
   * //
   * // RE-REGISTRATION needs the same treatment, and the indexer will not do it
   * // for you: Market->Series links are preserved, so `latest` still holds the
   * // PREVIOUS schedule's market after a restart. Ageing that row against the new
   * // schedule reports a deliberate restart as quiet. A series is re-registered
   * // when `updatedAtTimestamp` is later than `createdAtTimestamp`, and the row
   * // in hand belongs to the old generation when it predates that restart - so
   * // treat it as unanchored too, exactly as the probe's own sweep does.
   * const seconds = (v: string | null) => (v == null ? Number.NaN : Number(v));
   * for (const s of await exchange.client.listSeries()) {
   *   const rolledAt = latest.get(s.id);
   *   if (rolledAt === undefined) continue;
   *
   *   const restartedAt = seconds(s.updatedAtTimestamp);
   *   const registeredAt = seconds(s.createdAtTimestamp);
   *   const restarted = Number.isFinite(restartedAt) && (!Number.isFinite(registeredAt) || restartedAt > registeredAt);
   *   if (restarted && Number(rolledAt) <= restartedAt) continue;
   *
   *   const lateBy = BigInt(Math.floor(Date.now() / 1000)) - rolledAt;
   *   if (lateBy > BigInt(s.intervalSec) * 2n) console.log("quiet:", s.id, lateBy);
   * }
   * ```
   *
   * @throws {@link InvalidInputError} `opts.limit` is not an integer from 1 to
   *  1000, or `opts.offset` is not a non-negative safe integer. Checked before
   *  the request: `NaN` and `Infinity` are ordinary `number` values that would
   *  serialize to `null` and lift the page bound entirely.
   * @throws {@link IndexerError} The indexer request failed or returned an
   *  unusable response. The union is
   *  {@link SomniaMarketsClientListSeriesLatestMarketsError}.
   * @throws {@link NotConfiguredError} The client has no indexer, or its indexer does not index the client's chain.
   */
  listSeriesLatestMarkets(opts?: ListSeriesLatestMarketsOptions): Promise<SeriesLatestMarket[]>;

  /**
   *  One series by its composite key `(creator, seriesId)` — seriesId is
   *  per-creator. The row is the CURRENT spec (`registerSeries` overwrites in
   *  place). Null when never registered.
   */
  getSeries(creator: string, seriesId: number): Promise<IndexedSeries | null>;

  // ------------------------------------------------------------------
  // Oracle v2 hub §8e — quote reads (chain) + hub entities (indexer). The §8e
  // user-side rule: every create attaches `getSchedulingCost(def) +
  // resolveReserve()` native — the reserve is EARMARKED per-market at onBind
  // (no separate prepaid pre-fund). Surplus accrues to the operator's
  // withdrawable credit (`withdrawableOf`), drawn via credit-only `withdraw`.
  // ------------------------------------------------------------------

  /**
   *  The hub's MARGINAL scheduling cost for `def` — 0 when an identical
   *  template definition is already scheduled (the call would dedup), the full
   *  oracle submission cost otherwise. Chain read; needs
   *  `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  getSchedulingCost(def: QuestionDefinitionInput): Promise<bigint>;
  /**
   *  Native LOCKED for an operator's outstanding markets (wei; never
   *  withdrawable). Chain read; needs `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  earmarkedOf(operatorId: number): Promise<bigint>;
  /**
   *  An operator's accrued WITHDRAWABLE surplus credit on the hub (wei). Chain
   *  read; needs `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  creditOf(operatorId: number): Promise<bigint>;
  /**
   *  Count of an operator's bound-but-unresolved markets. Chain read; needs
   *  `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  outstandingOf(operatorId: number): Promise<bigint>;
  /**
   *  Wei an operator's owner may withdraw right now (== `creditOf`). Chain read;
   *  needs `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  withdrawableOf(operatorId: number): Promise<bigint>;
  /**
   *  A1: the withdrawable surplus credited to a reserve-PAYER (an open-venue
   *  creator, or the autonomous MarketCreator on its rolls) rather than the
   *  operator; drawn by that account via `createOracleHubAdmin().withdrawMyCredit`.
   *  Chain read; needs `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  payerCreditOf(payer: Address): Promise<bigint>;
  /**
   *  A1: the reserve-payer recorded for a market at onBind (surplus recipient);
   *  zero-address once settled + swept. Chain read; needs `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  payerOf(marketId: Hex): Promise<Address>;
  /**
   *  The hub's `resolveReserve()` — the per-market reserve attached+locked at
   *  onBind (wei). Chain read; needs `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {NotSupportedError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {RpcError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {ContractRevertError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   * @throws {InvariantError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
   */
  resolveReserve(): Promise<bigint>;
  /**
   *  THE §8e create-market value quote: `getSchedulingCost(def) +
   *  resolveReserve()` (the reserve is attached to the create). Attach exactly
   *  this to `scheduleAndCreateMarket` (excess refunds). Chain read; needs
   *  `config.addresses.oracleHub`.
   * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
   */
  quoteCreateMarketValue(def: QuestionDefinitionInput): Promise<bigint>;
  /**
   *  One hub-scheduled oracle question (dedup key, scheduler, bind count) by
   *  its oracleQuestionId, or null. Indexer read.
   */
  getOracleQuestion(oracleQuestionId: string): Promise<OracleQuestionRecord | null>;
  /**
   *  Hub-scheduled questions, newest first — filter by `scheduler` /
   *  `questionKey`, paginate. Indexer read.
   */
  listOracleQuestions(opts?: {
    scheduler?: string;
    questionKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<OracleQuestionRecord[]>;
  /**
   *  One operator's hub account (earmarked / credit / outstanding) by
   *  operatorId, or null. Indexer read.
   */
  getOperatorHubAccount(operatorId: string | number): Promise<OperatorHubAccountRecord | null>;
  /**
   *  Operator hub-account records, most-recently-updated first, paginated.
   *  Indexer read.
   */
  listOperatorHubAccounts(opts?: { limit?: number; offset?: number }): Promise<OperatorHubAccountRecord[]>;
  /**
   *  Bind records (operator attribution → exact metered resolve charge +
   *  subsidy per market, §8e), newest first — filter by `operatorId` /
   *  `oracleQuestionId` / `resolved`, paginate. Indexer read.
   */
  listOracleBinds(opts?: {
    operatorId?: number;
    oracleQuestionId?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<OracleBindRecord[]>;
  /**
   *  Resolution-callback conservation records (`CallbackAccounted`), newest
   *  first, paginated (a callback drains across many questions, so no
   *  per-question filter). Indexer read.
   */
  listOracleCallbacks(opts?: { limit?: number; offset?: number }): Promise<OracleCallbackRecord[]>;

  // ------------------------------------------------------------------
  // Writes
  // ------------------------------------------------------------------

  /**
   * Build a {@link Trader} bound to a signer and this client's chain, store,
   * and socket. With a `privateKey`/local `account` the trader signs locally
   * (fixed fees, locally-tracked nonce — zero pre-send RPCs) and confirms in
   * one round-trip via `eth_sendRawTransactionSync`; with a browser
   * `walletClient` it sends through the wallet and confirms off the newHeads
   * subscription. Every write resolves only once mined, with its receipt. With
   * an `executor` the trader sends through it instead — see
   * {@link SomniaMarketsClient.createExecutor}.
   *
   * - Throws {@link SignerRequiredError} - none of `executor`, `privateKey`,
   *   `account` or `walletClient` (with an account) is set.
   * - Throws {@link InvalidInputError} - `privateKey` is not a valid secp256k1
   *   key, or `executor` sends on a chain other than this client's.
   * - Throws {@link NotConfiguredError} - this client has no chain transport
   *   (no `wsRpcUrl` and a chain without a WebSocket endpoint) and no
   *   `publicClient` was passed to send through.
   *
   * The complete union is {@link SomniaMarketsClientCreateTraderError}.
   */
  createTrader(traderConfig: TraderConfig): Trader;
  /**
   *  Build one of the built-in executors, bound to this engine's chain, socket,
   *  fee envelope and nonce lane. The spec names only who acts — a private key
   *  or local account, a wallet client, a Somnia session seed, or a smart
   *  account from `@somnia-chain/accounts-sdk` with the executor that sends its
   *  outer transaction. Hand the result to `createTrader({ executor })`, or
   *  compose it (a smart account's `inner`), or place it in a
   *  {@link SomniaMarketsAccount} for the exchange to trade through.
   *
   *  **Gotchas**
   *
   *  - A smart account's `inner` must be authorized on the account when
   *    nothing signs (no `signer`, no `through`): its actor must be a direct
   *    owner of a threshold-1 account. A `signer` or a `through` chain of
   *    parent accounts switches to a real signature, which the accounts SDK
   *    nests to any depth. See {@link ExecutorSpec}.
   *  - An account that is not a factory account from `@somnia-chain/accounts-sdk`
   *    needs a custom {@link Executor}. Its `execute` returns an inner failure
   *    as `failure` on the result; Trader writes throw it.
   *  - Before it sends or signs, a smart-account executor checks that the
   *    account has code on this chain. Missing code raises
   *    {@link InvalidInputError}: create the account on this chain first. A
   *    failed read raises {@link RpcError}, and a client with no chain
   *    transport raises {@link NotConfiguredError}. Successful checks are
   *    cached.
   *  - With a `signer` or `through`, a smart-account executor runs one write
   *    at a time per account on this engine, because each write signs the
   *    account's current nonce. Two processes that write through one account
   *    (for example a backend and a browser) can still sign the same nonce.
   *  - Throws {@link InvalidInputError} - a spec that names no actor or more
   *    than one (a spec with a removed `safe` key names none), a `privateKey`
   *    or `sessionSeed` that is not a valid 32-byte key, a wallet spec with no
   *    account to act as, a smart-account spec whose `inner` sends on another
   *    chain, a smart-account spec on a chain the accounts SDK has no
   *    deployment for, or a `through` spec with no `signer` and an `inner` that
   *    cannot sign typed data.
   *  - Throws {@link NotConfiguredError} - a key, account, wallet or session
   *    spec on a client with no chain transport (no `wsRpcUrl` and a chain
   *    without a WebSocket endpoint); a smart-account spec needs none of its
   *    own.
   *  - An account's `inner` signs locally. A smart-account spec whose `inner`
   *    came from `{ sessionSeed }` throws {@link InvalidInputError}:
   *    that executor sends the seed to the node on every write, and the seed
   *    would then control the account's funds. Use `{ privateKey }`; for a
   *    Somnia session seed the key is `sessionPrivateKey(seed)`. Do not also
   *    send node-side from that seed: both modes share one nonce space.
   *
   *  The complete union is {@link SomniaMarketsClientCreateExecutorError}.
   *
   * **Example** (A factory smart account driven by a local session key)
   *
   *  ```ts
   *  const session = client.createExecutor({ privateKey: sessionKey });
   *  const account = client.createExecutor({ smartAccount: ACCOUNT, inner: session });
   *  const trader = client.createTrader({ executor: account });
   *  await trader.placeOrder(params);   // approval + order in ONE account transaction, nothing signs
   *  ```
   */
  createExecutor(spec: ExecutorSpec): Executor;

  /**
   * Build an {@link OperatorAdmin} bound to a signer — registers/updates
   * operators and creates/updates venues on MarketsCore. Same signer doctrine
   * as {@link createTrader} (privateKey/local account, or a browser walletClient).
   */
  createOperatorAdmin(config: OperatorAdminConfig): OperatorAdmin;

  /**
   * Build an {@link OracleHubAdmin} bound to a signer — the OracleHub surface
   * (Oracle v2 §8e): quote reads (`quoteCreateMarketValue` = the §8e create
   * value = scheduling cost + resolveReserve), the credit-only `withdraw`
   * (owner-gated — draws accrued surplus credit only), and the protocol-admin
   * writes (fundHub, gas + drain params, enableReactivity/migrateSubscription —
   * precompile, testnet/mainnet only). Same signer doctrine as
   * {@link createOperatorAdmin}. Needs `config.addresses.oracleHub`.
   */
  createOracleHubAdmin(config: OracleHubAdminConfig): OracleHubAdmin;

  /**
   * Build a {@link GovernanceAdmin} bound to a signer — the protocol-admin-only
   * surface that approves oracle adapters on the module (`setAdapterApproved`;
   * in Oracle v2 the ONE approved adapter is the OracleHub — deploy wiring +
   * emergency revoke). Gate its UI on {@link GovernanceAdmin.isModuleOwner}.
   */
  createGovernanceAdmin(config: GovernanceAdminConfig): GovernanceAdmin;

  /**
   * Build a {@link MarketCreatorAdmin} bound to a signer — stamps MarketCreators
   * (+ policies) from the factory, registers rolling series under them, funds
   * them, and triggers rolls. Same signer doctrine as {@link createOperatorAdmin}.
   */
  createMarketCreatorAdmin(config: MarketCreatorAdminConfig): MarketCreatorAdmin;
}

/** Concrete configured client with opt-in data observations. Existing client implementations need not provide these additions. */
export interface SomniaMarketsClientWithObservations extends SomniaMarketsClient {
  /**
   * Compare main-indexer progress with this owner's independently read chain head.
   * The binding check throws NotConfiguredError when the indexer has no row for the owner's chain,
   * so `null` is normally not reached; it remains for a row that goes missing after the check passed.
   * Lag is raw blocks and chain-time seconds, without a stale threshold.
   * A lead of up to 10,000 blocks past the head reads as lag 0. A larger lead means the indexer
   * follows an earlier genesis of the same chain id, so the read throws instead of reporting lag.
   * Use getSyncStatus for metadata-only availability checks.
   * @throws {InvalidInputError} chainId does not match the owner or a variable is invalid.
   * @throws {IndexerError} Metadata request failed.
   * @throws {NotConfiguredError} The owner's chain transport is unavailable, the owner has no
   *  indexer, its indexer does not index the owner's chain, or its indexer is more than 10,000
   *  blocks past the RPC head.
   * @throws {RpcError} A latest or processed block read failed.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  getIndexerFreshness(chainId: number): Promise<IndexerFreshness | null>;

  /**
   * Observe one independent head and derive response-associated main-indexer reads.
   * Reuse the returned capability for a batch; create another to refresh the comparison head.
   * The capability shares this owner's cancellation and transports. No polling is started.
   * **Example**
   * ```ts
   * const observed = await exchange.client.createObservedReads();
   * const [markets, count] = await observed.batch([
   *   { operation: "listMarkets", args: [{ limit: 20 }] },
   *   { operation: "countMarkets", args: [] },
   * ]);
   * console.log(markets.data, markets.observation.latestProcessedBlock);
   * console.log(count.data, count.observation.independentHead.blockNumber);
   * const freshness = await exchange.client.getIndexerFreshness(exchange.client.config.chain.id);
   * console.log(freshness?.lagBlocks, freshness?.lagSeconds);
   * ```
   * @throws {NotConfiguredError} The owner has no chain transport.
   * @throws {RpcError} The head read failed.
   * @throws {InvalidInputError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotConfiguredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {NotSupportedError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {SignerRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IndexerWaitTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {RpcError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {ContractRevertError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {FillHistoryUnavailableError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {IncompleteHistoryError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {CollateralOnWrongChainError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeLiquidityError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   * @throws {InvariantError} A supplied RPC constructor or socket member throws this SDK error. Its identity is retained.
   */
  createObservedReads(): Promise<ObservedReads>;

  /** Read delivery health without I/O. By default this includes an acquired tape.
   * `options.ticks: false` reports current-price delivery alone. Unwatched assets
   * return "unwatched". Shares watch lifecycle and subscribePrices notifications. */
  getPriceHealth(asset: string, options?: PriceWatchOptions): PriceFeedHealth;
  /** Read precise health for each retained asset without I/O or new watches. */
  listPriceHealth(): { asset: string; health: PriceFeedHealth }[];
}
/** Failures from a native binary chain book read. @category errors */
export type SomniaMarketsClientGetBinaryOrderBookError = SomniaMarketsSocketFailure;
/** Failures from a native spot/perp chain book read. @category errors */
export type SomniaMarketsClientGetSpotOrderBookError = SomniaMarketsSocketFailure;
/** Failures from one on-chain order read, at head or pinned. @category errors */
export type SomniaMarketsClientGetOrderOnchainError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getHeadBlock` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetHeadBlockError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getClosingPrice` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetClosingPriceError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getContractMeta` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetContractMetaError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getBankruptcyPrice` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetBankruptcyPriceError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getPerpMaxLeverage` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpMaxLeverageError = SomniaMarketsSocketFailure;

/** Failures from the owner's `tryGetPerpLeverageImSurcharge` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientTryGetPerpLeverageImSurchargeError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getBookTopsOnchain` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetBookTopsOnchainError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getOwnOpenOrdersOnchain` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetOwnOpenOrdersOnchainError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getOpenOrdersOnchain` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetOpenOrdersOnchainError = SomniaMarketsSocketFailure;

/** Failures from the owner's `getAllOpenOrdersOnchain` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetAllOpenOrdersOnchainError = SomniaMarketsSocketFailure;

/** Failures from the owner's `stopLive` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientStopLiveError = SomniaMarketsSocketFailure;

/** Failures from the owner's `quoteBinaryStake` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientQuoteBinaryStakeError = SomniaMarketsSocketFailure;

/** Failures from the owner's `quoteBinarySell` operation, including supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientQuoteBinarySellError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpState}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpStateError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpFundingPremium}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpFundingPremiumError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpPosition}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpPositionError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getManualVaultMode}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetManualVaultModeError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getErc20Balance}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetErc20BalanceError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getErc20Allowance}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetErc20AllowanceError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getBuilderApproval}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetBuilderApprovalError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getEffectiveBuilderApproval}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetEffectiveBuilderApprovalError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getMaxBuilderFeeBpsTimes1k}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetMaxBuilderFeeBpsTimes1kError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getSchedulingCost}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetSchedulingCostError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.earmarkedOf}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientEarmarkedOfError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.creditOf}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientCreditOfError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.outstandingOf}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientOutstandingOfError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.withdrawableOf}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientWithdrawableOfError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.payerCreditOf}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientPayerCreditOfError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.payerOf}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientPayerOfError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.resolveReserve}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientResolveReserveError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getNativeBalance}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetNativeBalanceError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getVaultBalance}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetVaultBalanceError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getOutcomeBalance}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetOutcomeBalanceError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getOnchainResolutionPrice}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetOnchainResolutionPriceError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpLinkedWalletRegistry}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpLinkedWalletRegistryError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpMainFunding}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpMainFundingError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpMaxLinkedChildren}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpMaxLinkedChildrenError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpWalletLinkage}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpWalletLinkageError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpWalletPullCapacity}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpWalletPullCapacityError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.listPerpLinkedChildren}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientListPerpLinkedChildrenError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.quotePerpFundingPayer}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientQuotePerpFundingPayerError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getAccountHealth}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetAccountHealthError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getEffectiveImfBps}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetEffectiveImfBpsError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getLiquidationPrice}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetLiquidationPriceError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getMarginAccount}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetMarginAccountError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getMaxPerpOrderSize}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetMaxPerpOrderSizeError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpHealthSnapshot}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpHealthSnapshotError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpLeverage}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpLeverageError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpLeverageImSurcharge}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpLeverageImSurchargeError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpPositionAnalytics}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpPositionAnalyticsError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpRiskParams}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpRiskParamsError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpSideHolders}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpSideHoldersError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.listPerpPositionAnalytics}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientListPerpPositionAnalyticsError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.meetsPerpImForFill}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientMeetsPerpImForFillError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.previewPerpClosePnl}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientPreviewPerpClosePnlError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.previewPerpLiquidationPrice}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientPreviewPerpLiquidationPriceError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.previewPerpOrderMargin}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientPreviewPerpOrderMarginError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.quoteMeetsPerpImForOrder}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientQuoteMeetsPerpImForOrderError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.quotePerpOrderTopUp}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientQuotePerpOrderTopUpError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getInsuranceFundState}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetInsuranceFundStateError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getLiquidationEngineConfig}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetLiquidationEngineConfigError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpCollateralBasis}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpCollateralBasisError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.getPerpSystemConfig}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpSystemConfigError = SomniaMarketsSocketFailure;

/** Failures of {@link SomniaMarketsClient.tryGetPerpAccountEquity}, including its owner's supplied RPC infrastructure. @category errors */
export type SomniaMarketsClientTryGetPerpAccountEquityError = SomniaMarketsSocketFailure;

/** Failures from the owner-bound `SomniaMarketsClient.watchMarket` operation. @category errors */
export type SomniaMarketsClientWatchMarketError = SomniaMarketsSocketFailure;

/** Failures from the owner-bound `SomniaMarketsClient.watchMarkets` operation. @category errors */
export type SomniaMarketsClientWatchMarketsError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getBinaryBookParams}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetBinaryBookParamsError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getPerpStopOrderSomiPayment}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPerpStopOrderSomiPaymentError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getUnclaimedPerpStopSomi}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetUnclaimedPerpStopSomiError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.listPerpPoolStatuses}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientListPerpPoolStatusesError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.listTradeablePerpPools}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientListTradeablePerpPoolsError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.readPerpMarketFromChain}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientReadPerpMarketFromChainError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.isPerpPoolRegistered}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientIsPerpPoolRegisteredError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getAutoPullRequirement}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetAutoPullRequirementError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.isOperatorAuthorized}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientIsOperatorAuthorizedError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.isGloballyApproved}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientIsGloballyApprovedError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.isApprovedForPool}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientIsApprovedForPoolError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getOperatorPermissionsRegistry}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetOperatorPermissionsRegistryError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getOwnLockedBalance}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetOwnLockedBalanceError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getLockedTokenBreakdown}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetLockedTokenBreakdownError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.convertToQuoteAtPriceCeil}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientConvertToQuoteAtPriceCeilError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getMarketOnchain}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetMarketOnchainError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getPoolMarketBinding}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPoolMarketBindingError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getMarketIdOnchain}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetMarketIdOnchainError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getPoolCreator}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetPoolCreatorError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getFreePools}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetFreePoolsError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getErc20Metadata}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetErc20MetadataError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getBalances}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetBalancesError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getStopOrderSomiPayment}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetStopOrderSomiPaymentError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getTransactionSummary}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetTransactionSummaryError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getSystemInfo}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetSystemInfoError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.encodeBinaryVenueFeeParams}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientEncodeBinaryVenueFeeParamsError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.getMaxVenueFeeBps}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientGetMaxVenueFeeBpsError = SomniaMarketsSocketFailure;

/** Failures from {@link SomniaMarketsClient.quoteCreateMarketValue}, including its owner RPC infrastructure. @category errors */
export type SomniaMarketsClientQuoteCreateMarketValueError = SomniaMarketsSocketFailure;

/** Price-watch acquisition failures, including the owner's supplied WebSocket constructor. @category errors */
export type SomniaMarketsClientWatchPriceError = SomniaMarketsSocketFailure;
/** Batch price-watch acquisition failures. @category errors */
export type SomniaMarketsClientWatchPricesError = SomniaMarketsClientWatchPriceError;
