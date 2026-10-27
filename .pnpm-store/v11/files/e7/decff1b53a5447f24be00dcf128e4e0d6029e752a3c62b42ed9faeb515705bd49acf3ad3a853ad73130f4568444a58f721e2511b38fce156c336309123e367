/**
 *  The minimal market shape needed to resolve a cadence — a structural subset of
 *  {@link BinaryMarket}, so these helpers stay dependency-free (no import cycle
 *  with the concept modules) and accept either the indexed row or a hand-built object.
 *  Fields accept the indexer's decimal strings OR plain numbers.
 *
 * @category converting
 */
export type IntervalSource = {
    /** Series cadence in seconds, as the indexer derived it (may be null on a
     *  row that predates the field, or on SPOT/PERP). */
    intervalSec?: string | number | null;
    /** Unix seconds trading opened. */
    tradingStart?: string | number | null;
    /** Unix seconds trading ends / the outcome is decided. */
    expiry?: string | number | null;
};
/**
 *  Resolve a binary market's series cadence in SECONDS: prefer the
 *  indexer-derived `intervalSec`, else fall back to `expiry − tradingStart`.
 *  Returns `null` when neither yields a positive number (SPOT/PERP rows, or a
 *  market missing both signals).
 *
 * @category converting
 */
export declare function resolveIntervalSec(m: IntervalSource): number | null;
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
export declare function snapIntervalSec(sec: number, toleranceSec?: number): number;
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
export declare const CADENCE_LADDER_SEC: readonly [60, 300, 900, 3600, 14400, 86400];
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
export declare const CADENCE_TOLERANCE_SEC = 5;
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
export declare function snapToCadence(sec: number): number;
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
export declare function cadenceBandSec(cadenceSec: number): {
    minSec: number;
    maxSec: number;
};
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
export declare function formatIntervalLabel(sec: number): string | null;
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
export declare function marketIntervalLabel(m: IntervalSource): string | null;
