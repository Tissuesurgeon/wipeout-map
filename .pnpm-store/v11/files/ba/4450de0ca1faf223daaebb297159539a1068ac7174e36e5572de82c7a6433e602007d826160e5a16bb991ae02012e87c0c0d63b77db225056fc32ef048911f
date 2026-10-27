import { defineChain } from "viem";

/**
 *  Somnia testnet — **Shannon** (chain id `50312`), the public testnet and the
 *  default target for Somnia Markets development. Native token is **STT**;
 *  blocks land roughly every 100 ms.
 *
 *  `https://dream-rpc.somnia.network` is a public alias for the same network and
 *  is listed as a secondary HTTP/WebSocket endpoint.
 *
 * @category networks
 */
export const somniaShannon = /*#__PURE__*/ defineChain({
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  blockTime: 100,
  rpcUrls: {
    default: {
      http: ["https://api.infra.testnet.somnia.network", "https://dream-rpc.somnia.network"],
      webSocket: ["wss://api.infra.testnet.somnia.network/ws", "wss://dream-rpc.somnia.network/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Testnet Explorer",
      url: "https://shannon-explorer.somnia.network",
      apiUrl: "https://shannon-explorer.somnia.network/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0x841b8199E6d3Db3C6f264f6C2bd8848b3cA64223",
      blockCreated: 71314235,
    },
  },
  testnet: true,
});
