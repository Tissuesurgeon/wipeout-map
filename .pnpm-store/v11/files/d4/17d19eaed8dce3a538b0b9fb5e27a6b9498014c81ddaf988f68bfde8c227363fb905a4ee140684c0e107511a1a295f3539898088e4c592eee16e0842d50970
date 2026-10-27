// ERC-6909 outcome-id encoding — the SINGLE source of truth for the SDK.
//
// Settlement-extraction v2 (`refactor/binary-pool-settlement-split`) re-pointed a
// pool at successive markets, so the outcome id can no longer be `(pool << 8) |
// idx` — that would collide every market a recycled pool serves onto the same two
// ids. The v2 scheme wedges the pool's own per-market `nonce` (starts 1, ++ on
// each recycle) between the pool address and the outcome index:
//
//   id = (uint160(pool) << 72) | (uint64(nonce) << 8) | idx
//
// The pool address occupies the upper 160 bits (storage-free mint/burn authority:
// `msg.sender == address(uint160(id >> 72))`), the nonce the next 64 bits, and the
// outcome index the low 8. Successive markets on one pool therefore get disjoint id
// ranges, so a market finalized generations ago stays redeemable on the settlement
// singleton forever without collision.
//
//   marketKey = id >> 8 = (uint160(pool) << 64) | nonce
//
// keys the per-market record on `BinarySettlement`. Mirrors on-chain
// `IBinaryPool.outcomeId`, `OutcomeToken6909._poolOf`, and the settlement
// `marketKey` derivation EXACTLY — verify against
// smart-contracts/lib/somnia-dex-protocol/src/interfaces/IBinaryPool.sol.

/** Bit widths of the three id fields (must match the on-chain encoding). */
const IDX_BITS = 8n;
const NONCE_BITS = 64n;
const POOL_SHIFT = IDX_BITS + NONCE_BITS; // 72
const IDX_MASK = (1n << IDX_BITS) - 1n; // 0xff
const NONCE_MASK = (1n << NONCE_BITS) - 1n; // 0xffffffffffffffff

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
export function outcomeId(pool: string, nonce: bigint | number, idx: OutcomeIdx): bigint {
  const n = BigInt(nonce);
  return (BigInt(pool) << POOL_SHIFT) | ((n & NONCE_MASK) << IDX_BITS) | BigInt(idx);
}

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
export function decodeOutcomeId(id: bigint): DecodedOutcomeId {
  const idx = Number(id & IDX_MASK);
  const nonce = (id >> IDX_BITS) & NONCE_MASK;
  // The cast is load-bearing: a template literal widens to `string`, and the
  // `0x` prefix is ours by construction — the compiler cannot see that.
  const pool = `0x${(id >> POOL_SHIFT).toString(16).padStart(40, "0")}` as `0x${string}`;
  return { pool, nonce, idx };
}

/**
 * The settlement `marketKey` for any outcome id of a market: `id >> 8`. Both the
 * YES id and the NO id of the same market map to the SAME key (they differ only
 * in the low 8 idx bits), so this keys the per-market `BinarySettlement` record
 * regardless of which side's id you pass. Named `marketKey(yesId)` for the
 * canonical YES-id caller, but any outcome id of the market works.
 *
 * @category encoding
 */
export function marketKey(outcomeId: bigint): bigint {
  return outcomeId >> IDX_BITS;
}
