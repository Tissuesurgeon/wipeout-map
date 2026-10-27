// Several accounts' live wallet balances.
//
// The view is the chain read of `balancesRead.ts`, repeated when it can have changed:
//
// - at once, when one of the tokens emits a `Transfer` from or to one of the accounts,
//   which the chain socket pushes;
// - every 10 s, because a native balance changes with no event at all (a payment, the
//   gas of a transaction), and so can a token that moves balances without `Transfer`;
// - after a failure, with a backoff, and after the transfer subscription is re-opened,
//   because transfers may have been missed while it was down.
//
// Nothing is folded from the events: each one only says "read again", so a missed or
// reordered event can cost at most one refresh interval, never a wrong balance. Reads
// that arrive together share one read, and a result older than the view's block is
// dropped, so the view never goes back in time. A result of the block a ready view shows
// is dropped too, unless the view holds a balance it could not read.

import { ContractRevertError, NotConfiguredError, RpcError } from "../errors.js";
import type { Address } from "viem";
import { CatchUp } from "./catchUp.js";
import type { AccountBalancesRead } from "./balancesRead.js";
import { deepFreeze } from "./freeze.js";
import type {
  AccountBalancesData,
  AccountBalancesStaleReason,
  AccountBalancesView,
  AccountBalancesViewError,
} from "./balancesTypes.js";

/** How often the balances are read again with no event. */
export const REFRESH_MS = 10_000;

const OPERATION = "accountBalances.subscribe";

export interface BalancesSessionDeps {
  readonly chainId: number;
  /** The accounts, as they are read. */
  readonly accounts: readonly Address[];
  /** The tokens, lower-case or `"native"`, as the views name them. */
  readonly tokens: readonly string[];
  /** One chain read of every balance. `signal` aborts when the session closes, and the read then sends no more calls. */
  readonly read: (signal: AbortSignal) => Promise<AccountBalancesRead>;
  /**
   *  Subscribes to the transfers that move the balances, and returns the release.
   *  `onLog` gets the log's block, `null` when it names none. `onError` fires at most
   *  once, when the subscription is lost, and `onOpen` once, when the node confirms it.
   *  None of them fires during the call. Throws `NotConfiguredError` when the client
   *  has no chain transport.
   */
  readonly watch: (onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen: () => void) => () => void;
  readonly publish: (view: AccountBalancesView) => void;
  readonly nextRevision: () => number;
  readonly nowMs: () => number;
  /** The delay before retry `attempt`, counting from 0. */
  readonly backoffMs: (attempt: number) => number;
  readonly warn: (message: string, data?: Record<string, unknown>) => void;
}

function viewErrorOf(error: unknown): AccountBalancesViewError {
  if (error instanceof ContractRevertError || error instanceof RpcError || error instanceof NotConfiguredError) {
    return error;
  }
  // Not an error this path models. It is kept as the cause, so the view still says why.
  return new RpcError(OPERATION, error instanceof Error ? error.message : String(error), { cause: error });
}

export class BalancesSession {
  readonly #deps: BalancesSessionDeps;
  /** Aborts the read in flight when the session closes. */
  readonly #controller = new AbortController();
  readonly #accounts: readonly string[];
  readonly #tokens: readonly string[];
  #closed = false;
  #view: AccountBalancesView | undefined;
  #data: AccountBalancesData | undefined;
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

  constructor(deps: BalancesSessionDeps) {
    this.#deps = deps;
    this.#accounts = Object.freeze(deps.accounts.map((account) => account.toLowerCase()));
    this.#tokens = Object.freeze([...deps.tokens]);
  }

  /** The last view the session published, if any. */
  get view(): AccountBalancesView | undefined {
    return this.#view;
  }

  /** Publishes `loading`, subscribes to the transfers and reads the balances. */
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
    this.#unwatch?.();
    this.#unwatch = undefined;
    clearTimeout(this.#refreshTimer);
    clearTimeout(this.#watchTimer);
    this.#refreshTimer = undefined;
    this.#watchTimer = undefined;
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
    void this.#deps.read(this.#controller.signal).then(
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

  #accept(result: AccountBalancesRead): void {
    this.#failures = 0;
    const held = this.#data;
    // A read that started earlier can answer from an older block than the view holds.
    if (held !== undefined && result.blockNumber < held.blockNumber) {
      this.#setRefreshTimer(REFRESH_MS);
      return;
    }
    // A read of the block a ready view already shows finds the same balances: two
    // transfers in one block ask twice. Unless the view holds one it could not read.
    if (
      held !== undefined &&
      result.blockNumber === held.blockNumber &&
      this.#view?.status === "ready" &&
      held.balances.every((entry) => entry.balance.status === "known")
    ) {
      this.#setRefreshTimer(REFRESH_MS);
      return;
    }
    const data: AccountBalancesData = deepFreeze({
      balances: [...result.balances],
      blockNumber: result.blockNumber,
      observedAtMs: this.#deps.nowMs(),
    });
    this.#data = data;
    this.#publish({ status: "ready", data });
    this.#setRefreshTimer(REFRESH_MS);
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
    if (this.#data !== undefined && !terminal) {
      this.#publishStale("refreshFailed", error);
    } else {
      this.#publish({ status: "failed", error, retrying: !terminal });
    }
    if (terminal) return;
    const delay = this.#deps.backoffMs(this.#failures);
    this.#failures += 1;
    this.#setRefreshTimer(delay);
  }

  #setRefreshTimer(delayMs: number): void {
    clearTimeout(this.#refreshTimer);
    this.#refreshTimer = setTimeout(() => {
      this.#refreshTimer = undefined;
      this.#refresh();
    }, delayMs);
  }

  // ---------------------------------------------------------------- the transfer subscription

  #openWatch(): void {
    if (this.#closed) return;
    try {
      this.#unwatch = this.#deps.watch(
        (blockNumber) => {
          // An event proves the subscription works.
          this.#watchFailures = 0;
          this.#catchUp.ask(blockNumber);
          this.#refresh();
        },
        () => this.#watchLost(),
        // A transfer between the last read and this moment reached no subscription.
        () => this.#refresh(),
      );
    } catch (error) {
      // No chain transport: the read reports it; there is nothing to watch.
      this.#deps.warn("the balances' transfers could not be watched", { error });
    }
  }

  #watchLost(): void {
    if (this.#closed) return;
    this.#unwatch?.();
    this.#unwatch = undefined;
    this.#deps.warn("the balances' transfer subscription was lost", { accounts: this.#accounts });
    if (this.#data !== undefined) this.#publishStale("reconnecting", null);
    const delay = this.#deps.backoffMs(this.#watchFailures);
    this.#watchFailures += 1;
    clearTimeout(this.#watchTimer);
    this.#watchTimer = setTimeout(() => {
      this.#watchTimer = undefined;
      this.#openWatch();
      // Transfers may have been missed while the subscription was down.
      this.#refresh();
    }, delay);
  }

  // ---------------------------------------------------------------- views

  #publishStale(reason: AccountBalancesStaleReason, error: AccountBalancesViewError | null): void {
    const data = this.#data;
    if (data === undefined) return;
    this.#publish({ status: "stale", data, reason, error });
  }

  #publish(
    fields:
      | { status: "loading" }
      | { status: "ready"; data: AccountBalancesData }
      | {
          status: "stale";
          data: AccountBalancesData;
          reason: AccountBalancesStaleReason;
          error: AccountBalancesViewError | null;
        }
      | { status: "failed"; error: AccountBalancesViewError; retrying: boolean }
      | { status: "closed" },
  ): void {
    // A closed session has said its last word.
    if (this.#closed && fields.status !== "closed") return;
    const view: AccountBalancesView = Object.freeze({
      chainId: this.#deps.chainId,
      accounts: this.#accounts,
      tokens: this.#tokens,
      revision: this.#deps.nextRevision(),
      ...fields,
    });
    this.#view = view;
    this.#deps.publish(view);
  }
}
