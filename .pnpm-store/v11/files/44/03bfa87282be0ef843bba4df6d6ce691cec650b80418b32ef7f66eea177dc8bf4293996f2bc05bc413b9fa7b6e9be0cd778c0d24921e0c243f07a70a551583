import type { WireOrderChange, WireOrderPayload, WireOrderRow, WireStopChange, WireStopPayload, WireStopRow } from "./wireSchemas.js";
/** The orders and stops live at one instant. */
export interface InventoryView {
    orders: ReadonlyMap<string, WireOrderPayload>;
    stops: ReadonlyMap<string, WireStopPayload>;
}
/** How long an order stays in the inventory after it expires, hidden: ten minutes, in nanoseconds. */
export declare const EXPIRED_KEPT_NS = 600000000000n;
export declare class AccountInventory {
    private readonly orders;
    private readonly stops;
    constructor(snapshot: {
        orders: readonly WireOrderRow[];
        stops: readonly WireStopRow[];
    });
    /** Applies the changes of one `applied` verdict. */
    apply(changes: {
        orderChanges: readonly WireOrderChange[];
        stopChanges: readonly WireStopChange[];
    }): void;
    /** The orders and stops live at `nowNs`. Stops do not expire. */
    liveAt(nowNs: bigint): InventoryView;
    /** Whether the account still holds the stop. */
    hasStop(id: string): boolean;
    /** How many orders and stops are live at `nowNs`, for the capacity rule. */
    sizeAt(nowNs: bigint): {
        orders: number;
        stops: number;
    };
    /** Drops the orders that expired more than {@link EXPIRED_KEPT_NS} before `nowNs`. A later change for one adds it back as it says. */
    private dropExpired;
    /**
     *  The first instant after `nowNs` at which a live order stops being live, or `null`
     *  when no live order expires.
     *
     *  An order is live while its expiry is at or after the current time, so it drops out
     *  one nanosecond after its expiry. It expires by time alone, with no stream event, so
     *  the session schedules a new view for this instant.
     */
    nextExpiryChangeNs(nowNs: bigint): bigint | null;
}
