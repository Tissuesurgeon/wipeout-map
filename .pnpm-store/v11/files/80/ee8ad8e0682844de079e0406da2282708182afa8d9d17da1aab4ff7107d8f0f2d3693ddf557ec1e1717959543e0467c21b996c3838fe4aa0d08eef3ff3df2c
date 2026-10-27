# Units and scales

This page lists every numeric convention the SDK uses, which surface uses it, and the helpers that convert between them. The exchange API (`SomniaMarkets`) speaks in human units. The engine (`SomniaMarketsClient`, the trader) and the indexer speak in raw integers.

## Amounts and prices

| Convention      | Type                                                                  | Used by                                                              | Example                            |
| --------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Human units     | `number`                                                              | Every `SomniaMarkets` method and struct                              | `10` shares, price `0.62`          |
| Raw token units | `bigint` on writes and chain reads; decimal `string` on indexer reads | `SomniaMarketsClient`, `Trader`, `Market` rows, every `info` payload | `620000n` for 0.62 with 6 decimals |

A raw amount is scaled by the token's decimals. The scale differs per market kind:

| Market kind | Quantity scale                            | Price scale                                                                                 |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Spot        | `baseDecimals` of the pair                | `quoteDecimals` of the pair (quote per one base)                                            |
| Perp        | `baseDecimals`                            | `quoteDecimals`                                                                             |
| Binary      | the selected market's collateral decimals | the same collateral decimals; one whole collateral unit prices a YES share at probability 1 |

`SpotMarket.baseDecimals` and `quoteDecimals` come from the indexed row. Spot markets are not assumed to have 6 decimals: `SOMI/USDso` has 18 and 18, `WBTC/USDso` has 8 and 18.

Binary collateral depends on the venue. The current deployment records show:

| Network         | Active binary venue collateral | Decimals | `oneCollateral` |
| --------------- | ------------------------------ | -------- | --------------- |
| Mainnet (5031)  | USDso                          | 18       | `10n ** 18n`    |
| Shannon (50312) | tUSDC                          | 6        | `10n ** 6n`     |
| Hideki (50383)  | tUSDC                          | 6        | `10n ** 6n`     |

These are current presets, not a rule for every market. A retired mainnet venue used six-decimal USDC.e. Custom venues may choose another token.

Read the selected binary market's `quoteDecimals` from its indexed row; `baseDecimals` matches it. If only the `marketId` is available, `(await client.getMarketOnchain(marketId)).decimals` reads the collateral token scale. This method falls back to `DECIMALS` (6) only when the token lacks the `decimals()` view; other read failures throw. Verify a non-standard token's scale before writing.

A binding without `indexerUrl` has no indexed `quoteDecimals`. With a known `marketId`, `getMarketOnchain(marketId)` supplies both `decimals` and `pool` for the chain-only order path. Omit `indexerUrl` for chain-only reads and writes; indexed discovery and history need an indexer. [Networks and endpoints](./networks-and-endpoints.md) lists the hosted indexers.

Set `oneCollateral = 10n ** BigInt(decimals)`. Use `probabilityToPrice(0.62, decimals)` for a YES price and `fromHuman(10, decimals)` for an outcome quantity. `mintSet` and `burnSet` amounts also use raw collateral units.

### Grids

| Field         | Meaning                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `tickSize`    | Raw price step. `UnifiedMarket.precision.price` is the number of decimal places that step has. |
| `lotSize`     | Raw quantity step. `UnifiedMarket.precision.amount` is its decimal places.                     |
| `minQuantity` | Raw minimum order quantity. `UnifiedMarket.limits.amount.min` is its human value.              |

`createOrder` aligns price and quantity to these grids before sending. A buy price rounds down, a sell price rounds up, a quantity rounds down. `priceToPrecision` and `amountToPrecision` round down for both sides.

### Conversion helpers

All helpers are exported from the root entry and default `decimals` to `DECIMALS` (6). Pass the selected market's decimals for binary writes and displays. The default is only correct for a six-decimal market.

| Helper                             | Signature                                        | Behaviour                                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fromHuman`                        | `(human: number \| string, decimals?) => bigint` | Converts a human value to raw. A `number` with more fraction digits than `decimals` is rounded half away from zero: `fromHuman(0.1234567, 6)` is `123457n`. A `string` with at most `decimals` fraction digits is parsed exactly. Throws `InvalidInputError` on a non-finite number. |
| `toHuman`                          | `(raw: bigint \| string, decimals?) => number`   | Converts raw to a `number`. Not exact past about 15 significant digits; suitable for display.                                                                                                                                                                                        |
| `toHumanString`                    | `(raw: bigint \| string, decimals?) => string`   | Converts raw to an exact decimal string.                                                                                                                                                                                                                                             |
| `probabilityToPrice`               | `(p: number, decimals?) => bigint`               | A YES probability in `[0, 1]` to a raw YES price. Throws `InvalidInputError` outside the range, including `NaN`.                                                                                                                                                                     |
| `priceToProbability`               | `(raw: bigint \| string, decimals?) => number`   | A raw YES price to a probability.                                                                                                                                                                                                                                                    |
| `balanceFloor`                     | `(raw: bigint, decimals?) => number`             | The largest human value that converts back to at most `raw` through `fromHuman`. Spending `balanceFloor(raw)` never exceeds `raw`.                                                                                                                                                   |
| `floorRawBalance`, `ceilRawAmount` | `(raw, decimals, quantum)`                       | Quantum-aligned floor and ceiling.                                                                                                                                                                                                                                                   |

## Basis points

| Unit                  | Scale                         | Used by                                                                                                                       |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Basis points (bps)    | 1 bps = 0.01 %                | Venue fees: `getMaxVenueFeeBps`, `MarketFees`, `getMaxLeverage` limits, `cexRateBps` in portfolio analytics                   |
| Basis points × 1000   | 1,000 = 1 bps                 | Builder fees: `builderFeeBpsTimes1k` on order placement, `maxFeeBpsTimes1k` on `approveBuilder`, `getMaxBuilderFeeBpsTimes1k` |
| Leverage in bps of 1× | 10,000 = 1.00×, 200,000 = 20× | Perp leverage: `getPerpLeverage`, `setPerpLeverage`, `getPerpMaxLeverage`                                                     |

`5_000n` as `maxFeeBpsTimes1k` allows up to 5 bps.

## Fixed-point rates

| Unit       | Scale                        | Used by                                                                                                                                      |
| ---------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Wad        | 1e18                         | SomniaLend health factor (`maxUint256` when the account has no debt); perp funding rates (`FUNDING_PRECISION`, `1_000_000_000_000_000_000n`) |
| Ray        | 1e27                         | SomniaLend rates and indexes. `lendRayRateToApy(rateRay)` returns a `number` APY; `RAY` is `10n ** 27n`.                                     |
| Price feed | 1e18 (`PRICE_FEED_DECIMALS`) | Oracle index prices. `LivePrice.price` and `ema` are `number`; `raw` is the exact string.                                                    |

A perp funding rate is a fraction per calculation window, 28,800 seconds (8 hours) on every live pool. `fundingRate8h`, `fundingRate1h`, `fundingRatePerInterval`, and `annualizedFundingRate` renormalise it. `UnifiedFundingRate.fundingRate` from `fetchFundingRate` is already per 8 hours as a `number`.

## Time

| Unit                           | Used by                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unix seconds, as `string`      | Indexer rows: `createdAt`, `lastTradeAt`, `placedAtTimestamp`, candle `bucketStart`                                                                                    |
| Unix milliseconds, as `number` | Every `SomniaMarkets` struct (`timestamp`), `datetime` as ISO-8601; `since` parameters of `fetchTrades`, `fetchMyTrades`, `fetchOHLCV`; reactivity schedule timestamps |
| Unix milliseconds, as `bigint` | Native `SomniaBlock` consensus timestamps                                                                                                                              |
| Unix nanoseconds, as `bigint`  | Order expiry: `expireTimestampNs` on `placeSpotOrder`, `placePerpOrder`, and the batch requests. The SDK default is about 50 years ahead.                              |

Candle intervals: `CANDLE_INTERVALS` is `[60, 300, 900, 3600, 14400, 86400]` seconds. `TIMEFRAMES` maps the exchange strings `1m`, `5m`, `15m`, `1h`, `4h`, `1d` to those seconds. Price-feed candles use `1m`, `1h`, `1d` on the exchange and `M1`, `H1`, `D1` on the client.

`UnifiedOHLCV` rows are `[ms, open, high, low, close, volume]`. On `fetchOHLCV` the last element is base volume. On `fetchPriceOHLCV` it is the number of oracle updates in the bucket, not volume.

## Struct conventions

| Struct                  | Convention                                                                                                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UnifiedBalance`        | `free === total` and `used` is `0` for spot and binary holdings. Funds locked in a resting order live in the pool, not the wallet, and do not appear. Perp collateral is locked in the MarginBank and does not appear either; `client.getMarginAccount(marginBank, account)` reads it. |
| `UnifiedOrder.type`     | Present only on the order `createOrder` returns. Absent on orders read from the indexer (`fetchOrders`, `fetchOpenOrders`, `watchOrders`): the pools do not emit the order type.                                                                                                       |
| `UnifiedStopOrder.type` | Always present: the stop registry emits it.                                                                                                                                                                                                                                            |
| `UnifiedOrder.id`       | The pool's order id as a decimal string; the transaction hash when nothing rested.                                                                                                                                                                                                     |
| `info`                  | Structs that wrap a native row or write result carry the raw payload under `info`. Aggregate and tuple results such as `UnifiedBalance`, `UnifiedBalances`, and `UnifiedOHLCV` do not.                                                                                                 |

## Identifiers

| Identifier                   | Format                                                                                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order id                     | Decimal string on the exchange API (`UnifiedOrder.id`), on live-store rows, and on indexer rows; `bigint` on trader results and chain reads such as `getOwnOpenOrdersOnchain`. When nothing rested, `UnifiedOrder.id` falls back to the transaction hash. |
| Fill id                      | `${blockNumber}_${logIndex}`                                                                                                                                                                                                                              |
| Trade id in `MarketActivity` | `TRADE:` followed by the fill id                                                                                                                                                                                                                          |
| ERC-6909 outcome id          | `(pool << 72) \| (nonce << 8) \| outcomeIndex`; `outcomeId`, `decodeOutcomeId`, `marketKey` encode and decode it                                                                                                                                          |
| Market type tag              | `bytes4`; `MARKET_TYPE_BINARY_V1` is `0x06c65d9f`                                                                                                                                                                                                         |

## Order enumerations

| Constant                        | Values                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ORDER_TYPE`                    | `LIMIT: 0`, `FILL_OR_KILL: 1`, `MARKET: 2` (immediate-or-cancel), `POST_ONLY: 3`                                                 |
| `SELF_MATCHING_OPTION`          | `CANCEL_TAKER: 0` (SDK default), `CANCEL_MAKER: 1`                                                                               |
| `ORDER_KIND_SIDE`               | `["BUY_YES", "SELL_YES", "BUY_NO", "SELL_NO"]`, indexed by the pool's `kind`                                                     |
| `UnifiedOrderStatus`            | `"open"`, `"closed"` (fully filled), `"canceled"` (explicit cancel, or an unfillable immediate-or-cancel remainder), `"expired"` |
| `CreateOrderParams.timeInForce` | `"GTC"` (default), `"IOC"`, `"FOK"`, `"PO"`                                                                                      |
