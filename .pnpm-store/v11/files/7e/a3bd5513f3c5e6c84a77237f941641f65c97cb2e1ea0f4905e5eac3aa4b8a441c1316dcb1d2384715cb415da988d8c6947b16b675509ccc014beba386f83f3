import { type Address } from "viem";
import { InvalidInputError, RpcError } from "../errors.js";
import type { ContractRevertError, NotConfiguredError } from "../errors.js";
import * as BalancesRead from "./balancesRead.js";
import type * as PinnedBatch from "./pinnedBatch.js";
import type { AccountBalancesSnapshot, AccountBalancesView } from "./balancesTypes.js";
/**
 *  Options for {@link AccountBalancesClient.getSnapshot}.
 *
 * @category account views
 */
export interface AccountBalancesGetSnapshotOptions {
    /** Stops waiting for the read. The caller's abort reason is rethrown unchanged. */
    readonly signal?: AbortSignal;
}
/**
 *  Failures from {@link AccountBalancesClient.getSnapshot}. A balance that cannot be read
 *  is an `unknown` entry, not a failure of the call.
 *
 * @category account views
 */
export type AccountBalancesClientGetSnapshotError = InvalidInputError | NotConfiguredError | RpcError | ContractRevertError;
/**
 *  The most balances one call reads: accounts × tokens. A larger request is refused
 *  rather than sent as one oversized call.
 *
 * @category account views
 */
export declare const ACCOUNT_BALANCES_MAX = 1000;
/**
 *  Several accounts' wallet balances on the engine's chain, read from the chain.
 *
 *  Reach it as `client.accountBalances`; the chain is the engine's own. On an exchange,
 *  use `exchange.engineFor(chainId).accountBalances`.
 *
 * @category account views
 */
export interface AccountBalancesClient {
    /**
     *  Reads every account's balance of every token, at one block.
     *
     *  **Details**
     *
     *  - `accounts`: The accounts, in any letter case.
     *  - `tokens`: ERC-20 token addresses, and {@link NATIVE_BALANCE_TOKEN} (`"native"`)
     *    for the chain's native token.
     *  - `options`: `signal` stops waiting. Once every caller of the read has stopped, it
     *    sends no more calls. The caller's abort reason is rethrown unchanged.
     *  - Returns: A `ready` view with one balance per account and token. See
     *    {@link AccountBalancesData}.
     *
     *  The read pins the chain head and reads every balance at that block, in one
     *  Multicall3 call: `balanceOf` for a token and `getEthBalance` for the native token.
     *  On a chain without Multicall3 it reads them one by one at that block. A balance
     *  that cannot be read is `unknown` with its error, never zero. Concurrent calls for
     *  the same accounts and tokens share one read, regardless of order, duplicates, or
     *  which native-token label they use. Each caller keeps its requested order and labels.
     *  A read that finishes after a live view has moved past it hands back that view,
     *  projected to the caller's layout, or reads once more, so the
     *  call never returns an older block than the view's listeners already have.
     *
     *  **Gotchas**
     *
     *  - {@link NATIVE_TOKEN_SENTINEL}, the protocol's address for the native token, also
     *    reads the native balance. The answer names it as you passed it.
     *  - Balances are raw base units. Scale them with the token's decimals.
     *
     * **Example** (Reading a roster's balances)
     *
     *  ```ts
     *  const snapshot = await client.accountBalances.getSnapshot(accounts, [usdso, "native"]);
     *  for (const entry of snapshot.data.balances) {
     *    console.log(entry.account, entry.token, entry.balance.status === "known" ? entry.balance.value : "unknown");
     *  }
     *  ```
     *
     * @throws {@link InvalidInputError} An account or token is not an address, a list is empty, or the request is over {@link ACCOUNT_BALANCES_MAX} balances.
     * @throws {@link NotConfiguredError} The client has no chain transport.
     * @throws {@link RpcError} The read did not complete, or every read answered from an older block than the live view.
     * @throws {@link ContractRevertError} The Multicall3 call itself reverted.
     */
    getSnapshot(accounts: readonly string[], tokens: readonly string[], options?: AccountBalancesGetSnapshotOptions): Promise<AccountBalancesSnapshot>;
    /**
     *  Follows every account's balance of every token as they change.
     *
     *  **Details**
     *
     *  - `accounts`: The accounts, in any letter case.
     *  - `tokens`: ERC-20 token addresses, and {@link NATIVE_BALANCE_TOKEN} (`"native"`)
     *    for the chain's native token.
     *  - `onView`: Receives every state of the view, each one complete: see
     *    {@link AccountBalancesView}. Views arrive in order, a microtask after the SDK
     *    produces them, and never during this call. Listeners with the same layout share
     *    each view, so it is
     *    frozen all the way down; an `error` in it is not. Each listener keeps its
     *    requested account/token order, duplicates, and native-token labels.
     *  - Returns: The function that stops this listener. Calling it twice does nothing.
     *
     *  The view starts `loading`, then goes `ready` with the first read. The SDK reads the
     *  balances again at once when one of the tokens emits a `Transfer` from or to one of
     *  the accounts, which the chain socket pushes. It also reads again every 10 s, because
     *  a native balance changes with no event. Each read is the same one-block read as
     *  {@link AccountBalancesClient.getSnapshot}, and a view is never older than the one
     *  before it.
     *
     *  A failed read keeps the last data as `stale`, or is `failed` when there is none,
     *  and the SDK tries again after a backoff. A lost transfer subscription gives
     *  `stale`, and the SDK subscribes again after a backoff and reads the balances.
     *
     *  Listeners of the same accounts and tokens share one session, regardless of order,
     *  duplicates, or which native-token label they use.
     *  When the last one stops, the session lingers for 30 s, so a screen that comes back
     *  reuses it. `stopLive()` ends every session with a `closed` view.
     *
     *  **Gotchas**
     *
     *  - Transfers only trigger a read; nothing is folded from them. A native balance, and
     *    a token that moves balances without `Transfer`, show at the next 10 s read.
     *  - A listener that throws is reported through the client's debug channel and does
     *    not stop the view.
     *
     * **Example** (Keeping a screen on a wallet's balances)
     *
     *  ```ts
     *  const stop = client.accountBalances.subscribe([account], [usdso, "native"], (view) => {
     *    if (view.status === "ready" || view.status === "stale") render(view.data.balances, view.status === "stale");
     *  });
     *  // Later, when the screen closes:
     *  stop();
     *  ```
     *
     * @throws {@link InvalidInputError} An account or token is not an address, a list is empty, the request is over {@link ACCOUNT_BALANCES_MAX} balances, or `onView` is not a function.
     */
    subscribe(accounts: readonly string[], tokens: readonly string[], onView: (view: AccountBalancesView) => void): () => void;
}
/**
 *  Failures from {@link AccountBalancesClient.subscribe}. Failures after the call arrive
 *  as views, not as errors.
 *
 * @category account views
 */
export type AccountBalancesClientSubscribeError = InvalidInputError;
export interface AccountBalancesDeps {
    readonly chainId: number;
    /** The chain the reads go to. Throws `NotConfiguredError` when the client has none. */
    readonly chain: () => PinnedBatch.PinnedChain;
    /**
     *  Subscribes to the `Transfer` events of `tokens` from or to any of `accounts`, and
     *  returns the release. `onLog` gets the log's block, `null` when it names none.
     *  `onError` fires at most once, and `onOpen` once, when the node confirms the
     *  subscription; neither during the call. Throws `NotConfiguredError` without a chain
     *  transport.
     */
    readonly watch: (tokens: readonly Address[], accounts: readonly Address[], onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen: () => void) => () => void;
    /** The delay before retry `attempt` of a live view, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    /** Reports what a live view cannot report as a view: a listener that threw, a lost subscription. */
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
    /** The clock of `observedAtMs`, in milliseconds. */
    readonly nowMs?: () => number;
    /** How long a live view outlives its last listener. Tests shorten it. */
    readonly lingerMs?: number;
    /** The owner's own signal. Its abort ends every live view, as `stopLive()` does. */
    readonly ownerSignal?: AbortSignal | undefined;
}
/** `client.accountBalances` and the owner's handle on its live views. */
export interface AccountBalancesOwner {
    readonly client: AccountBalancesClient;
    /** Ends every live view with `closed`. */
    stopLive(): void;
}
interface Request {
    /** Sorted unique identities used by the shared read and session. */
    readonly accounts: readonly Address[];
    readonly tokens: readonly BalancesRead.BalanceToken[];
    readonly key: string;
    /** Caller layout, including duplicates and native-token labels. */
    readonly requested: BalancesRead.ReadAccountBalancesInput;
    readonly layoutKey: string;
}
/** Checks a request and names it. Throws `InvalidInputError`. */
export declare function requestOf(accounts: unknown, tokens: unknown, operation: string): Request;
/** Builds `client.accountBalances`. One per engine. */
export declare function createAccountBalancesWithDeps(deps: AccountBalancesDeps): AccountBalancesOwner;
export {};
