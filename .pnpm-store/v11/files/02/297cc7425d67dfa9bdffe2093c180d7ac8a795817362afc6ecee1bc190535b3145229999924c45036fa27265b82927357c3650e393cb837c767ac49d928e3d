import * as IndexerRead from "../indexerRead.js";
import { type PortfolioOptions } from "../binary/portfolio.js";
import * as PortfolioScope from "../portfolioScope.js";
import type { OrderStatus } from "../store.js";
/**
 * Perp market context attached to perp portfolio rows. id == poolAddress.
 *
 * @category perpetual markets
 */
export type PerpPortfolioMarket = {
    /** Pool address (lowercased; == the market id for perp). */
    poolAddress: string;
    /** Synthetic-base symbol (e.g. "WBTC"); null when the wrapper exposes none. */
    baseSymbol: string | null;
    /** Collateral token symbol (e.g. "USDso"); null when the token exposes none. */
    quoteSymbol: string | null;
    /** Base-token decimals — format base quantities with this. */
    baseDecimals: number;
    /** Collateral decimals — format prices/collateral amounts with this. */
    quoteDecimals: number;
    /** Price increment, raw quote units per whole base (decimal string). */
    tickSize: string | null;
    /** Quantity increment, raw base units (decimal string). */
    lotSize: string | null;
    /** Minimum order quantity, raw base units (decimal string). */
    minQuantity: string | null;
    /** Last fill price (raw quote per whole base); null until first fill. */
    lastPrice: string | null;
    /** Cross-margin MarginBank holding collateral + positions (lowercased). */
    marginBank: string | null;
    /** Initial margin requirement in bps (500 = 5% = 20x max leverage). */
    initialMarginBps: number | null;
    /**
     *  Funding rate for the last settlement window (1e18-scaled fraction, signed);
     *  null until the first FundingUpdated.
     */
    fundingRate: string | null;
    /** Oracle index price at the last funding update (raw quote per whole base). */
    indexPrice: string | null;
    /**
     *  Per-pool PerpStopOrderRegistry address (lowercased); null if the pool has none.
     *
     *  Here for the same reason it is on {@link SpotPortfolioMarket}: attaching a TP/SL
     *  to a row in this view needs the registry address, and every perp stop write takes
     *  it explicitly. The same column reaches a full market row as `stopRegistry` on
     *  {@link PerpMarket}.
     */
    stopRegistry: string | null;
};
/**
 * One currently-open order in a wallet's perp portfolio.
 *
 * @category perpetual markets
 */
export type PerpPortfolioOrder = {
    /** Order id (`${pool}_${orderId}`). */
    id: string;
    /** uint128 OrderId as a decimal string (pass to trader.cancelOrder). */
    orderId: string;
    /** True = bid (long), false = ask (short). */
    isBid: boolean;
    /** Limit price, raw quote units per whole base. */
    price: string;
    /** Unfilled remainder, raw base units. */
    quantityRemaining: string;
    /** Cumulative filled quantity, raw base units. */
    filledQuantity: string;
    /** Original order size, raw base units. */
    fullQuantity: string;
    /** Timestamp (unix seconds) the order was placed. */
    placedAtTimestamp: string;
    /** Tx hash the order was placed in. */
    placedTxHash: string;
    /** The market the order rests on. */
    market: PerpPortfolioMarket;
};
/**
 * One recent fill the wallet participated in (perp portfolio view).
 *
 * @category perpetual markets
 */
export type PerpPortfolioTrade = {
    /** Fill id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** Execution price, raw quote units per whole base. */
    fillPrice: string;
    /** Base quantity filled, raw units. */
    quantity: string;
    /** Collateral value of the fill (raw, floored). */
    quoteQuantity: string;
    /** Timestamp (unix seconds) of the fill. */
    timestamp: string;
    /** Tx hash the fill landed in. */
    txHash: string;
    /** Whether the account bought (went long) on this fill. */
    isBid: boolean;
    /** Whether the account was the maker (resting) on this fill. */
    asMaker: boolean;
    /** The other party's address, if known. */
    counterparty: string | null;
    /** The market the fill happened on. */
    market: PerpPortfolioMarket;
};
/**
 * A wallet's perp portfolio — the shape {@link SomniaMarketsClient.getPerpPortfolio} returns.
 *
 * @category perpetual markets
 */
export type PerpPortfolio = {
    /** The queried account (lowercased). */
    account: string;
    /** Currently-open perp orders, newest first. */
    openOrders: PerpPortfolioOrder[];
    /** Recent perp fills the account participated in, newest first. */
    trades: PerpPortfolioTrade[];
    /**
     *  The read hit its `tradesLimit`, so fills older than the last entry in `trades` exist
     *  and were NOT returned. Raise `tradesLimit` for the rest.
     *  A total folded from a truncated `trades` covers part of the history only.
     *  False when the page was short, and false for `tradesLimit: 0`, which asks for
     *  no trades at all.
     */
    tradesTruncated: boolean;
    /**
     *  The lower time bound the trades leg was read with, unix seconds — `since` when
     *  passed, otherwise now minus seven days (`DEFAULT_TRADES_SINCE_SEC`). Echoed so a UI can
     *  label the list and a caller can page further back. Orders are not windowed.
     */
    tradesSince: number;
};
/**
 *  Everything the indexer knows about a wallet's perp activity: currently-open
 *  perp orders and recent perp fills it participated in. Positions/collateral
 *  are NOT here — read them on-chain via getPerpPosition/getMarginAccount.
 *  One round-trip once the registry is warm. The type scope is resolved from a
 *  memoized pool set (a minute's TTL per indexer), so a cold call sends that
 *  look-up first — one extra request for SPOT and PERP, two for BINARY, which is
 *  the complement of both. Throws on indexer failure.
 */
export declare function getPerpPortfolio(account: string, opts: PortfolioOptions | undefined, indexerUrl: IndexerRead.Source): Promise<PerpPortfolio>;
/** Facade-only scope on the orders leg; the public portfolio contract stays unchanged. */
export declare function getScopedOpenOrders(account: string, opts: PortfolioOptions, indexerUrl: IndexerRead.Source, orders: PortfolioScope.OrderScope): Promise<PerpPortfolio["openOrders"]>;
/**
 *  An order status that means the order has stopped working.
 *
 *  `OrderStatus` minus `"Open"`, so a history read cannot be asked for working
 *  orders in the first place — the guard is the type, not a comment.
 *
 * @category perpetual markets
 */
export type TerminalOrderStatus = Exclude<OrderStatus, "Open">;
/**
 *  A terminal (no longer working) perp order — the history counterpart to
 *  {@link PerpPortfolioOrder}, which is open-orders only.
 *
 *  Same fields plus the lifecycle ones that only matter once an order has stopped
 *  working: how it ended and when.
 *
 * @category perpetual markets
 */
export type PerpOrderHistoryRow = PerpPortfolioOrder & {
    /**
     *  How the order ended.
     *
     *  `Closed` is terminal, not transitional: every pool places an order as `Closed`
     *  and a following `OrderRested` promotes it to `Open`, so an IOC that partially
     *  filled without resting stays `Closed` forever. Reading it as "still working"
     *  would show a finished order as live.
     */
    status: OrderStatus;
    /** Whether the order ever rested on the book (an `OrderRested` fired). */
    rested: boolean;
    /**
     * Why the protocol cancelled this order. Null on an owner cancel or on an
     * order that ended without cancellation. A `Cancelled` row with null here
     * was cancelled by its owner.
     */
    cancelReason: string | null;
    /**
     *  Expiry as a uint64 NANOsecond timestamp (decimal string) — note the unit, the
     *  rest of this row is unix seconds. GTC carries `type(uint64).max`.
     */
    expireTimestampNs: string;
    /** Unix seconds of the last state change — effectively when the order ended. */
    lastUpdatedAtTimestamp: string;
};
/**
 *  An account's FINISHED perp orders, most-recently-ended first — the history tab
 *  behind `client.getPerpPortfolio`'s open-orders list.
 *
 *  Indexer tier. `getPerpPortfolio` hard-filters `status = "Open"`, so before this
 *  there was no way to see a filled, cancelled or expired perp order at all.
 *
 *  Excludes working orders by default (`status != "Open"`), which is what "history"
 *  means; pass `status` to narrow to particular outcomes.
 *
 *  Sorted by when each order **ENDED** by default: a long-resting order that just
 *  filled belongs at the top of a history view, not buried at its placement date.
 *  Pass `orderBy: "placed"` for placement order instead — the two genuinely differ
 *  for anything that rested, and reconciling against a placement-time record (a tx
 *  log, a strategy's own book) wants the placement axis.
 *
 *  Selects the deployed `cancelReason` field without the amend-linkage fields
 *  this history view does not need. The reason is null on owner cancellations
 *  and on orders that did not end by cancellation; check `status` first.
 *
 * **Details**
 *
 * - `account`: the order owner
 * - `opts.pool`: restrict to one perp pool
 * - `opts.status`: restrict to particular terminal statuses
 * - `opts.orderBy`: `"ended"` (default) or `"placed"`
 * - `opts.limit`: max rows, default 100
 * - `opts.offset`: row offset for paging, default 0
 */
export declare function listPerpOrderHistory(account: string, opts: {
    pool?: string;
    status?: TerminalOrderStatus[];
    orderBy?: "ended" | "placed";
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<PerpOrderHistoryRow[]>;
