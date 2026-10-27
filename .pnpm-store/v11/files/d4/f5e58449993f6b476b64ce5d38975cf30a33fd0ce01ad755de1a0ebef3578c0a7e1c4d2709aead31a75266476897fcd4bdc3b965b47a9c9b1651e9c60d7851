import { type Address, type Hex, type PublicClient } from "viem";
import * as IndexerRead from "../indexerRead.js";
import type { SomniaMarketsSocketFailure } from "../config.js";
import * as Writer from "../writer.js";
import type { Writer as WriterCtx } from "../writer.js";
import type { CancelPerpStopOrdersParams, ClaimPerpStopSomiParams, CancelStopOrderParams, LinkPerpStopOrdersParams, PerpStopIntent, PlacePerpStopOrderParams, PlacePerpStopOrderResult, TxResult } from "../trade.js";
import type { StopOrderStatus } from "../spot/stops.js";
/**
 *  Why a triggered stop placed nothing. Mirrors the registry's `DropReason` enum.
 *
 *  The distinction matters for what a UI should say. `ReduceOnly*` are ordinary
 *  outcomes of a stop that events overtook — the position was already closed, or
 *  flipped, or what remained was dust — while `PlacementFailed` is a real rejection.
 *  Collapsing them all to "failed" makes routine behaviour look broken.
 *
 * @category perpetual markets
 */
export declare const PERP_STOP_DROP_REASON: readonly ["None", "ReduceOnlyNoPosition", "ReduceOnlyWrongSide", "ReduceOnlyBelowMinQty", "PlacementFailed", "NoFill"];
/**
 * A drop reason, decoded from the on-chain enum index.
 *
 * @category perpetual markets
 */
export type PerpStopDropReason = (typeof PERP_STOP_DROP_REASON)[number];
/**
 * The perp market a stop order targets.
 *
 * @category perpetual markets
 */
export type PerpStopOrderMarket = {
    /** Pool address (lowercased; == the market id for perp). */
    poolAddress: string;
    /** Synthetic-base symbol (e.g. "WBTC"); null when the wrapper exposes none. */
    baseSymbol: string | null;
    /** Collateral token symbol; null when the token exposes none. */
    quoteSymbol: string | null;
    /** Base-token decimals — format quantities with this. */
    baseDecimals: number;
    /** Collateral decimals — format the trigger price with this. */
    quoteDecimals: number;
};
/**
 * One take-profit / stop-loss order on a perp market.
 *
 * Rows from `listPerpStopOrders` don't include `limitPrice`. Fetch it for live stops
 * with `getPerpStopOrders`.
 *
 * @category perpetual markets
 */
export type PerpStopOrder = {
    /** Row id (`${registry}_${orderId}`). */
    id: string;
    /** The PerpStopOrderRegistry holding it (lowercased). */
    registry: string;
    /** uint128 registry OrderId as a decimal string — pass to `trader.cancelStopOrder`. */
    orderIdRaw: string;
    /** The order's owner (lowercased). */
    owner: string;
    /** True = the triggered order buys, false = sells. */
    isBid: boolean;
    /** Quantity in raw base units. */
    quantity: string;
    /** The MARK price at which it fires, raw quote units per whole base. */
    triggerPrice: string;
    /**
     *  Which way the mark must cross `triggerPrice` to fire: `0` = GTE (fires at or
     *  above), `1` = LTE (fires at or below). This, not the side, is what makes a stop a
     *  take-profit or a stop-loss.
     */
    triggerOperator: number;
    /** `0` = LIMIT, `1` = MARKET — the type of order placed when it fires. */
    orderType: number;
    /** Builder tagged on the resulting order (lowercased); zero address for none. */
    builder: string;
    /**
     *  The builder fee the triggered order will charge, in bps x 1000 — so `1500` is
     *  1.5bps, not 1500bps. `"0"` when no builder is tagged.
     *
     *  Only knowable from the creation event: the registry deletes a pending order on
     *  every fire, so after a trigger nothing on chain can say what fee was agreed.
     */
    builderFeeBpsTimes1k: string;
    /** Lifecycle state — see {@link StopOrderStatus}. */
    status: StopOrderStatus;
    /** The PerpPool order id created on a successful trigger; null otherwise. */
    placedOrderId: string | null;
    /**
     *  Why a trigger placed nothing, decoded — null on a pending or successful order.
     *
     *  Read it before calling a `TRIGGER_FAILED` order a failure: a reduce-only drop
     *  means the stop was overtaken by events (position already closed, flipped, or
     *  below minimum), which is ordinary. Only `PlacementFailed` is a rejection. SOMI is
     *  consumed on every fire regardless of outcome.
     */
    dropReason: PerpStopDropReason | null;
    /**
     *  The LIVE OCO sibling's registry id, as a decimal string — null when this stop is
     *  unlinked, and null on every terminal row.
     *
     *  Live is the whole contract, which is why every terminal write clears it. A pair's
     *  two rows leave at different times, so a pointer surviving on a departed row names an
     *  order whose own state has moved on: a client acting on "cancel the pair" would tear
     *  down a stop the trader deliberately kept armed.
     *
     *  A leg that fires WITHOUT filling leaves its partner live and unlinked (back to
     *  null) — that is what lets the survivor be re-paired.
     *
     *  Provenance is deliberately not here. Which leg retired this one is
     *  {@link PerpStopOrder.cancelReason}'s job; overloading one column with "my live
     *  partner" and "the leg that retired me" is what would make a client act on the wrong
     *  one.
     */
    siblingOrderId: string | null;
    /**
     *  Whether the triggered order may only REDUCE the owner's position (`"reduceOnly"` —
     *  a take-profit / stop-loss) or may open and increase one (`"opening"` — a
     *  stop-entry / breakout, gated on initial margin at creation).
     *
     *  `null` means the registry reported a member this SDK version does not know, and it
     *  is deliberately not folded into `"reduceOnly"`: calling an unknown member reduce-only
     *  would promise a caller that an order cannot increase their position when a newer
     *  member might let it. Treat null as "upgrade the SDK before acting on this".
     */
    intent: PerpStopIntent | null;
    /**
     *  WHY this stop reached `CANCELLED` — `"Owner"`, `"LinkedFill"` or `"Inert"`. Null on
     *  every row that is not cancelled.
     *
     *  All three end the same way for the trader — the order is no longer working — but
     *  they are three different stories and **two different refunds**, so a UI that renders
     *  CANCELLED as "you cancelled this, SOMI refunded to your wallet" is wrong for two of
     *  them:
     *
     *  - `"Owner"` — the owner cancelled it, and the SOMI is pushed back to them in that
     *    same transaction.
     *  - `"LinkedFill"` — the protocol retired it because its OCO sibling FILLED.
     *  - `"Inert"` — a keeper swept it after the registry's Schedule chain wound down.
     *
     *  The last two only CREDIT `unclaimedSomi`; the trader recovers it via `claimSomi()`.
     *
     *  A raw string rather than a decoded union, matching `Order.cancelReason`. The
     *  vocabulary is the indexer's own — three distinct events, not a contract enum
     *  arriving as a uint8 — so there is nothing to decode, and a value this SDK version
     *  has not heard of should reach a consumer intact rather than become null.
     */
    cancelReason: string | null;
    /** Timestamp (unix seconds) the stop was created. */
    createdAt: string;
    /** Timestamp (unix seconds) of the last state change. */
    updatedAt: string;
    /** Tx hash the stop was created in. */
    txHash: string;
    /** The perp market it targets. */
    market: PerpStopOrderMarket;
};
/**
 *  Perp stop orders, newest first — the read that makes TP/SL usable.
 *
 *  Indexer tier. Every scope the UI needs comes from the same call:
 *
 *  - **A trader's working stops** — `{ account }`. The default status is `PENDING`.
 *  - **A market's whole pending book** — `{ pool }` with no account.
 *  - **History** — pass `status` (e.g. `["TRIGGERED", "TRIGGER_FAILED", "CANCELLED"]`).
 *
 *  `account` is optional deliberately: the registry is per-market, and a market-wide
 *  view of what will fire is a legitimate read (monitoring, keeper tooling), not just
 *  a per-user one.
 *
 *  There is no chain fallback. The registry exposes no enumeration getter, so if the
 *  indexer has not seen a creation, nothing can list it.
 *
 * **Details**
 *
 * - `opts.account`: restrict to one owner; omit for the whole market
 * - `opts.pool`: restrict to one perp pool
 * - `opts.status`: lifecycle states to include; default `["PENDING"]`
 * - `opts.limit`: max rows, default 200
 * - `opts.offset`: row offset for paging, default 0
 */
export declare function listPerpStopOrders(opts: {
    account?: string;
    pool?: string;
    status?: StopOrderStatus[];
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<PerpStopOrder[]>;
/**
 *  Decode a raw `OrderIntent` index, `null` for anything this SDK does not know.
 *
 *  A table plus a null fallback rather than `=== 1 ? "opening" : "reduceOnly"`, because
 *  the else-branch of that ternary is the UNSAFE direction: it would assert that an order
 *  can only reduce a position when a future member might let it open one. This registry
 *  demonstrably appends to its enums — `DropReason` gained `NoFill` — so treating an
 *  unrecognized member as the default is a claim, not a decode.
 *
 *  Kept out of the input union deliberately: `PerpStopIntent` is also what a CALLER passes
 *  to {@link placePerpStopOrder}, and there is no order to place with an unknown intent.
 */
export declare function decodeIntent(raw: number): PerpStopIntent | null;
/**
 *  SOMI a PerpStopOrderRegistry charges per pending order (funds the reactivity
 *  trigger gas; refunded on cancel, consumed on every fire). Raw wei, 18dp native.
 *
 *  A linked pair costs twice this — one payment funds one trigger.
 */
export declare function getPerpStopOrderSomiPayment(registry: Address, client: PublicClient): Promise<bigint>;
/**
 * One stored perp stop, read straight from the registry.
 *
 * @category perpetual markets
 */
export type PerpStopOrderOnChain = {
    /** True = the triggered order buys. */
    isBid: boolean;
    /** Owner (checksummed as the contract stores it). */
    owner: Address;
    /** Raw base units; `0n` means "the whole position at trigger". */
    quantity: bigint;
    /** Mark price that arms it. */
    triggerPrice: bigint;
    /** 0 = GTE, 1 = LTE. */
    triggerOperator: number;
    /** 0 = LIMIT, 1 = MARKET. */
    orderType: number;
    /** The LIMIT price — the one field the indexer cannot see, since no event carries it. */
    limitPrice: bigint;
    /** Builder tagged on the triggered order; zero address for none. */
    builder: Address;
    /** Builder fee in bps x 1000. */
    builderFeeBpsTimes1k: bigint;
    /** SOMI paid at creation. */
    somiPaid: bigint;
    /** The linked sibling's id, or `0n` when unlinked. */
    siblingOrderId: bigint;
    /**
     *  `"reduceOnly"` or `"opening"` — `null` if the registry reported an intent this SDK
     *  version does not know.
     *
     *  Null is deliberately not folded into `"reduceOnly"`. The registry appends to its
     *  enums, and calling an unknown member reduce-only would tell a caller an order cannot
     *  increase their position when a newer member might let it. Treat null as "upgrade the
     *  SDK before acting on this", not as a default.
     */
    intent: PerpStopIntent | null;
};
/** One registry stop identifier for a batched chain read. */
export type PerpStopOrderRef = {
    /** The PerpStopOrderRegistry that owns the stop. */
    registry: Address;
    /** The registry's uint128 order identifier. */
    orderId: bigint | string;
};
/** A failed member of {@link PerpStopOrderRead}. */
export type PerpStopOrderReadError = SomniaMarketsSocketFailure;
/**
 * One result from {@link SomniaMarketsClient.getPerpStopOrders}.
 *
 * A non-live stop is known absent. A failed chain call stays distinct because the
 * caller cannot safely treat an unreadable stop as cancelled or triggered.
 */
export type PerpStopOrderRead = {
    status: "present";
    order: PerpStopOrderOnChain;
} | {
    status: "absent";
} | {
    status: "failed";
    error: PerpStopOrderReadError;
};
/**
 *  Read one pending stop straight from the registry — the chain tier the listing
 *  never had.
 *
 *  Worth using even though {@link listPerpStopOrders} exists, for two reasons the
 *  indexer cannot cover. It answers during a reindex or an indexer outage. And it is
 *  the ONLY way to see a LIMIT stop's `limitPrice`, its linked `siblingOrderId`, and
 *  its `intent` — none of which any event carries, so nothing off-chain can show them.
 *
 *  It cannot enumerate: the registry exposes no per-owner getter, so listing still
 *  requires the indexer. Fetch ids there, then enrich here.
 *
 * **Details**
 *
 * - Returns: `null` when the id is not live. **Do not infer liveness from the returned terms** — a cancelled or triggered order keeps its stored id until its slot is recycled, so a dead id reads back with a matching id and plausible values. The contract's `live` flag is the only truth, and this returns `null` on it.
 *
 * @throws {@link InvalidInputError} The order id is not a valid uint128 integer.
 */
export declare function getPerpStopOrder(p: PerpStopOrderRef, client: PublicClient): Promise<PerpStopOrderOnChain | null>;
/**
 * Read known perp stops in one ordered batch.
 *
 * Use {@link listPerpStopOrders} to discover ids. This method enriches those ids
 * with authoritative chain liveness and fields that events do not contain. It uses
 * a batched Multicall3 read when the configured chain supports it. Other chains use
 * a bounded point-read fallback. Both paths pin one head before reading, so every
 * result describes the same block even when viem splits a large multicall into chunks.
 *
 * The result at each index belongs to the ref at the same index. A failed member does
 * not discard neighboring reads and is not reported as known absence.
 *
 * @throws {@link InvalidInputError} An order id is not a canonical unsigned uint128 decimal.
 * A member-level contract revert or RPC failure is returned as `failed`. The method
 * rejects only when it cannot pin the head or the batch result itself is malformed.
 *
 * @throws {@link RpcError} The head could not be pinned or the batch result was malformed.
 * @throws {@link ContractRevertError} The Multicall3 aggregate rejected the batch.
 */
export declare function getPerpStopOrders(refs: readonly PerpStopOrderRef[], client: PublicClient): Promise<readonly PerpStopOrderRead[]>;
/**
 *  Registry order ids from a receipt's logs, in the registry's own (GTE, LTE) order.
 *
 *  The ids only surface through `PendingOrderCreated` — the create functions' return
 *  value is unreadable from a receipt — so this is the only way to learn what a
 *  placement created. `trader.placePerpStopOrder` calls it for you; it is exported for
 *  the build path, where the caller sends the transaction and so holds the only copy
 *  of the receipt.
 *
 *  Filters to `registry`'s own logs: another contract could emit a matching signature,
 *  and in a batched UserOp several contracts' logs share one receipt.
 *
 * **Details**
 *
 * - `logs`: The receipt's logs.
 * - `registry`: The PerpStopOrderRegistry the placement targeted.
 * - Returns: The created ids, oldest first; empty if the receipt created none.
 *
 * **Example** (Decoding submitted stop IDs)
 *
 *  ```ts
 *  const { stopOrder } = await trader.buildPlacePerpStopOrder({
 *    registry, pool, isBid: false, quantity: 10_000_000n,
 *    triggerPrice: 90_000_000_000_000_000_000n, triggerOperator: 1, stopOrderType: 1,
 *    skipOperatorApproval: true,
 *  });
 *  const receipt = await myBatcher.send([stopOrder]);
 *  const [stopOrderId] = decodePerpStopOrderIds(receipt.logs, registry);
 *  ```
 *
 * @category perpetual markets
 */
export declare function decodePerpStopOrderIds(logs: readonly {
    address: string;
    data: Hex;
    topics: readonly Hex[];
}[], registry: Address): bigint[];
/**
 *  Place a perp take-profit / stop-loss, optionally as a linked pair, optionally
 *  opening.
 *
 *  The single create entry point. `intent` defaults to reduce-only, so a caller that
 *  passes neither `intent` nor `pair` gets exactly the order this SDK always
 *  described; the contract-level split between `createPendingOrder` and
 *  `createTriggerOrder` is an implementation detail resolved here.
 *
 *  Grants the registry's one-time operator approval first if the owner has not already
 *  (skip with `skipOperatorApproval`). That is not a convenience: without it the
 *  trigger reverts and the prepaid SOMI is consumed having placed nothing.
 */
export declare function placePerpStopOrder(w: WriterCtx, p: PlacePerpStopOrderParams): Promise<PlacePerpStopOrderResult>;
/**
 *  Link two existing pending stops into a one-cancels-other pair.
 *
 *  Moves no SOMI. The pair constraints are the registry's and are enforced there:
 *  same owner, same side, opposite operators, straddling, both reduce-only.
 */
export declare function linkPerpStopOrders(w: WriterCtx, p: LinkPerpStopOrdersParams): Promise<TxResult>;
/**
 *  Cancel one pending perp stop and refund its SOMI.
 *
 *  If it is one leg of a linked pair, the OTHER leg stays armed and becomes unlinked —
 *  cancelling one order cancels one order. Use {@link cancelPerpStopOrders} to tear
 *  down both.
 */
export declare function cancelPerpStopOrder(w: WriterCtx, p: CancelStopOrderParams): Promise<TxResult>;
/**
 *  Cancel several pending perp stops in one transaction, refunded in a single
 *  transfer. The way to tear down a linked pair.
 *
 *  All-or-nothing: every id must be live and owned by the signer, so one stale id
 *  reverts the batch rather than silently skipping.
 */
export declare function cancelPerpStopOrders(w: WriterCtx, p: CancelPerpStopOrdersParams): Promise<TxResult>;
/**
 *  A perp stop placement expanded into the unsigned calls it actually takes.
 *
 *  Two or one, and the difference matters more here than for a token approval: the
 *  registry places on the owner's behalf, so without the operator grant the trigger
 *  reverts **and the prepaid SOMI is consumed having placed nothing**. Batch both.
 *
 * @category perpetual markets
 */
export interface UnsignedPerpStopOrder {
    /** The registry call that creates the stop — or, for a `pair`, both legs at once. */
    stopOrder: Writer.UnsignedCall;
    /**
     *  The one-time operator grant the trigger needs first; absent only when
     *  `skipOperatorApproval: true` was passed.
     */
    operatorApproval?: Writer.UnsignedCall;
}
/**
 *  Build a perp take-profit / stop-loss without sending it.
 *
 *  Takes exactly the parameters {@link placePerpStopOrder} takes and returns the
 *  unsigned calls instead of broadcasting them, so an order and the stop that
 *  protects it can go out as ONE transaction — an ERC-4337 UserOp, a Safe batch, a
 *  relayed multicall.
 *
 *  **Details**
 *
 *  `value` on the returned call carries the SOMI the trigger is prepaid with (twice
 *  it for a `pair` — one payment funds one trigger), and your batcher must forward it.
 *  Pass `somiPayment` to skip the registry read that resolves it.
 *
 * - `p`: The same inputs as {@link placePerpStopOrder}.
 * - Returns: The stop-order call, and the operator grant unless skipped.
 *
 *  **Gotchas**
 *
 *  - `operatorApproval` is returned whenever `skipOperatorApproval` is not `true`,
 *    **without** checking whether the grant is already in place — that check is an
 *    `eth_call`, which a build-only verb should not make. So it may be redundant,
 *    never short. Re-granting is a no-op on chain; pass `skipOperatorApproval: true`
 *    once you know the owner has it.
 *  - No ids come back: they only exist after the transaction you send. Recover them
 *    from your own receipt with {@link decodePerpStopOrderIds}.
 *  - Order matters. `operatorApproval` must execute before `stopOrder`.
 *
 * - Throws {@link InvalidInputError} on the same leg/pair violations the sending verb rejects.
 * - Throws {@link NotConfiguredError} when no operator registry is configured and the grant was not skipped.
 *
 * **Example** (Building paired stops)
 *
 *  A stop and its take-profit as ONE transaction, so neither leg can land alone.
 *
 *  ```ts
 *  const { stopOrder, operatorApproval } = await trader.buildPlacePerpStopOrder({
 *    registry, pool, isBid: false, quantity: 10_000_000n,
 *    triggerPrice: 90_000_000_000_000_000_000n, triggerOperator: 1, stopOrderType: 1,
 *    pair: {
 *      isBid: false, quantity: 10_000_000n,
 *      triggerPrice: 120_000_000_000_000_000_000n, triggerOperator: 0, stopOrderType: 1,
 *    },
 *  });
 *  // The grant goes FIRST — without it the trigger reverts and the SOMI is spent anyway.
 *  const calls = operatorApproval ? [operatorApproval, stopOrder] : [stopOrder];
 *  const receipt = await myBatcher.send(calls);
 *  const [stopOrderId, pairedStopOrderId] = decodePerpStopOrderIds(receipt.logs, registry);
 *  ```
 */
export declare function buildPlacePerpStopOrder(w: WriterCtx, p: PlacePerpStopOrderParams): Promise<UnsignedPerpStopOrder>;
/**
 *  Build the cancel of one pending perp stop without sending it.
 *
 *  Same inputs and same single call as {@link cancelPerpStopOrder}; the SOMI refund
 *  is the registry's business either way. Cancelling one leg of a linked pair still
 *  leaves the other armed and unlinked — use {@link buildCancelPerpStopOrders} to
 *  tear down both in one call.
 *
 * **Details**
 *
 * - `p`: The same inputs as {@link cancelPerpStopOrder}.
 * - Returns: The unsigned cancel call.
 *
 * **Example** (Building one cancellation)
 *
 *  ```ts
 *  const cancel = trader.buildCancelPerpStopOrder({ registry, orderId: "42" });
 *  await myBatcher.send([cancel]);
 *  ```
 */
export declare function buildCancelPerpStopOrder(w: WriterCtx, p: CancelStopOrderParams): Writer.UnsignedCall;
/**
 *  Build the cancel of several pending perp stops without sending it.
 *
 *  All-or-nothing on chain, exactly as {@link cancelPerpStopOrders} is: every id must
 *  be live and owned by the signer, so one stale id reverts the whole call — and, in a
 *  batch, whatever you packed with it.
 *
 * **Details**
 *
 * - `p`: The same inputs as {@link cancelPerpStopOrders}.
 * - Returns: The unsigned batch-cancel call.
 *
 * **Gotchas**
 *
 * - Throws {@link InvalidInputError} when `orderIds` is empty.
 *
 * **Example** (Building a batch cancellation)
 *
 *  ```ts
 *  const cancelBoth = trader.buildCancelPerpStopOrders({ registry, orderIds: ["42", "43"] });
 *  await myBatcher.send([cancelBoth]);
 *  ```
 */
export declare function buildCancelPerpStopOrders(w: WriterCtx, p: CancelPerpStopOrdersParams): Writer.UnsignedCall;
/**
 *  Claim the SOMI the registry owes the signer.
 *
 *  **When to use** — whenever {@link getUnclaimedPerpStopSomi} reports a non-zero
 *  balance. Two things credit it: a cancel whose direct SOMI refund FAILED (a contract
 *  owner with no payable receiver), and an operator winding the registry down, which
 *  credits every owner unconditionally — **EOAs included**. Do not skip the check on
 *  the assumption that an EOA is never owed anything.
 *
 *  **Details** — caller-scoped: it pays out the signer, never an arbitrary account.
 *  Read the balance first with {@link getUnclaimedPerpStopSomi}.
 *
 *  **Gotchas** — reverts `NothingToClaim` on a zero balance, so read first rather
 *  than claiming speculatively. The payout is a plain native transfer to the caller, so
 *  an owner that STILL cannot receive native reverts `WithdrawalFailed` and the balance
 *  stays put — this recovers funds for an owner whose receive capability changed, or
 *  for anyone credited by a registry wind-down, but it cannot rescue a permanently
 *  non-payable contract. Both errors decode by name — they are in the generated
 *  contract-error table — so a revert arrives as a named error rather than raw data.
 */
export declare function claimPerpStopSomi(w: WriterCtx, p: ClaimPerpStopSomiParams): Promise<TxResult>;
/**
 *  SOMI the perp stop registry owes `account`, in wei.
 *
 *  **When to use** — before `trader.claimPerpStopSomi`, which reverts on a zero
 *  balance. Non-zero means the registry is holding SOMI for this account.
 *
 *  **Details** — an on-chain read, not indexed. Two things credit it: a cancel whose
 *  direct refund transfer failed (a contract owner with no payable receiver), and an
 *  operator winding the registry down, which credits every owner unconditionally.
 *  The second reaches **EOAs too**, so a non-zero balance is NOT diagnostic of a
 *  contract owner and an EOA is not safe to skip. The trigger path is the opposite:
 *  `somiPaid` is consumed on every fire and never refunded.
 */
export declare function getUnclaimedPerpStopSomi(ref: {
    registry: Address;
    account: Address;
}, client: PublicClient): Promise<bigint>;
