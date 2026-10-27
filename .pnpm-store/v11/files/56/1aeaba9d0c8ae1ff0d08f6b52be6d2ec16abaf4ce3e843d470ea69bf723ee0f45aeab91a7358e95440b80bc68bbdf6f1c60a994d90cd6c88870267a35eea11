import { type Account, type Address, type Hex, type LocalAccount, type PublicClient, type WalletClient } from "viem";
import type { ClientConfig } from "../config.js";
import type { Debug } from "../debug.js";
import type { SomniaNative } from "../native/client.js";
import type { WriterRuntime } from "../writerRuntime.js";
import type { SmartAccountSigner } from "./smartAccount.js";
import type { Executor } from "./types.js";
/**
 *  Which built-in executor to build, and the authority it acts with. One
 *  variant per actor kind; the engine supplies everything else.
 *
 *  - `{ privateKey }` / `{ account }` — the SDK signs locally and sends via
 *    `eth_sendRawTransactionSync` (the fast path).
 *  - `{ walletClient }` — an injected browser / wagmi signer sends; the SDK
 *    confirms off the socket.
 *  - `{ sessionSeed }` — a Somnia node-side session account; the node signs,
 *    submits and returns the receipt. The seed goes to the node with every
 *    write, so use it only for an account that holds gas dust. It cannot be
 *    the `inner` of a smart account.
 *  - `{ smartAccount, inner }` — a factory account from
 *    `@somnia-chain/accounts-sdk` is the actor; `inner` sends the outer
 *    transaction. Batching needs no configuration (the accounts SDK resolves
 *    its own MultiSend batcher), and `through` reaches an account owned by
 *    other accounts, at any depth.
 *
 *  **The smart-account variant needs an authorized `inner`.** With no
 *  `signer` and no `through`, the outer transaction carries a pre-validated
 *  signature for `inner.actor` — a direct owner of a threshold-1 account that
 *  sends its own transaction signs nothing. A `signer`, or a `through` chain
 *  of parent accounts, switches to a real signature the accounts SDK nests
 *  level by level. The chain must be one the accounts SDK covers, or the spec
 *  is refused at construction.
 *
 *  **An account's `inner` signs locally.** A smart-account spec whose `inner`
 *  was built by `{ sessionSeed }` is refused with
 *  {@link InvalidInputError}: that executor sends the seed to the node on every
 *  write, and behind an account the seed controls the account's funds. Build
 *  the inner with `{ privateKey }` instead. For a Somnia session seed, the key
 *  is `sessionPrivateKey(seed)`; across chains,
 *  `exchange.accounts.accountFor(accountId, index, { sessionSeed })` does this
 *  for you. A hand-written {@link Executor} that calls the session RPC itself
 *  is outside this check.
 *
 *  A private key and a session seed are validated on construction: 32 bytes of
 *  hex, or {@link InvalidInputError}. A spec names exactly ONE actor: an object
 *  that carries the selectors of two variants (a spread that merged a
 *  `privateKey` into a `smartAccount` spec, say) is refused with
 *  {@link InvalidInputError} rather than silently acting as one of them.
 *
 * @category trading
 */
export type ExecutorSpec = {
    privateKey: Hex;
} | {
    account: LocalAccount;
} | {
    walletClient: WalletClient;
    account?: Account | Address;
} | {
    sessionSeed: Hex;
} | {
    smartAccount: Address;
    inner: Executor;
    through?: readonly Address[];
    signer?: SmartAccountSigner;
};
/** What every built-in executor draws from its owning engine. */
export interface ExecutorFactoryDeps {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
    /** The current owner lifecycle, captured before each write starts. */
    getReceiptSignal?: () => AbortSignal | undefined;
    /** The `/native` client over the engine's socket, for session executors. */
    getNative: () => SomniaNative;
    /** The engine's own writer runtime: its nonce lane and local-send ordering. */
    writerRuntime: WriterRuntime;
    dbg?: Debug;
}
/**
 *  Build the executor a spec names, bound to the owning engine. Internal —
 *  reached as `client.createExecutor(spec)`.
 *
 * @internal
 */
export declare function createExecutorFromSpec(spec: ExecutorSpec, deps: ExecutorFactoryDeps): Executor;
