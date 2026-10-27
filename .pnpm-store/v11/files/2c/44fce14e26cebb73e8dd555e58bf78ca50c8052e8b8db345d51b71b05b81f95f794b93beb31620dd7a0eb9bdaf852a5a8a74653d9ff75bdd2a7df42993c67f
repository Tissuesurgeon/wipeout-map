// The local-signer executor: the SDK's fast path, unchanged in behaviour from
// the closure it replaced in writer.ts. Sign with FIXED fees + FIXED gas + a
// locally tracked nonce (zero RPCs after the one-time nonce fetch), then
// broadcast via eth_sendRawTransactionSync, which blocks server-side
// and returns the receipt with logs in the same round-trip.

import { type Chain, type Hex, type LocalAccount, type PublicClient } from "viem";
import type { FixedFees } from "../config.js";
import type { Debug, Span } from "../debug.js";
import * as DebugMod from "../debug.js";
import { TransactionOutcomeUnknownError } from "../errors.js";
import type { SomniaTransactionReceipt } from "../native/receipt.js";
import * as Raise from "../raise.js";
import * as Revert from "../revert.js";
import * as TxSend from "../txSend.js";
import type { UnsignedCall } from "../writer.js";
import type { WriterRuntime } from "../writerRuntime.js";
import * as Boundary from "./boundary.js";
import * as Guard from "./guard.js";
import type { ExecuteOptions, Executed, Executor } from "./types.js";

/** What the local-signer executor is built from — all owner-bound (the client's chain, socket and nonce lane). */
export interface LocalSignerExecutorDeps {
  chain: Chain;
  publicClient: PublicClient;
  account: LocalAccount;
  fees: FixedFees;
  defaultGas: bigint;
  /**
   *  The OWNING ENGINE's writer runtime — its nonce lane (one per chain, never
   *  the module-level manager) and the per-actor ordering of local sends. Local
   *  nonce tracking belongs to the engine even when the account carries its own
   *  manager, so separate engines stay isolated.
   */
  runtime: WriterRuntime;
  /** The configured owner supplies a fresh lifecycle after stopLive(). */
  getReceiptSignal?: () => AbortSignal | undefined;
  dbg?: Debug;
}

/**
 *  Build the local-signer executor. Internal: `client.createTrader({ privateKey })`
 *  and `{ account }` construct one; `client.createExecutor({ privateKey })` hands
 *  one out for composition (a smart account's inner sender, for instance).
 *
 * @internal
 */
export function createLocalSignerExecutor(deps: LocalSignerExecutorDeps): Executor {
  const { chain, publicClient, account, fees, defaultGas, runtime } = deps;
  const nonceManager = runtime.nonceManager;
  const dbg = deps.dbg ?? DebugMod.makeDebug();
  const chainId = chain.id;
  const actor = account.address;

  // Whether the connected node exposes eth_sendRawTransactionSync.
  // Starts optimistic; flips to false the first time the node reports the method
  // as unavailable (e.g. a stock anvil / geth used for local dev + the bots),
  // after which we permanently take the standard eth_sendRawTransaction path.
  let syncSendSupported = true;

  async function signCall(call: UnsignedCall, gas: bigint, signal: AbortSignal | undefined): Promise<Hex> {
    const nonce = await nonceManager.consume({ address: actor, chainId, client: publicClient });
    try {
      signal?.throwIfAborted();
      return await account.signTransaction({
        type: "eip1559",
        chainId,
        to: call.to,
        data: call.data,
        gas,
        nonce,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        ...(call.value !== 0n ? { value: call.value } : {}),
      });
    } catch (error) {
      // The nonce is consumed but nothing was broadcast. The manager remembers it
      // as used and would hand out nonce + 1 next — a future nonce the node queues
      // behind a gap nothing ever fills. A signer can fail here (a remote KMS or
      // hardware account, a serialization error), so re-sync exactly as a
      // broadcast rejection does in `broadcast` — and surface it as the SDK
      // error the executor contract names, the signer's own kept as `cause`.
      nonceManager.reset({ address: actor, chainId });
      if (signal?.aborted && error === signal.reason) throw error;
      throw Boundary.asExecuteError(error, "signTransaction", { address: call.to, functionName: call.functionName });
    }
  }

  // Broadcast through the shared sync-with-fallback path (txSend.ts). The
  // probe result is cached (production never pays a probe per write), any real
  // rejection re-syncs the local nonce so the next write doesn't inherit a gap,
  // and the error is decoded so the caller gets the contract's error name.
  //
  // retryCount: 0 on both legs — see traderRetryStance.test.ts: a transport
  // retry re-submits identical signed bytes and turns a slow block into a
  // misleading nonce error, or a duplicate order for a bot that re-sends.
  async function broadcast(
    serialized: Hex,
    call: UnsignedCall,
    options: ExecuteOptions,
    signal: AbortSignal | undefined,
  ): Promise<SomniaTransactionReceipt> {
    // Per call: an approval that fails is reported as `approve` on the token,
    // not as the order it was gathered for.
    const context = { address: call.to, functionName: call.functionName ?? options.context?.functionName };
    return TxSend.broadcastSigned(publicClient, serialized, {
      label: "@somnia-chain/markets-sdk",
      signal,
      retryCount: 0,
      isSyncSendSupported: () => syncSendSupported,
      onSyncSendUnsupported: () => {
        syncSendSupported = false;
      },
      onRejected: () => nonceManager.reset({ address: actor, chainId }),
      decorateError: (e, method) => Revert.toSdkError(e, method, context),
      // The signed bytes may be on the node: report the hash, never a plain
      // RpcError a caller would retry into a second transaction.
      outcomeUnknown: (hash, operation, cause) =>
        new TransactionOutcomeUnknownError({ chainId, operation, hash }, { cause }),
      waitReceipt: (hash) => TxSend.waitReceiptViaHeads(publicClient, hash, { chainId, signal }),
    });
  }

  // One send at a time per actor on this engine: sign-then-broadcast is not
  // atomic, so two concurrent sends could otherwise reach the node out of nonce
  // order. The runtime serializes them across every trader derived from the
  // same engine, not just this executor.
  async function sendOne(
    call: UnsignedCall,
    options: ExecuteOptions,
    parent: Span | undefined,
    signal: AbortSignal | undefined,
  ): Promise<Executed> {
    return runtime.runLocalSend({ address: actor, chainId }, async () => {
      signal?.throwIfAborted();
      const gas = options.gas ?? defaultGas;
      const serialized = await dbg.span("trade.signCall", () => signCall(call, gas, signal), parent);
      let receipt: SomniaTransactionReceipt;
      try {
        receipt = await dbg.span("trade.broadcast", () => broadcast(serialized, call, options, signal), parent);
      } catch (error) {
        if (signal?.aborted && error === signal.reason) nonceManager.reset({ address: actor, chainId });
        throw error;
      }
      return TxSend.sentResult(receipt);
    });
  }

  return {
    chainId,
    actor,
    async execute(calls, options = {}) {
      const signal = deps.getReceiptSignal?.();
      Guard.assertCallsOnChain(chainId, calls);
      // A key cannot batch: each call is its own transaction, in order. A
      // rejected broadcast throws from `broadcast`; a MINED revert comes back as
      // a receipt, and that receipt ends the sequence — the calls behind it (an
      // order behind its approval) must not go out, and the writer throws it.
      let last: Executed | undefined;
      for (const call of calls) {
        last = await sendOne(call, options, options.parentSpan, signal);
        if (last.receipt.status === "reverted") return last;
      }
      // assertCallsOnChain rejected an empty list, so the loop ran at least once.
      return last ?? Raise.unreachable("execute ran no call");
    },
    signTypedData: async (typedData) => {
      try {
        return await account.signTypedData(typedData);
      } catch (e) {
        throw Boundary.asSignTypedDataError(e);
      }
    },
  };
}
