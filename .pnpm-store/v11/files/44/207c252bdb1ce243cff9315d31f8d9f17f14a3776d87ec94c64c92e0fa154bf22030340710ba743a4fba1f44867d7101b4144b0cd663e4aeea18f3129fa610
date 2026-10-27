// Maps validated wire rows to the account view's public rows.
//
// A row reaches this module after `wireSchemas.ts` has checked every field and
// `guardedSnapshot.ts` has checked its owner, its id and its expiry class. So this
// module only converts. Decimal strings become `bigint`, the stop enums become names,
// and addresses become lower-case. It rejects nothing.
//
// A stop's venue and limit price are not in its row. `enrichment.ts` adds them.

import * as PerpStops from "../perp/stops.js";
import * as Raise from "../raise.js";
import * as Canonical from "./canonical.js";
import type { AccountOrder, AccountStop } from "./types.js";
import type { WireOrderPayload, WireStopPayload } from "./wireSchemas.js";

/** A stop before enrichment: every field its row carries. */
export type AccountStopTerms = Omit<AccountStop, "venue" | "limitPrice">;

/** An order row id is `<pool>_<orderId>`. `guardedSnapshot.ts` checks the whole form. */
const ORDER_POOL = /^(0x[0-9a-f]{40})_/;

function optionalBigInt(value: string | null | undefined): bigint | null {
  return value == null ? null : BigInt(value);
}

/**
 *  One open order, from its row id, its owner and its payload.
 *
 *  A snapshot row carries all three. A stream change carries the id and the owner in
 *  its envelope, so both paths share this mapping.
 */
export function toAccountOrder(id: string, owner: string, payload: WireOrderPayload): AccountOrder {
  const pool = ORDER_POOL.exec(id)?.[1] ?? Raise.unreachable(`order id ${id} reached the mapping without its pool`);
  return Object.freeze({
    id,
    market: payload.market_id,
    pool,
    orderId: BigInt(payload.orderId),
    orderIdRaw: BigInt(payload.orderIdRaw),
    owner,
    isBid: payload.isBid,
    side: payload.side ?? null,
    userData: BigInt(payload.userData),
    price: BigInt(payload.price),
    fullQuantity: BigInt(payload.fullQuantity),
    quantityRemaining: BigInt(payload.quantityRemaining),
    filledQuantity: BigInt(payload.filledQuantity),
    expireTimestampNs: BigInt(payload.expireTimestampNs),
    status: payload.status,
    rested: payload.rested,
    cancelReason: payload.cancelReason ?? null,
    amendedFromOrderId: optionalBigInt(payload.amendedFromOrderId),
    amendedToOrderId: optionalBigInt(payload.amendedToOrderId),
    placedAtBlock: BigInt(payload.placedAtBlock),
    placedAtTimestamp: BigInt(payload.placedAtTimestamp),
    placedTxHash: payload.placedTxHash,
    lastUpdatedAtBlock: BigInt(payload.lastUpdatedAtBlock),
    lastUpdatedAtTimestamp: BigInt(payload.lastUpdatedAtTimestamp),
  });
}

/** One pending stop's terms, from its row id, its owner and its payload. */
export function toStopTerms(id: string, owner: string, payload: WireStopPayload): AccountStopTerms {
  const registry = payload.registry.toLowerCase();
  const siblingOrderId = optionalBigInt(payload.siblingOrderId);
  return Object.freeze({
    id,
    registry,
    market: payload.market_id,
    // A stop exists only on spot and perp, where the market id is the pool address.
    pool: payload.market_id.toLowerCase(),
    orderIdRaw: BigInt(payload.orderIdRaw),
    owner,
    isBid: payload.isBid,
    quantity: BigInt(payload.quantity),
    triggerPrice: BigInt(payload.triggerPrice),
    triggerOperator: payload.triggerOperator,
    orderType: payload.orderType,
    builder: payload.builder.toLowerCase(),
    builderFeeBpsTimes1k: BigInt(payload.builderFeeBpsTimes1k),
    status: payload.status,
    placedOrderId: optionalBigInt(payload.placedOrderId),
    dropReason: payload.dropReason == null ? null : PerpStops.PERP_STOP_DROP_REASON[payload.dropReason],
    siblingOrderId,
    // A linked pair is two stops in one registry, so the sibling's row id uses this registry.
    siblingId: siblingOrderId === null ? null : `${registry}_${siblingOrderId}`,
    intent: payload.intent == null ? null : PerpStops.decodeIntent(payload.intent),
    cancelReason: payload.cancelReason ?? null,
    createdAt: BigInt(payload.createdAt),
    updatedAt: BigInt(payload.updatedAt),
    txHash: payload.txHash,
  });
}

/** Rows sorted by id in UTF-16 code-unit order, so the same inventory always lists the same way. */
export function byId<Row extends { readonly id: string }>(rows: readonly Row[]): readonly Row[] {
  return Object.freeze([...rows].sort((left, right) => Canonical.compareCodeUnits(left.id, right.id)));
}
