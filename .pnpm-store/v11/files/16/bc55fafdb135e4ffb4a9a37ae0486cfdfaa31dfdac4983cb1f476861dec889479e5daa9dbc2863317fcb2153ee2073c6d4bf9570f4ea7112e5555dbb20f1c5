// The perp plane: the liquidation waterfall and per-account funding settlement, folded
// into the live store exactly as the indexer folds them into Postgres.
//
// Under `perp/` rather than beside the order-book reducer because every event here comes
// from MarginBank or LiquidationEngine and every row lands in a perp entity: reducer.ts
// mirrors indexer/src/handlers/orderbook.ts, and this mirrors margin.ts. reducer.ts keeps
// the dispatch, so there is still ONE switch a live event passes through.

import type { DecodedEvent, EventOf } from "../reducer.js";
import type { MaterializerStore } from "../store.js";

/**
 *  Fold one perp-plane event into the store. Does NOT commit — the tail batches per block.
 *
 *  The names this handles are the ones `applyEvent` routes here; anything else is ignored,
 *  so a drift between the two switches drops a row rather than writing a malformed one.
 */
export function applyPlaneEvent(ev: DecodedEvent, store: MaterializerStore): void {
  switch (ev.eventName) {
    // Names below are the EVENT names; `writeLiquidation` maps each to the `kind` the
    // indexed row carries, which differs for five of them.
    case "AccountLiquidated":
      writeLiquidation(
        ev,
        ev.eventName,
        ev.args.account,
        {
          positionsProcessed: ev.args.positionsProcessed,
          stageReached: ev.args.stageReached,
          marginStatusBefore: ev.args.marginStatusBefore,
          marginStatusAfter: ev.args.marginStatusAfter,
        },
        store,
      );
      break;
    case "PositionLiquidated":
      // `sizeDelta` is a SIGNED int128 and the sign is the side being closed — pass it
      // through rather than taking a magnitude.
      writeLiquidation(
        ev,
        ev.eventName,
        ev.args.account,
        { pool: ev.args.perpPool, size: ev.args.sizeDelta, price: ev.args.markPrice },
        store,
      );
      break;
    case "PositionSkippedBelowMinQuantity":
      writeLiquidation(ev, ev.eventName, ev.args.account, { pool: ev.args.perpPool, size: ev.args.size }, store);
      break;
    case "PositionTakenOver":
      writeLiquidation(
        ev,
        ev.eventName,
        ev.args.account,
        { pool: ev.args.perpPool, size: ev.args.size, price: ev.args.takeoverPrice, counterparty: ev.args.bidder },
        store,
      );
      break;
    // The only two ordinary writers of `badDebt` — an uncovered, genuinely insolvent
    // hole. Both are LEVELS (post-call state samples), so a consumer must not sum them.
    case "ResidualBadDebt":
    case "AdlPriceCapacityExhausted":
      writeLiquidation(ev, ev.eventName, ev.args.account, { badDebt: ev.args.residual }, store);
      break;
    // The complement of ResidualBadDebt within the negative-balance domain: equity is
    // non-negative here, which is the protocol's own definition of "not insolvent", so
    // the magnitude goes to `deficit` with the backing beside it.
    case "ResidualBackedByOpenPnl":
      writeLiquidation(ev, ev.eventName, ev.args.account, { deficit: ev.args.residual, equity: ev.args.equity }, store);
      break;
    // The per-tier arrays are dropped, as the indexer drops them: the breakdown needs its
    // own entity to be useful and the declined TOTAL is what a history read consumes.
    case "CoverageDeclinedByEquityCap":
      writeLiquidation(ev, ev.eventName, ev.args.account, { coverageDeclined: ev.args.declined }, store);
      break;
    // Carries no amount, deliberately. `absorbed` is the delta across the discard's own
    // `absorbBadDebt` call, which emits BadDebtAbsorbed in the SAME tx — so the wei is
    // already reported there as a flow, and writing it here too would double the fund's
    // outflow for every discarded session. Join on `txHash` for the amount.
    case "AdlSessionDiscarded":
      writeLiquidation(ev, ev.eventName, ev.args.account, {}, store);
      break;
    case "AdlCapacityShortfall":
      writeLiquidation(
        ev,
        ev.eventName,
        ev.args.account,
        { pool: ev.args.perpPool, size: ev.args.residualSize },
        store,
      );
      break;
    // Keeper compensation carved OUT of the liquidation fee. The amount has no column on
    // the published row type, so this lands as a marker naming the keeper.
    case "LiquidationKeeperRewardPaid":
      writeLiquidation(ev, ev.eventName, ev.args.account, { counterparty: ev.args.keeper }, store);
      break;
    // The per-block volume cap refused this liquidation — the only signal explaining an
    // account that stayed liquidatable across blocks with no outcome event.
    case "LiquidationThrottled":
      writeLiquidation(ev, ev.eventName, ev.args.account, { pool: ev.args.perpPool }, store);
      break;
    // ---- perp plane: the legs MarginBank books (log source = MarginBank) ----
    // `badDebt` on the event is the FULL negative balance (a level, pre-coverage) and
    // `covered` is the wei the fund moved (a flow), so they go to DIFFERENT columns:
    // summing the gross figure with the `ResidualBadDebt` row that reports the same
    // hole's remainder double-counts. `absorbedBy` is the fund — a real counterparty.
    case "BadDebtAbsorbed":
      writeLiquidation(
        ev,
        ev.eventName,
        ev.args.account,
        { deficit: ev.args.badDebt, insuranceCovered: ev.args.covered, counterparty: ev.args.absorbedBy },
        store,
      );
      break;
    // Keyed on `bankrupt`, NOT on the event's first argument: `counterparty` is who
    // absorbed the position. ONE row per ADL leg, so an account assigned in as the
    // profitable side has no row of its own — find it via the `counterparty` filter.
    case "AutoDeleveraged":
      writeLiquidation(
        ev,
        ev.eventName,
        ev.args.bankrupt,
        {
          pool: ev.args.perpPool,
          size: ev.args.sizeReduced,
          price: ev.args.bankruptcyPrice,
          counterparty: ev.args.counterparty,
        },
        store,
      );
      break;
    // Collateral FOLLOWING the position, and a stage-4 close-out FLOW: both are
    // `collateralAmount`, never `badDebt`, or a summed loss includes settlement plumbing.
    case "PositionTransferred":
      writeLiquidation(
        ev,
        ev.eventName,
        ev.args.from,
        {
          pool: ev.args.perpPool,
          size: ev.args.size,
          counterparty: ev.args.to,
          collateralAmount: ev.args.collateralTransferred,
        },
        store,
      );
      break;
    case "CloseOutMarginSettled":
      writeLiquidation(
        ev,
        ev.eventName,
        ev.args.from,
        { counterparty: ev.args.to, collateralAmount: ev.args.amount },
        store,
      );
      break;
    // A liquidation IOC that reverted with a Solidity panic — a bug that reached the
    // waterfall. The panic code has no column on the published row type, so this lands
    // as a marker; nothing else durably records that it happened.
    case "LiquidationOrderPanicked":
      writeLiquidation(ev, ev.eventName, ev.args.account, { pool: ev.args.perpPool }, store);
      break;
    // ---- perp plane: per-account funding settlement (log source = MarginBank) ----
    case "FundingSettled":
      onFundingSettled(ev, store);
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------
// The perp plane: liquidation waterfall + per-account funding settlement.
//
// Mirror of indexer/src/handlers/margin.ts. The parity that matters is not
// event-for-event but ROW-for-row: `listLiveLiquidations` and `listLiquidations`
// serve the same `LiquidationEvent` type, so a live row and its indexed twin
// must be indistinguishable once the indexer catches up. Three things make that
// non-obvious, and each is a way to get it silently wrong:
//
//   1. The `kind` is NOT the event name for five of the seventeen. The indexer
//      shortens them (`PositionSkippedBelowMinQuantity` -> `PositionSkipped`,
//      `CoverageDeclinedByEquityCap` -> `CoverageDeclined`,
//      `LiquidationKeeperRewardPaid` -> `KeeperReward`, `LiquidationThrottled`
//      -> `Throttled`, `LiquidationOrderPanicked` -> `OrderPanicked`), and
//      `kind` is what a consumer switches on. LIQUIDATION_KIND below is the one
//      place that mapping lives.
//   2. The ACCOUNT is not always the event's `account` argument. `AutoDeleveraged`
//      keys on `bankrupt` and the two stage-4 flows key on `from`, so an account
//      filter run against the wrong argument returns the counterparty's rows.
//   3. Which COLUMN an amount lands in is a semantic choice, not a rename.
//      `BadDebtAbsorbed` writes its gross hole to `deficit` and only the wei the
//      fund moved to `insuranceCovered`; `ResidualBackedByOpenPnl` writes to
//      `deficit` because equity backs it; only `ResidualBadDebt` and
//      `AdlPriceCapacityExhausted` write `badDebt`. Putting a level in a flow's
//      column makes a consumer's SUM wrong rather than absent.
//
// Four indexer columns have no home in the published `LiquidationEvent` type
// (`blockVolume`, `volumeCap`, `keeperReward`, `panicCode`), because
// `listLiquidations` does not select them. The live rows drop them too — matching
// the read surface is the parity requirement, so `Throttled` and `OrderPanicked`
// arrive as markers here exactly as they do from the indexer.

/** Event name -> the `kind` discriminator the indexed row carries. */
const LIQUIDATION_KIND: Readonly<Record<string, string>> = {
  AccountLiquidated: "AccountLiquidated",
  PositionLiquidated: "PositionLiquidated",
  PositionSkippedBelowMinQuantity: "PositionSkipped",
  PositionTakenOver: "PositionTakenOver",
  ResidualBadDebt: "ResidualBadDebt",
  ResidualBackedByOpenPnl: "ResidualBackedByOpenPnl",
  CoverageDeclinedByEquityCap: "CoverageDeclined",
  AdlSessionDiscarded: "AdlSessionDiscarded",
  AdlPriceCapacityExhausted: "AdlPriceCapacityExhausted",
  AdlCapacityShortfall: "AdlCapacityShortfall",
  LiquidationKeeperRewardPaid: "KeeperReward",
  LiquidationThrottled: "Throttled",
  LiquidationOrderPanicked: "OrderPanicked",
  BadDebtAbsorbed: "BadDebtAbsorbed",
  AutoDeleveraged: "AutoDeleveraged",
  PositionTransferred: "PositionTransferred",
  CloseOutMarginSettled: "CloseOutMarginSettled",
};

/** The fields a waterfall event actually carries; everything else defaults to null. */
type LiquidationFields = {
  pool?: string;
  size?: bigint;
  price?: bigint;
  counterparty?: string;
  badDebt?: bigint;
  insuranceCovered?: bigint;
  deficit?: bigint;
  coverageDeclined?: bigint;
  collateralAmount?: bigint;
  equity?: bigint;
  positionsProcessed?: bigint;
  stageReached?: number;
  marginStatusBefore?: number;
  marginStatusAfter?: number;
};

const str = (v: bigint | undefined): string | null => (v === undefined ? null : v.toString());
const num = (v: number | undefined): number | null => (v === undefined ? null : v);

/**
 *  Write one waterfall leg, defaulting every field the event does not carry.
 *
 *  Mirror of the indexer's `liquidationRow`, and it defaults to NULL rather than to
 *  `undefined` because that is what Hasura serves for an unset column — a live row read
 *  beside an indexed one must not differ on the absence.
 */
function writeLiquidation(
  ev: DecodedEvent,
  eventName: string,
  account: string,
  fields: LiquidationFields = {},
  store: MaterializerStore,
): void {
  const kind = LIQUIDATION_KIND[eventName];
  // Unreachable via applyEvent (every case below is in the table), so a miss means the
  // table and the switch have drifted. Dropping the row is the safe half of that bug;
  // writing it under the event name would put an unknown `kind` into a consumer's switch.
  if (kind === undefined) return;
  // Keyed on the row id, which is what the indexer keys on too — so a live leg and its
  // hydrated twin are one entry rather than two identical rows in the list.
  const id = `${ev.txHash.toLowerCase()}_${ev.logIndex}`;
  store.liquidations.set(id, {
    id,
    chainId: store.chainId,
    account: account.toLowerCase(),
    pool: fields.pool?.toLowerCase() ?? null,
    kind,
    size: str(fields.size),
    price: str(fields.price),
    counterparty: fields.counterparty?.toLowerCase() ?? null,
    // Reserved on the entity — no current event carries a penalty.
    penalty: null,
    badDebt: str(fields.badDebt),
    insuranceCovered: str(fields.insuranceCovered),
    deficit: str(fields.deficit),
    coverageDeclined: str(fields.coverageDeclined),
    collateralAmount: str(fields.collateralAmount),
    equity: str(fields.equity),
    positionsProcessed: str(fields.positionsProcessed),
    stageReached: num(fields.stageReached),
    marginStatusBefore: num(fields.marginStatusBefore),
    marginStatusAfter: num(fields.marginStatusAfter),
    timestamp: ev.timestampSec.toString(),
    blockNumber: ev.blockNumber.toString(),
    txHash: ev.txHash.toLowerCase(),
  });
}

/**
 *  A per-account funding settlement. `payment` passes through UNNEGATED: positive is what
 *  the account pays. The indexer does not flip it and neither does this, which is what
 *  lets a live row be reconciled against the chain and against the cumulative index.
 */
function onFundingSettled(ev: EventOf<"FundingSettled">, store: MaterializerStore): void {
  const id = `${ev.txHash.toLowerCase()}_${ev.logIndex}`;
  store.fundingPayments.set(id, {
    id,
    chainId: store.chainId,
    account: ev.args.account.toLowerCase(),
    pool: ev.args.perpPool.toLowerCase(),
    amount: ev.args.payment.toString(),
    timestamp: ev.timestampSec.toString(),
    txHash: ev.txHash.toLowerCase(),
  });
}
