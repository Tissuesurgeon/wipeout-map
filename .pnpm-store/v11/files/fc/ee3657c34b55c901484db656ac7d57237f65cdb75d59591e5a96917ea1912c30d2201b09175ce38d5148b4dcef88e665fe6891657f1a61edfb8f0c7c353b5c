// Pure event reducer — the client-side mirror of the Envio handlers in
// indexer/src/handlers/orderbook.ts (the shared OrderBook core, dispatched per
// pool type by binary.ts / spot.ts). Given a decoded chain event it mutates the
// in-memory store the same way the indexer mutates Postgres, so the locally
// materialized state matches what Hasura would eventually serve.
//
// Keep this in lockstep with the Envio handlers: any change to how an event maps
// to entity state must be mirrored there (and vice versa) or the live tail will
// diverge from the snapshot it stitches onto.
import * as Store from "./store.js";
import { binaryResolutionMode, lower0x } from "./markets.js";
import * as Interval from "./interval.js";
import * as PerpPlane from "./perp/plane.js";
/**
 *  Apply one decoded event to `store`. Does NOT commit — caller batches per block.
 *  Returns false for an event with no case, so a block of only those commits nothing.
 */
export function applyEvent(ev, store) {
    switch (ev.eventName) {
        // ---- shared OrderBook events (log source = a spot or binary pool) ----
        case "OrderFilled":
            onOrderFilled(ev, store);
            break;
        case "OrderPlaced":
            onOrderPlaced(ev, store);
            break;
        // v2 side attribution: BinaryOrderPlaced carries the explicit YES/NO kind for
        // an order (userData is opaque now). Fires alongside OrderPlaced on a binary
        // pool; order within the tx is not guaranteed, so record the kind and patch
        // the order row whether it arrives before or after OrderPlaced.
        case "BinaryOrderPlaced":
            onBinaryOrderPlaced(ev, store);
            break;
        case "OrderRested":
            onOrderRested(ev, store);
            break;
        case "OrderCancelled":
            setOrderStatus(ev, store, "Cancelled");
            break;
        // Protocol-initiated maker removals during matching (same-owner self-match with
        // CancelMaker / the pre-fill guard on perp pools and its exceeds-position,
        // negative-equity and stale-mark reason tags) — terminal like an owner cancel.
        // Mirror of the PerpPool handlers in indexer/src/handlers/perp.ts.
        // `OrderCancelledPreFill` is the base event every pre-fill removal emits, so it
        // terminates the order even when a future reason tag is not cased here.
        // `OrderCancelledSelfMatch` is NOT subsumed by it — that path returns before the
        // pre-fill guard and emits no PreFill at all. The three perps reason tags ARE
        // subsumed for termination, but keep them: arrival order between a tag and the
        // base event is not guaranteed, so a tag processed alone must still terminate.
        // The indexer additionally RECONSTRUCTS pre-upgrade self-match removals that the
        // pool made before it emitted this event (DEX-1236, indexer/src/selfMatch.ts). This
        // reducer deliberately does not mirror that rule: it only ever sees the live tail,
        // which is at chain head and therefore past every chain's blind window, so the rule
        // would be dead code here. The snapshot it tails already has the reconstruction
        // applied by the indexer.
        case "OrderCancelledSelfMatch":
        case "MakerOrderCancelledExceedsPosition":
        case "MakerOrderCancelledNegativeEquity":
        case "MakerOrderCancelledStaleMark":
        case "OrderCancelledPreFill":
            setOrderStatus(ev, store, "Cancelled");
            break;
        case "OrderExpired":
            setOrderStatus(ev, store, "Expired");
            break;
        case "OrderReduced":
            onOrderReduced(ev, store);
            break;
        // A pool that amends in place emits only this for an accepted amend: the order keeps its
        // id, and no OrderCancelled / OrderPlaced follows. Mirror of the indexer's
        // applyOrderAmendedInPlace; the live block recorded here keeps this row over a snapshot
        // from the same or an earlier block, which may not have applied the amend yet.
        case "OrderAmendedInPlace":
            onOrderAmendedInPlace(ev, store);
            break;
        // ---- spot-only pool events ----
        case "MarkPriceUpdated":
            onMarkPriceUpdated(ev, store);
            break;
        case "OrderBookParametersUpdated":
            onBookParametersUpdated(ev, store);
            break;
        // ---- perp-only pool events ----
        case "FundingUpdated":
            onFundingUpdated(ev, store);
            break;
        case "OpenInterestUpdated":
            onOpenInterestUpdated(ev, store);
            break;
        // ---- creation: live discovery of new binary markets (MarketCreator's
        // 13-field event OR BinaryMarketsModule's 19-field event — same name,
        // distinct topic0; onMarketCreated handles both shapes) ----
        case "MarketCreated":
            onMarketCreated(ev, store);
            break;
        // v2 pool→market binding close: PoolReleased ends the pool's current binding
        // (the pool may next be recycled onto a different market). The next
        // MarketCreated on that pool opens a fresh binding.
        case "PoolReleased":
            onPoolReleased(ev, store);
            break;
        // v2 finalize: two events share this name (distinct topic0 → distinct arg
        // shape). The MODULE's `MarketFinalized(marketId, pool, marketKey)` flips
        // status; the SETTLEMENT's `MarketFinalized(marketKey, pool, nonce,
        // collateralToken, netBacking, …)` snapshots the net backing. Dispatch by
        // which args are present.
        case "MarketFinalized":
            onMarketFinalized(ev, store);
            break;
        // ---- BinaryPool backing events (log source = a binary pool) ----
        case "SetMinted":
            // A YES+NO pair minted from collateral → backing grows by `amount`.
            onBacking(ev, store, ev.args.amount, "add");
            break;
        case "SetBurned":
            // A YES+NO pair burned back to collateral → backing shrinks by `amount`.
            onBacking(ev, store, ev.args.amount, "sub");
            break;
        // v2 finalize on the POOL side: the entire setBacking swept to settlement →
        // the pool's live backing is 0 (the settlement's MarketFinalized then records
        // the authoritative post-skim `netBacking` on the same market row).
        case "PoolFinalized":
            onPoolFinalized(ev, store);
            break;
        // v2: redemption moved to the settlement singleton. Its `Redeemed` carries
        // `marketKey` + `collateralOut` and debits that market's settlement backing.
        // (The removed v1 pool `Redeemed` debited pool setBacking instead.)
        case "Redeemed":
            onSettlementRedeemed(ev, store);
            break;
        // ---- BinaryMarket lifecycle (log source = the market contract) ----
        case "StatusChanged":
            onStatusChanged(ev, store);
            break;
        case "Resolved":
            onResolved(ev, store);
            break;
        case "Voided":
            onVoided(ev, store);
            break;
        case "VoidVector":
            onVoidVector(ev, store);
            break;
        // ---- perp plane: liquidation waterfall + per-account funding settlement ----
        // DISPATCH ONLY. The 17-kind fold and the settlement row are perp margin semantics
        // mirroring indexer/src/handlers/margin.ts, not the orderbook handler this file
        // mirrors, so they live under `perp/` (SDK-MOD-002).
        case "AccountLiquidated":
        case "PositionLiquidated":
        case "PositionSkippedBelowMinQuantity":
        case "PositionTakenOver":
        case "ResidualBadDebt":
        case "AdlPriceCapacityExhausted":
        case "ResidualBackedByOpenPnl":
        case "CoverageDeclinedByEquityCap":
        case "AdlSessionDiscarded":
        case "AdlCapacityShortfall":
        case "LiquidationKeeperRewardPaid":
        case "LiquidationThrottled":
        case "BadDebtAbsorbed":
        case "AutoDeleveraged":
        case "PositionTransferred":
        case "CloseOutMarginSettled":
        case "LiquidationOrderPanicked":
        case "FundingSettled":
            PerpPlane.applyPlaneEvent(ev, store);
            break;
        default:
            return false;
    }
    return true;
}
function marketByPool(store, pool) {
    const id = store.poolToMarket.get(pool);
    return id ? store.markets.get(id) : undefined;
}
function binaryByAddress(store, addr) {
    const id = store.addressToMarket.get(addr);
    const m = id ? store.markets.get(id) : undefined;
    return m && m.marketType === "BINARY" ? m : undefined;
}
// v2 side attribution: BinaryOrderPlaced(orderId, kind) carries the explicit
// YES/NO kind. BinaryOrderPlaced and the base OrderPlaced fire in the same tx
// but the on-chain order between them is not guaranteed, so we bridge via the
// store's pendingKinds map: an OrderPlaced consumes a pending kind if present; a
// BinaryOrderPlaced back-patches an already-created order row if OrderPlaced
// landed first. Bounded by set/delete on consumption.
function onBinaryOrderPlaced(ev, store) {
    const key = Store.orderKey(ev.address, ev.args.orderId);
    const side = Store.sideOfKind(ev.args.kind);
    const existing = store.orders.get(key);
    if (existing) {
        store.orders.set(key, { ...existing, side });
        store.noteLiveOrderBlock(key, ev.blockNumber);
        store.pendingKinds.delete(key);
    }
    else {
        store.pendingKinds.set(key, side);
    }
}
// OrderPlaced fires LAST in the tx (after all fills). Creates the order row.
// Mirror of orderbook.ts applyOrderPlaced with the per-kind adapter folded in:
// binary takes the YES/NO side from the paired BinaryOrderPlaced (v2 — userData
// is opaque now) and rests as "Open"; spot has no side and is born "Closed"
// until OrderRested promotes it.
function onOrderPlaced(ev, store) {
    const market = marketByPool(store, ev.address);
    if (!market)
        return;
    const placed = ev.args.placedOrder;
    const orderId = placed.orderId;
    const isBid = placed.isBid;
    const userData = placed.userData;
    const fullQuantity = placed.fullQuantity;
    const quantityRemaining = placed.quantityRemaining;
    const expireTimestampNs = placed.expireTimestampNs;
    const isBinary = market.marketType === "BINARY";
    const key = Store.orderKey(ev.address, orderId);
    // v2: side comes from the paired BinaryOrderPlaced (by orderId), never userData.
    const side = isBinary ? store.pendingKinds.get(key) : undefined;
    if (side)
        store.pendingKinds.delete(key);
    let status = "Closed";
    if (quantityRemaining === 0n)
        status = "Filled";
    else if (isBinary)
        status = "Open";
    const order = {
        id: key,
        chainId: store.chainId,
        market_id: market.id,
        pool: ev.address,
        orderId: orderId.toString(),
        owner: lower0x(placed.owner),
        side,
        isBid,
        // userData is opaque MM bookkeeping in v2 — carried verbatim, never decoded.
        userData: userData.toString(),
        price: placed.price.toString(),
        fullQuantity: fullQuantity.toString(),
        quantityRemaining: quantityRemaining.toString(),
        filledQuantity: (fullQuantity - quantityRemaining).toString(),
        // Mirror of indexer orderbook.ts: carry the maker's TIF so the book can drop
        // it once now > expireTimestampNs (on-chain expiry is lazy — no event fires).
        expireTimestampNs: expireTimestampNs.toString(),
        // Fully filled on placement → OrderRested won't fire → mark Filled directly.
        status,
        rested: false,
        createdAt: ev.timestampSec.toString(),
        txHash: ev.txHash,
    };
    store.orders.set(key, order);
    store.noteLiveOrderBlock(key, ev.blockNumber);
}
function onOrderRested(ev, store) {
    const key = Store.orderKey(ev.address, ev.args.orderId);
    const order = store.orders.get(key);
    if (!order)
        return;
    // Spot promotes the "Closed" placeholder to "Open"; binary just flips rested.
    store.orders.set(key, { ...order, rested: true, status: order.status === "Closed" ? "Open" : order.status });
    store.noteLiveOrderBlock(key, ev.blockNumber);
}
function setOrderStatus(ev, store, status) {
    const key = Store.orderKey(ev.address, ev.args.orderId);
    const order = store.orders.get(key);
    if (!order)
        return;
    store.orders.set(key, { ...order, status });
    store.noteLiveOrderBlock(key, ev.blockNumber);
}
function onOrderReduced(ev, store) {
    const key = Store.orderKey(ev.address, ev.args.orderId);
    const order = store.orders.get(key);
    if (!order)
        return;
    // Mirror indexer applyOrderReduced, which mirrors the contract: `_reduceOrder`
    // decrements `fullQuantity` AND `quantityRemaining` by the same reduction. A reduce
    // returns UN-filled quantity, so `filledQuantity` must NOT move — but `fullQuantity`
    // must, or the order keeps claiming a size the chain has already shrunk, and any
    // later `fullQuantity - quantityRemaining` reads back more filled than ever traded.
    const reduction = BigInt(order.quantityRemaining) - ev.args.newQuantity;
    store.orders.set(key, {
        ...order,
        fullQuantity: (BigInt(order.fullQuantity) - reduction).toString(),
        quantityRemaining: ev.args.newQuantity.toString(),
    });
    store.noteLiveOrderBlock(key, ev.blockNumber);
}
function onOrderAmendedInPlace(ev, store) {
    const key = Store.orderKey(ev.address, ev.args.orderId);
    const order = store.orders.get(key);
    if (!order)
        return;
    // The payload is the order's whole mutable state after the amend ("this order id now has
    // exactly this state", IOrderBook.sol). The amend resets the remaining quantity to the full
    // new quantity, which is why the event does not carry it: `quantityRemaining` is
    // `fullQuantity` and `filledQuantity` is 0, as a fresh cancel-then-place replacement would
    // read. Queue position is not tracked: live books aggregate per price level.
    const { userData, price, fullQuantity, expireTimestampNs } = ev.args;
    store.orders.set(key, {
        ...order,
        userData: userData.toString(),
        price: price.toString(),
        fullQuantity: fullQuantity.toString(),
        quantityRemaining: fullQuantity.toString(),
        filledQuantity: "0",
        expireTimestampNs: expireTimestampNs.toString(),
    });
    store.noteLiveOrderBlock(key, ev.blockNumber);
}
// OrderFilled — base OrderBook event shared by spot + binary pools. Fires from
// inside the matching loop BEFORE the taker's OrderPlaced for the same tx, so
// the taker's order isn't in the store yet. We resolve the maker from the store
// (placed in a prior tx) and write a partial LiveFill with the maker side and
// takerIsBid (the maker's inverse) filled; the rest of the taker info stays
// undefined until read-time back-join via the takerOrder relation. Mirror of
// orderbook.ts applyOrderFilled.
function onOrderFilled(ev, store) {
    const market = marketByPool(store, ev.address);
    if (!market)
        return;
    const makerKey = Store.orderKey(ev.address, ev.args.makerOrderId);
    const makerOrder = store.orders.get(makerKey);
    const makerSide = makerOrder?.side;
    const maker = makerOrder?.owner;
    const quantity = ev.args.quantityFilled;
    const fillPrice = ev.args.fillPrice;
    // quote value scales by the market's own base decimals (mirror of orderbook.ts).
    const quoteQuantity = (quantity * fillPrice) / 10n ** BigInt(market.baseDecimals ?? Store.DECIMALS);
    const id = Store.fillKey(ev.blockNumber, ev.logIndex);
    const fill = {
        id,
        chainId: store.chainId,
        market_id: market.id,
        pool: ev.address,
        // Taker is unknown at OrderFilled time; resolved via the takerOrder join.
        taker: undefined,
        maker,
        takerSide: undefined,
        makerSide,
        // The taker takes the opposite side of the maker's resting order — known
        // right here, so derive it (mirror of orderbook.ts). Falls back to the
        // takerOrder join only when the maker order was never witnessed.
        takerIsBid: makerOrder ? !makerOrder.isBid : undefined,
        kind: undefined,
        fillPrice: fillPrice.toString(),
        quantity: quantity.toString(),
        quoteQuantity: quoteQuantity.toString(),
        takerRemainingQuantity: ev.args.takerRemainingQuantity.toString(),
        makerRemainingQuantity: ev.args.makerRemainingQuantity.toString(),
        timestamp: ev.timestampSec.toString(),
        blockNumber: ev.blockNumber,
        logIndex: ev.logIndex,
        txHash: ev.txHash,
        // Foreign keys to LiveOrder rows — missing taker side/address derives via join.
        takerOrder_id: Store.orderKey(ev.address, ev.args.takerOrderId),
        makerOrder_id: makerKey,
    };
    store.fills.set(id, fill);
    // Update the maker order's post-fill remaining/status. Taker order will be
    // created by the trailing OrderPlaced in the same tx.
    if (makerOrder) {
        const makerRemaining = ev.args.makerRemainingQuantity;
        store.orders.set(makerKey, {
            ...makerOrder,
            quantityRemaining: makerRemaining.toString(),
            filledQuantity: (BigInt(makerOrder.fullQuantity) - makerRemaining).toString(),
            status: makerRemaining === 0n && makerOrder.status === "Open" ? "Filled" : makerOrder.status,
        });
        store.noteLiveOrderBlock(makerKey, ev.blockNumber);
    }
    const next = {
        ...market,
        lastPrice: fillPrice.toString(),
        lastTradeAt: ev.timestampSec.toString(),
        cumulativeBaseVolume: (BigInt(market.cumulativeBaseVolume) + quantity).toString(),
        cumulativeQuoteVolume: (BigInt(market.cumulativeQuoteVolume) + quoteQuantity).toString(),
        tradeCount: (BigInt(market.tradeCount) + 1n).toString(),
    };
    store.markets.set(market.id, next);
}
// BinaryPool backing events (SetMinted / SetBurned) — log source is a binary
// POOL, so resolve the market by pool address exactly like OrderFilled (mirror
// of the getMarketByPool lookup in indexer/src/handlers/binary.ts). The running
// total is stored on the market as a decimal string; parse → adjust →
// stringify, mirroring the indexer's floor-at-zero on subtractions EXACTLY:
//   SetMinted:  backing += amount
//   SetBurned:  backing  = backing > amount ? backing - amount : 0
// (v2: pool redemption is gone — `PoolFinalized` zeroes the pool backing and the
// settlement events drive `netBacking` from there.) A pool event for a market
// not in the store (or a non-binary market) is a safe no-op.
function onBacking(ev, store, delta, op) {
    const market = marketByPool(store, ev.address);
    if (!market || market.marketType !== "BINARY")
        return;
    const current = BigInt(market.backing);
    let next = current + delta;
    if (op === "sub")
        next = current > delta ? current - delta : 0n;
    store.markets.set(market.id, { ...market, backing: next.toString() });
}
// ---- spot-only pool events (mirror of spot.ts) ----
function onMarkPriceUpdated(ev, store) {
    const market = marketByPool(store, ev.address);
    if (!market || market.marketType !== "SPOT")
        return;
    store.markets.set(market.id, { ...market, markPrice: ev.args.markPrice.toString() });
}
function onBookParametersUpdated(ev, store) {
    const market = marketByPool(store, ev.address);
    // Spot and perp pools both carry tick/lot/min book params (binary does not).
    if (!market || market.marketType === "BINARY")
        return;
    const p = ev.args.newParameters;
    store.markets.set(market.id, {
        ...market,
        tickSize: p.tickSize.toString(),
        minQuantity: p.minQuantity.toString(),
        lotSize: p.lotSize.toString(),
    });
}
// ---- perp-only pool events (mirror of indexer/src/handlers/perp.ts) ----
function onFundingUpdated(ev, store) {
    const market = marketByPool(store, ev.address);
    if (!market || market.marketType !== "PERP")
        return;
    // markPrice == 0 is the contract's SENTINEL for a stale/reverting mark feed, not a
    // price of zero — leave the previous mark in place rather than zeroing it.
    const markPrice = ev.args.markPrice;
    const markOk = markPrice != null && markPrice !== 0n;
    store.markets.set(market.id, {
        ...market,
        fundingRate: ev.args.fundingRate.toString(),
        cumulativeFundingPerUnit: ev.args.cumulativeFundingPerUnit.toString(),
        indexPrice: ev.args.indexPrice.toString(),
        fundingUpdatedAt: ev.timestampSec.toString(),
        ...(markOk ? { markPrice: markPrice.toString(), markPriceUpdatedAt: ev.timestampSec.toString() } : {}),
    });
    // ADDITIONALLY append to the live funding series, so the tail can EXTEND a chart rather
    // than only overwrite the market row.
    //
    // Keyed on (block, logIndex) and written UNCONDITIONALLY, which is what the key already
    // buys: a duplicate delivery lands on itself, and a reorg replay that carries different
    // decoded args at the same position REPLACES the stale value. An earlier revision
    // guarded this with `if (has(key)) return`, which made the second case wrong — it kept
    // the pre-reorg row — while adding nothing to the first. Plain `set` is also what the
    // tail already does for fills (`store.fills.set(id, fill)`).
    const key = `${ev.blockNumber}_${ev.logIndex}`;
    store.fundingUpdates.set(key, {
        id: `${ev.address.toLowerCase()}_${ev.blockNumber}_${ev.logIndex}`,
        chainId: store.chainId,
        pool: ev.address.toLowerCase(),
        fundingRate: ev.args.fundingRate.toString(),
        cumulativeFundingPerUnit: ev.args.cumulativeFundingPerUnit.toString(),
        indexPrice: ev.args.indexPrice.toString(),
        markPrice: markOk ? markPrice.toString() : null,
        intervalsSettled: (ev.args.intervalsSettled ?? 0n).toString(),
        // The indexer derives intervalsAccrued and the params in force from the epoch
        // series; the tail has neither, so it reports what the event carries and leaves the
        // rest to the indexed row that follows.
        fundingWindowSec: market.fundingWindowSec,
        fundingIntervalSec: market.fundingIntervalSec,
        timestamp: ev.timestampSec.toString(),
        blockNumber: ev.blockNumber.toString(),
        logIndex: ev.logIndex,
    });
}
function onOpenInterestUpdated(ev, store) {
    const market = marketByPool(store, ev.address);
    if (!market || market.marketType !== "PERP")
        return;
    store.markets.set(market.id, {
        ...market,
        // ONE total, not a (long, short) pair.
        openInterest: ev.args.openInterest.toString(),
        openInterestUpdatedAt: ev.timestampSec.toString(),
    });
}
// ---- creation: a new binary market appears without touching the indexer ----
// Two sources, one handler: MarketCreator.MarketCreated (13 fields, carries
// intervalSec) and BinaryMarketsModule.MarketCreated (19 fields, carries the
// (operatorId, venueId) origin attribution + context). Both carry every field
// the market row needs (marketId/market/pool/yesId/noId/collateral/asset/
// question/strike/tradingStart/expiry). For MarketCreator-created markets BOTH
// fire in one tx (module first — it emits inside createMarket), so the
// module-built row wins and the creator's event no-ops on the `has` guard,
// exactly like the indexer (indexer/src/handlers/binary.ts).
function onMarketCreated(ev, store) {
    const id = lower0x(ev.args.marketId);
    if (store.markets.has(id))
        return;
    const tradingStart = Number(ev.args.tradingStart);
    const expiry = Number(ev.args.expiry);
    // MarketCreator's event carries the cadence explicitly; the module's does not
    // — derive it from the market's own window like the indexer does (binary.ts:
    // consecutive series markets are boundary-aligned, so `expiry - tradingStart`
    // IS the cadence).
    const intervalSecStr = "intervalSec" in ev.args ? ev.args.intervalSec.toString() : String(expiry - tradingStart);
    const collateral = lower0x(ev.args.collateral);
    const collateralDecimals = store.collateralDecimals.get(collateral) ?? Store.DECIMALS;
    let status = "Listed";
    if (ev.timestampSec >= expiry)
        status = "Settling";
    else if (ev.timestampSec >= tradingStart)
        status = "Trading";
    const market = {
        id,
        // A live-discovered market names its chain, like a snapshot or chain-seed row.
        chainId: store.chainId,
        marketType: "BINARY",
        poolAddress: lower0x(ev.args.pool),
        lastPrice: null,
        lastTradeAt: null,
        cumulativeBaseVolume: "0",
        cumulativeQuoteVolume: "0",
        tradeCount: "0",
        // The collateral's OWN scale, not a constant. Binary collateral is
        // per-venue (6dp TestUSDC, 18dp USDso) and the outcome tokens mirror it,
        // so `base == quote` decimals here exactly as in the indexer — but the
        // VALUE is the collateral's `decimals()`, which the indexer reads on chain
        // (indexer/src/handlers/binary.ts). This reducer is synchronous, so it
        // reads the store's collateral map, which the snapshot merge and the live
        // tail keep warm; {@link Store.DECIMALS} remains the last-resort fallback,
        // in lockstep with the indexer's `BINARY_DECIMALS`.
        baseDecimals: collateralDecimals,
        quoteDecimals: collateralDecimals,
        createdAtTimestamp: ev.timestampSec.toString(),
        // The log's own block — the same value the indexer stores, so a market
        // built from the live tail brackets its feed reads identically to one
        // built from a snapshot.
        createdAtBlock: ev.blockNumber.toString(),
        marketId: id,
        marketAddress: lower0x(ev.args.market),
        yesTokenId: ev.args.yesId.toString(),
        noTokenId: ev.args.noId.toString(),
        collateral,
        asset: ev.args.asset,
        question: ev.args.question,
        // Mirror indexer binary.ts: a market discovered live AT/AFTER its expiry is
        // Settling, not Trading/Listed (collapse expired-at-create → Settling).
        status,
        // Not carried by the live MarketCreator.MarketCreated event — filled on the
        // next snapshot (same null-until-snapshot pattern as venueId/backing below).
        oracleQuestion: null,
        strike: ev.args.strike.toString(),
        // Derived here too rather than defaulted, so a market built from the live
        // tail before the indexer has it reports the same mode it will report after
        // — through the same helper `toMarket` uses, so the two cannot disagree.
        mode: binaryResolutionMode(ev.args.strike),
        tradingStart: tradingStart.toString(),
        expiry: expiry.toString(),
        winningOutcome: null,
        resolvedAtBlock: null,
        resolvedAtTimestamp: null,
        createdByTx: null,
        voided: false,
        backing: "0",
        // v2 pool binding: the module's MarketCreated carries the pool's market nonce
        // (part of the outcome-id encoding); the MarketCreator's 13-field event does
        // not — null until the next snapshot fills it. Fresh markets start
        // unfinalized with no settlement record.
        nonce: "nonce" in ev.args ? ev.args.nonce.toString() : null,
        finalized: false,
        netBacking: null,
        intervalSec: intervalSecStr,
        // Serve the timeframe label here too (the indexer path stamps it in
        // `toMarket`) so a live-tail-discovered market carries `interval` before the
        // next snapshot merge — one source of truth (see interval.ts).
        interval: Interval.marketIntervalLabel({ intervalSec: intervalSecStr }),
        // Origin attribution: only the module's 19-field MarketCreated carries it.
        // Markets discovered via the MarketCreator event show null until the next
        // snapshot fills it — same pattern as `backing`.
        operatorId: "operatorId" in ev.args ? Number(ev.args.operatorId) : null,
        venueId: "venueId" in ev.args ? lower0x(ev.args.venueId) : null,
        // Opaque creator-supplied bytes — module event only (null-until-snapshot otherwise).
        context: "context" in ev.args ? lower0x(ev.args.context) : null,
    };
    store.indexMarket(market);
}
// ---- settlement-extraction v2: finalize / release / settlement redemption ----
// Settlement events (MarketFinalized, Redeemed) carry only a marketKey,
// `(uint160(pool) << 64) | nonce`, which is
// `yesId >> 8`. Resolve it through the store's key index, the mirror of the
// indexer's SettlementMarketLink. The index names the exact market, so an event
// for a past market of a recycled pool never falls through to the pool's current
// binding. An evicted or unknown market resolves to undefined and the event is a
// no-op. Unlike the indexer's settlement MarketFinalized, there is no pool
// fallback: every SDK binary row carries its key, so a miss means the old market
// is not retained, and the pool's current binding is its successor.
// Pool-side finalize (log source = the pool): the entire setBacking was swept to
// the settlement singleton, so the pool's live backing is 0. The authoritative
// post-skim net backing lands on the same row via the settlement MarketFinalized.
function onPoolFinalized(ev, store) {
    const market = marketByPool(store, ev.address);
    if (!market || market.marketType !== "BINARY")
        return;
    store.markets.set(market.id, { ...market, backing: "0", finalized: true });
}
// Module PoolReleased(marketId, pool, creator): the pool→market binding CLOSES —
// the pool may next be recycled onto a different market, and order events after
// this must not attribute to the released market. Deleting the binding (only if
// it still points at this market) makes later pool logs no-ops until the next
// MarketCreated on the pool re-opens a binding.
function onPoolReleased(ev, store) {
    const id = ev.args.marketId.toLowerCase();
    const pool = ev.args.pool.toLowerCase();
    if (store.poolToMarket.get(pool) === id)
        store.poolToMarket.delete(pool);
}
// MarketFinalized — TWO events share the name (distinct topic0):
//   module:     MarketFinalized(marketId, pool, marketKey)          → flag the row
//   settlement: MarketFinalized(marketKey, pool, nonce, collateral,
//               netBacking, voided, payoutNumerators)               → net backing
// Dispatch by args shape (only the module's carries `marketId`).
function onMarketFinalized(ev, store) {
    // `in` rather than a null check: the two shapes are a real union now, so this
    // narrows `ev.args` to one variant and the fields below are checked, not cast.
    if ("marketId" in ev.args) {
        const id = ev.args.marketId.toLowerCase();
        const m = store.markets.get(id);
        // "Finalized" is the indexer-derived terminal status (ClobMarketStatus) —
        // it SUPERSEDES Resolved/Voided once finalize lands.
        if (m && m.marketType === "BINARY") {
            store.markets.set(id, { ...m, finalized: true, status: "Finalized" });
        }
        return;
    }
    const market = store.marketBySettlementKey(ev.args.marketKey);
    if (!market)
        return;
    store.markets.set(market.id, {
        ...market,
        finalized: true,
        status: "Finalized",
        // The pool swept its whole setBacking out (pool backing 0); the settlement
        // record's NET backing (post fee-skim) is the redeemable pot from here on.
        backing: "0",
        netBacking: ev.args.netBacking.toString(),
        settledPayoutNumerators: ev.args.payoutNumerators.map((n) => n.toString()),
    });
}
// Settlement Redeemed(marketKey, holder, to, outcomeIdx, amountBurned,
// collateralOut) — a payout debits the market's settlement-side net backing
// (floor 0, mirroring the indexer's subtraction guard). The v1 pool Redeemed
// (which debited pool setBacking) no longer exists.
function onSettlementRedeemed(ev, store) {
    const market = store.marketBySettlementKey(ev.args.marketKey);
    if (!market || market.netBacking == null)
        return;
    const out = ev.args.collateralOut;
    const cur = BigInt(market.netBacking);
    store.markets.set(market.id, {
        ...market,
        netBacking: (cur > out ? cur - out : 0n).toString(),
    });
}
// ---- BinaryMarket lifecycle (mirror of binary.ts market handlers) ----
function onStatusChanged(ev, store) {
    const market = binaryByAddress(store, ev.address);
    if (!market)
        return;
    const status = Store.BINARY_MARKET_STATUS[Number(ev.args.newStatus)];
    if (!status)
        return;
    store.markets.set(market.id, { ...market, status });
}
function onResolved(ev, store) {
    const market = binaryByAddress(store, ev.address);
    if (!market)
        return;
    // Match the indexed one-hot winner: split vectors have no unique winning outcome.
    const winners = ev.args.payoutNumerators.flatMap((n, i) => (n === 0n ? [] : [i]));
    const winningOutcome = winners.length === 1 ? (winners[0] ?? null) : null;
    store.markets.set(market.id, {
        ...market,
        status: "Resolved",
        winningOutcome,
        payoutNumerators: ev.args.payoutNumerators.map((n) => n.toString()),
        payoutDenominator: ev.args.payoutDenominator.toString(),
        resolvedAtBlock: ev.blockNumber.toString(),
        resolvedAtTimestamp: ev.timestampSec.toString(),
    });
}
function onVoided(ev, store) {
    const market = binaryByAddress(store, ev.address);
    if (!market)
        return;
    store.markets.set(market.id, {
        ...market,
        status: "Voided",
        voided: true,
        resolvedAtBlock: ev.blockNumber.toString(),
        resolvedAtTimestamp: ev.timestampSec.toString(),
    });
}
function onVoidVector(ev, store) {
    const market = binaryByAddress(store, ev.address);
    if (!market)
        return;
    // Both void paths emit the stored vector before Voided. Its sum is the raw
    // denominator; finalization's fee-scaled vector is kept in a separate field.
    store.markets.set(market.id, {
        ...market,
        payoutNumerators: ev.args.payoutNumerators.map((n) => n.toString()),
        payoutDenominator: ev.args.payoutNumerators.reduce((sum, n) => sum + n, 0n).toString(),
        voidVectorSource: ev.args.source,
    });
}
