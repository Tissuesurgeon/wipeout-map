/**
 *  Every Somnia network's chain id, keyed by its chain definition's export
 *  name — `ChainId.somniaShannon === somniaShannon.id` by construction, so the
 *  constant and the definition can never disagree. The id is the value because
 *  that is what wallets, deployment manifests and viem all speak — and on the
 *  bridge the Hyperlane **domain id equals the chain id**, so one number
 *  identifies a network everywhere.
 *
 *  A `const` object with a matching type, not a TS `enum` — the pattern this
 *  package uses everywhere (`BridgeToken`, `BinarySide`, …): `ChainId.somniaShannon`
 *  is the value, `ChainId` is also the type of every such value, and plain
 *  number literals still assign.
 *
 *  Not every network is bridged — `listBridgeNetworks()` is the live set.
 *
 * **Example** (Indexing a chain definition)
 *
 * ```ts
 * import { ChainId, somniaChains } from "@somnia-chain/markets-sdk/chains";
 *
 * somniaChains[ChainId.hidekiTestnet].name; // "Hideki Testnet"
 * ```
 *
 * @category networks
 */
export declare const ChainId: {
    /** Somnia mainnet (`5031`). Not bridged yet. */
    readonly somniaMainnet: 5031;
    /** Somnia Testnet — Shannon (`50312`), the general-purpose testnet. Bridged. */
    readonly somniaShannon: 50312;
    /** Somnia Testnet — Elwood (`50313`), the testnet regenesis. Not bridged yet. */
    readonly somniaElwood: 50313;
    /** Hideki Testnet (`50383`) — the low-latency Tokyo network. Bridged. */
    readonly hidekiTestnet: 50383;
    /** The local anvil stack (`31337`). Never bridged. */
    readonly somniaLocal: 31337;
};
/**
 * Chain id of one of the Somnia networks — the union behind `somniaChains`.
 *
 * @category networks
 */
export type ChainId = (typeof ChainId)[keyof typeof ChainId];
