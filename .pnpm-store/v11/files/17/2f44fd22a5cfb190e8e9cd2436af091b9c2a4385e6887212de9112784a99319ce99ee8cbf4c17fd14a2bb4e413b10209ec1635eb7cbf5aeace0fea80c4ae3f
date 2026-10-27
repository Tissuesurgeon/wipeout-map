import { type Hex } from "viem";
/**
 *  Compares two strings by UTF-16 code unit.
 *
 *  The producer sorts keys this way because relational string comparison has no
 *  locale data. `localeCompare` would give a different order on another runtime.
 */
export declare function compareCodeUnits(left: string, right: string): number;
/**
 *  Serializes a wire value to the producer's canonical JSON.
 *
 *  Object keys are sorted by UTF-16 code unit. A `bigint` becomes its decimal string,
 *  which is how Hasura serializes numeric columns. `undefined` becomes `null`, which is
 *  how GraphQL returns an absent nullable column. Every other value uses `JSON.stringify`.
 */
export declare function canonicalJson(value: unknown): string;
/**
 *  The producer's digest of one payload: SHA-256 over the UTF-8 bytes of its
 *  canonical JSON, as lowercase `0x` hex.
 *
 *  The digest covers raw wire values. Compute it before any conversion to domain
 *  types, because a converted value serializes differently.
 */
export declare function payloadDigest(payload: unknown): Hex;
