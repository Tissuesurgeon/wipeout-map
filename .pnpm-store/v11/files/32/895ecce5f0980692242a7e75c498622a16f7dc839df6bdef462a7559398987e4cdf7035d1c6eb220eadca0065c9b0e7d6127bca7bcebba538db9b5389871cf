# Stream a live order book

In this tutorial we install the SDK in an empty project, load the markets on the Somnia testnet, and read an order book and the latest trades. Then we follow the top of the book live for thirty seconds. At the end you will have a running script that prints a line each time the best bid or ask on `SOMI/USDso` changes.

No wallet and no funds are needed. Everything in this tutorial reads public data.

## Before you start

You need:

- Node.js 22 or newer. Check with `node --version`.
- npm, which ships with Node.js.
- An empty directory to work in.
- A network connection to the Somnia testnet endpoints.

We run TypeScript directly with `tsx`, so there is no build step.

## 1. Create the project

In your empty directory, run these three commands:

```sh
npm init -y
npm pkg set type=module
npm install @somnia-chain/markets-sdk@0.29.0 viem@2.55.10 tsx@4.23.1
```

The first creates `package.json`. The second lets Node.js load our files as ES modules, which the SDK requires. The third installs the versions used to verify this tutorial: SDK 0.29.0, viem 2.55.10, and tsx 4.23.1. `tsx` runs TypeScript files directly but does not check types, so no `tsconfig.json` is needed. Your editor may underline `process.env` in the next tutorial because Node's type definitions are not installed; the scripts still run.

You should see npm report the added packages, and a `node_modules` directory should exist.

## 2. Create the exchange and load the markets

Create a file named `watch.ts` with this content:

```ts
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaTestnet } from "viem/chains";

const exchange = new SomniaMarkets({
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  chain: somniaTestnet,
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  addresses: SOMNIA_TESTNET_ADDRESSES,
});

const markets = await exchange.loadMarkets();
const spot = Object.values(markets).filter((m) => m.type === "spot");
console.log(
  `${exchange.symbols.length} symbols, ${spot.length} spot markets:`,
  spot.map((m) => m.symbol),
);

await exchange.close();
```

`SomniaMarkets` is the SDK's single entry point. The three fields point it at the testnet: the indexer URL for history, the chain definition, and the deployed contract addresses. `loadMarkets` fetches every market and builds the symbol table.

Run it:

```sh
npx tsx watch.ts
```

You should see one line naming the spot markets. The counts change as markets are created and expire; the three spot symbols are stable:

```text
597 symbols, 3 spot markets: [ 'WBTC/USDso', 'SOMI/USDso', 'WETH/USDso' ]
```

Notice that most symbols are binary markets, short-lived questions about BTC and ETH prices. We work with the spot market `SOMI/USDso`. SOMI is the market's name for the chain's native token, which the testnet calls STT. USDso is a test stablecoin.

## 3. Read the order book and the last trades

Replace the `await exchange.close();` line with this, so the new code runs before the exchange closes:

```ts
const book = await exchange.fetchOrderBook("SOMI/USDso", 3);
console.log("bids", book.bids);
console.log("asks", book.asks);

const trades = await exchange.fetchTrades("SOMI/USDso", undefined, 3);
for (const t of trades) console.log(t.datetime, t.side, t.amount, "@", t.price);

await exchange.close();
```

The middle argument of `fetchTrades` is a `since` timestamp we do not need. Run the file again. You should see three levels per side and three trades:

```text
597 symbols, 3 spot markets: [ 'WBTC/USDso', 'SOMI/USDso', 'WETH/USDso' ]
bids [ [ 0.1153, 445 ], [ 0.1152, 1222 ], [ 0.1151, 752 ] ]
asks [ [ 0.1154, 530 ], [ 0.1155, 1378 ], [ 0.1156, 1810.46 ] ]
2026-09-03T21:40:52.000Z sell 25 @ 0.1153
2026-09-03T21:40:43.000Z sell 25 @ 0.1153
2026-09-03T21:40:33.000Z sell 25 @ 0.1153
```

Notice the shapes. A book level is a `[price, amount]` pair in plain numbers: 445 SOMI bid at 0.1153 USDso each. Trades come newest first with an ISO timestamp. `fetchOrderBook` read the pool contract on the chain; `fetchTrades` read the indexer. Both are one-shot reads.

Notice also the timestamps: on the testnet a market-making bot trades this market every few seconds. That activity is what we watch next.

## 4. Follow the top of the book live

Replace the `await exchange.close();` line again, this time with a loop:

```ts
// Follow the book for 30 seconds. Print a line whenever the best bid or ask changes.
const stop = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30_000));
let last = "";
while (true) {
  const live = await Promise.race([exchange.watchOrderBook("SOMI/USDso", 1), stop]);
  if (!live) break;
  const top = `bid ${live.bids[0]?.[0]} × ${live.bids[0]?.[1]}  /  ask ${live.asks[0]?.[0]} × ${live.asks[0]?.[1]}`;
  if (top !== last) console.log(new Date().toISOString(), top);
  last = top;
}

await exchange.close();
console.log("done");
```

`watchOrderBook` is different from `fetchOrderBook`. The first call opens a live watch on the market, and every later call resolves the next time the book changes, with no request to any server. [Read tiers](../reference/read-tiers.md) describes how the watch works. The `Promise.race` against a 30-second timer is only there to end the tutorial. `close()` releases the watch and the WebSocket to the node, so the script prints `done` and exits.

Run the file one more time. The first live line prints at once. After that, a line appears only when the best level changes; the testnet bot usually moves it every few seconds, so expect several lines in thirty seconds. On a quiet market you see one live line and then `done`. This run looked like this:

```text
597 symbols, 3 spot markets: [ 'WBTC/USDso', 'SOMI/USDso', 'WETH/USDso' ]
bids [ [ 0.1153, 445 ], [ 0.1152, 1222 ], [ 0.1151, 752 ] ]
asks [ [ 0.1154, 530 ], [ 0.1155, 1378 ], [ 0.1156, 1810.46 ] ]
2026-09-03T21:40:52.000Z sell 25 @ 0.1153
2026-09-03T21:40:43.000Z sell 25 @ 0.1153
2026-09-03T21:40:33.000Z sell 25 @ 0.1153
2026-09-03T21:41:03.545Z bid 0.1153 × 445  /  ask 0.1154 × 1165.4
2026-09-03T21:41:03.974Z bid 0.1153 × 420  /  ask 0.1154 × 1165.4
2026-09-03T21:41:10.083Z bid 0.1153 × 420  /  ask 0.1154 × 635.4
2026-09-03T21:41:10.084Z bid 0.1152 × 470.5  /  ask 0.1154 × 635.4
2026-09-03T21:41:13.866Z bid 0.1152 × 1010.1  /  ask 0.1154 × 1164.9
2026-09-03T21:41:22.768Z bid 0.1152 × 985.1  /  ask 0.1154 × 1164.9
2026-09-03T21:41:30.078Z bid 0.1152 × 470.5  /  ask 0.1153 × 529.5
done
```

Notice that in this run the bid size dropped by 25 a few seconds in: a trade of the same size as the ones from step 3, seen from the chain event rather than from the indexer. Two lines can carry almost the same timestamp when one block moves more than one level.

Notice too that the book copy changes more often than its top. The `if (top !== last)` check keeps the output to what changed at the best level.

## What you can do now

You can create an exchange for the Somnia testnet, load its markets, and read any spot market's book and trades on demand. You can open a live watch and react each time the book changes, without a polling loop. The same `fetchOrderBook`, `fetchTrades`, and `watchOrderBook` calls work on every symbol `loadMarkets` returned, including the binary markets.

Next, [Place and cancel your first order](./place-and-cancel-your-first-order.md) adds a signer to this project and puts an order on this book. To see which reads are live, on-chain, or indexed, read [Read tiers](../reference/read-tiers.md).
