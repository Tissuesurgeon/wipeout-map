import type { Address, PublicClient } from "viem";
import * as IndexerRead from "./indexerRead.js";
import type { BookLevel, BinarySide, OrderStatus } from "./store.js";
import type { MarketType } from "./markets.js";
import * as Writer from "./writer.js";
import type { Writer as WriterCtx } from "./writer.js";
import type * as Fills from "./fills.js";
import type { AmendOrderParams, AmendOrderResult, AmendOrdersParams, AmendOrdersResult, CancelExpiredOrdersParams, CaptureCloseParams, CancelOrderParams, CancelAllOrdersOptions, CancelAllOrdersResult, CancelOrdersParams, CancelOrdersResult, LiveOwnOrders, PlaceOrderParams, PlaceOrderResult, PlacePerpOrderParams, PlaceSpotOrderParams, PlaceSpotOrdersParams, PlaceSpotOrdersResult, ReduceOrderParams, ReduceOrdersParams, SweepExpiredAtLevelParams, TxResult } from "./trade.js";
/**
 *  The market context carried on every order row — enough to LABEL the row
 *  (asset, question, expiry, decimals) without a second read. For the full
 *  market pass the row's `market` id to
 *  {@link SomniaMarketsClient.getMarket | client.getMarket}.
 *
 *  The binary-only fields are null on SPOT and PERP, which is how the indexer
 *  stores them — an order read is not scoped by market kind, so a caller sees
 *  rows of every kind mixed together.
 *
 * @category orders
 */
export type OrderMarket = {
    /** The BinaryMarket clone contract's address (lowercased); null on SPOT/PERP. */
    marketAddress: string | null;
    /** Underlying asset symbol (e.g. "BTC"); null on SPOT/PERP. */
    asset: string | null;
    /** Display question text; null on SPOT/PERP. */
    question: string | null;
    /** Timestamp (unix seconds) trading ends; null on SPOT/PERP. */
    expiry: string | null;
    /** Timestamp (unix seconds) trading opened; null on SPOT/PERP. */
    tradingStart: string | null;
    /**
     *  Collateral decimals (per-market — e.g. 6dp TestUSDC vs 18dp USDso). Format
     *  this row's `price` and quantities with it, never a hard-coded 6.
     */
    quoteDecimals: number;
    /** Series cadence in seconds, as the indexer derived it; null on SPOT/PERP and on legacy rows. */
    intervalSec: string | null;
    /**
     *  Compact cadence label ("15m" / "1h" / "4h" / "24h") — DERIVED by the SDK
     *  from {@link OrderMarket.intervalSec}, matching `PortfolioMarket.interval`.
     *  Null when unknown.
     */
    interval: string | null;
};
/**
 *  A currently-open resting order (subset of the indexer `Order` entity), as
 *  returned by {@link SomniaMarketsClient.getOpenOrders}. {@link OrderRow} extends it with the
 *  lifecycle/fill-progress fields for order history.
 *
 * @category orders
 */
export type OpenOrder = {
    /** Order id (`${pool}_${orderId}`). */
    id: string;
    /** uint128 OrderId as a decimal string (pass to trader.cancelOrder). */
    orderId: string;
    /**
     *  The market's bytes32 marketId — the STABLE identity of the market this
     *  order belonged to, and the key to label a historical row by.
     *
     *  Use this, never `pool` alone: a binary pool is recycled across successive
     *  markets, so the same `pool` names a different market depending on when the
     *  order was placed. On SPOT/PERP the pool address IS the market id, so the
     *  two agree there. Pass it straight to
     *  {@link SomniaMarketsClient.getMarket | client.getMarket} for the full row.
     */
    market: string;
    /**
     *  The market's labelling context, so a row can be NAMED without a second
     *  query. Null only if the indexer has no market row for the order.
     */
    marketInfo: OrderMarket | null;
    /**
     *  Lower-cased pool address the order rests on. A TIME-VARYING binding — see
     *  `market` for the identity that does not move.
     */
    pool: string;
    /**
     *  BINARY YES/NO classification; NULL on spot orders (the indexer only sets it
     *  for binary). For a buy/sell distinction that works on BOTH kinds use `isBid`.
     */
    side: BinarySide | null;
    /**
     *  True = bid (buy), false = ask (sell). The canonical buy/sell flag — set for
     *  spot AND binary, unlike `side` which is null on spot. Colour/label off this.
     */
    isBid: boolean;
    /** Limit price, raw quote units per whole base (binary: YES-probability scale). */
    price: string;
    /** Unfilled remainder, raw base/outcome units. */
    quantityRemaining: string;
    /**
     *  The opaque uint64 tag the PLACEMENT carried, as a decimal string; `"0"`
     *  when the placement set none. The protocol stores it and never reads it, so
     *  its meaning is the caller's — it is how a client correlates a returned row
     *  with the order it sent, without keeping its own map from order ids.
     *
     *  A decimal string rather than a number: the full uint64 range does not fit a
     *  JavaScript number. Filter on it with {@link OrdersOptions.userData}.
     */
    userData: string;
};
/**
 *  An owner's currently-OPEN binary orders (optionally scoped to one pool). Used
 *  by the market maker to cancel + re-quote.
 */
/**
 * Options for {@link SomniaMarketsClient.getOpenOrders} / {@link SomniaMarketsClient.getOrders}. All optional.
 *
 * @category orders
 */
export type OrdersOptions = {
    /** Restrict to one pool. */
    pool?: string;
    /**
     *  Restrict to orders on ANY of these pools (case-insensitive) — the batched
     *  form of `pool`, for folding several venues into one read. An empty array
     *  matches nothing. Supplying `pool` as well narrows to both (the
     *  intersection), so neither silently overrides the other. The list accepts
     *  at most 100 entries. A longer list rejects with {@link InvalidInputError}.
     *
     *  Each pool is resolved to its market scope, so a recycled BINARY pool still
     *  selects every market life of that pool, exactly as `pool` does.
     */
    pools?: readonly string[];
    /**
     *  Restrict to orders in one market (bytes32 marketId, case-insensitive).
     *
     *  Prefer this over `pool` on binary, where one pool hosts successive markets:
     *  a market id names exactly one of them.
     */
    market?: string;
    /**
     *  Restrict to orders in ANY of these markets (bytes32 marketIds,
     *  case-insensitive) — the batched form of `market`. Same empty-array and
     *  intersection rules as `pools`. The list accepts at most 100 entries. A
     *  longer list rejects with {@link InvalidInputError}.
     */
    markets?: readonly string[];
    /** Order status. {@link SomniaMarketsClient.getOrders} only — {@link SomniaMarketsClient.getOpenOrders} is always "Open". */
    status?: OrderStatus;
    /** Restrict to one side. */
    side?: OpenOrder["side"];
    /**
     *  Restrict to orders placed with this client order id — the uint64 tag the
     *  placement carried (see {@link OpenOrder.userData}). Pass a `bigint`, or a
     *  decimal string when the value came from a row and never needs arithmetic.
     *
     *  The column is not indexed, so this filter is a scan on a large `Order`
     *  table. Narrow it with `pool`/`pools` and a status where the caller can.
     */
    userData?: bigint | string;
    /**
     *  Restrict to orders PLACED at or after this block (`Order.placedAtBlock`).
     *
     *  It selects orders by their placement block only. It does NOT select a later
     *  fill, reduction or cancellation of an older order: the entity has no
     *  last-mutation block column, so this is not an account order-change stream.
     *  An amend places a replacement under a new id, which this filter can select
     *  by that replacement's placement block. For an order placed before the
     *  bound, a fill read recovers only executions. Reconcile the known order's
     *  indexed lifecycle with `getOrder(pool, orderId)`, or use
     *  `getOrderOnchain(pool, orderId)` when only current active state is needed.
     *
     *  The column is not indexed, so bound it with `pool`/`pools` where the caller
     *  can. Accepts the `bigint` a transaction receipt carries.
     */
    sinceBlock?: number | bigint;
    /** Max rows. */
    limit?: number;
    /** Row offset (default 0). */
    offset?: number;
};
/**
 *  A working (`status = "Open"`) order for `owner`, newest first. Pass
 *  {@link OrdersOptions} to scope by pool/side and page. For non-open history use
 *  {@link SomniaMarketsClient.getOrders}.
 */
export declare function getOpenOrders(owner: string, opts: Omit<OrdersOptions, "status"> | undefined, indexerUrl: IndexerRead.Source): Promise<OpenOrder[]>;
/**
 * An order row with its lifecycle status + fill progress (from {@link SomniaMarketsClient.getOrders}).
 *
 * @category orders
 */
export type OrderRow = OpenOrder & {
    /** Reconciled lifecycle status (Open/Filled/Cancelled/Expired/Closed). */
    status: OrderStatus;
    /** Original order size, raw base/outcome units. */
    fullQuantity: string;
    /** Cumulative filled quantity, raw base/outcome units. */
    filledQuantity: string;
    /** Whether the order ever rested on the book (an `OrderRested` fired). */
    rested: boolean;
    /**
     *  Order expiry as a uint64 nanosecond timestamp (decimal string). There is no GTC
     *  sentinel — the contract treats any future expiry as live, and this SDK writes GTC
     *  as now + 50 years (`farFutureNs`). The matcher rejects a 0/past expiry at
     *  placement, so "0" is never a live value.
     */
    expireTimestampNs: string;
    /** Tx hash the order was placed in. */
    placedTxHash: string;
    /** Timestamp (unix seconds) the order was placed. */
    placedAtTimestamp: string;
    /**
     *  WHY the order was cancelled, when the PROTOCOL removed it rather than the owner.
     *  Null for an owner cancel and for orders that were never cancelled — so a
     *  `Cancelled` status with a null reason means the owner did it.
     *
     *    SelfMatch        same-owner match (the CancelMaker path)
     *    ExceedsPosition  perps guard: the fill would push the maker past maxPositionSize
     *    NegativeEquity   perps guard: the maker's equity would go negative
     *    StaleMark        perps guard: the mark feed became unreadable, so an OPENING maker
     *                     was pulled rather than filled against a dead reference price. A
     *                     purely reducing maker is unaffected and still fills.
     *    PreFill          the base pre-fill guard fired with no more specific tag
     *
     *  `SelfMatch` is set on every pool type (spot, perp, binary); the perps-specific
     *  guards are perp-only by construction. On spot it also covers the pre-upgrade
     *  removals the indexer reconstructs for blocks before the pool emitted
     *  `OrderCancelledSelfMatch` (DEX-1236) — reconstructed and reported removals are
     *  deliberately indistinguishable here.
     */
    cancelReason: string | null;
    /**
     *  Amendment linkage: the order this one REPLACED, and the one that replaced it. Lets
     *  an amend chain be followed rather than read as unrelated place/cancel pairs. Both
     *  null on an order that was never amended.
     */
    amendedFromOrderId: string | null;
    amendedToOrderId: string | null;
};
/**
 *  {@link OrderRow} plus placement attribution and the market it lives on —
 *  what {@link SomniaMarketsClient.getOrder} returns for an order detail view.
 */
export type OrderDetail = OrderRow & {
    /** Wallet that owns the order, lowercased. */
    owner: string;
    /** Block the order was placed in (decimal string). */
    placedAtBlock: string;
    /** Timestamp (unix seconds) of the last indexed mutation to this order. */
    lastUpdatedAtTimestamp: string;
    /**
     *  The market the order's pool serves.
     *
     *  Named `marketRef` because main's `OpenOrder.market` is the bytes32 marketId
     *  string — see the note on {@link Fills.FillDetail}.
     */
    marketRef: Fills.MarketRef;
};
/**
 *  `owner`'s orders across ALL statuses (Open/Filled/Cancelled/Expired/Closed),
 *  newest first — the order-history counterpart to {@link SomniaMarketsClient.getOpenOrders}. Filter
 *  by `status`/`side`/`pool` via {@link OrdersOptions}.
 */
export declare function getOrders(owner: string, opts: OrdersOptions | undefined, indexerUrl: IndexerRead.Source): Promise<OrderRow[]>;
/**
 *  One order by `(pool, orderId)` — the indexer's view of a single order,
 *  including who placed it and its full lifecycle attribution. Order ids are
 *  never reused (monotonic low-64 counter per pool), so this pair names exactly
 *  one order forever. Null when not indexed (a just-placed order can lag; for
 *  chain-head truth use {@link SomniaMarketsClient.getOrderOnchain}).
 */
export declare function getOrder(pool: string, orderId: bigint | string, indexerUrl: IndexerRead.Source): Promise<OrderDetail | null>;
/**
 *  Server-side COUNT of `owner`'s orders matching an {@link OrdersOptions}
 *  filter (Hasura `Order_aggregate`) — so an order-history page paginates
 *  against a real total without fetching every row. Privileged `_aggregate`
 *  role (server-only), with the bounded row-count fallback on the public role.
 *
 *  WITHOUT THAT HEADER THE TOTAL IS A LOWER BOUND. The fallback scan stops at
 *  {@link IndexerRead.COUNT_FALLBACK_CAP} rows and reports the cap, and `Order`
 *  is far past it in production. No bounded variant of this helper exists yet;
 *  `countMarketsBounded` on the client is the pattern to copy.
 */
export declare function countOrders(owner: string, opts: OrdersOptions | undefined, indexerUrl: IndexerRead.Source, headers?: Record<string, string>): Promise<number>;
/**
 *  Top of one market's resting book — ANY market kind.
 *
 *  Prices are RAW and in that market's own terms: quote units per whole base on
 *  SPOT and PERP, YES probability on BINARY (there, the same scale as
 *  `BinaryMarket.lastPrice`). Comparable within a market, never across kinds or
 *  against another market's quote asset.
 *
 *  `mid` is (bestBid + bestAsk) / 2, null unless BOTH sides rest — a one-sided
 *  book has no meaningful mid.
 *
 * @category orders
 */
export type BookTop = {
    /** Best (highest) resting bid price (raw); null when no bid rests. */
    bestBid: string | null;
    /** Best (lowest) resting ask price (raw); null when no ask rests. */
    bestAsk: string | null;
    /** (bestBid + bestAsk) / 2, floored (raw); null unless BOTH sides rest. */
    mid: string | null;
};
/**
 *  Batch-fetch the top of book (best resting bid/ask + mid) for many markets in
 *  ONE round-trip — for list views that want a book-derived price without an
 *  N+1 per-pool fan-out (an implied probability, on BINARY). Returns a map of lowercased marketId →
 *  {@link BookTop}; markets with an empty book are simply absent.
 *
 *  EVERY MARKET KIND, not only BINARY — a guarantee, not an accident of the
 *  current query. The filter is `market_id` on `Order`, which is stamped at
 *  placement for SPOT and PERP alike, so a 20-byte pool address and a 32-byte
 *  binary id are both valid here and may be mixed in one call.
 *
 *  See {@link BookTop} for the price contract — raw, and in each market's own
 *  terms, which differ by kind.
 *
 *  Orders are stamped with `market_id` at placement, so keying on the market is
 *  recycle-safe (a reused pool's prior-market orders never bleed in). On-chain
 *  expiry is LAZY (an expired maker keeps resting with no OrderExpired event),
 *  so this mirrors `getBookLevels`' `now > expiry` skip in the where clause.
 */
export declare function getBookTops(marketIds: string[], indexerUrl: IndexerRead.Source): Promise<Record<string, BookTop>>;
/**
 * Options for one chain-sourced top-of-book batch read.
 *
 * @category orders
 */
export interface GetBookTopsOnchainOptions {
    /**
     *  Read at this exact block instead of pinning the current head. Every pool in
     *  the call quotes the SAME block either way — that pin, not the batching, is
     *  what makes the tops of N markets comparable to each other.
     */
    blockNumber?: bigint;
}
/**
 * Chain-sourced top of book for many markets, all read at ONE block.
 *
 * @category orders
 */
export interface BookTopsOnchain {
    /** The block every top below was read at. */
    blockNumber: bigint;
    /** Lowercased marketId → {@link BookTop}; empty-book markets are absent. */
    tops: Record<string, BookTop>;
}
/**
 *  Top of book for many markets, read from POOL STATE at one pinned block.
 *
 *  **When to use**
 *
 *  Use for a list view whose quotes must not lag: a board, a market selector, a
 *  mark for open positions. The indexed counterpart {@link getBookTops} answers
 *  in one round-trip and carries no chain dependency, but its rows are as fresh
 *  as the indexer. This reads the pools themselves, so a quote is current as of
 *  the block it names.
 *
 *  **Details**
 *
 *  Prices and `mid` follow {@link BookTop} exactly — raw, in each market's own
 *  terms, and `mid` floored. A market whose book is empty on both sides is
 *  ABSENT from `tops`, the same contract the indexed read documents, so the two
 *  are comparable key for key.
 *
 *  The block is pinned ONCE before any read, so every market's top is quoted at
 *  the same height and the set is internally consistent. Where the chain declares
 *  a Multicall3 the reads collapse into one aggregate call; elsewhere they fan
 *  out. Only "this chain has no usable Multicall3 here" falls back — a revert or
 *  a dead RPC still throws.
 *
 *  **Gotchas**
 *
 *  Cost is 2 reads per market on the fan-out path (one per side), so this is
 *  bounded by the caller's market count, not by the SDK. Keep the set to what a
 *  view actually shows; the indexed {@link getBookTops} stays the cheaper read
 *  for an unbounded list.
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
 * @throws {@link RpcError} If the node returns fewer reads than were requested.
 */
export declare function getBookTopsOnchain(markets: {
    id: string;
    poolAddress: Address;
}[], client: PublicClient, opts?: GetBookTopsOnchainOptions): Promise<BookTopsOnchain>;
/**
 *  Both books for a market, 4-sided. NO levels are the YES book inverted into
 *  NO terms (price = 1 − yesPrice), matching BinaryPool's pricing.
 *
 * @category orders
 */
export interface BinaryOrderBook {
    /** Pinned chain block or scope applied-event watermark; absent without provenance. */
    blockNumber?: bigint;
    /**
     *  Resting YES bids, best (highest price) first — raw collateral units per whole
     *  outcome token.
     */
    yesBids: BookLevel[];
    /** Resting YES asks, best (lowest price) first. */
    yesAsks: BookLevel[];
    /** NO bids derived from the YES asks (price = 1 − yesPrice), best (highest) first. */
    noBids: BookLevel[];
    /** NO asks derived from the YES bids (price = 1 − yesPrice), best (lowest) first. */
    noAsks: BookLevel[];
}
/**
 *  Expand a YES-terms book into the 4-sided binary shape: NO bids come from YES
 *  asks inverted (price = 1 − yesPrice) and vice-versa; quantities carry over.
 *  Shared by the on-chain read and the live-store book.
 */
export declare function toBinaryBook(yesBids: BookLevel[], yesAsks: BookLevel[], oneBase: bigint): BinaryOrderBook;
/**
 * A binary pool's order-book increments, as the pool reports them.
 *
 * @category orders
 */
export interface BinaryBookParams {
    /** Price increment, raw collateral units per whole outcome token. */
    tickSize: bigint;
    /** Minimum order quantity, raw outcome-token units. */
    minQuantity: bigint;
    /** Quantity increment, raw outcome-token units. */
    lotSize: bigint;
}
/**
 *  The pool's tick / lot / minimum-quantity increments. Chain read.
 *
 *  **When to use**
 *
 *  Use to round a price or quantity to something the book will accept before
 *  placing an order — the pool rejects an order that is off-tick or below the
 *  minimum. `Units.snapRawToGrid` does the rounding in raw units, and
 *  `Units.roundPriceToTick` adds the guard a price needs: a sub-tick price
 *  floored to `0` is the one value the pool always rejects.
 */
export declare function getBinaryBookParams(pool: Address, client: PublicClient): Promise<BinaryBookParams>;
/**
 *  A pool's closing-price capture state (see `Trader.captureClose`). `state`:
 *  - `"OPEN"`: no capture yet — post-expiry removals of alive-at-close orders
 *    revert `CloseNotCaptured` while the market is not terminal.
 *  - `"CAPTURED"`: two-sided capture stored; `closingMid` is the bid/ask mid in
 *    raw book-price units (scale `oneCollateral`).
 *  - `"CAPTURED_DEGENERATE"`: capture ran but a side had no closing order — no
 *    mid; a void falls back to uniform.
 *  - `"TERMINAL_LATCH"`: a removal observed the market already terminal; the
 *    lock lifted without a capture.
 *
 * @category orders
 */
export interface ClosingPriceState {
    /** Captured closing mid in raw book-price units (0 unless `state === "CAPTURED"`). */
    closingMid: bigint;
    /** The pool's price scale (`10 ** collateralDecimals`). */
    oneCollateral: bigint;
    /** Decoded close state. */
    state: "OPEN" | "CAPTURED" | "CAPTURED_DEGENERATE" | "TERMINAL_LATCH";
}
/**
 *  Read a pool's captured closing price + close state. Returns null when the
 *  pool predates the capture surface (the selector doubles as the capability
 *  probe, mirroring the module's own policy resolution at market creation).
 *
 *  **Gotchas**
 *
 *  `null` means the pool does not DECLARE `closingPrice()` — nothing else. A
 *  read that fails for any other reason throws: an `RpcError` for a transport
 *  failure, a `ContractRevertError` for a revert that names an error or a
 *  reason. Reporting either as `null` would tell a caller a live pool predates
 *  the capture surface, and a `CLOB_SNAPSHOT` void would then pay the uniform
 *  half-refund instead of the captured mid.
 */
export declare function getClosingPrice(pool: Address, client: PublicClient, ownedFailure?: (error: unknown) => boolean): Promise<ClosingPriceState | null>;
/**
 *  One resting order exactly as the pool holds it — raw units, `bigint` fields.
 *
 *  Order ids are unique per POOL, not globally: always carry the pool alongside
 *  the id.
 *
 * @category orders
 */
export interface OnchainOrder {
    /** The pool's order id (`OrderId`, a uint128). */
    orderId: bigint;
    /** True for a bid (buy), false for an ask (sell). */
    isBid: boolean;
    /** The account the order rests for. */
    owner: Address;
    /** Caller-supplied tag echoed back by the book; 0 when unused. */
    userData: bigint;
    /** Limit price, raw quote/collateral units per whole base unit. */
    price: bigint;
    /** Quantity as originally placed, raw base units. */
    fullQuantity: bigint;
    /** Quantity still resting, raw base units — what a cancel would return. */
    quantityRemaining: bigint;
    /** Expiry as a UNIX timestamp in NANOseconds; 0 means no expiry. */
    expireTimestampNs: bigint;
}
/** Options for one on-chain order read. @category orders */
export interface GetOrderOnchainOptions {
    /**
     *  Read the order as of the END of this block instead of at head.
     *
     *  For a maker order a fill has already consumed: the fill removes it in the same
     *  transaction, so `fill.blockNumber - 1n` is the last height that still holds it.
     *  `OrderFilled` names the maker only by id, and the pool keeps no record of a
     *  removed order at head.
     *
     *  What this recovers is the maker's IDENTITY state - `isBid`, `owner`, `userData`,
     *  `expireTimestampNs` - which no path changes under a given id, so it is exact at
     *  any height the order existed, and which no fill log carries: `OrderFilled` names
     *  the maker by id alone. Only `OrderPlaced` carries it, and a consumer that was not
     *  listening when the maker rested does not have that log - which is the whole case
     *  for this read.
     *
     *  `price` is immutable too, and is the one immutable field NOT to read for: a fill
     *  executes at the MAKER's resting price, and the book emits that same `price` as the
     *  fill event's own. Reading the maker order to price a fill is redundant work.
     *
     *  BOTH quantities are block-level, and neither is per-fill. A block read cannot see
     *  between transactions, so `fullQuantity` and `quantityRemaining` are the values at
     *  the block BOUNDARY: an earlier transaction in the fill's own block may have
     *  filled this maker, or reduced it - `reduceOrder` decrements both by the same
     *  amount, under the same id. Take `quantityFilled` and `makerRemainingQuantity`
     *  from the event; no block-level read reconstructs per-transaction size.
     *
     *  Two more edges answer plausibly rather than failing:
     *
     *  - A PARTIAL fill leaves the order in place, so a read at the fill's OWN block
     *    succeeds with a smaller `quantityRemaining` where a full fill answers `null`.
     *  - An order PLACED AND FILLED in one block does not exist at `blockNumber - 1n`,
     *    so that read is `null` and the caller needs the placement from the same block's
     *    `OrderPlaced` instead.
     *
     *  A recent block answers against a full node. An old one needs ARCHIVE state, so
     *  this serves a live tape, not a backfill or a replay of last week.
     */
    blockNumber?: bigint;
}
/**
 *  One order's state at chain head, or as of a pinned block, by `(pool, orderId)`.
 *
 *  **When to use**
 *
 *  Use to read your own writes: right after `placeOrder`, this answers from the
 *  block the order landed in, while the indexed counterpart (`getOrders`) may
 *  not have caught up yet. The trade-off is the mirror image — this sees only
 *  what is ACTIVE at the height read, so a filled or cancelled order reads as
 *  `null` at head while the indexer keeps its history.
 *
 *  Use `opts.blockNumber` to read a maker order at the block BEFORE its fill. A
 *  consumer decoding `OrderFilled` gets the fill's own numbers from the event, but
 *  the maker only as an id, and the fill removes that order in the same transaction,
 *  so this is what answers which side of the book the fill took when no cached
 *  placement covers it. It answers for the order's immutable fields; a block read
 *  resolves NEITHER quantity per transaction - see the option's docs.
 *
 * **Details**
 *
 * - Returns: The order, or `null` if the pool has no active order for that id at
 *   the height read.
 * - `opts.blockNumber`: Exact block. Omitted: chain head.
 *
 *  **Gotchas**
 *
 *  Order ids are unique per pool, so the pool is part of the key. `null` covers
 *  every "no active order with that id" case the pool reports - never assigned,
 *  fully filled, cancelled, expired-and-swept, or replaced by an amend, which is a
 *  cancel-then-place under a NEW id. A `reduceOrder` is not one of them: it keeps the
 *  id and shrinks the order in place, and it cannot shrink below the book's
 *  `minQuantity`, so it never removes it.
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
 */
export declare function getOrderOnchain(pool: Address, orderId: bigint, client: PublicClient, opts?: GetOrderOnchainOptions, ownedFailure?: (error: unknown) => boolean): Promise<OnchainOrder | null>;
/**
 *  One owner's resting orders across several pools, all read at one block.
 *  Read them with `client.getOpenOrdersOnchain(pools, owner)`.
 *
 * @category orders
 */
export interface OpenOrdersOnchain {
    /**
     *  Every resting order, each tagged with the pool it rests on. Order ids are
     *  unique per pool, so the pool is part of a row's identity.
     *
     *  Empty when no supplied pool holds an order for this owner. That is a
     *  successful empty result; a failed read throws.
     */
    orders: (OnchainOrder & {
        pool: Address;
    })[];
    /** The single block every read in the call quoted. */
    blockNumber: bigint;
}
/**
 *  Options for `client.getOwnOpenOrdersOnchain(pool, owner, opts)`.
 *
 * @category orders
 */
export interface GetOwnOpenOrdersOnchainOptions {
    /**
     *  Read at this exact block instead of at head. Supply it to join these ids
     *  with other reads at one state — an id read at head and a detail read a
     *  block later can disagree, because a fill removes an order.
     */
    blockNumber?: bigint;
}
/**
 *  An owner's open order ids at chain head.
 *
 *  **When to use**
 *
 *  Use to re-sync after a restart, or to confirm a placement landed before the
 *  indexer reports it. The indexed counterpart is `getOpenOrders`, which carries
 *  decoded human-unit rows and history but lags chain head.
 *
 *  **Gotchas**
 *
 *  The pool's view answers for `msg.sender`, so the wrapper impersonates the
 *  owner via the `eth_call` sender — no signer, no signature, any address may be
 *  asked about. Ids only: pair with {@link getOrderOnchain} for the structs, or
 *  use `client.getOpenOrdersOnchain`, which joins the two at one pinned block.
 *
 *  This read is never routed through Multicall3. The pool reads `msg.sender`,
 *  which through an aggregator is the aggregator, so a batched call would return
 *  that contract's empty order set — silently wrong rather than a revert.
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
 */
export declare function getOwnOpenOrdersOnchain(pool: Address, owner: Address, client: PublicClient, opts?: GetOwnOpenOrdersOnchainOptions): Promise<bigint[]>;
/**
 *  The maximum number of pools `client.getOpenOrdersOnchain` accepts in one call.
 *
 *  The real ceiling is the node's `eth_call` gas cap, not this number: the
 *  pool's `getOwnOpenOrders` is an unbounded per-user loop, so one pool with a
 *  very large resting set can exhaust it on its own. This cap only keeps the
 *  fan-out of id reads bounded (SDK-IO-005).
 *
 * @category orders
 */
export declare const OPEN_ORDERS_ONCHAIN_MAX_POOLS = 50;
/**
 *  Options for `client.getOpenOrdersOnchain(pools, owner, opts)`.
 *
 * @category orders
 */
export interface GetOpenOrdersOnchainOptions {
    /**
     *  Read at this exact block instead of pinning the current head. Every read in
     *  the call quotes the SAME block either way — that pin is what makes the ids
     *  and their details agree.
     */
    blockNumber?: bigint;
}
/**
 *  One owner's full open-order rows across several pools, read from chain at one
 *  pinned block.
 *
 *  **When to use**
 *
 *  Use when you must list your own resting orders and cannot depend on the
 *  indexer. `getOpenOrders` is the indexed counterpart: it carries decoded
 *  human-unit rows, the market a row belongs to, and history, but it throws
 *  `IndexerError` during an outage and lists stale rows while the indexer lags.
 *  This read answers from the chain itself, so it survives both.
 *
 *  It is the non-destructive companion to `cancelAllOrders`, which already reads
 *  its ids from chain: this one shows what is resting, that one pulls it.
 *
 *  **Details**
 *
 *  The join is two stages at one block. One direct id read per pool, then one
 *  batched `getOrder` for every id. The id read is never batched: the pool's
 *  view answers for `msg.sender`, so through Multicall3 it would return the
 *  aggregator's empty set — silently wrong rather than a revert. The detail
 *  reads carry no such constraint and go through Multicall3 when the chain
 *  declares it, with a narrow fan-out otherwise.
 *
 *  **Gotchas**
 *
 *  - The caller supplies the pool list. There is no discovery here, because
 *    discovering pools by symbol is an indexer read and would reintroduce the
 *    dependency this read exists to remove.
 *  - Rows carry `isBid` and NOT a YES/NO side. On a binary pool the side is not
 *    derivable: a bid can be BUY_YES or SELL_NO, and only the
 *    `BinaryOrderPlaced.kind` event is authoritative. So these rows are enough
 *    for quote management and not enough for binary inventory or collateral
 *    accounting. Spot and perp rows are complete.
 *  - No `market`, `marketInfo` or symbol: those are indexer fields.
 *  - No history. Only what is resting at the block read.
 *  - A pool with no resting orders contributes no rows. That is an empty
 *    result, never a failure; a failed read throws instead (SDK-IO-002).
 *  - The streaming alternative for one binary pool is a chain-seeded watch,
 *    `watchMarket(pool, { seed: "chain", marketId })`, plus `getLiveUserOrders`.
 *    That keeps a live view but needs a WebSocket watch per pool; this is a
 *    one-shot read.
 *
 * **Example** (Listing your resting orders during an indexer outage)
 *
 * ```ts
 * const { orders, blockNumber } = await client.getOpenOrdersOnchain([pool], owner);
 * for (const o of orders) console.log(o.pool, o.orderId, o.price, o.quantityRemaining);
 * console.log("as of block", blockNumber);
 * ```
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative, or more
 *   than {@link OPEN_ORDERS_ONCHAIN_MAX_POOLS} pools are supplied.
 * @throws {@link RpcError} If the node returns fewer reads than were requested,
 *   or a returned id has no active order at the pinned block.
 * @throws {@link ContractRevertError} If a pool read reverts.
 * @category orders
 */
export declare function getOpenOrdersOnchain(pools: Address[], owner: Address, client: PublicClient, opts?: GetOpenOrdersOnchainOptions): Promise<OpenOrdersOnchain>;
/**
 *  One page of every open order on one side of a book, at chain head or at a
 *  pinned block.
 *
 *  **When to use**
 *
 *  Use to snapshot a full side — the per-order detail `getBookLevels` aggregates
 *  away. For a consistent multi-page snapshot, pass `blockNumber`: pages taken
 *  across different heads can double-count or miss orders as the book moves.
 *  Sample one head with `getBlockNumber`, then pass it to every page.
 *
 * **Details**
 *
 * - `opts`: `isBid` picks the side; `maxCount` caps orders per page (default 100); `cursor` continues a previous page (omit for the first); `blockNumber` reads at that exact block instead of the current head.
 *
 *  **Gotchas**
 *
 *  The pool accepts this view ONLY from the zero address, so this read never
 *  attaches an account — a configured signer does not change it. Pagination is
 *  the contract's, surfaced as-is: no auto-drain, since the number of pages is
 *  unbounded. Loop while `hasMore`, passing `nextCursor` back as `cursor`.
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
 */
export declare function getAllOpenOrdersOnchain(pool: Address, opts: {
    isBid: boolean;
    maxCount?: number;
    cursor?: bigint;
    blockNumber?: bigint;
}, client: PublicClient): Promise<{
    orders: OnchainOrder[];
    hasMore: boolean;
    nextCursor: bigint;
}>;
/**
 *  Default orders per page when draining a whole side. Higher than the 100 of a
 *  single `getAllOpenOrdersOnchain` page because a drain pays one `eth_call` per
 *  page: a 10,000-order side costs 100 calls at 100, and 20 at 500.
 */
export declare const DRAIN_PAGE_SIZE = 500;
/**
 *  Default pages per side for a drain. With {@link DRAIN_PAGE_SIZE} this covers
 *  20,000 resting orders per side, well past any book seen in practice.
 */
export declare const DRAIN_MAX_PAGES = 40;
/** Options for {@link drainOpenOrdersOnchain}. @category orders */
export interface DrainOpenOrdersOptions {
    /** Exact block for every page. Omitted: sample one head and pin all pages to it. */
    blockNumber?: bigint;
    /** Orders per page. Defaults to {@link DRAIN_PAGE_SIZE}. */
    maxCount?: number;
    /** Page budget per side. Defaults to {@link DRAIN_MAX_PAGES}. */
    maxPages?: number;
}
/**
 *  Every resting order on both sides of a pool's book, at one pinned block.
 *
 *  **When to use**
 *
 *  Use to seed a full local book from chain alone. This is the drain
 *  {@link getAllOpenOrdersOnchain} deliberately does not do, with an explicit
 *  bound instead of an open `while (hasMore)` loop.
 *
 *  **Details**
 *
 *  One head is sampled once (unless `blockNumber` pins it), then both sides
 *  drain concurrently, each side serially by cursor, every page reading at that
 *  same block. So the two sides describe one consistent instant of the book.
 *
 *  **Gotchas**
 *
 *  Reaching the page budget is a successful bounded read, not a failure: it
 *  returns what it read with `truncated: true` rather than throwing. A caller
 *  that treats a truncated book as complete shows a shallow book. Check the
 *  flag, and raise `maxPages` or `maxCount` if a real book needs more.
 *
 * @throws {@link InvalidInputError} If `blockNumber` is negative, or `maxCount`/`maxPages` is not a positive safe integer.
 * @throws {@link ContractRevertError} If a page read reverts.
 * @throws {@link RpcError} If the chain read fails at the transport.
 * @category orders
 */
export declare function drainOpenOrdersOnchain(pool: Address, client: PublicClient, opts?: DrainOpenOrdersOptions): Promise<{
    bids: OnchainOrder[];
    asks: OnchainOrder[];
    blockNumber: bigint;
    truncated: boolean;
}>;
/** Options for a native binary chain snapshot. @category orders */
export interface GetBinaryOrderBookOptions extends GetSpotOrderBookOptions {
    /** Collateral decimals for NO inversion. Defaults to 6. */
    decimals?: number;
}
/** Options for a native chain snapshot. @category orders */
export interface GetSpotOrderBookOptions {
    /** Maximum levels per side. Defaults to 12 for spot and 10 for binary. */
    depth?: number;
    /** Exact block for both sides. Omitted: sample one head and pin both reads. */
    blockNumber?: bigint;
}
/**
 *  Read the resting orderbook from a BinaryPool via getBookLevels (both sides).
 *  One-shot chain read — for a continuously-current book with zero round-trips,
 *  use `client.getLiveBinaryOrderBook` (or the `useLiveBinaryOrderBook` hook).
 */
export declare function getBinaryOrderBook(pool: Address, opts: GetBinaryOrderBookOptions | undefined, client: PublicClient): Promise<BinaryOrderBook>;
/**
 *  A plain two-sided spot order book (no YES/NO inversion). Prices are raw quote
 *  units per whole base; quantities are raw base units.
 *
 * @category orders
 */
export interface SpotOrderBook {
    /** Pinned chain block or scope applied-event watermark; absent without provenance. */
    blockNumber?: bigint;
    /** Resting buys, best (highest price) first. */
    bids: BookLevel[];
    /** Resting sells, best (lowest price) first. */
    asks: BookLevel[];
}
/**
 *  Read a SpotPool's resting order book via the shared OrderBook `getBookLevels`
 *  (SpotPool and BinaryPool share the base contract, so the same read works).
 */
export declare function getSpotOrderBook(pool: Address, opts: GetSpotOrderBookOptions | undefined, client: PublicClient): Promise<SpotOrderBook>;
/** Latest chain head as seen by the RPC. */
export declare function getHeadBlock(client: PublicClient): Promise<number>;
/**
 *  A resting order that is PAST ITS EXPIRY but has not been cleaned off the book —
 *  the target of a permissionless sweep.
 *
 *  Carries exactly what the two sweep verbs need: `orderId` for
 *  {@link SomniaMarketsClient.createTrader}'s `cancelExpiredOrders`, and
 *  `isBid` + `price` for `sweepExpiredAtLevel`.
 *
 * @category orders
 */
export type SweepableOrder = {
    /** Row id (`${pool}_${orderId}`). */
    id: string;
    /** uint128 OrderId as a decimal string — pass to `cancelExpiredOrders`. */
    orderId: string;
    /**
     *  The market's bytes32 marketId — the market this order rests on, stably.
     *
     *  A sweepable order is by definition still RESTING, and a pool's book is
     *  emptied before the pool is recycled, so this read cannot be mislabelled the
     *  way order HISTORY can. It is carried anyway so all three order reads name a
     *  market the same way.
     */
    market: string;
    /** The market's labelling context. Null only if the indexer has no market row. */
    marketInfo: OrderMarket | null;
    /** The pool the order rests on (lowercased). A time-varying binding — see `market`. */
    pool: string;
    /** Which market kind the pool is — sweeping works the same on all of them. */
    marketType: MarketType;
    /** The order's owner (lowercased). */
    owner: string;
    /** True = bid side, false = ask — pass to `sweepExpiredAtLevel`. */
    isBid: boolean;
    /** The exact price level, raw pool units — pass to `sweepExpiredAtLevel`. */
    price: string;
    /** Unfilled remainder that would be released, raw base/outcome units. */
    quantityRemaining: string;
    /** Expiry as a uint64 NANOsecond timestamp (decimal string). */
    expireTimestampNs: string;
    /** Timestamp (unix seconds) the order was placed. */
    placedAtTimestamp: string;
};
/**
 *  Orders that are past expiry and STILL RESTING, across the whole book — the
 *  work-list for a permissionless expired-order sweep. Not scoped to one account.
 *
 *  Indexer tier. Works on every market kind; scope with `pool` and/or `marketType`.
 *
 *  **This is not `status: "Expired"`, and the difference is the whole point.** That
 *  status is written when the chain emits `OrderExpired` — i.e. once an order has
 *  ALREADY been removed. A keeper needs the opposite: orders the book still holds
 *  whose expiry has passed and which nobody has cleaned up yet. So the filter is
 *  `status = "Open"` AND `expireTimestampNs < now`.
 *
 *  They are **not matched against** — the matching loop skips an expired maker and
 *  moves to the next (F-2026-16202, so one user's expired pollution is no longer paid
 *  for by the next crossing taker). What they still cost is a warm SLOAD every time a
 *  traversal encounters them, plus the priority-index slot they occupy. That is the
 *  reason to sweep, and it is per-ENCOUNTER: an order overdue by a year at an
 *  untouched price level costs less than one overdue by a minute at the top of book.
 *  Longest-overdue first is a stable, obvious order to work through — not a claim
 *  about which orders cost the most.
 *
 *  GTC orders exclude themselves, but not via a sentinel: the contract has none, and
 *  any future expiry is simply live. This SDK writes GTC as now + 50 years
 *  (`farFutureNs`), which no realistic `asOfSec` reaches. An order placed by other
 *  tooling with a nearer expiry is genuinely sweepable once it passes, which is
 *  correct.
 *
 * **Details**
 *
 * - `opts.pool`: restrict to one pool
 * - `opts.marketType`: restrict to one market kind
 * - `opts.owner`: restrict to one owner (for a self-cleanup rather than a sweep)
 * - `opts.asOfSec`: the instant to judge expiry against (unix seconds; default now)
 * - `opts.limit`: default 200
 */
export declare function listSweepableOrders(opts: {
    pool?: string;
    marketType?: MarketType;
    owner?: string;
    asOfSec?: number | bigint;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<SweepableOrder[]>;
export declare function placeOrder(w: WriterCtx, p: PlaceOrderParams): Promise<PlaceOrderResult>;
export declare function cancelOrder(w: WriterCtx, p: CancelOrderParams): Promise<TxResult>;
export declare function reduceOrder(w: WriterCtx, p: ReduceOrderParams): Promise<TxResult>;
export declare function cancelExpiredOrders(w: WriterCtx, p: CancelExpiredOrdersParams): Promise<TxResult>;
export declare function sweepExpiredAtLevel(w: WriterCtx, p: SweepExpiredAtLevelParams): Promise<TxResult>;
export declare function captureClose(w: WriterCtx, p: CaptureCloseParams): Promise<TxResult>;
export declare function placeSpotOrder(w: WriterCtx, p: PlaceSpotOrderParams): Promise<PlaceOrderResult>;
export declare function placeSpotOrders(w: WriterCtx, p: PlaceSpotOrdersParams): Promise<PlaceSpotOrdersResult>;
export declare function cancelOrders(w: WriterCtx, p: CancelOrdersParams): Promise<CancelOrdersResult>;
export declare function reduceOrders(w: WriterCtx, p: ReduceOrdersParams): Promise<TxResult>;
/**
 *  Build {@link cancelOrders} without sending it.
 *
 *  **Details**
 *
 *  - `p`: The same inputs as {@link cancelOrders}.
 *  - Returns: The unsigned batch-cancel call.
 *
 *  **Gotchas**
 *
 *  - Throws {@link InvalidInputError} when `orderIds` is empty.
 *
 *  **Example** (Packing a ladder pull into one batch)
 *
 *  ```ts
 *  const pull = trader.buildCancelOrders({ pool, orderIds: ladderIds });
 *  await myBatcher.send([pull]);
 *  ```
 */
export declare function buildCancelOrders(w: WriterCtx, p: CancelOrdersParams): Writer.UnsignedCall;
/**
 *  Build {@link reduceOrders} without sending it.
 *
 *  **Details**
 *
 *  - `p`: The same inputs as {@link reduceOrders}.
 *  - Returns: The unsigned batch-reduce call.
 *
 *  **Gotchas**
 *
 *  - Throws {@link InvalidInputError} when `reductions` is empty.
 */
export declare function buildReduceOrders(w: WriterCtx, p: ReduceOrdersParams): Writer.UnsignedCall;
export declare function cancelAllOrders(w: WriterCtx, pool: Address, live: LiveOwnOrders | undefined, opts?: CancelAllOrdersOptions): Promise<CancelAllOrdersResult>;
/**
 *  Cancel ONE order and place its replacement atomically. Calls the pool's singular
 *  `amendOrder`, NOT `amendOrders` with a one-element array: the singular raises the
 *  replacement's own landing-time reason, where an all-or-nothing batch wraps it as
 *  `AmendReplacementRejected(requestIndex, reason)` and any other batch returns only
 *  a `0n` id, leaving the reason in an `AmendRejected` log.
 */
export declare function amendOrder(w: WriterCtx, p: AmendOrderParams): Promise<AmendOrderResult>;
/**
 *  Re-price N orders in one transaction: all-or-nothing, per-rung or in place,
 *  depending on the pool version (see {@link AmendOrdersParams}). It places, so the
 *  BinaryPool restriction there applies.
 */
export declare function amendOrders(w: WriterCtx, p: AmendOrdersParams): Promise<AmendOrdersResult>;
export declare function placePerpOrder(w: WriterCtx, p: PlacePerpOrderParams): Promise<PlaceOrderResult>;
export declare function buildPlaceOrder(w: WriterCtx, p: PlaceOrderParams): Promise<Writer.UnsignedOrder>;
export declare function buildPlaceSpotOrder(w: WriterCtx, p: PlaceSpotOrderParams): Promise<Writer.UnsignedOrder>;
export declare function buildPlacePerpOrder(w: WriterCtx, p: PlacePerpOrderParams): Promise<Writer.UnsignedOrder>;
