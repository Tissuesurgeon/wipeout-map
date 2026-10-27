// Which spot pool events concern one account. The spot orders view reads the account
// again when one does; it never folds an event into its list.
//
// A pool's order events name orders, not owners: only `OrderPlaced` carries the owner,
// inside its data. So a new order is the account's when its owner is, and every later
// event of an order names its id in a topic. The view knows its own ids from its last
// read, plus the ids of orders placed since.
//
// That shapes the subscription too. Every placement in every spot pool has to arrive,
// because its owner is not a topic the node can filter on. Every later event names its
// order in a topic, so the node sends only those of the account's own orders.
import { decodeEventLog, getAbiItem, hexToBigInt, isHex, numberToHex, parseAbi, toEventSelector, } from "viem";
import * as EventsAbi from "../eventsAbi.js";
// The order book's ABI here does not carry `OrderAmended`; a pool emits it when an
// amend replaces an order with a new one.
const amendedAbi = parseAbi(["event OrderAmended(uint128 indexed oldOrderId, uint128 indexed newOrderId)"]);
const PLACED = toEventSelector(getAbiItem({ abi: EventsAbi.orderBookEventsAbi, name: "OrderPlaced" }));
const FILLED = toEventSelector(getAbiItem({ abi: EventsAbi.orderBookEventsAbi, name: "OrderFilled" }));
const AMENDED = toEventSelector(getAbiItem({ abi: amendedAbi, name: "OrderAmended" }));
// Released and pre-release in-place pools share topic 1 (the kept order id). Only
// matching is needed: the pool's pinned read supplies the full mutable order state.
const IN_PLACE_AMENDED = [
    toEventSelector(getAbiItem({ abi: EventsAbi.liveEventsAbi, name: "OrderAmendedInPlace" })),
    toEventSelector("OrderAmendedInPlace(uint128,uint64,uint256,uint256,uint256,uint64)"),
];
/** Events that change one order and name it in topic 1. */
const BY_ORDER_ID = [
    "OrderRested",
    "OrderCancelled",
    "OrderExpired",
    "OrderReduced",
    "OrderCancelledSelfMatch",
    "OrderCancelledPreFill",
].map((name) => toEventSelector(getAbiItem({ abi: EventsAbi.orderBookEventsAbi, name })));
const SINGLE_ORDER_TOPICS = [...BY_ORDER_ID, ...IN_PLACE_AMENDED];
/** topic 0 of every spot pool event that places, changes or ends an order. */
export const SPOT_ORDER_EVENT_TOPICS = [PLACED, FILLED, AMENDED, ...IN_PLACE_AMENDED, ...BY_ORDER_ID];
/** Events that name an order in topic 1 after its placement: the taker of a fill, the order an amend replaces, and the rest. */
const ID_IN_TOPIC_1 = [FILLED, AMENDED, ...IN_PLACE_AMENDED, ...BY_ORDER_ID];
/** The most order ids a subscription names. Past it, the subscription follows every order event of the spot pools. */
export const MAX_FILTERED_ORDER_IDS = 1_000;
/**
 *  The filters that follow one account's spot orders in `pools`: every placement, and
 *  the later events of the orders `orderIds` names. `null`: too many orders to name, so
 *  every order event.
 */
export function spotOrderFilters(pools, orderIds) {
    const address = [...pools];
    if (orderIds === null)
        return [{ address, topics: [[...SPOT_ORDER_EVENT_TOPICS]] }];
    const filters = [{ address, topics: [PLACED] }];
    if (orderIds.length === 0)
        return filters;
    const ids = orderIds.map((orderId) => numberToHex(orderId, { size: 32 }));
    filters.push({ address, topics: [[...ID_IN_TOPIC_1], ids] });
    // A fill names the maker in topic 2. An amend names the new order there, whose own
    // placement arrives with every other.
    filters.push({ address, topics: [FILLED, null, ids] });
    return filters;
}
function idAt(log, index) {
    const topic = log.topics[index];
    return topic !== undefined && isHex(topic) && topic.length === 66 ? hexToBigInt(topic) : null;
}
/** Whether `log` places, changes or ends one of `account`'s orders. `account` is lower-case. */
export function verdictOf(log, account, known) {
    const pool = log.address.toLowerCase();
    const isKnown = (index) => {
        const orderId = idAt(log, index);
        return orderId !== null && known(pool, orderId);
    };
    switch (log.topics[0]) {
        case PLACED: {
            let owner;
            let orderId;
            try {
                const decoded = decodeEventLog({
                    abi: EventsAbi.orderBookEventsAbi,
                    eventName: "OrderPlaced",
                    topics: [PLACED, ...log.topics.slice(1)],
                    data: log.data,
                });
                owner = decoded.args.placedOrder.owner.toLowerCase();
                orderId = decoded.args.orderId;
            }
            catch {
                // An owner that cannot be read might be the account's: reading again is cheap.
                return { kind: "read" };
            }
            return owner === account ? { kind: "placed", orderId } : { kind: "ignore" };
        }
        case FILLED:
            // Topic 1 is the taker order, topic 2 the maker order: either can be the account's.
            return isKnown(1) || isKnown(2) ? { kind: "read" } : { kind: "ignore" };
        case AMENDED:
            return isKnown(1) || isKnown(2) ? { kind: "read" } : { kind: "ignore" };
        default:
            return log.topics[0] !== undefined && SINGLE_ORDER_TOPICS.includes(log.topics[0]) && isKnown(1)
                ? { kind: "read" }
                : { kind: "ignore" };
    }
}
