import type { Hex } from "viem";
/**
 *  The node's mempool verdict, as the `data` byte of a `-32000` error carries it.
 *
 *  Worth branching on rather than matching error strings: `nonceTooSmall` is
 *  retryable with a bumped nonce, `insufficientBalance` needs funding, and
 *  `accountDoesNotExist` means the *sender* has never been seen — a different fix
 *  from either.
 *
 * **Example** (Branching on mempool status)
 *
 * ```ts
 * import { SomniaMempoolStatus, getSomniaRpcError } from "@somnia-chain/markets-sdk/native";
 *
 * const rpc = getSomniaRpcError(error);
 * if (rpc?.mempoolStatus === SomniaMempoolStatus.nonceTooSmall) {
 *   // stale nonce count — re-read it and retry
 * }
 * ```
 *
 * @category native RPC
 */
export declare const SomniaMempoolStatus: {
    /** Accepted. Never seen on an error. */
    readonly success: 0;
    /** The sender already has transactions in flight. */
    readonly hasInFlightTransactions: 1;
    /** The SENDER has never existed on chain — fund it before it can transact. */
    readonly accountDoesNotExist: 2;
    /** The sender cannot cover `value` plus the gas ceiling. */
    readonly insufficientBalance: 3;
    /** Nonce below the account's next — including when `eth_getTransactionCount` lags. */
    readonly nonceTooSmall: 4;
    /** Nonce beyond what the mempool will queue. */
    readonly nonceTooLarge: 5;
    /** Nonce too far ahead of the account's next to hold. */
    readonly nonceNotCloseEnough: 6;
    /** The account is already linked. */
    readonly accountAlreadyLinked: 7;
    /** Malformed, or below the intrinsic gas cost. */
    readonly invalidTransaction: 8;
    /** Signature did not recover to the sender. */
    readonly invalidSignature: 9;
    /** The account is not linked. */
    readonly accountNotLinked: 10;
    /** No room; retry later. */
    readonly mempoolFull: 11;
    /** `maxFeePerGas` under the block's base fee. */
    readonly gasPriceBelowBaseFee: 12;
    /** `maxFeePerGas` under the dynamic fee the node currently requires. */
    readonly gasPriceBelowDynamicFee: 13;
    /** The sender's in-flight value exceeds what the mempool allows at once. */
    readonly tooMuchValueInFlight: 14;
};
/**
 * One of the {@link SomniaMempoolStatus} codes.
 *
 * @category native RPC
 */
export type SomniaMempoolStatus = (typeof SomniaMempoolStatus)[keyof typeof SomniaMempoolStatus];
/**
 * The JSON-RPC error the node actually sent, recovered from a client's wrapper.
 *
 * @category native RPC
 */
export interface SomniaRpcError {
    /** JSON-RPC code — `-32000` for a mempool rejection, `-32601` unknown method, `-1` the node default. */
    code: number;
    /** The node's own message, e.g. `"account does not exist"` — not the client's paraphrase. */
    message: string;
    /** The `data` field verbatim, or `null` when absent. */
    data: Hex | null;
    /**
     *  `data` decoded, when it is a single mempool status byte. `null` when `data` is
     *  absent, is not one byte, or is not a known code — a newer node may add one.
     */
    mempoolStatus: SomniaMempoolStatus | null;
}
/**
 *  Recover the node's own JSON-RPC error from whatever a client threw.
 *
 *  Use it instead of `error.message` whenever the message will be logged or shown:
 *  a viem `-32000` reads "Missing or invalid parameters." while the node said
 *  "account does not exist".
 *
 * **Details**
 *
 * - `error`: Whatever was thrown.
 * - Returns: The node's error, or `null` if this wasn't a JSON-RPC error at all.
 *
 * **Example** (Reading a native RPC error)
 *
 * ```ts
 * import { getSomniaRpcError } from "@somnia-chain/markets-sdk/native";
 *
 * try {
 *   await native.sendSessionTransaction({ seed, gas: 21_000n, to, value });
 * } catch (error) {
 *   const rpc = getSomniaRpcError(error);
 *   console.error(rpc?.message ?? (error as Error).message); // "account does not exist"
 * }
 * ```
 *
 *  Walks the `cause` chain and returns the **innermost** `{ code, message }` pair,
 *  which is the node's, since each wrapper layer re-describes it. Falls back to a
 *  viem `details` string when the raw object is not reachable.
 *
 * @category native RPC
 */
export declare function getSomniaRpcError(error: unknown): SomniaRpcError | null;
