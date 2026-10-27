import { type Account, type Address, type Chain, type PublicClient, type WalletClient } from "viem";
import type { FixedFees } from "../config.js";
import type { Debug } from "../debug.js";
import type { Executor } from "./types.js";
/** What the wallet-client executor is built from. */
export interface WalletClientExecutorDeps {
    chain: Chain;
    publicClient: PublicClient;
    walletClient: WalletClient;
    /** The signing identity the wallet acts as (an Account, or a bare address the wallet holds). */
    from: Account | Address;
    fees: FixedFees;
    defaultGas: bigint;
    /** The configured owner supplies a fresh lifecycle after stopLive(). */
    getReceiptSignal?: () => AbortSignal | undefined;
    dbg?: Debug;
}
/**
 *  Build the wallet-client executor. Internal: `client.createTrader({ walletClient })`
 *  constructs one.
 *
 * @internal
 */
export declare function createWalletClientExecutor(deps: WalletClientExecutorDeps): Executor;
