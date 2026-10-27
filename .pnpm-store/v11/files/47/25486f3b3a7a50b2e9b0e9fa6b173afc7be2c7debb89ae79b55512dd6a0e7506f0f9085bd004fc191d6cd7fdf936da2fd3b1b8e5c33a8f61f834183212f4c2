// BinaryMarketsModule write + read ABIs (settlement-extraction v2). The module is
// the user-facing markets contract (config `binaryModule`): it owns the pools,
// routes redemption through the settlement singleton (external redeem/redeemFor
// signatures UNCHANGED from v1), and exposes the permissionless keeper entries
// `finalizeMarket` / `releasePool` plus the creator-scoped free-pool reads.
// Signatures mirror smart-contracts/src/modules/BinaryMarketsModule.sol EXACTLY.

import { parseAbi } from "viem";

/**
 *  BinaryMarketsModule write surface — for keepers/tooling redeeming, minting/merging
 *  complete sets, or driving `finalizeMarket`/`releasePool` directly.
 *
 * @category ABIs
 */
export const binaryModuleWriteAbi = parseAbi([
  // Redemption — trader-facing, signatures UNCHANGED from v1. The module pulls the
  // caller's winning outcome tokens then redeems through the settlement singleton;
  // `(operatorId, venueId)` are attribution-only (may be 0).
  "function redeem(uint32 operatorId, bytes32 venueId, bytes32 marketId, uint8 outcomeIdx, uint256 amount)",
  "function redeemMany(uint32 operatorId, bytes32 venueId, bytes32[] marketIds, uint8[] outcomeIdxs, uint256[] amounts)",
  "function redeemFor(address owner, uint256 nonce, uint256 deadline, bytes sig, uint32 operatorId, bytes32 venueId, bytes32 marketId, uint8 outcomeIdx, uint256 amount)",
  // Complete-set mint / merge — pool surface unchanged; module orchestrates.
  "function mintCompleteSet(uint32 operatorId, bytes32 venueId, bytes32 marketId, uint256 amount)",
  "function mergeCompleteSet(uint32 operatorId, bytes32 venueId, bytes32 marketId, uint256 amount)",
  // NEW permissionless keeper entries. `finalizeMarket` sweeps the pool's backing
  // + resolution snapshot to settlement (no-op-guarded against double-finalize);
  // `releasePool` returns a finalized, drained pool to its creator's free list for
  // recycle. Both revert if the module has no settlement wired.
  "function finalizeMarket(bytes32 marketId)",
  "function releasePool(bytes32 marketId)",
  // Permissionless earmark reconcile. `BinaryMarket.voidExpired()` (the dead-oracle
  // escape hatch) flips a market Voided directly, bypassing the module — so the
  // oracle adapter's onResolved (hub earmark release) never fires. `syncSettlement`
  // drives that missing release once the market is terminal (reverts
  // `MarketNotSettled` while still live). Idempotent on the hub side.
  "function syncSettlement(bytes32 marketId)",
  // Permissionless oracle retry — the FIRST thing to try when a market is past
  // expiry with no resolution. Keyed by ORACLE QUESTION, not market: the module
  // fans out to every market bound to that question, pulls each one's adapter,
  // and resolves the ones that answer. Unanswered adapters are skipped, so a
  // partial success is a success; it reverts `OracleNotAnswered` only when none
  // answered, and `UnknownOracleQuestion` when no market is bound at all.
  "function pokeOracle(uint256 oracleQuestionId)",
]);

/**
 *  The slice of {@link https://github.com/somnia-chain/somnia-markets IOracleAdapter}
 *  a client needs to read a market's resolution price straight from chain.
 *
 *  Only the numeric answer and its scale. `pullNumericAnswer` REVERTS while the
 *  question is not final (the interface's own contract), so callers treat a
 *  revert as "no answer yet", not as an error.
 *
 *  `PRICE_DECIMALS` is NOT part of IOracleAdapter — the answer scale is a
 *  per-question `numericDecimals` the adapter is free to carry however it
 *  likes, and adapters differ in practice: the price-feed adapter answers in 18
 *  decimals and exposes this getter, while OracleHub answers in 2 and has no
 *  getter at all. So a caller reads it opportunistically and falls back.
 */
export const oracleAdapterReadAbi = parseAbi([
  "function pullNumericAnswer(uint256 oracleQuestionId) view returns (int256 numericValue, bool voided)",
  "function PRICE_DECIMALS() view returns (uint256)",
]);

/**
 * Read-only BinaryMarketsModule ABI for settlement discovery, pool reuse, and
 * market records.
 *
 * **When to use**
 *
 * Use when keeper or verification code needs the module's chain state without
 * constructing contract signatures by hand.
 *
 * **Gotchas**
 *
 * The `markets` tuple keeps its v1 layout. Read `marketNonce` separately when
 * you need the outcome-token identifier encoding.
 *
 * @category ABIs
 */
export const binaryModuleReadAbi = parseAbi([
  // The permanent BinarySettlement singleton every pool finalizes into.
  "function settlement() view returns (address)",
  // A pool's creator (its first-deploy creator) — the only party that can reuse it.
  "function poolCreator(address pool) view returns (address creator)",
  // The creator's free (finalized + released, reusable) pools for a collateral.
  "function getFreePools(address creator, address collateral) view returns (address[] pools)",
  "function freePoolCount(address creator, address collateral) view returns (uint256 count)",
  // A market's pool nonce (part of its outcome-id encoding). Separate view — the
  // wide `markets` tuple keeps its v1 ABI.
  "function marketNonce(bytes32 marketId) view returns (uint64 nonce)",
  // marketId => the value-type MarketRecord fields (ABI unchanged from v1).
  "function markets(bytes32 marketId) view returns (uint256 oracleQuestionId, uint8 outcomeSlotCount, uint8 voidPolicy, address collateral, uint32 originOperatorId, bytes32 originVenueId, address oracleAdapter, address creator, address market, address pool, uint256 yesId, uint256 noId, uint64 tradingStart, uint64 expiry)",
  // Reverse lookup: BinaryMarket address => marketId. Written once per market,
  // in the shared create body after the record is stored, and never deleted —
  // so the mapping is append-only and a market address resolves to the same id
  // for the module's lifetime. Returns bytes32(0) for an address this module
  // did not create. This is the address->id half of the chain-only pool→market
  // binding (see `getPoolMarketBinding`).
  "function marketIdByAddress(address market) view returns (bytes32 marketId)",
]);
