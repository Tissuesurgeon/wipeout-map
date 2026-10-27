// topic0 indexes for receipt/subscription log decoding.
//
// WHY THIS EXISTS. viem's `decodeEventLog` memoizes nothing: for every log it walks
// the ABI and derives each candidate's selector (`formatAbiItem` → keccak) until one
// matches. A log the ABI does NOT carry costs a full scan AND a thrown `BaseError`,
// which builds a formatted message and captures a stack — then the caller swallows it.
//
// Measured against `liveEventsAbi` (29 events), per log:
//
//     matched                28.9 µs
//     unmatched (throws)    223.4 µs      <- 7.7x a matched log
//     topic0 Set pre-check    0.054 µs
//
// Foreign logs are the COMMON case, not the exception — any ERC-20 `Transfer` from a
// token in the same transaction lands in the same receipt, and the live tail decodes
// every block. Checking membership first turns the expensive path into a pointer
// compare and leaves the decode for logs we actually want.
//
// This is a PRE-CHECK, deliberately not a `decodeEventLog({ abi: [item] })` dispatch.
// Narrowing the ABI to one entry would change the return type from the whole ABI's
// discriminated union to that single event's, and callers like `liveTail.decode`
// depend on the union — collapsing it is what forces `args: any` and a cast at every
// read downstream.

import { toEventSelector, type Hex } from "viem";

/**
 * Returns every `topic0` that an ABI can decode, computed once.
 *
 *  Build this at module scope, never per call — the selector derivation it front-loads
 *  is the exact cost being avoided.
 *
 * @internal
 */
export function topic0Set(abi: readonly unknown[]): ReadonlySet<Hex> {
  const out = new Set<Hex>();
  for (const item of abi as ReadonlyArray<{ type?: string }>) {
    if (item.type !== "event") continue;
    out.add(toEventSelector(item as never));
  }
  return out;
}

/**
 * Checks whether a log topic is one of the events used to build the index.
 *
 *  An anonymous event carries no topic0, so a log with no topics is never decodable
 *  against a named-event ABI and is reported unknown rather than probed.
 *
 * @internal
 */
export function isKnownTopic0(index: ReadonlySet<Hex>, topics: readonly Hex[] | undefined): boolean {
  const topic0 = topics?.[0];
  return topic0 !== undefined && index.has(topic0);
}
