import * as z from "zod";
/** A numeric column: a decimal string with no sign, no leading zero and at most 78 digits. */
export declare const WIRE_HEIGHT: RegExp;
/** A 32-byte hash as lowercase `0x` hex. */
export declare const WIRE_HASH: RegExp;
/** GraphQL `Int` is a signed 32-bit integer. */
export declare const GRAPHQL_INT_MAX = 2147483647;
/** A contract address in any letter case. Row ids use the lower-case form. */
export declare const WIRE_ADDRESS: RegExp;
/**
 *  The two capability fields that decide whether the rest of the row can be read.
 *
 *  An older contract version or an unavailable capability may carry a different row
 *  shape, so the classifier reads these two before it validates the whole row.
 */
export declare const wireCapabilityHeadSchema: z.ZodObject<{
    contractVersion: z.ZodNumber;
    readiness: z.ZodString;
}, z.core.$strip>;
/** The producer's reason on an unavailable capability, read without validating the rest of the row. */
export declare const wireUnavailableReasonSchema: z.ZodObject<{
    unavailableReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
/** One `AccountCapability` row, as `SnapshotVersion` and `AccountCapabilityWatch` select it. */
export declare const wireCapabilitySchema: z.ZodObject<{
    id: z.ZodString;
    chainId: z.ZodNumber;
    capability: z.ZodString;
    contractVersion: z.ZodNumber;
    datasetGeneration: z.ZodString;
    manifestDigest: z.ZodString;
    changeStartBlock: z.ZodNumber;
    readiness: z.ZodEnum<{
        READY: "READY";
        UNAVAILABLE: "UNAVAILABLE";
    }>;
    unavailableReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    orderCapacity: z.ZodNumber;
    stopCapacity: z.ZodNumber;
    retentionBatches: z.ZodNumber;
    publicRoleMaxRows: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    publicRoleMaxResponseBytes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type WireCapability = z.infer<typeof wireCapabilitySchema>;
/**
 *  Whether two capability rows are the same row.
 *
 *  Every field must be equal. An absent optional field equals `null`, because GraphQL
 *  returns an absent nullable column as `null`.
 */
export declare function sameCapability(left: WireCapability, right: WireCapability): boolean;
/** One `AccountSnapshotGuard` row: the account's newest committed version. */
export declare const wireGuardSchema: z.ZodObject<{
    id: z.ZodString;
    account: z.ZodString;
    datasetGeneration: z.ZodString;
    blockNumber: z.ZodString;
    blockHash: z.ZodString;
    digest: z.ZodString;
}, z.core.$strip>;
export type WireGuard = z.infer<typeof wireGuardSchema>;
/** One `AccountChangeBatch` row. The predecessor fields are either all set or all absent. */
export declare const wireBatchSchema: z.ZodObject<{
    id: z.ZodString;
    account: z.ZodString;
    datasetGeneration: z.ZodString;
    blockNumber: z.ZodString;
    blockHash: z.ZodString;
    digest: z.ZodString;
    predecessorBlockNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    predecessorBlockHash: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    predecessorDigest: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    orderChangeCount: z.ZodNumber;
    stopChangeCount: z.ZodNumber;
    overflow: z.ZodBoolean;
}, z.core.$strip>;
export type WireBatch = z.infer<typeof wireBatchSchema>;
/** One `chain_metadata` row. Envio publishes chain progress as a GraphQL `Int`. */
export declare const wireWatermarkSchema: z.ZodObject<{
    latest_processed_block: z.ZodNumber;
}, z.core.$strip>;
export type WireWatermark = z.infer<typeof wireWatermarkSchema>;
/**
 *  A version the reader holds: a guard's version, or the zero version of an account
 *  with no guard. The zero version is block `"0"` with no hash and no digest; a real
 *  block zero has both.
 */
export declare const wireVersionSchema: z.ZodObject<{
    datasetGeneration: z.ZodString;
    blockNumber: z.ZodString;
    blockHash: z.ZodNullable<z.ZodString>;
    digest: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type WireVersion = z.infer<typeof wireVersionSchema>;
/**
 *  The envelope every change child carries.
 *
 *  Only the types are checked here. Whether the child belongs to its batch, and
 *  whether its operation is known, are scope questions the classifier answers.
 */
export declare const wireChangeEnvelopeSchema: z.ZodObject<{
    id: z.ZodString;
    batch_id: z.ZodString;
    account: z.ZodString;
    datasetGeneration: z.ZodString;
    blockNumber: z.ZodString;
    physicalEntityId: z.ZodString;
    operation: z.ZodString;
    terminalCause: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type WireChangeEnvelope = z.infer<typeof wireChangeEnvelopeSchema>;
/** Order fields a REMOVE keeps: the identity of the order that ended. */
export declare const ORDER_IDENTITY_FIELDS: readonly ["market_id", "orderId", "orderIdRaw"];
/** Order fields a REPLACE sets and a REMOVE clears. */
export declare const ORDER_STATE_FIELDS: readonly ["isBid", "side", "userData", "price", "fullQuantity", "quantityRemaining", "filledQuantity", "expireTimestampNs", "status", "rested", "cancelReason", "amendedFromOrderId", "amendedToOrderId", "placedAtBlock", "placedAtTimestamp", "placedTxHash", "lastUpdatedAtBlock", "lastUpdatedAtTimestamp"];
/** Every order payload field. A REPLACE carries all of them. */
export declare const ORDER_PAYLOAD_FIELDS: readonly ["market_id", "orderId", "orderIdRaw", "isBid", "side", "userData", "price", "fullQuantity", "quantityRemaining", "filledQuantity", "expireTimestampNs", "status", "rested", "cancelReason", "amendedFromOrderId", "amendedToOrderId", "placedAtBlock", "placedAtTimestamp", "placedTxHash", "lastUpdatedAtBlock", "lastUpdatedAtTimestamp"];
/** The payload of a live order: what the inventory holds for one open order. */
export declare const wireOrderPayloadSchema: z.ZodObject<{
    isBid: z.ZodBoolean;
    side: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        BUY_YES: "BUY_YES";
        SELL_YES: "SELL_YES";
        BUY_NO: "BUY_NO";
        SELL_NO: "SELL_NO";
    }>>>;
    userData: z.ZodString;
    price: z.ZodString;
    fullQuantity: z.ZodString;
    quantityRemaining: z.ZodString;
    filledQuantity: z.ZodString;
    expireTimestampNs: z.ZodString;
    status: z.ZodLiteral<"Open">;
    rested: z.ZodBoolean;
    cancelReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    amendedFromOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    amendedToOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    placedAtBlock: z.ZodString;
    placedAtTimestamp: z.ZodString;
    placedTxHash: z.ZodString;
    lastUpdatedAtBlock: z.ZodString;
    lastUpdatedAtTimestamp: z.ZodString;
    market_id: z.ZodString;
    orderId: z.ZodString;
    orderIdRaw: z.ZodString;
}, z.core.$strip>;
export type WireOrderPayload = z.infer<typeof wireOrderPayloadSchema>;
/** One `AccountOrderChange` child. A REPLACE carries the full order; a REMOVE carries its identity and why it ended. */
export declare const wireOrderChangeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    isBid: z.ZodBoolean;
    side: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        BUY_YES: "BUY_YES";
        SELL_YES: "SELL_YES";
        BUY_NO: "BUY_NO";
        SELL_NO: "SELL_NO";
    }>>>;
    userData: z.ZodString;
    price: z.ZodString;
    fullQuantity: z.ZodString;
    quantityRemaining: z.ZodString;
    filledQuantity: z.ZodString;
    expireTimestampNs: z.ZodString;
    status: z.ZodLiteral<"Open">;
    rested: z.ZodBoolean;
    cancelReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    amendedFromOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    amendedToOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    placedAtBlock: z.ZodString;
    placedAtTimestamp: z.ZodString;
    placedTxHash: z.ZodString;
    lastUpdatedAtBlock: z.ZodString;
    lastUpdatedAtTimestamp: z.ZodString;
    market_id: z.ZodString;
    orderId: z.ZodString;
    orderIdRaw: z.ZodString;
    operation: z.ZodLiteral<"REPLACE">;
    terminalCause: z.ZodOptional<z.ZodNull>;
    id: z.ZodString;
    batch_id: z.ZodString;
    account: z.ZodString;
    datasetGeneration: z.ZodString;
    blockNumber: z.ZodString;
    physicalEntityId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    isBid: z.ZodOptional<z.ZodNull>;
    side: z.ZodOptional<z.ZodNull>;
    userData: z.ZodOptional<z.ZodNull>;
    price: z.ZodOptional<z.ZodNull>;
    fullQuantity: z.ZodOptional<z.ZodNull>;
    quantityRemaining: z.ZodOptional<z.ZodNull>;
    filledQuantity: z.ZodOptional<z.ZodNull>;
    expireTimestampNs: z.ZodOptional<z.ZodNull>;
    status: z.ZodOptional<z.ZodNull>;
    rested: z.ZodOptional<z.ZodNull>;
    cancelReason: z.ZodOptional<z.ZodNull>;
    amendedFromOrderId: z.ZodOptional<z.ZodNull>;
    amendedToOrderId: z.ZodOptional<z.ZodNull>;
    placedAtBlock: z.ZodOptional<z.ZodNull>;
    placedAtTimestamp: z.ZodOptional<z.ZodNull>;
    placedTxHash: z.ZodOptional<z.ZodNull>;
    lastUpdatedAtBlock: z.ZodOptional<z.ZodNull>;
    lastUpdatedAtTimestamp: z.ZodOptional<z.ZodNull>;
    market_id: z.ZodString;
    orderId: z.ZodString;
    orderIdRaw: z.ZodString;
    operation: z.ZodLiteral<"REMOVE">;
    terminalCause: z.ZodEnum<{
        Closed: "Closed";
        Filled: "Filled";
        Cancelled: "Cancelled";
        Expired: "Expired";
    }>;
    id: z.ZodString;
    batch_id: z.ZodString;
    account: z.ZodString;
    datasetGeneration: z.ZodString;
    blockNumber: z.ZodString;
    physicalEntityId: z.ZodString;
}, z.core.$strip>], "operation">;
export type WireOrderChange = z.infer<typeof wireOrderChangeSchema>;
/** One `Order` row, as the `AccountOrderRow` fragment selects it for a snapshot. */
export declare const wireOrderRowSchema: z.ZodObject<{
    isBid: z.ZodBoolean;
    side: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        BUY_YES: "BUY_YES";
        SELL_YES: "SELL_YES";
        BUY_NO: "BUY_NO";
        SELL_NO: "SELL_NO";
    }>>>;
    userData: z.ZodString;
    price: z.ZodString;
    fullQuantity: z.ZodString;
    quantityRemaining: z.ZodString;
    filledQuantity: z.ZodString;
    expireTimestampNs: z.ZodString;
    status: z.ZodLiteral<"Open">;
    rested: z.ZodBoolean;
    cancelReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    amendedFromOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    amendedToOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    placedAtBlock: z.ZodString;
    placedAtTimestamp: z.ZodString;
    placedTxHash: z.ZodString;
    lastUpdatedAtBlock: z.ZodString;
    lastUpdatedAtTimestamp: z.ZodString;
    market_id: z.ZodString;
    orderId: z.ZodString;
    orderIdRaw: z.ZodString;
    id: z.ZodString;
    owner: z.ZodString;
}, z.core.$strip>;
export type WireOrderRow = z.infer<typeof wireOrderRowSchema>;
/** Stop fields a REMOVE keeps: the identity of the stop that ended. */
export declare const STOP_IDENTITY_FIELDS: readonly ["market_id", "orderIdRaw"];
/** Stop fields a REPLACE sets and a REMOVE clears. */
export declare const STOP_STATE_FIELDS: readonly ["registry", "isBid", "quantity", "triggerPrice", "triggerOperator", "orderType", "builder", "builderFeeBpsTimes1k", "status", "placedOrderId", "dropReason", "siblingOrderId", "intent", "cancelReason", "createdAt", "updatedAt", "txHash"];
/** Every stop payload field. A REPLACE carries all of them. */
export declare const STOP_PAYLOAD_FIELDS: readonly ["market_id", "orderIdRaw", "registry", "isBid", "quantity", "triggerPrice", "triggerOperator", "orderType", "builder", "builderFeeBpsTimes1k", "status", "placedOrderId", "dropReason", "siblingOrderId", "intent", "cancelReason", "createdAt", "updatedAt", "txHash"];
/** The payload of a pending stop: what the inventory holds for one stop. */
export declare const wireStopPayloadSchema: z.ZodObject<{
    registry: z.ZodString;
    isBid: z.ZodBoolean;
    quantity: z.ZodString;
    triggerPrice: z.ZodString;
    triggerOperator: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>;
    orderType: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>;
    builder: z.ZodString;
    builderFeeBpsTimes1k: z.ZodString;
    status: z.ZodLiteral<"PENDING">;
    placedOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dropReason: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>>>;
    siblingOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    intent: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>>>;
    cancelReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    txHash: z.ZodString;
    market_id: z.ZodString;
    orderIdRaw: z.ZodString;
}, z.core.$strip>;
export type WireStopPayload = z.infer<typeof wireStopPayloadSchema>;
/** One `AccountStopChange` child. A REPLACE carries the full stop; a REMOVE carries its identity and why it ended. */
export declare const wireStopChangeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    registry: z.ZodString;
    isBid: z.ZodBoolean;
    quantity: z.ZodString;
    triggerPrice: z.ZodString;
    triggerOperator: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>;
    orderType: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>;
    builder: z.ZodString;
    builderFeeBpsTimes1k: z.ZodString;
    status: z.ZodLiteral<"PENDING">;
    placedOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dropReason: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>>>;
    siblingOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    intent: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>>>;
    cancelReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    txHash: z.ZodString;
    market_id: z.ZodString;
    orderIdRaw: z.ZodString;
    operation: z.ZodLiteral<"REPLACE">;
    terminalCause: z.ZodOptional<z.ZodNull>;
    id: z.ZodString;
    batch_id: z.ZodString;
    account: z.ZodString;
    datasetGeneration: z.ZodString;
    blockNumber: z.ZodString;
    physicalEntityId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    registry: z.ZodOptional<z.ZodNull>;
    isBid: z.ZodOptional<z.ZodNull>;
    quantity: z.ZodOptional<z.ZodNull>;
    triggerPrice: z.ZodOptional<z.ZodNull>;
    triggerOperator: z.ZodOptional<z.ZodNull>;
    orderType: z.ZodOptional<z.ZodNull>;
    builder: z.ZodOptional<z.ZodNull>;
    builderFeeBpsTimes1k: z.ZodOptional<z.ZodNull>;
    status: z.ZodOptional<z.ZodNull>;
    placedOrderId: z.ZodOptional<z.ZodNull>;
    dropReason: z.ZodOptional<z.ZodNull>;
    siblingOrderId: z.ZodOptional<z.ZodNull>;
    intent: z.ZodOptional<z.ZodNull>;
    cancelReason: z.ZodOptional<z.ZodNull>;
    createdAt: z.ZodOptional<z.ZodNull>;
    updatedAt: z.ZodOptional<z.ZodNull>;
    txHash: z.ZodOptional<z.ZodNull>;
    market_id: z.ZodString;
    orderIdRaw: z.ZodString;
    operation: z.ZodLiteral<"REMOVE">;
    terminalCause: z.ZodEnum<{
        TRIGGERED: "TRIGGERED";
        TRIGGER_FAILED: "TRIGGER_FAILED";
        CANCELLED: "CANCELLED";
    }>;
    id: z.ZodString;
    batch_id: z.ZodString;
    account: z.ZodString;
    datasetGeneration: z.ZodString;
    blockNumber: z.ZodString;
    physicalEntityId: z.ZodString;
}, z.core.$strip>], "operation">;
export type WireStopChange = z.infer<typeof wireStopChangeSchema>;
/** One `StopOrder` row, as `AccountOrderRows.stops` selects it for a snapshot. */
export declare const wireStopRowSchema: z.ZodObject<{
    registry: z.ZodString;
    isBid: z.ZodBoolean;
    quantity: z.ZodString;
    triggerPrice: z.ZodString;
    triggerOperator: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>;
    orderType: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>;
    builder: z.ZodString;
    builderFeeBpsTimes1k: z.ZodString;
    status: z.ZodLiteral<"PENDING">;
    placedOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dropReason: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>>>;
    siblingOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    intent: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>>>;
    cancelReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    txHash: z.ZodString;
    market_id: z.ZodString;
    orderIdRaw: z.ZodString;
    id: z.ZodString;
    owner: z.ZodString;
}, z.core.$strip>;
export type WireStopRow = z.infer<typeof wireStopRowSchema>;
