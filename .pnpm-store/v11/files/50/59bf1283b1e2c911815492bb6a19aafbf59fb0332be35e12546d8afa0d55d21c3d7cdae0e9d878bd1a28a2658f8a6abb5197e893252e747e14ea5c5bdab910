import type { Abi, Address, ContractFunctionArgs, ContractFunctionName, ContractFunctionParameters, ContractFunctionReturnType, PublicClient } from "viem";
/**
 *  Most contract reads one batched request carries. Each {@link readEach} stage sends
 *  one Multicall3 aggregate per this many targets, so its request count is
 *  `ceil(targets / capacity)`, not one per target. The bound keeps each payload finite:
 *  at 100 reads of a 36-byte-calldata view, about 4 KB.
 */
export declare const READ_BATCH_CAPACITY = 100;
/**
 *  Most point reads in flight at once when the chain has no usable Multicall3. The
 *  fallback sends one request per target, and this bound stops a large batch from
 *  opening hundreds of concurrent requests.
 */
export declare const READ_FALLBACK_CONCURRENCY = 8;
/** One member of a batched read, settled on its own. */
export type Settled<T> = {
    status: "success";
    result: T;
} | {
    status: "failure";
    error: unknown;
};
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
export declare function readEach<const abi extends Abi, fn extends ContractFunctionName<abi, "view">>(client: PublicClient, blockNumber: bigint, abi: abi, functionName: fn, targets: ReadonlyArray<{
    address: Address;
    args?: ContractFunctionArgs<abi, "view", fn>;
}>, useMulticall?: boolean): Promise<Array<Settled<ContractFunctionReturnType<abi, "view", fn>>>>;
/**
 *  Bounded heterogeneous reads at one block, with each member settled on its own.
 *  A caller that has proved Multicall3 unavailable can disable it for this snapshot.
 *  The default preserves the homogeneous read path and its capability fallback.
 */
export declare function readCalls(client: PublicClient, blockNumber: bigint, calls: ContractFunctionParameters[], useMulticall?: boolean): Promise<Array<Settled<unknown>>>;
/** A required read's value, or its failure thrown as the typed SDK error a point read throws. */
export declare function required<T>(read: Settled<T> | undefined, address: Address, functionName: string): T;
