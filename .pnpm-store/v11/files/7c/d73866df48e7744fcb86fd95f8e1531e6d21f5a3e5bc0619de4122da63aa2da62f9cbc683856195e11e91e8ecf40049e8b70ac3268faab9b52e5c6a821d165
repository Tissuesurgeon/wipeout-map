// Fills — the executed-trade tape, shared across every market kind.
//
// One `Fill` entity serves spot, perp and binary (the OrderBook core emits one
// `OrderFilled` for all of them), so this is a SHARED concept rather than a
// per-kind one: `pool` scopes a query to a VENUE CONTRACT and the rows carry
// whatever kind that pool hosts, while `market_id` scopes it to one market.
// The two differ only on binary, where a pool is recycled across successive
// markets — there, pool locates the contract and market id identifies one
// market life on it. On spot/perp the market id IS the pool address.
//
// Read-only by nature — a fill is something the chain did, never something a
// caller asks for. Errors propagate (see CONVENTIONS.md): an empty array means
// "no fills", never "the read failed".
import * as IndexerRead from "./indexerRead.js";
import * as FillHistory from "./fillHistory.js";
import * as FillPagination from "./fillPagination.js";
import * as GraphqlBoundary from "./graphqlBoundary.js";
import { FillHistoryRestartRequiredError, FillHistoryUnavailableError, IndexerError, InvalidInputError, NotConfiguredError, } from "./errors.js";
import { graphql } from "./gql/gql.js";
import { toMarket } from "./markets.js";
const FILLS_RANGE_PAGE_OPERATION = "FillsRangePage";
// prettier-ignore
const FillQueryFields = graphql(`
  fragment FillQueryFields on Fill {
    blockNumber
    logIndex
    id
    market: market_id
    pool
    fillPrice
    quantity
    quoteQuantity
    maker
    makerSide
    taker
    takerSide
    kind
    takerIsBid
    makerOrderId
    takerOrderId
    takerRemainingQuantity
    makerRemainingQuantity
    timestamp
    txHash
    # The taker's ORDER, not just the denormalized copy on the fill. On binary
    # the fill's takerSide is backfilled by the PendingTakerFill bridge only
    # once BinaryOrderPlaced lands, so it can still be null on a row whose
    # taker is already stamped. The Order carries the authoritative side from
    # the moment it exists, which is what the portfolio reads have always used.
    takerOrder { owner side }
  }
`);
/**
 *  Recent fills for a pool (either market type), newest first — a one-shot
 *  indexer query. For a continuously-updating trade tape on a binary pool, use
 *  the live-store reader `getLiveFills` (or the `useLiveFills` hook) instead.
 *
 * **Details**
 *
 * - `pool`: Pool address (case-insensitive).
 * - `opts`: Paging, `since`/`until` window and `market` scope ({@link GetFillsOptions}).
 *
 * @throws {@link InvalidInputError} The pool, a market id or a block bound is unusable.
 */
export async function getFills(pool, opts = {}, indexerUrl) {
    const where = applyFillScope({}, { ...opts, pool });
    const data = await IndexerRead.gqlRequest(FillsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.Fill;
}
/**
 *  Fills a user participated in (as maker OR taker), newest first — the one-shot
 *  indexer counterpart to the live-store `getLiveUserFills`. Optionally scoped to
 *  one market and/or pool and/or a `since`/`until` window.
 *
 *  Scope by `market` (or `markets` for several) to get those markets' fills: on
 *  binary a pool is recycled across successive markets, so `pool` alone also
 *  returns the fills of that pool's earlier lives. Every predicate runs at the
 *  indexer, so the `limit` applies to the rows you asked for rather than to a
 *  mixed set.
 */
export async function getUserFills(account, opts = {}, indexerUrl) {
    const acct = fillScopeId(account, "account");
    const where = applyFillScope({ _or: participatedAs(acct) }, opts);
    const data = await IndexerRead.gqlRequest(UserFillsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.Fill;
}
/**
 * Owner-bound historical continuation; a short nonempty page probes for older rows.
 * `config.operation` is the public method a failure names, for a read built on this one.
 */
export const getUserFillsPage = async (account, options = {}, config) => {
    const operation = config.operation ?? "getUserFillsPage";
    const sourceUrl = typeof config.source === "string" ? config.source : config.source.url;
    if (!sourceUrl) {
        throw new NotConfiguredError("config.indexerUrl", "this indexer read (getUserFillsPage)");
    }
    const page = FillPagination.prepare({
        account,
        options,
        ...config,
        source: sourceUrl,
    });
    const where = applyFillScope({ _or: participatedAs(page.account) }, page.scope);
    const continuation = options.cursor === undefined ? undefined : FillPagination.decode(options.cursor, page.binding);
    if (continuation)
        where._and = [FillPagination.before(continuation.position)];
    let data;
    try {
        data = await IndexerRead.gqlRequest(UserFillsPageQuery, { where, limit: page.limit + 1 }, config.source, config.headers, { signal: config.signal });
    }
    catch (cause) {
        if (cause instanceof IndexerError &&
            /field ['"]FillDataset_by_pk['"] not found in type: ['"]query_root['"]/i.test(cause.message)) {
            throw new FillHistoryUnavailableError(operation, { cause });
        }
        throw cause;
    }
    if (!data || !Array.isArray(data.Fill))
        throw new IndexerError("UserFillsPage", "Missing fill page");
    const generation = data.FillDataset_by_pk?.generation;
    if (typeof generation !== "string" || !generation.length)
        throw new FillHistoryUnavailableError(operation);
    if (continuation && continuation.generation !== generation)
        throw new FillHistoryRestartRequiredError(continuation.generation ?? "legacy", generation);
    for (const row of data.Fill)
        FillPagination.validatePosition(row, "UserFillsPage");
    const returned = data.Fill;
    const rows = returned.slice(0, page.limit);
    const last = rows.at(-1);
    let nextCursor = null;
    if (last) {
        if (returned.length > page.limit)
            nextCursor = FillPagination.encode(last, page.binding, "UserFillsPage", generation);
        else {
            // A silent role cap can shorten this page before the lookahead row; one
            // strictly older row proves continuation under any positive row cap.
            const existingConjuncts = Array.isArray(where._and) ? where._and : [];
            const probeWhere = { ...where, _and: [...existingConjuncts, FillPagination.before(last)] };
            const probe = await IndexerRead.gqlRequest(UserFillsPageQuery, { where: probeWhere, limit: 1 }, config.source, config.headers, { signal: config.signal });
            if (!probe || !Array.isArray(probe.Fill))
                throw new IndexerError("UserFillsPage", "Missing fill probe");
            const probeGeneration = probe.FillDataset_by_pk?.generation;
            if (typeof probeGeneration !== "string" || !probeGeneration.length)
                throw new FillHistoryUnavailableError(operation);
            if (probeGeneration !== generation)
                throw new FillHistoryRestartRequiredError(generation, probeGeneration);
            for (const row of probe.Fill)
                FillPagination.validatePosition(row, "UserFillsPage");
            if (probe.Fill.length > 0)
                nextCursor = FillPagination.encode(last, page.binding, "UserFillsPage", generation);
        }
    }
    return {
        datasetGeneration: generation,
        fills: rows,
        nextCursor,
    };
};
/** Rows per history page: one under the indexer's 1,000-row response cap, so the sentinel row still fits. */
const HISTORY_PAGE_LIMIT = 999;
const HISTORY_DEFAULT_MAX_ROWS = 20_000;
const HISTORY_MAX_ROWS = 100_000;
const HISTORY_DEFAULT_OVERLAP_SECONDS = 60;
const HISTORY_MAX_OVERLAP_SECONDS = 3_600;
/**
 *  An account's fill history brought up to date from the history the caller
 *  holds. The contract is on {@link SomniaMarketsClient.getUserFillHistory}.
 *
 *  A refresh reads the overlap again, newest first, checks it against the held
 *  rows, and puts the new fills on top of them. A first read, an unusable
 *  `previous`, an overlap that does not match and a dataset change read the
 *  whole history instead. The call makes at most two attempts: the first read
 *  or refresh, then one full read when the first cannot stand. A dataset change
 *  during that full read propagates. Every other failure propagates as
 *  `getUserFillsPage` raised it, and nothing partial is returned.
 */
export const getUserFillHistory = async (account, options = {}, config) => {
    const sourceUrl = typeof config.source === "string" ? config.source : config.source.url;
    if (!sourceUrl) {
        throw new NotConfiguredError("config.indexerUrl", "this indexer read (getUserFillHistory)");
    }
    const settings = historySettings(account, options, config.chainId);
    const linked = GraphqlBoundary.linkSignals(config.signal, options.signal);
    try {
        const read = await readHistory(settings, options.previous ?? null, { ...config, signal: linked.signal });
        linked.signal?.throwIfAborted();
        return read;
    }
    finally {
        linked.dispose();
    }
};
/** Validate one call's inputs before any request. */
function historySettings(account, options, chainId) {
    if (typeof account !== "string" || !account.length)
        throw new InvalidInputError("Fill account is required");
    if (typeof options !== "object" || options === null) {
        throw new InvalidInputError("Fill history options must be an object");
    }
    const maxRows = options.maxRows ?? HISTORY_DEFAULT_MAX_ROWS;
    if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > HISTORY_MAX_ROWS) {
        throw new InvalidInputError(`maxRows must be an integer from 1 to ${HISTORY_MAX_ROWS}`);
    }
    const overlapSeconds = options.overlapSeconds ?? HISTORY_DEFAULT_OVERLAP_SECONDS;
    if (!Number.isInteger(overlapSeconds) || overlapSeconds < 0 || overlapSeconds > HISTORY_MAX_OVERLAP_SECONDS) {
        throw new InvalidInputError(`overlapSeconds must be an integer from 0 to ${HISTORY_MAX_OVERLAP_SECONDS}`);
    }
    const marketType = options.marketType === undefined ? null : FillPagination.marketKind(options.marketType);
    return { scope: { chainId, account: account.toLowerCase(), marketType }, maxRows, overlapSeconds };
}
async function readHistory(settings, previous, config) {
    const held = previous !== null && FillHistory.isUsable(previous, settings.scope) ? previous : null;
    const newest = held?.fills[0];
    let reason = previous !== null && held === null ? "previous" : null;
    // Null means the first attempt cannot stand. The one full read after it is
    // outside the `try`, so a dataset change during that read propagates.
    let built = null;
    try {
        const first = held !== null && newest !== undefined
            ? await refreshHistory(settings, held, newest, config)
            : await fullHistory(settings, config);
        if (typeof first === "string")
            reason = first;
        else
            built = first;
    }
    catch (error) {
        if (!(error instanceof FillHistoryRestartRequiredError))
            throw error;
        reason ??= "dataset";
    }
    built ??= await fullHistory(settings, config);
    if (held === null)
        return readOf(historyOf(settings, built, built.fills), true, reason);
    if (built.generation !== held.datasetGeneration)
        reason ??= "dataset";
    const fills = FillHistory.sameRows(built.fills, held.fills) ? held.fills : built.fills;
    if (fills === held.fills && built.generation === held.datasetGeneration && built.truncated === held.truncated) {
        return readOf(held, false, reason);
    }
    return readOf(historyOf(settings, built, fills), true, reason);
}
function readOf(history, changed, reason) {
    return { history, changed, restarted: reason !== null, restartReason: reason };
}
function historyOf(settings, built, fills) {
    return {
        version: FillHistory.VERSION,
        chainId: settings.scope.chainId,
        account: settings.scope.account,
        marketType: settings.scope.marketType,
        datasetGeneration: built.generation,
        fills,
        truncated: built.truncated,
    };
}
/** Read the whole history, newest first, up to `maxRows`. */
async function fullHistory(settings, config) {
    const walked = await walkHistory(settings, undefined, config);
    return { generation: walked.generation, fills: walked.rows, truncated: walked.more };
}
/**
 *  Read the overlap again, check it against the held rows, and put the new fills
 *  on top of them. A restart reason when the result cannot be trusted, and the
 *  caller reads the whole history instead.
 *
 *  The overlap starts `overlapSeconds` before the newest held fill, so the newest
 *  held second is always read again: a new fill can share it. A row strictly
 *  newer than the newest held fill is new. Every other row the walk reads must be
 *  the held overlap, row for row and field for field, because a fill never
 *  changes once served and fills appear in block order. A changed row, or a row
 *  the history does not hold, means a reorg rolled rows back, and a reorg can
 *  reach below the overlap, so nothing held is trusted.
 *
 *  One difference is not a reorg to act on: the newest held fills are not
 *  served, nothing newer is, and every other held fill in the overlap still
 *  matches. An indexer that is behind serves exactly that, for example after a
 *  cutover to a slot that is behind. Those fills are dropped, so the result is
 *  what the indexer serves, and they come back as new fills when it catches up.
 *  A full read would differ only below the overlap, and this check cannot see a
 *  reorg that deep anyway. Newer fills while the newest held ones are gone are
 *  a reorg: an indexer that is behind serves nothing newer than its head, so
 *  the newest held block was replaced, and the replacement can reach below the
 *  overlap.
 *
 *  A walk that stops at `maxRows` checks the part of the overlap it read; the
 *  older held rows leave the history anyway.
 */
async function refreshHistory(settings, held, newest, config) {
    const floor = Math.max(0, Number(newest.timestamp) - settings.overlapSeconds);
    const overlap = FillHistory.windowEnd(held.fills, floor);
    const walked = await walkHistory(settings, floor, config);
    if (walked.generation !== held.datasetGeneration)
        return "dataset";
    const firstHeld = walked.rows.findIndex((row) => FillHistory.comparePosition(row, newest) <= 0);
    const fresh = firstHeld === -1 ? walked.rows : walked.rows.slice(0, firstHeld);
    const seen = firstHeld === -1 ? [] : walked.rows.slice(firstHeld);
    const check = FillHistory.checkOverlap(seen, held, overlap, walked.more);
    // A cut inside the overlap belongs to the held history, as after a larger
    // `maxRows`, not to the indexer.
    if (check.kind === "cut")
        return "previous";
    if (check.kind === "mismatch")
        return "overlap";
    if (check.missing > 0 && fresh.length > 0)
        return "overlap";
    const kept = held.fills.slice(check.missing);
    if (walked.more) {
        return { generation: walked.generation, fills: [...fresh, ...kept.slice(0, seen.length)], truncated: true };
    }
    const joined = [...fresh, ...kept];
    const truncated = held.truncated || joined.length > settings.maxRows;
    // A truncated history needs a fill to continue from. With none left, read the
    // older fills it lacks.
    if (truncated && joined.length === 0)
        return "overlap";
    return {
        generation: walked.generation,
        fills: joined.length > settings.maxRows ? joined.slice(0, settings.maxRows) : joined,
        truncated,
    };
}
/**
 *  Page back from the newest fill until the rows run out or `maxRows` is held.
 *
 *  The page limit stays constant whatever `maxRows` is, and the last page is
 *  trimmed in memory. `since` bounds every page, including the continuation
 *  probe, so a refresh never reads below its window.
 */
async function walkHistory(settings, since, config) {
    const rows = [];
    let generation;
    let cursor;
    for (;;) {
        config.signal?.throwIfAborted();
        const page = await getUserFillsPage(settings.scope.account, { limit: HISTORY_PAGE_LIMIT, since, marketType: settings.scope.marketType ?? undefined, cursor }, { ...config, operation: "getUserFillHistory" });
        generation ??= page.datasetGeneration;
        const room = settings.maxRows - rows.length;
        for (const row of page.fills.slice(0, room))
            rows.push(historyRow(row, rows.at(-1), since));
        if (page.fills.length > room)
            return { generation, rows, more: true };
        if (page.nextCursor === null)
            return { generation, rows, more: false };
        if (rows.length === settings.maxRows)
            return { generation, rows, more: true };
        cursor = page.nextCursor;
    }
}
/**
 *  Accept one page row into a walk. It needs a usable position, it must be
 *  strictly older than the row before it, and it must be inside the window.
 *  The order check also stops a walk whose cursor does not advance.
 */
function historyRow(row, newer, since) {
    if (!FillHistory.isPositioned(row))
        throw new IndexerError("UserFillsPage", "Fill row has no usable position");
    if (newer !== undefined && FillHistory.comparePosition(row, newer) >= 0) {
        throw new IndexerError("UserFillsPage", "Fill rows are not in strictly descending order");
    }
    if (since !== undefined && Number(row.timestamp) < since) {
        throw new IndexerError("UserFillsPage", "Fill row is older than the requested window");
    }
    return row;
}
/**
 *  Every fill of ONE MARKET KIND in an inclusive block range, across every pool
 *  of that kind, oldest first — the read behind a published trade feed.
 *
 *  Unlike {@link getFills} this takes no pool: a feed indexes the whole venue
 *  and must not have to enumerate its pools, which is also why the range rather
 *  than the pool is what bounds the read.
 *
 *  **Why blocks and not seconds.** Several Somnia blocks can share a timestamp,
 *  so the seam between two successive `since`/`until` windows either drops or
 *  repeats the fills in those blocks, and a volume feed built on it is silently
 *  wrong. `(blockNumber, logIndex)` is a total order over the table and both
 *  bounds are inclusive, so `[a, b]` then `[b + 1, c]` covers every fill once.
 *
 *  **Ordering.** `logIndex` on Somnia is block-global and each transaction's
 *  fills occupy a contiguous run of it, so ascending `(blockNumber, logIndex)`
 *  reproduces execution order without reading a transaction index.
 *
 *  **Paging.** The cursor names the last row returned, so a range longer than
 *  one page continues exactly rather than being truncated. It binds the chain,
 *  endpoint, kind and both bounds: a cursor from one range is rejected by
 *  another. Drain the range until `nextCursor` is null.
 *
 *  @param options - Kind, inclusive block range, page size and continuation.
 *  @param config - Owner-injected endpoint, chain and cancellation.
 *  @throws {@link InvalidInputError} A bound, the kind, the limit or the cursor is unusable.
 *  @throws {@link IndexerError} The read did not complete, or returned unusable block positions.
 */
export const getFillsPage = async (options, config) => {
    const sourceUrl = typeof config.source === "string" ? config.source : config.source.url;
    if (!sourceUrl) {
        throw new NotConfiguredError("config.indexerUrl", "this indexer read (getFillsPage)");
    }
    const page = FillPagination.prepareRange({
        options,
        ...config,
        source: sourceUrl,
    });
    const where = applyFillWindow({ marketType: { _eq: page.scope.marketType } }, page.scope);
    if (options.cursor !== undefined) {
        const { position } = FillPagination.decode(options.cursor, page.binding);
        where._and = [FillPagination.after(position)];
        // Raise the range's lower bound to the cursor's block as well. Postgres
        // cannot seek on the OR above, so without this every page rescans from
        // `sinceBlock` and discards the rows before the cursor: draining a range
        // becomes quadratic. The OR still trims the cursor's own block.
        where.blockNumber = { ...where.blockNumber, _gte: position.blockNumber };
    }
    const data = await IndexerRead.gqlRequest(FillsRangePageQuery, { where, limit: page.limit + 1 }, config.source, config.headers, { signal: config.signal });
    if (!data || !Array.isArray(data.Fill))
        throw new IndexerError(FILLS_RANGE_PAGE_OPERATION, "Missing fill page");
    for (const row of data.Fill)
        FillPagination.validatePosition(row, FILLS_RANGE_PAGE_OPERATION);
    return FillPagination.paginate(data.Fill, page.limit, page.binding, FILLS_RANGE_PAGE_OPERATION);
};
/**
 *  The newest block carrying an indexed fill of one market kind, with that
 *  block's timestamp — the head marker a feed polls before asking for a range.
 *
 *  Read from the FILL data rather than from the indexer's own processed-block
 *  watermark on purpose: the marker must never name a block that
 *  {@link getFillsPage} cannot yet serve, and the watermark can run ahead of the
 *  rows committed for it.
 *
 *  One ordered seek, because `(marketType, blockNumber, logIndex)` is indexed.
 *  {@link getLatestActiveBlock} answers the wider "any activity" question in two
 *  passes because it also spans orders, whose block columns are not indexed.
 *
 *  @param marketType - Market kind to report on.
 *  @param indexerUrl - Indexer GraphQL endpoint.
 *  @param headers - The owner's indexer headers, forwarded as {@link getFillsPage}
 *  forwards them, so a protected endpoint authorizes the marker and the range alike.
 *  @returns The block and its timestamp, or `null` when no fill of that kind is
 *  indexed yet — a fresh deployment or one still replaying, not a failure.
 *  @throws {@link InvalidInputError} The market kind is unusable.
 *  @throws {@link IndexerError} The read did not complete.
 */
export async function getLatestFillBlock(marketType, indexerUrl, headers) {
    const data = await IndexerRead.gqlRequest(LatestFillBlockQuery, { marketType: FillPagination.marketKind(marketType) }, indexerUrl, headers);
    if (!data || !Array.isArray(data.Fill))
        throw new IndexerError("LatestFillBlock", "Missing fill head");
    const row = data.Fill[0];
    if (!row)
        return null;
    // Checked before `BigInt`, which would otherwise throw a raw SyntaxError on a
    // malformed payload instead of the documented IndexerError.
    // Strings only: Hasura sends numerics as strings, and a JSON number past 2^53
    // would already have lost precision before it could be checked.
    if (!isDecimalString(row.blockNumber) || !isDecimalString(row.timestamp)) {
        throw new IndexerError("LatestFillBlock", "Invalid fill head scalars");
    }
    return { blockNumber: BigInt(row.blockNumber), timestamp: BigInt(row.timestamp) };
}
/**
 *  One fill by its id (`${blockNumber}_${logIndex}`) with both parties' order
 *  linkage and the market it executed on — the single lookup behind a fill
 *  detail view. Null when the id isn't indexed (yet — the indexer can lag a
 *  just-executed fill by a beat).
 */
export async function getFill(id, indexerUrl) {
    const data = await IndexerRead.gqlRequest(FillDetailQuery, { id }, indexerUrl);
    const f = data.Fill[0];
    if (!f)
        return null;
    const { marketRef, ...rest } = f;
    // `marketRef` is a nullable RELATIONSHIP whose owning `market_id` is `String!`
    // — never actually absent (same asserted invariant as getOrders' pool).
    return { ...rest, marketRef: IndexerRead.narrowIndexerInvariant([marketRef])[0] };
}
/**
 *  Every fill one order participated in — either side, newest first. Order ids
 *  are never reused (monotonic low-64 counter per pool), so `(pool, orderId)`
 *  names exactly one order forever. Rides the (pool, timestamp) composite index
 *  down to one pool before the order-id filter.
 *
 *  This is the bounded whole-history lookup for one known order and accepts only
 *  `limit`. To resume a pool or account tape from a block, use {@link getFills}
 *  or {@link getUserFills} with `sinceBlock`.
 */
export async function getOrderFills(pool, orderId, opts = {}, indexerUrl) {
    const oid = fillOrderId(orderId);
    const data = await IndexerRead.gqlRequest(OrderFillsQuery, { pool: fillScopeId(pool, "pool"), oid, limit: opts.limit ?? 200 }, indexerUrl);
    return data.Fill;
}
/**
 *  Server-side COUNT of the fills `account` participated in (maker OR taker),
 *  optionally scoped to one market and/or pool + a `since`/`until` window — a
 *  history-page total without fetching rows (Hasura `Fill_aggregate`, bounded fallback on
 *  the public role).
 *
 *  WITHOUT THAT HEADER THE TOTAL IS A LOWER BOUND. The fallback scan stops at
 *  {@link IndexerRead.COUNT_FALLBACK_CAP} rows and reports the cap, and `Fill`
 *  is the deepest counted table in production. No bounded variant of this helper
 *  exists yet; `countMarketsBounded` on the client is the pattern to copy.
 */
export async function countUserFills(account, opts = {}, indexerUrl, headers) {
    const acct = fillScopeId(account, "account");
    const where = applyFillScope({ _or: participatedAs(acct) }, opts);
    return IndexerRead.aggregateCount(FillCountDocuments, where, indexerUrl, headers);
}
/**
 *  The two seats an account can occupy on a fill, as indexed columns.
 *
 *  Both are `@index`ed on the `Fill` entity, so this is two index seeks OR-ed
 *  together (SDK-IO-004).
 *
 *  **Why the taker ORDER's owner is not a third arm.** It used to be, on the
 *  belief that `Fill.taker` was denormalized only on spot and was null on
 *  binary. That belief is stale: `backfillTakerFills` in the indexer's
 *  `handlers/orderbook.ts` is called from `OrderPlaced` for SPOT, PERP *and*
 *  binary, and stamps the taker address unconditionally — "still stamp the
 *  taker address so it is never lost" — keeping the bridge open afterwards only
 *  to await the binary `takerSide`/`kind`. The taker's order is always placed in
 *  the SAME transaction as the fill it crosses (a resting order occupies the
 *  maker seat by definition), so no committed row can lack it. The indexer's own
 *  `schema.graphql` says as much (`takerOrder: Order!`), though Hasura re-exposes
 *  the relationship as nullable — which is why every call site still uses `?.`.
 *  The non-null guarantee that survives to the wire is `takerOrder_id: String!`:
 *  every fill names a taker order, whether or not the join is proved.
 *
 *  The arm was therefore matching rows the first two already matched, and it was
 *  not free. A relationship predicate compiles to a correlated `EXISTS`
 *  subquery, which Postgres cannot combine with a bitmap OR over the `maker`
 *  and `taker` indexes. The plan walks the `timestamp` index backwards and tests
 *  each row, so the cost is set by how far it must walk to fill `limit` — and
 *  with the arm, every row walked past costs a lookup into `Order`.
 *
 *  That makes the penalty worst for the accounts that matter most. A busy
 *  market maker whose fills are dense in recent history reaches `limit` quickly
 *  and barely notices. An ORDINARY wallet is sparse in a table the bots fill, so
 *  the scan runs long and pays the subquery the whole way down. Measured against
 *  the development indexer, sweeping four real single-fill wallets took 2.78s,
 *  4.50s, 8.75s and 10.93s with the arm, against 0.04s, 0.41s, 0.26s and 0.27s
 *  without it — 11x to 72x. A wallet with no fills at all showed the same shape:
 *  a median 2,035ms to return nothing, against 28ms.
 *
 *  `takerOrder { owner side }` stays in the SELECTION set — `side` is what the
 *  binary lens reads when the fill's own `takerSide` copy is still lagging, and
 *  selecting a non-null relationship is an ordinary join, not a filter.
 *
 *  What makes the invariant hold rather than merely happen to be true: the
 *  indexer writes `Fill.taker` and `Order.owner` from the SAME local in the SAME
 *  handler (`applyOrderPlaced` passes its `owner` both into the Order row and
 *  into `backfillTakerFills`), so the two cannot disagree — delegated and
 *  operator-placed orders included.
 *
 *  `sdk-e2e/test/query.test.ts` asserts it against a live indexer, but that suite
 *  is `test:reads` and CI runs only `test:unit` — so it is a hand-run check, not
 *  a gate. Run it after any change to the indexer's taker backfill.
 */
function participatedAs(acct) {
    return [{ maker: { _eq: acct } }, { taker: { _eq: acct } }];
}
/**
 *  Add the `market` / `pool` / `marketType` / `since` / `until` predicates a
 *  {@link FillsScope} supplies to a Fill `where` object. Only supplied values are
 *  added, so an omitted field never narrows the query (SDK-IO-004). `marketType`
 *  is the Fill's own column, not the `market` relationship, so it adds no join.
 */
function applyFillScope(where, opts) {
    const market = opts.market == null ? undefined : fillScopeId(opts.market, "market");
    const markets = opts.markets == null ? undefined : fillScopeList(opts.markets, "markets");
    const pool = opts.pool == null ? undefined : fillScopeId(opts.pool, "pool");
    const marketId = {};
    if (market !== undefined)
        marketId._eq = market;
    if (markets !== undefined)
        marketId._in = markets;
    if (Object.keys(marketId).length)
        where.market_id = marketId;
    if (pool !== undefined)
        where.pool = { _eq: pool };
    if (opts.marketType !== undefined)
        where.marketType = { _eq: FillPagination.marketKind(opts.marketType) };
    return applyFillWindow(where, opts);
}
/**
 * Validate one fill-scope identifier before building the indexer predicate.
 *
 * This stays fill-owned rather than sharing the order helper: fill market lists
 * become one direct `_in`, while order pool lists also cap, deduplicate and run
 * per-pool classification reads.
 */
function fillScopeId(value, option) {
    if (typeof value !== "string" || value.length === 0) {
        throw new InvalidInputError(`${option} must be a non-empty string`);
    }
    return value.toLowerCase();
}
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const isDecimalString = (value) => typeof value === "string" && DECIMAL.test(value);
/** Validate an indexed order id without invoking methods on untyped input. */
function fillOrderId(value) {
    if (typeof value === "bigint") {
        if (value < 0n)
            throw new InvalidInputError("orderId must be an unsigned decimal integer");
        return value.toString();
    }
    if (typeof value !== "string" || !DECIMAL.test(value)) {
        throw new InvalidInputError("orderId must be an unsigned decimal integer");
    }
    return value;
}
/** Validate a fill-scope list before mapping its identifiers. */
function fillScopeList(values, option) {
    if (!Array.isArray(values))
        throw new InvalidInputError(`${option} must be an array`);
    return Array.from(values, (value) => fillScopeId(value, option));
}
/** Add a `since`/`until` window (unix seconds) and a block range to a Fill `where`. */
function applyFillWindow(where, opts) {
    const ts = {};
    if (opts.since != null)
        ts._gte = opts.since;
    if (opts.until != null)
        ts._lte = opts.until;
    if (Object.keys(ts).length)
        where.timestamp = ts;
    // A separate column, not a second bound on `timestamp`: the block bounds are
    // exact where the seconds bounds are ambiguous across same-timestamp blocks.
    const block = blockRange(opts);
    if (block)
        where.blockNumber = block;
    return where;
}
/**
 *  The `Fill.blockNumber` comparison for a caller's `sinceBlock` / `toBlock`, or
 *  `null` when neither was supplied. Both bounds merge into ONE comparison
 *  object, because Hasura reads a second `blockNumber` key as a replacement
 *  rather than as a second bound.
 *
 *  An inverted range is rejected here rather than sent: it matches nothing, so
 *  an empty answer would read as "no fills" and hide the caller's mistake.
 */
function blockRange(opts) {
    const range = {};
    if (opts.sinceBlock != null)
        Object.assign(range, IndexerRead.blockLowerBound(opts.sinceBlock, "sinceBlock"));
    if (opts.toBlock != null)
        Object.assign(range, IndexerRead.blockUpperBound(opts.toBlock, "toBlock"));
    if (!Object.keys(range).length)
        return null;
    if (range._gte != null && range._lte != null && BigInt(range._gte) > BigInt(range._lte)) {
        throw new InvalidInputError("sinceBlock must not exceed toBlock");
    }
    return range;
}
/**
 *  One fill in full, by id — the trade, its market, both orders, its fees, and
 *  the rest of its transaction.
 *
 *  This is the read behind a trade detail view. Use it when a caller has picked
 *  ONE trade out of a tape or activity feed and wants everything about it;
 *  {@link getFills} and `getMarketActivity` are the list reads that produce the id.
 *
 *  Returns `null` when no fill has this id — a mistyped or stale link, not a
 *  failure. A failed read throws (SDK-IO-002).
 *
 *  Two round-trips: the fill (with its market and both orders) has to resolve
 *  before its transaction's siblings and fees can be selected, because those are
 *  anchored on the fill's timestamp so the indexer can serve them from an index.
 *
 *  @param id - Fill id, `${blockNumber}_${logIndex}` (as `FillRow.id` carries it).
 *  @throws {@link IndexerError} when the indexer read fails.
 *
 *  ```ts
 *  const detail = await client.getTradeContext("441083911_5");
 *  if (detail) {
 *    console.log(detail.fill.fillPrice, detail.makerOrder?.owner, detail.siblings.length);
 *  }
 *  ```
 */
export async function getTradeContext(id, indexerUrl) {
    const head = await IndexerRead.gqlRequest(TradeContextQuery, { id }, indexerUrl);
    const row = head.Fill_by_pk;
    if (row == null)
        return null;
    const fill = toTradeFill(row);
    // Anchored on `timestamp`, indexed on all three entities, with `txHash` as
    // the narrowing predicate. `Fill.txHash` gained an `@index` in this release,
    // but the anchor stays: it is the predicate the OTHER two entities are served
    // by, and it costs nothing here.
    const rest = await IndexerRead.gqlRequest(FillTxContextQuery, { timestamp: fill.timestamp, txHash: fill.txHash, market: fill.market, id: fill.id }, indexerUrl);
    return {
        fill,
        market: row.market == null ? null : toMarket(row.market),
        makerOrder: row.makerOrder == null ? null : toFillOrder(row.makerOrder),
        takerOrder: row.takerOrder == null ? null : toFillOrder(row.takerOrder),
        siblings: rest.Fill.map(toTradeFill),
        protocolFees: rest.ProtocolFeeRecord,
        builderFees: rest.BuilderFeeRecord,
    };
}
/** Map a fill row to the public {@link OrderFillRow}. */
function toTradeFill(r) {
    return {
        id: r.id,
        market: r.market_id,
        pool: r.pool,
        makerOrderId: r.makerOrderId,
        takerOrderId: r.takerOrderId,
        takerRemainingQuantity: r.takerRemainingQuantity,
        makerRemainingQuantity: r.makerRemainingQuantity,
        fillPrice: r.fillPrice,
        quantity: r.quantity,
        quoteQuantity: r.quoteQuantity,
        maker: r.maker,
        makerSide: r.makerSide,
        taker: r.taker,
        takerSide: r.takerSide,
        kind: r.kind,
        takerIsBid: r.takerIsBid,
        takerOrder: r.takerOrder == null ? null : { owner: r.takerOrder.owner, side: r.takerOrder.side },
        timestamp: r.timestamp,
        txHash: r.txHash,
        blockNumber: r.blockNumber,
        logIndex: r.logIndex,
    };
}
/** Map an order row to the public {@link FillOrder}. */
function toFillOrder(o) {
    return {
        id: o.id,
        orderId: o.orderId,
        owner: o.owner,
        isBid: o.isBid,
        side: o.side,
        price: o.price,
        fullQuantity: o.fullQuantity,
        filledQuantity: o.filledQuantity,
        quantityRemaining: o.quantityRemaining,
        status: o.status,
        rested: o.rested,
        cancelReason: o.cancelReason,
        placedAtTimestamp: o.placedAtTimestamp,
        placedTxHash: o.placedTxHash,
    };
}
// ---------------------------------------------------------------------------
// Typed documents for the reads above. Hoisted here (rather than inline at each
// call site) to keep this file's reading order: functions first, GraphQL after.
// Result and variable types are derived from the committed schema snapshot.
// prettier-ignore
const FillsQuery = graphql(`
  query Fills($where: Fill_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Fill(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $limit, offset: $offset) {
          ...FillQueryFields
        }
      }
`);
// prettier-ignore
const UserFillsQuery = graphql(`
  query UserFills($where: Fill_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Fill(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $limit, offset: $offset) {
          ...FillQueryFields
        }
      }
`);
// prettier-ignore
/**
 *  Ascending by block position, which is the order `(marketType, blockNumber,
 *  logIndex)` delivers rows in — so the LIMIT stops the scan rather than a sort
 *  consuming the whole range first.
 */
const FillsRangePageQuery = graphql(`
  query FillsRangePage($where: Fill_bool_exp!, $limit: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Fill(where: $where, order_by: [{blockNumber: asc}, {logIndex: asc}], limit: $limit) {
      ...FillQueryFields
    }
  }
`);
// prettier-ignore
const LatestFillBlockQuery = graphql(`
  query LatestFillBlock($marketType: markettype!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Fill(where: {marketType: {_eq: $marketType}}, order_by: [{blockNumber: desc}], limit: 1) {
      blockNumber
      timestamp
    }
  }
`);
// prettier-ignore
const UserFillsPageQuery = graphql(`
  query UserFillsPage($where: Fill_bool_exp!, $limit: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    FillDataset_by_pk(id: "current") { generation }
    Fill(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}, {logIndex: desc}], limit: $limit) {
      ...FillQueryFields
      blockNumber
      logIndex
    }
  }
`);
// prettier-ignore
/**
 *  The selection behind {@link MarketRef}, declared ONCE. Both detail reads land
 *  their row through `narrowIndexerInvariant`, an unchecked cast — so a field
 *  added to `MarketRef` and to only one of two copied selections would surface
 *  as `undefined` at runtime with no type error. One fragment removes that.
 */
export const MarketRefFields = graphql(`
  fragment MarketRefFields on Market {
    id marketType poolAddress marketAddress baseSymbol quoteSymbol
    baseDecimals quoteDecimals asset question
  }
`);
// prettier-ignore
const FillDetailQuery = graphql(`
  query FillDetail($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Fill(where: { id: { _eq: $id } }, limit: 1) {
          ...FillQueryFields
          blockNumber logIndex
          marketRef: market { ...MarketRefFields }
        }
      }
`);
// prettier-ignore
const OrderFillsQuery = graphql(`
  query OrderFills($pool: String!, $oid: numeric!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Fill(
          where: { pool: { _eq: $pool }, _or: [{ takerOrderId: { _eq: $oid } }, { makerOrderId: { _eq: $oid } }] }
          order_by: [{timestamp: desc}, {blockNumber: desc}]
          limit: $limit
        ) {
          ...FillQueryFields
          blockNumber logIndex
        }
      }
`);
// The trade-detail documents. `TradeContextFillFields` selects everything FillQueryFields
// does plus the block position, and is reused for the sibling rows so one mapper
// serves both. The market row is selected through `MarketRowFields` so `toMarket`
// can narrow it — the same seam every other market read uses.
// prettier-ignore
const TradeContextFillFields = graphql(`
  fragment TradeContextFillFields on Fill {
    id
    market_id
    pool
    fillPrice
    quantity
    quoteQuantity
    maker
    makerSide
    taker
    takerSide
    kind
    takerIsBid
    takerOrder { owner side }
    makerOrderId
    takerOrderId
    takerRemainingQuantity
    makerRemainingQuantity
    blockNumber
    timestamp
    logIndex
    txHash
  }
`);
// prettier-ignore
const FillOrderFields = graphql(`
  fragment FillOrderFields on Order {
    id
    orderId
    owner
    isBid
    side
    price
    fullQuantity
    filledQuantity
    quantityRemaining
    status
    rested
    cancelReason
    placedAtTimestamp
    placedTxHash
  }
`);
// prettier-ignore
const TradeContextQuery = graphql(`
  query TradeContext($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Fill_by_pk(id: $id) {
           ...TradeContextFillFields
           market { ...MarketFields }
           makerOrder { ...FillOrderFields }
           takerOrder { ...FillOrderFields }
         }
       }
`);
// prettier-ignore
const FillTxContextQuery = graphql(`
  query FillTxContext($timestamp: numeric!, $txHash: String!, $market: String!, $id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Fill(
           where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}, id: {_neq: $id}}
           order_by: [{blockNumber: desc}, {logIndex: desc}]
           limit: 100
         ) {
           ...TradeContextFillFields
         }
         ProtocolFeeRecord(
           where: {market_id: {_eq: $market}, timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
           order_by: {id: asc}
           limit: 100
         ) {
           ...ProtocolFeeFields
         }
         BuilderFeeRecord(
           where: {market_id: {_eq: $market}, timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
           order_by: {id: asc}
           limit: 100
         ) {
           ...BuilderFeeFields
         }
       }
`);
// The two count documents for `Fill` (see IndexerRead.CountDocuments).
const FillCountDocuments = {
    table: "Fill",
    // prettier-ignore
    aggregate: graphql(`
    query FillCount($where: Fill_bool_exp!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      total: Fill_aggregate(where: $where) { aggregate { count } }
    }
  `),
    // prettier-ignore
    fallback: graphql(`
    query FillCountFallback($where: Fill_bool_exp!, $limit: Int!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      rows: Fill(where: $where, limit: $limit) { id }
    }
  `),
};
