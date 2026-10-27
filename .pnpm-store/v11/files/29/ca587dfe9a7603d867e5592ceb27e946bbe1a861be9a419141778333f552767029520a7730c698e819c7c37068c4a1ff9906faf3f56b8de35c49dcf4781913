# Somnia Markets SDK documentation

This page is the map of the `@somnia-chain/markets-sdk` documentation. The pages are grouped by what you need right now: to learn, to finish a task, to look something up, or to understand a design. Every TypeScript example has a compile-checked counterpart that uses the public package entrypoints and real dependency types. The tutorials were run on the testnet.

## Start here

Two lessons take a newcomer from an empty directory to a cancelled order on the Somnia testnet. Follow them in order. Each one takes about 15 minutes.

1. [Stream a live order book](./tutorials/stream-a-live-order-book.md). No wallet needed. Install the SDK, load the markets, read a book, and watch it change.
2. [Place and cancel your first order](./tutorials/place-and-cancel-your-first-order.md). Fund a testnet key, rest a limit order, see it in your open orders, and cancel it.

## Do a task

Goal-shaped guides for a developer who already knows what they want.

- [Configure the SDK for testnet, mainnet, or a local chain](./how-to/configure-for-a-network.md)
- [Get testnet funds](./how-to/get-testnet-funds.md)
- [Run a quoting loop](./how-to/run-a-quoting-loop.md): place, amend, and cancel orders from a bot
- [Detect when an order fills](./how-to/detect-fills.md)
- [Follow an account's open orders](./how-to/follow-an-account.md): one complete, live view of an account's orders and stops, its spot orders, its perp positions and its wallet balances
- [Sign with a browser wallet](./how-to/sign-with-a-browser-wallet.md)
- [Trade through a smart account](./how-to/trade-through-a-smart-account.md): the accounts SDK's factory accounts as first-class actors
- [Use the React hooks](./how-to/use-the-react-hooks.md)
- [Handle errors and reverts](./how-to/handle-errors.md)
- [Debug what the SDK is doing](./how-to/debug-the-sdk.md)

## Look something up

Neutral descriptions of the machinery. Facts, defaults, and constraints, without instruction.

- [Configuration](./reference/configuration.md): every field of `SomniaMarketsConfig`, with defaults
- [Networks and endpoints](./reference/networks-and-endpoints.md): chain ids, RPC and indexer URLs, address constants
- [Symbols](./reference/symbols.md): the symbol grammar and how raw references resolve
- [Units and scales](./reference/units-and-scales.md): raw versus human values, decimals, basis points, ray, timestamps
- [Read tiers](./reference/read-tiers.md): which methods read the live store, the chain, or the indexer
- [Errors](./reference/errors.md): the SDK error classes and the contract error names they decode
- The API reference, generated from the source, lists every method, hook, and type. On the docs site it sits in the sidebar under "TypeScript SDK".

## Understand the design

Discussion for reading away from the keyboard.

- [About the exchange instance](./explanation/about-the-exchange-instance.md): why one object owns the sockets, the store, and the signer
- [About symbols and human units](./explanation/about-symbols-and-human-units.md): why the exchange API speaks in symbols and decimal numbers, and what that costs
- [Binary pool recycling](./explanation/binary-pool-recycling.md): why one pool address can host successive markets and how to select safe reads
- [Architecture](./ARCHITECTURE.md): the watch seam, event routing, the local order book, reconnects, and the write path

## Area guides

One guide per market family or module. Each one covers reading, trading, and background for its area.

- [The exchange API](./EXCHANGE.md), [Spot markets](./SPOT.md), [Binary markets](./BINARY.md), [Perps](./PERPS.md)
- [Price feeds](./PRICES.md), [SomniaLend](./LEND.md), [Smart accounts](./ACCOUNTS.md)
- [Chains](./CHAINS.md), [Bridge](./BRIDGE.md), [Chains walkthrough](./CHAINS_WALKTHROUGH.md)
- [Native RPC](./NATIVE.md), [Reactivity](./REACTIVITY.md)
- [The engine](./ENGINE.md): the raw client behind the exchange
