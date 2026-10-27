# Networks and endpoints

This page lists the Somnia networks and the endpoint and address values that go into a [configuration](./configuration.md). The SDK accepts a viem `Chain`. The address constants come from the SDK root entry.

The RPC endpoint chooses a server, not a shared socket. Each configured owner
creates its own connection even when endpoint URLs match. Node uses a managed
`ws` connection by default; browser defaults use native/global/isows selection.
For an application-specific RPC constructor, pass `rpcWebSocketConstructor` to
the root. Its [configuration contract](./configuration.md#rpc-constructor-selection)
covers selection, ownership and migration from implicit Node globals.

## Chains

Use the chain definitions that `@somnia-chain/markets-sdk/chains` exports. Each one carries its WebSocket URL, so `wsRpcUrl` is optional with them. Do not define these networks by hand: a hand-written definition keeps old endpoints when a network moves, as Hideki did at its 2026-09-17 regenesis. viem's own `somnia` and `somniaTestnet` describe the mainnet and Shannon networks but carry no WebSocket URL. If you use them, set `wsRpcUrl`.

```ts
import { hidekiTestnet, somniaMainnet, somniaShannon } from "@somnia-chain/markets-sdk/chains";
```

| SDK export      | Chain id | Name                  | Native currency | Block time | HTTP RPC                                           | WebSocket RPC                                       |
| --------------- | -------- | --------------------- | --------------- | ---------- | -------------------------------------------------- | --------------------------------------------------- |
| `somniaMainnet` | 5031     | Somnia                | SOMI (18)       | 100 ms     | `https://api.infra.mainnet.somnia.network`         | `wss://api.infra.mainnet.somnia.network/ws`         |
| `somniaShannon` | 50312    | Somnia Testnet        | STT (18)        | 100 ms     | `https://api.infra.testnet.somnia.network`         | `wss://api.infra.testnet.somnia.network/ws`         |
| `somniaElwood`  | 50313    | Somnia Elwood Testnet | STT (18)        | 100 ms     | `https://api.elwood.infra.testnet.somnia.network`  | `wss://api.elwood.infra.testnet.somnia.network/ws`  |
| `hidekiTestnet` | 50383    | Hideki Testnet        | STT (18)        | 10 ms      | `https://api.hideki2.infra.testnet.somnia.network` | `wss://api.hideki2.infra.testnet.somnia.network/ws` |
| `somniaLocal`   | 31337    | Somnia Local          | STT (18)        | none       | `http://127.0.0.1:8545`                            | `ws://127.0.0.1:8545`                               |

Shannon also serves `https://dream-rpc.somnia.network` and `wss://dream-rpc.somnia.network/ws` as secondary RPC URLs for the same network.

Block explorers: `https://explorer.somnia.network` (mainnet) and `https://shannon-explorer.somnia.network` (Shannon). Elwood, Hideki, and local carry no explorer.

Multicall3: mainnet `0x5e44F178E8cF9B2F5409B6f18ce936aB817C5a11`, Shannon `0x841b8199E6d3Db3C6f264f6C2bd8848b3cA64223`, Hideki `0xcA11bde05977b3631167028862bE2a173976CA11` (the canonical address; v2 predeploys it). Elwood and local carry none.

## Somnia Markets deployments

| Network                 | Indexer GraphQL                                                        | Address constant                                                           |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Mainnet (5031)          | `https://prd.smk.somnia.host/v1/graphql`                               | `SOMNIA_MAINNET_ADDRESSES`                                                 |
| Shannon testnet (50312) | `https://dev.smk.somnia.host/v1/graphql`                               | `SOMNIA_TESTNET_ADDRESSES`                                                 |
| Hideki testnet (50383)  | `https://hideki-dev.smk.somnia.host/v1/graphql` (development-grade)    | `SOMNIA_HIDEKI_TESTNET_ADDRESSES`                                          |
| Local anvil (31337)     | `http://localhost:8085/v1/graphql` when started with `demo-clob.sh up` | Resolved from the local manifest through `@somnia-chain/deployments/local` |

The mainnet and Shannon testnet constants share the protocol contracts (`binaryModule`, `binaryPoolBeacon`, `binaryPoolImpl`, `marketsCore`, `oracleHub`, `binarySettlement`, `clobFactory`, `collateralRouter`, `marketCreatorFactory`) and differ in `collateral`, `marketCreator`, `lend`, `perpPoolFactory`, `marginBank`, and `priceFeedScheduler`.

The Hideki preset omits `collateralRouter` and `lend`. Hideki has no wSTT,
Permit2, or SomniaLend deployment, so the corresponding helpers report
not-configured.

The Hideki indexer is development-grade. It runs in the development environment
and has no alerting, so a stall can go unnoticed. It indexes the Hideki binary,
perp and spot markets, except the HBTT/USDso spot pool. Omit `indexerUrl`
for chain-only reads and writes; supply one for indexed discovery and history.
Indexed reads without a configured URL fail with `NotConfiguredError`; requests
to an unreachable indexer fail with `IndexerError`.

The Shannon and Hideki presets set `perpPoolFactory` and a candidate `marginBank`.
These values come from the canonical perp deployment records. With Multicall
and a modern factory, discovery takes at most two serial rounds when every pool names
the candidate bank. Each pool's own bank controls its registration gate.
Unknown or different banks use authoritative fallback reads.
`loadMarkets` therefore
lists their perps from the chain, also when the binding has no `indexerUrl`.
The mainnet preset has neither perp field because its deployment is deferred.

| Field                     | Mainnet                                      | Shannon                                                                        | Hideki                                                                         |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `collateral` / `testUsdc` | `0x00000022dA000002656c64D9eA6011ea952D008A` | `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E` (tUSDC, 6 decimals, has `faucet`) | `0x9E9492cC533E8696A3b6afC7df730800DF75148f` (tUSDC, 6 decimals, has `faucet`) |
| `marketCreator`           | `0xfad8eDa4d50e876ba548BeD191Df1e2Af26783dF` | `0xD584e651008538b5C6B1C777cD4fbD54cC19a291`                                   | `0xAd890D6Ac3c659E1Ed0fA72Cf557DB4cA26bdAff`                                   |
| `lend`                    | `SOMNIA_MAINNET_LEND`                        | `SOMNIA_TESTNET_LEND`                                                          | not set                                                                        |

Addresses change with deployments. The constants in the installed SDK version are the source of truth; the values above are the ones current at the time of writing.

## Testnet tokens

| Token | Address on Shannon                           | Decimals | Role                                                | How to obtain                                                         |
| ----- | -------------------------------------------- | -------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| STT   | native                                       | 18       | Gas, and the base of `SOMI/USDso`                   | Faucets listed in [Get testnet funds](../how-to/get-testnet-funds.md) |
| USDso | `0x9c32f3827a1a99f0cf9b213de8b53ec3d57bb171` | 18       | Quote of the spot pairs and settlement of the perps | Public `mint(address,uint256)`                                        |
| tUSDC | `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E` | 6        | Collateral of the binary markets                    | `exchange.trader.faucet()`                                            |

Hideki has its own token addresses. Send USDso and STT to Hideki from Shannon through the [bridge](../BRIDGE.md). USDso on Hideki cannot be minted.

| Token | Address on Hideki                            | Decimals | Role                                                | How to obtain                                                        |
| ----- | -------------------------------------------- | -------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| STT   | native                                       | 18       | Gas, and the base of the native spot pair           | Bridge from Shannon                                                  |
| USDso | `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72` | 18       | Quote of the spot pairs and settlement of the perps | Bridge from Shannon                                                  |
| tUSDC | `0x9E9492cC533E8696A3b6afC7df730800DF75148f` | 6        | Collateral of the binary markets                    | `faucet(uint256 amount)` on the token, at most 10,000 tUSDC per call |

## Price feed

| Network         | Endpoint                                                             | Constant                    |
| --------------- | -------------------------------------------------------------------- | --------------------------- |
| Somnia mainnet  | `https://price-feed.prd.oracle.somnia.host/v1/graphql`, quote `USDC` | `SOMNIA_MAINNET_PRICE_FEED` |
| Shannon testnet | `https://price-feed.dev.oracle.somnia.host/v1/graphql`, quote `USDC` | `SOMNIA_TESTNET_PRICE_FEED` |

These are two separate deployments. Each one indexes the `PriceFeedScheduler`
on its own chain. Use the feed that matches the chain the client runs on. A
mainnet client that uses the testnet feed reads prices from chain 50312.

The mainnet feed carries fewer symbols than the testnet feed. Code written for
the testnet asset list can therefore fail on mainnet. Read the feed catalog to
learn which bases exist. A base the feed does not carry returns no rows. It does
not raise an error.

The `PriceFeedScheduler` contract is at
`0x7ccAE31E45693475be1e4BAa2360D6997eB2D32B` on Shannon, and at
`0x1998C88D54a240b8C671493f27f58eC416b81D7F` on mainnet and on Hideki. It holds
every price under a symbol name, and the perp pools' oracles read it. The Shannon
and Hideki address constants set it as `priceFeedScheduler`. The mainnet constant
does not, because mainnet has no perps manifest yet.

## Peer dependencies

| Package                    | Range     | Required                                        |
| -------------------------- | --------- | ----------------------------------------------- |
| `viem`                     | `^2.18.5` | yes                                             |
| `react`                    | `>=18`    | only for `@somnia-chain/markets-sdk/react`      |
| `@somnia-chain/reactivity` | `^0.2.1`  | only for `@somnia-chain/markets-sdk/reactivity` |

The package is published on the public npm registry from version 0.20.0. The chain transport uses the platform `WebSocket` where there is one, and the `ws` package on Node.js 20, which has none.
