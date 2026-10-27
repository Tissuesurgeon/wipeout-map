# How to run a quoting loop

This guide shows you how to keep a two-sided quote on a spot market from a Node bot: read the live book, place a bid and an ask, re-quote when the market moves, and cancel everything on exit. It assumes a configured `SomniaMarkets` instance with a `privateKey` and funds on the market (see [Get testnet funds](./get-testnet-funds.md)). The example quotes `SOMI/USDso` on the Shannon testnet.

## Open the watch before you quote

`watchOrderBook` opens the market watch on its first call and returns the current book. Every later call resolves when the book changes. Open it once before the loop so your own orders show up in `watchOrders` the moment they land.

```ts
const symbol = "SOMI/USDso";
await exchange.loadMarkets();
let book = await exchange.watchOrderBook(symbol, 1);
```

## Quote around the mid

Use the exchange verbs for a simple loop. `createOrder` aligns price and amount to the market's tick and lot grids and echoes the aligned values, so compute freely and read the result.

```ts
import { ContractRevertError } from "@somnia-chain/markets-sdk";

const size = 5; // SOMI per side
const spread = 0.002; // 0.2 % each side

let bidId: string | undefined;
let askId: string | undefined;
let running = true;

function isPostOnlyWouldCross(error: unknown) {
  return error instanceof ContractRevertError && error.errorName === "PostOnlyWouldCross";
}

async function cancelIfResting(orderId: string) {
  try {
    await exchange.cancelOrder(orderId, symbol);
  } catch (error) {
    if (error instanceof ContractRevertError && error.errorName === "IncorrectSender") return;
    throw error;
  }
}

async function requote(book: Awaited<ReturnType<typeof exchange.watchOrderBook>>) {
  const bestBid = book.bids[0]?.[0];
  const bestAsk = book.asks[0]?.[0];
  if (bestBid === undefined || bestAsk === undefined) return; // one-sided book: skip this tick
  const mid = (bestBid + bestAsk) / 2;

  if (bidId) {
    const previousBidId = bidId;
    await cancelIfResting(previousBidId);
    if (bidId === previousBidId) bidId = undefined;
  }
  if (askId) {
    const previousAskId = askId;
    await cancelIfResting(previousAskId);
    if (askId === previousAskId) askId = undefined;
  }
  if (!running) return;

  let bid: Awaited<ReturnType<typeof exchange.createOrder>>;
  try {
    bid = await exchange.createOrder(symbol, "limit", "buy", size, mid * (1 - spread), { postOnly: true });
  } catch (error) {
    if (isPostOnlyWouldCross(error)) return;
    throw error;
  }
  bidId = bid.status === "open" ? bid.id : undefined;
  if (!running) return;

  try {
    const ask = await exchange.createOrder(symbol, "limit", "sell", size, mid * (1 + spread), { postOnly: true });
    askId = ask.status === "open" ? ask.id : undefined;
  } catch (error) {
    const failures: unknown[] = [error];
    const placedBidId = bidId;
    if (placedBidId) {
      try {
        await cancelIfResting(placedBidId);
        if (bidId === placedBidId) bidId = undefined;
      } catch (cancelError) {
        failures.push(cancelError);
      }
    }
    if (failures.length > 1) throw new AggregateError(failures, "ask placement and bid cleanup failed");
    if (isPostOnlyWouldCross(error)) return;
    throw error;
  }
}
```

`postOnly: true` makes the pool reject a quote that would cross instead of taking liquidity; the rejection arrives as `ContractRevertError` with `errorName` `PostOnlyWouldCross`. This loop waits for the next book change after that outcome. If the ask fails after the bid rests, it cancels the bid before it continues. If that cancellation also fails, the loop preserves both errors and the bid id for final cleanup. See [Handle errors and reverts](./handle-errors.md).

## Re-quote on change

Each `await exchange.watchOrderBook(symbol, 1)` resolves on the next change of the book. On a busy market that is every block, so compare the top of book and skip unchanged ticks.

```ts
let requestStop: (() => void) | undefined;
const stop = new Promise<null>((resolve) => {
  requestStop = () => resolve(null);
});

process.once("SIGINT", () => {
  running = false;
  requestStop?.();
});

async function cleanupQuotes() {
  const failures: unknown[] = [];

  if (bidId) {
    const orderId = bidId;
    try {
      await cancelIfResting(orderId);
      if (bidId === orderId) bidId = undefined;
    } catch (error) {
      failures.push(error);
    }
  }
  if (askId) {
    const orderId = askId;
    try {
      await cancelIfResting(orderId);
      if (askId === orderId) askId = undefined;
    } catch (error) {
      failures.push(error);
    }
  }
  try {
    await exchange.close();
  } catch (error) {
    failures.push(error);
  }

  if (failures.length > 0) throw new AggregateError(failures, "quote cleanup failed");
}

let lastTop = `${book.bids[0]?.[0]}/${book.asks[0]?.[0]}`;
const failures: unknown[] = [];
try {
  if (running) await requote(book);
  while (running) {
    const nextBook = await Promise.race([exchange.watchOrderBook(symbol, 1), stop]);
    if (nextBook === null || !running) break;
    book = nextBook;
    const top = `${book.bids[0]?.[0]}/${book.asks[0]?.[0]}`;
    if (top === lastTop) continue;
    lastTop = top;
    await requote(book);
  }
} catch (error) {
  failures.push(error);
}

try {
  await cleanupQuotes();
} catch (error) {
  failures.push(error);
}

if (failures.length > 0) throw new AggregateError(failures, "quoting loop stopped with errors");
```

Each `createOrder` and `cancelOrder` awaits its receipt. A full re-quote sends two cancellation transactions and two placement transactions. The SDK can also perform prerequisite reads: in particular, every native-base sell reads the pool's current funding requirement and vault shortfall before it sends.

## Re-quote in one transaction

For lower latency, move to the engine and use the batch writes. `amendOrders` re-prices several orders in one transaction. It works on spot and perp pools, not on binary pools.

```ts
import { ORDER_TYPE, fromHuman, isSpotMarket } from "@somnia-chain/markets-sdk";

const t = exchange.market(symbol);
if (!isSpotMarket(t.market)) throw new Error("spot only");
const { quoteDecimals, baseDecimals } = t.market;
if (!bidId || !askId) throw new Error("place both quotes before amending them");

const bestBid = book.bids[0]?.[0];
const bestAsk = book.asks[0]?.[0];
if (bestBid === undefined || bestAsk === undefined) throw new Error("two-sided book required");
const mid = (bestBid + bestAsk) / 2;
const newBid = exchange.priceToPrecision(symbol, mid * (1 - spread));
const newAsk = exchange.priceToPrecision(symbol, mid * (1 + spread));
const newSize = exchange.amountToPrecision(symbol, size);

const result = await exchange.trader.amendOrders({
  pool: t.pool,
  amendments: [
    {
      oldOrderId: bidId,
      newOrder: {
        isBid: true,
        price: fromHuman(newBid, quoteDecimals),
        quantity: fromHuman(newSize, baseDecimals),
        orderType: ORDER_TYPE.POST_ONLY,
      },
    },
    {
      oldOrderId: askId,
      newOrder: {
        isBid: false,
        price: fromHuman(newAsk, quoteDecimals),
        quantity: fromHuman(newSize, baseDecimals),
        orderType: ORDER_TYPE.POST_ONLY,
      },
    },
  ],
});
// 0n: the pool rejected that amendment and the order is off the book.
[bidId, askId] = result.newOrderIds.map((id) => (id === 0n ? undefined : String(id)));
```

Prices and quantities are raw `bigint` here; `fromHuman` scales the aligned values by the market's decimals. `ORDER_TYPE.POST_ONLY` preserves the quoting behavior of `createOrder(..., { postOnly: true })`. An unaligned value reverts with `PriceNotAlignedToTickSize` or `QuantityNotAlignedToLotSize`. What a rejected amendment does depends on the pool version. An all-or-nothing pool reverts the whole batch, with `AmendReplacementRejected` or, when the old order is already gone, `AmendOldOrderGone`. Other pools apply the remaining amendments and return `0n` for the rejected one, which then holds no order, so that side has no quote until you place one again. Pass `alwaysPlace: true` on an amendment to place the new order even when its old one is gone.

To place a ladder, use `placeSpotOrders`; to pull one, use `cancelOrders`. To pull every quote you hold on a pool without tracking the ids, use `cancelAllOrders(pool)`. It reads the resting ids and cancels them in one call, which is what a restarted bot needs. Pass `{ source: "live" }` to take the ids from the live tail instead, so the cancel is the only round trip; that needs an active watch on the pool. An expired order that still rests is invisible to the chain source — clear that residue with `cancelExpiredOrders`. The live source does see it, forwards its id, and the cancel lands: the pool gates a best-effort cancel on owner and id, not on expiry, so the order is removed and reported `cancelled: true`. Batches are not payable, so on a market whose base is the native token a batched sell needs a vault balance deposited beforehand with `trader.depositVaultNative`. [Spot markets](../SPOT.md) covers the batch parameters and the vault.

## Set an expiry so a crashed bot's quotes die

On the engine every order takes `expireTimestampNs`. Set it a few minutes ahead so a crashed bot's quotes die on their own. Expiry is lazy: an expired order stays on the book until a cancel or a fill attempt touches it, and a fill attempt reverts with `ExpiredOrderMustBeCancelled`. When unset, a spot or perp order expires in about 50 years and a binary order at its market's expiry.

```ts
const inFiveMinutes = BigInt(Date.now() + 5 * 60_000) * 1_000_000n;
```

## Stop cleanly

The handler is installed before the first quote. The loop quotes once from the book already returned by the initial watch, then waits for later changes. The handler resolves a pending book read and stops new placements. If a placement is already in flight, the loop waits for its receipt and records its order id before cleanup starts. Cleanup preserves each id until its cancellation succeeds. It attempts both sides even if one cancellation fails. It closes the exchange and then reports every loop or cleanup failure. `cancelIfResting` contains only `IncorrectSender`, which means the known order is no longer cancellable.

## Know what filled

Track fills with `watchMyTrades` or `watchOrders` in a second loop. See [Detect when an order fills](./detect-fills.md).
