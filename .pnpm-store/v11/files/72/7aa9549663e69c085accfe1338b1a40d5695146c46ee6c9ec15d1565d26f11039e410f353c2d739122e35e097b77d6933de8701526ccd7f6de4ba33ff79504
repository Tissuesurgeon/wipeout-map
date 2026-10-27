// Gathering the facts a health report is judged from.
//
// **Separate from `health.ts` on purpose.** That module is pure over facts read elsewhere, which
// is what makes every condition in it testable without a chain — a property worth keeping. This
// one does the reads, and the split is the only reason the evaluator can be exercised against a
// hand-built `HealthFacts` in a unit test.
//
// **Why this exists at all.** `HealthFacts` has eighteen fields, most of them tri-state, and
// assembling it means six reads whose failures must each stay `undefined` rather than becoming a
// default. Every consumer was writing that by hand, and a careful one got it wrong: a mis-mapped
// per-chain entry produced "Different owners on different chains" for an account that was simply
// deployed on one chain and not the others. Nothing in the evaluator was wrong; the facts handed
// to it were.
import { getAddress } from "viem";
import { attributeAddress } from "./account-config.js";
import { configOf } from "./account-config.js";
import { custodyChain, hasCode, ownersOf, setupsAcrossChains } from "./discovery.js";
import { readFactoryImplementation } from "./factory.js";
import { assembleHealthFacts } from "./health.js";
/**
 *  Run a read and turn any failure into `undefined`.
 *
 *  **Deliberate, and the opposite of what this SDK does everywhere else.** A failed read is
 *  normally a thrown `RpcError`, because a caller acting on a value that was never read is the
 *  failure mode worth being loud about. Here the unanswered case IS the product: the evaluator
 *  reports `inconclusive` for it, which is a better answer than no report at all. A health check
 *  that refuses to run because one of six reads timed out tells a user nothing about the five that
 *  answered.
 */
async function attempt(read) {
    return read.catch(() => undefined);
}
/**
 *  Read everything a health report needs, on one chain and optionally across several.
 *
 *  **Every read is best-effort.** One that does not answer leaves its field `undefined`, and the
 *  evaluator turns that into `inconclusive` rather than into a finding. That is the whole contract:
 *  a report says "I could not check this" where it does not know, and never guesses.
 *
 *  The reads run concurrently and none depends on another, except the derivation — which needs the
 *  owner set to have candidates to attribute the address to, and is skipped when there are none.
 *
 *  **Example**
 *
 *  ```ts
 *  const facts = await readHealthFacts(client, {
 *    account,
 *    chainId: chain.id,
 *    across: [
 *      {client: mainnet, chainId: 5031},
 *      {client: testnet, chainId: 50312},
 *    ],
 *    chainName: (id) => chains[id]?.name ?? `chain ${id}`,
 *  });
 *  const report = evaluateHealth(facts);
 *  ```
 *
 *  @param client A viem client for the chain being judged.
 *  @param args.account The account.
 *  @param args.chainId The chain being judged. Must be the chain `client` is on.
 *  @param args.across One client per chain for the cross-chain owner comparison. Omit it and that
 *         check reports "only one chain was read" rather than a finding.
 *  @param args.chainName What to call a chain in a finding. A finding that prints `50383` is
 *         unreadable.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The facts, ready for `evaluateHealth`.
 *  @throws {UnsupportedChainError} When `chainId` has no committed deployment. Deliberately NOT
 *          caught: a health report about the wrong chain's factory is worse than none.
 */
export async function readHealthFacts(client, args) {
    const account = getAddress(args.account);
    const [deployed, owners, config, expected, custody, setups] = await Promise.all([
        attempt(hasCode(client, account)).then((v) => (v === undefined ? undefined : v)),
        attempt(ownersOf(client, account)),
        attempt(configOf(client, account)),
        attempt(readFactoryImplementation(client, args.chainId, args.saltVersion)),
        attempt(custodyChain(client, account)),
        args.across === undefined || args.across.length === 0
            ? Promise.resolve(undefined)
            : attempt(setupsAcrossChains(args.across, account)),
    ]);
    // Needs candidates. With no owner set there is nothing to attribute the address to, and
    // `assembleHealthFacts` reads that absence as "not checked" rather than "does not match".
    const candidates = owners?.owners.map((o) => getAddress(o.address)) ?? [];
    const derivation = candidates.length === 0
        ? undefined
        : attributeAddress(args.chainId, account, candidates, {
            ...(args.saltVersion === undefined ? {} : { saltVersion: args.saltVersion }),
        });
    return assembleHealthFacts({
        account,
        chainId: args.chainId,
        deployed,
        owners,
        config,
        expected,
        custody,
        setups,
        ...(args.chainName === undefined ? {} : { chainName: args.chainName }),
        ...(derivation === undefined ? {} : { derivation }),
    });
}
//# sourceMappingURL=health-reads.js.map