// Markets — the shared market surface across every kind.
//
// ONE `Market` entity serves spot, perp and binary; `marketType` discriminates it
// and the `is*Market` guards narrow it. That is why this is a shared concept
// rather than three: a list is a filter over one table, not three code paths. The
// kind-specific MECHANICS (settlement, stops, margin) live in binary/, spot/ and
// perp/ — what lives here is identity, discovery and the row parser everything
// else builds on.
//
// `toMarket` + MARKET_FIELDS are the selection-set/parse pair; snapshot.ts uses
// them directly to hydrate the live store.
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
import * as ReadsAbi from "./readsAbi.js";
import * as ModuleAbi from "./moduleAbi.js";
import * as Store from "./store.js";
import * as Ids from "./ids.js";
import * as Interval from "./interval.js";
import * as Balances from "./balances.js";
import { ContractRevertError, IndexerError, InvalidInputError } from "./errors.js";
import { InvariantError, unreachable } from "./raise.js";
/**
 *  Stamp a market row with the chain it was read from. The data-first mappers
 *  know the indexer, not the chain, so the owning client stamps every row at
 *  its boundary (`client.getMarket`, the live tail's snapshot, chain-synthesized
 *  perp rows). Returns a copy; the input is not mutated.
 *
 * @category markets
 */
export function withChain(chainId, m) {
    return { ...m, chainId };
}
/** {@link withChain} over a list, and over `null` for the single-row reads. */
export function withChainRows(chainId, rows) {
    return rows.map((m) => withChain(chainId, m));
}
/**
 * Narrow a {@link Market} to its binary variant.
 *
 * @category markets
 */
export function isBinaryMarket(m) {
    return m.marketType === "BINARY";
}
/**
 * Whether a market is SETTLED: a binary market that resolved, voided or
 * finalized. Its pool is recycled onto the next market in the series, so a
 * settled market can still be redeemed and reported, but never traded, quoted
 * or watched through its pool. Spot and perp markets never settle.
 *
 * @category markets
 */
export function isSettledMarket(m) {
    if (m.marketType !== "BINARY")
        return false;
    return m.finalized === true || m.status === "Resolved" || m.status === "Voided" || m.status === "Finalized";
}
/**
 * Narrow a {@link Market} to its spot variant.
 *
 * @category markets
 */
export function isSpotMarket(m) {
    return m.marketType === "SPOT";
}
/**
 * Narrow a {@link Market} to its perp variant.
 *
 * @category markets
 */
export function isPerpMarket(m) {
    return m.marketType === "PERP";
}
// The unified indexer stores binary status as `clobStatus`; alias it back to
// `status` so the BinaryMarket variant reads naturally. The flat row the indexer
// returns carries every column (the other variant's are null) — `toMarket` picks
// only the fields that belong on each variant so the union members stay clean.
//
// One fragment, spread by every market query, so the selection exists ONCE: a
// field the indexer renamed or retyped fails `pnpm codegen` here rather than in
// nine separate template strings.
// prettier-ignore
export const MarketFields = graphql(`
  fragment MarketFields on Market {
    id
    marketType
    poolAddress
    lastPrice
    lastTradeAt
    cumulativeBaseVolume
    cumulativeQuoteVolume
    tradeCount
    baseDecimals
    quoteDecimals
    createdAtTimestamp
    createdAtBlock
    baseToken
    quoteToken
    baseSymbol
    quoteSymbol
    baseIsNative
    tickSize
    lotSize
    minQuantity
    markPrice
    rawMidpoint
    markPriceUpdatedAt
    stopRegistry
    marginBank
    initialMarginBps
    fundingRate
    cumulativeFundingPerUnit
    indexPrice
    fundingUpdatedAt
    fundingWindowSec
    fundingIntervalSec
    openInterest
    openInterestUpdatedAt
    marketId
    marketAddress
    yesTokenId
    noTokenId
    collateral
    asset
    question
    oracleQuestion
    oracleQuestionId
    status: clobStatus
    strike
    tradingStart
    expiry
    winningOutcome
    payoutNumerators
    payoutDenominator
    settledPayoutNumerators
    voidVectorSource
    resolvedAtBlock
    resolvedAtTimestamp
    createdByTx
    creator
    voided
    backing
    nonce
    finalized
    netBacking
    context
    intervalSec
    operatorId
    venueId
    voidPolicy
  }
`);
/**
 *  {@link MarketFields} as raw GraphQL text, for the ONE query that cannot be a
 *  typed document yet: `snapshot.ts`'s `MarketsSnapshot` assembles its variable
 *  declarations and `where` clauses by string interpolation, and `graphql()`
 *  overloads key on the literal source string. Interpolating this keeps that
 *  query's selection in lockstep with the typed one (a field added here reaches
 *  both) even though its RESULT there is still hand-typed.
 *
 *  Not a permanent arrangement — `snapshot.ts` migrates with its own slice, where
 *  the dynamic text collapses into `Market_bool_exp` variables (an empty `{}`
 *  bool_exp is unconstrained, so the scoped/unscoped branch needs no string
 *  surgery). Until then this is the seam, and it is deliberately the *text*, not
 *  a second copy of the field list.
 */
export const MARKET_FIELDS = MarketFields.toString().replace(/^\s*fragment MarketFields on Market \{|\}\s*$/g, "");
// ---------------------------------------------------------------- wire → 0x types
// Hasura serves every address and hash as plain `String`, so the row type is
// `string` and the public types are viem's `Address` / `Hex` (viem is the platform
// here — see CONVENTIONS.md). These two functions are that narrowing, named so the
// claim is greppable instead of scattered as inline `as Address` casts.
//
// They do NOT validate, deliberately. The shape gate lives at the point where a
// malformed address could actually ENTER — `indexer/scripts/gen-config.mjs`, which
// hard-fails codegen on the generated pool/token metadata (the only addresses not
// already ABI-decoded from an event, hence the only ones a human can typo). Re-
// testing a regex per field per row here would cost ~8 checks × 500 rows a page to
// re-confirm what viem's decoder established upstream, and would turn a
// cosmetically-odd address into a silently vanished market.
//
// Lowercase is load-bearing, not cosmetic: the indexer lowercases on write and
// `store.ts` keys `poolToMarket` / `addressToMarket` on it. viem's `getAddress`
// would return EIP-55 CHECKSUMMED values and break those lookups — which is why
// `Address` (a template-literal type that lowercase satisfies) is the right tool
// and `getAddress` is not.
export const asAddress = (s) => s;
export const asHex = (s) => s;
/**
 *  Lowercase a `0x` value WITHOUT widening it back to `string`.
 *
 *  `Address` and `Hex` are template-literal types, so `.toLowerCase()` — which
 *  returns `string` — loses the type even though lowercasing a `0x${string}` can
 *  only ever produce another `0x${string}`. Used by the live-tail reducer, whose
 *  event args arrive already typed by viem's decoder and only need normalizing to
 *  the lowercase form the indexer and `store.ts`'s lookup maps use.
 */
export const lower0x = (s) => s.toLowerCase();
/** Nullable passthrough of {@link asAddress} — for columns that are legitimately null. */
const asAddressOrNull = (s) => (s == null ? null : asAddress(s));
/** Nullable passthrough of {@link asHex}. */
const asHexOrNull = (s) => (s == null ? null : asHex(s));
/**
 *  Stamp the discriminated {@link Market} type onto a flat indexer row.
 *
 *  Builds one of three plain objects — {@link BinaryMarket}, {@link SpotMarket},
 *  or {@link PerpMarket} — picking only that variant's fields. Shared identity /
 *  volume / decimals land on every variant; type-specific columns do not cross
 *  the boundary (a binary row never carries `baseToken`, a spot row never
 *  carries `yesTokenId`).
 *
 *  Field names and wire types are schema-derived and compiler-checked. What
 *  remains is the ONE thing GraphQL cannot express: that `marketType` CORRELATES
 *  with which nullable columns are actually populated. The schema must declare
 *  every type-specific column nullable — a column has to be null for the other
 *  market types — so required fields are taken with `?? unreachable(...)`: an
 *  assertion the indexer's handlers uphold, not a proof. Binary also stamps the
 *  derived timeframe label (`interval`) — see {@link marketIntervalLabel}.
 *
 *  **Gotchas**
 *
 *  Throws {@link InvariantError} on a row whose own columns are not populated —
 *  an indexer/schema regression, never caller input. For LIST reads that is the
 *  wrong blast radius (one bad row would blank the page), so those map through
 *  {@link toMarkets}, which drops the offender instead. Single-row reads let it
 *  throw: there is no partial answer to degrade to.
 */
export function toMarket(r) {
    const base = {
        id: r.id,
        poolAddress: asAddress(r.poolAddress),
        lastPrice: r.lastPrice,
        lastTradeAt: r.lastTradeAt,
        cumulativeBaseVolume: r.cumulativeBaseVolume,
        cumulativeQuoteVolume: r.cumulativeQuoteVolume,
        tradeCount: r.tradeCount,
        baseDecimals: r.baseDecimals,
        quoteDecimals: r.quoteDecimals,
        createdAtTimestamp: r.createdAtTimestamp,
        createdAtBlock: r.createdAtBlock,
    };
    switch (r.marketType) {
        case "BINARY":
            return {
                ...base,
                marketType: "BINARY",
                marketId: asHex(r.marketId ?? unreachable("BINARY row missing marketId")),
                marketAddress: asAddress(r.marketAddress ?? unreachable("BINARY row missing marketAddress")),
                yesTokenId: r.yesTokenId ?? unreachable("BINARY row missing yesTokenId"),
                noTokenId: r.noTokenId ?? unreachable("BINARY row missing noTokenId"),
                collateral: asAddress(r.collateral ?? unreachable("BINARY row missing collateral")),
                asset: r.asset ?? unreachable("BINARY row missing asset"),
                question: r.question ?? unreachable("BINARY row missing question"),
                status: r.status ?? unreachable("BINARY row missing status"),
                oracleQuestion: r.oracleQuestion,
                oracleQuestionId: r.oracleQuestionId,
                strike: r.strike ?? unreachable("BINARY row missing strike"),
                tradingStart: r.tradingStart ?? unreachable("BINARY row missing tradingStart"),
                expiry: r.expiry ?? unreachable("BINARY row missing expiry"),
                winningOutcome: r.winningOutcome,
                payoutNumerators: r.payoutNumerators,
                payoutDenominator: r.payoutDenominator,
                settledPayoutNumerators: r.settledPayoutNumerators,
                voidVectorSource: r.voidVectorSource,
                resolvedAtBlock: r.resolvedAtBlock,
                resolvedAtTimestamp: r.resolvedAtTimestamp,
                createdByTx: asHexOrNull(r.createdByTx),
                creator: asAddressOrNull(r.creator),
                voided: r.voided,
                backing: r.backing,
                nonce: r.nonce,
                finalized: r.finalized,
                netBacking: r.netBacking,
                context: asHexOrNull(r.context),
                intervalSec: r.intervalSec,
                // Stamp the derived timeframe label so every list/point read serves
                // `interval` ("15m"/"1h"/"4h") ready-to-render — the single place the
                // `intervalSec → label` mapping lives (see interval.ts).
                interval: Interval.marketIntervalLabel(r),
                // Stamp the derived resolution mode — the single place the strike-0
                // sentinel is read (see binaryResolutionMode).
                mode: binaryResolutionMode(r.strike),
                operatorId: r.operatorId,
                venueId: asHexOrNull(r.venueId),
                voidPolicy: r.voidPolicy,
            };
        case "SPOT":
            return {
                ...base,
                marketType: "SPOT",
                baseToken: asAddress(r.baseToken ?? unreachable("SPOT row missing baseToken")),
                quoteToken: asAddress(r.quoteToken ?? unreachable("SPOT row missing quoteToken")),
                baseSymbol: r.baseSymbol,
                quoteSymbol: r.quoteSymbol,
                baseIsNative: r.baseIsNative ?? unreachable("SPOT row missing baseIsNative"),
                tickSize: r.tickSize ?? unreachable("SPOT row missing tickSize"),
                lotSize: r.lotSize ?? unreachable("SPOT row missing lotSize"),
                minQuantity: r.minQuantity ?? unreachable("SPOT row missing minQuantity"),
                markPrice: r.markPrice,
                rawMidpoint: r.rawMidpoint,
                markPriceUpdatedAt: r.markPriceUpdatedAt,
                stopRegistry: asAddressOrNull(r.stopRegistry),
            };
        case "PERP":
            return {
                ...base,
                marketType: "PERP",
                baseToken: asAddress(r.baseToken ?? unreachable("PERP row missing baseToken")),
                quoteToken: asAddress(r.quoteToken ?? unreachable("PERP row missing quoteToken")),
                baseSymbol: r.baseSymbol,
                quoteSymbol: r.quoteSymbol,
                baseIsNative: r.baseIsNative ?? unreachable("PERP row missing baseIsNative"),
                tickSize: r.tickSize ?? unreachable("PERP row missing tickSize"),
                lotSize: r.lotSize ?? unreachable("PERP row missing lotSize"),
                minQuantity: r.minQuantity ?? unreachable("PERP row missing minQuantity"),
                marginBank: asAddress(r.marginBank ?? unreachable("PERP row missing marginBank")),
                initialMarginBps: r.initialMarginBps ?? unreachable("PERP row missing initialMarginBps"),
                stopRegistry: asAddressOrNull(r.stopRegistry),
                markPrice: r.markPrice,
                markPriceUpdatedAt: r.markPriceUpdatedAt,
                fundingRate: r.fundingRate,
                cumulativeFundingPerUnit: r.cumulativeFundingPerUnit,
                indexPrice: r.indexPrice,
                fundingUpdatedAt: r.fundingUpdatedAt,
                fundingWindowSec: r.fundingWindowSec,
                fundingIntervalSec: r.fundingIntervalSec,
                openInterest: r.openInterest,
                openInterestUpdatedAt: r.openInterestUpdatedAt,
            };
        default:
            return unreachable(`unknown marketType ${String(r.marketType)}`);
    }
}
/**
 *  {@link toMarket} across a list, DROPPING any row whose own columns are not
 *  populated instead of failing the whole read.
 *
 *  **When to use**
 *
 *  Every list read. `rows.map(toMarket)` is the shape to avoid: `toMarket` throws
 *  {@link InvariantError} on a malformed row, so one bad row out of 500 would
 *  reject the entire page rather than serve 499. A list has a sane partial answer
 *  and a single-row read does not — so `getMarket` and friends still let it throw.
 *
 *  **Gotchas**
 *
 *  A drop is SILENT: the SDK owns no log channel at this layer (`config.debug` is
 *  per-client and these are free functions), and the alternative — a bare
 *  `console.warn` from inside a library — is worse. The signal that something is
 *  wrong is a short count, plus `marketRowContract.ts` failing to compile once the
 *  schema drift reaches CI. Callers that must distinguish "no markets" from
 *  "markets the SDK could not parse" should compare against the row count.
 */
export function toMarkets(rows) {
    const out = [];
    for (const r of rows) {
        try {
            out.push(toMarket(r));
        }
        catch (e) {
            // Only OUR invariant — a genuinely unexpected error (OOM, a bug in the
            // mapping itself) must not be swallowed as "one skippable row".
            if (!(e instanceof InvariantError))
                throw e;
        }
    }
    return out;
}
/**
 *  Read a binary market's {@link BinaryResolutionMode} off its `strike` — the ONE
 *  place that reading happens.
 *
 *  Strike 0 is reference mode DECLARING "no fixed strike": a sentinel, never a $0
 *  threshold. `_strikeLabel` treats 0 as "no strike fragment" and reference
 *  resolution compares two numeric answers instead of reading a strike at all, so
 *  every market the current creator mints holds to it — but nothing in
 *  `_validateCreate` cross-checks it against `referenceQuestionId`, so it is
 *  convention rather than an enforced invariant. Centralized here so the day that
 *  changes is a one-line change.
 *
 *  Takes either encoding: the indexer serves `strike` as a decimal string, the
 *  contract event as a `uint256`.
 *
 * @category markets
 */
export function binaryResolutionMode(strike) {
    return strike == null || strike === "0" || strike === 0n ? "reference" : "fixed";
}
/**
 *  List markets of either type (or filter to one), newest first, as the
 *  discriminated {@link Market} union. For binary-only callers that want a
 *  pre-narrowed {@link BinaryMarket}[], {@link listBinaryMarkets} is the same
 *  query with the filter and narrowing baked in.
 *
 * **Details**
 *
 * - `opts.marketType`: Restrict to one kind (`"BINARY"` | `"SPOT"` | `"PERP"`).
 * - `opts.limit`: Max rows (default 50).
 */
export async function listMarkets(opts = {}, indexerUrl) {
    return (await listMarketsChecked(opts, indexerUrl)).markets;
}
/**
 *  {@link listMarkets} with the rows it could not parse counted — see
 *  {@link RegistrySweep}. `markets.length + dropped` is the number of rows the indexer
 *  served, so a caller that asks for one row past its cap can tell a cut list.
 */
export async function listMarketsChecked(opts, indexerUrl) {
    const where = {};
    if (opts.marketType)
        where.marketType = { _eq: opts.marketType };
    const data = await IndexerRead.gqlRequest(MarketsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    const markets = toMarkets(data.Market);
    return { markets, dropped: data.Market.length - markets.length };
}
// prettier-ignore
const RegistryMarketsQuery = graphql(`
  query RegistryMarkets($where: Market_bool_exp!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(where: $where, order_by: [{ createdAtTimestamp: desc }, { id: desc }], limit: $limit) {
      ...MarketFields
    }
  }
`);
/**
 *  Registry sweep for the unified tier: every non-binary market plus the
 *  binary series that are still live (`finalized` false or not yet stamped),
 *  paged until exhausted.
 *
 *  **Gotchas**
 *
 *  Finalized series accumulate without bound and would swamp the symbol registry
 *  with thousands of dead markets, so they are excluded — resolve those by pool
 *  via the raw-tier lookups instead.
 *
 *  A malformed row is DROPPED silently, so the returned length alone cannot tell
 *  "no markets" from "markets this SDK could not parse". A caller whose answer
 *  depends on the sweep being exhaustive — a monitor claiming coverage, say —
 *  wants {@link listRegistryMarketsChecked}, which reports the drops.
 */
export async function listRegistryMarkets(indexerUrl) {
    return (await listRegistryMarketsChecked(indexerUrl)).markets;
}
/**
 *  {@link listRegistryMarkets} with the dropped rows COUNTED — see
 *  {@link RegistrySweep}.
 *
 *  **When to use**
 *
 *  When a short answer must be distinguishable from a complete one. `toMarkets`
 *  drops a row it cannot parse rather than failing the page, which is the right
 *  trade for a list and the wrong one for a caller that treats absence as proof:
 *  a market missing from the sweep is missing from every count derived from it,
 *  so nothing in the plain read reveals the gap. `dropped > 0` is that signal.
 */
export async function listRegistryMarketsChecked(indexerUrl) {
    const markets = [];
    let dropped = 0;
    const PAGE = 500;
    // Keyset on (createdAtTimestamp, id), the query's sort key. An offset re-scans
    // every earlier page and skips or repeats rows that share a timestamp.
    let after = null;
    for (;;) {
        const where = after
            ? { _and: [REGISTRY_ELIGIBLE_WHERE, rowsAfter(after)] }
            : REGISTRY_ELIGIBLE_WHERE;
        const data = await IndexerRead.gqlRequest(RegistryMarketsQuery, { where, limit: PAGE }, indexerUrl);
        const parsed = toMarkets(data.Market);
        markets.push(...parsed);
        dropped += data.Market.length - parsed.length;
        const last = data.Market.at(-1);
        if (data.Market.length < PAGE || last === undefined)
            break;
        // The cursor is the last RAW row, so a dropped row still advances the sweep.
        after = { createdAtTimestamp: last.createdAtTimestamp, id: last.id };
    }
    return { markets, dropped };
}
/**
 *  The markets the live registry holds: every SPOT and PERP market, and every
 *  BINARY market that is not finalized. A BINARY row whose `finalized` is null
 *  (not stamped yet) counts as not finalized. The all-markets snapshot applies
 *  the same filter; `test/registrySweep.test.ts` pins the two together.
 *
 *  `_in` rather than `_neq: "BINARY"`, so Postgres can serve that arm from the
 *  `marketType` index.
 */
export const REGISTRY_ELIGIBLE_WHERE = {
    _or: [{ marketType: { _in: ["SPOT", "PERP"] } }, { finalized: { _is_null: true } }, { finalized: { _eq: false } }],
};
/** Rows strictly after `row` in `[{createdAtTimestamp: desc}, {id: desc}]` order. */
function rowsAfter(row) {
    return {
        _or: [
            { createdAtTimestamp: { _lt: row.createdAtTimestamp } },
            { createdAtTimestamp: { _eq: row.createdAtTimestamp }, id: { _lt: row.id } },
        ],
    };
}
/** Shared `where` for {@link countMarkets} / {@link countMarketsBounded}. */
function marketCountWhere(opts) {
    const where = {};
    if (opts.marketType)
        where.marketType = { _eq: opts.marketType };
    return where;
}
/**
 *  Server-side COUNT of markets, optionally of one type (Hasura `Market_aggregate`)
 *  — so a spot/perp list paginates against a real total without fetching rows.
 *  Privileged `_aggregate` role (server-only), like {@link countBinaryMarkets}.
 *
 *  WITHOUT THAT HEADER THE TOTAL IS A LOWER BOUND, capped at
 *  {@link IndexerRead.COUNT_FALLBACK_CAP}. {@link countMarketsBounded} says
 *  whether it was.
 */
export async function countMarkets(opts = {}, indexerUrl, headers) {
    return IndexerRead.aggregateCount(MarketCountDocuments, marketCountWhere(opts), indexerUrl, headers);
}
/**
 *  {@link countMarkets}, reporting whether the read was cut short — see
 *  {@link IndexerRead.CountResult}.
 */
export async function countMarketsBounded(opts = {}, indexerUrl, headers) {
    return IndexerRead.aggregateCountBounded(MarketCountDocuments, marketCountWhere(opts), indexerUrl, headers);
}
// Each primary-key alias returns a row or null under the effective role. Unlike
// a list query, a short response cannot hide IDs behind a role's page ceiling.
const ResolvableMarketsQuery = graphql(`
  query ResolvableMarkets(
    $id0: String! = "", $use0: Boolean! = false,
    $id1: String! = "", $use1: Boolean! = false,
    $id2: String! = "", $use2: Boolean! = false,
    $id3: String! = "", $use3: Boolean! = false,
    $id4: String! = "", $use4: Boolean! = false,
    $id5: String! = "", $use5: Boolean! = false,
    $id6: String! = "", $use6: Boolean! = false,
    $id7: String! = "", $use7: Boolean! = false,
    $id8: String! = "", $use8: Boolean! = false,
    $id9: String! = "", $use9: Boolean! = false,
    $id10: String! = "", $use10: Boolean! = false,
    $id11: String! = "", $use11: Boolean! = false,
    $id12: String! = "", $use12: Boolean! = false,
    $id13: String! = "", $use13: Boolean! = false,
    $id14: String! = "", $use14: Boolean! = false,
    $id15: String! = "", $use15: Boolean! = false,
    $id16: String! = "", $use16: Boolean! = false,
    $id17: String! = "", $use17: Boolean! = false,
    $id18: String! = "", $use18: Boolean! = false,
    $id19: String! = "", $use19: Boolean! = false,
    $id20: String! = "", $use20: Boolean! = false,
    $id21: String! = "", $use21: Boolean! = false,
    $id22: String! = "", $use22: Boolean! = false,
    $id23: String! = "", $use23: Boolean! = false,
    $id24: String! = "", $use24: Boolean! = false
  ) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    market0: Market_by_pk(id: $id0) @include(if: $use0) { ...MarketFields }
    market1: Market_by_pk(id: $id1) @include(if: $use1) { ...MarketFields }
    market2: Market_by_pk(id: $id2) @include(if: $use2) { ...MarketFields }
    market3: Market_by_pk(id: $id3) @include(if: $use3) { ...MarketFields }
    market4: Market_by_pk(id: $id4) @include(if: $use4) { ...MarketFields }
    market5: Market_by_pk(id: $id5) @include(if: $use5) { ...MarketFields }
    market6: Market_by_pk(id: $id6) @include(if: $use6) { ...MarketFields }
    market7: Market_by_pk(id: $id7) @include(if: $use7) { ...MarketFields }
    market8: Market_by_pk(id: $id8) @include(if: $use8) { ...MarketFields }
    market9: Market_by_pk(id: $id9) @include(if: $use9) { ...MarketFields }
    market10: Market_by_pk(id: $id10) @include(if: $use10) { ...MarketFields }
    market11: Market_by_pk(id: $id11) @include(if: $use11) { ...MarketFields }
    market12: Market_by_pk(id: $id12) @include(if: $use12) { ...MarketFields }
    market13: Market_by_pk(id: $id13) @include(if: $use13) { ...MarketFields }
    market14: Market_by_pk(id: $id14) @include(if: $use14) { ...MarketFields }
    market15: Market_by_pk(id: $id15) @include(if: $use15) { ...MarketFields }
    market16: Market_by_pk(id: $id16) @include(if: $use16) { ...MarketFields }
    market17: Market_by_pk(id: $id17) @include(if: $use17) { ...MarketFields }
    market18: Market_by_pk(id: $id18) @include(if: $use18) { ...MarketFields }
    market19: Market_by_pk(id: $id19) @include(if: $use19) { ...MarketFields }
    market20: Market_by_pk(id: $id20) @include(if: $use20) { ...MarketFields }
    market21: Market_by_pk(id: $id21) @include(if: $use21) { ...MarketFields }
    market22: Market_by_pk(id: $id22) @include(if: $use22) { ...MarketFields }
    market23: Market_by_pk(id: $id23) @include(if: $use23) { ...MarketFields }
    market24: Market_by_pk(id: $id24) @include(if: $use24) { ...MarketFields }
  }
`);
/** Maximum primary-key selections in one settled-market request. */
export const RESOLVABLE_MARKET_CAPACITY = 25;
// IOracleAnswerReceiver.PAYOUT_VECTOR_DENOMINATOR is shared by binary settlement
// and the indexer payout writers, including uniform and snapshot void vectors.
const settledPayoutDenominator = 10000000n;
const wireString = (value) => typeof value === "string";
// Indexer totals may grow beyond a single EVM word. Contract values keep their
// unsigned or signed width; validation never replaces their exact wire strings.
const wireUnsigned = (value) => typeof value === "string" && /^\d+$/.test(value);
const wireUint256 = (value) => wireUnsigned(value) && BigInt(String(value)) < 1n << 256n;
const wireUint64 = (value) => wireUnsigned(value) && BigInt(String(value)) < 1n << 64n;
const wireSigned256 = (value) => typeof value === "string" && /^-?\d+$/.test(value) && BigInt(value) >= -(1n << 255n) && BigInt(value) < 1n << 255n;
const wireNumber = (value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2_147_483_647;
const wireAddress = (value) => typeof value === "string" && /^0x[\da-fA-F]{40}$/.test(value);
const wireBytes32 = (value) => typeof value === "string" && /^0x[\da-fA-F]{64}$/.test(value);
const wireBytes = (value) => typeof value === "string" && /^0x(?:[\da-fA-F]{2})*$/.test(value);
const wireBoolean = (value) => typeof value === "boolean";
const nullableWire = (check) => (value) => value === null || check(value);
const wireDecimals = (value) => wireNumber(value) && Number(value) >= 0 && Number(value) <= 255;
const wireTimestamp = (value) => wireUint64(value) && Number.isFinite(new Date(Number(value) * 1000).getTime());
const settledStatuses = {
    Listed: true,
    Trading: true,
    Locked: true,
    Settling: true,
    Resolved: true,
    Voided: true,
    Finalized: true,
};
// Every selected scalar is checked before the kind mapper or any caller can
// consume it. The generated fragment owns the field roster; integers stay strings.
const settledFieldChecks = {
    id: wireString,
    marketType: wireString,
    poolAddress: wireAddress,
    lastPrice: nullableWire(wireUint256),
    lastTradeAt: nullableWire(wireTimestamp),
    cumulativeBaseVolume: wireUnsigned,
    cumulativeQuoteVolume: wireUnsigned,
    tradeCount: wireUnsigned,
    baseDecimals: wireDecimals,
    quoteDecimals: wireDecimals,
    createdAtTimestamp: wireTimestamp,
    createdAtBlock: wireUnsigned,
    baseToken: nullableWire(wireAddress),
    quoteToken: nullableWire(wireAddress),
    baseSymbol: nullableWire(wireString),
    quoteSymbol: nullableWire(wireString),
    baseIsNative: nullableWire(wireBoolean),
    tickSize: nullableWire(wireUint256),
    lotSize: nullableWire(wireUint256),
    minQuantity: nullableWire(wireUint256),
    markPrice: nullableWire(wireUint256),
    rawMidpoint: nullableWire(wireUint256),
    markPriceUpdatedAt: nullableWire(wireTimestamp),
    stopRegistry: nullableWire(wireAddress),
    marginBank: nullableWire(wireAddress),
    initialMarginBps: nullableWire((value) => wireNumber(value) && Number(value) > 0 && Number(value) <= 10_000),
    fundingRate: nullableWire(wireSigned256),
    cumulativeFundingPerUnit: nullableWire(wireSigned256),
    indexPrice: nullableWire(wireUint256),
    fundingUpdatedAt: nullableWire(wireTimestamp),
    fundingWindowSec: nullableWire(wireNumber),
    fundingIntervalSec: nullableWire(wireNumber),
    openInterest: nullableWire(wireUint256),
    openInterestUpdatedAt: nullableWire(wireTimestamp),
    marketId: nullableWire(wireBytes32),
    marketAddress: nullableWire(wireAddress),
    yesTokenId: nullableWire(wireUint256),
    noTokenId: nullableWire(wireUint256),
    collateral: nullableWire(wireAddress),
    asset: nullableWire(wireString),
    question: nullableWire(wireString),
    oracleQuestion: nullableWire(wireString),
    oracleQuestionId: nullableWire(wireUint256),
    status: nullableWire((value) => typeof value === "string" && Object.hasOwn(settledStatuses, value)),
    strike: nullableWire(wireUint256),
    tradingStart: nullableWire(wireTimestamp),
    expiry: nullableWire(wireTimestamp),
    winningOutcome: nullableWire((value) => value === 0 || value === 1),
    payoutNumerators: nullableWire((value) => Array.isArray(value) &&
        value.length === 2 &&
        value.every(wireUint256) &&
        value.reduce((sum, entry) => sum + BigInt(String(entry)), 0n) === settledPayoutDenominator),
    payoutDenominator: nullableWire((value) => wireUnsigned(value) && BigInt(String(value)) === settledPayoutDenominator),
    settledPayoutNumerators: nullableWire((value) => Array.isArray(value) &&
        value.length === 2 &&
        value.every(wireUint256) &&
        value.reduce((sum, entry) => sum + BigInt(String(entry)), 0n) <= settledPayoutDenominator),
    voidVectorSource: nullableWire((value) => value === 0 || value === 1 || value === 2 || value === 3),
    resolvedAtBlock: nullableWire(wireUnsigned),
    resolvedAtTimestamp: nullableWire(wireTimestamp),
    createdByTx: nullableWire((value) => value === "" || wireBytes32(value)),
    creator: nullableWire(wireAddress),
    voided: wireBoolean,
    backing: wireUint256,
    nonce: nullableWire(wireUint64),
    finalized: nullableWire(wireBoolean),
    netBacking: nullableWire(wireUint256),
    context: nullableWire((value) => wireBytes(value) && String(value).length <= 2 + 4096 * 2),
    intervalSec: nullableWire(wireUint64),
    operatorId: nullableWire(wireNumber),
    venueId: nullableWire(wireBytes32),
    voidPolicy: nullableWire((value) => value === 0 || value === 1 || value === 2),
};
/** Internal bounded lookup; every requested alias must prove its own row or null. */
export async function resolveMarkets(ids, source) {
    if (ids.length > RESOLVABLE_MARKET_CAPACITY)
        throw new InvalidInputError("settled-market lookup exceeds its batch capacity");
    if (ids.length === 0)
        return [];
    const variables = {};
    for (const [i, id] of ids.entries()) {
        variables[`id${i}`] = id;
        variables[`use${i}`] = true;
    }
    const data = await IndexerRead.gqlRequest(ResolvableMarketsQuery, variables, source);
    const aliases = new Map(Object.entries(data));
    return ids.map((id, i) => {
        const alias = `market${i}`;
        const row = aliases.get(alias);
        if (row === null)
            return null;
        if (typeof row !== "object" ||
            Array.isArray(row) ||
            typeof row.id !== "string" ||
            typeof row.poolAddress !== "string" ||
            row.id.toLowerCase() !== id.toLowerCase())
            throw new IndexerError("ResolvableMarkets", `missing or malformed ${alias} primary-key result for ${id}`, {
                cause: { alias, id, row },
            });
        try {
            const fields = new Map(Object.entries(row));
            for (const [field, check] of Object.entries(settledFieldChecks)) {
                if (!check(fields.get(field)))
                    throw new TypeError(`invalid settled-market field ${field}`);
            }
            // BINARY ids name immutable market instances; book ids name their pool.
            // A recycled binary pool need not match marketId or marketAddress.
            if (row.marketType === "BINARY") {
                if (!wireBytes32(row.id) || (row.marketId !== null && row.marketId.toLowerCase() !== row.id.toLowerCase()))
                    throw new TypeError("invalid settled-market binary identity");
            }
            else if (row.marketType === "SPOT" || row.marketType === "PERP") {
                if (!wireAddress(row.id) || row.id.toLowerCase() !== row.poolAddress.toLowerCase())
                    throw new TypeError("invalid settled-market book identity");
                if (row.marketType === "PERP") {
                    const window = row.fundingWindowSec;
                    const interval = row.fundingIntervalSec;
                    // PerpPool validates these on initialization and updates. Null means
                    // the indexer has not observed the parameters; zero does not disable funding.
                    if ((window !== null && window <= 0) || (interval !== null && interval <= 0))
                        throw new TypeError("invalid settled-market funding cadence");
                    if (window !== null && interval !== null && (window < interval || window % interval !== 0))
                        throw new TypeError("invalid settled-market funding window/interval relationship");
                }
            }
            return toMarket(row);
        }
        catch (cause) {
            throw new IndexerError("ResolvableMarkets", `cannot decode ${alias} primary-key result for ${id}`, {
                cause: { alias, id, row, cause },
            });
        }
    });
}
/**
 *  Fetch one market of either type by primary key, as the {@link Market} union
 *  (null if absent). {@link getBinaryMarket} is the binary-narrowed counterpart.
 */
export async function getMarket(id, indexerUrl) {
    const data = await IndexerRead.gqlRequest(MarketByPkQuery, { id }, indexerUrl);
    return data.Market_by_pk ? toMarket(data.Market_by_pk) : null;
}
/**
 *  Fetch one market by its on-chain BinaryMarket ADDRESS (not the bytes32 marketId
 *  primary key). The market PK is `marketId`, so a caller that only holds the
 *  address (e.g. an explorer route keyed on the market clone address) must resolve
 *  through this. Newest first so a recycled/rebound address returns its current
 *  market. Null if the indexer has no row yet.
 */
export async function getMarketByAddress(marketAddress, indexerUrl) {
    const data = await IndexerRead.gqlRequest(MarketByAddressQuery, { a: marketAddress.toLowerCase() }, indexerUrl);
    return data.Market?.[0] ? toMarket(data.Market[0]) : null;
}
/** Binary-narrowed {@link getMarketByAddress}. */
export async function getBinaryMarketByAddress(marketAddress, indexerUrl) {
    const m = await getMarketByAddress(marketAddress, indexerUrl);
    return m && isBinaryMarket(m) ? m : null;
}
/**
 *  One page of binary markets, newest first unless `orderBy` says otherwise,
 *  pre-narrowed to {@link BinaryMarket}[]. Takes {@link ListBinaryMarketsOptions}: the
 *  {@link BinaryMarketFilter} to narrow by venue / asset / cadence / status —
 *  e.g. `{ venueId: "0x…" }` — plus `limit` (default 50) and `offset` (default
 *  0) to page. With no argument it returns the 50 newest. Note "binary", not
 *  "clob": spot markets are order books (CLOBs) too.
 *
 *  Each row carries `poolAddress` + `nonce` (settlement-extraction v2). RECYCLE
 *  CAVEAT: `poolAddress` is a TIME-VARYING binding — the same pool serves
 *  successive markets (never concurrently), so several rows can share a pool.
 *  Key markets by `marketId`; `(poolAddress, nonce)` identifies a market's slice
 *  of a pool's history and encodes its outcome ids.
 */
export async function listBinaryMarkets(opts = {}, indexerUrl) {
    const where = applyBinaryFilter({ marketType: { _eq: "BINARY" } }, opts);
    const orderBy = binaryOrderBy(opts.orderBy, { createdAtTimestamp: "desc" });
    const data = await IndexerRead.gqlRequest(BinaryMarketsQuery, { where, orderBy, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return toMarkets(data.Market).filter(isBinaryMarket);
}
/**
 *  Distinct (operatorId, venueId) pairs present across binary markets — the
 *  cheap server-side source for a venue filter's options (via Hasura
 *  `distinct_on`), so a UI never has to fetch every market just to learn which
 *  venues exist. Markets with a null attribution are excluded.
 */
export async function listBinaryVenueIds(indexerUrl) {
    // distinct_on the PAIR, not venueId alone: venue ids are operator-scoped, so
    // distinct on venueId alone could collapse an operator's venues. Hasura
    // requires the distinct_on columns to lead order_by.
    const data = await IndexerRead.gqlRequest(BinaryOriginPairsQuery, {}, indexerUrl);
    return data.Market.filter((m) => m.venueId != null && m.operatorId != null);
}
/**
 *  Distinct asset symbols present across binary markets — the cheap
 *  server-side source for an asset filter's options (Hasura `distinct_on`), so
 *  a UI never fetches every market to learn which assets exist.
 */
export async function listBinaryAssets(indexerUrl) {
    const data = await IndexerRead.gqlRequest(BinaryAssetsQuery, {}, indexerUrl);
    return data.Market.map((m) => m.asset).filter((a) => a != null && a.length > 0);
}
/** Shared `where` for {@link countBinaryMarkets} / {@link countBinaryMarketsBounded}. */
function binaryMarketCountWhere(opts) {
    const where = { marketType: { _eq: "BINARY" } };
    if (opts.phase != null) {
        // `expiry` is a `numeric` column, so its comparison takes a STRING (Hasura
        // also accepts a JSON number and coerces it, but the schema-derived type is
        // the contract — send what it declares).
        const now = String(opts.nowSec ?? Math.floor(Date.now() / 1000));
        where.expiry = opts.phase === "live" ? { _gt: now } : { _lte: now };
    }
    return applyBinaryFilter(where, opts);
}
/**
 *  Server-side COUNT of binary markets matching a filter, optionally split by
 *  lifecycle phase (`"live"` = `expiry > now`, `"past"` = `expiry <= now`; no
 *  `phase` counts both). Uses Hasura `Market_aggregate` so a total never
 *  requires fetching rows — the browser learns "1,240 live" in O(1), not by
 *  loading 1,240 markets.
 *
 *  WITHOUT THAT HEADER THE TOTAL IS A LOWER BOUND, capped at
 *  {@link IndexerRead.COUNT_FALLBACK_CAP} — which `Market` passes during 2026.
 *  {@link countBinaryMarketsBounded} says whether it was; a paginator gating on
 *  `rows.length < count` needs it.
 */
export async function countBinaryMarkets(opts = {}, indexerUrl, headers) {
    return IndexerRead.aggregateCount(MarketCountDocuments, binaryMarketCountWhere(opts), indexerUrl, headers);
}
/**
 *  {@link countBinaryMarkets}, reporting whether the read was cut short — see
 *  {@link IndexerRead.CountResult}. `truncated: true` means more markets match
 *  than `count` says, so a `rows.length < count` pagination gate would stop
 *  early.
 */
export async function countBinaryMarketsBounded(opts = {}, indexerUrl, headers) {
    return IndexerRead.aggregateCountBounded(MarketCountDocuments, binaryMarketCountWhere(opts), indexerUrl, headers);
}
/**
 *  Fetch one binary market by primary key (lowercased bytes32 marketId),
 *  narrowed to {@link BinaryMarket} (null if absent or not binary).
 */
export async function getBinaryMarket(id, indexerUrl) {
    const m = await getMarket(id, indexerUrl);
    return m && isBinaryMarket(m) ? m : null;
}
/**
 *  Fetch the fee config frozen into a market (null when the market has no venue
 *  attribution — e.g. spot/perp, or pre-plumbing binary markets).
 */
export async function getMarketFees(marketId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(MarketFeesQuery, { id: marketId.toLowerCase() }, indexerUrl);
    return data.MarketVenue_by_pk;
}
/**
 *  List spot markets, newest first, pre-narrowed to {@link SpotMarket}[]. Pass a
 *  {@link SpotMarketFilter} (+ `limit`) to narrow by base/quote symbol.
 */
export async function listSpotMarkets(opts = {}, indexerUrl) {
    const where = { marketType: { _eq: "SPOT" } };
    if (opts.baseSymbol != null)
        where.baseSymbol = { _eq: opts.baseSymbol };
    if (opts.quoteSymbol != null)
        where.quoteSymbol = { _eq: opts.quoteSymbol };
    const data = await IndexerRead.gqlRequest(SpotMarketsQuery, { where, limit: opts.limit ?? 50 }, indexerUrl);
    return toMarkets(data.Market).filter(isSpotMarket);
}
/**
 *  One spot market by pool address, or null (also null if the id resolves to
 *  another market kind).
 */
export async function getSpotMarket(id, indexerUrl) {
    const m = await getMarket(id.toLowerCase(), indexerUrl);
    return m && isSpotMarket(m) ? m : null;
}
/**
 *  The status-transition history for a market (e.g. Trading → Locked → Settling
 *  → Resolved), oldest-first — the resolution/lock timeline for a market page.
 */
export async function getMarketStatusHistory(marketId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(MarketStatusHistoryQuery, { id: marketId.toLowerCase() }, indexerUrl);
    return data.MarketStatusUpdate;
}
/**
 *  List perp markets, newest first, pre-narrowed to {@link PerpMarket}[].
 *
 * **Details**
 *
 * - `opts`: {@link PerpMarketFilter} plus `limit` (max rows, default 50).
 */
export async function listPerpMarkets(opts = {}, indexerUrl) {
    const where = { marketType: { _eq: "PERP" } };
    if (opts.baseSymbol != null)
        where.baseSymbol = { _eq: opts.baseSymbol };
    if (opts.quoteSymbol != null)
        where.quoteSymbol = { _eq: opts.quoteSymbol };
    const data = await IndexerRead.gqlRequest(PerpMarketsQuery, { where, limit: opts.limit ?? 50 }, indexerUrl);
    return toMarkets(data.Market).filter(isPerpMarket);
}
/**
 *  Fetch one perp market by primary key (lowercased pool address), narrowed to
 *  {@link PerpMarket} (null if absent or not a perp).
 */
export async function getPerpMarket(id, indexerUrl) {
    const m = await getMarket(id.toLowerCase(), indexerUrl);
    return m && isPerpMarket(m) ? m : null;
}
/**
 *  Paginated list of CURRENTLY LIVE binary markets (`expiry > now`), soonest-to-
 *  expire first. `limit` + `offset` cursor the live board exactly like
 *  {@link listPastBinaryMarkets} does the historical tail — the caller fetches
 *  page 1 server-side and more pages on demand. Pass a
 *  {@link LiveBinaryMarketsFilter} to narrow by operator / venue / asset /
 *  cadence / status / search.
 */
export async function listLiveBinaryMarkets(filter = {}, indexerUrl) {
    // String, not number: `expiry` is a `numeric` column (see countBinaryMarkets).
    const now = String(filter.nowSec ?? Math.floor(Date.now() / 1000));
    const where = applyBinaryFilter({ marketType: { _eq: "BINARY" }, expiry: { _gt: now } }, filter);
    // Live keeps closingSoon (expiry asc) as its default; an explicit orderBy overrides.
    const orderBy = binaryOrderBy(filter.orderBy, { expiry: "asc" });
    const data = await IndexerRead.gqlRequest(LiveBinaryMarketsQuery, { where, orderBy, limit: filter.limit ?? 50, offset: filter.offset ?? 0 }, indexerUrl);
    return toMarkets(data.Market).filter(isBinaryMarket);
}
/**
 *  Paginated list of PAST binary markets (`expiry <= now`), most-recently-
 *  expired first. `limit` + `offset` cursor the historical tail — the caller
 *  typically fetches page 1 on initial render (server-side) and additional
 *  pages client-side on user demand. Live markets are excluded; use
 *  {@link listLiveBinaryMarkets} for those. Accepts the same
 *  {@link BinaryMarketFilter} (venue / asset / cadence / status).
 */
export async function listPastBinaryMarkets(opts = {}, indexerUrl) {
    // String, not number: `expiry` is a `numeric` column (see countBinaryMarkets).
    const now = String(opts.nowSec ?? Math.floor(Date.now() / 1000));
    const where = applyBinaryFilter({ marketType: { _eq: "BINARY" }, expiry: { _lte: now } }, opts);
    const data = await IndexerRead.gqlRequest(PastBinaryMarketsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return toMarkets(data.Market).filter(isBinaryMarket);
}
/**
 *  The level a binary market's outcome is measured against, in the oracle's
 *  price scale — the one answer to that question, for every surface that asks.
 *
 *  Which source supplies it is exactly {@link BinaryMarket.mode}:
 *
 *  - `"reference"` — the posted answer to the market's reference question, from
 *    the `openingPrices` map that `client.getOpeningPrices` returns. `null` until the oracle
 *    posts it, which is a real and temporary state.
 *  - `"fixed"` — the market's own `strike`, known from creation.
 *
 *  Null on a chain-seeded market row, whose `strike`/`mode` are both null —
 *  same em dash as an unposted reference answer, which is what a surface with
 *  no boundary to show wants either way.
 *
 *  `posted` says WHICH, because it decides what a caller may CLAIM about the
 *  number: only a posted answer has an "answered at" instant, so only it may be
 *  labelled as one. Returning it here rather than letting callers re-test the
 *  map keeps the label and the value derived from one decision.
 *
 *  Lives here rather than in a UI because it is protocol knowledge, not
 *  presentation: which of two mechanisms a venue chose.
 *
 *  Scale is the caller's to apply, as with any raw oracle value.
 *
 * @category markets
 */
export function boundaryPrice(m, openingPrices) {
    // A chain-seeded row knows neither, and "unknown" is not "reference" — the
    // reference branch below would report "no opening answer yet" for a market
    // that may well have a fixed strike. Null is the honest answer.
    if (m.mode == null || m.strike == null)
        return null;
    if (m.mode === "reference") {
        // `getOpeningPrices` lowercases every key it writes.
        const answered = openingPrices[m.id.toLowerCase()];
        return answered ? { raw: answered, posted: true } : null;
    }
    // No re-test of the strike-0 sentinel here: `mode` IS that reading, so a
    // "fixed" market has a usable strike by construction. Re-deriving it would put
    // the rule back in the place this field exists to remove it from.
    return { raw: m.strike, posted: false };
}
/**
 *  Batch-fetch the OPENING price (the reference-question oracle answer) for many
 *  binary markets in ONE pair of round-trips — for list views that want to show
 *  each up/down market's opening price without an N+1 fan-out. Returns a map of
 *  lowercased marketId → raw `numericValue` (or `null` when the reference has no
 *  answer yet / the market has no reference question). Format with the market's
 *  oracle price scale (see the explorer's `fmtOraclePrice`).
 */
export async function getOpeningPrices(marketIds, indexerUrl) {
    const out = {};
    const ids = marketIds.map((m) => m.toLowerCase());
    if (ids.length === 0)
        return out;
    // market → its reference (opening-price) question id.
    const links = await IndexerRead.gqlRequest(OpeningRefsQuery, { ids }, indexerUrl);
    const marketToQid = new Map();
    const qids = new Set();
    for (const l of links.MarketReferenceLink) {
        marketToQid.set(l.market.toLowerCase(), String(l.referenceQuestionId));
        qids.add(String(l.referenceQuestionId));
    }
    if (qids.size === 0)
        return out;
    // reference question → numeric answer (OracleAnswer.id == oracleQuestionId).
    const answers = await IndexerRead.gqlRequest(OracleAnswersByQidQuery, { qids: [...qids] }, indexerUrl);
    const qToVal = new Map();
    // Deliberately NOT filtered on `voided`, unlike the resolution read below.
    // A voided REFERENCE answer means the baseline is undefined, which voids the
    // market rather than settling it — the module handles that, and the opening
    // price stays what the oracle posted. Changing it here would alter what the
    // series graph plots for markets that resolved perfectly well.
    for (const a of answers.OracleAnswer)
        qToVal.set(String(a.id), a.numericValue);
    for (const [market, qid] of marketToQid)
        out[market] = qToVal.get(qid) ?? null;
    return out;
}
/**
 *  Batch-fetch the RESOLUTION price (the answer the market settled on) for many
 *  binary markets in ONE pair of round-trips — the settlement counterpart to
 *  {@link getOpeningPrices}, for views that mark where the price finished.
 *
 *  Joins each market's OWN `oracleQuestionId` to its {@link OracleAnswer}, so
 *  unlike the opening price this works for FIXED-STRIKE markets too: they have
 *  no reference question, but they do have a resolution one. Returns a map of
 *  lowercased marketId → raw `numericValue`, or `null` where the market is
 *  unresolved, carries no question id, or the oracle has posted nothing.
 *
 *  A VOIDED answer returns `null`, not its raw `numericValue`: the oracle
 *  declined to answer, so there is no settlement price to report.
 *
 *  SCALE IS NOT CARRIED, and that is a trap worth stating. Callers scale these
 *  by the explorer's `ORACLE_PRICE_DECIMALS` (2), which is empirical, not
 *  schema-backed: `OracleAnswer` has no decimals column, because `numericDecimals`
 *  lives in the question definition at schedule time and is not on `AnswerPosted`.
 *  Adapters genuinely differ — `getOnchainResolutionPrice` reads `PRICE_DECIMALS`
 *  for that reason and sees 18 on the price-feed adapter, 2 on OracleHub.
 *
 *  So the day the indexer starts ingesting an 18-decimal adapter's answers, this
 *  function begins returning 18-decimal values that every caller divides by 100.
 *  Worse, the on-chain fallback that WOULD read the right scale is gated on the
 *  indexed value being absent, so it switches off exactly when it is needed.
 *  Whoever lands that indexer change must carry `numericDecimals` onto
 *  `OracleAnswer` and return it here in the same commit.
 */
export async function getResolutionPrices(marketIds, indexerUrl) {
    const out = {};
    const ids = marketIds.map((m) => m.toLowerCase());
    if (ids.length === 0)
        return out;
    // market → its own resolution question id.
    const rows = await IndexerRead.gqlRequest(ResolutionQidsQuery, { ids }, indexerUrl);
    const marketToQid = new Map();
    const qids = new Set();
    for (const r of rows.Market) {
        if (r.oracleQuestionId == null || r.oracleQuestionId === "")
            continue;
        marketToQid.set(r.id.toLowerCase(), String(r.oracleQuestionId));
        qids.add(String(r.oracleQuestionId));
    }
    if (qids.size === 0)
        return out;
    const answers = await IndexerRead.gqlRequest(OracleAnswersByQidQuery, { qids: [...qids] }, indexerUrl);
    const qToVal = new Map();
    // A VOIDED answer is not a settlement price — the oracle declined to answer
    // and the market pays 50/50. Its `numericValue` is whatever the void path
    // happened to write, so handing it back would let a caller present a number
    // as "what settled this market" for a market that nothing settled.
    for (const a of answers.OracleAnswer)
        qToVal.set(String(a.id), a.voided ? null : a.numericValue);
    for (const [market, qid] of marketToQid)
        out[market] = qToVal.get(qid) ?? null;
    return out;
}
/**
 *  Map a {@link BinaryMarketOrderBy} to a Hasura `order_by` object, or fall back
 *  to `fallback` when unset. All keys are indexed Market columns.
 */
function binaryOrderBy(orderBy, fallback) {
    switch (orderBy) {
        case "newest":
            return { createdAtTimestamp: "desc" };
        case "closingSoon":
            return { expiry: "asc" };
        case "volume":
            return { cumulativeQuoteVolume: "desc" };
        case "tradeCount":
            return { tradeCount: "desc" };
        case "resolvedAt":
            // Second-granularity timestamps tie often; the id makes the order total.
            return [{ resolvedAtTimestamp: "asc" }, { id: "asc" }];
        default:
            return fallback;
    }
}
/**
 *  Add the set fields of a {@link BinaryMarketFilter} to a Hasura `where` object.
 *  Only non-null fields are added — a bare `{_eq: undefined}` / `{_eq: null}`
 *  would collapse to "IS NULL" and silently drop rows.
 */
function applyBinaryFilter(where, f) {
    if (f.operatorId != null)
        where.operatorId = { _eq: f.operatorId };
    if (f.venueId != null)
        where.venueId = { _eq: f.venueId.toLowerCase() };
    if (f.asset != null)
        where.asset = { _eq: f.asset };
    // A cadence is matched as a BAND, not an exact value. The indexed
    // `intervalSec` is `expiry − tradingStart`, and trading routinely opens a
    // second or two late, so a 15m series is indexed at 898/899/900 — an `_eq`
    // here returned a fraction of the series and called it the whole cadence.
    // See `cadenceBandSec`; the rungs are far enough apart that bands never overlap.
    if (f.intervalSec != null) {
        const { minSec, maxSec } = Interval.cadenceBandSec(Number(f.intervalSec));
        where.intervalSec = { _gte: String(minSec), _lte: String(maxSec) };
    }
    if (f.status != null)
        where.clobStatus = { _eq: f.status };
    if (f.resolved != null)
        where.resolvedAtTimestamp = f.resolved ? { _is_null: false } : { _is_null: true };
    if (f.voided != null)
        where.voided = { _eq: f.voided };
    // `resolvedAtTimestamp` is a `numeric` column, so the bound is sent as a
    // STRING (see countBinaryMarkets) - `String()` renders a bigint and a whole
    // number identically, which is what lets the facet take either. Merged into
    // whatever `resolved` wrote rather than over it, so the two facets AND
    // together on one column.
    if (f.resolvedSince != null) {
        where.resolvedAtTimestamp = { ...where.resolvedAtTimestamp, _gte: String(f.resolvedSince) };
    }
    if (f.resolvedBefore != null) {
        where.resolvedAtTimestamp = { ...where.resolvedAtTimestamp, _lt: String(f.resolvedBefore) };
    }
    if (f.creator != null)
        where.creator = { _eq: f.creator.toLowerCase() };
    const needle = f.search?.trim();
    if (needle) {
        const pattern = `%${needle}%`;
        where._or = [{ asset: { _ilike: pattern } }, { question: { _ilike: pattern } }];
    }
    return where;
}
// prettier-ignore
const MarketsQuery = graphql(`
  query Markets($where: Market_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(where: $where, order_by: { createdAtTimestamp: desc }, limit: $limit, offset: $offset) {
      ...MarketFields
    }
  }
`);
// prettier-ignore
const MarketByPkQuery = graphql(`
  query MarketByPk($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market_by_pk(id: $id) {
      ...MarketFields
    }
  }
`);
// prettier-ignore
const MarketByAddressQuery = graphql(`
  query MarketByAddress($a: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(
      where: { marketAddress: { _eq: $a } }
      order_by: { createdAtTimestamp: desc }
      limit: 1
    ) {
      ...MarketFields
    }
  }
`);
// prettier-ignore
const BinaryMarketsQuery = graphql(`
  query BinaryMarkets($where: Market_bool_exp!, $orderBy: [Market_order_by!], $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
      ...MarketFields
    }
  }
`);
// prettier-ignore
const SpotMarketsQuery = graphql(`
  query SpotMarkets($where: Market_bool_exp!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(where: $where, order_by: { createdAtTimestamp: desc }, limit: $limit) {
      ...MarketFields
    }
  }
`);
// prettier-ignore
const PerpMarketsQuery = graphql(`
  query PerpMarkets($where: Market_bool_exp!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(where: $where, order_by: { createdAtTimestamp: desc }, limit: $limit) {
      ...MarketFields
    }
  }
`);
// prettier-ignore
const LiveBinaryMarketsQuery = graphql(`
  query LiveBinaryMarkets(
    $where: Market_bool_exp!
    $orderBy: [Market_order_by!]
    $limit: Int!
    $offset: Int!
  ) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
      ...MarketFields
    }
  }
`);
// prettier-ignore
const PastBinaryMarketsQuery = graphql(`
  query PastBinaryMarkets($where: Market_bool_exp!, $limit: Int!, $offset: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(where: $where, order_by: { expiry: desc }, limit: $limit, offset: $offset) {
      ...MarketFields
    }
  }
`);
// ---------------------------------------------------------------------------
// Typed documents for the reads above. Hoisted here (rather than inline at each
// call site) to keep this file's reading order: functions first, GraphQL after.
// Result and variable types are derived from the committed schema snapshot.
// prettier-ignore
const BinaryOriginPairsQuery = graphql(`
  query BinaryOriginPairs {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Market(
           distinct_on: [operatorId, venueId],
           where: {marketType: {_eq: "BINARY"}, operatorId: {_is_null: false}, venueId: {_is_null: false}},
           order_by: [{operatorId: asc}, {venueId: asc}]
         ) {
           operatorId
           venueId
         }
       }
`);
// prettier-ignore
const BinaryAssetsQuery = graphql(`
  query BinaryAssets {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Market(distinct_on: asset, where: {marketType: {_eq: "BINARY"}, asset: {_is_null: false}}, order_by: {asset: asc}) {
           asset
         }
       }
`);
// prettier-ignore
const MarketFeesQuery = graphql(`
  query MarketFees($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarketVenue_by_pk(id: $id) {
           operatorId venueId feeRecipient
           makerFeeBps takerFeeBps maxBuilderFeeBps routingFeeBps settlementFeeBps settlementFeesCollected
         }
       }
`);
// prettier-ignore
const MarketStatusHistoryQuery = graphql(`
  query MarketStatusHistory($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarketStatusUpdate(where: {market_id: {_eq: $id}}, order_by: {timestamp: asc}) {
           oldStatus newStatus blockNumber timestamp txHash
         }
       }
`);
// prettier-ignore
const OracleAnswersByQidQuery = graphql(`
  query OracleAnswersByQid($qids: [String!]) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OracleAnswer(where: {id: {_in: $qids}}) { id numericValue voided }
       }
`);
// prettier-ignore
const ResolutionQidsQuery = graphql(`
  query ResolutionQids($ids: [String!]) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Market(where: {id: {_in: $ids}}) { id oracleQuestionId }
       }
`);
// prettier-ignore
const OpeningRefsQuery = graphql(`
  query OpeningRefs($ids: [String!]) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarketReferenceLink(where: {market_id: {_in: $ids}}) { market: market_id referenceQuestionId }
       }
`);
/**
 *  Read a market's RESOLUTION price straight from chain: resolve the market's
 *  bound oracle adapter + question id through the module, then pull the numeric
 *  answer from that adapter.
 *
 *  This is the fallback for an answer the indexer does not have. Adapters other
 *  than the one whose events the indexer ingests still resolve markets — their
 *  answers simply never reach the `OracleAnswer` table — so a market can be
 *  settled on chain with a price no query can see. Reading through the module
 *  record means this works for ANY adapter, because the market itself names the
 *  one that resolved it.
 *
 *  Returns `null` when the question is not final: `pullNumericAnswer` reverts
 *  in that case by interface contract, which is a state, not a failure.
 *
 *  The scale is read from the adapter (`PRICE_DECIMALS`) rather than assumed —
 *  adapters genuinely differ, and mis-scaling a price by 10^16 is worse than
 *  showing none. `fallbackDecimals` covers the adapters with no getter.
 */
export async function getOnchainResolutionPrice(marketId, sources, client, ownedFailure = (_error) => false, firstOwnedFailure = () => undefined) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(marketId)) {
        throw new InvalidInputError(`getOnchainResolutionPrice takes the bytes32 marketId — got ${marketId}`);
    }
    const rec = await client.readContract({
        address: sources.module,
        abi: ModuleAbi.binaryModuleReadAbi,
        functionName: "markets",
        args: [marketId],
    });
    const oracleQuestionId = rec[0];
    const adapter = rec[6];
    if (oracleQuestionId === 0n || /^0x0{40}$/.test(adapter))
        return null;
    const a = { address: adapter, abi: ModuleAbi.oracleAdapterReadAbi };
    // Both reads are opportunistic — the answer reverts until the question is
    // final, and the scale getter is absent on some adapters — but ONLY a revert
    // is that state. A transport failure is a failed read and must surface
    // (SDK-IO-002: absence and failure are different values; SDK-ERR-006: an
    // operational failure is not converted to absence).
    //
    // This matters most on the scale: the transport is un-batched, so these are
    // two independent eth_calls that can fail independently. Swallowing a failed
    // `PRICE_DECIMALS` would silently fall back to 2 and render an 18-decimal
    // answer 10^16 too large — the exact outcome this function's own doc says is
    // worse than showing nothing.
    let fatal;
    let operational;
    const revertIsAbsence = (error) => {
        if (ownedFailure(error))
            fatal ??= firstOwnedFailure() ?? error;
        else if (!(error instanceof ContractRevertError))
            operational ??= { error };
        return null;
    };
    const [answer, scale] = await Promise.all([
        client.readContract({ ...a, functionName: "pullNumericAnswer", args: [oracleQuestionId] }).catch(revertIsAbsence),
        client.readContract({ ...a, functionName: "PRICE_DECIMALS" }).catch(revertIsAbsence),
    ]);
    // Every started oracle leg has settled. Ordinary contract absence cannot
    // erase a registered owner failure or leave an unobserved partner rejection.
    if (fatal)
        throw fatal;
    if (operational)
        throw operational.error;
    if (answer == null)
        return null;
    const [numericValue, voided] = answer;
    return {
        numericValue: numericValue.toString(),
        decimals: scale != null ? Number(scale) : (sources.fallbackDecimals ?? 2),
        voided,
        adapter,
        oracleQuestionId: oracleQuestionId.toString(),
    };
}
/**
 * Read a market's wiring + live state by its bytes32 `marketId`.
 *
 * BREAKING (settlement-extraction v2, SDK 0.13.0): this took the BinaryMarket
 * contract ADDRESS before; it now takes the module `marketId` and resolves the
 * record through the BinaryMarketsModule. A pool (or its market contract
 * address) can no longer stand in for a market identity — pools are recycled
 * across successive markets — so every market-keyed read goes through
 * `marketId`. A 20-byte address is rejected loudly at runtime.
 */
export async function getMarketOnchain(marketId, sources, client) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(marketId)) {
        throw new InvalidInputError("getMarketOnchain now takes the bytes32 marketId " +
            "(0.13.0 breaking change) — got a non-32-byte value. Resolve the id via " +
            "listBinaryMarkets / the indexer instead of passing a contract address.");
    }
    const pc = client;
    // 1. The module record: market/pool addresses, ids, collateral, window, nonce.
    const [rec, nonce] = await Promise.all([
        pc.readContract({
            address: sources.module,
            abi: ModuleAbi.binaryModuleReadAbi,
            functionName: "markets",
            args: [marketId],
        }),
        pc.readContract({
            address: sources.module,
            abi: ModuleAbi.binaryModuleReadAbi,
            functionName: "marketNonce",
            args: [marketId],
        }),
    ]);
    const collateral = rec[3];
    const marketAddress = rec[8];
    const pool = rec[9];
    const yesId = rec[10];
    const noId = rec[11];
    const expiry = rec[13];
    if (/^0x0{40}$/.test(marketAddress)) {
        throw new InvalidInputError(`unknown marketId ${marketId} on the module`);
    }
    // 2. The market contract's live lifecycle state.
    const m = { address: marketAddress, abi: ReadsAbi.binaryMarketReadAbi };
    const [outcomeToken, status, poolBacking, payoutNumerators, isResolved, isVoided, decimals, voidPolicy] = await Promise.all([
        pc.readContract({ ...m, functionName: "outcomeToken" }),
        pc.readContract({ ...m, functionName: "status" }),
        pc.readContract({ ...m, functionName: "backing" }),
        pc.readContract({ ...m, functionName: "payoutNumerators" }),
        pc.readContract({ ...m, functionName: "isResolved" }),
        pc.readContract({ ...m, functionName: "isVoided" }),
        Balances.cachedErc20Decimals(collateral, pc, Store.DECIMALS),
        // Snapshot-generation markets only — pre-policy clones lack the selector.
        pc.readContract({ ...m, functionName: "voidPolicy" }).then((v) => Number(v), () => null),
    ]);
    // Settlement v3 stores a payout VECTOR, not a single winner. Derive the winning
    // index as the argmax (a resolved binary win is [D,0] or [0,D]; a void is the
    // uniform [D/2,D/2] → argmax 0, disambiguated by `isVoided`). Empty vector
    // (unresolved) → 0. Always gate a UI on `isResolved`/`isVoided`, never this alone.
    const vec = payoutNumerators ?? [];
    let winningOutcome = 0;
    for (let i = 1; i < vec.length; i++) {
        if ((vec[i] ?? 0n) > (vec[winningOutcome] ?? 0n))
            winningOutcome = i;
    }
    // 3. Post-finalize fallback: `market.backing()` reads 0 once the pool swept its
    // backing to settlement — the settlement record's NET backing is the live pot.
    let backing = poolBacking;
    let finalized = false;
    if (sources.settlement) {
        const record = (await pc.readContract({
            address: sources.settlement,
            abi: ReadsAbi.binarySettlementAbi,
            functionName: "getSettlement",
            args: [Ids.marketKey(yesId)],
        }));
        if (record.finalized) {
            finalized = true;
            backing = record.backing;
        }
    }
    return {
        marketAddress,
        outcomeToken: outcomeToken,
        yesId,
        noId,
        pool,
        nonce,
        collateral,
        status: Number(status),
        backing,
        finalized,
        expiry,
        decimals,
        winningOutcome: Number(winningOutcome),
        isResolved: isResolved,
        isVoided: isVoided,
        voidPolicy,
    };
}
/**
 *  Read which market a binary pool currently hosts, from chain alone.
 *
 *  This is the cold-start source of the `(pool, marketId)` binding. The ordinary
 *  source is the indexer, which is the service that is unreachable when a chain
 *  seed is needed. Pass the result's `marketId` to
 *  `watchMarket(pool, { seed: "chain", marketId })` to start a live book with
 *  the indexer down.
 *
 *  The binding is exact under pool recycling. A pool serves successive markets,
 *  and `market()` names the current one; the module's reverse lookup maps that
 *  market address to its id and is written once per market and never deleted.
 *
 *  Both reads are made at ONE block. That is required, not an optimisation: if
 *  the id read landed on a node behind the pool read, it would return zero just
 *  after a recycle and this would report a false `null`.
 *
 *  Resolves to `null` only for known absence. Absence means one thing here: the
 *  pool's market does not belong to this module, so the reverse lookup answers
 *  zero. A failed read throws and never becomes `null`.
 *
 *  Hold only the market address? Use `getMarketIdOnchain(marketAddress)`, which
 *  is the same reverse lookup without the pool reads.
 *
 *  The result is verified before it is returned: the module's own record for the
 *  id must name this pool, and its nonce must equal the pool's. A mismatch means
 *  the pool and the module disagree, so the read throws rather than return a
 *  binding that would filter a book on the wrong market.
 *
 * @throws {@link InvalidInputError} when the module record contradicts the pool.
 * @category markets
 */
export async function getPoolMarketBinding(pool, module, client, opts) {
    // ONE block for both reads, and for the verification below. Sample the head
    // once when the caller did not pin one, so every read below sees one state.
    if (opts?.blockNumber !== undefined && opts.blockNumber < 0n) {
        throw new InvalidInputError("blockNumber must be nonnegative");
    }
    const blockNumber = opts?.blockNumber ?? (await client.getBlockNumber());
    const params = await client.readContract({
        address: pool,
        abi: ReadsAbi.binaryPoolReadAbi,
        functionName: "getBinaryPoolParams",
        blockNumber,
    });
    const marketAddress = params.market;
    const marketId = await client.readContract({
        address: module,
        abi: ModuleAbi.binaryModuleReadAbi,
        functionName: "marketIdByAddress",
        args: [marketAddress],
        blockNumber,
    });
    // Known absence: this module never created the pool's market. Distinct from a
    // failed read, which threw above.
    if (/^0x0{64}$/.test(marketId))
        return null;
    // The module's own record must agree with the pool. `markets(id).pool` and the
    // module's per-market nonce are the exact verifier; a disagreement means the
    // id would filter the book on the wrong market.
    const [record, moduleNonce] = await Promise.all([
        client.readContract({
            address: module,
            abi: ModuleAbi.binaryModuleReadAbi,
            functionName: "markets",
            args: [marketId],
            blockNumber,
        }),
        client.readContract({
            address: module,
            abi: ModuleAbi.binaryModuleReadAbi,
            functionName: "marketNonce",
            args: [marketId],
            blockNumber,
        }),
    ]);
    const recordPool = record[9];
    if (recordPool.toLowerCase() !== pool.toLowerCase()) {
        throw new InvalidInputError(`pool ${pool} reports market ${marketAddress} (id ${marketId}), but the module records that market on pool ${recordPool}`);
    }
    if (BigInt(moduleNonce) !== BigInt(params.marketNonce)) {
        throw new InvalidInputError(`pool ${pool} is at market nonce ${params.marketNonce}, but the module records nonce ${moduleNonce} for market ${marketId}`);
    }
    return {
        pool,
        marketId,
        marketAddress,
        nonce: BigInt(params.marketNonce),
        finalized: params.finalized,
        blockNumber,
    };
}
/**
 * The clone address is immutable for one market generation. Read it afresh on
 * the owner's decorated boundary before a facade write; a cached registry row
 * can remain Trading after its pool has been recycled. This is a preflight,
 * not an atomic on-chain generation constraint.
 */
export async function assertBinaryPoolGeneration(pool, marketAddress, client) {
    if (!/^0x[0-9a-f]{40}$/i.test(marketAddress) || /^0x0{40}$/i.test(marketAddress)) {
        throw new InvalidInputError("a binary write requires the requested market's immutable contract address");
    }
    const params = await client.readContract({
        address: pool,
        abi: ReadsAbi.binaryPoolReadAbi,
        functionName: "getBinaryPoolParams",
    });
    if (params.market.toLowerCase() !== marketAddress.toLowerCase()) {
        throw new InvalidInputError(`pool ${pool} now hosts market ${params.market}, not requested market ${marketAddress}; refresh loadMarkets(true) before selecting a tradable market`);
    }
}
/**
 *  Read a BinaryMarket contract address's module id, from chain alone.
 *
 *  Use this when you hold a market ADDRESS and need its `marketId` — the id is
 *  what every market-keyed read takes. A market page whose route carries the
 *  contract address is the usual case. The indexer answers the same question
 *  through `getBinaryMarketByAddress`, so this read exists for the times the
 *  indexer is unreachable.
 *
 *  The mapping is written once per market and never deleted, so an address
 *  resolves to the same id for the module's lifetime. This is the same lookup
 *  `getPoolMarketBinding` performs; use that one when you hold a pool address.
 *
 *  Resolves to `null` for known absence: this module did not create the market.
 *  A failed read throws and never becomes `null`.
 *
 * @category markets
 */
export async function getMarketIdOnchain(marketAddress, module, client, opts) {
    if (opts?.blockNumber !== undefined && opts.blockNumber < 0n) {
        throw new InvalidInputError("blockNumber must be nonnegative");
    }
    const marketId = await client.readContract({
        address: module,
        abi: ModuleAbi.binaryModuleReadAbi,
        functionName: "marketIdByAddress",
        args: [marketAddress],
        ...(opts?.blockNumber === undefined ? {} : { blockNumber: opts.blockNumber }),
    });
    if (/^0x0{64}$/.test(marketId))
        return null;
    return marketId;
}
/**
 *  A pool's creator — its first-deploy market creator, the only party that can
 *  reuse it (settlement-extraction v2 creator-scoped pool reuse). Zero address
 *  for a pool the module never deployed. Pure chain read (no signer) — the
 *  indexer-backed equivalent is `getPool(address)`'s `creator`.
 */
export async function getPoolCreator(pool, module, client) {
    return client.readContract({
        address: module,
        abi: ModuleAbi.binaryModuleReadAbi,
        functionName: "poolCreator",
        args: [pool],
    });
}
export async function getContractMeta(address, opts, client, ownedFailure = (_error) => false, firstOwnedFailure = () => undefined) {
    const zero = "0x0000000000000000000000000000000000000000";
    let fatal;
    const contain = (fallback) => (error) => {
        if (ownedFailure(error))
            fatal ??= firstOwnedFailure() ?? error;
        return fallback;
    };
    const [owner, impl, balance] = await Promise.all([
        client.readContract({ address, abi: _ownableAbi, functionName: "owner" }).catch(contain(null)),
        opts.proxy
            ? client
                .getStorageAt({ address, slot: _EIP1967_IMPL_SLOT })
                .then((raw) => {
                if (!raw || raw.length < 42)
                    return null;
                // The ANNOTATION is load-bearing: an uncontextualized template literal
                // infers as `string`, so without it this needs a cast. With it, tsc
                // CHECKS the literal against `0x${string}` instead of being told to
                // trust it — the `0x` prefix is right there in the expression.
                const addr = `0x${raw.slice(-40)}`;
                return addr.toLowerCase() === zero ? null : addr;
            })
                .catch(contain(null))
            : Promise.resolve(null),
        client.getBalance({ address }).catch(contain(0n)),
    ]);
    // All started legs have settled; ordinary fallbacks cannot erase the first
    // owned transport failure or leave a partner rejection unobserved.
    if (fatal)
        throw fatal;
    return { owner, impl, balance };
}
// ----------------------------------------------------------------- contract diagnostics
// Ops-dashboard reads (the /system page): owner(), the EIP-1967 implementation
// slot (proxies), and native balance. Routed through the SDK's own client so the
// page never spins up a second viem transport of its own.
const _ownableAbi = [
    { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];
// keccak256("eip1967.proxy.implementation") - 1
const _EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
// The two count documents for `Market` (see IndexerRead.CountDocuments).
const MarketCountDocuments = {
    table: "Market",
    // prettier-ignore
    aggregate: graphql(`
    query MarketCount($where: Market_bool_exp!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      total: Market_aggregate(where: $where) { aggregate { count } }
    }
  `),
    // prettier-ignore
    fallback: graphql(`
    query MarketCountFallback($where: Market_bool_exp!, $limit: Int!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      rows: Market(where: $where, limit: $limit) { id }
    }
  `),
};
