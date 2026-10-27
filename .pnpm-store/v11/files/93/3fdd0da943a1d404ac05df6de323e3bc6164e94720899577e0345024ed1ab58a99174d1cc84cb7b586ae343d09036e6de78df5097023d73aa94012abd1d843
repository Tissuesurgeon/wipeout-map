// Where the indexers we run are, and which chains a read covers when the call does not say.
//
// **The SDK knows its own indexers.** No read in `indexer.ts` takes a URL; the one behind a chain
// is resolved here, the same way a contract address is resolved in `contracts.ts`.
//
// **Configured once, overridden when needed.** `configureIndexer` sets the chains an app reads and,
// optionally, replaces a URL — a local stack, a preview deployment, an app that reads its own
// environment variables. Every read takes `{chainIds}` as an optional per-call override.
//
// **The path segment is the Envio deployment's id, not a name we control.** Recreating a deployment
// changes it, and this table with it — a patch release of this package.
/**
 *  The indexers we run.
 *
 *  One deployment serves an ENVIRONMENT, not a chain: somnia-testnet and hideki answer from the
 *  same URL, out of one database, so a read across both is one request.
 */
const HOSTED = {
    5031: "https://indexer.hyperindex.xyz/33e36a7/v1/graphql",
    50312: "https://indexer.hyperindex.xyz/ae9785b/v1/graphql",
    50383: "https://indexer.hyperindex.xyz/ae9785b/v1/graphql",
};
/** Every chain we run an indexer for, ascending. The default for `chainIds`. */
export const INDEXED_CHAIN_IDS = Object.keys(HOSTED)
    .map(Number)
    .sort((a, b) => a - b);
let defaultChainIds = INDEXED_CHAIN_IDS;
const overrides = new Map();
/**
 *  Sets, once at startup, which chains the indexer reads cover and where they go.
 *
 *  ```ts
 *  configureIndexer({chainIds: [50312, 50383]}); // a testnet app
 *  configureIndexer({urls: {50312: "http://localhost:8080/v1/graphql"}}); // a local stack
 *  ```
 *
 *  Process-wide, like an environment: a later call changes what it names and keeps the rest.
 *
 *  @param config What to change.
 */
export function configureIndexer(config) {
    if (config.chainIds !== undefined)
        defaultChainIds = [...config.chainIds];
    for (const [chainId, url] of Object.entries(config.urls ?? {})) {
        if (url === undefined)
            overrides.delete(Number(chainId));
        else
            overrides.set(Number(chainId), url);
    }
}
/**
 *  The indexer a chain's reads go to, or `null` when there is none.
 *
 *  Use it to decide whether to offer an indexed feature on a chain at all, before calling a read
 *  that would throw.
 *
 *  @param chainId EIP-155 chain id.
 *  @returns The GraphQL URL, or `null`.
 */
export function indexerUrl(chainId) {
    const override = overrides.get(chainId);
    if (override !== undefined)
        return override;
    return HOSTED[chainId] ?? null;
}
/** The chains a read covers: the call's own, or the configured default. */
export function chainIdsFor(perCall) {
    return perCall ?? defaultChainIds;
}
//# sourceMappingURL=indexer-endpoints.js.map