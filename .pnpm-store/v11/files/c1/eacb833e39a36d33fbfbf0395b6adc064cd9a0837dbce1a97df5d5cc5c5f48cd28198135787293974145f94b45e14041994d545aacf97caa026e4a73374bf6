// Market activity — the transaction feed of one market.
//
// This module answers one question: what has happened on this market, in the
// order it happened? The indexer records each answer in its own entity, one per
// event shape. A `Fill` is a trade. A `RouterActionRecord` is a complete-set
// mint, a merge, or a redemption. A `MarketResolutionEvent` is the oracle
// settling the market. A `MarketStatusUpdate` is a lifecycle transition. A
// caller that wants the market's history needs all four, interleaved by time.
//
// The concept here is the interleaving. Each source entity already has an owner
// module (`fills`, `router`, `markets`, `binary/settlement`), and each of those
// answers a different question — one stream, for one purpose, in its own shape.
// This module owns the merged view: one timeline, one row type, one round-trip.
// It is a SHARED concept, because a market of every kind has a timeline; the
// binary-only streams simply return nothing on spot and perp.
//
// Read-only by nature. Activity is what the chain did, never something a caller
// asks for. Errors propagate (see CONVENTIONS.md): an empty array means "this
// market has no activity in the window", never "the read failed".
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
import * as Markets from "./markets.js";
/**
 *  One market's activity, newest first — trades interleaved with complete-set
 *  mints and merges, redemptions, oracle resolution and lifecycle transitions.
 *
 *  This is the market's transaction history: every row names the transaction it
 *  landed in, so a caller can follow any row to the chain. It is the one-shot
 *  INDEXER read, so it carries the history a page needs on first paint. It does
 *  not update itself. For trades arriving with no indexer round-trip, read the
 *  live store as well ({@link SomniaMarketsClient.getLiveFills}, or the
 *  `useLiveFills` hook) and merge on the trade rows' `id`, which is `TRADE:`
 *  followed by the fill id.
 *
 *  A spot or perp market returns `TRADE` rows only. The other four kinds come
 *  from binary-only entities, so their streams are simply empty — asking for
 *  them on spot or perp is not an error.
 *
 *  One round-trip. Every predicate runs at the indexer, so `limit` applies to
 *  the rows you asked for. The merge itself is the only work done here, over
 *  results the server has already bounded.
 *
 *  @param market - The market's bytes32 marketId (case-insensitive). On spot and
 *  perp this is the pool address.
 *  @param opts - Paging, kind selection and the `pool` hint
 *  ({@link MarketActivityOptions}).
 *  @throws {@link IndexerError} when the indexer read fails.
 *
 *  ```ts
 *  const page = await client.getMarketActivity(marketId, { limit: 100, pool });
 *  const older = await client.getMarketActivity(marketId, {
 *    limit: 100,
 *    pool,
 *    until: Number(page[page.length - 1].timestamp),
 *  });
 *  ```
 */
export async function getMarketActivity(market, opts = {}, indexerUrl) {
    const marketId = market.toLowerCase();
    const limit = opts.limit ?? 50;
    const kinds = new Set(opts.kinds ?? ALL_ACTIVITY_KINDS);
    const routerKinds = ROUTER_KIND_BY_ACTIVITY_KIND.filter(([activityKind]) => kinds.has(activityKind)).map(([, routerKind]) => routerKind);
    // A stream the caller did not ask for is limited to zero rows rather than
    // dropped from the document. That keeps ONE static, fully typed query for
    // every combination of `kinds`, and keeps the exclusion at the indexer, where
    // `LIMIT 0` costs nothing.
    const fillWhere = { market_id: { _eq: marketId } };
    if (opts.pool != null)
        fillWhere.pool = { _eq: opts.pool.toLowerCase() };
    const routerWhere = { market_id: { _eq: marketId } };
    if (routerKinds.length)
        routerWhere.kind = { _in: routerKinds };
    const resolutionWhere = { market_id: { _eq: marketId } };
    const statusWhere = { market_id: { _eq: marketId } };
    for (const where of [fillWhere, routerWhere, resolutionWhere, statusWhere]) {
        applyActivityWindow(where, opts);
    }
    const data = await IndexerRead.gqlRequest(MarketActivityQuery, {
        fillWhere,
        routerWhere,
        resolutionWhere,
        statusWhere,
        fillLimit: kinds.has("TRADE") ? limit : 0,
        routerLimit: routerKinds.length ? limit : 0,
        resolutionLimit: kinds.has("RESOLUTION") ? limit : 0,
        statusLimit: kinds.has("STATUS") ? limit : 0,
    }, indexerUrl);
    const rows = [
        ...data.Fill.map(toTradeActivity),
        // `kind` is a plain `String!` column the handlers only ever fill with the
        // three router verbs, so the mapper's lookup is total in practice. A row
        // whose verb is unknown is dropped rather than typed as one of them.
        ...data.RouterActionRecord.flatMap(toSupplyActivity),
        ...data.MarketResolutionEvent.map(toResolutionActivity),
        ...data.MarketStatusUpdate.map(toStatusActivity),
    ];
    // Each stream arrives newest-first and bounded to `limit`, so merging them and
    // keeping the first `limit` is exactly the newest `limit` events overall.
    return rows.sort(byNewestFirst).slice(0, limit);
}
/**
 *  Everything the protocol did in one transaction — trades, complete-set mints
 *  and merges, redemptions, oracle resolution, lifecycle transitions, the orders
 *  it placed, and the fees it paid.
 *
 *  This is the read behind a transaction detail view, and the counterpart to
 *  {@link getTradeContext}: that one starts from a trade and shows its transaction
 *  as context, this one starts from a transaction and shows every trade in it.
 *  `events` is the same {@link MarketActivity} union
 *  {@link SomniaMarketsClient.getMarketActivity} returns, with the same row ids, so a caller can
 *  render both with one component and link a `TRADE:` row straight to its detail.
 *
 *  Returns empty collections and a null `blockNumber` for a hash the indexer has
 *  nothing for — an unknown hash, or a transaction that touched no protocol
 *  contract. That is absence, not failure (SDK-IO-002).
 *
 *  Two round-trips. The first selects the events BY transaction hash, which is
 *  the only predicate available at the start and is not an indexed column on
 *  `Fill`. The second uses the block timestamp the first one found, so the fees,
 *  the placed orders and the market rows are all index-served.
 *
 *  Only when the first pass finds no event does the read need another anchor.
 *  It takes `opts.anchor`, else asks `resolveAnchor`, else probes the order
 *  table. An event-anchored read makes no chain call.
 *
 *  @param txHash - Transaction hash (case-insensitive).
 *  @param resolveAnchor - Owner-injected chain lookup, called at most once and
 *  only when no event and no `opts.anchor` supply the anchor.
 *  @throws {@link IndexerError} when the indexer read fails.
 *
 *  ```ts
 *  const tx = await client.getTransactionActivity(hash);
 *  for (const event of tx.events) {
 *    if (event.kind === "TRADE") console.log(tx.markets[event.market]?.marketType);
 *  }
 *  ```
 */
export async function getTransactionActivity(txHash, resolveAnchor, opts = {}, indexerUrl) {
    const hash = txHash.toLowerCase();
    const limit = opts.limit ?? 100;
    // Pass one: the events, selected by hash. `Fill.txHash` carries an `@index` in
    // the entity schema, so this is an index read rather than the table scan it
    // used to be — but only where the indexer has been REINDEXED since that index
    // was added. Against an older deployment it degrades to the original scan
    // (one scan, returning the page's content rather than merely probing for an
    // anchor), which is correct, just slower. The three other streams are small
    // tables either way.
    const found = await IndexerRead.gqlRequest(TransactionEventsQuery, { txHash: hash, limit }, indexerUrl);
    const events = [
        ...found.Fill.map(toTradeActivity),
        ...found.RouterActionRecord.flatMap(toSupplyActivity),
        ...found.MarketResolutionEvent.map(toResolutionActivity),
        ...found.MarketStatusUpdate.map(toStatusActivity),
    ].sort(byLogOrder);
    // Every event of one transaction shares its block, so any of them anchors the
    // second pass. But a real protocol transaction can produce NO event at all: a
    // limit order that rests without crossing writes only an Order row. Falling
    // through here reported such a transaction as "nothing indexed" and made
    // `ordersPlaced` unreachable on its own, so probe the order table for an
    // anchor before giving up. One extra round-trip, only in the no-event case.
    const [anchor] = events;
    // The probe exists only to find an anchor when no event supplied one. A caller
    // that already knows the block skips it — which is the difference between a
    // read that completes and one that dies on an unindexed scan. The chain lookup
    // runs only here, after the events came back empty: an event already anchors
    // the read, and asking the chain first cost two dependent RPC reads per call.
    const hint = anchor === undefined ? (opts.anchor ?? (await resolveAnchor(hash)) ?? null) : null;
    const restingOrders = anchor === undefined && hint === null
        ? ((await IndexerRead.gqlRequest(TransactionOrderAnchorQuery, { txHash: hash, limit }, indexerUrl)).Order ?? [])
        : [];
    const anchorTimestamp = anchor?.timestamp ?? restingOrders[0]?.placedAtTimestamp ?? (hint === null ? null : String(hint.timestamp));
    const anchorBlock = anchor?.blockNumber ?? restingOrders[0]?.placedAtBlock ?? (hint === null ? null : String(hint.blockNumber));
    if (anchorTimestamp === null || anchorBlock === null) {
        // Genuinely nothing the indexer follows — an unknown hash, or a transaction
        // that touched no protocol contract.
        return {
            txHash: hash,
            blockNumber: null,
            timestamp: null,
            events: [],
            ordersPlaced: [],
            protocolFees: [],
            builderFees: [],
            markets: {},
        };
    }
    // Markets to hydrate come from whichever pass found something.
    const marketIds = [...new Set([...events.map((e) => e.market), ...restingOrders.map((o) => o.market_id)])];
    // Pass two: everything that needs the timestamp to be index-served. The fee
    // and order tables are as large as `Fill`, so these are anchored rather than
    // filtered by hash alone; the market rows are a primary-key lookup.
    const rest = await IndexerRead.gqlRequest(TransactionContextQuery, 
    // `orderLimit: 0` when the anchor probe already returned the orders: that
    // path ran the same `placedTxHash` predicate, which is not index-served, so
    // repeating it here would scan twice for one answer.
    { txHash: hash, timestamp: anchorTimestamp, marketIds, limit, orderLimit: restingOrders.length > 0 ? 0 : limit }, indexerUrl);
    const markets = {};
    for (const row of Markets.toMarkets(rest.Market))
        markets[row.id] = row;
    const ordersPlaced = (restingOrders.length > 0 ? restingOrders : rest.Order).map(toTransactionOrder);
    // On the hinted no-event path `marketIds` was EMPTY when pass two was built —
    // no event and no probe had named a market yet, and the orders pass two
    // returned are the first mention of them — so hydrate those now.
    //
    // Guarded on that path alone. Every other path already fed `marketIds` from
    // whatever it found, so a market missing from `markets` there means the
    // indexer genuinely has no row for it, and asking a second time would buy an
    // extra round-trip per read for the same empty answer.
    const lateMarkets = events.length === 0 && restingOrders.length === 0;
    const unnamed = lateMarkets ? [...new Set(ordersPlaced.map((o) => o.market))].filter((id) => !(id in markets)) : [];
    if (unnamed.length > 0) {
        const extra = await IndexerRead.gqlRequest(BlockMarketsQuery, { marketIds: unnamed }, indexerUrl);
        for (const row of Markets.toMarkets(extra.Market))
            markets[row.id] = row;
    }
    return {
        txHash: hash,
        blockNumber: anchorBlock,
        timestamp: anchorTimestamp,
        events,
        ordersPlaced,
        protocolFees: rest.ProtocolFeeRecord,
        builderFees: rest.BuilderFeeRecord,
        markets,
    };
}
/**
 *  What the protocol traded in one block, grouped by market.
 *
 *  **When to use**
 *
 *  Use for a block-scoped view: which markets a block touched, and each one's
 *  trades and order events. The counterpart to
 *  {@link SomniaMarketsClient.getTransactionActivity}, one level up — a block holds many
 *  transactions, and a single market's orders can arrive in several of them.
 *
 *  **Details**
 *
 *  `timestamp` is REQUIRED, and is the block's own timestamp. It is not a
 *  convenience: no block column in the indexer schema carries an index, so a
 *  read keyed on `blockNumber` alone is a sequential scan (measured: 3s on
 *  `Fill`, past the gateway timeout on `Order`). The indexed timestamp is the
 *  anchor, and `blockNumber` narrows the index result — the same "anchored
 *  rather than filtered" shape {@link getTransactionActivity} uses. Resolving
 *  block → timestamp needs a chain read, which is the caller's to make: this
 *  module is indexer-only by construction.
 *
 *  The market set is FOLDED from the rows rather than queried — every fill and
 *  order names its market — and then hydrated by primary key.
 *
 *  **Gotchas**
 *
 *  One second spans several blocks, so the timestamp predicate alone would
 *  return neighbouring blocks too. Both predicates are sent together and the
 *  narrowing happens server-side; a caller never sees the superset.
 *
 *  Order rows carry no status here, on purpose — see {@link BlockOrder}.
 *
 *  @param blockNumber - The block to read.
 *  @param resolveBlockTimestamp - Reads the block's timestamp from the chain.
 *  Injected by the owner, which holds the transport; see `createClient`.
 *  @param opts - Rows per stream, and the offset to page them from.
 *  @param indexerUrl - Indexer GraphQL endpoint.
 *  @returns The block's markets activity, grouped by market.
 *  @category activity
 *
 *  ```ts
 *  const activity = await client.getBlockActivity(479269402n);
 *  for (const group of activity.markets) {
 *    const market = activity.marketsById[group.market];
 *    const label = market && isBinaryMarket(market) ? market.question : group.market;
 *    console.log(label, group.fills.length, "trades");
 *  }
 *  ```
 */
export async function getBlockActivity(blockNumber, resolveBlockTimestamp, opts = {}, indexerUrl) {
    const limit = opts.limit ?? 500;
    const offset = opts.offset ?? 0;
    const timestamp = await resolveBlockTimestamp(blockNumber);
    const found = await IndexerRead.gqlRequest(BlockActivityQuery, { blk: String(blockNumber), ts: String(timestamp), limit, offset }, indexerUrl);
    // Any stream hitting the cap means the block may hold more than this page.
    const truncated = found.Fill.length === limit || found.placed.length === limit || found.touched.length === limit;
    const fills = found.Fill.map(toTradeActivity);
    // Which orders this block FILLED, from the block's own fills — the only
    // as-of-this-block source. Everything else in `touched` was removed.
    const filledOrderIds = new Set();
    for (const row of found.Fill) {
        if (row.makerOrder_id !== null)
            filledOrderIds.add(row.makerOrder_id);
        if (row.takerOrder_id !== null)
            filledOrderIds.add(row.takerOrder_id);
    }
    const placed = found.placed.map((o) => toBlockOrder(o, null));
    const touched = found.touched.map((o) => toBlockOrder(o, filledOrderIds.has(o.id) ? "FILLED" : "REMOVED"));
    // The market set is a FOLD over the rows, not a query of its own.
    const marketIds = [
        ...new Set([...fills.map((f) => f.market), ...placed.map((o) => o.market), ...touched.map((o) => o.market)]),
    ];
    if (marketIds.length === 0) {
        return { blockNumber, timestamp, markets: [], marketsById: {}, truncated };
    }
    const hydrated = await IndexerRead.gqlRequest(BlockMarketsQuery, { marketIds }, indexerUrl);
    const marketsById = {};
    for (const row of Markets.toMarkets(hydrated.Market))
        marketsById[row.id] = row;
    const markets = marketIds
        .map((market) => ({
        market,
        fills: fills.filter((f) => f.market === market),
        placed: placed.filter((o) => o.market === market),
        touched: touched.filter((o) => o.market === market),
    }))
        // Busiest market first: a block's headline is where it traded, and trades
        // are rarer than quote churn, so fills outrank order count.
        .sort((a, b) => b.fills.length - a.fills.length || b.placed.length + b.touched.length - (a.placed.length + a.touched.length));
    return { blockNumber, timestamp, markets, marketsById, truncated };
}
/**
 *  The newest block the indexer has markets activity for.
 *
 *  **When to use**
 *
 *  Use to land a block-scoped view on something worth looking at. The CHAIN head
 *  is the wrong answer for that: it runs ahead of the indexer by construction,
 *  and measured on testnet only ~42% of blocks carry any markets activity at all
 *  (empty runs reach 11 blocks), so "the latest block" is usually a blank page.
 *  This is the latest block that is not.
 *
 *  **Details**
 *
 *  Ordered by the indexed timestamp columns, never by a block column — those
 *  carry no index, so an `order_by` on one sorts the whole table.
 *
 *  Two passes, because one is not sound. A page ordered by timestamp can be an
 *  ARBITRARY subset of the rows sharing the newest timestamp, and a second spans
 *  roughly ten blocks — so taking the highest block from that page can miss a
 *  later block in the same second. Pass one therefore reads only the newest
 *  timestamp; pass two reads every row AT that timestamp, where the highest
 *  block is exact.
 *
 *  @param indexerUrl - Indexer GraphQL endpoint.
 *  @returns The block and its timestamp, or null when the indexer has no
 *  activity at all (a fresh deployment, or one still replaying from its start
 *  block).
 *  @category activity
 */
export async function getLatestActiveBlock(indexerUrl) {
    const newest = await IndexerRead.gqlRequest(LatestActiveTimestampQuery, {}, indexerUrl);
    let newestTs = null;
    const considerTs = (raw) => {
        const v = BigInt(raw);
        if (newestTs === null || v > newestTs)
            newestTs = v;
    };
    for (const r of newest.Fill)
        considerTs(r.timestamp);
    for (const r of newest.placed)
        considerTs(r.placedAtTimestamp);
    for (const r of newest.touched)
        considerTs(r.lastUpdatedAtTimestamp);
    if (newestTs === null)
        return null;
    const timestamp = newestTs;
    const at = await IndexerRead.gqlRequest(ActiveBlocksAtTimestampQuery, { ts: String(timestamp) }, indexerUrl);
    let highest = null;
    const considerBlock = (raw) => {
        const v = BigInt(raw);
        if (highest === null || v > highest)
            highest = v;
    };
    for (const r of at.Fill)
        considerBlock(r.blockNumber);
    for (const r of at.placed)
        considerBlock(r.placedAtBlock);
    for (const r of at.touched)
        considerBlock(r.lastUpdatedAtBlock);
    // The timestamp came from a row, so at least one row carries it.
    return highest === null ? null : { blockNumber: highest, timestamp };
}
/**
 *  The nearest blocks with markets activity on either side of one block.
 *
 *  **When to use**
 *
 *  Use to step a block view without landing on a blank page. Measured on
 *  testnet only ~42% of blocks carry any markets activity, so plain N±1
 *  navigation shows nothing more than half the time; these are the neighbours
 *  worth visiting.
 *
 *  **Details**
 *
 *  One round-trip, six streams: each of Fill / placed / touched is read once
 *  backwards from the anchor timestamp and once forwards. Ordering is on the
 *  indexed timestamp columns — never on a block column, which carries no index —
 *  so each side returns the rows immediately adjacent in time, and the answer is
 *  the closest block among them on the correct side of `blockNumber`.
 *
 *  Rows sharing the anchor's own timestamp are included on both sides on
 *  purpose: a second spans roughly ten blocks, so the nearest active block in
 *  either direction is frequently inside the same second.
 *
 *  **Gotchas**
 *
 *  The scan is BOUNDED by `limit` rows per stream per direction. A gap wider
 *  than that window reports `null` — "none found nearby", not "none exists".
 *  The default covers seconds of activity against a measured worst-case gap of
 *  11 blocks, so it is the right trade for a navigation control; a caller that
 *  needs certainty over a quiet stretch should raise it.
 *
 *  @param blockNumber - The block being viewed. Excluded from both answers.
 *  @param resolveBlockTimestamp - Reads the block's timestamp from the chain,
 *  injected by the owner.
 *  @param opts - Rows per stream per direction (default 400).
 *  @param indexerUrl - Indexer GraphQL endpoint.
 *  @returns The closest active block below and above, either of which may be null.
 *  @category activity
 */
export async function getAdjacentActiveBlocks(blockNumber, resolveBlockTimestamp, opts = {}, indexerUrl) {
    const limit = opts.limit ?? 400;
    const here = blockNumber;
    const timestamp = await resolveBlockTimestamp(blockNumber);
    const found = await IndexerRead.gqlRequest(AdjacentActiveBlocksQuery, { ts: String(timestamp), limit }, indexerUrl);
    let prev = null;
    let next = null;
    const consider = (raw) => {
        const b = BigInt(raw);
        if (b < here) {
            if (prev === null || b > prev)
                prev = b;
        }
        else if (b > here) {
            if (next === null || b < next)
                next = b;
        }
    };
    for (const r of found.prevFill)
        consider(r.blockNumber);
    for (const r of found.nextFill)
        consider(r.blockNumber);
    for (const r of found.prevPlaced)
        consider(r.placedAtBlock);
    for (const r of found.nextPlaced)
        consider(r.placedAtBlock);
    for (const r of found.prevTouched)
        consider(r.lastUpdatedAtBlock);
    for (const r of found.nextTouched)
        consider(r.lastUpdatedAtBlock);
    return { prev, next };
}
/** Map an order row touched in the block to the public {@link BlockOrder}. */
function toBlockOrder(o, touch) {
    return {
        id: o.id,
        orderId: o.orderId,
        market: o.market_id,
        owner: o.owner,
        isBid: o.isBid,
        side: o.side,
        price: o.price,
        fullQuantity: o.fullQuantity,
        placedAtBlock: BigInt(o.placedAtBlock),
        placedTxHash: o.placedTxHash,
        cancelReason: o.cancelReason,
        touch,
    };
}
/** Map an order row placed in the transaction to the public {@link TransactionOrder}. */
function toTransactionOrder(o) {
    return {
        id: o.id,
        orderId: o.orderId,
        market: o.market_id,
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
/**
 *  Earliest first, by log position — how a transaction reads. Every event of one
 *  transaction shares a block, so the log index alone orders them; block number
 *  is compared first anyway so the comparator stays correct if that ever changes.
 */
function byLogOrder(a, b) {
    if (a.blockNumber !== b.blockNumber)
        return Number(a.blockNumber) - Number(b.blockNumber);
    return logIndexOf(a) - logIndexOf(b);
}
/** Every kind {@link SomniaMarketsClient.getMarketActivity} reads when `kinds` is omitted. */
const ALL_ACTIVITY_KINDS = [
    "TRADE",
    "MINT_SET",
    "MERGE_SET",
    "REDEEM",
    "RESOLUTION",
    "STATUS",
];
/**
 *  The three activity kinds that read from `RouterActionRecord`, paired with the
 *  verb that entity's `kind` column uses. Ordered pairs rather than a record, so
 *  the `kinds` filter maps to a `_in` list in one pass.
 */
const ROUTER_KIND_BY_ACTIVITY_KIND = [
    ["MINT_SET", "MintCompleteSet"],
    ["MERGE_SET", "MergeCompleteSet"],
    ["REDEEM", "Redeem"],
];
/** Inverse of {@link ROUTER_KIND_BY_ACTIVITY_KIND}, for mapping a row back. */
const ACTIVITY_KIND_BY_ROUTER_KIND = new Map([
    ["MintCompleteSet", "MINT_SET"],
    ["MergeCompleteSet", "MERGE_SET"],
    ["Redeem", "REDEEM"],
]);
/**
 *  Newest first, breaking a shared timestamp on block then log position.
 *
 *  EXPORTED because it is the order `getMarketActivity` pages by: a caller
 *  merging its own rows into that page (the live tail, say) must sort by the
 *  same rule, and a hand-copied comparator is free to drift from the paging
 *  contract with nothing to catch it.
 *
 *  @category activity
 */
export function byNewestFirst(a, b) {
    if (a.timestamp !== b.timestamp)
        return Number(b.timestamp) - Number(a.timestamp);
    if (a.blockNumber !== b.blockNumber)
        return Number(b.blockNumber) - Number(a.blockNumber);
    return logIndexOf(b) - logIndexOf(a);
}
/**
 *  The log index inside a row's id (`${blockNumber}_${logIndex}` for every
 *  source entity here). It orders two rows of the same block, which timestamp
 *  and block number cannot. An id that does not carry one sorts first.
 */
function logIndexOf(row) {
    const parsed = Number(row.id.slice(row.id.lastIndexOf("_") + 1));
    return Number.isFinite(parsed) ? parsed : 0;
}
/**
 *  Map a `Fill` row to a `TRADE`, resolving the taker from its order.
 *
 *  The fill's own `taker` and `takerSide` are denormalized copies a bridge fills
 *  in after the fact. `taker` is written for every pool type, but `takerSide` is
 *  held back on binary until `BinaryOrderPlaced` supplies the side. The taker's
 *  ORDER carries both from the moment it exists, so it wins wherever it is
 *  present — the same precedence `fills.ts` documents on `FillRow.takerOrder`.
 */
function toTradeActivity(row) {
    return {
        id: `TRADE:${row.id}`,
        kind: "TRADE",
        market: row.market,
        pool: row.pool,
        fillPrice: row.fillPrice,
        quantity: row.quantity,
        quoteQuantity: row.quoteQuantity,
        maker: row.maker,
        makerSide: row.makerSide,
        taker: row.takerOrder?.owner ?? row.taker,
        takerSide: row.takerOrder?.side ?? row.takerSide,
        takerIsBid: row.takerIsBid,
        blockNumber: row.blockNumber,
        timestamp: row.timestamp,
        txHash: row.txHash,
    };
}
/**
 *  Map a `RouterActionRecord` to its supply row, or to nothing.
 *
 *  Returns an array so an unrecognized verb yields no row. The alternative — a
 *  cast to one of the three known kinds — would put a value the indexer never
 *  wrote into a discriminated union, and every consumer would then trust it.
 */
function toSupplyActivity(row) {
    const kind = ACTIVITY_KIND_BY_ROUTER_KIND.get(row.kind);
    if (kind === undefined)
        return [];
    return [
        {
            id: `${kind}:${row.id}`,
            kind,
            market: row.market,
            account: row.account,
            amount: row.amount,
            payout: row.payout,
            routedVia: row.routedVia,
            blockNumber: row.blockNumber,
            timestamp: row.timestamp,
            txHash: row.txHash,
        },
    ];
}
/** Map a `MarketResolutionEvent` row to a `RESOLUTION`. */
function toResolutionActivity(row) {
    return {
        id: `RESOLUTION:${row.id}`,
        kind: "RESOLUTION",
        market: row.market,
        outcome: row.kind,
        outcomeIdx: row.outcomeIdx,
        voided: row.voided,
        blockNumber: row.blockNumber,
        timestamp: row.timestamp,
        txHash: row.txHash,
    };
}
/** Map a `MarketStatusUpdate` row to a `STATUS`. */
function toStatusActivity(row) {
    return {
        id: `STATUS:${row.id}`,
        kind: "STATUS",
        market: row.market,
        oldStatus: row.oldStatus,
        newStatus: row.newStatus,
        blockNumber: row.blockNumber,
        timestamp: row.timestamp,
        txHash: row.txHash,
    };
}
/**
 *  Add the `since`/`until` window to one stream's `where` object (unix seconds).
 *  Only supplied values are added, so an omitted bound never narrows the query
 *  (SDK-IO-004).
 */
function applyActivityWindow(where, opts) {
    const ts = {};
    if (opts.since != null)
        ts._gte = opts.since;
    if (opts.until != null)
        ts._lte = opts.until;
    if (Object.keys(ts).length)
        where.timestamp = ts;
    return where;
}
// ---------------------------------------------------------------------------
// The typed document for the read above, and the wire row types derived from it.
// Hoisted here, after the functions, to keep this file's reading order. Result
// and variable types come from the committed schema snapshot.
//
// One fragment per source entity, so each mapper's parameter type IS the shape
// the query selects (`ResultOf`), rather than a second hand-written copy of it.
// Schema drift then fails to compile at the mapper instead of at runtime.
// prettier-ignore
const ActivityFillFields = graphql(`
  fragment ActivityFillFields on Fill {
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
    takerIsBid
    # The taker's ORDER, not only the denormalized copy on the fill: Fill.takerSide
    # is backfilled by the PendingTakerFill bridge and stays null on a binary row
    # until BinaryOrderPlaced lands, while the order names the side from the start.
    # Same precedence fills.ts documents on FillRow.takerOrder.
    takerOrder { owner side }
    blockNumber
    timestamp
    txHash
  }
`);
// prettier-ignore
const ActivityRouterFields = graphql(`
  fragment ActivityRouterFields on RouterActionRecord {
    id
    kind
    market: market_id
    account
    amount
    payout
    routedVia
    blockNumber
    timestamp
    txHash
  }
`);
// prettier-ignore
const ActivityResolutionFields = graphql(`
  fragment ActivityResolutionFields on MarketResolutionEvent {
    id
    kind
    market: market_id
    outcomeIdx
    voided
    blockNumber
    timestamp
    txHash
  }
`);
// prettier-ignore
const ActivityStatusFields = graphql(`
  fragment ActivityStatusFields on MarketStatusUpdate {
    id
    market: market_id
    oldStatus
    newStatus
    blockNumber
    timestamp
    txHash
  }
`);
// Four roots in one document: one request, four bounded results. Each root takes
// its own `where` and its own limit, which is what lets `kinds` exclude a stream
// server-side without a second document.
// prettier-ignore
const MarketActivityQuery = graphql(`
  query MarketActivity(
         $fillWhere: Fill_bool_exp!
         $routerWhere: RouterActionRecord_bool_exp!
         $resolutionWhere: MarketResolutionEvent_bool_exp!
         $statusWhere: MarketStatusUpdate_bool_exp!
         $fillLimit: Int!
         $routerLimit: Int!
         $resolutionLimit: Int!
         $statusLimit: Int!
       ) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Fill(where: $fillWhere, order_by: [{timestamp: desc}, {blockNumber: desc}, {logIndex: desc}], limit: $fillLimit) {
           ...ActivityFillFields
         }
         RouterActionRecord(where: $routerWhere, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $routerLimit) {
           ...ActivityRouterFields
         }
         MarketResolutionEvent(where: $resolutionWhere, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $resolutionLimit) {
           ...ActivityResolutionFields
         }
         MarketStatusUpdate(where: $statusWhere, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $statusLimit) {
           ...ActivityStatusFields
         }
       }
`);
// The transaction-scoped documents. Pass one selects the events by hash; pass two
// takes the block timestamp pass one found and uses it to keep the large tables
// (fees, orders) on an index, plus a primary-key read of the markets involved.
// prettier-ignore
const TransactionOrderFields = graphql(`
  fragment TransactionOrderFields on Order {
    id
    orderId
    market_id
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
const TransactionEventsQuery = graphql(`
  query TransactionEvents($txHash: String!, $limit: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Fill(where: {txHash: {_eq: $txHash}}, order_by: {logIndex: asc}, limit: $limit) {
           ...ActivityFillFields
         }
         RouterActionRecord(where: {txHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {
           ...ActivityRouterFields
         }
         MarketResolutionEvent(where: {txHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {
           ...ActivityResolutionFields
         }
         MarketStatusUpdate(where: {txHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {
           ...ActivityStatusFields
         }
       }
`);
// prettier-ignore
const TransactionOrderAnchorQuery = graphql(`
  query TransactionOrderAnchor($txHash: String!, $limit: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Order(where: {placedTxHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {
           ...TransactionOrderFields
           placedAtBlock
         }
       }
`);
// prettier-ignore
const TransactionContextQuery = graphql(`
  query TransactionContext($txHash: String!, $timestamp: numeric!, $marketIds: [String!]!, $limit: Int!, $orderLimit: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Order(
           where: {placedAtTimestamp: {_eq: $timestamp}, placedTxHash: {_eq: $txHash}}
           order_by: {id: asc}
           limit: $orderLimit
         ) {
           ...TransactionOrderFields
         }
         ProtocolFeeRecord(
           where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
           order_by: {id: asc}
           limit: $limit
         ) {
           ...ProtocolFeeFields
         }
         BuilderFeeRecord(
           where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
           order_by: {id: asc}
           limit: $limit
         ) {
           ...BuilderFeeFields
         }
         Market(where: {id: {_in: $marketIds}}) {
           ...MarketFields
         }
       }
`);
// prettier-ignore
const BlockOrderFields = graphql(`
  fragment BlockOrderFields on Order {
    id
    orderId
    market_id
    owner
    isBid
    side
    price
    fullQuantity
    cancelReason
    placedAtBlock
    placedTxHash
  }
`);
// The block's three trading streams in ONE round-trip.
//
// Both predicates are sent on every stream. The timestamp column is the indexed
// one — no block column in the schema carries an index — and blockNumber then
// narrows the index result rather than driving the scan. Dropping it would
// return neighbouring blocks: one second spans several blocks, so the caller
// would have to re-filter, and a `limit` could truncate a market out of the
// answer before it ever got the chance.
//
// `placed` and `touched` are separate aliases rather than an `_or`: they mean
// different things (liquidity added here vs a resting order this block consumed
// or withdrew), they barely overlap in practice, and the UI groups them apart.
// prettier-ignore
const BlockActivityQuery = graphql(`
  query BlockActivity($ts: numeric!, $blk: numeric!, $limit: Int!, $offset: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Fill(
           where: {timestamp: {_eq: $ts}, blockNumber: {_eq: $blk}}
           order_by: {logIndex: asc}
           limit: $limit
           offset: $offset
         ) {
           ...ActivityFillFields
           makerOrder_id
           takerOrder_id
         }
         placed: Order(
           where: {placedAtTimestamp: {_eq: $ts}, placedAtBlock: {_eq: $blk}}
           order_by: {id: asc}
           limit: $limit
           offset: $offset
         ) {
           ...BlockOrderFields
         }
         touched: Order(
           where: {lastUpdatedAtTimestamp: {_eq: $ts}, lastUpdatedAtBlock: {_eq: $blk}}
           order_by: {id: asc}
           limit: $limit
           offset: $offset
         ) {
           ...BlockOrderFields
         }
       }
`);
// prettier-ignore
const BlockMarketsQuery = graphql(`
  query BlockMarkets($marketIds: [String!]!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Market(where: {id: {_in: $marketIds}}) {
           ...MarketFields
         }
       }
`);
// Pass one of getLatestActiveBlock: the newest timestamp only. One row per
// stream is enough — the value, not the row, is what pass two needs.
// prettier-ignore
const LatestActiveTimestampQuery = graphql(`
  query LatestActiveTimestamp {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Fill(order_by: {timestamp: desc}, limit: 1) {
           timestamp
         }
         placed: Order(order_by: {placedAtTimestamp: desc}, limit: 1) {
           placedAtTimestamp
         }
         touched: Order(order_by: {lastUpdatedAtTimestamp: desc}, limit: 1) {
           lastUpdatedAtTimestamp
         }
       }
`);
// Pass two: EVERY row at that timestamp, so the highest block among them is
// exact rather than the highest of an arbitrary page. Unbounded on purpose and
// safely so — one second holds roughly ten blocks of one chain's activity, which
// is the bounded-set exception SDK-IO-005 names.
// prettier-ignore
const ActiveBlocksAtTimestampQuery = graphql(`
  query ActiveBlocksAtTimestamp($ts: numeric!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Fill(where: {timestamp: {_eq: $ts}}) {
           blockNumber
         }
         placed: Order(where: {placedAtTimestamp: {_eq: $ts}}) {
           placedAtBlock
         }
         touched: Order(where: {lastUpdatedAtTimestamp: {_eq: $ts}}) {
           lastUpdatedAtBlock
         }
       }
`);
// Both directions in ONE round-trip. `_lte` / `_gte` rather than strict
// comparisons because the anchor's own second holds other blocks, and those are
// usually the nearest neighbours; the fold, not the predicate, excludes the
// anchor block itself.
// prettier-ignore
const AdjacentActiveBlocksQuery = graphql(`
  query AdjacentActiveBlocks($ts: numeric!, $limit: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         prevFill: Fill(where: {timestamp: {_lte: $ts}}, order_by: {timestamp: desc}, limit: $limit) {
           blockNumber
         }
         nextFill: Fill(where: {timestamp: {_gte: $ts}}, order_by: {timestamp: asc}, limit: $limit) {
           blockNumber
         }
         prevPlaced: Order(where: {placedAtTimestamp: {_lte: $ts}}, order_by: {placedAtTimestamp: desc}, limit: $limit) {
           placedAtBlock
         }
         nextPlaced: Order(where: {placedAtTimestamp: {_gte: $ts}}, order_by: {placedAtTimestamp: asc}, limit: $limit) {
           placedAtBlock
         }
         prevTouched: Order(where: {lastUpdatedAtTimestamp: {_lte: $ts}}, order_by: {lastUpdatedAtTimestamp: desc}, limit: $limit) {
           lastUpdatedAtBlock
         }
         nextTouched: Order(where: {lastUpdatedAtTimestamp: {_gte: $ts}}, order_by: {lastUpdatedAtTimestamp: asc}, limit: $limit) {
           lastUpdatedAtBlock
         }
       }
`);
