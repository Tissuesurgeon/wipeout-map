// Orders — the shared order-book concept: reads, books, and placement.
//
// SHARED across market kinds because the ORDER BOOK is shared: spot, perp and
// binary pools all embed the same OrderBook core, emit the same OrderPlaced /
// OrderFilled events, and answer the same cancel/reduce calls. So
// `placeSpotOrder` and `placePerpOrder` live here alongside `placeOrder`
// (binary) — they differ in which pool they target and how a price is scaled,
// not in the machinery they drive.
//
// What does NOT live here: mechanics that exist for only one kind and hit their
// own contracts — stop orders (spot's registry, see spot/stops.ts), margin
// (perp/margin.ts), complete sets and settlement (binary/).
//
// Writes take the `Writer` context as their first parameter (CONVENTIONS.md
// data-first); the `Trader` facade binds them.
import { ChainDoesNotSupportContract, decodeEventLog, toFunctionSelector } from "viem";
import * as IndexerRead from "./indexerRead.js";
import * as Pools from "./pools.js";
import * as Interval from "./interval.js";
import { graphql } from "./gql/gql.js";
import { ContractRevertError, InvalidInputError, NotConfiguredError, RpcError } from "./errors.js";
import * as EventsAbi from "./eventsAbi.js";
import * as ReadsAbi from "./readsAbi.js";
import * as Revert from "./revert.js";
import * as Store from "./store.js";
import * as Writer from "./writer.js";
import * as TradeAbi from "./tradeAbi.js";
import * as PoolReads from "./spot/poolReads.js";
/**
 *  Shape the market relationship an order read selected into {@link OrderMarket},
 *  stamping the derived cadence label the same way the portfolio reads do.
 *
 *  Shared by all three order reads so their market context cannot drift apart.
 */
function toOrderMarket(m) {
    if (m == null)
        return null;
    // Named explicitly rather than spread, for two reasons that pull the same way.
    // The parameter is the GENERATED fragment type, so a field dropped from
    // `OrderMarketFields` becomes a compile error here instead of being silently
    // backfilled as null — the failure mode a hand-written optional shape hid.
    // And the queries select `poolAddress` (plus `marketType` on the sweep read)
    // ALONGSIDE the fragment, so a blind spread would leak those onto the public
    // `marketInfo`, which names the market and deliberately does not repeat the
    // row's own `pool`.
    const { marketAddress, asset, question, expiry, tradingStart, quoteDecimals, intervalSec } = m;
    return {
        marketAddress,
        asset,
        question,
        expiry,
        tradingStart,
        quoteDecimals,
        intervalSec,
        interval: Interval.marketIntervalLabel(m),
    };
}
/**
 *  A working (`status = "Open"`) order for `owner`, newest first. Pass
 *  {@link OrdersOptions} to scope by pool/side and page. For non-open history use
 *  {@link SomniaMarketsClient.getOrders}.
 */
export async function getOpenOrders(owner, opts = {}, indexerUrl) {
    const where = await orderWhere(owner, opts, indexerUrl, "Open");
    const data = await IndexerRead.gqlRequest(OpenOrdersQuery, { where, limit: opts.limit ?? 1000, offset: opts.offset ?? 0 }, indexerUrl);
    return data.Order.map((o) => ({
        id: o.id,
        orderId: o.orderId,
        // `market_id` is the scalar owning column and is `String!` — selected
        // directly so the market identity needs no fallback. The `marketRow`
        // RELATIONSHIP beside it is what Hasura types nullable (it types all of them
        // so), which is why only the pool/labels below carry one.
        market: o.market,
        marketInfo: toOrderMarket(o.marketRow),
        pool: (o.marketRow?.poolAddress ?? "").toLowerCase(),
        side: o.side,
        isBid: o.isBid,
        price: o.price,
        quantityRemaining: o.quantityRemaining,
        userData: o.userData,
    }));
}
/**
 *  `owner`'s orders across ALL statuses (Open/Filled/Cancelled/Expired/Closed),
 *  newest first — the order-history counterpart to {@link SomniaMarketsClient.getOpenOrders}. Filter
 *  by `status`/`side`/`pool` via {@link OrdersOptions}.
 */
export async function getOrders(owner, opts = {}, indexerUrl) {
    const where = await orderWhere(owner, opts, indexerUrl);
    const data = await IndexerRead.gqlRequest(OrdersQuery, { where, limit: opts.limit ?? 200, offset: opts.offset ?? 0 }, indexerUrl);
    return data.Order.map((o) => ({
        id: o.id,
        orderId: o.orderId,
        // `market_id` is the scalar owning column and is `String!` — selected
        // directly so the market identity needs no fallback. The `marketRow`
        // RELATIONSHIP beside it is what Hasura types nullable (it types all of them
        // so), which is why only the pool/labels below carry one.
        market: o.market,
        marketInfo: toOrderMarket(o.marketRow),
        pool: (o.marketRow?.poolAddress ?? "").toLowerCase(),
        side: o.side,
        isBid: o.isBid,
        price: o.price,
        quantityRemaining: o.quantityRemaining,
        userData: o.userData,
        status: o.status,
        fullQuantity: o.fullQuantity,
        filledQuantity: o.filledQuantity,
        rested: o.rested,
        expireTimestampNs: o.expireTimestampNs,
        placedTxHash: o.placedTxHash,
        placedAtTimestamp: o.placedAtTimestamp,
        cancelReason: o.cancelReason,
        amendedFromOrderId: o.amendedFromOrderId,
        amendedToOrderId: o.amendedToOrderId,
    }));
}
/**
 *  One order by `(pool, orderId)` — the indexer's view of a single order,
 *  including who placed it and its full lifecycle attribution. Order ids are
 *  never reused (monotonic low-64 counter per pool), so this pair names exactly
 *  one order forever. Null when not indexed (a just-placed order can lag; for
 *  chain-head truth use {@link SomniaMarketsClient.getOrderOnchain}).
 */
export async function getOrder(pool, orderId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OrderDetailQuery, { id: `${pool.toLowerCase()}_${orderId.toString()}` }, indexerUrl);
    const o = data.Order[0];
    if (!o)
        return null;
    const { marketRef, marketRow, ...rest } = o;
    // Same asserted invariant as getOrders' pool: the relationship is typed
    // nullable but its owning market_id is String!.
    return {
        ...rest,
        // `marketInfo` and the bytes32 `market` id come from main's OrderRow
        // contract, mapped through main's own helper so there is one definition of
        // the shape rather than a second one here.
        marketInfo: toOrderMarket(marketRow),
        pool: (marketRow?.poolAddress ?? "").toLowerCase(),
        owner: rest.owner.toLowerCase(),
        marketRef: IndexerRead.narrowIndexerInvariant([marketRef])[0],
    };
}
/**
 *  Server-side COUNT of `owner`'s orders matching an {@link OrdersOptions}
 *  filter (Hasura `Order_aggregate`) — so an order-history page paginates
 *  against a real total without fetching every row. Privileged `_aggregate`
 *  role (server-only), with the bounded row-count fallback on the public role.
 *
 *  WITHOUT THAT HEADER THE TOTAL IS A LOWER BOUND. The fallback scan stops at
 *  {@link IndexerRead.COUNT_FALLBACK_CAP} rows and reports the cap, and `Order`
 *  is far past it in production. No bounded variant of this helper exists yet;
 *  `countMarketsBounded` on the client is the pattern to copy.
 */
export async function countOrders(owner, opts = {}, indexerUrl, headers) {
    const where = await orderWhere(owner, opts, indexerUrl);
    return IndexerRead.aggregateCount(OrderCountDocuments, where, indexerUrl, headers);
}
/**
 *  Batch-fetch the top of book (best resting bid/ask + mid) for many markets in
 *  ONE round-trip — for list views that want a book-derived price without an
 *  N+1 per-pool fan-out (an implied probability, on BINARY). Returns a map of lowercased marketId →
 *  {@link BookTop}; markets with an empty book are simply absent.
 *
 *  EVERY MARKET KIND, not only BINARY — a guarantee, not an accident of the
 *  current query. The filter is `market_id` on `Order`, which is stamped at
 *  placement for SPOT and PERP alike, so a 20-byte pool address and a 32-byte
 *  binary id are both valid here and may be mixed in one call.
 *
 *  See {@link BookTop} for the price contract — raw, and in each market's own
 *  terms, which differ by kind.
 *
 *  Orders are stamped with `market_id` at placement, so keying on the market is
 *  recycle-safe (a reused pool's prior-market orders never bleed in). On-chain
 *  expiry is LAZY (an expired maker keeps resting with no OrderExpired event),
 *  so this mirrors `getBookLevels`' `now > expiry` skip in the where clause.
 */
export async function getBookTops(marketIds, indexerUrl) {
    const out = {};
    const ids = marketIds.map((m) => m.toLowerCase());
    if (ids.length === 0)
        return out;
    const nowNs = (BigInt(Math.floor(Date.now() / 1000)) * 1000000000n).toString();
    const sideWhere = (isBid) => ({
        market_id: { _in: ids },
        status: { _eq: "Open" },
        rested: { _eq: true },
        quantityRemaining: { _gt: "0" },
        expireTimestampNs: { _gt: nowNs },
        isBid: { _eq: isBid },
    });
    // distinct_on market_id with price leading the tiebreak = one best level per
    // market per side, in a single aliased round-trip.
    const data = await IndexerRead.gqlRequest(BookTopsQuery, { bidWhere: sideWhere(true), askWhere: sideWhere(false) }, indexerUrl);
    for (const b of data.bids)
        out[b.market.toLowerCase()] = { bestBid: b.price, bestAsk: null, mid: null };
    for (const a of data.asks) {
        const key = a.market.toLowerCase();
        const row = (out[key] ??= { bestBid: null, bestAsk: null, mid: null });
        row.bestAsk = a.price;
    }
    for (const row of Object.values(out)) {
        if (row.bestBid != null && row.bestAsk != null) {
            row.mid = ((BigInt(row.bestBid) + BigInt(row.bestAsk)) / 2n).toString();
        }
    }
    return out;
}
/**
 *  Top of book for many markets, read from POOL STATE at one pinned block.
 *
 *  **When to use**
 *
 *  Use for a list view whose quotes must not lag: a board, a market selector, a
 *  mark for open positions. The indexed counterpart {@link getBookTops} answers
 *  in one round-trip and carries no chain dependency, but its rows are as fresh
 *  as the indexer. This reads the pools themselves, so a quote is current as of
 *  the block it names.
 *
 *  **Details**
 *
 *  Prices and `mid` follow {@link BookTop} exactly — raw, in each market's own
 *  terms, and `mid` floored. A market whose book is empty on both sides is
 *  ABSENT from `tops`, the same contract the indexed read documents, so the two
 *  are comparable key for key.
 *
 *  The block is pinned ONCE before any read, so every market's top is quoted at
 *  the same height and the set is internally consistent. Where the chain declares
 *  a Multicall3 the reads collapse into one aggregate call; elsewhere they fan
 *  out. Only "this chain has no usable Multicall3 here" falls back — a revert or
 *  a dead RPC still throws.
 *
 *  **Gotchas**
 *
 *  Cost is 2 reads per market on the fan-out path (one per side), so this is
 *  bounded by the caller's market count, not by the SDK. Keep the set to what a
 *  view actually shows; the indexed {@link getBookTops} stays the cheaper read
 *  for an unbounded list.
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
 * @throws {@link RpcError} If the node returns fewer reads than were requested.
 */
export async function getBookTopsOnchain(markets, client, opts) {
    if (opts?.blockNumber !== undefined && opts.blockNumber < 0n) {
        throw new InvalidInputError("blockNumber must be nonnegative");
    }
    const pc = client;
    // Pin FIRST: every read below quotes this block, so no two markets straddle.
    const blockNumber = opts?.blockNumber ?? (await pc.getBlockNumber());
    const tops = {};
    if (markets.length === 0)
        return { blockNumber, tops };
    const calls = markets.flatMap((m) => [
        { address: m.poolAddress, abi: ReadsAbi.binaryPoolReadAbi, functionName: "getBookLevels", args: [true, 1n] },
        { address: m.poolAddress, abi: ReadsAbi.binaryPoolReadAbi, functionName: "getBookLevels", args: [false, 1n] },
    ]);
    const fanOut = () => Promise.all(calls.map((c) => pc.readContract({ ...c, blockNumber })));
    let results;
    try {
        // Multicall3 availability is NOT `typeof client.multicall === "function"` —
        // every viem client has the method. The chain must also DECLARE the contract,
        // and even then viem rejects a pin below its deployment height. Both cases
        // take the fan-out; nothing else does.
        if (typeof pc.multicall === "function" && pc.chain?.contracts?.multicall3) {
            try {
                results = await pc.multicall({ contracts: calls, allowFailure: false, blockNumber });
            }
            catch (e) {
                if (!(e instanceof ChainDoesNotSupportContract))
                    throw e;
                results = await fanOut();
            }
        }
        else {
            results = await fanOut();
        }
    }
    catch (error) {
        throw Revert.toSdkError(error, "read order book", { functionName: "getBookLevels" });
    }
    // The casts below are unchecked, so a short batch would surface as a TypeError from
    // inside the loop ("Cannot read properties of undefined") naming neither pool nor
    // market — and from OUTSIDE the try above, so not even as an SDK error. Fail here
    // instead, while there is still context.
    if (results.length !== calls.length) {
        throw new RpcError("getBookLevels", `expected ${calls.length} reads, got ${results.length}`);
    }
    markets.forEach((m, i) => {
        // The compiler-checked seam between the contract's `bigint` levels and
        // BookTop's raw decimal STRINGS (SDK-TYPE-007): no precision is lost, and
        // the public string contract the indexed read publishes stays unchanged.
        const bids = results[i * 2];
        const asks = results[i * 2 + 1];
        const bestBid = bids[0]?.price;
        const bestAsk = asks[0]?.price;
        // Both sides empty = the market is absent, matching `getBookTops`.
        if (bestBid === undefined && bestAsk === undefined)
            return;
        tops[m.id.toLowerCase()] = {
            bestBid: bestBid?.toString() ?? null,
            bestAsk: bestAsk?.toString() ?? null,
            mid: bestBid !== undefined && bestAsk !== undefined ? ((bestBid + bestAsk) / 2n).toString() : null,
        };
    });
    return { blockNumber, tops };
}
/**
 *  Expand a YES-terms book into the 4-sided binary shape: NO bids come from YES
 *  asks inverted (price = 1 − yesPrice) and vice-versa; quantities carry over.
 *  Shared by the on-chain read and the live-store book.
 */
export function toBinaryBook(yesBids, yesAsks, oneBase) {
    const noBids = yesAsks
        .map((l) => ({ price: oneBase - l.price, quantity: l.quantity }))
        .sort((a, b) => (a.price > b.price ? -1 : 1));
    const noAsks = yesBids
        .map((l) => ({ price: oneBase - l.price, quantity: l.quantity }))
        .sort((a, b) => (a.price > b.price ? 1 : -1));
    return { yesBids, yesAsks, noBids, noAsks };
}
/**
 *  The pool's tick / lot / minimum-quantity increments. Chain read.
 *
 *  **When to use**
 *
 *  Use to round a price or quantity to something the book will accept before
 *  placing an order — the pool rejects an order that is off-tick or below the
 *  minimum. `Units.snapRawToGrid` does the rounding in raw units, and
 *  `Units.roundPriceToTick` adds the guard a price needs: a sub-tick price
 *  floored to `0` is the one value the pool always rejects.
 */
export async function getBinaryBookParams(pool, client) {
    const p = await client.readContract({
        address: pool,
        abi: ReadsAbi.binaryPoolReadAbi,
        functionName: "getOrderBookParameters",
    });
    return { tickSize: p.tickSize, minQuantity: p.minQuantity, lotSize: p.lotSize };
}
const CLOSE_STATES = ["OPEN", "CAPTURED", "CAPTURED_DEGENERATE", "TERMINAL_LATCH"];
/**
 *  Read a pool's captured closing price + close state. Returns null when the
 *  pool predates the capture surface (the selector doubles as the capability
 *  probe, mirroring the module's own policy resolution at market creation).
 *
 *  **Gotchas**
 *
 *  `null` means the pool does not DECLARE `closingPrice()` — nothing else. A
 *  read that fails for any other reason throws: an `RpcError` for a transport
 *  failure, a `ContractRevertError` for a revert that names an error or a
 *  reason. Reporting either as `null` would tell a caller a live pool predates
 *  the capture surface, and a `CLOB_SNAPSHOT` void would then pay the uniform
 *  half-refund instead of the captured mid.
 */
export async function getClosingPrice(pool, client, ownedFailure = () => false) {
    try {
        const [closingMid, oneCollateral, state] = await client.readContract({
            address: pool,
            abi: ReadsAbi.binaryPoolReadAbi,
            functionName: "closingPrice",
        });
        return { closingMid, oneCollateral, state: CLOSE_STATES[state] ?? "OPEN" };
    }
    catch (e) {
        if (ownedFailure(e))
            throw e;
        // The capability probe: only a pool WITHOUT the view answers null. A timeout
        // or a dropped connection is not "this pool predates the capture surface".
        if (Revert.isMissingContractView(e))
            return null;
        throw Revert.toSdkError(e, "readContract closingPrice", { address: pool, functionName: "closingPrice" });
    }
}
/**
 *  `IncorrectOrder()`'s 4-byte selector, derived from the ABI rather than
 *  written out — the constant tracks the declaration if the error's shape ever
 *  changes.
 */
const INCORRECT_ORDER_SELECTOR = toFunctionSelector("IncorrectOrder()");
function toOnchainOrder(o) {
    return {
        orderId: o.orderId,
        isBid: o.isBid,
        owner: o.owner,
        userData: o.userData,
        price: o.price,
        fullQuantity: o.fullQuantity,
        quantityRemaining: o.quantityRemaining,
        expireTimestampNs: o.expireTimestampNs,
    };
}
/**
 *  One order's state at chain head, or as of a pinned block, by `(pool, orderId)`.
 *
 *  **When to use**
 *
 *  Use to read your own writes: right after `placeOrder`, this answers from the
 *  block the order landed in, while the indexed counterpart (`getOrders`) may
 *  not have caught up yet. The trade-off is the mirror image — this sees only
 *  what is ACTIVE at the height read, so a filled or cancelled order reads as
 *  `null` at head while the indexer keeps its history.
 *
 *  Use `opts.blockNumber` to read a maker order at the block BEFORE its fill. A
 *  consumer decoding `OrderFilled` gets the fill's own numbers from the event, but
 *  the maker only as an id, and the fill removes that order in the same transaction,
 *  so this is what answers which side of the book the fill took when no cached
 *  placement covers it. It answers for the order's immutable fields; a block read
 *  resolves NEITHER quantity per transaction - see the option's docs.
 *
 * **Details**
 *
 * - Returns: The order, or `null` if the pool has no active order for that id at
 *   the height read.
 * - `opts.blockNumber`: Exact block. Omitted: chain head.
 *
 *  **Gotchas**
 *
 *  Order ids are unique per pool, so the pool is part of the key. `null` covers
 *  every "no active order with that id" case the pool reports - never assigned,
 *  fully filled, cancelled, expired-and-swept, or replaced by an amend, which is a
 *  cancel-then-place under a NEW id. A `reduceOrder` is not one of them: it keeps the
 *  id and shrinks the order in place, and it cannot shrink below the book's
 *  `minQuantity`, so it never removes it.
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
 */
export async function getOrderOnchain(pool, orderId, client, opts, ownedFailure = () => false) {
    if (opts?.blockNumber !== undefined && opts.blockNumber < 0n) {
        throw new InvalidInputError("blockNumber must be nonnegative");
    }
    try {
        const o = await client.readContract({
            address: pool,
            abi: ReadsAbi.binaryPoolReadAbi,
            functionName: "getOrder",
            args: [orderId],
            ...(opts?.blockNumber === undefined ? {} : { blockNumber: opts.blockNumber }),
        });
        return toOnchainOrder(o);
    }
    catch (err) {
        if (ownedFailure(err))
            throw err;
        // The pool signals "no active order with this id" by reverting, not by
        // returning a zeroed struct — so this is a normal answer, not a failure.
        //
        // Matched on SELECTOR, not `errorName`: the read boundary decodes names from
        // the generated contract-error table, and IncorrectOrder is not in it (that
        // sweep covers `smart-contracts/src/**`, while OrderBook lives in the dex
        // submodule under `lib/`). So the boundary preserves the raw 4 bytes and
        // leaves `errorName` undefined.
        if (err instanceof ContractRevertError && err.data?.startsWith(INCORRECT_ORDER_SELECTOR))
            return null;
        throw err;
    }
}
/**
 *  An owner's open order ids at chain head.
 *
 *  **When to use**
 *
 *  Use to re-sync after a restart, or to confirm a placement landed before the
 *  indexer reports it. The indexed counterpart is `getOpenOrders`, which carries
 *  decoded human-unit rows and history but lags chain head.
 *
 *  **Gotchas**
 *
 *  The pool's view answers for `msg.sender`, so the wrapper impersonates the
 *  owner via the `eth_call` sender — no signer, no signature, any address may be
 *  asked about. Ids only: pair with {@link getOrderOnchain} for the structs, or
 *  use `client.getOpenOrdersOnchain`, which joins the two at one pinned block.
 *
 *  This read is never routed through Multicall3. The pool reads `msg.sender`,
 *  which through an aggregator is the aggregator, so a batched call would return
 *  that contract's empty order set — silently wrong rather than a revert.
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
 */
export async function getOwnOpenOrdersOnchain(pool, owner, client, opts) {
    if (opts?.blockNumber !== undefined && opts.blockNumber < 0n) {
        throw new InvalidInputError("blockNumber must be nonnegative");
    }
    const ids = await client.readContract({
        address: pool,
        abi: ReadsAbi.binaryPoolReadAbi,
        functionName: "getOwnOpenOrders",
        // Impersonate the owner: the view reads msg.sender, and an eth_call `from`
        // needs no signature.
        account: owner,
        ...(opts?.blockNumber === undefined ? {} : { blockNumber: opts.blockNumber }),
    });
    return [...ids];
}
/**
 *  The maximum number of pools `client.getOpenOrdersOnchain` accepts in one call.
 *
 *  The real ceiling is the node's `eth_call` gas cap, not this number: the
 *  pool's `getOwnOpenOrders` is an unbounded per-user loop, so one pool with a
 *  very large resting set can exhaust it on its own. This cap only keeps the
 *  fan-out of id reads bounded (SDK-IO-005).
 *
 * @category orders
 */
export const OPEN_ORDERS_ONCHAIN_MAX_POOLS = 50;
/**
 *  One owner's full open-order rows across several pools, read from chain at one
 *  pinned block.
 *
 *  **When to use**
 *
 *  Use when you must list your own resting orders and cannot depend on the
 *  indexer. `getOpenOrders` is the indexed counterpart: it carries decoded
 *  human-unit rows, the market a row belongs to, and history, but it throws
 *  `IndexerError` during an outage and lists stale rows while the indexer lags.
 *  This read answers from the chain itself, so it survives both.
 *
 *  It is the non-destructive companion to `cancelAllOrders`, which already reads
 *  its ids from chain: this one shows what is resting, that one pulls it.
 *
 *  **Details**
 *
 *  The join is two stages at one block. One direct id read per pool, then one
 *  batched `getOrder` for every id. The id read is never batched: the pool's
 *  view answers for `msg.sender`, so through Multicall3 it would return the
 *  aggregator's empty set — silently wrong rather than a revert. The detail
 *  reads carry no such constraint and go through Multicall3 when the chain
 *  declares it, with a narrow fan-out otherwise.
 *
 *  **Gotchas**
 *
 *  - The caller supplies the pool list. There is no discovery here, because
 *    discovering pools by symbol is an indexer read and would reintroduce the
 *    dependency this read exists to remove.
 *  - Rows carry `isBid` and NOT a YES/NO side. On a binary pool the side is not
 *    derivable: a bid can be BUY_YES or SELL_NO, and only the
 *    `BinaryOrderPlaced.kind` event is authoritative. So these rows are enough
 *    for quote management and not enough for binary inventory or collateral
 *    accounting. Spot and perp rows are complete.
 *  - No `market`, `marketInfo` or symbol: those are indexer fields.
 *  - No history. Only what is resting at the block read.
 *  - A pool with no resting orders contributes no rows. That is an empty
 *    result, never a failure; a failed read throws instead (SDK-IO-002).
 *  - The streaming alternative for one binary pool is a chain-seeded watch,
 *    `watchMarket(pool, { seed: "chain", marketId })`, plus `getLiveUserOrders`.
 *    That keeps a live view but needs a WebSocket watch per pool; this is a
 *    one-shot read.
 *
 * **Example** (Listing your resting orders during an indexer outage)
 *
 * ```ts
 * const { orders, blockNumber } = await client.getOpenOrdersOnchain([pool], owner);
 * for (const o of orders) console.log(o.pool, o.orderId, o.price, o.quantityRemaining);
 * console.log("as of block", blockNumber);
 * ```
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative, or more
 *   than {@link OPEN_ORDERS_ONCHAIN_MAX_POOLS} pools are supplied.
 * @throws {@link RpcError} If the node returns fewer reads than were requested,
 *   or a returned id has no active order at the pinned block.
 * @throws {@link ContractRevertError} If a pool read reverts.
 * @category orders
 */
export async function getOpenOrdersOnchain(pools, owner, client, opts) {
    if (opts?.blockNumber !== undefined && opts.blockNumber < 0n) {
        throw new InvalidInputError("blockNumber must be nonnegative");
    }
    if (pools.length > OPEN_ORDERS_ONCHAIN_MAX_POOLS) {
        throw new InvalidInputError(`getOpenOrdersOnchain accepts at most ${OPEN_ORDERS_ONCHAIN_MAX_POOLS} pools, got ${pools.length}`);
    }
    const pc = client;
    // Pin FIRST: the id reads and the detail reads must quote one block. An id
    // read at head joined to a detail read a block later can miss an order a fill
    // removed in between, and that would silently shorten the result.
    const blockNumber = opts?.blockNumber ?? (await pc.getBlockNumber());
    if (pools.length === 0)
        return { orders: [], blockNumber };
    // One DIRECT call per pool. Never batched — see the Details section.
    const idsPerPool = await Promise.all(pools.map((pool) => getOwnOpenOrdersOnchain(pool, owner, pc, { blockNumber })));
    const wanted = pools.flatMap((pool, i) => (idsPerPool[i] ?? []).map((orderId) => ({ pool, orderId })));
    if (wanted.length === 0)
        return { orders: [], blockNumber };
    const calls = wanted.map((w) => ({
        address: w.pool,
        abi: ReadsAbi.binaryPoolReadAbi,
        functionName: "getOrder",
        args: [w.orderId],
    }));
    const fanOut = () => Promise.all(calls.map((c) => pc.readContract({ ...c, blockNumber })));
    // The seam between the batch's `unknown[]` and the pool's decoded order
    // struct. `multicall({ allowFailure: false })` erases the per-call return
    // types, so the element type is restored once HERE — named, rather than cast
    // at each use — and the length check below is what makes indexing it safe.
    let results;
    try {
        // The same Multicall3 gate `getBookTopsOnchain` uses: the chain must DECLARE
        // the contract, and viem still rejects a pin below its deployment height.
        if (typeof pc.multicall === "function" && pc.chain?.contracts?.multicall3) {
            try {
                results = (await pc.multicall({ contracts: calls, allowFailure: false, blockNumber }));
            }
            catch (e) {
                if (!(e instanceof ChainDoesNotSupportContract))
                    throw e;
                results = (await fanOut());
            }
        }
        else {
            results = (await fanOut());
        }
    }
    catch (error) {
        throw Revert.toSdkError(error, "read open orders", { functionName: "getOrder" });
    }
    if (results.length !== calls.length) {
        throw new RpcError("getOrder", `expected ${calls.length} reads, got ${results.length}`);
    }
    const orders = wanted.map((w, i) => {
        const raw = results[i];
        // An id the pool just returned ALWAYS has an order at that same block: the
        // id view walks live slots, and the detail view only checks that the stored
        // id matches. So a missing detail is a broken pin or an upgraded pool, not
        // an order that went away. Throw rather than drop the row, which would
        // report a short list as a complete one (SDK-IO-002).
        if (raw === undefined || raw === null) {
            throw new RpcError("getOrder", `pool ${w.pool} returned no order for id ${w.orderId} at block ${blockNumber}`);
        }
        return { ...toOnchainOrder(raw), pool: w.pool };
    });
    return { orders, blockNumber };
}
/**
 *  One page of every open order on one side of a book, at chain head or at a
 *  pinned block.
 *
 *  **When to use**
 *
 *  Use to snapshot a full side — the per-order detail `getBookLevels` aggregates
 *  away. For a consistent multi-page snapshot, pass `blockNumber`: pages taken
 *  across different heads can double-count or miss orders as the book moves.
 *  Sample one head with `getBlockNumber`, then pass it to every page.
 *
 * **Details**
 *
 * - `opts`: `isBid` picks the side; `maxCount` caps orders per page (default 100); `cursor` continues a previous page (omit for the first); `blockNumber` reads at that exact block instead of the current head.
 *
 *  **Gotchas**
 *
 *  The pool accepts this view ONLY from the zero address, so this read never
 *  attaches an account — a configured signer does not change it. Pagination is
 *  the contract's, surfaced as-is: no auto-drain, since the number of pages is
 *  unbounded. Loop while `hasMore`, passing `nextCursor` back as `cursor`.
 *
 * @throws {@link InvalidInputError} If `opts.blockNumber` is negative.
 */
export async function getAllOpenOrdersOnchain(pool, opts, client) {
    if (opts.blockNumber !== undefined && opts.blockNumber < 0n) {
        throw new InvalidInputError("blockNumber must be nonnegative");
    }
    const [orders, hasMoreOrders, nextCursor] = await client.readContract({
        address: pool,
        abi: ReadsAbi.binaryPoolReadAbi,
        functionName: "getAllOpenOrdersOffChain",
        args: [opts.isBid, BigInt(opts.maxCount ?? 100), opts.cursor ?? 0n],
        // Deliberately NO `account`: the contract requires msg.sender == address(0).
        ...(opts.blockNumber === undefined ? {} : { blockNumber: opts.blockNumber }),
    });
    return { orders: orders.map(toOnchainOrder), hasMore: hasMoreOrders, nextCursor };
}
/**
 *  Default orders per page when draining a whole side. Higher than the 100 of a
 *  single `getAllOpenOrdersOnchain` page because a drain pays one `eth_call` per
 *  page: a 10,000-order side costs 100 calls at 100, and 20 at 500.
 */
export const DRAIN_PAGE_SIZE = 500;
/**
 *  Default pages per side for a drain. With {@link DRAIN_PAGE_SIZE} this covers
 *  20,000 resting orders per side, well past any book seen in practice.
 */
export const DRAIN_MAX_PAGES = 40;
/**
 *  Every resting order on both sides of a pool's book, at one pinned block.
 *
 *  **When to use**
 *
 *  Use to seed a full local book from chain alone. This is the drain
 *  {@link getAllOpenOrdersOnchain} deliberately does not do, with an explicit
 *  bound instead of an open `while (hasMore)` loop.
 *
 *  **Details**
 *
 *  One head is sampled once (unless `blockNumber` pins it), then both sides
 *  drain concurrently, each side serially by cursor, every page reading at that
 *  same block. So the two sides describe one consistent instant of the book.
 *
 *  **Gotchas**
 *
 *  Reaching the page budget is a successful bounded read, not a failure: it
 *  returns what it read with `truncated: true` rather than throwing. A caller
 *  that treats a truncated book as complete shows a shallow book. Check the
 *  flag, and raise `maxPages` or `maxCount` if a real book needs more.
 *
 * @throws {@link InvalidInputError} If `blockNumber` is negative, or `maxCount`/`maxPages` is not a positive safe integer.
 * @throws {@link ContractRevertError} If a page read reverts.
 * @throws {@link RpcError} If the chain read fails at the transport.
 * @category orders
 */
export async function drainOpenOrdersOnchain(pool, client, opts) {
    const maxCount = opts?.maxCount ?? DRAIN_PAGE_SIZE;
    const maxPages = opts?.maxPages ?? DRAIN_MAX_PAGES;
    if (!Number.isSafeInteger(maxCount) || maxCount <= 0 || !Number.isSafeInteger(maxPages) || maxPages <= 0) {
        throw new InvalidInputError("drain maxCount and maxPages must be positive safe integers");
    }
    if (opts?.blockNumber !== undefined && opts.blockNumber < 0n) {
        throw new InvalidInputError("blockNumber must be nonnegative");
    }
    // Sample the head ONCE. Both sides and every page of each side then read at
    // this block, so the seed is one consistent instant rather than a book
    // stitched from several heads.
    const blockNumber = opts?.blockNumber ?? (await client.getBlockNumber());
    const drainSide = async (isBid) => {
        const orders = [];
        let cursor = 0n;
        for (let page = 0; page < maxPages; page++) {
            const res = await getAllOpenOrdersOnchain(pool, { isBid, maxCount, cursor, blockNumber }, client);
            orders.push(...res.orders);
            if (!res.hasMore)
                return { orders, truncated: false };
            cursor = res.nextCursor;
        }
        return { orders, truncated: true };
    };
    const [bids, asks] = await Promise.all([drainSide(true), drainSide(false)]);
    return {
        bids: bids.orders,
        asks: asks.orders,
        blockNumber,
        truncated: bids.truncated || asks.truncated,
    };
}
/**
 *  Read the resting orderbook from a BinaryPool via getBookLevels (both sides).
 *  One-shot chain read — for a continuously-current book with zero round-trips,
 *  use `client.getLiveBinaryOrderBook` (or the `useLiveBinaryOrderBook` hook).
 */
export async function getBinaryOrderBook(pool, opts, client) {
    const decimals = opts?.decimals ?? Store.DECIMALS;
    if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 255)
        throw new InvalidInputError("book decimals must be an integer from 0 to 255");
    const oneBase = 10n ** BigInt(decimals);
    const { bids, asks, blockNumber } = await readBookLevels(pool, opts?.depth ?? 10, client, opts?.blockNumber);
    return { ...toBinaryBook(bids, asks, oneBase), blockNumber };
}
/**
 *  Read a SpotPool's resting order book via the shared OrderBook `getBookLevels`
 *  (SpotPool and BinaryPool share the base contract, so the same read works).
 */
export async function getSpotOrderBook(pool, opts, client) {
    return readBookLevels(pool, opts?.depth ?? 12, client, opts?.blockNumber);
}
/** Latest chain head as seen by the RPC. */
export async function getHeadBlock(client) {
    return Number(await client.getBlockNumber());
}
/**
 *  Orders that are past expiry and STILL RESTING, across the whole book — the
 *  work-list for a permissionless expired-order sweep. Not scoped to one account.
 *
 *  Indexer tier. Works on every market kind; scope with `pool` and/or `marketType`.
 *
 *  **This is not `status: "Expired"`, and the difference is the whole point.** That
 *  status is written when the chain emits `OrderExpired` — i.e. once an order has
 *  ALREADY been removed. A keeper needs the opposite: orders the book still holds
 *  whose expiry has passed and which nobody has cleaned up yet. So the filter is
 *  `status = "Open"` AND `expireTimestampNs < now`.
 *
 *  They are **not matched against** — the matching loop skips an expired maker and
 *  moves to the next (F-2026-16202, so one user's expired pollution is no longer paid
 *  for by the next crossing taker). What they still cost is a warm SLOAD every time a
 *  traversal encounters them, plus the priority-index slot they occupy. That is the
 *  reason to sweep, and it is per-ENCOUNTER: an order overdue by a year at an
 *  untouched price level costs less than one overdue by a minute at the top of book.
 *  Longest-overdue first is a stable, obvious order to work through — not a claim
 *  about which orders cost the most.
 *
 *  GTC orders exclude themselves, but not via a sentinel: the contract has none, and
 *  any future expiry is simply live. This SDK writes GTC as now + 50 years
 *  (`farFutureNs`), which no realistic `asOfSec` reaches. An order placed by other
 *  tooling with a nearer expiry is genuinely sweepable once it passes, which is
 *  correct.
 *
 * **Details**
 *
 * - `opts.pool`: restrict to one pool
 * - `opts.marketType`: restrict to one market kind
 * - `opts.owner`: restrict to one owner (for a self-cleanup rather than a sweep)
 * - `opts.asOfSec`: the instant to judge expiry against (unix seconds; default now)
 * - `opts.limit`: default 200
 */
export async function listSweepableOrders(opts = {}, indexerUrl) {
    const nowSec = opts.asOfSec ?? Math.floor(Date.now() / 1000);
    // expireTimestampNs is NANOseconds; the cutoff has to be scaled or every order
    // looks unexpired by a factor of a billion.
    const cutoffNs = BigInt(nowSec) * 1000000000n;
    const where = {
        status: { _eq: "Open" },
        expireTimestampNs: { _lt: cutoffNs.toString() },
    };
    if (opts.owner != null)
        where.owner = { _eq: opts.owner.toLowerCase() };
    // Scoped on `market_id`, not the `market` relationship — see pools.ts, "type scope, as pools".
    Object.assign(where, await Pools.marketScope({ pool: opts.pool, marketType: opts.marketType }, indexerUrl));
    const data = await IndexerRead.gqlRequest(SweepableOrdersQuery, { where, limit: opts.limit ?? 200, offset: opts.offset ?? 0 }, indexerUrl);
    return data.Order.map((o) => ({
        id: o.id,
        orderId: o.orderId,
        market: o.market,
        marketInfo: toOrderMarket(o.marketRow),
        pool: (o.marketRow?.poolAddress ?? "").toLowerCase(),
        marketType: o.marketRow?.marketType ?? "SPOT",
        owner: o.owner,
        isBid: o.isBid,
        price: o.price,
        quantityRemaining: o.quantityRemaining,
        expireTimestampNs: o.expireTimestampNs,
        placedAtTimestamp: o.placedAtTimestamp,
    }));
}
/**
 *  Build the server-side `where` for an order query — object form, only the set
 *  fields (no string interpolation).
 */
async function orderWhere(owner, opts, indexerUrl, forceStatus) {
    const where = { owner: { _eq: scopeId(owner, "owner") } };
    const status = forceStatus ?? opts.status;
    if (status != null)
        where.status = { _eq: status };
    if (opts.side != null)
        where.side = { _eq: opts.side };
    if (opts.userData != null)
        where.userData = { _eq: decimalTag(opts.userData) };
    if (opts.sinceBlock != null)
        where.placedAtBlock = IndexerRead.blockLowerBound(opts.sinceBlock, "sinceBlock");
    // Every scope is validated BEFORE the first classification read, so a
    // malformed option costs the caller no round trip.
    const pool = opts.pool == null ? undefined : scopeId(opts.pool, "pool");
    const market = opts.market == null ? undefined : scopeId(opts.market, "market");
    const pools = opts.pools == null ? undefined : scopeList(opts.pools, "pools");
    const markets = opts.markets == null ? undefined : scopeList(opts.markets, "markets");
    // Scoped on `market_id`, not the `market` relationship — see pools.ts, "type scope, as pools".
    Object.assign(where, await Pools.marketScope({ pool }, indexerUrl));
    // The batched scopes go in `_and` rather than onto `where` directly: a pool
    // scope resolves to `market_id` for SPOT/PERP and to the `market` relationship
    // for a recycled BINARY pool, so assigning them by key would let one scope
    // overwrite another. Hasura ANDs the top-level fields with `_and`, which is
    // what makes `pool` + `pools` the intersection rather than a replacement.
    const batched = [];
    if (market !== undefined)
        batched.push({ market_id: { _eq: market } });
    if (pools !== undefined)
        batched.push(await poolsScope(pools, indexerUrl));
    if (markets !== undefined)
        batched.push({ market_id: { _in: markets } });
    if (batched.length)
        where._and = batched;
    return where;
}
/**
 *  The predicate matching orders on ANY of `pools`, which arrives already
 *  validated and deduplicated.
 *
 *  An empty list matches NOTHING — the same contract as `FillsScope.markets`,
 *  expressed as the empty `_in` the pool scope itself uses for a type mismatch
 *  (`pools.ts`). Returning no predicate instead would silently widen a caller's
 *  dynamic list into an unscoped read.
 */
async function poolsScope(pools, indexerUrl) {
    if (pools.length === 0)
        return { market_id: { _in: [] } };
    const scopes = await Pools.marketScopes(pools, indexerUrl);
    // A disjunction rather than one `_in`, because the scopes are not all the same
    // shape: a recycled BINARY pool resolves to the `market` relationship while a
    // SPOT/PERP pool resolves to its own `market_id`.
    return { _or: scopes };
}
/**
 *  Largest batched scope a single read accepts.
 *
 *  A pool list costs one batched market-type look-up for the DISTINCT pools not
 *  already classified before the order query (`Pools.marketScopes`, memoized per
 *  indexer), and every element becomes an arm of the predicate. The cap keeps
 *  one careless call from building a predicate of hundreds of arms against a
 *  shared indexer. It is far above any real venue: the testnet deployment lists
 *  nine pools in total.
 */
const MAX_SCOPE_LIST = 100;
/**
 *  One scope identifier, lower-cased — the case-insensitive form every indexer
 *  address and market id is stored in.
 *
 *  A non-string or empty value is refused here so a caller sees
 *  `InvalidInputError` naming the option, rather than a `TypeError` from inside
 *  the SDK or a filter that silently matched nothing (SDK-ERR-001).
 */
function scopeId(value, option) {
    if (typeof value !== "string" || value.length === 0) {
        throw new InvalidInputError(`${option} must be a non-empty string`);
    }
    return value.toLowerCase();
}
/** A batched scope as a bounded list of distinct lower-cased identifiers. */
function scopeList(values, option) {
    if (!Array.isArray(values))
        throw new InvalidInputError(`${option} must be an array`);
    if (values.length > MAX_SCOPE_LIST) {
        throw new InvalidInputError(`${option} accepts at most ${MAX_SCOPE_LIST} entries, received ${values.length}`);
    }
    // Deduplicated because a repeated pool would otherwise repeat both its
    // classification read and its arm of the predicate.
    return [...new Set(Array.from(values, (value) => scopeId(value, option)))];
}
/**
 *  A caller-supplied uint64 tag as the decimal string the `numeric` column
 *  compares against, rejecting anything that is not one.
 *
 *  Validated here rather than at the indexer because a malformed tag is the
 *  CALLER's mistake: Hasura would answer a wire error that names the variable
 *  rather than the option, and `InvalidInputError` says "fix the call" while
 *  `IndexerError` says "retry" (SDK-ERR-003). Runtime types are checked too:
 *  JavaScript numbers may already have lost precision before conversion.
 *  A `bigint` reaches the same regex through `toString`, so a negative value
 *  is rejected by the one rule.
 *
 *  The protocol field is a uint64, so a value above `2^64 - 1` names an order
 *  that cannot exist and is refused rather than sent as a filter that silently
 *  matches nothing. The bound also caps the length of the string reaching the
 *  indexer.
 */
function decimalTag(value) {
    if (typeof value !== "bigint" && typeof value !== "string") {
        throw new InvalidInputError("userData must be a bigint or decimal string");
    }
    const text = value.toString();
    // Length first: the bound below parses the string, and an unbounded decimal
    // would be parsed before it was rejected.
    if (text.length > MAX_TAG_DIGITS || !/^(?:0|[1-9][0-9]*)$/.test(text) || BigInt(text) > MAX_TAG) {
        throw new InvalidInputError(`userData must be a decimal integer from 0 to ${MAX_TAG}, received ${JSON.stringify(text)}`);
    }
    return text;
}
/** Largest client order id the protocol can store: `userData` is a uint64. */
const MAX_TAG = 2n ** 64n - 1n;
/** Digits in {@link MAX_TAG}; a longer string cannot be in range and is refused unparsed. */
const MAX_TAG_DIGITS = MAX_TAG.toString().length;
// ---------------------------------------------------------------------------
// Typed documents for the reads above. Hoisted here (rather than inline at each
// call site) to keep this file's reading order: functions first, GraphQL after.
// Result and variable types are derived from the committed schema snapshot.
// The market context every order read carries. Selected as a fragment so the
// three reads cannot drift apart, and kept to the fields a consumer needs to
// LABEL a row — anything richer is a `getMarket(row.market)` away, keyed by the
// id these reads now return.
// prettier-ignore
const OrderMarketFields = graphql(`
  fragment OrderMarketFields on Market {
    marketAddress
    asset
    question
    expiry
    tradingStart
    quoteDecimals
    intervalSec
  }
`);
// prettier-ignore
const SweepableOrdersQuery = graphql(`
  query SweepableOrders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Order(where: $where, order_by: [{expireTimestampNs: asc}, {id: asc}], limit: $limit, offset: $offset) {
          id orderId owner isBid price quantityRemaining expireTimestampNs placedAtTimestamp
          market: market_id
          marketRow: market { poolAddress marketType ...OrderMarketFields }
        }
      }
`);
// prettier-ignore
const OpenOrdersQuery = graphql(`
  query OpenOrders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Order(where: $where, order_by: [{placedAtTimestamp: desc}, {id: desc}], limit: $limit, offset: $offset) {
          id orderId userData side isBid price quantityRemaining
          market: market_id
          marketRow: market { poolAddress ...OrderMarketFields }
        }
      }
`);
// prettier-ignore
const OrdersQuery = graphql(`
  query Orders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Order(where: $where, order_by: [{placedAtTimestamp: desc}, {id: desc}], limit: $limit, offset: $offset) {
          id orderId userData side isBid price quantityRemaining fullQuantity filledQuantity status
          rested expireTimestampNs placedTxHash placedAtTimestamp
          cancelReason amendedFromOrderId amendedToOrderId
          market: market_id
          marketRow: market { poolAddress ...OrderMarketFields }
        }
      }
`);
// prettier-ignore
const OrderDetailQuery = graphql(`
  query OrderDetail($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        Order(where: { id: { _eq: $id } }, limit: 1) {
          id orderId owner userData side isBid price quantityRemaining fullQuantity filledQuantity
          status rested expireTimestampNs placedTxHash placedAtTimestamp placedAtBlock
          lastUpdatedAtTimestamp cancelReason amendedFromOrderId amendedToOrderId
          market: market_id
          marketRow: market { poolAddress ...OrderMarketFields }
          marketRef: market { ...MarketRefFields }
        }
      }
`);
// prettier-ignore
const BookTopsQuery = graphql(`
  query BookTops($bidWhere: Order_bool_exp!, $askWhere: Order_bool_exp!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         bids: Order(where: $bidWhere, distinct_on: market_id, order_by: [{market_id: desc}, {price: desc}]) {
           market: market_id price
         }
         asks: Order(where: $askWhere, distinct_on: market_id, order_by: [{market_id: asc}, {price: asc}]) {
           market: market_id price
         }
       }
`);
/**
 *  Read both sides of an OrderBook pool's resting book via `getBookLevels`.
 *  SpotPool and BinaryPool share the base contract, so the same read works for
 *  either — the binary/spot readers just interpret the levels differently.
 */
async function readBookLevels(pool, depth, client, pin) {
    if (!Number.isSafeInteger(depth) || depth <= 0 || (pin !== undefined && pin < 0n)) {
        throw new InvalidInputError("book depth must be a positive safe integer and blockNumber nonnegative");
    }
    try {
        const blockNumber = pin ?? (await client.getBlockNumber());
        const numLevels = BigInt(depth);
        const [rawBids, rawAsks] = await Promise.all([
            client.readContract({
                address: pool,
                abi: ReadsAbi.binaryPoolReadAbi,
                functionName: "getBookLevels",
                args: [true, numLevels],
                blockNumber,
            }),
            client.readContract({
                address: pool,
                abi: ReadsAbi.binaryPoolReadAbi,
                functionName: "getBookLevels",
                args: [false, numLevels],
                blockNumber,
            }),
        ]);
        return { bids: [...rawBids], asks: [...rawAsks], blockNumber };
    }
    catch (error) {
        throw Revert.toSdkError(error, "read order book", { address: pool, functionName: "getBookLevels" });
    }
}
// ---------------------------------------------------------------------------
// Writes. Each takes the `Writer` context first (CONVENTIONS.md data-first); the
// `Trader` facade binds them so its public shape is unchanged.
// ---------------------------------------------------------------------------
// The order call itself, with no approval and no send. Split out of `placeOrder`
// so the sending verb and `buildPlaceOrder` encode from ONE definition — the
// build-only verb cannot drift from what actually gets sent.
async function binaryOrderCall(w, p) {
    if (p.price <= 0n || p.quantity <= 0n) {
        throw new InvalidInputError("price and quantity must be > 0");
    }
    const kind = Writer.ORDER_KIND[p.side];
    const orderType = p.orderType ?? 0;
    // v2 order-expiry rule: every order must satisfy `0 < expireNs <=
    // pool.marketExpiryNs` (the pool rejects `OrderExpiryBeyondMarket`
    // otherwise, so the book stays drainable via the expiry sweeps after the
    // market locks). Default to the market's expiry when the caller doesn't
    // specify; otherwise honour the caller's value verbatim (a too-late value
    // reverts on-w.chain — we don't silently clamp a deliberate choice).
    const expiry = p.expireTimestampNs ?? (await w.marketExpiryNs(p.pool));
    // userData is opaque MM bookkeeping — forwarded verbatim, default 0.
    const userData = p.userData ?? 0n;
    // Pool-direct: BinaryPool exposes placeBinaryOrder (the generic placeOrder
    // reverts UseBinaryPlacement on a binary pool). Builder/routing fee rides the
    // pool's per-order rail — the builder must be opted in via approveBuilder.
    return {
        address: p.pool,
        abi: TradeAbi.binaryPoolWriteAbi,
        functionName: "placeBinaryOrder",
        args: [
            kind,
            p.price,
            p.quantity,
            expiry,
            orderType,
            p.selfMatchingOption ?? 0,
            p.builder ?? Writer.ZERO_ADDRESS,
            p.builderFeeBpsTimes1k ?? 0n,
            userData,
        ],
        gas: p.gas ?? w.defaultGas,
    };
}
export async function placeOrder(w, p) {
    const call = await binaryOrderCall(w, p);
    // Escrow pulls w.from msg.sender via the pool, so authorize the POOL:
    // buys need a collateral ERC-20 allowance; sells need a one-time operator
    // grant on the outcome-token singleton (covers all markets + both sides).
    // The grant rides in the SAME executor call as the order, so a batching
    // executor (a safe with MultiSend) lands both in one transaction.
    const prerequisites = [];
    if (p.autoApprove !== false) {
        const gas = p.gas ?? w.defaultGas;
        const e = w.escrow(p, await w.tokens(p));
        const grant = e.kind === "erc20"
            ? await w.approvalIfNeeded(e.token, p.pool, e.amount, gas)
            : await w.operatorGrantIfNeeded(e.outcomeToken, p.pool, gas);
        if (grant)
            prerequisites.push(grant);
    }
    return w.executeOrder(call, prerequisites);
}
export async function cancelOrder(w, p) {
    return w.execute({
        address: p.pool,
        abi: TradeAbi.binaryPoolWriteAbi,
        functionName: "cancelOrder",
        args: [BigInt(p.orderId)],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function reduceOrder(w, p) {
    return w.execute({
        address: p.pool,
        abi: TradeAbi.binaryPoolWriteAbi,
        functionName: "reduceOrder",
        args: [BigInt(p.orderId), p.newQuantityRemaining],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function cancelExpiredOrders(w, p) {
    return w.execute({
        address: p.pool,
        abi: TradeAbi.binaryPoolWriteAbi,
        functionName: "cancelExpiredOrders",
        args: [p.orderIds.map((id) => BigInt(id))],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function sweepExpiredAtLevel(w, p) {
    return w.execute({
        address: p.pool,
        abi: TradeAbi.binaryPoolWriteAbi,
        functionName: "sweepExpiredAtLevel",
        args: [p.isBid, p.price, p.maxCount],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function captureClose(w, p) {
    return w.execute({
        address: p.pool,
        abi: TradeAbi.binaryPoolWriteAbi,
        functionName: "captureClose",
        args: [p.maxSteps ?? 0n],
        gas: p.gas ?? w.defaultGas,
    });
}
/**
 *  What a spot placement escrows: the token the pool pulls (to approve), or native
 *  msg.value. How MUCH is the pool's call — see `spotRequirement`.
 */
function spotEscrow(p) {
    // Buy base → pay quote.
    if (p.isBid)
        return { token: p.quoteToken };
    // Sell native base → pay via msg.value (no approval).
    if (p.baseIsNative)
        return { native: true };
    // Sell ERC-20 base → approve the pool for the base token.
    return { token: p.baseToken };
}
/**
 *  What the pool will pull for this order at worst, and how far the owner's vault
 *  falls short of it — the pool's own numbers (`getAutoPullRequirement`), fee
 *  headroom included: `principal + ceil(principal × (max(taker, maker) + builder))`.
 *  The SDK could only guess at the fee rates, so it asks. One `eth_call`.
 */
function spotRequirement(w, p) {
    return PoolReads.getAutoPullRequirement({
        pool: p.pool,
        owner: w.fromAddress,
        isBid: p.isBid,
        price: p.price,
        quantity: p.quantity,
        ...(p.builderFeeBpsTimes1k === undefined ? {} : { builderFeeBpsTimes1k: p.builderFeeBpsTimes1k }),
    }, w.publicClient);
}
/**
 *  `msg.value` for a native-base sell: the vault shortfall the pool reports.
 *  SpotPool requires `msg.value >= requiredAmount − vaultBalance` and refunds any
 *  overage; the bare quantity is short by the fee headroom on every fee-bearing
 *  pool, and the placement reverts `InvalidMsgValue`.
 */
async function nativeSellValue(w, p) {
    return (await spotRequirement(w, p)).delta;
}
function requireSpotOrderShape(p) {
    if (p.price <= 0n || p.quantity <= 0n) {
        throw new InvalidInputError("price and quantity must be > 0");
    }
}
// Split out of `placeSpotOrder` for the same reason as `binaryOrderCall`: one
// definition of the call, shared by the sending verb and the build-only one.
// `value` is the native-base sell's msg.value (see nativeSellValue), 0n otherwise.
function spotOrderCall(w, p, value) {
    requireSpotOrderShape(p);
    return {
        address: p.pool,
        abi: TradeAbi.spotPoolWriteAbi,
        functionName: "placeOrder",
        args: [
            p.isBid,
            p.userData ?? 0n,
            p.price,
            p.quantity,
            p.expireTimestampNs ?? Writer.farFutureNs(),
            p.orderType ?? 0,
            p.selfMatchingOption ?? 0,
            p.builder ?? Writer.ZERO_ADDRESS,
            p.builderFeeBpsTimes1k ?? 0n,
        ],
        gas: p.gas ?? w.defaultGas,
        value,
    };
}
export async function placeSpotOrder(w, p) {
    requireSpotOrderShape(p);
    const e = spotEscrow(p);
    const prerequisites = [];
    if (p.autoApprove !== false && "token" in e) {
        // The threshold is the pool's worst-case pull, not the bare principal: an
        // allowance that covers the principal but not the fee headroom lets the
        // approval be skipped and the pull revert. Priced only when the pair is
        // not already cached (see approvalIfNeeded). The approval rides in the SAME
        // executor call as the order.
        const approval = await w.approvalIfNeeded(e.token, p.pool, async () => (await spotRequirement(w, p)).requiredAmount, p.gas ?? w.defaultGas);
        if (approval)
            prerequisites.push(approval);
    }
    const value = "native" in e ? await nativeSellValue(w, p) : 0n;
    // Encoded AFTER the approval is priced, as before this verb was split: the
    // expiry `spotOrderCall` stamps is clock-derived, so building it first would
    // date it from before the allowance and requirement reads.
    return w.executeOrder(spotOrderCall(w, p, value), prerequisites);
}
// Split out of `placePerpOrder` — see `binaryOrderCall`.
// Decode the per-order lifecycle events this tx emitted on `pool`, in log order.
// Batch outcomes are reconstructed positionally from these: the OrderBook processes
// a batch's requests in input order and emits at most one OrderPlaced per request,
// so the Nth OrderPlaced belongs to the Nth request that placed.
function batchOrderEvents(receipt, pool) {
    const placed = [];
    const terminated = new Set();
    const fills = [];
    for (const log of receipt.logs) {
        // Same-tx logs from other contracts (token transfers, vault credits) must not
        // be mistaken for this pool's order events.
        if (log.address.toLowerCase() !== pool.toLowerCase())
            continue;
        let decoded;
        try {
            decoded = decodeEventLog({ abi: EventsAbi.orderBookEventsAbi, data: log.data, topics: log.topics });
        }
        catch {
            continue;
        }
        if (decoded.eventName === "OrderPlaced") {
            const o = decoded.args.placedOrder;
            placed.push({
                orderId: o.orderId,
                isBid: o.isBid,
                price: o.price,
                quantity: o.fullQuantity,
                userData: o.userData,
                expireTimestampNs: o.expireTimestampNs,
            });
        }
        else if (decoded.eventName === "OrderCancelled" || decoded.eventName === "OrderExpired") {
            terminated.add(decoded.args.orderId);
        }
        else if (decoded.eventName === "OrderFilled") {
            fills.push({
                takerOrderId: decoded.args.takerOrderId,
                makerOrderId: decoded.args.makerOrderId,
                quantityFilled: decoded.args.quantityFilled,
                takerRemainingQuantity: decoded.args.takerRemainingQuantity,
                makerRemainingQuantity: decoded.args.makerRemainingQuantity,
                fillPrice: decoded.args.fillPrice,
            });
        }
    }
    return { placed, terminated, fills };
}
export async function placeSpotOrders(w, p) {
    if (p.orders.length === 0) {
        // The contract reverts EmptyBatch; fail before spending an RPC round-trip.
        throw new InvalidInputError("orders must not be empty");
    }
    for (const [i, o] of p.orders.entries()) {
        if (o.price <= 0n || o.quantity <= 0n) {
            throw new InvalidInputError(`orders[${i}]: price and quantity must be > 0`);
        }
    }
    const gas = p.gas ?? w.defaultGas;
    // Resolve per-request defaults ONCE, before the send, and keep the resolved
    // array for outcome matching below. This is not a style choice: farFutureNs()
    // is clock-derived, so recomputing a defaulted expiry at match time could
    // disagree with the value that actually went on-chain.
    const requests = p.orders.map((o) => ({
        isBid: o.isBid,
        userData: o.userData ?? 0n,
        price: o.price,
        quantity: o.quantity,
        expireTimestampNs: o.expireTimestampNs ?? Writer.farFutureNs(),
        orderType: o.orderType ?? 0,
        selfMatchingOption: o.selfMatchingOption ?? 0,
        builder: o.builder ?? Writer.ZERO_ADDRESS,
        builderFeeBpsTimes1k: o.builderFeeBpsTimes1k ?? 0n,
    }));
    // One approval per token for the batch's total escrow — the pool pulls per
    // request, so a per-order allowance would under-approve the later rungs. The
    // total is the pool's own worst-case figure per order (fee headroom included),
    // summed; priced only when the pair is not already cached.
    // ponytail: one eth_call per order the first time a pair is seen; batch them
    // through multicall if batches grow past a few dozen rungs.
    const prerequisites = [];
    if (p.autoApprove !== false) {
        const required = (isBid) => async () => {
            const reads = p.orders
                .filter((o) => o.isBid === isBid)
                .map((o) => PoolReads.getAutoPullRequirement({
                pool: p.pool,
                owner: w.fromAddress,
                isBid,
                price: o.price,
                quantity: o.quantity,
                ...(o.builderFeeBpsTimes1k === undefined ? {} : { builderFeeBpsTimes1k: o.builderFeeBpsTimes1k }),
            }, w.publicClient));
            return (await Promise.all(reads)).reduce((sum, r) => sum + r.requiredAmount, 0n);
        };
        if (p.orders.some((o) => o.isBid)) {
            const approval = await w.approvalIfNeeded(p.quoteToken, p.pool, required(true), gas);
            if (approval)
                prerequisites.push(approval);
        }
        // A native-base sell cannot be approved OR paid with msg.value here (batches
        // are non-payable) — it draws on the pool's vault balance instead.
        if (p.orders.some((o) => !o.isBid) && !p.baseIsNative) {
            const approval = await w.approvalIfNeeded(p.baseToken, p.pool, required(false), gas);
            if (approval)
                prerequisites.push(approval);
        }
    }
    const result = await w.execute({
        address: p.pool,
        abi: TradeAbi.orderBookBatchWriteAbi,
        functionName: "placeOrders",
        args: [requests],
        gas,
    }, prerequisites);
    // Align the OrderPlaced events back to requests. The contract emits exactly one
    // OrderPlaced per successful request, in request order, echoing the full order
    // (OrderBook.sol `_placeOrder`: every benign non-placement returns before the
    // emit). A non-placement therefore leaves a gap, so walk both lists in step and
    // match on every request-identifying field the event echoes — isBid, price,
    // fullQuantity, userData, expireTimestampNs — to stay aligned past it. Two
    // byte-identical adjacent requests with different outcomes are indistinguishable
    // from logs; the walk credits the earlier index (tag rungs with distinct
    // `userData` when exact attribution matters).
    const { placed, fills } = batchOrderEvents(result.receipt, p.pool);
    let next = 0;
    const outcomes = requests.map((r) => {
        const ev = placed[next];
        if (ev &&
            ev.isBid === r.isBid &&
            ev.price === r.price &&
            ev.quantity === r.quantity &&
            ev.userData === r.userData &&
            ev.expireTimestampNs === r.expireTimestampNs) {
            next += 1;
            return { success: true, orderId: ev.orderId };
        }
        return { success: false };
    });
    return { ...result, outcomes, fills };
}
export async function cancelOrders(w, p) {
    const result = await w.execute(cancelOrdersCall(w, p));
    // Best-effort: a skipped id emits no event, so absence IS the skip signal.
    const { terminated } = batchOrderEvents(result.receipt, p.pool);
    const ids = p.orderIds.map((id) => BigInt(id));
    return {
        ...result,
        outcomes: ids.map((orderId) => ({ orderId, cancelled: terminated.has(orderId) })),
    };
}
/**
 *  Split out of {@link cancelOrders} so {@link buildCancelOrders} encodes the SAME
 *  call — the empty-id guard included, which keeps `EmptyBatch` a caller error on
 *  both paths rather than an on-chain revert on one of them.
 */
function cancelOrdersCall(w, p) {
    if (p.orderIds.length === 0) {
        throw new InvalidInputError("orderIds must not be empty");
    }
    return {
        address: p.pool,
        abi: TradeAbi.orderBookBatchWriteAbi,
        functionName: "cancelOrders",
        args: [p.orderIds.map((id) => BigInt(id))],
        gas: p.gas ?? w.defaultGas,
    };
}
export async function reduceOrders(w, p) {
    return w.execute(reduceOrdersCall(w, p));
}
/** Split out of {@link reduceOrders} — see {@link cancelOrdersCall}. */
function reduceOrdersCall(w, p) {
    if (p.reductions.length === 0) {
        throw new InvalidInputError("reductions must not be empty");
    }
    return {
        address: p.pool,
        abi: TradeAbi.orderBookBatchWriteAbi,
        functionName: "reduceOrders",
        args: [
            p.reductions.map((r) => ({
                orderId: BigInt(r.orderId),
                newQuantityRemaining: r.newQuantityRemaining,
            })),
        ],
        gas: p.gas ?? w.defaultGas,
    };
}
/**
 *  Build {@link cancelOrders} without sending it.
 *
 *  **Details**
 *
 *  - `p`: The same inputs as {@link cancelOrders}.
 *  - Returns: The unsigned batch-cancel call.
 *
 *  **Gotchas**
 *
 *  - Throws {@link InvalidInputError} when `orderIds` is empty.
 *
 *  **Example** (Packing a ladder pull into one batch)
 *
 *  ```ts
 *  const pull = trader.buildCancelOrders({ pool, orderIds: ladderIds });
 *  await myBatcher.send([pull]);
 *  ```
 */
export function buildCancelOrders(w, p) {
    return Writer.toUnsigned(w.chain.id, cancelOrdersCall(w, p), `Cancel ${p.orderIds.length} orders on pool ${p.pool}`);
}
/**
 *  Build {@link reduceOrders} without sending it.
 *
 *  **Details**
 *
 *  - `p`: The same inputs as {@link reduceOrders}.
 *  - Returns: The unsigned batch-reduce call.
 *
 *  **Gotchas**
 *
 *  - Throws {@link InvalidInputError} when `reductions` is empty.
 */
export function buildReduceOrders(w, p) {
    return Writer.toUnsigned(w.chain.id, reduceOrdersCall(w, p), `Reduce ${p.reductions.length} orders on pool ${p.pool}`);
}
/**
 *  A limit high enough that the store page can never be the thing that truncates a
 *  resting set. The store holds only what a watch has witnessed, so this bounds the
 *  page, not the account: the completeness question belongs to the chain source.
 */
const LIVE_OWN_ORDERS_LIMIT = 10_000;
export async function cancelAllOrders(w, pool, live, opts) {
    const orderIds = opts?.source === "live"
        ? liveRestingIds(live, pool, w.fromAddress)
        : await getOwnOpenOrdersOnchain(pool, w.fromAddress, w.publicClient);
    // Nothing resting is a SUCCESSFUL kill switch, and cancelOrders rejects an empty
    // array — so answer here instead of forwarding it.
    if (orderIds.length === 0)
        return { sent: false, orderIds: [], outcomes: [] };
    const result = await cancelOrders(w, { pool, orderIds, ...(opts?.gas === undefined ? {} : { gas: opts.gas }) });
    return { sent: true, orderIds, ...result };
}
/**
 *  The signer's resting ids out of the live store — zero RPC.
 *
 *  Two filters are load-bearing. The store keeps EVERY lifecycle state, so a filled
 *  or cancelled row would otherwise re-enter the batch as a skip; and `rested` is
 *  what the on-chain book counts, so a placed-but-not-yet-rested row is not resting
 *  depth yet.
 *
 *  A LAPSED order still reads `Open` here, because the store only marks `Expired`
 *  on the pool's `OrderExpired` event and lazy expiry does not emit one until
 *  something touches the order. Forwarding its id is CORRECT, not a wasted slot:
 *  the pool's best-effort cancel gates on owner and id, never on expiry, so the
 *  order is removed and its funds released. The removal emits `OrderExpired`
 *  instead of `OrderCancelled`, and `batchOrderEvents` counts both as terminated,
 *  so the outcome is `cancelled: true`. This source therefore clears expiry
 *  residue the chain source cannot even see.
 */
function liveRestingIds(live, pool, owner) {
    if (!live?.isTailing(pool)) {
        throw new NotConfiguredError("an active market watch covering this pool", `cancelAllOrders({ source: "live" }) on pool ${pool} cannot tell a store that is not yet answering completely from an empty book. Call watchMarket/watchUser first, wait for the watch to go live if one is still hydrating or reconnecting, or use the default source: "chain"`);
    }
    return live
        .ordersFor(pool, owner, LIVE_OWN_ORDERS_LIMIT)
        .filter((o) => o.status === "Open" && o.rested)
        .map((o) => BigInt(o.orderId));
}
/**
 *  Batch entries revert `EmptyBatch` on-chain for an empty array. Failing here costs
 *  the caller nothing and says which argument was empty.
 */
function requireNonEmpty(items, what) {
    if (items.length === 0)
        throw new InvalidInputError(`${what} must not be empty`);
}
function requirePositive(price, quantity) {
    if (price <= 0n || quantity <= 0n)
        throw new InvalidInputError("price and quantity must be > 0");
}
/** Fill a {@link BatchOrderRequest}'s optionals into the pool's `PlaceOrderRequest` struct. */
function toPlaceRequest(o) {
    return {
        isBid: o.isBid,
        userData: o.userData ?? 0n,
        price: o.price,
        quantity: o.quantity,
        expireTimestampNs: o.expireTimestampNs ?? Writer.farFutureNs(),
        orderType: o.orderType ?? 0,
        selfMatchingOption: o.selfMatchingOption ?? 0,
        builder: o.builder ?? Writer.ZERO_ADDRESS,
        builderFeeBpsTimes1k: o.builderFeeBpsTimes1k ?? 0n,
    };
}
/**
 *  Cancel ONE order and place its replacement atomically. Calls the pool's singular
 *  `amendOrder`, NOT `amendOrders` with a one-element array: the singular raises the
 *  replacement's own landing-time reason, where an all-or-nothing batch wraps it as
 *  `AmendReplacementRejected(requestIndex, reason)` and any other batch returns only
 *  a `0n` id, leaving the reason in an `AmendRejected` log.
 */
export async function amendOrder(w, p) {
    requirePositive(p.newOrder.price, p.newOrder.quantity);
    const tx = await w.execute({
        address: p.pool,
        // spotPoolWriteAbi is just the encoding table — `amendOrder` is inherited from
        // the shared OrderBook base, so the selector is identical on a PerpPool. Same
        // reason `reduceOrder` above encodes off the binary ABI for every pool kind.
        abi: TradeAbi.spotPoolWriteAbi,
        functionName: "amendOrder",
        args: [
            {
                oldOrderId: BigInt(p.oldOrderId),
                alwaysPlace: p.alwaysPlace ?? false,
                newOrder: toPlaceRequest(p.newOrder),
            },
        ],
        gas: p.gas ?? w.defaultGas,
    });
    return Writer.decodeAmendResult(tx, { pool: p.pool });
}
/**
 *  Re-price N orders in one transaction: all-or-nothing, per-rung or in place,
 *  depending on the pool version (see {@link AmendOrdersParams}). It places, so the
 *  BinaryPool restriction there applies.
 */
export async function amendOrders(w, p) {
    requireNonEmpty(p.amendments, "amendments");
    for (const a of p.amendments)
        requirePositive(a.newOrder.price, a.newOrder.quantity);
    const tx = await w.execute({
        address: p.pool,
        abi: TradeAbi.orderBookBatchWriteAbi,
        functionName: "amendOrders",
        args: [
            p.amendments.map((a) => ({
                oldOrderId: BigInt(a.oldOrderId),
                alwaysPlace: a.alwaysPlace ?? false,
                newOrder: toPlaceRequest(a.newOrder),
            })),
        ],
        gas: p.gas ?? w.defaultGas,
    });
    return Writer.decodeBatchAmendResult(tx, { pool: p.pool, amendmentCount: p.amendments.length });
}
function perpOrderCall(w, p) {
    if (p.price <= 0n || p.quantity <= 0n) {
        throw new InvalidInputError("price and quantity must be > 0");
    }
    // No w.escrow step: margin is locked w.from the signer's MarginBank balance
    // (deposit first), and the pool rejects msg.value.
    return {
        address: p.pool,
        abi: TradeAbi.perpPoolWriteAbi,
        functionName: "placeOrder",
        args: [
            p.isBid,
            0n,
            p.price,
            p.quantity,
            p.expireTimestampNs ?? Writer.farFutureNs(),
            p.orderType ?? 0,
            p.selfMatchingOption ?? 0,
            p.builder ?? Writer.ZERO_ADDRESS,
            p.builderFeeBpsTimes1k ?? 0n,
        ],
        gas: p.gas ?? w.defaultGas,
    };
}
export async function placePerpOrder(w, p) {
    return w.executeOrder(perpOrderCall(w, p));
}
// ---------------------------------------------------------------------------
// Build-only placement. Same inputs as the sending verbs, but they hand back the
// unsigned call instead of signing it — so a caller can pre-sign, batch, relay,
// or simulate. Each shares its call construction with its sending twin above, so
// the calldata cannot drift from what `place*Order` actually sends.
// ---------------------------------------------------------------------------
export async function buildPlaceOrder(w, p) {
    const order = Writer.toUnsigned(w.chain.id, await binaryOrderCall(w, p), `Place ${p.side} order on binary pool ${p.pool}`);
    // `autoApprove: false` means the caller manages approvals themselves — honour it
    // the same way `placeOrder` does. Worth a branch rather than a wasted step: the
    // escrow lookup can cost a `poolTokens` round-trip, which is exactly the latency
    // a build-only verb exists to avoid.
    if (p.autoApprove === false)
        return { order };
    const e = w.escrow(p, await w.tokens(p));
    // A buy escrows collateral (ERC-20 approve); a sell escrows outcome tokens (a
    // one-time ERC-6909 operator grant). Both are returned unsigned — never sent,
    // which is the whole point of a build-only verb.
    const approval = e.kind === "erc20"
        ? Writer.approvalCall(w.chain.id, e.token, p.pool, `Approve collateral ${e.token} for binary pool ${p.pool}`)
        : Writer.toUnsigned(w.chain.id, {
            address: e.outcomeToken,
            abi: ReadsAbi.erc6909Abi,
            functionName: "setOperator",
            args: [p.pool, true],
            gas: 0n,
        }, `Approve binary pool ${p.pool} as operator on outcome tokens ${e.outcomeToken}`);
    return { order, approval };
}
export async function buildPlaceSpotOrder(w, p) {
    requireSpotOrderShape(p);
    const e = spotEscrow(p);
    // The vault shortfall is read NOW; a vault that gains funds before the order is
    // sent only shrinks the requirement (the overage is refunded), one that loses
    // them makes the pool reject the call.
    const value = "native" in e ? await nativeSellValue(w, p) : 0n;
    const order = Writer.toUnsigned(w.chain.id, spotOrderCall(w, p, value), `Place spot ${p.isBid ? "buy" : "sell"} order on pool ${p.pool}`);
    // A native-base sell pays via msg.value, so it has nothing to approve; and
    // `autoApprove: false` means the caller handles approvals themselves.
    if ("native" in e || p.autoApprove === false)
        return { order };
    return {
        order,
        approval: Writer.approvalCall(w.chain.id, e.token, p.pool, `Approve ${e.token} for spot pool ${p.pool}`),
    };
}
export async function buildPlacePerpOrder(w, p) {
    // No approval ever: margin comes from the MarginBank balance, not an escrow
    // transfer, and the pool rejects msg.value.
    return {
        order: Writer.toUnsigned(w.chain.id, perpOrderCall(w, p), `Place perp ${p.isBid ? "long" : "short"} order on pool ${p.pool}`),
    };
}
// The two count documents for `Order` (see IndexerRead.CountDocuments).
const OrderCountDocuments = {
    table: "Order",
    // prettier-ignore
    aggregate: graphql(`
    query OrderCount($where: Order_bool_exp!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      total: Order_aggregate(where: $where) { aggregate { count } }
    }
  `),
    // prettier-ignore
    fallback: graphql(`
    query OrderCountFallback($where: Order_bool_exp!, $limit: Int!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      rows: Order(where: $where, limit: $limit) { id }
    }
  `),
};
