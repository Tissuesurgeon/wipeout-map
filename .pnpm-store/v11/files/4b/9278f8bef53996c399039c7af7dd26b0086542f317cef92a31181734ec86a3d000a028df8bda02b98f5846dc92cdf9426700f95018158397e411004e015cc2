# How to configure the SDK for testnet, mainnet, or a local chain

This guide shows you how to build a `SomniaMarkets` instance for each network the SDK supports. It assumes you can install an npm package and write a TypeScript module. The field-by-field reference is [Configuration](../reference/configuration.md); the values are in [Networks and endpoints](../reference/networks-and-endpoints.md).

## Shannon testnet

Use the testnet for development. Markets exist, bots trade on them, and funds are free.

```ts
import { somniaTestnet } from "viem/chains";
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";

const exchange = new SomniaMarkets({
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  chain: somniaTestnet,
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  addresses: SOMNIA_TESTNET_ADDRESSES,
});
```

The viem chain definition does not carry a WebSocket URL. Set `wsRpcUrl` to the Somnia endpoint that the SDK must use for chain reads, writes, and watches.

## Mainnet

Swap the three network-specific values.

```ts
import { somnia } from "viem/chains";
import { SomniaMarkets, SOMNIA_MAINNET_ADDRESSES } from "@somnia-chain/markets-sdk";

const exchange = new SomniaMarkets({
  indexerUrl: "https://prd.smk.somnia.host/v1/graphql",
  chain: somnia,
  wsRpcUrl: "wss://api.infra.mainnet.somnia.network/ws",
  addresses: SOMNIA_MAINNET_ADDRESSES,
});
```

## Local anvil stack

Start the stack from the repository root with `./demo-clob.sh up`. It deploys the contracts to anvil on chain id 31337, runs the indexer, and writes the address manifest.

```ts
import { selectDeployment } from "@somnia-chain/deployments/local";
import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { defineChain } from "viem";

const somniaLocal = defineChain({
  id: 31337,
  name: "Somnia Local",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"], webSocket: ["ws://127.0.0.1:8545"] } },
});

const deployment = selectDeployment("my-bot", "local"); // reads the anvil manifest

const exchange = new SomniaMarkets({
  indexerUrl: "http://localhost:8085/v1/graphql",
  chain: somniaLocal,
  wsRpcUrl: "ws://127.0.0.1:8545",
  addresses: deployment.addresses,
});
```

`@somnia-chain/deployments` is the workspace package that reads the manifests; it is available to packages inside the repository. Outside the repository, copy the addresses from `smart-contracts/deployments/31337/local/addresses.json` into an object instead. A restarted anvil is a new chain under the same id: redeploy and reindex, or the indexer rows point at contracts that no longer exist.

## Add a signer

Pass one of three signer fields to unlock writes and the authenticated reads. Keep the key out of source control; read it from the environment.

Validate the environment value before construction. The `privateKey` variable below must be a 32-byte, `0x`-prefixed hex string. The tutorial [Place and cancel your first order](../tutorials/place-and-cancel-your-first-order.md#create-the-exchange-with-a-signer) shows the guard.

```ts
const exchange = new SomniaMarkets({
  ...config,
  privateKey,
});
```

For a browser wallet, see [Sign with a browser wallet](./sign-with-a-browser-wallet.md).

## Add the price feed

The price methods need a separate endpoint. On testnet:

```ts
import { SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";

const exchange = new SomniaMarkets({ ...config, priceFeed: SOMNIA_TESTNET_PRICE_FEED });
```

## Run indexer-only

No extra field is needed. The WebSocket opens on the first chain read, write, or watch, so an instance that only calls `listMarkets`, `getCandles`, or `getPortfolio` never opens one. This suits server-side rendering.

The examples above set `wsRpcUrl` explicitly. The first chain touch throws `NotConfiguredError` when neither this field nor `chain.rpcUrls.default.webSocket[0]` is present.

## Cancel indexer reads from a request scope

Pass an `AbortSignal` to stop in-flight indexer reads when the caller goes away, for example on a server per request.

```ts
const controller = new AbortController();
const exchange = new SomniaMarkets({ ...config, signal: controller.signal });
// later, when the request is abandoned:
controller.abort();
```

An abort re-throws your own reason. Chain reads are not covered by the signal; they time out after 4 seconds on their own.

## Check the result

`await exchange.fetchOrderBook(symbol)` proves the chain transport. `await exchange.fetchBalance()` proves the signer. Each one throws the class named in [Errors](../reference/errors.md) when its input is wrong.

`loadMarkets()` does not prove the indexer URL, because it does not throw when the registry read fails. It contains that failure so an indexer outage still returns the perp markets the chain can enumerate. Check the accessor instead:

```ts
await exchange.loadMarkets();
if (exchange.registryReadError) throw exchange.registryReadError; // the indexer URL is wrong or the indexer is down
```
