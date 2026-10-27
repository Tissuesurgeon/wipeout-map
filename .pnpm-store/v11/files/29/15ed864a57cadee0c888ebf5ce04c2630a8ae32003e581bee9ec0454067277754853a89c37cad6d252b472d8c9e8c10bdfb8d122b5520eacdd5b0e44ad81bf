# How to use the React hooks

This guide shows you how to wire `@somnia-chain/markets-sdk/react` into a React app: provide the client once, render live data that updates itself, and fetch indexer data with your own query library. It assumes you know React hooks and context. The hook signatures are in the API reference under "React hooks".

## Provide the client once

Construct one exchange at module scope and pass its engine, `exchange.client`, to the provider near the root. Every hook reads the client from context.

```tsx
import type React from "react";
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { SomniaMarketsProvider } from "@somnia-chain/markets-sdk/react";
import { somniaTestnet } from "viem/chains";

export const exchange = new SomniaMarkets({
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  chain: somniaTestnet,
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  addresses: SOMNIA_TESTNET_ADDRESSES,
});

export function App({ children }: { children: React.ReactNode }) {
  return <SomniaMarketsProvider client={exchange.client}>{children}</SomniaMarketsProvider>;
}
```

Do not construct the exchange inside a component. A new instance per render means a new socket and a new store per render.

## Render a live order book

The pool-keyed `useLive*` hooks open the market watch while the component is mounted and re-render on every change. Ten components on one pool share one watch.

```tsx
import { toHuman } from "@somnia-chain/markets-sdk";
import { useLiveSpotOrderBook, useWatchMarket } from "@somnia-chain/markets-sdk/react";

export function SpotBook({
  pool,
  baseDecimals,
  quoteDecimals,
}: {
  pool: string;
  baseDecimals: number;
  quoteDecimals: number;
}) {
  const status = useWatchMarket(pool); // "unwatched" | "hydrating" | "live"
  const book = useLiveSpotOrderBook(pool, 10);
  if (status !== "live") return <p>loading…</p>;
  return (
    <table>
      <tbody>
        {book.asks.map((l) => (
          <tr key={`a${l.price}`}>
            <td>{toHuman(l.price, quoteDecimals)}</td>
            <td>{toHuman(l.quantity, baseDecimals)}</td>
          </tr>
        ))}
        {book.bids.map((l) => (
          <tr key={`b${l.price}`}>
            <td>{toHuman(l.price, quoteDecimals)}</td>
            <td>{toHuman(l.quantity, baseDecimals)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Live values are raw `bigint`. Convert at the edge with `toHuman` and the market's decimals. Read the decimals off the market row, from `useMarkets` or from `exchange.markets[symbol].info`.

Pass `undefined` as the pool to render nothing and open no watch, for example while a route parameter loads.

The other `useLive*` hooks follow the same pattern; the API reference under "React hooks" lists them.

## Show your own orders and fills

Combine `useWatchUser` with the user-scoped hooks. `useWatchUser` hydrates the account's order and fill history; the pool watch keeps it current.

```tsx
import { useLiveUserOrders, useWatchUser } from "@somnia-chain/markets-sdk/react";

export function MyOrders({ pool, account }: { pool: string; account: string }) {
  useWatchUser(account);
  const orders = useLiveUserOrders(pool, account, 50);
  return (
    <ul>
      {orders.map((o) => (
        <li key={o.orderId}>
          {o.orderId} {o.status}
        </li>
      ))}
    </ul>
  );
}
```

## Fetch indexer data with TanStack Query or SWR

The SDK ships no cache wrapper. Every client read is a promise, which is a ready-made `queryFn`, and the root entry exports one key factory per read so your keys never drift.

```tsx
import { useQuery } from "@tanstack/react-query";
import { candlesKey } from "@somnia-chain/markets-sdk";
import { useSomniaMarketsClient } from "@somnia-chain/markets-sdk/react";

export function useCandles1h(pool: string) {
  const client = useSomniaMarketsClient();
  return useQuery({
    queryKey: candlesKey(pool, 3600, { limit: 500 }),
    queryFn: () => client.getCandles(pool, 3600, { limit: 500 }),
    refetchInterval: 15_000,
  });
}
```

After a write, invalidate with the same factory, for example `queryClient.invalidateQueries({ queryKey: portfolioKey(account) })`, or everything SDK-shaped with the `QUERY_KEY_SCOPE` prefix.

On a multi-chain exchange, the same account or pool can exist on each chain. Give each key the chain of its read as the last argument:

```tsx
export function useCandles1hOn(pool: string, chainId: number) {
  const client = useSomniaMarketsClient(chainId);
  return useQuery({
    queryKey: candlesKey(pool, 3600, { limit: 500 }, { chainId }),
    queryFn: () => client.getCandles(pool, 3600, { limit: 500 }),
  });
}
```

A key without `chainId` is the same key a single-chain app uses. A key with a `chainId` is that key plus a last `{ chainId }` element. So `invalidateQueries` with a key without a chain matches the entries of every chain, because TanStack Query matches by prefix. A key with a `chainId` does not match an entry stored without one, even on the primary chain. So on a multi-chain exchange, pass `chainId` on every key you read with.

Do not wrap the `useLive*` hooks in a query cache. They already read a shared, push-fed store.

## Fetch indexer data without a query library

`useIndexerQuery(fn, deps)` re-runs `fn` when `deps` change and keeps `data`, `loading`, `error`, and `refetch`. It discards a superseded result. It also passes an `AbortSignal` to `fn`, but current client read methods do not accept a per-request signal, so the example below does not cancel its HTTP request.

```tsx
import { useIndexerQuery } from "@somnia-chain/markets-sdk/react";

export function useOpenOrders(owner: string | undefined) {
  return useIndexerQuery((client) => (owner ? client.getOpenOrders(owner) : Promise.resolve([])), [owner]);
}
```

The built-in indexer hooks such as `usePortfolio` and `useCandles` return the same shape.

## Write from a component

Hooks read; writes go through the exchange or a trader. With a browser wallet, bind it first as shown in [Sign with a browser wallet](./sign-with-a-browser-wallet.md), then call `exchange.createOrder(...)` from an event handler. The live hooks pick up the resulting order and fills without any refetch.

## Render prices

`useWatchPrice(asset)` opens the price watch; `useLivePrice(asset)` returns the latest `LivePrice` or `null`. These hooks acquire current data only. Add `useLivePriceTicks(asset)` to acquire historical ticks and their live stream. All price hooks need `priceFeed` in the configuration. `useLivePriceFeedInfo` does not re-render as a price ages; drive an age display from your own timer.
