// Aave ray math — the minimal subset the lend reads need to turn scaled
// balances + stored indexes into current balances at head. Mirrors Aave v3's
// WadRayMath.rayMul (half-up) and MathUtils.calculate{Linear,Compounded}Interest
// exactly, so SDK-computed balances match what the Pool would settle.

/**
 * One ray — Aave's 27-decimal fixed-point unit; rates and indexes are ray-scaled.
 *
 * @category lending
 */
export const RAY = 10n ** 27n;
const HALF_RAY = RAY / 2n;
const SECONDS_PER_YEAR = 31_536_000n;

/**
 * Ray-multiply two ray fixed-point numbers, rounding half-up (Aave WadRayMath.rayMul).
 *
 * @category lending
 */
export function rayMul(a: bigint, b: bigint): bigint {
  return (a * b + HALF_RAY) / RAY;
}

/**
 *  Grow a supply-side index linearly from `lastUpdateTimestamp` to `nowSec` at
 *  `rateRay` (Aave accrues deposit interest linearly between updates). Returns
 *  the ray index current to `nowSec`.
 *
 * @category lending
 */
export function accrueLinear(indexRay: bigint, rateRay: bigint, lastUpdateTimestamp: number, nowSec: number): bigint {
  const dt = BigInt(Math.max(0, nowSec - lastUpdateTimestamp));
  if (dt === 0n) return indexRay;
  const interest = RAY + (rateRay * dt) / SECONDS_PER_YEAR;
  return rayMul(indexRay, interest);
}

/**
 *  Grow a borrow-side index compounded from `lastUpdateTimestamp` to `nowSec` at
 *  `rateRay`, using Aave's three-term binomial expansion of (1+r/s)^dt (MathUtils
 *  .calculateCompoundedInterest). Returns the ray index current to `nowSec`.
 *
 * @category lending
 */
export function accrueCompounded(
  indexRay: bigint,
  rateRay: bigint,
  lastUpdateTimestamp: number,
  nowSec: number,
): bigint {
  const dt = BigInt(Math.max(0, nowSec - lastUpdateTimestamp));
  if (dt === 0n) return indexRay;
  const dtMinusOne = dt > 1n ? dt - 1n : 0n;
  const dtMinusTwo = dt > 2n ? dt - 2n : 0n;
  // Operation order matters and mirrors MathUtils exactly: dividing the rate by
  // SECONDS_PER_YEAR up front truncates early and understates debt by wei
  // relative to what the Pool settles.
  const basePowerTwo = rayMul(rateRay, rateRay) / (SECONDS_PER_YEAR * SECONDS_PER_YEAR);
  const basePowerThree = rayMul(basePowerTwo, rateRay) / SECONDS_PER_YEAR;
  const secondTerm = (dt * dtMinusOne * basePowerTwo) / 2n;
  const thirdTerm = (dt * dtMinusOne * dtMinusTwo * basePowerThree) / 6n;
  const interest = RAY + (rateRay * dt) / SECONDS_PER_YEAR + secondTerm + thirdTerm;
  return rayMul(indexRay, interest);
}

/**
 * Convert a ray annual rate (a reserve's `liquidityRateRay` / `variableBorrowRateRay`)
 * to the per-second-compounded APY fraction Aave UIs display (0.05 = 5%).
 *
 * **When to use**
 *
 * Use to display a rate — this exists so apps don't each re-derive
 * `(1 + r/s)^s - 1` from the ray rate. Position math stays in bigint ray space
 * ({@link rayMul}, {@link accrueCompounded}).
 *
 * **Details**
 *
 * - `rateRay`: Annual rate in ray (1e27) units, as returned in {@link LendReserve}.
 * - Returns: The compounded annual yield as a plain fraction (`0.031` ⇒ 3.1% APY).
 *
 * **Gotchas**
 *
 * Display-only — the one place the lend surface hands back a `number`.
 *
 * **Example** (Converting a ray rate)
 *
 * ```ts
 * const reserves = await lend.listReserves();
 * const usdso = reserves.find((r) => r.symbol === "USDso");
 * if (usdso) console.log(`supply APY ${(lendRayRateToApy(usdso.liquidityRateRay) * 100).toFixed(2)}%`);
 * ```
 *
 * @category lending
 */
export function lendRayRateToApy(rateRay: bigint): number {
  const ratePerYear = Number(rateRay) / 1e27;
  const secondsPerYear = Number(SECONDS_PER_YEAR);
  return (1 + ratePerYear / secondsPerYear) ** secondsPerYear - 1;
}
