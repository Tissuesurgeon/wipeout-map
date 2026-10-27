import { type Address, type TransactionReceipt } from "viem";
import type { OrderFill } from "../trade.js";
import { InvalidInputError } from "../errors.js";
/**
 * What a placement left on the book, decoded from its receipt.
 *
 * @category trading
 */
export interface DecodedPlacement {
    /** The resting order's id, from the LAST `OrderPlaced`; absent when nothing rested (a full fill, an IOC remainder). */
    orderId?: bigint;
    /** Every `OrderFilled` the placement produced, in log order. */
    fills: OrderFill[];
}
/**
 *  Decode an order placement from its receipt: the resting order id
 *  (`OrderPlaced`) and the fills (`OrderFilled`). Works for binary, spot and
 *  perp pools — they share the OrderBook events.
 *
 *  **Details**
 *
 *  - `receipt`: The mined receipt, from whoever sent the transaction.
 *  - `pool`: Decode only the logs this pool emitted. Pass it when the receipt
 *    may carry another pool's events (a safe transaction that touched two
 *    pools); omit it to accept the OrderBook events of any emitter.
 *
 *  Pure — the same function the sending verbs use, so a call built by
 *  `buildPlaceOrder` and sent elsewhere decodes to exactly what `placeOrder`
 *  would have returned.
 *
 * **Example** (Decoding a receipt the app obtained itself)
 *
 *  ```ts
 *  const { order } = await trader.buildPlaceSpotOrder(params);
 *  const receipt = await myAccountLayer.send(order);          // your safe, relayer, …
 *  const { orderId, fills } = decodePlaceOrder(receipt, params.pool);
 *  ```
 *
 * @category trading
 */
export declare function decodePlaceOrder(receipt: TransactionReceipt, pool?: Address): DecodedPlacement;
/**
 * What a single amendment left on the book, decoded from its receipt.
 *
 * @category trading
 */
export interface DecodedAmendment {
    /**
     *  The id the amended order now has: the replacement's on a cancel-then-place book,
     *  the unchanged `oldOrderId` on a book that amends in place, or the replacement's
     *  `OrderPlaced` on a legacy pool that emits no landing event. `0n` when the receipt
     *  carries none of these.
     */
    newOrderId: bigint;
    /** Every `OrderFilled` the amendment produced, in log order. */
    fills: OrderFill[];
}
/**
 *  Decode one amendment from its receipt. The pool returns the new order id,
 *  but an EOA cannot read return data, so it comes from the amend's landing event
 *  instead: `OrderAmended`, or `OrderAmendedInPlace` on a book that amends in place
 *  and emits no `OrderPlaced`. A single amend reverts outright when it cannot land,
 *  so a receipt that reached here carries exactly one landing event — except from a
 *  legacy implementation that predates `OrderAmended`, whose only evidence is the
 *  replacement's `OrderPlaced`; that is used when no landing event is present.
 *
 * @category trading
 */
export declare function decodeAmendOrder(receipt: TransactionReceipt, pool: Address): DecodedAmendment;
/**
 * What a batch amendment left on the book, decoded from its receipt.
 *
 * @category trading
 */
export interface DecodedBatchAmendment {
    /**
     *  The id each amendment's order now has, index-aligned with the amendments, from the
     *  landing events or, on a legacy pool that emits no amend outcome event, from the
     *  `OrderPlaced` events in order. `0n` where the amendment landed nothing (the pool
     *  rejected or skipped it) or no id was found.
     */
    newOrderIds: bigint[];
    /** Every `OrderFilled` the batch produced, in log order. */
    fills: OrderFill[];
}
/**
 *  Failures from {@link decodeAmendOrders}: an `amendmentCount` that is not a
 *  non-negative safe integer.
 *
 * @category errors
 */
export type DecodeAmendOrdersError = InvalidInputError;
/**
 *  Decode a batch amendment from its receipt. Depending on the pool version,
 *  `amendOrders` is all-or-nothing (a rejected rung reverts the batch) or per-rung (a
 *  rejected rung emits `AmendRejected(…, requestIndex)` and the other rungs still
 *  apply, as on every pool that amends in place). Rejections are keyed on
 *  `requestIndex`, because a per-rung cancel-then-place pool reports phase-1 skips
 *  before phase-2 rejections. Landing events (`OrderAmended`,
 *  `OrderAmendedInPlace`) arrive in ascending rung order on every pool shape, so they
 *  fill the rungs that were not rejected, in order. `OrderPlaced` is not counted: an
 *  in-place amend emits none.
 *
 *  A receipt with no landing or rejection event at all comes from a legacy
 *  all-or-nothing implementation that predates `OrderAmended`; its replacements are
 *  its `OrderPlaced` events, mapped in order as before. Per-rung and in-place pools
 *  always emit an outcome event per rung, so they never take that path.
 *
 *  The receipt must hold ONE `amendOrders` call to `pool`, with its logs intact:
 *  `requestIndex` restarts at 0 in every call, and a missing landing event shifts the
 *  rungs after it.
 *
 *  - Throws {@link InvalidInputError} - `amendmentCount` is negative,
 *    fractional, or not a safe integer (the result is allocated to that
 *    length). The complete union is {@link DecodeAmendOrdersError}.
 *
 * @category trading
 */
export declare function decodeAmendOrders(receipt: TransactionReceipt, pool: Address, amendmentCount: number): DecodedBatchAmendment;
