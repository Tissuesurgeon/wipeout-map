# The engine (advanced)

This guide tours the **engine tier** — the raw `SomniaMarketsClient`: bigint-exact,
address-keyed. It is not a second entry point: you reach it through the
exchange —

```ts
const exchange = new SomniaMarkets({ indexerUrl, chain, wsRpcUrl });
const client = exchange.client; // the engine: exact raw-unit reads + watches
const trader = exchange.trader; // the raw write tier (needs a signer)
```

Most applications stay on **[the exchange API](./EXCHANGE.md)** itself; the
engine is the tier for exact escrow math, custom reads, and anything the
exchange verbs don't cover. An engine is bound to ONE chain — one config, one
socket, one watch/store, one nonce lane. **Multi-chain is one exchange over
several engines**: configure `chains: [...]` and the exchange builds an engine
per binding. `exchange.engineFor(chainId)` and `exchange.traderFor(chainId)`
reach each chain's engine and raw write tier. On a multi-chain exchange,
`exchange.client` and `exchange.trader` throw `InvalidInputError`, because they
name no chain. Every `UnsignedCall` a build
verb returns names its `chainId`, so a call is never sent on the wrong chain.

**Who signs is pluggable.** `client.createTrader({ executor })` takes any
`Executor`; `client.createExecutor(spec)` builds the built-ins — a private key
or local account, a wallet client, a Somnia session seed, or a factory smart
account from `@somnia-chain/accounts-sdk` (`{ smartAccount, inner }`). A smart
account sends an approval and its order as one account transaction, with no
batching configuration. `through` reaches an account owned by other accounts.
The lifecycle around it is `client.accounts`; see
[Smart accounts](./ACCOUNTS.md). The writer decodes the order from the receipt the executor
returns and never fetches it again; `decodePlaceOrder` / `decodeAmendOrder` /
`decodeAmendOrders` are the same decoders, exported for a receipt you obtained
yourself.

**Retry rule for every executor.** When a send times out, its socket drops, or
its receipt wait fails after the transaction left, the built-in executors throw
`TransactionOutcomeUnknownError` with the transaction's `hash` (a session send
has none). The transaction can still mine. Look up `hash`, or read the state the
write changes, before you send the write again. A refusal the node answered
stays a plain `RpcError` or `ContractRevertError`. A safe or smart-account
executor passes the inner executor's error through, so `hash` is the outer
transaction's hash. A custom executor gets the same pass-through from
`asExecuteError`, but `asExecuteError` never creates this error: only the code
that sent the transaction knows that it may have left. A custom executor that
sends raw transactions constructs the error itself.

Receipt confirmation checks immediately and on each head. If no read is active,
it probes after one idle second. The total wait ends after 60 seconds, including
a receipt request that never returns. This applies to local fallback sends,
wallet sends and machinery writes. It does not change the sync-send fast path.
`stopLive()` and exchange `close()` end confirmations from the old owner lifecycle.
A configured abort signal ends them too. After broadcast, the error retains the
hash and the abort reason in `cause`; before broadcast, cancellation sends nothing.
Queued local machinery writes check the captured lifecycle before reading a nonce,
signing or sending. They reject with the same abort reason as the canceled wait.
A later write uses the fresh lifecycle after `stopLive()`.

For market-kind specifics, see the [binary markets](./BINARY.md) and
[spot](./SPOT.md) guides.

## The three read tiers

Every read on the client belongs to one of three tiers. The `getLive*` prefix
marks the first; for the other two the method's API reference names its source
(`getMarket`, `getFills`, `getOpenOrders` are indexer reads; `getMarginAccount`,
`getPerpState` are chain reads). The method name tells
you which — and the tier tells you the freshness and the cost:

| Tier           | Methods look like                             | Backed by                                        | Cost & freshness                                             |
| -------------- | --------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| **Live store** | `getLive*` (synchronous)                      | in-memory materialization of **watched markets** | zero round-trips, current to the last block                  |
| **Chain**      | `get*Onchain`, `getBinaryOrderBook`, balances | `eth_call` over the socket                       | one round-trip, current to head                              |
| **Indexer**    | `list*`, `getCandles`, `getPortfolio`, …      | GraphQL (HTTP)                                   | one or bounded multiple round-trips; lags the chain slightly |

Rule of thumb: **anything that gates an action reads the live store or the
chain; the indexer is for history and aggregates.** Indexer reads throw on
request failure — an empty result always means "no rows", never "it broke".

## Errors — branch on the type, never the message

Every failure the SDK raises is a typed class exported from the barrel, all
extending `SomniaMarketsError`. Catch the family, or branch on the member:

```ts
import {
  ContractRevertError,
  IndexerError,
  IndexerWaitTimeoutError,
  NotConfiguredError,
} from "@somnia-chain/markets-sdk";

try {
  await exchange.createOrder("BTC-95000-31DEC26/USDC#YES", "limit", "buy", 25, 0.62);
} catch (e) {
  if (e instanceof ContractRevertError) {
    // The chain rejected it. `errorName` is the contract's OWN error.
    if (e.errorName === "ExpiredOrderMustBeCancelled") await cancelFirst();
    else if (e.errorName === "InsufficientBalance") await topUp();
    else throw e;
  } else if (e instanceof IndexerError) {
    retryLater(); // the read didn't complete — never "no rows"
  } else if (e instanceof NotConfiguredError) {
    throw new Error(`missing config: ${e.what}`); // a deploy/config bug, not runtime
  } else throw e;
}
```

Handle an indexer wait separately so the timeout branch wraps the method that
can actually raise it:

```ts
const targetBlock = 1_234_567n; // the confirmed transaction's block
try {
  await exchange.client.waitForIndexedBlock(exchange.client.config.chain.id, targetBlock);
} catch (e) {
  if (e instanceof IndexerWaitTimeoutError) {
    retryLater(); // the indexer answered but has not processed targetBlock yet
  } else if (e instanceof IndexerError) {
    retryLater(); // the metadata read did not complete
  } else throw e;
}
```

| Class                                 | Means                                                                                       | Your move                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `InvalidInputError`                   | Bad argument, unknown symbol, wrong market kind (thrown before any I/O)                     | Fix the call                                            |
| `NotConfiguredError`                  | A needed address/URL was never passed (`what` names it)                                     | Fix the config                                          |
| `NotSupportedError`                   | The call is valid, but this SDK version does not support it yet (`feature` names it)        | Use a supported option, or upgrade the SDK              |
| `SignerRequiredError`                 | The method writes; this client has no signer                                                | Construct with a signer                                 |
| `CollateralOnWrongChainError`         | `chainId`, `code`, `needed`, `held`, `shortfall`, `elsewhere`, `plan?`                      | The order's collateral sits on another configured chain |
| `BridgeLiquidityError`                | A native route's destination router cannot pay out; nothing was sent                        | Wait for the router to be seeded / bridge less          |
| `BridgeDeliveryTimeoutError`          | A bridge was sent but its message was not delivered in time; `messageId` names it           | Check `delivered(messageId)` before sending again       |
| `IndexerWaitTimeoutError`             | The indexer stayed behind the requested block until the deadline                            | Wait longer / read chain                                |
| `IndexerError`                        | An indexer read did not complete                                                            | Retry / degrade                                         |
| `IncompleteHistoryError`              | Portfolio analytics could not read every indexed fill                                       | Raise or omit `maxFillPages` / investigate a cycle      |
| `IncompletePortfolioError`            | `getClaimable` observed more than 200 nonzero positions                                     | Use `getClaimablePage` and follow `nextOffset`          |
| `IndexerUnavailableError`             | The SDK refused the read locally — `reason` says which gate                                 | Branch on `reason` (see its TSDoc)                      |
| `AccountViewError`                    | The indexer's account-view answer is not one complete account — `reason` says why           | Retry `snapshotUnstable`; retry the rest later          |
| `FillHistoryUnavailableError`         | The indexer has no initialized fill-dataset generation                                      | Deploy and reindex a compatible producer                |
| `PerpPositionChangesUnavailableError` | The indexer predates perp position changes                                                  | Show each fill's own side; reindex the indexer          |
| `FillHistoryRestartRequiredError`     | A fill-page cursor belongs to another serving generation or predates generation binding     | Discard pages; restart at page one                      |
| `AccountsIndexerUnavailableError`     | The accounts indexer is rate-limited or overloaded on a smart-account read — `retryAfterMs` | Wait `retryAfterMs` (or back off) and retry             |
| `AccountFeedRestartRequiredError`     | A smart-account feed cursor predates a rebuild of that chain's accounts index (`chainId`)   | Discard pages; restart without a cursor                 |
| `RpcError`                            | A node request did not complete, or the node refused a transaction                          | Read: retry / switch RPC. Write: check the chain first  |
| `TransactionOutcomeUnknownError`      | A signed write may have reached the node; its receipt was not observed (`hash`)             | Look up `hash` before sending again                     |
| `ContractRevertError`                 | The chain rejected the call — `errorName` + `args`                                          | Branch on `errorName`                                   |
| `InvariantError`                      | The SDK contradicted an invariant established by its own control flow                       | Report the SDK defect                                   |

Three things worth knowing:

- **Revert names come from the contracts.** The SDK bundles every custom error the
  protocol declares and decodes revert data against it, so a failed write reports
  `MarketNotSettled` rather than hex. When the data matches nothing known you
  still get a `ContractRevertError`, with the raw `reason`/`data` preserved.
- **A mined-but-reverted transaction throws.** You don't need to check
  `receipt.status` yourself; the SDK replays the call to recover the reason first.
- **`cause` is always chained.** The original viem/fetch error is there for logs.
- **Never match on `error.message`** — messages are not a stable API. Branch on the
  class and its fields (`errorName`, `what`, `operation`).

## Watches — scoped, ref-counted live data

Nothing is streamed by default. You open a **watch** on what you care about,
and the client becomes a local indexer of exactly that scope:

```ts
const watch = await client.watchMarket(pool); // one market: book, fills, orders, status
const book = client.getLiveBinaryOrderBook(pool); // synchronous, zero round-trips, last-block fresh
// ... trade against it ...
watch.stop(); // release (ref-counted, brief linger)
```

- [`watchMarket(pool)`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#watchmarket) —
  hydrates a consistent snapshot of that market (its row, recent fills, full
  resting book) and streams its events from the chain WebSocket. Resolves once
  reads are live. This is the right default: cost scales with what you watch,
  not with the protocol.
- [`watchMarkets({ discover? })`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#watchmarkets)
  — every SPOT and PERP market and every BINARY market that is not
  finalized, for list views and multi-market bots. One snapshot hydrates at
  most 500 of them, newest first; when more exist,
  `getLiveStatus().allMarketsTruncated` is `true`. Read a finalized BINARY market
  with `getBinaryMarket(id)`. `discover: true` also watches the creation events (the `MarketCreator`
  factory AND `BinaryMarketsModule.createMarket`) so newly created markets —
  rolling-series or module-created — join live.
- [`watchUser(user)`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#watchuser) —
  hydrates one account's order/fill _history_ (live events are attributed to
  every account automatically within watched markets).
- [`getWatchStatus(pool)`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getwatchstatus)
  — `"unwatched" | "hydrating" | "live"`; this is how you distinguish "the book
  is empty" from "I'm not watching this pool".

Watches are **ref-counted**: two watchers of the same pool share one snapshot
and one subscription, and a released scope lingers ~30s before teardown so
quick re-watches don't re-snapshot. If the socket drops, watches heal
themselves — resubscribe with backoff, then backfill the missed blocks straight
from chain (the indexer is only ever touched to hydrate a _new_ scope).

While a market is watched, these answer synchronously with zero round-trips:
[`getLiveBinaryOrderBook`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getlivebinaryorderbook) /
[`getLiveSpotOrderBook`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getlivespotorderbook)
(the resting book — **the one to render or quote against**),
[`getLiveFills`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getlivefills) (tape),
[`getLiveUserFills`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getliveuserfills) /
[`getLiveUserOrders`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getliveuserorders)
(one account's activity),
[`getLiveMarkets`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getlivemarkets) /
[`getLiveMarketByPool`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getlivemarketbypool) /
[`getLiveMarketByAddress`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getlivemarketbyaddress)
(market rows with live status + stats), and
[`getLiveStatus`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getlivestatus)
(global health).

Reactivity without React:
[`subscribeLive`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#subscribelive) fires
after every batch of changes — re-read whatever you need inside the callback:

```ts
const watch = await client.watchMarket(pool);
client.subscribeLive(() => {
  const { yesBids, yesAsks } = client.getLiveBinaryOrderBook(pool, { depth: 5 });
  requote(yesBids, yesAsks); // runs within ms of the on-chain event
});
```

## React

Provide the client once; the hooks read it from context and **watch
automatically** — rendering a market's book is what subscribes to it, and
unmounting releases it:

```tsx
import {
  SomniaMarketsProvider,
  useLiveBinaryOrderBook,
  useLiveFills,
  useWatchUser,
} from "@somnia-chain/markets-sdk/react";

function App({ children }) {
  return <SomniaMarketsProvider client={client}>{children}</SomniaMarketsProvider>;
}

function Terminal({ pool, account }: { pool: string; account?: string }) {
  useWatchUser(account); // hydrate the user's history once
  const book = useLiveBinaryOrderBook(pool, 11); // auto-watches `pool` while mounted
  const tape = useLiveFills(pool, 40); // shares the same watch (ref-counted)
  // ...
}
```

The live-store hooks: `useLiveBinaryOrderBook`, `useLiveBinaryOrderBookByMarket`,
`useLiveSpotOrderBook`, `useLiveFills`, `useLiveUserFills`, `useLiveUserOrders`,
`useLiveFundingUpdates`, `useLiveMarketByPool`, `useLiveMarketByAddress`,
`useLiveMarkets`, `useLiveStatus`, `useIsTailing`, plus the explicit
`useWatchMarket` / `useWatchUser` and `useSomniaMarketsClient`. The price
(`useWatchPrice`, `useLivePrice`, `useLivePriceTicks`, `useLivePriceFeedInfo`),
funding (`useFundingRateSeries`), lend (`useLendReserves`, `useLendAccount`) and
directory (`useMarketCreators`, `useOracleAdapters`) hooks are listed in the API
reference. Every pool-keyed data
hook holds a ref-counted watch on its pool while mounted; `useWatchMarket` also
returns the pool's `WatchStatus` for loading UI.

For the **indexer** tier (history + directories, not the live store) there is a
generic engine hook — `useIndexerQuery(fn, deps)` runs `fn(client)` on mount and
whenever `deps` change, tracks `{ data, loading, error, refetch }`, and discards
stale responses:

```tsx
const { data: markets } = useIndexerQuery((c) => c.listBinaryMarkets({ limit: 20 }), []);
```

Concrete wrappers over the common reads: `usePortfolio`, `useMarkets`,
`useCandles`, `useMarketFees`, `useOperators`. Separately, `useLiveMarkets` is
the zero-round-trip live-store view of every watched market (pair it with a
discovery watch), not an indexer fetch.

## Chain reads — head-fresh, no watch required

One `eth_call` round-trip over the client's socket (concurrent calls pipeline):

- [`getMarketOnchain`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getmarketonchain)
  — a BinaryMarket's full wiring + state. **Authoritative for write
  eligibility** (status, resolution), and works before the indexer has ever
  seen the market.
- [`getBinaryOrderBook`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getbinaryorderbook) /
  [`getSpotOrderBook`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getspotorderbook)
  — the book from the contract; the one-shot fallback (or checksum) for the
  live variants.
- [`getErc20Balance`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#geterc20balance) /
  [`getNativeBalance`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getnativebalance)
  — raw balances (use these, not indexer balances, to gate a write).
- `getBalances(tokens, account)` — batch multi-token balance read (one round-trip
  for a whole wallet); `getOutcomeBalance({ outcomeToken, account, id })` — a single
  ERC-6909 outcome-id balance (the on-chain point read behind the indexer's
  `getOutcomeBalances`).
- `getErc20Metadata(token)` / `getErc20Allowance(token, owner, spender)` — token
  name/symbol/decimals and a spender allowance (gate an `approve` on it).
- `getContractMeta(address, { proxy })` — contract/proxy introspection; and
  `getMaxVenueFeeBps()` — the protocol's hard fee-rate cap (bps).
- Perp margin health — `getMarginAccount` (now including `imReq`/`mmReq`/`cmReq`/
  `marginStatus`), `getAccountHealth`, and `getLiquidationPrice` (all
  `MarginBank` reads); see [perps](./PERPS.md).
- `getVaultBalance({ vault, owner, token })` — the LIVE claimable balance behind the
  append-only `getVaultPayoutFallbacks` credit log (vault credits emit no event,
  so the current balance must be read from chain).
- [`getHeadBlock`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getheadblock),
  [`getStopOrderSomiPayment`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getstopordersomipayment),
  [`getSystemInfo`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getsysteminfo).

## Indexer reads — history and aggregates

These are the only methods that touch the indexer besides a watch's initial
snapshot. Most point and list reads below make one GraphQL round-trip;
`getTradeContext` makes two because its second query depends on the first query's
fill. The Ops section identifies the other exception: `waitForIndexedBlock`
repeats a metadata query until the indexer reaches the target block or the wait
deadline expires.

- Markets: [`listMarkets`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#listmarkets),
  [`getMarket`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getmarket), and the
  binary-narrowed [`listBinaryMarkets`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#listbinarymarkets) /
  [`listLiveBinaryMarkets`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#listlivebinarymarkets) /
  [`listPastBinaryMarkets`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#listpastbinarymarkets) /
  [`getBinaryMarket`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getbinarymarket).
- History: [`getCandles`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getcandles)
  (OHLCV, chart-ready), [`getFills`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getfills)`(pool, { market })`
  (a pool's fills; pass `market` on binary to read one market's fills),
  and the account-scoped `getOrders(owner, opts)` (an owner's order history →
  `OrderRow[]`), `getUserFills(account, { market })` (an account's fills →
  `FillRow[]`; scope by `market` rather than `pool` on binary, where one pool
  is recycled across successive markets), and `getMarketStatusHistory(marketId)`
  (a market's lifecycle transitions).
- Single-entity detail (the explorer's order/fill pages run on exactly these):
  [`getOrder`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getorder)`(pool, orderId)` —
  one order with owner + full lifecycle attribution (`OrderDetail`; ids never
  reuse, so the pair is a permanent name),
  [`getFill`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getfill)`(id)` — one fill by its
  `${block}_${logIndex}` id with both parties' order linkage (`FillDetail`), and
  [`getOrderFills`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getorderfills)`(pool, orderId, { limit })` —
  every fill one known order participated in, either side, as a bounded whole-history lookup.
  It accepts only `limit` and does not take `sinceBlock`; resume a pool or account tape by
  passing `sinceBlock` to `getFills` or `getUserFills`.
  All three embed a
  `MarketRef` (symbols + decimals + routing identity) so a detail view renders
  from one read.
- Every fill of one market kind in a BLOCK RANGE, across every pool of that kind:
  [`getFillsPage`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getfillspage)`({ marketType, sinceBlock, toBlock })`.
  The read behind a published trade feed: it takes no pool, both bounds include their
  block, and rows arrive oldest first by `(blockNumber, logIndex)`, so successive ranges
  tile the chain exactly where a `since`/`until` window in seconds cannot.
  [`getLatestFillBlock`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getlatestfillblock)`(marketType)`
  is the head marker to bound it with — read from the fill data, so it never names a
  block the range read cannot serve.
- ONE transaction in full:
  [`getTransactionActivity`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#gettransactionactivity).
  The same event union as `getMarketActivity`, selected by transaction hash and
  ordered forwards, plus the orders placed, the fees paid and the markets
  touched. Empty for a hash that touched no protocol contract.
- ONE trade IN CONTEXT:
  [`getTradeContext`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#gettradecontext).
  `getFill` above names one fill and its market in a single query; this adds the
  surrounding context — both orders resolved, the fees its transaction charged,
  and that transaction's other fills — in two GraphQL round-trips. Returns `null`
  for an unknown id. Use it behind a trade detail page that shows the
  counterparties; use `getFill` when rendering the trade alone.
- One market's whole transaction history:
  [`getMarketActivity`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getmarketactivity).
  It reads what `getFills` reads and four more streams — complete-set mints and
  merges, redemptions, oracle resolution, lifecycle transitions — and returns
  them interleaved by time as one discriminated union, in one round-trip. Use it
  for a market page's activity panel; use `getFills` when only trades matter.
  Every row names its transaction hash. A spot or perp market yields `TRADE`
  rows only, because the other four streams read binary-only entities.
- Wallet views: [`getPortfolio`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getportfolio)
  (binary positions + orders + trades in one round-trip),
  [`getSpotPortfolio`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getspotportfolio),
  [`getSpotStopOrders`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getspotstoporders),
  [`getOpenOrders`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getopenorders),
  [`getOutcomeBalances`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getoutcomebalances).
- Control plane: [`listOperators`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#listoperators) /
  [`getOperator`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getoperator) /
  [`listVenues`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#listvenues) /
  [`getVenue`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getvenue)
  — the indexed MarketsCore operator/venue directory (venue ids are opaque
  bytes32; decode a BINARY_V1 venue's fee bytes with
  `decodeBinaryVenueFeeParams`).
- Fee / resolution / router history (binary): `getMarketResolution`,
  `getRouterActions`, `listProtocolFees` / `listBuilderFees` /
  `listSettlementFees` (per-fill streams behind `getMarketFees`, filterable by
  `payer`), `listBuilderApprovals`, `getVaultPayoutFallbacks` — see
  [binary markets](./BINARY.md).
- Perp account plane: `getFundingPayments`, `getMarginEvents`, `listLiquidations`,
  `listPerpPositionChanges`, `listPerpPositionChangesForFills`, `listFundingRateHistory`, `listFundingRateCandles`, `getOpenInterestHistory` — the
  append-only history the chain doesn't expose; see [perps](./PERPS.md).
- Lookups + totals: `getMarketByPool` (resolve a market by pool address) and
  `listMarketsByPool(pool)` (every market the pool has HOSTED, newest first —
  a binary pool is recycled across successive markets, so this is its full
  history; also `getSeries(creator, seriesId)` for one rolling series' current
  spec, the single-row sibling of `listSeries`),
  `countOrders` / `countUserFills` (history-page totals), and the board totals
  `countMarkets` / `countBinaryMarkets` / `countVenues` / `countOperators` (each
  takes the same filter as its `list*` sibling — use for pagination headers).
  `CANDLE_INTERVALS` is the exported bucket list `getCandles` accepts.
- One account's complete open orders and pending stops:
  `client.accountOrders.getSnapshot(account)`. It reads the indexer's
  account view as a guarded snapshot: two version reads bracket the row read, so
  the rows are complete at the version they name. When they cannot be, the result
  says why (`unavailable` or `tooLarge`); it is never an empty account. It sends
  four GraphQL requests, more when the account changes during the read, and one
  more for the stop pools whose type the client does not know yet. A perp LIMIT
  stop's limit price comes from the chain. `client.accountOrders.subscribe(account,
onView)` keeps the same view live: it starts from that snapshot and applies the
  account's changes from the indexer's change stream, over one GraphQL WebSocket per
  client. Its stops also follow the stop registries' events over the chain socket,
  ahead of the indexer. See [Read tiers](./reference/read-tiers.md) and
  [Follow an account's open orders](./how-to/follow-an-account.md).
- One account's open perp positions, resting perp orders and margin in one MarginBank:
  `client.accountPositions.getSnapshot(marginBank, account)`. It reads the chain,
  not the indexer: the MarginBank's own list of the account's pools, each position,
  its pool's price and health, the account's resting orders in those pools, and the
  account's collateral and health, all at one block. That is up to three Multicall3
  calls, or one once a read has named the pools and orders, plus one order id call
  per pool, sent as the account. A figure the chain cannot give is `unknown`, never
  zero.
  `client.accountPositions.subscribe(marginBank, account, onView)` keeps it live.
  After the first read, the Somnia node pushes that same read (`somnia_watch`) when
  the MarginBank emits an event naming the account, and on every price write while
  the account holds positions, so marks and PnL follow the price. The price trigger
  needs `addresses.priceFeedScheduler`. A node that does not push leaves the SDK
  reading on the account's events and every 5 s. See
  [Follow an account's open orders](./how-to/follow-an-account.md).
- One account's resting spot orders:
  `client.accountSpotOrders.getSnapshot(account)`. It reads the chain, not the
  indexer: every spot pool's own list of the account's orders, one call per pool
  sent as the account, then the orders' details in one Multicall3 call, all at one
  block. Which pools are spot pools comes from the indexer's market list. A pool
  that cannot be read is in `data.unreadPools`, with its error, and its orders are
  unknown, not absent; a read that can read no pool fails.
  `client.accountSpotOrders.subscribe(account, onView)` keeps it live: it follows
  every placement in the spot pools and the later events of the account's own
  orders over the chain socket, reads again the pool an event concerns, and reads
  every pool 30 s after it last read them all. See
  [Follow an account's open orders](./how-to/follow-an-account.md).
- Several accounts' wallet balances:
  `client.accountBalances.getSnapshot(accounts, tokens)`. It reads the chain: each
  token's `balanceOf`, and the native balance for `"native"`, all at one block in one
  Multicall3 call. A balance the chain cannot give is `unknown`, never zero.
  `client.accountBalances.subscribe(accounts, tokens, onView)` repeats that read when
  one of the tokens emits a `Transfer` from or to one of the accounts, and every 10 s.
  See [Follow an account's open orders](./how-to/follow-an-account.md).
- Ops: [`getSyncStatus`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getsyncstatus)
  — how far behind the indexer itself is, and
  [`waitForIndexedBlock`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#waitforindexedblock)
  — poll until it has processed a block, so a write can be read back from the
  index rather than after a guessed delay. Each poll sends one GraphQL round-trip.

Two of these have faster live twins a trading loop should prefer:
`getOpenOrders` → `getLiveUserOrders`, `getFills` → `getLiveFills`.

## The network tape — every order on the network, live

```ts
const tape = client.createNetworkTape();
const stop = tape.subscribe(() => {
  render(tape.bids, tape.fills, tape.asks, tape.getStatus());
});
// … stop() closes the socket when the last listener unsubscribes.
```

[`createNetworkTape`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#createnetworktape)
returns a [`NetworkTape`](https://prd.smk.somnia.host/docs/typescript/api/index/classes/NetworkTape) — a network-WIDE
order-flow firehose: one topics-only chain-log subscription that sees
`OrderPlaced` / `OrderFilled` from **every** pool (including pools created after
it starts), no indexer on the hot path. It is not the live tail: no books, no
snapshots — three newest-first ring buffers (`bids` / `fills` / `asks`) plus a
session `(pool, orderId) → owner` map that attributes fills (takers always
resolve — their placement follows the fill in the same tx; makers resolve when
quoted while the tape ran, else `null`). Rows carry RAW units; join to
`listMarkets` for symbols/decimals. Nothing connects until the first
`subscribe`, and reconnect/stall handling (Somnia's silently-dying WS subs) is
built in.

For enriching a tape row's transaction,
[`getTransactionSummary`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#gettransactionsummary)`(hash)`
is the chain-direct companion: sender, gas used/limit, effective gas price, fee
paid, status. It resolves to null for a malformed hash and for a transaction the
node reports as not found. A read that does not complete throws `RpcError`, so an
outage stays distinct from a transaction that never landed.

## Writes — `createTrader`

```ts
const trader = client.createTrader({ privateKey }); // or { walletClient } in the browser
const { orderId, fills } = await trader.placeOrder({ pool, side: "BUY_YES", price, quantity });
```

[`createTrader`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#createtrader) binds a
signer to this client's chain, fees, and socket and returns a
[`Trader`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/Trader). The trader is **independent of
the watches** — a pool's escrow tokens resolve from the pool contract itself
(one cached read) when you don't pass them. With a local key the SDK signs
locally with fixed fees and a fixed gas ceiling. Before each local send, it
reconciles the pending nonce and serializes nonce consumption, signing, and
broadcast acceptance. Some orders also need prerequisite funding reads or an
approval transaction. `eth_sendRawTransactionSync` returns the mined receipt;
every write resolves only once mined, with that receipt (and, for orders, the
decoded `orderId` + `fills`). Market-kind specifics: [binary markets](./BINARY.md#trading),
[spot](./SPOT.md#trading).

Every write result also carries `executionTimeMicros` when the node reports it.
It is the time in microseconds from the node receiving the send to its answer,
and it covers mempool, finality and execution inside Somnia. The local-signer
and session-key executors read it from the receipt that
`eth_sendRawTransactionSync` and `somnia_sendSessionTransaction` return. It is
absent on an older node, on the `eth_sendRawTransaction` fallback, and for a
wallet-client send. A custom executor can set it on `Executed` to pass it on.

For the MarketsCore control plane there is a second, low-frequency write tier:
`client.createOperatorAdmin({ privateKey })` returns an `OperatorAdmin` with
`registerOperator`, `updateOperator`, `createVenue` (venues are typed by a
`bytes4` market-type id — `MARKET_TYPE_BINARY_V1` — and get a
contract-generated `bytes32` venue id back), `updateVenue`, `setVenueEnabled`,
and the two-step operator-ownership transfer. Build a BINARY_V1 venue's fee
bytes with `client.encodeBinaryVenueFeeParams({...})`.

## Escape hatch

[`getViemClient()`](https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/SomniaMarketsClient#getviemclient)
returns the underlying viem WebSocket client for any read the SDK doesn't cover —
your own contracts, or plain calls like `getBalance` / `getCode` /
`waitForTransactionReceipt`. Same socket, same pipelining: a client of your own
would open a second connection, and one-socket-per-client is deliberate here.

**It is undecorated, and that is the point.** Every read reachable from the client
interface goes through a _wrapped_ viem client. Its `readContract`, `call`,
`multicall`, and `getBlockNumber` methods rethrow as
[typed SDK errors](https://prd.smk.somnia.host/docs/typescript/api/index/classes/ContractRevertError).
A revert arrives decoded, as its Solidity name. The client this method hands you
does **not** do that: reads keep viem's own error contract, so
`e instanceof ContractFunctionRevertedError` and the rest of your existing viem
error handling still work.

Pick accordingly. For a _protocol_ contract, prefer the SDK's own methods — the
decoding is the value, and on a contract the SDK doesn't bundle the decoder can
only report `errorName: undefined` anyway. For anything else, this is the door.

**It belongs to the current connection.** `stopLive()` and `close()` close the
socket the client uses. After that, requests on a client you kept reject with
viem's `SocketClosedError`; the client does not reconnect. Call
`getViemClient()` again after `stopLive()` to get a client on the new
connection.

---

Next: [binary markets](./BINARY.md), [spot](./SPOT.md),
[perps](./PERPS.md), and the
[architecture guide](./ARCHITECTURE.md) for how the machine works inside.
