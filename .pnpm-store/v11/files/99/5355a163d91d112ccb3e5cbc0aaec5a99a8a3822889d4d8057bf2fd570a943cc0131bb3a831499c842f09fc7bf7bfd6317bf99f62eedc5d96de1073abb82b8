import { defineChain } from "viem";

/**
 *  The local Somnia dev chain (chain id `31337`) — an Anvil node, as brought up by
 *  `demo-clob.sh up` / `DEPLOY_ENV=local`. Anvil is a first-class environment for
 *  this protocol: the deploy scripts, the indexer, the deployments hub and the
 *  explorer all run against it, so it gets a definition here instead of borrowing
 *  viem's `foundry`.
 *
 *  Deliberately presented as **Somnia** with **STT** rather than "Foundry"/"Ether":
 *  the agent-facing docs read the chain name and native symbol straight out of this
 *  object, and a local stack should still read as Somnia there.
 *
 *  Two things a local chain does *not* have: the Somnia reactivity precompile at
 *  `0x…0100` (`isLocalPrecompileUnavailable` returns true here — anything that
 *  pings it, such as `enableReactivity` or `triggerRoll`, is testnet/mainnet only)
 *  and a Multicall3 deployment, unless you deployed one yourself.
 *
 * @category networks
 */
export const somniaLocal = /*#__PURE__*/ defineChain({
  id: 31_337,
  name: "Somnia Local",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
      webSocket: ["ws://127.0.0.1:8545"],
    },
  },
  testnet: true,
});
