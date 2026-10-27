// Router actions — the CollateralRouter's action history.
//
// The router is the periphery that adds native (wrap/unwrap) and Permit2 entry
// ergonomics over the module's plain-ERC-20 flows. Its actions are indexed as
// their own entity, so this is where a caller reconstructs "how did this user
// enter/exit" independently of the pool-level fills.
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
// prettier-ignore
const RouterActionFields = graphql(`
  fragment RouterActionFields on RouterActionRecord {
    id
    kind
    account
    market: market_id
    amount
    payout
    routedVia
    timestamp
    txHash
  }
`);
/**
 *  An account's RouterMinter action history (redeem / mint / merge), newest
 *  first — optionally scoped to one market (or several via `markets`) and/or
 *  kind, paginated.
 *
 *  Mint and merge change a position's cost basis, so a PnL fold must scope this
 *  read the same way it scopes its fills: an account-wide capped read drops the
 *  OLDEST rows first, which are the ones that establish the basis.
 */
export async function getRouterActions(account, opts = {}, indexerUrl) {
    const where = { account: { _eq: account.toLowerCase() } };
    const marketId = {};
    if (opts.market != null)
        marketId._eq = opts.market.toLowerCase();
    if (opts.markets != null)
        marketId._in = opts.markets.map((m) => m.toLowerCase());
    if (Object.keys(marketId).length)
        where.market_id = marketId;
    if (opts.kind != null)
        where.kind = { _eq: opts.kind };
    const data = await IndexerRead.gqlRequest(RouterActionsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    // `kind` is a plain `String!` column narrowed to RouterActionKind — the handlers
    // only ever write "Redeem" | "MintCompleteSet" | "MergeCompleteSet" (see
    // indexer/src/handlers/binary.ts). Asserted, not schema-proven.
    return IndexerRead.narrowIndexerInvariant(data.RouterActionRecord);
}
// prettier-ignore
const RouterActionsQuery = graphql(`
  query RouterActions($where: RouterActionRecord_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         RouterActionRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...RouterActionFields }
       }
`);
