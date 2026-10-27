# Why a binary pool can name more than one market

A binary market has a stable `marketId`. Its `BinaryPool` address hosts the order
book and can be reused after that market is finalized and the pool is released.
When the pool is recycled, it hosts a new market at the same address. Keep the
`marketId` when you need to read one market across its full life.

## What changes when a pool is recycled

The `BinaryMarketsModule` keeps a record for each `marketId`. That record retains
the market contract, pool address, and its `yesId` and `noId`. Recycling changes
the pool's current market and increases its market nonce. The new nonce gives
the next market different outcome-token ids, even though the pool address is
the same. An earlier market's module record and outcome-token ids remain tied
to that earlier market.

For example, market A and market B can both name pool P. After P is recycled
from A to B, `getBinaryPoolParams()` on P reports B's `market`, `yesId`, and
`noId`. It cannot identify A's outcome tokens. Read the module record through
`client.getMarketOnchain(marketId)` when you need A's ids.

## Choose the read by the identity you hold

| Read                                                                         | What it describes                                                                                                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pool contract `getBinaryPoolParams()`                                        | The pool's current market, outcome ids, and parameters at the read block.                                                                        |
| `client.getPoolMarketBinding(pool)`                                          | The pool's current `marketId` from chain, with a block pin.                                                                                      |
| `client.getBinaryOrderBook(pool)`                                            | The pool's resting book at chain head or a requested block. It does not check a `marketId`; after recycle, it can return the next market's book. |
| `client.getLiveBinaryOrderBook(pool)` and `client.getLiveMarketByPool(pool)` | The watched pool's locally materialized book and market binding, through the last applied events. They need a watch and can lag chain head.      |
| `client.getMarketByPool(pool)`                                               | The newest indexed market row for that pool. It can lag the chain; `listMarketsByPool(pool)` returns indexed rows for earlier occupants too.     |
| `client.getBinaryMarket(marketId)` or `client.getMarketOnchain(marketId)`    | One market by its stable id, from the indexer or chain respectively.                                                                             |
| `client.getLiveBinaryOrderBookByMarket(marketId)`                            | The watched book only while that market is the pool's current binding. It returns an empty book after the pool moves on.                         |
| React `useLiveBinaryOrderBookByMarket(marketId)`                             | A selected market's live book. It watches the pool only after the market is known to the live store; mount a pool-keyed watch for a cold screen. |

The market-scoped live book needs an active watch. Its empty result for an older
market is a safeguard against showing the successor's orders; it is not a
historical order book. Pool-keyed fill and user-order reads can span successive
markets. The live fill tape has no market filter; for one wallet's indexed
fills, `getUserFills(account, { market: marketId })` filters by market id.
Pool-keyed candles also span successive markets. `getCandles(pool, interval,
{ market: marketId })` and `getMarketStats24h({ marketId })` read one market's
candles.

## Read a selected market

For a one-shot chain snapshot, read the pool binding and book at the same block.
If the binding is absent or names another market, return no book instead of
showing the successor's liquidity. Read the selected market's outcome-token
ids from its own chain record; its YES balance remains meaningful after recycle.

```ts
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import type { Address, Hex } from "viem";

async function readBinaryMarket(exchange: SomniaMarkets, marketId: Hex, account: Address) {
  const client = exchange.client;
  const market = await client.getMarketOnchain(marketId);
  const binding = await client.getPoolMarketBinding(market.pool);
  const book =
    binding?.marketId.toLowerCase() === marketId.toLowerCase()
      ? await client.getBinaryOrderBook(market.pool, {
          blockNumber: binding.blockNumber,
          decimals: market.decimals,
        })
      : null;
  const yesBalance = await client.getOutcomeBalance({
    outcomeToken: market.outcomeToken,
    account,
    id: market.yesId,
  });
  return { yesBalance, book };
}
```

For a continuously updated view, keep `watchMarket(market.pool)` active for the
screen's lifetime and call `getLiveBinaryOrderBookByMarket(marketId)` on updates.
That market-scoped read returns an empty book when the watched pool's current
binding differs, or when the market is not yet known to the live store. In
React, mount `useWatchMarketResult(market.pool)` or another pool-keyed watch hook
alongside `useLiveBinaryOrderBookByMarket(marketId)` to seed a cold store. The
market-scoped hook can watch the pool itself only after the market is known.

Do not take `yesId` or `noId` from the recycled pool's current
`getBinaryPoolParams()` to check an older market's balance. The shared
outcome-token contract's `balanceOf(account, id)` reads exactly the id you give
it. If a wallet owns A's YES tokens but you pass B's `yesId`, the result can be
zero. That zero describes B's token balance, not A's position.
