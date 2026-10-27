/** Every chain we run an indexer for, ascending. The default for `chainIds`. */
export declare const INDEXED_CHAIN_IDS: readonly number[];
/** What `configureIndexer` takes. Every field is optional; what is left out keeps its value. */
export type IndexerConfig = {
    /**
     *  The chains a read covers when the call does not name its own. Defaults to every chain we
     *  index ({@link INDEXED_CHAIN_IDS}). Every row says which chain it came from either way.
     */
    readonly chainIds?: readonly number[];
    /**
     *  Replaces the URL behind a chain. `null` means no indexer for it; `undefined` restores ours.
     */
    readonly urls?: Readonly<Record<number, string | null | undefined>>;
};
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
export declare function configureIndexer(config: IndexerConfig): void;
/**
 *  The indexer a chain's reads go to, or `null` when there is none.
 *
 *  Use it to decide whether to offer an indexed feature on a chain at all, before calling a read
 *  that would throw.
 *
 *  @param chainId EIP-155 chain id.
 *  @returns The GraphQL URL, or `null`.
 */
export declare function indexerUrl(chainId: number): string | null;
/** The chains a read covers: the call's own, or the configured default. */
export declare function chainIdsFor(perCall: readonly number[] | undefined): readonly number[];
//# sourceMappingURL=indexer-endpoints.d.ts.map