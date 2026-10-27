# Wipeout Map – follow-up 2

## A. MAIN CHANGE: replace the many liquidation lines with 3 "Wipeout Zones", ranked by dollars

Today the BTC map draws about 165 bucket bars plus 17 clusters (live Hideki: 6,155 positions, about $36.5M finite at-risk notional). ETH draws 92 bars and 19 clusters, SOL 130 and 15, HYPE 82 and 11. The user can't see where the money is. On BTC one short zone (about 91.3k–93.5k) holds about **73%** of all at-risk notional, but it looks no different from dozens of thin lines.

**Rule: rank, select and threshold zones only by total USD notional liquidated in the zone** (sum over positions of |size| × liqPrice / oneBase, in USDso). Never rank by position count or density. Count is secondary info only.

### Server (`server/src/zones.ts`, new; called from `buildHeatmap`/`readHeatmap`, recomputed on every sweep and whenever marks move more than 0.5%)
1. Input: every finite position in the market within mark ±30%. For each one, `notionalUsd = |size| * liqPrice / oneBase`. Keep long and short separate (longs sit below mark, shorts above).
2. Fine histogram: bucket width = max(tick, 0.25% of mark), summing **notionalUsd** per bucket (not count).
3. Smooth: run a 5-bucket triangular kernel (weights 1,2,3,2,1) over the notional series per side. Use it only to find peaks and edges. Report sums from the raw buckets.
4. Grow zones: take the highest smoothed peak. Expand left and right while the smoothed value is ≥ 35% of the peak, and allow gaps of up to 2 buckets. Cap zone width at 3% of mark. Mark those buckets as used and repeat on the remaining ones. Merge zones that touch or overlap on the same side.
5. Score: `zone.notionalUsd` = raw sum of notional in the zone. `share` = zone.notionalUsd / market total at-risk notional (both sides, in window).
6. Select by dollars: drop zones with share < 8% or notional < $25k (put both in config). Sort by notionalUsd descending and keep **at most 3**. Zones can be on either side, so the top 3 can all be shorts if that's where the dollars are. If nothing passes, return [] and the UI shows "No dominant wipeout zone: at-risk notional is spread out".
7. Per zone, return: `rank`, `side`, `priceLo`, `priceHi`, `priceMid` (notional-weighted mean liq price), `notionalUsd`, `share`, `positionCount`, `distancePct` (signed, from mark to the nearest edge), `topAccounts` (top 3 by notional), and `callout`, e.g. `"$26.7M of shorts get wiped between 91,290 and 93,490, 14.2% above price"`. Format money as $X.XK/M.
8. Unit tests (`server/test/zones.test.ts`):
   - One huge-dollar zone with few positions beats a dense zone with many small positions. This test is the core of the requirement.
   - Threshold drops small zones.
   - At most 3 zones.
   - Adjacent buckets merge.
   - Long/short separation.
   - Callout format.

### API
`GET /api/zones/:symbol` →
```json
{ "symbol":"BTC","mark":"79925.6","asOfBlock":"…","ageSec":4,"stale":false,
  "totalAtRiskUsd":"36477956","coveragePct":86.4,
  "zones":[{"rank":1,"side":"short","priceLo":"91291","priceHi":"93488","priceMid":"92310",
            "notionalUsd":"26738313","share":0.733,"positionCount":41,"distancePct":14.2,
            "topAccounts":[…],"callout":"$26.7M of shorts get wiped between 91,291 and 93,488, 14.2% above price"}] }
```
Also embed `zones` in `/api/heatmap/:symbol` and push them over WebSocket (`type:"zones"`) after each sweep. Keep raw `buckets` available only behind `?detail=1`.

### UI (Map page)
- By default draw only: the mark line, plus each zone as a translucent full-width band from priceLo to priceHi. Band opacity and glow scale with the zone's share of dollars. Use the heat palette: #1 molten (`--heat-max`, white-hot core and a red edge), #2 orange, #3 amber. Shorts keep the hatch.
- A short tick at priceMid, and a label on the band: `#1 · $26.7M SHORTS · +14.2%` (Unbounded for the rank, JetBrains Mono for numbers).
- **Headline call-out above the map** for zone #1 only: a large Unbounded line with the callout text, the dollar figure in heat-max color, and a "share of all at-risk $" depth bar under it. Zones #2–3 are smaller rows beneath it (dollar figure first, position count in muted text).
- On mobile (390px) the headline plus 3 zone rows sit above the plot, and the plot gets at least 55vh. Remove the current empty gap above the legend.
- A "Show raw buckets" toggle (off by default) restores the current bar rendering at 25% opacity behind the zones.
- Clicking a zone band or row opens the Cascade sheet prefilled from that zone (this replaces the cluster click).
- Shockwave: when a liquidation lands inside a zone, pulse that band and its call-out row, not just a circle.
- States: show a skeleton band and "reading positions… block N" during the first sweep, a STALE stamp that dims the bands, and the "spread out" message when there are no zones.
- Telegram and the X-post copy should reuse `callout`.

## B. Remaining issues, ranked
1. **Feed-mode label is wrong.** The server logs `feed reactivity`, but every new browser shows "polling". `feed_mode` is only broadcast when it changes (`web/src/App.tsx:34` defaults to polling). Send the current mode on WebSocket connect and include `feedMode` in `/api/health`.
2. **Cascade SL can attach to the wrong position or never be placed.** `cascadePositionOpen` (`orders.ts`) returns true if the account already had a position on that side, so the SL gets signed immediately for the old position. The poll also gives up after 90s (`CascadeSheet.tsx:56`, 45×2s) and nothing happens once the sheet is closed. Fix:
   - Record the pre-entry size and wait for the size to change.
   - Persist "SL pending" in localStorage and in the server's `app_orders`.
   - Re-prompt on next app load or whenever My risk shows that position. Show a banner until it is signed.
3. **Testnet evidence is still empty** (README "Testnet evidence"). Sign the 4 sample txs from a funded browser wallet and paste the hashes.
4. **Mobile map:** the plot is only about 200px tall with a large blank area above the legend (`shots/mobile-map.png`). Fix the flex layout so the plot fills the screen.
5. Cascade sheet on mobile: Close should be top-right and the sheet should be a bottom sheet (keep part of the map visible). Show the cap as a number once a wallet is connected.
6. `fillPredictedLiq` uses the *current* position's liq price for historical liquidations (wrong once the position is gone or changed). Store the predicted liq when it is first observed, or mark backfilled rows "n/a".
7. Watch codes are 6 hex characters (`telegram.ts`). Use 8+ characters and add a per-code attempt limit.
