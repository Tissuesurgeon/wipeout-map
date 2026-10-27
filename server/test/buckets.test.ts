import { describe, expect, it } from "vitest";
import { bucketWidth, buildHeatmap } from "../src/buckets.js";

const ONE = 10n ** 18n;

describe("buckets", () => {
  it("uses the wider of tick and 0.25% of mark", () => {
    expect(bucketWidth(1n, 10_000n)).toBe(25n);
    expect(bucketWidth(40n, 10_000n)).toBe(40n);
  });

  it("keeps finite prices inside ±30% and drops unreachable", () => {
    const mark = 10_000n * ONE;
    const heat = buildHeatmap(mark, ONE, [
      { account: "0xlong", size: 2n * ONE, liqPrice: 9_000n * ONE, oneBase: ONE },
      { account: "0xshort", size: -1n * ONE, liqPrice: 11_000n * ONE, oneBase: ONE },
      { account: "0xfar", size: ONE, liqPrice: 1_000n * ONE, oneBase: ONE },
      { account: "0xsafe", size: 5n * ONE, liqPrice: 0n, oneBase: ONE },
    ]);
    expect(heat.windowLo).toBe(7_000n * ONE);
    expect(heat.windowHi).toBe(13_000n * ONE);
    expect(heat.unreachable).toBe(1);
    expect(heat.outside).toBe(1);
    expect(heat.finite).toBe(3);
    expect(heat.buckets.some((b) => b.side === "long")).toBe(true);
    expect(heat.buckets.some((b) => b.side === "short")).toBe(true);
    expect(heat.buckets.every((b) => b.priceLo >= heat.windowLo && b.priceLo < heat.windowHi)).toBe(true);
  });

  it("clusters a run at least twice the median non-empty bucket", () => {
    const mark = 10_000n * ONE;
    const tick = ONE;
    const base = 9_000n * ONE;
    const positions = [
      { account: "0xa", size: ONE, liqPrice: base, oneBase: ONE },
      { account: "0xb", size: ONE, liqPrice: base + 10n * ONE, oneBase: ONE },
      { account: "0xc", size: 20n * ONE, liqPrice: base + 20n * ONE, oneBase: ONE },
      { account: "0xd", size: 20n * ONE, liqPrice: base + 40n * ONE, oneBase: ONE },
    ];
    const heat = buildHeatmap(mark, tick, positions);
    expect(heat.clusters.length).toBeGreaterThan(0);
    const cluster = heat.clusters[0];
    expect(cluster?.side).toBe("long");
    expect(cluster && cluster.notional > 0n).toBe(true);
  });
});
