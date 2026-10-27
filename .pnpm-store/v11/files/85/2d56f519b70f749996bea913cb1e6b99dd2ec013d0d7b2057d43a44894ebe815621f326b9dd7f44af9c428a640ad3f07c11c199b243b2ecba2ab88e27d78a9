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
import { IndexerError, InvalidInputError } from "./errors.js";
import * as Units from "./units.js";
/**
 *  Pick the resting levels a market order on `side` crosses, in the outcome's
 *  own price terms. A BUY consumes the opposite side's ASKS; a SELL consumes the
 *  BIDS. The book already carries the NO sides pre-inverted (`toBinaryBook`), so
 *  BUY_NO simply consumes `noAsks` — no per-level inversion needed here.
 */
function levelsToCross(book, side) {
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
function bookMid(book, side) {
    const isNo = side === "BUY_NO" || side === "SELL_NO";
    const bids = isNo ? book.noBids : book.yesBids;
    const asks = isNo ? book.noAsks : book.yesAsks;
    const bestBid = bids[0]?.price;
    const bestAsk = asks[0]?.price;
    if (bestBid == null || bestAsk == null)
        return null;
    return (bestBid + bestAsk) / 2n;
}
/**
 *  Walk the live book crossing the opposite side for a market order of
 *  `quantity` on `side` — the pure kernel behind `client.quoteBinaryOrder`.
 *  `oneCollateral = 10^quoteDecimals` (full collateral = a share worth 1).
 *
 * @category analytics
 */
export function quoteBinaryOrderOverBook(book, side, quantity, oneCollateral) {
    const levels = levelsToCross(book, side);
    let remaining = quantity > 0n ? quantity : 0n;
    let cost = 0n;
    let filled = 0n;
    let levelsConsumed = 0;
    for (const lvl of levels) {
        if (remaining <= 0n)
            break;
        const take = lvl.quantity < remaining ? lvl.quantity : remaining;
        if (take <= 0n)
            continue;
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
/**
 *  Fold candle buckets whose `bucketStart >= nowSec − 86400` into a
 *  {@link MarketStats24h}. `candles` are oldest-first (as `getCandles` returns).
 *  Pure — the wiring in createClient just fetches the candles first.
 *
 * @category analytics
 */
export function marketStats24hFromCandles(candles, nowSec) {
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
        if (h > high)
            high = h;
        if (l < low)
            low = l;
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
export function pnlEventsFor(account, fills, routerActions) {
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
    const toBig = (v, what) => {
        if (!/^\d+$/.test(v)) {
            throw new InvalidInputError(`pnlEventsFor: ${what} is not an unsigned decimal integer: ${JSON.stringify(v)}`);
        }
        return BigInt(v);
    };
    const chainOrder = (id) => {
        const sep = id.indexOf("_");
        if (sep < 0) {
            throw new InvalidInputError(`pnlEventsFor: row id must be \`\${blockNumber}_\${logIndex}\`, got ${JSON.stringify(id)}`);
        }
        return [toBig(id.slice(0, sep), "block number"), toBig(id.slice(sep + 1), "log index")];
    };
    const cmp = (a, b) => {
        if (a < b)
            return -1;
        if (a > b)
            return 1;
        return 0;
    };
    const out = [];
    for (const f of fills) {
        const isMaker = (f.maker ?? "").toLowerCase() === acct;
        // The account can occupy the taker seat two ways. `Fill.taker` is a
        // denormalized copy the PendingTakerFill bridge writes; the taker ORDER is
        // what the indexer has from the moment BinaryOrderPlaced lands. Matching on
        // the copy alone drops a fill the account genuinely took — silently, out of
        // its own COST BASIS — on any row the bridge has not finished.
        const isTaker = (f.taker ?? "").toLowerCase() === acct || (f.takerOrder?.owner ?? "").toLowerCase() === acct;
        if (!isMaker && !isTaker)
            continue;
        // Same precedence as the taker seat above: the order is authoritative, the
        // fill's `takerSide` is the lagging copy.
        const side = isMaker ? f.makerSide : (f.takerOrder?.side ?? f.takerSide);
        if (side == null)
            continue; // side not bridged — skip rather than guess
        const outcomeIndex = side === "BUY_NO" || side === "SELL_NO" ? 1 : 0;
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
        if (a.account.toLowerCase() !== acct)
            continue;
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
export function computePositionPnL(events, balances, market, oneCollateral, opts) {
    const book = [
        { qty: 0n, cost: 0n, realized: 0n },
        { qty: 0n, cost: 0n, realized: 0n },
    ];
    const applyBuy = (idx, qty, price) => {
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
    const releaseCost = (b, sold) => {
        if (sold >= b.qty)
            return b.cost;
        if (b.qty <= 0n)
            return 0n;
        return (sold * b.cost) / b.qty;
    };
    const applySell = (idx, qty, price) => {
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
            const halve = (idx, total) => (idx === 0 ? total / 2n : total - total / 2n);
            if (e.kind === "mint") {
                for (const idx of [0, 1]) {
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
                if (remainder < 0n)
                    noOut = 0n;
                else if (remainder > n.cost)
                    noOut = n.cost;
                else
                    noOut = remainder;
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
        if (e.kind === "buy")
            applyBuy(e.outcomeIndex, e.quantity, price);
        else
            applySell(e.outcomeIndex, e.quantity, price);
    }
    const held = [balances.balanceYes, balances.balanceNo];
    // No `?? 0n` here: a market that has never traded has no price, and 0n is a
    // confident price. It marks YES at zero AND (by the complement below) NO at
    // full collateral. Carry the absence through instead — see
    // `BinaryOutcomePositionPnL.markPrice`.
    const yesMark = Units.markYesPrice(opts?.bookTop ?? {}, market.lastPrice);
    const markFor = (idx) => {
        if (market.voided) {
            // The stored vector is the payout — see `Units.voidPayoutFraction`. A
            // market indexed before both vector fields existed keeps the pre-vector
            // half, unchanged.
            const v = Units.voidPayoutFraction(market.payoutNumerators, market.payoutDenominator, idx);
            if (v == null)
                return oneCollateral / 2n;
            // Settlement floors each leg independently. Apply the selected stored
            // numerator directly so this mark matches `redeem` for the same amount.
            return (oneCollateral * v.numerator) / v.denominator;
        }
        if (market.winningOutcome != null)
            return market.winningOutcome === idx ? oneCollateral : 0n;
        if (yesMark == null)
            return null; // never traded, no book → unknown, not zero
        // Deriving NO by subtraction keeps the two legs summing to exactly one
        // whole collateral unit, including for an odd `oneCollateral`.
        return idx === 0 ? yesMark : oneCollateral - yesMark; // still trading → book-clamped last
    };
    // Build each leg ONCE, then sum the stored legs into the totals. Summing the
    // stored values (rather than recomputing the totals independently) is what
    // makes `yes.costBasis + no.costBasis === costBasis` hold exactly: every
    // field here is integer-divided, so two roundings of the same quantity are
    // not guaranteed to agree.
    const legFor = (idx) => {
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
export function pnlEventsForIndexed(operation, account, fills, routerActions) {
    try {
        return pnlEventsFor(account, fills, routerActions);
    }
    catch (e) {
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
export function estPayoutFor(input) {
    if (input.voided) {
        const v = Units.voidPayoutFraction(input.payoutNumerators, input.payoutDenominator, input.outcomeIdx);
        return v == null ? input.amount / 2n : (input.amount * v.numerator) / v.denominator;
    }
    if (input.winningOutcome != null && input.winningOutcome === input.outcomeIdx) {
        const fee = input.settlementFeeBps < 0n ? 0n : input.settlementFeeBps;
        return (input.amount * (10000n - fee)) / 10000n;
    }
    return 0n; // loser side (or unresolved) → nothing to claim
}
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
export function claimableInputFor(position, settlementFeeBps) {
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
export function claimableFrom(inputs) {
    const out = [];
    for (const i of inputs) {
        if (i.amount <= 0n)
            continue;
        const isWinner = i.winningOutcome != null && i.winningOutcome === i.outcomeIdx;
        if (!i.voided && !isWinner)
            continue; // loser or unresolved → skip
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
// ============================================================================
// B6 — stake/sell market-order builders: size a crossing IOC from a collateral
// stake (buy) or unwind a position (sell), with a protective tick-aligned limit
// ============================================================================
/** Basis-point denominator (100% = 10,000 bps). */
const BPS_DENOMINATOR = 10000n;
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
export function slippageForCrossing(price, tickSize, opts) {
    const bps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const minTicks = opts?.slippageMinTicks ?? DEFAULT_SLIPPAGE_MIN_TICKS;
    const percent = (price * bps) / BPS_DENOMINATOR;
    const floor = minTicks * tickSize;
    return percent > floor ? percent : floor;
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
export function quoteBinaryStakeOverBook(book, side, stake, oneCollateral, params) {
    const { tickSize, lotSize } = params;
    // Grid values are divisors below — misconfigured market data (a zero
    // tick/lot/oneCollateral) would throw or produce garbage. Bail to null.
    if (tickSize <= 0n || lotSize <= 0n || oneCollateral <= 0n || stake <= 0n)
        return null;
    const levels = side === "BUY_YES" ? book.yesAsks : book.noAsks;
    // Sweep cheapest-first, adding shares at each level while the escrow at the
    // running protective price (the worst level touched) stays within the stake.
    let quantity = 0n;
    let limit = 0n;
    for (const level of levels) {
        const { price, quantity: available } = level;
        // Skip unusable levels; a price outside (0, oneCollateral) isn't a real
        // book crossing and would break the escrow/quantity math.
        if (price <= 0n || price >= oneCollateral || available <= 0n)
            continue;
        // Most shares the stake can escrow if this level becomes the protective
        // price. Pricier levels only shrink this ceiling, so once it's at or below
        // what we already hold the sweep is done.
        const maxQuantity = (stake * oneCollateral) / price;
        if (maxQuantity <= quantity)
            break;
        const headroom = maxQuantity - quantity;
        const take = available < headroom ? available : headroom;
        quantity += take;
        limit = price;
        // Escrow ceiling hit partway through this level — deeper levels are only
        // pricier, so there's nothing more to buy within the stake.
        if (take < available)
            break;
    }
    if (quantity <= 0n || limit <= 0n)
        return null;
    // Pad the protective limit with slippage headroom, then snap it back onto
    // the tick grid — the pool rejects any price that isn't a tickSize multiple.
    // Round UP so the limit stays at or above every swept level (they all still
    // cross), then cap a tick below a full share.
    const maxPrice = oneCollateral - tickSize;
    const paddedRaw = limit + slippageForCrossing(limit, tickSize, params);
    const alignedUp = ((paddedRaw + tickSize - 1n) / tickSize) * tickSize;
    const paddedLimit = alignedUp > maxPrice ? maxPrice : alignedUp;
    if (paddedLimit <= 0n)
        return null;
    // Re-fit the quantity to the stake at the padded price and snap DOWN to a
    // whole lot — so escrow (quantity × padded price) stays within the stake
    // (the documented max loss) and the pool can't pull more than the user
    // committed. The pool rejects a non-lot quantity (`InvalidQuantity`).
    const affordable = (stake * oneCollateral) / paddedLimit;
    const capped = affordable < quantity ? affordable : quantity;
    const finalQuantity = (capped / lotSize) * lotSize;
    // The pool also enforces a minimum order size (a lot multiple, possibly
    // > 1 lot) — a lot-aligned quote below it would revert QuantityBelowMinimum.
    if (finalQuantity <= 0n || finalQuantity < (params.minQuantity ?? 0n))
        return null;
    return {
        side,
        yesPrice: side === "BUY_YES" ? paddedLimit : oneCollateral - paddedLimit,
        limitPrice: paddedLimit,
        quantity: finalQuantity,
        escrow: (finalQuantity * paddedLimit + oneCollateral - 1n) / oneCollateral,
    };
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
export function quoteBinarySellOverBook(book, side, quantity, oneCollateral, params) {
    const { tickSize, lotSize } = params;
    if (tickSize <= 0n || lotSize <= 0n || oneCollateral <= 0n || quantity <= 0n)
        return null;
    const bestBid = (side === "SELL_YES" ? book.yesBids : book.noBids)[0]?.price;
    if (bestBid == null || bestBid <= 0n)
        return null;
    // Lowest price (in the sold side's own terms) the sweep will accept, aligned
    // down to the tick and never below one tick.
    const slip = slippageForCrossing(bestBid, tickSize, params);
    const floorRaw = bestBid > slip ? bestBid - slip : tickSize;
    const aligned = (floorRaw / tickSize) * tickSize;
    const floor = aligned < tickSize ? tickSize : aligned;
    const yesPrice = side === "SELL_YES" ? floor : oneCollateral - floor;
    if (yesPrice <= 0n || yesPrice >= oneCollateral)
        return null;
    // The pool rejects a non-lot quantity — snap down rather than revert; the
    // sub-lot dust remainder isn't sellable on the book anyway. Same for a
    // position below the pool's minimum order size (QuantityBelowMinimum).
    const lotQuantity = (quantity / lotSize) * lotSize;
    if (lotQuantity <= 0n || lotQuantity < (params.minQuantity ?? 0n))
        return null;
    // Walk the crossable bids (best-first, at or above the floor) so the quote
    // reports what will actually fill — the buy side's honesty mirrored. The
    // order still submits `lotQuantity`; anything past `fillableQuantity` is
    // IOC-canceled, and the caller can warn about the partial unwind up front.
    const bids = side === "SELL_YES" ? book.yesBids : book.noBids;
    let fillableQuantity = 0n;
    let estProceeds = 0n;
    for (const { price, quantity: available } of bids) {
        if (price < floor)
            break; // sorted best-first — nothing deeper crosses
        if (price >= oneCollateral || available <= 0n)
            continue;
        const headroom = lotQuantity - fillableQuantity;
        if (headroom <= 0n)
            break;
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
export function midYesPrice(bestYesBid, bestYesAsk) {
    if (bestYesBid !== undefined && bestYesAsk !== undefined) {
        return (bestYesBid + bestYesAsk) / 2n;
    }
    return bestYesAsk ?? bestYesBid;
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
export function averageEntryPrice(input) {
    const { trades, outcomeIndex, oneShare } = input;
    const isYes = outcomeIndex === 0;
    const buySide = isYes ? "BUY_YES" : "BUY_NO";
    let weightedCost = 0n;
    let totalQuantity = 0n;
    for (const trade of trades) {
        if (trade.side !== buySide)
            continue;
        let quantity;
        let yesPrice;
        try {
            quantity = BigInt(trade.quantity);
            yesPrice = BigInt(trade.fillPrice);
        }
        catch {
            continue;
        }
        if (quantity <= 0n)
            continue;
        weightedCost += (isYes ? yesPrice : oneShare - yesPrice) * quantity;
        totalQuantity += quantity;
    }
    if (totalQuantity <= 0n)
        return null;
    return weightedCost / totalQuantity;
}
/**
 *  Live mark price for one outcome in its own terms (raw): YES marks at the
 *  YES mid, NO at the complement. `undefined` when there's no mid to mark to.
 *
 * @category analytics
 */
export function outcomeMarkPrice(input) {
    const { outcomeIndex, yesMid, oneShare } = input;
    if (yesMid === undefined)
        return undefined;
    return outcomeIndex === 0 ? yesMid : oneShare - yesMid;
}
/**
 *  Mark an outcome position: `value = balance × mark`, `upnl = balance ×
 *  (mark − avgEntry)`. When `avgEntry` is unknown (no buys indexed yet) only
 *  `value` is computed and the PnL fields stay `null` — a dash beats an
 *  invented zero basis.
 *
 * @category analytics
 */
export function markOutcomePosition(input) {
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
 *  Statuses meaning the resolution is on record. The indexer supersedes
 *  on-chain `"Resolved"` with the derived terminal `"Finalized"` in the same
 *  breath as resolution — matching only `"Resolved"` leaves every concluded
 *  position stuck on "Settling".
 */
const RESOLVED_STATUSES = new Set(["Resolved", "Finalized"]);
/**
 *  Classify how a position marks from its market's status/resolution: a
 *  resolved market pays its winning outcome, a voided one refunds, a
 *  still-trading one marks live, and anything expired-but-unresolved is
 *  settling (marking to a stale book there flashes phantom PnL).
 *
 * @category analytics
 */
export function positionMarkState(input) {
    const { status, voided, winningOutcome, outcomeIndex, expirySec, nowSec } = input;
    if (voided || status === "Voided")
        return "voided";
    if (RESOLVED_STATUSES.has(status)) {
        if (winningOutcome == null)
            return "settling";
        return winningOutcome === outcomeIndex ? "won" : "lost";
    }
    // Not yet resolved: still live until expiry, then awaiting settlement.
    return Number.isFinite(expirySec) && expirySec <= nowSec ? "settling" : "live";
}
