import * as GraphqlBoundary from "./graphqlBoundary.js";
import type { TypedDocumentString } from "./gql/graphql.js";
/** Owner-bound request inputs. A sink belongs to one logical read, never an endpoint. */
export interface RequestContext {
    readonly poolCache?: Map<string, {
        promise: Promise<unknown>;
        expires: number;
    }>;
    /**
     *  The owning client's memory of which count tables lack `_aggregate` for an
     *  endpoint and header set (see {@link aggregateCountBounded}). Built with
     *  `poolCache` and cleared with it by `stopLive()`. Absent in standalone
     *  concept tests, where every count probes.
     */
    readonly aggregateSupport?: AggregateSupportMap;
    /**
     *  The owning client's endpoint governor, built once in createClient so its
     *  counters cover that client's whole load. Absent in standalone concept
     *  tests, where reads go out unguarded.
     */
    readonly governor?: GraphqlBoundary.EndpointGovernor;
    /** Absent when the owning client was configured without an indexer; every read then throws {@link NotConfiguredError}. */
    readonly url: string | undefined;
    readonly chainId: number;
    readonly signal?: AbortSignal;
    readonly observe?: (watermark: bigint | null, startedAt: number, completedAt: number) => void;
    /**
     *  The owning client's one-time proof that the endpoint indexes `chainId`
     *  (see `SyncStatus.makeBindingCheck`). Every read sends its own request
     *  alongside it and awaits it before returning rows (see {@link afterBinding}),
     *  so a misbound indexer fails the first read of any kind rather than serving
     *  another chain's rows under this chain's id. Absent in standalone concept
     *  tests.
     */
    readonly verifyBinding?: () => Promise<void> | undefined;
}
/** Internal compatibility for standalone concept tests; owner bindings always pass context. */
export type Source = string | RequestContext;
/**
 *  A generated, typed operation: carries its own result and variables types, so
 *  neither is self-declared at the call site. `documentMode: "string"` means the
 *  document IS its text (a `String` subclass), so the bytes on the wire are
 *  identical to the template strings these replace.
 *
 *  The generated class itself, NOT a structural stand-in. A structural shape here
 *  would be satisfied by a plain `string` — it has `toString()`, and optional
 *  markers like `__apiType` / `__meta__` are vacuously met — which would let raw
 *  query text slip onto the typed path. `TypedDocumentString` carries a `private`
 *  member, so it is nominal: only `graphql()` output can produce one.
 */
export type TypedDocument<TResult, TVariables> = TypedDocumentString<TResult, TVariables>;
/**
 *  Issue a GraphQL read against the indexer.
 *
 *  Takes a GENERATED typed document only: its result and variable types derive from
 *  the committed schema snapshot, so a selection, alias, filter or sort the indexer
 *  does not have fails `pnpm gql:codegen` / `pnpm typecheck` instead of throwing on
 *  every call at runtime. This is the shape every indexer read in this file uses.
 *
 *  There is no untyped door: a runtime-assembled query cannot be listed in a Hasura
 *  query allowlist, and `graphql()` resolves its overloads from the literal source
 *  string, so every read — the count helpers included — is a generated document.
 *
 *  `context.signal` stops this read; the owner's lifecycle still applies.
 *  `context.onResponseBytes` receives the UTF-8 size of the response the read returns,
 *  for a caller that checks a response ceiling (see `GraphqlBoundary.postGraphql`).
 */
export declare function gqlRequest<TResult, TVariables extends Record<string, unknown>>(document: TypedDocument<TResult, TVariables>, variables: TVariables, indexerUrl: Source, headers?: Record<string, string>, context?: ReadContext): Promise<Omit<TResult, "_sdkWatermark">>;
/** One read's own options, beside the owner's request context. */
interface ReadContext {
    readonly signal?: AbortSignal;
    readonly onResponseBytes?: (bytes: number) => void;
}
/**
 *  Settle an indexer request that runs alongside the owner's binding check,
 *  but only after the check passes.
 *
 *  The check decides first. A misbound indexer fails with the check's
 *  {@link NotConfiguredError} even when the request failed sooner, and a
 *  request that succeeded is discarded. So no row from another chain reaches
 *  a caller or the live store. Without a pending check, this is the request.
 */
export declare function afterBinding<T>(request: Promise<T>, binding: Promise<void> | undefined): Promise<T>;
/** Wait for a shared promise, but stop waiting with the caller's abort reason (SDK-IO-003). */
export declare function abortable(promise: Promise<void>, signal?: AbortSignal): Promise<void>;
/**
 *  The Hasura comparison bounding a block column from below, from a caller's
 *  `sinceBlock`.
 *
 *  Accepts the `bigint` a viem receipt carries as well as a plain number, so a
 *  caller resuming from a write it just sent does not have to convert. The value
 *  is sent as a decimal string because Hasura's `numeric` comparison input
 *  uses strings on the wire, even for heights inside the exact-integer range.
 *
 *  Rejects a fractional, negative or inexact height as {@link InvalidInputError}
 *  before the request goes out (SDK-ERR-003: the caller fixes the call). Above
 *  `Number.MAX_SAFE_INTEGER` a height would silently compare as a ROUNDED value,
 *  which is a wrong answer rather than a slow one — no chain reaches that height,
 *  so refusing it costs nothing.
 */
export declare function blockLowerBound(value: number | bigint, option: string): {
    _gte: string;
};
/**
 *  The Hasura comparison bounding a block column from above, from a caller's
 *  `toBlock`. INCLUSIVE, so a range read repeated with the same bounds returns
 *  the same rows, and two adjacent ranges meeting at `n` / `n + 1` neither drop
 *  nor repeat a row.
 *
 *  Accepts and rejects exactly what {@link blockLowerBound} does — the two are
 *  the same value in the two directions, and a caller that supplies both gets
 *  one merged comparison on the column.
 */
export declare function blockUpperBound(value: number | bigint, option: string): {
    _lte: string;
};
/** A caller-supplied block height as an exact JavaScript number, or {@link InvalidInputError}. */
export declare function blockHeight(value: number | bigint, option: string): number;
/** Row ceiling on the public-role fallback scan. Past this a count is a lower bound. */
export declare const COUNT_FALLBACK_CAP = 10000;
/**
 *  A row count plus whether the read was cut short — same `truncated` vocabulary
 *  as {@link FundingRateSeries} and the `hasMore` pagers, so a caller reads one
 *  convention across the SDK rather than two.
 *
 *  `truncated: false` — a real total, from Hasura `_aggregate` or from a fallback
 *  scan that finished inside the cap. `truncated: true` — `count` is a LOWER
 *  BOUND (10,000 rows, the fallback cap); the true total is at least that. Render it
 *  as "10,000+", and do not treat it as the last page when paginating: a
 *  `rows.length < count` gate goes false while rows remain.
 *
 * @category indexing
 */
export type CountResult = {
    /** Rows matched, or the fallback cap (10,000) when `truncated`. */
    count: number;
    /** True when the bounded fallback hit its cap, so `count` is a lower bound. */
    truncated: boolean;
};
/** The entities an SDK count reads. Each owns one {@link CountDocuments} pair. */
export type CountTable = "Market" | "Operator" | "Venue" | "Order" | "Fill";
/**
 *  The two generated documents that count one entity, plus that entity's name
 *  for error messages.
 *
 *  - `aggregate` selects `total: <table>_aggregate(where: $where) { aggregate { count } }`.
 *    Only a privileged role has this field.
 *  - `fallback` selects `rows: <table>(where: $where, limit: $limit) { id }`. The
 *    public role has this field.
 *
 *  Both select `_sdkWatermark`, so codegen also emits the variant without it
 *  (`legacyDocuments`). Every text a count can send is then a fixed, named
 *  document, which a Hasura query allowlist can list.
 *
 *  The `total` and `rows` aliases give every entity the same result shape. The
 *  owning module declares the pair with its entity's `bool_exp` type, so a
 *  document whose `where` type does not match fails `pnpm typecheck`.
 */
/**
 *  The `_sdkWatermark` row a count document selects. Requiring it in
 *  {@link CountDocuments} makes a document without it fail typecheck, so both
 *  the observed and the legacy variant always exist.
 */
type Watermark = {
    chain_id: number | null;
    latest_processed_block: number | null;
};
export interface CountDocuments<TWhere> {
    /**
     *  The counted entity's Hasura root field name. Load-bearing:
     *  {@link aggregateCountBounded} matches `<table>_aggregate` in Hasura's
     *  missing-field error and keys the owner's capability memory on it. A value
     *  that differs from the root field the documents select makes every public
     *  count throw instead of falling back.
     */
    readonly table: CountTable;
    readonly aggregate: TypedDocument<{
        _sdkWatermark: readonly Watermark[];
        total: {
            aggregate: {
                count: number;
            } | null;
        };
    }, {
        where: TWhere;
    }>;
    readonly fallback: TypedDocument<{
        _sdkWatermark: readonly Watermark[];
        rows: readonly {
            id: string;
        }[];
    }, {
        where: TWhere;
        limit: number;
    }>;
}
/**
 *  What one owner knows about `_aggregate` for one endpoint, header set and
 *  table. `probing` holds the first detection so concurrent counts wait for it
 *  instead of sending the same failing probe. `absent` expires, so a role that
 *  gains the field is used again without a new client.
 */
export type AggregateSupport = {
    readonly kind: "probing";
    readonly done: Promise<void>;
} | {
    readonly kind: "present";
} | {
    readonly kind: "absent";
    readonly until: number;
};
/**
 *  The owner's {@link AggregateSupport} entries. `clear()` (from `stopLive()`)
 *  also advances `generation`, so a probe sent before the reset cannot record
 *  its result after it.
 */
export declare class AggregateSupportMap extends Map<string, AggregateSupport> {
    generation: number;
    clear(): void;
}
/** How long a proven `_aggregate` absence skips the probe (5 min). `stopLive()` clears it sooner. */
export declare const AGGREGATE_ABSENCE_TTL_MS: number;
/**
 *  Count rows via Hasura `_aggregate` (O(1)). envio exposes `_aggregate` only to
 *  a privileged role, reached by sending a Hasura admin-secret header
 *  (`ClientConfig.indexerHeaders`, server-only). When that header is present this
 *  is a single fast count. When it is NOT — the request lands on the public role,
 *  where the aggregate field does not exist and Hasura returns
 *  `field 'X_aggregate' not found in type: 'query_root'` — we fall back to a
 *  BOUNDED row count so the caller still gets a total (accurate up to
 *  {@link COUNT_FALLBACK_CAP}) instead of throwing and blanking the page. Any
 *  other error (bad filter, indexer down) still surfaces.
 *
 *  THE ABSENCE IS REMEMBERED PER OWNER. With a client context, that exact
 *  Hasura error marks the table absent for the endpoint and header set for
 *  {@link AGGREGATE_ABSENCE_TTL_MS}; counts in that window send only the
 *  fallback. Concurrent first counts share one probe. Any other failure records
 *  nothing and still throws. A different table, header set, endpoint or client
 *  probes on its own. `stopLive()` clears the memory, and an expired entry
 *  probes again, so a permission change is picked up without a new client.
 *
 *  Both paths send generated documents that the owning concept module declares
 *  (see {@link CountDocuments}), so the query text never depends on the call.
 *
 *  THE FALLBACK IS BOUNDED, AND SAYS SO. A scan capped at N rows returns N both
 *  for "exactly N" and for "millions", so it asks for
 *  {@link COUNT_FALLBACK_CAP} + 1 and reads the extra row as the truncation
 *  signal — see {@link CountResult}. The probe row is never counted. Hasura
 *  truncates silently at the role's row ceiling, so that ceiling must stay above
 *  the probe limit: at or below the cap, "at least the cap" reads as an exact
 *  count.
 */
export declare function aggregateCountBounded<TWhere>(documents: CountDocuments<TWhere>, where: NoInfer<TWhere>, indexerUrl: Source, headers?: Record<string, string>): Promise<CountResult>;
/**
 *  {@link aggregateCountBounded} with the exactness signal dropped — the total
 *  as a plain number, which past the cap is a LOWER BOUND reported as if it were
 *  exact. Prefer `aggregateCountBounded` in new code; this exists so the six
 *  count helpers keep returning `number`.
 */
export declare function aggregateCount<TWhere>(documents: CountDocuments<TWhere>, where: NoInfer<TWhere>, indexerUrl: Source, headers?: Record<string, string>): Promise<number>;
/**
 *  Narrow an indexer row to a public type that is stricter than the schema.
 *
 *  Hasura must declare every market-type-specific column nullable — a column has
 *  to be null for the OTHER market types — and it types object relationships
 *  (`market`) nullable even when the owning row's `market_id` is `String!`. A
 *  query filtered to BINARY rows (or reading a binary-only entity such as
 *  `OutcomeBalance`) therefore receives non-null values the SCHEMA still calls
 *  nullable.
 *
 *  Two shapes of that gap, both unprovable by GraphQL:
 *
 *  - NULLABILITY a query's own filter guarantees (a BINARY-scoped query's binary
 *    columns; an object relationship whose owning `*_id` is non-null);
 *  - a VALUE SET the indexer controls but the column does not declare (e.g.
 *    `PoolBinding.closedBy`, a `String` the handlers only ever set to "Rotated" /
 *    "Released").
 *
 *  Same treatment as {@link toMarket}: one named seam instead of scattered casts,
 *  so every place trusting the indexer's handlers is greppable. Field NAMES and
 *  WIRE TYPES stay compiler-checked either side of it.
 *
 *  Verified against the live indexer: `OutcomeBalance` rows are BINARY-only, with
 *  non-null `market`/`asset`/`question`. The spot equivalents are scoped the same
 *  way (`market: {marketType: {_eq: "SPOT"}}`, or a registry-scoped StopOrder).
 */
export declare function narrowIndexerInvariant<T>(rows: readonly unknown[]): T[];
export {};
