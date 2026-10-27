// Wire schemas for the account view's orders capability.
//
// The indexer publishes an account's open orders and pending stops as a guarded
// snapshot plus an ordered change stream (`indexer/ACCOUNT-VIEW.md`). The operations
// are `indexer/account-view.graphql` and `indexer/account-stream.graphql`.
//
// These zod schemas are the SDK's one definition of a valid wire row. The SDK
// validates every snapshot row and every stream frame with them. They check the
// shape of each row and the format of each field. Relations between rows (scope,
// identity, versions and the batch digest) are checked in `continuity.ts` and
// `guardedSnapshot.ts`, because a schema sees one row at a time.
//
// The schemas never transform a value. The batch digest covers raw wire values, so a
// validated row must stay byte-for-byte what the wire sent.
import * as z from "zod";
/** A numeric column: a decimal string with no sign, no leading zero and at most 78 digits. */
export const WIRE_HEIGHT = /^(0|[1-9][0-9]{0,77})$/;
/** A 32-byte hash as lowercase `0x` hex. */
export const WIRE_HASH = /^0x[0-9a-f]{64}$/;
/** GraphQL `Int` is a signed 32-bit integer. */
export const GRAPHQL_INT_MAX = 2_147_483_647;
/** A contract address in any letter case. Row ids use the lower-case form. */
export const WIRE_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** A stop registry's order ids are uint128. */
const UINT128_MAX = (1n << 128n) - 1n;
const wireHeight = z.string().regex(WIRE_HEIGHT);
const wireHash = z.string().regex(WIRE_HASH);
const wireAddress = z.string().regex(WIRE_ADDRESS);
const nonEmptyString = z.string().refine((value) => value.trim() !== "");
const graphqlInt = z.number().int().min(0).max(GRAPHQL_INT_MAX);
const positiveGraphqlInt = graphqlInt.min(1);
/** An absent nullable column. GraphQL returns `null`; a missing key reads as `undefined`. */
const absent = z.null().optional();
const zeroOrOne = z.union([z.literal(0), z.literal(1)]);
// ---------------------------------------------------------------- capability
/**
 *  The two capability fields that decide whether the rest of the row can be read.
 *
 *  An older contract version or an unavailable capability may carry a different row
 *  shape, so the classifier reads these two before it validates the whole row.
 */
export const wireCapabilityHeadSchema = z.object({
    contractVersion: z.number(),
    readiness: z.string(),
});
/** The producer's reason on an unavailable capability, read without validating the rest of the row. */
export const wireUnavailableReasonSchema = z.object({
    unavailableReason: z.string().nullish(),
});
/** One `AccountCapability` row, as `SnapshotVersion` and `AccountCapabilityWatch` select it. */
export const wireCapabilitySchema = z.object({
    id: z.string(),
    chainId: z.number().int(),
    capability: z.string(),
    contractVersion: z.number().int(),
    datasetGeneration: z.string(),
    manifestDigest: z.string(),
    changeStartBlock: graphqlInt,
    readiness: z.enum(["READY", "UNAVAILABLE"]),
    unavailableReason: z.string().nullish(),
    orderCapacity: positiveGraphqlInt,
    stopCapacity: positiveGraphqlInt,
    retentionBatches: positiveGraphqlInt,
    publicRoleMaxRows: positiveGraphqlInt.nullish(),
    publicRoleMaxResponseBytes: positiveGraphqlInt.nullish(),
});
/** Every capability field, for comparing two rows field by field. */
const CAPABILITY_FIELDS = [
    "id",
    "chainId",
    "capability",
    "contractVersion",
    "datasetGeneration",
    "manifestDigest",
    "changeStartBlock",
    "readiness",
    "unavailableReason",
    "orderCapacity",
    "stopCapacity",
    "retentionBatches",
    "publicRoleMaxRows",
    "publicRoleMaxResponseBytes",
];
/**
 *  Whether two capability rows are the same row.
 *
 *  Every field must be equal. An absent optional field equals `null`, because GraphQL
 *  returns an absent nullable column as `null`.
 */
export function sameCapability(left, right) {
    return CAPABILITY_FIELDS.every((field) => (left[field] ?? null) === (right[field] ?? null));
}
// ---------------------------------------------------------------- guard, batch, progress
/** One `AccountSnapshotGuard` row: the account's newest committed version. */
export const wireGuardSchema = z.object({
    id: z.string(),
    account: z.string(),
    datasetGeneration: z.string(),
    blockNumber: wireHeight,
    blockHash: wireHash,
    digest: wireHash,
});
/** One `AccountChangeBatch` row. The predecessor fields are either all set or all absent. */
export const wireBatchSchema = z
    .object({
    id: z.string(),
    account: z.string(),
    datasetGeneration: z.string(),
    blockNumber: wireHeight,
    blockHash: wireHash,
    digest: wireHash,
    predecessorBlockNumber: wireHeight.nullish(),
    predecessorBlockHash: wireHash.nullish(),
    predecessorDigest: wireHash.nullish(),
    orderChangeCount: graphqlInt,
    stopChangeCount: graphqlInt,
    overflow: z.boolean(),
})
    .refine((batch) => {
    // A partial predecessor cannot identify one committed block. Only the first batch has none.
    const present = [batch.predecessorBlockNumber, batch.predecessorBlockHash, batch.predecessorDigest].filter((value) => value != null).length;
    return present === 0 || present === 3;
});
/** One `chain_metadata` row. Envio publishes chain progress as a GraphQL `Int`. */
export const wireWatermarkSchema = z.object({
    latest_processed_block: graphqlInt,
});
/**
 *  A version the reader holds: a guard's version, or the zero version of an account
 *  with no guard. The zero version is block `"0"` with no hash and no digest; a real
 *  block zero has both.
 */
export const wireVersionSchema = z
    .object({
    datasetGeneration: nonEmptyString,
    blockNumber: wireHeight,
    blockHash: wireHash.nullable(),
    digest: wireHash.nullable(),
})
    .refine((version) => (version.blockHash === null) === (version.digest === null) &&
    (version.blockHash !== null || version.blockNumber === "0"));
// ---------------------------------------------------------------- change envelope
/**
 *  The envelope every change child carries.
 *
 *  Only the types are checked here. Whether the child belongs to its batch, and
 *  whether its operation is known, are scope questions the classifier answers.
 */
export const wireChangeEnvelopeSchema = z.object({
    id: z.string(),
    batch_id: z.string(),
    account: z.string(),
    datasetGeneration: z.string(),
    blockNumber: z.string(),
    physicalEntityId: z.string(),
    operation: z.string(),
    terminalCause: z.string().nullish(),
});
const changeEnvelopeShape = wireChangeEnvelopeSchema.shape;
// ---------------------------------------------------------------- orders
/** Order fields a REMOVE keeps: the identity of the order that ended. */
export const ORDER_IDENTITY_FIELDS = ["market_id", "orderId", "orderIdRaw"];
/** Order fields a REPLACE sets and a REMOVE clears. */
export const ORDER_STATE_FIELDS = [
    "isBid",
    "side",
    "userData",
    "price",
    "fullQuantity",
    "quantityRemaining",
    "filledQuantity",
    "expireTimestampNs",
    "status",
    "rested",
    "cancelReason",
    "amendedFromOrderId",
    "amendedToOrderId",
    "placedAtBlock",
    "placedAtTimestamp",
    "placedTxHash",
    "lastUpdatedAtBlock",
    "lastUpdatedAtTimestamp",
];
/** Every order payload field. A REPLACE carries all of them. */
export const ORDER_PAYLOAD_FIELDS = [...ORDER_IDENTITY_FIELDS, ...ORDER_STATE_FIELDS];
const orderIdentityShape = {
    market_id: nonEmptyString,
    orderId: wireHeight,
    orderIdRaw: wireHeight,
};
const orderStateShape = {
    isBid: z.boolean(),
    side: z.enum(["BUY_YES", "SELL_YES", "BUY_NO", "SELL_NO"]).nullish(),
    userData: wireHeight,
    price: wireHeight,
    fullQuantity: wireHeight,
    quantityRemaining: wireHeight,
    filledQuantity: wireHeight,
    expireTimestampNs: wireHeight,
    status: z.literal("Open"),
    rested: z.boolean(),
    cancelReason: nonEmptyString.nullish(),
    amendedFromOrderId: wireHeight.nullish(),
    amendedToOrderId: wireHeight.nullish(),
    placedAtBlock: wireHeight,
    placedAtTimestamp: wireHeight,
    placedTxHash: wireHash,
    lastUpdatedAtBlock: wireHeight,
    lastUpdatedAtTimestamp: wireHeight,
};
const orderClearedShape = {
    isBid: absent,
    side: absent,
    userData: absent,
    price: absent,
    fullQuantity: absent,
    quantityRemaining: absent,
    filledQuantity: absent,
    expireTimestampNs: absent,
    status: absent,
    rested: absent,
    cancelReason: absent,
    amendedFromOrderId: absent,
    amendedToOrderId: absent,
    placedAtBlock: absent,
    placedAtTimestamp: absent,
    placedTxHash: absent,
    lastUpdatedAtBlock: absent,
    lastUpdatedAtTimestamp: absent,
};
/** The payload of a live order: what the inventory holds for one open order. */
export const wireOrderPayloadSchema = z.object({ ...orderIdentityShape, ...orderStateShape });
/** One `AccountOrderChange` child. A REPLACE carries the full order; a REMOVE carries its identity and why it ended. */
export const wireOrderChangeSchema = z.discriminatedUnion("operation", [
    z.object({
        ...changeEnvelopeShape,
        operation: z.literal("REPLACE"),
        terminalCause: absent,
        ...orderIdentityShape,
        ...orderStateShape,
    }),
    z.object({
        ...changeEnvelopeShape,
        operation: z.literal("REMOVE"),
        terminalCause: z.enum(["Filled", "Cancelled", "Expired", "Closed"]),
        ...orderIdentityShape,
        ...orderClearedShape,
    }),
]);
/** One `Order` row, as the `AccountOrderRow` fragment selects it for a snapshot. */
export const wireOrderRowSchema = z.object({
    id: nonEmptyString,
    owner: z.string(),
    ...orderIdentityShape,
    ...orderStateShape,
});
// ---------------------------------------------------------------- stops
/** Stop fields a REMOVE keeps: the identity of the stop that ended. */
export const STOP_IDENTITY_FIELDS = ["market_id", "orderIdRaw"];
/** Stop fields a REPLACE sets and a REMOVE clears. */
export const STOP_STATE_FIELDS = [
    "registry",
    "isBid",
    "quantity",
    "triggerPrice",
    "triggerOperator",
    "orderType",
    "builder",
    "builderFeeBpsTimes1k",
    "status",
    "placedOrderId",
    "dropReason",
    "siblingOrderId",
    "intent",
    "cancelReason",
    "createdAt",
    "updatedAt",
    "txHash",
];
/** Every stop payload field. A REPLACE carries all of them. */
export const STOP_PAYLOAD_FIELDS = [...STOP_IDENTITY_FIELDS, ...STOP_STATE_FIELDS];
// A stop's limit price is read from its registry by id, so the registry, the pool and the
// id must all be usable there. Stops exist only on spot and perp, where the market id is
// the pool address. `WIRE_HEIGHT` caps a height at 78 digits, so the id converts exactly.
const stopIdentityShape = {
    market_id: wireAddress,
    orderIdRaw: wireHeight.refine((value) => BigInt(value) <= UINT128_MAX),
};
const stopStateShape = {
    registry: wireAddress,
    isBid: z.boolean(),
    quantity: wireHeight,
    triggerPrice: wireHeight,
    triggerOperator: zeroOrOne,
    orderType: zeroOrOne,
    builder: nonEmptyString,
    builderFeeBpsTimes1k: wireHeight,
    status: z.literal("PENDING"),
    placedOrderId: wireHeight.nullish(),
    dropReason: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullish(),
    siblingOrderId: wireHeight.nullish(),
    intent: zeroOrOne.nullish(),
    cancelReason: nonEmptyString.nullish(),
    createdAt: wireHeight,
    updatedAt: wireHeight,
    txHash: wireHash,
};
const stopClearedShape = {
    registry: absent,
    isBid: absent,
    quantity: absent,
    triggerPrice: absent,
    triggerOperator: absent,
    orderType: absent,
    builder: absent,
    builderFeeBpsTimes1k: absent,
    status: absent,
    placedOrderId: absent,
    dropReason: absent,
    siblingOrderId: absent,
    intent: absent,
    cancelReason: absent,
    createdAt: absent,
    updatedAt: absent,
    txHash: absent,
};
/** The payload of a pending stop: what the inventory holds for one stop. */
export const wireStopPayloadSchema = z.object({ ...stopIdentityShape, ...stopStateShape });
/** One `AccountStopChange` child. A REPLACE carries the full stop; a REMOVE carries its identity and why it ended. */
export const wireStopChangeSchema = z.discriminatedUnion("operation", [
    z.object({
        ...changeEnvelopeShape,
        operation: z.literal("REPLACE"),
        terminalCause: absent,
        ...stopIdentityShape,
        ...stopStateShape,
    }),
    z.object({
        ...changeEnvelopeShape,
        operation: z.literal("REMOVE"),
        terminalCause: z.enum(["TRIGGERED", "TRIGGER_FAILED", "CANCELLED"]),
        ...stopIdentityShape,
        ...stopClearedShape,
    }),
]);
/** One `StopOrder` row, as `AccountOrderRows.stops` selects it for a snapshot. */
export const wireStopRowSchema = z.object({
    id: nonEmptyString,
    owner: z.string(),
    ...stopIdentityShape,
    ...stopStateShape,
});
