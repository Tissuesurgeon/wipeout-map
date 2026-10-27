// `client.perpAdlQueue`: one side of one perp market's ADL queue, from the chain.
//
// `getSnapshot` reads the side at one block (`adl.ts`), through the engine's own chain
// client. Concurrent calls for the same side share one read (`../accountView/registry.ts`).
// `subscribe` repeats that read when the queue can have changed (`adlSession.ts`), one
// session per side. The shape is the account views' (`../accountView/balancesClient.ts`).
import { getAddress, isAddress } from "viem";
import { InvalidInputError, RpcError } from "../errors.js";
import * as Freeze from "../accountView/freeze.js";
import * as Registry from "../accountView/registry.js";
import * as Raise from "../raise.js";
import * as Adl from "./adl.js";
import * as AdlSession from "./adlSession.js";
const OPERATION = "perpAdlQueue.getSnapshot";
const SUBSCRIBE = "perpAdlQueue.subscribe";
/** Checks a side and names it. Throws `InvalidInputError`. The `?.` and the type checks guard untyped callers. */
export function requestOf(ref, operation) {
    const marginBank = typeof ref === "object" && ref !== null ? Reflect.get(ref, "marginBank") : undefined;
    const pool = typeof ref === "object" && ref !== null ? Reflect.get(ref, "pool") : undefined;
    const isLong = typeof ref === "object" && ref !== null ? Reflect.get(ref, "isLong") : undefined;
    if (typeof marginBank !== "string" ||
        !isAddress(marginBank, { strict: false }) ||
        typeof pool !== "string" ||
        !isAddress(pool, { strict: false }) ||
        typeof isLong !== "boolean") {
        throw new InvalidInputError(`${operation} needs a marginBank address, a pool address and an isLong boolean`);
    }
    const checked = { marginBank: getAddress(marginBank), pool: getAddress(pool), isLong };
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
function settle(snapshot, current) {
    if (current?.status !== "ready" && current?.status !== "stale")
        return snapshot;
    if (current.data.blockNumber < snapshot.data.blockNumber)
        return snapshot;
    if (current.status === "ready")
        return current;
    return current.data.blockNumber > snapshot.data.blockNumber ? "readAgain" : snapshot;
}
/** Builds `client.perpAdlQueue`. One per engine. */
export function createPerpAdlQueueWithDeps(deps) {
    const flights = new Registry.SingleFlight();
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
    const read = async (request, signal) => {
        const result = await Adl.readPerpAdlQueue(request.ref, {}, deps.client(), signal);
        if (signal.aborted)
            throw signal.reason;
        const snapshot = Freeze.deepFreeze({
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
    let starting;
    const live = new Registry.LiveViews({
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
    const snapshotOf = async (request, signal) => {
        for (let attempt = 1;; attempt += 1) {
            // A live view that is ready was read at its block, and never older than what its listeners have.
            const current = live.current(request.key);
            if (current?.status === "ready")
                return current;
            const snapshot = await flights.run(request.key, undefined, (flight) => read(request, flight), signal);
            const settled = settle(snapshot, live.current(request.key));
            if (settled !== "readAgain")
                return settled;
            if (attempt === SNAPSHOT_READS) {
                throw new RpcError(OPERATION, "every read answered from an older block than the ADL queue's live view");
            }
        }
    };
    const client = {
        /** See {@link PerpAdlQueueClient.getSnapshot}. Every failure rejects; nothing throws. */
        getSnapshot(ref, options) {
            try {
                const request = requestOf(ref, OPERATION);
                if (options?.signal?.aborted)
                    return Promise.reject(options.signal.reason);
                // The owner closed the client: nothing reads for it any more.
                if (deps.ownerSignal?.aborted === true)
                    return Promise.reject(deps.ownerSignal.reason);
                return snapshotOf(request, options?.signal);
            }
            catch (error) {
                return Promise.reject(error);
            }
        },
        /** See {@link PerpAdlQueueClient.subscribe}. Bad input throws at once. */
        subscribe(ref, onView) {
            const request = requestOf(ref, SUBSCRIBE);
            const value = onView;
            if (typeof value !== "function")
                throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
            // The owner closed the client: no live view starts again.
            if (deps.ownerSignal?.aborted === true) {
                const closed = Freeze.deepFreeze({
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
            }
            finally {
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
