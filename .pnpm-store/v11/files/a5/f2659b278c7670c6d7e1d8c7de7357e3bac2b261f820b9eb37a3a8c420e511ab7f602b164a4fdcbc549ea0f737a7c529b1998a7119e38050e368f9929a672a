import type { AccountViewCoverage, AccountViewExclusion } from "./types.js";
export interface KnownManifest {
    readonly environment: string;
    readonly chainId: number;
    /** The families of the manifest's `sources`, sorted. */
    readonly families: readonly string[];
    readonly exclusions: readonly AccountViewExclusion[];
}
/** Every orders manifest this SDK version knows, by digest. The texts are the producer's own. */
export declare const KNOWN_MANIFESTS: ReadonlyMap<string, KnownManifest>;
/** The coverage of a view read under `manifestDigest` on `chainId`. `table` is for tests. */
export declare function coverageOf(manifestDigest: string, chainId: number, table?: ReadonlyMap<string, KnownManifest>): AccountViewCoverage;
