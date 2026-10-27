// Getting the NODE's error out of a client's error.
//
// THE PROBLEM. Somnia reports a mempool rejection as JSON-RPC `-32000` with the
// useful text in `message` and a status byte in `data`:
//
//   { "code": -32000, "message": "account does not exist", "data": "0x02" }
//
// viem maps `-32000` to `InvalidInputRpcError`, whose `shortMessage` — and therefore
// the first line of `error.message` — is the generic "Missing or invalid parameters."
// So the default thing to log says the parameters are wrong when the real problem is
// an unfunded account. That cost an hour of live debugging on 2026-07-31; the payload
// was correct the whole time.
//
// THE FIX. Nothing needs bypassing: viem preserves the original. `BaseError`'s
// constructor does `if (args.cause instanceof BaseError) return args.cause.details`,
// so `details` is inherited up the whole wrapper chain from the `RpcRequestError`
// that set it to the node's `message`. The raw `{ code, message, data }` object is
// still the innermost `cause`. This module walks to it.
//
// Deliberately structural, with no `instanceof` against viem's classes: this repo has
// already been bitten by two copies of viem in one tree, where `instanceof` silently
// fails. It also means this works on an error from a plain `fetch`-based requester
// that never went through viem at all.
//
// LOCKSTEP: `MempoolStatusCode` in somnia2 `somnia/mempool/mempool_common.h`, and the
// code → message mapping in `somnia/api/handlers/eth_api_types.h`
// (`GetMempoolSubmissionError`), which is what puts the byte in `data`.

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
export const SomniaMempoolStatus = {
  /** Accepted. Never seen on an error. */
  success: 0,
  /** The sender already has transactions in flight. */
  hasInFlightTransactions: 1,
  /** The SENDER has never existed on chain — fund it before it can transact. */
  accountDoesNotExist: 2,
  /** The sender cannot cover `value` plus the gas ceiling. */
  insufficientBalance: 3,
  /** Nonce below the account's next — including when `eth_getTransactionCount` lags. */
  nonceTooSmall: 4,
  /** Nonce beyond what the mempool will queue. */
  nonceTooLarge: 5,
  /** Nonce too far ahead of the account's next to hold. */
  nonceNotCloseEnough: 6,
  /** The account is already linked. */
  accountAlreadyLinked: 7,
  /** Malformed, or below the intrinsic gas cost. */
  invalidTransaction: 8,
  /** Signature did not recover to the sender. */
  invalidSignature: 9,
  /** The account is not linked. */
  accountNotLinked: 10,
  /** No room; retry later. */
  mempoolFull: 11,
  /** `maxFeePerGas` under the block's base fee. */
  gasPriceBelowBaseFee: 12,
  /** `maxFeePerGas` under the dynamic fee the node currently requires. */
  gasPriceBelowDynamicFee: 13,
  /** The sender's in-flight value exceeds what the mempool allows at once. */
  tooMuchValueInFlight: 14,
} as const;

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

const STATUS_VALUES: ReadonlySet<number> = new Set(Object.values(SomniaMempoolStatus));

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
export function getSomniaRpcError(error: unknown): SomniaRpcError | null {
  let node: unknown = error;
  let found: { code: number; message: string; data?: unknown } | null = null;
  let details: string | null = null;

  // Bounded: a cause chain is a few links deep, and a cycle must not hang us.
  for (let depth = 0; node !== null && typeof node === "object" && depth < 16; depth++) {
    const candidate = node as { code?: unknown; message?: unknown; data?: unknown; details?: unknown; cause?: unknown };
    if (typeof candidate.details === "string" && candidate.details !== "") details = candidate.details;
    // Keep overwriting: the LAST match down the chain is the node's own.
    if (typeof candidate.code === "number" && typeof candidate.message === "string") {
      found = { code: candidate.code, message: candidate.message, data: candidate.data };
    }
    if (candidate.cause === node) break;
    node = candidate.cause;
  }

  if (!found) return null;

  // A wrapper's `message` is its own paraphrase; `details` is the node's text carried
  // up verbatim, so prefer it when the two disagree.
  const message = details ?? found.message;
  const data = typeof found.data === "string" && found.data.startsWith("0x") ? (found.data as Hex) : null;

  return { code: found.code, message, data, mempoolStatus: decodeStatus(data) };
}

/** A one-byte `data` payload as a mempool status, when it is one. */
function decodeStatus(data: Hex | null): SomniaMempoolStatus | null {
  if (data === null) return null;
  const body = data.slice(2);
  if (body.length !== 2) return null; // exactly one byte, or it isn't a status code
  const value = Number.parseInt(body, 16);
  return STATUS_VALUES.has(value) ? (value as SomniaMempoolStatus) : null;
}
