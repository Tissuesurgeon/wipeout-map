# Cursor prompt: build "Wipeout Map" (dreamDEX perps liquidation heatmap)

> Paste everything below into Cursor (Plan mode first, then Agent).

---

## 0. Your job and how to work
You are my senior engineer on a solo hackathon build. **First, output a phased build plan only (Section 12). Then stop and ask me to confirm. Do not write code until I say "go".** Before you write UI code, you also propose 2 visual directions (Section 9) and wait for me to pick one.

- Builder: Richard (solo), Linux, Node 22. Project root: `~/Desktop/wipeout-map`.
- Hackathon: **dreamDEX x Somnia Perps Builder Bounty, MVP track.** The app must place **REAL orders on dreamDEX perps** on **Somnia Hideki testnet (chain id 50383)**.
- Deadline: **Nov 1 2026, 23:59 UTC**. Target done: **Nov 1, 18:00 UTC** (Accra time = UTC).
- Source of truth: `DESIGN.md` and `probe/` (`probe.mjs`, `p2.mjs`, `w.cjs`). Copy them into the repo (`docs/DESIGN.md`, `probe/`) and read them fully. If this prompt and DESIGN.md conflict, ask me.
- If an SDK function name or signature differs from what is written here, check the SDK's `.d.ts` files and `node_modules/@somnia-chain/markets-sdk/docs/` (PERPS.md, REACTIVITY.md, reference/networks-and-endpoints.md). Never guess. Write each mismatch up in `feedback/`.

## 1. The product
On centralized exchanges, liquidation heatmaps are guesses. dreamDEX positions are public onchain, so Wipeout Map computes the **real** map: the price levels where open positions get liquidated, for all 21 perps markets. It has 4 parts:
1. **Heatmap per market.** Price on the Y axis with a mark line. Long liquidations sit below the mark and short liquidations above it, sized by USDso notional. Hover a bar to read "$412k of longs liquidate between $61,200 and $61,400 (37 positions)".
2. **Live liquidation feed.** Each `PositionLiquidated` event appears as it happens, with "predicted on our map at $X ✅/❌".
3. **Wallet risk checker.** Paste an address or connect a wallet. Each position gets a card with liq price, distance %, and status (Healthy, Warning <15%, Danger <5%). One tap places a real fix: **Reduce 25/50%**, **Set stop**, or **Add margin**, with the projected liq price shown before you sign.
4. **Ride the cascade.** Click a cluster to place a real stop or limit entry just past it. A **stop-loss is required** (the Place button stays disabled without one), leverage is **capped at 5x**, size is capped at ≤20% of free equity, and the UI warns if the SL is more than 3% away. A "testnet / not advice" banner is always shown.
5. **Optional:** Telegram alerts (`/watch 0x…`, `/stop`, at most 1 alert per position per 10 min).

## 2. Verified technical facts (tested live Oct 26 2026 unless marked 📘 docs-only)
- SDK: **`@somnia-chain/markets-sdk@0.32.1`** (pin exactly) with `viem` ^2. Optional peer: `@somnia-chain/reactivity@0.2.1`.
- Client setup (from the probe):
  ```ts
  import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
  import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
  const ex = new SomniaMarkets({ indexerUrl: INDEXER_URL, chain: hidekiTestnet, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
  const c = ex.client;
  ```
  Always use the SDK's `hidekiTestnet` export. Hideki v2 was regenesised Sep 17 2026 with the same chain id, so never hand-write the chain. Assert chainId 50383.
- RPC: `https://api.hideki2.infra.testnet.somnia.network`. WS: `wss://api.hideki2.infra.testnet.somnia.network/ws`.
- Indexer GraphQL: `https://hideki-dev.smk.somnia.host/v1/graphql`. It is 📘 **dev-grade with no alerting**, so treat the chain as the source of truth and the indexer as a speed-up only.
- Multicall3 (📘 predeployed): `0xcA11bde05977b3631167028862bE2a173976CA11`.
- `c.listPerpMarkets()` returns **21 markets**, all quoted in USDso: ZRO, LIT, VVV, 1000PEPE, PUMP, ZEC, TAO, WLD, NEAR, XLM, AVAX, LINK, SUI, ADA, BNB, DOGE, XRP, HYPE, SOL, ETH, BTC. Fields include `baseSymbol`, `poolAddress`, `marginBank`, `markPrice`, `initialMarginBps`, `openInterest`, plus stop registry, tick and lot.
- `c.getPerpSideHolders({ marginBank, pool, isLong })` returns `{ holders, asOfBlock }`. Across 42 (market, side) lists it found **11,177 open position entries** (BTC 5,819 L / 321 S, ETH 335/180, SOL 373/205, ZRO 19/7). The full holder sweep took about 30 s.
- `c.getPerpPosition({ marginBank, pool, account })` returns signed `size` (1e18), `avgEntryPrice`, `entryFundingIndex`.
- `c.getAccountHealth(marginBank, account)` returns `equity`, `imReq`, `mmReq`, `cmReq`, `marginStatus`.
- `c.getLiquidationPrice(ref)` returns a finite bigint, or 0/null when the position can't be liquidated by price. In a sample, 9 of 40 ETH longs had a finite value.
- `c.getPerpState(pool)` returns markPrice, indexPrice, fundingRate, nextFundingAt, openInterest, oracle. Funding window is 28,800 s and settlement is hourly (3,600 s).
- Max leverage = 10000 / initialMarginBps (ETH 500 → 20x, ZRO 2000 → 5x).
- 📘 Other functions: `listPerpPositions(account)` (indexer, not marked to market), `getBankruptcyPrice`, `getPerpFeedStatus(pool)`, `previewPerpOrderMargin`, `previewPerpLiquidationPrice`, `placePerpOrder` (no userData field, so tag our orders by tx hash in the DB), and **`placePerpStopOrder` with linked SL/TP**. `liquidationEngineEventsAbi` covers PositionLiquidated, AccountLiquidated, LiquidationFeeCharged, LiquidationKeeperRewardPaid.
- **Liquidation math** (📘 PERPS.md). Liquidation happens when equity == mmReq, where mmReq = `ceil(|size| × mark × mmBps / 10000)` at the current mark:
  ```
  long:  p = mark − (equity − mmReq) × 10000 / (|size| × (10000 − mmBps))
  short: p = mark + (equity − mmReq) × 10000 / (|size| × (10000 + mmBps))
  ```
  A long result ≤ 0 means "unreachable". The raw form scales by oneBase = 1e18. **Call the SDK's pure `perpLiquidationPrice(...)`** rather than reimplementing it.
- **Cross-margin caveat.** One account's collateral backs all of its positions, so the formula holds the other markets still. Label the number "Liq price (if only this market moves)" and add a "cross" badge for accounts in 2+ markets. Linked-wallet (isolated) accounts are exact. For Danger alerts, also show equity/mmReq, which is exact.
- `somnia_watch` is a **subscription type**: `eth_subscribe("somnia_watch", {address, topics, eth_calls})`. Hideki accepted it and returned a subscription id. Calling it as a plain method gives "method not found". `newHeads` streams fine.
- **Batching is required.** The naive probe ran at about 1 position/s, so 11k positions would take hours. To fix it: group by account (one health read per account), batch through Multicall3 at concurrency ~16 with backoff, compute liq prices locally from cached equity/mmReq on each mark tick, and refresh only dirty accounts.

## 3. Day-1 verification tasks (UNVERIFIED: prove each one before building on it)
Write a script per item in `scripts/verify/`. Record the result in `docs/VERIFY.md`, and file any friction in `feedback/`.
1. **Maintenance margin source.** Find the exact read for per-market `maintenanceMarginBps` (it appears in `dist/perp/margin.d.ts`; the docs say it is "exposed nowhere else"). Then check that our local liq price equals `getLiquidationPrice` for at least 20 positions.
2. **Stop orders opening positions.** Can `placePerpStopOrder` place a stop *entry*, or only a reduce/close? Also confirm the order-type enum (IOC/GTC/post-only). Fallback if entries aren't supported: the watcher detects the trigger and the user signs a marketable limit plus SL. Document this in the README.
3. **Reactivity delivery.** Does `somnia_watch` on the LiquidationEngine actually deliver events with eth_call results? If no event arrives within a reasonable window, fall back to `eth_subscribe("logs")` or a 2 s `eth_getLogs` poll.
4. **Batched read speed.** Count unique accounts, then time a full rebuild using Multicall (estimate: 1–3 min) and an incremental update (estimate: seconds).
5. Also check: the liquidation penalty (≤1%?), the paper USDso faucet/credit, Linked Bot permissions (place/cancel/reduce but never withdraw), and whether the indexer schema has liquidation history for backfill.

## 4. Stack
Node 22, TypeScript (strict), pnpm workspaces. Server: Fastify, `ws`, `better-sqlite3`, `grammy` (Telegram). Web: Vite + React. Tailwind is allowed as a utility layer only, with **custom tokens** (Section 9) and no component kits. The heatmap is drawn on hand-rolled Canvas2D (or WebGL), with no chart library. Wallet: viem + injected wallet (MetaMask) with chain 50383 added from the SDK's `hidekiTestnet`. Tests: Vitest. Everything runs as one process (indexer worker + API + WS + bot) that also serves the static web build. Deploy to a VPS or Railway/Fly.

## 5. Repo layout
```
wipeout-map/
  README.md  .env.example  .gitignore  package.json  pnpm-workspace.yaml
  docs/DESIGN.md  docs/VERIFY.md
  probe/                     # original feasibility scripts, kept as evidence
  scripts/verify/*.ts        # day-1 checks
  scripts/smoke.ts           # read-only Hideki smoke test
  server/src/ config.ts discovery.ts health.ts liqmath.ts buckets.ts watcher.ts
              db.ts api.ts ws.ts telegram.ts index.ts
  server/test/ liqmath.test.ts buckets.test.ts
  web/src/ pages/{Map,MyRisk,Feed,About}.tsx
           components/{Heatmap,LiveFeed,DangerMeter,FixSheet,CascadeSheet}.tsx
           lib/{orders.ts,wallet.ts,api.ts}  styles/tokens.css
  bots/demo-seed.ts          # optional; demo positions flagged and hidden by default
  feedback/NN-short-title.md # one file per SDK/doc issue
```

## 6. Data model (SQLite)
```
markets(pool PK, symbol, margin_bank, stop_registry, tick, lot, im_bps, mm_bps, mark, index_px,
        funding_rate, oi, next_funding_at, feed_ok, updated_block)
accounts(account PK, margin_bank, equity, mm_req, im_req, status, markets_count, is_demo_bot,
         updated_block, dirty)
positions(pool, account, PK(pool,account), size_signed, entry, liq_price,
          liq_kind 'finite'|'unreachable', updated_block)
buckets(pool, side, price_lo, price_hi, notional, count, top_accounts_json, computed_at)
liquidations(tx, log_index, PK(tx,log_index), pool, account, side, size, price, penalty, keeper,
             predicted_liq, block, ts)
alerts(chat_id, account, threshold_pct, last_sent_at)
app_orders(tx PK, account, pool, kind 'fix_reduce'|'fix_stop'|'add_margin'|'cascade_entry',
           params_json, status, created_at)
```
**Buckets.** Width = max(tickSize, mark × 0.25%), shown over a ±30% window. Each bucket stores notional = Σ|size|×liqPrice, a count, and the top 3 accounts. A **cluster** is a run of adjacent buckets that is ≥ 2× the median non-empty bucket. Also report the "unreachable" count.
**Refresh cadence.** Mark/funding/OI every 2 s in one multicall. Liq prices are recomputed locally on each tick. Dirty accounts refresh on events. Accounts within 10% of liquidation refresh every 60 s. A full re-sweep runs every 5 min. Health refreshes at each funding settlement.

## 7. API
| Method | Path | Returns |
|---|---|---|
| GET | `/api/markets` | 21 markets: mark, funding, OI, data age, feed_ok |
| GET | `/api/heatmap/:symbol?range=30` | buckets, clusters, mark, asOfBlock, stale flag |
| GET | `/api/account/:address` | positions + liq, distance, cross badge, margin ratio |
| POST | `/api/preview` | {pool, side, qty, price} → margin + projected liq |
| GET | `/api/liquidations?symbol=&limit=` | feed |
| POST | `/api/alerts` | Telegram watch |
| WS | `/ws` | `mark`, `bucket_update`, `liquidation`, `account_risk` |

**Orders are never a server endpoint.** They are built with the SDK in `web/src/lib/orders.ts` and **signed in the browser wallet only**. Each order flow runs a preflight preview, re-reads the chain, gets the signature, records the tx hash, then polls until filled or resting. Reduce orders are reduce-only marketable limits capped at 0.5% slippage. Set stop uses `placePerpStopOrder` with the trigger at liq×1.03 for longs and liq×0.97 for shorts, reduce-only, with an optional linked TP. Add margin is a MarginBank USDso deposit.

## 8. Security rules
- The server holds **no private keys**, ever. No server-side signing.
- **Never commit secrets.** Commit only `.env.example` (RPC_URL, WS_URL, INDEXER_URL, TELEGRAM_BOT_TOKEN=, PORT). `.env*` goes in `.gitignore`, except the example.
- Any demo-bot keys stay in local `.env` only and are never logged.
- Every number shows "as of block N, Xs ago". After 30 s, mark data as stale and grey it out. If `getPerpFeedStatus` is not ok, hide that market's map and disable its orders.

## 9. Visual design direction (mandatory, not generic)
**Forbidden:** default shadcn or Tailwind admin-dashboard looks, purple or blue-violet gradients, stock card grids, glassmorphism, generic KPI tiles, and stock chart-library styling.

**Concept: "thermal seismograph of a coastline."** Price is the depth axis, and liquidation density is heat breaking like a wave. The **hero is a full-bleed heatmap** that fills the viewport. The other panels float over it as thin instrument strips, not boxes.

- **Color tokens** (`styles/tokens.css`):
  `--abyss #07090C` (base), `--trench #0E1217` (panels), `--grid #1B222B` (hairlines), `--foam #E8F1F2` (text), `--silt #7C8893` (muted text), and the heat ramp `--heat-0 #12202A`, `--heat-1 #1F4E5F`, `--heat-2 #E0A100`, `--heat-3 #FF5A1F`, `--heat-4 #FF1E3C`, `--heat-max #FFF4D6` (white-hot). Plus `--mark #3DF5C8` for the mark line and `--safe #4FD18B`. Longs and shorts use the same ramp and are told apart by side and a fine hatch on shorts, not by red/green.
- **Typography:** display **"Unbounded"** (700/800, free; **"Monument Extended"** if licensed) for headlines and market tickers. Numbers and data use **"JetBrains Mono"** (tabular). Body text uses **"Inter Tight"**. Type scale: 12 / 14 / 16 / 20 / 28 / 44 / 72 px. The 72 px size is reserved for the active market's mark price.
- **Layout:** the heatmap takes about 75% of the width and the full height. The live feed is a narrow right rail styled like a seismograph tape. Market tabs run along the top as a ticker strip. My Risk and the Fix/Cascade sheets slide up from the bottom over the map, with no modals and no cards.
- **Motion:**
  - When a liquidation fires, the map **pulses a shockwave ring** at that price (600 ms ease-out). The feed row drops in with a brief heat flash that cools from `--heat-max` to `--heat-2`.
  - When the mark line moves, it glides (150 ms) rather than jumping.
  - Respect `prefers-reduced-motion`. Use no looping decorative animation.
- **Danger meter:** a vertical "depth gauge" for each position, shaped like a water column that drains toward the liq line. It reads Healthy (cool teal), Warning <15% (amber, slow throb), or Danger <5% (red, with a seismic jitter of 1–2 px). The distance % is shown large in mono.
- **Empty and loading states:**
  - While loading, show a slow scanline sweep across the heatmap with "sounding the depths… block N". Do not use spinners or skeleton cards.
  - When a market is thin or empty, show "Calm water: only 26 positions on ZRO" with the unreachable count.
  - When data is stale, desaturate the map and show a "STALE · 42s" stamp.
- **Before coding any UI:** propose **2 visual directions**, each with a 4–6 line moodboard description (palette, type, references, motion feel, one sketch of the hero in words). Then wait for my pick. Direction A should be the thermal/seismic concept above. Direction B is yours (for example, ocean-wave/surf-forecast), and it must be equally distinctive.

## 10. Testing
- **Unit tests (Vitest).** `liqmath`: the local liq price must equal SDK `getLiquidationPrice` and `perpLiquidationPrice` on recorded fixtures (long, short, unreachable, edge cases near zero). Use bigint exactness or ≤1 tick of tolerance. Use the design's example as a sanity case: 2 ETH long, mark $2,312, equity $1,000, mmReq $50 ≈ $1,832. `buckets`: test bucket width, the ±30% window, cluster detection, and unreachable exclusion.
- **Fixtures.** `scripts/record-fixtures.ts` snapshots about 50 real positions plus health from Hideki to JSON.
- **Smoke test.** `pnpm smoke` is a **read-only** run against Hideki: assert chainId 50383, list markets (expect 21), sample holders, compare 10 liq prices against the chain, and report sweep timing. It must not sign or send anything.
- **Order e2e (manual).** On Hideki, from the UI, place 1 reduce-only order, 1 stop with linked SL/TP, 1 deposit, and 1 cascade entry. Record the tx hashes.

## 11. Run commands (must work on a fresh clone)
```
pnpm i
cp .env.example .env
pnpm verify      # day-1 checks
pnpm smoke       # read-only Hideki check
pnpm test
pnpm dev         # server :8787 + vite
pnpm build && pnpm start
```

## 12. Your first output: the phased plan (then ask "Confirm?")
Give a milestone for each date, with tasks, files, and **acceptance criteria** for each phase:
- **Tue Oct 27: Verify.** All Section 3 tasks are done. Get paper USDso and produce 3 real tx hashes (reduce, stop with SL/TP, deposit). *Done when:* VERIFY.md is filled in, the sweep time is measured, and reactivity is a yes or no.
- **Wed Oct 28: Server.** Discovery, health batching, liqmath, buckets, SQLite, `/api/heatmap`, `/api/account`, and the logs poller. *Done when:* curl returns BTC buckets, a real account's liq price matches the chain, and the tests pass.
- **Thu Oct 29: UI read-only.** The 2 visual directions are proposed and one is picked. Build Map, Feed, and My Risk with WS live updates. *Done when:* the heatmap moves with the mark in a browser.
- **Fri Oct 30: Real orders.** Fix sheet, Cascade sheet (mandatory SL, 5x cap), previews, Telegram. *Done when:* orders placed from the UI land on Hideki with their hashes logged.
- **Sat Oct 31: Harden and ship.** Reactivity upgrade if it works, stale/oracle guards, demo bots only if a market is thin, deploy, README, feedback files. *Done when:* the public URL works from a fresh browser.
- **Sun Nov 1: Submit.** 60 s video, X posts, DoraHacks submission by 18:00 UTC.

Cut list if late, in this order: Telegram → extra cascade templates → reactivity (keep the poller) → feed backfill.

## 13. Definition of done
- A public URL shows a live heatmap for all 21 markets, the live feed, and the wallet checker. Every number shows its block and age.
- Real orders are placed on Hideki from the browser wallet: reduce, stop with linked SL/TP, add margin, and a cascade entry with a mandatory SL and a 5x cap.
- `pnpm test` and `pnpm smoke` pass. Local liq prices match the SDK.
- No secrets are in git and the server holds no keys. `.env.example` is present.
- The UI follows the chosen visual direction, with no generic template look.
- The **README** includes: pitch, screenshots, how it works, data-honesty notes (the cross-margin caveat and demo-bot label), run commands, and the fallbacks used. It has a section **"Testnet evidence (tx hashes)"** with Hideki explorer links, and a section **"X posts"** with 2–3 drafted posts tagging **@DreamDEXSomnia**.
- `feedback/` contains one markdown file per SDK or doc issue found (what happened, expected behaviour, repro, suggested fix).
