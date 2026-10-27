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
import * as Raise from "../raise.js";
import * as Failure from "./failure.js";
import * as Follower from "./follower.js";
import * as Inventory from "./inventory.js";
import * as Outcomes from "./outcomes.js";
import * as Reads from "./reads.js";
import * as Rows from "./rows.js";
import * as Streams from "./streams.js";
import * as Wire from "./wireSchemas.js";
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
const PENDING = Object.freeze({
    venue: Object.freeze({ status: "pending" }),
    limitPrice: Object.freeze({ status: "pending" }),
});
/** Whether a read of the stop failed, so a later read may give its values. */
function readFailed(stop) {
    return ((stop.venue.status === "unknown" && stop.venue.reason === "readFailed") ||
        (stop.limitPrice.status === "unknown" && stop.limitPrice.reason === "readFailed"));
}
const ENDED = Object.freeze({ status: "ended" });
function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function batchIdOf(child) {
    return isRecord(child) && typeof child.batch_id === "string" ? child.batch_id : undefined;
}
/** The error a view reports for `error`, keeping an SDK error as it is. */
function viewErrorOf(error) {
    if (error instanceof IndexerError || error instanceof NotConfiguredError)
        return error;
    // Not an error this path models. It is wrapped rather than dropped, so the view still
    // says why it has no data, and the original stays in `cause`.
    return new IndexerError(OPERATION, error instanceof Error ? error.message : String(error), { cause: error });
}
export class AccountSession {
    #deps;
    #epoch = 0;
    #closed = false;
    /** Consecutive attempts that ended before the stream proved it works, for the backoff. */
    #attempt = 0;
    #controller;
    #subscriptions = [];
    #timers = new Map();
    #view;
    #lastData;
    constructor(deps) {
        this.#deps = deps;
    }
    /** The last view the session published, if any. */
    get view() {
        return this.#view;
    }
    /** Publishes `loading` and starts the first snapshot. */
    start() {
        this.#publish({ status: "loading" });
        this.#schedule("attempt", 0, () => void this.#attemptRun());
    }
    /** Stops for good. `publishClosed` sends a last `closed` view. */
    close(publishClosed) {
        if (this.#closed)
            return;
        this.#closed = true;
        this.#epoch += 1;
        this.#endStream();
        for (const timer of this.#timers.values())
            clearTimeout(timer);
        this.#timers.clear();
        if (publishClosed)
            this.#publish({ status: "closed" });
    }
    // ---------------------------------------------------------------- attempts
    async #attemptRun() {
        if (this.#closed)
            return;
        this.#epoch += 1;
        const epoch = this.#epoch;
        this.#endStream();
        const controller = new AbortController();
        this.#controller = controller;
        let result;
        try {
            result = await this.#deps.readSnapshot(controller.signal);
        }
        catch (error) {
            if (this.#current(epoch))
                this.#readFailed(error);
            return;
        }
        if (!this.#current(epoch))
            return;
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
        const live = {
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
        let enriched = [];
        try {
            enriched = await this.#deps.enrich(terms, result.capability.datasetGeneration, controller.signal);
        }
        catch (error) {
            if (!this.#current(epoch))
                return;
            this.#deps.warn("stop enrichment failed; the stops stay pending", { error });
        }
        if (!this.#current(epoch))
            return;
        this.#keepEnriched(live, enriched);
        this.#publishReady(live);
        // A view that could not be built restarted the stream.
        if (!this.#current(epoch))
            return;
        this.#enrichPending(live);
        let connection;
        try {
            connection = await this.#deps.connection();
        }
        catch (error) {
            if (!this.#current(epoch))
                return;
            this.#deps.warn("the account stream connection did not open", { account: this.#deps.account, error });
            this.#restart("reconnecting", null);
            return;
        }
        if (!this.#current(epoch))
            return;
        this.#subscribe(live, connection);
    }
    /** A snapshot read failed: keep the last data as `stale`, or report `failed`, then retry. */
    #readFailed(error) {
        const viewError = viewErrorOf(error);
        // A missing configuration fails the same way every time, so it is not retried.
        const terminal = viewError instanceof NotConfiguredError;
        if (this.#lastData !== undefined && !terminal) {
            this.#publish({ status: "stale", data: this.#lastData, reason: "refreshFailed", error: viewError });
        }
        else {
            this.#publish({
                status: "failed",
                reason: Failure.accountViewFailureReason(viewError) ?? Raise.unreachable("a view error always has a code"),
                error: viewError,
                retrying: !terminal,
            });
        }
        if (terminal)
            return;
        const retryAfterMs = viewError instanceof IndexerUnavailableError && viewError.reason === "breaker-open" ? viewError.retryAfterMs : 0;
        this.#retryLater(retryAfterMs);
    }
    /** Ends the stream, keeps the last data as `stale`, and reads a new snapshot after a backoff. */
    #restart(reason, error) {
        if (this.#closed)
            return;
        this.#epoch += 1;
        this.#endStream();
        if (this.#lastData !== undefined) {
            this.#publish({ status: "stale", data: this.#lastData, reason, error });
        }
        this.#retryLater(0);
    }
    #retryLater(atLeastMs) {
        const delay = Math.max(atLeastMs, this.#deps.backoffMs(this.#attempt));
        this.#attempt += 1;
        this.#schedule("attempt", delay, () => void this.#attemptRun());
    }
    // ---------------------------------------------------------------- unavailable and too large
    #becomeUnavailable(epoch, reason, detail) {
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
        void this.#watchOnce(epoch, Streams.AccountCapabilityWatchSubscription.toString(), { capabilityId: `${this.#deps.chainId}:orders` }, "capability", (row, first) => {
            // Hasura sends the current row first. Only a READY row, or any later change, is news.
            const head = Wire.wireCapabilityHeadSchema.safeParse(row);
            return !first || (head.success && head.data.readiness === "READY");
        }, () => void this.#attemptRun());
    }
    #becomeTooLarge(epoch, capability, limit) {
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
        void this.#watchOnce(epoch, Streams.AccountGuardWatchSubscription.toString(), { guardId: `${capability.datasetGeneration}:${this.#deps.account}` }, "guard", (_row, first) => !first, () => {
            // An account that changes often would otherwise be read in full on every change.
            const waitMs = checkedAtMs + RECHECK_THROTTLE_MS - this.#deps.nowMs();
            this.#schedule("attempt", Math.max(0, waitMs), () => void this.#attemptRun());
        });
    }
    /**
     *  Watches one subscription until `isNews` says a frame changes something, then calls
     *  `onNews` once. A watch that fails leaves the timer already set as the fallback.
     */
    async #watchOnce(epoch, document, variables, root, isNews, onNews) {
        let connection;
        try {
            connection = await this.#deps.connection();
        }
        catch {
            return;
        }
        if (!this.#current(epoch))
            return;
        let first = true;
        let fired = false;
        const stop = connection.subscribe(document, variables, {
            next: (data, errors) => {
                if (!this.#current(epoch) || fired)
                    return;
                if (errors.length > 0 || data === null || !(root in data))
                    return;
                const news = isNews(data[root], first);
                first = false;
                if (!news)
                    return;
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
    #subscribe(live, connection) {
        const { epoch } = live;
        const generation = live.follower.version.datasetGeneration;
        const sink = (root, onRow) => ({
            next: (data, errors) => {
                if (!this.#current(epoch))
                    return;
                // A frame without its root field is not an answer. Reading it as "no row" would
                // turn a broken frame into a missing capability or an absent guard.
                if (errors.length > 0 || data === null || !(root in data)) {
                    this.#restart("reconnecting", null);
                    return;
                }
                onRow(data[root]);
            },
            error: (error) => {
                if (!this.#current(epoch))
                    return;
                this.#deps.warn("the account stream failed", { account: this.#deps.account, error });
                this.#restart("reconnecting", null);
            },
            complete: () => {
                if (this.#current(epoch))
                    this.#restart("reconnecting", null);
            },
        });
        this.#subscriptions.push(connection.subscribe(Streams.AccountCapabilityWatchSubscription.toString(), { capabilityId: `${this.#deps.chainId}:orders` }, sink("capability", (row) => {
            if (this.#handle(live, live.follower.onCapability(row)))
                this.#confirm(live, "capability");
        })), connection.subscribe(Streams.AccountGuardWatchSubscription.toString(), { guardId: `${generation}:${this.#deps.account}` }, sink("guard", (row) => this.#onGuard(live, row))), connection.subscribe(Streams.AccountChangeBatchStreamSubscription.toString(), {
            account: this.#deps.account,
            datasetGeneration: generation,
            afterBlock: live.follower.version.blockNumber,
            batchSize: STREAM_BATCH_SIZE,
        }, sink("batches", (rows) => this.#onBatches(live, rows))));
    }
    /** Applies a verdict's consequence. Returns `false` when the verdict ended the stream. */
    #handle(live, verdict) {
        if (verdict.status === "reset_required" ||
            verdict.status === "source_unavailable" ||
            verdict.status === "retry_required") {
            this.#deps.warn("the account stream needs a new snapshot", { account: this.#deps.account, verdict });
            this.#restart("reconnecting", null);
            return false;
        }
        return this.#current(live.epoch);
    }
    /** Both watches sent a frame, so the stream works; later failures start the backoff afresh. */
    #confirm(live, watch) {
        live.confirmed[watch] = true;
        if (live.confirmed.capability && live.confirmed.guard)
            this.#attempt = 0;
    }
    #onGuard(live, row) {
        const wasCaughtUp = this.#caughtUp(live);
        const verdict = live.follower.onGuard(row);
        if (!this.#handle(live, verdict))
            return;
        this.#confirm(live, "guard");
        if (verdict.status === "pending")
            live.latestGuardBlock = BigInt(verdict.target.blockNumber);
        this.#track(live, false);
        // A guard frame changes the view's `sync` fields only.
        if (this.#caughtUp(live) !== wasCaughtUp)
            this.#scheduleEmit(live, "window");
    }
    #onBatches(live, rows) {
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
        this.#drain(live).catch((error) => this.#failedInternally(live, error));
    }
    async #drain(live) {
        if (live.draining)
            return;
        live.draining = true;
        try {
            while (this.#current(live.epoch) && live.queue.length > 0) {
                const group = this.#takeGroup(live);
                const read = await this.#readGroup(live, group);
                if (!this.#current(live.epoch) || read.status === "ended")
                    return;
                // The group went back to the queue, to be read in smaller groups.
                if (read.status === "requeued")
                    continue;
                let applied = false;
                for (const planned of group) {
                    const own = read.byBatch.get(planned.id);
                    const verdict = live.follower.onBatch(planned.raw, own?.orderChanges ?? [], own?.stopChanges ?? []);
                    if (verdict.status === "applied") {
                        live.inventory.apply(verdict);
                        const block = BigInt(verdict.version.blockNumber);
                        if (block > live.processedHeight)
                            live.processedHeight = block;
                        if (live.latestGuardBlock === null || block > live.latestGuardBlock)
                            live.latestGuardBlock = block;
                        applied = true;
                    }
                    else if (!this.#handle(live, verdict)) {
                        return;
                    }
                }
                if (!applied)
                    continue;
                this.#track(live, true);
                if (this.#overCapacity(live))
                    return;
                this.#forgetRemovedStops(live);
                this.#enrichPending(live);
                this.#scheduleEmit(live, live.queue.length > 0 ? "window" : "now");
            }
        }
        finally {
            live.draining = false;
        }
    }
    /** The next queued batches whose changes fit one read under the proved row limit. */
    #takeGroup(live) {
        const group = [];
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
            if (group.length > 0 && (nextOrders + 1 > ceiling || nextStops + 1 > ceiling))
                break;
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
    async #readGroup(live, group) {
        const byBatch = new Map();
        const reads = group.filter((planned) => planned.orders + planned.stops > 0);
        if (reads.length === 0)
            return { status: "read", byBatch };
        for (const planned of reads)
            byBatch.set(planned.id, { orderChanges: [], stopChanges: [] });
        const limits = {
            orders: reads.reduce((sum, planned) => sum + planned.orders, 0) + 1,
            stops: reads.reduce((sum, planned) => sum + planned.stops, 0) + 1,
        };
        const signal = this.#controller?.signal ?? Raise.unreachable("a live stream always has its attempt's signal");
        let response;
        try {
            response = await this.#deps.readChildren([...byBatch.keys()], limits, signal);
        }
        catch (error) {
            if (!this.#current(live.epoch))
                return ENDED;
            if (error instanceof IndexerError && Reads.isResponseSizeRefusal(error.message) && group.length > 1) {
                // The row limit held but the byte limit did not. Read fewer batches at a time.
                live.queue.unshift(...group.map((planned) => planned.raw));
                live.groupLimit = Math.max(1, Math.floor(group.length / 2));
                return { status: "requeued" };
            }
            this.#restart("reconnecting", null);
            return ENDED;
        }
        if (!this.#current(live.epoch))
            return ENDED;
        const { orderChanges, stopChanges } = response;
        if (!Array.isArray(orderChanges) || !Array.isArray(stopChanges)) {
            this.#restart("reconnecting", null);
            return ENDED;
        }
        for (const [changes, family] of [
            [orderChanges, "orderChanges"],
            [stopChanges, "stopChanges"],
        ]) {
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
    #track(live, progressed) {
        const now = this.#deps.nowMs();
        const { follower } = live;
        if (follower.pendingTarget === undefined)
            live.pendingSinceMs = undefined;
        else
            live.pendingSinceMs = progressed ? now : (live.pendingSinceMs ?? now);
        live.behindSinceMs = follower.guardBehind ? (live.behindSinceMs ?? now) : undefined;
        const deadlines = [
            live.pendingSinceMs === undefined ? undefined : live.pendingSinceMs + STREAM_STALL_MS,
            live.behindSinceMs === undefined ? undefined : live.behindSinceMs + GUARD_BEHIND_MS,
        ].filter((deadline) => deadline !== undefined);
        if (deadlines.length === 0) {
            this.#cancel("watchdog");
            return;
        }
        this.#schedule("watchdog", Math.max(0, Math.min(...deadlines) - now), () => {
            if (!this.#current(live.epoch))
                return;
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
    #caughtUp(live) {
        return live.follower.pendingTarget === undefined && !live.follower.guardBehind && live.queue.length === 0;
    }
    /** An account that grew past capacity is `tooLarge`, as a snapshot of it would be. */
    #overCapacity(live) {
        const nowNs = BigInt(this.#deps.nowMs()) * 1000000n;
        const size = live.inventory.sizeAt(nowNs);
        const orders = size.orders > live.capability.orderCapacity;
        if (!orders && size.stops <= live.capability.stopCapacity)
            return false;
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
    #enrichPending(live) {
        if (!this.#current(live.epoch))
            return;
        if (live.enriching) {
            live.enrichAgain = true;
            return;
        }
        const nowNs = BigInt(this.#deps.nowMs()) * 1000000n;
        const terms = [...live.inventory.liveAt(nowNs).stops]
            .filter(([id]) => !live.enriched.has(id) || live.enrichDue.has(id))
            .map(([id, payload]) => Rows.toStopTerms(id, this.#deps.account, payload));
        live.enrichDue.clear();
        if (terms.length === 0)
            return;
        const signal = this.#controller?.signal ?? Raise.unreachable("a live stream always has its attempt's signal");
        live.enriching = true;
        void this.#deps
            .enrich(terms, live.capability.datasetGeneration, signal)
            .then((enriched) => {
            if (!this.#current(live.epoch))
                return;
            if (this.#keepEnriched(live, enriched))
                this.#scheduleEmit(live, "window");
        }, (error) => {
            if (this.#current(live.epoch))
                this.#deps.warn("stop enrichment failed; the stops stay pending", { error });
        })
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
    #keepEnriched(live, stops) {
        let kept = false;
        let fewestFailures;
        for (const stop of stops) {
            // It left while its read ran.
            if (!live.inventory.hasStop(stop.id))
                continue;
            kept = true;
            const enriched = { venue: stop.venue, limitPrice: stop.limitPrice };
            live.enriched.set(stop.id, enriched);
            if (!readFailed(enriched)) {
                live.enrichFailures.delete(stop.id);
                continue;
            }
            const failures = (live.enrichFailures.get(stop.id) ?? 0) + 1;
            live.enrichFailures.set(stop.id, failures);
            if (failures > ENRICH_RETRIES)
                continue;
            live.enrichWaiting.add(stop.id);
            fewestFailures = Math.min(failures, fewestFailures ?? failures);
        }
        // One timer serves every stop. Stops that fail while it waits join its read.
        if (fewestFailures === undefined || this.#timers.has("enrichRetry"))
            return kept;
        this.#schedule("enrichRetry", this.#deps.backoffMs(fewestFailures - 1), () => {
            if (!this.#current(live.epoch))
                return;
            for (const id of live.enrichWaiting)
                live.enrichDue.add(id);
            live.enrichWaiting.clear();
            this.#enrichPending(live);
        });
        return kept;
    }
    /** Drops what the session keeps about stops the account no longer holds, so a long session does not grow. */
    #forgetRemovedStops(live) {
        for (const id of live.enriched.keys()) {
            if (live.inventory.hasStop(id))
                continue;
            live.enriched.delete(id);
            live.enrichFailures.delete(id);
            live.enrichWaiting.delete(id);
            live.enrichDue.delete(id);
        }
    }
    // ---------------------------------------------------------------- views
    #scheduleEmit(live, when) {
        if (when === "now") {
            this.#publishReady(live);
            return;
        }
        if (this.#timers.has("emit"))
            return;
        this.#schedule("emit", EMIT_WINDOW_MS, () => {
            if (this.#current(live.epoch))
                this.#publishReady(live);
        });
    }
    /**
     *  Something the checks let through could not be applied or shown. The session does
     *  not freeze on it or throw it at the runtime: it keeps the last data as `stale` and
     *  reads a new snapshot, whose rows are checked again.
     */
    #failedInternally(live, error) {
        if (!this.#current(live.epoch))
            return;
        this.#deps.warn("the account view could not apply a change; reading a new snapshot", {
            account: this.#deps.account,
            error,
        });
        this.#restart("reconnecting", viewErrorOf(error));
    }
    #publishReady(live) {
        try {
            this.#publishReadyUnchecked(live);
        }
        catch (error) {
            this.#failedInternally(live, error);
        }
    }
    #publishReadyUnchecked(live) {
        this.#cancel("emit");
        const nowMs = this.#deps.nowMs();
        const nowNs = BigInt(nowMs) * 1000000n;
        const view = live.inventory.liveAt(nowNs);
        const orders = [...view.orders].map(([id, payload]) => this.#order(live, id, payload));
        const stops = [...view.stops].map(([id, payload]) => this.#stop(live, id, payload));
        const data = Object.freeze({
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
        if (next === null)
            this.#cancel("expiry");
        else {
            this.#schedule("expiry", this.#delayUntilNs(next), () => {
                if (this.#current(live.epoch))
                    this.#publishReady(live);
            });
        }
    }
    #order(live, id, payload) {
        const known = live.orders.get(payload);
        if (known !== undefined)
            return known;
        const order = Rows.toAccountOrder(id, this.#deps.account, payload);
        live.orders.set(payload, order);
        return order;
    }
    #stop(live, id, payload) {
        const enriched = live.enriched.get(id) ?? PENDING;
        const known = live.stops.get(payload);
        if (known !== undefined && known.enriched === enriched)
            return known.stop;
        const stop = Object.freeze({ ...Rows.toStopTerms(id, this.#deps.account, payload), ...enriched });
        live.stops.set(payload, { enriched, stop });
        return stop;
    }
    #publish(fields) {
        // A closed session has said its last word, whatever a late read resolves with.
        if (this.#closed && fields.status !== "closed")
            return;
        const view = Object.freeze({
            chainId: this.#deps.chainId,
            account: this.#deps.account,
            revision: this.#deps.nextRevision(),
            ...fields,
        });
        this.#view = view;
        this.#deps.publish(view);
    }
    // ---------------------------------------------------------------- plumbing
    #current(epoch) {
        return !this.#closed && epoch === this.#epoch;
    }
    /** Stops the stream's subscriptions, reads and timers, and forgets its state. */
    #endStream() {
        for (const stop of this.#subscriptions)
            stop();
        this.#subscriptions = [];
        this.#controller?.abort();
        this.#controller = undefined;
        for (const name of ["emit", "expiry", "watchdog", "attempt", "enrichRetry"])
            this.#cancel(name);
    }
    #delayUntilNs(atNs) {
        const nowNs = BigInt(this.#deps.nowMs()) * 1000000n;
        if (atNs <= nowNs)
            return 0;
        const ms = (atNs - nowNs + 999999n) / 1000000n;
        return ms > BigInt(MAX_TIMER_MS) ? MAX_TIMER_MS : Number(ms);
    }
    #schedule(name, delayMs, run) {
        this.#cancel(name);
        // A closed session keeps no timer, so nothing of it outlives `close()`.
        if (this.#closed)
            return;
        this.#timers.set(name, setTimeout(() => {
            this.#timers.delete(name);
            if (!this.#closed)
                run();
        }, delayMs));
    }
    #cancel(name) {
        const timer = this.#timers.get(name);
        if (timer === undefined)
            return;
        clearTimeout(timer);
        this.#timers.delete(name);
    }
}
