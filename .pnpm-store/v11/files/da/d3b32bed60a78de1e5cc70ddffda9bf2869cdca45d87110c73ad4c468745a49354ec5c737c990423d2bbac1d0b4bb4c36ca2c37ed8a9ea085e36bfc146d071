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
import { DEFAULT_TRADES_LIMIT } from "../binary/portfolio.js";
import * as PortfolioScope from "../portfolioScope.js";
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
export async function getPerpPortfolio(account, opts = {}, indexerUrl) {
    return readPortfolio(account, opts, indexerUrl);
}
/** Facade-only scope on the orders leg; the public portfolio contract stays unchanged. */
export async function getScopedOpenOrders(account, opts, indexerUrl, orders) {
    return (await readPortfolio(account, opts, indexerUrl, orders)).openOrders;
}
async function readPortfolio(account, opts = {}, indexerUrl, orders) {
    const acct = account.toLowerCase();
    const { since, fillWhere, orderWhere } = await PortfolioScope.portfolioScope("PERP", acct, opts, indexerUrl, orders);
    const tradesLimit = opts.tradesLimit ?? DEFAULT_TRADES_LIMIT;
    const data = await IndexerRead.gqlRequest(PerpPortfolioQuery, { fillWhere, orderWhere, ordersLimit: opts.ordersLimit ?? 200, tradesLimit }, indexerUrl);
    const trades = IndexerRead.narrowIndexerInvariant(data.PerpFill.map((f) => {
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
    }));
    return {
        account: acct,
        openOrders: IndexerRead.narrowIndexerInvariant(data.PerpOrder),
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
export async function listPerpOrderHistory(account, opts = {}, indexerUrl) {
    // Scoped on `market_id`, not the `market` relationship — see pools.ts, "type scope, as pools".
    const where = {
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
    const requested = opts.status ?? [];
    const terminal = requested.filter((st) => st !== "Open");
    where.status = terminal.length > 0 ? { _in: terminal } : { _neq: "Open" };
    // `id` is the tiebreaker, and it is load-bearing rather than cosmetic. Both sort
    // columns are unix SECONDS, so a batch cancel or one busy block gives many orders the
    // identical key — and Postgres does not promise a stable order among equal keys. With
    // `limit`/`offset` paging over an unstable sort, rows can repeat on one page and never
    // appear on any other: a history that silently loses orders.
    const orderBy = opts.orderBy === "placed"
        ? [{ placedAtTimestamp: "desc" }, { id: "desc" }]
        : [{ lastUpdatedAtTimestamp: "desc" }, { id: "desc" }];
    const data = await IndexerRead.gqlRequest(PerpOrderHistoryQuery, { where, orderBy, limit: opts.limit ?? 100, offset: opts.offset ?? 0 }, indexerUrl);
    return IndexerRead.narrowIndexerInvariant(data.Order);
}
