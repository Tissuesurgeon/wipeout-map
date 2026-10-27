// The smart-account executor: the actor is a factory account from
// `@somnia-chain/accounts-sdk` (a Gnosis-style safe the cross-chain factory
// deploys at the same address on every chain), and an INNER executor sends the
// outer transaction that makes the account execute the calls.
//
// The division of labour is the one the accounts SDK's own integration guide
// prescribes: that package builds the safe transaction (batching, nonce,
// signature nesting) as pure data, and this SDK puts it on the wire. The
// outer call goes through `inner.execute`, so a write inherits the engine's
// send stack — sync send, nonce lane, send ordering, retry stance —
// unchanged.
//
// Two authority paths, chosen at construction:
//
//   pre-validated — no `signer` and no `through`: the inner actor is a direct
//            owner of a threshold-1 account and is the address that sends, so
//            `msg.sender == owner` counts as its approval and nothing signs.
//            The account checks the sender, never the planned hash, so the
//            nonce that would enter that hash is irrelevant and is not read.
//   signed — a `signer` is given, or `through` names parent accounts: the
//            plan is built against the account's current nonce (one read,
//            through the owning engine's client), the signer signs the
//            EIP-712 payload `prepareExecution` produces, and the accounts
//            SDK nests the signature through each parent's EIP-1271 envelope.
//            One signed execute runs at a time per account on the engine.
//
// Both paths first check that the account holds code on the chain: a call to
// an undeployed account mines as a success that executes nothing.
//
// The accounts SDK encodes `safeTxGas = 0`, so an inner failure REVERTS the
// outer transaction (GS013) rather than being swallowed into a success-status
// receipt. That reverted outer receipt is attributed to the account's own
// `execTransaction` below; the Gnosis `ExecutionFailure` event is still
// checked on a success receipt as a belt-and-braces detector (a module or
// guard can emit it).
import { toEventSelector } from "viem";
import { explainSafeError, planExecution, prepareExecution, prevalidatedExecution, readExecutionPlan, revertReason, EXECUTION_GAS_FLOOR, SUPPORTED_CHAIN_IDS, InvalidInputError as AccountsInvalidInputError, UnsupportedChainError as AccountsUnsupportedChainError, } from "@somnia-chain/accounts-sdk";
import { contractErrorsAbi } from "../contractErrorsAbi.js";
import { ContractRevertError, InvalidInputError } from "../errors.js";
import * as Raise from "../raise.js";
import * as Boundary from "./boundary.js";
import * as Guard from "./guard.js";
/**
 *  Build the smart-account executor. Internal:
 *  `client.createExecutor({ smartAccount, inner })` hands one out.
 *
 * @internal
 */
export function createSmartAccountExecutor(deps) {
    const { smartAccount, inner, getClient, runtime } = deps;
    const chainId = inner.chainId;
    const through = deps.through ?? [];
    // Refused HERE rather than at the first write: on an uncovered chain the
    // accounts SDK has no batcher address to build with, and an executor that
    // cannot ever send is a construction mistake, not a runtime condition.
    if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
        throw new InvalidInputError(`the accounts SDK has no deployment on chain ${chainId} — a smart-account executor can send on: ${SUPPORTED_CHAIN_IDS.join(", ")}`);
    }
    // The signed path needs a signer. `through` forces it (at depth the acting
    // account checks a parent's EIP-1271 answer, and there is no msg.sender in
    // that check for the sender to stand in for); the inner executor's own
    // typed-data signing is the default stand-in because the usual arrangement
    // is one session key that owns the top of the chain and also sends.
    const signer = deps.signer ??
        (through.length > 0 && inner.signTypedData !== undefined
            ? { address: inner.actor, signTypedData: inner.signTypedData }
            : undefined);
    if (through.length > 0 && signer === undefined) {
        throw new InvalidInputError("an account reached through parents needs a signature — pass `signer`, or an `inner` executor that can sign typed data");
    }
    // Cache success only, so an account created later is found on the next
    // execute. Concurrent first executes may repeat the read.
    let deployed = false;
    /** Refuse an account with no code: a call to it succeeds without executing. */
    async function assertDeployed() {
        if (deployed)
            return;
        let code;
        try {
            code = await getClient().getCode({ address: smartAccount });
        }
        catch (e) {
            // A failed read does not prove the code is absent.
            throw Boundary.asExecuteError(e, "getCode", { address: smartAccount });
        }
        if (code === undefined || code === "0x") {
            throw new InvalidInputError(`smart account ${smartAccount} holds no code on chain ${chainId} — create it on this chain first; a call to it would report success without executing anything`);
        }
        deployed = true;
    }
    /** An accounts-SDK failure crossing the boundary as the seam's own union. */
    function normalized(e, operation) {
        if (e instanceof AccountsInvalidInputError || e instanceof AccountsUnsupportedChainError) {
            return new InvalidInputError(e.message, { cause: e });
        }
        return Boundary.asExecuteError(e, operation, { address: smartAccount, functionName: "execTransaction" });
    }
    /** The one authorized `execTransaction` call carrying every inner call. */
    async function authorize(calls) {
        if (signer === undefined) {
            // Pre-validated: the account checks `msg.sender` against its owner set
            // and never the planned hash, so the nonce (the only thing of the plan
            // that hash carries) is irrelevant — 0n, and no read.
            const plan = planExecution({ chainId, account: smartAccount, calls, nonce: 0n });
            return prevalidatedExecution(plan, inner.actor);
        }
        const plan = await readExecutionPlan(getClient(), { chainId, account: smartAccount, calls, through });
        const prepared = prepareExecution(plan, signer.address);
        let signature;
        try {
            signature = await signer.signTypedData(prepared.typedData);
        }
        catch (e) {
            throw Boundary.asExecuteError(e, "signTypedData", { address: smartAccount, functionName: "execTransaction" });
        }
        return prepared.toCall(signature);
    }
    /**
     * Best-effort: replay the reverted outer frame at its block and name the
     * actual cause. The account's own refusal decodes to a GS code (turned into
     * a sentence), and — accounts being Safe 1.5.0, which propagates inner
     * revert data verbatim — an inner call's failure decodes to its real
     * reason, including this SDK's own contract errors. `undefined` when
     * nothing better than "it reverted" can be said; never throws.
     */
    async function decodedReason(outer, receipt) {
        try {
            const revert = await revertReason(getClient(), {
                to: outer.to,
                data: outer.data,
                blockNumber: receipt.blockNumber,
                from: receipt.from,
                errors: contractErrorsAbi,
            });
            if (revert === null)
                return undefined;
            const safe = explainSafeError(revert.reason);
            return safe ? `${safe.code} — ${safe.message}` : revert.reason;
        }
        catch {
            return undefined;
        }
    }
    const unserialized = {
        chainId,
        actor: smartAccount,
        async execute(calls, options = {}) {
            Guard.assertCallsOnChain(chainId, calls);
            await assertDeployed();
            let authorized;
            try {
                authorized = await authorize(calls.map((c) => ({ to: c.to, value: c.value, data: c.data })));
            }
            catch (e) {
                throw normalized(e, "readExecutionPlan");
            }
            const first = calls[0] ?? Raise.unreachable("assertCallsOnChain accepted an empty list");
            const outer = {
                chainId,
                to: authorized.to,
                data: authorized.data,
                // Always 0n: an inner call's value is escrowed from the account's own
                // balance, not attached by the sender.
                value: authorized.value,
                description: calls.length === 1
                    ? `${first.description} (via account ${smartAccount})`
                    : `${calls.length} calls (via account ${smartAccount})`,
                // The outer call is the account's own function: a failure of THIS call
                // is reported as it, not as an inner target's.
                functionName: "execTransaction",
            };
            // Safe frames run nested, so EIP-150 hands the inner frame a fraction of
            // what REMAINS — these calls need a floor of gas remaining, which no
            // estimate of gas spent can supply. Raise an explicit lower gas to the
            // accounts SDK's floor rather than letting the send mine as a failure.
            const gassed = options.gas !== undefined && options.gas < EXECUTION_GAS_FLOOR
                ? { ...options, gas: EXECUTION_GAS_FLOOR }
                : options;
            let executed;
            try {
                executed = await inner.execute([outer], gassed);
            }
            catch (e) {
                throw Boundary.asExecuteError(e, "execute", { address: smartAccount, functionName: "execTransaction" });
            }
            if (executed.failure)
                return executed;
            if (executed.receipt.status === "reverted") {
                // The OUTER call reverted. With safeTxGas 0 a Gnosis safe reverts the
                // whole transaction when the inner call fails; the other reading is
                // refused authority. Tie the failure to the account's own function:
                // the receipt's `to` is the account, which none of the caller's calls
                // name, so the writer must not replay and label an inner one — the
                // replay happens HERE instead, best-effort, to name the actual cause.
                const decoded = await decodedReason(outer, executed.receipt);
                return {
                    ...executed,
                    failure: new ContractRevertError({
                        address: smartAccount,
                        functionName: "execTransaction",
                        reason: decoded !== undefined
                            ? `the account's execTransaction reverted: ${decoded}`
                            : `the account's execTransaction reverted — either an inner call failed (the accounts SDK sets safeTxGas to 0, so the account reverts the whole transaction, GS013) or the account refused the authority (pre-validated: ${inner.actor} must be a direct owner of a threshold-1 account; signed: a wrong or mis-nested signature fails GS026)`,
                    }, { cause: executed.receipt }),
                };
            }
            // Belt-and-braces: this executor's own encoding takes the reverting
            // path above, but a module or guard installed on the account can still
            // emit `ExecutionFailure` on a success-status receipt.
            const failure = detectGnosisFailure(executed.receipt, smartAccount);
            return failure ? { ...executed, failure } : executed;
        },
    };
    // The pre-validated plan always uses nonce 0, so it needs no lane.
    if (signer === undefined)
        return unserialized;
    // The signed plan reads the account's nonce, so the whole execute (plan,
    // signature, send, receipt and revert replay) holds the account's lane on
    // the engine. Two
    // processes that write through one account still race: the lane is per
    // engine.
    return {
        ...unserialized,
        execute: (calls, options) => runtime.runSmartAccountSend({ address: smartAccount, chainId }, () => unserialized.execute(calls, options)),
    };
}
const EXECUTION_FAILURE = toEventSelector("ExecutionFailure(bytes32,uint256)");
/** The Gnosis `ExecutionFailure` event, emitted by the account itself, as the revert to throw. */
function detectGnosisFailure(receipt, account) {
    const lc = account.toLowerCase();
    const log = receipt.logs.find((l) => l.address.toLowerCase() === lc && l.topics[0] === EXECUTION_FAILURE);
    if (log === undefined)
        return undefined;
    return new ContractRevertError({
        address: account,
        functionName: "execTransaction",
        reason: "the account reported ExecutionFailure — the inner call reverted",
    }, { cause: log });
}
