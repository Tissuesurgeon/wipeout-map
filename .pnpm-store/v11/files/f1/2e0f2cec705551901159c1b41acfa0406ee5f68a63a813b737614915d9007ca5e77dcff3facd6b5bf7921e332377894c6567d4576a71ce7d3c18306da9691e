// Reactive in-memory store for realtime price feeds — one store per client,
// holding per-asset current price + a bounded tick tape.
//
// `useSyncExternalStore`-friendly: subscribe() + commit(). The per-asset reads
// (getLatest, getInfo, getTicks) and getGlobalStatus return a stable reference
// until their own data changes. This avoids React render loops, and one asset's
// push does not re-render another asset's readers. listStatuses and listHealth
// build a new array on each call. Framework-agnostic — no React import. Kept
// separate from the order-book MaterializerStore because prices come from a
// different service (the EMA price-feed indexer) on a different transport.
/** Recent ticks retained per asset (bounds memory; older ones age out). */
const MAX_TICKS_PER_ASSET = 1_000;
function assetKey(asset) {
    return asset.toUpperCase();
}
export class PriceStore {
    assets = new Map();
    status = { wsConnected: false, watchCount: 0 };
    listeners = new Set();
    /** Sorted tape per asset and limit. Cleared per asset when its ticks change or it is purged. */
    tapes = new Map();
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };
    /** Notify subscribers. Call once per applied batch/status change. */
    commit() {
        for (const l of this.listeners)
            l();
    }
    state(asset) {
        const key = assetKey(asset);
        let s = this.assets.get(key);
        if (!s) {
            s = { latest: null, info: null, ticks: new Map(), status: "unwatched", health: "unwatched" };
            this.assets.set(key, s);
        }
        return s;
    }
    // ---- mutations (do not commit; callers batch then commit) ----
    setStatus(asset, status) {
        this.state(asset).status = status;
    }
    setHealth(asset, health) {
        this.state(asset).health = health;
    }
    getHealth(asset) {
        return this.assets.get(assetKey(asset))?.health ?? "unwatched";
    }
    listHealth() {
        return [...this.assets].map(([asset, state]) => ({ asset, health: state.health }));
    }
    setLatest(asset, latest) {
        const s = this.state(asset);
        // Ignore an out-of-order push that would move the price backwards in time.
        if (s.latest && latest.blockNumber < s.latest.blockNumber)
            return;
        s.latest = latest;
        if (s.info)
            s.info = { ...s.info, latest };
    }
    setInfo(asset, info) {
        this.state(asset).info = info;
        if (info.latest)
            this.setLatest(asset, info.latest);
    }
    mergeTicks(asset, points) {
        const s = this.state(asset);
        if (points.length === 0)
            return;
        this.tapes.delete(assetKey(asset));
        for (const p of points)
            s.ticks.set(p.id, p);
        if (s.ticks.size > MAX_TICKS_PER_ASSET) {
            const sorted = [...s.ticks.values()].sort(cmpTickDesc);
            for (const p of sorted.slice(MAX_TICKS_PER_ASSET))
                s.ticks.delete(p.id);
        }
    }
    /** Release only the tape and its selector cache; keep the current feed. */
    purgeTicks(asset) {
        const key = assetKey(asset);
        this.assets.get(key)?.ticks.clear();
        this.tapes.delete(key);
    }
    setGlobalStatus(patch) {
        this.status = { ...this.status, ...patch };
    }
    /** Drop one asset's rows and cached tapes (its watch was released). */
    purgeAsset(asset) {
        const key = assetKey(asset);
        this.assets.delete(key);
        this.tapes.delete(key);
    }
    // ---- selectors (stable references until the asset's own data changes) ----
    getLatest(asset) {
        return this.assets.get(assetKey(asset))?.latest ?? null;
    }
    getInfo(asset) {
        return this.assets.get(assetKey(asset))?.info ?? null;
    }
    getStatus(asset) {
        return this.assets.get(assetKey(asset))?.status ?? "unwatched";
    }
    /**
     * Recent ticks for an asset, newest first (up to `limit`). Every reader of the
     * same asset and limit shares one array until the asset's next tick, so the
     * array is frozen: copy it before sorting or reversing.
     */
    getTicks(asset, limit) {
        const key = assetKey(asset);
        const s = this.assets.get(key);
        if (!s || s.ticks.size === 0)
            return EMPTY_TICKS;
        let byLimit = this.tapes.get(key);
        if (!byLimit) {
            byLimit = new Map();
            this.tapes.set(key, byLimit);
        }
        let tape = byLimit.get(limit);
        if (!tape) {
            tape = [...s.ticks.values()].sort(cmpTickDesc).slice(0, limit);
            Object.freeze(tape);
            byLimit.set(limit, tape);
        }
        return tape;
    }
    listStatuses() {
        return [...this.assets].map(([asset, state]) => ({ asset, status: state.status }));
    }
    getGlobalStatus() {
        return this.status;
    }
}
const EMPTY_TICKS = [];
Object.freeze(EMPTY_TICKS);
/** Newest-first: by block timestamp, then block number (chain time is monotonic). */
function cmpTickDesc(a, b) {
    return b.blockTimestamp - a.blockTimestamp || b.blockNumber - a.blockNumber;
}
