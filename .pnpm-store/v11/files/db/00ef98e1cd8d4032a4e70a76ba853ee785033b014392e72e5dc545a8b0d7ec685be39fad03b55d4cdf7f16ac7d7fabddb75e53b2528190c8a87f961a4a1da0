import type { Address, PublicClient } from "viem";
import type { WriterRuntime } from "../writerRuntime.js";
import type { Executor, TypedDataSigner } from "./types.js";
/**
 *  The owner key that authorizes a smart account's transaction when the
 *  sending actor's presence is not authority enough — a sponsored send, or an
 *  account reached `through` parents.
 *
 *  **Details**
 *
 *  What the signer is asked to sign is the payload the accounts SDK prepares:
 *  the account's own Safe transaction when the signer owns it directly, or the
 *  outermost parent's `SafeMessage` envelope when `through` names a chain of
 *  accounts. Either way the payload binds the chain, so a wallet on the wrong
 *  network refuses it.
 *
 * @category trading
 */
export interface SmartAccountSigner {
    /**
     *  The address the signature must recover to: an owner of the account, or —
     *  with `through` — an owner of the OUTERMOST parent.
     */
    readonly address: Address;
    /** Signs the prepared EIP-712 payload as {@link SmartAccountSigner.address}. */
    readonly signTypedData: TypedDataSigner;
}
/** What the smart-account executor is built from. */
export interface SmartAccountExecutorDeps {
    /** The factory account — the actor every call runs as. */
    smartAccount: Address;
    /**
     *  Sends the OUTER transaction to the account. With no `signer` and no
     *  `through`, its `actor` must be a direct owner of the account and the
     *  account's threshold must be 1: the pre-validated signature is that one
     *  owner's approval and nothing else signs. With a signature in play, any
     *  funded actor may send.
     */
    inner: Executor;
    /**
     *  The parent accounts between the signer and the acting account, nearest
     *  first — the accounts SDK's borrowed-authority chain. Omit it (or pass
     *  `[]`) when the signer owns the account directly.
     */
    through?: readonly Address[];
    /**
     *  The owner key that signs. Omitted: with no `through`, the pre-validated
     *  path runs and nothing signs; with `through`, the inner executor's own
     *  `signTypedData` stands in (its actor must then own the outermost parent).
     */
    signer?: SmartAccountSigner;
    /**
     *  The owning engine's client, for the account's code read and the signed
     *  path's nonce read. Lazy: construction needs no chain transport, and the
     *  first execute reads through it.
     */
    getClient: () => PublicClient;
    /** The owning engine's writer runtime: its per-account signed-execute lane. */
    runtime: WriterRuntime;
}
/**
 *  Build the smart-account executor. Internal:
 *  `client.createExecutor({ smartAccount, inner })` hands one out.
 *
 * @internal
 */
export declare function createSmartAccountExecutor(deps: SmartAccountExecutorDeps): Executor;
