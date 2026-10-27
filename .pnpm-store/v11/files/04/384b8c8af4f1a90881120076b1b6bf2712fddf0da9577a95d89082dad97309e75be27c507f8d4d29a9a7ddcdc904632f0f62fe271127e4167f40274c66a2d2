# Symbols

This page describes the symbol grammar of the exchange API (`SomniaMarkets`). A symbol names a market; a tradable symbol names something an order can be placed on. Every method that takes a symbol also takes a raw chain reference.

## Grammar

| Market kind            | Market symbol               | Tradable symbols  | Example                      |
| ---------------------- | --------------------------- | ----------------- | ---------------------------- |
| Spot                   | `BASE/QUOTE`                | the market symbol | `SOMI/USDso`                 |
| Perp                   | `BASE/QUOTE:SETTLE`         | the market symbol | `BTC/USDso:USDso`            |
| Binary                 | `ASSET-STRIKE-EXPIRY/QUOTE` | `…#YES`, `…#NO`   | `BTC-95000-31DEC26/USDC#YES` |
| Categorical (reserved) | `NAME/QUOTE`                | `…#OUTCOME`       | `US-ELECTION-28/USDC#TRUMP`  |

The part before `#` follows the conventions of exchange tooling such as ccxt. The `#OUTCOME` suffix is specific to this SDK.

`UnifiedMarket.type` is `"spot"`, `"swap"` (a linear perp), `"binary"`, or `"categorical"` (reserved).

## Synthesis rules

The SDK synthesises symbols from the indexed market row.

- Token codes are the ERC-20 `symbol()` values, stripped to `[A-Za-z0-9.]`. Case is preserved: `USDso` and `USDC.e` keep their casing.
- `STRIKE` is the strike as a decimal string with trailing zeros removed. A series market with strike `0` renders `0`, for example `ETH-0-04SEP26/tUSDC`.
- `EXPIRY` is `DDMONYY` in UTC, for example `31DEC26`. An expiry that is not at 00:00 UTC appends `-HHMM`, for example `03JUL26-0930`.
- A collision between two markets appends `-XXXX` to the base side, where `XXXX` is the last four hexadecimal digits of the market id, upper-cased.

## Raw references

Every exchange-API method accepts, in place of a symbol:

| Reference            | Format                                | Resolves to             |
| -------------------- | ------------------------------------- | ----------------------- |
| Pool address         | 40 hexadecimal digits with `0x`       | The market on that pool |
| Market id            | 40 or 64 hexadecimal digits with `0x` | The market              |
| BinaryMarket address | 40 hexadecimal digits with `0x`       | The binary market       |

A binary market addressed without an outcome resolves to outcome 0, `YES`.

## Resolution

`exchange.market(ref)` returns a `Tradable`:

| Field          | Type                  | Description                                      |
| -------------- | --------------------- | ------------------------------------------------ |
| `market`       | `Market`              | The native market row. Narrow on `marketType`.   |
| `marketSymbol` | `string`              | The market symbol, without outcome suffix.       |
| `symbol`       | `string`              | The tradable symbol.                             |
| `outcome`      | `string \| undefined` | `"YES"` or `"NO"` on binary markets.             |
| `outcomeIndex` | `number \| undefined` | `0` for YES, `1` for NO.                         |
| `pool`         | `Address`             | The pool that receives orders for this tradable. |

`market(ref)` throws `InvalidInputError` when:

- a chain reference is unknown, including before `loadMarkets()` has run: `unknown market ref … — call loadMarkets() first`;
- a symbol is unknown, including before `loadMarkets()` has run: `unknown symbol … — call loadMarkets() first`;
- an outcome suffix is given on a spot or perp market: `… is a SPOT market — it has no outcomes`;
- the outcome does not exist: `… has no outcome "X" (has: YES, NO)`.

`exchange.symbols` lists every tradable symbol. `exchange.markets` maps market symbols to `UnifiedMarket` rows. Both are populated by `loadMarkets()`.

## Prices and sides per tradable

Numbers are expressed in the tradable's own terms.

- Spot and perp: price is quote per base; `buy` buys the base.
- Binary `#YES`: price is the YES probability in `(0, 1)`; `buy` buys YES shares.
- Binary `#NO`: price is the NO probability, `1 − YES`; `buy` buys NO shares. The conversion to the pool's YES-terms book is internal.

`mintSet`, `burnSet`, and `redeem` take the market symbol or either tradable; they act on the market.
