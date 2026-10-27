// Pure receipt decoders for the OrderBook writes. A receipt is the only
// evidence a placement leaves (an EOA cannot read a transaction's return data),
// so the order id and the fills come from the pool's logs: `OrderPlaced` and
// `OrderFilled` for a placement; for an amend, `OrderAmended` /
// `OrderAmendedInPlace` / `AmendRejected`, with `OrderPlaced` only from a legacy
// pool that emits none of those. These are functions of a receipt alone — no Writer, no
// client — so whoever holds the receipt can decode it: the sending verbs, and
// an app that executed a built call through its own account layer.
import { decodeEventLog, toEventSelector } from "viem";
import * as EventsAbi from "../eventsAbi.js";
import * as LogTopics from "../logTopics.js";
import { InvalidInputError } from "../errors.js";
/**
 *  The per-rung outcome of an amend, from somnia-dex-protocol `IOrderBook.sol`. Every
 *  rung that holds an order afterwards emits exactly one landing event:
 *  `OrderAmended(old, new)` on a cancel-then-place book (every deployment since the
 *  amend entry points were added), `OrderAmendedInPlace(id, …)` on a book that amends
 *  in place (which emits no `OrderPlaced`). Only the indexed id is read from it, so both
 *  of its shapes are recognised: the released five-field event and the six-field one a
 *  pre-release in-place build emits (it repeats `fullQuantity` as `quantityRemaining`;
 *  Hideki 2 runs it). A rung that lands nothing emits
 *  `AmendRejected(…, requestIndex)` on a per-rung or in-place pool; an all-or-nothing
 *  pool reverts.
 *
 *  Private to the receipt decoders: the exported `orderBookEventsAbi` is also the live
 *  tail's decode surface, and adding these events there would change what the tail
 *  decodes without a reducer that applies them.
 */
const AMEND_OUTCOME_EVENTS_ABI = [
    {
        type: "event",
        name: "OrderAmended",
        inputs: [
            { name: "oldOrderId", type: "uint128", indexed: true },
            { name: "newOrderId", type: "uint128", indexed: true },
        ],
    },
    {
        type: "event",
        name: "OrderAmendedInPlace",
        inputs: [
            { name: "orderId", type: "uint128", indexed: true },
            { name: "userData", type: "uint64", indexed: false },
            { name: "price", type: "uint256", indexed: false },
            { name: "fullQuantity", type: "uint256", indexed: false },
            { name: "expireTimestampNs", type: "uint64", indexed: false },
        ],
    },
    {
        type: "event",
        name: "OrderAmendedInPlace",
        inputs: [
            { name: "orderId", type: "uint128", indexed: true },
            { name: "userData", type: "uint64", indexed: false },
            { name: "price", type: "uint256", indexed: false },
            { name: "fullQuantity", type: "uint256", indexed: false },
            { name: "quantityRemaining", type: "uint256", indexed: false },
            { name: "expireTimestampNs", type: "uint64", indexed: false },
        ],
    },
    {
        type: "event",
        name: "AmendRejected",
        inputs: [
            { name: "owner", type: "address", indexed: true },
            { name: "oldOrderId", type: "uint128", indexed: true },
            { name: "reason", type: "uint8", indexed: true },
            { name: "requestIndex", type: "uint256", indexed: false },
        ],
    },
];
/**
 *  topic0 → the one ABI entry that matches it, built once at module load.
 *
 *  Without this, `decodeEventLog` re-derives every candidate's selector on EVERY log
 *  — viem memoizes none of it, so each log costs a keccak per ABI entry until it
 *  matches — and a log that matches nothing costs a thrown `BaseError` (stack capture
 *  + formatted message) that is immediately swallowed. Both are per-log costs that
 *  scale with batch size, on the one path whose entire purpose is MM latency.
 *
 *  Non-matching pool logs are the common case, not the exception: the pool also emits
 *  `MarkPriceUpdated` and `BuilderFeeCharged`, which this ABI does not carry. A Map
 *  miss makes those free.
 */
const DECODE_ABI = [...EventsAbi.orderBookEventsAbi, ...AMEND_OUTCOME_EVENTS_ABI];
const ORDER_BOOK_TOPIC0 = LogTopics.topic0Set(DECODE_ABI);
const ORDER_BOOK_EVENT_BY_TOPIC0 = new Map(DECODE_ABI.map((e) => [toEventSelector(e), e]));
/**
 *  Every OrderBook event a receipt carries, in log order, from `pool` when one
 *  is given and from any emitter otherwise.
 *
 *  Filtering on the pool address is what makes the batch amend decoder sound: it
 *  maps the n-th landing event onto the n-th rung that was not rejected, so a stray
 *  amend log from another pool in the same tx would shift every id by one. It is also
 *  what lets a receipt from one safe transaction that touched two pools decode
 *  against each pool separately.
 *
 *  Logs that are not OrderBook events — ERC-20 Transfers, vault credits, anything
 *  from another contract — do not decode against this ABI and are skipped.
 */
function poolEvents(receipt, pool) {
    const target = pool?.toLowerCase();
    const out = [];
    for (const log of receipt.logs) {
        // viem lowercases receipt log addresses; compare lowercased on both sides.
        if (target !== undefined && log.address.toLowerCase() !== target)
            continue;
        const topic0 = log.topics[0];
        if (topic0 === undefined || !LogTopics.isKnownTopic0(ORDER_BOOK_TOPIC0, log.topics))
            continue;
        const item = ORDER_BOOK_EVENT_BY_TOPIC0.get(topic0);
        if (!item)
            continue;
        try {
            out.push(decodeEventLog({ abi: [item], data: log.data, topics: log.topics }));
        }
        catch {
            // A malformed log for a known topic: skip that one rather than lose the
            // whole receipt's result.
        }
    }
    return out;
}
/**
 *  The id an amend rung's order has after a landing event, or `undefined` when the
 *  event is not one: the replacement's for `OrderAmended`, the kept id for
 *  `OrderAmendedInPlace`.
 */
function landedOrderId({ eventName, args }) {
    if (eventName === "OrderAmended")
        return args.newOrderId;
    if (eventName === "OrderAmendedInPlace")
        return args.orderId;
    return undefined;
}
function toOrderFill(args) {
    return {
        takerOrderId: args.takerOrderId,
        makerOrderId: args.makerOrderId,
        quantityFilled: args.quantityFilled,
        takerRemainingQuantity: args.takerRemainingQuantity,
        makerRemainingQuantity: args.makerRemainingQuantity,
        fillPrice: args.fillPrice,
    };
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
export function decodePlaceOrder(receipt, pool) {
    let orderId;
    const fills = [];
    for (const { eventName, args } of poolEvents(receipt, pool)) {
        if (eventName === "OrderPlaced") {
            orderId = args.orderId;
        }
        else if (eventName === "OrderFilled") {
            fills.push(toOrderFill(args));
        }
    }
    return { orderId, fills };
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
export function decodeAmendOrder(receipt, pool) {
    let landedId;
    let placedId;
    const fills = [];
    for (const event of poolEvents(receipt, pool)) {
        const landed = landedOrderId(event);
        if (landed !== undefined) {
            landedId ??= landed;
        }
        else if (event.eventName === "OrderPlaced") {
            placedId ??= event.args.orderId;
        }
        else if (event.eventName === "OrderFilled") {
            fills.push(toOrderFill(event.args));
        }
    }
    return { newOrderId: landedId ?? placedId ?? 0n, fills };
}
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
export function decodeAmendOrders(receipt, pool, amendmentCount) {
    if (!Number.isSafeInteger(amendmentCount) || amendmentCount < 0) {
        throw new InvalidInputError(`amendmentCount must be a non-negative safe integer (got ${String(amendmentCount)})`);
    }
    const landedIds = [];
    const placedIds = [];
    const rejected = new Set();
    // Any rejection, even one outside the batch, proves the pool reports outcomes per
    // rung, so its `OrderPlaced` events must not stand in for landings.
    let sawRejection = false;
    const fills = [];
    for (const event of poolEvents(receipt, pool)) {
        const landed = landedOrderId(event);
        if (landed !== undefined) {
            landedIds.push(landed);
        }
        else if (event.eventName === "AmendRejected") {
            sawRejection = true;
            // An index outside the batch cannot name one of its rungs; ignore it rather
            // than let it shift the mapping.
            const index = event.args.requestIndex;
            if (index < BigInt(amendmentCount))
                rejected.add(Number(index));
        }
        else if (event.eventName === "OrderPlaced") {
            placedIds.push(event.args.orderId);
        }
        else if (event.eventName === "OrderFilled") {
            fills.push(toOrderFill(event.args));
        }
    }
    const legacy = landedIds.length === 0 && !sawRejection;
    const ids = legacy ? placedIds : landedIds;
    const newOrderIds = Array.from({ length: amendmentCount }, () => 0n);
    let next = 0;
    for (let i = 0; i < amendmentCount; i++) {
        if (rejected.has(i))
            continue;
        const id = ids[next];
        if (id === undefined)
            break;
        newOrderIds[i] = id;
        next++;
    }
    return { newOrderIds, fills };
}
