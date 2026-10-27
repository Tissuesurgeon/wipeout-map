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
import * as ReadsAbi from "../readsAbi.js";
import * as SyncStatus from "../syncStatus.js";
import * as TradeAbi from "../tradeAbi.js";
import * as Writer from "../writer.js";
import { InvalidInputError } from "../errors.js";
import { unreachable } from "../raise.js";
/** The bank's credit granter at `blockNumber` (head when omitted), or `null` while the programme is off. */
async function readCreditGranter(marginBank, client, blockNumber) {
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
export async function getPerpVoucherCampaign(marginBank, client) {
    const distributor = await readCreditGranter(marginBank, client);
    if (distributor === null)
        return null;
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
export async function getPerpVoucherEligibility(marginBank, account, client) {
    // `readBlock`, not `client.getBlock`: the read boundary leaves `getBlock` raw on
    // purpose (the genesis check branches on viem's BlockNotFoundError), and this helper
    // is the SDK's typed block observation.
    const block = await SyncStatus.readBlock(client, { blockTag: "latest" });
    // viem types the number nullable because a PENDING block has none; a latest block does.
    const blockNumber = block.number ?? unreachable("the latest block has a number");
    const distributor = await readCreditGranter(marginBank, client, blockNumber);
    if (distributor === null)
        return { eligible: false, reason: "dormant" };
    const voucher = { address: distributor, abi: ReadsAbi.voucherDistributorReadAbi, blockNumber };
    const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber };
    const [config, activePools, mainFunded, claimed, budget] = await Promise.all([
        client.readContract({ ...voucher, functionName: "getConfig" }),
        client.readContract({ ...bank, functionName: "getActivePerpPools", args: [account] }),
        client.readContract({ ...bank, functionName: "getMainFundedPrincipal", args: [account] }),
        client.readContract({ ...voucher, functionName: "isClaimed", args: [account] }),
        client.readContract({ ...voucher, functionName: "budgetRemaining" }),
    ]);
    // Same order as `VoucherDistributor.claim()`, so the first failure here is the
    // revert a claim would produce at this block.
    if (block.timestamp < config.campaignStart)
        return { eligible: false, reason: "notStarted" };
    if (block.timestamp >= config.campaignEnd)
        return { eligible: false, reason: "ended" };
    if (activePools.length > 0)
        return { eligible: false, reason: "notFlat" };
    if (mainFunded > 0n)
        return { eligible: false, reason: "mainFunded" };
    if (claimed)
        return { eligible: false, reason: "alreadyClaimed" };
    if (budget < config.grantAmount)
        return { eligible: false, reason: "budgetExhausted" };
    return { eligible: true, grantAmount: config.grantAmount };
}
/**
 *  One account's voucher state, or `null` while the programme is off.
 *
 *  Chain tier, current to the RPC head. One bank read, then three reads in parallel.
 */
export async function getPerpVoucher(marginBank, account, client) {
    const distributor = await readCreditGranter(marginBank, client);
    if (distributor === null)
        return null;
    const voucher = { address: distributor, abi: ReadsAbi.voucherDistributorReadAbi };
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
async function claimCall(w, p) {
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
export async function claimPerpVoucher(w, p) {
    return w.execute(await claimCall(w, p));
}
/** Build {@link claimPerpVoucher} without sending it. See `Trader.buildClaimPerpVoucher`. */
export async function buildClaimPerpVoucher(w, p) {
    const call = await claimCall(w, p);
    return Writer.toUnsigned(w.chain.id, call, `Claim a credit voucher from distributor ${call.address}`);
}
