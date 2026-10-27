// One account's live perp positions view in one MarginBank.
//
// The view is the chain read of `positionsRead.ts`. Where the node can push it
// (`positionsPush.ts`), the node runs that read and sends the result:
//
// - when the MarginBank emits an event naming the account (a fill, a deposit, a lock,
//   a liquidation), in the block it changes;
// - on every price write, while the account holds positions, because their marks, PnL
//   and liquidation prices move with the price even when the position does not.
//
// The push opens after the first read, for the pools and orders that read found, and
// opens again whenever a read finds other pools or orders, or the account starts or
// stops holding positions. A push that lists a pool it does not read triggers a full
// read. Until the node confirms a push, the first or one opened again, the account's
// event subscription is open, and the session reads once at the confirmation, because
// a change between the last read and the push opening reached neither. A push the node
// does not confirm within 10 s is released, and opens again after a backoff.
//
// The session also reads the account itself:
//
// - every 5 s while the account holds positions and no push has arrived, so a push
//   that stops without an error costs at most that;
// - at once when the MarginBank emits an event naming the account, while no confirmed
//   push is open: the chain socket's log subscription stands in for it;
// - after a failure, with a backoff, and after a lost subscription or push, because
//   changes may have been missed while it was down. A lost push opens again after a
//   backoff.
//
// A node that refuses the push leaves the session on its own reads for good. Nothing is
// folded from the events: each one only says "the state may have changed". Reads that
// arrive together share one read. A result older than the view's block is dropped, so
// the view never goes back in time, and one from the block the view already shows says
// nothing new.

import { ContractRevertError, NotConfiguredError, RpcError } from "../errors.js";
import type { Address } from "viem";
import { CatchUp } from "./catchUp.js";
import { deepFreeze } from "./freeze.js";
import type { PushEnd, PushHandlers } from "./positionsPush.js";
import type { AccountPositionsRead, KnownAccountState } from "./positionsRead.js";
import type {
  AccountPositionsData,
  AccountPositionsStaleReason,
  AccountPositionsView,
  AccountPositionsViewError,
} from "./positionsTypes.js";

/** How often an account with open positions is read again, for its marks, when no push arrives. */
export const REFRESH_MS = 5_000;

/** How long the node may take to confirm a push. The account's event subscription hears it meanwhile. */
export const PUSH_CONFIRM_MS = 10_000;

const OPERATION = "accountPositions.subscribe";

/** What a session's push reads, and whether price writes trigger it. */
export interface SessionPushTarget {
  /** The pools per bank to read: the last read's. */
  readonly pools: ReadonlyMap<string, readonly Address[]>;
  /** The order ids per pool whose details to read: the last read's. */
  readonly orderIds: ReadonlyMap<string, readonly bigint[]>;
  /** The block of the last read. */
  readonly blockNumber: bigint;
  /** Whether price writes trigger a push too: the account holds positions. */
  readonly withPrice: boolean;
}

interface OpenPush {
  readonly key: string;
  /** Unset while the push is opening. */
  release: (() => void) | undefined;
  /** Set once the node confirms every subscription. Until then the event subscription stays open. */
  confirmed: boolean;
}

/** The pools, orders and trigger a push serves, as one comparable string. */
function pushKeyOf(target: SessionPushTarget): string {
  const banks = [...target.pools.entries()]
    .map(([bank, pools]) => `${bank}:${pools.map((pool) => pool.toLowerCase()).join(",")}`)
    .sort();
  const orders = [...target.orderIds.entries()].map(([pool, ids]) => `${pool}=${ids.join(",")}`).sort();
  return `${target.withPrice ? "price" : "events"}|${banks.join("|")}|${orders.join("|")}`;
}

export interface PositionsSessionDeps {
  readonly chainId: number;
  /** The MarginBank, as it is read. */
  readonly marginBank: Address;
  /** The account, as it is read. */
  readonly account: Address;
  /**
   *  One chain read. `known` is what the last read found: its pools and their order ids.
   *  `signal` aborts when the session closes, and the read then sends no more calls.
   */
  readonly read: (known: KnownAccountState | undefined, signal: AbortSignal) => Promise<AccountPositionsRead>;
  /**
   *  Subscribes to the MarginBank events that name the account, and returns the release.
   *  `onLog` gets the log's block, `null` when it names none. `onError` fires at most
   *  once, when the subscription is lost, and `onOpen` once, when the node confirms it.
   *  None of them fires during the call. Throws `NotConfiguredError` when the client
   *  has no chain transport.
   */
  readonly watch: (onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen: () => void) => () => void;
  /**
   *  Opens the node's push of the account's state for `target`, and returns the
   *  release, or `undefined` when this client cannot push. Absent: the session reads.
   *  Throws `NotConfiguredError` when the client has no chain transport.
   */
  readonly push?: (target: SessionPushTarget, handlers: PushHandlers) => (() => void) | undefined;
  readonly publish: (view: AccountPositionsView) => void;
  readonly nextRevision: () => number;
  readonly nowMs: () => number;
  /** The delay before retry `attempt`, counting from 0. */
  readonly backoffMs: (attempt: number) => number;
  readonly warn: (message: string, data?: Record<string, unknown>) => void;
}

function viewErrorOf(error: unknown): AccountPositionsViewError {
  if (error instanceof ContractRevertError || error instanceof RpcError || error instanceof NotConfiguredError) {
    return error;
  }
  // Not an error this path models. It is kept as the cause, so the view still says why.
  return new RpcError(OPERATION, error instanceof Error ? error.message : String(error), { cause: error });
}

export class PositionsSession {
  readonly #deps: PositionsSessionDeps;
  /** Aborts the read in flight when the session closes. */
  readonly #controller = new AbortController();
  #closed = false;
  #view: AccountPositionsView | undefined;
  #data: AccountPositionsData | undefined;
  #known: KnownAccountState | undefined;
  #reading = false;
  #readAgain = false;
  readonly #catchUp = new CatchUp();
  /** Consecutive failed reads, for the backoff. */
  #failures = 0;
  /** Consecutive lost subscriptions, for the backoff. */
  #watchFailures = 0;
  #unwatch: (() => void) | undefined;
  #refreshTimer: ReturnType<typeof setTimeout> | undefined;
  #watchTimer: ReturnType<typeof setTimeout> | undefined;
  #push: OpenPush | undefined;
  /** Set when the node refuses the push or this client cannot push: the session reads for good. */
  #pushOff = false;
  /** Consecutive lost pushes, for the backoff. */
  #pushFailures = 0;
  /** Set while a lost push waits to open again. */
  #pushTimer: ReturnType<typeof setTimeout> | undefined;
  /** Set while an opened push waits for the node to confirm it. */
  #confirmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(deps: PositionsSessionDeps) {
    this.#deps = deps;
  }

  /** The last view the session published, if any. */
  get view(): AccountPositionsView | undefined {
    return this.#view;
  }

  /** Publishes `loading`, subscribes to the account's events and reads it. */
  start(): void {
    this.#publish({ status: "loading" });
    this.#openWatch();
    this.#refresh();
  }

  /** Stops for good. `publishClosed` sends a last `closed` view. */
  close(publishClosed: boolean): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#controller.abort();
    this.#closeWatch();
    this.#closePush();
    clearTimeout(this.#refreshTimer);
    clearTimeout(this.#pushTimer);
    this.#refreshTimer = undefined;
    this.#pushTimer = undefined;
    if (publishClosed) this.#publish({ status: "closed" });
  }

  // ---------------------------------------------------------------- reading

  #refresh(): void {
    if (this.#closed) return;
    if (this.#reading) {
      // Whatever asked has seen something the read in flight may predate.
      this.#readAgain = true;
      return;
    }
    clearTimeout(this.#refreshTimer);
    this.#refreshTimer = undefined;
    this.#reading = true;
    this.#readAgain = false;
    void this.#deps.read(this.#known, this.#controller.signal).then(
      (result) =>
        this.#settle(() => {
          this.#accept(result);
          this.#chase(result.blockNumber);
        }),
      (error: unknown) => this.#settle(() => this.#fail(error)),
    );
  }

  #settle(apply: () => void): void {
    this.#reading = false;
    if (this.#closed) return;
    apply();
    if (this.#closed) return;
    if (this.#readAgain) this.#refresh();
  }

  #accept(result: AccountPositionsRead): void {
    this.#failures = 0;
    const held = this.#data;
    // A read that started earlier can answer from an older block than the view holds.
    // What it found is older too, so the next read keeps the newer pools and orders.
    if (held !== undefined && result.blockNumber < held.blockNumber) {
      this.#scheduleRefresh(held);
      return;
    }
    this.#known = { pools: result.pools, orderIds: result.orderIds };
    // A read of the block the view already shows finds the same state: a price write
    // and a fill in one block push twice. It can still open a push that is closed.
    if (held !== undefined && result.blockNumber === held.blockNumber && this.#view?.status === "ready") {
      this.#scheduleRefresh(held);
      this.#syncPush(result);
      return;
    }
    const margin = result.margins[0];
    if (margin === undefined) {
      this.#fail(new RpcError(OPERATION, "a read of one MarginBank returned no margin"));
      return;
    }
    const data: AccountPositionsData = deepFreeze({
      positions: [...result.positions],
      orders: result.orders,
      margin,
      blockNumber: result.blockNumber,
      observedAtMs: this.#deps.nowMs(),
    });
    this.#data = data;
    this.#publish({ status: "ready", data });
    this.#scheduleRefresh(data);
    this.#syncPush(result);
  }

  /** Reads again while the view shows an older block than a log asked for. */
  #chase(readBlock: bigint): void {
    const held = this.#data?.blockNumber;
    const shown = held !== undefined && held > readBlock ? held : readBlock;
    if (this.#catchUp.landed(shown)) this.#refresh();
  }

  #fail(caught: unknown): void {
    const error = viewErrorOf(caught);
    // Without a chain transport every read fails the same way, so it is not retried.
    const terminal = error instanceof NotConfiguredError;
    // A push fails on every price write while its read keeps failing; the same failure
    // again is not a new view.
    if (!this.#shows(error)) {
      if (this.#data !== undefined && !terminal) this.#publishStale("refreshFailed", error);
      else this.#publish({ status: "failed", error, retrying: !terminal });
    }
    if (terminal) return;
    const delay = this.#deps.backoffMs(this.#failures);
    this.#failures += 1;
    this.#setRefreshTimer(delay);
  }

  /** Whether the view already reports this failure: an error of the same kind, with the same message. */
  #shows(error: AccountPositionsViewError): boolean {
    const view = this.#view;
    let shown: AccountPositionsViewError | null = null;
    if (view?.status === "failed") shown = view.error;
    else if (view?.status === "stale" && view.reason === "refreshFailed") shown = view.error;
    return shown !== null && shown.constructor === error.constructor && shown.message === error.message;
  }

  #scheduleRefresh(data: AccountPositionsData): void {
    // An account with no position has no mark to follow; its events are enough.
    if (data.positions.length > 0) this.#setRefreshTimer(REFRESH_MS);
  }

  #setRefreshTimer(delayMs: number): void {
    clearTimeout(this.#refreshTimer);
    this.#refreshTimer = setTimeout(() => {
      this.#refreshTimer = undefined;
      this.#refresh();
    }, delayMs);
  }

  // ---------------------------------------------------------------- the event subscription

  #openWatch(): void {
    // While a confirmed push is open, its account trigger stands in for this subscription.
    if (this.#closed || this.#unwatch !== undefined || this.#push?.confirmed === true) return;
    try {
      this.#unwatch = this.#deps.watch(
        (blockNumber) => {
          // An event proves the subscription works.
          this.#watchFailures = 0;
          this.#catchUp.ask(blockNumber);
          this.#refresh();
        },
        () => this.#watchLost(),
        // An event between the last read and this moment reached no subscription.
        () => this.#refresh(),
      );
    } catch (error) {
      // No chain transport: the read reports it; there is nothing to watch.
      this.#deps.warn("the account's position events could not be watched", { error });
    }
  }

  #watchLost(): void {
    if (this.#closed) return;
    this.#unwatch?.();
    this.#unwatch = undefined;
    this.#deps.warn("the account's position event subscription was lost", { account: this.#deps.account });
    if (this.#data !== undefined) this.#publishStale("reconnecting", null);
    const delay = this.#deps.backoffMs(this.#watchFailures);
    this.#watchFailures += 1;
    clearTimeout(this.#watchTimer);
    this.#watchTimer = setTimeout(() => {
      this.#watchTimer = undefined;
      this.#openWatch();
      // Events may have been missed while the subscription was down.
      this.#refresh();
    }, delay);
  }

  #closeWatch(): void {
    this.#unwatch?.();
    this.#unwatch = undefined;
    clearTimeout(this.#watchTimer);
    this.#watchTimer = undefined;
  }

  // ---------------------------------------------------------------- the push

  /** Opens the push for what `read` found, or keeps the one open for it. */
  #syncPush(read: AccountPositionsRead): void {
    const push = this.#deps.push;
    if (push === undefined || this.#closed || this.#pushOff || this.#pushTimer !== undefined) return;
    const target: SessionPushTarget = {
      pools: read.pools,
      orderIds: read.orderIds,
      blockNumber: read.blockNumber,
      withPrice: read.positions.length > 0,
    };
    const key = pushKeyOf(target);
    if (this.#push?.key === key) return;
    this.#closePush();
    const entry: OpenPush = { key, release: undefined, confirmed: false };
    this.#push = entry;
    // The push it replaces heard the account until now; the event subscription does
    // until the node confirms this one.
    this.#openWatch();
    const live = (): boolean => !this.#closed && this.#push === entry;
    let release: (() => void) | undefined;
    try {
      release = push(target, {
        onRead: (pushed) => {
          if (!live()) return;
          this.#pushFailures = 0;
          this.#accept(pushed);
        },
        onNeedsRead: () => {
          // Only a full read lists the new pools or orders; accepting it opens a push for them.
          if (live()) this.#refresh();
        },
        onReadFailed: (error) => {
          if (live()) this.#fail(error);
        },
        onOpen: () => {
          if (!live()) return;
          entry.confirmed = true;
          clearTimeout(this.#confirmTimer);
          this.#confirmTimer = undefined;
          // The push now hears the account's changes; the event subscription stood in until now.
          this.#closeWatch();
          // A change between the last read and the push opening reached neither.
          this.#refresh();
        },
        onEnd: (end) => {
          if (live()) this.#pushEnded(end);
        },
      });
    } catch (error) {
      // No chain socket to push on: reading is all this client can do.
      this.#pushOff = true;
      this.#deps.warn("the account's state could not be pushed; the view reads it instead", { error });
    }
    if (this.#push !== entry) {
      // It ended while it opened, and that already fell back to reading.
      release?.();
      return;
    }
    if (release === undefined) {
      // No push: no Multicall3 at the read's block, or no socket.
      this.#push = undefined;
      this.#pushOff = true;
      this.#openWatch();
      return;
    }
    entry.release = release;
    if (entry.confirmed) return;
    // A node that never answers the subscribe request neither confirms nor ends it.
    this.#confirmTimer = setTimeout(() => {
      this.#confirmTimer = undefined;
      if (live() && !entry.confirmed) this.#pushUnconfirmed();
    }, PUSH_CONFIRM_MS);
  }

  #closePush(): void {
    const entry = this.#push;
    this.#push = undefined;
    clearTimeout(this.#confirmTimer);
    this.#confirmTimer = undefined;
    entry?.release?.();
  }

  /**
   *  The node did not confirm the push in time. The event subscription heard the account
   *  meanwhile, so the view stays as it is, and the push opens again after a backoff.
   */
  #pushUnconfirmed(): void {
    this.#closePush();
    this.#deps.warn("the node did not confirm the account's state push; the view reads it instead for now", {
      account: this.#deps.account,
    });
    const delay = this.#deps.backoffMs(this.#pushFailures);
    this.#pushFailures += 1;
    clearTimeout(this.#pushTimer);
    this.#pushTimer = setTimeout(() => {
      this.#pushTimer = undefined;
      // Accepting the read opens the push again.
      this.#refresh();
    }, delay);
    // The read the confirmation would have made: a change while the subscriptions opened reached neither.
    this.#refresh();
  }

  /** The push ended and released itself. */
  #pushEnded(end: PushEnd): void {
    this.#push = undefined;
    clearTimeout(this.#confirmTimer);
    this.#confirmTimer = undefined;
    // With the event subscription closed, nothing heard the account since the push opened.
    const unheard = this.#unwatch === undefined;
    this.#openWatch();
    if (end === "rejected") {
      this.#pushOff = true;
      this.#deps.warn("the node does not push the account's state; the view reads it instead", {
        account: this.#deps.account,
      });
      if (unheard) this.#refresh();
      return;
    }
    this.#deps.warn("the account's state push was lost", { account: this.#deps.account });
    if (this.#data !== undefined) this.#publishStale("reconnecting", null);
    const delay = this.#deps.backoffMs(this.#pushFailures);
    this.#pushFailures += 1;
    clearTimeout(this.#pushTimer);
    this.#pushTimer = setTimeout(() => {
      this.#pushTimer = undefined;
      // Accepting the read opens the push again.
      this.#refresh();
    }, delay);
    // Changes may have been missed while the push was down. The read brings the view
    // back now; the push waits for its backoff.
    this.#refresh();
  }

  // ---------------------------------------------------------------- views

  #publishStale(reason: AccountPositionsStaleReason, error: AccountPositionsViewError | null): void {
    const data = this.#data;
    if (data === undefined) return;
    this.#publish({ status: "stale", data, reason, error });
  }

  #publish(
    fields:
      | { status: "loading" }
      | { status: "ready"; data: AccountPositionsData }
      | {
          status: "stale";
          data: AccountPositionsData;
          reason: AccountPositionsStaleReason;
          error: AccountPositionsViewError | null;
        }
      | { status: "failed"; error: AccountPositionsViewError; retrying: boolean }
      | { status: "closed" },
  ): void {
    // A closed session has said its last word.
    if (this.#closed && fields.status !== "closed") return;
    const view: AccountPositionsView = Object.freeze({
      chainId: this.#deps.chainId,
      marginBank: this.#deps.marginBank.toLowerCase(),
      account: this.#deps.account.toLowerCase(),
      revision: this.#deps.nextRevision(),
      ...fields,
    });
    this.#view = view;
    this.#deps.publish(view);
  }
}
