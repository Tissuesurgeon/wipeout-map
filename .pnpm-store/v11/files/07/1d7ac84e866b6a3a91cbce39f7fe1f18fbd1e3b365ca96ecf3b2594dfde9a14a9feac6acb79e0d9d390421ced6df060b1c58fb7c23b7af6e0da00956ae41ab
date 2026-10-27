import { type Hex } from "viem";
/** Every stop registry event that creates, changes or ends a pending stop. */
export declare const stopRegistryEventsAbi: readonly [{
    readonly name: "PendingOrderCreated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }, {
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint256";
        readonly name: "quantity";
    }, {
        readonly type: "uint256";
        readonly name: "triggerPrice";
    }, {
        readonly type: "uint8";
        readonly name: "triggerOperator";
    }, {
        readonly type: "uint8";
        readonly name: "orderType";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }, {
        readonly type: "uint96";
        readonly name: "builderFeeBpsTimes1k";
    }];
}, {
    readonly name: "PendingOrderIntentSet";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }, {
        readonly type: "uint8";
        readonly name: "intent";
    }];
}, {
    readonly name: "PendingOrdersLinked";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "gteOrderId";
        readonly indexed: true;
    }, {
        readonly type: "uint128";
        readonly name: "lteOrderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }];
}, {
    readonly name: "PendingOrderUnlinked";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }];
}, {
    readonly name: "PendingOrderTriggered";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "pendingOrderId";
        readonly indexed: true;
    }, {
        readonly type: "bool";
        readonly name: "success";
    }, {
        readonly type: "uint8";
        readonly name: "dropReason";
    }, {
        readonly type: "uint128";
        readonly name: "placedOrderId";
        readonly indexed: true;
    }];
}, {
    readonly name: "PendingOrderCancelled";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }];
}, {
    readonly name: "LinkedOrderCancelled";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "cancelledOrderId";
        readonly indexed: true;
    }, {
        readonly type: "uint128";
        readonly name: "triggeredOrderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "somiCredited";
    }];
}, {
    readonly name: "InertOrderCancelled";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "somiCredited";
    }];
}];
/** topic 0 of every stop registry event the live view follows, perp and spot. */
export declare const STOP_EVENT_TOPICS: readonly Hex[];
/** A pending stop's terms, as its creation states them. */
export interface CreatedStopTerms {
    readonly isBid: boolean;
    readonly quantity: bigint;
    readonly triggerPrice: bigint;
    readonly triggerOperator: number;
    readonly orderType: number;
    /** Lower-case. */
    readonly builder: string;
    readonly builderFeeBpsTimes1k: bigint;
}
/** One stop registry event, read. Addresses are lower-case. */
export type StopEvent = {
    readonly kind: "created";
    readonly orderId: bigint;
    readonly owner: string;
    readonly terms: CreatedStopTerms;
} | {
    readonly kind: "intent";
    readonly orderId: bigint;
    readonly intent: number;
} | {
    readonly kind: "linked";
    readonly gteOrderId: bigint;
    readonly lteOrderId: bigint;
    readonly owner: string;
} | {
    readonly kind: "unlinked";
    readonly orderId: bigint;
}
/** The stop is no longer pending: it fired, its owner cancelled it, or it was retired. `owner` when the event names one. */
 | {
    readonly kind: "ended";
    readonly orderId: bigint;
    readonly owner: string | null;
};
/**
 *  Reads one stop registry log. `undefined` for a log that is not a stop event, or that
 *  does not decode.
 */
export declare function stopEventOf(log: {
    readonly topics: readonly Hex[];
    readonly data: Hex;
}): StopEvent | undefined;
