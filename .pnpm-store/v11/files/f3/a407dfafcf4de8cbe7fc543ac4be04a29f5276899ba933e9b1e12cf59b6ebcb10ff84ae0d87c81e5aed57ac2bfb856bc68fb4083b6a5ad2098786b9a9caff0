// The write plane: everything a chain write needs, behind one context.
//
// These ~25 helpers were closures inside `createTraderWithDeps`, captured by its
// ~40 write verbs. Concept-first organization moves those verbs into their own
// modules (orders.ts, binary/settlement.ts, …), so what they capture has to
// become an explicit, passable thing — the `Writer`.
//
// Every concept write takes it as its FIRST parameter (data-first, per
// CONVENTIONS.md): `Orders.placeOrder(w, params)`. `createTrader` builds one
// `Writer` and binds the verbs, so `Trader`'s public shape never changes.
//
// The send path (sign → broadcast → confirm, with revert decoding) is the same
// single funnel it has always been: eth_sendRawTransactionSync when the node
// has it, standard send + newHeads confirm otherwise, and a mined-but-reverted
// receipt replayed via eth_call to recover the Solidity error name.
import { encodeFunctionData, maxUint256, } from "viem";
import { ContractRevertError, InvalidInputError, NotConfiguredError, SignerRequiredError } from "./errors.js";
import { unreachable } from "./raise.js";
import * as Revert from "./revert.js";
import * as TxSend from "./txSend.js";
import * as Decode from "./decode/orders.js";
import * as Boundary from "./executor/boundary.js";
import * as LocalExecutor from "./executor/local.js";
import * as WalletExecutor from "./executor/wallet.js";
import * as Client from "./client.js";
import * as Config from "./config.js";
import * as DebugMod from "./debug.js";
import * as Store from "./store.js";
import * as Ids from "./ids.js";
import * as TradeAbi from "./tradeAbi.js";
import * as ReadsAbi from "./readsAbi.js";
import * as WriterRuntime from "./writerRuntime.js";
export function farFutureNs() {
    return BigInt(Math.floor(Date.now() / 1000) + 50 * 365 * 24 * 3600) * 1000000000n;
}
export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
/** One hundred percent in the protocol's BPS_TIMES_1K fee unit (1 bps = 1000). */
const BPS_TIMES_1K_ONE = 10000n * 1000n;
/**
 *  The collateral a buy locks, in raw collateral units — BinaryPool
 *  `_bidCommitment`: `ceil(quantity × unitPrice / oneCollateral)` plus, when the
 *  order carries a builder fee, that fee's ceil-rounded headroom on the
 *  principal. The pool locks (and pulls) both. This is the one definition; the
 *  writer's escrow and the facade's collateral pre-check must both use it so
 *  the pre-check predicts the number the pool will pull.
 *
 *  `unitPrice` is the cost of one whole outcome token for the side being bought
 *  (the YES price for BUY_YES, `oneCollateral − yesPrice` for BUY_NO). With a
 *  rate of `0n` this is the exact integer principal; the facade pre-check uses
 *  that form for a spot bid's bare quote principal (`oneCollateral` = one whole
 *  base unit, no fee headroom — the writer's spot path asks the pool instead).
 */
export function bidCommitment(quantity, unitPrice, oneCollateral, builderFeeBpsTimes1k = 0n) {
    const principal = (quantity * unitPrice + oneCollateral - 1n) / oneCollateral;
    const rate = builderFeeBpsTimes1k;
    const headroom = rate === 0n ? 0n : (principal * rate + BPS_TIMES_1K_ONE - 1n) / BPS_TIMES_1K_ONE;
    return principal + headroom;
}
/**
 *  v2 OrderKind enum for `placeBinaryOrder` (0 BUY_YES, 1 SELL_YES, 2 BUY_NO,
 *  3 SELL_NO) — the side is explicit, NOT encoded in userData. The pool maps kind
 *  onto the base book's (isBid, price) internally; the SDK just forwards the enum.
 *
 * @category trading
 */
export const ORDER_KIND = {
    BUY_YES: 0,
    SELL_YES: 1,
    BUY_NO: 2,
    SELL_NO: 3,
};
/**
 * Converts a {@link WriteCall} to an unsigned transaction request.
 *
 *  Lives here rather than beside any one build verb because several modules
 *  (`perp/stops.ts`, `perp/margin.ts`, `orders.ts`) encode through it, and the
 *  point of a build verb is that its bytes cannot diverge from what the sending
 *  twin puts on the wire — one encoder keeps that true.
 *
 * @internal
 */
export function toUnsigned(chainId, call, description) {
    return {
        chainId,
        to: call.address,
        data: encodeFunctionData({ abi: call.abi, functionName: call.functionName, args: call.args }),
        value: call.value ?? 0n,
        description,
        functionName: call.functionName,
    };
}
/**
 * Builds the ERC-20 approval that a write needs as an unsigned call.
 *
 *  `maxUint256`, as the send path's `approveIfNeeded` uses — so the two agree, and
 *  a caller who batches this once is not asked again.
 *
 * @internal
 */
export function approvalCall(chainId, token, spender, description) {
    return {
        chainId,
        to: token,
        data: encodeFunctionData({ abi: TradeAbi.erc20WriteAbi, functionName: "approve", args: [spender, maxUint256] }),
        value: 0n,
        description,
        functionName: "approve",
    };
}
/**
 * Reconstructs a batch amendment's replacement identifiers from its receipt.
 * Delegates to the pure {@link decodeAmendOrders}; kept here so the amend verbs
 * keep one import.
 *
 * @internal
 */
export function decodeBatchAmendResult(result, { pool, amendmentCount }) {
    return { ...result, ...Decode.decodeAmendOrders(result.receipt, pool, amendmentCount) };
}
/**
 * Reconstructs one amendment's outcome from its receipt. Delegates to the pure
 * {@link decodeAmendOrder}.
 *
 * @internal
 */
export function decodeAmendResult(result, { pool }) {
    return { ...result, ...Decode.decodeAmendOrder(result.receipt, pool) };
}
/**
 *  The trader's signer resolution: `resolveSigner` plus the one normalization its
 *  public union names — viem's rejection of a malformed or invalid-scalar key
 *  becomes {@link InvalidInputError}, the original as `cause`. Kept here rather
 *  than in `txSend.ts` because the admin surfaces resolve through the same leaf
 *  and their unions do not (yet) name it.
 */
function resolveTraderSigner(config, nonceManager) {
    try {
        return TxSend.resolveSigner(config, "createTrader", { nonceManager });
    }
    catch (e) {
        if (e instanceof SignerRequiredError)
            throw e;
        throw new InvalidInputError("privateKey is not a valid secp256k1 private key", { cause: e });
    }
}
/**
 * Builds the write context for a signer and its owning client's dependencies. Public entry
 *  is `client.createTrader(...)`, which builds one of these and binds the verbs.
 *
 * @internal
 */
export function createWriter(config, deps) {
    const dbg = deps.dbg ?? DebugMod.makeDebug();
    const decimals = config.decimals ?? Store.DECIMALS;
    const oneBase = 10n ** BigInt(decimals);
    const defaultGas = config.gas ?? Config.DEFAULT_GAS;
    const { chain } = deps.getConfig();
    const fees = deps.getConfig().fees ?? Config.DEFAULT_FEES;
    const addresses = () => deps.getConfig().addresses ?? {};
    const writerRuntime = deps.writerRuntime ?? WriterRuntime.makeWriterRuntime();
    // A caller-supplied client gets the same read-error wrap as an SDK-built one,
    // so a revert reads as its Solidity name on either path (deps.getClient() is
    // already wrapped by makePublicClient).
    const publicClient = config.publicClient
        ? Client.withTypedReadErrors(config.publicClient)
        : deps.getClient();
    // The executor: who signs and sends. An explicit one wins; otherwise the
    // signer sugar (privateKey / local account / walletClient) builds the matching
    // built-in, so no existing caller changes. Every verb goes through the
    // executor — the one that signs typed data rather than sending uses its
    // `signTypedData`.
    // The nonce lane and send ordering: the owning engine's writer runtime, or a
    // fresh one for a writer built outside an engine (tests, ad-hoc tooling) —
    // never the module-level manager. Local nonce tracking belongs to the
    // configured client even when the caller supplies a LocalAccount carrying its
    // own manager, so separate clients stay isolated.
    const resolved = config.executor ? undefined : resolveTraderSigner(config, writerRuntime.nonceManager);
    const localAccount = resolved?.localAccount;
    const walletClient = resolved?.walletClient;
    const executor = config.executor ??
        (localAccount
            ? LocalExecutor.createLocalSignerExecutor({
                chain,
                publicClient,
                account: localAccount,
                fees,
                defaultGas,
                runtime: writerRuntime,
                dbg,
                getReceiptSignal: deps.getReceiptSignal ?? (() => deps.getConfig().signal),
            })
            : WalletExecutor.createWalletClientExecutor({
                chain,
                publicClient,
                walletClient: walletClient ?? unreachable("no external wallet client after signer validation"),
                from: resolved?.from ?? unreachable("resolveSigner names the signer"),
                fees,
                defaultGas,
                dbg,
                getReceiptSignal: deps.getReceiptSignal ?? (() => deps.getConfig().signal),
            }));
    if (executor.chainId !== chain.id) {
        throw new InvalidInputError(`the executor sends on chain ${executor.chainId}, but this client is bound to chain ${chain.id}`);
    }
    const from = resolved?.from ?? executor.actor;
    const fromAddress = executor.actor;
    // A mined receipt with status "reverted" carries NO revert data — the EVM
    // discarded it. Replay the same call as an eth_call AT THE RECEIPT'S BLOCK to
    // recover the reason, then decode it. Strictly best-effort enrichment: if the
    // replay can't run (node pruned the state, the call now succeeds because state
    // moved on, the RPC refuses) the caller still gets a ContractRevertError, just
    // without `errorName`. Never let the replay's own failure mask the real one.
    async function revertErrorForReceipt(receipt, call) {
        const context = { address: call.address, functionName: call.functionName };
        try {
            await publicClient.call({
                to: call.address,
                data: encodeFunctionData({ abi: call.abi, functionName: call.functionName, args: call.args }),
                account: executor.actor,
                blockNumber: receipt.blockNumber,
                ...(call.value !== undefined ? { value: call.value } : {}),
            });
        }
        catch (replayed) {
            const decoded = Revert.decodeRevert(replayed, context);
            // Only trust the replay when it actually named an error; a bare failure
            // tells us nothing the receipt didn't.
            if (decoded.errorName !== undefined || decoded.reason !== undefined || decoded.data !== undefined)
                return decoded;
        }
        return new ContractRevertError({
            ...context,
            reason: `transaction ${receipt.transactionHash} reverted (no revert data recoverable)`,
        });
    }
    const toUnsignedCall = (w) => ({
        chainId: chain.id,
        to: w.address,
        data: encodeFunctionData({ abi: w.abi, functionName: w.functionName, args: w.args }),
        value: w.value ?? 0n,
        description: w.functionName,
        functionName: w.functionName,
    });
    // The single send path for every write: encode the write and the
    // prerequisites it depends on (an approval, an operator grant), hand the
    // executor the whole list in ONE call, and read the outcome off the receipt it
    // returns. One call is what lets a batching executor (a safe with MultiSend)
    // land the approval and the order in one transaction; an executor that cannot
    // batch sends them in order and stops at the first revert.
    //
    // An inner failure the executor detected (a safe's swallowed revert) throws
    // like a reverted receipt, so a caller never has to know which actor sent the
    // write. `executor.execute` is a plugin boundary: an SDK error passes through
    // as itself; anything else a custom executor throws is normalized here with
    // the original preserved as `cause`, so no verb leaks a foreign error. Each
    // execute is one debug span; the executor's own spans nest under it.
    const execute = dbg.traced("trade.execute", async (s, w, prerequisites = []) => {
        const writes = [...prerequisites.map((p) => p.call), w];
        const calls = writes.map(toUnsignedCall);
        const context = { address: w.address, functionName: w.functionName };
        const signal = deps.getReceiptSignal?.() ?? deps.getConfig().signal;
        let executed;
        try {
            executed = await executor.execute(calls, {
                gas: w.gas ?? defaultGas,
                context: { functionName: w.functionName },
                parentSpan: s,
            });
        }
        catch (e) {
            if (signal?.aborted && e === signal.reason)
                throw e;
            // Bounded to the executor contract (ExecutorExecuteError) so every
            // Trader union stays exact whatever a plugin throws.
            throw Boundary.asExecuteError(e, "execute", context);
        }
        dbg.annotate(s, { hash: executed.hash });
        if (executed.failure)
            throw executed.failure;
        if (executed.receipt.status === "reverted") {
            // A sequential executor returns the FIRST reverted receipt, so the write
            // it belongs to is the one whose target the receipt names; the
            // prerequisites before it landed and are remembered. An outer receipt
            // that names none of them (a safe's) remembers nothing — the next write
            // re-reads the chain, which is the conservative answer.
            const failed = calls.findIndex((c) => c.to.toLowerCase() === executed.receipt.to?.toLowerCase());
            for (const p of prerequisites.slice(0, Math.max(failed, 0)))
                p.commit();
            throw await revertErrorForReceipt(executed.receipt, writes[failed] ?? w);
        }
        for (const p of prerequisites)
            p.commit();
        const { hash, receipt, executionTimeMicros } = executed;
        return executionTimeMicros === undefined ? { hash, receipt } : { hash, receipt, executionTimeMicros };
    }, (w) => ({ functionName: w.functionName, address: w.address }));
    // Send an order-placing write and decode its outcome from the receipt — the
    // same pure decoder an app uses on a receipt it obtained itself, scoped to the
    // pool the write addressed.
    async function executeOrder(w, prerequisites = []) {
        const result = await execute(w, prerequisites);
        return { ...result, ...Decode.decodePlaceOrder(result.receipt, w.address) };
    }
    // BinaryPool initialization requires ERC-20 metadata and fixes its
    // `oneCollateral` from `decimals()`. A write must use the same exact scale.
    // Falling back to display decimals can silently over-approve by orders of
    // magnitude. This writer instance owns the token cache.
    const collateralUnits = new Map();
    async function collateralUnit(collateral) {
        const key = collateral.toLowerCase();
        const cached = collateralUnits.get(key);
        if (cached !== undefined)
            return cached;
        const tokenDecimals = await publicClient.readContract({
            address: collateral,
            abi: ReadsAbi.erc20ReadAbi,
            functionName: "decimals",
        });
        const unit = 10n ** BigInt(tokenDecimals);
        collateralUnits.set(key, unit);
        return unit;
    }
    // Escrow resolution: explicit params win; otherwise read them off the pool
    // contract itself (IBinaryPool.outcomeToken/collateralToken/marketNonce — one
    // pipelined round-trip) and cache per pool. outcomeToken + collateral are
    // immutable for a pool's lifetime; the ids depend on the pool's CURRENT
    // marketNonce (v2 pools serve successive markets), so the cache is keyed by
    // (pool, nonce) — a recycle bumps the nonce and the next read re-derives.
    const poolTokensCache = new Map();
    async function poolTokens(pool, nonceOverride) {
        const read = { address: pool, abi: ReadsAbi.binaryPoolTokensAbi };
        // Resolve the nonce first (cheap uint64 read) unless the caller supplied it.
        const nonce = nonceOverride ?? (await publicClient.readContract({ ...read, functionName: "marketNonce" }));
        const key = `${pool.toLowerCase()}:${nonce}`;
        const hit = poolTokensCache.get(key);
        if (hit)
            return hit;
        const [outcomeToken, collateral] = await Promise.all([
            publicClient.readContract({ ...read, functionName: "outcomeToken" }),
            publicClient.readContract({ ...read, functionName: "collateralToken" }),
        ]);
        // v2 ids fold in the pool's marketNonce — derive locally, no per-side read.
        const t = {
            outcomeToken,
            yesId: Ids.outcomeId(pool, nonce, 0),
            noId: Ids.outcomeId(pool, nonce, 1),
            collateral,
            oneCollateral: await collateralUnit(collateral),
        };
        poolTokensCache.set(key, t);
        return t;
    }
    async function tokens(p) {
        if (p.outcomeToken && p.yesId !== undefined && p.noId !== undefined && p.collateral) {
            return {
                outcomeToken: p.outcomeToken,
                yesId: p.yesId,
                noId: p.noId,
                collateral: p.collateral,
                oneCollateral: await collateralUnit(p.collateral),
            };
        }
        const t = await poolTokens(p.pool);
        const collateral = p.collateral ?? t.collateral;
        return {
            outcomeToken: p.outcomeToken ?? t.outcomeToken,
            yesId: p.yesId ?? t.yesId,
            noId: p.noId ?? t.noId,
            collateral,
            oneCollateral: collateral === t.collateral ? t.oneCollateral : await collateralUnit(collateral),
        };
    }
    // The pool's market-expiry cap in ns — the default order expiry (v2 rejects an
    // order expiring after the market). Re-read per placement rather than cached:
    // it changes on recycle and a stale value would mis-default across a market
    // roll. One cheap uint64 read; skipped whenever the caller passes an explicit
    // expireTimestampNs (the common bot path).
    async function marketExpiryNs(pool) {
        return await publicClient.readContract({
            address: pool,
            abi: ReadsAbi.binaryPoolReadAbi,
            functionName: "marketExpiryNs",
        });
    }
    // v2: the YES/NO side is an explicit OrderKind enum on `placeBinaryOrder`
    // (0 BUY_YES, 1 SELL_YES, 2 BUY_NO, 3 SELL_NO) — NOT encoded in userData. The
    // pool maps kind onto the base book's (isBid, price) internally; the SDK just
    // forwards the enum. userData is opaque MM bookkeeping, forwarded verbatim.
    // Escrow per side. Buys escrow collateral (an ERC-20 allowance the pool pulls);
    // sells escrow an outcome position — an id on the ERC-6909 singleton the pool
    // moves under a one-time operator approval (full quantity).
    //
    // A buy's amount is the pool's own commitment — `bidCommitment` above, shared
    // with the facade's collateral pre-check so both name the same number.
    function escrow(p, { outcomeToken, yesId, noId, collateral, oneCollateral }) {
        const commitment = (unitPrice) => bidCommitment(p.quantity, unitPrice, oneCollateral, p.builderFeeBpsTimes1k ?? 0n);
        switch (p.side) {
            case "BUY_YES":
                return { kind: "erc20", token: collateral, amount: commitment(p.price) };
            case "BUY_NO":
                return { kind: "erc20", token: collateral, amount: commitment(oneCollateral - p.price) };
            case "SELL_YES":
                return { kind: "erc6909", outcomeToken, id: yesId, amount: p.quantity };
            case "SELL_NO":
                return { kind: "erc6909", outcomeToken, id: noId, amount: p.quantity };
        }
    }
    // (token→spender) pairs this trader has approved to maxUint256 or found to have
    // an effectively unlimited allowance. OZ-style ERC-20s do not decrement a
    // maxUint256 allowance on transferFrom, so cached pairs can skip the pre-send
    // allowance read. A finite allowance remains uncached because this order can
    // consume it.
    const approvedPairs = new Set();
    const effectivelyUnlimitedAllowance = maxUint256 / 2n;
    const pairKey = (token, spender) => `${token.toLowerCase()}:${spender.toLowerCase()}`;
    async function approvalIfNeeded(token, spender, amount, gas) {
        if (amount === 0n)
            return undefined;
        const key = pairKey(token, spender);
        if (approvedPairs.has(key))
            return undefined; // cache hit — no read, no tx
        // Resolve the pool's exact worst-case pull only after a cache miss. A finite
        // covering allowance remains uncached, so the next order repeats both reads.
        const required = typeof amount === "function" ? await amount() : amount;
        if (required === 0n)
            return undefined;
        const allowance = await publicClient.readContract({
            address: token,
            abi: TradeAbi.erc20WriteAbi,
            functionName: "allowance",
            args: [fromAddress, spender],
        });
        if (allowance >= required) {
            // A finite allowance can be consumed by this order. Re-read it next time.
            // Only an OZ-style unlimited approval is stable enough for the hot cache.
            if (allowance >= effectivelyUnlimitedAllowance)
                approvedPairs.add(key);
            return undefined;
        }
        return {
            call: { address: token, abi: TradeAbi.erc20WriteAbi, functionName: "approve", args: [spender, maxUint256], gas },
            // approved maxUint256 — skip the read from here on
            commit: () => approvedPairs.add(key),
        };
    }
    // (outcomeToken→spender) operator grants this trader has already set (or found
    // already set on-chain). An ERC-6909 operator approval is a single boolean
    // covering EVERY id on the singleton — so once the pool (or BinaryMarketsModule/router) is an
    // operator for this owner, no per-market or per-id approval is ever needed
    // again. Cached like `approvedPairs` so the hot path skips the `isOperator` read.
    const operatorPairs = new Set();
    // The operator grant of `spender` on the ERC-6909 outcome-token singleton the
    // next write needs — read isOperator, and hand back setOperator(spender, true)
    // as a prerequisite once if not. Replaces per-token ERC-20 approvals for every
    // outcome-position escrow.
    async function operatorGrantIfNeeded(outcomeToken, spender, gas) {
        const key = pairKey(outcomeToken, spender);
        if (operatorPairs.has(key))
            return undefined; // cache hit — no read, no tx
        const isOperator = await publicClient.readContract({
            address: outcomeToken,
            abi: ReadsAbi.erc6909Abi,
            functionName: "isOperator",
            args: [fromAddress, spender],
        });
        if (isOperator) {
            operatorPairs.add(key); // already an operator on-chain; remember it
            return undefined;
        }
        return {
            call: {
                address: outcomeToken,
                abi: ReadsAbi.erc6909Abi,
                functionName: "setOperator",
                args: [spender, true],
                gas,
            },
            commit: () => operatorPairs.add(key),
        };
    }
    /**
     *  Forget a cached approval so the next escrowing write re-checks (and re-approves
     *  if needed). Use only if a token's allowance was reduced out-of-band — standard
     *  maxUint256 approvals are never decremented, so this is rarely needed. Clears
     *  both ERC-20 allowances and ERC-6909 operator grants for the pair.
     */
    function clearApprovalCache(token, spender) {
        if (token && spender) {
            approvedPairs.delete(pairKey(token, spender));
            operatorPairs.delete(pairKey(token, spender));
        }
        else {
            approvedPairs.clear();
            operatorPairs.clear();
        }
    }
    async function poolCollateral(pool, override) {
        return override ?? (await poolTokens(pool)).collateral;
    }
    // Perp wiring caches: pool → MarginBank, bank → collateral token. Both are
    // immutable after deployment (same doctrine as poolTokensCache).
    const perpBankCache = new Map();
    const bankCollateralCache = new Map();
    // A zero `marginBank` is rejected rather than returned, and the reason is the same one
    // `consentCall` states for a zero registry: a call to an address with no code SUCCEEDS
    // with empty returndata, so every perp write resolving through here — `deposit`,
    // `withdraw`, `setMaxLeverage`, both repayment routes — would broadcast, mine, and
    // report a receipt while moving nothing. `ZERO_ADDRESS` is a truthy string, so the
    // `if (p.marginBank)` guard alone lets it through. No caller has ever legitimately
    // passed one; `listPerpPoolStatuses` REPORTS a zero bank for an unreachable pool, and
    // that value is read-side only and never reaches a write.
    async function resolveMarginBank(p) {
        if (p.marginBank === ZERO_ADDRESS) {
            throw new InvalidInputError("marginBank must not be the zero address (a call to it would succeed and do nothing)");
        }
        if (p.marginBank)
            return p.marginBank;
        if (!p.pool) {
            throw new InvalidInputError("pass marginBank or pool (PerpMarket.marginBank has it)");
        }
        const key = p.pool.toLowerCase();
        const hit = perpBankCache.get(key);
        if (hit)
            return hit;
        const bank = await publicClient.readContract({
            address: p.pool,
            abi: TradeAbi.perpPoolWriteAbi,
            functionName: "marginBank",
        });
        perpBankCache.set(key, bank);
        return bank;
    }
    async function bankCollateral(bank, override) {
        if (override)
            return override;
        const key = bank.toLowerCase();
        const hit = bankCollateralCache.get(key);
        if (hit)
            return hit;
        const cfg = (await publicClient.readContract({
            address: bank,
            abi: ReadsAbi.marginBankReadAbi,
            functionName: "getSystemConfig",
        }));
        bankCollateralCache.set(key, cfg.collateralToken);
        return cfg.collateralToken;
    }
    // The bank names its own authoritative registry, so read it rather than take a
    // deployment address on faith. A zero means the rail is DORMANT on this
    // deployment: the bank will fund no child from any main, whatever the registry
    // itself says. That is a config-side outcome (arm the bank, or pass `registry` to
    // reach a registry the bank does not read yet), never a retry — hence
    // NotConfiguredError. See the interface member for why this is not cached.
    async function bankLinkedWalletRegistry(bank, override) {
        if (override)
            return override;
        const registry = await publicClient.readContract({
            address: bank,
            abi: ReadsAbi.marginBankReadAbi,
            functionName: "getLinkedWalletRegistry",
        });
        if (registry === ZERO_ADDRESS) {
            throw new NotConfiguredError("MarginBank.linkedWalletRegistry", `MarginBank ${bank} holds no linked-wallet registry, so the funding rail is dormant on this deployment; pass registry to target one anyway`);
        }
        return registry;
    }
    // The bank names the distributor it accepts credit from. A zero means the voucher
    // programme is off on this deployment: a config-side outcome, never a retry, hence
    // NotConfiguredError. See the interface member for why this is not cached.
    async function bankCreditGranter(bank, override) {
        if (override)
            return override;
        const granter = await publicClient.readContract({
            address: bank,
            abi: ReadsAbi.marginBankReadAbi,
            functionName: "getCreditGranter",
        });
        if (granter === ZERO_ADDRESS) {
            throw new NotConfiguredError("MarginBank.creditGranter", `MarginBank ${bank} holds no credit granter, so the voucher programme is off on this deployment; pass distributor to target one anyway`);
        }
        return granter;
    }
    // Resolve the CollateralRouter: an explicit override wins, else the hub's
    // `addresses.collateralRouter`. The router is optional per environment, so
    // throw a clear error when neither is set rather than sending to address(0).
    function resolveRouter(override) {
        const router = override ?? addresses().collateralRouter;
        if (!router || router === ZERO_ADDRESS) {
            throw new NotConfiguredError("a deployed CollateralRouter", "this environment");
        }
        return router;
    }
    // Resolve the BinaryMarketsModule / BinarySettlement addresses — explicit
    // override wins, else the hub config. Throw a clear error rather than sending
    // to address(0) when neither is set (settlement is absent on pre-v2 deploys).
    function resolveModule(override) {
        const module = override ?? addresses().binaryModule;
        if (!module || module === ZERO_ADDRESS) {
            throw new NotConfiguredError("addresses.binaryModule", "this write");
        }
        return module;
    }
    function resolveSettlement(override) {
        const settlement = override ?? addresses().binarySettlement;
        if (!settlement || settlement === ZERO_ADDRESS) {
            throw new NotConfiguredError("addresses.binarySettlement", "this settlement call (absent on pre-v2 deploys)");
        }
        return settlement;
    }
    // Resolve the OperatorPermissionsRegistry — explicit override wins, else the hub
    // config. `attempting` lets a caller name its own operation (the stop-order
    // preflight says "a stop order", not "an operator grant").
    function resolveOperatorRegistry(override, attempting = "an operator grant") {
        const registry = override ?? addresses().operatorPermissionsRegistry;
        if (!registry || registry === ZERO_ADDRESS) {
            throw new NotConfiguredError("operatorRegistry or addresses.operatorPermissionsRegistry", attempting);
        }
        return registry;
    }
    // The settlement singleton's outcome-token singleton (cached — immutable). Used
    // to target the one-time operator grant for redeemDirect / module-routed redeem
    // when the caller passes no market to read it off.
    let _settlementOutcomeToken;
    async function settlementOutcomeToken(settlement) {
        if (_settlementOutcomeToken)
            return _settlementOutcomeToken;
        _settlementOutcomeToken = await publicClient.readContract({
            address: settlement,
            abi: ReadsAbi.binarySettlementAbi,
            functionName: "outcomeToken",
        });
        return _settlementOutcomeToken;
    }
    return {
        execute,
        executeOrder,
        poolTokens,
        tokens,
        marketExpiryNs,
        escrow,
        approvalIfNeeded,
        operatorGrantIfNeeded,
        clearApprovalCache,
        poolCollateral,
        resolveMarginBank,
        bankCollateral,
        bankLinkedWalletRegistry,
        bankCreditGranter,
        resolveRouter,
        resolveModule,
        resolveSettlement,
        resolveOperatorRegistry,
        settlementOutcomeToken,
        executor,
        publicClient,
        addresses,
        from,
        fromAddress,
        chain,
        defaultGas,
        oneBase,
        decimals,
        dbg,
    };
}
