// The GraphQL-over-HTTP boundary shared by the typed indexer reads,
// snapshot.ts hydration, and priceFeed/query.ts. Its cancellation primitives
// also govern client-owned read lifecycles and indexed-block waits.
//
// Each indexer speaker had its own copy of "POST, check res.ok, check json.errors,
// check json.data" throwing raw Errors. One shared funnel means one place
// decides what a failed indexer read looks like to a caller — an IndexerError
// naming the operation, with the original in `cause`.
//
// The absence-vs-failure contract lives ABOVE this helper: every throw here means
// "the read did not complete". A read that completes and finds nothing returns
// its empty data upward, where the caller turns it into `null` / `[]`.
//
// It also owns how hard one client may push an endpoint: the governor below is
// the one place deciding in-flight cap, circuit breaker and backoff, so concept
// modules inherit it rather than reproducing transport policy (SDK-IO-001).
// Governor state is per-owner, never module-global (SDK-ARCH-002). See SMK-460.
import { IndexerError, IndexerUnavailableError, InvalidInputError } from "./errors.js";
import * as Config from "./config.js";
/** Reads the operation name out of a GraphQL document, for the error message. */
export function operationNameOf(query) {
    return query.match(/(?:query|mutation|subscription)\s+(\w+)/)?.[1] ?? "anonymous";
}
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
export function linkSignals(...signals) {
    const inputs = signals.filter((signal) => signal !== undefined);
    const dispose = () => undefined;
    if (inputs.length === 0)
        return { signal: undefined, dispose };
    if (inputs.length === 1)
        return { signal: inputs[0], dispose };
    // A pre-aborted input wins before fallback listeners are registered. This
    // keeps its reason and does not retain the other lifecycle.
    const aborted = inputs.find((signal) => signal.aborted);
    if (aborted) {
        const controller = new AbortController();
        controller.abort(aborted.reason);
        return { signal: controller.signal, dispose };
    }
    if (typeof AbortSignal.any === "function") {
        return { signal: AbortSignal.any(inputs), dispose };
    }
    const controller = new AbortController();
    const listeners = inputs.map((signal) => {
        const forward = () => {
            controller.abort(signal.reason);
            removeListeners();
        };
        signal.addEventListener("abort", forward, { once: true });
        return { signal, forward };
    });
    function removeListeners() {
        for (const listener of listeners)
            listener.signal.removeEventListener("abort", listener.forward);
    }
    return {
        signal: controller.signal,
        dispose: removeListeners,
    };
}
/** Wait for a timer while preserving a caller's cancellation reason. */
export function abortableDelay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason);
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        function onAbort() {
            clearTimeout(timer);
            reject(signal?.reason);
        }
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}
/** Build a timeout signal in runtimes that predate `AbortSignal.timeout`. */
function timeoutSignal(timeoutMs) {
    if (typeof AbortSignal.timeout === "function") {
        return { signal: AbortSignal.timeout(timeoutMs), dispose: () => undefined };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
        const reason = new Error(`The operation timed out after ${timeoutMs} ms`);
        reason.name = "TimeoutError";
        controller.abort(reason);
    }, timeoutMs);
    return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}
function signalFor(options) {
    const timeout = options.timeoutMs === undefined ? undefined : timeoutSignal(options.timeoutMs);
    const linked = linkSignals(options.signal, timeout?.signal);
    return {
        signal: linked.signal,
        dispose: () => {
            linked.dispose();
            timeout?.dispose();
        },
    };
}
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
export async function postGraphql(endpoint, query, variables, options = {}) {
    const operation = options.label ?? operationNameOf(query);
    // No governor (standalone concept tests, the price feed's own Hasura): one
    // attempt, no gates, exactly as before.
    if (!options.governor)
        return attemptGraphql(endpoint, query, variables, options, operation);
    return options.governor.run(operation, () => attemptGraphql(endpoint, query, variables, options, operation), options.signal);
}
/** One POST, no gates — `postGraphql` as it was before SMK-460. */
async function attemptGraphql(endpoint, query, variables, options, operation) {
    const combined = signalFor(options);
    try {
        let res;
        try {
            res = await fetch(endpoint, {
                method: "POST",
                headers: { "content-type": "application/json", ...options.headers },
                body: JSON.stringify({ query, variables }),
                // Never let a framework fetch cache stand between the indexer and the UI —
                // Next.js would otherwise serve a stale response to `router.refresh()`.
                // Indexer reads are always point-in-time.
                cache: "no-store",
                signal: combined.signal,
            });
        }
        catch (cause) {
            // A caller-requested cancellation is not an indexer failure. Surface their
            // abort as-is so `name === "AbortError"` checks and React's
            // "ignore the aborted render" idiom keep working; anything else is ours.
            if (options.signal?.aborted)
                throw options.signal.reason;
            throw new IndexerError(operation, cause instanceof Error ? cause.message : String(cause), { cause });
        }
        // A response can win the transport race after its lifecycle ended. Apply
        // cancellation before classifying HTTP status so the caller's exact reason
        // and the SDK-owned deadline keep their documented precedence.
        throwIfCancelled(operation, options.signal, combined.signal);
        if (!res.ok)
            throw new IndexerError(operation, `HTTP ${res.status}`);
        let json;
        let responseBytes;
        try {
            if (options.onResponseBytes) {
                // Only a caller that checks a response ceiling reads the body as text to measure it.
                const text = await res.text();
                responseBytes = new TextEncoder().encode(text).byteLength;
                json = JSON.parse(text);
            }
            else {
                json = await res.json();
            }
        }
        catch (cause) {
            throwIfCancelled(operation, options.signal, combined.signal);
            throw new IndexerError(operation, "response was not JSON", { cause });
        }
        // Parsing can finish after the owner has cancelled the read or after the
        // SDK-owned deadline. Caller cancellation keeps precedence and its exact
        // reason; a deadline remains an indexer failure.
        throwIfCancelled(operation, options.signal, combined.signal);
        const data = decodeEnvelope(json, operation);
        // Report the size of the admitted response only, just before the read returns.
        if (responseBytes !== undefined)
            options.onResponseBytes?.(responseBytes);
        return data;
    }
    finally {
        combined.dispose();
    }
}
/** Admit only the envelope fields this boundary consumes; concepts validate their selected data. */
function decodeEnvelope(value, operation) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        invalidEnvelope(operation, "response", value);
    if ("errors" in value) {
        const errors = value.errors;
        if (!Array.isArray(errors))
            invalidEnvelope(operation, "response.errors", errors);
        for (let index = 0; index < errors.length; index++) {
            const error = errors[index];
            const path = `response.errors[${index}]`;
            if (!error || typeof error !== "object" || Array.isArray(error))
                invalidEnvelope(operation, path, error);
            if (!("message" in error) || typeof error.message !== "string") {
                invalidEnvelope(operation, `${path}.message`, "message" in error ? error.message : undefined);
            }
        }
        const first = errors[0];
        if (first && typeof first === "object" && "message" in first && typeof first.message === "string") {
            // Preserve Hasura wording for capability and retry classification, plus the parsed server evidence.
            throw new IndexerError(operation, first.message, { cause: first });
        }
    }
    if (!("data" in value))
        invalidEnvelope(operation, "data", undefined, "empty response (no data)");
    const data = value.data;
    if (data === null || data === undefined)
        invalidEnvelope(operation, "data", data, "empty response (no data)");
    if (typeof data !== "object" || Array.isArray(data))
        invalidEnvelope(operation, "data", data);
    // Envelope admission proves the container only; the owning concept refines T's selected fields.
    return data;
}
function invalidEnvelope(operation, path, value, message = "invalid GraphQL response") {
    throw new IndexerError(operation, message, {
        cause: new TypeError(`invalid GraphQL response field: ${path}`, { cause: value }),
    });
}
/** Preserve caller precedence while classifying an SDK-owned deadline. */
function throwIfCancelled(operation, caller, combined) {
    if (caller?.aborted)
        throw caller.reason;
    if (!combined?.aborted)
        return;
    const cause = combined.reason;
    throw new IndexerError(operation, cause instanceof Error ? cause.message : String(cause), { cause });
}
/**
 *  Postgres's text when `statement_timeout` cancels a query (SQLSTATE 57014).
 *  Hasura can relay it as a GraphQL error; the API role has a 10 s timeout.
 */
const STATEMENT_TIMEOUT = "canceling statement due to statement timeout";
/**
 *  True when the endpoint failed to answer in time or said it is overloaded
 *  (HTTP 429, 502, 503, 504, or Postgres's statement timeout), rather than
 *  answering with a rejection. Only these open the breaker and are retried: a 400 or a GraphQL validation error
 *  is the query's fault and proves the endpoint is alive.
 */
export function isEndpointFailure(e) {
    if (!(e instanceof IndexerError))
        return false;
    // Our own local refusal never counts as evidence about the endpoint.
    if (e instanceof IndexerUnavailableError)
        return false;
    // A transport failure chains its error as `cause`: AbortSignal.timeout's
    // "TimeoutError", or a fetch failure whose own cause is a connect timeout.
    for (let c = e.cause, depth = 0; c instanceof Error && depth < 4; c = c.cause, depth++) {
        if (c.name === "TimeoutError" || c.name === "AbortError" || /timed? ?out|timeout/i.test(c.message))
            return true;
    }
    // Match only detail the boundary writes, anchored at the end, so neither the
    // operation name nor GraphQL prose (`Unknown argument "timeout"`) can match.
    return /failed: HTTP (429|502|503|504)$/.test(e.message) || e.message.endsWith(`failed: ${STATEMENT_TIMEOUT}`);
}
/**
 *  A configured count, or its default. Rejects a value that would make the
 *  governor unusable — `maxInFlight: 0` or `NaN` fails every slot check, so
 *  each read queues and nothing ever releases a slot to admit it — and any
 *  fraction, which the slot and attempt checks silently round up.
 */
function count(value, fallback, field) {
    if (value === undefined)
        return fallback;
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new InvalidInputError(`indexerLimits.${field} must be an integer >= 1, got ${value}`);
    }
    return value;
}
/**
 *  Build the endpoint governor for one configured client. State lives in this
 *  closure, so two clients on one endpoint stay independent (SDK-ARCH-002).
 *
 *  Per attempt: breaker (open ⇒ fail fast, sending nothing), then the in-flight
 *  cap (queue locally, holding no connection), then retry — endpoint failures only, while
 *  attempts remain, after a jittered backoff. A caller's abort skips every gate
 *  and updates no counter (SDK-IO-003).
 */
export function makeEndpointGovernor(limits = {}) {
    const maxInFlight = count(limits.maxInFlight, Config.DEFAULT_INDEXER_LIMITS.maxInFlight, "maxInFlight");
    const breakerThreshold = count(limits.breakerThreshold, Config.DEFAULT_INDEXER_LIMITS.breakerThreshold, "breakerThreshold");
    const breakerCooldownMs = Config.positiveDelay(limits.breakerCooldownMs, Config.DEFAULT_INDEXER_LIMITS.breakerCooldownMs, "breakerCooldownMs");
    const maxAttempts = count(limits.maxAttempts, Config.DEFAULT_INDEXER_LIMITS.maxAttempts, "maxAttempts");
    const maxQueued = count(limits.maxQueued, Config.DEFAULT_INDEXER_LIMITS.maxQueued, "maxQueued");
    // Rejected here too, not just in the backoff helper: a bad delay bound
    // should fail when the client is built, not on the first retry under load.
    Config.positiveDelay(limits.baseDelayMs, Config.DEFAULT_INDEXER_LIMITS.baseDelayMs, "baseDelayMs");
    Config.positiveDelay(limits.maxDelayMs, Config.DEFAULT_INDEXER_LIMITS.maxDelayMs, "maxDelayMs");
    const queue = [];
    /** Reads sleeping out a backoff. Owned here so close() ends them rather than let them send after it. */
    const sleeping = new Set();
    let inFlight = 0;
    let consecutiveFailures = 0;
    /** Epoch ms the cooling period ends; 0 means the breaker is closed. */
    let openUntil = 0;
    /** True while the one half-open trial read is on the wire. */
    let trialRunning = false;
    /** Bumped each time the breaker opens; an attempt admitted in an older epoch is stale. */
    let epoch = 0;
    /** Bumped each time the owner resets live reads; older runs may finish, but never retry. */
    let lifecycle = 0;
    /** Refusal factory from the most recent owner reset. */
    let makeLifecycleReason;
    /**
     *  Queues `start` for the next free slot. `refused` runs if the read is shed,
     *  aborted or drained before it starts.
     *
     *  `start` runs synchronously inside `release()`, when the slot is handed
     *  over. Deferring it to a `.then` would leave a microtask in which the read
     *  is off the queue but not yet sent, where neither a breaker opening nor
     *  close() can see it, and it would send regardless.
     */
    const acquire = (operation, signal, start, refused) => {
        if (queue.length >= maxQueued) {
            refused();
            // Shed rather than grow a backlog: a queued read holds memory and a
            // caller's promise for as long as the endpoint stays slow.
            return Promise.reject(new IndexerUnavailableError(operation, "queue-full", `${queue.length} reads already queued for a slot`, 0, consecutiveFailures));
        }
        return new Promise((resolve, reject) => {
            if (signal?.aborted) {
                refused();
                reject(signal.reason);
                return;
            }
            let onAbort;
            const waiter = {
                operation,
                admit: () => {
                    if (signal && onAbort)
                        signal.removeEventListener("abort", onAbort);
                    inFlight += 1;
                    resolve(start());
                },
                abort: (reason) => {
                    if (signal && onAbort)
                        signal.removeEventListener("abort", onAbort);
                    refused();
                    reject(reason);
                },
            };
            queue.push(waiter);
            if (signal) {
                onAbort = () => {
                    const at = queue.indexOf(waiter);
                    if (at >= 0)
                        queue.splice(at, 1);
                    waiter.abort(signal.reason);
                };
                signal.addEventListener("abort", onAbort, { once: true });
            }
        });
    };
    /** Backoff sleep that a caller's abort or the owner's close cuts short. */
    const backoff = (operation, ms, signal) => new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason);
            return;
        }
        const onAbort = () => waiter.abort(signal?.reason);
        const finish = () => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", onAbort);
            sleeping.delete(waiter);
        };
        const waiter = {
            operation,
            admit: () => {
                finish();
                resolve();
            },
            abort: (reason) => {
                finish();
                reject(reason);
            },
        };
        const timer = setTimeout(waiter.admit, ms);
        signal?.addEventListener("abort", onAbort, { once: true });
        sleeping.add(waiter);
    });
    const release = () => {
        inFlight -= 1;
        queue.shift()?.admit();
    };
    /** The owner reset this run's lifecycle after it started. */
    const lifecycleAdvanced = (startedIn) => startedIn !== lifecycle;
    /** Refusal from the most recent owner reset, per operation. */
    const lifecycleReason = (operation) => makeLifecycleReason?.(operation) ??
        new IndexerUnavailableError(operation, "live-reset", "live reads reset", 0, consecutiveFailures);
    /** Throws if the breaker refuses. Returns true when this attempt owns the half-open trial. */
    const admit = (operation) => {
        if (openUntil === 0)
            return false;
        const retryAfterMs = openUntil - Date.now();
        if (retryAfterMs > 0) {
            throw new IndexerUnavailableError(operation, "breaker-open", `circuit breaker open after ${consecutiveFailures} consecutive endpoint failures`, retryAfterMs, consecutiveFailures);
        }
        if (trialRunning) {
            throw new IndexerUnavailableError(operation, "breaker-trial", "circuit breaker half-open, trial read in flight", 0, consecutiveFailures);
        }
        trialRunning = true;
        return true;
    };
    /** Drains every waiter, each refused under its own operation (SDK-ERR-004). */
    const drain = (reason, detail, retryAfterMs) => {
        while (queue.length > 0) {
            const waiter = queue.shift();
            if (waiter) {
                waiter.abort(new IndexerUnavailableError(waiter.operation, reason, detail, retryAfterMs, consecutiveFailures));
            }
        }
    };
    /**
     *  Feeds a settled attempt into the breaker; `failure` is undefined on success.
     *
     *  `admittedIn` is what keeps the half-open state honest. An attempt admitted
     *  before the breaker opened can settle after it, even after the trial has
     *  closed it again. Its evidence predates that decision either way: a late
     *  success must not close the breaker, and a late timeout must not extend
     *  the cooling period or count toward reopening it. So a stale attempt
     *  records nothing.
     */
    const record = (failure, isTrial, admittedIn) => {
        if (isTrial)
            trialRunning = false;
        if (admittedIn !== epoch)
            return;
        if (failure !== undefined && isEndpointFailure(failure)) {
            consecutiveFailures += 1;
            if (consecutiveFailures >= breakerThreshold) {
                openUntil = Date.now() + breakerCooldownMs;
                epoch += 1;
                // Queued reads passed the breaker while it was closed; drain them, or a
                // dead endpoint still gets the backlog one freed slot at a time.
                drain("breaker-open", `circuit breaker open after ${consecutiveFailures} consecutive endpoint failures`, breakerCooldownMs);
            }
            return;
        }
        // The endpoint answered — even a rejection proves it is serving. Only the
        // trial can get here while the breaker is open: every other current attempt
        // was admitted while it was closed.
        consecutiveFailures = 0;
        openUntil = 0;
    };
    return {
        run(operation, send, signal) {
            // Not async on purpose: with a free slot and a closed breaker `send` must
            // run in THIS tick — one `await` defers the fetch by a microtask, and
            // callers rely on the read being on the wire when `run` returns.
            const startedIn = lifecycle;
            const settle = (n, isTrial, admittedIn) => {
                let sent;
                try {
                    sent = send();
                }
                catch (e) {
                    // Record before release: release admits the next queued read, which
                    // must be drained rather than sent if this failure opens the breaker.
                    record(e, isTrial, admittedIn);
                    release();
                    return Promise.reject(e);
                }
                return sent.then((value) => {
                    record(undefined, isTrial, admittedIn);
                    release();
                    return value;
                }, (e) => {
                    // Cancellation says nothing about the endpoint (SDK-IO-003).
                    if (signal?.aborted) {
                        if (isTrial)
                            trialRunning = false;
                        release();
                        throw e;
                    }
                    record(e, isTrial, admittedIn);
                    release();
                    if (lifecycleAdvanced(startedIn))
                        throw e;
                    if (!isEndpointFailure(e) || n + 1 >= maxAttempts)
                        throw e;
                    // Full jitter, so retrying clients do not line up.
                    return backoff(operation, Config.nextBackoffDelayMs(n, Math.random(), limits), signal)
                        .then(() => attempt(n + 1))
                        .catch((later) => {
                        // A gate refusing the retry sent nothing, so it cannot stand for
                        // a read that already reached the endpoint: the caller gets this
                        // attempt's failure (SDK-ERR-003/004). `live-reset` is a
                        // lifecycle signal the caller must see, so it passes. Caught
                        // outside the `.then`: `admit` throws synchronously.
                        if (later instanceof IndexerUnavailableError && later.reason !== "live-reset")
                            throw e;
                        throw later;
                    });
                });
            };
            const attempt = (n) => {
                // Cancellation short-circuits every gate: an aborted caller gets their
                // own reason, never a breaker refusal, and nothing is sent (SDK-IO-003).
                if (signal?.aborted)
                    return Promise.reject(signal.reason);
                if (lifecycleAdvanced(startedIn))
                    return Promise.reject(lifecycleReason(operation));
                const isTrial = admit(operation);
                // A read still queued when the breaker opens is drained, so the epoch
                // it queued in is the one it is sent in.
                const admittedIn = epoch;
                if (inFlight < maxInFlight) {
                    inFlight += 1;
                    return settle(n, isTrial, admittedIn);
                }
                return acquire(operation, signal, () => settle(n, isTrial, admittedIn), () => {
                    // Never reached the wire, so it never became the trial.
                    if (isTrial)
                        trialRunning = false;
                });
            };
            // `admit` throws. Later attempts run inside `.then`, which converts that
            // to a rejection; the first does not, and `run` must reject, not throw.
            try {
                return attempt(0);
            }
            catch (e) {
                return Promise.reject(e);
            }
        },
        close(makeReason) {
            lifecycle += 1;
            makeLifecycleReason = makeReason;
            while (queue.length > 0) {
                const waiter = queue.shift();
                if (waiter)
                    waiter.abort(makeReason(waiter.operation));
            }
            for (const waiter of sleeping)
                waiter.abort(makeReason(waiter.operation));
        },
        stats() {
            return {
                inFlight,
                queued: queue.length,
                consecutiveFailures,
                // Also true mid-trial: `openUntil` has elapsed by then, but every read
                // except the trial is still refused, and this field means "refusing".
                breakerOpen: openUntil > Date.now() || trialRunning,
            };
        },
    };
}
