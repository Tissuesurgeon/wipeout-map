// Cache-key identity for the client's one-shot reads. Consumers that hold
// results in a query cache (TanStack Query, SWR, …) need one canonical key per
// read; hand-written string literals drift apart across files and split the
// cache silently. These factories are plain functions — no query library is
// imported or required — returning readonly, JSON-serializable arrays with the
// invariants a cache needs:
//
//   - equal logical inputs give deep-equal keys (`{}` and `{ limit: undefined }`
//     are the same input; addresses/ids are case-folded),
//   - an input that changes the read's result changes the key,
//   - every element survives `JSON.stringify` unchanged (no `undefined`, no
//     `bigint`).
//
// The first element scopes all keys away from an app's own; invalidate
// everything SDK-shaped with a `["somnia-markets"]` prefix match.
//
// A multi-chain app reads the same account, pool or market id on several
// chains, so every factory takes a trailing `{ chainId }` (`syncStatusKey`
// already takes its chain as the read's own argument). A key with a chain
// ends in a `{ chainId }` element; a key without one is exactly the key this
// module has always produced, so single-chain caches keep their entries.
//
// One module rather than a key per concept module: a cache key's one hard
// invariant — no two reads share a key — is only auditable (and testable, see
// test/hooks.test.ts) with every key side by side. The concept here is cache
// identity itself, not the reads it names.
/**
 * First element of every {@link ClientQueryKey} — match on it to invalidate all SDK reads at once.
 *
 * @category caching
 */
export const QUERY_KEY_SCOPE = "somnia-markets";
/** Drop `undefined` fields so `{}` and `{ limit: undefined }` produce the same key. */
function pruned(opts) {
    const out = {};
    for (const [k, v] of Object.entries(opts)) {
        if (v !== undefined)
            out[k] = v;
    }
    return out;
}
/** Append the chain as a last `{ chainId }` element; with no chain, return the key as is. */
function onChain(key, chain) {
    return chain?.chainId === undefined ? key : [...key, { chainId: chain.chainId }];
}
/** Case-fold an address / hex id; `null` keeps a disabled query's key serializable. */
function id(value) {
    return value == null ? null : value.toLowerCase();
}
/**
 * Key for `client.listMarkets(opts)`.
 *
 * @category caching
 */
export function marketsKey(opts, chain) {
    return onChain([QUERY_KEY_SCOPE, "markets", pruned({ marketType: opts?.marketType, limit: opts?.limit, offset: opts?.offset })], chain);
}
/**
 * Key for `client.getPortfolio(account, opts)`.
 *
 * @category caching
 */
export function portfolioKey(account, opts, chain) {
    return onChain([
        QUERY_KEY_SCOPE,
        "portfolio",
        id(account),
        pruned({ ordersLimit: opts?.ordersLimit, tradesLimit: opts?.tradesLimit, since: opts?.since }),
    ], chain);
}
/**
 * Key for `client.getCandles(pool, intervalSeconds, opts)`.
 *
 * @category caching
 */
export function candlesKey(pool, intervalSeconds, opts, chain) {
    return onChain([
        QUERY_KEY_SCOPE,
        "candles",
        id(pool),
        intervalSeconds,
        pruned({ limit: opts?.limit, from: opts?.from, to: opts?.to, market: id(opts?.market) ?? undefined }),
    ], chain);
}
/**
 * Key for `client.getMarketActivity(market, opts)`.
 *
 * `kinds` is sorted and joined, so two callers that ask for the same kinds in a
 * different order share one cache entry — the read does not depend on the order.
 *
 * @category caching
 */
export function marketActivityKey(market, opts, chain) {
    return onChain([
        QUERY_KEY_SCOPE,
        "marketActivity",
        id(market),
        pruned({
            limit: opts?.limit,
            since: opts?.since,
            until: opts?.until,
            pool: opts?.pool == null ? undefined : opts.pool.toLowerCase(),
            kinds: opts?.kinds == null ? undefined : [...opts.kinds].sort().join(","),
        }),
    ], chain);
}
/**
 * Key for `client.getTradeContext(id)`.
 *
 * A fill id is `${blockNumber}_${logIndex}` — already unique and already
 * lower-case, so it is used verbatim rather than case-folded like an address.
 * It is unique on one chain only, so a multi-chain app passes the chain.
 *
 * @category caching
 */
export function tradeContextKey(id, chain) {
    return onChain([QUERY_KEY_SCOPE, "tradeContext", id ?? null], chain);
}
/**
 * Key for `client.getTransactionActivity(txHash, opts)`.
 *
 * The hash is case-folded: a caller that pastes a checksummed hash and one that
 * pastes it lower-cased are asking the same question.
 *
 * @category caching
 */
export function transactionActivityKey(txHash, opts, chain) {
    return onChain([QUERY_KEY_SCOPE, "transactionActivity", id(txHash), pruned({ limit: opts?.limit })], chain);
}
/**
 * Key for `client.getBlockActivity(blockNumber, opts)`.
 *
 * The block alone identifies the question — the client resolves the anchoring
 * timestamp itself, so there is no second argument that could disagree with it.
 *
 * @category caching
 */
export function blockActivityKey(blockNumber, opts, chain) {
    return onChain([
        QUERY_KEY_SCOPE,
        "blockActivity",
        // Serialized at the cache-key boundary: a bigint is not JSON, and react-query
        // hashes keys. The public parameter stays exact (SDK-TYPE-007).
        id(blockNumber == null ? blockNumber : String(blockNumber)),
        pruned({ limit: opts?.limit, offset: opts?.offset }),
    ], chain);
}
/**
 * Key for `client.getMarketFees(marketId)`.
 *
 * @category caching
 */
export function marketFeesKey(marketId, chain) {
    return onChain([QUERY_KEY_SCOPE, "marketFees", id(marketId)], chain);
}
/**
 * Key for `client.listOperators(opts)`.
 *
 * @category caching
 */
export function operatorsKey(opts, chain) {
    return onChain([
        QUERY_KEY_SCOPE,
        "operators",
        pruned({
            owner: opts?.owner?.toLowerCase(),
            enabled: opts?.enabled,
            limit: opts?.limit,
            offset: opts?.offset,
        }),
    ], chain);
}
/**
 * Key for `client.listMarketCreators(opts)`.
 *
 * @category caching
 */
export function marketCreatorsKey(opts, chain) {
    return onChain([
        QUERY_KEY_SCOPE,
        "marketCreators",
        pruned({
            owner: opts?.owner?.toLowerCase(),
            operatorId: opts?.operatorId,
            venueId: opts?.venueId?.toLowerCase(),
            limit: opts?.limit,
            offset: opts?.offset,
        }),
    ], chain);
}
/**
 * Key for `client.listOracleAdapters(opts)`.
 *
 * @category caching
 */
export function oracleAdaptersKey(opts, chain) {
    return onChain([
        QUERY_KEY_SCOPE,
        "oracleAdapters",
        pruned({
            owner: opts?.owner?.toLowerCase(),
            approved: opts?.approved,
            limit: opts?.limit,
            offset: opts?.offset,
        }),
    ], chain);
}
/**
 * Key for `client.getSyncStatus(chainId)`.
 *
 * The read itself names its chain, so the chain is already the key's last
 * element and this factory takes no trailing `{ chainId }`.
 *
 * @category caching
 */
export function syncStatusKey(chainId) {
    return [QUERY_KEY_SCOPE, "syncStatus", chainId];
}
/**
 * Key for `client.getMaxVenueFeeBps()`.
 *
 * @category caching
 */
export function maxVenueFeeBpsKey(chain) {
    return onChain([QUERY_KEY_SCOPE, "maxVenueFeeBps"], chain);
}
/**
 * Key for `client.getMarketOnchain(marketId)`.
 *
 * @category caching
 */
export function marketOnchainKey(marketId, chain) {
    return onChain([QUERY_KEY_SCOPE, "marketOnchain", id(marketId)], chain);
}
