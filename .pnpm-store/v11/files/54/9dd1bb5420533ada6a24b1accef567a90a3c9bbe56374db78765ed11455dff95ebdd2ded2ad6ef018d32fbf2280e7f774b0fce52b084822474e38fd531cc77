// The receipt a Somnia send returns in the same call. `eth_sendRawTransactionSync`
// and `somnia_sendSessionTransaction` answer with a standard receipt plus
// `executionTimeMicros`: the time from the node receiving the request to its
// answer, which covers mempool, finality and execution. This module is the ONE
// place that reads that field off the wire, so both send paths decode it the
// same way.
//
// A LEAF on purpose: viem only, so txSend.ts and native/client.ts can both
// reach it.

import { formatTransactionReceipt, type RpcTransactionReceipt, type TransactionReceipt } from "viem";

/**
 *  A receipt from a Somnia send that returns it in the same call, with the
 *  node's timing decoded.
 *
 *  **Details**
 *
 *  `executionTimeMicros` is the time in microseconds from the node receiving the
 *  request to its answer: mempool, finality and execution inside Somnia. It is
 *  absent when the node does not report it (an older node, or a receipt read
 *  back with `eth_getTransactionReceipt`).
 *
 * @category native RPC
 */
export type SomniaTransactionReceipt = TransactionReceipt & {
  /** Node-side end-to-end time in microseconds. Absent when the node does not report it. */
  executionTimeMicros?: number;
};

/**
 *  Decode the node's `executionTimeMicros` value, or `undefined` when it is
 *  absent or not a non-negative safe integer.
 *
 *  The node's encoding is not pinned, so this accepts a JSON number, a hex
 *  quantity (`"0x1f4"`) and a decimal string (`"500"`). A value it cannot read
 *  is dropped rather than thrown: the field is a measurement, and a mined write
 *  must not fail because of it.
 *
 * @internal
 */
export function parseExecutionTimeMicros(value: unknown): number | undefined {
  let micros: number;
  if (typeof value === "number") micros = value;
  else if (typeof value === "string" && /^0x[0-9a-f]+$/i.test(value)) micros = Number(value);
  else if (typeof value === "string" && /^[0-9]+$/.test(value)) micros = Number(value);
  else return undefined;
  return Number.isSafeInteger(micros) && micros >= 0 ? micros : undefined;
}

/**
 *  Format a raw JSON-RPC receipt with viem's formatter and decode
 *  `executionTimeMicros`. viem copies unknown fields through untouched, so the
 *  raw field is taken out first: the result carries the decoded number or no
 *  field at all, never the wire string.
 *
 * @internal
 */
export function formatSomniaReceipt(raw: unknown): SomniaTransactionReceipt {
  // `raw` is the node's untyped JSON-RPC answer; a receipt is its whole contract.
  const { executionTimeMicros, ...rpc } = raw as RpcTransactionReceipt & { executionTimeMicros?: unknown };
  const receipt: TransactionReceipt = formatTransactionReceipt(rpc);
  const micros = parseExecutionTimeMicros(executionTimeMicros);
  return micros === undefined ? receipt : { ...receipt, executionTimeMicros: micros };
}
