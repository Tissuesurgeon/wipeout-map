import { type Address, type Hex, type LogTopic, type Chain, type PublicClient, type WebSocketTransport } from "viem";
import * as WebSocket from "./webSocket.js";
import type { SomniaMarketsSocketFailure } from "./config.js";
/** Private root infrastructure; not part of the public client configuration. */
export type RpcInfrastructure = WebSocket.Infrastructure;
/** Chain client over the WebSocket transport, so `transport.subscribe` is typed.
 *  {@link makePublicClient} builds no other transport. */
export type SocketClient = PublicClient<WebSocketTransport, Chain>;
/**
 * Start the owner's shared socket dial and wait for it until `signal` aborts.
 * Abort ends only this wait. The dial stays owned by the connection, bounded by
 * its connect deadline and owner close, so a later request joins it. Its failure
 * is observed here and reaches a later joiner through that request's own path.
 */
export declare function prepareSocket(client: PublicClient, signal: AbortSignal): Promise<void>;
/**
 *  The two views of one chain connection: `decorated` for the SDK's own reads,
 *  `raw` for a caller who wants viem's semantics.
 *
 *  **Details**
 *
 *  Both ride ONE WebSocket. `decorated` is a spread copy of `raw` with the chain
 *  read methods wrapped, so it shares `raw`'s `transport` and `uid` and issues
 *  requests down the same socket. Handing out `raw` therefore costs no extra
 *  connection.
 *
 *  **Gotchas**
 *
 *  Which one a caller holds decides what a reverting read throws: `decorated`
 *  gives a typed {@link ContractRevertError}, `raw` gives viem's own error
 *  untouched. Every read INSIDE the SDK must go through `decorated` — see
 *  `createClient`'s `getClient()`, which is the only internal door.
 */
export interface OwnedViews {
    readonly client: SocketClient;
    observeFailure(observed: (failure: SomniaMarketsSocketFailure) => void): PublicClient;
}
export interface ChainClients {
    /** Undecorated viem client — viem's error contract, verbatim. */
    readonly raw: SocketClient;
    /** The SDK's client: chain reads rethrow as typed SDK errors. */
    readonly decorated: PublicClient;
    /** Private fully modeled action view; actual owned pairs always supply it. */
    readonly owned?: SocketClient;
    /** A private per-read view that reports only this view's owned member failures. */
    observeFailure?(observed: (failure: SomniaMarketsSocketFailure) => void): PublicClient;
    /** Resolve private views only for the factory's exact selected objects. */
    resolveOwnedViews?(selectedRaw: SocketClient, selectedDecorated: PublicClient): OwnedViews | undefined;
    /**
     *  Close this connection's socket.
     *
     *  Idempotent. After it, this pair's requests reject with viem's
     *  `SocketClosedError`. A socket still in its handshake is closed too. No
     *  other instance and no socket of the host app is affected: each pair owns
     *  its socket alone. See {@link makePublicClient}.
     */
    close(): void;
    /** The socket requests currently go to, as an opaque mark for {@link ChainClients.redial}. Never dials. */
    markSocket?(): ChainSocketMark | undefined;
    /**
     *  Retire the socket marked silent, if it is still current, so the next
     *  request dials a new one. A socket that was already replaced is left alone.
     */
    redial?(silentOn: ChainSocketMark | undefined): void;
}
/** Opaque identity of one chain socket. See {@link ChainClients.markSocket}. */
export type ChainSocketMark = object;
/**
 *  Build the WebSocket chain connection for a chain + RPC, in both views.
 *
 *  **Details**
 *
 *  Modeled chain read methods are wrapped on the `decorated` view so a failing
 *  read reaches callers as one of OUR typed errors — a decoded
 *  {@link ContractRevertError} when the contract rejected the call, an
 *  {@link RpcError} when the request never got an answer. This is the read-side
 *  counterpart of the write path's funnel in trade.ts, and doing it at the ONE
 *  place the client is constructed covers every chain read in the SDK (the
 *  concept modules' point reads, oracleHub.ts, system.ts, operatorReads.ts —
 *  ~83 call sites) without a wrap at each one.
 *
 *  Owned RPC operations do not retry automatically. An ordinary request takes
 *  at most 9 seconds including a cold connection: 4 seconds for the handshake,
 *  4 seconds for the response, and 1 second for a liveness probe on timeout.
 *  Subscription acknowledgements and unsubscriptions use the same deadlines.
 *  A failed subscription that may have been sent gets a separate 30-second lease to
 *  observe a late server ID, then up to 4 seconds to unsubscribe that ID. This also
 *  applies when a socket error arrives after sending but before acknowledgement.
 *  Each socket retains at most 64 cancellations, including cleanup in flight.
 *  Lease expiry, capacity exhaustion or failed cleanup retires that socket and
 *  delivers the cleanup error to its other pending operations/subscriptions.
 *  These cleanup bounds do not extend the original timeout or repeat its callback.
 *  Unsubscribe completes locally with a `result: true` response if the socket
 *  is already closed or closure cancels its pending release. Transport
 *  failures, including timeouts, still reject; live sockets return the wire response.
 *  `eth_getLogs` has a 30-second response deadline (35 seconds cold total).
 *  A timeout replaces the socket only when the probe also times out and no
 *  response arrives during the probe. Closing the owner cancels pending work.
 *  Exceptions from subscription failure callbacks and private observers are isolated after failure
 *  delivery, so they cannot interrupt other requests or owner cleanup.
 *
 *  Returns {@link ChainClients} rather than one client because the SDK owes
 *  callers an undecorated escape hatch (`client.getViemClient()`) that does not
 *  open a second socket. `raw` is that client; it is NOT for internal use.
 *
 *  **Gotchas**
 *
 *  Only the error's TYPE changes here, never the control flow. Chain reads keep
 *  throwing rather than returning `null` — see CONVENTIONS.md "Return + error
 *  contract". Modules that deliberately swallow a read (the `getErc20Decimals`
 *  fallback, for one) still catch and still fall back: a typed error is caught
 *  by the same `catch`.
 *
 *  The returned {@link ChainClients} owns a socket, so its {@link
 *  ChainClients.close} must run on dispose. A `raw` or `decorated` client kept
 *  past that call is stale: new RPC requests reject with viem's
 *  `SocketClosedError`, and it never opens a socket again. Ask the owner for
 *  the pair again instead of holding one across a dispose.
 */
export declare function makePublicClient(chain: Chain, wsRpcUrl: string, infrastructure?: RpcInfrastructure): ChainClients;
/**
 *  Decorates a public client so modeled chain reads reject with SDK errors.
 *
 *  **When to use**
 *
 *  Use to give a caller-supplied `config.publicClient` the same typed-error
 *  treatment {@link makePublicClient} builds in. Kept separate for exactly that
 *  case.
 *
 *  **Details**
 *
 *  FIVE methods are normalized: `readContract`, `call` and `multicall`, which
 *  execute contract calls, and `getBlockNumber` and `getBalance`, which do not.
 *  `getBalance` is the native balance read that pre-send checks depend on. The block pin is
 *  in the list because same-block reads such as `getMarginAccount`,
 *  `getAccountHealth`, `getPerpState`, and `getPerpFeedStatus` open with it and
 *  quote its result on every call below. A failure there fails the whole read.
 *  Leaving it out meant one leg of such a read threw a raw viem error while the
 *  rest threw typed ones.
 *
 *  Everything else on the client is untouched, so this stays a thin boundary
 *  rather than a re-implementation. A method not in that list still rejects with
 *  whatever viem throws.
 *
 *  Returns a NEW client and never mutates the argument. That matters because
 *  `createTrader({ publicClient })` passes an object the CALLER owns and may use
 *  elsewhere (a shared app-wide viem client, say) — decorating it in place would
 *  reach outside this SDK and change how that caller's own reads throw. A viem
 *  client is a plain `Object.prototype` object of data properties, so the spread
 *  copy is faithful; there are no accessors or symbol keys to lose.
 *
 *  **Gotchas**
 *
 *  Because it returns a new client, the return value is the decorated one — a
 *  caller that ignores it and keeps using the argument gets raw viem errors.
 *  Applying this twice is harmless: {@link Revert.toSdkError} returns an
 *  already-SDK error untouched, so a re-decorated client does not nest errors.
 */
export declare function withTypedReadErrors(client: PublicClient, ownedFailure?: (error: unknown) => SomniaMarketsSocketFailure | undefined, observed?: (failure: SomniaMarketsSocketFailure) => void): PublicClient;
/** Private joined genesis verification over one owned attempt. */
export type GenesisCheck = (observed?: (failure: SomniaMarketsSocketFailure) => void) => Promise<void>;
/**
 *  Build an owner's check that its RPC is not on a retired genesis of its chain.
 *
 *  Returns `undefined` for a chain id with no retired genesis, so those owners
 *  make no extra request. Otherwise the check reads block 1 once. A hash on the
 *  denylist throws {@link NotConfiguredError}. Any other hash passes and is
 *  kept, and so does a node that no longer serves block 1: a missing block is
 *  not evidence of a retired genesis. A refusal or a failed block read
 *  ({@link RpcError}) is not kept, so the next read checks again.
 */
export declare function makeGenesisCheck(chainId: number, client: PublicClient, observedClient?: (observed: (failure: SomniaMarketsSocketFailure) => void) => PublicClient): GenesisCheck | undefined;
/**
 *  Wrap a client (the viem client, or the `/native` surface) so every async
 *  method awaits `check` first. The check runs outside the wrapped method, so
 *  its typed error reaches the caller as it is. `watch*` methods and `extend`
 *  return synchronously and are left as they are.
 *
 *  Returns a new object and never mutates the argument (SDK-OWN-003).
 */
export declare function withGenesisCheck<T extends object>(client: T, check: () => Promise<void>): T;
/** The height and time the tail takes from a chain head. */
export interface ChainHead {
    number: bigint;
    timestamp: bigint;
}
/** Height and time from a `newHeads` frame — null unless BOTH arrive as hex
 *  quantities. All-or-nothing: a frame missing either field, or carrying one that
 *  is not hex or is the empty quantity `"0x"`, is rejected whole rather than
 *  half-read, because a head with only one of the two is no use to the tail.
 *  Total: a malformed frame is contained here, never thrown at the subscription
 *  callback.
 *  @internal Exported for tests. */
export declare function headOfFrame(result: unknown): ChainHead | null;
/**
 *  Subscribe to the logs a contract emits with `account` as an indexed argument, and
 *  call `onLog` for each. The returned function releases the streams.
 *
 *  **Details**
 *
 *  Three `eth_subscribe("logs")` filtered on `address` and on the account in topic 1,
 *  2 or 3, so the node sends only this account's events. Most MarginBank events that
 *  change an account name it in topic 1 (`PositionUpdated`, `Deposited`, `Withdrawn`,
 *  the collateral locks, fees and liquidations). Some name it later:
 *  `PositionTransferred` names the receiver in topic 2, and `AutoDeleveraged` the
 *  bankrupt account in topic 3. A filter matches one topic position, so each position
 *  is its own stream. `onLog` carries only the log's block, `null` when it names none,
 *  because a caller that gets one re-reads the state rather than folding the event.
 *  `onOpen` fires once, when the node has confirmed every stream: a change from then on
 *  reaches `onLog`.
 *
 *  **Gotchas**
 *
 *  Same release and failure rules as {@link subscribeChainHeads}: a release before
 *  the socket opens is applied on arrival, a released stream never calls back, and
 *  `onError` fires at most once, for the first stream that fails.
 */
export declare function subscribeAccountLogs(client: SocketClient, address: Address, account: Address, onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen?: () => void): () => void;
/**
 *  Subscribe to the ERC-20 `Transfer` events of `tokens` that send from or to any of
 *  `accounts`, and call `onLog` for each. The returned function releases both streams.
 *
 *  **Details**
 *
 *  Two `eth_subscribe("logs")` filtered on the token addresses: one with the accounts
 *  as the sender (topic 1), one with them as the receiver (topic 2). A transfer between
 *  two of the accounts arrives on both. `onLog` carries only the log's block, `null` when
 *  it names none, because a caller that gets one re-reads the balances rather than
 *  folding the event. `onOpen` fires once, when the node has confirmed both streams.
 *
 *  **Gotchas**
 *
 *  Same release and failure rules as {@link subscribeChainHeads}. `onError` fires at
 *  most once, for the first stream that fails; the caller releases both and subscribes
 *  again.
 */
export declare function subscribeTransferLogs(client: SocketClient, tokens: readonly Address[], accounts: readonly Address[], onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen?: () => void): () => void;
/**
 *  The MarginBank events that can move one side of a market's ADL queue: each changes a
 *  holder's position or equity. First those about the market's own pool, by the topic
 *  that names it. Then those that change an account's balance: a balance counts on every
 *  market the account holds, so they are followed for any account and any pool.
 *  Signatures as the deployed bank declares them. `accountLogsSubscription.test.ts` pins
 *  them to `indexer/abis/MarginBank.json`, and gives every other bank event the reason it
 *  is left out.
 */
export declare const ADL_QUEUE_EVENTS: {
    readonly poolInTopic2: readonly ["PositionUpdated(address,address,int128,uint128,int256,int256)", "AutoDeleveraged(address,address,address,int128,uint256)", "FundingSettled(address,address,int256)"];
    readonly poolInTopic3: readonly ["PositionTransferred(address,address,address,int128,uint256)", "ForcedSettled(address,address,address,int128,uint256,bool,bool)"];
    readonly anyAccount: readonly ["Deposited(address,uint256)", "Withdrawn(address,uint256)", "DepositedFor(address,address,uint256)", "AccountCredited(address,uint256,address)", "CreditReclaimed(address,uint256,address)", "MainFundedChild(address,address,uint256,uint256)", "FundedPrincipalReturned(address,address,uint256,uint256)", "CloseOutMarginSettled(address,address,uint256)"];
};
/**
 *  Subscribe to the MarginBank events that can move one side of `pool`'s ADL queue,
 *  whoever they are about, and call `onLog` for each. The returned function releases
 *  the streams.
 *
 *  **Details**
 *
 *  Three `eth_subscribe("logs")` filtered on `marginBank` and on the events in
 *  {@link ADL_QUEUE_EVENTS}: `PositionUpdated` (every fill, close and liquidation of a
 *  position), `AutoDeleveraged` and `FundingSettled` with the pool in topic 2;
 *  `PositionTransferred` (a liquidation takeover) and `ForcedSettled` (a wind-down)
 *  with the pool in topic 3; and, for any account and any pool, the events that
 *  change an account's balance: `Deposited`, `Withdrawn`, `DepositedFor` (an order's
 *  top-up, which names the pool that pulled it), `AccountCredited`, `CreditReclaimed`,
 *  `MainFundedChild`, `FundedPrincipalReturned` and `CloseOutMarginSettled` (a
 *  liquidation's payment to the bidders that take its positions). `onLog` carries only the log's
 *  block, `null` when it names none, because a caller that gets one re-reads its state
 *  rather than folding the event. `onOpen` fires once, when the node has confirmed
 *  every stream: a change from then on reaches `onLog`.
 *
 *  **Gotchas**
 *
 *  - Order placement and cancellation (`CollateralLocked`, `CollateralUnlocked`) are
 *    left out. Each one moves the order's margin out of the unlocked balance or back
 *    into it, so it moves the account's equity and its place in the queue, but the
 *    bank emits them several times a second. A change on another market (a trade,
 *    funding, fees) moves the account's equity too, and is not followed either. The
 *    caller sees both at its next read.
 *  - Same release and failure rules as {@link subscribeChainHeads}: a release before
 *    the socket opens is applied on arrival, a released stream never calls back, and
 *    `onError` fires at most once, for the first stream that fails.
 */
export declare function subscribeAdlQueueLogs(client: SocketClient, marginBank: Address, pool: Address, onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen?: () => void): () => void;
/** One `logs` subscription filter: the contracts, and the topics position by position. */
export interface LogFilter {
    readonly address: Address | Address[];
    /** Position by position: one topic, a list any of which matches, or `null` for any. */
    readonly topics: LogTopic[];
}
/** One log a `logs` subscription delivered. */
export interface ChainLog {
    /** The emitting contract, lower-case. */
    readonly address: string;
    readonly topics: readonly Hex[];
    readonly data: Hex;
    /** The block it is in; `null` for a pending log. */
    readonly blockNumber: bigint | null;
    /** Its position in the block; `null` for a pending log. */
    readonly logIndex: number | null;
    /** The transaction that emitted it; `null` for a pending log. */
    readonly transactionHash: Hex | null;
}
/** The log a `logs` subscription frame carries, or `undefined` when it carries none that reads. */
export declare function logOfFrame(frame: unknown): ChainLog | undefined;
/**
 *  Subscribe to the logs that match any of `filters`, and call `onLog` with each. The
 *  returned function releases every stream.
 *
 *  **Details**
 *
 *  One `eth_subscribe("logs")` per filter. `onLog` gets `undefined` for a frame whose
 *  log does not read, because a caller that cannot tell whether a log concerns it reads
 *  its state again rather than miss one. A log that matches two filters arrives twice.
 *  `onOpen` fires once, when the node has confirmed every stream: a log from then on
 *  reaches `onLog`.
 *
 *  **Gotchas**
 *
 *  Same release and failure rules as {@link subscribeChainHeads}: a release before the
 *  socket opens is applied on arrival, a released stream never calls back, and
 *  `onError` fires at most once, for the first stream that fails.
 */
export declare function subscribeLogs(client: SocketClient, filters: readonly LogFilter[], onLog: (log: ChainLog | undefined) => void, onError: () => void, onOpen?: () => void): () => void;
/**
 *  The logs that match any of `filters` from `fromBlock` to `toBlock`, both included, in
 *  chain order. A log that does not read is `undefined`, as {@link subscribeLogs} hands
 *  it over.
 *
 *  **Details**
 *
 *  One `eth_getLogs` per filter. A log that matches two filters is there twice. Rejects
 *  with `RpcError` when a read does not complete, for example over a range too wide
 *  for the node.
 */
export declare function readLogs(client: PublicClient, filters: readonly LogFilter[], fromBlock: bigint, toBlock: bigint): Promise<(ChainLog | undefined)[]>;
/** One `somnia_watch` subscription: the logs that trigger a push, and the calls it carries. */
export interface SomniaWatchRequest {
    /** The contracts whose logs trigger a push. */
    readonly address: readonly Address[];
    /** The topic filter, position by position. `null` matches any value. */
    readonly topics: readonly (Hex | null)[];
    /** The calls the node runs at the block of each matched log. `from` sends a call as that address. */
    readonly ethCalls: readonly {
        readonly from?: Address;
        readonly to: Address;
        readonly data: Hex;
    }[];
}
/**
 *  Subscribe to Somnia's `somnia_watch`: each log that matches `request` arrives with
 *  the results of `request.ethCalls`, which the node runs at that log's block. The
 *  returned function releases the subscription.
 *
 *  **Details**
 *
 *  `somnia_watch` is a Somnia node extension of `eth_subscribe`, so viem's typed
 *  `subscribe` does not accept it. The request goes through the transport's socket
 *  client, as viem's own `subscribe` sends `eth_subscribe`. `onResults` receives the
 *  call results in the order of `request.ethCalls`.
 *
 *  `onOpen` fires once, when the node confirms the subscription: a log from then on
 *  pushes. `onEnd` fires at most once. `rejected`: the node refused the subscription, as a node
 *  without the extension does, or a notification carried no call results. `lost`: the
 *  socket failed, before or after the subscription opened.
 *
 *  **Gotchas**
 *
 *  Same release rules as {@link subscribeChainHeads}: a release before the subscription
 *  opens is applied on arrival, and a released subscription never calls back.
 */
export declare function subscribeSomniaWatch(client: SocketClient, request: SomniaWatchRequest, onResults: (results: readonly Hex[]) => void, onEnd: (end: "rejected" | "lost") => void, onOpen: () => void): () => void;
/** Starts a `newHeads` stream and returns its release. See {@link subscribeChainHeads}. */
export type ChainHeadSubscriber = (onHead: (head: ChainHead | undefined) => void, onError: () => void) => () => void;
/**
 *  Subscribe to `newHeads`, delivering each pushed header already parsed. The
 *  returned function releases the stream.
 *
 *  **Details**
 *
 *  The head comes from the pushed frame itself. viem's `watchBlocks` answers a
 *  frame by re-fetching the very block it was handed, which costs a round-trip
 *  per block and returns nothing the frame did not already carry.
 *
 *  `onHead` receives `undefined` for a frame that could not be read. That is
 *  deliberately still a delivery: an unreadable frame proves the stream is alive,
 *  which is what the caller's stall detection needs to know.
 *
 *  **Gotchas**
 *
 *  The socket opens asynchronously, so a release can land before the subscription
 *  exists; it is remembered and applied on arrival. Every continuation is gated on
 *  that release (SDK-OWN-004) — a released stream never calls back, so a frame
 *  already queued cannot revive a stopped caller and a late rejection cannot fire
 *  at whatever replaced it.
 *
 *  `onError` fires AT MOST ONCE. A failed `eth_subscribe` reaches both the
 *  transport callback and the rejected promise, which is one failure arriving
 *  twice, not two failures; a caller that reconnects or notifies subscribers on
 *  it must not do so twice for the same dead stream.
 */
export declare function subscribeChainHeads(client: SocketClient, onHead: (head: ChainHead | undefined) => void, onError: () => void): () => void;
