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
/**
 *  The all-zero EVM address (exported as `ZERO_ADDRESS`) — the "unset" sentinel
 *  the validators test addresses against.
 *
 * @category validation
 */
const ZERO = "0x0000000000000000000000000000000000000000";
const isZero = (a) => a == null || /^0x0*$/.test(a);
const eqAddr = (a, b) => a.toLowerCase() === b.toLowerCase();
function result(blockers, warnings) {
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
/**
 *  Validate that an operator is a sound base for machinery: the caller owns it,
 *  it is enabled, and it has a non-zero fee recipient.
 *
 * @category validation
 */
export function preflightOperator(op) {
    const blockers = [];
    const warnings = [];
    if (!eqAddr(op.owner, op.caller)) {
        blockers.push(`Connected wallet ${op.caller} does not own this operator (owner is ${op.owner}).`);
    }
    if (!op.enabled)
        blockers.push("Operator is disabled (its kill switch is off) — enable it before creating markets.");
    if (isZero(op.feeRecipient)) {
        warnings.push("Operator has no default fee recipient — fees fall to the zero address unless a venue overrides it.");
    }
    return result(blockers, warnings);
}
/**
 *  Validate a venue is ready to host a market: the caller owns its operator, its
 *  creation flag is on, and its market type is bound to a module.
 *
 * @category validation
 */
export function preflightVenue(v) {
    const blockers = [];
    const warnings = [];
    if (!eqAddr(v.operatorOwner, v.caller)) {
        blockers.push(`Connected wallet ${v.caller} does not own this venue's operator (owner is ${v.operatorOwner}).`);
    }
    if (!v.creationEnabled)
        blockers.push("Venue creation is disabled — flip creationEnabled on before creating markets.");
    if (!v.moduleBound) {
        blockers.push("No module is bound for this venue's market type in MarketsCore — the protocol admin must bind one first.");
    }
    return result(blockers, warnings);
}
/**
 *  Validate the OracleHub is live: approved on the module, its balance above the
 *  reactivity-bond floor, and its subscription armed (where the precompile
 *  exists). Protocol-admin view — an operator can't fix these, but a panel
 *  surfaces them so a dead hub isn't debugged at the create-market step.
 *
 * @category validation
 */
export function preflightHub(h) {
    const blockers = [];
    const warnings = [];
    if (!h.status.approved) {
        blockers.push("OracleHub is not approved on the module — the protocol admin must run setAdapterApproved(hub, true).");
    }
    if (h.status.balanceWei < HUB_MIN_FREE_BALANCE_WEI) {
        blockers.push(`OracleHub balance ${h.status.balanceWei} wei is below the ${HUB_MIN_FREE_BALANCE_WEI} wei (32 STT) reactivity-bond floor — fund the hub.`);
    }
    if (!h.precompileAvailable) {
        warnings.push("Connected chain has no reactivity precompile (local anvil) — enableReactivity / triggerRoll will not work here; use testnet/mainnet.");
    }
    else if (h.status.subscriptionId === 0n) {
        blockers.push("OracleHub reactivity is not armed (subscriptionId is 0) — the protocol admin must run enableReactivity.");
    }
    return result(blockers, warnings);
}
/**
 *  Validate a create-market call can proceed under §8e: the payer's balance
 *  covers the FULL create value `getSchedulingCost(def) + resolveReserve()` —
 *  the reserve is attached to the create and earmarked at onBind (excess is
 *  refunded in-tx). No separate prepaid-balance gate.
 *
 * @category validation
 */
export function preflightCreateQuote(q) {
    const blockers = [];
    const warnings = [];
    const createValueWei = q.schedulingCostWei + q.resolveReserveWei;
    if (q.balanceWei < createValueWei) {
        blockers.push(`Balance ${q.balanceWei} wei cannot cover the create value ${createValueWei} wei ` +
            `(scheduling cost ${q.schedulingCostWei} + resolveReserve ${q.resolveReserveWei}) — fund the creator.`);
    }
    return result(blockers, warnings);
}
/**
 *  Validate a MarketCreator is funded enough to roll (a warning, not a hard
 *  blocker — a creator with a series but no balance still exists, it just can't
 *  roll until funded). For the exact per-roll amount, run
 *  {@link preflightCreateQuote} with the live hub quote.
 *
 * @category validation
 */
export function preflightMarketCreator(c) {
    const blockers = [];
    const warnings = [];
    if (c.precompileAvailable && c.balanceWei === 0n) {
        warnings.push("Market creator holds no native balance — fund it before triggering rolls (each roll attaches the oracle scheduling cost + resolveReserve, which is earmarked per-market at onBind, plus reactivity gas).");
    }
    if (!c.precompileAvailable) {
        warnings.push("Connected chain has no reactivity precompile (local anvil) — triggerRoll will not work here.");
    }
    return result(blockers, warnings);
}
/**
 *  Validate a series config matches the module's constraints: non-zero
 *  `seriesId`, non-empty `asset`, `intervalSec >= 60`, non-zero collateral.
 *
 * @category validation
 */
export function preflightSeries(s) {
    const blockers = [];
    const warnings = [];
    if (s.seriesId === 0)
        blockers.push("seriesId must be non-zero (the module rejects 0 with UnknownSeries).");
    if (s.asset.trim().length === 0)
        blockers.push('Series asset label is empty — set a non-empty asset (e.g. "BTC/USDT").');
    if (s.intervalSec < MIN_SERIES_INTERVAL_SEC) {
        blockers.push(`Series intervalSec ${s.intervalSec} is below the ${MIN_SERIES_INTERVAL_SEC}s minimum (InvalidSeriesConfig).`);
    }
    if (isZero(s.collateral))
        blockers.push("Series collateral is the zero address — set the venue's collateral token.");
    return result(blockers, warnings);
}
/**
 *  Validate the preconditions for `triggerRoll`: the series is registered, the
 *  chain has the precompile, and the creator holds native to pay the roll.
 *
 * @category validation
 */
export function preflightRoll(r) {
    const blockers = [];
    const warnings = [];
    if (r.seriesIntervalSec === 0)
        blockers.push("Series is not registered on-chain — register it before rolling.");
    if (!r.precompileAvailable) {
        blockers.push("Connected chain has no reactivity precompile (local anvil) — triggerRoll cannot run here; use testnet/mainnet.");
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
export function preflightChain(connectedChainId, expectedChainId) {
    const blockers = [];
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
export function isLocalPrecompileUnavailable(chainId) {
    return chainId === 31337 || chainId === 1337;
}
export { ZERO as ZERO_ADDRESS };
