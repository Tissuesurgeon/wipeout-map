import type { BlockActivityOptions, MarketActivityOptions, TransactionActivityOptions } from "./activity.js";
import type { PortfolioOptions } from "./binary/portfolio.js";
import type { GetCandlesOptions } from "./candles.js";
import type { MarketCreatorFilter } from "./marketCreatorAdmin.js";
import type { MarketType } from "./markets.js";
import type { OperatorFilter } from "./operatorAdmin.js";
/**
 * First element of every {@link ClientQueryKey} — match on it to invalidate all SDK reads at once.
 *
 * @category caching
 */
export declare const QUERY_KEY_SCOPE = "somnia-markets";
/**
 * One element of a {@link ClientQueryKey} — JSON-serializable by construction.
 *
 * @category caching
 */
export type QueryKeyElement = string | number | boolean | null | Readonly<Record<string, string | number | boolean>>;
/**
 * A cache key for one client read: `["somnia-markets", <read>, …inputs]`.
 *
 * @category caching
 */
export type ClientQueryKey = readonly QueryKeyElement[];
/**
 * Trailing chain scope of a query-key factory. Pass the chain of the engine that
 * serves the read. Omit it in a single-chain app: the key is then the same key the
 * factory produced before it took a chain.
 *
 * A key with a chain is the key without one plus a last `{ chainId }` element. So a
 * key without a chain, used as a prefix filter (TanStack Query's default for
 * invalidation), also matches every chain's entry. A key with a chain never matches an
 * entry stored without one, even on the primary chain. On a multi-chain exchange, pass
 * `chainId` on every key.
 *
 * @category caching
 */
export interface QueryKeyChainOptions {
    /** Numeric chain id of the engine that serves the read. */
    chainId?: number;
}
/**
 * Key for `client.listMarkets(opts)`.
 *
 * @category caching
 */
export declare function marketsKey(opts?: {
    /** Restrict to one market kind. */
    marketType?: MarketType;
    /** Page size. */
    limit?: number;
    /** Page offset. */
    offset?: number;
}, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getPortfolio(account, opts)`.
 *
 * @category caching
 */
export declare function portfolioKey(account: string | null | undefined, opts?: PortfolioOptions, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getCandles(pool, intervalSeconds, opts)`.
 *
 * @category caching
 */
export declare function candlesKey(pool: string | null | undefined, intervalSeconds: number, opts?: GetCandlesOptions, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getMarketActivity(market, opts)`.
 *
 * `kinds` is sorted and joined, so two callers that ask for the same kinds in a
 * different order share one cache entry — the read does not depend on the order.
 *
 * @category caching
 */
export declare function marketActivityKey(market: string | null | undefined, opts?: MarketActivityOptions, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getTradeContext(id)`.
 *
 * A fill id is `${blockNumber}_${logIndex}` — already unique and already
 * lower-case, so it is used verbatim rather than case-folded like an address.
 * It is unique on one chain only, so a multi-chain app passes the chain.
 *
 * @category caching
 */
export declare function tradeContextKey(id: string | null | undefined, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getTransactionActivity(txHash, opts)`.
 *
 * The hash is case-folded: a caller that pastes a checksummed hash and one that
 * pastes it lower-cased are asking the same question.
 *
 * @category caching
 */
export declare function transactionActivityKey(txHash: string | null | undefined, opts?: TransactionActivityOptions, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getBlockActivity(blockNumber, opts)`.
 *
 * The block alone identifies the question — the client resolves the anchoring
 * timestamp itself, so there is no second argument that could disagree with it.
 *
 * @category caching
 */
export declare function blockActivityKey(blockNumber: bigint | null | undefined, opts?: BlockActivityOptions, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getMarketFees(marketId)`.
 *
 * @category caching
 */
export declare function marketFeesKey(marketId: string | null | undefined, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.listOperators(opts)`.
 *
 * @category caching
 */
export declare function operatorsKey(opts?: OperatorFilter & {
    /** Page size. */
    limit?: number;
    /** Page offset. */
    offset?: number;
}, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.listMarketCreators(opts)`.
 *
 * @category caching
 */
export declare function marketCreatorsKey(opts?: MarketCreatorFilter & {
    /** Page size. */
    limit?: number;
    /** Page offset. */
    offset?: number;
}, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.listOracleAdapters(opts)`.
 *
 * @category caching
 */
export declare function oracleAdaptersKey(opts?: {
    /** Restrict to adapters owned by this address. */
    owner?: string;
    /** Restrict to approved (true) / unapproved (false) adapters. */
    approved?: boolean;
    /** Page size. */
    limit?: number;
    /** Page offset. */
    offset?: number;
}, chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getSyncStatus(chainId)`.
 *
 * The read itself names its chain, so the chain is already the key's last
 * element and this factory takes no trailing `{ chainId }`.
 *
 * @category caching
 */
export declare function syncStatusKey(chainId: number): ClientQueryKey;
/**
 * Key for `client.getMaxVenueFeeBps()`.
 *
 * @category caching
 */
export declare function maxVenueFeeBpsKey(chain?: QueryKeyChainOptions): ClientQueryKey;
/**
 * Key for `client.getMarketOnchain(marketId)`.
 *
 * @category caching
 */
export declare function marketOnchainKey(marketId: string | null | undefined, chain?: QueryKeyChainOptions): ClientQueryKey;
