// Chains entry — "@somnia-chain/markets-sdk/chains". Every Somnia network as a
// viem `Chain`, so nothing in this repo (or downstream) has to hand-roll a
// `defineChain({...})` or reach for "viem/chains" again.
//
// Why a local module instead of "viem/chains": viem ships only two of these
// (its `somnia` and `somniaTestnet`) and can't ship the rest — Elwood, Hideki
// and the local Anvil stack are our networks, on our cadence. Keeping all five
// here means one import for every target, and new networks land the moment we
// bring them up rather than the next time viem cuts a release.
//
// NAMING: these exports use the network names the runbooks and dashboards use —
// `somniaMainnet` / `somniaShannon` / `somniaElwood` / `hidekiTestnet` — not
// viem's `somnia` / `somniaTestnet`.
//
// Each definition lives in its own file under `definitions/` and is written the
// way viem writes its own (`export const x = /*#__PURE__*/ defineChain({...})`),
// field order and all — so the two stay diffable and `somniaMainnet` /
// `somniaShannon` are field-for-field replacements for viem's `somnia` /
// `somniaTestnet` (a test asserts the parity). Keep them in lockstep with
// node_modules/viem/_esm/chains/definitions/somnia{,Testnet}.js.
//
// The values are not folklore: chain ids, block cadence and Multicall3
// deployments were confirmed against the live networks (`eth_chainId`, block
// timestamp deltas over 10k blocks, `eth_getCode` + a real `getBlockNumber()`
// call on each Multicall3 candidate). Where a network has no Multicall3 or no
// public explorer, the field is OMITTED rather than guessed — an address with no
// code behind it is worse than an absent one, because viem would happily route
// batched reads at it.

import type { Chain } from "viem";

// ---- the token bridge (Hyperlane warp routes between these networks) ----
// Data + a pure planner + one opt-in sender (sendBridgeStep, the only RPC-touching
// piece). See bridge/index.ts for the trust-model warning.
export * from "./bridge/index.js";

// Every network's chain id, keyed by the definition export names below —
// `ChainId.somniaShannon === somniaShannon.id`. Lives in its own leaf module so
// the bridge registry can import it without a cycle through this barrel.
export { ChainId } from "./chainId.js";

export { somniaMainnet } from "./definitions/somniaMainnet.js";
export { somniaShannon } from "./definitions/somniaShannon.js";
export { somniaElwood } from "./definitions/somniaElwood.js";
export { hidekiTestnet } from "./definitions/hidekiTestnet.js";
export { somniaLocal } from "./definitions/somniaLocal.js";

import { type ChainId } from "./chainId.js";
import { somniaMainnet } from "./definitions/somniaMainnet.js";
import { somniaShannon } from "./definitions/somniaShannon.js";
import { somniaElwood } from "./definitions/somniaElwood.js";
import { hidekiTestnet } from "./definitions/hidekiTestnet.js";
import { somniaLocal } from "./definitions/somniaLocal.js";

/**
 *  `defineChain` and `Chain`, re-exported from viem so a consumer can extend one
 *  of these definitions (or define a network we don't ship yet) without a second
 *  import.
 *
 * **Example** (Defining a fork)
 *
 * ```ts
 * import { defineChain, somniaShannon } from "@somnia-chain/markets-sdk/chains";
 *
 * const forked = defineChain({
 *   ...somniaShannon,
 *   id: 31_337,
 *   name: "Somnia Testnet (forked)",
 *   rpcUrls: { default: { http: ["http://127.0.0.1:8545"], webSocket: ["ws://127.0.0.1:8545"] } },
 * });
 * ```
 */
export { defineChain, type Chain } from "viem";

/**
 *  Every Somnia network this module ships, keyed by chain id — the lookup table
 *  behind {@link getSomniaChain}. Iterate it to build a network switcher; index it
 *  when you already know the id is one of ours.
 *
 * @category networks
 */
export const somniaChains = {
  [somniaMainnet.id]: somniaMainnet,
  [somniaShannon.id]: somniaShannon,
  [somniaElwood.id]: somniaElwood,
  [hidekiTestnet.id]: hidekiTestnet,
  [somniaLocal.id]: somniaLocal,
} as const satisfies Record<ChainId, Chain>;

/**
 *  Resolve a chain id to its definition, or `null` when it isn't a Somnia network
 *  we ship. The `chainId` a deployment manifest carries is a plain `number`, so
 *  this is the bridge from "the env told me 50312" to a viem `Chain`.
 *
 * **Details**
 *
 * - `chainId`: Chain id to look up (e.g. `50312`).
 * - Returns: The matching viem `Chain`, or `null` if it isn't one of ours.
 *
 * **Example** (Resolving a deployment chain)
 *
 * ```ts
 * import { getSomniaChain, defineChain } from "@somnia-chain/markets-sdk/chains";
 *
 * const chain =
 *   getSomniaChain(deployment.chainId) ??
 *   defineChain({
 *     id: deployment.chainId,
 *     name: "Somnia",
 *     nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
 *     rpcUrls: { default: { http: [rpcUrl] } },
 *   });
 * ```
 *
 * @category networks
 */
export function getSomniaChain(chainId: number): Chain | null {
  return (somniaChains as Record<number, Chain>)[chainId] ?? null;
}

/**
 *  Type guard: is this chain id one of the Somnia networks in
 *  {@link somniaChains}? Narrows a plain `number` to {@link ChainId}, so it can
 *  index `somniaChains` without a cast.
 *
 * **Details**
 *
 * - `chainId`: Chain id to test.
 *
 * @category networks
 */
export function isSomniaChainId(chainId: number): chainId is ChainId {
  return chainId in somniaChains;
}
