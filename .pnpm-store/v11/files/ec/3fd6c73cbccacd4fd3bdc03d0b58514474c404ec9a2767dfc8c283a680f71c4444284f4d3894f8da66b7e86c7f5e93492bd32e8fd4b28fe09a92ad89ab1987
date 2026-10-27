# Perpetuals

Perps are live on testnet: `BTC/USDSO:USDSO` and `ETH/USDSO:USDSO`, backed by
PerpPool CLOBs riding the same shared OrderBook core as spot and binary.

## The shape

`Market` is a three-way discriminated union — `SpotMarket | PerpMarket |
BinaryMarket`, keyed on `marketType` (guards: `isSpotMarket` / `isPerpMarket` /
`isBinaryMarket`). A `PerpMarket` is a plain base/quote book plus perp state:
`marginBank`, `initialMarginBps`, `fundingRate`, `cumulativeFundingPerUnit`,
`indexPrice`, `openInterest`, `fundingWindowSec`, `fundingIntervalSec`.

> **`fundingRate` is per CALCULATION WINDOW** (`fundingWindowSec`, 28800s / 8h on every
> live pool) — not per settlement interval and not annualized. Each settlement accrues
> `rate / n` where `n = fundingWindowSec / fundingIntervalSec`: **8** on every live pool
> (3600s settlement). It has been **96** at a 300s cadence, and the same value means a 12x
> different per-interval accrual across that boundary — which still reaches anyone reading
> indexed history, so read `n` off each row rather than assuming it. Normalize with the
> helpers
> (`fundingRate8h`, `fundingRate1h`, `fundingRatePerInterval`, `annualizedFundingRate`),
> never with a hardcoded denominator.
>
> `openInterest` replaced `longOpenInterest` + `shortOpenInterest`: the contract keeps ONE
> counter because the short side is provably equal in a matched CLOB. The removed pair was
> `null` on every row — the subscription feeding it was dead.

- **Watches and live reads are unchanged.** Perp pools emit the same order
  events, so `watchMarket(pool)`, `getLiveSpotOrderBook`-style depth,
  `getLiveFills`, `getLiveUserOrders`, and the React hooks just work. Funding
  (`FundingUpdated`) and open interest (`OpenInterestUpdated`) stream into the
  perp market row live.
- **Margin, not escrow.** Collateral (USDso) lives cross-margin in the
  MarginBank: `trader.depositMargin` / `withdrawMargin` move it;
  `trader.placePerpOrder` (or plain `createOrder` on a perp symbol) locks
  margin from that balance — no per-order token approval.
- **Re-quoting a ladder? Amend it in one transaction.** `trader.amendOrders` re-prices
  N orders in one transaction (see SPOT.md for how each pool version applies it and
  what a `0n` id means). On a perp pool it needs no token fields at all — margin comes from the
  MarginBank, so there is no escrow to approve.
- **Builder attribution.** `placePerpOrder` takes optional `builder` /
  `builderFeeBpsTimes1k` (alongside its existing `expireTimestampNs`), both
  defaulting to no attribution. A non-zero fee needs a prior
  `trader.approveBuilder({ pool, builder, maxFeeBpsTimes1k })` and must stay
  within `trader.getMaxBuilderFeeBpsTimes1k(pool)` — read it rather than assuming it,
  since it is owner-updatable on a PerpPool and the rail is off while it is 0.
  Perp pools implement the same builder calls as binary ones, but **the approval
  is per pool**: approving a builder on one pool grants nothing on another, and
  an unapproved placement reverts `BuilderFeeExceedsApproval` (a PerpPool has no
  separate "not approved" check — an absent approval is simply a zero cap).
- **Positions are on-chain reads**, not indexed rows:
  `client.getPerpPosition({ marginBank, account, pool })` and
  `client.getMarginAccount(marginBank, account)` — or the unified
  `exchange.fetchPositions()`. Live pricing/funding comes from
  `client.getPerpState(pool)` / `exchange.fetchFundingRate(symbol)`.
- **MONITORING a mark feed is a different read.** `client.getPerpFeedStatus(pool)`
  answers whether the mark is live and how much open interest rides on it.
  `getPerpState` batches with `allowFailure: false` and one of its legs is a bare
  `IOracle.getPrice()`, so a dead or rotated oracle rejects the whole read — losing
  the verdict in the one case it matters most. `getPerpFeedStatus` keeps the mark
  verdict and open interest as a pair no oracle can revert, and degrades the index
  timestamp to `undefined` instead. Use `getPerpState` when you want the full
  pricing and funding picture and a dead oracle should fail the call.
- **…except when you want them all at once.** `client.listPerpPositions(account)`
  returns every pool's position in ONE indexer round-trip instead of a chain read
  per market — the right read for a positions _table_. It is a snapshot as of each
  row's `updatedAtBlock` and is **not marked to market**: unrealized PnL,
  liquidation price and margin health still need the chain reads above. Two things
  the shape will not let you get wrong, both documented on the type:
  `size` is **signed** (the entity stores magnitude and direction separately; they
  are folded back together here so a short can't read as a long), and the entry
  funding index is **absent by design** — it is not on the schema production
  serves, so it waits on the next reindex — and anything funding-sensitive belongs
  on `getPerpPosition`. Fully-closed positions are
  excluded unless you pass `includeFlat` — upserted rows are never deleted, so they
  linger at size 0 forever.
- **Margin health is a chain read too.** `getMarginAccount` now also returns the
  requirements + status (`imReq` / `mmReq` / `cmReq` / `marginStatus`, from
  `MarginBank.getAccountHealth` + `getMarginStatus`);
  `client.getAccountHealth(marginBank, account)` is the lighter standalone read
  when only health matters, and `client.getLiquidationPrice({ marginBank, pool,
account })` estimates the mark at which this pool's move alone would trip
  maintenance (null when flat). `MarginStatus` / `MARGIN_STATUS` /
  `AccountHealth` are exported; `exchange.fetchPositions()` now fills
  `UnifiedPosition.liquidationPrice`.
- **Account equity for scoring is one read.**
  `client.getAccountEquity(account, { scope: "perps", marginBank })` returns `equity`,
  `lockedCollateral`, their sum `totalEquity` and the block they were read at.
  `equity` counts free collateral only, and a resting order moves collateral to
  `lockedCollateral`, so score on `totalEquity`. The read has no history: store a
  snapshot at the start and at the end of the period. A market with no fresh mark
  price makes the read throw. Pass `blockNumber` to read at a fixed block instead of
  the head. `client.listAccountEquities(accounts, params)` reads a cohort at one block
  in batched requests; an account that cannot be priced comes back as
  `{ priceable: false }` and does not fail the rest. The `"spot"` and `"overall"` scopes take no
  `marginBank` and throw `NotSupportedError`.

  The change between two snapshots includes money that moved in or out of the
  account: deposits, withdrawals, credit-voucher grants and collateral that an order
  pulled from a wallet. Remove those flows before you call the change a trading gain.
  `getMarginEvents` with `kinds: ["Deposit", "Credited", "Withdraw"]` and
  `listPerpMarginPulls` list them, and `listPerpMainFundingEvents` kind `Returned` lists
  principal sent back to a main wallet. Do not add its `Funded` rows: each one repeats
  a `Main` pull. These reads cannot be bounded to a block
  yet, so a flow close to either snapshot cannot be placed exactly.

  ```ts
  const start = await client.getAccountEquity(account, { scope: "perps", marginBank });
  // ... one week later
  const end = await client.getAccountEquity(account, { scope: "perps", marginBank });
  const change = end.totalEquity - start.totalEquity; // still includes deposits, withdrawals and credits
  ```

- **Liquidation price: both sides of the inequality move with the mark.** Liquidation
  begins where `equity == mmReq`, and `mmReq` is recomputed on the _current_ mark
  (`ceil(|size| × mark × mmBps / (oneBase × 10000))`), so it shrinks under a falling
  long and grows under a rising short. Solving `equity(p) == mmReq(p)` therefore carries
  a `10000 ∓ mmBps` factor:

  ```text
  long    p = mark − (equity − mmReq) × oneBase × 10000 / (|size| × (10000 − mmBps))
  short   p = mark + (equity − mmReq) × oneBase × 10000 / (|size| × (10000 + mmBps))
  ```

  `perpLiquidationPrice(...)` is that solve, exported as a pure function — no client, no
  block — so you can re-run it against a live store or a hypothetical. Both
  `getLiquidationPrice` and `previewPerpLiquidationPrice` go through it, which is why
  they cannot disagree on identical inputs. It is a **single-market** solve: other
  markets' contributions are held at the value baked into `equity`/`mmReq`, so a
  correlated move across several markets liquidates sooner.

- **Where would an order put my liquidation price?**
  `client.previewPerpLiquidationPrice({ pool, marginBank, account, isBid, quantity,
price, asMaker? })` answers that for an order not yet placed, returning
  `currentLiquidationPrice` beside `projectedLiquidationPrice` so a form can show the
  move. It ports all four of `MarginBank.settleTrade`'s cases — open, increase (floored
  VWAP entry), reduce/close (realized PnL at the fill price, entry untouched), and flip
  (old side closed, remainder re-opened) — and charges the fill's fee, defaulting to the
  taker rate. A reduce moves the price _away_ from the mark and an add moves it _closer_,
  so the four cases are not interchangeable.

  Note what it deliberately does **not** do: it applies the whole quantity rather than
  splitting it against `getReducingCapacity` (that split governs the collateral _lock_,
  not the position), and it does not judge whether the order would be accepted — that is
  `previewPerpOrderMargin`'s job. An unpriceable market returns `{ priceable: false }`
  rather than reverting, so an order form can still render.

- **How much can I actually place?** `client.getMaxPerpOrderSize({ pool, marginBank,
account, isBid, price })` — what a **Max** button should call. The inverse of
  `previewPerpOrderMargin`, which the protocol does not offer.

  It does not re-derive the sizing rule; it **binary-searches the forward one**, so the
  two cannot disagree. That matters because a max computed by a second, subtly different
  rule reverts on placement — and the term such a rule most often drops is the adverse
  mark-to-entry reserve, which on a 10%-above-mark bid cuts the affordable size by
  roughly two thirds. `maxQuantity` is aligned **down** to the pool's lot grid.

  **Check `placeable`.** A size below the pool's `minQuantity` is a revert, not a small
  order. `limitedBy` names the binding gate — `"collateral"`, `"initialMargin"`,
  `"maxPositionSize"` or `"voucherBlocked"`. Market-wide `maxOpenInterest` is deliberately
  not modelled: it is enforced at fill against a total every other trader moves, so no
  client-side number can be right about it for long. Nor is book depth — this is a
  placement limit, not a liquidity one. Nor are the two non-margin gates that reject the
  whole order rather than shrinking it: a close-only market (`PerpPool.isRestricted()`)
  and isolated-margin confinement.

  **Pass `autoPull: true` when the transaction sender will be the order owner.** The pool
  tops the in-bank balance up from the owner's wallet before it locks (`_onOrderPlaced` →
  `MarginBank.quoteOrderTopUp` → `depositFor`), so an account with an empty bank and a
  funded, approved wallet goes from a max of `0n` to whatever the wallet funds. `msg.sender
== order.owner` is the pool's entire gate, and only the caller knows who will send —
  hence opt-in. Leave it off for `placeOrderFor`, an operator grant or the stop registry,
  where no pull happens.

  With it on, `topUpRequired` is the wallet spend to show beside the size, and `limitedBy`
  gains `"walletBalance"` / `"walletAllowance"` — different shortfalls with different
  fixes, so don't collapse them. `"restricted"` and `"isolated"` name the two gates that
  reject the whole order rather than resizing it.

  **A linked child is funded by two wallets, and both count.** The pool spends the
  owner's own wallet first and takes the residual from the main it is linked to, so
  `autoPull` reads `MarginBank.quoteFundingPayer` and adds the main's
  `quoteWalletCapacity` as a second leg. That matters most for the account the rail
  exists for: an isolated sub-account is meant to hold nothing, and sized off its own
  wallet alone it reads as unable to place anything at all.

  `fundingPayer` names the main **eligible** to fund a shortfall, or is `null` when the
  account funds itself — unlinked, a main itself, or the rail dormant on this deployment.
  Eligibility is not a debit: it resolves for every linked account, including an order
  needing no top-up and one whose own wallet covers the whole pull. `ownWalletPull` and
  `mainWalletPull` split `topUpRequired` between the two wallets in the order the pool
  spends them, and **only `mainWalletPull > 0n` proves a second wallet actually moves** —
  that is the figure to show before the trader signs.

  Read `topUpRequired` as the total REQUESTED, not one wallet's spend. Showing it as the
  child's debit over-states it by exactly the main's leg.

  `limitedBy` gains `"mainWallet"`, reported ahead of the two `wallet*` values whenever a
  main is in play: at a main-funded ceiling the child's own capacity is fully consumed,
  so `"walletBalance"` would also be literally true and would send a trader to fund a
  sub-account that is empty by design. It names the **preferred** remedy, not the only
  one — the two capacities add, so raising the child's balance or allowance lifts the
  ceiling just as well.

  **A partial pull is not a rejection on this path.** The unlinked pool asks for a fixed
  `topUpRequired` and the token reverts if the wallet is short. Both linked legs are
  `min(...)`-sized and neither can revert, so the pool pulls what it can and the margin
  gates judge the result — and `topUpRequired` includes the fee headroom, which is a
  reserve rather than part of the lock. So capacities that cover the lock but not the
  headroom fund an order the chain accepts, and `walletCoversTopUp` is informational
  there rather than a gate: read a `false` as "the position may be born close to its own
  initial margin", not as "this will be rejected".

  One case withholds the main's leg entirely. `MarginBank.depositForFromMain` allows one
  payer at a time, so while the child still owes a **prior** payer the pull reverts
  `PriorFundingPayerOutstanding` — reachable in one ordinary sequence: funded by main A,
  unlink, re-link to main B. `mainFundingBlocked` reports it and `limitedBy` says
  `"mainFundingBlocked"`; the fix is neither wallet but
  `trader.repayPerpMainFunding` against the old claim.

  It costs one extra read for an unlinked account and four for a linked one. The main's
  capacity arrives as a single `min(balance, allowance)`, which is all the bank exposes
  for another wallet, so a main-side shortfall does not say which of the two bound; read
  the main's token balance and allowance directly if you need that.

  Note the max is the top of the **contiguous** placeable region. Auto-pull makes the
  initial-margin gate non-monotone in quantity — it reduces to `(equity − unlocked) +
feeHeadroom ≥ imRequirement`, whose only size-dependent term grows — so an account whose
  existing positions sit below their own initial margin can be rejected at a middling size
  and accepted at a much larger one. `previewPerpOrderMargin` reports that faithfully; the
  max deliberately does not offer sizes out of the disconnected region, because a slider
  has to be placeable at every value below its maximum.

- **What do I get if I close?** `client.previewPerpClosePnl({ pool, marginBank, account,
quantity?, price?, asMaker? })` — backs a close modal. Omit `quantity` for the whole
  position; `price` defaults to the mark, which is the right estimate for a market close.

  Two things it gets right that a hand-derived figure usually does not, and **both are
  silent** — the close succeeds, the number shown was just wrong:

  1. **The size is aligned down to the lot grid first.** "Close all" on a position that
     is not a lot multiple leaves a remainder open. A modal reporting the position as
     flat is wrong, and it reads as a bug in the close button.
  2. **Funding settles on the whole position, not the closed share.** `settleTrade` calls
     `_settleFundingWithValues` _before_ it touches the position, and that uses the full
     `pos.size`. So a 10% close settles 100% of the accrued funding; pro-rating it — the
     intuitive move — under-states the cash impact by the other 90%.

  `netProceeds` is the number to show: `realizedPnl − fundingSettled − fee`, with
  `fundingSettled` positive when the account pays. `realizedPnl` **floors** toward −∞
  (`_realizedPnlForClose`), which is the opposite of the truncation unrealized PnL uses —
  the same inputs give `-1` here and `0` from `getPerpPositionAnalytics`, and both are
  correct.

  `placeable` is the pool minimum and nothing else. A close is only purely reducing up to
  `_reducingCapacity` — `|size|` minus what is already resting on the reducing side — so
  closing out while a reduce order is down leaves an increasing remainder that locks
  collateral and must clear `meetsIMForOrder`. Read `previewPerpOrderMargin` beside this
  one on an account with resting orders. `fee` is the pool's own maker/taker rate; a
  builder fee attached at placement is charged on the same notional and lands on top.

- **What is this position actually doing?** `client.getPerpPositionAnalytics({ marginBank,
pool, account })` for one, `client.listPerpPositionAnalytics({ marginBank, account })`
  for a positions table. Two reads for one position, `1 + 2n` for the table, all pinned
  to one block.

  This is the split `getAccountHealth` cannot give you: it returns **one** equity figure
  for the whole account, with every market's PnL and funding already summed and netted
  together, so a two-position trader cannot see which position carries the loss and
  cannot see funding at all. Back apart:

  | Field                                                        | Means                                                                                   |
  | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
  | `unrealizedPnl`                                              | `(mark − entry) × size / oneBase` — price only, **excludes** funding                    |
  | `accruedFunding`                                             | funding **owed** since entry; **positive means you pay**                                |
  | `equityContribution`                                         | `unrealizedPnl − accruedFunding` — what this position adds to equity                    |
  | `notional`                                                   | `\|size\| × mark / oneBase`                                                             |
  | `initialMarginRequirement`                                   | "position margin" — the only per-position margin the protocol defines                   |
  | `maintenanceMarginRequirement` / `closeOutMarginRequirement` | the liquidation and takeover thresholds' shares                                         |
  | `returnOnMarginBps`                                          | `equityContribution` over the initial requirement, **net of funding**; `null` when flat |

  A direct port of `MarginBank._computePositionMetrics` and `_marketHealthFromSnapshot`,
  which is what lets the rows re-sum to the bank's own equity to the wei — a test pins
  that. **The two roundings differ and are not interchangeable**: unrealized PnL
  truncates toward zero, while funding ceils toward +∞ so a payer never underpays. For a
  negative quotient that is the opposite of rounding the magnitude up.

  `accruedFunding` uses the pool's _projected_ cumulative index, so it includes intervals
  no one has settled yet — settlement is permissionless and lazy, and measuring against
  the settled index under-reports what the account already owes. An unpriceable market
  comes back as `{ priceable: false }` rather than throwing, so one dead feed costs one
  row rather than the page. `initialMarginRequirement` uses the market's IMF only: an
  account leverage setting raises the bar for a _new_ order but never appears in health,
  so use `previewPerpOrderMargin` for the order-gating figure. The pure core is exported
  as `perpPositionAnalytics(...)` — no client, no block.

- **How levered am I?** `client.getPerpLeverage({ marginBank, pool, account })`.
  **The protocol has no leverage view to call** — `getMaxLeverage` /
  `getMaxLeverageLimit` / `getVoucherLeverageCap` are all _cap configuration_ and none of
  them measures a position — so this derives it from mark notional over equity, and
  returns every denominator rather than picking one:

  | Field                  | Means                                                                                                   |
  | ---------------------- | ------------------------------------------------------------------------------------------------------- |
  | `positionLeverageBps`  | this position's notional over account equity                                                            |
  | `accountLeverageBps`   | **Σ** notional over account equity — the figure that governs risk under cross margin                    |
  | `marketMaxLeverageBps` | `10000² / effectiveImfBps` — the most this market will open at, at _live_ OI-scaled IMF                 |
  | `accountMaxLeverageX`  | the account's own per-market cap, `0` when unset (what `setPerpLeverage` writes, finally readable)      |
  | `protocolMaxLeverageX` | the ceiling that clamps it                                                                              |
  | `creditFloor`          | the account's credit-voucher floor; `0n` on an ordinary account, and the switch that arms the two below |
  | `voucherLeverageCapX`  | what a voucher account is confined to when it **increases**; `0` is a block, not "uncapped"             |
  | `voucherMarketAllowed` | whether this market is on the voucher allowlist                                                         |

  The ceilings are **not** collapsed into one number, and they do not compose by taking a
  minimum. A voucher cap _replaces_ an unset or looser `accountMaxLeverageX` before
  `protocolMaxLeverageX` clamps the result, and it applies only to a position increase —
  `MarginBank._meetsIM` gates the whole voucher branch on `additionalSize > 0`, so a
  voucher holder can always close out or place a stop, even on a market since removed from
  the allowlist. The load-bearing half is that a voucher turns an _unset_ account cap into
  an enforced one: `accountMaxLeverageX === 0` means "no cap" on an ordinary account and
  "confined to `voucherLeverageCapX`" on a voucher one. For whether a _specific_ order
  passes, use `previewPerpOrderMargin`, which applies all of it and reports
  `voucherBlocked`.

  Every ratio is **bps of 1x** (`10_000` = 1.00x, `200_000` = 20x), matching the
  protocol's own unit for every margin figure. Position and account leverage are `null`
  on non-positive equity — an account with no equity left is insolvent, not infinitely
  levered; read `marginStatus` for that. `accountNotional` costs two extra reads per
  _other_ active market (the MarginBank exposes no aggregate, and `imReq` can't be
  inverted because each market applies its own IMF), so a single-market account pays
  nothing extra.

- **Liquidation-keeper reads — who holds, and what a bankrupt position is worth.**
  The MarginBank keeps a per-(pool, side) holder array, so a keeper can find every
  open position from head state alone — no off-chain indexer:

  ```ts
  const { holders, asOfBlock } = await client.getPerpSideHolders({ marginBank, pool, isLong: true });
  const prices = await Promise.all(
    // Priced at the SNAPSHOT's block — at head, a holder that closed since
    // the enumeration would revert NoOpenPosition and reject the sweep.
    holders.map((h) => client.getBankruptcyPrice({ marginBank, account: h, pool }, { blockNumber: asOfBlock })),
  );
  ```

  `getPerpSideHolders` pages through the bank's bounded slice view (many holders per
  round-trip) with every page pinned to ONE block; feed `asOfBlock` into
  `getBankruptcyPrice`'s `blockNumber` option (and into the other side's call) to
  keep a sweep on one consistent snapshot. The other position/health reads answer
  at head only.

  `getBankruptcyPrice` is the **contract's own figure** — the price at which the
  position's allocated share of the account's equity is exhausted — and it is a
  different quantity from `getLiquidationPrice`, not a better version of it:
  `getLiquidationPrice` is the SDK's client-side estimate of where liquidation
  _triggers_ (use it for UI and monitoring), while `getBankruptcyPrice` is what the
  contract computes a bankrupt position to be worth (use it for anything that
  settles or bids — a keeper pays against this number, and a client-side estimate
  can drift from contract rounding). It reverts rather than returning a sentinel:
  `ContractRevertError` with `errorName: "NoOpenPosition"` when the account is flat
  in that pool (branch on `errorName`, never message text).

- **The ADL queue — where a position stands if a liquidation reaches ADL.**
  Auto-deleveraging (ADL) is the last stage of a liquidation that the bidders and the
  insurance fund cannot cover. The engine closes profitable positions on the other
  side of the bankrupt's market, in the order that its ranker contract decides.
  `client.perpAdlQueue` reads that order for one side of one market at one block, and
  follows it as it changes:

  ```ts
  const stop = client.perpAdlQueue.subscribe({ marginBank, pool, isLong: true }, (view) => {
    if (view.status !== "ready" && view.status !== "stale") return;
    const { queue } = view.data;
    if (queue.regime !== "ranked") return;
    const candidates = queue.holders.filter((h) => h.eligibility === "candidate");
    for (const h of candidates) console.log(h.account, `${h.adlRank}/${candidates.length}`, h.positionLeverageBps);
  });
  ```

  The read follows the engine. It reads the ranker and the scan cap from the engine
  at the pinned block. A side with more holders than the scan cap is walked in storage
  order, so the read returns `regime: "storageOrder"` and no order. A holder is a
  candidate when its position is in profit at the mark, its account is priceable, and
  its equity is positive. These are the rules of the engine's claw-back arm, which it
  takes when the bankrupt account's realized balance is negative. When the ranker
  reverts or returns a bad order, the engine uses holder-list order. The read gives
  that order and sets `orderSource` to `"rankerReverted"` or `"rankerInvalid"`.

  The live view reads the side again when the MarginBank reports a change that can
  move the queue: any trader's fill, close, liquidation, takeover, forced settlement,
  ADL or funding settlement on this market, and any account's deposit, withdrawal,
  credit, linked funding or close-out payment, your own included. It also reads every 30 s, which picks
  up what moves the order with no followed event: a price move, a holder's equity
  changing on another market, and order placement and cancellation. Each order locks
  or releases its margin, which moves the trader's equity and so its place, but the
  bank emits them several times a second, so they are not followed. `getSnapshot`
  reads once, unless a live view of the side is ready: then it returns that view.

  The queue is an estimate for an ADL on this market alone. A running ADL session
  continues from its own cursor and prices. One liquidation call shares its scan
  budget across the bankrupt account's markets. On the burn arm, when the bankrupt
  account's realized balance is not negative, the engine admits any position that is
  not at a loss at the bankruptcy price and does not check equity, so a holder with no
  equity that is not at a loss there is closed first. Do not tell a trader that a position cannot be
  auto-deleveraged.

- **Protocol state — is the stack wired and solvent.** The plane below any one account
  or market, mirroring what the protocol repo's `perps:state` / `perps:health` ops
  tasks read:

  ```ts
  const cfg = await client.getPerpSystemConfig(marginBank); // the address book
  const fund = await client.getInsuranceFundState(cfg.insuranceFund);
  const eng = await client.getLiquidationEngineConfig(cfg.liquidationEngine);
  ```

  `getPerpSystemConfig` is the entry point: every other contract in the plane is
  reachable from it, so nothing is hardcoded per chain, and it carries `fullyWired` —
  a single flag for "some part of this stack is half-configured", which is the state
  where liquidation and settlement degrade silently rather than reverting.

  Point the other two at the addresses it returns. `liquidationEngine` is the **proxy**:
  an implementation address answers with unset defaults (zero bidders, zero penalty),
  which reads as a configured-but-idle engine rather than the wrong address.
  `bidderCount === 0n` is itself operational — with no registered backstop bidders the
  takeover stage has nobody to take a position over, so the waterfall reaches ADL
  sooner than the configuration implies.

  For account-level health when a feed may be down: `tryGetPerpAccountEquity` returns
  `null` rather than reverting (null is "not computable", never "zero"), and
  `getPerpCollateralBasis` is a solvency floor that reads one storage pair and cannot
  revert at all.

- **Take-profit / stop-loss listing.** `client.listPerpStopOrders({ account?, pool?, status? })`.
  The PerpStopOrderRegistry keeps pending orders in private storage behind no
  enumeration getter, so there is no chain read that answers "what stops do I have" —
  creation and triggering both work, but without this a trader cannot see, price or
  cancel what they created. It is indexed, and there is no chain fallback.

  One call covers every scope: `{ account }` for a trader's working stops (default
  status `PENDING`), `{ pool }` with no account for a market's whole pending book, and
  `status` for history. `account` is optional deliberately — a market-wide view of
  what will fire is a legitimate monitoring read.

  Read `dropReason` before calling a `TRIGGER_FAILED` order a failure: `ReduceOnly*`
  means the stop was overtaken by events (position already closed, flipped, or below
  the minimum), which is ordinary; only `PlacementFailed` is a rejection. SOMI is
  consumed on every fire either way.

  A listed row has no `limitPrice`. Fetch it for live stops with
  `client.getPerpStopOrders(refs)`.

- **The registry may be holding SOMI for you.** Placing a perp stop pre-pays the
  trigger gas in SOMI. Cancelling refunds it by direct transfer — but when that
  transfer _fails_, the registry credits an unclaimed balance instead and emits
  `SomiRefundFailed`. That is the ordinary outcome for a contract owner with no payable
  receiver (most multisigs and smart accounts). A registry wind-down credits the same
  balance to **every** owner, EOAs included.

  ```ts
  const owed = await client.getUnclaimedPerpStopSomi({ registry: perp.stopRegistry, account });
  if (owed > 0n) await trader.claimPerpStopSomi({ registry: perp.stopRegistry });
  ```

  Read before claiming — `claimSomi` reverts `NothingToClaim` on a zero balance, and
  the payout is a plain native transfer to the caller, so an owner that still cannot
  receive native reverts `WithdrawalFailed` and the balance stays put. Do not assume an
  EOA is owed nothing: the wind-down path reaches them too. Note the trigger path is the
  opposite of a refund — SOMI is consumed on every fire and never returned.

- **Batching writes that have to be atomic.** One SDK write is one transaction, which
  is wrong for a flow that is only safe as one — an order with TP/SL attached (sent
  separately, the order can fill and sit with no stop on it), approve + deposit,
  withdraw + forward to the wallet. `trader.buildPlacePerpStopOrder`,
  `buildCancelPerpStopOrder(s)`, `buildDepositMargin` and `buildWithdrawMargin` take the
  same parameters as their sending twins and return the unsigned call
  (`{ to, data, value, description }`) for you to pack into one UserOp / Safe batch /
  multicall.

  Two gotchas. Approvals come back rather than going out — `operatorApproval` on a stop,
  `approval` on a deposit — and must execute **before** the call they enable; the perp
  stop's grant especially, because without it the trigger reverts and the prepaid SOMI is
  spent having placed nothing. And no ids come back, because you hold the receipt: read
  them with `decodePerpStopOrderIds(receipt.logs, registry)`.

- **Where the registry address comes from.** Every stop write —
  `placePerpStopOrder`, `cancelPerpStopOrder`, `cancelPerpStopOrders` — takes the
  per-pool `PerpStopOrderRegistry` as a required `registry` argument. Read it off the
  market row: `stopRegistry` on `PerpMarket`, and on the market context attached to
  perp portfolio orders and fills. `null` there means the pool has no registry
  deployed, so TP/SL is unavailable on it — not that the address is elsewhere.
- **One call for a market header.** `exchange.fetchTicker(symbol)` on a perp now
  returns `markPrice`, `indexPrice`, `fundingRate`, `fundingTimestamp` and
  `openInterest` alongside the 24h high/low/volume it already computed from candles.
  Those five are chain state, not candle-derived, so before this a header needed a
  second read the consumer had to know to make. They are `undefined` on spot and
  binary, and no chain round-trip is spent on a non-perp.

  They also survive an indexer outage. The candle read is contained, so a failed
  one gives `statsState: "unavailable"` with the 24h fields absent while these
  five still answer. Read `statsState` before reading a 24h field.

  `fundingRate` is on the **same per-8h axis** as `fetchFundingRate` and
  `fetchFundingRateHistory` — deliberately, because a header on one basis beside a
  chart on another is a wrong number that looks right. It is not the per-settlement
  amount. For one settlement's charge, divide by `n = fundingWindowSec /
fundingIntervalSec` (8 on every live pool) — and for a HISTORICAL row that caught up
  over several intervals, multiply that by the row's `intervalsAccrued`, since one
  settlement can charge more than one interval's worth. Both figures ride on `info.perp`.
  `markPrice` is omitted rather than reported as 0 when the feed is stale.

- **Previewing an order before you send it.**
  `client.previewPerpOrderMargin({ pool, marginBank, account, isBid, quantity, price })`
  returns what the pool will actually lock and whether it will accept the order — the
  read behind an order form's "margin required" row and its submit gate.

  Do **not** reach for `quoteMeetsIMForOrder`: it runs with the order's base margin
  treated as already reserved (true on the real path, where `lockCollateral` runs
  first), so called cold it counts the order's margin nowhere and returns `true` for
  almost any size. `meetsPerpImForFill` does charge base margin, but neither models
  the lock's **adverse mark-to-entry reserve** — a buy above mark (or sell below)
  opens underwater by that gap and the pool reserves it on top of initial margin.
  That term is the usual reason a `notional × IMF`-sized "max" order gets rejected.

  Two gates are reported separately because they fail for different reasons and imply
  different fixes: `hasCollateralForLock` (can the lock be taken at all) versus
  `meetsInitialMargin` (does what remains still cover the requirement) — "deposit
  more" versus "close something".

  Only the _increasing_ leg locks. An order that nets against an existing position
  locks nothing up to `effectiveReducingCapacity`, which resting opposite-side orders
  have already partly spoken for.

  **Pass `autoPull: true` when the sender will be the order owner**, and both gates
  describe the balance the pool will have topped up to from the wallet rather than the
  one already in the bank. `topUpRequired` is then the wallet spend to show beside the
  margin figure, and `wallet` carries the balance and MarginBank allowance it was
  measured against. `feeHeadroom` appears either way: it is not charged and not part of
  `lockAmount`, only an auto-pull addend that keeps a fresh max-leverage position out of
  `MarginCall` at birth.

  A `topUpRequired` of `0n` means three different things — no pull needed, or one of the
  pool's declines: a purely reducing order, an account already in debt, or a
  voucher-blocked increase. Read it beside `unlockedCollateral`, not on its own.

  Every read is pinned to one block, so the result is a statement about that block;
  the adverse-gap term moves with the mark, so re-quote near send time for anything
  close to the edge.

- **Market discovery is a chain read, and "deployed" is not "tradeable."**
  `client.listPerpPoolStatuses({ factory })` enumerates the
  `PerpPoolFactory` and returns every market with the **two independent gates** that
  decide tradeability — they fail for unrelated reasons and both must pass:
  1. `restricted` — the market is close-only. Position-increasing orders revert
     `MarketRestricted`; closes, reduces and cancels still work. These stay listed on
     purpose (holders must still exit), and it is reversible.
  2. `registered` — the MarginBank has activated the pool. Coming from the factory
     only proves a pool is _authentic_; `addPerpPool` is what makes it usable. An
     unregistered pool rejects every quote view and settlement callback while reading
     as an ordinary market from the factory. (`getPoolTier` is **not** a substitute —
     it is itself gated on registration.)

  `tradeable` folds both together, and `listTradeablePerpPools` filters to it. You
  do not pass a MarginBank: it is a per-network singleton in practice, but each pool
  names its own and that is the bank its settlement path uses, so it is read per pool
  and returned on every row — ready for the `getMarginAccount` / `getPerpPosition`
  reads that follow.

  Do **not** build a market list from the factory's raw pool list: it is the
  deployment history, so listing it unfiltered presents wound-down markets as
  tradeable. Testnet today has 10 pools, four of them restricted `SBTC*` arena
  markets.

  This is also more complete than the indexer, whose perp set comes from a curated
  manifest — a market deployed after that manifest was written is invisible there and
  present here.

- **Per-market risk parameters are a chain read.** `client.getPerpRiskParams(pool)`
  returns the pool's frozen config — initial / **maintenance** / close-out margin in
  bps, the OI and position caps, and the maker/taker rates. `maintenanceMarginBps`
  is exposed nowhere else (the indexed market row carries only `initialMarginBps`),
  and without it a client can show the real liquidation price of an open position
  but not the **projected** one for an order it hasn't placed. This read never
  reverts, so maintenance margin stays available when the mark feed is down —
  exactly when you most want to explain a liquidation.
- **Initial margin is not a constant.** `initialMarginBps` is only the FLOOR of the
  curve: with dynamic IMF enabled the pool scales it with open interest, and
  `client.getEffectiveImfBps(pool)` is the rate actually charged. Sizing an order
  off the static base under-margins it whenever OI has pushed the curve up, and the
  pool rejects an order the client believed fit. Maintenance margin deliberately
  does **not** scale — a liquidation threshold must not move under a position
  because the market's OI grew.
- **One call for a health walk.** `client.getPerpHealthSnapshot(pool)` returns
  `oneBase`, mark, projected cumulative funding, the effective IMF and both
  thresholds together; the contract added it so a cross-margin walk reads a market
  once instead of five times. It returns a discriminated union — an unpriceable
  market arrives as `{ priceable: false }` rather than an all-zero struct, because a
  `maintenanceMarginBps` of `0` reads as "can never be liquidated". Narrow on
  `priceable` before touching a field.

## Linked wallets (isolated margin)

Isolated margin on perps is one wallet per position. The MarginBank is cross-margin,
so a single account's collateral backs every position it holds; the only way to give
one position its own collateral bucket is to open it from its own wallet. `setIsolated`
does not do this — it is single-market confinement, which caps how many markets one
account may touch and changes no margin math.

One wallet per position used to mean one treasury operation per position. The
linked-wallet rail removes that. A wallet links to a **main** wallet, and from then on
the child's position-increasing orders draw their margin shortfall from the main's
wallet. One funded main serves every child linked to it.

Two layers, and they answer different questions:

- `LinkedWalletRegistry` is the **consent** graph. It records who is linked to whom and
  grants no authority over funds.
- `MarginBank` is the **money** layer, and it is armed separately. Until the bank holds
  a registry address the rail is dormant and no child can draw on any main, whatever
  the registry says.

### Linking a sub-account

A link takes a two-sided handshake and **both wallets sign**. The main offers, the child
accepts, and no wallet can act for the other:

```ts
// The MAIN offers. Its own deposit leaves the standing allowance the rail spends.
await main.trader.depositMargin({ marginBank, amount: fromHuman(1000, 18) });
await main.trader.proposePerpWalletLink({ marginBank, child: childAddress });

// The CHILD accepts, with its own signer and its own transaction.
await child.trader.acceptPerpWalletLink({ marginBank, main: mainAddress });

// The child's own placement now pulls the shortfall from the main's wallet.
await child.trader.placePerpOrder({ pool, isBid: true, price, quantity });
```

Pass `registry`, `marginBank` or `pool` to any of the four consent writes. Only
`registry` skips a chain read: the bank names the registry it treats as authoritative,
so the SDK reads it from the bank rather than a manifest, and a bank holding none throws
`NotConfiguredError` rather than sending consent nowhere. That read is never cached,
because the bank's owner can rotate the registry.

### How the funding actually happens

There is no funding call, and this is the part that surprises people. The main supplies
USDso and an ERC-20 allowance to the **MarginBank**, and then sends nothing. `PerpPool`
performs the pull inside the child's own order placement:

- The child's own wallet pays first, sized by `min(balance, allowance)`.
- The main's wallet pays the residual, sized the same way.
- The pool's entire gate is `msg.sender == order.owner`. An order routed through
  `placeOrderFor`, an operator grant, a router or the stop registry pulls **nothing**,
  from either wallet.

So the child must send its own orders, and it needs native SOMI for gas. Revoking the
main's allowance stops the funding without touching the link. Funding does not wait for
link maturity: the rail reads the raw graph, and `maturesAt` gates ADL netting only.

What a main funds is a **claim, not a gift**. The bank records the funded principal
against the child, and the child's `withdraw` frees at most `balance - principal` — so a
compromised child key can trade the money and lose it, but cannot take it out. The
child's own money is the junior tranche: a loss eats it first, and a child that
genuinely lost the principal owes nothing.

### Getting the money back

Read the outstanding claim with `client.getPerpMainFunding(marginBank, account)`. Two
routes send it home, and they differ only in who signs:

| Write                                             | Signer    | Use it when                                 |
| ------------------------------------------------- | --------- | ------------------------------------------- |
| `trader.repayPerpMainFunding({ amount })`         | the child | the child is finished and returns the money |
| `trader.recallPerpMainFunding({ child, amount })` | the payer | the main pulls its capital back             |

Both pay the payer the bank snapshotted at funding time, not whoever is linked now, so
an unlink or a re-link in between cannot misroute the money. Both **clamp** the amount
to `min(amount, outstanding, present balance)`, so over-asking is safe and only a clamp
that reaches zero reverts. Both recover principal and never winnings.

`trader.unlinkPerpWallet({ counterparty })` dissolves the link from either end. It
settles no money, so clear the claim first if the intent is to part cleanly.
`PerpsUnlinkGuard` vetoes it while the leaver holds open positions and is at
`PartialLiquidation` or worse; a healthy or flat wallet can always leave.

### Batching the two steps that need it

Two steps have an ordering dependency inside one transaction, and each has a build-only
twin for it:

- `trader.buildAcceptPerpWalletLink` — accept, then open the isolated position, in one
  signature.
- `trader.buildRepayPerpMainFunding` — repay, then withdraw the remainder. The
  withdrawal's own gate reads the claim the repayment clears, so it has to follow.

The other four writes are standalone administrative calls and have no twin.

### Which read answers which question

The six chain reads are live contract STATE — a value as of a block, which no log can
reconstruct. The history is the opposite: the contracts expose no getter for any of it,
so the events in the chain's logs are the only record, and the indexer is what makes
them queryable.

| Question                                            | Read                                                   | Tier    |
| --------------------------------------------------- | ------------------------------------------------------ | ------- |
| Is the rail on at all on this deployment?           | `client.getPerpLinkedWalletRegistry(marginBank)`       | chain   |
| Is a main eligible to fund this account, and which? | `client.quotePerpFundingPayer(marginBank, account)`    | chain   |
| What is outstanding, and to whom?                   | `client.getPerpMainFunding(marginBank, account)`       | chain   |
| What can a wallet actually contribute right now?    | `client.getPerpWalletPullCapacity(marginBank, wallet)` | chain   |
| Who is in my group, and when did it mature?         | `client.getPerpWalletLinkage(registry, wallet)`        | chain   |
| Which children does this main have?                 | `client.listPerpLinkedChildren(registry, main)`        | chain   |
| How many children may one main hold?                | `client.getPerpMaxLinkedChildren(registry)`            | chain   |
| How did it get to this state?                       | the three `list*` ledgers below                        | indexer |

**Eligibility is not a prediction.** `quotePerpFundingPayer` takes no order and no
sender, so it cannot say whether a given order will debit the main. Four things stop an
eligible main from paying anything: the order needs no top-up, the child's own wallet
covers the whole pull, the order is routed by someone other than its owner, or the main
has no spendable capacity. Size the order with `client.previewPerpOrderMargin({
autoPull: true })` and read its `mainWalletPull` for the amount that would actually
move.

`quotePerpFundingPayer` returns a discriminated union rather than an address, because
the contract's single zero collapses three situations a UI must not render alike.
Narrow on `funded` first:

```ts
const payer = await client.quotePerpFundingPayer(marginBank, account);
if (payer.funded) {
  // A main is ELIGIBLE to cover what this account's own wallet cannot. Whether any
  // given order debits it is `previewPerpOrderMargin({ autoPull: true }).mainWalletPull`.
  console.log("eligible payer", payer.payer);
} else if (payer.reason === "unlinked") {
  // The one case the user can fix, by linking.
} else if (payer.reason === "dormant") {
  // The rail is off for everyone here. Linking would not help.
} else {
  // "isMain" — linked, but funding flows main->child only.
}
```

`getPerpMainFunding` reports the claim and the payer **snapshotted at funding time**,
which is not necessarily whoever is linked now. When the two disagree, the snapshot is
who gets repaid. It also carries `withdrawableFromPrincipal`, which is always `0n` — a
field rather than prose because "why can I not withdraw my balance" is the commonest
question this surface has to answer.

### Finding an incoming proposal

The registry keeps pending proposals in a hashed map with **no getter**. So a child
cannot discover from any chain read that a main has offered it a link, and
`client.listPerpWalletLinkEvents` is the only evidence such an offer exists.

That list yields **candidates, not accepts that will succeed**. `acceptLink` applies
five live-state guards, and each is a current-state rather than an ever-happened
question:

1. An offer stands only while the pair's newest row is the `Proposed` itself. Mind the
   direction: an unlink clears the pending proposal in **both** directions, so an
   `Unlinked` naming this wallet as the main can retire an offer it holds as the child.
2. The child must be free right now (`AlreadyLinked`). Accepting one main leaves the
   losing mains' proposals in storage, dead only while that link stands.
3. The main must not itself be a child right now (`CallerIsChild`).
4. The accepting wallet must not itself be a main (`CallerIsMain`).
5. The main must be under its child cap (`MaxChildrenReached`).

All five are **derivable in principle** from a complete `Linked` / `Unlinked` replay —
except the cap, whose value is owner-tunable and whose `MaxChildrenUpdated` event is
deliberately not subscribed. In practice a paginated page of rows is not a complete
replay, which is the real reason not to decide an accept off this list.

So confirm on chain. `client.getPerpWalletLinkage(registry, wallet)` settles guards 2,
3 and 4 — read it on both parties, since `main` being non-zero means the wallet is
already in a group. It does **not** carry the cap: that is
`client.getPerpMaxLinkedChildren(registry)` against
`client.listPerpLinkedChildren(registry, main)`.

### The two funding ledgers, which must not be summed

Every proposal, link, pull, settle and return is indexed, because the chain keeps no
history of any of it:

```ts
const links = await client.listPerpWalletLinkEvents({ child: account }); // Proposed | ProposalCancelled | Linked | Unlinked
const pulls = await client.listPerpMarginPulls({ account, source: "Main" }); // the POOL side — names the order
const claims = await client.listPerpMainFundingEvents({ account }); // the BANK side — carries the running claim
```

**A MAIN-funded leg emits a row on each side for the same wei.** Adding
`listPerpMarginPulls` to `listPerpMainFundingEvents` therefore double-counts every
main-funded transfer. Read one or the other, never both as one total, and pick by the
question: the pool side names the **order**, the bank side carries the **claim**.

The overlap is exactly the main legs, and no more. An own-wallet pull has no bank-side
twin: the bank's `DepositedFor` is deliberately not subscribed, because
`PerpMarginPull(source: "OwnWallet")` already carries the same amount plus the order id.
So `PerpMainFundingEvent` is the main legs only, while `PerpMarginPull` is both.

One placement can produce two `PerpMarginPull` rows — an `OwnWallet` leg and a `Main`
leg, in that order — because the child's own wallet contributes what it can before the
main is touched. Filter on `source: "Main"` to see only what a main actually paid for.

On `PerpMainFundingEvent`, a `Settled` row moved no cash: it records the child's losses
discharging part of the claim, so its `amount` is `null` while
`outstandingPrincipal` still drops. Fold by `kind` rather than summing `amount`.

## Credit vouchers (house money)

A credit voucher is a one-time grant of collateral into a new account's MarginBank
balance. The grant is non-withdrawable. The account can trade with it and can withdraw
profit above it. A `VoucherDistributor` holds the budget and the campaign rules, and the
bank names the live distributor, so no deployment address is needed.

| Question                                  | Read                                                    | Tier  |
| ----------------------------------------- | ------------------------------------------------------- | ----- |
| Is a campaign live, and what does it pay? | `client.getPerpVoucherCampaign(marginBank)`             | chain |
| Can this account claim now? If not, why?  | `client.getPerpVoucherEligibility(marginBank, account)` | chain |
| How much house money does it hold?        | `client.getPerpVoucher(marginBank, account)`            | chain |

Check eligibility before you claim. A failed claim still mines and costs gas:

```ts
const eligibility = await client.getPerpVoucherEligibility(marginBank, account);
if (eligibility.eligible) {
  await trader.claimPerpVoucher({ marginBank });
} else {
  // "dormant" | "notStarted" | "ended" | "notFlat" | "mainFunded" | "alreadyClaimed" | "budgetExhausted"
  console.log("cannot claim:", eligibility.reason);
}
```

Rules to know before you build on it:

- **One claim per address, for the distributor's life.** A new campaign window does not
  reset it.
- **The account must be flat to claim.** No positions and no resting perp orders.
- **The grant confines position increases.** Only allowlisted markets, at no more than
  the voucher leverage cap, and the account cannot change its own leverage setting.
  `getPerpLeverage` and `previewPerpOrderMargin` already apply these rules.
- **Own funds can mix in.** A voucher account can still deposit, and an order placed
  with an ERC-20 allowance to the bank can pull wallet collateral in. To keep an account
  on house money only, do not ask it for that allowance.
- **The grant expires.** After `expiresAt`, anyone can sweep the remaining floor back to
  the distributor, but only while the account is flat. A sweep never forces a close.
- **Each grant is indexed.** It appears in `client.getMarginEvents` as `kind: "Credited"`.

`trader.buildClaimPerpVoucher` returns the unsigned claim, so a claim and the first order
can go out as one transaction. The claim must execute first.

## History (indexer)

The CURRENT position/margin is the chain read above; the **append-only history**
the chain doesn't expose is indexed (perp account plane), all one-shot indexer
reads:

```ts
const funding = await client.getFundingPayments(account, { pool, limit: 50 }); // signed funding paid/received
const margin = await client.getMarginEvents(account, { limit: 50 }); // deposit/withdraw/lock/unlock
const liqs = await client.listLiquidations({ party: account, pool }); // liquidation events involving this wallet
const changes = await client.listPerpPositionChanges({ account, pool }); // every position update, with its realized PnL
const fillChanges = await client.listPerpPositionChangesForFills(account, fills); // the update each of the account's fills made
const rates = await client.listFundingRateHistory(pool, { from, to }); // per-pool funding-rate series
const candles = await client.listFundingRateCandles(pool, 3600, { from, to }); // 1h/4h/1d rollups for charting
const oi = await client.getOpenInterestHistory(pool); // per-pool open-interest series
```

### Realized PnL per close

This section explains how to read the result of one closed trade. The position row from
`listPerpPositions` keeps only the latest state, so it cannot show one trade.

`client.listPerpPositionChanges` returns one row for each `MarginBank.PositionUpdated`.
MarginBank emits one for each order-book fill, for each auto-deleveraging or market wind-down leg, and for
both sides of a liquidation takeover. So the history covers every way a position closes,
also liquidations that leave no fill.

- Each row has the signed size before and after, the size it closed, the entry price
  before and after, and the PnL of that update alone. All values are exact `bigint` raw
  units.
- `kind` says what the update did: `OPEN`, `INCREASE`, `REDUCE`, `CLOSE` or `FLIP`. Pass
  `kinds: ["REDUCE", "CLOSE", "FLIP"]` to get only the updates that realized PnL.
- One order that fills across several book levels makes several rows. Group the rows by
  `account`, `pool` and `orderId`, and sum their `realizedPnl` and `closedSize`. Do not
  group by `txHash` alone: one transaction can hold both parties' rows and several
  orders. Rows with no `orderId` (liquidation takeover, ADL, wind-down) are one close each.
- A full close reports a zero entry price. `entryPriceBefore` keeps the entry that the
  close realized against, and `exitPrice` the price it closed at, also for a liquidation,
  ADL or wind-down close with no fill.
- The PnL is price PnL only. Fees (`listPerpFees`) and funding (`getFundingPayments`) are
  separate records.

To label a trade history, `client.listPerpPositionChangesForFills(account, fills)` pairs
each of the account's fills with the update that fill made, so a row can say Open Long,
Close Short or show a flip. Pass one page of the account's fills, at most 1,000. The result
has one `PerpPositionChange` or `null` for each fill, in the same order. `null` means the
fill is not the account's, is not a perp fill, or its update is not indexed yet. An indexer
that predates position changes throws `PerpPositionChangesUnavailableError` instead: show
each fill's own side until it is reindexed.

`IndexedPerpPosition.lastUpdateRealizedPnl` is the running total of the same deltas for the
current position. It restarts from zero when a flat position reopens or the position flips side.

`listFundingRateHistory` / `getOpenInterestHistory` are the append-only
counterparts to the overwrite-only `fundingRate` / `openInterest` fields on the
perp `Market` row (which only carry the latest value). `getFundingRateHistory` is
the deprecated alias of the first; it forwards verbatim. `listFundingRateHistory`
sorts on `timestamp`, then `blockNumber`, then `id`, all in the direction of
`order`. Rows that share a timestamp therefore come back in the same order on
every read.

Liquidation history is served by the `LiquidationEngine` subscription, which is
live — the contract is deployed and indexed from block 436,735,800. There is no
`MarginBank`-sourced fallback: `MarginBank.Liquidated` was deleted from the
protocol, so the rows that claim used to describe cannot exist. Per-position
detail comes from `LiquidationEngine.PositionLiquidated`, and the waterfall's
other outcomes (ADL, takeover, close-out, the residual and declined-coverage
markers) arrive as sibling rows sharing a `txHash` — read `kind` to tell them
apart, and read the TSDoc on `badDebt` / `insuranceCovered` / `deficit` /
`coverageDeclined` before aggregating any of them, because only the flows are
summable.

### Reading a liquidation's stage

`AccountLiquidated` rows carry `stageReached`. It tells you how far down the
waterfall a liquidation went. The number needs a mapping, because the protocol
enum is 0-indexed with six members while the published waterfall numbers its
stages 1 to 6:

| `stageReached` | Enum member         | Published stage                                                                                                                    |
| -------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 0              | `OrderCancellation` | before stage 3 — cancelling the account's resting orders alone restored health                                                     |
| 1              | `CLOBPartial`       | stage 3                                                                                                                            |
| 2              | `BidderTakeover`    | stage 4                                                                                                                            |
| 3              | `InsuranceFund`     | stage 5                                                                                                                            |
| 4              | `ADL`               | stage 6                                                                                                                            |
| 5              | `Deferred`          | not a stage — stage 3 hit its per-block rate limit, and stages 4 to 6 were not consulted. Ships dormant, so it does not appear yet |

Published stages 1 (Healthy) and 2 (Margin Call) are account states, not actions.
The engine cannot reach them, so no value maps to them.

Two rules govern the number, and neither is visible in the value itself.

**It names the deepest stage that acted, not the deepest stage consulted.** A
stage that ran and moved nothing does not promote it. So a `BidderTakeover` (2)
row sitting beside a `BadDebtAbsorbed` row is consistent. It means the insurance
fund was asked and paid nothing. `BadDebtAbsorbed` fires on the request, not on
the payment, so read `insuranceCovered` on that row to see whether the fund
actually paid. A market the fund does not cover produces exactly this shape: the
loss falls through as `ResidualBadDebt`.

**`CLOBPartial` (1) is a fall-through marker.** It means stages 4 to 6 were
consulted and none of them acted. It does not prove stage 3 filled anything.
Against an empty book you get `CLOBPartial` with a `positionsProcessed` of 0,
which means the account's orders were cancelled and no position was closed. Read
`positionsProcessed` with it:

```ts
const rows = await client.getLiquidations({ account });
const summary = rows.find((r) => r.kind === "AccountLiquidated");
// A real CLOB partial fill, not an empty-book no-op.
const clobFilled = summary?.stageReached === 1 && Number(summary.positionsProcessed) > 0;
```

`counterparty` on a `BadDebtAbsorbed` row names the fund the engine asked. The
address is recorded even when `insuranceCovered` is 0, so it does not mean the
fund paid either.

`marginStatusAfter` needs the same care. A flat account that still owes bad debt
reports `CloseOut` (3) so the debt stays visible to monitoring. That is a
terminal state, not an account that is still liquidatable. A `ResidualBadDebt`
row in the same transaction identifies it.

If you query the indexer's GraphQL directly rather than through the SDK, note
that its own field descriptions still carry the older wording for `kind`,
`counterparty` and `stageReached`. Correcting them changes the served schema and
so needs a reindex; it is tracked separately. This section is the current
reference.

## Watch the perp plane (liquidations + funding settlement)

`watchMarket(pool)` gives a perp pool's book, funding RATE and open interest.
`watchPerpMarkets()` gives the other half: the liquidation waterfall and
per-account funding settlement, with the same snapshot-then-live guarantee.
Neither implies the other, so a UI showing both opens both.

```ts
const plane = await client.watchPerpMarkets();

const liqs = client.listLiveLiquidations({ party: account, limit: 50 });
const paid = client.listLiveFundingPayments({ account, limit: 50 });

const unsubscribe = client.subscribeLive(() => {
  // re-read; results are memoized per store version
});

// Teardown: the listener and the watch are released separately.
unsubscribe();
plane.stop();
```

The rows are the SAME `LiquidationEvent` and `FundingPayment` types
`listLiquidations` and `getFundingPayments` serve, in the same newest-first
order, so the two merge without translation. The live window is hydrated from
the newest indexed rows, so it OVERLAPS the newest indexed page: merge by `id`,
never by concatenation, or legs and their amounts are counted twice.

That order is a TOTAL key on all three paths — the live store, the hydration and
the indexed reads: `(timestamp, blockNumber, id)` for liquidations, and
`(timestamp, id)` for funding payments, which carry no block column. Every leg
of one waterfall shares a timestamp, so the tie-break is what makes a `limit`
boundary land on the same rows whichever path serves them. The last key is the
row id and not the log index inside it, because the indexed reads can only order
on a column that exists.

React:

```tsx
const status = useWatchPerpMarkets(); // "unwatched" | "hydrating" | "live"
const liqs = useLiveLiquidations({ party: account });
const paid = useLiveFundingPayments({ account });
```

The two read hooks acquire the plane themselves, so `useWatchPerpMarkets` is
only needed for the status — or to pass `{ marginBank }`, which the read hooks
have no way to supply: `useWatchPerpMarkets({ marginBank })`.

Each of these hooks also takes `chainId` in its options. It reads that chain's
engine on a multi-chain exchange. Without it, the hook reads the primary chain.

```tsx
const liqsOnChain = useLiveLiquidations({ party: account, chainId });
```

For error UI, use `useWatchPerpMarketsResult()`, which returns the typed
acquisition result instead of only warning. Worth preferring on this feed: a
plane that failed to start and a venue where nothing has been liquidated both
render as an empty list, and only the result tells them apart.

### One scope for the whole venue

There is no `watchPerpMarket(pool)`, and that is forced rather than chosen.
MarginBank and LiquidationEngine are singletons, so the log subscription is one
stream whatever you ask for. And the account-level waterfall legs
(`AccountLiquidated`, `ResidualBadDebt`, `ResidualBackedByOpenPnl`,
`CoverageDeclined`, ...) carry no pool at all, so a per-pool scope would either
drop them or attach them to every pool.

So filter at read time. A `pool` filter is honest but PARTIAL: it keeps only the
per-position legs, exactly as the indexed read's nullable `pool` column does.
Filter by `party` for every row involving one wallet. Use `account` when the
wallet must be the liquidated side. For a `party` row, compare `row.account`
with the wallet. If they differ, the wallet is `row.counterparty`; `size` and
`price` describe the liquidated account's leg, not the wallet's leg. Read the
`LiquidationEvent` field docs to interpret each kind before showing it in a
wallet view.

### One liquidation is several rows

Read `kind` first. The rows are stages of one mechanism sharing a `txHash`, not
repetitions of one event. Seventeen kinds arrive here, and the SDK produces the
same set the indexer does.

Two of them key on a wallet you might not expect. `AutoDeleveraged` is keyed on
the BANKRUPT account, so an account assigned in as the profitable counterparty
has no row of its own — it appears in the `counterparty` column instead. The
stage-4 flows (`PositionTransferred`, `CloseOutMarginSettled`) are keyed on
`from`. Read either side with `client.listLiquidations({ party: account })`.
Use `kind` to select one stage. A wallet view can select its position legs in
one bounded read. `kinds: []` adds no filter.

```ts
const positionLegs = await client.listLiquidations({
  party: account,
  kinds: ["PositionLiquidated", "PositionTakenOver", "AutoDeleveraged"],
});
```

This selection omits `PositionTransferred`. MarginBank emits it as the
settlement record for the same takeover as `PositionTakenOver`, so including
both would count one takeover twice.

Before aggregating anything, read the field TSDoc on `LiquidationEvent`. Only
`insuranceCovered` and `coverageDeclined` are flows and safe to SUM.
`badDebt` and `deficit` are LEVELS — overlapping per-stage views of one hole —
so summing them double-counts, and `collateralAmount` is collateral that moved
between accounts rather than a loss.

Four columns the indexer keeps have no home on the published type
(`blockVolume`, `volumeCap`, `keeperReward`, `panicCode`), because
`getLiquidations` does not select them either. So `Throttled`, `KeeperReward`
and `OrderPanicked` arrive as markers from both sources alike.

### What the watch costs

One indexer request, at hydration. After that the plane is fed from chain logs
only, and a socket drop is healed by resubscribe plus a chain backfill with no
second indexer touch — the same contract `watchMarket` has.

It also needs the plane's wiring. The MarginBank comes from an indexed perp
market row, and `MarginBank.getSystemConfig()` reports the LiquidationEngine
from there, so nothing is hardcoded per chain. Pass
`watchPerpMarkets({ marginBank })` only for the case that cannot cover: an
indexer with no perp rows at all, where there is nothing to ask. It is a
FALLBACK, never an override: it is used when the indexer names no bank, including
on a scope a read hook acquired a beat earlier with no hint to give, and it is
ignored when the indexer named one. The hydrated rows are that bank's plane, so a
hint that won would splice one venue's history onto another venue's stream.

If that wiring read fails the watch is REFUSED rather than opened over the bank
alone, which would stream funding settlements and silently no liquidations —
indistinguishable from a venue with none. The rejection type is
`SomniaMarketsClientWatchPerpMarketsError`.

## Watch from chain (event ABIs)

Indexer history is one-shot and the chain reads are point-in-time. To see a perp
event as it lands, decode the log yourself. The SDK publishes the event ABIs so
your decoder uses the same signatures the SDK and the indexer use:

| ABI                          | Contract          | Scope                | Carries                                                                               |
| ---------------------------- | ----------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `perpPoolEventsAbi`          | PerpPool          | one per market       | funding rate, open interest, the maker pre-fill reason tags                           |
| `marginBankEventsAbi`        | MarginBank        | singleton, all pools | positions, collateral flow, funding settlement, fees, the liquidation settlement legs |
| `liquidationEngineEventsAbi` | LiquidationEngine | singleton, all pools | the liquidation waterfall stages and their costs                                      |

Both singletons serve every pool and every account, so a subscription is one
stream. The pool and the account are indexed topics, not the log source. Get the
addresses from the market row and the system config:

```ts
import { getAbiItem } from "viem";
import { liquidationEngineEventsAbi, marginBankEventsAbi } from "@somnia-chain/markets-sdk";

const market = await client.getPerpMarket(perpMarketId);
const { liquidationEngine } = await client.getPerpSystemConfig(market!.marginBank);
const viem = client.getViemClient(); // shares the SDK's WebSocket

// Per-wallet funding settlement. `payment` is signed: positive is what the
// account PAYS.
const unwatchFunding = viem.watchEvent({
  address: market!.marginBank,
  event: getAbiItem({ abi: marginBankEventsAbi, name: "FundingSettled" }),
  args: { account },
  onLogs: (logs) => {
    for (const log of logs) console.log(log.args.perpPool, log.args.payment);
  },
});

// Every liquidation on the venue. `PositionLiquidated` is pool-scoped, so filter
// by pool here if you only want one market.
const unwatchLiquidations = viem.watchEvent({
  address: liquidationEngine,
  event: getAbiItem({ abi: liquidationEngineEventsAbi, name: "PositionLiquidated" }),
  onLogs: (logs) => {
    for (const log of logs) console.log(log.args.account, log.args.sizeDelta, log.args.markPrice);
  },
});
```

Three things to know before you build on this.

**The waterfall is split across both singletons.** LiquidationEngine emits the
stages and their costs. MarginBank emits the settlement legs of the same
liquidation — `AutoDeleveraged`, `PositionTransferred`, `CloseOutMarginSettled`
and `BadDebtAbsorbed`. Subscribe both, or you see half of each event.

**Account-level events carry no pool.** `AccountLiquidated`, `ResidualBadDebt`,
`AdlPriceCapacityExhausted` and their siblings describe the account, not one
market. A per-pool liquidation filter therefore drops them. Filter by pool only
on the per-position events.

**Not every field is summable.** `BadDebtAbsorbed` reports `badDebt` (the full
negative balance, before coverage) beside `covered` (the wei the insurance fund
moved). `ResidualBadDebt` reports the uncovered remainder of the same hole.
Adding them counts one loss twice. The same applies to `collateralTransferred` on
`PositionTransferred` and `amount` on `CloseOutMarginSettled`: both are flows
between accounts, not losses.

The signatures are pinned by topic0 against the compiled artifacts in
`test/perpEventsAbi.test.ts`. A wrong signature is a different topic0, which means
`watchEvent` filters on something no contract emits and your handler never fires,
with no error to see. Use the published ABI rather than a copy.

Note the SDK's own live tail does not subscribe either singleton yet, so
`client.watchMarket(pool)` gives you funding-RATE updates (`FundingUpdated` on the
pool) but not funding settlement, positions or liquidations. Those are the raw
watch above until the tail covers them.

## Quick start

```ts
const exchange = new SomniaMarkets({ chain, wsRpcUrl, indexerUrl, privateKey });
await exchange.loadMarkets();

await exchange.depositMargin("BTC/USDSO:USDSO", 1_000); // USDso → MarginBank
await exchange.createOrder("BTC/USDSO:USDSO", "limit", "buy", 0.001, 62_000);
const [pos] = await exchange.fetchPositions(); // long/short + uPnL
const { fundingRate, markPrice } = await exchange.fetchFundingRate("BTC/USDSO:USDSO");
```

## One-shot reads (no watch)

For a plain fetch without a live tail:

```ts
const perps = await client.listPerpMarkets({ baseSymbol: "WBTC", limit: 20 });
const one = await client.getPerpMarket(perps[0].id); // null if not a perp
const port = await client.getPerpPortfolio(account, { ordersLimit: 50, tradesLimit: 50, since });
const hist = await client.listPerpOrderHistory(account, { limit: 100 }); // FINISHED orders
const state = await client.getPerpState(one!.poolAddress); // mark/index/funding/OI
```

`listPerpMarkets` takes a `PerpMarketFilter` (`baseSymbol` / `quoteSymbol`, all
server-side); `getPerpPortfolio` takes the shared `PortfolioOptions`
(`ordersLimit` / `tradesLimit` / `since`). Trades default to the **last seven days** —
the result's `tradesSince` is the bound that was applied; pass `since` to widen it.
Positions + collateral stay on-chain
(`getPerpPosition` / `getMarginAccount`), not indexed rows.

`getPerpPortfolio` returns **open** orders only, so `listPerpOrderHistory` is the
other half — finished orders, most-recently-ended first. It excludes working orders
by default and sorts by when each order _ended_ rather than when it was placed, so a
long-resting order that just filled lands at the top of a history view instead of
buried at its placement date. Pass `status` to narrow to particular outcomes.

Sort axis is selectable — `orderBy: "ended"` (default) or `"placed"`.

Watch `Closed`: it is terminal, not transitional. Every pool places an order as
`Closed` and a following `OrderRested` promotes it to `Open`, so an IOC that
partially filled without resting stays `Closed` forever — reading it as "still
working" shows a finished order as live.

## Writing forward-compatible code

```ts
const m = client.getLiveMarketByPool(pool);
switch (m?.marketType) {
  case "BINARY":
    /* YES/NO book */ break;
  case "SPOT":
    /* base/quote book */ break;
  case "PERP":
    /* base/quote book + funding/positions */ break;
}
```

Key on `marketType` (not on field presence), use the type guards, and read
decimals off the market row rather than assuming.
