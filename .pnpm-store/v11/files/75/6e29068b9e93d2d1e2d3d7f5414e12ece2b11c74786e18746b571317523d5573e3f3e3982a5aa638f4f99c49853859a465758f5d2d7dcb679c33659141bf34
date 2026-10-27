// `client.accountBalances`: several accounts' wallet balances, from the chain.
//
// `getSnapshot` reads every account's balance of every token the caller names, at one
// block (`balancesRead.ts`), through the engine's own chain client. Concurrent calls
// for the same accounts and tokens share one read (`registry.ts`). `subscribe` repeats
// that read when the balances can have changed (`balancesSession.ts`), one session per
// set of accounts and tokens.

import { getAddress, isAddress, type Address } from "viem";
import { InvalidInputError, RpcError } from "../errors.js";
import type { ContractRevertError, NotConfiguredError } from "../errors.js";
import * as GraphqlBoundary from "../graphqlBoundary.js";
import * as Raise from "../raise.js";
import * as BalancesRead from "./balancesRead.js";
import * as BalancesSession from "./balancesSession.js";
import * as Freeze from "./freeze.js";
import type * as PinnedBatch from "./pinnedBatch.js";
import * as Registry from "./registry.js";
import * as BalancesTypes from "./balancesTypes.js";
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
export type AccountBalancesClientGetSnapshotError =
  | InvalidInputError
  | NotConfiguredError
  | RpcError
  | ContractRevertError;

/**
 *  The most balances one call reads: accounts × tokens. A larger request is refused
 *  rather than sent as one oversized call.
 *
 * @category account views
 */
export const ACCOUNT_BALANCES_MAX = 1_000;

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
  getSnapshot(
    accounts: readonly string[],
    tokens: readonly string[],
    options?: AccountBalancesGetSnapshotOptions,
  ): Promise<AccountBalancesSnapshot>;

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
  subscribe(
    accounts: readonly string[],
    tokens: readonly string[],
    onView: (view: AccountBalancesView) => void,
  ): () => void;
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
  readonly watch: (
    tokens: readonly Address[],
    accounts: readonly Address[],
    onLog: (blockNumber: bigint | null) => void,
    onError: () => void,
    onOpen: () => void,
  ) => () => void;
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

const OPERATION = "accountBalances.getSnapshot";
const SUBSCRIBE = "accountBalances.subscribe";

interface Request {
  /** Sorted unique identities used by the shared read and session. */
  readonly accounts: readonly Address[];
  readonly tokens: readonly BalancesRead.BalanceToken[];
  readonly key: string;
  /** Caller layout, including duplicates and native-token labels. */
  readonly requested: BalancesRead.ReadAccountBalancesInput;
  readonly layoutKey: string;
}

function addressOf(value: unknown, what: string, operation: string): Address {
  // A JavaScript caller can pass anything, so the type is checked at run time too.
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new InvalidInputError(`${operation} needs every ${what} to be an address`);
  }
  return getAddress(value);
}

/** Checks a request and names it. Throws `InvalidInputError`. */
export function requestOf(accounts: unknown, tokens: unknown, operation: string): Request {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new InvalidInputError(`${operation} needs at least one account`);
  }
  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new InvalidInputError(`${operation} needs at least one token`);
  }
  if (accounts.length * tokens.length > ACCOUNT_BALANCES_MAX) {
    throw new InvalidInputError(
      `${operation} reads at most ${ACCOUNT_BALANCES_MAX} balances; got ${accounts.length} accounts × ${tokens.length} tokens`,
    );
  }
  const checkedAccounts = accounts.map((account: unknown) => addressOf(account, "account", operation));
  const checkedTokens = tokens.map((token: unknown): BalancesRead.BalanceToken =>
    token === BalancesTypes.NATIVE_BALANCE_TOKEN
      ? BalancesTypes.NATIVE_BALANCE_TOKEN
      : addressOf(token, "token", operation),
  );
  const canonicalAccounts = [...new Set(checkedAccounts)].sort();
  const canonicalTokens = [...new Set(checkedTokens.map(BalancesRead.identityOf))].sort();
  const key = `${canonicalAccounts.join(",")}|${canonicalTokens.join(",")}`.toLowerCase();
  const layoutKey = `${checkedAccounts.join(",")}|${checkedTokens.join(",")}`.toLowerCase();
  return {
    accounts: canonicalAccounts,
    tokens: canonicalTokens,
    key,
    requested: { accounts: checkedAccounts, tokens: checkedTokens },
    layoutKey,
  };
}

/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;

/**
 *  What a finished snapshot read hands its caller, now that the live view of the same
 *  accounts and tokens may have moved on while it ran: the snapshot, or the live view when that is
 *  ready at a block at least as new. `"readAgain"` when only a stale live view holds the
 *  newer state. A snapshot older than what the live view's listeners already have is
 *  never handed back, because a caller that replaces its value with each result would
 *  go back in time.
 */
function settle(
  snapshot: AccountBalancesSnapshot,
  current: AccountBalancesView | undefined,
): AccountBalancesSnapshot | "readAgain" {
  if (current?.status !== "ready" && current?.status !== "stale") return snapshot;
  if (current.data.blockNumber < snapshot.data.blockNumber) return snapshot;
  if (current.status === "ready") return current;
  return current.data.blockNumber > snapshot.data.blockNumber ? "readAgain" : snapshot;
}

/** The ERC-20 tokens of a request, once each: the ones a `Transfer` can move. */
function erc20sOf(tokens: readonly BalancesRead.BalanceToken[]): Address[] {
  const seen = new Map<string, Address>();
  for (const token of tokens) {
    const erc20 = BalancesRead.erc20Of(token);
    if (erc20 !== undefined) seen.set(erc20.toLowerCase(), erc20);
  }
  return [...seen.values()];
}

/** Builds `client.accountBalances`. One per engine. */
export function createAccountBalancesWithDeps(deps: AccountBalancesDeps): AccountBalancesOwner {
  const flights = new Registry.SingleFlight<AccountBalancesSnapshot>();
  // One canonical view can serve several layouts. Cache projections with that view,
  // so a snapshot and listeners of the same layout receive the same frozen object.
  // Old views and their projections leave together; nothing is shared across owners.
  const projections = new WeakMap<AccountBalancesView, Map<string, AccountBalancesView>>();
  const project = (view: AccountBalancesView, request: Request): AccountBalancesView => {
    let layouts = projections.get(view);
    const held = layouts?.get(request.layoutKey);
    if (held !== undefined) return held;
    const labels = {
      accounts: request.requested.accounts.map((account) => account.toLowerCase()),
      tokens: request.requested.tokens.map((token) => token.toLowerCase()),
    };
    let projected: AccountBalancesView;
    if (view.status === "ready" || view.status === "stale") {
      projected = Freeze.deepFreeze({
        ...view,
        ...labels,
        data: { ...view.data, balances: BalancesRead.projectBalances(request.requested, view.data.balances) },
      });
    } else {
      projected = Freeze.deepFreeze({ ...view, ...labels });
    }
    if (layouts === undefined) {
      layouts = new Map();
      projections.set(view, layouts);
    }
    layouts.set(request.layoutKey, projected);
    return projected;
  };
  const nowMs = deps.nowMs ?? Date.now;
  let revision = 0;
  const nextRevision = () => {
    revision += 1;
    return revision;
  };

  const read = async (request: Request, signal: AbortSignal): Promise<AccountBalancesSnapshot> => {
    const result = await BalancesRead.readAccountBalances(request, deps.chain(), signal);
    if (signal.aborted) throw signal.reason;
    const snapshot: AccountBalancesSnapshot = Freeze.deepFreeze({
      status: "ready",
      chainId: deps.chainId,
      accounts: request.accounts.map((account) => account.toLowerCase()),
      tokens: request.tokens.map((token) => token.toLowerCase()),
      revision: nextRevision(),
      data: {
        balances: [...result.balances],
        blockNumber: result.blockNumber,
        observedAtMs: nowMs(),
      },
    });
    return snapshot;
  };

  // `subscribe` names the request its session is built for; `createSession` runs inside
  // that same call, so nothing else can take its place.
  let starting: Request | undefined;
  const live = new Registry.LiveViews<AccountBalancesView>({
    createSession: (_key, publish) => {
      const request = starting ?? Raise.unreachable("subscribe names a request before it starts a session");
      const tokens = erc20sOf(request.tokens);
      return new BalancesSession.BalancesSession({
        chainId: deps.chainId,
        accounts: request.accounts,
        tokens: request.tokens.map((token) => token.toLowerCase()),
        // Async, so a chain that throws (no transport) rejects the read rather than the caller.
        read: async (signal) => BalancesRead.readAccountBalances(request, deps.chain(), signal),
        // With no ERC-20 there is no transfer to watch; the timer alone keeps it fresh.
        watch: (onLog, onError, onOpen) =>
          tokens.length === 0 ? () => undefined : deps.watch(tokens, request.accounts, onLog, onError, onOpen),
        publish,
        nextRevision,
        nowMs,
        backoffMs: deps.backoffMs,
        warn: deps.warn,
      });
    },
    warn: deps.warn,
    onIdle: () => undefined,
    ...(deps.lingerMs === undefined ? {} : { lingerMs: deps.lingerMs }),
  });

  /** One request's snapshot, never older than what its live view's listeners already have. */
  const snapshotOf = async (request: Request, signal: AbortSignal | undefined): Promise<AccountBalancesSnapshot> => {
    for (let attempt = 1; ; attempt += 1) {
      // A live view that is ready was read at its block, and never older than what its listeners have.
      const current = live.current(request.key);
      if (current?.status === "ready") return current;
      const snapshot = await flights.run(request.key, deps.ownerSignal, (flight) => read(request, flight), signal);
      const settled = settle(snapshot, live.current(request.key));
      if (settled !== "readAgain") return settled;
      if (attempt === SNAPSHOT_READS) {
        throw new RpcError(OPERATION, "every read answered from an older block than the balances' live view");
      }
    }
  };

  const client: AccountBalancesClient = {
    getSnapshot(accounts, tokens, options) {
      try {
        const request = requestOf(accounts, tokens, OPERATION);
        if (options?.signal?.aborted) return Promise.reject(options.signal.reason);
        // The owner closed the client: nothing reads for it any more.
        if (deps.ownerSignal?.aborted === true) return Promise.reject(deps.ownerSignal.reason);
        const linked = GraphqlBoundary.linkSignals(deps.ownerSignal, options?.signal);
        return snapshotOf(request, linked.signal)
          .then((snapshot) => {
            // Cancellation also applies when the snapshot came straight from a live view.
            if (linked.signal?.aborted) throw linked.signal.reason;
            const projected = project(snapshot, request);
            if (projected.status !== "ready") return Raise.unreachable("a ready snapshot projects to ready");
            return projected;
          })
          .finally(linked.dispose);
      } catch (error) {
        return Promise.reject(error);
      }
    },
    subscribe(accounts, tokens, onView) {
      const request = requestOf(accounts, tokens, SUBSCRIBE);
      const value: unknown = onView;
      if (typeof value !== "function") throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
      // The owner closed the client: no live view starts again.
      if (deps.ownerSignal?.aborted === true) {
        const closed: AccountBalancesView = Freeze.deepFreeze({
          status: "closed",
          chainId: deps.chainId,
          accounts: request.accounts.map((account) => account.toLowerCase()),
          tokens: request.tokens.map((token) => token.toLowerCase()),
          revision: nextRevision(),
        });
        return live.deliverOnce(project(closed, request), onView);
      }
      starting = request;
      try {
        return live.subscribe(request.key, (view) => onView(project(view, request)));
      } finally {
        starting = undefined;
      }
    },
  };
  const stopLive = () => live.closeAll();
  // The owner's close ends live views too, so no session reads for a closed client.
  deps.ownerSignal?.addEventListener("abort", stopLive, { once: true });
  return { client, stopLive };
}
