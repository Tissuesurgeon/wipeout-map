// ABIs for the operator "market machinery" layer — the OracleHub (Oracle v2's
// ONE governance-approved oracle adapter), the MarketCreator factory + the
// instances it stamps out, plus the governance surface on BinaryMarketsModule.
// These back the OracleHubAdmin / GovernanceAdmin / MarketCreatorAdmin writes
// and their on-chain status reads. READS a UI paginates/filters over come from
// the indexer (see the concept modules' list* reads), so there is no directory
// read ABI here — only the
// write ABIs, the receipt events they decode, and the cheap point-status views
// the preflight validators poll. Signatures mirror
// smart-contracts/src/adapters/OracleHub.sol and
// smart-contracts/src/clob/factories/* EXACTLY.

import { parseAbi } from "viem";

// ---- OracleHub (Oracle v2, DESIGN §8c) ----
// The one protocol-approved adapter every market binds through. Its
// `QuestionDefinition` tuple mirrors src/types/OracleTypes.sol exactly
// (enums encode as uint8):
//   (string questionText, (uint8 sourceType, bytes params)[] sources,
//    (uint8 answerType, string[] discreteOutcomes,
//     (int256 low, int256 high)[] numericIntervals, uint64 numericDecimals) validAnswers,
//    uint256 resolutionTime, uint256 minAgreement,
//    uint256 subcommitteeSize, uint256 subcommitteeThreshold)
// `enableReactivity` / `migrateSubscription` call the Somnia reactivity
// precompile at 0x0100 — present only on testnet/mainnet, NOT local anvil.
/**
 *  OracleHub function ABI (writes + point-status views) — mirrors
 *  `smart-contracts/src/adapters/OracleHub.sol` exactly. Backs the
 *  `OracleHubAdmin` writes and the standalone oracleHub.ts reads.
 *
 * @category ABIs
 */
export const oracleHubAbi = parseAbi([
  // Scheduling (content-addressed dedup): the same template definition returns
  // the SAME question id and is charged only MARGINAL cost — quote via
  // getSchedulingCost (0 for a reuse, the full oracle cost for a new question).
  "function scheduleQuestion((string questionText, (uint8 sourceType, bytes params)[] sources, (uint8 answerType, string[] discreteOutcomes, (int256 low, int256 high)[] numericIntervals, uint64 numericDecimals) validAnswers, uint256 resolutionTime, uint256 minAgreement, uint256 subcommitteeSize, uint256 subcommitteeThreshold) def) payable returns (uint256 oracleQuestionId)",
  "function getSchedulingCost((string questionText, (uint8 sourceType, bytes params)[] sources, (uint8 answerType, string[] discreteOutcomes, (int256 low, int256 high)[] numericIntervals, uint64 numericDecimals) validAnswers, uint256 resolutionTime, uint256 minAgreement, uint256 subcommitteeSize, uint256 subcommitteeThreshold) def) view returns (uint256 cost)",
  "function questionKeyOf((string questionText, (uint8 sourceType, bytes params)[] sources, (uint8 answerType, string[] discreteOutcomes, (int256 low, int256 high)[] numericIntervals, uint64 numericDecimals) validAnswers, uint256 resolutionTime, uint256 minAgreement, uint256 subcommitteeSize, uint256 subcommitteeThreshold) def) pure returns (bytes32 key)",
  // EARMARK-AT-CREATION operator accounts (Oracle v2 §8e). The resolution
  // reserve is ATTACHED to the market-creation value and LOCKED per-market at
  // onBind (earmarkedOf, never withdrawable); at resolution the exact metered
  // cost is charged and any surplus is CREDITED (creditOf / withdrawableOf).
  // withdraw() is credit-only + owner-gated (reverts InsufficientCredit). There
  // is NO deposit()/prepaid pre-fund anymore. resolveReserve() is the exact wei
  // that must be attached to each create (forwarded to onBind).
  "function withdraw(uint32 operatorId, uint256 amount, address to)",
  "function resolveReserve() view returns (uint256 reserve)",
  "function earmarkedOf(uint32 operatorId) view returns (uint256 locked)",
  "function creditOf(uint32 operatorId) view returns (uint256 balance)",
  "function outstandingOf(uint32 operatorId) view returns (uint256 count)",
  "function withdrawableOf(uint32 operatorId) view returns (uint256 amount)",
  // A1 payer credit: with open venues the surplus is refunded to the account that
  // FRONTED the reserve (origin.creator) rather than the operator. That account
  // withdraws its own credit (msg.sender-gated, distinct from the owner-gated
  // operator withdraw above). payerOf is set at bind, cleared on settle.
  "function payerCreditOf(address payer) view returns (uint256 amount)",
  "function payerOf(bytes32 marketId) view returns (address payer)",
  "function withdrawMyCredit(uint256 amount, address to)",
  "function operatorOf(bytes32 marketId) view returns (uint32 operatorId)",
  // The EXACT reserve a market locked at onBind — snapshotted so a later gas-param
  // retune can never desync the release. 0 once settled. (What `earmarked` will
  // subtract when this market resolves.)
  "function reservedFor(bytes32 marketId) view returns (uint256 reserve)",
  "function bindCount(uint256 oracleQuestionId) view returns (uint32 count)",
  "function marketsForQuestion(uint256 oracleQuestionId) view returns (bytes32[] markets)",
  "function questionIdByKey(bytes32 questionKey) view returns (uint256 oracleQuestionId)",
  "function pendingResolves() view returns (uint256 remaining)",
  "function continuationSubId() view returns (uint256)",
  "function MAX_BINDS_PER_QUESTION() view returns (uint32)",
  // Pull-fallback answer reads (revert while the question is not final).
  "function getSlotCount(uint256 oracleQuestionId) view returns (uint8 slotCount)",
  "function pullAnswer(uint256 oracleQuestionId) view returns (uint8 outcomeIdx, bool voided)",
  "function pullNumericAnswer(uint256 oracleQuestionId) view returns (int256 numericValue, bool voided)",
  // Protocol-admin surface (owner-gated writes + the param views).
  "function setGasParams(uint64 priorityFeePerGas, uint64 maxFeePerGas, uint64 gasLimit)",
  "function setDrainParams(uint64 perMarketResolveGas, uint64 callbackBaseGas, uint32 maxResolvesPerCallback, uint64 resolveGasReserve)",
  "function enableReactivity() returns (uint256 subId)",
  "function migrateSubscription() returns (uint256 subId)",
  "function subscriptionId() view returns (uint256)",
  "function priorityFeePerGas() view returns (uint64)",
  "function maxFeePerGas() view returns (uint64)",
  "function gasLimit() view returns (uint64)",
  "function perMarketResolveGas() view returns (uint64)",
  "function callbackBaseGas() view returns (uint64)",
  "function maxResolvesPerCallback() view returns (uint32)",
  "function resolveGasReserve() view returns (uint64)",
  "function owner() view returns (address)",
]);

// OracleHub events (Oracle v2 §8e earmark-at-creation) — decoded from
// scheduleQuestion receipts (Scheduled vs Reused) and consumed by
// keepers/verifiers reconciling the exact-metering conservation invariants
// (CallbackAccounted / MarketResolveCharged / MarketBound / ReserveEarmarked /
// SurplusCredited). Indexed-ness matched byte-for-byte with
// src/adapters/OracleHub.sol.
/**
 *  OracleHub event ABI — decoded from `scheduleQuestion` receipts
 *  (`QuestionScheduled` vs `QuestionReused`) and by keepers reconciling the
 *  §8e exact-metering invariants. Indexed-ness mirrors OracleHub.sol.
 *
 * @category ABIs
 */
export const oracleHubEventsAbi = parseAbi([
  "event QuestionScheduled(uint256 indexed oracleQuestionId, bytes32 indexed questionKey, address indexed scheduler, uint256 oracleCost)",
  "event QuestionReused(uint256 indexed oracleQuestionId, bytes32 indexed questionKey, address indexed scheduler)",
  "event QuestionCapSplit(bytes32 indexed questionKey, uint256 indexed supersededQuestionId, uint256 indexed newQuestionId)",
  "event ReserveEarmarked(uint32 indexed operatorId, bytes32 indexed marketId, uint256 amount)",
  "event SurplusCredited(uint32 indexed operatorId, bytes32 indexed marketId, uint256 amount)",
  "event CreditWithdrawn(uint32 indexed operatorId, address indexed to, uint256 amount)",
  "event PayerSurplusCredited(address indexed payer, bytes32 indexed marketId, uint256 amount)",
  "event PayerCreditWithdrawn(address indexed payer, address indexed to, uint256 amount)",
  "event MarketBound(uint256 indexed oracleQuestionId, bytes32 indexed marketId, uint32 indexed operatorId, uint32 bindCount)",
  "event MarketResolveCharged(bytes32 indexed marketId, uint32 indexed operatorId, uint256 measuredGas, uint256 overheadShare, uint256 cost, uint256 charged)",
  "event AnswerDelivered(uint256 indexed oracleQuestionId, bytes32 indexed marketId, uint32 payoutDenominator, uint256[] payoutNumerators, bool voided)",
  "event CallbackAccounted(uint256 marketsResolved, uint256 gasPrice, uint256 measuredGas, uint256 overheadGasAttributed, uint256 totalCost, uint256 totalCharged, uint256 subsidy, uint256 pendingRemaining)",
  "event DrainContinuation(uint256 subscriptionId, uint256 pendingRemaining)",
  "event Deposited(address indexed from, uint256 indexed amount)",
  "event GasParamsUpdated(uint64 indexed priorityFeePerGas, uint64 indexed maxFeePerGas, uint64 indexed gasLimit)",
  "event DrainParamsUpdated(uint64 perMarketResolveGas, uint64 callbackBaseGas, uint32 maxResolvesPerCallback, uint64 resolveGasReserve)",
]);

// ---- MarketCreatorFactory ----
// `defaultBookParams` is the OrderBookParameters tuple from the CLOB — mirror of
// the on-chain struct (see OrderBookParameters in the dex submodule).
export const marketCreatorFactoryAbi = parseAbi([
  "function createMarketCreator(address owner, address core, address adapter, uint32 operatorId, bytes32 venueId, (uint256 tickSize, uint256 minQuantity, uint256 lotSize) defaultBookParams) returns (address creator, address policy)",
  "function creators(uint256 index) view returns (address)",
  "function creatorCount() view returns (uint256)",
  "function creatorsPaged(uint256 offset, uint256 limit) view returns (address[])",
]);

// Decoded from the createMarketCreator tx receipt.
export const marketCreatorFactoryEventsAbi = parseAbi([
  "event MarketCreatorCreated(address indexed creator, address indexed owner, uint32 indexed operatorId, bytes32 venueId, address policy, address core, address adapter)",
]);

// ---- MarketCreator (a factory-minted instance) ----
// `Series { IERC20 collateral; string asset; uint64 numericDecimals; uint64
// intervalSec; uint64 settlementWindow; }`. `triggerRoll` / reactivity params
// touch the Somnia precompile (testnet/mainnet only). Fund with native (receive).
export const marketCreatorAbi = parseAbi([
  "function registerSeries(uint32 seriesId, (address collateral, string asset, uint64 numericDecimals, uint64 intervalSec, uint64 settlementWindow) s)",
  "function triggerRoll(uint32 seriesId)",
  // A1: arm a series' FIRST roll at a future wall-clock boundary WITHOUT minting
  // now — for a seamless MarketCreator migration (start the new MC at the old
  // market's expiry). Precompile call → testnet/mainnet only.
  "function armFirstRoll(uint32 seriesId, uint256 firesAtSec)",
  // A1: pull this MC's own accrued oracle surplus (payer credit) out of the hub
  // into its native float. Runs automatically each roll cycle; this is the manual
  // sweep. Permissionless (moves only the MC's own credit to itself).
  "function reclaimOracleCredit() returns (uint256 reclaimed)",
  "function withdrawNative(address to, uint256 amount)",
  "function cancelSubscription(uint256 firesAtSec)",
  "function firstRollArmed(uint32 seriesId) view returns (bool armed)",
  "function latestExpiryBySeriesId(uint32 seriesId) view returns (uint64 expiry)",
  "function armedBoundary() view returns (uint256)",
  "function marketCount() view returns (uint256)",
  "function setReactivityGasParams(uint64 priorityFeePerGas, uint64 maxFeePerGas, uint64 gasLimit)",
  "function seriesById(uint32 seriesId) view returns (address collateral, string asset, uint64 numericDecimals, uint64 intervalSec, uint64 settlementWindow)",
  "function core() view returns (address)",
  "function adapter() view returns (address)",
  "function operatorId() view returns (uint32)",
  "function venueId() view returns (bytes32)",
  "function defaultBookParams() view returns (uint256 tickSize, uint256 minQuantity, uint256 lotSize)",
  "function owner() view returns (address)",
]);

// ---- MarketCreatorV2 (a MarketCreatorFactoryV2-minted instance) ----
// Interval/bucket-mode rolling series: each series self-triggers off its OWN
// previous market's oracle AnswerPosted (no shared wall-clock Schedule sub),
// so its instance surface is a variant of `marketCreatorAbi` — same
// `registerSeries` / `armFirstRoll` / `reclaimOracleCredit` /
// `setReactivityGasParams` / `seriesById` / `core` / `adapter` / `operatorId`
// / `venueId` / `defaultBookParams` / `owner` shape, but it DROPS v1's
// `triggerRoll` (armFirstRoll at a boundary is the ONE start path; a
// re-register resets the rolled-state so restart = re-register + armFirstRoll)
// and v1's `cancelSubscription(uint256)` / `firstRollArmed` / `armedBoundary`
// (no shared boundary to cancel/track) in favor of the single-subscription-pair
// surface below. New: the PERMISSIONLESS `recoverSeries` (revive a provably
// stalled series — dead subs re-armed against precompile truth, pull-first
// chain recovery; the out-of-funds "refuel + poke" story).
export const marketCreatorV2Abi = parseAbi([
  "function registerSeries(uint32 seriesId, (address collateral, string asset, uint64 numericDecimals, uint64 intervalSec, uint64 settlementWindow) s)",
  "function armFirstRoll(uint32 seriesId, uint256 firesAtSec)",
  "function recoverSeries(uint32 seriesId)",
  "function lastPermissionlessRecoveryAt(uint32 seriesId) view returns (uint64 t)",
  "function reclaimOracleCredit() returns (uint256 reclaimed)",
  "function withdrawNative(address to, uint256 amount)",
  // Tear down BOTH the persistent AnswerPosted sub and the periodic Schedule
  // backstop tick — the v2 migration/cutover switch (replaces v1's
  // per-boundary `cancelSubscription(uint256)`).
  "function cancelSubscriptions()",
  // In-place migration (see docs/runbooks/migrating-market-creator.md). `adoptFrom` (pull) inherits
  // a quiesced predecessor's whole series set + each series' pending oracle qid,
  // so the next roll fires HERE off the outgoing market's own answer — strike
  // chain intact, no bootstrap. `handoffTo` (push) is the outgoing side: quiesce +
  // sweep float to the successor + set `retired`. Both are precompile-touching →
  // testnet/mainnet only. Pair with `MarketCreatorPolicy.swapCreator`.
  "function adoptFrom(address old)",
  "function handoffTo(address successor)",
  "function migratedFrom() view returns (address)",
  // One-heir latch: the single successor that has adopted this creator's
  // routing (zero while unadopted) — a second adoptFrom against the same
  // predecessor reverts.
  "function adoptedBy() view returns (address)",
  "function retired() view returns (bool)",
  "function latestExpiryBySeriesId(uint32 seriesId) view returns (uint64 expiry)",
  "function marketCount() view returns (uint256)",
  "function setReactivityGasParams(uint64 priorityFeePerGas, uint64 maxFeePerGas, uint64 gasLimit)",
  "function seriesById(uint32 seriesId) view returns (address collateral, string asset, uint64 numericDecimals, uint64 intervalSec, uint64 settlementWindow)",
  // The series' currently-pending oracle question id (bootstrap reference, or
  // the latest rolled market's own question once it has rolled at least once).
  "function referenceQidBySeries(uint32 seriesId) view returns (uint256 qid)",
  "function seriesByPendingQid(uint256 qid) view returns (uint32 seriesId)",
  "function pendingExpiryBySeries(uint32 seriesId) view returns (uint64 expiry)",
  "function firstRollBoundaryBySeries(uint32 seriesId) view returns (uint64 firesAtSec)",
  "function answerSubId() view returns (uint256)",
  "function backstopSubId() view returns (uint256)",
  "function core() view returns (address)",
  "function adapter() view returns (address)",
  "function operatorId() view returns (uint32)",
  "function venueId() view returns (bytes32)",
  "function defaultBookParams() view returns (uint256 tickSize, uint256 minQuantity, uint256 lotSize)",
  "function owner() view returns (address)",
]);

// ---- MarketCreatorPolicy (a factory-minted instance) ----
export const marketCreatorPolicyAbi = parseAbi([
  "function approved(address creator) view returns (bool)",
  "function setCreator(address creator, bool allowed)",
  // Atomic venue re-authorization for the in-place creator cutover: revoke `from`
  // + authorize `to` in one call, so there is never a window where both or
  // neither is approved. Pair with `MarketCreatorV2.adoptFrom`/`handoffTo`.
  "function swapCreator(address from, address to)",
  "function owner() view returns (address)",
]);

// ---- BinaryMarketsModule governance surface ----
// Adapter approval is module-OWNER-gated. In Oracle v2 the ONE approved adapter
// is the OracleHub — `approvedAdapters(hub)` is the live gate the preflight
// polls; `setAdapterApproved` is the protocol-admin-only write (deploy wiring +
// emergency revoke).
export const moduleGovernanceAbi = parseAbi([
  "function setAdapterApproved(address adapter, bool approved)",
  "function approvedAdapters(address adapter) view returns (bool)",
  "function owner() view returns (address)",
]);

export const moduleGovernanceEventsAbi = parseAbi([
  "event AdapterApproved(address indexed adapter, bool indexed approved)",
]);
