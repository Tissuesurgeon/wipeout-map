import { getAddress, zeroAddress } from "viem";
const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];
const same = (a, b) => getAddress(a).toLowerCase() === getAddress(b).toLowerCase();
const sameSet = (a, b) => {
    if (a.length !== b.length)
        return false;
    const left = [...a].map((x) => getAddress(x).toLowerCase()).sort();
    const right = [...b].map((x) => getAddress(x).toLowerCase()).sort();
    return left.every((x, i) => x === right[i]);
};
function inconclusive(id, title, evidence) {
    return { id, title, status: "inconclusive", severity: "info", evidence };
}
function ok(id, title, evidence) {
    return { id, title, status: "ok", severity: "info", evidence };
}
function finding(id, title, severity, headline, evidence, recommendation, comparison) {
    return {
        id,
        title,
        status: "finding",
        severity,
        headline,
        evidence,
        recommendation,
        ...(comparison === undefined ? {} : { comparison }),
    };
}
/**
 *  Safe's own definition: the smallest threshold that is a real majority.
 *
 *  `floor(n/2) + 1`, which matters for an even owner count — 2-of-4 is not a majority, it is a
 *  tie that either half can break.
 */
export function simpleMajority(owners) {
    return Math.floor(owners / 2) + 1;
}
/** Threshold against owner count. */
function checkSetup(facts) {
    const id = "setup";
    const title = "Owners and threshold";
    if (facts.owners === undefined || facts.threshold === undefined) {
        return inconclusive(id, title, "The owner set could not be read.");
    }
    const n = facts.owners.length;
    const t = Number(facts.threshold);
    if (n === 0) {
        return finding(id, title, "critical", "No owners — nothing can act", "This account has no owners, so nothing can ever act for it.", "Nothing can fix this from outside. Do not send funds to this account.");
    }
    if (t > n) {
        return finding(id, title, "critical", "Threshold can never be met", `The threshold is ${t} but there are only ${n} owners, so no set of signatures can ever be enough.`, "The account is frozen. Do not send funds to it.");
    }
    if (n === 1 && t === 1) {
        // `low`, not `medium`: this is exactly the state the factory leaves an account in,
        // so for a freshly created one it is an unfinished step rather than a defect. The
        // risk is real either way — one key, no recovery path — so it is still a finding.
        return finding(id, title, "low", "One key, no backup", "One owner, threshold 1. This is how the factory creates an account, so it may simply not have had a second key granted yet — but until it does, losing that one key strands the account permanently.", "Grant a second owner. The contracts have no recovery path, so a second key is the only protection against losing the first.");
    }
    if (t === n && n > 1) {
        return finding(id, title, "medium", "Every owner must sign", `Threshold ${t} of ${n} requires every owner to sign, so losing any single key strands the account permanently.`, `Lower the threshold to ${simpleMajority(n)} — a real majority of ${n} — so one lost key is survivable.`);
    }
    // No "threshold below a majority" rule, deliberately. It is the obvious next check
    // and it is wrong for this product: our accounts are *designed* as 1-of-2 — a login
    // wallet plus a session key that has to act alone so the app can trade without a
    // prompt. Flagging that would put a warning on every account we create, which is
    // precisely the crying-wolf failure this matrix exists to avoid. Intent is not
    // readable from chain, so the check stays silent rather than guessing.
    return ok(id, title, `Threshold ${t} of ${n} owners. Any ${t === 1 ? "single owner" : `${t} owners`} can act, and losing one key does not strand the account.`);
}
/**
 *  Where this account came from.
 *
 *  **The check this product exists for.** Safe cannot do it: its address hashes the whole setup
 *  calldata, so given an address there is nothing to reproduce. Ours is `CREATE3` over
 *  `(accountId, index)`, so an address either reproduces from a key or it does not, and that is a
 *  proof rather than a heuristic.
 *
 *  Three outcomes rather than two, because "not attributable" is not "not ours". An account whose
 *  owners were rotated away from its derivation key is entirely legitimate and no longer
 *  attributable from its current owners — so that case falls back to the weaker but still real
 *  evidence: does the proxy point at the singleton our factory installs?
 */
function checkOrigin(facts) {
    const id = "origin";
    const title = "Where this account came from";
    if (facts.deployed === undefined) {
        return inconclusive(id, title, "Whether there is code at this address could not be read.");
    }
    if (facts.deployed === false) {
        return ok(id, title, "Nothing is deployed here yet. The address is still determined by the key and index it derives from, and cannot change.");
    }
    if (facts.derivation !== undefined) {
        return ok(id, title, `Proven: this is index ${facts.derivation.index} under ${facts.derivation.accountId}, re-derived offline and matched exactly.`);
    }
    if (facts.singleton === undefined || facts.expected === undefined) {
        return inconclusive(id, title, "The proxy's singleton or the factory's configured one could not be read, so its origin is unverified.");
    }
    if (!same(facts.singleton, facts.expected.safeSingleton)) {
        return finding(id, title, "high", "Not made by our factory", `This proxy delegates to ${facts.singleton}, which is not the singleton our factory installs (${facts.expected.safeSingleton}). It was very likely not created by us.`, "Treat this as an unrelated contract. Verify independently what its code does before sending anything to it.");
    }
    // Ours by singleton, but not reproducible from the current owners.
    return facts.derivationAttempted
        ? finding(id, title, "low", "Created by a key that no longer owns it", "It delegates to our factory's singleton, but none of its current owners derives this address — so the key it was created under is no longer an owner.", "Nothing is broken and the address cannot change. Keep a record of the original key: it is the only thing that explains this address.")
        : inconclusive(id, title, "It delegates to our factory's singleton. Which key and index produced it was not checked.");
}
/** The fallback handler, against what the factory installs. */
function checkFallbackHandler(facts) {
    const id = "fallback-handler";
    const title = "Fallback handler";
    if (facts.deployed === false) {
        return ok(id, title, "Not deployed yet, so it has no handler.");
    }
    if (facts.fallbackHandler === undefined || facts.expected === undefined) {
        return inconclusive(id, title, "The installed handler or the factory's configured one could not be read.");
    }
    if (facts.fallbackHandler === zeroAddress) {
        return finding(id, title, "medium", "Can't sign for other accounts", "No fallback handler is installed, so this account cannot produce an EIP-1271 signature — it cannot sign for another account, and contracts that check signatures this way will reject it.", `Set the handler to ${facts.expected.fallbackHandler}, which is what the factory installs.`);
    }
    // Compared against the factory's *own* configured handler rather than a list of Safe's official
    // ones. That is a stronger statement and a simpler one: the question is whether this account
    // matches what we install, and the factory is the authority on that.
    if (!same(facts.fallbackHandler, facts.expected.fallbackHandler)) {
        return finding(id, title, "high", "Unexpected fallback handler", `The handler is ${facts.fallbackHandler}, not the ${facts.expected.fallbackHandler} our factory installs. A fallback handler receives every call this account does not itself implement.`, "Verify what that contract does before using this account. If it was not set deliberately, set it back to the factory's handler.");
    }
    return ok(id, title, "The handler is the one our factory installs.");
}
/** Version and singleton. */
function checkVersion(facts) {
    const id = "version";
    const title = "Safe version";
    if (facts.deployed === false) {
        return ok(id, title, "Not deployed yet.");
    }
    if (facts.version === undefined) {
        return inconclusive(id, title, "The version could not be read.");
    }
    if (facts.singleton !== undefined && facts.expected !== undefined) {
        if (!same(facts.singleton, facts.expected.safeSingleton)) {
            return finding(id, title, "medium", "Runs older code than the factory installs", `Reports version ${facts.version}, but delegates to ${facts.singleton} rather than the ${facts.expected.safeSingleton} the factory installs today. Its behaviour is whatever that contract does.`, "Confirm which singleton this is before relying on it. The factory only affects accounts created after it was configured.");
        }
    }
    return ok(id, title, `Safe ${facts.version}, on the singleton the factory installs.`);
}
/**
 *  Modules and guards.
 *
 *  The factory installs neither, deliberately — so anything here was added afterwards by an owner
 *  transaction, and a non-empty set *is* the finding rather than something to compare against a
 *  baseline. A module can execute from the account with no owner signature at all.
 */
function checkModulesAndGuards(facts) {
    const id = "modules";
    const title = "Modules and guards";
    if (facts.deployed === false) {
        return ok(id, title, "Not deployed yet, so nothing is installed.");
    }
    if (facts.modules === undefined) {
        return inconclusive(id, title, "The module list could not be read, so this account has not been shown to have none.");
    }
    const guard = facts.guard !== undefined && facts.guard !== zeroAddress ? facts.guard : null;
    const moduleGuard = facts.moduleGuard !== undefined && facts.moduleGuard !== zeroAddress ? facts.moduleGuard : null;
    if (facts.modules.length > 0) {
        return finding(id, title, "high", "A module can move funds without you", `${facts.modules.length} module${facts.modules.length === 1 ? "" : "s"} enabled: ${facts.modules.join(", ")}. A module can move everything this account holds without any owner signature. The factory installs none, so these were added afterwards.`, "Confirm every one of these was added deliberately. Disable any that were not.");
    }
    if (facts.moreModules) {
        return inconclusive(id, title, "More modules exist than one page holds, so the full list was not read.");
    }
    if (guard !== null) {
        return finding(id, title, "medium", "A guard can block every transaction", `A transaction guard is set (${guard}). It can veto every transaction this account attempts, including owner changes.`, "Confirm it was set deliberately. A guard that reverts unconditionally makes the account unusable.");
    }
    if (moduleGuard !== null) {
        return finding(id, title, "low", "A module guard is set with no modules", `A module guard is set (${moduleGuard}), though no modules are enabled for it to govern.`, "Harmless while there are no modules. Confirm it was set deliberately.");
    }
    if (facts.guard === undefined || facts.moduleGuard === undefined) {
        return inconclusive(id, title, "No modules are enabled, but the guards could not be read.");
    }
    return ok(id, title, "No modules and no guards. Only owner signatures can move anything.");
}
/**
 *  Where authority ultimately rests.
 *
 *  Ours rather than Safe's, and the most consequential check here. An account owned by another
 *  account can only act while its parent can, the contracts have no recovery path, and nothing
 *  on chain marks the situation as unusual.
 */
function checkCustody(facts) {
    const id = "custody";
    const title = "Chain of custody";
    if (facts.deployed === false) {
        return ok(id, title, "Not deployed yet.");
    }
    if (facts.accountOwners === undefined) {
        return inconclusive(id, title, "Whether any owner is itself an account could not be read.");
    }
    if (facts.custodyComplete === false) {
        return inconclusive(id, title, "The walk up the ownership chain did not finish, so the keys that control this account are a subset rather than the full set.");
    }
    if (facts.accountOwners.length === 0) {
        return ok(id, title, "Every owner is a plain key, so authority over this account stops here.");
    }
    const depth = facts.custodyDepth;
    return finding(id, title, "medium", "Owned by another account", `${facts.accountOwners.length} of its owners ${facts.accountOwners.length === 1 ? "is" : "are"} another account${depth !== undefined && depth > 1 ? `, and authority runs ${depth} levels up` : ""}. This account can only act while ${facts.accountOwners.length === 1 ? "that one" : "those"} can, and the contracts have no recovery path if the keys at the top are lost.`, "Make sure someone holds the keys at the top of the chain, and keep a record of which. Nothing can recover this account without them.");
}
/** The same address, across the chains it was asked about. */
function checkMultichain(facts) {
    const id = "multichain";
    const title = "Across chains";
    if (facts.perChain === undefined || facts.perChain.length < 2) {
        return inconclusive(id, title, "Only one chain was read, so there is nothing to compare.");
    }
    const live = facts.perChain.filter((c) => c.deployed === true);
    const unread = facts.perChain.filter((c) => c.deployed === undefined);
    const absent = facts.perChain.filter((c) => c.deployed === false);
    if (live.length === 0) {
        return unread.length > 0
            ? inconclusive(id, title, "No chain answered, so nothing can be compared.")
            : ok(id, title, "Not deployed on any chain read. The address is the same on all of them and is already reserved by the derivation.");
    }
    // Chains where it is not deployed are excluded from the comparison rather than counted as
    // different: an address with no code has no owner set to disagree with.
    const withOwners = live.filter((c) => c.owners !== undefined);
    if (withOwners.length < live.length || unread.length > 0) {
        return inconclusive(id, title, `Deployed on ${live.length} chain${live.length === 1 ? "" : "s"}, but not every owner set could be read, so they cannot be compared.`);
    }
    const first = withOwners[0];
    if (first === undefined) {
        return inconclusive(id, title, "No owner set was read.");
    }
    const diverging = withOwners.filter((c) => !sameSet(c.owners ?? [], first.owners ?? []));
    if (diverging.length > 0) {
        // The owner sets themselves, not a claim that they differ. Naming the
        // chains and withholding the addresses leaves the reader to go and read
        // two chains by hand, which is the work this product exists to save.
        const comparison = withOwners.map((c) => ({
            label: c.chainName,
            values: [...(c.owners ?? [])].map((o) => getAddress(o)),
            reference: c.chainId === first.chainId,
        }));
        return finding(id, title, "medium", "Different owners on different chains", `${diverging.map((c) => c.chainName).join(" and ")} ${diverging.length === 1 ? "does" : "do"} not have the same owners as ${first.chainName}. Owners are per-chain state, so a key granted on one chain is not granted on the others.`, "Decide which set is correct and bring the others in line, or keep a record of why they differ.", comparison);
    }
    const note = absent.length > 0
        ? ` Not deployed on ${absent.map((c) => c.chainName).join(" or ")}, where the address is reserved but empty.`
        : "";
    return ok(id, title, withOwners.length === 1
        ? `Deployed on one chain, so there is nothing to disagree with.${note}`
        : `The same owners on all ${withOwners.length} chains it is deployed on.${note}`);
}
/** Evaluate every check over the facts given. */
export function evaluateHealth(facts) {
    const checks = [
        checkOrigin(facts),
        checkSetup(facts),
        checkCustody(facts),
        checkModulesAndGuards(facts),
        checkFallbackHandler(facts),
        checkVersion(facts),
        checkMultichain(facts),
    ];
    const findings = checks.filter((c) => c.status === "finding");
    const band = findings.length === 0
        ? null
        : (SEVERITY_ORDER.find((s) => findings.some((f) => f.severity === s)) ?? null);
    return {
        checks,
        band,
        inconclusive: checks.filter((c) => c.status === "inconclusive").length,
        findings,
    };
}
/** Order two severities, worst first. Exported so a view can sort without restating the order. */
export function compareSeverity(a, b) {
    return SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b);
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
export function assembleHealthFacts(parts) {
    const ownerAddresses = parts.owners?.owners.map((o) => getAddress(o.address));
    const name = parts.chainName ?? ((id) => `chain ${id}`);
    return {
        account: getAddress(parts.account),
        chainId: parts.chainId,
        deployed: parts.deployed,
        owners: ownerAddresses,
        threshold: parts.owners?.threshold,
        accountOwners: parts.owners?.owners
            .filter((o) => o.kind === "account")
            .map((o) => getAddress(o.address)),
        version: parts.config?.version,
        modules: parts.config?.modules,
        moreModules: parts.config?.moreModules ?? false,
        guard: parts.config?.guard,
        moduleGuard: parts.config?.moduleGuard,
        fallbackHandler: parts.config?.fallbackHandler,
        singleton: parts.config?.singleton,
        expected: parts.expected,
        derivation: parts.derivation,
        // Only true once there were candidates to check against. Without them the origin check has to
        // say "not checked" rather than "does not match".
        derivationAttempted: ownerAddresses !== undefined && ownerAddresses.length > 0,
        custodyComplete: parts.custody?.complete,
        custodyDepth: parts.custody?.steps.reduce((max, step) => Math.max(max, step.depth), 0),
        perChain: parts.setups?.map((setup) => ({
            chainId: setup.chainId,
            chainName: name(setup.chainId),
            deployed: setup.deployed,
            owners: setup.owners,
        })),
    };
}
//# sourceMappingURL=health.js.map