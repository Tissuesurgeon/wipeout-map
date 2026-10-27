import { type Address, type PublicClient } from "viem";
import * as PerpState from "./state.js";
import * as Writer from "../writer.js";
import type { Writer as WriterCtx } from "../writer.js";
import type { DepositMarginParams, SetPerpLeverageParams, TxResult, WithdrawMarginParams } from "../trade.js";
/**
 *  Cross-margin health status (mirror of the on-chain `MarginStatus` enum):
 *  `"Healthy"` (equity ≥ IM) · `"MarginCall"` (IM > equity ≥ MM) ·
 *  `"PartialLiquidation"` (MM > equity ≥ CM) · `"CloseOut"` (equity < CM).
 *
 * @category perpetual markets
 */
export type MarginStatus = "Healthy" | "MarginCall" | "PartialLiquidation" | "CloseOut";
/**
 * Ordered so index == on-chain enum value (0 Healthy … 3 CloseOut).
 *
 * @category perpetual markets
 */
export declare const MARGIN_STATUS: readonly MarginStatus[];
/**
 *  An account's cross-margin state in the MarginBank (collateral is the bank's
 *  single collateral token, e.g. USDso — raw units).
 *
 * @category perpetual markets
 */
export interface MarginAccount {
    /** Free collateral after locks (signed — settlement can drive it negative). */
    unlockedCollateralBalance: bigint;
    /** Collateral reserved for pending orders. */
    lockedCollateral: bigint;
    /** Perp pools where the account holds an open position. */
    activePerpPools: Address[];
    /** Equity = collateral + unrealized PnL − pending funding (signed). */
    equity: bigint;
    /** Collateral withdrawable right now (respects margin requirements). */
    withdrawable: bigint;
    /** Sum of notional × initialMarginBps / 10000 across all markets (raw). */
    imReq: bigint;
    /** Sum of notional × maintenanceMarginBps / 10000 across all markets (raw). */
    mmReq: bigint;
    /** Sum of notional × closeOutMarginBps / 10000 across all markets (raw). */
    cmReq: bigint;
    /** Health bucket derived from equity vs the requirements. */
    marginStatus: MarginStatus;
    /** The block every read was pinned to. */
    asOfBlock: bigint;
}
/**
 *  Read an account's cross-margin state from the MarginBank in one fan-out —
 *  including the account health (`imReq`/`mmReq`/`cmReq`) and `marginStatus`.
 *
 *  The SDK samples the chain head once and pins every component read to that
 *  block. All returned fields therefore describe one chain state, even if the
 *  head advances while the fan-out is in flight.
 */
export declare function getMarginAccount(marginBank: Address, account: Address, client: PublicClient): Promise<MarginAccount>;
/**
 *  The two MarginBank figures an equity snapshot needs — `equity` from
 *  `getAccountEquity` and `lockedCollateral` from `getAccountState` — pinned to
 *  one block. The subset of {@link getMarginAccount} that `getAccountEquity`
 *  reads, without the `getWithdrawableCollateral` / `getMarginStatus` calls it
 *  would discard: reading many accounts at once (a competition scoreboard)
 *  should cost two `eth_call`s per account, not four, and should not fail on a
 *  read it never uses. `at` pins the reads to a given block instead of the head.
 */
export declare function getMarginEquity(marginBank: Address, account: Address, client: PublicClient, at?: bigint): Promise<Pick<MarginAccount, "equity" | "lockedCollateral" | "asOfBlock">>;
/**
 *  {@link getMarginEquity} for many accounts at one block, in input order.
 *  `equity` is `null` for an account that holds a market with no fresh mark
 *  price, so one such account does not fail the batch. Any other failed read
 *  throws. Accounts are read {@link MARGIN_EQUITY_GROUP} at a time, so a large
 *  cohort does not open every request at once.
 */
export declare function listMarginEquities(marginBank: Address, accounts: readonly Address[], client: PublicClient, at?: bigint): Promise<Array<{
    equity: bigint | null;
    lockedCollateral: bigint;
    asOfBlock: bigint;
}>>;
/**
 *  An account's cross-margin health, standalone (equity vs the IM/MM/CM
 *  requirements + the derived status). A lighter read than {@link SomniaMarketsClient.getMarginAccount}
 *  when only health matters.
 *
 * @category perpetual markets
 */
export interface AccountHealth {
    /** Account equity = unlockedCollateralBalance + Σ(uPnl) − Σ(fundingOwed) (signed). */
    equity: bigint;
    /**
     *  Initial-margin requirement: Σ notional × initialMarginBps / 10000 across all
     *  markets (raw collateral units).
     */
    imReq: bigint;
    /** Maintenance-margin requirement (same basis, maintenanceMarginBps; raw). */
    mmReq: bigint;
    /** Close-out-margin requirement (same basis, closeOutMarginBps; raw). */
    cmReq: bigint;
    /** Health bucket derived from equity vs the requirements (see {@link MarginStatus}). */
    marginStatus: MarginStatus;
}
/**
 *  Read an account's cross-margin health from the MarginBank
 *  (`getAccountHealth` + `getMarginStatus`) in one fan-out.
 *
 *  The SDK samples the chain head once and pins both reads to that block. The
 *  returned requirements and derived status therefore describe one chain state.
 */
export declare function getAccountHealth(marginBank: Address, account: Address, client: PublicClient): Promise<AccountHealth>;
/**
 *  A perp market's RISK CONFIG — the static parameters frozen on the pool, read
 *  straight from `getPerpPoolParameters`. Never reverts, so this is the dependable
 *  source for maintenance margin even when the mark feed is down.
 *
 *  All bps values are standard basis points (100 = 1%) EXCEPT the two fee fields,
 *  which are bps × 1000 (the pool's own unit — 1500 = 1.5 bps = 0.015%).
 *
 * @category perpetual markets
 */
export interface PerpRiskParams {
    /**
     *  The initial-margin curve's FLOOR, bps — not necessarily what an order is
     *  charged. When dynamic IMF is enabled the pool scales this up with open
     *  interest; read `effectiveImfBps` off {@link PerpHealthSnapshot} for the rate
     *  actually in force. Equal to the effective IMF only when dynamic IMF is off.
     */
    initialMarginBps: bigint;
    /**
     *  Maintenance-margin threshold, bps — the level below which a position is
     *  liquidatable. Unlike initial margin this does **not** scale with open
     *  interest, deliberately: the liquidation threshold must not move under a
     *  position because the market's OI grew.
     */
    maintenanceMarginBps: bigint;
    /** Close-out / takeover threshold, bps. Strictly below maintenance. */
    closeOutMarginBps: bigint;
    /** Market-wide open-interest cap, raw base units. */
    maxOpenInterest: bigint;
    /** Per-position size cap, raw base units. */
    maxPositionSize: bigint;
    /** Taker fee, bps × 1000. */
    takerFeeBpsTimes1k: bigint;
    /** Maker fee, bps × 1000 — SIGNED, because a negative value is a maker rebate. */
    makerFeeBpsTimes1k: bigint;
    /** Share of collected fees routed to the Insurance Fund, bps. */
    insuranceFundShareBps: bigint;
}
/**
 *  Every per-market input a margin or health calculation needs, sampled together.
 *
 *  A discriminated union rather than a nullable struct because the contract's
 *  non-reverting variant returns an ALL-ZERO snapshot when the market is not
 *  priceable — and a `maintenanceMarginBps` of 0 silently reads as "no maintenance
 *  requirement", which is far more dangerous than a missing price. Narrow on
 *  `priceable` and the zeros are unreachable.
 *
 * @category perpetual markets
 */
export type PerpHealthSnapshot = {
    /** The pool's mark feed is fresh; every field below is real. */
    priceable: true;
    /** 10^decimals of the synthetic base asset — the divisor for notional math. */
    oneBase: bigint;
    /** Fresh mark price, raw quote units per whole base. */
    markPrice: bigint;
    /** Cumulative funding per unit INCLUDING unsettled intervals (1e18-scaled, signed). */
    projectedCumulativeFunding: bigint;
    /**
     *  The initial-margin factor actually in force, bps — OI-scaled when dynamic
     *  IMF is enabled, otherwise equal to {@link PerpRiskParams.initialMarginBps}.
     *  This, not the static base, is what the pool charges a new order.
     */
    effectiveImfBps: bigint;
    /** Maintenance-margin threshold, bps (does not scale with OI). */
    maintenanceMarginBps: bigint;
    /** Close-out / takeover threshold, bps. */
    closeOutMarginBps: bigint;
} | {
    /**
     *  The pool's mark feed is stale or zero, so the contract declined to produce
     *  a snapshot. Skip this market — do NOT substitute zeros or a previous
     *  reading.
     */
    priceable: false;
};
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
export declare function getPerpRiskParams(pool: Address, client: PublicClient): Promise<PerpRiskParams>;
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
export declare function getPerpHealthSnapshot(pool: Address, client: PublicClient): Promise<PerpHealthSnapshot>;
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
export declare function getEffectiveImfBps(pool: Address, client: PublicClient): Promise<bigint>;
/**
 *  Everything the maintenance-margin solve needs — and nothing that has to come from
 *  a particular block, so `perpLiquidationPrice` stays pure.
 *
 * @category perpetual markets
 */
export interface PerpLiquidationPriceInputs {
    /** Account equity across every market (signed, raw collateral units). */
    equity: bigint;
    /** Aggregate maintenance requirement across every market (raw collateral units). */
    mmReq: bigint;
    /** SIGNED position size in THIS market, raw base units. Zero yields `null`. */
    size: bigint;
    /** This market's mark price, raw quote units per whole base. */
    markPrice: bigint;
    /** This market's maintenance-margin threshold, bps. */
    maintenanceMarginBps: bigint;
    /** 10^decimals of this market's synthetic base — the divisor for notional math. */
    oneBase: bigint;
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
export declare function perpLiquidationPrice(p: PerpLiquidationPriceInputs): bigint | null;
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
export declare function getLiquidationPrice(ref: PerpState.PerpPositionRef, client: PublicClient): Promise<bigint | null>;
/**
 *  How levered an account is — measured at one position, and across the whole
 *  cross-margin account.
 *
 *  Every ratio is **bps of 1x**: `10_000` is 1.00x, `25_000` is 2.5x, `200_000` is
 *  20x. That is the protocol's own unit for every margin figure, so these compose with
 *  {@link PerpRiskParams} without a rescale.
 *
 * @category perpetual markets
 */
export interface PerpLeverage {
    /** The block every read was pinned to. */
    asOfBlock: bigint;
    /** SIGNED position size in this market, raw base units (positive = long, 0 = flat). */
    size: bigint;
    /** Mark price the notionals were measured at, raw quote units per whole base. */
    markPrice: bigint;
    /** This position's notional: `|size| × mark / oneBase`, raw collateral units. */
    positionNotional: bigint;
    /**
     *  Σ notional across EVERY market the account holds a position in, this one
     *  included, raw collateral units.
     *
     *  Costs two extra reads per OTHER active market — the MarginBank exposes no
     *  aggregate notional view, and `imReq` cannot be inverted back into notional
     *  because each market applies its own OI-scaled IMF. So this grows with the
     *  account's footprint; a single-market account pays nothing extra.
     */
    accountNotional: bigint;
    /** Account equity = collateral + Σ unrealized PnL − Σ pending funding (signed). */
    equity: bigint;
    /**
     *  This position's notional over account equity, bps — "this position is Nx my
     *  equity".
     *
     *  `null` when equity is ≤ 0, where the ratio has no meaning: an account with no
     *  equity left is not running infinite leverage, it is insolvent, and rendering an
     *  enormous number would say the wrong thing. Read {@link MarginStatus} for that
     *  state instead.
     */
    positionLeverageBps: bigint | null;
    /**
     *  Total notional over account equity, bps.
     *
     *  **The figure that actually governs risk here.** Margin is cross, so every
     *  position draws on the same collateral: a second position at the same notional
     *  doubles the account's leverage without changing the first one's
     *  {@link positionLeverageBps}. `null` on non-positive equity, as above.
     */
    accountLeverageBps: bigint | null;
    /**
     *  The most leverage THIS MARKET will open a position at, bps —
     *  `10000² / effectiveImfBps`, using the OI-scaled IMF actually in force rather than
     *  the static `initialMarginBps`.
     *
     *  A ceiling on new size, not a measurement of the position: it does not move when
     *  the position or the equity does. It DOES move when market-wide open interest
     *  does, which is why it is read per call rather than derived from
     *  {@link PerpRiskParams.initialMarginBps}.
     */
    marketMaxLeverageBps: bigint;
    /**
     *  The account's OWN per-market cap as an integer multiplier, `0` when unset — what
     *  `trader.setPerpLeverage` writes, read back.
     *
     *  A cap STRICTER than the market's effective IMF adds margin on top of the base
     *  requirement; that surcharge is quoted by
     *  `PerpOrderMarginPreview.leverageSurcharge`. Being a setting rather than a
     *  measurement, it can sit far above the position's actual
     *  {@link positionLeverageBps}.
     */
    accountMaxLeverageX: number;
    /** Protocol-wide ceiling that clamps the above, integer multiplier. */
    protocolMaxLeverageX: number;
    /**
     *  The account's non-withdrawable credit-voucher floor, raw collateral units. `0n` for
     *  an ordinary account, and the switch that arms the two fields below.
     *
     *  Self-clearing: the confinement lifts on its own once the floor reaches zero.
     */
    creditFloor: bigint;
    /**
     *  The protocol's voucher leverage cap, integer multiplier — what a voucher-holding
     *  account is confined to when it INCREASES a position. `0` means unset, which is a
     *  hard block rather than "no cap" (see {@link voucherMarketAllowed}).
     *
     *  Reported, not applied to {@link protocolMaxLeverageX}, because it does not bound the
     *  position this call measures. `MarginBank._meetsIM` gates the whole voucher branch on
     *  `additionalSize > 0`, so it never touches a reduce or a close — a voucher holder can
     *  always close out, or place a stop, even on a market since removed from the
     *  allowlist. Folding it into the protocol ceiling would report a constraint on a
     *  reduce-only action that the chain does not apply.
     *
     *  What it bounds is a NEW increase, and the composition is not a plain minimum:
     *
     *  ```
     *  // voucher inactive (creditFloor == 0n)
     *  //   accountMaxLeverageX == 0 -> no leverage-derived requirement at all;
     *  //                               marketMaxLeverageBps is what binds
     *  //   otherwise                -> min(accountMaxLeverageX, protocolMaxLeverageX)
     *  //
     *  // voucher active and allowed
     *  //   the cap REPLACES an unset or looser account setting, then the
     *  //   protocol ceiling clamps the result:
     *  const confined =
     *    accountMaxLeverageX !== 0 && accountMaxLeverageX <= voucherLeverageCapX
     *      ? accountMaxLeverageX          // a STRICTER user setting still wins
     *      : voucherLeverageCapX;
     *  const bindingX = Math.min(confined, protocolMaxLeverageX);
     *  ```
     *
     *  The load-bearing half is the first branch: a voucher turns an *unset* account cap
     *  into an enforced one. On an ordinary account `accountMaxLeverageX === 0` means "no
     *  cap set"; on a voucher account increasing a position it means "confined to
     *  `voucherLeverageCapX`".
     *
     *  For whether a specific order passes, use
     *  {@link SomniaMarketsClient.previewPerpOrderMargin} — it applies all of this and
     *  reports `voucherBlocked` alongside the margin numbers.
     */
    voucherLeverageCapX: number;
    /**
     *  Whether THIS market is on the voucher allowlist.
     *
     *  Only consequential while {@link creditFloor} is positive, and then it is a hard
     *  placement revert rather than an arithmetic clamp: an increase on a non-allowlisted
     *  market reverts `VoucherMarketNotAllowed`, and an unset
     *  {@link voucherLeverageCapX} reverts `VoucherLeverageCapNotSet` — a deliberate fail
     *  safe, so an unconfigured cap never silently grants full leverage. Neither outcome is
     *  expressible as a leverage number, which is the other reason these are reported
     *  rather than folded in.
     */
    voucherMarketAllowed: boolean;
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
export declare function getPerpLeverage(ref: PerpState.PerpPositionRef, client: PublicClient): Promise<PerpLeverage>;
/**
 *  Everything the per-position arithmetic needs, and nothing that has to come from a
 *  particular block — so `perpPositionAnalytics` stays pure and testable.
 *
 *  The last six all arrive together from one `tryGetHealthSnapshot`; the first three
 *  are the stored `Position`.
 *
 * @category perpetual markets
 */
export interface PerpPositionAnalyticsInputs {
    /** SIGNED position size, raw base units (positive = long, negative = short). */
    size: bigint;
    /** Volume-weighted average entry price, raw quote units per whole base. */
    avgEntryPrice: bigint;
    /** Cumulative funding index stamped at open / last settlement (1e18-scaled, signed). */
    entryFundingIndex: bigint;
    /** Current mark price, raw quote units per whole base. */
    markPrice: bigint;
    /** Cumulative funding per unit INCLUDING unsettled intervals (1e18-scaled, signed). */
    projectedCumulativeFunding: bigint;
    /** 10^decimals of the synthetic base asset. */
    oneBase: bigint;
    /** The OI-scaled IMF actually in force, bps. */
    effectiveImfBps: bigint;
    /** Maintenance threshold, bps. */
    maintenanceMarginBps: bigint;
    /** Close-out / takeover threshold, bps. */
    closeOutMarginBps: bigint;
}
/**
 * One position, marked to the current mark and funding index.
 *
 * @category perpetual markets
 */
export interface PerpPositionMetrics {
    /** SIGNED size, raw base units — echoed so a result stands alone. */
    size: bigint;
    /** `|size| × mark / oneBase`, raw collateral units. Zero when flat. */
    notional: bigint;
    /**
     *  Mark-to-market PnL on price alone, signed: `(mark − entry) × size / oneBase`.
     *
     *  **Excludes funding**, deliberately — see {@link accruedFunding}. Truncates toward
     *  zero, matching `PerpMath.unrealizedPnl`'s plain `int256` division, which is NOT
     *  the rounding the funding leg uses.
     */
    unrealizedPnl: bigint;
    /**
     *  Funding **owed** since the position's entry index, signed and raw collateral
     *  units. **Positive means the account pays**; negative means it receives.
     *
     *  Sign is the contract's, not a display convention, and it is the opposite of
     *  {@link unrealizedPnl}'s: this is a payment, so it is SUBTRACTED to reach
     *  {@link equityContribution}. Rendering it beside PnL without flipping it shows a
     *  cost as a gain.
     *
     *  Includes unsettled intervals, because it is computed against the pool's
     *  *projected* cumulative index rather than its last settled one — settlement is
     *  permissionless and lazy, so the settled index can lag by hours, and a position
     *  measured against it under-reports what the account already owes.
     *
     *  Ceils toward +∞ (`divCeilInt`), so a payer pays at least what is owed and a
     *  receiver receives at most it.
     */
    accruedFunding: bigint;
    /**
     *  This position's contribution to account equity: `unrealizedPnl − accruedFunding`.
     *
     *  The figure the MarginBank actually sums. Across every active market these add to
     *  `equity − collateral`, exactly — which is the invariant that makes this a port of
     *  the contract rather than a re-derivation of it.
     */
    equityContribution: bigint;
    /**
     *  This position's share of the account's initial-margin requirement:
     *  `ceil(notional × effectiveImfBps / 10000)`.
     *
     *  **This is "position margin" in the only sense the protocol defines one.** Margin
     *  is cross, so no collateral is segregated per position and there is nothing to
     *  read; what a position *does* have is the requirement it adds to the account.
     *
     *  Note it uses the market's IMF only. An account leverage setting stricter than the
     *  market's IMF raises the bar for a NEW order (`MarginBank._meetsIM`) but does not
     *  appear here, because `_marketHealthFromSnapshot` does not apply it — health,
     *  liquidation and equity are all measured without it. Use
     *  {@link SomniaMarketsClient.previewPerpOrderMargin} for the order-gating figure.
     */
    initialMarginRequirement: bigint;
    /** `ceil(notional × maintenanceMarginBps / 10000)` — the liquidation threshold's share. */
    maintenanceMarginRequirement: bigint;
    /** `ceil(notional × closeOutMarginBps / 10000)` — the takeover threshold's share. */
    closeOutMarginRequirement: bigint;
    /**
     *  {@link equityContribution} over {@link initialMarginRequirement}, in bps —
     *  "this position has returned N% of the margin it ties up".
     *
     *  **Net of funding**, because funding is a real cost of holding the position and a
     *  gross figure flatters a position that is up on price and bleeding carry. For the
     *  price-only ratio, use `unrealizedPnl × 10000n / initialMarginRequirement`.
     *
     *  `null` whenever {@link initialMarginRequirement} is zero and the ratio is
     *  therefore undefined — not `0n`, which would read as a real break-even. That is a
     *  flat position in the ordinary case, and also a dust one whose {@link notional}
     *  floors to zero, which the protocol likewise asks no margin for.
     *
     *  Floors (toward −∞) rather than truncating, so a loss never rounds toward looking
     *  smaller than it is.
     */
    returnOnMarginBps: bigint | null;
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
export declare function perpPositionAnalytics(p: PerpPositionAnalyticsInputs): PerpPositionMetrics;
/**
 * One position's analytics as of a block, or the market reporting itself unpriceable.
 *
 * @category perpetual markets
 */
export type PerpPositionAnalytics = ({
    /** The pool's mark feed is fresh; every field is real. */
    priceable: true;
    /** The block every read was pinned to. */
    asOfBlock: bigint;
    /** The pool measured. */
    pool: Address;
    /** Volume-weighted average entry price, raw quote units per whole base. */
    avgEntryPrice: bigint;
    /** The mark the position was marked to. */
    markPrice: bigint;
} & PerpPositionMetrics) | {
    /**
     *  The pool's mark feed is stale or zero, so nothing here can be marked. Render
     *  the row blank — do NOT substitute zeros, which would show a live position as
     *  flat — or drop it when `size` is `0n`.
     */
    priceable: false;
    /** The block the attempt was pinned to. */
    asOfBlock: bigint;
    /** The pool that could not be priced. */
    pool: Address;
    /**
     *  SIGNED position size, raw base units — the one figure that survives a dead
     *  mark feed, because the MarginBank read succeeded and only the pool's price
     *  read failed. `0n` means the account genuinely holds no position here:
     *  `activePerpPools` is has-position OR has-orders, so an order-only pool
     *  appears in this list with nothing to show. Use it to tell "a position
     *  nobody can price" from "no position at all" — nothing else here can.
     */
    size: bigint;
};
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
export declare function getPerpPositionAnalytics(ref: PerpState.PerpPositionRef, client: PublicClient): Promise<PerpPositionAnalytics>;
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
export declare function listPerpPositionAnalytics(p: {
    marginBank: Address;
    account: Address;
}, client: PublicClient): Promise<PerpPositionAnalytics[]>;
/**
 *  Identifies one side of one perp market in the MarginBank — the
 *  (bank, pool, side) triple the holder-enumeration read keys on.
 *
 * @category perpetual markets
 */
export interface PerpSideHoldersRef {
    /** The MarginBank holding the positions — comes off the `PerpMarket` row. */
    marginBank: Address;
    /** The perp pool whose holders to enumerate. */
    pool: Address;
    /** True for the long side, false for the short side. */
    isLong: boolean;
}
/**
 * Options for `getPerpSideHolders` (the client's `getPerpSideHolders` method).
 *
 * @category perpetual markets
 */
export interface GetPerpSideHoldersOptions {
    /**
     *  Pin the enumeration to this block instead of the current head — e.g. the
     *  `asOfBlock` of the other side's call, so both sides describe one state.
     */
    blockNumber?: bigint;
    /**
     *  Holders fetched per contract call.
     *
     *  @default 1000
     */
    pageSize?: number;
}
/**
 * One side of one perp market's complete holder set, as of one block.
 *
 * @category perpetual markets
 */
export interface PerpSideHolders {
    /**
     *  Every account holding an open position on the requested side. Ordering is
     *  UNSPECIFIED by the contract and can change on any close — treat it as a
     *  set, never as a stable sequence. Empty when nobody holds that side.
     */
    holders: Address[];
    /**
     *  The block height every page was read at. Feed it into the reads that take
     *  a block pin — `getBankruptcyPrice`'s `opts.blockNumber`, and a sibling
     *  call for the other side — to keep a sweep on one consistent snapshot.
     *  (The other position/health reads answer at head only.)
     */
    asOfBlock: bigint;
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
export declare function getPerpSideHolders(ref: PerpSideHoldersRef, opts: GetPerpSideHoldersOptions, client: PublicClient): Promise<PerpSideHolders>;
/**
 * Options for the client's `getBankruptcyPrice` method.
 *
 * @category perpetual markets
 */
export interface GetBankruptcyPriceOptions {
    /**
     *  Read at this block instead of the current head. Pass an enumeration's
     *  `asOfBlock` to price its holders on the same consistent snapshot.
     */
    blockNumber?: bigint;
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
export declare function getBankruptcyPrice(ref: PerpState.PerpPositionRef, opts: GetBankruptcyPriceOptions, client: PublicClient, ownedFailure?: (error: unknown) => boolean): Promise<bigint>;
export declare function depositMargin(w: WriterCtx, p: DepositMarginParams): Promise<TxResult>;
export declare function withdrawMargin(w: WriterCtx, p: WithdrawMarginParams): Promise<TxResult>;
/**
 *  A MarginBank deposit expanded into the unsigned calls it actually takes.
 *
 *  Two or one: the bank pulls the collateral, so it needs an ERC-20 allowance
 *  first — unless `autoApprove: false` says the caller manages that themselves.
 *
 * @category perpetual markets
 */
export interface UnsignedMarginDeposit {
    /** The `deposit` call itself. */
    deposit: Writer.UnsignedCall;
    /** The ERC-20 approval the bank needs first; absent when `autoApprove: false`. */
    approval?: Writer.UnsignedCall;
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
export declare function buildDepositMargin(w: WriterCtx, p: DepositMarginParams): Promise<UnsignedMarginDeposit>;
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
export declare function buildWithdrawMargin(w: WriterCtx, p: WithdrawMarginParams): Promise<Writer.UnsignedCall>;
export declare function setPerpLeverage(w: WriterCtx, p: SetPerpLeverageParams): Promise<TxResult>;
/**
 *  What a perp order will cost and whether it will be accepted, computed BEFORE
 *  sending it.
 *
 *  A discriminated union: an unpriceable market yields no preview at all, because
 *  every component below needs the mark. Narrow on `priceable` first.
 *
 * @category perpetual markets
 */
export type PerpOrderMarginPreview = {
    /**
     *  The pool's mark feed is stale or zero. Placement of any order with an
     *  increasing leg would revert on the contract's own freshness gate, so there is
     *  nothing to preview — and no field here could be trusted if there were.
     */
    priceable: false;
    /** The block every read was pinned to. */
    asOfBlock: bigint;
} | {
    priceable: true;
    /**
     *  The block every read was pinned to.
     *
     *  A preview is a statement about THIS block, not about the block the order
     *  lands in. The adverse-gap component moves one-for-one with the mark, so a
     *  limit bid above a falling mark locks more than quoted and either gate can
     *  flip. Re-quote near send time for anything close to the edge.
     */
    asOfBlock: bigint;
    /** The part of the order that increases the position — the only part that locks. */
    increasingQuantity: bigint;
    /** The part absorbed by existing exposure. Locks nothing. */
    reducingQuantity: bigint;
    /** Total collateral the pool will lock (raw quote units) — the honest "margin required". */
    lockAmount: bigint;
    /** The initial-margin component of {@link lockAmount}, at the effective (OI-scaled) IMF. */
    initialMarginPortion: bigint;
    /**
     *  The adverse mark-to-entry component of {@link lockAmount}, zero on a
     *  favourable entry.
     *
     *  A position opens at the order's price but is marked at the current mark, so a
     *  buy above mark (or sell below) is born underwater by that gap; the pool
     *  reserves it on top of initial margin. This is the term a naive
     *  `notional × IMF` estimate misses, and the usual reason a "max" order sized
     *  that way gets rejected.
     */
    adverseGapPortion: bigint;
    /**
     *  Extra margin demanded because the account set a per-market leverage cap
     *  STRICTER than the market's effective IMF. Zero when unset or looser.
     *
     *  Charged on post-fill notional, and unlike the lock it comes out of free
     *  equity rather than being reserved.
     */
    leverageSurcharge: bigint;
    /** The OI-scaled IMF actually applied, bps — not the static `initialMarginBps`. */
    effectiveImfBps: bigint;
    /** Mark price the adverse gap was measured against. */
    markPrice: bigint;
    /** Free collateral available to be locked. */
    unlockedCollateral: bigint;
    /** Account equity (signed) before the lock. */
    equity: bigint;
    /** Initial-margin requirement of EXISTING positions. */
    imRequirement: bigint;
    /**
     *  The pool's worst-case fee reserve for this order — an auto-pull addend, never
     *  part of {@link lockAmount}. See {@link PerpOrderMarginQuote.feeHeadroom}.
     */
    feeHeadroom: bigint;
    /**
     *  What auto-pull would REQUEST in total, `0n` unless `autoPull` was passed.
     *
     *  **Not the wallet spend once a main is in play** — that is
     *  {@link ownWalletPull} for the owner and {@link mainWalletPull} for the main,
     *  and an order form showing this figure as the child's debit over-states it by
     *  the main's leg. With no main the two coincide.
     *
     *  See {@link PerpOrderMarginQuote.topUpRequired}, including the three cases where
     *  the pool declines and this reads `0n` for a reason other than "nothing needed".
     */
    topUpRequired: bigint;
    /**
     *  The owner's collateral-token balance and MarginBank allowance, `null` unless
     *  `autoPull` was passed. Both bind on {@link topUpRequired}, and which one is
     *  short decides whether the fix is "approve more" or "fund the wallet".
     */
    wallet: {
        balance: bigint;
        allowance: bigint;
    } | null;
    /**
     *  The linked MAIN ELIGIBLE to fund what the owner's wallet cannot, or `null` when
     *  the account funds itself (unlinked, a main itself, or the rail is dormant) or
     *  `autoPull` was not passed.
     *
     *  **Eligibility, not a debit.** This is resolved for every linked account on the
     *  `autoPull` path, including an order that needs no top-up at all and one whose
     *  own wallet covers the whole pull. Read {@link mainWalletPull} `> 0n` for the
     *  wallet that actually moves, and show THAT before the trader signs.
     */
    fundingPayer: Address | null;
    /**
     *  What {@link fundingPayer} can spend — `MarginBank.quoteWalletCapacity(payer)`,
     *  i.e. `min(balance, allowance)`. `null` whenever {@link fundingPayer} is.
     */
    mainWalletCapacity: bigint | null;
    /**
     *  The main's leg is withheld because the account still owes a PRIOR payer, so
     *  `MarginBank.depositForFromMain` would revert `PriorFundingPayerOutstanding`.
     *  {@link mainWalletPull} is `0n` while this holds, whatever
     *  {@link mainWalletCapacity} says. Clear the old claim with
     *  `trader.repayPerpMainFunding`.
     */
    mainFundingBlocked: boolean;
    /**
     *  Both funding wallets together cover {@link topUpRequired}.
     *  See {@link PerpOrderMarginQuote.walletCoversTopUp}.
     */
    walletCoversTopUp: boolean;
    /**
     *  The share of {@link topUpRequired} the owner's own wallet would supply — it pays
     *  first. See {@link PerpOrderMarginQuote.ownWalletPull}.
     */
    ownWalletPull: bigint;
    /**
     *  The share {@link fundingPayer} would supply, `0n` with no main.
     *  See {@link PerpOrderMarginQuote.mainWalletPull}.
     */
    mainWalletPull: bigint;
    /**
     *  Gate 1 — the unlocked balance covers the lock, after any auto-pull. Failing it
     *  reverts `InsufficientCollateral` before margin is even checked.
     *
     *  Vacuously true when nothing is locked: the pool calls `lockCollateral` only
     *  `if (lockAmount > 0)`, so a purely reducing order never touches this gate even
     *  from a negative unlocked balance. Without `autoPull` it is measured against
     *  {@link unlockedCollateral} alone — see {@link PerpOrderMarginQuote.hasCollateralForLock}.
     */
    hasCollateralForLock: boolean;
    /**
     *  Gate 2 — post-lock equity still covers the requirement:
     *  `equity + topUpRequired - lockAmount >= imRequirement + leverageSurcharge`.
     *
     *  Vacuously true for a purely reducing order, which the pool exempts outright
     *  (`if (increasingQuantity > 0)`) on the grounds that closing can only improve
     *  account health. An account below initial margin can therefore always reduce.
     */
    meetsInitialMargin: boolean;
    /**
     *  The account holds a credit-voucher floor and this increasing order is barred
     *  outright — the market is not on the voucher allowlist, or the protocol's
     *  voucher leverage cap is unset. Placement reverts `VoucherMarketNotAllowed` /
     *  `VoucherLeverageCapNotSet`, whatever the margin numbers say.
     *
     *  Distinct from the margin gates: when the market IS allowlisted, the voucher cap
     *  instead feeds the ordinary leverage path and shows up in
     *  {@link leverageSurcharge} rather than here.
     */
    voucherBlocked: boolean;
    /**
     *  The market is close-only and this order has an increasing leg, so placement
     *  reverts `MarketRestricted`. See {@link PerpOrderMarginQuote.restrictedBlocked}.
     */
    restrictedBlocked: boolean;
    /**
     *  Isolated margin bars this market for this account, so placement reverts
     *  `IsolatedMarketBlocked` — the one gate here that blocks a reduce too. See
     *  {@link PerpOrderMarginQuote.isolationBlocked}.
     */
    isolationBlocked: boolean;
    /** Every gate. The order should be accepted. */
    sufficient: boolean;
};
/**
 *  Preview what a perp order will lock and whether the pool will accept it — the
 *  read behind an order form's "margin required" row and its submit gate.
 *
 *  Chain tier. Ports `PerpPool._computeLockAmount` plus the `MarginBank` gate it
 *  feeds, so the number shown is the number actually reserved.
 *
 *  **Why not just call a contract pre-check.** `quoteMeetsIMForOrder` looks like the
 *  right call and is not: it runs with `baseImReserved = true`, mirroring the
 *  placement check that happens AFTER the lock has already reserved the order's base
 *  margin. Called cold, the order's own margin is counted nowhere, so it returns true
 *  for almost any size. `meetsIMForFill` does charge the base margin, but neither
 *  models the lock's adverse mark-to-entry reserve — which is exactly the term that
 *  rejects a naively-sized "max" order.
 *
 *  **Two gates, and they fail for different reasons.** `hasCollateralForLock` is
 *  whether the lock can be taken at all (`InsufficientCollateral`);
 *  `meetsInitialMargin` is whether what remains still covers the requirement. Showing
 *  a trader which one failed is the difference between "deposit more" and "close
 *  something".
 *
 *  Every read is pinned to ONE block. Composed across blocks these values tear — a
 *  fill between calls desyncs position size from equity, and the two gates can then
 *  describe a state that never existed.
 *
 *  Does not model: tick/lot quantization, position/OI caps, market restriction, the
 *  resting-order cap, or isolated-margin confinement. Those reject independently of
 *  margin, so they are genuinely outside this preview's scope.
 *
 *  The credit-voucher path IS modelled, because it is not independent: while a voucher
 *  floor is active, `_meetsIM` forces the protocol's leverage cap into the same
 *  leverage->IM computation whenever the account's own setting is unset or looser, so
 *  it lands in {@link leverageSurcharge} as a real margin increase. Only its
 *  allowlist/cap-unset rejection is a separate outcome — see {@link voucherBlocked}.
 *
 * **Details**
 *
 * - `p.pool`: the perp pool
 * - `p.marginBank`: the pool's MarginBank
 * - `p.account`: who would place the order
 * - `p.isBid`: true to buy/long, false to sell/short
 * - `p.quantity`: order size, raw base units
 * - `p.price`: limit price, raw quote units per whole base
 */
/**
 *  Everything the placement gates need, and nothing that has to come from a particular
 *  block — so `perpOrderMarginQuote` stays pure.
 *
 * @category perpetual markets
 */
export interface PerpOrderMarginQuoteInputs {
    /** True = a buy. */
    isBid: boolean;
    /** Order quantity, raw base units. */
    quantity: bigint;
    /** Limit price, raw quote units per whole base. */
    price: bigint;
    /** 10^decimals of the synthetic base. */
    oneBase: bigint;
    /** Current mark, raw quote units per whole base. */
    markPrice: bigint;
    /** The OI-scaled IMF in force, bps. */
    effectiveImfBps: bigint;
    /** SIGNED existing position size, raw base units. */
    positionSize: bigint;
    /** Reducing capacity resting orders have not already spoken for, raw base units. */
    effectiveReducingCapacity: bigint;
    /** Account equity, signed. */
    equity: bigint;
    /** Aggregate initial-margin requirement. */
    imRequirement: bigint;
    /** Unlocked collateral balance, signed. */
    unlockedCollateral: bigint;
    /** The account's own per-market cap, `0` when unset. */
    accountMaxLeverageX: number;
    /** Protocol-wide ceiling. */
    protocolMaxLeverageX: number;
    /** The account's credit-voucher floor. */
    creditFloor: bigint;
    /** The protocol's voucher leverage cap, `0` when unset. */
    voucherLeverageCapX: number;
    /** Whether this market is voucher-allowlisted. */
    voucherMarketAllowed: boolean;
    /**
     *  The owner's wallet, which turns auto-pull (T70) modelling ON.
     *
     *  Supply it **only when the transaction sender will be the order owner**, because
     *  that is the pool's entire gate: `PerpPool._autoPullMargin` returns early unless
     *  `msg.sender == order.owner`, deliberately narrower than spot's, which also admits
     *  registry-approved operators. Routing through `placeOrderFor`, an operator grant,
     *  a router, or the stop registry means no pull — omit this and the gates fall back
     *  to the in-bank balance, which is what those paths actually face.
     *
     *  `balance` is the owner's collateral-token balance and `allowance` their approval
     *  to the **MarginBank** (the same one `deposit` already needs — the pool reaches the
     *  wallet through `depositFor`). Both bind: the pull is an ordinary `transferFrom`,
     *  so whichever is smaller is the ceiling, and an insufficient one reverts from the
     *  TOKEN rather than being swallowed.
     */
    wallet?: {
        balance: bigint;
        allowance: bigint;
    };
    /**
     *  A linked MAIN's spendable capacity — `MarginBank.quoteWalletCapacity(payer)`, which
     *  is `min(balance, allowance)` in one number. Omit it when the account has no main.
     *
     *  This is the SECOND funding leg, and without it a linked child's placement reads as
     *  underfunded when it is not. `PerpPool._reserveAndPullMargin` spends the owner's own
     *  wallet first and takes the residual from the main, so the two legs add: the pull
     *  succeeds when `ownCapacity + mainWalletCapacity` covers
     *  {@link PerpOrderMarginQuote.topUpRequired}.
     *
     *  It only participates when {@link wallet} is also supplied, because the whole pull —
     *  both legs — is gated on `msg.sender == order.owner`. A main never funds an
     *  operator-routed or stop-triggered order.
     *
     *  One number rather than a balance/allowance pair on purpose: the bank exposes only
     *  the minimum for another wallet, and reading the pair separately would let the SDK's
     *  sizing disagree with the contract's. The cost is that a main-side shortfall does not
     *  say which of the two bound — a caller that needs to know reads the main's token
     *  balance and allowance directly.
     */
    mainWalletCapacity?: bigint;
    /**
     *  The main's leg cannot be spent because the account still owes a DIFFERENT payer.
     *  Defaults to `false`.
     *
     *  `MarginBank.depositForFromMain` allows one payer at a time: while
     *  `mainFundedPrincipal` is outstanding it reverts `PriorFundingPayerOutstanding`
     *  unless the live payer IS the recorded one. A child funded by main A, unlinked, and
     *  re-linked to main B is exactly that state, and `quoteFundingPayer` names B — so
     *  counting B's capacity would quote an executable order that reverts.
     *
     *  While `true` the main's leg is treated as zero, whatever
     *  {@link mainWalletCapacity} says. The account can still place whatever its own
     *  wallet and bank balance fund. The fix is to clear the old claim with
     *  `trader.repayPerpMainFunding`, not to fund either main.
     */
    mainFundingBlocked?: boolean;
    /**
     *  The pool's taker fee, `BPS_TIMES_1K`. Feeds {@link PerpOrderMarginQuote.feeHeadroom}
     *  only; the lock itself is fee-free. Defaults to `0n`.
     */
    takerFeeBpsTimes1k?: bigint;
    /** The pool's maker fee, `BPS_TIMES_1K` and SIGNED — negative is a rebate. Defaults to `0n`. */
    makerFeeBpsTimes1k?: bigint;
    /** The builder fee attached to this order, `BPS_TIMES_1K`. Defaults to `0n`. */
    builderFeeBpsTimes1k?: bigint;
    /**
     *  The market is in close-only mode (`PerpPool.isRestricted()`). Defaults to `false`.
     *
     *  Rejects any order with an increasing leg outright — no arithmetic involved — so it
     *  behaves like the voucher block rather than like a margin gate.
     */
    restricted?: boolean;
    /**
     *  `MarginBank.isolationAllowsMarket(account, pool)`. Defaults to `true`.
     *
     *  `false` rejects the WHOLE order, reducing legs included — the one placement gate
     *  that does, because it is a market-selection rule rather than a margin one.
     */
    isolationAllowsMarket?: boolean;
}
/**
 * The placement gates and the lock they are measured against.
 *
 * @category perpetual markets
 */
export interface PerpOrderMarginQuote {
    /** The part of the order that increases the position — the only part that locks. */
    increasingQuantity: bigint;
    /** The part absorbed by existing exposure. Locks nothing. */
    reducingQuantity: bigint;
    /** Total collateral the pool will lock. */
    lockAmount: bigint;
    /** The initial-margin component of {@link lockAmount}. */
    initialMarginPortion: bigint;
    /** The adverse mark-to-entry component, zero on a favourable entry. */
    adverseGapPortion: bigint;
    /** Extra margin a leverage cap stricter than the market's IMF demands. */
    leverageSurcharge: bigint;
    /**
     *  The pool's worst-case fee reserve for this order (`PerpPool._feeHeadroom`).
     *
     *  Not part of {@link lockAmount} and not charged — perps locks only initial margin
     *  and takes fees from the unlocked balance at fill. It exists solely as an auto-pull
     *  addend, so that pulling exactly the lock cannot leave a max-leverage open at
     *  `equity = IM − fees` against an `IM` requirement, i.e. in `MarginCall` at birth.
     *
     *  The rate is an envelope, not a prediction: an order rests as a maker or crosses as
     *  a taker but never both, so it takes the larger of the two — with a negative (rebate)
     *  maker rate floored at zero first, since a rebate must not shrink the reserve below
     *  the taker case — plus the order's builder fee. Ceil-rounded, on the **full** order
     *  notional rather than the increasing leg, because fees are charged on the whole fill.
     *
     *  Reported whatever {@link topUpRequired} does, but it only enters the arithmetic when
     *  auto-pull is modelled.
     */
    feeHeadroom: bigint;
    /**
     *  What auto-pull would REQUEST in total (`MarginBank.quoteOrderTopUp`) — `0n` when
     *  {@link PerpOrderMarginQuoteInputs.wallet} is omitted, i.e. when auto-pull is not
     *  being modelled at all.
     *
     *  **Not the owner's wallet debit once a main is in play.** It is the requirement, and
     *  {@link ownWalletPull} / {@link mainWalletPull} are the two wallets that meet it.
     *  Showing this figure as the child's spend over-states it by exactly the main's leg.
     *
     *  `lockAmount + feeHeadroom + leverageSurcharge` less the unlocked balance, floored at
     *  zero. **Order-local by design**: it excludes the initial margin of the account's
     *  positions in other markets, so it is exactly sufficient for a FLAT account and
     *  best-effort for one already carrying exposure — a pre-existing cross-market deficit
     *  still fails {@link meetsInitialMargin}. Auto-pull funds an ORDER, not an ACCOUNT.
     *
     *  A `0n` is three different things, which is why it should be read beside the balance
     *  rather than alone: no pull needed, or one of the pool's three declines — a purely
     *  reducing order (closing never debits a wallet), an account already in debt (a pull
     *  would silently cure bad debt), or a voucher-blocked increase.
     */
    topUpRequired: bigint;
    /**
     *  The funding wallets can together cover {@link topUpRequired} — the owner's own
     *  balance and allowance, plus a linked main's capacity when one was supplied.
     *
     *  Vacuously `true` when no pull is needed or auto-pull is not modelled. **What a
     *  `false` MEANS depends on whether a main is in play**, and the two are not the same
     *  outcome:
     *
     *  - **No main.** The pool asks for a fixed `topUpRequired`, so the `transferFrom`
     *    inside `depositFor` reverts and the placement fails on the TOKEN's error rather
     *    than a margin gate — deliberate, because that error names the fix. This is a
     *    placement gate and it folds into {@link sufficient}.
     *  - **With a main.** Both legs are `min(...)`-sized and neither can revert, so the
     *    pool pulls what it can and the margin gates judge the result. This is then
     *    INFORMATIONAL and does NOT fold into {@link sufficient}: the order can be
     *    accepted with the lock funded and the fee reserve short, which is precisely what
     *    {@link feeHeadroom} exists to avoid. Read a `false` here as "the position may be
     *    born close to its own initial margin", not as "this will be rejected".
     */
    walletCoversTopUp: boolean;
    /**
     *  How much of {@link topUpRequired} the OWNER's own wallet would supply.
     *
     *  `min(topUpRequired, min(balance, allowance))`. The owner's wallet always pays first,
     *  so a child holding some collateral spends its own before it touches its main's.
     */
    ownWalletPull: bigint;
    /**
     *  How much of {@link topUpRequired} a linked MAIN's wallet would supply — the residual
     *  the owner's own wallet could not cover, capped at
     *  {@link PerpOrderMarginQuoteInputs.mainWalletCapacity}.
     *
     *  `0n` with no main, `0n` for an account that funds itself, and `0n` while
     *  {@link mainFundingBlocked}. **Non-zero is the only proof another wallet is actually
     *  debited** — an eligible payer alone is not, since the order may need no top-up or
     *  the owner's own wallet may cover all of it. This is the number to show a trader
     *  before they sign.
     *
     *  `ownWalletPull + mainWalletPull` is what the pull actually moves, and it is BELOW
     *  {@link topUpRequired} exactly when {@link walletCoversTopUp} is `false` — neither leg
     *  reverts on a short wallet, so the shortfall surfaces at the margin gates instead.
     */
    mainWalletPull: bigint;
    /**
     *  Gate 1 — the unlocked balance covers the lock, **after any auto-pull**.
     *
     *  With {@link PerpOrderMarginQuoteInputs.wallet} supplied this is the real post-pull
     *  gate. Without it, the in-bank balance alone — conservative rather than wrong on the
     *  self-send path, since the pool tops up before `lockCollateral` runs.
     */
    hasCollateralForLock: boolean;
    /**
     *  Gate 2 — post-lock equity still meets the initial-margin requirement, **after any
     *  auto-pull** (the top-up lands in the unlocked balance that seeds equity).
     *
     *  Note this is NOT monotone in quantity once auto-pull is modelled, and the reason is
     *  worth knowing: in the pulled regime the surcharge cancels from both sides and the
     *  gate reduces to `(equity − unlocked) + feeHeadroom ≥ imRequirement`, whose only
     *  quantity-dependent term GROWS. An account whose existing positions sit below their
     *  own initial margin can therefore be rejected at a middling size and accepted at a
     *  far larger one, whose headroom over-pulls enough to cover the deficit.
     *  `client.getMaxPerpOrderSize` deliberately does not offer sizes from that disconnected
     *  upper region.
     */
    meetsInitialMargin: boolean;
    /**
     *  The main's leg was withheld because the account still owes a prior payer — see
     *  {@link PerpOrderMarginQuoteInputs.mainFundingBlocked}. Placement is not blocked
     *  outright, only the main's contribution.
     */
    mainFundingBlocked: boolean;
    /** The order would revert on the voucher allowlist / unset-cap guard. */
    voucherBlocked: boolean;
    /**
     *  The market is close-only and this order has an increasing leg, so placement reverts
     *  `MarketRestricted`. Never blocks a pure reduce.
     */
    restrictedBlocked: boolean;
    /**
     *  The account is in isolated margin with a footprint in a DIFFERENT market, so
     *  placement reverts `IsolatedMarketBlocked`. Unlike every other gate here this blocks
     *  the reducing legs too — it is about which market may be traded, not about margin.
     */
    isolationBlocked: boolean;
    /** Every gate passes. */
    sufficient: boolean;
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
export declare function perpOrderMarginQuote(p: PerpOrderMarginQuoteInputs): PerpOrderMarginQuote;
export declare function previewPerpOrderMargin(p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    quantity: bigint;
    price: bigint;
    autoPull?: boolean;
    builderFeeBpsTimes1k?: bigint;
}, client: PublicClient): Promise<PerpOrderMarginPreview>;
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
export declare function meetsPerpImForFill(p: {
    marginBank: Address;
    account: Address;
    pool: Address;
    additionalSize: bigint;
    price: bigint;
}, client: PublicClient): Promise<boolean>;
/**
 * Which gate stopped the size going one lot higher.
 *
 * @category perpetual markets
 */
export type PerpMaxOrderSizeLimit = 
/** The unlocked balance cannot cover the next lot's lock. */
"collateral"
/** Post-lock equity would fall below the account's initial-margin requirement. */
 | "initialMargin"
/** The next lot would push the position past the market's `maxPositionSize`. */
 | "maxPositionSize"
/** A credit voucher bars this market outright, so nothing may INCREASE the position. */
 | "voucherBlocked"
/**
 *  Auto-pull would need more of the collateral token than the wallet holds. The fix is
 *  to fund the wallet — or to deposit into the bank and stop relying on the pull.
 */
 | "walletBalance"
/**
 *  The wallet holds enough but has not approved enough to the MarginBank. Distinct from
 *  {@link PerpMaxOrderSizeLimit} `"walletBalance"` because the fix is an `approve`, and
 *  a UI that conflates the two sends the trader to buy tokens they already own.
 */
 | "walletAllowance"
/**
 *  The owner's own wallet is spent to the last unit and the linked MAIN's wallet cannot
 *  cover the residual.
 *
 *  Reported ahead of the two `wallet*` values because the main is the wallet to grow:
 *  at this ceiling the child's own capacity is fully consumed, so `"walletBalance"`
 *  would also be literally true and would send a trader to fund a sub-account that is
 *  empty by design.
 *
 *  It is the PREFERRED remedy, not the only effective one — the two capacities add, so
 *  raising the child's balance or allowance lifts the ceiling just as well. Reach for
 *  that when the child is the wallet you can actually top up.
 *
 *  The bank exposes only `min(balance, allowance)` for another wallet, so this does not
 *  say which of the two bound on the main — read the main's token balance and allowance
 *  to find out.
 */
 | "mainWallet"
/**
 *  A main is linked but its leg is unusable: the account still owes a PRIOR payer, and
 *  `MarginBank.depositForFromMain` reverts `PriorFundingPayerOutstanding` until that
 *  claim is cleared. The size shown is what the owner's own wallet and bank balance
 *  fund alone.
 *
 *  The fix is neither wallet. Repay the outstanding principal with
 *  `trader.repayPerpMainFunding`, then re-quote.
 */
 | "mainFundingBlocked"
/** The market is close-only, so nothing may INCREASE the position. */
 | "restricted"
/**
 *  Isolated margin bars this market for this account — it holds a footprint in another
 *  one. Nothing can be placed here at all, reduces included, so `maxQuantity` is `0n`.
 */
 | "isolated";
/**
 * The largest order the account can actually place, or an unpriceable market.
 *
 * @category perpetual markets
 */
export type PerpMaxOrderSize = {
    /** The pool's mark feed is stale or zero, so no size can be quoted. */
    priceable: false;
    /** The block every read was pinned to. */
    asOfBlock: bigint;
} | {
    priceable: true;
    /**
     *  The block every read was pinned to.
     *
     *  A max size is a statement about THIS block. The adverse-gap term moves
     *  one-for-one with the mark, so a limit bid above a falling mark can afford less
     *  than quoted a block later. Re-quote near send time.
     */
    asOfBlock: bigint;
    /**
     *  The largest quantity that passes every placement gate, **aligned down to the
     *  pool's lot grid** — what a Max button should fill in.
     *
     *  `0n` when nothing can be placed. Check {@link placeable} before offering it:
     *  a size below the pool's `minQuantity` is not a small order, it is a revert.
     */
    maxQuantity: bigint;
    /**
     *  {@link maxQuantity} before lot alignment. Diagnostic only — placing it would
     *  revert `InvalidQuantity`.
     */
    unalignedMaxQuantity: bigint;
    /** The part of {@link maxQuantity} that increases the position, and so locks. */
    increasingQuantity: bigint;
    /**
     *  The part absorbed by existing exposure, which locks nothing.
     *
     *  This is why a max on the opposite side can exceed anything the collateral would
     *  fund: a reducing order trips neither gate, so the answer starts at the reducing
     *  capacity and only then adds what the margin can carry.
     */
    reducingQuantity: bigint;
    /** The collateral the pool would lock at {@link maxQuantity}. */
    lockAmount: bigint;
    /**
     *  What auto-pull would REQUEST in total at {@link maxQuantity} — `0n` unless
     *  `autoPull` was passed. **Show it beside the size**: at a wallet-limited max this
     *  is essentially the whole approved balance, and a trader clicking Max deserves to
     *  see the transfer before they sign it.
     *
     *  Split it into {@link ownWalletPull} and {@link mainWalletPull} when a main is
     *  linked, so the trader sees which wallet pays what rather than reading the total
     *  as their own debit.
     */
    topUpRequired: bigint;
    /**
     *  The owner's collateral-token balance and MarginBank allowance, `null` unless
     *  `autoPull` was passed. Read {@link limitedBy} to see which one bound.
     */
    wallet: {
        balance: bigint;
        allowance: bigint;
    } | null;
    /**
     *  The linked MAIN eligible to fund the residual, or `null` when the account funds
     *  itself.
     *
     *  A funded child's max is bigger than its own wallet would allow, and this names
     *  the wallet that makes up the difference. Eligibility, not a debit — see
     *  {@link PerpOrderMarginPreview} for the full contract.
     */
    fundingPayer: Address | null;
    /** What {@link fundingPayer} can spend, `null` whenever the payer is. */
    mainWalletCapacity: bigint | null;
    /**
     *  The main's leg was withheld because the account owes a prior payer, so this max
     *  is what the owner's own funding reaches. See {@link PerpMaxOrderSizeLimit}
     *  `"mainFundingBlocked"`.
     */
    mainFundingBlocked: boolean;
    /** The share of {@link topUpRequired} the owner's own wallet supplies at {@link maxQuantity}. */
    ownWalletPull: bigint;
    /** The share {@link fundingPayer} supplies at {@link maxQuantity}, `0n` with no main. */
    mainWalletPull: bigint;
    /** Whether {@link maxQuantity} clears the pool's `minQuantity`. */
    placeable: boolean;
    /** Which gate stopped it going one lot higher. */
    limitedBy: PerpMaxOrderSizeLimit;
    /**
     *  The pool's quantity grid — every order must be a multiple.
     *
     *  The value {@link maxQuantity} was actually aligned to, floored at `1n`. A pool
     *  reporting `0n` has no grid to speak of, and handing that back would give a
     *  caller a divisor that throws.
     */
    lotSize: bigint;
    /** The pool's minimum order quantity. */
    minQuantity: bigint;
    /** The market's per-account position cap. */
    maxPositionSize: bigint;
    /** SIGNED existing position size. */
    positionSize: bigint;
    /** The mark the adverse gap was measured against. */
    markPrice: bigint;
    /** The OI-scaled IMF used, bps. */
    effectiveImfBps: bigint;
};
export declare function getMaxPerpOrderSize(p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    price: bigint;
    autoPull?: boolean;
    builderFeeBpsTimes1k?: bigint;
}, client: PublicClient): Promise<PerpMaxOrderSize>;
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
export declare function quoteMeetsPerpImForOrder(p: {
    marginBank: Address;
    account: Address;
    pool: Address;
    additionalSize: bigint;
    price: bigint;
}, client: PublicClient): Promise<boolean>;
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
export declare function getPerpLeverageImSurcharge(marginBank: Address, account: Address, client: PublicClient): Promise<bigint>;
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
export declare function tryGetPerpLeverageImSurcharge(marginBank: Address, account: Address, client: PublicClient, ownedFailure?: (error: unknown) => boolean): Promise<bigint | null>;
/**
 * Options for the client's `getPerpMaxLeverage` method.
 *
 * @category perpetual markets
 */
export interface GetPerpMaxLeverageOptions {
    /**
     *  Read at this block instead of the current head. Pass an enumeration's or an
     *  analytics row's `asOfBlock` to keep the cap on the same consistent snapshot as
     *  the figures it is combined with.
     */
    blockNumber?: bigint;
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
export declare function getPerpMaxLeverage(ref: PerpState.PerpPositionRef, opts: GetPerpMaxLeverageOptions, client: PublicClient, ownedFailure?: (error: unknown) => boolean): Promise<number>;
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
export declare function quotePerpOrderTopUp(p: {
    marginBank: Address;
    pool: Address;
    account: Address;
    lockAmount: bigint;
    feeHeadroom: bigint;
    increasingQuantity: bigint;
    price: bigint;
}, client: PublicClient): Promise<bigint>;
/**
 *  Where an order would put the liquidation price if it filled — and where it sits
 *  now, for the comparison that is the actual question.
 *
 *  A discriminated union: an unpriceable market yields no preview, because the mark is
 *  an input to every field below. Narrow on `priceable` first.
 *
 * @category perpetual markets
 */
export type PerpLiquidationPreview = {
    /**
     *  The pool's mark feed is stale or zero, so there is nothing to project
     *  against — and an order with an increasing leg would revert on the contract's
     *  own freshness gate anyway.
     */
    priceable: false;
    /** The block every read was pinned to. */
    asOfBlock: bigint;
} | {
    priceable: true;
    /**
     *  The block every read was pinned to.
     *
     *  A projection is a statement about THIS block, not about the block the order
     *  fills in. Every field moves with the mark, so re-quote near send time for
     *  anything close to the edge.
     */
    asOfBlock: bigint;
    /** Mark price the whole projection is measured against. */
    markPrice: bigint;
    /** SIGNED position size before the fill, raw base units. */
    currentSize: bigint;
    /**
     *  Liquidation price of the position as it stands NOW, or `null` when flat.
     *  Identical to `client.getLiquidationPrice` at this block — same kernel, same
     *  inputs — so the two can be shown side by side without them disagreeing.
     */
    currentLiquidationPrice: bigint | null;
    /** SIGNED position size after the fill; `0n` when the order closes out exactly. */
    projectedSize: bigint;
    /**
     *  Volume-weighted average entry price after the fill, raw quote per whole base.
     *
     *  Follows `MarginBank.settleTrade`: the order's price on an OPEN or a FLIP, the
     *  floored VWAP of old and new on an INCREASE, and untouched on a reduce (a
     *  partial close does not re-price what remains). `0n` when the fill closes the
     *  position out, matching `_clearPosition`.
     */
    projectedEntryPrice: bigint;
    /**
     *  Realized PnL the fill books into the collateral balance (signed).
     *
     *  Non-zero only for a reduce, close, or flip — an open or an increase realizes
     *  nothing. Floored toward −∞, matching `_realizedPnlForClose`.
     */
    realizedPnl: bigint;
    /**
     *  Trading fee the fill would charge, raw collateral units — NEGATIVE for a maker
     *  rebate, which is a credit.
     *
     *  Charged on fill notional at the pool's taker rate by default; pass `asMaker`
     *  for the maker rate. It reduces equity, so it moves the liquidation price, which
     *  is why it is modelled here even though {@link SomniaMarketsClient.previewPerpOrderMargin} (a
     *  question about the LOCK) has no reason to.
     */
    fee: bigint;
    /**
     *  Account equity after the fill (signed) — the projection's numerator.
     *
     *  `equity − uPnlBefore + uPnlAfter + realizedPnl − fee`, all at the current mark.
     *  Re-marking is what makes an adverse entry cost equity immediately: a position
     *  opens at the order's price but is marked at the mark, so the gap lands here.
     */
    projectedEquity: bigint;
    /**
     *  Aggregate maintenance requirement after the fill — this market's contribution
     *  recomputed on the new size, with every other market's left exactly as the bank
     *  reported it.
     */
    projectedMmReq: bigint;
    /**
     *  Liquidation price after the fill, or `null` when the order leaves the account
     *  flat in this market (nothing left to liquidate).
     *
     *  Compare against {@link currentLiquidationPrice}: a same-side add moves it
     *  toward the mark, a reduce away from it.
     */
    projectedLiquidationPrice: bigint | null;
    /**
     *  This position's leverage after the fill, bps of 1x — post-fill notional over
     *  post-fill equity. `null` on non-positive projected equity, as on
     *  {@link PerpLeverage.positionLeverageBps}.
     */
    projectedPositionLeverageBps: bigint | null;
};
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
export declare function previewPerpLiquidationPrice(p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    quantity: bigint;
    price: bigint;
    asMaker?: boolean;
}, client: PublicClient): Promise<PerpLiquidationPreview>;
/**
 * What closing part or all of a position would realise.
 *
 * @category perpetual markets
 */
export type PerpClosePreview = {
    /** The pool's mark feed is stale or zero, so nothing can be marked. */
    priceable: false;
    /** The block every read was pinned to. */
    asOfBlock: bigint;
} | {
    priceable: true;
    /** The block every read was pinned to. */
    asOfBlock: bigint;
    /**
     *  What the caller asked to close, raw base units — **already normalised**.
     *
     *  An omitted `quantity` or a `0n` one means "all", and both arrive here as
     *  `|size|` rather than `0n`, so an "all" request is not distinguishable from an
     *  explicit full-size one on the way out. Compare against {@link closedQuantity}
     *  to see what the lot grid took off.
     */
    requestedQuantity: bigint;
    /**
     *  What would ACTUALLY close: clamped to the position, then **aligned down to the
     *  pool's lot grid**.
     *
     *  Below {@link requestedQuantity} whenever the position is not a lot multiple,
     *  which is what leaves a remainder open on a "close all".
     */
    closedQuantity: bigint;
    /** SIGNED size still open afterwards. `0n` on a full close. */
    remainingSize: bigint;
    /** Whether {@link closedQuantity} takes the position all the way to flat. */
    fullClose: boolean;
    /**
     *  Realised price PnL on the closed share, signed.
     *
     *  `floor((fill − entry) × sign(size) × closedQuantity / oneBase)` — the port of
     *  `MarginBank._realizedPnlForClose`, which FLOORS toward −∞ so a gain is credited
     *  at most true and a loss debited at least true. A partial close leaves
     *  `avgEntryPrice` untouched, so the remainder keeps its original basis.
     */
    realizedPnl: bigint;
    /**
     *  Funding settled by the close, signed and **positive means the account pays**.
     *
     *  Measured on the **whole** position, not the closed share — `settleTrade`
     *  settles funding before it touches the position. This is the term a close modal
     *  most often gets wrong.
     */
    fundingSettled: bigint;
    /** The fill's fee, signed — negative is a maker rebate. */
    fee: bigint;
    /**
     *  The close's total effect on collateral: `realizedPnl − fundingSettled − fee`.
     *
     *  The number to show. Funding and fee are costs, so they subtract; showing
     *  `realizedPnl` alone reports a position as more profitable to close than it is.
     */
    netProceeds: bigint;
    /**
     *  Whether {@link closedQuantity} clears the pool's `minQuantity`.
     *
     *  `false` means the close cannot be placed at all — not that it is small. A dust
     *  position below the minimum can only leave via liquidation or ADL.
     *
     *  It is the pool minimum and **nothing else**: `true` is not a promise the
     *  placement is accepted. See the note on reducing capacity in
     *  {@link SomniaMarketsClient.previewPerpClosePnl}.
     */
    placeable: boolean;
    /** The price the close was quoted at. */
    fillPrice: bigint;
    /** Current mark. */
    markPrice: bigint;
    /** The position's entry basis, untouched by a partial close. */
    avgEntryPrice: bigint;
    /**
     *  The pool's quantity grid — the value {@link closedQuantity} was aligned to,
     *  floored at `1n` so a pool reporting `0n` cannot hand back a divisor that throws.
     */
    lotSize: bigint;
    /** The pool's minimum order quantity. */
    minQuantity: bigint;
};
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
export declare function previewPerpClosePnl(p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    quantity?: bigint;
    price?: bigint;
    asMaker?: boolean;
}, client: PublicClient): Promise<PerpClosePreview>;
