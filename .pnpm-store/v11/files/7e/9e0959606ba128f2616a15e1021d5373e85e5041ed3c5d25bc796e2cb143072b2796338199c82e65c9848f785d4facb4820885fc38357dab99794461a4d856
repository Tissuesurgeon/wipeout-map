import { type Address, type Hash, type Hex, type PublicClient } from "viem";
import type { BridgeToken, BridgeTransfer } from "../chains/bridge/types.js";
import { BridgeLiquidityError, InvalidInputError, NotConfiguredError, RpcError, type ContractRevertError, type SignerRequiredError } from "../errors.js";
import type { Executor } from "../executor/types.js";
import type { SomniaMarketsClient } from "../somniaMarketsClient.js";
/**
 * Parameters for {@link ExchangeBridge.plan} and {@link ExchangeBridge.transfer}.
 *
 * @category bridging
 */
export interface ExchangeBridgeParams {
    /** Token to bridge. */
    token: BridgeToken;
    /** Chain id to send FROM — must be one of the exchange's chains. */
    from: number;
    /** Chain id to send TO — must be one of the exchange's chains. */
    to: number;
    /** Amount in base units of the ORIGIN side's decimals. */
    amount: bigint;
    /** Who receives on the destination. Defaults to the exchange's account (the same address on every chain). */
    recipient?: Address;
    /** Approve more than `amount` on a collateral route, or `0n` to skip the approval. */
    approveAmount?: bigint;
}
/**
 * One step of a bridge transfer as it happens, for a status UI.
 *
 * @category bridging
 */
export interface BridgeStepEvent {
    /** Which leg. `deliver` is the destination-side landing. */
    kind: "approve" | "bridge" | "deliver";
    /** Chain the step happens on. */
    chainId: number;
    /** `sent` when the origin transaction was submitted, `confirmed` when it mined, `delivered` when the destination router paid out, `timeout` when delivery was not observed in time. */
    status: "sent" | "confirmed" | "delivered" | "timeout";
    /** Transaction hash, when the step has one. */
    hash?: Hash;
}
/**
 * Options for {@link ExchangeBridge.transfer}.
 *
 * @category bridging
 */
export interface ExchangeBridgeTransferOptions {
    /** Called on every step transition. */
    onStep?: (step: BridgeStepEvent) => void;
    /**
     *  How long to wait for delivery on the destination before giving up, counted
     *  from when the origin transaction is mined. The default is 180 s, about 20
     *  times the measured median on the Hideki 2 lane.
     *
     *  This bound stops once the destination Mailbox processes the message, and
     *  the read of the delivery receipt after that is given the same bound again.
     *  So a transfer whose message is processed just before the deadline can take
     *  up to twice this value in the worst case: the wait for `ProcessId`, then a
     *  destination node that never serves the receipt. Both legs are bounded, and
     *  neither falls back to the RPC client's own default.
     */
    deliveryTimeoutMs?: number;
}
/**
 * What {@link ExchangeBridge.transfer} resolves with.
 *
 * @category bridging
 */
export interface ExchangeBridgeResult {
    /** The plan that was executed. */
    plan: BridgeTransfer;
    /** Hash of the origin transaction that carried the bridge call (and the approval, when a safe packed both). */
    bridgeHash: Hash;
    /** Hash of the separate approval transaction, when one was sent on its own. */
    approveHash?: Hash;
    /**
     *  The Hyperlane message id of this transfer, decoded from the origin receipt.
     *  After a timeout, `delivered(messageId)` on the destination Mailbox tells
     *  whether the message has landed since.
     */
    messageId: Hex;
    /** True when the destination Mailbox processed this message within the timeout. */
    delivered: boolean;
    /**
     *  Hash of the destination transaction that delivered, when the SDK observed it.
     *  Absent when the message was already delivered before the watch opened: the
     *  Mailbox answers `delivered` with a boolean only.
     */
    deliveryHash?: Hash;
}
/**
 *  The bridge, reached as `exchange.bridge`: plan and execute transfers between
 *  the exchange's own chains through the account's executors.
 *
 * @category bridging
 */
export interface ExchangeBridge {
    /**
     *  Plan a transfer between two configured chains — pure, nothing sent. Throws
     *  {@link NotConfiguredError} when either chain is not one of the exchange's,
     *  {@link InvalidInputError} when the token has no route between them.
     */
    plan(params: ExchangeBridgeParams): BridgeTransfer;
    /**
     *  Plan and execute: the origin legs go through the origin chain's executor
     *  (a safe packs approval and bridge into one transaction), then delivery of
     *  that one message is awaited on the destination engine's socket.
     *
     *  **Details**
     *
     *  The message id comes from the origin receipt: the origin Mailbox's
     *  `Dispatch` whose sender is the origin router and whose destination is the
     *  target chain, paired with the `DispatchId` after it. The wait resolves only
     *  on the destination Mailbox's `ProcessId` for that id, and reads the router's
     *  `ReceivedTransferRemote` from the same transaction. A delivery to the same
     *  recipient from another message does not count. The wait also asks the
     *  destination Mailbox `delivered(messageId)`, so a message that landed before
     *  the watch opened still resolves. That read only covers the window before
     *  the watch: when it fails, the watch or the timeout decides.
     *
     *  **Gotchas**
     *
     *  - Throws {@link NotConfiguredError} - a chain outside the exchange, or no executor for the origin chain.
     *  - Throws {@link SignerRequiredError} - the exchange has no account to bridge for.
     *  - Throws {@link InvalidInputError} - the token has no route between the two chains, the amount is not positive, or the executor refused the call list.
     *  - Throws {@link BridgeLiquidityError} - a native route's destination router holds less than the amount. Nothing was sent.
     *  - Throws {@link RpcError} - `operation` names the step. `getBalance`: the destination router's balance read failed, and nothing was sent. `transferRemote`: the origin transaction was sent and mined as reverted. `bridge message id`: the origin transaction was mined, but its receipt holds no single Mailbox dispatch from the origin router to the destination. The funds may be in flight. `watch bridge delivery`: the destination watch failed after the origin leg was mined, and the funds may be in flight; or the delivery transaction holds no `ReceivedTransferRemote` from the router. `waitForTransactionReceipt`: the message was processed, but the delivery receipt read failed. Any other `operation` comes from the executor's send, and the transaction may have been sent.
     *  - Throws {@link ContractRevertError} - an origin leg reverted, in simulation or on chain.
     *  - Resolves with `delivered: false` and the `messageId` when the message was
     *    not processed within the timeout, or when the exchange closes after this
     *    call started. The transfer may still land. It is not undone.
     */
    transfer(params: ExchangeBridgeParams, options?: ExchangeBridgeTransferOptions): Promise<ExchangeBridgeResult>;
}
/**
 * Failures from {@link ExchangeBridge.transfer}.
 *
 * @category errors
 */
export type ExchangeBridgeTransferError = NotConfiguredError | SignerRequiredError | InvalidInputError | BridgeLiquidityError | RpcError | ContractRevertError;
/** What the exchange lends the bridge: its engines, its executors, its account. */
export interface ExchangeBridgeDeps {
    chainIds: () => number[];
    engineFor: (chainId: number) => SomniaMarketsClient;
    executorFor: (chainId: number) => Executor;
    account: () => Address;
    /** The signal that aborts when the exchange next closes. `transfer` reads it once, when it starts. */
    closed: () => AbortSignal;
}
/**
 *  @internal The delivery wait when the caller passes no `deliveryTimeoutMs`.
 *  The live facade suite logs measured legs against it.
 *
 *  About 20 times the measured Hideki 2 median (7.5 s and 8.7 s for the two directions,
 *  2026-09-17), so the relayer's 5.1 s retry arm and a slow leg both fit.
 */
export declare const DEFAULT_DELIVERY_TIMEOUT_MS = 180000;
/**
 *  Wait again for the message of a transfer that timed out, on the destination
 *  engine's socket. Resolves `true` when the destination Mailbox has processed
 *  it, `false` when it has not within the timeout. Sends nothing.
 *
 * @internal
 */
export declare function awaitSentMessage(destinationViem: PublicClient, sent: ExchangeBridgeResult, timeoutMs: number | undefined, closed: AbortSignal): Promise<boolean>;
/** @internal */
export declare function createExchangeBridge(deps: ExchangeBridgeDeps): ExchangeBridge;
/** A currency code as the bridge names it, when the code IS a bridge token. */
export declare function bridgeTokenForCode(code: string): BridgeToken | undefined;
/** The bytes32 form of an address, as a warp message carries it. */
export declare function recipientBytes32(address: Address): Hex;
