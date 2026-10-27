// The typed-read plumbing every indexer-backed concept module shares.
//
// `gqlRequest` takes a GENERATED typed document only, so a selection, filter or
// sort the indexer does not have fails `pnpm gql:codegen` / `pnpm typecheck`
// rather than throwing per call at runtime. The transport underneath is
// graphqlBoundary.ts (which turns any failure-to-complete into IndexerError);
// this module is the typed door onto it, plus the small helpers every concept
// needs to build a Hasura `where`.
//
// A LEAF module by design: it imports the boundary and the generated types, and
// nothing else in src/ — so no concept module can create a cycle through it.
import * as LegacyDocuments from "./gql/legacyDocuments.js";
import * as GraphqlBoundary from "./graphqlBoundary.js";
import { IndexerError, IndexerUnavailableError, InvalidInputError, NotConfiguredError } from "./errors.js";
/**
 *  Default per-request ceiling (ms) so a hung/unreachable indexer surfaces a
 *  timeout instead of a promise that never settles.
 */
const GQL_TIMEOUT_MS = 30_000;
/**
 *  Recursively collect dotted paths of variable values `JSON.stringify` would
 *  silently drop (`undefined`) or that a Next.js `"use client"` boundary rewrote
 *  into a throwing stub (`function`). Walking nested objects catches the subtle
 *  case too: a `where` sub-object with `{ _eq: undefined }` — which would
 *  serialize away and collapse the filter to `IS NULL`, silently dropping rows.
 */
function findBadVariablePaths(value, path, out) {
    if (value === undefined) {
        out.push(`${path}=undefined`);
        return;
    }
    if (typeof value === "function") {
        out.push(`${path}=<client-boundary stub function>`);
        return;
    }
    if (value === null || typeof value !== "object")
        return;
    if (Array.isArray(value)) {
        value.forEach((v, i) => findBadVariablePaths(v, `${path}[${i}]`, out));
        return;
    }
    for (const [k, v] of Object.entries(value)) {
        findBadVariablePaths(v, path ? `${path}.${k}` : k, out);
    }
}
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
export async function gqlRequest(document, variables, indexerUrl, headers, context) {
    const observed = typeof indexerUrl !== "string" && indexerUrl.observe;
    const text = document.toString();
    const operation = operationName(text);
    const query = !observed && operation ? (LegacyDocuments.legacyDocuments[operation] ?? text) : text;
    return sendGraphql(query, variables, indexerUrl, headers, context);
}
/** The operation name a query text declares, which `IndexerError.operation` reports. */
function operationName(query) {
    return query.match(/query\s+(\w+)/)?.[1];
}
async function sendGraphql(query, variables, indexerUrl, headers, context) {
    // Fail fast with the query name + the dotted path of the bad variable so the
    // call site (not an opaque Hasura wire error) surfaces first. Deep-walks the
    // variables — see findBadVariablePaths for the two failure modes it catches.
    const operation = operationName(query) ?? "anonymous";
    const bad = [];
    for (const [k, v] of Object.entries(variables))
        findBadVariablePaths(v, k, bad);
    // A bad variable is the CALLER's mistake, caught before the request goes out —
    // so it is InvalidInputError, not IndexerError (which always means "the read
    // didn't complete").
    if (bad.length) {
        throw new InvalidInputError(`gqlRequest(${operation}): unusable variable(s): ${bad.join(", ")}`);
    }
    // The request itself goes through the shared indexer boundary, which turns
    // every failure-to-complete into an IndexerError with `cause` chained. It
    // preserves the server's own wording — aggregateCount detects the "aggregate
    // field absent on this role" case by matching Hasura's exact validation text
    // at the end of the message, and that fallback must keep working.
    const owner = typeof indexerUrl === "string" ? undefined : indexerUrl;
    const resolvedUrl = typeof indexerUrl === "string" ? indexerUrl : indexerUrl.url;
    // The one choke point every indexer read funnels through: a client built
    // without an indexer degrades by feature (like a missing address), never
    // by refusing to construct. An empty string counts as absent — the removed
    // construction gate treated it that way, and forwarding "" to the transport
    // would bury the misconfiguration in a fetch error.
    if (!resolvedUrl) {
        throw new NotConfiguredError("config.indexerUrl", `this indexer read (${operation})`);
    }
    // A per-call signal narrows one read; it must not replace the lifecycle of
    // the owner that created the read capability.
    const combined = GraphqlBoundary.linkSignals(owner?.signal, context?.signal);
    try {
        // The check is shared by every read of the owner, so it runs under the
        // owner's lifecycle. This read's own signal only stops this read waiting.
        // The read goes out alongside the check, and its rows wait for the check.
        const binding = owner?.verifyBinding?.();
        const startedAt = Date.now();
        // Taken when the response arrives: on a cold owner the check can settle later,
        // and an observation reports the response, not the wait for the check.
        let completedAt = startedAt;
        const request = GraphqlBoundary.postGraphql(resolvedUrl, query, variables, {
            headers,
            timeoutMs: GQL_TIMEOUT_MS,
            signal: combined.signal,
            governor: owner?.governor,
            onResponseBytes: context?.onResponseBytes,
        }).then((response) => {
            completedAt = Date.now();
            return response;
        });
        const data = await afterBinding(request, binding && abortable(binding, combined.signal));
        const processed = readWatermark(data, owner?.chainId, operation);
        if (owner?.observe) {
            owner.observe(processed, startedAt, completedAt);
        }
        return data;
    }
    finally {
        combined.dispose();
    }
}
/** Validate consumed metadata before observation; absence remains unknown, never a fabricated height. */
function readWatermark(data, chainId, operation) {
    const rows = data._sdkWatermark;
    // Legacy documents omit this selection. Nullable selected scalars do not make the collection nullable.
    if (rows === undefined)
        return null;
    if (!Array.isArray(rows))
        invalidWatermark(operation, "data._sdkWatermark", rows);
    let processed = null;
    let matched = false;
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const path = `data._sdkWatermark[${index}]`;
        if (!row || typeof row !== "object" || Array.isArray(row))
            invalidWatermark(operation, path, row);
        const rowChain = nullableWatermarkInt("chain_id" in row ? row.chain_id : undefined, operation, `${path}.chain_id`);
        const height = nullableWatermarkInt("latest_processed_block" in row ? row.latest_processed_block : undefined, operation, `${path}.latest_processed_block`);
        // Preserve first-match semantics, but admit every consumed row before publishing any observation.
        if (!matched && rowChain === chainId) {
            matched = true;
            processed = height === null ? null : BigInt(height);
        }
    }
    return processed;
}
/** Hasura's nullable Int is a signed 32-bit number or null, with no positivity policy. */
function nullableWatermarkInt(value, operation, path) {
    if (value === null)
        return null;
    if (typeof value !== "number" || !Number.isInteger(value) || value < -2147483648 || value > 2147483647) {
        invalidWatermark(operation, path, value);
    }
    return value;
}
function invalidWatermark(operation, path, value) {
    throw new IndexerError(operation, "invalid indexing watermark", {
        cause: new TypeError(`invalid indexing watermark field: ${path}`, { cause: value }),
    });
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
export async function afterBinding(request, binding) {
    if (!binding)
        return request;
    // The check's failure is the one reported, so the request's own is dropped here.
    request.catch(() => undefined);
    await binding;
    return request;
}
/** Wait for a shared promise, but stop waiting with the caller's abort reason (SDK-IO-003). */
export function abortable(promise, signal) {
    if (!signal)
        return promise;
    if (signal.aborted)
        return Promise.reject(signal.reason);
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
    });
}
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
export function blockLowerBound(value, option) {
    return { _gte: String(blockHeight(value, option)) };
}
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
export function blockUpperBound(value, option) {
    return { _lte: String(blockHeight(value, option)) };
}
/** A caller-supplied block height as an exact JavaScript number, or {@link InvalidInputError}. */
export function blockHeight(value, option) {
    const height = typeof value === "bigint" ? Number(value) : value;
    // `Number(bigint)` rounds silently past 2^53, so the range check has to run on
    // the converted value for both input types.
    if (!Number.isSafeInteger(height) || height < 0 || (typeof value === "bigint" && BigInt(height) !== value)) {
        throw new InvalidInputError(`${option} must be a block height from 0 to ${Number.MAX_SAFE_INTEGER}`);
    }
    return height;
}
/** Row ceiling on the public-role fallback scan. Past this a count is a lower bound. */
export const COUNT_FALLBACK_CAP = 10_000;
/** The operation name of a count document, so a count failure names the query it sent. */
function countOperation(document) {
    // Every count document is named (the legacy-documents codegen step rejects an
    // unnamed one), so the default only mirrors sendGraphql's own label.
    return operationName(document.toString()) ?? "anonymous";
}
/**
 *  The owner's {@link AggregateSupport} entries. `clear()` (from `stopLive()`)
 *  also advances `generation`, so a probe sent before the reset cannot record
 *  its result after it.
 */
export class AggregateSupportMap extends Map {
    generation = 0;
    clear() {
        this.generation++;
        super.clear();
    }
}
/** How long a proven `_aggregate` absence skips the probe (5 min). `stopLive()` clears it sooner. */
export const AGGREGATE_ABSENCE_TTL_MS = 5 * 60_000;
/**
 *  True only for Hasura's validation error for this table's missing aggregate
 *  root field. Other errors that mention "aggregate" or "not found" (a bad
 *  filter, a missing relation, a timeout) are not capability evidence.
 */
function isAggregateFieldAbsent(e, table) {
    if (!(e instanceof IndexerError) || e instanceof IndexerUnavailableError)
        return false;
    // Hasura v2 quotes the field with `'`; v1 used `"`. `table` is a fixed identifier.
    return new RegExp(`: field (['"])${table}_aggregate\\1 not found in type: 'query_root'$`).test(e.message);
}
/** The capability key: endpoint, table and effective role (its headers, in a stable order). */
function aggregateSupportKey(url, table, headers) {
    const role = Object.entries(headers ?? {}).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify([url ?? "", table, role]);
}
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
export async function aggregateCountBounded(documents, where, indexerUrl, headers) {
    const { table } = documents;
    const support = typeof indexerUrl === "string" ? undefined : indexerUrl.aggregateSupport;
    const key = aggregateSupportKey(typeof indexerUrl === "string" ? indexerUrl : indexerUrl.url, table, headers);
    const generation = support?.generation;
    let known = support?.get(key);
    // A detection in flight never rejects. Wait for it once, then re-read.
    const waited = known?.kind === "probing";
    if (known?.kind === "probing") {
        await known.done;
        known = support?.get(key);
    }
    if (known?.kind === "absent" && known.until > Date.now())
        return fallbackCount(documents, where, indexerUrl, headers);
    let settle;
    let probing;
    // A waiter whose shared probe proved nothing probes on its own, in parallel
    // with the other waiters. Chaining a new shared probe would make N waiters
    // fail one after another (N × the failing probe's time).
    if (support && !waited && known?.kind !== "present") {
        probing = { kind: "probing", done: new Promise((resolve) => (settle = resolve)) };
        support.set(key, probing);
    }
    // A reset since this call started (stopLive()) makes its result stale. A
    // prober also replaces only its own entry.
    const record = (next) => {
        if (!support || support.generation !== generation || (probing && support.get(key) !== probing))
            return;
        if (next)
            support.set(key, next);
        else
            support.delete(key);
    };
    // Only the successful aggregate value contributes. A role fallback can also
    // follow a successful response that omitted the aggregate root.
    let aggregateObservation;
    let aggregateSource = indexerUrl;
    if (typeof indexerUrl !== "string" && indexerUrl.observe) {
        aggregateSource = {
            ...indexerUrl,
            observe: (...observation) => {
                aggregateObservation = observation;
            },
        };
    }
    let data;
    try {
        data = await gqlRequest(documents.aggregate, { where }, aggregateSource, headers);
    }
    catch (e) {
        if (!isAggregateFieldAbsent(e, table)) {
            // Not capability evidence: forget the probe so the next count tries again.
            if (probing)
                record(undefined);
            throw e;
        }
        record({ kind: "absent", until: Date.now() + AGGREGATE_ABSENCE_TTL_MS });
        return fallbackCount(documents, where, indexerUrl, headers);
    }
    finally {
        settle?.();
    }
    // The generated type says the field is present, but a response can omit it
    // (a role that hides it). That falls back too, but proves no capability, so
    // the next count probes again.
    const agg = data.total;
    if (!agg?.aggregate) {
        if (probing)
            record(undefined);
        return fallbackCount(documents, where, indexerUrl, headers);
    }
    record({ kind: "present" });
    // The privileged path counts in the database: never truncated.
    if (aggregateObservation && typeof indexerUrl !== "string")
        indexerUrl.observe?.(...aggregateObservation);
    return { count: agg.aggregate.count, truncated: false };
}
/** The bounded public-role row count behind {@link aggregateCountBounded}. */
async function fallbackCount(documents, where, indexerUrl, headers) {
    // Ask for one row MORE than the cap. Its presence is what distinguishes
    // "exactly CAP rows" from "CAP or more", which a scan limited to CAP cannot
    // do — it returns CAP either way.
    const rows = await gqlRequest(documents.fallback, { where, limit: COUNT_FALLBACK_CAP + 1 }, indexerUrl, headers);
    // `?? []` used to stand here, which turned a missing key — a renamed entity,
    // or a role that hides the row field — into `{ count: 0, truncated: false }`:
    // an authoritative "there are none" produced by a read that never saw the
    // rows. A count that did not complete must throw, not resolve to zero.
    const tableRows = rows.rows;
    if (!tableRows)
        throw new IndexerError(countOperation(documents.fallback), `rows (${documents.table}) not found in response`);
    const fetched = tableRows.length;
    return fetched > COUNT_FALLBACK_CAP
        ? { count: COUNT_FALLBACK_CAP, truncated: true }
        : { count: fetched, truncated: false };
}
/**
 *  {@link aggregateCountBounded} with the exactness signal dropped — the total
 *  as a plain number, which past the cap is a LOWER BOUND reported as if it were
 *  exact. Prefer `aggregateCountBounded` in new code; this exists so the six
 *  count helpers keep returning `number`.
 */
export async function aggregateCount(documents, where, indexerUrl, headers) {
    return (await aggregateCountBounded(documents, where, indexerUrl, headers)).count;
}
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
export function narrowIndexerInvariant(rows) {
    return rows;
}
