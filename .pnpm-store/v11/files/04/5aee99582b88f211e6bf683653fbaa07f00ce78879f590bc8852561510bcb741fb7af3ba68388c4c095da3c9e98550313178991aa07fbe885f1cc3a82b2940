// Public types of the balances view: what `client.accountBalances` returns.
//
// A balances view is the wallet balances of several accounts on one chain: the ERC-20
// tokens and the native token the caller names, all read from the chain at one block.
// Protocol integers are `bigint` raw units (SDK-TYPE-007). Addresses stay lower-case
// strings, as the account view's other rows keep them.

import type { ContractRevertError, NotConfiguredError, RpcError } from "../errors.js";

/**
 *  The token name that reads an account's native balance instead of an ERC-20's.
 *
 * @category account views
 */
export const NATIVE_BALANCE_TOKEN = "native";

/**
 *  A token a balances view reads: an ERC-20 address, or {@link NATIVE_BALANCE_TOKEN}.
 *
 * @category account views
 */
export type AccountBalanceToken = string;

/**
 *  Why a balance could not be read: the call reverted, or the read did not complete.
 *
 * @category account views
 */
export type AccountBalancesReadError = ContractRevertError | RpcError;

/**
 *  A balance the view read, or the reason it could not. An unknown balance is never zero.
 *
 * @category account views
 */
export type AccountBalanceFigure =
  | { readonly status: "known"; readonly value: bigint }
  | { readonly status: "unknown"; readonly reason: "readFailed"; readonly error: AccountBalancesReadError };

/**
 *  One account's balance of one token.
 *
 * @category account views
 */
export interface AccountBalance {
  /** The account, lower-case. */
  readonly account: string;
  /** The token, lower-case, or {@link NATIVE_BALANCE_TOKEN}. */
  readonly token: string;
  /** The raw balance, in the token's base units. */
  readonly balance: AccountBalanceFigure;
}

/**
 *  Several accounts' balances at one block.
 *
 * @category account views
 */
export interface AccountBalancesData {
  /**
   * One entry per account and token. Accounts and their tokens keep the order given.
   * Duplicate accounts and tokens repeat entries. Native labels stay as requested.
   */
  readonly balances: readonly AccountBalance[];
  /** The block every balance was read at. */
  readonly blockNumber: bigint;
  /** When the view was read, as a Unix time in milliseconds on this machine. */
  readonly observedAtMs: number;
}

/**
 *  Several accounts' balances at one block. The result of
 *  {@link AccountBalancesClient.getSnapshot}, and the `ready` state of a live view.
 *
 * @category account views
 */
export interface AccountBalancesSnapshot {
  readonly status: "ready";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The accounts, lower-case, in the order given. */
  readonly accounts: readonly string[];
  /** The tokens, lower-case or {@link NATIVE_BALANCE_TOKEN}, in the order given. */
  readonly tokens: readonly string[];
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly data: AccountBalancesData;
}

/**
 *  Why a live balances view could not read: a read reverted or did not complete, or the
 *  client has no chain transport.
 *
 * @category account views
 */
export type AccountBalancesViewError = ContractRevertError | RpcError | NotConfiguredError;

/**
 *  A live balances view has no data yet: the SDK is reading the balances for the first time.
 *
 * @category account views
 */
export interface AccountBalancesLoading {
  readonly status: "loading";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The accounts, lower-case, in the order given. */
  readonly accounts: readonly string[];
  /** The tokens, lower-case or {@link NATIVE_BALANCE_TOKEN}, in the order given. */
  readonly tokens: readonly string[];
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  Why a live balances view is `stale`.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `refreshFailed` | The last read failed. The SDK tries again after a backoff; `error` says why. |
 *  | `reconnecting` | The chain subscription that reports token transfers was lost. The SDK subscribes again and reads the balances. |
 *
 * @category account views
 */
export type AccountBalancesStaleReason = "refreshFailed" | "reconnecting";

/**
 *  A live balances view keeps its last data while it recovers. The data was right at
 *  `data.blockNumber`; newer changes may be missing.
 *
 * @category account views
 */
export interface AccountBalancesStale {
  readonly status: "stale";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The accounts, lower-case, in the order given. */
  readonly accounts: readonly string[];
  /** The tokens, lower-case or {@link NATIVE_BALANCE_TOKEN}, in the order given. */
  readonly tokens: readonly string[];
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  /** The last data. */
  readonly data: AccountBalancesData;
  readonly reason: AccountBalancesStaleReason;
  /** The error behind `refreshFailed`, or `null`. */
  readonly error: AccountBalancesViewError | null;
}

/**
 *  A live balances view has no data, because its read failed. It is never a set of zero
 *  balances.
 *
 *  The SDK tries again after a backoff unless `retrying` is `false`, which means the
 *  client has no chain transport.
 *
 * @category account views
 */
export interface AccountBalancesFailed {
  readonly status: "failed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The accounts, lower-case, in the order given. */
  readonly accounts: readonly string[];
  /** The tokens, lower-case or {@link NATIVE_BALANCE_TOKEN}, in the order given. */
  readonly tokens: readonly string[];
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly error: AccountBalancesViewError;
  /** Whether the SDK tries again on its own. */
  readonly retrying: boolean;
}

/**
 *  A live balances view ended: `stopLive()` stopped it, or the client's `signal`
 *  aborted. No view follows. After `stopLive()`, call `subscribe` again for a new one.
 *
 * @category account views
 */
export interface AccountBalancesClosed {
  readonly status: "closed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The accounts, lower-case, in the order given. */
  readonly accounts: readonly string[];
  /** The tokens, lower-case or {@link NATIVE_BALANCE_TOKEN}, in the order given. */
  readonly tokens: readonly string[];
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  One state of a live view from {@link AccountBalancesClient.subscribe}. Switch on `status`.
 *
 *  | Status | Has data | Means |
 *  | --- | --- | --- |
 *  | `loading` | no | The first read is in flight. |
 *  | `ready` | yes | Right at `data.blockNumber`, and refreshed as the balances change. |
 *  | `stale` | yes | The last data, while the SDK recovers. |
 *  | `failed` | no | The read failed. The SDK tries again unless `retrying` is `false`. |
 *  | `closed` | no | The view ended. |
 *
 * @category account views
 */
export type AccountBalancesView =
  | AccountBalancesLoading
  | AccountBalancesSnapshot
  | AccountBalancesStale
  | AccountBalancesFailed
  | AccountBalancesClosed;
