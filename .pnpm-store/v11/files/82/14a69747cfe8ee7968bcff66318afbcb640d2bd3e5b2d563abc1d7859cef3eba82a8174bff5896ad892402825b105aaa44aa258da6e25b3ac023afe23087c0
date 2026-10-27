/** Every environment name a committed manifest uses. */
export type DeploymentEnv = "hideki-testnet" | "somnia-mainnet" | "somnia-testnet";
/**
 *  Every name a committed manifest gives an address to.
 *
 *  Not all of them are contracts this repo deploys: `safeSingleton` and `fallbackHandler` are the
 *  factory's *configuration* (echoing `Safe` and `CompatibilityFallbackHandler`), `factoryAdmin`
 *  is an EOA, and `protocolDeployer` is the pre-existing CREATE3 registry the rest derive from.
 *  They are published because looking one of them up is exactly what an operator needs to do, and
 *  the alternative is a hardcoded constant somewhere else.
 */
export type DeployedName = "CompatibilityFallbackHandler" | "MultiSend" | "MultiSendCallOnly" | "Safe" | "SafeProxyFactory" | "SomniaAccountFactory" | "SomniaAccountFactoryImpl" | "SomniaAccountFactoryImplV2" | "SomniaAccountFactoryImplV3" | "factoryAdmin" | "fallbackHandler" | "protocolDeployer" | "safeSingleton";
/** A deployed contract set for one chain and environment. */
export interface Deployment {
    /** EIP-155 chain id. */
    readonly chainId: number;
    /** Which manifest this came from. */
    readonly env: DeploymentEnv;
    /** The `SALT_VERSION` the set was deployed under. */
    readonly saltVersion: string;
    /** Name to address. `Partial`, because a manifest need not carry every name. */
    readonly contracts: Readonly<Partial<Record<DeployedName, `0x${string}`>>>;
}
/** Every manifest currently committed. */
export declare const deployments: readonly Deployment[];
//# sourceMappingURL=deployments.d.ts.map