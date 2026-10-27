import { defineChain } from "viem";

/**
 *  Somnia testnet — **Elwood** (chain id `50313`, network id `50313`), the
 *  regenesis of the public testnet. Its own cluster, DNS zone and genesis;
 *  100 ms blocks and **STT** as the native token, same as Shannon.
 *
 *  No public block explorer and no Multicall3 deployment are known for Elwood, so
 *  neither field is set — a `multicall: true` read against this chain falls back
 *  to individual `eth_call`s instead of pointing at an address that has no code.
 *
 * @category networks
 */
export const somniaElwood = /*#__PURE__*/ defineChain({
  id: 50313,
  name: "Somnia Elwood Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  blockTime: 100,
  rpcUrls: {
    default: {
      http: ["https://api.elwood.infra.testnet.somnia.network"],
      webSocket: ["wss://api.elwood.infra.testnet.somnia.network/ws"],
    },
  },
  testnet: true,
});
