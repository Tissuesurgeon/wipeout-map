import type { LivePrice, PriceFeedInfo, PriceFeedStatus, PriceFeedHealth, PricePoint } from "./types.js";
/** Tail-wide price-feed health. */
export interface PriceFeedGlobalStatus {
    /** At least one watched asset's socket is acknowledged; this does not confirm all required streams. */
    wsConnected: boolean;
    /** Number of assets with an active watch. */
    watchCount: number;
}
export declare class PriceStore {
    private readonly assets;
    status: PriceFeedGlobalStatus;
    private readonly listeners;
    /** Sorted tape per asset and limit. Cleared per asset when its ticks change or it is purged. */
    private readonly tapes;
    subscribe: (listener: () => void) => (() => void);
    /** Notify subscribers. Call once per applied batch/status change. */
    commit(): void;
    private state;
    setStatus(asset: string, status: PriceFeedStatus): void;
    setHealth(asset: string, health: PriceFeedHealth): void;
    getHealth(asset: string): PriceFeedHealth;
    listHealth(): {
        asset: string;
        health: PriceFeedHealth;
    }[];
    setLatest(asset: string, latest: LivePrice): void;
    setInfo(asset: string, info: PriceFeedInfo): void;
    mergeTicks(asset: string, points: PricePoint[]): void;
    /** Release only the tape and its selector cache; keep the current feed. */
    purgeTicks(asset: string): void;
    setGlobalStatus(patch: Partial<PriceFeedGlobalStatus>): void;
    /** Drop one asset's rows and cached tapes (its watch was released). */
    purgeAsset(asset: string): void;
    getLatest(asset: string): LivePrice | null;
    getInfo(asset: string): PriceFeedInfo | null;
    getStatus(asset: string): PriceFeedStatus;
    /**
     * Recent ticks for an asset, newest first (up to `limit`). Every reader of the
     * same asset and limit shares one array until the asset's next tick, so the
     * array is frozen: copy it before sorting or reversing.
     */
    getTicks(asset: string, limit: number): PricePoint[];
    listStatuses(): {
        asset: string;
        status: PriceFeedStatus;
    }[];
    getGlobalStatus(): PriceFeedGlobalStatus;
}
