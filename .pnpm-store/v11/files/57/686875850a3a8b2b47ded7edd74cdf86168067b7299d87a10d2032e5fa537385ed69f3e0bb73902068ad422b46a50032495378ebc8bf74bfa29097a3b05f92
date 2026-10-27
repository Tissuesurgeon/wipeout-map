// React entry — "@somnia-chain/markets-sdk/react". The only React-coupled surface of
// the SDK. Kept separate from the core barrel so Node consumers (bots, scripts) can
// import "@somnia-chain/markets-sdk" without pulling in React. Wrap your tree in
// <SomniaMarketsProvider exchange={exchange}> (or client={exchange.client}) and
// use the hooks; each takes a trailing `{ chainId }` to read another chain the
// exchange spans.

export {
  SomniaMarketsProvider,
  useSomniaMarketsClient,
  useIsTailing,
  useLiveFills,
  useLiveMarketByAddress,
  useLiveMarketByPool,
  useLiveBinaryOrderBook,
  useLiveBinaryOrderBookByMarket,
  useLiveSpotOrderBook,
  useLiveStatus,
  usePoolSeedStatus,
  useLiveUserFills,
  useLiveUserOrders,
  useWatchMarket,
  useWatchPerpMarkets,
  useWatchUser,
  useWatchPrice,
  useLivePrice,
  useLivePriceFeedInfo,
  useLivePriceTicks,
  useLiveMarkets,
  useIndexerQuery,
  usePortfolio,
  useMarkets,
  useCandles,
  useLiveFundingUpdates,
  useLiveFundingPayments,
  useLiveLiquidations,
  useFundingRateSeries,
  useMarketFees,
  useOperators,
  useMarketCreators,
  useOracleAdapters,
  useLendReserves,
  useLendAccount,
  type IndexerQueryState,
  type HookChainOptions,
} from "./hooks.js";

export type { PoolSeedStatus } from "./store.js";

// Re-exported here too so a React consumer of useFundingRateSeries can name its result
// without also importing the core barrel.
/**
 * Funding history returned by {@link useFundingRateSeries}.
 *
 * @category funding
 */
export type { FundingRateSeries } from "./funding.js";
/**
 * One real or gap-filled bucket in {@link FundingRateSeries}.
 *
 * @category funding
 */
export type { FundingSeriesBucket } from "./funding.js";

export { useWatchMarketResult, useWatchUserResult, useWatchPriceResult, useWatchPerpMarketsResult } from "./hooks.js";
export type {
  WatchAcquisitionError,
  WatchAcquisitionResult,
  UseWatchMarketResultError,
  UseWatchUserResultError,
  UseWatchPriceResultError,
  UseWatchPerpMarketsOptions,
  UseLiveLiquidationsOptions,
  UseLiveFundingPaymentsOptions,
  UseWatchPerpMarketsResultError,
  UseWatchPerpMarketsError,
  UseLiveLiquidationsError,
  UseLiveFundingPaymentsError,
  UseLivePriceTicksError,
  UseLivePriceFeedInfoError,
  UseLivePriceError,
  UseWatchPriceError,
  UseLiveFundingUpdatesError,
  UseFundingRateSeriesError,
  UseLiveSpotOrderBookError,
  UseLiveBinaryOrderBookByMarketError,
  UseLiveBinaryOrderBookError,
  UseLiveUserOrdersError,
  UseLiveMarketByPoolError,
  UseLiveUserFillsError,
  UseLiveFillsError,
  UseWatchUserError,
  UseWatchMarketError,
  UseSomniaMarketsClientError,
} from "./hooks.js";

export type {
  UseLendReservesQueryError,
  UseLendAccountQueryError,
  UseLendReservesError,
  UseLendAccountError,
} from "./hooks.js";
