// Chain reads that go out together, at one block.
//
// The chain views (perp positions, balances) read many figures and must describe one
// state, so every read pins one block. Where the chain has a Multicall3 deployed at that
// block, a batch is one `aggregate3` call with every member allowed to fail; elsewhere
// the same reads go out one by one, still at that block.
//
// Each read is typed: a contract call decodes its own return data with its own ABI, and
// a native balance is `getEthBalance` inside Multicall3 or `eth_getBalance` outside it.
// A failed member settles its own slot with the real revert or transport error, so one
// bad figure degrades one figure.

import { decodeFunctionResult, encodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import { ContractRevertError, RpcError } from "../errors.js";
import * as Raise from "../raise.js";
import * as Revert from "../revert.js";

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
  aggregate(
    multicall: Address,
    calls: readonly { readonly target: Address; readonly callData: Hex }[],
    blockNumber: bigint,
  ): Promise<readonly AggregateResult[]>;
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
export type Settled<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ChainReadError };

/** One typed contract call. `decode` turns the return data into the view's value. */
export interface Call<T> {
  readonly target: Address;
  readonly functionName: string;
  readonly callData: Hex;
  decode(data: Hex): T;
}

/** How many reads go out at once where the chain has no Multicall3. */
const FALLBACK_CONCURRENCY = 8;

const multicallBalanceAbi = parseAbi(["function getEthBalance(address addr) view returns (uint256 balance)"]);

export function readErrorOf(caught: unknown, operation: string, address: Address): ChainReadError {
  const error = Revert.toSdkError(caught, operation, { address, functionName: operation });
  if (error instanceof ContractRevertError || error instanceof RpcError) return error;
  return new RpcError(operation, error.message, { cause: caught });
}

/** Where a read's result lands once its batch has run. */
export class Slot<T> {
  #settled: Settled<T> | undefined;

  set(settled: Settled<T>): void {
    this.#settled = settled;
  }

  get result(): Settled<T> {
    return this.#settled ?? Raise.unreachable("a slot is read only after its batch ran");
  }
}

interface Entry {
  /** The member to send through Multicall3 at `multicall`. */
  member(multicall: Address): { readonly target: Address; readonly callData: Hex };
  accept(data: Hex): void;
  reject(caught: unknown): void;
  /** The same read on its own, where the chain has no Multicall3. */
  direct(chain: PinnedChain, blockNumber: bigint): Promise<void>;
}

/** Reads that go out together at one block. */
export class Batch {
  readonly #entries: Entry[] = [];

  /** Adds a contract call. */
  add<T>(call: Call<T>): Slot<T> {
    const slot = new Slot<T>();
    const accept = (data: Hex) => {
      try {
        slot.set({ ok: true, value: call.decode(data) });
      } catch (caught) {
        slot.set({ ok: false, error: readErrorOf(caught, call.functionName, call.target) });
      }
    };
    const reject = (caught: unknown) =>
      slot.set({ ok: false, error: readErrorOf(caught, call.functionName, call.target) });
    this.#entries.push({
      member: () => ({ target: call.target, callData: call.callData }),
      accept,
      reject,
      direct: (chain, blockNumber) => chain.call(call.target, call.callData, blockNumber).then(accept, reject),
    });
    return slot;
  }

  /** Adds `account`'s native balance. */
  addNative(account: Address): Slot<bigint> {
    const slot = new Slot<bigint>();
    const reject = (caught: unknown) => slot.set({ ok: false, error: readErrorOf(caught, "getEthBalance", account) });
    this.#entries.push({
      member: (multicall) => ({
        target: multicall,
        callData: encodeFunctionData({ abi: multicallBalanceAbi, functionName: "getEthBalance", args: [account] }),
      }),
      accept: (data) => {
        try {
          slot.set({
            ok: true,
            value: decodeFunctionResult({ abi: multicallBalanceAbi, functionName: "getEthBalance", data }),
          });
        } catch (caught) {
          reject(caught);
        }
      },
      reject,
      direct: (chain, blockNumber) =>
        chain.balance(account, blockNumber).then((value) => slot.set({ ok: true, value }), reject),
    });
    return slot;
  }

  /** Runs the batch at `blockNumber`. `signal` stops it before any call it has not sent yet. */
  async run(chain: PinnedChain, blockNumber: bigint, signal?: AbortSignal): Promise<void> {
    if (this.#entries.length === 0) return;
    stopIfAborted(signal);
    const multicall = chain.multicall(blockNumber);
    if (multicall === undefined) {
      await runOneByOne(this.#entries, chain, blockNumber, signal);
      return;
    }
    this.settle(await chain.aggregate(multicall, this.members(multicall), blockNumber));
  }

  /** The batch as the members of one Multicall3 `aggregate3` call on `multicall`, in order. */
  members(multicall: Address): readonly { readonly target: Address; readonly callData: Hex }[] {
    return this.#entries.map((entry) => entry.member(multicall));
  }

  /**
   *  Settles every slot from the results of {@link Batch.members}, in the same order.
   *  Throws `RpcError` when the number of results is not the number of members.
   */
  settle(results: readonly AggregateResult[]): void {
    const entries = this.#entries;
    if (results.length !== entries.length) {
      throw new RpcError("aggregate3", `expected ${entries.length} results, got ${results.length}`);
    }
    entries.forEach((entry, index) => {
      const result = results[index] ?? Raise.unreachable("the length was checked above");
      // A failed member carries the revert data; decodeRevert names the error from it.
      if (result.success) entry.accept(result.returnData);
      else entry.reject(Revert.decodeRevert({ data: result.returnData }));
    });
  }
}

/**
 *  Throws the signal's reason once it has aborted. A read checks it between its calls:
 *  a call already sent runs on, but the read sends no more.
 */
export function stopIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw signal.reason;
}

async function runOneByOne(
  entries: readonly Entry[],
  chain: PinnedChain,
  blockNumber: bigint,
  signal: AbortSignal | undefined,
): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < entries.length) {
      stopIfAborted(signal);
      const entry = entries[next] ?? Raise.unreachable("the loop stops at the last entry");
      next += 1;
      await entry.direct(chain, blockNumber);
    }
  };
  await Promise.all(Array.from({ length: Math.min(FALLBACK_CONCURRENCY, entries.length) }, worker));
}
