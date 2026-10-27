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

import type { Address, Hex, PublicClient } from "viem";
import * as TradeAbi from "../tradeAbi.js";

/**
 * Identifies an order shape to price for funding — see {@link SomniaMarketsClient.getAutoPullRequirement}.
 *
 * @category spot markets
 */
export interface GetAutoPullRequirementParams {
  /** SpotPool to ask. */
  pool: Address;
  /** Account whose vault balance the shortfall is measured against. */
  owner: Address;
  /** True = buy base (input is quote); false = sell base (input is base). */
  isBid: boolean;
  /** Limit price, raw quote units per whole base. */
  price: bigint;
  /** Base quantity, raw base units. */
  quantity: bigint;
  /**
   *  Builder fee in bps × 1000 (the contract's own encoding — 2500 = 2.5 bps).
   *  @default 0n (no builder)
   */
  builderFeeBpsTimes1k?: bigint;
}

/**
 * What a pool would consume for an order — see {@link SomniaMarketsClient.getAutoPullRequirement}.
 *
 * @category spot markets
 */
export interface AutoPullRequirement {
  /** Token the pool would take: quote on a buy, base on a sell. */
  inputToken: Address;
  /** WORST-CASE amount of `inputToken` the order could consume. */
  requiredAmount: bigint;
  /**
   *  `requiredAmount` minus the owner's current vault balance of `inputToken`, or 0
   *  when the vault already covers it.
   */
  delta: bigint;
}

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
export async function getAutoPullRequirement(
  p: GetAutoPullRequirementParams,
  client: PublicClient,
): Promise<AutoPullRequirement> {
  const [inputToken, requiredAmount, delta] = await client.readContract({
    address: p.pool,
    abi: TradeAbi.spotPoolStopReadAbi,
    functionName: "getAutoPullRequirement",
    args: [p.owner, p.isBid, p.price, p.quantity, p.builderFeeBpsTimes1k ?? 0n],
  });
  return { inputToken, requiredAmount, delta };
}

/**
 * Identifies an operator grant to check — see {@link SomniaMarketsClient.isOperatorAuthorized}.
 *
 * @category spot markets
 */
export interface IsOperatorAuthorizedParams {
  /** SpotPool the grant applies on. */
  pool: Address;
  /** Account that would have granted it. */
  owner: Address;
  /** Account acting on the owner's behalf. */
  operator: Address;
  /** 4-byte function selector the operator wants to call (e.g. `placeOrderFor`). */
  selector: Hex;
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
export async function isOperatorAuthorized(p: IsOperatorAuthorizedParams, client: PublicClient): Promise<boolean> {
  return client.readContract({
    address: p.pool,
    abi: TradeAbi.operatorAuthorizationReadAbi,
    functionName: "isOperatorAuthorized",
    args: [p.owner, p.operator, p.selector],
  });
}

/**
 * Base/quote amounts one owner has locked in resting orders.
 *
 * @category spot markets
 */
export interface LockedBalance {
  /** Base locked across the owner's resting asks, raw base units. */
  lockedBase: bigint;
  /** Quote locked across the owner's resting bids, raw quote units. */
  lockedQuote: bigint;
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
export async function getOwnLockedBalance(
  p: { pool: Address; owner: Address },
  client: PublicClient,
): Promise<LockedBalance> {
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
 * How one token's reserves in a pool divide up — see {@link SomniaMarketsClient.getLockedTokenBreakdown}.
 *
 * @category spot markets
 */
export interface TokenLockBreakdown {
  /** Tradeable principal backing resting orders. */
  principalLocked: bigint;
  /** Locked above principal (rounding + fee headroom the orders reserved). */
  lockedSurplus: bigint;
  /** Reserves backing NO resting order — accrued fees and stray balance. */
  leftover: bigint;
}

/**
 * Book-wide lock state, per token — see {@link SomniaMarketsClient.getLockedTokenBreakdown}.
 *
 * @category spot markets
 */
export interface LockedTokenBreakdown {
  base: TokenLockBreakdown;
  quote: TokenLockBreakdown;
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
export async function getLockedTokenBreakdown(pool: Address, client: PublicClient): Promise<LockedTokenBreakdown> {
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
export async function convertToQuoteAtPriceCeil(
  p: { pool: Address; baseQuantity: bigint; price: bigint },
  client: PublicClient,
): Promise<bigint> {
  return client.readContract({
    address: p.pool,
    abi: TradeAbi.spotPoolLockReadAbi,
    functionName: "convertToQuoteAtPriceCeil",
    args: [p.baseQuantity, p.price],
  });
}
