// `client.createExecutor(spec)`: the one owner-derived door to the built-in
// executors. Each one is bound to the owning engine's chain, socket, fee
// envelope and nonce lane (SDK-OWN-001) — the spec names only WHO acts
// (a key, a wallet, a session seed, a smart account), never infrastructure.

import { privateKeyToAccount } from "viem/accounts";
import {
  isHex,
  size,
  type Account,
  type Address,
  type Hex,
  type LocalAccount,
  type PublicClient,
  type WalletClient,
} from "viem";
import type { ClientConfig } from "../config.js";
import * as Config from "../config.js";
import type { Debug } from "../debug.js";
import { InvalidInputError } from "../errors.js";
import type { SomniaNative } from "../native/client.js";
import type { WriterRuntime } from "../writerRuntime.js";
import * as LocalExecutor from "./local.js";
import * as SessionExecutor from "./session.js";
import * as SmartAccountExecutor from "./smartAccount.js";
import type { SmartAccountSigner } from "./smartAccount.js";
import type { Executor } from "./types.js";
import * as WalletExecutor from "./wallet.js";

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
export type ExecutorSpec =
  | { privateKey: Hex }
  | { account: LocalAccount }
  | { walletClient: WalletClient; account?: Account | Address }
  | { sessionSeed: Hex }
  | {
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
 *  Derive the local account, turning viem's rejection of an invalid scalar (zero,
 *  or at/above the curve order — 32 bytes of hex that is still no key) into the
 *  {@link InvalidInputError} the factory's union names, the original as `cause`.
 */
function localAccountFrom(privateKey: Hex, nonceManager: WriterRuntime["nonceManager"]): LocalAccount {
  try {
    return privateKeyToAccount(privateKey, { nonceManager });
  } catch (e) {
    throw new InvalidInputError("privateKey is not a valid secp256k1 private key", { cause: e });
  }
}

/**
 *  Build the executor a spec names, bound to the owning engine. Internal —
 *  reached as `client.createExecutor(spec)`.
 *
 * @internal
 */
export function createExecutorFromSpec(spec: ExecutorSpec, deps: ExecutorFactoryDeps): Executor {
  const config = deps.getConfig();
  const chain = config.chain;
  const fees = config.fees ?? Config.DEFAULT_FEES;
  const defaultGas = Config.DEFAULT_GAS;
  // Both credentials are 32-byte hex. Checked HERE so a malformed one is an
  // InvalidInputError at the owner's door, not a raw viem / derivation error
  // from inside `privateKeyToAccount` or the session-key derivation.
  // Exactly one variant. The union is structural, so a merged object can carry
  // two selectors; picking one by precedence would transact as an actor the
  // caller did not mean. `account` alone is a variant; beside `walletClient`
  // it names the wallet's signing identity, so it does not count twice.
  const selectors: string[] = ["privateKey", "walletClient", "sessionSeed", "smartAccount"].filter((k) => k in spec);
  if ("account" in spec && !("walletClient" in spec)) selectors.push("account");
  if (selectors.length !== 1) {
    throw new InvalidInputError(
      `an executor spec names exactly one of privateKey / account / walletClient / sessionSeed / smartAccount (got ${selectors.length === 0 ? "none" : selectors.join(" + ")})`,
    );
  }
  // A node-side session executor sends its seed with every write. Behind an
  // account the seed controls the account's funds, so the inner must sign
  // locally.
  if ("smartAccount" in spec && SessionExecutor.isSessionKeyExecutor(spec.inner)) {
    throw new InvalidInputError(
      "an account's inner cannot be a createExecutor({ sessionSeed }) executor: it sends the seed to the node on every write. Sign locally with createExecutor({ privateKey: sessionPrivateKey(seed) }), or use exchange.accounts.accountFor(accountId, index, { sessionSeed })",
    );
  }
  const requireSecret = (value: Hex, what: string): Hex => {
    if (!isHex(value, { strict: true }) || size(value) !== 32) {
      throw new InvalidInputError(`${what} must be 32 bytes of hex`);
    }
    return value;
  };

  if ("smartAccount" in spec) {
    if (spec.inner.chainId !== chain.id) {
      throw new InvalidInputError(
        `the account's inner executor sends on chain ${spec.inner.chainId}, but this engine is chain ${chain.id}`,
      );
    }
    return SmartAccountExecutor.createSmartAccountExecutor({
      smartAccount: spec.smartAccount,
      inner: spec.inner,
      ...(spec.through !== undefined ? { through: spec.through } : {}),
      ...(spec.signer !== undefined ? { signer: spec.signer } : {}),
      // Lazy: a client with no chain transport still builds a smart-account
      // executor; its first execute reads the account's code through it.
      getClient: deps.getClient,
      runtime: deps.writerRuntime,
    });
  }
  if ("sessionSeed" in spec) {
    // The seed is checked BEFORE the transport is resolved, so a malformed
    // seed is InvalidInputError even on a client with no socket.
    const seed = requireSecret(spec.sessionSeed, "sessionSeed");
    return SessionExecutor.createSessionKeyExecutor({ chainId: chain.id, native: deps.getNative(), seed, defaultGas });
  }
  if ("walletClient" in spec) {
    const from = spec.account ?? spec.walletClient.account;
    if (!from) {
      throw new InvalidInputError(
        "a walletClient executor needs an account — pass `account` or a wallet client with one",
      );
    }
    return WalletExecutor.createWalletClientExecutor({
      chain,
      publicClient: deps.getClient(),
      walletClient: spec.walletClient,
      from,
      fees,
      defaultGas,
      getReceiptSignal: deps.getReceiptSignal ?? (() => deps.getConfig().signal),
      ...(deps.dbg ? { dbg: deps.dbg } : {}),
    });
  }
  const account: LocalAccount =
    "privateKey" in spec
      ? localAccountFrom(requireSecret(spec.privateKey, "privateKey"), deps.writerRuntime.nonceManager)
      : spec.account;
  return LocalExecutor.createLocalSignerExecutor({
    chain,
    publicClient: deps.getClient(),
    account,
    fees,
    defaultGas,
    runtime: deps.writerRuntime,
    getReceiptSignal: deps.getReceiptSignal ?? (() => deps.getConfig().signal),
    ...(deps.dbg ? { dbg: deps.dbg } : {}),
  });
}
