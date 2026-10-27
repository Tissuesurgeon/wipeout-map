import type { RevertContext } from "../revert.js";
import type { ExecutorExecuteError, ExecutorSignTypedDataError } from "./types.js";
/**
 *  Normalize a failure raised while executing calls to {@link ExecutorExecuteError}:
 *  a member of that union passes through as itself, a revert with data decodes
 *  to {@link ContractRevertError}, anything else becomes {@link RpcError}
 *  naming `operation`, the original as `cause`.
 *
 *  A {@link TransactionOutcomeUnknownError} passes through with its `chainId`,
 *  `operation` and `hash` unchanged, so a wrapper over an inner executor (a
 *  safe, a smart account) reports the hash of the outer transaction it sent.
 *  This function never creates one: only the code that sent the transaction
 *  knows that the bytes may have left.
 *
 * @category trading
 */
export declare function asExecuteError(caught: unknown, operation: string, context?: RevertContext): ExecutorExecuteError;
/**
 *  Normalize a typed-data signing failure to {@link ExecutorSignTypedDataError}:
 *  a wallet's rejection or a custom signer's own error becomes {@link RpcError}
 *  with the original as `cause`; an {@link RpcError} passes through.
 *
 * @category trading
 */
export declare function asSignTypedDataError(caught: unknown): ExecutorSignTypedDataError;
