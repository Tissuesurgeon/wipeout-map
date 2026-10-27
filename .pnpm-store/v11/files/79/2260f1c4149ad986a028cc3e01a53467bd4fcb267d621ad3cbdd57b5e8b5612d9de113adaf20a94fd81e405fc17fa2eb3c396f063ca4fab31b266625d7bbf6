# Migrating

This guide explains breaking SDK changes and the required migration steps.
Each entry lists affected consumers in this repository. The same steps apply
to external consumers that use those features.

Only breaking changes appear here. Everything else is in the
[changelog](../CHANGELOG.md).

`0.31.0` was published to public npm on September 29, 2026. The `0.32.0`
series is available as prereleases. A consumer moving from `0.30.0` to a
`0.32.0` prerelease applies both sections below, in order. Check the target
version in the [changelog](../CHANGELOG.md); prereleases can add migrations
before the plain `0.32.0` release.

## 0.30.0 → 0.31.0

This section has fifteen entries. Entries 1 to 12 cover the twelve breaking
changesets queued for 0.31.0. Entries 13 and 14 cover two breaking changes that
the 0.31.0 changelog did not mark as breaking. Entry 15 is a note, not a
breaking change: it corrects earlier documentation about nonce handling.

Three entries need attention even if your code compiles:

- Registry read failures no longer throw from `loadMarkets()` (entry 5).
- `getCandles` selects a field that does not exist on an indexer deployed before
  this release. **Reindex before you upgrade** (entry 8).
- A `walletClient` adapter that implements only `writeContract` fails every
  write (entry 13).

### 1. Executor calls and wallet errors

**Was:** `{ to, data, value, description }`.
**Now:** `{ chainId, to, data, value, description, functionName? }`.

Add the target `chainId` when you construct a call. SDK `build*` methods already
set it. Built-in executors throw `InvalidInputError` before signing if the call
names another chain.

`functionName` is optional and supplies context for error messages. SDK-built
calls include it.

```ts
// before
const call = { to: pool, data, value: 0n, description: "place" };
// after
const call = { chainId: 50312, to: pool, data, value: 0n, description: "place" };
```

**Affected:** custom relayers, bundlers, and fixtures that construct calls.
The `call()` fixture in `packages/sdk/test/executor.test.ts` constructs these
objects and already includes `chainId`.

#### Wallet-client pre-send rejections

**Was:** `"writeContract"`.
**Now:** `"sendTransaction"`.

The wallet executor sends an encoded transaction. Update checks for its
operation name to `"sendTransaction"`. The error class and other fields are unchanged.

**Affected:** code matching `err.operation === "writeContract"` for a wallet
rejection. **No consumer in this repository branches on `RpcError.operation`.**

### 2. `BinaryMarket.strike` and `BinaryMarket.mode` are nullable

**Was:** both always present.
**Now:** both `| null`.

Chain-seeded rows do not supply these fields. They can be `null` when you use
`watchMarket(pool, { seed: "chain", marketId })`. Indexer rows still supply both.

Check for `null` before use. The type change applies even if you do not use
chain seeding.

**Affected:** code reading `BinaryMarket.strike` or `.mode`. In this repository,
the explorer uses them in `src/lib/seriesQueries.ts` and
`src/components/clob/SeriesHistory.tsx`.

### 3. `FillRow` gains two required fields

**Was:** no remainder fields.
**Now:** `takerRemainingQuantity` and `makerRemainingQuantity`, both required.

`getFills` and `getUserFills` return the quantities remaining after a fill.
Add both fields to fixtures, mocks, or other code that constructs a `FillRow`.
Code that only reads rows needs no change.

**Affected:** in this repository, **the explorer** (`src/lib/orderFill.ts`)
and **sdk-e2e**
(`test/fills.test.ts`, `test/query.test.ts`). All of these read rows rather than
build them, so they are affected only if they pin the row shape.

### 4. Failed reads throw instead of reporting absence

Four reads now throw for transport failures instead of returning absent or
zero values. Transport failures raise `RpcError`. Contract reverts raise
`ContractRevertError` except for the documented capability checks below:

- `getClosingPrice` — `null` means the pool does not declare `closingPrice()`.
  Catch errors to handle failed reads.
- `tryGetPerpLeverageImSurcharge` — `null` only for a revert from the view
  itself. In a health sweep, catch per account and report that account as
  unknown rather than as having no surcharge.
- `getSystemInfo` — configured contract read failures now throw instead of
  returning zero values. For pre-v2 modules without `settlement()`, the result
  uses the configured `binarySettlement` address, or `null` if none is configured.
  These fields are no
  longer nullable: `MarketCreatorInfo.owner`, `SystemInfo.oracle.owner`,
  `SystemInfo.oracle.binaryModule`, `SystemInfo.usdc.symbol`, and
  `SystemInfo.usdc.decimals`. Keep null checks on the `marketCreator`, `oracle`,
  and `usdc` objects: they remain `null` when their contracts are not configured.
- `getTransactionSummary` — `null` only for a malformed hash, or a transaction
  the node reports as not found. To keep the previous best-effort behavior, add
  `.catch(() => null)` at the call site.

`PriceFeedStatus` gains `"error"` for subscriptions the server rejects or
terminates. Previously, the status stayed `"live"` with a stale price. Reads
still return the last known values, so check the status before displaying them.
Handle `"error"` in `getPriceStatus` and `useWatchPrice` consumers. The debug
channel also emits a `warn`. Restart the watch to request a fresh snapshot.

### 5. Registry read failures use `registryReadError`

**Was:** `loadMarkets()` threw when the registry read failed.
**Now:** it reports the failure through `registryReadError`.
This lets chain-based perp discovery continue when a factory is configured.
Check the accessor after loading. Pass `true` to retry instead of using the
cached registry.

```ts
await exchange.loadMarkets();
if (exchange.registryReadError) {
  // Force a registry refresh.
  await exchange.loadMarkets(true);
}
if (exchange.registryReadError) throw new Error("market list may be short");
```

Replace `try`/`catch` checks for registry outages with an accessor check.
Without it, a failed registry read can look like a successful load.

**Affected:** every `loadMarkets()` caller. In this repository:
**market-taker** (`src/shared.ts`, called from `src/index.ts`) and
**sdk-e2e** (`test/unified.test.ts`). For the four reads, any caller treating
`null` or `0` as "failed" needs to catch instead.

### 6. Registry rows require `updatedAtBlock`

**Was:** `IndexedOperator` and `IndexedVenue` had no block marker.
**Now:** both require `updatedAtBlock: bigint`.

Add this field to fixtures, mocks, or adapters that construct registry rows.
Use `0n` in a fixture when its block number is irrelevant. The operator and venue
list/get methods already supply it, so code that only reads rows needs no change.

The marker tracks control-plane events, not trading rollups. Updates in the
same block share a marker. A malformed wire value fails the whole read with
`IndexerError`.

**Affected:** code that constructs either row type. In this repository,
`packages/sdk/test/registryRowUpdateBlock.test.ts` covers the field.
Check external adapters and mocks for object literals missing it.

### 7. Fill reads gain a block range, and a cross-pool fill read

**Was:** `getFills(pool, …)` read one pool and `getUserFills(account, …)` read one account
across pools, both bounded by `since`/`until` in seconds. No read returned every fill of a
market kind.
**Now:** `client.getFillsPage({ marketType, sinceBlock, toBlock })` is that read — every fill
of one kind in an inclusive block range, across every pool, oldest first by
`(blockNumber, logIndex)`. It takes no pool, so a consumer never enumerates them. The existing
reads gain the same bounds through `FillsOptions.sinceBlock` and `.toBlock`.

Both block bounds include their block, and `(blockNumber, logIndex)` totally orders the fill
table, so `[a, b]` followed by `[b + 1, c]` reads every fill exactly once. Prefer the block
range whenever successive reads must tile the chain: several Somnia blocks share a timestamp,
so a seconds window drops or repeats the fills in them at every seam. An inverted range now
rejects with `InvalidInputError` rather than answering with no rows.

`client.getLatestFillBlock(marketType)` names the newest block carrying an indexed fill of
that kind. It reads the fill data rather than the indexer's processed-block watermark, so it
never returns a block `getFillsPage` cannot yet serve.

Page through `nextCursor`. A full page always returns one, because an indexer row limit can
truncate a page silently, so a range ending exactly on a page boundary costs one empty final
page. A cursor binds the chain, endpoint, kind and both bounds, and is refused by any other
range.

**Affected:** implementations of `SomniaMarketsClient` other than the SDK's own must add
`getFillsPage` and `getLatestFillBlock`. Consumers that only call the client are unaffected;
the seconds window still works. In this repository the interface is implemented only inside
the SDK; `packages/sdk/test/fillBlockRange.test.ts` covers the new reads.

### 8. `Candle` gains a required `lastFillId` — reindex first

**Was:** no fill-level watermark on a bucket.
**Now:** `lastFillId`, the id of the newest fill folded into the bucket, in the same
`${blockNumber}_${logIndex}` key space as a fill's own id.

**This one has an operational prerequisite.** `getCandles` selects `lastFillId`, so it errors
against an indexer whose schema predates the field. Deploy the matching
`indexer/schema.graphql` and run a full reindex **before** upgrading the SDK.

Constructing `Candle` values yourself? Add the field. Read-only consumers just receive it, and
gain the watermark needed to reconcile an open OHLCV bucket against the chain without a
second fills read.

**Affected:** every `getCandles` caller operationally, through the reindex — that half
applies whether or not you read the field. In this repository **the explorer** receives it and
deliberately drops it: `src/lib/candleTip.ts` types its chart rows as
`Omit<Candle, "lastFillId">`, because a display bucket is not a cursor and its fold does not
maintain one. Worth copying if your own derived types would otherwise promise a watermark they
do not keep accurate.

### 9. Order reads carry `userData`, and stricter input validation

**Was:** order rows carried no correlation tag; invalid runtime inputs reached the indexer.
**Now:** `getOpenOrders` and `getOrders` return each row's `userData` as a decimal string,
and it is required on constructed `OpenOrder` and `OrderRow` values.

`OrdersOptions.userData` filters on that tag, so a client correlates rows with the orders it
sent instead of keeping its own map. `OrdersOptions.market`, `.pools` and `.markets` scope a
read the way the fill scope already did; an empty array matches nothing, a list caps at 100
entries, and supplying a singular scope alongside a list intersects both.

Reads now reject bad input before any network I/O, with `InvalidInputError`: an empty owner on
`getOpenOrders`, `getOrders` and `countOrders`, an empty account on `getUserFills` and
`countUserFills`, a malformed order id on `getOrderFills`, and, on fill reads, a market, markets or
pool identifier that is empty or not a string. Code that relied on those calls answering with no rows now
sees an error instead.

`sinceBlock` also bounds order reads, where it bounds the **placement** block — it does not
report a later amend, fill or cancel of an order placed before the bound.

`client.waitForIndexedBlock(chainId, block, opts)` resolves once the indexer has processed a
block, and rejects with the new `IndexerWaitTimeoutError` on deadline — a different decision
from a failed read.

**Affected:** code constructing `OpenOrder` or `OrderRow` values, chiefly fixtures and mocks;
implementations of `SomniaMarketsClient` other than the SDK's own must add
`waitForIndexedBlock`. In this repository **sdk-e2e** builds and asserts on order rows
(`test/query.test.ts`, `test/lifecycle.test.ts`), and the explorer reads `userData` on
`src/app/pool/[pool]/order/[orderId]/page.tsx`. None of the new filter columns is indexed —
pair a tag or block bound with a pool scope and a status to keep the scan small.

### 10. `pnlEventsFor` rejects malformed rows

**Was:** `id` was never read; ordering used the timestamp alone, so a malformed `id` was
ignored and its row stayed wherever the input happened to put it.
**Now:** `pnlEventsFor` reads each row's `id` to order events by chain position and throws
`InvalidInputError` when it is not `${blockNumber}_${logIndex}`.

The same check covers every number the fold reads — `FillRow.quantity`, `FillRow.fillPrice`
and a router action's `amount`. These went through a bare `BigInt` before, which threw a
native `SyntaxError` on a corrupt value: an error outside the documented union of this
function and both client methods that wrap it.

**Affected:** callers passing indexed data straight through are unaffected — rows from
`getUserFills` and the router-action reads already carry well-formed ids. A caller assembling
its own `FillRow` or `RouterActionRecord` values, **test fixtures especially**, must set `id`
to `` `${blockNumber}_${logIndex}` `` and give `quantity`, `fillPrice` and `amount` as
unsigned decimal strings.

### 11. A live price watch requires `priceFeed.quote`

**Was:** `watchPrice` accepted a feed configured with a url alone.
**Now:** it rejects with `NotConfiguredError` naming the key unless the feed pins a quote:
`priceFeed: { url, quote: "USDC" }`.

The tape below it now streams on a `requestId` cursor, and one upstream request prices every
symbol in a tick — so that id is unique within a feed but not across a base spanning several
quotes. Such a stream can carry two rows sharing an id, and a batch boundary between them
would skip the second permanently. An unpinned base was already double-counting on this path;
refusing it is the alternative to silently losing ticks.

The one-shot reads — snapshot, history, candles, batch prices, feed catalog — are unaffected
and still work without a quote. `SOMNIA_TESTNET_PRICE_FEED` and `SOMNIA_MAINNET_PRICE_FEED`
already pin `USDC`, so configurations built from those constants need no change.

Two smaller shifts on the same path: `PricePoint.raw.price` and `raw.ema` now report `"0"` for
a tick the feed recorded with no price, where they previously reported `null` despite being
typed as strings; and a subscription the server rejects is now surfaced instead of leaving the
tape silent while the feed still reads as connected.

**Affected:** `watchPrice` and `useWatchPrice` consumers whose feed carries no quote. In this
repository **the explorer** already pins one (`src/lib/priceFeeds.ts`, overridable through
`PRICE_FEED_QUOTE`), so it needs no change.

### 12. `hidekiTestnet` (50383) now means the v2 regenesis

**Was:** the chain rebuilt before 2026-09-17, reached at `api.hideki.infra.testnet.somnia.network`.
**Now:** the v2 regenesis — a different genesis, different endpoints, and the canonical
Multicall3 at `0xcA11bde0…` that v2 predeploys at block 1.

The chain id did not change, which is exactly the hazard. Hideki was rebuilt on the **same id**
with fresh state and the deployer's nonces restarted, so an address is no longer a stable
identifier across the two chains: most v1 addresses hold a _different_ contract on v2, while
the whole binary/CLOB family (deployed via CREATE3) and the bridged USDso synthetic come back
at the _same_ address. A stale cache does not fail loudly — it answers with the other chain's
history.

**To move to v2 (recommended):** take the new definition and discard every piece of Hideki
state you hold — indexer databases, address caches, block-height watermarks, saved deployment
manifests. Do not reconcile v1 addresses against v2 ones, and do not carry a v1 start block
across: v1 is past 586M blocks while v2 is near 2.4M, so a v1 watermark parks you at a head v2
will not reach for a long time.

**To stay on v1:** pin the SDK to 0.30.0, or construct the chain yourself with viem's
`defineChain` using the v1 host and Multicall3 `0x540B091b…`. Note that v1's `/ws` already
answers 502, so a websocket consumer is broken there regardless.

**Tell the two apart by height, never by chain id** — nothing in a signature, a wallet or this
definition distinguishes them.

**Affected:** anything pinned to 50383. In this repository, the explorer's chain and address
maps (`src/lib/chains.ts`, `src/lib/addresses.ts`) and the bridge lane, whose five
Shannon-side collateral routers moved while the Hideki-side deployment came back at its v1
addresses.

### 13. A `walletClient` signer must implement `sendTransaction`

**Was:** the SDK sent each write with `walletClient.writeContract`.
**Now:** the wallet executor encodes each call and sends it with
`walletClient.sendTransaction`. The SDK does not call `writeContract`.

A viem or wagmi wallet client implements both methods, so it needs no change.
An adapter object that implements only `account` and `writeContract` still
compiles when it is typed as a `WalletClient`. At runtime every write through it
fails with `RpcError`, `operation: "sendTransaction"`, and no order is placed.
Entry 1 covers the changed `operation` string.

Such an adapter usually routes writes to a Safe or a sponsor relay. Check the
built-in before writing one: `client.createExecutor({ smartAccount, inner })`
covers an account from the accounts factory — see
[Trade through a smart account](./how-to/trade-through-a-smart-account.md).
Hand-write an `Executor` only when the submit path is your own: a sponsor relay,
a custom co-signer, or a safe that built-in does not cover. An executor receives
the encoded calls, sends them, and returns the receipt.

An account holds **one executor per chain**, keyed by chain id, so build one for
every chain the exchange spans. `exchange.client` is the PRIMARY (first) chain's
engine only; reach the others with `exchange.engineFor(chainId)`. Registering a
single chain's executor leaves writes on every other chain throwing
`NotConfiguredError`.

```ts
// before: 0.30.0 sent every write through the adapter's writeContract
exchange.setSigner({ walletClient: safeAdapter });
```

```ts
// after: the adapter becomes an executor
import { assertCallsOnChain, InvalidInputError, type Executed, type Executor } from "@somnia-chain/markets-sdk";

// One executor per chain: `exchange.client` is the primary chain's engine only.
const makeExecutor = (chainId: number): Executor => {
  const viem = exchange.engineFor(chainId).getViemClient();
  return {
    chainId,
    actor: safeAddress,
    async execute(calls) {
      // Refuse an empty list or a call for another chain, as the built-in executors do.
      assertCallsOnChain(chainId, calls);
      let executed: Executed | undefined;
      for (const call of calls) {
        const hash = await submitThroughSafe(chainId, call); // your existing Safe or relay submit
        executed = { hash, receipt: await viem.waitForTransactionReceipt({ hash }) };
        // Stop at the first mined revert. The SDK decodes it from the receipt.
        // A Safe can also mine a successful receipt around a failed inner call.
        // Detect that from the Safe's own events and return it as `failure`.
        if (executed.receipt.status === "reverted") break;
      }
      if (executed === undefined) throw new InvalidInputError("execute needs at least one call");
      return executed;
    },
  };
};

// Every chain the exchange spans gets one, so no write lands on an unconfigured chain.
const executors: Partial<Record<number, Executor>> = Object.fromEntries(
  exchange.chainIds.map((chainId) => [chainId, makeExecutor(chainId)]),
);

exchange.setSigner({ account: { address: safeAddress, executors } });
```

A Safe transaction whose inner call fails can still mine with
`status: "success"`. The SDK then treats the write as successful, unless the
executor sets `failure` on the result it returns. If your Safe path can swallow
an inner revert, detect it and set `failure` to a `ContractRevertError`. See
`Executed` in the API reference.

The SDK reads allowances and operator grants for `actor`, so set it to the
address that holds the funds. An executor without `signTypedData` cannot run
verbs that sign typed data, such as `signRedeemAuth`. Those verbs throw
`SignerRequiredError`. If the account is a factory account from
`@somnia-chain/accounts-sdk`, `exchange.client.createExecutor({ smartAccount, inner })`
builds the executor for you. See the [Smart accounts guide](./ACCOUNTS.md).

**Affected:** `walletClient` adapters that implement `writeContract` but not
`sendTransaction`. The DreamDEX web app (dex-web) is affected: its Safe adapter
implements only `account` and `writeContract`. In this repository, the explorer
passes wagmi wallet clients, which implement `sendTransaction`, so it needs no
change.

### 14. `Unified*` structs and `Tradable` carry a required `chainId`

**Was:** these types had no chain field.
**Now:** `chainId: number` is required on `UnifiedMarket`, `UnifiedOrderBook`,
`UnifiedTrade`, `UnifiedOrder`, `UnifiedStopOrder`, `UnifiedTicker`,
`UnifiedFundingRate`, `UnifiedPosition` and `Tradable`. Two more required fields
arrive with it: `UnifiedBalance.byChain`, the balance per chain, and
`UnifiedTicker.perpState`.

The SDK sets these fields on every value it returns. Code that only reads the
values needs no change. Code that constructs them must add the fields. This is
mostly test fixtures, mocks, and adapters. A single-chain exchange sets `chainId`
to its chain's id and reports one `byChain` entry.

```ts
// before
const market: UnifiedMarket = { ...marketFields };
const usdso: UnifiedBalance = { free: 10, used: 0, total: 10 };
```

```ts
// after
const market: UnifiedMarket = { ...marketFields, chainId: 50312 };
const usdso: UnifiedBalance = { free: 10, used: 0, total: 10, byChain: { 50312: { free: 10, used: 0, total: 10 } } };
```

**Affected:** code that constructs these types. dex-web is affected: its
`UnifiedMarket` test fixtures fail `tsc` until they add `chainId`.
In this repository, market-taker and sdk-e2e only read `UnifiedMarket` values
that the SDK returns, so they need no change.

### 15. Note: nonce lanes belong to the engine

This entry is not a breaking change. It corrects earlier documentation and
states the safe way to share a signing key.

**Was:** each configured client owned one nonce lane. A 0.30.0 exchange had one
client, so it had one lane.
**Now:** each engine owns one nonce lane. A multi-chain exchange builds one
engine per chain, so it has one lane per chain. A single-chain exchange still has
one lane. Single-chain code sees no change.

Earlier SDK documentation said that viem's nonce manager is process-wide. That
was not true in 0.30.0, and it is not true now. Two exchanges never share nonce
state, even when they sign with the same key on the same chain. If both write at
the same time, they can take the same nonce, and the node rejects one of the
transactions. Share one exchange per signing account per chain.

```ts
// unsafe: two exchanges with one key on one chain, two nonce lanes
const quoting = new SomniaMarkets({ ...config, privateKey });
const hedging = new SomniaMarkets({ ...config, privateKey });
```

```ts
// safe: one exchange per signing account per chain, one nonce lane
const exchange = new SomniaMarkets({ ...config, privateKey });
```

**Affected:** code that constructs two exchanges that sign with one key on one
chain and write at the same time. In this repository, sdk-e2e runs its test
files one at a time so that its maker and taker keys never race on nonces
(`sdk-e2e/vitest.config.ts`).

## 0.31.0 → 0.32.0

These entries group migrations recorded in the `0.32.0` prerelease history.
They include type changes and behavior changes that still compile.
Entry 3 has an operational step: deploy and reindex the indexer **before** you
upgrade.

The following index covers every `BREAKING` item in the `0.32.0` prerelease
changelog sections. Several notes concern the same migration.

| Breaking change                                                                      | Migration entry                                    |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Hideki 2 bridge addresses and lane identifiers                                       | 1                                                  |
| Optional ticker volumes                                                              | 2                                                  |
| Historical fill dataset generation                                                   | 3                                                  |
| Settled binary pool routing refusal                                                  | 4                                                  |
| Bounded live terminal-order history                                                  | 5                                                  |
| Required chain identifiers on live and historical rows                               | 6                                                  |
| Multi-chain client/trader accessors and `createReactivity` configuration             | 7                                                  |
| Chain binding validation                                                             | 8                                                  |
| Bridge message tracking and typed delivery failures                                  | 9                                                  |
| Unknown write outcomes                                                               | 10                                                 |
| Local signing for account session seeds                                              | 11                                                 |
| Removed generic Safe executor                                                        | 12                                                 |
| Paged pool binding history                                                           | 13                                                 |
| Synchronous local-signer RPC rename                                                  | 14                                                 |
| Required equity, account-view, `perpAdlQueue`, fill-pairing and fill-history members | 15                                                 |
| Node RPC sockets, price-feed sockets and connecting-socket owner cleanup             | 16                                                 |
| Required margin block provenance                                                     | 17                                                 |
| Per-chain failures and optional primary indexer health                               | 18                                                 |
| Position-lifetime realized PnL                                                       | 19                                                 |
| Ticker and perp-state programming errors                                             | 20                                                 |
| Lifecycle-based all-market selection                                                 | 21                                                 |
| Latest-price and feed-info hooks no longer acquire tick history                      | [Price hooks](#price-hooks-acquire-data-on-demand) |

The earlier migrations that need attention even if your code compiles include:

- `getLiveUserOrders` no longer returns every terminal order (entry 5).
- `exchange.client` and `exchange.trader` throw on a multi-chain exchange
  (entry 7).
- A misconfigured chain binding now fails its first read (entry 8).
- `ensureFunds` reports a delivery timeout and a native-route liquidity refusal
  with new error classes (entry 9).
- A write whose outcome is unknown throws a new error class (entry 10).
- A smart-account executor refuses a session-seed inner (entry 11).
- A local-signer send failure names `eth_sendRawTransactionSync` as its
  `operation` (entry 14).

### 1. The bridge registry describes the Hideki 2 lane

**Was:** `getBridgeNetwork(ChainId.somniaShannon)` returned the Somnia-side core
addresses of the Hideki 1 lane. The lane id was `"somniatestnet-hidekitestnet"`.
**Now:** it returns the Hideki 2 lane's `mailbox`, `interchainSecurityModule`,
`merkleTreeHook`, `validatorAnnounce`, `interchainAccountRouter` and
`proxyAdmin`. The lane id is `"somniatestnet-hideki2testnet"`. Every `route.id`,
the Hideki network name (`"hideki2testnet"`) and both display names change with it.

Routers, tokens and decimals do not change since 0.31.0 (entry 12 of the
previous section covers the router move), so `createBridgeTransfer`,
`sendBridgeStep` and `getBridgeToken` behave as before. Replace stored lane and
route ids, and discard cached Somnia-side core addresses. Read both from the
registry, so the next rename does not break your code.

```ts
// before: a stored literal
const wbtcRouteId = "WBTC/somniatestnet-hidekitestnet";
```

```ts
// after: read ids and addresses from the registry
import { BridgeToken, ChainId, getBridgeNetwork, SOMNIA_BRIDGE } from "@somnia-chain/markets-sdk/chains";

const wbtcRoute = SOMNIA_BRIDGE.routes.find((route) => route.token === BridgeToken.WBTC);
wbtcRoute?.id; // "WBTC/somniatestnet-hideki2testnet"
const mailbox = getBridgeNetwork(ChainId.somniaShannon)?.mailbox; // the Hideki 2 lane's mailbox
```

**Affected:** configuration, dashboards, analytics keys and fixtures that store
lane or route ids, and monitoring that caches Somnia-side core addresses. No
consumer in this repository stores these values.

### 2. `UnifiedTicker.baseVolume` and `quoteVolume` are optional

**Was:** `fetchTicker` failed as a whole when its 24h candle read failed. Both
volumes were always present.
**Now:** `fetchTicker` contains an `IndexerError` from the candle read and still
returns the perp fields. The new `statsState` field says whether the 24h fields
were read:

- `"ok"`: the volumes are present. A volume of `0` is a true zero.
- `"unavailable"`: the candle read failed with an `IndexerError`, or the market
  is `indexed: false` and no candle read was sent. `open`, `high`, `low`,
  `change`, `percentage`, `statsAsOf`, `baseVolume` and `quoteVolume` are absent.

Other errors still reject. The type does not narrow on `statsState`, so check
the volume for `undefined` too.

```ts
// before
console.log(ticker.baseVolume.toFixed(2));
```

```ts
// after
if (ticker.statsState === "ok" && ticker.baseVolume !== undefined) {
  console.log(ticker.baseVolume.toFixed(2));
} else {
  console.log("24h volume unavailable");
}
```

**Affected:** `fetchTicker` callers that read the volumes, and code that
constructs `UnifiedTicker` values, which must add `statsState`. dex-web is
affected: its ticker hook shows the 24h volume. No
consumer in this repository reads `UnifiedTicker`.

### 3. Historical fill pages need the `FillDataset` generation

**Was:** `getUserFillsPage` read from any indexer, and its cursor did not name
the dataset it came from.
**Now:** each page reads the serving indexer's `FillDataset` generation.
`UserFillsPage` gains a required `datasetGeneration`, and every cursor records
it. `fetchPortfolioAnalytics` reads fill history through the same pages.

- An indexer that does not serve the generation fails the read with
  `FillHistoryUnavailableError`. Deploy the matching indexer and reindex it
  before you upgrade the SDK.
- A cursor from another generation fails with `FillHistoryRestartRequiredError`.
  A cursor that 0.30.0 produced has no generation and fails the same way.
  Discard every page you collected and start again at page one.

```ts
import { FillHistoryRestartRequiredError, type FillRow } from "@somnia-chain/markets-sdk";

let fills: FillRow[] = [];
let cursor: string | undefined;
let restarted = false;
for (;;) {
  try {
    const page = await exchange.client.getUserFillsPage(account, { limit: 100, cursor });
    fills.push(...page.fills);
    if (page.nextCursor === null) break;
    cursor = page.nextCursor;
  } catch (error) {
    // Restart once. A second change means the indexer is still being replaced.
    if (!(error instanceof FillHistoryRestartRequiredError) || restarted) throw error;
    restarted = true;
    // The dataset changed under the cursor: the pages already read are stale.
    fills = [];
    cursor = undefined;
  }
}
```

**Affected:** callers of `getUserFillsPage` and `fetchPortfolioAnalytics`, code
that stores fill cursors, and code that constructs `UserFillsPage` values. Every
indexer that serves these reads needs the reindex. No consumer in this
repository calls either read.

### 4. Pool-routed verbs refuse a settled binary market

**Was:** a verb given a settled binary market acted on that market's pool. A
binary pool serves successive markets, so after settlement the pool serves the
next market in the series.
**Now:** `createOrder`, `mintSet`, `burnSet`, `fetchOrderBook`, `fetchTrades`,
`fetchOHLCV`, `fetchTicker`, `watchOrderBook`, `watchTrades`, `watchOrders` and
`watchMyTrades` throw `InvalidInputError` for a settled binary market.
`redeem`, `fetchBalance` and the history reads still accept it.

A caller that resolved a settled market by pool address must resolve it by
market id, or by the symbol that `fetchBalance` reports for the holding, to call
`redeem`.

**Affected:** code that keeps a binary market's symbol or pool after the market
settles. In this repository, market-taker selects active binary markets before
it calls these verbs (`src/shared.ts`).

### 5. `getLiveUserOrders` keeps a bounded terminal history

**Was:** `getLiveUserOrders` returned every order the live store had seen for
the user, including every filled and cancelled one.
**Now:** per pool, the live store keeps every open order, the orders that
retained fills need, and up to 400 recent terminal orders that nothing else
references. Older terminal orders drop out of the live read.

**Affected:** code that reads order history from `getLiveUserOrders` or the
`useLiveUserOrders` hook. Read older terminal orders with `getOrders`. In this
repository, the explorer's order panels use the hook to show open orders only
(`explorer/src/components/clob/UserPanel.tsx`,
`explorer/src/components/spot/SpotTradePanel.tsx`), so they need no change.

### 6. Live and history rows carry a required `chainId`

**Was:** these rows had no chain field.
**Now:** `chainId: number` is required on `LiveFill`, `LiveOrder`,
`LiveFundingUpdate`, `LiquidationEvent` and `FundingPayment`. It is the chain of
the engine that built or read the row. Ids repeat across chains, so key rows
merged from two engines on `(chainId, id)`. `PricePoint` does not change.

The SDK sets the field on every row it returns. Code that only reads rows needs
no change. Code that constructs them must add it:

```ts
// before
const fill: LiveFill = { ...fillFields };
```

```ts
// after
const fill: LiveFill = { ...fillFields, chainId: 50312 };
```

**Affected:** code that constructs these types, mostly test fixtures and mocks.
In this repository, the sdk-e2e order fixtures already set `chainId`
(`sdk-e2e/test/expiry.unit.test.ts`).

### 7. `exchange.client` and `exchange.trader` throw on a multi-chain exchange

**Was:** on an exchange with two or more chains, `exchange.client` and
`exchange.trader` acted on the first chain.
**Now:** both throw `InvalidInputError`. Its `chainIds` field lists the chains
the exchange spans. A pool address or market id can name a different market on
each chain, so a call without a chain could reach the wrong market. A
single-chain exchange does not change.

Name the chain instead:

```ts
// before
const viem = exchange.client.getViemClient();
const trader = exchange.trader;
```

```ts
// after
const viem = exchange.engineFor(hidekiTestnet.id).getViemClient();
const trader = exchange.traderFor(hidekiTestnet.id);
```

Two related changes:

- `createReactivity` now reads `config` as well as `getViemClient` from its first
  argument. An engine from the SDK has both. A hand-built `{ getViemClient }`
  object must add `config: { chain }`.
- `createReactivity` throws `InvalidInputError` when the wallet's `chain` is set
  and is not the engine's chain.

**Affected:** multi-chain exchanges that use `exchange.client` or
`exchange.trader`, and code that passes a hand-built object to
`createReactivity`. Every consumer in this repository builds a single-chain
exchange, so none needs a change.

### 8. Chain bindings are checked against the chain they name

**Was:** the SDK trusted each binding's endpoints.
**Now:** a binding whose endpoints serve another chain fails on first use:

- Construction throws `InvalidInputError` when two bindings name one indexer URL
  written two ways, for example with a different host case, a default port or a
  trailing slash.
- The first indexed read of each engine reads the indexer's `chain_metadata`.
  When the indexer has no row for the bound chain, the read throws
  `NotConfiguredError`. So `getSyncStatus` and `getIndexerFreshness` for the
  client's own chain throw instead of returning `null` for a missing row.
- On Hideki (50383), the first chain read on each connection reads block 1. An
  RPC on the retired Hideki v1 genesis throws `NotConfiguredError`.
- `getIndexerFreshness` throws `NotConfiguredError` when the indexer is more
  than 10,000 blocks past the RPC head, instead of reporting lag 0.
  `waitForIndexedBlock` for the client's own chain rejects in the same case.

**Affected:** code that treats a `null` from `getSyncStatus` or
`getIndexerFreshness` as "not indexed yet", and deployments whose indexer or RPC
URL points at another chain. Fix the configuration; the error's `what` names the
chain, the URL and the chains the indexer reports.

### 9. The bridge waits for its own message, and its failures are typed

**Was:** `exchange.bridge.transfer` ended its wait at any delivery to the
recipient, including one from another transfer. On a delivery timeout,
`ensureFunds` and `createOrder(…, { funding: "auto" })` threw `RpcError` with
`operation: "ensureFunds"`.
**Now:** the bridge waits for the Hyperlane message id of its own transfer. A
delivery timeout throws `BridgeDeliveryTimeoutError`, which carries
`messageId`, `bridgeHash`, `from`, `to`, `token` and `amount`.
`ExchangeBridgeResult` gains a required `messageId`. The default
`deliveryTimeoutMs` is 180 seconds instead of 120, counted from when the origin
transaction is mined.

A native route (STT) now reads the destination router's balance first. When the
router holds less than the amount, `exchange.bridge.transfer`, `ensureFunds` and
`createOrder(…, { funding: "auto" })` throw `BridgeLiquidityError` and send
nothing. It carries `token`, `from`, `to`, `router`, `amount` and `available`.
Before, the transfer was sent, the funds stayed in escrow on the origin, and the
call waited out the delivery timeout. The two errors need different handling: a
liquidity refusal is safe to retry once the router is funded, and a delivery
timeout means a transfer is in flight.

```ts
// before
try {
  await exchange.ensureFunds({ code: "USDso", chainId: hidekiTestnet.id, amount });
} catch (error) {
  if (!(error instanceof RpcError) || error.operation !== "ensureFunds") throw error;
  console.log("bridge not delivered");
}
```

```ts
// after
try {
  await exchange.ensureFunds({ code: "USDso", chainId: hidekiTestnet.id, amount });
} catch (error) {
  if (error instanceof BridgeLiquidityError) {
    // Nothing was sent. The destination router cannot pay out the amount yet.
    console.log("bridge refused", error.available);
  } else if (error instanceof BridgeDeliveryTimeoutError) {
    // The transfer may still arrive. Check delivered(messageId) on the
    // destination Mailbox before you bridge again from another exchange.
    console.log("bridge not delivered", error.messageId);
  } else {
    throw error;
  }
}
```

**Affected:** code that catches the old `RpcError` or handles only a delivery
timeout, and code that constructs `ExchangeBridgeResult` values, such as test mocks. No consumer in this
repository calls the bridge.

### 10. A write with an unknown outcome throws `TransactionOutcomeUnknownError`

**Was:** a write whose answer was lost threw a plain `RpcError`.
**Now:** it throws `TransactionOutcomeUnknownError`. The built-in executors
throw it when the sync send times out or its socket drops, when the receipt
wait fails after the transaction was sent, and when a session send loses its
answer. It carries `chainId`, `operation` and `hash`. `hash` is absent only for
a session send. The transaction can still mine, so do not retry it blindly.

The new class extends `RpcError`, so an `instanceof RpcError` check still
catches it. Test for it first:

```ts
try {
  await exchange.createOrder(symbol, "limit", "buy", 1, 0.5);
} catch (error) {
  if (error instanceof TransactionOutcomeUnknownError) {
    // The write may still mine. Look up error.hash before you send it again.
    console.log("outcome unknown", error.hash);
  } else if (error instanceof RpcError) {
    console.log("rpc failure", error.operation);
  } else {
    throw error;
  }
}
```

Code that tests `error.name === "RpcError"` no longer matches these failures. A
failed receipt wait now reports `operation: "waitForTransactionReceipt"`. A
session-key write with a gas limit of zero or less throws `InvalidInputError`
before it is sent.

**Affected:** write error handlers that retry on `RpcError`. No consumer in this
repository retries writes on `RpcError`.

### 11. A session seed that controls an account signs locally

**Was:** a session seed sent itself to the node with every write
(`somnia_sendSessionTransaction`). Any RPC endpoint, proxy or request log on the
way could read it.
**Now:** `exchange.accounts.accountFor(accountId, index, { sessionSeed })`
derives the key with `sessionPrivateKey(seed)` and signs locally. The session
address does not change, so existing owner sets keep working.
`createExecutor({ smartAccount, inner })` throws `InvalidInputError` when
`inner` was built by `createExecutor({ sessionSeed })`. `accountFor` refuses a
per-chain factory that returns such an executor in the same way.

Let `exchange.accounts.accountFor` build the account. It derives the seed's key
and gives the account a local-signing executor on every covered chain:

```ts
// before
const inner = client.createExecutor({ sessionSeed: seed });
const executor = client.createExecutor({ smartAccount: ACCOUNT, inner });
```

```ts
// after
const account = exchange.accounts.accountFor(owner, 0n, { sessionSeed: seed });
const executor = account.executors[hidekiTestnet.id];
```

`owner` and `0n` are the account id and index the accounts factory derived
`ACCOUNT` from, so `account.address` is `ACCOUNT`. Pass `account` itself as the
`account` of a `SomniaMarkets` config to trade through it on every chain.

`createExecutor({ sessionSeed })` stays available for a session account that
holds gas dust only. Local and node-side sends from one seed share one nonce
space: after a seed signs locally, do not also send from it through
`createExecutor({ sessionSeed })` or `sendSessionTransaction`.

**Affected:** code that builds a smart-account executor on a session-seed
inner. No consumer in this repository does.

### 12. The generic Safe executor is removed

**Was:** `createExecutor({ safe, inner, mode?, multiSend?, detectFailure? })`
built an executor for a threshold-1 Gnosis safe, in `"owner"` or `"module"`
mode. The root exported seven values and types for it: `safeExecAbi`,
`preValidatedSignature`, `packMultiSend`, `PackMultiSendError`,
`detectGnosisFailure`, `SafeFailureDetector` and `SafeExecutionMode`.
**Now:** the `{ safe, inner }` spec and the seven exports are gone. A spec with
a `safe` key no longer type-checks. At runtime, `createExecutor` refuses it with
`InvalidInputError`.

For an account that the accounts factory deployed, use the smart-account spec.
It batches several calls into one account transaction without a `multiSend`
address. Build `inner` with a local signer, not with `{ sessionSeed }`:

```ts
// before
const session = client.createExecutor({ privateKey: sessionKey });
const executor = client.createExecutor({ safe: account, inner: session, multiSend });
```

```ts
// after
const session = client.createExecutor({ privateKey: sessionKey });
const executor = client.createExecutor({ smartAccount: account, inner: session });
```

For any other safe, write a custom `Executor` and pass it to
`createTrader({ executor })`. Return an inner failure as `failure` on the result,
and Trader writes throw it. For the pre-validated signature and the Safe ABI,
use `prevalidatedSignature` and `safeAbi` from `@somnia-chain/accounts-sdk`.

**Affected:** code that builds a `{ safe, inner }` executor or imports one of the
seven exports. No consumer in this repository does.

### 13. `getPoolBindings` is renamed `listPoolBindings` and returns one page

**Was:** `client.getPoolBindings(pool)` returned the whole binding history of a
pool in one response. A recycled pool gains one binding for each market, so the
response had no upper bound.
**Now:** `client.listPoolBindings(pool, { limit, offset })` returns one page,
newest nonce first. `limit` is 50 by default, from 1 to 1000. `offset` is 0 by
default, from 0 to 2147483647. A bad `limit` or `offset` throws `InvalidInputError` before the
request. The row type `PoolBindingRecord` does not change.

Rename the call. A caller that only reads the current binding needs no other
change: it is the first row. A caller that needs the whole history pages until
a page is shorter than `limit`, and deduplicates on `id`. New bindings move
older rows down between two requests. The TSDoc of
`listPoolBindings` has a compile-checked example.

**Affected:** code that calls `getPoolBindings`. No consumer in this repository
does.

### 14. Local-signer sends use `eth_sendRawTransactionSync`

**Was:** `"realtime_sendRawTransaction"`.
**Now:** `"eth_sendRawTransactionSync"`.

A local-signer write now sends through `eth_sendRawTransactionSync` (EIP-7966).
It is the current name for Somnia's `realtime_sendRawTransaction`, and it also
returns the receipt in one round-trip. When this send fails, the `operation` of
the `RpcError` or `TransactionOutcomeUnknownError` names the new method. Update
checks for the old name. A node that does not serve the method still gets
`eth_sendRawTransaction` and a receipt wait.

**Affected:** code matching `err.operation === "realtime_sendRawTransaction"`.
**No consumer in this repository branches on `RpcError.operation`.**

### 15. Custom client implementations need the account capabilities

The client interface now requires `accountOrders`, `accountSpotOrders`,
`accountPositions`, `accountBalances`, and `accountOutcomePositions`. It also
requires `getAccountEquity`, `listAccountEquities`, `perpAdlQueue`,
`listPerpPositionChangesForFills`, and `getUserFillHistory`. On an indexer that
predates position changes, `listPerpPositionChangesForFills` throws
`PerpPositionChangesUnavailableError`.
Existing callers of an SDK-created client need no construction change.

If you implement or mock the whole `SomniaMarketsClient` interface, add those
members with their declared types. Do not cast an incomplete object to the
interface. A test that uses only a few members can type its double as a `Pick`
of the interface instead. Application code reaches these capabilities through
`exchange.client`, or `exchange.engineFor(chainId)` on a multi-chain exchange.

The indexed account views distinguish `unavailable`, `tooLarge`, and failed reads
from an empty account. Preserve those states in your double and UI. See
[Follow an account](./how-to/follow-an-account.md) and
[event-contract positions](./BINARY.md#an-accounts-positions-complete-and-live).

**Affected:** custom client implementations and whole-interface test doubles.
The repository's implementations expose these members in `createClient` and
`clientConformance`; the account-view tests exercise the capability contracts.

### 16. Node sockets use explicit configuration and owner cleanup

Node RPC and price-feed sockets now use the SDK-managed transport. Replacing
`globalThis.WebSocket` no longer selects their implementation. Pass your
standard constructor as `rpcWebSocketConstructor` on `SomniaMarkets` instead.
The constructor must promptly dispose connecting and open sockets on `close()`.
Browser default selection is unchanged. See the existing example in
[constructor selection](./reference/configuration.md#rpc-constructor-selection).

Each owner now has its own chain socket, even at the same URL. `stopLive()`
and `close()` also close a socket that is still connecting. A viem client
previously returned by `client.getViemClient()` remains tied to that closed
connection. Its requests reject with viem's `SocketClosedError`. After
`stopLive()`, obtain a new accessor result for further caller-owned viem work.
After owner closure, construct a new owner. If you pin an older viem 2.x
version, upgrade to at least `2.18.5`, the package's minimum peer version.

**Affected:** Node applications replacing the global constructor, applications
reusing a viem accessor across `stopLive()`, and consumers pinned below the
minimum peer version. See `socketOwnership.test.ts` and
`priceFeedConnect.test.ts` for constructor and cleanup evidence.

### 17. `MarginAccount` records its pinned block

`MarginAccount` now requires `asOfBlock: bigint`. `client.getMarginAccount`
populates it with the block shared by the account's reads. Callers that read
the result need no change. If you construct a fixture or a stored domain
value, add the block that its figures describe. Do not substitute the current
head for figures read at a different block.

**Affected:** hand-built `MarginAccount` values. The SDK's margin reader
returns the field; `perpStateBlock.test.ts` covers the pinned result.

### 18. Multi-chain reads expose partial health and chain-specific failures

`fetchDataStatus()` now resolves when at least one chain's measurement
succeeds. It throws the primary chain's error when every measurement fails.
`status.indexer` is `undefined` when the primary measurement fails; `null`
still means its metadata row is absent after a successful binding check.
Read failures from `indexerErrorByChain`, and successful measurements from
`indexerByChain`. Do not treat a missing measurement as zero lag.

```ts
async function reportIndexerStatus(exchange: SomniaMarkets, primaryChainId: number) {
  const status = await exchange.fetchDataStatus();
  if (status.indexer === undefined) {
    console.error(status.indexerErrorByChain?.[primaryChainId]);
  } else if (status.indexer === null) {
    console.log("No metadata row");
  } else {
    console.log(status.indexer);
  }
}
```

Account reads accept a chain filter; see the signatures in
[Multi-chain reads](./EXCHANGE.md#reads-across-chains). Use it when the screen
needs only one chain. An unknown chain throws `NotConfiguredError`; a market
on another chain than the filter throws `InvalidInputError`. SDK-owned
`IndexerError` and `RpcError` values can carry the failed `chainId`.
Other account reads still reject when a queried chain fails: the health
method's partial-success policy does not apply to all reads.

A binding without `indexerUrl` appears in `chainIdsWithoutIndexer`.
`fetchBalance` reads its native/ERC-20 balances without binary holdings, and
`fetchOpenOrders` reads resting orders from chain. Indexer-only account reads
skip such bindings when another queried chain has an indexer; an indexer-only
read scoped solely to one of them throws `NotConfiguredError`.

`loadMarkets()` exposes `registryReadErrorsByChain`, `perpDiscoveryErrorsByChain`,
and `perpDiscoveryPartialFailuresByChain`. The older singular accessors retain
the first failure in binding order. A bare `loadMarkets()` retries failed
chains except a `NotConfiguredError` failure. Verbs that load markets
implicitly throttle failed-chain retries to 30 seconds.

`fetchPositions` now groups rows by chain in binding order. Join by chain and
market identity instead of array position. A failed pool-state read keeps the
position with `perpState: "degraded"` and no `markPrice` or `unrealizedPnl`.
A symbol shared by two chains can gain a chain suffix when the second chain
loads later; resolve symbols again after registry changes.

**Affected:** consumers assuming primary health always exists, position ordering
matches cross-chain inputs, or missing marks mean zero. See
`multichainDataStatus.test.ts`, `multichainFacade.test.ts`, and
`multichainLoadMarkets.test.ts` for the per-chain result and error contracts.

### 19. Indexed realized PnL covers a position lifetime

`IndexedPerpPosition.lastUpdateRealizedPnl` now holds price PnL accumulated
since the position opened from flat or flipped side. It remains on the flat
row after a full close and resets when that row reopens or flips. Fees and
funding remain separate. The field name is retained for compatibility.

If you need only the latest update's PnL, read `realizedPnl` from the newest
row of `client.listPerpPositionChanges({ account, pool, limit: 1 })` instead.
Both reads need an indexer reindexed with this change. An older indexer keeps
the earlier last-update meaning and does not serve `PerpPositionChange`.

**Affected:** analytics treating `lastUpdateRealizedPnl` as one fill's result.
The perp position/history readers and indexer position handlers implement the
new meaning; [Perps](./PERPS.md) explains the history surface.

### 20. Ticker and perp-state programming failures use `InvariantError`

Unexpected SDK programming failures in `fetchTicker` and `getPerpState` now
reject with `InvariantError`. The error retains the original failure in
`cause`. Replace checks for a native programming-error class with checks for
`InvariantError`, and inspect `cause` when reporting the defect. Existing SDK
errors and caller cancellation retain their identity.

Operational outages keep their tier states: a ticker can report unavailable
statistics or degraded perp state. Those states do not certify an empty
market or a zero mark. The ticker joins started tiers and rejects with the
first observed fatal failure. See [Errors](./reference/errors.md) for the
public error vocabulary.

**Affected:** callers matching native programming-error identity or treating
all rejected ticker reads as outages. Ticker and perp-state tests cover the
normalization boundary.

### 21. Market watches select lifecycle and pending waits can reject

`client.watchMarkets()` now selects all SPOT and PERP markets and BINARY
markets that are not finalized. It no longer selects the newest markets
regardless of lifecycle. Read a finalized binary market with
`getBinaryMarket(id)`. `watchMarket(pool)` has no lifecycle filter, but the
pool can have been recycled onto another market.

One all-market snapshot still has a 500-market budget, newest eligible first.
Check `getLiveStatus().allMarketsTruncated` while the all-market watch is active
before treating its rows as every eligible market. Finalized binary markets
also leave that snapshot's fill and open-order budgets.

`exchange.unwatchMarket(ref)` now releases one market's watch channels while
keeping the owner open. Pending `watchOrderBook`, `watchTrades`, `watchOrders`,
and `watchMyTrades` waits on that market reject with a `DOMException` named
`AbortError`, including during hydration. `close()` rejects pending market and
price waits the same way. Handle this rejection when a watch loop releases
its market or closes its owner. The engine's market scope can linger for
30 seconds after release; it then drops that market's retained orders and fills.

**Affected:** consumers expecting finalized markets in the discovery watch or
pending waits to remain unresolved after release. See `snapshotDocuments.test.ts`
and `unwatchMarket.test.ts` for selection and release evidence.

## Price hooks acquire data on demand

Latest-price and feed-info hooks now acquire only current data. `useWatchPrice`
and `useWatchPriceResult` also skip the historical tape. Direct
`client.watchPrice` and `client.watchPrices` calls keep their existing tape default.

If you used a latest/info hook to populate a separate `getLivePriceTicks` read,
mount `useLivePriceTicks` for that asset or acquire a direct watch. The last tick
reader releases its tape after 30 seconds even while latest/info readers remain.
See [Reading — live](./PRICES.md#reading--live) for demand, release and error semantics.

**Affected:** Consumers that read ticks separately after mounting only a latest/info hook. The explorer price card already mounts `useLivePriceTicks`, so it needs no change.
