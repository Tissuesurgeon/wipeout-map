import * as IndexerRead from "./indexerRead.js";
import type { BinaryMarketStatus, BinarySide } from "./store.js";
import type { FillOrder } from "./fills.js";
import type { BuilderFeeRecord, ProtocolFeeRecord } from "./fees.js";
import type { Market } from "./markets.js";
/**
 *  What a {@link MarketActivity} row records.
 *
 *  `TRADE` occurs on every market kind. The other five are binary-only, because
 *  complete sets, oracle resolution and the market lifecycle exist only there —
 *  a spot or perp market yields `TRADE` rows and nothing else.
 */
export type MarketActivityKind = 
/** A fill: two orders crossed. */
"TRADE"
/** Collateral became a complete set of outcome tokens. */
 | "MINT_SET"
/** A complete set of outcome tokens became collateral again. */
 | "MERGE_SET"
/** Outcome tokens were burned for their settled value. */
 | "REDEEM"
/** The oracle settled, skipped or failed the market. */
 | "RESOLUTION"
/** The market moved between lifecycle states. */
 | "STATUS";
/**
 *  The fields every {@link MarketActivity} row carries, whatever its kind.
 *
 *  Sort and page on `timestamp`. Group by `txHash` to recover the rows that one
 *  transaction produced — a taker order that also minted a set writes a `TRADE`
 *  and a `MINT_SET` under the same hash.
 */
export type MarketActivityBase = {
    /**
     *  Feed-unique row id, `${kind}:${entityId}`.
     *
     *  Prefixed because the source entities number their ids independently: a
     *  `Fill` and a `MarketStatusUpdate` in the same block and log position share
     *  an entity id. Stable across reads, so it is safe as a list key.
     */
    id: string;
    /** Kind discriminator — narrow on this. */
    kind: MarketActivityKind;
    /** The market's bytes32 marketId, lowercased. */
    market: string;
    /** Timestamp (unix seconds) of the block the row landed in. */
    timestamp: string;
    /** Block the row landed in (decimal string). */
    blockNumber: string;
    /** Transaction the row landed in. */
    txHash: string;
};
/**
 *  A trade: one fill of one resting order by one incoming order.
 *
 *  Amounts are raw units. `fillPrice` is quote units per whole base — on binary,
 *  the YES-probability scale.
 */
export type MarketTradeActivity = MarketActivityBase & {
    kind: "TRADE";
    /** Pool the fill executed on, lowercased. */
    pool: string;
    /** Execution price, raw quote units per whole base. */
    fillPrice: string;
    /** Base/outcome quantity filled, raw units. */
    quantity: string;
    /** Quote/collateral value of the fill, raw units. */
    quoteQuantity: string;
    /** Maker (resting) wallet, lowercased; null when the indexer has not joined it. */
    maker: string | null;
    /** BINARY only — the maker's YES/NO side; null on spot and perp. */
    makerSide: BinarySide | null;
    /**
     *  Taker (aggressing) wallet, lowercased; null when the indexer has not joined
     *  it yet.
     *
     *  Read from the taker's ORDER when the fill's own denormalized copy is absent.
     *  `Fill.taker` is populated only on spot, by a bridge that runs after the
     *  fill, so a binary trade names its taker through the order or not at all.
     */
    taker: string | null;
    /** BINARY only — the taker's YES/NO side; null on spot and perp. */
    takerSide: BinarySide | null;
    /**
     *  True when the taker bought the base (or YES) and the maker held the ask —
     *  the aggressor's direction. Null until the taker side is known.
     */
    takerIsBid: boolean | null;
};
/**
 *  A complete-set mint, a merge, or a redemption — collateral crossing into or
 *  out of outcome tokens.
 *
 *  BINARY only. Amounts are raw units.
 */
export type MarketSupplyActivity = MarketActivityBase & {
    kind: "MINT_SET" | "MERGE_SET" | "REDEEM";
    /** Acting wallet, lowercased. */
    account: string;
    /**
     *  `REDEEM`: outcome tokens burned. `MINT_SET` / `MERGE_SET`: the size of the
     *  complete set, meaning the amount of EACH outcome. Raw outcome-token units.
     */
    amount: string;
    /** `REDEEM` only: collateral paid out, raw units. Null on a mint or a merge. */
    payout: string | null;
    /**
     *  The periphery entry the flow used — `NativeMint`, `Permit2Mint` or
     *  `NativeRedeem`. Null on a direct call to the module.
     */
    routedVia: string | null;
};
/**
 *  The oracle acting on the market.
 *
 *  BINARY only. `outcome` is the indexer's own word for what happened, so a
 *  caller can show a market that failed to resolve as distinct from one that
 *  resolved.
 */
export type MarketResolutionActivity = MarketActivityBase & {
    kind: "RESOLUTION";
    /** `Resolved`, `Skipped` or `Failed`. */
    outcome: string;
    /**
     *  The winning outcome index (0 = YES, 1 = NO), derived from a one-hot payout
     *  vector. Null on a void, a `Skipped` and a `Failed`.
     */
    outcomeIdx: number | null;
    /** True when the market resolved void. Null when the event carried no verdict. */
    voided: boolean | null;
};
/**
 *  A lifecycle transition, such as Trading to Locked.
 *
 *  BINARY only.
 */
export type MarketStatusActivity = MarketActivityBase & {
    kind: "STATUS";
    /** Status before the transition. */
    oldStatus: BinaryMarketStatus;
    /** Status after the transition. */
    newStatus: BinaryMarketStatus;
};
/**
 *  One row of a market's activity feed. Narrow on `kind`.
 *
 *  ```ts
 *  for (const row of await client.getMarketActivity(marketId)) {
 *    if (row.kind === "TRADE") console.log(row.fillPrice, row.quantity);
 *    else if (row.kind === "RESOLUTION") console.log(row.outcome);
 *  }
 *  ```
 */
export type MarketActivity = MarketTradeActivity | MarketSupplyActivity | MarketResolutionActivity | MarketStatusActivity;
/** Options for {@link SomniaMarketsClient.getMarketActivity}. All optional. */
export type MarketActivityOptions = {
    /**
     *  Max rows to return (default 50).
     *
     *  Each source stream is asked for this many rows, and the merge keeps the
     *  newest `limit` of the union. So the result is the market's newest `limit`
     *  events, whichever kinds they are.
     */
    limit?: number;
    /**
     *  Which kinds to read (default: every kind).
     *
     *  A kind left out is excluded at the indexer, not dropped afterwards. An
     *  empty array therefore reads nothing and returns `[]`.
     */
    kinds?: readonly MarketActivityKind[];
    /** Only rows at/after this unix-seconds timestamp. */
    since?: number;
    /**
     *  Only rows at/before this unix-seconds timestamp.
     *
     *  This is the paging cursor. To read the page before the one you hold, pass
     *  the `timestamp` of its last row. There is no `offset`, because a row offset
     *  cannot page a merged feed: each stream would skip its own `offset` rows, so
     *  the second page would omit whatever the first page did not have room for.
     *
     *  KNOWN LIMIT — the cursor has one-second resolution, and the bound is
     *  inclusive, so the boundary second is re-read on the next page: expect a few
     *  duplicate ids across a page edge and de-duplicate by `id` if that matters.
     *  A second holding `limit` or more rows cannot be paged past at all, because
     *  the next request returns that same second again.
     *
     *  Tightening this needs a composite (timestamp, blockNumber, logIndex) cursor.
     *  The entity schema now carries `logIndex` on all four streams — this release
     *  adds it to the three that lacked it — so the cursor is expressible as soon
     *  as a REINDEXED deployment serves the column. It is not adopted here on
     *  purpose: ordering on a column the live Hasura does not serve is a
     *  validation error that fails the whole read, not a null, so the SDK would
     *  break against every indexer that has not caught up yet.
     */
    until?: number;
    /**
     *  The market's pool address, when the caller already knows it.
     *
     *  An optimization, and safe to omit. Trades are selected by market id either
     *  way; supplying the pool adds the predicate that lets the indexer read them
     *  through the `(pool, timestamp)` index instead of sorting the market's fills.
     *  It cannot widen the result — on binary a recycled pool's earlier markets are
     *  still excluded by the market-id predicate, and on spot and perp the pool
     *  address IS the market id.
     */
    pool?: string;
};
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
export declare function getMarketActivity(market: string, opts: MarketActivityOptions | undefined, indexerUrl: IndexerRead.Source): Promise<MarketActivity[]>;
/**
 *  One order placed in a transaction — {@link FillOrder} plus the market it was
 *  placed in, which a transaction view needs because one transaction can touch
 *  more than one market.
 */
export type TransactionOrder = FillOrder & {
    /** The market's bytes32 marketId, lowercased. */
    market: string;
};
/**
 *  Everything the protocol did in ONE transaction.
 *
 *  The transaction-scoped counterpart of {@link SomniaMarketsClient.getMarketActivity}: same event
 *  union, same row ids, but selected by transaction rather than by market. A
 *  transaction that touched nothing the indexer follows comes back with empty
 *  collections and a null `blockNumber` — that is "not a protocol transaction",
 *  not a failure.
 */
export type TransactionActivity = {
    /** The transaction hash, LOWER-CASED — not necessarily as the caller spelled it. */
    txHash: string;
    /**
     *  Block the transaction landed in; null when the indexer has nothing for this
     *  hash. Read off the events, so it is the indexer's view of the block rather
     *  than the chain's.
     */
    blockNumber: string | null;
    /** Block timestamp (unix seconds); null on the same terms as `blockNumber`. */
    timestamp: string | null;
    /**
     *  What the transaction did, in LOG ORDER — earliest first, the order the chain
     *  executed it in. The opposite of {@link SomniaMarketsClient.getMarketActivity}, which is a feed
     *  and reads newest-first.
     */
    events: MarketActivity[];
    /**
     *  Orders PLACED in this transaction. A taker order that filled immediately
     *  appears here AND as the taker of a `TRADE` event; a maker order that only
     *  rested appears here alone.
     */
    ordersPlaced: TransactionOrder[];
    /** Protocol fees charged in this transaction. BINARY only. */
    protocolFees: ProtocolFeeRecord[];
    /** Builder fees charged in this transaction. BINARY only. */
    builderFees: BuilderFeeRecord[];
    /**
     *  The markets these events touched, keyed by lowercased market id — so a
     *  caller can NAME each row without a lookup per row.
     */
    markets: Record<string, Market>;
};
/** Options for {@link SomniaMarketsClient.getTransactionActivity}. */
export type TransactionActivityOptions = {
    /** Max rows per event stream (default 100). */
    limit?: number;
    /**
     *  The transaction's block and timestamp.
     *
     *  A PERFORMANCE FIX, not a filter. Without it, a transaction that produced no
     *  event — one that only PLACED orders, common on a live book — can be found
     *  only by probing `Order.placedTxHash`, and that column carries no index:
     *  measured, the probe runs past the gateway timeout and the read fails
     *  outright. The anchor skips the probe and goes straight to the
     *  timestamp-anchored pass, which IS index-served.
     *
     *  WHAT IT DOES NOT FIX: a transaction that only CANCELLED orders stays
     *  unreadable by hash, and no anchor can change that. The indexer stores no
     *  cancellation record and `Order` carries only `placedTxHash`, so nothing in
     *  it is keyed by a cancel's own hash — the anchor turns that read from a
     *  timeout into a fast, honest "nothing indexed". Making those transactions
     *  readable needs an append-only order-update entity in the indexer.
     *
     *  Normally left unset. When no indexed event anchors the transaction, the
     *  configured owner resolves the anchor from its own transport. Pass it only
     *  when the block and timestamp are already in hand; both fields or neither,
     *  since the block names the transaction and the timestamp serves the query.
     *  When an indexed event exists, its block wins and this value is ignored.
     */
    anchor?: {
        blockNumber: bigint;
        timestamp: bigint;
    };
};
/**
 *  Places a transaction in its block from the chain: the block number and that
 *  block's timestamp, or `undefined` when the chain cannot place the hash.
 *
 *  Best-effort by contract. `undefined` sends the read to the order-table probe.
 *  A missing anchor never makes the result wrong, but that probe is not
 *  index-served and can be slow enough to fail with an `IndexerError`. The owner
 *  injects it for the same reason as {@link BlockTimestampResolver}: this module
 *  stays indexer-only.
 */
export type TransactionAnchorResolver = (txHash: string) => Promise<{
    blockNumber: bigint;
    timestamp: bigint;
} | undefined>;
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
export declare function getTransactionActivity(txHash: string, resolveAnchor: TransactionAnchorResolver, opts: TransactionActivityOptions | undefined, indexerUrl: IndexerRead.Source): Promise<TransactionActivity>;
/**
 *  Reads a block's timestamp from the chain.
 *
 *  The block-scoped reads need an anchor the indexer can serve from — no block
 *  column is indexed — and the block's own timestamp is it. This module stays
 *  indexer-only, so the owner injects the one chain read it needs rather than
 *  the module reaching for a transport of its own.
 */
export type BlockTimestampResolver = (blockNumber: bigint) => Promise<bigint>;
/**
 *  How a resting order was touched IN the block being viewed.
 *
 *  DERIVED from the block's own fills, never read off `Order.status`: status is
 *  the row's CURRENT value, so an order placed in this block and cancelled three
 *  blocks later reads `Cancelled` here — a state from this block's future. See
 *  {@link BlockOrder}.
 *
 *  - `FILLED`  — the order is a maker or taker of a fill in this block.
 *  - `REMOVED` — it is not, so this block cancelled or amended it.
 */
export type BlockOrderTouch = "FILLED" | "REMOVED";
/**
 *  An order event that happened in one block.
 *
 *  Deliberately carries NO `status`, `filledQuantity` or `quantityRemaining`.
 *  `Order` is a mutable row — those three columns are as-of-now, not as-of-this
 *  block — so the query does not select them and this type cannot leak them into
 *  a historical view. The block's own traded quantity comes from `fills`.
 */
export type BlockOrder = {
    /** Indexer row id. */
    id: string;
    /** On-chain order id (decimal string). */
    orderId: string;
    /** Lowercased market id. */
    market: string;
    /** Order owner. */
    owner: string;
    isBid: boolean;
    side: BinarySide | null;
    /** Raw quote units per whole base. */
    price: string;
    /** Raw base units the order was placed for. */
    fullQuantity: string;
    /**
     *  Block the order was PLACED in. Equal to the viewed block for a `placed` row;
     *  earlier than it for most `touched` rows, since a resting order is usually
     *  quoted in one block and removed in another.
     */
    placedAtBlock: bigint;
    /** Transaction that placed the order. */
    placedTxHash: string;
    /**
     *  Why the protocol removed the order, when the protocol (not the owner) did.
     *  Null for an owner cancel and for an order that was never cancelled — so a
     *  null here does NOT mean "still open".
     */
    cancelReason: string | null;
    /** Set on `touched` rows only; null on `placed` rows. */
    touch: BlockOrderTouch | null;
};
/** One market's slice of a block. */
export type BlockMarketActivity = {
    /** Lowercased market id. */
    market: string;
    /** Trades matched on this market in this block, in log order. */
    fills: MarketTradeActivity[];
    /** Orders placed on this market in this block. */
    placed: BlockOrder[];
    /** Resting orders this block filled or removed. */
    touched: BlockOrder[];
};
/**
 *  Everything the protocol traded in one block, grouped by market.
 */
export type BlockActivity = {
    /** The block, as the caller asked for it. */
    blockNumber: bigint;
    /** The block timestamp the reads were anchored on (unix seconds). */
    timestamp: bigint;
    /**
     *  The markets this block touched, in descending order of activity. EMPTY is
     *  the normal case: most blocks contain no markets activity at all.
     */
    markets: BlockMarketActivity[];
    /**
     *  Market rows for every id in `markets`, keyed by lowercased id — so a caller
     *  can NAME each group without a lookup per group.
     */
    marketsById: Record<string, Market>;
    /**
     *  True when a stream came back exactly `limit` rows and the block may hold
     *  more.
     *
     *  A block's activity is not a bounded set — a busy block can outrun any page
     *  — so the cap is reported rather than hidden. Page with `offset` while this
     *  is true; see {@link BlockActivityOptions}.
     */
    truncated: boolean;
};
export type BlockActivityOptions = {
    /** Max rows per stream (default 500). */
    limit?: number;
    /**
     *  Rows to skip per stream (default 0).
     *
     *  Paging is PER STREAM, not over the grouped result: the three streams are
     *  independent reads and a page of one does not line up with a page of
     *  another. Use it to walk a block that reports `truncated`.
     */
    offset?: number;
};
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
export declare function getBlockActivity(blockNumber: bigint, resolveBlockTimestamp: BlockTimestampResolver, opts: BlockActivityOptions | undefined, indexerUrl: IndexerRead.Source): Promise<BlockActivity>;
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
export declare function getLatestActiveBlock(indexerUrl: IndexerRead.Source): Promise<{
    blockNumber: bigint;
    timestamp: bigint;
} | null>;
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
export declare function getAdjacentActiveBlocks(blockNumber: bigint, resolveBlockTimestamp: BlockTimestampResolver, opts: BlockActivityOptions | undefined, indexerUrl: IndexerRead.Source): Promise<{
    prev: bigint | null;
    next: bigint | null;
}>;
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
export declare function byNewestFirst(a: MarketActivity, b: MarketActivity): number;
