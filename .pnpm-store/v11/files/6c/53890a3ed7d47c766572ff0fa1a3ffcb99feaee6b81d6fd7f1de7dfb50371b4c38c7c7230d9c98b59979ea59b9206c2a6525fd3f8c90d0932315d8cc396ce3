import * as Errors from "../errors.js";
// The executor boundary's error normalization. An executor is a plugin
// boundary (SDK-ERR-001): whatever a signer, a wallet, a node or a custom
// account layer throws is turned into the SDK error the member's union
// declares, with the original preserved as `cause`. Used by every built-in;
// exported for a custom executor that wants the same contract for free.
import { ContractRevertError, RpcError } from "../errors.js";
import { InvariantError } from "../raise.js";
import * as Revert from "../revert.js";
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
export function asExecuteError(caught, operation, context = {}) {
    const typed = Errors.sdkFailure(caught, InvariantError);
    if (typed)
        return typed;
    const normalized = Revert.toSdkError(caught, operation, context);
    if (normalized instanceof ContractRevertError || normalized instanceof RpcError)
        return normalized;
    return new RpcError(operation, normalized.message, { cause: caught });
}
/**
 *  Normalize a typed-data signing failure to {@link ExecutorSignTypedDataError}:
 *  a wallet's rejection or a custom signer's own error becomes {@link RpcError}
 *  with the original as `cause`; an {@link RpcError} passes through.
 *
 * @category trading
 */
export function asSignTypedDataError(caught) {
    if (caught instanceof RpcError)
        return caught;
    const detail = caught instanceof Error ? caught.message : String(caught);
    return new RpcError("signTypedData", detail, { cause: caught });
}
