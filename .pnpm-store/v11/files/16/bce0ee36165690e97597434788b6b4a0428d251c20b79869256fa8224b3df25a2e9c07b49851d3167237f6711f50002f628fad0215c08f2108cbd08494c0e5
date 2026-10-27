import { type Address, type RpcTransactionRequest } from "viem";
import type { BridgeToken, BridgeTransaction, BridgeTransfer } from "./types.js";
/**
 * Parameters for {@link createBridgeTransfer}.
 *
 * @category bridging
 */
export interface CreateBridgeTransferParams {
    /** Token to bridge. */
    token: BridgeToken;
    /** Chain id to send FROM. */
    from: number;
    /** Chain id to send TO. */
    to: number;
    /**
     *  Amount in **base units of the origin side's decimals** — read them off
     *  {@link BridgeTokenDetails.decimals} rather than assuming 18 (WBTC is 8).
     */
    amount: bigint;
    /** Who receives the tokens on the destination chain. */
    recipient: Address;
    /**
     *  Interchain gas payment to attach, added to the transfer's `value`. Defaults to
     *  `0n`, which is correct for this bridge — it has no InterchainGasPaymaster and
     *  every router quotes 0. Pass the result of `quoteGasPayment(destinationDomain)`
     *  if that ever changes.
     */
    gasPayment?: bigint;
    /**
     *  Amount to approve on a `collateral` route. Defaults to `amount` (exact
     *  approval). Pass a larger value to approve once for several transfers, or `0n`
     *  to skip the approval step entirely when an allowance is already in place.
     */
    approveAmount?: bigint;
}
/**
 *  Build the unsigned transactions that bridge `amount` of `token` from one Somnia
 *  network to another.
 *
 *  Returns a plan rather than a single transaction, because what it takes depends
 *  on the route: a **collateral** leg needs an ERC-20 `approve` before
 *  `transferRemote`, while **native** and **synthetic** legs need only the bridge
 *  call. `approveStep` is absent when there is nothing to approve — branch on it
 *  and it narrows, no non-null assertion needed:
 *
 * **Details**
 *
 * - `params`: Token, direction, amount, recipient, and the optional gas/approval knobs.
 * - Returns: The transfer: `bridgeStep` (the `transferRemote` call), `approveStep` (the ERC-20 approval on a collateral route, absent otherwise), and both sides' token details.
 *
 * **Gotchas**
 *
 * - Throws If the amount is not positive, the recipient isn't an address, the two chains are the same, or that token has no route between them. The message names what IS supported.
 *
 * **Example** (Planning a bridge transfer)
 *
 * ```ts
 * import { BridgeToken, ChainId, createBridgeTransfer } from "@somnia-chain/markets-sdk/chains";
 *
 * const plan = createBridgeTransfer({
 *   token: BridgeToken.WBTC,
 *   from: ChainId.somniaShannon,
 *   to: ChainId.hidekiTestnet,
 *   amount: 100_000_000n, // 1 WBTC — 8 decimals, not 18
 *   recipient: account.address,
 * });
 *
 * if (plan.approveStep) {
 *   const hash = await walletClient.sendTransaction({ ...plan.approveStep, account });
 *   await publicClient.waitForTransactionReceipt({ hash }); // the approval must LAND first
 * }
 * const hash = await walletClient.sendTransaction({ ...plan.bridgeStep, account });
 * await publicClient.waitForTransactionReceipt({ hash });
 * ```
 *
 *  On a Somnia node, {@link sendBridgeStep} does the same in one round-trip per
 *  transaction via `eth_sendRawTransactionSync`.
 *
 *  Delivery is asynchronous: `transferRemote` only escrows and dispatches. The
 *  relayer delivers on the far side seconds later, and this bridge does not meter
 *  that gas — see {@link SOMNIA_BRIDGE}.
 *
 * @category bridging
 */
export declare function createBridgeTransfer(params: CreateBridgeTransferParams): BridgeTransfer;
/**
 *  A {@link BridgeTransaction} as the JSON-safe object a browser wallet's
 *  `eth_sendTransaction` takes — typed as viem's own `RpcTransactionRequest`
 *  (hex quantities throughout), with only `from`/`to`/`data`/`value` set. Every
 *  field is a hex string, so the result survives `JSON.stringify`, a server →
 *  browser boundary, or a `postMessage` — which a raw {@link BridgeTransaction}
 *  does not: its `value` is a `bigint`, and `JSON.stringify` throws on bigints.
 *
 *  What it deliberately DROPS is as important as what it converts:
 *
 *  - **`chainId`** — `eth_sendTransaction` has no chain field; an EIP-1193
 *    wallet signs on its **active** chain. Switch first with
 *    `wallet_switchEthereumChain` (using the transaction's `chainId`) or it
 *    goes out on whatever network the wallet happens to be on.
 *  - `description` — a UI label, not a transaction field; some wallets reject
 *    requests carrying unknown keys.
 *
 *  No `gas`, no nonce, no fees, same as the input: the wallet estimates and
 *  fills those. Callers on viem don't need this at all —
 *  `walletClient.sendTransaction({ ...plan.bridgeStep, account })` takes it
 *  as-is; this exists for the raw `provider.request(...)` path and for moving a
 *  server-built plan across a JSON boundary.
 *
 * **Details**
 *
 * - `step`: The planner transaction (or anything with `to`/`data`/`value`) to convert.
 * - `options`: `from` — the sender to pin; omit to let the wallet choose.
 * - Returns: The `eth_sendTransaction` params object, JSON-safe by construction.
 *
 * **Example** (Preparing an EIP-1193 transaction)
 *
 * ```ts
 * import { BridgeToken, ChainId, createBridgeTransfer, toEip1193Transaction } from "@somnia-chain/markets-sdk/chains";
 * import { numberToHex } from "viem";
 *
 * const plan = createBridgeTransfer({
 *   token: BridgeToken.STT,
 *   from: ChainId.somniaShannon,
 *   to: ChainId.hidekiTestnet,
 *   amount: 1_000_000_000_000_000_000n, // 1 STT
 *   recipient,
 * });
 *
 * const tx = toEip1193Transaction(plan.bridgeStep, { from: sender });
 * tx.value;           // "0xde0b6b3a7640000" — hex wei, not a bigint
 * JSON.stringify(tx); // safe: every field is a string
 *
 * // The wallet signs on its ACTIVE chain — put it on the step's chain first.
 * await provider.request({
 *   method: "wallet_switchEthereumChain",
 *   params: [{ chainId: numberToHex(plan.bridgeStep.chainId) }],
 * });
 * await provider.request({ method: "eth_sendTransaction", params: [tx] });
 * ```
 *
 * @category bridging
 */
export declare function toEip1193Transaction(step: Pick<BridgeTransaction, "to" | "data" | "value">, options?: {
    from?: Address;
}): RpcTransactionRequest;
