import { selectZones, type Zone } from "./zones.js";

export type Side = "long" | "short";
export type { Zone };

export type BucketPosition = {
  account: string;
  size: bigint;
  liqPrice: bigint;
  oneBase: bigint;
};

export type Bucket = {
  side: Side;
  priceLo: bigint;
  priceHi: bigint;
  notional: bigint;
  count: number;
  topAccounts: { account: string; notional: bigint }[];
};

export type Cluster = {
  side: Side;
  priceLo: bigint;
  priceHi: bigint;
  notional: bigint;
  count: number;
};

export type Heatmap = {
  width: bigint;
  windowLo: bigint;
  windowHi: bigint;
  buckets: Bucket[];
  clusters: Cluster[];
  zones: Zone[];
  totalAtRisk: bigint;
  coveragePct: number;
  unreachable: number;
  outside: number;
  finite: number;
};

export function bucketWidth(tick: bigint, mark: bigint): bigint {
  const quarter = (mark * 25n) / 10_000n;
  const width = tick > quarter ? tick : quarter;
  return width > 0n ? width : 1n;
}

function notionalOf(size: bigint, liqPrice: bigint, oneBase: bigint): bigint {
  const abs = size < 0n ? -size : size;
  const base = oneBase > 0n ? oneBase : 1n;
  return (abs * liqPrice) / base;
}

function median(values: bigint[]): bigint {
  if (values.length === 0) return 0n;
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(sorted.length / 2);
  const left = sorted[mid] ?? 0n;
  if (sorted.length % 2 === 1) return left;
  const right = sorted[mid - 1] ?? left;
  return (left + right) / 2n;
}

/**
 * Bucket finite liquidation prices over mark ± rangePct (default 30).
 * Unreachable prices (0 / null) are counted and omitted from the bars.
 */
export function buildHeatmap(
  mark: bigint,
  tick: bigint,
  positions: readonly BucketPosition[],
  rangePct = 30,
  quoteDecimals = 18,
): Heatmap {
  const width = bucketWidth(tick, mark);
  const span = (mark * BigInt(rangePct)) / 100n;
  const windowLo = mark > span ? mark - span : 0n;
  const windowHi = mark + span;
  const cells = new Map<string, Bucket>();
  let unreachable = 0;
  let outside = 0;
  let finite = 0;

  function cell(side: Side, priceLo: bigint): Bucket {
    const key = `${side}:${priceLo}`;
    const existing = cells.get(key);
    if (existing) return existing;
    const created: Bucket = {
      side,
      priceLo,
      priceHi: priceLo + width,
      notional: 0n,
      count: 0,
      topAccounts: [],
    };
    cells.set(key, created);
    return created;
  }

  for (const position of positions) {
    if (position.liqPrice <= 0n || position.size === 0n) {
      unreachable += 1;
      continue;
    }
    finite += 1;
    if (position.liqPrice < windowLo || position.liqPrice >= windowHi) {
      outside += 1;
      continue;
    }
    const side: Side = position.size > 0n ? "long" : "short";
    const steps = (position.liqPrice - windowLo) / width;
    const priceLo = windowLo + steps * width;
    const bucket = cell(side, priceLo);
    const notion = notionalOf(position.size, position.liqPrice, position.oneBase);
    bucket.notional += notion;
    bucket.count += 1;
    bucket.topAccounts.push({ account: position.account, notional: notion });
  }

  const buckets = [...cells.values()].sort((a, b) =>
    a.priceLo < b.priceLo ? -1 : a.priceLo > b.priceLo ? 1 : a.side < b.side ? -1 : 1,
  );
  for (const bucket of buckets) {
    bucket.topAccounts.sort((a, b) => (a.notional < b.notional ? 1 : -1));
    bucket.topAccounts = bucket.topAccounts.slice(0, 3);
  }

  const clusters = detectClusters(buckets);
  const book = selectZones(mark, tick, positions, quoteDecimals, rangePct);
  return {
    width,
    windowLo,
    windowHi,
    buckets,
    clusters,
    zones: book.zones,
    totalAtRisk: book.totalAtRisk,
    coveragePct: book.coveragePct,
    unreachable,
    outside,
    finite,
  };
}

export function detectClusters(buckets: readonly Bucket[]): Cluster[] {
  const notionals = buckets.filter((b) => b.notional > 0n).map((b) => b.notional);
  const mid = median(notionals);
  const threshold = mid * 2n;
  if (threshold <= 0n) return [];

  const clusters: Cluster[] = [];
  for (const side of ["long", "short"] as const) {
    const sideBuckets = buckets
      .filter((b) => b.side === side && b.notional > 0n)
      .sort((a, b) => (a.priceLo < b.priceLo ? -1 : 1));
    let run: Bucket[] = [];
    const flush = () => {
      if (run.length === 0) return;
      const notional = run.reduce((sum, b) => sum + b.notional, 0n);
      const count = run.reduce((sum, b) => sum + b.count, 0);
      const first = run[0];
      const last = run[run.length - 1];
      if (first && last && notional >= threshold) {
        clusters.push({
          side,
          priceLo: first.priceLo,
          priceHi: last.priceHi,
          notional,
          count,
        });
      }
      run = [];
    };
    for (const bucket of sideBuckets) {
      const prev = run[run.length - 1];
      if (prev && bucket.priceLo !== prev.priceHi && bucket.priceLo !== prev.priceLo) {
        flush();
      }
      run.push(bucket);
    }
    flush();
  }
  return clusters;
}
