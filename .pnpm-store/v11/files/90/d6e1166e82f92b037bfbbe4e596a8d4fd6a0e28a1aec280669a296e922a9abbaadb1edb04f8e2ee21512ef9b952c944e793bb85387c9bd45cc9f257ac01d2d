// Compile-time contract between the WIRE row and the PUBLIC market types.
//
// `toMarket` builds a per-variant object, taking required type-specific columns
// with `?? unreachable(...)` because GraphQL cannot express that `marketType`
// correlates with which nullable columns are populated. That assertion is
// necessary — but on its own it also erases a failure this change exists to catch:
// a field that still EXISTS in the schema but changed TYPE (say `asset` String →
// Int) regenerates cleanly and typechecks, silently making the public type a lie.
//
// So the correlation stays asserted, while every field's NAME and WIRE TYPE is
// pinned here. These are type-level only — no runtime cost, nothing exported from
// the package. A mismatch is a compile error naming the field.
//
// On failure: the schema changed. Update the public type in markets.ts to match the
// new wire type (or fix the fragment if the field was renamed), then adjust the
// mapping if the change is more than cosmetic.
// One check per public variant. Each reads: "every field this variant declares
// that the wire also returns agrees on type."
const _binaryMatchesWire = true;
const _spotMatchesWire = true;
const _perpMatchesWire = true;
const _binaryFieldsExist = true;
const _spotFieldsExist = true;
const _perpFieldsExist = true;
const _binaryAssertedSet = true;
const _spotAssertedSet = true;
const _perpAssertedSet = true;
// The three market PROJECTIONS embedded in portfolio rows. Each fragment
// (`PortfolioMarketFields`, `SpotPortfolioMarketFields`,
// `PerpPortfolioMarketFields`) selects a strict SUBSET of MarketFields' columns —
// verified — so checking them against the same wire row covers every field they
// use. Pinning them here is what KEEPS that true: a field added to a portfolio
// fragment but not to MarketFields fails these checks instead of silently escaping
// them, which matters because the portfolio mappings assert nullability through
// `narrowMarketTypeProjection` and would otherwise erase a type change.
const _portfolioMarketMatchesWire = true;
const _portfolioMarketFieldsExist = true;
const _spotPortfolioMarketMatchesWire = true;
const _spotPortfolioMarketFieldsExist = true;
const _perpPortfolioMarketMatchesWire = true;
const _perpPortfolioMarketFieldsExist = true;
// The FOURTH such projection: the market context carried on every order row
// (`OrderMarketFields`). `interval` is DERIVED by the SDK rather than selected,
// so it is omitted from the check the same way the portfolio projections omit
// theirs.
const _orderMarketMatchesWire = true;
const _orderMarketFieldsExist = true;
export {};
