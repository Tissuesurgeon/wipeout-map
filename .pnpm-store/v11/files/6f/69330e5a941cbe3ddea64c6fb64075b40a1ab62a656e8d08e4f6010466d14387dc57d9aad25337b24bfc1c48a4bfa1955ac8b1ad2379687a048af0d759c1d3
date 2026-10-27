# @somnia-chain/markets-sdk

The TypeScript SDK for building on **Somnia Markets** — read live market data
and place trades on the on-chain order book from your own app.

- **Live data, no wallet required.** Market watches stream chain events after
  hydration. Account views use event updates and SDK-managed polling. Check
  [read tiers](./docs/reference/read-tiers.md) for each view's source and cadence.
- **Trading with a signer.** Place and cancel orders, mint and redeem outcome
  shares, and more, through a typed trader bound to your wallet.
- **Works anywhere, with first-class React.** Use plain async functions in any
  environment, or drop in the hooks for components that update themselves.

## Install

```sh
pnpm add @somnia-chain/markets-sdk viem   # npm / yarn / bun equivalents work too
```

`viem` is a peer dependency. `react` is an optional peer — only needed for the
`@somnia-chain/markets-sdk/react` entry.

The current package also ships `/chains`, `/reactivity`, and `/native`.
These extra subpaths are existing migration debt against
[SDK-API-002](https://github.com/somnia-chain/somnia-markets/blob/main/packages/sdk/RULES.md#sdk-api-002--the-package-has-two-approved-entrypoints).
Their presence does not establish additional approved entrypoints.

Canary builds of validated `main` commits can be published under the npm
`canary` dist-tag. A canary is a test build, not a release. Pin its exact
version, for example `pnpm add -E @somnia-chain/markets-sdk@canary`, and check
its readiness for your environment. The
[canary section of the release process](https://github.com/somnia-chain/somnia-markets/blob/main/packages/sdk/RELEASE_PROCESS.md#3a-canary-publication-from-main)
describes versions, source identification and limits.

> Versions up to 0.19.0 were published to GitHub Packages under the private
> `@somnia-chain` scope; from 0.20.0 the package is public on npm — no
> registry configuration or token needed.

## Create an exchange

`new SomniaMarkets(config)` is the single entry point — the exchange owns everything:
symbols, market data, watches, and writes. No global setup, no hidden singleton;
each exchange is isolated.

```ts
import { SomniaMarkets, SOMNIA_MAINNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaMainnet } from "@somnia-chain/markets-sdk/chains"; // every Somnia network, incl. Shannon/Elwood/Hideki/local

const exchange = new SomniaMarkets({
  indexerUrl: "https://prd.smk.somnia.host/v1/graphql", // the production indexer
  chain: somniaMainnet,
  wsRpcUrl: "wss://api.infra.mainnet.somnia.network/ws",
  addresses: SOMNIA_MAINNET_ADDRESSES, // baked-in per-chain constants (SOMNIA_TESTNET_ADDRESSES for testnet)
  privateKey, // optional — needed for createOrder & friends
});
await exchange.loadMarkets();

const book = await exchange.watchOrderBook("BTC-95000-31DEC26/USDC#YES"); // live, zero RTT
const order = await exchange.createOrder("BTC-95000-31DEC26/USDC#YES", "limit", "buy", 10, 0.62);
```

For testnet, swap all four: `https://dev.smk.somnia.host/v1/graphql`,
`somniaShannon`, `wss://api.infra.testnet.somnia.network/ws`, and
`SOMNIA_TESTNET_ADDRESSES`.

The raw engine tier — bigint-exact, address-keyed — is reached _through_ the
exchange (`exchange.client`, `exchange.trader`), never constructed separately.
The WebSocket opens lazily on first chain I/O, so an indexer-only exchange
(e.g. server-side GraphQL reads) never opens one. Nothing is shared between
instances: per-request servers, parallel tests, a second account — just
construct another. Two exchanges never share watch state or sockets. One
exchange spans several chains, so a multi-chain bot needs only one — but
`exchange.client` and `exchange.trader` name no chain, so on an exchange with
more than one chain binding they throw `InvalidInputError`. Reach the raw tier
per chain with `exchange.engineFor(chainId)` and `exchange.traderFor(chainId)`.

Node RPC and price-feed sockets use an SDK-managed `ws` transport with owned
disposal. Replacing a Node global no longer selects their implementation. Pass a conforming standard
constructor as `rpcWebSocketConstructor` on `SomniaMarkets` when you need custom
infrastructure. Browser default selection is unchanged. The constructor remains
yours; every socket it creates belongs to that exchange and must promptly close
connecting/open work without replacement dials. See [constructor selection and migration](./docs/reference/configuration.md#rpc-constructor-selection).

New to the SDK? The **[documentation map](https://prd.smk.somnia.host/docs/typescript)** groups every page
by need: two tutorials that end with a cancelled order on testnet, goal-shaped
how-to guides, reference tables for configuration, symbols, units, and errors,
and explanations of the design.

The area guides, in reading order:

- **[The exchange API](https://prd.smk.somnia.host/docs/typescript/exchange)** — the `SomniaMarkets` class, the
  SDK's primary surface: symbols (`SOMI/USDC`, `BTC-95000-31DEC26/USDC#YES`),
  `fetch*`/`watch*`/`createOrder`, human-unit structs. Exchange-bot muscle
  memory (ccxt included) transfers directly — start here.
- **[Spot markets](https://prd.smk.somnia.host/docs/typescript/spot-markets)** — base/quote books: ticks and lots,
  native-base escrow, market orders, and stop orders.
- **[Binary markets](https://prd.smk.somnia.host/docs/typescript/binary)** — YES/NO information markets:
  probability prices, the four sides, mint/burn/redeem, and a maker loop.
- **[Perps](https://prd.smk.somnia.host/docs/typescript/perps)** — live on testnet: cross-margin via the
  MarginBank, funding, positions, and how perps slot into the `marketType`
  union.
- **[Price feeds](https://prd.smk.somnia.host/docs/typescript/prices)** — realtime BTC/ETH index prices from the
  on-chain EMA oracle: `watchPrice`/`getLivePrice`, one-shot history + candles,
  and the React hooks.
- **[SomniaLend](https://prd.smk.somnia.host/docs/typescript/lend)** — the third-party money market wrapped as
  `client.lend`: supply idle collateral, borrow working capital, reserve rates
  as APYs.
- **[Chains](https://prd.smk.somnia.host/docs/typescript/chains)** — every Somnia network as a viem `Chain`
  (mainnet, Shannon, Elwood, Hideki, local anvil) from
  `@somnia-chain/markets-sdk/chains`, plus `getSomniaChain(id)`.
- **[Bridge](https://prd.smk.somnia.host/docs/typescript/bridge)** — moving tokens between Somnia networks over the
  Hyperlane warp routes: the token/network enums, the per-network registry, and
  `createBridgeTransfer` → the unsigned transactions that do it.
- **[Native RPC](https://prd.smk.somnia.host/docs/typescript/native)** — the `somnia_*` namespace wrapped as ordinary
  calls: the native ledger block, chain statistics, protocol parameters, reactivity
  subscription reads, and **session transactions** (the node holds the key, tracks
  the nonce, signs, and returns the receipt).
- **[Reactivity](https://prd.smk.somnia.host/docs/typescript/reactivity)** — Somnia's event-driven primitive via
  `@somnia-chain/markets-sdk/reactivity` (a pointer at the upstream
  `@somnia-chain/reactivity` package): events pushed _with_ the state that goes
  with them, into TypeScript (`watch`) or into a Solidity handler (`subscribe`).
- **[The engine (advanced)](https://prd.smk.somnia.host/docs/typescript/engine)** — the raw tier behind the
  exchange (`exchange.client` / `exchange.trader`, or `engineFor(chainId)` /
  `traderFor(chainId)` when it spans several chains): bigint-exact reads,
  ref-counted watches, React hook wiring, raw writes.
- **[Architecture guide](https://prd.smk.somnia.host/docs/typescript/architecture)** — diagrams of the whole
  machine: the watch seam, event routing, the local order book, the reconnect
  lifecycle, and the one-round-trip write path.

### Three ways to read

| How                                        | What it is                                                             | Returns             |
| ------------------------------------------ | ---------------------------------------------------------------------- | ------------------- |
| `client.list*` / `client.get*`             | **One-shot** read (indexer GraphQL or on-chain)                        | a `Promise`         |
| `client.getLive*` + `client.subscribeLive` | **Synchronous** read off the live store (within a `watchMarket` scope) | a value, now        |
| `use*` hooks (`/react`)                    | React bindings over the live store (auto-watching)                     | re-render on change |

So `client.getFills` fetches once; `client.getLiveFills` reads the live tape;
`useLiveFills` re-renders a component as it updates. In React, provide the client
once with `<SomniaMarketsProvider client={client}>` (from `@somnia-chain/markets-sdk/react`)
and the hooks read it from context.

Markets come from one discriminated union — `Market = SpotMarket | PerpMarket |
BinaryMarket`, keyed on `marketType` — via `client.listMarkets` / `client.getMarket`. Binary-only
callers can use `client.listBinaryMarkets` / `client.getBinaryMarket`, the same
query pre-narrowed to `BinaryMarket`. (Note: _binary_, not _clob_ — a spot market
is an order book too, so "CLOB" was never the right label for the binary surface.)

Money crosses the API as raw integers (bigint on writes, decimal strings from the
indexer) scaled by token decimals. Convert at the edges with `fromHuman` (input)
and `toHuman` / `toHumanString` (display); for binary prices,
`probabilityToPrice` / `priceToProbability` map a YES price ↔ a 0–1 probability.

## What's included

- **Entry point** — `new SomniaMarkets(config)` → the exchange (symbols,
  `fetch*`/`watch*`/`createOrder`, human-unit structs). Its engine tier —
  `exchange.client` (`SomniaMarketsClient`, bigint-exact reads + watches) and
  `exchange.trader` (raw writes), or `engineFor(chainId)` / `traderFor(chainId)`
  on a multi-chain exchange — is reached through it; `ClientConfig`
- **React** — `SomniaMarketsProvider`, `useSomniaMarketsClient`, and the hooks
  `useWatchMarket`, `useWatchUser`, `useLiveStatus`, `useIsTailing`,
  `useLiveFills`, `useLiveUserFills`, `useLiveMarketByPool`,
  `useLiveMarketByAddress`, `useLiveUserOrders`, `useLiveBinaryOrderBook`,
  `useLiveSpotOrderBook`, … — the pool-keyed data hooks **watch automatically**
  while mounted; the indexer, price, funding, and lend hooks are listed in the
  API reference
- **Client reads** — `client.listMarkets`/`getMarket` (the `Market` union),
  `listBinaryMarkets`/`getBinaryMarket`, `getCandles`, `getBinaryOrderBook`,
  `getOpenOrders`, `getPortfolio`, `getSyncStatus`, `getMarketOnchain`,
  `getSystemInfo`, … (indexer reads **throw** on failure — an empty result always
  means "no rows", never "request failed")
- **Order state at chain head** — `getOrderOnchain(pool, orderId)`,
  `getOwnOpenOrdersOnchain(pool, owner)`, `getAllOpenOrdersOnchain(pool, { isBid })`
  answer from the pool contract, so an order is readable the moment its block
  lands. Use these to read your own writes; use the indexed `getOpenOrders` /
  `getOrders` for history — the chain surface only knows what is open **now**.
  `getOrderOnchain(pool, orderId, { blockNumber })` reads at the end of a past block
  instead, which is how a log consumer recovers the side and owner of a maker order
  the fill already removed; the fill's own numbers stay with the event, and an old
  block needs an archive node
- **Live watches (no React)** — `client.watchMarket(pool)` /
  `watchMarkets({ discover })` / `watchUser(account)` → ref-counted handles;
  `getWatchStatus`, `subscribeLive`, `getLiveStatus`, `getLiveMarkets`,
  `getLiveMarketByPool`/`…ByAddress`, `getLiveFills`, `getLiveUserFills`,
  `getLiveUserOrders`, and the locally materialized resting books
  `getLiveBinaryOrderBook` (binary, 4-sided) / `getLiveSpotOrderBook` — synchronous,
  zero round-trips, scoped to what you watch. Every market kind streams; a
  discovery watch picks up new markets from the creation events (the
  MarketCreator's rolling series AND direct `BinaryMarketsModule.createMarket`
  markets); binary status/resolution stays current from chain events.
- **Smart accounts** — the factory account model of
  [`@somnia-chain/accounts-sdk`](https://www.npmjs.com/package/@somnia-chain/accounts-sdk),
  through this SDK alone: `client.createExecutor({ smartAccount, inner })` sends
  writes AS an account (a session key that owns the account signs nothing, and
  an approval and its order land in ONE account transaction), `client.accounts`
  derives, discovers, creates and administers accounts (every write comes back
  as an unsigned call for any executor to send), and `exchange.accounts` spans
  the chains — one signature creates the account on every covered chain, and
  `accountFor` builds the multi-chain account the exchange trades through. See
  [docs/ACCOUNTS.md](./docs/ACCOUNTS.md)
- **Trading** — `client.createTrader(...)` → `placeOrder`, `cancelOrder`,
  `approveBuilder` (opt a routing/builder frontend in for per-order builder
  fees), `placeSpotOrder`, `placeSpotStopOrder`, `mintSet`, `burnSet`, `redeem`,
  `faucet`, `resolve`, `voidMarket`. Each write **awaits its receipt** and
  resolves to `{ hash, receipt }` (`placeOrder` adds `orderId` + `fills`). With a
  `privateKey`/local `account` the SDK signs locally with **fixed fees** and a
  locally-tracked nonce, and sends via `eth_sendRawTransactionSync` —
  send + confirm in **one round-trip**, zero fee/nonce/gas estimation RPCs. In
  the browser, pass a `walletClient` (confirm rides the newHeads subscription).
- **Contract ABIs** — the minimal ABI data the SDK itself encodes and decodes
  with, exported so a caller that builds a transaction or reads a receipt by hand
  uses the SAME signatures: the order-placement writes
  (`binaryPoolWriteAbi`, `spotPoolWriteAbi`, `perpPoolWriteAbi`,
  `orderBookBatchWriteAbi`), the funding writes (`erc20WriteAbi`,
  `erc20VaultWriteAbi`, `marginBankWriteAbi`), operator delegation
  (`operatorRegistryWriteAbi`), the spot stop-order lifecycle
  (`spotStopRegistryWriteAbi` + `spotStopRegistryEventsAbi` — created, triggered,
  cancelled, inert-cancelled), the shared order-book events
  (`orderBookEventsAbi`), and the binary module / settlement / ERC-6909 /
  OracleHub ABIs. Hand-copying a signature instead is how one drifts in silence
- **Operator delegation** — `client.getOperatorPermissionsRegistry(pool)` names
  the registry a SpotPool actually gates operator calls through (`null` when the
  pool is unwired), so a caller can discover the address instead of configuring
  `addresses.operatorPermissionsRegistry`. Read a grant back with
  `client.isApprovedForPool` / `isGloballyApproved` (the raw slots) or
  `client.isOperatorAuthorized` (the pool's resolved answer)
- **Types & helpers** — `Market`/`SpotMarket`/`BinaryMarket` (+ `isSpotMarket`/
  `isBinaryMarket`), `LiveFill`, `LiveOrder`, `BinarySide`, `TailStatus`,
  `kindOf`, `fillKind`, `fromHuman`/`toHuman`, `DECIMALS`, …
- **Chains** (`@somnia-chain/markets-sdk/chains`) — `somniaMainnet` (5031),
  `somniaShannon` (Shannon, 50312), `somniaElwood` (50313),
  `hidekiTestnet` (50383, 10 ms blocks) and `somniaLocal` (anvil, 31337) as
  viem `Chain`s, plus `somniaChains` / `getSomniaChain(id)` / `isSomniaChainId`.
  Nothing here imports chains from `viem/chains` any more
- **Bridge** (same `/chains` entry) — the Hyperlane warp routes between Somnia
  networks as live-verified data (`BridgeToken`, `ChainId`, `SOMNIA_BRIDGE`,
  `getBridgeToken`, `getBridgeNetwork`, …) plus `createBridgeTransfer(...)` → the
  ordered, tagged **unsigned transactions** (`approve` then `bridge`) that move a
  balance. The registry and planner are pure (no RPC, no signer); `sendBridgeStep`
  is the one opt-in sender. ⚠️ dev/test bridge — not for real funds
- **Native RPC** (`@somnia-chain/markets-sdk/native`) — `createNative(client)` wraps
  the node's `somnia_*` namespace, exactly the twelve methods in the
  [public JSON-RPC reference](https://docs.somnia.network/developer/json-rpc-api):
  `getBlock` (the native ledger block), `getStatistics`, `listPrivilegedReceipts`,
  `getNodePublicKeys`, the reactivity subscription reads, and
  `sendSessionTransaction` — plus `sessionAddress(seed)` / `sessionPrivateKey(seed)`,
  derived locally with no round-trip. Takes any EIP-1193 client, needs nothing else
  from the SDK
- **Reactivity** (`@somnia-chain/markets-sdk/reactivity`) — a pointer at
  [`@somnia-chain/reactivity`](https://www.npmjs.com/package/@somnia-chain/reactivity)
  (optional peer dep, re-exported verbatim — no second copy of it here):
  `createReactivity(exchange.client)` (or `exchange.engineFor(chainId)` when the
  exchange spans several chains) → `watch` (a `somnia_watch` socket
  subscription that delivers each event _together with_ `eth_call` results from
  the same block), `subscribe` / `subscribeRaw` / `unsubscribe` (Solidity handler
  subscriptions via the precompile) and
  `scheduleSubscriptionAt{Timestamp,Block,Epoch}`, plus `unwrap()` to turn
  upstream's `Error`-returns into throws

Every method, hook, and type is listed in the **API reference**.

## Using a query library (TanStack Query, SWR, …)

The SDK deliberately ships no cache-library wrapper. Two rules cover the whole
surface:

- **Live hooks need no cache.** The `useLive*` hooks read a push-fed store that
  is shared within one owner — ref-counted watches and deduped hydration mean
  ten components on one pool cost one subscription. Wrapping them in a query
  cache would cache a value that is already live; don't.
- **Async reads go in YOUR query library**, with an `exchange.client` method as
  the `queryFn` and the SDK's exported key factory as the `queryKey`. Every
  client read is a plain promise, which is already the ideal `queryFn`, and the
  key factories (`marketsKey`, `portfolioKey`, `candlesKey`, `syncStatusKey`,
  `marketOnchainKey`, …) are plain functions from the root entry — no query
  library is imported, so they work with any of them. Most client reads use
  `ClientConfig.signal` for cancellation. Account-view `getSnapshot` methods
  also accept a per-request `signal`; canceling one caller does not cancel
  other callers sharing its read. Check the method's options before forwarding
  a query library's signal.

```tsx
import { useQuery } from "@tanstack/react-query";
import { candlesKey } from "@somnia-chain/markets-sdk";

const { data: candles } = useQuery({
  queryKey: candlesKey(pool, 60, { limit: 500 }),
  queryFn: () => client.getCandles(pool, 60, { limit: 500 }),
  refetchInterval: 15_000,
});
```

After a write, invalidate by the same factory —
`queryClient.invalidateQueries({ queryKey: portfolioKey(account) })` — or
everything SDK-shaped at once with the `["somnia-markets"]` prefix
(`QUERY_KEY_SCOPE`). Hand-written key strings drift; the factories are the one
canonical spelling per read.

On a multi-chain exchange, pass the read's chain as the last argument of every
key, for example `candlesKey(pool, 60, { limit: 500 }, { chainId })`. A key
without `chainId` is the single-chain key. As a prefix filter it also matches
every chain's entry, but a chained key never matches an entry stored without a
chain.

Outside a query library, `useIndexerQuery(fn, deps)` remains the built-in
option: it re-runs on dep changes, keeps `data`/`loading`/`error`, and aborts a
superseded request via the `AbortSignal` it passes to `fn`.

## How the live feed works

You get instant updates without running your own indexer — scoped to exactly
the markets you watch. Opening a watch loads a consistent snapshot of that
scope, then keeps it current by streaming its
on-chain events over a WebSocket — so trades, orders, prices, and the resting
order book update from the delivered events. If the connection drops, market
watches reconnect with backoff and backfill missed blocks from chain.
Account balances poll every 10 seconds. Account spot orders have a periodic
chain-read backstop, and outcome positions poll the indexer's version every
5 seconds after successful reads. Perp-position views also use fallback reads
when pushes stop. These timers belong to the owner. See
[read tiers](./docs/reference/read-tiers.md) for retry and cleanup behavior.

## Debugging

The SDK is silent by default. To see what a client is doing — every trader
call, the sign/broadcast pipeline, live-tail hydration and block application —
pass a `debug` sink in the config. Events are structured data (`DebugEvent`:
log lines plus span start/end pairs with ids, explicit `parentId` links,
durations, and errors), so the sink owns all filtering and formatting. The
toggle mechanism belongs to your app, not the SDK:

The bundled `consoleDebugSink()` renders the stream as an indented span tree
(reconstructed from `parentId`, so it stays correct under concurrency):

```text
[sdk] ▶ trader.placeOrder { params: { pool: "0x…", side: "BUY_YES" } }
[sdk]   ▶ trade.execute { functionName: "placeBinaryOrder", … }
[sdk] liveTail applying logs { received: 3, … }
[sdk]     ▶ trade.signCall
[sdk]     ◀ trade.signCall 2.1ms
[sdk]     · trade.execute { hash: "0x…" }
[sdk]   ◀ trade.execute 38.2ms
[sdk] ◀ trader.placeOrder 41.0ms
```

```ts
import { consoleDebugSink } from "@somnia-chain/markets-sdk";

// Browser (explorer dev) — flip on from devtools with
// localStorage.setItem("sdk-debug", "1") and reload:
const exchange = new SomniaMarkets({
  ...config,
  debug: localStorage.getItem("sdk-debug") ? consoleDebugSink() : undefined,
});

// Node bot — JSON lines behind an env var:
const exchange = new SomniaMarkets({
  ...config,
  debug: process.env.SDK_DEBUG
    ? (e) => console.log(JSON.stringify(e, (_, v) => (typeof v === "bigint" ? v.toString() : v)))
    : undefined,
});
```

In tests, `debugCollector()` captures the stream with typed filters:

```ts
import { debugCollector } from "@somnia-chain/markets-sdk";

const c = debugCollector();
const exchange = new SomniaMarkets({ ...config, debug: c.sink });
await exchange.trader.placeOrder(params);
expect(c.starts("trade.execute")).toHaveLength(1);
```

Span events map 1:1 onto OpenTelemetry (`name` ↔ span name, `data` ↔
attributes, `error` ↔ status, `parentId` ↔ context link), so a real tracer is
just a sink that keeps a `Map<id, Span>` — `phase: "start"` calls
`tracer.startSpan(...)` (linking `parentId` via OTel context) and
`phase: "end"` calls `span.end()`. The OTel dependency lives entirely in your app.

## Book provenance and live-tail integrity

Book reads expose `blockNumber` so consumers can identify the data they hold.
A native chain read pins both sides to one block. Supply `blockNumber` in the
read options, or let the SDK select one head. Empty chain books retain that pin.
Unified `fetchOrderBook` accepts `{ limit, blockNumber }` and preserves the pin
in YES and NO views. A caller-built book can omit provenance.

Live books expose a per-scope materialization watermark. It is the snapshot seam
or highest applied event block for that scope. It is not the observed chain head.
It does not prove that all events in that block arrived, or that an indexed seed
equals chain state. The displayed live book also filters expiry using the local
wall clock. Use a pinned chain read when an exact as-of chain snapshot is required.
Historical and streaming unified trades expose their source `blockNumber` and
`logIndex`, including NO views. Historical native fill rows retain decimal block strings.
These fields are optional on `FillRow` and `UnifiedTrade` for compatibility with
caller-built values. SDK reads populate them from the source. If a caller-built
row omits either field, its unified trade keeps that field `undefined`; the SDK
does not substitute block zero or log zero.

A later log delivery checks any intervening range with chunked RPC log reads.
Recovered events apply before the triggering later events. Head-only activity
makes no default recovery reads. An empty probe is a quiet range; only a nonempty
successful recovery increments `getLiveStatus().healedGaps`. Background failures
are contained and visible in `getLiveStatus().failure`, with a semantic SDK error.
The tail retains its range and retries with bounded reconnect backoff. It does
not apply later batches across a failed recovery.

This detects bounded block gaps. Adjacent delivered blocks can conceal a partially
missing block. Missing terminal activity has no default trigger if no later log
arrives. The SDK does not claim a gapless transport protocol.

Optional owner `reconciliation` accepts a positive bigint `blockInterval` and
integer `depth` from 1 to 100. It is off by default. At each eligible checkpoint,
it recovers logs through a fixed target and compares native top levels against
both chain sides pinned to that target. It filters local expiry using the target's
chain timestamp. Head work coalesces while one comparison runs. Each checkpoint
costs chunked log reads, a block header, and two contract reads per watched pool.
`lastDivergence` retains the pool, block, depth, and differing raw levels even after
a later match. Read failures remain distinct from empty or matching books.
Reconciliation never replaces the event-derived order history with a top-N ladder.
It does not repair historical seed rows. Owner cleanup stops pending work.

The following example compares provenance labels. `config` selects the local or
deployed environment, and `pool` is a pool in that environment. Choose a block
that exists on that chain for the pinned read. The two labels describe different
read contracts; equal labels alone do not prove equal books.

```ts
const owner = new SomniaMarkets({
  ...config,
  reconciliation: { blockInterval: 100n, depth: 10 },
});
try {
  const watch = await owner.client.watchMarket(pool);
  const live = owner.client.getLiveSpotOrderBook(pool);
  const pinned = await owner.client.getSpotOrderBook(pool, { blockNumber: 123n });
  console.log({ delivered: live.blockNumber, pinned: pinned.blockNumber });
  console.log(owner.client.getLiveStatus());
  watch.stop();
} finally {
  await owner.close();
}
```
