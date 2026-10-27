// Unit helpers. Money crosses this SDK as raw integers (bigint on the write side,
// decimal strings from the indexer) scaled by a token's decimals — never as
// human floats. These convert at the edges so callers stop hand-rolling
// `value / 10 ** decimals` and `BigInt(Math.round(x * 1e6))` (which silently lose
// precision or overflow). Prefer `fromHuman` for input and `toHuman` for display.
import { formatUnits, parseUnits } from "viem";
import { InvalidInputError } from "./errors.js";
import * as Store from "./store.js";
/**
 *  Raw integer (string or bigint) → human number for DISPLAY ONLY. Lossy past
 *  ~15 significant digits (it's an IEEE double) — never round-trip money through
 *  this; use it for labels/charts. `decimals` defaults to 6, which is only
 *  correct for a six-decimal token. Pass the selected market's `quoteDecimals`
 *  for binary collateral/prices or `baseDecimals` for base quantities.
 *
 * @category converting
 */
export function toHuman(raw, decimals = Store.DECIMALS) {
    return Number(formatUnits(BigInt(raw), decimals));
}
/**
 *  Raw integer → exact human STRING (no precision loss). For display where you
 *  want the full value, or to feed another decimal library.
 *
 * @category converting
 */
export function toHumanString(raw, decimals = Store.DECIMALS) {
    return formatUnits(BigInt(raw), decimals);
}
/**
 *  Human amount (number or decimal string) → raw bigint at `decimals`, for the
 *  write API (`placeOrder` price/quantity, `mintSet` amount, …). Pass the
 *  selected binary market's `quoteDecimals`; the default is 6. Accepts a string
 *  to avoid float rounding (`fromHuman("0.1")`), or a number for convenience.
 *
 *  **Gotchas**
 *
 *  A number carrying more fraction digits than `decimals` is ROUNDED to scale
 *  (half-away-from-zero, via `toFixed`): `fromHuman(0.1234567, 6)` is
 *  `123457n`. That is a deliberate, long-standing choice — the alternative
 *  (throwing) would reject ordinary computed values like a mid price. Pass a
 *  string when you need the exact value preserved or rejected instead.
 *
 * @category converting
 */
export function fromHuman(human, decimals = Store.DECIMALS) {
    if (typeof human === "number" && !Number.isFinite(human)) {
        // Otherwise "Infinity"/"NaN" reaches parseUnits and surfaces as viem's
        // InvalidDecimalNumberError — a third-party error crossing our boundary.
        throw new InvalidInputError(`amount must be a finite number, got ${human}`);
    }
    return parseUnits(typeof human === "number" ? humanToDecimalString(human, decimals) : human, decimals);
}
/**
 *  A JS number → a plain decimal string at most `decimals` places wide, which is
 *  what `parseUnits` accepts (it rejects "1e-7" exponent notation and mantissas
 *  longer than `decimals`).
 *
 *  Use this for every number → raw conversion in the SDK, so the write path has
 *  ONE definition of "the value the caller typed". `toFixed(decimals)` alone is
 *  not that: it prints the float's binary expansion rather than the number the
 *  caller wrote, so at 18 decimals `(0.05).toFixed(18)` is
 *  "0.050000000000000003". Three wei is enough to miss a 1e15 tick and have the
 *  pool reject the order with `InvalidPrice` — so on an 18-decimal venue almost
 *  every ordinary probability was unplaceable through the number path, while a
 *  6-decimal venue (where the expansion rounds away) never showed it.
 *
 *  `String(n)` gives the shortest representation that round-trips to the same
 *  double, i.e. the number the caller meant ("0.05"). Prefer it whenever it fits
 *  the scale, and keep `toFixed` for the two cases it exists for: exponent
 *  notation, and a mantissa longer than the token's decimals (which it rounds to
 *  scale — see `fromHuman`'s Gotchas).
 *
 *  Note this fixes only conversion, not arithmetic done before it: a caller who
 *  computes `3 * 0.05` hands over `0.15000000000000002`, a genuinely different
 *  number, and gets it converted faithfully. Snapping a COMPUTED price onto the
 *  venue's grid is a separate step: {@link snapRawToGrid} for a raw `bigint` on
 *  the engine path, or `exchange.priceToPrecision` on the unified facade.
 */
export function humanToDecimalString(n, decimals) {
    const shortest = String(n);
    if (!shortest.includes("e") && !shortest.includes("E")) {
        const fractionDigits = shortest.split(".")[1]?.length ?? 0;
        if (fractionDigits <= decimals)
            return shortest;
    }
    return n.toFixed(decimals);
}
// ---- binary-market price <-> probability ----
// A binary YES limit price is raw collateral per whole outcome token: full
// collateral (10^decimals) buys a share worth 1, so price / 10^decimals is the
// YES probability in [0, 1]. NO probability is the complement.
/**
 * Raw YES price → YES probability in [0, 1]. Pass the binary market's
 * `quoteDecimals`; the default is 6.
 *
 * @category converting
 */
export function priceToProbability(rawPrice, decimals = Store.DECIMALS) {
    return toHuman(rawPrice, decimals);
}
/**
 * YES probability in [0, 1] → raw YES price (the `price` field of placeOrder).
 * Pass the binary market's `quoteDecimals`; the default is 6.
 *
 * @category converting
 */
export function probabilityToPrice(probability, decimals = Store.DECIMALS) {
    // Stated as "in range" rather than "out of range" so NaN — false for both
    // `< 0` and `> 1` — is rejected here instead of falling through.
    if (!(probability >= 0 && probability <= 1)) {
        throw new InvalidInputError(`probability must be in [0, 1], got ${probability}`);
    }
    return fromHuman(probability, decimals);
}
/**
 *  Mark-to-market YES price (raw): the book mid when two-sided, otherwise the
 *  last trade clamped into the surviving side's bound. The clamp reconciles the
 *  two failure modes of a one-sided book: marking to the lone quote outright
 *  flashes the full bid-ask spread as a loss right after a taker clears the top
 *  of the book, while marking to the last trade alone freezes the mark at a
 *  stale print when the market genuinely runs away — a resting quote BEYOND the
 *  last print is live, executable information and supersedes it. With no last
 *  trade the lone side is all there is; `null` only when the book is empty and
 *  nothing has traded.
 *
 * @category converting
 */
export function markYesPrice(top, lastPrice) {
    const { bestBid, bestAsk } = top;
    if (bestBid != null && bestAsk != null)
        return (bestBid + bestAsk) / 2n;
    const last = lastPrice != null ? BigInt(lastPrice) : null;
    if (last == null)
        return bestAsk ?? bestBid ?? null;
    if (bestBid != null && last < bestBid)
        return bestBid;
    if (bestAsk != null && last > bestAsk)
        return bestAsk;
    return last;
}
/**
 *  The settlement vector a voided market actually pays, as the fraction one
 *  outcome token of `outcomeIdx` redeems for — `numerators[outcomeIdx] /
 *  denominator`. `null` only when neither vector field is present.
 *
 *  A void pays whatever vector the contract stored, NOT a fixed half. Under the
 *  `UNIFORM` void policy that vector is `[D/2, D/2]` and the half is right;
 *  under `CLOB_SNAPSHOT` a void can store `[p, D−p]` at the closing YES price,
 *  and then a half is wrong on both legs.
 *
 *  Read the vector, never the policy. `BinaryMarket.sol` writes the uniform
 *  vector on every `CLOB_SNAPSHOT` fallback (no capture pool, a reverting
 *  `closingPrice()`, a one-sided or empty book, every overflow guard), so a
 *  snapshot market frequently pays uniform. Deciding from `voidPolicy` would
 *  misreport exactly those markets — the stored vector already encodes the
 *  outcome of every fallback, and `voidPolicy` is display provenance.
 *
 *  Callers keep their own pre-vector behavior on `null`: a voided market can
 *  have both vector fields absent when it was indexed before those fields
 *  existed. A partially present or invalid vector throws
 *  {@link InvalidInputError}. Invalid data must not become a plausible payout
 *  estimate.
 *
 *  **Errors**
 *
 *  Throws {@link InvalidInputError} when a present vector is malformed or does
 *  not satisfy the binary void-vector invariants.
 *
 * @category converting
 */
export function voidPayoutFraction(numerators, denominator, outcomeIdx) {
    if (numerators == null && denominator == null)
        return null;
    if (numerators == null || denominator == null) {
        throw new InvalidInputError("a void payout vector must provide both numerators and denominator");
    }
    // Validate the vector as a PAIR, not one leg at a time. Per-leg validation
    // would let a corrupt row pass on one leg and fail on the other. Consumers
    // would then report different payout validity for the same market. A vector
    // is either usable for both legs or usable for neither.
    if (numerators.length !== 2) {
        throw new InvalidInputError("a void payout vector must contain exactly two legs");
    }
    const rawYes = numerators[0];
    const rawNo = numerators[1];
    if (rawYes == null || rawNo == null) {
        throw new InvalidInputError("a void payout vector must contain both outcome legs");
    }
    let yes;
    let no;
    let denom;
    try {
        yes = BigInt(rawYes);
        no = BigInt(rawNo);
        denom = BigInt(denominator);
    }
    catch (cause) {
        throw new InvalidInputError("a void payout vector must contain integer decimal strings", { cause });
    }
    // A void stores either the uniform pair or `[p, D-p]`, with `p` clamped to
    // `[1, D-1]`. Both legs are positive and sum to the denominator. A one-hot
    // pair is valid for resolution, but it is impossible for a void.
    if (denom <= 0n || yes <= 0n || no <= 0n || yes + no !== denom) {
        throw new InvalidInputError("a void payout vector must have two positive legs that sum to its denominator");
    }
    const numer = outcomeIdx === 0 ? yes : no;
    return { numerator: numer, denominator: denom };
}
/**
 *  Derive per-account {@link BinaryPnlFill}s from the raw {@link FillRow}s the
 *  indexer returns (as from `getUserFills`), from `account`'s perspective.
 *  Skips fills whose side/kind the indexer hasn't fully bridged (unknown side),
 *  and re-expresses the fill's price into the outcome the account traded (the
 *  book is YES-terms; a NO trade prices at `1 − yesPrice`).
 *
 *  SCOPE IS THE CALLER'S JOB: no market filter is applied here, so pass ONE
 *  market's fills when the result feeds cost basis, selected by
 *  {@link FillRow.market} (never by `pool` — see there).
 *
 * @category converting
 */
export function binaryFillsFor(account, fills, decimals = Store.DECIMALS) {
    const acct = account.toLowerCase();
    const one = 10n ** BigInt(decimals);
    const out = [];
    for (const f of fills) {
        const isMaker = (f.maker ?? "").toLowerCase() === acct;
        // Two ways to hold the taker seat on binary: `taker` is a denormalized copy
        // the PendingTakerFill bridge writes, while the taker ORDER is authoritative
        // from the moment BinaryOrderPlaced lands. Matching the copy alone drops a
        // fill the account genuinely took — out of its own PnL, silently.
        const isTaker = (f.taker ?? "").toLowerCase() === acct || (f.takerOrder?.owner ?? "").toLowerCase() === acct;
        if (!isMaker && !isTaker)
            continue;
        // Same precedence: the order is authoritative, the fill's copy lags it.
        const side = isMaker ? f.makerSide : (f.takerOrder?.side ?? f.takerSide);
        if (side == null)
            continue; // side not yet bridged — skip rather than guess
        // BinarySide encodes BOTH the outcome and the direction (BUY_YES / SELL_NO / …).
        const outcomeIndex = side === "BUY_NO" || side === "SELL_NO" ? 1 : 0;
        const isBuy = side === "BUY_YES" || side === "BUY_NO";
        const yesPrice = BigInt(f.fillPrice);
        const price = outcomeIndex === 1 ? one - yesPrice : yesPrice;
        out.push({ outcomeIndex, isBuy, quantity: f.quantity, price: price.toString() });
    }
    return out;
}
/**
 *  Derive {@link BinaryPnlFill}s from one market's slice of a portfolio's
 *  trades (as from `getPortfolio`). The portfolio view already resolves the
 *  account's own side per fill, so this only re-expresses the YES-terms
 *  `fillPrice` into the traded outcome (a NO trade prices at `1 − yesPrice`)
 *  and skips fills whose side the indexer hasn't bridged yet.
 *
 * **Gotchas**
 *
 * The portfolio reads cut `trades` two ways, and BOTH have to be checked before a
 * total derived from them means anything — this function reports no warning of its own.
 *
 * They cap the page (default 50) and page newest-first: `tradesTruncated` says whether
 * that cap was hit. They also WINDOW the leg — by default to the last seven days — and
 * `tradesSince` is the bound that was applied. A wallet whose fills predate the window
 * comes back with `tradesTruncated: false` and an incomplete `trades`, so the flag alone
 * is not enough. For a whole-history PnL ask for the history first: `since: 0` (with a
 * `tradesLimit` to match), then check `tradesTruncated`.
 *
 * @category converting
 */
export function binaryFillsFromPortfolio(trades, decimals = Store.DECIMALS) {
    const one = 10n ** BigInt(decimals);
    const out = [];
    for (const t of trades) {
        if (t.side == null)
            continue; // side not yet bridged — skip rather than guess
        const outcomeIndex = t.side === "BUY_NO" || t.side === "SELL_NO" ? 1 : 0;
        const isBuy = t.side === "BUY_YES" || t.side === "BUY_NO";
        const yesPrice = BigInt(t.fillPrice);
        const price = outcomeIndex === 1 ? one - yesPrice : yesPrice;
        out.push({ outcomeIndex, isBuy, quantity: t.quantity, price: price.toString() });
    }
    return out;
}
/**
 *  Realized + unrealized binary PnL for one account, avg-cost basis — a PURE
 *  helper (no indexer/chain dependency). `fills` are the account's own trades
 *  (from {@link binaryFillsFor}); `balances` its current YES/NO holdings (from
 *  `getOutcomeBalances`); `market` supplies decimals + resolution state.
 *
 *  Realized PnL accrues on sells (proceeds − avg cost of the tokens sold).
 *  Unrealized marks the remaining position: to the book-clamped last price
 *  while trading (see {@link markYesPrice}; pass `opts.bookTop` so a live
 *  quote beyond a stale print corrects the mark), and to the settlement payout
 *  once resolved: 1 for the winning outcome, 0 for the loser, and on a void
 *  each leg's share of the market's stored payout vector — a half per side
 *  under the `UNIFORM` void policy, `[p, D−p]` at the closing YES price on a
 *  `CLOB_SNAPSHOT` void that captured a two-sided close.
 *
 *  An unresolved market that has never traded has no mark. When
 *  `market.lastPrice` is null and `opts.bookTop` supplies no quote, `mark`,
 *  `value` and `unrealized` are `null` on both legs, as are the combined
 *  `unrealized` and `total`. `realized` and `avgCost` stay exact, because
 *  neither depends on a mark.
 *
 *  **Errors**
 *
 *  Throws {@link InvalidInputError} when a void has a present but invalid payout
 *  vector. A missing legacy vector keeps the documented half-payout fallback.
 *
 * @category converting
 */
export function computeBinaryPnl(fills, balances, market, opts) {
    const decimals = market.quoteDecimals ?? Store.DECIMALS;
    const scale = 10 ** decimals;
    const book = [
        { qty: 0, cost: 0, realized: 0 },
        { qty: 0, cost: 0, realized: 0 },
    ];
    // Fills are applied oldest-first for a correct avg-cost roll; the indexer
    // reads are newest-first, so reverse a shallow copy.
    for (const f of [...fills].reverse()) {
        const idx = f.outcomeIndex === 1 ? 1 : 0;
        const qty = Number(BigInt(f.quantity)) / scale;
        const px = Number(BigInt(f.price)) / scale;
        const b = book[idx];
        if (f.isBuy) {
            b.qty += qty;
            b.cost += qty * px;
        }
        else {
            const avg = b.qty > 0 ? b.cost / b.qty : 0;
            const sold = Math.min(qty, b.qty);
            b.realized += (px - avg) * sold;
            b.qty -= sold;
            b.cost -= avg * sold;
        }
    }
    const heldYes = Number(BigInt(balances.yes)) / scale;
    const heldNo = Number(BigInt(balances.no)) / scale;
    const held = [heldYes, heldNo];
    const resolved = market.winningOutcome != null || market.voided;
    // No `: 0` fallback here: a market that has never traded has no price, and 0
    // is a confident price. It values YES at zero AND (by the complement below)
    // NO at the full collateral unit. Carry the absence through instead — see
    // `BinaryOutcomePnl.mark`.
    const yesMarkRaw = markYesPrice(opts?.bookTop ?? {}, market.lastPrice);
    const yesMark = yesMarkRaw != null ? Number(yesMarkRaw) / scale : null;
    const markFor = (idx) => {
        if (market.voided) {
            // The stored vector is the payout — see `voidPayoutFraction`. Falling back
            // to the half keeps pre-vector markets (null numerators/denominator)
            // marking exactly as they did before this field existed.
            const v = voidPayoutFraction(market.payoutNumerators, market.payoutDenominator, idx);
            return v == null ? 0.5 : Number(v.numerator) / Number(v.denominator);
        }
        if (market.winningOutcome != null)
            return market.winningOutcome === idx ? 1 : 0;
        if (yesMark == null)
            return null; // never traded, no book → unknown, not zero
        return idx === 0 ? yesMark : 1 - yesMark; // still trading → book-clamped last
    };
    const sidePnl = (idx) => {
        const b = book[idx];
        const avg = b.qty > 0 ? b.cost / b.qty : 0;
        // Mark the CURRENT balance (authoritative), not the fills-derived qty — they
        // can diverge if the account moved tokens outside the order book.
        const mark = markFor(idx);
        if (mark == null)
            return { realized: b.realized, unrealized: null, avgCost: avg, mark: null, value: null };
        const unrealized = resolved ? held[idx] * mark - avg * Math.min(held[idx], b.qty) : (mark - avg) * held[idx];
        return { realized: b.realized, unrealized, avgCost: avg, mark, value: held[idx] * mark };
    };
    const yes = sidePnl(0);
    const no = sidePnl(1);
    const realized = yes.realized + no.realized;
    // Both legs read the same market, so they are unknown together; the explicit
    // pair check keeps the totals honest without assuming that.
    const unrealized = yes.unrealized != null && no.unrealized != null ? yes.unrealized + no.unrealized : null;
    return {
        yes,
        no,
        realized,
        unrealized,
        total: unrealized != null ? realized + unrealized : null,
    };
}
/** Guard so a `Number` that rounded up past the balance can't loop forever. */
const MAX_NUDGE_STEPS = 8;
/**
 *  Convert a raw balance to the largest JS number that does not exceed it —
 *  full token precision, no lot/display quantum. `Number(formatUnits(raw))`
 *  rounds to nearest, so on high-precision balances it can land a ULP above
 *  the true value; this nudges the result down until it round-trips back to
 *  ≤ `raw`. Size "max" orders against this, never against a
 *  nearest-rounded conversion — a max that exceeds the wallet by one ULP is
 *  an on-chain "insufficient balance" revert.
 *
 *  The round-trip is verified through the same number-to-raw conversion the
 *  write path applies, so the guarantee holds for the value `createOrder` will
 *  actually send rather than for a differently-rounded stand-in.
 *
 * @category converting
 */
export function balanceFloor(raw, decimals = Store.DECIMALS) {
    if (raw <= 0n)
        return 0;
    let candidate = Number(formatUnits(raw, decimals));
    for (let step = 0; step < MAX_NUDGE_STEPS; step += 1) {
        let asRaw;
        try {
            // Verify against the conversion the WRITE path performs, not against
            // `toFixed`. `humanToDecimalString` prefers the shortest string that
            // round-trips to the same double, so `1.001` converts as "1.001" —
            // whereas `(1.001).toFixed(18)` is "1.000999999999999890", a smaller
            // value. Checking the smaller one passed a candidate that `createOrder`
            // then converted to MORE raw units than the wallet held.
            //
            // It has to be this function rather than `String(candidate)`: the two
            // agree on plain decimals, but `String` yields exponent notation for very
            // small or very large values, which `parseUnits` rejects — sending those
            // to the catch below and giving up tightness the write path could carry.
            asRaw = parseUnits(humanToDecimalString(candidate, decimals), decimals);
        }
        catch {
            // Round-trip verification unavailable (exponent notation on huge
            // balances, or decimals beyond toFixed's range) — back off below the
            // nearest-rounding error bound so the result provably sits under the
            // true balance rather than trusting an unverified candidate.
            return candidate * (1 - 2 * Number.EPSILON);
        }
        if (asRaw <= raw)
            return candidate;
        candidate -= Math.max(Math.abs(candidate) * Number.EPSILON, Number.MIN_VALUE);
    }
    // Nudges exhausted without a verified round-trip — same provable back-off.
    return candidate * (1 - 2 * Number.EPSILON);
}
/**
 *  Floor a raw on-chain balance to a whole multiple of `quantum` (a human
 *  decimal string — the market's lot size for base amounts, or a display
 *  precision like "0.01" for quote) and return it as a JS number that is
 *  provably ≤ the true balance. Flooring happens in raw (bigint) space, so
 *  float rounding can never push a "max" order above the wallet.
 *
 * @category converting
 */
export function floorRawBalance(raw, decimals, quantum) {
    if (raw <= 0n)
        return 0;
    let step;
    try {
        step = parseUnits(quantum, decimals);
    }
    catch {
        step = 0n;
    }
    if (step <= 0n)
        return balanceFloor(raw, decimals);
    return balanceFloor((raw / step) * step, decimals);
}
/**
 *  Ceil a raw on-chain amount UP to a whole multiple of `quantum` (a human
 *  decimal string — the market's lot size for base amounts, or a display
 *  precision like "0.01" for quote). The mirror of {@link floorRawBalance},
 *  for sizing a **minimum**: a minimum rounded DOWN falls below what the pool
 *  requires and the order is rejected as under the minimum — the exact mirror
 *  of the max-order revert the floors prevent. An amount below one quantum
 *  rises to one whole quantum rather than collapsing to `0` the way the floor
 *  does.
 *
 *  Returns a `bigint`, unlike the floors, which return `number`. A minimum is
 *  checked against the lot boundary exactly, and no `double` can hold one: the
 *  nearest `double` to `0.1` at 18 decimals sits tens of wei off, which puts it
 *  below the minimum itself. Convert at the edge if you need a number —
 *  `Number(formatUnits(result, decimals))`.
 *
 * @category converting
 */
export function ceilRawAmount(raw, decimals, quantum) {
    if (raw <= 0n)
        return 0n;
    let step;
    try {
        step = parseUnits(quantum, decimals);
    }
    catch {
        step = 0n;
    }
    // `<= 0n`, not `=== 0n`: parseUnits ACCEPTS "-0.1" and returns a negative
    // step, which would quantize a minimum downward — the revert this prevents.
    if (step <= 0n)
        return raw;
    // Round away from zero: only add a step when `raw` is not already on the grid.
    return ((raw + step - 1n) / step) * step;
}
/**
 *  Snap a raw on-chain value onto a raw-units grid — a venue's `tickSize` for a
 *  price, or its `lotSize` for a quantity. Both come from the pool's
 *  `getOrderBookParameters`. Returns the aligned raw value.
 *
 *  **When to use**
 *
 *  Reach for this on the engine path, where a caller holds `bigint` price and
 *  quantity and calls `Trader.placeOrder` directly. The unified facade snaps for
 *  you — `exchange.createOrder` aligns price and quantity before it signs — so a
 *  facade caller does not need this.
 *
 *  The pool rejects anything off the grid: an off-tick price reverts
 *  `InvalidPrice`, an off-lot quantity reverts `InvalidQuantity`.
 *
 *  **Details**
 *
 *  `direction` belongs to the VALUE, not to the order side. Rounding the wrong
 *  way is a real loss rather than a formatting choice, and the side does not
 *  determine it: a RESTING buy limit rounds down to stay at or below the price
 *  the caller accepted, while a CROSSING buy limit rounds up so it still sweeps
 *  every level it was computed to reach. Both ship today, so a `side` parameter
 *  would silently invert one of them. Pass the direction you mean.
 *
 *  **Gotchas**
 *
 *  Rounding DOWN can return `0`, and for a PRICE that is the one value the pool
 *  always rejects (`InvalidPrice`). This helper does not hide that: a shared
 *  kernel that floored a price to one tick and a quantity to zero would be
 *  keying its behaviour on which of the two it was handed, which is exactly the
 *  guess this signature exists to avoid. Use {@link roundPriceToTick} for a
 *  price, which refuses to produce `0`. For a quantity, `0` is the honest
 *  answer — the caller has no size left and must branch rather than submit dust.
 *
 *  This aligns to the grid and nothing else. It does not check `minQuantity`,
 *  which the pool tests BEFORE lot alignment and reverts as
 *  `QuantityBelowMinimum`. On every venue this repository deploys
 *  `tickSize == lotSize == minQuantity`, so alignment satisfies the minimum
 *  there; on an external spot or perp book the two can differ, and a caller
 *  sizing against a minimum wants {@link ceilRawAmount}.
 *
 * @example Align a computed price and quantity before placing an order
 * ```ts
 * const trader = client.createTrader({ privateKey });
 * // `tickSize` and `lotSize` are the pool's own increments.
 * const { tickSize, lotSize } = await client.getBinaryBookParams(pool);
 *
 * // A crossing buy rounds the limit UP so it still sweeps every level.
 * const price = snapRawToGrid(rawPrice, tickSize, "up");
 * // Size rounds DOWN so it never exceeds what the caller has.
 * const quantity = snapRawToGrid(rawQuantity, lotSize, "down");
 *
 * // A quantity that floors to nothing is a real answer — branch, don't submit.
 * if (quantity > 0n) {
 *   await trader.placeOrder({ pool, side: "BUY_YES", price, quantity });
 * }
 * ```
 *
 * @throws {InvalidInputError} when `step` is not positive.
 * @category converting
 */
export function snapRawToGrid(raw, step, direction) {
    if (step <= 0n) {
        throw new InvalidInputError(`invalid grid step ${step}`);
    }
    const remainder = raw % step;
    if (remainder === 0n)
        return raw;
    // `%` in JS is a remainder, not a modulo: it keeps the sign of the dividend, so
    // a negative `raw` needs the opposite correction to land on the same grid.
    // Negative prices and quantities are nonsense to the pool, but aligning one
    // incorrectly here would hand it a value that looks aligned and is not.
    const down = remainder > 0n ? raw - remainder : raw - remainder - step;
    return direction === "up" ? down + step : down;
}
/**
 *  Snap a raw price onto the venue's `tickSize`, refusing to produce a price the
 *  pool rejects outright. {@link snapRawToGrid} with the zero guard a price needs
 *  and a quantity must not have.
 *
 *  **Details**
 *
 *  The pool checks `price != 0` before it checks tick alignment, so a price
 *  under one tick that floors to `0` reverts `InvalidPrice` — and reverts it for
 *  a reason the caller did not choose. A positive price below one tick therefore
 *  comes back as one whole tick, the nearest price that exists on the grid.
 *
 *  A non-positive price is a caller mistake rather than a rounding question, so
 *  it throws instead of being nudged onto the grid.
 *
 *  `direction` belongs to the value: a resting limit rounds toward the caller, a
 *  crossing limit rounds away so it still sweeps. See {@link snapRawToGrid}.
 *
 * @example Align a resting buy limit that may sit below one tick
 * ```ts
 * import { roundPriceToTick } from "@somnia-chain/markets-sdk";
 *
 * const tickSize = 1_000_000_000_000_000n; // 1e15, an 18-decimal venue
 *
 * roundPriceToTick(2_500_000_000_000_000n, tickSize, "down"); // 2e15, floored
 * roundPriceToTick(2_500_000_000_000_000n, tickSize, "up"); // 3e15, ceiled
 * roundPriceToTick(400_000_000_000_000n, tickSize, "down"); // 1e15, never 0n
 * ```
 *
 * @throws {InvalidInputError} when `tickSize` or `price` is not positive.
 * @category converting
 */
export function roundPriceToTick(price, tickSize, direction) {
    if (price <= 0n) {
        throw new InvalidInputError(`price ${price} must be positive to align to a tick`);
    }
    const aligned = snapRawToGrid(price, tickSize, direction);
    // Only a floor can land here: rounding up already moved past the first tick.
    return aligned === 0n ? tickSize : aligned;
}
/**
 *  Market-implied **Up** probability in [0, 1] from a raw YES price, or `null`
 *  when the price is missing/unusable. One source for header stats and trade
 *  rails so they always agree — pass the book mid, falling back to last price.
 *
 * @category converting
 */
export function upProbability(rawYes, decimals) {
    if (rawYes == null || decimals == null)
        return null;
    const probability = priceToProbability(rawYes, decimals);
    return Number.isFinite(probability) ? probability : null;
}
/**
 * The Up probability as a whole-percent integer (e.g. `0.546` → `55`).
 *
 * @category converting
 */
export function upPercent(rawYes, decimals) {
    const probability = upProbability(rawYes, decimals);
    return probability == null ? null : Math.round(probability * 100);
}
