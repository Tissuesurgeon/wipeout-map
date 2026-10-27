/**
 *  A keyed cache of async work: one promise per key, created on first request,
 *  shared by concurrent callers, evicted on rejection.
 */
export declare class AsyncCache<K, V> {
    private readonly map;
    /** The cached promise for `key`, or `create()` cached under it. */
    getOrCreate(key: K, create: () => Promise<V>): Promise<V>;
    /** The cached promise for `key`, if any — lets a caller check that its entry was not released. */
    get(key: K): Promise<V> | undefined;
    /** Evict one key — the next getOrCreate re-runs `create` (e.g. on-chain retune). */
    delete(key: K): void;
    /** Every cached promise — for teardown sweeps (stop each handle, then clear). */
    values(): IterableIterator<Promise<V>>;
    clear(): void;
}
