import type { Hex } from "viem";
import type { MarketTypePlugin } from "./types.js";
export type { MachineryStep, MarketTypePlugin } from "./types.js";
export { binaryMarketTypePlugin } from "../binary/plugin.js";
/**
 *  Every registered market-type plugin, keyed by its bytes4 `marketType`
 *  (lowercased). Frozen — the registry is a static seam, not mutated at runtime.
 *
 * @category market types
 */
export declare const MARKET_TYPE_PLUGINS: Readonly<Record<string, MarketTypePlugin>>;
/**
 *  Resolve a market-type plugin by its bytes4 id (case-insensitive), or
 *  undefined if unregistered.
 *
 * @category market types
 */
export declare function getMarketTypePlugin(marketType: Hex): MarketTypePlugin | undefined;
/**
 *  All registered market-type plugins (e.g. to render a "pick a market type"
 *  list in a venue-creation wizard).
 *
 * @category market types
 */
export declare function listMarketTypePlugins(): MarketTypePlugin[];
