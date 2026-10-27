// Native entry — "@somnia-chain/markets-sdk/native". The Somnia-specific JSON-RPC
// methods, wrapped so they are ordinary TypeScript calls.
//
// Somnia's node exposes a `somnia_*` namespace alongside the usual `eth_*`: the
// native ledger block (proposer, data-chain commitments, execution snapshot), chain
// statistics, reactivity subscription reads, and **session transactions** — where
// the node holds the key, tracks the nonce, signs, retries and hands back the
// receipt, so a client needs no signer at all.
//
// SCOPE: exactly the twelve methods in the public JSON-RPC reference,
// https://docs.somnia.network/developer/json-rpc-api — no more. A node build serves
// others; they are undocumented, may change without notice, and at least one is
// unsafe to call at all. `request()` reaches them for a caller who has decided to
// step off the documented surface. See client.ts for the full exclusion list.
//
// LOCKSTEP: github.com/somnia-chain/somnia2 —
// `somnia/api/handlers/somnia_api_handlers.h` is the method list;
// `docs/session_transactions.md` is the session design. Both were read, and then
// every endpoint was called against live Shannon and Hideki nodes: the request
// encodings and response field names here come from the wire, not from the C++
// types (they differ in ways that matter — see client.ts).
//
// Nothing here needs the markets client: `createNative` takes anything with an
// EIP-1193 `.request`, so a bare viem client or an injected wallet works.

export {
  createNative,
  isMethodNotFound,
  isUnauthorized,
  type NativeRpcRequester,
  type SomniaNative,
} from "./client.js";

export { sessionAddress, sessionPrivateKey } from "./session.js";

export { SomniaMempoolStatus, getSomniaRpcError, type SomniaRpcError } from "./errors.js";

export type { SomniaTransactionReceipt } from "./receipt.js";

export type {
  RpcSomniaBlock,
  RpcSomniaChainStatistics,
  RpcSomniaNodePublicKeys,
  RpcSomniaReactivitySubscription,
  SessionTransactionRequest,
  SomniaBlock,
  SomniaBlockParam,
  SomniaBlockResources,
  SomniaBlockTag,
  SomniaChainStatistics,
  SomniaConsensusBlock,
  SomniaExecutionBlock,
  SomniaNodePublicKeys,
  SomniaReactivitySubscription,
} from "./types.js";
