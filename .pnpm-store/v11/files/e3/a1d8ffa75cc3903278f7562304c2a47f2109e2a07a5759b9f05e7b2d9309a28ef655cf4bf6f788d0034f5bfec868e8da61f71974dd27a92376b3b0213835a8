// `client.perpAdlQueue`: one side of one perp market's ADL queue, from the chain.
//
// `getSnapshot` reads the side at one block (`adl.ts`), through the engine's own chain
// client. Concurrent calls for the same side share one read (`../accountView/registry.ts`).
// `subscribe` repeats that read when the queue can have changed (`adlSession.ts`), one
// session per side. The shape is the account views' (`../accountView/balancesClient.ts`).

import { getAddress, isAddress, type Address, type PublicClient } from "viem";
import { InvalidInputError, RpcError } from "../errors.js";
import type { ContractRevertError, NotConfiguredError } from "../errors.js";
import * as Freeze from "../accountView/freeze.js";
import * as Registry from "../accountView/registry.js";
import * as Raise from "../raise.js";
import * as Adl from "./adl.js";
import * as AdlSession from "./adlSession.js";
import type { PerpSideHoldersRef } from "./margin.js";
import type { PerpAdlQueueSnapshot, PerpAdlQueueView } from "./adlView.js";

/**
 *  Options for {@link PerpAdlQueueClient.getSnapshot}.
 *
 * @category perpetual markets
 */
export interface PerpAdlQueueGetSnapshotOptions {
  /** Stops waiting for the read. The caller's abort reason is rethrown unchanged. */
  readonly signal?: AbortSignal;
}

/**
 *  Failures from {@link PerpAdlQueueClient.getSnapshot}. A side that no ADL would rank
 *  is a `regime`, not a failure of the call.
 *
 * @category perpetual markets
 */
export type PerpAdlQueueClientGetSnapshotError =
  | InvalidInputError
  | NotConfiguredError
  | RpcError
  | ContractRevertError;

/**
 *  Failures from {@link PerpAdlQueueClient.subscribe}. Failures after the call arrive
 *  as views, not as errors.
 *
 * @category perpetual markets
 */
export type PerpAdlQueueClientSubscribeError = InvalidInputError;

/**
 *  One side of one perp market's auto-deleveraging (ADL) queue on the engine's chain,
 *  read from the chain: every holder on the side, which of them an ADL would close, and
 *  in what order.
 *
 *  Reach it as `client.perpAdlQueue`; the chain is the engine's own. On an exchange,
 *  use `exchange.engineFor(chainId).perpAdlQueue`.
 *
 * @category perpetual markets
 */
export interface PerpAdlQueueClient {
  /**
   *  Reads one side of one perp market's ADL queue, at one block.
   *
   *  **Details**
   *
   *  - `ref`: The market's MarginBank and pool, and the side: `isLong: true` for the
   *    long holders. Addresses in any letter case.
   *  - `options`: `signal` stops waiting. Once every caller of the read has stopped, it
   *    sends no more calls. The caller's abort reason is rethrown unchanged.
   *  - Returns: A `ready` view. Narrow `data.queue` on `regime`: only `ranked` lists the
   *    holders, each with its `eligibility` and, for a `candidate`, its 1-based
   *    `adlRank`. See {@link PerpAdlQueue}.
   *
   *  It follows the LiquidationEngine's rules at that block, without changing anything:
   *  the bank's wiring, the engine's ranker and scan cap, the market's status, every
   *  holder's state, and the armed ranker's own `rank()` over the holders the engine
   *  would consider. A ranker that reverts, or answers with something that is not an
   *  order of the candidates, gives the holder-list order the engine falls back to, and
   *  `orderSource` says so. Concurrent calls for the same side share one read. While a
   *  live view of the side is `ready`, including the 30 s a session stays after its
   *  last listener stops, the call returns that view and reads nothing; the view is
   *  read again at least every 30 s. A read that finishes after a live view of the side
   *  has moved past it hands back that view instead, or reads once more, so the call
   *  never returns an older block than the view's listeners already have.
   *
   *  **Gotchas**
   *
   *  - It ranks a new ADL against an unnamed bankrupt account. A running ADL session
   *    continues from its own cursor and prices, one liquidation shares its scan budget
   *    across the bankrupt account's markets, and a link-aware ranker nets linked
   *    wallets, so the real order can differ.
   *  - It follows the engine's claw-back arm, the one it takes when the bankrupt
   *    account's realized balance is negative: a holder must be in profit at the mark
   *    and have equity left. When that balance is not negative (the burn arm), the
   *    engine only requires that the position is not at a loss at the bankruptcy price,
   *    and does not check equity. A `noEquity` holder that is not at a loss there is then
   *    a candidate, and the ranker puts it first; a `candidate` at a loss there drops out.
   *  - `storageOrder` gives no per-holder order: the engine's walk depends on the size
   *    the bankrupt account needs closed.
   *  - A side with more than {@link PERP_ADL_QUEUE_MAX_HOLDERS} holders that would be
   *    ranked is `tooManyHolders`, never a rank over part of the side.
   *
   * **Example** (A trader's place in the queue)
   *
   *  ```ts
   *  const snapshot = await client.perpAdlQueue.getSnapshot({ marginBank, pool, isLong: true });
   *  const { queue } = snapshot.data;
   *  if (queue.regime === "ranked") {
   *    const mine = queue.holders.find((holder) => holder.account.toLowerCase() === account.toLowerCase());
   *    const total = queue.holders.filter((holder) => holder.eligibility === "candidate").length;
   *    if (mine?.eligibility === "candidate") console.log(`${mine.adlRank} of ${total}`);
   *  }
   *  ```
   *
   * @throws {@link InvalidInputError} `ref` does not name a MarginBank address, a pool address and an `isLong` boolean.
   * @throws {@link NotConfiguredError} The client has no chain transport.
   * @throws {@link RpcError} A read did not complete, the holder pages do not describe one side at one block, or every read answered from an older block than the live view.
   * @throws {@link ContractRevertError} The bank, the engine or the pool reverted. A ranker revert is not a failure: `orderSource` reports it.
   */
  getSnapshot(ref: PerpSideHoldersRef, options?: PerpAdlQueueGetSnapshotOptions): Promise<PerpAdlQueueSnapshot>;

  /**
   *  Follows one side of one perp market's ADL queue as it changes.
   *
   *  **Details**
   *
   *  - `ref`: The market's MarginBank and pool, and the side. Addresses in any letter case.
   *  - `onView`: Receives every state of the view, each one complete: see
   *    {@link PerpAdlQueueView}. Views arrive in order, a microtask after the SDK
   *    produces them, and never during this call. Listeners share each view, so it is
   *    frozen all the way down; an `error` in it is not.
   *  - Returns: The function that stops this listener. Calling it twice does nothing.
   *
   *  The view starts `loading`, then goes `ready` with the first read. The SDK reads the
   *  side again at once when the MarginBank reports a change that can move the queue,
   *  which the chain socket pushes: any trader's fill, close, liquidation, takeover,
   *  forced settlement, ADL or funding settlement on this market, and any account's
   *  deposit, withdrawal, credit, linked funding or close-out payment. Your own trade and your own deposit
   *  are among them, so the view follows them without any call from you. The SDK also
   *  reads again every 30 s, so a subscription that stops without an error costs at
   *  most that. Each read is the same one-block read as
   *  {@link PerpAdlQueueClient.getSnapshot}, and a view is never older than the one
   *  before it.
   *
   *  A failed read keeps the last data as `stale`, or is `failed` when there is none,
   *  and the SDK tries again after a backoff; events that arrive meanwhile wait for it.
   *  A lost event subscription gives `stale`, and the SDK subscribes again after a
   *  backoff and reads the side. The view stays `stale` until the node confirms the
   *  new subscription.
   *
   *  Listeners of the same side share one session. When the last one stops, the
   *  session lingers for 30 s, so a screen that comes back reuses it. `stopLive()` ends
   *  every session with a `closed` view.
   *
   *  **Gotchas**
   *
   *  - Events only trigger a read; nothing is folded from them. A change with no
   *    followed event shows at the next read: the next followed event, or within 30 s.
   *    That covers a price move, a holder's equity moving on another market, the
   *    engine's settings, and order placement and cancellation. Each order locks or
   *    releases its margin, which moves the trader's equity and so its place, but the
   *    bank emits them several times a second, so they are not followed.
   *  - A listener that throws is reported through the client's debug channel and does
   *    not stop the view.
   *
   * **Example** (Keeping a position's ADL place on screen)
   *
   *  ```ts
   *  const stop = client.perpAdlQueue.subscribe({ marginBank, pool, isLong: true }, (view) => {
   *    if (view.status === "ready" || view.status === "stale") render(view.data.queue, view.status === "stale");
   *  });
   *  // Later, when the screen closes:
   *  stop();
   *  ```
   *
   * @throws {@link InvalidInputError} `ref` does not name a MarginBank address, a pool address and an `isLong` boolean, or `onView` is not a function.
   */
  subscribe(ref: PerpSideHoldersRef, onView: (view: PerpAdlQueueView) => void): () => void;
}

export interface PerpAdlQueueDeps {
  readonly chainId: number;
  /** The chain client the reads go to. Throws `NotConfiguredError` when the client has none. */
  readonly client: () => PublicClient;
  /**
   *  Subscribes to the MarginBank events that can move `pool`'s queue
   *  (`subscribeAdlQueueLogs`), and returns the release.
   *  `onLog` gets the log's block, `null` when it names none. `onError` fires at most
   *  once, and `onOpen` once, when the node confirms the subscription; neither during
   *  the call. Throws `NotConfiguredError` without a chain transport.
   */
  readonly watch: (
    marginBank: Address,
    pool: Address,
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

/** `client.perpAdlQueue` and the owner's handle on its live views. */
export interface PerpAdlQueueOwner {
  readonly client: PerpAdlQueueClient;
  /** Ends every live view with `closed`. */
  stopLive(): void;
}

const OPERATION = "perpAdlQueue.getSnapshot";
const SUBSCRIBE = "perpAdlQueue.subscribe";

interface Request {
  readonly ref: PerpSideHoldersRef;
  /** The side as the views name it: addresses lower-case. */
  readonly marginBank: string;
  readonly pool: string;
  readonly isLong: boolean;
  readonly key: string;
}

/** Checks a side and names it. Throws `InvalidInputError`. The `?.` and the type checks guard untyped callers. */
export function requestOf(ref: unknown, operation: string): Request {
  const marginBank: unknown = typeof ref === "object" && ref !== null ? Reflect.get(ref, "marginBank") : undefined;
  const pool: unknown = typeof ref === "object" && ref !== null ? Reflect.get(ref, "pool") : undefined;
  const isLong: unknown = typeof ref === "object" && ref !== null ? Reflect.get(ref, "isLong") : undefined;
  if (
    typeof marginBank !== "string" ||
    !isAddress(marginBank, { strict: false }) ||
    typeof pool !== "string" ||
    !isAddress(pool, { strict: false }) ||
    typeof isLong !== "boolean"
  ) {
    throw new InvalidInputError(`${operation} needs a marginBank address, a pool address and an isLong boolean`);
  }
  const checked: PerpSideHoldersRef = { marginBank: getAddress(marginBank), pool: getAddress(pool), isLong };
  const lowerBank = marginBank.toLowerCase();
  const lowerPool = pool.toLowerCase();
  return {
    ref: checked,
    marginBank: lowerBank,
    pool: lowerPool,
    isLong,
    key: `${lowerBank}:${lowerPool}:${isLong ? "long" : "short"}`,
  };
}

/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;

/**
 *  What a finished snapshot read hands its caller, now that the live view of the same
 *  side may have moved on while it ran: the snapshot, or the live view when that is
 *  ready at a block at least as new. `"readAgain"` when only a stale live view holds
 *  the newer state. A snapshot older than what the live view's listeners already have
 *  is never handed back, because a caller that replaces its value with each result
 *  would go back in time.
 */
function settle(
  snapshot: PerpAdlQueueSnapshot,
  current: PerpAdlQueueView | undefined,
): PerpAdlQueueSnapshot | "readAgain" {
  if (current?.status !== "ready" && current?.status !== "stale") return snapshot;
  if (current.data.blockNumber < snapshot.data.blockNumber) return snapshot;
  if (current.status === "ready") return current;
  return current.data.blockNumber > snapshot.data.blockNumber ? "readAgain" : snapshot;
}

/** Builds `client.perpAdlQueue`. One per engine. */
export function createPerpAdlQueueWithDeps(deps: PerpAdlQueueDeps): PerpAdlQueueOwner {
  const flights = new Registry.SingleFlight<PerpAdlQueueSnapshot>();
  const nowMs = deps.nowMs ?? Date.now;
  let revision = 0;
  /**
   *  The next view's revision. Snapshots and live views share this counter, so a later
   *  view has a higher revision.
   */
  const nextRevision = () => {
    revision += 1;
    return revision;
  };

  /** One read of the side, as a frozen `ready` snapshot. */
  const read = async (request: Request, signal: AbortSignal): Promise<PerpAdlQueueSnapshot> => {
    const result = await Adl.readPerpAdlQueue(request.ref, {}, deps.client(), signal);
    if (signal.aborted) throw signal.reason;
    const snapshot: PerpAdlQueueSnapshot = Freeze.deepFreeze({
      status: "ready",
      chainId: deps.chainId,
      marginBank: request.marginBank,
      pool: request.pool,
      isLong: request.isLong,
      revision: nextRevision(),
      data: {
        queue: result.queue,
        blockNumber: result.blockNumber,
        observedAtMs: nowMs(),
      },
    });
    return snapshot;
  };

  // `subscribe` names the request its session is built for; `createSession` runs inside
  // that same call, so nothing else can take its place.
  let starting: Request | undefined;
  const live = new Registry.LiveViews<PerpAdlQueueView>({
    createSession: (_key, publish) => {
      const request = starting ?? Raise.unreachable("subscribe names a side before it starts a session");
      return new AdlSession.AdlSession({
        chainId: deps.chainId,
        marginBank: request.marginBank,
        pool: request.pool,
        isLong: request.isLong,
        // Async, so a chain that throws (no transport) rejects the read rather than the caller.
        read: async (signal) => Adl.readPerpAdlQueue(request.ref, {}, deps.client(), signal),
        watch: (onLog, onError, onOpen) => deps.watch(request.ref.marginBank, request.ref.pool, onLog, onError, onOpen),
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

  /** One side's snapshot, never older than what its live view's listeners already have. */
  const snapshotOf = async (request: Request, signal: AbortSignal | undefined): Promise<PerpAdlQueueSnapshot> => {
    for (let attempt = 1; ; attempt += 1) {
      // A live view that is ready was read at its block, and never older than what its listeners have.
      const current = live.current(request.key);
      if (current?.status === "ready") return current;
      const snapshot = await flights.run(request.key, undefined, (flight) => read(request, flight), signal);
      const settled = settle(snapshot, live.current(request.key));
      if (settled !== "readAgain") return settled;
      if (attempt === SNAPSHOT_READS) {
        throw new RpcError(OPERATION, "every read answered from an older block than the ADL queue's live view");
      }
    }
  };

  const client: PerpAdlQueueClient = {
    /** See {@link PerpAdlQueueClient.getSnapshot}. Every failure rejects; nothing throws. */
    getSnapshot(ref, options) {
      try {
        const request = requestOf(ref, OPERATION);
        if (options?.signal?.aborted) return Promise.reject(options.signal.reason);
        // The owner closed the client: nothing reads for it any more.
        if (deps.ownerSignal?.aborted === true) return Promise.reject(deps.ownerSignal.reason);
        return snapshotOf(request, options?.signal);
      } catch (error) {
        return Promise.reject(error);
      }
    },
    /** See {@link PerpAdlQueueClient.subscribe}. Bad input throws at once. */
    subscribe(ref, onView) {
      const request = requestOf(ref, SUBSCRIBE);
      const value: unknown = onView;
      if (typeof value !== "function") throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
      // The owner closed the client: no live view starts again.
      if (deps.ownerSignal?.aborted === true) {
        const closed: PerpAdlQueueView = Freeze.deepFreeze({
          status: "closed",
          chainId: deps.chainId,
          marginBank: request.marginBank,
          pool: request.pool,
          isLong: request.isLong,
          revision: nextRevision(),
        });
        return live.deliverOnce(closed, onView);
      }
      starting = request;
      try {
        return live.subscribe(request.key, onView);
      } finally {
        starting = undefined;
      }
    },
  };
  /** Ends every live view with `closed`. */
  const stopLive = () => live.closeAll();
  // The owner's close ends live views too, so no session reads for a closed client.
  deps.ownerSignal?.addEventListener("abort", stopLive, { once: true });
  return { client, stopLive };
}
