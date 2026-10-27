import { formatUnits } from "viem";
import { bucketWidth, type BucketPosition, type Side } from "./buckets.js";

export const ZONE_MIN_SHARE = 0.08;
export const ZONE_MIN_USD = 25_000;
export const ZONE_PEAK_RATIO = 35n;
export const ZONE_MAX_GAP = 2;
export const ZONE_MAX_WIDTH_PCT = 3n;
export const ZONE_MAX_COUNT = 3;
export const ZONE_MARK_MOVE_BPS = 50n;

export type Zone = {
  rank: number;
  side: Side;
  priceLo: bigint;
  priceHi: bigint;
  priceMid: bigint;
  notionalUsd: bigint;
  share: number;
  positionCount: number;
  distancePct: number;
  topAccounts: { account: string; notional: bigint }[];
  callout: string;
};

export type ZoneBook = {
  zones: Zone[];
  totalAtRisk: bigint;
  coveragePct: number;
};

type Cell = {
  notional: bigint;
  count: number;
  weighted: bigint;
  accounts: Map<string, bigint>;
};

function notionalOf(size: bigint, liqPrice: bigint, oneBase: bigint): bigint {
  const abs = size < 0n ? -size : size;
  const base = oneBase > 0n ? oneBase : 1n;
  return (abs * liqPrice) / base;
}

function smooth(raw: readonly bigint[]): bigint[] {
  const weights = [1n, 2n, 3n, 2n, 1n];
  return raw.map((_, index) => {
    let acc = 0n;
    let div = 0n;
    for (let offset = -2; offset <= 2; offset++) {
      const at = index + offset;
      if (at < 0 || at >= raw.length) continue;
      const weight = weights[offset + 2] ?? 0n;
      acc += (raw[at] ?? 0n) * weight;
      div += weight;
    }
    return div === 0n ? 0n : acc / div;
  });
}

function formatMoney(value: bigint, decimals: number): string {
  const amount = Number(formatUnits(value, decimals));
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatPrice(value: bigint, decimals: number): string {
  const amount = Number(formatUnits(value, decimals));
  return amount.toLocaleString("en-US", { maximumFractionDigits: amount >= 100 ? 0 : 2 });
}

export function formatCallout(
  side: Side,
  notional: bigint,
  priceLo: bigint,
  priceHi: bigint,
  distancePct: number,
  decimals: number,
): string {
  const where = distancePct >= 0 ? "above" : "below";
  return `${formatMoney(notional, decimals)} of ${side}s get wiped between ${formatPrice(priceLo, decimals)} and ${formatPrice(priceHi, decimals)}, ${Math.abs(distancePct).toFixed(1)}% ${where} price`;
}

function distanceToNearest(mark: bigint, priceLo: bigint, priceHi: bigint): number {
  let edge = priceLo;
  if (mark <= priceLo) edge = priceLo;
  else if (mark >= priceHi) edge = priceHi;
  else edge = mark - priceLo <= priceHi - mark ? priceLo : priceHi;
  const signed = edge >= mark ? edge - mark : -(mark - edge);
  if (mark === 0n) return 0;
  return Number((signed * 10_000n) / mark) / 100;
}

function growSide(
  raw: readonly bigint[],
  smoothed: readonly bigint[],
  width: bigint,
  windowLo: bigint,
  mark: bigint,
): { lo: number; hi: number }[] {
  const count = raw.length;
  const used = new Array<boolean>(count).fill(false);
  const maxWidth = (mark * ZONE_MAX_WIDTH_PCT) / 100n;
  const spans: { lo: number; hi: number }[] = [];

  const fits = (lo: number, hi: number) => {
    const priceLo = windowLo + BigInt(lo) * width;
    const priceHi = windowLo + BigInt(hi + 1) * width;
    return priceHi - priceLo <= maxWidth;
  };

  while (true) {
    let peak = -1;
    let peakVal = 0n;
    for (let index = 0; index < count; index++) {
      if (used[index]) continue;
      const value = smoothed[index] ?? 0n;
      if (value > peakVal) {
        peakVal = value;
        peak = index;
      }
    }
    if (peak < 0 || peakVal === 0n) break;
    const floor = (peakVal * ZONE_PEAK_RATIO) / 100n;
    let lo = peak;
    let hi = peak;

    const step = (dir: -1 | 1) => {
      const edge = dir < 0 ? lo : hi;
      for (let span = 1; span <= ZONE_MAX_GAP + 1; span++) {
        const idx = edge + dir * span;
        if (idx < 0 || idx >= count || used[idx]) return;
        const nextLo = Math.min(lo, idx);
        const nextHi = Math.max(hi, idx);
        if (!fits(nextLo, nextHi)) return;
        if ((smoothed[idx] ?? 0n) < floor) continue;
        for (let fill = edge + dir; dir < 0 ? fill >= idx : fill <= idx; fill += dir) used[fill] = false;
        if (dir < 0) lo = idx;
        else hi = idx;
        return;
      }
    };

    used[peak] = true;
    let grew = true;
    while (grew) {
      const beforeLo = lo;
      const beforeHi = hi;
      step(-1);
      step(1);
      for (let index = lo; index <= hi; index++) used[index] = true;
      grew = lo !== beforeLo || hi !== beforeHi;
    }
    spans.push({ lo, hi });
  }
  return spans;
}

function mergeSpans(spans: { lo: number; hi: number }[], width: bigint, windowLo: bigint, mark: bigint): { lo: number; hi: number }[] {
  const ordered = [...spans].sort((a, b) => a.lo - b.lo);
  const maxWidth = (mark * ZONE_MAX_WIDTH_PCT) / 100n;
  const merged: { lo: number; hi: number }[] = [];
  for (const span of ordered) {
    const prev = merged[merged.length - 1];
    if (!prev || span.lo > prev.hi + 1) {
      merged.push({ ...span });
      continue;
    }
    const nextHi = Math.max(prev.hi, span.hi);
    const priceLo = windowLo + BigInt(prev.lo) * width;
    const priceHi = windowLo + BigInt(nextHi + 1) * width;
    if (priceHi - priceLo <= maxWidth) prev.hi = nextHi;
    else merged.push({ ...span });
  }
  return merged;
}

export function selectZones(
  mark: bigint,
  tick: bigint,
  positions: readonly BucketPosition[],
  quoteDecimals: number,
  rangePct = 30,
): ZoneBook {
  if (mark <= 0n) return { zones: [], totalAtRisk: 0n, coveragePct: 0 };
  const width = bucketWidth(tick, mark);
  const span = (mark * BigInt(rangePct)) / 100n;
  const windowLo = mark > span ? mark - span : 0n;
  const windowHi = mark + span;
  const count = Number((windowHi - windowLo) / width);
  if (count <= 0 || count > 20_000) return { zones: [], totalAtRisk: 0n, coveragePct: 0 };

  const sides: Record<Side, Cell[]> = {
    long: Array.from({ length: count }, () => ({ notional: 0n, count: 0, weighted: 0n, accounts: new Map() })),
    short: Array.from({ length: count }, () => ({ notional: 0n, count: 0, weighted: 0n, accounts: new Map() })),
  };
  let total = 0n;
  for (const position of positions) {
    if (position.liqPrice <= 0n || position.size === 0n) continue;
    if (position.liqPrice < windowLo || position.liqPrice >= windowHi) continue;
    const side: Side = position.size > 0n ? "long" : "short";
    const index = Number((position.liqPrice - windowLo) / width);
    const cell = sides[side][index];
    if (!cell) continue;
    const notion = notionalOf(position.size, position.liqPrice, position.oneBase);
    cell.notional += notion;
    cell.count += 1;
    cell.weighted += notion * position.liqPrice;
    cell.accounts.set(position.account, (cell.accounts.get(position.account) ?? 0n) + notion);
    total += notion;
  }
  if (total === 0n) return { zones: [], totalAtRisk: 0n, coveragePct: 0 };

  const minNotional = BigInt(ZONE_MIN_USD) * 10n ** BigInt(quoteDecimals);
  const found: Zone[] = [];
  for (const side of ["long", "short"] as const) {
    const cells = sides[side];
    const raw = cells.map((cell) => cell.notional);
    const smoothed = smooth(raw);
    const spans = mergeSpans(growSide(raw, smoothed, width, windowLo, mark), width, windowLo, mark);
    for (const span of spans) {
      let notional = 0n;
      let positionsInZone = 0;
      let weighted = 0n;
      const accounts = new Map<string, bigint>();
      for (let index = span.lo; index <= span.hi; index++) {
        const cell = cells[index];
        if (!cell) continue;
        notional += cell.notional;
        positionsInZone += cell.count;
        weighted += cell.weighted;
        for (const [account, value] of cell.accounts) accounts.set(account, (accounts.get(account) ?? 0n) + value);
      }
      if (notional === 0n) continue;
      if (notional * 1000n < total * 80n || notional < minNotional) continue;
      const priceLo = windowLo + BigInt(span.lo) * width;
      const priceHi = windowLo + BigInt(span.hi + 1) * width;
      const distancePct = distanceToNearest(mark, priceLo, priceHi);
      const topAccounts = [...accounts.entries()]
        .sort((a, b) => (a[1] < b[1] ? 1 : -1))
        .slice(0, 3)
        .map(([account, value]) => ({ account, notional: value }));
      found.push({
        rank: 0,
        side,
        priceLo,
        priceHi,
        priceMid: weighted / notional,
        notionalUsd: notional,
        share: Number((notional * 1_000_000n) / total) / 1_000_000,
        positionCount: positionsInZone,
        distancePct,
        topAccounts,
        callout: formatCallout(side, notional, priceLo, priceHi, distancePct, quoteDecimals),
      });
    }
  }

  const zones = found
    .sort((a, b) => (a.notionalUsd < b.notionalUsd ? 1 : a.notionalUsd > b.notionalUsd ? -1 : 0))
    .slice(0, ZONE_MAX_COUNT)
    .map((zone, index) => ({ ...zone, rank: index + 1 }));
  const covered = zones.reduce((sum, zone) => sum + zone.notionalUsd, 0n);
  return {
    zones,
    totalAtRisk: total,
    coveragePct: Number((covered * 10_000n) / total) / 100,
  };
}

export function markMoved(previous: bigint, next: bigint): boolean {
  if (previous <= 0n || next <= 0n) return true;
  const diff = next > previous ? next - previous : previous - next;
  return diff * 10_000n > previous * ZONE_MARK_MOVE_BPS;
}
