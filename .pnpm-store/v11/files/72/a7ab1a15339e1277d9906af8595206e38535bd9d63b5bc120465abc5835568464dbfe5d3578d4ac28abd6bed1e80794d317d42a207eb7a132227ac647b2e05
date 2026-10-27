# Architecture

The SDK connects a configured `SomniaMarkets` owner to the main indexer, chain RPC, and a separate price-feed service. This page explains where live state comes from and which resources each capability uses.

Market watches hydrate indexed snapshots and then apply chain events locally. This keeps repeated store reads synchronous, while startup, recovery, historical reads, and price feeds still have network costs. Watches limit materialization work to the scopes the application uses.

- [System overview](#system-overview)
- [The client](#the-client)
- [Watches: the snapshot seam + chain materialization](#watches)
- [Event routing and the reducer](#event-routing-and-the-reducer)
- [The local order book](#the-local-order-book)
- [Connection lifecycle](#connection-lifecycle)
- [The write path](#the-write-path)
- [Choosing a read](#choosing-a-read)

## System overview

The exchange owns its `SomniaMarketsClient`. The main Envio/Hasura indexer supplies historical reads and market/user snapshots over HTTP GraphQL. The engine's lazy chain WebSocket carries its chain reads, log/head subscriptions, backfills, and sends.

Price feeds use a separate Hasura service over HTTP and one shared Hasura socket per client and endpoint. Watches that start together hydrate in batched snapshot requests. Their `PriceStore` is separate from the market `MaterializerStore`. A subscribed network tape owns another chain socket. These capabilities do not share one universal realtime connection.

```mermaid
flowchart LR
    subgraph app["Your app"]
        hooks["React hooks<br/><i>useLiveFills, useLiveBinaryOrderBook, …</i>"]
        node["Node / server code<br/><i>bots, scripts, RSC</i>"]
    end

    subgraph client["the engine (exchange.client)"]
        direction TB
        query["query.ts<br/><b>one-shot indexer reads</b><br/>listMarkets · getCandles · getPortfolio ·<br/>getFills · getMarketResolution · getRouterActions ·<br/>listProtocolFees · getFundingPayments · …"]
        reads["reads.ts / system.ts<br/><b>one-shot chain reads</b><br/>getBinaryOrderBook · getMarketOnchain ·<br/>getAccountHealth · getLiquidationPrice ·<br/>getVaultBalance · getErc20Balance · …"]
        subgraph live["live watches"]
            tail["liveTail.ts<br/><b>watch registry + ingestion</b><br/>ref-counted scopes · subscribe ·<br/>backfill · seam"]
            reducer["reducer.ts<br/><b>event → state</b><br/>mirror of the indexer handlers"]
            store["store.ts<br/><b>MaterializerStore</b><br/>markets · orders · fills ·<br/>book levels · status<br/><i>versioned, memoized selectors</i>"]
        end
        prices["priceFeed/<br/><b>HTTP reads + asset watches</b><br/>separate PriceStore"]
        tape["networkTape.ts<br/><b>caller-owned activity tape</b><br/>separate chain socket"]
        trader["trade.ts<br/><b>writes</b><br/>sign local · fixed fees ·<br/>sync send"]
    end

    subgraph backends["Backends"]
        indexer["Envio / Hasura indexer<br/><i>HTTP GraphQL</i><br/>history · aggregates ·<br/>cold-start snapshot"]
        feed["Price-feed Hasura<br/><i>HTTP + one shared WebSocket</i>"]
        chain["Somnia chain<br/><i>engine WebSocket + separate tape sockets</i><br/>eth_subscribe logs+heads ·<br/>eth_call · getLogs ·<br/>eth_sendRawTransactionSync"]
    end

    hooks -- "useSyncExternalStore" --> store
    node -- "getLive* (sync)" --> store
    node -- "await client.*" --> query
    node -- "await client.*" --> reads
    node -- "createTrader(…)" --> trader

    query -- "POST /v1/graphql" --> indexer
    prices -- "hydrate/fetch HTTP + subscriptions" --> feed
    hooks -- "price selectors" --> prices
    tape -- "own logs + heads subscription" --> chain
    tail -- "cold scope hydration<br/>(again after teardown)" --> indexer
    tail -- "watchEvent · watchBlocks ·<br/>getLogs (seam backfill)" --> chain
    reads -- "eth_call (pipelined)" --> chain
    trader -- "eth_sendRawTransactionSync<br/>(send + receipt, 1 RTT)" --> chain
    tail --> reducer --> store
```

Key properties:

- **Scoped.** Live materialization is opt-in per market via ref-counted
  watches. Cost — snapshot size, subscription filter width, event volume,
  reducer work — scales with what you watch, not with the protocol.
- **One engine per chain, one exchange per account.** The engine tier
  (`SomniaMarketsClient`) is bound to exactly one chain: one socket, one
  indexer, one nonce lane. The exchange (`SomniaMarkets`) owns one engine per
  configured `ChainBinding`, merges reads across them, and routes each write to
  the chain its market lives on. A market is unique to one chain, so a symbol
  resolves to one `(chainId, market)` and every returned struct names its
  `chainId`.
- **Isolation.** Every exchange owns its own config, stores, watches,
  and (lazily opened) sockets. Two exchanges never share state — per-request
  watches and parallel tests all just work. Two engines inside one exchange
  never share state either: each keeps its own nonce sequence and fee envelope.
- **Shared engine chain transport.** Engine subscriptions, reads, backfills, and sends use its memoized chain transport. Parallel requests can overlap, but dependent reads, pagination, and cache misses still affect cost. Price watches and network tapes have separate sockets.
- **Indexer startup dependency.** A new market or user scope needs indexed data to hydrate. After a successful market seam, chain events update that scope and chain backfill repairs reconnect gaps. A scope that was torn down needs hydration again. One-shot history and derived reads can continue to request the indexer while watches run.

## The client

```mermaid
flowchart TB
    cc["new SomniaMarkets(config)"] --> ex["SomniaMarkets (exchange)"] -- ".client" --> pc["SomniaMarketsClient (engine)"]
    pc --> l1["<b>live watches</b><br/>watchMarket · watchMarkets · watchUser ·<br/>getWatchStatus · stopLive · subscribeLive<br/>getLiveStatus · getLiveMarkets · getLiveMarketByPool/ByAddress<br/>getLiveFills · getLiveUserFills · getLiveUserOrders<br/>getLiveBinaryOrderBook · getLiveSpotOrderBook"]
    pc --> l2["<b>indexer reads</b> (Promise, throw on failure)<br/>listMarkets · getMarket · listBinaryMarkets · getBinaryMarket<br/>getCandles · getFills · getMarketActivity · getOpenOrders · getOutcomeBalances<br/>getPortfolio · getSpotPortfolio · getSpotStopOrders · getSyncStatus"]
    pc --> l3["<b>chain reads</b> (Promise)<br/>getBinaryOrderBook · getSpotOrderBook · getMarketOnchain<br/>getErc20Balance · getNativeBalance · getHeadBlock<br/>getStopOrderSomiPayment · getSystemInfo"]
    pc --> l5["<b>price feeds</b><br/>fetchPrice · fetchPriceHistory · watchPrice<br/>separate HTTP, Hasura sockets, and PriceStore"]
    pc --> l4["<b>writes</b><br/>createTrader({privateKey | account | walletClient | executor})<br/>→ placeOrder · cancelOrder · placeSpotOrder ·<br/>placeSpotStopOrder · mintSet · burnSet · redeem · …"]
```

The socket opens lazily on first chain I/O, so an indexer-only client (e.g.
server-side GraphQL reads) never opens the engine chain socket. The mirror
case holds too: `indexerUrl` is optional, so a chain-only client (smart
accounts, executors, on-chain reads) constructs without one, and every indexer
read or live watch on it throws `NotConfiguredError` naming the field. An
individual chain read never makes an indexer request either way.

## Watches

A market watch materializes its scope locally: it hydrates a
consistent snapshot of that scope from Envio up to block X, then materializes
X+1.. directly from chain logs. Scopes are ref-counted (two watchers of one
pool share everything) and torn down after a short linger when the last handle
stops. The seam is gap-free and double-count-free:

```mermaid
sequenceDiagram
    autonumber
    participant App
    participant Tail as LiveTail (watch registry)
    participant Idx as Indexer (GraphQL)
    participant WS as Chain WebSocket
    participant Store as MaterializerStore

    App->>Tail: watchMarket(pool)
    Tail->>WS: eth_subscribe logs (+ pool) · newHeads
    Note over Tail,WS: the scope's logs BUFFER from this instant —<br/>nothing past the head can be missed

    Tail->>Idx: scope snapshot (HTTP GraphQL)
    Note over Idx: the market row · recent fills ·<br/>its full resting order set ·<br/>chain_metadata.latest_processed_block = X
    Idx-->>Tail: rows consistent to block X
    Tail->>Store: mergeSnapshot (other scopes untouched)
    Tail->>WS: widen subscription (+ the market's<br/>BinaryMarket address, now known)

    Tail->>WS: eth_getLogs [X+1 … head] for the scope
    WS-->>Tail: backfill logs
    Tail->>Store: decode → reduce → commit
    Tail->>Tail: replay the scope's buffered logs<br/>(deduped by (block, logIndex))
    Tail-->>App: watchMarket resolves — reads are live

    loop live — every block
        WS-->>Tail: pushed logs + head
        Tail->>Store: decode → reduce → commit (one notify per batch)
        Store-->>App: subscribers re-read (hooks re-render)
    end
```

`watchMarkets({ discover })` is the same seam with scope = every eligible market
— SPOT, PERP, and BINARY markets that are not finalized, at most 500 per
snapshot, with `allMarketsTruncated` set when more exist. When discovering, it also
watches the creation-event sources: the MarketCreator factory AND the
BinaryMarketsModule. `watchUser(user)` is snapshot-only
(the account's past orders/fills — it opens no subscription of
its own, and updates only from markets this client watches). Logs for a scope that is mid-hydration buffer in an inbox while other
scopes keep applying live — one scope's seam never stalls another.

Why this is safe on Somnia specifically: blocks have **instant BFT finality** —
a delivered log is final, so there is no reorg handling. The dedupe set keyed by
`(blockNumber, logIndex)` makes the buffer/backfill overlap harmless.

Somnia logs carry no timestamp, so the `newHeads` stream doubles as the
timestamp source (block number → timestamp map, pruned as the head advances).

## Event routing and the reducer

One combined ABI (`liveEventsAbi`) decodes every watched log; the reducer routes
by **event name + source address** and mutates the store exactly the way the
Envio handlers mutate Postgres (`reducer.ts` mirrors
`indexer/src/handlers/orderbook.ts` — keep them in lockstep):

```mermaid
flowchart TB
    log["raw log from WS / backfill"] --> dec{"decodeEventLog<br/>(liveEventsAbi)"}
    dec -- "source = a pool<br/>(spot OR binary — byte-identical events)" --> ob["<b>OrderBook events</b>"]
    dec -- "source = a SpotPool" --> spot["<b>spot-only events</b>"]
    dec -- "source = MarketCreator /<br/>BinaryMarketsModule" --> fac["<b>MarketCreated</b>"]
    dec -- "source = a BinaryMarket" --> bm["<b>lifecycle events</b>"]

    ob --> op["OrderPlaced → upsert order<br/>(binary: side from isBid+userData, born Open;<br/>spot: no side, born Closed)"]
    ob --> orst["OrderRested → rested=true<br/>(spot: Closed → Open)"]
    ob --> ofill["OrderFilled → write LiveFill ·<br/>patch maker order · bump market stats<br/>(lastPrice, volumes, tradeCount)"]
    ob --> oc["OrderCancelled / OrderExpired /<br/>OrderCancelledSelfMatch /<br/>OrderReduced → patch order"]
    ob --> oip["OrderAmendedInPlace → overwrite price,<br/>quantities, expiry, userData<br/>(in-place pools; id kept)"]
    ob --> bk["SetMinted / SetBurned / Redeemed /<br/>SettlementFeeCharged → market backing"]

    spot --> mp["MarkPriceUpdated → market.markPrice"]
    spot --> bp["OrderBookParametersUpdated →<br/>tickSize · lotSize · minQuantity"]

    fac --> nm["build BinaryMarket row →<br/>indexMarket → GROW the watch set →<br/>catch-up getLogs for the creation range"]

    bm --> st["StatusChanged → status enum"]
    bm --> res["Resolved → status + winningOutcome"]
    bm --> vd["Voided → voided + status"]
```

Two ordering subtleties the reducer encodes:

- **`OrderFilled` fires before the taker's `OrderPlaced`** in the same tx, so
  the taker is unknown at fill time. The fill stores `takerOrder_id` /
  `makerOrder_id` foreign keys; read-time selectors back-join owner + side from
  the order map (hydrated by the snapshot's open orders and live events).
- **`MarketCreated` grows the discovery watch live.** Two creation events are
  watched. The `MarketCreator` factory rolls each series autonomously (a Somnia
  reactivity `Schedule` sub drains the due boundary's series in a gas-bounded
  loop, spilling to the next block when a batch is too large), emitting its
  13-field `MarketCreated(marketId, market, pool, yesId, noId, collateral,
asset, strike, tradingStart, expiry, oracleQuestionId, question,
intervalSec)` — the trailing `intervalSec` is the series cadence (60 / 300 /
  900 / 3600 / 14400 / 86400). The `BinaryMarketsModule` emits its own 20-field
  `MarketCreated` for EVERY market (rolled or created directly via
  `createMarket`) — the only creation event carrying the `(operatorId,
venueId)` origin attribution — so module-created markets that never pass
  through a `MarketCreator` are discovered too. When an all-markets watch with
  `discover` is active, the tail re-subscribes with the new pool + market
  addresses and sweeps the creation range with a one-shot `getLogs`, so a
  market created seconds ago is fully tailed — the indexer is never asked
  again.

## The local order book

The store _is_ the book. Every resting order is tracked through its lifecycle,
so depth is an in-memory aggregation. Reading a hydrated book costs **zero
round-trips** and reflects the events applied to that scope. Disconnection or
recovery can leave it behind the head:

```mermaid
flowchart LR
    subgraph store["MaterializerStore.orders"]
        o1["order: Open + rested<br/>price 620000 · qty 50"]
        o2["order: Open + rested<br/>price 620000 · qty 25"]
        o3["order: Open + rested<br/>price 610000 · qty 10"]
        o4["order: Filled / Cancelled /<br/>not rested → ignored"]
    end
    store --> agg["bookLevels(pool, depth)<br/>group by (isBid, price) · sum qty ·<br/>sort best-first · slice depth"]
    agg --> spotbook["getLiveSpotOrderBook<br/>{ bids, asks }"]
    agg --> yes["YES-terms levels"]
    yes --> inv["toBinaryBook( )<br/>NO side = 1 − yesPrice<br/>(quantities carry over)"]
    inv --> binbook["getLiveBinaryOrderBook<br/>{ yesBids, yesAsks, noBids, noAsks }"]
```

This matches the on-chain `getBookLevels` exactly because binary pools keep a
_single_ book in YES terms — a NO order is expressed as `isBid`/`userData` with
a YES-terms price, which is also how orders arrive in `OrderPlaced` events. The
one-shot chain reads (`getBinaryOrderBook`/`getSpotOrderBook`) remain available as a
separate source for callers that need a fresh node read. Stake and sell quotes
also read a cached chain tick/lot grid and can resolve a missing pool through
the main indexer; see [Read tiers](reference/read-tiers.md).

Completeness note: live-witnessed orders are always present; orders that rested
_before_ the watch opened come from the scope snapshot's open-order set — and
because snapshots are per-scope, that set is the market's whole resting book,
not a global cap's share of it.

## Connection lifecycle

The following state machine describes market live-tail subscriptions. It does not describe price feeds or network tapes. Main-indexer hydration uses HTTP. The live tail relies on pushed chain logs and heads, with chain backfill for recovery.

The live tail checks stalled heads every 15 seconds. After a stall it can request the chain head and reconnect if the subscription missed progress or the probe fails. A subscribed network tape checks for stalls every 5 seconds and has its own chain socket and recovery. These timers add background work; the SDK does not guarantee zero polling.

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> hydrating: first watchMarket / watchMarkets
    hydrating --> live: scope snapshot + backfill + replay OK
    hydrating --> reconnect_wait: snapshot / backfill failed
    live --> hydrating: new watch opens (its scope only —<br/>existing scopes keep streaming)
    live --> reconnect_wait: WS error or stalled-head probe detects failure
    reconnect_wait --> live: resubscribe + getLogs<br/>[lastBlock+1 … head] — CHAIN ONLY,<br/>the indexer is not consulted
    note right of reconnect_wait
        exponential backoff
        500ms → 1s → 2s → 4s → 8s (cap)
        reset to 500ms once live
    end note
    live --> idle: last watch released<br/>(after a ~30s linger)
    live --> live: blocks stream in
```

Reconnects never re-snapshot: the store already holds state to block L, so the
seam is simply `getLogs [L+1, head]` deduped against what's processed — chain
truth heals chain gaps. This recovery path does not request the main indexer. A new or fully released
scope still needs hydration, and one-shot indexer reads remain independent.

Price watches first hydrate over the price-feed HTTP endpoint, then subscribe
on one shared Hasura socket per client and endpoint. Watches that start together
hydrate in batched snapshot requests. They keep a separate store and connection
status.
A rejected subscription sets `getPriceStatus(asset)` to `error` and retains
stale price values; it does not fail market watches. Price scopes also linger
for about 30 seconds after the last handle stops.

`exchange.close()` releases its watches and channels and stops the client's
market and price live machinery. One-shot fetches remain usable.
`exchange.unwatchMarket(symbol)` releases one market's watch and channels and
keeps the exchange open. Its live-tail scope then lingers like any other. A network
tape returned by `createNetworkTape` is caller-owned. Release each subscription
with its returned unsubscribe function; the last release closes the tape socket.
Its lifecycle is separate from the exchange watches.

## The write path

The writer uses fixed gas limits. A sync send returns its receipt in one request.
Fallback and wallet confirmations use heads plus a one-second idle probe, with
a 60-second total deadline. Owner cancellation stops these waits. A missing
receipt remains a hash-bearing unknown outcome; check the hash before retrying.

```mermaid
sequenceDiagram
    autonumber
    participant Bot as Caller
    participant T as Trader (trade.ts)
    participant WS as Chain WebSocket

    rect rgb(235, 245, 235)
    Note over Bot,WS: LOCAL SIGNER (privateKey / account) — the fast path
    Bot->>T: placeOrder({pool, side, price, quantity})
    Note over T: resolve funding requirements<br/>uncached ERC-20 approvals may read + send;<br/>native spot sells read the current vault shortfall
    Note over T: reconcile pending nonce;<br/>serialize nonce consumption, signing,<br/>and broadcast acceptance;<br/>use fixed fees + fixed gas ceiling
    T->>WS: eth_sendRawTransactionSync(signedTx)
    Note over WS: node executes, blocks server-side<br/>until the receipt exists
    WS-->>T: receipt WITH logs
    Note over T: decode OrderPlaced → orderId<br/>decode OrderFilled → fills[]
    T-->>Bot: { hash, receipt, orderId, fills }
    end

    rect rgb(240, 240, 250)
    Note over Bot,WS: BROWSER SIGNER (injected walletClient)
    Bot->>T: placeOrder(…)
    T->>WS: eth_sendTransaction (wallet signs, fixed fees pinned)
    WS-->>T: tx hash
    T->>WS: getTransactionReceipt (immediate check)
    Note over T,WS: on miss: eth_subscribe newHeads —<br/>re-check on each pushed head, first hit wins.<br/>Idle probe after 1 s; total deadline 60 s.<br/>Failure retains the transaction hash.
    WS-->>T: receipt
    T-->>Bot: { hash, receipt, orderId, fills }
    end
```

An uncached (token, spender) pair does one `allowance` read. A short allowance
causes one `approve(maxUint256)` transaction and then enters the cache. An
existing effectively unlimited allowance also enters the cache. A finite
allowance remains uncached because an order can consume it. The next order then
reads the pool requirement and allowance again.

Before each local write, viem reconciles the node's pending nonce with its
in-memory offset. The trader serializes local nonce consumption, signing, and
broadcast acceptance. One failed write therefore cannot invalidate a
concurrent write's nonce reservation. A signer or broadcast failure resets the
manager only after every earlier local write has reached a terminal send result.

Measured on Somnia testnet with the `sdk-e2e` write suite (`E2E_WRITE=1`, which
writes a gitignored `latency-report.md`): `placeOrder` confirm p50 ≈ **503ms**,
within ~25ms of the raw transport floor.

### Spot funding preconditions

The approval cache records only effectively unlimited allowances. A finite
allowance is never cached, so the next order reads it again after the current
order may have consumed it. Spot orders ask the pool for its exact fee-aware
funding requirement when an approval check is needed. A native-base sell does
that read every time so it can send only the current vault shortfall.

## Choosing a read

Read selection depends on both the source and its startup state. [Read tiers](reference/read-tiers.md) contains the canonical Engine inventory, request costs, and method-specific exceptions.

| You want                                                  | Use                                                              | Source and freshness                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A book for frequent rendering                             | `getLiveBinaryOrderBook` / `getLiveSpotOrderBook` / hooks        | Main-indexer hydration, then applied chain events. Synchronous after startup; inspect watch status during recovery. |
| Live trade tape or user orders                            | `getLive*` / hooks                                               | Market store. User hydration adds history; updates cover watched markets only.                                      |
| Market state from the node                                | `getMarketOnchain`                                               | Chain RPC at the block served by the node.                                                                          |
| Candles, portfolios, historical fills, or market activity | `getCandles` / `getPortfolio` / `getFills` / `getMarketActivity` | Main indexer; delay is variable.                                                                                    |
| A market list without watches                             | `listMarkets` / `listBinaryMarkets`                              | Main indexer; indexed rows can lag discovery.                                                                       |
| Raw balances or wiring                                    | `getErc20Balance` / `getSystemInfo`                              | Chain RPC; composite reads may make multiple calls.                                                                 |
| Oracle price history or streaming prices                  | `fetchPriceHistory` / `watchPrice` / price hooks                 | Separate price-feed Hasura service and PriceStore; values can be stale during errors or disconnection.              |

Derived reads can combine sources. For example, Exchange `fetchTicker` uses cached market metadata, indexed candles, and best-effort perp chain state. Both the candle read and the perp read are contained, and `statsState` and `perpState` report which of them answered. Its timestamp is response time. Engine `getOpenPositionsWithPnL` and `getClaimable` use indexed inputs, so neither guarantees current chain state. Choose an action's inputs with these limits in mind.

React's `useIndexerQuery` invokes a caller-supplied callback on mount, owner/dependency changes, and `refetch`. It does not poll or automatically refresh on live events. The callback chooses the source; the hook does not certify freshness. It passes an abort signal and ignores superseded results, while request cancellation depends on the callback forwarding the signal.
