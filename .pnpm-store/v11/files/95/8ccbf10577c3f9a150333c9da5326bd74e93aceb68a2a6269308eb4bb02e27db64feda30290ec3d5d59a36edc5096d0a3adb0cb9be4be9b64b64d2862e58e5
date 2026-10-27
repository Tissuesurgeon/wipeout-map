# Place and cancel your first order

In this tutorial we place a real limit order on the Somnia testnet, watch it appear in our open orders, and cancel it. At the end you will have sent two transactions through the SDK and seen how a resting order shows up in the live data.

The order tries to sell 1 SOMI at four times the current price. We submit it as post-only, so the pool either rests it on the book or rejects it; nothing is bought or sold. Your balance still changes temporarily while a resting order reserves its funding requirement, and permanently by the testnet gas you spend.

## Before you start

You need:

- The project from [Stream a live order book](./stream-a-live-order-book.md). We add one file to it.
- A private key, including its `0x` prefix, for an account on the Somnia testnet that holds at least 2 STT. The testnet is called Shannon; it is the `somniaTestnet` chain we already import from viem. Create a fresh key for this tutorial and never use a key that holds real funds. [Get testnet funds](../how-to/get-testnet-funds.md) lists the faucets.

Why 2 STT: the pool's required reserve includes the 1 SOMI quantity and any configured fee headroom. A native sell sends only the part not already credited to your pool vault. The transaction also needs room under the SDK's gas ceiling; unused gas is not charged.

Put the key in your shell for this session. Replace the value with your own key.

```sh
export SOMNIA_PRIVATE_KEY=0x…
```

We run the file twice in this tutorial: once after step 1, to check the key, and once after step 5, to place and cancel the order. Steps 2 to 4 only add code.

## 1. Create the exchange with a signer

Create `trade.ts` next to `watch.ts`:

```ts
import { isHex } from "viem";
import { somniaTestnet } from "viem/chains";
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";

const privateKey = process.env.SOMNIA_PRIVATE_KEY;
if (!privateKey || !isHex(privateKey, { strict: true }) || privateKey.length !== 66) {
  throw new Error("set SOMNIA_PRIVATE_KEY to a 32-byte 0x-prefixed key");
}

const exchange = new SomniaMarkets({
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  chain: somniaTestnet,
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  addresses: SOMNIA_TESTNET_ADDRESSES,
  privateKey,
});
await exchange.loadMarkets();
console.log("trading as", exchange.walletAddress);

const before = await exchange.fetchBalance();
console.log("STT before:", before.STT?.total);

await exchange.close();
```

The one new field is `privateKey`. With it, the SDK signs transactions locally and every authenticated method knows whose data to return. The closing `close()` is the same ending as `watch.ts`.

Run it:

```sh
npx tsx trade.ts
```

You should see your own address and your STT balance:

```text
trading as 0x0a9753f040E0cC077eB514c207F8ba2c14230b42
STT before: 19997.22114964
```

Notice that `fetchBalance` took no address. It answers for the signer. If the balance is below 2, stop here and fund the account before you continue.

## 2. Open the live watch

Replace the closing `close()` line of `trade.ts` with this:

```ts
const book = await exchange.watchOrderBook("SOMI/USDso", 1);
const bestAsk = book.asks[0]?.[0];
if (bestAsk === undefined) throw new Error("the ask side is empty right now; run again in a moment");
console.log("best ask:", bestAsk);
```

We open the live watch before placing the order. From now on the SDK keeps a local copy of this market current from the chain's events, so our own order will appear in that copy in the block it lands. No need to run yet; step 3 uses `bestAsk`.

## 3. Place the order

Append:

```ts
const order = await exchange.createOrder("SOMI/USDso", "limit", "sell", 1, bestAsk * 4, { postOnly: true });
console.log("placed:", order.id, order.status, `${order.amount} @ ${order.price}`);
```

The first five arguments are the symbol, the order type, the side, the amount in SOMI, and the price in USDso per SOMI. `{ postOnly: true }` guarantees the order cannot take liquidity. Four times the best ask should rest far above the market, but the book can move before the transaction lands. If that makes the order cross, `createOrder` throws a `ContractRevertError` named `PostOnlyWouldCross`; run the script again so step 2 reads a fresh book. `createOrder` resolves only after the transaction is mined; there is nothing to wait for afterwards.

## 4. See the order in your open orders

Append:

```ts
let orders = await exchange.watchOrders("SOMI/USDso");
while (!orders.some((o) => o.id === order.id)) orders = await exchange.watchOrders("SOMI/USDso");
console.log("in my open orders:", orders.find((o) => o.id === order.id)?.status);

const during = await exchange.fetchBalance();
console.log("STT while resting:", during.STT?.total);
```

`watchOrders` returns your orders on this market from the local copy the watch keeps current, with no request to a server. Its first call returns what the copy holds now, and each later call resolves when the copy changes. The `while` loop covers the moment between the transaction being mined and its event reaching the copy, which is usually zero calls.

## 5. Cancel the order

Append:

```ts
const cancel = await exchange.cancelOrder(order.id, "SOMI/USDso");
console.log("cancel:", cancel.status);

const after = await exchange.watchOrders("SOMI/USDso");
console.log("after cancel:", after.find((o) => o.id === order.id)?.status);

const final = await exchange.fetchBalance();
console.log("STT after:", final.STT?.total);

await exchange.close();
```

Run the file. It takes a few seconds longer than the first run, because two transactions are mined. The output should look like this, with your own address, order id, price, and balances:

```text
trading as 0x0a9753f040E0cC077eB514c207F8ba2c14230b42
STT before: 19997.…
best ask: 0.1147
placed: 793209995169529057822 open 1 @ 0.4588
in my open orders: open
STT while resting: 19996.…
cancel: canceled
after cancel: canceled
STT after: 19997.…
```

Notice five things.

- `status` is `open` after placement: the order rests on the book. The `id` is the pool's order id, a long decimal string.
- The price prints as `0.4588`, four times `0.1147` rounded onto the market's allowed price steps, in the direction that favours you.
- `STT while resting` is below `STT before`. The pool reserves enough for the 1 SOMI sale and its configured fee headroom, less any native balance you already had in the pool vault, and gas was paid. SOMI is the market's name for the chain's native token, which the testnet calls STT.
- The second `watchOrders` call returned the same order with status `canceled`. The local copy saw the cancel event and updated.
- `STT after` is `STT before` minus the gas for two transactions. The unused reserve came back; the exact difference depends on current gas fees and the pool's fee settings.

`close()` releases everything the instance opened, including the WebSocket to the node, so the script ends on its own.

## If a run stops halfway

A run that fails after `placed:` leaves that order resting with 1 STT locked. Cancel it by id with a one-line script, replacing the id with the one the run printed:

```ts
await exchange.cancelOrder("793209995169529057822", "SOMI/USDso");
```

Use the same construction lines as `trade.ts` above it, and the same two closing lines below it. Cancelling an order that is already gone throws a `ContractRevertError` named `IncorrectSender`; that means there is nothing left to cancel.

## What you can do now

You can place a limit order on any spot market the SDK lists, read it back from the live data, and cancel it. The same `createOrder` call with `"buy"` and a price above the best ask fills immediately and returns `status: "closed"` with the fills in `order.info`. To run this as a bot, continue with [Run a quoting loop](../how-to/run-a-quoting-loop.md). To learn when a resting order fills, read [Detect when an order fills](../how-to/detect-fills.md). To see what the SDK did during each step, add a debug sink as shown in [Debug what the SDK is doing](../how-to/debug-the-sdk.md).
