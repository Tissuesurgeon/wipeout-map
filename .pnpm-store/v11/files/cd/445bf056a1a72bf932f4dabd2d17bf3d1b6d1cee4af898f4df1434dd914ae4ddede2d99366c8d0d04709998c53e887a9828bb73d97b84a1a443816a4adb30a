// Perp history — the indexed record of funding, margin and liquidation events.
//
// PERP-ONLY entities, each its own stream: funding payments (per position, per
// settlement), margin events (deposits/withdrawals), liquidations, and the
// funding-rate / open-interest time series a chart reads.

// ---------------------------------------------------------------- perp history
// The perp ACCOUNT plane the indexer records (A6/A7): funding payments, margin
// deposits/withdraws/locks, liquidations, and per-pool funding-rate + OI
// history. Current position/margin state is a CHAIN read (getPerpPosition /
// getMarginAccount / getAccountHealth) — these are the append-only history.

import { type ResultOf } from "@graphql-typed-document-node/core";
import * as IndexerRead from "../indexerRead.js";
import { graphql } from "../gql/gql.js";
import { IndexerError, InvalidInputError, PerpPositionChangesUnavailableError } from "../errors.js";
import type { FillRow } from "../fills.js";
// Type-only, for the TSDoc cross-references below — the module split moved PerpMarket
// into markets.ts, which silently broke links that resolved while both lived in query.ts.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TypeDoc resolves the links from this import.
import type { PerpMarket } from "../markets.js";
/**
 *  A signed funding payment (mirror of the indexer `FundingPayment` entity).
 *  `amount` is signed raw collateral: **positive is what the account pays**,
 *  negative is what it receives.
 *
 *  **Details.** The sign is the on-chain one, passed straight through from
 *  `MarginBank.FundingSettled`'s `int256 payment` — the indexer does not negate
 *  it, and neither does this type. `MarginBank` debits the account when
 *  `payment > 0` and credits it when `payment < 0`, and `IMarginBank` documents
 *  the event parameter as "positive = paid by account, negative = received by
 *  account". Keeping the pass-through is what lets a caller reconcile the value
 *  against the chain and against the cumulative funding index. It is the same
 *  direction as {@link PerpPositionMetrics.accruedFunding}, which is a cost
 *  subtracted from equity, and as `docs/PERPS.md`'s `fundingSettled`.
 *
 *  **Gotchas.** To display "paid" or "received" to a user, branch on
 *  `amount > 0n` meaning paid. A row read as though positive meant received
 *  labels every funding transfer the wrong way round.
 *
 * @example Label a settled funding row for a user
 * ```ts
 * // Positive `amount` = the account PAID this much funding.
 * const paid: Pick<FundingPayment, "amount"> = { amount: "2226" };
 * const label = BigInt(paid.amount) > 0n ? "paid" : "received";
 * // label === "paid"
 * ```
 *
 * @category perpetual markets
 */
export type FundingPayment = {
  /** Payment id (`${txHash}_${logIndex}`). */
  id: string;
  /**
   *  Chain the row came from: the chain of the engine that read or built it.
   *
   *  The indexer row has no chain column, so the SDK stamps it. `id` is unique on
   *  one chain only, so a caller that merges two chains keys on `(chainId, id)`.
   */
  chainId: number;
  /** Account (lowercased). */
  account: string;
  /** Perp pool (lowercased); null when unlinked. */
  pool: string | null;
  /** Signed funding payment (raw collateral; positive = paid by the account, negative = received). */
  amount: string;
  /** Timestamp (unix seconds) the funding settled. */
  timestamp: string;
  /** Tx hash the settlement landed in. */
  txHash: string;
};

/**
 *  A margin-account movement type that the {@link GetMarginEventsOptions.kinds} filter
 *  accepts.
 *
 *  A closed union, so a filter cannot be misspelled into an empty page. The row's own
 *  {@link MarginEvent.kind} stays a `string`, because the deployed indexer can write a
 *  kind a pinned SDK does not know.
 *
 * @category perpetual markets
 */
export type MarginEventKind = "Deposit" | "Withdraw" | "Locked" | "Unlocked" | "Credited";

/**
 *  Filters and pagination for {@link SomniaMarketsClient.getMarginEvents | client.getMarginEvents}.
 *
 * @category perpetual markets
 */
export interface GetMarginEventsOptions {
  /**
   *  Only movements of these types. The indexer applies the filter, so a page holds only
   *  rows of these kinds. Omit it to read every kind.
   *
   *  `["Deposit", "Credited", "Withdraw"]` keeps the money that moved into or out of the
   *  account and leaves out the order locks and unlocks. A portfolio-return calculation
   *  needs only those three kinds.
   *
   *  An empty array matches nothing, as in `listPerpPositionChanges`. A value outside the
   *  union throws `InvalidInputError` before the request, because it would match no row
   *  and read as an account with no such movements.
   */
  kinds?: readonly MarginEventKind[];
  /**
   * Rows per page.
   *
   * @default 50
   */
  limit?: number;
  /**
   * Rows to skip.
   *
   * @default 0
   */
  offset?: number;
}

/**
 * A margin-account movement (mirror of the indexer `MarginEvent` entity).
 *
 * @category perpetual markets
 */
export type MarginEvent = {
  /** Event id (`${txHash}_${logIndex}`). */
  id: string;
  /** Account (lowercased). */
  account: string;
  /** Deposit | Withdraw | Locked | Unlocked | Credited. */
  kind: string;
  /**
   *  Perp pool the (un)lock targets (lowercased); null on Deposit/Withdraw/Credited,
   *  which are account-scoped. Was omitted from the query selection despite existing on
   *  the entity, so it read as always-null.
   */
  pool: string | null;
  /** Collateral moved (raw units). */
  amount: string;
  /** Who granted the credit (`Credited` only) — the voucher/credit rail. */
  granter: string | null;
  /** Timestamp (unix seconds) of the movement. */
  timestamp: string;
  /** Tx hash the movement landed in. */
  txHash: string;
};

/**
 *  Every value {@link LiquidationEvent.kind} can carry, in the order the waterfall
 *  emits them. The vocabulary {@link ListLiquidationsOptions.kind} and
 *  {@link ListLiquidationsOptions.kinds} filter on, so a
 *  filter cannot be spelled wrong.
 *
 * @category perpetual markets
 */
export const LIQUIDATION_KIND = [
  "AccountLiquidated",
  "PositionLiquidated",
  "PositionSkipped",
  "PositionTakenOver",
  "AutoDeleveraged",
  "Throttled",
  "KeeperReward",
  "OrderPanicked",
  "PositionTransferred",
  "CloseOutMarginSettled",
  "BadDebtAbsorbed",
  "ResidualBadDebt",
  "AdlPriceCapacityExhausted",
  "ResidualBackedByOpenPnl",
  "CoverageDeclined",
  "AdlSessionDiscarded",
  "AdlCapacityShortfall",
] as const;

/** One stage of the liquidation waterfall. @category perpetual markets */
export type LiquidationKind = (typeof LIQUIDATION_KIND)[number];

/**
 *  Whether a wire `kind` is one this SDK version knows, narrowing it to
 *  {@link LiquidationKind}.
 *
 *  This is the seam between the open rows and the closed filter, and it exists
 *  because the two really are different: {@link LiquidationEvent.kind} is whatever
 *  the DEPLOYED indexer wrote, which can outrun a pinned SDK, while
 *  {@link ListLiquidationsOptions.kind} and {@link ListLiquidationsOptions.kinds}
 *  are values the caller chooses and must not
 *  be able to misspell. Narrow a row's kind to switch on it exhaustively, or to
 *  pass it back into the filter; the false branch is the honest "a kind this
 *  version does not know" rather than a cast over it.
 *
 * @category perpetual markets
 */
export function isLiquidationKind(kind: string): kind is LiquidationKind {
  return LIQUIDATION_KIND.some((known) => known === kind);
}

/**
 *  A liquidation event (mirror of the indexer `LiquidationEvent` entity). All
 *  numeric fields are raw units; any may be null when the source event didn't
 *  carry it.
 *
 * @category perpetual markets
 */
export type LiquidationEvent = {
  /** Event id (`${txHash}_${logIndex}`). */
  id: string;
  /**
   *  Chain the row came from: the chain of the engine that read or built it.
   *
   *  The indexer row has no chain column, so the SDK stamps it. `id` is unique on
   *  one chain only, so a caller that merges two chains keys on `(chainId, id)`.
   */
  chainId: number;
  /** Liquidated account (lowercased). */
  account: string;
  /** Perp pool (lowercased); null on account-scoped rows. */
  pool: string | null;
  /**
   *  WHICH stage of the liquidation/deleveraging waterfall this row is. **Read this
   *  first** — the rows are stages of one mechanism, not repetitions of one event, and
   *  without it an ADL leg is indistinguishable from a liquidation:
   *
   *    AccountLiquidated         account-level summary (positionsProcessed, stageReached)
   *    PositionLiquidated        per-position liquidation (size, price)
   *    PositionSkipped           below min quantity, left in place (size)
   *    PositionTakenOver         stage-4 backstop takeover (counterparty = bidder, price)
   *    AutoDeleveraged           ADL leg (counterparty absorbed it; price = bankruptcy price)
   *    Throttled                 DEFERRED by the pool's per-block volume cap
   *    KeeperReward              paid to the keeper that ran it (counterparty = keeper)
   *    OrderPanicked             the liquidation IOC reverted with a Solidity PANIC
   *    PositionTransferred       stage-4 transfer (counterparty, size)
   *    CloseOutMarginSettled     stage-4 close-out margin flow (counterparty)
   *    BadDebtAbsorbed           the fund was ASKED to cover (insuranceCovered, deficit,
   *                              counterparty = fund). It fires on the request, not on the
   *                              payment: `insuranceCovered` may be 0. Read that field
   *                              before you conclude the fund paid.
   *    ResidualBadDebt           uncovered, INSOLVENT hole after the waterfall (badDebt)
   *    AdlPriceCapacityExhausted terminal: hole exceeds aggregate position capacity (badDebt)
   *    ResidualBackedByOpenPnl   hole fully backed by the account's OWN open PnL (deficit, equity)
   *    CoverageDeclined          coverage the equity cap DEFERRED (coverageDeclined)
   *    AdlSessionDiscarded       ADL session abandoned; amount is on the same-tx BadDebtAbsorbed row
   *    AdlCapacityShortfall      ADL could not source enough capacity (size)
   *
   *  A `string`, not {@link LiquidationKind}: the row carries what the DEPLOYED
   *  indexer wrote, which can outrun a pinned SDK. {@link isLiquidationKind}
   *  narrows it for an exhaustive switch or to pass back into the filter.
   */
  kind: string;
  /**
   *  Signed size for the leg, where the event carries one (raw base units).
   *
   *  Signed, not absolute: `PositionLiquidated` emits a signed `sizeDelta`, and the sign
   *  is the side being closed.
   */
  size: string | null;
  /**
   *  Price for the leg (raw quote per whole base) — mark price, takeover price, or ADL
   *  bankruptcy price depending on `kind`.
   */
  price: string | null;
  /**
   *  The other side of the leg: the ADL counterparty who absorbed it, the takeover
   *  bidder, the transfer/close-out peer, or — on `BadDebtAbsorbed` — the Insurance Fund
   *  the engine ASKED to cover. Null on rows with no counterparty.
   *
   *  On `BadDebtAbsorbed` this names the fund that was asked, not one that paid. The
   *  address is recorded even when `insuranceCovered` is 0, so read that field to see
   *  whether any value moved.
   */
  counterparty: string | null;
  /** Penalty charged (raw collateral; reserved — not carried by current events). */
  penalty: string | null;
  /**
   *  The LEVEL of the account's uncovered, genuinely insolvent realized hole after this
   *  `liquidate()` call — `ResidualBadDebt`, or `AdlPriceCapacityExhausted` for the
   *  terminal price-capacity case (raw collateral).
   *
   *  **A level, not a flow — never SUM this across rows.** The underlying `residual` is a
   *  post-call state sample, so a later call on the same account re-reports the same
   *  (possibly changed) hole, and a stage-5 residual can co-fire with a terminal ADL one
   *  in a single call: two samples of one hole at two stages.
   *
   *  Sound aggregates: the **latest row per account** is that account's currently known
   *  uncovered hole (an upper bound — a deposit can repay it with no row here, see
   *  {@link MarginEvent}), and the **sum of those latest rows across accounts** is
   *  point-in-time system bad debt.
   *
   *  Deliberately narrow: what the fund actually paid is {@link LiquidationEvent.insuranceCovered},
   *  a gross pre-coverage hole is {@link LiquidationEvent.deficit}, and a deferred coverage
   *  decision is {@link LiquidationEvent.coverageDeclined}. Collateral that merely MOVED
   *  between accounts is in `collateralAmount`.
   */
  badDebt: string | null;
  /**
   *  Wei the Insurance Fund ACTUALLY moved — `BadDebtAbsorbed` only (raw collateral).
   *
   *  A **flow**, and the only summable amount here: rows are disjoint payments, so a SUM
   *  over any slice is exact fund outflow. A `insuranceCovered` below the same row's
   *  `deficit` does NOT mean the fund was underfunded — part of a hole is unattributable
   *  (a pre-existing balance, or funding owed), and that remainder surfaces as a
   *  `ResidualBadDebt` row instead.
   *
   *  `AdlSessionDiscarded` deliberately leaves this null: its absorption is the same
   *  `absorbBadDebt` call that emits `BadDebtAbsorbed` in the same transaction, so
   *  counting both would double the outflow. Join on `txHash`.
   */
  insuranceCovered: string | null;
  /**
   *  The GROSS realized hole a stage reported, before coverage (raw collateral) —
   *  `BadDebtAbsorbed` (the full negative balance) and `ResidualBackedByOpenPnl` (a hole
   *  the account's own open profit fully backs, so it is NOT bad debt; read `equity`
   *  alongside it, and note it becomes bad debt if the position reverses).
   *
   *  **A level, and overlapping per-stage views of one hole — never SUM, and never add to
   *  `badDebt`.** When `BadDebtAbsorbed` and `ResidualBadDebt` both fire in one call the
   *  balance moved only by what the fund paid, so `badDebt == deficit - insuranceCovered`
   *  for that call: a useful cross-row audit check, and the direct proof that summing the
   *  gross figure with the residual double-counts.
   */
  deficit: string | null;
  /**
   *  Attributable coverage the stage-5 equity cap did NOT pay — `CoverageDeclined` only
   *  (raw collateral).
   *
   *  A **flow** and summable as "total coverage deferred", but NOT a loss: the fund
   *  underwrites insolvency and the account was not insolvent by that much at that
   *  moment. If the backing later evaporates the hole returns as a pre-existing negative
   *  balance, which is unattributable by definition, so it is written off rather than
   *  re-declined (accepted policy, OQ-13).
   */
  coverageDeclined: string | null;
  /**
   *  Collateral that MOVED rather than was lost — `PositionTransferred` (collateral
   *  following the position) and `CloseOutMarginSettled`. Kept separate from `badDebt` so
   *  neither aggregate contaminates the other.
   */
  collateralAmount: string | null;
  /** Account equity where the event reports it (`ResidualBackedByOpenPnl`; signed). */
  equity: string | null;
  /** Positions processed (`AccountLiquidated` only). */
  positionsProcessed: string | null;
  /**
   *  The deepest waterfall stage that ACTED (`AccountLiquidated` only).
   *
   *  The protocol enum is 0-indexed and has six members. The published waterfall numbers its
   *  stages 1 to 6. The two do not line up, so map them with this table:
   *
   *    0  OrderCancellation   before stage 3 — cancelling the account's resting orders
   *                           alone restored health
   *    1  CLOBPartial         stage 3
   *    2  BidderTakeover      stage 4
   *    3  InsuranceFund       stage 5
   *    4  ADL                 stage 6
   *    5  Deferred            not a stage — stage 3 hit its per-block rate limit, and
   *                           stages 4 to 6 were not consulted. Ships dormant, so it does
   *                           not appear yet
   *
   *  Published stages 1 (Healthy) and 2 (Margin Call) are account states, not actions. The
   *  engine cannot reach them, so no value maps to them.
   *
   *  Two rules the number does not state on its own:
   *
   *  It names the deepest stage that ACTED, not the deepest stage consulted. A stage that
   *  ran and moved nothing does not promote it. So `BidderTakeover` (2) beside a
   *  `BadDebtAbsorbed` row is consistent, and means the fund was asked and paid nothing.
   *  Check `insuranceCovered` on that row to confirm.
   *
   *  `CLOBPartial` (1) is a fall-through marker. It means stages 4 to 6 were consulted and
   *  none of them acted. It does NOT prove stage 3 filled anything. Against an empty book
   *  you get `CLOBPartial` with a `positionsProcessed` of 0, which means the account's
   *  orders were cancelled and no position was closed. Always read `positionsProcessed`
   *  with this field.
   */
  stageReached: number | null;
  /** Margin status before / after (`AccountLiquidated` only). */
  marginStatusBefore: number | null;
  marginStatusAfter: number | null;
  /** Timestamp (unix seconds) of the row. */
  timestamp: string;
  blockNumber: string;
  /** Tx hash the row landed in. Stages of one liquidation share it. */
  txHash: string;
};

/**
 *  A funding-rate history point (mirror of the indexer `FundingRateUpdate`
 *  entity) — the append-only counterpart to the market row's overwrite-only
 *  funding fields.
 *
 * @category perpetual markets
 */
export type FundingRateUpdate = {
  /** Update id (`${pool}_${block}_${logIndex}`). */
  id: string;
  /** Perp pool (lowercased). */
  pool: string;
  /**
   *  Rate applied to THIS settlement, per CALCULATION WINDOW, 1e18-scaled, signed.
   *  Normalize with `fundingWindowSec` on this same row — see
   *  {@link normalizeFundingRate}.
   */
  fundingRate: string;
  /**
   *  Cumulative funding index AFTER this settlement (1e18 x quote units per whole base,
   *  signed, NOT monotonic). The ground truth for accrual: realized funding over any
   *  range is exactly `(end - start) / 1e18` raw quote units per whole base, with no
   *  interpolation and no gap reasoning. See {@link realizedFundingPerBase}.
   */
  cumulativeFundingPerUnit: string;
  /** Oracle index price at the update (raw quote per whole base, 18dp). */
  indexPrice: string;
  /**
   *  Best-effort mark-price cross-check. NULL when the contract emitted its 0 sentinel
   *  for a stale/reverting mark feed — never a price of zero. Unrelated to the premium
   *  driving the rate, which since DEX-2252 is the time-weighted IMPACT-price premium
   *  (quantity-weighted fill price at a configured notional on each side, deadbanded
   *  against the index), not a book midpoint.
   */
  markPrice: string | null;
  /**
   *  Intervals SPANNED, unclamped, as emitted — the timeline the anchor advanced over,
   *  not what accrued.
   *
   *  **This alone does not tell you whether anything was forgiven.** Compare it against
   *  `intervalsAccrued`: they are equal when the settlement charged its whole span, and
   *  `intervalsAccrued` is lower when the rest was forgiven at zero. A value above 1 is
   *  not enough on its own, because rows from before the one-interval horizon can have
   *  BOTH counts above 1 — a row spanning 264 intervals and accruing 96 forgave 168, and
   *  a row spanning 96 and accruing 96 forgave nothing.
   */
  intervalsSettled: string;
  /**
   *  What actually accrued, which is **not** `min(intervalsSettled, n)` — do not
   *  re-derive it that way. The contract's catch-up horizon charges at most **one
   *  interval** per settlement however long the gap, so a value below `intervalsSettled`
   *  means the excess was FORGIVEN at zero funding rather than deferred. The forgiven
   *  intervals are the OLDEST ones.
   *
   *  The indexer recovers this from the cumulative-index delta the settlement actually
   *  moved, rather than reading it off `intervalsSettled`, because the horizon belongs to
   *  the deployed contract and has changed more than once. So a row is correct for the
   *  implementation that produced it, anywhere in backfilled history.
   */
  intervalsAccrued: string;
  /** The rate's denominator in seconds, in force at this emit. Makes the row self-normalizing. */
  fundingWindowSec: number;
  /** Settlement cadence in seconds, in force at this emit. */
  fundingIntervalSec: number;
  /**
   *  Wall-clock span this settlement's accrual covers — the last `intervalsAccrued`
   *  intervals ending at the settlement anchor. It reaches BACKWARDS from the emit, which
   *  is why a funding chart must distribute a row across the buckets its span overlaps
   *  rather than credit it to the bucket containing it.
   *
   *  At the deployed one-interval horizon that span is usually one interval wide, so the
   *  distribution matters most for older rows: under the earlier horizons one lazily
   *  settled emit could cover a full calculation window.
   */
  spanStart: string;
  spanEnd: string;
  /**
   *  True when the settlement anchor had to be re-derived because the chain advanced it
   *  with NO event — the stale-oracle-with-zero-open-interest branch, where funding is
   *  permanently forgiven at zero and nothing is logged. A run of these means some
   *  funding time is covered by no row at all.
   */
  anchorResynced: boolean;
  /** Timestamp (unix seconds) of the update. */
  timestamp: string;
  blockNumber: string;
  txHash: string;
};

/**
 *  A funding-rate rollup bucket (mirror of the indexer `FundingRateCandle`) — for
 *  charting ranges the raw series is too dense for.
 *
 *  Each bucket is built by distributing every settlement across the buckets its covered
 *  span overlaps, weighted by seconds and normalized to a fixed per-8h axis. That is not
 *  an implementation detail: crediting a lazily-settled emit to the bucket containing its
 *  log renders a phantom spike of however many intervals it accrued, while the buckets the
 *  funding actually applied to render as paused. At the live hourly cadence an hourly
 *  bucket holds exactly ONE interval, so even a two-interval emit doubles one bucket and
 *  empties its neighbour.
 *
 * @category perpetual markets
 */
export type FundingRateCandle = {
  /** Bucket id (`${pool}_${intervalSeconds}_${bucketStart}`). */
  id: string;
  pool: string;
  /** 3600 | 14400 | 86400. */
  intervalSeconds: number;
  /** Bucket start (unix seconds). */
  bucketStart: string;
  /**
   *  Seconds-weighted mean rate, already on a per-8h basis, and zero-filled: seconds no
   *  settlement covered pull the mean toward zero rather than being dropped. So a
   *  partially covered bucket reads BELOW the rate that was in force — read `coverage` to
   *  tell that apart from a genuinely small rate.
   */
  avgFundingRate8h: string;
  /**
   *  Extremes over CONTRIBUTING settlements only — undiluted by coverage and NOT
   *  zero-filled, so they can legitimately sit outside `avgFundingRate8h` on a thinly
   *  covered bucket. Null when no settlement's span reached this bucket.
   */
  minFundingRate8h: string | null;
  maxFundingRate8h: string | null;
  /**
   *  Covered seconds / bucket seconds, 1e18-scaled — a true ratio in [0, 1]. This is what
   *  a chart should hatch or grey on: a bucket at `avgFundingRate8h: 0` with low coverage
   *  is a PAUSE, not a measurement of zero funding.
   */
  coverage: string;
  /**
   *  Cumulative funding index at this bucket's wall-clock START and END, attributed by
   *  covered seconds — the same basis as `avgFundingRate8h`.
   *
   *  Two exact properties follow, and both are what this pair is for:
   *
   *  - **Sparse buckets telescope.** `cumulativeFundingEnd` equals the next existing
   *    bucket's `cumulativeFundingStart`, even across a gap no settlement covered — the
   *    index is flat over uncovered time, so there is nothing to attribute.
   *  - **Range sums are exact.** `sum(end - start)` over any set of buckets is the funding
   *    that accrued over them; see {@link realizedFundingPerBase}.
   *
   *  These are ATTRIBUTION values, not chain samples. A catch-up settlement's whole span is
   *  spread across the buckets it covered rather than booked at its log, so an interior
   *  edge deliberately will NOT equal any `FundingRateUpdate.cumulativeFundingPerUnit`.
   *  Use {@link SomniaMarketsClient.listFundingRateHistory | client.listFundingRateHistory} when you want the sampled series itself.
   */
  cumulativeFundingStart: string;
  cumulativeFundingEnd: string;
  /** Params at the bucket's last settlement; `paramsChangedInBucket` flags a mid-bucket change. */
  fundingWindowSec: number;
  fundingIntervalSec: number;
  paramsChangedInBucket: boolean;
  indexPriceEnd: string | null;
  openInterestEnd: string | null;
  /** How many settlements contributed to this bucket. */
  updateCount: number;
};

/**
 *  A realized perp fee, rebate, or builder credit (mirror of the indexer
 *  `PerpFeeRecord` entity).
 *
 *  The perps fee rail, which is NOT the binary/spot one — {@link SomniaMarketsClient.listBuilderFees | client.listBuilderFees} and
 *  friends read `BuilderFeeRecord` / `ProtocolFeeRecord`, written by the market modules.
 *  These rows come off `MarginBank`, and `kind` says which rail within it.
 *
 * @category perpetual markets
 */
export type PerpFeeRecord = {
  /** Record id (`${txHash}_${logIndex}`). */
  id: string;
  /** Account charged or credited (lowercased). */
  account: string;
  /** Perp pool (lowercased); null on account-scoped rows. */
  pool: string | null;
  /** Amount moved (raw collateral, unsigned — read `isRebate` for the direction). */
  amount: string;
  /** True on `Rebate` (a credit TO the account); false on `Fee` / `BuilderFee` (a debit). */
  isRebate: boolean;
  /**
   *  Which rail:
   *
   *    Fee            taker/maker fee charged on a fill
   *    Rebate         maker rebate paid back
   *    BuilderFee     routing credit to a builder — the perps builder rail, previously
   *                   unindexed while the spot and binary ones were not
   *    LiquidationFee stage-3 health-preserving liquidation fee, routed WHOLLY to an
   *                   Insurance Fund tier (see `tier` / `fillNotional`)
   *
   *  No `LiquidationFee` rows exist yet: the event is in the protocol ABI but not in the
   *  deployed implementation, and the subscription is staged ahead of the upgrade that
   *  brings it.
   */
  kind: string;
  /**
   *  Portion of this fee routed to the Insurance Fund; null on `Rebate` / `BuilderFee`.
   *
   *  A component OF `amount`, never an addition to it — summing both double-counts. On
   *  `Fee` it is a split of a larger fee; on `LiquidationFee` it equals `amount`, because
   *  that fee goes wholly to a tier. Written on both so `SUM(insurancePortion)` is the
   *  fund's fee inflow without special-casing the kind.
   */
  insurancePortion: string | null;
  /** Insurance Fund tier credited (`LiquidationFee` only; `"0"` = general/unallocated). */
  tier: string | null;
  /**
   *  The liquidation IOC's quote fill notional, which the fee's rate cap applied to
   *  (`LiquidationFee` only) — so the effective rate is reconstructible per row without
   *  tracking the penalty-bps admin parameter.
   */
  fillNotional: string | null;
  /** Builder credited (`BuilderFee` only; lowercased). */
  builder: string | null;
  /** Timestamp (unix seconds). */
  timestamp: string;
  /** Tx hash the fee landed in. */
  txHash: string;
};

/**
 *  An open-interest snapshot (mirror of the indexer `OpenInterestSnapshot`
 *  entity).
 *
 * @category perpetual markets
 */
export type OpenInterestSnapshot = {
  /** Snapshot id (`${pool}_${block}_${logIndex}`). */
  id: string;
  /** Perp pool (lowercased). */
  pool: string;
  /**
   *  TOTAL open interest (raw base units) — one counter, not a long/short pair; see the
   *  `openInterest` field on {@link PerpMarket} for why.
   */
  openInterest: string;
  /** Timestamp (unix seconds) of the snapshot. */
  timestamp: string;
  /** Block the snapshot came from. */
  blockNumber: string;
};

/**
 *  An account's funding-payment history, newest first — optionally scoped to
 *  one pool, paginated.
 *
 *  Ordered by `(timestamp, id)`, which the live store and the plane hydration match
 *  exactly. Settlements share a block timestamp, so without the id tie-break a page
 *  boundary inside one timestamp keeps an arbitrary subset and the live and indexed
 *  halves of the same feed disagree about which rows exist.
 */
export async function getFundingPayments(
  account: string,
  opts: { pool?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.RequestContext,
): Promise<FundingPayment[]> {
  const where: Record<string, unknown> = { account: { _eq: account.toLowerCase() } };
  if (opts.pool != null) where.pool = { _eq: opts.pool.toLowerCase() };
  const data = await IndexerRead.gqlRequest(
    FundingPaymentsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  // The indexer row has no chain column; the owner's context names the chain.
  return data.FundingPayment.map((row) => ({ ...row, chainId: indexerUrl.chainId }));
}

/**
 *  An account's margin-account movement history (deposits/withdraws/locks),
 *  newest first — paginated. `kinds` narrows it to the given movement types at the
 *  indexer, so order locks and unlocks do not fill a page that asks for other kinds.
 */
export async function getMarginEvents(
  account: string,
  opts: GetMarginEventsOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<MarginEvent[]> {
  const where: Record<string, unknown> = { account: { _eq: account.toLowerCase() } };
  if (opts.kinds != null) where.kind = { _in: marginEventKindList(opts.kinds) };
  const data = await IndexerRead.gqlRequest(
    MarginEventsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.MarginEvent;
}

// The runtime copy of MarginEventKind, which a JavaScript caller does not have. The
// `Record` type makes the compiler reject a missing or an extra key, so this copy
// cannot drift from the union.
const MARGIN_EVENT_KINDS: Readonly<Record<MarginEventKind, true>> = {
  Deposit: true,
  Withdraw: true,
  Locked: true,
  Unlocked: true,
  Credited: true,
};

/**
 *  The `kinds` filter as a Hasura `_in` list, checked before the request.
 *
 *  An empty list is passed through and matches nothing, as `listPerpPositionChanges`
 *  does: asking for no kinds has an empty answer. A kind the indexer never writes also
 *  matches no row, but that is a mistake rather than a question, and the empty page would
 *  look like an account with no such movements. A JavaScript caller can pass any value,
 *  so a non-array or an unknown kind throws instead of reaching the indexer.
 */
function marginEventKindList(kinds: readonly MarginEventKind[]): MarginEventKind[] {
  if (!Array.isArray(kinds)) {
    throw new InvalidInputError("Margin event kinds must be an array");
  }
  for (const kind of kinds) {
    if (typeof kind !== "string" || !Object.hasOwn(MARGIN_EVENT_KINDS, kind)) {
      throw new InvalidInputError(
        `Margin event kinds must contain only ${Object.keys(MARGIN_EVENT_KINDS).join(", ")}; got ${String(kind)}`,
      );
    }
  }
  return [...kinds];
}

/**
 *  Filters and pagination for {@link SomniaMarketsClient.listLiquidations | client.listLiquidations}.
 *
 *  Named rather than inline because this shape is declared twice - here and on
 *  the client member - and SDK-TYPE-005 exists so the two cannot drift as the
 *  API grows.
 *
 * @category perpetual markets
 */
export interface ListLiquidationsOptions {
  /** The liquidated account. Use `party` to include every row involving a wallet.
   *  Case-insensitive: lowercased before the query. */
  account?: string;
  /** The other side of a liquidation leg. This is the takeover bidder on
   *  `PositionTakenOver`, the profitable side on `AutoDeleveraged`, the transfer
   *  or close-out peer on `PositionTransferred` and `CloseOutMarginSettled`, the
   *  keeper on `KeeperReward`, or the fund on `BadDebtAbsorbed`.
   *  Case-insensitive: lowercased before the query. */
  counterparty?: string;
  /** An address on either side of a row: `account` or `counterparty`.
   *  A keeper or fund also matches its `KeeperReward` or `BadDebtAbsorbed` rows.
   *  For position changes in a wallet view, combine `party` with `kind` or `kinds`.
   *  Compare each row's `account` with the wallet. If they differ, the wallet is
   *  the `counterparty`; `size` and `price` describe the liquidated account's
   *  leg. Read the {@link LiquidationEvent} field docs for each kind's meaning.
   *  Case-insensitive: lowercased before the query. */
  party?: string;
  /** Perp pool address. Case-insensitive: lowercased before the query. */
  pool?: string;
  /** A single stage to return. Matched EXACTLY as given and NOT lowercased,
   *  unlike the addresses above - it is the schema's own discriminator, so
   *  `"autodeleveraged"` would match nothing. A union rather than a `string`
   *  precisely because that miss is silent: an empty page reads as "no ADLs
   *  happened", so the typo has to be a compile error instead. */
  kind?: LiquidationKind;
  /** Several stages to return in one page. Matched exactly as given.
   *  An empty array adds no filter. If `kind` is also set, both filters apply. */
  kinds?: readonly LiquidationKind[];
  /** Rows per page. Defaults to 50. */
  limit?: number;
  /** Rows to skip. Defaults to 0.
   *
   *  The query carries a TOTAL order (`timestamp`, then `blockNumber`, then the
   *  `id` primary key), so the sequence is STABLE between requests — two reads of
   *  an unchanged table agree, which `timestamp` alone did not guarantee for rows
   *  sharing a block. That fixes tie ordering; it does not make offset paging
   *  snapshot-consistent against a LIVE table. See the note on `listLiquidations`. */
  offset?: number;
}

/**
 *  Liquidation events, newest first — filter by `account`, `counterparty`,
 *  `party`, `pool`, `kind`, and/or `kinds`,
 *  paginate.
 *
 *  `kind` is the filter that makes a bounded read meaningful. The rows are stages of one
 *  mechanism rather than repetitions of one event (see {@link LiquidationEvent.kind}), so
 *  one cascade produces many rows and an unfiltered `limit` is spent mostly on stages the
 *  caller did not ask about — a caller looking for `AutoDeleveraged` can have its whole
 *  page consumed by the summary and per-position legs of a single account, and conclude
 *  there were none. Filtering server-side spends the limit on the kind in question.
 *
 *  **The sort is a TOTAL order** — `timestamp`, then `blockNumber`, then the `id` primary
 *  key. `timestamp` alone left rows from one block tied, in an order the server could pick
 *  differently per request, so a page boundary inside a block could skip or repeat a row
 *  even against a table nobody was writing to. The tie-break removes that.
 *
 *  **It does not make offset paging snapshot-consistent.** The rows are a LIVE table: an
 *  event indexed ahead of your offset between two requests shifts everything down and
 *  repeats a row, and a reorg that removes one shifts up and skips a row. That is inherent
 *  to offset paging over changing data and no ordering fixes it — a cursor anchored on
 *  `(timestamp, blockNumber, id)`, or an upper bound pinned at the first page, is what
 *  would. Page when an approximate view is acceptable; narrow with `party`,
 *  `account`, `pool`, `kind`, or `kinds` and raise `limit` when it is not.
 *
 *  The ADL monitor this was added for does not page at all: it over-fetches one request and
 *  reports the ceiling, because a cascade it must not miss is worth more than a tidy page.
 */
export async function listLiquidations(
  opts: ListLiquidationsOptions = {},
  indexerUrl: IndexerRead.RequestContext,
): Promise<LiquidationEvent[]> {
  return queryLiquidations(opts, indexerUrl);
}

/** The one query body behind both public wrappers, so the deprecated name cannot
 *  drift from the new one. */
async function queryLiquidations(
  opts: ListLiquidationsOptions,
  indexerUrl: IndexerRead.RequestContext,
): Promise<LiquidationEvent[]> {
  const where: Record<string, unknown> = {};
  if (opts.account != null) where.account = { _eq: opts.account.toLowerCase() };
  if (opts.counterparty != null) where.counterparty = { _eq: opts.counterparty.toLowerCase() };
  if (opts.party != null) {
    const party = opts.party.toLowerCase();
    where._or = [{ account: { _eq: party } }, { counterparty: { _eq: party } }];
  }
  if (opts.pool != null) where.pool = { _eq: opts.pool.toLowerCase() };
  // NOT lowercased, unlike the addresses above - see ListLiquidationsOptions.kind.
  // Hasura ANDs operators on one column, so a supplied kind and kinds both apply.
  const kind: Record<string, unknown> = {};
  if (opts.kind != null) kind._eq = opts.kind;
  if (opts.kinds?.length) kind._in = opts.kinds;
  if (Object.keys(kind).length > 0) where.kind = kind;
  const data = await IndexerRead.gqlRequest(
    LiquidationsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  // The indexer row has no chain column; the owner's context names the chain.
  return data.LiquidationEvent.map((row) => ({ ...row, chainId: indexerUrl.chainId }));
}

/**
 * Lists liquidation events through the compatibility alias, newest first.
 * Ties are broken by `blockNumber` and unique `id`, so offset paging is stable
 * while the indexed rows do not change.
 *
 *  @deprecated Renamed to {@link SomniaMarketsClient.listLiquidations | client.listLiquidations},
 *  per SDK-TYPE-006: `list*` returns an array, `get*` returns one value. Forwards verbatim,
 *  including all filters and the page.
 */
export async function getLiquidations(
  opts: GetLiquidationsOptions = {},
  indexerUrl: IndexerRead.RequestContext,
): Promise<LiquidationEvent[]> {
  return queryLiquidations(opts, indexerUrl);
}

/** @deprecated Renamed to {@link ListLiquidationsOptions}. */
export type GetLiquidationsOptions = ListLiquidationsOptions;

/**
 *  A perp pool's funding-rate history, newest first. The append-only counterpart to the
 *  overwrite-only `PerpMarket.fundingRate`.
 *
 *  Takes a `{ from, to }` WINDOW as well as a page, because a chart needs a time range
 *  rather than an offset: settlement is hourly, so 24 rows per pool per day — and 288 a day
 *  across the retired 300s cadence, which indexed history still spans. Paging blindly to
 *  reach a date is both slow and fragile.
 *
 *  Every row carries its own `fundingWindowSec`, so normalize per row rather than once
 *  for the series — see {@link normalizeFundingRate}. Rows are lagged samples at
 *  settlement times, and each covers the span `[spanStart, spanEnd)`, which reaches
 *  backwards from the emit; for anything longer than about a week prefer
 *  {@link SomniaMarketsClient.listFundingRateCandles | client.listFundingRateCandles}, which does that attribution for you.
 *
 *  **`order` decides which END of the window a page comes from, and it is not cosmetic.**
 *  The default `"desc"` returns the NEWEST `limit` rows, which is what a "latest funding"
 *  read wants. But it makes `from` a window bound rather than a cursor: paging forward
 *  with `from = last.timestamp + 1` under `"desc"` keeps re-reading the tail and never
 *  advances, because narrowing the window does not change which end you get. Pass
 *  `"asc"` to walk FORWARD from `from` — that is the mode a cursor needs.
 *
 *  Rows that share a timestamp are ordered by `blockNumber`, then by `id`, in the same
 *  direction. So two reads of an unchanged table return the same sequence.
 *
 * **Details**
 *
 * - `pool`: perp pool address
 * - `opts`: `from`/`to` are unix SECONDS, inclusive/exclusive respectively
 */
export async function listFundingRateHistory(
  pool: string,
  opts: {
    limit?: number;
    offset?: number;
    from?: number | bigint;
    to?: number | bigint;
    order?: "asc" | "desc";
  } = {},
  indexerUrl: IndexerRead.Source,
): Promise<FundingRateUpdate[]> {
  const timestamp: Record<string, string> = {};
  if (opts.from != null) timestamp._gte = opts.from.toString();
  if (opts.to != null) timestamp._lt = opts.to.toString();
  const where: Record<string, unknown> = { pool: { _eq: pool.toLowerCase() } };
  if (Object.keys(timestamp).length > 0) where.timestamp = timestamp;
  const direction = opts.order ?? "desc";
  const data = await IndexerRead.gqlRequest(
    FundingRateHistoryQuery,
    {
      where,
      // A total order, as in LiquidationsQuery: rows that share a timestamp come back
      // in the same order on every request. The tie-break also lets Postgres choose the
      // `(pool, timestamp)` index. With `timestamp` alone it can walk the standalone
      // `timestamp` index and discard every other pool's rows, which reads most of the
      // table for a pool that stopped settling.
      orderBy: [{ timestamp: direction }, { blockNumber: direction }, { id: direction }],
      limit: opts.limit ?? 100,
      offset: opts.offset ?? 0,
    },
    indexerUrl,
  );
  return data.FundingRateUpdate;
}

/**
 *  A perp pool's funding-rate ROLLUPS at one resolution, newest first.
 *
 *  Use this for any range the raw series is too dense for — 30 days at the testnet
 *  cadence is ~8,600 raw rows per pool. Resolutions are 3600 / 14400 / 86400 only;
 *  anything at or below the settlement cadence would multiply rows without adding
 *  information.
 *
 *  Two things a consumer must honour, both of which are properties of lazy settlement
 *  rather than of this API:
 *
 *  - **Buckets can be ABSENT.** A window touched by no settlement's span produces no row,
 *    because nothing triggered a write. Zero-fill missing grid slots as
 *    `{ avgFundingRate8h: 0, coverage: 0 }` — and never carry the previous rate forward,
 *    which would fabricate funding across an outage.
 *  - **Past buckets get REVISED.** A catch-up settlement reaches backwards and updates
 *    buckets that already existed. Any chart already has to tolerate this for the
 *    in-progress bucket.
 *
 *  **Paging is newest-first, and a full page means there is probably more.** The default
 *  `limit` is 500 while 30 days of hourly buckets is 720, so a month-long window silently
 *  returns its newest 500. Treat `rows.length === limit` as "truncated" and page with
 *  `offset`, or narrow the window. {@link densifyFundingBuckets} will not zero-fill older
 *  than the oldest row it is given, precisely so a truncated page cannot be rendered as a
 *  funding pause.
 *
 * **Details**
 *
 * - `pool`: perp pool address
 * - `intervalSeconds`: 3600 | 14400 | 86400
 * - `opts`: `from`/`to` are unix SECONDS, matched against `bucketStart`
 */
export async function listFundingRateCandles(
  pool: string,
  intervalSeconds: number,
  opts: { limit?: number; offset?: number; from?: number | bigint; to?: number | bigint } = {},
  indexerUrl: IndexerRead.Source,
): Promise<FundingRateCandle[]> {
  const bucketStart: Record<string, string> = {};
  if (opts.from != null) bucketStart._gte = opts.from.toString();
  if (opts.to != null) bucketStart._lt = opts.to.toString();
  const where: Record<string, unknown> = {
    pool: { _eq: pool.toLowerCase() },
    intervalSeconds: { _eq: intervalSeconds },
  };
  if (Object.keys(bucketStart).length > 0) where.bucketStart = bucketStart;
  const data = await IndexerRead.gqlRequest(
    FundingRateCandlesQuery,
    { where, limit: opts.limit ?? 500, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.FundingRateCandle;
}

/**
 * Lists funding-rate history through the compatibility alias.
 *
 *  @deprecated Renamed to {@link SomniaMarketsClient.listFundingRateHistory | client.listFundingRateHistory}, per the `get*` = value-or-null
 *  and `list*` = array convention in CONVENTIONS.md. This alias keeps one release cycle
 *  of compatibility; it forwards verbatim and accepts the new `from`/`to` window too.
 */
export async function getFundingRateHistory(
  pool: string,
  opts: { limit?: number; offset?: number; from?: number | bigint; to?: number | bigint } = {},
  indexerUrl: IndexerRead.Source,
): Promise<FundingRateUpdate[]> {
  return listFundingRateHistory(pool, opts, indexerUrl);
}

/**
 *  Realized perp fees / rebates / builder credits, newest first — filter by `account`,
 *  `pool`, `builder` or `kind`, paginate.
 *
 *  The perps fee rail off `MarginBank`, distinct from the binary/spot `listBuilderFees` and
 *  `listProtocolFees` surfaces.
 *
 *  `insurancePortion` is a component OF `amount` rather than an addition to it, so a fee
 *  total is `SUM(amount)` and an insurance-fund inflow is `SUM(insurancePortion)` — adding
 *  the two double-counts. Directions are on `isRebate`: `amount` is unsigned, and a rebate
 *  is a credit.
 *
 * **Details**
 *
 * - `opts`: `kind` is `"Fee"` | `"Rebate"` | `"BuilderFee"`
 */
export async function listPerpFees(
  opts: { account?: string; pool?: string; builder?: string; kind?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpFeeRecord[]> {
  const where: Record<string, unknown> = {};
  if (opts.account != null) where.account = { _eq: opts.account.toLowerCase() };
  if (opts.pool != null) where.pool = { _eq: opts.pool.toLowerCase() };
  if (opts.builder != null) where.builder = { _eq: opts.builder.toLowerCase() };
  if (opts.kind != null) where.kind = { _eq: opts.kind };
  const data = await IndexerRead.gqlRequest(
    PerpFeesQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.PerpFeeRecord;
}

/** A perp pool's open-interest history, newest first — paginated. */
export async function getOpenInterestHistory(
  pool: string,
  opts: { limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<OpenInterestSnapshot[]> {
  const data = await IndexerRead.gqlRequest(
    OpenInterestHistoryQuery,
    { pool: pool.toLowerCase(), limit: opts.limit ?? 100, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.OpenInterestSnapshot;
}

// prettier-ignore
const FundingPaymentsQuery = graphql(`
  query FundingPayments($where: FundingPayment_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         FundingPayment(where: $where, order_by: [{timestamp: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id account pool amount timestamp txHash
         }
       }
`);

// prettier-ignore
const MarginEventsQuery = graphql(`
  query MarginEvents($where: MarginEvent_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarginEvent(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
           id account kind pool amount granter timestamp txHash
         }
       }
`);

// prettier-ignore
// ORDERED BY A TOTAL KEY, not by `timestamp` alone. Every row a block produces
// carries that block's timestamp, so a timestamp-only sort leaves ties in an
// order the server may choose differently per request - and an `offset` page
// boundary landing inside one block then skips or repeats a row, silently in the
// skip case. `id` is the primary key, so appending it makes the order total and
// the paging contract honest; `blockNumber` sits between so rows still group by
// block when two blocks share a timestamp.
const LiquidationsQuery = graphql(`
  query Liquidations($where: LiquidationEvent_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         LiquidationEvent(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id account pool kind size price counterparty penalty
           badDebt insuranceCovered deficit coverageDeclined collateralAmount equity
           positionsProcessed stageReached marginStatusBefore marginStatusAfter
           timestamp blockNumber txHash
         }
       }
`);

// prettier-ignore
const FundingRateHistoryQuery = graphql(`
  query FundingRateHistory($where: FundingRateUpdate_bool_exp!, $orderBy: [FundingRateUpdate_order_by!], $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         FundingRateUpdate(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
           id pool fundingRate cumulativeFundingPerUnit indexPrice markPrice
           intervalsSettled intervalsAccrued fundingWindowSec fundingIntervalSec
           spanStart spanEnd anchorResynced timestamp blockNumber txHash
         }
       }
`);

// prettier-ignore
const FundingRateCandlesQuery = graphql(`
  query FundingRateCandles($where: FundingRateCandle_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         FundingRateCandle(where: $where, order_by: {bucketStart: desc}, limit: $limit, offset: $offset) {
           id pool intervalSeconds bucketStart
           avgFundingRate8h minFundingRate8h maxFundingRate8h coverage
           cumulativeFundingStart cumulativeFundingEnd
           fundingWindowSec fundingIntervalSec paramsChangedInBucket
           indexPriceEnd openInterestEnd updateCount
         }
       }
`);

// prettier-ignore
const PerpFeesQuery = graphql(`
  query PerpFees($where: PerpFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpFeeRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
           id account pool amount isRebate kind insurancePortion tier fillNotional builder timestamp txHash
         }
       }
`);

// prettier-ignore
const OpenInterestHistoryQuery = graphql(`
  query OpenInterestHistory($pool: String!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OpenInterestSnapshot(where: {pool: {_eq: $pool}}, order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
           id pool openInterest timestamp blockNumber
         }
       }
`);

// ------------------------------------------------------------- batch order rejections
//
// `placeOrders` / `placeOrdersFor` ONLY. The singular entry points revert instead, and a
// revert discards its own logs, so there is no rejection history for them — and no Order
// row to hang this on either way, because nothing rested or filled.

/**
 *  The contract's `OrderRejectionReason` enum, by index — the reason a batch-placed order
 *  was refused.
 *
 *  Index 0 is `None`, which is NOT a rejection: it means the order rested or filled. It
 *  cannot appear on a {@link PerpOrderRejection} row, and is kept in the table only so
 *  every other member keeps its on-chain index.
 *
 * @category perpetual markets
 */
export const PERP_ORDER_REJECTION_REASON = [
  "None",
  "AlreadyExpired",
  "SelfMatchCancelTaker",
  "PostOnlyWouldCross",
  "FillOrKillUnfillable",
  "ImmediateOrCancelNoFill",
] as const;

/** A decoded {@link PerpOrderRejection.reason}. @category perpetual markets */
export type PerpOrderRejectionReason = (typeof PERP_ORDER_REJECTION_REASON)[number];

/**
 *  One order refused inside a batch placement (mirror of the indexer `PerpOrderRejection`
 *  entity).
 *
 *  **Batch placements only.** `placeOrder` / `placeOrderFor` REVERT on the same
 *  conditions, and a reverted transaction discards its logs, so a singular placement
 *  leaves no row here — its reason arrives as a decoded revert instead. A batch keeps the
 *  accepted orders and records the refused ones, which is the only reason this history
 *  exists.
 *
 *  There is no `Order` row to join to: a rejected request never rested and never filled.
 *  `requestIndex` is its position in the submitted batch, which is how a caller maps the
 *  row back to the request it sent.
 *
 * @category perpetual markets
 */
export type PerpOrderRejection = {
  /** Row id (`${txHash}_${logIndex}`). */
  id: string;
  /** The order's owner (lowercased). */
  owner: string;
  /** The PerpPool the batch was submitted to (lowercased). */
  pool: string;
  /**
   *  The reason as a NAME, or `null` when the pool reported a member this SDK version does
   *  not know.
   *
   *  Null rather than a default member, deliberately, and for the same reason the `intent`
   *  field on {@link PerpStopOrder} does it: the enum appends — `DropReason` gained `NoFill`
   *  — and naming an unrecognized index would tell a caller the order was refused for a
   *  reason it was not. {@link PerpOrderRejection.reasonRaw} still carries the index, so a
   *  null is never a lost row.
   */
  reason: PerpOrderRejectionReason | null;
  /**
   *  The raw enum index, always present.
   *
   *  Kept beside the decoded name because the indexer deliberately stores this
   *  un-decoded: a member added after the reindex still lands intact, and no row is ever
   *  lost to a name the indexer did not know. A consumer that wants to handle a
   *  newer-than-SDK reason reads this.
   */
  reasonRaw: number;
  /** The order's position in the submitted batch — how to map the row back to the request. */
  requestIndex: string;
  /** Timestamp (unix seconds) of the rejection. */
  timestamp: string;
  /** Block the rejection landed in. */
  blockNumber: string;
  /** Tx hash the batch landed in. */
  txHash: string;
};

// prettier-ignore
const PerpOrderRejectionsQuery = graphql(`
  query PerpOrderRejections($where: PerpOrderRejection_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpOrderRejection(where: $where, order_by: [{blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id owner pool reason requestIndex timestamp blockNumber txHash
         }
       }
`);

/**
 *  Orders refused inside batch placements, newest first.
 *
 *  Indexer tier. Filter by `owner`, by `pool`, or by the raw `reason` index — the filter
 *  takes the INDEX rather than the name, so a caller can select a reason this SDK version
 *  does not yet name.
 *
 *  Nothing here has an `Order` row: a rejected request never rested and never filled. Pair
 *  `requestIndex` with the batch the caller submitted to say which request was refused.
 *
 *  Ordered by `blockNumber` descending, with `id` as a tiebreaker, which makes `offset`
 *  pagination STABLE — no row repeats or disappears between pages. It is not intra-block
 *  chain order: this entity carries no `logIndex` column and its `id` is `txHash_logIndex`,
 *  so rows inside one block come back in a deterministic but arbitrary sequence. That
 *  costs nothing here, because every row in one batch shares a transaction and
 *  `requestIndex` already gives their true order — which is the one intra-batch ordering a
 *  caller needs. Ordering by `timestamp` would be worse, since separate blocks can share
 *  one.
 *
 * @example Why a trader's batch orders are not appearing
 * ```ts
 * const refused = await client.listPerpOrderRejections({ owner: account });
 * for (const r of refused) {
 *   // `reason` is null for a member this SDK does not know; `reasonRaw` always has it.
 *   console.log(r.requestIndex, r.reason ?? `unknown(${r.reasonRaw})`);
 * }
 * ```
 */
export async function listPerpOrderRejections(
  opts: { owner?: string; pool?: string; reason?: number; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpOrderRejection[]> {
  const where: Record<string, unknown> = {};
  if (opts.owner != null) where.owner = { _eq: opts.owner.toLowerCase() };
  if (opts.pool != null) where.pool = { _eq: opts.pool.toLowerCase() };
  // Presence, not truthiness: index 0 is a real enum member. It cannot appear on a
  // rejection row, but filtering must not silently ignore a caller who asks for it.
  if (opts.reason != null) where.reason = { _eq: opts.reason };
  const data = await IndexerRead.gqlRequest(
    PerpOrderRejectionsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.PerpOrderRejection.map((r) => ({
    id: r.id,
    owner: r.owner,
    pool: r.pool,
    reason: PERP_ORDER_REJECTION_REASON[r.reason] ?? null,
    reasonRaw: r.reason,
    requestIndex: r.requestIndex,
    timestamp: r.timestamp,
    blockNumber: r.blockNumber,
    txHash: r.txHash,
  }));
}

// ------------------------------------------------------------ position changes

/**
 *  What one position update did to a perp position.
 *
 *  The indexer derives it from the signed size before and after the update, and it
 *  follows MarginBank's own settlement cases:
 *
 *    OPEN       the position was flat before
 *    INCREASE   same side, larger size
 *    REDUCE     same side, smaller size; part of the position realized PnL
 *    CLOSE      the position went to zero; all of it realized PnL
 *    FLIP       the position crossed zero; the whole old side realized PnL and the rest
 *               opened on the other side
 *
 * @category perpetual markets
 */
export type PerpPositionChangeKind = "OPEN" | "INCREASE" | "REDUCE" | "CLOSE" | "FLIP";

/**
 *  One update to a perp position, with the PnL that update realized (mirror of the
 *  indexer `PerpPositionChange` entity).
 *
 *  MarginBank emits one update per order-book fill, per auto-deleveraging or market wind-down leg, and for
 *  both sides of a liquidation takeover. So this history covers every way a position can
 *  close, including liquidations that leave no fill. The indexed position row
 *  ({@link IndexedPerpPosition}) keeps only the latest state; this keeps each step.
 *
 *  **One order can make several rows.** An order that fills across several book levels
 *  makes one row per fill. To show one closed trade, group the rows by `account`, `pool`
 *  and `orderId`, and sum `realizedPnl` and `closedSize`. Do not group by `txHash`: one
 *  transaction can hold both parties' rows and several orders. Rows with no `orderId`
 *  (liquidation takeover, ADL, wind-down) are one close each.
 *
 *  **PnL here is price PnL only.** Fees ({@link PerpFeeRecord}) and funding
 *  ({@link FundingPayment}) are separate records.
 *
 *  All quantities are exact raw integers: sizes in raw base units, prices in raw quote
 *  units per whole base, PnL in raw collateral units.
 *
 * @category perpetual markets
 */
export type PerpPositionChange = {
  /** Row id (`${blockNumber}_${logIndex}`). */
  id: string;
  /** The chain the row was indexed from — the owning client's chain. */
  chainId: number;
  /** Perp pool (lowercased). */
  pool: string;
  /** Position owner (lowercased). */
  account: string;
  /** What the update did to the position. */
  kind: PerpPositionChangeKind;
  /** Signed size before the update: positive long, negative short, zero flat. */
  sizeBefore: bigint;
  /** Signed size after the update. */
  sizeAfter: bigint;
  /**
   *  Unsigned size closed out of the earlier position: the part that realized PnL.
   *  Zero on `OPEN` and `INCREASE`. The whole earlier size on `CLOSE` and `FLIP`.
   */
  closedSize: bigint;
  /**
   *  Average entry price before the update — the price a close realized against. Null when
   *  the position was flat before. MarginBank reports a zero entry after a full close, so
   *  this is the only record of the entry a `CLOSE` realized against.
   */
  entryPriceBefore: bigint | null;
  /** Average entry price after the update. Zero after a full close. */
  entryPriceAfter: bigint;
  /**
   *  The price the closed size realized at: the fill price, or the takeover, ADL or
   *  wind-down price for a close with no fill. Null when nothing closed.
   */
  exitPrice: bigint | null;
  /**
   *  The account's order in the fill behind this update. Null for a liquidation takeover,
   *  ADL or wind-down update, which has no order.
   */
  orderId: bigint | null;
  /** Signed PnL this update realized. Zero on `OPEN` and `INCREASE`. */
  realizedPnl: bigint;
  /** Unix seconds of the block. */
  timestamp: bigint;
  /** Block the update landed in. */
  blockNumber: bigint;
  /** Position of the update in its block's logs. */
  logIndex: number;
  /** Transaction the update landed in (lowercased). */
  txHash: string;
};

/**
 *  Filters, time window and pagination for
 *  {@link SomniaMarketsClient.listPerpPositionChanges | client.listPerpPositionChanges}.
 *
 *  Named rather than inline because the shape is declared twice — here and on the client
 *  member — and SDK-TYPE-005 exists so the two cannot drift.
 *
 * @category perpetual markets
 */
export interface ListPerpPositionChangesOptions {
  /** Position owner. Case-insensitive: lowercased before the query. */
  account?: string;
  /** Perp pool. Case-insensitive: lowercased before the query. */
  pool?: string;
  /**
   *  One transaction. Case-insensitive: lowercased before the query. A transaction can
   *  hold both parties' rows and several orders, so pass `account` too and group by
   *  `orderId`.
   */
  txHash?: string;
  /**
   *  Only these kinds. Pass `["REDUCE", "CLOSE", "FLIP"]` for the updates that realized
   *  PnL. An empty array matches nothing.
   */
  kinds?: readonly PerpPositionChangeKind[];
  /** Unix seconds, INCLUSIVE: rows at or after this time. Whole and non-negative. */
  from?: number | bigint;
  /** Unix seconds, EXCLUSIVE: rows before this time. Whole and non-negative. */
  to?: number | bigint;
  /**
   *  `"desc"` (the default) returns the NEWEST rows first. `"asc"` walks forward in chain
   *  order, which is the mode a cursor needs.
   */
  order?: "asc" | "desc";
  /** Rows per page, an integer from 1 to 1000. Defaults to 50. */
  limit?: number;
  /** Rows to skip, an integer from 0 to 2,147,483,647. Defaults to 0. */
  offset?: number;
}

// prettier-ignore
const PerpPositionChangesQuery = graphql(`
  query PerpPositionChanges($where: PerpPositionChange_bool_exp!, $orderBy: [PerpPositionChange_order_by!], $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpPositionChange(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
           id pool account kind sizeBefore sizeAfter closedSize entryPriceBefore entryPriceAfter exitPrice orderId realizedPnl timestamp blockNumber logIndex txHash
         }
       }
`);

/**
 *  The per-update history of perp positions, newest first — filter by `account`, `pool`,
 *  `txHash` and/or `kinds`, window by `from`/`to`, paginate.
 *
 *  Indexer tier. Each row is one update with its own realized PnL, so a closed trade's
 *  result can be read without replaying fills. See {@link PerpPositionChange}.
 *
 *  **The sort is chain order** — `blockNumber`, then `logIndex` — which is a total
 *  order, so the sequence is stable between requests. The table is live and append-only,
 *  so offset paging is approximate. To follow it forward, pass `order: "asc"` with `from`
 *  at the last row's timestamp and skip the ids already seen.
 */
export async function listPerpPositionChanges(
  opts: ListPerpPositionChangesOptions = {},
  indexerUrl: IndexerRead.RequestContext,
): Promise<PerpPositionChange[]> {
  const where: Record<string, unknown> = {};
  if (opts.account != null) where.account = { _eq: opts.account.toLowerCase() };
  if (opts.pool != null) where.pool = { _eq: opts.pool.toLowerCase() };
  if (opts.txHash != null) where.txHash = { _eq: opts.txHash.toLowerCase() };
  if (opts.kinds != null) where.kind = { _in: [...opts.kinds] };
  const timestamp: Record<string, string> = {};
  if (opts.from != null) timestamp._gte = changeUnixSeconds(opts.from, "from").toString();
  if (opts.to != null) timestamp._lt = changeUnixSeconds(opts.to, "to").toString();
  if (Object.keys(timestamp).length > 0) where.timestamp = timestamp;
  // Validated BEFORE the request (SDK-IO-005): `NaN` and `Infinity` pass `??`, and
  // `JSON.stringify` turns both into `null`, which Hasura reads as "no limit".
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new InvalidInputError("Perp position change page limit must be an integer from 1 to 1000");
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 2_147_483_647) {
    throw new InvalidInputError("Perp position change page offset must be an integer from 0 to 2147483647");
  }
  const order = opts.order ?? "desc";
  const data = await IndexerRead.gqlRequest(
    PerpPositionChangesQuery,
    { where, orderBy: [{ blockNumber: order }, { logIndex: order }], limit, offset },
    indexerUrl,
  );
  return data.PerpPositionChange.map((row) => toPerpPositionChange(row, indexerUrl.chainId));
}

type PerpPositionChangeRow = ResultOf<typeof PerpPositionChangesQuery>["PerpPositionChange"][number];

/** One indexed position update as this SDK's type. */
function toPerpPositionChange(row: PerpPositionChangeRow, chainId: number): PerpPositionChange {
  return {
    id: row.id,
    // The indexer row has no chain column; the owner's context names the chain.
    chainId,
    pool: row.pool,
    account: row.account,
    kind: row.kind,
    sizeBefore: BigInt(row.sizeBefore),
    sizeAfter: BigInt(row.sizeAfter),
    closedSize: BigInt(row.closedSize),
    entryPriceBefore: row.entryPriceBefore == null ? null : BigInt(row.entryPriceBefore),
    entryPriceAfter: BigInt(row.entryPriceAfter),
    exitPrice: row.exitPrice == null ? null : BigInt(row.exitPrice),
    orderId: row.orderId == null ? null : BigInt(row.orderId),
    realizedPnl: BigInt(row.realizedPnl),
    timestamp: BigInt(row.timestamp),
    blockNumber: BigInt(row.blockNumber),
    logIndex: row.logIndex,
    txHash: row.txHash,
  };
}

/** Most fills one call takes: one full page of {@link getUserFillsPage}. */
const FILLS_PER_CHANGE_READ = 1_000;
/** Distinct transactions per request, so one `_in` list stays a modest request body. */
const CHANGE_READ_TX_CHUNK = 100;
/** Rows per request. A constant rather than a size scaled to the input; a full page reads on. */
const CHANGE_READ_PAGE = 1_000;

const isDecimalId = (value: unknown): value is string => typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value);

/** Hasura's answer from an indexer that predates the `PerpPositionChange` table. */
const NO_POSITION_CHANGE_TABLE = /field ['"]PerpPositionChange['"] not found in type: ['"]query_root['"]/i;

/** The account's side of one fill: the order its position update is stamped with. */
type FillOrder = { key: string; logIndex: number };

/**
 *  The account's order in a fill, keyed by transaction, pool and order. Null when the
 *  account is not a party, or the row lacks the log position a match needs. A value that
 *  is not a fill row, as an untyped caller can pass, is not the account's fill either.
 *
 *  The indexer stamps an update with the maker's order when the account is the maker and
 *  the taker's otherwise, so the maker is checked first here too. A fill cannot match an
 *  account against itself: self-matching only cancels.
 */
function fillOrderOf(fill: FillRow, account: string): FillOrder | null {
  if (typeof fill !== "object" || fill === null) return null;
  if (typeof fill.logIndex !== "number" || !Number.isInteger(fill.logIndex)) return null;
  let orderId: string | null = null;
  if (typeof fill.maker === "string" && fill.maker.toLowerCase() === account) {
    orderId = fill.makerOrderId;
  } else if (typeof fill.taker === "string" && fill.taker.toLowerCase() === account) {
    orderId = fill.takerOrderId;
  }
  if (!isDecimalId(orderId) || typeof fill.txHash !== "string" || typeof fill.pool !== "string") return null;
  return { key: changeKey(fill.txHash, fill.pool, BigInt(orderId)), logIndex: fill.logIndex };
}

/** The pairing key of a fill and its update. The indexer lowercases a change's hash; a fill's may not be. */
function changeKey(txHash: string, pool: string, orderId: bigint): string {
  return `${txHash.toLowerCase()} ${pool.toLowerCase()} ${orderId}`;
}

/**
 *  The position update each of an account's fills made — what lets a trade history say
 *  "Open Long" or "Close Short" rather than only buy or sell. See
 *  {@link SomniaMarketsClient.listPerpPositionChangesForFills | client.listPerpPositionChangesForFills}.
 */
export async function listPerpPositionChangesForFills(
  account: string,
  fills: readonly FillRow[],
  indexerUrl: IndexerRead.RequestContext,
): Promise<(PerpPositionChange | null)[]> {
  if (typeof account !== "string" || account.length === 0) {
    throw new InvalidInputError("Perp position changes for fills need an account address");
  }
  if (!Array.isArray(fills) || fills.length > FILLS_PER_CHANGE_READ) {
    throw new InvalidInputError(
      `Perp position changes for fills take an array of at most ${FILLS_PER_CHANGE_READ} fills`,
    );
  }
  const acct = account.toLowerCase();
  const orders = fills.map((fill) => fillOrderOf(fill, acct));
  const txHashes = [...new Set(fills.flatMap((fill, i) => (orders[i] === null ? [] : [fill.txHash.toLowerCase()])))];
  if (txHashes.length === 0) return fills.map(() => null);

  const chunks: string[][] = [];
  for (let i = 0; i < txHashes.length; i += CHANGE_READ_TX_CHUNK) {
    chunks.push(txHashes.slice(i, i + CHANGE_READ_TX_CHUNK));
  }
  const pages = await Promise.all(
    chunks.map(async (chunk) => {
      const rows: PerpPositionChange[] = [];
      for (let offset = 0; ; offset += CHANGE_READ_PAGE) {
        let data: Omit<ResultOf<typeof PerpPositionChangesQuery>, "_sdkWatermark">;
        try {
          data = await IndexerRead.gqlRequest(
            PerpPositionChangesQuery,
            {
              where: { account: { _eq: acct }, txHash: { _in: chunk } },
              orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
              limit: CHANGE_READ_PAGE,
              offset,
            },
            indexerUrl,
          );
        } catch (cause) {
          // Not a failed read: this indexer has no position changes to give until it is reindexed.
          if (cause instanceof IndexerError && NO_POSITION_CHANGE_TABLE.test(cause.message)) {
            throw new PerpPositionChangesUnavailableError("listPerpPositionChangesForFills", { cause });
          }
          throw cause;
        }
        for (const row of data.PerpPositionChange) rows.push(toPerpPositionChange(row, indexerUrl.chainId));
        if (data.PerpPositionChange.length < CHANGE_READ_PAGE) return rows;
      }
    }),
  );

  // Updates per order, in log order. Rows with no order (takeover, ADL, wind-down) have no fill.
  const changesByOrder = new Map<string, PerpPositionChange[]>();
  for (const change of pages.flat()) {
    if (change.orderId === null) continue;
    const key = changeKey(change.txHash, change.pool, change.orderId);
    const list = changesByOrder.get(key) ?? [];
    list.push(change);
    changesByOrder.set(key, list);
  }
  for (const list of changesByOrder.values()) list.sort((a, b) => a.logIndex - b.logIndex);
  // The account's fills per order, in log order: each match lies after the order's
  // previous fill in this call, so within one call an update missing from the indexer
  // cannot be claimed by a second fill. The bound comes from the fills passed in, not
  // from every fill of the transaction.
  const fillLogsByOrder = new Map<string, number[]>();
  for (const order of orders) {
    if (order === null) continue;
    const list = fillLogsByOrder.get(order.key) ?? [];
    list.push(order.logIndex);
    fillLogsByOrder.set(order.key, list);
  }
  for (const list of fillLogsByOrder.values()) list.sort((a, b) => a - b);

  // MarginBank emits each party's update just before the fill it belongs to, so a fill's
  // update is the closest earlier one for the same transaction, pool and order.
  return orders.map((order) => {
    if (order === null) return null;
    const candidates = changesByOrder.get(order.key) ?? [];
    const fillLogs = fillLogsByOrder.get(order.key) ?? [];
    let previousFillLog = -1;
    for (const log of fillLogs) {
      if (log < order.logIndex) previousFillLog = log;
    }
    let match: PerpPositionChange | null = null;
    for (const change of candidates) {
      if (change.logIndex > previousFillLog && change.logIndex < order.logIndex) match = change;
    }
    return match;
  });
}

/** A time bound as whole, non-negative unix seconds, checked before it reaches Hasura. */
function changeUnixSeconds(value: number | bigint, name: "from" | "to"): number | bigint {
  const ok = typeof value === "bigint" ? value >= 0n : Number.isSafeInteger(value) && value >= 0;
  if (!ok) throw new InvalidInputError(`Perp position change ${name} must be whole, non-negative unix seconds`);
  return value;
}
