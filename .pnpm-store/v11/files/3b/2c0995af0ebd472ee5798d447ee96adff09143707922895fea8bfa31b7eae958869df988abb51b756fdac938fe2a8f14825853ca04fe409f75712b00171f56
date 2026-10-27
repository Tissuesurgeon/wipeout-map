/**
 *  Validates one `AccountCapability` row, as `client.accountOrders` reads it.
 *
 *  The row says whether the indexer serves account views on a chain, and under which
 *  manifest and limits.
 *
 * @category account views
 */
export declare const accountOrdersCapabilityWireSchema: import("zod").ZodObject<{
    id: import("zod").ZodString;
    chainId: import("zod").ZodNumber;
    capability: import("zod").ZodString;
    contractVersion: import("zod").ZodNumber;
    datasetGeneration: import("zod").ZodString;
    manifestDigest: import("zod").ZodString;
    changeStartBlock: import("zod").ZodNumber;
    readiness: import("zod").ZodEnum<{
        READY: "READY";
        UNAVAILABLE: "UNAVAILABLE";
    }>;
    unavailableReason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
    orderCapacity: import("zod").ZodNumber;
    stopCapacity: import("zod").ZodNumber;
    retentionBatches: import("zod").ZodNumber;
    publicRoleMaxRows: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodNumber>>;
    publicRoleMaxResponseBytes: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodNumber>>;
}, import("zod/v4/core").$strip>;
/**
 *  Validates one `AccountSnapshotGuard` row: an account's newest committed version of
 *  its orders and stops, as `client.accountOrders` reads it.
 *
 * @category account views
 */
export declare const accountOrdersGuardWireSchema: import("zod").ZodObject<{
    id: import("zod").ZodString;
    account: import("zod").ZodString;
    datasetGeneration: import("zod").ZodString;
    blockNumber: import("zod").ZodString;
    blockHash: import("zod").ZodString;
    digest: import("zod").ZodString;
}, import("zod/v4/core").$strip>;
/**
 *  Validates one open `Order` row, as the account view selects it.
 *
 *  Numbers are decimal strings. {@link AccountOrder} is the same row with `bigint` values.
 *
 * @category account views
 */
export declare const accountOrderRowWireSchema: import("zod").ZodObject<{
    isBid: import("zod").ZodBoolean;
    side: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<{
        BUY_YES: "BUY_YES";
        SELL_YES: "SELL_YES";
        BUY_NO: "BUY_NO";
        SELL_NO: "SELL_NO";
    }>>>;
    userData: import("zod").ZodString;
    price: import("zod").ZodString;
    fullQuantity: import("zod").ZodString;
    quantityRemaining: import("zod").ZodString;
    filledQuantity: import("zod").ZodString;
    expireTimestampNs: import("zod").ZodString;
    status: import("zod").ZodLiteral<"Open">;
    rested: import("zod").ZodBoolean;
    cancelReason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
    amendedFromOrderId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
    amendedToOrderId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
    placedAtBlock: import("zod").ZodString;
    placedAtTimestamp: import("zod").ZodString;
    placedTxHash: import("zod").ZodString;
    lastUpdatedAtBlock: import("zod").ZodString;
    lastUpdatedAtTimestamp: import("zod").ZodString;
    market_id: import("zod").ZodString;
    orderId: import("zod").ZodString;
    orderIdRaw: import("zod").ZodString;
    id: import("zod").ZodString;
    owner: import("zod").ZodString;
}, import("zod/v4/core").$strip>;
/**
 *  Validates one pending `StopOrder` row, as the account view selects it.
 *
 *  Numbers are decimal strings. {@link AccountStop} is the same row with `bigint`
 *  values, plus the venue and the limit price the row does not carry.
 *
 * @category account views
 */
export declare const accountStopRowWireSchema: import("zod").ZodObject<{
    registry: import("zod").ZodString;
    isBid: import("zod").ZodBoolean;
    quantity: import("zod").ZodString;
    triggerPrice: import("zod").ZodString;
    triggerOperator: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<0>, import("zod").ZodLiteral<1>]>;
    orderType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<0>, import("zod").ZodLiteral<1>]>;
    builder: import("zod").ZodString;
    builderFeeBpsTimes1k: import("zod").ZodString;
    status: import("zod").ZodLiteral<"PENDING">;
    placedOrderId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
    dropReason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<0>, import("zod").ZodLiteral<1>, import("zod").ZodLiteral<2>, import("zod").ZodLiteral<3>, import("zod").ZodLiteral<4>, import("zod").ZodLiteral<5>]>>>;
    siblingOrderId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
    intent: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<0>, import("zod").ZodLiteral<1>]>>>;
    cancelReason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
    createdAt: import("zod").ZodString;
    updatedAt: import("zod").ZodString;
    txHash: import("zod").ZodString;
    market_id: import("zod").ZodString;
    orderIdRaw: import("zod").ZodString;
    id: import("zod").ZodString;
    owner: import("zod").ZodString;
}, import("zod/v4/core").$strip>;
