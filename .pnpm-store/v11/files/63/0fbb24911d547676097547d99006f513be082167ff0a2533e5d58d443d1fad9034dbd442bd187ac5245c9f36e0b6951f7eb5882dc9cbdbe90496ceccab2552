// The batched read boundary — one view, read on many contracts at one block.
//
// Transport machinery, owned by no market kind. Perp discovery reads a view per pool
// and the account-equity cohort reads a view per account; both batch the same way and
// neither is the other's concern. The two limits live here so every batched read in
// the SDK answers to ONE bound, and a concept module never becomes a utility owner.

import type {
  Abi,
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionParameters,
  ContractFunctionReturnType,
  PublicClient,
} from "viem";
import { ChainDoesNotSupportContract } from "viem";
import * as Raise from "./raise.js";
import * as Revert from "./revert.js";

/**
 *  Most contract reads one batched request carries. Each {@link readEach} stage sends
 *  one Multicall3 aggregate per this many targets, so its request count is
 *  `ceil(targets / capacity)`, not one per target. The bound keeps each payload finite:
 *  at 100 reads of a 36-byte-calldata view, about 4 KB.
 */
export const READ_BATCH_CAPACITY = 100;

/**
 *  Most point reads in flight at once when the chain has no usable Multicall3. The
 *  fallback sends one request per target, and this bound stops a large batch from
 *  opening hundreds of concurrent requests.
 */
export const READ_FALLBACK_CONCURRENCY = 8;

/** One member of a batched read, settled on its own. */
export type Settled<T> = { status: "success"; result: T } | { status: "failure"; error: unknown };

/**
 *  One view, read on many contracts at one block, with each member settled on its own.
 *
 *  Uses Multicall3 in chunks of {@link READ_BATCH_CAPACITY} when the chain declares it.
 *  Otherwise, or when Multicall3 is not deployed at `blockNumber`, it falls back to
 *  point reads, at most {@link READ_FALLBACK_CONCURRENCY} at a time. Both paths pin
 *  `blockNumber`, so the result describes one block across every chunk. A member
 *  failure is returned, never thrown; the caller decides what it means. A caller
 *  can disable Multicall3 after proving it unavailable for the current snapshot.
 */
export async function readEach<const abi extends Abi, fn extends ContractFunctionName<abi, "view">>(
  client: PublicClient,
  blockNumber: bigint,
  abi: abi,
  functionName: fn,
  targets: ReadonlyArray<{ address: Address; args?: ContractFunctionArgs<abi, "view", fn> }>,
  useMulticall = true,
): Promise<Array<Settled<ContractFunctionReturnType<abi, "view", fn>>>> {
  // viem decodes every member against `abi` and `functionName`, so each result has
  // this view's return type. Its typings cannot carry that through a dynamic-length
  // call list, which is all the casts below assert.
  type R = Settled<ContractFunctionReturnType<abi, "view", fn>>;
  const calls = targets.map(
    (t) => ({ abi, functionName, address: t.address, args: t.args }) as ContractFunctionParameters,
  );
  // The homogeneous ABI/function fixes every return type, which viem cannot carry
  // through the dynamic call list consumed by the shared heterogeneous boundary.
  return (await readCalls(client, blockNumber, calls, useMulticall)) as R[];
}

/**
 *  Bounded heterogeneous reads at one block, with each member settled on its own.
 *  A caller that has proved Multicall3 unavailable can disable it for this snapshot.
 *  The default preserves the homogeneous read path and its capability fallback.
 */
export async function readCalls(
  client: PublicClient,
  blockNumber: bigint,
  calls: ContractFunctionParameters[],
  useMulticall = true,
): Promise<Array<Settled<unknown>>> {
  type R = Settled<unknown>;
  if (calls.length === 0) return [];
  if (useMulticall && typeof client.multicall === "function" && client.chain?.contracts?.multicall3) {
    const chunks: ContractFunctionParameters[][] = [];
    for (let i = 0; i < calls.length; i += READ_BATCH_CAPACITY) {
      chunks.push(calls.slice(i, i + READ_BATCH_CAPACITY));
    }
    // `batchSize: 0` stops viem from splitting a chunk again by calldata bytes. The
    // capacity above is the one bound, so the request count equals the chunk count.
    const settled = await Promise.allSettled(
      chunks.map((contracts) => client.multicall({ contracts, allowFailure: true, blockNumber, batchSize: 0 })),
    );
    // With `allowFailure: true`, viem does not reject when a request fails (a 429 or a
    // timeout). It settles every member of that chunk as a failure, which the caller
    // handles per target. A chunk rejects only on an error raised before the request is
    // sent. `ChainDoesNotSupportContract` ("no usable Multicall3 at this block") is a
    // capability answer, so the whole stage falls back to point reads below. Any other
    // rejection fails only that chunk's members, so the other targets keep their results.
    const unsupported = settled.some((s) => s.status === "rejected" && s.reason instanceof ChainDoesNotSupportContract);
    if (!unsupported) {
      return settled.flatMap((s, k): R[] => {
        if (s.status === "fulfilled") return s.value;
        const chunk = chunks[k] ?? Raise.unreachable("settled chunk without its input");
        return chunk.map(() => ({ status: "failure", error: s.reason }));
      });
    }
  }
  const out: R[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < calls.length) {
      const i = next++;
      const call = calls[i] ?? Raise.unreachable("fallback read without its input");
      out[i] = await client.readContract({ ...call, blockNumber }).then(
        (result) => ({ status: "success", result }),
        (error: unknown) => ({ status: "failure", error }),
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(READ_FALLBACK_CONCURRENCY, calls.length) }, worker));
  return out;
}

/** A required read's value, or its failure thrown as the typed SDK error a point read throws. */
export function required<T>(read: Settled<T> | undefined, address: Address, functionName: string): T {
  if (read == null) return Raise.unreachable("batched read without its input");
  if (read.status === "success") return read.result;
  throw Revert.toSdkError(read.error, `readContract ${functionName}`, { address, functionName });
}
