// The bridge registry — the deployed Hyperlane lane, as data.
//
// THIS IS THE **HIDEKI 2** LANE (`somniatestnet-hideki2testnet`), and picking the
// right one is not cosmetic. There are TWO live, independent lanes out of Somnia
// Testnet, and the chain this SDK calls `hidekiTestnet` (50383) is Hideki 2 — the
// 2026-09-17 regenesis. Hideki 1 is still up on its own lane; we do not ship it.
//
// SOURCE OF TRUTH: github.com/somnia-chain/hyperlane-bridge-infra —
// `docs/deployments/somnia-testnet-hideki2-testnet.md` (the deployment record),
// `registry-hideki2/chains/<chain>/{metadata,addresses}.yaml` (core contracts) and
// `registry-hideki2/deployments/warp_routes/<SYMBOL>/*-config.yaml` (the routes).
// Note the `-hideki2` suffix on every path: the plain `registry/` tree is the
// HIDEKI 1 lane and reading addresses out of it is exactly the mistake this header
// exists to prevent. Adding a token or a lane there is a DATA change here — the
// shapes below already carry it.
//
// WHY TWO LANES CANNOT SHARE A CORE. Hideki 1 and Hideki 2 both answer `eth_chainId`
// 50383 and both use Hyperlane domain 50383 — they are separated only by network id
// (50000258 vs 50000259), so at the protocol level they are indistinguishable and a
// validator signature for one is arithmetically valid metadata for the other's ISM.
// What keeps them apart is `Router.onlyMailbox` plus router enrolment, which only
// works because this lane has its OWN core contracts on Shannon. That is also why
// the Shannon-side addresses below are not the ones you will find in `registry/`.
//
// VERIFIED ON-CHAIN 2026-09-21, both networks, every value below re-read rather than
// copied from the record:
//   - Shannon mailbox `0xF805734a…` and Hideki 2 mailbox `0xD7C2E95c…` each report
//     `localDomain()` 50312 / 50383, and each `defaultIsm()` is the ISM recorded here.
//   - Both ISMs return `validatorsAndThreshold()` = ([0x528374d9…], 1) — the shared
//     single validator, which is the whole trust model.
//   - All ten routers: `mailbox()` is their own side's mailbox, and
//     `routers(otherDomain)` returns the counterpart in BOTH directions for all five
//     routes. Every Shannon router reports ISM `0x99e1D7E9…`.
//   - `quoteGasPayment(otherDomain)` is 0 on all ten — the relayer pays delivery gas.
//   - All six Shannon core contracts hold code (2,840 / 214 / 6,434 / 5,913 / 20,077
//     / 2,115 bytes).
// The lane was round-tripped end-to-end on all five routes by the infra team on
// 2026-09-17 with net supply change 0; see the deployment record for message ids.
//
// ADDRESS REPRODUCTION, AND THE TRAP IN IT. Every HIDEKI-side address on this lane
// equals Hideki 1's — deliberately: the same deployer replayed its nonce sequence
// onto a chain whose nonces had restarted at genesis, and the ISM came free because
// it is CREATE2-derived from the factory and the (shared) validator set. So a Hideki
// address matching the Hideki 1 record proves nothing about which lane you are on.
// The SHANNON side is where the lanes actually diverge, and all eleven Shannon
// addresses here (six core + five routers) are this lane's alone.
//
// NOT IN HERE, DELIBERATELY: the deployer / validator / relayer / treasury EOAs
// from the deployment record. They are operator identities, not client data — the
// one exception is the validator set, which is what the ISM's trust model IS.
import { ChainId } from "../chainId.js";
import { BridgeToken, } from "./types.js";
/** Registry name → chain id, the way hyperlane-bridge-infra names these networks.
 *  `hideki2testnet` is this lane's name for 50383 in `registry-hideki2/`; the plain
 *  `hidekitestnet` is the Hideki 1 lane's name for the OTHER chain on that id. */
const HYPERLANE_NAME = {
    [ChainId.somniaShannon]: "somniatestnet",
    [ChainId.hidekiTestnet]: "hideki2testnet",
};
/**
 *  Every (token, network) pair with a live route, keyed `${token}:${chainId}`.
 *  Reached through {@link getBridgeToken} / {@link listBridgeTokens}.
 */
const BRIDGE_TOKENS = [
    // ---- STT: native on BOTH sides. No wrapped token anywhere; delivery pays out of
    // the destination router's own balance, so each side needs seeded liquidity.
    {
        token: BridgeToken.STT,
        chainId: ChainId.somniaShannon,
        network: HYPERLANE_NAME[ChainId.somniaShannon],
        model: "native",
        router: "0x67CD0778A719099DAF2D346aD0Db0d9E6FF6674C",
        address: null,
        decimals: 18,
        name: "Somnia Test Token",
        destinations: [ChainId.hidekiTestnet],
        requiresDestinationLiquidity: true,
    },
    {
        token: BridgeToken.STT,
        chainId: ChainId.hidekiTestnet,
        network: HYPERLANE_NAME[ChainId.hidekiTestnet],
        model: "native",
        router: "0xB04373932bc05347757da6b8a226d7657584aB35",
        address: null,
        decimals: 18,
        name: "Somnia Test Token",
        destinations: [ChainId.somniaShannon],
        requiresDestinationLiquidity: true,
    },
    // ---- USDso: collateral on Shannon (its home), synthetic on Hideki.
    {
        token: BridgeToken.USDso,
        chainId: ChainId.somniaShannon,
        network: HYPERLANE_NAME[ChainId.somniaShannon],
        model: "collateral",
        router: "0x94E2E7f4B2B0a8E3032c7D3ff3c86790BB5979E6",
        address: "0x9c32F3827A1a99f0cf9B213de8b53eC3d57bb171",
        decimals: 18,
        name: "USDso",
        destinations: [ChainId.hidekiTestnet],
        requiresDestinationLiquidity: false,
    },
    {
        token: BridgeToken.USDso,
        chainId: ChainId.hidekiTestnet,
        network: HYPERLANE_NAME[ChainId.hidekiTestnet],
        model: "synthetic",
        router: "0xed7993A74dAe1e6656B704A424DcD8711aAf4F72",
        // A HypERC20 synthetic IS its own ERC-20 — the router address is the token.
        address: "0xed7993A74dAe1e6656B704A424DcD8711aAf4F72",
        decimals: 18,
        name: "USDso",
        destinations: [ChainId.somniaShannon],
        requiresDestinationLiquidity: false,
    },
    // ---- WBTC: 8 decimals on BOTH sides — the synthetic inherited them correctly.
    {
        token: BridgeToken.WBTC,
        chainId: ChainId.somniaShannon,
        network: HYPERLANE_NAME[ChainId.somniaShannon],
        model: "collateral",
        router: "0x888d8C8090b8cDcEa5d05b1C206c2bFF18cd2DA9",
        address: "0x4e85DC48a70DA1298489d5B6FC2492767d98f384",
        decimals: 8,
        name: "Wrapped Bitcoin",
        destinations: [ChainId.hidekiTestnet],
        requiresDestinationLiquidity: false,
    },
    {
        token: BridgeToken.WBTC,
        chainId: ChainId.hidekiTestnet,
        network: HYPERLANE_NAME[ChainId.hidekiTestnet],
        model: "synthetic",
        router: "0xE97673c634EF069Ecc0d95425Cc8e62F99D27E0E",
        address: "0xE97673c634EF069Ecc0d95425Cc8e62F99D27E0E",
        decimals: 8,
        name: "Wrapped Bitcoin",
        destinations: [ChainId.somniaShannon],
        requiresDestinationLiquidity: false,
    },
    // ---- WETH
    {
        token: BridgeToken.WETH,
        chainId: ChainId.somniaShannon,
        network: HYPERLANE_NAME[ChainId.somniaShannon],
        model: "collateral",
        router: "0x41C21248D6CC3883cd577D0eFEF3585b1358A8B2",
        address: "0x4d8E02BBfCf205828A8352Af4376b165E123D7b0",
        decimals: 18,
        name: "Wrapped ETH",
        destinations: [ChainId.hidekiTestnet],
        requiresDestinationLiquidity: false,
    },
    {
        token: BridgeToken.WETH,
        chainId: ChainId.hidekiTestnet,
        network: HYPERLANE_NAME[ChainId.hidekiTestnet],
        model: "synthetic",
        router: "0x56115cB05652Ac6117Caa1152B630986a51d36b5",
        address: "0x56115cB05652Ac6117Caa1152B630986a51d36b5",
        decimals: 18,
        name: "Wrapped ETH",
        destinations: [ChainId.somniaShannon],
        requiresDestinationLiquidity: false,
    },
    // ---- HBTT: the throwaway token the lane was verified with.
    {
        token: BridgeToken.HBTT,
        chainId: ChainId.somniaShannon,
        network: HYPERLANE_NAME[ChainId.somniaShannon],
        model: "collateral",
        router: "0x04a276255FfB8487E94b07a2187aB56A281bb6eE",
        address: "0xE4bd7cC81ea8748a5A9f6FF803670c423C269469",
        decimals: 18,
        name: "Hyperlane Bridge Test Token",
        destinations: [ChainId.hidekiTestnet],
        requiresDestinationLiquidity: false,
    },
    {
        token: BridgeToken.HBTT,
        chainId: ChainId.hidekiTestnet,
        network: HYPERLANE_NAME[ChainId.hidekiTestnet],
        model: "synthetic",
        router: "0x0528dD3beEf917DB06A5249C9Ea84b9D702B3A84",
        address: "0x0528dD3beEf917DB06A5249C9Ea84b9D702B3A84",
        decimals: 18,
        name: "Hyperlane Bridge Test Token",
        destinations: [ChainId.somniaShannon],
        requiresDestinationLiquidity: false,
    },
];
/** The Hyperlane core deployment per bridged network. */
const BRIDGE_NETWORKS = [
    {
        chainId: ChainId.somniaShannon,
        domainId: ChainId.somniaShannon,
        network: HYPERLANE_NAME[ChainId.somniaShannon],
        displayName: "Somnia Testnet",
        // This lane's OWN core on Shannon — not the Hideki 1 lane's, which occupies the
        // equivalent slots in `registry/chains/somniatestnet`. Every Shannon warp router
        // below is bound at construction to this mailbox, and that binding is what stops
        // a message crossing between the two lanes that share domain 50383.
        mailbox: "0xF805734aAC42cf238eAef9E905e3A04F2Ab554f9",
        interchainSecurityModule: "0x99e1D7E9c204c3436F6Cf05C65C0D8854Ca4d843",
        merkleTreeHook: "0x64aa1c6a1F9aA431e8eAE1eC8579da16F46cD50C",
        validatorAnnounce: "0x81b741D6c0460Bd58182D34f85903F73c8211033",
        interchainAccountRouter: "0x2fbF56e10e7cEa23e667E84F828fFc442Bb92E19",
        proxyAdmin: "0x79f2221296017A5E6dDAe8f2D79F3eDf7c2D1FaE",
        interchainGasPaymaster: null,
        tokens: [BridgeToken.STT, BridgeToken.USDso, BridgeToken.WBTC, BridgeToken.WETH, BridgeToken.HBTT],
    },
    {
        chainId: ChainId.hidekiTestnet,
        domainId: ChainId.hidekiTestnet,
        network: HYPERLANE_NAME[ChainId.hidekiTestnet],
        displayName: "Hideki2 Testnet",
        // Byte-for-byte the Hideki 1 lane's core addresses, on a different chain — the
        // deployer replayed its nonce sequence onto the regenesis. Do not read the match
        // as evidence of which lane or which chain you are talking to.
        mailbox: "0xD7C2E95c62De3c0ad95b2C1cf08E4B85DF6b332D",
        interchainSecurityModule: "0x852616e634169da77d9390e2dcd5E95227B163a3",
        merkleTreeHook: "0xBBCc0912b06AaA84516Cd9Bcc199fe2fD5140e9e",
        validatorAnnounce: "0xc1a30607Be1793A42a0E6dFb8e709e82b351422D",
        interchainAccountRouter: "0x4fB05c3AbB116EfC10579360458D5902fc43DF06",
        proxyAdmin: "0x46bA2807Dbada25372176381557b55eF1F22e0A9",
        interchainGasPaymaster: null,
        tokens: [BridgeToken.STT, BridgeToken.USDso, BridgeToken.WBTC, BridgeToken.WETH, BridgeToken.HBTT],
    },
];
const LANE = `${HYPERLANE_NAME[ChainId.somniaShannon]}-${HYPERLANE_NAME[ChainId.hidekiTestnet]}`;
const ROUTES = [BridgeToken.STT, BridgeToken.USDso, BridgeToken.WBTC, BridgeToken.WETH, BridgeToken.HBTT].map((token) => ({
    id: `${token}/${LANE}`,
    token,
    chainIds: [ChainId.somniaShannon, ChainId.hidekiTestnet],
}));
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
export const SOMNIA_BRIDGE = {
    id: LANE,
    displayName: "Somnia Testnet ↔ Hideki2 Testnet",
    chainIds: [ChainId.somniaShannon, ChainId.hidekiTestnet],
    tokens: [BridgeToken.STT, BridgeToken.USDso, BridgeToken.WBTC, BridgeToken.WETH, BridgeToken.HBTT],
    routes: [...ROUTES],
    status: "dev-test",
    security: { validators: ["0x528374d9AD571766a8a380002b0aceFE535DC2b1"], threshold: 1 },
    relayerPaysDestinationGas: true,
    docs: "https://github.com/somnia-chain/hyperlane-bridge-infra/blob/main/docs/deployments/somnia-testnet-hideki2-testnet.md",
};
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
export function getBridgeToken(token, chainId) {
    return BRIDGE_TOKENS.find((t) => t.token === token && t.chainId === chainId) ?? null;
}
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
export function listBridgeTokens(chainId) {
    return BRIDGE_TOKENS.filter((t) => chainId === undefined || t.chainId === chainId);
}
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
export function getBridgeNetwork(chainId) {
    return BRIDGE_NETWORKS.find((n) => n.chainId === chainId) ?? null;
}
/**
 * Every network with a bridge deployment.
 *
 * @category bridging
 */
export function listBridgeNetworks() {
    return [...BRIDGE_NETWORKS];
}
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
export function isBridgeNetwork(chainId) {
    return BRIDGE_NETWORKS.some((n) => n.chainId === chainId);
}
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
export function getBridgeRoute(token, chainIdA, chainIdB) {
    return (SOMNIA_BRIDGE.routes.find((r) => r.token === token && r.chainIds.includes(chainIdA) && r.chainIds.includes(chainIdB) && chainIdA !== chainIdB) ?? null);
}
/**
 * The warp router that moves `token` on `chainId`, or `null`.
 *
 * @category bridging
 */
export function getBridgeRouter(token, chainId) {
    return getBridgeToken(token, chainId)?.router ?? null;
}
