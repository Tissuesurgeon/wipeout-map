# About the exchange instance

This page discusses why the SDK has one constructible object, `SomniaMarkets`, and what that decision buys and costs. It covers ownership of connections, state, and signers. It does not cover the internals of the live watches; those are in [Architecture](../ARCHITECTURE.md).

## One root, no globals

Many chain SDKs expose a set of free functions and a global configuration step: set the RPC once, then call anything from anywhere. This SDK does not. `new SomniaMarkets(config)` creates an instance, and every capability hangs off it: the exchange verbs, the engine at `exchange.client`, the trader at `exchange.trader`, the SomniaLend namespace at `exchange.client.lend`. Nothing that needs a connection is reachable without an instance. The root entry exports only the class, types, pure helpers, constants, and ABIs.

The reason is isolation. An instance owns its configuration, its WebSocket, its live store, its watches, its approval cache, its signer, and its local-send queue. Two instances share none of those execution resources. Nonce state is one of them. Each engine owns one nonce lane, and a multi-chain exchange has one engine per chain. Two exchanges that sign with the same key on the same chain keep separate lanes and do not coordinate, so their concurrent writes can take the same nonce. Share one long-lived exchange per signing account per chain. A multi-chain bot configures one exchange with `chains`. Each chain has its own socket, nonce lane, and fee settings. A server reuses one long-lived exchange. An indexer-only request may use a short-lived instance because it never opens a socket. A test suite runs cases in parallel with one exchange each. With module-level state, each of those needs a workaround.

The cost is one line of plumbing. A React app constructs the exchange once at module scope and passes `exchange.client` to the provider. A script constructs it at the top. There is no `configure()` call to forget and no hidden singleton to reason about.

## Sockets opened late

Each configured chain has an engine with an indexer HTTP endpoint and a chain
WebSocket. That socket carries log and head subscriptions, `eth_call` reads,
and transaction sends. Reads on the same engine share its socket. A configured
price feed uses separate GraphQL HTTP and WebSocket connections.

Node RPC sockets use the SDK-managed `ws` transport. Browser RPC sockets use
native/global/isows selection. A root may select a standard constructor explicitly
with `rpcWebSocketConstructor`; the choice is snapshotted at construction and
forwarded to every chain engine. Implicit Node globals no longer select it. The
constructor remains caller-owned, while each created socket belongs to one engine
and must meet the prompt disposal contract. See [Configuration](../reference/configuration.md#rpc-constructor-selection)
for selection and migration details. Price-feed sockets use the same selection
and constructor, but each is a separate connection.

Each chain socket opens on that engine's first chain operation. Each price-feed
socket opens on its first price watch. Construction and indexer-only reads do
not open these sockets. A missing `wsRpcUrl` or chain WebSocket endpoint raises
`NotConfiguredError` on the first chain operation. `close()` releases owned
connections across all engines; see Lifecycle below.

You can think of the instance as a small local node for the markets you care about. It hydrates a snapshot of a market from the indexer once, then follows the chain itself. After that the indexer is only asked for history.

## The signer belongs to the instance

A signer is part of the configuration: `privateKey`, `account`, or `walletClient` — or, at the engine tier, any `Executor` (`createTrader({ executor })`), which is how a smart account trades. The instance derives `walletAddress` from it and uses it for every authenticated verb, read or write. `fetchBalance` and `watchOrders` are authenticated reads: they answer for the signer's address without taking an address parameter. That mirrors how exchange APIs behave, and it is why `SignerRequiredError` is thrown by reads as well as writes.

Browser apps rarely have a signer at boot. `setSigner()` exists for them: construct the exchange for public reads, bind the wallet when the user connects, and pass `{}` on disconnect. Watches and market data are unaffected by a signer change; only the trader is rebuilt.

An alternative would have been per-call signers, as in `createOrder(symbol, …, { signer })`. That design keeps the instance stateless but pushes the approval cache to the caller, and the cache needs to be per-signer to be correct. Holding the signer in the instance keeps it correct by construction. The trade-off is that one instance trades as one account; an app that trades as several accounts constructs several instances or calls `setSigner` between them.

## Lifecycle

`close()` releases the watches, the streaming channels, and every socket and timer the instance opened, including the WebSocket to the node. That includes a socket that is still connecting: `close()` ends its handshake, and nothing retries it afterwards. With the default managed Node transport, a script that has touched the chain exits on its own once `close()` returns. A supplied constructor must meet the same disposal obligation. If a custom member fails, cleanup continues across engines and `close()` rejects with the first semantic failure; it does not promise release of resources a violating implementation retains. The instance stays usable afterwards: a later read opens a new connection, and a later `close()` releases that one too. A viem client you took from `getViemClient()` belongs to the connection it came from. After `stopLive()` or `close()`, its requests reject with viem's `SocketClosedError`, so call `getViemClient()` again for a working one.

`unwatchMarket(symbol)` releases one market and keeps the instance open. Use it when a consumer moves from one market to the next, for example in a rotating binary series. It stops that market's watch and drops its streaming channels. A pending `watch*` call on the market rejects with a `DOMException` named `AbortError`. The next `watch*` call on the market opens a fresh watch. The client keeps the market's live data for about 30 seconds after the release, then drops its orders and fills. Without this call, the instance holds every market it has watched until `close()`.

Each instance owns its own socket, even when two instances use the same WebSocket URL. Closing one instance never affects another, and never affects a socket your own application opened through viem. Still prefer a long-lived instance over one per server request: each instance holds a socket, a market cache, and local order-book state.

## Where the design shows through

- `exchange.client` is the engine, not a second client. It shares the store and the socket with the exchange, so a live book read through a hook and through `watchOrderBook` are the same data.
- `exchange.client.getViemClient()` returns the underlying viem client for anything the SDK does not cover. It is deliberately undecorated: errors from it are viem's, not the SDK's, and it opens the socket if it is not open yet.
