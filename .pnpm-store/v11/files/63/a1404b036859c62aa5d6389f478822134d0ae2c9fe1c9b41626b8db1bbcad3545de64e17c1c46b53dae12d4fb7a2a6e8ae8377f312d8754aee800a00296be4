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

import { type ResultOf } from "@graphql-typed-document-node/core";
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
import type { BinaryMarketStatus, BinarySide } from "./store.js";
import type { FillOrder } from "./fills.js";
import type { BuilderFeeRecord, ProtocolFeeRecord } from "./fees.js";
import type { Market } from "./markets.js";
import * as Markets from "./markets.js";

/**
 *  What a {@link MarketActivity} row records.
 *
 *  `TRADE` occurs on every market kind. The other five are binary-only, because
 *  complete sets, oracle resolution and the market lifecycle exist only there —
 *  a spot or perp market yields `TRADE` rows and nothing else.
 */
export type MarketActivityKind =
  /** A fill: two orders crossed. */
  | "TRADE"
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
export type MarketActivity =
  | MarketTradeActivity
  | MarketSupplyActivity
  | MarketResolutionActivity
  | MarketStatusActivity;

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
export async function getMarketActivity(
  market: string,
  opts: MarketActivityOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<MarketActivity[]> {
  const marketId = market.toLowerCase();
  const limit = opts.limit ?? 50;
  const kinds = new Set<MarketActivityKind>(opts.kinds ?? ALL_ACTIVITY_KINDS);
  const routerKinds = ROUTER_KIND_BY_ACTIVITY_KIND.filter(([activityKind]) => kinds.has(activityKind)).map(
    ([, routerKind]) => routerKind,
  );

  // A stream the caller did not ask for is limited to zero rows rather than
  // dropped from the document. That keeps ONE static, fully typed query for
  // every combination of `kinds`, and keeps the exclusion at the indexer, where
  // `LIMIT 0` costs nothing.
  const fillWhere: Record<string, unknown> = { market_id: { _eq: marketId } };
  if (opts.pool != null) fillWhere.pool = { _eq: opts.pool.toLowerCase() };
  const routerWhere: Record<string, unknown> = { market_id: { _eq: marketId } };
  if (routerKinds.length) routerWhere.kind = { _in: routerKinds };
  const resolutionWhere: Record<string, unknown> = { market_id: { _eq: marketId } };
  const statusWhere: Record<string, unknown> = { market_id: { _eq: marketId } };
  for (const where of [fillWhere, routerWhere, resolutionWhere, statusWhere]) {
    applyActivityWindow(where, opts);
  }

  const data = await IndexerRead.gqlRequest(
    MarketActivityQuery,
    {
      fillWhere,
      routerWhere,
      resolutionWhere,
      statusWhere,
      fillLimit: kinds.has("TRADE") ? limit : 0,
      routerLimit: routerKinds.length ? limit : 0,
      resolutionLimit: kinds.has("RESOLUTION") ? limit : 0,
      statusLimit: kinds.has("STATUS") ? limit : 0,
    },
    indexerUrl,
  );

  const rows: MarketActivity[] = [
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
  anchor?: { blockNumber: bigint; timestamp: bigint };
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
export type TransactionAnchorResolver = (
  txHash: string,
) => Promise<{ blockNumber: bigint; timestamp: bigint } | undefined>;

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
export async function getTransactionActivity(
  txHash: string,
  resolveAnchor: TransactionAnchorResolver,
  opts: TransactionActivityOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<TransactionActivity> {
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

  const events: MarketActivity[] = [
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
  const restingOrders =
    anchor === undefined && hint === null
      ? ((await IndexerRead.gqlRequest(TransactionOrderAnchorQuery, { txHash: hash, limit }, indexerUrl)).Order ?? [])
      : [];

  const anchorTimestamp =
    anchor?.timestamp ?? restingOrders[0]?.placedAtTimestamp ?? (hint === null ? null : String(hint.timestamp));
  const anchorBlock =
    anchor?.blockNumber ?? restingOrders[0]?.placedAtBlock ?? (hint === null ? null : String(hint.blockNumber));
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
  const rest = await IndexerRead.gqlRequest(
    TransactionContextQuery,
    // `orderLimit: 0` when the anchor probe already returned the orders: that
    // path ran the same `placedTxHash` predicate, which is not index-served, so
    // repeating it here would scan twice for one answer.
    { txHash: hash, timestamp: anchorTimestamp, marketIds, limit, orderLimit: restingOrders.length > 0 ? 0 : limit },
    indexerUrl,
  );

  const markets: Record<string, Market> = {};
  for (const row of Markets.toMarkets(rest.Market)) markets[row.id] = row;

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
    for (const row of Markets.toMarkets(extra.Market)) markets[row.id] = row;
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
export async function getBlockActivity(
  blockNumber: bigint,
  resolveBlockTimestamp: BlockTimestampResolver,
  opts: BlockActivityOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<BlockActivity> {
  const limit = opts.limit ?? 500;
  const offset = opts.offset ?? 0;
  const timestamp = await resolveBlockTimestamp(blockNumber);

  const found = await IndexerRead.gqlRequest(
    BlockActivityQuery,
    { blk: String(blockNumber), ts: String(timestamp), limit, offset },
    indexerUrl,
  );

  // Any stream hitting the cap means the block may hold more than this page.
  const truncated = found.Fill.length === limit || found.placed.length === limit || found.touched.length === limit;

  const fills = found.Fill.map(toTradeActivity);

  // Which orders this block FILLED, from the block's own fills — the only
  // as-of-this-block source. Everything else in `touched` was removed.
  const filledOrderIds = new Set<string>();
  for (const row of found.Fill) {
    if (row.makerOrder_id !== null) filledOrderIds.add(row.makerOrder_id);
    if (row.takerOrder_id !== null) filledOrderIds.add(row.takerOrder_id);
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
  const marketsById: Record<string, Market> = {};
  for (const row of Markets.toMarkets(hydrated.Market)) marketsById[row.id] = row;

  const markets: BlockMarketActivity[] = marketIds
    .map((market) => ({
      market,
      fills: fills.filter((f) => f.market === market),
      placed: placed.filter((o) => o.market === market),
      touched: touched.filter((o) => o.market === market),
    }))
    // Busiest market first: a block's headline is where it traded, and trades
    // are rarer than quote churn, so fills outrank order count.
    .sort(
      (a, b) =>
        b.fills.length - a.fills.length || b.placed.length + b.touched.length - (a.placed.length + a.touched.length),
    );

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
export async function getLatestActiveBlock(
  indexerUrl: IndexerRead.Source,
): Promise<{ blockNumber: bigint; timestamp: bigint } | null> {
  const newest = await IndexerRead.gqlRequest(LatestActiveTimestampQuery, {}, indexerUrl);

  let newestTs: bigint | null = null;
  const considerTs = (raw: string) => {
    const v = BigInt(raw);
    if (newestTs === null || v > newestTs) newestTs = v;
  };
  for (const r of newest.Fill) considerTs(r.timestamp);
  for (const r of newest.placed) considerTs(r.placedAtTimestamp);
  for (const r of newest.touched) considerTs(r.lastUpdatedAtTimestamp);
  if (newestTs === null) return null;

  const timestamp: bigint = newestTs;
  const at = await IndexerRead.gqlRequest(ActiveBlocksAtTimestampQuery, { ts: String(timestamp) }, indexerUrl);

  let highest: bigint | null = null;
  const considerBlock = (raw: string) => {
    const v = BigInt(raw);
    if (highest === null || v > highest) highest = v;
  };
  for (const r of at.Fill) considerBlock(r.blockNumber);
  for (const r of at.placed) considerBlock(r.placedAtBlock);
  for (const r of at.touched) considerBlock(r.lastUpdatedAtBlock);
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
export async function getAdjacentActiveBlocks(
  blockNumber: bigint,
  resolveBlockTimestamp: BlockTimestampResolver,
  opts: BlockActivityOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<{ prev: bigint | null; next: bigint | null }> {
  const limit = opts.limit ?? 400;
  const here = blockNumber;
  const timestamp = await resolveBlockTimestamp(blockNumber);

  const found = await IndexerRead.gqlRequest(AdjacentActiveBlocksQuery, { ts: String(timestamp), limit }, indexerUrl);

  let prev: bigint | null = null;
  let next: bigint | null = null;
  const consider = (raw: string) => {
    const b = BigInt(raw);
    if (b < here) {
      if (prev === null || b > prev) prev = b;
    } else if (b > here) {
      if (next === null || b < next) next = b;
    }
  };

  for (const r of found.prevFill) consider(r.blockNumber);
  for (const r of found.nextFill) consider(r.blockNumber);
  for (const r of found.prevPlaced) consider(r.placedAtBlock);
  for (const r of found.nextPlaced) consider(r.placedAtBlock);
  for (const r of found.prevTouched) consider(r.lastUpdatedAtBlock);
  for (const r of found.nextTouched) consider(r.lastUpdatedAtBlock);

  return { prev, next };
}

/** Map an order row touched in the block to the public {@link BlockOrder}. */
function toBlockOrder(o: ResultOf<typeof BlockOrderFields>, touch: BlockOrderTouch | null): BlockOrder {
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
function toTransactionOrder(o: ResultOf<typeof TransactionOrderFields>): TransactionOrder {
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
function byLogOrder(a: MarketActivity, b: MarketActivity): number {
  if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber) - Number(b.blockNumber);
  return logIndexOf(a) - logIndexOf(b);
}

/** Every kind {@link SomniaMarketsClient.getMarketActivity} reads when `kinds` is omitted. */
const ALL_ACTIVITY_KINDS: readonly MarketActivityKind[] = [
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
const ROUTER_KIND_BY_ACTIVITY_KIND: readonly (readonly [MarketActivityKind, string])[] = [
  ["MINT_SET", "MintCompleteSet"],
  ["MERGE_SET", "MergeCompleteSet"],
  ["REDEEM", "Redeem"],
];

/** Inverse of {@link ROUTER_KIND_BY_ACTIVITY_KIND}, for mapping a row back. */
const ACTIVITY_KIND_BY_ROUTER_KIND = new Map<string, MarketSupplyActivity["kind"]>([
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
export function byNewestFirst(a: MarketActivity, b: MarketActivity): number {
  if (a.timestamp !== b.timestamp) return Number(b.timestamp) - Number(a.timestamp);
  if (a.blockNumber !== b.blockNumber) return Number(b.blockNumber) - Number(a.blockNumber);
  return logIndexOf(b) - logIndexOf(a);
}

/**
 *  The log index inside a row's id (`${blockNumber}_${logIndex}` for every
 *  source entity here). It orders two rows of the same block, which timestamp
 *  and block number cannot. An id that does not carry one sorts first.
 */
function logIndexOf(row: MarketActivity): number {
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
function toTradeActivity(row: TradeRowWire): MarketTradeActivity {
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
function toSupplyActivity(row: SupplyRowWire): MarketSupplyActivity[] {
  const kind = ACTIVITY_KIND_BY_ROUTER_KIND.get(row.kind);
  if (kind === undefined) return [];
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
function toResolutionActivity(row: ResolutionRowWire): MarketResolutionActivity {
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
function toStatusActivity(row: StatusRowWire): MarketStatusActivity {
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
function applyActivityWindow(where: Record<string, unknown>, opts: MarketActivityOptions): Record<string, unknown> {
  const ts: Record<string, number> = {};
  if (opts.since != null) ts._gte = opts.since;
  if (opts.until != null) ts._lte = opts.until;
  if (Object.keys(ts).length) where.timestamp = ts;
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

/** The `Fill` shape {@link toTradeActivity} maps, as the query selects it. */
type TradeRowWire = ResultOf<typeof ActivityFillFields>;
/** The `RouterActionRecord` shape {@link toSupplyActivity} maps. */
type SupplyRowWire = ResultOf<typeof ActivityRouterFields>;
/** The `MarketResolutionEvent` shape {@link toResolutionActivity} maps. */
type ResolutionRowWire = ResultOf<typeof ActivityResolutionFields>;
/** The `MarketStatusUpdate` shape {@link toStatusActivity} maps. */
type StatusRowWire = ResultOf<typeof ActivityStatusFields>;

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
