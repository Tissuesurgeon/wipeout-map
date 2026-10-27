// The wallet-client executor: an injected browser / wagmi signer sends, the
// SDK confirms off the socket's newHeads subscription. The external path of
// the writer it replaced, minus writeContract's pre-send simulation — the
// wallet itself simulates, and a rejection still decodes to its Solidity name.
import * as DebugMod from "../debug.js";
import { TransactionOutcomeUnknownError } from "../errors.js";
import * as Raise from "../raise.js";
import * as Revert from "../revert.js";
import * as TxSend from "../txSend.js";
import * as Boundary from "./boundary.js";
import * as Guard from "./guard.js";
/**
 *  Build the wallet-client executor. Internal: `client.createTrader({ walletClient })`
 *  constructs one.
 *
 * @internal
 */
export function createWalletClientExecutor(deps) {
    const { chain, publicClient, walletClient, from, fees, defaultGas } = deps;
    const dbg = deps.dbg ?? DebugMod.makeDebug();
    const chainId = chain.id;
    const actor = typeof from === "string" ? from : from.address;
    async function sendOne(call, options, parent, signal) {
        signal?.throwIfAborted();
        // Per call: an approval that fails is reported as `approve` on the token,
        // not as the order it was gathered for.
        const context = { address: call.to, functionName: call.functionName ?? options.context?.functionName };
        const hash = await dbg.span("trade.sendTransaction", async () => {
            try {
                return await walletClient.sendTransaction({
                    account: from,
                    chain,
                    to: call.to,
                    data: call.data,
                    gas: options.gas ?? defaultGas,
                    maxFeePerGas: fees.maxFeePerGas,
                    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
                    ...(call.value !== 0n ? { value: call.value } : {}),
                });
            }
            catch (e) {
                // The wallet simulates before signing, so a revert surfaces here with
                // data attached — decode it rather than leaking viem's error.
                throw Revert.toSdkError(e, "sendTransaction", context);
            }
        }, parent);
        // The wallet returned the hash, so the transaction is out. A failed
        // confirmation (a dropped heads subscription, receipt reads that keep
        // failing) does not mean it failed: report the hash, not a plain RpcError
        // a caller would retry into a second transaction.
        let receipt;
        try {
            receipt = await dbg.span("trade.confirm", () => TxSend.waitReceiptViaHeads(publicClient, hash, { chainId, signal }), parent);
        }
        catch (e) {
            if (e instanceof TransactionOutcomeUnknownError)
                throw e;
            throw new TransactionOutcomeUnknownError({ chainId, operation: "waitForTransactionReceipt", hash }, { cause: e });
        }
        return { hash, receipt };
    }
    return {
        chainId,
        actor,
        async execute(calls, options = {}) {
            const signal = deps.getReceiptSignal?.();
            Guard.assertCallsOnChain(chainId, calls);
            // One transaction per call, in order; a mined revert ends the sequence so
            // the calls behind it are never sent (see Executor.execute).
            let last;
            for (const call of calls) {
                last = await sendOne(call, options, options.parentSpan, signal);
                if (last.receipt.status === "reverted")
                    return last;
            }
            // assertCallsOnChain rejected an empty list, so the loop ran at least once.
            return last ?? Raise.unreachable("execute ran no call");
        },
        signTypedData: async (typedData) => {
            try {
                // Caller data first, the actor LAST: a typed-data object carrying its own
                // `account` must not sign as an address other than the advertised actor.
                return await walletClient.signTypedData({ ...typedData, account: from });
            }
            catch (e) {
                throw Boundary.asSignTypedDataError(e);
            }
        },
    };
}
