# Wipeout Map

On a centralized exchange, a liquidation heatmap is a guess. dreamDEX positions are public on Somnia Hideki, so Wipeout Map computes the real one: the price levels where open perp positions get liquidated, across every Hideki perp market.

The hero is a full-bleed thermal map. Long liquidations sit below the mark and short liquidations above it, drawn on the same heat ramp. Shorts are hatched. A tape on the right records `PositionLiquidated` events and says whether that price was already on the map. Paste any address, or connect a wallet, and each position shows distance to liquidation. Reduce, set a stop, add margin, or arm a cascade entry from the browser. The server never holds a key.

## How it works

1. `listPerpMarkets` and `getPerpSideHolders` find every open position.
2. Account health is read once per account through Multicall3.
3. Liquidation prices are the SDK's pure `perpLiquidationPrice`, recomputed locally when the mark moves.
4. Buckets are `max(tick, mark × 0.25%)` over a ±30% window. A cluster is a run of adjacent buckets whose notional is at least twice the median non-empty bucket.
5. Liquidations are polled from the LiquidationEngine with `eth_getLogs`. `somnia_watch` is used only if day-1 verification sees a delivered event.

### Data honesty

A liquidation price assumes **only this market moves**. One account's collateral backs every position, so a correlated drop liquidates sooner. Accounts in two or more markets show a **cross** badge. The label on every price is "Liq price (if only this market moves)". Danger also shows equity / maintenance requirement, which is exact.

Demo bots are off unless a market is thin and `WIPEOUT_SEED_DEMOS=1`. None are seeded by default, and any that are later flagged `is_demo_bot` stay hidden unless a toggle is added. This build does not draw demo positions.

Every number carries its block and age. After 30 seconds the map is stamped stale and desaturated. If `getPerpState` / `getPerpFeedStatus` says the mark is not ok, that market's map is hidden and its orders are disabled.

### Fallbacks

- Stop **entries** exist (`intent: "opening"`). A linked stop-loss cannot be attached to an opening leg. The cascade sheet requires an SL price and places the entry; the SL is a second signature after the fill. Reduce-only stops can still carry a linked take-profit.
- `placePerpOrder` has no reduce-only flag. A reduce is a closing IOC at 0.5% through the mark, sized to 25% or 50% of the position re-read before signing.
- Reactivity delivery was not observed in the day-1 window. The live feed uses an `eth_getLogs` poller in ranges of 900 blocks, because Hideki rejects ranges over 1000.
- There is no Hideki paper-USDso faucet in the SDK's Shannon mint guide. Sample transactions are not sent without `TEST_PRIVATE_KEY` in a gitignored `.env`.

## Run

```bash
pnpm i
cp .env.example .env
```

Local Postgres:

```bash
docker run --name wipeout-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wipeout -p 5432:5432 -d postgres:16
```

A Prisma Postgres dev database works the same way. `DATABASE_URL` is the pooled connection the server queries. `DIRECT_URL` is the direct connection used to create tables. Schema setup uses `DATABASE_URL` when `DIRECT_URL` is unset.

```bash
pnpm verify
pnpm smoke
pnpm test
pnpm dev          # API on :8787, Vite on :5173
pnpm build && pnpm start
```

Node 22. The SDK is pinned to `@somnia-chain/markets-sdk@0.32.1`. Chain id 50383 comes from the SDK's `hidekiTestnet` export.

`TEST_PRIVATE_KEY` is read only by `scripts/verify/place-samples.ts`. The server process does not load it.

## Screenshots

Capture the BTC map, a hover readout, and a risk sheet after `pnpm dev` has finished its first sweep. The first sweep reads every holder and can take a few minutes.

## Testnet evidence (tx hashes)

`docs/VERIFY.md` (2026-10-26) records chain 50383, 21 markets, a holder sweep of 11223 positions in 27813 ms, a health rebuild of 7991 accounts in 18476 ms, and `somnia_watch` accepted with no event delivered in 25 seconds. The server keeps the log poller.

No sample hashes are recorded. A funded Hideki wallet still has to sign four transactions in the browser: one reduce, one stop, one USDso deposit, and one cascade (opening stop plus the reduce-only stop). `POST /api/orders` checks each receipt before it is stored. `mint` on the live quote token reverted, the Shannon USDso guide is a different chain, and this session has no wallet to sign with. Hideki has no explorer in `hidekiTestnet.blockExplorers`. When those receipts exist they belong here as `chain 50383 · tx 0x…`.

## X posts

Nothing here has been posted.

1. $26.7M of shorts get wiped between 91,291 and 93,488, 14.2% above price. That sentence is the live #1 wipeout callout on @DreamDEXSomnia.
2. Your liq price, then one signature to reduce, stop, or add margin. Wipeout Map reads any wallet on @DreamDEXSomnia perps. Hideki testnet.
3. Ride a liquidation cluster on @DreamDEXSomnia with a required stop and a 5x cap. Built for the dreamDEX x Somnia Perps bounty.

## Deploy

The API is a Render Blueprint (`render.yaml`, Docker, Starter). The web app is a Vercel project with Root Directory `web`. Steps, env vars, and troubleshooting are in [docs/DEPLOY.md](docs/DEPLOY.md). No private key belongs in either host.

```bash
docker build -t wipeout-map .
docker run --env-file .env -p 8787:8787 wipeout-map
```

## Submission notes

The 60-second demo script and the DoraHacks checklist are in `docs/SUBMISSION.md`. Target: 1 Nov 2026, 18:00 UTC.
