// Perp portfolio — positions and orders for perp markets.
//
// PERP-ONLY as an indexer shape. Note what is NOT here: positions' collateral
// lives cross-margin in the MarginBank (see margin.ts), so this view is about
// exposure per market while the account's health is a single account-wide number.

// ============================================================================
// Perp portfolio. Positions + collateral are NOT here — those live cross-margin
// in the MarginBank and are read on-chain (getPerpPosition/getMarginAccount).
// The indexer knows a wallet's open perp orders and fills.
// ============================================================================

import * as IndexerRead from "../indexerRead.js";
import * as Pools from "../pools.js";
import { graphql } from "../gql/gql.js";
import { DEFAULT_TRADES_LIMIT, type PortfolioOptions } from "../binary/portfolio.js";
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

/** Perp market context attached to perp orders and trades. */
// prettier-ignore
const PerpPortfolioMarketFields = graphql(`
  fragment PerpPortfolioMarketFields on Market {
    poolAddress
    baseSymbol
    quoteSymbol
    baseDecimals
    quoteDecimals
    tickSize
    lotSize
    minQuantity
    lastPrice
    marginBank
    initialMarginBps
    fundingRate
    indexPrice
    stopRegistry
  }
`);

/**
 *  Everything the indexer knows about a wallet's perp activity: currently-open
 *  perp orders and recent perp fills it participated in. Positions/collateral
 *  are NOT here — read them on-chain via getPerpPosition/getMarginAccount.
 *  One round-trip once the registry is warm. The type scope is resolved from a
 *  memoized pool set (a minute's TTL per indexer), so a cold call sends that
 *  look-up first — one extra request for SPOT and PERP, two for BINARY, which is
 *  the complement of both. Throws on indexer failure.
 */
export async function getPerpPortfolio(
  account: string,
  opts: PortfolioOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpPortfolio> {
  return readPortfolio(account, opts, indexerUrl);
}

/** Facade-only scope on the orders leg; the public portfolio contract stays unchanged. */
export async function getScopedOpenOrders(
  account: string,
  opts: PortfolioOptions,
  indexerUrl: IndexerRead.Source,
  orders: PortfolioScope.OrderScope,
): Promise<PerpPortfolio["openOrders"]> {
  return (await readPortfolio(account, opts, indexerUrl, orders)).openOrders;
}

async function readPortfolio(
  account: string,
  opts: PortfolioOptions = {},
  indexerUrl: IndexerRead.Source,
  orders?: PortfolioScope.OrderScope,
): Promise<PerpPortfolio> {
  const acct = account.toLowerCase();
  const { since, fillWhere, orderWhere } = await PortfolioScope.portfolioScope("PERP", acct, opts, indexerUrl, orders);
  const tradesLimit = opts.tradesLimit ?? DEFAULT_TRADES_LIMIT;
  const data = await IndexerRead.gqlRequest(
    PerpPortfolioQuery,
    { fillWhere, orderWhere, ordersLimit: opts.ordersLimit ?? 200, tradesLimit },
    indexerUrl,
  );

  const trades: PerpPortfolioTrade[] = IndexerRead.narrowIndexerInvariant(
    data.PerpFill.map((f) => {
      const asMaker = (f.maker ?? "").toLowerCase() === acct;
      const takerIsBid = f.takerIsBid ?? false;
      return {
        id: f.id,
        fillPrice: f.fillPrice,
        quantity: f.quantity,
        quoteQuantity: f.quoteQuantity,
        timestamp: f.timestamp,
        txHash: f.txHash,
        isBid: asMaker ? !takerIsBid : takerIsBid,
        asMaker,
        counterparty: asMaker ? (f.taker ?? null) : (f.maker ?? null),
        market: f.market,
      };
    }),
  );

  return {
    account: acct,
    openOrders: IndexerRead.narrowIndexerInvariant<PerpPortfolioOrder>(data.PerpOrder),
    trades,
    // Newest-first page: a FULL page means older fills were dropped, not that trading stopped.
    // `tradesLimit: 0` asks for no trades at all, so an empty list there is complete, not cut.
    tradesTruncated: tradesLimit > 0 && trades.length >= tradesLimit,
    tradesSince: since,
  };
}

// prettier-ignore
const PerpPortfolioQuery = graphql(`
  query PerpPortfolio(
    $fillWhere: Fill_bool_exp!
    $orderWhere: Order_bool_exp!
    $ordersLimit: Int
    $tradesLimit: Int
  ) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    PerpOrder: Order(
      where: $orderWhere
      order_by: { placedAtTimestamp: desc }
      limit: $ordersLimit
    ) {
      id
      orderId
      isBid
      price
      quantityRemaining
      filledQuantity
      fullQuantity
      placedAtTimestamp
      placedTxHash
      market {
        ...PerpPortfolioMarketFields
      }
    }
    PerpFill: Fill(where: $fillWhere, order_by: { timestamp: desc }, limit: $tradesLimit) {
      id
      fillPrice
      quantity
      quoteQuantity
      timestamp
      txHash
      maker
      taker
      takerIsBid
      market {
        ...PerpPortfolioMarketFields
      }
    }
  }
`);

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

// prettier-ignore
const PerpOrderHistoryQuery = graphql(`
  query PerpOrderHistory($where: Order_bool_exp!, $orderBy: [Order_order_by!], $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Order(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
      id
      orderId
      isBid
      price
      quantityRemaining
      filledQuantity
      fullQuantity
      status
      rested
      cancelReason
      expireTimestampNs
      placedAtTimestamp
      placedTxHash
      lastUpdatedAtTimestamp
      market {
        ...PerpPortfolioMarketFields
      }
    }
  }
`);

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
export async function listPerpOrderHistory(
  account: string,
  opts: {
    pool?: string;
    status?: TerminalOrderStatus[];
    orderBy?: "ended" | "placed";
    limit?: number;
    offset?: number;
  } = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpOrderHistoryRow[]> {
  // Scoped on `market_id`, not the `market` relationship — see pools.ts, "type scope, as pools".
  const where: Record<string, unknown> = {
    owner: { _eq: account.toLowerCase() },
    ...(await Pools.marketScope({ pool: opts.pool, marketType: "PERP" }, indexerUrl)),
  };
  // Only the fields that are set: a bare `{_in: undefined}` serializes away and
  // `{_in: null}` means IS NULL, either of which silently returns the wrong rows.
  //
  // "Open" is filtered rather than trusted. The type already excludes it, but a JS
  // caller can still pass it, and letting it through would put WORKING orders in a
  // read whose whole contract is that they are finished. An all-"Open" request
  // degrades to the default rather than to `{_in: []}`, which matches nothing.
  // Widened deliberately: the parameter type already excludes "Open", so TS would
  // call the check dead — but the type only binds TS callers, and this read's
  // contract has to hold for JS ones too.
  const requested: readonly OrderStatus[] = opts.status ?? [];
  const terminal = requested.filter((st): st is TerminalOrderStatus => st !== "Open");
  where.status = terminal.length > 0 ? { _in: terminal } : { _neq: "Open" };
  // `id` is the tiebreaker, and it is load-bearing rather than cosmetic. Both sort
  // columns are unix SECONDS, so a batch cancel or one busy block gives many orders the
  // identical key — and Postgres does not promise a stable order among equal keys. With
  // `limit`/`offset` paging over an unstable sort, rows can repeat on one page and never
  // appear on any other: a history that silently loses orders.
  const orderBy =
    opts.orderBy === "placed"
      ? [{ placedAtTimestamp: "desc" as const }, { id: "desc" as const }]
      : [{ lastUpdatedAtTimestamp: "desc" as const }, { id: "desc" as const }];
  const data = await IndexerRead.gqlRequest(
    PerpOrderHistoryQuery,
    { where, orderBy, limit: opts.limit ?? 100, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return IndexerRead.narrowIndexerInvariant<PerpOrderHistoryRow>(data.Order);
}
