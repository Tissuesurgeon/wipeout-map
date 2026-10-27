import * as GraphqlBoundary from "./graphqlBoundary.js";
import { IndexerError } from "./errors.js";
import type { MaterializerStore } from "./store.js";
export interface SnapshotSeam {
    /** Block the snapshot is consistent to — the watch's tail covers snapshotBlock+1.. */
    snapshotBlock: number;
    /** Chain head as the indexer sees it */
    reportedHeadBlock: number;
}
export interface MarketsSnapshotResult extends SnapshotSeam {
    /** Lowercased pool addresses of the hydrated markets — the watch's book set */
    pools: string[];
    /** Lowercased BinaryMarket contract addresses — the watch's status-event set */
    marketAddresses: string[];
    /**
     *  True when the all-markets snapshot found more eligible markets than
     *  {@link ALL_MARKETS_BUDGET} and hydrated only the newest ones. Always false
     *  for a pool-scoped snapshot, which asks for its pools by address.
     */
    truncated: boolean;
}
/**
 *  How many eligible markets one all-markets snapshot hydrates.
 *
 *  The snapshot asks for one row more than this. That extra row is the probe:
 *  when it comes back, the eligible set is larger than the budget and the
 *  result says so in `truncated`. The watch never reports a cut set as complete.
 */
export declare const ALL_MARKETS_BUDGET = 500;
/**
 *  The first all-markets request: which eligible markets to hydrate, newest first.
 *
 *  The snapshot request filters its fill and order arms by the markets this
 *  returns, through direct indexed columns (`Fill.pool`, `Order.market_id`).
 *  Filtering them through the `market` relationship would issue a correlated
 *  EXISTS per row, which has stalled the indexer under load.
 */
export declare const ELIGIBLE_MARKETS_QUERY = "query EligibleMarkets($marketLimit: Int!) {\n      Market(where: {_or: [{marketType: {_in: [\"SPOT\", \"PERP\"]}}, {finalized: {_is_null: true}}, {finalized: {_eq: false}}]}, order_by: [{createdAtTimestamp: desc}, {id: desc}], limit: $marketLimit) { id poolAddress }\n    }";
/**
 *  The markets-snapshot operation, in its two shapes. A pool-scoped watch
 *  filters on `$pools` and applies no eligibility filter: it still hydrates a
 *  finalized market while its pool serves it. The all-markets watch selects its
 *  markets by lifecycle eligibility ({@link ELIGIBLE_MARKET_WHERE}) and filters
 *  its fill and order arms by the `$pools` and `$marketIds` that
 *  {@link ELIGIBLE_MARKETS_QUERY} selected.
 *
 *  Hoisted out of the loader so `test/snapshotOperations.test.ts` can validate
 *  BOTH shapes against the committed Hasura schema. `liveExpiry` is inlined
 *  rather than a variable because it is a literal the caller stamps per request.
 */
export declare function marketsSnapshotQuery(scoped: boolean, liveExpiry: string): string;
/**
 * Hydrate a market watch scope: the market rows, their recent fills, and their
 * full resting open-order set (the local live book's starting depth), merged
 * into the store. `scope` is a pool-address list, or `"all"` for every
 * eligible market (the all-markets watch; see {@link ELIGIBLE_MARKET_WHERE}).
 *
 * The `"all"` scope hydrates at most {@link ALL_MARKETS_BUDGET} markets, newest
 * first, and sets `truncated` when more eligible markets exist. It takes two
 * requests: {@link ELIGIBLE_MARKETS_QUERY} selects the markets, then one
 * snapshot request reads the seam, the market rows, and the fills and orders
 * of the selected markets. The snapshot request selects the markets again. If
 * that selection names a market the first request did not, the fill and order
 * arms missed it, so the loader repeats the snapshot with the new selection, at
 * most {@link ALL_MARKETS_ATTEMPTS} times.
 *
 * @throws {@link IndexerError} If a request fails, or if the eligible set
 * changes on every attempt.
 */
export declare function loadMarketsSnapshot(chainId: number, scope: string[] | "all", deps: {
    indexerUrl: string;
    governor?: GraphqlBoundary.EndpointGovernor;
    /** The owner's pending binding check. Rows merge only after it passes. */
    binding?: Promise<void>;
    store: MaterializerStore;
    isCurrent?: () => boolean;
    includePool?: (pool: string) => boolean;
}): Promise<MarketsSnapshotResult>;
/**
 *  Hoisted out of the function so `test/snapshotOperations.test.ts` can validate
 *  it against the committed Hasura schema. These loaders build their GraphQL by
 *  hand rather than through codegen, so `gqlDocumentsValidate` does not see them
 *  and an invalid operation reaches the wire unnoticed.
 */
export declare const POOL_FILLS_QUERY = "query PoolFills($pools: [String!]!, $fillLimit: Int!) {\n      Fill(where: {pool: {_in: $pools}}, order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $fillLimit) { \n  id market { id poolAddress } maker makerSide taker takerSide kind takerIsBid\n  takerOrder_id makerOrder_id\n  fillPrice quantity quoteQuantity takerRemainingQuantity makerRemainingQuantity\n  timestamp blockNumber txHash\n }\n    }";
/**
 *  Recent fills for a pool set, with no market or order rows.
 *
 *  This is the fills half of `loadMarketsSnapshot`, split out so a chain-seeded
 *  watch can load its tape on its own lane. The book it seeds comes from chain,
 *  so this request failing must degrade the tape only — the caller records that
 *  as a `fill-history` failure rather than showing an empty tape as if the
 *  market had never traded (SDK-IO-002).
 *
 *  It takes no `chainId`: the sibling loaders declare `$chainId` only to select
 *  the `chain_metadata` seam row, and a chain-seeded watch pins its seam from
 *  the drained block instead. Declaring it here and never using it makes the
 *  operation invalid GraphQL, which Hasura rejects outright.
 *
 * @throws {@link IndexerError} If the indexer request fails.
 */
export declare function loadPoolFills(pools: string[], deps: {
    indexerUrl: string;
    governor?: GraphqlBoundary.EndpointGovernor;
    /** The owner's pending binding check. Rows merge only after it passes. */
    binding?: Promise<void>;
    store: MaterializerStore;
    isCurrent?: () => boolean;
}): Promise<void>;
/**
 *  Narrow a fills-lane rejection to the typed failure `TailStatus` records.
 *
 *  The lane runs through the shared indexer boundary, so a failure is already
 *  an `IndexerError`. Anything else is wrapped rather than widening the status
 *  type to `unknown` (SDK-ERR-001).
 */
export declare function toIndexerFailure(error: unknown): IndexerError;
/** Hoisted for `test/snapshotOperations.test.ts` — see {@link POOL_FILLS_QUERY}. */
export declare const USER_SNAPSHOT_QUERY = "query UserSnapshot($chainId: Int!, $user: String!, $userLimit: Int!) {\n      chain_metadata(where: {chain_id: {_eq: $chainId}}) { latest_processed_block block_height }\n      userFills: Fill(\n        where: {_or: [{maker: {_eq: $user}}, {taker: {_eq: $user}}]},\n        order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $userLimit\n      ) { \n  id market { id poolAddress } maker makerSide taker takerSide kind takerIsBid\n  takerOrder_id makerOrder_id\n  fillPrice quantity quoteQuantity takerRemainingQuantity makerRemainingQuantity\n  timestamp blockNumber txHash\n }\n      userOrders: Order(\n        where: {owner: {_eq: $user}},\n        order_by: {placedAtTimestamp: desc}, limit: $userLimit\n      ) { \n  id market { id poolAddress } orderId owner side isBid userData price\n  fullQuantity quantityRemaining filledQuantity status rested expireTimestampNs\n  placedAtTimestamp placedTxHash\n }\n    }";
/**
 * Hydrate a user watch scope: the account's past fills (as maker or taker) and
 * orders across ALL markets, merged into the store — so the user-scoped live
 * reads have history predating the watch. Live events are attributed to every
 * account regardless; this only supplies the past.
 */
export declare function loadUserSnapshot(chainId: number, user: string, deps: {
    indexerUrl: string;
    governor?: GraphqlBoundary.EndpointGovernor;
    /** The owner's pending binding check. Rows merge only after it passes. */
    binding?: Promise<void>;
    store: MaterializerStore;
    isCurrent?: () => boolean;
}): Promise<SnapshotSeam>;
/** What a perp-plane hydration learned, beyond the seam. */
export interface PerpPlaneSnapshotResult extends SnapshotSeam {
    /**
     *  The MarginBank the venue's perp markets name, lowercased — or null when the indexer
     *  has no perp market at all (a fresh reindex, or a chain with no perps).
     *
     *  Returned rather than assumed because the plane's two log sources cannot be watched
     *  without it: the bank address is the entry point, and `MarginBank.getSystemConfig()`
     *  reports the LiquidationEngine from there. Reading it off an indexed row is the
     *  deployment's own view of its wiring, so it cannot drift the way a config constant can.
     */
    marginBank: string | null;
}
/**
 *  Hydrate the perp plane: the newest liquidation legs and funding settlements, plus the
 *  MarginBank address the live watch needs, merged into the store.
 *
 *  ONE request, like every other scope loader, and it is the only indexer touch a plane
 *  watch makes. The rows come back in the SAME shape the one-shot reads serve, so the
 *  tail's live rows splice onto them without a translation step.
 *
 *  Plane-wide rather than per pool, because the sources are singletons and the
 *  account-level waterfall legs name no pool. `pool` filtering happens at read time.
 *
 *  Each arm takes the newest rows by the TOTAL key its indexed read serves — the
 *  liquidation arm `(timestamp, blockNumber, id)`, the funding arm `(timestamp, id)`,
 *  since a funding payment has no block column — and the store's comparator sorts on the
 *  same. Ordering on `timestamp` alone picked a different newest-`limit` set at the
 *  boundary, so a hydrated page and a paged history disagreed about which rows exist:
 *  every leg of one waterfall shares a timestamp. Leading on `timestamp` also keeps the
 *  sort on an indexed column, which `blockNumber` alone is not.
 */
export declare function loadPerpPlaneSnapshot(chainId: number, deps: {
    indexerUrl: string;
    /** The owner's pending binding check. Rows merge only after it passes. */
    binding?: Promise<void>;
    store: MaterializerStore;
    limit?: number;
    isCurrent?: () => boolean;
}): Promise<PerpPlaneSnapshotResult>;
