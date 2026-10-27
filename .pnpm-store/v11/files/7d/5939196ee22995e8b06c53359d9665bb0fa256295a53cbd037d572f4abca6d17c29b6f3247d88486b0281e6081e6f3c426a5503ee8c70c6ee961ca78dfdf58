import type { SomniaMarketsSocketFailure } from "./config.js";
import { type Account, type Address, type Hash, type Hex, type PublicClient, type TransactionReceipt, type WalletClient } from "viem";
import type { UnsignedCall, UnsignedOrder } from "./writer.js";
import type { Executor, ExecutorExecuteError } from "./executor/types.js";
import * as Fees from "./fees.js";
import type { UnsignedMarginDeposit } from "./perp/margin.js";
import type { UnsignedPerpStopOrder } from "./perp/stops.js";
import type { ClientConfig } from "./config.js";
import type { Debug } from "./debug.js";
import type { WriterRuntime } from "./writerRuntime.js";
import type { InvalidInputError, NotConfiguredError, RpcError, SignerRequiredError } from "./errors.js";
import type { BinarySide, LiveOrder } from "./store.js";
/**
 *  Signer + defaults for `client.createTrader` — how a {@link Trader} signs and
 *  sends. Provide one source of authority: an `executor` (any {@link Executor},
 *  built-in or your own), or the signer sugar that builds the matching built-in —
 *  `privateKey`, a local `account`, or a `walletClient`.
 *
 * @category trading
 */
export interface TraderConfig {
    /**
     *  Who signs and sends: any {@link Executor} — the built-ins from
     *  `client.createExecutor(...)` (a private key, a wallet, a session key, a
     *  smart account) or your own. When set, `privateKey` / `account` / `walletClient`
     *  are ignored for sending; the writer reads allowances and operator grants
     *  for `executor.actor`. When unset, the three signer fields below build the
     *  matching built-in executor, so existing callers change nothing.
     *
     *  **Gotchas**
     *
     *  Must send on this client's chain — a mismatch throws
     *  {@link InvalidInputError} at `createTrader`. Verbs that SIGN rather than
     *  send (`signRedeemAuth`) need an executor with `signTypedData`; a safe or a
     *  session key has none, and those verbs throw {@link SignerRequiredError}.
     *
     *  **Ownership.** An executor supplies signing and submission ONLY. The
     *  trader keeps its owner's chain, reads (allowances, operator grants and
     *  revert replays all go through the owner's client), deployments and
     *  lifecycle, and the built-ins from `client.createExecutor` are themselves
     *  owner-derived. A custom executor owning its own submission path is the
     *  point of the seam (a safe, a bundler, a relayer, custody); that deviation
     *  from SDK-OWN-001 / SDK-OWN-002 is recorded in the seam's proposal.
     */
    executor?: Executor;
    /**
     *  A pre-built signer (e.g. a browser/wagmi wallet over an injected provider).
     *  Only needed when the SDK can't sign locally — with `privateKey` / a local
     *  `account`, the SDK signs itself and sends over the client's WebSocket via
     *  eth_sendRawTransactionSync (send + confirm in one round-trip).
     */
    walletClient?: WalletClient;
    /** A local signing account (e.g. from viem's privateKeyToAccount). */
    account?: Account | Address;
    /** Private key — the SDK derives the account. */
    privateKey?: `0x${string}`;
    /** Read client for allowance/receipts. Defaults to the client's WebSocket client. */
    publicClient?: PublicClient;
    /** Scale for the testnet faucet's default amount (6 if unset). Order inputs use raw units; convert them with the selected market's `quoteDecimals`. */
    decimals?: number;
    /**
     *  Default gas ceiling per tx (10,000,000 when unset); each write can override
     *  per-call via its params' `gas`.
     */
    gas?: bigint;
}
/**
 * Base result of a confirmed write — the SDK waits for the receipt before resolving.
 *
 * @category trading
 */
export interface TxResult {
    /** The transaction hash. */
    hash: Hash;
    /** The mined receipt (status, gas used, logs). */
    receipt: TransactionReceipt;
    /**
     *  Node-side end-to-end time of the write in microseconds: from the node
     *  receiving the send to its answer, which covers mempool, finality and
     *  execution inside Somnia. Set when the node reports it with the receipt
     *  (`eth_sendRawTransactionSync` and session sends on a current Somnia node,
     *  or an executor that passes it through). Absent on an older node, on the
     *  `eth_sendRawTransaction` fallback, and for a wallet-client send. For a
     *  write with prerequisites (an approval first), it times the last
     *  transaction only.
     */
    executionTimeMicros?: number;
}
/**
 * A single fill that occurred within a tx (decoded from the pool's OrderFilled).
 *
 * @category trading
 */
export interface OrderFill {
    /** On-chain id of the taker (incoming) order. */
    takerOrderId: bigint;
    /** On-chain id of the maker (resting) order that matched. */
    makerOrderId: bigint;
    /** Quantity exchanged in this fill, raw units (outcome tokens on binary, base on spot). */
    quantityFilled: bigint;
    /** Taker order's quantity still unfilled after this fill, raw units. */
    takerRemainingQuantity: bigint;
    /** Maker order's quantity still resting after this fill, raw units. */
    makerRemainingQuantity: bigint;
    /**
     *  Fill price — the YES price on a binary pool (raw collateral units per whole
     *  outcome token); raw quote units per whole base on a spot pool.
     */
    fillPrice: bigint;
}
/** Result of placing an order: the confirmed tx plus what it did on the book. */
/**
 * {@link Trader.placeSpotStopOrder}'s result: the tx plus the registry id.
 *
 * @category trading
 */
export interface PlaceStopOrderResult extends TxResult {
    /**
     *  The pending order's id on the registry (from `PendingOrderCreated`) —
     *  pass to {@link Trader.cancelStopOrder}. Undefined only if the event
     *  wasn't found in the receipt (an ABI/deployment drift, not a normal path).
     */
    stopOrderId?: bigint;
}
/**
 *  {@link Trader.placePerpStopOrder}'s result: the tx plus the registry id(s).
 *
 *  Both ids come from `PendingOrderCreated`, because the function's return value is
 *  unreadable from a receipt.
 *
 * @category trading
 */
export interface PlacePerpStopOrderResult extends TxResult {
    /**
     *  The id of the leg described by the call's own top-level fields — pass to
     *  {@link Trader.cancelPerpStopOrder}. Undefined only if the event wasn't found in
     *  the receipt (an ABI/deployment drift, not a normal path).
     */
    stopOrderId?: bigint;
    /**
     * The `pair` leg's id, when one was placed. Undefined for a single stop.
     *
     * @category trading
     */
    pairedStopOrderId?: bigint;
}
export interface PlaceOrderResult extends TxResult {
    /** The resting order's on-chain id, if the order rested (OrderPlaced emitted). */
    orderId?: bigint;
    /** Fills that executed in this tx (empty for a cleanly-resting limit order). */
    fills: OrderFill[];
}
/**
 *  Inputs to {@link Trader.placeOrder} — a binary YES/NO limit or market order
 *  on a BinaryPool.
 *
 * @category trading
 */
export interface PlaceOrderParams {
    /** BinaryPool address. */
    pool: Address;
    /**
     *  Side + outcome ("BUY_YES" | "SELL_YES" | "BUY_NO" | "SELL_NO") — mapped onto
     *  the pool's OrderKind enum. Buys escrow collateral, sells escrow outcome tokens.
     */
    side: BinarySide;
    /** YES limit price as raw collateral units per whole outcome token (price × 10^decimals). */
    price: bigint;
    /** Outcome-token quantity, raw units. */
    quantity: bigint;
    /**
     *  Outcome-token singleton + this pool's YES/NO ids. Resolved from the pool
     *  (IBinaryPool.outcomeToken/yesId/noId) if omitted.
     */
    outcomeToken?: Address;
    /** This pool's YES position id on the singleton; resolved from the pool if omitted. */
    yesId?: bigint;
    /** This pool's NO position id on the singleton; resolved from the pool if omitted. */
    noId?: bigint;
    /** Collateral (buy-side escrow) token; resolved from the pool if omitted. */
    collateral?: Address;
    /**
     *  Order expiry in ns. Defaults to the POOL'S MARKET EXPIRY, not to a far
     *  future — a binary order must satisfy `0 < expireNs <= pool.marketExpiryNs`
     *  or the pool rejects it with `OrderExpiryBeyondMarket`, which keeps the book
     *  drainable by the expiry sweeps once the market locks.
     *
     *  So an order left to default stops resting when its market expires. On a
     *  rolling series that is hours, not decades. There is no GTC here; ~50y is
     *  the spot and perp default, where there is no market expiry to outlive.
     *
     *  A value already in the past reverts (`OrderAlreadyExpired`) — a deliberate
     *  choice is honoured verbatim rather than silently clamped.
     */
    expireTimestampNs?: bigint;
    /**
     *  OrderBook OrderType (see {@link ORDER_TYPE}): 0 NormalOrder (rest), 1 FillOrKill,
     *  2 ImmediateOrCancel, 3 PostOnly. Defaults to 0. A market order is an IOC (2)
     *  placed at the price extreme so it crosses immediately and cancels the remainder.
     */
    orderType?: number;
    /**
     *  Self-match behaviour when this order crosses your OWN resting order, default
     *  0 (`CANCEL_TAKER`). See {@link SELF_MATCHING_OPTION}.
     */
    selfMatchingOption?: number;
    /** Approve the escrow token to the pool if allowance is short (default true). */
    autoApprove?: boolean;
    /**
     *  Routing/builder frontend address to attribute the order to. Requires the
     *  trader to have opted this builder in via {@link Trader.approveBuilder}.
     *  Omit (or zero) for no routing fee.
     */
    builder?: Address;
    /**
     *  Per-order builder/routing fee in the pool's native bps×1000 unit (≤ the
     *  venue's frozen `maxBuilderFee` ceiling AND ≤ the trader's approval). 0 = none.
     */
    builderFeeBpsTimes1k?: bigint;
    /**
     *  Opaque market-maker bookkeeping tag (v2). Forwarded verbatim to the pool
     *  (stored on the order + emitted in `OrderPlaced`); the SDK never interprets it
     *  and the pool no longer uses it for side derivation. Default 0.
     */
    userData?: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Opt a routing/builder frontend in to charge up to `maxFeeBpsTimes1k` (pool
 *  bps×1000 unit) per order the trader submits with that builder code. Set 0 to revoke.
 *
 * @category trading
 */
export interface ApproveBuilderParams {
    /** Pool address (binary, spot, or perp). The approval is per-pool. */
    pool: Address;
    /** Builder/routing frontend address. */
    builder: Address;
    /** Max per-order builder fee to allow (pool bps×1000). 0 revokes. */
    maxFeeBpsTimes1k: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.cancelOrder} — cancel one resting order, returning its
 *  remaining escrow to the owner. Works on spot AND binary pools.
 *
 * @category trading
 */
export interface CancelOrderParams {
    /** BinaryPool (or SpotPool) address hosting the resting order. */
    pool: Address;
    /** uint128 OrderId (decimal string or bigint). */
    orderId: bigint | string;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Shrink a resting order's remaining quantity IN PLACE — keeps its price-time
 *  queue priority (unlike {@link Trader.placeOrder} + amend, which re-queues at
 *  the back). Works on spot AND binary pools: BinaryPool implements the
 *  reduce-refund hook, so the freed escrow (collateral for a buy, outcome tokens
 *  for a sell) is returned to the owner.
 *
 * @category trading
 */
export interface ReduceOrderParams {
    /** BinaryPool (or SpotPool) address hosting the resting order. */
    pool: Address;
    /** uint128 OrderId of the resting order to shrink (decimal string or bigint). */
    orderId: bigint | string;
    /**
     *  The order's NEW remaining quantity. Must be a `lotSize` multiple,
     *  `>= minQuantity`, and strictly less than the current remaining. Reverts
     *  on-chain (`ExpiredOrderMustBeCancelled`) if the order has already expired —
     *  use {@link Trader.cancelOrder} to recover an expired order's funds.
     */
    newQuantityRemaining: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Permissionless keeper drain: clean an explicit list of EXPIRED resting orders
 *  on a pool, returning each order's locked escrow to its owner. Best-effort —
 *  non-expired or stale ids are silently skipped on-chain (no revert).
 *
 * @category trading
 */
export interface CancelExpiredOrdersParams {
    /** BinaryPool (or SpotPool) address whose expired orders to clean. */
    pool: Address;
    /** uint128 OrderIds to attempt to clean (decimal strings or bigints). */
    orderIds: (bigint | string)[];
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Permissionless keeper drain: walk ONE price level from the best order on a
 *  side, cleaning up to `maxCount` expired orders. The complement of
 *  {@link CancelExpiredOrdersParams} when you have a price level rather than a
 *  list of ids (e.g. draining a locked market's book so its pool can be
 *  released). Each cleaned order's escrow returns to its owner.
 *
 * @category trading
 */
export interface SweepExpiredAtLevelParams {
    /** BinaryPool (or SpotPool) address to sweep. */
    pool: Address;
    /** True to sweep the bid side, false the ask side. */
    isBid: boolean;
    /** The exact price level to sweep (raw pool price units). */
    price: bigint;
    /** Max number of expired orders to clean in this call. */
    maxCount: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Permissionless closing-price capture on a BinaryPool (capture-generation pools
 *  only). Callable by anyone once the market's expiry passes; stores the closing
 *  book's bid/ask mid and lifts the closing-book lock, letting post-expiry
 *  cancels/sweeps of alive-at-close orders proceed on a not-yet-terminal market.
 *  Self-incentivized: whoever wants the book dismantled (a maker reclaiming
 *  escrow, a keeper draining toward release) captures first. Reverts
 *  `CloseAlreadyCaptured` when already captured/terminal-latched,
 *  `CaptureTooEarly` before expiry, `CaptureStepsExhausted` when the scan budget
 *  runs out (retry with a bigger `maxSteps`).
 *
 * @category trading
 */
export interface CaptureCloseParams {
    /** BinaryPool address whose closing price to capture. */
    pool: Address;
    /**
     *  Per-side scan budget in orders visited — only stale (earlier-expired,
     *  unswept) orders above the closing book consume steps. 0 selects the pool
     *  default (256).
     *  @default 0n
     */
    maxSteps?: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  OrderBook OrderType — shared by binary `placeOrder` and spot `placeSpotOrder`
 *  (both ride the same OrderBook core): 0 NormalOrder (limit), 1 FillOrKill,
 *  2 ImmediateOrCancel (market), 3 PostOnly. Pass to either call's `orderType`.
 *
 * @category trading
 */
export declare const ORDER_TYPE: {
    /** 0 — NormalOrder: fill what crosses, rest the remainder on the book. */
    readonly LIMIT: 0;
    /** 1 — FillOrKill: fill the full quantity immediately, or place nothing. */
    readonly FILL_OR_KILL: 1;
    /** 2 — ImmediateOrCancel: fill what crosses now, cancel the remainder. */
    readonly MARKET: 2;
    /** 3 — PostOnly: rest only — never takes liquidity. */
    readonly POST_ONLY: 3;
};
/**
 *  Inputs to {@link Trader.placeSpotOrder} — a spot limit or market order on a
 *  SpotPool.
 *
 * @category trading
 */
export interface PlaceSpotOrderParams {
    /** SpotPool address. */
    pool: Address;
    /** True = buy the base asset (pay quote); false = sell base (pay base/native). */
    isBid: boolean;
    /**
     *  Limit price — raw quote units per whole base token. For a MARKET order pass a
     *  crossing price (best opposite level ± slippage); it bounds the escrow.
     */
    price: bigint;
    /** Base quantity, raw base units. */
    quantity: bigint;
    /**
     *  Base-token decimals. The pool now reports its exact funding requirement, so
     *  the SDK no longer uses this value.
     *
     * @deprecated Retained for source compatibility. New calls can omit it.
     */
    baseDecimals?: number;
    /** Quote token (approved on a buy). */
    quoteToken: Address;
    /** Base token (approved on a non-native sell). */
    baseToken: Address;
    /**
     *  True when the base asset is native SOMI. A sell then pays via `msg.value`
     *  instead of an approval — the pool's exact vault shortfall, fee headroom
     *  included, read from `getAutoPullRequirement` (one `eth_call`) right before
     *  the order is encoded. The bare quantity would revert `InvalidMsgValue` on
     *  any fee-bearing pool.
     */
    baseIsNative?: boolean;
    /**
     *  Order expiry in ns. Defaults to ~50y (GTC). A spot pool has no market
     *  expiry to outlive, so the binary verb's `OrderExpiryBeyondMarket` cap does
     *  not apply here.
     *
     *  Two traps:
     *  - A timestamp already in the PAST reverts with `OrderAlreadyExpired`. It
     *    used to be accepted silently — the pool skipped the placement and
     *    returned no order id, so the transaction succeeded having placed nothing
     *    — but the current protocol rejects it outright.
     *  - An expired order does NOT auto-return its escrow, and this one IS silent.
     *    The funds stay locked in the pool until someone sweeps it —
     *    {@link Trader.cancelExpiredOrders} reclaims them, and is callable by
     *    anyone, not only the owner.
     */
    expireTimestampNs?: bigint;
    /** 0 limit (default) or 2 market (IOC). See {@link ORDER_TYPE}. */
    orderType?: number;
    /**
     *  Self-match behaviour when this order crosses your OWN resting order, default
     *  0 (`CANCEL_TAKER`). See {@link SELF_MATCHING_OPTION}.
     */
    selfMatchingOption?: number;
    /** Opaque market-maker bookkeeping tag, forwarded verbatim. Default 0. */
    userData?: bigint;
    /** Approve the escrow token if allowance is short (default true). */
    autoApprove?: boolean;
    /**
     *  Routing/builder frontend address to attribute the order to. Requires the
     *  trader to have opted this builder in via {@link Trader.approveBuilder} on
     *  this pool. Omit (or zero) for no routing fee.
     */
    builder?: Address;
    /**
     *  Per-order builder/routing fee in the pool's native bps×1000 unit (≤ the
     *  pool's `maxBuilderFee` ceiling AND ≤ the trader's approval). 0 = none.
     *  The ceiling is owner-updatable on a SpotPool, so read it rather than
     *  caching it indefinitely.
     */
    builderFeeBpsTimes1k?: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  One order inside a {@link Trader.placeSpotOrders} batch — the per-order fields
 *  of {@link PlaceSpotOrderParams}, minus everything the batch supplies once
 *  (`pool`, token context, gas).
 *
 * @category trading
 */
export interface SpotOrderRequest {
    /** True = buy the base asset (pay quote); false = sell base (pay base/native). */
    isBid: boolean;
    /**
     *  Limit price — raw quote units per whole base token. For a MARKET order pass a
     *  crossing price (best opposite level ± slippage); it bounds the escrow.
     */
    price: bigint;
    /** Base quantity, raw base units. */
    quantity: bigint;
    /** 0 limit (default) or 2 market (IOC). See {@link ORDER_TYPE}. */
    orderType?: number;
    /**
     *  Self-match behaviour when this order crosses your OWN resting order, default
     *  0 (`CANCEL_TAKER`). Set per rung: a ladder that crosses its own quotes can
     *  keep the incoming order and drop the resting one instead. See
     *  {@link SELF_MATCHING_OPTION}.
     */
    selfMatchingOption?: number;
    /** Order expiry in ns. Defaults to ~50y (GTC). */
    expireTimestampNs?: bigint;
    /** Opaque 64-bit tag carried on the order — for market-maker bookkeeping. */
    userData?: bigint;
    /**
     *  Routing/builder frontend address to attribute this rung to. Requires the
     *  trader to have opted this builder in via {@link Trader.approveBuilder} on
     *  the batch's pool. Omit (or zero) for no routing fee.
     */
    builder?: Address;
    /**
     *  Per-order builder/routing fee in the pool's native bps×1000 unit (≤ the
     *  pool's `maxBuilderFee` ceiling AND ≤ the trader's approval). 0 = none.
     */
    builderFeeBpsTimes1k?: bigint;
}
/**
 *  Inputs to {@link Trader.placeSpotOrders} — place several orders on ONE SpotPool
 *  in a single transaction.
 *
 * @category trading
 */
export interface PlaceSpotOrdersParams {
    /** SpotPool address every order in this batch targets. */
    pool: Address;
    /** The orders to place, in the order the results come back. */
    orders: SpotOrderRequest[];
    /**
     *  Base-token decimals. The pool now reports each order's exact funding
     *  requirement, so the SDK no longer uses this value.
     *
     * @deprecated Retained for source compatibility. New calls can omit it.
     */
    baseDecimals?: number;
    /** Quote token (approved once for the batch's total buy-side escrow). */
    quoteToken: Address;
    /** Base token (approved once for the batch's total sell-side quantity). */
    baseToken: Address;
    /**
     *  True when the base asset is native SOMI. Batch writes are NON-payable, so a
     *  native-base sell here funds from the pool's vault balance — pre-deposit native
     *  to the vault first (the batch cannot send `msg.value`, and nothing is approved
     *  for a native base).
     */
    baseIsNative?: boolean;
    /** Approve the escrow tokens if allowance is short (default true). */
    autoApprove?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 * One request's outcome in a {@link Trader.placeSpotOrders} batch.
 *
 * @category trading
 */
export interface BatchPlaceOutcome {
    /**
     *  True when this request produced an order. False for a benign non-placement —
     *  a PostOnly that would have crossed, an unfilled FillOrKill, an IOC that found
     *  no liquidity, an already-expired expiry, or a CancelTaker self-match.
     */
    success: boolean;
    /** The resting order's id, or `undefined` when `success` is false. */
    orderId?: bigint;
}
/**
 * Result of {@link Trader.placeSpotOrders}.
 *
 * @category trading
 */
export interface PlaceSpotOrdersResult extends TxResult {
    /**
     *  Per-request outcomes, index-aligned with the `orders` input. Reconstructed
     *  from the receipt's `OrderPlaced` events (a transaction's return data is not
     *  readable by an EOA).
     */
    outcomes: BatchPlaceOutcome[];
    /** Fills that executed in this tx, across every request in the batch. */
    fills: OrderFill[];
}
/**
 *  Inputs to {@link Trader.cancelOrders} — pull several resting orders on ONE pool
 *  in a single transaction. Works on spot AND binary pools.
 *
 * @category trading
 */
export interface CancelOrdersParams {
    /** SpotPool (or BinaryPool) address hosting the resting orders. */
    pool: Address;
    /** uint128 OrderIds to cancel (decimal strings or bigints). */
    orderIds: (bigint | string)[];
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 * One id's outcome in a {@link Trader.cancelOrders} batch.
 *
 * @category trading
 */
export interface BatchCancelOutcome {
    /** The order id this entry reports on. */
    orderId: bigint;
    /**
     *  True when this id was cancelled in this transaction. False means the contract
     *  SKIPPED it — already filled, already cancelled, expired-and-swept, or not
     *  owned by the signer. A skip is inferred from the absence of an event, so it
     *  does NOT distinguish a benign race from a caller-side mistake.
     */
    cancelled: boolean;
}
/**
 * Result of {@link Trader.cancelOrders}.
 *
 * @category trading
 */
export interface CancelOrdersResult extends TxResult {
    /** Per-id outcomes, index-aligned with the `orderIds` input. */
    outcomes: BatchCancelOutcome[];
}
/**
 *  Options for {@link Trader.cancelAllOrders} — the kill switch that pulls every
 *  resting order the signer holds on one pool.
 *
 * @category trading
 */
export interface CancelAllOrdersOptions {
    /**
     *  Where the resting ids come from.
     *
     *  - `"chain"` (default): one `eth_call` to the pool's own `getOwnOpenOrders`.
     *    Complete, and correct on a pool the live tail does not watch.
     *  - `"live"`: the live store, so the cancel costs NO read at all. Needs an
     *    active watch covering the pool; without one this throws instead of
     *    reporting a false empty.
     *
     * @default "chain"
     */
    source?: "chain" | "live";
    /**
     * Gas ceiling for the cancel tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Result of {@link Trader.cancelAllOrders} when nothing was resting.
 *
 *  A kill switch that finds an empty book has SUCCEEDED, so this is not an error.
 *  No transaction was sent, so there is no hash and no receipt — which is why the
 *  result is a union rather than a {@link CancelOrdersResult} with optional fields.
 *  Branch on `sent`.
 *
 * @category trading
 */
export interface CancelAllOrdersEmpty {
    /** Always `false` here: no transaction was broadcast. */
    sent: false;
    /** Always empty: nothing was resting. */
    orderIds: [];
    /** Always empty: nothing was cancelled. */
    outcomes: [];
}
/**
 *  Result of {@link Trader.cancelAllOrders} when orders were resting and a cancel
 *  transaction went out. Carries everything {@link CancelOrdersResult} does.
 *
 * @category trading
 */
export interface CancelAllOrdersSent extends CancelOrdersResult {
    /** Always `true` here: a cancel transaction was broadcast. */
    sent: true;
    /** The ids the read found resting, in the order they were sent to the pool. */
    orderIds: bigint[];
}
/**
 *  Result of {@link Trader.cancelAllOrders}. Branch on `sent`: `false` means
 *  nothing was resting and no transaction went out.
 *
 * @category trading
 */
export type CancelAllOrdersResult = CancelAllOrdersEmpty | CancelAllOrdersSent;
/**
 * One reduction inside a {@link Trader.reduceOrders} batch.
 *
 * @category trading
 */
export interface ReduceOrderRequest {
    /** uint128 OrderId of the resting order to shrink (decimal string or bigint). */
    orderId: bigint | string;
    /**
     *  The order's NEW remaining quantity. Must be a `lotSize` multiple,
     *  `>= minQuantity`, and strictly less than the current remaining.
     */
    newQuantityRemaining: bigint;
}
/**
 *  Inputs to {@link Trader.reduceOrders} — shrink several resting orders on ONE
 *  pool in a single transaction. Works on spot AND binary pools.
 *
 * @category trading
 */
export interface ReduceOrdersParams {
    /** SpotPool (or BinaryPool) address hosting the resting orders. */
    pool: Address;
    /** The reductions to apply. Any invalid entry reverts the whole batch. */
    reductions: ReduceOrderRequest[];
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.placePerpOrder} — a perp limit or market order on a
 *  PerpPool. Margin is locked from the signer's MarginBank balance (no escrow
 *  transfer in this tx) — {@link Trader.depositMargin} first.
 *
 * @category trading
 */
export interface PlacePerpOrderParams {
    /** PerpPool address. */
    pool: Address;
    /** True = buy/long the synthetic base; false = sell/short. */
    isBid: boolean;
    /**
     *  Limit price — raw quote (collateral) units per whole base. For a MARKET
     *  order pass a crossing price; it bounds the margin lock.
     */
    price: bigint;
    /** Base quantity, raw base units. */
    quantity: bigint;
    /** Order expiry in ns. Defaults to ~50y (GTC). */
    expireTimestampNs?: bigint;
    /** 0 limit (default) or 2 market (IOC). See {@link ORDER_TYPE}. */
    orderType?: number;
    /**
     *  Self-match behaviour when this order crosses your OWN resting order, default
     *  0 (`CANCEL_TAKER`). See {@link SELF_MATCHING_OPTION}.
     */
    selfMatchingOption?: number;
    /**
     *  Routing/builder frontend address to attribute the order to. Requires the
     *  trader to have opted this builder in via {@link Trader.approveBuilder} on
     *  this pool. Omit (or zero) for no routing fee.
     */
    builder?: Address;
    /**
     *  Per-order builder/routing fee in the pool's native bps×1000 unit (≤ the
     *  pool's `maxBuilderFee` ceiling AND ≤ the trader's approval). 0 = none.
     *  The ceiling is owner-updatable on a PerpPool, so read it rather than
     *  caching it indefinitely.
     */
    builderFeeBpsTimes1k?: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  OrderBook SelfMatchingOption — what happens when your incoming taker order
 *  crosses your OWN resting order: 0 cancels the rest of the taker, 1 cancels the
 *  whole maker. Every placement and amend verb takes it, and every one of them
 *  encodes 0 when you omit it. That default is the SDK's own choice: the pool
 *  reads the value out of the order request and has no default to fall back on.
 *
 * @category trading
 */
export declare const SELF_MATCHING_OPTION: {
    /** 0 — cancel the remaining taker quantity, leave the maker resting. */
    readonly CANCEL_TAKER: 0;
    /** 1 — cancel the full maker order, let the taker continue. */
    readonly CANCEL_MAKER: 1;
};
/**
 *  The replacement order in an amendment. Mirrors the pool's `PlaceOrderRequest`
 *  struct; the owner is the amend caller, not a per-request field.
 *
 * @category trading
 */
export interface BatchOrderRequest {
    /** True = buy/bid, false = sell/ask. */
    isBid: boolean;
    /** Limit price, raw quote units per whole base. */
    price: bigint;
    /** Base quantity, raw base units. */
    quantity: bigint;
    /** Order expiry in ns. Defaults to ~50y (GTC). */
    expireTimestampNs?: bigint;
    /** 0 limit (default), 1 FillOrKill, 2 market/IOC, 3 PostOnly. See {@link ORDER_TYPE}. */
    orderType?: number;
    /** Self-match behaviour, default 0. See {@link SELF_MATCHING_OPTION}. */
    selfMatchingOption?: number;
    /** Routing/builder address to attribute this order to; omit for none. */
    builder?: Address;
    /** Per-order builder fee in the pool's bps×1000 unit. 0 = none. */
    builderFeeBpsTimes1k?: bigint;
    /** Opaque market-maker bookkeeping tag, forwarded verbatim. Default 0. */
    userData?: bigint;
}
/**
 *  Inputs to {@link Trader.amendOrders} — re-price N orders in one transaction.
 *
 *  **Gotchas** — what an amend does depends on the pool version:
 *
 *  - A cancel-then-place pool cancels every old order before placing any
 *    replacement. Each replacement gets a new id and joins the back of its queue
 *    (use `reduceOrder` to shrink an order without re-queueing). An all-or-nothing
 *    version reverts the batch with `AmendReplacementRejected(requestIndex, reason)`
 *    at the first replacement it will not honour; a per-rung version applies the
 *    other amendments and leaves the rejected one without an order.
 *  - A pool that amends in place walks the batch once and keeps each order's id. An
 *    order keeps its queue place when its price is unchanged and its quantity is not
 *    raised. A rejected amendment is left without an order.
 *
 *  `newOrderIds[i] === 0n` means amendment `i` landed nothing. Its old order is gone
 *  too, unless an earlier amendment in the same batch already landed on the same
 *  `oldOrderId`.
 *
 * @category trading
 */
export interface AmendOrdersParams {
    /** SpotPool or PerpPool address. NOT a BinaryPool. */
    pool: Address;
    /** The amendments to apply, in array order. Must be non-empty. */
    amendments: {
        /** The resting order being replaced (decimal string or bigint). */
        oldOrderId: bigint | string;
        /**
         *  How to handle an `oldOrderId` already filled/cancelled when the tx lands.
         *  False (default) reverts the batch with `AmendOldOrderGone` on an
         *  all-or-nothing pool, and skips just this amendment (`0n`) on the others;
         *  true places the replacement anyway (opt-in upsert). A pool that amends in
         *  place places that fresh order as post-only with cancel-taker self-matching,
         *  whatever `newOrder` asks. It never tolerates an ownership failure — someone
         *  else's live order still reverts.
         */
        alwaysPlace?: boolean;
        /** The replacement order. */
        newOrder: BatchOrderRequest;
    }[];
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 * Result of a batch amend — the ids of the replacement orders.
 *
 * @category trading
 */
export interface AmendOrdersResult extends TxResult {
    /**
     *  The id each amendment's order now has, index-aligned with the submitted
     *  `amendments`: the replacement's id, or the unchanged `oldOrderId` on a pool
     *  that amends in place. Reconstructed from each rung's `OrderAmended` /
     *  `OrderAmendedInPlace` / `AmendRejected` log — or, on a legacy pool that emits
     *  none of them, from the `OrderPlaced` logs in order — since the pool's
     *  `uint128[]` return is not readable from a receipt.
     *
     *  `0n` means the amendment landed nothing; {@link AmendOrdersParams} says when its
     *  old order is gone too. A replacement that filled completely still has a
     *  non-zero id. An all-or-nothing pool never returns `0n` from a successful
     *  transaction.
     */
    newOrderIds: bigint[];
    /** Fills executed by the replacement orders. */
    fills: OrderFill[];
}
/**
 *  Inputs to {@link Trader.amendOrder} — re-price ONE resting order atomically, with
 *  no gap on the book.
 *
 *  **Gotchas** — on a cancel-then-place pool the replacement gets a new id and
 *  re-enters at the back of the price-time queue; on a pool that amends in place the
 *  order keeps its id, and keeps its queue place when its price is unchanged and its
 *  quantity is not raised. {@link Trader.reduceOrder} shrinks an order without
 *  re-queueing on any pool. The call is NON-PAYABLE: on a cancel-then-place pool the
 *  cancel leg delivers the old order's freed native to the WALLET, which the
 *  non-payable place leg cannot reach, so a native auto-pull amend reverts — fund
 *  native replacements from a manual-vault balance.
 *
 * @category trading
 */
export interface AmendOrderParams {
    /** SpotPool or PerpPool address. NOT a BinaryPool — see {@link Trader.amendOrder}. */
    pool: Address;
    /** The resting order being replaced (decimal string or bigint). */
    oldOrderId: bigint | string;
    /**
     *  How to handle an `oldOrderId` already filled/cancelled when the tx lands.
     *  False (default) reverts `AmendOldOrderGone`; true skips the cancel leg and
     *  places the replacement anyway (opt-in upsert). It never tolerates an
     *  ownership failure — someone else's live order still reverts `IncorrectSender`.
     */
    alwaysPlace?: boolean;
    /** The replacement order. */
    newOrder: BatchOrderRequest;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 * Result of a single amend — the id of the replacement order.
 *
 * @category trading
 */
export interface AmendOrderResult extends TxResult {
    /**
     *  The id the order now has: the replacement's NEW id on a cancel-then-place pool
     *  (the old id is gone), the unchanged id on a pool that amends in place. Track
     *  this id. Reconstructed from the `OrderAmended` / `OrderAmendedInPlace` log, or
     *  the replacement's `OrderPlaced` on a legacy pool that emits neither, since the
     *  pool's `uint128` return is not readable from a receipt.
     *
     *  `0n` means the id could not be reconstructed. It does NOT mean the amend
     *  failed: a single amend reverts outright when it cannot land.
     */
    newOrderId: bigint;
    /** Fills executed by the replacement order. */
    fills: OrderFill[];
}
/**
 *  Inputs to {@link Trader.depositMargin} — fund the signer's cross-margin
 *  MarginBank balance (one balance backs every perp pool on that bank).
 *
 * @category trading
 */
export interface DepositMarginParams {
    /** MarginBank address (from the PerpMarket row), or pass `pool` to resolve it. */
    marginBank?: Address;
    /** A PerpPool — its `marginBank()` is read (and cached) when `marginBank` is omitted. */
    pool?: Address;
    /** Collateral amount to deposit, raw units (e.g. USDso 18dp). */
    amount: bigint;
    /** Collateral token; read from the bank's getSystemConfig (cached) if omitted. */
    collateral?: Address;
    /** Approve the collateral to the BANK if allowance is short (default true). */
    autoApprove?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.withdrawMargin} — pull free collateral back out of the
 *  MarginBank (the bank margin-checks the withdrawal on-chain).
 *
 * @category trading
 */
export interface WithdrawMarginParams {
    /** MarginBank address (from the PerpMarket row), or pass `pool` to resolve it. */
    marginBank?: Address;
    /** A PerpPool — its `marginBank()` is read (and cached) when `marginBank` is omitted. */
    pool?: Address;
    /** Collateral amount to withdraw, raw units. Must be ≤ withdrawable (margin-checked on-chain). */
    amount: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  How a linked-wallet consent write finds its `LinkedWalletRegistry` — the
 *  resolution triple every one of the four registry writes shares.
 *
 *  Supply ONE of the three. `registry` is used as given. Otherwise the SDK reads
 *  `getLinkedWalletRegistry()` off the bank, because the bank is what decides which
 *  registry is authoritative — a registry nobody armed is inert. `pool` resolves
 *  the bank first.
 *
 *  A bank holding no registry throws {@link NotConfiguredError}: the rail is
 *  dormant on that deployment. Pass `registry` to reach a registry anyway; the
 *  consent writes still work, they just fund nothing until the bank is armed.
 *
 * @category trading
 */
export interface PerpWalletLinkTarget {
    /** The LinkedWalletRegistry. Skips resolution entirely. */
    registry?: Address;
    /** MarginBank address — its `getLinkedWalletRegistry()` is read (never cached). */
    marginBank?: Address;
    /** A PerpPool — its `marginBank()` is read (and cached), then the registry. */
    pool?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.proposePerpWalletLink} — offer a child wallet a link to
 *  the signer as its main.
 *
 *  The signer is the prospective MAIN. Half of a two-sided handshake: the child
 *  must then send {@link Trader.acceptPerpWalletLink}.
 *
 * @category trading
 */
export interface ProposePerpWalletLinkParams extends PerpWalletLinkTarget {
    /** The prospective child. Must not be the signer, and must not already be linked. */
    child: Address;
}
/**
 *  Inputs to {@link Trader.acceptPerpWalletLink} — accept a main's standing offer.
 *
 *  The signer is the CHILD. From here the child's position-increasing orders can
 *  draw on `main`'s wallet.
 *
 * @category trading
 */
export interface AcceptPerpWalletLinkParams extends PerpWalletLinkTarget {
    /** The main whose offer to accept. It must have an offer standing for the signer. */
    main: Address;
}
/**
 *  Inputs to {@link Trader.cancelPerpWalletLinkProposal} — withdraw an offer the
 *  signer made and the child has not accepted.
 *
 *  The signer is the MAIN. An accepted link is torn down with
 *  {@link Trader.unlinkPerpWallet} instead.
 *
 * @category trading
 */
export interface CancelPerpWalletLinkProposalParams extends PerpWalletLinkTarget {
    /** The child whose pending offer to withdraw. */
    child: Address;
}
/**
 *  Inputs to {@link Trader.unlinkPerpWallet} — dissolve an accepted link.
 *
 *  Works from either end: pass the OTHER party and the registry resolves which side
 *  is the main.
 *
 * @category trading
 */
export interface UnlinkPerpWalletParams extends PerpWalletLinkTarget {
    /** The other party to the link — the signer's main, or one of its children. */
    counterparty: Address;
}
/**
 *  Inputs to {@link Trader.repayPerpMainFunding} — the CHILD returns principal its
 *  main funded.
 *
 *  Signed by the child. The money goes to the payer the bank snapshotted at funding
 *  time, not to whoever is linked now.
 *
 * @category trading
 */
export interface RepayPerpMainFundingParams {
    /** MarginBank address (from the PerpMarket row), or pass `pool` to resolve it. */
    marginBank?: Address;
    /** A PerpPool — its `marginBank()` is read (and cached) when `marginBank` is omitted. */
    pool?: Address;
    /**
     *  Principal to return, raw units.
     *
     *  Over-asking is SAFE and does not revert: the bank returns
     *  `min(amount, outstanding, present balance)`. Pass the outstanding principal
     *  from `client.getPerpMainFunding` to repay in full.
     */
    amount: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.recallPerpMainFunding} — the PAYER pulls principal back
 *  out of a child.
 *
 *  Signed by the payer. Same clamped accounting as
 *  {@link Trader.repayPerpMainFunding}, and the same destination.
 *
 * @category trading
 */
export interface RecallPerpMainFundingParams extends RepayPerpMainFundingParams {
    /** The child to recall from. The signer must be its recorded payer. */
    child: Address;
}
/**
 *  Inputs to {@link Trader.claimPerpVoucher} — claim the one-time credit voucher as
 *  the signer.
 *
 *  Supply ONE of `distributor`, `marginBank` or `pool`. `distributor` is used as
 *  given. Otherwise the SDK reads `getCreditGranter()` off the bank, because the bank
 *  decides which distributor it accepts credit from. `pool` resolves the bank first.
 *
 *  A bank holding no credit granter throws {@link NotConfiguredError}: the voucher
 *  programme is off on that deployment.
 *
 * @category trading
 */
export interface ClaimPerpVoucherParams {
    /** The VoucherDistributor. Skips resolution entirely. */
    distributor?: Address;
    /** MarginBank address — its `getCreditGranter()` is read (never cached). */
    marginBank?: Address;
    /** A PerpPool — its `marginBank()` is read (and cached), then the distributor. */
    pool?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Claim a payout that fell back to a pool's internal ERC20Vault (a
 *  `PayoutFallbackToVault` credit) back to the caller's wallet.
 *
 * @category trading
 */
export interface WithdrawVaultParams {
    /**
     *  The ERC20Vault to withdraw from — the pool address (BinaryPool/SpotPool ARE
     *  ERC20Vaults).
     */
    vault: Address;
    /** Token to withdraw (ERC-20 address, or the vault's native sentinel). */
    token: Address;
    /**
     *  Amount to withdraw, raw units. Must be ≤ the vault's withdrawable balance
     *  (read it with `client.getVaultBalance`).
     */
    amount: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.depositVault} — pre-fund an ERC-20 balance in a pool's
 *  internal vault.
 *
 * @category trading
 */
export interface DepositVaultParams {
    /**
     *  The ERC20Vault to deposit into — the pool address (SpotPool/BinaryPool ARE
     *  ERC20Vaults).
     */
    vault: Address;
    /**
     *  ERC-20 to deposit. NOT the native sentinel — use {@link Trader.depositVaultNative}
     *  for native (the contract reverts `UseDepositNative`).
     */
    token: Address;
    /** Amount to deposit, raw units. Must be > 0. */
    amount: bigint;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.depositVaultNative} and {@link Trader.depositVaultNativeFor}
 *  — pre-fund a native balance in a pool's internal vault. The amount travels as
 *  `msg.value`.
 *
 * @category trading
 */
export interface DepositVaultNativeParams {
    /** The ERC20Vault to deposit into — the pool address. */
    vault: Address;
    /** Native amount to deposit, wei. Must be > 0. */
    amount: bigint;
    /**
     *  Account to credit. Omit to credit the signer; set it to fund ANOTHER account's
     *  vault balance (an operator pre-funding a bot wallet).
     */
    owner?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.setManualVaultMode} — flip a SpotPool's auto-pull
 *  opt-out for the signer.
 *
 * @category trading
 */
export interface SetManualVaultModeParams {
    /** SpotPool the mode applies to. Scoped per user PER POOL. */
    pool: Address;
    /** True to draw only on vault balance; false to restore wallet auto-pull. */
    enabled: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/** What both operator-grant writes share. The signer is always the granting owner. */
interface OperatorApprovalParamsBase {
    /** Account being admitted to act for the signer (a bot, a router, a helper contract). */
    operator: Address;
    /**
     *  4-byte selectors the operator may call. Grant only what it needs —
     *  {@link PLACE_ORDER_FOR_SELECTOR} to place, {@link CANCEL_ORDER_FOR_SELECTOR} to
     *  cancel. Must not be empty.
     */
    selectors: readonly Hex[];
    /** True to grant, false to revoke. */
    approved: boolean;
    /**
     *  OperatorPermissionsRegistry address.
     *  @default `addresses.operatorPermissionsRegistry`
     */
    operatorRegistry?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.setOperatorApprovalGlobal} — admit an operator across
 *  every registered pool (what `SpotRouter` requires).
 *
 * @category trading
 */
export interface SetOperatorApprovalGlobalParams extends OperatorApprovalParamsBase {
}
/**
 *  Inputs to {@link Trader.setOperatorApprovalForPool} — admit an operator on ONE
 *  SpotPool (the tighter default).
 *
 * @category trading
 */
export interface SetOperatorApprovalForPoolParams extends OperatorApprovalParamsBase {
    /** SpotPool the grant applies on. */
    pool: Address;
}
/**
 *  Inputs to {@link Trader.setPerpLeverage} — cap the signer's max leverage on one
 *  perp pool (the MarginBank sizes positions against margin with it).
 *
 * @category trading
 */
export interface SetPerpLeverageParams {
    /** PerpPool the leverage cap applies to. */
    pool: Address;
    /** Max leverage multiplier (e.g. 10 = 10x), bounded by the protocol limit. */
    leverageX: number;
    /** MarginBank address; read (and cached) from `pool.marginBank()` when omitted. */
    marginBank?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.placeSpotStopOrder} — a stop-loss / take-profit order
 *  the SpotStopOrderRegistry holds pending and places on the pool when the mark
 *  price crosses the trigger. Funded by SOMI `msg.value` for the trigger gas.
 *
 * @category trading
 */
export interface PlaceSpotStopOrderParams {
    /** SpotStopOrderRegistry address (the per-pool registry). */
    registry: Address;
    /**
     *  The SpotPool the registry trades on — needed for the operator-auth check, the
     *  ERC-20 escrow approval, and the native vault pre-load math.
     */
    pool: Address;
    /**
     *  Shared OperatorPermissionsRegistry where the one-time global approval is granted.
     *  Resolved from the live config (addresses.operatorPermissionsRegistry) if omitted.
     */
    operatorRegistry?: Address;
    /** True = buy stop (escrows quote at trigger); false = sell stop (escrows base/native). */
    isBid: boolean;
    /** Base quantity to trade at trigger, raw base units. */
    quantity: bigint;
    /** Mark price that arms the trigger (raw quote per whole base). */
    triggerPrice: bigint;
    /** 0 = GTE (trigger when mark ≥ triggerPrice), 1 = LTE (mark ≤ triggerPrice). */
    triggerOperator: 0 | 1;
    /** 0 = LIMIT (uses limitPrice), 1 = MARKET (slippage-bounded). */
    stopOrderType: 0 | 1;
    /** Limit price for a LIMIT stop order (raw quote per whole base). */
    limitPrice?: bigint;
    /** Quote token — the input escrow on a buy stop. */
    quoteToken: Address;
    /** Base token — the input escrow on a (non-native) sell stop. */
    baseToken: Address;
    /** True when the base asset is native SOMI (sell stops pre-load the pool vault). */
    baseIsNative?: boolean;
    /**
     *  SOMI to fund the reactivity subscription gas. Read from
     *  registry.somiPaymentPerOrder() if omitted.
     */
    somiPayment?: bigint;
    /**
     *  Skip the one-time operator-approval check/tx (default false). Set true if you
     *  know the registry is already operator-approved for this owner.
     */
    skipOperatorApproval?: boolean;
    /** Approve the ERC-20 escrow token to the pool if allowance is short (default true). */
    autoApprove?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.cancelStopOrder} and {@link Trader.cancelPerpStopOrder} —
 *  cancel a pending (untriggered) stop order on its registry.
 *
 *  Shared by both venues because the cancel takes nothing venue-specific: an id and the
 *  registry that issued it. Which registry that is follows from the method you call, so
 *  pass the SpotStopOrderRegistry to the spot cancel and the PerpStopOrderRegistry to
 *  the perp one — ids are per-registry and mean nothing on the other.
 *
 * @category trading
 */
export interface CancelStopOrderParams {
    /** The stop-order registry holding the pending order — spot or perp, per the method. */
    registry: Address;
    /** The pending order's id on the registry (decimal string or bigint). */
    orderId: bigint | string;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.claimPerpStopSomi} — recover the SOMI a perp stop
 *  registry owes the signer after a refund transfer failed.
 *
 * @category trading
 */
export interface ClaimPerpStopSomiParams {
    /** The perp stop-order registry holding the unclaimed balance. */
    registry: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Whether a triggered perp stop may only REDUCE the signer's position, or may open
 *  and increase one.
 *
 *  Omitting it means `"reduceOnly"` — a take-profit or stop-loss, which is what every
 *  perp stop was before intent existed. `"opening"` is a stop-entry or breakout: it
 *  acquires exposure rather than shedding it, so the registry gates it on initial
 *  margin at creation instead of on holding a reducible position.
 *
 * @category trading
 */
export type PerpStopIntent = "reduceOnly" | "opening";
/**
 *  One leg of a perp stop order — the terms shared by a single stop and by each half
 *  of a linked pair.
 *
 * @category trading
 */
export interface PerpStopOrderLeg {
    /** True = the triggered order buys, false = sells. */
    isBid: boolean;
    /**
     *  Base quantity to trade at trigger, raw base units.
     *
     *  ZERO is a sentinel meaning "the whole position at trigger time" — the size is
     *  resolved against the live position when it fires, so the stop keeps covering a
     *  position that GREW after it was armed. A non-zero quantity is fixed at creation
     *  and only ever clamped DOWN. Rejected for `"opening"` intent, where it has no
     *  meaning.
     */
    quantity: bigint;
    /** Mark price that arms the trigger (raw collateral units per whole base). */
    triggerPrice: bigint;
    /** 0 = GTE (fires when mark ≥ triggerPrice), 1 = LTE (mark ≤ triggerPrice). */
    triggerOperator: 0 | 1;
    /** 0 = LIMIT (uses limitPrice), 1 = MARKET (slippage-bounded by the registry). */
    stopOrderType: 0 | 1;
    /** Limit price for a LIMIT stop (raw collateral per whole base). Must be 0 for MARKET. */
    limitPrice?: bigint;
    /** Builder to tag on the triggered order. Omit for none. */
    builder?: Address;
    /** Builder fee in bps x 1000 (so 1500 = 1.5bps). Requires `builder`. */
    builderFeeBpsTimes1k?: bigint;
}
/**
 *  Inputs to {@link Trader.placePerpStopOrder} — a take-profit / stop-loss (or, with
 *  `intent: "opening"`, a stop-entry) that the PerpStopOrderRegistry holds pending and
 *  places on the PerpPool when the MARK price crosses the trigger.
 *
 *  Pass `pair` to arm two legs as a linked one-cancels-other set in a single
 *  transaction, at 2x the SOMI payment. There is no separate "place linked" method on
 *  purpose: a pair is the same order with a second leg, and splitting it would give
 *  callers two ways to say one thing.
 *
 * @category trading
 */
export interface PlacePerpStopOrderParams extends PerpStopOrderLeg {
    /** PerpStopOrderRegistry address (one per PerpPool). */
    registry: Address;
    /** The PerpPool the registry places on — needed for the operator-auth check. */
    pool: Address;
    /**
     *  Shared OperatorPermissionsRegistry where the one-time global approval is granted.
     *  Resolved from the live config (addresses.operatorPermissionsRegistry) if omitted.
     */
    operatorRegistry?: Address;
    /**
     *  Reduce-only (default) or opening. Omit and existing callers keep the behaviour
     *  they always had.
     */
    intent?: PerpStopIntent;
    /**
     *  A second leg, armed atomically and LINKED to the first: when one fires and
     *  fills, the other is cancelled and its SOMI refunded.
     *
     *  The pair must be a coherent TP/SL set — same side, OPPOSITE trigger operators,
     *  and straddling (the GTE leg's trigger above the LTE leg's) — or the registry
     *  rejects it. Both legs are reduce-only; an opening leg cannot be paired, because a
     *  bracket whose children activate on the parent's FILL is not expressible (the pool
     *  does not notify the registry on fill).
     */
    pair?: PerpStopOrderLeg;
    /**
     *  SOMI to fund the reactivity trigger gas, PER LEG. Read from
     *  registry.somiPaymentPerOrder() if omitted; a pair sends twice this.
     */
    somiPayment?: bigint;
    /**
     *  Skip the one-time operator-approval check/tx (default false). Set true if you
     *  know the registry is already operator-approved for this owner.
     */
    skipOperatorApproval?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.linkPerpStopOrders} — pair two stops that already exist.
 *
 *  The after-the-fact form of {@link PlacePerpStopOrderParams.pair}, and the way to
 *  re-pair a survivor: when one leg of a pair fires WITHOUT filling, the other stays
 *  armed and is unlinked, free to be paired with a fresh leg.
 *
 * @category trading
 */
export interface LinkPerpStopOrdersParams {
    /** The PerpStopOrderRegistry holding both orders. */
    registry: Address;
    /** First order id (either operator; the pair is ordered by the registry). */
    orderIdA: bigint | string;
    /** Second order id. */
    orderIdB: bigint | string;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.cancelPerpStopOrders} — cancel several of the signer's
 *  pending stops in one transaction, refunded in a single transfer.
 *
 *  The way to tear down a linked pair: cancelling ONE leg only unlinks the other,
 *  which stays armed. Every id must be live and owned by the signer — one bad id
 *  reverts the whole batch.
 *
 * @category trading
 */
export interface CancelPerpStopOrdersParams {
    /** The PerpStopOrderRegistry holding the pending orders. */
    registry: Address;
    /** The pending order ids (decimal strings or bigints). Must be non-empty. */
    orderIds: (bigint | string)[];
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 * Inputs to {@link Trader.mintSet} — deposit collateral, receive equal YES + NO.
 *
 * @category trading
 */
export interface MintSetParams {
    /** BinaryPool address — pool pulls collateral and mints YES+NO. */
    pool: Address;
    /** Collateral amount → mints `amount` YES + `amount` NO to the signer. */
    amount: bigint;
    /** Collateral token; resolved from the live store (by pool) if omitted. */
    collateral?: Address;
    /** Approve collateral → pool if allowance is short (default true). */
    autoApprove?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 * Inputs to {@link Trader.burnSet} — surrender equal YES + NO, get collateral back.
 *
 * @category trading
 */
export interface BurnSetParams {
    /** BinaryPool address — pool burns the caller's YES + NO and refunds collateral. */
    pool: Address;
    /** Outcome amount to burn (same for YES + NO). */
    amount: bigint;
    /**
     *  Outcome-token singleton; resolved from the pool if omitted. Both YES + NO
     *  are covered by a single operator approval on it.
     */
    outcomeToken?: Address;
    /** Ensure the pool is an operator on the outcome-token singleton (default true). */
    autoApprove?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.redeem} — burn winning outcome tokens for collateral on
 *  a resolved/voided market (module-routed redemption).
 *
 * @category trading
 */
export interface RedeemParams {
    /**
     *  bytes32 marketId the module keys the redemption on (settlement-extraction v2:
     *  redemption is module-routed — the module pulls the caller's winning tokens,
     *  finalizes-if-needed, and redeems through the BinarySettlement singleton).
     */
    marketId: Hex;
    /** Outcome-token amount to burn for collateral. */
    amount: bigint;
    /**
     *  Outcome leg to redeem (0 = YES, 1 = NO). When omitted, the SDK first
     *  confirms `market.isResolved()`, then derives the leg from the finalized
     *  one-hot payout vector. This needs `market`; otherwise pass `outcomeIdx`
     *  explicitly. Settlement v3 stores a payout vector — `winningOutcome()` was
     *  removed and reverts on the deployed contract.
     *
     *  The lookup is RESOLUTION-ONLY. An unresolved market throws instead of
     *  guessing from an unfinished vector. A voided market has no winner — both
     *  legs are redeemable — so redeem throws {@link InvalidInputError} rather
     *  than picking one. Pass the leg you hold, or use {@link RedeemManyParams}
     *  with one entry per leg to claim both in one transaction.
     */
    outcomeIdx?: 0 | 1;
    /**
     *  BinaryMarket address — only needed to auto-look-up `outcomeIdx` /
     *  `outcomeToken` when those are omitted. The `outcomeIdx` lookup reads the
     *  terminal flags first, then the finalized payout vector and denominator.
     */
    market?: Address;
    /** Routing operator id (uint32) for attribution; 0 = none (default). */
    operatorId?: number;
    /** Routing venue id (bytes32 hex); 32-byte zero = none (default). */
    venueId?: Hex;
    /**
     *  Outcome-token singleton the winning position lives on (for the operator
     *  grant). Looked up via `market.outcomeToken()` when omitted.
     */
    outcomeToken?: Address;
    /**
     *  BinaryMarketsModule address; resolved from `config.addresses.binaryModule`
     *  when omitted. Throws if neither is set.
     */
    module?: Address;
    /** Ensure the module is an operator on the outcome-token singleton (default true). */
    autoApprove?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Claim winnings from several settled markets in ONE transaction — the batch
 *  form of {@link RedeemParams}. Each entry is redeemed independently for the
 *  signer (settlement pays each straight to their wallet); all-or-nothing.
 *
 * @category trading
 */
export interface RedeemManyParams {
    /** Per-market redemptions. `outcomeIdx` is required per entry (0 = YES, 1 = NO). */
    entries: {
        /** bytes32 marketId of the market to redeem on. */
        marketId: Hex;
        /** Which outcome's tokens to redeem (0 = YES, 1 = NO). */
        outcomeIdx: 0 | 1;
        /** Outcome tokens to redeem, raw units (collateral decimals). */
        amount: bigint;
    }[];
    /** Routing operator id (uint32) for attribution; 0 = none (default). */
    operatorId?: number;
    /** Routing venue id (bytes32 hex); 32-byte zero = none (default). */
    venueId?: Hex;
    /**
     *  Outcome-token singleton to grant the module operator on (one grant covers all
     *  ids). Resolved from the settlement singleton when omitted.
     */
    outcomeToken?: Address;
    /** BinaryMarketsModule address; resolved from `config.addresses.binaryModule`. */
    module?: Address;
    /** Ensure the module is an operator on the outcome-token singleton (default true). */
    autoApprove?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  A signed authorization the position OWNER produces so a relayer can call
 *  {@link Trader.redeemFor} on their behalf. The on-chain payout is hard-pinned
 *  to `owner` (never the relayer), so this is a pure gas sponsorship — the signer
 *  keeps every cent of the proceeds. Produced by {@link Trader.signRedeemAuth},
 *  consumed by {@link Trader.redeemFor}.
 *
 * @category trading
 */
export interface RedeemAuthorization {
    /** The position owner (the signer). The payout is paid here on-chain. */
    owner: Address;
    /** Routing operator id (uint32) for attribution; part of the signed struct. */
    operatorId: number;
    /** Routing venue id (bytes32 hex); part of the signed struct. */
    venueId: Hex;
    /** bytes32 marketId the redemption targets. */
    marketId: Hex;
    /** Outcome the owner holds (0 = YES, 1 = NO). */
    outcomeIdx: 0 | 1;
    /** Outcome-token amount to burn for collateral. */
    amount: bigint;
    /** Per-owner replay nonce (module tracks `(owner, nonce)`); any unused value. */
    nonce: bigint;
    /** Signature deadline (unix seconds). The module rejects a stale authorization. */
    deadline: bigint;
    /** The EIP-712 signature over the authorization (65-byte r‖s‖v hex). */
    signature: Hex;
}
/**
 *  Inputs to {@link Trader.signRedeemAuth} — everything in the signed struct
 *  EXCEPT the signature (which the call produces). Signed by the connected signer
 *  (the position owner); the resulting {@link RedeemAuthorization} is handed to a
 *  relayer to submit via {@link Trader.redeemFor}.
 *
 * @category trading
 */
export interface SignRedeemAuthParams {
    /** bytes32 marketId the redemption targets. */
    marketId: Hex;
    /** Outcome the owner holds (0 = YES, 1 = NO). */
    outcomeIdx: 0 | 1;
    /** Outcome-token amount to burn for collateral. */
    amount: bigint;
    /** Per-owner replay nonce; any value not yet consumed for this owner. */
    nonce: bigint;
    /** Signature deadline (unix seconds). */
    deadline: bigint;
    /** Routing operator id (uint32) for attribution; 0 = none (default). */
    operatorId?: number;
    /** Routing venue id (bytes32 hex); 32-byte zero = none (default). */
    venueId?: Hex;
    /**
     *  Owner the payout is pinned to; defaults to the connected signer's address.
     *  Must be the address whose signer produces the signature.
     */
    owner?: Address;
    /**
     *  BinaryMarketsModule address — the EIP-712 `verifyingContract`; resolved from
     *  `config.addresses.binaryModule` when omitted.
     */
    module?: Address;
}
/**
 *  Relayer path: submit a position owner's pre-signed {@link RedeemAuthorization}
 *  so THEY pay the gas while the OWNER receives the payout. The caller (relayer)
 *  need not be the owner; the module recovers the signature to `owner` and pays
 *  `owner` directly.
 *
 * @category trading
 */
export interface RedeemForParams {
    /** The owner's signed authorization (from {@link Trader.signRedeemAuth}). */
    authorization: RedeemAuthorization;
    /**
     *  BinaryMarketsModule address; resolved from `config.addresses.binaryModule`
     *  when omitted. Must match the `verifyingContract` the authorization was
     *  signed against.
     */
    module?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Low-level direct redemption against the BinarySettlement singleton — bypasses
 *  the module (no operator attribution). Burns the caller's outcome tokens and
 *  pays `to`. Prefer the module-routed {@link RedeemParams} for normal trading;
 *  use this for keeper/tooling paths that hold the raw outcome id.
 *
 * @category trading
 */
export interface RedeemDirectParams {
    /** The ERC-6909 outcome id to redeem (encodes pool + nonce + index). */
    outcomeId: bigint;
    /** Outcome-token quantity to burn. */
    amount: bigint;
    /** Recipient of the released collateral (default: the trader's own address). */
    to?: Address;
    /**
     *  BinarySettlement address; resolved from `config.addresses.binarySettlement`
     *  when omitted. Throws if neither is set.
     */
    settlement?: Address;
    /**
     *  Outcome-token singleton (for the operator grant). Resolved from the
     *  settlement's `outcomeToken()` when omitted.
     */
    outcomeToken?: Address;
    /** Ensure the settlement is an operator on the outcome-token singleton (default true). */
    autoApprove?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Claim an accrued push-fallback balance on the settlement singleton (a payout
 *  that could not be pushed to a reverting recipient was booked to `owed`).
 *
 * @category trading
 */
export interface ClaimOwedParams {
    /** The token to claim (the market's collateral token). */
    token: Address;
    /** BinarySettlement address; resolved from `config.addresses.binarySettlement` when omitted. */
    settlement?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Permissionless keeper entry: finalize a settled market (sweep its pool's
 *  backing + resolution snapshot to the settlement singleton). No-op-guarded.
 *
 * @category trading
 */
export interface FinalizeMarketParams {
    /** bytes32 marketId to finalize; the market must be resolved or voided. */
    marketId: Hex;
    /** BinaryMarketsModule address; resolved from `config.addresses.binaryModule` when omitted. */
    module?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Permissionless earmark reconcile: release the oracle earmark of a market that
 *  was voided via the `BinaryMarket.voidExpired()` escape hatch (which bypasses the
 *  module, so the hub's earmark release never fired).
 *
 * @category trading
 */
export interface SyncSettlementParams {
    /** bytes32 marketId to reconcile; the market must be resolved or voided. */
    marketId: Hex;
    /** BinaryMarketsModule address; resolved from `config.addresses.binaryModule` when omitted. */
    module?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Permissionless keeper entry: release a finalized, drained pool back to its
 *  creator's free list for recycle onto the next market.
 *
 * @category trading
 */
export interface ReleasePoolParams {
    /** bytes32 marketId whose (finalized, book-empty) pool to release. */
    marketId: Hex;
    /** BinaryMarketsModule address; resolved from `config.addresses.binaryModule` when omitted. */
    module?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Permissionless oracle retry: ask the module to re-pull the answer for one
 *  oracle question.
 *
 * @category trading
 */
export interface PokeOracleParams {
    /**
     *  The ORACLE QUESTION id to retry — not a market id. The module fans out to
     *  every market bound to this question; read it from a market row's
     *  `oracleQuestion` or the module's market record.
     */
    oracleQuestionId: bigint;
    /** BinaryMarketsModule address; resolved from `config.addresses.binaryModule` when omitted. */
    module?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Permissionless dead-oracle escape hatch: void a market whose settlement
 *  window has lapsed without a resolution.
 *
 * @category trading
 */
export interface VoidExpiredParams {
    /** bytes32 marketId to void; its market contract is resolved from the module. */
    marketId: Hex;
    /** BinaryMarketsModule address; resolved from `config.addresses.binaryModule` when omitted. */
    module?: Address;
    /**
     *  Skip the pre-send status/window check. The on-chain guards still apply —
     *  this only gives up the clearer client-side error (and its three reads).
     *  @default false
     */
    skipPreflight?: boolean;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  A market's settlement record on the BinarySettlement singleton (the permanent
 *  redemption home). Mirrors the on-chain `MarketSettlement` struct.
 *
 * @category trading
 */
export interface SettlementRecord {
    /** The ERC-20 collateral the net backing is held in. */
    collateralToken: Address;
    /**
     *  The NET collateral held for this market (post fee-skim on resolution),
     *  decremented by each redemption's payout.
     */
    backing: bigint;
    /** True once the pool's backing + snapshot have been swept in. Gates redemption. */
    finalized: boolean;
    /** True if the market voided (each side redeems against the stored payout vector — a half per side under `UNIFORM`, `[p, D−p]` on a captured `CLOB_SNAPSHOT` void; never a settlement fee). */
    voided: boolean;
    /**
     *  The winning outcome index (0 = YES, 1 = NO); derived as argmax of
     *  `payoutNumerators`. Meaningful only when `!voided`.
     */
    winningOutcome: number;
    /**
     *  Settlement v3 fee-scaled payout VECTOR (denominator 10_000_000). Redemption of
     *  outcome `i` pays `amount × payoutNumerators[i] / 10_000_000`.
     */
    payoutNumerators: bigint[];
    /** The one-time settlement-fee rate skimmed at finalize (bps×1000; retained for audit). */
    settlementFeeBpsTimes1k: bigint;
    /** The address the settlement fee was skimmed to at finalize. */
    feeRecipient: Address;
    /** The pool that finalized this market (the address encoded in the outcome ids). */
    pool: Address;
    /** The pool's market nonce for this record. */
    nonce: bigint;
}
/**
 *  A canonical Permit2 `PermitTransferFrom` — the signed authorization the
 *  Permit2 mint path forwards to the router (which relays it to Permit2). Build
 *  it (and the EIP-712 signature) with a Permit2 SDK on the app side.
 *
 * @category trading
 */
export interface Permit2TransferFrom {
    /** Token + amount the signature authorizes. `token` must equal the market collateral. */
    permitted: {
        /** The ERC-20 the signature authorizes — must equal the market's collateral token. */
        token: Address;
        /** Max amount the signature authorizes, raw collateral units. */
        amount: bigint;
    };
    /** Unordered Permit2 nonce. */
    nonce: bigint;
    /** Signature deadline (unix seconds). */
    deadline: bigint;
}
/**
 * Shared inputs for the CollateralRouter complete-set entry points.
 *
 * @category trading
 */
export interface RouterMintBase {
    /** bytes32 market key the set is minted for (the market's `marketId`). */
    marketId: Hex;
    /** Routing operator id (uint32) for attribution; 0 = none. */
    operatorId: number;
    /** Routing venue id (bytes32 hex); 32-byte zero = none. */
    venueId: Hex;
    /**
     *  CollateralRouter address; resolved from `config.addresses.collateralRouter`
     *  if omitted. Throws if neither is set (never sends to the zero address).
     */
    router?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Params for {@link Trader.mintSetNative} — mint a YES+NO set by paying in the
 *  chain's native coin.
 *
 *  **When to use**
 *
 *  Use when the market's collateral IS wrapped native: the router wraps
 *  `msg.value` for you, so the caller needs no prior approval and no wrap step.
 *  For ERC-20 collateral use {@link MintSetPermit2Params} instead.
 *
 * **Gotchas**
 *
 * - Throws {@link ContractRevertError} `CollateralNotWNative` when the market's collateral is not wrapped native, or `ZeroAmount` when `amount` is 0.
 *
 * @category trading
 */
export interface MintSetNativeParams extends RouterMintBase {
    /**
     *  Native (SOMI/STT) amount to wrap → wNative and mint as `amount` YES + NO.
     *  Sent as `msg.value`; the target market's collateral must be wNative.
     */
    amount: bigint;
}
/**
 *  Params for {@link Trader.mintSetPermit2} — mint a YES+NO set from ERC-20
 *  collateral pulled with a signed Permit2 permit.
 *
 *  **When to use**
 *
 *  Use as the sibling of {@link MintSetNativeParams}, for markets whose
 *  collateral is a real ERC-20: one signature replaces the separate `approve`
 *  transaction.
 *
 * **Gotchas**
 *
 * - Throws {@link ContractRevertError} `PermitTokenMismatch` when `permit.permitted.token` is not the market's collateral, or `ZeroAmount` when `amount` is 0.
 *
 * @category trading
 */
export interface MintSetPermit2Params extends RouterMintBase {
    /**
     *  Collateral amount to pull via Permit2 and mint as `amount` YES + NO. Must
     *  match `permit.permitted.amount` semantics on the app side.
     */
    amount: bigint;
    /** Signed Permit2 permit whose `permitted.token` must equal the market collateral. */
    permit: Permit2TransferFrom;
    /** EIP-712 signature over `permit` by the signer. */
    signature: Hex;
}
/**
 *  Inputs to {@link Trader.redeemNative} — redeem winning outcome tokens for a
 *  NATIVE payout via the CollateralRouter (unwraps wNative → native).
 *
 * @category trading
 */
export interface RedeemNativeParams {
    /** bytes32 market key redeemed against; its collateral must be wNative. */
    marketId: Hex;
    /**
     *  Outcome the caller holds (0 = YES, 1 = NO). The router is type-blind — it
     *  forwards this to the core, which the pool prices (winner 1:1, void 1/N per
     *  side).
     */
    outcomeIdx: 0 | 1;
    /** Amount of that outcome's tokens to redeem for a native payout. */
    amount: bigint;
    /** Routing operator id (uint32) for attribution; 0 = none. */
    operatorId: number;
    /** Routing venue id (bytes32 hex); 32-byte zero = none. */
    venueId: Hex;
    /**
     *  CollateralRouter address; resolved from `config.addresses.collateralRouter`
     *  if omitted. Throws if neither is set.
     */
    router?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 * Inputs to {@link Trader.faucet} — mint TestUSDC to the signer (testnet only).
 *
 * @category trading
 */
export interface FaucetParams {
    /** Amount to mint (default 10,000 × 10^decimals). */
    amount?: bigint;
    /** TestUSDC address; defaults to the configured one. */
    testUsdc?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.resolve} — resolve a market via the FakeOracle (demo/dev
 *  resolver only).
 *
 * @category trading
 */
export interface ResolveParams {
    /** BinaryMarket address to resolve. */
    market: Address;
    /** The outcome to resolve to (0 = YES wins, 1 = NO wins). */
    outcomeIdx: 0 | 1;
    /** FakeOracle address; defaults to the configured one. */
    fakeOracle?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 *  Inputs to {@link Trader.voidMarket} — void a market via the FakeOracle (demo/dev
 *  resolver only). Each side then redeems against the payout vector the market
 *  stores: a half per side under the `UNIFORM` void policy, and `[p, D−p]` at
 *  the closing YES price on a `CLOB_SNAPSHOT` void that captured a two-sided
 *  close.
 *
 * @category trading
 */
export interface VoidMarketParams {
    /** BinaryMarket address to void. */
    market: Address;
    /** FakeOracle address; defaults to the configured one. */
    fakeOracle?: Address;
    /**
     * Gas ceiling for this tx.
     *
     * @default {@link TraderConfig.gas} (10,000,000)
     */
    gas?: bigint;
}
/**
 * Failures from {@link Trader.buildPlaceSpotOrder}.
 *
 * @category trading
 */
export type TraderBuildPlaceSpotOrderError = SomniaMarketsSocketFailure;
/**
 * Failures from {@link Trader.cancelAllOrders}.
 *
 * @category trading
 */
export type TraderCancelAllOrdersError = ExecutorExecuteError;
/**
 * Failures from {@link Trader.buildCancelOrders}.
 *
 * @category trading
 */
export type TraderBuildCancelOrdersError = InvalidInputError;
/**
 * Failures from {@link Trader.buildReduceOrders}.
 *
 * @category trading
 */
export type TraderBuildReduceOrdersError = InvalidInputError;
/**
 *  Failures from {@link Trader.signRedeemAuth}: no module address configured,
 *  an executor that cannot sign typed data as the actor (a safe, a session
 *  key), or the signer itself failing / refusing.
 *
 * @category trading
 */
export type TraderSignRedeemAuthError = NotConfiguredError | SignerRequiredError | RpcError;
/**
 *  Failures from {@link Trader.claimPerpVoucher}: a bad target, a bank with no credit
 *  granter, a resolution read that did not complete, an unobserved receipt, or the
 *  distributor's revert.
 *
 * @category trading
 */
export type TraderClaimPerpVoucherError = ExecutorExecuteError;
/**
 *  Failures from {@link Trader.buildClaimPerpVoucher}: a bad target, a bank with no
 *  credit granter, or a resolution read that did not complete or reverted.
 *
 * @category trading
 */
export type TraderBuildClaimPerpVoucherError = SomniaMarketsSocketFailure;
/**
 *  The SDK's write tier — every pool/market transaction it can sign and send,
 *  bound to one signer. Built via `client.createTrader(config)` (see
 *  {@link TraderConfig}); shares that client's chain, addresses, and WebSocket.
 *
 *  Sending methods preserve {@link ExecutorExecuteError}, including missing
 *  executor transport as {@link NotConfiguredError} and a transaction whose
 *  receipt was not observed as {@link TransactionOutcomeUnknownError}.
 *
 *  Every write AWAITS its receipt before resolving — there is no bare-hash return
 *  to babysit. Order placements additionally resolve to the decoded order id + fills.
 *
 * @category trading
 */
export interface Trader {
    /**
     *  The executor this trader sends through — who signs, and the address the
     *  pools see as the caller (`executor.actor`). Read-only; build another trader
     *  to change it.
     */
    readonly executor: Executor;
    /**
     * Place a limit order (auto-approving the escrow token by default). Resolves once
     * mined, with the resting order id and any fills.
     *
     * **Gotchas**
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link InvalidInputError} - `price` or `quantity` was not > 0.
     * - Throws {@link ContractRevertError} - the pool rejected the order; `errorName` carries the protocol's own error (e.g. `InsufficientBalance`). Also thrown when the transaction mines with a reverted status — the SDK replays the call to recover the reason, so you get a name rather than a failed receipt.
     * - Throws {@link RpcError} - a request did not complete, or the node refused the transaction.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     *
     * **Example** (Placing a binary bid)
     *
     * Bid 0.62 for 10 YES using an indexed binary market row `market`.
     *
     * ```ts
     * const trader = client.createTrader({ privateKey });
     * const decimals = market.quoteDecimals;
     * const res = await trader.placeOrder({
     *   pool: market.poolAddress,
     *   side: "BUY_YES",
     *   price: probabilityToPrice(0.62, decimals),
     *   quantity: fromHuman(10, decimals),
     * });
     * console.log(res.orderId, res.fills.length); // resting id (if it rested) + immediate fills
     * ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult>;
    /**
     * Cancel a resting order on its pool (works for spot + binary).
     *
     * **Gotchas**
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link ContractRevertError} - the cancel did not land (already filled, already canceled, not the owner — `errorName` distinguishes them).
     * - Throws {@link RpcError} - a request did not complete, or the node refused the transaction.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    cancelOrder(params: CancelOrderParams): Promise<TxResult>;
    /**
     *  Shrink a resting order's remaining quantity in place, keeping its price-time
     *  queue priority (works for spot + binary). Reverts on-chain for an expired
     *  order — use {@link Trader.cancelOrder} there.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    reduceOrder(params: ReduceOrderParams): Promise<TxResult>;
    /**
     *  Permissionless keeper drain: clean an explicit list of expired resting orders
     *  on a pool, returning each order's escrow to its owner (best-effort; skips
     *  non-expired / stale ids).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    cancelExpiredOrders(params: CancelExpiredOrdersParams): Promise<TxResult>;
    /**
     *  Permissionless keeper drain: clean up to `maxCount` expired orders at one
     *  price level on a side.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    sweepExpiredAtLevel(params: SweepExpiredAtLevelParams): Promise<TxResult>;
    /**
     *  Permissionless closing-price capture on a BinaryPool (post-expiry): stores
     *  the closing mid and lifts the closing-book lock. Required before sweeping a
     *  pre-terminal closing book — a `CloseNotCaptured` revert on a cancel/sweep
     *  means "capture first, then retry".
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    captureClose(params: CaptureCloseParams): Promise<TxResult>;
    /**
     *  Opt a routing/builder frontend in on a pool so orders the trader places
     *  with that builder code may charge up to `maxFeeBpsTimes1k` (0 revokes). Required
     *  before a non-zero `builder`/`builderFeeBpsTimes1k` on {@link Trader.placeOrder},
     *  {@link Trader.placeSpotOrder} or {@link Trader.placePerpOrder}.
     *
     *  Binary, spot and perp pools each implement this interface, but the approval
     *  is stored PER POOL: approving a builder on one pool grants nothing on
     *  another. Call it once per pool the trader will place attributed orders on,
     *  or the placement reverts. Each pool declares the whole builder-error set;
     *  which one fires depends on the check that trips first. With NO approval at
     *  all that is `BuilderNotApproved` on a SpotPool (it guards `approved > 0`),
     *  `BuilderFeeExceedsApproval` on a PerpPool, and `BuilderFeeExceedsCap` on a
     *  BinaryPool — whose ceiling, unlike the other two, is frozen at init.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    approveBuilder(params: ApproveBuilderParams): Promise<TxResult>;
    /** Read a trader's per-builder approval cap on a pool (pool bps×1000; 0 = none).
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    getBuilderApproval(ref: Fees.BuilderApprovalRef): Promise<bigint>;
    /**
     *  Effective builder approval on a pool: the trader's raw cap clamped by the
     *  pool's protocol-wide `getMaxBuilderFeeBpsTimes1k` ceiling — the actual enforced
     *  limit a `builderFeeBpsTimes1k` on any place-order verb must not exceed.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    getEffectiveBuilderApproval(ref: Fees.BuilderApprovalRef): Promise<bigint>;
    /** Read a pool's protocol-wide builder-fee ceiling (bps×1000).
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    getMaxBuilderFeeBpsTimes1k(pool: Address): Promise<bigint>;
    /**
     *  Place a spot limit/market order on a SpotPool (auto-approves the escrow token,
     *  or sends native msg.value on a native-base sell).
     *
     *  An ERC-20 approval check uses `requiredAmount`, which is the pool's
     *  worst-case reserve including fee headroom. A native sell sends `delta`,
     *  which subtracts the owner's current vault balance from that reserve. The
     *  SDK reads the requirement once per uncached token/pool approval and on each
     *  native-base sell.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    placeSpotOrder(params: PlaceSpotOrderParams): Promise<PlaceOrderResult>;
    /**
     *  Place several orders on one SpotPool in a single transaction — a market
     *  maker's ladder in one tx instead of a loop of sends.
     *
     *  **Gotchas**
     *
     *  This write is NON-PAYABLE: unlike {@link Trader.placeSpotOrder}, it takes no
     *  `msg.value`. A native-base sell in a batch therefore funds from the pool's
     *  VAULT balance — pre-deposit native to the vault and auto-pull consumes it.
     *  ERC-20 auto-pull works normally per request, and the batch approves each
     *  escrow token once for the whole batch's total.
     *
     *  SPOT ONLY. A binary pool reverts `UseBinaryPlacement` on generic placement —
     *  the YES/NO kind must be explicit, so use {@link Trader.placeOrder} there.
     *
     *  A request that does not place is NOT an error: `outcomes[i].success` is false
     *  with no id for a PostOnly that would cross, an unfilled FillOrKill, an IOC that
     *  found no liquidity, an already-expired expiry, or a CancelTaker self-match. A
     *  hard validation error (bad lot size, insufficient funds) reverts the whole batch.
     *
     *  Outcome attribution matches each `OrderPlaced` event to its request on every
     *  field the event echoes (side, price, quantity, userData, expiry), in order.
     *  Two byte-identical adjacent requests with different outcomes are therefore
     *  indistinguishable from logs — the earlier index gets the credit. Tag rungs
     *  with distinct `userData` when exact attribution matters.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link InvalidInputError} - `orders` was empty, or a request had a non-positive price or quantity.
     * - Throws {@link ContractRevertError} - the batch was rejected; `errorName` carries the protocol's error (`EmptyBatch`, `UseBinaryPlacement` on a binary pool, or a per-order validation failure).
     * - Throws {@link RpcError} - a request did not complete, or the node refused the transaction.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     *
     * **Example** (Placing a spot-order batch)
     *
     *  ```ts
     *  // Place a three-rung sell ladder in one transaction.
     *  const trader = client.createTrader({ privateKey });
     *  const res = await trader.placeSpotOrders({
     *    pool,
     *    quoteToken,
     *    baseToken,
     *    orders: [1_010_000n, 1_020_000n, 1_030_000n].map((price) => ({
     *      isBid: false,
     *      price,
     *      quantity: 1_000_000n,
     *    })),
     *  });
     *  // Index-aligned with `orders`; a rung that did not place is success:false.
     *  const ids = res.outcomes.flatMap((o) => (o.success ? [o.orderId!] : []));
     *  ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    placeSpotOrders(params: PlaceSpotOrdersParams): Promise<PlaceSpotOrdersResult>;
    /**
     *  Cancel several resting orders on one pool in a single transaction — pull a
     *  whole ladder without leaving the remaining rungs exposed. Works on spot AND
     *  binary pools (cancel is inherited from the OrderBook base, not placement-gated).
     *
     *  **Gotchas**
     *
     *  BEST-EFFORT by design: an id that can no longer be cancelled (already filled,
     *  already cancelled, expired-and-swept, not owned by the signer) is SKIPPED
     *  on-chain instead of reverting the batch — which is the point in a fast market.
     *  Each `outcomes[i].cancelled` is inferred from whether the id emitted a cancel
     *  event, so a `false` does NOT tell you WHY: a benign fill race and a wrong id
     *  look identical here. Reconcile against the book if you need to know.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link InvalidInputError} - `orderIds` was empty.
     * - Throws {@link ContractRevertError} - `errorName` `EmptyBatch` when the contract rejects the payload.
     * - Throws {@link RpcError} - a request did not complete, or the node refused the transaction.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     *
     * **Example** (Inspecting batch cancellations)
     *
     *  ```ts
     *  const trader = client.createTrader({ privateKey });
     *  const res = await trader.cancelOrders({ pool, orderIds: ladderIds });
     *  const skipped = res.outcomes.filter((o) => !o.cancelled).map((o) => o.orderId);
     *  ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    cancelOrders(params: CancelOrdersParams): Promise<CancelOrdersResult>;
    /**
     *  Pull EVERY resting order the signer holds on one pool — the kill switch. Reads
     *  the ids and cancels them in one call. Works on spot AND binary pools.
     *
     *  **When to use**
     *
     *  Use it to stop quoting when the bot holds no local ids: after a restart, or
     *  after a send whose outcome is unknown. {@link Trader.cancelOrders} stays the
     *  right call when you already know which ids to pull.
     *
     *  **Details**
     *
     *  The default `source: "chain"` costs one `eth_call` plus the cancel transaction.
     *  `source: "live"` takes the ids from the live store instead, so the cancel is
     *  the only round trip — it needs an active market watch covering the pool.
     *
     *  Nothing resting is a SUCCESS, not an error: the result is then `{ sent: false,
     *  orderIds: [], outcomes: [] }` and no transaction goes out. Branch on `sent`.
     *  When `sent` is true the result carries everything
     *  {@link Trader.cancelOrders} returns, per-id `outcomes` included.
     *
     *  **Gotchas**
     *
     *  An EXPIRED order that still rests is NOT cancelled on the default chain
     *  source. The pool's `getOwnOpenOrders` view filters expired orders out of the
     *  owner's own list, and expiry is lazy, so such an order keeps sitting on the
     *  book holding its funds while this read cannot see it. Clear that residue with
     *  {@link Trader.cancelExpiredOrders} or {@link Trader.sweepExpiredAtLevel}.
     *
     *  The two sources differ exactly here, and `source: "live"` is the stronger one.
     *  The live store marks an order expired only when it sees the pool's
     *  `OrderExpired` event, which lazy expiry does not emit until something touches
     *  the order — so a lapsed order still reads as resting and its id IS forwarded.
     *  On-chain the cancel then goes through: the pool gates a best-effort cancel on
     *  owner and id, not on expiry, so the order is removed from the book and its
     *  funds released. It emits `OrderExpired` rather than `OrderCancelled`, and both
     *  count as terminated, so the outcome reads `cancelled: true`. The live source
     *  therefore clears the residue that the chain source cannot even see.
     *
     *  A `side` filter is not supported yet. Pass the ids to
     *  {@link Trader.cancelOrders} when you must pull one side only.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport, or `source: "live"` without an active watch covering the pool. An unwatched store cannot tell an empty book from an unseen one, so it refuses rather than cancelling nothing.
     * - Throws {@link RpcError} - the id read did not complete. A failed read never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - the cancel transaction reverted.
     *
     * - Throws {@link InvalidInputError} - the executor rejects the call.
     *
     * **Example** (Pulling every quote after a restart)
     *
     *  ```ts
     *  const trader = client.createTrader({ privateKey });
     *  const res = await trader.cancelAllOrders(pool);
     *  const pulled = res.sent ? res.outcomes.filter((o) => o.cancelled).length : 0;
     *  ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    cancelAllOrders(pool: Address, opts?: CancelAllOrdersOptions): Promise<CancelAllOrdersResult>;
    /**
     *  Shrink several resting orders in place in a single transaction, each keeping its
     *  price-time queue priority. Works on spot AND binary pools.
     *
     *  **Gotchas**
     *
     *  ATOMIC, unlike {@link Trader.cancelOrders}: the FIRST invalid reduction reverts
     *  the entire batch and no order changes. A reduction is invalid if the new
     *  quantity is not a `lotSize` multiple, is below `minQuantity`, is not strictly
     *  less than the current remaining, or the order has expired (cancel those
     *  instead). Size the batch accordingly — one stale id loses the whole tx.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link InvalidInputError} - `reductions` was empty.
     * - Throws {@link ContractRevertError} - a reduction was rejected; `errorName` carries the protocol's error.
     * - Throws {@link RpcError} - a request did not complete, or the node refused the transaction.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    reduceOrders(params: ReduceOrdersParams): Promise<TxResult>;
    /**
     *  Place a perp limit/market order on a PerpPool. Margin is locked from the
     *  signer's MarginBank balance — {@link Trader.depositMargin} first.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    placePerpOrder(params: PlacePerpOrderParams): Promise<PlaceOrderResult>;
    /**
     *  Re-price ONE resting order atomically — the re-quote primitive, with no gap on
     *  the book.
     *
     *  **When to use**
     *
     *  Re-pricing a single quote. For a whole ladder use {@link Trader.amendOrders}. To
     *  shrink an order without losing its place in the queue on any pool use
     *  {@link Trader.reduceOrder}; see {@link AmendOrderParams} for when an amend keeps
     *  its queue place.
     *
     *  **Details**
     *
     *  Prefer this over {@link Trader.amendOrders} with a one-element array: this
     *  raises the replacement's own landing-time reason (`PostOnlyWouldCross`,
     *  `SelfMatchCancelTaker`, `ImmediateOrCancelNoFill`, `FillOrKillNotFillable`,
     *  `OrderAlreadyExpired`), where an all-or-nothing batch wraps it as
     *  `AmendReplacementRejected(requestIndex, reason)` and any other batch returns
     *  only a `0n` id.
     *
     *  **Gotchas**
     *
     *  SpotPool and PerpPool only — a BinaryPool reverts `UseBinaryPlacement`, since
     *  binary placement is its own entry point. The replacement gets a NEW order id
     *  (a pool that amends in place keeps the old one), so track the returned id.
     *  Non-payable: on a cancel-then-place pool a native auto-pull amend reverts,
     *  because the cancel leg delivers the freed native to the wallet and the place
     *  leg cannot reach it — fund native replacements from a manual-vault balance.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link InvalidInputError} - `price` or `quantity` was not > 0.
     * - Throws {@link ContractRevertError} - the old order was gone and `alwaysPlace` was not set (`AmendOldOrderGone`), it belongs to someone else (`IncorrectSender`), or the replacement did not rest or fill; `errorName` carries the protocol's error.
     * - Throws {@link RpcError} - a request did not complete, or the node refused the transaction.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     *
     * **Example** (Amending an order)
     *
     *  Re-quote one bid a tick lower, and keep the new id.
     *
     *  ```ts
     *  const { newOrderId } = await trader.amendOrder({
     *    pool,
     *    oldOrderId: resting,
     *    newOrder: { isBid: true, price: 1_990_000n, quantity: 5_000_000n },
     *  });
     *  ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    amendOrder(params: AmendOrderParams): Promise<AmendOrderResult>;
    /**
     *  Re-price N orders in one transaction: all-or-nothing, per-rung or in place,
     *  depending on the pool version (see {@link AmendOrdersParams}). An amendment that
     *  landed nothing reads `0n` in `newOrderIds`. It places, so the same BinaryPool
     *  restriction applies.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    amendOrders(params: AmendOrdersParams): Promise<AmendOrdersResult>;
    /**
     *  Build a binary placement WITHOUT sending it — the same inputs as
     *  {@link Trader.placeOrder}, handed back as unsigned calls.
     *
     *  **When to use**
     *
     *  Reach for this when the signing and the sending are not the same moment: to
     *  pre-sign an ERC-4337 UserOp while the user is still filling in the form, to
     *  batch the order into a multicall, to hand it to a relayer, or to simulate it.
     *  For ordinary "place this order now", use {@link Trader.placeOrder} — it is
     *  one call and it handles the approval for you.
     *
     *  **Gotchas**
     *
     *  The approval is RETURNED, not sent. `placeOrder` approves as a side effect;
     *  this cannot, because sending is exactly what it must not do. Send `approval`
     *  first when it is present, or the order reverts on-chain.
     *
     *  Still `async`: a binary placement reads the pool's market expiry when the
     *  caller does not pass `expireTimestampNs`, and resolves the pool's escrow
     *  tokens to work out which approval is needed. Pass `expireTimestampNs`,
     *  `outcomeToken`, `yesId`, `noId`, and `collateral` to keep it off the network.
     *
     *  No gas estimate and no nonce ride along — those belong to the signer, and
     *  pinning them here would stale the moment the call is cached.
     *
     * - Throws {@link InvalidInputError} - `price` or `quantity` was not > 0.
     *
     * **Example** (Building an unsigned order)
     *
     * Pre-sign off the form, send on the click.
     *
     * ```ts
     * const { order, approval } = await trader.buildPlaceOrder({
     *   pool, side: "BUY_YES", price: 620_000n, quantity: 10_000_000n,
     * });
     * if (approval) await walletClient.sendTransaction({ ...approval, account });
     * const signed = await account.signTransaction({ ...order, nonce, ...fees });
     * ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    buildPlaceOrder(params: PlaceOrderParams): Promise<UnsignedOrder>;
    /**
     *  Build a spot placement WITHOUT sending it — see {@link Trader.buildPlaceOrder}
     *  for when to reach for this and how the returned approval works.
     *
     *  A native-base sell pays via `msg.value`, so it comes back with no `approval`
     *  and a non-zero `order.value`: the pool's vault shortfall for this order, fee
     *  headroom included, as read when the call is built. A vault that gains funds
     *  before the send only shrinks the requirement (the pool refunds the overage);
     *  one that loses them makes the pool reject the call.
     *
     *  - Throws {@link InvalidInputError} - `price` or `quantity` is not positive.
     *  - Throws {@link ContractRevertError} - the native-sell funding read reverted.
     *  - Throws {@link RpcError} - the native-sell funding read did not complete.
     *
     *  **Gotchas**
     *
     *  A spot placement that DEFAULTS its expiry pins it to ~50 years from *now*,
     *  so two builds a second apart differ in that one argument. Harmless against a
     *  50-year horizon, but it means such a build is not byte-reproducible: sign and
     *  send the `order` you were handed rather than rebuilding and expecting the
     *  same bytes. Pass {@link PlaceSpotOrderParams.expireTimestampNs} explicitly
     *  and the build is reproducible, as binary and perp already are.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    buildPlaceSpotOrder(params: PlaceSpotOrderParams): Promise<UnsignedOrder>;
    /**
     *  Build a perp placement WITHOUT sending it — see {@link Trader.buildPlaceOrder}
     *  for when to reach for this.
     *
     *  Never carries an `approval`: margin is locked from the MarginBank balance
     *  rather than escrowed per order ({@link Trader.depositMargin} first).
     */
    buildPlacePerpOrder(params: PlacePerpOrderParams): Promise<UnsignedOrder>;
    /**
     *  Deposit collateral into the MarginBank (auto-approving the collateral token
     *  to the bank by default). One cross-margin balance covers every perp pool.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    depositMargin(params: DepositMarginParams): Promise<TxResult>;
    /** Withdraw free collateral from the MarginBank (margin-checked on-chain).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    withdrawMargin(params: WithdrawMarginParams): Promise<TxResult>;
    /**
     *  Claim a payout that fell back to a pool's internal ERC20Vault (a
     *  `PayoutFallbackToVault` credit) back to the wallet. Read the claimable
     *  amount first with `client.getVaultBalance({ vault, owner, token })`.
     *
     *  Also how funds leave a manual-mode balance — see {@link setManualVaultMode}.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    withdrawVault(params: WithdrawVaultParams): Promise<TxResult>;
    /**
     *  Pre-fund an ERC-20 balance in a pool's internal vault (approves the pool when
     *  needed). Ordinary placement needs no deposit — auto-pull covers it; deposit
     *  when funding must precede the order. Native goes in via
     *  {@link depositVaultNative}.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    depositVault(params: DepositVaultParams): Promise<TxResult>;
    /**
     *  Pre-fund a native (SOMI) vault balance for the signer, or for another account
     *  when `owner` is set. The amount travels as `msg.value`.
     *
     *  A binary pool's vault takes exactly one token, so the SDK reads the pool's
     *  `collateralToken()` first and refuses a native deposit into a pool whose
     *  collateral is not native rather than spending a failed transaction. A pool
     *  without that view (a SpotPool) goes straight to the chain.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link InvalidInputError} - `amount` is not positive, or the pool is a binary pool whose collateral is not native.
     * - Throws {@link RpcError} - the preflight read or the deposit did not complete. A failed preflight never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - the pool rejected the deposit (`InvalidDepositOrWithdrawal` when native is not one of its tokens).
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    depositVaultNative(params: DepositVaultNativeParams): Promise<TxResult>;
    /**
     *  Pre-fund ANOTHER account's native vault balance — {@link depositVaultNative}
     *  with `owner` required (an operator funding a bot wallet). Same errors.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    depositVaultNativeFor(params: DepositVaultNativeParams & {
        owner: Address;
    }): Promise<TxResult>;
    /**
     *  Opt out of (or back into) wallet auto-pull on one SpotPool. While enabled,
     *  orders draw only on pre-deposited vault balance AND payouts stay as vault
     *  credit — claim them with {@link withdrawVault}. Scoped per user per pool.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    setManualVaultMode(params: SetManualVaultModeParams): Promise<TxResult>;
    /**
     *  Grant or revoke an operator on ONE SpotPool — the tighter way to let a bot trade
     *  for you. The signer is the granting owner; `approved: false` revokes. Read it
     *  back with {@link SomniaMarketsClient.isApprovedForPool}.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    setOperatorApprovalForPool(params: SetOperatorApprovalForPoolParams): Promise<TxResult>;
    /**
     *  Grant or revoke an operator across EVERY registered pool. Required for
     *  `SpotRouter` (not on any pool's allowlist); prefer
     *  {@link setOperatorApprovalForPool} for a single-venue bot.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    setOperatorApprovalGlobal(params: SetOperatorApprovalGlobalParams): Promise<TxResult>;
    /** Set the signer's max leverage for one perp pool (caps position size vs margin).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    setPerpLeverage(params: SetPerpLeverageParams): Promise<TxResult>;
    /**
     *  Offer a child wallet a link to the signer as its main — the first half of the
     *  handshake that gives a perp sub-account access to the signer's wallet.
     *
     *  Isolated margin on perps is one wallet per position, so a trader running N
     *  isolated positions runs N wallets. Linking them lets each child's
     *  position-increasing order draw its shortfall from this main's wallet, so one
     *  funded treasury serves all N.
     *
     *  The signer is the MAIN and this moves no money. The child must send
     *  {@link acceptPerpWalletLink} next, and it is the only party that can: read the
     *  offer from `client.listPerpWalletLinkEvents({ child })`, which is the ONLY
     *  record of a pending proposal.
     *
     * - Throws {@link InvalidInputError} - `registry` is the zero address, or none of `registry`, `marginBank` and `pool` was passed.
     * - Throws {@link NotConfiguredError} - the executor has no chain transport, or the bank holds no registry, so the rail is dormant on this deployment.
     * - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - `CannotLinkSelf`, `CallerIsChild` (the signer is already someone's child), `AlreadyLinked` (`child` already has a main), `NoStateChange` (this offer already stands), or `ZeroAddress`.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    proposePerpWalletLink(params: ProposePerpWalletLinkParams): Promise<TxResult>;
    /**
     *  Accept a main's standing offer, as the child — the second half of the
     *  handshake.
     *
     *  From here the signer's position-increasing orders pull their shortfall from
     *  `main`'s wallet. Funding does not wait for link maturity; `maturesAt` gates ADL
     *  netting only.
     *
     * - Throws {@link InvalidInputError} - `registry` is the zero address, or none of `registry`, `marginBank` and `pool` was passed.
     * - Throws {@link NotConfiguredError} - the executor has no chain transport, or the bank holds no registry, so the rail is dormant on this deployment.
     * - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - `NoProposalPending`, `CallerIsChild` (`main` has itself become a child), `CallerIsMain` (the signer already has children), `AlreadyLinked`, or `MaxChildrenReached`.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    acceptPerpWalletLink(params: AcceptPerpWalletLinkParams): Promise<TxResult>;
    /**
     *  Withdraw an offer the signer made and the child has not accepted. An ACCEPTED
     *  link comes down with {@link unlinkPerpWallet} instead.
     *
     * - Throws {@link InvalidInputError} - `registry` is the zero address, or none of `registry`, `marginBank` and `pool` was passed.
     * - Throws {@link NotConfiguredError} - the executor has no chain transport, or the bank holds no registry, so the rail is dormant on this deployment.
     * - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - `NoProposalPending` (nothing pending for this pair, including an offer already accepted).
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    cancelPerpWalletLinkProposal(params: CancelPerpWalletLinkProposalParams): Promise<TxResult>;
    /**
     *  Dissolve an accepted link, from either end — pass the other party.
     *
     *  Settles no money: a claim the main funded survives the unlink and still gates
     *  the child's withdrawals. `PerpsUnlinkGuard` vetoes it while the leaver holds
     *  open positions and is liquidatable.
     *
     * - Throws {@link InvalidInputError} - `registry` is the zero address, or none of `registry`, `marginBank` and `pool` was passed.
     * - Throws {@link NotConfiguredError} - the executor has no chain transport, or the bank holds no registry, so the rail is dormant on this deployment.
     * - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - `NotLinked` (the two are not a linked pair) or `UnlinkBlockedByGuard` (the leaver is liquidatable with open positions).
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    unlinkPerpWallet(params: UnlinkPerpWalletParams): Promise<TxResult>;
    /**
     *  Return principal the signer's main funded, as the child.
     *
     *  Over-asking is clamped to `min(amount, outstanding, balance)` rather than
     *  rejected, so the outstanding figure from `client.getPerpMainFunding` cannot be
     *  stale-high. Repaying is what unlocks the child's own money: `withdraw` frees at
     *  most `balance - outstanding`.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link InvalidInputError} - `amount` is not positive, `marginBank` is the zero address, or neither `marginBank` nor `pool` was passed.
     * - Throws {@link RpcError} - the bank resolution read did not complete. A failed resolution never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - `NoFundedPrincipal` (nothing outstanding), `NothingToReturn` (the clamp reached zero, so the balance is gone), or `InsufficientMarginAfterWithdrawal`.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    repayPerpMainFunding(params: RepayPerpMainFundingParams): Promise<TxResult>;
    /**
     *  Pull principal back out of a child, as the payer. The signer must be the payer
     *  the bank recorded at funding time.
     *
     *  Recovers principal, never winnings, and performs no unlink — the child can be
     *  funded again without a fresh handshake.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * - Throws {@link InvalidInputError} - `amount` is not positive, `marginBank` is the zero address, or neither `marginBank` nor `pool` was passed.
     * - Throws {@link RpcError} - the bank resolution read did not complete. A failed resolution never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - `OnlyFundingPayer` (the signer is not the recorded payer), `NoFundedPrincipal`, `NothingToReturn`, or `InsufficientMarginAfterWithdrawal`.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    recallPerpMainFunding(params: RecallPerpMainFundingParams): Promise<TxResult>;
    /**
     *  Claim the signer's one-time credit voucher: a grant of house money into its
     *  MarginBank balance.
     *
     *  The grant is non-withdrawable. The signer can trade with it, and can withdraw
     *  profit above it. Read `client.getPerpVoucherEligibility` first: a claim that
     *  fails still mines and costs gas, because not every executor simulates before it
     *  sends.
     *
     *  **Gotchas**
     *
     *  A claim is once per address for the distributor's life, not once per campaign.
     *
     *  While the grant remains, the bank confines the account's position increases:
     *  only allowlisted markets, at no more than the voucher leverage cap, and the
     *  account cannot change its own leverage setting. Reducing a position is never
     *  blocked. Builder fees are not charged on voucher accounts.
     *
     *  The account can still deposit its own collateral, and an order placed with an
     *  ERC-20 allowance to the bank can pull the wallet's collateral in. Both mix with
     *  the grant in one balance.
     *
     * - Throws {@link InvalidInputError} - `distributor` or `marginBank` is the zero address, or none of `distributor`, `marginBank` and `pool` was passed.
     * - Throws {@link NotConfiguredError} - the executor has no chain transport, or the bank holds no credit granter, so the voucher programme is off on this deployment.
     * - Throws {@link RpcError} - the distributor or bank resolution read did not complete. A failed resolution never broadcasts.
     * - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
     * - Throws {@link ContractRevertError} - a pool or bank resolution read reverted (for example, `pool` is not a PerpPool or `marginBank` is not a MarginBank), and nothing was broadcast; or `claim()` reverted: `CampaignInactive` (outside the claim window), `AlreadyClaimed`, `BudgetExhausted`, `ClaimantNotFlat` (the signer holds a position or resting order), or `ClaimantIsMainFunded` (the signer carries principal from a linked main). The SDK's bundled error table does not name the last two yet, so they arrive with raw `data` and no `errorName`; `client.getPerpVoucherEligibility` reports them by name. Branch on `functionName` to tell a resolution revert (`marginBank`, `getCreditGranter`) from a claim revert (`claim`).
     *
     * @example Checking eligibility, then claiming
     * ```ts
     * const eligibility = await markets.client.getPerpVoucherEligibility(marginBank, account);
     * if (eligibility.eligible) {
     *   await markets.trader.claimPerpVoucher({ marginBank });
     * } else if (eligibility.reason === "notFlat") {
     *   // Close every position and cancel every resting perp order first.
     * }
     * ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    claimPerpVoucher(params: ClaimPerpVoucherParams): Promise<TxResult>;
    /** Permissionlessly poke a perp pool's funding settlement (updateFunding).
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    pokeFunding(params: {
        pool: Address;
        gas?: bigint;
    }): Promise<TxResult>;
    /**
     *  Place a spot stop-loss / take-profit pending order on a SpotStopOrderRegistry
     *  (funds the trigger via SOMI msg.value).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    placeSpotStopOrder(params: PlaceSpotStopOrderParams): Promise<PlaceStopOrderResult>;
    /** Cancel a pending stop order on its registry.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    cancelStopOrder(params: CancelStopOrderParams): Promise<TxResult>;
    /**
     *  Place a perp take-profit / stop-loss on a PerpStopOrderRegistry (funds the
     *  trigger via SOMI msg.value), granting the registry's one-time operator approval
     *  first if the signer has not already.
     *
     *  The single perp-stop create entry: pass `pair` for a linked one-cancels-other
     *  set, or `intent: "opening"` for a stop-entry. Both default off, so an existing
     *  call is an ordinary reduce-only stop and produces the same transaction it always
     *  did.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    placePerpStopOrder(params: PlacePerpStopOrderParams): Promise<PlacePerpStopOrderResult>;
    /**
     *  Link two existing perp stops into a one-cancels-other pair — the after-the-fact
     *  form of `placePerpStopOrder({ pair })`, and how a survivor is re-paired.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    linkPerpStopOrders(params: LinkPerpStopOrdersParams): Promise<TxResult>;
    /**
     *  Cancel a pending perp stop. If it is one leg of a pair the other stays armed and
     *  is unlinked — use {@link cancelPerpStopOrders} to tear down both.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    cancelPerpStopOrder(params: CancelStopOrderParams): Promise<TxResult>;
    /** Cancel several of the signer's pending perp stops in one tx, one refund transfer.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    cancelPerpStopOrders(params: CancelPerpStopOrdersParams): Promise<TxResult>;
    /**
     *  Claim SOMI the perp stop registry owes the signer — the refund path for an
     *  owner that cannot receive native. Reverts `NothingToClaim` on a zero balance.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    claimPerpStopSomi(params: ClaimPerpStopSomiParams): Promise<TxResult>;
    /**
     *  Build {@link placePerpStopOrder} without sending it — the stop-registry call
     *  plus, unless skipped, the operator grant the trigger needs first.
     *
     *  Recover the created ids from your own receipt with `decodePerpStopOrderIds`.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    buildPlacePerpStopOrder(params: PlacePerpStopOrderParams): Promise<UnsignedPerpStopOrder>;
    /**
     *  Build {@link cancelOrders} without sending it — so a ladder pull can ride in
     *  the same transaction as the replacement quotes.
     *
     * - Throws {@link InvalidInputError} - `orderIds` was empty.
     */
    buildCancelOrders(params: CancelOrdersParams): UnsignedCall;
    /**
     *  Build {@link reduceOrders} without sending it.
     *
     * - Throws {@link InvalidInputError} - `reductions` was empty.
     */
    buildReduceOrders(params: ReduceOrdersParams): UnsignedCall;
    /** Build {@link cancelPerpStopOrder} without sending it. */
    buildCancelPerpStopOrder(params: CancelStopOrderParams): UnsignedCall;
    /** Build {@link cancelPerpStopOrders} without sending it. */
    buildCancelPerpStopOrders(params: CancelPerpStopOrdersParams): UnsignedCall;
    /**
     *  Build {@link depositMargin} without sending it — the `deposit` call plus, unless
     *  `autoApprove: false`, the ERC-20 approval the bank needs first.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    buildDepositMargin(params: DepositMarginParams): Promise<UnsignedMarginDeposit>;
    /** Build {@link withdrawMargin} without sending it. Nothing to approve.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    buildWithdrawMargin(params: WithdrawMarginParams): Promise<UnsignedCall>;
    /**
     *  Build {@link acceptPerpWalletLink} without sending it, so the accept and the
     *  child's first isolated placement go out as ONE transaction. The accept must
     *  execute first, or the placement finds no main.
     *
     * - Throws {@link InvalidInputError} - `registry` is the zero address, or none of `registry`, `marginBank` and `pool` was passed.
     * - Throws {@link NotConfiguredError} - the bank holds no registry, so the rail is dormant on this deployment.
     * - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    buildAcceptPerpWalletLink(params: AcceptPerpWalletLinkParams): Promise<UnsignedCall>;
    /**
     *  Build {@link repayPerpMainFunding} without sending it, so the repayment and the
     *  withdrawal it unlocks go out as ONE transaction. The repayment must execute
     *  first — the withdrawal's gate reads the claim it clears.
     *
     * - Throws {@link InvalidInputError} - `amount` is not positive, `marginBank` is the zero address, or neither `marginBank` nor `pool` was passed.
     * - Throws {@link RpcError} - the bank resolution read did not complete.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    buildRepayPerpMainFunding(params: RepayPerpMainFundingParams): Promise<UnsignedCall>;
    /**
     *  Build {@link claimPerpVoucher} without sending it, so the claim and the first
     *  order go out as ONE transaction. The claim must execute first. Otherwise the
     *  order finds no grant, and with an ERC-20 allowance to the bank it pulls the
     *  wallet's own collateral instead.
     *
     * - Throws {@link InvalidInputError} - `distributor` or `marginBank` is the zero address, or none of `distributor`, `marginBank` and `pool` was passed.
     * - Throws {@link NotConfiguredError} - the bank holds no credit granter, so the voucher programme is off on this deployment.
     * - Throws {@link RpcError} - the distributor or bank resolution read did not complete.
     * - Throws {@link ContractRevertError} - a resolution read reverted, for example because `marginBank` is not a MarginBank.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    buildClaimPerpVoucher(params: ClaimPerpVoucherParams): Promise<UnsignedCall>;
    /** Mint a YES+NO set: deposit collateral, receive equal YES + NO.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    mintSet(params: MintSetParams): Promise<TxResult>;
    /** Burn a YES+NO set: surrender both halves, receive collateral back.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    burnSet(params: BurnSetParams): Promise<TxResult>;
    /**
     *  Burn winning outcome tokens for collateral (resolved/voided markets).
     *  Settlement-extraction v2: module-routed — the module pulls the caller's
     *  winning tokens, finalizes-if-needed, and redeems through BinarySettlement.
     *  Takes `marketId` (not a pool address — a pool serves successive markets).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    redeem(params: RedeemParams): Promise<TxResult>;
    /**
     *  Produce an EIP-712 {@link RedeemAuthorization} the connected signer (the
     *  position owner) hands to a relayer, so the relayer can call
     *  {@link Trader.redeemFor} and pay the gas while the OWNER receives the payout.
     *  Signs over the module's `REDEEM_AUTH_TYPEHASH` in the `SomniaMarkets` domain;
     *  no transaction is sent.
     *
     *  - Throws {@link NotConfiguredError} - no BinaryMarketsModule address is
     *    configured and none was passed.
     *  - Throws {@link SignerRequiredError} - this trader's executor cannot sign
     *    typed data as the actor: a safe or a session key (`executor.signTypedData`
     *    is absent). A private key or a wallet can.
     *  - Throws {@link RpcError} - the signer failed or refused (a wallet rejection,
     *    a custom signer's own error), preserved as `cause`.
     *
     *  The complete union is {@link TraderSignRedeemAuthError}.
     */
    signRedeemAuth(params: SignRedeemAuthParams): Promise<RedeemAuthorization>;
    /**
     *  Relayer path: submit a position owner's pre-signed {@link RedeemAuthorization}
     *  (from {@link Trader.signRedeemAuth}). The caller pays gas; the module pays the
     *  OWNER the collateral (payout is hard-pinned to `owner`, never the relayer).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    redeemFor(params: RedeemForParams): Promise<TxResult>;
    /** Claim winnings from many settled markets in one transaction (batch redeem).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    redeemMany(params: RedeemManyParams): Promise<TxResult>;
    /**
     *  Low-level direct redemption against the BinarySettlement singleton (bypasses
     *  the module; no operator attribution). Takes the raw ERC-6909 `outcomeId`.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    redeemDirect(params: RedeemDirectParams): Promise<TxResult>;
    /** Claim an accrued push-fallback (`owed`) balance on the settlement singleton.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    claimOwed(params: ClaimOwedParams): Promise<TxResult>;
    /**
     *  Permissionless oracle retry — the FIRST move when a market is past expiry
     *  with no resolution: ask the module to re-pull the answer for its oracle
     *  question.
     *
     *  **When to use**
     *
     *  Use before {@link Trader.voidExpired}. A poke that succeeds resolves the
     *  market normally (winners paid in full); voiding pays everyone 1/N instead,
     *  so it is the fallback, not the first resort.
     *
     *  **Gotchas**
     *
     *  Keyed by ORACLE QUESTION, not market: the module fans out to every market
     *  bound to that question and resolves the ones whose adapter answers.
     *  Unanswered adapters are skipped, so this can resolve some markets and leave
     *  others — a success is not "all bound markets resolved". Reverts
     *  `OracleNotAnswered` only when none answered, `UnknownOracleQuestion` when
     *  no market is bound; both decode as {@link ContractRevertError}, so a keeper
     *  loop can branch on `errorName`.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    pokeOracle(params: PokeOracleParams): Promise<TxResult>;
    /**
     *  Permissionless dead-oracle escape hatch: void a market whose oracle never
     *  answered, so both sides can redeem at 1/N collateral.
     *
     *  **When to use**
     *
     *  Use only after {@link Trader.pokeOracle} has failed and
     *  `expiry + settlementWindow` has elapsed — this is the funds-unstranding
     *  backstop, and it pays 1/N rather than the real outcome.
     *
     *  **Gotchas**
     *
     *  This writes to the MARKET contract, bypassing the module — so the oracle
     *  hub's earmark release never fires. Follow with
     *  {@link Trader.syncSettlement}, then {@link Trader.finalizeMarket} and
     *  {@link Trader.releasePool}, to leave the market fully reconciled.
     *
     *  Before sending, this reads the market's status, expiry, and settlement
     *  window and throws {@link InvalidInputError} naming the gate time if the
     *  window is still open — the on-chain `SettlementWindowOpen` revert carries
     *  no timestamp, and "when can I retry" is the operator's real question. The
     *  comparison uses the chain's `block.timestamp`, matching the contract, so a
     *  skewed local clock neither lets a doomed call through nor blocks a valid
     *  one. Pass `skipPreflight` to send blind and let the contract judge.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    voidExpired(params: VoidExpiredParams): Promise<TxResult>;
    /**
     *  Permissionless keeper: finalize a settled market (sweep its pool's backing +
     *  resolution snapshot to the settlement singleton). No-op-guarded on repeat.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    finalizeMarket(params: FinalizeMarketParams): Promise<TxResult>;
    /**
     *  Permissionless earmark reconcile: release the oracle earmark of a market voided
     *  via `BinaryMarket.voidExpired()` (which bypasses the module, so the hub's earmark
     *  release never fired). Idempotent; reverts `MarketNotSettled` while still live.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    syncSettlement(params: SyncSettlementParams): Promise<TxResult>;
    /**
     *  Permissionless keeper: release a finalized, drained pool back to its creator's
     *  free list for recycle onto the next market.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    releasePool(params: ReleasePoolParams): Promise<TxResult>;
    /**
     *  Read a market's settlement record from the BinarySettlement singleton (by
     *  bytes32 marketId — resolves the marketKey via the module's yesId). Returns
     *  null when the market has never been finalized.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    getSettlement(marketId: Hex, opts?: {
        module?: Address;
        settlement?: Address;
    }): Promise<SettlementRecord | null>;
    /** Read a creator's free (finalized + released, reusable) pools for a collateral.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    getFreePools(creator: Address, collateral: Address, opts?: {
        module?: Address;
    }): Promise<Address[]>;
    /** Read a pool's creator (its first-deploy creator — the only party that can reuse it).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    poolCreator(pool: Address, opts?: {
        module?: Address;
    }): Promise<Address>;
    /**
     *  Mint a complete YES+NO set paying with NATIVE token via the CollateralRouter
     *  (wraps `msg.value` → wNative). The market's collateral must be wNative.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    mintSetNative(params: MintSetNativeParams): Promise<TxResult>;
    /**
     *  Mint a complete YES+NO set pulling collateral via a Permit2 signature through
     *  the CollateralRouter (no prior ERC-20 `approve`).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    mintSetPermit2(params: MintSetPermit2Params): Promise<TxResult>;
    /**
     *  Redeem winning outcome tokens for a NATIVE payout via the CollateralRouter
     *  (unwraps wNative → native). Approve the router for the winning outcome first.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    redeemNative(params: RedeemNativeParams): Promise<TxResult>;
    /** Mint TestUSDC from the faucet to the signer.
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    faucet(params?: FaucetParams): Promise<TxResult>;
    /** Resolve a market via the FakeOracle (demo resolver).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    resolve(params: ResolveParams): Promise<TxResult>;
    /** Void a market via the FakeOracle (demo resolver).
     *
     * - Throws {@link NotConfiguredError} - the executor has no chain transport.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    voidMarket(params: VoidMarketParams): Promise<TxResult>;
    /** Poke a market to advance its lifecycle. No-op since status is derived; kept for ABI stability.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    poke(params: {
        market: Address;
        gas?: bigint;
    }): Promise<TxResult>;
    /**
     *  Forget cached token approvals so the next escrowing write re-checks allowance.
     *  Pass a (token, spender) to clear one pair, or nothing to clear all. Rarely
     *  needed — maxUint256 approvals don't decrement.
     */
    clearApprovalCache(token?: Address, spender?: Address): void;
}
/**
 * Infrastructure that binds a trader to its owning client.
 *
 * `createClient()`
 *  passes its own so the trader shares that client's chain, fees, addresses,
 *  and WebSocket. The trader has NO dependency on the live tail or its store:
 *  pool escrow tokens are resolved from the pool contract itself (one
 *  pipelined read, cached per pool) when not passed explicitly. Reached via
 *  `client.createTrader(...)`.
 *
 * @internal
 */
export interface TraderDeps {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
    /** The current owner lifecycle, captured before each write starts. */
    getReceiptSignal?: () => AbortSignal | undefined;
    /**
     * The owning client's debug channel. It defaults to a no-op when absent.
     *
     * @internal
     */
    dbg?: Debug;
    /** Writer state shared by every trader derived from the same configured owner. */
    writerRuntime?: WriterRuntime;
    /**
     *  The owning client's live own-orders accessor, for `cancelAllOrders({ source:
     *  "live" })`. Optional: a trader built without it still works, and asking for
     *  the live source then throws {@link NotConfiguredError} rather than silently
     *  reading the chain. `createClient` wires the store it already holds.
     *
     * @internal
     */
    liveOwnOrders?: LiveOwnOrders;
}
/**
 *  The live-store view `cancelAllOrders` needs: the caller's resting ids on a pool,
 *  plus whether a watch actually covers that pool. An unwatched store answers
 *  "no orders" for a book that is full, so the two must be asked together.
 *
 * @internal
 */
export interface LiveOwnOrders {
    /**
     *  True when the store's answer FOR `pool` is trustworthy — a watch covering it
     *  has completed hydration and is live. Coverage alone is not enough: a pool whose
     *  snapshot is still loading, or whose socket dropped mid-reconnect, is covered yet
     *  answers short or empty, which would turn the kill switch into a silent no-op.
     */
    isTailing: (pool: Address) => boolean;
    /** Every order row the store holds for `user` on `pool`, in every lifecycle state. */
    ordersFor: (pool: Address, user: Address, limit: number) => readonly LiveOrder[];
}
/**
 * Builds a trader bound to a signer and its owning client's dependencies. The public entry
 *  is `client.createTrader(traderConfig)`.
 *
 * **Example** (Creating a trader)
 *
 * ```ts
 * const trader = client.createTrader({ walletClient });
 * await trader.placeOrder({ pool, side: "BUY_YES", price, quantity });
 * await trader.mintSet({ pool, amount });
 * await trader.redeem({ marketId, amount, outcomeIdx: 0 });
 * ```
 *
 * @internal
 */
export declare function createTraderWithDeps(config: TraderConfig, deps: TraderDeps): Trader;
/** Failures from the owner-derived `Trader.placeOrder` operation. @category errors */
export type TraderPlaceOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.cancelOrder` operation. @category errors */
export type TraderCancelOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.reduceOrder` operation. @category errors */
export type TraderReduceOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.cancelExpiredOrders` operation. @category errors */
export type TraderCancelExpiredOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.sweepExpiredAtLevel` operation. @category errors */
export type TraderSweepExpiredAtLevelError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.captureClose` operation. @category errors */
export type TraderCaptureCloseError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.approveBuilder` operation. @category errors */
export type TraderApproveBuilderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.getBuilderApproval` operation. @category errors */
export type TraderGetBuilderApprovalError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.getEffectiveBuilderApproval` operation. @category errors */
export type TraderGetEffectiveBuilderApprovalError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.getMaxBuilderFeeBpsTimes1k` operation. @category errors */
export type TraderGetMaxBuilderFeeBpsTimes1kError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.placeSpotOrder` operation. @category errors */
export type TraderPlaceSpotOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.placeSpotOrders` operation. @category errors */
export type TraderPlaceSpotOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.cancelOrders` operation. @category errors */
export type TraderCancelOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.reduceOrders` operation. @category errors */
export type TraderReduceOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.placePerpOrder` operation. @category errors */
export type TraderPlacePerpOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.amendOrder` operation. @category errors */
export type TraderAmendOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.amendOrders` operation. @category errors */
export type TraderAmendOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.buildPlaceOrder` operation. @category errors */
export type TraderBuildPlaceOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.depositMargin` operation. @category errors */
export type TraderDepositMarginError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.withdrawMargin` operation. @category errors */
export type TraderWithdrawMarginError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.withdrawVault` operation. @category errors */
export type TraderWithdrawVaultError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.depositVault` operation. @category errors */
export type TraderDepositVaultError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.depositVaultNative` operation. @category errors */
export type TraderDepositVaultNativeError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.depositVaultNativeFor` operation. @category errors */
export type TraderDepositVaultNativeForError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.setManualVaultMode` operation. @category errors */
export type TraderSetManualVaultModeError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.setOperatorApprovalForPool` operation. @category errors */
export type TraderSetOperatorApprovalForPoolError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.setOperatorApprovalGlobal` operation. @category errors */
export type TraderSetOperatorApprovalGlobalError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.setPerpLeverage` operation. @category errors */
export type TraderSetPerpLeverageError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.proposePerpWalletLink` operation. @category errors */
export type TraderProposePerpWalletLinkError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.acceptPerpWalletLink` operation. @category errors */
export type TraderAcceptPerpWalletLinkError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.cancelPerpWalletLinkProposal` operation. @category errors */
export type TraderCancelPerpWalletLinkProposalError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.unlinkPerpWallet` operation. @category errors */
export type TraderUnlinkPerpWalletError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.repayPerpMainFunding` operation. @category errors */
export type TraderRepayPerpMainFundingError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.recallPerpMainFunding` operation. @category errors */
export type TraderRecallPerpMainFundingError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.pokeFunding` operation. @category errors */
export type TraderPokeFundingError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.placeSpotStopOrder` operation. @category errors */
export type TraderPlaceSpotStopOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.cancelStopOrder` operation. @category errors */
export type TraderCancelStopOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.placePerpStopOrder` operation. @category errors */
export type TraderPlacePerpStopOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.linkPerpStopOrders` operation. @category errors */
export type TraderLinkPerpStopOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.cancelPerpStopOrder` operation. @category errors */
export type TraderCancelPerpStopOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.cancelPerpStopOrders` operation. @category errors */
export type TraderCancelPerpStopOrdersError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.claimPerpStopSomi` operation. @category errors */
export type TraderClaimPerpStopSomiError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.buildPlacePerpStopOrder` operation. @category errors */
export type TraderBuildPlacePerpStopOrderError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.buildDepositMargin` operation. @category errors */
export type TraderBuildDepositMarginError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.buildWithdrawMargin` operation. @category errors */
export type TraderBuildWithdrawMarginError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.buildAcceptPerpWalletLink` operation. @category errors */
export type TraderBuildAcceptPerpWalletLinkError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.buildRepayPerpMainFunding` operation. @category errors */
export type TraderBuildRepayPerpMainFundingError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.mintSet` operation. @category errors */
export type TraderMintSetError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.burnSet` operation. @category errors */
export type TraderBurnSetError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.redeem` operation. @category errors */
export type TraderRedeemError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.redeemFor` operation. @category errors */
export type TraderRedeemForError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.redeemMany` operation. @category errors */
export type TraderRedeemManyError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.redeemDirect` operation. @category errors */
export type TraderRedeemDirectError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.claimOwed` operation. @category errors */
export type TraderClaimOwedError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.pokeOracle` operation. @category errors */
export type TraderPokeOracleError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.voidExpired` operation. @category errors */
export type TraderVoidExpiredError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.finalizeMarket` operation. @category errors */
export type TraderFinalizeMarketError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.syncSettlement` operation. @category errors */
export type TraderSyncSettlementError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.releasePool` operation. @category errors */
export type TraderReleasePoolError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.getSettlement` operation. @category errors */
export type TraderGetSettlementError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.getFreePools` operation. @category errors */
export type TraderGetFreePoolsError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.poolCreator` operation. @category errors */
export type TraderPoolCreatorError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.mintSetNative` operation. @category errors */
export type TraderMintSetNativeError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.mintSetPermit2` operation. @category errors */
export type TraderMintSetPermit2Error = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.redeemNative` operation. @category errors */
export type TraderRedeemNativeError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.faucet` operation. @category errors */
export type TraderFaucetError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.resolve` operation. @category errors */
export type TraderResolveError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.voidMarket` operation. @category errors */
export type TraderVoidMarketError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Trader.poke` operation. @category errors */
export type TraderPokeError = SomniaMarketsSocketFailure;
export {};
