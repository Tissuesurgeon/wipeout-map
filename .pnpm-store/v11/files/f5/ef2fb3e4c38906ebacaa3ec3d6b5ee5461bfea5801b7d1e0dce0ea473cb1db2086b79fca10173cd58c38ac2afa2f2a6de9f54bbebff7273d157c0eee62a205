// What each known orders manifest covers, and what it leaves out.
//
// A capability row names the manifest it serves by digest, but it serves neither the
// manifest's `sources` nor its `scope`. So the SDK keeps a copy of both for every
// manifest it knows: the source families it names, and its exclusions. The copy is
// `indexer/config/account-source.<environment>.json`, draft files excluded.
// `test/accountViewCoverage.test.ts` fails when a manifest changes and this table
// does not.
//
// A new manifest digest reaches a released SDK only in its next release, so a view
// read under a digest this table does not hold reports `unknownManifest` coverage.
// The completeness claim is then qualified: the SDK cannot say what is left out.
/**
 *  One table entry, frozen all the way down.
 *
 *  Every view hands out these exclusions, so a consumer that changed one would change
 *  the coverage every later view reports, on every engine.
 */
function known(environment, chainId, families, exclusions) {
    return Object.freeze({
        environment,
        chainId,
        families: Object.freeze([...families]),
        exclusions: Object.freeze(exclusions.map((exclusion) => Object.freeze({ ...exclusion }))),
    });
}
/** Every orders manifest this SDK version knows, by digest. The texts are the producer's own. */
export const KNOWN_MANIFESTS = new Map([
    [
        "sha256:d26d07be5502ba374052885382f7ca05d718c0c1c0929c7ac8bead3971472b50",
        known("hideki-testnet-development", 50383, [], []),
    ],
    ["sha256:84b25620eea0fd284af59b8f137ba0af34dd05315623cdc46de377b4f9ad3f33", known("local", 31337, [], [])],
    [
        "sha256:705e796a90dda1377ba8e1cf950729ce8ac68277621791df376a5d658daccc51",
        known("mainnet-production", 5031, [], []),
    ],
    [
        "sha256:6f2f1ec4bfa77aa5936532dbc5b0c17cb91118c9f90f54dda85dee6409e24b31",
        known("testnet-development", 50312, ["BINARY_ORDER", "PERP_ORDER", "PERP_STOP", "SPOT_ORDER", "SPOT_STOP"], [
            {
                family: "PERP_ORDER",
                covered: "Perp pools created by PerpPoolFactory 0x516d2cb6de41bE98444e887793946E65989Ba07b, each registered from its PerpPoolDeployed log. The first one was created at block 436740794.",
                excluded: "Perp pools that the factory did not create, from the retired pre-factory generations. Their orders are unknown to a consumer, not absent. One of them has live content: the retired ETH-PERP pool 0xE21eDA795d7df95e1aB1076D1efd3780566bCa12 holds four resting orders that never expire, all owned by 0x63c8dd1A9EE7d8Dc10237aba6E11e92ac69cADa6.",
                evidence: "indexer/ACCOUNT-SOURCE-LEDGER.testnet-development.md, 'Retired contract generations' (DEXSVC-201); published in indexer/ACCOUNT-VIEW.md, 'Source scope'.",
            },
            {
                family: "BINARY_ORDER",
                covered: "Binary pools named by BinaryMarketsModule 0x3ecC694Cef705358864a646142ac17A90E29e388 MarketCreated, each registered from that log. The first one was created at block 440006942.",
                excluded: "Binary pools of the retired, earlier generations, whose modules the indexer never subscribed. Their orders are unknown to a consumer, not absent. Four generations have live content: 25,844 resting orders on 3,042 pools, owned by eight accounts, the largest 0xdea90069362e9e9f2aee89b6e8fe0671ef3518b6 with 16,015.",
                evidence: "indexer/ACCOUNT-SOURCE-LEDGER.testnet-development.md, 'Binary orders' (SMK-541); published in indexer/ACCOUNT-VIEW.md, 'Source scope'.",
            },
        ]),
    ],
]);
/** The coverage of a view read under `manifestDigest` on `chainId`. `table` is for tests. */
export function coverageOf(manifestDigest, chainId, table = KNOWN_MANIFESTS) {
    const entry = table.get(manifestDigest);
    // The digest covers the chain id, so a known digest on another chain is a producer
    // defect. It is reported as unknown rather than trusted.
    if (entry === undefined || entry.chainId !== chainId) {
        return Object.freeze({ kind: "unknownManifest", manifestDigest });
    }
    return Object.freeze({ kind: "known", manifestDigest, families: entry.families, exclusions: entry.exclusions });
}
