import * as Client from "../client.js";
// SomniaMarkets — the exchange class, the SDK's ONLY entry point. The full
// didactic story lives in the class doc below (it's what TypeDoc publishes).
import { zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BridgeDeliveryTimeoutError, CollateralOnWrongChainError, ContractRevertError, IncompleteHistoryError, IndexerError, InvalidInputError, NotConfiguredError, RpcError, SignerRequiredError, SomniaMarketsError, } from "../errors.js";
import * as Errors from "../errors.js";
import * as ExchangeBridge from "./bridge.js";
import * as ExchangeAccounts from "./smartAccounts.js";
import * as BridgeRegistry from "../chains/bridge/registry.js";
import * as ChainRef from "../chainRef.js";
import * as AccountMod from "../account.js";
import { unreachable } from "../raise.js";
import { InvariantError } from "../raise.js";
import * as CreateClient from "../createClient.js";
import * as OwnedWebSocket from "../webSocket.js";
import * as Markets from "../markets.js";
import * as PerpRegistry from "../perp/registry.js";
import * as ReadsAbi from "../readsAbi.js";
import { fundingRate8h } from "../funding.js";
import { perpMarkForPnl } from "../perp/state.js";
import * as Orders from "../orders.js";
import * as Trade from "../trade.js";
import * as Writer from "../writer.js";
import { AsyncCache } from "../asyncCache.js";
import * as Symbols from "./symbols.js";
import * as Structs from "./structs.js";
import * as DerivedReads from "../derivedReads.js";
import * as PortfolioAnalytics from "./portfolioAnalytics.js";
/** `${chainId}:${lowercased key}` — the facade's per-chain cache key. */
function chainKey(chainId, key) {
    return `${chainId}:${key.toLowerCase()}`;
}
/** One handle over several engines' watches: `stop()` releases every one (idempotent). */
function compositeHandle(handles) {
    let stopped = false;
    return {
        stop: () => {
            if (stopped)
                return;
            stopped = true;
            for (const h of handles)
                h.stop();
        },
    };
}
/** A row's chain, or an SDK bug: every row the facade holds was stamped by its engine. */
function chainOf(m) {
    return m.chainId ?? unreachable(`market ${m.id} reached the facade without a chainId`);
}
/**
 *  Names the failing chain on an `IndexerError` or `RpcError` from a
 *  multi-chain read. It sets `chainId` on the original error and never wraps
 *  it (SDK-ERR-004). An error that already names a chain keeps it; other
 *  errors pass through unchanged.
 */
function withChainId(e, chainId) {
    if ((e instanceof IndexerError || e instanceof RpcError) && e.chainId === undefined)
        Object.assign(e, { chainId });
    return e;
}
/**
 *  Whether a chain binding has an indexer. An empty `indexerUrl` counts as
 *  absent, as in `ClientConfig.indexerUrl`.
 */
function hasIndexer(engine) {
    return (engine.config.indexerUrl ?? "") !== "";
}
const UNSET = Symbol("unset");
/**
 *  The rejection a streaming wait gets when its watch is released by
 *  `unwatchMarket` or `close`. A release is caller cancellation, so it keeps
 *  the platform abort shape (`name === "AbortError"`), as SDK-IO-003 requires.
 */
function releasedError(what) {
    return new DOMException(`${what} watch was released`, "AbortError");
}
/** ccxt-style timeframe aliases → the price feed's candle resolutions. */
const PRICE_TIMEFRAMES = { "1m": "M1", "1h": "H1", "1d": "D1" };
const VALID_RESOLUTIONS = new Set(["M1", "H1", "D1"]);
const ORDER_STATUSES = ["Open", "Closed", "Filled", "Cancelled", "Expired"];
const BINARY_SIDES = ["BUY_YES", "SELL_YES", "BUY_NO", "SELL_NO"];
const isOrderStatus = (value) => ORDER_STATUSES.some((status) => status === value);
const isBinarySide = (value) => BINARY_SIDES.some((side) => side === value);
// fetchMyTrades pages the fill tape until it has enough RESOLVABLE rows. The
// page size is a floor, not the caller's limit: rows whose pool is not in the
// registry are dropped after the query returns, so asking for exactly `limit`
// would under-deliver. The budget bounds the pathological case — a wallet whose
// fills are all unresolvable — so the loop cannot spin on a registry gap.
const TRADE_PAGE = 200;
const MAX_TRADE_PAGES = 20;
// The shortest time between two IMPLICIT market loads of one chain whose last load
// recorded a failure. An implicit load is the one a verb such as `fetchBalance` makes
// first. Without this bound, a persistent failure re-runs the chain's full registry
// sweep and perp discovery on every such verb. A bare `loadMarkets()` and
// `loadMarkets(true)` ignore it: the caller asked for the load.
const MARKET_RETRY_INTERVAL_MS = 30_000;
/**
 * The exchange — the SDK's single entry point. One instance per ACCOUNT, over
 * every chain that account trades on; wraps one native engine per chain
 * (watches, local books, one-round-trip writes) behind symbols,
 * `fetch*`/`watch*` verbs, and human-unit structs — the idioms every exchange
 * bot already speaks (ccxt users will feel at home, down to the field names).
 *
 * A market is unique to one chain, so a symbol resolves to exactly one
 * `(chainId, market)`: reads merge across chains, writes route to the chain the
 * market lives on, and every returned struct names its `chainId`. A
 * single-chain config is the one-element case and behaves exactly as before.
 *
 * **When to use**
 *
 * Use as the entry point for strategy and display code — numbers are human
 * units, which is what that code wants. Reach past it to the native engine at
 * {@link SomniaMarkets.client} (bigint-exact reads) and
 * {@link SomniaMarkets.trader} (raw writes) for everything the unified surface
 * doesn't cover. On a multi-chain exchange those two throw; use
 * {@link SomniaMarkets.engineFor} and {@link SomniaMarkets.traderFor} with the
 * chain id.
 *
 * **Details**
 *
 * Verb conventions:
 * - `fetch*` — one-shot (a chain or indexer round-trip).
 * - `watch*` — streaming: each await resolves on the NEXT update of that
 *   channel, served from the zero-round-trip local store (the first call
 *   hydrates the ref-counted market watch).
 * - `create*` / `cancel*` — writes (fixed fees, one-round-trip confirm).
 *
 * Every struct carries the raw native payload under `info` for exact math.
 *
 * Each instance is fully isolated — its own config, live stores, and lazily
 * opened WebSockets (an indexer-only exchange never opens one) — so one
 * process can run several: per-request servers, parallel tests, one exchange
 * per account. Multi-chain is ONE exchange with several {@link ChainBinding}s,
 * not several exchanges.
 *
 * **Gotchas**
 *
 * Call {@link SomniaMarkets.close} to release the watches when done. The native
 * engine is not separately constructible — it is only reachable through an
 * exchange instance.
 *
 * **Example** (Trading a market)
 *
 * Load the market registry, stream a book, place a limit order.
 *
 * ```ts
 * import { SomniaMarkets } from "@somnia-chain/markets-sdk";
 *
 * const exchange = new SomniaMarkets({
 *   chain,        // a viem Chain
 *   wsRpcUrl,     // wss:// RPC of that chain
 *   indexerUrl,   // the Envio/Hasura GraphQL endpoint
 *   addresses,    // contract addresses (e.g. from @somnia-chain/deployments)
 *   privateKey,   // optional — only createOrder & friends need a signer
 * });
 * await exchange.loadMarkets();
 *
 * const book  = await exchange.watchOrderBook("BTC-95000-31DEC26/USDC#YES"); // live, zero RTT
 * const order = await exchange.createOrder("BTC-95000-31DEC26/USDC#YES", "limit", "buy", 10, 0.62);
 * await exchange.close();
 * ```
 *
 * @category clients
 */
/** The three states of {@link UnifiedTicker.perpState}, as explicit branches. */
function perpStateOf(isPerp, enriched) {
    if (!isPerp)
        return "not-applicable";
    if (enriched)
        return "ok";
    return "degraded";
}
/**
 *  The value a contained discovery failure is reported as.
 *
 *  An already-typed SDK error passes THROUGH untouched, because the client's read
 *  boundary has already classified it and that classification is the caller's decision:
 *  an `RpcError` is worth retrying, a `ContractRevertError` is not, and a
 *  `NotConfiguredError` needs a config change. Re-wrapping every one in a fresh
 *  `RpcError` erased that and moved the real transport error a level deeper than the
 *  documented `cause`. Only a non-SDK throwable is wrapped.
 */
function asDiscoveryFailure(err) {
    if (err instanceof SomniaMarketsError)
        return err;
    return new RpcError("perp market discovery", err instanceof Error ? err.message : String(err), { cause: err });
}
/**
 *  The same normalization for the registry read, but landing on {@link IndexerError}:
 *  that read is an INDEXER read, and the class is the caller's branch (serve stale or
 *  empty) rather than a description of the throw site. `sendGraphql` already normalizes,
 *  so only a non-normalized throwable ever reaches this.
 */
function asRegistryReadFailure(err) {
    if (err instanceof SomniaMarketsError)
        return err;
    return new IndexerError("listRegistryMarkets", err instanceof Error ? err.message : String(err), { cause: err });
}
/**
 *  The value one chain's failed `fetchDataStatus` measurement is reported as. The
 *  documented error classes pass through untouched (SDK-ERR-004). Any other throwable
 *  is outside the documented union, so it is rethrown rather than reported as health.
 */
function asDataStatusFailure(err) {
    const failure = Errors.sdkFailure(err, InvariantError);
    if (failure)
        return failure;
    throw err;
}
/** Join independent load work before propagating its first failure. */
async function settle(work) {
    const results = await Promise.allSettled(work);
    for (const result of results)
        if (result.status === "rejected")
            throw result.reason;
}
/** Eight items per enrichment pass; each token issues two metadata reads. */
async function loadItems(items, read) {
    let next = 0;
    await settle(Array.from({ length: Math.min(8, items.length) }, async () => {
        while (next < items.length) {
            const item = items[next++] ?? unreachable("load item index is in bounds");
            await read(item);
        }
    }));
}
/**
 *  The form two indexer URLs share when they name one endpoint: scheme and host
 *  lower-cased, default port dropped, trailing slashes dropped. A relative URL
 *  (a same-origin proxy path) does not parse, so it is compared as written,
 *  minus the slashes that end its path.
 */
function indexerKey(raw) {
    let url;
    try {
        url = new URL(raw);
    }
    catch {
        return raw.replace(/\/+(\?|$)/, "$1");
    }
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
}
export class SomniaMarkets {
    /** The first binding's engine. Internal reads that report the primary chain use it. */
    primary;
    /** One engine per configured chain, keyed by chain id, in binding order. */
    engines;
    freshnessReads = new Map();
    balanceReads = new Map();
    /** Unified markets keyed by MARKET symbol (populated by loadMarkets). */
    markets = {};
    /** All market symbols (populated by loadMarkets). */
    symbols = [];
    marketLoad;
    /** The close generation of the last queued load; sharing never crosses it. */
    marketLoadSignal;
    /** The chains `marketLoad` reads, so a concurrent read knows whether it can share it. */
    marketLoadChains = new Set();
    /**
     *  The chains that a running load reads again because their last load recorded a
     *  failure. A read that needs one of them waits for that retry. It does not take the
     *  cache, whose failure entries the retry has already cleared.
     */
    retryingChains = new Set();
    /** When each chain's last load settled, in `Date.now()` milliseconds. Bounds implicit retries. */
    marketLoadSettledAt = new Map();
    /**
     *  Capability map — which unified verbs this venue supports (the ccxt
     *  `exchange.has` convention, for capability-probing bot code). Every listed
     *  verb is implemented here, so every flag is `true`.
     */
    has = {
        /** {@link SomniaMarkets.fetchMarkets} */
        fetchMarkets: true,
        /** {@link SomniaMarkets.fetchOrderBook} */
        fetchOrderBook: true,
        /** {@link SomniaMarkets.fetchTrades} */
        fetchTrades: true,
        /** {@link SomniaMarkets.fetchOHLCV} */
        fetchOHLCV: true,
        /** {@link SomniaMarkets.fetchBalance} */
        fetchBalance: true,
        /** {@link SomniaMarkets.fetchOpenOrders} */
        fetchOpenOrders: true,
        /** {@link SomniaMarkets.getOrderHistoryPage} */
        getOrderHistoryPage: true,
        /** {@link SomniaMarkets.getOrdersPage} */
        getOrdersPage: true,
        /** {@link SomniaMarkets.fetchMyTrades} */
        fetchMyTrades: true,
        /** {@link SomniaMarkets.fetchStatus} */
        fetchStatus: true,
        /** {@link SomniaMarkets.createOrder} */
        createOrder: true,
        /** {@link SomniaMarkets.cancelOrder} */
        cancelOrder: true,
        /** {@link SomniaMarkets.watchOrderBook} */
        watchOrderBook: true,
        /** {@link SomniaMarkets.watchTrades} */
        watchTrades: true,
        /** {@link SomniaMarkets.watchOrders} */
        watchOrders: true,
        /** {@link SomniaMarkets.watchMyTrades} */
        watchMyTrades: true,
        /** {@link SomniaMarkets.fetchPositions} */
        fetchPositions: true,
        /** {@link SomniaMarkets.fetchFundingRate} */
        fetchFundingRate: true,
        /**
         *  {@link SomniaMarkets.fetchFundingRateHistory} — the key did not previously exist
         *  in this map, so it had to be ADDED rather than flipped.
         */
        fetchFundingRateHistory: true,
        /** {@link SomniaMarkets.watchPrice} */
        watchPrice: true,
        /** {@link SomniaMarkets.fetchPrice} */
        fetchPrice: true,
        /** {@link SomniaMarkets.fetchPriceOHLCV} */
        fetchPriceOHLCV: true,
    };
    registry = new Symbols.SymbolRegistry();
    // Not readonly: setSigner() rebinds this after construction (wallet connect /
    // disconnect), which also drops the memoized traders.
    signerConfig;
    /** One trader per chain, built lazily from the signer config. */
    traders = new Map();
    /**
     *  `${chainId}:${token}` -> the currency behind a token on that chain, for
     *  symbols + balances. Keyed per chain: the same address can be a different
     *  token on another chain.
     */
    currencies = new Map();
    /**
     *  binary pool (lowercased) -> the tick/lot/minQuantity grid the pool
     *  enforces. Binary rows come off the indexer with these fields undefined
     *  (the indexer never sees them), so loadMarkets() reads them from the pool;
     *  the precision helpers are synchronous and read only from here.
     */
    bookParams = new Map();
    /**
     *  perp pool (lowercased) -> its live chain-tier gates, refreshed by every
     *  loadMarkets(). Empty when no PerpPoolFactory could be reached, which is what
     *  leaves `perpStatus` absent rather than guessed.
     */
    perpStatuses = new Map();
    /**
     *  perp pools (lowercased) the FACTORY knows and the indexer does not — the
     *  rows loadMarkets() synthesized from the chain. Drives
     *  {@link UnifiedMarket.indexed}.
     */
    chainOnlyPerps = new Set();
    /**
     *  The last load's contained failures, keyed by chain id. A retry re-inserts a
     *  chain, so insertion order is NOT engine order: the scalar accessors
     *  (`perpDiscoveryError`, `registryReadError`) pick the first chain in engine
     *  order through {@link firstFailingChain}.
     */
    perpDiscoveryFailures = new Map();
    /** Set when discovery found no factory route at all; first engine wins. */
    perpDiscoverySkip = null;
    perpDiscoveryPartials = new Map();
    registryReadFailures = new Map();
    /** Each chain's rows from the load that read it last, in engine order. */
    engineRows = new Map();
    /** Each chain a load has read. Never cleared: a reload in progress still serves the cache. */
    loadedChains = new Set();
    /**
     *  Markets hydrated INTO RESOLUTION ONLY, keyed `${chainId}:${marketId}`: the
     *  settled binary markets a row (a position, a fill, an order) named that the
     *  tradable registry does not carry. `null` records a KNOWN MISS — an id the
     *  indexer has no row for — so it is not re-queried on every read. A found
     *  market lives in the symbol registry; this map only remembers what was asked.
     *  Cleared with the registry on every load.
     */
    settledMarkets = new Map();
    resolutionGeneration = 0;
    watches = new AsyncCache();
    priceWatches = new AsyncCache();
    channels = new Map();
    /** One live-store subscription per engine, plus the price feed's. */
    unsubscribes = null;
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
    constructor(config) {
        const engines = new Map();
        try {
            const { privateKey, account, walletClient, rpcWebSocketConstructor, ...rest } = config;
            if (rpcWebSocketConstructor !== undefined && typeof rpcWebSocketConstructor !== "function") {
                throw new InvalidInputError("rpcWebSocketConstructor must be a standard WebSocket constructor");
            }
            const infrastructure = { rpcWebSocketConstructor };
            const bindings = "chains" in rest ? rest.chains : [rest];
            if (bindings.length === 0) {
                throw new InvalidInputError("SomniaMarkets needs at least one chain binding");
            }
            // Distinct chains and distinct indexers, both checked up front. Two engines
            // on one chain would split the account's nonce lane. Two engines on one
            // indexer would attribute the same rows to two chains: rows carry no chain
            // id, so each engine stamps its own chain on every row its endpoint returns.
            // URLs are compared normalized, so a trailing slash or an upper-case host
            // does not make one endpoint look like two.
            const indexers = new Set();
            for (const binding of bindings) {
                const chainId = binding.chain.id;
                if (engines.has(chainId)) {
                    throw new InvalidInputError(`chain ${chainId} is bound twice — each chain takes one binding`);
                }
                if (binding.indexerUrl !== undefined && binding.indexerUrl !== "") {
                    const indexer = indexerKey(binding.indexerUrl);
                    if (indexers.has(indexer)) {
                        throw new InvalidInputError(`indexer ${binding.indexerUrl} is bound to two chains — each chain needs its own indexer`);
                    }
                    indexers.add(indexer);
                }
                engines.set(chainId, CreateClient.createClient(binding, {
                    ...infrastructure,
                    registerFreshness: (read, selected) => this.freshnessReads.set(chainId, { read, selected }),
                    registerBalances: (read, selected) => this.balanceReads.set(chainId, { read, selected }),
                }));
            }
            this.engines = engines;
            const [primary] = engines.values();
            this.primary = primary ?? unreachable("at least one engine was just built");
            this.signerConfig = { privateKey, account, walletClient };
            this.assertAccountExecutors(account);
        }
        catch (error) {
            for (const engine of engines.values()) {
                try {
                    engine.stopLive();
                }
                catch {
                    // Root creation has already failed. Finish every earlier engine's
                    // cleanup without replacing the first configuration failure.
                }
            }
            const failure = OwnedWebSocket.failure(error, "configure exchange");
            if (Object.is(failure, error))
                throw failure;
            throw Object.assign(new InvariantError("exchange configuration failed"), { cause: error });
        }
    }
    /**
     *  A {@link SomniaMarketsAccount}'s executors must act as its address on a
     *  chain this exchange spans — otherwise reads would use one account and
     *  writes another.
     */
    assertAccountExecutors(account) {
        if (!AccountMod.isSomniaMarketsAccount(account))
            return;
        for (const [key, executor] of Object.entries(account.executors)) {
            if (!executor)
                continue;
            const chainId = Number(key);
            if (!this.engines.has(chainId)) {
                throw new InvalidInputError(`account has an executor for chain ${chainId}, which this exchange does not span`);
            }
            if (executor.chainId !== chainId) {
                throw new InvalidInputError(`the executor under chain ${chainId} sends on chain ${executor.chainId}`);
            }
            if (executor.actor.toLowerCase() !== account.address.toLowerCase()) {
                throw new InvalidInputError(`the executor for chain ${chainId} acts as ${executor.actor}, not the account's ${account.address}`);
            }
        }
    }
    // ------------------------------------------------------------- chains
    /** Numeric chain ids this exchange spans, in binding order (the first is the primary). */
    get chainIds() {
        return [...this.engines.keys()];
    }
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
    get chainIdsWithoutIndexer() {
        return [...this.engines].filter(([, engine]) => !hasIndexer(engine)).map(([chainId]) => chainId);
    }
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
    get client() {
        this.assertSingleChain("client", "engineFor");
        return this.primary;
    }
    /**
     *  The tiers that name no chain act on the first chain. With two or more
     *  chains that choice is silent and often wrong, so the caller must name one.
     */
    assertSingleChain(accessor, perChain) {
        if (this.engines.size === 1)
            return;
        throw new InvalidInputError(`exchange.${accessor} names no chain, and this exchange spans chains ${this.chainIds.join(", ")} — use exchange.${perChain}(chainId)`, { chainIds: this.chainIds });
    }
    /**
     *  The native engine bound to one configured chain — bigint-exact,
     *  address-keyed. The escape hatch for that chain.
     *
     *  **Gotchas**
     *
     *  Throws {@link NotConfiguredError} for a chain this exchange has no binding for.
     */
    engineFor(chainId) {
        const engine = this.engines.get(chainId);
        if (!engine) {
            throw new NotConfiguredError(`a ChainBinding for chain ${chainId}`, `this exchange spans chains ${this.chainIds.join(", ")} only`);
        }
        return engine;
    }
    /** The engine a tradable's market lives on. */
    engineOf(t) {
        return this.engineFor(t.chainId);
    }
    /**
     *  The chains an account read touches, in binding order: the market's chain,
     *  else the {@link SomniaMarketsChainFilter} chain, else every chain.
     */
    readEngines(t, chainId) {
        if (t && chainId !== undefined && t.chainId !== chainId) {
            throw new InvalidInputError(`${t.symbol} is on chain ${t.chainId}, not on the filtered chain ${chainId}`, {
                chainIds: [t.chainId, chainId],
            });
        }
        if (t)
            return [[t.chainId, this.engineOf(t)]];
        if (chainId !== undefined)
            return [[chainId, this.engineFor(chainId)]];
        return [...this.engines.entries()];
    }
    /**
     *  The chains of a read that needs the indexer on every chain, less the
     *  chains in {@link chainIdsWithoutIndexer}. Those chains are skipped only
     *  when the read also spans a chain with an indexer. A read over one chain,
     *  or over chains that all lack an indexer, keeps them, so it throws
     *  `NotConfiguredError` instead of returning a result that looks empty.
     */
    indexedEngines(engines) {
        const indexed = engines.filter(([, engine]) => hasIndexer(engine));
        return engines.length > 1 && indexed.length > 0 ? indexed : engines;
    }
    /**
     *  Runs one read per chain, in parallel, and fails closed: one chain's failure
     *  rejects the whole read. The reads are grouped per chain, so the chain of a
     *  failure is known. On a read over more than one chain, the failure names it
     *  (see `withChainId`). So does an `unscoped` read (no market ref, no chain
     *  filter) on an exchange with more than one chain, even when it reads only one
     *  of them. A read scoped to one chain keeps its error unchanged.
     */
    perChain(engines, read, unscoped = false, annotateFailure = withChainId) {
        const many = engines.length > 1 || (unscoped && this.engines.size > 1);
        return Promise.all(engines.map(([chainId, engine]) => many
            ? read(chainId, engine).catch((e) => Promise.reject(annotateFailure(e, chainId)))
            : read(chainId, engine)));
    }
    /** The engine that serves the price feed: the first binding that configures one, else the primary. */
    priceEngine() {
        for (const engine of this.engines.values()) {
            if (engine.config.priceFeed)
                return engine;
        }
        return this.primary;
    }
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
    traderFor(chainId) {
        const hit = this.traders.get(chainId);
        if (hit)
            return hit;
        const trader = this.engineFor(chainId).createTrader(this.traderConfigFor(chainId));
        this.traders.set(chainId, trader);
        return trader;
    }
    /** The trader config for one chain: the account's executor there, or the plain signer sugar. */
    traderConfigFor(chainId) {
        const { privateKey, account, walletClient } = this.signerConfig;
        if (!AccountMod.isSomniaMarketsAccount(account))
            return { privateKey, account, walletClient };
        const executor = account.executors[chainId];
        if (!executor) {
            throw new NotConfiguredError(`account.executors[${chainId}]`, `writes on chain ${chainId} (the account has executors for chains ${Object.keys(account.executors).join(", ")})`);
        }
        return { executor };
    }
    /** The trader for a tradable's chain. */
    traderOf(t) {
        return this.traderFor(t.chainId);
    }
    // ------------------------------------------------------------- signer bits
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
    get trader() {
        this.assertSingleChain("trader", "traderFor");
        return this.traderFor(this.primary.config.chain.id);
    }
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
    setSigner(signer) {
        // Validate first: a refused account must not replace the bound signer.
        this.assertAccountExecutors(signer.account);
        this.signerConfig = {
            account: signer.account,
            privateKey: signer.privateKey,
            walletClient: signer.walletClient,
        };
        this.traders.clear();
    }
    /** The authenticated wallet address, if a signer was configured. */
    get walletAddress() {
        const { privateKey, account, walletClient } = this.signerConfig;
        if (AccountMod.isSomniaMarketsAccount(account))
            return account.address;
        if (walletClient?.account)
            return walletClient.account.address;
        if (typeof account === "object")
            return account.address;
        if (typeof account === "string")
            return account;
        if (privateKey)
            return privateKeyToAccount(privateKey).address;
        return undefined;
    }
    /**
     *  The wallet address, or {@link SignerRequiredError} naming the caller.
     *
     * **Details**
     *
     * - `operation`: The public method requiring the signer; it appears in the error so the caller sees which call needs a signer, not just "a method".
     */
    requireAddress(operation) {
        const a = this.walletAddress;
        if (!a)
            throw new SignerRequiredError(operation);
        return a;
    }
    // ------------------------------------------------------------- markets
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
    get perpDiscoveryError() {
        const first = this.firstFailingChain(this.perpDiscoveryFailures);
        return first === undefined ? null : (this.perpDiscoveryFailures.get(first) ?? null);
    }
    /** The first chain, in the order of the `chains` config, that has a key in `failures`. */
    firstFailingChain(failures) {
        for (const chainId of this.engines.keys())
            if (failures.has(chainId))
                return chainId;
        return undefined;
    }
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
    get perpDiscoveryErrorsByChain() {
        return Object.fromEntries(this.perpDiscoveryFailures);
    }
    /**
     *  How much of the chain-only perp set was lost when discovery PARTIALLY failed, or
     *  `null` when it did not.
     *
     *  Typed counts rather than prose in a message, so a consumer can decide on them —
     *  `{ failed: 1, total: 4 }` reads as "three of four chain-only markets are listed".
     *  Always `null` when {@link perpDiscoveryError} is null, and also null when discovery
     *  failed outright rather than partly (nothing was read, so there is no ratio).
     */
    get perpDiscoveryPartialFailure() {
        const first = this.firstFailingChain(this.perpDiscoveryFailures);
        return first === undefined ? null : (this.perpDiscoveryPartials.get(first) ?? null);
    }
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
    get perpDiscoveryPartialFailuresByChain() {
        return Object.fromEntries(this.perpDiscoveryPartials);
    }
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
    get perpDiscoverySkipped() {
        return this.perpDiscoverySkip;
    }
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
    get registryReadError() {
        const first = this.firstFailingChain(this.registryReadFailures);
        return first === undefined ? null : (this.registryReadFailures.get(first) ?? null);
    }
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
    get registryReadErrorsByChain() {
        return Object.fromEntries(this.registryReadFailures);
    }
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
    async loadMarkets(reload = false) {
        return this.loadMarketsOn(reload);
    }
    /**
     *  The IMPLICIT {@link loadMarkets} a read over one chain makes first. It loads only
     *  that chain, so a read filtered to chain A never reads chain B, also on a cold
     *  exchange. `undefined` means the read spans every chain. It loads a chain that was
     *  never loaded. It retries a chain whose last load failed only when that load settled
     *  at least `MARKET_RETRY_INTERVAL_MS` ago; before that it uses the cache, and the
     *  failure accessors keep the recorded failure.
     */
    loadMarketsFor(chainId) {
        return this.loadMarketsOn(false, chainId, true);
    }
    loadMarketsOn(reload, chainId, implicit = false) {
        const closed = this.closeController.signal;
        // A bare call reads only the chains never loaded, whose last load failed, or that a running retry reads.
        const failed = reload ? new Set(this.engines.keys()) : this.failedChains(chainId, implicit);
        if (failed.size === 0)
            return Promise.resolve(this.markets);
        const previous = this.marketLoad;
        const sameGeneration = this.marketLoadSignal === closed;
        // A concurrent read shares the running load when that load reads every chain it needs.
        if (!reload && previous && sameGeneration && [...failed].every((id) => this.marketLoadChains.has(id)))
            return previous;
        // A chain whose retry is running is not read again: this load queues behind that retry.
        const read = reload
            ? undefined
            : new Set([...failed].filter((id) => !sameGeneration || !this.retryingChains.has(id)));
        // A loaded chain in `read` is a retry. A reload is not: a reload in progress still serves the cache.
        const retries = read ? [...read].filter((id) => this.loadedChains.has(id)) : [];
        const run = () => this.readMarkets(reload, read, closed);
        // A failed discovery still rejects its caller; it must not cancel a queued reload.
        const pending = previous ? previous.then(run, run) : run();
        const current = pending.finally(() => {
            for (const id of retries)
                this.retryingChains.delete(id);
            if (this.marketLoad === current) {
                this.marketLoad = undefined;
                this.marketLoadSignal = undefined;
            }
        });
        for (const id of retries)
            this.retryingChains.add(id);
        this.marketLoadChains = previous && sameGeneration ? new Set([...this.marketLoadChains, ...failed]) : failed;
        this.marketLoad = current;
        this.marketLoadSignal = closed;
        return current;
    }
    /**
     *  The chains a load must read: each chain never loaded, each chain a running retry
     *  reads (so the caller waits for it), and each chain whose last load recorded a
     *  failure that a retry could fix. With `only`, just that chain. A `NotConfiguredError`
     *  is left out: config does not change on a live exchange, so a chain-only binding
     *  would otherwise re-read its chain on every verb. With `implicit`, a failed chain
     *  whose last load settled less than `MARKET_RETRY_INTERVAL_MS` ago is left out too.
     */
    failedChains(only, implicit = false) {
        const failed = new Set();
        const now = Date.now();
        for (const chainId of this.engines.keys()) {
            if (only !== undefined && chainId !== only)
                continue;
            if (!this.loadedChains.has(chainId) || this.retryingChains.has(chainId))
                failed.add(chainId);
        }
        for (const failures of [this.registryReadFailures, this.perpDiscoveryFailures]) {
            for (const [chainId, err] of failures) {
                if (only !== undefined && chainId !== only)
                    continue;
                if (err instanceof NotConfiguredError)
                    continue;
                // A clock that moved back does not hold the retry off.
                const settledAt = this.marketLoadSettledAt.get(chainId);
                const recent = settledAt !== undefined && now >= settledAt && now - settledAt < MARKET_RETRY_INTERVAL_MS;
                if (implicit && recent)
                    continue;
                failed.add(chainId);
            }
        }
        return failed;
    }
    /**
     *  Read every chain, or only the `retry` chains (from {@link failedChains}). A chain that is not read keeps its rows, gates and
     *  failure entries from the load that read it last.
     */
    async readMarkets(reload, retry, closed) {
        closed.throwIfAborted();
        this.resolutionGeneration++;
        const chains = retry ?? new Set(this.engines.keys());
        const reread = (key) => chains.has(Number(key.slice(0, key.indexOf(":"))));
        // The registry read is CONTAINED per engine, the same way perp discovery is
        // below. An indexer outage used to throw out of here and take the whole
        // load with it — including PERP discovery, which reads the chain and needs
        // no indexer at all once a factory is configured. Containment is what makes
        // an empty list answerable: `registryReadError` null with no symbols is
        // "this venue has no markets", non-null is "a registry could not be read".
        for (const chainId of chains)
            this.registryReadFailures.delete(chainId);
        // Perp discovery is a UNION with the chain, because the indexer's perp set is
        // built dynamically from `PerpPoolDeployed` and therefore lags: a pool
        // deployed after the indexer's current head is live on chain and absent
        // here. The factory is the authority on which pools exist, and the two gates
        // it feeds are the authority on which are tradeable.
        // All of these are rebuilt from scratch for each chain that is read: a pool
        // that becomes indexed, or a market the factory stops reporting, must not
        // survive as a stale entry, and a skip recorded on a previous load must not
        // outlive it. A retried chain never owns the skip: a chain that set it read its
        // registry and found no factory route, so nothing on it failed. A chain read
        // for the first time can set it.
        for (const key of this.chainOnlyPerps)
            if (reread(key))
                this.chainOnlyPerps.delete(key);
        for (const chainId of chains) {
            this.perpDiscoveryFailures.delete(chainId);
            this.perpDiscoveryPartials.delete(chainId);
        }
        if (!retry) {
            this.perpDiscoverySkip = null;
            this.engineRows.clear();
        }
        this.perpStatuses = new Map([...this.perpStatuses].filter(([key]) => !reread(key)));
        if (reload)
            this.bookParams.clear();
        // Every engine loads independently and the rows meet in ONE registry, so
        // symbols are unique across the union and a write routes by the row's chain.
        // The engines load concurrently: a first load costs the slowest chain, not the
        // sum. Rows are stored after the join, in engine order, because a cleared
        // `engineRows` would otherwise take completion order, and a retry replaces a
        // chain's entry in place. `allSettled`, not `all`: a rejected engine must not
        // leave a sibling running past this load, where it would write into the next
        // load's maps. The first rejection in engine order is rethrown, as before.
        const selected = [...this.engines].filter(([chainId]) => chains.has(chainId));
        const settled = await Promise.allSettled(selected.map(([, engine]) => this.loadEngineMarkets(engine, closed)));
        closed.throwIfAborted();
        const settledAt = Date.now();
        for (const [chainId] of selected)
            this.marketLoadSettledAt.set(chainId, settledAt);
        let failure;
        for (const [i, [chainId]] of selected.entries()) {
            const result = settled[i] ?? unreachable("allSettled keeps one result per engine");
            if (result.status === "fulfilled")
                this.engineRows.set(chainId, result.value);
            else
                failure ??= { reason: result.reason };
        }
        if (failure) {
            // None of this batch's rows reached the public registry. Even a fulfilled
            // sibling may have replaced grids behind old markets, so every affected
            // chain must repair before its cache can be treated as complete.
            for (const [chainId] of selected)
                this.loadedChains.delete(chainId);
            throw failure.reason;
        }
        const rows = [...this.engineRows.values()].flat();
        // Rebuilt with the registry: `build` clears every reverse lookup, so a settled
        // market hydrated before this load is no longer resolvable and must be asked
        // for again, and a known miss may have been indexed since.
        this.resolutionGeneration++;
        this.settledMarkets.clear();
        const codeOf = (m) => (token) => this.codeOf(chainOf(m), token);
        const canonical = this.registry.build(rows, (token) => this.codeOfAny(rows, token));
        this.markets = {};
        for (const m of rows) {
            const symbol = canonical.get(Symbols.registryKey(chainOf(m), m.id)) ?? unreachable(`registry.build omitted market ${m.id}`);
            this.markets[symbol] = this.toUnifiedMarket(m, symbol, codeOf(m));
            // Register currency decimals per market for balances.
            const chainId = chainOf(m);
            if (m.marketType === "BINARY") {
                this.setCurrency(chainId, m.collateral, { code: codeOf(m)(m.collateral), decimals: m.quoteDecimals });
            }
            else {
                if (!m.baseIsNative)
                    this.setCurrency(chainId, m.baseToken, {
                        code: m.baseSymbol ?? codeOf(m)(m.baseToken),
                        decimals: m.baseDecimals,
                    });
                this.setCurrency(chainId, m.quoteToken, {
                    code: m.quoteSymbol ?? codeOf(m)(m.quoteToken),
                    decimals: m.quoteDecimals,
                });
            }
        }
        this.symbols = Object.keys(this.markets).sort();
        for (const chainId of chains)
            this.loadedChains.add(chainId);
        return this.markets;
    }
    /**
     *  One engine's contribution to {@link loadMarkets}: its indexed registry rows,
     *  its chain-discovered perps, its currency metadata and its binary book grids.
     *  Every row comes back stamped with the engine's chain.
     */
    async loadEngineMarkets(engine, closed) {
        closed.throwIfAborted();
        const chainId = engine.config.chain.id;
        // Observe every started stage immediately, and join all of them even on failure.
        // A queued reload must never receive cache writes from the preceding load.
        const started = [];
        const track = (work) => {
            started.push(work);
            work.catch(() => { });
            return work;
        };
        const preparation = new AbortController();
        const prepared = track(CreateClient.prepareChain(engine, AbortSignal.any([closed, preparation.signal])));
        const factory = engine.config.addresses?.perpPoolFactory;
        const early = factory ? track((async () => engine.listPerpPoolStatuses({ factory }))()) : undefined;
        try {
            const indexerRows = await engine.listRegistryMarkets().catch((err) => {
                if (!closed.aborted)
                    this.registryReadFailures.set(chainId, asRegistryReadFailure(err));
                return [];
            });
            closed.throwIfAborted();
            // Discovery retains its documented containment and error accessors. Indexed
            // metadata and grids already have their inputs, so they need no discovery wait.
            const discovery = track(this.discoverPerpPools(engine, indexerRows, early, closed).catch((err) => {
                if (!closed.aborted)
                    this.perpDiscoveryFailures.set(chainId, asDiscoveryFailure(err));
                return { statuses: new Map(), chainOnly: [], failed: [] };
            }));
            const metadata = track(this.loadCurrencyMetadata(engine, indexerRows, closed));
            const grids = track(this.loadBinaryGrids(engine, indexerRows, closed));
            await settle([metadata, grids]);
            const { statuses, chainOnly, failed } = await discovery;
            closed.throwIfAborted();
            if (failed.length > 0) {
                this.perpDiscoveryFailures.set(chainId, asDiscoveryFailure(failed[0]));
                this.perpDiscoveryPartials.set(chainId, { failed: failed.length, total: failed.length + chainOnly.length });
            }
            for (const [pool, status] of statuses)
                this.perpStatuses.set(chainKey(chainId, pool), status);
            // Only synthesized rows need a second pass; the caches remove overlapping
            // tokens/pools. Currency and grid passes remain independent in that pass too.
            await settle([
                track(this.loadCurrencyMetadata(engine, chainOnly, closed)),
                track(this.loadBinaryGrids(engine, chainOnly, closed)),
            ]);
            closed.throwIfAborted();
            return Markets.withChainRows(chainId, [...indexerRows, ...chainOnly]);
        }
        finally {
            await Promise.allSettled(started.filter((work) => work !== prepared));
            // End only this load's wait for the dial. The dial stays owned and observed
            // under the connection's connect deadline, so the next chain read joins it.
            preparation.abort();
            await Promise.allSettled(started);
        }
    }
    async loadCurrencyMetadata(engine, rows, closed) {
        const chainId = engine.config.chain.id;
        // Currency codes: prefer indexed symbols; read ERC-20 symbol() for the
        // rest (binary collateral, unlabeled spot tokens) — pipelined, cached.
        const need = new Set();
        for (const m of rows) {
            if (m.marketType === "BINARY")
                need.add(Markets.lower0x(m.collateral));
            else {
                if (!m.baseSymbol && !m.baseIsNative)
                    need.add(Markets.lower0x(m.baseToken));
                if (!m.quoteSymbol)
                    need.add(Markets.lower0x(m.quoteToken));
            }
        }
        for (const t of need)
            if (this.currencies.has(chainKey(chainId, t)))
                need.delete(t);
        if (need.size === 0)
            return;
        closed.throwIfAborted();
        const validation = CreateClient.validateChain(engine);
        validation.catch(() => { });
        try {
            await loadItems([...need], async (token) => {
                // Read BOTH symbol and decimals on-chain. A currency seen only via this
                // path (never as a market's base/quote row) keeps whatever we set here,
                // so hardcoding 6 gave wrong human balances for any non-6dp token. Fall
                // back to the ERC-20 spec default (18) when metadata is unavailable.
                // Token metadata keeps its documented fallback, but shares the owner's
                // validation prerequisite with grids/discovery. It cannot read a retired
                // or unvalidated endpoint just because those independent stages are held.
                closed.throwIfAborted();
                const viem = Client.withTypedReadErrors(engine.getViemClient());
                const read = async (functionName) => {
                    await validation;
                    closed.throwIfAborted();
                    return viem.readContract({ address: token, abi: ReadsAbi.erc20ReadAbi, functionName });
                };
                const [code, decimals] = await Promise.all([
                    read("symbol")
                        .then((s) => String(s))
                        .catch(() => token.slice(2, 8).toUpperCase()),
                    read("decimals")
                        .then((d) => Number(d))
                        .catch(() => 18),
                ]);
                if (!closed.aborted)
                    this.setCurrency(chainId, token, { code, decimals });
            });
        }
        finally {
            // Even a synchronous metadata-client failure or close must join validation.
            await Promise.allSettled([validation]);
        }
    }
    async loadBinaryGrids(engine, rows, closed) {
        const chainId = engine.config.chain.id;
        // Binary book grids: the indexer stores tick/lot/minQuantity as undefined
        // for binary rows, so read each distinct pool's real parameters here —
        // pipelined, and cached again in the client for its own quote path. A pool
        // that fails to answer is simply absent from the map; the precision helpers
        // throw on it rather than quantize against a guess.
        const pools = new Set();
        for (const m of rows)
            if (m.marketType === "BINARY")
                pools.add(Markets.lower0x(m.poolAddress));
        for (const p of pools)
            if (this.bookParams.has(chainKey(chainId, p)))
                pools.delete(p);
        await loadItems([...pools], async (pool) => {
            closed.throwIfAborted();
            const params = await engine.getBinaryBookParams(pool).catch(() => null);
            if (params && !closed.aborted)
                this.bookParams.set(chainKey(chainId, pool), params);
        });
    }
    setCurrency(chainId, token, meta) {
        const lc = Markets.lower0x(token);
        this.currencies.set(chainKey(chainId, lc), { chainId, token: lc, ...meta });
    }
    /** The currency code behind a token on one chain, or a hex stub when unknown. */
    codeOf(chainId, token) {
        return this.currencies.get(chainKey(chainId, token))?.code ?? token.slice(2, 8).toUpperCase();
    }
    /**
     *  `codeOf` for the registry, which asks by token only: the rows under
     *  consideration name the chain, so the first row whose chain knows the token
     *  answers. Two chains can label one address differently, and the registry
     *  synthesizes each row's symbol through the row's own chain by construction —
     *  this fallback only serves the symbol pass, never balances.
     */
    codeOfAny(rows, token) {
        for (const m of rows) {
            const hit = this.currencies.get(chainKey(chainOf(m), token));
            if (hit)
                return hit.code;
        }
        return token.slice(2, 8).toUpperCase();
    }
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
    async discoverPerpPools(engine, indexerRows, 
    /** The configured factory's status read, already started by the caller. */
    early, closed) {
        const empty = { statuses: new Map(), chainOnly: [], failed: [] };
        const indexed = indexerRows.filter((m) => m.marketType === "PERP");
        // Resolve the factory and, on the discovered route, the collateral token that
        // comes back in the same read. The ABSENCE of a route returns empty — a real
        // state, not a failure. A route that cannot be READ throws to the caller, which
        // owns the containment.
        let factory = engine.config.addresses?.perpPoolFactory;
        let collateralToken;
        if (!factory) {
            const bank = indexed[0]?.marginBank;
            if (!bank) {
                // No route to the factory at all: no configured address, and no indexed
                // perp row to read a `marginBank` from. Nothing is asked and nothing
                // fails, so the error accessors stay null and an empty perp list would
                // otherwise be indistinguishable from a venue that has no perps.
                // `perpDiscoverySkipped` is the only report of this state. First engine
                // wins, matching how `??=` reports the first discovery failure.
                //
                // NOT reported when THIS chain's registry read failed. An empty row set
                // is then a symptom of that failure, which `registryReadError` already
                // names — calling it "no factory route" would assert that the venue has
                // no perps plane, which is not something a failed read can establish.
                // Judged per chain: engines load concurrently, so another chain's failure
                // must not decide this one, and the outcome must not depend on timing.
                if (!this.registryReadFailures.has(engine.config.chain.id)) {
                    this.perpDiscoverySkip ??= { reason: "no-factory-route" };
                }
                return empty;
            }
            closed.throwIfAborted();
            const wiring = await engine.getPerpSystemConfig(bank);
            closed.throwIfAborted();
            // A half-wired bank reports the zero address. That is a successful read
            // saying "no factory", so it degrades rather than throwing.
            if (wiring.perpPoolFactory === zeroAddress)
                return empty;
            factory = wiring.perpPoolFactory;
            collateralToken = wiring.collateralToken;
        }
        const statuses = new Map();
        closed.throwIfAborted();
        for (const s of await (early ?? engine.listPerpPoolStatuses({ factory }))) {
            statuses.set(Markets.lower0x(s.pool), s);
        }
        closed.throwIfAborted();
        const known = new Set(indexed.map((m) => Markets.lower0x(m.poolAddress)));
        const missing = [...statuses.values()].filter((s) => !known.has(Markets.lower0x(s.pool)));
        // `first` doubles as the emptiness guard and as the pool to ask for collateral.
        const first = missing[0];
        if (!first)
            return { statuses, chainOnly: [], failed: [] };
        // One collateral token serves the whole plane, so it is resolved once rather
        // than per synthesized market. An indexed perp row is the cheapest source: it
        // already carries the token AND its decimals and symbol, so preferring it saves
        // two ERC-20 reads per load. Failing that, the bank names the token and its
        // metadata is read from the chain.
        // Synthesis is contained SEPARATELY from status discovery, so a pool that cannot be
        // read never discards the gates already in hand. Losing those would silently revert
        // every indexed perp to `active: true` — undoing this PR's headline fix for markets
        // that had nothing to do with the failure.
        const sibling = indexed[0];
        const source = sibling
            ? { token: sibling.quoteToken, decimals: sibling.quoteDecimals, symbol: sibling.quoteSymbol }
            : { token: collateralToken ?? (await engine.getPerpSystemConfig(first.marginBank)).collateralToken };
        const synthesized = await this.synthesizePerps(engine, missing, source, factory, closed).catch((err) => ({
            rows: [],
            failed: [err],
        }));
        return { statuses, chainOnly: synthesized.rows, failed: synthesized.failed };
    }
    /**
     *  Chain-read one row per factory pool the indexer is missing.
     *
     *  `collateral.decimals` / `.symbol` are supplied when a sibling indexed row
     *  already carried them, and read from the token otherwise.
     */
    async synthesizePerps(engine, missing, collateral, factory, closed) {
        closed.throwIfAborted();
        const token = collateral.token;
        const erc20 = { address: token, abi: ReadsAbi.erc20ReadAbi };
        // These two differ, and the difference is the point.
        //
        // `symbol` SWALLOWS to null: a token exposing none is a valid ERC-20 and the row's
        // own contract for that case is null. That is what justifies the undecorated escape
        // hatch here, and it is the same reason loadMarkets reads currency metadata this way.
        //
        // `decimals` does NOT swallow, because its value is load-bearing — it scales the
        // market's price precision and its minimum order size, so defaulting to 18 would
        // mis-scale silently. It therefore throws, and a raw viem error would be escaping a
        // modeled path (SDK-API-005) if it reached a consumer — it cannot: loadMarkets's
        // containment normalizes it into the `RpcError` reported by
        // {@link perpDiscoveryError}, with the viem error preserved in `cause`.
        //
        // Reached only when NO indexed perp row carried the collateral's metadata, which is
        // the same narrow case as a configured factory with an empty perp registry.
        const collateralDecimals = collateral.decimals ?? Number(await engine.getViemClient().readContract({ ...erc20, functionName: "decimals" }));
        closed.throwIfAborted();
        const collateralSymbol = collateral.symbol !== undefined
            ? collateral.symbol
            : await engine
                .getViemClient()
                .readContract({ ...erc20, functionName: "symbol" })
                .then(String)
                // Only a MISSING view earns the null. An outage here must stay a failure, or
                // discovery reports success with a market whose quote currency is unlabelled.
                .catch((err) => {
                if (PerpRegistry.isMissingContractView(err))
                    return null;
                throw err;
            });
        // Through the CLIENT, not `getViemClient()`. That accessor is the caller-facing
        // undecorated escape hatch (SDK-API-005) and reserves raw viem errors for
        // caller-owned operations; a modeled SDK read must cross the decorated client so
        // its failures are normalized like every other one.
        //
        // PER-POOL, not `Promise.all`: one unreadable pool must not discard the rows of
        // every other pool that answered. The rejections are returned so the caller can
        // report them without losing what did succeed.
        closed.throwIfAborted();
        const settled = await Promise.allSettled(missing.map((status) => engine.readPerpMarketFromChain({
            status,
            collateralToken: token,
            collateralDecimals,
            collateralSymbol,
            factory,
        })));
        const rows = [];
        const failed = [];
        for (const r of settled) {
            if (r.status === "fulfilled")
                rows.push(r.value);
            else
                failed.push(r.reason);
        }
        closed.throwIfAborted();
        for (const r of rows)
            this.chainOnlyPerps.add(chainKey(engine.config.chain.id, r.id));
        return { rows, failed };
    }
    toUnifiedMarket(m, symbol, codeOf) {
        const chainId = chainOf(m);
        if (m.marketType === "SPOT") {
            const s = m;
            return {
                id: m.id,
                chainId,
                symbol,
                type: "spot",
                base: s.baseSymbol ?? codeOf(s.baseToken),
                quote: s.quoteSymbol ?? codeOf(s.quoteToken),
                active: true,
                contract: false,
                precision: {
                    price: Structs.precisionFromStep(s.tickSize, s.quoteDecimals),
                    amount: Structs.precisionFromStep(s.lotSize, s.baseDecimals),
                },
                limits: { amount: { min: s.minQuantity ? Structs.toHumanNum(s.minQuantity, s.baseDecimals) : undefined } },
                indexed: true,
                info: m,
            };
        }
        if (m.marketType === "PERP") {
            const p = m;
            const quote = p.quoteSymbol ?? codeOf(p.quoteToken);
            const status = this.perpStatuses.get(chainKey(chainId, p.poolAddress));
            return {
                id: m.id,
                chainId,
                symbol,
                type: "swap",
                base: p.baseSymbol ?? codeOf(p.baseToken),
                quote,
                // A linear perp settles in its quote (collateral) currency.
                settle: quote,
                // Gate-derived, and the two gates are read INDEPENDENTLY on purpose. Folding
                // them through `tradeable` was wrong: it collapses to null whenever registration
                // is unknown, so a pool the factory reports as RESTRICTED — known close-only —
                // came back `active: true`, restoring the exact state this change removes.
                //
                // `restricted` is knowledge and closes the market on its own. Only the UNKNOWN
                // registration gate fails open, so an unreadable bank does not hide a live
                // market.
                active: status ? !status.restricted && status.registered !== false : true,
                contract: true,
                precision: {
                    price: Structs.precisionFromStep(p.tickSize, p.quoteDecimals),
                    amount: Structs.precisionFromStep(p.lotSize, p.baseDecimals),
                },
                limits: { amount: { min: p.minQuantity ? Structs.toHumanNum(p.minQuantity, p.baseDecimals) : undefined } },
                indexed: !this.chainOnlyPerps.has(chainKey(chainId, m.id)),
                ...(status
                    ? {
                        perpStatus: { restricted: status.restricted, registered: status.registered, tradeable: status.tradeable },
                    }
                    : {}),
                info: m,
            };
        }
        const b = m;
        // Active = inside the trading window and not settled. Derived from
        // timestamps, not the indexed status: markets flip Listed → Trading
        // implicitly on-chain (no event), so the indexed status lags reality.
        const now = Math.floor(Date.now() / 1000);
        const inWindow = Number(b.tradingStart) <= now && now < Number(b.expiry);
        // Grid from the pool itself (hydrated in loadMarkets), not the row: the
        // indexer leaves binary tick/lot/minQuantity undefined. Absent params (pool
        // read failed) leave full decimal precision and no minimum — the helpers
        // throw on such a market rather than quantize against a guess.
        const bp = this.bookParams.get(chainKey(chainId, b.poolAddress));
        return {
            id: m.id,
            chainId,
            symbol,
            type: "binary",
            base: symbol.split("/")[0] ?? symbol,
            quote: codeOf(b.collateral),
            settle: codeOf(b.collateral),
            active: inWindow && b.status !== "Resolved" && b.status !== "Voided",
            contract: false,
            precision: {
                price: bp ? Structs.precisionFromStep(bp.tickSize.toString(), b.quoteDecimals) : b.quoteDecimals,
                amount: bp ? Structs.precisionFromStep(bp.lotSize.toString(), b.baseDecimals) : b.baseDecimals,
            },
            limits: { amount: { min: bp ? Structs.toHumanNum(bp.minQuantity, b.baseDecimals) : undefined } },
            outcomes: Symbols.outcomesOf(m).map((o) => ({
                symbol: Symbols.tradableSymbol(symbol, o.label),
                label: o.label,
                index: o.index,
            })),
            indexed: true,
            info: m,
        };
    }
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
    market(ref) {
        return this.registry.resolve(ref);
    }
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
    priceToPrecision(ref, price) {
        const t = this.market(ref);
        const decimals = this.decimalsOf(t).price;
        const tickRaw = this.tickOf(t, "priceToPrecision");
        // Binary prices are probabilities — they may not rest at 0 or 1.
        return Structs.snapToGrid(price, tickRaw, decimals, {
            clamp: t.market.marketType === "BINARY",
        });
    }
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
    amountToPrecision(ref, amount) {
        const t = this.market(ref);
        // strict: an amount is usually bounded by a balance, and a lot-aligned value
        // one wei over it reverts. A price has no such ceiling, so it keeps the nudge.
        return Structs.snapToGrid(amount, this.lotOf(t, "amountToPrecision"), this.decimalsOf(t).amount, {
            strict: true,
        });
    }
    /**
     *  Every market as an array — {@link loadMarkets} (called if needed), minus
     *  the symbol keying.
     *
     *  **When to use**
     *
     *  Use as the ccxt-shaped sibling for list-style consumers.
     */
    async fetchMarkets() {
        await this.loadMarkets();
        return Object.values(this.markets);
    }
    // ------------------------------------------------------------- helpers
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
    tickOf(t, operation) {
        if (t.market.marketType === "BINARY") {
            return this.requireBookParams(t, operation).tickSize;
        }
        const decimals = this.decimalsOf(t).price;
        return t.market.tickSize ? BigInt(t.market.tickSize) : 10n ** BigInt(decimals - 3);
    }
    /** The market's amount grid in RAW base units. See {@link tickOf}. */
    lotOf(t, operation) {
        if (t.market.marketType === "BINARY") {
            return this.requireBookParams(t, operation).lotSize;
        }
        const decimals = this.decimalsOf(t).amount;
        return t.market.lotSize ? BigInt(t.market.lotSize) : 10n ** BigInt(decimals);
    }
    decimalsOf(t) {
        return { price: t.market.quoteDecimals, amount: t.market.baseDecimals };
    }
    /**
     *  The binary pool's enforced grid, or a throw. Only loadMarkets() populates
     *  the map, so an absent entry means that pool's read failed during the last
     *  load — not that the caller passed a bad ref.
     */
    requireBookParams(t, operation) {
        const bp = this.bookParams.get(chainKey(t.chainId, t.pool));
        if (!bp) {
            throw new InvalidInputError(`${operation}: no book parameters for binary market ${t.symbol} (pool ${t.pool}). ` +
                `The pool's getOrderBookParameters read failed during loadMarkets(); retry with loadMarkets(true).`);
        }
        return bp;
    }
    /** Native book → this tradable's [price, amount][] view, human units. */
    bookView(t, native) {
        const d = this.decimalsOf(t);
        const lvl = (l) => [
            Structs.toHumanNum(l.price, d.price),
            Structs.toHumanNum(l.quantity, d.amount),
        ];
        if (t.market.marketType === "BINARY") {
            const b = native;
            return t.outcomeIndex === 1
                ? { bids: b.noBids.map(lvl), asks: b.noAsks.map(lvl) }
                : { bids: b.yesBids.map(lvl), asks: b.yesAsks.map(lvl) };
        }
        const s = native;
        return { bids: s.bids.map(lvl), asks: s.asks.map(lvl) };
    }
    sideView(t, side) {
        if (!side)
            return undefined;
        const yesBuy = side === "BUY_YES" || side === "SELL_NO";
        if (t.market.marketType === "BINARY" && t.outcomeIndex === 1)
            return yesBuy ? "sell" : "buy";
        return yesBuy ? "buy" : "sell";
    }
    /** YES-terms raw price for this tradable's human price (NO inverts). */
    toNativePrice(t, price) {
        const d = this.decimalsOf(t);
        const raw = Structs.toRaw(price, d.price);
        // The NO complement `one - raw` preserves grid alignment because every venue's
        // tick divides one whole unit (they are all `10 ** (decimals - 3)`), so if
        // `raw` is a tick multiple the complement is too. A tick that did NOT divide
        // one unit would make the complement off-grid even from an aligned price —
        // there is no such venue, and `snapToGrid` would reject that grid for a
        // clamped binary price anyway.
        if (t.market.marketType === "BINARY" && t.outcomeIndex === 1)
            return 10n ** BigInt(d.price) - raw;
        return raw;
    }
    priceView(t, rawYesTerms, d) {
        const p = Structs.toHumanNum(rawYesTerms, d);
        return t.market.marketType === "BINARY" && t.outcomeIndex === 1 ? 1 - p : p;
    }
    /**
     *  An OHLC row through this tradable's lens. NO-outcome tradables mirror the
     *  price axis (p → 1−p), which also SWAPS high and low — the trap every
     *  candle-shaped read must avoid. RULE for new verbs: never invert prices,
     *  sides, or OHLC inline — go through {@link priceView} / {@link sideView} /
     *  this, so a verb cannot forget the lens. (The 1−p mirror is inherently
     *  BINARY: a categorical N-outcome book has no such pairwise mirror, so
     *  outcome views there will need a real per-outcome book, not a wider lens.)
     */
    ohlcView(t, raw, d) {
        const open = this.priceView(t, raw.open, d);
        const close = this.priceView(t, raw.close, d);
        const a = this.priceView(t, raw.high, d);
        const b = this.priceView(t, raw.low, d);
        return { open, close, high: Math.max(a, b), low: Math.min(a, b) };
    }
    // ------------------------------------------------------------- fetch*
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
    async fetchOrderBook(ref, options = 10) {
        const opts = typeof options === "number" ? { limit: options } : options;
        const limit = opts.limit ?? 10;
        const t = this.requireLive(this.market(ref), "fetchOrderBook");
        const engine = this.engineOf(t);
        const native = t.market.marketType === "BINARY"
            ? await engine.getBinaryOrderBook(t.pool, {
                depth: limit,
                decimals: t.market.quoteDecimals,
                blockNumber: opts.blockNumber,
            })
            : await engine.getSpotOrderBook(t.pool, { depth: limit, blockNumber: opts.blockNumber });
        return {
            symbol: t.symbol,
            chainId: t.chainId,
            ...this.bookView(t, native),
            ...(native.blockNumber === undefined ? {} : { blockNumber: native.blockNumber }),
            timestamp: Date.now(),
            info: native,
        };
    }
    /**
     * Recent public trades with authoritative block and log positions (indexer, newest first).
     * @throws {@link InvalidInputError} If the symbol or source position is invalid.
     * @throws {@link IndexerError} If the indexer read fails.
     * @throws {@link NotConfiguredError} If the chain's indexer is absent or does not index that chain.
     * @throws {@link InvalidInputError} If the market is a SETTLED binary market (resolved, voided or finalized). Its pool now serves the next market in the series, so only `redeem`, balances and history remain.
     */
    async fetchTrades(ref, since, limit = 50) {
        const t = this.requireLive(this.market(ref), "fetchTrades");
        const d = this.decimalsOf(t);
        // Scoped by MARKET id, like every other history read here. `getFills` takes
        // a POOL, and a binary pool is recycled by successive markets, so its tape
        // carries every life of the pool: without this filter a LIVE market's tape
        // would include its predecessors' fills, labelled with THIS market's symbol.
        // The read asks for a full page rather than `limit` so the rows dropped here
        // do not shorten the answer; a pool with more than a page of older fills
        // ahead of this market's can still under-deliver, which is the point at
        // which `getFills` needs a market scope of its own rather than a wider page.
        const marketId = t.market.id.toLowerCase();
        const rows = await this.engineOf(t).getFills(t.pool, { limit: Math.max(limit, TRADE_PAGE) });
        return rows
            .filter((f) => f.market.toLowerCase() === marketId)
            .slice(0, limit)
            .map((f) => {
            const price = this.priceView(t, f.fillPrice, d.price);
            const amount = Structs.toHumanNum(f.quantity, d.amount);
            const tsMs = Number(f.timestamp) * 1000;
            const takerBuysBase = f.takerIsBid ?? undefined;
            let side;
            if (takerBuysBase !== undefined)
                side = takerBuysBase ? "buy" : "sell";
            if (t.market.marketType === "BINARY" && t.outcomeIndex === 1 && side)
                side = side === "buy" ? "sell" : "buy";
            return {
                id: f.id,
                blockNumber: Structs.tradeBlockNumber(f.blockNumber, f.logIndex),
                logIndex: f.logIndex,
                symbol: t.symbol,
                chainId: t.chainId,
                price,
                amount,
                cost: price * amount,
                side,
                txHash: f.txHash,
                timestamp: tsMs,
                datetime: Structs.toDatetime(tsMs),
                info: f,
            };
        })
            .filter((tr) => since === undefined || tr.timestamp >= since);
    }
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
    async fetchOHLCV(ref, timeframe = "5m", since, limit = 500) {
        const t = this.requireLive(this.market(ref), "fetchOHLCV");
        const interval = Structs.TIMEFRAMES[timeframe];
        if (!interval)
            throw new InvalidInputError(`unknown timeframe ${timeframe} (have: ${Object.keys(Structs.TIMEFRAMES).join(" ")})`);
        const d = this.decimalsOf(t);
        const rows = await this.engineOf(t).getCandles(t.pool, interval, { limit, market: t.market.id });
        return rows
            .map((c) => {
            const v = this.ohlcView(t, { open: c.openPrice, high: c.high, low: c.low, close: c.closePrice }, d.price);
            const ts = Number(c.bucketStart) * 1000;
            return [ts, v.open, v.high, v.low, v.close, Structs.toHumanNum(c.baseVolume, d.amount)];
        })
            .filter((row) => since === undefined || row[0] >= since);
    }
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
    async fetchTicker(ref) {
        const t = this.requireLive(this.market(ref), "fetchTicker");
        const d = this.decimalsOf(t);
        const nowSec = Math.floor(Date.now() / 1000);
        // CONTAINED, like the perp read below. The 24h statistics come from the
        // indexer; mark, index, funding and open interest come from chain. Letting
        // a candle outage throw here cost a perp trader five chain numbers that
        // would have worked — and those are the numbers that decide liquidation
        // risk. The containment is narrow: only `IndexerError`, so a programming
        // error or an invariant breach still propagates.
        //
        // On an `indexed: false` market no request is sent at all. The counters
        // there are placeholders for "unknown" (see `structs.ts`), so reporting a
        // folded `0` would publish a false number.
        // The same predicate `loadMarkets` publishes as `UnifiedMarket.indexed`.
        const indexed = !this.chainOnlyPerps.has(chainKey(t.chainId, t.market.id));
        const isPerp = Markets.isPerpMarket(t.market);
        // Start both tiers in this turn and observe every rejection before mapping either
        // result. Wrapping each start also observes a synchronous boundary failure.
        let fatal;
        const recordFatal = (reason, tier, cancelled = false) => {
            fatal ??= {
                reason: cancelled || Errors.isErrorInstance(reason, SomniaMarketsError)
                    ? reason
                    : new InvariantError(`fetchTicker(${t.symbol}): ${tier} failed unexpectedly`, reason),
            };
        };
        const [candlesResult, perpResult] = await Promise.allSettled([
            (async () => {
                if (!indexed)
                    return undefined;
                let signal;
                try {
                    const engine = this.engineOf(t);
                    signal = engine.config.signal;
                    return await engine.getCandles(t.pool, 3600, { from: nowSec - 86_400, limit: 25, market: t.market.id });
                }
                catch (reason) {
                    // Capture caller provenance at rejection. Joining a slower tier must not
                    // let a later abort reclassify an earlier programming failure.
                    const cancelled = signal?.aborted === true && Object.is(reason, signal.reason);
                    if (cancelled || !Errors.isErrorInstance(reason, IndexerError))
                        recordFatal(reason, "candle read", cancelled);
                    throw reason;
                }
            })(),
            (async () => {
                if (!isPerp)
                    return undefined;
                try {
                    return await this.engineOf(t).getPerpState(t.pool);
                }
                catch (reason) {
                    // RPC does not accept the indexer signal. Only its documented operational
                    // failures degrade this tier; SDK defects remain fatal.
                    if (!Errors.isErrorInstance(reason, RpcError) &&
                        !Errors.isErrorInstance(reason, ContractRevertError) &&
                        !Errors.isErrorInstance(reason, NotConfiguredError)) {
                        recordFatal(reason, "perp-state read");
                    }
                    throw reason;
                }
            })(),
        ]);
        if (fatal)
            throw fatal.reason;
        try {
            const rows = candlesResult.status === "fulfilled" ? candlesResult.value : undefined;
            const perp = perpResult.status === "fulfilled" ? perpResult.value : undefined;
            const statsState = rows === undefined ? "unavailable" : "ok";
            // An EMPTY window is still a successful read: the fold's zeros are true
            // zeros (SDK-IO-002's successful-zero exception). Only `undefined` above —
            // a failed read or a chain-only market — suppresses the whole 24h half.
            const stats = rows ? DerivedReads.marketStats24hFromCandles(rows, nowSec) : undefined;
            const windowed = stats && stats.openPrice24h !== null && stats.high24h !== null && stats.low24h !== null
                ? this.ohlcView(t, 
                // `close` is a placeholder for the shared view; `last` below is
                // derived from the freshest fill instead.
                { open: stats.openPrice24h, high: stats.high24h, low: stats.low24h, close: stats.openPrice24h }, d.price)
                : undefined;
            const open = windowed?.open;
            const high = windowed?.high;
            const low = windowed?.low;
            // The freshest fill: the last in-window candle's close, else the market
            // row's lifetime last price (may predate the window on quiet books). With
            // no candles read at all, the cached row is the only source — `last` and
            // `lastSource` survive an unavailable window.
            const lastCandle = rows?.[rows.length - 1];
            const lastRaw = lastCandle ? lastCandle.closePrice : t.market.lastPrice;
            const last = lastRaw != null ? this.priceView(t, lastRaw, d.price) : undefined;
            // Provenance for `last`, so a consumer can tell a fresh print from a stale
            // one. A candle stamps its BUCKET, which is the closest the indexed path
            // gets — the individual fill's own time is not carried. The cache fallback
            // stamps `lastTradeAt`; when even that is null the field is absent, and
            // absence is the documented "no provenance, treat as stale" signal.
            const lastSourceSec = lastCandle ? Number(lastCandle.bucketStart) : Number(t.market.lastTradeAt ?? Number.NaN);
            const lastSource = last !== undefined && Number.isFinite(lastSourceSec) ? { timestamp: lastSourceSec * 1000 } : undefined;
            // The 24h statistics' OWN as-of: the end of the newest folded bucket, not the
            // response time. Absent when the window held no candles to fold.
            const statsAsOf = lastCandle ? (Number(lastCandle.bucketStart) + 3600) * 1000 : undefined;
            const change = last !== undefined && open !== undefined ? last - open : undefined;
            const percentage = change !== undefined && open ? change / open : undefined;
            // A perp header needs mark / index / open interest / funding beside the 24h figures,
            // and none of those are derivable from candles — they are chain state. Folding them
            // in here means one call answers the whole header instead of the consumer knowing to
            // pair fetchTicker with a second read.
            //
            // Degrades to the 24h half rather than failing whole. `getPerpState` reads
            // `getIndexPrice()`, which is a BARE `IOracle.getPrice()` on the pool — the one
            // index-price path the contract does not wrap in try/catch — so a dead or rotated
            // oracle propagates its revert here. That is precisely when an operator is staring
            // at the ticker, and before this read existed the perp header cost no RPC at all
            // and could not fail. Losing the candle-derived stats to an oracle outage would be
            // a regression introduced by enriching the response.
            //
            // The containment stays, but it no longer hides: `perpState` below reports
            // the degrade explicitly. Before that field, a missing `markPrice` read
            // identically on a spot market and on a perp whose oracle reverted, so the
            // documented degrade was not observable to a consumer.
            const perpState = perpStateOf(isPerp, perp !== undefined);
            const now = Date.now();
            return {
                symbol: t.symbol,
                chainId: t.chainId,
                timestamp: now,
                datetime: Structs.toDatetime(now),
                ...(open !== undefined ? { open } : {}),
                ...(high !== undefined ? { high } : {}),
                ...(low !== undefined ? { low } : {}),
                ...(last !== undefined ? { last } : {}),
                ...(lastSource !== undefined ? { lastSource } : {}),
                ...(statsAsOf !== undefined ? { statsAsOf } : {}),
                ...(change !== undefined ? { change } : {}),
                ...(percentage !== undefined ? { percentage } : {}),
                ...(stats
                    ? {
                        baseVolume: Structs.toHumanNum(stats.baseVolume24h, d.amount),
                        quoteVolume: Structs.toHumanNum(stats.volume24h, d.price),
                    }
                    : {}),
                statsState,
                ...(perp
                    ? {
                        // Both conditions, matching perpMarkForPnl. `_tryMarkPrice` currently
                        // returns (false, 0) on a zero price, so `ok` already implies non-zero —
                        // but that is the CONTRACT's invariant, not this client's, and the cost of
                        // enforcing it locally is one comparison. A zero mark reaching the wire is
                        // the failure DEX-1855 fixed: downstream, an unguarded
                        // `markPrice - entryPrice` reads as a 100% loss on every open position.
                        ...(perp.markPriceOk && perp.markPrice > 0n
                            ? { markPrice: Structs.toHumanNum(perp.markPrice, d.price) }
                            : {}),
                        indexPrice: Structs.toHumanNum(perp.indexPrice, d.price),
                        // The SAME per-8h axis as fetchFundingRate and fetchFundingRateHistory. A
                        // header on one basis beside a chart on another is a wrong number that
                        // looks right.
                        fundingRate: Number(fundingRate8h(perp.fundingRate, perp.fundingWindowSec)) / 1e18,
                        fundingTimestamp: Number(perp.nextFundingAt) * 1000,
                        openInterest: Structs.toHumanNum(perp.openInterest, d.amount),
                    }
                    : {}),
                perpState,
                info: perp ? { ...stats, perp } : stats,
            };
        }
        catch (cause) {
            if (Errors.isErrorInstance(cause, SomniaMarketsError))
                throw cause;
            throw new InvariantError(`fetchTicker(${t.symbol}): could not map the settled ticker tiers`, cause);
        }
    }
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
    async fetchBalance(filter = {}) {
        const addr = this.requireAddress("fetchBalance");
        const closed = this.closeController.signal;
        const engines = this.readEngines(undefined, filter.chainId);
        const load = this.loadMarketsFor(filter.chainId);
        const out = {};
        const add = (code, chainId, total) => {
            const entry = out[code] ?? { free: 0, used: 0, total: 0, byChain: {} };
            entry.free += total;
            entry.total += total;
            entry.byChain[chainId] = { free: total, used: 0, total };
            out[code] = entry;
        };
        // Start independent native and portfolio reads during registry load. Currency
        // reads and position mapping wait only for the registry inputs they need.
        const reads = engines.map(async ([chainId, engine]) => {
            // Supplied owner socket failures keep their identity; only SDK-owned
            // failures gain this chain's id.
            const supplied = new WeakSet();
            const observed = (failure) => {
                supplied.add(failure);
            };
            const registered = this.balanceReads.get(chainId);
            const nativeCurrency = engine.config.chain.nativeCurrency;
            const native = Promise.resolve()
                .then(() => registered && registered.selected.getNativeBalance === engine.getNativeBalance
                ? registered.read.native(addr, observed)
                : engine.getNativeBalance(addr))
                .then((raw) => add(nativeCurrency.symbol, chainId, Structs.toHumanNum(raw, nativeCurrency.decimals)));
            const erc20 = load.then(async () => {
                closed.throwIfAborted();
                await settleBalanceStages([...this.currencies.values()]
                    .filter((c) => c.chainId === chainId)
                    .map(async ({ token, code, decimals }) => {
                    const raw = await (registered && registered.selected.getErc20Balance === engine.getErc20Balance
                        ? registered.read.erc20(token, addr, observed)
                        : engine.getErc20Balance(token, addr));
                    add(code, chainId, Structs.toHumanNum(raw, decimals));
                }));
            });
            const binary = async () => {
                if (!hasIndexer(engine))
                    return;
                const portfolio = Promise.resolve().then(() => engine.getPortfolio(addr));
                const [loaded, result] = await Promise.allSettled([load, portfolio]);
                if (loaded.status === "rejected")
                    throw loaded.reason;
                if (result.status === "rejected")
                    throw result.reason;
                closed.throwIfAborted();
                const p = result.value;
                await this.ensureResolvable(chainId, engine, p.positions.map((pos) => pos.market.id), closed);
                for (const pos of p.positions) {
                    const side = pos.outcomeIndex === 1 ? "BUY_NO" : "BUY_YES";
                    const t = this.resolveRowTradable(chainId, pos.market.id, pos.market.poolAddress, side);
                    if (!t)
                        throw new IndexerError("getPortfolio", `position on market ${pos.market.id} names a market the indexer has no row for`);
                    add(t.symbol, chainId, Structs.toHumanNum(pos.balance, pos.market.quoteDecimals));
                }
            };
            try {
                await settleBalanceStages([erc20, native, binary()]);
                closed.throwIfAborted();
            }
            catch (error) {
                if (engines.length <= 1)
                    throw error;
                const isSupplied = ((typeof error === "object" && error !== null) || typeof error === "function") && supplied.has(error);
                throw isSupplied ? error : withChainId(error, chainId);
            }
        });
        // A failed stage still joins all started chains and the registry load. No
        // abandoned rejection or balance work survives the returned failure.
        await settleBalanceStages([load, ...reads]);
        closed.throwIfAborted();
        return out;
    }
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
    async fetchOpenOrders(ref, limit, filter = {}) {
        const closed = this.closeController.signal;
        const addr = this.requireAddress("fetchOpenOrders");
        const t = ref ? this.market(ref) : undefined;
        const opts = limit === undefined ? {} : { ordersLimit: limit };
        // A scoped read touches only the market's chain; an unscoped one reads every
        // configured chain, merged in binding order.
        const engines = this.readEngines(t, filter.chainId);
        const perChain = await this.perChain(engines, async (chainId, engine) => {
            if (!hasIndexer(engine))
                return this.fetchOpenOrdersOnchain(chainId, engine, addr, t);
            if (t !== undefined) {
                const scope = { marketId: t.market.id };
                if (t.outcome === "YES" || t.outcome === "NO")
                    scope.outcome = t.outcome;
                const result = await CreateClient.readScopedOpenOrders(engine, addr, t.market.marketType, scope, limit, closed);
                if (result.type === "BINARY") {
                    await this.ensureResolvable(chainId, engine, result.orders.map((order) => order.market.id), closed);
                    return result.orders.flatMap((order) => this.mapPortfolioOrder(chainId, order, t));
                }
                return result.orders.flatMap((order) => this.mapSpotPortfolioOrder(chainId, order, t));
            }
            // The kind reads are independent, so they run at once. Mapping waits for
            // all of them and keeps the binary, spot, perp order.
            const [binary, spot, perp] = await Promise.all([
                engine.getPortfolio(addr, opts).then(async (p) => {
                    await this.ensureResolvable(chainId, engine, p.openOrders.map((o) => o.market.id), closed);
                    return p.openOrders;
                }),
                engine.getSpotPortfolio(addr, opts).then((p) => p.openOrders),
                engine.getPerpPortfolio(addr, opts).then((p) => p.openOrders),
            ]);
            const out = [];
            for (const o of binary)
                out.push(...this.mapPortfolioOrder(chainId, o, t));
            for (const o of [...spot, ...perp])
                out.push(...this.mapSpotPortfolioOrder(chainId, o, t));
            return out;
        });
        return perChain.flat();
    }
    /**
     *  {@link fetchOpenOrders} on a chain bound with no indexer: the resting
     *  orders read from the chain, over the perp pools that {@link loadMarkets}
     *  discovered there. Rows have no `txHash` and no `timestamp`, because only
     *  the indexer records them.
     */
    async fetchOpenOrdersOnchain(chainId, engine, addr, t) {
        await this.loadMarketsFor(chainId);
        const pools = t
            ? [t.pool]
            : Object.values(this.markets)
                .filter((m) => m.chainId === chainId && m.type === "swap")
                .map((m) => this.market(m.symbol).pool);
        const out = [];
        for (let i = 0; i < pools.length; i += Orders.OPEN_ORDERS_ONCHAIN_MAX_POOLS) {
            const { orders } = await engine.getOpenOrdersOnchain(pools.slice(i, i + Orders.OPEN_ORDERS_ONCHAIN_MAX_POOLS), addr);
            for (const o of orders) {
                const rt = this.tryResolvePool(chainId, o.pool);
                if (rt)
                    out.push(this.mapOnchainOrder(rt, o));
            }
        }
        return out;
    }
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
    async fetchOrders(ref, since, limit = 100, params = {}) {
        const closed = this.closeController.signal;
        const addr = this.requireAddress("fetchOrders");
        const t = ref ? this.market(ref) : undefined;
        // Each chain pages its own ordered set; the merge keeps newest-first across
        // chains. `limit`/`offset` therefore apply PER CHAIN on an unscoped read.
        const engines = this.indexedEngines(this.readEngines(t, params.chainId));
        const unscoped = !t && params.chainId === undefined;
        const pages = await this.perChain(engines, async (chainId, engine) => {
            // Scoped by MARKET id, not pool: a binary pool is recycled across
            // successive markets, so a pool scope would return every life of the
            // pool. On spot/perp the pool address IS the market id.
            const rows = await engine.getOrders(addr, {
                limit,
                offset: params.offset ?? 0,
                ...(t ? { market: t.market.id } : {}),
            });
            await this.ensureResolvable(chainId, engine, rows.map((o) => o.market), closed);
            return rows.map((o) => ({ chainId, o }));
        }, unscoped);
        const out = [];
        for (const { chainId, o } of pages.flat()) {
            const rt = this.resolveRowTradable(chainId, o.market, o.pool, o.side);
            if (!rt)
                continue;
            if (t?.outcome && rt.outcome !== t.outcome)
                continue;
            const tsMs = Number(o.placedAtTimestamp) * 1000;
            if (since !== undefined && tsMs < since)
                continue;
            out.push(this.mapOrderRow(rt, o));
        }
        // Newest first across chains (each page already is within its chain).
        return engines.length > 1 ? out.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)) : out;
    }
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
    async getOrderHistoryPage(options = {}) {
        return this.getOrdersPage(options);
    }
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
    async getOrdersPage(options = {}) {
        const account = Markets.lower0x(this.requireAddress("getOrdersPage"));
        const { ref, status } = options;
        const limit = options.limit ?? 100;
        const offset = options.offset ?? 0;
        if (!Number.isSafeInteger(limit) || limit <= 0) {
            throw new InvalidInputError("getOrdersPage: limit must be a positive safe integer");
        }
        if (!Number.isSafeInteger(offset) || offset < 0) {
            throw new InvalidInputError("getOrdersPage: offset must be a nonnegative safe integer");
        }
        if (offset > Number.MAX_SAFE_INTEGER - limit) {
            throw new InvalidInputError("getOrdersPage: offset plus limit must be a safe integer");
        }
        if (status !== undefined && !isOrderStatus(status)) {
            throw new InvalidInputError(`getOrdersPage: unknown order status ${String(status)}`);
        }
        const scope = ref === undefined ? undefined : this.market(ref);
        // Each chain pages its own ordered set (`limit`/`offset` apply PER CHAIN on
        // an unscoped read, as in `fetchOrders`); a scoped read touches one engine.
        const engines = this.indexedEngines(this.readEngines(scope, options.chainId));
        const unscoped = scope === undefined && options.chainId === undefined;
        const pages = await this.perChain(engines, async (chainId, engine) => {
            try {
                return {
                    chainId,
                    rows: await engine.getOrders(account, {
                        limit,
                        offset,
                        ...(status === undefined ? {} : { status }),
                        ...(scope === undefined ? {} : { pool: scope.pool }),
                    }),
                };
            }
            catch (error) {
                if (error instanceof SomniaMarketsError)
                    throw error;
                throw new IndexerError("getOrdersPage", error instanceof Error ? error.message : String(error), {
                    cause: error,
                });
            }
        }, unscoped);
        const rowsRead = pages.reduce((n, page) => n + page.rows.length, 0);
        // Any chain with a full page has more: the next offset applies to every chain.
        const nextOffset = pages.some((page) => page.rows.length === limit) ? offset + limit : null;
        const orders = [];
        const unresolved = [];
        try {
            for (const { chainId, row } of pages.flatMap((page) => page.rows.map((row) => ({ chainId: page.chainId, row })))) {
                if (!isOrderStatus(row.status)) {
                    throw new TypeError(`invalid producer order status ${String(row.status)}`, { cause: row.status });
                }
                if (row.side !== null && !isBinarySide(row.side)) {
                    throw new TypeError(`invalid producer order side ${String(row.side)}`, { cause: row.side });
                }
                const identity = {
                    chainId,
                    account,
                    marketId: row.market,
                    pool: row.pool,
                    orderId: row.orderId,
                };
                if (scope !== undefined && scope.market.id.toLowerCase() !== row.market.toLowerCase())
                    continue;
                const resolved = this.resolveRowTradable(chainId, row.market, row.pool, row.side);
                if (resolved === null) {
                    unresolved.push(identity);
                    continue;
                }
                if (scope?.outcome !== undefined && resolved.outcome !== scope.outcome)
                    continue;
                orders.push({ ...this.mapOrderRow(resolved, row), identity, info: row });
            }
        }
        catch (error) {
            if (error instanceof SomniaMarketsError)
                throw error;
            throw new IndexerError("getOrdersPage", "producer order row could not be mapped", { cause: error });
        }
        return { orders, rowsRead, nextOffset, unresolved, coverage: "partial", source: "indexer-offset" };
    }
    /**
     *  Make every market id in `ids` resolvable, hydrating on demand the ones the
     *  tradable registry does not carry — a SETTLED binary market a wallet still
     *  holds a position, a fill or an order in. Each unknown id is read once by
     *  primary key and added to the symbol registry for resolution only; it is not
     *  listed by `fetchMarkets()`. A miss is remembered so the same id is not
     *  re-queried on every read. Throws {@link IndexerError} when a read fails.
     */
    async ensureResolvable(chainId, engine, ids, closed) {
        const requested = new Set([...ids].map((id) => id.toLowerCase()));
        for (;;) {
            closed.throwIfAborted();
            if (this.marketLoad)
                await this.marketLoad;
            closed.throwIfAborted();
            const generation = this.resolutionGeneration;
            const missing = [...requested].filter((id) => !this.settledMarkets.has(Symbols.registryKey(chainId, id)) && !this.registry.has(chainId, id));
            const resolved = [];
            // Sequential finite batches avoid unbounded provider concurrency. Every
            // alias has a primary-key row/null proof, unaffected by list page ceilings.
            for (let offset = 0; offset < missing.length; offset += Markets.RESOLVABLE_MARKET_CAPACITY) {
                resolved.push(...(await CreateClient.resolveMarkets(engine, missing.slice(offset, offset + Markets.RESOLVABLE_MARKET_CAPACITY), closed)));
                closed.throwIfAborted();
                if (generation !== this.resolutionGeneration)
                    break;
            }
            // A load can clear or rebuild every reverse lookup while the query waits.
            // Discard that response, join the load, and resolve against its new registry.
            if (generation !== this.resolutionGeneration)
                continue;
            const entries = missing.map((id, i) => {
                const row = resolved[i];
                if (row === undefined)
                    unreachable("settled lookup omitted a requested result");
                const m = row === null ? null : { ...row, chainId };
                return { key: Symbols.registryKey(chainId, id), market: m };
            });
            let publishRegistry;
            try {
                publishRegistry = this.registry.prepareSettled(entries.flatMap(({ market }) => (market === null ? [] : [market])), (token) => this.codeOf(chainId, token));
            }
            catch (cause) {
                throw new IndexerError("ResolvableMarkets", "cannot prepare settled-market registry", {
                    cause: { ids: missing, rows: resolved, cause },
                });
            }
            closed.throwIfAborted();
            if (generation !== this.resolutionGeneration)
                continue;
            publishRegistry();
            for (const { key, market } of entries)
                this.settledMarkets.set(key, market);
            return;
        }
    }
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
    resolveRowTradable(chainId, market, pool, side) {
        try {
            const base = this.registry.resolve(ChainRef.chainMarketRef(chainId, market));
            if (base.market.id.toLowerCase() !== market.toLowerCase())
                return null;
            if (base.pool.toLowerCase() !== pool.toLowerCase())
                return null;
            if (base.market.marketType !== "BINARY" || side == null)
                return base;
            const outcome = side === "BUY_YES" || side === "SELL_YES" ? "YES" : "NO";
            return this.registry.resolve(ChainRef.chainMarketRef(chainId, `${base.marketSymbol}#${outcome}`));
        }
        catch (error) {
            if (error instanceof InvalidInputError)
                return null;
            throw error;
        }
    }
    mapOrderRow(t, row) {
        const decimals = this.decimalsOf(t);
        const timestamp = Number(row.placedAtTimestamp) * 1000;
        let side;
        if (t.market.marketType === "BINARY") {
            side = this.sideView(t, row.side ?? (row.isBid ? "BUY_YES" : "SELL_YES"));
        }
        else {
            side = row.isBid ? "buy" : "sell";
        }
        return {
            id: row.orderId,
            symbol: t.symbol,
            chainId: t.chainId,
            side,
            price: this.priceView(t, row.price, decimals.price),
            amount: Structs.toHumanNum(row.fullQuantity, decimals.amount),
            filled: Structs.toHumanNum(row.filledQuantity, decimals.amount),
            remaining: Structs.toHumanNum(row.quantityRemaining, decimals.amount),
            status: Structs.toUnifiedStatus(row.status),
            txHash: row.placedTxHash,
            timestamp,
            datetime: Structs.toDatetime(timestamp),
            info: row,
        };
    }
    mapPortfolioOrder(chainId, o, scope) {
        if (scope && o.market.id.toLowerCase() !== scope.market.id.toLowerCase())
            return [];
        const t = this.resolveRowTradable(chainId, o.market.id, o.market.poolAddress, o.side);
        if (!t)
            return [];
        if (scope?.outcome && t.outcome !== scope.outcome)
            return [];
        const d = this.decimalsOf(t);
        const tsMs = Number(o.placedAtTimestamp) * 1000;
        return [
            {
                id: o.orderId,
                symbol: t.symbol,
                chainId,
                side: this.sideView(t, o.side ?? undefined) ?? "buy",
                price: this.priceView(t, o.price, d.price),
                amount: Structs.toHumanNum(o.fullQuantity, d.amount),
                filled: Structs.toHumanNum(o.filledQuantity, d.amount),
                remaining: Structs.toHumanNum(o.quantityRemaining, d.amount),
                status: "open",
                txHash: o.placedTxHash,
                timestamp: tsMs,
                datetime: Structs.toDatetime(tsMs),
                info: o,
            },
        ];
    }
    /** A spot or perp order read from the chain; binary rows carry no YES/NO side. */
    mapOnchainOrder(t, o) {
        const d = this.decimalsOf(t);
        return {
            id: o.orderId.toString(),
            symbol: t.symbol,
            chainId: t.chainId,
            side: o.isBid ? "buy" : "sell",
            price: Structs.toHumanNum(o.price, d.price),
            amount: Structs.toHumanNum(o.fullQuantity, d.amount),
            filled: Structs.toHumanNum(o.fullQuantity - o.quantityRemaining, d.amount),
            remaining: Structs.toHumanNum(o.quantityRemaining, d.amount),
            status: "open",
            info: o,
        };
    }
    // Shared by SPOT and PERP: both are plain isBid base/quote orders and the
    // mapper only touches the fields the two portfolio rows have in common.
    mapSpotPortfolioOrder(chainId, o, scope) {
        if (scope && o.market.poolAddress.toLowerCase() !== scope.pool.toLowerCase())
            return [];
        const t = this.tryResolvePool(chainId, o.market.poolAddress);
        if (!t)
            return [];
        const d = this.decimalsOf(t);
        const tsMs = Number(o.placedAtTimestamp) * 1000;
        return [
            {
                id: o.orderId,
                symbol: t.symbol,
                chainId,
                side: o.isBid ? "buy" : "sell",
                price: Structs.toHumanNum(o.price, d.price),
                amount: Structs.toHumanNum(o.fullQuantity, d.amount),
                filled: Structs.toHumanNum(o.filledQuantity, d.amount),
                remaining: Structs.toHumanNum(o.quantityRemaining, d.amount),
                status: "open",
                txHash: o.placedTxHash,
                timestamp: tsMs,
                datetime: Structs.toDatetime(tsMs),
                info: o,
            },
        ];
    }
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
    async fetchPortfolioAnalytics(timeframe, params = {}) {
        const addr = this.requireAddress("fetchPortfolioAnalytics");
        const addrLc = addr.toLowerCase();
        const asOf = Date.now();
        const maxFillPages = params.maxFillPages;
        if (maxFillPages !== undefined && (!Number.isSafeInteger(maxFillPages) || maxFillPages < 1)) {
            throw new InvalidInputError("fetchPortfolioAnalytics: maxFillPages must be a positive safe integer");
        }
        // Page each chain's SPOT fills to exhaustion. A single capped page would drop
        // the OLDEST fills — the buys that establish carried-in cost basis — so sells
        // would realize against a phantom zero basis, a subtler corruption than
        // missing volume. Cursor pages (not offsets) because the page method probes
        // short responses, so an unknown positive Hasura row cap cannot erase
        // continuation before the oldest cost-basis fill. At the common 1,000-row
        // cap, a full page plus lookahead needs one request. The kind filter runs at
        // the indexer (SDK-IO-004): binary and perp rows never cross the wire.
        const PAGE = 999;
        // The budget counts pages across EVERY chain: a wallet's history is the union
        // of its chains, so a per-chain budget would silently let a two-chain account
        // read twice what a one-chain account may. Chains page concurrently, one page
        // in flight per chain; the shared counter keeps the same reject-iff-over rule.
        let pages = 0;
        // One chain's failure rejects the read, so the other chains stop at their
        // next page rather than paging history nobody will use.
        let failed = false;
        const perChainFills = await this.perChain([...this.engines], async (chainId, engine) => {
            const rows = [];
            let cursor;
            // The default has no page cap, so a cyclic cursor must not loop forever.
            const seenCursors = new Set();
            try {
                for (;;) {
                    if (failed)
                        return rows;
                    // A continuation proves another logical page exists, so stop before
                    // reading it. A new chain may be empty and must be read once before it
                    // can consume the cross-chain budget.
                    if (cursor !== undefined && maxFillPages !== undefined && pages >= maxFillPages) {
                        throw new IncompleteHistoryError("fetchPortfolioAnalytics", "pageBudgetExceeded", pages, maxFillPages);
                    }
                    const page = await engine.getUserFillsPage(addr, {
                        limit: PAGE,
                        marketType: "SPOT",
                        ...(cursor === undefined ? {} : { cursor }),
                    });
                    const consumesBudget = page.fills.length > 0 || page.nextCursor !== null;
                    if (consumesBudget && maxFillPages !== undefined && pages >= maxFillPages) {
                        throw new IncompleteHistoryError("fetchPortfolioAnalytics", "pageBudgetExceeded", pages, maxFillPages);
                    }
                    if (consumesBudget)
                        pages += 1;
                    for (const f of page.fills)
                        rows.push({ chainId, f });
                    if (page.nextCursor === null)
                        return rows;
                    if (seenCursors.has(page.nextCursor)) {
                        throw new IncompleteHistoryError("fetchPortfolioAnalytics", "cursorCycle", pages, maxFillPages);
                    }
                    seenCursors.add(page.nextCursor);
                    cursor = page.nextCursor;
                }
            }
            catch (e) {
                failed = true;
                throw e;
            }
        });
        // Chain order, as the serial read produced, so the fold sees the same sequence.
        const fills = perChainFills.flat();
        // Map indexer fills → flow events, spot markets only, account
        // perspective (taker side, or its inverse when the wallet made).
        const events = [];
        const touched = new Map();
        for (const { chainId, f } of fills) {
            const t = this.resolveRowTradable(chainId, f.market, f.pool);
            if (!t || t.market.marketType !== "SPOT")
                continue;
            // A null takerIsBid (a row predating the taker bridge, or an unjoined
            // taker order) has no knowable direction — skip the fill rather than
            // fabricate a side and silently corrupt the avg-cost book.
            if (f.takerIsBid == null)
                continue;
            const takerIsBid = f.takerIsBid;
            // Pin the wallet's role explicitly: a fill whose taker is still
            // unjoined might be OURS as taker — defaulting to "maker" there would
            // invert the side. Only classify when one of the roles matches.
            const isTaker = (f.taker ?? "").toLowerCase() === addrLc;
            const isMaker = (f.maker ?? "").toLowerCase() === addrLc;
            if (!isTaker && !isMaker)
                continue;
            // An unusable timestamp is skipped like an unclassifiable row, and BEFORE
            // the market is marked as touched: for the "all" timeframe the minimum
            // event time becomes the fold's window start and this method's candle
            // `from` bound, so one bad row would otherwise poison both. Guard the
            // string too — Number("") and Number(" ") are 0, a silent 1970 fill.
            const rawTs = f.timestamp;
            if (rawTs == null || String(rawTs).trim() === "")
                continue;
            const tsMs = Number(rawTs) * 1000;
            if (!Number.isFinite(tsMs))
                continue;
            const d = this.decimalsOf(t);
            touched.set(t.symbol, t);
            events.push({
                kind: "trade",
                timestamp: tsMs,
                market: t.symbol,
                side: (isTaker ? takerIsBid : !takerIsBid) ? "buy" : "sell",
                baseAmount: Structs.toHumanNum(f.quantity, d.amount),
                quoteAmount: Structs.toHumanNum(f.quoteQuantity, d.price),
            });
        }
        // Caller-supplied funding joins before the window is derived, so an "all"
        // window opens at the wallet's first capital movement rather than its first
        // trade — a deposit that preceded any trade is the real start of the
        // history. The kernel reads these for the capital base only.
        //
        // Bridge legs between this exchange's OWN chains are not capital movements:
        // a transfer from one configured chain to another leaves the account's
        // capital where it was. They are paired and dropped here, before the kernel
        // sees a flow list, so a rebalance never reads as a withdrawal on one chain
        // and a deposit on the other. An unpaired leg stays in the base as capital in
        // transit; a leg to a chain outside this exchange stays an external flow.
        //
        // Pushed one at a time, not spread: a spread passes every movement as a separate
        // argument, so a large caller-supplied funding history exceeds the JS argument
        // limit and throws. Netting decides WHICH movements survive; the loop decides how
        // many the push can physically take.
        if (params.funding) {
            for (const movement of PortfolioAnalytics.netInternalTransfers(params.funding, this.chainIds)) {
                events.push(movement);
            }
        }
        // Marks: candle closes per touched market at the timeframe's bucket,
        // reaching back to the window start (or the first event for "all").
        let bucketSec = 86_400;
        if (timeframe === "24h")
            bucketSec = 3600;
        else if (timeframe === "7d")
            bucketSec = 14_400;
        let firstEventMs = asOf;
        if (events.length > 0) {
            firstEventMs = Number.POSITIVE_INFINITY;
            for (const event of events)
                firstEventMs = Math.min(firstEventMs, event.timestamp);
        }
        const windowStartMs = timeframe === "all"
            ? firstEventMs
            : asOf - { "24h": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000 }[timeframe];
        const series = new Map();
        const lastPrice = new Map();
        await Promise.all([...touched.values()].map(async (t) => {
            const d = this.decimalsOf(t);
            const rows = await this.engineOf(t).getCandles(t.pool, bucketSec, {
                from: Math.floor(windowStartMs / 1000) - bucketSec,
                limit: 1000,
            });
            series.set(t.symbol, rows.map((c) => [Number(c.bucketStart) * 1000, this.priceView(t, c.closePrice, d.price)]));
            if (t.market.lastPrice != null) {
                lastPrice.set(t.symbol, this.priceView(t, t.market.lastPrice, d.price));
            }
        }));
        return PortfolioAnalytics.computePortfolioAnalytics(events, {
            timeframe,
            asOf,
            marks: { series, lastPrice },
            ...(params.sessionSince !== undefined ? { sessionSince: params.sessionSince } : {}),
            cexRateBps: params.cexRateBps ?? PortfolioAnalytics.DEFAULT_CEX_RATE_BPS,
        });
    }
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
    async fetchMyTrades(ref, since, limit = 50, filter = {}) {
        const closed = this.closeController.signal;
        const addr = this.requireAddress("fetchMyTrades");
        await this.loadMarketsFor(filter.chainId);
        const t = ref ? this.market(ref) : undefined;
        // Scoped: the market's chain only. Unscoped: every chain, each paged to its
        // own `limit`, then merged newest-first and cut to `limit`.
        const engines = this.indexedEngines(this.readEngines(t, filter.chainId));
        const unscoped = !t && filter.chainId === undefined;
        const perChain = await this.perChain(engines, (chainId, engine) => this.fetchMyTradesOn(chainId, engine, addr, t, since, limit, closed), unscoped);
        if (engines.length === 1)
            return perChain[0] ?? [];
        return perChain
            .flat()
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    /** One chain's page of {@link fetchMyTrades}. */
    async fetchMyTradesOn(chainId, engine, addr, t, since, limit, closed) {
        // Scoped by MARKET id: a binary pool is recycled across successive markets,
        // so a pool scope would return every life of the pool, not the asked-for
        // market. A binary tradable's YES and NO legs share one market, so the scope
        // returns both legs and the per-row side view below puts each on its own
        // tradable. On spot/perp the pool address IS the market id.
        const market = t?.market.id;
        // `since` is milliseconds on this surface (UnifiedTrade.timestamp is ms, and
        // callers pass Date.now()); the fill query filters on unix SECONDS. Passing
        // ms straight through would select nothing at all — a silent empty result.
        const sinceSec = since === undefined ? undefined : Math.floor(since / 1000);
        const out = [];
        const page = Math.max(limit, TRADE_PAGE);
        // Bounded: every iteration either fills the quota or advances `offset` by a
        // full page, and a short page means the tape is exhausted. The budget caps
        // the pathological case where nothing resolves (e.g. an empty registry).
        for (let offset = 0, pages = 0; out.length < limit && pages < MAX_TRADE_PAGES; pages++) {
            const rows = await engine.getUserFills(addr, {
                ...(market ? { market } : {}),
                ...(sinceSec !== undefined ? { since: sinceSec } : {}),
                limit: page,
                offset,
            });
            await this.ensureResolvable(chainId, engine, rows.map((row) => row.market), closed);
            for (const row of rows) {
                if (out.length >= limit)
                    break;
                const trade = this.fillToUnifiedTrade(chainId, row, t);
                if (trade)
                    out.push(trade);
            }
            if (rows.length < page)
                break; // tape exhausted
            offset += rows.length;
        }
        return out;
    }
    /**
     *  One fill row through the asking tradable's lens, or null when the row's
     *  market is not in the registry or falls outside `scope`.
     *
     *  Binary rows carry the account's YES/NO side, which selects the outcome
     *  tradable — and NO mirrors both price and side, so both go through
     *  {@link priceView} / {@link sideView} rather than being read raw.
     */
    fillToUnifiedTrade(chainId, row, scope) {
        const account = this.walletAddress?.toLowerCase();
        const asMaker = (row.maker ?? "").toLowerCase() === account;
        // The taker's ORDER is authoritative: `row.takerSide` is a denormalized copy
        // the binary taker-bridge backfills after BinaryOrderPlaced, so it can be
        // null on a row whose taker is already stamped. Reading it alone sends such
        // a fill to the default (YES) leg — a NO buy at 0.38 reported as YES at
        // 0.62, and invisible to a #NO-scoped call.
        const side = asMaker ? row.makerSide : (row.takerOrder?.side ?? row.takerSide);
        const rt = this.resolveRowTradable(chainId, row.market, row.pool, side);
        if (!rt)
            return null;
        if (scope && rt.market.id.toLowerCase() !== scope.market.id.toLowerCase())
            return null;
        if (scope?.outcome && rt.outcome !== scope.outcome)
            return null;
        const d = this.decimalsOf(rt);
        const binary = rt.market.marketType === "BINARY";
        const price = binary ? this.priceView(rt, row.fillPrice, d.price) : Structs.toHumanNum(row.fillPrice, d.price);
        const amount = Structs.toHumanNum(row.quantity, d.amount);
        // Binary has no quote-quantity of its own on the tape (the row is priced in
        // YES terms), so cost is derived; spot/perp carry the executed quote value.
        const cost = binary ? price * amount : Structs.toHumanNum(row.quoteQuantity, d.price);
        const tsMs = Number(row.timestamp) * 1000;
        return {
            id: row.id,
            blockNumber: Structs.tradeBlockNumber(row.blockNumber, row.logIndex),
            logIndex: row.logIndex,
            symbol: rt.symbol,
            chainId,
            price,
            amount,
            cost,
            side: binary ? this.sideView(rt, side ?? undefined) : this.takerSideView(row, asMaker),
            txHash: row.txHash,
            timestamp: tsMs,
            datetime: Structs.toDatetime(tsMs),
            info: row,
        };
    }
    /** Spot/perp direction FROM THIS ACCOUNT's seat: the maker is the taker's mirror. */
    takerSideView(row, asMaker) {
        if (row.takerIsBid == null)
            return undefined;
        const bought = asMaker ? !row.takerIsBid : row.takerIsBid;
        return bought ? "buy" : "sell";
    }
    /**
     * Read the local chain-tail status without network requests.
     * "ok" means no watches are held or the tail is connected. "connecting" means
     * a watch is awaiting its first head. "error" means a previously live socket was lost
     * or the tail retains an operational failure.
     */
    async fetchStatus() {
        // The worst engine wins: one chain's lost socket is the exchange's status.
        // `info` is the PRIMARY engine's tail status; `byChain` carries every engine's.
        const byChain = {};
        let status = "ok";
        for (const [chainId, engine] of this.engines) {
            const s = engine.getLiveStatus();
            byChain[chainId] = s;
            // headBlock only ever ratchets up, so 0 with a watch active can only mean
            // "handshake not done yet" — a lost socket leaves the last head behind.
            let own = "ok";
            if (s.watchCount > 0 && !s.wsConnected)
                own = s.headBlock > 0 ? "error" : "connecting";
            if (s.failure)
                own = "error";
            if (own === "error" || (own === "connecting" && status === "ok"))
                status = own;
        }
        const primary = byChain[this.primary.config.chain.id] ?? unreachable("the primary engine was just read");
        return { status, updated: Date.now(), info: primary, byChain };
    }
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
    async fetchDataStatus() {
        const chains = [...this.engines];
        const suppliedFailures = new Map();
        const settled = await Promise.allSettled(chains.map(([chainId, engine]) => {
            const failures = new WeakSet();
            suppliedFailures.set(chainId, failures);
            const registered = this.freshnessReads.get(chainId);
            return registered && registered.selected === engine.getIndexerFreshness
                ? registered.read(chainId, (failure) => failures.add(failure))
                : engine.getIndexerFreshness(chainId);
        }));
        const indexerByChain = {};
        const indexerErrorByChain = {};
        settled.forEach((result, i) => {
            const [chainId] = chains[i] ?? unreachable("allSettled keeps one result per engine");
            if (result.status === "fulfilled")
                indexerByChain[chainId] = result.value;
            else
                indexerErrorByChain[chainId] = asDataStatusFailure(result.reason);
        });
        const primaryId = this.primary.config.chain.id;
        if (Object.keys(indexerByChain).length === 0) {
            const failure = indexerErrorByChain[primaryId] ?? unreachable("every chain failed, so the primary did");
            throw chains.length > 1 && !suppliedFailures.get(primaryId)?.has(failure)
                ? withChainId(failure, primaryId)
                : failure;
        }
        const status = {
            ...(await this.fetchStatus()),
            indexerByChain,
            prices: this.priceEngine().listPriceHealth(),
        };
        if (primaryId in indexerByChain)
            status.indexer = indexerByChain[primaryId] ?? null;
        if (Object.keys(indexerErrorByChain).length > 0)
            status.indexerErrorByChain = indexerErrorByChain;
        return status;
    }
    tryResolvePool(chainId, pool, side) {
        try {
            const base = this.registry.resolve({ chainId, id: pool });
            if (base.market.marketType !== "BINARY" || !side)
                return base;
            const outcome = side === "BUY_YES" || side === "SELL_YES" ? "YES" : "NO";
            return this.registry.resolve(`${base.marketSymbol}#${outcome}`);
        }
        catch {
            return null;
        }
    }
    tryResolveByMarketAddress(chainId, marketAddress, side, scope) {
        try {
            const base = this.registry.resolve({ chainId, id: marketAddress });
            if (scope && base.pool.toLowerCase() !== scope.pool.toLowerCase())
                return null;
            const rt = side ? this.tryResolvePool(chainId, base.pool, side) : base;
            if (!rt)
                return null;
            if (scope?.outcome && rt.outcome !== scope.outcome)
                return null;
            return rt;
        }
        catch {
            return null;
        }
    }
    // ------------------------------------------------------------- watch*
    /**
     *  Hold the ref-counted market watch behind a symbol (idempotent). Rejects
     *  with the release error if `unwatchMarket` or `close` released this
     *  acquisition while it hydrated: a rewatch after the release owns its own
     *  acquisition, and this call must not attach a channel to it.
     */
    async ensureWatch(t) {
        const held = this.watches.getOrCreate(t.marketSymbol, () => this.engineOf(t).watchMarket(t.pool));
        await held;
        if (this.watches.get(t.marketSymbol) !== held)
            throw releasedError(t.marketSymbol);
    }
    /**
     *  Streaming semantics: resolves with the channel's current value on first
     *  call, then each subsequent call resolves when the underlying (memoized)
     *  native ref CHANGES — reference equality is the change detector. A channel
     *  with a `marketSymbol` belongs to that market's watch and needs it held.
     */
    nextTick(key, marketSymbol, getNative, map) {
        // Released between ensureWatch() and this call: do not re-create the channel.
        if (marketSymbol !== undefined && !this.watches.get(marketSymbol)) {
            return Promise.reject(releasedError(marketSymbol));
        }
        this.ensureListener();
        const existing = this.channels.get(key);
        const ch = existing ?? { last: UNSET, waiters: [], getNative, map: map, marketSymbol };
        if (!existing)
            this.channels.set(key, ch);
        const current = getNative();
        if (ch.last === UNSET || !Object.is(current, ch.last)) {
            ch.last = current;
            return Promise.resolve(map(current));
        }
        return new Promise((resolve, reject) => ch.waiters.push({ resolve: resolve, reject }));
    }
    /** Remove the channels `drop` selects and reject their pending waits with the release error. */
    dropChannels(drop) {
        for (const [key, ch] of this.channels) {
            if (!drop(ch))
                continue;
            this.channels.delete(key);
            for (const w of ch.waiters.splice(0))
                w.reject(releasedError(ch.marketSymbol ?? key));
        }
    }
    ensureListener() {
        // Channels are fed by TWO stores — the order-book live tail and the price
        // feed — on independent transports. Either commit re-reads every waiting
        // channel; getNative()'s reference stays stable when nothing changed, so a
        // notification from the "wrong" store is a cheap no-op.
        const drain = () => {
            for (const ch of this.channels.values()) {
                if (ch.waiters.length === 0)
                    continue;
                const v = ch.getNative();
                if (Object.is(v, ch.last))
                    continue;
                ch.last = v;
                const mapped = ch.map(v);
                for (const w of ch.waiters.splice(0))
                    w.resolve(mapped);
            }
        };
        // Every engine's store and the price feed's: a commit on any chain re-reads
        // every waiting channel.
        this.unsubscribes ??= [
            ...[...this.engines.values()].map((engine) => engine.subscribeLive(drain)),
            this.priceEngine().subscribePrices(drain),
        ];
    }
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
    async watchOrderBook(ref, limit = 10) {
        const t = this.requireLive(this.market(ref), "watchOrderBook");
        await this.ensureWatch(t);
        const engine = this.engineOf(t);
        return this.nextTick(`ob:${t.symbol}:${limit}`, t.marketSymbol, () => t.market.marketType === "BINARY"
            ? engine.getLiveBinaryOrderBook(t.pool, { depth: limit })
            : engine.getLiveSpotOrderBook(t.pool, { depth: limit }), (native) => ({
            symbol: t.symbol,
            chainId: t.chainId,
            ...this.bookView(t, native),
            ...(native.blockNumber === undefined ? {} : { blockNumber: native.blockNumber }),
            timestamp: Date.now(),
            info: native,
        }));
    }
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
    async watchTrades(ref, limit = 50) {
        const t = this.requireLive(this.market(ref), "watchTrades");
        await this.ensureWatch(t);
        const d = this.decimalsOf(t);
        const engine = this.engineOf(t);
        return this.nextTick(`tr:${t.symbol}:${limit}`, t.marketSymbol, () => engine.getLiveFills(t.pool, { limit }), (fills) => fills.map((f) => {
            const price = this.priceView(t, f.fillPrice, d.price);
            const amount = Structs.toHumanNum(f.quantity, d.amount);
            const tsMs = Number(f.timestamp) * 1000;
            // Binary tradables view the side through the outcome lens; spot (and
            // perp) take the taker's book direction straight off the fill.
            let side;
            if (t.market.marketType === "BINARY")
                side = this.sideView(t, f.takerSide);
            else if (f.takerIsBid !== undefined)
                side = f.takerIsBid ? "buy" : "sell";
            return {
                id: f.id,
                blockNumber: Structs.tradeBlockNumber(f.blockNumber, f.logIndex),
                logIndex: f.logIndex,
                symbol: t.symbol,
                chainId: t.chainId,
                price,
                amount,
                cost: price * amount,
                side,
                txHash: f.txHash,
                timestamp: tsMs,
                datetime: Structs.toDatetime(tsMs),
                info: f,
            };
        }));
    }
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
    async watchOrders(ref, limit = 100) {
        const t = this.requireLive(this.market(ref), "watchOrders");
        const addr = this.requireAddress("watchOrders");
        await this.ensureWatch(t);
        const d = this.decimalsOf(t);
        const engine = this.engineOf(t);
        return this.nextTick(`ord:${t.symbol}:${addr}`, t.marketSymbol, () => engine.getLiveUserOrders(t.pool, addr, { limit }), (orders) => orders
            .filter((o) => {
            if (t.market.marketType !== "BINARY" || !t.outcome)
                return true;
            if (!o.side)
                return true;
            const oc = o.side === "BUY_YES" || o.side === "SELL_YES" ? "YES" : "NO";
            return oc === t.outcome;
        })
            .map((o) => {
            const tsMs = Number(o.createdAt) * 1000;
            let side;
            if (t.market.marketType === "BINARY")
                side = this.sideView(t, o.side) ?? "buy";
            else
                side = o.isBid ? "buy" : "sell";
            return {
                id: o.orderId,
                symbol: t.symbol,
                chainId: t.chainId,
                side,
                price: this.priceView(t, o.price, d.price),
                amount: Structs.toHumanNum(o.fullQuantity, d.amount),
                filled: Structs.toHumanNum(o.filledQuantity, d.amount),
                remaining: Structs.toHumanNum(o.quantityRemaining, d.amount),
                status: Structs.toUnifiedStatus(o.status),
                timestamp: tsMs,
                datetime: Structs.toDatetime(tsMs),
                info: o,
            };
        }));
    }
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
    async watchMyTrades(ref, limit = 50) {
        const t = this.requireLive(this.market(ref), "watchMyTrades");
        const addr = this.requireAddress("watchMyTrades");
        await this.ensureWatch(t);
        const d = this.decimalsOf(t);
        const lcAddr = addr.toLowerCase();
        const engine = this.engineOf(t);
        return this.nextTick(`mytr:${t.symbol}:${addr}`, t.marketSymbol, () => engine.getLiveUserFills(t.pool, addr, { limit }), (fills) => fills.map((f) => {
            const price = this.priceView(t, f.fillPrice, d.price);
            const amount = Structs.toHumanNum(f.quantity, d.amount);
            const tsMs = Number(f.timestamp) * 1000;
            let mySide;
            if (f.taker?.toLowerCase() === lcAddr)
                mySide = f.takerSide;
            else if (f.maker?.toLowerCase() === lcAddr)
                mySide = f.makerSide;
            return {
                id: f.id,
                blockNumber: Structs.tradeBlockNumber(f.blockNumber, f.logIndex),
                logIndex: f.logIndex,
                symbol: t.symbol,
                chainId: t.chainId,
                price,
                amount,
                cost: price * amount,
                side: this.sideView(t, mySide),
                timestamp: tsMs,
                datetime: Structs.toDatetime(tsMs),
                info: f,
            };
        }));
    }
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
    async unwatchMarket(ref) {
        const marketSymbol = this.releaseKeyOf(ref);
        const held = this.watches.get(marketSymbol);
        this.watches.delete(marketSymbol);
        this.dropChannels((ch) => ch.marketSymbol === marketSymbol);
        // Stops only THIS acquisition's handle. A rewatch holds its own live-tail reference.
        await held?.then((h) => h.stop()).catch(() => undefined);
    }
    /**
     *  The watch-cache key for a release. A symbol string that no longer resolves
     *  is split into its market symbol. An on-chain ref that does not resolve
     *  names no symbol, so its error propagates rather than releasing nothing.
     */
    releaseKeyOf(ref) {
        try {
            return this.market(ref).marketSymbol;
        }
        catch (e) {
            if (typeof ref !== "string" || Symbols.isChainRef(ref))
                throw e;
            return Symbols.splitSymbol(ref).marketSymbol;
        }
    }
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
    async watchUser(filter = {}) {
        const addr = this.requireAddress("watchUser");
        const engines = this.indexedEngines(this.readEngines(undefined, filter.chainId));
        // Every chain opens at once. On a failure, wait for all of them to settle so
        // a late success is stopped too, then throw the failure of the first failing
        // chain in binding order, whatever order the chains finished in.
        const settled = await Promise.allSettled(engines.map(([, engine]) => engine.watchUser(addr)));
        const opened = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
        const failedAt = settled.findIndex((r) => r.status === "rejected");
        const failed = settled[failedAt];
        if (failed?.status === "rejected") {
            for (const h of opened)
                h.stop();
            const unscoped = filter.chainId === undefined && this.engines.size > 1;
            const chainId = engines[failedAt]?.[0] ?? unreachable("a settled watch has its chain");
            throw engines.length > 1 || unscoped ? withChainId(failed.reason, chainId) : failed.reason;
        }
        return compositeHandle(opened);
    }
    // ------------------------------------------------------------- bridge + funding
    accountsInstance = null;
    /**
     *  The smart-accounts surface across this exchange's chains: derive the one
     *  address, scan every covered chain, fan one signed authorization out into
     *  per-chain creation calls, and build the multi-chain account the exchange
     *  trades through. See {@link ExchangeSmartAccounts}; the one-chain surface
     *  is `client.accounts`.
     */
    get accounts() {
        this.accountsInstance ??= ExchangeAccounts.createExchangeSmartAccounts({
            chainIds: () => this.chainIds,
            engineFor: (chainId) => this.engineFor(chainId),
        });
        return this.accountsInstance;
    }
    bridgeInstance = null;
    /** Aborted by `close()` to end every delivery wait, then replaced so the instance stays usable. */
    closeController = new AbortController();
    /**
     *  Funding state per (account, chainId, token address), in memory on this
     *  instance only (SDK-ARCH-002). `tail` settles when the current funding turn
     *  for the key ends. `pending` holds bridge legs that timed out before delivery.
     */
    // ponytail: entries are never removed; one per key the account has funded, so tiny.
    funding = new Map();
    collateralReadFailures = Object.freeze({});
    /**
     * Failed reads from the last completed collateral balance sweep, keyed by chain.
     * Available after `createOrder` checks or `ensureFunds`, including successful
     * bridge plans. Empty before the first sweep and after a complete successful read.
     * Target-chain failures throw and leave this snapshot unchanged. Concurrent
     * sweeps replace it in completion order; a shortfall error retains its own snapshot.
     */
    get collateralReadErrors() {
        return this.collateralReadFailures;
    }
    /**
     *  The bridge between this exchange's chains, through the account's
     *  executors: plan a transfer, or execute one and wait for it to land.
     *  See {@link ExchangeBridge}.
     */
    get bridge() {
        this.bridgeInstance ??= this.newBridge(() => this.closeController.signal);
        return this.bridgeInstance;
    }
    /**
     *  The exchange bridge, with the close signal its transfers read. A caller
     *  whose captured signal is still the live one reuses the shared instance,
     *  which reads that same signal: `bridge` stays the single send path.
     */
    bridgeWith(closed) {
        if (closed() === this.closeController.signal)
            return this.bridge;
        return this.newBridge(closed);
    }
    /** A bridge bound to one close signal. */
    newBridge(closed) {
        return ExchangeBridge.createExchangeBridge({
            chainIds: () => this.chainIds,
            engineFor: (chainId) => this.engineFor(chainId),
            executorFor: (chainId) => this.traderFor(chainId).executor,
            account: () => this.requireAddress("bridge"),
            closed,
        });
    }
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
    async ensureFunds(params, options = {}) {
        // Read once, now: a close() while this call waits in the queue ends its waits too.
        const closed = this.closeController.signal;
        const addr = this.requireAddress("ensureFunds");
        // Not the bounded implicit load: a stale registry would make the token lookup below
        // report a missing code instead of the chain's recorded load failure.
        await this.loadMarkets();
        const token = this.tokenForCode(params.code, params.chainId);
        if (!token) {
            // Nothing on that chain carries the code, so this sweep reads nothing.
            this.collateralReadFailures = Object.freeze({});
            if (params.amount <= 0n)
                return null;
            throw new InvalidInputError(`no token on chain ${params.chainId} carries the code ${params.code}`);
        }
        const target = { chainId: params.chainId, token, code: params.code };
        const turn = await this.fundingTurn(addr, params.chainId, token);
        try {
            return await this.fundOn(turn.pending, target, params.amount, addr, options, closed);
        }
        finally {
            turn.release();
        }
    }
    /**
     *  Wait until every earlier funding turn for the same (account, chainId, token)
     *  has ended. Resolves with that key's pending legs and a `release` that ends
     *  this turn. The caller must call `release` exactly once.
     */
    // ponytail: one turn at a time per key, held through the delivery wait and, for
    // an auto-funded order, its placement. Split the turn if one key needs throughput.
    async fundingTurn(addr, chainId, token) {
        const key = `${addr.toLowerCase()}:${chainId}:${token.toLowerCase()}`;
        const slot = this.funding.get(key) ?? { tail: Promise.resolve(), pending: [] };
        this.funding.set(key, slot);
        const earlier = slot.tail;
        let release = () => undefined;
        slot.tail = new Promise((resolve) => {
            release = resolve;
        });
        await earlier;
        return { pending: slot.pending, release };
    }
    /**
     *  `ensureFunds` for a token already resolved by address, inside its funding
     *  turn. On a shortfall, each pending leg is waited on and the balance is read
     *  again, so a pending amount is part of that balance and is never bridged
     *  again. `closed` is the close signal as it was when the caller started.
     */
    async fundOn(pending, target, amount, addr, options, closed) {
        let holdings = await this.holdingsOf(target, addr);
        if (holdings.held >= amount)
            return null;
        if (pending.length > 0) {
            // A copy: a delivered leg leaves `pending` inside the loop.
            for (const sent of pending.slice()) {
                const landed = await ExchangeBridge.awaitSentMessage(this.engineFor(target.chainId).getViemClient(), sent, options.deliveryTimeoutMs, closed);
                if (!landed)
                    throw deliveryTimeout(sent);
                pending.splice(pending.indexOf(sent), 1);
            }
            holdings = await this.holdingsOf(target, addr);
            if (holdings.held >= amount)
                return null;
        }
        const { held, elsewhere, readErrors, route } = holdings;
        const shortfall = amount - held;
        // Failed reads remain observable through collateralReadErrors.
        const plan = this.bridgePlanFor(route, target.chainId, shortfall, elsewhere, addr);
        if (!plan) {
            throw new CollateralOnWrongChainError({
                chainId: target.chainId,
                token: target.token,
                code: target.code,
                needed: amount,
                held,
                elsewhere,
                readErrors,
                symbol: target.code,
            });
        }
        const result = await this.bridgeWith(() => closed).transfer({ token: plan.origin.token, from: plan.origin.chainId, to: target.chainId, amount: plan.amount, recipient: addr }, options);
        if (!result.delivered) {
            pending.push(result);
            throw deliveryTimeout(result);
        }
        return result;
    }
    /** The token a currency code names on one chain: the native coin, the bridge registry's token, or a listed market's. */
    tokenForCode(code, chainId) {
        if (this.engineFor(chainId).config.chain.nativeCurrency.symbol === code)
            return zeroAddress;
        const bridged = ExchangeBridge.bridgeTokenForCode(code);
        const registered = bridged ? BridgeRegistry.getBridgeToken(bridged, chainId) : null;
        if (registered)
            return registered.address ? Markets.lower0x(registered.address) : zeroAddress;
        return [...this.currencies.values()].find((c) => c.chainId === chainId && c.code === code)?.token;
    }
    /**
     *  The account's raw balance of a token on one chain, found by ADDRESS (the
     *  zero address is the native coin). With `everywhere`, also the bridge route
     *  the registry lists for that address, and the balance of the route's token
     *  on every other configured chain the registry lists it on. A token the
     *  registry does not list has no route and no other-chain reads, whatever
     *  its code.
     */
    async holdingsOf(target, addr, scope = "everywhere") {
        const read = (on, token) => {
            const engine = this.engineFor(on);
            return token === zeroAddress ? engine.getNativeBalance(addr) : engine.getErc20Balance(token, addr);
        };
        const held = await read(target.chainId, target.token);
        // The registry entry on this chain whose address IS the token (a native
        // route has no address, so the zero address matches it).
        const lc = Markets.lower0x(target.token);
        const route = scope === "everywhere"
            ? BridgeRegistry.listBridgeTokens(target.chainId).find((t) => Markets.lower0x(t.address ?? zeroAddress) === lc)
                ?.token
            : undefined;
        const elsewhere = {};
        // Keep failed reads distinct from zero balances (SDK-IO-002).
        const readErrors = {};
        if (route) {
            await Promise.all(this.chainIds
                .filter((c) => c !== target.chainId)
                .map(async (c) => {
                const counterpart = BridgeRegistry.getBridgeToken(route, c);
                if (!counterpart)
                    return;
                const there = await read(c, counterpart.address ?? zeroAddress).catch((error) => {
                    if (error instanceof NotConfiguredError ||
                        error instanceof RpcError ||
                        error instanceof ContractRevertError) {
                        readErrors[c] = error;
                    }
                    else {
                        readErrors[c] = new RpcError("holdingsOf", `Balance read failed on chain ${c}`, { cause: error });
                    }
                    return null;
                });
                if (there !== null)
                    elsewhere[c] = there;
            }));
        }
        this.collateralReadFailures = Object.freeze(readErrors);
        return { held, elsewhere, readErrors: this.collateralReadFailures, route };
    }
    /** A bridge plan covering `amount` of the `token` route onto `chainId` from the richest other chain, when a route exists. */
    bridgePlanFor(token, chainId, amount, elsewhere, recipient) {
        if (!token)
            return undefined;
        const richest = Object.entries(elsewhere)
            .map(([c, v]) => ({ chainId: Number(c), balance: v }))
            .filter((e) => e.balance >= amount)
            .sort((a, b) => {
            if (b.balance > a.balance)
                return 1;
            if (b.balance < a.balance)
                return -1;
            return 0;
        })[0];
        if (!richest)
            return undefined;
        try {
            return this.bridge.plan({ token, from: richest.chainId, to: chainId, amount, recipient });
        }
        catch {
            // No route between those two chains for this token: the caller gets the
            // shortfall without a plan, which is the documented "no route" shape.
            return undefined;
        }
    }
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
    async escrowOf(t, side, quantity, limitPrice, builderFeeBpsTimes1k, owner) {
        const m = t.market;
        if (m.marketType === "PERP")
            return null;
        // Integer math from here on: a float product of the human amount and price
        // is not the pool's number (SDK-TYPE-007).
        const priceRaw = Structs.toRaw(limitPrice, m.quoteDecimals);
        if (m.marketType === "BINARY") {
            if (side === "sell")
                return null;
            // A buy escrows the pool's commitment — `Writer.bidCommitment`, the one
            // definition the writer's escrow() uses too: ceil principal plus the
            // builder fee's ceil-rounded headroom, both of which the pool pulls. The
            // NO price the caller quotes is already the NO cost, so it is the unit
            // price directly (escrow() recovers the same value from the YES-equivalent
            // price it is handed for BUY_NO).
            return {
                chainId: t.chainId,
                token: m.collateral,
                code: this.codeOf(t.chainId, m.collateral),
                needed: Writer.bidCommitment(quantity, priceRaw, 10n ** BigInt(m.quoteDecimals), builderFeeBpsTimes1k),
            };
        }
        // A spot order is sized by the pool, the same read the writer makes: `delta`
        // is the fee-inclusive requirement net of the owner's vault balance, and it
        // is what the pool pulls from the wallet (or takes as msg.value on a
        // native-base sell).
        const engine = this.engineOf(t);
        const req = await engine.getAutoPullRequirement({
            pool: t.pool,
            owner,
            isBid: side === "buy",
            price: priceRaw,
            quantity,
            ...(builderFeeBpsTimes1k === undefined ? {} : { builderFeeBpsTimes1k }),
        });
        if (req.delta === 0n)
            return null;
        let code;
        if (side === "buy")
            code = m.quoteSymbol ?? this.codeOf(t.chainId, m.quoteToken);
        else if (m.baseIsNative)
            code = engine.config.chain.nativeCurrency.symbol;
        else
            code = m.baseSymbol ?? this.codeOf(t.chainId, m.baseToken);
        return {
            chainId: t.chainId,
            // The pool reports its NATIVE_TOKEN sentinel for a native-base sell.
            token: side === "sell" && m.baseIsNative ? zeroAddress : Markets.lower0x(req.inputToken),
            code,
            needed: req.delta,
            vault: { requiredAmount: req.requiredAmount },
        };
    }
    /**
     *  The collateral-placement check before an order is encoded: explicit by
     *  default (throw with a plan), automatic on request (bridge, wait, continue),
     *  or skipped. Resolves with a release that `createOrder` calls once the order
     *  is sent or has failed. An auto-funded order holds its funding turn until
     *  then, so a concurrent one reads the balance after this order took its escrow.
     */
    async placeCollateral(t, side, quantity, limitPrice, params) {
        const nothing = () => undefined;
        // Read once, now: a close() while this order waits in the funding queue ends its waits too.
        const closed = this.closeController.signal;
        // On a single-chain exchange there is nowhere else the collateral could be,
        // so the default keeps that path at its single round-trip; the check is the
        // default only once the exchange spans a second chain.
        const mode = params.funding ?? (this.engines.size > 1 ? "explicit" : "skip");
        if (mode === "skip")
            return nothing;
        const addr = this.requireAddress("createOrder");
        const escrow = await this.escrowOf(t, side, quantity, limitPrice, params.builderFeeBpsTimes1k, addr);
        if (!escrow)
            return nothing;
        if (mode === "auto") {
            const turn = await this.fundingTurn(addr, t.chainId, escrow.token);
            try {
                // One balance read on the happy path: the market's chain only. A spot
                // pool's vault mode is read beside it, not after it.
                const [here, manualVault] = await Promise.all([
                    this.holdingsOf(escrow, addr, "here"),
                    escrow.vault ? this.engineOf(t).getManualVaultMode({ pool: t.pool, user: addr }) : false,
                ]);
                // In manual vault mode the pool never pulls from the wallet, so neither
                // the wallet nor a bridge can fund the shortfall: only a vault deposit can.
                if (escrow.vault && manualVault) {
                    throw new CollateralOnWrongChainError({
                        chainId: t.chainId,
                        token: escrow.token,
                        code: escrow.code,
                        needed: escrow.vault.requiredAmount,
                        held: escrow.vault.requiredAmount - escrow.needed,
                        elsewhere: {},
                        symbol: t.symbol,
                    });
                }
                if (here.held < escrow.needed)
                    await this.fundOn(turn.pending, escrow, escrow.needed, addr, {}, closed);
            }
            catch (e) {
                turn.release();
                throw e;
            }
            return turn.release;
        }
        // One balance read on the happy path: the market's chain only. The other
        // chains are consulted only once there is a shortfall to locate. A spot
        // pool's vault mode is read beside it, not after it.
        const [here, manualVault] = await Promise.all([
            this.holdingsOf(escrow, addr, "here"),
            escrow.vault ? this.engineOf(t).getManualVaultMode({ pool: t.pool, user: addr }) : false,
        ]);
        // In manual vault mode the pool never pulls from the wallet, so neither the
        // wallet nor a bridge can fund the shortfall: only a vault deposit can.
        if (escrow.vault && manualVault) {
            throw new CollateralOnWrongChainError({
                chainId: t.chainId,
                token: escrow.token,
                code: escrow.code,
                needed: escrow.vault.requiredAmount,
                held: escrow.vault.requiredAmount - escrow.needed,
                elsewhere: {},
                symbol: t.symbol,
            });
        }
        if (here.held >= escrow.needed)
            return nothing;
        const { held, elsewhere, readErrors, route } = await this.holdingsOf(escrow, addr);
        throw new CollateralOnWrongChainError({
            chainId: t.chainId,
            token: escrow.token,
            code: escrow.code,
            needed: escrow.needed,
            held,
            elsewhere,
            readErrors,
            plan: this.bridgePlanFor(route, t.chainId, escrow.needed - held, elsewhere, addr),
            symbol: t.symbol,
        });
    }
    // ------------------------------------------------------------- price feeds
    /** Hold the ref-counted price watch behind an asset (idempotent). */
    async ensurePriceWatch(asset) {
        const key = asset.toUpperCase();
        await this.priceWatches.getOrCreate(key, () => this.priceEngine().watchPrice(key));
    }
    toUnifiedPrice(asset, live) {
        if (!live)
            return null;
        const tsMs = live.blockTimestamp * 1000;
        return {
            symbol: asset.toUpperCase(),
            price: live.price,
            ema: live.ema,
            timestamp: tsMs,
            datetime: Structs.toDatetime(tsMs),
            info: live,
        };
    }
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
    async watchPrice(asset) {
        const key = asset.toUpperCase();
        await this.ensurePriceWatch(key);
        return this.nextTick(`px:${key}`, undefined, () => this.priceEngine().getLivePrice(key), (live) => this.toUnifiedPrice(key, live) ?? {
            symbol: key,
            price: 0,
            ema: 0,
            timestamp: Date.now(),
            datetime: Structs.toDatetime(Date.now()),
            info: null,
        });
    }
    /**
     *  One-shot current price (indexer HTTP read; no watch needed), or null if the
     *  feed has no observations yet.
     */
    async fetchPrice(asset) {
        const live = await this.priceEngine().fetchPrice(asset);
        return this.toUnifiedPrice(asset, live);
    }
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
    async fetchPriceOHLCV(asset, timeframe = "1m", since, limit = 500) {
        const resolution = PRICE_TIMEFRAMES[timeframe] ?? timeframe;
        if (!VALID_RESOLUTIONS.has(resolution)) {
            throw new InvalidInputError(`unknown price timeframe ${timeframe} (have: ${Object.keys(PRICE_TIMEFRAMES).join(" ")})`);
        }
        const rows = await this.priceEngine().fetchPriceCandles(asset, resolution, {
            limit,
            from: since ? Math.floor(since / 1000) : undefined,
        });
        return rows.map((c) => [c.bucketStart * 1000, c.open, c.high, c.low, c.close, c.count]);
    }
    // ------------------------------------------------------------- writes
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
    async createOrder(ref, type, side, amount, price, params = {}) {
        const t = this.requireLive(this.market(ref), "createOrder");
        await this.requireCurrentBinaryGeneration(t);
        const d = this.decimalsOf(t);
        // Align to the venue's grids HERE, before the market-kind branch: all three
        // branches read these two values, so one guard covers binary, spot and perp.
        // The pool rejects an off-lot quantity (`InvalidQuantity`) or an off-tick
        // price (`InvalidPrice`), and a caller has no way to know the grid without
        // asking us. Aligning a value already on the grid returns it unchanged, so a
        // caller who pre-snapped with the helpers sees exactly what they sent.
        const lotRaw = this.lotOf(t, "createOrder");
        // floorToRaw, not toRaw: toRaw rounds half-up to the token's decimals, so an
        // amount with more digits than the token has could arrive here ABOVE what the
        // caller asked for and already on the grid — 1.2349995 on a 6-dp/0.001-lot
        // market would go out as 1.235. A quantity always rounds down.
        const quantity = (Structs.floorToRaw(amount, d.amount) / lotRaw) * lotRaw;
        if (quantity <= 0n) {
            // One lot is also the venue's `minQuantity`: every deployed venue sets
            // tick = lot = min = 10**(collateralDecimals-3) (see the `_note` in
            // deployments/<chain>/<env>/venues.json), so this threshold is exactly the
            // venue's own and there is no band where an order passes here and still
            // reverts as below-minimum.
            throw new InvalidInputError(`amount ${amount} is below one lot on ${t.symbol} (lot ${Structs.toHumanNum(lotRaw, d.amount)}) — ` +
                `it would place a zero-quantity order`);
        }
        let limitPrice = price;
        if (type === "market") {
            limitPrice = await this.crossingPrice(t, side, params.slippage ?? 0.01);
        }
        if (limitPrice === undefined) {
            throw new InvalidInputError("a limit order needs a price");
        }
        // A buy must not be pushed UP and a sell must not be pushed DOWN — rounding
        // the wrong way costs the caller money on one of the two sides. A market
        // order's price already came back aligned from `crossingPrice` (rounded the
        // other way, so it still crosses), and re-aligning it is identity.
        limitPrice = Structs.snapToGrid(limitPrice, this.tickOf(t, "createOrder"), d.price, {
            direction: side === "buy" ? "down" : "up",
            clamp: t.market.marketType === "BINARY",
        });
        let orderType = Trade.ORDER_TYPE.LIMIT;
        if (type === "market")
            orderType = Trade.ORDER_TYPE.MARKET;
        else if (params.postOnly || params.timeInForce === "PO")
            orderType = Trade.ORDER_TYPE.POST_ONLY;
        else if (params.timeInForce === "FOK")
            orderType = Trade.ORDER_TYPE.FILL_OR_KILL;
        else if (params.timeInForce === "IOC")
            orderType = Trade.ORDER_TYPE.MARKET;
        // Collateral must sit on the market's chain. Checked here, after the grid
        // alignment and before anything is encoded, so a shortfall never reaches a
        // pool as a revert and the caller learns where the funds are instead.
        const release = await this.placeCollateral(t, side, quantity, limitPrice, params);
        let result;
        try {
            if (t.market.marketType === "BINARY") {
                const yesish = t.outcomeIndex !== 1;
                let binarySide;
                if (yesish)
                    binarySide = side === "buy" ? "BUY_YES" : "SELL_YES";
                else
                    binarySide = side === "buy" ? "BUY_NO" : "SELL_NO";
                result = await this.traderOf(t).placeOrder({
                    pool: t.pool,
                    side: binarySide,
                    price: this.toNativePrice(t, limitPrice),
                    quantity,
                    orderType,
                    builder: params.builder,
                    builderFeeBpsTimes1k: params.builderFeeBpsTimes1k,
                });
            }
            else if (t.market.marketType === "PERP") {
                result = await this.traderOf(t).placePerpOrder({
                    pool: t.pool,
                    isBid: side === "buy",
                    price: Structs.toRaw(limitPrice, d.price),
                    quantity,
                    orderType,
                    builder: params.builder,
                    builderFeeBpsTimes1k: params.builderFeeBpsTimes1k,
                });
            }
            else {
                const s = t.market;
                result = await this.traderOf(t).placeSpotOrder({
                    pool: t.pool,
                    isBid: side === "buy",
                    price: Structs.toRaw(limitPrice, d.price),
                    quantity,
                    baseDecimals: s.baseDecimals,
                    quoteToken: s.quoteToken,
                    baseToken: s.baseToken,
                    baseIsNative: s.baseIsNative,
                    orderType,
                    builder: params.builder,
                    builderFeeBpsTimes1k: params.builderFeeBpsTimes1k,
                });
            }
        }
        finally {
            release();
        }
        const filledRaw = result.fills.reduce((acc, f) => acc + f.quantityFilled, 0n);
        const filled = Structs.toHumanNum(filledRaw, d.amount);
        // Against the ALIGNED quantity, not the caller's: that is what was placed, so
        // it is what `filled` is a fraction of. Using the caller's number here would
        // report a phantom remainder for an amount that aligned down, and `status`
        // reads off `remaining` — an order that fully filled would look still-open.
        const placedAmount = Structs.toHumanNum(quantity, d.amount);
        const remaining = Math.max(0, placedAmount - filled);
        const rests = orderType === Trade.ORDER_TYPE.LIMIT || orderType === Trade.ORDER_TYPE.POST_ONLY;
        const now = Date.now();
        let status = "canceled";
        if (remaining <= 0)
            status = "closed";
        else if (rests && result.orderId !== undefined)
            status = "open";
        return {
            id: result.orderId?.toString() ?? result.hash,
            symbol: t.symbol,
            chainId: t.chainId,
            type,
            side,
            price: limitPrice,
            amount: placedAmount,
            filled,
            remaining,
            // fully filled → closed; resting remainder → open; IOC/market remainder → canceled
            status,
            txHash: result.hash,
            timestamp: now,
            datetime: Structs.toDatetime(now),
            info: result,
        };
    }
    async crossingPrice(t, side, slippage) {
        const engine = this.engineOf(t);
        const book = engine.getWatchStatus(t.pool) === "live"
            ? {
                symbol: t.symbol,
                ...this.bookView(t, t.market.marketType === "BINARY"
                    ? engine.getLiveBinaryOrderBook(t.pool, { depth: 1 })
                    : engine.getLiveSpotOrderBook(t.pool, { depth: 1 })),
            }
            : await this.fetchOrderBook({ chainId: t.chainId, id: t.symbol }, 1);
        const best = side === "buy" ? book.asks[0]?.[0] : book.bids[0]?.[0];
        if (best === undefined) {
            throw new InvalidInputError(`cannot price a market ${side} on ${t.symbol} — the opposite side of the book is empty`);
        }
        const padded = side === "buy" ? best * (1 + slippage) : best * (1 - slippage);
        // Snap the protective limit onto the tick grid, AWAY from the caller — a buy
        // up, a sell down — so every level this order was priced to sweep still
        // crosses. Rounding it the conservative way instead could pull the limit
        // inside the best price and fill nothing. The float multiply above lands off
        // the grid for almost every input (measured: 1984 of 1998 on the live binary
        // ladder), and the pool rejects an off-tick price outright.
        //
        // Align BEFORE clamping: the clamp bounds are grid multiples, so clamping an
        // aligned value keeps it aligned, whereas clamping first could hand the
        // aligner a bound it then moves back off the range.
        return Structs.snapToGrid(padded, this.tickOf(t, "createOrder"), this.decimalsOf(t).price, {
            direction: side === "buy" ? "up" : "down",
            // Binary prices are probabilities: clamp inside (0, 1) — to a whole tick
            // either side, not the one raw unit this used before, which is not itself
            // on the grid of any venue whose tick exceeds a single unit.
            //
            // `createOrder`, the only caller, clamps again on the way out, so this is
            // redundant for that path and no test can distinguish it. Kept because the
            // pre-existing code bounded the value here, and returning an out-of-range
            // probability from a helper that computes one is a trap for the next caller.
            clamp: t.market.marketType === "BINARY",
        });
    }
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
    async cancelOrder(id, ref) {
        // A ChainOrderRef names the pool and the chain itself; `ref` then only
        // narrows (and must agree). A bare id needs `ref` to find the pool.
        const orderId = ChainRef.isChainOrderRef(id) ? id.id : id;
        const handle = ChainRef.isChainOrderRef(id) ? { chainId: id.chainId, id: id.pool } : ref;
        if (handle === undefined) {
            throw new InvalidInputError("cancelOrder needs the order's market (a symbol/ref) or a { chainId, pool, id } order ref");
        }
        const t = this.market(handle);
        if (ref !== undefined && ChainRef.isChainOrderRef(id)) {
            const scoped = this.market(ref);
            if (scoped.pool.toLowerCase() !== t.pool.toLowerCase() || scoped.chainId !== t.chainId) {
                throw new InvalidInputError(`order ${orderId} lives on ${t.symbol} (chain ${t.chainId}), not on ${scoped.symbol}`);
            }
        }
        const res = await this.traderOf(t).cancelOrder({ pool: t.pool, orderId });
        return { id: orderId, symbol: t.symbol, chainId: t.chainId, status: "canceled", info: res };
    }
    // ------------------------------------------------- stop orders
    /** The spot tradable + its stop registry, or a loud error naming the gap. */
    requireStopVenue(ref) {
        const t = this.market(ref);
        if (t.market.marketType !== "SPOT") {
            // Dispatch point: perp stops will be margin-native (no escrow, oracle
            // mark) on their own mechanism — added here when that venue exists.
            throw new InvalidInputError(`stop orders are not available on ${t.market.marketType} markets yet`);
        }
        const registry = t.market.stopRegistry;
        if (!registry) {
            throw new InvalidInputError(`${t.symbol} has no stop-order registry`);
        }
        return { t, registry };
    }
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
    async createStopOrder(ref, type, side, amount, triggerPrice, price, params = {}) {
        const { t, registry } = this.requireStopVenue(ref);
        const s = t.market;
        const d = this.decimalsOf(t);
        if (type === "limit" && price === undefined) {
            throw new InvalidInputError("a limit stop order needs a price");
        }
        // Infer the trigger direction from the freshest mark: an order arming
        // above the current mark fires on the way up (GTE), below on the way
        // down (LTE). The mark is refetched here — the loadMarkets() snapshot can
        // be arbitrarily stale, and a stale mark on the wrong side of the trigger
        // would silently invert the direction (a stop that fires instantly, or
        // never). Ambiguous (== mark, or no mark reachable) requires the caller
        // to pin it.
        let direction = params.triggerDirection;
        if (!direction) {
            // A read that FAILS propagates as its own error; only a market with no
            // mark yet is the caller's problem to pin.
            const fresh = (await this.engineOf(t).getMarketByPool(t.pool));
            const markRaw = fresh?.markPrice ?? fresh?.lastPrice;
            const mark = markRaw != null ? Structs.toHumanNum(markRaw, d.price) : undefined;
            if (mark === undefined || mark === triggerPrice) {
                throw new InvalidInputError("cannot infer the trigger direction — pass params.triggerDirection");
            }
            direction = triggerPrice > mark ? "above" : "below";
        }
        // Align to the registry's grids, same rules as createOrder: the limit price
        // in the direction that cannot cost the caller, the quantity down to a lot.
        // Done AFTER the direction inference above, which compares the caller's
        // stated trigger against the mark — aligning first could move the trigger
        // across the mark and silently invert the direction.
        const tickRaw = this.tickOf(t, "createStopOrder");
        const lotRaw = this.lotOf(t, "createStopOrder");
        const priceDirection = side === "buy" ? "down" : "up";
        const limitPrice = price !== undefined
            ? Structs.toRaw(Structs.snapToGrid(price, tickRaw, d.price, { direction: priceDirection }), d.price)
            : undefined;
        // floorToRaw for the same reason as createOrder: never send more than asked.
        const alignedQuantity = (Structs.floorToRaw(amount, d.amount) / lotRaw) * lotRaw;
        if (alignedQuantity <= 0n) {
            throw new InvalidInputError(`amount ${amount} is below one lot on ${t.symbol} (lot ${Structs.toHumanNum(lotRaw, d.amount)}) — ` +
                `it would place a zero-quantity stop order`);
        }
        // The trigger arms against the pool's mark, so it aligns AWAY from the mark —
        // in the direction `direction` already established — never toward it. Aligning
        // it like an order price instead can land it exactly ON the mark, and a GTE
        // stop whose trigger equals the mark fires the instant it is armed: a caller
        // asking for a stop 0.04% out would get an immediate market order.
        const alignedTrigger = Structs.snapToGrid(triggerPrice, tickRaw, d.price, {
            direction: direction === "above" ? "up" : "down",
        });
        const result = await this.traderOf(t).placeSpotStopOrder({
            registry,
            pool: t.pool,
            isBid: side === "buy",
            quantity: alignedQuantity,
            triggerPrice: Structs.toRaw(alignedTrigger, d.price),
            // 0 = GTE (mark ≥ trigger), 1 = LTE (mark ≤ trigger).
            triggerOperator: direction === "above" ? 0 : 1,
            // 1 = MARKET at trigger, 0 = LIMIT.
            stopOrderType: type === "market" ? 1 : 0,
            ...(limitPrice !== undefined ? { limitPrice } : {}),
            quoteToken: s.quoteToken,
            baseToken: s.baseToken,
            baseIsNative: s.baseIsNative,
        });
        // The stop IS armed on-chain at this point — but without the registry id
        // the caller can never cancel it through this facade, so a silent ""
        // would break later. Fail loud, with the tx hash for manual recovery.
        if (result.stopOrderId === undefined) {
            // Same class as operatorAdmin's missing-event decode: the tx completed but
            // the receipt didn't yield what the SDK needs — an infra fault, not a revert.
            throw new RpcError("createStopOrder", `stop order tx ${result.hash} landed but PendingOrderCreated was not in the receipt (ABI/deployment drift?) — registry id unknown; recover via the registry directly`);
        }
        const now = Date.now();
        return {
            id: result.stopOrderId.toString(),
            symbol: t.symbol,
            chainId: t.chainId,
            type,
            side,
            // The ALIGNED values, not the caller's — this describes the stop that is
            // now armed on-chain, which is what a caller reconciling against it needs.
            amount: Structs.toHumanNum(alignedQuantity, d.amount),
            triggerPrice: alignedTrigger,
            triggerDirection: direction,
            ...(limitPrice !== undefined ? { price: Structs.toHumanNum(limitPrice, d.price) } : {}),
            status: "pending",
            timestamp: now,
            datetime: Structs.toDatetime(now),
            txHash: result.hash,
            info: result,
        };
    }
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
    async fetchOpenStopOrders(ref, filter = {}) {
        const addr = this.requireAddress("fetchOrders");
        const t = ref ? this.market(ref) : undefined;
        const engines = this.indexedEngines(this.readEngines(t, filter.chainId));
        const unscoped = !t && filter.chainId === undefined;
        const pages = await this.perChain(engines, async (chainId, engine) => {
            const rows = await engine.getSpotStopOrders(addr, {
                status: "PENDING",
                ...(t ? { pool: t.pool } : {}),
            });
            return rows.map((o) => ({ chainId, o }));
        }, unscoped);
        const out = [];
        for (const { chainId, o } of pages.flat()) {
            const rt = this.tryResolvePool(chainId, o.market.poolAddress);
            if (!rt)
                continue;
            const d = this.decimalsOf(rt);
            const tsMs = Number(o.createdAt) * 1000;
            out.push({
                id: o.orderId,
                symbol: rt.symbol,
                chainId,
                type: o.orderType === 1 ? "market" : "limit",
                side: o.isBid ? "buy" : "sell",
                amount: Structs.toHumanNum(o.quantity, d.amount),
                triggerPrice: Structs.toHumanNum(o.triggerPrice, d.price),
                triggerDirection: o.triggerOperator === 0 ? "above" : "below",
                status: "pending",
                ...(o.placedOrderId != null ? { triggeredOrderId: o.placedOrderId } : {}),
                timestamp: tsMs,
                datetime: Structs.toDatetime(tsMs),
                info: o,
            });
        }
        return out;
    }
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
    async cancelStopOrder(id, ref) {
        const { t, registry } = this.requireStopVenue(ref);
        const res = await this.traderOf(t).cancelStopOrder({ registry, orderId: id });
        return { id, symbol: t.symbol, chainId: t.chainId, status: "canceled", info: res };
    }
    // ------------------------------------------------- perp specifics
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
    async fetchFundingRate(ref) {
        const t = this.requirePerpMarket(ref);
        const m = t.market;
        const s = await this.engineOf(t).getPerpState(t.pool);
        const now = Date.now();
        return {
            symbol: t.symbol,
            chainId: t.chainId,
            // Gated on BOTH, matching perpMarkForPnl and fetchTicker. `tryGetMarkPrice`
            // returns (ok, price) and the price word is meaningless when ok is false;
            // `_tryMarkPrice` also maps a zero price to (false, 0), so `ok` implies non-zero
            // today — enforced here anyway rather than trusted, because a mark of 0 on the
            // wire is the sentinel mistake this whole change exists to prevent.
            markPrice: s.markPriceOk && s.markPrice > 0n ? Structs.toHumanNum(s.markPrice, m.quoteDecimals) : undefined,
            indexPrice: Structs.toHumanNum(s.indexPrice, m.quoteDecimals),
            // Normalized to the same per-8h axis as fetchFundingRateHistory. Load-bearing: the
            // chain value is per CALCULATION WINDOW, and if the live reading and the history
            // sat on different axes, a chart's newest point would jump relative to the series
            // it extends. `info` carries fundingWindowSec / fundingIntervalSec for anyone who
            // needs the per-interval or annualized form.
            fundingRate: Number(fundingRate8h(s.fundingRate, s.fundingWindowSec)) / 1e18,
            // The NEXT settlement time, which is what a ccxt consumer expects here — the last
            // anchor plus the settlement interval. Previously reported the ORACLE's updatedAt,
            // which is a different clock entirely and drifts from the funding schedule.
            // Settlement is permissionless and lazy, so this can be in the past.
            fundingTimestamp: Number(s.nextFundingAt) * 1000,
            timestamp: now,
            datetime: Structs.toDatetime(now),
            info: s,
        };
    }
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
    async fetchFundingRateHistory(ref, since, limit) {
        const t = this.requirePerpMarket(ref);
        const m = t.market;
        const rows = await this.engineOf(t).listFundingRateHistory(t.pool, {
            limit: limit ?? 100,
            // ccxt speaks milliseconds; the indexer stores unix seconds.
            // With `since` the read ASCENDS, so the page starts at the cursor rather than at the
            // newest row — the whole point, and it means no reverse is needed below.
            ...(since != null ? { from: Math.floor(since / 1000), order: "asc" } : {}),
        });
        // Ascending already when `since` was given; otherwise newest-first, and ccxt series
        // are oldest-first.
        return (since != null ? rows : rows.slice().reverse()).map((r) => {
            const ts = Number(r.timestamp) * 1000;
            return {
                symbol: t.symbol,
                chainId: t.chainId,
                markPrice: r.markPrice == null ? undefined : Structs.toHumanNum(BigInt(r.markPrice), m.quoteDecimals),
                indexPrice: Structs.toHumanNum(BigInt(r.indexPrice), m.quoteDecimals),
                fundingRate: Number(fundingRate8h(BigInt(r.fundingRate), r.fundingWindowSec)) / 1e18,
                fundingTimestamp: ts,
                timestamp: ts,
                datetime: Structs.toDatetime(ts),
                info: r,
            };
        });
    }
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
    async fetchPositions(refs, filter = {}) {
        const addr = this.requireAddress("fetchPositions");
        await this.loadMarketsFor(filter.chainId);
        const tradables = refs
            ? refs.map((r) => this.requirePerpMarket(r))
            : Object.values(this.markets)
                .filter((m) => m.type === "swap")
                .map((m) => this.market(m.symbol));
        // A ref off the filtered chain is an input error, not an empty result.
        if (refs)
            for (const t of tradables)
                this.readEngines(t, filter.chainId);
        // Grouped per chain, so a failed read names its chain. A chain with no perp
        // to read makes no call.
        const engines = this.readEngines(undefined, filter.chainId).filter(([chainId]) => tradables.some((t) => t.chainId === chainId));
        // No refs and no filter: the read spans the exchange, so name the chain even
        // when only one chain has perps (as in `fetchMyTrades`).
        const unscoped = !refs && filter.chainId === undefined;
        const perChain = await this.perChain(engines, (chainId, engine) => Promise.all(tradables
            .filter((t) => t.chainId === chainId)
            .map(async (t) => {
            const m = t.market;
            const pos = await engine.getPerpPosition({ marginBank: m.marginBank, account: addr, pool: t.pool });
            if (pos.size === 0n)
                return null;
            const long = pos.size > 0n;
            const size = Structs.toHumanNum(long ? pos.size : -pos.size, m.baseDecimals);
            const entryPrice = Structs.toHumanNum(pos.avgEntryPrice, m.quoteDecimals);
            // The pool state is read only for a held position, and its failure is
            // contained to this position. `getPerpState` reads the pool's bare
            // `getIndexPrice()`, which reverts when the oracle is dead. Before this,
            // one dead oracle on any loaded perp failed the whole read, also for an
            // account with no position on that pool. The position still lists, with
            // `perpState: "degraded"` and no mark or PnL — the same flag `fetchTicker`
            // uses, so the degrade is visible and never reads as a zero mark.
            //
            // Best-effort liquidation price: an extra MarginBank read; degrade to
            // undefined on failure so a position still lists if the health read reverts.
            const [state, liqRaw] = await Promise.all([
                engine.getPerpState(t.pool).catch(() => undefined),
                engine.getLiquidationPrice({ marginBank: m.marginBank, account: addr, pool: t.pool }).catch(() => null),
            ]);
            const tsMs = Number(pos.lastUpdatedTimestampNs / 1000000n);
            const liquidationPrice = liqRaw != null ? Structs.toHumanNum(liqRaw, m.quoteDecimals) : undefined;
            if (state === undefined) {
                return {
                    symbol: t.symbol,
                    chainId: t.chainId,
                    side: long ? "long" : "short",
                    contracts: size,
                    entryPrice,
                    liquidationPrice,
                    perpState: "degraded",
                    timestamp: tsMs,
                    datetime: Structs.toDatetime(tsMs),
                    info: { position: pos },
                };
            }
            // Fall back to the INDEX price when the mark feed is stale.
            //
            // This guard is load-bearing because the read underneath changed. `getPerpState`
            // used to call `getMarkPrice()`, which REVERTS on a stale feed — so the whole
            // read threw and the position simply did not list. It now calls
            // `tryGetMarkPrice`, which reports staleness instead of reverting, and an
            // unguarded read would take the 0 price word and compute
            // `unrealizedPnl = (0 - entryPrice) * size` — a 100% loss on every open position,
            // from a feed hiccup. More robust read, strictly worse number, unless handled.
            //
            // The index is the right proxy rather than omitting the position: it is a
            // separate oracle the pool already trusts for funding, and dropping positions from
            // a portfolio view is its own kind of wrong. `info.markFromIndex` records which was
            // used so a caller can caveat the PnL. The decision itself lives in
            // `perpMarkForPnl`, unit-tested, so it cannot be re-broken by an inline edit.
            const mark = perpMarkForPnl(state);
            const markPrice = Structs.toHumanNum(mark.price, m.quoteDecimals);
            return {
                symbol: t.symbol,
                chainId: t.chainId,
                side: long ? "long" : "short",
                contracts: size,
                entryPrice,
                markPrice,
                unrealizedPnl: (markPrice - entryPrice) * (long ? size : -size),
                liquidationPrice,
                perpState: "ok",
                timestamp: tsMs,
                datetime: Structs.toDatetime(tsMs),
                // markFromIndex says whether markPrice/unrealizedPnl came from the mark feed or
                // fell back to the index — surface it if you display PnL.
                info: { position: pos, state, markFromIndex: mark.fromIndex },
            };
        })), unscoped);
        return perChain.flat().filter((p) => p !== null);
    }
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
    async depositMargin(ref, amount) {
        const t = this.requirePerpMarket(ref);
        const m = t.market;
        const res = await this.traderOf(t).depositMargin({
            marginBank: m.marginBank,
            amount: Structs.toRaw(amount, m.quoteDecimals),
        });
        return { hash: res.hash, info: res };
    }
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
    async withdrawMargin(ref, amount) {
        const t = this.requirePerpMarket(ref);
        const m = t.market;
        const res = await this.traderOf(t).withdrawMargin({
            marginBank: m.marginBank,
            amount: Structs.toRaw(amount, m.quoteDecimals),
        });
        return { hash: res.hash, info: res };
    }
    requirePerpMarket(ref) {
        const t = this.market(ref);
        if (t.market.marketType !== "PERP") {
            throw new InvalidInputError(`${t.marketSymbol} is not a perp market`);
        }
        return t;
    }
    // ------------------------------------------- outcome-market specifics
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
    async mintSet(ref, amount) {
        const t = this.requireLive(this.requireOutcomeMarket(ref), "mintSet");
        await this.requireCurrentBinaryGeneration(t);
        const res = await this.traderOf(t).mintSet({ pool: t.pool, amount: Structs.toRaw(amount, t.market.baseDecimals) });
        return { hash: res.hash, info: res };
    }
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
    async burnSet(ref, amount) {
        const t = this.requireLive(this.requireOutcomeMarket(ref), "burnSet");
        await this.requireCurrentBinaryGeneration(t);
        const res = await this.traderOf(t).burnSet({ pool: t.pool, amount: Structs.toRaw(amount, t.market.baseDecimals) });
        return { hash: res.hash, info: res };
    }
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
    async redeem(ref, amount, options) {
        const t = this.requireOutcomeMarket(ref);
        const bm = t.market;
        const res = await this.traderOf(t).redeem({
            marketId: bm.marketId,
            market: bm.marketAddress,
            // Only an explicit caller choice can skip the chain-state guard in the
            // Trader. An indexed winner is off-chain data and can be stale or
            // inconsistent with a voided/unresolved row.
            outcomeIdx: options?.outcomeIdx,
            amount: Structs.toRaw(amount, t.market.baseDecimals),
        });
        return { hash: res.hash, info: res };
    }
    /**
     *  Refuse a SETTLED binary market on every verb that routes to the pool. A
     *  settled market resolves (so a position on it can be reported and redeemed),
     *  but its pool has been recycled onto the successor market: an order, a quote
     *  or a watch sent to `t.pool` would act on that successor under this symbol.
     */
    requireLive(t, verb) {
        if (!Markets.isSettledMarket(t.market))
            return t;
        throw new InvalidInputError(`${verb}: ${t.marketSymbol} is settled — its pool now serves the next market in the series, ` +
            `so only redeem, balances and history remain`);
    }
    /** Financial writes verify the cached immutable identity before funding or signing. */
    async requireCurrentBinaryGeneration(t) {
        if (!Markets.isBinaryMarket(t.market))
            return;
        await CreateClient.assertBinaryPoolGeneration(this.engineOf(t), t.pool, t.market.marketAddress);
    }
    requireOutcomeMarket(ref) {
        const t = this.market(ref);
        if (!Markets.isBinaryMarket(t.market)) {
            throw new InvalidInputError(`${t.marketSymbol} is not an outcome market`);
        }
        return { ...t, market: t.market };
    }
    // ------------------------------------------------------------- lifecycle
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
    async close() {
        let failure;
        const attempt = (cleanup) => {
            try {
                cleanup();
            }
            catch (error) {
                failure ??= OwnedWebSocket.failure(error, "close exchange");
            }
        };
        // A running load may already have cleared rows or grids. Its old markets
        // cannot count as a complete cache after cancellation, including while the
        // registry still settles. Only affected chains need a subsequent reload.
        if (this.marketLoad) {
            for (const chainId of this.marketLoadChains)
                this.loadedChains.delete(chainId);
        }
        // End the delivery waits of every call that started before this close. Each
        // call read this signal when it started. A new controller serves later calls.
        this.closeController.abort();
        this.closeController = new AbortController();
        // First, so a hydration still queued for an indexer slot is rejected rather
        // than awaited: the awaits below would otherwise hold shutdown for as long
        // as the queue ahead of it takes. Watches mid-hydration see the generation
        // move and settle to a no-op handle, so stopping them after is still safe.
        for (const engine of this.engines.values())
            attempt(() => engine.stopLive());
        // Clear before awaiting, so a watch* call still hydrating sees its entry gone
        // and rejects, as after unwatchMarket, instead of re-creating a channel.
        const held = [...this.watches.values()];
        this.watches.clear();
        for (const p of held) {
            await p.then((h) => attempt(() => h.stop()), () => undefined);
        }
        for (const p of this.priceWatches.values()) {
            await p.then((h) => attempt(() => h.stop()), () => undefined);
        }
        this.priceWatches.clear();
        for (const unsubscribe of this.unsubscribes ?? [])
            attempt(unsubscribe);
        this.unsubscribes = null;
        attempt(() => this.dropChannels(() => true));
        // The traders captured the connections being released, so a trade after
        // this close must build a new one rather than reviving a socket nobody owns
        // (SDK-OWN-004: a derived capability keeps no lifecycle past its owner's).
        // The signer itself is untouched — `traderFor()` rebuilds from `signerConfig`,
        // exactly as `setSigner` relies on.
        this.traders.clear();
        if (failure)
            throw failure;
    }
}
/** The typed timeout for a bridge leg whose message was not seen delivered. */
function deliveryTimeout(sent) {
    return new BridgeDeliveryTimeoutError({
        messageId: sent.messageId,
        bridgeHash: sent.bridgeHash,
        from: sent.plan.origin.chainId,
        to: sent.plan.destination.chainId,
        token: sent.plan.origin.token,
        amount: sent.plan.amount,
    });
}
/** Join every started balance stage before propagating its first typed failure. */
async function settleBalanceStages(stages) {
    const settled = await Promise.allSettled(stages);
    for (const stage of settled)
        if (stage.status === "rejected")
            throw stage.reason;
}
