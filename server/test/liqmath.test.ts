import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { perpLiquidationPrice } from "@somnia-chain/markets-sdk";
import { describe, expect, it } from "vitest";
import { chainKind, distancePct, liqMatches, liquidationPrice, riskStatus } from "../src/liqmath.js";

const ONE = 10n ** 18n;

describe("liqmath", () => {
  it("matches the design sanity case near $1,832", () => {
    const inputs = {
      equity: 1000n * ONE,
      mmReq: 50n * ONE,
      size: 2n * ONE,
      markPrice: 2312n * ONE,
      maintenanceMarginBps: 100n,
      oneBase: ONE,
    };
    const sdk = perpLiquidationPrice(inputs);
    const local = liquidationPrice(inputs);
    expect(local.kind).toBe("finite");
    expect(local.liqPrice).toBe(sdk);
    const human = Number(local.liqPrice) / 1e18;
    expect(human).toBeGreaterThan(1831);
    expect(human).toBeLessThan(1833);
  });

  it("treats a flat position and an unreachable long as unreachable", () => {
    const flat = liquidationPrice({
      equity: 1000n * ONE,
      mmReq: 50n * ONE,
      size: 0n,
      markPrice: 2312n * ONE,
      maintenanceMarginBps: 100n,
      oneBase: ONE,
    });
    expect(flat.kind).toBe("unreachable");
    expect(perpLiquidationPrice({
      equity: 1000n * ONE,
      mmReq: 50n * ONE,
      size: 0n,
      markPrice: 2312n * ONE,
      maintenanceMarginBps: 100n,
      oneBase: ONE,
    })).toBeNull();

    const buried = liquidationPrice({
      equity: 1_000_000n * ONE,
      mmReq: 1n * ONE,
      size: ONE,
      markPrice: 100n * ONE,
      maintenanceMarginBps: 50n,
      oneBase: ONE,
    });
    expect(buried.kind).toBe("unreachable");
    expect(chainKind(0n)).toBe("unreachable");
    expect(chainKind(null)).toBe("unreachable");
  });

  it("matches a short within a tick of the SDK", () => {
    const inputs = {
      equity: 500n * ONE,
      mmReq: 40n * ONE,
      size: -3n * ONE,
      markPrice: 100n * ONE,
      maintenanceMarginBps: 250n,
      oneBase: ONE,
    };
    const sdk = perpLiquidationPrice(inputs);
    const local = liquidationPrice(inputs);
    expect(local.kind).toBe("finite");
    expect(liqMatches(local.liqPrice, sdk, ONE / 100n)).toBe(true);
  });

  it("classifies distance", () => {
    const mark = 1000n * ONE;
    const warn = distancePct(ONE, mark, 900n * ONE);
    expect(warn).toBeCloseTo(10, 4);
    expect(riskStatus(warn)).toBe("Warning");
    expect(riskStatus(4)).toBe("Danger");
    expect(riskStatus(20)).toBe("Healthy");
    expect(riskStatus(null)).toBe("Healthy");
  });

  it("matches recorded Hideki fixtures when present", () => {
    const path = resolve("fixtures/positions.json");
    if (!existsSync(path)) return;
    const fixture = JSON.parse(readFileSync(path, "utf8")) as {
      positions: {
        equity: string;
        mmReq: string;
        size: string;
        markPrice: string;
        maintenanceMarginBps: string;
        oneBase: string;
        tick: string;
        chainLiq: string | null;
      }[];
    };
    expect(fixture.positions.length).toBeGreaterThan(0);
    let chainHits = 0;
    for (const row of fixture.positions) {
      const inputs = {
        equity: BigInt(row.equity),
        mmReq: BigInt(row.mmReq),
        size: BigInt(row.size),
        markPrice: BigInt(row.markPrice),
        maintenanceMarginBps: BigInt(row.maintenanceMarginBps),
        oneBase: BigInt(row.oneBase),
      };
      const sdk = perpLiquidationPrice(inputs);
      const local = liquidationPrice(inputs);
      expect(local.liqPrice).toBe(sdk ?? 0n);
      const chain = row.chainLiq ? BigInt(row.chainLiq) : 0n;
      if (liqMatches(local.kind === "finite" ? local.liqPrice : 0n, chain, BigInt(row.tick))) chainHits += 1;
    }
    expect(chainHits).toBeGreaterThan(0);
  });
});
