// Router actions — the CollateralRouter's action history.
//
// The router is the periphery that adds native (wrap/unwrap) and Permit2 entry
// ergonomics over the module's plain-ERC-20 flows. Its actions are indexed as
// their own entity, so this is where a caller reconstructs "how did this user
// enter/exit" independently of the pool-level fills.

import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";

// ============================================================================
// Router action history · resolution visibility · fee streams · builder-approval
// directory · vault-credit history · perp/funding history. These are all
// INDEXER reads (the coverage-gaps entities the indexer upserts) — history +
// directory surfaces the point reads / live tail don't cover. Field/entity
// names track the indexer schema exactly (see .notes/COVERAGE-SPEC.md Part A);
// venueId/address filters lowercase their value, unit conventions are RAW
// (bigints as strings), like every other read in this file.
// ============================================================================

/**
 *  Kinds of `RouterMinter` action the indexer records (mirror of the indexer
 *  RouterActionRecord.kind enum).
 *
 * @category routing
 */
export type RouterActionKind = "Redeem" | "MintCompleteSet" | "MergeCompleteSet";

/**
 *  One RouterMinter action for an account (mirror of the indexer
 *  `RouterActionRecord` entity). Amounts are raw collateral/outcome units.
 *
 * @category routing
 */
export type RouterActionRecord = {
  /** Record id (`${blockNumber}_${logIndex}`). */
  id: string;
  /** Redeem | MintCompleteSet | MergeCompleteSet. */
  kind: RouterActionKind;
  /** Acting wallet (lowercased). */
  account: string;
  /** Binary market id the action targeted (lowercased bytes32); null if unlinked. */
  market: string | null;
  /**
   *  Redeem: winning tokens burned; Mint/Merge: amount of EACH outcome minted /
   *  merged (a complete set). Raw outcome-token units.
   */
  amount: string;
  /** Collateral paid out (Redeem); null on Mint/Merge. Raw units. */
  payout: string | null;
  /**
   *  Periphery entry the flow routed through (NativeMint | Permit2Mint |
   *  NativeRedeem); null on a direct module call.
   */
  routedVia: string | null;
  /** Timestamp (unix seconds) of the action. */
  timestamp: string;
  /** Tx hash the action landed in. */
  txHash: string;
};

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
 * Options for {@link SomniaMarketsClient.getRouterActions}. All optional.
 *
 * @category routing
 */
export type RouterActionsOptions = {
  /** Only actions in this market (bytes32 marketId, case-insensitive). */
  market?: string;
  /**
   *  Only actions in ANY of these markets — the batched form of `market`.
   *  Supplying both narrows to the intersection. An empty array matches nothing.
   */
  markets?: readonly string[];
  /** Only this action kind. */
  kind?: RouterActionKind;
  /** Max rows (default 50). */
  limit?: number;
  /** Row offset (default 0). */
  offset?: number;
};

/**
 *  An account's RouterMinter action history (redeem / mint / merge), newest
 *  first — optionally scoped to one market (or several via `markets`) and/or
 *  kind, paginated.
 *
 *  Mint and merge change a position's cost basis, so a PnL fold must scope this
 *  read the same way it scopes its fills: an account-wide capped read drops the
 *  OLDEST rows first, which are the ones that establish the basis.
 */
export async function getRouterActions(
  account: string,
  opts: RouterActionsOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<RouterActionRecord[]> {
  const where: Record<string, unknown> = { account: { _eq: account.toLowerCase() } };
  const marketId: Record<string, unknown> = {};
  if (opts.market != null) marketId._eq = opts.market.toLowerCase();
  if (opts.markets != null) marketId._in = opts.markets.map((m) => m.toLowerCase());
  if (Object.keys(marketId).length) where.market_id = marketId;
  if (opts.kind != null) where.kind = { _eq: opts.kind };
  const data = await IndexerRead.gqlRequest(
    RouterActionsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  // `kind` is a plain `String!` column narrowed to RouterActionKind — the handlers
  // only ever write "Redeem" | "MintCompleteSet" | "MergeCompleteSet" (see
  // indexer/src/handlers/binary.ts). Asserted, not schema-proven.
  return IndexerRead.narrowIndexerInvariant<RouterActionRecord>(data.RouterActionRecord);
}

// prettier-ignore
const RouterActionsQuery = graphql(`
  query RouterActions($where: RouterActionRecord_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         RouterActionRecord(where: $where, order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...RouterActionFields }
       }
`);
