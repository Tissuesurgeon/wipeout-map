// One account's live spot orders view.
//
// The view is the chain read of `spotOrdersRead.ts`. It follows every spot pool's order
// events over the chain socket, and when one of them concerns the account
// (`spotOrdersEvents.ts`) it reads again the pool that emitted it: an order the account
// placed, or a fill, cancel, expiry, reduce or amend of one of its orders. The other
// pools keep their last read, because no event says they changed. The order events name
// no owner after the placement, so the session matches them by the ids its reads found,
// plus the ids of orders placed since. A placement counts until a read of its pool that
// covers it lands: one at or after its block, or, when the log names no block, one that
// started after it arrived. A read already out when the order is placed does not hold
// it, so the order's next events must still match.
//
// The subscription follows every placement in every spot pool, and the later events of
// the account's own orders by id (`spotOrdersEvents.ts`). So it opens again when the
// account gains an order, with the new id. The new subscription opens before the old
// one is released, and the session reads every pool once the node confirms it: a change
// between the last read and that moment reached no subscription. That read also covers
// the first subscription, which opens with the pools the first read found.
//
// A pool that cannot be read is shown as unread, with its error, and read again after a
// backoff while the other pools stay live. A read that can read no pool, or not even the
// head, is a failed read. The session also reads every pool:
//
// - 30 s after it last read every pool, however often one pool's events read that pool,
//   so a subscription that stops without an error costs at most that;
// - after a failed read, with a backoff;
// - after a lost subscription, once it is open again, because changes may have been
//   missed while it was down.
//
// Reads that arrive together share one read. Each pool keeps its newest read: a read
// from an older block than a pool shows is dropped for that pool, so the view never goes
// back in time, and one from the block it shows says nothing new. A read that lands
// before the block of the log that asked for it reads that pool again (`catchUp.ts`).
import { ContractRevertError, IndexerError, NotConfiguredError, RpcError } from "../errors.js";
import * as Raise from "../raise.js";
import { CatchUp } from "./catchUp.js";
import * as Freeze from "./freeze.js";
import * as SpotOrdersRead from "./spotOrdersRead.js";
import * as Events from "./spotOrdersEvents.js";
/** How long after its last read of every pool the session reads every pool again. */
export const BACKSTOP_MS = 30_000;
const OPERATION = "accountSpotOrders.subscribe";
function viewErrorOf(error) {
    if (error instanceof ContractRevertError ||
        error instanceof RpcError ||
        error instanceof IndexerError ||
        error instanceof NotConfiguredError) {
        return error;
    }
    // Not an error this path models. It is kept as the cause, so the view still says why.
    return new RpcError(OPERATION, error instanceof Error ? error.message : String(error), { cause: error });
}
/** The pools a subscription follows, as one comparable string. */
function poolsKeyOf(pools) {
    return [...pools].sort().join(",");
}
/** Whether a subscription that names `watched` hears every event of the orders in `needed`. */
function covers(watched, needed) {
    if (watched === null)
        return true;
    if (needed === null)
        return false;
    for (const id of needed)
        if (!watched.has(id))
            return false;
    return true;
}
/**
 *  Whether a subscription names so many more orders than the account holds that it is
 *  worth opening again: ended orders stay named until then, which costs only their
 *  events. One that follows every event narrows again once the account holds half the cap.
 */
function tooWide(watched, needed) {
    if (needed === null)
        return false;
    if (watched === null)
        return needed.size <= Events.MAX_FILTERED_ORDER_IDS / 2;
    return watched.size > 2 * needed.size + 16;
}
export class SpotOrdersSession {
    #deps;
    /** Aborts the read in flight when the session closes. */
    #controller = new AbortController();
    #closed = false;
    #view;
    #data;
    /** Discovery must recover before a pool-specific read can assert full coverage. */
    #discoveryError;
    /** Each pool's newest read, by lower-case pool. `undefined` until a read of every pool lands. */
    #held;
    /** The newest block a read the view took was pinned to. */
    #blockNumber = 0n;
    /**
     *  The open order ids each pool held at its last read that listed them. A pool that is
     *  unread keeps them, so its orders' events still match.
     */
    #known = new Map();
    /** Orders the account placed that no read has covered yet, keyed `<pool>:<orderId>`. */
    #placed = new Map();
    /** Reads started so far; the latest one's number. */
    #readsStarted = 0;
    /** The block a log asked each pool's next read to reach, by pool. */
    #catchUps = new Map();
    #reading = false;
    /** Whether the next read reads every pool. */
    #readAll = false;
    /** The pools the next read reads, lower-case. */
    #readPools = new Set();
    /** Consecutive failed reads, for the backoff. */
    #failures = 0;
    /** Consecutive reads of unread pools that left one unread, for the backoff. */
    #unreadRetries = 0;
    /** Consecutive lost subscriptions, for the backoff. */
    #watchFailures = 0;
    /** The newest subscription. */
    #watch;
    /** The subscription the newest one replaces, kept until the newest opens. */
    #replaced;
    /** The pools the last read of every pool named, which the subscription follows. */
    #watchedPools = [];
    /** The next read of every pool: 30 s after the last one, or a failed read's retry. */
    #fullTimer;
    /** The next read of the pools that could not be read. */
    #unreadTimer;
    #watchTimer;
    constructor(deps) {
        this.#deps = deps;
    }
    /** The last view the session published, if any. */
    get view() {
        return this.#view;
    }
    /** Publishes `loading` and reads every pool; the subscription opens with the first read's pools. */
    start() {
        this.#publish({ status: "loading" });
        this.#refresh(null);
    }
    /** Stops for good. `publishClosed` sends a last `closed` view. */
    close(publishClosed) {
        if (this.#closed)
            return;
        this.#closed = true;
        this.#controller.abort();
        this.#closeWatch();
        clearTimeout(this.#fullTimer);
        this.#fullTimer = undefined;
        clearTimeout(this.#unreadTimer);
        this.#unreadTimer = undefined;
        if (publishClosed)
            this.#publish({ status: "closed" });
    }
    // ---------------------------------------------------------------- reading
    /** Reads `pool` again, or every pool when `pool` is `null`. A read in flight is followed by one more. */
    #refresh(pool) {
        if (this.#closed)
            return;
        if (pool === null)
            this.#readAll = true;
        else
            this.#readPools.add(pool);
        // Whatever asked has seen something the read in flight may predate.
        this.#readNext();
    }
    #readNext() {
        if (this.#reading || (!this.#readAll && this.#readPools.size === 0))
            return;
        // Until a read of every pool lands, there is no pool list to read one pool against.
        const all = this.#readAll || this.#held === undefined;
        // A pool the market list has dropped since it was asked for is no longer read.
        const pools = all ? null : [...this.#readPools].filter((pool) => this.#held?.has(pool) === true);
        this.#readAll = false;
        this.#readPools.clear();
        if (pools?.length === 0)
            return;
        if (all) {
            clearTimeout(this.#fullTimer);
            this.#fullTimer = undefined;
        }
        this.#reading = true;
        this.#readsStarted += 1;
        const sequence = this.#readsStarted;
        void this.#deps.read(pools, new Map(this.#known), this.#controller.signal).then((result) => this.#settle(() => this.#landed(result, sequence, all)), (error) => this.#settle(() => this.#fail(error)));
    }
    #settle(apply) {
        if (this.#closed) {
            this.#reading = false;
            return;
        }
        // Reads asked for while the result applies go out together, after it.
        apply();
        this.#reading = false;
        if (!this.#closed)
            this.#readNext();
    }
    /** Takes read number `sequence`'s result; `all` when it read every pool. */
    #landed(result, sequence, all) {
        // A read of every pool that could read none of them learned nothing about the account.
        const failure = all ? SpotOrdersRead.nothingRead(result) : undefined;
        if (failure !== undefined) {
            this.#fail(failure);
            return;
        }
        if (all)
            this.#discoveryError = undefined;
        // Reading one known pool cannot recover discovery or reset its retry schedule.
        if (this.#discoveryError === undefined)
            this.#failures = 0;
        const { current, changed } = this.#merge(result, all);
        this.#forgetCovered(result, sequence, current);
        this.#syncWatch();
        if (all)
            this.#setFullTimer(BACKSTOP_MS);
        this.#scheduleUnreadRead();
        // A read older than every pool it names says nothing new, even to a view that is not ready.
        const taken = current.size > 0 || result.pools.length === 0;
        if (changed || (taken && this.#view?.status !== "ready"))
            this.#publishHeld();
        this.#chase(result);
    }
    /**
     *  Takes each pool's read unless the pool shows a newer block. Returns the pools whose
     *  read is as new as what they show, and whether the view changed.
     */
    #merge(result, all) {
        const held = this.#held ?? new Map();
        let changed = this.#held === undefined;
        if (all) {
            // A read of every pool names the pools the market list holds now.
            const listed = new Set(result.pools);
            // A Map stays safe to iterate while entries are deleted.
            for (const pool of held.keys()) {
                if (listed.has(pool))
                    continue;
                held.delete(pool);
                this.#known.delete(pool);
                this.#catchUps.delete(pool);
                changed = true;
            }
            for (const [key, placement] of this.#placed)
                if (!listed.has(placement.pool))
                    this.#placed.delete(key);
            this.#watchedPools = result.pools;
        }
        const current = new Set();
        for (const pool of result.pools) {
            const before = held.get(pool);
            // A pool the market list dropped while this read was out is no longer the view's.
            if (before === undefined && !all)
                continue;
            if (before !== undefined && result.blockNumber < before.blockNumber)
                continue;
            current.add(pool);
            const read = result.byPool.get(pool) ?? Raise.unreachable("a read settles every pool it names");
            const sameBlock = before !== undefined && result.blockNumber === before.blockNumber;
            // At the block the pool shows, a failed read never replaces a good one.
            if (sameBlock && !read.ok)
                continue;
            held.set(pool, { pool, blockNumber: result.blockNumber, read });
            if (read.ok)
                this.#known.set(pool, read.orderIds);
            // The same block holds the same orders: only a pool that was unread changes the view.
            if (!sameBlock || !before.read.ok)
                changed = true;
        }
        if ((current.size > 0 || result.pools.length === 0) && result.blockNumber > this.#blockNumber) {
            this.#blockNumber = result.blockNumber;
            changed = true;
        }
        this.#held = held;
        return { current, changed };
    }
    /** Reads a pool again while it shows an older block than a log asked for. */
    #chase(result) {
        for (const pool of result.pools) {
            const shown = this.#held?.get(pool)?.blockNumber;
            if (shown !== undefined && this.#catchUps.get(pool)?.landed(shown) === true)
                this.#refresh(pool);
        }
    }
    /**
     *  Forgets the placements read number `sequence`, at its block, covers: a read of the
     *  placement's pool that listed its orders. It lists the order if it still rests, so the
     *  ids it found match it now.
     */
    #forgetCovered(result, sequence, current) {
        for (const [key, placement] of this.#placed) {
            if (!current.has(placement.pool) || result.byPool.get(placement.pool)?.ok !== true)
                continue;
            const covered = placement.blockNumber === null ? sequence > placement.readsBefore : placement.blockNumber <= result.blockNumber;
            if (covered)
                this.#placed.delete(key);
        }
    }
    #fail(caught) {
        const error = viewErrorOf(caught);
        if (error instanceof IndexerError) {
            this.#discoveryError = error;
            // The prior rows remain useful, but discovery no longer proves complete coverage.
            if (this.#data !== undefined && this.#data.complete) {
                this.#data = Freeze.deepFreeze({ ...this.#data, complete: false });
            }
        }
        // Without a chain transport every read fails the same way, so it is not retried.
        const terminal = error instanceof NotConfiguredError;
        // The same failure again is not a new view.
        if (!this.#shows(error)) {
            if (this.#data !== undefined && !terminal)
                this.#publishStale("refreshFailed", error);
            else
                this.#publish({ status: "failed", error, retrying: !terminal });
        }
        if (terminal)
            return;
        const delay = this.#deps.backoffMs(this.#failures);
        this.#failures += 1;
        this.#setFullTimer(delay);
    }
    /** Whether the view already reports this failure: an error of the same kind, with the same message. */
    #shows(error) {
        const view = this.#view;
        let shown = null;
        if (view?.status === "failed")
            shown = view.error;
        else if (view?.status === "stale" && view.reason === "refreshFailed")
            shown = view.error;
        return shown !== null && shown.constructor === error.constructor && shown.message === error.message;
    }
    /** Reads every pool in `delayMs`. */
    #setFullTimer(delayMs) {
        clearTimeout(this.#fullTimer);
        this.#fullTimer = setTimeout(() => {
            this.#fullTimer = undefined;
            this.#refresh(null);
        }, delayMs);
    }
    /** The pools whose newest read failed. */
    #unreadPools() {
        return [...(this.#held?.values() ?? [])].flatMap((entry) => (entry.read.ok ? [] : [entry.pool]));
    }
    /** Reads the unread pools again after a backoff, or forgets the backoff once every pool reads. */
    #scheduleUnreadRead() {
        if (this.#unreadPools().length === 0) {
            clearTimeout(this.#unreadTimer);
            this.#unreadTimer = undefined;
            this.#unreadRetries = 0;
            return;
        }
        // A retry is already due.
        if (this.#unreadTimer !== undefined)
            return;
        const delay = this.#deps.backoffMs(this.#unreadRetries);
        this.#unreadRetries += 1;
        this.#unreadTimer = setTimeout(() => {
            this.#unreadTimer = undefined;
            for (const pool of this.#unreadPools())
                this.#refresh(pool);
        }, delay);
    }
    // ---------------------------------------------------------------- the pools' order events
    /** The order ids the subscription must name: the reads', and those placed since. `null` past the cap. */
    #neededIds() {
        const ids = new Set();
        for (const list of this.#known.values())
            for (const id of list)
                ids.add(id);
        for (const placement of this.#placed.values())
            ids.add(placement.orderId);
        return ids.size > Events.MAX_FILTERED_ORDER_IDS ? null : ids;
    }
    /** Follows the pools and orders the view needs now, or keeps the subscription that already does. */
    #syncWatch() {
        // A lost subscription opens again after its backoff, with what the view needs then.
        if (this.#closed || this.#watchTimer !== undefined)
            return;
        if (this.#watchedPools.length === 0) {
            // No spot pool: nothing to follow.
            this.#releaseWatches();
            return;
        }
        const poolsKey = poolsKeyOf(this.#watchedPools);
        const ids = this.#neededIds();
        const current = this.#watch;
        if (current !== undefined &&
            current.poolsKey === poolsKey &&
            covers(current.ids, ids) &&
            !tooWide(current.ids, ids)) {
            return;
        }
        this.#openWatch(poolsKey, ids);
    }
    /** Opens a subscription for `ids` in the watched pools. The one it replaces hears the account until it opens. */
    #openWatch(poolsKey, ids) {
        const watch = { release: undefined, poolsKey, ids, open: false };
        try {
            watch.release = this.#deps.watch(Events.spotOrderFilters(this.#watchedPools, ids === null ? null : [...ids]), (log) => this.#onLog(log), () => this.#watchLost(watch), () => this.#watchOpened(watch));
        }
        catch (error) {
            // No chain transport: the read reports it. The subscriptions from before stay.
            this.#deps.warn("the spot pools' order events could not be followed", { error });
            return;
        }
        const current = this.#watch;
        this.#watch = watch;
        if (current?.open === true) {
            this.#replaced?.release?.();
            this.#replaced = current;
        }
        else {
            // It never opened, so it heard nothing; the one it replaced stays until the new one opens.
            current?.release?.();
        }
    }
    #watchOpened(watch) {
        if (this.#closed || watch !== this.#watch)
            return;
        watch.open = true;
        this.#replaced?.release?.();
        this.#replaced = undefined;
        // A change between the last read and this moment reached no subscription, in any pool.
        this.#refresh(null);
    }
    #onLog(log) {
        if (this.#closed)
            return;
        // Any log proves the subscription works, another account's too.
        this.#watchFailures = 0;
        // A log that does not read might be the account's, in any pool: reading again is cheap.
        if (log === undefined) {
            this.#refresh(null);
            return;
        }
        const verdict = Events.verdictOf(log, this.#deps.account.toLowerCase(), (pool, orderId) => this.#isKnown(pool, orderId));
        if (verdict.kind === "ignore")
            return;
        const pool = log.address.toLowerCase();
        // A pool the view does not hold, which the market list has just changed, needs every pool read.
        const held = this.#held?.get(pool);
        if (held !== undefined)
            this.#catchUpOf(pool).ask(log.blockNumber);
        if (verdict.kind === "placed") {
            this.#placed.set(`${pool}:${verdict.orderId}`, {
                pool,
                orderId: verdict.orderId,
                blockNumber: log.blockNumber,
                readsBefore: this.#readsStarted,
            });
            // The subscription names the account's orders; this one is new.
            this.#syncWatch();
        }
        this.#refresh(held?.pool ?? null);
    }
    #catchUpOf(pool) {
        let catchUp = this.#catchUps.get(pool);
        if (catchUp === undefined) {
            catchUp = new CatchUp();
            this.#catchUps.set(pool, catchUp);
        }
        return catchUp;
    }
    #isKnown(pool, orderId) {
        if (this.#placed.has(`${pool}:${orderId}`))
            return true;
        return this.#known.get(pool)?.includes(orderId) === true;
    }
    #watchLost(watch) {
        if (this.#closed || (watch !== this.#watch && watch !== this.#replaced))
            return;
        this.#releaseWatches();
        this.#deps.warn("the spot pools' order event subscription was lost", { account: this.#deps.account });
        if (this.#data !== undefined)
            this.#publishStale("reconnecting", null);
        const delay = this.#deps.backoffMs(this.#watchFailures);
        this.#watchFailures += 1;
        clearTimeout(this.#watchTimer);
        this.#watchTimer = setTimeout(() => {
            this.#watchTimer = undefined;
            // The new subscription reads once the node confirms it: events may have been
            // missed while it was down.
            this.#syncWatch();
        }, delay);
    }
    #releaseWatches() {
        this.#watch?.release?.();
        this.#replaced?.release?.();
        this.#watch = undefined;
        this.#replaced = undefined;
    }
    #closeWatch() {
        this.#releaseWatches();
        clearTimeout(this.#watchTimer);
        this.#watchTimer = undefined;
    }
    // ---------------------------------------------------------------- views
    /** Publishes `ready` with each pool's newest read. */
    #publishHeld() {
        const held = this.#held ?? Raise.unreachable("a view is published once a read of every pool landed");
        const { orders, unreadPools } = SpotOrdersRead.viewOf(new Map([...held].map(([pool, entry]) => [pool, entry.read])));
        const data = Freeze.deepFreeze({
            orders: [...orders],
            unreadPools: [...unreadPools],
            complete: this.#discoveryError === undefined && unreadPools.length === 0,
            blockNumber: this.#blockNumber,
            observedAtMs: this.#deps.nowMs(),
        });
        this.#data = data;
        if (this.#discoveryError !== undefined)
            this.#publishStale("refreshFailed", this.#discoveryError);
        else
            this.#publish({ status: "ready", data });
    }
    #publishStale(reason, error) {
        const data = this.#data;
        if (data === undefined)
            return;
        this.#publish({ status: "stale", data, reason, error });
    }
    #publish(fields) {
        // A closed session has said its last word.
        if (this.#closed && fields.status !== "closed")
            return;
        const view = Object.freeze({
            chainId: this.#deps.chainId,
            account: this.#deps.account.toLowerCase(),
            revision: this.#deps.nextRevision(),
            ...fields,
        });
        this.#view = view;
        this.#deps.publish(view);
    }
}
