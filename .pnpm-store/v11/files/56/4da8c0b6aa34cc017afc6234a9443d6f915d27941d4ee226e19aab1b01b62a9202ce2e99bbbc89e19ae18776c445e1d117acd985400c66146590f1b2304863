// Event ABI subsets the local materializer decodes from chain logs. Mirrors the
// events the Envio indexer consumes (indexer/config.yaml) — these signatures are
// the source of truth for client-side log decoding via viem.
//
// EVENTS ONLY — the file is named for what it holds. (It was `abi.ts` and also
// carried the CollateralRouter WRITE abi, the one ABI module whose name said
// nothing about its contents; that write surface now lives with the other write
// ABIs in tradeAbi.ts, next to its only consumer.)
//
// `liveEventsAbi` is the DECODE surface, not the handler surface. It carries every
// fragment for every address the tail may watch, and the reducer's switch has a
// `default: break` — so a decoded event with no case is inert. That is why the two
// perp singleton ABIs are folded in whole rather than a case at a time: the ABI must
// match the CONTRACT (a partial ABI is a partial roster to keep in sync), while cases
// arrive with the scopes that read them.
//
// SpotPool and BinaryPool both extend the somnia-dex OrderBook base and emit
// byte-identical order events, so ONE ABI decodes both books. Fills emit as
// `OrderFilled(takerOrderId, makerOrderId, quantityFilled, takerRemaining,
// makerRemaining, fillPrice)`. The taker side is unknown when OrderFilled fires
// (the taker's OrderPlaced lands later in the same tx); the reducer resolves
// the maker side via the in-memory store and defers taker classification.

/**
 * Order lifecycle events shared by SpotPool + BinaryPool (the OrderBook base).
 *
 * @category ABIs
 */
export const orderBookEventsAbi = [
  {
    type: "event",
    name: "OrderPlaced",
    inputs: [
      { name: "orderId", type: "uint128", indexed: true },
      {
        name: "placedOrder",
        type: "tuple",
        indexed: false,
        components: [
          { name: "orderId", type: "uint128" },
          { name: "isBid", type: "bool" },
          { name: "owner", type: "address" },
          { name: "userData", type: "uint64" },
          { name: "price", type: "uint256" },
          { name: "fullQuantity", type: "uint256" },
          { name: "quantityRemaining", type: "uint256" },
          { name: "expireTimestampNs", type: "uint64" },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderRested",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderCancelled",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderExpired",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderReduced",
    inputs: [
      { name: "orderId", type: "uint128", indexed: true },
      { name: "newQuantity", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderFilled",
    inputs: [
      { name: "takerOrderId", type: "uint128", indexed: true },
      { name: "makerOrderId", type: "uint128", indexed: true },
      { name: "quantityFilled", type: "uint256", indexed: false },
      { name: "takerRemainingQuantity", type: "uint256", indexed: false },
      { name: "makerRemainingQuantity", type: "uint256", indexed: false },
      { name: "fillPrice", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // Protocol-initiated maker removals in the base matching loop (same-owner
  // self-match with CancelMaker / the perps exceeds-position guard). Emitted by
  // newer OrderBook deployments (perp pools today); terminal like OrderCancelled.
  //
  // `OrderCancelledPreFill` is the BASE pre-fill-guard event: the matching loop
  // emits it for EVERY pre-fill removal, and a pool's reason tag rides alongside
  // it. Subscribing the base event is what makes the set complete — chasing the
  // reason tags one at a time is how these logs went undecodable, and a log whose
  // topic0 is absent here is discarded by the live tail before decoding, leaving
  // the order `Open` forever and showing phantom depth in the book.
  {
    type: "event",
    name: "OrderCancelledSelfMatch",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "MakerOrderCancelledExceedsPosition",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderCancelledPreFill",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
    anonymous: false,
  },
] as const;

/**
 *  The one event an accepted amend emits on a pool that amends in place (somnia-dex-protocol
 *  `IOrderBook.sol`, from the in-place SpotPool and PerpPool builds): the order keeps its id,
 *  and no OrderCancelled / OrderPlaced / OrderAmended fires. The payload is the order's whole
 *  mutable state after the amend.
 *
 *  Internal, not part of the exported `orderBookEventsAbi`: that constant also drives the
 *  network tape's decode, which has no use for it.
 */
const inPlaceAmendEventsAbi = [
  {
    type: "event",
    name: "OrderAmendedInPlace",
    inputs: [
      { name: "orderId", type: "uint128", indexed: true },
      { name: "userData", type: "uint64", indexed: false },
      { name: "price", type: "uint256", indexed: false },
      { name: "fullQuantity", type: "uint256", indexed: false },
      { name: "expireTimestampNs", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
] as const;

/** SpotPool-only events the live tail materializes (mark price + book params). */
export const spotPoolEventsAbi = [
  {
    type: "event",
    name: "MarkPriceUpdated",
    inputs: [
      { name: "asset", type: "address", indexed: true },
      { name: "markPrice", type: "uint256", indexed: false },
      { name: "rawMidpoint", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderBookParametersUpdated",
    inputs: [
      {
        name: "newParameters",
        type: "tuple",
        indexed: false,
        components: [
          { name: "tickSize", type: "uint256" },
          { name: "minQuantity", type: "uint256" },
          { name: "lotSize", type: "uint256" },
        ],
      },
    ],
    anonymous: false,
  },
] as const;

/**
 *  PerpPool-only events the live tail materializes (funding + open interest).
 *  Signatures verified against the DEPLOYED implementation's runtime bytecode, not
 *  against a source tree — the claim they previously carried ("mirror IPerpPool exactly,
 *  deployed testnet implementation") was false for both events here, and being false in a
 *  comment is how it survived: a wrong arity is a different topic0, so `watchEvent`
 *  filtered on something no pool ever emitted and the live funding tail silently never
 *  fired. `mise run verify:abis` in the indexer package is what now checks this class of
 *  claim mechanically.
 */
export const perpPoolEventsAbi = [
  {
    type: "event",
    // 5-arg. The 3-arg form declared here previously was never emitted by any deployed
    // pool, so `watchEvent` filtered on a topic0 that never appeared and the live
    // funding tail silently never fired.
    name: "FundingUpdated",
    inputs: [
      { name: "fundingRate", type: "int256", indexed: false },
      { name: "cumulativeFundingPerUnit", type: "int256", indexed: false },
      { name: "indexPrice", type: "uint256", indexed: false },
      // UNCLAMPED interval span; accrual is capped at n = window / interval.
      { name: "intervalsSettled", type: "uint64", indexed: false },
      // 0 is a SENTINEL for a stale/reverting mark feed, not a price.
      { name: "markPrice", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OpenInterestUpdated",
    // ONE total, not a (long, short) pair — the contract keeps a single counter because
    // the short side is provably equal in a matched CLOB. The two-arg form declared here
    // previously was a different topic0, so this subscription never matched either.
    inputs: [{ name: "openInterest", type: "uint256", indexed: false }],
    anonymous: false,
  },
  // The perps reason tags emitted alongside the base `OrderCancelledPreFill` when
  // the pre-fill guard pulls a maker. `_onMakerOrderCancelledPreFill` is a THREE-way
  // branch: negative equity (F-4), an unreadable mark, else exceeds-position (the
  // sibling tag on the OrderBook ABI above). All terminal. Declaring all three keeps
  // this ABI in step with the deployed PerpPool and with the indexer's handlers.
  {
    type: "event",
    name: "MakerOrderCancelledNegativeEquity",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "MakerOrderCancelledStaleMark",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
    anonymous: false,
  },
] as const;

/**
 *  MarginBank events — the perp ACCOUNT plane. MarginBank is a singleton, so one
 *  subscription carries every account and every pool; filter on the indexed
 *  `account` / `perpPool` topics, or at read time.
 *
 *  Three groups, in declaration order: position and funding (`PositionUpdated`,
 *  `FundingSettled`), collateral flow (`Deposited` … `CollateralUnlocked`), then
 *  money charged or moved (fees, rebates, and the settlement legs the liquidation
 *  waterfall books here rather than on `LiquidationEngine` — including the panic
 *  marker, which is a waterfall outcome despite the contract it fires from).
 *
 *  Owner-parameter `*Updated` events are deliberately absent: they carry admin
 *  wiring, not market data. `AccountCredited` / `CreditReclaimed` and the
 *  funded-principal pair are absent for the same reason — they belong to the
 *  voucher programme, which has no client surface yet.
 *
 *  Signatures are generated from `indexer/abis/MarginBank.json` and pinned by
 *  topic0 in `test/perpEventsAbi.test.ts`. Hand-typing is the documented failure
 *  mode here: three of these were wrong in the indexer config for exactly that
 *  reason, and the plane indexed nothing while looking healthy.
 *
 *  Everything except `BuilderFeeCharged`, which the live tail cannot fold in — see its
 *  own const below. `marginBankEventsAbi` recomposes the two into the published whole.
 */
const marginBankTailEventsAbi = [
  // 6-arg, since the 2026-08-06 MarginBank upgrade. `entryFundingIndex` is what makes
  // an account's unsettled funding reconstructible from a per-MARKET read rather than a
  // per-account one. The retired 5-arg form has a different topic0 and is not declared.
  {
    type: "event",
    name: "PositionUpdated",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "newSize", type: "int128", indexed: false },
      { name: "avgEntryPrice", type: "uint128", indexed: false },
      { name: "realizedPnl", type: "int256", indexed: false },
      { name: "entryFundingIndex", type: "int256", indexed: false },
    ],
    anonymous: false,
  },
  // A positive `payment` is what the account PAYS; MarginBank credits the account when
  // it is negative. Same convention as `FundingPayment.amount` on the indexer read.
  {
    type: "event",
    name: "FundingSettled",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "payment", type: "int256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // Deposit on someone else's behalf, scoped to one pool — a different topic0 from
  // `Deposited`, not an overload of it.
  {
    type: "event",
    name: "DepositedFor",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CollateralLocked",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CollateralUnlocked",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // `insurancePortion` is the slice of `amount` routed to the insurance fund, not an
  // extra charge on top of it.
  {
    type: "event",
    name: "FeeCharged",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "insurancePortion", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RebatePaid",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // ADL leg. `bankrupt` is whose position was force-reduced, `counterparty` who absorbed
  // it — so an account can appear on either side of one log.
  {
    type: "event",
    name: "AutoDeleveraged",
    inputs: [
      { name: "counterparty", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "bankrupt", type: "address", indexed: true },
      { name: "sizeReduced", type: "int128", indexed: false },
      { name: "bankruptcyPrice", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // Stage-4 close-out margin FLOW between two accounts. Not a loss.
  {
    type: "event",
    name: "CloseOutMarginSettled",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // `badDebt` is the FULL negative balance (a level, pre-coverage); `covered` is the wei
  // the fund actually moved (a flow). Summing the two double-counts the same hole, and
  // `ResidualBadDebt` on LiquidationEngine reports its uncovered remainder.
  {
    type: "event",
    name: "BadDebtAbsorbed",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "badDebt", type: "uint256", indexed: false },
      { name: "covered", type: "uint256", indexed: false },
      { name: "absorbedBy", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  // `collateralTransferred` FOLLOWS the position to `to`. Not a loss either.
  {
    type: "event",
    name: "PositionTransferred",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "size", type: "int128", indexed: false },
      { name: "collateralTransferred", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // A liquidation IOC that reverted with a Solidity PANIC rather than a protocol error —
  // a bug that reached the waterfall, caught so the waterfall stays reachable. Nothing
  // else durably records it, and the indexer folds it into the liquidation log as the
  // `OrderPanicked` kind, so a decoder of the waterfall needs it.
  {
    type: "event",
    name: "LiquidationOrderPanicked",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "panicCode", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // Linked-wallet funding: a main wallet advances margin to a child. `outstandingPrincipal`
  // is the running total after this advance, not the advance itself.
  {
    type: "event",
    name: "MainFundedChild",
    inputs: [
      { name: "child", type: "address", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "outstandingPrincipal", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // The two per-account margin elections. Both are also live chain reads, so the indexer
  // keeps no history of either; a watcher is the only way to see the change as it lands.
  {
    type: "event",
    name: "IsolatedModeSet",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "enabled", type: "bool", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MaxLeverageSet",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "leverageX", type: "uint16", indexed: false },
    ],
    anonymous: false,
  },
] as const;

/**
 *  `MarginBank.BuilderFeeCharged`, held apart from the rest of the bank's events.
 *
 *  It is PUBLISHED like its siblings — it is part of `marginBankEventsAbi` below — but it
 *  is the one MarginBank fragment `liveEventsAbi` does not fold in, because the NAME
 *  exists in two unrelated shapes on contracts the tail watches at the same time:
 *
 *    SpotPool / BinaryPool  BuilderFeeCharged(uint128 orderId, address builder, address token, uint256 amount)
 *    MarginBank             BuilderFeeCharged(address payer,   address builder, address perpPool, uint256 amount)
 *
 *  Both take four parameters, but the first differs in type (`uint128` vs `address`),
 *  so the topic0 hashes differ. Folding ONE of them into the tail's
 *  merged ABI makes the SDK look like it decodes builder fees while it silently drops
 *  every spot one — `test/eventsAbi.test.ts` compares the merged ABI's selectors per NAME
 *  against the indexer's subscriptions and caught exactly that. `MarketCreated` and
 *  `MarketFinalized` take the other route out of the same bind (both shapes declared);
 *  this one takes neither, because the SDK decodes no fee events at all (see the note
 *  further down this file) and so has nowhere to put the spot half.
 *
 *  A consumer decoding a MarginBank log directly is unaffected: it holds the bank's
 *  address, so one shape is the only shape it can see.
 */
const marginBankBuilderFeeEventAbi = [
  {
    type: "event",
    name: "BuilderFeeCharged",
    inputs: [
      { name: "payer", type: "address", indexed: true },
      { name: "builder", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

/**
 *  The published MarginBank event ABI — every fragment, in one const.
 *
 * @category ABIs
 */
export const marginBankEventsAbi = [...marginBankTailEventsAbi, ...marginBankBuilderFeeEventAbi] as const;

/**
 *  LiquidationEngine events — the liquidation waterfall. Also a singleton, and the
 *  waterfall is SPLIT with MarginBank: the engine emits the stages and their costs,
 *  while the settlement legs (`AutoDeleveraged`, `CloseOutMarginSettled`,
 *  `BadDebtAbsorbed`, `PositionTransferred`) land on `marginBankEventsAbi` above.
 *  A consumer that wants the whole story needs both ABIs.
 *
 *  Account-level events carry NO pool: `AccountLiquidated` covers every position the
 *  stage walked, and the residual/ADL-shortfall events describe the account's hole.
 *  Only the per-position events are pool-scoped, which is why a per-pool liquidation
 *  filter is lossy.
 *
 *  Owner-parameter `*Updated` events, bidder registration, and the scan-progress
 *  checkpoints (`AdlScanCheckpointed`, `AdlNoBadDebtToSocialize`) are out: they are
 *  keeper mechanics, not account outcomes.
 *
 *  Generated from `indexer/abis/LiquidationEngine.json` and pinned by topic0 in
 *  `test/perpEventsAbi.test.ts`.
 *
 * @category ABIs
 */
export const liquidationEngineEventsAbi = [
  // The stage summary for one account. `stageReached` and the two `marginStatus*` values
  // are enums, and the pair is what says whether the account came back above maintenance.
  {
    type: "event",
    name: "AccountLiquidated",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "positionsProcessed", type: "uint256", indexed: false },
      { name: "stageReached", type: "uint8", indexed: false },
      { name: "marginStatusBefore", type: "uint8", indexed: false },
      { name: "marginStatusAfter", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionLiquidated",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "sizeDelta", type: "int128", indexed: false },
      { name: "markPrice", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // A position too small to place a closing order against. It stays open, so a stage can
  // finish with the account still under maintenance.
  {
    type: "event",
    name: "PositionSkippedBelowMinQuantity",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "size", type: "int128", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionTakenOver",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "size", type: "int128", indexed: false },
      { name: "takeoverPrice", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // `tier` is INDEXED, so a fee stream can be filtered per tier without decoding.
  {
    type: "event",
    name: "LiquidationFeeCharged",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "tier", type: "uint256", indexed: true },
      { name: "fillNotional", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "LiquidationKeeperRewardPaid",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "keeper", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // The per-block volume cap declined further liquidation of this account on this pool.
  // The account is still liquidatable; the next block may resume.
  {
    type: "event",
    name: "LiquidationThrottled",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "blockVolume", type: "uint256", indexed: false },
      { name: "volumeCap", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // The hole nobody covered — the uncovered remainder of a `BadDebtAbsorbed` on MarginBank.
  {
    type: "event",
    name: "ResidualBadDebt",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "residual", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // A residual the account's own unrealized PnL still backs, so it is not yet a loss.
  {
    type: "event",
    name: "ResidualBackedByOpenPnl",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "residual", type: "uint256", indexed: false },
      { name: "equity", type: "int256", indexed: false },
    ],
    anonymous: false,
  },
  // Two dynamic arrays in `data` — a consumer MUST decode with this fragment rather than
  // read fixed offsets.
  {
    type: "event",
    name: "CoverageDeclinedByEquityCap",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "declined", type: "uint256", indexed: false },
      { name: "tiers", type: "uint256[]", indexed: false },
      { name: "losses", type: "uint256[]", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AdlCapacityShortfall",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "perpPool", type: "address", indexed: true },
      { name: "residualSize", type: "uint128", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AdlPriceCapacityExhausted",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "residual", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // `reason` is an INDEXED enum, so the second topic is a small integer, not an address —
  // filtering this one by "account plus anything" needs the null wildcard in slot 2.
  {
    type: "event",
    name: "AdlSessionDiscarded",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "absorbed", type: "uint256", indexed: false },
      { name: "reason", type: "uint8", indexed: true },
    ],
    anonymous: false,
  },
] as const;

/**
 *  MarketCreator factory event (13 fields) — live discovery of new binary
 *  markets created through the rolling-series creator, so the tail's watch set
 *  grows without re-touching the indexer.
 */
export const marketCreatorEventsAbi = [
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "market", type: "address", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "yesId", type: "uint256", indexed: false },
      { name: "noId", type: "uint256", indexed: false },
      { name: "collateral", type: "address", indexed: false },
      { name: "asset", type: "string", indexed: false },
      { name: "strike", type: "uint256", indexed: false },
      { name: "tradingStart", type: "uint64", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
      { name: "oracleQuestionId", type: "uint256", indexed: false },
      { name: "question", type: "string", indexed: false },
      { name: "intervalSec", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
] as const;

/**
 *  BinaryMarketsModule creation event (19 fields, different topic0 from the
 *  MarketCreator's) — EVERY market fires this (the module emits inside
 *  `createMarket`, whether called directly or via a wrapping MarketCreator), and
 *  it is the only creation event carrying the (operatorId, venueId) origin
 *  attribution. Watched alongside the MarketCreator in discovery mode so
 *  module-created markets join `watchAllMarkets(discover: true)` live.
 *  Signature mirrors smart-contracts BinaryMarketsModule exactly.
 */
export const binaryModuleEventsAbi = [
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "market", type: "address", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "oracleQuestionId", type: "uint256", indexed: false },
      { name: "operatorId", type: "uint32", indexed: false },
      { name: "venueId", type: "bytes32", indexed: false },
      { name: "creator", type: "address", indexed: false },
      { name: "collateral", type: "address", indexed: false },
      { name: "yesId", type: "uint256", indexed: false },
      { name: "noId", type: "uint256", indexed: false },
      // Settlement-extraction v2: the pool's market nonce (1 fresh, ++ on recycle)
      // — part of the outcome-id encoding + the pool→market binding key.
      { name: "nonce", type: "uint64", indexed: false },
      { name: "outcomeSlotCount", type: "uint8", indexed: false },
      { name: "marketType", type: "uint8", indexed: false },
      { name: "tradingStart", type: "uint64", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
      { name: "voidPolicy", type: "uint8", indexed: false },
      { name: "asset", type: "string", indexed: false },
      { name: "strike", type: "uint256", indexed: false },
      { name: "question", type: "string", indexed: false },
      { name: "context", type: "bytes", indexed: false },
    ],
    anonymous: false,
  },
  // Settlement-extraction v2 module lifecycle. `MarketFinalized` fires when a
  // market's backing + resolution snapshot are swept to the settlement singleton
  // (the redemption home). `PoolReleased` fires when the finalized, drained pool
  // is returned to its creator's free list — it CLOSES the pool→market binding
  // (the pool may next be recycled onto a different market). Both carry the pool
  // so the tail can flip the binding. Signatures mirror BinaryMarketsModule.
  {
    type: "event",
    name: "MarketFinalized",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "marketKey", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PoolReleased",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
    ],
    anonymous: false,
  },
] as const;

// Fee-event decoding (MarketFeeConfig / ProtocolFeeCharged / BuilderFeeCharged) is
// intentionally NOT done in the SDK: the per-market fee config and realized fee
// aggregates are served by the indexer (operatorAdmin.ts → MarketVenue). The settlement
// fee (`SettlementFeeCharged`) also stays indexer-only in v2 — it is now skimmed
// ONCE at finalize on the settlement singleton (not per-redeem on the pool), so it
// no longer moves the pool's live `setBacking`; the tail zeroes pool backing on
// `PoolFinalized` instead (see below). See indexer/src/handlers/binary.ts for the
// canonical fee stream (BuilderFeeRecord / ProtocolFeeRecord / SettlementFeeRecord).

/**
 *  BinaryPool v2 side-attribution + lifecycle events (settlement-extraction).
 *  `BinaryOrderPlaced(orderId, kind)` fires alongside every `OrderPlaced` on a
 *  binary pool — the ONLY authoritative side source (v2 stopped encoding the side
 *  in userData). `PoolFinalized` sweeps the pool's backing to settlement (→ pool
 *  backing 0). `PoolRecycled` re-points the pool at a fresh market (new nonce).
 *  Signatures mirror IBinaryPool exactly.
 */
export const binaryPoolEventsAbi = [
  {
    type: "event",
    name: "BinaryOrderPlaced",
    inputs: [
      { name: "orderId", type: "uint128", indexed: true },
      // OrderKind enum: 0 BUY_YES · 1 SELL_YES · 2 BUY_NO · 3 SELL_NO.
      { name: "kind", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PoolFinalized",
    inputs: [
      { name: "marketNonce", type: "uint64", indexed: true },
      { name: "backing", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PoolRecycled",
    inputs: [
      { name: "marketNonce", type: "uint64", indexed: true },
      { name: "market", type: "address", indexed: true },
    ],
    anonymous: false,
  },
] as const;

/**
 *  BinarySettlement singleton events (settlement-extraction v2) — the permanent
 *  redemption home. `MarketFinalized` records a market's net backing;
 *  `SettlementFeeCharged` the one-time fee skim; `Redeemed` a payout (debits the
 *  settlement record's backing — NOTE the v2 signature carries `marketKey` +
 *  separate `holder`/`to`, unlike the removed v1 pool `Redeemed`); `PayoutOwed`
 *  the push-fallback booking; `OwedClaimed` the later claim. Signatures mirror
 *  IBinarySettlement exactly.
 */
export const binarySettlementEventsAbi = [
  {
    type: "event",
    name: "MarketFinalized",
    inputs: [
      { name: "marketKey", type: "uint256", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "nonce", type: "uint64", indexed: false },
      { name: "collateralToken", type: "address", indexed: false },
      { name: "netBacking", type: "uint256", indexed: false },
      { name: "voided", type: "bool", indexed: false },
      // Settlement v3 emits the payout VECTOR, matching `IBinarySettlement` and the
      // signature the indexer subscribes to. It was still declared as a `uint8`
      // winner here, which is a DIFFERENT topic0 - so `liveTail` filtered every real
      // MarketFinalized log out before decoding, and live market state never received
      // `netBacking`. The reducer keeps this vector separately from raw payouts.
      { name: "payoutNumerators", type: "uint256[]", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SettlementFeeCharged",
    inputs: [
      { name: "marketKey", type: "uint256", indexed: true },
      { name: "feeRecipient", type: "address", indexed: true },
      { name: "grossBacking", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Redeemed",
    inputs: [
      { name: "marketKey", type: "uint256", indexed: true },
      { name: "holder", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "outcomeIdx", type: "uint8", indexed: false },
      { name: "amountBurned", type: "uint256", indexed: false },
      { name: "collateralOut", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PayoutOwed",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwedClaimed",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

/**
 *  BinaryMarket lifecycle events + BinaryPool `backing` events — keep live
 *  status/resolution AND collateral backing current so the tail (not the lagging
 *  indexer) is the authority on trading eligibility and on how much collateral
 *  a market holds. `SetMinted`/`SetBurned`/`Redeemed`/`SettlementFeeCharged`
 *  fire from the BinaryPool (log source = the pool) and drive the same `backing`
 *  running total the Envio indexer maintains (indexer/src/handlers/binary.ts).
 *  Signatures mirror somnia-dex-protocol IBinaryPool exactly.
 */
export const binaryMarketEventsAbi = [
  {
    type: "event",
    name: "StatusChanged",
    inputs: [
      { name: "oldStatus", type: "uint8", indexed: true },
      { name: "newStatus", type: "uint8", indexed: true },
    ],
    anonymous: false,
  },
  {
    // Settlement v3: BinaryMarket emits the payout VECTOR + denominator, not a single
    // indexed winner. The live-tail reducer derives a winner only for a one-hot vector.
    type: "event",
    name: "Resolved",
    inputs: [
      { name: "payoutDenominator", type: "uint32", indexed: false },
      { name: "payoutNumerators", type: "uint256[]", indexed: false },
    ],
    anonymous: false,
  },
  { type: "event", name: "Voided", inputs: [], anonymous: false },
  {
    type: "event",
    name: "VoidVector",
    inputs: [
      { name: "payoutNumerators", type: "uint256[]", indexed: false },
      { name: "policy", type: "uint8", indexed: false },
      { name: "source", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
  // BinaryPool: a YES+NO pair minted from collateral → backing += amount.
  {
    type: "event",
    name: "SetMinted",
    inputs: [
      { name: "payer", type: "address", indexed: true },
      { name: "yesTo", type: "address", indexed: true },
      { name: "noTo", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // BinaryPool: a YES+NO pair burned back to collateral → backing -= amount (floor 0).
  {
    type: "event",
    name: "SetBurned",
    inputs: [
      { name: "holder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // v2: the pool no longer emits `Redeemed` / `SettlementFeeCharged` — redemption
  // + the fee skim moved to the BinarySettlement singleton (see
  // `binarySettlementEventsAbi`). The pool's live backing is instead zeroed by
  // `PoolFinalized` (in `binaryPoolEventsAbi`) when the market finalizes.
] as const;

/**
 *  Everything the live tail decodes, in one ABI. Event names are disjoint
 *  except `MarketCreated` (MarketCreator 13-field vs BinaryMarketsModule
 *  19-field) and `MarketFinalized` (module vs BinarySettlement) — those have
 *  distinct topic0 hashes, so viem's `decodeEventLog` resolves the right variant
 *  per log. `test/perpPlaneTail.test.ts` pins the disjointness.
 *
 *  The two perp singletons contribute more fragments than the reducer cases: the
 *  liquidation and funding-settlement plane is handled, the per-account position and
 *  margin channel is not yet. Decoding one of those is inert, not wrong — see the
 *  file header — and a block of only those does not commit the store.
 */
export const liveEventsAbi = [
  ...orderBookEventsAbi,
  ...inPlaceAmendEventsAbi,
  ...spotPoolEventsAbi,
  ...perpPoolEventsAbi,
  // The tail subset, NOT the whole bank ABI: `BuilderFeeCharged` is excluded because the
  // name is shared with SpotPool/BinaryPool in a different shape. See its own note above.
  ...marginBankTailEventsAbi,
  ...liquidationEngineEventsAbi,
  ...marketCreatorEventsAbi,
  ...binaryModuleEventsAbi,
  ...binaryMarketEventsAbi,
  ...binaryPoolEventsAbi,
  ...binarySettlementEventsAbi,
] as const;
