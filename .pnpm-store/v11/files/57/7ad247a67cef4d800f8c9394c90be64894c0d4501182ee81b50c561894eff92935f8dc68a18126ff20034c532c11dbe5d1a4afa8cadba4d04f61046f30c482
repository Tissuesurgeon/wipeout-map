// Derived reads — the P1 analytics bundle a frontend needs for a full-lifecycle
// up/down prediction-market product. Everything here is DERIVED from data the
// SDK already surfaces (the live book, candles, fills, portfolio) — no new
// indexer field. The pure kernels live here (testable in isolation over plain
// inputs); createClient.ts wires them to the live store + indexer reads.
//
// Unit conventions match the rest of the read surface: RAW integer units
// (collateral/outcome-token base units) as bigints; the caller formats with the
// market's `quoteDecimals` (never a hard-coded 6). YES/NO price inversion:
// a binary book is quoted in YES terms; the NO price is `oneCollateral − yesPrice`.

import type { BookLevel } from "./store.js";
import type { BinaryOrderBook } from "./orders.js";
import type { BinarySide } from "./store.js";
import type { BinaryMarket } from "./markets.js";
import type { RouterActionRecord } from "./router.js";
import type { Candle } from "./candles.js";
import { IndexerError, InvalidInputError } from "./errors.js";
import type { FillRow } from "./fills.js";
import * as Units from "./units.js";
import type { YesBookTop } from "./units.js";

// ============================================================================
// B1 — quoteBinaryOrder: market-order preview over the live book
// ============================================================================

/**
 *  The result of quoting a market order against the live book — the
 *  "you'll pay ~$X, average Y, slippage Z" preview. All prices/amounts are RAW
 *  units in the OUTCOME's own terms (a BUY_NO quote is priced in NO terms).
 *
 * @category analytics
 */
export interface BinaryOrderQuote {
  /**
   *  Volume-weighted average fill price (raw units per whole outcome token),
   *  in the quoted outcome's terms. `0n` if nothing fills.
   */
  avgPrice: bigint;
  /**
   *  Total cost for a BUY (raw collateral paid) / total proceeds for a SELL
   *  (raw collateral received) = Σ(levelQty × levelPrice) / oneCollateral.
   */
  cost: bigint;
  /**
   *  How much of `quantity` actually crosses the resting book (raw outcome
   *  units). Less than `quantity` when the book is too thin to fill it all.
   */
  filledQuantity: bigint;
  /**
   *  The unfilled remainder that would rest as a maker order (raw outcome
   *  units) — `quantity − filledQuantity`.
   */
  wouldRest: bigint;
  /** Number of price levels the order consumed (partially or fully). */
  levelsConsumed: number;
  /**
   *  Signed slippage of `avgPrice` vs the book mid, in raw price units
   *  (avgPrice − mid for a buy; mid − avgPrice for a sell — positive = worse
   *  than mid). `0n` if the book has no mid (a side is empty) or nothing fills.
   */
  slippageVsMid: bigint;
}

/**
 *  Pick the resting levels a market order on `side` crosses, in the outcome's
 *  own price terms. A BUY consumes the opposite side's ASKS; a SELL consumes the
 *  BIDS. The book already carries the NO sides pre-inverted (`toBinaryBook`), so
 *  BUY_NO simply consumes `noAsks` — no per-level inversion needed here.
 */
function levelsToCross(book: BinaryOrderBook, side: BinarySide): BookLevel[] {
  switch (side) {
    case "BUY_YES":
      return book.yesAsks;
    case "SELL_YES":
      return book.yesBids;
    case "BUY_NO":
      return book.noAsks;
    case "SELL_NO":
      return book.noBids;
  }
}

/**
 *  The book mid in the outcome's own terms: (bestBid + bestAsk) / 2. `null` if
 *  either side is empty (no two-sided market → no meaningful mid).
 */
function bookMid(book: BinaryOrderBook, side: BinarySide): bigint | null {
  const isNo = side === "BUY_NO" || side === "SELL_NO";
  const bids = isNo ? book.noBids : book.yesBids;
  const asks = isNo ? book.noAsks : book.yesAsks;
  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  if (bestBid == null || bestAsk == null) return null;
  return (bestBid + bestAsk) / 2n;
}

/**
 *  Walk the live book crossing the opposite side for a market order of
 *  `quantity` on `side` — the pure kernel behind `client.quoteBinaryOrder`.
 *  `oneCollateral = 10^quoteDecimals` (full collateral = a share worth 1).
 *
 * @category analytics
 */
export function quoteBinaryOrderOverBook(
  book: BinaryOrderBook,
  side: BinarySide,
  quantity: bigint,
  oneCollateral: bigint,
): BinaryOrderQuote {
  const levels = levelsToCross(book, side);
  let remaining = quantity > 0n ? quantity : 0n;
  let cost = 0n;
  let filled = 0n;
  let levelsConsumed = 0;
  for (const lvl of levels) {
    if (remaining <= 0n) break;
    const take = lvl.quantity < remaining ? lvl.quantity : remaining;
    if (take <= 0n) continue;
    // Cost in collateral = qty × price / oneCollateral (price is collateral per
    // WHOLE token; qty is raw token units).
    cost += (take * lvl.price) / oneCollateral;
    filled += take;
    remaining -= take;
    levelsConsumed++;
  }
  const avgPrice = filled > 0n ? (cost * oneCollateral) / filled : 0n;
  const mid = bookMid(book, side);
  const isBuy = side === "BUY_YES" || side === "BUY_NO";
  let slippageVsMid = 0n;
  if (mid != null && filled > 0n) {
    slippageVsMid = isBuy ? avgPrice - mid : mid - avgPrice;
  }
  return {
    avgPrice,
    cost,
    filledQuantity: filled,
    wouldRest: quantity > filled ? quantity - filled : 0n,
    levelsConsumed,
    slippageVsMid,
  };
}

// ============================================================================
// B2 — getMarketStats24h: rolling 24h stats from candles
// ============================================================================

/**
 *  A market's trailing-24h activity, derived from OHLCV candle buckets. Prices
 *  are RAW quote units; volume is RAW quote (collateral) units.
 *
 * @category analytics
 */
export interface MarketStats24h {
  /** Σ quote volume over the window (raw collateral units). */
  volume24h: bigint;
  /** Σ base/outcome-token volume over the window (raw base units). */
  baseVolume24h: bigint;
  /** Σ trade count over the window. */
  trades24h: number;
  /**
   *  closePrice(last) − openPrice(first) over the window (raw, signed). `0n`
   *  if fewer than one candle in-window.
   */
  priceChange24h: bigint;
  /** Max high across the window (raw). `null` if no candles in-window. */
  high24h: bigint | null;
  /** Min low across the window (raw). `null` if no candles in-window. */
  low24h: bigint | null;
  /** openPrice of the first in-window candle (raw). `null` if none. */
  openPrice24h: bigint | null;
}

/**
 *  Fold candle buckets whose `bucketStart >= nowSec − 86400` into a
 *  {@link MarketStats24h}. `candles` are oldest-first (as `getCandles` returns).
 *  Pure — the wiring in createClient just fetches the candles first.
 *
 * @category analytics
 */
export function marketStats24hFromCandles(candles: Candle[], nowSec: number): MarketStats24h {
  const cutoff = nowSec - 86_400;
  const win = candles.filter((c) => Number(c.bucketStart) >= cutoff);
  const first = win[0];
  const last = win[win.length - 1];
  if (first === undefined || last === undefined) {
    return {
      volume24h: 0n,
      baseVolume24h: 0n,
      trades24h: 0,
      priceChange24h: 0n,
      high24h: null,
      low24h: null,
      openPrice24h: null,
    };
  }
  let volume24h = 0n;
  let baseVolume24h = 0n;
  let trades24h = 0;
  let high = BigInt(first.high);
  let low = BigInt(first.low);
  for (const c of win) {
    volume24h += BigInt(c.quoteVolume);
    baseVolume24h += BigInt(c.baseVolume);
    trades24h += c.tradeCount;
    const h = BigInt(c.high);
    const l = BigInt(c.low);
    if (h > high) high = h;
    if (l < low) low = l;
  }
  const openPrice24h = BigInt(first.openPrice);
  const closeLast = BigInt(last.closePrice);
  return {
    volume24h,
    baseVolume24h,
    trades24h,
    priceChange24h: closeLast - openPrice24h,
    high24h: high,
    low24h: low,
    openPrice24h,
  };
}

// ============================================================================
// B4 — getBinaryPositionPnL: avg-cost position PnL over a market's fills
// ============================================================================

/**
 *  One outcome's half of a binary position, RAW units — the YES or NO book on
 *  its own, as the fold already computes it before summing into the market
 *  totals.
 *
 *  **Why this exists.** Every money field on {@link BinaryPositionPnL} is
 *  blended across both outcomes, which is unusable for a wallet holding BOTH.
 *  Buy 10 YES at `0.20` and 10 NO at `0.80`, mark YES at `0.40`: the legs are
 *  `+2.00` and `-2.00` and the blended `unrealizedPnl` is `0.00`. Neither
 *  position row can show that zero as its own PnL.
 *
 *  Legs are only reachable through a position row, so the key that names one
 *  (`yes` / `no`) is also the only label it needs.
 *
 *  Legs sum EXACTLY to the totals — `costBasis`, `markValue`, `unrealizedPnl`
 *  and `realizedPnl` are stored here first and added up, so integer division
 *  cannot make a leg disagree with the total it belongs to. `avgCost` and
 *  `markPrice` are per-token rates and do NOT sum.
 *
 * @category analytics
 */
export interface BinaryOutcomePositionPnL {
  /** This outcome's current token balance (raw). */
  balance: bigint;
  /** Remaining cost basis of THIS leg's balance (raw collateral). */
  costBasis: bigint;
  /**
   *  Average cost per whole token of this outcome (raw collateral per token), for
   *  DISPLAY. `0n` when the leg holds nothing. A rate, not an amount: does not sum
   *  across legs.
   *
   *  It is rounded independently of {@link BinaryOutcomePositionPnL.costBasis}, and
   *  the two do NOT reconstruct each other. `costBasis` comes straight off the
   *  aggregate book (`balance * cost / quantity`); this rate floors that same book to
   *  one whole token, and each floor loses a different remainder. They can even
   *  disagree in kind: on a zero-decimal collateral a leg of 5 tokens costing 2 has a
   *  `costBasis` of `2` and an `avgCost` of `0`, because a per-token rate under one
   *  raw unit has nowhere to go.
   *
   *  So value a position with `costBasis`, and show `avgCost`. Deriving either from
   *  the other returns a different number in ~2999 of 3000 awkward-quantity cases,
   *  which is why both are published.
   */
  avgCost: bigint;
  /**
   *  The price this leg is marked at (raw collateral per whole token): the
   *  book-clamped last price while trading, or the settlement payout once
   *  resolved. A rate: does not sum, but while trading the two legs' prices add
   *  up to one whole collateral unit.
   *
   *  `null` when the market has NO price to mark against — it has never traded
   *  and no book top was supplied, so {@link markYesPrice} returns `null`. Do
   *  not read that as `0n`: a zero YES mark is also a FULL-collateral NO mark,
   *  which reports a fabricated total loss on one leg and a fabricated total
   *  gain on the other. {@link markValue} and {@link unrealizedPnl} are `null`
   *  with it, because both are derived from this price.
   */
  markPrice: bigint | null;
  /** Mark value of this leg's balance (raw collateral); `null` when {@link markPrice} is unknown. */
  markValue: bigint | null;
  /** This leg's `markValue - costBasis` (raw, signed); `null` when {@link markPrice} is unknown. */
  unrealizedPnl: bigint | null;
  /** Realized PnL from this outcome's sells (raw, signed). */
  realizedPnl: bigint;
}

/**
 *  An account's position + cost basis + PnL in one binary market, RAW units.
 *  ACCOUNTING ASSUMPTION: weighted-average cost. Cost basis is reconstructed
 *  from the account's order-book fills on the market (buys add cost at the
 *  fill's outcome price; sells realize against the running average) folded with
 *  mint/merge router actions (a complete-set mint adds one YES + one NO at the
 *  split cost `oneCollateral` total; a merge removes a pair at avg cost).
 *  `markValue`/`unrealizedPnl` mark the CURRENT balances to the book-clamped
 *  last price while trading (see {@link markYesPrice}), or to the settlement
 *  payout once resolved.
 *
 * @category analytics
 */
export interface BinaryPositionPnL {
  /** Current YES outcome-token balance (raw). */
  balanceYes: bigint;
  /** Current NO outcome-token balance (raw). */
  balanceNo: bigint;
  /** Total remaining cost basis across both outcomes (raw collateral). */
  costBasis: bigint;
  /**
   *  Blended average cost per whole outcome token held (raw collateral per
   *  token). `0n` when nothing is held.
   */
  avgCost: bigint;
  /**
   *  Mark value of the current balances (raw collateral). `null` when the
   *  market has no price to mark against — see
   *  {@link BinaryOutcomePositionPnL.markPrice}.
   */
  markValue: bigint | null;
  /**
   *  markValue − costBasis (raw, signed). `null` when the market has no price
   *  to mark against — see {@link BinaryOutcomePositionPnL.markPrice}.
   */
  unrealizedPnl: bigint | null;
  /**
   *  Realized PnL from sells (proceeds − avg cost of tokens sold), raw signed.
   *  Best-effort over indexed order-book sell fills (see accounting note).
   */
  realizedPnl: bigint;
  /**
   *  The same position split into its YES and NO books — see
   *  {@link BinaryOutcomePositionPnL} for why every field above is unusable to a
   *  wallet holding both outcomes.
   *
   *  Always present, both legs, even when one holds nothing (a zero-balance leg
   *  can still carry `realizedPnl` from earlier sells). Filter on
   *  `balance > 0n` to list only open legs.
   */
  outcomes: { yes: BinaryOutcomePositionPnL; no: BinaryOutcomePositionPnL };
}

/**
 *  One position-affecting event for the PnL fold, in the account's perspective,
 *  RAW units. Buys/sells are per-outcome; a mint/merge touches BOTH outcomes.
 *
 * @category analytics
 */
export interface PnLEvent {
  /** Order-book buy/sell of one outcome, or a router mint/merge of a complete set. */
  kind: "buy" | "sell" | "mint" | "merge";
  /** 0 = YES, 1 = NO. Ignored for mint/merge (they touch both). */
  outcomeIndex: 0 | 1;
  /** Token quantity (raw). For mint/merge this is the pair (set) amount. */
  quantity: bigint;
  /** Fill price for the fill's own outcome, raw. Ignored for mint/merge. */
  price: bigint;
}

/**
 *  Derive the {@link PnLEvent} stream for `account` from raw {@link FillRow}s
 *  (order-book fills) + {@link RouterActionRecord}s (mint/merge complete sets),
 *  merged into ONE oldest-first timeline so the avg-cost roll sees mints and fills
 *  in the order they happened.
 *
 *  ORDERED BY CHAIN POSITION, not by input order: block, then log index, compared as
 *  exact integers and read from each row's `id`. `timestamp` takes no part - it is
 *  metadata, and two events routinely share one second, so the order rows arrive in is
 *  NOT the order they happened (fills are fetched newest-first) and a buy and a sell in
 *  one second would otherwise fold sell-first and lose the realization to the clamp.
 *
 *  Fills whose side isn't bridged yet are skipped (can't attribute an outcome).
 *  Mint/merge use the record's `amount` (each outcome's set size). Redeem actions are
 *  ignored (they settle the position at payout, they don't change cost basis of a
 *  still-open book).
 *
 *  SCOPE IS THE CALLER'S JOB: no market filter is applied here, so pass ONE
 *  market's fills, selected by `FillRow.market` (never by `pool` — see there).
 *
 *  **Errors**
 *
 *  Throws {@link InvalidInputError} when a row carries a malformed number. Two cases:
 *
 *  - an `id` that is not `` `${blockNumber}_${logIndex}` ``, so the row cannot be placed
 *    in chain order;
 *  - a `quantity`, `fillPrice` or mint/merge `amount` that is not a number.
 *
 *  EVERY one of those must be an UNSIGNED DECIMAL run — `BigInt` alone would read `""`,
 *  a sign, or an `0x`/`0o`/`0b` prefix, silently sorting a row somewhere it does not
 *  belong or folding a quantity nobody wrote. `timestamp` is NOT read: it is metadata,
 *  and ordering on it would let a wrong one override the position it disagrees with.
 *
 *  Rows from `getUserFills` and the router-action reads always satisfy this; a caller
 *  assembling its own rows must. Nothing is defaulted, because a defaulted value
 *  silently changes an average-cost roll and returns a wrong basis.
 *
 * @category analytics
 */
export function pnlEventsFor(account: string, fills: FillRow[], routerActions: RouterActionRecord[]): PnLEvent[] {
  const acct = account.toLowerCase();
  // Ordered by (block, log) ALONE - the chain position both row ids already encode.
  // `getUserFills` returns newest-first and `Array.sort` is stable, so sorting on the
  // timestamp left same-second rows in REVERSE chain order: a buy and a sell in one
  // second applied sell-first, where the clamp discards it and the realization is lost.
  // The indexer folds in log order, so this is also what keeps the two in lockstep.
  //
  // The timestamp is NOT a tiebreak ahead of them, it is metadata. Ordering on it first
  // lets a wrong one override the position it disagrees with - block 500 stamped 200
  // would fold after block 501 stamped 100 - and it can never help, because a chain's
  // timestamps are monotonic in block height, so it only ever agrees or is corrupt.
  //
  // Parsed as bigint, not through `Number`: a block position is a protocol quantity and
  // must stay exact. Above 2^53 two distinct ids would round to the same value and the
  // fold would go back to ordering them arbitrarily - the very failure this prevents.
  //
  // Malformed input is REJECTED, not coerced. Defaulting a bad id to zero silently moves
  // that event to the front of the timeline, which reorders an average-cost roll and
  // returns a wrong basis with no indication anything went wrong. A caller with corrupt
  // rows needs to know.
  //
  // EVERY numeric field the stream carries goes through this guard, not only the ordering
  // keys. A bare `BigInt` throws a native SyntaxError, which is outside the documented
  // error union of this function AND of both client methods that wrap it, so a corrupt
  // quantity or price escaped as an error no consumer was told to expect.
  // `BigInt` alone is far too permissive to validate a chain position with: it reads
  // "" and " " as 0, honours a sign, and honours the 0x/0o/0b radix prefixes. An id of
  // `_1` or `1_` would pass and then sort at a position that is not the row's - the same
  // silent reordering rejecting malformed rows exists to prevent. Only an unsigned
  // decimal run is a position.
  const toBig = (v: string, what: string): bigint => {
    if (!/^\d+$/.test(v)) {
      throw new InvalidInputError(`pnlEventsFor: ${what} is not an unsigned decimal integer: ${JSON.stringify(v)}`);
    }
    return BigInt(v);
  };
  const chainOrder = (id: string): [bigint, bigint] => {
    const sep = id.indexOf("_");
    if (sep < 0) {
      throw new InvalidInputError(
        `pnlEventsFor: row id must be \`\${blockNumber}_\${logIndex}\`, got ${JSON.stringify(id)}`,
      );
    }
    return [toBig(id.slice(0, sep), "block number"), toBig(id.slice(sep + 1), "log index")];
  };
  const cmp = (a: bigint, b: bigint): number => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  };
  type Stamped = PnLEvent & { block: bigint; log: bigint };
  const out: Stamped[] = [];
  for (const f of fills) {
    const isMaker = (f.maker ?? "").toLowerCase() === acct;
    // The account can occupy the taker seat two ways. `Fill.taker` is a
    // denormalized copy the PendingTakerFill bridge writes; the taker ORDER is
    // what the indexer has from the moment BinaryOrderPlaced lands. Matching on
    // the copy alone drops a fill the account genuinely took — silently, out of
    // its own COST BASIS — on any row the bridge has not finished.
    const isTaker = (f.taker ?? "").toLowerCase() === acct || (f.takerOrder?.owner ?? "").toLowerCase() === acct;
    if (!isMaker && !isTaker) continue;
    // Same precedence as the taker seat above: the order is authoritative, the
    // fill's `takerSide` is the lagging copy.
    const side: BinarySide | null = isMaker ? f.makerSide : (f.takerOrder?.side ?? f.takerSide);
    if (side == null) continue; // side not bridged — skip rather than guess
    const outcomeIndex: 0 | 1 = side === "BUY_NO" || side === "SELL_NO" ? 1 : 0;
    const isBuy = side === "BUY_YES" || side === "BUY_NO";
    out.push({
      kind: isBuy ? "buy" : "sell",
      outcomeIndex,
      quantity: toBig(f.quantity, "fill quantity"),
      price: toBig(f.fillPrice, "fill price"), // YES-terms; inverted per-outcome in the fold
      block: chainOrder(f.id)[0],
      log: chainOrder(f.id)[1],
    });
  }
  for (const a of routerActions) {
    if (a.account.toLowerCase() !== acct) continue;
    const [block, log] = chainOrder(a.id);
    const stamp = { block, log };
    if (a.kind === "MintCompleteSet")
      out.push({ kind: "mint", outcomeIndex: 0, quantity: toBig(a.amount, "mint amount"), price: 0n, ...stamp });
    else if (a.kind === "MergeCompleteSet")
      out.push({ kind: "merge", outcomeIndex: 0, quantity: toBig(a.amount, "merge amount"), price: 0n, ...stamp });
    // Redeem: settles the position at payout — no cost-basis change; ignored.
  }
  out.sort((x, y) => cmp(x.block, y.block) || cmp(x.log, y.log));
  return out.map(({ block: _b, log: _l, ...e }) => e);
}

/**
 *  Fold a {@link PnLEvent} stream + current balances into a
 *  {@link BinaryPositionPnL}, avg-cost basis, RAW units. `oneCollateral =
 *  10^quoteDecimals`. Prices arrive in YES terms; a NO event is re-expressed to
 *  NO terms (`oneCollateral − yesPrice`) here so the two books stay separate.
 *
 *  THE STREAM MUST BE IN CHAIN ORDER - block, then log index. This is an average-cost
 *  roll, so order changes the answer: a sale folded before the buy that opened the leg is
 *  clamped to nothing and its realization is lost. A {@link PnLEvent} carries no
 *  timestamp, and ordering by the unix second would not be enough anyway, since two
 *  events routinely share one. {@link pnlEventsFor} produces a stream that satisfies
 *  this.
 *
 *  An unresolved market that has never traded has no mark price. When
 *  `market.lastPrice` is null and `opts.bookTop` supplies no quote,
 *  `markPrice`, `markValue` and `unrealizedPnl` are `null` on both legs and on
 *  the total. `balance`, `costBasis`, `avgCost` and `realizedPnl` stay exact,
 *  because none of them depends on a mark.
 *
 *  **Errors**
 *
 *  Throws {@link InvalidInputError} when a void has a present but invalid payout
 *  vector. A legacy row with both vector fields absent keeps the documented
 *  half-payout fallback.
 *
 * @category analytics
 */
export function computePositionPnL(
  events: PnLEvent[],
  balances: { balanceYes: bigint; balanceNo: bigint },
  market: Pick<
    BinaryMarket,
    "quoteDecimals" | "lastPrice" | "winningOutcome" | "voided" | "payoutNumerators" | "payoutDenominator"
  >,
  oneCollateral: bigint,
  opts?: {
    /** Top of the YES book — clamps the mark to live quotes (see {@link markYesPrice}). */
    bookTop?: YesBookTop;
  },
): BinaryPositionPnL {
  // Per-outcome running book: qty held, total cost, realized (all raw).
  // A [yes, no] tuple indexed by 0 | 1 keeps lookups exact under
  // noUncheckedIndexedAccess.
  type SideBook = { qty: bigint; cost: bigint; realized: bigint };
  const book: [SideBook, SideBook] = [
    { qty: 0n, cost: 0n, realized: 0n },
    { qty: 0n, cost: 0n, realized: 0n },
  ];
  const applyBuy = (idx: 0 | 1, qty: bigint, price: bigint) => {
    book[idx].qty += qty;
    book[idx].cost += (qty * price) / oneCollateral;
  };
  // The cost `sold` tokens release from a leg. A full close releases the leg's WHOLE
  // remaining cost — deriving it from a rounded average strands dust on a zero-quantity
  // leg, which overstates realized PnL and skews every later average. A partial close
  // takes the AGGREGATE ratio rather than scaling a per-unit average through
  // `oneCollateral`. More exact rather than merely equivalent: the per-unit form rounds
  // twice, so it differs at ordinary decimals too - by up to one raw unit per whole token
  // released - and collapses entirely when cost is smaller than quantity, where a leg of
  // 5 raw units costing 2 released nothing at all on a partial sale.
  const releaseCost = (b: SideBook, sold: bigint): bigint => {
    if (sold >= b.qty) return b.cost;
    if (b.qty <= 0n) return 0n;
    return (sold * b.cost) / b.qty;
  };
  const applySell = (idx: 0 | 1, qty: bigint, price: bigint) => {
    const b = book[idx];
    const sold = qty < b.qty ? qty : b.qty;
    const proceeds = (sold * price) / oneCollateral;
    const costOut = releaseCost(b, sold);
    b.realized += proceeds - costOut;
    b.qty -= sold;
    b.cost -= costOut;
  };
  for (const e of events) {
    if (e.kind === "mint" || e.kind === "merge") {
      // A complete set is one YES + one NO for one whole collateral unit each, so the two
      // legs split the AGGREGATE quantity - the odd unit to NO, so the pair sums to it
      // exactly. Not priced at `oneCollateral / 2` per token: that price is zero on a
      // zero-decimal collateral (the whole set would cost nothing) and floors a unit away
      // on any odd quantity even at six decimals.
      const halve = (idx: 0 | 1, total: bigint): bigint => (idx === 0 ? total / 2n : total - total / 2n);

      if (e.kind === "mint") {
        for (const idx of [0, 1] as const) {
          book[idx].qty += e.quantity;
          book[idx].cost += halve(idx, e.quantity);
        }
        continue;
      }

      // Both legs settle TOGETHER when they are a genuine pair - same quantity, and the
      // same amount released from each. Flooring them independently loses a unit whenever
      // the mint split an odd amount, because 2/5 and 3/5 of one fraction each round down:
      // minting 5 and merging 4 released 1 + 2 = 3 against 4 of proceeds, inventing profit
      // and stranding basis on the set still held.
      const [y, n] = [book[0], book[1]];
      const soldYes = e.quantity < y.qty ? e.quantity : y.qty;
      const soldNo = e.quantity < n.qty ? e.quantity : n.qty;

      let yesOut = releaseCost(y, soldYes);
      let noOut = releaseCost(n, soldNo);
      if (soldYes === soldNo && y.qty === n.qty && y.qty > 0n) {
        const total = releaseCost({ qty: y.qty, cost: y.cost + n.cost, realized: 0n }, soldYes);
        // Never take more from a leg than it holds, nor give it back cost it did not have.
        const remainder = total - yesOut;
        if (remainder < 0n) noOut = 0n;
        else if (remainder > n.cost) noOut = n.cost;
        else noOut = remainder;
        yesOut = total - noOut;
      }

      y.realized += halve(0, soldYes) - yesOut;
      y.qty -= soldYes;
      y.cost -= yesOut;
      n.realized += halve(1, soldNo) - noOut;
      n.qty -= soldNo;
      n.cost -= noOut;
      continue;
    }

    // Order-book fill: price is YES-terms, re-express to the traded outcome.
    const price = e.outcomeIndex === 1 ? oneCollateral - e.price : e.price;
    if (e.kind === "buy") applyBuy(e.outcomeIndex, e.quantity, price);
    else applySell(e.outcomeIndex, e.quantity, price);
  }

  const held: [bigint, bigint] = [balances.balanceYes, balances.balanceNo];
  // No `?? 0n` here: a market that has never traded has no price, and 0n is a
  // confident price. It marks YES at zero AND (by the complement below) NO at
  // full collateral. Carry the absence through instead — see
  // `BinaryOutcomePositionPnL.markPrice`.
  const yesMark = Units.markYesPrice(opts?.bookTop ?? {}, market.lastPrice);
  const markFor = (idx: 0 | 1): bigint | null => {
    if (market.voided) {
      // The stored vector is the payout — see `Units.voidPayoutFraction`. A
      // market indexed before both vector fields existed keeps the pre-vector
      // half, unchanged.
      const v = Units.voidPayoutFraction(market.payoutNumerators, market.payoutDenominator, idx);
      if (v == null) return oneCollateral / 2n;
      // Settlement floors each leg independently. Apply the selected stored
      // numerator directly so this mark matches `redeem` for the same amount.
      return (oneCollateral * v.numerator) / v.denominator;
    }
    if (market.winningOutcome != null) return market.winningOutcome === idx ? oneCollateral : 0n;
    if (yesMark == null) return null; // never traded, no book → unknown, not zero
    // Deriving NO by subtraction keeps the two legs summing to exactly one
    // whole collateral unit, including for an odd `oneCollateral`.
    return idx === 0 ? yesMark : oneCollateral - yesMark; // still trading → book-clamped last
  };

  // Build each leg ONCE, then sum the stored legs into the totals. Summing the
  // stored values (rather than recomputing the totals independently) is what
  // makes `yes.costBasis + no.costBasis === costBasis` hold exactly: every
  // field here is integer-divided, so two roundings of the same quantity are
  // not guaranteed to agree.
  const legFor = (idx: 0 | 1): BinaryOutcomePositionPnL => {
    const b = book[idx];
    const balance = held[idx];
    // Cost basis of the CURRENT balance: scale the fills-derived cost by the actual held
    // fraction (they can diverge if tokens moved outside the book). Taken from the
    // AGGREGATE rather than through `avgCost`: that per-unit rate rounds to zero whenever
    // a leg's cost is smaller than its quantity, so an open position on a zero-decimal
    // collateral - 5 tokens costing 2 - reported no cost basis at all.
    const avgCost = b.qty > 0n ? (b.cost * oneCollateral) / b.qty : 0n;
    const costBasis = b.qty > 0n ? (balance * b.cost) / b.qty : 0n;
    const markPrice = markFor(idx);
    const markValue = markPrice != null ? (balance * markPrice) / oneCollateral : null;
    return {
      balance,
      costBasis,
      // A held-nothing leg has no rate to quote, even if the book remembers one
      // from fills whose tokens have since left the account.
      avgCost: balance > 0n ? avgCost : 0n,
      markPrice,
      markValue,
      unrealizedPnl: markValue != null ? markValue - costBasis : null,
      realizedPnl: b.realized,
    };
  };
  const yes = legFor(0);
  const no = legFor(1);

  const costBasis = yes.costBasis + no.costBasis;
  // Both legs read the same market, so they are unknown together; the explicit
  // pair check keeps the total honest without assuming that.
  const markValue = yes.markValue != null && no.markValue != null ? yes.markValue + no.markValue : null;
  const realizedPnl = yes.realizedPnl + no.realizedPnl;

  const totalHeld = held[0] + held[1];
  const avgCost = totalHeld > 0n ? (costBasis * oneCollateral) / totalHeld : 0n;
  return {
    balanceYes: balances.balanceYes,
    balanceNo: balances.balanceNo,
    costBasis,
    avgCost,
    markValue,
    unrealizedPnl: markValue != null ? markValue - costBasis : null,
    realizedPnl,
    outcomes: { yes, no },
  };
}

/** Errors raised by {@link pnlEventsFor}. */
export type PnlEventsForError = InvalidInputError;

/**
 *  {@link pnlEventsFor} for rows the SDK fetched itself, which reclassifies the one
 *  failure whose meaning changes with who supplied the rows.
 *
 *  A row that cannot be placed in chain order is the caller's mistake only when the
 *  caller assembled it. When a client method read the rows from the indexer, nothing
 *  about the call was wrong, so reporting `InvalidInputError` would send consumers to
 *  fix an argument and never retry. It is corrupt indexed data: an {@link IndexerError},
 *  which is the retry-or-escalate path. The parse failure stays on `cause`.
 *
 *  `operation` names the failing client method, matching every other `IndexerError`.
 */
export function pnlEventsForIndexed(
  operation: string,
  account: string,
  fills: FillRow[],
  routerActions: RouterActionRecord[],
): PnLEvent[] {
  try {
    return pnlEventsFor(account, fills, routerActions);
  } catch (e) {
    if (e instanceof InvalidInputError) {
      // Deliberately not "cannot be placed in chain order": the same guard rejects a
      // malformed quantity, fill price or amount, and naming only the ordering case would
      // misdiagnose those. The specific reason stays on `cause`.
      throw new IndexerError(operation, `a fill or router action row is malformed: ${e.message}`, {
        cause: e,
      });
    }
    throw e;
  }
}

/** Errors raised by {@link pnlEventsForIndexed}. */
export type PnlEventsForIndexedError = IndexerError;

/** Errors raised by {@link computePositionPnL}. */
export type ComputePositionPnLError = InvalidInputError;

// ============================================================================
// B5 — getClaimable: redeemable positions in resolved/voided markets
// ============================================================================

/**
 *  One redeemable outcome position in a settled market — shaped to feed
 *  straight into `trader.redeemMany({ entries: [...] })`.
 *
 * @category analytics
 */
export interface ClaimablePosition {
  /** Market id (bytes32 hex) — `entries[].marketId` for redeemMany. */
  marketId: string;
  /** The market's pool address (lowercased). */
  pool: string;
  /** 0 = YES, 1 = NO — `entries[].outcomeIdx` for redeemMany. */
  outcomeIdx: 0 | 1;
  /** Redeemable outcome-token balance (raw) — `entries[].amount` for redeemMany. */
  amount: bigint;
  /**
   *  Estimated collateral payout net of the settlement fee (raw). Winner:
   *  amount × (1 − fee); voided: amount × the market's stored payout vector for
   *  this outcome (a half per side under the `UNIFORM` void policy, `[p, D−p]`
   *  on a captured `CLOB_SNAPSHOT` void; a void is never fee-charged). Loser
   *  side: 0. See {@link estPayoutFor}.
   */
  estPayout: bigint;
  /** Market lifecycle status driving the claim ("Resolved" | "Voided" | …). */
  status: string;
}

/**
 * A settled binary position to evaluate for claimability.
 *
 * @category analytics
 */
export interface ClaimableInput {
  /** Market id (bytes32 hex), passed through to the output. */
  marketId: string;
  /** The market's pool address, passed through to the output. */
  pool: string;
  /** 0 = YES, 1 = NO — which outcome this position holds. */
  outcomeIdx: 0 | 1;
  /** Held outcome-token balance (raw). Non-positive positions are dropped. */
  amount: bigint;
  /** Winning outcome (0/1) when resolved; null when voided/unresolved. */
  winningOutcome: number | null;
  /**
   *  True when the market voided. A void redeems against the market's stored
   *  payout vector ({@link ClaimableInput.payoutNumerators}), which is a half
   *  per side under the `UNIFORM` void policy but `[p, D−p]` on a
   *  `CLOB_SNAPSHOT` void that captured a two-sided close.
   */
  voided: boolean;
  /**
   *  Per-outcome payout numerators the market settled to (decimal strings),
   *  from `BinaryMarket.payoutNumerators`. Supply these on a voided position so
   *  the payout comes from the vector rather than an assumed half. Null/omitted
   *  on markets indexed before the vector fields existed — the estimate then
   *  falls back to the half, unchanged from pre-vector behaviour.
   */
  payoutNumerators?: string[] | null;
  /** Denominator the numerators are scaled against (decimal string); null/omitted with them. */
  payoutDenominator?: string | null;
  /** Market lifecycle status ("Resolved" | "Voided" | …), passed through to the output. */
  status: string;
  /** Settlement fee in bps (1 = 0.01%); the winner payout skims this. */
  settlementFeeBps: bigint;
}

/**
 *  Compute the estimated payout for one settled position (raw collateral).
 *  Winner: `amount × (10_000 − feeBps) / 10_000`; voided: `amount ×
 *  payoutNumerators[outcomeIdx] / payoutDenominator`; loser: 0.
 *
 *  A void pays its stored vector, which is a half per side under the `UNIFORM`
 *  policy and `[p, D−p]` on a `CLOB_SNAPSHOT` void that captured a two-sided
 *  close. When the vector is absent the estimate falls back to the half, which
 *  is what this returned for every void before the vector existed.
 *
 *  A void is never fee-charged, so no settlement fee applies on this branch —
 *  the raw vector and the fee-scaled one are identical for a void.
 *
 *  **Errors**
 *
 *  Throws {@link InvalidInputError} when a void has a present but invalid payout
 *  vector. A legacy row with both vector fields absent keeps the documented
 *  half-payout fallback.
 *
 * @category analytics
 */
export function estPayoutFor(input: ClaimableInput): bigint {
  if (input.voided) {
    const v = Units.voidPayoutFraction(input.payoutNumerators, input.payoutDenominator, input.outcomeIdx);
    return v == null ? input.amount / 2n : (input.amount * v.numerator) / v.denominator;
  }
  if (input.winningOutcome != null && input.winningOutcome === input.outcomeIdx) {
    const fee = input.settlementFeeBps < 0n ? 0n : input.settlementFeeBps;
    return (input.amount * (10_000n - fee)) / 10_000n;
  }
  return 0n; // loser side (or unresolved) → nothing to claim
}

/** Errors raised by {@link estPayoutFor}. */
export type EstPayoutForError = InvalidInputError;

/**
 *  Shape one settled portfolio position into a {@link ClaimableInput}.
 *
 *  The pure half of `client.getClaimable`: the I/O (the portfolio read and the
 *  per-market fee read) stays in the client, and this maps one position plus its
 *  already-fetched fee. It exists as its own function because the mapping is
 *  where a claim quietly goes wrong — every field it drops is a silent revert,
 *  and the payout vector in particular is optional on {@link ClaimableInput}, so
 *  omitting it is not even a type error. Keeping it here makes it testable
 *  without standing up a client.
 *
 *  `settlementFeeBps` is the caller's to supply because only a WINNER is
 *  fee-charged, and fetching that costs a read per market; pass `0n` for a void
 *  or a loser.
 *
 *  Deliberately NOT re-exported from the package root: it is internal wiring
 *  that happens to be worth testing, and `client.getClaimable` is the supported
 *  way to reach it. Adding it to the root roster would widen the published API.
 *
 * @internal
 */
export function claimableInputFor(
  position: {
    market: {
      id: string;
      poolAddress: string;
      /** Optional here, as `PortfolioMarket` declares it; normalised to null below. */
      winningOutcome?: number | null;
      voided: boolean;
      status: string;
      payoutNumerators?: string[] | null;
      payoutDenominator?: string | null;
    };
    outcomeIndex: number;
    balance: string;
  },
  settlementFeeBps: bigint,
): ClaimableInput {
  const m = position.market;
  return {
    marketId: m.id,
    pool: m.poolAddress,
    outcomeIdx: position.outcomeIndex === 1 ? 1 : 0,
    amount: BigInt(position.balance),
    winningOutcome: m.winningOutcome ?? null,
    voided: m.voided,
    // A void redeems against its stored vector, not a flat half. Dropping these
    // two silently restores the old behaviour on every voided position.
    payoutNumerators: m.payoutNumerators ?? null,
    payoutDenominator: m.payoutDenominator ?? null,
    status: m.status,
    settlementFeeBps,
  };
}

/**
 *  Filter and shape settled positions into {@link ClaimablePosition}s. A
 *  position is claimable when the market is voided or when it holds the winning
 *  outcome. A void pays against the stored vector. Loser-side and still-trading
 *  positions are omitted.
 *
 *  **Errors**
 *
 *  Throws {@link InvalidInputError} when a void has a present but invalid payout
 *  vector. A legacy row with both vector fields absent keeps the documented
 *  half-payout fallback.
 *
 * @category analytics
 */
export function claimableFrom(inputs: ClaimableInput[]): ClaimablePosition[] {
  const out: ClaimablePosition[] = [];
  for (const i of inputs) {
    if (i.amount <= 0n) continue;
    const isWinner = i.winningOutcome != null && i.winningOutcome === i.outcomeIdx;
    if (!i.voided && !isWinner) continue; // loser or unresolved → skip
    out.push({
      marketId: i.marketId,
      // The type promises a lowercased pool; enforce it rather than relying on
      // the indexer wiring happening to feed lowercase rows.
      pool: i.pool.toLowerCase(),
      outcomeIdx: i.outcomeIdx,
      amount: i.amount,
      estPayout: estPayoutFor(i),
      status: i.status,
    });
  }
  return out;
}

/** Errors raised by {@link claimableFrom}. */
export type ClaimableFromError = InvalidInputError;

// ============================================================================
// B6 — stake/sell market-order builders: size a crossing IOC from a collateral
// stake (buy) or unwind a position (sell), with a protective tick-aligned limit
// ============================================================================

/** Basis-point denominator (100% = 10,000 bps). */
const BPS_DENOMINATOR = 10_000n;

/**
 * Default market-order slippage cushion, in bps of the crossing price.
 *
 * @category analytics
 */
export const DEFAULT_SLIPPAGE_BPS = 300n;

/**
 *  Default minimum slippage cushion in ticks — keeps long-shot (low-priced)
 *  outcomes, where the bps fraction rounds to almost nothing, from getting
 *  near-zero slack.
 *
 * @category analytics
 */
export const DEFAULT_SLIPPAGE_MIN_TICKS = 10n;

/**
 *  The price/quantity grid a BinaryPool enforces on orders, plus the slippage
 *  policy the stake/sell builders pad their protective limit with. `tickSize`
 *  and `lotSize` come from the pool's on-chain order-book parameters
 *  (`client.getBinaryBookParams`) — the pool rejects any price off the tick
 *  grid and any quantity off the lot grid (`InvalidQuantity`).
 *
 * @category analytics
 */
export interface BinaryCrossingParams {
  /** Price increment (raw collateral units) — limits must be a multiple. */
  tickSize: bigint;
  /** Quantity increment (raw outcome-token units) — sizes must be a multiple. */
  lotSize: bigint;
  /**
   *  Smallest order size the pool accepts (raw outcome-token units) — a lot
   *  multiple that may exceed a single lot; the pool rejects anything smaller
   *  (`QuantityBelowMinimum`). Quotes that land below it return `null`.
   *  @default `0n` (no floor beyond the lot grid)
   */
  minQuantity?: bigint;
  /**
   *  Slippage cushion in bps of the crossing price.
   *  @default {@link DEFAULT_SLIPPAGE_BPS} (300 = 3%)
   */
  slippageBps?: bigint;
  /**
   *  Minimum slippage cushion in ticks.
   *  @default {@link DEFAULT_SLIPPAGE_MIN_TICKS} (10)
   */
  slippageMinTicks?: bigint;
}

/**
 *  Slippage cushion for a crossing `price` (raw, same units): the larger of the
 *  bps fraction and the fixed tick floor. A market IOC only crosses at or
 *  better than its protective limit, so pinning that limit to the exact
 *  crossing price means any tick of book churn between the quote and on-chain
 *  execution leaves it uncrossable — the order fills nothing. The cushion only
 *  widens how far the sweep will chase a moving book; fills still land at each
 *  resting level's own price.
 *
 * @category analytics
 */
export function slippageForCrossing(
  price: bigint,
  tickSize: bigint,
  opts?: Pick<BinaryCrossingParams, "slippageBps" | "slippageMinTicks">,
): bigint {
  const bps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const minTicks = opts?.slippageMinTicks ?? DEFAULT_SLIPPAGE_MIN_TICKS;
  const percent = (price * bps) / BPS_DENOMINATOR;
  const floor = minTicks * tickSize;
  return percent > floor ? percent : floor;
}

/**
 * The buy sides of {@link BinarySide} — what a stake converts into.
 *
 * @category analytics
 */
export type BinaryBuySide = "BUY_YES" | "BUY_NO";

/**
 * The sell sides of {@link BinarySide} — what unwinds a position.
 *
 * @category analytics
 */
export type BinarySellSide = "SELL_YES" | "SELL_NO";

/**
 *  A stake-sized market BUY, shaped to feed straight into
 *  `trader.placeOrder({ pool, side, price: yesPrice, quantity, orderType: ORDER_TYPE.MARKET })`.
 *  All values RAW units.
 *
 * @category analytics
 */
export interface BinaryStakeQuote {
  /** The buy side quoted ("BUY_YES" | "BUY_NO"). */
  side: BinaryBuySide;
  /**
   *  Protective limit in YES terms (raw, tick-aligned) — what `placeOrder`
   *  takes. The deepest level the sweep touched plus the slippage cushion.
   */
  yesPrice: bigint;
  /**
   *  The same protective limit in the traded outcome's OWN terms (raw) — equals
   *  `yesPrice` for BUY_YES, `oneCollateral − yesPrice` for BUY_NO. Display this.
   */
  limitPrice: bigint;
  /**
   *  Outcome-token quantity bought (raw, lot-aligned) — the payout if this
   *  side wins.
   */
  quantity: bigint;
  /**
   *  Collateral the order escrows (raw) — `quantity × limitPrice`, rounded up.
   *  The max loss; never above the stake.
   */
  escrow: bigint;
}

/**
 *  Convert a collateral stake into a market BUY by walking the live book — so
 *  the quoted shares and payout match what the order will actually fill, not an
 *  optimistic top-of-book estimate. The inverse of
 *  {@link quoteBinaryOrderOverBook}: that sizes cost from a quantity; this
 *  sizes quantity from a collateral budget.
 *
 *  The sweep buys down the asks cheapest-first, accumulating shares while the
 *  escrow at the running protective price (the worst level touched) stays
 *  within the stake — the max loss never exceeds it. A pricier level lowers
 *  that ceiling, so the sweep naturally stops once the next level can't fit.
 *  The protective limit is then padded with a slippage cushion (so the IOC
 *  still crosses if the book ticks up before it lands), aligned UP to the tick
 *  grid, capped a tick below one collateral; the quantity is re-fit to the
 *  stake at the padded price and snapped DOWN to a whole lot, so the escrow
 *  can never exceed the stake.
 *
 *  Returns `null` when nothing is fillable — empty book, a stake too small to
 *  buy a single lot (or the pool's `minQuantity`), or degenerate grid params
 *  (`tickSize`/`lotSize`/`oneCollateral`/`stake` ≤ 0).
 *
 * **Details**
 *
 * - `book`: The live four-sided book (NO sides pre-inverted).
 * - `side`: "BUY_YES" (Up) or "BUY_NO" (Down).
 * - `stake`: Collateral budget, raw units.
 * - `oneCollateral`: `10^quoteDecimals` — one whole outcome share.
 * - `params`: The pool's tick/lot grid + slippage policy.
 *
 * @category analytics
 */
export function quoteBinaryStakeOverBook(
  book: BinaryOrderBook,
  side: BinaryBuySide,
  stake: bigint,
  oneCollateral: bigint,
  params: BinaryCrossingParams,
): BinaryStakeQuote | null {
  const { tickSize, lotSize } = params;
  // Grid values are divisors below — misconfigured market data (a zero
  // tick/lot/oneCollateral) would throw or produce garbage. Bail to null.
  if (tickSize <= 0n || lotSize <= 0n || oneCollateral <= 0n || stake <= 0n) return null;

  const levels = side === "BUY_YES" ? book.yesAsks : book.noAsks;

  // Sweep cheapest-first, adding shares at each level while the escrow at the
  // running protective price (the worst level touched) stays within the stake.
  let quantity = 0n;
  let limit = 0n;
  for (const level of levels) {
    const { price, quantity: available } = level;
    // Skip unusable levels; a price outside (0, oneCollateral) isn't a real
    // book crossing and would break the escrow/quantity math.
    if (price <= 0n || price >= oneCollateral || available <= 0n) continue;

    // Most shares the stake can escrow if this level becomes the protective
    // price. Pricier levels only shrink this ceiling, so once it's at or below
    // what we already hold the sweep is done.
    const maxQuantity = (stake * oneCollateral) / price;
    if (maxQuantity <= quantity) break;

    const headroom = maxQuantity - quantity;
    const take = available < headroom ? available : headroom;
    quantity += take;
    limit = price;

    // Escrow ceiling hit partway through this level — deeper levels are only
    // pricier, so there's nothing more to buy within the stake.
    if (take < available) break;
  }
  if (quantity <= 0n || limit <= 0n) return null;

  // Pad the protective limit with slippage headroom, then snap it back onto
  // the tick grid — the pool rejects any price that isn't a tickSize multiple.
  // Round UP so the limit stays at or above every swept level (they all still
  // cross), then cap a tick below a full share.
  const maxPrice = oneCollateral - tickSize;
  const paddedRaw = limit + slippageForCrossing(limit, tickSize, params);
  const alignedUp = ((paddedRaw + tickSize - 1n) / tickSize) * tickSize;
  const paddedLimit = alignedUp > maxPrice ? maxPrice : alignedUp;
  if (paddedLimit <= 0n) return null;

  // Re-fit the quantity to the stake at the padded price and snap DOWN to a
  // whole lot — so escrow (quantity × padded price) stays within the stake
  // (the documented max loss) and the pool can't pull more than the user
  // committed. The pool rejects a non-lot quantity (`InvalidQuantity`).
  const affordable = (stake * oneCollateral) / paddedLimit;
  const capped = affordable < quantity ? affordable : quantity;
  const finalQuantity = (capped / lotSize) * lotSize;
  // The pool also enforces a minimum order size (a lot multiple, possibly
  // > 1 lot) — a lot-aligned quote below it would revert QuantityBelowMinimum.
  if (finalQuantity <= 0n || finalQuantity < (params.minQuantity ?? 0n)) return null;

  return {
    side,
    yesPrice: side === "BUY_YES" ? paddedLimit : oneCollateral - paddedLimit,
    limitPrice: paddedLimit,
    quantity: finalQuantity,
    escrow: (finalQuantity * paddedLimit + oneCollateral - 1n) / oneCollateral,
  };
}

/**
 *  A market SELL that unwinds an outcome position, shaped to feed straight into
 *  `trader.placeOrder({ pool, side, price: yesPrice, quantity, orderType: ORDER_TYPE.MARKET })`.
 *  All values RAW units. See {@link quoteBinaryStakeOverBook} for the family's
 *  full mental model.
 *
 * @category analytics
 */
export interface BinarySellQuote {
  /** The sell side quoted ("SELL_YES" | "SELL_NO"). */
  side: BinarySellSide;
  /** Protective floor in YES terms (raw, tick-aligned) — what `placeOrder` takes. */
  yesPrice: bigint;
  /**
   *  The same protective floor in the sold outcome's OWN terms (raw) — the
   *  cushioned best bid. Display this.
   */
  limitPrice: bigint;
  /** Outcome-token quantity to sell (raw, lot-aligned) — the size submitted. */
  quantity: bigint;
  /**
   *  How much of `quantity` the resting bids at or above the floor can absorb
   *  (raw, ≤ `quantity`). The IOC cancels the rest unfilled — when this is
   *  short of `quantity`, show the user a partial-unwind warning instead of
   *  implying the whole position exits.
   */
  fillableQuantity: bigint;
  /**
   *  Collateral proceeds if `fillableQuantity` fills at the resting bids'
   *  own prices (raw, rounded down) — an estimate: bids can churn between
   *  the quote and execution.
   */
  estProceeds: bigint;
}

/**
 *  Build a market SELL that unwinds `quantity` of an outcome by crossing the
 *  resting bids, with a slippage cushion below the best bid — the sell-side
 *  sibling of {@link quoteBinaryStakeOverBook}.
 *
 *  Pinning the protective limit to the exact best bid means any tick of book
 *  churn between the quote and on-chain execution leaves the IOC uncrossable —
 *  a sell into a busy book fills nothing. The limit instead sits a cushion
 *  below the best bid, aligned DOWN to the tick grid (never below one tick):
 *  the order still fills each resting bid at its own price, best-first.
 *
 *  Unlike the buy side, `quantity` is NOT sized to the book — it's the
 *  caller's position, lot-aligned. The quote walks the crossable bids and
 *  reports `fillableQuantity`/`estProceeds` so a thin book surfaces as a
 *  partial unwind up front rather than a silent IOC cancel.
 *
 *  Returns `null` when there's nothing to sell (including a position below
 *  the pool's `minQuantity`) or no bid to cross — disable the Sell control
 *  rather than sending a doomed order.
 *
 * **Details**
 *
 * - `book`: The live four-sided book (NO sides pre-inverted).
 * - `side`: "SELL_YES" (Up position) or "SELL_NO" (Down position).
 * - `quantity`: Outcome-token quantity to sell, raw units (snapped down to the lot grid).
 * - `oneCollateral`: `10^quoteDecimals` — one whole outcome share.
 * - `params`: The pool's tick/lot grid + slippage policy.
 *
 * @category analytics
 */
export function quoteBinarySellOverBook(
  book: BinaryOrderBook,
  side: BinarySellSide,
  quantity: bigint,
  oneCollateral: bigint,
  params: BinaryCrossingParams,
): BinarySellQuote | null {
  const { tickSize, lotSize } = params;
  if (tickSize <= 0n || lotSize <= 0n || oneCollateral <= 0n || quantity <= 0n) return null;

  const bestBid = (side === "SELL_YES" ? book.yesBids : book.noBids)[0]?.price;
  if (bestBid == null || bestBid <= 0n) return null;

  // Lowest price (in the sold side's own terms) the sweep will accept, aligned
  // down to the tick and never below one tick.
  const slip = slippageForCrossing(bestBid, tickSize, params);
  const floorRaw = bestBid > slip ? bestBid - slip : tickSize;
  const aligned = (floorRaw / tickSize) * tickSize;
  const floor = aligned < tickSize ? tickSize : aligned;

  const yesPrice = side === "SELL_YES" ? floor : oneCollateral - floor;
  if (yesPrice <= 0n || yesPrice >= oneCollateral) return null;

  // The pool rejects a non-lot quantity — snap down rather than revert; the
  // sub-lot dust remainder isn't sellable on the book anyway. Same for a
  // position below the pool's minimum order size (QuantityBelowMinimum).
  const lotQuantity = (quantity / lotSize) * lotSize;
  if (lotQuantity <= 0n || lotQuantity < (params.minQuantity ?? 0n)) return null;

  // Walk the crossable bids (best-first, at or above the floor) so the quote
  // reports what will actually fill — the buy side's honesty mirrored. The
  // order still submits `lotQuantity`; anything past `fillableQuantity` is
  // IOC-canceled, and the caller can warn about the partial unwind up front.
  const bids = side === "SELL_YES" ? book.yesBids : book.noBids;
  let fillableQuantity = 0n;
  let estProceeds = 0n;
  for (const { price, quantity: available } of bids) {
    if (price < floor) break; // sorted best-first — nothing deeper crosses
    if (price >= oneCollateral || available <= 0n) continue;
    const headroom = lotQuantity - fillableQuantity;
    if (headroom <= 0n) break;
    const take = available < headroom ? available : headroom;
    fillableQuantity += take;
    estProceeds += (take * price) / oneCollateral;
  }

  return { side, yesPrice, limitPrice: floor, quantity: lotQuantity, fillableQuantity, estProceeds };
}

// ============================================================================
// B8 — binary position views: book marks, entry/uPnL row math, lifecycle
// classification. Upstreamed from the DreamDex web app so portfolio rows on
// any frontend mark positions identically.
// ============================================================================

/**
 *  The mid YES price (raw) from the best book levels — `(bid + ask) / 2` when
 *  both sides are quoted, otherwise whichever single side exists. `undefined`
 *  when the book is empty. For an ODDS display; positions should mark with
 *  {@link markYesPrice} instead (a lone bid/ask is not a fair mark).
 *
 * @category analytics
 */
export function midYesPrice(bestYesBid: bigint | undefined, bestYesAsk: bigint | undefined): bigint | undefined {
  if (bestYesBid !== undefined && bestYesAsk !== undefined) {
    return (bestYesBid + bestYesAsk) / 2n;
  }
  return bestYesAsk ?? bestYesBid;
}

// NOTE: the mark-to-market counterpart, `Units.markYesPrice`, lives in units.ts —
// the same mid-when-two-sided rule, plus the one-sided clamp (a live quote
// beyond a stale last print supersedes it). It is re-exported from the barrel.

/**
 * The one slice of a portfolio trade the entry-price math needs.
 *
 * @category analytics
 */
export interface EntryTrade {
  /** The account's side on the fill, or null when not yet bridged. */
  side: BinarySide | null;
  /** Fill price in YES terms (raw collateral units per whole outcome token). */
  fillPrice: string;
  /** Outcome-token quantity filled (raw units). */
  quantity: string;
}

/**
 *  Average entry price for a YES/NO position, in the outcome's OWN terms (raw),
 *  derived from the wallet's BUY fills on that outcome. A binary fill's
 *  `fillPrice` is always YES-terms, so the NO leg enters at the complement.
 *  Only buys are averaged — this is the cost basis an unrealized-PnL display
 *  compares the live mark against. Returns `null` when there are no matching
 *  buys (show a dash, not a bogus 0 that reads as +100%). NOTE: complete-set
 *  mints don't appear in fills; positions built by mint+sell carry a
 *  fills-only basis here, same as {@link computePositionPnL} without router
 *  actions.
 *
 * @category analytics
 */
export function averageEntryPrice(input: {
  trades: readonly EntryTrade[];
  /** 0 = YES, 1 = NO. */
  outcomeIndex: number;
  /** `10 ** decimals` — one whole outcome share in raw terms. */
  oneShare: bigint;
}): bigint | null {
  const { trades, outcomeIndex, oneShare } = input;
  const isYes = outcomeIndex === 0;
  const buySide: BinarySide = isYes ? "BUY_YES" : "BUY_NO";

  let weightedCost = 0n;
  let totalQuantity = 0n;
  for (const trade of trades) {
    if (trade.side !== buySide) continue;
    let quantity: bigint;
    let yesPrice: bigint;
    try {
      quantity = BigInt(trade.quantity);
      yesPrice = BigInt(trade.fillPrice);
    } catch {
      continue;
    }
    if (quantity <= 0n) continue;
    weightedCost += (isYes ? yesPrice : oneShare - yesPrice) * quantity;
    totalQuantity += quantity;
  }

  if (totalQuantity <= 0n) return null;
  return weightedCost / totalQuantity;
}

/**
 *  Live mark price for one outcome in its own terms (raw): YES marks at the
 *  YES mid, NO at the complement. `undefined` when there's no mid to mark to.
 *
 * @category analytics
 */
export function outcomeMarkPrice(input: {
  outcomeIndex: number;
  /** YES mark (raw), e.g. from {@link markYesPrice}. */
  yesMid: bigint | undefined;
  oneShare: bigint;
}): bigint | undefined {
  const { outcomeIndex, yesMid, oneShare } = input;
  if (yesMid === undefined) return undefined;
  return outcomeIndex === 0 ? yesMid : oneShare - yesMid;
}

/**
 * An outcome position marked to a live price — one portfolio row's numbers.
 *
 * @category analytics
 */
export interface OutcomePositionMark {
  /** Current position value in collateral (raw): `balance × mark`. */
  value: bigint;
  /** Unrealized PnL in collateral (raw), or `null` when entry is unknown. */
  upnl: bigint | null;
  /** Unrealized PnL as a signed fraction (0.12 = +12%), or `null`. */
  upnlFraction: number | null;
}

/**
 *  Mark an outcome position: `value = balance × mark`, `upnl = balance ×
 *  (mark − avgEntry)`. When `avgEntry` is unknown (no buys indexed yet) only
 *  `value` is computed and the PnL fields stay `null` — a dash beats an
 *  invented zero basis.
 *
 * @category analytics
 */
export function markOutcomePosition(input: {
  /** Outcome-token balance held (raw units). */
  balance: bigint;
  /** Live mark price in the outcome's own terms (raw). */
  markPrice: bigint;
  /** Average entry price in the outcome's own terms (raw), or `null`. */
  avgEntry: bigint | null;
  oneShare: bigint;
}): OutcomePositionMark {
  const { balance, markPrice, avgEntry, oneShare } = input;
  const value = (balance * markPrice) / oneShare;

  if (avgEntry === null || avgEntry <= 0n) {
    return { upnl: null, upnlFraction: null, value };
  }

  return {
    upnl: (balance * (markPrice - avgEntry)) / oneShare,
    upnlFraction: Number(markPrice - avgEntry) / Number(avgEntry),
    value,
  };
}

/**
 *  How a position should be marked, given its market's lifecycle:
 *
 *  - `"live"` — still trading; mark to the live book.
 *  - `"won"` / `"lost"` — resolved; this outcome pays 1 or 0.
 *  - `"voided"` — cancelled; collateral refunds, zero PnL.
 *  - `"settling"` — expired but unresolved; no reliable mark exists.
 *
 * @category analytics
 */
export type PositionMarkState = "live" | "won" | "lost" | "voided" | "settling";

/**
 *  Statuses meaning the resolution is on record. The indexer supersedes
 *  on-chain `"Resolved"` with the derived terminal `"Finalized"` in the same
 *  breath as resolution — matching only `"Resolved"` leaves every concluded
 *  position stuck on "Settling".
 */
const RESOLVED_STATUSES: ReadonlySet<string> = new Set(["Resolved", "Finalized"]);

/**
 *  Classify how a position marks from its market's status/resolution: a
 *  resolved market pays its winning outcome, a voided one refunds, a
 *  still-trading one marks live, and anything expired-but-unresolved is
 *  settling (marking to a stale book there flashes phantom PnL).
 *
 * @category analytics
 */
export function positionMarkState(input: {
  /** BinaryMarketStatus string from the market row. */
  status: string;
  voided: boolean;
  /** Winning outcome index (0 = YES, 1 = NO), or null until resolved. */
  winningOutcome: number | null | undefined;
  outcomeIndex: number;
  /** Market expiry (unix seconds). */
  expirySec: number;
  /** Reference "now" (unix seconds). */
  nowSec: number;
}): PositionMarkState {
  const { status, voided, winningOutcome, outcomeIndex, expirySec, nowSec } = input;

  if (voided || status === "Voided") return "voided";
  if (RESOLVED_STATUSES.has(status)) {
    if (winningOutcome == null) return "settling";
    return winningOutcome === outcomeIndex ? "won" : "lost";
  }
  // Not yet resolved: still live until expiry, then awaiting settlement.
  return Number.isFinite(expirySec) && expirySec <= nowSec ? "settling" : "live";
}
