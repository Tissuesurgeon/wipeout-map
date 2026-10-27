import { type Hex } from "viem";
/**
 * Returns every `topic0` that an ABI can decode, computed once.
 *
 *  Build this at module scope, never per call — the selector derivation it front-loads
 *  is the exact cost being avoided.
 *
 * @internal
 */
export declare function topic0Set(abi: readonly unknown[]): ReadonlySet<Hex>;
/**
 * Checks whether a log topic is one of the events used to build the index.
 *
 *  An anonymous event carries no topic0, so a log with no topics is never decodable
 *  against a named-event ABI and is reported unknown rather than probed.
 *
 * @internal
 */
export declare function isKnownTopic0(index: ReadonlySet<Hex>, topics: readonly Hex[] | undefined): boolean;
