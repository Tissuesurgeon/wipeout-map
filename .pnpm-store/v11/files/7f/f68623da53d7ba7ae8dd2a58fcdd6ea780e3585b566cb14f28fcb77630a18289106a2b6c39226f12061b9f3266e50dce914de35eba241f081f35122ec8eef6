import { type Address, type Hex } from "viem";
import { ContractRevertError, RpcError } from "../errors.js";
/** Why a chain read failed: the call reverted, or the read did not complete. */
export type ChainReadError = ContractRevertError | RpcError;
/** One member of a Multicall3 `aggregate3` result. */
export interface AggregateResult {
    readonly success: boolean;
    readonly returnData: Hex;
}
/**
 *  The chain calls a pinned batch makes. The client adapter maps them onto the engine's
 *  chain client; tests answer them with ABI-encoded results.
 */
export interface PinnedChain {
    /** The head to pin every read to. */
    blockNumber(): Promise<bigint>;
    /** The Multicall3 usable at `blockNumber`, or `undefined` when the chain has none there. */
    multicall(blockNumber: bigint): Address | undefined;
    /** Runs the calls in one `aggregate3` on `multicall` at `blockNumber`, each allowed to fail. */
    aggregate(multicall: Address, calls: readonly {
        readonly target: Address;
        readonly callData: Hex;
    }[], blockNumber: bigint): Promise<readonly AggregateResult[]>;
    /**
     *  One `eth_call` at `blockNumber`, sent as `from` when given: a view that answers
     *  for its caller reads for that address. Rejects with the call's revert or
     *  transport error.
     */
    call(target: Address, callData: Hex, blockNumber: bigint, from?: Address): Promise<Hex>;
    /** One `eth_getBalance` at `blockNumber`. */
    balance(account: Address, blockNumber: bigint): Promise<bigint>;
}
/** A read's value, or why it failed. */
export type Settled<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: ChainReadError;
};
/** One typed contract call. `decode` turns the return data into the view's value. */
export interface Call<T> {
    readonly target: Address;
    readonly functionName: string;
    readonly callData: Hex;
    decode(data: Hex): T;
}
export declare function readErrorOf(caught: unknown, operation: string, address: Address): ChainReadError;
/** Where a read's result lands once its batch has run. */
export declare class Slot<T> {
    #private;
    set(settled: Settled<T>): void;
    get result(): Settled<T>;
}
/** Reads that go out together at one block. */
export declare class Batch {
    #private;
    /** Adds a contract call. */
    add<T>(call: Call<T>): Slot<T>;
    /** Adds `account`'s native balance. */
    addNative(account: Address): Slot<bigint>;
    /** Runs the batch at `blockNumber`. `signal` stops it before any call it has not sent yet. */
    run(chain: PinnedChain, blockNumber: bigint, signal?: AbortSignal): Promise<void>;
    /** The batch as the members of one Multicall3 `aggregate3` call on `multicall`, in order. */
    members(multicall: Address): readonly {
        readonly target: Address;
        readonly callData: Hex;
    }[];
    /**
     *  Settles every slot from the results of {@link Batch.members}, in the same order.
     *  Throws `RpcError` when the number of results is not the number of members.
     */
    settle(results: readonly AggregateResult[]): void;
}
/**
 *  Throws the signal's reason once it has aborted. A read checks it between its calls:
 *  a call already sent runs on, but the read sends no more.
 */
export declare function stopIfAborted(signal: AbortSignal | undefined): void;
