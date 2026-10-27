import type { AccountOrder, AccountStop } from "./types.js";
import type { WireOrderPayload, WireStopPayload } from "./wireSchemas.js";
/** A stop before enrichment: every field its row carries. */
export type AccountStopTerms = Omit<AccountStop, "venue" | "limitPrice">;
/**
 *  One open order, from its row id, its owner and its payload.
 *
 *  A snapshot row carries all three. A stream change carries the id and the owner in
 *  its envelope, so both paths share this mapping.
 */
export declare function toAccountOrder(id: string, owner: string, payload: WireOrderPayload): AccountOrder;
/** One pending stop's terms, from its row id, its owner and its payload. */
export declare function toStopTerms(id: string, owner: string, payload: WireStopPayload): AccountStopTerms;
/** Rows sorted by id in UTF-16 code-unit order, so the same inventory always lists the same way. */
export declare function byId<Row extends {
    readonly id: string;
}>(rows: readonly Row[]): readonly Row[];
