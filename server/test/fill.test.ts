import { describe, expect, it } from "vitest";
import { sizeMovedEnough } from "../../web/src/lib/fill.ts";

const lot = 100n;
const qty = 1_000n;

describe("sizeMovedEnough", () => {
  it("ignores an unchanged size", () => {
    expect(sizeMovedEnough(500n, 500n, true, qty, lot)).toBe(false);
  });

  it("rejects a move the wrong way", () => {
    expect(sizeMovedEnough(-1_000n, 0n, true, qty, lot)).toBe(false);
    expect(sizeMovedEnough(1_000n, 0n, false, qty, lot)).toBe(false);
  });

  it("rejects a partial fill short of quantity minus one lot", () => {
    expect(sizeMovedEnough(800n, 0n, true, qty, lot)).toBe(false);
  });

  it("accepts a fill of at least quantity minus one lot on the entry side", () => {
    expect(sizeMovedEnough(900n, 0n, true, qty, lot)).toBe(true);
    expect(sizeMovedEnough(-900n, 0n, false, qty, lot)).toBe(true);
  });

  it("accepts a one-lot order once size moves one unit that way", () => {
    expect(sizeMovedEnough(1n, 0n, true, lot, lot)).toBe(true);
    expect(sizeMovedEnough(0n, 0n, true, lot, lot)).toBe(false);
  });

  it("never treats a missing quantity as a fill", () => {
    expect(sizeMovedEnough(5_000n, 0n, true, 0n, lot)).toBe(false);
  });
});
