# placePerpOrder has no reduce-only flag and no userData

## What happened

`PlacePerpOrderParams` in `@somnia-chain/markets-sdk@0.32.1` accepts `orderType` 0 (limit) or 2 (IOC). It has no `reduceOnly` field. `userData` exists on `BatchOrderRequest`, not on `PlacePerpOrderParams`.

## Expected

A reduce button could ask the pool to refuse an order that would increase exposure, and a client could tag the order on-chain.

## Repro

Read `PlacePerpOrderParams` versus `BatchOrderRequest` in `dist/trade.d.ts`.

## What we did

A reduce is a closing IOC, 0.5% through the mark, sized to 25% or 50% of the position. The UI re-reads size before signing. Orders are tagged in SQLite by transaction hash (`app_orders`), which matches the brief.
