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
declare const ZERO = "0x0000000000000000000000000000000000000000";
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
export declare const HUB_MIN_FREE_BALANCE_WEI: bigint;
/**
 * The minimum roll interval the module enforces (`InvalidSeriesConfig` below).
 *
 * @category validation
 */
export declare const MIN_SERIES_INTERVAL_SEC = 60;
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
export declare function preflightOperator(op: OperatorPreflightInput): PreflightResult;
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
export declare function preflightVenue(v: VenuePreflightInput): PreflightResult;
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
export declare function preflightHub(h: HubPreflightInput): PreflightResult;
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
export declare function preflightCreateQuote(q: CreateQuotePreflightInput): PreflightResult;
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
export declare function preflightMarketCreator(c: MarketCreatorPreflightInput): PreflightResult;
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
export declare function preflightSeries(s: SeriesPreflightInput): PreflightResult;
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
export declare function preflightRoll(r: RollPreflightInput): PreflightResult;
/**
 *  Validate the wallet is on the expected chain (a machinery write on the wrong
 *  chain either reverts or lands on the wrong deployment). A standalone gate the
 *  wizard runs before any step.
 *
 * @category validation
 */
export declare function preflightChain(connectedChainId: number, expectedChainId: number): PreflightResult;
/**
 *  True when a chain id belongs to a network WITHOUT the Somnia reactivity
 *  precompile — i.e. a local anvil/hardhat dev chain (31337 / 1337), where
 *  `enableReactivity` / `triggerRoll` cannot work. Somnia testnet/mainnet return
 *  false. Use to fill the `precompileAvailable` flag the validators take.
 *
 * @category validation
 */
export declare function isLocalPrecompileUnavailable(chainId: number): boolean;
export { ZERO as ZERO_ADDRESS };
