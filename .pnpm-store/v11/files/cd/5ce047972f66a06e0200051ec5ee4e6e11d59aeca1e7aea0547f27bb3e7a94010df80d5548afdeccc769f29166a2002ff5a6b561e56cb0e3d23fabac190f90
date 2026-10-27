// Keyed async memoization — the one shape behind the SDK's per-key chain-read
// and watch caches, extracted so each site stops hand-rolling the same three
// lines (and the same two subtleties) around a Map<K, Promise<V>>.
//
// The subtleties this owns:
//
// 1. The PROMISE is cached, not the value, and it goes into the map before the
//    work settles — so concurrent callers for one key share a single in-flight
//    request instead of stampeding (quotes fire per keystroke; each would
//    otherwise start its own eth_call on a cold key).
// 2. A rejection evicts the entry, so a transient failure is retried by the
//    next caller instead of being served from cache forever. Eviction checks
//    the entry still holds THIS promise — after an external delete() and
//    re-create, a stale rejection must not tear down its replacement.
//
// NOT this shape: liveTail/priceFeed `hydrations`, which delete on settle
// (success too) — those dedup in-flight work only, they don't memoize.
/**
 *  A keyed cache of async work: one promise per key, created on first request,
 *  shared by concurrent callers, evicted on rejection.
 */
export class AsyncCache {
    map = new Map();
    /** The cached promise for `key`, or `create()` cached under it. */
    getOrCreate(key, create) {
        let p = this.map.get(key);
        if (!p) {
            p = create();
            this.map.set(key, p);
            p.catch(() => {
                if (this.map.get(key) === p)
                    this.map.delete(key);
            });
        }
        return p;
    }
    /** The cached promise for `key`, if any — lets a caller check that its entry was not released. */
    get(key) {
        return this.map.get(key);
    }
    /** Evict one key — the next getOrCreate re-runs `create` (e.g. on-chain retune). */
    delete(key) {
        this.map.delete(key);
    }
    /** Every cached promise — for teardown sweeps (stop each handle, then clear). */
    values() {
        return this.map.values();
    }
    clear() {
        this.map.clear();
    }
}
