// createClient — the SDK's single entry point.
//
// Everything flows through a SomniaMarketsClient: indexer reads, on-chain reads, the
// live tail, and writes. There is no module-global config or singleton store —
// each client owns its own config, MaterializerStore, LiveTail, and (lazily
// opened) WebSocket socket. So two clients (different chains, a per-request
// user tail, parallel tests) never share state. In React, wrap your tree in
// <SomniaMarketsProvider client={createClient(...)}> and use the hooks.
//
// The socket is opened lazily on first chain I/O, so an indexer-only client
// (e.g. server-side GraphQL reads) that never touches the chain never opens one.
//
// The public contract lives in somniaMarketsClient.ts (the fully documented
// SomniaMarketsClient interface); this module is the wiring that implements it.

import { isAddress, type Address, type Hex, type PublicClient } from "viem";
import * as BinarySettlement from "./binary/settlement.js";
import * as PerpPortfolio from "./perp/portfolio.js";
import * as PerpHistory from "./perp/history.js";
import * as PerpState from "./perp/state.js";
import * as PerpMargin from "./perp/margin.js";
import * as PerpAdlClient from "./perp/adlClient.js";
import * as PerpSystem from "./perp/system.js";
import * as PerpStops from "./perp/stops.js";
import * as PerpRegistry from "./perp/registry.js";
import * as PerpLinkedWallet from "./perp/linkedWallet.js";
import * as PerpVoucher from "./perp/voucher.js";
import * as SpotPortfolio from "./spot/portfolio.js";
import * as SpotStops from "./spot/stops.js";
import * as SpotVaultMode from "./spot/vaultMode.js";
import * as SpotPoolReads from "./spot/poolReads.js";
import * as SpotOperatorGrants from "./spot/operatorGrants.js";
import * as BinaryPortfolio from "./binary/portfolio.js";
import * as Balances from "./balances.js";
import * as Fees from "./fees.js";
import { AsyncCache } from "./asyncCache.js";
import * as Orders from "./orders.js";
import * as Units from "./units.js";
import * as Markets from "./markets.js";
import * as SyncStatus from "./syncStatus.js";
import * as Router from "./router.js";
import * as Pools from "./pools.js";
import type * as PortfolioScope from "./portfolioScope.js";
import * as Candles from "./candles.js";
import * as Observed from "./observedReads.js";
import * as IndexerRead from "./indexerRead.js";
import * as GraphqlBoundary from "./graphqlBoundary.js";
import {
  IncompletePortfolioError,
  IndexerError,
  IndexerUnavailableError,
  InvalidInputError,
  NotConfiguredError,
} from "./errors.js";
import * as Client from "./client.js";
import * as OwnedWebSocket from "./webSocket.js";
import type { ClientConfig, SomniaMarketsSocketFailure } from "./config.js";
import * as Debug from "./debug.js";
import * as LiveTail from "./liveTail.js";
import type { SomniaMarketsClient, SomniaMarketsClientWithObservations } from "./somniaMarketsClient.js";
import type { LiveMarket } from "./store.js";
import * as Store from "./store.js";
import * as Activity from "./activity.js";
import * as AccountEquity from "./accountEquity.js";
import * as Fills from "./fills.js";
import type { BinaryOrderBook, BookTop } from "./orders.js";
import type {
  BinaryOrderQuote,
  MarketStats24h,
  BinaryPositionPnL,
  ClaimablePosition,
  ClaimableInput,
} from "./derivedReads.js";
import * as DerivedReads from "./derivedReads.js";
import * as System from "./system.js";
import { NetworkTape } from "./networkTape.js";
import * as Trade from "./trade.js";
import * as ExecutorCreate from "./executor/create.js";
import * as Native from "./native/client.js";
import * as WriterRuntime from "./writerRuntime.js";
import * as OperatorAdmin from "./operatorAdmin.js";
import type { QuestionDefinitionInput } from "./oracleHub.js";
import * as OracleHub from "./oracleHub.js";
import * as GovernanceAdmin from "./governanceAdmin.js";
import * as MarketCreatorAdmin from "./marketCreatorAdmin.js";
import * as OperatorReads from "./operatorReads.js";
import type { SomniaLendClient } from "./lend/client.js";
import * as SmartAccounts from "./smartAccounts.js";
import * as AccountOrders from "./accountView/client.js";
import * as AccountBalances from "./accountView/balancesClient.js";
import * as AccountPositions from "./accountView/positionsClient.js";
import * as AccountSpotOrders from "./accountView/spotOrdersClient.js";
import * as AccountOutcomePositions from "./accountView/outcomePositions.js";
import * as ChainStops from "./accountView/chainStops.js";
import * as Lend from "./lend/client.js";
import * as Config from "./config.js";
import type { PriceWatchHandle } from "./priceFeed/priceFeed.js";
import * as PriceFeedPriceFeed from "./priceFeed/priceFeed.js";
import * as PriceFeedPriceStore from "./priceFeed/priceStore.js";
import * as PriceFeedQuery from "./priceFeed/query.js";
import { unreachable } from "./raise.js";

export type { SomniaMarketsClient };

/** Private owner registration, with one observer per freshness invocation. */
export type FreshnessRead = (
  chainId: number,
  observed?: (failure: SomniaMarketsSocketFailure) => void,
) => Promise<SyncStatus.IndexerFreshness | null>;

/** Private balance readers bound to one configured owner. */
export interface BalanceReads {
  native(address: Address, observed?: (failure: SomniaMarketsSocketFailure) => void): Promise<bigint>;
  erc20(token: Address, address: Address, observed?: (failure: SomniaMarketsSocketFailure) => void): Promise<bigint>;
}

export interface Infrastructure extends Client.RpcInfrastructure {
  registerFreshness?(read: FreshnessRead, selected: SomniaMarketsClientWithObservations["getIndexerFreshness"]): void;
  registerBalances?(
    read: BalanceReads,
    selected: Pick<SomniaMarketsClientWithObservations, "getNativeBalance" | "getErc20Balance">,
  ): void;
}

/**
 *  Shared stable empty binary book — a stale/unbound market resolves to this
 *  (identity-stable so useSyncExternalStore never loops on an empty result).
 */
const EMPTY_BINARY_BOOK: BinaryOrderBook = { yesBids: [], yesAsks: [], noBids: [], noAsks: [] };

/**
 *  Most settlement-fee reads `getClaimable` keeps in flight on one indexer.
 *  The portfolio read it follows returns at most 200 positions, so this bound
 *  keeps a wallet with many winners from sending all of its fee reads at once.
 */
// ponytail: fixed bound; replace with one batched MarketVenue `_in` query if fee reads dominate.
const CLAIMABLE_FEE_READS = 8;

/** Owner-private validation prerequisite, shared with every modeled chain read. */
const validateConnection = Symbol("validateConnection");
type ValidatingClient = SomniaMarketsClient & { [validateConnection]: () => Promise<void> };
function canValidate(client: SomniaMarketsClient): client is ValidatingClient {
  return validateConnection in client;
}

/** Await this owner's existing genesis check without issuing a protocol read. */
export async function validateChain(client: SomniaMarketsClient): Promise<void> {
  if (!canValidate(client)) throw new InvalidInputError("chain validation requires a configured Markets client");
  await client[validateConnection]();
}

/** Owner-private generation check. It uses the decorated client, never the viem escape hatch. */
const checkBinaryPoolGeneration = Symbol("checkBinaryPoolGeneration");
type GenerationCheckingClient = SomniaMarketsClient & {
  [checkBinaryPoolGeneration]: (pool: Address, marketAddress: Address) => Promise<void>;
};
function canCheckGeneration(client: SomniaMarketsClient): client is GenerationCheckingClient {
  return checkBinaryPoolGeneration in client;
}

/** Refuse a pool that no longer hosts the requested immutable market clone. */
export async function assertBinaryPoolGeneration(
  client: SomniaMarketsClient,
  pool: Address,
  marketAddress: Address,
): Promise<void> {
  if (!canCheckGeneration(client))
    throw new InvalidInputError("generation checking requires a configured Markets client");
  await client[checkBinaryPoolGeneration](pool, marketAddress);
}

/** Owner-private settled lookup, sharing the existing indexer boundary and lifecycle. */
const resolveMarketBatch = Symbol("resolveMarketBatch");
type ResolvingClient = SomniaMarketsClient & {
  [resolveMarketBatch]: (ids: readonly string[], signal: AbortSignal) => Promise<(Markets.Market | null)[]>;
};
function canResolve(client: SomniaMarketsClient): client is ResolvingClient {
  return resolveMarketBatch in client;
}

/** Resolve one finite batch through this owner's existing governed indexer. */
export async function resolveMarkets(
  client: SomniaMarketsClient,
  ids: readonly string[],
  signal: AbortSignal,
): Promise<(Markets.Market | null)[]> {
  if (!canResolve(client)) throw new InvalidInputError("settled lookup requires a configured Markets client");
  return client[resolveMarketBatch](ids, signal);
}

/** Owner-private portfolio order reads retain the native row shapes. */
export type ScopedOpenOrders =
  | { type: "BINARY"; orders: BinaryPortfolio.PortfolioOrder[] }
  | { type: "SPOT"; orders: SpotPortfolio.SpotPortfolioOrder[] }
  | { type: "PERP"; orders: PerpPortfolio.PerpPortfolioOrder[] };
const scopedOpenOrders = Symbol("scopedOpenOrders");
type ScopedOrderClient = SomniaMarketsClient & {
  [scopedOpenOrders]: (
    owner: string,
    type: Markets.MarketType,
    scope: PortfolioScope.OrderScope,
    limit: number | undefined,
    signal: AbortSignal,
  ) => Promise<ScopedOpenOrders>;
};
function hasScopedOrders(client: SomniaMarketsClient): client is ScopedOrderClient {
  return scopedOpenOrders in client;
}

/** Read a single tradable through its configured owner's portfolio boundary. */
export async function readScopedOpenOrders(
  client: SomniaMarketsClient,
  owner: string,
  type: Markets.MarketType,
  scope: PortfolioScope.OrderScope,
  limit: number | undefined,
  signal: AbortSignal,
): Promise<ScopedOpenOrders> {
  if (!hasScopedOrders(client)) throw new InvalidInputError("scoped orders require a configured Markets client");
  return client[scopedOpenOrders](owner, type, scope, limit, signal);
}

/**
 * Build an SDK client — the single entry point for all protocol I/O.
 *
 * **Example** (Creating a low-level client)
 *
 * ```ts
 * import { createClient } from "@somnia-chain/markets-sdk";
 * import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
 *
 * const client = createClient({
 *   indexerUrl: "/v1/graphql",
 *   chain: somniaShannon,
 *   wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
 * });
 * const watch = await client.watchMarket(pool);   // live book/fills for one market
 * const book = client.getLiveBinaryOrderBook(pool);
 * const trader = client.createTrader({ privateKey });
 * ```
 */
/** How long the list of stop registries is kept. */
const STOP_REGISTRIES_KEPT_MS = 60_000;

/** The most markets of one type whose stop registries a live orders view follows. */
const MARKETS_PER_TYPE = 1_000;

export function createClient(
  config: ClientConfig,
  infrastructure: Infrastructure = {},
): SomniaMarketsClientWithObservations {
  // No indexerUrl gate: a chain-only client (smart accounts, executors,
  // on-chain reads) is legitimate. Indexer reads and live watches degrade by
  // feature — NotConfiguredError at their own choke points.
  const reconciliation = config.reconciliation;
  if (
    reconciliation &&
    (typeof reconciliation.blockInterval !== "bigint" ||
      reconciliation.blockInterval <= 0n ||
      !Number.isSafeInteger(reconciliation.depth) ||
      reconciliation.depth < 1 ||
      reconciliation.depth > 100)
  ) {
    throw new InvalidInputError("reconciliation requires a positive bigint blockInterval and depth from 1 to 100");
  }
  let readController = new AbortController();
  let readLink = GraphqlBoundary.linkSignals(config.signal, readController.signal);
  const readSignal = () => readLink.signal;
  // One gate onto this client's indexer. Built here so every read shares the
  // counters (a per-read governor would cap nothing) and two clients on one
  // endpoint stay independent owners (SDK-ARCH-002).
  const governor = GraphqlBoundary.makeEndpointGovernor(config.indexerLimits ?? {});
  const bindingContext: IndexerRead.RequestContext = {
    url: config.indexerUrl,
    chainId: config.chain.id,
    signal: config.signal,
    governor,
  };
  // One binding check per client: every context below is spread from `url`, so
  // each read, the live tail's hydrations included, shares this one check.
  const verifyBinding = SyncStatus.makeBindingCheck(bindingContext);
  const url: IndexerRead.RequestContext = {
    ...bindingContext,
    poolCache: new Map(),
    aggregateSupport: new IndexerRead.AggregateSupportMap(),
    verifyBinding,
  };

  // Server-only privileged headers (e.g. Hasura admin-secret) for reads the
  // public role can't do — currently just `_aggregate` counts.
  const indexerHeaders = config.indexerHeaders;
  const store = new Store.MaterializerStore(config.chain.id);
  const getConfig = () => config;
  // The client's debug channel — a no-op unless config.debug is set (see debug.ts).
  const dbg = Debug.makeDebug(config.debug);
  // Every local signer derived from this client shares local
  // send ordering. Separate configured clients remain independent owners.
  const writerRuntime = WriterRuntime.makeWriterRuntime();

  // The WebSocket socket is opened lazily + memoized — an indexer-only client
  // (server-side GraphQL reads) that never touches the chain never opens one.
  // Both views are memoized together: they share one transport, so building the
  // pair once is what keeps `getViemClient()` off a second socket.
  // An explicit wsRpcUrl wins; otherwise the chain definition's own WebSocket
  // endpoint serves (every /chains definition carries one — viem's somniaTestnet
  // is the notable definition that doesn't). ONE rule: `getClients` wraps it in a
  // viem client, the tape wants the raw URL because it speaks JSON-RPC itself.
  // The chain WebSocket the client is configured with, if any.
  const configuredWsUrl = (): string | undefined => config.wsRpcUrl ?? config.chain.rpcUrls.default.webSocket?.[0];
  const resolveWsUrl = (): string => {
    const wsRpcUrl = configuredWsUrl();
    if (!wsRpcUrl) {
      throw new NotConfiguredError(
        "wsRpcUrl in createClient (or a chain whose rpcUrls carry a webSocket endpoint)",
        "this operation needs chain access",
      );
    }
    return wsRpcUrl;
  };

  let clients: Client.ChainClients | undefined;
  // The genesis check of the current connection, and the decorated client gated by it.
  let genesis: { check: Client.GenesisCheck | undefined; client: PublicClient } | undefined;
  const getClients = (): Client.ChainClients => {
    if (!clients) clients = Client.makePublicClient(config.chain, resolveWsUrl(), infrastructure);
    return clients;
  };
  const getGenesis = (): { check: Client.GenesisCheck | undefined; client: PublicClient } => {
    if (genesis) return genesis;
    const pair = getClients();
    const decorated = pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.client ?? pair.decorated;
    const check = Client.makeGenesisCheck(
      config.chain.id,
      decorated,
      pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure,
    );
    genesis = { check, client: check ? Client.withGenesisCheck(decorated, check) : decorated };
    return genesis;
  };

  // The SDK's own door — every internal chain read goes through the DECORATED
  // client, so reverts arrive named. Never hand this one to a caller. The
  // genesis check refuses an RPC that serves a retired genesis of this chain id.
  const getClient = (): PublicClient => getGenesis().client;

  // The one chain read the block-scoped indexer reads need. Kept as a narrow
  // function so `activity.ts` stays indexer-only and never sees a transport.
  const resolveBlockTimestamp: Activity.BlockTimestampResolver = async (blockNumber) =>
    (await getClient().getBlock({ blockNumber })).timestamp;

  // Best-effort: a hash the RPC cannot place (unknown, or an endpoint that is
  // down) leaves the anchor unset and the read on its order-probe path. That
  // path is never wrong, but its unindexed probe can be slow enough to fail, so
  // a found anchor can turn a timeout into a result. `Activity.getTransactionActivity`
  // calls it only when no indexed event and no caller anchor place the transaction. A caller
  // abort is not lost: the next indexer read rethrows the caller's reason.
  const resolveTxAnchor = async (txHash: string): Promise<{ blockNumber: bigint; timestamp: bigint } | undefined> => {
    try {
      const receipt = await getClient().getTransactionReceipt({ hash: txHash as `0x${string}` });
      const block = await getClient().getBlock({ blockNumber: receipt.blockNumber });
      return { blockNumber: receipt.blockNumber, timestamp: block.timestamp };
    } catch {
      return undefined;
    }
  };

  // The head stream, bound to the same socket every read uses. The transport
  // lives behind this function, so the tail never handles one (SDK-IO-001).
  const subscribeHeads: Client.ChainHeadSubscriber = (onHead, onError) =>
    Client.subscribeChainHeads(getClients().raw, onHead, onError);

  // A hydration waits on the SAME check as ordinary reads, but it belongs to the
  // live lifecycle. stopLive() and close() refuse it, as they refuse a hydration
  // still queued for a slot, rather than leave it waiting on a check in flight.
  const verifyLiveBinding = (): Promise<void> | undefined => {
    const pending = verifyBinding();
    if (!pending) return undefined;
    const signal = readSignal();
    return IndexerRead.abortable(pending, signal).catch((error: unknown) => {
      if (!signal?.aborted) throw error;
      throw new IndexerUnavailableError(
        "IndexedChains",
        "live-reset",
        "stopLive() reset live reads while this hydration waited for the indexer binding check",
        0,
        governor.stats().consecutiveFailures,
      );
    });
  };
  const tail = new LiveTail.LiveTail({
    getConfig,
    governor,
    verifyBinding: verifyLiveBinding,
    store,
    getClient,
    subscribeHeads,
    // No connection yet means nothing to mark or retire.
    chainSocket: {
      mark: () => clients?.markSocket?.(),
      redial: (silentOn) => clients?.redial?.(silentOn),
    },
    dbg,
  });

  // The Somnia-native RPC surface over the SAME socket, for session-key
  // executors. Built lazily — most clients never send a session transaction.
  let native: Native.SomniaNative | undefined;
  // Session sends go through this surface, so it shares the genesis check: a
  // transaction signed for this chain id is also valid on a retired genesis.
  const getNative = (): Native.SomniaNative => {
    if (native) return native;
    const pair = getClients();
    const created = Native.createNative(pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.client ?? pair.raw);
    const { check } = getGenesis();
    native = check ? Client.withGenesisCheck(created, check) : created;
    return native;
  };
  const executorDeps = { getConfig, getClient, getNative, writerRuntime, dbg, getReceiptSignal: readSignal };

  // The OracleHub address gate for the hub quote reads (§8c) — throws a clear
  // error instead of readContract-ing the zero address.
  const requireOracleHub = (): Address => {
    const hub = config.addresses?.oracleHub;
    if (!hub) {
      throw new NotConfiguredError("config.addresses.oracleHub", "this read needs the OracleHub");
    }
    return hub;
  };

  // Realtime price feeds — a separate service (the EMA price-feed indexer) on a
  // separate transport (Hasura WS), so its own store + tail, isolated from the
  // order-book store above.
  const priceStore = new PriceFeedPriceStore.PriceStore();
  const priceFeed = new PriceFeedPriceFeed.PriceFeed({ getConfig, store: priceStore, dbg, infrastructure });
  const feedUrl = () => Config.resolvePriceFeed(config).url;
  // The quote the feed is pinned to (e.g. "USDC"). The feed indexes several
  // quotes per base, so every read passes this to resolve a base to one feed;
  // undefined leaves reads unfiltered (single-quote deployments only).
  const feedQuote = () => Config.resolvePriceFeed(config).quote;

  // Resolve a `{ pool } | { marketId }` target to a pool address (for candle /
  // stats reads). Prefers the indexer (authoritative for a marketId → pool), so
  // this works without a live watch running.
  const resolvePoolTarget = async (
    target: { pool?: string; marketId?: string },
    source: IndexerRead.Source = url,
  ): Promise<{ pool: string }> => {
    if (target.pool != null) return { pool: target.pool.toLowerCase() };
    if (target.marketId != null) {
      const m = await Markets.getBinaryMarket(target.marketId, source);
      if (!m) throw new InvalidInputError(`no binary market ${target.marketId}`);
      return { pool: m.poolAddress.toLowerCase() };
    }
    throw new InvalidInputError("needs a pool or marketId");
  };

  // A pool's tick/lot grid is admin-retunable but never changes per-order —
  // one eth_call per pool per client lifetime backs every stake/sell quote.
  // AsyncCache owns the sharing and the evict-on-reject (a transient RPC error
  // must not poison the pool).
  const _bookParamsCache = new AsyncCache<string, Orders.BinaryBookParams>();
  const bookParamsFor = (pool: string): Promise<Orders.BinaryBookParams> => {
    const key = pool.toLowerCase();
    return _bookParamsCache.getOrCreate(key, () => Orders.getBinaryBookParams(key as Address, getClient()));
  };

  // Resolve the live book + the store market (for decimals/pool) from a
  // {pool | marketId} key — the shared front half of the quote* methods.
  // marketId goes through the recycle-safe reader.
  const resolveLiveBinaryBook = (
    target: { pool?: string; marketId?: string },
    depth: number,
  ): { book: BinaryOrderBook; market: LiveMarket | null } => {
    if (target.marketId != null) {
      const id = target.marketId.toLowerCase();
      return {
        book: client.getLiveBinaryOrderBookByMarket(id, { depth }),
        market: store.markets.get(id) ?? null,
      };
    }
    if (target.pool != null) {
      return {
        book: client.getLiveBinaryOrderBook(target.pool, { depth }),
        market: store.marketByPool(target.pool),
      };
    }
    throw new InvalidInputError("needs a pool or marketId");
  };

  // The SomniaLend namespace, built lazily on first touch (it needs `client`,
  // which is still being defined below) and memoized — one binding per client.
  let lendClient: SomniaLendClient | undefined;
  let accountsClient: SmartAccounts.SmartAccountsClient | undefined;
  let accountOrdersOwner: AccountOrders.AccountOrdersOwner | undefined;
  let accountPositionsOwner: AccountPositions.AccountPositionsOwner | undefined;
  let accountBalancesOwner: AccountBalances.AccountBalancesOwner | undefined;
  let accountSpotOrdersOwner: AccountSpotOrders.AccountSpotOrdersOwner | undefined;
  let perpAdlQueueOwner: PerpAdlClient.PerpAdlQueueOwner | undefined;
  let accountOutcomePositionsOwner: AccountOutcomePositions.AccountOutcomePositionsOwner | undefined;
  // The error an indexer account-view read rejects with when `stopLive()` ends it.
  const accountViewLiveReset = (operation: string): IndexerUnavailableError =>
    new IndexerUnavailableError(
      operation,
      "live-reset",
      "stopLive() reset live reads while this account-view read was in flight",
      0,
      governor.stats().consecutiveFailures,
    );

  // The stop registries of the spot and perp markets, which a live orders view follows.
  // Market metadata, kept for a minute.
  let stopRegistriesRead:
    | { readonly atMs: number; readonly registries: Promise<ChainStops.StopRegistry[]> }
    | undefined;
  // What the last list left out, so a list that stays short warns once, not every minute.
  let stopRegistriesShort = "";
  const stopRegistries = (): Promise<ChainStops.StopRegistry[]> => {
    const nowMs = Date.now();
    if (stopRegistriesRead !== undefined && nowMs - stopRegistriesRead.atMs < STOP_REGISTRIES_KEPT_MS) {
      return stopRegistriesRead.registries;
    }
    const registries = Promise.all(
      (["SPOT", "PERP"] as const).map(async (marketType) => ({
        marketType,
        // One row past the cap says the cap cut the list.
        ...(await Markets.listMarketsChecked(
          { marketType, limit: MARKETS_PER_TYPE + 1 },
          { ...url, signal: readSignal() },
        )),
      })),
    ).then((lists) => {
      // A market the list leaves out, or whose row does not read, has its stops follow the indexer.
      const cut = lists
        .filter((list) => list.markets.length + list.dropped > MARKETS_PER_TYPE)
        .map((list) => list.marketType);
      const dropped = lists.reduce((sum, list) => sum + list.dropped, 0);
      const short = cut.length === 0 && dropped === 0 ? "" : `${cut.join(",")}:${dropped}`;
      if (short !== "" && short !== stopRegistriesShort) {
        dbg.warn("accountOrders", "some markets' stop registries are not followed; their stops follow the indexer", {
          cut,
          dropped,
        });
      }
      stopRegistriesShort = short;
      return ChainStops.registriesOf(lists.flatMap((list) => list.markets));
    });
    const read = { atMs: nowMs, registries };
    stopRegistriesRead = read;
    // A failed read is read again by the next caller, not served for a minute.
    registries.catch(() => {
      if (stopRegistriesRead === read) stopRegistriesRead = undefined;
    });
    return registries;
  };

  // Every market row the client hands out names its chain (BaseMarket.chainId):
  // the data-first mappers know the indexer, not the chain, so the boundary
  // stamps it here — once, for the facade and every engine-tier caller.
  const chainId = config.chain.id;
  const stampRow = <T extends Markets.Market>(m: T | null): T | null =>
    m === null ? null : Markets.withChain(chainId, m);
  const stampRows = <T extends Markets.Market>(rows: T[]): T[] => Markets.withChainRows(chainId, rows);

  // Every main-indexer binding is instantiated with its own explicit request context.
  // Only opt-in observations normalize block failures and inherit observation cancellation.
  const bindReads = (
    url: IndexerRead.RequestContext,
    timestamp: Activity.BlockTimestampResolver = url.observe
      ? async (blockNumber) => (await SyncStatus.readBlock(getClient(), { blockNumber }, url.signal)).timestamp
      : resolveBlockTimestamp,
  ): Observed.ObservedReadMethods => ({
    quoteBinaryStake: async (params): Promise<DerivedReads.BinaryStakeQuote | null> => {
      const { book, market } = resolveLiveBinaryBook(params, params.depth ?? 10);
      // The grid read needs the pool address — the store market carries it on
      // the marketId path; fall back to the indexer so a stake quote still
      // works before the first live snapshot lands.
      const pool = params.pool ?? market?.poolAddress ?? (await resolvePoolTarget(params, url)).pool;
      const grid = await bookParamsFor(pool);
      const oneCollateral = 10n ** BigInt(market?.quoteDecimals ?? Store.DECIMALS);
      return DerivedReads.quoteBinaryStakeOverBook(book, params.side, params.stake, oneCollateral, {
        ...grid,
        slippageBps: params.slippageBps,
        slippageMinTicks: params.slippageMinTicks,
      });
    },
    quoteBinarySell: async (params): Promise<DerivedReads.BinarySellQuote | null> => {
      const { book, market } = resolveLiveBinaryBook(params, params.depth ?? 10);
      const pool = params.pool ?? market?.poolAddress ?? (await resolvePoolTarget(params, url)).pool;
      const grid = await bookParamsFor(pool);
      const oneCollateral = 10n ** BigInt(market?.quoteDecimals ?? Store.DECIMALS);
      return DerivedReads.quoteBinarySellOverBook(book, params.side, params.quantity, oneCollateral, {
        ...grid,
        slippageBps: params.slippageBps,
        slippageMinTicks: params.slippageMinTicks,
      });
    },
    getMarketStats24h: async (target): Promise<MarketStats24h> => {
      const { pool } = await resolvePoolTarget(target, url);
      // 1h candles over the trailing 24h — 24 buckets, cheaper than scanning fills.
      const nowSec = Math.floor(Date.now() / 1000);
      const candles = await Candles.getCandlesInWindow(
        pool,
        3600,
        { from: nowSec - 86_400, to: nowSec, market: target.marketId },
        url,
      );
      return DerivedReads.marketStats24hFromCandles(candles, nowSec);
    },
    getBinaryPositionPnL: async (account, marketId): Promise<BinaryPositionPnL> => {
      const market = await Markets.getBinaryMarket(marketId, url);
      if (!market) {
        throw new InvalidInputError(`getBinaryPositionPnL — no binary market ${marketId}`);
      }
      const oneCollateral = 10n ** BigInt(market.quoteDecimals ?? Store.DECIMALS);
      // Top-of-book for the mark clamp. An indexer-only client (no chain access
      // configured) marks on lastPrice alone, as documented; a chain read that
      // FAILS propagates — marking on a stale lastPrice because the node was down
      // would present a different markValue/unrealizedPnl as the real one.
      const readBookTop = async (): Promise<Units.YesBookTop | undefined> => {
        let failure: SomniaMarketsSocketFailure | undefined;
        const observed = (error: SomniaMarketsSocketFailure): void => {
          failure ??= error;
        };
        try {
          const pair = getClients();
          const selected =
            pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure(observed) ?? pair.decorated;
          const { check } = getGenesis();
          const bookClient = check ? Client.withGenesisCheck(selected, () => check(observed)) : selected;
          const book = await Orders.getBinaryOrderBook(
            market.poolAddress,
            { decimals: market.quoteDecimals ?? Store.DECIMALS, depth: 1 },
            bookClient,
          );
          return { bestBid: book.yesBids[0]?.price, bestAsk: book.yesAsks[0]?.price };
        } catch (e) {
          if (failure !== undefined && Object.is(e, failure)) throw e;
          if (e instanceof NotConfiguredError) return undefined;
          throw e;
        }
      };
      const [fills, actions, balances, bookTop] = await Promise.all([
        // Scope the fills by MARKET, not just by pool: a binary pool is recycled
        // across successive markets, so a pool-only predicate also returns the
        // earlier markets' fills — and it does so BEFORE `limit` applies, which
        // no post-filter can repair. The pool predicate rides along because
        // `Fill` is indexed on `(pool, timestamp)` and `market_id` is not.
        Fills.getUserFills(account, { market: marketId, pool: market.poolAddress, limit: 1000 }, url),
        Router.getRouterActions(account, { market: marketId, limit: 1000 }, url),
        BinaryPortfolio.getOutcomeBalances(account, market.marketAddress, url),
        readBookTop(),
      ]);
      const events = DerivedReads.pnlEventsForIndexed("getBinaryPositionPnL", account, fills, actions);
      return DerivedReads.computePositionPnL(
        events,
        { balanceYes: BigInt(balances.yes), balanceNo: BigInt(balances.no) },
        market,
        oneCollateral,
        { bookTop },
      );
    },
    getOpenPositionsWithPnL: async (account): Promise<BinaryPortfolio.OpenPositionPnL[]> => {
      // The account's open positions (non-zero balances) — each carries its
      // market's id/pool/quoteDecimals/lastPrice/winningOutcome/voided; no
      // orders/trades pulled (ordersLimit/tradesLimit 0).
      const { positions } = await BinaryPortfolio.getPortfolio(account, { ordersLimit: 0, tradesLimit: 0 }, url);
      if (positions.length === 0) return [];

      // Batch the shared inputs: the user's fills + router actions in one query
      // each, plus one top-of-book read for every open market — a bounded number
      // of round-trips, not a per-position loop. The pure fold then groups +
      // marks each position (see computeOpenPositionsPnL).
      //
      // BOTH cost-basis reads are scoped to the OPEN markets. Capped at 1000,
      // an account-wide read drops the OLDEST rows first — the buys and mints
      // that establish the basis — so a busy wallet would be priced off a
      // partial book. Narrowing keeps each cap on rows the fold will use.
      const marketIds = [...new Set(positions.map((p) => p.market.id))];
      // Mark from CHAIN, at one pinned block, matching getBinaryPositionPnL. Both
      // methods converge on the same markYesPrice and the same PnL fold, so two
      // sources meant the same position could report two different unrealizedPnl
      // values whenever the indexer lagged.
      //
      // An indexer-only client (no chain access configured) marks on lastPrice
      // alone, as documented; a chain read that FAILS propagates — the same
      // policy getBinaryPositionPnL applies.
      // `asAddress` is the same indexer-row → `Address` seam `toMarket` uses:
      // `PortfolioMarket.poolAddress` is the indexer's `string` column, which the
      // handlers always write as a lowercased 0x address.
      const marketRows = [...new Map(positions.map((p) => [p.market.id.toLowerCase(), p.market])).values()].map(
        (m) => ({ id: m.id, poolAddress: Markets.asAddress(m.poolAddress) }),
      );
      const readBookTops = async (): Promise<Record<string, BookTop>> => {
        let failure: SomniaMarketsSocketFailure | undefined;
        const observed = (error: SomniaMarketsSocketFailure): void => {
          failure ??= error;
        };
        try {
          const pair = getClients();
          const selected =
            pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure(observed) ?? pair.decorated;
          const { check } = getGenesis();
          const bookClient = check ? Client.withGenesisCheck(selected, () => check(observed)) : selected;
          return (await Orders.getBookTopsOnchain(marketRows, bookClient)).tops;
        } catch (e) {
          if (failure !== undefined && Object.is(e, failure)) throw e;
          if (e instanceof NotConfiguredError) return {};
          throw e;
        }
      };
      const [fills, actions, bookTops] = await Promise.all([
        Fills.getUserFills(account, { markets: marketIds, limit: 1000 }, url),
        Router.getRouterActions(account, { markets: marketIds, limit: 1000 }, url),
        readBookTops(),
      ]);
      return BinaryPortfolio.computeOpenPositionsPnL(account, positions, fills, actions, bookTops);
    },
    getClaimable: async (account): Promise<ClaimablePosition[]> => {
      const portfolio = await BinaryPortfolio.getPortfolio(account, { ordersLimit: 0, tradesLimit: 0 }, url);
      if (portfolio.positionsNextOffset !== null) {
        throw new IncompletePortfolioError(account.toLowerCase(), 200, portfolio.positionsNextOffset);
      }
      return claimableForPositions(portfolio.positions, url);
    },
    getClaimablePage: async (account, opts = {}): Promise<BinaryPortfolio.ClaimablePage> => {
      const portfolio = await BinaryPortfolio.getPortfolio(
        account,
        {
          ordersLimit: 0,
          tradesLimit: 0,
          positionsLimit: opts.limit,
          positionsOffset: opts.offset,
        },
        url,
      );
      return {
        claims: await claimableForPositions(portfolio.positions, url),
        nextOffset: portfolio.positionsNextOffset,
      };
    },
    listMarkets: (opts) => Markets.listMarkets(opts, url).then(stampRows),
    listRegistryMarkets: () => Markets.listRegistryMarkets(url).then(stampRows),
    listRegistryMarketsChecked: () =>
      Markets.listRegistryMarketsChecked(url).then((r) => ({ ...r, markets: stampRows(r.markets) })),
    countMarkets: (opts) => Markets.countMarkets(opts ?? {}, url, indexerHeaders),
    countMarketsBounded: (opts) => Markets.countMarketsBounded(opts ?? {}, url, indexerHeaders),
    getMarket: (id) => Markets.getMarket(id, url).then(stampRow),
    listBinaryMarkets: (opts) => Markets.listBinaryMarkets(opts, url).then(stampRows),
    listLiveBinaryMarkets: (filter) => Markets.listLiveBinaryMarkets(filter, url).then(stampRows),
    listBinaryVenueIds: () => Markets.listBinaryVenueIds(url),
    listBinaryAssets: () => Markets.listBinaryAssets(url),
    countBinaryMarkets: (opts) => Markets.countBinaryMarkets(opts, url, indexerHeaders),
    countBinaryMarketsBounded: (opts) => Markets.countBinaryMarketsBounded(opts, url, indexerHeaders),
    listPastBinaryMarkets: (opts) => Markets.listPastBinaryMarkets(opts, url).then(stampRows),
    getBinaryMarket: (id) => Markets.getBinaryMarket(id, url).then(stampRow),
    getBinaryMarketByAddress: (marketAddress) => Markets.getBinaryMarketByAddress(marketAddress, url).then(stampRow),
    getMarketFees: (id) => Markets.getMarketFees(id, url),
    listSpotMarkets: (opts) => Markets.listSpotMarkets(opts, url).then(stampRows),
    getSpotMarket: (id) => Markets.getSpotMarket(id, url).then(stampRow),
    getMarketStatusHistory: (marketId) => Markets.getMarketStatusHistory(marketId, url),
    listPerpMarkets: (opts) => Markets.listPerpMarkets(opts, url).then(stampRows),
    getPerpMarket: (id) => Markets.getPerpMarket(id, url).then(stampRow),
    getCandles: (pool, interval, opts) => Candles.getCandles(pool, interval, opts, url),
    getMarketActivity: (market, opts) => Activity.getMarketActivity(market, opts, url),
    getTransactionActivity: (txHash, opts) => Activity.getTransactionActivity(txHash, resolveTxAnchor, opts, url),
    getBlockActivity: (blockNumber, opts) => Activity.getBlockActivity(blockNumber, timestamp, opts, url),
    getLatestActiveBlock: () => Activity.getLatestActiveBlock(url),
    getAdjacentActiveBlocks: (blockNumber, opts) => Activity.getAdjacentActiveBlocks(blockNumber, timestamp, opts, url),
    getFills: (pool, opts) => Fills.getFills(pool, opts, url),
    getTradeContext: (id) => Fills.getTradeContext(id, url),
    getUserFills: (account, opts) => Fills.getUserFills(account, opts, url),
    getUserFillsPage: (account, opts) =>
      Fills.getUserFillsPage(account, opts, {
        source: url,
        chainId: config.chain.id,
        signal: url.signal,
        headers: indexerHeaders,
      }),
    getFillsPage: (opts) =>
      Fills.getFillsPage(opts, {
        source: url,
        chainId: config.chain.id,
        signal: url.signal,
        headers: indexerHeaders,
      }),
    getLatestFillBlock: (marketType) => Fills.getLatestFillBlock(marketType, url, indexerHeaders),
    getFill: (id) => Fills.getFill(id, url),
    getOrderFills: (pool, orderId, opts) => Fills.getOrderFills(pool, orderId, opts ?? {}, url),
    getOrder: (pool, orderId) => Orders.getOrder(pool, orderId, url),
    getOpenOrders: (owner, opts) => Orders.getOpenOrders(owner, opts, url),
    getOrders: (owner, opts) => Orders.getOrders(owner, opts, url),
    listSweepableOrders: (opts) => Orders.listSweepableOrders(opts ?? {}, url),
    getOutcomeBalances: (account, marketAddress) => BinaryPortfolio.getOutcomeBalances(account, marketAddress, url),
    getPortfolio: (account, opts) => BinaryPortfolio.getPortfolio(account, opts, url),
    getSpotPortfolio: (account, opts) => SpotPortfolio.getSpotPortfolio(account, opts, url),
    getSpotStopOrders: (account, opts) => SpotStops.getSpotStopOrders(account, opts, url),
    getPerpPortfolio: (account, opts) => PerpPortfolio.getPerpPortfolio(account, opts, url),
    listPerpStopOrders: (opts) => PerpStops.listPerpStopOrders(opts ?? {}, url),
    listPerpOrderHistory: (account, opts) => PerpPortfolio.listPerpOrderHistory(account, opts ?? {}, url),
    getMarketByPool: (pool) => Pools.getMarketByPool(pool, url).then(stampRow),
    listMarketsByPool: (pool, opts) => Pools.listMarketsByPool(pool, opts ?? {}, url),
    countOrders: (owner, opts) => Orders.countOrders(owner, opts ?? {}, url, indexerHeaders),
    countUserFills: (account, opts) => Fills.countUserFills(account, opts ?? {}, url, indexerHeaders),
    getRouterActions: (account, opts) => Router.getRouterActions(account, opts ?? {}, url),
    getMarketResolution: (marketId) => BinarySettlement.getMarketResolution(marketId, url),
    listMarketResolutionEvents: (opts) => BinarySettlement.listMarketResolutionEvents(opts ?? {}, url),
    listMarketReferenceLinks: (opts) => BinarySettlement.listMarketReferenceLinks(opts ?? {}, url),
    getOpeningPrices: (marketIds) => Markets.getOpeningPrices(marketIds, url),
    getResolutionPrices: (marketIds) => Markets.getResolutionPrices(marketIds, url),
    getBookTops: (marketIds) => Orders.getBookTops(marketIds, url),
    listProtocolFees: (opts) => Fees.listProtocolFees(opts ?? {}, url),
    listBuilderFees: (opts) => Fees.listBuilderFees(opts ?? {}, url),
    listSettlementFees: (opts) => Fees.listSettlementFees(opts ?? {}, url),
    listBuilderApprovals: (opts) => Fees.listBuilderApprovals(opts ?? {}, url),
    getVaultPayoutFallbacks: (owner, opts) => BinaryPortfolio.getVaultPayoutFallbacks(owner, opts ?? {}, url),
    listVaultPayoutFallbacks: (opts) => BinaryPortfolio.listVaultPayoutFallbacks(opts ?? {}, url),
    getFundingPayments: (account, opts) => PerpHistory.getFundingPayments(account, opts ?? {}, url),
    getMarginEvents: (account, opts) => PerpHistory.getMarginEvents(account, opts ?? {}, url),
    listLiquidations: (opts) => PerpHistory.listLiquidations(opts ?? {}, url),
    getLiquidations: (opts) => PerpHistory.getLiquidations(opts ?? {}, url),
    getFundingRateHistory: (pool, opts) => PerpHistory.getFundingRateHistory(pool, opts ?? {}, url),
    listFundingRateHistory: (pool, opts) => PerpHistory.listFundingRateHistory(pool, opts ?? {}, url),
    listFundingRateCandles: (pool, intervalSeconds, opts) =>
      PerpHistory.listFundingRateCandles(pool, intervalSeconds, opts ?? {}, url),
    getOpenInterestHistory: (pool, opts) => PerpHistory.getOpenInterestHistory(pool, opts ?? {}, url),
    listPerpFees: (opts) => PerpHistory.listPerpFees(opts ?? {}, url),
    listPerpOrderRejections: (opts) => PerpHistory.listPerpOrderRejections(opts ?? {}, url),
    listPerpPositionChanges: (opts) => PerpHistory.listPerpPositionChanges(opts ?? {}, url),
    listPerpPositionChangesForFills: (account, fills) =>
      PerpHistory.listPerpPositionChangesForFills(account, fills, url),
    listPerpPositions: (account, opts) => PerpState.listPerpPositions(account, opts ?? {}, url),
    listPerpInsuranceFundEvents: (opts) => PerpSystem.listPerpInsuranceFundEvents(opts ?? {}, url),
    listPerpWalletLinkEvents: (opts) => PerpLinkedWallet.listPerpWalletLinkEvents(opts ?? {}, url),
    listPerpMarginPulls: (opts) => PerpLinkedWallet.listPerpMarginPulls(opts ?? {}, url),
    listPerpMainFundingEvents: (opts) => PerpLinkedWallet.listPerpMainFundingEvents(opts ?? {}, url),
    listPoolBindings: (pool, opts) => Pools.listPoolBindings(pool, opts ?? {}, url),
    getPool: (address) => Pools.getPool(address, url),
    listOperators: (opts) => OperatorAdmin.listOperators(opts ?? {}, url),
    countOperators: (opts) => OperatorAdmin.countOperators(opts ?? {}, url, indexerHeaders),
    getOperator: (operatorId) => OperatorAdmin.getOperator(operatorId, url),
    listVenues: (opts) => OperatorAdmin.listVenues(opts ?? {}, url),
    countVenues: (opts) => OperatorAdmin.countVenues(opts ?? {}, url, indexerHeaders),
    getVenue: (venueId) => OperatorAdmin.getVenue(venueId, url),
    listMarketCreators: (opts) => MarketCreatorAdmin.listMarketCreators(opts ?? {}, url),
    getMarketCreator: (creator) => MarketCreatorAdmin.getMarketCreator(creator, url),
    listOracleAdapters: (opts) => MarketCreatorAdmin.listOracleAdapters(opts ?? {}, url),
    getOracleAdapter: (adapter) => MarketCreatorAdmin.getOracleAdapter(adapter, url),
    listSeries: (opts) => MarketCreatorAdmin.listSeries(opts ?? {}, url),
    listSeriesLatestMarkets: (opts) => MarketCreatorAdmin.listSeriesLatestMarkets(opts ?? {}, url),
    getSeries: (creator, seriesId) => MarketCreatorAdmin.getSeries(creator, seriesId, url),
    getOracleQuestion: (oracleQuestionId) => OracleHub.getOracleQuestion(oracleQuestionId, url),
    listOracleQuestions: (opts) => OracleHub.listOracleQuestions(opts ?? {}, url),
    getOperatorHubAccount: (operatorId) => OracleHub.getOperatorHubAccount(operatorId, url),
    listOperatorHubAccounts: (opts) => OracleHub.listOperatorHubAccounts(opts ?? {}, url),
    listOracleBinds: (opts) => OracleHub.listOracleBinds(opts ?? {}, url),
    listOracleCallbacks: (opts) => OracleHub.listOracleCallbacks(opts ?? {}, url),
  });

  const readFreshness: FreshnessRead = (chainId, observed) =>
    SyncStatus.getIndexerFreshness(chainId, { ...url, signal: readSignal() }, () => {
      if (!observed) return getClient();
      const pair = getClients();
      const selected = pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure(observed) ?? pair.decorated;
      const { check } = getGenesis();
      return check ? Client.withGenesisCheck(selected, () => check(observed)) : selected;
    });

  const balanceClient = (observed?: (failure: SomniaMarketsSocketFailure) => void): PublicClient => {
    if (!observed) return getClient();
    const pair = getClients();
    const selected = pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure(observed) ?? pair.decorated;
    const { check } = getGenesis();
    return check ? Client.withGenesisCheck(selected, () => check(observed)) : selected;
  };
  const readBalances: BalanceReads = {
    native: (address, observed) => System.getNativeBalance(address, balanceClient(observed)),
    erc20: (token, address, observed) => Balances.getErc20Balance(token, address, balanceClient(observed)),
  };

  const claimableForPositions = async (
    positions: BinaryPortfolio.PortfolioPosition[],
    source: IndexerRead.RequestContext,
  ): Promise<ClaimablePosition[]> => {
    // Only settled markets (Resolved / Voided / Finalized) hold claimable value.
    const settled = positions.filter((p) => p.market.voided || p.market.winningOutcome != null);
    const isWinner = (p: (typeof settled)[number]) => !p.market.voided && p.market.winningOutcome === p.outcomeIndex;
    // Fee only bites a WINNER. Read it once per unique winning market, with at
    // most CLAIMABLE_FEE_READS reads in flight. A failed read stops new reads
    // and rejects the call with that read's error.
    const winners = [...new Set(settled.filter(isWinner).map((p) => p.market.id))];
    const feeBps = new Map<string, bigint>();
    let next = 0;
    let failed = false;
    const readFees = async (): Promise<void> => {
      while (!failed && next < winners.length) {
        const id = winners[next++] ?? unreachable("next is below winners.length");
        try {
          const fees = await Markets.getMarketFees(id, source);
          const fee = fees?.settlementFeeBps;
          if (fee != null && !/^[0-9]+$/.test(fee)) {
            throw new IndexerError("getClaimable", `market ${id} has an invalid indexed settlement fee`);
          }
          feeBps.set(id, fee != null ? BigInt(fee) : 0n);
        } catch (e) {
          failed = true;
          throw e;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CLAIMABLE_FEE_READS, winners.length) }, readFees));
    // The mapping lives in derivedReads so it can be tested without a client
    // — every field it drops is a silent revert (see `claimableInputFor`).
    for (const position of settled) {
      if (!/^[0-9]+$/.test(position.balance)) {
        throw new IndexerError("getClaimable", `market ${position.market.id} has an invalid indexed outcome balance`);
      }
    }
    const inputs: ClaimableInput[] = settled.map((p) =>
      DerivedReads.claimableInputFor(
        p,
        isWinner(p) ? (feeBps.get(p.market.id) ?? unreachable("every winner's fee was read")) : 0n,
      ),
    );
    return DerivedReads.claimableFrom(inputs);
  };

  const client: SomniaMarketsClientWithObservations &
    ValidatingClient &
    ResolvingClient &
    ScopedOrderClient &
    GenerationCheckingClient = {
    [checkBinaryPoolGeneration]: (pool, marketAddress) =>
      Markets.assertBinaryPoolGeneration(pool, marketAddress, getClient()),
    [scopedOpenOrders]: async (owner, type, scope, limit, signal) => {
      const linked = GraphqlBoundary.linkSignals(readSignal(), signal);
      const source = { ...url, signal: linked.signal };
      const options = limit === undefined ? {} : { ordersLimit: limit };
      try {
        if (type === "BINARY") {
          const orders = await BinaryPortfolio.getScopedOpenOrders(owner, options, source, scope);
          return { type, orders };
        }
        if (type === "SPOT") {
          const orders = await SpotPortfolio.getScopedOpenOrders(owner, options, source, scope);
          return { type, orders };
        }
        const orders = await PerpPortfolio.getScopedOpenOrders(owner, options, source, scope);
        return { type, orders };
      } finally {
        linked.dispose();
      }
    },
    [resolveMarketBatch]: async (ids, signal) => {
      const linked = GraphqlBoundary.linkSignals(readSignal(), signal);
      try {
        return await Markets.resolveMarkets(ids, { ...url, signal: linked.signal });
      } finally {
        linked.dispose();
      }
    },
    [validateConnection]: async () => {
      await getGenesis().check?.();
    },
    ...bindReads(url),
    // Not an observed read: the result keeps rows held from earlier reads, so no
    // response watermark of this call describes it.
    getUserFillHistory: (account, opts) =>
      Fills.getUserFillHistory(account, opts, {
        source: url,
        chainId: config.chain.id,
        signal: url.signal,
        headers: indexerHeaders,
      }),
    createObservedReads: () => Observed.createObservedReads({ ...url, signal: readSignal() }, bindReads, getClient),
    getIndexerFreshness: (chainId) => readFreshness(chainId),
    config,
    // The undecorated client, on the SAME socket — deliberately a method, so
    // reaching outside the SDK's error contract is an explicit act (and so the
    // socket-opening side effect isn't hidden behind a field read).
    getViemClient: () => getClients().raw,
    get lend() {
      lendClient ??= Lend.createLendWithDeps(
        { getConfig, getClient, writerRuntime, getReceiptSignal: readSignal },
        config.addresses?.lend ?? {},
      );
      return lendClient;
    },
    get accounts() {
      accountsClient ??= SmartAccounts.createSmartAccountsWithDeps({ getConfig, getClient });
      return accountsClient;
    },
    get accountOrders() {
      accountOrdersOwner ??= AccountOrders.createAccountOrdersWithDeps({
        chainId: config.chain.id,
        // Taken once per read, so a read belongs to the lifecycle it started in.
        context: () => ({ ...url, signal: readSignal() }),
        ownerSignal: config.signal,
        liveReset: accountViewLiveReset,
        // `getClient` throws when the client has no chain transport; the async wrapper
        // turns that into the rejection the enrichment reports as `chainUnavailable`.
        readPerpStops: async (refs) => PerpStops.getPerpStopOrders(refs, getClient()),
        wsUrl: Config.resolveIndexerWsUrl(config),
        backoffMs: (attempt) => Config.nextBackoffDelayMs(attempt, Math.random(), config.indexerLimits),
        warn: (message, data) => dbg.warn("accountOrders", message, data),
        // A live view's stops follow the stop registries' events on the engine's own
        // chain WebSocket, ahead of the indexer. A client without one follows the indexer.
        ...(configuredWsUrl()
          ? {
              chainStops: {
                registries: () => stopRegistries(),
                watch: (filters, onLog, onError, onOpen) =>
                  Client.subscribeLogs(getClients().raw, filters, onLog, onError, onOpen),
                logs: (filters, fromBlock, toBlock) => Client.readLogs(getClient(), filters, fromBlock, toBlock),
                head: () => getClient().getBlockNumber({ cacheTime: 0 }),
                blockTime: async (blockNumber) => (await getClient().getBlock({ blockNumber })).timestamp,
              },
            }
          : {}),
      });
      return accountOrdersOwner.client;
    },

    get accountPositions() {
      accountPositionsOwner ??= AccountPositions.createAccountPositionsWithDeps({
        chainId: config.chain.id,
        ownerSignal: config.signal,
        // Resolved per read: `getClient` throws NotConfiguredError when the client has
        // no chain transport, which the read then rejects with.
        chain: () => AccountPositions.chainOf(getClient()),
        // The raw socket client, as the heads stream uses: subscriptions ride the
        // engine's own chain WebSocket.
        watch: (marginBank, account, onLog, onError, onOpen) =>
          Client.subscribeAccountLogs(getClients().raw, marginBank, account, onLog, onError, onOpen),
        // Pushes ride the same socket. The price feed's writes push marks; without it,
        // pushes come on the account's events only.
        watchPushes: (request, onResults, onEnd, onOpen) =>
          Client.subscribeSomniaWatch(getClients().raw, request, onResults, onEnd, onOpen),
        ...(config.addresses?.priceFeedScheduler === undefined
          ? {}
          : { priceFeed: config.addresses.priceFeedScheduler }),
        backoffMs: (attempt) => Config.nextBackoffDelayMs(attempt, Math.random(), config.indexerLimits),
        warn: (message, data) => dbg.warn("accountPositions", message, data),
      });
      return accountPositionsOwner.client;
    },

    get accountBalances() {
      accountBalancesOwner ??= AccountBalances.createAccountBalancesWithDeps({
        chainId: config.chain.id,
        ownerSignal: config.signal,
        // Resolved per read: `getClient` throws NotConfiguredError without a chain transport.
        chain: () => AccountPositions.chainOf(getClient()),
        // Transfers ride the engine's own chain WebSocket, as the positions events do.
        watch: (tokens, accounts, onLog, onError, onOpen) =>
          Client.subscribeTransferLogs(getClients().raw, tokens, accounts, onLog, onError, onOpen),
        backoffMs: (attempt) => Config.nextBackoffDelayMs(attempt, Math.random(), config.indexerLimits),
        warn: (message, data) => dbg.warn("accountBalances", message, data),
      });
      return accountBalancesOwner.client;
    },

    get accountSpotOrders() {
      accountSpotOrdersOwner ??= AccountSpotOrders.createAccountSpotOrdersWithDeps({
        chainId: config.chain.id,
        ownerSignal: config.signal,
        lifecycle: readSignal,
        // Resolved per read: `getClient` throws NotConfiguredError without a chain transport.
        chain: () => AccountPositions.chainOf(getClient()),
        // Discovery follows the read's cancellation and the owner's live lifecycle.
        // A shared cached promise cannot carry one account's cancellation into another.
        spotPools: async (signal) => {
          const lifecycle = readSignal();
          const linked = GraphqlBoundary.linkSignals(lifecycle, signal);
          try {
            const pools = await Pools.poolsOfType("SPOT", { ...url, poolCache: undefined, signal: linked.signal });
            linked.signal?.throwIfAborted();
            return pools.map((pool) => {
              if (!isAddress(pool, { strict: false })) {
                throw new IndexerError("PoolsByType", `the indexer listed a spot pool that is not an address: ${pool}`);
              }
              return pool;
            });
          } catch (error) {
            signal.throwIfAborted();
            config.signal?.throwIfAborted();
            if (lifecycle?.aborted) throw accountViewLiveReset("PoolsByType");
            throw error;
          } finally {
            linked.dispose();
          }
        },
        // The pools' order events ride the engine's own chain WebSocket.
        watch: (filters, onLog, onError, onOpen) =>
          Client.subscribeLogs(getClients().raw, filters, onLog, onError, onOpen),
        backoffMs: (attempt) => Config.nextBackoffDelayMs(attempt, Math.random(), config.indexerLimits),
        warn: (message, data) => dbg.warn("accountSpotOrders", message, data),
      });
      return accountSpotOrdersOwner.client;
    },

    /** Built on first use. Nothing is read or watched until a caller asks. */
    get perpAdlQueue() {
      perpAdlQueueOwner ??= PerpAdlClient.createPerpAdlQueueWithDeps({
        chainId: config.chain.id,
        ownerSignal: config.signal,
        // Resolved per read: `getClient` throws NotConfiguredError without a chain transport.
        client: getClient,
        // The bank's queue-moving events ride the engine's own chain WebSocket, as the account views' do.
        watch: (marginBank, pool, onLog, onError, onOpen) =>
          Client.subscribeAdlQueueLogs(getClients().raw, marginBank, pool, onLog, onError, onOpen),
        backoffMs: (attempt) => Config.nextBackoffDelayMs(attempt, Math.random(), config.indexerLimits),
        warn: (message, data) => dbg.warn("perpAdlQueue", message, data),
      });
      return perpAdlQueueOwner.client;
    },

    get accountOutcomePositions() {
      accountOutcomePositionsOwner ??= AccountOutcomePositions.createAccountOutcomePositionsWithDeps({
        chainId: config.chain.id,
        ownerSignal: config.signal,
        // Taken once per read, so a read belongs to the lifecycle it started in.
        lifecycle: readSignal,
        liveReset: accountViewLiveReset,
        warn: (message, data) => dbg.warn("accountOutcomePositions", message, data),
        request: (document, variables, options) => IndexerRead.gqlRequest(document, variables, url, undefined, options),
      });
      return accountOutcomePositionsOwner.client;
    },

    watchMarket: (pool, opts) => tail.watchMarket(pool, opts),
    watchMarkets: (opts) => tail.watchAllMarkets(opts?.discover ?? false),
    watchUser: (user) => tail.watchUser(user),
    watchPerpMarkets: (opts) => tail.watchPerpMarkets(opts),
    getWatchStatus: (pool) => tail.getWatchStatus(pool),
    getPerpPlaneStatus: () => tail.getPerpPlaneStatus(),
    stopLive: () => {
      let failure: SomniaMarketsSocketFailure | undefined;
      const attempt = (cleanup: () => void): void => {
        try {
          cleanup();
        } catch (error) {
          failure ??= OwnedWebSocket.failure(error, "stop live RPC work");
        }
      };
      url.poolCache?.clear();
      // Forget proven `_aggregate` absence, so a permission change is picked up now.
      url.aggregateSupport?.clear();
      // Queued and backing-off reads wait locally, so nothing else settles them (SDK-OWN-004).
      // Transient: this client is reusable straight after, so the reason must not
      // read as terminal.
      attempt(() =>
        governor.close(
          (operation) =>
            new IndexerUnavailableError(
              operation,
              "live-reset",
              "stopLive() reset live reads while this read was queued or backing off",
              0,
              // The governor's own count, so the diagnostic matches its state (SDK-ERR-004).
              governor.stats().consecutiveFailures,
            ),
        ),
      );
      attempt(() => readController.abort());
      attempt(() => readLink.dispose());
      readController = new AbortController();
      readLink = GraphqlBoundary.linkSignals(config.signal, readController.signal);
      attempt(() => tail.stopLive());
      // Live account views end with `closed`, and their stream socket closes.
      attempt(() => accountOrdersOwner?.stopLive());
      attempt(() => accountPositionsOwner?.stopLive());
      attempt(() => accountBalancesOwner?.stopLive());
      attempt(() => accountSpotOrdersOwner?.stopLive());
      attempt(() => perpAdlQueueOwner?.stopLive());
      attempt(() => accountOutcomePositionsOwner?.stopLive());
      attempt(() => priceFeed.stopAll());
      // The chain socket is this client's to release (SDK-OWN-004): nothing
      // else holds it, and viem's keepAlive interval on it would otherwise
      // keep a Node process alive forever. Dropping the memo with it is what
      // keeps the instance usable afterwards — the next chain read builds a
      // fresh pair (and a fresh socket ref) rather than reusing a closed one.
      const released = clients;
      clients = undefined;
      genesis = undefined;
      attempt(() => released?.close());
      if (failure) throw failure;
    },
    subscribeLive: (listener) => store.subscribe(listener),
    getLiveStatus: () => store.getStatus(),
    getSeedStatus: (pool) => store.seedStatusByPool.get(pool.toLowerCase()) ?? null,
    isTailing: () => store.getStatus().mode === "tailing",
    getLiveMarkets: () => store.allMarkets(),
    getLiveMarketByPool: (pool) => store.marketByPool(pool),
    getLiveMarketByAddress: (addr) => store.marketByAddress(addr),
    getLiveFills: (pool, opts) => store.recentFills(pool, opts?.limit ?? 40),
    getLiveFundingUpdates: (pool, opts) => store.fundingUpdatesFor(pool, opts?.limit ?? 500),
    listLiveLiquidations: (opts) => store.liquidationsFor(opts ?? {}, opts?.limit ?? 50),
    listLiveFundingPayments: (opts) => store.fundingPaymentsFor(opts ?? {}, opts?.limit ?? 50),
    getLiveUserFills: (pool, user, opts) => store.userFills(pool, user, opts?.limit ?? 50),
    getLiveUserOrders: (pool, user, opts) => store.userOrders(pool, user, opts?.limit ?? 100),
    getLiveBinaryOrderBook: (pool, opts) => {
      const depth = opts?.depth ?? 10;
      // Memoized against the book it is built from, so the reference is stable
      // for useSyncExternalStore AND cannot outlive the levels underneath it —
      // a book drops an expired level as soon as the clock passes it, without
      // waiting for the next commit.
      return store.selectFromBook(pool, `bookyn:${depth}`, store.bookLevels(pool, depth), (levels) => {
        const { bids, asks, blockNumber } = levels;
        const m = store.marketByPool(pool);
        const oneBase = 10n ** BigInt(m?.quoteDecimals ?? Store.DECIMALS);
        return { ...Orders.toBinaryBook(bids, asks, oneBase), ...(blockNumber === undefined ? {} : { blockNumber }) };
      });
    },
    getLiveBinaryOrderBookByMarket: (marketId, opts) => {
      const depth = opts?.depth ?? 10;
      const id = marketId.toLowerCase();
      // Recycle-safe: null when `marketId` is no longer the pool's current
      // binding (stale/ended) — render an empty book, never the successor's.
      // The view is held under the market's own pool, so the pool's purge drops
      // it even after the pool moves to a later market.
      const pool = store.markets.get(id)?.poolAddress;
      return store.selectFromBook(pool, `bookynm:${id}:${depth}`, store.bookLevelsByMarket(id, depth), (levels) => {
        if (!levels) return EMPTY_BINARY_BOOK;
        const oneBase = 10n ** BigInt(store.markets.get(id)?.quoteDecimals ?? Store.DECIMALS);
        return {
          ...Orders.toBinaryBook(levels.bids, levels.asks, oneBase),
          ...(levels.blockNumber === undefined ? {} : { blockNumber: levels.blockNumber }),
        };
      });
    },
    getLiveSpotOrderBook: (pool, opts) => store.bookLevels(pool, opts?.depth ?? 12),

    // ---- P1 derived reads (analytics bundle; derived from existing data) ----
    quoteBinaryOrder: (params): BinaryOrderQuote => {
      const depth = params.depth ?? 10;
      // Resolve the live book + the market (for its collateral decimals). Either
      // a pool or a marketId keys it; marketId goes through the recycle-safe reader.
      let book;
      let market: LiveMarket | null;
      if (params.marketId != null) {
        const id = params.marketId.toLowerCase();
        book = client.getLiveBinaryOrderBookByMarket(id, { depth });
        market = store.markets.get(id) ?? null;
      } else if (params.pool != null) {
        book = client.getLiveBinaryOrderBook(params.pool, { depth });
        market = store.marketByPool(params.pool);
      } else {
        throw new InvalidInputError("quoteBinaryOrder needs a pool or marketId");
      }
      const oneCollateral = 10n ** BigInt(market?.quoteDecimals ?? Store.DECIMALS);
      return DerivedReads.quoteBinaryOrderOverBook(book, params.side, params.quantity, oneCollateral);
    },

    getBinaryBookParams: (pool) => bookParamsFor(pool),

    getClosingPrice: async (pool) => {
      const pair = getClients();
      await getGenesis().check?.();
      let failure: SomniaMarketsSocketFailure | undefined;
      const client =
        pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure((error) => {
          failure = error;
        }) ?? pair.decorated;
      return Orders.getClosingPrice(
        pool as Address,
        client,
        (error) => failure !== undefined && Object.is(error, failure),
      );
    },

    watchPrice: (asset, options) => priceFeed.watchPrice(asset, options),
    watchPrices: async (assets, options) => {
      // Start all in parallel, but if any rejects, release the ones that DID start
      // (no combined handle is returned on throw, so they'd otherwise leak).
      const settled = await Promise.allSettled(assets.map((a) => priceFeed.watchPrice(a, options)));
      const handles = settled
        .filter((r): r is PromiseFulfilledResult<PriceWatchHandle> => r.status === "fulfilled")
        .map((r) => r.value);
      const failed = settled.find((r) => r.status === "rejected");
      if (failed) {
        handles.forEach((h) => h.stop());
        throw (failed as PromiseRejectedResult).reason;
      }
      return { stop: () => handles.forEach((h) => h.stop()) };
    },
    getPriceHealth: (asset, options) => priceFeed.getHealth(asset, options),
    listPriceHealth: () => priceStore.listHealth(),
    getPriceStatus: (asset, options) => priceFeed.getStatus(asset, options),
    subscribePrices: (listener) => priceStore.subscribe(listener),
    getLivePrice: (asset) => priceStore.getLatest(asset),
    getLivePrices: (assets) => assets.map((a) => priceStore.getLatest(a)),
    getLivePriceTicks: (asset, opts) => priceStore.getTicks(asset, opts?.limit ?? 100),
    getLivePriceFeedInfo: (asset) => priceStore.getInfo(asset),
    fetchPriceFeedInfo: (asset) => PriceFeedQuery.getPriceFeedInfo(feedUrl(), asset, feedQuote()),
    fetchPrice: (asset) => PriceFeedQuery.getPriceFeedInfo(feedUrl(), asset, feedQuote()).then((info) => info.latest),
    fetchPrices: (assets) => PriceFeedQuery.getLivePrices(feedUrl(), assets, feedQuote()),
    listPriceFeeds: () => PriceFeedQuery.listFeeds(feedUrl(), undefined, feedQuote()),
    fetchPriceHistory: (asset, opts) => PriceFeedQuery.getPriceHistory(feedUrl(), asset, opts, feedQuote()),
    fetchPriceCandles: (asset, resolution, opts) =>
      PriceFeedQuery.getPriceCandles(feedUrl(), asset, resolution, opts, feedQuote()),

    // Same ownership rule: the anchor that makes a no-event transaction readable
    // is resolved from the owner's transport unless the caller already has it.

    // The block reads need a chain anchor (no block column is indexed), and the
    // OWNER holds the transport — so the timestamp is resolved here, on the
    // SDK's own decorated client, rather than asked of the caller. A consumer
    // that had to fetch it would have to open a second transport to do so.

    getPerpStopOrder: (ref) => PerpStops.getPerpStopOrder(ref, getClient()),
    getPerpStopOrders: (refs) => {
      if (refs.length === 0) return Promise.resolve([]);
      return PerpStops.getPerpStopOrders(refs, getClient());
    },
    getPerpStopOrderSomiPayment: (registry) => PerpStops.getPerpStopOrderSomiPayment(registry, getClient()),
    getUnclaimedPerpStopSomi: (ref) => PerpStops.getUnclaimedPerpStopSomi(ref, getClient()),

    getSyncStatus: (chainId) => SyncStatus.getSyncStatus(chainId, url),
    waitForIndexedBlock: (chainId, block, opts) => {
      // Unlike ordinary request reads, a wait participates in the resettable
      // live-read lifecycle: stopLive cancels it, and the next call takes the
      // replacement owner signal rather than the one that was just aborted.
      // The head read that catches an indexer ahead of the chain compares with
      // THIS owner's RPC, so it runs only for the owner's own chain. An owner
      // without chain access skips it, as an indexer-only client should.
      const readHead = async (signal?: AbortSignal): Promise<bigint | null> => {
        let chainClient: PublicClient;
        try {
          chainClient = getClient();
        } catch (e) {
          if (e instanceof NotConfiguredError) return null;
          throw e;
        }
        return (await SyncStatus.getIndependentHead(chainId, chainClient, signal)).blockNumber;
      };
      return SyncStatus.waitForIndexedBlock(chainId, block, opts ?? {}, {
        ...url,
        signal: readSignal(),
        readHead: chainId === config.chain.id ? readHead : undefined,
      });
    },

    // An indexer read living in the perp STATE module: positions are one concept,
    // and CONVENTIONS.md scopes modules by concept, never by transport direction.

    getBinaryOrderBook: (pool, opts) => Orders.getBinaryOrderBook(pool, opts, getClient()),
    getSpotOrderBook: (pool, opts) => Orders.getSpotOrderBook(pool, opts, getClient()),
    getOrderOnchain: async (pool, orderId, opts) => {
      const pair = getClients();
      await getGenesis().check?.();
      let failure: SomniaMarketsSocketFailure | undefined;
      const client =
        pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure((error) => {
          failure = error;
        }) ?? pair.decorated;
      return Orders.getOrderOnchain(
        pool,
        orderId,
        client,
        opts,
        (error) => failure !== undefined && Object.is(error, failure),
      );
    },
    getBookTopsOnchain: (markets, opts) => Orders.getBookTopsOnchain(markets, getClient(), opts),
    getOwnOpenOrdersOnchain: (pool, owner, opts) => Orders.getOwnOpenOrdersOnchain(pool, owner, getClient(), opts),
    getOpenOrdersOnchain: (pools, owner, opts) => Orders.getOpenOrdersOnchain(pools, owner, getClient(), opts),
    getAllOpenOrdersOnchain: (pool, opts) => Orders.getAllOpenOrdersOnchain(pool, opts, getClient()),
    getPerpState: (pool) => PerpState.getPerpState(pool, getClient()),
    getPerpFeedStatus: (pool) => PerpState.getPerpFeedStatus(pool, getClient()),
    getPerpFundingPremium: (pool) => PerpState.getPerpFundingPremium(pool, getClient()),
    getPerpPosition: (ref) => PerpState.getPerpPosition(ref, getClient()),
    getMarginAccount: (marginBank, account) => PerpMargin.getMarginAccount(marginBank, account, getClient()),
    getAccountHealth: (marginBank, account) => PerpMargin.getAccountHealth(marginBank, account, getClient()),
    getAccountEquity: async (account, params) => AccountEquity.getAccountEquity(account, params, getClient),
    listAccountEquities: async (accounts, params) => AccountEquity.listAccountEquities(accounts, params, getClient),
    getLiquidationPrice: (ref) => PerpMargin.getLiquidationPrice(ref, getClient()),
    getPerpLeverage: (ref) => PerpMargin.getPerpLeverage(ref, getClient()),
    getPerpPositionAnalytics: (ref) => PerpMargin.getPerpPositionAnalytics(ref, getClient()),
    listPerpPositionAnalytics: (p) => PerpMargin.listPerpPositionAnalytics(p, getClient()),
    getMaxPerpOrderSize: (p) => PerpMargin.getMaxPerpOrderSize(p, getClient()),
    previewPerpClosePnl: (p) => PerpMargin.previewPerpClosePnl(p, getClient()),
    previewPerpLiquidationPrice: (p) => PerpMargin.previewPerpLiquidationPrice(p, getClient()),
    getPerpSideHolders: (ref, opts) => PerpMargin.getPerpSideHolders(ref, opts ?? {}, getClient()),
    getBankruptcyPrice: async (ref, opts) => {
      const pair = getClients();
      await getGenesis().check?.();
      let failure: SomniaMarketsSocketFailure | undefined;
      const client =
        pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure((error) => {
          failure = error;
        }) ?? pair.decorated;
      return PerpMargin.getBankruptcyPrice(
        ref,
        opts ?? {},
        client,
        (error) => failure !== undefined && Object.is(error, failure),
      );
    },
    getPerpSystemConfig: (marginBank) => PerpSystem.getPerpSystemConfig(marginBank, getClient()),
    getInsuranceFundState: (fund) => PerpSystem.getInsuranceFundState(fund, getClient()),

    getLiquidationEngineConfig: (engine) => PerpSystem.getLiquidationEngineConfig(engine, getClient()),
    tryGetPerpAccountEquity: (marginBank, account) =>
      PerpSystem.tryGetPerpAccountEquity(marginBank, account, getClient()),
    getPerpCollateralBasis: (marginBank, account) =>
      PerpSystem.getPerpCollateralBasis(marginBank, account, getClient()),
    listPerpPoolStatuses: (p) => PerpRegistry.listPerpPoolStatuses(p, getClient(), config.addresses?.marginBank),
    listTradeablePerpPools: (p) => PerpRegistry.listTradeablePerpPools(p, getClient(), config.addresses?.marginBank),
    readPerpMarketFromChain: (p) =>
      PerpRegistry.readPerpMarketFromChain(p, getClient()).then((m) => Markets.withChain(chainId, m)),
    isPerpPoolRegistered: (p) => PerpRegistry.isPerpPoolRegistered(p, getClient()),
    getPerpRiskParams: (pool) => PerpMargin.getPerpRiskParams(pool, getClient()),
    previewPerpOrderMargin: (p) => PerpMargin.previewPerpOrderMargin(p, getClient()),
    meetsPerpImForFill: (p) => PerpMargin.meetsPerpImForFill(p, getClient()),
    quoteMeetsPerpImForOrder: (p) => PerpMargin.quoteMeetsPerpImForOrder(p, getClient()),
    quotePerpOrderTopUp: (p) => PerpMargin.quotePerpOrderTopUp(p, getClient()),
    getPerpLeverageImSurcharge: (marginBank, account) =>
      PerpMargin.getPerpLeverageImSurcharge(marginBank, account, getClient()),
    tryGetPerpLeverageImSurcharge: async (marginBank, account) => {
      const pair = getClients();
      // A failed genesis preparation is never a bank-view result.
      await getGenesis().check?.();
      let failure: SomniaMarketsSocketFailure | undefined;
      const client =
        pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure((error) => {
          failure = error;
        }) ?? pair.decorated;
      return PerpMargin.tryGetPerpLeverageImSurcharge(
        marginBank,
        account,
        client,
        (error) => failure !== undefined && Object.is(error, failure),
      );
    },
    getPerpMaxLeverage: async (ref, opts) => {
      const pair = getClients();
      await getGenesis().check?.();
      let failure: SomniaMarketsSocketFailure | undefined;
      const client =
        pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure((error) => {
          failure = error;
        }) ?? pair.decorated;
      return PerpMargin.getPerpMaxLeverage(
        ref,
        opts ?? {},
        client,
        (error) => failure !== undefined && Object.is(error, failure),
      );
    },
    getPerpLinkedWalletRegistry: (marginBank) => PerpLinkedWallet.getPerpLinkedWalletRegistry(marginBank, getClient()),
    quotePerpFundingPayer: (marginBank, account) =>
      PerpLinkedWallet.quotePerpFundingPayer(marginBank, account, getClient()),
    getPerpMainFunding: (marginBank, account) => PerpLinkedWallet.getPerpMainFunding(marginBank, account, getClient()),
    getPerpWalletPullCapacity: (marginBank, wallet) =>
      PerpLinkedWallet.getPerpWalletPullCapacity(marginBank, wallet, getClient()),
    getPerpWalletLinkage: (registry, wallet) => PerpLinkedWallet.getPerpWalletLinkage(registry, wallet, getClient()),
    listPerpLinkedChildren: (registry, main) => PerpLinkedWallet.listPerpLinkedChildren(registry, main, getClient()),
    getPerpMaxLinkedChildren: (registry) => PerpLinkedWallet.getPerpMaxLinkedChildren(registry, getClient()),
    getPerpVoucherCampaign: (marginBank) => PerpVoucher.getPerpVoucherCampaign(marginBank, getClient()),
    getPerpVoucherEligibility: (marginBank, account) =>
      PerpVoucher.getPerpVoucherEligibility(marginBank, account, getClient()),
    getPerpVoucher: (marginBank, account) => PerpVoucher.getPerpVoucher(marginBank, account, getClient()),

    getPerpHealthSnapshot: (pool) => PerpMargin.getPerpHealthSnapshot(pool, getClient()),
    getEffectiveImfBps: (pool) => PerpMargin.getEffectiveImfBps(pool, getClient()),
    getVaultBalance: (p) => BinaryPortfolio.getVaultBalance(p, getClient()),
    getManualVaultMode: (p) => SpotVaultMode.getManualVaultMode(p, getClient()),
    getAutoPullRequirement: (p) => SpotPoolReads.getAutoPullRequirement(p, getClient()),
    isOperatorAuthorized: (p) => SpotPoolReads.isOperatorAuthorized(p, getClient()),
    isGloballyApproved: (p) =>
      SpotOperatorGrants.isGloballyApproved(p, getClient(), config.addresses?.operatorPermissionsRegistry),
    isApprovedForPool: (p) =>
      SpotOperatorGrants.isApprovedForPool(p, getClient(), config.addresses?.operatorPermissionsRegistry),
    // Deliberately NOT given the configured address: this read asks the POOL, which is
    // the discovery path for a caller who has nothing configured.
    getOperatorPermissionsRegistry: (pool) => SpotOperatorGrants.getOperatorPermissionsRegistry(pool, getClient()),
    getOwnLockedBalance: (p) => SpotPoolReads.getOwnLockedBalance(p, getClient()),
    getLockedTokenBreakdown: (pool) => SpotPoolReads.getLockedTokenBreakdown(pool, getClient()),
    convertToQuoteAtPriceCeil: (p) => SpotPoolReads.convertToQuoteAtPriceCeil(p, getClient()),
    getMarketOnchain: (marketId) => {
      const module = config.addresses?.binaryModule;
      if (!module) {
        throw new NotConfiguredError(
          "addresses.binaryModule",
          "getMarketOnchain (v2 resolves markets by marketId through the module)",
        );
      }
      return Markets.getMarketOnchain(
        marketId,
        { module, settlement: config.addresses?.binarySettlement },
        getClient(),
      );
    },
    getPoolMarketBinding: (pool, opts) => {
      const module = config.addresses?.binaryModule;
      if (!module) {
        throw new NotConfiguredError(
          "addresses.binaryModule",
          "getPoolMarketBinding (the module holds the market address -> marketId lookup)",
        );
      }
      return Markets.getPoolMarketBinding(pool, module, getClient(), opts);
    },
    getMarketIdOnchain: (marketAddress, opts) => {
      const module = config.addresses?.binaryModule;
      if (!module) {
        throw new NotConfiguredError(
          "addresses.binaryModule",
          "getMarketIdOnchain (the module holds the market address -> marketId lookup)",
        );
      }
      return Markets.getMarketIdOnchain(marketAddress, module, getClient(), opts);
    },
    getOnchainResolutionPrice: async (marketId) => {
      const module = config.addresses?.binaryModule;
      if (!module) {
        throw new NotConfiguredError(
          "addresses.binaryModule",
          "getOnchainResolutionPrice (the module names the market's oracle adapter)",
        );
      }
      const pair = getClients();
      await getGenesis().check?.();
      const failures = new WeakSet<object>();
      let firstFailure: SomniaMarketsSocketFailure | undefined;
      const observed =
        pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure((error) => {
          firstFailure ??= error;
          failures.add(error);
        }) ?? pair.decorated;
      const ownedFailure = (error: unknown): error is SomniaMarketsSocketFailure =>
        typeof error === "object" && error !== null && failures.has(error);
      return Markets.getOnchainResolutionPrice(
        marketId as `0x${string}`,
        { module },
        observed,
        ownedFailure,
        () => firstFailure,
      );
    },
    // Pool-reuse reads (settlement-extraction v2). Chain half needs the module
    // address; indexer half (listPoolBindings/getPool) is pure GraphQL.
    getPoolCreator: (pool) => {
      const module = config.addresses?.binaryModule;
      if (!module) {
        throw new NotConfiguredError("addresses.binaryModule", "getPoolCreator");
      }
      return Markets.getPoolCreator(pool, module, getClient());
    },
    getFreePools: (creator, collateral) => {
      const module = config.addresses?.binaryModule;
      if (!module) {
        throw new NotConfiguredError("addresses.binaryModule", "getFreePools");
      }
      return Pools.getFreePools(creator, collateral, module, getClient());
    },

    getErc20Balance: (token: Address, account: Address) => readBalances.erc20(token, account),
    getErc20Metadata: (token: Address) => Balances.getErc20Metadata(token, getClient()),
    getErc20Allowance: (token: Address, owner: Address, spender: Address) =>
      Balances.getErc20Allowance(token, owner, spender, getClient()),
    getOutcomeBalance: (p) => BinaryPortfolio.getOutcomeBalance(p, getClient()),
    getBalances: (tokens, account) => Balances.getBalances(tokens, account, getClient()),
    getStopOrderSomiPayment: (registry) => SpotStops.getStopOrderSomiPayment(registry, getClient()),
    getMaxBuilderFeeBpsTimes1k: (pool) => Fees.getMaxBuilderFeeBpsTimes1k(pool, getClient()),
    getBuilderApproval: (ref) => Fees.getBuilderApproval(ref, getClient()),
    getEffectiveBuilderApproval: (ref) => Fees.getEffectiveBuilderApproval(ref, getClient()),
    getContractMeta: async (address, opts) => {
      const pair = getClients();
      await getGenesis().check?.();
      const failures = new WeakSet<object>();
      let firstFailure: SomniaMarketsSocketFailure | undefined;
      const client =
        pair.resolveOwnedViews?.(pair.raw, pair.decorated)?.observeFailure((error) => {
          firstFailure ??= error;
          failures.add(error);
        }) ?? pair.decorated;
      const ownedFailure = (error: unknown): error is SomniaMarketsSocketFailure => {
        if ((typeof error !== "object" || error === null) && typeof error !== "function") return false;
        return failures.has(error);
      };
      return Markets.getContractMeta(address, opts ?? {}, client, ownedFailure, () => firstFailure);
    },
    getNativeBalance: (address) => readBalances.native(address),
    getTransactionSummary: (hash) => System.getTransactionSummary(hash, getClient()),
    // Each call is an independent tape on the client's chain WebSocket endpoint —
    // deliberately NOT the LiveTail's socket (a firehose must not contend with
    // scoped watches, and the tape owns its own stall/reconnect lifecycle).
    createNetworkTape: (opts) => new NetworkTape(resolveWsUrl(), opts ?? {}),
    getHeadBlock: () => Orders.getHeadBlock(getClient()),
    getSystemInfo: () => System.getSystemInfo(getClient(), config.addresses ?? {}),

    // Control plane — operators/venues are INDEXER reads (like the market
    // list); only fee-param encoding + the fee cap touch the chain (the module).

    encodeBinaryVenueFeeParams: (vp) =>
      OperatorReads.encodeBinaryVenueFeeParams(vp, getClient(), config.addresses?.binaryModule),
    getMaxVenueFeeBps: () => OperatorReads.getMaxVenueFeeBps(getClient(), config.addresses?.binaryModule),

    // Machinery directory — MarketCreators / oracle adapters / series are
    // INDEXER reads (like the operator/venue directory); the on-chain point
    // reads live on the machinery admins.

    // Oracle v2 hub §8e — the user-side quote reads (chain) + the hub's indexer
    // entities (questions / hub accounts / binds / callbacks). The §8e rule:
    // attach `getSchedulingCost(def) + resolveReserve()` to every create — the
    // reserve is earmarked at onBind (no separate prepaid pre-fund).
    getSchedulingCost: (def: QuestionDefinitionInput) =>
      OracleHub.getSchedulingCost(def, requireOracleHub(), getClient()),
    earmarkedOf: (operatorId: number) => OracleHub.earmarkedOf(operatorId, requireOracleHub(), getClient()),
    creditOf: (operatorId: number) => OracleHub.creditOf(operatorId, requireOracleHub(), getClient()),
    outstandingOf: (operatorId: number) => OracleHub.outstandingOf(operatorId, requireOracleHub(), getClient()),
    withdrawableOf: (operatorId: number) => OracleHub.withdrawableOf(operatorId, requireOracleHub(), getClient()),
    payerCreditOf: (payer: Address) => OracleHub.payerCreditOf(payer, requireOracleHub(), getClient()),
    payerOf: (marketId: Hex) => OracleHub.payerOf(marketId, requireOracleHub(), getClient()),
    resolveReserve: () => OracleHub.resolveReserve(requireOracleHub(), getClient()),
    quoteCreateMarketValue: (def: QuestionDefinitionInput) =>
      OracleHub.quoteCreateMarketValue(def, requireOracleHub(), getClient()),

    createTrader: (traderConfig) =>
      Trade.createTraderWithDeps(traderConfig, {
        getConfig,
        getClient,
        dbg,
        writerRuntime,
        getReceiptSignal: readSignal,
        // The store this client already holds — the same one getLiveUserOrders
        // reads. No second transport and no extra lifecycle: `cancelAllOrders`
        // with source "live" is the tail answering a question it can already
        // answer. The question is PER POOL and it is "are this pool's rows
        // TRUSTWORTHY", not merely "is this pool watched": "hydrating" covers
        // both a snapshot still in flight and a watch whose socket dropped
        // mid-reconnect, and in either window the store returns a short or empty
        // list for a book that may be full. Only "live" answers completely, so
        // only "live" may reach the kill switch — anything looser resolves to an
        // empty, silent no-op, which is the one outcome it must never produce.
        liveOwnOrders: {
          isTailing: (pool) => tail.getWatchStatus(pool) === "live",
          ordersFor: (pool, user, limit) => store.userOrders(pool, user, limit),
        },
      }),
    createExecutor: (spec) => ExecutorCreate.createExecutorFromSpec(spec, executorDeps),
    createOperatorAdmin: (adminConfig) =>
      OperatorAdmin.createOperatorAdminWithDeps(adminConfig, {
        getConfig,
        getClient,
        writerRuntime,
        getReceiptSignal: readSignal,
      }),
    createOracleHubAdmin: (adminConfig) =>
      OracleHub.createOracleHubAdminWithDeps(adminConfig, {
        getConfig,
        getClient,
        writerRuntime,
        getReceiptSignal: readSignal,
      }),
    createGovernanceAdmin: (adminConfig) =>
      GovernanceAdmin.createGovernanceAdminWithDeps(adminConfig, {
        getConfig,
        getClient,
        writerRuntime,
        getReceiptSignal: readSignal,
      }),
    createMarketCreatorAdmin: (adminConfig) =>
      MarketCreatorAdmin.createMarketCreatorAdminWithDeps(adminConfig, {
        getConfig,
        getClient,
        writerRuntime,
        getReceiptSignal: readSignal,
      }),
  };

  infrastructure.registerFreshness?.(readFreshness, client.getIndexerFreshness);
  infrastructure.registerBalances?.(readBalances, {
    getNativeBalance: client.getNativeBalance,
    getErc20Balance: client.getErc20Balance,
  });
  return client;
}

/**
 * Prepare the owner's existing socket without issuing a chain read. Missing RPC
 * configuration stays lazy, so an indexer-only load remains usable. Preparation
 * is speculative: the load observes its result, while each required read keeps
 * its own typed failure and genesis gate. Abort ends only this wait. The
 * owning connection keeps the dial under its four-second connect deadline until
 * it opens, fails or the owner closes, so the next chain read joins it.
 */
export async function prepareChain(client: SomniaMarketsClient, signal: AbortSignal): Promise<void> {
  if (!(client.config.wsRpcUrl ?? client.config.chain.rpcUrls.default.webSocket?.[0])) return;
  await Client.prepareSocket(client.getViemClient(), signal);
}
