// Pools — the CLOB pool records and their market bindings.
//
// A pool address is a TIME-VARYING binding: settlement-extraction v2 recycles one
// pool across successive markets, so `(pool, nonce)` identifies a market's slice
// of a pool's history and a pool alone never identifies a market. These reads are
// how a caller resolves that binding — which market a pool is hosting now, which
// it hosted, and which pools are free for the next one.
//
// Shared across kinds: every kind's CLOB is a pool from the same factory.

import * as IndexerRead from "./indexerRead.js";
import * as Markets from "./markets.js";
import { graphql } from "./gql/gql.js";
import { IndexerError, InvalidInputError } from "./errors.js";
import type { PublicClient } from "viem";
import * as ModuleAbi from "./moduleAbi.js";
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
export async function getMarketByPool(pool: string, indexerUrl: IndexerRead.Source): Promise<Market | null> {
  return (await listMarketsByPool(pool, { limit: 1 }, indexerUrl))[0] ?? null;
}

/**
 *  Every market a pool has hosted, newest first — one row for a SPOT/PERP pool,
 *  the full recycle history for a BINARY pool (which is REUSED across successive
 *  markets, nonce++ each time). The first row is the pool's current market.
 */
export async function listMarketsByPool(
  pool: string,
  opts: { limit?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<Market[]> {
  const data = await IndexerRead.gqlRequest(
    MarketsByPoolQuery,
    { pool: pool.toLowerCase(), limit: opts.limit ?? 50 },
    indexerUrl,
  );
  return data.Market.map(Markets.toMarket);
}

// prettier-ignore
const MarketsByPoolQuery = graphql(`
  query MarketsByPool($pool: String!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(
      where: { poolAddress: { _eq: $pool } }
      order_by: { createdAtTimestamp: desc }
      limit: $limit
    ) {
      ...MarketFields
    }
  }
`);

// ---------------------------------------------------------------- pool reuse
// Settlement-extraction v2: a BinaryPool is a long-lived contract REUSED across
// successive markets. The indexer keeps a per-pool aggregate (`Pool`) and the
// full audit trail of pool→market bindings (`PoolBinding`) — these reads back
// the explorer's "every market this pool served" view.

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
export async function listPoolBindings(
  pool: string,
  opts: ListPoolBindingsOptions = {},
  indexerUrl: IndexerRead.Source,
): Promise<PoolBindingRecord[]> {
  // Validated BEFORE the request, as listSeriesLatestMarkets does: `NaN` and
  // `Infinity` pass `??` and serialize to `null`, and an out-of-range integer
  // is rejected by GraphQL. Either would surface as an `IndexerError` that
  // blames the indexer for the caller's own input.
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new InvalidInputError("Pool binding page limit must be an integer from 1 to 1000");
  }
  // `$offset` is a GraphQL `Int!`, which is 32-bit signed.
  if (!Number.isInteger(offset) || offset < 0 || offset > 2_147_483_647) {
    throw new InvalidInputError("Pool binding page offset must be an integer from 0 to 2147483647");
  }
  const data = await IndexerRead.gqlRequest(PoolBindingsQuery, { pool: pool.toLowerCase(), limit, offset }, indexerUrl);
  // `closedBy` is a plain String column, narrowed here to the only values the
  // indexer writes ("Rotated" | "Released" | null — see indexer/src/handlers/
  // binary.ts; confirmed against the live indexer). Same asserted-not-proven class
  // as the enum-scalars in codegen.ts.
  return IndexerRead.narrowIndexerInvariant<PoolBindingRecord>(data.PoolBinding);
}

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
export async function getPool(address: string, indexerUrl: IndexerRead.Source): Promise<IndexedPool | null> {
  const data = await IndexerRead.gqlRequest(PoolByPkQuery, { id: address.toLowerCase() }, indexerUrl);
  return data.Pool_by_pk ?? null;
}

// prettier-ignore
const PoolBindingsQuery = graphql(`
  query PoolBindings($pool: String!, $limit: Int!, $offset: Int!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PoolBinding(where: {poolAddress: {_eq: $pool}}, order_by: {nonce: desc}, limit: $limit, offset: $offset) {
           id poolAddress marketId nonce fromBlock fromLogIndex fromTimestamp
           toBlock toLogIndex toTimestamp closedBy
         }
       }
`);

// prettier-ignore
const PoolByPkQuery = graphql(`
  query PoolByPk($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Pool_by_pk(id: $id) {
           id address collateral creator currentMarketId currentNonce generationCount
           createdAtTimestamp updatedAtTimestamp
         }
       }
`);

/**
 *  A creator's free (finalized + released, reusable) pools for `collateral`,
 *  LIFO order (the LAST entry is popped first on the creator's next
 *  createMarket). Pure chain read (no signer).
 */
export async function getFreePools(
  creator: Address,
  collateral: Address,
  module: Address,
  client: PublicClient,
): Promise<Address[]> {
  const pools = await client.readContract({
    address: module,
    abi: ModuleAbi.binaryModuleReadAbi,
    functionName: "getFreePools",
    args: [creator, collateral],
  });
  return [...pools];
}

// ---------------------------------------------------------------- type scope, as pools
//
// A market type is not a column on Fill, Order or StopOrder. The obvious filter —
// `market: { marketType: { _eq } }` — is a RELATIONSHIP predicate, and Hasura compiles
// a relationship predicate to a correlated EXISTS on Market per candidate row. Postgres
// cannot fold that into a bitmap over the `maker` / `taker` / `owner` indexes, so it
// walks the `timestamp` index testing EXISTS row by row. Measured on the development
// indexer, one wallet's fills, `limit: 50`: `stream timeout` (>60s) with the predicate,
// 102ms without it. Three such reads every 5s per open wallet page saturated the shared
// one-vCPU Cloud SQL instance and stalled ingestion on both slots (2026-09-02).
//
// So a scoped read resolves its scope HERE, to values for the direct, indexed column —
// `pool` on Fill, `market_id` on Order and StopOrder. Two facts shape the answers.
//
// `Market.id` IS the pool address for SPOT and PERP, so those type sets are small (3
// and ~20 pools) and one such pool's market id is the pool itself. Binary pools are
// recycled across thousands of markets, so the BINARY TYPE is "not a spot or perp pool"
// (an `_nin` over ~23 addresses, never an `_in` over thousands) while a single BINARY
// POOL keeps the `market: { poolAddress }` relationship form — a recycled pool has
// hosted ~2,000 markets on the development indexer, so an `_in` of its ids is the worse
// shape, and every Order read that takes a pool also carries `owner`, which bounds that
// EXISTS to the wallet's own rows. Order now has an indexed `pool` candidate for
// a future direct binary-pool read; this reader still uses the relationship.
// StopOrder needs no separate pool column: it exists only for SPOT/PERP, whose
// `market_id` is already the pool address.
//
// A pool's type comes from the pool's OWN row, never from membership of a type set.
// Set membership is an inference that goes stale: a spot pool created after the SPOT set
// was memoized is not in it, and "not spot, not perp, therefore binary" would then scope
// a spot read to nothing. The per-pool read is authoritative and equally cheap.
//
// Everything here is memoized per indexer URL, in the owning client's map when the read
// carries one, under a hard entry cap with least-recently-used eviction — bounded pure
// memoization whose key carries every environmental input, the shape SDK-ARCH-002
// permits. The two kinds of answer age differently:
//
//   - A pool SET changes as pools are deployed, so it expires after a short TTL.
//   - A pool's TYPE is fixed for the pool's life, so a classified pool is kept until
//     eviction, with no TTL re-read. `null` ("no market row yet") is NOT kept: the pool
//     becomes classified on the first read after its market appears.
//
// Expiry is decided BEFORE anyone awaits, so callers landing in the same tick share one
// refresh, and a failed request is dropped rather than kept as an answer. The set cap is
// a separate guard: a set silently cut at a row limit would silently drop rows from every
// read built on it, so a set past its cap throws instead.

const POOL_SET_TTL_MS = 60_000;
const POOL_SET_CAP = 1_000;
// Entries are (url, type) — two per indexer — plus (url, pool) for every pool a process
// scopes a read to. A long-lived keeper walking many pools must not grow the map without
// end, so it is capped and evicts rather than relying on a re-read to expire a key.
const MEMO_MAX_ENTRIES = 256;
// Unclassified pools per `PoolTypes` request. `distinct_on` returns at most one row per
// pool, so this also bounds the rows one classification request can return.
const POOL_TYPE_BATCH = 50;

interface MemoEntry {
  promise: Promise<unknown>;
  expires: number;
}
const memoized = new Map<string, MemoEntry>();

type MemoMap = Map<string, MemoEntry>;

/** The owner's map for a request context; the module map for a bare URL. */
function memoMap(source: IndexerRead.Source): MemoMap | undefined {
  return typeof source === "string" ? memoized : source.poolCache;
}

function memoKey(source: IndexerRead.Source, key: string): string {
  return `${typeof source === "string" ? source : source.url}\u0000${key}`;
}

/** A live entry's promise, moved to the young end of the eviction order. */
function memoHit(entries: MemoMap, key: string, now: number): Promise<unknown> | undefined {
  const hit = entries.get(key);
  if (!hit || hit.expires <= now) return undefined;
  entries.delete(key);
  entries.set(key, hit);
  return hit.promise;
}

/** Store `promise` under `key` for the TTL. A rejection drops it: a failure is not an answer. */
function memoStore(entries: MemoMap, key: string, promise: Promise<unknown>, now: number): MemoEntry {
  if (entries.size >= MEMO_MAX_ENTRIES) evict(entries, now);
  const entry = { promise, expires: now + POOL_SET_TTL_MS };
  entries.set(key, entry);
  promise.catch(() => {
    if (entries.get(key) === entry) entries.delete(key);
  });
  return entry;
}

/**
 *  One in-flight promise per key, shared by every caller until the entry expires or
 *  is evicted.
 *
 *  The map is heterogeneous, so the stored value is `unknown`. The key namespace, not
 *  the type system, pairs a key with its value type, and each namespace has exactly
 *  one private writer:
 *
 *  - `type:` — a pool SET (`string[]`), written here by {@link poolsOfType}, with the
 *    TTL.
 *  - `pooltype:` — a pool TYPE (`MarketType | null`), written by `poolMarketTypes`
 *    through `memoStore`. A classified type is then kept with `expires: Infinity`
 *    until eviction; `null` is deleted when it settles.
 */
function memo<T>(source: IndexerRead.Source, key: string, create: () => Promise<T>): Promise<T> {
  const entries = memoMap(source);
  if (!entries) return create();
  const now = Date.now();
  const hit = memoHit(entries, key, now);
  if (hit) return hit as Promise<T>;
  const promise = create();
  memoStore(entries, key, promise, now);
  return promise;
}

/** Expired entries first; then least recently used, since a hit re-inserts its key. */
function evict(entries: MemoMap, now: number): void {
  for (const [k, v] of entries) if (v.expires <= now) entries.delete(k);
  for (const k of entries.keys()) {
    if (entries.size < MEMO_MAX_ENTRIES) break;
    entries.delete(k);
  }
}

/** Rows past the cap are the truncation signal (the aggregateCountBounded pattern). */
function capped(values: readonly string[], what: string): string[] {
  if (values.length > POOL_SET_CAP) {
    throw new IndexerError(
      "poolScope",
      `${what} has ${POOL_SET_CAP}+ entries; a set cut at the cap would silently drop rows`,
    );
  }
  return values.map((v) => v.toLowerCase());
}

/**
 *  Drop every memoized pool set and pool type. Tests use it so one file's stubbed
 *  registry cannot leak into the next test through the TTL.
 */
export function clearPoolSets(): void {
  memoized.clear();
}

/**
 *  Every pool currently hosting a market of `type`, lowercased. SPOT and PERP are a
 *  handful of addresses; BINARY is thousands and is not what you want — use
 *  {@link poolScope}, which expresses binary as the complement.
 */
export function poolsOfType(type: Markets.MarketType, indexerUrl: IndexerRead.Source): Promise<string[]> {
  return memo(indexerUrl, memoKey(indexerUrl, `type:${type}`), async () => {
    const data = await IndexerRead.gqlRequest(
      PoolsByTypeQuery,
      { where: { marketType: { _eq: type } }, limit: POOL_SET_CAP + 1 },
      indexerUrl,
    );
    return capped(
      data.Market.map((m) => m.poolAddress),
      `${type} pools`,
    );
  });
}

/**
 *  The Hasura comparison that scopes a `pool` / `market_id` column to one market type:
 *  `{ _in }` over the type's pools for SPOT and PERP, `{ _nin }` over spot ∪ perp for
 *  BINARY. Drop-in for the `market: { marketType }` relationship predicate, minus the
 *  correlated EXISTS — see the section header.
 */
export async function poolScope(
  type: Markets.MarketType,
  indexerUrl: IndexerRead.Source,
): Promise<{ _in: string[] } | { _nin: string[] }> {
  if (type !== "BINARY") return { _in: await poolsOfType(type, indexerUrl) };
  const [spot, perp] = await Promise.all([poolsOfType("SPOT", indexerUrl), poolsOfType("PERP", indexerUrl)]);
  return { _nin: [...spot, ...perp] };
}

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
export async function poolMarketTypes(
  pools: readonly string[],
  indexerUrl: IndexerRead.Source,
): Promise<(Markets.MarketType | null)[]> {
  const entries = memoMap(indexerUrl);
  const now = Date.now();
  const answers: Promise<Markets.MarketType | null>[] = [];
  const unknown: { pool: string; index: number }[] = [];
  pools.forEach((pool, index) => {
    const hit = entries && memoHit(entries, memoKey(indexerUrl, `pooltype:${pool}`), now);
    // The `pooltype:` key namespace only ever stores a type-or-null promise (see the
    // key namespaces on `memo`).
    if (hit) answers[index] = hit as Promise<Markets.MarketType | null>;
    else unknown.push({ pool, index });
  });
  for (let start = 0; start < unknown.length; start += POOL_TYPE_BATCH) {
    const batch = unknown.slice(start, start + POOL_TYPE_BATCH);
    const request = IndexerRead.gqlRequest(
      PoolTypesQuery,
      { pools: batch.map((b) => b.pool), limit: batch.length },
      indexerUrl,
    ).then((data) => new Map(data.Market.map((m) => [m.poolAddress.toLowerCase(), m.marketType])));
    for (const { pool, index } of batch) {
      const answer = request.then((types) => types.get(pool) ?? null);
      answers[index] = answer;
      if (!entries) continue;
      const key = memoKey(indexerUrl, `pooltype:${pool}`);
      const entry = memoStore(entries, key, answer, now);
      answer.then(
        (type) => {
          if (entries.get(key) !== entry) return;
          if (type == null) entries.delete(key);
          else entry.expires = Infinity;
        },
        () => {},
      );
    }
  }
  return Promise.all(answers);
}

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
export function marketScope(
  opts: { pool: string; marketType?: Markets.MarketType },
  indexerUrl: IndexerRead.Source,
): Promise<Record<string, unknown>>;
export function marketScope(
  opts: { pool?: string; marketType?: Markets.MarketType },
  indexerUrl: IndexerRead.Source,
): Promise<Record<string, unknown> | undefined>;
export async function marketScope(
  opts: { pool?: string; marketType?: Markets.MarketType },
  indexerUrl: IndexerRead.Source,
): Promise<Record<string, unknown> | undefined> {
  if (opts.pool == null) {
    if (opts.marketType == null) return undefined;
    return { market_id: await poolScope(opts.marketType, indexerUrl) };
  }
  const pool = opts.pool.toLowerCase();
  const [type] = await poolMarketTypes([pool], indexerUrl);
  return scopeOfPool(pool, type ?? null, opts.marketType);
}

/**
 *  {@link marketScope} for each of `pools` (lowercased and distinct), in order, with
 *  every unknown pool classified in one batched request rather than one per pool.
 */
export async function marketScopes(
  pools: readonly string[],
  indexerUrl: IndexerRead.Source,
): Promise<Record<string, unknown>[]> {
  const types = await poolMarketTypes(pools, indexerUrl);
  return pools.map((pool, i) => scopeOfPool(pool, types[i] ?? null, undefined));
}

function scopeOfPool(
  pool: string,
  type: Markets.MarketType | null,
  marketType: Markets.MarketType | undefined,
): Record<string, unknown> {
  if (type == null) {
    // Unknown pool: express both constraints the only way that cannot be wrong.
    const market: Record<string, unknown> = { poolAddress: { _eq: pool } };
    if (marketType != null) market.marketType = { _eq: marketType };
    return { market };
  }
  if (marketType != null && marketType !== type) return { market_id: { _in: [] } };
  if (type === "BINARY") return { market: { poolAddress: { _eq: pool } } };
  return { market_id: { _eq: pool } };
}

// Newest row per pool: `distinct_on` keeps the first row of each pool in `order_by`.
// prettier-ignore
const PoolTypesQuery = graphql(`
  query PoolTypes($pools: [String!]!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(
      where: { poolAddress: { _in: $pools } }
      distinct_on: poolAddress
      order_by: [{ poolAddress: asc }, { createdAtTimestamp: desc }]
      limit: $limit
    ) {
      poolAddress
      marketType
    }
  }
`);

// prettier-ignore
const PoolsByTypeQuery = graphql(`
  query PoolsByType($where: Market_bool_exp!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    Market(where: $where, distinct_on: poolAddress, order_by: { poolAddress: asc }, limit: $limit) {
      poolAddress
    }
  }
`);
