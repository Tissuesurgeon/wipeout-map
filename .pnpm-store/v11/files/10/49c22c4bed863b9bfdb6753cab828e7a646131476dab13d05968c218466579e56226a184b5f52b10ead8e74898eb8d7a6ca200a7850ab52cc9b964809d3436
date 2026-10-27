// Minimal write-side ABIs the trader needs (kept self-contained, like abi.ts).
// Signatures verified against smart-contracts: somnia-dex BinaryPool /
// BinaryMarket / ERC-20. Settlement (mintSet / burnSet / redeem) lives on the
// pool, not the market — users approve the pool for collateral + outcome
// tokens, then call pool methods directly.
import { parseAbi } from "viem";
export const erc20WriteAbi = parseAbi([
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
]);
/**
 * Write ABI for binary order placement, order maintenance, and complete sets.
 *
 * **Gotchas**
 *
 * Binary placement uses `placeBinaryOrder`; the generic `placeOrder` entry
 * reverts on a binary pool. Prices use the YES side even for NO orders.
 *
 * @category ABIs
 */
export const binaryPoolWriteAbi = parseAbi([
    // Settlement-extraction v2: the generic `placeOrder`/`placeOrderFor`/`amendOrder`
    // entries REVERT `UseBinaryPlacement` on a binary pool — the YES/NO order kind is
    // now an explicit param (v2 frees `userData` for opaque MM bookkeeping). `kind`
    // is the OrderKind enum (0 BUY_YES, 1 SELL_YES, 2 BUY_NO, 3 SELL_NO); `price` is
    // always the YES-side price. builderFee MUST be uint96 (selector-critical, as v1).
    // `payable` mirrors the on-chain signature (binary pools take no msg.value, but
    // the selector includes it). Returns (success, id).
    "function placeBinaryOrder(uint8 kind, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k, uint64 userData) payable returns (bool success, uint128 id)",
    "function placeBinaryOrderFor(address owner, uint8 kind, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k, uint64 userData) payable returns (bool success, uint128 id)",
    "function cancelOrder(uint128 orderId)",
    // Shrink a resting order's remaining quantity IN PLACE (keeps price-time queue priority,
    // unlike amend which re-inserts at the back). Inherited from the OrderBook base and NOT
    // gated on a binary pool — BinaryPool implements the `_onOrderReduced` -> `_refundPartial`
    // hook, so the freed collateral / outcome escrow is returned to the owner. `orderId` is the
    // uint128 OrderId; `newQuantityRemaining` must be a lotSize multiple, >= minQuantity, and
    // < the order's current remaining (reverts `ExpiredOrderMustBeCancelled` on an expired order).
    "function reduceOrder(uint128 orderId, uint256 newQuantityRemaining)",
    // Permissionless keeper drains for the resting book (inherited from the OrderBook base,
    // callable by anyone on a binary pool). Both return locked escrow to each cleaned order's
    // owner and are best-effort (skip non-expired / stale entries rather than reverting):
    //  - cancelExpiredOrders: clean an explicit list of expired orders by id.
    //  - sweepExpiredAtLevel: walk one price level from the best order, cleaning up to maxCount
    //    expired orders; returns how many it cleaned.
    "function cancelExpiredOrders(uint128[] orderIds)",
    "function sweepExpiredAtLevel(bool isBid, uint256 price, uint256 maxCount) returns (uint256 cleaned)",
    // Permissionless closing-price capture (TRAD-106, capture-generation pools only): once the
    // market's expiry passes, stores the closing book's bid/ask mid and lifts the closing-book
    // lock (post-expiry removals of orders that were alive at the close revert CloseNotCaptured
    // until the market is terminal or this has run). maxSteps is a per-side scan budget in orders
    // visited (0 = pool default 256); CaptureStepsExhausted asks for a bigger budget.
    "function captureClose(uint256 maxSteps)",
    // Builder/routing opt-in (SpotPool parity): a trader approves a builder to charge up to
    // maxFeeBpsTimes1k per order they submit with that builder code; 0 revokes.
    "function approveBuilder(address builder, uint256 maxFeeBpsTimes1k)",
    "function getBuilderApproval(address user, address builder) view returns (uint256)",
    // Effective (pool-cap-clamped) approval + the protocol-wide builder-fee ceiling —
    // for client-side pre-flight of a non-zero builderFeeBpsTimes1k before placing.
    "function getEffectiveBuilderApproval(address user, address builder) view returns (uint256)",
    "function getMaxBuilderFeeBpsTimes1k() view returns (uint256)",
    // Mint complete-pair: pool pulls `amount` collateral from caller, mints
    // `amount` YES to yesTo and `amount` NO to noTo. (Pool surface unchanged in v2.)
    "function mintSet(address yesTo, address noTo, uint256 amount)",
    // Burn complete-pair: caller surrenders `amount` YES + `amount` NO, gets
    // `amount` collateral back (credited via the pool's vault).
    "function burnSet(uint256 amount)",
    // NOTE: `redeem` is GONE from the pool in v2 — redemption moved to the
    // BinarySettlement singleton (see binarySettlementAbi in readsAbi.ts). The
    // module's `redeem(operatorId, venueId, marketId, …)` is the trader-facing
    // route (binaryModuleWriteAbi); `redeemDirect` uses the settlement directly.
]);
// SpotPool shares the OrderBook base, so placeOrder/cancelOrder match BinaryPool
// — but SpotPool.placeOrder is PAYABLE (native-base sells pass msg.value), so it
// needs its own ABI entry. builderFee is uint96 (selector-critical, see above).
/**
 * Write ABI for single spot order placement, cancellation, and amendment.
 *
 * **Gotchas**
 *
 * `placeOrder` is payable because native-base sells can carry value. The
 * singular amend has a different revert surface from batch amendment.
 *
 * @category ABIs
 */
export const spotPoolWriteAbi = parseAbi([
    "function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable",
    "function cancelOrder(uint128 orderId)",
    // The SINGULAR amend — same `AmendOrderRequest` tuple as the batch, different
    // revert surface, which is why it is wrapped separately rather than as a
    // one-element batch: it raises the replacement's own landing-time reason
    // (`PostOnlyWouldCross`, `SelfMatchCancelTaker`, `ImmediateOrCancelNoFill`,
    // `FillOrKillNotFillable`, `OrderAlreadyExpired`) where an all-or-nothing batch wraps
    // it as `AmendReplacementRejected(requestIndex, reason)` and any other batch reports
    // it only in an `AmendRejected` log. Non-payable, like the batch.
    // Tuple field order is selector-critical.
    "function amendOrder((uint128 oldOrderId, bool alwaysPlace, (bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) newOrder) request) returns (uint128 newOrderId)",
]);
// Batch order writes on the OrderBook base (IOrderBook @ pin 8c43023). All three are
// NON-PAYABLE — unlike the single `placeOrder` above, a batch takes no msg.value, so a
// native-base sell inside a batch funds from the pool vault (pre-deposit; auto-pull
// consumes vault balance) rather than escrowing per call. ERC-20 auto-pull still works
// per request.
//
// `placeOrders` is SPOT-ONLY: the generic placement path reverts `UseBinaryPlacement` on a
// binary pool (the YES/NO kind must be explicit — placeBinaryOrder is that path).
// `cancelOrders` / `reduceOrders` are inherited from the base and NOT placement-gated, so
// they work on binary pools too.
//
// The PlaceOrderRequest tuple field order is selector-critical and matches the struct
// exactly (note `userData` sits second, as in the single-order signature): builderFee is
// uint96, as everywhere else.
//
// Return values are declared to mirror the on-chain signatures, but an EOA cannot read a
// transaction's return data — the wrappers reconstruct outcomes from receipt events.
// `EmptyBatch` lives in the dex submodule's IOrderBook, outside the generated
// contract-error table, so it is declared here to decode by name at the call site.
//
// `amendOrders` re-prices N resting orders in one transaction. Two properties are
// load-bearing and must not be normalised away by callers:
//
//  1. BEHAVIOUR DEPENDS ON THE POOL VERSION. A cancel-then-place pool cancels every
//     old order first, then places every replacement; a pool that amends in place
//     walks the batch once and keeps each id. An all-or-nothing pool reverts the
//     whole transaction with `AmendReplacementRejected(requestIndex, reason)` at the
//     first replacement it will not honour. The others emit
//     `AmendRejected(owner, oldOrderId, reason, requestIndex)`, return 0 for that
//     rung and still apply the rest. The receipt decoder keys on those events, and
//     falls back to `OrderPlaced` order only for a legacy implementation that emits
//     no amend outcome event at all.
//  2. A native-base replacement must be funded from the pool vault: the cancel leg
//     delivers the old order`s freed native to the WALLET, which the place leg
//     cannot reach (non-payable, as above).
//
// Tuple field order mirrors `IOrderBook.AmendOrderRequest` and its nested
// `PlaceOrderRequest` exactly, and is selector-critical.
export const orderBookBatchWriteAbi = parseAbi([
    "function placeOrders((bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k)[] requests) returns (bool[] successes, uint128[] ids)",
    "function cancelOrders(uint128[] orderIds) returns (bool[] cancelled)",
    "function reduceOrders((uint128 orderId, uint256 newQuantityRemaining)[] requests)",
    "function amendOrders((uint128 oldOrderId, bool alwaysPlace, (bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) newOrder)[] requests) returns (uint128[] newOrderIds)",
    "error EmptyBatch()",
]);
// PerpPool shares the OrderBook base too, but its placeOrder is NON-payable
// (the pool rejects msg.value — margin comes from the MarginBank, not escrow).
// updateFunding is the permissionless funding poke. builderFee is uint96
// (selector-critical, see above).
/**
 * Write ABI for perpetual order placement, cancellation, and funding updates.
 *
 * **Gotchas**
 *
 * Perpetual placement is not payable. Margin comes from MarginBank rather than
 * per-order escrow.
 *
 * @category ABIs
 */
export const perpPoolWriteAbi = parseAbi([
    "function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k)",
    "function cancelOrder(uint128 orderId)",
    "function updateFunding()",
    "function marginBank() view returns (address)",
]);
// MarginBank — the cross-margin hub. deposit pulls the collateral token from the
// caller's wallet (ERC-20 approve the BANK, not the pool); orders then lock from
// the deposited balance, so placing a perp order needs no per-order escrow.
//
// The last two are the linked-wallet rail's two routes home for principal a main
// funded into a child. They are separate functions because the SIGNER differs, not
// because the accounting does: `repayFunding` is signed by the child and
// `recallFromChild` by the payer (`OnlyFundingPayer` otherwise). Both settle
// against the payer the bank SNAPSHOTTED at funding time, so an unlink or a re-link
// in between cannot misroute the money.
export const marginBankWriteAbi = parseAbi([
    "function deposit(uint256 amount)",
    "function withdraw(uint256 amount)",
    "function setMaxLeverage(address perpPool, uint16 leverageX)",
    "function repayFunding(uint256 amount)",
    "function recallFromChild(address child, uint256 amount)",
]);
// LinkedWalletRegistry writes — the CONSENT graph behind perp isolated margin.
//
// Isolated margin on perps is one wallet per position, so N isolated positions mean
// N wallets. Linking a wallet to a main lets the child's position-increasing order
// draw its shortfall from the main's wallet, so one treasury serves N buckets.
//
// A link takes a TWO-SIDED handshake and both sides sign: the main sends
// `proposeLink(child)`, then the child sends `acceptLink(main)`. Nothing here moves
// money or grants authority over it — that is the bank's layer, and it stays
// dormant until `MarginBank.getLinkedWalletRegistry()` is non-zero.
//
// `unlink` takes the COUNTERPARTY and works from either end: the registry resolves
// which side is the main. It also clears any pending proposal between the pair in
// BOTH directions, so a later re-link needs fresh consent.
export const linkedWalletRegistryWriteAbi = parseAbi([
    "function proposeLink(address child)",
    "function acceptLink(address main)",
    "function cancelLinkProposal(address child)",
    "function unlink(address counterparty)",
]);
// VoucherDistributor write — claim the one-time credit voucher. The signer is the
// claimant. The grant lands in the signer's MarginBank balance as a non-withdrawable
// floor; only profit above the floor can be withdrawn.
export const voucherDistributorWriteAbi = parseAbi(["function claim()"]);
// IERC20Vault write — deposit into, and withdraw from, a pool's internal vault.
// Every pool IS an ERC20Vault (SpotPool.sol:35, prediction/BinaryPool.sol:60), so
// the address is the pool. `token` is the ERC-20 address (or the vault's
// NATIVE_TOKEN sentinel); amounts are raw units.
//
//  - withdraw: claim a balance out to the caller's wallet — a payout that fell
//    back to the vault (PayoutFallbackToVault), or credit left by manual mode.
//  - deposit: pre-fund an ERC-20 balance. REVERTS `UseDepositNative` for the
//    native sentinel — the native path is msg.value, not an allowance pull.
//  - depositNative / depositNativeFor: pre-fund native, for the caller or for
//    another owner. The amount is msg.value; both revert `InvalidAmount` on zero.
//
// A pool whitelists WHICH token its vault accepts — SpotPool takes its base or
// quote, BinaryPool only its collateral — and rejects anything else with
// `InvalidDepositOrWithdrawal`. So a native deposit only works on a pool that
// actually has a native side; into a tUSDC binary pool it reverts (verified live).
//
// These vault errors ARE in the generated contract-error table now that the
// generator builds the dex submodule as its own forge project, so a revert that
// reaches a caller decodes to `InvalidDepositOrWithdrawal` rather than viem's
// misread of the bare selector as the require-string "sK_p". (Declaring them on
// this ABI still would not help: `decodeRevert` only consults that table.)
//
// The writes nonetheless preflight these conditions client-side. A decoded name
// says WHICH rule was broken; the preflight says which token the pool does take,
// and costs no failed transaction to find out.
export const erc20VaultWriteAbi = parseAbi([
    "function withdraw(address token, uint256 amount)",
    "function deposit(address token, uint256 amount)",
    "function depositNative() payable",
    "function depositNativeFor(address owner) payable",
]);
// SpotPool auto-pull opt-out. Per user, PER POOL: with manual mode on, placing an
// order draws only on the pre-deposited vault balance instead of pulling from the
// wallet — and the same flag routes payouts, so fills and cancel refunds stay as
// vault credit until withdrawn. BinaryPool has no equivalent (SpotPool-only).
export const spotVaultModeAbi = parseAbi([
    "function setManualVaultMode(bool enabled)",
    "function getManualVaultMode(address user) view returns (bool)",
]);
// SpotStopOrderRegistry — stop-loss / take-profit pending orders. createPendingOrder
// is payable (caller funds the Somnia-reactivity gas via msg.value = somiPaymentPerOrder).
export const spotStopRegistryWriteAbi = parseAbi([
    "function createPendingOrder(((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger) payable returns (uint128)",
    "function cancelPendingOrder(uint128 orderId)",
    "function somiPaymentPerOrder() view returns (uint256)",
]);
// The registry's pending-order LIFECYCLE events — every way a pending order ends,
// plus the create that starts it. `PendingOrderCreated` is the only place a tx can
// learn the id it just created (createPendingOrder's return value is unreadable from
// a receipt); the other three are how a caller decoding a later receipt learns the
// order fired, was cancelled by its owner, or was swept as inert.
//
//  - PendingOrderTriggered: `success` is false when the registry reached the book and
//    the book refused the order, and `spotOrderId` is then zero. A trigger consumes
//    the order's somiPaid either way — it is never refunded.
//  - InertOrderCancelled: an operator winding a registry down (cancelInertOrders /
//    removeSubscription) credits `somiCredited` to the owner's unclaimed balance
//    rather than transferring it, so the owner has to claim it.
//
// Signatures resolved from ISpotStopOrderRegistry.sol and checked by selector against
// indexer/abis/SpotStopOrderRegistry.json in test/spotStopEventsAbi.test.ts. `OrderId`
// is a uint128 user-defined value type, so it is a plain uint128 on the wire. Do NOT
// copy the perp registry's shapes: its PendingOrderTriggered carries a drop reason
// (uint128,bool,uint8,uint128) the spot one does not have.
export const spotStopRegistryEventsAbi = parseAbi([
    "event PendingOrderCreated(uint128 indexed orderId, address indexed owner, bool isBid, uint256 quantity, uint256 triggerPrice, uint8 triggerOperator, uint8 orderType, address builder, uint96 builderFeeBpsTimes1k)",
    "event PendingOrderTriggered(uint128 indexed pendingOrderId, bool success, uint128 indexed spotOrderId)",
    "event PendingOrderCancelled(uint128 indexed orderId)",
    "event InertOrderCancelled(uint128 indexed orderId, address indexed owner, uint256 somiCredited)",
]);
// PerpStopOrderRegistry — the perp TP/SL plane. Deliberately its own ABI rather than
// a reuse of the spot one: the shapes have diverged (linked pairs, an intent
// argument, a batch cancel, a per-order getter), and the two registries are separate
// contracts whose signatures are free to drift again.
//
// Signatures transcribed from indexer/abis/PerpStopOrderRegistry.json, which is
// GENERATED (`mise run sync:abis`). Hand-typing these is the documented failure mode
// in this repo — three MarginBank events were wrong for exactly that reason — so
// re-derive from the generated file rather than editing by hand.
//
// Three things a caller has to know, all of them contract behaviour rather than SDK
// choices:
//
//  - createPendingOrder and createTriggerOrder are the SAME order, differing only in
//    intent. The former is reduce-only always; the latter takes it explicitly (0 =
//    ReduceOnly, 1 = Opening). Zero is ReduceOnly on purpose — every order created
//    before the intent existed reads back as one.
//  - createLinkedPendingOrders costs 2x somiPaymentPerOrder, because each leg funds
//    its own reactivity trigger.
//  - getPendingOrder's `live` flag is the ONLY trustworthy field. A cancelled or
//    triggered order keeps its stored orderId until its slot is recycled, so a dead id
//    still reads back with a MATCHING id and plausible terms.
export const perpStopRegistryWriteAbi = parseAbi([
    "function createPendingOrder(((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger) payable returns (uint128 pendingOrderId)",
    "function createTriggerOrder(((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger, uint8 intent) payable returns (uint128 pendingOrderId)",
    "function createLinkedPendingOrders(((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) gteOrder, ((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) lteOrder) payable returns (uint128 gteOrderId, uint128 lteOrderId)",
    "function linkPendingOrders(uint128 orderIdA, uint128 orderIdB)",
    "function cancelPendingOrder(uint128 orderId)",
    "function cancelPendingOrders(uint128[] orderIds)",
    "function getPendingOrder(uint128 orderId) view returns (bool live, (((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger, uint128 orderId, uint256 somiPaid, uint128 siblingOrderId, uint8 intent) order)",
    "function somiPaymentPerOrder() view returns (uint256)",
    // SOMI the registry owes an account. TWO paths credit it, and they have different
    // audiences:
    //   1. A cancel refunds the trigger-gas payment by direct transfer; if that transfer
    //      FAILS the registry credits the balance instead and emits SomiRefundFailed
    //      (PerpStopOrderRegistry `_cancelPendingOrder`). That is the contract-owner case
    //      — a multisig or smart account with no payable receiver.
    //   2. `_cancelInertOrders` (reached from `cancelInertOrders` / `removeSubscription`,
    //      i.e. an operator winding a registry down) credits EVERY owner UNCONDITIONALLY,
    //      with no failed transfer involved. **EOAs included.**
    // So a non-zero balance is NOT diagnostic of a contract owner: any account holding
    // stops when a registry is retired has one. Note the trigger path is the opposite —
    // `somiPaid` is consumed on every fire and never refunded.
    //
    // `claimSomi` is caller-scoped: it pays msg.sender, never an arbitrary account, and
    // reverts NothingToClaim on a zero balance. Its sibling `withdrawSomi(recipient,
    // amount)` is OWNER-only and cannot touch unclaimed balances, so it is not wrapped.
    "function claimSomi()",
    "function unclaimedSomi(address user) view returns (uint256)",
]);
// The perp registry's creation + pairing events. `PendingOrderCreated` is how a tx
// learns the id it just created (the function's return value is unreadable from a
// receipt); `PendingOrdersLinked` is how it learns a pair was formed.
//
// The indexer does not subscribe to the link events yet, so they are readable from a
// receipt here but not queryable historically — see the perp/stops read module.
export const perpStopRegistryEventsAbi = parseAbi([
    "event PendingOrderCreated(uint128 indexed orderId, address indexed owner, bool isBid, uint256 quantity, uint256 triggerPrice, uint8 triggerOperator, uint8 orderType, address builder, uint96 builderFeeBpsTimes1k)",
    "event PendingOrdersLinked(uint128 indexed gteOrderId, uint128 indexed lteOrderId, address indexed owner)",
]);
// The per-user operator gate, asked of a pool: has the owner admitted this operator to
// call `selector` on their behalf (so a stop registry can place the order at trigger)?
//
// BOTH pool families, deliberately. SpotPool and PerpPool declare this identically and
// implement it identically — each delegates to its linked OperatorPermissionsRegistry
// and denies when unwired — so one ABI answers for either, and neither stop path has to
// borrow an ABI named for the other's pool type.
export const operatorAuthorizationReadAbi = parseAbi([
    "function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool)",
]);
// The SpotPool read that funds a stop order's auto-pull path: the worst-case input the
// pool will pull, and the `delta` shortfall vs the owner's vault — used to fund the
// native-base vault pre-load (msg.value == somiPayment + delta) since a reactivity
// callback runs with msg.value == 0 and can never auto-pull native at trigger.
//
// SPOT-ONLY, unlike the operator read above. PerpPool declares no auto-pull surface at
// all — perp collateral is a single MarginBank balance, so there is nothing to pull —
// which is why the operator read was split out rather than shared from here.
export const spotPoolStopReadAbi = parseAbi([
    "function getAutoPullRequirement(address owner, bool isBid, uint256 price, uint256 quantity, uint96 builderFeeBpsTimes1k) view returns (address inputToken, uint256 requiredAmount, uint256 delta)",
]);
// SpotPool lock introspection — where a pool's tokens actually are.
//
//  - getOwnLockedBalance: what the CALLER's resting orders lock. Answers for
//    `msg.sender`, so the wrapper impersonates via eth_call `from` (same shape as
//    getOwnOpenOrders).
//  - getLockedTokenBreakdown: book-wide, per token — the principal backing resting
//    orders, the surplus locked above it, and the leftover reserves backing nothing
//    (accrued fees land here). Walks BOTH book sides in one call, and counts
//    expired-but-unswept orders, whose tokens are still locked. principal + surplus
//    + leftover == the pool's reserves of that token, by construction.
//  - convertToQuoteAtPriceCeil: the pool's OWN base→quote rounding. Exposed so a
//    caller can read the breakdown's bid principal without reimplementing the ceil.
export const spotPoolLockReadAbi = parseAbi([
    "function getOwnLockedBalance() view returns (uint256 lockedBase, uint256 lockedQuote)",
    "function getLockedTokenBreakdown() view returns ((uint256 principalLocked, uint256 lockedSurplus, uint256 leftover) base, (uint256 principalLocked, uint256 lockedSurplus, uint256 leftover) quote)",
    "function convertToQuoteAtPriceCeil(uint256 baseQuantity, uint256 priceQuote) view returns (uint256)",
]);
// Shared OperatorPermissionsRegistry — how an account owner admits an operator (a
// bot, a router, a helper contract) to act for them on spot pools. Both writes key
// off msg.sender, so the signer IS the owner granting; there is no third-party form.
//
// The two views read RAW slots — the global grant, and the per-pool grant — which is
// what a caller needs to answer "did my grant land?". The RESOLVED decision (denial
// first, then per-pool, then global gated on pool registration) is not here: read it
// from the pool via spot/poolReads.isOperatorAuthorized, which delegates to the
// registry's own isApproved so the two can never diverge.
export const operatorRegistryWriteAbi = parseAbi([
    "function setOperatorApprovalGlobal(address operator, bytes4[] selectors, bool approved)",
    "function setOperatorApprovalForPool(address pool, address operator, bytes4[] selectors, bool approved)",
    "function isGloballyApproved(address owner, address operator, bytes4 selector) view returns (bool)",
    "function isApprovedForPool(address pool, address owner, address operator, bytes4 selector) view returns (bool)",
]);
// BinaryMarket carries only lifecycle + oracle views. No settlement writes —
// redemption lives on the BinarySettlement singleton (module-routed for traders).
// Keeping a small read-side wrapper so callers can look up the winning outcome
// before redeeming. Outcome positions are ids on the shared ERC-6909 singleton.
export const binaryMarketReadAbi = parseAbi([
    // Settlement v3: the market stores a payout VECTOR, not a single winner —
    // `winningOutcome()` was removed and reverts on the deployed contract. Derive
    // the winning index from its finalized one-hot shape (gated on isResolved).
    "function payoutNumerators() view returns (uint256[])",
    "function payoutDenominator() view returns (uint32)",
    "function isResolved() view returns (bool)",
    "function isVoided() view returns (bool)",
    "function pool() view returns (address)",
    "function outcomeToken() view returns (address)",
    "function yesId() view returns (uint256)",
    "function noId() view returns (uint256)",
]);
/**
 *  CollateralRouter write surface — the periphery over BinaryMarketsModule's
 *  plain-ERC-20 complete-set flow that adds native (wrap/unwrap) and Permit2
 *  entry ergonomics. Mirrors smart-contracts ICollateralRouter. `(operatorId,
 *  venueId)` is the routing attribution (operator uint32 + bytes32 venue id
 *  within it), `marketId` the bytes32 market key. The Permit2 mint takes the
 *  canonical Permit2 `PermitTransferFrom` tuple + the EIP-712 signature.
 */
export const collateralRouterWriteAbi = [
    {
        type: "function",
        name: "mintCompleteSetNative",
        stateMutability: "payable",
        inputs: [
            { name: "operatorId", type: "uint32" },
            { name: "venueId", type: "bytes32" },
            { name: "marketId", type: "bytes32" },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "mintCompleteSetPermit2",
        stateMutability: "nonpayable",
        inputs: [
            { name: "operatorId", type: "uint32" },
            { name: "venueId", type: "bytes32" },
            { name: "marketId", type: "bytes32" },
            { name: "amount", type: "uint256" },
            {
                name: "permit",
                type: "tuple",
                components: [
                    {
                        name: "permitted",
                        type: "tuple",
                        components: [
                            { name: "token", type: "address" },
                            { name: "amount", type: "uint256" },
                        ],
                    },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            },
            { name: "sig", type: "bytes" },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "redeemNative",
        stateMutability: "nonpayable",
        inputs: [
            { name: "operatorId", type: "uint32" },
            { name: "venueId", type: "bytes32" },
            { name: "marketId", type: "bytes32" },
            { name: "outcomeIdx", type: "uint8" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [],
    },
];
