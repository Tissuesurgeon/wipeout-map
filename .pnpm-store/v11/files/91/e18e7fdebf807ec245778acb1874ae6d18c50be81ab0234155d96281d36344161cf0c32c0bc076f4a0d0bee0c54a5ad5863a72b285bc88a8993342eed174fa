// One side of one perp market's live ADL queue.
//
// The view is the chain read of `adl.ts`, repeated when it can have changed:
//
// - at once, when the MarginBank reports a change that can move the queue, which the chain
//   socket pushes: any trader's fill, close, liquidation, takeover, forced settlement, ADL
//   or funding settlement on this market, and any account's deposit, withdrawal, credit,
//   linked funding or close-out payment (`subscribeAdlQueueLogs`);
// - every 30 s, so a subscription that stops without an error costs at most that. The
//   same read also picks up what moves the order with no followed event: price moves,
//   order placement and cancellation (each moves the trader's equity, but the bank emits
//   them several times a second), and the holders' equity changing on other markets;
// - after a failure, with a backoff, and after the event subscription is re-opened,
//   because events may have been missed while it was down.
//
// Nothing is folded from the events: each one only says "read again". Reads that arrive
// together share one read, and a result older than the view's block is dropped, so the
// view never goes back in time. A result of the block the view already shows is dropped
// too. A read that lands before the block of the event that asked for it reads again
// (`catchUp.ts`). Events that arrive while a failed read waits for its retry ask for
// nothing more: the retry reads the head. While the event subscription is down, a read
// that lands is published as `stale`, because nothing would read the side again on a
// change; the view is `ready` again once the node confirms the new subscription. The
// structure is the balances view's (`balancesSession.ts`).
import { ContractRevertError, NotConfiguredError, RpcError } from "../errors.js";
import * as CatchUp from "../accountView/catchUp.js";
import * as Freeze from "../accountView/freeze.js";
/** How often the side is read again when no event asks for it. */
export const BACKSTOP_MS = 30_000;
const OPERATION = "perpAdlQueue.subscribe";
/**
 *  The error a view carries. The classes this path models pass through. Anything else
 *  becomes an `RpcError` that keeps the original as its cause.
 */
function viewErrorOf(error) {
    if (error instanceof ContractRevertError || error instanceof RpcError || error instanceof NotConfiguredError) {
        return error;
    }
    // Not an error this path models. It is kept as the cause, so the view still says why.
    return new RpcError(OPERATION, error instanceof Error ? error.message : String(error), { cause: error });
}
export class AdlSession {
    #deps;
    /** Aborts the read in flight when the session closes. */
    #controller = new AbortController();
    #closed = false;
    #view;
    #data;
    #reading = false;
    #readAgain = false;
    #catchUp = new CatchUp.CatchUp();
    /** Consecutive failed reads, for the backoff. */
    #failures = 0;
    /** A failed read's retry is scheduled: events wait for it instead of reading at once. */
    #retryPending = false;
    /** The event subscription was lost, and the node has not confirmed a new one. */
    #watchDown = false;
    /** Consecutive lost subscriptions, for the backoff. */
    #watchFailures = 0;
    #unwatch;
    #refreshTimer;
    #watchTimer;
    /** Opens nothing: `start` publishes, subscribes and reads. */
    constructor(deps) {
        this.#deps = deps;
    }
    /** The last view the session published, if any. */
    get view() {
        return this.#view;
    }
    /** Publishes `loading`, subscribes to the market's events and reads the side. */
    start() {
        this.#publish({ status: "loading" });
        this.#openWatch();
        this.#refresh();
    }
    /** Stops for good. `publishClosed` sends a last `closed` view. */
    close(publishClosed) {
        if (this.#closed)
            return;
        this.#closed = true;
        this.#controller.abort();
        this.#unwatch?.();
        this.#unwatch = undefined;
        clearTimeout(this.#refreshTimer);
        clearTimeout(this.#watchTimer);
        this.#refreshTimer = undefined;
        this.#watchTimer = undefined;
        if (publishClosed)
            this.#publish({ status: "closed" });
    }
    // ---------------------------------------------------------------- reading
    /**
     *  Asks for a read of the side. It starts at once when nothing else is pending. With a
     *  read in flight, a new read starts when that one lands. With a retry scheduled after
     *  a failure, nothing more starts: the retry reads the head.
     */
    #refresh() {
        if (this.#closed)
            return;
        if (this.#reading) {
            // Whatever asked has seen something the read in flight may predate.
            this.#readAgain = true;
            return;
        }
        // The retry reads the head when its backoff ends, which covers whatever asked.
        if (this.#retryPending)
            return;
        clearTimeout(this.#refreshTimer);
        this.#refreshTimer = undefined;
        this.#reading = true;
        this.#readAgain = false;
        void this.#deps.read(this.#controller.signal).then((result) => this.#settle(() => {
            this.#accept(result);
            this.#chase(result.blockNumber);
        }), (error) => this.#settle(() => this.#fail(error)));
    }
    /**
     *  Ends the read in flight. `apply` runs unless the session closed. Then the session
     *  reads again if something asked while that read was in flight.
     */
    #settle(apply) {
        this.#reading = false;
        if (this.#closed)
            return;
        apply();
        if (this.#closed)
            return;
        if (this.#readAgain)
            this.#refresh();
    }
    /**
     *  Takes a read's queue and restarts the 30 s backstop. The queue is published unless
     *  the view already holds a newer block, or the same block in the state it would be
     *  published in.
     */
    #accept(result) {
        this.#failures = 0;
        const held = this.#data;
        this.#setRefreshTimer(BACKSTOP_MS);
        // A read that started earlier can answer from an older block than the view holds.
        if (held !== undefined && result.blockNumber < held.blockNumber)
            return;
        // A read of the block the view already shows, in the state it would be published in,
        // finds the same queue: two events in one block ask twice.
        if (held !== undefined && result.blockNumber === held.blockNumber && this.#shows())
            return;
        const data = Freeze.deepFreeze({
            queue: result.queue,
            blockNumber: result.blockNumber,
            observedAtMs: this.#deps.nowMs(),
        });
        this.#data = data;
        // Without a confirmed subscription, nothing would read the side again on a change.
        if (this.#watchDown)
            this.#publish({ status: "stale", data, reason: "reconnecting", error: null });
        else
            this.#publish({ status: "ready", data });
    }
    /** Whether the view already shows what a read of its block would publish: `ready`, or `stale` while reconnecting. */
    #shows() {
        const view = this.#view;
        if (this.#watchDown)
            return view?.status === "stale" && view.reason === "reconnecting";
        return view?.status === "ready";
    }
    /** Reads again while the view shows an older block than an event asked for. */
    #chase(readBlock) {
        const held = this.#data?.blockNumber;
        const shown = held !== undefined && held > readBlock ? held : readBlock;
        if (this.#catchUp.landed(shown))
            this.#refresh();
    }
    /**
     *  Takes a failed read. Held data goes `stale` with `refreshFailed`; with no data, the
     *  view is `failed`. The retry waits out a backoff. A missing chain transport is
     *  final, so it is not retried.
     */
    #fail(caught) {
        const error = viewErrorOf(caught);
        // Without a chain transport every read fails the same way, so it is not retried.
        const terminal = error instanceof NotConfiguredError;
        if (this.#data !== undefined && !terminal) {
            this.#publishStale("refreshFailed", error);
        }
        else {
            this.#publish({ status: "failed", error, retrying: !terminal });
        }
        if (terminal)
            return;
        const delay = this.#deps.backoffMs(this.#failures);
        this.#failures += 1;
        this.#retryPending = true;
        this.#setRefreshTimer(delay);
    }
    /**
     *  Schedules the next read in `delayMs`, in place of any read scheduled before. The
     *  backstop and the retry after a failure both use it. When it fires, a pending retry
     *  ends and the side is read.
     */
    #setRefreshTimer(delayMs) {
        clearTimeout(this.#refreshTimer);
        this.#refreshTimer = setTimeout(() => {
            this.#refreshTimer = undefined;
            this.#retryPending = false;
            this.#refresh();
        }, delayMs);
    }
    // ---------------------------------------------------------------- the event subscription
    /**
     *  Subscribes to the market's events. Each event asks for a read. The node's
     *  confirmation ends `reconnecting` and asks for a read too. Without a chain
     *  transport it only warns, because the read reports that failure.
     */
    #openWatch() {
        if (this.#closed)
            return;
        try {
            this.#unwatch = this.#deps.watch((blockNumber) => {
                // An event proves the subscription works.
                this.#watchFailures = 0;
                this.#catchUp.ask(blockNumber);
                this.#refresh();
            }, () => this.#watchLost(), 
            // An event between the last read and this moment reached no subscription.
            () => {
                this.#watchDown = false;
                this.#refresh();
            });
        }
        catch (error) {
            // No chain transport: the read reports it; there is nothing to watch.
            this.#deps.warn("the ADL queue's market events could not be watched", { error });
        }
    }
    /**
     *  Handles a lost subscription. Held data goes `stale` with `reconnecting`, unless a
     *  failed read waits for its retry. A new subscription opens after a backoff, and the
     *  side is read again then.
     */
    #watchLost() {
        if (this.#closed)
            return;
        this.#unwatch?.();
        this.#unwatch = undefined;
        this.#watchDown = true;
        this.#deps.warn("the ADL queue's market event subscription was lost", {
            marginBank: this.#deps.marginBank,
            pool: this.#deps.pool,
            isLong: this.#deps.isLong,
        });
        // A failed read waiting for its retry keeps `refreshFailed` and its error: the read is
        // still failing, and the retry moves the view on whatever the subscription does.
        if (this.#data !== undefined && !this.#retryPending)
            this.#publishStale("reconnecting", null);
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
    // ---------------------------------------------------------------- views
    /** Publishes the held data as `stale`. Does nothing when the session holds no data. */
    #publishStale(reason, error) {
        const data = this.#data;
        if (data === undefined)
            return;
        this.#publish({ status: "stale", data, reason, error });
    }
    /**
     *  Publishes a frozen view with the side's names and the next revision. After `close`,
     *  only the `closed` view goes out.
     */
    #publish(fields) {
        // A closed session has said its last word.
        if (this.#closed && fields.status !== "closed")
            return;
        const view = Object.freeze({
            chainId: this.#deps.chainId,
            marginBank: this.#deps.marginBank,
            pool: this.#deps.pool,
            isLong: this.#deps.isLong,
            revision: this.#deps.nextRevision(),
            ...fields,
        });
        this.#view = view;
        this.#deps.publish(view);
    }
}
