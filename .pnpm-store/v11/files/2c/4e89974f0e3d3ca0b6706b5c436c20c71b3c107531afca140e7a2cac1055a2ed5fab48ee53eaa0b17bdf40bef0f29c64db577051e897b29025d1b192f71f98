// `client.accountPositions`: one account's open perp positions, resting orders and
// margin, from the chain.
//
// `getSnapshot` reads the account in one MarginBank at one block (`positionsRead.ts`),
// through the engine's own chain client. Concurrent calls for one account share one
// read (`registry.ts`), and the pools and orders a read found ride the next read's
// first batch.
//
// The chain adapter below maps the read's three calls onto viem: the head, one
// Multicall3 `aggregate3` when the chain declares one at that block, and a plain
// `eth_call` otherwise.

import {
  ChainDoesNotSupportContract,
  getAddress,
  getChainContractAddress,
  isAddress,
  multicall3Abi,
  type Address,
  type PublicClient,
} from "viem";
import { InvalidInputError, RpcError } from "../errors.js";
import type { ContractRevertError, NotConfiguredError } from "../errors.js";
import * as Raise from "../raise.js";
import { deepFreeze } from "./freeze.js";
import * as PositionsPush from "./positionsPush.js";
import * as PositionsRead from "./positionsRead.js";
import * as PinnedBatch from "./pinnedBatch.js";
import * as PositionsSession from "./positionsSession.js";
import * as Registry from "./registry.js";
import type { AccountPositionsSnapshot, AccountPositionsView } from "./positionsTypes.js";

/**
 *  Options for {@link AccountPositionsClient.getSnapshot}.
 *
 * @category account views
 */
export interface AccountPositionsGetSnapshotOptions {
  /** Stops waiting for the read. The caller's abort reason is rethrown unchanged. */
  readonly signal?: AbortSignal;
}

/**
 *  Failures from {@link AccountPositionsClient.getSnapshot}.
 *
 * @category account views
 */
export type AccountPositionsClientGetSnapshotError =
  | InvalidInputError
  | NotConfiguredError
  | ContractRevertError
  | RpcError;

/**
 *  One account's open perp positions, resting perp orders and cross-margin state, read
 *  from the chain.
 *
 *  Reach it as `client.accountPositions`; the chain is the engine's own. On an exchange,
 *  use `exchange.engineFor(chainId).accountPositions`.
 *
 *  **Details**
 *
 *  The view reads the MarginBank's own list of the pools the account is active in, so
 *  it holds every open position: in unlisted and restricted pools too, and positions
 *  the account did not open itself, such as an ADL. The same list names the pools where
 *  the account only has resting orders, so it holds every resting order too. Every
 *  figure comes from one block.
 *
 * @category account views
 */
export interface AccountPositionsClient {
  /**
   *  Reads one account's open perp positions, resting orders and margin in one MarginBank,
   *  at one block.
   *
   *  **Details**
   *
   *  - `marginBank`: The MarginBank that holds the positions, as a perp market row names it.
   *  - `account`: The trader's address, in any letter case. The view lower-cases it.
   *  - `options`: `signal` stops waiting. Once every caller of the read has stopped, it
   *    sends no more calls. The caller's abort reason is rethrown unchanged.
   *  - Returns: A `ready` view with every open position, every resting order and the
   *    account's margin. See {@link AccountPositionsData}.
   *
   *  The read pins the chain head and reads everything at that block: usually three
   *  Multicall3 calls, one when a previous read already named the account's pools and
   *  orders, and one call per figure on a chain without Multicall3. Each pool's order ids
   *  are one more call per pool, sent as the account, because the pool answers for its
   *  caller. Each position is marked with the MarginBank's own math, and its liquidation
   *  price is solved from the same block.
   *
   *  A figure the chain could not give is `unknown` with the reason, never zero. A pool
   *  whose price feed is stale keeps its position, with its marked figures unknown. The
   *  orders are `unknown` when one pool's could not be read, and the positions stand.
   *  Concurrent calls for one account share one read. A read that finishes after a live
   *  view of the account has moved past it hands back that view instead, or reads once
   *  more, so the call never returns an older block than the view's listeners already have.
   *
   *  **Gotchas**
   *
   *  - The account's health, and so every liquidation price, is unknown while any market
   *    the account holds cannot be priced: the MarginBank's health read walks them all.
   *  - The leverage cap is the account's own setting on the pool; the margin a position
   *    needs under it is the stricter of the cap and the market's rate.
   *  - A pool keeps an order until it fills or someone cancels it, an expired one too.
   *    Compare `expireTimestampNs` with the time to tell an order that can still fill.
   *
   * **Example** (Showing an account's perp positions)
   *
   *  ```ts
   *  const snapshot = await client.accountPositions.getSnapshot(marginBank, account);
   *  for (const position of snapshot.data.positions) {
   *    const pnl = position.marks.status === "known" ? position.marks.unrealizedPnl : null;
   *    console.log(position.pool, position.size, pnl ?? "unknown");
   *  }
   *  ```
   *
   * @throws {@link InvalidInputError} `marginBank` or `account` is not an address.
   * @throws {@link NotConfiguredError} The client has no chain transport.
   * @throws {@link ContractRevertError} The account's state or a position read reverted.
   * @throws {@link RpcError} A chain read did not complete, or every read answered from an older block than the account's live view.
   */
  getSnapshot(
    marginBank: string,
    account: string,
    options?: AccountPositionsGetSnapshotOptions,
  ): Promise<AccountPositionsSnapshot>;

  /**
   *  Follows one account's open perp positions, resting orders and margin in one
   *  MarginBank as they change.
   *
   *  **Details**
   *
   *  - `marginBank`: The MarginBank that holds the positions, as a perp market row names it.
   *  - `account`: The trader's address, in any letter case. The view lower-cases it.
   *  - `onView`: Receives every state of the view, each one complete: see
   *    {@link AccountPositionsView}. Views arrive in order, a microtask after the SDK
   *    produces them, and never during this call. Listeners share each view, so it is
   *    frozen all the way down; an `error` in it is not.
   *  - Returns: The function that stops this listener. Calling it twice does nothing.
   *
   *  The view starts `loading`, then goes `ready` with the first read, which is the same
   *  one-block read as {@link AccountPositionsClient.getSnapshot}. After it, the Somnia
   *  node pushes that read itself (`somnia_watch`), run at the block of each change:
   *
   *  - when the MarginBank emits an event naming the account (a fill, an order's
   *    collateral lock or release, a deposit or withdrawal, a liquidation, a position
   *    transferred to it);
   *  - on every price write while the account holds positions, because their marks,
   *    PnL and liquidation prices move with the price. This needs
   *    `addresses.priceFeedScheduler` in the client's configuration.
   *
   *  Each push is one complete read, and a view is never older than the one before it;
   *  two pushes from one block give one view. Fills and cancels arrive in the push. A
   *  new order, or a pool the push does not read yet, costs one full read. Whenever the
   *  orders or pools change, the push opens again for them. Until the node confirms it,
   *  the account's events make the SDK read, as before the first push, and the SDK reads
   *  once at the confirmation, so a change made while it opened is not missed. A push the
   *  node does not confirm within 10 s is dropped and opened again after a backoff.
   *  While the account holds positions and no push arrives, the SDK reads again every
   *  5 s. A node that does not push, such as a local node, leaves the SDK on its own
   *  reads: at once on the account's events, and every 5 s while it holds positions.
   *
   *  A failed read keeps the last data as `stale`, or is `failed` when there is none,
   *  and the SDK tries again after a backoff; a push that keeps failing the same way
   *  gives one view, not one per push. A lost push gives `stale`, and the SDK reads the
   *  account at once and opens the push again after a backoff. A lost event
   *  subscription gives `stale`, and the SDK subscribes again after a backoff and
   *  reads the account then.
   *
   *  Listeners of one account share one session. When the last one stops, the session
   *  lingers for 30 s, so a screen that comes back reuses it. `stopLive()` ends every
   *  session with a `closed` view.
   *
   *  **Gotchas**
   *
   *  - Nothing is folded from the events: each push or read is the whole state. While
   *    the account holds an open position, an unannounced change shows at the next
   *    configured price push or 5 s inactivity read.
   *  - Pool `OrderAmendedInPlace` events are not watched. An amendment that leaves
   *    collateral unchanged can emit no MarginBank account event. With only resting
   *    orders, the view can keep the old order until another account event or a session
   *    restart causes a read. A ready live `getSnapshot` reuses that view without a read.
   *  - Without `addresses.priceFeedScheduler`, marks and PnL follow the 5 s read.
   *  - An account with no open position is read again only on its events.
   *  - A listener that throws is reported through the client's debug channel and does
   *    not stop the view.
   *
   * **Example** (Keeping a screen on an account's positions)
   *
   *  ```ts
   *  const stop = client.accountPositions.subscribe(marginBank, account, (view) => {
   *    if (view.status === "ready" || view.status === "stale") render(view.data.positions, view.status === "stale");
   *  });
   *  // Later, when the screen closes:
   *  stop();
   *  ```
   *
   * @throws {@link InvalidInputError} `marginBank` or `account` is not an address, or `onView` is not a function.
   */
  subscribe(marginBank: string, account: string, onView: (view: AccountPositionsView) => void): () => void;
}

/**
 *  Failures from {@link AccountPositionsClient.subscribe}. Failures after the call arrive
 *  as views, not as errors.
 *
 * @category account views
 */
export type AccountPositionsClientSubscribeError = InvalidInputError;

export interface AccountPositionsDeps {
  readonly chainId: number;
  /** The chain the reads go to. Throws `NotConfiguredError` when the client has none. */
  readonly chain: () => PositionsRead.PositionsChain;
  /**
   *  Subscribes to the MarginBank events naming `account`, and returns the release.
   *  `onLog` gets the log's block, `null` when it names none. `onError` fires at most
   *  once, and `onOpen` once, when the node confirms the subscription; neither during
   *  the call. Throws `NotConfiguredError` without a chain transport.
   */
  readonly watch: (
    marginBank: Address,
    account: Address,
    onLog: (blockNumber: bigint | null) => void,
    onError: () => void,
    onOpen: () => void,
  ) => () => void;
  /** Opens one `somnia_watch` subscription on the engine's socket. Absent: live views only read. */
  readonly watchPushes?: PositionsPush.WatchPushes;
  /** The price feed whose writes push the state: `addresses.priceFeedScheduler`. Absent: pushes come on the account's events only. */
  readonly priceFeed?: Address;
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

/** `client.accountPositions` and the owner's handle on its live views. */
export interface AccountPositionsOwner {
  readonly client: AccountPositionsClient;
  /** Ends every live view with `closed`. */
  stopLive(): void;
}

const OPERATION = "accountPositions.getSnapshot";
const SUBSCRIBE = "accountPositions.subscribe";

/** How many accounts' pool lists are remembered for the next read's first batch. */
const KNOWN_POOLS_MAX = 256;

function addressOf(value: unknown, name: string, operation: string): Address {
  // A JavaScript caller can pass anything, so the type is checked at run time too.
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new InvalidInputError(`${operation} needs ${name} to be an address`);
  }
  return getAddress(value);
}

function keyOf(marginBank: Address, account: Address): string {
  return `${marginBank.toLowerCase()}:${account.toLowerCase()}`;
}

/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;

/**
 *  What a finished snapshot read hands its caller, now that the live view of the same
 *  account may have moved on while it ran: the snapshot, or the live view when that is
 *  ready at a block at least as new. `"readAgain"` when only a stale live view holds the
 *  newer state. A snapshot older than what the live view's listeners already have is
 *  never handed back, because a caller that replaces its value with each result would
 *  go back in time.
 */
function settle(
  snapshot: AccountPositionsSnapshot,
  current: AccountPositionsView | undefined,
): AccountPositionsSnapshot | "readAgain" {
  if (current?.status !== "ready" && current?.status !== "stale") return snapshot;
  if (current.data.blockNumber < snapshot.data.blockNumber) return snapshot;
  if (current.status === "ready") return current;
  return current.data.blockNumber > snapshot.data.blockNumber ? "readAgain" : snapshot;
}

/** Builds `client.accountPositions`. One per engine. */
export function createAccountPositionsWithDeps(deps: AccountPositionsDeps): AccountPositionsOwner {
  const flights = new Registry.SingleFlight<AccountPositionsSnapshot>();
  /** What the newest read of each account found, and its block. */
  const knownStates = new Map<
    string,
    { readonly state: PositionsRead.KnownAccountState; readonly blockNumber: bigint }
  >();
  const nowMs = deps.nowMs ?? Date.now;
  let revision = 0;
  const nextRevision = () => {
    revision += 1;
    return revision;
  };

  const remember = (key: string, result: PositionsRead.AccountPositionsRead) => {
    // A read that started earlier can land later. What it found is older, and must not
    // replace what a newer read found.
    const held = knownStates.get(key);
    if (held !== undefined && result.blockNumber < held.blockNumber) return;
    knownStates.delete(key);
    knownStates.set(key, {
      state: { pools: result.pools, orderIds: result.orderIds },
      blockNumber: result.blockNumber,
    });
    // Oldest first: a Map iterates in insertion order.
    if (knownStates.size > KNOWN_POOLS_MAX) {
      const oldest = knownStates.keys().next();
      if (!oldest.done) knownStates.delete(oldest.value);
    }
  };

  /** A read of one account in one bank, with what a previous read found. */
  const inputOf = (
    marginBank: Address,
    account: Address,
    known: PositionsRead.KnownAccountState | undefined,
  ): PositionsRead.ReadAccountPositionsInput => ({
    account,
    marginBanks: [marginBank],
    ...(known === undefined ? {} : { knownPools: known.pools, knownOrders: known.orderIds }),
  });

  const read = async (marginBank: Address, account: Address, signal: AbortSignal) => {
    const key = keyOf(marginBank, account);
    const result = await PositionsRead.readAccountPositions(
      inputOf(marginBank, account, knownStates.get(key)?.state),
      deps.chain(),
      signal,
    );
    remember(key, result);
    if (signal.aborted) throw signal.reason;
    const snapshot: AccountPositionsSnapshot = deepFreeze({
      status: "ready",
      chainId: deps.chainId,
      marginBank: marginBank.toLowerCase(),
      account: account.toLowerCase(),
      revision: nextRevision(),
      data: {
        positions: [...result.positions],
        orders: result.orders,
        margin: result.margins[0] ?? Raise.unreachable("a read of one bank returns its margin"),
        blockNumber: result.blockNumber,
        observedAtMs: nowMs(),
      },
    });
    return snapshot;
  };

  // One live session per bank and account. The key carries both, lower-cased.
  // `subscribe` names the bank and account its session is built for; `createSession`
  // runs inside that same call, so nothing else can take its place.
  let starting: { readonly marginBank: Address; readonly account: Address } | undefined;
  const watchPushes = deps.watchPushes;
  const live = new Registry.LiveViews<AccountPositionsView>({
    createSession: (key, publish) => {
      const target = starting ?? Raise.unreachable("subscribe names a bank and an account before it starts a session");
      const session = new PositionsSession.PositionsSession({
        chainId: deps.chainId,
        marginBank: target.marginBank,
        account: target.account,
        read: async (known, signal) => {
          const result = await PositionsRead.readAccountPositions(
            inputOf(target.marginBank, target.account, known ?? knownStates.get(key)?.state),
            deps.chain(),
            signal,
          );
          remember(key, result);
          return result;
        },
        watch: (onLog, onError, onOpen) => deps.watch(target.marginBank, target.account, onLog, onError, onOpen),
        ...(watchPushes === undefined
          ? {}
          : {
              push: (pushTarget: PositionsSession.SessionPushTarget, handlers: PositionsPush.PushHandlers) => {
                const multicall = deps.chain().multicall(pushTarget.blockNumber);
                if (multicall === undefined) return undefined;
                return PositionsPush.openPush(
                  {
                    account: target.account,
                    marginBank: target.marginBank,
                    pools: pushTarget.pools,
                    orderIds: pushTarget.orderIds,
                    multicall,
                    priceFeed: pushTarget.withPrice ? deps.priceFeed : undefined,
                  },
                  watchPushes,
                  handlers,
                );
              },
            }),
        publish,
        nextRevision,
        nowMs,
        backoffMs: deps.backoffMs,
        warn: deps.warn,
      });
      return session;
    },
    warn: deps.warn,
    onIdle: () => undefined,
    ...(deps.lingerMs === undefined ? {} : { lingerMs: deps.lingerMs }),
  });

  /** One account's snapshot, never older than what its live view's listeners already have. */
  const snapshotOf = async (
    marginBank: Address,
    account: Address,
    signal: AbortSignal | undefined,
  ): Promise<AccountPositionsSnapshot> => {
    const key = keyOf(marginBank, account);
    for (let attempt = 1; ; attempt += 1) {
      // A live view that is ready was read at its block, and never older than what its listeners have.
      const current = live.current(key);
      if (current?.status === "ready") return current;
      const snapshot = await flights.run(key, undefined, (flight) => read(marginBank, account, flight), signal);
      const settled = settle(snapshot, live.current(key));
      if (settled !== "readAgain") return settled;
      if (attempt === SNAPSHOT_READS) {
        throw new RpcError(OPERATION, "every read answered from an older block than the account's live view");
      }
    }
  };

  const client: AccountPositionsClient = {
    getSnapshot(bankInput, accountInput, options) {
      try {
        const marginBank = addressOf(bankInput, "marginBank", OPERATION);
        const account = addressOf(accountInput, "account", OPERATION);
        if (options?.signal?.aborted) return Promise.reject(options.signal.reason);
        // The owner closed the client: nothing reads for it any more.
        if (deps.ownerSignal?.aborted === true) return Promise.reject(deps.ownerSignal.reason);
        return snapshotOf(marginBank, account, options?.signal);
      } catch (error) {
        return Promise.reject(error);
      }
    },
    subscribe(bankInput, accountInput, onView) {
      const marginBank = addressOf(bankInput, "marginBank", SUBSCRIBE);
      const account = addressOf(accountInput, "account", SUBSCRIBE);
      const value: unknown = onView;
      if (typeof value !== "function") throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
      // The owner closed the client: no live view starts again.
      if (deps.ownerSignal?.aborted === true) {
        const closed: AccountPositionsView = Object.freeze({
          status: "closed",
          chainId: deps.chainId,
          marginBank: marginBank.toLowerCase(),
          account: account.toLowerCase(),
          revision: nextRevision(),
        });
        return live.deliverOnce(closed, onView);
      }
      starting = { marginBank, account };
      try {
        return live.subscribe(keyOf(marginBank, account), onView);
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

/** The pinned-batch chain calls, on the engine's viem client. */
export function chainOf(client: PublicClient): PinnedBatch.PinnedChain {
  return {
    // Uncached: viem reuses a head for up to its cache time, 500 ms on Somnia, and a read
    // pinned there misses the change that asked for it.
    blockNumber: () => client.getBlockNumber({ cacheTime: 0 }),
    multicall: (blockNumber) => {
      if (client.chain === undefined) return undefined;
      try {
        // Throws when the chain declares no Multicall3, or one deployed after this block.
        return getChainContractAddress({ chain: client.chain, contract: "multicall3", blockNumber });
      } catch (error) {
        if (error instanceof ChainDoesNotSupportContract) return undefined;
        throw error;
      }
    },
    aggregate: (multicall, calls, blockNumber) =>
      client.readContract({
        address: multicall,
        abi: multicall3Abi,
        functionName: "aggregate3",
        args: [calls.map(({ target, callData }) => ({ target, allowFailure: true, callData }))],
        blockNumber,
      }),
    call: async (target, callData, blockNumber, from) => {
      const { data } = await client.call({
        to: target,
        data: callData,
        blockNumber,
        ...(from === undefined ? {} : { account: from }),
      });
      // An empty return is `undefined` here; decoding it fails, as an empty return should.
      return data ?? "0x";
    },
    balance: (account, blockNumber) => client.getBalance({ address: account, blockNumber }),
  };
}
