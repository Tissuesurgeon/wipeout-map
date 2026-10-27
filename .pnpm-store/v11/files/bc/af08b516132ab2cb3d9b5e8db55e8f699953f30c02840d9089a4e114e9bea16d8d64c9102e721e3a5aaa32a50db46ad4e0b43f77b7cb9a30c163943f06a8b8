import type { Address, PublicClient } from "viem";
/**
 *  ERC-20 balance of `account` for `token` (raw). Use for real ERC-20
 *  collateral; outcome positions live on the ERC-6909 singleton — read those
 *  with {@link BinaryPortfolio.getOutcomeBalance}.
 */
export declare function getErc20Balance(token: Address, account: Address, client: PublicClient): Promise<bigint>;
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
export declare function getErc20Metadata(token: Address, client: PublicClient): Promise<Erc20Metadata>;
/**
 *  ERC-20 allowance `owner` has granted `spender` for `token` (raw). Use to gate
 *  a write that pulls ERC-20 collateral (e.g. before `mintSet`) — outcome tokens
 *  use per-operator approval instead (`isOperator` on the ERC-6909 singleton).
 */
export declare function getErc20Allowance(token: Address, owner: Address, spender: Address, client: PublicClient): Promise<bigint>;
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
export declare function getBalances(tokens: readonly BalanceQuery[], account: Address, client: PublicClient): Promise<bigint[]>;
export declare function cachedErc20Decimals(token: Address, client: PublicClient, fallback: number): Promise<number>;
