import type { Address, PublicClient } from "viem";
import * as IndexerRead from "../indexerRead.js";
import * as PortfolioScope from "../portfolioScope.js";
import type { OpenOrder, BookTop } from "../orders.js";
import type { FillRow } from "../fills.js";
import type { RouterActionRecord } from "../router.js";
import type { BinaryPositionPnL, ClaimablePosition } from "../derivedReads.js";
import type { BinaryMarketStatus } from "../store.js";
/**
 *  A user's indexed YES/NO outcome-token balances in one binary market. Raw
 *  outcome-token units (same decimals as the market's collateral); "0" when the
 *  indexer has never seen the account touch that side.
 *
 * @category binary markets
 */
export type OutcomeBalances = {
    /** Raw YES balance ("0" if never held). */
    yes: string;
    /** Raw NO balance ("0" if never held). */
    no: string;
};
/**
 *  YES + NO indexed balances for a user in a binary market (0 if the indexer
 *  hasn't seen them). Throws if the indexer request fails.
 */
export declare function getOutcomeBalances(account: string, marketAddress: string, indexerUrl: IndexerRead.Source): Promise<OutcomeBalances>;
/**
 * A market context attached to portfolio rows (subset of {@link BinaryMarket}).
 *
 * @category binary markets
 */
export type PortfolioMarket = {
    /**
     *  The market's bytes32 marketId (== `BinaryMarket.id`). Key positions by this,
     *  never by `poolAddress` alone (a pool is recycled across markets).
     */
    id: string;
    /** The BinaryMarket clone contract's address (lowercased). */
    marketAddress: string;
    /** The pool serving the market (lowercased; a time-varying binding — see `id`). */
    poolAddress: string;
    /** Underlying asset symbol (e.g. "BTC"). */
    asset: string;
    /** Display question text. */
    question: string;
    /** Lifecycle status (aliased from the indexer's `clobStatus`). */
    status: BinaryMarketStatus;
    /** Last fill price (raw, ≈ YES probability × 10^quoteDecimals); null until first fill. */
    lastPrice: string | null;
    /** Strike the question resolves against (raw, oracle price scale). */
    strike: string;
    /** Timestamp (unix seconds) trading ends. */
    expiry: string;
    /** Winning outcome (0 = YES, 1 = NO); null until Resolved / on a void. */
    winningOutcome?: number | null;
    /**
     *  True once the market voided. A void redeems against
     *  {@link PortfolioMarket.payoutNumerators} — a half per side under the
     *  `UNIFORM` void policy, `[p, D−p]` on a `CLOB_SNAPSHOT` void that captured
     *  a two-sided close.
     */
    voided: boolean;
    /**
     *  Per-outcome payout numerators the market settled to (decimal strings);
     *  what a void actually pays. Null until Resolved / on markets indexed before
     *  the vector fields existed.
     */
    payoutNumerators?: string[] | null;
    /** Denominator the numerators are scaled against (decimal string); null with them. */
    payoutDenominator?: string | null;
    /**
     *  Collateral decimals (per-market — collateral is per-venue, e.g. 6dp
     *  TestUSDC vs 18dp USDso). Format prices/balances with this, never a
     *  hard-coded 6. Outcome-token amounts mirror the same decimals.
     */
    quoteDecimals: number;
    /** Series cadence in seconds, as the indexer derived it; null on legacy rows. */
    intervalSec: string | null;
    /**
     *  Compact series-cadence label ("15m" / "1h" / "4h" / "24h") — DERIVED by the
     *  SDK from {@link PortfolioMarket.intervalSec}, so a positions/orders row can
     *  show the contract duration without re-deriving it. `null` when unknown.
     */
    interval: string | null;
};
/**
 * One outcome-token position in a wallet's binary portfolio.
 *
 * @category binary markets
 */
export type PortfolioPosition = {
    /** The market the position is in. */
    market: PortfolioMarket;
    /** 0 = YES, 1 = NO. */
    outcomeIndex: number;
    /** ERC-6909 position id on the outcome-token singleton (decimal string). */
    tokenId: string;
    /** Raw outcome-token balance. */
    balance: string;
};
/**
 *  An open binary position joined with its reliable avg-cost PnL — the batched,
 *  positions-list companion to `getBinaryPositionPnL` (which is per market).
 *  `costBasis` / `avgCost` / `markValue` / `unrealizedPnl` / `realizedPnl` are
 *  RAW collateral units; format with `market.quoteDecimals`.
 *
 *  Those fields are BLENDED across both outcomes; the inherited `outcomes` pair
 *  carries each book on its own.
 *
 * @category binary markets
 */
export type OpenPositionPnL = BinaryPositionPnL & {
    /** The market the position is in (id / addresses / quoteDecimals / status / …). */
    market: PortfolioMarket;
};
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
export declare function computeOpenPositionsPnL(account: string, positions: PortfolioPosition[], fills: FillRow[], routerActions: RouterActionRecord[], bookTops: Record<string, BookTop>): OpenPositionPnL[];
/**
 * One currently-open order in a wallet's binary portfolio.
 *
 * @category binary markets
 */
export type PortfolioOrder = {
    /** Order id (`${pool}_${orderId}`). */
    id: string;
    /** uint128 OrderId as a decimal string (pass to trader.cancelOrder). */
    orderId: string;
    /** YES/NO classification of the order. */
    side: OpenOrder["side"];
    /** Limit price, raw quote units (YES-probability scale). */
    price: string;
    /** Unfilled remainder, raw outcome units. */
    quantityRemaining: string;
    /** Cumulative filled quantity, raw outcome units. */
    filledQuantity: string;
    /** Original order size, raw outcome units. */
    fullQuantity: string;
    /** Timestamp (unix seconds) the order was placed. */
    placedAtTimestamp: string;
    /** Tx hash the order was placed in. */
    placedTxHash: string;
    /** The market the order rests on. */
    market: PortfolioMarket;
};
/**
 * One recent fill the wallet participated in (binary portfolio view).
 *
 * @category binary markets
 */
export type PortfolioTrade = {
    /** Fill id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** Execution price, raw quote units (YES-probability scale). */
    fillPrice: string;
    /** Outcome-token quantity filled, raw units. */
    quantity: string;
    /** Timestamp (unix seconds) of the fill. */
    timestamp: string;
    /** Tx hash the fill landed in. */
    txHash: string;
    /** The queried account's side on this fill (maker or taker side), if known. */
    side: OpenOrder["side"] | null;
    /** Whether the account was the maker (resting) on this fill. */
    asMaker: boolean;
    /** The other party's address, if known. */
    counterparty: string | null;
    /** Minimal market context for rendering the trade row. */
    market: {
        /** The BinaryMarket clone contract's address (lowercased). */
        marketAddress: string;
        /** Underlying asset symbol (e.g. "BTC"). */
        asset: string;
        /** Collateral decimals — format `fillPrice`/`quantity` with this. */
        quoteDecimals: number;
        /** Series cadence in seconds, as the indexer derived it; null on legacy rows. */
        intervalSec: string | null;
        /**
         *  Human timeframe label — `"15m"` / `"1h"` / `"4h"` / `"24h"` — DERIVED by
         *  the SDK from `intervalSec` (falling back to `expiry − tradingStart`) and
         *  snapped to its canonical unit. The "which timeframe was the trade for"
         *  value. Null when no cadence is determinable.
         */
        interval: string | null;
        /** Unix seconds trading opened; null on legacy rows. */
        tradingStart: string | null;
        /** Unix seconds trading ends / the outcome is decided; null on legacy rows. */
        expiry: string | null;
    };
};
/**
 * A wallet's binary portfolio — the shape {@link SomniaMarketsClient.getPortfolio} returns.
 *
 * @category binary markets
 */
export type Portfolio = {
    /** The queried account (lowercased). */
    account: string;
    /** Non-zero positions on this page, largest balance first; ties use row id. */
    positions: PortfolioPosition[];
    /** True when another nonzero position exists after this page. */
    positionsTruncated: boolean;
    /** Next raw-position offset, or null when this page reaches the end. */
    positionsNextOffset: number | null;
    /** Currently-open binary orders, newest first. */
    openOrders: PortfolioOrder[];
    /** Recent binary fills the account participated in, newest first. */
    trades: PortfolioTrade[];
    /**
     *  The read hit its `tradesLimit`, so fills older than the last entry in `trades` exist
     *  and were NOT returned. Raise `tradesLimit` for the rest.
     *  A total folded from a truncated `trades` covers part of the history only.
     *  False when the page was short, and false for `tradesLimit: 0`, which asks for
     *  no trades at all.
     */
    tradesTruncated: boolean;
    /**
     *  The lower time bound the trades leg was read with, unix seconds — `since` when
     *  passed, otherwise now minus seven days (`DEFAULT_TRADES_SINCE_SEC`). Echoed so a UI can
     *  label the list and a caller can page further back. Positions and orders are not windowed.
     */
    tradesSince: number;
};
/**
 *  Default `tradesLimit` for every portfolio read. Shared so the returned
 *  `tradesTruncated` flag cannot disagree with the limit that was used.
 */
export declare const DEFAULT_TRADES_LIMIT = 50;
/**
 * Bounded position paging for {@link SomniaMarketsClient.getClaimablePage}.
 * Offsets count all nonzero positions, not only returned claims.
 *
 * @category binary markets
 */
export type GetClaimablePageOptions = {
    /** Nonzero positions to inspect, including losers and open markets. Default 200; integer 1–1000. */
    limit?: number;
    /** Raw-position offset. Default 0; nonnegative integer within GraphQL Int range with room for the page. */
    offset?: number;
};
/**
 * One bounded indexed claimable page. Continue even when `claims` is empty if
 * `nextOffset` is present. Offset paging is not a pinned snapshot: balance changes
 * between calls can move rows, so refresh before submitting redemptions.
 *
 * @category binary markets
 */
export type ClaimablePage = {
    /** Redeemable winners and void positions within the inspected position page. */
    claims: ClaimablePosition[];
    /** Next raw-position offset, or null when no further position was observed. */
    nextOffset: number | null;
};
/** Paging and trade-window options for the indexed portfolios. */
export type PortfolioOptions = {
    /** Binary nonzero positions per page. Default 200; integer 1–1000. Ignored by spot/perp. */
    positionsLimit?: number;
    /** Binary raw-position offset. Default 0; same range as {@link GetClaimablePageOptions.offset}. Ignored by spot/perp. */
    positionsOffset?: number;
    /**
     *  Max open orders to fetch (default 200).
     *
     *  On SPOT this ALSO bounds `pendingStopOrders`: the spot query binds one
     *  limit variable to both sets, so a small value here shortens the stop-order
     *  list too, not just the open orders you asked about.
     */
    ordersLimit?: number;
    /**
     *  Max recent trades to fetch (default 50).
     *
     *  The reads page newest-first, so this cap drops the OLDEST fills. Check
     *  `tradesTruncated` on the returned portfolio to see whether it did: the flag is
     *  true when `trades.length` reaches this limit.
     */
    tradesLimit?: number;
    /**
     *  Only trades at/after this unix-seconds timestamp. Defaults to now minus seven
     *  days (`DEFAULT_TRADES_SINCE_SEC`) — see that constant for why a bound is always
     *  applied. The bound actually used comes back as `tradesSince`.
     */
    since?: number;
};
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
export declare function getPortfolio(account: string, opts: PortfolioOptions | undefined, indexerUrl: IndexerRead.Source): Promise<Portfolio>;
/** Facade-only scope on the orders leg; the public portfolio contract stays unchanged. */
export declare function getScopedOpenOrders(account: string, opts: PortfolioOptions, indexerUrl: IndexerRead.Source, orders: PortfolioScope.OrderScope): Promise<Portfolio["openOrders"]>;
/**
 * Identifies one owner's claimable balance in one pool vault — see {@link SomniaMarketsClient.getVaultBalance | client.getVaultBalance}.
 *
 * @category binary markets
 */
export interface GetVaultBalanceParams {
    /** The ERC20Vault address (the pool address). */
    vault: Address;
    /** The balance's owner. */
    owner: Address;
    /** The ERC-20 address (or the vault's native sentinel). */
    token: Address;
    /**
     *  Read the balance as of this block instead of at head.
     *
     *  For an answer that combines this balance with other reads at one height: the
     *  withdrawable balance is contract state behind an append-only payout history, so
     *  there is no indexed entity to reconstruct it from at a past height, and serving
     *  this half at head would silently mix heights inside one response.
     *
     *  A recent block answers against a full node. An old one needs ARCHIVE state, and
     *  a node without it rejects the read rather than returning a wrong number.
     */
    blockNumber?: bigint;
}
/**
 *  Claimable balance an owner can withdraw from an ERC20Vault (a pool's internal
 *  vault) for `token`, raw units — the value behind the append-only
 *  `VaultPayoutFallback` history.
 *
 *  Reads at chain head unless `blockNumber` pins it.
 */
export declare function getVaultBalance(p: GetVaultBalanceParams, client: PublicClient): Promise<bigint>;
/**
 * Identifies one ERC-6909 outcome position — see `getOutcomeBalance`.
 *
 * @category binary markets
 */
export interface GetOutcomeBalanceParams {
    /** The outcome-token singleton address (from `MarketOnchain`). */
    outcomeToken: Address;
    /** The balance's owner. */
    account: Address;
    /** The position id — the market's `yesId`/`noId`. */
    id: bigint;
}
/**
 *  ERC-6909 outcome-token balance of `account` for position `id` on the shared
 *  outcome-token singleton (raw).
 */
export declare function getOutcomeBalance(p: GetOutcomeBalanceParams, client: PublicClient): Promise<bigint>;
/**
 *  A vault-credit fallback record (mirror of the indexer `VaultPayoutFallback`
 *  entity) — an append-only history of payouts that could not be delivered to
 *  the wallet and were credited to the owner's ERC20Vault balance instead. This
 *  is the HISTORY layer; for the live claimable amount read
 *  {@link SomniaMarketsClient.getVaultBalance | client.getVaultBalance}. Amounts are raw token units.
 *
 * @category binary markets
 */
export type VaultPayoutFallback = {
    /** Record id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** Credited owner (lowercased). */
    owner: string;
    /** Credited token (lowercased). */
    token: string;
    /** Amount credited to the vault balance (raw token units). */
    amount: string;
    /** Market id the fallback was emitted for (lowercased). */
    market: string;
    /**
     *  The pool that emitted the credit (lowercased): the market's pool address,
     *  which on SPOT is also the market id. The credit sits in THIS pool's vault,
     *  so it is the `vault` to pass to
     *  {@link SomniaMarketsClient.getVaultBalance | client.getVaultBalance}.
     */
    pool: string;
    /** Timestamp (unix seconds) of the credit. */
    timestamp: string;
    /** Tx hash the credit landed in. */
    txHash: string;
};
/**
 *  An owner's vault-credit fallback history, newest first — optionally scoped to
 *  one token, paginated. The live claimable balance is a chain read
 *  ({@link SomniaMarketsClient.getVaultBalance | client.getVaultBalance}); this is the append-only credit log.
 */
export declare function getVaultPayoutFallbacks(owner: string, opts: {
    token?: string;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<VaultPayoutFallback[]>;
/**
 *  Filters, time window and pagination for
 *  {@link SomniaMarketsClient.listVaultPayoutFallbacks | client.listVaultPayoutFallbacks}.
 *
 *  Named rather than inline because the shape is declared twice - here and on
 *  the client member - and SDK-TYPE-005 exists so the two cannot drift.
 *
 * @category binary markets
 */
export interface ListVaultPayoutFallbacksOptions {
    /** Credited owner. Case-insensitive: lowercased before the query. */
    owner?: string;
    /** Credited token. Case-insensitive: lowercased before the query. */
    token?: string;
    /** The pool that emitted the credit. Case-insensitive: lowercased before the query. */
    pool?: string;
    /** Unix seconds, INCLUSIVE: rows at or after this time. Whole and non-negative. */
    from?: number | bigint;
    /** Unix seconds, EXCLUSIVE: rows before this time. Whole and non-negative. */
    to?: number | bigint;
    /**
     *  `"desc"` (the default) returns the NEWEST `limit` rows in the window. Pass
     *  `"asc"` to walk FORWARD from `from`; that is the mode a cursor needs, because
     *  under `"desc"` narrowing `from` changes the window, not which end a page
     *  comes from.
     */
    order?: "asc" | "desc";
    /** Rows per page, an integer from 1 to 1000. Defaults to 50. */
    limit?: number;
    /** Rows to skip, a non-negative safe integer. Defaults to 0. */
    offset?: number;
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
export declare function listVaultPayoutFallbacks(opts: ListVaultPayoutFallbacksOptions | undefined, indexerUrl: IndexerRead.Source): Promise<VaultPayoutFallback[]>;
