// Shared raw-transaction plumbing for every SDK write surface — the ONE
// implementation of signer resolution, the eth_sendRawTransactionSync
// broadcast (with the eth_sendRawTransaction fallback), and the
// newHeads-subscription receipt wait. trade.ts (hot-path trading),
// chains/bridge/send.ts (one-off bridge steps) and machineryWriter.ts (admin +
// lend writes) all ride these; per-surface policy (nonce caching, probe
// caching, retry stance) stays at the call site via the options below.
//
// A LEAF on purpose: imports viem and the error vocabulary (errors.ts, itself
// import-free) only, so chains/bridge (which must stay import-light) and
// trade.ts can both reach it without layering cycles.

import {
  keccak256,
  type Account,
  type Address,
  type Hash,
  type Hex,
  type LocalAccount,
  type NonceManager,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
  type WatchBlockNumberParameters,
  type WebSocketTransport,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { RpcError, SignerRequiredError, TransactionOutcomeUnknownError } from "./errors.js";
import { getSomniaRpcError } from "./native/errors.js";
import * as Receipt from "./native/receipt.js";

/** The signer sources every SDK write surface accepts (trader, admins, lender). */
export interface SignerSources {
  /** A pre-built signer (e.g. a browser/wagmi wallet over an injected provider). */
  walletClient?: WalletClient;
  /** A local signing account (e.g. from viem's privateKeyToAccount). */
  account?: Account | Address;
  /** Private key — the SDK derives the account. */
  privateKey?: Hex;
}

/** What {@link resolveSigner} hands back — the two send paths plus the identity. */
export interface ResolvedSigner {
  /** Set when the SDK can sign locally (privateKey or a signing account). */
  localAccount: LocalAccount | undefined;
  /** The external signer, when one was provided. */
  walletClient: WalletClient | undefined;
  /** The signing identity — an Account, or a bare address for external signers. */
  from: Account | Address;
  /** `from` as a plain address. */
  fromAddress: Address;
}

/**
 *  Resolve a write surface's signer config into the two send paths. Two ways in:
 *    1. a privateKey / local account — the SDK signs locally (the fast path);
 *    2. an explicit walletClient (browser/wagmi over an injected provider).
 *  Throws {@link SignerRequiredError} (naming `label`, e.g. "createTrader")
 *  when neither is usable. `nonceManager` is threaded into a derived
 *  private-key account so the hot path can track nonces locally; surfaces that
 *  fetch the nonce per call omit it.
 */
export function resolveSigner(
  config: SignerSources,
  label: string,
  opts: { nonceManager?: NonceManager } = {},
): ResolvedSigner {
  let localAccount: LocalAccount | undefined;
  if (config.privateKey) {
    const accountOptions = opts.nonceManager ? { nonceManager: opts.nonceManager } : {};
    localAccount = privateKeyToAccount(config.privateKey, accountOptions);
  } else if (typeof config.account === "object" && "signTransaction" in config.account) {
    localAccount = config.account as LocalAccount;
  }
  const walletClient: WalletClient | undefined = config.walletClient;
  if (!localAccount && !walletClient) {
    throw new SignerRequiredError(label);
  }
  const resolved = localAccount ?? config.account ?? walletClient?.account;
  if (!resolved) {
    throw new SignerRequiredError(label);
  }
  const from: Account | Address = resolved;
  const fromAddress: Address = typeof from === "string" ? from : from.address;
  return { localAccount, walletClient, from, fromAddress };
}

/**
 *  True when an RPC error means "this node doesn't implement that method"
 *  (JSON-RPC -32601 Method not found; some nodes surface it as -32601 nested,
 *  others as an Invalid-params -32602 for the unknown method's args).
 *
 *  Deliberately WIDER than native/errors' probes: a send path treats "the node
 *  garbled the unknown method's params" as "no sync send here" and falls back,
 *  while the native module's `isMethodNotFound` must not read a genuine
 *  invalid-params error on a real somnia_* method as the method missing.
 */
export function isMethodUnsupported(e: unknown): boolean {
  const code =
    (e as { code?: number; cause?: { code?: number } })?.code ?? (e as { cause?: { code?: number } })?.cause?.code;
  if (code === -32601 || code === -32602) return true;
  const msg = ((e as { message?: string })?.message ?? "").toLowerCase();
  return msg.includes("method not found") || msg.includes("not supported") || msg.includes("does not exist");
}

// The raw request shape a broadcast rides. The PublicClient's typed schema does
// not cover every method sent here (the sync send, the failure-path lookups
// with per-call retry options), so the client's `request` is cast to this
// ONCE, here, instead of at every call site.
type RpcRequest = (
  args: { method: string; params: readonly unknown[] },
  options?: { retryCount?: number },
) => Promise<unknown>;

/** Per-surface knobs for {@link broadcastSigned} — see each consumer for its stance. */
export interface BroadcastSignedOptions {
  /** Error-message prefix, e.g. `"@somnia-chain/markets-sdk"` — names the surface. */
  label: string;
  /** Owner cancellation checked before either broadcast attempt. */
  signal?: AbortSignal;
  /**
   *  Transport retry count passed on BOTH send legs. `0` for a value-bearing
   *  one-shot (a send that was accepted but whose response was lost would be
   *  submitted AGAIN on retry — the second attempt then fails "nonce too low"
   *  at best). Leave unset to pass NO options and keep viem's default
   *  transport retries (trade.ts's current stance — the discrepancy is
   *  deliberate and visible at each call site).
   */
  retryCount?: number;
  /**
   *  Probe gate for the sync attempt (default: always try). trade.ts feeds
   *  its cached per-trader flag here so production never pays a probe per
   *  write; one-shot surfaces (bridge, machinery) probe per call.
   */
  isSyncSendSupported?: () => boolean;
  /** Fired once when the node reports the sync send as missing (cache the fallback). */
  onSyncSendUnsupported?: () => void;
  /**
   *  Fired on any REAL rejection — a sync-send error that isn't
   *  method-unsupported (including the returned-no-receipt throw), or any
   *  fallback-leg failure including the receipt wait. trade.ts re-syncs its
   *  local nonce here so the next write doesn't inherit a gap.
   */
  onRejected?: () => void;
  /** Receipt wait for the eth_sendRawTransaction fallback leg. */
  waitReceipt: (hash: Hash) => Promise<TransactionReceipt>;
  /**
   *  Map a real rejection into the surface's error vocabulary before it is
   *  thrown; `method` names the leg that failed (`eth_sendRawTransactionSync`
   *  or `eth_sendRawTransaction`). The trader decodes reverts to their Solidity
   *  error name here; surfaces that propagate raw transport errors omit it.
   */
  decorateError?: (e: unknown, method: string) => Error;
  /**
   *  Build the error for a send whose signed bytes may have reached the node
   *  while its answer was lost: a failure that {@link isNodeRefusal} (on the
   *  sync leg, {@link isSyncSendRefusal}) does not read as the node's refusal,
   *  or any receipt-wait failure after
   *  `eth_sendRawTransaction` returned a hash. `hash` is the signed
   *  transaction's hash; `operation` names the request whose answer was lost.
   *  Unset: such a failure goes through `decorateError` like any other.
   */
  outcomeUnknown?: (hash: Hash, operation: string, cause: unknown) => Error;
}

/** A timeout answer: the node's own ceiling (`timeout`) or a gateway's "timed out". */
const TIMEOUT_TEXT = /time(d)? ?out/i;

/**
 *  True when the node ANSWERED the request with a JSON-RPC error that refuses
 *  the transaction, so it was not accepted.
 *
 *  Decided by the mempool status byte the node puts in `data`, NOT by the error
 *  text: every `SomniaMempoolStatus` value is a rejection verdict (there is
 *  no timeout among them), so a decoded status is positive proof the node refused
 *  the transaction. Its absence proves nothing — the node reports EVERY mempool
 *  verdict as `-32000`, including the 30s node-side ceiling, so a timeout and a
 *  refusal are indistinguishable by code alone and a timeout whose wording does
 *  not happen to say "timed out" would otherwise read as a refusal and invite a
 *  duplicate write.
 *
 *  Errs toward "may have landed" (false): a timeout, a dropped socket, an HTTP
 *  failure, and any answer carrying no mempool status. A false "refused" invites
 *  a second send; a false "may have landed" costs one lookup.
 */
export function isNodeRefusal(e: unknown): boolean {
  // Belt and braces: an explicit timeout is never a refusal, whatever `data` says.
  if (mentionsTimeout(e)) return false;
  return getSomniaRpcError(e)?.mempoolStatus != null;
}

/**
 *  The EIP-7966 error codes that say the node did NOT add the transaction to its
 *  mempool: `5` (not ready for execution) and `6` (nonce gap). Code `4` (Timeout)
 *  is not in the set on purpose. That transaction was added and can still mine.
 */
const SYNC_SEND_REFUSAL_CODES: ReadonlySet<number> = new Set([5, 6]);

/**
 *  True when the node answered `eth_sendRawTransactionSync` with a refusal: the
 *  Somnia mempool status that {@link isNodeRefusal} reads, or an EIP-7966 code
 *  `5` or `6`. Both codes are specific to this method, so only the sync leg reads
 *  them. An explicit timeout is never a refusal here either.
 */
export function isSyncSendRefusal(e: unknown): boolean {
  if (isNodeRefusal(e)) return true;
  if (mentionsTimeout(e)) return false;
  const answer = getSomniaRpcError(e);
  return answer !== null && SYNC_SEND_REFUSAL_CODES.has(answer.code);
}

/** True when any link of the cause chain says "timeout" in its `message` or `details`. */
function mentionsTimeout(e: unknown): boolean {
  let node: unknown = e;
  // Bounded: a cause chain is a few links deep, and a cycle must not hang us.
  for (let depth = 0; node !== null && typeof node === "object" && depth < 16; depth++) {
    const { message, details, cause } = node as { message?: unknown; details?: unknown; cause?: unknown };
    if ([message, details].some((text) => typeof text === "string" && TIMEOUT_TEXT.test(text))) return true;
    if (cause === node) break;
    node = cause;
  }
  return false;
}

/**
 *  One lookup of a transaction whose send answer was lost: its receipt when it
 *  mined, `"pending"` when the node knows it but it has not mined, `undefined`
 *  when the node does not know it or the lookup itself failed. One attempt per
 *  read and no transport retries, because this runs on a failure path.
 */
async function lookUp(request: RpcRequest, hash: Hash): Promise<TransactionReceipt | "pending" | undefined> {
  try {
    const receipt = await request({ method: "eth_getTransactionReceipt", params: [hash] }, { retryCount: 0 });
    if (receipt != null) return Receipt.formatSomniaReceipt(receipt);
    const tx = await request({ method: "eth_getTransactionByHash", params: [hash] }, { retryCount: 0 });
    return tx != null ? "pending" : undefined;
  } catch {
    // ponytail: a failed lookup proves nothing either way; the send's own error decides.
    return undefined;
  }
}

/**
 *  Broadcast a signed tx. Fast path: `eth_sendRawTransactionSync` (EIP-7966;
 *  Somnia's older name for it is `realtime_sendRawTransaction`), which blocks
 *  server-side until the receipt is available and returns it
 *  (with logs) in ONE round-trip — no client-side confirm. Fallback: a
 *  standard node (anvil, stock geth) that lacks the method →
 *  `eth_sendRawTransaction` + `waitReceipt`, so the same code runs everywhere.
 *
 *  When the sync answer is lost or refused, one lookup by hash runs before
 *  anything is thrown: a mined tx resolves with its receipt. A failure after
 *  the bytes may have left goes to `outcomeUnknown` when the surface sets it.
 *
 *  Only the sync answer carries the node's `executionTimeMicros`; a receipt
 *  from the fallback leg or the lookup has none.
 */
export async function broadcastSigned(
  client: Pick<PublicClient, "request">,
  serialized: Hex,
  opts: BroadcastSignedOptions,
): Promise<Receipt.SomniaTransactionReceipt> {
  const request = client.request as RpcRequest;
  const send = (method: string): Promise<unknown> =>
    opts.retryCount === undefined
      ? request({ method, params: [serialized] })
      : request({ method, params: [serialized] }, { retryCount: opts.retryCount });

  const hash = keccak256(serialized);
  /**
   *  The error for a failure after the bytes left. `accepted`: the node already
   *  took the transaction, so only its receipt is missing.
   */
  const failed = (e: unknown, method: string, accepted: boolean, refusal = isNodeRefusal): unknown => {
    opts.onRejected?.();
    if (e instanceof TransactionOutcomeUnknownError) return e;
    if (opts.outcomeUnknown && (accepted || !refusal(e))) return opts.outcomeUnknown(hash, method, e);
    return opts.decorateError ? opts.decorateError(e, method) : e;
  };

  opts.signal?.throwIfAborted();
  if (opts.isSyncSendSupported?.() ?? true) {
    try {
      const raw = await send("eth_sendRawTransactionSync");
      if (raw == null) throw new Error(`${opts.label}: eth_sendRawTransactionSync returned no receipt`);
      return Receipt.formatSomniaReceipt(raw);
    } catch (e) {
      if (!isMethodUnsupported(e)) {
        // The answer was lost or refused. Ask the node once where the tx
        // stands before reporting: a receipt means it mined, so the write
        // succeeded; a pending tx means the node accepted it.
        const found = await lookUp(request, hash);
        if (found !== undefined && found !== "pending") return found;
        throw failed(e, "eth_sendRawTransactionSync", found === "pending", isSyncSendRefusal);
      }
      // Node lacks eth_sendRawTransactionSync. The tx was never accepted, so
      // any locally-tracked nonce is still valid; re-send it below.
      opts.onSyncSendUnsupported?.();
    }
  }
  opts.signal?.throwIfAborted();
  let sent: Hash;
  try {
    sent = (await send("eth_sendRawTransaction")) as Hash;
  } catch (e) {
    throw failed(e, "eth_sendRawTransaction", false);
  }
  try {
    return await opts.waitReceipt(sent);
  } catch (e) {
    // The node returned the hash, so it accepted the tx: only the receipt is missing.
    throw failed(e, "waitForTransactionReceipt", true);
  }
}

/**
 *  The `{ hash, receipt }` a write resolves with, from the receipt its send
 *  returned, plus `executionTimeMicros` when the node reported it. The one
 *  shape the executors and the machinery writer hand back.
 */
export function sentResult(receipt: Receipt.SomniaTransactionReceipt): {
  hash: Hash;
  receipt: TransactionReceipt;
  executionTimeMicros?: number;
} {
  const { executionTimeMicros } = receipt;
  const hash = receipt.transactionHash;
  return executionTimeMicros === undefined ? { hash, receipt } : { hash, receipt, executionTimeMicros };
}

/**
 *  How many receipt reads in a row may FAIL (not "not found yet" — fail) before
 *  the wait gives up. One dropped request should not abort a confirm whose tx is
 *  on chain; a node that cannot answer at all must not leave it pending forever.
 */
const MAX_CONSECUTIVE_RECEIPT_READ_FAILURES = 3;

/** viem's "no receipt yet" — the normal answer while a tx is pending, not a failure. */
function isReceiptNotFound(e: unknown): boolean {
  // By name, not instanceof: two copies of viem in one tree have bitten this repo.
  return (e as { name?: string })?.name === "TransactionReceiptNotFoundError";
}

/** Confirmation defaults: one idle probe per second and a total one-minute wait. */
const RECEIPT_IDLE_PROBE_MS = 1_000;
const RECEIPT_WAIT_TIMEOUT_MS = 60_000;

/** Internal confirmation context supplied by the configured owner. */
export interface ReceiptWaitContext {
  chainId: number;
  signal?: AbortSignal;
}

/**
 * Confirm an accepted transaction through immediate/head reads and idle probes.
 * The total deadline starts before the first read, so an unresolved RPC cannot
 * hold the caller's send lane forever. At most one receipt read is in flight.
 * Termination without a receipt preserves the hash and uncertainty at this
 * shared boundary, including machinery callers without executor decoration.
 */
export function waitReceiptViaHeads(
  publicClient: PublicClient,
  hash: Hash,
  { chainId, signal }: ReceiptWaitContext,
): Promise<TransactionReceipt> {
  return new Promise<TransactionReceipt>((resolve, reject) => {
    let settled = false;
    let reading = false;
    let subscribed = false;
    let subscribing = false;
    let deferredFinish: { receipt: TransactionReceipt | undefined; cause: unknown } | undefined;
    let consecutiveFailures = 0;
    let unwatch: (() => void) | undefined;
    let probe: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;

    const unknownOutcome = (cause: unknown): TransactionOutcomeUnknownError =>
      cause instanceof TransactionOutcomeUnknownError
        ? cause
        : new TransactionOutcomeUnknownError({ chainId, operation: "waitForTransactionReceipt", hash }, { cause });
    const finish = (receipt: TransactionReceipt | undefined, cause?: unknown): void => {
      if (settled) return;
      if (subscribing) {
        deferredFinish ??= { receipt, cause };
        return;
      }
      settled = true;
      clearTimeout(deadline);
      clearTimeout(probe);
      signal?.removeEventListener("abort", abort);
      try {
        unwatch?.();
      } catch (cleanupError) {
        // Keep a primary failure; cleanup failure must also remain inspectable.
        const evidence = cause === undefined ? cleanupError : new AggregateError([cause, cleanupError]);
        reject(unknownOutcome(evidence));
        return;
      }
      if (receipt) resolve(receipt);
      else reject(unknownOutcome(cause));
    };
    const abort = (): void => finish(undefined, signal?.reason);
    const scheduleProbe = (): void => {
      if (settled) return;
      clearTimeout(probe);
      probe = setTimeout(() => void check(), RECEIPT_IDLE_PROBE_MS);
    };
    const subscribe = (): void => {
      subscribed = true;
      subscribing = true;
      try {
        // PublicClient erases the WS transport. viem accepts poll:false at this
        // runtime seam; its generic parameter still describes both transports.
        const watch = publicClient.watchBlockNumber as (
          options: WatchBlockNumberParameters<WebSocketTransport>,
        ) => () => void;
        unwatch = watch.call(publicClient, {
          poll: false,
          onBlockNumber: () => void check(),
          onError: (error: Error) => finish(undefined, error),
        });
      } catch (error) {
        deferredFinish ??= { receipt: undefined, cause: error };
      } finally {
        subscribing = false;
      }
      // Delay a synchronous callback until the returned handle can be cleaned.
      if (deferredFinish) {
        finish(deferredFinish.receipt, deferredFinish.cause);
        return;
      }
      // Cover mining between the initial read and subscription setup.
      void check();
    };
    const check = async (): Promise<void> => {
      if (settled || reading) return;
      reading = true;
      clearTimeout(probe);
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash });
        if (settled) return;
        finish(receipt);
        return;
      } catch (error) {
        if (settled) return;
        if (isReceiptNotFound(error)) consecutiveFailures = 0;
        else {
          consecutiveFailures += 1;
          if (consecutiveFailures >= MAX_CONSECUTIVE_RECEIPT_READ_FAILURES) {
            finish(
              undefined,
              new RpcError("eth_getTransactionReceipt", "three consecutive receipt reads failed", {
                cause: error,
              }),
            );
            return;
          }
        }
      } finally {
        reading = false;
      }
      if (settled) return;
      if (!subscribed) subscribe();
      else scheduleProbe();
    };

    // Install both termination paths before any RPC, including the first one.
    deadline = setTimeout(
      () =>
        finish(
          undefined,
          new RpcError("waitForTransactionReceipt", `receipt was not observed within ${RECEIPT_WAIT_TIMEOUT_MS}ms`),
        ),
      RECEIPT_WAIT_TIMEOUT_MS,
    );
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    else void check();
  });
}
