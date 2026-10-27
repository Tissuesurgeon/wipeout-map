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
export declare function assertCallsOnChain(chainId: number, calls: readonly UnsignedCall[]): void;
