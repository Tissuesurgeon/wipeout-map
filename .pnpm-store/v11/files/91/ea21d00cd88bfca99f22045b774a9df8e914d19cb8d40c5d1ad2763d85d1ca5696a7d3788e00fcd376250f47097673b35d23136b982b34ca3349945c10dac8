// Perp history — the indexed record of funding, margin and liquidation events.
//
// PERP-ONLY entities, each its own stream: funding payments (per position, per
// settlement), margin events (deposits/withdrawals), liquidations, and the
// funding-rate / open-interest time series a chart reads.
import * as IndexerRead from "../indexerRead.js";
import { graphql } from "../gql/gql.js";
import { IndexerError, InvalidInputError, PerpPositionChangesUnavailableError } from "../errors.js";
/**
 *  Every value {@link LiquidationEvent.kind} can carry, in the order the waterfall
 *  emits them. The vocabulary {@link ListLiquidationsOptions.kind} and
 *  {@link ListLiquidationsOptions.kinds} filter on, so a
 *  filter cannot be spelled wrong.
 *
 * @category perpetual markets
 */
export const LIQUIDATION_KIND = [
    "AccountLiquidated",
    "PositionLiquidated",
    "PositionSkipped",
    "PositionTakenOver",
    "AutoDeleveraged",
    "Throttled",
    "KeeperReward",
    "OrderPanicked",
    "PositionTransferred",
    "CloseOutMarginSettled",
    "BadDebtAbsorbed",
    "ResidualBadDebt",
    "AdlPriceCapacityExhausted",
    "ResidualBackedByOpenPnl",
    "CoverageDeclined",
    "AdlSessionDiscarded",
    "AdlCapacityShortfall",
];
/**
 *  Whether a wire `kind` is one this SDK version knows, narrowing it to
 *  {@link LiquidationKind}.
 *
 *  This is the seam between the open rows and the closed filter, and it exists
 *  because the two really are different: {@link LiquidationEvent.kind} is whatever
 *  the DEPLOYED indexer wrote, which can outrun a pinned SDK, while
 *  {@link ListLiquidationsOptions.kind} and {@link ListLiquidationsOptions.kinds}
 *  are values the caller chooses and must not
 *  be able to misspell. Narrow a row's kind to switch on it exhaustively, or to
 *  pass it back into the filter; the false branch is the honest "a kind this
 *  version does not know" rather than a cast over it.
 *
 * @category perpetual markets
 */
export function isLiquidationKind(kind) {
    return LIQUIDATION_KIND.some((known) => known === kind);
}
/**
 *  An account's funding-payment history, newest first — optionally scoped to
 *  one pool, paginated.
 *
 *  Ordered by `(timestamp, id)`, which the live store and the plane hydration match
 *  exactly. Settlements share a block timestamp, so without the id tie-break a page
 *  boundary inside one timestamp keeps an arbitrary subset and the live and indexed
 *  halves of the same feed disagree about which rows exist.
 */
export async function getFundingPayments(account, opts = {}, indexerUrl) {
    const where = { account: { _eq: account.toLowerCase() } };
    if (opts.pool != null)
        where.pool = { _eq: opts.pool.toLowerCase() };
    const data = await IndexerRead.gqlRequest(FundingPaymentsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    // The indexer row has no chain column; the owner's context names the chain.
    return data.FundingPayment.map((row) => ({ ...row, chainId: indexerUrl.chainId }));
}
/**
 *  An account's margin-account movement history (deposits/withdraws/locks),
 *  newest first — paginated. `kinds` narrows it to the given movement types at the
 *  indexer, so order locks and unlocks do not fill a page that asks for other kinds.
 */
export async function getMarginEvents(account, opts = {}, indexerUrl) {
    const where = { account: { _eq: account.toLowerCase() } };
    if (opts.kinds != null)
        where.kind = { _in: marginEventKindList(opts.kinds) };
    const data = await IndexerRead.gqlRequest(MarginEventsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.MarginEvent;
}
// The runtime copy of MarginEventKind, which a JavaScript caller does not have. The
// `Record` type makes the compiler reject a missing or an extra key, so this copy
// cannot drift from the union.
const MARGIN_EVENT_KINDS = {
    Deposit: true,
    Withdraw: true,
    Locked: true,
    Unlocked: true,
    Credited: true,
};
/**
 *  The `kinds` filter as a Hasura `_in` list, checked before the request.
 *
 *  An empty list is passed through and matches nothing, as `listPerpPositionChanges`
 *  does: asking for no kinds has an empty answer. A kind the indexer never writes also
 *  matches no row, but that is a mistake rather than a question, and the empty page would
 *  look like an account with no such movements. A JavaScript caller can pass any value,
 *  so a non-array or an unknown kind throws instead of reaching the indexer.
 */
function marginEventKindList(kinds) {
    if (!Array.isArray(kinds)) {
        throw new InvalidInputError("Margin event kinds must be an array");
    }
    for (const kind of kinds) {
        if (typeof kind !== "string" || !Object.hasOwn(MARGIN_EVENT_KINDS, kind)) {
            throw new InvalidInputError(`Margin event kinds must contain only ${Object.keys(MARGIN_EVENT_KINDS).join(", ")}; got ${String(kind)}`);
        }
    }
    return [...kinds];
}
/**
 *  Liquidation events, newest first — filter by `account`, `counterparty`,
 *  `party`, `pool`, `kind`, and/or `kinds`,
 *  paginate.
 *
 *  `kind` is the filter that makes a bounded read meaningful. The rows are stages of one
 *  mechanism rather than repetitions of one event (see {@link LiquidationEvent.kind}), so
 *  one cascade produces many rows and an unfiltered `limit` is spent mostly on stages the
 *  caller did not ask about — a caller looking for `AutoDeleveraged` can have its whole
 *  page consumed by the summary and per-position legs of a single account, and conclude
 *  there were none. Filtering server-side spends the limit on the kind in question.
 *
 *  **The sort is a TOTAL order** — `timestamp`, then `blockNumber`, then the `id` primary
 *  key. `timestamp` alone left rows from one block tied, in an order the server could pick
 *  differently per request, so a page boundary inside a block could skip or repeat a row
 *  even against a table nobody was writing to. The tie-break removes that.
 *
 *  **It does not make offset paging snapshot-consistent.** The rows are a LIVE table: an
 *  event indexed ahead of your offset between two requests shifts everything down and
 *  repeats a row, and a reorg that removes one shifts up and skips a row. That is inherent
 *  to offset paging over changing data and no ordering fixes it — a cursor anchored on
 *  `(timestamp, blockNumber, id)`, or an upper bound pinned at the first page, is what
 *  would. Page when an approximate view is acceptable; narrow with `party`,
 *  `account`, `pool`, `kind`, or `kinds` and raise `limit` when it is not.
 *
 *  The ADL monitor this was added for does not page at all: it over-fetches one request and
 *  reports the ceiling, because a cascade it must not miss is worth more than a tidy page.
 */
export async function listLiquidations(opts = {}, indexerUrl) {
    return queryLiquidations(opts, indexerUrl);
}
/** The one query body behind both public wrappers, so the deprecated name cannot
 *  drift from the new one. */
async function queryLiquidations(opts, indexerUrl) {
    const where = {};
    if (opts.account != null)
        where.account = { _eq: opts.account.toLowerCase() };
    if (opts.counterparty != null)
        where.counterparty = { _eq: opts.counterparty.toLowerCase() };
    if (opts.party != null) {
        const party = opts.party.toLowerCase();
        where._or = [{ account: { _eq: party } }, { counterparty: { _eq: party } }];
    }
    if (opts.pool != null)
        where.pool = { _eq: opts.pool.toLowerCase() };
    // NOT lowercased, unlike the addresses above - see ListLiquidationsOptions.kind.
    // Hasura ANDs operators on one column, so a supplied kind and kinds both apply.
    const kind = {};
    if (opts.kind != null)
        kind._eq = opts.kind;
    if (opts.kinds?.length)
        kind._in = opts.kinds;
    if (Object.keys(kind).length > 0)
        where.kind = kind;
    const data = await IndexerRead.gqlRequest(LiquidationsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    // The indexer row has no chain column; the owner's context names the chain.
    return data.LiquidationEvent.map((row) => ({ ...row, chainId: indexerUrl.chainId }));
}
/**
 * Lists liquidation events through the compatibility alias, newest first.
 * Ties are broken by `blockNumber` and unique `id`, so offset paging is stable
 * while the indexed rows do not change.
 *
 *  @deprecated Renamed to {@link SomniaMarketsClient.listLiquidations | client.listLiquidations},
 *  per SDK-TYPE-006: `list*` returns an array, `get*` returns one value. Forwards verbatim,
 *  including all filters and the page.
 */
export async function getLiquidations(opts = {}, indexerUrl) {
    return queryLiquidations(opts, indexerUrl);
}
/**
 *  A perp pool's funding-rate history, newest first. The append-only counterpart to the
 *  overwrite-only `PerpMarket.fundingRate`.
 *
 *  Takes a `{ from, to }` WINDOW as well as a page, because a chart needs a time range
 *  rather than an offset: settlement is hourly, so 24 rows per pool per day — and 288 a day
 *  across the retired 300s cadence, which indexed history still spans. Paging blindly to
 *  reach a date is both slow and fragile.
 *
 *  Every row carries its own `fundingWindowSec`, so normalize per row rather than once
 *  for the series — see {@link normalizeFundingRate}. Rows are lagged samples at
 *  settlement times, and each covers the span `[spanStart, spanEnd)`, which reaches
 *  backwards from the emit; for anything longer than about a week prefer
 *  {@link SomniaMarketsClient.listFundingRateCandles | client.listFundingRateCandles}, which does that attribution for you.
 *
 *  **`order` decides which END of the window a page comes from, and it is not cosmetic.**
 *  The default `"desc"` returns the NEWEST `limit` rows, which is what a "latest funding"
 *  read wants. But it makes `from` a window bound rather than a cursor: paging forward
 *  with `from = last.timestamp + 1` under `"desc"` keeps re-reading the tail and never
 *  advances, because narrowing the window does not change which end you get. Pass
 *  `"asc"` to walk FORWARD from `from` — that is the mode a cursor needs.
 *
 *  Rows that share a timestamp are ordered by `blockNumber`, then by `id`, in the same
 *  direction. So two reads of an unchanged table return the same sequence.
 *
 * **Details**
 *
 * - `pool`: perp pool address
 * - `opts`: `from`/`to` are unix SECONDS, inclusive/exclusive respectively
 */
export async function listFundingRateHistory(pool, opts = {}, indexerUrl) {
    const timestamp = {};
    if (opts.from != null)
        timestamp._gte = opts.from.toString();
    if (opts.to != null)
        timestamp._lt = opts.to.toString();
    const where = { pool: { _eq: pool.toLowerCase() } };
    if (Object.keys(timestamp).length > 0)
        where.timestamp = timestamp;
    const direction = opts.order ?? "desc";
    const data = await IndexerRead.gqlRequest(FundingRateHistoryQuery, {
        where,
        // A total order, as in LiquidationsQuery: rows that share a timestamp come back
        // in the same order on every request. The tie-break also lets Postgres choose the
        // `(pool, timestamp)` index. With `timestamp` alone it can walk the standalone
        // `timestamp` index and discard every other pool's rows, which reads most of the
        // table for a pool that stopped settling.
        orderBy: [{ timestamp: direction }, { blockNumber: direction }, { id: direction }],
        limit: opts.limit ?? 100,
        offset: opts.offset ?? 0,
    }, indexerUrl);
    return data.FundingRateUpdate;
}
/**
 *  A perp pool's funding-rate ROLLUPS at one resolution, newest first.
 *
 *  Use this for any range the raw series is too dense for — 30 days at the testnet
 *  cadence is ~8,600 raw rows per pool. Resolutions are 3600 / 14400 / 86400 only;
 *  anything at or below the settlement cadence would multiply rows without adding
 *  information.
 *
 *  Two things a consumer must honour, both of which are properties of lazy settlement
 *  rather than of this API:
 *
 *  - **Buckets can be ABSENT.** A window touched by no settlement's span produces no row,
 *    because nothing triggered a write. Zero-fill missing grid slots as
 *    `{ avgFundingRate8h: 0, coverage: 0 }` — and never carry the previous rate forward,
 *    which would fabricate funding across an outage.
 *  - **Past buckets get REVISED.** A catch-up settlement reaches backwards and updates
 *    buckets that already existed. Any chart already has to tolerate this for the
 *    in-progress bucket.
 *
 *  **Paging is newest-first, and a full page means there is probably more.** The default
 *  `limit` is 500 while 30 days of hourly buckets is 720, so a month-long window silently
 *  returns its newest 500. Treat `rows.length === limit` as "truncated" and page with
 *  `offset`, or narrow the window. {@link densifyFundingBuckets} will not zero-fill older
 *  than the oldest row it is given, precisely so a truncated page cannot be rendered as a
 *  funding pause.
 *
 * **Details**
 *
 * - `pool`: perp pool address
 * - `intervalSeconds`: 3600 | 14400 | 86400
 * - `opts`: `from`/`to` are unix SECONDS, matched against `bucketStart`
 */
export async function listFundingRateCandles(pool, intervalSeconds, opts = {}, indexerUrl) {
    const bucketStart = {};
    if (opts.from != null)
        bucketStart._gte = opts.from.toString();
    if (opts.to != null)
        bucketStart._lt = opts.to.toString();
    const where = {
        pool: { _eq: pool.toLowerCase() },
        intervalSeconds: { _eq: intervalSeconds },
    };
    if (Object.keys(bucketStart).length > 0)
        where.bucketStart = bucketStart;
    const data = await IndexerRead.gqlRequest(FundingRateCandlesQuery, { where, limit: opts.limit ?? 500, offset: opts.offset ?? 0 }, indexerUrl);
    return data.FundingRateCandle;
}
/**
 * Lists funding-rate history through the compatibility alias.
 *
 *  @deprecated Renamed to {@link SomniaMarketsClient.listFundingRateHistory | client.listFundingRateHistory}, per the `get*` = value-or-null
 *  and `list*` = array convention in CONVENTIONS.md. This alias keeps one release cycle
 *  of compatibility; it forwards verbatim and accepts the new `from`/`to` window too.
 */
export async function getFundingRateHistory(pool, opts = {}, indexerUrl) {
    return listFundingRateHistory(pool, opts, indexerUrl);
}
/**
 *  Realized perp fees / rebates / builder credits, newest first — filter by `account`,
 *  `pool`, `builder` or `kind`, paginate.
 *
 *  The perps fee rail off `MarginBank`, distinct from the binary/spot `listBuilderFees` and
 *  `listProtocolFees` surfaces.
 *
 *  `insurancePortion` is a component OF `amount` rather than an addition to it, so a fee
 *  total is `SUM(amount)` and an insurance-fund inflow is `SUM(insurancePortion)` — adding
 *  the two double-counts. Directions are on `isRebate`: `amount` is unsigned, and a rebate
 *  is a credit.
 *
 * **Details**
 *
 * - `opts`: `kind` is `"Fee"` | `"Rebate"` | `"BuilderFee"`
 */
export async function listPerpFees(opts = {}, indexerUrl) {
    const where = {};
    if (opts.account != null)
        where.account = { _eq: opts.account.toLowerCase() };
    if (opts.pool != null)
        where.pool = { _eq: opts.pool.toLowerCase() };
    if (opts.builder != null)
        where.builder = { _eq: opts.builder.toLowerCase() };
    if (opts.kind != null)
        where.kind = { _eq: opts.kind };
    const data = await IndexerRead.gqlRequest(PerpFeesQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.PerpFeeRecord;
}
/** A perp pool's open-interest history, newest first — paginated. */
export async function getOpenInterestHistory(pool, opts = {}, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OpenInterestHistoryQuery, { pool: pool.toLowerCase(), limit: opts.limit ?? 100, offset: opts.offset ?? 0 }, indexerUrl);
    return data.OpenInterestSnapshot;
}
// prettier-ignore
const FundingPaymentsQuery = graphql(`
  query FundingPayments($where: FundingPayment_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         FundingPayment(where: $where, order_by: [{timestamp: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id account pool amount timestamp txHash
         }
       }
`);
// prettier-ignore
const MarginEventsQuery = graphql(`
  query MarginEvents($where: MarginEvent_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarginEvent(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
           id account kind pool amount granter timestamp txHash
         }
       }
`);
// prettier-ignore
// ORDERED BY A TOTAL KEY, not by `timestamp` alone. Every row a block produces
// carries that block's timestamp, so a timestamp-only sort leaves ties in an
// order the server may choose differently per request - and an `offset` page
// boundary landing inside one block then skips or repeats a row, silently in the
// skip case. `id` is the primary key, so appending it makes the order total and
// the paging contract honest; `blockNumber` sits between so rows still group by
// block when two blocks share a timestamp.
const LiquidationsQuery = graphql(`
  query Liquidations($where: LiquidationEvent_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         LiquidationEvent(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id account pool kind size price counterparty penalty
           badDebt insuranceCovered deficit coverageDeclined collateralAmount equity
           positionsProcessed stageReached marginStatusBefore marginStatusAfter
           timestamp blockNumber txHash
         }
       }
`);
// prettier-ignore
const FundingRateHistoryQuery = graphql(`
  query FundingRateHistory($where: FundingRateUpdate_bool_exp!, $orderBy: [FundingRateUpdate_order_by!], $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         FundingRateUpdate(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
           id pool fundingRate cumulativeFundingPerUnit indexPrice markPrice
           intervalsSettled intervalsAccrued fundingWindowSec fundingIntervalSec
           spanStart spanEnd anchorResynced timestamp blockNumber txHash
         }
       }
`);
// prettier-ignore
const FundingRateCandlesQuery = graphql(`
  query FundingRateCandles($where: FundingRateCandle_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         FundingRateCandle(where: $where, order_by: {bucketStart: desc}, limit: $limit, offset: $offset) {
           id pool intervalSeconds bucketStart
           avgFundingRate8h minFundingRate8h maxFundingRate8h coverage
           cumulativeFundingStart cumulativeFundingEnd
           fundingWindowSec fundingIntervalSec paramsChangedInBucket
           indexPriceEnd openInterestEnd updateCount
         }
       }
`);
// prettier-ignore
const PerpFeesQuery = graphql(`
  query PerpFees($where: PerpFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
           id account pool amount isRebate kind insurancePortion tier fillNotional builder timestamp txHash
         }
       }
`);
// prettier-ignore
const OpenInterestHistoryQuery = graphql(`
  query OpenInterestHistory($pool: String!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OpenInterestSnapshot(where: {pool: {_eq: $pool}}, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
           id pool openInterest timestamp blockNumber
         }
       }
`);
// ------------------------------------------------------------- batch order rejections
//
// `placeOrders` / `placeOrdersFor` ONLY. The singular entry points revert instead, and a
// revert discards its own logs, so there is no rejection history for them — and no Order
// row to hang this on either way, because nothing rested or filled.
/**
 *  The contract's `OrderRejectionReason` enum, by index — the reason a batch-placed order
 *  was refused.
 *
 *  Index 0 is `None`, which is NOT a rejection: it means the order rested or filled. It
 *  cannot appear on a {@link PerpOrderRejection} row, and is kept in the table only so
 *  every other member keeps its on-chain index.
 *
 * @category perpetual markets
 */
export const PERP_ORDER_REJECTION_REASON = [
    "None",
    "AlreadyExpired",
    "SelfMatchCancelTaker",
    "PostOnlyWouldCross",
    "FillOrKillUnfillable",
    "ImmediateOrCancelNoFill",
];
// prettier-ignore
const PerpOrderRejectionsQuery = graphql(`
  query PerpOrderRejections($where: PerpOrderRejection_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpOrderRejection(where: $where, order_by: [{blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id owner pool reason requestIndex timestamp blockNumber txHash
         }
       }
`);
/**
 *  Orders refused inside batch placements, newest first.
 *
 *  Indexer tier. Filter by `owner`, by `pool`, or by the raw `reason` index — the filter
 *  takes the INDEX rather than the name, so a caller can select a reason this SDK version
 *  does not yet name.
 *
 *  Nothing here has an `Order` row: a rejected request never rested and never filled. Pair
 *  `requestIndex` with the batch the caller submitted to say which request was refused.
 *
 *  Ordered by `blockNumber` descending, with `id` as a tiebreaker, which makes `offset`
 *  pagination STABLE — no row repeats or disappears between pages. It is not intra-block
 *  chain order: this entity carries no `logIndex` column and its `id` is `txHash_logIndex`,
 *  so rows inside one block come back in a deterministic but arbitrary sequence. That
 *  costs nothing here, because every row in one batch shares a transaction and
 *  `requestIndex` already gives their true order — which is the one intra-batch ordering a
 *  caller needs. Ordering by `timestamp` would be worse, since separate blocks can share
 *  one.
 *
 * @example Why a trader's batch orders are not appearing
 * ```ts
 * const refused = await client.listPerpOrderRejections({ owner: account });
 * for (const r of refused) {
 *   // `reason` is null for a member this SDK does not know; `reasonRaw` always has it.
 *   console.log(r.requestIndex, r.reason ?? `unknown(${r.reasonRaw})`);
 * }
 * ```
 */
export async function listPerpOrderRejections(opts = {}, indexerUrl) {
    const where = {};
    if (opts.owner != null)
        where.owner = { _eq: opts.owner.toLowerCase() };
    if (opts.pool != null)
        where.pool = { _eq: opts.pool.toLowerCase() };
    // Presence, not truthiness: index 0 is a real enum member. It cannot appear on a
    // rejection row, but filtering must not silently ignore a caller who asks for it.
    if (opts.reason != null)
        where.reason = { _eq: opts.reason };
    const data = await IndexerRead.gqlRequest(PerpOrderRejectionsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.PerpOrderRejection.map((r) => ({
        id: r.id,
        owner: r.owner,
        pool: r.pool,
        reason: PERP_ORDER_REJECTION_REASON[r.reason] ?? null,
        reasonRaw: r.reason,
        requestIndex: r.requestIndex,
        timestamp: r.timestamp,
        blockNumber: r.blockNumber,
        txHash: r.txHash,
    }));
}
// prettier-ignore
const PerpPositionChangesQuery = graphql(`
  query PerpPositionChanges($where: PerpPositionChange_bool_exp!, $orderBy: [PerpPositionChange_order_by!], $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpPositionChange(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
           id pool account kind sizeBefore sizeAfter closedSize entryPriceBefore entryPriceAfter exitPrice orderId realizedPnl timestamp blockNumber logIndex txHash
         }
       }
`);
/**
 *  The per-update history of perp positions, newest first — filter by `account`, `pool`,
 *  `txHash` and/or `kinds`, window by `from`/`to`, paginate.
 *
 *  Indexer tier. Each row is one update with its own realized PnL, so a closed trade's
 *  result can be read without replaying fills. See {@link PerpPositionChange}.
 *
 *  **The sort is chain order** — `blockNumber`, then `logIndex` — which is a total
 *  order, so the sequence is stable between requests. The table is live and append-only,
 *  so offset paging is approximate. To follow it forward, pass `order: "asc"` with `from`
 *  at the last row's timestamp and skip the ids already seen.
 */
export async function listPerpPositionChanges(opts = {}, indexerUrl) {
    const where = {};
    if (opts.account != null)
        where.account = { _eq: opts.account.toLowerCase() };
    if (opts.pool != null)
        where.pool = { _eq: opts.pool.toLowerCase() };
    if (opts.txHash != null)
        where.txHash = { _eq: opts.txHash.toLowerCase() };
    if (opts.kinds != null)
        where.kind = { _in: [...opts.kinds] };
    const timestamp = {};
    if (opts.from != null)
        timestamp._gte = changeUnixSeconds(opts.from, "from").toString();
    if (opts.to != null)
        timestamp._lt = changeUnixSeconds(opts.to, "to").toString();
    if (Object.keys(timestamp).length > 0)
        where.timestamp = timestamp;
    // Validated BEFORE the request (SDK-IO-005): `NaN` and `Infinity` pass `??`, and
    // `JSON.stringify` turns both into `null`, which Hasura reads as "no limit".
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
        throw new InvalidInputError("Perp position change page limit must be an integer from 1 to 1000");
    }
    if (!Number.isInteger(offset) || offset < 0 || offset > 2_147_483_647) {
        throw new InvalidInputError("Perp position change page offset must be an integer from 0 to 2147483647");
    }
    const order = opts.order ?? "desc";
    const data = await IndexerRead.gqlRequest(PerpPositionChangesQuery, { where, orderBy: [{ blockNumber: order }, { logIndex: order }], limit, offset }, indexerUrl);
    return data.PerpPositionChange.map((row) => toPerpPositionChange(row, indexerUrl.chainId));
}
/** One indexed position update as this SDK's type. */
function toPerpPositionChange(row, chainId) {
    return {
        id: row.id,
        // The indexer row has no chain column; the owner's context names the chain.
        chainId,
        pool: row.pool,
        account: row.account,
        kind: row.kind,
        sizeBefore: BigInt(row.sizeBefore),
        sizeAfter: BigInt(row.sizeAfter),
        closedSize: BigInt(row.closedSize),
        entryPriceBefore: row.entryPriceBefore == null ? null : BigInt(row.entryPriceBefore),
        entryPriceAfter: BigInt(row.entryPriceAfter),
        exitPrice: row.exitPrice == null ? null : BigInt(row.exitPrice),
        orderId: row.orderId == null ? null : BigInt(row.orderId),
        realizedPnl: BigInt(row.realizedPnl),
        timestamp: BigInt(row.timestamp),
        blockNumber: BigInt(row.blockNumber),
        logIndex: row.logIndex,
        txHash: row.txHash,
    };
}
/** Most fills one call takes: one full page of {@link getUserFillsPage}. */
const FILLS_PER_CHANGE_READ = 1_000;
/** Distinct transactions per request, so one `_in` list stays a modest request body. */
const CHANGE_READ_TX_CHUNK = 100;
/** Rows per request. A constant rather than a size scaled to the input; a full page reads on. */
const CHANGE_READ_PAGE = 1_000;
const isDecimalId = (value) => typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value);
/** Hasura's answer from an indexer that predates the `PerpPositionChange` table. */
const NO_POSITION_CHANGE_TABLE = /field ['"]PerpPositionChange['"] not found in type: ['"]query_root['"]/i;
/**
 *  The account's order in a fill, keyed by transaction, pool and order. Null when the
 *  account is not a party, or the row lacks the log position a match needs. A value that
 *  is not a fill row, as an untyped caller can pass, is not the account's fill either.
 *
 *  The indexer stamps an update with the maker's order when the account is the maker and
 *  the taker's otherwise, so the maker is checked first here too. A fill cannot match an
 *  account against itself: self-matching only cancels.
 */
function fillOrderOf(fill, account) {
    if (typeof fill !== "object" || fill === null)
        return null;
    if (typeof fill.logIndex !== "number" || !Number.isInteger(fill.logIndex))
        return null;
    let orderId = null;
    if (typeof fill.maker === "string" && fill.maker.toLowerCase() === account) {
        orderId = fill.makerOrderId;
    }
    else if (typeof fill.taker === "string" && fill.taker.toLowerCase() === account) {
        orderId = fill.takerOrderId;
    }
    if (!isDecimalId(orderId) || typeof fill.txHash !== "string" || typeof fill.pool !== "string")
        return null;
    return { key: changeKey(fill.txHash, fill.pool, BigInt(orderId)), logIndex: fill.logIndex };
}
/** The pairing key of a fill and its update. The indexer lowercases a change's hash; a fill's may not be. */
function changeKey(txHash, pool, orderId) {
    return `${txHash.toLowerCase()} ${pool.toLowerCase()} ${orderId}`;
}
/**
 *  The position update each of an account's fills made — what lets a trade history say
 *  "Open Long" or "Close Short" rather than only buy or sell. See
 *  {@link SomniaMarketsClient.listPerpPositionChangesForFills | client.listPerpPositionChangesForFills}.
 */
export async function listPerpPositionChangesForFills(account, fills, indexerUrl) {
    if (typeof account !== "string" || account.length === 0) {
        throw new InvalidInputError("Perp position changes for fills need an account address");
    }
    if (!Array.isArray(fills) || fills.length > FILLS_PER_CHANGE_READ) {
        throw new InvalidInputError(`Perp position changes for fills take an array of at most ${FILLS_PER_CHANGE_READ} fills`);
    }
    const acct = account.toLowerCase();
    const orders = fills.map((fill) => fillOrderOf(fill, acct));
    const txHashes = [...new Set(fills.flatMap((fill, i) => (orders[i] === null ? [] : [fill.txHash.toLowerCase()])))];
    if (txHashes.length === 0)
        return fills.map(() => null);
    const chunks = [];
    for (let i = 0; i < txHashes.length; i += CHANGE_READ_TX_CHUNK) {
        chunks.push(txHashes.slice(i, i + CHANGE_READ_TX_CHUNK));
    }
    const pages = await Promise.all(chunks.map(async (chunk) => {
        const rows = [];
        for (let offset = 0;; offset += CHANGE_READ_PAGE) {
            let data;
            try {
                data = await IndexerRead.gqlRequest(PerpPositionChangesQuery, {
                    where: { account: { _eq: acct }, txHash: { _in: chunk } },
                    orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
                    limit: CHANGE_READ_PAGE,
                    offset,
                }, indexerUrl);
            }
            catch (cause) {
                // Not a failed read: this indexer has no position changes to give until it is reindexed.
                if (cause instanceof IndexerError && NO_POSITION_CHANGE_TABLE.test(cause.message)) {
                    throw new PerpPositionChangesUnavailableError("listPerpPositionChangesForFills", { cause });
                }
                throw cause;
            }
            for (const row of data.PerpPositionChange)
                rows.push(toPerpPositionChange(row, indexerUrl.chainId));
            if (data.PerpPositionChange.length < CHANGE_READ_PAGE)
                return rows;
        }
    }));
    // Updates per order, in log order. Rows with no order (takeover, ADL, wind-down) have no fill.
    const changesByOrder = new Map();
    for (const change of pages.flat()) {
        if (change.orderId === null)
            continue;
        const key = changeKey(change.txHash, change.pool, change.orderId);
        const list = changesByOrder.get(key) ?? [];
        list.push(change);
        changesByOrder.set(key, list);
    }
    for (const list of changesByOrder.values())
        list.sort((a, b) => a.logIndex - b.logIndex);
    // The account's fills per order, in log order: each match lies after the order's
    // previous fill in this call, so within one call an update missing from the indexer
    // cannot be claimed by a second fill. The bound comes from the fills passed in, not
    // from every fill of the transaction.
    const fillLogsByOrder = new Map();
    for (const order of orders) {
        if (order === null)
            continue;
        const list = fillLogsByOrder.get(order.key) ?? [];
        list.push(order.logIndex);
        fillLogsByOrder.set(order.key, list);
    }
    for (const list of fillLogsByOrder.values())
        list.sort((a, b) => a - b);
    // MarginBank emits each party's update just before the fill it belongs to, so a fill's
    // update is the closest earlier one for the same transaction, pool and order.
    return orders.map((order) => {
        if (order === null)
            return null;
        const candidates = changesByOrder.get(order.key) ?? [];
        const fillLogs = fillLogsByOrder.get(order.key) ?? [];
        let previousFillLog = -1;
        for (const log of fillLogs) {
            if (log < order.logIndex)
                previousFillLog = log;
        }
        let match = null;
        for (const change of candidates) {
            if (change.logIndex > previousFillLog && change.logIndex < order.logIndex)
                match = change;
        }
        return match;
    });
}
/** A time bound as whole, non-negative unix seconds, checked before it reaches Hasura. */
function changeUnixSeconds(value, name) {
    const ok = typeof value === "bigint" ? value >= 0n : Number.isSafeInteger(value) && value >= 0;
    if (!ok)
        throw new InvalidInputError(`Perp position change ${name} must be whole, non-negative unix seconds`);
    return value;
}
