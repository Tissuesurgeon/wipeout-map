# Opening stops cannot carry a linked stop-loss

## What happened

`PlacePerpStopOrderParams.intent` accepts `"opening"` for a stop-entry. `pair` is rejected for an opening leg. The SDK comment in `dist/trade.d.ts` says both legs of a pair are reduce-only, because a bracket that arms when the parent fills is not expressible: the pool does not notify the registry on fill.

## Expected

The bounty brief assumed `placePerpStopOrder` could place a cascade entry with a linked SL/TP in one transaction.

## Repro

Read `PerpStopIntent` and the `pair` field docs in `@somnia-chain/markets-sdk@0.32.1` `dist/trade.d.ts` (`PlacePerpStopOrderParams`).

## What we did

Cascade entries are `intent: "opening"`. The UI still requires an SL price and keeps Place disabled without one. The SL is a second reduce-only signature after the entry fills. Fix-sheet stops stay reduce-only and can include a linked take-profit.
