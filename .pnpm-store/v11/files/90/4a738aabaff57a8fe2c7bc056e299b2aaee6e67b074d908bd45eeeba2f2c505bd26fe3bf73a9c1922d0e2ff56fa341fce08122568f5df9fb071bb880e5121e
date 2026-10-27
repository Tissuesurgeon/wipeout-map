import { defineChain } from "viem";

/**
 *  Somnia mainnet (chain id `5031`) — the production network. Native token is
 *  **SOMI**; blocks land roughly every 100 ms.
 *
 *  Same content as viem's `somnia`, under the name the runbooks use.
 *
 * @category networks
 */
export const somniaMainnet = /*#__PURE__*/ defineChain({
  id: 5031,
  name: "Somnia",
  nativeCurrency: { name: "Somnia", symbol: "SOMI", decimals: 18 },
  blockTime: 100,
  rpcUrls: {
    default: {
      http: ["https://api.infra.mainnet.somnia.network"],
      webSocket: ["wss://api.infra.mainnet.somnia.network/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://explorer.somnia.network",
      apiUrl: "https://explorer.somnia.network/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0x5e44F178E8cF9B2F5409B6f18ce936aB817C5a11",
      blockCreated: 38516341,
    },
  },
  testnet: false,
});
