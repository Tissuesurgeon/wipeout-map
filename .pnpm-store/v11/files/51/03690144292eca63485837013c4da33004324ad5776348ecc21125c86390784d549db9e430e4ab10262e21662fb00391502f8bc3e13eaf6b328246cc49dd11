import type { IndexerLimits } from "./config.js";
/** Reads the operation name out of a GraphQL document, for the error message. */
export declare function operationNameOf(query: string): string;
/**
 *  Combine owner, caller and timeout lifecycles without changing one signal's
 *  identity or cancellation reason.
 *
 *  `AbortSignal.any` combines them where available (Node 20.3+, current
 *  browsers). This package declares no `engines` floor and ships to browsers, so
 *  older runtimes use an equivalent local controller. A pre-aborted input wins
 *  before any listener is registered; the disposer releases fallback listeners
 *  when the linked operation ends.
 */
export declare function linkSignals(...signals: (AbortSignal | undefined)[]): {
    signal?: AbortSignal;
    dispose: () => void;
};
/** Wait for a timer while preserving a caller's cancellation reason. */
export declare function abortableDelay(ms: number, signal?: AbortSignal): Promise<void>;
/**
 *  POSTs a GraphQL request and returns its `data`, throwing {@link IndexerError}
 *  on any failure to complete.
 *
 * **Details**
 *
 * - `endpoint`: Absolute URL of the GraphQL endpoint.
 * - `query`: The document text (its operation name is used in errors).
 * - `variables`: Variables for the document.
 * - `options`: `headers` merged into the request; `timeoutMs` bounds it; `signal` cancels it (combined with `timeoutMs` — whichever fires first wins); `label` overrides the operation name in error messages (use it when the endpoint is not the main indexer, e.g. `"price-feed getCandles"`).
 * - `options.governor`: The owning client's {@link EndpointGovernor}. When supplied the read passes the in-flight cap, the circuit breaker, and the retry schedule; when omitted the request is sent unguarded, exactly as before.
 * - `options.onResponseBytes`: Receives the size of the response whose `data` is returned: the UTF-8 byte length of its body, as the indexer's own reader measures it. It is called once, just before the read returns. A read that fails reports no size. Without it, the body is parsed as JSON directly.
 * - Returns: The response's `data` payload.
 *
 * **Gotchas**
 *
 * - Throws {@link IndexerError} — the request failed, returned a non-2xx, replied with a GraphQL `errors` payload, or carried a malformed envelope. A decode failure chains a `TypeError` with the invalid parsed value and field path. A valid GraphQL error retains its parsed error object in `cause` and its server wording in the message (see `aggregateCount`'s missing-`_aggregate` fallback).
 * - Throws {@link IndexerUnavailableError} (a subclass of {@link IndexerError}) — a `governor` was supplied and refused locally: its breaker is open or trialling, its queue is full, or its owner closed. `reason` says which gate refused and what to do next. For `breaker-open`, `breaker-trial` and `queue-full`, nothing reached the network: when a gate refuses a retry after an earlier attempt was sent, you get that attempt's {@link IndexerError} instead. A `live-reset` can end a retry's backoff, so it does not promise that no attempt was sent.
 * - Throws The caller's own abort reason, re-thrown UNWRAPPED when `signal` is what ended the request — a cancellation is not an indexer failure, and code that checks `err.name === "AbortError"` (or compares against its own `controller.signal.reason`) must still see it. A `timeoutMs` expiry is a failure and stays an {@link IndexerError}.
 */
export declare function postGraphql<T>(endpoint: string, query: string, variables: Record<string, unknown>, options?: {
    headers?: Record<string, string>;
    timeoutMs?: number;
    signal?: AbortSignal;
    label?: string;
    governor?: EndpointGovernor;
    onResponseBytes?: (bytes: number) => void;
}): Promise<T>;
/** What the governor is currently doing, for tests and diagnostics. */
export interface GovernorStats {
    /** Reads on the wire right now. */
    inFlight: number;
    /** Reads waiting locally for a slot. */
    queued: number;
    /** Endpoint failures (timeouts and overload responses) since the last answer of any kind. */
    consecutiveFailures: number;
    /** True while the breaker is refusing reads, the half-open trial included. */
    breakerOpen: boolean;
}
/**
 *  One client's gate onto one endpoint. Shared by every read that client makes,
 *  so the counters describe its whole load.
 */
export interface EndpointGovernor {
    /** Runs `send` under all three gates. Throws {@link IndexerUnavailableError} if the breaker refused. */
    run<T>(operation: string, send: () => Promise<T>, signal?: AbortSignal): Promise<T>;
    /**
     *  Rejects every queued waiter and every read sleeping out a backoff, so none
     *  sends after its owner closed; the owner calls this on close (SDK-OWN-004).
     *  Takes a factory, not one error: a queued `listMarkets` must be refused
     *  under its OWN operation, not the closer's (SDK-ERR-004).
     */
    close(makeReason: (operation: string) => unknown): void;
    /** Current counters. */
    stats(): GovernorStats;
}
/**
 *  True when the endpoint failed to answer in time or said it is overloaded
 *  (HTTP 429, 502, 503, 504, or Postgres's statement timeout), rather than
 *  answering with a rejection. Only these open the breaker and are retried: a 400 or a GraphQL validation error
 *  is the query's fault and proves the endpoint is alive.
 */
export declare function isEndpointFailure(e: unknown): boolean;
/**
 *  Build the endpoint governor for one configured client. State lives in this
 *  closure, so two clients on one endpoint stay independent (SDK-ARCH-002).
 *
 *  Per attempt: breaker (open ⇒ fail fast, sending nothing), then the in-flight
 *  cap (queue locally, holding no connection), then retry — endpoint failures only, while
 *  attempts remain, after a jittered backoff. A caller's abort skips every gate
 *  and updates no counter (SDK-IO-003).
 */
export declare function makeEndpointGovernor(limits?: IndexerLimits): EndpointGovernor;
