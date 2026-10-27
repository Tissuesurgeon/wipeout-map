import type { Address, DecodeEventLogReturnType } from "viem";
import type { MaterializerStore } from "./store.js";
import type { liveEventsAbi } from "./eventsAbi.js";
/**
 *  What `decodeEventLog` returns for the live ABI: a union of
 *  `{ eventName, args }`, one member per event.
 *
 *  Derived from viem rather than abitype directly — viem re-exports this and
 *  abitype is only a transitive dep, so this adds no dependency. `liveEventsAbi`
 *  is `as const`, which is what makes the union resolve instead of collapsing to
 *  `string` / `unknown`.
 */
type LiveEventLog = DecodeEventLogReturnType<typeof liveEventsAbi>;
/** Every event name in the live ABI — the discriminant. */
export type LiveEventName = LiveEventLog["eventName"];
/**
 *  A decoded chain event, normalized with the block context the reducer needs.
 *
 *  **Details**
 *
 *  A DISCRIMINATED UNION over the live ABI's event names, derived from the ABI
 *  itself — so `switch (ev.eventName)` narrows `ev.args` to exactly that event's
 *  parameters (`uint256` → `bigint`, `address` → `` `0x${string}` ``, a `tuple` →
 *  a nested object). A renamed or retyped ABI parameter becomes a `tsc` error at
 *  the read rather than a silent `undefined` at runtime.
 *
 *  **Gotchas**
 *
 *  `args` is only typed AFTER narrowing on `eventName`. A handler taking the bare
 *  union sees no usable `args`, so handlers take their own member ({@link EventOf})
 *  and {@link applyEvent}'s switch does the narrowing.
 */
export type DecodedEvent = LiveEventLog & {
    /** lowercased log source address (a pool, a BinaryMarket, or the factory) */
    address: Address;
    blockNumber: number;
    logIndex: number;
    timestampSec: number;
    txHash: string;
};
/** The {@link DecodedEvent} member for one event name — a handler's parameter type. */
export type EventOf<N extends LiveEventName> = Extract<DecodedEvent, {
    eventName: N;
}>;
/**
 *  Apply one decoded event to `store`. Does NOT commit — caller batches per block.
 *  Returns false for an event with no case, so a block of only those commits nothing.
 */
export declare function applyEvent(ev: DecodedEvent, store: MaterializerStore): boolean;
export {};
