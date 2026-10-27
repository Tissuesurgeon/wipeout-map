import * as IndexerRead from "../indexerRead.js";
import type { SpotStopOrder } from "./stops.js";
import { type PortfolioOptions } from "../binary/portfolio.js";
import * as PortfolioScope from "../portfolioScope.js";
/**
 * Spot market context attached to spot portfolio rows. id == poolAddress.
 *
 * @category spot markets
 */
export type SpotPortfolioMarket = {
    /** Pool address (lowercased; == the market id for spot). */
    poolAddress: string;
    /** Base token symbol; null when the token exposes none. */
    baseSymbol: string | null;
    /** Quote token symbol; null when the token exposes none. */
    quoteSymbol: string | null;
    /** Base ERC-20 address (lowercased). */
    baseToken: string | null;
    /** Quote ERC-20 address (lowercased). */
    quoteToken: string | null;
    /** Base-token decimals — format base quantities with this. */
    baseDecimals: number;
    /** Quote-token decimals — format prices/quote amounts with this. */
    quoteDecimals: number;
    /** True when the base is the chain's native token. */
    baseIsNative: boolean | null;
    /** Price increment, raw quote units per whole base (decimal string). */
    tickSize: string | null;
    /** Quantity increment, raw base units (decimal string). */
    lotSize: string | null;
    /** Minimum order quantity, raw base units (decimal string). */
    minQuantity: string | null;
    /** Last fill price (raw quote per whole base); null until first fill. */
    lastPrice: string | null;
    /** EMA-smoothed mark price (raw quote per whole base); null until first set. */
    markPrice: string | null;
    /** Per-pool SpotStopOrderRegistry address (lowercased); null if the pool has none. */
    stopRegistry: string | null;
};
/**
 * One currently-open order in a wallet's spot portfolio.
 *
 * @category spot markets
 */
export type SpotPortfolioOrder = {
    /** Order id (`${pool}_${orderId}`). */
    id: string;
    /** uint128 OrderId as a decimal string (pass to trader.cancelOrder). */
    orderId: string;
    /** True = bid (buy base), false = ask (sell base). */
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
    market: SpotPortfolioMarket;
};
/**
 * One recent fill the wallet participated in (spot portfolio view).
 *
 * @category spot markets
 */
export type SpotPortfolioTrade = {
    /** Fill id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** Execution price, raw quote units per whole base. */
    fillPrice: string;
    /** Base quantity filled, raw units. */
    quantity: string;
    /** Quote value of the fill (raw, floored). */
    quoteQuantity: string;
    /** Timestamp (unix seconds) of the fill. */
    timestamp: string;
    /** Tx hash the fill landed in. */
    txHash: string;
    /** Whether the account bought the base asset on this fill. */
    isBid: boolean;
    /** Whether the account was the maker (resting) on this fill. */
    asMaker: boolean;
    /** The other party's address, if known. */
    counterparty: string | null;
    /** The market the fill happened on. */
    market: SpotPortfolioMarket;
};
/**
 * A wallet's spot portfolio — the shape {@link SomniaMarketsClient.getSpotPortfolio} returns.
 *
 * @category spot markets
 */
export type SpotPortfolio = {
    /** The queried account (lowercased). */
    account: string;
    /** Currently-open spot orders, newest first. */
    openOrders: SpotPortfolioOrder[];
    /** Currently-PENDING stop orders across the wallet's spot markets. */
    stopOrders: SpotStopOrder[];
    /** Recent spot fills the account participated in, newest first. */
    trades: SpotPortfolioTrade[];
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
 *  Everything the indexer knows about a wallet's spot activity: currently-open
 *  spot orders and recent spot fills it participated in (as maker via `maker`,
 *  or taker via the denormalized `taker`). Token holdings are NOT here — those
 *  are on-chain ERC-20 balances; read them with getErc20Balance/getNativeBalance.
 *  One round-trip once the registry is warm. The type scope is resolved from a
 *  memoized pool set (a minute's TTL per indexer), so a cold call sends that
 *  look-up first — one extra request for SPOT and PERP, two for BINARY, which is
 *  the complement of both. Throws on indexer failure.
 */
export declare function getSpotPortfolio(account: string, opts: PortfolioOptions | undefined, indexerUrl: IndexerRead.Source): Promise<SpotPortfolio>;
/** Facade-only scope on the orders leg; the public portfolio contract stays unchanged. */
export declare function getScopedOpenOrders(account: string, opts: PortfolioOptions, indexerUrl: IndexerRead.Source, orders: PortfolioScope.OrderScope): Promise<SpotPortfolio["openOrders"]>;
