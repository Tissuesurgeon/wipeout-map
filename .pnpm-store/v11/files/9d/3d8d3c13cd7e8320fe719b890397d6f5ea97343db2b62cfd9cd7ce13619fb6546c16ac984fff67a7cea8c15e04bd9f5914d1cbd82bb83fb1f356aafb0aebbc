# How to follow an account's open orders

This guide shows you how to show one account's complete open orders and pending stops, and how to keep them current. It also shows how to tell a complete view from an empty or out-of-date one. It uses `client.accountOrders`, which reads the indexer's account view. It assumes a configured `SomniaMarkets` instance with an absolute `indexerUrl`.

## Read the account once

`getSnapshot(account)` reads the account at one version. Use it for a single read, for example on a server.

```ts
const snapshot = await exchange.client.accountOrders.getSnapshot(account);
switch (snapshot.status) {
  case "ready":
    console.log(snapshot.data.orders.length, "orders at block", snapshot.data.version.blockNumber);
    break;
  case "unavailable":
    console.log("no account view on this network:", snapshot.reason, snapshot.detail);
    break;
  case "tooLarge":
    console.log("more", snapshot.collection, "than a view holds:", snapshot.capacity);
    break;
}
```

`unavailable` means that the indexer does not serve the view on this network. `tooLarge` means that the account holds more than a view can prove complete. Neither result is an empty account. For both, keep the order reads that you use today.

`getSnapshot` throws when a read does not complete. `accountViewFailureReason(error)` gives the error's code, which is the same code that a failed live view carries.

## Follow the account live

`subscribe(account, onView)` gives you a new complete view each time that the account changes. It returns the function that stops the view.

```ts
const stop = exchange.client.accountOrders.subscribe(account, (view) => {
  switch (view.status) {
    case "loading":
      showLoading();
      break;
    case "ready":
    case "stale":
      showOrders(view.data, view.status === "stale");
      break;
    case "failed":
      showError(view.reason, view.retrying);
      break;
    case "unavailable":
    case "tooLarge":
      useOtherReads();
      break;
    case "closed":
      break;
  }
});
// When the screen closes:
stop();
```

The view starts as `loading`. It becomes `ready` when the SDK accepts the first snapshot. Then each change that the indexer publishes for the account gives a new `ready` view. Changes that arrive together give one view.

When the live connection breaks, the view becomes `stale` and keeps its last complete data. The SDK then reads a new snapshot. A `failed` view has no data. The SDK tries again, unless `retrying` is `false`. The SDK also watches an `unavailable` or `tooLarge` view, and reads the account again when the result can change.

The indexer's changes reach the view a few seconds after their block. The stops do not wait for them: the SDK also follows every stop registry's events over the chain socket, so a TP/SL the account creates, links, unlinks or cancels, or that fires, shows within a block or so. While the view holds such a change and the indexer's version is behind it, `data.sync.chainStopsBlock` names its block. A stop created on chain shows `pending` values until the SDK reads them. The open orders stay the indexer's; for spot orders and perp orders at chain speed, see [Follow the account's spot orders](#follow-the-accounts-spot-orders) and [Follow the account's perp positions](#follow-the-accounts-perp-positions).

A view arrives one microtask after the SDK makes it, and never during the `subscribe` call. All listeners of one account share one session. When the last listener stops, the session stays for 30 seconds, so a screen that comes back uses it again.

## Tell complete from current

A `ready` view is complete at `data.version`. It contains every open order and pending stop that the account had at that version, and nothing else. It does not tell you how far the indexer is behind the chain.

- `data.version.blockNumber` is the block of the newest account change that the view contains.
- `data.sync.caughtUp` is `false` when the SDK knows about a newer version that it did not apply yet.
- `data.sync.chainStopsBlock` is set when a live view's stops hold changes from the chain that are newer than its version. A snapshot that `getSnapshot` reads has the indexer's stops at its version. When a live view of the account is `ready`, `getSnapshot` returns that view, its chain changes included.
- A `stale` view shows the account as it was at `data.version`. Show it as out of date.
- The view does not contain orders that expire before `data.expiryCutoffNs`. Expiry uses the clock of this machine. A live view removes an order when the order expires.

## Check what the view covers

A missing order is absent only when the view covers the source of that order. `data.coverage` tells you what the view covers.

```ts
function coversEventContracts(data: AccountOrdersData): boolean {
  return data.coverage.kind === "known" && data.coverage.families.includes("BINARY_ORDER");
}
```

`coverage.families` lists the source families that the view covers, for example `"SPOT_ORDER"` and `"PERP_STOP"`. `coverage.exclusions` lists the parts of those families that the producer leaves out. When `coverage.kind` is `"unknownManifest"`, this SDK version does not know the producer's manifest, so the view cannot tell you what it covers.

## Read the venue and limit price of a stop

No indexer event carries the venue or the limit price of a stop, so the SDK reads them. In a live view, `venue` and `limitPrice` are `pending` until those reads finish, and a later view carries the values. A value that the SDK cannot read is `unknown` with a reason. It is never zero. When a read fails, a live view reads the value again up to three times, after a backoff.

```ts
function limitPriceText(stop: AccountStop): string {
  switch (stop.limitPrice.status) {
    case "known":
      return stop.limitPrice.value.toString();
    case "notApplicable":
      return "market";
    case "pending":
      return "reading";
    case "unknown":
      return `unknown (${stop.limitPrice.reason})`;
  }
}
```

## Set the WebSocket endpoint

The live view uses the indexer's GraphQL WebSocket endpoint. The SDK makes it from an absolute `indexerUrl`: `https://dev.smk.somnia.host/v1/graphql` gives `wss://dev.smk.somnia.host/v1/graphql`. When `indexerUrl` is a relative path, set `indexerWsUrl`.

```ts
const browserExchange = new SomniaMarkets({
  chain: somniaTestnet,
  indexerUrl: "/api/indexer/v1/graphql",
  indexerWsUrl: "wss://dev.smk.somnia.host/v1/graphql",
});
```

Without a WebSocket endpoint, `subscribe` throws `NotConfiguredError`. The live view never sends `indexerHeaders`.

## Follow the account's perp positions

`client.accountPositions` gives one account's open perp positions and its margin in one MarginBank. It reads the chain, not the indexer, so it works on every network today. Pass the MarginBank the perp market rows name.

```ts
const stopPositions = exchange.client.accountPositions.subscribe(marginBank, account, (view) => {
  if (view.status !== "ready" && view.status !== "stale") return;
  for (const position of view.data.positions) {
    const pnl = position.marks.status === "known" ? position.marks.unrealizedPnl : null;
    showPosition(position.pool, position.size, pnl, view.status === "stale");
  }
});
// When the screen closes:
stopPositions();
```

Every view is read at one block, `data.blockNumber`. After the first read, the Somnia node pushes the same read to the SDK (`somnia_watch`), run at the block of each change:

- when the MarginBank emits an event that names the account, such as a fill or a deposit;
- on every price write while the account holds positions, because the marks, PnL and liquidation prices move with the price.

The price trigger needs the price feed's address in the configuration, `addresses.priceFeedScheduler`. The Shannon and Hideki address constants set it. Without it, the marks follow a read every 5 s. While the account holds positions and no push arrives for 5 s, the SDK reads the account itself. A node that does not push, such as a local node, leaves the SDK on its own reads: at once on the account's events, and every 5 s while it holds positions.

A figure the chain cannot give is `unknown` with a reason, never zero. When a pool's price feed is stale, its position stays in the list with `marks.status` set to `"unknown"`. While any market the account holds cannot be priced, the account's health, and so every liquidation price, is unknown.

The view also holds the account's resting perp orders, `data.orders`, read at the same block: every order in every pool the MarginBank lists, a pool with only orders included. Fills and cancels arrive in the push. A new order costs one full read, and whenever the orders change, the push opens again for them with one more read. The orders are `unknown` when one pool's could not be read, and the positions still stand. A pool keeps an order until it fills or someone cancels it, an expired one too, so compare `expireTimestampNs` with the time to tell an order that can still fill.

An in-place perp amendment can change the pool order without changing its
collateral reservation. Such an amendment emits `OrderAmendedInPlace` from the
pool but may emit no MarginBank event naming the account. This view does not
subscribe to pool order events. With open positions, the next configured price
push or a five-second inactivity read picks up the change. An account holding
only resting orders has no periodic read, so it can keep the old price, size or
expiry until another account event or a session restart causes a read. A ready
live `getSnapshot` reuses that view and does not force a refresh.

`getSnapshot(marginBank, account)` makes the same read once. When a live view of the account is `ready`, it returns that view without a read. A read that finishes after the live view has moved past it hands back the live view, so a snapshot is never older than what the view's listeners already have. `client.accountOrders`, `client.accountSpotOrders` and `client.accountBalances` follow the same rule.

## Follow the account's spot orders

`client.accountSpotOrders` gives one account's resting spot orders. It reads the orders from chain and discovers pools through the configured indexer. On a client with a chain socket, order events trigger a read of the affected pool.

```ts
const stopSpotOrders = exchange.client.accountSpotOrders.subscribe(account, (view) => {
  if (view.status !== "ready" && view.status !== "stale") return;
  for (const order of view.data.orders) {
    showOrder(order.pool, order.isBid, order.price, order.quantityRemaining, view.status === "stale");
  }
  // A pool the SDK could not read: its orders are unknown, not absent.
  for (const { pool, error } of view.data.unreadPools) showUnreadPool(pool, error);
});
// When the screen closes:
stopSpotOrders();
```

The chain keeps no list of the pools an account trades in, so the SDK asks every spot pool that the indexer's market list names. Each pool keeps its own list of the account's open orders: that is one call per pool, sent as the account, then one Multicall3 call for the orders' details. The first read, and `getSnapshot`, read every pool at one block, `data.blockNumber`. The orders a read found ride the next read's first round.

After the first read, the SDK subscribes over the chain socket to two kinds of event, and when one of them concerns the account, it reads again at once the pool that emitted it:

- every placement in every spot pool, because only the placement names its owner. The SDK keeps the account's own;
- the later events of the account's own orders, which name only order ids: a fill, cancel, expiry, reduce or amend, including an in-place amend that keeps the order id. The node sends only these, for the ids the SDK names.

So the socket carries the spot pools' placements and the account's own order events, not the rest of the order flow. When the account gains an order, the subscription opens again with its id, and the old one stays until the node confirms the new one. Past 1,000 orders the subscription follows every order event of the spot pools instead.

The other pools keep their last read, because no event says they changed, so `data.blockNumber` is the newest block the view read. A read that lands before the block of the event that asked for it reads that pool again. The SDK also reads every pool once the node confirms a subscription, because a change before that reached neither, and 30 s after it last read them all, so a subscription that stops without an error costs at most that. A lost subscription gives `stale`, and the SDK subscribes again after a backoff and reads every pool once the node confirms it.

A pool whose orders cannot be read is in `data.unreadPools`, with its error, and its orders are missing from `data.orders`: they are unknown, not absent. `data.complete` is `false`, and a live view reads that pool again after a backoff while the other pools stay live. A read that can read no pool, or not even the head, fails: `getSnapshot` throws, and a live view keeps its last data as `stale`. A pool keeps an order until it fills or someone cancels it, an expired one too, so compare `expireTimestampNs` with the time.

Each full refresh discovers the pool list again. Discovery that fails or returns an unproven empty list does not erase known orders. `getSnapshot` throws an `IndexerError`; a live view keeps its orders and subscriptions as `stale`, with `data.complete` set to `false`. Check `data.complete` even when `data.unreadPools` is empty: discovery coverage can still be unknown. Pool-specific event reads keep updating known orders during discovery loss, but only successful full discovery can restore complete coverage. An empty indexer list alone does not prove that the chain has no spot pools. Discovery requests follow caller cancellation and the owner's live-read lifecycle.

Resting perp orders are on `client.accountPositions`, in `data.orders`, and pending stops (TP/SL) are on `client.accountOrders`.

## Follow the account's wallet balances

`client.accountBalances` gives the wallet balances of one or more accounts: an ERC-20 balance for each token address you pass, and the native balance for `"native"`. It reads the chain, not the indexer.

```ts
const stopBalances = exchange.client.accountBalances.subscribe([account], [usdso, "native"], (view) => {
  if (view.status !== "ready" && view.status !== "stale") return;
  for (const entry of view.data.balances) {
    const value = entry.balance.status === "known" ? entry.balance.value : null;
    showBalance(entry.token, value, view.status === "stale");
  }
});
// When the screen closes:
stopBalances();
```

Every view is read at one block, `data.blockNumber`: in one Multicall3 call, or, on a chain without Multicall3, one call per balance at that block, the native balance through `eth_getBalance`. The SDK reads again at once when one of the tokens emits a `Transfer` from or to one of the accounts. It also reads again every 10 s, because a native balance changes with no event, for example when the account pays gas.

Balances are raw base units; scale them with each token's decimals. A balance the chain cannot give is `unknown` with its error, never zero. `getSnapshot(accounts, tokens)` makes the same read once, for at most 1,000 balances.

Concurrent snapshots and live listeners for the same account/token sets share
work within one owner, regardless of order, duplicates, or use of `"native"`
instead of `NATIVE_TOKEN_SENTINEL`. Each caller's view keeps its requested order,
duplicates, and native-token labels. Canceling one `getSnapshot` caller with
`{ signal }` does not cancel another caller of the shared read. A live session
remains for 30 seconds after its last listener stops. `stopLive()` or owner
cancellation ends it immediately, including during that reuse period.

## Stop every live view

`exchange.client.stopLive()` ends every live view, of orders, spot orders, positions and balances, with a `closed` view, and closes the indexer WebSocket. After that, a new `subscribe` call starts a new session.

An abort of the client's own `signal` ends them the same way, but for good: a later `subscribe` gets only a `closed` view, and a later `getSnapshot` rejects with the signal's reason.
