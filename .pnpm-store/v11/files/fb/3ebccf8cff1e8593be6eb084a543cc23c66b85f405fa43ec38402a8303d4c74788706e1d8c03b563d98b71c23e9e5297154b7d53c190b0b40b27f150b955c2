// The Somnia networks as chain ids — the shared vocabulary between the chain
// definitions and everything keyed by network: the bridge registry, deployment
// manifests, wallets. A LEAF module on purpose: bridge/ imports it, and
// chains/index.ts re-exports bridge/ before its own declarations run, so
// defining this next to `somniaChains` in index.ts would be a temporal-dead-zone
// cycle at import time.

import { hidekiTestnet } from "./definitions/hidekiTestnet.js";
import { somniaElwood } from "./definitions/somniaElwood.js";
import { somniaLocal } from "./definitions/somniaLocal.js";
import { somniaMainnet } from "./definitions/somniaMainnet.js";
import { somniaShannon } from "./definitions/somniaShannon.js";

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
export const ChainId = {
  /** Somnia mainnet (`5031`). Not bridged yet. */
  somniaMainnet: somniaMainnet.id,
  /** Somnia Testnet — Shannon (`50312`), the general-purpose testnet. Bridged. */
  somniaShannon: somniaShannon.id,
  /** Somnia Testnet — Elwood (`50313`), the testnet regenesis. Not bridged yet. */
  somniaElwood: somniaElwood.id,
  /** Hideki Testnet (`50383`) — the low-latency Tokyo network. Bridged. */
  hidekiTestnet: hidekiTestnet.id,
  /** The local anvil stack (`31337`). Never bridged. */
  somniaLocal: somniaLocal.id,
} as const;

/**
 * Chain id of one of the Somnia networks — the union behind `somniaChains`.
 *
 * @category networks
 */
export type ChainId = (typeof ChainId)[keyof typeof ChainId];
