// One account's live view: a guarded snapshot, then the account's change stream.
//
// A session reads a guarded snapshot, publishes it, and follows the orders capability's
// three subscriptions from the snapshot's version (`indexer/ACCOUNT-VIEW.md`, "Account
// change stream"). Each batch needs one more HTTP read for its changes before the
// follower can check it, so batches go through a strict queue, and the session reads the
// changes of several queued batches in one request when they fit the proved row limit.
//
// Anything the follower cannot apply in order ends the stream: the session keeps its last
// data as `stale` and reads a new snapshot after a backoff. Every asynchronous step checks
// after its await that its epoch is still current, so a reset while a read is in flight
// never lets an old batch or an old snapshot touch the new view.
//
// This is the SDK's port of `AccountStreamSession` in `indexer/scripts/account-stream-session.ts`,
// with what an app needs on top: views, bounded work, expiry by time, and the
// `unavailable` and `tooLarge` states kept under watch rather than retried blindly.

import { IndexerError, IndexerUnavailableError, NotConfiguredError } from "../errors.js";
import type * as GraphqlWs from "../graphqlWs.js";
import * as Raise from "../raise.js";
import type { ReadyCapability } from "./continuity.js";
import * as Failure from "./failure.js";
import * as Follower from "./follower.js";
import type * as Snapshot from "./guardedSnapshot.js";
import * as Inventory from "./inventory.js";
import * as Outcomes from "./outcomes.js";
import * as Reads from "./reads.js";
import * as Rows from "./rows.js";
import * as Streams from "./streams.js";
import * as Wire from "./wireSchemas.js";
import type {
  AccountOrder,
  AccountOrdersData,
  AccountOrdersStaleReason,
  AccountOrdersTooLarge,
  AccountOrdersView,
  AccountOrdersViewError,
  AccountStop,
  AccountStopLimitPrice,
  AccountStopVenue,
  AccountViewFailureReason,
  AccountViewUnavailableReason,
} from "./types.js";
import type { WireOrderPayload, WireStopPayload } from "./wireSchemas.js";

/** Batch rows per streaming frame. A longer burst arrives over several frames, still in order. */
export const STREAM_BATCH_SIZE = 100;

/** A guard that stays ahead of the stream this long means the stream stopped delivering. */
export const STREAM_STALL_MS = 15_000;

/**
 *  A guard that stays behind the held version this long was a rollback, not a late
 *  frame. Hasura sends a newer guard at its next poll, so 15 s covers several polls.
 */
export const GUARD_BEHIND_MS = 15_000;

/** The longest applied changes wait for more before the view is published. */
export const EMIT_WINDOW_MS = 250;

/** How often a view that is `unavailable` or `tooLarge` is read again anyway. */
export const RECHECK_MS = 5 * 60_000;

/** The shortest gap between two reads that account changes trigger, and the wait of a rebuilding indexer. */
export const RECHECK_THROTTLE_MS = 30_000;

/** How many more times a live view reads a stop's venue or limit price after a failed read. */
export const ENRICH_RETRIES = 3;

/** The longest delay a JavaScript timer keeps, about 24.8 days. */
const MAX_TIMER_MS = 2_147_483_647;

const OPERATION = "accountOrders.subscribe";

/** The subset of a stream connection a session uses. */
export interface StreamConnection {
  subscribe(document: string, variables: Readonly<Record<string, unknown>>, sink: GraphqlWs.GraphqlWsSink): () => void;
}

export interface SessionDeps {
  readonly chainId: number;
  /** The account, lower-cased. */
  readonly account: string;
  /** Reads one guarded snapshot. Rejects when a read does not complete. */
  readonly readSnapshot: (signal: AbortSignal) => Promise<Snapshot.GuardedSnapshotResult>;
  /** Reads the changes of the given batches with per-family limits. */
  readonly readChildren: (
    batchIds: readonly string[],
    limits: { readonly orders: number; readonly stops: number },
    signal: AbortSignal,
  ) => Promise<{ readonly orderChanges: unknown; readonly stopChanges: unknown }>;
  /** The engine's shared stream connection. Rejects with an `IndexerError` when it cannot open. */
  readonly connection: () => Promise<StreamConnection>;
  /** Adds the venue and the limit price to stops. Rejects only when `signal` aborts. */
  readonly enrich: (
    stops: readonly Rows.AccountStopTerms[],
    generation: string,
    signal: AbortSignal,
  ) => Promise<readonly AccountStop[]>;
  /** Hands a view to the session's listeners. */
  readonly publish: (view: AccountOrdersView) => void;
  readonly nextRevision: () => number;
  readonly nowMs: () => number;
  /** The delay before retry `attempt`, counting from 0. */
  readonly backoffMs: (attempt: number) => number;
  readonly warn: (message: string, data?: Record<string, unknown>) => void;
}

interface Enriched {
  readonly venue: AccountStopVenue;
  readonly limitPrice: AccountStopLimitPrice;
}

const PENDING: Enriched = Object.freeze({
  venue: Object.freeze({ status: "pending" }),
  limitPrice: Object.freeze({ status: "pending" }),
});

/** Whether a read of the stop failed, so a later read may give its values. */
function readFailed(stop: Enriched): boolean {
  return (
    (stop.venue.status === "unknown" && stop.venue.reason === "readFailed") ||
    (stop.limitPrice.status === "unknown" && stop.limitPrice.reason === "readFailed")
  );
}

/** The state of one followed stream. A restart replaces it as a whole, never field by field. */
interface Live {
  readonly epoch: number;
  readonly capability: ReadyCapability;
  readonly follower: Follower.AccountStreamFollower;
  readonly inventory: Inventory.AccountInventory;
  processedHeight: bigint;
  latestGuardBlock: bigint | null;
  /** Batch rows waiting for their changes, oldest first. */
  readonly queue: unknown[];
  /** The most batches one change read may cover. Halved when the role refuses a response by size. */
  groupLimit: number;
  draining: boolean;
  /** When the guard first showed a version the stream has not delivered, without progress since. */
  pendingSinceMs: number | undefined;
  /** When the guard first fell below the held version. */
  behindSinceMs: number | undefined;
  /** Whether each watch has sent a frame, which proves the stream works. */
  readonly confirmed: { capability: boolean; guard: boolean };
  /** The venue and limit price of every stop the session has read them for. */
  readonly enriched: Map<string, Enriched>;
  enriching: boolean;
  enrichAgain: boolean;
  /** The failed reads in a row of each stop whose last read failed. */
  readonly enrichFailures: Map<string, number>;
  /** Stops whose failed read waits for the retry timer. */
  readonly enrichWaiting: Set<string>;
  /** Stops whose failed read is due to run again. */
  readonly enrichDue: Set<string>;
  /** Public rows by wire payload, so an unchanged row keeps its object identity. */
  readonly orders: WeakMap<WireOrderPayload, AccountOrder>;
  readonly stops: WeakMap<WireStopPayload, { readonly enriched: Enriched; readonly stop: AccountStop }>;
}

/**
 *  The outcome of one change read: the changes by batch, the group back in the queue
 *  after a size refusal, or a read that ended the stream.
 */
type GroupRead =
  | {
      readonly status: "read";
      readonly byBatch: ReadonlyMap<string, { orderChanges: unknown[]; stopChanges: unknown[] }>;
    }
  | { readonly status: "requeued" }
  | { readonly status: "ended" };

const ENDED: GroupRead = Object.freeze({ status: "ended" });

/** A queued batch, parsed enough to plan its change read. */
interface Planned {
  readonly raw: unknown;
  /** The batch id, or `""` for a row that does not parse; the follower rejects that row. */
  readonly id: string;
  readonly orders: number;
  readonly stops: number;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function batchIdOf(child: unknown): string | undefined {
  return isRecord(child) && typeof child.batch_id === "string" ? child.batch_id : undefined;
}

/** The error a view reports for `error`, keeping an SDK error as it is. */
function viewErrorOf(error: unknown): AccountOrdersViewError {
  if (error instanceof IndexerError || error instanceof NotConfiguredError) return error;
  // Not an error this path models. It is wrapped rather than dropped, so the view still
  // says why it has no data, and the original stays in `cause`.
  return new IndexerError(OPERATION, error instanceof Error ? error.message : String(error), { cause: error });
}

export class AccountSession {
  readonly #deps: SessionDeps;
  #epoch = 0;
  #closed = false;
  /** Consecutive attempts that ended before the stream proved it works, for the backoff. */
  #attempt = 0;
  #controller: AbortController | undefined;
  #subscriptions: (() => void)[] = [];
  readonly #timers = new Map<string, ReturnType<typeof setTimeout>>();
  #view: AccountOrdersView | undefined;
  #lastData: AccountOrdersData | undefined;

  constructor(deps: SessionDeps) {
    this.#deps = deps;
  }

  /** The last view the session published, if any. */
  get view(): AccountOrdersView | undefined {
    return this.#view;
  }

  /** Publishes `loading` and starts the first snapshot. */
  start(): void {
    this.#publish({ status: "loading" });
    this.#schedule("attempt", 0, () => void this.#attemptRun());
  }

  /** Stops for good. `publishClosed` sends a last `closed` view. */
  close(publishClosed: boolean): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#epoch += 1;
    this.#endStream();
    for (const timer of this.#timers.values()) clearTimeout(timer);
    this.#timers.clear();
    if (publishClosed) this.#publish({ status: "closed" });
  }

  // ---------------------------------------------------------------- attempts

  async #attemptRun(): Promise<void> {
    if (this.#closed) return;
    this.#epoch += 1;
    const epoch = this.#epoch;
    this.#endStream();
    const controller = new AbortController();
    this.#controller = controller;
    let result: Snapshot.GuardedSnapshotResult;
    try {
      result = await this.#deps.readSnapshot(controller.signal);
    } catch (error) {
      if (this.#current(epoch)) this.#readFailed(error);
      return;
    }
    if (!this.#current(epoch)) return;
    if (result.status === "source_unavailable") {
      const outcome = Outcomes.unavailableOutcome(result, OPERATION, this.#deps.chainId);
      if (outcome.kind === "error") {
        this.#readFailed(outcome.error);
        return;
      }
      this.#becomeUnavailable(epoch, outcome.reason, outcome.detail);
      return;
    }
    if (result.status === "resource_limit") {
      this.#becomeTooLarge(epoch, result.capability, {
        collection: Outcomes.collectionOf(result.collection),
        capacity: result.capacity,
        earliestExpiryNs: result.earliestExpiryNs,
      });
      return;
    }
    const live: Live = {
      epoch,
      capability: result.capability,
      follower: new Follower.AccountStreamFollower({
        chainId: this.#deps.chainId,
        account: this.#deps.account,
        capability: result.capability,
        version: result.version,
      }),
      inventory: new Inventory.AccountInventory(result),
      processedHeight: result.processedHeight,
      latestGuardBlock: result.version.blockHash === null ? null : BigInt(result.version.blockNumber),
      queue: [],
      groupLimit: STREAM_BATCH_SIZE,
      draining: false,
      pendingSinceMs: undefined,
      behindSinceMs: undefined,
      confirmed: { capability: false, guard: false },
      enriched: new Map(),
      enriching: false,
      enrichAgain: false,
      enrichFailures: new Map(),
      enrichWaiting: new Set(),
      enrichDue: new Set(),
      orders: new WeakMap(),
      stops: new WeakMap(),
    };
    // The first view waits for its stops' venues and limit prices, as `getSnapshot`
    // does. Later changes do not wait: a new stop shows `pending` until its read lands.
    const terms = result.stops.map((row) => Rows.toStopTerms(row.id, row.owner, row));
    let enriched: readonly AccountStop[] = [];
    try {
      enriched = await this.#deps.enrich(terms, result.capability.datasetGeneration, controller.signal);
    } catch (error) {
      if (!this.#current(epoch)) return;
      this.#deps.warn("stop enrichment failed; the stops stay pending", { error });
    }
    if (!this.#current(epoch)) return;
    this.#keepEnriched(live, enriched);
    this.#publishReady(live);
    // A view that could not be built restarted the stream.
    if (!this.#current(epoch)) return;
    this.#enrichPending(live);
    let connection: StreamConnection;
    try {
      connection = await this.#deps.connection();
    } catch (error) {
      if (!this.#current(epoch)) return;
      this.#deps.warn("the account stream connection did not open", { account: this.#deps.account, error });
      this.#restart("reconnecting", null);
      return;
    }
    if (!this.#current(epoch)) return;
    this.#subscribe(live, connection);
  }

  /** A snapshot read failed: keep the last data as `stale`, or report `failed`, then retry. */
  #readFailed(error: unknown): void {
    const viewError = viewErrorOf(error);
    // A missing configuration fails the same way every time, so it is not retried.
    const terminal = viewError instanceof NotConfiguredError;
    if (this.#lastData !== undefined && !terminal) {
      this.#publish({ status: "stale", data: this.#lastData, reason: "refreshFailed", error: viewError });
    } else {
      this.#publish({
        status: "failed",
        reason: Failure.accountViewFailureReason(viewError) ?? Raise.unreachable("a view error always has a code"),
        error: viewError,
        retrying: !terminal,
      });
    }
    if (terminal) return;
    const retryAfterMs =
      viewError instanceof IndexerUnavailableError && viewError.reason === "breaker-open" ? viewError.retryAfterMs : 0;
    this.#retryLater(retryAfterMs);
  }

  /** Ends the stream, keeps the last data as `stale`, and reads a new snapshot after a backoff. */
  #restart(reason: AccountOrdersStaleReason, error: AccountOrdersViewError | null): void {
    if (this.#closed) return;
    this.#epoch += 1;
    this.#endStream();
    if (this.#lastData !== undefined) {
      this.#publish({ status: "stale", data: this.#lastData, reason, error });
    }
    this.#retryLater(0);
  }

  #retryLater(atLeastMs: number): void {
    const delay = Math.max(atLeastMs, this.#deps.backoffMs(this.#attempt));
    this.#attempt += 1;
    this.#schedule("attempt", delay, () => void this.#attemptRun());
  }

  // ---------------------------------------------------------------- unavailable and too large

  #becomeUnavailable(epoch: number, reason: AccountViewUnavailableReason, detail: string | null): void {
    // Data read under a capability that is no longer usable says nothing about the account now.
    this.#lastData = undefined;
    this.#attempt = 0;
    this.#publish({ status: "unavailable", reason, detail });
    // An indexer that is still rebuilding sends no capability change when it is done.
    if (reason === "rebuildInProgress") {
      this.#schedule("attempt", RECHECK_THROTTLE_MS, () => void this.#attemptRun());
      return;
    }
    this.#schedule("attempt", RECHECK_MS, () => void this.#attemptRun());
    void this.#watchOnce(
      epoch,
      Streams.AccountCapabilityWatchSubscription.toString(),
      { capabilityId: `${this.#deps.chainId}:orders` },
      "capability",
      (row, first) => {
        // Hasura sends the current row first. Only a READY row, or any later change, is news.
        const head = Wire.wireCapabilityHeadSchema.safeParse(row);
        return !first || (head.success && head.data.readiness === "READY");
      },
      () => void this.#attemptRun(),
    );
  }

  #becomeTooLarge(
    epoch: number,
    capability: ReadyCapability,
    limit: Pick<AccountOrdersTooLarge, "collection" | "capacity" | "earliestExpiryNs">,
  ): void {
    this.#lastData = undefined;
    this.#attempt = 0;
    this.#endStream();
    this.#publish({ status: "tooLarge", ...limit });
    this.#schedule("attempt", RECHECK_MS, () => void this.#attemptRun());
    // Orders expire by time alone, with no stream event, so the account can fit again
    // without any guard change. Check again when the earliest one expires.
    if (limit.earliestExpiryNs !== null) {
      const delayMs = this.#delayUntilNs(limit.earliestExpiryNs + 1n);
      this.#schedule("expiry", Math.max(delayMs, RECHECK_THROTTLE_MS), () => void this.#attemptRun());
    }
    const checkedAtMs = this.#deps.nowMs();
    void this.#watchOnce(
      epoch,
      Streams.AccountGuardWatchSubscription.toString(),
      { guardId: `${capability.datasetGeneration}:${this.#deps.account}` },
      "guard",
      (_row, first) => !first,
      () => {
        // An account that changes often would otherwise be read in full on every change.
        const waitMs = checkedAtMs + RECHECK_THROTTLE_MS - this.#deps.nowMs();
        this.#schedule("attempt", Math.max(0, waitMs), () => void this.#attemptRun());
      },
    );
  }

  /**
   *  Watches one subscription until `isNews` says a frame changes something, then calls
   *  `onNews` once. A watch that fails leaves the timer already set as the fallback.
   */
  async #watchOnce(
    epoch: number,
    document: string,
    variables: Readonly<Record<string, unknown>>,
    root: string,
    isNews: (row: unknown, first: boolean) => boolean,
    onNews: () => void,
  ): Promise<void> {
    let connection: StreamConnection;
    try {
      connection = await this.#deps.connection();
    } catch {
      return;
    }
    if (!this.#current(epoch)) return;
    let first = true;
    let fired = false;
    const stop = connection.subscribe(document, variables, {
      next: (data, errors) => {
        if (!this.#current(epoch) || fired) return;
        if (errors.length > 0 || data === null || !(root in data)) return;
        const news = isNews(data[root], first);
        first = false;
        if (!news) return;
        fired = true;
        stop();
        onNews();
      },
      error: () => undefined,
      complete: () => undefined,
    });
    this.#subscriptions.push(stop);
  }

  // ---------------------------------------------------------------- the stream

  #subscribe(live: Live, connection: StreamConnection): void {
    const { epoch } = live;
    const generation = live.follower.version.datasetGeneration;
    const sink = (root: string, onRow: (row: unknown) => void): GraphqlWs.GraphqlWsSink => ({
      next: (data, errors) => {
        if (!this.#current(epoch)) return;
        // A frame without its root field is not an answer. Reading it as "no row" would
        // turn a broken frame into a missing capability or an absent guard.
        if (errors.length > 0 || data === null || !(root in data)) {
          this.#restart("reconnecting", null);
          return;
        }
        onRow(data[root]);
      },
      error: (error) => {
        if (!this.#current(epoch)) return;
        this.#deps.warn("the account stream failed", { account: this.#deps.account, error });
        this.#restart("reconnecting", null);
      },
      complete: () => {
        if (this.#current(epoch)) this.#restart("reconnecting", null);
      },
    });
    this.#subscriptions.push(
      connection.subscribe(
        Streams.AccountCapabilityWatchSubscription.toString(),
        { capabilityId: `${this.#deps.chainId}:orders` },
        sink("capability", (row) => {
          if (this.#handle(live, live.follower.onCapability(row))) this.#confirm(live, "capability");
        }),
      ),
      connection.subscribe(
        Streams.AccountGuardWatchSubscription.toString(),
        { guardId: `${generation}:${this.#deps.account}` },
        sink("guard", (row) => this.#onGuard(live, row)),
      ),
      connection.subscribe(
        Streams.AccountChangeBatchStreamSubscription.toString(),
        {
          account: this.#deps.account,
          datasetGeneration: generation,
          afterBlock: live.follower.version.blockNumber,
          batchSize: STREAM_BATCH_SIZE,
        },
        sink("batches", (rows) => this.#onBatches(live, rows)),
      ),
    );
  }

  /** Applies a verdict's consequence. Returns `false` when the verdict ended the stream. */
  #handle(live: Live, verdict: Follower.StreamVerdict): boolean {
    if (
      verdict.status === "reset_required" ||
      verdict.status === "source_unavailable" ||
      verdict.status === "retry_required"
    ) {
      this.#deps.warn("the account stream needs a new snapshot", { account: this.#deps.account, verdict });
      this.#restart("reconnecting", null);
      return false;
    }
    return this.#current(live.epoch);
  }

  /** Both watches sent a frame, so the stream works; later failures start the backoff afresh. */
  #confirm(live: Live, watch: "capability" | "guard"): void {
    live.confirmed[watch] = true;
    if (live.confirmed.capability && live.confirmed.guard) this.#attempt = 0;
  }

  #onGuard(live: Live, row: unknown): void {
    const wasCaughtUp = this.#caughtUp(live);
    const verdict = live.follower.onGuard(row);
    if (!this.#handle(live, verdict)) return;
    this.#confirm(live, "guard");
    if (verdict.status === "pending") live.latestGuardBlock = BigInt(verdict.target.blockNumber);
    this.#track(live, false);
    // A guard frame changes the view's `sync` fields only.
    if (this.#caughtUp(live) !== wasCaughtUp) this.#scheduleEmit(live, "window");
  }

  #onBatches(live: Live, rows: unknown): void {
    if (!Array.isArray(rows)) {
      this.#restart("reconnecting", null);
      return;
    }
    live.queue.push(...rows);
    // More batches than the producer retains cannot be recovered in order anyway.
    if (live.queue.length > live.capability.retentionBatches) {
      this.#restart("fellBehind", null);
      return;
    }
    this.#drain(live).catch((error: unknown) => this.#failedInternally(live, error));
  }

  async #drain(live: Live): Promise<void> {
    if (live.draining) return;
    live.draining = true;
    try {
      while (this.#current(live.epoch) && live.queue.length > 0) {
        const group = this.#takeGroup(live);
        const read = await this.#readGroup(live, group);
        if (!this.#current(live.epoch) || read.status === "ended") return;
        // The group went back to the queue, to be read in smaller groups.
        if (read.status === "requeued") continue;
        let applied = false;
        for (const planned of group) {
          const own = read.byBatch.get(planned.id);
          const verdict = live.follower.onBatch(planned.raw, own?.orderChanges ?? [], own?.stopChanges ?? []);
          if (verdict.status === "applied") {
            live.inventory.apply(verdict);
            const block = BigInt(verdict.version.blockNumber);
            if (block > live.processedHeight) live.processedHeight = block;
            if (live.latestGuardBlock === null || block > live.latestGuardBlock) live.latestGuardBlock = block;
            applied = true;
          } else if (!this.#handle(live, verdict)) {
            return;
          }
        }
        if (!applied) continue;
        this.#track(live, true);
        if (this.#overCapacity(live)) return;
        this.#forgetRemovedStops(live);
        this.#enrichPending(live);
        this.#scheduleEmit(live, live.queue.length > 0 ? "window" : "now");
      }
    } finally {
      live.draining = false;
    }
  }

  /** The next queued batches whose changes fit one read under the proved row limit. */
  #takeGroup(live: Live): Planned[] {
    const group: Planned[] = [];
    let orders = 0;
    let stops = 0;
    const ceiling = live.capability.publicRoleMaxRows;
    while (live.queue.length > 0 && group.length < live.groupLimit) {
      const raw = live.queue[0];
      const parsed = Wire.wireBatchSchema.safeParse(raw);
      if (!parsed.success) {
        // A broken row goes alone. The follower rejects it and the stream restarts.
        if (group.length === 0) {
          live.queue.shift();
          group.push({ raw, id: "", orders: 0, stops: 0 });
        }
        break;
      }
      const batch = parsed.data;
      // Each family limit is the summed count plus one, so an extra child shows.
      const nextOrders = orders + batch.orderChangeCount;
      const nextStops = stops + batch.stopChangeCount;
      if (group.length > 0 && (nextOrders + 1 > ceiling || nextStops + 1 > ceiling)) break;
      live.queue.shift();
      group.push({ raw, id: batch.id, orders: batch.orderChangeCount, stops: batch.stopChangeCount });
      orders = nextOrders;
      stops = nextStops;
    }
    return group;
  }

  /**
   *  Reads the changes of a group and splits them by batch. A group the role refuses by
   *  size goes back to the queue, and the next groups are half as large.
   */
  async #readGroup(live: Live, group: readonly Planned[]): Promise<GroupRead> {
    const byBatch = new Map<string, { orderChanges: unknown[]; stopChanges: unknown[] }>();
    const reads = group.filter((planned) => planned.orders + planned.stops > 0);
    if (reads.length === 0) return { status: "read", byBatch };
    for (const planned of reads) byBatch.set(planned.id, { orderChanges: [], stopChanges: [] });
    const limits = {
      orders: reads.reduce((sum, planned) => sum + planned.orders, 0) + 1,
      stops: reads.reduce((sum, planned) => sum + planned.stops, 0) + 1,
    };
    const signal = this.#controller?.signal ?? Raise.unreachable("a live stream always has its attempt's signal");
    let response: { readonly orderChanges: unknown; readonly stopChanges: unknown };
    try {
      response = await this.#deps.readChildren([...byBatch.keys()], limits, signal);
    } catch (error) {
      if (!this.#current(live.epoch)) return ENDED;
      if (error instanceof IndexerError && Reads.isResponseSizeRefusal(error.message) && group.length > 1) {
        // The row limit held but the byte limit did not. Read fewer batches at a time.
        live.queue.unshift(...group.map((planned) => planned.raw));
        live.groupLimit = Math.max(1, Math.floor(group.length / 2));
        return { status: "requeued" };
      }
      this.#restart("reconnecting", null);
      return ENDED;
    }
    if (!this.#current(live.epoch)) return ENDED;
    const { orderChanges, stopChanges } = response;
    if (!Array.isArray(orderChanges) || !Array.isArray(stopChanges)) {
      this.#restart("reconnecting", null);
      return ENDED;
    }
    for (const [changes, family] of [
      [orderChanges, "orderChanges"],
      [stopChanges, "stopChanges"],
    ] as const) {
      for (const child of changes) {
        const entry = byBatch.get(batchIdOf(child) ?? "");
        // A change for a batch the read did not ask for is not this account's stream.
        if (entry === undefined) {
          this.#deps.warn("a change read returned a change of another batch", { account: this.#deps.account });
          this.#restart("reconnecting", null);
          return ENDED;
        }
        entry[family].push(child);
      }
    }
    return { status: "read", byBatch };
  }

  /**
   *  Arms the timer for the stream's two protocol deadlines: a guard ahead of the stream
   *  with no progress, and a guard behind the held version. An applied batch restarts the
   *  first, so a stream working through a long backlog is slow, not stalled.
   */
  #track(live: Live, progressed: boolean): void {
    const now = this.#deps.nowMs();
    const { follower } = live;
    if (follower.pendingTarget === undefined) live.pendingSinceMs = undefined;
    else live.pendingSinceMs = progressed ? now : (live.pendingSinceMs ?? now);
    live.behindSinceMs = follower.guardBehind ? (live.behindSinceMs ?? now) : undefined;
    const deadlines = [
      live.pendingSinceMs === undefined ? undefined : live.pendingSinceMs + STREAM_STALL_MS,
      live.behindSinceMs === undefined ? undefined : live.behindSinceMs + GUARD_BEHIND_MS,
    ].filter((deadline): deadline is number => deadline !== undefined);
    if (deadlines.length === 0) {
      this.#cancel("watchdog");
      return;
    }
    this.#schedule("watchdog", Math.max(0, Math.min(...deadlines) - now), () => {
      if (!this.#current(live.epoch)) return;
      const at = this.#deps.nowMs();
      const stalled = live.pendingSinceMs !== undefined && at - live.pendingSinceMs >= STREAM_STALL_MS;
      const behind = live.behindSinceMs !== undefined && at - live.behindSinceMs >= GUARD_BEHIND_MS;
      if (stalled || behind) {
        this.#deps.warn(stalled ? "the account stream stalled" : "the account guard stayed behind", {
          account: this.#deps.account,
        });
        this.#restart("reconnecting", null);
        return;
      }
      this.#track(live, false);
    });
  }

  #caughtUp(live: Live): boolean {
    return live.follower.pendingTarget === undefined && !live.follower.guardBehind && live.queue.length === 0;
  }

  /** An account that grew past capacity is `tooLarge`, as a snapshot of it would be. */
  #overCapacity(live: Live): boolean {
    const nowNs = BigInt(this.#deps.nowMs()) * 1_000_000n;
    const size = live.inventory.sizeAt(nowNs);
    const orders = size.orders > live.capability.orderCapacity;
    if (!orders && size.stops <= live.capability.stopCapacity) return false;
    const next = live.inventory.nextExpiryChangeNs(nowNs);
    this.#epoch += 1;
    this.#becomeTooLarge(this.#epoch, live.capability, {
      collection: orders ? "orders" : "stops",
      capacity: orders ? live.capability.orderCapacity : live.capability.stopCapacity,
      earliestExpiryNs: next === null ? null : next - 1n,
    });
    return true;
  }

  // ---------------------------------------------------------------- enrichment

  /**
   *  Reads the venue and limit price of every stop that has none yet, or whose failed
   *  read is due again, one read at a time.
   */
  #enrichPending(live: Live): void {
    if (!this.#current(live.epoch)) return;
    if (live.enriching) {
      live.enrichAgain = true;
      return;
    }
    const nowNs = BigInt(this.#deps.nowMs()) * 1_000_000n;
    const terms = [...live.inventory.liveAt(nowNs).stops]
      .filter(([id]) => !live.enriched.has(id) || live.enrichDue.has(id))
      .map(([id, payload]) => Rows.toStopTerms(id, this.#deps.account, payload));
    live.enrichDue.clear();
    if (terms.length === 0) return;
    const signal = this.#controller?.signal ?? Raise.unreachable("a live stream always has its attempt's signal");
    live.enriching = true;
    void this.#deps
      .enrich(terms, live.capability.datasetGeneration, signal)
      .then(
        (enriched) => {
          if (!this.#current(live.epoch)) return;
          if (this.#keepEnriched(live, enriched)) this.#scheduleEmit(live, "window");
        },
        (error: unknown) => {
          if (this.#current(live.epoch)) this.#deps.warn("stop enrichment failed; the stops stay pending", { error });
        },
      )
      .finally(() => {
        live.enriching = false;
        if (live.enrichAgain && this.#current(live.epoch)) {
          live.enrichAgain = false;
          this.#enrichPending(live);
        }
      });
  }

  /**
   *  Keeps the values a read gave, and says whether it kept any. A stop whose read failed
   *  shows the failure, and is read again after a backoff, at most {@link ENRICH_RETRIES}
   *  times in a row. A stop the account no longer holds is skipped.
   */
  #keepEnriched(live: Live, stops: readonly AccountStop[]): boolean {
    let kept = false;
    let fewestFailures: number | undefined;
    for (const stop of stops) {
      // It left while its read ran.
      if (!live.inventory.hasStop(stop.id)) continue;
      kept = true;
      const enriched: Enriched = { venue: stop.venue, limitPrice: stop.limitPrice };
      live.enriched.set(stop.id, enriched);
      if (!readFailed(enriched)) {
        live.enrichFailures.delete(stop.id);
        continue;
      }
      const failures = (live.enrichFailures.get(stop.id) ?? 0) + 1;
      live.enrichFailures.set(stop.id, failures);
      if (failures > ENRICH_RETRIES) continue;
      live.enrichWaiting.add(stop.id);
      fewestFailures = Math.min(failures, fewestFailures ?? failures);
    }
    // One timer serves every stop. Stops that fail while it waits join its read.
    if (fewestFailures === undefined || this.#timers.has("enrichRetry")) return kept;
    this.#schedule("enrichRetry", this.#deps.backoffMs(fewestFailures - 1), () => {
      if (!this.#current(live.epoch)) return;
      for (const id of live.enrichWaiting) live.enrichDue.add(id);
      live.enrichWaiting.clear();
      this.#enrichPending(live);
    });
    return kept;
  }

  /** Drops what the session keeps about stops the account no longer holds, so a long session does not grow. */
  #forgetRemovedStops(live: Live): void {
    for (const id of live.enriched.keys()) {
      if (live.inventory.hasStop(id)) continue;
      live.enriched.delete(id);
      live.enrichFailures.delete(id);
      live.enrichWaiting.delete(id);
      live.enrichDue.delete(id);
    }
  }

  // ---------------------------------------------------------------- views

  #scheduleEmit(live: Live, when: "now" | "window"): void {
    if (when === "now") {
      this.#publishReady(live);
      return;
    }
    if (this.#timers.has("emit")) return;
    this.#schedule("emit", EMIT_WINDOW_MS, () => {
      if (this.#current(live.epoch)) this.#publishReady(live);
    });
  }

  /**
   *  Something the checks let through could not be applied or shown. The session does
   *  not freeze on it or throw it at the runtime: it keeps the last data as `stale` and
   *  reads a new snapshot, whose rows are checked again.
   */
  #failedInternally(live: Live, error: unknown): void {
    if (!this.#current(live.epoch)) return;
    this.#deps.warn("the account view could not apply a change; reading a new snapshot", {
      account: this.#deps.account,
      error,
    });
    this.#restart("reconnecting", viewErrorOf(error));
  }

  #publishReady(live: Live): void {
    try {
      this.#publishReadyUnchecked(live);
    } catch (error) {
      this.#failedInternally(live, error);
    }
  }

  #publishReadyUnchecked(live: Live): void {
    this.#cancel("emit");
    const nowMs = this.#deps.nowMs();
    const nowNs = BigInt(nowMs) * 1_000_000n;
    const view = live.inventory.liveAt(nowNs);
    const orders = [...view.orders].map(([id, payload]) => this.#order(live, id, payload));
    const stops = [...view.stops].map(([id, payload]) => this.#stop(live, id, payload));
    const data: AccountOrdersData = Object.freeze({
      orders: Rows.byId(orders),
      stops: Rows.byId(stops),
      version: Outcomes.versionOf(live.follower.version),
      sync: Object.freeze({
        caughtUp: this.#caughtUp(live),
        latestGuardBlock: live.latestGuardBlock,
        processedHeight: live.processedHeight,
        chainStopsBlock: null,
      }),
      coverage: Outcomes.coverageOf(live.capability, this.#deps.chainId),
      expiryCutoffNs: nowNs,
      source: Outcomes.sourceOf(live.capability),
      observedAtMs: nowMs,
    });
    this.#lastData = data;
    this.#publish({ status: "ready", data });
    // An order leaves the view when it expires, which no stream event reports.
    const next = live.inventory.nextExpiryChangeNs(nowNs);
    if (next === null) this.#cancel("expiry");
    else {
      this.#schedule("expiry", this.#delayUntilNs(next), () => {
        if (this.#current(live.epoch)) this.#publishReady(live);
      });
    }
  }

  #order(live: Live, id: string, payload: WireOrderPayload): AccountOrder {
    const known = live.orders.get(payload);
    if (known !== undefined) return known;
    const order = Rows.toAccountOrder(id, this.#deps.account, payload);
    live.orders.set(payload, order);
    return order;
  }

  #stop(live: Live, id: string, payload: WireStopPayload): AccountStop {
    const enriched = live.enriched.get(id) ?? PENDING;
    const known = live.stops.get(payload);
    if (known !== undefined && known.enriched === enriched) return known.stop;
    const stop: AccountStop = Object.freeze({ ...Rows.toStopTerms(id, this.#deps.account, payload), ...enriched });
    live.stops.set(payload, { enriched, stop });
    return stop;
  }

  #publish(
    fields:
      | { status: "loading" }
      | { status: "ready"; data: AccountOrdersData }
      | {
          status: "stale";
          data: AccountOrdersData;
          reason: AccountOrdersStaleReason;
          error: AccountOrdersViewError | null;
        }
      | { status: "failed"; reason: AccountViewFailureReason; error: AccountOrdersViewError; retrying: boolean }
      | { status: "unavailable"; reason: AccountViewUnavailableReason; detail: string | null }
      | ({ status: "tooLarge" } & Pick<AccountOrdersTooLarge, "collection" | "capacity" | "earliestExpiryNs">)
      | { status: "closed" },
  ): void {
    // A closed session has said its last word, whatever a late read resolves with.
    if (this.#closed && fields.status !== "closed") return;
    const view: AccountOrdersView = Object.freeze({
      chainId: this.#deps.chainId,
      account: this.#deps.account,
      revision: this.#deps.nextRevision(),
      ...fields,
    });
    this.#view = view;
    this.#deps.publish(view);
  }

  // ---------------------------------------------------------------- plumbing

  #current(epoch: number): boolean {
    return !this.#closed && epoch === this.#epoch;
  }

  /** Stops the stream's subscriptions, reads and timers, and forgets its state. */
  #endStream(): void {
    for (const stop of this.#subscriptions) stop();
    this.#subscriptions = [];
    this.#controller?.abort();
    this.#controller = undefined;
    for (const name of ["emit", "expiry", "watchdog", "attempt", "enrichRetry"]) this.#cancel(name);
  }

  #delayUntilNs(atNs: bigint): number {
    const nowNs = BigInt(this.#deps.nowMs()) * 1_000_000n;
    if (atNs <= nowNs) return 0;
    const ms = (atNs - nowNs + 999_999n) / 1_000_000n;
    return ms > BigInt(MAX_TIMER_MS) ? MAX_TIMER_MS : Number(ms);
  }

  #schedule(name: string, delayMs: number, run: () => void): void {
    this.#cancel(name);
    // A closed session keeps no timer, so nothing of it outlives `close()`.
    if (this.#closed) return;
    this.#timers.set(
      name,
      setTimeout(() => {
        this.#timers.delete(name);
        if (!this.#closed) run();
      }, delayMs),
    );
  }

  #cancel(name: string): void {
    const timer = this.#timers.get(name);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.#timers.delete(name);
  }
}
