// Shared write executor for the operator "market machinery" admins
// (OperatorAdmin / GovernanceAdmin / MarketCreatorAdmin / OracleHubAdmin) and
// the lend writes. Same signer doctrine as the trader (a privateKey/local
// account signs + sends locally; a browser walletClient sends through the
// wallet). A local-signer send rides the shared eth_sendRawTransactionSync
// path (send + confirm in one round-trip, with the eth_sendRawTransaction
// fallback keeping anvil working). The nonce and sync-send probe remain
// per-call. Local writes share the owner's send lane with Traders and executors
// so concurrent intents cannot read the same pending nonce.
//
// The executor takes `to` / `abi` / `value` per call: these admins write to
// VARYING targets — factories, per-operator adapters/creators, the module —
// and some sends carry native `value` (funding a creator/adapter).
//
// DELIBERATELY NOT writer.ts. The trader's Writer exists for the hot path — a
// local nonce cache, an approval cache, a cached sync-send probe — and admin
// writes want none of that. What the two paths DO share (signer resolution,
// the sync-with-fallback broadcast, the newHeads receipt wait) is shared
// at the txSend.ts leaf. The owner's writer runtime supplies send ordering;
// only the per-surface nonce/probe policy differs here.
import { encodeFunctionData, } from "viem";
import { DEFAULT_FEES, DEFAULT_GAS } from "./config.js";
import { ContractRevertError } from "./errors.js";
import * as Revert from "./revert.js";
import { unreachable } from "./raise.js";
import * as TxSend from "./txSend.js";
import * as WriterRuntime from "./writerRuntime.js";
/**
 *  Build the shared signer/executor from a machinery-admin config + the client's
 *  read deps. Throws {@link SignerRequiredError} when no signer is available.
 *  `label` names the admin in the error text.
 */
export function makeMachineryWriter(config, deps, label) {
    const writerRuntime = deps.writerRuntime ?? WriterRuntime.makeWriterRuntime();
    const defaultGas = config.gas ?? DEFAULT_GAS;
    const { chain } = deps.getConfig();
    const fees = deps.getConfig().fees;
    const { localAccount, walletClient, from } = TxSend.resolveSigner(config, label);
    /**
     *  The external signer's wallet client, for the paths that only run when there
     *  is no local account. `resolveSigner` already rejected "neither signer", so
     *  reaching this with nothing set would be an SDK bug, not a caller error —
     *  hence `unreachable` rather than a caller-facing error or a silent `!`.
     */
    const wallet = () => walletClient ?? unreachable("no external wallet client after signer validation");
    const publicClient = config.publicClient ?? deps.getClient();
    async function execute(w) {
        const signal = deps.getReceiptSignal?.() ?? deps.getConfig().signal;
        signal?.throwIfAborted();
        const waitReceipt = (hash) => TxSend.waitReceiptViaHeads(publicClient, hash, { chainId: chain.id, signal });
        const gas = w.gas ?? defaultGas;
        const value = w.value ?? 0n;
        // A bare native transfer (no abi/functionName) funds a contract's receive().
        const data = w.abi && w.functionName
            ? encodeFunctionData({ abi: w.abi, functionName: w.functionName, args: w.args ?? [] })
            : undefined;
        let hash;
        if (localAccount) {
            return writerRuntime.runLocalSend({ address: localAccount.address, chainId: chain.id }, async () => {
                // The owner can stop while this task waits behind an earlier send.
                // Check its captured lifecycle before starting any external request.
                signal?.throwIfAborted();
                const nonce = await publicClient.getTransactionCount({ address: localAccount.address, blockTag: "pending" });
                signal?.throwIfAborted();
                const signed = await localAccount.signTransaction({
                    type: "eip1559",
                    chainId: chain.id,
                    to: w.to,
                    value,
                    ...(data ? { data } : {}),
                    gas,
                    nonce,
                    maxFeePerGas: fees?.maxFeePerGas ?? DEFAULT_FEES.maxFeePerGas,
                    maxPriorityFeePerGas: fees?.maxPriorityFeePerGas ?? DEFAULT_FEES.maxPriorityFeePerGas,
                });
                // Shared sync-with-fallback broadcast (txSend.ts): send + confirm in
                // one round-trip on a Somnia node, eth_sendRawTransaction + newHeads wait
                // on anvil. retryCount: 0 on both legs — an admin send whose response was
                // lost must not be re-submitted by a transport retry (bridge doctrine).
                signal?.throwIfAborted();
                const receipt = await TxSend.broadcastSigned(publicClient, signed, {
                    label: "@somnia-chain/markets-sdk",
                    signal,
                    retryCount: 0,
                    waitReceipt,
                });
                return checked(TxSend.sentResult(receipt), w, data);
            });
        }
        if (data) {
            hash = await wallet().writeContract({
                address: w.to,
                abi: w.abi,
                functionName: w.functionName,
                args: w.args ?? [],
                account: from,
                chain,
                gas,
                value,
                ...(fees ? { maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas } : {}),
            });
        }
        else {
            hash = await wallet().sendTransaction({
                to: w.to,
                value,
                account: from,
                chain,
                gas,
                ...(fees ? { maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas } : {}),
            });
        }
        const receipt = await waitReceipt(hash);
        return checked({ hash, receipt }, w, data);
    }
    // A mined receipt with status "reverted" is a failure, not a result. Resolving
    // it let a caller treat a reverted admin write as confirmed, and the verbs that
    // decode an event from the logs then reported the revert as "no event". Same
    // stance as the trader's writer: the EVM discards revert data on a mined
    // failure, so replay the call as an eth_call at the receipt's block to recover
    // the reason — strictly best-effort — then throw ContractRevertError either way.
    async function checked(result, w, data) {
        if (result.receipt.status !== "reverted")
            return result;
        throw await revertErrorForReceipt(result.receipt, w, data);
    }
    async function revertErrorForReceipt(receipt, w, data) {
        const context = { address: w.to, functionName: w.functionName ?? "call" };
        try {
            await publicClient.call({
                to: w.to,
                account: from,
                blockNumber: receipt.blockNumber,
                value: w.value ?? 0n,
                ...(data ? { data } : {}),
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
    return { from, execute, publicClient };
}
