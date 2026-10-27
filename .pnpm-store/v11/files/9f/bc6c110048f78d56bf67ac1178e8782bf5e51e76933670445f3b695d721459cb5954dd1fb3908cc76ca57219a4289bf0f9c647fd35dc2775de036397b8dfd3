import * as IndexerRead from "./indexerRead.js";
import * as Markets from "./markets.js";
import type { PublicClient } from "viem";
import type { Address } from "viem";
import type { Market } from "./markets.js";
/**
 *  Resolve a market by its pool address (one query; no live watch), as the
 *  discriminated {@link Market} union — null if no market rests on that pool.
 *  For spot/perp the pool address IS the market id, but binary markets are keyed
 *  by bytes32 marketId, so this looks them up by the `poolAddress` column.
 *
 *  RECYCLE CAVEAT (settlement-extraction v2): a binary pool serves SUCCESSIVE
 *  markets, so several binary rows can share one `poolAddress`. This returns the
 *  NEWEST (the pool's current/latest binding). To address a specific past market
 *  of a recycled pool, key by `marketId` (or match `nonce`) instead.
 */
export declare function getMarketByPool(pool: string, indexerUrl: IndexerRead.Source): Promise<Market | null>;
/**
 *  Every market a pool has hosted, newest first — one row for a SPOT/PERP pool,
 *  the full recycle history for a BINARY pool (which is REUSED across successive
 *  markets, nonce++ each time). The first row is the pool's current market.
 */
export declare function listMarketsByPool(pool: string, opts: {
    limit?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<Market[]>;
/**
 *  One interval in a pool's life during which it was bound 1:1 to a single
 *  market (indexer `PoolBinding`; id = `${pool}_${nonce}`). `MarketCreated`
 *  OPENS a binding; `PoolReleased` or the next `MarketCreated` on the same pool
 *  CLOSES it. An open binding (`toBlock` null) is the pool's current market.
 *
 * @category pools
 */
export interface PoolBindingRecord {
    /** `${poolAddress}_${nonce}` */
    id: string;
    /** Lowercased pool address. */
    poolAddress: string;
    /** Lowercased bytes32 marketId this binding served. */
    marketId: string;
    /** Pool market nonce for this binding (decimal string). */
    nonce: string;
    /** Block the binding opened in (the MarketCreated; decimal string). */
    fromBlock: string;
    /** Log index of the opening event within its block. */
    fromLogIndex: number;
    /** Timestamp (unix seconds) the binding opened. */
    fromTimestamp: string;
    /** Null while the binding is open (the pool's current market). */
    toBlock: string | null;
    /** Log index of the closing event; null while the binding is open. */
    toLogIndex: number | null;
    /** Timestamp (unix seconds) the binding closed; null while open. */
    toTimestamp: string | null;
    /**
     *  How the binding closed: `"Released"` (PoolReleased) | `"Rotated"` (the next
     *  MarketCreated recycled the pool onward); null while open.
     */
    closedBy: "Released" | "Rotated" | null;
}
/**
 *  Pagination for
 *  {@link SomniaMarketsClient.listPoolBindings | client.listPoolBindings}.
 *
 * @category pools
 */
export interface ListPoolBindingsOptions {
    /** Rows per page, from 1 to 1000. Defaults to 50. */
    limit?: number;
    /**
     *  Rows to skip, from 0 to 2147483647 (GraphQL `Int`). Defaults to 0.
     *
     *  Rows are ordered by `nonce`, newest first. The nonce is unique within a
     *  pool, so the order is total. The order is not a snapshot: when the pool
     *  opens new bindings between two requests, every older row moves down by
     *  that many positions and the next page repeats that many rows. Deduplicate on `id` when
     *  you page through the full history.
     */
    offset?: number;
}
/**
 *  One page of a pool's binding history, newest (highest nonce) first — the
 *  markets the pool has served. The first row with `toBlock === null` is the
 *  current binding; a fully-released pool has no open row. `limit` and
 *  `offset` execute at the indexer (SDK-IO-005); a recycled pool's history has
 *  no protocol cap, so there is no "all rows" call.
 *
 *  @throws {@link InvalidInputError} `opts.limit` is not an integer from 1 to
 *   1000, or `opts.offset` is not an integer from 0 to 2147483647.
 *  @throws {@link IndexerError} The indexer request failed or returned an error.
 *   An empty page is `[]`, never an error (SDK-IO-002).
 */
export declare function listPoolBindings(pool: string, opts: ListPoolBindingsOptions | undefined, indexerUrl: IndexerRead.Source): Promise<PoolBindingRecord[]>;
/**
 *  The indexer's per-pool aggregate (`Pool`; id = lowercased pool address) — the
 *  long-lived BinaryPool contract that outlives any single market.
 *
 * @category pools
 */
export interface IndexedPool {
    /** Lowercased pool address (== address). */
    id: string;
    /** Lowercased pool address (== id). */
    address: string;
    /** Collateral token the pool is bound to for its whole life (lowercased). */
    collateral: string | null;
    /**
     *  The pool's creator — its first-deploy market creator, the only party that
     *  can reuse it (lowercased).
     */
    creator: string | null;
    /**
     *  marketId of the pool's CURRENT binding; null when finalized + released and
     *  awaiting reuse.
     */
    currentMarketId: string | null;
    /** Pool market nonce of the current binding (decimal string). */
    currentNonce: string | null;
    /** Number of markets this pool has served (== the latest nonce). */
    generationCount: number;
    /** Timestamp (unix seconds) of the pool's first MarketCreated. */
    createdAtTimestamp: string;
    /** Timestamp (unix seconds) of the last binding change. */
    updatedAtTimestamp: string;
}
/**
 *  One pool's aggregate row by address — null if the indexer has never seen a
 *  MarketCreated on it.
 */
export declare function getPool(address: string, indexerUrl: IndexerRead.Source): Promise<IndexedPool | null>;
/**
 *  A creator's free (finalized + released, reusable) pools for `collateral`,
 *  LIFO order (the LAST entry is popped first on the creator's next
 *  createMarket). Pure chain read (no signer).
 */
export declare function getFreePools(creator: Address, collateral: Address, module: Address, client: PublicClient): Promise<Address[]>;
/**
 *  Drop every memoized pool set and pool type. Tests use it so one file's stubbed
 *  registry cannot leak into the next test through the TTL.
 */
export declare function clearPoolSets(): void;
/**
 *  Every pool currently hosting a market of `type`, lowercased. SPOT and PERP are a
 *  handful of addresses; BINARY is thousands and is not what you want — use
 *  {@link poolScope}, which expresses binary as the complement.
 */
export declare function poolsOfType(type: Markets.MarketType, indexerUrl: IndexerRead.Source): Promise<string[]>;
/**
 *  The Hasura comparison that scopes a `pool` / `market_id` column to one market type:
 *  `{ _in }` over the type's pools for SPOT and PERP, `{ _nin }` over spot ∪ perp for
 *  BINARY. Drop-in for the `market: { marketType }` relationship predicate, minus the
 *  correlated EXISTS — see the section header.
 */
export declare function poolScope(type: Markets.MarketType, indexerUrl: IndexerRead.Source): Promise<{
    _in: string[];
} | {
    _nin: string[];
}>;
/**
 *  Each pool's market type, read from the pool's own newest market row — `null` when the
 *  indexer has no market for it yet. A pool's type is fixed for its life (a recycle
 *  keeps the kind), so a classified pool is kept until eviction; it is read per pool
 *  rather than inferred from the type sets because set membership goes stale for a
 *  newly created pool. Pools not already known are classified together, in requests of
 *  at most {@link POOL_TYPE_BATCH}. `pools` are lowercased and distinct.
 *
 *  A pool missing from a response is `null` for this read only and is asked again next
 *  time — also the safe answer if a server row ceiling ever cut the response short.
 */
export declare function poolMarketTypes(pools: readonly string[], indexerUrl: IndexerRead.Source): Promise<(Markets.MarketType | null)[]>;
/**
 *  The `where` fragment that scopes an Order / StopOrder read by pool and/or type — the
 *  one place the two compose, replacing `market: { marketType, poolAddress }`.
 *
 *  Both constraints always narrow. A pool that is not of the requested type matches
 *  NOTHING, exactly as the relationship form it replaces did: passing a spot pool to a
 *  perp read must not return spot rows, whose `orderIdRaw` addresses a different
 *  registry. A pool of a known SPOT / PERP type is its own market id, a direct `_eq` on
 *  the indexed column; a known BINARY pool keeps the relationship form (see the section
 *  header). A pool the indexer has no market row for yet falls back to that same
 *  relationship form, carrying whichever constraints were asked for — correct for any
 *  type, and merely costlier on a path that only exists until the pool is indexed.
 *  A supplied pool always returns a predicate. Without one, a market type still
 *  returns its indexed market-id predicate; omitting both returns `undefined`.
 */
export declare function marketScope(opts: {
    pool: string;
    marketType?: Markets.MarketType;
}, indexerUrl: IndexerRead.Source): Promise<Record<string, unknown>>;
export declare function marketScope(opts: {
    pool?: string;
    marketType?: Markets.MarketType;
}, indexerUrl: IndexerRead.Source): Promise<Record<string, unknown> | undefined>;
/**
 *  {@link marketScope} for each of `pools` (lowercased and distinct), in order, with
 *  every unknown pool classified in one batched request rather than one per pool.
 */
export declare function marketScopes(pools: readonly string[], indexerUrl: IndexerRead.Source): Promise<Record<string, unknown>[]>;
