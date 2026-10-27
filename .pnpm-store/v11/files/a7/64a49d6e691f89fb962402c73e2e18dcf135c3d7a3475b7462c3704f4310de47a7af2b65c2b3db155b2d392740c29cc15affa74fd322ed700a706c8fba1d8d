// Binary holdings — outcome-token balances and the portfolio view over them.
//
// BINARY-ONLY: positions are ERC-6909 outcome tokens (one id per market per side)
// plus vault credit for payouts that could not be pushed. Spot holds plain
// ERC-20s (see balances.ts) and perp holds margin (perp/margin.ts) — different
// accounting, different contracts.
import * as IndexerRead from "../indexerRead.js";
import * as PortfolioScope from "../portfolioScope.js";
import * as Interval from "../interval.js";
import { graphql } from "../gql/gql.js";
import * as ReadsAbi from "../readsAbi.js";
import * as DerivedReads from "../derivedReads.js";
import { InvalidInputError } from "../errors.js";
/**
 *  YES + NO indexed balances for a user in a binary market (0 if the indexer
 *  hasn't seen them). Throws if the indexer request fails.
 */
export async function getOutcomeBalances(account, marketAddress, indexerUrl) {
    const acct = account.toLowerCase();
    const mkt = marketAddress.toLowerCase();
    const data = await IndexerRead.gqlRequest(OutcomeBalancesQuery, { acct, mkt }, indexerUrl);
    const yes = data.OutcomeBalance.find((b) => b.outcomeIndex === 0)?.balance ?? "0";
    const no = data.OutcomeBalance.find((b) => b.outcomeIndex === 1)?.balance ?? "0";
    return { yes, no };
}
/**
 *  Pure fold: group an account's open positions + its fills + router actions +
 *  per-market top-of-book into one {@link OpenPositionPnL} per market, reusing the
 *  same avg-cost engine ({@link pnlEventsForIndexed} + {@link computePositionPnL}) as the
 *  per-market `getBinaryPositionPnL`. Fills, router actions and balances all group
 *  by MARKET ID — a binary pool is recycled across successive markets, so the pool
 *  address does not identify which market a fill belongs to. No I/O — the client
 *  method fetches the inputs (batched) and hands them here, which keeps this
 *  unit-testable.
 */
export function computeOpenPositionsPnL(account, positions, fills, routerActions, bookTops) {
    if (positions.length === 0)
        return [];
    // Balances + the market row, keyed by market (a market can hold BOTH YES + NO)
    // and NORMALIZED, like every lookup below — one market's two legs must not
    // split into two output rows over a difference of case.
    const marketById = new Map();
    const balByMarket = new Map();
    for (const p of positions) {
        const id = p.market.id.toLowerCase();
        marketById.set(id, p.market);
        const b = balByMarket.get(id) ?? { yes: 0n, no: 0n };
        if (p.outcomeIndex === 0)
            b.yes = BigInt(p.balance);
        else
            b.no = BigInt(p.balance);
        balByMarket.set(id, b);
    }
    // Fills AND router actions group by market id. Keying fills on the POOL folded
    // a recycled pool's earlier markets into whichever market holds it now (see
    // `FillRow.market`). `pnlEventsForIndexed` applies no market filter, so this
    // grouping is the only thing scoping each market's events.
    const fillsByMarket = new Map();
    for (const f of fills) {
        const key = f.market.toLowerCase();
        const arr = fillsByMarket.get(key);
        if (arr)
            arr.push(f);
        else
            fillsByMarket.set(key, [f]);
    }
    const actionsByMarket = new Map();
    for (const a of routerActions) {
        if (a.market == null)
            continue;
        // Normalized like the fill key: a mint/merge that missed its bucket would
        // drop out of the cost basis entirely.
        const key = a.market.toLowerCase();
        const arr = actionsByMarket.get(key);
        if (arr)
            arr.push(a);
        else
            actionsByMarket.set(key, [a]);
    }
    const out = [];
    for (const [id, market] of marketById) {
        // `id` is already normalized (see marketById above), as are both group keys.
        const marketFills = fillsByMarket.get(id) ?? [];
        const marketActions = actionsByMarket.get(id) ?? [];
        const events = DerivedReads.pnlEventsForIndexed("getOpenPositionsWithPnL", account, marketFills, marketActions);
        const bal = balByMarket.get(id) ?? { yes: 0n, no: 0n };
        const oneCollateral = 10n ** BigInt(market.quoteDecimals);
        const bt = bookTops[id];
        const bookTop = bt
            ? {
                bestBid: bt.bestBid != null ? BigInt(bt.bestBid) : undefined,
                bestAsk: bt.bestAsk != null ? BigInt(bt.bestAsk) : undefined,
            }
            : undefined;
        const pnl = DerivedReads.computePositionPnL(events, { balanceYes: bal.yes, balanceNo: bal.no }, 
        // Normalise PortfolioMarket's optional `winningOutcome` to the required
        // nullable computePositionPnL Picks.
        {
            quoteDecimals: market.quoteDecimals,
            lastPrice: market.lastPrice,
            winningOutcome: market.winningOutcome ?? null,
            voided: market.voided,
            // A void marks against its stored vector, so these must ride along —
            // dropping them here would silently re-impose the old flat half.
            payoutNumerators: market.payoutNumerators ?? null,
            payoutDenominator: market.payoutDenominator ?? null,
        }, oneCollateral, bookTop ? { bookTop } : undefined);
        out.push({ market, ...pnl });
    }
    return out;
}
/**
 *  Default `tradesLimit` for every portfolio read. Shared so the returned
 *  `tradesTruncated` flag cannot disagree with the limit that was used.
 */
export const DEFAULT_TRADES_LIMIT = 50;
/**
 *  Everything needed to render a wallet's binary portfolio: outcome-token
 *  positions (non-zero balances), currently-open orders, and recent fills the
 *  account participated in — matched on the indexed `maker` and `taker` columns.
 *  One round-trip once the registry is warm. The type scope is resolved from a
 *  memoized pool set (a minute's TTL per indexer), so a cold call sends that
 *  look-up first — one extra request for SPOT and PERP, two for BINARY, which is
 *  the complement of both. Throws on indexer failure.
 *
 *  The taker seat used to be matched through the takerOrder relationship, on the
 *  belief that `taker` was not denormalized onto a binary Fill. The indexer
 *  stamps it for every pool type inside the fill's own transaction — see the
 *  `participatedAs` note in `fills.ts` — so the join predicate selected exactly
 *  the same rows while forcing a correlated `EXISTS` per row scanned. On the
 *  development indexer that cost this read ~4.5s for a light wallet against
 *  ~30ms. The takerOrder FIELDS are still selected: `side` and `owner` are what
 *  a taker-seat row reads for its own side and its counterparty.
 */
export async function getPortfolio(account, opts = {}, indexerUrl) {
    return readPortfolio(account, opts, indexerUrl);
}
/** Facade-only scope on the orders leg; the public portfolio contract stays unchanged. */
export async function getScopedOpenOrders(account, opts, indexerUrl, orders) {
    return (await readPortfolio(account, opts, indexerUrl, orders)).openOrders;
}
async function readPortfolio(account, opts = {}, indexerUrl, orders) {
    const positionsLimit = opts.positionsLimit ?? 200;
    const positionsOffset = opts.positionsOffset ?? 0;
    if (!Number.isInteger(positionsLimit) || positionsLimit < 1 || positionsLimit > 1000) {
        throw new InvalidInputError("positionsLimit must be an integer from 1 to 1000");
    }
    if (!Number.isInteger(positionsOffset) || positionsOffset < 0 || positionsOffset > 2_147_483_647 - positionsLimit) {
        throw new InvalidInputError("positionsOffset must be a nonnegative GraphQL Int with room for the page");
    }
    const acct = account.toLowerCase();
    const { since, fillWhere, orderWhere } = await PortfolioScope.portfolioScope("BINARY", acct, opts, indexerUrl, orders);
    const tradesLimit = opts.tradesLimit ?? DEFAULT_TRADES_LIMIT;
    const data = await IndexerRead.gqlRequest(PortfolioQuery, {
        acct,
        fillWhere,
        orderWhere,
        ordersLimit: opts.ordersLimit ?? 200,
        tradesLimit,
        positionsLimit: positionsLimit + 1,
        positionsOffset,
    }, indexerUrl);
    const trades = IndexerRead.narrowIndexerInvariant(data.ClobFill.map((f) => {
        const asMaker = (f.maker ?? "").toLowerCase() === acct;
        return {
            id: f.id,
            fillPrice: f.fillPrice,
            quantity: f.quantity,
            timestamp: f.timestamp,
            txHash: f.txHash,
            asMaker,
            side: asMaker ? f.makerSide : (f.takerOrder?.side ?? null),
            counterparty: asMaker ? (f.takerOrder?.owner ?? null) : (f.maker ?? null),
            market: f.market,
        };
    }));
    return {
        account: acct,
        // Stamp the cadence label onto each position's / order's market (same as
        // trades above) so an ACTIVE position row can show its contract duration
        // ("15m" / "1h") — the reported DEX-1880 gap.
        positions: IndexerRead.narrowIndexerInvariant(data.OutcomeBalance.slice(0, positionsLimit).map((p) => ({
            ...p,
            market: p.market ? { ...p.market, interval: Interval.marketIntervalLabel(p.market) } : null,
        }))),
        positionsTruncated: data.OutcomeBalance.length > positionsLimit,
        positionsNextOffset: data.OutcomeBalance.length > positionsLimit ? positionsOffset + positionsLimit : null,
        openOrders: IndexerRead.narrowIndexerInvariant(data.ClobOrder.map((o) => ({
            ...o,
            market: o.market ? { ...o.market, interval: Interval.marketIntervalLabel(o.market) } : null,
        }))),
        trades,
        // Newest-first page: a FULL page means older fills were dropped, not that trading stopped.
        // `tradesLimit: 0` asks for no trades at all, so an empty list there is complete, not cut.
        tradesTruncated: tradesLimit > 0 && trades.length >= tradesLimit,
        tradesSince: since,
    };
}
/**
 *  Binary market context attached to positions and open orders — selected
 *  identically in both, so it exists once here (aliasing `clobStatus` → `status`
 *  the same way {@link MarketFields} does).
 */
// prettier-ignore
const PortfolioMarketFields = graphql(`
  fragment PortfolioMarketFields on Market {
    id
    marketAddress
    poolAddress
    asset
    question
    status: clobStatus
    lastPrice
    strike
    expiry
    winningOutcome
    voided
    payoutNumerators
    payoutDenominator
    quoteDecimals
    intervalSec
  }
`);
/**
 *  Claimable balance an owner can withdraw from an ERC20Vault (a pool's internal
 *  vault) for `token`, raw units — the value behind the append-only
 *  `VaultPayoutFallback` history.
 *
 *  Reads at chain head unless `blockNumber` pins it.
 */
export async function getVaultBalance(p, client) {
    return client.readContract({
        address: p.vault,
        abi: ReadsAbi.erc20VaultReadAbi,
        functionName: "getWithdrawableBalance",
        args: [p.owner, p.token],
        ...(p.blockNumber === undefined ? {} : { blockNumber: p.blockNumber }),
    });
}
/**
 *  ERC-6909 outcome-token balance of `account` for position `id` on the shared
 *  outcome-token singleton (raw).
 */
export async function getOutcomeBalance(p, client) {
    return client.readContract({
        address: p.outcomeToken,
        abi: ReadsAbi.erc6909Abi,
        functionName: "balanceOf",
        args: [p.account, p.id],
    });
}
/**
 *  An owner's vault-credit fallback history, newest first — optionally scoped to
 *  one token, paginated. The live claimable balance is a chain read
 *  ({@link SomniaMarketsClient.getVaultBalance | client.getVaultBalance}); this is the append-only credit log.
 */
export async function getVaultPayoutFallbacks(owner, opts = {}, indexerUrl) {
    const where = { owner: { _eq: owner.toLowerCase() } };
    if (opts.token != null)
        where.token = { _eq: opts.token.toLowerCase() };
    return queryVaultPayoutFallbacks(where, "desc", opts.limit ?? 50, opts.offset ?? 0, indexerUrl);
}
/**
 *  Vault-credit fallbacks across EVERY owner — the log the `PayoutFallbackToVault`
 *  event writes — filtered by `owner`, `token` and/or `pool`, windowed by
 *  `from`/`to`, paginated.
 *
 *  {@link getVaultPayoutFallbacks} is the per-owner view of the same log. This one
 *  exists for the operator's side of it: an alert or a reconciliation job wants
 *  every credit on a pool, or every credit since a time, without knowing the
 *  owners in advance. Each row carries the `pool` whose vault holds the credit.
 *
 *  **The sort is a TOTAL order** — `timestamp`, then the `id` primary key — so the
 *  sequence is stable between requests. That fixes tie ordering only: the table is
 *  live and append-only, so offset paging is approximate. To follow the log
 *  forward, pass `order: "asc"` with `from` at the last row's timestamp and skip
 *  the ids already seen at that timestamp; the Markets probe does exactly that.
 */
export async function listVaultPayoutFallbacks(opts = {}, indexerUrl) {
    const where = {};
    if (opts.owner != null)
        where.owner = { _eq: opts.owner.toLowerCase() };
    if (opts.token != null)
        where.token = { _eq: opts.token.toLowerCase() };
    // Through the market relationship: the row stores the market id, and the pool
    // is the market's own indexed `poolAddress`.
    if (opts.pool != null)
        where.market = { poolAddress: { _eq: opts.pool.toLowerCase() } };
    const timestamp = {};
    if (opts.from != null)
        timestamp._gte = unixSeconds(opts.from, "from").toString();
    if (opts.to != null)
        timestamp._lt = unixSeconds(opts.to, "to").toString();
    if (Object.keys(timestamp).length > 0)
        where.timestamp = timestamp;
    // Validated BEFORE the request, as listSeriesLatestMarkets does (SDK-IO-005):
    // `??` only replaces null and undefined, and `NaN` and `Infinity` pass it,
    // then `JSON.stringify` turns both into `null`, which Hasura reads as "no
    // limit" - an UNBOUNDED read of every owner's credit log from a read whose
    // whole contract is that it is bounded.
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
        throw new InvalidInputError("Vault payout fallback page limit must be an integer from 1 to 1000");
    }
    if (!Number.isSafeInteger(offset) || offset < 0) {
        throw new InvalidInputError("Vault payout fallback page offset must be a non-negative safe integer");
    }
    return queryVaultPayoutFallbacks(where, opts.order ?? "desc", limit, offset, indexerUrl);
}
/** A time bound as whole, non-negative unix seconds. A `number` that is `NaN`,
 *  infinite, fractional or past 2^53 would be sent as an invalid or inexact
 *  Hasura numeric string and come back as an `IndexerError` blaming the indexer
 *  for the caller's own input. */
function unixSeconds(value, name) {
    const ok = typeof value === "bigint" ? value >= 0n : Number.isSafeInteger(value) && value >= 0;
    if (!ok)
        throw new InvalidInputError(`Vault payout fallback ${name} must be whole, non-negative unix seconds`);
    return value;
}
/** The one query body behind both public reads, so the per-owner view cannot
 *  drift from the operator's. */
async function queryVaultPayoutFallbacks(where, order, limit, offset, indexerUrl) {
    const data = await IndexerRead.gqlRequest(VaultPayoutFallbacksQuery, { where, orderBy: [{ timestamp: order }, { id: order }], limit, offset }, indexerUrl);
    const rows = IndexerRead.narrowIndexerInvariant(data.VaultPayoutFallback);
    return rows.map((row) => ({
        id: row.id,
        owner: row.owner,
        token: row.token,
        amount: row.amount,
        market: row.marketId,
        pool: row.market.poolAddress,
        timestamp: row.timestamp,
        txHash: row.txHash,
    }));
}
// prettier-ignore
const PortfolioQuery = graphql(`
  query Portfolio($acct: String!, $fillWhere: Fill_bool_exp!, $orderWhere: Order_bool_exp!, $ordersLimit: Int, $tradesLimit: Int, $positionsLimit: Int!, $positionsOffset: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    OutcomeBalance(
      where: { account: { _eq: $acct }, balance: { _gt: "0" } }
      order_by: [{ balance: desc }, { id: asc }]
      limit: $positionsLimit
      offset: $positionsOffset
    ) {
      outcomeIndex
      tokenId
      balance
      market {
        ...PortfolioMarketFields
      }
    }
    ClobOrder: Order(
      where: $orderWhere
      order_by: { placedAtTimestamp: desc }
      limit: $ordersLimit
    ) {
      id
      orderId
      side
      price
      quantityRemaining
      filledQuantity
      fullQuantity
      placedAtTimestamp
      placedTxHash
      market {
        ...PortfolioMarketFields
      }
    }
    ClobFill: Fill(where: $fillWhere, order_by: { timestamp: desc }, limit: $tradesLimit) {
      id
      fillPrice
      quantity
      timestamp
      txHash
      maker
      makerSide
      takerOrder {
        owner
        side
      }
      market {
        marketAddress
        asset
        quoteDecimals
      }
    }
  }
`);
// prettier-ignore
const OutcomeBalancesQuery = graphql(`
  query OutcomeBalances($acct: String!, $mkt: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
        OutcomeBalance(where: {account: {_eq: $acct}, market: {marketAddress: {_eq: $mkt}}}) { outcomeIndex balance }
      }
`);
// prettier-ignore
const VaultPayoutFallbacksQuery = graphql(`
  query VaultPayoutFallbacks($where: VaultPayoutFallback_bool_exp!, $orderBy: [VaultPayoutFallback_order_by!], $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         VaultPayoutFallback(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
           id owner token amount marketId: market_id market { poolAddress } timestamp txHash
         }
       }
`);
