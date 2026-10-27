import type { AccountStopTerms } from "./rows.js";
import type { AccountStop, AccountStopLimitPrice, AccountStopVenue } from "./types.js";
/** Where a log sits in the chain, so two changes of one stop can be ordered. */
export interface LogPosition {
    readonly blockNumber: bigint;
    readonly logIndex: number;
}
/** Whether `a` comes after `b` in the chain. */
export declare function isAfter(a: LogPosition, b: LogPosition): boolean;
/** A stop's venue and limit price, which the view reads apart from its terms. */
export interface StopValues {
    readonly venue: AccountStopVenue;
    readonly limitPrice: AccountStopLimitPrice;
}
export declare class StopOverlay {
    #private;
    /** Whether the overlay holds a stop created on chain that has not ended. */
    holds(id: string): boolean;
    /** The stops created on chain that have not ended, with their terms. */
    createdStops(): AccountStopTerms[];
    /** Whether nothing is held. */
    isEmpty(): boolean;
    /** The newest block of any change held, or `null` when none is. */
    latestBlock(): bigint | null;
    /** A stop was created. Returns whether anything changed: a creation counts once. */
    created(id: string, at: LogPosition, timestamp: bigint, terms: AccountStopTerms): boolean;
    /** A stop's intent was set. Returns whether anything changed. */
    intent(id: string, at: LogPosition, timestamp: bigint, intent: number): boolean;
    /** A stop was linked to its other leg, or unlinked (`null`). Returns whether anything changed. */
    sibling(id: string, at: LogPosition, timestamp: bigint, siblingOrderId: bigint | null): boolean;
    /** A stop is no longer pending. Returns whether anything changed: an end is final. */
    ended(id: string, at: LogPosition): boolean;
    /**
     *  Drops every change at or before `versionBlock`, which the indexer's view now holds.
     *  Returns whether anything was dropped.
     */
    prune(versionBlock: bigint): boolean;
    /**
     *  The indexer's stops with the changes held here on top, sorted by id. A stop created
     *  here takes its venue and limit price from `valuesOf`. A stop the overlay does not
     *  touch keeps its object.
     */
    merge(base: readonly AccountStop[], valuesOf: (id: string) => StopValues): readonly AccountStop[];
}
