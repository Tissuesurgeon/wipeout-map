// The Somnia token bridge, as data + one builder + one sender.
//
// A Hyperlane Warp Route lane connects the Somnia networks: Somnia Testnet ↔ Hideki
// Testnet today, carrying native STT plus USDso / WBTC / WETH / HBTT. This module
// is the client-side half — the deployment as typed data, a pure function that
// turns "send N of X from A to B" into the transactions that do it, and an
// opt-in sender (send.ts, the ONLY RPC-touching file) that signs locally and
// confirms in one round-trip via eth_sendRawTransactionSync.
//
// SOURCE OF TRUTH: github.com/somnia-chain/hyperlane-bridge-infra (deployment
// record + registry). Every address here was additionally verified against the live
// chains; see registry.ts.
//
// ⚠️ This is a DEV/TEST bridge: one validator, a threshold-1 ISM, EOA owners. One
// key is the entire bridge — don't put real funds behind it (`SOMNIA_BRIDGE.status`).
//
// Re-exported from "@somnia-chain/markets-sdk/chains", so callers reach it with the
// chain definitions they are already importing.
export { warpRouterAbi } from "./abi.js";
export { BridgeToken, } from "./types.js";
export { SOMNIA_BRIDGE, getBridgeNetwork, getBridgeRoute, getBridgeRouter, getBridgeToken, isBridgeNetwork, listBridgeNetworks, listBridgeTokens, } from "./registry.js";
export { createBridgeTransfer, toEip1193Transaction } from "./transfer.js";
export { sendBridgeStep } from "./send.js";
