import type { Address, PublicClient } from "viem";
import * as Writer from "../writer.js";
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
export type PerpVoucherIneligibleReason = "dormant" | "notStarted" | "ended" | "notFlat" | "mainFunded" | "alreadyClaimed" | "budgetExhausted";
/**
 *  Whether an account can claim a voucher now. Narrow on `eligible` first.
 *
 * @category perpetual markets
 */
export type PerpVoucherEligibility = {
    /** A claim sent now would succeed, unless state changes before it lands. */
    eligible: true;
    /** What the claim would credit, in raw collateral units. */
    grantAmount: bigint;
} | {
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
/**
 *  The live campaign behind `marginBank`, or `null` while the programme is off.
 *
 *  Chain tier, current to the RPC head. One bank read, then three reads in parallel.
 */
export declare function getPerpVoucherCampaign(marginBank: Address, client: PublicClient): Promise<PerpVoucherCampaign | null>;
/**
 *  Whether `account` can claim a voucher now, and if not, why.
 *
 *  Chain tier. Every read is pinned to one block, and the window is checked against
 *  that block's timestamp, so the answer describes one moment.
 */
export declare function getPerpVoucherEligibility(marginBank: Address, account: Address, client: PublicClient): Promise<PerpVoucherEligibility>;
/**
 *  One account's voucher state, or `null` while the programme is off.
 *
 *  Chain tier, current to the RPC head. One bank read, then three reads in parallel.
 */
export declare function getPerpVoucher(marginBank: Address, account: Address, client: PublicClient): Promise<PerpVoucher | null>;
/** Claim the signer's one-time credit voucher. See `Trader.claimPerpVoucher`. */
export declare function claimPerpVoucher(w: WriterCtx, p: ClaimPerpVoucherParams): Promise<TxResult>;
/** Build {@link claimPerpVoucher} without sending it. See `Trader.buildClaimPerpVoucher`. */
export declare function buildClaimPerpVoucher(w: WriterCtx, p: ClaimPerpVoucherParams): Promise<Writer.UnsignedCall>;
