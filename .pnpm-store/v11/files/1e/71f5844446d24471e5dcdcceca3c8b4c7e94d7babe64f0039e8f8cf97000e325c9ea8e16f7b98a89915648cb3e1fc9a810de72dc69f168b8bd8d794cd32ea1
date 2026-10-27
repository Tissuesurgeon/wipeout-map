// `client.accountSpotOrders`: one account's resting spot orders, from the chain.
//
// `getSnapshot` reads every spot pool at one block (`spotOrdersRead.ts`), through the
// engine's own chain client. Which pools are spot pools is market metadata from the
// indexer, cached briefly; nothing about the account comes from it. Concurrent calls for
// one account share one read (`registry.ts`), and the orders a read found ride the next
// read's first batch. A live view (`spotOrdersSession.ts`) follows the spot pools' order
// events over the chain socket and reads again the pool an event concerns.

import { getAddress, isAddress, type Address } from "viem";
import { IndexerError, InvalidInputError, RpcError } from "../errors.js";
import type { ContractRevertError, NotConfiguredError } from "../errors.js";
import * as Markets from "../markets.js";
import * as Raise from "../raise.js";
import * as Freeze from "./freeze.js";
import * as PinnedBatch from "./pinnedBatch.js";
import * as Registry from "./registry.js";
import type * as Events from "./spotOrdersEvents.js";
import * as SpotOrdersRead from "./spotOrdersRead.js";
import * as SpotOrdersSession from "./spotOrdersSession.js";
import type { AccountSpotOrdersSnapshot, AccountSpotOrdersView } from "./spotOrdersTypes.js";

/**
 *  Options for {@link AccountSpotOrdersClient.getSnapshot}.
 *
 * @category account views
 */
export interface AccountSpotOrdersGetSnapshotOptions {
  /** Stops waiting for the read. The caller's abort reason is rethrown unchanged. */
  readonly signal?: AbortSignal;
}

/**
 *  Failures from {@link AccountSpotOrdersClient.getSnapshot}.
 *
 * @category account views
 */
export type AccountSpotOrdersClientGetSnapshotError =
  | InvalidInputError
  | NotConfiguredError
  | IndexerError
  | ContractRevertError
  | RpcError;

/**
 *  One account's resting spot orders, read from the chain.
 *
 *  Reach it as `client.accountSpotOrders`; the chain is the engine's own. On an exchange,
 *  use `exchange.engineFor(chainId).accountSpotOrders`.
 *
 *  **Details**
 *
 *  Every spot pool keeps its own list of an account's open orders, and the view asks each
 *  of them, so it holds every resting spot order: in unlisted markets too. The chain keeps
 *  no list of the pools an account trades in, so the view asks every spot pool the
 *  indexer's market list names. Resting perp orders are on the positions view instead,
 *  `client.accountPositions`, read at the same block as the positions.
 *
 * @category account views
 */
export interface AccountSpotOrdersClient {
  /**
   *  Reads one account's resting spot orders, at one block.
   *
   *  **Details**
   *
   *  - `account`: The trader's address, in any letter case. The view lower-cases it.
   *  - `options`: `signal` stops waiting. Once every caller of the read has stopped, it
   *    sends no more calls. The caller's abort reason is rethrown unchanged.
   *  - Returns: A `ready` view with every resting spot order. See {@link AccountSpotOrdersData}.
   *
   *  The read pins the chain head and reads everything at that block: one call per spot
   *  pool for the account's order ids, sent as the account because the pool answers for
   *  its caller, then one Multicall3 call for the orders' details (one call per order on a
   *  chain without Multicall3). Orders a previous read found ride the first round.
   *
   *  A pool whose orders cannot be read is in `data.unreadPools`, with its error, and its
   *  orders are missing from `data.orders`; `data.complete` is then `false`. A read that
   *  can read no pool fails. Empty pool discovery also fails unless its boundary proves
   *  an empty pool universe. Concurrent calls for one account share one read. While a live
   *  view of the account is `ready`, the call returns it. A read that finishes after the
   *  live view has moved past it hands back that view instead, or reads once more, so the
   *  call never returns an older block than the view's listeners already have.
   *
   *  **Gotchas**
   *
   *  - A pool keeps an order until it fills or someone cancels it, an expired one too.
   *    Compare `expireTimestampNs` with the time to tell an order that can still fill.
   *  - The list of spot pools comes from the indexer's market list. Each full read
   *    discovers it again, so a pool listed just now joins the next full read.
   *
   * **Example** (Showing an account's resting spot orders)
   *
   *  ```ts
   *  const snapshot = await client.accountSpotOrders.getSnapshot(account);
   *  for (const order of snapshot.data.orders) {
   *    console.log(order.pool, order.isBid ? "buy" : "sell", order.quantityRemaining, "at", order.price);
   *  }
   *  ```
   *
   * @throws {@link InvalidInputError} `account` is not an address.
   * @throws {@link NotConfiguredError} The client has no chain transport.
   * @throws {@link IndexerError} The indexer's list of spot pools could not be read, or empty discovery cannot prove an empty pool universe.
   * @throws {@link ContractRevertError} Every pool's order read reverted.
   * @throws {@link RpcError} The head, or every pool's orders, could not be read, or every read answered from an older block than the account's live view.
   */
  getSnapshot(account: string, options?: AccountSpotOrdersGetSnapshotOptions): Promise<AccountSpotOrdersSnapshot>;

  /**
   *  Follows one account's resting spot orders, and calls `onView` with every state of
   *  the view.
   *
   *  **Details**
   *
   *  - `account`: The trader's address, in any letter case. The view lower-cases it.
   *  - `onView`: Receives every state of the view, each one complete: see
   *    {@link AccountSpotOrdersView}. Views arrive in order, a microtask after the SDK
   *    produces them, and never during this call. Listeners share each view, so it is
   *    frozen all the way down; an `error` in it is not.
   *  - Returns: The function that stops this listener. Calling it twice does nothing.
   *
   *  The view starts `loading`, then goes `ready` with the first read, which is the same
   *  one-block read as {@link AccountSpotOrdersClient.getSnapshot}. After it, the SDK
   *  subscribes over the chain socket to every placement in every spot pool, because only
   *  a placement names its owner, and to the later events of the account's own orders by
   *  id. When one of them concerns the account, it reads again, at once, the pool that
   *  emitted it: an order the account placed, or a fill, cancel, expiry, reduce or amend of
   *  one of its orders. So a change shows within a block or so. A read that lands before
   *  the block of the event that asked for it reads that pool again. The SDK reads every
   *  pool again once the node confirms the subscription, because a change before that
   *  reached neither, and 30 s after it last read them all, so a subscription that stops
   *  without an error costs at most that.
   *
   *  A pool that cannot be read is in `data.unreadPools`, and the SDK reads it again after
   *  a backoff while the other pools stay live. A read that fails, because the head or no
   *  pool could be read, keeps the last data as `stale`, or is `failed` when there is
   *  none, and the SDK tries again after a backoff. Failed or unproven empty pool
   *  discovery keeps known orders and subscriptions, with `data.complete` set to `false`
   *  until discovery recovers. A lost subscription gives `stale`. The SDK subscribes again after a backoff and reads every pool then. A view is never
   *  older than the one before it.
   *
   *  Listeners of one account share one session. When the last one stops, the session
   *  lingers for 30 s, so a screen that comes back reuses it. `stopLive()` ends every
   *  session with a `closed` view, and so does an abort of the client's `signal`, after
   *  which `subscribe` gives only `closed`.
   *
   *  **Gotchas**
   *
   *  - The SDK reads the pool's list again on each change rather than folding the event,
   *    so each pool's orders are a whole read of that pool. An in-place amend keeps its
   *    order id; the read updates all its terms.
   *  - The subscription opens again whenever the account gains an order, so it names the
   *    new id. The old one stays until the node confirms the new one. Past 1,000 orders it
   *    follows every order event of the spot pools instead.
   *  - A listener that throws is reported through the client's debug channel and does
   *    not stop the view.
   *
   * **Example** (Keeping a screen on an account's spot orders)
   *
   *  ```ts
   *  const stop = client.accountSpotOrders.subscribe(account, (view) => {
   *    if (view.status === "ready" || view.status === "stale") render(view.data.orders, view.status === "stale");
   *  });
   *  // Later, when the screen closes:
   *  stop();
   *  ```
   *
   * @throws {@link InvalidInputError} `account` is not an address, or `onView` is not a function.
   */
  subscribe(account: string, onView: (view: AccountSpotOrdersView) => void): () => void;
}

/**
 *  Failures from {@link AccountSpotOrdersClient.subscribe}. Failures after the call
 *  arrive as views, not as errors.
 *
 * @category account views
 */
export type AccountSpotOrdersClientSubscribeError = InvalidInputError;

/** A discovery boundary that has proved the entire pool universe, including an empty one. */
export interface SpotPoolDiscovery {
  readonly pools: readonly Address[];
  readonly authoritative: true;
}

export interface AccountSpotOrdersDeps {
  readonly chainId: number;
  /** The chain the reads go to. Throws `NotConfiguredError` when the client has none. */
  readonly chain: () => PinnedBatch.PinnedChain;
  /**
   * Every spot pool, in any letter case. An empty array has unknown coverage; only an
   * authoritative result proves an empty universe. Rejects with the indexer's error.
   * The owning discovery boundary must pass `signal` to its indexer request.
   */
  readonly spotPools: (signal: AbortSignal) => Promise<readonly Address[] | SpotPoolDiscovery>;
  /**
   *  Subscribes to the logs `filters` match, and returns the release. `onLog` gets
   *  `undefined` for a log that does not read. `onError` fires at most once, and `onOpen`
   *  once, when the node confirms the subscription; neither during the call. Throws
   *  `NotConfiguredError` without a chain transport.
   */
  readonly watch: (
    filters: readonly Events.PoolLogFilter[],
    onLog: (log: SpotOrdersSession.SpotOrderLog | undefined) => void,
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
  /** The owner's own signal. Its abort closes every view for good. */
  readonly ownerSignal?: AbortSignal | undefined;
  /** The resettable live-read lifecycle; snapshots never join a flight from an ended lifecycle. */
  readonly lifecycle?: () => AbortSignal | undefined;
}

/** `client.accountSpotOrders` and the owner's handle on its live views. */
export interface AccountSpotOrdersOwner {
  readonly client: AccountSpotOrdersClient;
  /** Ends every live view with `closed`. */
  stopLive(): void;
}

const OPERATION = "accountSpotOrders.getSnapshot";
const SUBSCRIBE = "accountSpotOrders.subscribe";

/** How many accounts' order ids are remembered for the next read's first batch. */
const KNOWN_ORDERS_MAX = 256;

/** The open order ids one pool held for an account, and the block they were read at. */
interface KnownPool {
  readonly orderIds: readonly bigint[];
  readonly blockNumber: bigint;
}

/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;

function accountOf(value: unknown, operation: string): Address {
  // A JavaScript caller can pass anything, so the type is checked at run time too.
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new InvalidInputError(`${operation} needs account to be an address`);
  }
  return getAddress(value);
}

/**
 *  What a finished snapshot read hands its caller, now that the live view of the same
 *  account may have moved on while it ran: the snapshot, or the live view when that is
 *  ready at a block at least as new. `"readAgain"` when only a stale live view holds the
 *  newer state. A snapshot older than what the live view's listeners already have is
 *  never handed back, because a caller that replaces its value with each result would
 *  go back in time.
 */
function settle(
  snapshot: AccountSpotOrdersSnapshot,
  current: AccountSpotOrdersView | undefined,
): AccountSpotOrdersSnapshot | "readAgain" {
  if (current?.status !== "ready" && current?.status !== "stale") return snapshot;
  if (current.data.blockNumber < snapshot.data.blockNumber) return snapshot;
  if (current.status === "ready") return current;
  return current.data.blockNumber > snapshot.data.blockNumber ? "readAgain" : snapshot;
}

/** Builds `client.accountSpotOrders`. One per engine. */
export function createAccountSpotOrdersWithDeps(deps: AccountSpotOrdersDeps): AccountSpotOrdersOwner {
  const flights = new Registry.SingleFlight<AccountSpotOrdersSnapshot>();
  /** What the newest read of each of an account's pools found, and its block, by account. */
  const knownOrders = new Map<string, Map<string, KnownPool>>();
  const nowMs = deps.nowMs ?? Date.now;
  let revision = 0;
  const nextRevision = () => {
    revision += 1;
    return revision;
  };

  const remember = (key: string, result: SpotOrdersRead.AccountSpotOrdersRead) => {
    const held = knownOrders.get(key) ?? new Map<string, KnownPool>();
    for (const [pool, settled] of result.byPool) {
      // A read that started earlier can land later. What it found is older, and must not
      // replace what a newer read found. A pool that could not be read keeps what it had.
      const before = held.get(pool);
      if (!settled.ok || (before !== undefined && result.blockNumber < before.blockNumber)) continue;
      held.set(pool, { orderIds: settled.orderIds, blockNumber: result.blockNumber });
    }
    knownOrders.delete(key);
    knownOrders.set(key, held);
    // Oldest first: a Map iterates in insertion order.
    if (knownOrders.size > KNOWN_ORDERS_MAX) {
      const oldest = knownOrders.keys().next();
      if (!oldest.done) knownOrders.delete(oldest.value);
    }
  };

  /**
   *  One read of `pools`, or of every spot pool when `pools` is `null`, with what a
   *  previous read found.
   */
  const readAccount = async (
    account: Address,
    pools: readonly Address[] | null,
    known: ReadonlyMap<string, readonly bigint[]> | undefined,
    signal: AbortSignal,
  ): Promise<SpotOrdersRead.AccountSpotOrdersRead> => {
    const key = account.toLowerCase();
    // The session matches events by lower-case pool, so a list in another case must not
    // leave it unable to match its own orders.
    let targets = pools;
    if (targets === null) {
      const discovered = await deps.spotPools(signal);
      PinnedBatch.stopIfAborted(signal);
      // Readonly arrays do not narrow with Array.isArray; the named field proves the result shape.
      if ("pools" in discovered) targets = discovered.pools.map(Markets.lower0x);
      else {
        if (discovered.length === 0) {
          throw new IndexerError("PoolsByType", "empty spot pool discovery does not prove an empty pool universe");
        }
        targets = discovered.map(Markets.lower0x);
      }
    }
    PinnedBatch.stopIfAborted(signal);
    const knownIds =
      known ?? new Map([...(knownOrders.get(key) ?? [])].map(([pool, entry]) => [pool, entry.orderIds] as const));
    const result = await SpotOrdersRead.readAccountSpotOrders(
      { account, pools: targets, knownOrders: knownIds },
      deps.chain(),
      signal,
    );
    remember(key, result);
    return result;
  };

  const read = async (account: Address, signal: AbortSignal): Promise<AccountSpotOrdersSnapshot> => {
    const result = await readAccount(account, null, undefined, signal);
    if (signal.aborted) throw signal.reason;
    // A read that could read no pool learned nothing: it fails rather than show no orders.
    const failure = SpotOrdersRead.nothingRead(result);
    if (failure !== undefined) throw failure;
    const { orders, unreadPools } = SpotOrdersRead.viewOf(result.byPool);
    const snapshot: AccountSpotOrdersSnapshot = Freeze.deepFreeze({
      status: "ready",
      chainId: deps.chainId,
      account: account.toLowerCase(),
      revision: nextRevision(),
      data: {
        orders: [...orders],
        unreadPools: [...unreadPools],
        complete: unreadPools.length === 0,
        blockNumber: result.blockNumber,
        observedAtMs: nowMs(),
      },
    });
    return snapshot;
  };

  // `subscribe` names the account its session is built for; `createSession` runs inside
  // that same call, so nothing else can take its place.
  let starting: Address | undefined;
  const live = new Registry.LiveViews<AccountSpotOrdersView>({
    createSession: (_key, publish) => {
      const account = starting ?? Raise.unreachable("subscribe names an account before it starts a session");
      return new SpotOrdersSession.SpotOrdersSession({
        chainId: deps.chainId,
        account,
        read: (pools, known, signal) => readAccount(account, pools, known, signal),
        watch: deps.watch,
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

  /** One account's snapshot, never older than what its live view's listeners already have. */
  const snapshotOf = async (account: Address, signal: AbortSignal | undefined): Promise<AccountSpotOrdersSnapshot> => {
    const key = account.toLowerCase();
    const lifecycle = deps.lifecycle?.() ?? deps.ownerSignal;
    for (let attempt = 1; ; attempt += 1) {
      // A live view that is ready was read at its block, and never older than what its listeners have.
      const current = live.current(key);
      if (current?.status === "ready") return current;
      const snapshot = await flights.run(key, lifecycle, (flight) => read(account, flight), signal);
      const settled = settle(snapshot, live.current(key));
      if (settled !== "readAgain") return settled;
      if (attempt === SNAPSHOT_READS) {
        throw new RpcError(OPERATION, "every read answered from an older block than the account's live view");
      }
    }
  };

  const client: AccountSpotOrdersClient = {
    getSnapshot(accountInput, options) {
      try {
        const account = accountOf(accountInput, OPERATION);
        if (options?.signal?.aborted) return Promise.reject(options.signal.reason);
        // The owner closed the client: nothing reads for it any more.
        if (deps.ownerSignal?.aborted === true) return Promise.reject(deps.ownerSignal.reason);
        return snapshotOf(account, options?.signal);
      } catch (error) {
        return Promise.reject(error);
      }
    },
    subscribe(accountInput, onView) {
      const account = accountOf(accountInput, SUBSCRIBE);
      const value: unknown = onView;
      if (typeof value !== "function") throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
      // The owner closed the client: no live view starts again.
      if (deps.ownerSignal?.aborted === true) {
        const closed: AccountSpotOrdersView = Object.freeze({
          status: "closed",
          chainId: deps.chainId,
          account: account.toLowerCase(),
          revision: nextRevision(),
        });
        return live.deliverOnce(closed, onView);
      }
      starting = account;
      try {
        return live.subscribe(account.toLowerCase(), onView);
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
