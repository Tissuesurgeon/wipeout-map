// Opt-in structured debug/tracing channel. The SDK never logs on its own:
// `createClient` builds ONE channel per client from `config.debug` (unset →
// every emit is a no-op and spans skip timing entirely), and threads it to the
// pieces that emit — no module-global state, identical in browser and Node.
//
// Events are DATA, not preformatted strings. Conventions for call sites:
//   - `data` carries raw values (counts, addresses, bigints) — never a string
//     built for display; formatting/filtering belongs to the consumer's sink.
//   - Span names are `"<module>.<fn>"` (e.g. `"trade.execute"`); log scopes are
//     the bare module name (e.g. `"liveTail"`).
//   - A genuinely expensive payload (serializing a book, …) guards on
//     `dbg.enabled` at the call site; a cheap object literal doesn't need to.
//
// The shape is deliberately OpenTelemetry-mappable (name ↔ span name, `data` ↔
// attributes, `error` ↔ status, `parentId` ↔ context link) so a consumer can
// forward to a real tracer without any SDK change. Parenting is EXPLICIT-only:
// the `span` callback receives its handle and nested calls take it as an
// argument. There is no ambient "current span" — inferring parents across
// `await` boundaries misattributes them under concurrency, and the browser has
// no AsyncLocalStorage — and spans made by `traced` are therefore always roots.
const DISABLED_SPAN = { id: 0, name: "" };
/**
 * Builds a client's debug channel from its configured sink. Unset
 *  sink → `enabled: false`, every method a no-op, and `span` runs `fn` directly
 *  without taking timestamps. A sink that throws is swallowed — a broken debug
 *  sink must never break trading.
 *
 * @internal
 */
export function makeDebug(sink) {
    if (!sink) {
        return {
            enabled: false,
            log: () => { },
            warn: () => { },
            span: (_name, fn) => fn(DISABLED_SPAN),
            annotate: () => { },
            traced: (_name, fn) => (...args) => fn(DISABLED_SPAN, ...args),
            tracedObject: (_prefix, target) => target,
        };
    }
    let nextId = 1;
    const emit = (e) => {
        try {
            sink(e);
        }
        catch {
            // ponytail: consumer sink threw — swallowed on purpose, never break the SDK.
        }
    };
    function span(name, fn, parent, data) {
        const id = nextId++;
        emit({
            kind: "span",
            phase: "start",
            id,
            ...(parent && parent.id !== 0 ? { parentId: parent.id } : {}),
            name,
            ...(data ? { data } : {}),
        });
        const t0 = performance.now();
        const end = (error) => emit({
            kind: "span",
            phase: "end",
            id,
            name,
            durationMs: performance.now() - t0,
            ...(error !== undefined ? { error } : {}),
        });
        try {
            const out = fn({ id, name });
            if (out instanceof Promise) {
                // Cast: TS can't prove `Promise<Awaited<T>>` collapses back to this T —
                // T's promise-ness is only known at runtime via the instanceof above.
                return out.then((r) => {
                    end();
                    return r;
                }, (e) => {
                    end(e ?? new Error("rejected"));
                    throw e;
                });
            }
            end();
            return out;
        }
        catch (e) {
            end(e ?? new Error("thrown"));
            throw e;
        }
    }
    // Span data for a boundary method call: an options-object first arg is the
    // interesting payload; anything else is just the raw arg list.
    const callData = (...args) => {
        if (args.length === 0)
            return undefined;
        const [first] = args;
        if (typeof first === "object" && first !== null)
            return { params: first };
        return { args };
    };
    const traced = (name, fn, data) => (...args) => span(name, (s) => fn(s, ...args), undefined, data?.(...args));
    function tracedObject(prefix, target) {
        const wrapped = new Map();
        return new Proxy(target, {
            get(t, prop, receiver) {
                const value = Reflect.get(t, prop, receiver);
                if (typeof prop !== "string" || typeof value !== "function")
                    return value;
                let fn = wrapped.get(prop);
                if (!fn) {
                    fn = traced(`${prefix}.${prop}`, (_s, ...args) => Reflect.apply(value, t, args), callData);
                    wrapped.set(prop, fn);
                }
                return fn;
            },
        });
    }
    return {
        enabled: true,
        log: (scope, message, data) => emit({ kind: "log", level: "debug", scope, message, ...(data ? { data } : {}) }),
        warn: (scope, message, data) => emit({ kind: "log", level: "warn", scope, message, ...(data ? { data } : {}) }),
        span,
        annotate: (s, data) => {
            if (s.id !== 0)
                emit({ kind: "span", phase: "annotate", id: s.id, name: s.name, data });
        },
        traced,
        tracedObject,
    };
}
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
export function consoleDebugSink(opts) {
    const prefix = opts?.prefix ?? "[sdk]";
    const depths = new Map();
    const pad = (depth) => "  ".repeat(depth);
    const rest = (data) => data === undefined ? [] : [data];
    return (e) => {
        if (e.kind === "log") {
            const print = e.level === "warn" ? console.warn : console.debug;
            print(`${prefix} ${e.scope} ${e.message}`, ...rest(e.data));
            return;
        }
        if (e.phase === "start") {
            const depth = e.parentId === undefined ? 0 : (depths.get(e.parentId) ?? 0) + 1;
            depths.set(e.id, depth);
            console.debug(`${prefix} ${pad(depth)}▶ ${e.name}`, ...rest(e.data));
            return;
        }
        if (e.phase === "annotate") {
            console.debug(`${prefix} ${pad((depths.get(e.id) ?? 0) + 1)}· ${e.name}`, e.data);
            return;
        }
        const depth = depths.get(e.id) ?? 0;
        depths.delete(e.id);
        const line = `${prefix} ${pad(depth)}◀ ${e.name} ${e.durationMs.toFixed(1)}ms`;
        if (e.error === undefined)
            console.debug(line);
        else
            console.warn(line, e.error);
    };
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
export function debugCollector() {
    const events = [];
    return {
        events,
        sink: (e) => events.push(e),
        starts: (name) => events.filter((e) => e.kind === "span" && e.phase === "start" && (name === undefined || e.name === name)),
        ends: (name) => events.filter((e) => e.kind === "span" && e.phase === "end" && (name === undefined || e.name === name)),
        annotations: (name) => events.filter((e) => e.kind === "span" && e.phase === "annotate" && (name === undefined || e.name === name)),
        logs: (scope) => events.filter((e) => e.kind === "log" && (scope === undefined || e.scope === scope)),
    };
}
/**
 * Emits a `warn` event to `sink`, or falls back to `console.warn` when
 *  no sink is configured — for the few warnings (hook watch failures) that must
 *  never go silent. Sink errors are swallowed, same policy as {@link makeDebug}.
 *
 * @internal
 */
export function warnOrConsole(sink, scope, message, data) {
    if (sink) {
        try {
            sink({ kind: "log", level: "warn", scope, message, ...(data ? { data } : {}) });
            return;
        }
        catch {
            // fall through to console — the warning still must land somewhere
        }
    }
    console.warn(`@somnia-chain/markets-sdk: [${scope}] ${message}`, data ?? "");
}
