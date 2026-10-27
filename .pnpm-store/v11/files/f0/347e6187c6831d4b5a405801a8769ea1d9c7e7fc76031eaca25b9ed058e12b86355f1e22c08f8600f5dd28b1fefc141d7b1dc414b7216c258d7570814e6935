// The chain guard every executor applies before signing: a call carries the
// chain it must run on, and an executor is bound to one.

import { InvalidInputError } from "../errors.js";
import type { UnsignedCall } from "../writer.js";

/**
 *  Failures from {@link assertCallsOnChain}: an empty call list, or a call that
 *  names a chain other than the executor's.
 *
 * @category errors
 */
export type AssertCallsOnChainError = InvalidInputError;

/**
 *  Throw {@link InvalidInputError} when any call names a chain other than the
 *  executor's, or when there is nothing to execute. Applied by every built-in
 *  executor as its first step; a custom executor should call it too.
 *
 *  - Throws {@link InvalidInputError} - `calls` is empty, or a call's `chainId`
 *    is not `chainId`. The complete union is {@link AssertCallsOnChainError}.
 *
 * @category trading
 */
export function assertCallsOnChain(chainId: number, calls: readonly UnsignedCall[]): void {
  if (calls.length === 0) {
    throw new InvalidInputError("execute() needs at least one call");
  }
  for (const call of calls) {
    if (call.chainId !== chainId) {
      throw new InvalidInputError(
        `"${call.description}" belongs on chain ${call.chainId}, but this executor sends on chain ${chainId}`,
      );
    }
  }
}
