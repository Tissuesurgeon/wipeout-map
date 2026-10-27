// The MarketTypePlugin registry — the single lookup a UI/admin uses to resolve
// a venue's bytes4 `marketType` to its fee-param codec + machinery steps.
// Today it holds only BINARY_V1; a future type registers here (one line) and the
// operator/venue + machinery surfaces pick it up without a fork.
import * as Binary from "../binary/plugin.js";
export { binaryMarketTypePlugin } from "../binary/plugin.js";
/**
 *  Every registered market-type plugin, keyed by its bytes4 `marketType`
 *  (lowercased). Frozen — the registry is a static seam, not mutated at runtime.
 *
 * @category market types
 */
export const MARKET_TYPE_PLUGINS = Object.freeze({
    [Binary.binaryMarketTypePlugin.marketType.toLowerCase()]: Binary.binaryMarketTypePlugin,
});
/**
 *  Resolve a market-type plugin by its bytes4 id (case-insensitive), or
 *  undefined if unregistered.
 *
 * @category market types
 */
export function getMarketTypePlugin(marketType) {
    return MARKET_TYPE_PLUGINS[marketType.toLowerCase()];
}
/**
 *  All registered market-type plugins (e.g. to render a "pick a market type"
 *  list in a venue-creation wizard).
 *
 * @category market types
 */
export function listMarketTypePlugins() {
    return Object.values(MARKET_TYPE_PLUGINS);
}
