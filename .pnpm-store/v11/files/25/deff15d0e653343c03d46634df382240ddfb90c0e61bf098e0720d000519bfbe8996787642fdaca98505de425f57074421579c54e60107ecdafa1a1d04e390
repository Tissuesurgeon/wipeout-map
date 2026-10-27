# How to detect when an order fills

This guide shows you how to learn that a resting order was filled, partially filled, or cancelled, with the least latency and without polling. It assumes a configured `SomniaMarkets` instance with a signer, and a market watch opened before the order was placed.

## Read the placement result first

A `createOrder` that crosses the book fills in the same transaction. Its result already says so.

```ts
const order = await exchange.createOrder("SOMI/USDso", "limit", "buy", 10, 0.116);
if (order.status === "closed") {
  // fully filled in the placement transaction
} else if (order.status === "open") {
  // resting: order.filled may still be > 0 for a partial fill
}
```

`status` is `"closed"` when `remaining` is zero, `"open"` when a remainder rests, and `"canceled"` when an immediate-or-cancel or market order left an unfillable remainder. The raw fills are in `order.info.fills`.

## Wait for the status to flip

`watchOrders(symbol)` returns your orders on the market from the live store. The first call returns the current list; each later call resolves when the list changes. Loop until your order is no longer open.

```ts
let mine = order;
while (mine.status === "open") {
  const orders = await exchange.watchOrders("SOMI/USDso");
  mine = orders.find((o) => o.id === order.id) ?? mine;
}
console.log(mine.status, "filled", mine.filled, "of", mine.amount);
```

The list changes on every order event for your account on that market, including partial fills, so the loop also observes `filled` growing while `status` stays `"open"`.

Open the market watch before placing. `watchOrderBook`, `watchTrades`, or `watchOrders` on the symbol all open it. The watch learns about an order placed after it opened from the chain event, in the block the order lands. It learns about an order placed before it opened from the indexer snapshot, which lags the chain by the indexing delay, typically a few seconds.

## Watch your trades

`watchMyTrades(symbol)` returns your fills on the market, newest first, and resolves on each new one. Use it when you care about executions rather than order state, for example to update inventory.

```ts
let seen = new Set<string>();
while (true) {
  const trades = await exchange.watchMyTrades("SOMI/USDso", 20);
  for (const t of trades) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    console.log(t.datetime, t.side, t.amount, "@", t.price, "cost", t.cost);
  }
}
```

On spot and perp markets `side` is absent: the pools do not attribute a fill to a side in a way the SDK can map to you. Read `t.info.takerIsBid` and compare `t.info.maker` with your address instead. On binary markets `side` is your own side when the fill carries one.

## Use the engine for raw values

`exchange.client.getLiveUserOrders(pool, owner)` and `getLiveUserFills(pool, owner)` are the synchronous views behind the two verbs. They return `LiveOrder` and `LiveFill` rows with exact raw values as decimal strings; wrap a value in `BigInt()` to compute with it. The API reference lists the fields. Subscribe to changes with `client.subscribeLive(listener)`.

In React, `useLiveUserOrders` and `useLiveUserFills` re-render on the same changes. See [Use the React hooks](./use-the-react-hooks.md).

## Read your own writes at chain head

When a write threw `RpcError` after sending, or when no watch is open, ask the pool directly. These reads answer from the contract in one round-trip and know only what is open now.

```ts
const t = exchange.market("SOMI/USDso");
const owner = exchange.walletAddress;
if (!owner) throw new Error("configure a signer before reading your open orders");
const openIds = await exchange.client.getOwnOpenOrdersOnchain(t.pool, owner);
const stillOpen = openIds.some((id) => id.toString() === order.id);
```

`getOrderOnchain(pool, orderId)` returns one order's on-chain state. For history, including filled and cancelled orders, use the indexer reads `getOpenOrders`, `getOrders`, and `getOrderFills`; they lag the chain by the indexing delay.

## Read a maker order a fill already removed

Decoding `OrderFilled` yourself gives you the fill's `fillPrice`, `quantityFilled` and `makerRemainingQuantity`, but names the maker only by id - and a fill removes the maker order in the same transaction, so at head it is gone. Pin the read one block earlier to recover the side the fill took:

```ts
const maker = await exchange.client.getOrderOnchain(pool, makerOrderId, { blockNumber: fillBlock - 1n });
// `null` is an UNRESOLVED side, not a sell: an order placed and filled inside one
// block has no state one block earlier, and its side is in that block's OrderPlaced.
const takerBought = maker === null ? null : !maker.isBid;
```

What it answers, and what it does not:

- The maker's identity - `isBid`, `owner`, `userData`, `expireTimestampNs` - cannot change under a given id, so the pinned read is exact for it, and no fill log carries it: `OrderFilled` names the maker by id alone. `OrderPlaced` carries it, but only a consumer that was already listening when the maker rested has that log, which is the case this read exists for.
- **Not** the price. It is immutable too, but a fill executes at the maker's resting price and the book emits exactly that, so `OrderFilled.fillPrice` already is the maker's price. Reading for it is redundant work.
- **Both** quantities are the values at the **block boundary**, not at your fill. `quantityRemaining` moves on every fill, and `reduceOrder` decrements `fullQuantity` and `quantityRemaining` together under the same id - so an earlier transaction in the fill's own block makes either value stale for your fill, and no block-level read can see between transactions. Take `quantityFilled` and `makerRemainingQuantity` from the event instead.

Two edges answer plausibly rather than failing:

- A **partial** fill leaves the maker order in place with a smaller `quantityRemaining`, so reading at the fill's own block succeeds with different numbers instead of returning `null`.
- An order placed and filled inside **one** block does not exist at `fillBlock - 1n`. That read is `null`, and the placement is in the same block's `OrderPlaced`.

A recent block answers against a full node. An older one needs archive state, so this suits a live tape rather than a backfill.

## Choose by need

| Need                                      | Use                            | Latency        |
| ----------------------------------------- | ------------------------------ | -------------- |
| Did the placement itself fill             | `createOrder` result           | none           |
| Did a resting order change                | `watchOrders`                  | next block     |
| What executed, for inventory              | `watchMyTrades`                | next block     |
| Is it still open, after a transport error | `getOwnOpenOrdersOnchain`      | one round-trip |
| Full history for a report                 | `getOrders`, `getOrderFills`   | indexing delay |
| Resume from where you stopped             | `getUserFills({ sinceBlock })` | indexing delay |
| Keep an account's whole history current   | `getUserFillHistory`           | indexing delay |
| Every fill of a kind in a block range     | `getFillsPage`                 | indexing delay |

## Resume from a block

`getUserFills`, `getFills`, `countUserFills` and `getUserFillsPage` take `sinceBlock` and `toBlock`, the source block of the fill. Both bounds include their block. Pass one more than the last block you processed to avoid reading it again. Do not resume with the `since` timestamp: two blocks can carry the same second, so a seconds bound repeats rows or skips them.

`getOrderFills(pool, orderId, { limit })` is different: it returns the bounded whole fill history for one known order, accepts only `limit`, and does not take `sinceBlock`. Use `getFills` to resume a pool tape or `getUserFills` to resume an account tape.

```ts
const page = await exchange.client.getUserFills(owner, { sinceBlock: BigInt(lastProcessedBlock) + 1n });
```

## Walk the whole venue by block range

`getUserFills` and `getFills` resume ONE account or ONE pool. A published feed needs every fill of a market kind, across every pool, in a range of blocks. `getFillsPage` answers that, and `getLatestFillBlock` says how far the fill data reaches.

```ts
const head = await exchange.client.getLatestFillBlock("SPOT");
if (head === null) return; // nothing traded yet
if (head.blockNumber <= BigInt(lastProcessedBlock)) return; // caught up: no new range
let cursor: string | undefined;
do {
  const page = await exchange.client.getFillsPage({
    marketType: "SPOT",
    sinceBlock: BigInt(lastProcessedBlock) + 1n,
    toBlock: head.blockNumber,
    cursor,
  });
  for (const fill of page.fills) console.log(fill.blockNumber, fill.logIndex, fill.quantity);
  cursor = page.nextCursor ?? undefined;
} while (cursor !== undefined);
```

Both bounds include their block, and rows arrive oldest first by `(blockNumber, logIndex)`. That pair is a total order over the fill table, so `[a, b]` followed by `[b + 1, c]` reads every fill exactly once. Pages hold 500 rows by default. Drain a range until `nextCursor` is null; a null cursor means this read saw no further row IN THE RANGE, not that indexing is complete.

Take the upper bound from `getLatestFillBlock` rather than from the chain head. It reads the fill data itself, so it never names a block the range read cannot yet serve. It returns `null` while no fill of that kind is indexed.

The cursor binds the chain, the endpoint, the kind and both bounds. A cursor from one range is refused by another, so a range cannot be continued into a different one by accident.

All amount fields on `FillRow` stay as raw decimal strings. Do not route a published feed through the human-unit market reads: those convert through `Number()`.

## Bounds on the order reads

`getOrders` and `getOpenOrders` take `sinceBlock` as well, but it bounds the block the order was PLACED in. A later fill, reduction or cancellation of an older order does not select that order. An amend places a replacement under a new id, so the replacement is selected when its placement block meets the bound; the older order is not.

For an order placed before the bound, a fill read recovers only its executions. It does not report a reduction or cancellation that produced no fill. Keep `watchOrders` active for those changes. After reconnecting, use `getOrder(pool, orderId)` to reconcile the indexed lifecycle of each known order, or use `getOrderOnchain(pool, orderId)` when only current active state is required.

Wait for the indexer to reach the block first with `client.waitForIndexedBlock(chainId, block)`; it resolves when the indexer has processed it.
