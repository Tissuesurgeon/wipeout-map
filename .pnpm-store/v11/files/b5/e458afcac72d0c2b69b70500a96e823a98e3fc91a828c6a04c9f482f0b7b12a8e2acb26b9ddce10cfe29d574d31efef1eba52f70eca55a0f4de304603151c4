import type { LivePrice, PriceCandle, PriceCandleResolution, PriceFeedInfo, PricePoint } from "./types.js";
interface RawFeed {
    symbol: string | null;
    base: string | null;
    quote: string | null;
    decimals: number | null;
    description: string | null;
    latestSpot: string | null;
    latestMark: string | null;
    latestBlockNumber: string | null;
    latestBlockTimestamp: string | null;
    latestUpdatedAtMs: string | null;
    latestSourceUpdatedAtMs: string | null;
    latestResynced: boolean | null;
}
/** One `PricePoint` row as the wire actually carries it. The value fields are
 *  nullable because the feed can record a tick before a price is available and
 *  {@link parsePoint} tolerates that; the identity fields are not, and
 *  {@link isRawPricePoint} enforces the difference. */
interface RawPricePoint {
    id: string;
    base: string | null;
    requestId: string;
    spot: string | null;
    mark: string | null;
    blockNumber: string;
    blockTimestamp: string;
    txHash: string;
}
/** Live Feed subscription for one asset (the catalog row = current price). Pass
 *  `quote` to pin a multi-quote base to one feed; the caller must supply `$quote`
 *  in the subscription variables when set. */
export declare function subscriptionFeed(quote?: string): string;
/**
 *  Live tick tape for one asset, as a Hasura STREAM: each push carries only the
 *  rows after `$cursor`, not the whole window.
 *
 *  The cursor is `requestId`. Within ONE feed it is unique and strictly increases
 *  with time, so no tick is skipped and none repeats.
 *
 *  That uniqueness is per feed, not per base: one agent request prices every
 *  symbol in the tick, so `BTC/USDC` and `BTC/USDT` share a `requestId`. Pass
 *  `quote` (both shipped feed configs do) so the base resolves to one feed. Left
 *  unpinned, a base spanning several quotes puts rows with equal `requestId` in
 *  the stream, and a cursor advances past every row holding its value - so a
 *  batch boundary falling between them would drop the later one, the same way
 *  `blockTimestamp` would. The file header already warns that an unpinned
 *  multi-quote base double-counts; this is the sharper edge of it.
 *
 *  The other candidates do not work here:
 *  - `blockTimestamp` repeats. Several ticks can share one second, and a cursor
 *    advances past every row holding its value, so ticks would be dropped.
 *  - `blockNumber` is unique and monotonic, but the feed's Hasura answers a
 *    cursor on it with `database query error`, so it cannot be used.
 *
 *  Pass `quote` to pin a multi-quote base to one feed.
 */
export declare function subscriptionTicksStream(quote?: string): string;
export declare function parseFeed(feed: RawFeed | undefined, assetHint?: string): PriceFeedInfo;
/**
 *  The `PricePoint` rows under `field` of a subscription payload, oldest-first
 *  as the stream delivers them. Empty when the payload carries none.
 *
 *  @internal
 */
export declare function pricePointsIn(data: unknown, field: string): RawPricePoint[];
/**
 *  The first `Feed` row under `field` of a subscription payload, or undefined
 *  when the payload carries none.
 *
 *  @internal
 */
export declare function feedIn(data: unknown, field: string): RawFeed | undefined;
export declare function parsePoint(p: RawPricePoint, decimals: number, assetHint?: string): PricePoint;
/** One asset's hydration snapshot: metadata + current price + recent ticks. */
export interface PriceSnapshot {
    info: PriceFeedInfo;
    points: PricePoint[];
}
/**
 *  Hydrate several assets in ONE request: their metadata + current price + the
 *  recent tick tape of each. Used to get fresh watches "roughly up to speed"
 *  before the live subscriptions take over.
 *
 *  Each asset's tape is its own aliased `PricePoint` field with its own `limit`,
 *  not one shared `base: {_in}` list. A shared list with a global limit would
 *  let a busy asset take the whole budget and leave a quiet one with no ticks.
 *  The `Feed` rows can share one `_in` filter: the pinned quote makes each base
 *  one row.
 *
 *  A zero tick budget omits every tape field and its variables.
 *  Returns a map keyed by the uppercased asset. An asset without a `Feed` row
 *  gets the same empty-feed info as a one-asset read.
 */
export declare function loadPriceSnapshots(url: string, assets: readonly string[], ticks: number, quote: string, signal?: AbortSignal): Promise<Map<string, PriceSnapshot>>;
/** Feed metadata + current price for one asset (one request). */
export declare function getPriceFeedInfo(url: string, asset: string, quote?: string): Promise<PriceFeedInfo>;
/**
 *  The feed catalog — metadata + current price for every tracked asset, or a
 *  filtered subset (one request). Omit `assets` for all; pass a list for a batch.
 *  An explicit empty list returns no rows (not all) — a batch of zero is zero.
 */
export declare function listFeeds(url: string, assets?: string[], quote?: string): Promise<PriceFeedInfo[]>;
/**
 *  Current price for a batch of assets (or all when `assets` is omitted), newest
 *  snapshot per asset — the multi-asset "price wall". Skips assets with no
 *  observations yet.
 */
export declare function getLivePrices(url: string, assets?: string[], quote?: string): Promise<LivePrice[]>;
/**
 *  Historic ticks for one asset, newest first. Window with `from`/`to` (unix
 *  seconds, chain time); page with `limit`.
 */
export declare function getPriceHistory(url: string, asset: string, opts?: {
    limit?: number;
    from?: number;
    to?: number;
}, quote?: string): Promise<PricePoint[]>;
/**
 *  OHLC candles for one asset + resolution — the MOST RECENT `limit` (or the
 *  `from`/`to` window when given, unix seconds), returned OLDEST first so it's
 *  chart-ready. Like a klines API: omitting the window yields the latest candles,
 *  not the first ever.
 */
export declare function getPriceCandles(url: string, asset: string, resolution: PriceCandleResolution, opts?: {
    limit?: number;
    from?: number;
    to?: number;
}, quote?: string): Promise<PriceCandle[]>;
/**
 *  Validate a successful subscription payload before acknowledging delivery.
 *
 *  `field` names the payload key because the two tape subscriptions carry
 *  different ones: the price side is `Feed`, the tape is `PricePoint_stream`.
 *
 *  A payload that fails is NOT a delivery: one malformed row rejects the whole
 *  push, so it neither confirms the subscription nor mutates retained rows. An
 *  empty array is valid and confirms without inventing a price.
 */
export declare function isFeedPayload(value: unknown, field: string): boolean;
/** As {@link isFeedPayload}, for the tick tape's rows.
 *
 *  Nullability matches {@link isRawPricePoint}, and has to: `base`, `spot` and
 *  `mark` are null on a tick recorded before a price was available. Rejecting one
 *  here rejects the whole push, and a stream cursor advances at the SERVER
 *  whether or not the client kept the rows - so the batch would be lost for good
 *  rather than retried. The identity and block fields stay strict: they are what
 *  places a row on the tape, and `requestId` is the resume cursor. */
export declare function isTicksPayload(value: unknown, field: string): boolean;
export {};
