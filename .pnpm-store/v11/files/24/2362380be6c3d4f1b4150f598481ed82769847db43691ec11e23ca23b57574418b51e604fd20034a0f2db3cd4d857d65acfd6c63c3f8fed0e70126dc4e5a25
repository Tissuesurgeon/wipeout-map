/**
 *  One event on the client's opt-in debug channel — either a structured log
 *  line or one phase of a span. Wire a sink with {@link ClientConfig.debug}
 *  and every event the client produces flows through it.
 *
 *  **Details**
 *
 *  Events are data, not display strings: `data` carries raw values (counts,
 *  addresses, bigints) and rendering/filtering is entirely the sink's job —
 *  see {@link consoleDebugSink} for a ready-made renderer and
 *  {@link debugCollector} for test capture. A span arrives as a `start`/`end`
 *  pair sharing an `id` (unique within one client instance), with any number
 *  of `annotate` events in between attaching data to the still-open span.
 *
 *  The shape maps 1:1 onto OpenTelemetry, so a real tracer is just another
 *  sink: `name` ↔ span name, `data` ↔ attributes, `error` ↔ span status /
 *  recorded exception, `annotate` ↔ `setAttribute`, `parentId` ↔ context
 *  link.
 *
 *  **Gotchas**
 *
 *  Parenting is EXPLICIT — a span event carries `parentId` only when the call
 *  site passed the parent handle — so interleaved events from concurrent
 *  operations always attribute correctly; never infer nesting from event order.
 *
 * **Example** (Handling debug events)
 *
 * A minimal custom sink — narrow on `kind`/`phase` and the union does the rest:
 *
 * ```ts
 * const sink = (e: DebugEvent): void => {
 *   if (e.kind === "log") console.log(e.scope, e.message, e.data);
 *   else if (e.phase === "end" && e.error !== undefined) console.error(e.name, e.error);
 *   else if (e.phase === "end" && e.durationMs > 500) console.log("slow:", e.name, e.durationMs);
 * };
 * const exchange = new SomniaMarkets({ ...config, debug: sink });
 * ```
 *
 * @category logging
 */
export type DebugEvent = {
    kind: "log";
    /** `"warn"` for conditions worth surfacing (a failed watch); `"debug"` for tracing. */
    level: "debug" | "warn";
    /** Emitting module, e.g. `"liveTail"` — filter on it in the sink. */
    scope: string;
    /** Stable, human-readable event description, e.g. `"applying logs"`. */
    message: string;
    /** Raw values for the sink to render (counts, block numbers, addresses, bigints). */
    data?: Record<string, unknown>;
} | {
    kind: "span";
    phase: "start";
    /** Span id — matches the `annotate`/`end` events of the same span. Unique per client. */
    id: number;
    /** The enclosing span's `id`; absent on a root span. Only ever set explicitly. */
    parentId?: number;
    /** Span name, `"<module>.<fn>"` — e.g. `"trade.execute"`, `"trader.placeOrder"`. */
    name: string;
    /** The operation's input, as raw values (a trader call's params object, …). */
    data?: Record<string, unknown>;
} | {
    kind: "span";
    phase: "annotate";
    /** The still-open span this data belongs to. */
    id: number;
    /** The annotated span's name (so sinks need no id → name lookup). */
    name: string;
    /** Values that only exist mid-span — e.g. the tx hash once broadcast returns. */
    data: Record<string, unknown>;
} | {
    kind: "span";
    phase: "end";
    /** Matches the span's `start` event. */
    id: number;
    /** Same name as the `start` event. */
    name: string;
    /** Wall-clock start-to-settle: for an async span, until the promise settles. */
    durationMs: number;
    /** The thrown value / rejection reason when the span failed; absent on success. */
    error?: unknown;
};
/**
 *  Handle for an open span, passed to the `span`/`traced` callback so a call
 *  site can parent a nested span explicitly or annotate it mid-flight.
 *
 * @category logging
 */
export interface Span {
    /**
     *  The span's event id — `0` when debugging is disabled (an inert handle:
     *  no event was emitted for it, and annotating it is a no-op).
     */
    readonly id: number;
    /** The name the span was started with (empty on the inert disabled handle). */
    readonly name: string;
}
/**
 * Per-client debug channel built by {@link makeDebug}.
 *
 * @internal
 */
export interface Debug {
    /** True when a sink is configured — guard expensive payload construction on this. */
    enabled: boolean;
    /** Emit a `debug`-level log event. */
    log(scope: string, message: string, data?: Record<string, unknown>): void;
    /** Emit a `warn`-level log event. */
    warn(scope: string, message: string, data?: Record<string, unknown>): void;
    /**
     *  Run `fn` inside a span: start event before, end event when it settles
     *  (sync return, resolution, throw, or rejection — failures carry the error
     *  and rethrow). The callback receives the span's handle to parent nested
     *  spans; pass `parent` to link this one under an outer span.
     */
    span<T>(name: string, fn: (span: Span) => T, parent?: Span, data?: Record<string, unknown>): T;
    /**
     *  Attach `data` to a still-open span (an `annotate` event) — for values that
     *  only exist mid-span, like a tx hash discovered after broadcast. No-op when
     *  debugging is disabled.
     */
    annotate(span: Span, data: Record<string, unknown>): void;
    /**
     *  Decorator form of {@link Debug.span}: wraps `fn` so every call runs in its
     *  own ROOT span (the returned signature has no parent slot — by design;
     *  traced calls are trace roots). `fn` receives the span as its first
     *  argument to parent nested spans; callers see only `A`. `data` derives the
     *  start event's payload from the call's arguments — it never runs when
     *  debugging is disabled.
     */
    traced<A extends unknown[], R>(name: string, fn: (span: Span, ...args: A) => R, data?: (...args: A) => Record<string, unknown> | undefined): (...args: A) => R;
    /**
     *  Boundary-tracing factory: a Proxy over `target` whose method calls each
     *  run in their own ROOT span named `<prefix>.<method>` — the span data is
     *  the call's first argument (`{ params }` for an options object, `{ args }`
     *  otherwise). The target is never mutated; wrapped methods are cached so
     *  their identity is stable across accesses. When debugging is disabled the
     *  target itself is returned — a wrap costs nothing unless a sink is set.
     */
    tracedObject<T extends object>(prefix: string, target: T): T;
}
/**
 * Builds a client's debug channel from its configured sink. Unset
 *  sink → `enabled: false`, every method a no-op, and `span` runs `fn` directly
 *  without taking timestamps. A sink that throws is swallowed — a broken debug
 *  sink must never break trading.
 *
 * @internal
 */
export declare function makeDebug(sink?: (e: DebugEvent) => void): Debug;
/**
 *  Ready-made console renderer for {@link ClientConfig.debug} — prints the
 *  event stream as an indented span tree, the zero-setup way to watch what a
 *  client is doing.
 *
 *  Output shape — `▶` opens a span, `◀` closes it with its duration, `·` is a
 *  mid-span annotation, and log events print flat with their scope:
 *
 * ```text
 * [sdk] ▶ trader.placeOrder { params: { pool: "0x…", side: "BUY_YES" } }
 * [sdk]   ▶ trade.execute { functionName: "placeBinaryOrder", … }
 * [sdk] liveTail applying logs { received: 3, … }
 * [sdk]     · trade.execute { hash: "0x…" }
 * [sdk]   ◀ trade.execute 38.2ms
 * [sdk] ◀ trader.placeOrder 41.0ms
 * ```
 *
 *  **Details**
 *
 *  Indentation is reconstructed from `parentId`, so trees stay correct when
 *  concurrent operations interleave. `warn`-level logs and failed spans route
 *  to `console.warn`; everything else goes to `console.debug` (in browser
 *  devtools, enable the *Verbose* level to see it).
 *
 * - `opts`: `prefix` replaces the leading `[sdk]` tag on every line — useful to tell two clients apart in one console.
 * - Returns: A sink to pass as {@link ClientConfig.debug}.
 *
 *  **Gotchas**
 *
 *  The sink keeps per-span depth state, so build one per client rather than
 *  sharing an instance.
 *
 *  @see {@link debugCollector} for capturing events in tests instead of printing.
 *
 * **Example** (Enabling console logs)
 *
 * Opt in from devtools without redeploying — `localStorage.setItem("sdk-debug", "1")` and reload:
 *
 * ```ts
 * const exchange = new SomniaMarkets({
 *   ...config,
 *   debug: localStorage.getItem("sdk-debug") ? consoleDebugSink() : undefined,
 * });
 * ```
 *
 * @category logging
 */
export declare function consoleDebugSink(opts?: {
    prefix?: string;
}): (e: DebugEvent) => void;
/**
 *  Captured debug-event stream with typed filters — what {@link debugCollector}
 *  returns. Pass {@link DebugCollector.sink | sink} as {@link ClientConfig.debug},
 *  run the operation under test, then assert on the filters.
 *
 * @category logging
 */
export interface DebugCollector {
    /** Every event received, in emission order (spans interleaved with logs). */
    events: DebugEvent[];
    /** The collecting sink — pass as {@link ClientConfig.debug}. */
    sink: (e: DebugEvent) => void;
    /** Span start events, optionally filtered by span name (e.g. `"trade.execute"`). */
    starts(name?: string): Extract<DebugEvent, {
        kind: "span";
        phase: "start";
    }>[];
    /** Span end events, optionally filtered by span name — carry `durationMs`/`error`. */
    ends(name?: string): Extract<DebugEvent, {
        kind: "span";
        phase: "end";
    }>[];
    /** Mid-span annotate events, optionally filtered by span name. */
    annotations(name?: string): Extract<DebugEvent, {
        kind: "span";
        phase: "annotate";
    }>[];
    /** Log events, optionally filtered by scope (e.g. `"liveTail"`). */
    logs(scope?: string): Extract<DebugEvent, {
        kind: "log";
    }>[];
}
/**
 *  Build a fresh event collector — the test-side counterpart of
 *  {@link consoleDebugSink}, for asserting that an operation produced the
 *  spans/logs you expect (or for ad-hoc capture in a REPL).
 *
 * **Details**
 *
 * - Returns: An independent {@link DebugCollector}; nothing is shared between calls, so parallel tests can each have their own.
 *
 * **Example** (Collecting test traces)
 *
 * Assert a trader write went through the execute pipeline exactly once:
 *
 * ```ts
 * const collector = debugCollector();
 * const exchange = new SomniaMarkets({ ...config, debug: collector.sink });
 * await exchange.trader.placeOrder(params);
 * expect(collector.starts("trade.execute")).toHaveLength(1);
 * expect(collector.ends("trade.execute")[0].error).toBeUndefined();
 * ```
 *
 * @category logging
 */
export declare function debugCollector(): DebugCollector;
/**
 * Emits a `warn` event to `sink`, or falls back to `console.warn` when
 *  no sink is configured — for the few warnings (hook watch failures) that must
 *  never go silent. Sink errors are swallowed, same policy as {@link makeDebug}.
 *
 * @internal
 */
export declare function warnOrConsole(sink: ((e: DebugEvent) => void) | undefined, scope: string, message: string, data?: Record<string, unknown>): void;
