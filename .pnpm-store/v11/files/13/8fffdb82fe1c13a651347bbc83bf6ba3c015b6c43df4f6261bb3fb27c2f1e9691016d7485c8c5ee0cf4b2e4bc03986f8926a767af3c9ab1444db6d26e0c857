import { type Chain, type LocalAccount, type PublicClient } from "viem";
import type { FixedFees } from "../config.js";
import type { Debug } from "../debug.js";
import type { WriterRuntime } from "../writerRuntime.js";
import type { Executor } from "./types.js";
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
export declare function createLocalSignerExecutor(deps: LocalSignerExecutorDeps): Executor;
