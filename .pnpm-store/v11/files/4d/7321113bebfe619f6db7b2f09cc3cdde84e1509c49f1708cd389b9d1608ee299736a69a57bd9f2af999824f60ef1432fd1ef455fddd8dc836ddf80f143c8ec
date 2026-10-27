import { ContractRevertError } from "./errors.js";
import type { SomniaMarketsSocketFailure } from "./config.js";
/** Where the failing call was aimed — carried onto the error for diagnosis. */
export interface RevertContext {
    /** The contract that was called, when known. */
    address?: string;
    /** The function that was called, when known. */
    functionName?: string;
}
/**
 *  Is this thrown value a revert (the chain rejected the call), as opposed to a
 *  transport failure (the request never got an answer)?
 *
 *  **Details**
 *
 *  The distinction is what decides {@link ContractRevertError} vs
 *  {@link RpcError}, and it matters to callers: a revert will happen again
 *  identically, a transport failure is worth retrying. Revert data or an
 *  "execution reverted" message means the EVM ran and rejected; a connection
 *  refused / timeout / unsupported-method does not.
 */
export declare function isRevert(value: unknown): boolean;
/**
 *  Whether a failed read means "this contract does not have that function" rather than
 *  "the request did not get through" — shared so no call site can drift from this policy.
 *
 *  Deliberately narrow. Calling a selector an older implementation never declared lands
 *  in the fallback (or nothing at all) and surfaces as an EMPTY revert or as empty return
 *  data; a timeout, a rate limit or a dropped connection surfaces as neither, and a
 *  revert that names an error or a reason is a real rejection by a real function. Catching
 *  every error instead would turn an RPC outage into a confident "this market is not
 *  registered" / "this token has no decimals", which is the one answer these probes
 *  exist to avoid guessing at.
 *
 *  Walks `cause`, and that is the whole point. A call site on the DECORATED client
 *  receives a read failure normalized through {@link toSdkError} — an `RpcError` or
 *  `ContractRevertError`, neither of which extends viem's `BaseError`. Both keep the
 *  viem error reachable via `cause` (RpcError → ContractFunctionExecutionError →
 *  ContractFunctionZeroDataError; ContractRevertError → ContractFunctionExecutionError →
 *  ContractFunctionRevertedError), so finding the first viem error and applying the
 *  narrow check there is what makes this work on both a decorated and a raw client.
 */
export declare function isMissingContractView(err: unknown): boolean;
/**
 *  Decodes a caught contract failure into a {@link ContractRevertError}.
 *
 *  **Details**
 *
 *  Never throws and never returns undefined: an undecodable revert still
 *  produces the typed error, because "the chain rejected this" is useful even
 *  when the bytes are a mystery.
 *
 * - `caught`: The value thrown by viem / the transport.
 * - `context`: Which contract and function were called, for the message.
 * - Returns: A ContractRevertError — with `errorName` + `args` when the revert data matched one of the protocol's custom errors, else `reason` (a require string) or `data` (unrecognized bytes) preserved, and `caught` in `cause`.
 *
 *  **Gotchas**
 *
 *  Decodes unconditionally: it does not first check whether the failure IS a
 *  revert, so a transport error (timeout, disconnect) passed here comes back as
 *  a ContractRevertError with no `errorName`. Callers inside the SDK use the
 *  internal `isRevert` / `toSdkError` pair to make that distinction; neither is
 *  exported, so a consumer should pass values it already knows to be revert
 *  data — which is the usual case when decoding a failed call's own error.
 */
export declare function decodeRevert(caught: unknown, context?: RevertContext): ContractRevertError;
/**
 *  The single funnel for a caught chain failure: a revert becomes a
 *  {@link ContractRevertError}, anything else an {@link RpcError}.
 *
 *  **When to use**
 *
 *  Use as the `catch` handler for a chain call — this is what the send path and
 *  the read helpers call in theirs.
 *
 *  **Details**
 *
 *  Already-typed SDK errors pass through untouched, so wrapping at an inner and
 *  an outer boundary can't double-wrap.
 *
 * - `caught`: The value thrown by viem / the transport.
 * - `operation`: What was attempted, for an {@link RpcError} message.
 * - `context`: Contract + function, for a revert message.
 */
export declare function toSdkError(caught: unknown, operation: string, context?: RevertContext): SomniaMarketsSocketFailure;
