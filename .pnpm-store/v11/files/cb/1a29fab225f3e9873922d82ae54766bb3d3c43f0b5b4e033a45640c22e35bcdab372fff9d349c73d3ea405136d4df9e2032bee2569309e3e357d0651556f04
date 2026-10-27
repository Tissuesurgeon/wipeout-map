import { SDK } from "@somnia-chain/reactivity";
import type { Address, Hex, WalletClient } from "viem";
import type { SomniaMarketsClient } from "../somniaMarketsClient.js";
export { 
/** The reactivity client. `SDK` is upstream's alias for the same class. */
Reactivity, SDK, 
/** ABI of the reactivity precompile (subscription lifecycle + system ticks). */
SomniaReactivityPrecompileABI, 
/** ABI of `ISomniaEventHandler` — the one function a handler contract exposes. */
SomniaEventHandlerABI, } from "@somnia-chain/reactivity";
export type { BlockTickSubscription, BlockTickSubscriptionRequest, EpochTickSubscriptionRequest, EthCall, RpcResponse, ScheduleRequest, SoliditySubscribeRequest, SoliditySubscriptionData, SoliditySubscriptionFilter, SoliditySubscriptionInfo, SoliditySubscriptionOptions, SubscriptionCallback, WebsocketSubscriptionInitParams, } from "@somnia-chain/reactivity";
/**
 *  The Somnia reactivity precompile — a privileged contract at the fixed address
 *  `0x…0100` on every Somnia network. Filter on it as the `emitter` to catch the
 *  precompile's own system ticks (`Schedule` / `BlockTick` / `EpochTick`).
 *
 *  It has NO bytecode, so `eth_getCode` returns `0x` for it — presence cannot be
 *  probed that way. Use {@link isLocalPrecompileUnavailable} on the chain id
 *  instead.
 *
 * @category reactivity
 */
export declare const SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS: Address;
/**
 *  Callback gas/fee options for a subscription that doesn't care: no tip, a
 *  20 gwei ceiling, 10M gas per callback. These are the protocol's own defaults
 *  (`SomniaExtensions.DEFAULT_*`), spelled out here because upstream's published
 *  build ships `defaultSubscriptionOptions` at runtime but leaves it out of its
 *  type declarations — a test pins these values against upstream's.
 *
 *  The precompile's own rules on these: `gasLimit` must be in `(0, 200_000_000]`,
 *  and a non-zero `maxFeePerGas` must sit at least 6 gwei above
 *  `priorityFeePerGas` (pass `0` to skip that check).
 *
 * @category reactivity
 */
export declare const DEFAULT_SUBSCRIPTION_OPTIONS: {
    readonly priorityFeePerGas: 0n;
    readonly maxFeePerGas: 20000000000n;
    readonly gasLimit: 10000000n;
};
/**
 *  One matched log plus the results of the subscription's `ethCalls`, both read at
 *  the same block — the thing a `somnia_watch` subscription exists to deliver.
 *
 *  Typed here because upstream types `onData` as `(data: any) => void`, so a
 *  caller gets no help at all; and because upstream's own `SubscriptionCallback`
 *  describes neither the envelope nor `address`. The shape below is what a live
 *  Shannon node actually sends (see test/reactivity.e2e.test.ts, which asserts
 *  it against the real chain).
 *
 * @category reactivity
 */
export interface ReactivityEvent {
    /** Contract that emitted the log. */
    address: Address;
    /** Topics of the matched log, topic0 first. */
    topics: Hex[];
    /** ABI-encoded non-indexed data of the matched log. */
    data: Hex;
    /** Raw return data of each `ethCall`, in the order subscribed. */
    simulationResults: Hex[];
}
/**
 *  What `watch`'s `onData` is actually called with.
 *
 *  NOTE the nesting: viem's WebSocket transport unwraps the JSON-RPC envelope
 *  before handing it over, so the payload is at **`notification.result`** — not
 *  `notification.params.result`, which upstream's README and type docs still
 *  describe (verified against a live node).
 *
 * **Example** (Reading a notification)
 *
 * ```ts
 * onData: (n: ReactivityNotification) => console.log(n.result.simulationResults)
 * ```
 *
 * @category reactivity
 */
export interface ReactivityNotification {
    /** The node's subscription id this notification belongs to. */
    subscription: string;
    /** The matched log + its atomic call results. */
    result: ReactivityEvent;
}
/**
 * Optional extras for {@link createReactivity}.
 *
 * @category reactivity
 */
export interface CreateReactivityOptions {
    /**
     *  Wallet client that signs the subscription writes; its account becomes the
     *  subscription OWNER and funds every callback. Omit for read-only /
     *  `watch`-only use. Its `chain` must be the engine's chain. A wallet with no
     *  `chain` is not checked: it sends on its current network.
     */
    wallet?: WalletClient;
}
/**
 *  Build a reactivity client on the markets client's own WebSocket — the socket
 *  is already open and already pointed at the right node, and `watch` needs a
 *  WebSocket transport.
 *
 * **Details**
 *
 * - `client`: The engine whose public client to use: `exchange.client` on a
 *   single-chain exchange, `exchange.engineFor(chainId)` on a multi-chain one.
 * - `opts`: Optional wallet client for the write methods.
 * - Returns: An upstream `SDK` instance — the full reactivity surface.
 *
 * **Gotchas**
 *
 * - Upstream sends every write on the wallet's chain. When `opts.wallet.chain`
 *   is set and is not the engine's chain, this throws before anything is sent.
 * - When `opts.wallet.chain` is unset, the chain is not checked. viem then sends
 *   on the wallet's current network, which the SDK cannot read synchronously.
 *
 * **Example** (Watching a contract event)
 *
 * ```ts
 * import { SomniaMarkets } from "@somnia-chain/markets-sdk";
 * import { createReactivity, unwrap } from "@somnia-chain/markets-sdk/reactivity";
 * import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
 *
 * const exchange = new SomniaMarkets({ chain: somniaShannon, wsRpcUrl, indexerUrl });
 * const reactivity = createReactivity(exchange.client);
 *
 * // Every Transfer on the collateral token, with the sender's new balance read
 * // at the very same block — one notification, no follow-up call.
 * const watch = unwrap(
 *   await reactivity.watch({
 *     eventContractSources: [collateral],
 *     topicOverrides: [transferTopic],
 *     ethCalls: [{ to: collateral, data: balanceOfCalldata }],
 *     onData: (n: ReactivityNotification) => console.log(n.result.simulationResults),
 *   }),
 * );
 * await watch.unsubscribe();
 * ```
 *
 * @throws {InvalidInputError} If `opts.wallet.chain` is set and is not the
 *  engine's chain. `chainIds` holds the engine's chain, then the wallet's.
 *
 * @category reactivity
 */
export declare function createReactivity(client: Pick<SomniaMarketsClient, "getViemClient" | "config">, opts?: CreateReactivityOptions): SDK;
/**
 *  Turn an upstream result into a value or a throw.
 *
 *  Every `@somnia-chain/reactivity` method resolves to `T | Error` rather than
 *  throwing — a shape a caller can forget to check, then treat a failure as a
 *  transaction hash. This SDK's contract is that failures throw
 *  (CONVENTIONS.md), so wrap upstream calls in `unwrap` to get that back.
 *
 * **Details**
 *
 * - `result`: Whatever an upstream reactivity method resolved to.
 * - Returns: `result`, narrowed to exclude `Error`.
 *
 * **Gotchas**
 *
 * - Throws The `Error` upstream returned, unchanged.
 *
 * **Example** (Unwrapping an upstream result)
 *
 * ```ts
 * import { unwrap } from "@somnia-chain/markets-sdk/reactivity";
 *
 * // Throws on a rejected subscription instead of returning an Error object.
 * const hash = unwrap(
 *   await reactivity.subscribe({ handlerContractAddress, filter: { emitter }, options }),
 * );
 * ```
 *
 * @category reactivity
 */
export declare function unwrap<T>(result: T | Error): T;
/**
 *  True when a chain id has no reactivity precompile — a local anvil/hardhat dev
 *  chain (31337 / 1337). Solidity subscriptions are testnet/mainnet only; check
 *  this first so a missing precompile reads as a clear precondition rather than an
 *  opaque revert.
 *
 * @category reactivity
 */
export { isLocalPrecompileUnavailable } from "../preflight.js";
