import { type Address } from "viem";
import * as PinnedBatch from "./pinnedBatch.js";
import * as BalancesTypes from "./balancesTypes.js";
import type { AccountBalance } from "./balancesTypes.js";
/** A token to read: an ERC-20, or the native token. */
export type BalanceToken = Address | typeof BalancesTypes.NATIVE_BALANCE_TOKEN;
export interface ReadAccountBalancesInput {
    readonly accounts: readonly Address[];
    readonly tokens: readonly BalanceToken[];
}
export interface AccountBalancesRead {
    readonly blockNumber: bigint;
    readonly balances: readonly AccountBalance[];
}
/**
 *  The ERC-20 `token` names, or `undefined` when it reads the native balance: the name
 *  `"native"`, or the protocol's native-token sentinel, which has no code, so
 *  `balanceOf` on it could only fail.
 */
export declare function erc20Of(token: BalanceToken): Address | undefined;
/** Native labels share one read identity; ERC-20 addresses have already been checked. */
export declare function identityOf(token: BalanceToken): BalanceToken;
/** Projects unique canonical balances to a caller's account/token order and labels. */
export declare function projectBalances(input: ReadAccountBalancesInput, balances: readonly AccountBalance[]): readonly AccountBalance[];
/**
 *  Reads every account's balance of every token, at one block. Rejects with `signal`'s
 *  reason once it aborts, before the next call.
 */
export declare function readAccountBalances(input: ReadAccountBalancesInput, chain: PinnedBatch.PinnedChain, signal?: AbortSignal): Promise<AccountBalancesRead>;
