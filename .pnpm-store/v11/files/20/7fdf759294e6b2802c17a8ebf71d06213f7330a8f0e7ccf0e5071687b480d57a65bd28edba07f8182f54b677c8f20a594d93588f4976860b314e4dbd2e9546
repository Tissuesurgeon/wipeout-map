// `client.accountBalances`: several accounts' wallet balances, from the chain.
//
// `getSnapshot` reads every account's balance of every token the caller names, at one
// block (`balancesRead.ts`), through the engine's own chain client. Concurrent calls
// for the same accounts and tokens share one read (`registry.ts`). `subscribe` repeats
// that read when the balances can have changed (`balancesSession.ts`), one session per
// set of accounts and tokens.
import { getAddress, isAddress } from "viem";
import { InvalidInputError, RpcError } from "../errors.js";
import * as GraphqlBoundary from "../graphqlBoundary.js";
import * as Raise from "../raise.js";
import * as BalancesRead from "./balancesRead.js";
import * as BalancesSession from "./balancesSession.js";
import * as Freeze from "./freeze.js";
import * as Registry from "./registry.js";
import * as BalancesTypes from "./balancesTypes.js";
/**
 *  The most balances one call reads: accounts × tokens. A larger request is refused
 *  rather than sent as one oversized call.
 *
 * @category account views
 */
export const ACCOUNT_BALANCES_MAX = 1_000;
const OPERATION = "accountBalances.getSnapshot";
const SUBSCRIBE = "accountBalances.subscribe";
function addressOf(value, what, operation) {
    // A JavaScript caller can pass anything, so the type is checked at run time too.
    if (typeof value !== "string" || !isAddress(value, { strict: false })) {
        throw new InvalidInputError(`${operation} needs every ${what} to be an address`);
    }
    return getAddress(value);
}
/** Checks a request and names it. Throws `InvalidInputError`. */
export function requestOf(accounts, tokens, operation) {
    if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new InvalidInputError(`${operation} needs at least one account`);
    }
    if (!Array.isArray(tokens) || tokens.length === 0) {
        throw new InvalidInputError(`${operation} needs at least one token`);
    }
    if (accounts.length * tokens.length > ACCOUNT_BALANCES_MAX) {
        throw new InvalidInputError(`${operation} reads at most ${ACCOUNT_BALANCES_MAX} balances; got ${accounts.length} accounts × ${tokens.length} tokens`);
    }
    const checkedAccounts = accounts.map((account) => addressOf(account, "account", operation));
    const checkedTokens = tokens.map((token) => token === BalancesTypes.NATIVE_BALANCE_TOKEN
        ? BalancesTypes.NATIVE_BALANCE_TOKEN
        : addressOf(token, "token", operation));
    const canonicalAccounts = [...new Set(checkedAccounts)].sort();
    const canonicalTokens = [...new Set(checkedTokens.map(BalancesRead.identityOf))].sort();
    const key = `${canonicalAccounts.join(",")}|${canonicalTokens.join(",")}`.toLowerCase();
    const layoutKey = `${checkedAccounts.join(",")}|${checkedTokens.join(",")}`.toLowerCase();
    return {
        accounts: canonicalAccounts,
        tokens: canonicalTokens,
        key,
        requested: { accounts: checkedAccounts, tokens: checkedTokens },
        layoutKey,
    };
}
/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;
/**
 *  What a finished snapshot read hands its caller, now that the live view of the same
 *  accounts and tokens may have moved on while it ran: the snapshot, or the live view when that is
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
/** The ERC-20 tokens of a request, once each: the ones a `Transfer` can move. */
function erc20sOf(tokens) {
    const seen = new Map();
    for (const token of tokens) {
        const erc20 = BalancesRead.erc20Of(token);
        if (erc20 !== undefined)
            seen.set(erc20.toLowerCase(), erc20);
    }
    return [...seen.values()];
}
/** Builds `client.accountBalances`. One per engine. */
export function createAccountBalancesWithDeps(deps) {
    const flights = new Registry.SingleFlight();
    // One canonical view can serve several layouts. Cache projections with that view,
    // so a snapshot and listeners of the same layout receive the same frozen object.
    // Old views and their projections leave together; nothing is shared across owners.
    const projections = new WeakMap();
    const project = (view, request) => {
        let layouts = projections.get(view);
        const held = layouts?.get(request.layoutKey);
        if (held !== undefined)
            return held;
        const labels = {
            accounts: request.requested.accounts.map((account) => account.toLowerCase()),
            tokens: request.requested.tokens.map((token) => token.toLowerCase()),
        };
        let projected;
        if (view.status === "ready" || view.status === "stale") {
            projected = Freeze.deepFreeze({
                ...view,
                ...labels,
                data: { ...view.data, balances: BalancesRead.projectBalances(request.requested, view.data.balances) },
            });
        }
        else {
            projected = Freeze.deepFreeze({ ...view, ...labels });
        }
        if (layouts === undefined) {
            layouts = new Map();
            projections.set(view, layouts);
        }
        layouts.set(request.layoutKey, projected);
        return projected;
    };
    const nowMs = deps.nowMs ?? Date.now;
    let revision = 0;
    const nextRevision = () => {
        revision += 1;
        return revision;
    };
    const read = async (request, signal) => {
        const result = await BalancesRead.readAccountBalances(request, deps.chain(), signal);
        if (signal.aborted)
            throw signal.reason;
        const snapshot = Freeze.deepFreeze({
            status: "ready",
            chainId: deps.chainId,
            accounts: request.accounts.map((account) => account.toLowerCase()),
            tokens: request.tokens.map((token) => token.toLowerCase()),
            revision: nextRevision(),
            data: {
                balances: [...result.balances],
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
            const request = starting ?? Raise.unreachable("subscribe names a request before it starts a session");
            const tokens = erc20sOf(request.tokens);
            return new BalancesSession.BalancesSession({
                chainId: deps.chainId,
                accounts: request.accounts,
                tokens: request.tokens.map((token) => token.toLowerCase()),
                // Async, so a chain that throws (no transport) rejects the read rather than the caller.
                read: async (signal) => BalancesRead.readAccountBalances(request, deps.chain(), signal),
                // With no ERC-20 there is no transfer to watch; the timer alone keeps it fresh.
                watch: (onLog, onError, onOpen) => tokens.length === 0 ? () => undefined : deps.watch(tokens, request.accounts, onLog, onError, onOpen),
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
    /** One request's snapshot, never older than what its live view's listeners already have. */
    const snapshotOf = async (request, signal) => {
        for (let attempt = 1;; attempt += 1) {
            // A live view that is ready was read at its block, and never older than what its listeners have.
            const current = live.current(request.key);
            if (current?.status === "ready")
                return current;
            const snapshot = await flights.run(request.key, deps.ownerSignal, (flight) => read(request, flight), signal);
            const settled = settle(snapshot, live.current(request.key));
            if (settled !== "readAgain")
                return settled;
            if (attempt === SNAPSHOT_READS) {
                throw new RpcError(OPERATION, "every read answered from an older block than the balances' live view");
            }
        }
    };
    const client = {
        getSnapshot(accounts, tokens, options) {
            try {
                const request = requestOf(accounts, tokens, OPERATION);
                if (options?.signal?.aborted)
                    return Promise.reject(options.signal.reason);
                // The owner closed the client: nothing reads for it any more.
                if (deps.ownerSignal?.aborted === true)
                    return Promise.reject(deps.ownerSignal.reason);
                const linked = GraphqlBoundary.linkSignals(deps.ownerSignal, options?.signal);
                return snapshotOf(request, linked.signal)
                    .then((snapshot) => {
                    // Cancellation also applies when the snapshot came straight from a live view.
                    if (linked.signal?.aborted)
                        throw linked.signal.reason;
                    const projected = project(snapshot, request);
                    if (projected.status !== "ready")
                        return Raise.unreachable("a ready snapshot projects to ready");
                    return projected;
                })
                    .finally(linked.dispose);
            }
            catch (error) {
                return Promise.reject(error);
            }
        },
        subscribe(accounts, tokens, onView) {
            const request = requestOf(accounts, tokens, SUBSCRIBE);
            const value = onView;
            if (typeof value !== "function")
                throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
            // The owner closed the client: no live view starts again.
            if (deps.ownerSignal?.aborted === true) {
                const closed = Freeze.deepFreeze({
                    status: "closed",
                    chainId: deps.chainId,
                    accounts: request.accounts.map((account) => account.toLowerCase()),
                    tokens: request.tokens.map((token) => token.toLowerCase()),
                    revision: nextRevision(),
                });
                return live.deliverOnce(project(closed, request), onView);
            }
            starting = request;
            try {
                return live.subscribe(request.key, (view) => onView(project(view, request)));
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
