import * as Errors from "./errors.js";
// Revert decoding — turns whatever a node/viem hands back for a failed call into
// a {@link ContractRevertError} that names the Solidity error.
//
// This is the ONE place that knows the shape of a viem/JSON-RPC failure. Callers
// (the send path in trade.ts, the read helpers) hand it the caught value and get
// back an SDK error; they never inspect `e.cause.data` themselves. Keeping that
// knowledge here is what lets errors.ts stay a pure vocabulary module.
//
// Every path yields a ContractRevertError — a matched custom error, a bare
// require string, unrecognized data, or no data at all (see the fallbacks in
// `decodeRevert`). A caller therefore never has to handle a raw viem error to
// find out why a call failed.

import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  decodeErrorResult,
  isHex,
  type Hex,
} from "viem";
import * as ContractErrorsAbi from "./contractErrorsAbi.js";
import { ContractRevertError, RpcError } from "./errors.js";

import { InvariantError } from "./raise.js";
import type { SomniaMarketsSocketFailure } from "./config.js";

/** Where the failing call was aimed — carried onto the error for diagnosis. */
export interface RevertContext {
  /** The contract that was called, when known. */
  address?: string;
  /** The function that was called, when known. */
  functionName?: string;
}

/**
 *  Pulls revert data out of a thrown value, wherever the transport buried it.
 *
 *  **Details**
 *
 *  Revert bytes arrive in a frustrating number of shapes: viem's
 *  `RawContractError`/`ContractFunctionRevertedError` expose `.data` (sometimes
 *  as a `{ data }` object), while a bare JSON-RPC error nests
 *  `.error.data`/`.cause.data` and some nodes hand back `{ data: { data } }`.
 *  This walks the `cause` chain (bounded, so a cyclic chain can't hang the
 *  process) collecting the first hex string that looks like error data.
 */
function findRevertData(value: unknown): Hex | undefined {
  const seen = new Set<unknown>();
  let node: unknown = value;
  for (let depth = 0; node != null && depth < 10; depth += 1) {
    if (seen.has(node)) break;
    seen.add(node);
    const rec = node as Record<string, unknown>;

    for (const key of ["data", "raw"] as const) {
      const candidate = rec[key];
      // viem's `isHex` type-guards `unknown` straight to `Hex`, so this needs no
      // cast — and it is STRICTER than a `startsWith("0x")` test, which happily
      // accepted junk like "0xZZZZ" and passed it to `decodeErrorResult`.
      if (isHex(candidate)) return candidate;
      // `{ data: { data: "0x…" } }` — some nodes double-wrap.
      if (candidate != null && typeof candidate === "object") {
        const inner = (candidate as Record<string, unknown>).data;
        if (isHex(inner)) return inner;
      }
    }
    node = rec.cause ?? rec.error;
  }
  return undefined;
}

/**
 *  Pulls a plain `require`/`revert("…")` reason string out of a thrown value.
 *
 *  **When to use**
 *
 *  Use when there is no decodable custom error — this is the fallback for a
 *  plain reason string.
 *
 *  **Details**
 *
 *  viem surfaces these as `shortMessage`/`reason`, and raw nodes as a `message`
 *  like `"execution reverted: ERC20: transfer amount exceeds balance"`. The
 *  prefix is stripped so the field carries the contract's own words.
 */
function findRevertReason(value: unknown): string | undefined {
  const seen = new Set<unknown>();
  let node: unknown = value;
  for (let depth = 0; node != null && depth < 10; depth += 1) {
    if (seen.has(node)) break;
    seen.add(node);
    const rec = node as Record<string, unknown>;
    // A bare "execution reverted" with nothing after it is NOT a reason — it says
    // only that the call reverted, which the error already conveys. Stripping it
    // leaves an empty string, and reporting that would render "…reverted: " and
    // hide the raw-data fallback that actually carries information.
    for (const key of ["reason", "shortMessage", "message"] as const) {
      const candidate = rec[key];
      if (typeof candidate !== "string" || candidate.length === 0) continue;
      const stripped = stripRevertPrefix(candidate);
      if (stripped.length > 0 && stripped.toLowerCase() !== "execution reverted") return stripped;
    }
    node = rec.cause ?? rec.error;
  }
  return undefined;
}

/** Drops a leading "execution reverted:" / "reverted:" so the reason reads as the contract wrote it. */
function stripRevertPrefix(message: string): string {
  return message.replace(/^\s*(execution\s+)?reverted:?\s*/i, "").trim();
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
export function isRevert(value: unknown): boolean {
  if (findRevertData(value) !== undefined) return true;
  const seen = new Set<unknown>();
  let node: unknown = value;
  for (let depth = 0; node != null && depth < 10; depth += 1) {
    if (seen.has(node)) break;
    seen.add(node);
    const rec = node as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name : "";
    if (name === "ContractFunctionRevertedError" || name === "RawContractError") return true;
    for (const key of ["message", "shortMessage", "reason"] as const) {
      const text = rec[key];
      if (typeof text === "string" && /revert/i.test(text)) return true;
    }
    node = rec.cause ?? rec.error;
  }
  return false;
}

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
export function isMissingContractView(err: unknown): boolean {
  for (let e: unknown = err, depth = 0; e != null && depth < 8; e = (e as { cause?: unknown }).cause, depth += 1) {
    if (e instanceof BaseError) {
      return Boolean(e.walk((x) => x instanceof ContractFunctionZeroDataError || isEmptyRevert(x)));
    }
  }
  return false;
}

/**
 *  A revert that carries nothing — no custom error, no unknown selector, no reason
 *  string. That is what a Solidity dispatcher produces for a selector the contract
 *  does not declare (and has no fallback for). A revert WITH any of those came from
 *  a function that exists and rejected the call; it must propagate as the revert it is.
 */
function isEmptyRevert(x: unknown): boolean {
  if (!(x instanceof ContractFunctionRevertedError)) return false;
  return x.data === undefined && x.reason === undefined && x.signature === undefined;
}

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
export function decodeRevert(caught: unknown, context: RevertContext = {}): ContractRevertError {
  // Already one of ours — read its FIELDS rather than re-scraping its message.
  // This happens for real: the read boundary makes `publicClient.call` throw a
  // ContractRevertError, and trade.ts's failed-receipt replay feeds what it
  // caught back through here. Re-scraping would lift the SDK's own message text
  // into `reason`, presenting our prose as the contract's words.
  if (caught instanceof ContractRevertError) {
    if (context.address === undefined && context.functionName === undefined) return caught;
    return new ContractRevertError(
      {
        errorName: caught.errorName,
        args: caught.args,
        reason: caught.reason,
        data: caught.data,
        address: caught.address ?? context.address,
        functionName: caught.functionName ?? context.functionName,
      },
      { cause: caught.cause },
    );
  }

  const data = findRevertData(caught);

  if (data !== undefined && data !== "0x") {
    try {
      const decoded = decodeErrorResult({ abi: ContractErrorsAbi.contractErrorsAbi, data });
      return new ContractRevertError(
        {
          errorName: decoded.errorName,
          args: (decoded.args ?? []) as readonly unknown[],
          data,
          address: context.address,
          functionName: context.functionName,
        },
        { cause: caught },
      );
    } catch {
      // Selector isn't in our table (a contract we don't bundle, or a
      // dependency's error) — fall through and preserve the raw bytes rather
      // than pretending we know the name.
    }
  }

  const reason = findRevertReason(caught);
  return new ContractRevertError(
    { reason, data, address: context.address, functionName: context.functionName },
    { cause: caught },
  );
}

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
export function toSdkError(
  caught: unknown,
  operation: string,
  context: RevertContext = {},
): SomniaMarketsSocketFailure {
  const typed = Errors.sdkFailure(caught, InvariantError);
  if (typed) return typed;
  try {
    if (isRevert(caught)) return decodeRevert(caught, context);
    const detail =
      (caught as { shortMessage?: string; message?: string })?.shortMessage ??
      (caught as { message?: string })?.message ??
      String(caught);
    return new RpcError(operation, detail, { cause: caught });
  } catch {
    // Inspection can invoke a hostile getter/Proxy trap. That is still a failed
    // operation; preserve the original evidence rather than the inspection error.
    return new RpcError(operation, "transport failure could not be inspected", { cause: caught });
  }
}
