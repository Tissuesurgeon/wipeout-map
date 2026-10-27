import type { PerpPortfolioMarket } from "./perp/portfolio.js";
import type { SpotPortfolioMarket } from "./spot/portfolio.js";
import type { PortfolioMarket } from "./binary/portfolio.js";
import type { OrderMarket } from "./orders.js";
import type { RawMarketRow, BinaryMarket, SpotMarket, PerpMarket } from "./markets.js";
/**
 *  Is `Wire` the wire spelling of the public 0x type `Pub`?
 *
 *  Hasura has no address/hash scalar — every one arrives as `String` — so a public
 *  `Address` / `Hex` backed by a wire `string` is the INTENDED narrowing (done at
 *  the `toMarket` seam by `asAddress`/`asHex`), not drift. This is deliberately
 *  narrow: it accepts `string → 0x${string}` and nothing else, so a column that
 *  changes to `number` or `boolean` under a public `Address` still fails the check.
 */
type IsWireOfHex<Wire, Pub> = [Wire] extends [string] ? ([Pub] extends [`0x${string}`] ? true : false) : false;
/**
 *  Every key whose wire type is not assignable to the same key on the public type
 *  `Pub`. Four things are deliberately NOT flagged:
 *
 *  - keys `Pub` does not declare (a variant omits the other variants' columns);
 *  - nullability (`NonNullable` on both sides), since `toMarket`'s
 *    `?? unreachable(...)` on required variant columns is precisely the claim
 *    that a variant's own columns are populated;
 *  - `marketType`, whose whole purpose is to be narrowed from the wire's full
 *    union to one literal per variant;
 *  - a wire `string` under a public `Address`/`Hex` — see {@link IsWireOfHex}.
 */
type MismatchedKeys<Row, Pub> = {
    [K in Exclude<keyof Pub & keyof Row, "marketType">]: NonNullable<Row[K]> extends NonNullable<Pub[K]> ? never : IsWireOfHex<NonNullable<Row[K]>, NonNullable<Pub[K]>> extends true ? never : K;
}[Exclude<keyof Pub & keyof Row, "marketType">];
/**
 *  Assert no field of the public type disagrees with the wire row's type for it.
 *  Resolves to `true`, or to the offending key names — so the compile error reads
 *  `Type '"asset"' is not assignable to type 'true'`, naming the drifted field.
 */
type NoMismatch<Row, Pub> = [MismatchedKeys<Row, Pub>] extends [never] ? true : MismatchedKeys<Row, Pub>;
declare const _binaryMatchesWire: NoMismatch<RawMarketRow, BinaryMarket>;
declare const _spotMatchesWire: NoMismatch<RawMarketRow, SpotMarket>;
declare const _perpMatchesWire: NoMismatch<RawMarketRow, PerpMarket>;
/**
 *  Fields the SDK COMPUTES rather than selects, so the wire row legitimately has no
 *  column for them. Exempt by name — a short, explicit list — because the alternative
 *  (loosening the check) would also stop catching genuinely-dropped columns.
 *
 *  - `interval`: the human timeframe label (`"15m"` / `"1h"` / …) that `toMarket`
 *    derives from `intervalSec`, falling back to `expiry − tradingStart`. See
 *    `marketIntervalLabel`.
 *  - `mode`: `"reference"` / `"fixed"`, which `toMarket` reads off `strike` (0 is
 *    the protocol's sentinel for "resolves against another question"). See
 *    `binaryResolutionMode`.
 *
 *  - `chainId`: stamped by the owning client at its boundary (`withChain`), never
 *    selected — the indexer rows carry no chain column.
 *
 *  Adding a name here is a claim that something in the mapping layer populates it.
 */
type DerivedFields = "interval" | "mode" | "chainId";
/**
 *  Assert the public types do not promise fields the wire row never returns —
 *  catches a REMOVED/renamed column that the fragment stopped selecting, which
 *  would otherwise leave the public type advertising a field that is now
 *  permanently `undefined`. {@link DerivedFields} are excluded: they are computed,
 *  not selected.
 */
type MissingFromWire<Row, Pub> = Exclude<Exclude<keyof Pub, keyof Row>, DerivedFields>;
type NothingMissing<Row, Pub> = [MissingFromWire<Row, Pub>] extends [never] ? true : MissingFromWire<Row, Pub>;
declare const _binaryFieldsExist: NothingMissing<RawMarketRow, BinaryMarket>;
declare const _spotFieldsExist: NothingMissing<RawMarketRow, SpotMarket>;
declare const _perpFieldsExist: NothingMissing<RawMarketRow, PerpMarket>;
/**
 *  Keys whose wire column is nullable but whose PUBLIC type admits neither `null`
 *  nor `undefined` — i.e. exactly the fields `toMarket` bridges with
 *  `?? unreachable(...)`.
 *
 *  Both public spellings of "may be absent" are therefore excluded, and the
 *  distinction matters: `lastPrice: string | null` (a required key holding a
 *  nullable value — null until the first fill) is pass-through, while
 *  `nonce?: string | null` (optional AND nullable) is too. Neither is asserted.
 *  `-?` strips optionality before the test so `undefined` is only present when the
 *  declared type genuinely includes it.
 */
type AssertedKeys<Row, Pub> = {
    [K in Exclude<keyof Pub & keyof Row, "marketType">]-?: null extends Pub[K] ? never : undefined extends Pub[K] ? never : null extends Row[K] ? K : never;
}[Exclude<keyof Pub & keyof Row, "marketType">];
/** Set equality, reported as whichever side has the unexpected member. */
type SameKeys<Actual extends string, Expected extends string> = [Exclude<Actual, Expected>] extends [never] ? [Exclude<Expected, Actual>] extends [never] ? true : {
    missingFromCode: Exclude<Expected, Actual>;
} : {
    unexpectedlyAsserted: Exclude<Actual, Expected>;
};
/**
 *  BINARY's asserted columns. Each is written unconditionally by
 *  `BinaryMarketsModule.MarketCreated` — see `indexer/src/handlers/binary.ts`.
 *  `status` (wire `clobStatus`) is derived there from a total three-branch
 *  expression, so it is never absent on a binary row.
 *
 *  NOT here, and deliberately optional on {@link BinaryMarket}: `oracleQuestion`,
 *  `oracleQuestionId`, `createdByTx`, `creator`, `nonce`, `operatorId`, `venueId`,
 *  `context`, `finalized`, `netBacking` — a market discovered via the realtime
 *  tail comes from `MarketCreator.MarketCreated`, whose narrower payload omits
 *  them until the next snapshot fills them in. `strike` left the set for a
 *  related but distinct reason: a chain-seeded row carries none and is never
 *  re-snapshotted, so the public field is permanently nullable and `toMarket`'s `?? unreachable` is an INDEXER-row assertion the
 *  compiler no longer derives.
 */
type BinaryAsserted = "marketId" | "marketAddress" | "yesTokenId" | "noTokenId" | "collateral" | "asset" | "question" | "status" | "tradingStart" | "expiry";
/**
 *  SPOT's asserted columns — all from the static `POOLS` metadata in
 *  `indexer/src/pools.ts`, stamped at lazy creation, never event-derived.
 */
type SpotAsserted = "baseToken" | "quoteToken" | "baseIsNative" | "tickSize" | "lotSize" | "minQuantity";
/**
 *  PERP's asserted columns — from the static `PERP_POOLS` metadata, same as SPOT
 *  plus the margin pair. `baseIsNative` is a hardcoded `false` there; note it is
 *  bridged with `??` and not `||`, which would wrongly treat `false` as absent.
 */
type PerpAsserted = SpotAsserted | "marginBank" | "initialMarginBps";
declare const _binaryAssertedSet: SameKeys<AssertedKeys<RawMarketRow, BinaryMarket>, BinaryAsserted>;
declare const _spotAssertedSet: SameKeys<AssertedKeys<RawMarketRow, SpotMarket>, SpotAsserted>;
declare const _perpAssertedSet: SameKeys<AssertedKeys<RawMarketRow, PerpMarket>, PerpAsserted>;
declare const _portfolioMarketMatchesWire: NoMismatch<RawMarketRow, PortfolioMarket>;
declare const _portfolioMarketFieldsExist: NothingMissing<RawMarketRow, PortfolioMarket>;
declare const _spotPortfolioMarketMatchesWire: NoMismatch<RawMarketRow, SpotPortfolioMarket>;
declare const _spotPortfolioMarketFieldsExist: NothingMissing<RawMarketRow, SpotPortfolioMarket>;
declare const _perpPortfolioMarketMatchesWire: NoMismatch<RawMarketRow, PerpPortfolioMarket>;
declare const _perpPortfolioMarketFieldsExist: NothingMissing<RawMarketRow, PerpPortfolioMarket>;
declare const _orderMarketMatchesWire: NoMismatch<RawMarketRow, Omit<OrderMarket, "interval">>;
declare const _orderMarketFieldsExist: NothingMissing<RawMarketRow, Omit<OrderMarket, "interval">>;
export type _MarketRowContractChecked = [
    typeof _binaryMatchesWire,
    typeof _spotMatchesWire,
    typeof _perpMatchesWire,
    typeof _binaryFieldsExist,
    typeof _spotFieldsExist,
    typeof _perpFieldsExist,
    typeof _binaryAssertedSet,
    typeof _spotAssertedSet,
    typeof _perpAssertedSet,
    typeof _portfolioMarketMatchesWire,
    typeof _portfolioMarketFieldsExist,
    typeof _spotPortfolioMarketMatchesWire,
    typeof _spotPortfolioMarketFieldsExist,
    typeof _perpPortfolioMarketMatchesWire,
    typeof _perpPortfolioMarketFieldsExist,
    typeof _orderMarketMatchesWire,
    typeof _orderMarketFieldsExist
];
export {};
