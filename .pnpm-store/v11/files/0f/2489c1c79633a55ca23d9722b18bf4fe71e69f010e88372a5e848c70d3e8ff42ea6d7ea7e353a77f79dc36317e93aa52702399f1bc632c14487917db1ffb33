// Fill history state: the pure half of `getUserFillHistory`.
//
// A caller holds an account's fills, newest first, and asks for them brought up
// to date. This module decides whether the held state can be trusted, where the
// overlap a refresh reads again ends, and whether the rows read there are still
// the held ones, or the held ones without the newest. It does no I/O; `fills.ts`
// owns the reads.
//
// Every rule here keeps one invariant: a history the SDK returns passes
// `isUsable` on the next call. Its rows are newest first, in strictly descending
// `(timestamp, blockNumber, logIndex)` order, and each id appears once. A
// returned history that broke it would be read again from the start on every
// later call, which costs the whole tape each time and still looks like success.
import * as FillPagination from "./fillPagination.js";
/**
 * The format of a stored history. Raise it when the stored row shape changes:
 * held rows below the window are never read again, so a history of the old
 * shape must be read again from the start rather than mixed with new rows.
 */
export const VERSION = 1;
/** Compare two canonical unsigned decimal strings by value, without converting them. */
function compareDecimal(a, b) {
    if (a.length !== b.length)
        return a.length - b.length;
    if (a === b)
        return 0;
    return a < b ? -1 : 1;
}
/**
 * Order two fill positions: negative when `a` is older, positive when `a` is
 * newer, zero at the same position. Block numbers can exceed 2^53, so they are
 * compared as decimal strings and never converted to a number.
 */
export function comparePosition(a, b) {
    return (compareDecimal(a.timestamp, b.timestamp) || compareDecimal(a.blockNumber, b.blockNumber) || a.logIndex - b.logIndex);
}
/**
 * A row the history can hold: canonical position scalars, a timestamp that is
 * a safe integer (the window arithmetic converts it to a number), and an id.
 */
export function isPositioned(row) {
    return (typeof row === "object" &&
        row !== null &&
        typeof row.id === "string" &&
        row.id.length > 0 &&
        FillPagination.isDecimal(row.timestamp) &&
        Number.isSafeInteger(Number(row.timestamp)) &&
        FillPagination.isDecimal(row.blockNumber) &&
        FillPagination.isLogIndex(row.logIndex));
}
/**
 * Whether `history` can be updated in place for a call with `scope`.
 *
 * Anything else is read again from the start: another account, chain, market
 * kind or format version; a missing dataset generation; rows out of order,
 * repeated or without a usable position; and a history that says older fills
 * exist while it holds none. This never throws. A caller's stored state is
 * data the SDK checks, not a programming error to fail the read over.
 */
export function isUsable(history, scope) {
    if (typeof history !== "object" || history === null)
        return false;
    if (history.version !== VERSION || history.chainId !== scope.chainId)
        return false;
    if (history.account !== scope.account || history.marketType !== scope.marketType)
        return false;
    if (typeof history.datasetGeneration !== "string" || history.datasetGeneration.length === 0)
        return false;
    if (typeof history.truncated !== "boolean" || !Array.isArray(history.fills))
        return false;
    if (history.truncated && history.fills.length === 0)
        return false;
    const ids = new Set();
    let newer;
    for (const row of history.fills) {
        if (!isPositioned(row) || ids.has(row.id))
            return false;
        if (newer !== undefined && comparePosition(row, newer) >= 0)
            return false;
        ids.add(row.id);
        newer = row;
    }
    return true;
}
/**
 * The index of the first held row older than `floor` seconds. The rows before
 * it are the overlap a refresh reads again and checks. The floor second itself
 * is inside the overlap, as it is in the indexer's `timestamp >= floor` filter.
 */
export function windowEnd(fills, floor) {
    const index = fills.findIndex((row) => Number(row.timestamp) < floor);
    return index === -1 ? fills.length : index;
}
const CUT = { kind: "cut" };
const MISMATCH = { kind: "mismatch" };
/**
 * Compare the rows a refresh read at or below the newest held fill (`seen`,
 * newest first) with the held overlap, the first `overlap` rows of `held`. A
 * read that stopped at `maxRows` (`partial`) has to match the newest part of
 * what it reaches; a complete read has to match all of it.
 */
export function checkOverlap(seen, held, overlap, partial) {
    const missing = missingNewest(seen, held.fills, overlap, partial);
    if (missing === null)
        return MISMATCH;
    // The held overlap rows the read must show again, newest first.
    const expected = overlap - missing;
    const shared = Math.min(seen.length, expected);
    for (let index = 0; index < shared; index += 1) {
        const kept = held.fills[missing + index];
        if (kept === undefined || !sameJson(seen[index], kept))
            return MISMATCH;
    }
    if (seen.length === expected || (partial && seen.length < expected))
        return { kind: "match", missing };
    // The read went past the held overlap. Fills below the last held fill are new
    // to the history only when the history was cut there and that cut is inside
    // the overlap. Anywhere else, a fill the history does not hold appeared.
    if (seen.length > expected && held.truncated && overlap === held.fills.length)
        return CUT;
    return MISMATCH;
}
/**
 * How many of the newest held fills the read does not show: the held rows
 * newer than the first row it read at or below the newest held fill. Null when
 * that row is older than every held fill in the overlap, so the rows cannot
 * line up. A read with no such row shows none of the overlap, unless it stopped
 * at `maxRows` before it reached the overlap.
 */
function missingNewest(seen, held, overlap, partial) {
    const first = seen[0];
    if (first === undefined)
        return partial ? 0 : overlap;
    const index = held.findIndex((row) => comparePosition(row, first) <= 0);
    return index === -1 || index > overlap ? null : index;
}
/** True when two row lists hold the same objects in the same order. */
export function sameRows(a, b) {
    return a.length === b.length && a.every((row, index) => row === b[index]);
}
/**
 * Equal JSON values: the same primitives, and arrays and objects with equal
 * members. Key order is ignored, so a row that went through storage still
 * matches the same row read fresh. Every field counts, including any the
 * selection gains later, so a row a reorg replaced never passes for the held one.
 */
function sameJson(a, b) {
    if (a === b)
        return true;
    if (typeof a !== "object" || a === null || typeof b !== "object" || b === null)
        return false;
    if (Array.isArray(a) || Array.isArray(b)) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameJson(item, b[i]));
    }
    const left = Object.entries(a);
    const right = new Map(Object.entries(b));
    return left.length === right.size && left.every(([key, value]) => right.has(key) && sameJson(value, right.get(key)));
}
