// SpotPool funding + lock reads, at chain head.
//
// SPOT-ONLY: every function here is declared on ISpotPool. Auto-pull, the operator
// gate, and the lock breakdown are all spot-CLOB machinery — a BinaryPool escrows
// through the module and has none of it.
//
// Two of these five (getAutoPullRequirement, isOperatorAuthorized) were already
// being called INSIDE the stop-order preflight before they were public. The
// preflight now consumes these wrappers, so there is one code path rather than two
// that can drift.
import * as TradeAbi from "../tradeAbi.js";
/**
 *  What an order of this shape would cost the owner, and how far short their vault
 *  balance falls.
 *
 *  **When to use**
 *
 *  Before placing, to answer "will this pull from my wallet, and how much?" — or,
 *  under manual vault mode, "how much must I deposit first?". `delta` is the same
 *  number in both readings: in auto-pull mode it is what the wallet will be pulled
 *  for; in manual mode it is the required pre-deposit (see `setManualVaultMode`, and
 *  `depositVault` to fund it).
 *
 *  **Details**
 *
 *  `requiredAmount` is a worst-case envelope, not a quote: the pool prices it at
 *  `max(takerFee, makerFee) + builderFee`, since a single order is either crossed as
 *  taker or rested as maker but never both. An order that rests and later fills as
 *  maker consumes less.
 *
 * **Example** (Funding an order shortfall)
 *
 *  ```ts
 *  const need = await client.getAutoPullRequirement({ pool, owner, isBid: true, price: 1n, quantity: 1n });
 *  if (need.delta > 0n) {
 *    const trader = client.createTrader({ privateKey });
 *    await trader.depositVault({ vault: pool, token: need.inputToken, amount: need.delta });
 *  }
 *  ```
 */
export async function getAutoPullRequirement(p, client) {
    const [inputToken, requiredAmount, delta] = await client.readContract({
        address: p.pool,
        abi: TradeAbi.spotPoolStopReadAbi,
        functionName: "getAutoPullRequirement",
        args: [p.owner, p.isBid, p.price, p.quantity, p.builderFeeBpsTimes1k ?? 0n],
    });
    return { inputToken, requiredAmount, delta };
}
/**
 *  Whether `owner` has authorized `operator` to call `selector` on this pool, at
 *  chain head.
 *
 *  **Details**
 *
 *  Resolved through the pool's linked OperatorPermissionsRegistry, so it reflects
 *  global and per-pool grants and the denial-trumps-approval rule — and it answers
 *  immediately after a grant lands, with no indexer lag. An unwired pool denies.
 */
export async function isOperatorAuthorized(p, client) {
    return client.readContract({
        address: p.pool,
        abi: TradeAbi.operatorAuthorizationReadAbi,
        functionName: "isOperatorAuthorized",
        args: [p.owner, p.operator, p.selector],
    });
}
/**
 *  What `owner`'s resting orders currently lock in this pool.
 *
 *  **When to use**
 *
 *  The trader-facing half of "where is my money?" — pair it with `getVaultBalance`
 *  (claimable) to account for everything the pool holds for an account. For the
 *  pool's own solvency, see {@link SomniaMarketsClient.getLockedTokenBreakdown}.
 *
 *  **Details**
 *
 *  The underlying view answers for `msg.sender`, so this read impersonates `owner`
 *  via the `eth_call` `from` field — no signature, and it works for an account the
 *  caller does not control. Expired-but-unswept orders still count: their tokens
 *  remain locked until swept.
 */
export async function getOwnLockedBalance(p, client) {
    const [lockedBase, lockedQuote] = await client.readContract({
        address: p.pool,
        abi: TradeAbi.spotPoolLockReadAbi,
        functionName: "getOwnLockedBalance",
        // Impersonate the owner: the view reads msg.sender, and an eth_call `from`
        // needs no signature.
        account: p.owner,
    });
    return { lockedBase, lockedQuote };
}
/**
 *  How the pool's reserves of each token divide between resting orders and leftover.
 *
 *  **When to use**
 *
 *  Venue health, not portfolio: it answers "is this pool solvent against its book,
 *  and how much sits here backing nothing?" for an operator or auditor. A trader
 *  asking where THEIR money is wants {@link getOwnLockedBalance} plus
 *  `getVaultBalance`.
 *
 *  **Details**
 *
 *  For each token `principalLocked + lockedSurplus + leftover` equals the pool's
 *  reserves of it, by construction — `leftover` is defined as the remainder. Accrued
 *  protocol fees therefore show up as `leftover`.
 *
 *  **Gotchas**
 *
 *  One `eth_call` walks BOTH book sides in full, so cost grows with the book. It
 *  counts expired-but-unswept orders, whose tokens are genuinely still locked.
 *
 *  To read a resting bid's principal yourself, convert with
 *  {@link convertToQuoteAtPriceCeil} — the pool's own rounding, which this
 *  breakdown uses.
 */
export async function getLockedTokenBreakdown(pool, client) {
    const [base, quote] = await client.readContract({
        address: pool,
        abi: TradeAbi.spotPoolLockReadAbi,
        functionName: "getLockedTokenBreakdown",
    });
    return { base, quote };
}
/**
 *  Convert a base quantity to quote at a price, using the pool's OWN ceil rounding.
 *
 *  **When to use**
 *
 *  To interpret {@link SomniaMarketsClient.getLockedTokenBreakdown}'s bid-side principal, or to predict
 *  a bid's quote escrow, without reimplementing the pool's rounding (`ceil(base ×
 *  price / oneBase)`) and risking divergence from it.
 */
export async function convertToQuoteAtPriceCeil(p, client) {
    return client.readContract({
        address: p.pool,
        abi: TradeAbi.spotPoolLockReadAbi,
        functionName: "convertToQuoteAtPriceCeil",
        args: [p.baseQuantity, p.price],
    });
}
