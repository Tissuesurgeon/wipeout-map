// Balances — plain token balances, shared across market kinds.
//
// ERC-20 and native balances, metadata, and allowances: what a wallet holds
// OUTSIDE any market. Kind-specific holdings live with their kind — outcome-token
// (ERC-6909) balances and vault credit are binary/portfolio.ts, margin collateral
// is perp/margin.ts — because those are positions in a market's own accounting,
// not wallet balances.
//
// Chain-only by nature: a balance is authoritative at head, and the indexer does
// not mirror ERC-20 state.
//
// One deliberate cross-kind edge: `getBalances` is a batch convenience that
// dispatches per query — plain token or ERC-6909 outcome id — so it imports
// binary's outcome read. It only DISPATCHES (no binary logic of its own), and it
// is the caller-facing batch API, so it belongs here rather than in binary/.

import type { Address, PublicClient } from "viem";
import * as ReadsAbi from "./readsAbi.js";
import * as Revert from "./revert.js";
import * as BinaryPortfolio from "./binary/portfolio.js";

/**
 *  ERC-20 balance of `account` for `token` (raw). Use for real ERC-20
 *  collateral; outcome positions live on the ERC-6909 singleton — read those
 *  with {@link BinaryPortfolio.getOutcomeBalance}.
 */
export async function getErc20Balance(token: Address, account: Address, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: ReadsAbi.erc20ReadAbi,
    functionName: "balanceOf",
    args: [account],
  });
}

/**
 *  ERC-20 token metadata (`symbol`, `name`, `decimals`) read in one fan-out.
 *  Handy to label a collateral/base token the indexer hasn't denormalized.
 *
 * @category balances
 */
export interface Erc20Metadata {
  /** Token ticker, e.g. "USDso". */
  symbol: string;
  /** Full token name, e.g. "Somnia USD". */
  name: string;
  /** Display decimals scaling the token's raw units (raw / 10^decimals = human). */
  decimals: number;
}

/** Read an ERC-20's `symbol`/`name`/`decimals` in a single pipelined fan-out. */
export async function getErc20Metadata(token: Address, client: PublicClient): Promise<Erc20Metadata> {
  const p = { address: token, abi: ReadsAbi.erc20ReadAbi } as const;
  const [symbol, name, decimals] = await Promise.all([
    client.readContract({ ...p, functionName: "symbol" }),
    client.readContract({ ...p, functionName: "name" }),
    client.readContract({ ...p, functionName: "decimals" }),
  ]);
  return { symbol, name, decimals: Number(decimals) };
}

/**
 *  ERC-20 allowance `owner` has granted `spender` for `token` (raw). Use to gate
 *  a write that pulls ERC-20 collateral (e.g. before `mintSet`) — outcome tokens
 *  use per-operator approval instead (`isOperator` on the ERC-6909 singleton).
 */
export async function getErc20Allowance(
  token: Address,
  owner: Address,
  spender: Address,
  client: PublicClient,
): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: ReadsAbi.erc20ReadAbi,
    functionName: "allowance",
    args: [owner, spender],
  });
}

/**
 *  A token to read a balance for in a `getBalances` batch. Omit `id` for a
 *  plain ERC-20 (`balanceOf(account)`); provide `id` to read an ERC-6909 outcome
 *  position (`balanceOf(account, id)`) on the outcome-token singleton `token`.
 *
 * @category balances
 */
export interface BalanceQuery {
  /** ERC-20 token, or the ERC-6909 outcome-token singleton when `id` is set. */
  token: Address;
  /** ERC-6909 position id (`yesId`/`noId`). Absent → read `token` as a plain ERC-20. */
  id?: bigint;
}

/**
 *  Batch-read many balances for one `account` in a single fan-out — the explorer
 *  reads a portfolio's ERC-20 collateral and ERC-6909 outcome positions in one
 *  call. Each query is resolved via {@link getErc20Balance} (no `id`) or
 *  {@link BinaryPortfolio.getOutcomeBalance} (with `id`); results are returned positionally,
 *  aligned to `tokens`. Reads dispatch concurrently over the shared client.
 */
export async function getBalances(
  tokens: readonly BalanceQuery[],
  account: Address,
  client: PublicClient,
): Promise<bigint[]> {
  return Promise.all(
    tokens.map((t) =>
      t.id === undefined
        ? getErc20Balance(t.token, account, client)
        : BinaryPortfolio.getOutcomeBalance({ outcomeToken: t.token, account, id: t.id }, client),
    ),
  );
}

export async function cachedErc20Decimals(token: Address, client: PublicClient, fallback: number): Promise<number> {
  let perClient = _decimalsCache.get(client);
  if (!perClient) {
    perClient = new Map();
    _decimalsCache.set(client, perClient);
  }
  const key = token.toLowerCase();
  const hit = perClient.get(key);
  if (hit !== undefined) return hit;
  try {
    const d = Number(
      await client.readContract({
        address: token,
        abi: ReadsAbi.erc20ReadAbi,
        functionName: "decimals",
      }),
    );
    perClient.set(key, d);
    return d;
  } catch (e) {
    // Only a token WITHOUT the view falls back (non-standard collateral; not
    // cached). A timeout or dropped connection is not "this token has no
    // decimals" — returning the fallback there would scale every amount that
    // depends on it by a guess.
    if (Revert.isMissingContractView(e)) return fallback;
    throw e;
  }
}

// ERC-20 decimals are immutable, so reading them once per token is enough. This
// memo is client-scoped (a WeakMap keyed by the viem client, GC'd with it — no
// module-global mutable state), which lets hot callers like getMarketOnchain
// skip a full RPC round-trip on every call after the first for a given token.
// A binary venue's markets share ONE collateral token, so this collapses
// getMarketOnchain from two request waves (11 reads, then a dependent
// decimals() read) to one on every call past the first.
const _decimalsCache = new WeakMap<PublicClient, Map<string, number>>();
