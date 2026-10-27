// The account view's state for one engine.
//
// `client.accountOrders` builds one registry. It holds the reads in flight, so that
// concurrent `getSnapshot` calls for one account share one read, the limit prices
// already read, the revision counter that orders every result the engine produces, and
// the live views: one session per account, shared by every listener of that account.
import * as Enrichment from "./enrichment.js";
/**
 *  Shares one read per key between concurrent callers.
 *
 *  The read runs under its own signal, not a caller's, so one caller's abort does not
 *  fail the others. When the last caller leaves, the read is aborted and forgotten,
 *  and the next caller starts a new one. A read whose lifecycle has ended is never
 *  joined, because it can only fail.
 */
export class SingleFlight {
    #flights = new Map();
    /**
     *  Joins the read in flight for `key`, or starts one with `start`.
     *
     *  `lifecycle` is the live-read signal the read would start under. `signal` is the
     *  caller's: its abort rejects this call with its reason and leaves the others waiting.
     */
    run(key, lifecycle, start, signal) {
        if (signal?.aborted)
            return Promise.reject(signal.reason);
        let flight = this.#flights.get(key);
        if (flight === undefined || flight.lifecycle?.aborted === true) {
            const controller = new AbortController();
            const created = { promise: start(controller.signal), controller, lifecycle, waiters: 0 };
            const forget = () => {
                if (this.#flights.get(key) === created)
                    this.#flights.delete(key);
            };
            created.promise.then(forget, forget);
            this.#flights.set(key, created);
            flight = created;
        }
        flight.waiters += 1;
        return this.#wait(key, flight, signal);
    }
    /** How many reads are in flight. */
    get size() {
        return this.#flights.size;
    }
    #wait(key, flight, signal) {
        if (signal === undefined)
            return flight.promise;
        return new Promise((resolve, reject) => {
            const onAbort = () => {
                flight.waiters -= 1;
                if (flight.waiters === 0) {
                    // Forget it first, so a caller arriving now starts a new read instead of
                    // joining one that is being stopped.
                    if (this.#flights.get(key) === flight)
                        this.#flights.delete(key);
                    flight.controller.abort(signal.reason);
                }
                reject(signal.reason);
            };
            signal.addEventListener("abort", onAbort, { once: true });
            flight.promise.then((value) => {
                signal.removeEventListener("abort", onAbort);
                resolve(value);
            }, (error) => {
                signal.removeEventListener("abort", onAbort);
                reject(error);
            });
        });
    }
}
export class AccountViewRegistry {
    #revision = 0;
    snapshots = new SingleFlight();
    limitPrices = new Enrichment.LimitPriceCache();
    /** The next revision. Every result the engine produces takes one, so a newer result has a larger one. */
    nextRevision() {
        this.#revision += 1;
        return this.#revision;
    }
}
/** How long a live view outlives its last listener, so a screen that comes back reuses it. */
export const LINGER_MS = 30_000;
/**
 *  The engine's live views, one session per account.
 *
 *  Listeners of one account share its session. Views reach each listener in the order
 *  the session published them, one microtask after, and a listener that throws cannot
 *  stop another listener or the session. When the last listener leaves, the session
 *  lingers for {@link LINGER_MS}, then closes.
 */
export class LiveViews {
    #deps;
    #entries = new Map();
    constructor(deps) {
        this.#deps = deps;
    }
    /** Adds a listener for `account` and returns the function that removes it. */
    subscribe(account, onView) {
        let entry = this.#entries.get(account);
        const listener = { onView, active: true };
        if (entry === undefined) {
            const listeners = new Set([listener]);
            const created = {
                session: this.#deps.createSession(account, (view) => {
                    for (const each of listeners)
                        this.#deliver(each, view);
                }),
                listeners,
                linger: undefined,
                closed: false,
            };
            this.#entries.set(account, created);
            entry = created;
            created.session.start();
        }
        else {
            if (entry.linger !== undefined)
                clearTimeout(entry.linger);
            entry.linger = undefined;
            entry.listeners.add(listener);
            // A late listener starts from the current view rather than waiting for the next.
            const current = entry.session.view;
            if (current !== undefined)
                this.#deliver(listener, current);
        }
        const joined = entry;
        return () => {
            if (!listener.active)
                return;
            listener.active = false;
            joined.listeners.delete(listener);
            if (joined.listeners.size > 0 || joined.closed)
                return;
            joined.linger = setTimeout(() => this.#retire(account, joined), this.#deps.lingerMs ?? LINGER_MS);
        };
    }
    /**
     *  Hands `view` to `onView` alone and starts no session, for an owner that has
     *  closed. It arrives as a session's views do, one microtask after, and the
     *  returned function stops it.
     */
    deliverOnce(view, onView) {
        const listener = { onView, active: true };
        this.#deliver(listener, view);
        return () => {
            listener.active = false;
        };
    }
    /** The current view of `account`'s live session, if one runs. */
    current(account) {
        return this.#entries.get(account)?.session.view;
    }
    /** How many accounts have a live session. */
    get size() {
        return this.#entries.size;
    }
    /** Ends every live view with a `closed` view. Listeners that stay subscribed get nothing more. */
    closeAll() {
        const entries = [...this.#entries.values()];
        this.#entries.clear();
        for (const entry of entries) {
            entry.closed = true;
            if (entry.linger !== undefined)
                clearTimeout(entry.linger);
            entry.linger = undefined;
            entry.session.close(true);
        }
        if (entries.length > 0)
            this.#deps.onIdle();
    }
    #retire(account, entry) {
        if (this.#entries.get(account) !== entry || entry.listeners.size > 0)
            return;
        this.#entries.delete(account);
        entry.closed = true;
        entry.session.close(false);
        if (this.#entries.size === 0)
            this.#deps.onIdle();
    }
    #deliver(listener, view) {
        queueMicrotask(() => {
            if (!listener.active)
                return;
            try {
                listener.onView(view);
            }
            catch (error) {
                this.#deps.warn("an account view listener threw", { error });
            }
        });
    }
}
