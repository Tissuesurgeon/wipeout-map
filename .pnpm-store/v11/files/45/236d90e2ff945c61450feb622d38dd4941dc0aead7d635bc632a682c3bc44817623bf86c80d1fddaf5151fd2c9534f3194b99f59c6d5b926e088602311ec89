// `client.accountSpotOrders`: one account's resting spot orders, from the chain.
//
// `getSnapshot` reads every spot pool at one block (`spotOrdersRead.ts`), through the
// engine's own chain client. Which pools are spot pools is market metadata from the
// indexer, cached briefly; nothing about the account comes from it. Concurrent calls for
// one account share one read (`registry.ts`), and the orders a read found ride the next
// read's first batch. A live view (`spotOrdersSession.ts`) follows the spot pools' order
// events over the chain socket and reads again the pool an event concerns.
import { getAddress, isAddress } from "viem";
import { IndexerError, InvalidInputError, RpcError } from "../errors.js";
import * as Markets from "../markets.js";
import * as Raise from "../raise.js";
import * as Freeze from "./freeze.js";
import * as PinnedBatch from "./pinnedBatch.js";
import * as Registry from "./registry.js";
import * as SpotOrdersRead from "./spotOrdersRead.js";
import * as SpotOrdersSession from "./spotOrdersSession.js";
const OPERATION = "accountSpotOrders.getSnapshot";
const SUBSCRIBE = "accountSpotOrders.subscribe";
/** How many accounts' order ids are remembered for the next read's first batch. */
const KNOWN_ORDERS_MAX = 256;
/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;
function accountOf(value, operation) {
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
function settle(snapshot, current) {
    if (current?.status !== "ready" && current?.status !== "stale")
        return snapshot;
    if (current.data.blockNumber < snapshot.data.blockNumber)
        return snapshot;
    if (current.status === "ready")
        return current;
    return current.data.blockNumber > snapshot.data.blockNumber ? "readAgain" : snapshot;
}
/** Builds `client.accountSpotOrders`. One per engine. */
export function createAccountSpotOrdersWithDeps(deps) {
    const flights = new Registry.SingleFlight();
    /** What the newest read of each of an account's pools found, and its block, by account. */
    const knownOrders = new Map();
    const nowMs = deps.nowMs ?? Date.now;
    let revision = 0;
    const nextRevision = () => {
        revision += 1;
        return revision;
    };
    const remember = (key, result) => {
        const held = knownOrders.get(key) ?? new Map();
        for (const [pool, settled] of result.byPool) {
            // A read that started earlier can land later. What it found is older, and must not
            // replace what a newer read found. A pool that could not be read keeps what it had.
            const before = held.get(pool);
            if (!settled.ok || (before !== undefined && result.blockNumber < before.blockNumber))
                continue;
            held.set(pool, { orderIds: settled.orderIds, blockNumber: result.blockNumber });
        }
        knownOrders.delete(key);
        knownOrders.set(key, held);
        // Oldest first: a Map iterates in insertion order.
        if (knownOrders.size > KNOWN_ORDERS_MAX) {
            const oldest = knownOrders.keys().next();
            if (!oldest.done)
                knownOrders.delete(oldest.value);
        }
    };
    /**
     *  One read of `pools`, or of every spot pool when `pools` is `null`, with what a
     *  previous read found.
     */
    const readAccount = async (account, pools, known, signal) => {
        const key = account.toLowerCase();
        // The session matches events by lower-case pool, so a list in another case must not
        // leave it unable to match its own orders.
        let targets = pools;
        if (targets === null) {
            const discovered = await deps.spotPools(signal);
            PinnedBatch.stopIfAborted(signal);
            // Readonly arrays do not narrow with Array.isArray; the named field proves the result shape.
            if ("pools" in discovered)
                targets = discovered.pools.map(Markets.lower0x);
            else {
                if (discovered.length === 0) {
                    throw new IndexerError("PoolsByType", "empty spot pool discovery does not prove an empty pool universe");
                }
                targets = discovered.map(Markets.lower0x);
            }
        }
        PinnedBatch.stopIfAborted(signal);
        const knownIds = known ?? new Map([...(knownOrders.get(key) ?? [])].map(([pool, entry]) => [pool, entry.orderIds]));
        const result = await SpotOrdersRead.readAccountSpotOrders({ account, pools: targets, knownOrders: knownIds }, deps.chain(), signal);
        remember(key, result);
        return result;
    };
    const read = async (account, signal) => {
        const result = await readAccount(account, null, undefined, signal);
        if (signal.aborted)
            throw signal.reason;
        // A read that could read no pool learned nothing: it fails rather than show no orders.
        const failure = SpotOrdersRead.nothingRead(result);
        if (failure !== undefined)
            throw failure;
        const { orders, unreadPools } = SpotOrdersRead.viewOf(result.byPool);
        const snapshot = Freeze.deepFreeze({
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
    let starting;
    const live = new Registry.LiveViews({
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
    const snapshotOf = async (account, signal) => {
        const key = account.toLowerCase();
        const lifecycle = deps.lifecycle?.() ?? deps.ownerSignal;
        for (let attempt = 1;; attempt += 1) {
            // A live view that is ready was read at its block, and never older than what its listeners have.
            const current = live.current(key);
            if (current?.status === "ready")
                return current;
            const snapshot = await flights.run(key, lifecycle, (flight) => read(account, flight), signal);
            const settled = settle(snapshot, live.current(key));
            if (settled !== "readAgain")
                return settled;
            if (attempt === SNAPSHOT_READS) {
                throw new RpcError(OPERATION, "every read answered from an older block than the account's live view");
            }
        }
    };
    const client = {
        getSnapshot(accountInput, options) {
            try {
                const account = accountOf(accountInput, OPERATION);
                if (options?.signal?.aborted)
                    return Promise.reject(options.signal.reason);
                // The owner closed the client: nothing reads for it any more.
                if (deps.ownerSignal?.aborted === true)
                    return Promise.reject(deps.ownerSignal.reason);
                return snapshotOf(account, options?.signal);
            }
            catch (error) {
                return Promise.reject(error);
            }
        },
        subscribe(accountInput, onView) {
            const account = accountOf(accountInput, SUBSCRIBE);
            const value = onView;
            if (typeof value !== "function")
                throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
            // The owner closed the client: no live view starts again.
            if (deps.ownerSignal?.aborted === true) {
                const closed = Object.freeze({
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
            }
            finally {
                starting = undefined;
            }
        },
    };
    const stopLive = () => live.closeAll();
    // The owner's close ends live views too, so no session reads for a closed client.
    deps.ownerSignal?.addEventListener("abort", stopLive, { once: true });
    return { client, stopLive };
}
