// The exchange API's data structures + the human↔raw conversion helpers.
//
// Field names and shapes follow the conventions exchange bots already speak
// (markets keyed by symbol, books as [price, amount] pairs, orders with
// filled/remaining/status, trades with cost — ccxt-compatible down to the
// field names). Numbers are HUMAN units — right for strategy and display
// code. Every struct carries `info` with the raw SDK/native payload
// (bigints, addresses) for exact math; all escrow arithmetic happens in the
// native engine, never on these floats.
import { formatUnits } from "viem";
import { InvalidInputError } from "../errors.js";
import * as Units from "../units.js";
/**
 * Timeframe string → seconds, matching the indexer's candle intervals.
 *
 * @category models
 */
export const TIMEFRAMES = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
};
// ---------------------------------------------------------------- conversions
/**
 *  Human number → raw integer units: the value the caller typed, scaled to
 *  `decimals`. A number carrying more fraction digits than `decimals` is rounded
 *  to scale — same contract as {@link Units.fromHuman}, which does the work.
 *
 *  Rounding to scale can land ABOVE the caller's number, so a quantity that must
 *  not exceed a balance wants {@link snapToGrid}'s `strict` option, which
 *  truncates instead.
 */
export function toRaw(x, decimals) {
    requireConvertibleAmount(x);
    return Units.fromHuman(x, decimals);
}
// The one definition of a convertible amount, shared by toRaw and floorToRaw so
// the two cannot drift.
function requireConvertibleAmount(x) {
    if (!Number.isFinite(x) || x < 0) {
        throw new InvalidInputError(`invalid amount/price ${x}`);
    }
}
/**
 *  Human number → raw integer units, TRUNCATING anything past `decimals` rather
 *  than rounding it.
 *
 *  {@link toRaw} rounds to scale (half away from zero), so an over-precise number
 *  becomes a raw value ABOVE it: `toRaw(0.1234567, 6)` is `123457`, i.e. 0.123457.
 *  Flooring onto a grid afterwards then starts from an inflated value and can land
 *  above the caller's own number — which is the revert `strict` exists to prevent.
 *  Every quantity the write path floors onto a lot grid converts through this,
 *  never through {@link toRaw}, for the same reason.
 */
export function floorToRaw(x, decimals) {
    requireConvertibleAmount(x);
    // Truncate the number the caller TYPED — `String(x)`, the shortest string that
    // round-trips to the same double — never the double's binary expansion. At six
    // decimals `(1.2).toFixed(26)` is "1.19999999999999995559107901", and cutting
    // that gives 1.199999: one raw unit UNDER an exact input, which a lot floor then
    // turns into a whole lot under (1.1 on a 0.1 lot). Same insight as
    // `Units.humanToDecimalString`, applied to truncation instead of rounding.
    const shortest = String(x);
    // split() always yields a first element; the defaults only satisfy noUncheckedIndexedAccess.
    const [mantissa = shortest, exponent] = shortest.split("e");
    const shift = exponent === undefined ? 0 : Number(exponent);
    if (shift > 0) {
        // String() switches to exponent notation at 1e21, where a double can no
        // longer resolve single units anyway. The non-strict path also rejects these
        // (parseUnits refuses exponent notation) — this keeps it our typed error
        // rather than a bare SyntaxError out of BigInt().
        throw new InvalidInputError(`amount/price ${x} is too large to convert exactly at ${decimals} decimals`);
    }
    // Below 1e-6 String() also uses exponent notation ("1.5e-7"). Move the point
    // ourselves — `toFixed` would spell out the binary expansion again.
    const [intPart = mantissa, fracPart = ""] = mantissa.split(".");
    const digits = intPart + fracPart;
    const point = intPart.length + shift;
    const plain = point <= 0 ? `0.${"0".repeat(-point)}${digits}` : `${digits.slice(0, point)}.${digits.slice(point)}`;
    const [whole, fraction = ""] = plain.split(".");
    return BigInt(whole + fraction.padEnd(decimals, "0").slice(0, decimals));
}
/**
 *  Snap a human number onto a raw-units grid (tick or lot), returning the aligned
 *  human number. Rounds DOWN unless `direction: "up"` is passed.
 *
 *  The alignment happens entirely in bigint space, which is the only space the
 *  answer exists in: the grid is defined in raw integer units, and a float
 *  cannot hold most of its multiples at 18 decimals. Doing it as
 *  `Math.floor(x / tick) * tick` and re-printing with `toFixed` reintroduces the
 *  binary expansion that {@link Units.humanToDecimalString} exists to avoid, and
 *  produced off-tick values 16 times out of 19 on the live venue's ladder.
 *
 *  **Gotchas**
 *
 *  By default a value a hair BELOW a grid point is treated as sitting ON it,
 *  rather than snapped down a whole step. Callers arrive here with computed
 *  prices — a book mid like `(0.001 + 0.009) / 2` is `0.004999999999999999`, and
 *  flooring that to `0.004` would quote a full tick away from what the caller
 *  asked for, silently. The tolerance is one part in `2 ** 52` of the value,
 *  the double's own resolution.
 *
 *  That rounding is right for a price and WRONG for a quantity bounded above.
 *  The tolerance is relative, so it grows with magnitude, and a balance one wei
 *  under a lot boundary would be nudged past it — the "insufficient balance"
 *  revert {@link Units.balanceFloor} exists to prevent. Pass `strict` for those
 *  callers; the result is then never greater than `x`.
 */
export function snapToGrid(x, stepRaw, decimals, options = {}) {
    if (stepRaw <= 0n) {
        throw new InvalidInputError(`invalid grid step ${stepRaw}`);
    }
    const { clamp = false, strict = false, direction = "down" } = options;
    if (strict && direction === "up") {
        throw new InvalidInputError('snapToGrid cannot combine strict with direction "up"');
    }
    const one = 10n ** BigInt(decimals);
    // The clamp below needs room for a step on both sides of the range.
    if (clamp && stepRaw * 2n > one) {
        throw new InvalidInputError(`grid step ${stepRaw} exceeds half of one unit (${one})`);
    }
    const raw = strict ? floorToRaw(x, decimals) : toRaw(x, decimals);
    const remainder = raw % stepRaw;
    const shortfall = stepRaw - remainder;
    // Rounding UP subsumes the near-grid nudge: any remainder at all already moves
    // to the next grid point, so there is nothing for a tolerance to rescue.
    // Rounding DOWN nudges up when `raw` is within a ULP of the next grid point, so
    // the caller's own float error cannot cost a whole step — unless `strict`,
    // which must never return more than `x`. See Gotchas.
    const nudge = remainder !== 0n && (direction === "up" || (!strict && shortfall <= raw / 2n ** 52n));
    const aligned = nudge ? raw + shortfall : raw - remainder;
    if (!clamp)
        return toHumanNum(aligned, decimals);
    if (aligned < stepRaw)
        return toHumanNum(stepRaw, decimals);
    // The upper bound is floored onto the grid too: `one - stepRaw` is only itself
    // a grid point when the step divides one unit evenly (every real venue's does,
    // being a power of ten), and returning an off-grid price would defeat the whole
    // helper.
    const highest = ((one - stepRaw) / stepRaw) * stepRaw;
    if (aligned > highest)
        return toHumanNum(highest, decimals);
    return toHumanNum(aligned, decimals);
}
/**
 *  Raw integer units → human number (display/strategy precision).
 *
 *  Scales via the exact decimal string rather than `Number(raw) / 10 ** decimals`.
 *  The division is a float operation, so it could land a few wei off the value it
 *  was given: `19000000000000000000000` came back as `19000.000000000004`, which
 *  is no longer on a 1e15 grid. That silently un-aligned every quantized price
 *  {@link snapToGrid} had just aligned in bigint space, for about a quarter of
 *  ordinary prices above ~1000. The result is still a double, so it is still
 *  display-grade past ~15 significant digits — but it is now the closest double
 *  to the true value instead of the closest double to a lossy quotient.
 *
 *  A string argument must be a raw INTEGER string, which is what every caller
 *  passes: the indexer types all of these fields as `BigInt`, so they arrive as
 *  stringified integers. A decimal or exponent string ("1.5", "1e5") now throws
 *  from `BigInt()` where the old division silently returned a rescaled number —
 *  it was never a valid raw value, and failing loudly beats scaling it twice.
 */
export function toHumanNum(raw, decimals) {
    if (raw === null || raw === undefined)
        return 0;
    return Number(formatUnits(BigInt(raw), decimals));
}
export function toDatetime(tsMs) {
    return new Date(tsMs).toISOString();
}
/** Map the native order lifecycle onto the unified status vocabulary. */
export function toUnifiedStatus(status) {
    switch (status) {
        case "Open":
            return "open";
        case "Filled":
            return "closed";
        case "Cancelled":
            return "canceled";
        case "Expired":
            return "expired";
        default:
            return "closed"; // "Closed" (spot pre-rest terminal) and anything unknown
    }
}
/**
 *  Decimal places implied by a raw step size (tick/lot) at `decimals` scale —
 *  e.g. tick 1000 at 6dp → 3 price decimals.
 */
export function precisionFromStep(step, decimals) {
    const s = Number(step ?? "1");
    if (!Number.isFinite(s) || s <= 0)
        return decimals;
    const human = s / 10 ** decimals;
    const places = Math.ceil(-Math.log10(human));
    return Math.min(decimals, Math.max(0, places));
}
/** Validate existing wire number/string boundaries before exposing an exact block. */
export function tradeBlockNumber(value, logIndex) {
    if (logIndex !== undefined && (!Number.isSafeInteger(logIndex) || logIndex < 0))
        throw new InvalidInputError("trade logIndex must be a nonnegative safe integer");
    if ((typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) ||
        (typeof value === "string" && !/^[0-9]+$/.test(value))) {
        throw new InvalidInputError("trade blockNumber must be an exact nonnegative integer");
    }
    return value === undefined ? undefined : BigInt(value);
}
