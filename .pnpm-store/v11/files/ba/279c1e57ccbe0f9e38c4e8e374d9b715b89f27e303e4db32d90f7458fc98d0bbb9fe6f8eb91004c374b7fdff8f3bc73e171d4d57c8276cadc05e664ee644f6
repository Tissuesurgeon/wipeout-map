// Write side of the SomniaLend integration — a Lender is to the lend market
// what a Trader is to the order books: bound to one signer, auto-approving,
// resolving every target from config.addresses.lend. Lend actions are
// low-frequency (no nonce/approval caching needed), so the sends ride the
// shared machinery writer — realtime send + confirm with the standard-node
// fallback, per-call nonce — like the admin surfaces do.
import { maxUint256 } from "viem";
import { NotConfiguredError } from "../errors.js";
import * as MachineryWriter from "../machineryWriter.js";
import * as ReadsAbi from "../readsAbi.js";
import * as TradeAbi from "../tradeAbi.js";
import * as LendAbi from "./lendAbi.js";
/** Aave interest-rate mode 2 — variable. Stable borrowing is not surfaced. */
const VARIABLE_RATE = 2n;
/** Aave referral program code — unused on SomniaLend; always 0. */
const NO_REFERRAL = 0;
/** Build a {@link Lender} (wired by the lend entry — use `lend.createLender`). */
export function createLenderWithDeps(config, deps) {
    const writer = MachineryWriter.makeMachineryWriter(config, deps, "createLender");
    const from = typeof writer.from === "string" ? writer.from : writer.from.address;
    const requirePool = () => {
        const pool = deps.addresses.pool;
        if (!pool) {
            throw new NotConfiguredError("`pool` in config.addresses.lend", "this lend write");
        }
        return pool;
    };
    const requireGateway = () => {
        const gateway = deps.addresses.wrappedTokenGateway;
        if (!gateway) {
            throw new NotConfiguredError("`wrappedTokenGateway` in config.addresses.lend", "native lend flows");
        }
        return gateway;
    };
    // Approval doctrine mirrors trade.ts's approveIfNeeded — per-(token, spender)
    // cache, one allowance read on miss, approve maxUint256 when short — with one
    // refinement: only an effectively-UNLIMITED grant is cached. A finite
    // allowance that merely covers this pull is spent by it, so caching it would
    // let a later, larger pull skip the check and revert on-chain. The hot path
    // is unchanged: after our own max approval the pair is cached and every
    // subsequent write costs zero extra reads.
    const UNLIMITED_ALLOWANCE_FLOOR = maxUint256 / 2n;
    const approvedPairs = new Set();
    async function approveIfNeeded(token, spender, amount, gas) {
        const key = `${token.toLowerCase()}:${spender.toLowerCase()}`;
        if (approvedPairs.has(key))
            return;
        const allowance = await writer.publicClient.readContract({
            address: token,
            abi: ReadsAbi.erc20ReadAbi,
            functionName: "allowance",
            args: [from, spender],
        });
        if (allowance < amount) {
            await writer.execute({
                to: token,
                abi: TradeAbi.erc20WriteAbi,
                functionName: "approve",
                args: [spender, maxUint256],
                gas,
            });
            approvedPairs.add(key);
            return;
        }
        // A huge standing allowance is one of our own max grants (OZ-style tokens
        // never decrement those) — safe to cache. A finite covering allowance is
        // not: leave the pair uncached so the next pull re-reads it.
        if (allowance >= UNLIMITED_ALLOWANCE_FLOOR)
            approvedPairs.add(key);
    }
    // Credit-delegation twin of approveIfNeeded, for gateway-routed borrows.
    async function delegateIfNeeded(debtToken, delegatee, amount, gas) {
        const key = `delegate:${debtToken.toLowerCase()}:${delegatee.toLowerCase()}`;
        if (approvedPairs.has(key))
            return;
        const allowance = await writer.publicClient.readContract({
            address: debtToken,
            abi: LendAbi.lendDebtTokenAbi,
            functionName: "borrowAllowance",
            args: [from, delegatee],
        });
        if (allowance < amount) {
            await writer.execute({
                to: debtToken,
                abi: LendAbi.lendDebtTokenAbi,
                functionName: "approveDelegation",
                args: [delegatee, maxUint256],
                gas,
            });
            approvedPairs.add(key);
            return;
        }
        if (allowance >= UNLIMITED_ALLOWANCE_FLOOR)
            approvedPairs.add(key);
    }
    // The gateway's wrapped-native reserve tokens (aWSOMI / WSOMI variable debt),
    // resolved once per lender: gateway.getWETHAddress() → Pool.getReserveData.
    let nativeTokens;
    function resolveNativeTokens() {
        nativeTokens ??= (async () => {
            const gateway = requireGateway();
            const pool = requirePool();
            const wrapped = await writer.publicClient.readContract({
                address: gateway,
                abi: LendAbi.lendGatewayAbi,
                functionName: "getWETHAddress",
            });
            const reserve = (await writer.publicClient.readContract({
                address: pool,
                abi: LendAbi.lendPoolAbi,
                functionName: "getReserveData",
                args: [wrapped],
            }));
            return { aToken: reserve.aTokenAddress, variableDebtToken: reserve.variableDebtTokenAddress };
        })().catch((e) => {
            // Don't memoize a failure: a transient RPC error would otherwise poison
            // every native flow for the lender's lifetime. Next call retries fresh.
            nativeTokens = undefined;
            throw e;
        });
        return nativeTokens;
    }
    return {
        account: from,
        async supply(asset, amount, opts) {
            const pool = requirePool();
            if (opts?.approve !== false)
                await approveIfNeeded(asset, pool, amount, opts?.gas);
            return writer.execute({
                to: pool,
                abi: LendAbi.lendPoolAbi,
                functionName: "supply",
                args: [asset, amount, opts?.onBehalfOf ?? from, NO_REFERRAL],
                gas: opts?.gas,
            });
        },
        async withdraw(asset, amount, opts) {
            return writer.execute({
                to: requirePool(),
                abi: LendAbi.lendPoolAbi,
                functionName: "withdraw",
                args: [asset, amount, opts?.to ?? from],
                gas: opts?.gas,
            });
        },
        async borrow(asset, amount, opts) {
            return writer.execute({
                to: requirePool(),
                abi: LendAbi.lendPoolAbi,
                functionName: "borrow",
                args: [asset, amount, VARIABLE_RATE, NO_REFERRAL, from],
                gas: opts?.gas,
            });
        },
        async repay(asset, amount, opts) {
            const pool = requirePool();
            // A maxUint256 full-repay still only pulls the actual debt; approving max
            // (the doctrine's grant anyway) covers it without knowing the exact owed.
            if (opts?.approve !== false)
                await approveIfNeeded(asset, pool, amount, opts?.gas);
            return writer.execute({
                to: pool,
                abi: LendAbi.lendPoolAbi,
                functionName: "repay",
                args: [asset, amount, VARIABLE_RATE, opts?.onBehalfOf ?? from],
                gas: opts?.gas,
            });
        },
        async setUseAsCollateral(asset, useAsCollateral, opts) {
            return writer.execute({
                to: requirePool(),
                abi: LendAbi.lendPoolAbi,
                functionName: "setUserUseReserveAsCollateral",
                args: [asset, useAsCollateral],
                gas: opts?.gas,
            });
        },
        async supplyNative(amount, opts) {
            return writer.execute({
                to: requireGateway(),
                abi: LendAbi.lendGatewayAbi,
                functionName: "depositETH",
                args: [requirePool(), opts?.onBehalfOf ?? from, NO_REFERRAL],
                value: amount,
                gas: opts?.gas,
            });
        },
        async withdrawNative(amount, opts) {
            const gateway = requireGateway();
            const { aToken } = await resolveNativeTokens();
            // The gateway pulls the aTokens to unwrap them — a plain ERC-20 approval
            // on the aToken, same doctrine as the supply-side pulls.
            if (opts?.approve !== false)
                await approveIfNeeded(aToken, gateway, amount, opts?.gas);
            return writer.execute({
                to: gateway,
                abi: LendAbi.lendGatewayAbi,
                functionName: "withdrawETH",
                args: [requirePool(), amount, opts?.to ?? from],
                gas: opts?.gas,
            });
        },
        async borrowNative(amount, opts) {
            const gateway = requireGateway();
            const { variableDebtToken } = await resolveNativeTokens();
            if (opts?.approve !== false)
                await delegateIfNeeded(variableDebtToken, gateway, amount, opts?.gas);
            return writer.execute({
                to: gateway,
                abi: LendAbi.lendGatewayAbi,
                functionName: "borrowETH",
                args: [requirePool(), amount, VARIABLE_RATE, NO_REFERRAL],
                gas: opts?.gas,
            });
        },
        async repayNative(amount, opts) {
            return writer.execute({
                to: requireGateway(),
                abi: LendAbi.lendGatewayAbi,
                functionName: "repayETH",
                args: [requirePool(), amount, VARIABLE_RATE, opts?.onBehalfOf ?? from],
                value: amount,
                gas: opts?.gas,
            });
        },
        clearApprovalCache() {
            approvedPairs.clear();
        },
    };
}
