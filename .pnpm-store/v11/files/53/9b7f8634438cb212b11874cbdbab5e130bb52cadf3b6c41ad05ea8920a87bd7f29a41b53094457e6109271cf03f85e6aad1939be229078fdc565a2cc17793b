// Credit vouchers ("house money") on perps — the claim path and its chain reads.
//
// PERP-ONLY, and TWO CONTRACTS. The split is by ownership, not by transport:
//
//   VoucherDistributor — the POLICY. It holds the budget and decides who can claim,
//                        how much, when, and when a grant expires.
//   MarginBank         — the MONEY. A claim credits the account and records a
//                        non-withdrawable floor. The bank also confines a voucher
//                        account's position increases (leverage cap, market
//                        allowlist). `getPerpLeverage` and `previewPerpOrderMargin`
//                        already model those trade constraints.
//
// The bank names the distributor it accepts credit from (`getCreditGranter()`), so
// every read here resolves the distributor through the bank and not through a
// deployment manifest. A zero granter means the programme is off on that deployment.
//
// CHAIN TIER ONLY. The indexer records each grant as a `MarginEvent` with
// `kind: "Credited"` (see `getMarginEvents`), but it does not index the distributor
// itself, so campaign state and claim status come from the chain.

import type { Address, PublicClient } from "viem";
import * as ReadsAbi from "../readsAbi.js";
import * as SyncStatus from "../syncStatus.js";
import * as TradeAbi from "../tradeAbi.js";
import * as Writer from "../writer.js";
import { InvalidInputError } from "../errors.js";
import { unreachable } from "../raise.js";
import type { Writer as WriterCtx } from "../writer.js";
import type { ClaimPerpVoucherParams, TxResult } from "../trade.js";

/**
 *  The live credit-voucher campaign behind one MarginBank.
 *
 *  Every amount is in raw collateral units and every time is Unix seconds.
 *
 * @category perpetual markets
 */
export interface PerpVoucherCampaign {
  /** The VoucherDistributor the bank accepts credit from. Pass it to `claimPerpVoucher` to skip resolution. */
  distributor: Address;
  /** The collateral token the grant is paid in. */
  collateralToken: Address;
  /** What one claim credits, in raw collateral units. */
  grantAmount: bigint;
  /**
   *  Seconds after a claim before the grant can be swept back. A sweep happens only
   *  when the account holds no positions or resting orders; it never forces a close.
   */
  expiryDurationSec: bigint;
  /** Unix seconds when claims open. Inclusive. */
  startsAt: bigint;
  /** Unix seconds when claims close. Exclusive. */
  endsAt: bigint;
  /**
   *  The distributor's collateral balance. This is the hard cap on claims: when it
   *  falls below `grantAmount`, every claim reverts until someone funds it.
   */
  budgetRemaining: bigint;
  /** How many more claims the budget covers: `budgetRemaining / grantAmount`, rounded down. */
  claimsRemaining: bigint;
  /**
   *  The leverage a voucher account is confined to when it increases a position.
   *  `0` blocks every increase; it does not mean "uncapped". Each market's own
   *  initial margin still applies, so the effective limit is the lower of the two.
   */
  leverageCapX: number;
}

/**
 *  Why an account cannot claim a voucher right now.
 *
 *  The reasons are checked in the order `VoucherDistributor.claim()` checks them, so
 *  the reason names the revert a claim would produce at the same block.
 *
 *  - `dormant` — the bank has no credit granter. The programme is off for everyone.
 *  - `notStarted` — the campaign window has not opened (`CampaignInactive`).
 *  - `ended` — the campaign window has closed (`CampaignInactive`).
 *  - `notFlat` — the account holds a position or a resting order (`ClaimantNotFlat`).
 *    A voucher is starting capital for a new account, not a margin top-up.
 *  - `mainFunded` — the account carries principal from a linked main wallet
 *    (`ClaimantIsMainFunded`). The two programmes cannot share one balance.
 *  - `alreadyClaimed` — this address has claimed from this distributor before
 *    (`AlreadyClaimed`). The limit is once per address for the distributor's life.
 *  - `budgetExhausted` — the budget is below one grant (`BudgetExhausted`).
 *
 * @category perpetual markets
 */
export type PerpVoucherIneligibleReason =
  | "dormant"
  | "notStarted"
  | "ended"
  | "notFlat"
  | "mainFunded"
  | "alreadyClaimed"
  | "budgetExhausted";

/**
 *  Whether an account can claim a voucher now. Narrow on `eligible` first.
 *
 * @category perpetual markets
 */
export type PerpVoucherEligibility =
  | {
      /** A claim sent now would succeed, unless state changes before it lands. */
      eligible: true;
      /** What the claim would credit, in raw collateral units. */
      grantAmount: bigint;
    }
  | {
      /** A claim sent now would revert. */
      eligible: false;
      /** The first check that fails. See {@link PerpVoucherIneligibleReason}. */
      reason: PerpVoucherIneligibleReason;
    };

/**
 *  One account's voucher state.
 *
 * @category perpetual markets
 */
export interface PerpVoucher {
  /** Whether this address has ever claimed from the live distributor. */
  claimed: boolean;
  /**
   *  The non-withdrawable house money in the account, in raw collateral units.
   *  `withdraw` frees at most `balance - floor`. After a loss, the bank lowers the
   *  floor to the balance the next time it settles the account while it is flat (on a
   *  deposit, for example). It never raises the floor. `0n` means no house money
   *  remains.
   */
  floor: bigint;
  /**
   *  Unix seconds when the floor becomes sweepable, or `0n` when no voucher is
   *  active. A claimed account reads `0n` after a sweep.
   */
  expiresAt: bigint;
}

/** The bank's credit granter at `blockNumber` (head when omitted), or `null` while the programme is off. */
async function readCreditGranter(
  marginBank: Address,
  client: PublicClient,
  blockNumber?: bigint,
): Promise<Address | null> {
  const granter = await client.readContract({
    address: marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "getCreditGranter",
    blockNumber,
  });
  return granter === Writer.ZERO_ADDRESS ? null : granter;
}

/**
 *  The live campaign behind `marginBank`, or `null` while the programme is off.
 *
 *  Chain tier, current to the RPC head. One bank read, then three reads in parallel.
 */
export async function getPerpVoucherCampaign(
  marginBank: Address,
  client: PublicClient,
): Promise<PerpVoucherCampaign | null> {
  const distributor = await readCreditGranter(marginBank, client);
  if (distributor === null) return null;

  const [config, budgetRemaining, leverageCapX] = await Promise.all([
    client.readContract({ address: distributor, abi: ReadsAbi.voucherDistributorReadAbi, functionName: "getConfig" }),
    client.readContract({
      address: distributor,
      abi: ReadsAbi.voucherDistributorReadAbi,
      functionName: "budgetRemaining",
    }),
    client.readContract({
      address: marginBank,
      abi: ReadsAbi.marginBankReadAbi,
      functionName: "getVoucherLeverageCap",
    }),
  ]);
  return {
    distributor,
    collateralToken: config.collateralToken,
    grantAmount: config.grantAmount,
    expiryDurationSec: config.expiryDuration,
    startsAt: config.campaignStart,
    endsAt: config.campaignEnd,
    budgetRemaining,
    // The distributor rejects a zero grant at every write, so the guard only keeps a
    // misconfigured contract from turning this read into a RangeError.
    claimsRemaining: config.grantAmount === 0n ? 0n : budgetRemaining / config.grantAmount,
    leverageCapX,
  };
}

/**
 *  Whether `account` can claim a voucher now, and if not, why.
 *
 *  Chain tier. Every read is pinned to one block, and the window is checked against
 *  that block's timestamp, so the answer describes one moment.
 */
export async function getPerpVoucherEligibility(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<PerpVoucherEligibility> {
  // `readBlock`, not `client.getBlock`: the read boundary leaves `getBlock` raw on
  // purpose (the genesis check branches on viem's BlockNotFoundError), and this helper
  // is the SDK's typed block observation.
  const block = await SyncStatus.readBlock(client, { blockTag: "latest" });
  // viem types the number nullable because a PENDING block has none; a latest block does.
  const blockNumber = block.number ?? unreachable("the latest block has a number");
  const distributor = await readCreditGranter(marginBank, client, blockNumber);
  if (distributor === null) return { eligible: false, reason: "dormant" };

  const voucher = { address: distributor, abi: ReadsAbi.voucherDistributorReadAbi, blockNumber } as const;
  const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber } as const;
  const [config, activePools, mainFunded, claimed, budget] = await Promise.all([
    client.readContract({ ...voucher, functionName: "getConfig" }),
    client.readContract({ ...bank, functionName: "getActivePerpPools", args: [account] }),
    client.readContract({ ...bank, functionName: "getMainFundedPrincipal", args: [account] }),
    client.readContract({ ...voucher, functionName: "isClaimed", args: [account] }),
    client.readContract({ ...voucher, functionName: "budgetRemaining" }),
  ]);

  // Same order as `VoucherDistributor.claim()`, so the first failure here is the
  // revert a claim would produce at this block.
  if (block.timestamp < config.campaignStart) return { eligible: false, reason: "notStarted" };
  if (block.timestamp >= config.campaignEnd) return { eligible: false, reason: "ended" };
  if (activePools.length > 0) return { eligible: false, reason: "notFlat" };
  if (mainFunded > 0n) return { eligible: false, reason: "mainFunded" };
  if (claimed) return { eligible: false, reason: "alreadyClaimed" };
  if (budget < config.grantAmount) return { eligible: false, reason: "budgetExhausted" };
  return { eligible: true, grantAmount: config.grantAmount };
}

/**
 *  One account's voucher state, or `null` while the programme is off.
 *
 *  Chain tier, current to the RPC head. One bank read, then three reads in parallel.
 */
export async function getPerpVoucher(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<PerpVoucher | null> {
  const distributor = await readCreditGranter(marginBank, client);
  if (distributor === null) return null;

  const voucher = { address: distributor, abi: ReadsAbi.voucherDistributorReadAbi } as const;
  const [claimed, floor, expiresAt] = await Promise.all([
    client.readContract({ ...voucher, functionName: "isClaimed", args: [account] }),
    client.readContract({
      address: marginBank,
      abi: ReadsAbi.marginBankReadAbi,
      functionName: "getCreditFloor",
      args: [account],
    }),
    client.readContract({ ...voucher, functionName: "voucherExpiryOf", args: [account] }),
  ]);
  return { claimed, floor, expiresAt };
}

/**
 *  Resolves the distributor a claim targets, then builds the call. Shared by the
 *  sending write and its build-only twin, so the two cannot resolve differently.
 */
async function claimCall(w: WriterCtx, p: ClaimPerpVoucherParams): Promise<Writer.WriteCall> {
  // `??` falls through on null and undefined only, so an explicit zero distributor
  // would skip the dormant-bank guard and become the target. A call to an address
  // with no code SUCCEEDS with empty returndata: the receipt would report a claim
  // that credited nothing.
  if (p.distributor === Writer.ZERO_ADDRESS) {
    throw new InvalidInputError("distributor must not be the zero address (a call to it would succeed and do nothing)");
  }
  const distributor = p.distributor ?? (await w.bankCreditGranter(await w.resolveMarginBank(p), undefined));
  return {
    address: distributor,
    abi: TradeAbi.voucherDistributorWriteAbi,
    functionName: "claim",
    args: [],
    gas: p.gas ?? w.defaultGas,
  };
}

/** Claim the signer's one-time credit voucher. See `Trader.claimPerpVoucher`. */
export async function claimPerpVoucher(w: WriterCtx, p: ClaimPerpVoucherParams): Promise<TxResult> {
  return w.execute(await claimCall(w, p));
}

/** Build {@link claimPerpVoucher} without sending it. See `Trader.buildClaimPerpVoucher`. */
export async function buildClaimPerpVoucher(w: WriterCtx, p: ClaimPerpVoucherParams): Promise<Writer.UnsignedCall> {
  const call = await claimCall(w, p);
  return Writer.toUnsigned(w.chain.id, call, `Claim a credit voucher from distributor ${call.address}`);
}
