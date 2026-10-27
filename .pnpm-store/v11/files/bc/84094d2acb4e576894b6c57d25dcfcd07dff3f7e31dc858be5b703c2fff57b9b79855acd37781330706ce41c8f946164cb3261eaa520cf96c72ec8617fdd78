import type { Address, Hash, Hex, TransactionReceipt, TypedDataDefinition } from "viem";
import type { ContractRevertError, RpcError } from "../errors.js";
import type { Span } from "../debug.js";
import type { UnsignedCall } from "../writer.js";
import type { SomniaMarketsSocketFailure } from "../config.js";
/**
 *  Per-call knobs the writer hands an executor. Everything is optional; an
 *  executor that has no use for a field ignores it.
 *
 * @category trading
 */
export interface ExecuteOptions {
    /** Gas ceiling for the transaction (the writer's default when unset). Never estimated. */
    gas?: bigint;
    /**
     *  What the WRITE does, for error messages: the function name of the last
     *  call in the list. Each call names its own `functionName` and an executor
     *  reads that first; this is the fallback for a call that carries none. An
     *  executor threads it into the {@link ContractRevertError} it raises so a
     *  revert reads "placeBinaryOrder reverted: …" rather than naming only the
     *  address.
     */
    context?: {
        functionName?: string;
    };
    /**
     *  The writer's debug span, so an executor that traces (the built-in ones do)
     *  nests its sign/broadcast spans under the write. Foreign executors ignore it.
     */
    parentSpan?: Span;
}
/**
 *  What an executor hands back: the receipt it already holds, fetched once by
 *  whoever sent the transaction, plus any INNER failure it detected that the
 *  receipt's own status does not show.
 *
 *  **Details**
 *
 *  `failure` is how a safe reports a swallowed revert: the outer transaction
 *  mines with `status: "success"` while the safe's failure event says the
 *  inner call reverted. The writer throws it exactly as it throws a reverted
 *  receipt, so a caller never has to know which actor sent the write.
 *
 * @category trading
 */
export interface Executed {
    /** Hash of the transaction the executor sent (the OUTER transaction for a safe). */
    hash: Hash;
    /** The mined receipt, as the executor received it. */
    receipt: TransactionReceipt;
    /** An inner failure the executor detected on a receipt whose status is success. */
    failure?: ContractRevertError;
    /**
     *  Node-side end-to-end time of the send in microseconds (mempool, finality
     *  and execution), as the node reported it with the receipt. The built-in
     *  local-signer and session-key executors set it from the
     *  `executionTimeMicros` field of `eth_sendRawTransactionSync` and
     *  `somnia_sendSessionTransaction`. Leave it unset when the send path does
     *  not report it; the writer passes it through to the write's result.
     */
    executionTimeMicros?: number;
}
/**
 *  Failures from {@link Executor.execute}: a call list the chain guard refuses
 *  (empty, or a call for another chain), missing transport configuration, a transport / signer / node failure
 *  with the original as `cause`, a signed transaction whose receipt was not
 *  observed ({@link TransactionOutcomeUnknownError}), or a revert the send
 *  surfaced with data (a wallet's pre-send simulation, a decoded rejection). A
 *  built-in uses this union for operational failures; pre-broadcast owner
 *  cancellation rethrows its abort reason. A custom executor should hold to the
 *  same set — `asExecuteError` does it in one line, and passes a
 *  `TransactionOutcomeUnknownError` it is given through unchanged.
 *
 * @category errors
 */
export type ExecutorExecuteError = SomniaMarketsSocketFailure;
/**
 *  Failures from {@link Executor.signTypedData}: the signer failed or refused
 *  (a wallet rejection, a custom signer's own error), the original as `cause`.
 *
 * @category errors
 */
export type ExecutorSignTypedDataError = RpcError;
/**
 *  EIP-712 signing, for the actors that can sign as themselves. A private key
 *  and a wallet can; a safe cannot (its "signature" is an on-chain approval),
 *  and neither can a session key. Optional on {@link Executor} for that reason.
 *
 * @category trading
 */
export type TypedDataSigner = (typedData: TypedDataDefinition) => Promise<Hex>;
/**
 *  Executes unsigned calls on ONE chain as ONE actor and returns the receipt.
 *
 *  **Details**
 *
 *  - `chainId` is the only chain this executor sends on. A call carrying
 *    another `chainId` is refused with {@link InvalidInputError} before anything
 *    is signed — the guard every built-in executor applies through
 *    {@link assertCallsOnChain}, and one a custom executor should apply too.
 *  - `actor` is the address the pool sees as `msg.sender`: the signer for a
 *    key or wallet, the session account for a session key, the safe itself for
 *    a safe. The writer reads allowances and operator grants for it.
 *  - `execute` takes a LIST because a safe can pack several calls into one
 *    transaction (an approval and the order it enables). An executor that
 *    cannot batch executes the calls in order, each as its own transaction,
 *    and STOPS at the first receipt whose `status` is `"reverted"` or that
 *    carries a `failure`, returning that receipt so the writer throws it —
 *    the calls after it are never sent. When every call succeeds it returns
 *    the last receipt.
 *
 *  **Gotchas**
 *
 *  An executor never fetches a receipt it already has: the SDK decodes the
 *  order id and fills from `receipt.logs`. Return the receipt the send gave
 *  you (`eth_sendRawTransactionSync` and `somnia_sendSessionTransaction`
 *  both return it in the same call).
 *
 * **Example** (A custom executor over an app's own account layer)
 *
 *  ```ts
 *  const executor: Executor = {
 *    chainId: 5031,
 *    actor: safeAddress,
 *    async execute(calls) {
 *      const hash = await myAccountLayer.sendBatch(calls);       // your safe, your relayer…
 *      const receipt = await myAccountLayer.waitForReceipt(hash);
 *      return { hash, receipt };                                  // decoded by the SDK from here
 *    },
 *  };
 *  const trader = exchange.client.createTrader({ executor });
 *  ```
 *
 * @category trading
 */
export interface Executor {
    /** The one chain this executor sends on. */
    readonly chainId: number;
    /** The address the chain sees as the caller of every call this executor sends. */
    readonly actor: Address;
    /**
     *  Send `calls` (one transaction where possible) and return the receipt.
     *
     *  - Throws {@link InvalidInputError} - `calls` is empty or names another
     *    chain, the accounts SDK refuses a smart account's input, or a session
     *    send has no positive gas limit.
     *  - Throws {@link NotConfiguredError} - a chain read the executor needs has
     *    no chain transport.
     *  - Throws {@link RpcError} - the signer, transport or node failed, or the
     *    node refused the transaction; `cause` has the original. From the
     *    local-signer and session-key executors, nothing was sent or the node
     *    refused it. A wallet can fail after it broadcast.
     *  - Throws {@link TransactionOutcomeUnknownError} - a signed transaction may
     *    have reached the node and its receipt was not observed. `hash` names it
     *    (absent for a session send). Look it up before sending again.
     *  - Throws {@link ContractRevertError} - the send surfaced a revert with data before mining.
     *
     *  The complete union is {@link ExecutorExecuteError}. A MINED revert is not a
     *  throw: it comes back as a `"reverted"` receipt for the writer to decode.
     *
     *  **Retry rule.** Never send a write again after a
     *  `TransactionOutcomeUnknownError` until you know what happened to `hash`.
     *  Local and wallet confirmation checks receipts on heads and after one idle
     *  second. Its total deadline is 60 seconds, including unresolved receipt
     *  reads. Owner stop/close or cancellation also ends confirmation. After
     *  broadcast these paths throw the same hash-bearing unknown outcome;
     *  `cause` preserves a supplied abort reason. Before broadcast, cancellation
     *  rethrows that reason and sends nothing.
     *
     *  Read its receipt, or read the state the write changes. A blind retry can
     *  execute the write twice.
     * @throws {InvalidInputError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied RPC constructor, socket member or already-typed executor failure throws this SDK error. Its identity is retained.
     */
    execute(calls: readonly UnsignedCall[], options?: ExecuteOptions): Promise<Executed>;
    /**
     *  Present on actors that can sign EIP-712 typed data as themselves.
     *
     *  - Throws {@link RpcError} - the signer failed or refused; `cause` has the original.
     *
     *  The complete union is {@link ExecutorSignTypedDataError}.
     */
    readonly signTypedData?: TypedDataSigner;
}
