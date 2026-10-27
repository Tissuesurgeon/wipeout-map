import { perpLiquidationPrice, type PerpLiquidationPriceInputs } from "@somnia-chain/markets-sdk";
import { pct } from "./format.js";

export type LiqKind = "finite" | "unreachable";
export type RiskStatus = "Healthy" | "Warning" | "Danger";

export type LiqResult = {
  liqPrice: bigint;
  kind: LiqKind;
};

/**
 * SDK kernel. `null` or `<= 0` is unreachable by price (a long floored at 0,
 * or a flat position). Callers keep the chain's raw value for comparisons.
 */
export function liquidationPrice(inputs: PerpLiquidationPriceInputs): LiqResult {
  const price = perpLiquidationPrice(inputs);
  if (price === null || price <= 0n) return { liqPrice: 0n, kind: "unreachable" };
  return { liqPrice: price, kind: "finite" };
}

export function chainKind(chainPrice: bigint | null): LiqKind {
  if (chainPrice === null || chainPrice <= 0n) return "unreachable";
  return "finite";
}

/** True when the local solve and the chain read agree within one tick. */
export function liqMatches(
  local: bigint | null,
  chain: bigint | null,
  tick: bigint,
): boolean {
  const a = local === null || local <= 0n ? 0n : local;
  const b = chain === null || chain <= 0n ? 0n : chain;
  const tol = tick > 0n ? tick : 1n;
  const diff = a > b ? a - b : b - a;
  return diff <= tol;
}

/**
 * Distance from mark to liquidation, in percent of mark.
 * Positive means the mark still has to travel that far to hit the liq price.
 */
export function distancePct(size: bigint, mark: bigint, liq: bigint): number | null {
  if (size === 0n || mark <= 0n || liq <= 0n) return null;
  const gap = size > 0n ? mark - liq : liq - mark;
  return pct(gap, mark);
}

export function riskStatus(distance: number | null): RiskStatus {
  if (distance === null) return "Healthy";
  if (distance < 5) return "Danger";
  if (distance < 15) return "Warning";
  return "Healthy";
}

/** Margin ratio equity/mmReq. Exact at the account level, unlike a single-market liq price. */
export function marginRatio(equity: bigint, mmReq: bigint): number | null {
  if (mmReq <= 0n) return null;
  return pct(equity, mmReq);
}

export function maxLeverage(imBps: number): number {
  if (imBps <= 0) return 1;
  return 10000 / imBps;
}
