# Binary markets

A binary market is an order book over a YES/NO question ("Will BTC be above
$95k at expiry?"). Each market has its own `BinaryMarket` contract (lifecycle,
resolution) and uses a `BinaryPool` (the CLOB + escrow) that can host later
markets. Its YES and NO outcome tokens are backed 1:1 by collateral. This guide
covers reading and trading them; [pool recycling](./explanation/binary-pool-recycling.md)
explains why the pool address does not identify one binary market. The shared
client mechanics (watches, read tiers, signers) are in
[the engine guide](./ENGINE.md).

## The mental model

- **Prices are YES probabilities.** Every price in the API is the YES price in
  raw collateral units per whole outcome token — `620000` with 6-decimal
  collateral means 0.62, i.e. a 62% implied probability. Convert with
  `probabilityToPrice` / `priceToProbability`, and `fromHuman` / `toHuman` at
  the UI edges, passing the selected market's `quoteDecimals`. On the active
  mainnet venue USDso has 18 decimals; on Shannon and Hideki tUSDC has 6. The NO side is
  always the complement: a NO at 0.38 _is_ a YES at 0.62. The pool keeps one
  book in YES terms.
- **Four sides, one book.** `BinarySide` is `BUY_YES | SELL_YES | BUY_NO |
SELL_NO`. Buys escrow collateral; sells escrow the outcome token you're
  selling. Opposite-side orders can match by _minting_ a fresh YES+NO pair from
  collateral (two buyers) or _burning_ one back to collateral (two sellers) —
  the `BinaryFillKind` on a fill tells you which.
- **Lifecycle.** `Listed → Trading → Locked → Settling → Resolved | Voided →
Finalized` (`BinaryMarketStatus`; `Finalized` once the settlement snapshot is
  swept and the pool released). Trading is only possible in `Trading`; after
  resolution the winning token redeems 1:1 for collateral, net of the venue's
  one-time settlement fee if it configured one. A voided market pays BOTH sides
  instead, from the payout vector it stored at void time, never fee'd — so
  redeeming one names the leg (see Complete sets and settlement).
- **Markets roll themselves.** Each cadence (1m / 5m / 15m / 1h / 4h / 24h) is a _series_
  that a `MarketCreator` contract advances autonomously — at every wall-clock
  boundary it creates the next `BinaryMarket`, uses a released `BinaryPool` when
  available or deploys a new one, and schedules the oracle question. Series
  markets are **reference-mode**: there is no fixed
  strike (the event's `strike` is always 0) — a market resolves YES iff its own
  oracle answer is at/above the previous boundary's _reference_ answer.
  Markets can also be created directly via `BinaryMarketsModule.createMarket`
  under an operator's venue (these can be bucket-mode, with a real strike).
  Discovery is event-driven either way: an all-markets watch with `discover`
  picks each new market up from the creation events (see below). You don't
  need to create markets — you watch, trade, and redeem them.

## The series, and how a market is born

`MarketCreator` runs the whole protocol off **one** Somnia reactivity `Schedule`
subscription (the precompile at `0x0100`). When it fires, a single callback
drains that boundary's whole batch of due series in a **gas-bounded loop** —
rolling series until the gas envelope runs low — then re-arms the `Schedule`
sub for the next-earliest pending boundary. A batch too large for one callback
(the 00:00-UTC collision, where every cadence lands at once) saves a resume
index and arms a sub for the **next block** to finish the spill. Exactly one
subscription is ever live. (Historical note: an earlier one-series-per-hop
`RollNext` reentrancy chain was tried and removed — on live Somnia the
self-emitted event wasn't re-queued after a heavy roll, so it stalled after one
hop. The gas-bounded loop with next-block spill replaced it.)

Each roll emits, from the `MarketCreator`:

```
MarketCreated(
  bytes32 marketId, address market, address pool,
  uint256 yesId, uint256 noId, address collateral, string asset,
  uint256 strike,           // always 0 — series markets are reference-mode (no fixed strike)
  uint64 tradingStart, uint64 expiry,
  uint256 oracleQuestionId, string question,
  uint64 intervalSec        // series cadence: 60 / 300 / 900 / 3600 / 14400 / 86400
)
```

Every market — series-rolled or not — ALSO fires the `BinaryMarketsModule`'s
own 20-field `MarketCreated`, the only creation event carrying the
`(operatorId, venueId)` origin attribution. A discovery watch
(`watchMarkets({ discover: true })`) listens to both, so module-created markets
that never pass through a `MarketCreator` join the watch live too.

- **Read cadence from `intervalSec`, and treat it as approximate.** A series'
  first market is a _bootstrap partial_ (trigger time → the next aligned
  boundary), so its window is shorter than the cadence. On the SDK's
  `BinaryMarket` type the cadence surfaces as `intervalSec?: string | null`
  (`null` when a market predates the field).

  For a `MarketCreator`-rolled market the indexer patches the exact cadence from
  `MarketCreator.MarketCreated.intervalSec`, so the field joins by equality.
  Module-created markets, and rows indexed before that patch existed, still
  carry the window-derived `expiry − tradingStart`, which a late roll shortens
  to 898s or 899s on a 15m series. `BinaryMarketFilter.intervalSec` bands the
  value (± `CADENCE_TOLERANCE_SEC`) and `snapToCadence` groups by the same
  rule, so both kinds of row match; use those rather than comparing the raw
  field.

**Resolution is a separate loop.** `OracleCore` emits
`AnswerPosted(uint256,uint8,string,int256,bool,uint8,uint256[])` when the
oracle answers a question. `OracleHub` subscribes to that event on the
`OracleCore` address and routes the answer through `BinaryMarketsModule`.
The SDK sees a `Resolved` or `Voided` lifecycle event from the individual
`BinaryMarket` — gate redemption on that, per the rule below. Permissionless
`voidExpired()` can also emit `Voided` without an oracle answer.

### Event emitters

For a raw log or Reactivity subscription, filter by the contract that **emits**
the event. The module, settlement contract, market and pool are separate log
sources. Use `config.addresses` for configured singletons on the selected
chain, the selected market's `marketAddress` and `poolAddress` for clones, and
`smart-contracts/deployments/<chainId>/<environment>/addresses.json` for
`OracleCore`. An existing receipt's `log.address` identifies its actual
emitter. The SDK's
`SOMNIA_TESTNET_ADDRESSES` and `SOMNIA_MAINNET_ADDRESSES` are generated from
their respective deployment manifests. `marketCreator` names a configured
creator; other venues can have their own creator, available as `creator` on the
module's `MarketCreated` event. For historical `AnswerPosted` logs, select the
OracleCore deployment that emitted those answers if the active core changed.

| Event signature                                                          | Emitting contract                                                         | Filter address                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------ |
| `MarketCreated` (series, 13 arguments)                                   | `MarketCreator` on a series roll                                          | Venue's `marketCreator`                          |
| `MarketCreated` (module, 20 arguments)                                   | `BinaryMarketsModule` on every creation, including a series roll          | `binaryModule`                                   |
| `AnswerPosted(uint256,uint8,string,int256,bool,uint8,uint256[])`         | `OracleCore`, **not** `OracleHub`                                         | Matching manifest's `OracleCore.address`         |
| `Resolved(uint32,uint256[])` / `Voided()`                                | Individual `BinaryMarket`                                                 | Market's `marketAddress`                         |
| `MarketFinalized(bytes32,address,uint256)`                               | `BinaryMarketsModule`; carries `marketId`                                 | `binaryModule`                                   |
| `MarketFinalized(uint256,address,uint64,address,uint256,bool,uint256[])` | `BinarySettlement`; carries `netBacking`                                  | `binarySettlement`                               |
| `PoolFinalized(uint64,uint256)`                                          | Individual `BinaryPool`; its backing was swept                            | Market's `poolAddress` and indexed `marketNonce` |
| `PoolReleased(bytes32,address,address)`                                  | `BinaryMarketsModule`; the pool can be reused                             | `binaryModule`                                   |
| `Redeemed(uint256,address,address,uint8,uint256,uint256)`                | `BinarySettlement`; tokens burned; collateral paid or owed, possibly zero | `binarySettlement`                               |

A series roll can produce both `MarketCreated` events for one market; deduplicate
by `marketId`. Their canonical signatures for topic0 are:

```text
MarketCreated(bytes32,address,address,uint256,uint256,address,string,uint256,uint64,uint64,uint256,string,uint64)
MarketCreated(bytes32,address,address,uint256,uint32,bytes32,address,address,uint256,uint256,uint64,uint8,uint8,uint64,uint64,uint8,string,uint256,string,bytes)
```

A pool can serve later markets, so its address alone does not identify one
market's `PoolFinalized`: match the selected market's `nonce` to the event's
indexed `marketNonce` (topic1).

The first `MarketFinalized` payload is `(marketId, pool, marketKey)`; the second
is `(marketKey, pool, nonce, collateralToken, netBacking, voided,
payoutNumerators)`. Their topic0 values differ. On Shannon,
a subscriber for settlement `netBacking` must filter the settlement event at
`SOMNIA_TESTNET_ADDRESSES.binarySettlement`, not the three-field module event at
`SOMNIA_TESTNET_ADDRESSES.binaryModule`. The address is the settlement **proxy**
(`0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23` in the Shannon
`50312/testnet-development` manifest), not its implementation or the pool. See
[Reactivity](./REACTIVITY.md) for `watch` and `subscribe` filter fields.

### Oracle question links

An `oracleQuestionId` is scoped to its oracle deployment. Choose the host
from the **market's chain ID**, not from the numeric ID:

| Market chain            | Question page                                                 |
| ----------------------- | ------------------------------------------------------------- |
| Shannon testnet (50312) | `https://dev.oracle.somnia.host/questions/<oracleQuestionId>` |
| Somnia mainnet (5031)   | `https://prd.oracle.somnia.host/questions/<oracleQuestionId>` |

For example, a Shannon market's ID belongs at
`https://dev.oracle.somnia.host/questions/<oracleQuestionId>`; a mainnet ID
belongs at the production host. The same number is not a cross-host key.
These are oracle **question** pages; the `price-feed.*.oracle.somnia.host`
endpoints in the [network reference](./reference/networks-and-endpoints.md)
serve price-feed GraphQL instead. For another chain, verify its oracle host
before constructing a link.

## Reading

Watch the market, then read the live store — synchronous, zero round-trips,
current to the last block:

```ts
const watch = await client.watchMarket(market.poolAddress);

const book = client.getLiveBinaryOrderBookByMarket(market.id, { depth: 11 });
// { yesBids, yesAsks, noBids, noAsks } — NO sides derived as 1 − yesPrice
const tape = client.getLiveFills(market.poolAddress, { limit: 40 });
const live = client.getLiveMarketByPool(market.poolAddress); // status, lastPrice, volumes
```

The book read above uses `market.id` so a page for an older market shows an
empty book after its pool is recycled. The live market read describes the
pool's current occupant. The pool-keyed tape can include fills from successive
markets on that address; it does not identify one market. For a chain snapshot,
`getBinaryOrderBook(pool)` also reads the pool's current book without a
market-id check. See [pool recycling](./explanation/binary-pool-recycling.md)
before using a pool address to read positions or history.

In React, mount `useWatchMarketResult(pool)` or another pool-keyed watch hook
alongside `useLiveBinaryOrderBookByMarket(marketId)` when the selected market is
not yet in the live store. The market-scoped hook can watch the pool itself only
after the market is known; it keeps an older market's book empty after recycle.
`useLiveBinaryOrderBook(pool)` and `useLiveMarketByPool(pool)` describe the
current occupant. Pool-keyed `useLiveFills(pool)` and
`useLiveUserOrders(pool, account)` can include activity from successive markets.
Discovery and history come from the indexer tier:
`listLiveBinaryMarkets()` / `listPastBinaryMarkets({ limit, offset })` for the
market lists, `getCandles(pool, interval)` for charts, `getPortfolio(account)` (trades
default to the last seven days — `tradesSince` echoes the bound; pass `since` to widen)
for a wallet's positions + orders + trades in one round-trip.

To start a selected binary book when the indexer is down, pass
`chainSeedPools={[{ chainId, pool }]}` to `SomniaMarketsProvider`. Every
pool-watching hook under that provider uses the same chain seed policy, even
when a child hook mounts first. The provider reads the pool's current market
binding from chain and requires `addresses.binaryModule` on that chain's client.
Set this list before mounting the provider; remount to change it. Unlisted spot
and funding pools retain their normal indexer seed. Read `usePoolSeedStatus(pool)`
for that pool's `seedSource` and `fillsLoaded`: a chain-seeded book can be live
while fill history remains unloaded. Discovery, candles, portfolio and other
indexed history still need the indexer.

`listLiveBinaryMarkets()` with no argument returns every live market; pass a
filter to narrow (all fields optional, applied server-side):

```ts
await client.listLiveBinaryMarkets(); // all live markets
await client.listLiveBinaryMarkets({ operatorId: 1 }); // one operator's live board
await client.listLiveBinaryMarkets({ venueId: "0x5bc0…", asset: "BTC", intervalSec: 900 });
await client.listLiveBinaryMarkets({ status: "Trading" }); // active only
```

(`operatorId` is the uint32 operator id; `venueId` is the venue's opaque
bytes32 hex id — enumerate the pairs in play with `listBinaryVenueIds()`.)
For the underlying-asset universe and board size, use
`listBinaryAssets()` (the distinct assets with markets, e.g. `["BTC","ETH"]`)
and `countBinaryMarkets({ operatorId?, venueId?, asset?, status?, phase? })` (the total
behind a filtered board, for pagination headers; `phase` splits live from past,
and omitting it counts both). The same filter carries `resolvedSince` and
`voided`, so `countBinaryMarkets({ venueId, resolvedSince: now - 86_400 })` and
the same call with `voided: true` are a venue's settlement count and void count
over the trailing day — keyed on the terminal timestamp, so a void before
expiry counts too.
Each row carries `marketAddress`, `poolAddress`, `operatorId`, and `venueId`,
so a multi-venue UI can group the live board by origin without any
contract-level call — market discovery is the indexer's job, not the
MarketCreator's.

One correctness rule: **gate writes on the selected market's live or on-chain
status, never indexer status**. `getMarketOnchain(marketId).status` is a
market-scoped chain read; `marketId` is the selected market's bytes32 id. Use
the status from `getLiveMarketByPool(pool)` only after checking that the live
row's `id` matches the selected market id. The pool can host another market
after recycling, and indexed status lags.

### An account's positions, complete and live

`client.accountOutcomePositions` gives one account's complete event-contract positions on
the client's chain: every YES and NO balance it holds, including markets it never traded
through your app. On an exchange, use `exchange.engineFor(chainId).accountOutcomePositions`.

```ts
const stop = client.accountOutcomePositions.subscribe(account, (view) => {
  if (view.status === "ready") render(view.data.positions);
  else if (view.status === "unavailable") renderUnknown(view.reason);
});
```

- `getSnapshot(account, { signal })` reads the view once. Concurrent snapshot callers
  for one account share a read with independent cancellation; a ready live view is
  reused without a request. `subscribe(account, onView)` keeps it current and
  returns a function that stops it. Subscriptions to one account
  share one reader. After the last unsubscribe, it remains active for 30 seconds
  so a returning subscriber can reuse it. Successful reads poll the account's
  version every 5 seconds and reread the guarded snapshot when it changes.
  Recoverable failed reads retry after 5, 10, 20, 40, then 60 seconds, capped at
  60 seconds. An `unavailable` capability is checked every 5 minutes over HTTP;
  this view has no capability subscription, so deployment recovery can take that
  long to be detected. Recovery restores the 5-second cadence. Held data's
  clock-derived market status is checked every 5 seconds during backoff.
  `tooLarge` continues version polling without rereading unchanged oversized rows.
  `stopLive()` and owner cancellation end every reader immediately, including
  during reuse. Active subscribers receive `closed`, with no later view.
  `stopLive()` ends a snapshot read in flight with `IndexerUnavailableError`
  (`live-reset`); caller cancellation retains the caller's abort reason.
- Each position has the market id, the side, the balance, the market's status and
  `claimable`: `unsettled` until the market is finalized, then `known` with the amount
  the balance redeems for, net of the settlement fee. A voided market pays its stored
  share for each side, which is not always a half.
- **`unavailable` means unknown, not empty.** Until the indexer enables this view on a
  chain, every read there is `unavailable`. Do not render it as "no positions". `getPortfolio`
  is a partial fallback: it returns at most 200 balances and does not say when it cut the list.
- `tooLarge` means the account holds more positions than a view can prove complete, or
  its response exceeds the indexer's byte limit.
- A read that fails throws from `getSnapshot`. A live view reports it as `failed`, or
  as `stale` with the last complete data. A failed view's `retrying` field says
  whether another read is planned. A missing indexer endpoint is terminal
  (`retrying: false`); configure an endpoint on a new owner to recover.
- Mark price and PnL are not in the view. Use `getOpenPositionsWithPnL` for those.

### History + attribution (indexer)

Beyond the live board and portfolio, the indexer serves the fee, resolution,
router, and vault-credit history the live tail doesn't materialize — all
one-shot reads:

```ts
// How a market resolves: lifecycle events + the oracle reference link + the
// posted numeric oracle answer (joined by oracleQuestionId), in one round-trip.
const { events, reference, oracleAnswer } = await client.getMarketResolution(marketId);

// Router-level collateral flow for a wallet (redeem / mint / merge complete set),
// attributed to the TRUE end user even through the native/Permit2 periphery.
const actions = await client.getRouterActions(account, { market, limit: 50 });

// The per-fill fee streams behind getMarketFees' running total (all filter by
// `payer` — the order owner who funded the fee — plus recipient/market/pool).
const protoFees = await client.listProtocolFees({ market, payer });
const bldFees = await client.listBuilderFees({ builder });
const settleFees = await client.listSettlementFees({ market });

// Builder-approval directory (the indexed complement to the on-chain point read
// getBuilderApproval) — every user→builder cap, filterable by user or builder.
const approvals = await client.listBuilderApprovals({ user });
```

**Vault credits.** A payout that can't be delivered to the wallet is credited to
the owner's `ERC20Vault` balance instead. That history is append-only —
`client.getVaultPayoutFallbacks(owner, { token })` lists the credit log for one
owner, and `client.listVaultPayoutFallbacks({ pool, from, order: "asc" })` lists
it across every owner (an operator's alert or reconciliation reads it that way).
Each row carries the `pool` whose vault holds the credit — but the vault's own
credit/debit is silent (no event), so the **live claimable balance is a chain
read**: `client.getVaultBalance({ vault: pool, owner, token })`
(`ERC20Vault.getWithdrawableBalance`). Withdraw with
`trader.withdrawVault({ vault, token, amount })`.

## Trading

```ts
const trader = client.createTrader({ privateKey }); // Node — or { walletClient } in the browser
const decimals = market.quoteDecimals; // indexed binary market's collateral scale

// Rest a limit order: buy 10 YES at 0.62.
const { orderId, fills, receipt } = await trader.placeOrder({
  pool: market.poolAddress,
  side: "BUY_YES",
  price: probabilityToPrice(0.62, decimals), // raw collateral units per whole token
  quantity: fromHuman(10, decimals), // raw outcome-token units
});
if (fills.length) console.log("crossed immediately:", fills);
else console.log("resting as order", orderId);

await trader.cancelOrder({ pool: market.poolAddress, orderId });
```

For a chain-only market read, use `client.getMarketOnchain(marketId)` and its
`decimals` and `pool` fields. A binding without `indexerUrl` has no indexed
`quoteDecimals`. You can omit `indexerUrl` for chain-only reads and writes;
indexed discovery and history need an indexer.
[Networks and endpoints](./reference/networks-and-endpoints.md) lists the
hosted indexers.
That read uses six decimals only if the token lacks the `decimals()` view;
other read failures throw. Verify a non-standard token's scale before writing.
The SDK helpers also default to six decimals if you omit their `decimals` argument.

Every write **awaits its receipt** — there is no bare hash to babysit, and
`placeOrder` resolves with the decoded `orderId` + `fills` from the same
round-trip. The escrow token (collateral for buys, YES/NO for sells) is
approved automatically on first use; pass `autoApprove: false` to manage
approvals yourself.

- **Market orders** are `orderType: ORDER_TYPE.MARKET` (an IOC) placed at a
  crossing price — cross the best opposite level ± slippage so it sweeps and
  the remainder cancels. `ORDER_TYPE` also has `FILL_OR_KILL` and `POST_ONLY`.
- **Sides and prices:** all four `BinarySide`s take the YES-terms price. A
  `BUY_NO` at YES-price 0.62 escrows `quantity × (1 − 0.62)` collateral.
- Token wiring resolves from the pool contract automatically (cached); pass
  `outcomeToken`/`yesId`/`noId`/`collateral` explicitly to skip even that
  one-time read.

### Stake-sized market orders ("bet $50 on Up")

A stake-first UI usually asks for a **collateral stake**, not a share
quantity. `quoteBinaryStake` is the inverse of `quoteBinaryOrder`: it walks the
live asks cheapest-first, sizing the largest quantity whose escrow at the worst
level touched stays within the stake — so the quoted shares and payout match
what actually fills, not a top-of-book estimate. The protective limit is padded
with a slippage cushion (default 3%, min 10 ticks) so the IOC still crosses a
moving book, aligned to the pool's on-chain tick grid, and the quantity is
lot-aligned with escrow re-fit under the stake — off-grid prices and non-lot
quantities are the pool's two rejection reasons, handled for you:

```ts
const quote = await client.quoteBinaryStake({
  pool: market.poolAddress,
  side: "BUY_YES", // Up; "BUY_NO" for Down
  stake: fromHuman(50, market.quoteDecimals), // raw collateral — the max loss
});
if (quote) {
  await trader.placeOrder({
    pool: market.poolAddress,
    side: quote.side,
    price: quote.yesPrice, // protective limit, YES terms
    quantity: quote.quantity, // shares = payout if this side wins
    orderType: ORDER_TYPE.MARKET,
  });
}
```

`null` means nothing is fillable (empty book, or a stake too small for one
lot) — disable the control rather than sending a doomed order. Unwind a
position with the sell-side sibling, which cushions a floor below the best bid
the same way:

```ts
const sell = await client.quoteBinarySell({
  pool: market.poolAddress,
  side: "SELL_YES",
  quantity: position.balance, // lot-aligned down automatically
});
if (sell) {
  await trader.placeOrder({
    pool: market.poolAddress,
    side: sell.side,
    price: sell.yesPrice,
    quantity: sell.quantity,
    orderType: ORDER_TYPE.MARKET,
  });
}
```

Unlike the buy side, a sell's `quantity` is your position, not a book-sized
fit — on a thin book the IOC fills what rests within the cushion and cancels
the rest. Compare `sell.fillableQuantity` (with `sell.estProceeds`, the
collateral it would raise) against `sell.quantity` and warn before submitting
when the unwind would be partial.

Both quotes read the live book (needs an active watch) plus the pool's tick/lot
grid via one cached `eth_call` (`getBinaryBookParams`). The pure kernels —
`quoteBinaryStakeOverBook` / `quoteBinarySellOverBook` / `slippageForCrossing` —
are exported for callers that already hold a book.

### Builder / routing fees (optional)

A frontend that routes orders can attach itself to each order and charge a
per-order fee — but only after the trader has opted it in on that pool:

```ts
await trader.approveBuilder({ pool, builder, maxFeeBpsTimes1k: 5_000n }); // allow up to 5 bps; 0 revokes

await trader.placeOrder({
  pool,
  side: "BUY_YES",
  price,
  quantity,
  builder, // the routing/builder frontend
  builderFeeBpsTimes1k: 5_000n, // per-order fee, pool bps×1000 unit
});
```

A non-zero `builderFeeBpsTimes1k` without a prior approval reverts
`BuilderFeeExceedsCap` on a BinaryPool (`BuilderNotApproved` on a SpotPool,
`BuilderFeeExceedsApproval` on a PerpPool). The enforced ceiling is the
trader's approval clamped by the pool's protocol-wide cap — read it with
`trader.getEffectiveBuilderApproval({ pool, user, builder })` (the pool-wide
cap alone is `trader.getMaxBuilderFeeBpsTimes1k(pool)`). On the
exchange surface the same rides `createOrder`'s `params.builder` /
`params.builderFeeBpsTimes1k`, on binary, spot and perp alike — each pool holds
its own approval, so opt in once per pool.

### Complete sets and settlement

```ts
const amount = fromHuman(10, market.quoteDecimals); // raw collateral and outcome units
await trader.mintSet({ pool, amount }); // collateral → equal YES + NO
await trader.burnSet({ pool, amount }); // YES + NO → collateral back
await trader.redeem({ market: marketAddress, amount }); // winning token → collateral (post-resolution)

// A VOIDED market has no winner — both legs pay — so name the leg yourself.
// One entry per leg claims both in a single transaction:
await trader.redeemMany({
  entries: [
    { marketId, outcomeIdx: 0, amount: yesAmount },
    { marketId, outcomeIdx: 1, amount: noAmount },
  ],
});
```

`mintSet`/`burnSet` are how you take (or unwind) a both-sides position without
touching the book; `redeem` pays out after resolution (it looks up the winning
outcome on-chain if you don't pass it). That lookup is **resolution-only**: a
voided market has no winning outcome, so `redeem` throws unless you pass
`outcomeIdx` — it will not guess a leg for you, because on a void both legs are
redeemable and only you know which you hold. An unresolved market also throws;
the SDK reads the payout vector only after confirming resolution. If the venue
configured a settlement fee, the pool skims it ONCE from the whole winning backing at the
first winning redeem (`SettlementFeeCharged`) and every winner redeems for
`1 − fee` — voided markets refund both sides with no fee. Demo-stack extras:
`faucet()` mints the test collateral; `resolve`/`voidMarket` drive the
FakeOracle.

#### Unified exchange redemption

The exchange wrapper takes display units rather than raw token amounts. A
settled market is no longer in `fetchMarkets()` — a series market resolves,
finalizes and hands its pool to the next market — but `fetchBalance()` still
reports a holding on it under the market's own symbol, and that symbol still
resolves for `redeem`. Every pool-routed verb (`createOrder`, `mintSet`,
`burnSet`, the book, tape and ticker reads and watches) refuses a settled
market, because its pool now serves the successor.

`createOrder`, `mintSet` and `burnSet` also read the pool's current market
contract before funding or signing. A cached `Trading` row does not authorize
a write after its pool has moved to a successor. An observed mismatch throws
`InvalidInputError`; refresh with `loadMarkets(true)` and select the intended
market again. A failed check throws its `RpcError` or `ContractRevertError`
and sends nothing. The check uses one uncached pool read on the existing owner
connection and needs no module address. Recycling after this preflight read
can still race transaction execution. Historical `redeem` keeps using the
original market id.

On a resolved market, `redeem` selects the indexed winner:

```ts
const bal = await exchange.fetchBalance();
const winningAmount = bal[`${symbol}#YES`]?.total ?? 0;
if (winningAmount > 0) await exchange.redeem(symbol, winningAmount);
```

A voided market has no single winner. Pass the leg you hold and call once for
each leg you want to redeem:

```ts
await exchange.redeem(symbol, yesAmount, { outcomeIdx: 0 });
```

The SDK rejects a malformed or impossible final payout vector. Only an absent
vector on a legacy market uses the compatibility fallback.

### A maker loop, end to end

```ts
const watch = await client.watchMarket(pool);
const trader = client.createTrader({ privateKey });

client.subscribeLive(async () => {
  const book = client.getLiveBinaryOrderBook(pool, { depth: 1 }); // zero RTT
  const mine = client.getLiveUserOrders(pool, me, { limit: 50 }).filter((o) => o.status === "Open"); // zero RTT
  // decide → place/cancel; each write resolves after its receipt arrives
});
```

The live store is the only state a quoting loop needs: the book, your working
orders, and fills all update the moment the chain emits them.

Binary claimable reads inspect indexed outcome positions. `getClaimable(account)`
returns a complete array only when the account has at most 200 nonzero positions.
It throws `IncompletePortfolioError` for a larger wallet. Use
`client.getClaimablePage(account, { limit: 200, offset: 0 })` for bounded pages,
and follow `nextOffset` even when `claims` is empty. Losing and open positions
still count toward that offset. Each page detects continuation with one extra
position. Balance changes between pages can move rows; refresh indexed estimates
and confirm chain balances before redeeming.

`getPortfolio` accepts `positionsLimit` and `positionsOffset` for the same indexed
position pages. Check `positionsTruncated` and follow `positionsNextOffset`.
Other derived views that consume one portfolio page, including `fetchBalance`
and `getOpenPositionsWithPnL`, still cover only that page's binary positions.
