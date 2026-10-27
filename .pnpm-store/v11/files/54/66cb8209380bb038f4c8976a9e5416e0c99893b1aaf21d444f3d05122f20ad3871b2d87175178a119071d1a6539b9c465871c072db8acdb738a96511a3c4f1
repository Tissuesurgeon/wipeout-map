// The one RPC-touching file in the bridge module: sign a planner transaction
// locally and broadcast it over eth_sendRawTransactionSync — which
// blocks server-side and returns the RECEIPT in the same call, so a bridge
// transaction confirms in ONE round-trip instead of send-then-poll.
//
// Same latency doctrine as the SDK's trading write path (trade.ts): fees are
// FIXED (never estimated), gas is a fixed generous ceiling, and the raw tx goes
// out in a single request. Two deliberate differences, because bridging is not
// a hot path: the nonce is fetched per call (no local nonce cache to corrupt),
// and the sync → eth_sendRawTransaction fallback is probed per call rather
// than cached (a one-off send has no fleet of writes to amortize a probe over).
//
// A LOCAL signer is required: eth_sendRawTransactionSync takes a raw SIGNED
// transaction, and a browser extension will not sign one for you — injected
// wallets expose eth_sendTransaction, not raw signing. For that path, see
// toEip1193Transaction and the walkthrough's browser section.
import { DEFAULT_FEES, DEFAULT_GAS } from "../../config.js";
import { broadcastSigned } from "../../txSend.js";
const ERR = "@somnia-chain/markets-sdk/chains";
/**
 *  Sign one planner transaction locally and send it via Somnia's
 *  **`eth_sendRawTransactionSync`** — the node blocks until the transaction is
 *  executed and answers with the receipt, so send + confirm is a single
 *  round-trip. On a node without the method (anvil, stock geth) it falls back
 *  to `eth_sendRawTransaction` + a receipt wait, so the same code runs against
 *  `somniaLocal`.
 *
 * **Details**
 *
 * - `client`: A public client for the transaction's chain (its `request` is the wire).
 * - `step`: The planner transaction — `plan.approveStep` / `plan.bridgeStep`.
 * - `options`: The local signer, plus optional gas/fee overrides.
 * - Returns: The mined receipt, status `"success"`.
 *
 * **Gotchas**
 *
 * - Throws If the client is on a different chain than the step, if the node rejects the transaction, or if the receipt says `"reverted"` — the message names the step's `description`.
 *
 * **Example** (Sending a bridge transfer)
 *
 * ```ts
 * import { BridgeToken, ChainId, createBridgeTransfer, sendBridgeStep } from "@somnia-chain/markets-sdk/chains";
 *
 * const plan = createBridgeTransfer({
 *   token: BridgeToken.WBTC,
 *   from: ChainId.somniaShannon,
 *   to: ChainId.hidekiTestnet,
 *   amount: 100_000_000n, // 1 WBTC — 8 decimals, not 18
 *   recipient: account.address,
 * });
 *
 * if (plan.approveStep) await sendBridgeStep(client, plan.approveStep, { account });
 * const receipt = await sendBridgeStep(client, plan.bridgeStep, { account });
 * receipt.status; // "success" — a reverted receipt throws instead
 * ```
 *
 *  Each call resolves only once its transaction is CONFIRMED, so the
 *  approve-then-bridge ordering above is safe by construction. Fees and gas are
 *  fixed, never estimated — the same doctrine as the SDK's trading writes.
 *
 * @category bridging
 */
export async function sendBridgeStep(client, step, options) {
    const { account, gas = DEFAULT_GAS, maxFeePerGas = DEFAULT_FEES.maxFeePerGas, maxPriorityFeePerGas = DEFAULT_FEES.maxPriorityFeePerGas, } = options;
    // A Shannon step sent over a Hideki client would burn a nonce on the wrong
    // network — catch the mismatch before anything is signed.
    if (client.chain && client.chain.id !== step.chainId) {
        throw new Error(`${ERR}: "${step.description}" belongs on chain ${step.chainId}, but the client is on ${client.chain.id}`);
    }
    const nonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
    const serialized = await account.signTransaction({
        type: "eip1559",
        chainId: step.chainId,
        to: step.to,
        data: step.data,
        value: step.value,
        gas,
        nonce,
        maxFeePerGas,
        maxPriorityFeePerGas,
    });
    // Shared sync-with-fallback broadcast (txSend.ts). Both sends go out with
    // `retryCount: 0` — a send that was accepted but whose response was lost would
    // be submitted AGAIN on a transport retry (the second attempt then fails
    // "nonce too low" at best). The probe is per call, not cached: a one-off
    // bridge send has no fleet of writes to amortize a probe over.
    const receipt = await broadcastSigned(client, serialized, {
        label: ERR,
        retryCount: 0,
        waitReceipt: (hash) => client.waitForTransactionReceipt({ hash }),
    });
    if (receipt.status !== "success") {
        throw new Error(`${ERR}: "${step.description}" reverted (tx ${receipt.transactionHash})`);
    }
    return receipt;
}
