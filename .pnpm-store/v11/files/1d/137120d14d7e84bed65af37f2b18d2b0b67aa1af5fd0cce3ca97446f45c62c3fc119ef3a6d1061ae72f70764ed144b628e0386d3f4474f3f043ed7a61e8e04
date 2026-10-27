# Reactivity

Somnia pushes events to you **with the state that goes with them**. That is the
whole idea: on any other EVM chain, reacting to an event is "see the log, then
fetch the state" — two round trips, racing the next block. Here the notification
carries the log _and_ the results of a fixed set of `eth_call`s executed at that
same block.

This module is a **pointer, not a port**. The implementation is
[`@somnia-chain/reactivity`](https://github.com/somnia-chain/reactivity) — the
upstream repo owns the protocol, the Solidity side (`SomniaEventHandler`, in
`@somnia-chain/reactivity-contracts`) and the client. `@somnia-chain/markets-sdk/reactivity`
re-exports that package verbatim and adds only the glue a markets consumer needs,
so there is no second copy of the ABIs or the validation rules to drift out of
step.

```ts
import { createReactivity, unwrap } from "@somnia-chain/markets-sdk/reactivity";
```

## Install

`@somnia-chain/reactivity` is an **optional peer dependency** — exactly like
`react` is for the `/react` entry. Only callers of this subpath install it:

```sh
pnpm add @somnia-chain/reactivity
```

Both `@somnia-chain/reactivity` and `@somnia-chain/markets-sdk` (from 0.20.0)
are on the public npm registry; no `.npmrc` scope configuration is needed.

## What this entry adds

| Export                                  | Why it isn't upstream                                                                                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createReactivity(client, { wallet? })` | builds the reactivity client from the markets client's viem client: reads and receipt waits reuse it; `watch` opens its own WebSocket from `chain.rpcUrls.default.webSocket[0]`                       |
| `unwrap(result)`                        | upstream _returns_ `Error` objects; this SDK throws instead, so a failure stops the caller                                                                                                            |
| `SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS`  | not exposed by upstream's published build                                                                                                                                                             |
| `DEFAULT_SUBSCRIPTION_OPTIONS`          | the protocol's own `SomniaExtensions.DEFAULT_*` values: upstream ships them at runtime but omits them from its `.d.ts`, so they can't be re-exported with types (a test pins ours against upstream's) |
| `isLocalPrecompileUnavailable(chainId)` | already lives in this package; the check to run before any Solidity subscription                                                                                                                      |

Everything else — `Reactivity` / `SDK`, `SomniaReactivityPrecompileABI`,
`SomniaEventHandlerABI` and every type — is upstream's, re-exported. A test
asserts the re-exported classes are upstream's own identity, so this can never
quietly become a fork.

## Two flavours

- **WebSocket reactivity** (`watch`) — a TypeScript subscription over the socket
  (`somnia_watch`). Each matched log arrives with your `eth_call` results from the
  same block. Nothing on-chain, nothing to pay for, gone when you disconnect.
- **Solidity reactivity** (`subscribe`) — a subscription registered _on-chain_
  against the reactivity precompile, which makes validators call your handler
  contract's `onEvent(address,bytes32[],bytes)` when a matching log lands.
  Callbacks are paid out of the subscription owner's native balance (which must
  hold at least 32 SOMI/STT).

This protocol already runs on the second one: `OracleHub` is the Solidity
handler the precompile calls for `OracleCore.AnswerPosted`, and MarketCreator
rolls are scheduled subscriptions. The admin `enableReactivity` and
`setReactivityGasParams` methods configure these subscriptions. This module
points the same primitive at _your_ contracts.

## Markets event emitters

For `watch`, set `eventContractSources` to the emitter's address and
`topicOverrides[0]` to the exact event's topic0. For an on-chain `subscribe`,
set `filter.emitter` to that same address and
`filter.eventTopics[0]` to the topic0 of the **exact** event signature. A
handler or caller address is not automatically the log emitter. Use the SDK's
matching-chain `config.addresses` for configured singletons and
`smart-contracts/deployments/<chainId>/<environment>/addresses.json` for
`OracleCore.address`. An existing receipt's `log.address` identifies its
actual emitter. The SDK's
testnet and mainnet address presets come from those manifests; other venues
can have different `MarketCreator` instances; the module's `MarketCreated`
event carries the `creator`. Historical oracle answers may come from an older
OracleCore deployment, so use the core that emitted those logs.

| Event signature                                                          | Emitting contract                                                | Filter address                                   |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| `MarketCreated` (series, 13 arguments)                                   | `MarketCreator` on a series roll                                 | Venue's `marketCreator`                          |
| `MarketCreated` (module, 20 arguments)                                   | `BinaryMarketsModule` on every creation, including a series roll | `binaryModule`                                   |
| `AnswerPosted(uint256,uint8,string,int256,bool,uint8,uint256[])`         | `OracleCore`, not the receiving `OracleHub`                      | Matching manifest's `OracleCore.address`         |
| `Resolved(uint32,uint256[])` / `Voided()`                                | Individual `BinaryMarket`                                        | Market's `marketAddress`                         |
| `MarketFinalized(bytes32,address,uint256)`                               | `BinaryMarketsModule`; carries `marketId`                        | `binaryModule`                                   |
| `MarketFinalized(uint256,address,uint64,address,uint256,bool,uint256[])` | `BinarySettlement`; carries `netBacking`                         | `binarySettlement`                               |
| `PoolFinalized(uint64,uint256)`                                          | Individual `BinaryPool`; carries `marketNonce`                   | Market's `poolAddress` and indexed `marketNonce` |
| `PoolReleased(bytes32,address,address)`                                  | `BinaryMarketsModule`                                            | `binaryModule`                                   |
| `Redeemed(uint256,address,address,uint8,uint256,uint256)`                | `BinarySettlement`                                               | `binarySettlement`                               |

A series roll can produce both `MarketCreated` events for one `marketId`.
Their canonical signatures for topic0 are:

```text
MarketCreated(bytes32,address,address,uint256,uint256,address,string,uint256,uint64,uint64,uint256,string,uint64)
MarketCreated(bytes32,address,address,uint256,uint32,bytes32,address,address,uint256,uint256,uint64,uint8,uint8,uint64,uint64,uint8,string,uint256,string,bytes)
```

The pool can later serve another market; match `PoolFinalized` topic1
(`marketNonce`) to the selected market's `nonce`, as well as the pool address.

For example, on Shannon (50312), a `watch` for settlement `netBacking` uses
`eventContractSources: [SOMNIA_TESTNET_ADDRESSES.binarySettlement]`; an on-chain
subscription uses `filter.emitter: SOMNIA_TESTNET_ADDRESSES.binarySettlement`.
Both use the seven-field settlement `MarketFinalized` topic0
`0xb1884334e955f8d8727678d4fa52dd9fc7140ff5e4ad38d358453bd400ada178`
(`topicOverrides[0]` or `filter.eventTopics[0]`). The three-field module event's
topic0 is
`0x8f396ac6cf2e01887362e2b39d8e56860042c604e5b1b481c87e6d9f90006e08`;
filtering it at the settlement address silently matches nothing. The Shannon settlement
proxy in `50312/testnet-development` is
`0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23`. Use the installed
SDK's matching-chain deployment addresses, not an implementation address or
an address copied from another chain.

Oracle question IDs are scoped to an oracle deployment. A Shannon market
(50312) links its ID to
`https://dev.oracle.somnia.host/questions/<oracleQuestionId>`. A mainnet
market (5031) links its own ID to
`https://prd.oracle.somnia.host/questions/<oracleQuestionId>`. The same
number is not a cross-host key. These are question pages, not the
`price-feed.*` GraphQL endpoints. Verify the host for
any other chain before constructing a question link.

## Watching (TypeScript)

`createReactivity` hands upstream the markets client's public client for reads
and receipt waits; `watch` itself opens a second WebSocket to the same chain (see
the note below):

```ts
import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { createReactivity, unwrap } from "@somnia-chain/markets-sdk/reactivity";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

const exchange = new SomniaMarkets({ chain: somniaShannon, wsRpcUrl, indexerUrl });
const reactivity = createReactivity(exchange.client);

// Every Transfer on the collateral token, with the sender's new balance read
// at the very same block — one notification, no follow-up call.
const watch = unwrap(
  await reactivity.watch({
    eventContractSources: [collateral],
    topicOverrides: [transferTopic],
    ethCalls: [{ to: collateral, data: balanceOfCalldata }],
    onData: (n: ReactivityNotification) => console.log(n.result.simulationResults),
  }),
);
await watch.unsubscribe();
```

> **Use a chain definition from [`/chains`](./CHAINS.md).** Upstream's `watch`
> opens its own socket with viem's `webSocket()` _without a URL_, so the endpoint
> comes from `chain.rpcUrls.default.webSocket[0]`. viem's own `somniaTestnet` has
> no WebSocket entry, so `watch` fails on it; every definition in
> `@somnia-chain/markets-sdk/chains` carries one.

Notes that matter in practice:

- **Every filter is optional, and omitting one means "everything".** A bare
  `{ ethCalls: [], onData }` tails every event on the chain.
- **`ethCalls` is the point.** Batch several reads into one call against
  Multicall3 where you can — the notification is only as fast as the calls it
  carries. `simulationResults` comes back in the order subscribed.
- **`context`** splices event-sourced values into the `ethCalls` calldata
  (`topic1`…`topic4`, `data`, `address`), so one subscription can read state
  _about the thing that just happened_ rather than a fixed address.
- **`onlyPushChanges`** suppresses notifications whose call results match the
  previous ones — a cheap way to watch for a _state_ change rather than an event.
- **The payload is at `notification.result`** — `{ address, topics, data,
simulationResults }`. Upstream's README and type docs say
  `notification.params.result`, one level deeper; that is stale, because viem's
  WebSocket transport unwraps the JSON-RPC envelope before calling `onData`. Type
  the callback with `ReactivityNotification` (upstream types it `any`) — the shape
  is asserted against a live node in `test/reactivity.e2e.test.ts`, which runs with
  `SOMNIA_E2E_WS` set.

This is a different tool from `client.watchMarket`: the markets tail materializes
the order book from indexed protocol events, while `watch` is a general-purpose
log+state subscription for anything on the chain.

## Subscribing (Solidity)

Deploy a handler extending `SomniaEventHandler` (from
`@somnia-chain/reactivity-contracts`), then register it. The signer becomes the
subscription **owner** and its balance funds every callback:

```ts
import { createReactivity, unwrap, DEFAULT_SUBSCRIPTION_OPTIONS } from "@somnia-chain/markets-sdk/reactivity";

const reactivity = createReactivity(exchange.client, { wallet: walletClient });

const hash = unwrap(
  await reactivity.subscribe({
    handlerContractAddress: handler,
    filter: { emitter: collateral, eventTopics: [transferTopic] },
    options: DEFAULT_SUBSCRIPTION_OPTIONS,
  }),
);
```

Upstream validates the precompile's preconditions before spending gas — a
non-zero handler, well-formed `bytes32` topics, at least one narrowing filter
(a match-everything subscription is rejected), `0 < gasLimit <= 200_000_000`,
`maxFeePerGas >= priorityFeePerGas + 6 gwei` (or `0` to skip that check), and the
owner holding ≥ 32 SOMI/STT. Note that writes need a **wallet client**: pass one
to `createReactivity`, or upstream's write silently resolves to `null`.
Upstream sends each write on the wallet's chain, so the wallet must be on the
engine's chain. When `wallet.chain` is set to another chain, `createReactivity`
throws `InvalidInputError`. A wallet with no `chain` is not checked. On a
multi-chain exchange, pass `exchange.engineFor(chainId)` instead of
`exchange.client`.

Cancel with `unsubscribe(subscriptionId)` (owner only), read one back with
`getSubscriptionInfo(subscriptionId)`, and use `subscribeRaw` when you need the
precompile's full struct including the protocol-reserved fields.

## Scheduling — cron, blocks, epochs

The precompile emits its own system events (`Schedule`, `BlockTick`,
`EpochTick`), so "call me later" is just a subscription to one of them with the
tick as a topic filter:

```ts
await reactivity.scheduleSubscriptionAtTimestamp({ timestampMs: Date.now() + 60_000, handlerContractAddress, options });
await reactivity.scheduleSubscriptionAtBlock({ blockNumber: head + 100n, handlerContractAddress, options });
await reactivity.scheduleSubscriptionAtEpoch({ epochNumber: 7n, handlerContractAddress, options });
```

`scheduleSubscriptionAtBlock` with **no** `blockNumber` leaves the block topic a
wildcard — a callback on _every_ block. Timestamps are unix **milliseconds** and
must be at least a second out; a block must be past the head.

## Errors

Upstream methods resolve to `T | Error` instead of throwing. Two ways to live
with that, both fine:

```ts
// 1. this SDK's contract — throw (recommended)
const hash = unwrap(await reactivity.subscribe({ ... }));

// 2. upstream's own idiom — check
const result = await reactivity.subscribe({ ... });
if (result instanceof Error) throw result;
```

## Local development

The precompile does not exist on anvil or hardhat — check
`isLocalPrecompileUnavailable(chainId)` before offering Solidity subscriptions in
a UI, and note that it has no bytecode on _any_ chain, so `eth_getCode` can't
probe for it. `somnia_watch` is a node feature too: a plain anvil node doesn't
serve it. Test reactivity against Shannon (or Elwood/Hideki).
