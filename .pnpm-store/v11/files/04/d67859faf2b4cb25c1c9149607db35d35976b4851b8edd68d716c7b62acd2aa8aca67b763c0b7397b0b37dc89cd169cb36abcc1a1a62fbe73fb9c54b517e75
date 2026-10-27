// The zod schemas the account view validates indexer rows with, published under
// public names.
//
// They are the same objects the SDK validates with, not copies, so a row they reject
// is one the SDK rejects too. They check one row at a time; the SDK's checks across
// rows (owner, ids, versions) are not in them. They validate raw wire rows: numbers
// stay decimal strings, and nothing is transformed.

import * as Wire from "./wireSchemas.js";

/**
 *  Validates one `AccountCapability` row, as `client.accountOrders` reads it.
 *
 *  The row says whether the indexer serves account views on a chain, and under which
 *  manifest and limits.
 *
 * @category account views
 */
export const accountOrdersCapabilityWireSchema = Wire.wireCapabilitySchema;

/**
 *  Validates one `AccountSnapshotGuard` row: an account's newest committed version of
 *  its orders and stops, as `client.accountOrders` reads it.
 *
 * @category account views
 */
export const accountOrdersGuardWireSchema = Wire.wireGuardSchema;

/**
 *  Validates one open `Order` row, as the account view selects it.
 *
 *  Numbers are decimal strings. {@link AccountOrder} is the same row with `bigint` values.
 *
 * @category account views
 */
export const accountOrderRowWireSchema = Wire.wireOrderRowSchema;

/**
 *  Validates one pending `StopOrder` row, as the account view selects it.
 *
 *  Numbers are decimal strings. {@link AccountStop} is the same row with `bigint`
 *  values, plus the venue and the limit price the row does not carry.
 *
 * @category account views
 */
export const accountStopRowWireSchema = Wire.wireStopRowSchema;
