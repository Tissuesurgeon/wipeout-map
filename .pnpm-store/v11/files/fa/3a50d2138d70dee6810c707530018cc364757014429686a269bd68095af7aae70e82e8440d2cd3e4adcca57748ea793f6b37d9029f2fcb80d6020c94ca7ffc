// Canonical JSON and the batch digest of the account change stream.
//
// The indexer publishes a digest for every account change batch (DEXSVC-125). A
// reader rebuilds that digest from the batch row and its children and compares the
// two, so a tampered or incomplete batch cannot pass as complete. The algorithm is
// fixed by `indexer/ACCOUNT-VIEW.md` ("Canonical digest") and implemented by the
// producer in `indexer/src/accountView.ts`. This module is the SDK's copy.
//
// The two copies must stay byte-identical. The literal vectors in
// `test/accountViewCanonical.test.ts` and `indexer/scripts/account-view-digest-vectors.test.ts`
// pin the same digests on both sides.
import { sha256, stringToBytes } from "viem";
/**
 *  Compares two strings by UTF-16 code unit.
 *
 *  The producer sorts keys this way because relational string comparison has no
 *  locale data. `localeCompare` would give a different order on another runtime.
 */
export function compareCodeUnits(left, right) {
    if (left < right)
        return -1;
    return Number(left > right);
}
/**
 *  Serializes a wire value to the producer's canonical JSON.
 *
 *  Object keys are sorted by UTF-16 code unit. A `bigint` becomes its decimal string,
 *  which is how Hasura serializes numeric columns. `undefined` becomes `null`, which is
 *  how GraphQL returns an absent nullable column. Every other value uses `JSON.stringify`.
 */
export function canonicalJson(value) {
    if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(",")}]`;
    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value).sort(([left], [right]) => compareCodeUnits(left, right));
        return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
    }
    if (typeof value === "bigint")
        return JSON.stringify(value.toString());
    if (value === undefined)
        return "null";
    return JSON.stringify(value);
}
/**
 *  The producer's digest of one payload: SHA-256 over the UTF-8 bytes of its
 *  canonical JSON, as lowercase `0x` hex.
 *
 *  The digest covers raw wire values. Compute it before any conversion to domain
 *  types, because a converted value serializes differently.
 */
export function payloadDigest(payload) {
    // `sha256` treats any `0x…` string as hex, so the JSON must be passed as bytes.
    return sha256(stringToBytes(canonicalJson(payload)));
}
