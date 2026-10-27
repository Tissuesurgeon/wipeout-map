// Compile-time proof that `SomniaMarketsClient` still matches the concept modules
// it delegates to.
//
// THE PROBLEM THIS SOLVES. `SomniaMarketsClient` is a hand-written interface
// mirroring ~105 delegations, and its doc comments are what TypeDoc publishes —
// so it cannot simply be derived away. But hand-mirroring means a concept
// function's signature can drift from the interface that fronts it, and nothing
// notices: `createClient` satisfies the INTERFACE, and the interface is the thing
// that drifted. CONVENTIONS.md's "Definition of done" documents the resulting tax
// (three files to touch for one new read).
//
// So: keep the interface (and its docs), and assert the pairing HERE. A signature
// that drifts becomes a `tsc` error instead of a silently-wrong published type.
//
// WHY THE ARITIES DIFFER. Every indexer read takes the client's config as trailing
// arguments the client injects — `Fills.getFills(pool, opts, url)` fronted by
// `client.getFills(pool, opts)`. `WithoutConfig` strips exactly that tail, so the
// two shapes can be compared directly.
//
// This module exports nothing at runtime; it exists for its type errors.

import type { RequestContext, Source } from "./indexerRead.js";
import type * as AccountEquity from "./accountEquity.js";
import type * as Activity from "./activity.js";
import type * as Balances from "./balances.js";
import type * as BinaryPortfolio from "./binary/portfolio.js";
import type * as BinarySettlement from "./binary/settlement.js";
import type * as Candles from "./candles.js";
import type * as Fees from "./fees.js";
import type * as Fills from "./fills.js";
import type * as Markets from "./markets.js";
import type * as Orders from "./orders.js";
import type * as PerpHistory from "./perp/history.js";
import type * as PerpState from "./perp/state.js";
import type * as PerpPortfolio from "./perp/portfolio.js";
import type * as Pools from "./pools.js";
import type * as Router from "./router.js";
import type * as SpotPortfolio from "./spot/portfolio.js";
import type * as SpotStops from "./spot/stops.js";
import type * as SyncStatus from "./syncStatus.js";
import type { SomniaMarketsClient, SomniaMarketsClientWithObservations } from "./somniaMarketsClient.js";

/**
 *  Drops the trailing indexer-config arguments the client injects.
 *
 *  **Details**
 *
 *  Matches the real shapes in this package by arity, LONGEST TAIL FIRST:
 *  `(…args, url, headers)`, `(…args, url)`, and `(url)` alone. A function whose
 *  tail does not look like config is returned unchanged, so a mismatch shows up
 *  as a normal signature error rather than being silently rewritten. A read that
 *  needs the owner's chain takes the narrower `RequestContext` instead of
 *  `Source`, and the last branch strips that tail the same way.
 *
 *  **Gotchas**
 *
 *  Do NOT collapse the three `Source` patterns into one with a trailing optional
 *  (`[...infer H, Source, (Record<string, string> | undefined)?]`): TypeScript
 *  cannot match a variadic tuple whose last element is optional against a
 *  fixed-arity signature, so that form silently strips NOTHING and every
 *  assertion below passes vacuously — the file keeps compiling while checking
 *  nothing. Verify any change here by checking `Parameters<>` arity, not just
 *  assignability; assignability alone is what hid the bug.
 */
type WithoutConfig<F> = F extends (...a: [...infer H, Source, Record<string, string> | undefined]) => infer R
  ? (...a: H) => R
  : F extends (...a: [...infer H, Source, Record<string, string>]) => infer R
    ? (...a: H) => R
    : F extends (...a: [...infer H, Source]) => infer R
      ? (...a: H) => R
      : F extends (...a: [...infer H, RequestContext]) => infer R
        ? (...a: H) => R
        : F;

/** `true` when `Actual` is assignable to `Expected` (parameter/return compatible). */
type Matches<Actual, Expected> = Actual extends Expected ? true : false;

/** Compile error unless `T` is `true`. The assertion mechanism. */
type Assert<T extends true> = T;

// ---------------------------------------------------------------------------
// The pairings. Each line reads: "the client's method must accept what the
// concept function accepts, minus the injected config". Add a line when you add
// a read; the compiler then holds the pair together.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unused-vars -- these types ARE the test */

// Markets
type _listMarkets = Assert<Matches<WithoutConfig<typeof Markets.listMarkets>, SomniaMarketsClient["listMarkets"]>>;
type _getMarket = Assert<Matches<WithoutConfig<typeof Markets.getMarket>, SomniaMarketsClient["getMarket"]>>;
type _countMarkets = Assert<Matches<WithoutConfig<typeof Markets.countMarkets>, SomniaMarketsClient["countMarkets"]>>;
type _countMarketsBounded = Assert<
  Matches<WithoutConfig<typeof Markets.countMarketsBounded>, SomniaMarketsClient["countMarketsBounded"]>
>;
type _countBinaryMarketsBounded = Assert<
  Matches<WithoutConfig<typeof Markets.countBinaryMarketsBounded>, SomniaMarketsClient["countBinaryMarketsBounded"]>
>;
type _listBinaryMarkets = Assert<
  Matches<WithoutConfig<typeof Markets.listBinaryMarkets>, SomniaMarketsClient["listBinaryMarkets"]>
>;
type _listSpotMarkets = Assert<
  Matches<WithoutConfig<typeof Markets.listSpotMarkets>, SomniaMarketsClient["listSpotMarkets"]>
>;
type _listPerpMarkets = Assert<
  Matches<WithoutConfig<typeof Markets.listPerpMarkets>, SomniaMarketsClient["listPerpMarkets"]>
>;
type _getMarketFees = Assert<
  Matches<WithoutConfig<typeof Markets.getMarketFees>, SomniaMarketsClient["getMarketFees"]>
>;

// Orders + fills + candles
type _getOpenOrders = Assert<Matches<WithoutConfig<typeof Orders.getOpenOrders>, SomniaMarketsClient["getOpenOrders"]>>;
type _getOrders = Assert<Matches<WithoutConfig<typeof Orders.getOrders>, SomniaMarketsClient["getOrders"]>>;
type _countOrders = Assert<Matches<WithoutConfig<typeof Orders.countOrders>, SomniaMarketsClient["countOrders"]>>;
type _listSweepableOrders = Assert<
  Matches<WithoutConfig<typeof Orders.listSweepableOrders>, SomniaMarketsClient["listSweepableOrders"]>
>;
type _getMarketActivity = Assert<
  Matches<WithoutConfig<typeof Activity.getMarketActivity>, SomniaMarketsClient["getMarketActivity"]>
>;
// `getTransactionActivity` and the three block reads are deliberately NOT
// paired. Their concept functions take an owner-injected chain read
// (`TransactionAnchorResolver`, `BlockTimestampResolver`) that
// `WithoutConfig` cannot strip, because the client resolves the anchor or the
// block's timestamp itself rather than asking the caller for it — see createClient. The
// shapes therefore differ by design, and asserting equality here would only
// force the anchor back into the public signature.
type _getLatestActiveBlock = Assert<
  Matches<WithoutConfig<typeof Activity.getLatestActiveBlock>, SomniaMarketsClient["getLatestActiveBlock"]>
>;

type _getFills = Assert<Matches<WithoutConfig<typeof Fills.getFills>, SomniaMarketsClient["getFills"]>>;
type _getTradeContext = Assert<
  Matches<WithoutConfig<typeof Fills.getTradeContext>, SomniaMarketsClient["getTradeContext"]>
>;
type _getUserFills = Assert<Matches<WithoutConfig<typeof Fills.getUserFills>, SomniaMarketsClient["getUserFills"]>>;
type _getUserFillsPage = Assert<
  Matches<
    (
      account: Parameters<typeof Fills.getUserFillsPage>[0],
      options?: Parameters<typeof Fills.getUserFillsPage>[1],
    ) => ReturnType<typeof Fills.getUserFillsPage>,
    SomniaMarketsClient["getUserFillsPage"]
  >
>;
type _getUserFillHistory = Assert<
  Matches<
    (
      account: Parameters<typeof Fills.getUserFillHistory>[0],
      options?: Parameters<typeof Fills.getUserFillHistory>[1],
    ) => ReturnType<typeof Fills.getUserFillHistory>,
    SomniaMarketsClient["getUserFillHistory"]
  >
>;
type _getFillsPage = Assert<
  Matches<
    (options: Parameters<typeof Fills.getFillsPage>[0]) => ReturnType<typeof Fills.getFillsPage>,
    SomniaMarketsClient["getFillsPage"]
  >
>;
type _getLatestFillBlock = Assert<
  Matches<WithoutConfig<typeof Fills.getLatestFillBlock>, SomniaMarketsClient["getLatestFillBlock"]>
>;
type _countUserFills = Assert<
  Matches<WithoutConfig<typeof Fills.countUserFills>, SomniaMarketsClient["countUserFills"]>
>;
type _getCandles = Assert<Matches<WithoutConfig<typeof Candles.getCandles>, SomniaMarketsClient["getCandles"]>>;

// Portfolios (one per kind — the kind directories, proving the split holds)
type _getPortfolio = Assert<
  Matches<WithoutConfig<typeof BinaryPortfolio.getPortfolio>, SomniaMarketsClient["getPortfolio"]>
>;
type _getSpotPortfolio = Assert<
  Matches<WithoutConfig<typeof SpotPortfolio.getSpotPortfolio>, SomniaMarketsClient["getSpotPortfolio"]>
>;
type _getPerpPortfolio = Assert<
  Matches<WithoutConfig<typeof PerpPortfolio.getPerpPortfolio>, SomniaMarketsClient["getPerpPortfolio"]>
>;
type _listPerpOrderHistory = Assert<
  Matches<WithoutConfig<typeof PerpPortfolio.listPerpOrderHistory>, SomniaMarketsClient["listPerpOrderHistory"]>
>;
type _getOutcomeBalances = Assert<
  Matches<WithoutConfig<typeof BinaryPortfolio.getOutcomeBalances>, SomniaMarketsClient["getOutcomeBalances"]>
>;

// Fees + router + pools + sync
type _listProtocolFees = Assert<
  Matches<WithoutConfig<typeof Fees.listProtocolFees>, SomniaMarketsClient["listProtocolFees"]>
>;
type _listBuilderFees = Assert<
  Matches<WithoutConfig<typeof Fees.listBuilderFees>, SomniaMarketsClient["listBuilderFees"]>
>;
type _getRouterActions = Assert<
  Matches<WithoutConfig<typeof Router.getRouterActions>, SomniaMarketsClient["getRouterActions"]>
>;
type _getPool = Assert<Matches<WithoutConfig<typeof Pools.getPool>, SomniaMarketsClient["getPool"]>>;
type _listPoolBindings = Assert<
  Matches<WithoutConfig<typeof Pools.listPoolBindings>, SomniaMarketsClient["listPoolBindings"]>
>;
type _waitForIndexedBlock = Assert<
  Matches<WithoutConfig<typeof SyncStatus.waitForIndexedBlock>, SomniaMarketsClient["waitForIndexedBlock"]>
>;
type _getSyncStatus = Assert<
  Matches<WithoutConfig<typeof SyncStatus.getSyncStatus>, SomniaMarketsClient["getSyncStatus"]>
>;

// Kind-specific reads
type _getSpotStopOrders = Assert<
  Matches<WithoutConfig<typeof SpotStops.getSpotStopOrders>, SomniaMarketsClient["getSpotStopOrders"]>
>;
type _getMarketResolution = Assert<
  Matches<WithoutConfig<typeof BinarySettlement.getMarketResolution>, SomniaMarketsClient["getMarketResolution"]>
>;
type _getVaultPayoutFallbacks = Assert<
  Matches<WithoutConfig<typeof BinaryPortfolio.getVaultPayoutFallbacks>, SomniaMarketsClient["getVaultPayoutFallbacks"]>
>;
type _listVaultPayoutFallbacks = Assert<
  Matches<
    WithoutConfig<typeof BinaryPortfolio.listVaultPayoutFallbacks>,
    SomniaMarketsClient["listVaultPayoutFallbacks"]
  >
>;
type _getFundingPayments = Assert<
  Matches<WithoutConfig<typeof PerpHistory.getFundingPayments>, SomniaMarketsClient["getFundingPayments"]>
>;
type _getMarginEvents = Assert<
  Matches<WithoutConfig<typeof PerpHistory.getMarginEvents>, SomniaMarketsClient["getMarginEvents"]>
>;
type _listLiquidations = Assert<
  Matches<WithoutConfig<typeof PerpHistory.listLiquidations>, SomniaMarketsClient["listLiquidations"]>
>;
type _listPerpPositionChanges = Assert<
  Matches<WithoutConfig<typeof PerpHistory.listPerpPositionChanges>, SomniaMarketsClient["listPerpPositionChanges"]>
>;
type _listPerpPositionChangesForFills = Assert<
  Matches<
    WithoutConfig<typeof PerpHistory.listPerpPositionChangesForFills>,
    SomniaMarketsClient["listPerpPositionChangesForFills"]
  >
>;
type _getLiquidations = Assert<
  Matches<WithoutConfig<typeof PerpHistory.getLiquidations>, SomniaMarketsClient["getLiquidations"]>
>;
type _listPerpPositions = Assert<
  Matches<WithoutConfig<typeof PerpState.listPerpPositions>, SomniaMarketsClient["listPerpPositions"]>
>;

// A chain read, paired by hand: the tail it drops is the client accessor.
type _getAccountEquity = Assert<
  Matches<
    (
      account: Parameters<typeof AccountEquity.getAccountEquity>[0],
      params: Parameters<typeof AccountEquity.getAccountEquity>[1],
    ) => ReturnType<typeof AccountEquity.getAccountEquity>,
    SomniaMarketsClient["getAccountEquity"]
  >
>;
type _listAccountEquities = Assert<
  Matches<
    (
      accounts: Parameters<typeof AccountEquity.listAccountEquities>[0],
      params: Parameters<typeof AccountEquity.listAccountEquities>[1],
    ) => ReturnType<typeof AccountEquity.listAccountEquities>,
    SomniaMarketsClient["listAccountEquities"]
  >
>;

/* eslint-enable @typescript-eslint/no-unused-vars */

// Chain reads take a `PublicClient` rather than a url, so they are not
// WithoutConfig-shaped; the client injects the client instead. Asserting those
// would need a second stripper for a different tail, which buys little: the
// delegation itself (`Balances.getErc20Balance(token, account, client)`) is
// already checked by the interface's return type at the call site.
export type ChainReadNote = typeof Balances.getErc20Balance;

// Source-context migration still removes exactly the infrastructure argument.
type _contextArity = Assert<Matches<Parameters<WithoutConfig<typeof Markets.getMarket>>["length"], 1>>;
type _independentSyncReturn = Assert<
  Matches<
    ReturnType<typeof SyncStatus.getIndexerFreshness>,
    ReturnType<SomniaMarketsClientWithObservations["getIndexerFreshness"]>
  >
>;
