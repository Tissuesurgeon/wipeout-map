import { describe, expect, it } from "vitest";
import { selectZones } from "../src/zones.js";

const ONE = 10n ** 18n;
const MARK = 100_000n * ONE;
const TICK = ONE;

function at(account: string, sizeHuman: bigint, priceHuman: bigint) {
  return {
    account,
    size: sizeHuman * ONE,
    liqPrice: priceHuman * ONE,
    oneBase: ONE,
  };
}

describe("zones", () => {
  it("ranks a few large positions above a dense crowd of small ones", () => {
    const positions = [
      at("0xwhale1", -40n, 102_000n),
      at("0xwhale2", -40n, 102_200n),
      ...Array.from({ length: 30 }, (_, index) => at(`0xsmall${index}`, 1n, 95_000n + BigInt(index) * 20n)),
    ];
    const book = selectZones(MARK, TICK, positions, 18);
    expect(book.zones[0]?.side).toBe("short");
    expect(book.zones[0]?.positionCount).toBe(2);
    expect(book.zones[0] && book.zones[1] && book.zones[0].notionalUsd > book.zones[1].notionalUsd).toBe(true);
    expect(book.zones[1]?.positionCount).toBe(30);
  });

  it("drops a zone under $25k", () => {
    const book = selectZones(MARK, TICK, [{ account: "0xsmall", size: ONE / 5n, liqPrice: 90_000n * ONE, oneBase: ONE }], 18);
    expect(book.zones).toEqual([]);
  });

  it("keeps at most three zones", () => {
    const book = selectZones(MARK, TICK, [
      at("0xa", 40n, 104_000n),
      at("0xb", 30n, 110_000n),
      at("0xc", 20n, 116_000n),
      at("0xd", 10n, 122_000n),
    ], 18);
    expect(book.zones).toHaveLength(3);
    expect(book.zones.map((zone) => zone.positionCount)).toEqual([1, 1, 1]);
    expect(book.zones.every((zone, index) => !book.zones[index + 1] || zone.notionalUsd >= book.zones[index + 1]!.notionalUsd)).toBe(true);
  });

  it("merges adjacent buckets into one zone", () => {
    const book = selectZones(MARK, TICK, [
      at("0xa", 20n, 103_000n),
      at("0xb", 20n, 103_400n),
    ], 18);
    expect(book.zones).toHaveLength(1);
    expect(book.zones[0]?.positionCount).toBe(2);
    expect(book.zones[0] && book.zones[0].priceHi > book.zones[0].priceLo).toBe(true);
  });

  it("keeps longs and shorts apart", () => {
    const book = selectZones(MARK, TICK, [
      at("0xlong", 20n, 95_000n),
      at("0xshort", -20n, 105_000n),
    ], 18);
    expect(book.zones.map((zone) => zone.side).sort()).toEqual(["long", "short"]);
  });

  it("writes the dollar callout", () => {
    const book = selectZones(MARK, TICK, [at("0xshort", -200n, 105_000n)], 18);
    expect(book.zones[0]?.callout).toMatch(
      /^\$[0-9.]+[KM]? of shorts get wiped between [\d,]+ and [\d,]+, [0-9.]+% above price$/,
    );
  });
});
