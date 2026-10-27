// The account view's state for one engine.
//
// `client.accountOrders` builds one registry. It holds the reads in flight, so that
// concurrent `getSnapshot` calls for one account share one read, the limit prices
// already read, the revision counter that orders every result the engine produces, and
// the live views: one session per account, shared by every listener of that account.

import * as Enrichment from "./enrichment.js";
import type { AccountOrdersSnapshot } from "./types.js";

interface Flight<V> {
  readonly promise: Promise<V>;
  readonly controller: AbortController;
  /** The live-read lifecycle the read started under. */
  readonly lifecycle: AbortSignal | undefined;
  waiters: number;
}

/**
 *  Shares one read per key between concurrent callers.
 *
 *  The read runs under its own signal, not a caller's, so one caller's abort does not
 *  fail the others. When the last caller leaves, the read is aborted and forgotten,
 *  and the next caller starts a new one. A read whose lifecycle has ended is never
 *  joined, because it can only fail.
 */
export class SingleFlight<V> {
  readonly #flights = new Map<string, Flight<V>>();

  /**
   *  Joins the read in flight for `key`, or starts one with `start`.
   *
   *  `lifecycle` is the live-read signal the read would start under. `signal` is the
   *  caller's: its abort rejects this call with its reason and leaves the others waiting.
   */
  run(
    key: string,
    lifecycle: AbortSignal | undefined,
    start: (signal: AbortSignal) => Promise<V>,
    signal?: AbortSignal,
  ): Promise<V> {
    if (signal?.aborted) return Promise.reject(signal.reason);
    let flight = this.#flights.get(key);
    if (flight === undefined || flight.lifecycle?.aborted === true) {
      const controller = new AbortController();
      const created: Flight<V> = { promise: start(controller.signal), controller, lifecycle, waiters: 0 };
      const forget = () => {
        if (this.#flights.get(key) === created) this.#flights.delete(key);
      };
      created.promise.then(forget, forget);
      this.#flights.set(key, created);
      flight = created;
    }
    flight.waiters += 1;
    return this.#wait(key, flight, signal);
  }

  /** How many reads are in flight. */
  get size(): number {
    return this.#flights.size;
  }

  #wait(key: string, flight: Flight<V>, signal: AbortSignal | undefined): Promise<V> {
    if (signal === undefined) return flight.promise;
    return new Promise<V>((resolve, reject) => {
      const onAbort = () => {
        flight.waiters -= 1;
        if (flight.waiters === 0) {
          // Forget it first, so a caller arriving now starts a new read instead of
          // joining one that is being stopped.
          if (this.#flights.get(key) === flight) this.#flights.delete(key);
          flight.controller.abort(signal.reason);
        }
        reject(signal.reason);
      };
      signal.addEventListener("abort", onAbort, { once: true });
      flight.promise.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  }
}

export class AccountViewRegistry {
  #revision = 0;
  readonly snapshots = new SingleFlight<AccountOrdersSnapshot>();
  readonly limitPrices = new Enrichment.LimitPriceCache();

  /** The next revision. Every result the engine produces takes one, so a newer result has a larger one. */
  nextRevision(): number {
    this.#revision += 1;
    return this.#revision;
  }
}

/** How long a live view outlives its last listener, so a screen that comes back reuses it. */
export const LINGER_MS = 30_000;

/** What a live session offers its registry: its last view, and its start and close. */
export interface LiveSession<V> {
  readonly view: V | undefined;
  start(): void;
  close(publishClosed: boolean): void;
}

interface Listener<V> {
  readonly onView: (view: V) => void;
  active: boolean;
}

interface Entry<V> {
  readonly session: LiveSession<V>;
  readonly listeners: Set<Listener<V>>;
  linger: ReturnType<typeof setTimeout> | undefined;
  closed: boolean;
}

export interface LiveViewsDeps<V> {
  /** Builds the session of one key, an account or an account in a bank. It publishes through `publish`. */
  readonly createSession: (key: string, publish: (view: V) => void) => LiveSession<V>;
  /** Receives an error a listener threw. */
  readonly warn: (message: string, data?: Record<string, unknown>) => void;
  /** Called when the last live view is gone, so the owner can release the shared connection. */
  readonly onIdle: () => void;
  readonly lingerMs?: number;
}

/**
 *  The engine's live views, one session per account.
 *
 *  Listeners of one account share its session. Views reach each listener in the order
 *  the session published them, one microtask after, and a listener that throws cannot
 *  stop another listener or the session. When the last listener leaves, the session
 *  lingers for {@link LINGER_MS}, then closes.
 */
export class LiveViews<V> {
  readonly #deps: LiveViewsDeps<V>;
  readonly #entries = new Map<string, Entry<V>>();

  constructor(deps: LiveViewsDeps<V>) {
    this.#deps = deps;
  }

  /** Adds a listener for `account` and returns the function that removes it. */
  subscribe(account: string, onView: (view: V) => void): () => void {
    let entry = this.#entries.get(account);
    const listener: Listener<V> = { onView, active: true };
    if (entry === undefined) {
      const listeners = new Set<Listener<V>>([listener]);
      const created: Entry<V> = {
        session: this.#deps.createSession(account, (view) => {
          for (const each of listeners) this.#deliver(each, view);
        }),
        listeners,
        linger: undefined,
        closed: false,
      };
      this.#entries.set(account, created);
      entry = created;
      created.session.start();
    } else {
      if (entry.linger !== undefined) clearTimeout(entry.linger);
      entry.linger = undefined;
      entry.listeners.add(listener);
      // A late listener starts from the current view rather than waiting for the next.
      const current = entry.session.view;
      if (current !== undefined) this.#deliver(listener, current);
    }
    const joined = entry;
    return () => {
      if (!listener.active) return;
      listener.active = false;
      joined.listeners.delete(listener);
      if (joined.listeners.size > 0 || joined.closed) return;
      joined.linger = setTimeout(() => this.#retire(account, joined), this.#deps.lingerMs ?? LINGER_MS);
    };
  }

  /**
   *  Hands `view` to `onView` alone and starts no session, for an owner that has
   *  closed. It arrives as a session's views do, one microtask after, and the
   *  returned function stops it.
   */
  deliverOnce(view: V, onView: (view: V) => void): () => void {
    const listener: Listener<V> = { onView, active: true };
    this.#deliver(listener, view);
    return () => {
      listener.active = false;
    };
  }

  /** The current view of `account`'s live session, if one runs. */
  current(account: string): V | undefined {
    return this.#entries.get(account)?.session.view;
  }

  /** How many accounts have a live session. */
  get size(): number {
    return this.#entries.size;
  }

  /** Ends every live view with a `closed` view. Listeners that stay subscribed get nothing more. */
  closeAll(): void {
    const entries = [...this.#entries.values()];
    this.#entries.clear();
    for (const entry of entries) {
      entry.closed = true;
      if (entry.linger !== undefined) clearTimeout(entry.linger);
      entry.linger = undefined;
      entry.session.close(true);
    }
    if (entries.length > 0) this.#deps.onIdle();
  }

  #retire(account: string, entry: Entry<V>): void {
    if (this.#entries.get(account) !== entry || entry.listeners.size > 0) return;
    this.#entries.delete(account);
    entry.closed = true;
    entry.session.close(false);
    if (this.#entries.size === 0) this.#deps.onIdle();
  }

  #deliver(listener: Listener<V>, view: V): void {
    queueMicrotask(() => {
      if (!listener.active) return;
      try {
        listener.onView(view);
      } catch (error) {
        this.#deps.warn("an account view listener threw", { error });
      }
    });
  }
}
