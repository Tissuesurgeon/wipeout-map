# Spot markets

A spot market is a plain base/quote order book on a `SpotPool` (e.g. SOMI/USDC)
— same OrderBook core as the binary pools, so the live machinery is identical;
only the semantics differ. This guide covers reading and trading spot; the
shared client mechanics (watches, read tiers, signers) are in
[the engine guide](./ENGINE.md).

## The mental model

- **Prices are quote-per-base.** Raw quote units per whole base token, scaled
  by the market's own `quoteDecimals`/`baseDecimals` (spot markets are NOT
  assumed 6dp — read the decimals off the `SpotMarket` row).
- **Two sides.** `isBid: true` buys base (escrows quote); `false` sells base
  (escrows base — or sends native SOMI as `msg.value` when `baseIsNative`).
  ERC-20 approval checks use `requiredAmount`, which is the pool's worst-case
  reserve including fee headroom. A native sell sends `delta`, which subtracts
  the owner's current vault balance from that reserve. Sending only the bare
  quantity can revert with `InvalidMsgValue` on a fee-bearing pool.
- **Book constraints.** Orders must respect the pool's `tickSize`, `lotSize`,
  and `minQuantity` (all on the `SpotMarket` row, kept live by the watch).
- **Mark price.** Pools publish a smoothed `markPrice` (streamed live via
  `MarkPriceUpdated`) — it's what stop orders trigger on, distinct from
  `lastPrice` (last fill).

## Reading

Discover markets first (indexer tier) — `listSpotMarkets` returns the board and
`getSpotMarket` resolves one by id; both yield the `SpotMarket` rows the live
reads key off:

```ts
const markets = await client.listSpotMarkets({ limit: 50 }); // SpotMarket[]; filterable (base/quote/…)
const spot = await client.getSpotMarket(id); // SpotMarket | null
```

```ts
const watch = await client.watchMarket(spot.poolAddress);

const book = client.getLiveSpotOrderBook(spot.poolAddress, { depth: 11 }); // { bids, asks }, best first
const tape = client.getLiveFills(spot.poolAddress, { limit: 40 });
const live = client.getLiveMarketByPool(spot.poolAddress); // markPrice, tick/lot, stats
```

React: `useLiveSpotOrderBook(pool)`, `useLiveFills(pool)`,
`useLiveMarketByPool(pool)` — all auto-watch while mounted. History and wallet
views come from the indexer tier: `getCandles(pool, interval)`,
`getSpotPortfolio(account)` (open orders + pending stops + the last seven days of
trades by default — `tradesSince` says which; pass `since` to widen), and
`getSpotStopOrders(account, { pool })`. Holdings are plain balances — read them
on-chain with `getErc20Balance` / `getNativeBalance`, not from the indexer.

## Trading

```ts
const trader = client.createTrader({ privateKey });

// Rest a limit bid: buy 5 base at 1.25 quote.
const { orderId, fills } = await trader.placeSpotOrder({
  pool: spot.poolAddress,
  isBid: true,
  price: parseUnits("1.25", spot.quoteDecimals),
  quantity: parseUnits("5", spot.baseDecimals),
  quoteToken: spot.quoteToken,
  baseToken: spot.baseToken,
  baseIsNative: spot.baseIsNative,
});

await trader.cancelOrder({ pool: spot.poolAddress, orderId }); // same core as binary
```

### Per-order fields: expiry, attribution, self-match, user data

`placeSpotOrder` takes these per-order fields as optional inputs. Each one has
an SDK default that keeps today's behaviour, so an existing call is unaffected:

```ts
await trader.placeSpotOrder({
  ...order,
  expireTimestampNs: BigInt(Date.now() + 86_400_000) * 1_000_000n, // default: ~50y (GTC)
  builder: "0xYourFrontend", // default: the zero address (no attribution)
  builderFeeBpsTimes1k: 25_000n, // default: 0
  selfMatchingOption: SELF_MATCHING_OPTION.CANCEL_MAKER, // default: CANCEL_TAKER
  userData: 7n, // default: 0 — an opaque tag, never interpreted
});
```

`placeSpotOrders`, `placeOrder` (binary), `placePerpOrder`, `amendOrder` and
`amendOrders` take the same `selfMatchingOption`, and the batch verbs take it
per request.

**Self-match.** A pool matches your incoming order against your own resting
order, and `selfMatchingOption` says which side loses. `CANCEL_TAKER` (0) drops
the rest of the incoming order and leaves the resting one on the book;
`CANCEL_MAKER` (1) cancels the whole resting order and lets the incoming one
continue. **The 0 is the SDK's default, not the pool's** — the pool reads the
value out of every order request and has no default of its own, so a raw
integration must pass it. Reach for `CANCEL_MAKER` when the new quote matters
more than the old one, such as re-pricing a ladder into your own resting rungs;
keep `CANCEL_TAKER` when a self-cross means you made a mistake and want the
order rejected. In a batch a `CANCEL_TAKER` self-match is one of the benign
non-placements: the rung reports `outcomes[i].success === false` rather than
taking the batch down.

**The ceiling.** A non-zero `builderFeeBpsTimes1k` must stay within
`trader.getMaxBuilderFeeBpsTimes1k(pool)`. Read that cap rather than assuming it: it is
owner-updatable on a SpotPool, and while it is 0 the pool rejects builder codes
outright, so the rail is off on that venue.

**The approval.** A non-zero fee also needs a prior
`trader.approveBuilder({ pool, builder, maxFeeBpsTimes1k })`. Spot pools
implement the same builder calls as binary ones, but **the approval is stored
per pool** — approving a builder on one pool grants nothing on another, and an
unapproved placement reverts `BuilderNotApproved`.

> **A past expiry reverts.** A placement whose `expireTimestampNs` is already
> behind the chain clock fails with `OrderAlreadyExpired`. Earlier protocol
> versions accepted it silently — the pool skipped the placement and returned no
> order id, so the transaction still succeeded — but it now rejects outright.
> The batch verb differs: `placeSpotOrders` rejects the offending request on its
> own rather than taking the whole batch down, so there you check
> `outcomes[i].success` — an already-expired expiry is one of the benign
> non-placements it reports.

> **Expiry does not refund by itself.** When a spot order lapses its escrow
> stays locked in the pool until someone sweeps it —
> `trader.cancelExpiredOrders({ pool, orderIds })` reclaims it, and is callable
> by anyone, not only the owner. Set an expiry deliberately.

Escrow is approved automatically (quote on buys, base on non-native sells;
native-base sells pay via `msg.value` instead). A **market order** is
`orderType: ORDER_TYPE.MARKET` with a crossing price — take the live book's
best opposite level ± slippage, tick-aligned, so it sweeps and the remainder
cancels:

```ts
const best = client.getLiveSpotOrderBook(pool, { depth: 1 }); // zero RTT, last-block fresh
const crossing = (best.asks[0].price * 10100n) / 10000n; // +1% slippage bound
```

### Amending a quote set

Re-pricing a ladder one order at a time costs two transactions per rung and leaves
the book briefly one-sided. `amendOrders` re-prices the whole ladder in a single
transaction:

```ts
const { newOrderIds } = await trader.amendOrders({
  pool: spot.poolAddress,
  amendments: [
    { oldOrderId: bid1, newOrder: { isBid: true, price: newBid1, quantity: qty } },
    { oldOrderId: bid2, newOrder: { isBid: true, price: newBid2, quantity: qty }, alwaysPlace: true },
  ],
});
```

`newOrderIds` is index-aligned with `amendments`. What an amend does depends on the
pool version:

- **Cancel-then-place pool:** every old order is cancelled before any replacement is
  placed, and each replacement gets a new id at the back of its queue. An
  all-or-nothing version reverts the whole batch at the first replacement it will not
  honour, so the book never sees a partial re-quote. A per-rung version applies the
  other amendments and leaves the rejected one without an order.
- **In-place pool:** each order is amended in one pass and keeps its id. It keeps its
  queue place when its price is unchanged and its quantity is not raised. A rejected
  amendment is left without an order.

A per-rung or in-place pool logs each rejection as
`AmendRejected(owner, oldOrderId, reason, requestIndex)`, and that amendment reads
`0n` in `newOrderIds`: it holds no order, so place it again. The one exception is an
amendment that repeats an `oldOrderId` an earlier amendment in the batch already
landed on; that order is live under the earlier amendment's id. Check every id for
`0n` before writing them back over your ladder.

`alwaysPlace` handles the race where the order you meant to amend already filled or
was cancelled. False (the default) reverts the batch with `AmendOldOrderGone` on an
all-or-nothing pool and skips that amendment (`0n`) on the others; true places the
replacement anyway (an in-place pool places it as post-only with `CANCEL_TAKER`,
whatever `newOrder` asks). It never tolerates an ownership failure — a live order
owned by someone else still reverts.

For ONE order, use `amendOrder` rather than a one-element batch:

```ts
const { newOrderId } = await trader.amendOrder({
  pool: spot.poolAddress,
  oldOrderId: bid1,
  newOrder: { isBid: true, price: newBid1, quantity: qty },
});
```

The difference is the error you get back. The singular raises the replacement's own
landing-time reason — `PostOnlyWouldCross`, `FillOrKillNotFillable` and friends —
where an all-or-nothing batch wraps it as `AmendReplacementRejected(requestIndex, reason)`
and the other batches return only a `0n` id. Everything else matches: same `alwaysPlace`
race rule (the singular always reverts `AmendOldOrderGone`), same queue rule, same
non-payable funding constraint.

To shrink an order **without** losing queue priority on any pool, use `reduceOrder`.

Three things to know before re-laddering with it:

- **Replacements are not shielded from each other.** On a cancel-then-place pool,
  cancelling all the old orders first protects a replacement from the order it
  replaces — but not from the _other_ replacements in the same batch. If a new bid
  crosses a new ask, `CANCEL_TAKER` (the SDK's default when you omit
  `selfMatchingOption`) rejects it. An all-or-nothing pool then reverts the whole
  re-ladder; a per-rung pool leaves that rung empty. An in-place pool rejects an
  amendment whose new price would cross the book, including your own orders. Keep the
  new set uncrossed.
- **The failure names the rung.** An all-or-nothing pool reverts
  `AmendReplacementRejected(requestIndex, reason)`; a per-rung pool logs
  `AmendRejected(owner, oldOrderId, reason, requestIndex)` and returns `0n` at that
  index; an in-place pool does the same. `requestIndex` is the position in your `amendments` array and `reason` is the
  pool's `uint8` rejection code (the SDK does not export a name table for it).
  `AmendOldOrderGone` is a different, earlier failure from the cancel leg.
- **Approve the escrow first.** Unlike `placeSpotOrder`, `amendOrders` does not
  auto-approve. On an auto-pull pool the cancel leg returns the freed tokens to your
  wallet and the place leg pulls them back, which needs an allowance — so a trader
  whose _first_ call is `amendOrders` hits `ERC20InsufficientAllowance`. Place once
  (or approve manually) before amending.

**Not for BinaryPools** — amend places, and binary pools reject generic placement
with `UseBinaryPlacement`. Spot and perp only. Note that error is what you hit on a
_live_ binary market; a locked one reverts `TradingNotActive` and a malformed
replacement reverts on validation first, so don't branch on `UseBinaryPlacement`
alone to detect the wrong pool kind.

### Batches — place a ladder, pull a ladder

Market making means many orders at once. `placeSpotOrders`, `cancelOrders` and
`reduceOrders` each do a whole ladder in ONE transaction instead of a loop of
sends:

```ts
// Place a three-rung sell ladder.
const placed = await trader.placeSpotOrders({
  pool: spot.poolAddress,
  quoteToken: spot.quoteToken,
  baseToken: spot.baseToken,
  orders: [1.01, 1.02, 1.03].map((p) => ({
    isBid: false,
    price: parseUnits(String(p), spot.quoteDecimals),
    quantity: parseUnits("1", spot.baseDecimals),
  })),
});

// outcomes is index-aligned with `orders`; a rung that did not place is
// success:false (e.g. a PostOnly that would have crossed), NOT an error.
const ids = placed.outcomes.flatMap((o) => (o.success ? [o.orderId!] : []));

// Pull what is left. Best-effort: an id that filled meanwhile is skipped, so
// the other rungs still come off the book.
const pulled = await trader.cancelOrders({ pool: spot.poolAddress, orderIds: ids });
const skipped = pulled.outcomes.filter((o) => !o.cancelled).map((o) => o.orderId);
```

Three things to know before using them:

- **They are non-payable.** Unlike `placeSpotOrder`, a batch sends no
  `msg.value`, so a **native-base sell** funds from the pool's vault balance —
  pre-deposit native to the vault first. ERC-20 auto-pull works normally, and the
  batch approves each escrow token once for the whole batch's total.
- **`placeSpotOrders` is spot-only.** Binary pools reject generic placement with
  `UseBinaryPlacement` (the YES/NO kind must be explicit) — use `placeOrder`
  there. `cancelOrders` and `reduceOrders` are inherited from the shared order
  book, so they work on binary pools too.
- **Cancel is best-effort, reduce is atomic.** A stale id in `cancelOrders` is
  skipped; a single invalid reduction in `reduceOrders` reverts the whole batch.
  A cancel `false` says the id emitted no event — it does not say _why_, so a
  benign fill race and a wrong id look the same.
- **Every per-order field is per rung.** `orderType`, `expireTimestampNs`,
  `selfMatchingOption`, `userData`, `builder` and `builderFeeBpsTimes1k` are read
  off each request, so a ladder can attribute one rung to a builder and leave the
  next unattributed. A rung that omits a field gets the same default the single
  verb applies.
- **Tag rungs with `userData` if exact attribution matters.** Outcomes are
  matched to requests on every field the `OrderPlaced` event echoes (side,
  price, quantity, userData, expiry). Two byte-identical adjacent rungs with
  different outcomes are indistinguishable from logs — the earlier index gets
  the credit; a distinct `userData` per rung removes the ambiguity.
- **Read the tag back from the indexer.** `getOpenOrders` and `getOrders` return
  each row's `userData`, and `OrdersOptions.userData` filters on it, so a client
  can ask for the orders it tagged instead of keeping its own id map. The column
  is not indexed: pair the tag with `pool`/`pools` and a status to keep the scan
  small.

### Stop orders

Spot pools with a `stopRegistry` support stop-loss / take-profit orders that
rest OFF the book and fire when the **mark price** crosses the trigger:

```ts
await trader.placeSpotStopOrder({
  registry: spot.stopRegistry,
  pool: spot.poolAddress,
  isBid: false, // sell when the market drops…
  quantity: parseUnits("5", spot.baseDecimals),
  triggerPrice: parseUnits("1.10", spot.quoteDecimals),
  triggerOperator: 1, // 1 = LTE (mark ≤ trigger), 0 = GTE
  stopOrderType: 1, // 1 = MARKET at trigger, 0 = LIMIT (needs limitPrice)
  quoteToken: spot.quoteToken,
  baseToken: spot.baseToken,
  baseIsNative: spot.baseIsNative,
});

await trader.cancelStopOrder({ registry: spot.stopRegistry, orderId });
```

Under the hood the first stop order per account performs a one-time operator
approval (so the registry may place the triggered order for you), funds the
trigger gas with a small SOMI payment (`msg.value`, refunded on cancel), and
ensures the pool can pull the escrow at trigger time — including pre-loading
the pool vault for native-base sells. The SDK handles all of it; list pending
stops with `getSpotStopOrders(account, { pool })` and stream their market
context via the watch.

A listed spot stop has no limit price: a LIMIT stop's limit price can't be read
back after placement. Show it as unknown, never as zero, and keep the value you
submitted if you need to display it.
