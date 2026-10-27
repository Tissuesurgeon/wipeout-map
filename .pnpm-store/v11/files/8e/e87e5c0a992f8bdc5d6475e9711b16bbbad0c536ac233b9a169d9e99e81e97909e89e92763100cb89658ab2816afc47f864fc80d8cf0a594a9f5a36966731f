"use client";

import * as Errors from "./errors.js";
import * as Revert from "./revert.js";
import type { SomniaLendClientListReservesError, SomniaLendClientGetAccountError } from "./lend/client.js";

// React bindings for a SomniaMarketsClient. Provide one client at the top of your
// tree with <SomniaMarketsProvider client={client}>; the hooks read it from context
// and subscribe to its live-tail store via useSyncExternalStore. The store's
// memoized selectors keep snapshots stable between mutations so these never
// loop.
//
// Watching is automatic: every pool-keyed data hook holds a ref-counted
// watchMarket() on its pool while mounted, so rendering a market's book/tape
// is what subscribes to it — and navigating away releases it (after a short
// linger). Components only reach for useWatchMarket / useWatchUser directly
// when they need a watch without reading (e.g. pre-warming) or the user's
// history hydrated.

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SomniaMarketsClient } from "./createClient.js";
import type { SomniaMarkets } from "./unified/exchange.js";
import { IndexerError, InvalidInputError } from "./errors.js";
import type { SomniaMarketsSocketFailure } from "./config.js";
import type { NotConfiguredError } from "./errors.js";
import * as Debug from "./debug.js";
import { InvariantError } from "./raise.js";
import type {
  ListLiveFundingPaymentsOptions,
  ListLiveLiquidationsOptions,
  WatchHandle,
  WatchPerpMarketsOptions,
  WatchStatus,
} from "./liveTail.js";
import type { BinaryOrderBook, SpotOrderBook } from "./orders.js";
import type { IndexedMarketCreator, IndexedOracleAdapter, MarketCreatorFilter } from "./marketCreatorAdmin.js";
import type { IndexedOperator, OperatorFilter } from "./operatorAdmin.js";
import type { Portfolio, PortfolioOptions } from "./binary/portfolio.js";
import type { BinaryMarket, Market, MarketFees, MarketType } from "./markets.js";
import type { Candle, GetCandlesOptions } from "./candles.js";
import type { Address } from "viem";
import type { LendAccount, LendReserve } from "./lend/types.js";
import type { LiveFill, LiveFundingUpdate, LiveMarket, LiveOrder, PoolSeedStatus, TailStatus } from "./store.js";
import type { FundingPayment, FundingRateCandle, LiquidationEvent } from "./perp/history.js";
import { buildFundingRateSeries, type FundingRateSeries } from "./funding.js";
import type { LivePrice, PriceFeedInfo, PriceFeedStatus, PricePoint } from "./priceFeed/types.js";

/**
 *  What the provider holds: the primary engine plus a way to reach the engine
 *  of any configured chain. A `client`-only provider has one engine and
 *  answers every chain filter with it.
 */
interface ProvidedEngines {
  primary: SomniaMarketsClient;
  engineFor: (chainId: number) => SomniaMarketsClient;
  watchMarket: (client: SomniaMarketsClient, pool: string) => Promise<WatchHandle>;
}

const ClientContext = createContext<ProvidedEngines | null>(null);

/**
 *  Chain filter every data hook accepts as its trailing options. Omit it to
 *  read the PRIMARY chain (the exchange's first binding); pass `chainId` to
 *  read another configured chain's engine. The four perp-plane hooks
 *  (`useWatchPerpMarkets`, `useWatchPerpMarketsResult`, `useLiveLiquidations`,
 *  `useLiveFundingPayments`) take `chainId` as a field of their one options
 *  object instead.
 *
 * @category React
 */
export interface HookChainOptions {
  /** Numeric chain id whose engine answers this hook. Defaults to the primary chain. */
  chainId?: number;
}

/**
 *  Provide the SDK's engine tier to the hooks below. Build one exchange
 *  (`new SomniaMarkets(...)`) near the root of your app and pass it as
 *  `exchange` — every hook then accepts a `chainId` filter to read any chain
 *  the exchange spans. Passing `client` (one engine) is the single-chain form
 *  and keeps working unchanged.
 *
 * @category React
 */
export function SomniaMarketsProvider({
  client,
  exchange,
  chainSeedPools,
  children,
}: {
  /** One engine. Every hook reads it, and a `chainId` filter must name its chain. */
  client?: SomniaMarketsClient;
  /** A (possibly multi-chain) exchange. Hooks read its primary engine unless filtered. */
  exchange?: SomniaMarkets;
  /** Binary pools to seed from chain. Requires `addresses.binaryModule` on each selected chain's client. Fixed for this provider mount; remount to change it. */
  chainSeedPools?: readonly { chainId: number; pool: Address }[];
  children: ReactNode;
}): ReactNode {
  const initialChainSeedPools = useRef(chainSeedPools);
  const value = useProvidedEngines(client, exchange, initialChainSeedPools.current);
  return createElement(ClientContext.Provider, { value }, children);
}

/** Memoize the provider value so consumers do not re-render on every provider render. */
function useProvidedEngines(
  client: SomniaMarketsClient | undefined,
  exchange: SomniaMarkets | undefined,
  chainSeedPools: readonly { chainId: number; pool: Address }[] | undefined,
): ProvidedEngines {
  const [value, setValue] = useState<ProvidedEngines>(() => toProvidedEngines(client, exchange, chainSeedPools));
  const prev = useRef({ client, exchange });
  useEffect(() => {
    if (prev.current.client === client && prev.current.exchange === exchange) return;
    prev.current = { client, exchange };
    setValue(toProvidedEngines(client, exchange, chainSeedPools));
  }, [client, exchange]);
  return value;
}

function toProvidedEngines(
  client: SomniaMarketsClient | undefined,
  exchange: SomniaMarkets | undefined,
  chainSeedPools: readonly { chainId: number; pool: Address }[] | undefined,
): ProvidedEngines {
  const selected = new Map(chainSeedPools?.map((entry) => [`${entry.chainId}:${entry.pool.toLowerCase()}`, entry]));
  const bindingReads = new Map<string, Promise<`0x${string}` | null>>();
  const watchMarket = async (owner: SomniaMarketsClient, pool: string): Promise<WatchHandle> => {
    const key = `${owner.config.chain.id}:${pool.toLowerCase()}`;
    const entry = selected.get(key);
    if (!entry) return owner.watchMarket(pool);
    let read = bindingReads.get(key);
    if (!read) {
      read = owner.getPoolMarketBinding(entry.pool).then((binding) => binding?.marketId ?? null);
      bindingReads.set(key, read);
    }
    let marketId: `0x${string}` | null;
    try {
      marketId = await read;
    } finally {
      if (bindingReads.get(key) === read) bindingReads.delete(key);
    }
    if (!marketId) throw new InvalidInputError(`binary pool ${pool} has no current market binding`);
    return owner.watchMarket(pool, { seed: "chain", marketId });
  };
  if (exchange) {
    // A hook with no chainId reads the first binding. Not `exchange.client`:
    // that throws on a multi-chain exchange, and this runs at render.
    const [first] = exchange.chainIds;
    if (first === undefined) throw new InvariantError("an exchange spans at least one chain");
    return { primary: exchange.engineFor(first), engineFor: (chainId) => exchange.engineFor(chainId), watchMarket };
  }
  if (client) {
    const only = client;
    return {
      primary: only,
      watchMarket,
      engineFor: (chainId) => {
        if (chainId !== only.config.chain.id) {
          throw new InvalidInputError(
            `chainId ${chainId} is not the provided client's chain (${only.config.chain.id}) — provide the exchange to read other chains`,
          );
        }
        return only;
      },
    };
  }
  throw new InvalidInputError("SomniaMarketsProvider needs `exchange` or `client`");
}

/**
 *  The SomniaMarketsClient from the nearest provider — the primary chain's
 *  engine, or the engine of `chainId` when given. Throws if there isn't a
 *  provider, or if the provider does not span `chainId`.
 *
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useSomniaMarketsClient(chainId?: number): SomniaMarketsClient {
  const provided = useContext(ClientContext);
  if (!provided) {
    throw new InvalidInputError("no client in context — wrap your tree in <SomniaMarketsProvider exchange={exchange}>");
  }
  return chainId === undefined ? provided.primary : provided.engineFor(chainId);
}

/**
 *  Effect plumbing shared by the watch hooks: hold one ref-counted watch while
 *  mounted, releasing it (or a not-yet-resolved acquisition) on unmount.
 */
/** A component-visible watch acquisition failure. Cancellation from a superseded effect is ignored. */
export type WatchAcquisitionError = SomniaMarketsSocketFailure;
/** Acquisition progress is separate from later transport health. */
export type WatchAcquisitionResult =
  | { status: "unwatched" | "acquiring" | "acquired"; error: null }
  | { status: "error"; error: WatchAcquisitionError };

function acquisitionError(error: unknown): WatchAcquisitionError {
  const typed = Errors.sdkFailure(error, InvariantError);
  if (typed) return typed;
  return new IndexerError("watch acquisition", "watch could not be acquired", { cause: error });
}

function useWatch(
  client: SomniaMarketsClient,
  open: (() => Promise<WatchHandle>) | null,
  key: string | undefined,
  reportResult = false,
): WatchAcquisitionResult {
  const [settled, setSettled] = useState<{
    client: SomniaMarketsClient;
    key: string | undefined;
    result: WatchAcquisitionResult;
  } | null>(null);
  const result: WatchAcquisitionResult =
    settled?.client === client && settled.key === key
      ? settled.result
      : { status: open ? "acquiring" : "unwatched", error: null };
  useEffect(() => {
    if (!open) return;
    let handle: WatchHandle | undefined;
    let cancelled = false;
    if (reportResult) setSettled({ client, key, result: { status: "acquiring", error: null } });
    Promise.resolve()
      .then(open)
      .then(
        (h) => {
          if (cancelled) h.stop();
          else {
            handle = h;
            if (reportResult) setSettled({ client, key, result: { status: "acquired", error: null } });
          }
        },
        (error: unknown) => {
          if (!cancelled) {
            if (!reportResult) Debug.warnOrConsole(client.config.debug, "hooks", `watch failed for ${key}`, { error });
            else setSettled({ client, key, result: { status: "error", error: acquisitionError(error) } });
          }
        },
      );
    return () => {
      cancelled = true;
      handle?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- acquisition identity is owner + key
  }, [client, key, reportResult]);

  return result;
}

/** Share the provider's binary seed policy across every hook that opens a pool watch. */
function usePoolWatch(
  client: SomniaMarketsClient,
  pool: string | null | undefined,
  reportResult = false,
): WatchAcquisitionResult {
  const provided = useContext(ClientContext);
  if (!provided) {
    throw new InvalidInputError("no client in context — wrap your tree in <SomniaMarketsProvider exchange={exchange}>");
  }
  return useWatch(client, pool ? () => provided.watchMarket(client, pool) : null, pool?.toLowerCase(), reportResult);
}

/**
 * Acquire a market watch and return typed acquisition failure for inline rendering.
 * Later lifecycle remains available through the owner's getWatchStatus and useLiveStatus.
 * Releases late handles and ignores errors after owner/key changes or unmount.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useWatchMarketResult(pool: string | undefined, options: HookChainOptions = {}): WatchAcquisitionResult {
  const client = useSomniaMarketsClient(options.chainId);
  return usePoolWatch(client, pool, true);
}
/**
 * Acquire user history and expose typed failure without an error boundary.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useWatchUserResult(
  user: string | null | undefined,
  options: HookChainOptions = {},
): WatchAcquisitionResult {
  const client = useSomniaMarketsClient(options.chainId);
  return useWatch(client, user ? () => client.watchUser(user) : null, user?.toLowerCase(), true);
}
/**
 * Acquire an asset's current price and metadata without a historical tape.
 * Expose typed acquisition failure without an error boundary.
 * getPriceStatus retains legacy setup state. The concrete owner's getPriceHealth distinguishes confirmed delivery.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useWatchPriceResult(asset: string | undefined, options: HookChainOptions = {}): WatchAcquisitionResult {
  const client = useSomniaMarketsClient(options.chainId);
  const key = asset?.toUpperCase();
  return useWatch(client, key ? () => client.watchPrice(key, { ticks: false }) : null, key, true);
}
/** Provider lookup failure for the additive market acquisition hook. */
export type UseWatchMarketResultError = InvalidInputError | NotConfiguredError;
/** Provider lookup failure for the additive user acquisition hook. */
export type UseWatchUserResultError = InvalidInputError | NotConfiguredError;
/** Provider lookup failure for the additive price acquisition hook. */
export type UseWatchPriceResultError = InvalidInputError | NotConfiguredError;

/**
 *  Watch one market while mounted (ref-counted; shared with the data hooks) and
 *  report its watch state — render loading UI off `"hydrating"`.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useWatchMarket(pool: string | undefined, options: HookChainOptions = {}): WatchStatus {
  const client = useSomniaMarketsClient(options.chainId);
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (pool ? client.getWatchStatus(pool) : "unwatched"),
    () => "unwatched" as WatchStatus,
  );
}

/**
 *  Hydrate + hold `user`'s order/fill history while mounted, so the user-scoped
 *  live reads have depth predating the market watches.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useWatchUser(user: string | null | undefined, options: HookChainOptions = {}): void {
  const client = useSomniaMarketsClient(options.chainId);
  useWatch(client, user ? () => client.watchUser(user) : null, user?.toLowerCase());
}

/**
 *  The live tail's status snapshot (mode, blocks, event counter) — drive a
 *  connection banner off it, or use {@link useIsTailing} for the common boolean.
 *
 * @category React
 */
export function useLiveStatus(options: HookChainOptions = {}): TailStatus {
  const client = useSomniaMarketsClient(options.chainId);
  return useSyncExternalStore(client.subscribeLive, client.getLiveStatus, client.getLiveStatus);
}

/**
 * The seed provenance for one watched pool, or `null` before that pool has seeded.
 * A chain-seeded binary book can be available while `fillsLoaded` remains false:
 * the chain seed does not load indexer fill history. Use the provider's
 * `chainSeedPools` policy to select binary pools; that policy requires
 * `addresses.binaryModule` on the selected chain's client.
 *
 * @throws {InvalidInputError} No Markets provider is mounted.
 * @category React
 */
export function usePoolSeedStatus(pool: string | undefined, options: HookChainOptions = {}): PoolSeedStatus | null {
  const client = useSomniaMarketsClient(options.chainId);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (pool ? client.getSeedStatus(pool) : null),
    () => null,
  );
}

/**
 * True when at least one watch is live (vs idle / hydrating / reconnecting).
 *
 * @category React
 */
export function useIsTailing(options: HookChainOptions = {}): boolean {
  return useLiveStatus(options).mode === "tailing";
}

const EMPTY_FILLS: LiveFill[] = [];
const EMPTY_ORDERS: LiveOrder[] = [];

/**
 * Live trade tape for one pool. Watches the pool while mounted.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveFills(pool: string | undefined, limit = 40, options: HookChainOptions = {}): LiveFill[] {
  const client = useSomniaMarketsClient(options.chainId);
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (pool ? client.getLiveFills(pool, { limit }) : EMPTY_FILLS),
    () => EMPTY_FILLS,
  );
}

/**
 *  Fills `user` participated in. Watches `pool` while mounted when given; with
 *  `pool === null` it reads across whatever markets other hooks are watching
 *  (pair with useWatchUser for history).
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveUserFills(
  pool: string | null,
  user: string | undefined,
  limit = 50,
  options: HookChainOptions = {},
): LiveFill[] {
  const client = useSomniaMarketsClient(options.chainId);
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (user ? client.getLiveUserFills(pool, user, { limit }) : EMPTY_FILLS),
    () => EMPTY_FILLS,
  );
}

/**
 * One market by pool address (either kind). Watches the pool while mounted.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveMarketByPool(pool: string | undefined, options: HookChainOptions = {}): LiveMarket | null {
  const client = useSomniaMarketsClient(options.chainId);
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (pool ? client.getLiveMarketByPool(pool) : null),
    () => null,
  );
}

/**
 *  One binary market by its BinaryMarket contract address. NOTE: watches are
 *  pool-keyed, so this hook does not open one — it reads whatever a pool-keyed
 *  hook (or explicit watchMarket) on the same page has hydrated.
 *
 * @category React
 */
export function useLiveMarketByAddress(addr: string | undefined, options: HookChainOptions = {}): BinaryMarket | null {
  const client = useSomniaMarketsClient(options.chainId);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (addr ? client.getLiveMarketByAddress(addr) : null),
    () => null,
  );
}

/**
 * `user`'s orders on one pool. Watches the pool while mounted.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveUserOrders(
  pool: string | undefined,
  user: string | undefined,
  limit = 100,
  options: HookChainOptions = {},
): LiveOrder[] {
  const client = useSomniaMarketsClient(options.chainId);
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (pool && user ? client.getLiveUserOrders(pool, user, { limit }) : EMPTY_ORDERS),
    () => EMPTY_ORDERS,
  );
}

const EMPTY_BOOK: BinaryOrderBook = { yesBids: [], yesAsks: [], noBids: [], noAsks: [] };
const EMPTY_SPOT_BOOK: SpotOrderBook = { bids: [], asks: [] };

/**
 *  The locally-materialized resting book of a binary pool (4-sided), updating
 *  the moment an order event lands — no round-trips, no refetch interval.
 *  Watches the pool while mounted.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * The owner supplies `blockNumber` as an applied-event watermark. Heads alone
 * do not advance it. Expiry remains a wall-clock projection.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveBinaryOrderBook(
  pool: string | undefined,
  depth = 10,
  options: HookChainOptions = {},
): BinaryOrderBook {
  const client = useSomniaMarketsClient(options.chainId);
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (pool ? client.getLiveBinaryOrderBook(pool, { depth }) : EMPTY_BOOK),
    () => EMPTY_BOOK,
  );
}

/**
 *  The locally-materialized resting book of a binary MARKET, resolved by its
 *  `marketId` (4-sided) — mirrors {@link useLiveBinaryOrderBook} but keyed on the
 *  market rather than the pool. Because a BinaryPool is recycled across markets,
 *  this returns an EMPTY book once the given market is no longer the pool's
 *  current binding, so a stale page never shows the successor market's orders.
 *  Watches the market's pool while mounted (once the market is known to the live
 *  store).
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * The owner supplies `blockNumber` as an applied-event watermark. Heads alone
 * do not advance it. Expiry remains a wall-clock projection.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveBinaryOrderBookByMarket(
  marketId: string | undefined,
  depth = 10,
  options: HookChainOptions = {},
): BinaryOrderBook {
  const client = useSomniaMarketsClient(options.chainId);
  const id = marketId?.toLowerCase();
  // Resolve the pool from the live store so we can hold a watch on it. Until the
  // market is known, there is nothing to watch (the book reads empty anyway).
  const pool = id ? client.getLiveMarkets().find((m) => m.id === id)?.poolAddress : undefined;
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (id ? client.getLiveBinaryOrderBookByMarket(id, { depth }) : EMPTY_BOOK),
    () => EMPTY_BOOK,
  );
}

/**
 *  The locally-materialized resting book of a spot pool, updating the moment an
 *  order event lands — no round-trips, no refetch interval. Watches the pool
 *  while mounted.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * The owner supplies the same per-scope `blockNumber` as its native live read.
 * It is absent until hydration supplies provenance.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveSpotOrderBook(
  pool: string | undefined,
  depth = 12,
  options: HookChainOptions = {},
): SpotOrderBook {
  const client = useSomniaMarketsClient(options.chainId);
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (pool ? client.getLiveSpotOrderBook(pool, { depth }) : EMPTY_SPOT_BOOK),
    () => EMPTY_SPOT_BOOK,
  );
}

// ---- indexer-read hooks ----
// Async one-shot indexer reads (history + directories), not the live store.
// `useIndexerQuery` is the generic engine — it runs `fn(client)` on mount and
// whenever `deps` change, tracks loading/error, and ignores stale responses
// (last-write-wins by request id). Concrete hooks below wrap the common reads.

/**
 * The state one {@link useIndexerQuery} exposes.
 *
 * @category React
 */
export interface IndexerQueryState<T, E extends Error = Error> {
  /**
   *  Latest successful result — `undefined` until the first response lands;
   *  the previous value is kept while a refetch is in flight or after it fails.
   */
  data: T | undefined;
  /** True while a request is in flight (initial load and refetches alike). */
  loading: boolean;
  /** The most recent request's failure, or null. Cleared when a new request starts. */
  error: E | null;
  /** Re-run the query imperatively (e.g. a manual refresh button). */
  refetch: () => void;
  /**
   *  Failure of a hook-owned wait for the indexer to catch up, when the hook runs
   *  one. Only {@link useFundingRateSeries} sets it today, and its wait reads
   *  `getSyncStatus` — so the reachable failures are exactly that member's union
   *  (`SomniaMarketsClientGetSyncStatusError`): `IndexerError` when the metadata
   *  request fails, `InvalidInputError` when a query variable is invalid.
   *  It stays `undefined` when no wait ran, when the wait succeeded, and when the
   *  caller cancelled the wait by unmounting or by changing the pool. It is
   *  separate from `error`, which belongs to the series query itself.
   */
  catchUpError?: IndexerError | InvalidInputError;
}

/**
 * Run an async indexer read against the context client, re-running when `deps`
 * change. Errors are captured (not thrown) so a failed indexer read renders as
 * `error`, not a crash. A superseded request (deps changed, `refetch`, unmount)
 * is aborted via the `signal` handed to `fn`, and its response is discarded
 * either way. Client reads take no per-request signal (cancellation is
 * client-scoped, via `ClientConfig.signal`), so the signal matters when `fn`
 * does its own fetching — pass it to anything that accepts one.
 *
 * **Example** (Running a custom indexer query)
 *
 * ```ts
 * const { data: markets } = useIndexerQuery((c) => c.listBinaryMarkets({ limit: 20 }), []);
 * ```
 *
 * @category React
 */
export function useIndexerQuery<T>(
  fn: (client: SomniaMarketsClient, signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  options: HookChainOptions = {},
): IndexerQueryState<T> {
  return useQuery(fn, deps, options, queryError);
}

/** Preserve the generic caller callback's existing error conversion. */
function queryError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Normalize only the two owned lending result channels. */
function lendingQueryError(error: unknown): SomniaMarketsSocketFailure {
  return Revert.toSdkError(error, "lending read");
}

/** One query lifecycle; the selected owning wrapper supplies its failure policy. */
function useQuery<T, E extends Error>(
  fn: (client: SomniaMarketsClient, signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  options: HookChainOptions,
  normalizeFailure: (error: unknown) => E,
): IndexerQueryState<T, E> {
  const client = useSomniaMarketsClient(options.chainId);
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: E | null }>({
    data: undefined,
    loading: true,
    error: null,
  });
  const controller = useRef<AbortController | null>(null);
  const run = useCallback(() => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState((s) => ({ ...s, loading: true, error: null }));
    // `ctrl.signal.aborted` doubles as the staleness fence: a run is superseded
    // (dep change, refetch, unmount) exactly when its controller was aborted,
    // even for an `fn` that ignores the signal — the check is on our side.
    fn(client, ctrl.signal).then(
      (data) => {
        if (!ctrl.signal.aborted) setState({ data, loading: false, error: null });
      },
      (e: unknown) => {
        if (!ctrl.signal.aborted) {
          setState((s) => ({ ...s, loading: false, error: normalizeFailure(e) }));
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns `deps`; `fn` is keyed by them
  }, [client, ...deps]);
  useEffect(() => {
    run();
    return () => {
      // Abort the in-flight request of a torn-down instance; this also fences
      // its response out of state.
      controller.current?.abort();
    };
  }, [run]);
  return { ...state, refetch: run };
}

/**
 * A wallet's binary portfolio (indexer read). Re-runs when `account`/`opts` change.
 *
 * @category React
 */
export function usePortfolio(
  account: string | undefined,
  opts?: PortfolioOptions,
  options: HookChainOptions = {},
): IndexerQueryState<Portfolio | undefined> {
  return useIndexerQuery(
    (c) => (account ? c.getPortfolio(account, opts) : Promise.resolve(undefined)),
    [account, opts?.ordersLimit, opts?.tradesLimit, opts?.since],
    options,
  );
}

/**
 * Markets, newest first (indexer read). Pass `marketType` to narrow.
 *
 * @category React
 */
export function useMarkets(
  opts?: {
    marketType?: MarketType;
    limit?: number;
    offset?: number;
  },
  options: HookChainOptions = {},
): IndexerQueryState<Market[]> {
  return useIndexerQuery((c) => c.listMarkets(opts), [opts?.marketType, opts?.limit, opts?.offset], options);
}

/**
 * OHLCV candles for one pool + interval (indexer read), oldest first. Pass
 * `opts.market` on binary to read one market's candles.
 *
 * @category React
 */
export function useCandles(
  pool: string | undefined,
  intervalSeconds: number,
  opts?: GetCandlesOptions,
  options: HookChainOptions = {},
): IndexerQueryState<Candle[]> {
  return useIndexerQuery(
    (c) => (pool ? c.getCandles(pool, intervalSeconds, opts) : Promise.resolve([])),
    [pool, intervalSeconds, opts?.limit, opts?.from, opts?.to, opts?.market?.toLowerCase()],
    options,
  );
}

const EMPTY_FUNDING: LiveFundingUpdate[] = [];

/**
 *  Funding settlements for one pool seen by the live tail, OLDEST FIRST (chart order,
 *  matching `SomniaMarketsClient.getLiveFundingUpdates`) — not newest first like
 *  {@link useLiveFills}. Watches the pool while mounted.
 *
 *  These are the tail's counterpart to the indexed `FundingRateUpdate` series and carry
 *  only what `FundingUpdated` puts on the wire — no `intervalsAccrued`, no covered span.
 *  For a chart, prefer {@link useFundingRateSeries}, which uses these purely as a nudge.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveFundingUpdates(
  pool: string | undefined,
  limit = 50,
  options: HookChainOptions = {},
): LiveFundingUpdate[] {
  const client = useSomniaMarketsClient(options.chainId);
  usePoolWatch(client, pool);
  return useSyncExternalStore(
    client.subscribeLive,
    () => (pool ? client.getLiveFundingUpdates(pool, { limit }) : EMPTY_FUNDING),
    () => EMPTY_FUNDING,
  );
}

const EMPTY_LIQUIDATIONS: LiquidationEvent[] = [];
const EMPTY_FUNDING_PAYMENTS: FundingPayment[] = [];

/**
 *  Options for {@link useWatchPerpMarkets} and {@link useWatchPerpMarketsResult}.
 *
 * @category React
 */
export interface UseWatchPerpMarketsOptions extends WatchPerpMarketsOptions, HookChainOptions {
  /** Hold the watch while mounted. Default `true`; `false` releases it without unmounting. */
  enabled?: boolean;
}

/**
 *  Options for {@link useLiveLiquidations}: the live-store filters plus the chain filter.
 *
 * @category React
 */
export interface UseLiveLiquidationsOptions extends ListLiveLiquidationsOptions, HookChainOptions {}

/**
 *  Options for {@link useLiveFundingPayments}: the live-store filters plus the chain filter.
 *
 * @category React
 */
export interface UseLiveFundingPaymentsOptions extends ListLiveFundingPaymentsOptions, HookChainOptions {}

/** The acquisition key: a changed bank is a different scope, so it re-acquires. */
const planeKey = (opts?: UseWatchPerpMarketsOptions): string | undefined =>
  opts?.enabled === false ? undefined : `perpPlane:${opts?.marginBank ?? "*"}`;

/**
 *  Hold the perp-PLANE watch while mounted and report its state.
 *
 *  One watch for the whole venue, so mounting this in several components is one
 *  subscription and one snapshot — the refcount is what makes a liquidation feed and a
 *  funding-settlement feed on the same page cost one of each.
 *
 *  MOUNT THIS ABOVE {@link useLiveLiquidations} / {@link useLiveFundingPayments} when the
 *  deployment needs `opts.marginBank`. Those two acquire the plane themselves, with no
 *  hint to give — which is enough everywhere the indexer has a perp market row, and is
 *  exactly the case the hint does not cover.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use
 * {@link useWatchPerpMarketsResult} for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useWatchPerpMarkets(opts?: UseWatchPerpMarketsOptions): WatchStatus {
  const client = useSomniaMarketsClient(opts?.chainId);
  const marginBank = opts?.marginBank;
  const key = planeKey(opts);
  useWatch(client, key ? () => client.watchPerpMarkets({ marginBank }) : null, key);
  return useSyncExternalStore(
    client.subscribeLive,
    () => client.getPerpPlaneStatus(),
    () => "unwatched" as WatchStatus,
  );
}

/**
 *  Acquire the perp-plane watch and return its typed acquisition failure for inline
 *  rendering — the sibling of {@link useWatchPerpMarkets}, which only warns.
 *
 *  Worth preferring here: a plane that failed to start and a venue where nothing has been
 *  liquidated both render as an empty feed, and only this tells them apart.
 *
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useWatchPerpMarketsResult(opts?: UseWatchPerpMarketsOptions): WatchAcquisitionResult {
  const client = useSomniaMarketsClient(opts?.chainId);
  const marginBank = opts?.marginBank;
  const key = planeKey(opts);
  return useWatch(client, key ? () => client.watchPerpMarkets({ marginBank }) : null, key, true);
}

/**
 *  Liquidation waterfall legs the live tail has seen, NEWEST FIRST. Holds the perp-plane
 *  watch while mounted.
 *
 *  Rows are the same {@link LiquidationEvent} the indexed `getLiquidations` serves, so a
 *  live feed and a paged history render through one component. One liquidation is SEVERAL
 *  rows sharing a `txHash` — read `kind` to tell the stages apart, and read the field
 *  TSDoc before aggregating: `badDebt` and `deficit` are levels that double-count when
 *  summed.
 *
 *  A `pool` filter drops the account-level legs, which name no pool. Pass `party`
 *  for every row involving one wallet. Pass `chainId` to read another chain the provider spans.
 *
 *  Acquires the plane itself, with no MarginBank hint — mount {@link useWatchPerpMarkets}
 *  above it on a deployment whose indexer has no perp market row to read the bank from.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use
 * {@link useWatchPerpMarketsResult} for inline error UI — without it a failed plane and a
 * venue with no liquidations render identically.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveLiquidations(opts?: UseLiveLiquidationsOptions): LiquidationEvent[] {
  const client = useSomniaMarketsClient(opts?.chainId);
  const pool = opts?.pool;
  const account = opts?.account;
  const counterparty = opts?.counterparty;
  const party = opts?.party;
  const kind = opts?.kind;
  const kinds = opts?.kinds;
  const limit = opts?.limit ?? 50;
  useWatch(client, () => client.watchPerpMarkets(), "perpPlane:*");
  return useSyncExternalStore(
    client.subscribeLive,
    () => client.listLiveLiquidations({ pool, account, counterparty, party, kind, kinds, limit }),
    () => EMPTY_LIQUIDATIONS,
  );
}

/**
 *  Per-account funding settlements the live tail has seen, NEWEST FIRST. Holds the
 *  perp-plane watch while mounted.
 *
 *  Distinct from {@link useLiveFundingUpdates}, which is the per-pool RATE series: this is
 *  what each account actually paid or received, and `amount` is signed with **positive
 *  meaning the account paid**. Pass `chainId` to read another chain the provider spans.
 *
 *  Acquires the plane itself, with no MarginBank hint — mount {@link useWatchPerpMarkets}
 *  above it on a deployment whose indexer has no perp market row to read the bank from.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use
 * {@link useWatchPerpMarketsResult} for inline error UI — without it a failed plane and a
 * venue with no settlements render identically.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLiveFundingPayments(opts?: UseLiveFundingPaymentsOptions): FundingPayment[] {
  const client = useSomniaMarketsClient(opts?.chainId);
  const pool = opts?.pool;
  const account = opts?.account;
  const limit = opts?.limit ?? 50;
  useWatch(client, () => client.watchPerpMarkets(), "perpPlane:*");
  return useSyncExternalStore(
    client.subscribeLive,
    () => client.listLiveFundingPayments({ pool, account, limit }),
    () => EMPTY_FUNDING_PAYMENTS,
  );
}

const EMPTY_SERIES: FundingRateSeries<FundingRateCandle> = {
  buckets: [],
  truncated: false,
  firstBucketStart: null,
};

/**
 *  Delay between two watermark reads while `useFundingRateSeries` waits for the
 *  indexer to reach a settlement's block. One second is close to the chain's own
 *  block cadence, so the wait sees each new processed height about once. A shorter
 *  poll would only add indexer requests without finding the block sooner.
 */
const CATCH_UP_POLL_MS = 1_000;

/**
 *  Total time `useFundingRateSeries` waits for the indexer watermark to cover a
 *  settlement's block. Four seconds holds a few normal ingestion delays, and it keeps
 *  the wait well inside one chart bucket. At the bound the hook re-reads once anyway,
 *  so a slower indexer degrades to the immediate re-read rather than to no re-read.
 */
const CATCH_UP_BOUND_MS = 4_000;

/**
 *  A pool's funding-rate rollups over `[from, to)` at one resolution (3600 | 14400 |
 *  86400), densified onto the grid and oldest-first. The read for a funding chart.
 *
 *  Poll plus nudge: the rollups are re-read when the live tail observes a settlement on
 *  this pool, so the tip advances at settlement time rather than on the next poll tick.
 *  Callers should not re-implement that — the whole point of this hook.
 *
 *  The nudge waits for the indexer. A settlement arrives on the tail as soon as its
 *  block is confirmed, which is before the indexer has processed that block. So the
 *  hook reads `getSyncStatus` about once a second until the indexer's
 *  `latestProcessedBlock` reaches the settlement's block, then re-reads the rollups
 *  once. The wait is bounded at 4 seconds in total. At the bound the hook re-reads the
 *  rollups anyway, which is a best effort and is never worse than an immediate re-read.
 *  The wait stops on unmount and on a pool change, and it makes no request after that.
 *  It survives a `from`/`to` window roll: the roll issues its own read, but that read can
 *  still be pre-settlement, so the wait continues and then re-reads the ROLLED window.
 *  A `getSyncStatus` failure stops the wait and appears as `catchUpError`; the hook
 *  never treats a failed watermark read as coverage. A caller-cancelled wait leaves
 *  `catchUpError` unset.
 *
 *  THE CALLER OWNS THE CLOCK. `from`/`to` are required and must be stable across
 *  renders: a `Date.now()` read inside this hook would change the query deps on every
 *  render and refetch forever. Snap your window to the grid
 *  (`Math.floor(now / interval) * interval`) and it will be stable between buckets.
 *
 *  Reading the result:
 *
 *  - `avgFundingRate8h` is already per-8h. Convert with the helpers in `funding.ts`
 *    (`fundingRate1h`, `annualizedFundingRate`) — never by hand in a component.
 *  - `coverage` is a 1e18-scaled ratio in [0, 1]. A bucket at rate 0 with LOW coverage is
 *    a pause, not a measured zero — hatch it. `filled: true` marks a slot with no row at
 *    all; both cases are `coverage: "0"`, and only `filled` separates them.
 *  - Cumulative funding is exact and needs none of that reasoning:
 *    `realizedFundingPerBase(first.cumulativeFundingStart, last.cumulativeFundingEnd)`
 *    telescopes across gaps, because the index is flat over uncovered time.
 *
 * Watch acquisition failures use the configured debug/console warning channel.
 * Use useWatchMarketResult for typed acquisition error UI.
 * History query failures remain in `state.error`.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useFundingRateSeries(
  pool: string | undefined,
  intervalSeconds: number,
  window: { from: number; to: number; limit?: number },
  options: HookChainOptions = {},
): IndexerQueryState<FundingRateSeries<FundingRateCandle>> {
  const { from, to, limit = 500 } = window;

  const state = useIndexerQuery<FundingRateSeries<FundingRateCandle>>(
    async (c) => {
      if (!pool) return EMPTY_SERIES;
      const rows = await c.listFundingRateCandles(pool, intervalSeconds, { limit, from, to });
      return buildFundingRateSeries(rows, intervalSeconds, from, to, limit);
    },
    [pool, intervalSeconds, from, to, limit],
    options,
  );

  // The nudge. Keyed on the newest settlement's id (`${pool}_${block}_${logIndex}`), so
  // it fires once per settlement rather than on every tail commit.
  //
  // The first id observed for a pool is swallowed. A warm store is the common case — a
  // watch release lingers, and an all-markets watch already covers the pool — so that id
  // usually predates the query above and re-reading for it would double-fetch on every
  // mount and every pool switch. This is a heuristic, not a proof of coverage: the hook
  // holds no block reference for the initial query, so on a cold mount it can swallow a
  // genuinely new settlement, which the next settlement then heals.
  const latest = useLiveFundingUpdates(pool, 1, options)[0];
  const latestLiveId = latest?.id;
  const latestLiveBlock = latest?.blockNumber;
  const seenLiveId = useRef<string | undefined>(undefined);
  const prevPool = useRef(pool);
  const [catchUpError, setCatchUpError] = useState<IndexerError | InvalidInputError | undefined>(undefined);
  const client = useSomniaMarketsClient(options.chainId);

  // `refetch` lives in a ref because it changes identity on every `from`/`to` window
  // roll. As an effect dep it tore the in-flight wait down once per bucket, and the
  // roll's own read can still be pre-settlement — so the settlement was missed until
  // the next one. The ref keeps the wait alive across a roll while still calling the
  // CURRENT `refetch`, so the re-read uses the rolled window, not the stale one.
  const refetchRef = useRef(state.refetch);
  refetchRef.current = state.refetch;

  // One effect owns the whole wait, so its timer dies with it (SDK-OWN-004).
  // `pool` is a dep, so a pool switch tears the wait down through the same
  // cleanup — no second mechanism. `cancelled` fences the async continuation, so nothing
  // calls setState or refetch after teardown (SDK-IO-003: a cancelled wait is not a
  // failure and never sets `catchUpError`).
  useEffect(() => {
    // The pool reset lives INSIDE the nudge, before the swallow, so it cannot race it.
    // As a separate effect it ran AFTER this one on a pool switch: on a switch to a pool
    // whose live store is already warm, the swallow below saw the OLD pool's id, read the
    // mismatch as a new settlement and re-read the new pool a second time, and the later
    // reset then erased the id it had just recorded — so the new pool's first real
    // settlement was swallowed instead of nudging. Resetting here makes a warm switch
    // take the swallow branch: no extra read, and the id recorded is the new pool's.
    if (prevPool.current !== pool) {
      prevPool.current = pool;
      seenLiveId.current = undefined;
      // The old pool's watermark failure does not describe the new pool.
      setCatchUpError(undefined);
    }
    if (!latestLiveId || latestLiveBlock === undefined) return;
    if (seenLiveId.current === undefined) {
      seenLiveId.current = latestLiveId;
      return;
    }
    if (seenLiveId.current === latestLiveId) return;
    seenLiveId.current = latestLiveId;

    // A new settlement starts a new wait, so the previous wait's failure no longer
    // describes the hook's state.
    setCatchUpError(undefined);

    const targetBlock = BigInt(latestLiveBlock);
    const deadline = Date.now() + CATCH_UP_BOUND_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const poll = (): void => {
      client.getSyncStatus(client.config.chain.id).then(
        (status) => {
          if (cancelled) return;
          const processed = status?.latestProcessedBlock;
          // A null watermark is not coverage — the indexer has processed no block yet.
          if (processed != null && BigInt(processed) >= targetBlock) {
            refetchRef.current();
            return;
          }
          // At the bound, re-read anyway. This is the bound's semantics: give up waiting
          // and take the same single re-read the hook used to do immediately.
          if (Date.now() + CATCH_UP_POLL_MS > deadline) {
            refetchRef.current();
            return;
          }
          timer = setTimeout(poll, CATCH_UP_POLL_MS);
        },
        (cause: unknown) => {
          // A failed watermark read must never degrade into "covered" (SDK-IO-002).
          if (cancelled) return;
          // `getSyncStatus` rejects only with its declared union (SDK-ERR-002), so the
          // field's type holds without widening. Anything else is a boundary that broke
          // its own contract: normalize it to the union rather than leak a raw value
          // (SDK-ERR-001), keeping the original in `cause` (SDK-ERR-004).
          setCatchUpError(
            cause instanceof IndexerError || cause instanceof InvalidInputError
              ? cause
              : new IndexerError("SyncStatus", "indexer sync-status read failed", { cause }),
          );
        },
      );
    };
    poll();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [client, latestLiveId, latestLiveBlock, pool]);

  return catchUpError ? { ...state, catchUpError } : state;
}

/**
 * A market's frozen fee config + running total (indexer read), or null.
 *
 * @category React
 */
export function useMarketFees(
  marketId: string | undefined,
  options: HookChainOptions = {},
): IndexerQueryState<MarketFees | null | undefined> {
  return useIndexerQuery(
    (c) => (marketId ? c.getMarketFees(marketId) : Promise.resolve(undefined)),
    [marketId],
    options,
  );
}

/**
 * Operator directory (indexer read). Pass `owner`/`enabled` to filter, page with `limit`/`offset`.
 *
 * @category React
 */
export function useOperators(
  opts?: OperatorFilter & { limit?: number; offset?: number },
  options: HookChainOptions = {},
): IndexerQueryState<IndexedOperator[]> {
  return useIndexerQuery(
    (c) => c.listOperators(opts),
    [opts?.owner, opts?.enabled, opts?.limit, opts?.offset],
    options,
  );
}

/**
 *  MarketCreator directory (indexer read) — the operator machinery list. Pass
 *  `owner`/`operatorId`/`venueId` to filter, page with `limit`/`offset`. Each
 *  row carries its nested `series`.
 *
 * @category React
 */
export function useMarketCreators(
  opts?: MarketCreatorFilter & { limit?: number; offset?: number },
  options: HookChainOptions = {},
): IndexerQueryState<IndexedMarketCreator[]> {
  return useIndexerQuery(
    (c) => c.listMarketCreators(opts),
    [opts?.owner, opts?.operatorId, opts?.venueId, opts?.limit, opts?.offset],
    options,
  );
}

/**
 *  Oracle-adapter directory (indexer read). Pass `owner`/`approved` to filter,
 *  page with `limit`/`offset`.
 *
 * @category React
 */
export function useOracleAdapters(
  opts?: { owner?: string; approved?: boolean; limit?: number; offset?: number },
  options: HookChainOptions = {},
): IndexerQueryState<IndexedOracleAdapter[]> {
  return useIndexerQuery(
    (c) => c.listOracleAdapters(opts),
    [opts?.owner, opts?.approved, opts?.limit, opts?.offset],
    options,
  );
}

const EMPTY_MARKETS: LiveMarket[] = [];

/**
 *  Every market the live store knows (spot + perp + binary), from the live tail
 *  — synchronous, memoized. Pair with {@link useWatchMarket}/`watchMarkets` to
 *  keep it populated; unlike {@link useMarkets} this is the zero-round-trip store
 *  view, not an indexer fetch.
 *
 * @category React
 */
export function useLiveMarkets(options: HookChainOptions = {}): LiveMarket[] {
  const client = useSomniaMarketsClient(options.chainId);
  return useSyncExternalStore(
    client.subscribeLive,
    () => client.getLiveMarkets(),
    () => EMPTY_MARKETS,
  );
}

// ---- realtime price feeds ----
// Separate store from the order-book tail, so these subscribe to
// client.subscribePrices (not subscribeLive). `useWatch` is reused: a
// PriceWatchHandle is structurally a WatchHandle ({ stop(): void }).

const EMPTY_TICKS: PricePoint[] = [];
Object.freeze(EMPTY_TICKS);

/**
 *  Watch one asset's price feed (e.g. `"BTC"`, `"ETH"`) while mounted
 *  (ref-counted; shared with the price data hooks) and report its watch state.
 *  Acquires current price and metadata only; tape failures do not affect this state.
 *
 *  Render off the returned state. `"error"` means the server rejected this
 *  asset's subscription: the price hooks keep returning their last values, which
 *  have stopped updating. See {@link PriceFeedStatus}.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useWatchPrice(asset: string | undefined, options: HookChainOptions = {}): PriceFeedStatus {
  const client = useSomniaMarketsClient(options.chainId);
  const key = asset?.toUpperCase();
  useWatch(client, key ? () => client.watchPrice(key, { ticks: false }) : null, key);
  return useSyncExternalStore(
    client.subscribePrices,
    () => (key ? client.getPriceStatus(key, { ticks: false }) : "unwatched"),
    () => "unwatched" as PriceFeedStatus,
  );
}

/**
 *  The live current price of one asset, updating the moment a new tick is pushed
 *  — no round-trips, no refetch interval. Watches the feed while mounted.
 *  Acquires no tick history or tape stream.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLivePrice(asset: string | undefined, options: HookChainOptions = {}): LivePrice | null {
  const client = useSomniaMarketsClient(options.chainId);
  const key = asset?.toUpperCase();
  useWatch(client, key ? () => client.watchPrice(key, { ticks: false }) : null, key);
  return useSyncExternalStore(
    client.subscribePrices,
    () => (key ? client.getLivePrice(key) : null),
    () => null,
  );
}

/**
 *  The live feed metadata of one asset — pair symbol, quote, decimals, and the
 *  freshness fields (`updatedAtMs` / `sourceUpdatedAtMs` / `resynced`). Watches
 *  the feed while mounted, without acquiring tick history or a tape stream.
 *
 *  Note this does NOT re-render as a price ages: a stalled feed pushes nothing,
 *  so the store never notifies. Callers rendering an age must drive their own
 *  timer (see {@link PriceFeedInfo.updatedAtMs}).
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLivePriceFeedInfo(asset: string | undefined, options: HookChainOptions = {}): PriceFeedInfo | null {
  const client = useSomniaMarketsClient(options.chainId);
  const key = asset?.toUpperCase();
  useWatch(client, key ? () => client.watchPrice(key, { ticks: false }) : null, key);
  return useSyncExternalStore(
    client.subscribePrices,
    () => (key ? client.getLivePriceFeedInfo(key) : null),
    () => null,
  );
}

/**
 * The live tick tape of one asset, newest first. Acquires up to 200 historical
 * ticks and streams this asset while mounted. The last tick reader releases its
 * tape and cached rows after 30 seconds; current-price readers remain active.
 *
 * The array keeps its reference until this asset receives new ticks, and every
 * reader of the same asset and limit shares it. It is frozen: copy it before
 * you sort or reverse it.
 *
 * Background acquisition failures use the configured debug/console warning channel. Use the corresponding
 * useWatchMarketResult/useWatchUserResult/useWatchPriceResult hook for inline error UI.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLivePriceTicks(
  asset: string | undefined,
  limit = 100,
  options: HookChainOptions = {},
): PricePoint[] {
  const client = useSomniaMarketsClient(options.chainId);
  const key = asset?.toUpperCase();
  useWatch(client, key ? () => client.watchPrice(key) : null, key);
  return useSyncExternalStore(
    client.subscribePrices,
    () => (key ? client.getLivePriceTicks(key, { limit }) : EMPTY_TICKS),
    () => EMPTY_TICKS,
  );
}

// ---- SomniaLend (chain reads through the same fetch-state engine, off the
// client's `lend` namespace — needs config.addresses.lend on the provided client) ----

/**
 *  Every SomniaLend reserve — rates, caps, prices (chain read via the
 *  UiPoolDataProvider aggregate). Errors (surfaced on `error`) when the
 *  client's `config.addresses.lend` is unset. The `error` result retains
 *  {@link UseLendReservesQueryError} identity from the owned RPC boundary.
 *  Other modeled failures become `RpcError` with their original cause.
 *
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLendReserves(
  options: HookChainOptions = {},
): IndexerQueryState<LendReserve[], UseLendReservesQueryError> {
  return useQuery((c) => c.lend.listReserves(), [], options, lendingQueryError);
}

/**
 *  A SomniaLend account's health factor + positions (chain read). Re-runs when
 *  `account` changes; `undefined` account resolves to `undefined` data.
 *  The `error` result retains {@link UseLendAccountQueryError} identity from
 *  the owned RPC boundary. Other modeled failures become `RpcError` with
 *  their original cause.
 *
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 *
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export function useLendAccount(
  account: Address | undefined,
  options: HookChainOptions = {},
): IndexerQueryState<LendAccount | undefined, UseLendAccountQueryError> {
  return useQuery(
    (c) => (account ? c.lend.getAccount(account) : Promise.resolve(undefined)),
    [account],
    options,
    lendingQueryError,
  );
}

/** Render failures for useLivePriceTicks. */
export type UseLivePriceTicksError = InvalidInputError | NotConfiguredError;
/** Render failures for useLivePriceFeedInfo. */
export type UseLivePriceFeedInfoError = InvalidInputError | NotConfiguredError;
/** Render failures for useLivePrice. */
export type UseLivePriceError = InvalidInputError | NotConfiguredError;
/** Render failures for useWatchPrice. */
export type UseWatchPriceError = InvalidInputError | NotConfiguredError;
/** Render failures for useFundingRateSeries; history query errors remain in the returned state. */
export type UseFundingRateSeriesError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveFundingUpdates. */
export type UseLiveFundingUpdatesError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveSpotOrderBook. */
export type UseLiveSpotOrderBookError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveBinaryOrderBookByMarket. */
export type UseLiveBinaryOrderBookByMarketError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveBinaryOrderBook. */
export type UseLiveBinaryOrderBookError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveUserOrders. */
export type UseLiveUserOrdersError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveMarketByPool. */
export type UseLiveMarketByPoolError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveUserFills. */
export type UseLiveUserFillsError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveFills. */
export type UseLiveFillsError = InvalidInputError | NotConfiguredError;
/** Render failures for useWatchUser. */
export type UseWatchUserError = InvalidInputError | NotConfiguredError;
/** Render failures for useWatchMarket. */
export type UseWatchMarketError = InvalidInputError | NotConfiguredError;
/** Render failures for useWatchPerpMarkets. */
export type UseWatchPerpMarketsError = InvalidInputError | NotConfiguredError;
/** Provider lookup failure for the additive perp-plane acquisition hook. */
export type UseWatchPerpMarketsResultError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveLiquidations. */
export type UseLiveLiquidationsError = InvalidInputError | NotConfiguredError;
/** Render failures for useLiveFundingPayments. */
export type UseLiveFundingPaymentsError = InvalidInputError | NotConfiguredError;
/** Render failures for useSomniaMarketsClient. */
export type UseSomniaMarketsClientError = InvalidInputError | NotConfiguredError;

/** Failures reported by the owned reserve query result, distinct from render failures. @category React */
export type UseLendReservesQueryError = SomniaLendClientListReservesError;
/** Failures reported by the owned account query result, distinct from render failures. @category React */
export type UseLendAccountQueryError = SomniaLendClientGetAccountError;

/** Render lookup failure for useLendReserves; asynchronous failures belong to its query result. @category React */
export type UseLendReservesError = InvalidInputError | NotConfiguredError;
/** Render lookup failure for useLendAccount; asynchronous failures belong to its query result. @category React */
export type UseLendAccountError = InvalidInputError | NotConfiguredError;
