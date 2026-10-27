// What a stop registry's events say about one account's pending stops.
//
// A stop registry keeps its pending orders in private storage, with no list of an
// account's stops to read, so the live orders view learns of a stop's changes from the
// registry's events. Only some of them name the owner: the creation, the link of a
// TP/SL pair, the retirement of a pair's other leg, and the sweep of an inert order.
// The rest name the stop by its id, so they concern the account when the view already
// holds that id.
//
// The perp and spot registries share most events. Spot has no pairs and no intent, and
// its trigger event names the spot order it placed under another signature.
import { decodeEventLog, parseAbi, toEventSelector } from "viem";
/** Every stop registry event that creates, changes or ends a pending stop. */
export const stopRegistryEventsAbi = parseAbi([
    "event PendingOrderCreated(uint128 indexed orderId, address indexed owner, bool isBid, uint256 quantity, uint256 triggerPrice, uint8 triggerOperator, uint8 orderType, address builder, uint96 builderFeeBpsTimes1k)",
    "event PendingOrderIntentSet(uint128 indexed orderId, uint8 intent)",
    "event PendingOrdersLinked(uint128 indexed gteOrderId, uint128 indexed lteOrderId, address indexed owner)",
    "event PendingOrderUnlinked(uint128 indexed orderId)",
    "event PendingOrderTriggered(uint128 indexed pendingOrderId, bool success, uint8 dropReason, uint128 indexed placedOrderId)",
    "event PendingOrderCancelled(uint128 indexed orderId)",
    "event LinkedOrderCancelled(uint128 indexed cancelledOrderId, uint128 indexed triggeredOrderId, address indexed owner, uint256 somiCredited)",
    "event InertOrderCancelled(uint128 indexed orderId, address indexed owner, uint256 somiCredited)",
]);
/** The spot registry's trigger event, which names the spot order it placed. */
const spotTriggeredAbi = parseAbi([
    "event PendingOrderTriggered(uint128 indexed pendingOrderId, bool success, uint128 indexed spotOrderId)",
]);
/** topic 0 of every stop registry event the live view follows, perp and spot. */
export const STOP_EVENT_TOPICS = [
    ...stopRegistryEventsAbi.map((item) => toEventSelector(item)),
    ...spotTriggeredAbi.map((item) => toEventSelector(item)),
];
/**
 *  Reads one stop registry log. `undefined` for a log that is not a stop event, or that
 *  does not decode.
 */
export function stopEventOf(log) {
    const [signature, ...rest] = log.topics;
    if (signature === undefined)
        return undefined;
    const topics = [signature, ...rest];
    try {
        const event = decodeEventLog({ abi: stopRegistryEventsAbi, topics, data: log.data });
        switch (event.eventName) {
            case "PendingOrderCreated":
                return {
                    kind: "created",
                    orderId: event.args.orderId,
                    owner: event.args.owner.toLowerCase(),
                    terms: {
                        isBid: event.args.isBid,
                        quantity: event.args.quantity,
                        triggerPrice: event.args.triggerPrice,
                        triggerOperator: event.args.triggerOperator,
                        orderType: event.args.orderType,
                        builder: event.args.builder.toLowerCase(),
                        builderFeeBpsTimes1k: event.args.builderFeeBpsTimes1k,
                    },
                };
            case "PendingOrderIntentSet":
                return { kind: "intent", orderId: event.args.orderId, intent: event.args.intent };
            case "PendingOrdersLinked":
                return {
                    kind: "linked",
                    gteOrderId: event.args.gteOrderId,
                    lteOrderId: event.args.lteOrderId,
                    owner: event.args.owner.toLowerCase(),
                };
            case "PendingOrderUnlinked":
                return { kind: "unlinked", orderId: event.args.orderId };
            case "PendingOrderTriggered":
                return { kind: "ended", orderId: event.args.pendingOrderId, owner: null };
            case "PendingOrderCancelled":
                return { kind: "ended", orderId: event.args.orderId, owner: null };
            case "LinkedOrderCancelled":
                return { kind: "ended", orderId: event.args.cancelledOrderId, owner: event.args.owner.toLowerCase() };
            case "InertOrderCancelled":
                return { kind: "ended", orderId: event.args.orderId, owner: event.args.owner.toLowerCase() };
        }
    }
    catch {
        // Not one of the shared events; the spot trigger has its own signature.
    }
    try {
        const event = decodeEventLog({ abi: spotTriggeredAbi, topics, data: log.data });
        return { kind: "ended", orderId: event.args.pendingOrderId, owner: null };
    }
    catch {
        return undefined;
    }
}
