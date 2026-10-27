import type { FillRow, OrderFillRow, UserFillHistory } from "./fills.js";
import type { MarketType } from "./markets.js";
/**
 * The format of a stored history. Raise it when the stored row shape changes:
 * held rows below the window are never read again, so a history of the old
 * shape must be read again from the start rather than mixed with new rows.
 */
export declare const VERSION = 1;
/** What a held history must match to be updated rather than read again. */
export type Scope = {
    readonly chainId: number;
    readonly account: string;
    readonly marketType: MarketType | null;
};
type Position = Pick<OrderFillRow, "timestamp" | "blockNumber" | "logIndex">;
/**
 * Order two fill positions: negative when `a` is older, positive when `a` is
 * newer, zero at the same position. Block numbers can exceed 2^53, so they are
 * compared as decimal strings and never converted to a number.
 */
export declare function comparePosition(a: Position, b: Position): number;
/**
 * A row the history can hold: canonical position scalars, a timestamp that is
 * a safe integer (the window arithmetic converts it to a number), and an id.
 */
export declare function isPositioned(row: FillRow): row is OrderFillRow;
/**
 * Whether `history` can be updated in place for a call with `scope`.
 *
 * Anything else is read again from the start: another account, chain, market
 * kind or format version; a missing dataset generation; rows out of order,
 * repeated or without a usable position; and a history that says older fills
 * exist while it holds none. This never throws. A caller's stored state is
 * data the SDK checks, not a programming error to fail the read over.
 */
export declare function isUsable(history: UserFillHistory, scope: Scope): boolean;
/**
 * The index of the first held row older than `floor` seconds. The rows before
 * it are the overlap a refresh reads again and checks. The floor second itself
 * is inside the overlap, as it is in the indexer's `timestamp >= floor` filter.
 */
export declare function windowEnd(fills: readonly OrderFillRow[], floor: number): number;
/**
 * What a refresh found when it compared the rows it read at or below the newest
 * held fill with the held overlap.
 *
 * - `match`: the rows are the held overlap, row for row and field for field,
 *   after the newest `missing` held fills. `missing` is 0 when the indexer
 *   serves every held fill again. It is more than 0 when the indexer does not
 *   serve the newest held fills now but serves every held fill below them: an
 *   indexer that is behind, or a reorg that removed the newest blocks. Only a
 *   reorg also serves fills newer than the missing ones, which the caller sees.
 * - `cut`: the held history is truncated, its last fill is inside the overlap,
 *   and the read went past that fill. A larger `maxRows` than the history was
 *   read with does this.
 * - `mismatch`: any other difference. A held fill changed, a held fill is gone
 *   while an older held fill is still served, or a fill the history does not
 *   hold appears at or below its newest fill.
 */
export type OverlapCheck = {
    readonly kind: "match";
    readonly missing: number;
} | {
    readonly kind: "cut";
} | {
    readonly kind: "mismatch";
};
/**
 * Compare the rows a refresh read at or below the newest held fill (`seen`,
 * newest first) with the held overlap, the first `overlap` rows of `held`. A
 * read that stopped at `maxRows` (`partial`) has to match the newest part of
 * what it reaches; a complete read has to match all of it.
 */
export declare function checkOverlap(seen: readonly OrderFillRow[], held: UserFillHistory, overlap: number, partial: boolean): OverlapCheck;
/** True when two row lists hold the same objects in the same order. */
export declare function sameRows(a: readonly OrderFillRow[], b: readonly OrderFillRow[]): boolean;
export {};
