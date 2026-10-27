// The account inventory: the open orders and pending stops a reader holds.
//
// A guarded snapshot seeds the inventory and `applied` stream verdicts advance it.
// Rows are keyed by physical entity id, which is the snapshot row id. A REPLACE stores
// a new payload object and a REMOVE deletes the row, so a row no change touched keeps
// its object identity. Callers rely on that to skip work for unchanged rows.
//
// No event retires a lazily expired order. `liveAt` hides one from its expiry on, with the
// same cutoff the snapshot query applies, and the inventory drops it ten minutes later.
// Kept for good, every order that expires unswept would stay for the life of the
// subscription and every read would scan it. Kept for a while, an order this machine's
// clock hid too early shows again when the clock is set back.
//
// This is the SDK's port of `AccountInventory` in `indexer/scripts/account-stream-lib.ts`.

import type {
  WireOrderChange,
  WireOrderPayload,
  WireOrderRow,
  WireStopChange,
  WireStopPayload,
  WireStopRow,
} from "./wireSchemas.js";

/** The orders and stops live at one instant. */
export interface InventoryView {
  orders: ReadonlyMap<string, WireOrderPayload>;
  stops: ReadonlyMap<string, WireStopPayload>;
}

function orderPayloadOf(row: WireOrderPayload): WireOrderPayload {
  return {
    market_id: row.market_id,
    orderId: row.orderId,
    orderIdRaw: row.orderIdRaw,
    isBid: row.isBid,
    side: row.side ?? null,
    userData: row.userData,
    price: row.price,
    fullQuantity: row.fullQuantity,
    quantityRemaining: row.quantityRemaining,
    filledQuantity: row.filledQuantity,
    expireTimestampNs: row.expireTimestampNs,
    status: row.status,
    rested: row.rested,
    cancelReason: row.cancelReason ?? null,
    amendedFromOrderId: row.amendedFromOrderId ?? null,
    amendedToOrderId: row.amendedToOrderId ?? null,
    placedAtBlock: row.placedAtBlock,
    placedAtTimestamp: row.placedAtTimestamp,
    placedTxHash: row.placedTxHash,
    lastUpdatedAtBlock: row.lastUpdatedAtBlock,
    lastUpdatedAtTimestamp: row.lastUpdatedAtTimestamp,
  };
}

function stopPayloadOf(row: WireStopPayload): WireStopPayload {
  return {
    market_id: row.market_id,
    orderIdRaw: row.orderIdRaw,
    registry: row.registry,
    isBid: row.isBid,
    quantity: row.quantity,
    triggerPrice: row.triggerPrice,
    triggerOperator: row.triggerOperator,
    orderType: row.orderType,
    builder: row.builder,
    builderFeeBpsTimes1k: row.builderFeeBpsTimes1k,
    status: row.status,
    placedOrderId: row.placedOrderId ?? null,
    dropReason: row.dropReason ?? null,
    siblingOrderId: row.siblingOrderId ?? null,
    intent: row.intent ?? null,
    cancelReason: row.cancelReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    txHash: row.txHash,
  };
}

/** Whether the snapshot query would still return an order at `nowNs`. Zero means no expiry. */
function liveOrder(order: WireOrderPayload, nowNs: bigint): boolean {
  const expiry = BigInt(order.expireTimestampNs);
  return expiry === 0n || expiry >= nowNs;
}

/** How long an order stays in the inventory after it expires, hidden: ten minutes, in nanoseconds. */
export const EXPIRED_KEPT_NS = 600_000_000_000n;

export class AccountInventory {
  private readonly orders = new Map<string, WireOrderPayload>();
  private readonly stops = new Map<string, WireStopPayload>();

  constructor(snapshot: { orders: readonly WireOrderRow[]; stops: readonly WireStopRow[] }) {
    for (const order of snapshot.orders) this.orders.set(order.id, orderPayloadOf(order));
    for (const stop of snapshot.stops) this.stops.set(stop.id, stopPayloadOf(stop));
  }

  /** Applies the changes of one `applied` verdict. */
  apply(changes: { orderChanges: readonly WireOrderChange[]; stopChanges: readonly WireStopChange[] }): void {
    for (const change of changes.orderChanges) {
      if (change.operation === "REMOVE") this.orders.delete(change.physicalEntityId);
      else this.orders.set(change.physicalEntityId, orderPayloadOf(change));
    }
    for (const change of changes.stopChanges) {
      if (change.operation === "REMOVE") this.stops.delete(change.physicalEntityId);
      else this.stops.set(change.physicalEntityId, stopPayloadOf(change));
    }
  }

  /** The orders and stops live at `nowNs`. Stops do not expire. */
  liveAt(nowNs: bigint): InventoryView {
    this.dropExpired(nowNs);
    const orders = new Map<string, WireOrderPayload>();
    for (const [id, order] of this.orders) if (liveOrder(order, nowNs)) orders.set(id, order);
    return { orders, stops: new Map(this.stops) };
  }

  /** Whether the account still holds the stop. */
  hasStop(id: string): boolean {
    return this.stops.has(id);
  }

  /** How many orders and stops are live at `nowNs`, for the capacity rule. */
  sizeAt(nowNs: bigint): { orders: number; stops: number } {
    this.dropExpired(nowNs);
    let orders = 0;
    for (const order of this.orders.values()) if (liveOrder(order, nowNs)) orders += 1;
    return { orders, stops: this.stops.size };
  }

  /** Drops the orders that expired more than {@link EXPIRED_KEPT_NS} before `nowNs`. A later change for one adds it back as it says. */
  private dropExpired(nowNs: bigint): void {
    for (const [id, order] of this.orders) {
      const expiry = BigInt(order.expireTimestampNs);
      if (expiry !== 0n && expiry + EXPIRED_KEPT_NS < nowNs) this.orders.delete(id);
    }
  }

  /**
   *  The first instant after `nowNs` at which a live order stops being live, or `null`
   *  when no live order expires.
   *
   *  An order is live while its expiry is at or after the current time, so it drops out
   *  one nanosecond after its expiry. It expires by time alone, with no stream event, so
   *  the session schedules a new view for this instant.
   */
  nextExpiryChangeNs(nowNs: bigint): bigint | null {
    let next: bigint | null = null;
    for (const order of this.orders.values()) {
      const expiry = BigInt(order.expireTimestampNs);
      if (expiry === 0n || expiry < nowNs) continue;
      if (next === null || expiry + 1n < next) next = expiry + 1n;
    }
    return next;
  }
}
