# Wipeout Map – follow-up 3: redesign + remaining bugs

**Use direction: A (Seismic Ledger).**

Reference mockup, built from live Hideki zone data: `mockups/A-desktop.png` and `mockups/A-mobile.png` (HTML source `mockups/A.html`). Match it closely.

Goal: in 2 seconds the screen answers **which market · where the biggest wipeout is · how big ($) · how far from price · longs or shorts · what I can do**. Everything else is secondary. Keep all data, API and order logic. This is a presentation rewrite.

Rules:
- The $ figure of zone #1 is the single largest element on screen.
- Use one sentence of copy: the server `callout`.
- Never show raw 18-decimal numbers, "n/a" rows, or hex addresses in primary views. Shorten addresses to 0x1234…abcd, and only show them in detail views.
- Max 3 zones. Raw buckets stay behind an off-by-default toggle in a "Details" drawer.
- Min body text 14px, min label 11px (letter-spacing 0.12em). WCAG AA contrast.
- Respect `prefers-reduced-motion`.

---
## Direction A — "Seismic Ledger" (dark, one market in focus)

**Tokens:**
- `--bg #0A0B0D`, `--panel #121417`, `--line #1C1F24`, `--ink #F2EDE4`, `--mute #7D8288`
- `--mark #46F2C6` (mark price only)
- Zone heat: `--z1 #FF3B1F`, `--z2 #FF8A1F`, `--z3 #FFC23D`
- Long text `#FF8A1F`, short text `#FFC23D`
- Radius 12 (buttons), 999 (pills). Spacing scale 4/8/12/16/24/32.
- No gradients except the share bar (amber→red) and zone glows.

**Type:**
- Unbounded 800 for the hero $ figure (76px desktop / 52px mobile, letter-spacing -0.03em, warm glow `text-shadow 0 0 40px rgba(255,59,31,.45)`) and for stat numbers.
- Inter Tight 500 for the sentence (22/17px).
- JetBrains Mono for all prices, labels and tape.

**Layout, desktop:**
- 56px top bar: wordmark `WIPEOUT/MAP`, market pills showing `SYMBOL $zone#1` (active pill shows $ in red; sorted by zone-#1 $ descending), Connect pill on the right in mint outline.
- 3-column grid `440px | 1fr | 260px`.
  - **Left = Wipeout Card:**
    - eyebrow `BTC · BIGGEST WIPEOUT · SHORTS`
    - hero $
    - sentence "of shorts get liquidated between 91,706 and 94,109."
    - 3 stats (From price +14.5% / Share of at-risk $ 73% / Positions 22)
    - share bar
    - two buttons: primary cream "Ride the cascade", secondary "Check my risk"
    - compact list of zones #1–#3 (swatch, $, side, range, distance, pos)
  - **Center = Price Ladder:**
    - vertical axis mark ±22%, 7 dashed gridlines, mono labels on the left
    - mark line 2px mint with glow and a filled mint chip `MARK 80,092`
    - zones are full-width bands: 18% fill of zone color, 1px top/bottom borders, outer glow, label left `#1 $26.6M SHORTS` and range right
    - a thin vertical guide from the mark to zone #1 with the label `↑ +14.5% to wipeout`
  - **Right = Live tape:** header `● LIVE · REACTIVITY` (dot in mint, or amber + "POLLING"); 8 rows max, `SIDE SYM size @ price   age`; no hashes.

**Layout, mobile (390):**
- Top bar wraps to wordmark + Connect, then a horizontally scrolling pill row.
- Then the Wipeout Card (zones list hidden), the ladder (380px tall), then the tape.
- Bottom tab bar: Map / My risk / Tape / About.

**Other pages:**
- **My risk:** the same card language. Per position, a card with a vertical depth gauge (mark line to liq line, filled by distance, red under 5%), liq price large, status pill, and a big "Fix" button. Wallet empty state: "Paste an address or connect a wallet."
- **Fix / Cascade:** right-side drawer (desktop, 420px) or bottom sheet (mobile, 85vh, drag handle, Close top-right). Inputs in mono, caps shown as numbers, primary action cream.
- **Feed:** a table with time, market, side, size, price, predicted-vs-actual chip (hit/miss/—).
- **About:** an editorial single column, max-width 680.

**Motion:**
- Zone #1 band "breathes" (box-shadow 2.4s ease-in-out).
- Mark chip eases between values (300ms).
- A liquidation landing in a zone runs a 600ms shockwave: the band flashes white-hot to its color, the tape row slides in with a red underline, and the hero $ ticks up if the zone changes.
- Market switch is a 200ms crossfade.

**States:**
- First sweep: skeleton card plus a ladder with a scanning line, "Reading 11k positions… block N".
- Stale (>30s): the card dims to 60% with an amber `STALE 42s` pill.
- No zones: "No dominant wipeout: at-risk $ is spread out" plus a muted ladder.
- Feed down: a muted tape header.

---
## Section 2 — functional bugs, ranked
1. **Zone #1 label unreadable.** Cream/white text on the cream hatched band (`web/src/components/Heatmap.tsx`, zone label draw). The redesign fixes this. If you keep the canvas, draw labels outside the band or with a dark pill.
2. **Testnet evidence still empty** (README "Testnet evidence"). Sign the 4 txs with a funded browser wallet and paste the hashes.
3. `/api/heatmap/:symbol` still returns `buckets` and `clusters` by default. Only return them with `?detail=1`, and drop the legacy cluster click path.
4. `cascadeFilled` (`web/src/lib/orders.ts:202-212`) treats any size change as a fill. Require the size to move in the entry direction by ≥ the ordered quantity minus one lot.
5. Tape rows show "n/a" for predicted liq on almost every row. Hide the chip when unknown.
6. The LONGS/SHORTS axis captions are meaningless now that zones span full width. Remove them.
7. Feed and My risk show full hex addresses. Shorten them.
