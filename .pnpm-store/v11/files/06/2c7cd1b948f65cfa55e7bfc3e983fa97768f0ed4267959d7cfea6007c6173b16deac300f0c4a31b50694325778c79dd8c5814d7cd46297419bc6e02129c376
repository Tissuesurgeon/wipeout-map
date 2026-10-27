# The exchange API

The `SomniaMarkets` class is the SDK's primary surface: markets keyed by symbols,
`fetch*`/`watch*`/`createOrder` verbs, human-unit structs — the idioms every
exchange bot already speaks (if you've driven a venue through ccxt, nothing
here will surprise you, down to the field names). Under the hood it runs on
the native engine (scoped watches, local books, one-round-trip writes), so the
`watch*` channels are zero-round-trip and `createOrder` confirms in a single
round-trip.

```ts
import { SomniaMarkets } from "@somnia-chain/markets-sdk";

const exchange = new SomniaMarkets({ indexerUrl, chain, wsRpcUrl, privateKey }); // Use `chains` to configure multiple chains.
await exchange.loadMarkets();

const symbol = "BTC-95000-31DEC26/USDC#YES";
const book = await exchange.watchOrderBook(symbol, 10); // live, zero RTT
const order = await exchange.createOrder(symbol, "limit", "buy", 10, 0.62);
// … later:
await exchange.cancelOrder(order.id, symbol);
```

The raw engine stays available at `exchange.client` on a single-chain
exchange, and at `exchange.engineFor(chainId)` on any exchange — bigint-exact,
address-keyed — for anything the exchange verbs don't cover; see
[the engine guide](./ENGINE.md).

## Symbols

A **symbol names a market**; a **tradable symbol** names something you place
orders on. For spot they coincide; for outcome markets each outcome is its own
tradable:

| Kind                 | Market symbol            | Tradables                |
| -------------------- | ------------------------ | ------------------------ |
| Spot                 | `SOMI/USDC`              | `SOMI/USDC`              |
| Binary               | `BTC-95000-31DEC26/USDC` | `…#YES`, `…#NO`          |
| Perp                 | `BTC/USDSO:USDSO`        | `BTC/USDSO:USDSO`        |
| Categorical _(soon)_ | `US-ELECTION-28/USDC`    | `…#TRUMP`, `…#NEWSOM`, … |

Binary symbols are synthesized as `ASSET-STRIKE-DDMONYY/QUOTE` (quote = the
collateral's ERC-20 symbol), with an `-HHMM` expiry component for intraday
series markets (`ETH-171780-03JUL26-0930/TUSDC`); any residual collision gets
a deterministic 4-hex market-id tiebreaker on the base side of the slash. Everything before `#` follows standard exchange symbol conventions; `#OUTCOME`
is our extension (binary markets need one). **Any raw ref works wherever a symbol does** — a pool address,
market id, or BinaryMarket address resolves to the same tradable (outcome
markets default to `#YES`).

Numbers are **human units in the tradable's own terms**: a `#NO` price of 0.38
_is_ the NO probability — the YES-terms complement, raw integers, and escrow
math are all internal. Raw payloads ride on every struct's `info`.

## Verbs

| Method                                                                       | Backed by                                | Notes                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadMarkets()` / `fetchMarkets()`                                           | indexer (+ one-time `symbol()` reads)    | builds the symbol registry; a failed registry read is contained and reported by `registryReadError`, not thrown                                                                                                                                                                                       |
| `fetchOrderBook(symbol, limit?)`                                             | chain                                    | head-fresh one-shot                                                                                                                                                                                                                                                                                   |
| `fetchTrades(symbol, since?, limit?)`                                        | indexer                                  | public tape                                                                                                                                                                                                                                                                                           |
| `fetchOHLCV(symbol, "5m", since?, limit?)`                                   | indexer                                  | `1m 5m 15m 1h 4h 1d`                                                                                                                                                                                                                                                                                  |
| `fetchOpenOrders(symbol?, limit?)`                                           | indexer                                  | authenticated; `limit` is per venue (default 200)                                                                                                                                                                                                                                                     |
| `fetchMyTrades(symbol?, since?, limit?)`                                     | indexer                                  | authenticated; scoped + windowed at the query, newest-first across venues                                                                                                                                                                                                                             |
| `fetchBalance()`                                                             | chain                                    | wallet balances by currency code (incl. binary YES/NO ERC-6909 holdings, keyed by tradable symbol)                                                                                                                                                                                                    |
| `fetchStatus()`                                                              | local                                    | watch/socket health                                                                                                                                                                                                                                                                                   |
| `watchOrderBook(symbol, limit?)`                                             | **local store**                          | zero RTT, current to last block                                                                                                                                                                                                                                                                       |
| `watchTrades(symbol)` · `watchOrders(symbol)` · `watchMyTrades(symbol)`      | **local store**                          | streaming                                                                                                                                                                                                                                                                                             |
| `createOrder(symbol, type, side, amount, price?, params?)`                   | chain write                              | 1-RTT confirm, fills decoded                                                                                                                                                                                                                                                                          |
| `cancelOrder(id, symbol)`                                                    | chain write                              |                                                                                                                                                                                                                                                                                                       |
| `mintSet` / `burnSet` / `redeem` `(symbol, amount)`                          | chain write                              | outcome markets only                                                                                                                                                                                                                                                                                  |
| `fetchFundingRate(symbol)`                                                   | chain                                    | perps: mark/index + funding rate                                                                                                                                                                                                                                                                      |
| `fetchPositions(symbols?)`                                                   | chain                                    | perps: open MarginBank positions                                                                                                                                                                                                                                                                      |
| `depositMargin` / `withdrawMargin` `(symbol, amount)`                        | chain write                              | perps: cross-margin collateral                                                                                                                                                                                                                                                                        |
| `watchPrice(asset)` · `fetchPrice(asset)`                                    | price feed                               | index price (EMA oracle) — see [Price feeds](./PRICES.md)                                                                                                                                                                                                                                             |
| `fetchPriceOHLCV(asset, "1m")`                                               | price feed                               | index candles: `1m`/`1h`/`1d`                                                                                                                                                                                                                                                                         |
| `fetchTicker(symbol)`                                                        | indexer; best-effort chain read on perps | last, 24h change and volume; the two halves fail independently and each reports its own state. A failed candle read, or a market with `indexed: false`, gives `statsState: "unavailable"` with every 24h field absent. A failed `getPerpState` gives `perpState: "degraded"` with the 24h half intact |
| `fetchOrders(symbol?, since?, limit?, { offset? })`                          | indexer                                  | authenticated; order history as one offset-paged set                                                                                                                                                                                                                                                  |
| `getOrderHistoryPage({ ref?, status?, limit?, offset? })`                    | indexer                                  | authenticated; preferred indexed-history name; partial raw-row page with immutable identity and continuation                                                                                                                                                                                          |
| `getOrdersPage({ ref?, status?, limit?, offset? })`                          | indexer                                  | compatibility name for `getOrderHistoryPage`                                                                                                                                                                                                                                                          |
| `fetchPortfolioAnalytics(timeframe, params?)`                                | indexer                                  | authenticated; PnL, equity and holdings series                                                                                                                                                                                                                                                        |
| `createStopOrder(symbol, type, side, amount, triggerPrice, price?, params?)` | chain write                              | spot only; see [Spot markets](./SPOT.md)                                                                                                                                                                                                                                                              |
| `fetchOpenStopOrders(symbol?)` · `cancelStopOrder(id, symbol)`               | indexer · chain write                    | spot stop orders                                                                                                                                                                                                                                                                                      |
| `fetchFundingRateHistory(symbol, since?, limit?)`                            | indexer                                  | perps: funding-rate history                                                                                                                                                                                                                                                                           |
| `setSigner({ privateKey \| account \| walletClient })`                       | local                                    | bind or replace the signer after construction                                                                                                                                                                                                                                                         |
| `priceToPrecision(ref, price)` · `amountToPrecision(ref, amount)`            | local                                    | snap a value down onto the market's tick or lot grid                                                                                                                                                                                                                                                  |
| `market(ref)`                                                                | local                                    | resolve any handle to its tradable                                                                                                                                                                                                                                                                    |
| `unwatchMarket(symbol)`                                                      | local                                    | release one market's watch and channels; pending `watch*` calls on it reject with `AbortError`                                                                                                                                                                                                        |
| `close()`                                                                    | local                                    | release all watches, channels, and sockets; a Node script exits on its own afterwards                                                                                                                                                                                                                 |

Still reserved: `watchPositions`, `setLeverage` (the raw
`exchange.traderFor(chainId).setPerpLeverage` exists for the latter).

For account fill history, `exchange.engineFor(chainId).getUserFillsPage` uses bounded
opaque-cursor pages. Its `datasetGeneration` comes from the serving Fill database;
continuation across a reindex or blue/green cutover throws a typed restart-required
error when the replacement's hashed producer inputs differ. Handler changes that
affect stored fills require a reindex; a code-only resume keeps the existing
generation. See [Fill history pages and dataset restart](reference/fill-history-pages.md)
before retaining pages across requests. To keep a whole history current between
reads, `getUserFillHistory` reads again only a recent window; see
[Keep a held history current](reference/fill-history-pages.md#keep-a-held-history-current).

### Paginated order identity

`getOrderHistoryPage` reads one bounded page for the configured account. Use it
when the caller must retain the chain, account, market, pool, and order id
together. `getOrdersPage` remains available as a compatibility name. The
default limit is 100 and the default offset is 0. A `status` filter runs in the
indexer. A `ref` also scopes the query to its pool, then verifies each raw market
id so a recycled binary pool cannot cross market lifetimes.

`rowsRead` counts raw indexer rows. `nextOffset` advances after a full raw page,
even when outcome filtering removes every display order or every identity is
unresolved. The `unresolved` list keeps rows whose immutable market id is absent
or inconsistent in the loaded registry. A null binary side remains on the YES
book. A NO scope excludes that row.

Every result has `coverage: "partial"` and `source: "indexer-offset"`. These are
indexed mutable records. They are not an immutable lifecycle log or a current
Open Orders snapshot. The indexer orders rows by placement time without a frozen
revision or a unique tie-break. Concurrent inserts or status changes can make
pages skip or repeat rows. A short page does not prove complete account state.

The `status` option filters indexed history. `status: "Open"` cannot establish
completeness, removals, continuity, or action freshness. Use a separately
supported current-state flow when the caller needs the SDK's current open-order
view. Each flow retains its documented freshness limits.

```ts
let offset = 0;
while (true) {
  const page = await exchange.getOrderHistoryPage({ limit: 100, offset });
  for (const order of page.orders) console.log(order.identity, order.status);
  if (page.nextOffset === null) break;
  offset = page.nextOffset;
}
```

### Portfolio analytics fill pages

Portfolio analytics needs the full indexed fill history to calculate PnL.
`fetchPortfolioAnalytics` reads the account's indexed SPOT fill history through
cursor pages of up to 999 rows. The indexer applies the SPOT filter, so binary
and perp fills are not transferred. The method reads all configured chains at
the same time, with one page in flight per chain. A short nonempty page triggers a one-row
continuation probe, so a positive Hasura row cap smaller than 1,000 cannot
silently end the traversal. It computes PnL only after the final page.
Its default is an exhaustive traversal of the rows visible to the configured
indexer role, including older fills that establish the cost basis for recent
sells. The deployment must establish a row cap of at least one; a zero cap
is indistinguishable from an empty history through the same role.

Set `params.maxFillPages` to a positive safe integer to bound logical pages for one call.
The budget counts pages across all chains.
Each page may use two indexer requests when a continuation probe is needed.
If more history remains, the method throws `IncompleteHistoryError` with
`reason: "pageBudgetExceeded"` and `pagesRead` instead of returning plausible
but incomplete PnL. A repeated cursor throws the same class with
`reason: "cursorCycle"`. `IndexerError` still signals a failed indexer request.
A failure on one chain rejects the call and stops the other chains at their next page.
On a multi-chain exchange, the `IndexerError` carries the `chainId` that failed.
Each call starts with a fresh first-page read;
an earlier empty result is not cached and cannot hide a newly indexed fill.
Cursor continuation assumes an unchanged indexer dataset during the call;
it is not a reindex generation or chain-head completeness proof.

### The `watch*` idiom

Each `await` resolves when the channel next changes; the first call resolves
immediately after the (ref-counted) market watch hydrates:

```ts
while (running) {
  const book = await exchange.watchOrderBook(symbol, 5); // resolves per change
  requote(book.bids[0], book.asks[0]);
}
```

**"Did my resting order fill?"** — watch your orders and look for the status flip:

```ts
const orders = await exchange.watchOrders(symbol);          // resolves per change
const mine = orders.find((o) => o.id === orderId);
if (mine?.status === "closed") …                            // filled
```

### `createOrder` params

- `type: "limit" | "market"` — market orders compute a crossing limit from the
  best opposite level ± `params.slippage` (default 1% on this surface; the
  engine's `quoteBinaryStake` / `quoteBinarySell` helpers default to 3% with a
  10-tick floor) and send IOC; they throw
  `InvalidInputError` if the opposite side is empty. When the chain rejects an
  order you get a `ContractRevertError` whose `errorName` is the contract's own
  error — see [ENGINE.md § Errors](./ENGINE.md#errors--branch-on-the-type-never-the-message).
- `params.timeInForce: "GTC" | "IOC" | "FOK" | "PO"` (or `postOnly: true`) —
  maps to the on-chain order types.
- `params.builder` / `params.builderFeeBpsTimes1k` — attribute the order to a
  routing/builder frontend and pay it a per-order fee (pool bps×1000 unit).
  Requires a prior one-time
  `exchange.traderFor(chainId).approveBuilder({ pool, builder, maxFeeBpsTimes1k })`
  opt-in on the pool's chain (for example `exchange.traderFor(50383)` for a
  Hideki pool), else a non-zero fee reverts (`BuilderFeeExceedsCap` on binary,
  `BuilderNotApproved` on spot, `BuilderFeeExceedsApproval` on perp). Works on
  binary, spot and perp —
  but the approval is stored per pool, so opt in on each pool you attribute
  orders on.
- `params.funding: "explicit" | "auto" | "skip"` — what to do when the
  order's collateral is not on the market's chain (a multi-chain exchange
  only; see below). `"explicit"` throws `CollateralOnWrongChainError` with a
  ready bridge plan and sends nothing; `"auto"` bridges the shortfall the way
  `exchange.ensureFunds` does, for the escrow token found by address, waits
  for delivery, then places; `"skip"` runs no
  balance check. The default is `"explicit"` once the exchange spans a second
  chain and `"skip"` on a single-chain exchange.
- The returned order: `status: "open"` (rested), `"closed"` (fully filled in
  the same round-trip — `filled`/`remaining` say how much), or `"canceled"`
  (IOC remainder). `info` carries the receipt + raw fills, and `chainId` names
  the chain it was sent on.

## One exchange, several chains

A market is unique to one chain, so a symbol names exactly one
`(chainId, market)`. Configure every chain the account trades on and the
exchange builds one engine per binding: reads merge, writes route to the
market's chain, and every struct carries its `chainId`. Do not mix mainnet and
testnet chains in one exchange. The example pairs the two testnets.

```ts
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { hidekiTestnet, somniaShannon } from "@somnia-chain/markets-sdk/chains";

const exchange = new SomniaMarkets({
  chains: [
    {
      chain: somniaShannon,
      indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
      addresses: SOMNIA_TESTNET_ADDRESSES,
    },
    // Hideki has no hosted indexer. Indexed reads need an indexer you operate.
    { chain: hidekiTestnet, indexerUrl: hidekiIndexerUrl, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES },
  ],
  account: safeAccount, // one address on every chain, one executor per chain
});
await exchange.loadMarkets();

const bal = await exchange.fetchBalance();
bal.USDso?.total; // summed across chains
bal.USDso?.byChain[hidekiTestnet.id]?.total;

const order = await exchange.createOrder("BTC/USDso:USDso", "limit", "buy", 1, 60_000);
order.chainId; // the chain the market lives on
```

- The single-chain config is the one-element case and behaves exactly as
  before.
- Each chain needs its own indexer. Two bindings that name one indexer URL,
  written with a different case or a trailing slash, also throw
  `InvalidInputError`.
- Each engine checks its endpoints before it uses their data. Its first indexed
  read or hydration also reads the indexer's `chain_metadata`. The two requests
  go out together, and no row reaches the caller or the live store until the
  check passes: an indexer that does not index the binding's chain throws
  `NotConfiguredError`. On Hideki (50383), the first
  chain read first reads block 1: an RPC on the retired v1 genesis throws
  `NotConfiguredError`.
- A bare pool address or market id that exists on two chains (the same CREATE2
  pool on L1 and Hideki) is ambiguous: pass `{ chainId, id }` — a
  `ChainMarketRef` — wherever a symbol is accepted, and `{ chainId, pool, id }`
  to `cancelOrder`.
- Live and history rows name their chain too. `LiveFill`, `LiveOrder`,
  `LiveFundingUpdate`, `LiquidationEvent` and `FundingPayment` carry `chainId`,
  the chain of the engine that produced the row. A fill id or an order id can
  repeat on two chains, so key merged rows on `(chainId, id)`. Price-feed rows
  are not in that set: a feed is configured separately from the chain, so one
  endpoint can serve two engines and a tick is not a per-chain row.
- `exchange.client` and `exchange.trader` name no chain, so they throw
  `InvalidInputError` on an exchange with two or more chains. A pool address
  or market id can name a different market on each chain. Use
  `exchange.engineFor(chainId)` for raw reads and `exchange.traderFor(chainId)`
  for raw writes.
- `exchange.watchUser()` hydrates the account's history on every chain behind
  one handle. The chains open at the same time. When one fails, the call stops
  every handle that opened and throws the error of the first failing chain in
  binding order.
- Collateral must sit on the market's chain. `exchange.bridge` plans and
  executes transfers between the exchange's chains through the account's
  executors, and `exchange.ensureFunds({ code, chainId, amount })` is the
  helper behind `createOrder(…, { funding: "auto" })`. On a native route
  (STT), all three throw `BridgeLiquidityError` and send nothing when the
  destination router holds less than the amount.
- A bridge waits for its own Hyperlane message on the destination, matched by
  message id. On the Hideki 2 lane the measured median is 7.5 s to 8.7 s per
  leg, and the default delivery timeout is 180 s. A router drained after the
  liquidity check stalls delivery until it is seeded again. On a timeout,
  `ensureFunds` and `createOrder(…, { funding: "auto" })` throw
  `BridgeDeliveryTimeoutError` with the `messageId` and place no order. Check
  `delivered(messageId)` on the destination Mailbox before you bridge again.
  See [the bridge guide](./BRIDGE.md#bridging-through-the-exchange).
- On one exchange, `ensureFunds` and `createOrder(…, { funding: "auto" })`
  run one at a time per account, chain and currency. An auto-funded order
  keeps its place in that queue until it is sent. So two concurrent
  auto-funded orders bridge their combined shortfall once, and neither counts
  funds the other one needs. Each queued call can wait a full delivery timeout.
  A leg that timed out stays pending on the exchange. When the next call for
  the same key finds a shortfall, it waits for that message and sends no new
  leg for it. `close()` ends the delivery waits of every call that started
  before it, as a timeout, and the leg stays pending. This state is in memory
  only.
- The account: `{ address, executors: { [chainId]: Executor } }`. Build an
  executor with `engine.createExecutor(spec)` — a private key, a wallet, a
  Somnia session seed, or a smart account with the executor that sends its
  outer transaction. Any object implementing `Executor` works too, for
  example for a safe that the accounts factory did not deploy: the SDK
  decodes the order from the receipt it returns and never fetches it again.
  When the executor returns an inner failure as `failure` on a success-status
  receipt, Trader writes throw it.
- A factory smart account from `@somnia-chain/accounts-sdk` is a first-class
  actor: `engine.createExecutor({ smartAccount, inner })` batches through the
  accounts SDK's own MultiSend batcher with no configuration, signs nothing
  when the inner actor is a direct owner at threshold 1, and reaches an
  account owned by other accounts through `through`. The whole lifecycle —
  derive, create on every chain with one signature, manage owners, move funds
  — is `client.accounts` and `exchange.accounts`;
  `exchange.accounts.accountFor(accountId, index, { sessionSeed })` builds the
  multi-chain account above in one call. It signs locally from the seed's key,
  so the seed never goes to a node. A `{ sessionSeed }` executor, which sends
  the seed to the node, is refused as an account's `inner`. See the
  [Smart accounts guide](./ACCOUNTS.md) and
  [Trade through a smart account](./how-to/trade-through-a-smart-account.md).

### Reads across chains

This section tells you what a read does when one chain of a multi-chain
exchange fails, and how to read only the chains that answer. A single-chain
exchange behaves as before.

**Account reads fail closed.** `fetchBalance`, `fetchOpenOrders`,
`fetchOrders`, `getOrdersPage`, `getOrderHistoryPage`, `fetchMyTrades`,
`fetchPositions`, `fetchOpenStopOrders` and `watchUser` read every chain when
you give no market and no chain. When one chain fails, the read throws. It does
not return the rows of the other chains, because a merged result with one chain
missing looks like "the account holds less". On an exchange with two or more
chains, the thrown `IndexerError` or `RpcError` has `chainId` set to the chain
that failed. The SDK sets this field on the original error. The class, the
message and the `cause` do not change, so `instanceof` checks still work. A read
scoped to one chain, by a market or by a chain filter, throws its error without
`chainId`.

**Read one chain with a chain filter.** Each of these reads accepts a
`SomniaMarketsChainFilter` (`{ chainId }`): as the last argument, in `params`
for `fetchOrders`, and in the options of `getOrdersPage` and
`getOrderHistoryPage`. A filtered read calls only the engine of that chain. Use
it to read each chain on its own and to show a failed chain as failed:

```ts
const results = await Promise.allSettled(exchange.chainIds.map((chainId) => exchange.fetchBalance({ chainId })));
```

- A `chainId` that the exchange does not span throws `NotConfiguredError`.
- A market and a `chainId` on different chains throw `InvalidInputError`, with
  both chains in `chainIds`.
- Before an account read, the exchange loads markets. That load reads only the
  chains that the read touches, so a filtered read never calls another chain.
  Of those chains, it reads a chain that no load has read yet. It also reads a
  chain whose last load failed, but at most once in 30 seconds after that
  chain's last load finished. Between those retries, the read uses the cached
  markets, and the failure accessors keep the recorded error and failing chain.
  A read that starts while a retry of its chain runs waits for that retry. A
  read can also wait while another market load runs, for example a read
  filtered to another chain on a new exchange. To avoid this, call
  `loadMarkets()` once before you read chains in parallel.

**Chains with no indexer.** A chain bound with no `indexerUrl` (Hideki has no
hosted indexer) keeps the parts of each read that come from the chain.
`exchange.chainIdsWithoutIndexer` lists these chains, in binding order.

| Read                                                                                                       | On a chain with no `indexerUrl`                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchBalance`                                                                                             | ERC-20 and native balances. No binary outcome holdings, because holdings are indexer data                                                      |
| `fetchOpenOrders`                                                                                          | Resting orders read from the chain, over the perp pools that `loadMarkets` found on that chain. These rows have no `txHash` and no `timestamp` |
| `fetchPositions`                                                                                           | Complete. It needs no indexer                                                                                                                  |
| `fetchOrders`, `getOrdersPage`, `getOrderHistoryPage`, `fetchMyTrades`, `fetchOpenStopOrders`, `watchUser` | The chain is skipped                                                                                                                           |

- A skipped chain adds no rows. A missing chain in the result does not mean
  that the account has no orders or trades there.
- A chain is skipped only when the read also spans a chain with an indexer. A
  read scoped to a chain with no indexer, or a read where no chain has an
  indexer, throws `NotConfiguredError`. It never returns a result that looks
  empty.

**One pool's oracle does not fail `fetchPositions`.** `fetchPositions` reads
the pool state (mark, index, funding) only for a pool where the account holds a
position. When that read fails, for example because the pool's oracle reverts,
the position still lists with `perpState: "degraded"`, and `markPrice` and
`unrealizedPnl` are absent. The other positions are not affected. Branch on
`perpState`, not on the absence of `markPrice`. `fetchPositions` returns its
rows grouped by chain, in binding order.

**Health and market loading report each chain.** These two surfaces keep
answering when one chain fails:

- `fetchDataStatus()` measures each chain on its own. `indexerByChain` holds
  every chain that was measured, and `null` there still means that the chain's
  metadata row is absent. `indexerErrorByChain` holds the original error of
  every chain that failed, and is present only when a chain failed.
  `indexer` (the primary chain) is absent when the primary chain failed. The
  call throws only when every chain fails. It then throws the primary chain's
  error, with `chainId` set on an exchange with two or more chains.
- `loadMarkets()` does not throw on a failed registry read or a failed perp
  discovery. `registryReadErrorsByChain`, `perpDiscoveryErrorsByChain` and
  `perpDiscoveryPartialFailuresByChain` report the failures of each chain.
  `registryReadError`, `perpDiscoveryError` and `perpDiscoveryPartialFailure`
  still report one failure: the first failing chain, in the order of the
  `chains` config.
- A bare `loadMarkets()` reads again each chain that failed on the last load.
  It also loads each chain that no load has read yet, for example after only
  reads filtered to another chain. The other chains keep their cached markets. A `NotConfiguredError` failure,
  for example the registry read of a chain with no indexer, is not retried.
  `loadMarkets(true)` reloads every chain.
- A verb that loads markets for you, such as `fetchBalance`, `fetchMyTrades`
  or `fetchPositions`, retries a failed chain at most once in 30 seconds after
  that chain's last load finished. `loadMarkets()`, `fetchMarkets()`,
  `ensureFunds` and `loadMarkets(true)` retry at once. Between retries, the
  failure accessors stay populated with the error and the failing chain.
- Symbols are unique across the loaded chains. When a chain loads later than
  the others, a symbol that it shares with a market on another chain changes on
  both chains. Call `loadMarkets()` before you keep symbols.

## Structs

One set of shapes throughout: markets `{ id, symbol, type, base, quote, active,
precision, limits, outcomes?, info }`; books as `[price, amount]` pairs, best
first; orders `{ id, symbol, type?, side, price, amount, filled, remaining,
status, timestamp, info }` (`type` is absent on orders read back from the
indexer — the pools do not emit it); trades `{ id, symbol, price, amount, cost, side?,
timestamp, info }`; balances `{ [code]: { free, used, total } }` (escrowed
funds live in the pools, so wallet `free === total`); OHLCV rows
`[ms, open, high, low, close, baseVolume]`.

## How each market kind maps

- **Spot** — symbol is the tradable; `side` is base-buy/base-sell; done.
- **Binary** — two tradables per market. The engine keeps one YES-terms book;
  the resolver presents each outcome's own view (prices, sides, candles all
  outcome-relative). `mintSet`/`burnSet`/`redeem` operate at market level.
- **Perps** — `type: "swap"`, settle = quote (linear, collateral-settled);
  `createOrder` unchanged (margin locks from your MarginBank balance —
  `depositMargin` first); `fetchPositions`/`fetchFundingRate` read the
  MarginBank/pool live.
- **Categorical / multi-outcome** _(teed up)_ — N tradables on one pool
  (outcome index = the order's `userData`, exactly as binary uses 0/1 today);
  same verbs, and cross-book complete-set fills will surface in
  `watchMyTrades` with a shared match id in `info`.

The design intent: **the verbs never change again** — every future market kind
is new data (a `type`, an `outcomes[]` list), not new API.
