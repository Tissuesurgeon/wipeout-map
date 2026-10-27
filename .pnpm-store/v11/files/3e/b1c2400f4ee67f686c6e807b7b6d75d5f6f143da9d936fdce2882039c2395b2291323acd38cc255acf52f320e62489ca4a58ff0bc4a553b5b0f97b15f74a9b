import type { Address, Hex } from "viem";
/** A single call: where it goes, what native value rides with it, and the calldata. */
export interface Call {
    /** The address being called. */
    readonly to: Address;
    /** Native value in wei. Zero for everything in this SDK. */
    readonly value: bigint;
    /** ABI-encoded calldata. */
    readonly data: Hex;
}
/**
 *  A call only ONE address may send.
 *
 *  **Every other `Call` this SDK returns is submittable by anyone** — that is the point of
 *  returning data rather than sending it, and `signExecution` says so in as many words. This one
 *  is the exception, and the exception is invisible in the triple: a pre-validated signature
 *  carries the owner's address in place of a signature and Safe accepts it *only* when
 *  `msg.sender` is that owner, so the authority lives in who broadcasts rather than in the bytes.
 *
 *  Sent by anyone else it reverts `GS025` — after the gas is spent, with nothing in the receipt
 *  naming the sender as the cause. So the constraint travels with the call instead of in a
 *  comment, and {@link submitCall} checks it before broadcasting.
 */
export interface SenderBoundCall extends Call {
    /** The only address that may broadcast this call. */
    readonly sender: Address;
}
/**
 *  Whether a call may only be sent by one particular address.
 *
 *  A {@link SenderBoundCall} is structurally a {@link Call}, so a caller holding one as a `Call`
 *  cannot see the restriction in the type. This recovers it — which is what lets a submit path
 *  refuse the wrong sender rather than paying for a `GS025`.
 */
export declare function isSenderBound(call: Call): call is SenderBoundCall;
//# sourceMappingURL=call.d.ts.map