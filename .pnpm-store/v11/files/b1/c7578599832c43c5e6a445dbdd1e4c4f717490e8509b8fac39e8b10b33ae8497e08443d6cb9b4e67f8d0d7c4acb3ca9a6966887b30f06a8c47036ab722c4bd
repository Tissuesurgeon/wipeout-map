// `client.accountOrders`: one account's complete open orders and pending stops.
//
// `getSnapshot` reads the account through the guarded snapshot (`guardedSnapshot.ts`),
// maps the rows (`rows.ts`) and adds each stop's venue and limit price
// (`enrichment.ts`). It subscribes to nothing. Concurrent calls for one account share
// one read (`registry.ts`).
//
// `subscribe` runs one live session per account (`session.ts`), shared by every
// listener of that account (`registry.ts`), over one stream connection per engine
// (`graphqlWs.ts`). The connection opens with the first session and closes after the
// last one. On a client with a chain socket, each session's stops also follow the
// stop registries' events (`chainStops.ts`), ahead of the indexer.
//
// Every read belongs to the engine's live-read lifecycle, as the live tail's reads do.
// `stopLive()` ends a read in flight, which then rejects with `IndexerUnavailableError`
// `live-reset`, and the client stays usable. The reads never send `indexerHeaders`:
// the producer proves the account view's limits for the public role only.
import { isAddress } from "viem";
import { AccountViewError, IndexerUnavailableError, InvalidInputError, NotConfiguredError } from "../errors.js";
import * as GraphqlBoundary from "../graphqlBoundary.js";
import * as GraphqlWs from "../graphqlWs.js";
import * as IndexerRead from "../indexerRead.js";
import * as Pools from "../pools.js";
import * as Raise from "../raise.js";
import * as ChainStops from "./chainStops.js";
import * as Enrichment from "./enrichment.js";
import * as Snapshot from "./guardedSnapshot.js";
import * as Outcomes from "./outcomes.js";
import * as Reads from "./reads.js";
import * as Registry from "./registry.js";
import * as Rows from "./rows.js";
import * as Session from "./session.js";
import * as Streams from "./streams.js";
const OPERATION = "accountOrders.getSnapshot";
const SUBSCRIBE = "accountOrders.subscribe";
/** Whether a live view is still reading the stop's venue or limit price. */
function isPending(stop) {
    return stop.venue.status === "pending" || stop.limitPrice.status === "pending";
}
/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;
/**
 *  What a finished snapshot read hands its caller, now that the live view of the same
 *  account may have moved on while it ran: the snapshot, or the live view when that is
 *  at least as new and complete. A snapshot older than what the live view's listeners
 *  already have is never handed back, because a caller that replaces its value with
 *  each result would go back in time.
 */
function settle(snapshot, current) {
    if (snapshot.status !== "ready" || (current?.status !== "ready" && current?.status !== "stale"))
        return snapshot;
    const live = current.data.version;
    const read = snapshot.data.version;
    // Blocks of two dataset generations do not compare; a new read sees the current one.
    if (live.datasetGeneration !== read.datasetGeneration)
        return { readAgain: "generation" };
    if (live.blockNumber < read.blockNumber)
        return snapshot;
    if (current.status === "ready" && !current.data.stops.some(isPending))
        return current;
    return live.blockNumber > read.blockNumber ? { readAgain: "older" } : snapshot;
}
function accountOf(account, operation) {
    // A JavaScript caller can pass anything, so the type is checked at run time too.
    const value = account;
    if (typeof value !== "string" || !isAddress(value, { strict: false })) {
        throw new InvalidInputError(`${operation} needs account to be an address`);
    }
    // Owners are stored lower-cased, and the owner filter is case-sensitive.
    return value.toLowerCase();
}
/** Builds `client.accountOrders`. One per engine. */
export function createAccountOrdersWithDeps(deps) {
    const registry = new Registry.AccountViewRegistry();
    const deadlineMs = deps.enrichmentDeadlineMs ?? Enrichment.ENRICHMENT_DEADLINE_MS;
    const nowMs = deps.nowMs ?? Date.now;
    const base = (account) => ({ chainId: deps.chainId, account, revision: registry.nextRevision() });
    /** The dataset generation of the chain's last read. Knowing it saves the next read one request. */
    let knownGeneration = null;
    /**
     *  Reads one guarded snapshot. Every request of it uses `context`, the context taken
     *  when it started, so a read that spans `stopLive()` cannot finish on the next lifecycle.
     */
    const guarded = async (account, context, signal) => {
        const reader = Reads.createSnapshotReader({ chainId: deps.chainId, context: () => context, nowNs: Reads.nowNs }, signal);
        const result = await Snapshot.guardedAccountSnapshot(account, reader, {
            chainId: deps.chainId,
            maxAttempts: Outcomes.MAX_ATTEMPTS,
            // A generation that has moved on costs the read the request it would make anyway.
            datasetGeneration: knownGeneration,
        });
        if (result.status !== "source_unavailable")
            knownGeneration = result.capability.datasetGeneration;
        return result;
    };
    const toSnapshot = async (account, result, context, signal) => {
        if (result.status === "source_unavailable") {
            const outcome = Outcomes.unavailableOutcome(result, OPERATION, deps.chainId);
            if (outcome.kind === "error")
                throw outcome.error;
            return Object.freeze({ ...base(account), status: "unavailable", reason: outcome.reason, detail: outcome.detail });
        }
        if (result.status === "resource_limit") {
            return Object.freeze({
                ...base(account),
                status: "tooLarge",
                collection: Outcomes.collectionOf(result.collection),
                capacity: result.capacity,
                earliestExpiryNs: result.earliestExpiryNs,
            });
        }
        const { capability, version } = result;
        const orders = Rows.byId(result.orders.map((row) => Rows.toAccountOrder(row.id, row.owner, row)));
        const terms = result.stops.map((row) => Rows.toStopTerms(row.id, row.owner, row));
        // Enrichment stops with the caller's read and with the live-read lifecycle.
        const linked = GraphqlBoundary.linkSignals(signal, context.signal);
        const enriched = await Enrichment.enrichStops(terms, capability.datasetGeneration, {
            context,
            poolTypes: Pools.poolMarketTypes,
            readPerpStops: deps.readPerpStops,
            limitPrices: registry.limitPrices,
            deadlineMs,
        }, linked.signal ?? Raise.unreachable("the read's own signal is always set")).finally(linked.dispose);
        const data = Object.freeze({
            orders,
            stops: Rows.byId(enriched),
            version: Outcomes.versionOf(version),
            // The guard did not move during the read, so the version is the newest one the
            // producer had published when the read ended.
            sync: Object.freeze({
                caughtUp: true,
                latestGuardBlock: version.blockHash === null ? null : BigInt(version.blockNumber),
                processedHeight: result.processedHeight,
                chainStopsBlock: null,
            }),
            coverage: Outcomes.coverageOf(capability, deps.chainId),
            expiryCutoffNs: result.expiryCutoffNs,
            source: Outcomes.sourceOf(capability),
            observedAtMs: nowMs(),
        });
        return Object.freeze({ ...base(account), status: "ready", data });
    };
    const read = async (account, context, signal) => {
        const lifecycle = context.signal;
        try {
            const result = await guarded(account, context, signal);
            const snapshot = await toSnapshot(account, result, context, signal);
            // `stopLive()` also closes the chain socket, which a limit-price read reports as
            // a failed read. A read the lifecycle ended must not resolve with that as data.
            if (lifecycle?.aborted === true)
                throw lifecycle.reason;
            return snapshot;
        }
        catch (error) {
            if (lifecycle?.aborted === true &&
                deps.ownerSignal?.aborted !== true &&
                !(error instanceof IndexerUnavailableError)) {
                throw deps.liveReset(OPERATION);
            }
            throw error;
        }
    };
    // ---------------------------------------------------------------- live views
    const openConnection = deps.openConnection ??
        ((url, signal) => GraphqlWs.GraphqlWsConnection.open(url, {
            signal,
            onSinkError: (error) => deps.warn("an account stream frame handler threw", { error }),
        }));
    /** Aborts opens that `stopLive()` made pointless. */
    let lifecycle = new AbortController();
    let connection;
    let opening;
    const streamConnection = () => {
        if (connection !== undefined && connection.failure === undefined)
            return Promise.resolve(connection);
        const url = deps.wsUrl ?? Raise.unreachable("subscribe refuses a client without a WebSocket endpoint");
        if (opening !== undefined)
            return opening;
        const signal = lifecycle.signal;
        const started = openConnection(url, signal).then((opened) => {
            // `stopLive()` ran while the socket opened, or the last session left: nothing
            // wants it any more. Kept, it would stay open with no session to close it.
            if (signal.aborted || live.size === 0) {
                opened.close();
                throw deps.liveReset(SUBSCRIBE);
            }
            connection = opened;
            return opened;
        }, (error) => {
            if (signal.aborted)
                throw deps.liveReset(SUBSCRIBE);
            throw error;
        });
        opening = started;
        const forget = () => {
            if (opening === started)
                opening = undefined;
        };
        started.then(forget, forget);
        return started;
    };
    const closeConnection = () => {
        connection?.close();
        connection = undefined;
    };
    /** Adds the venue and the limit price to a live view's stops. */
    const enrich = (stops, generation, signal) => {
        const context = deps.context();
        const linked = GraphqlBoundary.linkSignals(signal, context.signal);
        return Enrichment.enrichStops(stops, generation, {
            context,
            poolTypes: Pools.poolMarketTypes,
            readPerpStops: deps.readPerpStops,
            limitPrices: registry.limitPrices,
            deadlineMs,
        }, linked.signal ?? Raise.unreachable("the session's own signal is always set")).finally(linked.dispose);
    };
    /** The indexer's live session of `account`. */
    const indexerSession = (account, publish) => new Session.AccountSession({
        chainId: deps.chainId,
        account,
        readSnapshot: (signal) => guarded(account, deps.context(), signal),
        readChildren: (batchIds, limits, signal) => IndexerRead.gqlRequest(Streams.AccountChangeChildrenQuery, { batchIds: [...batchIds], orderChildLimit: limits.orders, stopChildLimit: limits.stops }, deps.context(), undefined, { signal }),
        connection: streamConnection,
        enrich,
        publish,
        nextRevision: () => registry.nextRevision(),
        nowMs,
        backoffMs: deps.backoffMs,
        warn: deps.warn,
    });
    const chainStops = deps.chainStops;
    const live = new Registry.LiveViews({
        createSession: (account, publish) => chainStops === undefined
            ? indexerSession(account, publish)
            : new ChainStops.ChainStopsSession({
                ...chainStops,
                account,
                indexer: (indexerPublish) => indexerSession(account, indexerPublish),
                enrich,
                publish,
                nextRevision: () => registry.nextRevision(),
                nowMs,
                backoffMs: deps.backoffMs,
                warn: deps.warn,
            }),
        warn: deps.warn,
        onIdle: closeConnection,
        ...(deps.lingerMs === undefined ? {} : { lingerMs: deps.lingerMs }),
    });
    const stopLive = () => {
        lifecycle.abort();
        lifecycle = new AbortController();
        live.closeAll();
        closeConnection();
    };
    // The owner's close ends live views too, so no session retries against a closed client.
    deps.ownerSignal?.addEventListener("abort", stopLive, { once: true });
    const client = {
        async getSnapshot(input, options) {
            const account = accountOf(input, OPERATION);
            if (options?.signal?.aborted)
                throw options.signal.reason;
            // The owner closed the client: nothing reads for it any more.
            if (deps.ownerSignal?.aborted === true)
                throw deps.ownerSignal.reason;
            for (let attempt = 1;; attempt += 1) {
                // A live view that is ready is already complete at its version, and never older
                // than what its listeners have. One that still reads a stop's values is not what
                // a snapshot returns: a snapshot is never `pending`.
                const current = live.current(account);
                if (current?.status === "ready" && !current.data.stops.some(isPending))
                    return current;
                const context = deps.context();
                const snapshot = await registry.snapshots.run(account, context.signal, (signal) => read(account, context, signal), options?.signal);
                const settled = settle(snapshot, live.current(account));
                if (!("readAgain" in settled))
                    return settled;
                if (attempt < SNAPSHOT_READS)
                    continue;
                // The live view has not caught up with a new dataset yet; the read is the newer state.
                if (settled.readAgain === "generation")
                    return snapshot;
                throw new AccountViewError(OPERATION, "snapshotUnstable", "every read answered with an older version than the account's live view", { chainId: deps.chainId });
            }
        },
        subscribe(input, onView) {
            const account = accountOf(input, SUBSCRIBE);
            if (typeof onView !== "function")
                throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
            // The owner closed the client: no live view starts again.
            if (deps.ownerSignal?.aborted === true) {
                return live.deliverOnce(Object.freeze({ status: "closed", ...base(account) }), onView);
            }
            if (!deps.context().url)
                throw new NotConfiguredError("config.indexerUrl", "account-view live updates");
            if (deps.wsUrl === undefined) {
                throw new NotConfiguredError("config.indexerWsUrl", "account-view live updates (indexerUrl is not an absolute http(s) URL)");
            }
            return live.subscribe(account, onView);
        },
    };
    return { client, stopLive };
}
