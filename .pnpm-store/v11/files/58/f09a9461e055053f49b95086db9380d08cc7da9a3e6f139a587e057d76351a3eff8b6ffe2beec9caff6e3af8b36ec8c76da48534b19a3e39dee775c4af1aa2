// Several accounts' wallet balances, read from the chain at one block.
//
// Balances are chain state; the indexer does not mirror them. One pinned batch reads
// every account's balance of every token the caller names: `balanceOf` for an ERC-20,
// and the native balance through Multicall3's `getEthBalance`, for `"native"` and for
// the protocol's native-token sentinel alike. Where the chain has a
// Multicall3 that is one call; elsewhere the same reads go out one by one at that block.
//
// A balance that cannot be read is unknown with its error, never zero. Individual
// balance failures do not fail the whole read; head and batch failures still reject.

import { decodeFunctionResult, encodeFunctionData, erc20Abi, type Address, type Hex } from "viem";
import * as Funding from "../vault/funding.js";
import * as Raise from "../raise.js";
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

function balanceOfCall(token: Address, account: Address): PinnedBatch.Call<bigint> {
  const request = { abi: erc20Abi, functionName: "balanceOf", args: [account] } as const;
  return {
    target: token,
    functionName: request.functionName,
    callData: encodeFunctionData(request),
    decode: (data: Hex) => decodeFunctionResult({ abi: erc20Abi, functionName: request.functionName, data }),
  };
}

/**
 *  The ERC-20 `token` names, or `undefined` when it reads the native balance: the name
 *  `"native"`, or the protocol's native-token sentinel, which has no code, so
 *  `balanceOf` on it could only fail.
 */
export function erc20Of(token: BalanceToken): Address | undefined {
  if (token === BalancesTypes.NATIVE_BALANCE_TOKEN) return undefined;
  return token.toLowerCase() === Funding.NATIVE_TOKEN_SENTINEL.toLowerCase() ? undefined : token;
}

/** Native labels share one read identity; ERC-20 addresses have already been checked. */
export function identityOf(token: BalanceToken): BalanceToken {
  return erc20Of(token) ?? BalancesTypes.NATIVE_BALANCE_TOKEN;
}

/** Projects unique canonical balances to a caller's account/token order and labels. */
export function projectBalances(
  input: ReadAccountBalancesInput,
  balances: readonly AccountBalance[],
): readonly AccountBalance[] {
  const byIdentity = new Map(balances.map((entry) => [`${entry.account}|${entry.token}`, entry.balance]));
  return input.accounts.flatMap((account) =>
    input.tokens.map((token) => {
      const key = `${account}|${identityOf(token)}`.toLowerCase();
      const balance = byIdentity.get(key) ?? Raise.unreachable("every requested balance has a canonical read");
      return { account: account.toLowerCase(), token: token.toLowerCase(), balance };
    }),
  );
}

/**
 *  Reads every account's balance of every token, at one block. Rejects with `signal`'s
 *  reason once it aborts, before the next call.
 */
export async function readAccountBalances(
  input: ReadAccountBalancesInput,
  chain: PinnedBatch.PinnedChain,
  signal?: AbortSignal,
): Promise<AccountBalancesRead> {
  PinnedBatch.stopIfAborted(signal);
  const blockNumber = await chain.blockNumber();
  const batch = new PinnedBatch.Batch();
  const reads = input.accounts.flatMap((account) =>
    input.tokens.map((token) => {
      const erc20 = erc20Of(token);
      const slot = erc20 === undefined ? batch.addNative(account) : batch.add(balanceOfCall(erc20, account));
      return { account, token, slot };
    }),
  );
  await batch.run(chain, blockNumber, signal);
  return {
    blockNumber,
    balances: reads.map(({ account, token, slot }) => {
      const result = slot.result;
      return {
        account: account.toLowerCase(),
        token: token.toLowerCase(),
        balance: result.ok
          ? { status: "known", value: result.value }
          : { status: "unknown", reason: "readFailed", error: result.error },
      };
    }),
  };
}
