import type { IndexerFreshness } from "../syncStatus.js";
import type { PriceFeedHealth } from "../priceFeed/types.js";
import type { SomniaMarketsClientGetIndexerFreshnessError } from "../observedReads.js";
/** Local chain-tail status, available without indexer or RPC requests. */
export interface ExchangeStatus {
    /** Existing chain-tail verdict only; no indexer or price threshold is inferred. */
    status: "ok" | "connecting" | "error";
    /** Wall-clock completion time, in milliseconds. */
    updated: number;
    /** The PRIMARY chain's live-tail snapshot (watch count, socket + resync state). */
    info: TailStatus;
    /** Every configured chain's live-tail status, keyed by chain id. */
    byChain: Record<number, TailStatus>;
}
/** Opt-in mixed-tier status; each data source retains its own verdict. */
export interface ExchangeDataStatus extends ExchangeStatus {
    /**
     *  The PRIMARY chain's raw independently measured indexer lag. An indexer with no
     *  metadata row for the chain fails the binding check with `NotConfiguredError`
     *  instead, so `null` is normally not reached; it remains for a row that goes missing
     *  after the check passed. The field is absent when the primary chain's measurement
     *  failed; `indexerErrorByChain` then holds that chain's error.
     */
    indexer?: IndexerFreshness | null;
    /**
     *  The indexer lag of every chain whose measurement succeeded, keyed by chain id.
     *  `null` means the chain's metadata row is absent. A chain whose measurement failed
     *  has no key here; its error is in `indexerErrorByChain`.
     */
    indexerByChain: Record<number, IndexerFreshness | null>;
    /**
     *  The error of every chain whose measurement failed, keyed by chain id. Each value
     *  is the original error from that chain's read. The field is present only when at
     *  least one chain failed, so a fully healthy result keeps its old shape.
     */
    indexerErrorByChain?: Record<number, SomniaMarketsFetchDataStatusError>;
    /** Every asset with price state, independently classified. */
    prices: {
        asset: string;
        health: PriceFeedHealth;
    }[];
}
/** Status observes RPC and indexer once; either service can reject. */
export type SomniaMarketsFetchDataStatusError = SomniaMarketsClientGetIndexerFreshnessError;
/** {@link SomniaMarkets.unwatchMarket} rejects only for an on-chain ref (an address, a market id or a `{ chainId, id }` ref) that does not resolve. */
export type SomniaMarketsUnwatchMarketError = InvalidInputError;
import { FillHistoryRestartRequiredError, FillHistoryUnavailableError, IncompleteHistoryError, IndexerError, IndexerUnavailableError, InvalidInputError, NotConfiguredError, SignerRequiredError, SomniaMarketsError } from "../errors.js";
import type { CollateralReadError } from "../errors.js";
import type { ExchangeSmartAccounts } from "./smartAccounts.js";
import type { ExchangeBridge as ExchangeBridgeApi, ExchangeBridgeResult, ExchangeBridgeTransferOptions } from "./bridge.js";
import type { ChainOrderRef, MarketHandle } from "../chainRef.js";
import type { SomniaMarketsAccount } from "../account.js";
import { InvariantError } from "../raise.js";
import type { Address } from "viem";
import type { SomniaMarketsClientCreateTraderError, SomniaMarketsClientWithObservations } from "../somniaMarketsClient.js";
import type { ChainBinding, ClientConfig } from "../config.js";
import type { SomniaMarketsSocketFailure, SomniaMarketsWebSocketConstructor } from "../config.js";
import type { WatchHandle } from "../liveTail.js";
import type { OrderRow } from "../orders.js";
import type { OrderStatus, TailStatus } from "../store.js";
import type { Trader, TraderConfig } from "../trade.js";
import type { Tradable } from "./symbols.js";
import type { UnifiedBalances, UnifiedFundingRate, UnifiedMarket, UnifiedOHLCV, UnifiedOrder, UnifiedOrderBook, UnifiedPosition, UnifiedPrice, UnifiedStopOrder, UnifiedTicker, UnifiedTrade } from "./structs.js";
import * as PortfolioAnalytics from "./portfolioAnalytics.js";
import type { PortfolioTimeframe } from "./portfolioAnalytics.js";
/**
 *  The signer half of {@link SomniaMarketsConfig}: a private key, a local
 *  account, or a browser wallet client. Optional — authenticated methods throw
 *  {@link SignerRequiredError} without one.
 *
 * @category clients
 */
export interface SomniaMarketsSignerConfig {
    /** A pre-built signer (e.g. a browser/wagmi wallet over an injected provider). */
    walletClient?: TraderConfig["walletClient"];
    /**
     *  A local signing account, a bare address (reads only), or a
     *  {@link SomniaMarketsAccount}: one address on every chain plus the executor
     *  that acts as it on each — the shape a cross-chain safe takes.
     */
    account?: TraderConfig["account"] | SomniaMarketsAccount;
    /** Private key — the SDK derives the account. */
    privateKey?: TraderConfig["privateKey"];
}
/**
 *  The multi-chain form of {@link SomniaMarketsConfig}: one {@link ChainBinding}
 *  per chain the exchange spans. Each binding builds its own engine — its own
 *  socket, indexer connection, nonce lane and fee envelope. Chain ids and
 *  indexer URLs must be distinct across bindings.
 *
 * @category clients
 */
export interface SomniaMarketsChainsConfig {
    /** One engine configuration per chain, in the order `chainIds` reports them. The first is the primary. */
    chains: ChainBinding[];
}
/**
 *  Config for {@link SomniaMarkets}: either one chain's {@link ClientConfig}
 *  (the single-chain form, which behaves as a one-element `chains` list) or a
 *  {@link SomniaMarketsChainsConfig}, plus (optionally) a signer — authenticated
 *  methods throw without one.
 *
 * @category clients
 */
export type SomniaMarketsConfig = (ClientConfig | SomniaMarketsChainsConfig) & SomniaMarketsSignerConfig & {
    /**
     * RPC constructor selected once for this exchange and all of its chain engines.
     * Omitted on Node, the SDK uses its owned `ws` transport and ignores replacement
     * globals. Browsers retain native/global/isows selection. Explicit input wins
     * on both platforms and is called with only standard WebSocket arguments.
     * Created sockets belong to this root; see {@link SomniaMarketsWebSocketConstructor}
     * for the required prompt disposal and retirement-error observation contract.
     * The same selection opens this exchange's price-feed sockets with the
     * `graphql-transport-ws` protocol, and a failed price-feed selection or
     * construction rejects the price watch with the same classification.
     * Indexer HTTP reads do not use it.
     */
    readonly rpcWebSocketConstructor?: SomniaMarketsWebSocketConstructor;
};
/** Options for a unified chain book snapshot. @category clients */
export interface FetchOrderBookOptions {
    /** Maximum levels per side, defaults to 10. The legacy numeric argument still works. */
    limit?: number;
    /** Pin both sides to this exact block; omitted selects one head. */
    blockNumber?: bigint;
}
/** Failures from selecting a tradable or reading its pinned book. @category errors */
export type SomniaMarketsFetchOrderBookError = SomniaMarketsSocketFailure;
/**
 * Modeled failures from {@link SomniaMarkets.fetchTicker} and default caller cancellation.
 * Operational candle and perp-chain failures are contained in the returned tier
 * states. SDK programming failures reject with `InvariantError` and original cause.
 * A custom abort reason also passes through unchanged and can have a caller-chosen type.
 * A supplied owner RPC constructor or socket failure from the perp-state read keeps
 * its identity and rejects the ticker unless it is a contained RPC, revert or
 * configuration failure, so the union spans every supplied socket failure class.
 * @category errors
 */
export type SomniaMarketsFetchTickerError = SomniaMarketsSocketFailure | DOMException;
/** Failures from validating owner configuration. @category errors */
export type SomniaMarketsConstructorError = SomniaMarketsSocketFailure;
/** Failures recorded while releasing owned resources, after all cleanup is attempted. @category errors */
export type SomniaMarketsCloseError = SomniaMarketsSocketFailure;
/** Failures from reading {@link SomniaMarkets.client}: the exchange spans more than one chain. @category errors */
export type SomniaMarketsClientError = InvalidInputError;
/**
 *  Failures from {@link SomniaMarkets.traderFor}: a chain the exchange does not
 *  span or an account with no executor there, no signer, or a signer the
 *  engine refuses. @category errors
 */
export type SomniaMarketsTraderForError = SomniaMarketsClientCreateTraderError;
/**
 *  Failures from reading {@link SomniaMarkets.trader}: the exchange spans more
 *  than one chain, or any {@link SomniaMarketsTraderForError}. @category errors
 */
export type SomniaMarketsTraderError = SomniaMarketsTraderForError;
/**
 *  Failures from {@link SomniaMarkets.setSigner}: a {@link SomniaMarketsAccount}
 *  whose executors do not fit this exchange. @category errors
 */
export type SomniaMarketsSetSignerError = InvalidInputError;
/**
 *  Registry load failures. Short, because BOTH reads that can fail the whole load are
 *  contained and reported instead of thrown: the indexer registry read through
 *  {@link SomniaMarkets.registryReadError} and perp discovery — the collateral
 *  `decimals()` read included, since it sits inside discovery — through
 *  {@link SomniaMarkets.perpDiscoveryError}. Every remaining chain read in the load
 *  swallows its own failure to a documented fallback.
 *
 *  What is left throws BEFORE any request goes out, or cannot happen at all:
 *  `NotConfiguredError` when the load needs a chain read (ERC-20 metadata for an
 *  unlabeled token, or a binary pool's grid) and the owner has neither a `wsRpcUrl` nor
 *  a chain carrying a WebSocket endpoint — `createClient` defers that check to the first
 *  chain touch, which is this one. `InvariantError` reports an SDK defect, never a
 *  caller or operational condition. Closing the owner cancels an unfinished load
 *  with a `DOMException` named `AbortError`.
 *
 * @category errors
 */
export type SomniaMarketsLoadMarketsError = NotConfiguredError | InvariantError | DOMException;
/** Historical public trade read failures. @category errors */
export type SomniaMarketsFetchTradesError = InvalidInputError | IndexerError | NotConfiguredError;
/** Historical account trade read failures. @category errors */
export type SomniaMarketsFetchMyTradesError = DOMException | InvalidInputError | InvariantError | IndexerError | SignerRequiredError | NotConfiguredError;
/** Historical portfolio analytics read failures. @category errors */
export type SomniaMarketsFetchPortfolioAnalyticsError = InvalidInputError | IndexerError | IndexerUnavailableError | FillHistoryRestartRequiredError | FillHistoryUnavailableError | IncompleteHistoryError | SignerRequiredError | NotConfiguredError;
/** Options for complete indexed portfolio analytics. @category clients */
export interface SomniaMarketsFetchPortfolioAnalyticsOptions {
    /** Session start in milliseconds for `volume.sessionUsd`. */
    sessionSince?: number;
    /** Comparison taker rate in basis points; defaults to {@link PortfolioAnalytics.DEFAULT_CEX_RATE_BPS}. */
    cexRateBps?: number;
    /** Maximum non-empty logical fill pages (up to two requests each); omitted reads all role-visible history. Exceeding it rejects without analytics. */
    maxFillPages?: number;
    /**
     * External capital movements (deposits/withdrawals) for the wallet, USD
     * valued at event time. When any of them bears on the window they define
     * the MWRR capital base (`mwrr.capitalBasis: "funding"`) in place of the
     * trades-only proxy. They never affect PnL or volume. Venue fills are not
     * funding — see `PortfolioFundingEvent` for the sourcing rules.
     */
    funding?: readonly PortfolioAnalytics.PortfolioFundingEvent[];
}
/** Live trade watch initialization and mapping failures. @category errors */
export type SomniaMarketsWatchTradesError = SomniaMarketsSocketFailure;
/** Account trade watch initialization and mapping failures. @category errors */
export type SomniaMarketsWatchMyTradesError = SomniaMarketsSocketFailure;
/** Live book watch initialization failures. @category errors */
export type SomniaMarketsWatchOrderBookError = SomniaMarketsSocketFailure;
/**
 *  Restricts a multi-chain account read to one chain.
 *
 *  **Details**
 *
 *  An account read with no `chainId` and no market reads every chain the
 *  exchange spans. It fails closed: when one chain fails, the read throws, and
 *  an `IndexerError` or `RpcError` names that chain in its `chainId`. A read
 *  with `chainId` reads only that chain, so a caller can still read the chains
 *  that answer. This includes the market load before the read: on an exchange
 *  that has not loaded markets yet, it loads only that chain. Together with a market ref, `chainId` must name the market's
 *  chain, else the read throws `InvalidInputError`. A chain the exchange does
 *  not span throws `NotConfiguredError`.
 *
 * @category clients
 */
export interface SomniaMarketsChainFilter {
    /** Read only this chain. Omit it to read every chain. */
    chainId?: number;
}
/** Filters and pagination for {@link SomniaMarkets.getOrdersPage}. @category clients */
export type SomniaMarketsGetOrdersPageOptions = SomniaMarketsChainFilter & {
    /** Restrict the page to one tradable. Omit it for account-wide raw orders (paged PER CHAIN). */
    ref?: MarketHandle;
    /** Restrict the indexer read to one native order lifecycle status. */
    status?: OrderStatus;
    /** Maximum raw rows to read. The default is 100. */
    limit?: number;
    /** Raw indexer row offset. The default is 0. */
    offset?: number;
};
/** Filters and pagination for {@link SomniaMarkets.getOrderHistoryPage}. @category clients */
export type SomniaMarketsGetOrderHistoryPageOptions = SomniaMarketsGetOrdersPageOptions;
/** Stable owner-qualified identity for one indexed order row. @category models */
export type UnifiedOrderIdentity = {
    chainId: number;
    account: Address;
    marketId: string;
    pool: string;
    orderId: string;
};
/** A unified display order with its immutable identity and raw indexer row. @category models */
export type UnifiedOrderPageItem = UnifiedOrder & {
    identity: UnifiedOrderIdentity;
    info: OrderRow;
};
/**
 * One bounded indexer-offset page of an owner's orders.
 *
 * The page is a partial projection. The indexer does not provide a frozen
 * revision, so concurrent changes can make later pages skip or repeat rows.
 * An exhausted page does not prove that the result is complete account state.
 *
 * @category models
 */
export type UnifiedOrdersPage = {
    orders: UnifiedOrderPageItem[];
    /** Number of raw rows read before outcome filtering or identity resolution. */
    rowsRead: number;
    /** Next raw row offset after a full page, or null after a short page. */
    nextOffset: number | null;
    /** Rows whose immutable market identity is absent or inconsistent in the loaded registry. */
    unresolved: UnifiedOrderIdentity[];
    coverage: "partial";
    source: "indexer-offset";
};
/** Failures from {@link SomniaMarkets.getOrdersPage}. @category errors */
export type SomniaMarketsGetOrdersPageError = InvalidInputError | SignerRequiredError | IndexerError | NotConfiguredError;
/** Failures from {@link SomniaMarkets.getOrderHistoryPage}. @category errors */
export type SomniaMarketsGetOrderHistoryPageError = SomniaMarketsGetOrdersPageError;
/**
 *  The optional trailing params bag of {@link SomniaMarkets.createOrder} —
 *  time-in-force, market-order slippage, and builder-fee attribution.
 *  Everything here has a working default.
 *
 * @category clients
 */
export interface CreateOrderParams {
    /** "IOC" | "FOK" | "PO" (post-only). Default GTC (rest). */
    timeInForce?: "GTC" | "IOC" | "FOK" | "PO";
    /** Alias for timeInForce: "PO". */
    postOnly?: boolean;
    /** Market-order slippage bound vs the best opposite level (default 0.01 = 1%). */
    slippage?: number;
    /**
     *  Routing/builder frontend to attribute the order to. Requires a prior
     *  `client.createTrader().approveBuilder(...)` opt-in on the pool, else a
     *  non-zero `builderFeeBpsTimes1k` reverts. Works on binary, spot and perp.
     */
    builder?: Address;
    /**
     *  Per-order builder/routing fee in the pool's native bps×1000 unit
     *  (must not exceed the effective approval / the pool's max builder fee).
     */
    builderFeeBpsTimes1k?: bigint;
    /**
     *  What to do when the order's collateral is not on the market's chain.
     *
     *  - `"explicit"` (the default on a multi-chain exchange): check the escrow
     *    token's balance on the market's chain and throw
     *    {@link CollateralOnWrongChainError} — with where the funds are and a ready
     *    bridge plan — instead of sending anything.
     *  - `"auto"`: bridge the shortfall from the richest other configured chain
     *    through {@link SomniaMarkets.ensureFunds}, wait for delivery, then place.
     *    The order lands seconds after the call. A native route whose destination
     *    router cannot pay out throws {@link BridgeLiquidityError} and sends nothing.
     *    Auto-funded orders for the same account, chain and escrow token are
     *    checked and placed one at a time, so each one sees the balance after the
     *    one before it took its escrow.
     *  - `"skip"` (the default on a single-chain exchange, where there is nowhere
     *    else the collateral could be): no balance check — the single round-trip,
     *    for a hot path that funds itself.
     *
     *  Checked on a binary buy's collateral and on every spot order. A perp
     *  order draws on the MarginBank and a binary sell escrows outcome tokens, so
     *  neither is checked here.
     *
     *  A spot order is sized by the pool: the check reads the pool's
     *  `getAutoPullRequirement` (fees included, net of the account's pool vault
     *  balance). When the vault covers the order, that read is the whole check.
     *  Otherwise the wallet must hold the remainder (as native coin for a
     *  native-base sell). Under manual vault mode the pool never pulls from the
     *  wallet, so a vault shortfall throws with no bridge plan, even under
     *  `"auto"`: deposit into the pool vault instead.
     */
    funding?: "explicit" | "auto" | "skip";
}
/**
 * Optional leg selection for {@link SomniaMarkets.redeem}.
 *
 * @category clients
 */
export interface RedeemOptions {
    /**
     * Leg to redeem (0 = YES, 1 = NO). Omit it on a resolved market to let the
     * SDK verify the terminal state and read the winner on-chain. A voided market
     * requires the leg because both can redeem.
     */
    outcomeIdx?: 0 | 1;
}
/** Failures from {@link SomniaMarkets.redeem}. */
export type SomniaMarketsRedeemError = SomniaMarketsSocketFailure;
export declare class SomniaMarkets {
    /** The first binding's engine. Internal reads that report the primary chain use it. */
    private readonly primary;
    /** One engine per configured chain, keyed by chain id, in binding order. */
    private readonly engines;
    private readonly freshnessReads;
    private readonly balanceReads;
    /** Unified markets keyed by MARKET symbol (populated by loadMarkets). */
    markets: Record<string, UnifiedMarket>;
    /** All market symbols (populated by loadMarkets). */
    symbols: string[];
    private marketLoad;
    /** The close generation of the last queued load; sharing never crosses it. */
    private marketLoadSignal;
    /** The chains `marketLoad` reads, so a concurrent read knows whether it can share it. */
    private marketLoadChains;
    /**
     *  The chains that a running load reads again because their last load recorded a
     *  failure. A read that needs one of them waits for that retry. It does not take the
     *  cache, whose failure entries the retry has already cleared.
     */
    private retryingChains;
    /** When each chain's last load settled, in `Date.now()` milliseconds. Bounds implicit retries. */
    private marketLoadSettledAt;
    /**
     *  Capability map — which unified verbs this venue supports (the ccxt
     *  `exchange.has` convention, for capability-probing bot code). Every listed
     *  verb is implemented here, so every flag is `true`.
     */
    readonly has: {
        /** {@link SomniaMarkets.fetchMarkets} */
        readonly fetchMarkets: true;
        /** {@link SomniaMarkets.fetchOrderBook} */
        readonly fetchOrderBook: true;
        /** {@link SomniaMarkets.fetchTrades} */
        readonly fetchTrades: true;
        /** {@link SomniaMarkets.fetchOHLCV} */
        readonly fetchOHLCV: true;
        /** {@link SomniaMarkets.fetchBalance} */
        readonly fetchBalance: true;
        /** {@link SomniaMarkets.fetchOpenOrders} */
        readonly fetchOpenOrders: true;
        /** {@link SomniaMarkets.getOrderHistoryPage} */
        readonly getOrderHistoryPage: true;
        /** {@link SomniaMarkets.getOrdersPage} */
        readonly getOrdersPage: true;
        /** {@link SomniaMarkets.fetchMyTrades} */
        readonly fetchMyTrades: true;
        /** {@link SomniaMarkets.fetchStatus} */
        readonly fetchStatus: true;
        /** {@link SomniaMarkets.createOrder} */
        readonly createOrder: true;
        /** {@link SomniaMarkets.cancelOrder} */
        readonly cancelOrder: true;
        /** {@link SomniaMarkets.watchOrderBook} */
        readonly watchOrderBook: true;
        /** {@link SomniaMarkets.watchTrades} */
        readonly watchTrades: true;
        /** {@link SomniaMarkets.watchOrders} */
        readonly watchOrders: true;
        /** {@link SomniaMarkets.watchMyTrades} */
        readonly watchMyTrades: true;
        /** {@link SomniaMarkets.fetchPositions} */
        readonly fetchPositions: true;
        /** {@link SomniaMarkets.fetchFundingRate} */
        readonly fetchFundingRate: true;
        /**
         *  {@link SomniaMarkets.fetchFundingRateHistory} — the key did not previously exist
         *  in this map, so it had to be ADDED rather than flipped.
         */
        readonly fetchFundingRateHistory: true;
        /** {@link SomniaMarkets.watchPrice} */
        readonly watchPrice: true;
        /** {@link SomniaMarkets.fetchPrice} */
        readonly fetchPrice: true;
        /** {@link SomniaMarkets.fetchPriceOHLCV} */
        readonly fetchPriceOHLCV: true;
    };
    private readonly registry;
    private signerConfig;
    /** One trader per chain, built lazily from the signer config. */
    private traders;
    /**
     *  `${chainId}:${token}` -> the currency behind a token on that chain, for
     *  symbols + balances. Keyed per chain: the same address can be a different
     *  token on another chain.
     */
    private currencies;
    /**
     *  binary pool (lowercased) -> the tick/lot/minQuantity grid the pool
     *  enforces. Binary rows come off the indexer with these fields undefined
     *  (the indexer never sees them), so loadMarkets() reads them from the pool;
     *  the precision helpers are synchronous and read only from here.
     */
    private bookParams;
    /**
     *  perp pool (lowercased) -> its live chain-tier gates, refreshed by every
     *  loadMarkets(). Empty when no PerpPoolFactory could be reached, which is what
     *  leaves `perpStatus` absent rather than guessed.
     */
    private perpStatuses;
    /**
     *  perp pools (lowercased) the FACTORY knows and the indexer does not — the
     *  rows loadMarkets() synthesized from the chain. Drives
     *  {@link UnifiedMarket.indexed}.
     */
    private chainOnlyPerps;
    /**
     *  The last load's contained failures, keyed by chain id. A retry re-inserts a
     *  chain, so insertion order is NOT engine order: the scalar accessors
     *  (`perpDiscoveryError`, `registryReadError`) pick the first chain in engine
     *  order through {@link firstFailingChain}.
     */
    private perpDiscoveryFailures;
    /** Set when discovery found no factory route at all; first engine wins. */
    private perpDiscoverySkip;
    private perpDiscoveryPartials;
    private registryReadFailures;
    /** Each chain's rows from the load that read it last, in engine order. */
    private engineRows;
    /** Each chain a load has read. Never cleared: a reload in progress still serves the cache. */
    private loadedChains;
    /**
     *  Markets hydrated INTO RESOLUTION ONLY, keyed `${chainId}:${marketId}`: the
     *  settled binary markets a row (a position, a fill, an order) named that the
     *  tradable registry does not carry. `null` records a KNOWN MISS — an id the
     *  indexer has no row for — so it is not re-queried on every read. A found
     *  market lives in the symbol registry; this map only remembers what was asked.
     *  Cleared with the registry on every load.
     */
    private settledMarkets;
    private resolutionGeneration;
    private watches;
    private priceWatches;
    private channels;
    /** One live-store subscription per engine, plus the price feed's. */
    private unsubscribes;
    /**
     * Create one owner for Markets reads, watches, and optional signing.
     * Reconciliation is off unless its positive block interval and bounded depth are supplied.
     * @throws {@link InvalidInputError} If reconciliation bounds are invalid, or if
     *  `indexerLimits` carries a bound the governor cannot use — a count that is
     *  not a whole number of at least 1, a delay of `0` or less, or any non-finite
     *  value. Checked here so a limit that
     *  would disable the in-flight cap or the backoff schedule fails at
     *  construction rather than under load. Also if `chains` is empty, binds one
     *  chain twice, or binds one indexer to two chains (URLs compare with scheme and
     *  host lower-cased, default port dropped and trailing slashes dropped).
     * @throws {@link NotConfiguredError} If the indexer endpoint is absent.
     * @throws {InvalidInputError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {NotConfiguredError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {NotSupportedError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {SignerRequiredError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {IndexerError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {IndexerUnavailableError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {IndexerWaitTimeoutError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {RpcError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {ContractRevertError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {TransactionOutcomeUnknownError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {FillHistoryRestartRequiredError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {FillHistoryUnavailableError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {IncompleteHistoryError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {CollateralOnWrongChainError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {BridgeLiquidityError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {BridgeDeliveryTimeoutError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     * @throws {InvariantError} A supplied configuration getter throws this SDK error. Its identity is retained after earlier engines are released.
     */
    constructor(config: SomniaMarketsConfig);
    /**
     *  A {@link SomniaMarketsAccount}'s executors must act as its address on a
     *  chain this exchange spans — otherwise reads would use one account and
     *  writes another.
     */
    private assertAccountExecutors;
    /** Numeric chain ids this exchange spans, in binding order (the first is the primary). */
    get chainIds(): number[];
    /**
     *  The chains bound with no `indexerUrl`, in binding order. This is how the
     *  account reads report which chains they skipped.
     *
     *  A chain-only binding, such as Hideki (50383) with no hosted indexer, can
     *  read balances and resting orders from the chain but has no indexed data.
     *  On a read over more than one chain, the facade account reads skip the
     *  indexer legs of these chains instead of throwing `NotConfiguredError`:
     *
     *  - {@link fetchBalance} keeps their ERC-20 and native balances and skips
     *    their binary outcome holdings.
     *  - {@link fetchOpenOrders} reads their resting orders from the chain, over
     *    the perp pools that {@link loadMarkets} discovered on that chain.
     *  - {@link fetchOrders}, {@link getOrdersPage}, {@link fetchMyTrades},
     *    {@link fetchOpenStopOrders} and {@link watchUser} skip these chains.
     *
     *  A skipped chain adds no rows. Its absence from a result does not mean
     *  that the account has no orders or trades there. A read scoped to one of
     *  these chains still throws `NotConfiguredError` when it has no
     *  chain-readable leg.
     */
    get chainIdsWithoutIndexer(): number[];
    /**
     *  The native engine of a single-chain exchange — bigint-exact,
     *  address-keyed. The escape hatch for reads and watches the unified verbs
     *  do not cover.
     *
     *  **Gotchas**
     *
     *  On an exchange with more than one chain binding this throws. A pool
     *  address or market id can name a different market on each chain, so a read
     *  with no chain could return another chain's data. Use
     *  {@link SomniaMarkets.engineFor} with the chain id there.
     *
     * @throws {@link InvalidInputError} If the exchange spans more than one chain.
     *  `chainIds` lists the chains it spans.
     */
    get client(): SomniaMarketsClientWithObservations;
    /**
     *  The tiers that name no chain act on the first chain. With two or more
     *  chains that choice is silent and often wrong, so the caller must name one.
     */
    private assertSingleChain;
    /**
     *  The native engine bound to one configured chain — bigint-exact,
     *  address-keyed. The escape hatch for that chain.
     *
     *  **Gotchas**
     *
     *  Throws {@link NotConfiguredError} for a chain this exchange has no binding for.
     */
    engineFor(chainId: number): SomniaMarketsClientWithObservations;
    /** The engine a tradable's market lives on. */
    private engineOf;
    /**
     *  The chains an account read touches, in binding order: the market's chain,
     *  else the {@link SomniaMarketsChainFilter} chain, else every chain.
     */
    private readEngines;
    /**
     *  The chains of a read that needs the indexer on every chain, less the
     *  chains in {@link chainIdsWithoutIndexer}. Those chains are skipped only
     *  when the read also spans a chain with an indexer. A read over one chain,
     *  or over chains that all lack an indexer, keeps them, so it throws
     *  `NotConfiguredError` instead of returning a result that looks empty.
     */
    private indexedEngines;
    /**
     *  Runs one read per chain, in parallel, and fails closed: one chain's failure
     *  rejects the whole read. The reads are grouped per chain, so the chain of a
     *  failure is known. On a read over more than one chain, the failure names it
     *  (see `withChainId`). So does an `unscoped` read (no market ref, no chain
     *  filter) on an exchange with more than one chain, even when it reads only one
     *  of them. A read scoped to one chain keeps its error unchanged.
     */
    private perChain;
    /** The engine that serves the price feed: the first binding that configures one, else the primary. */
    private priceEngine;
    /**
     *  The raw write tier for one chain this exchange spans, bound to its signer —
     *  bigint-exact `placeOrder`/`approveBuilder`/`setPerpLeverage`/… for
     *  anything the unified verbs do not cover.
     *
     *  **Details**
     *
     *  The trader uses the engine of `chainId`, so its writes share that engine's
     *  nonce lane. With a {@link SomniaMarketsAccount} it writes through
     *  `account.executors[chainId]`. It is built on first use and replaced after
     *  {@link SomniaMarkets.setSigner} or {@link SomniaMarkets.close}.
     *
     * @throws {@link NotConfiguredError} If the exchange has no binding for
     *  `chainId`, or the account has no executor for it.
     * @throws {@link SignerRequiredError} If no signer is configured.
     * @throws {@link InvalidInputError} If the private key is malformed or the
     *  signer cannot send on `chainId`.
     */
    traderFor(chainId: number): Trader;
    /** The trader config for one chain: the account's executor there, or the plain signer sugar. */
    private traderConfigFor;
    /** The trader for a tradable's chain. */
    private traderOf;
    /**
     *  The raw write tier of a single-chain exchange, bound to its signer —
     *  bigint-exact `placeOrder`/`mintSet`/`faucet`/… for anything the unified
     *  verbs don't cover.
     *
     *  **Gotchas**
     *
     *  On an exchange with more than one chain binding this throws. A pool
     *  address or market id can name a different market on each chain, so a
     *  write with no chain could land on another chain. Use
     *  {@link SomniaMarkets.traderFor} with the chain id there.
     *
     * @throws {@link InvalidInputError} If the exchange spans more than one chain
     *  (`chainIds` lists them), or the private key is malformed.
     * @throws {@link SignerRequiredError} If no signer is configured.
     * @throws {@link NotConfiguredError} If the account has no executor for the chain.
     */
    get trader(): Trader;
    /**
     *  Bind (or replace) the exchange's signer after construction. Browser apps
     *  construct the exchange at boot for public reads, then call this when the
     *  user's wallet connects — and again with `{}` on disconnect, which returns
     *  the exchange to unauthenticated reads. Replaces the trader every
     *  authenticated verb and `walletAddress` resolve against; live watches and
     *  market data are unaffected.
     *
     * @throws {@link InvalidInputError} If a {@link SomniaMarketsAccount} has an
     *  executor for a chain this exchange does not span, for another chain, or
     *  acting as another address. The previous signer stays bound.
     */
    setSigner(signer: SomniaMarketsSignerConfig): void;
    /** The authenticated wallet address, if a signer was configured. */
    get walletAddress(): Address | undefined;
    /**
     *  The wallet address, or {@link SignerRequiredError} naming the caller.
     *
     * **Details**
     *
     * - `operation`: The public method requiring the signer; it appears in the error so the caller sees which call needs a signer, not just "a method".
     */
    private requireAddress;
    /**
     *  Why chain-tier perp discovery did not run on the last {@link loadMarkets}, or
     *  `null` when it ran (or was never applicable).
     *
     *  `loadMarkets()` contains a discovery failure rather than throwing, because it is
     *  the implicit prerequisite of nearly every symbol-based verb and a chain failure
     *  must not take the SPOT and OUTCOME market lists down with it. This is where that
     *  contained failure is reported, with the underlying error preserved in `cause`.
     *
     *  **When to use**
     *
     *  Check it after `loadMarkets()` whenever a SHORT perp list would be worse than an
     *  error — a market page, an order router, anything that would otherwise present
     *  "this market does not exist". Then either tell the user the list is incomplete, or
     *  call `loadMarkets()` again. A load that recorded a failure is not served from the
     *  cache, so the next bare call re-runs discovery. `loadMarkets(true)` also retries.
     *
     *  **Gotchas**
     *
     *  - On a multi-chain exchange this is the FIRST failing chain's error, in the order of the `chains` config. {@link perpDiscoveryErrorsByChain} reports every failing chain.
     *  - Do NOT infer this from `perpStatus` being absent. That works only when the indexer already carries a perp row to inspect; with a configured factory and an indexer carrying none, a failed discovery yields an EMPTY perp list with no market to check. This accessor answers in both cases.
     *  - `null` does not mean the venue has perps. A chain with no perps plane deployed (local anvil) never attempts discovery and reports `null` too. {@link perpDiscoverySkipped} reports that case, so read BOTH before you tell a user the venue has no perps.
     *
     * **Example** (Refusing to show a possibly-short perp list)
     *
     * ```ts
     * await exchange.loadMarkets();
     * if (exchange.perpDiscoveryError) {
     *   // loadMarkets(true) reloads every chain.
     *   await exchange.loadMarkets(true);
     * }
     * if (exchange.perpDiscoveryError) {
     *   const partial = exchange.perpDiscoveryPartialFailure;
     *   throw new Error(
     *     partial
     *       ? `perp list incomplete: ${partial.failed} of ${partial.total} markets unread`
     *       : "perp discovery failed; the perp list may be short",
     *   );
     * }
     * ```
     */
    get perpDiscoveryError(): SomniaMarketsError | null;
    /** The first chain, in the order of the `chains` config, that has a key in `failures`. */
    private firstFailingChain;
    /**
     *  Every chain whose perp discovery failed on the last {@link loadMarkets}, keyed by
     *  chain id. A chain with no failure has no key, so `{}` means discovery failed on no
     *  chain.
     *
     *  {@link perpDiscoveryError} reports only the first failing chain. On a multi-chain
     *  exchange, use this accessor to name each chain whose perp list may be short. Each
     *  value is the same typed error that {@link perpDiscoveryError} would hold for that
     *  chain alone, with the underlying error in `cause`.
     *
     *  **Gotchas**
     *
     *  - Each read returns a new object. Changes to it do not change the exchange.
     *  - It resets on every load that runs, so it always describes the LAST load.
     */
    get perpDiscoveryErrorsByChain(): Record<number, SomniaMarketsError>;
    /**
     *  How much of the chain-only perp set was lost when discovery PARTIALLY failed, or
     *  `null` when it did not.
     *
     *  Typed counts rather than prose in a message, so a consumer can decide on them —
     *  `{ failed: 1, total: 4 }` reads as "three of four chain-only markets are listed".
     *  Always `null` when {@link perpDiscoveryError} is null, and also null when discovery
     *  failed outright rather than partly (nothing was read, so there is no ratio).
     */
    get perpDiscoveryPartialFailure(): {
        failed: number;
        total: number;
    } | null;
    /**
     *  The partial-discovery counts of the last {@link loadMarkets}, keyed by chain id.
     *  A chain has a key only when its discovery PARTIALLY failed.
     *
     *  {@link perpDiscoveryPartialFailure} reports the counts of the first failing chain
     *  only. This accessor gives the counts of each chain, so `{ 50312: { failed: 1,
     *  total: 4 } }` reads as "chain 50312 lists three of its four chain-only markets".
     *  A chain whose discovery failed outright has a key in
     *  {@link perpDiscoveryErrorsByChain} and no key here, because nothing was read.
     *
     *  **Gotchas**
     *
     *  - Each read returns a new object. Changes to it do not change the exchange.
     */
    get perpDiscoveryPartialFailuresByChain(): Record<number, {
        failed: number;
        total: number;
    }>;
    /**
     *  Why the last {@link loadMarkets} did not LOOK for perp pools, or `null` when
     *  it did look.
     *
     *  `"no-factory-route"` means the SDK had no way to reach the PerpPoolFactory.
     *  It finds the factory either from a configured `addresses.perpPoolFactory`,
     *  or from the `marginBank` of an indexed perp row. With neither — a reachable
     *  indexer that carries no perp rows, and no configured address — discovery
     *  returns an empty set without asking anything.
     *
     *  This is the one state the error accessors cannot report. Nothing failed, so
     *  {@link perpDiscoveryError} and {@link registryReadError} are both `null`,
     *  and an empty perp list would otherwise be indistinguishable from a venue
     *  that genuinely has no perps.
     *
     *  **When to use**
     *
     *  Read it before you tell a user "this venue has no perps". A non-null value
     *  means "not looked", not "none exist".
     *
     *  **Gotchas**
     *
     *  - This is INFORMATIONAL, not an alert. A non-null value is normal and
     *    permanent on a venue with no perps plane — Somnia mainnet today, and a
     *    local anvil deployment. Do not surface it as an error there.
     *  - It reports "the SDK had no way to look", never "a read failed". A failed
     *    registry read on a chain leaves this `null` for that chain: the empty row
     *    set is then a symptom of that failure, which {@link registryReadError}
     *    already names.
     *  - For ONE engine it is likewise never set together with
     *    {@link perpDiscoveryError}. That accessor means a route was found and the
     *    read failed; this one means no route was found and nothing was read. On a
     *    multi-chain exchange both can be non-null at once, each reporting a
     *    different chain.
     *  - It resets on every load, so re-read it after `loadMarkets(true)`.
     *  - The realistic transient cause is an indexer that was wiped or is
     *    reindexing below the factory's first deploy block. The spot and binary
     *    rows are short in that window too; {@link registryReadError} does not
     *    cover it, and `exchange.client.getIndexerFreshness` is the general signal
     *    for lag.
     *
     * **Example** (Telling "no perps here" apart from "could not look")
     *
     * ```ts
     * await exchange.loadMarkets();
     * const perps = Object.values(exchange.markets).filter((m) => m.type === "swap");
     * if (perps.length === 0 && exchange.perpDiscoverySkipped) {
     *   console.log("perp discovery was skipped:", exchange.perpDiscoverySkipped.reason);
     * }
     * ```
     */
    get perpDiscoverySkipped(): {
        reason: "no-factory-route";
    } | null;
    /**
     *  Why the indexer's market registry could not be read on the last
     *  {@link loadMarkets}, or `null` when the read COMPLETED.
     *
     *  `loadMarkets()` contains this failure rather than throwing, for the same reason it
     *  contains a perp discovery failure: it is the implicit prerequisite of nearly every
     *  symbol-based verb, and an indexer outage must not take down the perp markets the
     *  chain can enumerate on its own. This is where that contained failure is reported,
     *  with the underlying error preserved in `cause`. In practice it is an
     *  {@link IndexerError} carrying `operation` and `detail`.
     *
     *  **When to use**
     *
     *  Check it after `loadMarkets()` whenever an EMPTY market list would be worse than an
     *  error. `null` together with an empty {@link symbols} is the unambiguous "this venue
     *  genuinely has no markets"; non-null with an empty list means the registry could not
     *  be read and the list says nothing about what exists. To retry, call `loadMarkets()`
     *  again. A load that recorded a failure is not served from the cache, so the next
     *  bare call re-runs the sweep. `loadMarkets(true)` also retries.
     *
     *  **Gotchas**
     *
     *  - On a multi-chain exchange this is the FIRST failing chain's error, in the order of the `chains` config. {@link registryReadErrorsByChain} reports every failing chain.
     *  - This is all-or-nothing for one chain. A registry sweep that succeeded but dropped unparseable rows is a different condition, reported by `listRegistryMarketsChecked` through `RegistrySweep.dropped`.
     *  - Cleared on every `loadMarkets()` that actually runs, so it always describes the LAST load, never an older one.
     *
     * **Example** (Telling an outage apart from an empty venue)
     *
     * ```ts
     * await exchange.loadMarkets();
     * if (exchange.registryReadError) {
     *   // loadMarkets(true) reloads every chain.
     *   await exchange.loadMarkets(true);
     * }
     * if (exchange.registryReadError) {
     *   throw new Error("the market registry could not be read; the market list may be short");
     * }
     * if (exchange.symbols.length === 0) {
     *   console.log("this venue has no markets");
     * }
     * ```
     */
    get registryReadError(): SomniaMarketsError | null;
    /**
     *  Every chain whose indexer registry read failed on the last {@link loadMarkets},
     *  keyed by chain id. A chain with no failure has no key, so `{}` means every
     *  registry read completed.
     *
     *  {@link registryReadError} reports only the first failing chain. On a multi-chain
     *  exchange, use this accessor to name each chain whose market list may be short.
     *  Each value is the same typed error that {@link registryReadError} would hold for
     *  that chain alone. In practice it is an {@link IndexerError} carrying `operation`
     *  and `detail`.
     *
     *  **Gotchas**
     *
     *  - A chain bound with no `indexerUrl` always has a key here. Its value is a {@link NotConfiguredError}, because that chain has no registry to read.
     *  - Each read returns a new object. Changes to it do not change the exchange.
     *  - It resets on every load that runs, so it always describes the LAST load.
     */
    get registryReadErrorsByChain(): Record<number, SomniaMarketsError>;
    /**
     *  Load (or reload) the market registry: every market as a unified,
     *  symbol-keyed market object. Call once before anything symbol-based.
     *
     *  **Perp markets come from two sources.** The indexer's rows are unioned with the
     *  PerpPoolFactory's, because the indexer builds its perp set dynamically from
     *  `PerpPoolDeployed` and a pool deployed above its current head is live on chain
     *  and absent there. A market only the
     *  chain knows carries {@link UnifiedMarket.indexed} `false`; read that field's docs
     *  before touching anything history-derived on it.
     *
     *  **A read failure is contained, not thrown.** This method is the implicit
     *  prerequisite of nearly every symbol-based verb, so letting one source's failure out
     *  would take every other source down with it. Both sources report instead of
     *  throwing: the indexer registry read through {@link registryReadError}, and perp
     *  discovery through {@link perpDiscoveryError} — which also covers the PARTIAL case
     *  where some chain-only markets were read and others were not. Each chain loads on
     *  its own, and {@link registryReadErrorsByChain}, {@link perpDiscoveryErrorsByChain}
     *  and {@link perpDiscoveryPartialFailuresByChain} report the failures of each chain. So an indexer outage
     *  still returns the perp markets the chain can enumerate, and a chain outage still
     *  returns the indexer's spot and outcome lists. **A caller that treated a throw as
     *  "the registry is unreadable" must now check `registryReadError` instead.**
     *
     *  **Discovery coverage per kind.**
     *
     *  - **Perp** — chain-complete through the PerpPoolFactory, so it survives an empty or unreachable indexer. One caveat: with NO indexed perp row the factory is found only from a configured `addresses.perpPoolFactory`, because the bootstrap route otherwise reads the `marginBank` off an indexed row. Configure it for a venue whose indexer carries no perp rows.
     *  - **Binary** — indexer-only here. Live discovery of NEW binary markets does not need this method: `watchMarkets({ discover: true })` adds them from the chain's `MarketCreated` events.
     *  - **Spot** — indexer-only. `SpotPoolRegistry` answers "is this pool registered", so it cannot be enumerated from the chain.
     *
     *  **Gotchas**
     *
     *  - A bare call returns the cached registry when every chain is loaded and the last load recorded no failure. When a chain's registry read or perp discovery failed, a bare call reads that chain again, so a chain that failed once does not stay missing. A chain that no load has read yet, for example after only reads filtered to another chain, loads the same way. The other chains keep their cached markets. `loadMarkets(true)` reloads every chain.
     *  - A verb that loads markets for you, such as `fetchBalance`, `fetchMyTrades` or `fetchPositions`, retries a failed chain at most once in 30 seconds. The 30 seconds start when that chain's last load settled. Before then, the verb uses the cached markets, and the failure accessors keep the recorded error and failing chain. So a persistent failure does not re-run the full registry sweep and perp discovery on every verb. A bare `loadMarkets()`, `fetchMarkets()`, `ensureFunds` and `loadMarkets(true)` do not wait: they retry at once.
     *  - A call that starts while a retry of a chain it needs is running waits for that retry and gets its result. It does not start a second retry.
     *  - Symbols are unique across the loaded chains. When a chain loads later than the others, a symbol that it shares with a market on another chain changes on both chains.
     *  - A {@link NotConfiguredError} failure does not cause a retry. It reports a missing config value, which a retry cannot fix. A chain bound with no `indexerUrl` records one on every load.
     *  - Concurrent cold reads in the same close generation share discovery. Each explicit reload waits for prior discovery, then re-reads independently. A post-close read queues fresh work behind any retired load. If close interrupts a reload or retry, the next ordinary read reloads its affected chains, including binary precision grids.
     *  - If a required engine stage rejects the load before row publication, its affected chains are marked unloaded. The next ordinary read repairs those chains rather than treating partially rebuilt caches as complete. The original failure still reaches the caller after sibling work settles.
     *
     * **Details**
     *
     * - Connection preparation starts during registry loading. It issues no chain data request. Each handshake has a four-second deadline. After required stages settle, the load stops waiting for an unfinished dial, so an indexer-only result does not wait for RPC availability. The load does not cancel that dial. The owner keeps it until it opens, times out or `close()` ends it, and the next chain read joins it instead of dialing again. A dial failure after the load reaches only a later read, as that read's own typed failure. An open socket remains owned until `close()`.
     * - Indexed metadata, grids and discovery run independently after their shared owner validation. Metadata keeps its hex-symbol/18-decimal fallback when validation or token reads fail; it issues no token read before validation succeeds. Required discovery reads report their own failures.
     * - `reload`: Re-read everything, including the live tradeability gates and the binary pools' grids.
     * - Throws {@link NotConfiguredError} - the load needed a chain read (ERC-20 metadata for an unlabeled token, or a binary pool's grid) and the owner has neither a `wsRpcUrl` nor a chain whose `rpcUrls` carry a WebSocket endpoint. Thrown before any request goes out, so it means misconfiguration rather than an outage — an outage reaches {@link registryReadError} or {@link perpDiscoveryError} instead.
     * - Throws a `DOMException` named `AbortError` if `close()` releases this load. Started work settles before a queued reload begins.
     * - Throws {@link InvariantError} - the SDK's own reasoning was wrong (a market the symbol registry did not name). Report it as a defect; there is nothing for a caller to do about it.
     *
     * The complete union is {@link SomniaMarketsLoadMarketsError}. Neither an unreachable
     * indexer nor an unreadable chain is in it: both are contained and reported through the
     * accessors named above.
     */
    loadMarkets(reload?: boolean): Promise<Record<string, UnifiedMarket>>;
    /**
     *  The IMPLICIT {@link loadMarkets} a read over one chain makes first. It loads only
     *  that chain, so a read filtered to chain A never reads chain B, also on a cold
     *  exchange. `undefined` means the read spans every chain. It loads a chain that was
     *  never loaded. It retries a chain whose last load failed only when that load settled
     *  at least `MARKET_RETRY_INTERVAL_MS` ago; before that it uses the cache, and the
     *  failure accessors keep the recorded failure.
     */
    private loadMarketsFor;
    private loadMarketsOn;
    /**
     *  The chains a load must read: each chain never loaded, each chain a running retry
     *  reads (so the caller waits for it), and each chain whose last load recorded a
     *  failure that a retry could fix. With `only`, just that chain. A `NotConfiguredError`
     *  is left out: config does not change on a live exchange, so a chain-only binding
     *  would otherwise re-read its chain on every verb. With `implicit`, a failed chain
     *  whose last load settled less than `MARKET_RETRY_INTERVAL_MS` ago is left out too.
     */
    private failedChains;
    /**
     *  Read every chain, or only the `retry` chains (from {@link failedChains}). A chain that is not read keeps its rows, gates and
     *  failure entries from the load that read it last.
     */
    private readMarkets;
    /**
     *  One engine's contribution to {@link loadMarkets}: its indexed registry rows,
     *  its chain-discovered perps, its currency metadata and its binary book grids.
     *  Every row comes back stamped with the engine's chain.
     */
    private loadEngineMarkets;
    private loadCurrencyMetadata;
    private loadBinaryGrids;
    private setCurrency;
    /** The currency code behind a token on one chain, or a hex stub when unknown. */
    private codeOf;
    /**
     *  `codeOf` for the registry, which asks by token only: the rows under
     *  consideration name the chain, so the first row whose chain knows the token
     *  answers. Two chains can label one address differently, and the registry
     *  synthesizes each row's symbol through the row's own chain by construction —
     *  this fallback only serves the symbol pass, never balances.
     */
    private codeOfAny;
    /**
     *  The chain's answer to "which perp markets exist, and are they tradeable" —
     *  plus a synthesized row for each one the indexer is missing.
     *
     *  Finding the factory is the whole trick, and the bank is the door. Every
     *  indexed perp row carries its `marginBank`, and `getSystemConfig()` reports
     *  the factory that bank actually calls, so the common case needs no
     *  configuration at all and cannot drift from the deployment. A configured
     *  `addresses.perpPoolFactory` wins when present, and is the only route when the
     *  indexer has no perp row to bootstrap from.
     *
     *  Returns empty when there is no route to a factory. That is not a failure: a
     *  chain with no perps plane deployed (local anvil) is the ordinary case, and it
     *  must leave the indexer-only behaviour exactly as it was.
     *
     *  THROWS on a route that exists but cannot be read, deliberately — the caller
     *  owns the containment policy and documents it, so this stays a straight read
     *  that a test can drive into failure.
     */
    private discoverPerpPools;
    /**
     *  Chain-read one row per factory pool the indexer is missing.
     *
     *  `collateral.decimals` / `.symbol` are supplied when a sibling indexed row
     *  already carried them, and read from the token otherwise.
     */
    private synthesizePerps;
    private toUnifiedMarket;
    /**
     *  Resolve any handle (symbol, tradable symbol, pool/market address, market
     *  id) to its tradable. Requires loadMarkets().
     *
     *  **Gotchas**
     *
     *  Resolves MORE than {@link fetchMarkets} lists. A settled binary market the
     *  wallet still holds a position, a fill or an order in is added here the
     *  first time a read names it (`fetchBalance`, `fetchMyTrades`,
     *  `fetchOpenOrders`, `fetchOrders`), by market id and BinaryMarket address —
     *  never by pool, which by then serves the next market in the series. Such a
     *  market can be redeemed and reported; every pool-routed verb refuses it.
     */
    market(ref: MarketHandle): Tradable;
    /**
     *  Snap a price to the market's tick grid (rounds down; binary prices are
     *  also clamped inside (0, 1)).
     *
     *  **When to use**
     *
     *  Use before createOrder with computed prices.
     *
     *  Spot/perp ticks come from the market row; binary ticks come from the pool,
     *  read once by {@link loadMarkets} — so a pool recycled mid-session keeps the
     *  grid captured at load time until `loadMarkets(true)` refreshes it.
     *
     * **Gotchas**
     *
     * - Throws {@link InvalidInputError} if the market is binary and its pool's parameters could not be read — quantizing against a guessed grid is what produced off-tick rejections, so this fails loudly instead.
     */
    priceToPrecision(ref: MarketHandle, price: number): number;
    /**
     *  Snap an amount to the market's lot grid (rounds down).
     *
     *  Spot/perp lots come from the market row; binary lots come from the pool,
     *  read once by {@link loadMarkets} — so a pool recycled mid-session keeps the
     *  grid captured at load time until `loadMarkets(true)` refreshes it.
     *
     * **Gotchas**
     *
     * - Throws {@link InvalidInputError} if the market is binary and its pool's parameters could not be read. Previously such a market fell back to a one-whole-token lot, silently flooring every sub-token amount to 0.
     */
    amountToPrecision(ref: MarketHandle, amount: number): number;
    /**
     *  Every market as an array — {@link loadMarkets} (called if needed), minus
     *  the symbol keying.
     *
     *  **When to use**
     *
     *  Use as the ccxt-shaped sibling for list-style consumers.
     */
    fetchMarkets(): Promise<UnifiedMarket[]>;
    /**
     *  The market's price grid in RAW quote units. Binary ticks come from the pool
     *  (and throw when that read failed, rather than quantizing against a guess);
     *  spot/perp ticks come from the market row, falling back to the venue's
     *  `10 ** (decimals - 3)` convention when the row carries none.
     *
     *  One definition shared by {@link priceToPrecision} and the write path, so a
     *  caller who pre-snaps and a caller who does not cannot be aligned against
     *  different grids.
     */
    private tickOf;
    /** The market's amount grid in RAW base units. See {@link tickOf}. */
    private lotOf;
    private decimalsOf;
    /**
     *  The binary pool's enforced grid, or a throw. Only loadMarkets() populates
     *  the map, so an absent entry means that pool's read failed during the last
     *  load — not that the caller passed a bad ref.
     */
    private requireBookParams;
    /** Native book → this tradable's [price, amount][] view, human units. */
    private bookView;
    /** Taker direction on this tradable's book from a binary side. */
    private sideView;
    /** YES-terms raw price for this tradable's human price (NO inverts). */
    private toNativePrice;
    private priceView;
    /**
     *  An OHLC row through this tradable's lens. NO-outcome tradables mirror the
     *  price axis (p → 1−p), which also SWAPS high and low — the trap every
     *  candle-shaped read must avoid. RULE for new verbs: never invert prices,
     *  sides, or OHLC inline — go through {@link priceView} / {@link sideView} /
     *  this, so a verb cannot forget the lens. (The 1−p mirror is inherently
     *  BINARY: a categorical N-outcome book has no such pairwise mirror, so
     *  outcome views there will need a real per-outcome book, not a wider lens.)
     */
    private ohlcView;
    /**
     *  One-shot book read from the contract (head-fresh; no watch needed).
     *
     *  **When to use**
     *
     *  Use when one book snapshot is enough. For a continuously-current
     *  zero-round-trip book, use {@link watchOrderBook}.
     * Both sides use one selected head, or `options.blockNumber`. Empty books keep
     * that pin. A numeric second argument remains the level limit.
     * @throws {@link InvalidInputError} If the symbol, depth, or pin is invalid.
     * @throws {@link NotConfiguredError} If the owner has no chain endpoint.
     * @throws {@link RpcError} If the head selection or either read fails.
     * @throws {@link ContractRevertError} If the contract rejects a read.
     * @throws {@link InvalidInputError} If the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
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
    fetchOrderBook(ref: MarketHandle, options?: number | FetchOrderBookOptions): Promise<UnifiedOrderBook>;
    /**
     * Recent public trades with authoritative block and log positions (indexer, newest first).
     * @throws {@link InvalidInputError} If the symbol or source position is invalid.
     * @throws {@link IndexerError} If the indexer read fails.
     * @throws {@link NotConfiguredError} If the chain's indexer is absent or does not index that chain.
     * @throws {@link InvalidInputError} If the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     */
    fetchTrades(ref: MarketHandle, since?: number, limit?: number): Promise<UnifiedTrade[]>;
    /**
     * OHLCV candles (indexer), oldest first as [ms,o,h,l,c,vol] rows.
     * Timeframes: 1m 5m 15m 1h 4h 1d.
     *
     * **Example** (Reading candles)
     *
     * The last 24 hourly candles, destructured per row.
     *
     * ```ts
     * const candles = await exchange.fetchOHLCV("SOMI/USDC", "1h", undefined, 24);
     * for (const [ts, open, high, low, close, volume] of candles) {
     *   console.log(new Date(ts).toISOString(), open, high, low, close, volume);
     * }
     * ```
     *
     * - Throws {@link InvalidInputError} - the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     */
    fetchOHLCV(ref: MarketHandle, timeframe?: string, since?: number, limit?: number): Promise<UnifiedOHLCV[]>;
    /**
     * Rolling 24h ticker (indexer): OHLC + base/quote volume folded from the
     * hourly candles, `last` from the freshest fill. NO-outcome tradables view
     * prices through the 1−p lens like every other read.
     *
     * **Gotchas**
     *
     * Candle and perp chain reads start together. Both reads settle before the
     * response returns or a fatal failure throws.
     *
     * The two halves of this response fail independently, and each reports its
     * own state. Read `statsState` and `perpState`; do not infer either from a
     * missing field.
     *
     * The 24h half is contained. A candle request that fails with an
     * `IndexerError` (including malformed candle data), and a market with
     * `indexed: false` (no request is sent),
     * both give `statsState: "unavailable"`, and then `open`, `high`, `low`,
     * `change`, `percentage`, `statsAsOf`, `baseVolume` and `quoteVolume` are all
     * absent. The call still resolves, so the perp chain numbers — mark, index,
     * funding and open interest — survive an indexer outage. `last` and
     * `lastSource` also survive, from the cached market row.
     *
     * `baseVolume` of `0` is a true zero: a successful read over a window with no
     * fills. It is not the same as an absent volume.
     *
     * SDK programming failures reject with `InvariantError`. An unexpected native
     * failure is its exact `cause`; an already-typed SDK error retains its identity.
     * Caller cancellation of indexed candle work retains the
     * configured signal's exact reason. The default is a `DOMException` named
     * `AbortError`; a custom reason can have any caller-chosen type. Cancellation
     * waits for already-started chain work and does not cancel that chain request.
     * A custom SDK error abort reason is cancellation, not an operational outage.
     * The first observed fatal rejection wins after both tiers settle. A later abort
     * does not replace an earlier programming failure, even if it reuses its cause.
     * Contained operational failures do not select the fatal outcome.
     * Chain-only perps send no candle request and therefore have no candle cancellation.
     *
     * The complete modeled failure union and default cancellation are
     * {@link SomniaMarketsFetchTickerError}. Contained `IndexerError` failures give
     * `statsState: "unavailable"`. Operational perp-chain RPC, revert and configuration
     * failures give `perpState: "degraded"`. Chain SDK invariant failures reject.
     *
     * **Example** (Reading a ticker)
     *
     * Drive a price strip off one call.
     *
     * ```ts
     * const tk = await exchange.fetchTicker("SOMI/USDC");
     * if (tk.statsState === "ok") console.log(tk.last, tk.percentage, tk.baseVolume);
     * else console.log(tk.last, "24h statistics unavailable");
     * ```
     *
     * @throws {@link InvalidInputError} When `ref` names no loaded market, names a
     * settled binary market, or the candle request contains an unusable variable.
     * @throws {@link NotConfiguredError} When the indexed candle read has no chain
     * binding or no indexer endpoint, or its indexer does not serve the owner's chain.
     * @throws {@link InvariantError} When either tier or ticker mapping reports an SDK
     * defect. An unexpected programming failure is retained as its exact cause.
     * @throws `DOMException` When the configured signal cancels indexed candle work
     * with its default `AbortError` reason. A custom abort reason is rethrown verbatim.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error in the perp-state read. Its identity is retained.
     */
    fetchTicker(ref: MarketHandle): Promise<UnifiedTicker>;
    /**
     * Wallet balances for every currency the loaded markets use (+ native).
     * Native and portfolio reads overlap market loading. Currency reads and position
     * mapping wait for registry inputs. A failed read joins every started balance
     * stage before it rejects; closing the owner cancels unpublished results.
     *
     * **Gotchas**
     *
     * `free === total`: funds escrowed in resting orders live in the pools, not
     * the wallet, so they simply don't appear here.
     *
     * - Throws {@link SignerRequiredError} - balances are per-account, so this needs a signer (or an `account`) even though it only reads.
     * - Throws {@link NotConfiguredError} - `filter.chainId` names a chain this exchange does not span.
     * - Throws {@link IndexerError} - the outcome-holdings read needed the indexer and it was unreachable, or the indexer served a position on a market it has no row for. Distinct from an empty result: no balances is `{}`, not a throw. The `loadMarkets()` this calls first does NOT throw on an unreachable indexer; it reports through {@link registryReadError}, so a balance set can be short rather than absent.
     * - Throws {@link RpcError} - a chain balance read did not complete. A failed read is never reported as a zero balance or a missing key.
     * - Throws {@link ContractRevertError} - a token's `balanceOf` reverted.
     *
     * With no `filter.chainId` this reads every chain and throws when any chain
     * fails. On an exchange with more than one chain, the thrown `IndexerError`
     * or `RpcError` then has `chainId` set to the chain that failed. Supplied
     * constructor/socket failures retain their properties and identity. Pass
     * `filter.chainId` to read one chain only (see {@link SomniaMarketsChainFilter}).
     *
     * A chain bound with no `indexerUrl` reports its ERC-20 and native balances
     * and no outcome holdings, because holdings are indexer data. Such chains
     * are listed in {@link chainIdsWithoutIndexer}.
     *
     * **Example** (Reading balances)
     *
     * ERC-20s key by currency code; binary outcome holdings key by TRADABLE symbol.
     *
     * ```ts
     * const bal = await exchange.fetchBalance();
     * console.log(bal.USDC?.total);                              // collateral in the wallet
     * console.log(bal["BTC-95000-31DEC26/USDC#YES"]?.total);     // YES shares held
     * // A holding on a market that already SETTLED is listed under that market's
     * // own symbol, even though `fetchMarkets()` no longer lists the market.
     * for (const [symbol, held] of Object.entries(bal)) {
     *   if (symbol.includes("#") && !exchange.symbols.includes(symbol.split("#")[0] ?? "")) {
     *     console.log("settled, redeemable:", symbol, held.total);
     *   }
     * }
     * ```
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
     * @throws {DOMException} With name AbortError if `close()` interrupts the unfinished balance read, including its market load.
     */
    fetchBalance(filter?: SomniaMarketsChainFilter): Promise<UnifiedBalances>;
    /**
     *  Open orders (indexer view).
     *
     *  **When to use**
     *
     *  Use for an occasional snapshot; a trading loop should prefer
     *  {@link watchOrders}.
     *
     *  **Details**
     *
     *  `limit` is applied BY THE QUERY, per venue — not to the merged result. An
     *  unscoped call reads all three venues, so it can return up to 3 × `limit`
     *  rows per chain. A `ref`-scoped call restricts the exact market and binary
     *  outcome before the query applies its limit. The default is 200 per venue.
     *
     * - `ref`: Restrict to one tradable (symbol or address). Omit for all.
     * - `limit`: Max orders PER VENUE the query returns (default 200).
     * - `filter.chainId`: Read only this chain.
     *
     *  With no `ref` and no `filter.chainId` this reads every chain and throws
     *  when any chain fails. On an exchange with more than one chain, the thrown
     *  `IndexerError`, or the `RpcError` of an on-chain order read, then has
     *  `chainId` set to the chain that failed (see
     *  {@link SomniaMarketsChainFilter}).
     *
     *  An unscoped indexed read runs the binary, spot and perp portfolio reads at
     *  the same time. The result keeps chain binding order, then binary, spot, perp
     *  order within a chain, whatever order the reads finish in. When more than one
     *  read fails, the error is the first one to arrive.
     *
     *  On a chain bound with no `indexerUrl` (see {@link chainIdsWithoutIndexer})
     *  this reads the resting orders from the chain instead, over the perp pools
     *  that {@link loadMarkets} discovered there. Those rows have no `txHash` and
     *  no `timestamp`.
     *
     *  **Gotchas**
     *
     *  The indexer view lags the chain slightly.
     *
     *  This read needs the indexer and throws `IndexerError` while it is
     *  unreachable. Do NOT wrap it in a catch that returns an empty list: a bot
     *  that does so believes it has nothing resting during an outage, and then
     *  quotes again on top of its own live orders. The chain-backed substitute is
     *  `exchange.client.getOpenOrdersOnchain(pools, owner)`, which answers from
     *  the pool contracts at one pinned block. It returns raw rows without a
     *  market, a symbol or a binary YES/NO side, so it is a substitute for quote
     *  management rather than a drop-in replacement for this verb.
     *
     *  On SPOT the same limit also bounds the PENDING STOP ORDERS the underlying
     *  portfolio read returns — one query variable caps both sets. That list is
     *  not part of this verb's result, so the coupling is invisible here, but a
     *  caller reading `client.getSpotPortfolio` directly with a small
     *  `ordersLimit` will see a correspondingly short `pendingStopOrders`.
     *
     * @throws {@link InvalidInputError} If `ref` is unknown, or `ref` is not on `filter.chainId`.
     * @throws {@link NotConfiguredError} If `filter.chainId` names a chain this exchange does not span.
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
    fetchOpenOrders(ref?: MarketHandle, limit?: number, filter?: SomniaMarketsChainFilter): Promise<UnifiedOrder[]>;
    /**
     *  {@link fetchOpenOrders} on a chain bound with no indexer: the resting
     *  orders read from the chain, over the perp pools that {@link loadMarkets}
     *  discovered there. Rows have no `txHash` and no `timestamp`, because only
     *  the indexer records them.
     */
    private fetchOpenOrdersOnchain;
    /**
     * The wallet's orders across every lifecycle status (indexer), newest
     * first — the history counterpart to {@link fetchOpenOrders}. Scope to one
     * tradable with `ref`; page with `limit`/`params.offset`, both forwarded to
     * the query as a true offset window over one ordered set. (Its siblings page
     * differently: {@link fetchMyTrades} pages a fill tape to satisfy `limit`,
     * and {@link fetchOpenOrders} applies its limit per venue.)
     *
     * `params.chainId` reads only that chain (see {@link SomniaMarketsChainFilter}).
     * With no `ref` and no `params.chainId` this reads every chain and throws when
     * any chain fails. On an exchange with more than one chain, the thrown
     * `IndexerError` then has `chainId` set to the chain that failed. A read over
     * more than one chain skips a chain bound with no `indexerUrl` (see {@link chainIdsWithoutIndexer}).
     *
     * **Example** (Reading order history)
     *
     * The last 50 orders on one book, whatever became of them.
     *
     * ```ts
     * const orders = await exchange.fetchOrders("SOMI/USDC", undefined, 50);
     * for (const o of orders) console.log(o.status, o.side, o.amount, o.txHash);
     * ```
     *
     * @throws {@link InvalidInputError} If `ref` is unknown, or `ref` is not on `params.chainId`.
     * @throws {@link NotConfiguredError} If `params.chainId` names a chain this exchange does not span, or the one chain the read touches has no indexer.
     */
    fetchOrders(ref?: MarketHandle, since?: number, limit?: number, params?: SomniaMarketsChainFilter & {
        offset?: number;
    }): Promise<UnifiedOrder[]>;
    /**
     * Read one raw-row page of the authenticated owner's indexed order history.
     *
     * Use this method to traverse indexed order records with immutable order
     * identities. The records and offset window are mutable. They are not an
     * immutable lifecycle log or a current Open Orders snapshot. The default
     * `limit` is 100 and the default `offset` is 0. Continuation depends on raw
     * rows, so a full page can have no display orders and still continue. The
     * result is partial because changes can make pages skip or repeat rows.
     * Exhaustion does not prove complete account state.
     *
     * The `status` option is an indexed history filter. In particular,
     * `status: "Open"` cannot establish completeness, removals, continuity, or
     * action freshness. Use a separately supported current-state flow when the
     * caller needs the SDK's current open-order view.
     *
     * The `chainId` option reads only that chain. With no `ref` and no `chainId`
     * this reads every chain and throws when any chain fails. On an exchange with
     * more than one chain, the thrown `IndexerError` then has `chainId` set to the
     * chain that failed. A read over more than one chain skips a chain bound with no `indexerUrl` (see {@link chainIdsWithoutIndexer}).
     *
     * **Example** (Following order-history page offsets)
     *
     * ```ts
     * let offset = 0;
     * while (true) {
     *   const page = await exchange.getOrderHistoryPage({ limit: 100, offset });
     *   for (const order of page.orders) console.log(order.identity, order.status);
     *   if (page.nextOffset === null) break;
     *   offset = page.nextOffset;
     * }
     * ```
     *
     * @throws {@link InvalidInputError} If the ref, status, limit, or offset is invalid, or the ref is not on `chainId`.
     * @throws {@link SignerRequiredError} If no account is configured.
     * @throws {@link IndexerError} If the indexer read or producer-row conversion fails.
     * @throws {@link NotConfiguredError} If `chainId` names a chain this exchange does not span, or the chain's indexer is absent or does not index that chain.
     */
    getOrderHistoryPage(options?: SomniaMarketsGetOrderHistoryPageOptions): Promise<UnifiedOrdersPage>;
    /**
     * Read one raw-row page of the authenticated owner's indexed order history.
     *
     * This compatibility name has the same result, pagination, `chainId` option,
     * and errors as {@link SomniaMarkets.getOrderHistoryPage}.
     *
     * @throws {@link InvalidInputError} If the ref, status, limit, or offset is invalid, or the ref is not on `chainId`.
     * @throws {@link SignerRequiredError} If no account is configured.
     * @throws {@link IndexerError} If the indexer read or producer-row conversion fails.
     * @throws {@link NotConfiguredError} If `chainId` names a chain this exchange does not span, or the chain's indexer is absent or does not index that chain.
     */
    getOrdersPage(options?: SomniaMarketsGetOrdersPageOptions): Promise<UnifiedOrdersPage>;
    /**
     *  Make every market id in `ids` resolvable, hydrating on demand the ones the
     *  tradable registry does not carry — a SETTLED binary market a wallet still
     *  holds a position, a fill or an order in. Each unknown id is read once by
     *  primary key and added to the symbol registry for resolution only; it is not
     *  listed by `fetchMarkets()`. A miss is remembered so the same id is not
     *  re-queried on every read. Throws {@link IndexerError} when a read fails.
     */
    private ensureResolvable;
    /**
     *  The tradable an indexer row (fill, order, position) belongs to, resolved by
     *  the row's STABLE market id — never by its pool. A binary pool is recycled
     *  across successive markets, so the pool names whichever market sits on it
     *  now; the market id names the market the row was written in. On spot/perp
     *  the pool address is the market id, so the two routes agree.
     *
     *  Null when the registry does not carry the market, or when the row's pool
     *  is not the resolved market's pool (a row the indexer mis-joined). A binary
     *  row with a side resolves to that side's outcome tradable.
     */
    private resolveRowTradable;
    private mapOrderRow;
    private mapPortfolioOrder;
    /** A spot or perp order read from the chain; binary rows carry no YES/NO side. */
    private mapOnchainOrder;
    private mapSpotPortfolioOrder;
    /**
     * The wallet's portfolio metrics plane over a timeframe: a holdings curve,
     * an equity curve, per-bucket PnL, money-weighted return, volume, and fees
     * saved versus a comparison taker rate. Computed client-side from the
     * wallet's indexed fills (avg-cost basis) marked to candle closes — no
     * server aggregate involved.
     *
     * The two curves measure different things. `holdings` is what the traded
     * book is worth at each sample, so it is a level. `equity` is the window's
     * cumulative realized and unrealized PnL, so it is a change. Neither counts
     * a token that arrived without a fill: read balances from the chain for what
     * the wallet itself holds. Read `HoldingsPoint` before presenting the level
     * — it states where its sign and its completeness end.
     *
     * SPOT-scoped today: binary outcomes settle rather than mark, and the perp
     * account plane (funding, margin) joins the fold as new event kinds when
     * perp analytics land. The indexer returns only the wallet's SPOT fills, so
     * binary and perp rows are not transferred. Fills are paged to exhaustion —
     * truncating would drop the OLDEST fills and silently corrupt the carried-in
     * cost basis, not just undercount volume. Chains are read concurrently, one
     * page in flight per chain. An optional page budget counts pages across all
     * chains and rejects with an incomplete-history error instead of returning
     * partial PnL. A failure on one chain rejects the call, and on a multi-chain
     * exchange an indexer failure carries that `chainId`. Each call starts at the
     * newest page, including after a previous empty result.
     * Fills whose taker direction the indexer has not resolved (`takerIsBid`
     * null), or where the wallet's role (maker vs
     * taker) is unknowable, are skipped rather than guessed.
     *
     * The money-weighted return needs to know what capital the wallet put in.
     * Fills alone cannot say — capital that never passed through a trade is
     * invisible to them — so without `funding` the capital base is a trades-only
     * proxy that overstates the return for a wallet trading a small part of its
     * balance. Pass `funding` to measure against real external capital, and read
     * `mwrr.capitalBasis` to see which definition applied.
     *
     * **Example** (Measuring portfolio performance)
     *
     * ```ts
     * const p = await exchange.fetchPortfolioAnalytics("7d");
     * console.log(p.pnl.totalUsd, p.mwrr.return, p.equity.length);
     * ```
     * @throws {@link InvalidInputError} If the optional page budget is invalid.
     * @throws {@link SignerRequiredError} If no account is configured.
     * @throws {@link IndexerError} If an indexer read fails.
     * @throws {@link IndexerUnavailableError} If the SDK refuses the indexer read locally.
     * @throws {@link FillHistoryUnavailableError} If the indexer cannot identify the served fill dataset.
     * @throws {@link FillHistoryRestartRequiredError} If the fill dataset changes while history is paged.
     * @throws {@link IncompleteHistoryError} If the budget ends or a cursor cycles before complete history is read.
     * @throws {@link NotConfiguredError} If the chain's indexer is absent or does not index that chain.
     */
    fetchPortfolioAnalytics(timeframe: PortfolioTimeframe, params?: SomniaMarketsFetchPortfolioAnalyticsOptions): Promise<PortfolioAnalytics.PortfolioAnalytics>;
    /**
     *  My historical trades, newest-first across every venue.
     *
     *  **Details**
     *
     *  Reads the unified fill tape (`getUserFills`), so the scope, the window and
     *  the limit are applied by the INDEXER rather than to an already-truncated
     *  page. This is what makes a narrow question answerable: a `ref`-scoped call
     *  returns that market's fills however old they are, where a per-venue read
     *  would have capped at its newest 50 across all markets first and left
     *  nothing to filter.
     *
     *  `limit` counts rows YOU receive. A fill on a market outside the loaded
     *  registry is hydrated by its market id, so a settled market's fills keep
     *  their own symbol; only a row the indexer has no market for at all is
     *  dropped. The read therefore pages until it has `limit` resolvable rows or
     *  the tape runs out — asking the query for exactly `limit` would
     *  under-deliver by however many it then dropped.
     *
     * - `ref`: Restrict to one tradable (symbol or address). Omit for all.
     * - `since`: Lower time bound, **milliseconds** — same clock as {@link UnifiedTrade.timestamp}, so a value read off a previous row can be passed straight back. Converted to the indexer's unix seconds internally.
     * - `limit`: Max rows to return (default 50).
     * - `filter.chainId`: Read only this chain. With no `ref` and no `filter.chainId` this reads every chain and throws when any chain fails; on an exchange with more than one chain the thrown `IndexerError` then has `chainId` set to the chain that failed. A read over more than one chain skips a chain bound with no `indexerUrl` (see {@link chainIdsWithoutIndexer}).
     * @throws {@link InvalidInputError} If the symbol or source position is invalid, or `ref` is not on `filter.chainId`.
     * @throws {DOMException} With name AbortError if `close()` interrupts the unfinished history read, including initial market loading, fill reads or settled-market resolution.
     * @throws {@link InvariantError} If initial market loading or history resolution detects an SDK defect.
     * @throws {@link IndexerError} If indexer validation, a fill read or settled-market decoding/preparation fails.
     * @throws {@link SignerRequiredError} If no account is configured.
     * @throws {@link NotConfiguredError} If `filter.chainId` names an unconfigured chain, its indexer is absent or does not index it, or initial market loading needs chain access without a WebSocket endpoint.
     */
    fetchMyTrades(ref?: MarketHandle, since?: number, limit?: number, filter?: SomniaMarketsChainFilter): Promise<UnifiedTrade[]>;
    /** One chain's page of {@link fetchMyTrades}. */
    private fetchMyTradesOn;
    /**
     *  One fill row through the asking tradable's lens, or null when the row's
     *  market is not in the registry or falls outside `scope`.
     *
     *  Binary rows carry the account's YES/NO side, which selects the outcome
     *  tradable — and NO mirrors both price and side, so both go through
     *  {@link priceView} / {@link sideView} rather than being read raw.
     */
    private fillToUnifiedTrade;
    /** Spot/perp direction FROM THIS ACCOUNT's seat: the maker is the taker's mirror. */
    private takerSideView;
    /**
     * Read the local chain-tail status without network requests.
     * "ok" means no watches are held or the tail is connected. "connecting" means
     * a watch is awaiting its first head. "error" means a previously live socket was lost
     * or the tail retains an operational failure.
     */
    fetchStatus(): Promise<ExchangeStatus>;
    /**
     * Observe independent indexer freshness and per-asset price health once. No polling starts.
     * The top-level verdict describes only the chain tails. `indexer` is the PRIMARY
     * chain's freshness; `indexerByChain` carries every configured chain's. Use
     * fetchStatus for a local-only snapshot.
     *
     * This is the health surface, so it measures each chain on its own. When one chain's
     * measurement fails, the call still resolves: that chain's error is in
     * `indexerErrorByChain` and the chain has no key in `indexerByChain`. The call throws
     * only when every configured chain fails. It then throws the primary chain's error.
     * On an exchange with more than one chain, SDK-owned `IndexerError` or `RpcError`
     * values name the primary chain. Supplied constructor or socket failures retain
     * their original properties and identity.
     * @throws {InvalidInputError} chainId does not match the owner or a variable is invalid.
     * @throws {IndexerError} Metadata request failed.
     * @throws {NotConfiguredError} The owner's chain transport is unavailable, the owner has no
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
    fetchDataStatus(): Promise<ExchangeDataStatus>;
    private tryResolvePool;
    private tryResolveByMarketAddress;
    /**
     *  Hold the ref-counted market watch behind a symbol (idempotent). Rejects
     *  with the release error if `unwatchMarket` or `close` released this
     *  acquisition while it hydrated: a rewatch after the release owns its own
     *  acquisition, and this call must not attach a channel to it.
     */
    private ensureWatch;
    /**
     *  Streaming semantics: resolves with the channel's current value on first
     *  call, then each subsequent call resolves when the underlying (memoized)
     *  native ref CHANGES — reference equality is the change detector. A channel
     *  with a `marketSymbol` belongs to that market's watch and needs it held.
     */
    private nextTick;
    /** Remove the channels `drop` selects and reject their pending waits with the release error. */
    private dropChannels;
    private ensureListener;
    /**
     * Streaming book off the local store: zero round-trips, current to the last
     * block; each await resolves on the next book change.
     *
     * **Example** (Watching the order book)
     *
     * A quoting loop: wake on every book change, read the touch.
     *
     * ```ts
     * while (true) {
     *   const book = await exchange.watchOrderBook("SOMI/USDC", 5);
     *   const [bestBid] = book.bids[0] ?? [];
     *   const [bestAsk] = book.asks[0] ?? [];
     *   console.log(`bid ${bestBid} / ask ${bestAsk}`);
     * }
     * ```
     * Block provenance comes from the native owner. Background failures appear in tail status.
     * @throws {@link InvalidInputError} If the symbol or source position is invalid.
     * @throws {@link NotConfiguredError} If the owner has no chain endpoint.
     * @throws {@link IndexerError} If snapshot initialization fails.
     * @throws {@link RpcError} If chain catch-up fails.
     * @throws {@link ContractRevertError} If a required contract read reverts.
     * @throws {@link InvalidInputError} If the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     * @throws A `DOMException` named `AbortError` if {@link SomniaMarkets.unwatchMarket} or {@link SomniaMarkets.close} releases the market while this call waits, or while it hydrates and the hydration succeeds. This is caller cancellation.
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
    watchOrderBook(ref: MarketHandle, limit?: number): Promise<UnifiedOrderBook>;
    /**
     * Streaming public trades (the live tape), newest first.
     *
     * **Example** (Watching trades)
     *
     * Print each fill as it lands (`[0]` is always the latest).
     *
     * ```ts
     * while (true) {
     *   const [latest] = await exchange.watchTrades("SOMI/USDC", 1);
     *   if (latest) console.log(`${latest.side ?? "?"} ${latest.amount} @ ${latest.price}`);
     * }
     * ```
     * Block provenance comes from the native owner. Background failures appear in tail status.
     * @throws {@link InvalidInputError} If the symbol or source position is invalid.
     * @throws {@link NotConfiguredError} If the owner has no chain endpoint.
     * @throws {@link IndexerError} If snapshot initialization fails.
     * @throws {@link RpcError} If chain catch-up fails.
     * @throws {@link ContractRevertError} If a required contract read reverts.
     * @throws {@link InvalidInputError} If the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     * @throws A `DOMException` named `AbortError` if {@link SomniaMarkets.unwatchMarket} or {@link SomniaMarkets.close} releases the market while this call waits, or while it hydrates and the hydration succeeds. This is caller cancellation.
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
    watchTrades(ref: MarketHandle, limit?: number): Promise<UnifiedTrade[]>;
    /**
     * Streaming view of MY orders on this tradable (authenticated).
     *
     * **When to use**
     *
     * Use to learn that a resting order filled: its status flips to "closed".
     *
     * **Example** (Waiting for an order)
     *
     * Place a limit order, then block until it fully fills (or dies).
     *
     * ```ts
     * const placed = await exchange.createOrder(symbol, "limit", "buy", 10, 0.62);
     * while (placed.status === "open") {
     *   const orders = await exchange.watchOrders(symbol); // resolves on the next change
     *   const mine = orders.find((o) => o.id === placed.id);
     *   if (!mine || mine.status !== "open") break; // filled, canceled, or expired
     * }
     * ```
     *
     * - Throws {@link InvalidInputError} - the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     * - Throws a `DOMException` named `AbortError` - {@link SomniaMarkets.unwatchMarket} or {@link SomniaMarkets.close} released the market while this call waited, or while it hydrated and the hydration succeeded. This is caller cancellation.
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
    watchOrders(ref: MarketHandle, limit?: number): Promise<UnifiedOrder[]>;
    /**
     * Streaming view of MY fills on this tradable (authenticated).
     * Block provenance comes from the native owner. Background failures appear in tail status.
     * @throws {@link InvalidInputError} If the symbol or source position is invalid.
     * @throws {@link NotConfiguredError} If the owner has no chain endpoint.
     * @throws {@link IndexerError} If snapshot initialization fails.
     * @throws {@link RpcError} If chain catch-up fails.
     * @throws {@link ContractRevertError} If a required contract read reverts.
     * @throws {@link SignerRequiredError} If no account is configured.
     * @throws {@link InvalidInputError} If the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     * @throws A `DOMException` named `AbortError` if {@link SomniaMarkets.unwatchMarket} or {@link SomniaMarkets.close} releases the market while this call waits, or while it hydrates and the hydration succeeds. This is caller cancellation.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
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
    watchMyTrades(ref: MarketHandle, limit?: number): Promise<UnifiedTrade[]>;
    /**
     * Release one market's streaming resources and keep the exchange open.
     *
     * **When to use**
     *
     * Use when a consumer stops following a market, for example a bot that moves
     * to the next symbol in a rotating binary series. Without this call the
     * exchange holds every watched market until {@link SomniaMarkets.close}.
     *
     * **Details**
     *
     * The first `watchOrderBook`, `watchTrades`, `watchOrders` or `watchMyTrades`
     * call on a market opens one market watch. The other calls on that market
     * share it. This call releases that watch and every streaming channel on the
     * market, for all its outcomes. Other markets are not affected.
     *
     * - A pending `watch*` wait on the market rejects with a `DOMException` named
     *   `AbortError`. This is caller cancellation, not an SDK failure.
     * - A `watch*` call still hydrating the market rejects with that
     *   `AbortError` when hydration succeeds, and its watch is released then.
     *   If hydration fails, the call rejects with the hydration error instead.
     * - The next `watch*` call on the market opens a fresh watch. A late
     *   hydration from before the release cannot replace that watch or stop it.
     * - The client keeps the market's live data for a 30-second linger after
     *   the last holder releases it, so a quick rewatch skips a new snapshot.
     *   Then it drops the market's orders and fills. It keeps the market row.
     * - Releasing a market that is not watched does nothing. Calling this twice
     *   is the same as calling it once, and it is safe before or after `close()`.
     *
     * The cache entry and the channels are released before this returns. The
     * returned promise resolves when the watch handle is stopped: at once for a
     * hydrated watch, or when a hydration in progress settles. Awaiting it is
     * optional.
     *
     * A symbol that no longer resolves, for example one that a later
     * `loadMarkets(true)` dropped, is still released by its market symbol. An
     * on-chain ref (an address, a market id or a `{ chainId, id }` ref) must
     * resolve: it names no symbol, so an ambiguous or unknown one rejects.
     * Price watches from `watchPrice` are not affected; `close()` releases them.
     *
     * **Example** (Following a rotating series)
     *
     * ```ts
     * let current: string | undefined;
     * async function follow(next: string) {
     *   if (current) await exchange.unwatchMarket(current);
     *   current = next;
     *   return exchange.watchOrderBook(next, 5);
     * }
     * ```
     *
     * @param ref - The market or any of its tradables, in any form {@link SomniaMarkets.market} accepts.
     * @throws {@link InvalidInputError} If `ref` is an on-chain ref (an address, a market id or a `{ chainId, id }` ref) that does not resolve to exactly one market.
     */
    unwatchMarket(ref: MarketHandle): Promise<void>;
    /**
     *  The watch-cache key for a release. A symbol string that no longer resolves
     *  is split into its market symbol. An on-chain ref that does not resolve
     *  names no symbol, so its error propagates rather than releasing nothing.
     */
    private releaseKeyOf;
    /**
     *  Hydrate and hold the signer's order/fill history on EVERY configured
     *  chain, behind one handle. Each chain's engine opens its own ref-counted
     *  user watch; stopping the handle releases all of them. Activity then
     *  arrives on the per-market `watch*` verbs with each event's `chainId`.
     *
     *  **Gotchas**
     *
     *  - Throws {@link SignerRequiredError} - no signer on this exchange.
     *  - Throws {@link NotConfiguredError} - `filter.chainId` names a chain this exchange does not span, or the one chain the watch touches has no indexer.
     *  - Throws {@link RpcError} - a chain's socket could not open. The chains open
     *    at the same time. The call waits for every chain to settle, then stops
     *    each handle that opened, including one that opened after the failure,
     *    before the error propagates. When more than one chain fails, the error is
     *    the one from the first failing chain in binding order. On an exchange with
     *    more than one chain and no `filter.chainId`, its `chainId` is set to that
     *    chain.
     *
     *  Pass `filter.chainId` to watch one chain only (see {@link SomniaMarketsChainFilter}).
     *  A watch over more than one chain skips a chain bound with no `indexerUrl` (see {@link chainIdsWithoutIndexer}),
     *  because a user watch loads its history from the indexer.
     */
    watchUser(filter?: SomniaMarketsChainFilter): Promise<WatchHandle>;
    private accountsInstance;
    /**
     *  The smart-accounts surface across this exchange's chains: derive the one
     *  address, scan every covered chain, fan one signed authorization out into
     *  per-chain creation calls, and build the multi-chain account the exchange
     *  trades through. See {@link ExchangeSmartAccounts}; the one-chain surface
     *  is `client.accounts`.
     */
    get accounts(): ExchangeSmartAccounts;
    private bridgeInstance;
    /** Aborted by `close()` to end every delivery wait, then replaced so the instance stays usable. */
    private closeController;
    /**
     *  Funding state per (account, chainId, token address), in memory on this
     *  instance only (SDK-ARCH-002). `tail` settles when the current funding turn
     *  for the key ends. `pending` holds bridge legs that timed out before delivery.
     */
    private readonly funding;
    private collateralReadFailures;
    /**
     * Failed reads from the last completed collateral balance sweep, keyed by chain.
     * Available after `createOrder` checks or `ensureFunds`, including successful
     * bridge plans. Empty before the first sweep and after a complete successful read.
     * Target-chain failures throw and leave this snapshot unchanged. Concurrent
     * sweeps replace it in completion order; a shortfall error retains its own snapshot.
     */
    get collateralReadErrors(): Readonly<Record<number, CollateralReadError>>;
    /**
     *  The bridge between this exchange's chains, through the account's
     *  executors: plan a transfer, or execute one and wait for it to land.
     *  See {@link ExchangeBridge}.
     */
    get bridge(): ExchangeBridgeApi;
    /**
     *  The exchange bridge, with the close signal its transfers read. A caller
     *  whose captured signal is still the live one reuses the shared instance,
     *  which reads that same signal: `bridge` stays the single send path.
     */
    private bridgeWith;
    /** A bridge bound to one close signal. */
    private newBridge;
    /**
     *  Make sure the account holds `amount` of a currency on one chain, bridging
     *  the shortfall from the richest other configured chain when it does not.
     *  `createOrder(…, { funding: "auto" })` bridges the same way, but it finds
     *  the order's escrow token by address instead of by code.
     *
     *  **Details**
     *
     *  - `code`: the currency's code — the key {@link fetchBalance} uses (`"USDso"`,
     *    `"STT"`, …). Addresses differ per chain; the code names the asset. On
     *    `chainId` it resolves to the native coin, else the bridge registry's token
     *    for that code, else a listed market's token with that code. The bridge
     *    route then follows that token's address, never the code.
     *  - `chainId`: the chain the funds must end up on.
     *  - `amount`: raw units of the currency on that chain.
     *
     *  Resolves with `null` when no new bridge leg was needed, else the bridge result.
     *  Other-chain read failures remain available through {@link collateralReadErrors}.
     *  A shortfall error also retains them in `readErrors` and its aggregate `cause`.
     *
     *  Calls for the same account, chain and currency run one at a time on this
     *  exchange, so two concurrent calls do not both bridge the same shortfall.
     *  A `createOrder(…, { funding: "auto" })` for the same key keeps its place in
     *  that queue until its order is sent, so the next call reads the balance after
     *  that order took its escrow. Each call in the queue can wait a full delivery
     *  timeout, so waits add up.
     *
     *  A leg that timed out stays pending on this exchange. When a later call for
     *  the same key finds a shortfall, it waits for that message first and sends
     *  no new leg for it. When the balance already covers the amount, it does not
     *  wait. This state is in memory only: a new exchange instance does not know
     *  about an earlier leg.
     *
     *  `close()` ends the delivery waits of every call that started before it,
     *  including calls still in the queue. Such a call opens no new wait. A leg it
     *  sends is reported as pending.
     *
     *  **Gotchas**
     *
     *  - Throws {@link CollateralOnWrongChainError} - no other configured chain holds enough, or the currency has no bridge route.
     *  - Throws {@link InvalidInputError} - `amount` is positive and no token on `chainId` carries `code`.
     *  - Throws {@link BridgeLiquidityError} - a native route's destination router holds less than the shortfall. Nothing was sent.
     *  - Throws {@link BridgeDeliveryTimeoutError} - a bridge leg was not delivered within the timeout or before `close()`. The leg is the one this call sent, or a pending leg from an earlier call, in which case this call sent nothing. The error carries `messageId`. A later call on this exchange waits for that message again and sends no new leg for it. From another process or instance, check `delivered(messageId)` on the destination Mailbox first, or the funds move twice.
     *  - Throws {@link RpcError} - a balance read or a bridge step failed. A failed destination router read (`operation: "getBalance"`) sent nothing. See {@link ExchangeBridge.transfer} for the other bridge `RpcError` cases.
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
    ensureFunds(params: {
        code: string;
        chainId: number;
        amount: bigint;
    }, options?: ExchangeBridgeTransferOptions): Promise<ExchangeBridgeResult | null>;
    /**
     *  Wait until every earlier funding turn for the same (account, chainId, token)
     *  has ended. Resolves with that key's pending legs and a `release` that ends
     *  this turn. The caller must call `release` exactly once.
     */
    private fundingTurn;
    /**
     *  `ensureFunds` for a token already resolved by address, inside its funding
     *  turn. On a shortfall, each pending leg is waited on and the balance is read
     *  again, so a pending amount is part of that balance and is never bridged
     *  again. `closed` is the close signal as it was when the caller started.
     */
    private fundOn;
    /** The token a currency code names on one chain: the native coin, the bridge registry's token, or a listed market's. */
    private tokenForCode;
    /**
     *  The account's raw balance of a token on one chain, found by ADDRESS (the
     *  zero address is the native coin). With `everywhere`, also the bridge route
     *  the registry lists for that address, and the balance of the route's token
     *  on every other configured chain the registry lists it on. A token the
     *  registry does not list has no route and no other-chain reads, whatever
     *  its code.
     */
    private holdingsOf;
    /** A bridge plan covering `amount` of the `token` route onto `chainId` from the richest other chain, when a route exists. */
    private bridgePlanFor;
    /**
     *  What the wallet must hold on the market's chain for an order, or null when
     *  there is nothing for the wallet to fund: perp margin, a binary sell's
     *  outcome tokens, or a spot order the pool's vault already covers.
     *  `quantity` is the raw, lot-aligned amount and `limitPrice` the
     *  tick-aligned human price createOrder is about to send. The result names
     *  the escrow token by address on the market's chain (the zero address for
     *  the native coin); `code` is only its label. A spot result also carries
     *  `vault`: the pool's full requirement, for the manual-vault-mode report.
     */
    private escrowOf;
    /**
     *  The collateral-placement check before an order is encoded: explicit by
     *  default (throw with a plan), automatic on request (bridge, wait, continue),
     *  or skipped. Resolves with a release that `createOrder` calls once the order
     *  is sent or has failed. An auto-funded order holds its funding turn until
     *  then, so a concurrent one reads the balance after this order took its escrow.
     */
    private placeCollateral;
    /** Hold the ref-counted price watch behind an asset (idempotent). */
    private ensurePriceWatch;
    private toUnifiedPrice;
    /**
     *  Streaming price off the local price store: zero round-trips, current to the
     *  last pushed tick; each await resolves on the next price change.
     *
     *  **Details**
     *
     *  First call hydrates the ref-counted feed watch.
     *
     *  **Gotchas**
     *
     *  Requires `config.priceFeed` to be set, INCLUDING its `quote`: an unpinned
     *  feed rejects a live watch with a `NotConfiguredError` naming
     *  `config.priceFeed.quote`, because the tick tape's cursor is unique only
     *  within one quote. The one-shot price reads still work unpinned.
     */
    watchPrice(asset: string): Promise<UnifiedPrice>;
    /**
     *  One-shot current price (indexer HTTP read; no watch needed), or null if the
     *  feed has no observations yet.
     */
    fetchPrice(asset: string): Promise<UnifiedPrice | null>;
    /**
     *  OHLC price candles (EMA oracle), oldest first as [ms,o,h,l,c,vol] rows.
     *
     *  **Details**
     *
     *  Timeframes: 1m 1h 1d (aliases for the feed's M1/H1/D1).
     *
     *  **Gotchas**
     *
     *  `vol` is the oracle update count for the bucket (NOT trade volume).
     */
    fetchPriceOHLCV(asset: string, timeframe?: string, since?: number, limit?: number): Promise<UnifiedOHLCV[]>;
    /**
     * Place an order.
     *
     * **Details**
     *
     * Works identically for every market kind: the tradable symbol carries the
     * outcome, `side` is plain buy/sell, prices and amounts are human units in the
     * tradable's own terms. `type: "market"` computes a crossing limit from the
     * best opposite level ± `params.slippage` (default 1%) and sends it IOC.
     * Resolves once mined, with fills decoded from the same round-trip.
     *
     * **Gotchas**
     *
     * A NO price is the NO probability — the YES-terms complement is handled
     * internally.
     *
     * The price and quantity are ALIGNED to the market's tick and lot grids before
     * they are sent, because the pool rejects an off-grid value outright. Alignment
     * never moves a value against you: a buy price rounds down, a sell price rounds
     * up, and a quantity always rounds down, so the order is never larger or worse
     * priced than you asked for. The returned {@link UnifiedOrder} carries what was
     * actually placed, which may differ from the arguments by up to one tick or lot
     * — read `price` and `amount` back from it rather than assuming your inputs.
     * Pre-aligning with {@link priceToPrecision} / {@link amountToPrecision} makes
     * this a no-op, since aligning an aligned value changes nothing.
     *
     * Note {@link priceToPrecision} always rounds DOWN, for either side; this path
     * is side-aware instead, so for a sell the two can differ by one tick.
     *
     * A quantity below one whole lot throws {@link InvalidInputError} rather than
     * silently placing a zero-quantity order.
     *
     * - Throws {@link SignerRequiredError} - the exchange was built without a `privateKey` / `account` / `walletClient`.
     * - Throws {@link InvalidInputError} - unknown symbol (call `loadMarkets()` first), a `"limit"` order with no price, or a `"market"` order whose opposite book side is empty so no crossing price exists.
     * - Throws {@link ContractRevertError} - the chain rejected the order. Branch on `errorName` for the protocol's own reason (e.g. `InsufficientBalance`, `ExpiredOrderMustBeCancelled`). Also thrown before anything is sent when a spot pre-check read (`getAutoPullRequirement`, `getManualVaultMode`) reverts.
     * - Throws {@link RpcError} - the node refused the transaction, or a pre-check read (pool requirement, vault mode, balance) failed before anything was sent.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link CollateralOnWrongChainError} - the collateral pre-check (see `funding`) found a shortfall on the market's chain: in the wallet, or in the pool vault under manual vault mode. Nothing was sent.
     *
     * **Example** (Placing binary orders)
     *
     * Rest a bid at 62% on YES, then take the NO book at market.
     *
     * ```ts
     * const rested = await exchange.createOrder("BTC-95000-31DEC26/USDC#YES", "limit", "buy", 25, 0.62);
     * console.log(rested.status, rested.filled); // "open" 0 — or "closed" if it crossed
     *
     * const taken = await exchange.createOrder("BTC-95000-31DEC26/USDC#NO", "market", "sell", 10, undefined, {
     *   slippage: 0.02, // accept up to 2% past the best bid
     * });
     * ```
     *
     * - Throws {@link InvalidInputError} - the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     * - Throws {@link BridgeLiquidityError} - `funding: "auto"` needs a native bridge route whose destination router holds less than the shortfall. Nothing was sent.
     * - Throws {@link BridgeDeliveryTimeoutError} - with `funding: "auto"`, a bridge leg was not delivered within the timeout or before `close()`. The leg is the one this call sent, or a pending leg from an earlier call on the same account, chain and token, in which case nothing was sent. No order was placed. See {@link SomniaMarkets.ensureFunds}.
     * - Throws {@link RpcError} - with `funding: "auto"`, a balance read or the bridge failed. See {@link SomniaMarkets.ensureFunds}.
     * **Generation check**
     *
     * Before funding or signing, one uncached read verifies that the pool still
     * hosts this market's immutable contract address. A stale cached Trading row
     * throws `InvalidInputError`; refresh with `loadMarkets(true)` and select the
     * intended market again. A failed read throws `RpcError` or
     * `ContractRevertError` and sends nothing. This uses the owner connection and
     * needs no module address. Recycling after the read can still race execution.
     * @throws {InvalidInputError} The binary pool already hosts another market, the cached immutable address is missing or invalid, or a supplied owner RPC member raises this SDK error. Its identity is retained.
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
    createOrder(ref: MarketHandle, type: "limit" | "market", side: "buy" | "sell", amount: number, price?: number, params?: CreateOrderParams): Promise<UnifiedOrder>;
    private crossingPrice;
    /**
     * Cancel a resting order by id (from createOrder / watchOrders).
     *
     * **Gotchas**
     *
     * - Throws {@link SignerRequiredError} - no signer on this exchange.
     * - Throws {@link InvalidInputError} - unknown symbol.
     * - Throws {@link ContractRevertError} - the cancel did not land; `errorName` says why (an already-filled or already-canceled order reverts).
     * - Throws {@link RpcError} - a request did not complete, or the node refused the transaction.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     *
     * **Example** (Cancelling an open order)
     *
     * ```ts
     * const placed = await exchange.createOrder("SOMI/USDC", "limit", "buy", 10, 0.55);
     * if (placed.status === "open") await exchange.cancelOrder(placed.id, "SOMI/USDC");
     * ```
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
    cancelOrder(id: string | ChainOrderRef, ref?: MarketHandle): Promise<{
        /** The canceled order's id, echoed back. */
        id: string;
        /** The tradable symbol the order lived on. */
        symbol: string;
        /** Numeric chain id the cancel was sent on. */
        chainId: number;
        /** Always "canceled" — the call throws if the cancel didn't land. */
        status: "canceled";
        /** The native {@link TxResult}. */
        info: unknown;
    }>;
    /** The spot tradable + its stop registry, or a loud error naming the gap. */
    private requireStopVenue;
    /**
     * Place a stop / take-profit order: rests OFF the book on the market's
     * stop registry and fires as a market or limit order when the pool's mark
     * price crosses `triggerPrice`. The trigger direction is inferred from
     * which side of the current mark the trigger sits on; pass
     * `params.triggerDirection` to pin it explicitly.
     *
     * **Gotchas**
     *
     * The trigger, limit price and quantity are aligned to the market's grids, and
     * the trigger aligns AWAY from the mark so it cannot land on it (a trigger equal
     * to the mark fires the instant it is armed). The limit price aligns like any
     * order price — a buy down, a sell up — so it never becomes worse than stated.
     *
     * Those two rules are independent, so a limit set exactly EQUAL to the trigger
     * can end up one tick inside it: a buy stop at trigger `0.5004`, limit `0.5004`
     * on a `0.001` grid arms at `0.501` and rests a `0.500` bid, which may not fill.
     * That is deliberate — pulling the limit up to meet the trigger would make you
     * pay more than you asked. Set the limit a tick or two past the trigger when you
     * want the triggered order to cross.
     *
     * - Throws {@link SignerRequiredError} - the exchange was built without a `privateKey` / `account` / `walletClient`.
     * - Throws {@link InvalidInputError} - unknown symbol, a non-spot market, a market with no stop registry, a `"limit"` stop with no price, a sub-lot quantity, or no mark yet to infer the trigger direction from (pass `params.triggerDirection`).
     * - Throws {@link IndexerError} - the pool's mark was needed (to infer the trigger direction, or to price a market stop's protective limit) and the indexer read did not complete. A limit stop with `params.triggerDirection` set needs no mark.
     * - Throws {@link ContractRevertError} - the registry or the pool rejected the placement (or the operator grant / escrow approval that precedes it). Branch on `errorName`.
     * - Throws {@link RpcError} - a pre-placement chain read did not complete, or the node refused a transaction.
     * - Throws {@link TransactionOutcomeUnknownError} - a transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     *
     * **Example** (Placing a stop order)
     *
     * A stop-loss: sell 5 if the mark drops to 1.10.
     *
     * ```ts
     * const stop = await exchange.createStopOrder("SOMI/USDC", "market", "sell", 5, 1.10);
     * // …later: await exchange.cancelStopOrder(stop.id, "SOMI/USDC");
     * ```
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
    createStopOrder(ref: MarketHandle, type: "limit" | "market", side: "buy" | "sell", amount: number, triggerPrice: number, price?: number, params?: {
        triggerDirection?: "above" | "below";
    }): Promise<UnifiedStopOrder>;
    /**
     * The wallet's pending (armed, untriggered) stop orders, newest first.
     * Scope to one tradable with `ref`, or to one chain with `filter.chainId`.
     *
     * With no `ref` and no `filter.chainId` this reads every chain and throws
     * when any chain fails. On an exchange with more than one chain, the thrown
     * `IndexerError` then has `chainId` set to the chain that failed (see
     * {@link SomniaMarketsChainFilter}). A read over more than one chain skips a
     * chain bound with no `indexerUrl` (see {@link chainIdsWithoutIndexer}).
     *
     * @throws {@link InvalidInputError} If `ref` is unknown, or `ref` is not on `filter.chainId`.
     * @throws {@link NotConfiguredError} If `filter.chainId` names a chain this exchange does not span, or the one chain the read touches has no indexer.
     */
    fetchOpenStopOrders(ref?: MarketHandle, filter?: SomniaMarketsChainFilter): Promise<UnifiedStopOrder[]>;
    /**
     * Cancel a pending stop order on its registry (refunds the keeper
     * payment). `id` comes from {@link fetchOpenStopOrders}.
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
    cancelStopOrder(id: string, ref: MarketHandle): Promise<{
        /** The canceled stop order's id, echoed back. */
        id: string;
        /** The tradable symbol the stop targeted. */
        symbol: string;
        /** Numeric chain id the cancel was sent on. */
        chainId: number;
        /** Always "canceled" — the call throws if the cancel didn't land. */
        status: "canceled";
        /** The native {@link TxResult}. */
        info: unknown;
    }>;
    /** Live funding-rate + mark/index snapshot for a perp market (chain read).
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
    fetchFundingRate(ref: MarketHandle): Promise<UnifiedFundingRate>;
    /**
     *  Historical funding rates for a perp market, oldest first (ccxt-standard shape).
     *
     *  Reads the INDEXED series rather than the chain: only one funding value is readable
     *  on chain at a time. Positional `(symbol, since, limit)` follows the ccxt convention
     *  set by `fetchOHLCV`, unlike the object-options readers on the client.
     *
     *  `fundingRate` is normalized to a per-8h fraction using each row's own
     *  `fundingWindowSec`, so the series stays consistent across a parameter change. The
     *  raw indexed row is on `info` for anything more specific — including `spanStart` /
     *  `spanEnd`, which matter because a row's accrual reaches BACKWARDS from its timestamp
     *  and a lazily-settled one can cover hours.
     *
     *  `since` is a CURSOR, not just a window bound: passing it walks FORWARD from that
     *  point, so the ccxt pagination idiom terminates.
     *
     * **Details**
     *
     * - `ref`: market symbol or pool address
     * - `since`: unix MILLISECONDS (ccxt convention), inclusive; acts as a forward cursor
     * - `limit`: max rows (default 100)
     *
     * **Example** (Paging through funding history)
     *
     *  ```ts
     *  let since = startOfHistory;
     *  for (;;) {
     *    const page = await exchange.fetchFundingRateHistory("BTC/USDSO:USDSO", since, 100);
     *    if (page.length === 0) break;
     *    consume(page);
     *    since = page[page.length - 1].timestamp + 1;   // advances
     *  }
     *  ```
     *
     *  Without the forward ordering this loop spins: the underlying read pages newest-first,
     *  so narrowing the window from below still returns the newest N and `since` never gets
     *  past the tail. Omitting `since` keeps the newest-first behaviour, which is what a
     *  "latest funding" read wants — `fetchOHLCV` has the same split.
     */
    fetchFundingRateHistory(ref: MarketHandle, since?: number, limit?: number): Promise<UnifiedFundingRate[]>;
    /**
     *  Open perp positions (authenticated; on-chain MarginBank reads). Pass
     *  symbols to scope; defaults to every loaded perp market.
     *
     *  **Gotchas**
     *
     *  Called with NO refs, this reads only the perps the registry loaded, so a
     *  short perp set gives a short result rather than an error. Check
     *  {@link perpDiscoverySkipped} and {@link perpDiscoveryError} before you read
     *  an empty result as "this account holds no perp positions". Passing explicit
     *  refs turns an unloaded symbol into an `InvalidInputError` instead.
     *
     *  `filter.chainId` reads only that chain; every ref must then be on it.
     *  Otherwise the read spans the chains of its markets and throws when any
     *  chain fails. On a read over more than one chain, and on a read with no refs
     *  and no `filter.chainId` on an exchange with more than one chain, the thrown
     *  `IndexerError` or `RpcError` has `chainId` set to the chain that failed (see
     *  {@link SomniaMarketsChainFilter}).
     *
     *  The pool state (mark, index, funding) is read only for a pool where the
     *  account holds a position. When that read fails for one pool, for example
     *  because its oracle reverts, the position still lists with
     *  `perpState: "degraded"`, and `markPrice` and `unrealizedPnl` are absent.
     *  The other positions are not affected. Branch on `perpState`, not on the
     *  absence of `markPrice`.
     *
     * @throws {@link InvalidInputError} If a ref is unknown or not a perp, or a ref is not on `filter.chainId`.
     * @throws {@link NotConfiguredError} If `filter.chainId` names a chain this exchange does not span.
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
    fetchPositions(refs?: MarketHandle[], filter?: SomniaMarketsChainFilter): Promise<UnifiedPosition[]>;
    /**
     *  Deposit collateral into the perp MarginBank (human quote units, e.g.
     *  USDso). One cross-margin balance covers every perp market.
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
    depositMargin(ref: MarketHandle, amount: number): Promise<{
        /** Hash of the mined deposit transaction. */
        hash: string;
        /** The native {@link TxResult}. */
        info: unknown;
    }>;
    /** Withdraw free collateral from the perp MarginBank (human quote units).
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
    withdrawMargin(ref: MarketHandle, amount: number): Promise<{
        /** Hash of the mined withdrawal transaction. */
        hash: string;
        /** The native {@link TxResult}. */
        info: unknown;
    }>;
    private requirePerpMarket;
    /**
     * Mint complete sets: `amount` collateral → `amount` of EVERY outcome.
     *
     * **Example** (Minting complete sets)
     *
     * Mint 100 sets (100 USDC → 100 YES + 100 NO), then sell the side you don't want.
     *
     * ```ts
     * await exchange.mintSet("BTC-95000-31DEC26/USDC", 100);
     * await exchange.createOrder("BTC-95000-31DEC26/USDC#NO", "limit", "sell", 100, 0.38);
     * ```
     *
     * - Throws {@link InvalidInputError} - the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     * **Generation check**
     *
     * Before funding or signing, one uncached read verifies that the pool still
     * hosts this market's immutable contract address. A stale cached Trading row
     * throws `InvalidInputError`; refresh with `loadMarkets(true)` and select the
     * intended market again. A failed read throws `RpcError` or
     * `ContractRevertError` and sends nothing. This uses the owner connection and
     * needs no module address. Recycling after the read can still race execution.
     * @throws {InvalidInputError} The binary pool already hosts another market, the cached immutable address is missing or invalid, or a supplied owner RPC member raises this SDK error. Its identity is retained.
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
    mintSet(ref: MarketHandle, amount: number): Promise<{
        /** Hash of the mined mint transaction. */
        hash: string;
        /** The native {@link TxResult}. */
        info: unknown;
    }>;
    /**
     * Burn complete sets back to collateral.
     *
     * - Throws {@link InvalidInputError} - the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     * **Generation check**
     *
     * Before funding or signing, one uncached read verifies that the pool still
     * hosts this market's immutable contract address. A stale cached Trading row
     * throws `InvalidInputError`; refresh with `loadMarkets(true)` and select the
     * intended market again. A failed read throws `RpcError` or
     * `ContractRevertError` and sends nothing. This uses the owner connection and
     * needs no module address. Recycling after the read can still race execution.
     * @throws {InvalidInputError} The binary pool already hosts another market, the cached immutable address is missing or invalid, or a supplied owner RPC member raises this SDK error. Its identity is retained.
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
    burnSet(ref: MarketHandle, amount: number): Promise<{
        /** Hash of the mined burn transaction. */
        hash: string;
        /** The native {@link TxResult}. */
        info: unknown;
    }>;
    /**
     * Redeem outcome tokens for collateral after settlement. Settlement-
     * extraction v2 routes by `marketId`. When the caller omits the leg, the SDK
     * verifies the BinaryMarket state and reads its winner on-chain.
     *
     * **Example** (Redeeming a winning position)
     *
     * After resolution, redeem the winning side found in the balance map. The
     * market has left `fetchMarkets()` by then (a settled series market is not
     * tradable), but `fetchBalance()` still reports the holding under the
     * market's symbol and that symbol still resolves here.
     *
     * ```ts
     * const bal = await exchange.fetchBalance();
     * const winning = bal["BTC-95000-31DEC26/USDC#YES"]?.total ?? 0;
     * if (winning > 0) await exchange.redeem("BTC-95000-31DEC26/USDC", winning);
     * ```
     *
     * **Gotchas**
     *
     * A VOIDED market has no winning outcome — both legs pay — so the auto-lookup
     * cannot pick one and `redeem` throws. Pass `{ outcomeIdx }` for the leg you
     * hold, and call once per leg to claim both. An unresolved market also throws
     * instead of guessing from an unfinalized payout vector.
     *
     * **Errors**
     *
     * - Throws {@link InvalidInputError} for an unknown or non-binary market, an
     *   invalid amount, or an omitted leg when the on-chain market is unresolved,
     *   voided, or does not store an exact one-hot resolved payout vector.
     * - Throws {@link NotConfiguredError} when the binary module address is not
     *   configured.
     * - Throws {@link SignerRequiredError} when the exchange has no usable signer.
     * - Throws {@link RpcError} when a market or approval read does not complete,
     *   or the node refuses a transaction.
     * - Throws {@link TransactionOutcomeUnknownError} when an approval or
     *   redemption transaction may have reached the node and its receipt was not
     *   observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} when a market read, operator approval,
     *   or redemption transaction is rejected by a contract.
     *
     * @param ref - Market symbol or id.
     * @param amount - Outcome-token amount to burn, in display units.
     * @param options - Optional leg selection. Omit it on a resolved market to
     * verify the terminal state and read the winner on-chain. A voided market
     * requires `options.outcomeIdx` because both legs are redeemable and only the
     * caller knows which one they hold.
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
    redeem(ref: MarketHandle, amount: number, options?: RedeemOptions): Promise<{
        /** Hash of the mined redeem transaction. */
        hash: string;
        /** The native {@link TxResult}. */
        info: unknown;
    }>;
    /**
     *  Refuse a SETTLED binary market on every verb that routes to the pool. A
     *  settled market resolves (so a position on it can be reported and redeemed),
     *  but its pool has been recycled onto the successor market: an order, a quote
     *  or a watch sent to `t.pool` would act on that successor under this symbol.
     */
    private requireLive;
    /** Financial writes verify the cached immutable identity before funding or signing. */
    private requireCurrentBinaryGeneration;
    private requireOutcomeMarket;
    /**
     *  Release every watch, channel, socket, and timer this exchange holds and
     *  stop the client's live machinery.
     *
     *  **Details**
     *
     *  This includes the chain WebSocket, so a Node process that has touched the
     *  chain exits on its own once this resolves. The instance stays usable for
     *  one-shot fetch calls: a later read reopens a connection, and a later
     *  `close()` releases that one too.
     *
     *  A pending `watch*` wait, and a `watch*` call whose market hydration
     *  succeeds after this call starts, rejects with a `DOMException` named
     *  `AbortError`. A hydration that fails rejects with its own error. To release one market
     *  and keep the rest, use {@link SomniaMarkets.unwatchMarket}.
     *
     *  It also ends the bridge delivery waits of every `bridge.transfer`,
     *  `ensureFunds` and auto-funded `createOrder` that started before it,
     *  including calls still queued for funding. Such a call opens no new wait.
     *  `bridge.transfer` resolves with `delivered: false`, and `ensureFunds`
     *  throws `BridgeDeliveryTimeoutError`. The leg stays pending, and the next
     *  `ensureFunds` for its key waits for it on a shortfall.
     *
     *  **Gotchas**
     *
     *  Each exchange owns its own chain socket, even when several use the same
     *  `wsRpcUrl`, so closing one never affects another. A viem client taken from
     *  `getViemClient()` before this call belongs to the closed connection: its
     *  requests reject with viem's `SocketClosedError`.
     * @throws {InvalidInputError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {NotConfiguredError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {NotSupportedError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {SignerRequiredError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {IndexerError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {IndexerUnavailableError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {IndexerWaitTimeoutError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {RpcError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {ContractRevertError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {TransactionOutcomeUnknownError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {FillHistoryRestartRequiredError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {FillHistoryUnavailableError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {IncompleteHistoryError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {CollateralOnWrongChainError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {BridgeLiquidityError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {BridgeDeliveryTimeoutError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     * @throws {InvariantError} A supplied RPC socket throws this SDK error during retirement. Remaining owner resources are released before rejection.
     */
    close(): Promise<void>;
}
/**
 * Failures from the owner-bound `SomniaMarkets.fetchBalance` operation, including
 * `close()` cancellation of unpublished balances or their market load. @category errors
 */
export type SomniaMarketsFetchBalanceError = SomniaMarketsSocketFailure | DOMException;
/** Failures from the owner-bound `SomniaMarkets.fetchOpenOrders` operation. @category errors */
export type SomniaMarketsFetchOpenOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.watchOrders` operation. @category errors */
export type SomniaMarketsWatchOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.ensureFunds` operation. @category errors */
export type SomniaMarketsEnsureFundsError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.createOrder` operation. @category errors */
export type SomniaMarketsCreateOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.cancelOrder` operation. @category errors */
export type SomniaMarketsCancelOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.createStopOrder` operation. @category errors */
export type SomniaMarketsCreateStopOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.cancelStopOrder` operation. @category errors */
export type SomniaMarketsCancelStopOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.fetchFundingRate` operation. @category errors */
export type SomniaMarketsFetchFundingRateError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.fetchPositions` operation. @category errors */
export type SomniaMarketsFetchPositionsError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.depositMargin` operation. @category errors */
export type SomniaMarketsDepositMarginError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.withdrawMargin` operation. @category errors */
export type SomniaMarketsWithdrawMarginError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.mintSet` operation. @category errors */
export type SomniaMarketsMintSetError = SomniaMarketsSocketFailure;
/** Failures from the owner-bound `SomniaMarkets.burnSet` operation. @category errors */
export type SomniaMarketsBurnSetError = SomniaMarketsSocketFailure;
