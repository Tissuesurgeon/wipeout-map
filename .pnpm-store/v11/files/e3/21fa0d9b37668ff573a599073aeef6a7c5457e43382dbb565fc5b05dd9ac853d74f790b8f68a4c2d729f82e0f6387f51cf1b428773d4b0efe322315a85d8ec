import type * as IndexerRead from "../indexerRead.js";
import type * as Markets from "../markets.js";
import type { PerpStopOrderRead, PerpStopOrderRef } from "../perp/stops.js";
import type { AccountStopTerms } from "./rows.js";
import type { AccountStop } from "./types.js";
/** How long one enrichment waits for all of its reads. */
export declare const ENRICHMENT_DEADLINE_MS = 5000;
/**
 *  Limit prices already read, by `<dataset generation>:<stop id>`.
 *
 *  A stop's terms never change while it is live, so a price read once stays true.
 *  Only a successful read is kept.
 */
export declare class LimitPriceCache {
    #private;
    readonly max: number;
    /** `max` is the most prices kept; the one read longest ago goes first. */
    constructor(max?: number);
    get(key: string): bigint | undefined;
    set(key: string, price: bigint): void;
}
export interface EnrichmentDeps {
    /** The request context of the snapshot the stops came from. */
    readonly context: IndexerRead.RequestContext;
    /**
     *  Each pool's market type, in the order asked, or `null` for a pool the indexer has
     *  no market for. `pools` are lower-case and distinct.
     */
    readonly poolTypes: (pools: readonly string[], source: IndexerRead.Source) => Promise<readonly (Markets.MarketType | null)[]>;
    /** Reads perp stops from the registry. Rejects with {@link NotConfiguredError} when there is no chain transport. */
    readonly readPerpStops: (refs: readonly PerpStopOrderRef[]) => Promise<readonly PerpStopOrderRead[]>;
    readonly limitPrices: LimitPriceCache;
    readonly deadlineMs: number;
}
/**
 *  Adds the venue and the limit price to every stop.
 *
 *  `generation` keys the limit-price cache. `signal` stops the enrichment; it then
 *  rejects with the signal's reason.
 */
export declare function enrichStops(stops: readonly AccountStopTerms[], generation: string, deps: EnrichmentDeps, signal: AbortSignal): Promise<readonly AccountStop[]>;
