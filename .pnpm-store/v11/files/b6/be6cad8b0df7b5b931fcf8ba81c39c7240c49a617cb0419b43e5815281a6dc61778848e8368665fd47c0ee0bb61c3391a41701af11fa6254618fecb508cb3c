// Spot portfolio — holdings, orders and trades for spot markets.
//
// SPOT-ONLY as an indexer shape: spot has no per-account balance entity (holdings
// are plain ERC-20s in the wallet — see balances.ts), so the portfolio is assembled
// from orders, trades and the market's own token metadata. Binary's equivalent
// reads outcome-token positions; perp's reads cross-margin collateral.
import * as IndexerRead from "../indexerRead.js";
import { graphql } from "../gql/gql.js";
import { DEFAULT_TRADES_LIMIT } from "../binary/portfolio.js";
import * as PortfolioScope from "../portfolioScope.js";
/** Spot market context attached to spot orders, stop orders and trades. */
// prettier-ignore
const SpotPortfolioMarketFields = graphql(`
  fragment SpotPortfolioMarketFields on Market {
    poolAddress
    baseSymbol
    quoteSymbol
    baseToken
    quoteToken
    baseDecimals
    quoteDecimals
    baseIsNative
    tickSize
    lotSize
    minQuantity
    lastPrice
    markPrice
    stopRegistry
  }
`);
/**
 *  Everything the indexer knows about a wallet's spot activity: currently-open
 *  spot orders and recent spot fills it participated in (as maker via `maker`,
 *  or taker via the denormalized `taker`). Token holdings are NOT here — those
 *  are on-chain ERC-20 balances; read them with getErc20Balance/getNativeBalance.
 *  One round-trip once the registry is warm. The type scope is resolved from a
 *  memoized pool set (a minute's TTL per indexer), so a cold call sends that
 *  look-up first — one extra request for SPOT and PERP, two for BINARY, which is
 *  the complement of both. Throws on indexer failure.
 */
export async function getSpotPortfolio(account, opts = {}, indexerUrl) {
    return readPortfolio(account, opts, indexerUrl);
}
/** Facade-only scope on the orders leg; the public portfolio contract stays unchanged. */
export async function getScopedOpenOrders(account, opts, indexerUrl, orders) {
    return (await readPortfolio(account, opts, indexerUrl, orders)).openOrders;
}
async function readPortfolio(account, opts = {}, indexerUrl, orders) {
    const acct = account.toLowerCase();
    const { since, fillWhere, orderWhere } = await PortfolioScope.portfolioScope("SPOT", acct, opts, indexerUrl, orders);
    const tradesLimit = opts.tradesLimit ?? DEFAULT_TRADES_LIMIT;
    const data = await IndexerRead.gqlRequest(SpotPortfolioQuery, { acct, fillWhere, orderWhere, ordersLimit: opts.ordersLimit ?? 200, tradesLimit }, indexerUrl);
    const trades = IndexerRead.narrowIndexerInvariant(data.SpotFill.map((f) => {
        const asMaker = (f.maker ?? "").toLowerCase() === acct;
        const takerIsBid = f.takerIsBid ?? false;
        return {
            id: f.id,
            fillPrice: f.fillPrice,
            quantity: f.quantity,
            quoteQuantity: f.quoteQuantity,
            timestamp: f.timestamp,
            txHash: f.txHash,
            // The taker bought base iff takerIsBid; the maker took the opposite side.
            isBid: asMaker ? !takerIsBid : takerIsBid,
            asMaker,
            counterparty: asMaker ? (f.taker ?? null) : (f.maker ?? null),
            market: f.market,
        };
    }));
    return {
        account: acct,
        openOrders: IndexerRead.narrowIndexerInvariant(data.SpotOrder),
        stopOrders: IndexerRead.narrowIndexerInvariant(data.SpotStopOrder),
        trades,
        // Newest-first page: a FULL page means older fills were dropped, not that trading stopped.
        // `tradesLimit: 0` asks for no trades at all, so an empty list there is complete, not cut.
        tradesTruncated: tradesLimit > 0 && trades.length >= tradesLimit,
        tradesSince: since,
    };
}
// prettier-ignore
const SpotPortfolioQuery = graphql(`
  query SpotPortfolio(
    $acct: String!
    $fillWhere: Fill_bool_exp!
    $orderWhere: Order_bool_exp!
    $ordersLimit: Int
    $tradesLimit: Int
  ) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    SpotOrder: Order(
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
        ...SpotPortfolioMarketFields
      }
    }
    SpotStopOrder: StopOrder(
      where: { owner: { _eq: $acct }, status: { _eq: "PENDING" } }
      order_by: { createdAt: desc }
      limit: $ordersLimit
    ) {
      ...SpotStopOrderFields
      market {
        ...SpotPortfolioMarketFields
      }
    }
    SpotFill: Fill(where: $fillWhere, order_by: { timestamp: desc }, limit: $tradesLimit) {
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
        ...SpotPortfolioMarketFields
      }
    }
  }
`);
