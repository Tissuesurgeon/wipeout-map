# About symbols and human units

This page discusses two choices in the exchange API: markets are addressed by symbols such as `SOMI/USDso`, and quantities are decimal numbers rather than integers scaled by token decimals. Both choices trade exactness for familiarity, and the SDK keeps the exact values within reach. The grammar itself is in the [Symbols reference](../reference/symbols.md) and the scales in [Units and scales](../reference/units-and-scales.md).

## Why symbols

Spot and perp markets use a pool address as their identity. A binary market has a stable `marketId` and a `BinaryMarket` contract address; its pool address can be [reused by later markets](./binary-pool-recycling.md). These identifiers are exact, but they mean little to a human reading a log line or a config file.

Exchange tooling answered this question years ago: a market is `BASE/QUOTE`, a derivative carries its settlement currency after a colon, and a bot's configuration lists symbols. The exchange API adopts that grammar so that code written against ccxt-style venues transfers with little change. The design intent is that the verbs never change again: a new market kind is new data (a `type`, an `outcomes` list), not a new API.

Binary markets have no precedent in that grammar. Each market has two things you can trade, YES and NO, and each needs its own price and its own side of the book. The SDK's answer is the `#OUTCOME` suffix: `BTC-95000-31DEC26/USDC#YES` and `…#NO` are two tradables on one market. A market symbol without a suffix resolves to YES, so callers who only think in YES terms can ignore the suffix entirely.

The cost of synthesised symbols is that they are derived, not stored. Two markets can render the same symbol, for example two series markets with the same asset and expiry. The SDK breaks the tie deterministically with a four-hex-digit suffix from the market id. That keeps the mapping one-to-one, but it means a symbol can carry a suffix a human did not expect. For that reason every method also accepts the raw pool address or market id in place of a symbol.

## Why human units

On chain, a quantity is an integer scaled by the token's decimals, and a binary price of 0.62 is `620000` when the collateral has six decimals. Correct code must carry the decimals with every number, and most bugs in trading code are decimals bugs.

The exchange API takes and returns JavaScript numbers in the tradable's own terms: 10 shares at 0.62, 1 SOMI at 0.5 USDso. The SDK converts at the boundary using the decimals it already knows from the market row. The caller never sees a raw integer unless they ask for one.

A NO price is the NO probability. The pool keeps a single book in YES terms, and a NO bid at 0.38 is a YES ask at 0.62 on chain. The SDK presents each outcome's own view (prices, sides, and candles are outcome-relative) and performs the complement internally. A caller who buys NO at 0.38 reasons about NO at 0.38.

## What it costs, and how the SDK pays

A JavaScript number holds about 15 significant digits. An 18-decimal token amount does not fit. The conversion helper used for display, `toHuman`, is documented as lossy for that reason, and `toHumanString` exists for exact rendering. On the way in, `fromHuman` rounds a value with too many fraction digits rather than throwing. We judged that a computed mid price almost always has too many digits and that rejecting it would hurt more than rounding. A caller who needs exactness passes a string.

The exchange structs that wrap a native row or result carry that payload under `info`. An order's `info` is the placement result with the receipt and the decoded fills in bigint. A market's `info` is the indexed row with `tickSize`, `lotSize`, and the token addresses. Aggregate and tuple results such as `UnifiedBalance`, `UnifiedBalances`, and `UnifiedOHLCV` do not have `info`. The engine at `exchange.client` preserves each backend's exact representation: chain reads and writes use bigint, while indexer and live-store numeric fields such as prices and quantities are decimal strings.

The SDK aligns prices and quantities to the venue's tick and lot grids before it sends an order, and never against the caller. A buy price rounds down, a sell price rounds up, a quantity rounds down. The returned order echoes the aligned values. This is where the human-unit design most visibly diverges from what the caller typed. It is why the reference says to read `price` and `amount` back from the result rather than assuming the inputs.

## The alternative we did not take

A `bigint`-only exchange API would be exact and would match the engine's chain boundary. We judged that it would also reproduce the decimals bugs it exists to remove: every caller would carry `baseDecimals` and `quoteDecimals` through their own code, and the ccxt idiom the API borrows would be lost. A decimal library would be exact and readable, but it would make the SDK impose a number type on every consumer. The chosen design keeps the surface familiar and keeps exactness one property access away.

## Where the protocol shows through

Two conventions in the structs are protocol facts that the human-unit layer cannot hide, and the [Units and scales reference](../reference/units-and-scales.md#struct-conventions) records them. Wallet balances report `free === total`, because locked funds sit in the pool rather than the wallet. Orders read back from the indexer have no `type`, because the pools do not emit it. In both cases the SDK reports what it knows rather than guessing.
