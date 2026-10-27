// Where a contract is, by chain id.
//
// Nothing here holds an address. `src/generated/deployments.ts` is written on every build by
// `scripts/generate-deployments.mjs`, which calls the same parser
// `@somnia-chain/accounts-deployments` uses on the same committed manifests — so a constant in this
// file would be a second source of truth that no deploy updates, which is the failure that whole
// arrangement exists to prevent.
//
// **Baked rather than imported, because this package is published.** The hub is `workspace:*` and
// never goes to npm; a dependency on it would be unresolvable for anyone installing this SDK. It
// stays a devDependency and a build input.
//
// What this module adds on top of the data is the two things a consumer actually wants: a lookup
// keyed by chain id alone, and a throw instead of an `undefined` at the point where an address is
// about to go into a transaction.
import { deployments, } from "./generated/deployments.js";
import { AmbiguousDeploymentError, MissingContractError, UnsupportedChainError } from "./errors.js";
/**
 *  Every chain the protocol is deployed on, ascending.
 *
 *  Derived from the manifests, so a new chain appears here by being deployed to and nothing else.
 *  Use it to decide whether a wallet's chain is one this SDK can work with, before calling anything
 *  that throws.
 */
export const SUPPORTED_CHAIN_IDS = [
    ...new Set(deployments.map((d) => d.chainId)),
].sort((a, b) => a - b);
/**
 *  The deployment for a chain.
 *
 *  @param chainId EIP-155 chain id.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The deployment.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 *  @throws {AmbiguousDeploymentError} When several salt versions are committed and `saltVersion`
 *          does not say which — never a silent pick.
 */
export function deploymentFor(chainId, saltVersion) {
    const matches = deploymentsFor(chainId).filter((d) => saltVersion === undefined || d.saltVersion === saltVersion);
    if (matches.length > 1) {
        throw new AmbiguousDeploymentError(chainId, matches.map((d) => d.saltVersion));
    }
    const deployment = matches[0];
    if (deployment === undefined)
        throw new UnsupportedChainError(chainId);
    return deployment;
}
/**
 *  One address, by chain id and name.
 *
 *  The generic form. `name` is a union of what the manifests actually spell, so a typo is a
 *  compile error rather than a call to the zero address at runtime.
 *
 *  ```ts
 *  contractAddress(50312, "Safe"); // "0x72Eca31Fa4cfec551d6C5b159152B11731186C0A"
 *  ```
 *
 *  @param chainId EIP-155 chain id.
 *  @param name The name as the manifest spells it.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The address.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 *  @throws {MissingContractError} When the chain is deployed but that name is not.
 */
export function contractAddress(chainId, name, saltVersion) {
    const address = deploymentFor(chainId, saltVersion).contracts[name];
    if (address === undefined)
        throw new MissingContractError(chainId, name);
    return address;
}
/**
 *  Every deployment committed for a chain.
 *
 *  For listing rather than resolving — an operator view, a docs table, a health check that walks
 *  every address. Returns an empty array for an undeployed chain instead of throwing, because
 *  "nothing here" is the answer to that question rather than an error in it.
 *
 *  @param chainId EIP-155 chain id.
 *  @returns The matching deployments, one per salt version.
 */
export function deploymentsFor(chainId) {
    return deployments.filter((d) => d.chainId === chainId);
}
//# sourceMappingURL=contracts.js.map