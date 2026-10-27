import type { Address } from "viem";
import { BridgeToken, type BridgeDetails, type BridgeNetworkDetails, type BridgeRoute, type BridgeTokenDetails } from "./types.js";
/**
 *  The Somnia token bridge: one Hyperlane lane, **Somnia Testnet ↔ Hideki2 Testnet**,
 *  carrying five token routes.
 *
 *  Hideki2 is the 2026-09-17 regenesis of Hideki. {@link ChainId.hidekiTestnet} (50383)
 *  resolves to it. Hideki 1 still runs on its own lane. This SDK does not ship that lane.
 *
 *  Both chains use chain id 50383. Both use Hyperlane domain 50383. No id therefore tells
 *  the two lanes apart. Their Somnia-side core contracts differ, and that difference is the
 *  only way to identify a lane.
 *
 *  > ⚠️ **`status: "dev-test"`.** A single validator, a threshold-1 ISM and EOA
 *  > owners — one key is the entire bridge. Do not put real funds behind it.
 *
 *  Delivery gas is paid by the relayer, unmetered
 *  ({@link BridgeDetails.relayerPaysDestinationGas}): a sender attaches nothing for
 *  it, and a drained relayer means transfers are accepted on the origin but not
 *  delivered until it is refunded — escrowed, not lost.
 *
 * **Example** (Inspecting the registry)
 *
 * ```ts
 * import { SOMNIA_BRIDGE } from "@somnia-chain/markets-sdk/chains";
 *
 * SOMNIA_BRIDGE.tokens;   // ["STT", "USDso", "WBTC", "WETH", "HBTT"]
 * SOMNIA_BRIDGE.chainIds; // [50312, 50383]
 * SOMNIA_BRIDGE.id;       // "somniatestnet-hideki2testnet"
 * ```
 *
 * @category bridging
 */
export declare const SOMNIA_BRIDGE: BridgeDetails;
/**
 *  Token details for one token on one network — the router to call, what the sender
 *  holds, its decimals, and where it can go.
 *
 * **Details**
 *
 * - `token`: Token symbol.
 * - `chainId`: Chain id of the network (also the Hyperlane domain id).
 * - Returns: The details, or `null` when that token has no route on that network.
 *
 * **Example** (Resolving a bridged token)
 *
 * ```ts
 * import { BridgeToken, ChainId, getBridgeToken } from "@somnia-chain/markets-sdk/chains";
 *
 * const wbtc = getBridgeToken(BridgeToken.WBTC, ChainId.somniaShannon);
 * wbtc?.model;    // "collateral" — approve `wbtc.address` to `wbtc.router` first
 * wbtc?.decimals; // 8, NOT 18
 * ```
 *
 * @category bridging
 */
export declare function getBridgeToken(token: BridgeToken, chainId: number): BridgeTokenDetails | null;
/**
 *  Every bridgeable token, optionally narrowed to one network.
 *
 * **Details**
 *
 * - `chainId`: Only tokens with a route on this network. Omit for all of them.
 * - Returns: Matching token details; `[]` when the network isn't bridged.
 *
 * @category bridging
 */
export declare function listBridgeTokens(chainId?: number): BridgeTokenDetails[];
/**
 *  The Hyperlane core deployment on one network — mailbox, ISM, hooks — plus the
 *  tokens it carries.
 *
 * **Details**
 *
 * - `chainId`: Chain id to look up.
 * - Returns: The network's bridge deployment, or `null` if it isn't bridged.
 *
 * **Example** (Resolving a bridge network)
 *
 * ```ts
 * import { ChainId, getBridgeNetwork } from "@somnia-chain/markets-sdk/chains";
 *
 * getBridgeNetwork(ChainId.hidekiTestnet)?.mailbox;
 * getBridgeNetwork(ChainId.somniaMainnet);              // null — not bridged yet
 * ```
 *
 * @category bridging
 */
export declare function getBridgeNetwork(chainId: number): BridgeNetworkDetails | null;
/**
 * Every network with a bridge deployment.
 *
 * @category bridging
 */
export declare function listBridgeNetworks(): BridgeNetworkDetails[];
/**
 *  Is this chain id part of the bridge? A `true` here is what makes
 *  {@link getBridgeNetwork} non-null.
 *
 * **Details**
 *
 * - `chainId`: Chain id to test.
 *
 * @category bridging
 */
export declare function isBridgeNetwork(chainId: number): boolean;
/**
 *  The route carrying one token between two networks, in either order.
 *
 *  Bridging is **not transitive** — a chain must be a member of the token's route.
 *
 * **Details**
 *
 * - `token`: Token symbol.
 * - `chainIdA`: One end of the lane.
 * - `chainIdB`: The other end.
 * - Returns: The route, or `null` if that token doesn't connect those two networks.
 *
 * @category bridging
 */
export declare function getBridgeRoute(token: BridgeToken, chainIdA: number, chainIdB: number): BridgeRoute | null;
/**
 * The warp router that moves `token` on `chainId`, or `null`.
 *
 * @category bridging
 */
export declare function getBridgeRouter(token: BridgeToken, chainId: number): Address | null;
