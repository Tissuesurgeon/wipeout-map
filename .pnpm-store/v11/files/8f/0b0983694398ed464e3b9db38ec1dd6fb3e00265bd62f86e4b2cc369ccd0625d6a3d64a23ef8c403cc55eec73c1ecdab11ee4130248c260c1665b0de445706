import { type Address, type Client } from "viem";
import { type HealthFacts } from "./health.js";
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
export declare function readHealthFacts(client: Client, args: {
    account: Address;
    chainId: number;
    across?: readonly {
        client: Client;
        chainId: number;
    }[];
    chainName?: (chainId: number) => string;
    saltVersion?: string;
}): Promise<HealthFacts>;
//# sourceMappingURL=health-reads.d.ts.map