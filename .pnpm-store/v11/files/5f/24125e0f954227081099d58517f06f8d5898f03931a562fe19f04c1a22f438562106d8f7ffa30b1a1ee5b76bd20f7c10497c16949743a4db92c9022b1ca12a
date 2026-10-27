import * as Writer from "./writer.js";
import * as Orders from "./orders.js";
import * as Fees from "./fees.js";
import * as Testnet from "./testnet.js";
import * as BinarySettlement from "./binary/settlement.js";
import * as SpotStops from "./spot/stops.js";
import * as SpotVaultMode from "./spot/vaultMode.js";
import * as SpotOperatorGrants from "./spot/operatorGrants.js";
import * as VaultFunding from "./vault/funding.js";
import * as PerpState from "./perp/state.js";
import * as PerpMargin from "./perp/margin.js";
import * as PerpStops from "./perp/stops.js";
import * as PerpLinkedWallet from "./perp/linkedWallet.js";
import * as PerpVoucher from "./perp/voucher.js";
import * as BinarySets from "./binary/sets.js";
import * as ReadsAbi from "./readsAbi.js";
import * as ModuleAbi from "./moduleAbi.js";
import * as Ids from "./ids.js";
import * as TradeAbi from "./tradeAbi.js";
/**
 *  OrderBook OrderType — shared by binary `placeOrder` and spot `placeSpotOrder`
 *  (both ride the same OrderBook core): 0 NormalOrder (limit), 1 FillOrKill,
 *  2 ImmediateOrCancel (market), 3 PostOnly. Pass to either call's `orderType`.
 *
 * @category trading
 */
export const ORDER_TYPE = {
    /** 0 — NormalOrder: fill what crosses, rest the remainder on the book. */
    LIMIT: 0,
    /** 1 — FillOrKill: fill the full quantity immediately, or place nothing. */
    FILL_OR_KILL: 1,
    /** 2 — ImmediateOrCancel: fill what crosses now, cancel the remainder. */
    MARKET: 2,
    /** 3 — PostOnly: rest only — never takes liquidity. */
    POST_ONLY: 3,
};
/**
 *  OrderBook SelfMatchingOption — what happens when your incoming taker order
 *  crosses your OWN resting order: 0 cancels the rest of the taker, 1 cancels the
 *  whole maker. Every placement and amend verb takes it, and every one of them
 *  encodes 0 when you omit it. That default is the SDK's own choice: the pool
 *  reads the value out of the order request and has no default to fall back on.
 *
 * @category trading
 */
export const SELF_MATCHING_OPTION = {
    /** 0 — cancel the remaining taker quantity, leave the maker resting. */
    CANCEL_TAKER: 0,
    /** 1 — cancel the full maker order, let the taker continue. */
    CANCEL_MAKER: 1,
};
/**
 * Builds a trader bound to a signer and its owning client's dependencies. The public entry
 *  is `client.createTrader(traderConfig)`.
 *
 * **Example** (Creating a trader)
 *
 * ```ts
 * const trader = client.createTrader({ walletClient });
 * await trader.placeOrder({ pool, side: "BUY_YES", price, quantity });
 * await trader.mintSet({ pool, amount });
 * await trader.redeem({ marketId, amount, outcomeIdx: 0 });
 * ```
 *
 * @internal
 */
export function createTraderWithDeps(config, deps) {
    // The write plane lives in writer.ts (one context instead of ~25 closures).
    // Every trading verb now delegates to a concept module that takes the `Writer`
    // as its first parameter (design D3), so only the few members this file still
    // uses directly are pulled out here.
    const w = Writer.createWriter(config, deps);
    const { clearApprovalCache, resolveModule, resolveSettlement, publicClient, dbg } = w;
    const trader = {
        executor: w.executor,
        placeOrder: (p) => Orders.placeOrder(w, p),
        approveBuilder: (p) => Fees.approveBuilder(w, p),
        getBuilderApproval: (ref) => Fees.getBuilderApproval(ref, publicClient),
        getEffectiveBuilderApproval: (ref) => Fees.getEffectiveBuilderApproval(ref, publicClient),
        async getMaxBuilderFeeBpsTimes1k(pool) {
            return await publicClient.readContract({
                address: pool,
                abi: TradeAbi.binaryPoolWriteAbi,
                functionName: "getMaxBuilderFeeBpsTimes1k",
            });
        },
        cancelOrder: (p) => Orders.cancelOrder(w, p),
        reduceOrder: (p) => Orders.reduceOrder(w, p),
        cancelExpiredOrders: (p) => Orders.cancelExpiredOrders(w, p),
        sweepExpiredAtLevel: (p) => Orders.sweepExpiredAtLevel(w, p),
        captureClose: (p) => Orders.captureClose(w, p),
        placeSpotOrder: (p) => Orders.placeSpotOrder(w, p),
        placeSpotOrders: (p) => Orders.placeSpotOrders(w, p),
        cancelOrders: (p) => Orders.cancelOrders(w, p),
        cancelAllOrders: (pool, opts) => Orders.cancelAllOrders(w, pool, deps.liveOwnOrders, opts),
        reduceOrders: (p) => Orders.reduceOrders(w, p),
        buildCancelOrders: (p) => Orders.buildCancelOrders(w, p),
        buildReduceOrders: (p) => Orders.buildReduceOrders(w, p),
        placePerpOrder: (p) => Orders.placePerpOrder(w, p),
        buildPlaceOrder: (p) => Orders.buildPlaceOrder(w, p),
        buildPlaceSpotOrder: (p) => Orders.buildPlaceSpotOrder(w, p),
        buildPlacePerpOrder: (p) => Orders.buildPlacePerpOrder(w, p),
        amendOrder: (p) => Orders.amendOrder(w, p),
        amendOrders: (p) => Orders.amendOrders(w, p),
        depositMargin: (p) => PerpMargin.depositMargin(w, p),
        withdrawMargin: (p) => PerpMargin.withdrawMargin(w, p),
        withdrawVault: (p) => BinarySettlement.withdrawVault(w, p),
        depositVault: (p) => VaultFunding.depositVault(w, p),
        depositVaultNative: (p) => VaultFunding.depositVaultNative(w, p),
        depositVaultNativeFor: (p) => VaultFunding.depositVaultNative(w, p),
        setManualVaultMode: (p) => SpotVaultMode.setManualVaultMode(w, p),
        setOperatorApprovalForPool: (p) => SpotOperatorGrants.setOperatorApprovalForPool(w, p),
        setOperatorApprovalGlobal: (p) => SpotOperatorGrants.setOperatorApprovalGlobal(w, p),
        setPerpLeverage: (p) => PerpMargin.setPerpLeverage(w, p),
        proposePerpWalletLink: (p) => PerpLinkedWallet.proposePerpWalletLink(w, p),
        acceptPerpWalletLink: (p) => PerpLinkedWallet.acceptPerpWalletLink(w, p),
        cancelPerpWalletLinkProposal: (p) => PerpLinkedWallet.cancelPerpWalletLinkProposal(w, p),
        unlinkPerpWallet: (p) => PerpLinkedWallet.unlinkPerpWallet(w, p),
        repayPerpMainFunding: (p) => PerpLinkedWallet.repayPerpMainFunding(w, p),
        recallPerpMainFunding: (p) => PerpLinkedWallet.recallPerpMainFunding(w, p),
        claimPerpVoucher: (p) => PerpVoucher.claimPerpVoucher(w, p),
        pokeFunding: (p) => PerpState.pokeFunding(w, p),
        placeSpotStopOrder: (p) => SpotStops.placeSpotStopOrder(w, p),
        cancelStopOrder: (p) => SpotStops.cancelStopOrder(w, p),
        placePerpStopOrder: (p) => PerpStops.placePerpStopOrder(w, p),
        linkPerpStopOrders: (p) => PerpStops.linkPerpStopOrders(w, p),
        cancelPerpStopOrder: (p) => PerpStops.cancelPerpStopOrder(w, p),
        cancelPerpStopOrders: (p) => PerpStops.cancelPerpStopOrders(w, p),
        claimPerpStopSomi: (p) => PerpStops.claimPerpStopSomi(w, p),
        buildPlacePerpStopOrder: (p) => PerpStops.buildPlacePerpStopOrder(w, p),
        buildCancelPerpStopOrder: (p) => PerpStops.buildCancelPerpStopOrder(w, p),
        buildCancelPerpStopOrders: (p) => PerpStops.buildCancelPerpStopOrders(w, p),
        buildDepositMargin: (p) => PerpMargin.buildDepositMargin(w, p),
        buildWithdrawMargin: (p) => PerpMargin.buildWithdrawMargin(w, p),
        buildAcceptPerpWalletLink: (p) => PerpLinkedWallet.buildAcceptPerpWalletLink(w, p),
        buildRepayPerpMainFunding: (p) => PerpLinkedWallet.buildRepayPerpMainFunding(w, p),
        buildClaimPerpVoucher: (p) => PerpVoucher.buildClaimPerpVoucher(w, p),
        mintSet: (p) => BinarySets.mintSet(w, p),
        burnSet: (p) => BinarySets.burnSet(w, p),
        redeem: (p) => BinarySettlement.redeem(w, p),
        signRedeemAuth: (p) => BinarySettlement.signRedeemAuth(w, p),
        redeemFor: (p) => BinarySettlement.redeemFor(w, p),
        redeemMany: (p) => BinarySettlement.redeemMany(w, p),
        redeemDirect: (p) => BinarySettlement.redeemDirect(w, p),
        claimOwed: (p) => BinarySettlement.claimOwed(w, p),
        pokeOracle: (p) => BinarySettlement.pokeOracle(w, p),
        voidExpired: (p) => BinarySettlement.voidExpired(w, p),
        finalizeMarket: (p) => BinarySettlement.finalizeMarket(w, p),
        syncSettlement: (p) => BinarySettlement.syncSettlement(w, p),
        releasePool: (p) => BinarySettlement.releasePool(w, p),
        async getSettlement(marketId, opts) {
            const module = resolveModule(opts?.module);
            const settlement = resolveSettlement(opts?.settlement);
            // The settlement record is keyed by marketKey (= yesId >> 8). Read the
            // market's yesId off the module (its `markets` tuple) → derive the key.
            const rec = (await publicClient.readContract({
                address: module,
                abi: ModuleAbi.binaryModuleReadAbi,
                functionName: "markets",
                args: [marketId],
            }));
            const yesId = rec[10]; // MarketRecord.yesId (11th tuple field)
            if (yesId === 0n)
                return null; // unknown / uncreated market
            const key = Ids.marketKey(yesId);
            const s = await publicClient.readContract({
                address: settlement,
                abi: ReadsAbi.binarySettlementAbi,
                functionName: "getSettlement",
                args: [key],
            });
            if (!s.finalized)
                return null;
            // Settlement v3 stores a payout VECTOR; derive the winner as its argmax
            // (meaningful only when !voided).
            const payoutNumerators = [...s.payoutNumerators];
            let winningOutcome = 0;
            for (let i = 1; i < payoutNumerators.length; i++) {
                if ((payoutNumerators[i] ?? 0n) > (payoutNumerators[winningOutcome] ?? 0n))
                    winningOutcome = i;
            }
            return {
                collateralToken: s.collateralToken,
                backing: s.backing,
                finalized: s.finalized,
                voided: s.voided,
                winningOutcome,
                payoutNumerators,
                settlementFeeBpsTimes1k: s.settlementFeeBpsTimes1k,
                feeRecipient: s.feeRecipient,
                pool: s.pool,
                nonce: s.nonce,
            };
        },
        async getFreePools(creator, collateral, opts) {
            const pools = await publicClient.readContract({
                address: resolveModule(opts?.module),
                abi: ModuleAbi.binaryModuleReadAbi,
                functionName: "getFreePools",
                args: [creator, collateral],
            });
            return [...pools];
        },
        async poolCreator(pool, opts) {
            return await publicClient.readContract({
                address: resolveModule(opts?.module),
                abi: ModuleAbi.binaryModuleReadAbi,
                functionName: "poolCreator",
                args: [pool],
            });
        },
        mintSetNative: (p) => BinarySets.mintSetNative(w, p),
        mintSetPermit2: (p) => BinarySets.mintSetPermit2(w, p),
        redeemNative: (p) => BinarySettlement.redeemNative(w, p),
        faucet: (p = {}) => Testnet.faucet(w, p),
        resolve: (p) => Testnet.resolve(w, p),
        voidMarket: (p) => Testnet.voidMarket(w, p),
        poke: (p) => PerpState.poke(w, p),
        clearApprovalCache,
    };
    // Boundary tracing: every public trader method runs in its own ROOT span
    // (`trader.<method>`) with the first argument as span data. The Proxy leaves
    // the table untouched (and is the table itself when debugging is off).
    return dbg.tracedObject("trader", trader);
}
