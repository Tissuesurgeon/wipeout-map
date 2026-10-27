// The `where`s a portfolio read sends and the bound they carry — shared machinery for
// the spot, perp and binary portfolio reads, which differ only in the market type they
// scope to. Built once here so the three cannot drift apart.

import type * as IndexerRead from "./indexerRead.js";
import * as Pools from "./pools.js";
import type * as Markets from "./markets.js";
import type { PortfolioOptions } from "./binary/portfolio.js";

/**
 *  Default lower time bound for every portfolio read's trades leg: the last seven days.
 *
 *  The trades leg scopes a wallet's fills to one market type by pool set. That is fast
 *  when the wallet's fills are dense in the requested type and slow when they are sparse:
 *  a spot market-maker asking for its BINARY fills walks every fill it has, rejecting each,
 *  before it can return nothing. Measured on the development indexer: 24.8s unbounded,
 *  208ms bounded to a week. A bound is the only shape that is fast for every wallet
 *  without a schema change, so it is the default rather than an option — the SDK's
 *  standing position on wallet-scoped trade history. Pass `since` to widen it.
 */
export const DEFAULT_TRADES_SINCE_SEC = 7 * 86_400;

/** Facade-only predicates on the portfolio orders leg. */
export interface OrderScope {
  marketId: string;
  outcome?: "YES" | "NO";
}

/**
 *  The trades `where`, the open-orders `where`, and the bound the trades leg was read
 *  with, for a portfolio read of one market type. Scoped by pool set, never by the
 *  `market` relationship (a correlated EXISTS per row — see pools.ts, "type scope, as
 *  pools"). The pool set is memoized, so after the first call this adds no round-trip.
 */
export async function portfolioScope(
  type: Markets.MarketType,
  acct: string,
  opts: PortfolioOptions,
  indexerUrl: IndexerRead.Source,
  orders?: OrderScope,
): Promise<{ since: number; fillWhere: Record<string, unknown>; orderWhere: Record<string, unknown> }> {
  const scope = await Pools.poolScope(type, indexerUrl);
  const since = opts.since ?? Math.floor(Date.now() / 1000) - DEFAULT_TRADES_SINCE_SEC;
  const orderWhere: Record<string, unknown> = {
    owner: { _eq: acct },
    status: { _eq: "Open" },
    market_id: scope,
  };
  if (orders !== undefined) {
    orderWhere._and = [{ market_id: { _eq: orders.marketId.toLowerCase() } }];
    if (orders.outcome === "YES") {
      // Legacy null sides resolve to the market's default YES tradable.
      orderWhere._or = [{ side: { _in: ["BUY_YES", "SELL_YES"] } }, { side: { _is_null: true } }];
    } else if (orders.outcome === "NO") {
      orderWhere.side = { _in: ["BUY_NO", "SELL_NO"] };
    }
  }
  return {
    since,
    fillWhere: { pool: scope, _or: [{ maker: { _eq: acct } }, { taker: { _eq: acct } }], timestamp: { _gte: since } },
    orderWhere,
  };
}
