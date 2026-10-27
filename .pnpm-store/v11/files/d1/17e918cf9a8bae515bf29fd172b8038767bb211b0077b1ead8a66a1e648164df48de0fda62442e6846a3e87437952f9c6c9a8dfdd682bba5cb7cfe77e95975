import { type Abi, type Account, type Address, type Hex, type PublicClient, type WalletClient } from "viem";
import { type ClientConfig } from "./config.js";
import type { TxResult } from "./trade.js";
import * as WriterRuntime from "./writerRuntime.js";
/**
 *  Signer + read-client config shared by every machinery admin. Mirrors
 *  {@link OperatorAdminConfig} — pass a `walletClient`, a local `account`, or a
 *  `privateKey`.
 *
 * @category models
 */
export interface MachineryAdminConfig {
    /** A pre-built signer (e.g. a browser/wagmi wallet over an injected provider). */
    walletClient?: WalletClient;
    /** A local signing account (e.g. from viem's privateKeyToAccount). */
    account?: Account | Address;
    /** Private key — the SDK derives the account. */
    privateKey?: Hex;
    /** Read client for receipts. Defaults to the client's WebSocket client. */
    publicClient?: PublicClient;
    /** Default gas ceiling per tx. */
    gas?: bigint;
}
/**
 *  One machinery write: `to` + `abi` + function + args, optionally carrying
 *  native `value` (funding sends) and a per-call gas override. Omit
 *  `abi`/`functionName`/`args` for a bare native transfer (funding a contract's
 *  `receive()` — e.g. fundAdapter / fundMarketCreator), in which case `value`
 *  is required and the tx carries no calldata.
 */
export interface MachineryWriteCall {
    to: Address;
    abi?: Abi;
    functionName?: string;
    args?: readonly unknown[];
    value?: bigint;
    gas?: bigint;
}
/** The bound signer + a plain send-and-wait `execute`, built once per admin. */
export interface MachineryWriter {
    /** The resolved signer address (for ownership self-checks). */
    from: Account | Address;
    execute(w: MachineryWriteCall): Promise<TxResult>;
    publicClient: PublicClient;
}
/**
 *  Build the shared signer/executor from a machinery-admin config + the client's
 *  read deps. Throws {@link SignerRequiredError} when no signer is available.
 *  `label` names the admin in the error text.
 */
export declare function makeMachineryWriter(config: MachineryAdminConfig, deps: {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
    getReceiptSignal?: () => AbortSignal | undefined;
    writerRuntime?: WriterRuntime.WriterRuntime;
}, label: string): MachineryWriter;
