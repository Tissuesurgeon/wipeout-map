/**
 * A binary outcome index: 0 = YES, 1 = NO.
 *
 * @category encoding
 */
export type OutcomeIdx = 0 | 1;
/**
 * The ERC-6909 outcome id for `pool`'s market at `nonce`, outcome `idx`.
 * `id = (uint160(pool) << 72) | (nonce << 8) | idx`. Pool is a 0x-address;
 * nonce is the pool's `marketNonce` for the target market (1 on a fresh pool,
 * ++ on each recycle); idx is 0 (YES) or 1 (NO).
 *
 * @category encoding
 */
export declare function outcomeId(pool: string, nonce: bigint | number, idx: OutcomeIdx): bigint;
/**
 * The decoded components of an outcome id.
 *
 * @category encoding
 */
export interface DecodedOutcomeId {
    /** The pool address (the encoded high 160 bits), lowercased 0x-hex. */
    pool: `0x${string}`;
    /** The pool's market nonce this id belongs to. */
    nonce: bigint;
    /** The outcome index (0 = YES, 1 = NO). */
    idx: number;
}
/**
 * Split an outcome id back into `{ pool, nonce, idx }` — the inverse of {@link outcomeId}.
 *
 * @category encoding
 */
export declare function decodeOutcomeId(id: bigint): DecodedOutcomeId;
/**
 * The settlement `marketKey` for any outcome id of a market: `id >> 8`. Both the
 * YES id and the NO id of the same market map to the SAME key (they differ only
 * in the low 8 idx bits), so this keys the per-market `BinarySettlement` record
 * regardless of which side's id you pass. Named `marketKey(yesId)` for the
 * canonical YES-id caller, but any outcome id of the market works.
 *
 * @category encoding
 */
export declare function marketKey(outcomeId: bigint): bigint;
