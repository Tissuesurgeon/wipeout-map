import * as IndexerRead from "./indexerRead.js";
import type { BinaryFillKind, BinarySide, OrderStatus } from "./store.js";
import type { BuilderFeeRecord, ProtocolFeeRecord } from "./fees.js";
import type { Market, MarketType } from "./markets.js";
/**
 * Options for {@link SomniaMarketsClient.getFills} / {@link SomniaMarketsClient.getUserFills}. All optional.
 *
 * @category fills
 */
export type FillsOptions = {
    /** Max rows (default 50). */
    limit?: number;
    /** Row offset for paging the tape (default 0). */
    offset?: number;
    /** Only fills at/after this unix-seconds timestamp. */
    since?: number;
    /** Only fills at/before this unix-seconds timestamp. */
    until?: number;
    /**
     *  Only fills from this block onwards (`Fill.blockNumber`), inclusive.
     *
     *  The exact resume bound a reader wants after processing up to a known block:
     *  two blocks can share a timestamp, so a `since` bound in seconds either
     *  repeats or skips those rows. Accepts the `bigint` a transaction receipt
     *  carries.
     *
     *  On these pool- and account-scoped reads the bound is a filter, not an
     *  access path: the plan rides the pool or account index and tests the block.
     *  {@link SomniaMarketsClient.getFillsPage} is the read that has an index
     *  behind the range itself.
     */
    sinceBlock?: number | bigint;
    /**
     *  Only fills up to this block (`Fill.blockNumber`), inclusive.
     *
     *  The upper half of {@link FillsOptions.sinceBlock}, and inclusive for the
     *  same reason: a reader that walks the chain in ranges wants the boundary to
     *  be exact and repeatable, so `[a, b]` followed by `[b + 1, c]` covers every
     *  fill exactly once. Supplying it alone bounds the tape from above only.
     */
    toBlock?: number | bigint;
};
/**
 *  Scope for the per-account fill reads
 *  ({@link SomniaMarketsClient.getUserFills} /
 *  {@link SomniaMarketsClient.countUserFills}): a `market` (or `markets`) and/or
 *  `pool` predicate on top of {@link FillsOptions}.
 *
 *  Prefer `market` on binary. A binary pool is recycled by successive markets,
 *  so `pool` selects every life of that pool, while `market` selects exactly one
 *  market. On spot/perp the market id IS the pool address, so the two agree.
 *
 * @category fills
 */
export type FillsScope = FillsOptions & {
    /** Only fills in this market (bytes32 marketId, case-insensitive). */
    market?: string;
    /**
     *  Only fills in ANY of these markets (bytes32 marketIds, case-insensitive)
     *  — the batched form of `market`, for folding several markets from one read.
     *  An empty array matches nothing. Supplying `market` as well narrows to both
     *  (the intersection), so neither silently overrides the other.
     */
    markets?: readonly string[];
    /** Only fills on this pool address (case-insensitive). */
    pool?: string;
};
/**
 *  Options for {@link SomniaMarketsClient.getFills}: {@link FillsOptions} plus a
 *  `market` (or `markets`) predicate on the pool's tape.
 *
 *  On binary, scope by `market` to read one market's fills. A binary pool is
 *  recycled by successive markets, so the pool alone also returns the fills of
 *  its earlier markets.
 *
 * @category fills
 */
export type GetFillsOptions = Omit<FillsScope, "pool">;
/** Scope and bounded continuation for {@link SomniaMarketsClient.getUserFillsPage}. */
export type GetUserFillsPageOptions = Omit<FillsScope, "offset"> & {
    /**
     *  Only fills of this market kind (`Fill.marketType`, a direct indexed column).
     *  Omit to read every kind. The kind is part of the cursor scope, so a cursor
     *  from one kind, or from no kind, does not continue another.
     */
    marketType?: MarketType;
    /** Opaque cursor from the preceding page. Omit for the newest page. */
    cursor?: string;
};
/**
 *  Scope and bounded continuation for {@link SomniaMarketsClient.getFillsPage} —
 *  an inclusive block range over one market kind, across every pool of it.
 *
 *  Every field but `limit` and `cursor` is required, and that is the point of
 *  the read: the range is what bounds it, and `marketType` is the leading column
 *  of the index the range is served from, so neither has a safe default.
 *
 * @category fills
 */
export type FillsPageOptions = {
    /**
     *  Market kind whose pools to read. One index seek covers every pool of that
     *  kind, so a caller never enumerates pools to span them.
     */
    marketType: MarketType;
    /** First block of the range, inclusive. */
    sinceBlock: number | bigint;
    /** Last block of the range, inclusive. */
    toBlock: number | bigint;
    /**
     *  Max rows per page (default 500, 1 to 1000). Higher than the account tape's
     *  50 because this read exists to be drained: a range is walked to its end,
     *  not browsed a screen at a time.
     */
    limit?: number;
    /** Opaque cursor from the preceding page. Omit for the first page of the range. */
    cursor?: string;
};
/**
 *  One page of a block range, oldest first. Not a coverage guarantee: the range
 *  is served from what the indexer has processed, which
 *  {@link SomniaMarketsClient.getLatestFillBlock} reports.
 *
 * @category fills
 */
export type FillsPage = {
    /**
     *  Fills in this page, ascending by `(blockNumber, logIndex)`. Typed as
     *  {@link OrderFillRow} so the block position the order and the cursor rest on
     *  is required rather than optional.
     */
    fills: OrderFillRow[];
    /**
     *  Pass to the next call to continue the SAME range. Present whenever the page
     *  is full, so a range ending exactly on a page boundary costs one empty final
     *  page. Null means the range is drained, not that the chain is.
     */
    nextCursor: string | null;
};
/**
 *  The newest block carrying an indexed fill of one market kind, with that
 *  block's timestamp.
 *
 * @category fills
 */
export type LatestFillBlock = {
    /** Block height of the newest indexed fill of this kind. */
    blockNumber: bigint;
    /** That fill's block timestamp, unix seconds. */
    timestamp: bigint;
};
/** One bounded historical page of role-visible fills. This is not a snapshot or chain-head guarantee. */
export type UserFillsPage = {
    /** Identity of the serving Fill dataset. Discard cached pages when it changes. */
    datasetGeneration: string;
    /** Existing fill rows, newest first by numeric timestamp, block and log position. */
    fills: FillRow[];
    /** Continue with the same scope. Null means no older role-visible row under a positive row cap. */
    nextCursor: string | null;
};
/**
 *  Options for {@link SomniaMarketsClient.getUserFillHistory}. All optional.
 *
 * @category fills
 */
export type GetUserFillHistoryOptions = {
    /**
     *  The history the previous call returned, as it came back or after a JSON
     *  round trip. Omit it, or pass `null`, for a first read.
     *
     *  A history that does not fit this call is read again from the start, and
     *  the result says `restarted: true` and `restartReason: "previous"`. That
     *  covers another account, chain, market kind or format version, and rows
     *  that are out of order, repeated or without a usable position.
     */
    previous?: UserFillHistory | null;
    /**
     *  The most fills to hold: an integer from 1 to 100,000, default 20,000. The
     *  history keeps the newest. When older fills exist that it does not hold,
     *  it says `truncated: true`.
     */
    maxRows?: number;
    /**
     *  How far back a refresh reads again, in seconds before the newest held fill:
     *  an integer from 0 to 3,600, default 60. A fill never changes once the
     *  indexer serves it, except when a chain reorg rolls rows back in place. So a
     *  refresh checks the held rows in this overlap against what the indexer
     *  serves now. It reads the whole history again when a held fill there
     *  changed, or a fill the history does not hold appears below its newest
     *  fill. When only the newest held fills are not served, and every other held
     *  fill in the overlap still matches, it drops them: they come back as new
     *  fills when the indexer catches up. A reorg deeper than the
     *  overlap is not detected. Each refresh request reads up to 999 fills of the
     *  overlap, so a longer or busier overlap costs more requests. With 0, a
     *  refresh still reads the newest held second again, because a new fill can
     *  share it.
     */
    overlapSeconds?: number;
    /**
     *  Only fills of this market kind. Omit it to hold every kind. The kind is
     *  part of the history, so a history of one kind is not updated as another.
     */
    marketType?: MarketType;
    /** Cancels this call. The rejection is the signal's own reason. */
    signal?: AbortSignal;
};
/**
 *  An account's fills as a {@link SomniaMarketsClient.getUserFillHistory} call
 *  left them: the state a caller stores and passes back as `previous`.
 *
 *  Plain data that survives `JSON.stringify` and `JSON.parse`. It holds no
 *  endpoint and no credentials. Do not edit it. The next call checks its scope
 *  and the order of its rows, and checks the rows in the overlap against the
 *  indexer, but it does not read older rows again, so an edit there stays.
 *
 * @category fills
 */
export type UserFillHistory = {
    /** The stored format. A history of an older format is read again from the start. */
    readonly version: 1;
    /** The chain the fills are on. */
    readonly chainId: number;
    /** The account, lowercased. */
    readonly account: string;
    /** The market kind the history holds, or `null` for every kind. */
    readonly marketType: MarketType | null;
    /** The serving Fill dataset the rows came from, as {@link UserFillsPage.datasetGeneration} reports it. */
    readonly datasetGeneration: string;
    /**
     *  The account's fills as maker or taker, newest first in descending
     *  `(timestamp, blockNumber, logIndex)` order. Each fill appears once.
     */
    readonly fills: readonly OrderFillRow[];
    /**
     *  True when older fills exist that `fills` does not hold, because of
     *  `maxRows`. The history is complete from its oldest held fill onwards, but
     *  other fills in that fill's second can be missing: `maxRows` cuts by
     *  position, not by second.
     */
    readonly truncated: boolean;
};
/**
 *  The result of one {@link SomniaMarketsClient.getUserFillHistory} call.
 *
 * @category fills
 */
export type UserFillHistoryRead = {
    /** The history brought up to date. It is the `previous` object itself when `changed` is false. */
    readonly history: UserFillHistory;
    /** True when `history` differs from `previous`. Store it then. */
    readonly changed: boolean;
    /**
     *  True when the call read the history from the start instead of updating
     *  `previous`. `restartReason` says why.
     */
    readonly restarted: boolean;
    /**
     *  Why the call read the history from the start, or `null` when `restarted`
     *  is false.
     *
     *  - `"previous"`: `previous` does not fit the call. It is for another
     *    account, chain, market kind or format version, or its rows are not
     *    usable. Or it is truncated, its last fill is inside the overlap, and the
     *    refresh read past that fill, as after a larger `maxRows`.
     *  - `"dataset"`: the serving Fill dataset changed, for example after a
     *    reindex or a cutover.
     *  - `"overlap"`: the overlap does not match the held rows. A held fill there
     *    changed, a held fill is gone while an older held fill is still served, a
     *    fill the history does not hold appears below its newest fill, or every
     *    fill of a truncated history is gone. A fill never changes once the
     *    indexer serves it, except in a chain reorg. Outside a reorg, a changed
     *    fill or an unheld fill means the indexer broke that rule, so count this
     *    reason.
     */
    readonly restartReason: "previous" | "dataset" | "overlap" | null;
};
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
export declare function getFills(pool: string, opts: GetFillsOptions | undefined, indexerUrl: IndexerRead.Source): Promise<FillRow[]>;
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
export declare function getUserFills(account: string, opts: FillsScope | undefined, indexerUrl: IndexerRead.Source): Promise<FillRow[]>;
/**
 * Owner-bound historical continuation; a short nonempty page probes for older rows.
 * `config.operation` is the public method a failure names, for a read built on this one.
 */
export declare const getUserFillsPage: (account: string, options: GetUserFillsPageOptions | undefined, config: {
    source: IndexerRead.Source;
    chainId: number;
    signal?: AbortSignal;
    headers?: Record<string, string>;
    operation?: string;
}) => Promise<UserFillsPage>;
type HistoryConfig = {
    source: IndexerRead.Source;
    chainId: number;
    signal?: AbortSignal;
    headers?: Record<string, string>;
};
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
export declare const getUserFillHistory: (account: string, options: GetUserFillHistoryOptions | undefined, config: HistoryConfig) => Promise<UserFillHistoryRead>;
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
export declare const getFillsPage: (options: FillsPageOptions, config: {
    source: IndexerRead.Source;
    chainId: number;
    signal?: AbortSignal;
    headers?: Record<string, string>;
}) => Promise<FillsPage>;
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
export declare function getLatestFillBlock(marketType: MarketType, indexerUrl: IndexerRead.Source, headers?: Record<string, string>): Promise<LatestFillBlock | null>;
/**
 *  One fill by its id (`${blockNumber}_${logIndex}`) with both parties' order
 *  linkage and the market it executed on — the single lookup behind a fill
 *  detail view. Null when the id isn't indexed (yet — the indexer can lag a
 *  just-executed fill by a beat).
 */
export declare function getFill(id: string, indexerUrl: IndexerRead.Source): Promise<FillDetail | null>;
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
export declare function getOrderFills(pool: string, orderId: bigint | string, opts: {
    limit?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<OrderFillRow[]>;
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
export declare function countUserFills(account: string, opts: FillsScope | undefined, indexerUrl: IndexerRead.Source, headers?: Record<string, string>): Promise<number>;
/**
 *  One fill as the indexer recorded it (mirror of the unified `Fill` entity —
 *  spot, perp and binary fills share it).
 *
 * @category fills
 */
export type FillRow = {
    /** Source block as an exact decimal string. SDK reads populate it; caller-built rows may omit it. */
    blockNumber?: string;
    /** Source log position. SDK reads populate it; caller-built rows may omit it. */
    logIndex?: number;
    /** Fill id (`${blockNumber}_${logIndex}`). */
    id: string;
    /**
     *  The market's bytes32 marketId — the STABLE identity of the market this fill
     *  executed in.
     *
     *  Group and label by this, never by `pool` alone: a binary pool is recycled
     *  across successive markets, so fills from a pool's earlier life carry the
     *  same pool address as the market currently on it. On SPOT/PERP the pool
     *  address IS the market id. Pass it to
     *  {@link SomniaMarketsClient.getMarket | client.getMarket} for the full row.
     */
    market: string;
    /**
     *  Lowercased pool address the fill executed on. A TIME-VARYING binding — see
     *  `market` for the identity that does not move.
     */
    pool: string;
    /**
     *  Execution price, raw quote units per whole base (binary: YES-probability
     *  scale). SPOT/PERP: the maker's limit price.
     */
    fillPrice: string;
    /** Base/outcome-token quantity filled, raw units. */
    quantity: string;
    /** Quote/collateral value = quantity × fillPrice / 10^baseDecimals (raw, floored). */
    quoteQuantity: string;
    /** Maker (resting) wallet, lowercased; null when unknown. */
    maker: string | null;
    /** BINARY only — the maker's YES/NO side; null on SPOT/PERP. */
    makerSide: BinarySide | null;
    /**
     *  Taker wallet, lowercased. Denormalized from the taker's OrderPlaced (which
     *  fires after the fill in the same tx) — null until that bridge lands.
     */
    taker: string | null;
    /**
     *  BINARY only — the taker's YES/NO side; null on SPOT/PERP or until the
     *  taker's OrderPlaced is bridged.
     */
    takerSide: BinarySide | null;
    /**
     *  BINARY only — how the fill settled (direct trade vs mint/burn of a pair);
     *  null on SPOT/PERP or until the taker side is known.
     */
    kind: BinaryFillKind | null;
    /**
     *  True when the taker bought the base/YES (the maker was the ask); null until
     *  the taker side is known.
     */
    takerIsBid: boolean | null;
    /**
     *  The taker's ORDER (owner + side), when the indexer has it.
     *
     *  Prefer `takerOrder.side` over {@link FillRow.takerSide} on binary: the
     *  latter is a denormalized copy the taker bridge backfills, so it lags and
     *  can be null on a row that already names its taker.
     */
    takerOrder: {
        owner: string;
        side: BinarySide | null;
    } | null;
    /** uint128 id of the resting (maker) order, decimal string. */
    makerOrderId: string;
    /** uint128 id of the aggressing (taker) order, decimal string. */
    takerOrderId: string;
    /**
     *  The taker order's unfilled remainder AFTER this fill, raw base/outcome
     *  units. `"0"` means this fill completed the order.
     *
     *  The chain's own number, as `OrderFilled` carries it — so a caller
     *  reconciling partial fills from the tape sees exactly what an event
     *  subscriber sees, without re-deriving it from the running quantity.
     */
    takerRemainingQuantity: string;
    /** The maker order's unfilled remainder AFTER this fill, on the same terms as {@link FillRow.takerRemainingQuantity}. */
    makerRemainingQuantity: string;
    /** Timestamp (unix seconds) of the fill. */
    timestamp: string;
    /** Tx hash the fill landed in. */
    txHash: string;
};
/**
 *  A fill with its position in the chain — {@link FillRow} plus the block and
 *  log index. What {@link SomniaMarketsClient.getOrderFills} returns.
 */
export type OrderFillRow = FillRow & {
    /** Block the fill landed in (decimal string). */
    blockNumber: string;
    /** Log index within the block (with blockNumber: the fill's id). */
    logIndex: number;
};
/**
 *  The market a fill/order belongs to, as detail reads embed it — enough to
 *  label and scale the row (symbols + decimals) and route to the market's page,
 *  without dragging in the full per-kind {@link Market} union.
 */
export type MarketRef = {
    /** Market entity id (pool address for SPOT/PERP; marketId bytes32 for BINARY). */
    id: string;
    marketType: "SPOT" | "PERP" | "BINARY";
    /** Lowercased pool address serving the market. */
    poolAddress: string;
    /** BinaryMarket contract address; null on SPOT/PERP. */
    marketAddress: string | null;
    baseSymbol: string | null;
    quoteSymbol: string | null;
    baseDecimals: number;
    quoteDecimals: number;
    /** Underlying asset label (BINARY); null on SPOT/PERP. */
    asset: string | null;
    /** The market's question text (BINARY); null on SPOT/PERP. */
    question: string | null;
};
/**
 *  {@link OrderFillRow} plus the market it executed on — one fill, fully framed.
 *
 *  The embed is `marketRef`, not `market`, because the name is already taken:
 *  {@link FillRow.market} is the bytes32 marketId STRING (aliased from
 *  `market_id` in `FillQueryFields`, load-bearing for binary-PnL market
 *  scoping). Two fields cannot share it — GraphQL refuses to select the
 *  `market` relationship alongside the `market: market_id` alias, and the TS
 *  intersection `string & MarketRef` is uninhabitable.
 */
export type FillDetail = OrderFillRow & {
    marketRef: MarketRef;
};
/**
 *  One side's order on a fill — the resting order, or the one that crossed it.
 *
 *  A narrower shape than {@link OrderRow}: this describes an order in the context
 *  of a fill whose market is already known, so it carries no market labelling.
 *  Amounts are raw units.
 */
export type FillOrder = {
    /** Order id (`${pool}_${orderId}`). */
    id: string;
    /** uint128 OrderId as a decimal string. */
    orderId: string;
    /** Owner wallet, lowercased. */
    owner: string;
    /**
     *  True = bid (buy). Set on every market kind, unlike `side`, which the indexer
     *  fills in only for binary.
     */
    isBid: boolean;
    /** BINARY only — the YES/NO side; null on spot and perp. */
    side: BinarySide | null;
    /** Limit price, raw quote units per whole base. */
    price: string;
    /** Original size, raw base/outcome units. */
    fullQuantity: string;
    /** Cumulative filled size, raw base/outcome units. */
    filledQuantity: string;
    /** Unfilled remainder, raw base/outcome units. */
    quantityRemaining: string;
    /** Reconciled lifecycle status (Open/Filled/Cancelled/Expired/Closed). */
    status: OrderStatus;
    /** Whether the order ever rested on the book (an `OrderRested` fired). */
    rested: boolean;
    /**
     *  WHY the PROTOCOL cancelled the order, when it was not the owner. Null for an
     *  owner cancel and for an order that was never cancelled — so a `Cancelled`
     *  status with a null reason means the owner did it.
     */
    cancelReason: string | null;
    /** Timestamp (unix seconds) the order was placed. */
    placedAtTimestamp: string;
    /** Transaction the order was PLACED in — usually not the fill's transaction. */
    placedTxHash: string;
};
/**
 *  Everything the indexer knows about ONE fill: the trade itself, the market it
 *  executed in, both sides' orders, the fees it paid, and the other fills its
 *  transaction produced.
 *
 *  The shape of a trade detail view. Each piece may be absent on its own terms —
 *  see the field docs — and absence is normal rather than an error.
 *
 *  Distinct from {@link FillDetail}, which is the one-query lookup behind
 *  {@link SomniaMarketsClient.getFill}: that names the fill and its market, this
 *  adds the surrounding CONTEXT — both orders resolved, the fees, the rest of the
 *  transaction — at the cost of a second round-trip. A caller that only needs to
 *  render the trade wants `getFill`.
 */
export type TradeContext = {
    /** The fill, with its block position and post-fill remainders. */
    fill: OrderFillRow;
    /**
     *  The market the fill executed in; null only when the indexer has no market
     *  row for it (an unregistered pool).
     */
    market: Market | null;
    /**
     *  The resting order that was filled; null until the indexer has that order's
     *  row.
     */
    makerOrder: FillOrder | null;
    /** The aggressing order that crossed the book; null until its row is indexed. */
    takerOrder: FillOrder | null;
    /**
     *  The OTHER fills of the same transaction, newest first — the rest of a
     *  taker's sweep. Empty when this fill was the whole trade. Excludes this fill.
     */
    siblings: OrderFillRow[];
    /**
     *  Protocol fees charged in the same transaction. BINARY only, and empty when
     *  no fee was skimmed.
     *
     *  Transaction-scoped, not fill-scoped: a fee record names the ORDER it was
     *  charged on, not the fill, so a multi-fill sweep cannot be split into
     *  per-fill fees. Match `orderId` against the fill's `makerOrder`/`takerOrder`
     *  to attribute what can be attributed.
     */
    protocolFees: ProtocolFeeRecord[];
    /** Builder fees charged in the same transaction, on the same terms as {@link TradeContext.protocolFees}. */
    builderFees: BuilderFeeRecord[];
};
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
export declare function getTradeContext(id: string, indexerUrl: IndexerRead.Source): Promise<TradeContext | null>;
/**
 *  The selection behind {@link MarketRef}, declared ONCE. Both detail reads land
 *  their row through `narrowIndexerInvariant`, an unchecked cast — so a field
 *  added to `MarketRef` and to only one of two copied selections would surface
 *  as `undefined` at runtime with no type error. One fragment removes that.
 */
export declare const MarketRefFields: import("./gql/graphql.js").TypedDocumentString<import("./gql/graphql.js").MarketRefFieldsFragment, unknown>;
export {};
