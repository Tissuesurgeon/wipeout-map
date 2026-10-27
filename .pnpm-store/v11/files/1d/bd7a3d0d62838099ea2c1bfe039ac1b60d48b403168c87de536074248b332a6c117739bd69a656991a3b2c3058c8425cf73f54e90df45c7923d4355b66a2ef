import type { UnifiedOrderBook } from "./structs.js";
/**
 * One side of a unified book: [price, amount] pairs, best first.
 *
 * @category quoting
 */
export type UnifiedBookLevels = UnifiedOrderBook["bids"];
/**
 * Which unit an order size is expressed in.
 *
 * @category quoting
 */
export type QuoteDenomination = "base" | "quote";
/**
 * A market-order fill estimate from walking the book, human units.
 *
 * @category quoting
 */
export interface MarketOrderEstimate {
    /** Volume-weighted average fill price (Σ quote / Σ base). */
    averagePrice: number;
    /** Base units the walk filled. */
    baseFilled: number;
    /** Quote units the walk exchanged (Σ qty·price). */
    quoteFilled: number;
    /**
     *  Book levels the order crosses. Each matched level is a fill and
     *  execution gas scales with it — the signal for sizing a gas limit ahead
     *  of submission.
     */
    levelsConsumed: number;
}
/**
 *  Estimate a market order's execution by walking one side of the book:
 *  buys walk the asks, sells walk the bids, consuming `amount` in either the
 *  base or the quote denomination. The four combinations:
 *
 *  - buy  + quote — spend a quote budget, learn the base received.
 *  - buy  + base  — target a base size, learn the quote cost.
 *  - sell + base  — deliver a base size, learn the quote received.
 *  - sell + quote — target quote proceeds, learn the base sold.
 *
 *  Returns `null` when the relevant side is empty or `amount` is
 *  non-positive. A partial walk (book thinner than the order) returns what
 *  WOULD fill — compare `baseFilled`/`quoteFilled` against the request to
 *  detect it.
 *
 * @category quoting
 */
export declare function estimateMarketOrder(book: UnifiedOrderBook, side: "buy" | "sell", amount: number, denomination?: QuoteDenomination): MarketOrderEstimate | null;
/**
 * Midpoint of the book's best bid/ask, or null when either side is empty.
 *
 * @category quoting
 */
export declare function bookMidPrice(book: UnifiedOrderBook): number | null;
/**
 *  Whether a market order of `amount` (in `denomination`) fills COMPLETELY
 *  within `slippage` of the mid price: buys spend against asks at or below
 *  `mid·(1+slippage)`, sells deliver into bids at or above `mid·(1−slippage)`.
 *  Levels are sorted best-first, so the first level outside the band ends the
 *  walk. False when the book is empty, the mid is unknown, or the in-band
 *  liquidity can't cover the size — the caller should refuse the order rather
 *  than fill deep.
 *
 * @category quoting
 */
export declare function fillsWithinSlippage(book: UnifiedOrderBook, side: "buy" | "sell", amount: number, slippage: number, denomination?: QuoteDenomination): boolean;
