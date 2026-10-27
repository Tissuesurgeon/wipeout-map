import type { Address } from "viem";
import { type DeployedName, type Deployment, type DeploymentEnv } from "./generated/deployments.js";
export type { DeployedName, Deployment, DeploymentEnv };
/**
 *  Every chain the protocol is deployed on, ascending.
 *
 *  Derived from the manifests, so a new chain appears here by being deployed to and nothing else.
 *  Use it to decide whether a wallet's chain is one this SDK can work with, before calling anything
 *  that throws.
 */
export declare const SUPPORTED_CHAIN_IDS: readonly number[];
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
export declare function deploymentFor(chainId: number, saltVersion?: string): Deployment;
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
export declare function contractAddress(chainId: number, name: DeployedName, saltVersion?: string): Address;
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
export declare function deploymentsFor(chainId: number): readonly Deployment[];
//# sourceMappingURL=contracts.d.ts.map