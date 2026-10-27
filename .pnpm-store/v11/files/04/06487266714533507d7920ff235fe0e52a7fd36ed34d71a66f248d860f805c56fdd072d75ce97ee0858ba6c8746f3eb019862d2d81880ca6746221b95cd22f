import { type Address, type Hex, type TransactionReceipt } from "viem";
import type { SomniaTransactionReceipt } from "./receipt.js";
import type { SessionTransactionRequest, SomniaBlock, SomniaBlockParam, SomniaChainStatistics, SomniaNodePublicKeys, SomniaReactivitySubscription } from "./types.js";
/**
 *  Anything that can make a JSON-RPC request — which every viem client is, and so
 *  is an injected EIP-1193 provider (`window.ethereum`) or a wagmi connector.
 *
 *  Typed structurally so this module never needs a viem client of its own: whatever
 *  you already have, hand it over.
 *
 * @category native RPC
 */
export interface NativeRpcRequester {
    /**
     *  Make a JSON-RPC request. The second argument is viem's per-request options —
     *  only `retryCount` is used, and only to stop a value-bearing session send from
     *  being retried (see `sendSessionTransaction`). A provider that ignores it is
     *  fine; the parameter is optional.
     */
    request(args: {
        method: string;
        params?: unknown;
    }, options?: {
        retryCount?: number;
    }): Promise<unknown>;
}
/**
 *  The Somnia-native RPC surface — the twelve methods in the public JSON-RPC
 *  reference. Build one with {@link createNative}.
 *
 *  Reads throw on failure and return `null` only where the node genuinely means
 *  "no such thing" — a missing block, an unknown subscription.
 *
 * @category native RPC
 */
export interface SomniaNative {
    /**
     *  Is the node ready to serve? `false` while it is still syncing.
     *
     * **Details**
     *
     * - `opts`: `withErrorCode: true` calls `somnia_isReadyWithErrorCode` instead, which **throws** on a not-ready node (`Is not ready`, JSON-RPC internal error) rather than returning `false` — that variant exists so a health check can key on the error. It never returns `false`.
     */
    isReady(opts?: {
        withErrorCode?: boolean;
    }): Promise<boolean>;
    /**
     *  A Somnia **ledger** block — richer than the Ethereum-compatible block, with the
     *  proposer, the committed data-chain blocks and the execution state snapshot.
     *
     *  Takes a tag (`"latest"`, `"earliest"`, `"pending"`, `"safe"`, `"finalized"`), a
     *  block number, **or** a 32-byte ledger block hash — dispatching to
     *  `somnia_getBlockByHash` for the last of those.
     */
    getBlock(block?: SomniaBlockParam | Hex): Promise<SomniaBlock | null>;
    /** Aggregate activity between two blocks, inclusive. */
    getStatistics(from: SomniaBlockParam, to: SomniaBlockParam): Promise<SomniaChainStatistics>;
    /**
     *  Receipts for the **privileged** (protocol-issued) transactions in a block —
     *  the ones no user submitted, e.g. reactivity callbacks. Usually empty.
     *
     *  Takes a tag, a number, or a 32-byte block hash, like {@link getBlock}.
     */
    listPrivilegedReceipts(block?: SomniaBlockParam | Hex): Promise<TransactionReceipt[]>;
    /** Ids of every reactivity subscription owned by an address. */
    listReactivitySubscriptionIds(owner: Address): Promise<bigint[]>;
    /** One reactivity subscription, or `null` when no subscription has that id. */
    getReactivitySubscription(id: bigint | number): Promise<SomniaReactivitySubscription | null>;
    /** Several reactivity subscriptions in one round-trip. Unknown ids are omitted. */
    listReactivitySubscriptions(ids: readonly (bigint | number)[]): Promise<SomniaReactivitySubscription[]>;
    /** The serving node's identity keys for the current epoch. */
    getNodePublicKeys(): Promise<SomniaNodePublicKeys>;
    /**
     *  The address a session seed controls, **as the node computes it**.
     *
     *  {@link sessionAddress} computes the same value locally with no round-trip;
     *  this is the way to confirm the node agrees.
     *
     *  Note the node creates its in-memory sender for the seed as a side effect.
     *
     * **Gotchas**
     *
     * - Throws `RpcError` when the node or the transport rejects the call. The seed is never in it. `cause` is the node's own `{ code, message, data? }` when the node answered (read it with {@link getSomniaRpcError}), or the transport's `{ name, message, status? }` with the request text blanked when it did not.
     */
    getSessionAddress(seed: Hex): Promise<Address>;
    /**
     *  Submit a transaction through a session and **wait for its receipt**.
     *
     *  The node derives the key from the seed, assigns the nonce, signs, submits and
     *  retries transient failures — so this one call replaces sign + send + poll. It
     *  does not return until the transaction has executed, which can take a while
     *  under retry; give the underlying transport a generous timeout.
     *
     *  Before using it, know four things:
     *  - **The seed is a private key.** Anyone with it controls the account.
     *  - **Pre-fund the account** ({@link sessionAddress}) or the transaction cannot pay gas.
     *  - **The nonce space is shared** with `eth_sendRawTransaction` from the same
     *    address. Sending both ways at once corrupts the sequence.
     *  - The session lives in the serving node's memory, so it is not shared between
     *    nodes and is rebuilt from the seed after a restart.
     *
     *  Sent with retries disabled: a retry would be a second transfer, not a second
     *  attempt at the same one.
     *
     *  The receipt carries `executionTimeMicros` when the node reports it: the
     *  node-side time from request to answer, in microseconds.
     *
     * **Gotchas**
     *
     * - Throws If the node returns no receipt.
     * - Throws `RpcError` when the node or the transport rejects the transaction (mempool errors arrive as JSON-RPC `-32000`; a node-side timeout as `timeout`). The seed is never in it. `cause` is the node's own `{ code, message, data? }` when the node answered (read it with {@link getSomniaRpcError}), or the transport's `{ name, message, status? }` with the request text blanked when it did not.
     */
    sendSessionTransaction(tx: SessionTransactionRequest): Promise<SomniaTransactionReceipt>;
    /**
     *  Call any `somnia_*` method directly — the escape hatch for an endpoint this
     *  module doesn't wrap: an operator-only one, one a newer node has added, or one
     *  the public reference omits.
     *
     *  Params go through untouched, so hex-encode quantities yourself.
     *
     *  ⚠️ Off the documented surface you are on your own, and not every undocumented
     *  endpoint is merely unstable — `somnia_getStorageDatabaseEntries` will make a
     *  node dump unbounded data for a large enough key list, and has taken a public
     *  testnet down. Know what a method does before reaching for it here.
     */
    request<T = unknown>(method: string, params?: unknown[]): Promise<T>;
}
/**
 *  Wrap any JSON-RPC client in the Somnia-native API.
 *
 * **Details**
 *
 * - `client`: Anything with an EIP-1193 `request` method.
 * - Returns: The {@link SomniaNative} surface.
 *
 * **Example** (Reading a native block)
 *
 * ```ts
 * import { createPublicClient, http } from "viem";
 * import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
 * import { createNative } from "@somnia-chain/markets-sdk/native";
 *
 * const client = createPublicClient({ chain: somniaShannon, transport: http() });
 * const native = createNative(client);
 *
 * const block = await native.getBlock("latest");
 * console.log(block?.consensusBlock.proposerAddress, block?.executionBlock.executionGasUsed);
 * ```
 *
 *  Works with the markets client too — `createNative(exchange.client.publicClient)` —
 *  and with a plain injected provider, since all it needs is `.request`.
 *
 * @category native RPC
 */
export declare function createNative(client: NativeRpcRequester): SomniaNative;
/**
 *  True when an error means "this node doesn't have that method".
 *
 *  These endpoints are node-version dependent, and a stock geth/anvil has none of
 *  them — so a UI that offers native features should degrade rather than break.
 *  Mirrors the same check the SDK's write path uses for `eth_sendRawTransactionSync`.
 *
 * **Details**
 *
 * - `error`: Whatever was thrown.
 *
 * **Example** (Handling an unsupported method)
 *
 * ```ts
 * import { createNative, isMethodNotFound } from "@somnia-chain/markets-sdk/native";
 *
 * const stats = await native.getStatistics("earliest", "latest").catch((e) => {
 *   if (isMethodNotFound(e)) return null; // not a Somnia node — hide the panel
 *   throw e;
 * });
 * ```
 *
 * @category native RPC
 */
export declare function isMethodNotFound(error: unknown): boolean;
/**
 *  True when an error means "that method is operator-only on this node" — the
 *  `{ code: -1, message: "unauthorized" }` a public endpoint returns for the
 *  protected methods.
 *
 *  Matches on the **message**, not the code, and that is deliberate: `-1` is the
 *  node's default error code, shared by at least `invalid range`, `could not load
 *  statistics` and `Block does not exist` (all confirmed live). Keying on the code
 *  would report a bad block range as an authorization failure.
 *
 * **Details**
 *
 * - `error`: Whatever was thrown.
 *
 * @category native RPC
 */
export declare function isUnauthorized(error: unknown): boolean;
