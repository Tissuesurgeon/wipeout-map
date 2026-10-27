import { type Address } from "viem";
/**
 *  What is wrong with an account, and how badly.
 *
 *  Modelled on Safe's security-checks matrix, with its two load-bearing mechanics taken verbatim
 *  because both exist to stop a scanner lying:
 *
 *  **A critical finding caps the band.** A score that averages cannot express "one thing here is
 *  fatal" — nine passes and one catastrophe average to green, and green is what the user acts on.
 *  So the band is the worst finding's severity, never a mean.
 *
 *  **A read that did not answer is inconclusive, never a finding.** Safe's own comment says this
 *  exists to avoid a warning "that flips on rescan", and the reasoning generalises: a scanner that
 *  cries wolf on a slow RPC teaches people to dismiss it, which is worse than saying nothing.
 *  This is the `undefined`-is-not-`false` discipline again, at the level of a whole product
 *  surface.
 *
 *  Everything here is a pure function of facts gathered elsewhere. That split is deliberate — the
 *  conditions are the part worth testing exhaustively, and they should not need a chain to run.
 */
/**
 *  Evidence a sentence cannot carry.
 *
 *  A finding that says two things differ and does not show *how* has named a
 *  problem and withheld the proof, which leaves the reader to go and look it up
 *  themselves — on two chains, by hand. That is the one thing this product
 *  exists to save them. So a check that compares sets carries them.
 */
export type ComparisonRow = {
    /** What is being compared — a chain, by name and never by id. */
    readonly label: string;
    /** The values held there. Empty means "none", which is itself an answer. */
    readonly values: readonly string[];
    /** True when this row is the one the others are judged against. */
    readonly reference?: boolean;
};
/** How bad a finding is. Ordered, and the order is the band. */
export type Severity = "critical" | "high" | "medium" | "low" | "info";
/** Whether a check passed, failed, or could not be evaluated. */
export type CheckStatus = "ok" | "finding" | "inconclusive";
/** One check's result. */
export type Check = {
    readonly id: string;
    readonly title: string;
    readonly status: CheckStatus;
    /** Meaningful only for a finding. An `ok` check carries `info`. */
    readonly severity: Severity;
    /**
     *  The problem itself, in a few words — set only on a finding.
     *
     *  Separate from {@link title}, which names the *check*. Anywhere there is
     *  room for one line, this is the line: a card showing the title read
     *  "Across chains", which names the question rather than the answer.
     */
    readonly headline?: string;
    /** What was actually observed, in a sentence. Never a restatement of the title. */
    readonly evidence: string;
    /** The sets a comparison finding is about, so a view can show the difference. */
    readonly comparison?: readonly ComparisonRow[];
    /** What to do about it. Absent when there is nothing to do. */
    readonly recommendation?: string;
};
/** Everything the checks need, as read. `undefined` always means "not read". */
export type HealthFacts = {
    readonly account: Address;
    readonly chainId: number;
    /** Whether there is code at the address on this chain. */
    readonly deployed: boolean | undefined;
    readonly owners: readonly Address[] | undefined;
    readonly threshold: bigint | undefined;
    /** Which owners are themselves accounts, by address. */
    readonly accountOwners: readonly Address[] | undefined;
    readonly version: string | undefined;
    readonly modules: readonly Address[] | undefined;
    /** `true` when the module list was a prefix, so "none" cannot be concluded. */
    readonly moreModules: boolean;
    readonly guard: Address | undefined;
    readonly moduleGuard: Address | undefined;
    readonly fallbackHandler: Address | undefined;
    /** The singleton in the proxy's slot 0. */
    readonly singleton: Address | undefined;
    /** What the factory is configured to install today. */
    readonly expected: {
        safeSingleton: Address;
        fallbackHandler: Address;
    } | undefined;
    /** The key and index this address was proven to derive from, when it could be. */
    readonly derivation: {
        accountId: Address;
        index: bigint;
    } | undefined;
    /** Whether a derivation was attempted at all — distinct from attempted and failed. */
    readonly derivationAttempted: boolean;
    /** `false` when the custody walk ran and did not finish. */
    readonly custodyComplete: boolean | undefined;
    /** How far above the account authority was followed. */
    readonly custodyDepth: number | undefined;
    /** Per-chain owner sets, for the cross-chain comparison. */
    readonly perChain: readonly {
        chainId: number;
        /** The chain's display name. A finding that prints `50383` is unreadable. */
        chainName: string;
        deployed: boolean | undefined;
        owners: readonly Address[] | undefined;
    }[] | undefined;
};
/**
 *  Safe's own definition: the smallest threshold that is a real majority.
 *
 *  `floor(n/2) + 1`, which matters for an even owner count — 2-of-4 is not a majority, it is a
 *  tie that either half can break.
 */
export declare function simpleMajority(owners: number): number;
/** An account's overall standing, capped by its worst finding. */
export type HealthReport = {
    readonly checks: readonly Check[];
    /**
     *  The worst finding's severity, or `null` when there are none.
     *
     *  Deliberately not a score. Averaging cannot express "one thing here is fatal": nine passes
     *  and one catastrophe average to green, and green is what a user acts on.
     */
    readonly band: Severity | null;
    /** How many checks could not be evaluated. Shown, never folded into the band. */
    readonly inconclusive: number;
    readonly findings: readonly Check[];
};
/** Evaluate every check over the facts given. */
export declare function evaluateHealth(facts: HealthFacts): HealthReport;
/** Order two severities, worst first. Exported so a view can sort without restating the order. */
export declare function compareSeverity(a: Severity, b: Severity): number;
/**
 *  The reads {@link readHealthFacts} performs, already done.
 *
 *  **This exists so the mapping is written once.** {@link HealthFacts} has eighteen fields and most
 *  of them are tri-state, where `undefined` means "the read did not answer" and is load-bearing:
 *  the evaluator's whole contract is that an unanswered read produces `inconclusive` and never a
 *  finding, and it can only honour that if nobody upstream substituted a value. Assembling that by
 *  hand is subtle enough that a careful consumer got it wrong and saw a false "Different owners on
 *  different chains" — for an account that was simply deployed on one chain and not the others.
 *
 *  A caller with no cache wants {@link readHealthFacts}, which does the reads and calls this. A
 *  caller that already has the reads on screen — the explorer serves every one of them from its
 *  query cache — passes them here instead of fetching them twice.
 */
export interface HealthParts {
    /** The account being judged. */
    readonly account: Address;
    /** The chain it is being judged on. */
    readonly chainId: number;
    /** Whether there is code at the address here. `undefined` when the read did not answer. */
    readonly deployed: boolean | undefined;
    /** From `ownersOf`. */
    readonly owners: {
        readonly owners: readonly {
            address: Address;
            kind: string;
        }[];
        readonly threshold: bigint;
    } | undefined;
    /** From `configOf`. */
    readonly config: {
        readonly version: string | undefined;
        readonly modules: readonly Address[] | undefined;
        readonly moreModules: boolean;
        readonly guard: Address | undefined;
        readonly moduleGuard: Address | undefined;
        readonly fallbackHandler: Address | undefined;
        readonly singleton: Address | undefined;
    } | undefined;
    /** From `readFactoryImplementation` — what the factory installs today. */
    readonly expected: {
        readonly safeSingleton: Address;
        readonly fallbackHandler: Address;
    } | undefined;
    /** From `custodyChain`. */
    readonly custody: {
        readonly complete: boolean;
        readonly steps: readonly {
            readonly depth: number;
        }[];
    } | undefined;
    /** From `setupsAcrossChains`. Omit it and the cross-chain check reports "only one chain". */
    readonly setups: readonly {
        readonly chainId: number;
        readonly deployed: boolean | undefined;
        readonly owners: readonly Address[] | undefined;
    }[] | undefined;
    /**
     *  What to call a chain in a finding.
     *
     *  A finding that prints `50383` is unreadable. Defaults to `chain <id>`, which is honest and
     *  ugly; pass the real names.
     */
    readonly chainName?: (chainId: number) => string;
    /**
     *  Which key and index this address was proven to derive from.
     *
     *  Needs the candidate owners, so it is computed by the caller through `attributeAddress` and
     *  passed in. `derivationAttempted` is inferred from whether there were candidates at all —
     *  "not checked" and "does not match" are different answers and the origin check says so.
     */
    readonly derivation?: {
        readonly accountId: Address;
        readonly index: bigint;
    } | undefined;
}
/**
 *  Turn already-performed reads into the facts {@link evaluateHealth} judges.
 *
 *  Pure. Every value is passed through exactly as read — a failed read stays `undefined` rather
 *  than becoming a default — because substituting one here turns an unanswered question into a
 *  confident finding about somebody's account.
 *
 *  @param parts The reads, each `undefined` when it did not answer.
 *  @returns The facts, ready for {@link evaluateHealth}.
 */
export declare function assembleHealthFacts(parts: HealthParts): HealthFacts;
//# sourceMappingURL=health.d.ts.map