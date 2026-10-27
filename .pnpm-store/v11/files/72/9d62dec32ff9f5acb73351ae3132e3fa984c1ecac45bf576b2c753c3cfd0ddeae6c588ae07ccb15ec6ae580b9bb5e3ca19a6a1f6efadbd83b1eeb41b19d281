// Perp margin — cross-margin collateral and account health.
//
// PERP-ONLY: the MarginBank is a perp contract, and cross-margin means collateral
// is NOT per-market — one account's margin backs every perp position it holds.
// That is why deposits/withdrawals key by bank rather than by pool, and why
// liquidation price is a function of the whole account, not one position.
import { decodeErrorResult, isHex } from "viem";
import * as ReadsAbi from "../readsAbi.js";
import * as Revert from "../revert.js";
import * as TradeAbi from "../tradeAbi.js";
import { ContractRevertError, InvalidInputError } from "../errors.js";
import { unreachable } from "../raise.js";
// The funding index is 1e18-scaled, and that scale already has one owner. Importing it
// keeps a second literal from drifting from the first.
import { FUNDING_PRECISION } from "../funding.js";
import * as Reads from "../readEach.js";
import * as Writer from "../writer.js";
/**
 * Ordered so index == on-chain enum value (0 Healthy … 3 CloseOut).
 *
 * @category perpetual markets
 */
export const MARGIN_STATUS = ["Healthy", "MarginCall", "PartialLiquidation", "CloseOut"];
/**
 *  Read an account's cross-margin state from the MarginBank in one fan-out —
 *  including the account health (`imReq`/`mmReq`/`cmReq`) and `marginStatus`.
 *
 *  The SDK samples the chain head once and pins every component read to that
 *  block. All returned fields therefore describe one chain state, even if the
 *  head advances while the fan-out is in flight.
 */
export async function getMarginAccount(marginBank, account, client) {
    const blockNumber = await client.getBlockNumber();
    const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber };
    const [state, withdrawable, health, statusRaw] = await Promise.all([
        client.readContract({ ...bank, functionName: "getAccountState", args: [account] }),
        client.readContract({ ...bank, functionName: "getWithdrawableCollateral", args: [account] }),
        client.readContract({ ...bank, functionName: "getAccountHealth", args: [account] }),
        client.readContract({ ...bank, functionName: "getMarginStatus", args: [account] }),
    ]);
    const s = state;
    const [equity, imReq, mmReq, cmReq] = health;
    return {
        unlockedCollateralBalance: s.unlockedCollateralBalance,
        lockedCollateral: s.lockedCollateral,
        activePerpPools: [...s.activePerpPools],
        equity,
        withdrawable: withdrawable,
        imReq,
        mmReq,
        cmReq,
        marginStatus: MARGIN_STATUS[Number(statusRaw)] ?? "Healthy",
        asOfBlock: blockNumber,
    };
}
/**
 *  The two MarginBank figures an equity snapshot needs — `equity` from
 *  `getAccountEquity` and `lockedCollateral` from `getAccountState` — pinned to
 *  one block. The subset of {@link getMarginAccount} that `getAccountEquity`
 *  reads, without the `getWithdrawableCollateral` / `getMarginStatus` calls it
 *  would discard: reading many accounts at once (a competition scoreboard)
 *  should cost two `eth_call`s per account, not four, and should not fail on a
 *  read it never uses. `at` pins the reads to a given block instead of the head.
 */
export async function getMarginEquity(marginBank, account, client, at) {
    const blockNumber = at ?? (await client.getBlockNumber());
    const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber };
    const [state, equity] = await Promise.all([
        client.readContract({ ...bank, functionName: "getAccountState", args: [account] }),
        client.readContract({ ...bank, functionName: "getAccountEquity", args: [account] }),
    ]);
    return { equity, lockedCollateral: state.lockedCollateral, asOfBlock: blockNumber };
}
/**
 *  Accounts per round in {@link listMarginEquities}. Each round reads two views one
 *  after the other, each in Multicall3 chunks of {@link Reads.READ_BATCH_CAPACITY}, so
 *  400 accounts are at most 4 requests in flight per view — and on a chain without
 *  usable Multicall3 at most {@link Reads.READ_FALLBACK_CONCURRENCY} point reads, never
 *  double that.
 */
const MARGIN_EQUITY_GROUP = 4 * Reads.READ_BATCH_CAPACITY;
/**
 *  {@link getMarginEquity} for many accounts at one block, in input order.
 *  `equity` is `null` for an account that holds a market with no fresh mark
 *  price, so one such account does not fail the batch. Any other failed read
 *  throws. Accounts are read {@link MARGIN_EQUITY_GROUP} at a time, so a large
 *  cohort does not open every request at once.
 */
export async function listMarginEquities(marginBank, accounts, client, at) {
    const blockNumber = at ?? (await client.getBlockNumber());
    const abi = ReadsAbi.marginBankReadAbi;
    const out = [];
    for (let from = 0; from < accounts.length; from += MARGIN_EQUITY_GROUP) {
        const targets = accounts
            .slice(from, from + MARGIN_EQUITY_GROUP)
            .map((account) => ({ address: marginBank, args: [account] }));
        // One view at a time, not both under one `Promise.all`: on a chain without usable
        // Multicall3 each `readEach` opens up to `READ_FALLBACK_CONCURRENCY` point reads,
        // so running the two together would double the documented bound.
        const states = await Reads.readEach(client, blockNumber, abi, "getAccountState", targets);
        const equities = await Reads.readEach(client, blockNumber, abi, "tryGetAccountEquity", targets);
        for (let i = 0; i < targets.length; i++) {
            const state = Reads.required(states[i], marginBank, "getAccountState");
            const [ok, equity] = Reads.required(equities[i], marginBank, "tryGetAccountEquity");
            out.push({ equity: ok ? equity : null, lockedCollateral: state.lockedCollateral, asOfBlock: blockNumber });
        }
    }
    return out;
}
/**
 *  Read an account's cross-margin health from the MarginBank
 *  (`getAccountHealth` + `getMarginStatus`) in one fan-out.
 *
 *  The SDK samples the chain head once and pins both reads to that block. The
 *  returned requirements and derived status therefore describe one chain state.
 */
export async function getAccountHealth(marginBank, account, client) {
    const blockNumber = await client.getBlockNumber();
    const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber };
    const [health, statusRaw] = await Promise.all([
        client.readContract({ ...bank, functionName: "getAccountHealth", args: [account] }),
        client.readContract({ ...bank, functionName: "getMarginStatus", args: [account] }),
    ]);
    const [equity, imReq, mmReq, cmReq] = health;
    return { equity, imReq, mmReq, cmReq, marginStatus: MARGIN_STATUS[Number(statusRaw)] ?? "Healthy" };
}
/**
 *  A perp market's static risk configuration (`getPerpPoolParameters`).
 *
 *  Chain tier. This is the read that makes a **projected** liquidation price
 *  possible: `maintenanceMarginBps` is otherwise exposed nowhere — not on the
 *  indexed market row, which carries only `initialMarginBps` — so a client could
 *  show the real liquidation price of an open position but not the prospective one
 *  for an order it has not placed.
 *
 *  Cannot revert on a stale oracle (it reads frozen storage), which is why
 *  maintenance margin comes from here rather than from
 *  {@link getPerpHealthSnapshot}.
 */
export async function getPerpRiskParams(pool, client) {
    const p = await client.readContract({
        address: pool,
        abi: ReadsAbi.perpPoolReadAbi,
        functionName: "getPerpPoolParameters",
    });
    return {
        initialMarginBps: p.initialMarginBps,
        maintenanceMarginBps: p.maintenanceMarginBps,
        closeOutMarginBps: p.closeOutMarginBps,
        maxOpenInterest: p.maxOpenInterest,
        maxPositionSize: p.maxPositionSize,
        takerFeeBpsTimes1k: p.takerFeeBpsTimes1k,
        makerFeeBpsTimes1k: p.makerFeeBpsTimes1k,
        insuranceFundShareBps: p.insuranceFundShareBps,
    };
}
/**
 *  A perp market's live health inputs in ONE call — mark, projected funding, the
 *  effective (OI-scaled) IMF, and the maintenance / close-out thresholds.
 *
 *  Chain tier. Backed by `tryGetHealthSnapshot`, deliberately not
 *  `getHealthSnapshot`: the latter REVERTS on a stale or zero mark (it fails
 *  closed, by design), and inside a `Promise.all` across markets one dead feed
 *  would take the whole fan-out down — the exact failure that made `getPerpState`
 *  unusable before it moved to `tryGetMarkPrice`. Here an unpriceable market
 *  arrives as `{ priceable: false }` and can be skipped.
 *
 *  Prefer this to five separate getters: the contract added it so a cross-margin
 *  health walk reads a market once.
 */
export async function getPerpHealthSnapshot(pool, client) {
    const [ok, s] = await client.readContract({
        address: pool,
        abi: ReadsAbi.perpPoolReadAbi,
        functionName: "tryGetHealthSnapshot",
    });
    if (!ok)
        return { priceable: false };
    return {
        priceable: true,
        oneBase: s.oneBase,
        markPrice: s.markPrice,
        projectedCumulativeFunding: s.projectedCumulativeFunding,
        effectiveImfBps: s.effectiveIMFBps,
        maintenanceMarginBps: s.maintenanceMarginBps,
        closeOutMarginBps: s.closeOutMarginBps,
    };
}
/**
 *  The initial-margin factor a perp market is charging RIGHT NOW, in bps.
 *
 *  Chain tier. Use when only the rate is needed;
 *  {@link getPerpHealthSnapshot} returns it alongside everything else for the same
 *  round-trip, so prefer that if you also need the mark or the thresholds.
 *
 *  This is the OI-scaled dynamic IMF, not `initialMarginBps`. Sizing an order off
 *  the static base under-margins it whenever open interest has pushed the curve
 *  above the floor — the pool would reject an order the client believed fit.
 *
 *  Reverts if dynamic IMF is enabled and the index price is stale (the curve is a
 *  function of open NOTIONAL, so it needs a price).
 */
export async function getEffectiveImfBps(pool, client) {
    return client.readContract({
        address: pool,
        abi: ReadsAbi.perpPoolReadAbi,
        functionName: "getEffectiveIMF",
    });
}
const BPS_DENOMINATOR = 10000n;
/**
 *  The denominator behind the pool's `BPS_TIMES_1K` fee unit (`10000 × 1000`), from
 *  `getBpsOfValueFloor` in `common/Common.sol`. Only the two fee fields use it; every
 *  margin figure is plain bps.
 */
const BPS_TIMES_1K_DENOMINATOR = 10000000n;
/**
 *  Ceiling division, matching the protocol's `divCeil` in `common/Common.sol`.
 *
 *  The contract ceils each margin component, so flooring here would under-quote by up
 *  to a wei per component — enough to preview an order as affordable that the chain
 *  then rejects.
 */
function divCeil(a, b) {
    return a === 0n ? 0n : (a - 1n) / b + 1n;
}
/**
 *  Floor division (toward −∞), matching the protocol's `divFloorInt`.
 *
 *  Native bigint `/` truncates toward ZERO, which differs from floor on every inexact
 *  NEGATIVE result — and the perp paths that need floor are exactly the signed ones.
 *  `MarginBank._realizedPnlForClose` floors so that a realized gain is credited ≤ true
 *  and a loss debited ≥ true (protocol-favouring); reproducing a close with bare `/`
 *  would book a loss a wei light.
 *
 *  **Not interchangeable with `/` elsewhere in this module.**
 *  `PerpMath.unrealizedPnl` genuinely truncates toward zero (plain `int256` division),
 *  so unrealized PnL must use bare `/`. The two roundings differ by design, and the
 *  contract comments say so — don't unify them.
 */
function divFloor(a, b) {
    const q = a / b;
    return a % b !== 0n && a < 0n !== b < 0n ? q - 1n : q;
}
/**
 *  Signed ceiling division (toward +∞), matching the protocol's `divCeilInt`.
 *
 *  The signed twin of {@link divCeil} above, which takes unsigned operands and cannot
 *  express this: for a NEGATIVE quotient, ceiling and "round the magnitude up" are
 *  opposite corrections, and only one of them is what the contract does.
 *
 *  `PerpMath.fundingPayment` rounds this way so a PAYER (positive, a debit) pays at
 *  least what is owed while a RECEIVER (negative, a credit) receives at most it. The
 *  protocol adopted it after plain truncation let split payers collectively underpay a
 *  single receiver and left the MarginBank under-backed, so reproducing a funding
 *  payment with bare `/` under-reports whatever the PAYER owes.
 *
 *  Which side that is turns on the sign of `size × fundingDelta`, not on being long or
 *  short: a long pays while the index is rising and a short pays while it is falling.
 *  The correction fires on `(a < 0n) === (b < 0n)` for exactly that reason — it keys off
 *  the quotient's sign, never off the position's direction.
 */
function divCeilSigned(a, b) {
    const q = a / b;
    return a % b !== 0n && a < 0n === b < 0n ? q + 1n : q;
}
/** Absolute value of a signed raw amount. */
function abs(v) {
    return v < 0n ? -v : v;
}
/** The smaller of two raw amounts — the contract's `minUint256`, for the funding legs. */
function minBig(a, b) {
    return a < b ? a : b;
}
/**
 *  Solve for the mark price at which one market's position trips maintenance margin —
 *  the shared kernel behind `client.getLiquidationPrice` and
 *  `client.previewPerpLiquidationPrice`, which is why a current and a projected price
 *  cannot disagree on identical inputs.
 *
 *  Pure: no client, no block, no I/O. Feed it a consistent snapshot and it is exact
 *  arithmetic.
 *
 *  **Both sides of the inequality move with the price.** Liquidation begins where
 *  `equity == mmReq` — `MarginBank._classify` returns `PartialLiquidation` the moment
 *  `equity < mmReq`. Equity moves with the mark through unrealized PnL, at
 *  `size / oneBase` per unit of price. But `mmReq` moves too, because
 *  `_marketHealthFromSnapshot` recomputes it as
 *  `ceil(|size| × mark × mmBps / (oneBase × 10000))` against the CURRENT mark. Solving
 *  `equity(p) == mmReq(p)` therefore carries a factor a fixed-`mmReq` estimate drops:
 *
 *  ```text
 *  long    p = mark − (equity − mmReq) × oneBase × 10000 / (|size| × (10000 − mmBps))
 *  short   p = mark + (equity − mmReq) × oneBase × 10000 / (|size| × (10000 + mmBps))
 *  ```
 *
 *  Dropping that factor errs conservative on a long and **optimistic on a short** —
 *  reporting the liquidation further away than it is, on the side whose loss is
 *  unbounded. At a 250 bps maintenance threshold it misplaces a short's liquidation by
 *  ~2.5% of the distance to it.
 *
 *  **A single-market solve, deliberately.** Only this market's mark is varied; every
 *  other market's contribution stays at the value baked into `equity` and `mmReq`. So
 *  the answer is "the price at which THIS market's move alone trips maintenance",
 *  which is what a per-position liquidation price means under cross margin. A
 *  correlated move across several markets liquidates sooner, and nothing here claims
 *  otherwise.
 *
 *  Also held constant: pending funding (already netted into `equity`), the mark's own
 *  EMA lag, and any fill landing between the read and the move.
 *
 * **Details**
 *
 * - Returns: The liquidation price in raw quote units per whole base, floored at 0 (a price cannot go negative) — or `null` when the position is flat, or when `mmBps` is exactly 10000 on a long, where price cancels out of the inequality entirely and no price triggers liquidation. That last case is unreachable on a real pool: `PerpPool._validatePerpPoolParameters` enforces `initialMarginBps ≤ 10000` and `maintenanceMarginBps < initialMarginBps`, so `mmBps < 10000` on every market.
 *
 * @category perpetual markets
 */
export function perpLiquidationPrice(p) {
    if (p.size === 0n)
        return null;
    const long = p.size > 0n;
    // A long's buffer is consumed at (1 − mmBps/10000) per unit of price, a short's at
    // (1 + mmBps/10000): a rising mark grows a short's maintenance requirement in the
    // same direction it erodes its equity, while it shrinks a long's. That asymmetry is
    // the entire content of the correction factor.
    const perUnit = long ? BPS_DENOMINATOR - p.maintenanceMarginBps : BPS_DENOMINATOR + p.maintenanceMarginBps;
    if (perUnit === 0n)
        return null;
    // Floored, so on any real pool (`mmBps < 10000`, hence `perUnit > 0`) the reported
    // price is uniformly the cautious one: a smaller delta puts the liquidation CLOSER
    // to the current mark, on both sides.
    const delta = divFloor((p.equity - p.mmReq) * p.oneBase * BPS_DENOMINATOR, abs(p.size) * perUnit);
    const liq = long ? p.markPrice - delta : p.markPrice + delta;
    return liq > 0n ? liq : 0n;
}
/**
 *  Estimated liquidation price for an account's position in one perp pool (raw quote
 *  units per whole base), or `null` when the account is flat in that pool.
 *
 *  Chain tier. Three reads — the position, the pool's health snapshot, and the
 *  account's cross-margin health — all pinned to ONE block. Pinning is load-bearing:
 *  composed across blocks, a fill between reads desyncs size from equity and the solve
 *  describes a state that never existed.
 *
 *  The arithmetic is {@link perpLiquidationPrice}; see there for the maintenance
 *  identity, the `10000 ∓ mmBps` factor, and everything held constant. For the price
 *  an order would MOVE this to, use {@link previewPerpLiquidationPrice}.
 *
 *  **Throws on a stale mark rather than returning `null`.** `getAccountHealth` walks
 *  every market the account is active in through the pool's REVERTING
 *  `getHealthSnapshot`, so one dead feed anywhere in the account reverts this read.
 *  That is the conventional chain-read contract — a read that did not complete throws,
 *  and `null` means only "flat". A form that must render through a stale feed should
 *  use {@link previewPerpLiquidationPrice}, whose `priceable` arm reports it instead.
 */
export async function getLiquidationPrice(ref, client) {
    const blockNumber = await client.getBlockNumber();
    const bank = { address: ref.marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber };
    const [position, snapshot, health] = await Promise.all([
        client.readContract({ ...bank, functionName: "getPosition", args: [ref.account, ref.pool] }),
        client.readContract({
            address: ref.pool,
            abi: ReadsAbi.perpPoolReadAbi,
            functionName: "tryGetHealthSnapshot",
            blockNumber,
        }),
        client.readContract({ ...bank, functionName: "getAccountHealth", args: [ref.account] }),
    ]);
    if (position.size === 0n)
        return null;
    const [ok, snap] = snapshot;
    // Non-flat, so this pool is in the account's `activePerpPools`, so the health read
    // above walked it through the REVERTING `getHealthSnapshot` at this same block — an
    // unpriceable mark would have rejected the `Promise.all` before reaching this line.
    // (`tryGetHealthSnapshot`'s `ok` is contractually `isPerpPool.isPriceable()`, per
    // MarginBank's own note on `_tryComputeAccountHealth`.)
    if (!ok)
        unreachable("a non-flat position's pool cannot be unpriceable once getAccountHealth has resolved");
    const [equity, , mmReq] = health;
    return perpLiquidationPrice({
        equity,
        mmReq,
        size: position.size,
        markPrice: snap.markPrice,
        maintenanceMarginBps: snap.maintenanceMarginBps,
        oneBase: snap.oneBase,
    });
}
/**
 *  An account's realized leverage at one position and across the account, plus every
 *  ceiling that bounds it.
 *
 *  Chain tier, every read pinned to ONE block. **The protocol has no leverage view to
 *  call** — `getMaxLeverage` / `getMaxLeverageLimit` / `getVoucherLeverageCap` are all
 *  *cap configuration*, and none of them measures a position. Realized leverage is
 *  derived here from mark notional and equity, which is why this exists at all.
 *
 *  The ceilings are returned as they are stored, and are **not** collapsed into one
 *  number. Each answers a different question and they do not compose by taking a minimum:
 *  a voucher cap replaces an unset or looser account setting before the protocol ceiling
 *  clamps the result, and it applies only to a position INCREASE. See
 *  {@link PerpLeverage.voucherLeverageCapX} for the rule in full, and
 *  {@link SomniaMarketsClient.previewPerpOrderMargin} for a specific order judged against
 *  all of it.
 *
 *  Returns a value for a FLAT position rather than `null` (`size: 0n`,
 *  `positionNotional: 0n`) — this is an account aggregate, not a by-id lookup, and the
 *  account-wide fields stay meaningful when this particular market is empty.
 *
 *  **Throws on a stale mark anywhere in the account**, for the same reason
 *  {@link getLiquidationPrice} does: equity is only defined once every active market
 *  is priceable, and the MarginBank enforces that. A partial walk would produce a
 *  plausible, smaller equity — worse than an error.
 *
 * **Details**
 *
 * - `ref`: the (bank, account, pool) triple
 */
export async function getPerpLeverage(ref, client) {
    const blockNumber = await client.getBlockNumber();
    const bank = { address: ref.marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber };
    const pool = { address: ref.pool, abi: ReadsAbi.perpPoolReadAbi, blockNumber };
    const [position, snapshot, health, state, accountCap, protocolCap, creditFloor, voucherCap, voucherAllowed] = await Promise.all([
        client.readContract({ ...bank, functionName: "getPosition", args: [ref.account, ref.pool] }),
        client.readContract({ ...pool, functionName: "tryGetHealthSnapshot" }),
        client.readContract({ ...bank, functionName: "getAccountHealth", args: [ref.account] }),
        client.readContract({ ...bank, functionName: "getAccountState", args: [ref.account] }),
        client.readContract({ ...bank, functionName: "getMaxLeverage", args: [ref.account, ref.pool] }),
        client.readContract({ ...bank, functionName: "getMaxLeverageLimit" }),
        // The credit-voucher confinement, read alongside the two caps rather than left to a
        // second call. `protocolMaxLeverageX` alone overstates what a voucher-holding
        // account may OPEN at, and a consumer binding a leverage slider to it would offer
        // sizes the placement reverts on — but the confinement is gated on
        // `additionalSize > 0`, so it does not bound the position measured here. Reported,
        // not applied; see `PerpLeverage.voucherLeverageCapX` for the composition.
        client.readContract({ ...bank, functionName: "getCreditFloor", args: [ref.account] }),
        client.readContract({ ...bank, functionName: "getVoucherLeverageCap" }),
        client.readContract({ ...bank, functionName: "isVoucherMarketAllowed", args: [ref.pool] }),
    ]);
    const [ok, snap] = snapshot;
    // This pool's own feed. Unlike the account walk below, a FLAT position leaves this
    // pool out of `activePerpPools`, so the health read never touched it and its mark
    // really can be stale here — hence a typed error rather than `unreachable`. The
    // notional would be 0 either way, but `markPrice` and `marketMaxLeverageBps` would
    // be the contract's all-zero sentinel, and a max leverage of 0 reads as a real cap.
    if (!ok) {
        throw new InvalidInputError(`perp pool ${ref.pool} has no fresh mark price; leverage is not defined`);
    }
    const { oneBase, markPrice, effectiveIMFBps } = snap;
    const [equity] = health;
    const positionNotional = (abs(position.size) * markPrice) / oneBase;
    // Every OTHER active market's mark notional. `getAccountHealth` resolving above
    // proves each one priceable at this block (it walks them through the reverting
    // `getHealthSnapshot`), so this walk cannot come up short — see the note in
    // `getLiquidationPrice`.
    const target = ref.pool.toLowerCase();
    const others = state.activePerpPools.filter((p) => p.toLowerCase() !== target);
    const otherNotionals = await Promise.all(others.map(async (other) => {
        const [otherSnapshot, otherPosition] = await Promise.all([
            client.readContract({
                address: other,
                abi: ReadsAbi.perpPoolReadAbi,
                functionName: "tryGetHealthSnapshot",
                blockNumber,
            }),
            client.readContract({ ...bank, functionName: "getPosition", args: [ref.account, other] }),
        ]);
        const [otherOk, otherSnap] = otherSnapshot;
        if (!otherOk)
            unreachable(`active pool ${other} unpriceable after getAccountHealth resolved at block ${blockNumber}`);
        return (abs(otherPosition.size) * otherSnap.markPrice) / otherSnap.oneBase;
    }));
    const accountNotional = otherNotionals.reduce((sum, n) => sum + n, positionNotional);
    // `_validatePerpPoolParameters` keeps `initialMarginBps > maintenanceMarginBps > 0`,
    // and the dynamic IMF curve only ever scales that floor UP, so the effective IMF is
    // strictly positive on every live pool.
    if (effectiveIMFBps <= 0n)
        unreachable("a pool's effective IMF is >= initialMarginBps, which the pool keeps > 0");
    return {
        asOfBlock: blockNumber,
        size: position.size,
        markPrice,
        positionNotional,
        accountNotional,
        equity,
        positionLeverageBps: equity > 0n ? (positionNotional * BPS_DENOMINATOR) / equity : null,
        accountLeverageBps: equity > 0n ? (accountNotional * BPS_DENOMINATOR) / equity : null,
        marketMaxLeverageBps: (BPS_DENOMINATOR * BPS_DENOMINATOR) / effectiveIMFBps,
        accountMaxLeverageX: accountCap,
        protocolMaxLeverageX: protocolCap,
        creditFloor,
        voucherLeverageCapX: voucherCap,
        voucherMarketAllowed: voucherAllowed,
    };
}
/**
 *  Split one position into PnL, funding, notional and its three margin requirements —
 *  pure, no client, no block.
 *
 *  A direct port of `MarginBank._computePositionMetrics` and
 *  `_marketHealthFromSnapshot`. Exported so a caller can re-run it against a live
 *  store, a hypothetical mark, or a position it is about to open, without a round-trip
 *  — and so a table and a detail view cannot disagree on identical inputs.
 *
 * @category perpetual markets
 */
export function perpPositionAnalytics(p) {
    const absSize = abs(p.size);
    const notional = (absSize * p.markPrice) / p.oneBase;
    // Bare `/` — `PerpMath.unrealizedPnl` truncates toward ZERO. Guarded on a flat
    // position for the same reason the contract is: with `size == 0` the price delta is
    // multiplied by nothing, but an entry price of 0 on a flat row would otherwise make
    // the intent unclear to a reader.
    const unrealizedPnl = p.size === 0n ? 0n : ((p.markPrice - p.avgEntryPrice) * p.size) / p.oneBase;
    // Ceil toward +∞, NOT the truncation above. See the module note.
    const fundingDelta = p.projectedCumulativeFunding - p.entryFundingIndex;
    const accruedFunding = divCeilSigned(p.size * fundingDelta, FUNDING_PRECISION * p.oneBase);
    const equityContribution = unrealizedPnl - accruedFunding;
    const initialMarginRequirement = divCeil(notional * p.effectiveImfBps, BPS_DENOMINATOR);
    return {
        size: p.size,
        notional,
        unrealizedPnl,
        accruedFunding,
        equityContribution,
        initialMarginRequirement,
        maintenanceMarginRequirement: divCeil(notional * p.maintenanceMarginBps, BPS_DENOMINATOR),
        closeOutMarginRequirement: divCeil(notional * p.closeOutMarginBps, BPS_DENOMINATOR),
        returnOnMarginBps: initialMarginRequirement === 0n ? null : divFloor(equityContribution * BPS_DENOMINATOR, initialMarginRequirement),
    };
}
/**
 *  One position, marked — unrealized PnL, accrued funding, notional, its three margin
 *  requirements and its return on margin.
 *
 *  Chain tier, **two reads**, both pinned to one block. Composed across blocks a
 *  settlement between them would net a fresh funding index against a stale entry
 *  index and report funding that never accrued.
 *
 *  This is the split `getAccountHealth` cannot give you: it returns one equity figure
 *  for the whole account with every market's PnL and funding already summed and
 *  netted, so a two-position trader cannot see which position carries the loss, and
 *  cannot see funding at all.
 *
 *  **Returns `{ priceable: false }` rather than throwing** on a stale mark, unlike
 *  {@link getLiquidationPrice}. This is a per-row read: in a positions table one dead
 *  feed must degrade one row, not the page.
 *
 *  For leverage ratios use {@link SomniaMarketsClient.getPerpLeverage} — notional over
 *  *equity* needs the account-wide walk, which is deliberately not paid for here.
 */
export async function getPerpPositionAnalytics(ref, client) {
    const blockNumber = await client.getBlockNumber();
    const [position, snapshot] = await Promise.all([
        client.readContract({
            address: ref.marginBank,
            abi: ReadsAbi.marginBankReadAbi,
            functionName: "getPosition",
            args: [ref.account, ref.pool],
            blockNumber,
        }),
        client.readContract({
            address: ref.pool,
            abi: ReadsAbi.perpPoolReadAbi,
            functionName: "tryGetHealthSnapshot",
            blockNumber,
        }),
    ]);
    const [ok, snap] = snapshot;
    if (!ok)
        return { priceable: false, asOfBlock: blockNumber, pool: ref.pool, size: position.size };
    return {
        priceable: true,
        asOfBlock: blockNumber,
        pool: ref.pool,
        avgEntryPrice: position.avgEntryPrice,
        markPrice: snap.markPrice,
        ...perpPositionAnalytics({
            size: position.size,
            avgEntryPrice: position.avgEntryPrice,
            entryFundingIndex: position.entryFundingIndex,
            markPrice: snap.markPrice,
            projectedCumulativeFunding: snap.projectedCumulativeFunding,
            oneBase: snap.oneBase,
            effectiveImfBps: snap.effectiveIMFBps,
            maintenanceMarginBps: snap.maintenanceMarginBps,
            closeOutMarginBps: snap.closeOutMarginBps,
        }),
    };
}
/**
 *  Every position the account actually holds, each marked — the read a positions
 *  table wants.
 *
 *  Chain tier, `1 + 2n` reads for `n` active markets, **all pinned to one block**.
 *  That pinning is the point of having this rather than a loop over
 *  {@link getPerpPositionAnalytics}: unpinned, the rows would come from different
 *  heights and their `equityContribution`s would not re-sum to any equity the account
 *  ever had.
 *
 *  Scoped to `getAccountState().activePerpPools`, which is the bank's own list of
 *  markets the account has a position in — so a closed position does not linger the
 *  way it does on the indexed rows, and no market the account has never touched is
 *  read.
 *
 *  An unpriceable market comes back as its `{ priceable: false }` row rather than
 *  taking the page down, matching the contract's own `getSideHolderStatesPaginated`
 *  rule that one dead oracle degrades one entry. Returned in the bank's order.
 */
export async function listPerpPositionAnalytics(p, client) {
    const blockNumber = await client.getBlockNumber();
    const state = await client.readContract({
        address: p.marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "getAccountState",
        args: [p.account],
        blockNumber,
    });
    return Promise.all(state.activePerpPools.map(async (pool) => {
        const [position, snapshot] = await Promise.all([
            client.readContract({
                address: p.marginBank,
                abi: ReadsAbi.marginBankReadAbi,
                functionName: "getPosition",
                args: [p.account, pool],
                blockNumber,
            }),
            client.readContract({
                address: pool,
                abi: ReadsAbi.perpPoolReadAbi,
                functionName: "tryGetHealthSnapshot",
                blockNumber,
            }),
        ]);
        const [ok, snap] = snapshot;
        if (!ok)
            return { priceable: false, asOfBlock: blockNumber, pool, size: position.size };
        return {
            priceable: true,
            asOfBlock: blockNumber,
            pool,
            avgEntryPrice: position.avgEntryPrice,
            markPrice: snap.markPrice,
            ...perpPositionAnalytics({
                size: position.size,
                avgEntryPrice: position.avgEntryPrice,
                entryFundingIndex: position.entryFundingIndex,
                markPrice: snap.markPrice,
                projectedCumulativeFunding: snap.projectedCumulativeFunding,
                oneBase: snap.oneBase,
                effectiveImfBps: snap.effectiveIMFBps,
                maintenanceMarginBps: snap.maintenanceMarginBps,
                closeOutMarginBps: snap.closeOutMarginBps,
            }),
        };
    }));
}
/**
 *  Every account holding an open position on one side of one perp market, read
 *  from the MarginBank's own per-(pool, side) holder array.
 *
 *  **When to use**
 *
 *  Use to find the accounts a liquidation keeper must watch — this is the read
 *  that makes a keeper possible from head state alone, without an off-chain
 *  indexer. The indexer's `listPerpPositions` answers the inverse question
 *  (one account's positions across pools) and lags head; this is the
 *  authoritative per-market roster at a known block.
 *
 *  **Details**
 *
 *  Chain tier. Pages through the bank's bounded slice view — many holders per
 *  round-trip, never one call per holder — and pins every page to ONE block
 *  (`opts.blockNumber`, or the head sampled once at the start). Without the pin
 *  a holder closing or opening mid-walk could be missed or double-counted;
 *  with it the result is exactly the array the contract held at `asOfBlock`.
 *
 * - `ref`: which bank, pool, and side to enumerate
 * - `opts`: block pin and page size (see {@link GetPerpSideHoldersOptions})
 *
 *  **Gotchas**
 *
 *  Membership means an open position on that side — the two sides are disjoint
 *  and an account with only resting orders appears on neither. A very large
 *  market costs `holders / pageSize` sequential round-trips; raise
 *  `opts.pageSize` if your node allows bigger responses.
 *
 * - Throws InvalidInputError when `opts.pageSize` is not a positive integer
 * - Throws ContractRevertError when the contract rejects the call
 * - Throws RpcError when the node fails, the address has no code, or the pinned block cannot be served
 *
 * **Example** (Pricing one side at a snapshot)
 *
 *  ```ts
 *  const { holders, asOfBlock } = await client.getPerpSideHolders({ marginBank, pool, isLong: true });
 *  const prices = await Promise.all(
 *    // Priced at the SAME block as the enumeration: at head, a holder that
 *    // closed after the snapshot would revert NoOpenPosition and reject the sweep.
 *    holders.map((h) => client.getBankruptcyPrice({ marginBank, account: h, pool }, { blockNumber: asOfBlock })),
 *  );
 *  console.log(asOfBlock, prices);
 *  ```
 */
export async function getPerpSideHolders(ref, opts, client) {
    const pageSize = opts.pageSize ?? 1000;
    if (!Number.isInteger(pageSize) || pageSize <= 0) {
        throw new InvalidInputError(`pageSize must be a positive integer, got ${pageSize}`);
    }
    const asOfBlock = opts.blockNumber ?? (await client.getBlockNumber());
    const count = BigInt(pageSize);
    const holders = [];
    for (let start = 0n;; start += count) {
        const page = await client.readContract({
            address: ref.marginBank,
            abi: ReadsAbi.marginBankReadAbi,
            functionName: "getSideHoldersPaginated",
            args: [ref.pool, ref.isLong, start, count],
            blockNumber: asOfBlock,
        });
        holders.push(...page);
        // The contract clamps a slice to what exists, so a short page IS the end —
        // no separate count read, and the walk always terminates.
        if (page.length < pageSize)
            break;
    }
    return { holders, asOfBlock };
}
/**
 *  Fills in the Solidity name on a MarginBank revert the read boundary left
 *  unnamed, by decoding against the errors DECLARED in `marginBankReadAbi` (see
 *  the note there for why the boundary's generated table can't). Structural
 *  no-op once that table covers MarginBank: `errorName` arrives set and this
 *  returns the error untouched.
 */
function nameMarginBankRevert(err) {
    if (!(err instanceof ContractRevertError) || err.errorName !== undefined || !isHex(err.data)) {
        return err;
    }
    try {
        const decoded = decodeErrorResult({ abi: ReadsAbi.marginBankReadAbi, data: err.data });
        return new ContractRevertError({
            errorName: decoded.errorName,
            args: decoded.args ?? [],
            data: err.data,
            address: err.address,
            functionName: err.functionName,
        }, { cause: err });
    }
    catch {
        // Not one of the declared errors — keep the original rather than guessing.
        return err;
    }
}
/**
 *  The MarginBank's OWN bankruptcy price for an account's position in one perp
 *  pool (raw quote units per whole base) — the price at which the position's
 *  allocated share of the account's equity is exhausted.
 *
 *  **When to use**
 *
 *  Use for anything that settles or bids on a bankrupt position — a liquidation
 *  keeper deciding what a position is worth pays against THIS figure, the one
 *  the contract itself computes. For a UI or monitoring estimate of where
 *  liquidation *triggers*, use {@link getLiquidationPrice} instead.
 *
 *  **Details**
 *
 *  Chain tier, verbatim — no client-side math. This is a different quantity
 *  from {@link getLiquidationPrice}, not a better version of the same one:
 *  the liquidation price is the SDK's client-side estimate of the mark at which
 *  the whole account trips its maintenance requirement (where liquidation
 *  starts), while the bankruptcy price is the contract's figure for the mark at
 *  which this position's allocated equity reaches zero (where there is nothing
 *  left). The two also differ in kind — one is derived off several reads and can
 *  drift from contract rounding; this one cannot, because the contract computes
 *  it.
 *
 * - `ref`: the (bank, account, pool) triple, same as `getPerpPosition` (perp/state.ts)
 * - `opts.blockNumber`: read at this block instead of head (see Gotchas)
 *
 *  **Gotchas**
 *
 *  Reverts rather than returning a sentinel: `NoOpenPosition` when the account
 *  is flat in that pool, `AdlZeroNotional` in the degenerate state where the
 *  account's total mark notional is zero. Both surface with `errorName` set —
 *  branch on it, never on message text. (On a node that strips revert bytes
 *  from `eth_call` responses, `errorName` stays undefined — the raw-data field
 *  is empty too, so there is nothing to decode.)
 *
 *  Pricing an enumerated holder? Pass the enumeration's `asOfBlock` as
 *  `opts.blockNumber` — priced at head instead, a holder that closed after the
 *  snapshot reverts `NoOpenPosition` and rejects the sweep.
 *
 * - Throws ContractRevertError `errorName: "NoOpenPosition"` when the account has no position in that pool; `errorName: "AdlZeroNotional"` in the zero-notional degenerate state
 * - Throws RpcError when the node request fails
 *
 * **Example** (Handling a flat position)
 *
 *  ```ts
 *  try {
 *    return await client.getBankruptcyPrice({ marginBank, account: holder, pool });
 *  } catch (e) {
 *    if (e instanceof ContractRevertError && e.errorName === "NoOpenPosition") {
 *      return null; // flat in this pool — nothing to price
 *    }
 *    throw e;
 *  }
 *  ```
 */
export async function getBankruptcyPrice(ref, opts, client, ownedFailure = () => false) {
    try {
        return await client.readContract({
            address: ref.marginBank,
            abi: ReadsAbi.marginBankReadAbi,
            functionName: "getBankruptcyPrice",
            args: [ref.account, ref.pool],
            blockNumber: opts.blockNumber,
        });
    }
    catch (err) {
        if (ownedFailure(err))
            throw err;
        throw nameMarginBankRevert(err);
    }
}
/**
 *  The bank's `deposit` call itself, with no approval and no send.
 *
 *  Split out of {@link depositMargin} so the sending verb and
 *  {@link buildDepositMargin} encode from ONE definition — the build-only verb
 *  cannot drift from what actually gets sent.
 */
function depositCall(w, bank, p) {
    return {
        address: bank,
        abi: TradeAbi.marginBankWriteAbi,
        functionName: "deposit",
        args: [p.amount],
        gas: p.gas ?? w.defaultGas,
    };
}
/**
 *  A deposit's one input check, hoisted out of {@link depositCall} so it fires
 *  before the bank is resolved — bad input should not cost a chain read, and
 *  should not surface as `resolveMarginBank`'s "pass marginBank or pool" instead.
 */
function assertDepositAmount(p) {
    if (p.amount <= 0n)
        throw new InvalidInputError("amount must be > 0");
}
/** Split out of {@link withdrawMargin} — see {@link depositCall}. */
function withdrawCall(w, bank, p) {
    return {
        address: bank,
        abi: TradeAbi.marginBankWriteAbi,
        functionName: "withdraw",
        args: [p.amount],
        gas: p.gas ?? w.defaultGas,
    };
}
export async function depositMargin(w, p) {
    assertDepositAmount(p);
    const gas = p.gas ?? w.defaultGas;
    const bank = await w.resolveMarginBank(p);
    const call = depositCall(w, bank, p);
    // The BANK pulls the collateral (not the pool) — approve the bank, in the
    // same executor call as the deposit.
    const prerequisites = [];
    if (p.autoApprove !== false) {
        const collateral = await w.bankCollateral(bank, p.collateral);
        const approval = await w.approvalIfNeeded(collateral, bank, p.amount, gas);
        if (approval)
            prerequisites.push(approval);
    }
    return w.execute(call, prerequisites);
}
export async function withdrawMargin(w, p) {
    const bank = await w.resolveMarginBank(p);
    return w.execute(withdrawCall(w, bank, p));
}
/**
 *  Build a MarginBank deposit without sending it.
 *
 *  Takes exactly the parameters {@link depositMargin} takes and returns the unsigned
 *  calls instead of broadcasting them, so approve + deposit can go out as ONE
 *  transaction rather than two.
 *
 * **Details**
 *
 * - `p`: The same inputs as {@link depositMargin}.
 * - Returns: The deposit call, and the approval unless `autoApprove: false`.
 *
 *  **Gotchas**
 *
 *  - `approval` is returned whenever `autoApprove` is not `false`, **without**
 *    reading the current allowance — that check is an `eth_call`, which a build-only
 *    verb should not make. So it may be redundant, never short: it approves
 *    `maxUint256`, as the send path does.
 *  - Order matters. `approval` must execute before `deposit`.
 *  - Resolving the bank costs a chain read unless you pass `marginBank`
 *    (`PerpMarket.marginBank` has it); resolving the collateral token costs another
 *    unless you pass `collateral`.
 *
 * - Throws {@link InvalidInputError} when `amount` is not > 0.
 *
 * **Example** (Building a margin deposit)
 *
 *  ```ts
 *  const { deposit, approval } = await trader.buildDepositMargin({
 *    marginBank, amount: 250_000_000_000_000_000_000n,
 *  });
 *  // The approval goes FIRST — the bank pulls, so the deposit reverts without it.
 *  await myBatcher.send(approval ? [approval, deposit] : [deposit]);
 *  ```
 */
export async function buildDepositMargin(w, p) {
    assertDepositAmount(p);
    const bank = await w.resolveMarginBank(p);
    const deposit = Writer.toUnsigned(w.chain.id, depositCall(w, bank, p), `Deposit ${p.amount} collateral into MarginBank ${bank}`);
    if (p.autoApprove === false)
        return { deposit };
    const collateral = await w.bankCollateral(bank, p.collateral);
    return {
        deposit,
        approval: Writer.approvalCall(w.chain.id, collateral, bank, `Approve collateral ${collateral} for MarginBank ${bank}`),
    };
}
/**
 *  Build a MarginBank withdrawal without sending it.
 *
 *  Takes exactly the parameters {@link withdrawMargin} takes and returns the unsigned
 *  call instead of broadcasting it, so a withdrawal and the transfer that forwards the
 *  proceeds on can go out as ONE transaction.
 *
 *  Nothing to approve — the bank pays out, it does not pull. The margin check stays
 *  on chain: an amount above what is withdrawable reverts when you send this, exactly
 *  as it does through {@link withdrawMargin}. Resolving the bank costs a chain read
 *  unless you pass `marginBank`.
 *
 * **Details**
 *
 * - `p`: The same inputs as {@link withdrawMargin}.
 * - Returns: The unsigned withdraw call.
 *
 * **Example** (Building a margin withdrawal)
 *
 *  ```ts
 *  const withdraw = await trader.buildWithdrawMargin({ marginBank, amount: 5_000_000_000_000_000_000n });
 *  await myBatcher.send([withdraw, forwardToWallet]);
 *  ```
 */
export async function buildWithdrawMargin(w, p) {
    const bank = await w.resolveMarginBank(p);
    return Writer.toUnsigned(w.chain.id, withdrawCall(w, bank, p), `Withdraw ${p.amount} collateral from MarginBank ${bank}`);
}
export async function setPerpLeverage(w, p) {
    const bank = await w.resolveMarginBank(p);
    return w.execute({
        address: bank,
        abi: TradeAbi.marginBankWriteAbi,
        functionName: "setMaxLeverage",
        args: [p.pool, p.leverageX],
        gas: p.gas ?? w.defaultGas,
    });
}
/**
 *  The pool's placement arithmetic — pure, no client, no block.
 *
 *  Split out of {@link SomniaMarketsClient.previewPerpOrderMargin} so the FORWARD question ("what does this
 *  order cost") and the INVERSE one (`client.getMaxPerpOrderSize`, "what is the largest
 *  order I can place") are answered by the same code rather than by two ports of the
 *  same contract. They cannot drift, which matters more here than usual: a max size
 *  computed by a second, subtly different rule reverts on placement, and the term such
 *  a rule most often drops is {@link PerpOrderMarginQuote.adverseGapPortion}.
 *
 *  **Auto-pull (T70) is modelled iff {@link PerpOrderMarginQuoteInputs.wallet} is
 *  supplied**, and supplying it is a statement about the SENDER, not about the account:
 *  `PerpPool._autoPullMargin` fires only when `msg.sender == order.owner`. Given a
 *  wallet, the gates below describe the balance the pool will have topped up to before
 *  it locks; without one they describe the in-bank balance alone, which is what an
 *  operator- or registry-routed placement actually faces. The no-wallet path is
 *  arithmetically identical to the pre-T70 one.
 *
 * @category perpetual markets
 */
export function perpOrderMarginQuote(p) {
    // The reducing/increasing split. A flat account or a same-direction order is
    // increasing in full; only an opposite-side order nets against existing exposure,
    // and only up to the capacity resting orders have not already spoken for.
    const sameDirection = p.positionSize === 0n || p.isBid === p.positionSize > 0n;
    let increasingQuantity = p.quantity;
    if (!sameDirection) {
        increasingQuantity = 0n;
        if (p.quantity > p.effectiveReducingCapacity) {
            increasingQuantity = p.quantity - p.effectiveReducingCapacity;
        }
    }
    const reducingQuantity = p.quantity - increasingQuantity;
    const initialMarginPortion = divCeil(increasingQuantity * p.price * p.effectiveImfBps, p.oneBase * BPS_DENOMINATOR);
    // Adverse only: a buy ABOVE mark or a sell BELOW it opens underwater by the gap.
    // A favourable entry reserves nothing extra.
    let adverseGap = 0n;
    if (p.isBid && p.price > p.markPrice) {
        adverseGap = p.price - p.markPrice;
    }
    else if (!p.isBid && p.markPrice > p.price) {
        adverseGap = p.markPrice - p.price;
    }
    const adverseGapPortion = divCeil(increasingQuantity * adverseGap, p.oneBase);
    const lockAmount = initialMarginPortion + adverseGapPortion;
    // Credit-voucher confinement, applied BEFORE the protocol-wide clamp because that is
    // the order `_meetsIM` uses. It only ever touches a position-increasing order (the
    // contract gates the whole branch on `additionalSize > 0`), so a voucher holder can
    // always close.
    //
    // Two distinct outcomes, and only one of them is a margin question. An un-allowlisted
    // market — or an unset cap — is a hard placement revert (`VoucherMarketNotAllowed` /
    // `VoucherLeverageCapNotSet`), no arithmetic involved. Otherwise the cap is forced
    // into the ordinary leverage->IM path whenever the user's own setting is unset or
    // looser, which RAISES the requirement rather than rejecting: the surcharge below is
    // the same term, sourced from the protocol instead of from the user.
    const voucherActive = increasingQuantity > 0n && p.creditFloor > 0n;
    const voucherBlocked = voucherActive && (!p.voucherMarketAllowed || p.voucherLeverageCapX === 0);
    const effectiveLeverage = voucherActive && !voucherBlocked && (p.accountMaxLeverageX === 0 || p.accountMaxLeverageX > p.voucherLeverageCapX)
        ? p.voucherLeverageCapX
        : p.accountMaxLeverageX;
    // A stricter leverage cap raises the required IM above the market's. The lock
    // already reserved the market rate, so only the DELTA is charged, and it is charged
    // on post-fill notional rather than just the new leg.
    const cap = p.protocolMaxLeverageX > 0 && effectiveLeverage > p.protocolMaxLeverageX
        ? p.protocolMaxLeverageX
        : effectiveLeverage;
    const leverageImBps = cap === 0 ? 0n : divCeil(BPS_DENOMINATOR, BigInt(cap));
    const appliedImBps = leverageImBps > p.effectiveImfBps ? leverageImBps : p.effectiveImfBps;
    const existingNotional = (abs(p.positionSize) * p.markPrice) / p.oneBase;
    const additionalNotional = (increasingQuantity * p.price) / p.oneBase;
    const leverageSurcharge = appliedImBps > p.effectiveImfBps && increasingQuantity > 0n
        ? divCeil((existingNotional + additionalNotional) * (appliedImBps - p.effectiveImfBps), BPS_DENOMINATOR)
        : 0n;
    // `PerpPool._feeHeadroom`: the larger of the taker and floored-maker rates plus the
    // order's builder fee, ceil-rounded on the FULL notional. A negative maker rate is a
    // REBATE and floors at zero first — a credit must not shrink the reserve below the
    // taker case. Uses `p.quantity`, not `increasingQuantity`, because fees are charged
    // on the whole fill; on a flip that over-reserves by a few bps, and the excess lands
    // as ordinary withdrawable collateral, which is the cheaper of the two errors.
    const takerRate = p.takerFeeBpsTimes1k ?? 0n;
    const makerRate = p.makerFeeBpsTimes1k ?? 0n;
    const makerCharge = makerRate > 0n ? makerRate : 0n;
    const worstCaseRate = (takerRate > makerCharge ? takerRate : makerCharge) + (p.builderFeeBpsTimes1k ?? 0n);
    const feeHeadroom = divCeil(((p.quantity * p.price) / p.oneBase) * worstCaseRate, BPS_TIMES_1K_DENOMINATOR);
    // The two gates that reject the whole order rather than resizing it. `restricted`
    // spares a pure reduce (`increasingQuantity > 0` on chain, PerpPool.sol:976);
    // isolation does not, because it governs which market may be touched at all.
    const restrictedBlocked = p.restricted === true && increasingQuantity > 0n;
    const isolationBlocked = p.isolationAllowsMarket === false;
    // `MarginBank.quoteOrderTopUp`, ported so the binary search in `getMaxPerpOrderSize`
    // can run it a hundred times without a round-trip. Every input is already computed
    // above, and `leverageSurcharge` IS `_orderImRequirement` — the contract resolves both
    // through the same `_orderEffectiveImBps` helper precisely so the pull and the gate it
    // unblocks cannot disagree, so reusing the term here preserves that property.
    //
    // The three declines are the contract's, in its order, and each returns a bare zero:
    // a purely reducing order needs nothing, a negative balance must never be pulled into
    // (that would cure pre-existing bad debt as a side effect of placing an order), and a
    // voucher-blocked increase is doomed whatever the collateral says.
    const required = lockAmount + feeHeadroom + leverageSurcharge;
    let topUpRequired = 0n;
    if (p.wallet != null &&
        increasingQuantity > 0n &&
        !voucherBlocked &&
        p.unlockedCollateral >= 0n &&
        required > p.unlockedCollateral) {
        topUpRequired = required - p.unlockedCollateral;
    }
    // The pool's TWO funding legs, in its own order (`PerpPool._reserveAndPullMargin`).
    // The owner's own wallet pays first, sized by `min(balance, allowance)` because
    // `depositFor` is an ordinary `transferFrom` and either can bind. A linked main then
    // pays the residual, sized by the capacity the bank quotes for it.
    //
    // Both legs are sized by what the wallet can ACTUALLY supply rather than asked for a
    // fixed amount, which is why neither reverts on a short wallet: a child with no
    // allowance falls through to its main instead of being unable to place at all. A
    // shortfall surviving both legs is left to the margin gates below, which is where an
    // underfunded order was already rejected before either feature existed.
    //
    // With no main supplied this reduces to `min(balance, allowance) >= topUpRequired`,
    // which is exactly the pre-existing condition — so the single-wallet path keeps its
    // arithmetic unchanged.
    const ownCapacity = p.wallet == null ? 0n : minBig(p.wallet.balance, p.wallet.allowance);
    const ownWalletPull = minBig(topUpRequired, ownCapacity);
    // A payer was RESOLVED, which is not the same as a payer with money: a linked main
    // with zero capacity still puts the pool on its linked branch. So this keys on the
    // field being supplied, never on its value.
    const hasMain = p.mainWalletCapacity !== undefined;
    const usableMainCapacity = p.mainFundingBlocked === true ? 0n : (p.mainWalletCapacity ?? 0n);
    const mainWalletPull = minBig(topUpRequired - ownWalletPull, usableMainCapacity);
    const walletCoversTopUp = topUpRequired === 0n || ownWalletPull + mainWalletPull >= topUpRequired;
    // WHAT ACTUALLY LANDS IN THE BANK, and the two paths differ in kind rather than in
    // degree — this is the one place the linked rail is not just "one more wallet".
    //
    //   UNLINKED. The pool calls `depositFor(owner, topUp)` with a FIXED amount, so a
    //   short wallet makes the token's `transferFrom` REVERT. A transaction that succeeds
    //   therefore delivered exactly `topUpRequired`, and `walletCoversTopUp` is a real
    //   placement gate.
    //
    //   LINKED. Both legs are `min(...)`-sized against what each wallet can supply, so
    //   NEITHER CAN REVERT (PerpPool.sol:1876-1890, and the contract says so: "a shortfall
    //   that survives both legs is left to the IM gate below"). The pool pulls what it can,
    //   locks, and lets the margin gates judge the result.
    //
    // Requiring full `topUpRequired` coverage on the linked path was therefore too strict,
    // and wrong in a way that under-sized Max: `topUpRequired` includes `feeHeadroom`,
    // which is a RESERVE rather than part of the lock. Capacities covering the lock but
    // not the headroom fund a placement the chain accepts.
    const pulled = hasMain ? ownWalletPull + mainWalletPull : topUpRequired;
    // BOTH margin gates are conditional on chain, and a purely reducing order trips
    // neither. `PerpPool._placeOrder` locks only `if (lockAmount > 0)` and checks initial
    // margin only `if (increasingQuantity > 0)` — "purely reducing orders skip the check,
    // they can only improve account health". Applying either unconditionally would report
    // a close as rejected for precisely the accounts that most need to close: one below
    // initial margin (equity < imRequirement, so gate 2 fails), or one whose unlocked
    // balance has gone negative through settlement (`int256` by design, so gate 1 fails).
    // Both would be told to deposit when the chain would have accepted the close.
    //
    // Auto-pull runs BEFORE `lockCollateral`, so both gates see the topped-up balance.
    // `topUpRequired` is zero unless a wallet was supplied, which is what keeps the
    // no-auto-pull path byte-identical to the pre-T70 arithmetic.
    const hasCollateralForLock = lockAmount === 0n || p.unlockedCollateral + pulled >= lockAmount;
    // Locking moves collateral out of the unlocked balance that seeds equity, and the pull
    // moved collateral in, so post-lock equity is `equity + pulled - lockAmount`.
    const meetsInitialMargin = increasingQuantity === 0n || p.equity + pulled - lockAmount >= p.imRequirement + leverageSurcharge;
    return {
        increasingQuantity,
        reducingQuantity,
        lockAmount,
        initialMarginPortion,
        adverseGapPortion,
        leverageSurcharge,
        feeHeadroom,
        topUpRequired,
        walletCoversTopUp,
        ownWalletPull,
        mainWalletPull,
        mainFundingBlocked: p.mainFundingBlocked === true,
        hasCollateralForLock,
        meetsInitialMargin,
        voucherBlocked,
        restrictedBlocked,
        isolationBlocked,
        sufficient: hasCollateralForLock &&
            meetsInitialMargin &&
            // Only a fixed-amount pull can fail on coverage. On the linked path the two gates
            // above already judge the partial pull, and folding coverage in as well would
            // reject a placement the chain accepts.
            (hasMain || walletCoversTopUp) &&
            !voucherBlocked &&
            !restrictedBlocked &&
            !isolationBlocked,
    };
}
/**
 *  Everything both placement reads need from chain, at ONE block — the quote inputs that
 *  do not depend on the order's size or side.
 *
 *  Shared so {@link previewPerpOrderMargin} and {@link getMaxPerpOrderSize} cannot end up
 *  reading different state for the same question; they already answer through the same
 *  pure {@link perpOrderMarginQuote}, and this is the other half of that guarantee.
 *
 *  Deliberately does NOT read the order book: only the max-size search needs the lot grid,
 *  and this is an order form's per-keystroke call. `getSystemConfig` is likewise fetched
 *  only under `autoPull`, since its sole purpose here is naming the collateral token to
 *  read the wallet from.
 *
 *  `null` means the market is unpriceable — the caller returns its own
 *  `{ priceable: false }` arm.
 */
async function readPerpPlacementState(p, client, blockNumber) {
    const pool = { address: p.pool, abi: ReadsAbi.perpPoolReadAbi, blockNumber };
    const bank = { address: p.marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber };
    // The mark is read FIRST and alone, rather than inside the fan-out below, because
    // `getAccountHealth` walks every market the account is active in and reaches each
    // one through the REVERTING `getHealthSnapshot()`. For an account holding a position
    // in this market, a stale mark therefore reverts the health read too — and inside a
    // `Promise.all` that rejection would take the whole call down before the unpriceable
    // arm could be returned, making `{ priceable: false }` unreachable in exactly the
    // case it exists to describe. Both round-trips are pinned to the same block, so
    // splitting them costs a round-trip and no atomicity.
    const [ok, snap] = await client.readContract({ ...pool, functionName: "tryGetHealthSnapshot" });
    if (!ok)
        return null;
    const [capacity, state, health, leverage, leverageLimit, creditFloor, voucherCap, voucherAllowed, restricted, isolationAllowed, params, systemConfig,] = await Promise.all([
        client.readContract({ ...pool, functionName: "getReducingCapacity", args: [p.account] }),
        client.readContract({ ...bank, functionName: "getAccountState", args: [p.account] }),
        client.readContract({ ...bank, functionName: "getAccountHealth", args: [p.account] }),
        client.readContract({ ...bank, functionName: "getMaxLeverage", args: [p.account, p.pool] }),
        client.readContract({ ...bank, functionName: "getMaxLeverageLimit" }),
        client.readContract({ ...bank, functionName: "getCreditFloor", args: [p.account] }),
        client.readContract({ ...bank, functionName: "getVoucherLeverageCap" }),
        client.readContract({ ...bank, functionName: "isVoucherMarketAllowed", args: [p.pool] }),
        client.readContract({ ...pool, functionName: "isRestricted" }),
        client.readContract({ ...bank, functionName: "isolationAllowsMarket", args: [p.account, p.pool] }),
        // Both callers need this: the fee rates feed the auto-pull headroom, and the max-size
        // search also takes `maxPositionSize` off it.
        client.readContract({ ...pool, functionName: "getPerpPoolParameters" }),
        // Rides in this batch rather than a third round-trip, but is skipped entirely without
        // `autoPull` — its only job here is naming the collateral token below.
        p.autoPull === true ? client.readContract({ ...bank, functionName: "getSystemConfig" }) : undefined,
    ]);
    // A second round-trip only when auto-pull is being modelled: the collateral token is
    // not knowable until `getSystemConfig` returns, and a caller on an operator-routed path
    // would be paying for a pull that cannot happen.
    //
    // THE FUNDING PAYER RIDES IN THIS BATCH, and it has to be read rather than assumed.
    // `PerpPool._reserveAndPullMargin` spends the owner's own wallet first and takes the
    // residual from a linked MAIN, so for a linked child the owner's wallet is only half
    // the funding. Reading one wallet under-states the affordable size and reports a
    // balance/allowance shortfall the main would in fact have covered — both of which send
    // a trader to the wrong wallet.
    //
    // `quoteFundingPayer` answers this in one read and answers it the way the rail decides
    // it: over the RAW link graph (maturity gates ADL netting, never funding), zero when
    // the bank holds no registry, and zero for a wallet that IS a main.
    let wallet = null;
    let fundingPayer = null;
    let mainWalletCapacity = null;
    let mainFundingBlocked = false;
    if (systemConfig !== undefined) {
        const token = { address: systemConfig.collateralToken, abi: ReadsAbi.erc20ReadAbi, blockNumber };
        const [balance, allowance, payer] = await Promise.all([
            client.readContract({ ...token, functionName: "balanceOf", args: [p.account] }),
            // Approval to the BANK, not the pool: the pool reaches the wallet through
            // `MarginBank.depositFor`, so the bank is the `transferFrom` spender.
            client.readContract({ ...token, functionName: "allowance", args: [p.account, p.marginBank] }),
            client.readContract({ ...bank, functionName: "quoteFundingPayer", args: [p.account] }),
        ]);
        wallet = { balance, allowance };
        // A third round-trip, and only for an account that actually has a main. The payer is
        // not knowable until the read above returns, and the overwhelmingly common account is
        // unlinked — so an extra hop here costs nothing on the ordinary path.
        if (payer !== Writer.ZERO_ADDRESS) {
            fundingPayer = payer;
            const [capacity, outstanding, recordedPayer] = await Promise.all([
                // The bank's own sizing helper, deliberately: it returns `min(balance, allowance)`
                // for the payer, which is the quantity the pull is capped at. Reading the pair
                // separately would let this disagree with the contract.
                client.readContract({ ...bank, functionName: "quoteWalletCapacity", args: [payer] }),
                // ONE PAYER AT A TIME. `depositForFromMain` reverts `PriorFundingPayerOutstanding`
                // while a claim from a DIFFERENT payer stands, which is reachable in one ordinary
                // sequence: funded by main A, unlink, re-link to main B. `quoteFundingPayer` names
                // B, so without these two reads the quote counts B's capacity and hands back an
                // executable Max that reverts.
                client.readContract({ ...bank, functionName: "getMainFundedPrincipal", args: [p.account] }),
                client.readContract({ ...bank, functionName: "getMainFundingPayer", args: [p.account] }),
            ]);
            mainWalletCapacity = capacity;
            // Compared case-insensitively: both come from the same contract and are already
            // lower-cased by viem, but an address equality that silently depends on that is
            // the kind that breaks on a client change.
            mainFundingBlocked = outstanding > 0n && recordedPayer.toLowerCase() !== payer.toLowerCase();
        }
    }
    const [equity, imRequirement] = health;
    return {
        oneBase: snap.oneBase,
        markPrice: snap.markPrice,
        effectiveImfBps: snap.effectiveIMFBps,
        positionSize: capacity.positionSize,
        effectiveReducingCapacity: capacity.effectiveReducingCapacity,
        equity,
        imRequirement,
        unlockedCollateral: state.unlockedCollateralBalance,
        accountMaxLeverageX: leverage,
        protocolMaxLeverageX: leverageLimit,
        creditFloor,
        voucherLeverageCapX: voucherCap,
        voucherMarketAllowed: voucherAllowed,
        restricted,
        isolationAllowsMarket: isolationAllowed,
        takerFeeBpsTimes1k: params.takerFeeBpsTimes1k,
        makerFeeBpsTimes1k: params.makerFeeBpsTimes1k,
        wallet,
        fundingPayer,
        mainWalletCapacity,
        mainFundingBlocked,
        params,
    };
}
export async function previewPerpOrderMargin(p, client) {
    const blockNumber = await client.getBlockNumber();
    const st = await readPerpPlacementState(p, client, blockNumber);
    if (st === null)
        return { priceable: false, asOfBlock: blockNumber };
    // `fundingPayer` is reported, not an arithmetic input, so it is destructured out of
    // what reaches the pure quote rather than riding in as an excess property.
    const { params: _params, fundingPayer: _payer, ...quoteInputs } = st;
    return {
        priceable: true,
        asOfBlock: blockNumber,
        effectiveImfBps: st.effectiveImfBps,
        markPrice: st.markPrice,
        unlockedCollateral: st.unlockedCollateral,
        equity: st.equity,
        imRequirement: st.imRequirement,
        wallet: st.wallet,
        fundingPayer: st.fundingPayer,
        mainWalletCapacity: st.mainWalletCapacity,
        ...perpOrderMarginQuote({
            ...quoteInputs,
            wallet: st.wallet ?? undefined,
            mainWalletCapacity: st.mainWalletCapacity ?? undefined,
            isBid: p.isBid,
            quantity: p.quantity,
            price: p.price,
            builderFeeBpsTimes1k: p.builderFeeBpsTimes1k,
        }),
    };
}
/**
 *  The MarginBank's own initial-margin probe for an order that has NOT been locked
 *  yet — the closest single contract call to a pre-trade gate.
 *
 *  Chain tier. Charges the increasing leg's base initial margin against free equity,
 *  which is the pre-trade situation. It does NOT model the lock's adverse
 *  mark-to-entry reserve, so {@link previewPerpOrderMargin} is the accurate gate;
 *  this is the contract's own opinion, useful as a cross-check.
 *
 * **Details**
 *
 * - `p.additionalSize`: the INCREASING quantity, raw base units — not necessarily the whole order (see `getReducingCapacity`)
 */
export async function meetsPerpImForFill(p, client) {
    return client.readContract({
        address: p.marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "meetsIMForFill",
        args: [p.account, p.pool, p.additionalSize, p.price],
    });
}
/**
 *  The largest order this account can actually place — the inverse of
 *  {@link SomniaMarketsClient.previewPerpOrderMargin}, and what a **Max** button should call.
 *
 *  Chain tier, every read pinned to ONE block. The protocol offers no such view: the
 *  MarginBank answers "does this order fit" and nothing inverts it, so a client sizing a
 *  Max click has to reproduce the pool's rule — and if it reproduces it even slightly
 *  differently, the order reverts.
 *
 *  So this does not re-derive the rule. It **searches the forward one**: a binary search
 *  over {@link perpOrderMarginQuote}, the same pure function
 *  {@link SomniaMarketsClient.previewPerpOrderMargin} answers with. The two cannot disagree by construction,
 *  which is the whole point — a hand-rolled `equity / (price × imf)` estimate drops the
 *  adverse mark-to-entry term and is the usual reason a "max" order is rejected.
 *
 *  The search is exact rather than approximate because every gate is monotone in
 *  quantity: the lock and the leverage surcharge only grow, so once an order stops
 *  fitting no larger one fits. The position cap is monotone too, via the contract's own
 *  "did not grow past cap" escape.
 *
 *  **With `autoPull`, one gate stops being monotone, and this returns the contiguous
 *  answer on purpose.** Once the pool is topping the account up, the initial-margin gate
 *  reduces to `(equity − unlocked) + feeHeadroom ≥ imRequirement` — the surcharge cancels
 *  from both sides — and its only size-dependent term GROWS. An account whose existing
 *  positions sit below their own initial margin can therefore be rejected at a middling
 *  size and accepted at a far larger one, whose fee headroom over-pulls enough to cover
 *  the deficit. That is real chain behaviour (auto-pull funds an ORDER, not an ACCOUNT —
 *  `quoteOrderTopUp` says so), but it is not a Max button's answer: a slider has to be
 *  placeable at every value below its maximum. So the search returns the top of the
 *  contiguous region from zero and never offers a size out of the disconnected one.
 *
 *  **Three things it is not.** It does not model market-wide `maxOpenInterest`: that is
 *  enforced at FILL against a total every other trader moves, so no client-side number
 *  can be right about it for longer than a block. It does not consider whether the book
 *  has depth to fill the size — this is a placement limit, not a liquidity one. And it
 *  assumes the whole quantity at one `price`; a market order sweeping several levels
 *  fills at worse prices than the one quoted.
 *
 *  **Two placement gates outside the margin path are not modelled either, and both
 *  reject the whole order rather than shrinking it.** A market in close-only mode
 *  (`PerpPool.isRestricted()`) reverts `MarketRestricted` on anything with an increasing
 *  leg, and an isolated account placing outside its single market reverts
 *  `IsolatedMarketBlocked` — so on either, this returns a size every increasing order
 *  then bounces. Check `isRestricted()` alongside this read until they are folded in.
 *
 * **Details**
 *
 * - `p.price`: the limit price to size against; the adverse gap is measured from it
 * - `p.autoPull`: model the pool's wallet top-up (T70). Pass `true` when the transaction SENDER will be the order owner, which is the ordinary self-send path and the pool's entire gate for pulling; leave it off for `placeOrderFor`, an operator grant, a router, or the stop registry, where no pull happens and the in-bank balance is the real ceiling. Costs two extra reads and can raise the answer a long way: an account with an empty bank and a funded, approved wallet goes from `0n` to whatever the wallet funds.
 * - `p.builderFeeBpsTimes1k`: the builder fee the order will carry, if any. Enters only the auto-pull fee headroom, so it slightly raises the pull and slightly lowers the max; omitting it under-pulls for an order that does attach one.
 */
/**
 *  Which wallet a shortfall is actually on, for {@link PerpMaxOrderSize.limitedBy}.
 *
 *  Ordered by WHERE THE FIX IS, most-actionable first.
 *
 *  A linked child is decided on the main first, and that ordering is the whole reason
 *  this is a function rather than a ternary. Once a main is in play the child's own
 *  wallet is spent to the last unit at the binding size — `ownWalletPull` equals its
 *  whole capacity by construction — so the child's balance and allowance ALWAYS read as
 *  short too. Reporting either of them would send a trader to fund a sub-account that is
 *  already empty on purpose, when the wallet that has to grow is the main's.
 *
 *  With no main it keeps the original rule exactly: balance before allowance, because
 *  telling someone to approve more of a token they do not hold is the wrong fix.
 */
function bindingWallet(quote, wallet, mainWalletCapacity) {
    // A withheld leg first: neither wallet is the fix, the outstanding claim is.
    if (quote.mainFundingBlocked)
        return "mainFundingBlocked";
    if (mainWalletCapacity !== null)
        return "mainWallet";
    return quote.topUpRequired > (wallet?.balance ?? 0n) ? "walletBalance" : "walletAllowance";
}
export async function getMaxPerpOrderSize(p, client) {
    if (p.price <= 0n)
        throw new InvalidInputError("price must be > 0");
    const blockNumber = await client.getBlockNumber();
    // The book rides alongside rather than inside the shared reader: only this caller needs
    // the lot grid, and `previewPerpOrderMargin` should not pay a read per keystroke for it.
    // Same block, same round-trip, so nothing is lost by keeping it out of there.
    const [st, book] = await Promise.all([
        readPerpPlacementState(p, client, blockNumber),
        client.readContract({
            address: p.pool,
            abi: ReadsAbi.perpPoolReadAbi,
            functionName: "getOrderBookParameters",
            blockNumber,
        }),
    ]);
    if (st === null)
        return { priceable: false, asOfBlock: blockNumber };
    const { params, wallet, fundingPayer, mainWalletCapacity, ...quoteInputs } = st;
    const positionSize = st.positionSize;
    const absPosition = abs(positionSize);
    const base = {
        ...quoteInputs,
        wallet: wallet ?? undefined,
        mainWalletCapacity: mainWalletCapacity ?? undefined,
        isBid: p.isBid,
        price: p.price,
        builderFeeBpsTimes1k: p.builderFeeBpsTimes1k,
    };
    const quoteAt = (q) => perpOrderMarginQuote({ ...base, quantity: q });
    // `_enforceMaxPositionSize` (PerpPool.sol:1865). Its escape clause — a fill that does
    // not GROW an already-over-cap position is allowed — is what keeps this monotone on
    // the opposite side, where the position first shrinks toward zero before flipping.
    const withinPositionCap = (q) => {
        const newAbs = abs(positionSize + (p.isBid ? q : -q));
        return newAbs <= params.maxPositionSize || newAbs <= absPosition;
    };
    // Beyond `maxPositionSize + |position|` the cap fails on either side, so this bound is
    // a non-fitting upper end rather than a guess — with ONE exception, which errs the safe
    // way. An OPPOSITE-side order against a position ALREADY over the cap (ADL or a Stage-4
    // takeover assigns size without re-checking it, and an admin can lower it under a live
    // book) stays inside the "did not grow past cap" escape all the way out to `2 × |pos|`,
    // which is further than this bound. The search then converges on the bound instead of
    // that true maximum, so the answer is a legal size that UNDER-states what the chain
    // would take. Never the reverse, which is what would revert.
    const ceiling = params.maxPositionSize + absPosition + 1n;
    // The largest size that needs NO pull. `topUpRequired` is non-decreasing in quantity
    // (the requirement grows, the balance does not), so this predicate is monotone and the
    // search is exact. Without `autoPull` no pull ever happens, so this is the ceiling and
    // everything below collapses to the pre-T70 arithmetic.
    //
    // Why it is needed: the initial-margin gate is non-monotone across this point — see the
    // note on the function. It falls up to here and rises after, so the whole of `[0, q]`
    // clears the gate iff the gate clears at `min(q, qStar)`. One extra evaluation converts
    // a search over a non-monotone predicate into a search over a monotone one.
    const needsNoPull = (q) => quoteAt(q).topUpRequired === 0n;
    let qStar = ceiling;
    if (!needsNoPull(ceiling)) {
        let plo = 0n;
        let phi = ceiling;
        while (phi - plo > 1n) {
            const mid = plo + (phi - plo) / 2n;
            if (needsNoPull(mid))
                plo = mid;
            else
                phi = mid;
        }
        qStar = plo;
    }
    const meetsImAtBoundary = quoteAt(qStar).meetsInitialMargin;
    const fits = (q) => q <= 0n || (withinPositionCap(q) && (q <= qStar || meetsImAtBoundary) && quoteAt(q).sufficient);
    let lo = 0n;
    let hi = ceiling;
    while (hi - lo > 1n) {
        const mid = lo + (hi - lo) / 2n;
        if (fits(mid))
            lo = mid;
        else
            hi = mid;
    }
    // Align DOWN, which cannot un-fit an order that already fits, then re-quote at the
    // aligned size so the reported split and lock describe the size actually returned.
    const lotSize = book.lotSize > 0n ? book.lotSize : 1n;
    const maxQuantity = (lo / lotSize) * lotSize;
    const at = quoteAt(maxQuantity);
    // The binding gate, read off the next size a caller could actually place. Ordered
    // most-fundamental first: the two market-level blocks are not quantity problems at all,
    // and the wallet arms sit above `collateral` because with a pull in play the in-bank
    // balance is never what binds — the pool tops it up to the lock by construction.
    const next = maxQuantity + lotSize;
    const nextQuote = quoteAt(next);
    let limitedBy = "initialMargin";
    if (nextQuote.isolationBlocked)
        limitedBy = "isolated";
    else if (nextQuote.restrictedBlocked)
        limitedBy = "restricted";
    else if (nextQuote.voucherBlocked)
        limitedBy = "voucherBlocked";
    else if (!withinPositionCap(next))
        limitedBy = "maxPositionSize";
    else if (!nextQuote.walletCoversTopUp)
        limitedBy = bindingWallet(nextQuote, wallet, mainWalletCapacity);
    else if (!nextQuote.hasCollateralForLock)
        limitedBy = "collateral";
    return {
        priceable: true,
        asOfBlock: blockNumber,
        maxQuantity,
        unalignedMaxQuantity: lo,
        increasingQuantity: at.increasingQuantity,
        reducingQuantity: at.reducingQuantity,
        lockAmount: at.lockAmount,
        topUpRequired: at.topUpRequired,
        wallet,
        fundingPayer,
        mainWalletCapacity,
        ownWalletPull: at.ownWalletPull,
        mainWalletPull: at.mainWalletPull,
        mainFundingBlocked: at.mainFundingBlocked,
        placeable: maxQuantity >= book.minQuantity && maxQuantity > 0n,
        limitedBy,
        // The EFFECTIVE grid, not `book.lotSize` — reporting a raw `0n` here would disagree
        // with the alignment `maxQuantity` actually went through, and hand the caller a
        // divisor that throws.
        lotSize,
        minQuantity: book.minQuantity,
        maxPositionSize: params.maxPositionSize,
        positionSize,
        markPrice: st.markPrice,
        effectiveImfBps: st.effectiveImfBps,
    };
}
/**
 *  The MarginBank's placement-time initial-margin check, exposed verbatim.
 *
 *  Chain tier. **Not a pre-trade gate, despite the name.** It runs with the order's
 *  base margin treated as ALREADY RESERVED, because on the real path
 *  `lockCollateral` has run first. Called cold by a client the order's own margin is
 *  counted nowhere, so it answers true for almost any size unless the account has set
 *  a stricter leverage cap.
 *
 *  It is correct in its intended roles — mirroring the placement check, and the stop
 *  registry's reduce-only pre-check (`additionalSize == 0`). For "will my order be
 *  accepted", use {@link previewPerpOrderMargin}.
 */
export async function quoteMeetsPerpImForOrder(p, client) {
    return client.readContract({
        address: p.marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "quoteMeetsIMForOrder",
        args: [p.account, p.pool, p.additionalSize, p.price],
    });
}
/**
 *  The EXTRA initial margin an account's own leverage settings demand, in collateral
 *  units — summed across every market where it BOTH holds a position AND has set a
 *  cap stricter than the market's.
 *
 *  Chain tier, one read. This is the number that explains an
 *  `InsufficientMarginForOrder` a caller cannot otherwise account for, and it is a
 *  genuine gap in {@link quotePerpOrderTopUp} rather than a refinement of it.
 *
 *  The two measure different things on purpose. `quoteOrderTopUp` funds ONE order and
 *  measures the account's UNLOCKED balance; the admission gate measures whole-account
 *  EQUITY. So an order can be fully funded on its own market and still be refused
 *  because of an override on a DIFFERENT one. Folding those into the quote would not
 *  fix it — an account carrying unrealized losses would be refused anyway, and pulling
 *  for them would take wallet funds the order does not need. So the protocol exposes
 *  the whole-account figure separately, to be deposited deliberately.
 *
 *  Note the magnitude before dismissing it: the order lock reserves only the MARKET's
 *  margin factor, so an account with the leverage slider below market maximum needs
 *  materially more than the lock — a 5x setting on a 2%-IMF market needs 20% of
 *  notional, not 2%.
 *
 *  REVERTS if a market that is both positioned and overridden is not currently
 *  priceable. Use {@link tryGetPerpLeverageImSurcharge} in a sweep, where one stale
 *  feed should not take down the whole pass.
 */
export async function getPerpLeverageImSurcharge(marginBank, account, client) {
    return client.readContract({
        address: marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "getLeverageImSurcharge",
        args: [account],
    });
}
/**
 *  {@link getPerpLeverageImSurcharge} without the revert — `null` when it could not be
 *  computed.
 *
 *  Chain tier. Same shape and rationale as {@link tryGetPerpAccountEquity}: `null`
 *  means "not computable right now", NEVER "no surcharge". Substituting `0n` would
 *  under-state an account's margin requirement, which is the wrong direction to be
 *  wrong in.
 *
 *  Reaches for the revert rather than a `try*` contract function because the bank
 *  exposes none for this read — and note the revert is narrow: it needs a market that
 *  is positioned AND overridden AND unpriceable, so a stale feed on a market the
 *  account has not overridden answers fine.
 *
 *  **Gotchas**
 *
 *  Only a revert from the view ITSELF becomes `null`. A read that never reached the
 *  chain throws `RpcError`, exactly as {@link tryGetPerpAccountEquity} does — a dead
 *  RPC across every account is not the same answer as one unpriceable market, and a
 *  sweep that cannot tell them apart reports a healthy book it never read. An address
 *  that does not declare the view throws too: that is a wrong `marginBank`, not an
 *  account whose surcharge cannot be priced.
 */
export async function tryGetPerpLeverageImSurcharge(marginBank, account, client, ownedFailure = () => false) {
    try {
        return await getPerpLeverageImSurcharge(marginBank, account, client);
    }
    catch (e) {
        // This exact read's transport outcome cannot mean bank capability absence.
        if (ownedFailure(e))
            throw e;
        // An EMPTY revert is what a dispatcher raises for a selector it does not
        // declare, and it satisfies isRevert too — so exclude it explicitly. The
        // documented `null` is the bank's own rejection, which names an error.
        if (Revert.isRevert(e) && !Revert.isMissingContractView(e))
            return null;
        throw Revert.toSdkError(e, "readContract getLeverageImSurcharge", {
            address: marginBank,
            functionName: "getLeverageImSurcharge",
        });
    }
}
/**
 *  One account's own leverage cap for one perp pool, as the MarginBank stores it —
 *  the multiplier the account set for itself, before any market or protocol ceiling.
 *
 *  Chain tier, exactly one storage read. This is the cheap path to the number
 *  {@link getPerpLeverage} reports as `accountMaxLeverageX`: that verb derives
 *  account-wide REALIZED leverage, so it walks every market the account is active in
 *  and throws when any of them has a stale mark — the right guarantee for an equity
 *  measure and far too much to pay (and too fragile) for a per-position badge. The
 *  cap is plain storage that never needed a price, so this read survives the dead
 *  feed that makes the account walk throw.
 *
 *  **Gotchas**
 *
 *  `0` means "no account cap set", NOT zero leverage — the market ceiling
 *  (`marketMaxLeverageBps`, derivable from the IMF with no chain read) is what binds
 *  then. It is returned unchanged for the caller to compose, never normalised to the
 *  market ceiling here: which ceiling applies also depends on the credit-voucher
 *  confinement, and {@link PerpLeverage.accountMaxLeverageX}'s docblock walks that
 *  composition.
 *
 * **Details**
 *
 * - `ref`: the (bank, account, pool) triple
 * - `opts.blockNumber`: read at this block instead of head
 */
export async function getPerpMaxLeverage(ref, opts, client, ownedFailure = () => false) {
    try {
        return await client.readContract({
            address: ref.marginBank,
            abi: ReadsAbi.marginBankReadAbi,
            functionName: "getMaxLeverage",
            args: [ref.account, ref.pool],
            blockNumber: opts.blockNumber,
        });
    }
    catch (err) {
        if (ownedFailure(err))
            throw err;
        throw nameMarginBankRevert(err);
    }
}
/**
 *  The MarginBank's own auto-pull sizing, exposed verbatim — the contract's answer to
 *  "how much will placing this order take from my wallet".
 *
 *  Chain tier, one read. **For an order form, use
 *  {@link SomniaMarketsClient.previewPerpOrderMargin} with `autoPull` instead**: it
 *  derives `lockAmount`, `feeHeadroom` and `increasingQuantity` for you from the order,
 *  which is the awkward part — they come from `PerpPool._computeLockAmount` and
 *  `_feeHeadroom`, not from the bank, so quoting this directly means supplying the same
 *  three numbers the pool would. This exists as a cross-check on that port, in the same
 *  spirit as {@link SomniaMarketsClient.quoteMeetsPerpImForOrder}.
 *
 *  Reverts `InvalidPerpPool` for an unregistered market, and otherwise never reverts —
 *  it returns `0n` both when no pull is needed and in the three cases where a pull would
 *  be wrong rather than unnecessary (a purely reducing order, an account already in debt,
 *  a voucher-blocked increase). Read it beside the unlocked balance, not alone.
 *
 * **Details**
 *
 * - `p.lockAmount`: what the pool will lock, from `PerpPool._computeLockAmount`
 * - `p.feeHeadroom`: the worst-case fee reserve, from `PerpPool._feeHeadroom`
 * - `p.increasingQuantity`: the order's position-INCREASING base quantity
 */
export async function quotePerpOrderTopUp(p, client) {
    return client.readContract({
        address: p.marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "quoteOrderTopUp",
        args: [p.account, p.pool, p.lockAmount, p.feeHeadroom, p.increasingQuantity, p.price],
    });
}
/**
 *  Project the liquidation price a proposed order would leave behind, assuming it fills
 *  in full at its limit price.
 *
 *  Chain tier, four reads pinned to ONE block. This is the read an order form needs to
 *  answer "where does my liquidation move if I send this" — {@link getLiquidationPrice}
 *  can only describe the position that already exists.
 *
 *  **It ports `MarginBank.settleTrade`, all four cases**, rather than assuming the
 *  order simply adds size: OPEN (entry = fill price), INCREASE (floored VWAP entry),
 *  REDUCE / CLOSE (entry untouched, realized PnL booked at the fill price), and FLIP
 *  (old side closed in full, remainder opened at the fill price). A reduce and an
 *  increase move the liquidation price in opposite directions, so collapsing them would
 *  invert the answer for anyone closing.
 *
 *  Equity is projected by RE-MARKING: this market's unrealized PnL is removed at the
 *  old entry and added back at the new one, then realized PnL and the fee are applied.
 *  That is what makes an adverse entry cost equity the moment it fills.
 *
 *  **The collateral lock is deliberately absent from that sum, and nets to zero.**
 *  Placement moves collateral out of the unlocked balance equity is seeded from (so
 *  equity dips by `lockAmount` — see `PerpOrderMarginPreview.lockAmount`), and a FULL
 *  fill releases all of it: `PerpPool._releaseLockOnFill` unlocks
 *  `locked × increasingConsumed / increasingRemaining`, which is the whole lock once the
 *  increasing leg is fully consumed. Fees are charged on top rather than out of the
 *  lock, which is why they appear here separately.
 *
 *  **The whole quantity is applied.** Unlike {@link SomniaMarketsClient.previewPerpOrderMargin}, this does
 *  not split the order against `getReducingCapacity` — that split governs how much
 *  collateral the pool LOCKS, whereas `settleTrade` applies the full signed delta to the
 *  position. The two reads answer different questions and correctly disagree here.
 *
 *  **Does not model:** builder fees (per-order, set at placement, and not knowable from
 *  the order alone), the fill's own effect on the OI-scaled IMF (which moves initial
 *  margin, not the maintenance threshold this solves against), partial fills, price
 *  improvement against a resting book, tick/lot quantization, or any of the caps that
 *  reject an order independently of margin. Funding cancels out rather than being
 *  ignored: `settleTrade` settles it into the balance, and `equity` had already netted
 *  the same projected amount, so it nets to zero here (modulo the ceil-rounded wei).
 *
 *  **Whether the order is ACCEPTED is a different question** —
 *  {@link SomniaMarketsClient.previewPerpOrderMargin} owns that, and this read deliberately does not
 *  duplicate its gates. A projection can be perfectly well-formed for an order the pool
 *  would reject.
 *
 * **Details**
 *
 * - `p.pool`: the perp pool
 * - `p.marginBank`: the pool's MarginBank
 * - `p.account`: who would place the order
 * - `p.isBid`: true to buy/long, false to sell/short
 * - `p.quantity`: order size, raw base units; must be > 0
 * - `p.price`: limit price, raw quote units per whole base; must be > 0
 * - `p.asMaker`: charge the maker rate (possibly a rebate) instead of the taker rate. Defaults to taker, the conservative assumption: an order's fee side is not knowable until it fills, and the taker rate is never the cheaper one.
 */
export async function previewPerpLiquidationPrice(p, client) {
    if (p.quantity <= 0n)
        throw new InvalidInputError("quantity must be > 0");
    if (p.price <= 0n)
        throw new InvalidInputError("price must be > 0");
    const blockNumber = await client.getBlockNumber();
    const pool = { address: p.pool, abi: ReadsAbi.perpPoolReadAbi, blockNumber };
    const bank = { address: p.marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber };
    // The mark is read FIRST and alone, for the same reason `previewPerpOrderMargin`
    // does it: `getAccountHealth` reaches every market the account is active in through
    // the REVERTING `getHealthSnapshot`, so for an account already holding a position
    // here a stale mark rejects the health read too — and inside a `Promise.all` that
    // rejection would take the call down before the unpriceable arm could be returned,
    // making `{ priceable: false }` unreachable in exactly the case it describes.
    const [ok, snap] = await client.readContract({ ...pool, functionName: "tryGetHealthSnapshot" });
    if (!ok)
        return { priceable: false, asOfBlock: blockNumber };
    const [position, health, params] = await Promise.all([
        client.readContract({ ...bank, functionName: "getPosition", args: [p.account, p.pool] }),
        client.readContract({ ...bank, functionName: "getAccountHealth", args: [p.account] }),
        client.readContract({ ...pool, functionName: "getPerpPoolParameters" }),
    ]);
    const { oneBase, markPrice, maintenanceMarginBps } = snap;
    const [equity, , mmReq] = health;
    const size = position.size;
    const entry = position.avgEntryPrice;
    const absSize = abs(size);
    // ---- post-fill position: MarginBank.settleTrade's four cases, in its order ----
    const delta = p.isBid ? p.quantity : -p.quantity;
    let projectedSize;
    let projectedEntryPrice;
    let realizedPnl = 0n;
    if (size === 0n) {
        // Case 1 — open.
        projectedSize = delta;
        projectedEntryPrice = p.price;
    }
    else if (size > 0n === delta > 0n) {
        // Case 2 — increase. `PerpMath.vwap` floors, so plain bigint division matches
        // (both operands are non-negative here).
        projectedSize = size + delta;
        projectedEntryPrice = (absSize * entry + p.quantity * p.price) / (absSize + p.quantity);
    }
    else {
        // Cases 3 + 4 — reduce/close, or flip. Both realize PnL on the portion closed;
        // only a flip re-opens at the fill price.
        const sign = size > 0n ? 1n : -1n;
        const closed = p.quantity <= absSize ? p.quantity : absSize;
        realizedPnl = divFloor((p.price - entry) * sign * closed, oneBase);
        projectedSize = size + delta;
        if (p.quantity > absSize) {
            projectedEntryPrice = p.price; // Case 4 — the remainder opens fresh.
        }
        else {
            // Case 3 — a partial close leaves the entry alone; a full close clears it.
            projectedEntryPrice = projectedSize === 0n ? 0n : entry;
        }
    }
    // ---- fee (`PerpPool._chargeFees` on fill notional, floored) ----
    const fillNotional = (p.quantity * p.price) / oneBase;
    const feeBpsTimes1k = p.asMaker === true ? params.makerFeeBpsTimes1k : params.takerFeeBpsTimes1k;
    // A negative maker rate is a REBATE: the contract computes it off the absolute rate
    // and pays it out, so it lands here as a negative fee, i.e. a credit to equity.
    const fee = feeBpsTimes1k >= 0n
        ? (fillNotional * feeBpsTimes1k) / BPS_TIMES_1K_DENOMINATOR
        : -((fillNotional * -feeBpsTimes1k) / BPS_TIMES_1K_DENOMINATOR);
    // ---- post-fill equity, by re-marking this market's leg ----
    // `PerpMath.unrealizedPnl` truncates toward ZERO (plain `int256` division), unlike
    // the floored realization above — bare `/` is correct here and `divFloor` is not.
    const uPnlBefore = ((markPrice - entry) * size) / oneBase;
    const uPnlAfter = ((markPrice - projectedEntryPrice) * projectedSize) / oneBase;
    const projectedEquity = equity - uPnlBefore + uPnlAfter + realizedPnl - fee;
    // ---- post-fill maintenance requirement ----
    // Swap THIS market's contribution for the one the new size implies, leaving every
    // other market's exactly as the bank aggregated it. Ceil-rounded per market, matching
    // `_marketHealthFromSnapshot`, so the swap is wei-exact rather than approximate.
    const notionalBefore = (absSize * markPrice) / oneBase;
    const notionalAfter = (abs(projectedSize) * markPrice) / oneBase;
    const mmBefore = divCeil(notionalBefore * maintenanceMarginBps, BPS_DENOMINATOR);
    const mmAfter = divCeil(notionalAfter * maintenanceMarginBps, BPS_DENOMINATOR);
    const projectedMmReq = mmReq - mmBefore + mmAfter;
    return {
        priceable: true,
        asOfBlock: blockNumber,
        markPrice,
        currentSize: size,
        currentLiquidationPrice: perpLiquidationPrice({
            equity,
            mmReq,
            size,
            markPrice,
            maintenanceMarginBps,
            oneBase,
        }),
        projectedSize,
        projectedEntryPrice,
        realizedPnl,
        fee,
        projectedEquity,
        projectedMmReq,
        projectedLiquidationPrice: perpLiquidationPrice({
            equity: projectedEquity,
            mmReq: projectedMmReq,
            size: projectedSize,
            markPrice,
            maintenanceMarginBps,
            oneBase,
        }),
        projectedPositionLeverageBps: projectedEquity > 0n ? (notionalAfter * BPS_DENOMINATOR) / projectedEquity : null,
    };
}
/**
 *  What closing a position — all of it or part — would actually realise.
 *
 *  Chain tier, four reads pinned to ONE block. Nothing previews this today, so a close
 *  modal has to derive it, and the two things it gets wrong are both silent: the lot
 *  alignment that shrinks the close, and the funding that settles on the **whole**
 *  position rather than the closed share.
 *
 *  Deliberately out of scope, and each for a reason rather than an omission. It does not
 *  judge whether the close would be ACCEPTED. It quotes the whole quantity at one
 *  `price`, so a market close sweeping several levels realises less. It does not model a
 *  FLIP: a quantity beyond the position is clamped to it, because a close modal closes.
 *  And it prices the pool's own maker/taker rate only — a **builder fee** attached at
 *  placement is charged on the same fill notional (`_chargeBuilderFees`) and lands on
 *  top of the `fee` reported here.
 *
 *  **"Not accepted" is the interesting half, because a close is not always purely
 *  reducing.** `PerpPool._computeLockAmount` splits the order against
 *  `_reducingCapacity` — `|size|` minus the quantity ALREADY resting on the reducing
 *  side — so closing out while a reduce order is down leaves an increasing remainder
 *  that locks collateral and must clear `meetsIMForOrder`. On such an account a
 *  `placeable: true` close can still revert `InsufficientMarginForOrder`. Read
 *  {@link SomniaMarketsClient.previewPerpOrderMargin} beside this one whenever the
 *  account has resting orders; with none down, `_reducingCapacity` is the full position
 *  and the close does trip neither gate.
 *
 * **Details**
 *
 * - `p.quantity`: how much to close; omit or pass `0n` for the whole position
 * - `p.price`: the fill price; defaults to the current mark, which is the right estimate for a market close
 * - `p.asMaker`: quote the maker fee (or rebate) instead of the taker fee
 */
export async function previewPerpClosePnl(p, client) {
    if (p.quantity != null && p.quantity < 0n)
        throw new InvalidInputError("quantity must be >= 0");
    if (p.price != null && p.price <= 0n)
        throw new InvalidInputError("price must be > 0");
    const blockNumber = await client.getBlockNumber();
    const pool = { address: p.pool, abi: ReadsAbi.perpPoolReadAbi, blockNumber };
    const [position, snapshot, book, params] = await Promise.all([
        client.readContract({
            address: p.marginBank,
            abi: ReadsAbi.marginBankReadAbi,
            functionName: "getPosition",
            args: [p.account, p.pool],
            blockNumber,
        }),
        client.readContract({ ...pool, functionName: "tryGetHealthSnapshot" }),
        client.readContract({ ...pool, functionName: "getOrderBookParameters" }),
        client.readContract({ ...pool, functionName: "getPerpPoolParameters" }),
    ]);
    const [ok, snap] = snapshot;
    if (!ok)
        return { priceable: false, asOfBlock: blockNumber };
    const { oneBase, markPrice } = snap;
    const fillPrice = p.price ?? markPrice;
    const size = position.size;
    const absSize = abs(size);
    // Clamp then align, in that order — the contract's own sequence in the stop registry's
    // reduce-only resolver. Aligning first could leave a residue above the position.
    const requested = p.quantity == null || p.quantity === 0n ? absSize : p.quantity;
    const clamped = requested > absSize ? absSize : requested;
    const lotSize = book.lotSize > 0n ? book.lotSize : 1n;
    const closedQuantity = (clamped / lotSize) * lotSize;
    // `_realizedPnlForClose`: floors toward −∞ so a gain is credited <= true and a loss
    // debited >= true. NOT the truncation `PerpMath.unrealizedPnl` uses — see
    // `perpPositionAnalytics`, where the same two roundings sit side by side.
    const sizeSign = size > 0n ? 1n : -1n;
    const realizedPnl = closedQuantity === 0n || size === 0n
        ? 0n
        : divFloor((fillPrice - position.avgEntryPrice) * sizeSign * closedQuantity, oneBase);
    // On the WHOLE position. `settleTrade` settles funding before mutating anything, so
    // the closed share is irrelevant to this term.
    const fundingSettled = size === 0n
        ? 0n
        : divCeilSigned(size * (snap.projectedCumulativeFunding - position.entryFundingIndex), FUNDING_PRECISION * oneBase);
    const fillNotional = (closedQuantity * fillPrice) / oneBase;
    const feeBpsTimes1k = p.asMaker === true ? params.makerFeeBpsTimes1k : params.takerFeeBpsTimes1k;
    // A negative maker rate is a REBATE: the contract computes it off the absolute rate and
    // pays it out, so it lands here as a negative fee — a credit.
    const fee = feeBpsTimes1k >= 0n
        ? (fillNotional * feeBpsTimes1k) / BPS_TIMES_1K_DENOMINATOR
        : -((fillNotional * -feeBpsTimes1k) / BPS_TIMES_1K_DENOMINATOR);
    const remainingSize = size === 0n ? 0n : size - sizeSign * closedQuantity;
    return {
        priceable: true,
        asOfBlock: blockNumber,
        requestedQuantity: requested,
        closedQuantity,
        remainingSize,
        fullClose: size !== 0n && remainingSize === 0n,
        realizedPnl,
        fundingSettled,
        fee,
        netProceeds: realizedPnl - fundingSettled - fee,
        placeable: closedQuantity >= book.minQuantity && closedQuantity > 0n,
        fillPrice,
        markPrice,
        avgEntryPrice: position.avgEntryPrice,
        // The EFFECTIVE grid — see `getMaxPerpOrderSize`, same reason.
        lotSize,
        minQuantity: book.minQuantity,
    };
}
