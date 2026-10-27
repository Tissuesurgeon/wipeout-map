// Series-cadence helpers. A binary up/down market belongs to a rolling series
// with a fixed cadence — 1m, 5m, 15m, 1h, 4h, 24h. The indexer stores that
// cadence in seconds on the Market entity's `intervalSec`: for a MarketCreator
// series it is the TRUE cadence the creator emits (patched from
// MarketCreator.MarketCreated, so even a partial first/bootstrap market reports
// the full cadence); otherwise it falls back to the market's own
// `expiry − tradingStart` window. These are the SDK-canonical helpers for
// resolving it and turning it into the compact human label a trade row / market
// row displays.
//
// This lives here (not in the explorer) so every consumer — the explorer, other
// UIs, bots — reads ONE `intervalSec → "15m"` mapping instead of each
// re-deriving `expiry − tradingStart` and hand-rolling the format. The label is
// also stamped onto every {@link BinaryMarket} the SDK returns (as
// `BinaryMarket.interval`), onto trade-history rows (`FillRow.market` /
// `PortfolioTrade.market`), and onto a wallet's ACTIVE positions + open orders
// (`PortfolioPosition.market` / `PortfolioOrder.market`) so a positions row can
// show its contract duration — so most callers never touch these directly.
/**
 *  Resolve a binary market's series cadence in SECONDS: prefer the
 *  indexer-derived `intervalSec`, else fall back to `expiry − tradingStart`.
 *  Returns `null` when neither yields a positive number (SPOT/PERP rows, or a
 *  market missing both signals).
 *
 * @category converting
 */
export function resolveIntervalSec(m) {
    const iv = m.intervalSec != null ? Number(m.intervalSec) : NaN;
    if (Number.isFinite(iv) && iv > 0)
        return iv;
    if (m.tradingStart != null && m.expiry != null) {
        const window = Number(m.expiry) - Number(m.tradingStart);
        if (Number.isFinite(window) && window > 0)
            return window;
    }
    return null;
}
/**
 *  Snap a raw cadence (seconds) to its nearest natural unit — minute (< 1h),
 *  hour (< 1d), else day — but ONLY when the raw value sits within
 *  `toleranceSec` of that unit, i.e. it is genuine off-by-a-second jitter
 *  (899 → 900, 3601 → 3600, 86399 → 86400). A value further than the tolerance
 *  from any unit is a real partial / non-standard window and is returned
 *  UNCHANGED, never bucketed up: `840 → 840` ("14m"), `870 → 870` ("14m30s" is
 *  not clean, so → "870s"), `5400 → 5400` ("90m"), `86100 → 86100` (23h55m,
 *  NOT "24h"). Because a series-registered market carries an EXACT on-chain
 *  `intervalSec`, the snap is a no-op on real cadences; the tolerance only
 *  matters on the `expiry − tradingStart` fallback path. Non-positive → 0.
 *
 * @category converting
 */
export function snapIntervalSec(sec, toleranceSec = 2) {
    if (!Number.isFinite(sec) || sec <= 0)
        return 0;
    if (sec < 60)
        return Math.max(1, Math.round(sec));
    let unit = 86_400;
    if (sec < 3600)
        unit = 60;
    else if (sec < 86_400)
        unit = 3600;
    const snapped = Math.round(sec / unit) * unit;
    return Math.abs(snapped - sec) <= toleranceSec ? snapped : Math.round(sec);
}
/**
 *  The cadences a rolling binary series is currently rolled at, ascending:
 *  1m, 5m, 15m, 1h, 4h, 24h.
 *
 *  A snapshot, and NARROWING. The exact cadence is not a mystery — a series
 *  knows it, and `MarketCreator.MarketCreated` emits it as `intervalSec` for
 *  exactly this purpose ("not derivable from a single market's (tradingStart,
 *  expiry) — a series' FIRST market is a bootstrap partial — so it is surfaced
 *  here for indexers/UIs").
 *
 *  The indexer now DOES read that event and patches the true cadence onto the
 *  Market entity, so for anything a MarketCreator rolled the cadence is exact
 *  and joins by equality — this list, {@link CADENCE_TOLERANCE_SEC},
 *  {@link snapToCadence} and the banded filter are all inert on that path.
 *  They still carry every market the patch does not reach: markets created
 *  directly through the module rather than by a creator, and history indexed
 *  before the patch shipped, both of which fall back to the lossy
 *  `intervalSec = expiry − tradingStart` derivation the contract warns about.
 *  That fallback is why the indexer's distinct values run to a hundred-odd
 *  one-off windows rather than a handful of cadences.
 *
 *  So: still needed, but no longer the primary path. A venue rolling an
 *  off-ladder cadence outside a creator still fragments, so treat the list as
 *  a deployment's current habits, not a rule.
 *
 * @category converting
 */
export const CADENCE_LADDER_SEC = [60, 300, 900, 3600, 14400, 86400];
/**
 *  How far a market's window may sit from a ladder rung and still BE that
 *  cadence — 5 seconds either side. A rolled market's window is
 *  `expiry − tradingStart`, and trading routinely opens a second or two late,
 *  so a 15m market is indexed at 898s or 899s about as often as at 900s.
 *  Treating those as their own cadence is what split one series across three
 *  groups and made a cadence filter silently miss most of its own markets.
 *
 *  Deliberately ABSOLUTE, not proportional: the jitter is a scheduling delay
 *  measured in seconds, so it does not grow with the cadence. A genuinely
 *  different window (a 10-minute series, a 52-minute bootstrap partial) stays
 *  outside every rung and keeps its own identity.
 *
 * @category converting
 */
export const CADENCE_TOLERANCE_SEC = 5;
/**
 *  Snap a raw cadence (seconds) to the {@link CADENCE_LADDER_SEC} rung it is
 *  within {@link CADENCE_TOLERANCE_SEC} of — `898 → 900`, `59 → 60`,
 *  `3599 → 3600` — so scheduling jitter groups and filters as the cadence it
 *  is. A window that matches no rung falls through to {@link snapIntervalSec},
 *  which keeps a genuinely different window out of a cadence it isn't
 *  (`3163 → 3163`, `1437 → 1437`) but still applies its own ±2s unit snap, so
 *  an off-ladder cadence lands on a clean unit rather than on itself:
 *  `598 → 600` ("10m"). Non-positive → 0.
 *
 * @category converting
 */
export function snapToCadence(sec) {
    if (!Number.isFinite(sec) || sec <= 0)
        return 0;
    for (const rung of CADENCE_LADDER_SEC) {
        if (Math.abs(sec - rung) <= CADENCE_TOLERANCE_SEC)
            return rung;
    }
    return snapIntervalSec(sec);
}
/**
 *  The inclusive window of raw `intervalSec` values that count as `cadenceSec`
 *  — `cadenceSec ± ` {@link CADENCE_TOLERANCE_SEC}. This is what turns a
 *  cadence filter into a range predicate server-side, so "15m" returns the
 *  898s and 899s markets of the same series rather than only the exact-900s
 *  ones. Rungs are far enough apart that the bands never overlap.
 *
 *  THROWS on a non-finite or non-positive cadence rather than banding it. The
 *  other helpers here answer 0/null for junk because their callers render the
 *  result; this one's output becomes a Hasura predicate, where `NaN` would go
 *  on the wire as the string `"NaN"` and a `<= 0` cadence would quietly select
 *  a 1–5s band that matches nothing. A filter that silently matches nothing is
 *  the worst of the three outcomes: it looks like an empty result set rather
 *  than the caller error it is.
 *
 * **Gotchas**
 *
 * - Throws RangeError when `cadenceSec` is not a positive finite number.
 *
 * @category converting
 */
export function cadenceBandSec(cadenceSec) {
    if (!Number.isFinite(cadenceSec) || cadenceSec <= 0) {
        throw new RangeError(`cadenceSec must be a positive finite number, got ${cadenceSec}`);
    }
    return {
        minSec: Math.max(1, cadenceSec - CADENCE_TOLERANCE_SEC),
        maxSec: cadenceSec + CADENCE_TOLERANCE_SEC,
    };
}
/**
 *  Compact human label for a cadence in SECONDS, in the largest unit up to hours
 *  that divides it cleanly: `600 → "10m"`, `900 → "15m"`, `3600 → "1h"`,
 *  `14400 → "4h"`, `86400 → "24h"`, `172800 → "48h"`, `90 → "90s"`. Returns
 *  `null` on non-finite/non-positive input (callers pick their own placeholder).
 *  Does NOT snap — pass a snapped value, or use {@link marketIntervalLabel}, to
 *  first shed off-by-one-second noise.
 *
 * @category converting
 */
export function formatIntervalLabel(sec) {
    if (!Number.isFinite(sec) || sec <= 0)
        return null;
    if (sec % 3600 === 0)
        return `${sec / 3600}h`;
    if (sec % 60 === 0)
        return `${sec / 60}m`;
    return `${sec}s`;
}
/**
 *  The served timeframe label for a binary market: resolve the cadence
 *  ({@link resolveIntervalSec}), snap it to its ladder rung
 *  ({@link snapToCadence}), then label it ({@link formatIntervalLabel}) — so a
 *  market reads as `"1m"` / `"5m"` / `"15m"` / `"1h"` / `"4h"` / `"24h"`
 *  whether or not its roll spilled. A window matching no rung (a series'
 *  bootstrap partial, a non-ladder cadence) keeps its own short window.
 *  Returns `null` when the market has no determinable cadence (SPOT/PERP).
 *  This is what the SDK stamps onto `BinaryMarket.interval` and trade-history
 *  rows.
 *
 *  Snapping to the LADDER rather than to the nearest minute/hour is what stops
 *  a row's own badge contradicting the group it was filed under: a 1m member
 *  that rolled 4s late is indexed at 56s, which the plain unit snap has no rung
 *  to reach for and labels `"56s"`.
 *
 * @category converting
 */
export function marketIntervalLabel(m) {
    const sec = resolveIntervalSec(m);
    return sec != null ? formatIntervalLabel(snapToCadence(sec)) : null;
}
