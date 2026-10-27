import { type Account, type Address, type Hash, type Hex, type LocalAccount, type NonceManager, type PublicClient, type TransactionReceipt, type WalletClient } from "viem";
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
export declare function resolveSigner(config: SignerSources, label: string, opts?: {
    nonceManager?: NonceManager;
}): ResolvedSigner;
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
export declare function isMethodUnsupported(e: unknown): boolean;
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
export declare function isNodeRefusal(e: unknown): boolean;
/**
 *  True when the node answered `eth_sendRawTransactionSync` with a refusal: the
 *  Somnia mempool status that {@link isNodeRefusal} reads, or an EIP-7966 code
 *  `5` or `6`. Both codes are specific to this method, so only the sync leg reads
 *  them. An explicit timeout is never a refusal here either.
 */
export declare function isSyncSendRefusal(e: unknown): boolean;
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
export declare function broadcastSigned(client: Pick<PublicClient, "request">, serialized: Hex, opts: BroadcastSignedOptions): Promise<Receipt.SomniaTransactionReceipt>;
/**
 *  The `{ hash, receipt }` a write resolves with, from the receipt its send
 *  returned, plus `executionTimeMicros` when the node reported it. The one
 *  shape the executors and the machinery writer hand back.
 */
export declare function sentResult(receipt: Receipt.SomniaTransactionReceipt): {
    hash: Hash;
    receipt: TransactionReceipt;
    executionTimeMicros?: number;
};
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
export declare function waitReceiptViaHeads(publicClient: PublicClient, hash: Hash, { chainId, signal }: ReceiptWaitContext): Promise<TransactionReceipt>;
