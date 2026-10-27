import { type LocalAccount, type PublicClient, type TransactionReceipt } from "viem";
import type { BridgeTransaction } from "./types.js";
/**
 * Options for {@link sendBridgeStep}.
 *
 * @category bridging
 */
export interface SendBridgeStepOptions {
    /**
     *  The signer. Must be a LOCAL account (viem's `privateKeyToAccount`, a
     *  derived session account, a mnemonic account…) — raw-transaction sending
     *  needs `signTransaction`, which injected browser wallets do not expose.
     *
     *  Its balance must cover the full FEE ENVELOPE — `gas × maxFeePerGas`,
     *  0.6 STT at the defaults — on top of the transaction's `value`: Somnia's
     *  mempool admits a transaction only when the ceiling is funded, even though
     *  unused gas is never charged (measured live: a 0.05 STT account is
     *  rejected "insufficient balance"). Fund small accounts accordingly, or
     *  lower `gas`.
     */
    account: LocalAccount;
    /** Gas ceiling (default 10,000,000 — the SDK-wide fixed ceiling). Never estimated. */
    gas?: bigint;
    /** Fixed fees (default the SDK-wide `DEFAULT_FEES`: 60 gwei max, 0 priority). */
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
}
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
export declare function sendBridgeStep(client: PublicClient, step: BridgeTransaction, options: SendBridgeStepOptions): Promise<TransactionReceipt>;
