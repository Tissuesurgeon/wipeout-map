import type { SomniaLendClientListReservesError, SomniaLendClientGetAccountError } from "./lend/client.js";
import { type ReactNode } from "react";
import type { SomniaMarketsClient } from "./createClient.js";
import type { SomniaMarkets } from "./unified/exchange.js";
import { IndexerError, InvalidInputError } from "./errors.js";
import type { SomniaMarketsSocketFailure } from "./config.js";
import type { NotConfiguredError } from "./errors.js";
import type { ListLiveFundingPaymentsOptions, ListLiveLiquidationsOptions, WatchPerpMarketsOptions, WatchStatus } from "./liveTail.js";
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
import { type FundingRateSeries } from "./funding.js";
import type { LivePrice, PriceFeedInfo, PriceFeedStatus, PricePoint } from "./priceFeed/types.js";
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
export declare function SomniaMarketsProvider({ client, exchange, chainSeedPools, children, }: {
    /** One engine. Every hook reads it, and a `chainId` filter must name its chain. */
    client?: SomniaMarketsClient;
    /** A (possibly multi-chain) exchange. Hooks read its primary engine unless filtered. */
    exchange?: SomniaMarkets;
    /** Binary pools to seed from chain. Requires `addresses.binaryModule` on each selected chain's client. Fixed for this provider mount; remount to change it. */
    chainSeedPools?: readonly {
        chainId: number;
        pool: Address;
    }[];
    children: ReactNode;
}): ReactNode;
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
export declare function useSomniaMarketsClient(chainId?: number): SomniaMarketsClient;
/**
 *  Effect plumbing shared by the watch hooks: hold one ref-counted watch while
 *  mounted, releasing it (or a not-yet-resolved acquisition) on unmount.
 */
/** A component-visible watch acquisition failure. Cancellation from a superseded effect is ignored. */
export type WatchAcquisitionError = SomniaMarketsSocketFailure;
/** Acquisition progress is separate from later transport health. */
export type WatchAcquisitionResult = {
    status: "unwatched" | "acquiring" | "acquired";
    error: null;
} | {
    status: "error";
    error: WatchAcquisitionError;
};
/**
 * Acquire a market watch and return typed acquisition failure for inline rendering.
 * Later lifecycle remains available through the owner's getWatchStatus and useLiveStatus.
 * Releases late handles and ignores errors after owner/key changes or unmount.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export declare function useWatchMarketResult(pool: string | undefined, options?: HookChainOptions): WatchAcquisitionResult;
/**
 * Acquire user history and expose typed failure without an error boundary.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export declare function useWatchUserResult(user: string | null | undefined, options?: HookChainOptions): WatchAcquisitionResult;
/**
 * Acquire an asset's current price and metadata without a historical tape.
 * Expose typed acquisition failure without an error boundary.
 * getPriceStatus retains legacy setup state. The concrete owner's getPriceHealth distinguishes confirmed delivery.
 * @throws {InvalidInputError} No provider is present, or a client-only provider is given another chain.
 * @throws {NotConfiguredError} The configured exchange does not span the requested chain.
 *
 * @category React
 */
export declare function useWatchPriceResult(asset: string | undefined, options?: HookChainOptions): WatchAcquisitionResult;
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
export declare function useWatchMarket(pool: string | undefined, options?: HookChainOptions): WatchStatus;
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
export declare function useWatchUser(user: string | null | undefined, options?: HookChainOptions): void;
/**
 *  The live tail's status snapshot (mode, blocks, event counter) — drive a
 *  connection banner off it, or use {@link useIsTailing} for the common boolean.
 *
 * @category React
 */
export declare function useLiveStatus(options?: HookChainOptions): TailStatus;
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
export declare function usePoolSeedStatus(pool: string | undefined, options?: HookChainOptions): PoolSeedStatus | null;
/**
 * True when at least one watch is live (vs idle / hydrating / reconnecting).
 *
 * @category React
 */
export declare function useIsTailing(options?: HookChainOptions): boolean;
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
export declare function useLiveFills(pool: string | undefined, limit?: number, options?: HookChainOptions): LiveFill[];
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
export declare function useLiveUserFills(pool: string | null, user: string | undefined, limit?: number, options?: HookChainOptions): LiveFill[];
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
export declare function useLiveMarketByPool(pool: string | undefined, options?: HookChainOptions): LiveMarket | null;
/**
 *  One binary market by its BinaryMarket contract address. NOTE: watches are
 *  pool-keyed, so this hook does not open one — it reads whatever a pool-keyed
 *  hook (or explicit watchMarket) on the same page has hydrated.
 *
 * @category React
 */
export declare function useLiveMarketByAddress(addr: string | undefined, options?: HookChainOptions): BinaryMarket | null;
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
export declare function useLiveUserOrders(pool: string | undefined, user: string | undefined, limit?: number, options?: HookChainOptions): LiveOrder[];
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
export declare function useLiveBinaryOrderBook(pool: string | undefined, depth?: number, options?: HookChainOptions): BinaryOrderBook;
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
export declare function useLiveBinaryOrderBookByMarket(marketId: string | undefined, depth?: number, options?: HookChainOptions): BinaryOrderBook;
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
export declare function useLiveSpotOrderBook(pool: string | undefined, depth?: number, options?: HookChainOptions): SpotOrderBook;
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
export declare function useIndexerQuery<T>(fn: (client: SomniaMarketsClient, signal: AbortSignal) => Promise<T>, deps: readonly unknown[], options?: HookChainOptions): IndexerQueryState<T>;
/**
 * A wallet's binary portfolio (indexer read). Re-runs when `account`/`opts` change.
 *
 * @category React
 */
export declare function usePortfolio(account: string | undefined, opts?: PortfolioOptions, options?: HookChainOptions): IndexerQueryState<Portfolio | undefined>;
/**
 * Markets, newest first (indexer read). Pass `marketType` to narrow.
 *
 * @category React
 */
export declare function useMarkets(opts?: {
    marketType?: MarketType;
    limit?: number;
    offset?: number;
}, options?: HookChainOptions): IndexerQueryState<Market[]>;
/**
 * OHLCV candles for one pool + interval (indexer read), oldest first. Pass
 * `opts.market` on binary to read one market's candles.
 *
 * @category React
 */
export declare function useCandles(pool: string | undefined, intervalSeconds: number, opts?: GetCandlesOptions, options?: HookChainOptions): IndexerQueryState<Candle[]>;
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
export declare function useLiveFundingUpdates(pool: string | undefined, limit?: number, options?: HookChainOptions): LiveFundingUpdate[];
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
export interface UseLiveLiquidationsOptions extends ListLiveLiquidationsOptions, HookChainOptions {
}
/**
 *  Options for {@link useLiveFundingPayments}: the live-store filters plus the chain filter.
 *
 * @category React
 */
export interface UseLiveFundingPaymentsOptions extends ListLiveFundingPaymentsOptions, HookChainOptions {
}
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
export declare function useWatchPerpMarkets(opts?: UseWatchPerpMarketsOptions): WatchStatus;
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
export declare function useWatchPerpMarketsResult(opts?: UseWatchPerpMarketsOptions): WatchAcquisitionResult;
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
export declare function useLiveLiquidations(opts?: UseLiveLiquidationsOptions): LiquidationEvent[];
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
export declare function useLiveFundingPayments(opts?: UseLiveFundingPaymentsOptions): FundingPayment[];
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
export declare function useFundingRateSeries(pool: string | undefined, intervalSeconds: number, window: {
    from: number;
    to: number;
    limit?: number;
}, options?: HookChainOptions): IndexerQueryState<FundingRateSeries<FundingRateCandle>>;
/**
 * A market's frozen fee config + running total (indexer read), or null.
 *
 * @category React
 */
export declare function useMarketFees(marketId: string | undefined, options?: HookChainOptions): IndexerQueryState<MarketFees | null | undefined>;
/**
 * Operator directory (indexer read). Pass `owner`/`enabled` to filter, page with `limit`/`offset`.
 *
 * @category React
 */
export declare function useOperators(opts?: OperatorFilter & {
    limit?: number;
    offset?: number;
}, options?: HookChainOptions): IndexerQueryState<IndexedOperator[]>;
/**
 *  MarketCreator directory (indexer read) — the operator machinery list. Pass
 *  `owner`/`operatorId`/`venueId` to filter, page with `limit`/`offset`. Each
 *  row carries its nested `series`.
 *
 * @category React
 */
export declare function useMarketCreators(opts?: MarketCreatorFilter & {
    limit?: number;
    offset?: number;
}, options?: HookChainOptions): IndexerQueryState<IndexedMarketCreator[]>;
/**
 *  Oracle-adapter directory (indexer read). Pass `owner`/`approved` to filter,
 *  page with `limit`/`offset`.
 *
 * @category React
 */
export declare function useOracleAdapters(opts?: {
    owner?: string;
    approved?: boolean;
    limit?: number;
    offset?: number;
}, options?: HookChainOptions): IndexerQueryState<IndexedOracleAdapter[]>;
/**
 *  Every market the live store knows (spot + perp + binary), from the live tail
 *  — synchronous, memoized. Pair with {@link useWatchMarket}/`watchMarkets` to
 *  keep it populated; unlike {@link useMarkets} this is the zero-round-trip store
 *  view, not an indexer fetch.
 *
 * @category React
 */
export declare function useLiveMarkets(options?: HookChainOptions): LiveMarket[];
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
export declare function useWatchPrice(asset: string | undefined, options?: HookChainOptions): PriceFeedStatus;
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
export declare function useLivePrice(asset: string | undefined, options?: HookChainOptions): LivePrice | null;
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
export declare function useLivePriceFeedInfo(asset: string | undefined, options?: HookChainOptions): PriceFeedInfo | null;
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
export declare function useLivePriceTicks(asset: string | undefined, limit?: number, options?: HookChainOptions): PricePoint[];
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
export declare function useLendReserves(options?: HookChainOptions): IndexerQueryState<LendReserve[], UseLendReservesQueryError>;
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
export declare function useLendAccount(account: Address | undefined, options?: HookChainOptions): IndexerQueryState<LendAccount | undefined, UseLendAccountQueryError>;
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
