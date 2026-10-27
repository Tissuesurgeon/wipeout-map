// Market-order quoting over a unified (human-unit) book — the presentation
// plane's "what will this order actually do" math, upstreamed from the
// DreamDex web app so every consumer frontend doesn't hand-roll it.
//
// Everything here is PURE and kind-neutral by construction: it operates on
// [price, amount][] levels, so it serves spot books, perp books, and binary
// outcome books alike (feed it the tradable's lensed view). What it does NOT
// know about is the cost semantics of the order that follows — a spot buy
// escrows quote, a perp buy locks margin — which stay with the per-kind
// write paths.

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

interface WalkResult {
  totalBase: number;
  totalQuote: number;
  levelsConsumed: number;
}

/** Walk levels until `baseBudget` base units fill, accumulating quote cost. */
function walkConsumingBase(levels: UnifiedBookLevels, baseBudget: number): WalkResult | null {
  let remainingBase = baseBudget;
  let totalBase = 0;
  let totalQuote = 0;
  let levelsConsumed = 0;

  for (const [price, qty] of levels) {
    if (price <= 0) continue; // not a real crossing; would distort the average
    const fillAtLevel = Math.min(remainingBase, qty);
    totalBase += fillAtLevel;
    totalQuote += fillAtLevel * price;
    remainingBase -= fillAtLevel;
    if (fillAtLevel > 0) levelsConsumed += 1;
    if (remainingBase <= 0) break;
  }

  return totalBase === 0 ? null : { totalBase, totalQuote, levelsConsumed };
}

/** Walk levels until `quoteBudget` quote units spend, accumulating base. */
function walkConsumingQuote(levels: UnifiedBookLevels, quoteBudget: number): WalkResult | null {
  let remainingQuote = quoteBudget;
  let totalBase = 0;
  let totalQuote = 0;
  let levelsConsumed = 0;

  for (const [price, qty] of levels) {
    if (price <= 0) continue; // not a real crossing; 0/0 below would NaN-poison the walk
    const levelCost = qty * price;
    const fillAtLevel = Math.min(remainingQuote, levelCost);
    totalBase += fillAtLevel / price;
    totalQuote += fillAtLevel;
    remainingQuote -= fillAtLevel;
    if (fillAtLevel > 0) levelsConsumed += 1;
    if (remainingQuote <= 0) break;
  }

  return totalBase === 0 ? null : { totalBase, totalQuote, levelsConsumed };
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
export function estimateMarketOrder(
  book: UnifiedOrderBook,
  side: "buy" | "sell",
  amount: number,
  denomination: QuoteDenomination = "base",
): MarketOrderEstimate | null {
  if (amount <= 0) return null;

  const levels = side === "buy" ? book.asks : book.bids;
  if (levels.length === 0) return null;

  const filled = denomination === "quote" ? walkConsumingQuote(levels, amount) : walkConsumingBase(levels, amount);
  if (!filled || filled.totalBase === 0) return null;

  return {
    averagePrice: filled.totalQuote / filled.totalBase,
    baseFilled: filled.totalBase,
    quoteFilled: filled.totalQuote,
    levelsConsumed: filled.levelsConsumed,
  };
}

/**
 * Midpoint of the book's best bid/ask, or null when either side is empty.
 *
 * @category quoting
 */
export function bookMidPrice(book: UnifiedOrderBook): number | null {
  const bestBid = book.bids[0]?.[0];
  const bestAsk = book.asks[0]?.[0];
  return bestBid !== undefined && bestAsk !== undefined ? (bestBid + bestAsk) / 2 : null;
}

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
export function fillsWithinSlippage(
  book: UnifiedOrderBook,
  side: "buy" | "sell",
  amount: number,
  slippage: number,
  denomination: QuoteDenomination = "base",
): boolean {
  const mid = bookMidPrice(book);
  if (amount <= 0 || mid === null) return false;

  const isBuy = side === "buy";
  const levels = isBuy ? book.asks : book.bids;
  const boundPrice = isBuy ? mid * (1 + slippage) : mid * (1 - slippage);

  let capacity = 0;
  for (const [price, qty] of levels) {
    if (isBuy ? price > boundPrice : price < boundPrice) break;
    capacity += denomination === "quote" ? qty * price : qty;
    if (capacity >= amount) return true;
  }

  return capacity >= amount;
}
