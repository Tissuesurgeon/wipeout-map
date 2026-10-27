# Configuration

This page lists every field a `SomniaMarkets` instance accepts, with its type, whether it is required, and its default. Engine fields form `ClientConfig`; signer fields and `rpcWebSocketConstructor` belong to the configured root. For the values to put in these fields on each network, see [Networks and endpoints](./networks-and-endpoints.md).

```ts
import { SomniaMarkets } from "@somnia-chain/markets-sdk";

const exchange = new SomniaMarkets(config); // config: SomniaMarketsConfig
```

## `SomniaMarketsConfig`

`SomniaMarketsConfig` accepts one chain configuration or a `chains` list, plus the signer fields `privateKey`, `account`, and `walletClient`, and the optional root RPC constructor.

| Field                     | Type                                | Required | Default                                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ----------------------------------- | -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `indexerUrl`              | `string`                            | no       | none                                           | Envio/Hasura GraphQL endpoint over HTTP. A same-origin relative path is accepted in a browser. Omit for a chain-only client (smart accounts, executors, on-chain reads): every indexer read and live watch then throws `NotConfiguredError` naming this field.                                                                                                                                                                                                                                 |
| `indexerWsUrl`            | `string`                            | no       | `indexerUrl` with `http` replaced by `ws`      | The indexer's GraphQL WebSocket endpoint, for live account views (`client.accountOrders.subscribe`). Set it when `indexerUrl` is a relative path, or when subscriptions are served from another address. Without it and without an absolute `indexerUrl`, `subscribe` throws `NotConfiguredError` naming this field.                                                                                                                                                                           |
| `chain`                   | `Chain` (viem)                      | yes      | none                                           | The chain the markets live on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `wsRpcUrl`                | `string`                            | no       | `chain.rpcUrls.default.webSocket[0]`           | The WebSocket RPC endpoint. It is the only chain transport: subscriptions, reads, and writes all use it. There is no HTTP fallback. Required when `chain` carries no WebSocket URL.                                                                                                                                                                                                                                                                                                            |
| `rpcWebSocketConstructor` | `SomniaMarketsWebSocketConstructor` | no       | managed `ws` on Node; native/isows in browsers | Standard RPC constructor selected once per exchange, shared as a class across its chain engines. Each engine owns a separate created socket. Also opens price-feed sockets; indexer HTTP reads do not use it.                                                                                                                                                                                                                                                                                  |
| `indexerHeaders`          | `Record<string, string>`            | no       | none                                           | Extra headers on every indexer request, for example a Hasura admin secret. Server-side only.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `signal`                  | `AbortSignal`                       | no       | none                                           | Cancels in-flight indexer reads and receipt confirmations. Client-wide, not per read. An indexer abort rethrows the caller's reason, not an `IndexerError`. A local or wallet write canceled before broadcast rethrows that reason. After broadcast, canceled confirmation throws `TransactionOutcomeUnknownError` with the transaction hash and the reason in `cause`. Check that hash before retrying the write. Other chain reads have their own 4-second request timeout.                  |
| `fees`                    | `FixedFees`                         | no       | `DEFAULT_FEES`                                 | Fixed EIP-1559 fees for SDK-signed writes.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `addresses`               | `SomniaMarketsAddresses`            | no       | `{}`                                           | Protocol contract addresses. Every entry is optional. A method that needs a missing address throws `NotConfiguredError` when it is called.                                                                                                                                                                                                                                                                                                                                                     |
| `priceFeed`               | `PriceFeedConfig`                   | no       | none                                           | The realtime price-feed endpoint. Required only by the price methods that fetch or watch (`watchPrice`, `fetchPrice`, `fetchPriceOHLCV`, and the client's `fetchPrice*` and `listPriceFeeds`). Its `quote` is mandatory to watch: an unpinned feed rejects `watchPrice`/`watchPrices` with `NotConfiguredError` because the tick tape's cursor is unique only within one quote; the one-shot reads still work unpinned. The `getLivePrice*` reads return `null` or `[]` until a watch is open. |
| `debug`                   | `(event: DebugEvent) => void`       | no       | none                                           | Receives structured debug events. When unset the SDK emits nothing and does no debug-only work.                                                                                                                                                                                                                                                                                                                                                                                                |
| `privateKey`              | `` `0x${string}` ``                 | no       | none                                           | A local signing key. The SDK signs locally and confirms in one round-trip.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `account`                 | `Account \| Address`                | no       | none                                           | A viem account, or a plain address to trade as through `walletClient`.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `walletClient`            | `WalletClient`                      | no       | none                                           | An external signer, for example an injected browser wallet.                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Counts and `indexerHeaders`

This section describes how the count methods (`countMarkets`, `countOrders` and the others) pick a query. A count first asks Hasura for `<Table>_aggregate`. Only a privileged role, such as the one an admin secret in `indexerHeaders` selects, has that field. On the public role Hasura rejects the field, and the count scans at most 10,001 ids instead.

The client remembers that rejection for five minutes. The memory is per client, endpoint, header set and table. In that window a count of the same table sends only the scan. The first counts of a table that run at the same time share one probe. Only Hasura's exact `field '<Table>_aggregate' not found in type: 'query_root'` error is remembered. Any other failure still throws and is not remembered. `stopLive()` clears the memory. After a role gains or loses the field, counts use the new permission within five minutes, or at once after `stopLive()`.

### RPC constructor selection

Node connections use the SDK-managed `ws` transport by default. Replacing
`globalThis.WebSocket` or isows on Node does not select an RPC constructor.
Price-feed sockets use the same selection and the same explicit constructor.
Browsers retain their native/global/isows selection, including replacements
installed before or after SDK import. An explicit `rpcWebSocketConstructor`
selects the constructor on either platform, independent of import order.

The selected constructor receives only standard WebSocket arguments. RPC
construction calls `new Constructor(url)`. Price-feed construction calls
`new Constructor(url, "graphql-transport-ws")`. A protocol is always the
standard second string or string-array argument. The SDK retains the exact
returned socket and does not mutate the caller's constructor or prototype.
Constructor selection is lazy. Closing the owner during dependency loading
prevents construction, and an indexer-only exchange makes no RPC dial.

A supplied constructor is trusted infrastructure. Every created socket belongs
to this exchange and must promptly dispose connecting and open work through
`close()`, stop replacement dials and safely observe errors during retirement.
Sharing a class between exchanges must not share its created sockets. A standard
interface proves the calling convention, not physical disposal. Node 22's native
WebSocket does not satisfy this custom disposal obligation; use the managed
Node default or a conforming implementation.

**Migrating a Node override**

Replace global assignment with a per-owner input. `AppWebSocket` below is your
application's conforming constructor; `config` is its existing exchange config.

```ts
// Before
globalThis.WebSocket = AppWebSocket;
const exchange = new SomniaMarkets(config);
```

```ts
// After
const exchange = new SomniaMarkets({
  ...config,
  rpcWebSocketConstructor: AppWebSocket,
});
```

A compile-checked factory can make that ownership explicit:

```ts
import {
  SomniaMarkets,
  type SomniaMarketsConfig,
  type SomniaMarketsWebSocketConstructor,
} from "@somnia-chain/markets-sdk";

function createExchange(config: SomniaMarketsConfig, AppWebSocket: SomniaMarketsWebSocketConstructor) {
  return new SomniaMarkets({ ...config, rpcWebSocketConstructor: AppWebSocket });
}
```

Modeled operations preserve concrete SDK constructor/member failures by identity;
other transport failures become `RpcError` with the original value as cause.
Price watches follow the same rule when a price-feed socket cannot be selected
or constructed: `watchPrice` and `watchPrices` reject with the constructor's SDK
error, or with `RpcError` for any other thrown value.
Root validation rejects a non-function input with `InvalidInputError`. Unexpected
configuration-access failures become `InvariantError` with their original cause.
`close()` and the engine's `stopLive()` finish remaining cleanup before reporting
the first disposal failure. A disposal failure following an already delivered
operation timeout does not replace that timeout; it is retained for owner cleanup.
A constructor that violates the disposal obligation cannot receive a physical
release guarantee from the SDK. Undecorated viem operations retain their platform
operational contract after access.

### Signer resolution

A method that writes, or reads data scoped to the caller, resolves the caller's address in this order: `walletClient.account.address`, then `account.address`, then `account` when it is a string, then the address derived from `privateKey`. When none is set, `walletAddress` is `undefined` and every authenticated method throws `SignerRequiredError`.

`setSigner(signer)` replaces the signer after construction. Passing `{}` removes it. Live watches and market data are unaffected.

### Signer paths

| Aspect       | `privateKey` or a signing `account`                                                                                                      | `walletClient`                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Who signs    | The SDK, locally                                                                                                                         | The wallet, after a user prompt                                                                                                      |
| Fees and gas | The fixed values from `fees` and the gas ceiling                                                                                         | The same fixed values, passed to the wallet as `maxFeePerGas`, `maxPriorityFeePerGas`, and `gas`                                     |
| Send path    | `eth_sendRawTransactionSync`: send and receipt in one round-trip; falls back to `eth_sendRawTransaction` when the node does not serve it | `eth_sendTransaction` through the wallet; the receipt is read on heads and after 1 s idle, within a 60 s total confirmation deadline |
| Reverts      | Decoded by replaying the failed call at the receipt's block                                                                              | Surfaced by the wallet's simulation before the prompt, with revert data                                                              |
| Approvals    | One `approve(maxUint256)` per token and spender, on the first order that needs it, cached for the trader's lifetime                      | The same, as a second wallet prompt                                                                                                  |
| Nonce        | Tracked locally after one fetch; reset on a rejected send                                                                                | Managed by the wallet                                                                                                                |

### Lazy connections

The viem chain WebSocket opens on the first chain read, write, or watch. An instance that only performs indexer reads never opens one. The price-feed WebSocket opens on the first `watchPrice`. `close()` stops the watches and channels and closes every socket the instance opened, both the price-feed WebSockets and the viem chain transport, so a Node process exits on its own afterwards. Each instance owns its own chain socket, even when several use the same `wsRpcUrl`, so closing one never affects another.

## `FixedFees`

| Field                  | Type     | Description                                                                         |
| ---------------------- | -------- | ----------------------------------------------------------------------------------- |
| `maxFeePerGas`         | `bigint` | Fee ceiling in wei per gas. The unspent margin above base fee plus tip is refunded. |
| `maxPriorityFeePerGas` | `bigint` | Tip in wei per gas.                                                                 |

`DEFAULT_FEES` is `{ maxFeePerGas: 60_000_000_000n, maxPriorityFeePerGas: 0n }`: a 60 gwei ceiling and no tip.

### Gas

Every SDK-signed write uses a fixed gas ceiling of 10,000,000 gas. Gas is never estimated. Unused gas is not charged. The mempool accepts a transaction only when the account holds `gas × maxFeePerGas` on top of the transaction value: 0.6 STT or SOMI at the defaults. A lower-level write accepts a per-call `gas` override only when its public parameter type declares one. Unified exchange methods such as `createOrder` and `cancelOrder` do not expose that override.

## `SomniaMarketsAddresses`

Every field is optional and typed `Address`, except `lend`.

| Field                                            | Used by                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collateral`                                     | The venue's collateral ERC-20. `faucet()` mints it on test networks.                                                                                                                                                                                                                                                    |
| `testUsdc`                                       | Legacy alias for `collateral`. `collateral` takes precedence.                                                                                                                                                                                                                                                           |
| `binaryModule`                                   | Complete-set mint and redeem, market creation, hub-approval reads, system diagnostics.                                                                                                                                                                                                                                  |
| `marketCreator`                                  | The live tail watches `MarketCreated` on it to discover new binary markets.                                                                                                                                                                                                                                             |
| `clobFactory`                                    | System diagnostics fallback.                                                                                                                                                                                                                                                                                            |
| `binaryPoolImpl`, `binaryPoolBeacon`             | Surfaced to apps. Not read by the SDK.                                                                                                                                                                                                                                                                                  |
| `binarySettlement`                               | `redeemDirect`, `claimOwed`, `getSettlement`.                                                                                                                                                                                                                                                                           |
| `operatorPermissionsRegistry`                    | Operator approval of a stop-order registry. Discoverable at runtime with `getOperatorPermissionsRegistry(pool)`.                                                                                                                                                                                                        |
| `marketsCore`                                    | Operator and venue reads, `createOperatorAdmin`.                                                                                                                                                                                                                                                                        |
| `collateralRouter`                               | The native-token and Permit2 complete-set path (`mintSetNative`, `mintSetPermit2`, `redeemNative`).                                                                                                                                                                                                                     |
| `marketCreatorFactory`, `marketCreatorFactoryV2` | `createMarketCreatorAdmin`.                                                                                                                                                                                                                                                                                             |
| `oracleHub`                                      | OracleHub reads and `createOracleHubAdmin`.                                                                                                                                                                                                                                                                             |
| `perpPoolFactory`                                | Perp discovery when the indexer has no perp rows. `loadMarkets` otherwise resolves the factory from `MarginBank.getSystemConfig()` on an indexed perp row, so this is needed only when there is no such row. Without it, discovery is SKIPPED and reports through `perpDiscoverySkipped`. When set it takes precedence. |
| `priceFeedScheduler`                             | The Somnia price feed that the perp pools' oracles read. `accountPositions.subscribe` has the node push the account's state on its price writes. Without it, marks follow a read every 5 s. The Shannon and Hideki constants set it.                                                                                    |
| `lend`                                           | `LendAddresses` for the third-party SomniaLend deployment. Backs `client.lend`.                                                                                                                                                                                                                                         |
| `fakeOracle`                                     | `resolve` and `voidMarket` on demo stacks.                                                                                                                                                                                                                                                                              |
| `oracleAdapterFactory`, `sharedOracleAdapter`    | Deprecated. Kept so old configurations type-check. Not read.                                                                                                                                                                                                                                                            |

`SOMNIA_MAINNET_ADDRESSES`, `SOMNIA_TESTNET_ADDRESSES` and `SOMNIA_HIDEKI_TESTNET_ADDRESSES`, exported from the root entry, hold the current deployments. `SOMNIA_MAINNET_LEND` and `SOMNIA_TESTNET_LEND` hold the SomniaLend addresses and are already included in the mainnet and testnet constants. Hideki has no SomniaLend deployment, so its preset omits `lend`.

## `PriceFeedConfig`

| Field   | Type     | Required | Default                            | Description                                                                                                              |
| ------- | -------- | -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `url`   | `string` | yes      | none                               | HTTP GraphQL endpoint of the price-feed indexer. One endpoint serves every asset.                                        |
| `wsUrl` | `string` | no       | `url` with `http` replaced by `ws` | WebSocket GraphQL endpoint for live subscriptions.                                                                       |
| `quote` | `string` | no       | none                               | Quote asset to pin every read to, case-insensitive. When unset, a base that trades against two quotes is double-counted. |

`SOMNIA_TESTNET_PRICE_FEED` is `{ url: "https://price-feed.dev.oracle.somnia.host/v1/graphql", quote: "USDC" }`.
`SOMNIA_MAINNET_PRICE_FEED` is `{ url: "https://price-feed.prd.oracle.somnia.host/v1/graphql", quote: "USDC" }`.
They index different chains; see [networks and endpoints](./networks-and-endpoints.md).

## Transport constants

| Constant                        | Value                              | Where                                                                                                                                   |
| ------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary RPC operation          | 9,000 ms cold total                | 4 s handshake, 4 s response and 1 s liveness probe; zero retries.                                                                       |
| Heavy `eth_getLogs` operation   | 35,000 ms cold total               | 4 s handshake, 30 s response and 1 s probe.                                                                                             |
| Failed subscription observation | 30,000 ms lease; 64 IDs per socket | Separate from operation timeout; a late ID gets a bounded 4 s unsubscribe. Lease expiry, capacity or failed cleanup retires the socket. |
| Indexer request timeout         | 30,000 ms                          | Every indexer read.                                                                                                                     |
| Default gas ceiling             | 10,000,000                         | Every SDK-signed write. Not exported.                                                                                                   |
| `DEFAULT_FEES.maxFeePerGas`     | 60 gwei                            | Exported from the root entry.                                                                                                           |
| Reconnect backoff               | 500 ms, doubling to an 8 s cap     | Live watches after a socket error.                                                                                                      |
| Watch linger                    | about 30 s                         | Time a scope stays materialised after its last handle stops.                                                                            |
