// Binary holdings — outcome-token balances and the portfolio view over them.
//
// BINARY-ONLY: positions are ERC-6909 outcome tokens (one id per market per side)
// plus vault credit for payouts that could not be pushed. Spot holds plain
// ERC-20s (see balances.ts) and perp holds margin (perp/margin.ts) — different
// accounting, different contracts.

import type { Address, PublicClient } from "viem";
import * as IndexerRead from "../indexerRead.js";
import * as PortfolioScope from "../portfolioScope.js";
import * as Interval from "../interval.js";
import { graphql } from "../gql/gql.js";
import * as ReadsAbi from "../readsAbi.js";
import type { OpenOrder, BookTop } from "../orders.js";
import type { FillRow } from "../fills.js";
import type { RouterActionRecord } from "../router.js";
import type { YesBookTop } from "../units.js";
import type { BinaryPositionPnL, ClaimablePosition } from "../derivedReads.js";
import * as DerivedReads from "../derivedReads.js";
import type { BinaryMarketStatus } from "../store.js";
import { InvalidInputError } from "../errors.js";

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
export async function getOutcomeBalances(
  account: string,
  marketAddress: string,
  indexerUrl: IndexerRead.Source,
): Promise<OutcomeBalances> {
  const acct = account.toLowerCase();
  const mkt = marketAddress.toLowerCase();
  const data = await IndexerRead.gqlRequest(OutcomeBalancesQuery, { acct, mkt }, indexerUrl);
  const yes = data.OutcomeBalance.find((b) => b.outcomeIndex === 0)?.balance ?? "0";
  const no = data.OutcomeBalance.find((b) => b.outcomeIndex === 1)?.balance ?? "0";
  return { yes, no };
}

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
export function computeOpenPositionsPnL(
  account: string,
  positions: PortfolioPosition[],
  fills: FillRow[],
  routerActions: RouterActionRecord[],
  bookTops: Record<string, BookTop>,
): OpenPositionPnL[] {
  if (positions.length === 0) return [];

  // Balances + the market row, keyed by market (a market can hold BOTH YES + NO)
  // and NORMALIZED, like every lookup below — one market's two legs must not
  // split into two output rows over a difference of case.
  const marketById = new Map<string, PortfolioMarket>();
  const balByMarket = new Map<string, { yes: bigint; no: bigint }>();
  for (const p of positions) {
    const id = p.market.id.toLowerCase();
    marketById.set(id, p.market);
    const b = balByMarket.get(id) ?? { yes: 0n, no: 0n };
    if (p.outcomeIndex === 0) b.yes = BigInt(p.balance);
    else b.no = BigInt(p.balance);
    balByMarket.set(id, b);
  }

  // Fills AND router actions group by market id. Keying fills on the POOL folded
  // a recycled pool's earlier markets into whichever market holds it now (see
  // `FillRow.market`). `pnlEventsForIndexed` applies no market filter, so this
  // grouping is the only thing scoping each market's events.
  const fillsByMarket = new Map<string, FillRow[]>();
  for (const f of fills) {
    const key = f.market.toLowerCase();
    const arr = fillsByMarket.get(key);
    if (arr) arr.push(f);
    else fillsByMarket.set(key, [f]);
  }
  const actionsByMarket = new Map<string, RouterActionRecord[]>();
  for (const a of routerActions) {
    if (a.market == null) continue;
    // Normalized like the fill key: a mint/merge that missed its bucket would
    // drop out of the cost basis entirely.
    const key = a.market.toLowerCase();
    const arr = actionsByMarket.get(key);
    if (arr) arr.push(a);
    else actionsByMarket.set(key, [a]);
  }

  const out: OpenPositionPnL[] = [];
  for (const [id, market] of marketById) {
    // `id` is already normalized (see marketById above), as are both group keys.
    const marketFills = fillsByMarket.get(id) ?? [];
    const marketActions = actionsByMarket.get(id) ?? [];
    const events = DerivedReads.pnlEventsForIndexed("getOpenPositionsWithPnL", account, marketFills, marketActions);
    const bal = balByMarket.get(id) ?? { yes: 0n, no: 0n };
    const oneCollateral = 10n ** BigInt(market.quoteDecimals);
    const bt = bookTops[id];
    const bookTop: YesBookTop | undefined = bt
      ? {
          bestBid: bt.bestBid != null ? BigInt(bt.bestBid) : undefined,
          bestAsk: bt.bestAsk != null ? BigInt(bt.bestAsk) : undefined,
        }
      : undefined;
    const pnl = DerivedReads.computePositionPnL(
      events,
      { balanceYes: bal.yes, balanceNo: bal.no },
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
      },
      oneCollateral,
      bookTop ? { bookTop } : undefined,
    );
    out.push({ market, ...pnl });
  }
  return out;
}

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
export const DEFAULT_TRADES_LIMIT = 50;

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
export async function getPortfolio(
  account: string,
  opts: PortfolioOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<Portfolio> {
  return readPortfolio(account, opts, indexerUrl);
}

/** Facade-only scope on the orders leg; the public portfolio contract stays unchanged. */
export async function getScopedOpenOrders(
  account: string,
  opts: PortfolioOptions,
  indexerUrl: IndexerRead.Source,
  orders: PortfolioScope.OrderScope,
): Promise<Portfolio["openOrders"]> {
  return (await readPortfolio(account, opts, indexerUrl, orders)).openOrders;
}

async function readPortfolio(
  account: string,
  opts: PortfolioOptions = {},
  indexerUrl: IndexerRead.Source,
  orders?: PortfolioScope.OrderScope,
): Promise<Portfolio> {
  const positionsLimit = opts.positionsLimit ?? 200;
  const positionsOffset = opts.positionsOffset ?? 0;
  if (!Number.isInteger(positionsLimit) || positionsLimit < 1 || positionsLimit > 1000) {
    throw new InvalidInputError("positionsLimit must be an integer from 1 to 1000");
  }
  if (!Number.isInteger(positionsOffset) || positionsOffset < 0 || positionsOffset > 2_147_483_647 - positionsLimit) {
    throw new InvalidInputError("positionsOffset must be a nonnegative GraphQL Int with room for the page");
  }
  const acct = account.toLowerCase();
  const { since, fillWhere, orderWhere } = await PortfolioScope.portfolioScope(
    "BINARY",
    acct,
    opts,
    indexerUrl,
    orders,
  );
  const tradesLimit = opts.tradesLimit ?? DEFAULT_TRADES_LIMIT;
  const data = await IndexerRead.gqlRequest(
    PortfolioQuery,
    {
      acct,
      fillWhere,
      orderWhere,
      ordersLimit: opts.ordersLimit ?? 200,
      tradesLimit,
      positionsLimit: positionsLimit + 1,
      positionsOffset,
    },
    indexerUrl,
  );

  const trades: PortfolioTrade[] = IndexerRead.narrowIndexerInvariant(
    data.ClobFill.map((f) => {
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
    }),
  );

  return {
    account: acct,
    // Stamp the cadence label onto each position's / order's market (same as
    // trades above) so an ACTIVE position row can show its contract duration
    // ("15m" / "1h") — the reported DEX-1880 gap.
    positions: IndexerRead.narrowIndexerInvariant<PortfolioPosition>(
      data.OutcomeBalance.slice(0, positionsLimit).map((p) => ({
        ...p,
        market: p.market ? { ...p.market, interval: Interval.marketIntervalLabel(p.market) } : null,
      })),
    ),
    positionsTruncated: data.OutcomeBalance.length > positionsLimit,
    positionsNextOffset: data.OutcomeBalance.length > positionsLimit ? positionsOffset + positionsLimit : null,
    openOrders: IndexerRead.narrowIndexerInvariant<PortfolioOrder>(
      data.ClobOrder.map((o) => ({
        ...o,
        market: o.market ? { ...o.market, interval: Interval.marketIntervalLabel(o.market) } : null,
      })),
    ),
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
export async function getVaultBalance(p: GetVaultBalanceParams, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: p.vault,
    abi: ReadsAbi.erc20VaultReadAbi,
    functionName: "getWithdrawableBalance",
    args: [p.owner, p.token],
    ...(p.blockNumber === undefined ? {} : { blockNumber: p.blockNumber }),
  });
}

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
export async function getOutcomeBalance(p: GetOutcomeBalanceParams, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: p.outcomeToken,
    abi: ReadsAbi.erc6909Abi,
    functionName: "balanceOf",
    args: [p.account, p.id],
  });
}

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
export async function getVaultPayoutFallbacks(
  owner: string,
  opts: { token?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<VaultPayoutFallback[]> {
  const where: Record<string, unknown> = { owner: { _eq: owner.toLowerCase() } };
  if (opts.token != null) where.token = { _eq: opts.token.toLowerCase() };
  return queryVaultPayoutFallbacks(where, "desc", opts.limit ?? 50, opts.offset ?? 0, indexerUrl);
}

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
export async function listVaultPayoutFallbacks(
  opts: ListVaultPayoutFallbacksOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<VaultPayoutFallback[]> {
  const where: Record<string, unknown> = {};
  if (opts.owner != null) where.owner = { _eq: opts.owner.toLowerCase() };
  if (opts.token != null) where.token = { _eq: opts.token.toLowerCase() };
  // Through the market relationship: the row stores the market id, and the pool
  // is the market's own indexed `poolAddress`.
  if (opts.pool != null) where.market = { poolAddress: { _eq: opts.pool.toLowerCase() } };
  const timestamp: Record<string, string> = {};
  if (opts.from != null) timestamp._gte = unixSeconds(opts.from, "from").toString();
  if (opts.to != null) timestamp._lt = unixSeconds(opts.to, "to").toString();
  if (Object.keys(timestamp).length > 0) where.timestamp = timestamp;
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
function unixSeconds(value: number | bigint, name: "from" | "to"): number | bigint {
  const ok = typeof value === "bigint" ? value >= 0n : Number.isSafeInteger(value) && value >= 0;
  if (!ok) throw new InvalidInputError(`Vault payout fallback ${name} must be whole, non-negative unix seconds`);
  return value;
}

/** The one query body behind both public reads, so the per-owner view cannot
 *  drift from the operator's. */
async function queryVaultPayoutFallbacks(
  where: Record<string, unknown>,
  order: "asc" | "desc",
  limit: number,
  offset: number,
  indexerUrl: IndexerRead.Source,
): Promise<VaultPayoutFallback[]> {
  const data = await IndexerRead.gqlRequest(
    VaultPayoutFallbacksQuery,
    { where, orderBy: [{ timestamp: order }, { id: order }], limit, offset },
    indexerUrl,
  );
  // Hasura types the `market` relationship nullable, but the indexer writes this
  // row from a Market it has already loaded and the owning `market_id` is
  // `String!`, so it always resolves. Narrowed through the named seam rather
  // than defaulted: a fabricated `pool: ""` would be an unusable vault address
  // and an empty metric label, silently.
  type Row = (typeof data.VaultPayoutFallback)[number];
  const rows = IndexerRead.narrowIndexerInvariant<Row & { market: NonNullable<Row["market"]> }>(
    data.VaultPayoutFallback,
  );
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
