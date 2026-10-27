/**
 * One ray — Aave's 27-decimal fixed-point unit; rates and indexes are ray-scaled.
 *
 * @category lending
 */
export declare const RAY: bigint;
/**
 * Ray-multiply two ray fixed-point numbers, rounding half-up (Aave WadRayMath.rayMul).
 *
 * @category lending
 */
export declare function rayMul(a: bigint, b: bigint): bigint;
/**
 *  Grow a supply-side index linearly from `lastUpdateTimestamp` to `nowSec` at
 *  `rateRay` (Aave accrues deposit interest linearly between updates). Returns
 *  the ray index current to `nowSec`.
 *
 * @category lending
 */
export declare function accrueLinear(indexRay: bigint, rateRay: bigint, lastUpdateTimestamp: number, nowSec: number): bigint;
/**
 *  Grow a borrow-side index compounded from `lastUpdateTimestamp` to `nowSec` at
 *  `rateRay`, using Aave's three-term binomial expansion of (1+r/s)^dt (MathUtils
 *  .calculateCompoundedInterest). Returns the ray index current to `nowSec`.
 *
 * @category lending
 */
export declare function accrueCompounded(indexRay: bigint, rateRay: bigint, lastUpdateTimestamp: number, nowSec: number): bigint;
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
export declare function lendRayRateToApy(rateRay: bigint): number;
