// Perp margin — cross-margin collateral and account health.
//
// PERP-ONLY: the MarginBank is a perp contract, and cross-margin means collateral
// is NOT per-market — one account's margin backs every perp position it holds.
// That is why deposits/withdrawals key by bank rather than by pool, and why
// liquidation price is a function of the whole account, not one position.

import { decodeErrorResult, isHex, type Address, type PublicClient } from "viem";
import * as ReadsAbi from "../readsAbi.js";
import * as Revert from "../revert.js";
import * as TradeAbi from "../tradeAbi.js";
import { ContractRevertError, InvalidInputError } from "../errors.js";
import { unreachable } from "../raise.js";
// The funding index is 1e18-scaled, and that scale already has one owner. Importing it
// keeps a second literal from drifting from the first.
import { FUNDING_PRECISION } from "../funding.js";
import * as Reads from "../readEach.js";
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
export const MARGIN_STATUS: readonly MarginStatus[] = ["Healthy", "MarginCall", "PartialLiquidation", "CloseOut"];

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
export async function getMarginAccount(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<MarginAccount> {
  const blockNumber = await client.getBlockNumber();
  const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber } as const;
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
export async function getMarginEquity(
  marginBank: Address,
  account: Address,
  client: PublicClient,
  at?: bigint,
): Promise<Pick<MarginAccount, "equity" | "lockedCollateral" | "asOfBlock">> {
  const blockNumber = at ?? (await client.getBlockNumber());
  const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber } as const;
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
export async function listMarginEquities(
  marginBank: Address,
  accounts: readonly Address[],
  client: PublicClient,
  at?: bigint,
): Promise<Array<{ equity: bigint | null; lockedCollateral: bigint; asOfBlock: bigint }>> {
  const blockNumber = at ?? (await client.getBlockNumber());
  const abi = ReadsAbi.marginBankReadAbi;
  const out: Array<{ equity: bigint | null; lockedCollateral: bigint; asOfBlock: bigint }> = [];
  for (let from = 0; from < accounts.length; from += MARGIN_EQUITY_GROUP) {
    const targets = accounts
      .slice(from, from + MARGIN_EQUITY_GROUP)
      .map((account) => ({ address: marginBank, args: [account] as const }));
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
export async function getAccountHealth(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<AccountHealth> {
  const blockNumber = await client.getBlockNumber();
  const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber } as const;
  const [health, statusRaw] = await Promise.all([
    client.readContract({ ...bank, functionName: "getAccountHealth", args: [account] }),
    client.readContract({ ...bank, functionName: "getMarginStatus", args: [account] }),
  ]);
  const [equity, imReq, mmReq, cmReq] = health;
  return { equity, imReq, mmReq, cmReq, marginStatus: MARGIN_STATUS[Number(statusRaw)] ?? "Healthy" };
}

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
export type PerpHealthSnapshot =
  | {
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
    }
  | {
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
export async function getPerpRiskParams(pool: Address, client: PublicClient): Promise<PerpRiskParams> {
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
export async function getPerpHealthSnapshot(pool: Address, client: PublicClient): Promise<PerpHealthSnapshot> {
  const [ok, s] = await client.readContract({
    address: pool,
    abi: ReadsAbi.perpPoolReadAbi,
    functionName: "tryGetHealthSnapshot",
  });
  if (!ok) return { priceable: false };
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
export async function getEffectiveImfBps(pool: Address, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: pool,
    abi: ReadsAbi.perpPoolReadAbi,
    functionName: "getEffectiveIMF",
  });
}

const BPS_DENOMINATOR = 10_000n;

/**
 *  The denominator behind the pool's `BPS_TIMES_1K` fee unit (`10000 × 1000`), from
 *  `getBpsOfValueFloor` in `common/Common.sol`. Only the two fee fields use it; every
 *  margin figure is plain bps.
 */
const BPS_TIMES_1K_DENOMINATOR = 10_000_000n;

/**
 *  Ceiling division, matching the protocol's `divCeil` in `common/Common.sol`.
 *
 *  The contract ceils each margin component, so flooring here would under-quote by up
 *  to a wei per component — enough to preview an order as affordable that the chain
 *  then rejects.
 */
function divCeil(a: bigint, b: bigint): bigint {
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
function divFloor(a: bigint, b: bigint): bigint {
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
function divCeilSigned(a: bigint, b: bigint): bigint {
  const q = a / b;
  return a % b !== 0n && a < 0n === b < 0n ? q + 1n : q;
}

/** Absolute value of a signed raw amount. */
function abs(v: bigint): bigint {
  return v < 0n ? -v : v;
}

/** The smaller of two raw amounts — the contract's `minUint256`, for the funding legs. */
function minBig(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

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
export function perpLiquidationPrice(p: PerpLiquidationPriceInputs): bigint | null {
  if (p.size === 0n) return null;
  const long = p.size > 0n;
  // A long's buffer is consumed at (1 − mmBps/10000) per unit of price, a short's at
  // (1 + mmBps/10000): a rising mark grows a short's maintenance requirement in the
  // same direction it erodes its equity, while it shrinks a long's. That asymmetry is
  // the entire content of the correction factor.
  const perUnit = long ? BPS_DENOMINATOR - p.maintenanceMarginBps : BPS_DENOMINATOR + p.maintenanceMarginBps;
  if (perUnit === 0n) return null;
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
export async function getLiquidationPrice(
  ref: PerpState.PerpPositionRef,
  client: PublicClient,
): Promise<bigint | null> {
  const blockNumber = await client.getBlockNumber();
  const bank = { address: ref.marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber } as const;
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
  if (position.size === 0n) return null;
  const [ok, snap] = snapshot;
  // Non-flat, so this pool is in the account's `activePerpPools`, so the health read
  // above walked it through the REVERTING `getHealthSnapshot` at this same block — an
  // unpriceable mark would have rejected the `Promise.all` before reaching this line.
  // (`tryGetHealthSnapshot`'s `ok` is contractually `isPerpPool.isPriceable()`, per
  // MarginBank's own note on `_tryComputeAccountHealth`.)
  if (!ok) unreachable("a non-flat position's pool cannot be unpriceable once getAccountHealth has resolved");
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
export async function getPerpLeverage(ref: PerpState.PerpPositionRef, client: PublicClient): Promise<PerpLeverage> {
  const blockNumber = await client.getBlockNumber();
  const bank = { address: ref.marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber } as const;
  const pool = { address: ref.pool, abi: ReadsAbi.perpPoolReadAbi, blockNumber } as const;
  const [position, snapshot, health, state, accountCap, protocolCap, creditFloor, voucherCap, voucherAllowed] =
    await Promise.all([
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
  const otherNotionals = await Promise.all(
    others.map(async (other) => {
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
    }),
  );
  const accountNotional = otherNotionals.reduce((sum, n) => sum + n, positionNotional);

  // `_validatePerpPoolParameters` keeps `initialMarginBps > maintenanceMarginBps > 0`,
  // and the dynamic IMF curve only ever scales that floor UP, so the effective IMF is
  // strictly positive on every live pool.
  if (effectiveIMFBps <= 0n) unreachable("a pool's effective IMF is >= initialMarginBps, which the pool keeps > 0");

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

// ---------------------------------------------------------------------------
// Position analytics — the per-position plane the account aggregate hides.
//
// `getAccountHealth` returns ONE equity figure for the whole account, and inside it
// every market's unrealized PnL and every market's funding have already been summed
// and netted against each other. That is the right shape for solvency and the wrong
// shape for a positions table: a trader looking at two positions cannot see which one
// is carrying the loss, and cannot see funding at all — a position up on price but
// bleeding funding is indistinguishable from one merely flat.
//
// So this splits `MarginBank._computePositionMetrics` (`:2155`) back apart. It is a
// port of that function and `_marketHealthFromSnapshot` (`:2204`), not an
// approximation of them, which is what lets the pieces re-sum to the bank's own
// equity to the wei — a property `perpPositionAnalytics`'s tests pin.
//
// The two roundings are NOT the same and must not be unified. Unrealized PnL
// truncates toward zero (`PerpMath.unrealizedPnl` is plain `int256` division), while
// the funding payment ceils toward +infinity (`divCeilInt`) so a payer always pays at
// least what is owed and a receiver receives at most it. That asymmetry is deliberate
// and load-bearing: the protocol adopted it after truncation let split payers
// collectively underpay a single receiver and left the MarginBank under-backed.

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
export function perpPositionAnalytics(p: PerpPositionAnalyticsInputs): PerpPositionMetrics {
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
    returnOnMarginBps:
      initialMarginRequirement === 0n ? null : divFloor(equityContribution * BPS_DENOMINATOR, initialMarginRequirement),
  };
}

/**
 * One position's analytics as of a block, or the market reporting itself unpriceable.
 *
 * @category perpetual markets
 */
export type PerpPositionAnalytics =
  | ({
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
    } & PerpPositionMetrics)
  | {
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
export async function getPerpPositionAnalytics(
  ref: PerpState.PerpPositionRef,
  client: PublicClient,
): Promise<PerpPositionAnalytics> {
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
  if (!ok) return { priceable: false, asOfBlock: blockNumber, pool: ref.pool, size: position.size };
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
export async function listPerpPositionAnalytics(
  p: { marginBank: Address; account: Address },
  client: PublicClient,
): Promise<PerpPositionAnalytics[]> {
  const blockNumber = await client.getBlockNumber();
  const state = await client.readContract({
    address: p.marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "getAccountState",
    args: [p.account],
    blockNumber,
  });
  return Promise.all(
    state.activePerpPools.map(async (pool) => {
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
      if (!ok) return { priceable: false, asOfBlock: blockNumber, pool, size: position.size } as const;
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
      } as const;
    }),
  );
}

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
export async function getPerpSideHolders(
  ref: PerpSideHoldersRef,
  opts: GetPerpSideHoldersOptions,
  client: PublicClient,
): Promise<PerpSideHolders> {
  const pageSize = opts.pageSize ?? 1000;
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new InvalidInputError(`pageSize must be a positive integer, got ${pageSize}`);
  }
  const asOfBlock = opts.blockNumber ?? (await client.getBlockNumber());
  const count = BigInt(pageSize);
  const holders: Address[] = [];
  for (let start = 0n; ; start += count) {
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
    if (page.length < pageSize) break;
  }
  return { holders, asOfBlock };
}

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
 *  Fills in the Solidity name on a MarginBank revert the read boundary left
 *  unnamed, by decoding against the errors DECLARED in `marginBankReadAbi` (see
 *  the note there for why the boundary's generated table can't). Structural
 *  no-op once that table covers MarginBank: `errorName` arrives set and this
 *  returns the error untouched.
 */
function nameMarginBankRevert(err: unknown): unknown {
  if (!(err instanceof ContractRevertError) || err.errorName !== undefined || !isHex(err.data)) {
    return err;
  }
  try {
    const decoded = decodeErrorResult({ abi: ReadsAbi.marginBankReadAbi, data: err.data });
    return new ContractRevertError(
      {
        errorName: decoded.errorName,
        args: decoded.args ?? [],
        data: err.data,
        address: err.address,
        functionName: err.functionName,
      },
      { cause: err },
    );
  } catch {
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
export async function getBankruptcyPrice(
  ref: PerpState.PerpPositionRef,
  opts: GetBankruptcyPriceOptions,
  client: PublicClient,
  ownedFailure: (error: unknown) => boolean = () => false,
): Promise<bigint> {
  try {
    return await client.readContract({
      address: ref.marginBank,
      abi: ReadsAbi.marginBankReadAbi,
      functionName: "getBankruptcyPrice",
      args: [ref.account, ref.pool],
      blockNumber: opts.blockNumber,
    });
  } catch (err: unknown) {
    if (ownedFailure(err)) throw err;
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
function depositCall(w: WriterCtx, bank: Address, p: DepositMarginParams): Writer.WriteCall {
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
function assertDepositAmount(p: DepositMarginParams): void {
  if (p.amount <= 0n) throw new InvalidInputError("amount must be > 0");
}

/** Split out of {@link withdrawMargin} — see {@link depositCall}. */
function withdrawCall(w: WriterCtx, bank: Address, p: WithdrawMarginParams): Writer.WriteCall {
  return {
    address: bank,
    abi: TradeAbi.marginBankWriteAbi,
    functionName: "withdraw",
    args: [p.amount],
    gas: p.gas ?? w.defaultGas,
  };
}

export async function depositMargin(w: WriterCtx, p: DepositMarginParams): Promise<TxResult> {
  assertDepositAmount(p);
  const gas = p.gas ?? w.defaultGas;
  const bank = await w.resolveMarginBank(p);
  const call = depositCall(w, bank, p);
  // The BANK pulls the collateral (not the pool) — approve the bank, in the
  // same executor call as the deposit.
  const prerequisites: Writer.Prerequisite[] = [];
  if (p.autoApprove !== false) {
    const collateral = await w.bankCollateral(bank, p.collateral);
    const approval = await w.approvalIfNeeded(collateral, bank, p.amount, gas);
    if (approval) prerequisites.push(approval);
  }
  return w.execute(call, prerequisites);
}

export async function withdrawMargin(w: WriterCtx, p: WithdrawMarginParams): Promise<TxResult> {
  const bank = await w.resolveMarginBank(p);
  return w.execute(withdrawCall(w, bank, p));
}

// ---------------------------------------------------------------------------
// Build-only margin writes. The two flows that have to be atomic on the way in
// and out: approve + deposit, and withdraw + forward to the user's wallet. The
// sending verbs cannot express either, because one write is one transaction.
// ---------------------------------------------------------------------------

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
export async function buildDepositMargin(w: WriterCtx, p: DepositMarginParams): Promise<UnsignedMarginDeposit> {
  assertDepositAmount(p);
  const bank = await w.resolveMarginBank(p);
  const deposit = Writer.toUnsigned(
    w.chain.id,
    depositCall(w, bank, p),
    `Deposit ${p.amount} collateral into MarginBank ${bank}`,
  );
  if (p.autoApprove === false) return { deposit };
  const collateral = await w.bankCollateral(bank, p.collateral);
  return {
    deposit,
    approval: Writer.approvalCall(
      w.chain.id,
      collateral,
      bank,
      `Approve collateral ${collateral} for MarginBank ${bank}`,
    ),
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
export async function buildWithdrawMargin(w: WriterCtx, p: WithdrawMarginParams): Promise<Writer.UnsignedCall> {
  const bank = await w.resolveMarginBank(p);
  return Writer.toUnsigned(
    w.chain.id,
    withdrawCall(w, bank, p),
    `Withdraw ${p.amount} collateral from MarginBank ${bank}`,
  );
}

export async function setPerpLeverage(w: WriterCtx, p: SetPerpLeverageParams): Promise<TxResult> {
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
 *  What a perp order will cost and whether it will be accepted, computed BEFORE
 *  sending it.
 *
 *  A discriminated union: an unpriceable market yields no preview at all, because
 *  every component below needs the mark. Narrow on `priceable` first.
 *
 * @category perpetual markets
 */
export type PerpOrderMarginPreview =
  | {
      /**
       *  The pool's mark feed is stale or zero. Placement of any order with an
       *  increasing leg would revert on the contract's own freshness gate, so there is
       *  nothing to preview — and no field here could be trusted if there were.
       */
      priceable: false;
      /** The block every read was pinned to. */
      asOfBlock: bigint;
    }
  | {
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
      wallet: { balance: bigint; allowance: bigint } | null;
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
  wallet?: { balance: bigint; allowance: bigint };
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
export function perpOrderMarginQuote(p: PerpOrderMarginQuoteInputs): PerpOrderMarginQuote {
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
  } else if (!p.isBid && p.markPrice > p.price) {
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
  const effectiveLeverage =
    voucherActive && !voucherBlocked && (p.accountMaxLeverageX === 0 || p.accountMaxLeverageX > p.voucherLeverageCapX)
      ? p.voucherLeverageCapX
      : p.accountMaxLeverageX;

  // A stricter leverage cap raises the required IM above the market's. The lock
  // already reserved the market rate, so only the DELTA is charged, and it is charged
  // on post-fill notional rather than just the new leg.
  const cap =
    p.protocolMaxLeverageX > 0 && effectiveLeverage > p.protocolMaxLeverageX
      ? p.protocolMaxLeverageX
      : effectiveLeverage;
  const leverageImBps = cap === 0 ? 0n : divCeil(BPS_DENOMINATOR, BigInt(cap));
  const appliedImBps = leverageImBps > p.effectiveImfBps ? leverageImBps : p.effectiveImfBps;
  const existingNotional = (abs(p.positionSize) * p.markPrice) / p.oneBase;
  const additionalNotional = (increasingQuantity * p.price) / p.oneBase;
  const leverageSurcharge =
    appliedImBps > p.effectiveImfBps && increasingQuantity > 0n
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
  if (
    p.wallet != null &&
    increasingQuantity > 0n &&
    !voucherBlocked &&
    p.unlockedCollateral >= 0n &&
    required > p.unlockedCollateral
  ) {
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
  const meetsInitialMargin =
    increasingQuantity === 0n || p.equity + pulled - lockAmount >= p.imRequirement + leverageSurcharge;

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
    sufficient:
      hasCollateralForLock &&
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
async function readPerpPlacementState(
  p: { pool: Address; marginBank: Address; account: Address; autoPull?: boolean },
  client: PublicClient,
  blockNumber: bigint,
) {
  const pool = { address: p.pool, abi: ReadsAbi.perpPoolReadAbi, blockNumber } as const;
  const bank = { address: p.marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber } as const;

  // The mark is read FIRST and alone, rather than inside the fan-out below, because
  // `getAccountHealth` walks every market the account is active in and reaches each
  // one through the REVERTING `getHealthSnapshot()`. For an account holding a position
  // in this market, a stale mark therefore reverts the health read too — and inside a
  // `Promise.all` that rejection would take the whole call down before the unpriceable
  // arm could be returned, making `{ priceable: false }` unreachable in exactly the
  // case it exists to describe. Both round-trips are pinned to the same block, so
  // splitting them costs a round-trip and no atomicity.
  const [ok, snap] = await client.readContract({ ...pool, functionName: "tryGetHealthSnapshot" });
  if (!ok) return null;

  const [
    capacity,
    state,
    health,
    leverage,
    leverageLimit,
    creditFloor,
    voucherCap,
    voucherAllowed,
    restricted,
    isolationAllowed,
    params,
    systemConfig,
  ] = await Promise.all([
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
  let wallet: { balance: bigint; allowance: bigint } | null = null;
  let fundingPayer: Address | null = null;
  let mainWalletCapacity: bigint | null = null;
  let mainFundingBlocked = false;
  if (systemConfig !== undefined) {
    const token = { address: systemConfig.collateralToken, abi: ReadsAbi.erc20ReadAbi, blockNumber } as const;
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

export async function previewPerpOrderMargin(
  p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    quantity: bigint;
    price: bigint;
    autoPull?: boolean;
    builderFeeBpsTimes1k?: bigint;
  },
  client: PublicClient,
): Promise<PerpOrderMarginPreview> {
  const blockNumber = await client.getBlockNumber();
  const st = await readPerpPlacementState(p, client, blockNumber);
  if (st === null) return { priceable: false, asOfBlock: blockNumber };

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
export async function meetsPerpImForFill(
  p: { marginBank: Address; account: Address; pool: Address; additionalSize: bigint; price: bigint },
  client: PublicClient,
): Promise<boolean> {
  return client.readContract({
    address: p.marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "meetsIMForFill",
    args: [p.account, p.pool, p.additionalSize, p.price],
  });
}

/**
 * Which gate stopped the size going one lot higher.
 *
 * @category perpetual markets
 */
export type PerpMaxOrderSizeLimit =
  /** The unlocked balance cannot cover the next lot's lock. */
  | "collateral"
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
export type PerpMaxOrderSize =
  | {
      /** The pool's mark feed is stale or zero, so no size can be quoted. */
      priceable: false;
      /** The block every read was pinned to. */
      asOfBlock: bigint;
    }
  | {
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
      wallet: { balance: bigint; allowance: bigint } | null;
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
function bindingWallet(
  quote: PerpOrderMarginQuote,
  wallet: { balance: bigint; allowance: bigint } | null,
  mainWalletCapacity: bigint | null,
): PerpMaxOrderSizeLimit {
  // A withheld leg first: neither wallet is the fix, the outstanding claim is.
  if (quote.mainFundingBlocked) return "mainFundingBlocked";
  if (mainWalletCapacity !== null) return "mainWallet";
  return quote.topUpRequired > (wallet?.balance ?? 0n) ? "walletBalance" : "walletAllowance";
}

export async function getMaxPerpOrderSize(
  p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    price: bigint;
    autoPull?: boolean;
    builderFeeBpsTimes1k?: bigint;
  },
  client: PublicClient,
): Promise<PerpMaxOrderSize> {
  if (p.price <= 0n) throw new InvalidInputError("price must be > 0");
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
  if (st === null) return { priceable: false, asOfBlock: blockNumber };

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
  } as const;
  const quoteAt = (q: bigint) => perpOrderMarginQuote({ ...base, quantity: q });

  // `_enforceMaxPositionSize` (PerpPool.sol:1865). Its escape clause — a fill that does
  // not GROW an already-over-cap position is allowed — is what keeps this monotone on
  // the opposite side, where the position first shrinks toward zero before flipping.
  const withinPositionCap = (q: bigint): boolean => {
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
  const needsNoPull = (q: bigint) => quoteAt(q).topUpRequired === 0n;
  let qStar = ceiling;
  if (!needsNoPull(ceiling)) {
    let plo = 0n;
    let phi = ceiling;
    while (phi - plo > 1n) {
      const mid = plo + (phi - plo) / 2n;
      if (needsNoPull(mid)) plo = mid;
      else phi = mid;
    }
    qStar = plo;
  }
  const meetsImAtBoundary = quoteAt(qStar).meetsInitialMargin;

  const fits = (q: bigint): boolean =>
    q <= 0n || (withinPositionCap(q) && (q <= qStar || meetsImAtBoundary) && quoteAt(q).sufficient);

  let lo = 0n;
  let hi = ceiling;
  while (hi - lo > 1n) {
    const mid = lo + (hi - lo) / 2n;
    if (fits(mid)) lo = mid;
    else hi = mid;
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
  let limitedBy: PerpMaxOrderSizeLimit = "initialMargin";
  if (nextQuote.isolationBlocked) limitedBy = "isolated";
  else if (nextQuote.restrictedBlocked) limitedBy = "restricted";
  else if (nextQuote.voucherBlocked) limitedBy = "voucherBlocked";
  else if (!withinPositionCap(next)) limitedBy = "maxPositionSize";
  else if (!nextQuote.walletCoversTopUp) limitedBy = bindingWallet(nextQuote, wallet, mainWalletCapacity);
  else if (!nextQuote.hasCollateralForLock) limitedBy = "collateral";

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
export async function quoteMeetsPerpImForOrder(
  p: { marginBank: Address; account: Address; pool: Address; additionalSize: bigint; price: bigint },
  client: PublicClient,
): Promise<boolean> {
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
export async function getPerpLeverageImSurcharge(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<bigint> {
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
export async function tryGetPerpLeverageImSurcharge(
  marginBank: Address,
  account: Address,
  client: PublicClient,
  ownedFailure: (error: unknown) => boolean = () => false,
): Promise<bigint | null> {
  try {
    return await getPerpLeverageImSurcharge(marginBank, account, client);
  } catch (e) {
    // This exact read's transport outcome cannot mean bank capability absence.
    if (ownedFailure(e)) throw e;
    // An EMPTY revert is what a dispatcher raises for a selector it does not
    // declare, and it satisfies isRevert too — so exclude it explicitly. The
    // documented `null` is the bank's own rejection, which names an error.
    if (Revert.isRevert(e) && !Revert.isMissingContractView(e)) return null;
    throw Revert.toSdkError(e, "readContract getLeverageImSurcharge", {
      address: marginBank,
      functionName: "getLeverageImSurcharge",
    });
  }
}

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
export async function getPerpMaxLeverage(
  ref: PerpState.PerpPositionRef,
  opts: GetPerpMaxLeverageOptions,
  client: PublicClient,
  ownedFailure: (error: unknown) => boolean = () => false,
): Promise<number> {
  try {
    return await client.readContract({
      address: ref.marginBank,
      abi: ReadsAbi.marginBankReadAbi,
      functionName: "getMaxLeverage",
      args: [ref.account, ref.pool],
      blockNumber: opts.blockNumber,
    });
  } catch (err: unknown) {
    if (ownedFailure(err)) throw err;
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
export async function quotePerpOrderTopUp(
  p: {
    marginBank: Address;
    pool: Address;
    account: Address;
    lockAmount: bigint;
    feeHeadroom: bigint;
    increasingQuantity: bigint;
    price: bigint;
  },
  client: PublicClient,
): Promise<bigint> {
  return client.readContract({
    address: p.marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "quoteOrderTopUp",
    args: [p.account, p.pool, p.lockAmount, p.feeHeadroom, p.increasingQuantity, p.price],
  });
}

/**
 *  Where an order would put the liquidation price if it filled — and where it sits
 *  now, for the comparison that is the actual question.
 *
 *  A discriminated union: an unpriceable market yields no preview, because the mark is
 *  an input to every field below. Narrow on `priceable` first.
 *
 * @category perpetual markets
 */
export type PerpLiquidationPreview =
  | {
      /**
       *  The pool's mark feed is stale or zero, so there is nothing to project
       *  against — and an order with an increasing leg would revert on the contract's
       *  own freshness gate anyway.
       */
      priceable: false;
      /** The block every read was pinned to. */
      asOfBlock: bigint;
    }
  | {
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
export async function previewPerpLiquidationPrice(
  p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    isBid: boolean;
    quantity: bigint;
    price: bigint;
    asMaker?: boolean;
  },
  client: PublicClient,
): Promise<PerpLiquidationPreview> {
  if (p.quantity <= 0n) throw new InvalidInputError("quantity must be > 0");
  if (p.price <= 0n) throw new InvalidInputError("price must be > 0");

  const blockNumber = await client.getBlockNumber();
  const pool = { address: p.pool, abi: ReadsAbi.perpPoolReadAbi, blockNumber } as const;
  const bank = { address: p.marginBank, abi: ReadsAbi.marginBankReadAbi, blockNumber } as const;

  // The mark is read FIRST and alone, for the same reason `previewPerpOrderMargin`
  // does it: `getAccountHealth` reaches every market the account is active in through
  // the REVERTING `getHealthSnapshot`, so for an account already holding a position
  // here a stale mark rejects the health read too — and inside a `Promise.all` that
  // rejection would take the call down before the unpriceable arm could be returned,
  // making `{ priceable: false }` unreachable in exactly the case it describes.
  const [ok, snap] = await client.readContract({ ...pool, functionName: "tryGetHealthSnapshot" });
  if (!ok) return { priceable: false, asOfBlock: blockNumber };

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
  let projectedSize: bigint;
  let projectedEntryPrice: bigint;
  let realizedPnl = 0n;
  if (size === 0n) {
    // Case 1 — open.
    projectedSize = delta;
    projectedEntryPrice = p.price;
  } else if (size > 0n === delta > 0n) {
    // Case 2 — increase. `PerpMath.vwap` floors, so plain bigint division matches
    // (both operands are non-negative here).
    projectedSize = size + delta;
    projectedEntryPrice = (absSize * entry + p.quantity * p.price) / (absSize + p.quantity);
  } else {
    // Cases 3 + 4 — reduce/close, or flip. Both realize PnL on the portion closed;
    // only a flip re-opens at the fill price.
    const sign = size > 0n ? 1n : -1n;
    const closed = p.quantity <= absSize ? p.quantity : absSize;
    realizedPnl = divFloor((p.price - entry) * sign * closed, oneBase);
    projectedSize = size + delta;
    if (p.quantity > absSize) {
      projectedEntryPrice = p.price; // Case 4 — the remainder opens fresh.
    } else {
      // Case 3 — a partial close leaves the entry alone; a full close clears it.
      projectedEntryPrice = projectedSize === 0n ? 0n : entry;
    }
  }

  // ---- fee (`PerpPool._chargeFees` on fill notional, floored) ----
  const fillNotional = (p.quantity * p.price) / oneBase;
  const feeBpsTimes1k = p.asMaker === true ? params.makerFeeBpsTimes1k : params.takerFeeBpsTimes1k;
  // A negative maker rate is a REBATE: the contract computes it off the absolute rate
  // and pays it out, so it lands here as a negative fee, i.e. a credit to equity.
  const fee =
    feeBpsTimes1k >= 0n
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

// ---------------------------------------------------------------------------
// Closing a position — what the close modal actually needs.
//
// Two things make this more than `(mark - entry) x quantity`, and both of them are
// silent: nothing reverts, the number is just wrong.
//
// The size is not the size you asked for. `PerpPool._placeOrder` requires
// `quantity % lotSize == 0`, so a close is aligned DOWN to the lot grid first, and only
// the aligned share realises. Ask to close 100% of a position that is not a lot multiple
// and a remainder stays open — a "close all" that leaves dust behind, which reads as a
// bug in the close button rather than in the arithmetic.
//
// Funding settles on the WHOLE position, not the closed share. `settleTrade` calls
// `_settleFundingWithValues` BEFORE it touches the position (`MarginBank.sol:324`), and
// that uses `pos.size` — the full size. So a 10% close settles 100% of the accrued
// funding. Pro-rating it to the closed share, which is the intuitive thing to do,
// under-states the cash impact by the other 90%.

/**
 * What closing part or all of a position would realise.
 *
 * @category perpetual markets
 */
export type PerpClosePreview =
  | {
      /** The pool's mark feed is stale or zero, so nothing can be marked. */
      priceable: false;
      /** The block every read was pinned to. */
      asOfBlock: bigint;
    }
  | {
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
export async function previewPerpClosePnl(
  p: {
    pool: Address;
    marginBank: Address;
    account: Address;
    quantity?: bigint;
    price?: bigint;
    asMaker?: boolean;
  },
  client: PublicClient,
): Promise<PerpClosePreview> {
  if (p.quantity != null && p.quantity < 0n) throw new InvalidInputError("quantity must be >= 0");
  if (p.price != null && p.price <= 0n) throw new InvalidInputError("price must be > 0");
  const blockNumber = await client.getBlockNumber();
  const pool = { address: p.pool, abi: ReadsAbi.perpPoolReadAbi, blockNumber } as const;
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
  if (!ok) return { priceable: false, asOfBlock: blockNumber };

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
  const realizedPnl =
    closedQuantity === 0n || size === 0n
      ? 0n
      : divFloor((fillPrice - position.avgEntryPrice) * sizeSign * closedQuantity, oneBase);

  // On the WHOLE position. `settleTrade` settles funding before mutating anything, so
  // the closed share is irrelevant to this term.
  const fundingSettled =
    size === 0n
      ? 0n
      : divCeilSigned(
          size * (snap.projectedCumulativeFunding - position.entryFundingIndex),
          FUNDING_PRECISION * oneBase,
        );

  const fillNotional = (closedQuantity * fillPrice) / oneBase;
  const feeBpsTimes1k = p.asMaker === true ? params.makerFeeBpsTimes1k : params.takerFeeBpsTimes1k;
  // A negative maker rate is a REBATE: the contract computes it off the absolute rate and
  // pays it out, so it lands here as a negative fee — a credit.
  const fee =
    feeBpsTimes1k >= 0n
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
