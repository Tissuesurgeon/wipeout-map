// Preflight validators for the operator machinery wizard — PURE functions that
// take an already-fetched snapshot of the relevant state and return the
// blocker/warning matrix for one wizard step. They do NO I/O: a caller fetches
// the cheap reads it already has (indexer `IndexedOperator`/`IndexedVenue`, the
// on-chain `HubStatus` / `MarketCreatorOnchain`, the connected chain id) and
// hands them in. Keeping them pure means they unit-test without a client and a
// UI can re-run them synchronously on every field edit.
//
// `blockers` STOP the step (the on-chain write would revert or produce a dead
// market); `warnings` are advisory (the step can proceed but the operator should
// know). `ok === blockers.length === 0`.
//
// ORACLE V2.1 (DESIGN §8e — EARMARK-AT-CREATION): the per-operator adapter step
// (mint/fund/arm/approve) is GONE — there is one protocol OracleHub. What
// replaced it:
//   - `preflightHub` — the PROTOCOL-side health check (approved on the module,
//     subscription armed, balance above the bond floor);
//   - `preflightCreateQuote` — the USER-side check: the payer must hold
//     `getSchedulingCost(def) + resolveReserve()` per create — the reserve is
//     ATTACHED to the create and LOCKED per-market at onBind (excess refunded).
//     There is no separate prepaid-balance gate anymore.

import type { Address } from "viem";
import type { HubStatus } from "./oracleHub.js";

/**
 * The uniform result every validator returns. `ok` is `blockers.length === 0`.
 *
 * @category validation
 */
export interface PreflightResult {
  /** True when there are no blockers (`blockers.length === 0`); warnings don't affect it. */
  ok: boolean;
  /**
   *  Conditions that STOP the step — the on-chain write would revert or produce a
   *  dead market. Human-readable, ready to render as-is.
   */
  blockers: string[];
  /** Advisory notices — the step can proceed, but the operator should know. */
  warnings: string[];
}

/**
 *  The all-zero EVM address (exported as `ZERO_ADDRESS`) — the "unset" sentinel
 *  the validators test addresses against.
 *
 * @category validation
 */
const ZERO = "0x0000000000000000000000000000000000000000";
const isZero = (a: string | undefined | null): boolean => a == null || /^0x0*$/.test(a);
const eqAddr = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

function result(blockers: string[], warnings: string[]): PreflightResult {
  return { ok: blockers.length === 0, blockers, warnings };
}

/**
 *  The minimum native balance (wei) the OracleHub should hold to fund its
 *  reactivity bond — 32 STT, mirrors the deploy-runbook's funding floor. In
 *  Oracle v2 the hub holds Σ operator earmarks + accrued credit + its own
 *  reactivity-bond float in one balance; a rough floor check is the hub's total
 *  balance clearing this floor (a precise free-float split is no longer
 *  separately tracked on-chain).
 *
 * @category validation
 */
export const HUB_MIN_FREE_BALANCE_WEI = 32n * 10n ** 18n;

/**
 * The minimum roll interval the module enforces (`InvalidSeriesConfig` below).
 *
 * @category validation
 */
export const MIN_SERIES_INTERVAL_SEC = 60;

// ---- Operator step ----------------------------------------------------------

/**
 *  The operator fields the operator-step preflight inspects (subset of
 *  {@link IndexedOperator}).
 *
 * @category validation
 */
export interface OperatorPreflightInput {
  /** The connected signer — must own the operator to run machinery under it. */
  caller: Address;
  /** The operator's current on-chain owner — a mismatch with `caller` blocks. */
  owner: string;
  /** The operator's kill switch — disabled blocks market creation under it. */
  enabled: boolean;
  /**
   *  The operator's default fee recipient — the zero address only warns (fees
   *  fall to the zero address unless a venue overrides it).
   */
  feeRecipient: string;
}

/**
 *  Validate that an operator is a sound base for machinery: the caller owns it,
 *  it is enabled, and it has a non-zero fee recipient.
 *
 * @category validation
 */
export function preflightOperator(op: OperatorPreflightInput): PreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!eqAddr(op.owner, op.caller)) {
    blockers.push(`Connected wallet ${op.caller} does not own this operator (owner is ${op.owner}).`);
  }
  if (!op.enabled) blockers.push("Operator is disabled (its kill switch is off) — enable it before creating markets.");
  if (isZero(op.feeRecipient)) {
    warnings.push("Operator has no default fee recipient — fees fall to the zero address unless a venue overrides it.");
  }
  return result(blockers, warnings);
}

// ---- Venue step -------------------------------------------------------------

/**
 *  The venue fields the venue-step preflight inspects (subset of
 *  {@link IndexedVenue}) plus whether the venue's market type is bound to a
 *  module in MarketsCore.
 *
 * @category validation
 */
export interface VenuePreflightInput {
  /** The connected signer — must own the venue's operator. */
  caller: Address;
  /** The owner of the operator the venue belongs to. */
  operatorOwner: string;
  /** The venue's creation flag — off blocks new markets on the venue. */
  creationEnabled: boolean;
  /**
   *  Whether MarketsCore has a module bound for the venue's market type
   *  (`moduleOf(marketType) != 0`).
   */
  moduleBound: boolean;
}

/**
 *  Validate a venue is ready to host a market: the caller owns its operator, its
 *  creation flag is on, and its market type is bound to a module.
 *
 * @category validation
 */
export function preflightVenue(v: VenuePreflightInput): PreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!eqAddr(v.operatorOwner, v.caller)) {
    blockers.push(`Connected wallet ${v.caller} does not own this venue's operator (owner is ${v.operatorOwner}).`);
  }
  if (!v.creationEnabled)
    blockers.push("Venue creation is disabled — flip creationEnabled on before creating markets.");
  if (!v.moduleBound) {
    blockers.push(
      "No module is bound for this venue's market type in MarketsCore — the protocol admin must bind one first.",
    );
  }
  return result(blockers, warnings);
}

// ---- Oracle-hub step (protocol-side) ----------------------------------------

/**
 *  Inputs for the hub-step preflight: the hub's on-chain status (from
 *  `OracleHubAdmin.getHubStatus`, or the subset a caller already holds) and
 *  whether the connected chain supports the reactivity precompile (local anvil
 *  does NOT). Unlike the retired adapter step, the armed state IS cheaply
 *  readable on-chain (`subscriptionId != 0`).
 *
 * @category validation
 */
export interface HubPreflightInput {
  /** The subset of {@link HubStatus} the check needs. */
  status: Pick<HubStatus, "approved" | "subscriptionId" | "balanceWei">;
  /**
   *  Whether the connected chain has the Somnia reactivity precompile (false on
   *  local anvil).
   */
  precompileAvailable: boolean;
}

/**
 *  Validate the OracleHub is live: approved on the module, its balance above the
 *  reactivity-bond floor, and its subscription armed (where the precompile
 *  exists). Protocol-admin view — an operator can't fix these, but a panel
 *  surfaces them so a dead hub isn't debugged at the create-market step.
 *
 * @category validation
 */
export function preflightHub(h: HubPreflightInput): PreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!h.status.approved) {
    blockers.push(
      "OracleHub is not approved on the module — the protocol admin must run setAdapterApproved(hub, true).",
    );
  }
  if (h.status.balanceWei < HUB_MIN_FREE_BALANCE_WEI) {
    blockers.push(
      `OracleHub balance ${h.status.balanceWei} wei is below the ${HUB_MIN_FREE_BALANCE_WEI} wei (32 STT) reactivity-bond floor — fund the hub.`,
    );
  }
  if (!h.precompileAvailable) {
    warnings.push(
      "Connected chain has no reactivity precompile (local anvil) — enableReactivity / triggerRoll will not work here; use testnet/mainnet.",
    );
  } else if (h.status.subscriptionId === 0n) {
    blockers.push(
      "OracleHub reactivity is not armed (subscriptionId is 0) — the protocol admin must run enableReactivity.",
    );
  }
  return result(blockers, warnings);
}

// ---- Create-quote step (user-side, §8e) --------------------------------------

/**
 *  Inputs for the create-quote preflight (§8e EARMARK-AT-CREATION): what the
 *  payer (the funding wallet or MarketCreator contract) holds vs the FULL create
 *  value — `getSchedulingCost(def) + resolveReserve()`. The reserve is attached
 *  to the create and LOCKED per-market at onBind; there is no separate prepaid
 *  gate. Fetch the total with `quoteCreateMarketValue(def)`, or fetch the two
 *  legs (`getSchedulingCost(def)` + `resolveReserve()`) separately.
 *
 * @category validation
 */
export interface CreateQuotePreflightInput {
  /** Native balance (wei) of whoever pays the create (EOA or MarketCreator). */
  balanceWei: bigint;
  /** The hub's marginal `getSchedulingCost(def)` quote (0 = dedup reuse). */
  schedulingCostWei: bigint;
  /**
   *  The hub's `resolveReserve()` — the reserve ATTACHED to the create and
   *  locked per-market at onBind (the bind reverts `WrongReserveAttached` if the
   *  attached value is not exactly this).
   */
  resolveReserveWei: bigint;
}

/**
 *  Validate a create-market call can proceed under §8e: the payer's balance
 *  covers the FULL create value `getSchedulingCost(def) + resolveReserve()` —
 *  the reserve is attached to the create and earmarked at onBind (excess is
 *  refunded in-tx). No separate prepaid-balance gate.
 *
 * @category validation
 */
export function preflightCreateQuote(q: CreateQuotePreflightInput): PreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const createValueWei = q.schedulingCostWei + q.resolveReserveWei;
  if (q.balanceWei < createValueWei) {
    blockers.push(
      `Balance ${q.balanceWei} wei cannot cover the create value ${createValueWei} wei ` +
        `(scheduling cost ${q.schedulingCostWei} + resolveReserve ${q.resolveReserveWei}) — fund the creator.`,
    );
  }
  return result(blockers, warnings);
}

// ---- Market-creator step ----------------------------------------------------

/**
 *  Inputs for the creator-step preflight: the creator's native balance and
 *  whether the connected chain supports rolls.
 *
 * @category validation
 */
export interface MarketCreatorPreflightInput {
  /** The creator's native balance (wei) — it pays for reactivity rolls. */
  balanceWei: bigint;
  /**
   *  Whether the connected chain has the Somnia reactivity precompile (false on
   *  local anvil — see {@link isLocalPrecompileUnavailable}).
   */
  precompileAvailable: boolean;
}

/**
 *  Validate a MarketCreator is funded enough to roll (a warning, not a hard
 *  blocker — a creator with a series but no balance still exists, it just can't
 *  roll until funded). For the exact per-roll amount, run
 *  {@link preflightCreateQuote} with the live hub quote.
 *
 * @category validation
 */
export function preflightMarketCreator(c: MarketCreatorPreflightInput): PreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (c.precompileAvailable && c.balanceWei === 0n) {
    warnings.push(
      "Market creator holds no native balance — fund it before triggering rolls (each roll attaches the oracle scheduling cost + resolveReserve, which is earmarked per-market at onBind, plus reactivity gas).",
    );
  }
  if (!c.precompileAvailable) {
    warnings.push("Connected chain has no reactivity precompile (local anvil) — triggerRoll will not work here.");
  }
  return result(blockers, warnings);
}

// ---- Series step ------------------------------------------------------------

/**
 * The series fields the series-step preflight inspects.
 *
 * @category validation
 */
export interface SeriesPreflightInput {
  /** The series id to register — 0 blocks (the module rejects it as UnknownSeries). */
  seriesId: number;
  /** The series' asset label (e.g. "BTC/USDT") — empty blocks. */
  asset: string;
  /**
   *  The roll interval in seconds — below {@link MIN_SERIES_INTERVAL_SEC} blocks
   *  (InvalidSeriesConfig).
   */
  intervalSec: number;
  /** The venue's collateral token — the zero address blocks. */
  collateral: Address;
}

/**
 *  Validate a series config matches the module's constraints: non-zero
 *  `seriesId`, non-empty `asset`, `intervalSec >= 60`, non-zero collateral.
 *
 * @category validation
 */
export function preflightSeries(s: SeriesPreflightInput): PreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (s.seriesId === 0) blockers.push("seriesId must be non-zero (the module rejects 0 with UnknownSeries).");
  if (s.asset.trim().length === 0)
    blockers.push('Series asset label is empty — set a non-empty asset (e.g. "BTC/USDT").');
  if (s.intervalSec < MIN_SERIES_INTERVAL_SEC) {
    blockers.push(
      `Series intervalSec ${s.intervalSec} is below the ${MIN_SERIES_INTERVAL_SEC}s minimum (InvalidSeriesConfig).`,
    );
  }
  if (isZero(s.collateral)) blockers.push("Series collateral is the zero address — set the venue's collateral token.");
  return result(blockers, warnings);
}

// ---- Roll step --------------------------------------------------------------

/**
 *  Inputs for the roll-step preflight: the series exists on-chain (its
 *  `intervalSec > 0`), the creator is funded, and the chain supports rolls.
 *
 * @category validation
 */
export interface RollPreflightInput {
  /** The series' on-chain `intervalSec` (0 ⇒ never registered). */
  seriesIntervalSec: number;
  /**
   *  The MarketCreator's native balance (wei) — 0 blocks (the roll can't pay
   *  its reactivity gas).
   */
  creatorBalanceWei: bigint;
  /**
   *  Whether the connected chain has the Somnia reactivity precompile (false on
   *  local anvil — see {@link isLocalPrecompileUnavailable}).
   */
  precompileAvailable: boolean;
}

/**
 *  Validate the preconditions for `triggerRoll`: the series is registered, the
 *  chain has the precompile, and the creator holds native to pay the roll.
 *
 * @category validation
 */
export function preflightRoll(r: RollPreflightInput): PreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (r.seriesIntervalSec === 0) blockers.push("Series is not registered on-chain — register it before rolling.");
  if (!r.precompileAvailable) {
    blockers.push(
      "Connected chain has no reactivity precompile (local anvil) — triggerRoll cannot run here; use testnet/mainnet.",
    );
  }
  if (r.creatorBalanceWei === 0n) {
    blockers.push("Market creator holds no native balance — fund it so the roll can pay its reactivity gas.");
  }
  return result(blockers, warnings);
}

// ---- Chain gate -------------------------------------------------------------

/**
 *  Validate the wallet is on the expected chain (a machinery write on the wrong
 *  chain either reverts or lands on the wrong deployment). A standalone gate the
 *  wizard runs before any step.
 *
 * @category validation
 */
export function preflightChain(connectedChainId: number, expectedChainId: number): PreflightResult {
  const blockers: string[] = [];
  if (connectedChainId !== expectedChainId) {
    blockers.push(`Wallet is on chain ${connectedChainId}, expected ${expectedChainId} — switch networks.`);
  }
  return result(blockers, []);
}

/**
 *  True when a chain id belongs to a network WITHOUT the Somnia reactivity
 *  precompile — i.e. a local anvil/hardhat dev chain (31337 / 1337), where
 *  `enableReactivity` / `triggerRoll` cannot work. Somnia testnet/mainnet return
 *  false. Use to fill the `precompileAvailable` flag the validators take.
 *
 * @category validation
 */
export function isLocalPrecompileUnavailable(chainId: number): boolean {
  return chainId === 31337 || chainId === 1337;
}

export { ZERO as ZERO_ADDRESS };
