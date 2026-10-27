import { defineChain } from "viem";
/**
 *  **Hideki** testnet (chain id `50383`) — the low-latency Tokyo network.
 *  Validators sit in one region to keep validator-to-validator latency low, so
 *  blocks land every **10 ms** (~100 blocks/s) instead of Shannon's 100 ms.
 *  Native token is **STT**.
 *
 *  **REGENESISED 2026-09-17 ("hideki v2"), ON THE SAME CHAIN ID.** The endpoints
 *  below are v2's (`api.hideki2…`); v1 lives on at `api.hideki…` but is
 *  superseded, and its `/ws` already answers 502. The shared chain id is worth
 *  stating plainly: nothing in a signature, a wallet or this definition
 *  distinguishes the two chains, so a transaction signed for one is valid on the
 *  other, and the same address holds DIFFERENT contracts on each — deployer
 *  nonces restarted at genesis. Tell the chains apart by height, not by chain
 *  id (v2 was ~293k blocks old when this was written; v1 was past 586M).
 *
 *  One live-verified oddity, so nobody "fixes" it: Hideki's **network id is not
 *  its chain id**. `eth_chainId` answers `0xc4cf` (50383) — the value here, the
 *  one wallets and signatures use — while `net_version` answers `50000259`
 *  (v1 answered `50000258`; the regenesis moved it by one). Shannon's and
 *  mainnet's two ids are equal; Hideki's are not.
 *
 *  The 10 ms cadence is what makes this the interesting target for latency work:
 *  a `blockTime` of 10 is what viem uses to size its own polling/waiting
 *  heuristics, and the SDK's live tail sees ~10x the block rate of Shannon.
 *
 *  Multicall3 is at the **canonical** `0xcA11bde0…` on v2, holding code from
 *  block 1 — predeployed, not sent as a transaction. That reverses v1's
 *  situation and the reasoning that went with it: there the canonical route was
 *  unreachable (Somnia charges ~4,928 gas per deployed byte, so the presigned
 *  "Nick's method" transaction's fixed 500k limit cannot deploy Multicall3's
 *  3,808-byte runtime, and the presigned deployers' nonce-0 transactions were
 *  already burned), so the bridge infra deployed the same runtime bytes at
 *  `0x540B091b…` instead. v2's canonical deployment is byte-identical to that
 *  one — verified by code hash — and `0x540B091b…` holds NO code on v2.
 *
 *  No public block explorer is known for Hideki, so that field stays unset.
 *
 * @category networks
 */
export const hidekiTestnet = /*#__PURE__*/ defineChain({
    id: 50383,
    name: "Hideki Testnet",
    nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
    blockTime: 10,
    rpcUrls: {
        default: {
            http: ["https://api.hideki2.infra.testnet.somnia.network"],
            webSocket: ["wss://api.hideki2.infra.testnet.somnia.network/ws"],
        },
    },
    contracts: {
        multicall3: {
            address: "0xcA11bde05977b3631167028862bE2a173976CA11",
            blockCreated: 1,
        },
    },
    testnet: true,
});
