// Realtime price-feed types.
//
// The price feed is a STANDALONE price-feed indexer (Hasura GraphQL over the
// on-chain PriceFeedScheduler) — a separate service from the markets indexer. It
// exposes a queryable historic + live feed for MANY assets from ONE endpoint: a
// `Feed` catalog (one row per asset, current price), a `PricePoint` tick stream
// (one row per tick — the spot median plus its EMA mark), and `Candle` OHLC
// rollups. Rows carry a denormalized `symbol`/`base`, so the SDK selects an asset
// by filter (single/batch/all) against the single endpoint (see ClientConfig.priceFeed).
//
// `price`/`ema` here map to the feed's spot index and its EMA-smoothed perpetual
// mark respectively (server fields `spot`/`mark`); `emaClose` is the mark at a
// candle's close (server `markClose`). The SDK keeps the price/ema/emaClose names
// for API stability.
//
// Encoding (mirrors the price-feed indexer): every price is a 1e18-scaled integer
// returned as a JSON string, every timestamp is unix SECONDS as a string. The SDK
// parses these at the edge — the structs below carry human `number`s for display
// plus the exact 1e18-scaled `raw` strings for precise math.
/**
 * Price scale of the on-chain EMA oracle: prices are 1e18-scaled integers.
 *
 * @category price feeds
 */
export const PRICE_FEED_DECIMALS = 18;
/**
 * Seconds per {@link PriceCandleResolution}.
 *
 * @category price feeds
 */
export const PRICE_RESOLUTION_SECONDS = {
    M1: 60,
    H1: 3_600,
    D1: 86_400,
};
