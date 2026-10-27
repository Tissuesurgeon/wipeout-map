// `client.accountPositions`: one account's open perp positions, resting orders and
// margin, from the chain.
//
// `getSnapshot` reads the account in one MarginBank at one block (`positionsRead.ts`),
// through the engine's own chain client. Concurrent calls for one account share one
// read (`registry.ts`), and the pools and orders a read found ride the next read's
// first batch.
//
// The chain adapter below maps the read's three calls onto viem: the head, one
// Multicall3 `aggregate3` when the chain declares one at that block, and a plain
// `eth_call` otherwise.
import { ChainDoesNotSupportContract, getAddress, getChainContractAddress, isAddress, multicall3Abi, } from "viem";
import { InvalidInputError, RpcError } from "../errors.js";
import * as Raise from "../raise.js";
import { deepFreeze } from "./freeze.js";
import * as PositionsPush from "./positionsPush.js";
import * as PositionsRead from "./positionsRead.js";
import * as PositionsSession from "./positionsSession.js";
import * as Registry from "./registry.js";
const OPERATION = "accountPositions.getSnapshot";
const SUBSCRIBE = "accountPositions.subscribe";
/** How many accounts' pool lists are remembered for the next read's first batch. */
const KNOWN_POOLS_MAX = 256;
function addressOf(value, name, operation) {
    // A JavaScript caller can pass anything, so the type is checked at run time too.
    if (typeof value !== "string" || !isAddress(value, { strict: false })) {
        throw new InvalidInputError(`${operation} needs ${name} to be an address`);
    }
    return getAddress(value);
}
function keyOf(marginBank, account) {
    return `${marginBank.toLowerCase()}:${account.toLowerCase()}`;
}
/** The most reads one `getSnapshot` makes while the live view keeps moving past them. */
const SNAPSHOT_READS = 2;
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
/** Builds `client.accountPositions`. One per engine. */
export function createAccountPositionsWithDeps(deps) {
    const flights = new Registry.SingleFlight();
    /** What the newest read of each account found, and its block. */
    const knownStates = new Map();
    const nowMs = deps.nowMs ?? Date.now;
    let revision = 0;
    const nextRevision = () => {
        revision += 1;
        return revision;
    };
    const remember = (key, result) => {
        // A read that started earlier can land later. What it found is older, and must not
        // replace what a newer read found.
        const held = knownStates.get(key);
        if (held !== undefined && result.blockNumber < held.blockNumber)
            return;
        knownStates.delete(key);
        knownStates.set(key, {
            state: { pools: result.pools, orderIds: result.orderIds },
            blockNumber: result.blockNumber,
        });
        // Oldest first: a Map iterates in insertion order.
        if (knownStates.size > KNOWN_POOLS_MAX) {
            const oldest = knownStates.keys().next();
            if (!oldest.done)
                knownStates.delete(oldest.value);
        }
    };
    /** A read of one account in one bank, with what a previous read found. */
    const inputOf = (marginBank, account, known) => ({
        account,
        marginBanks: [marginBank],
        ...(known === undefined ? {} : { knownPools: known.pools, knownOrders: known.orderIds }),
    });
    const read = async (marginBank, account, signal) => {
        const key = keyOf(marginBank, account);
        const result = await PositionsRead.readAccountPositions(inputOf(marginBank, account, knownStates.get(key)?.state), deps.chain(), signal);
        remember(key, result);
        if (signal.aborted)
            throw signal.reason;
        const snapshot = deepFreeze({
            status: "ready",
            chainId: deps.chainId,
            marginBank: marginBank.toLowerCase(),
            account: account.toLowerCase(),
            revision: nextRevision(),
            data: {
                positions: [...result.positions],
                orders: result.orders,
                margin: result.margins[0] ?? Raise.unreachable("a read of one bank returns its margin"),
                blockNumber: result.blockNumber,
                observedAtMs: nowMs(),
            },
        });
        return snapshot;
    };
    // One live session per bank and account. The key carries both, lower-cased.
    // `subscribe` names the bank and account its session is built for; `createSession`
    // runs inside that same call, so nothing else can take its place.
    let starting;
    const watchPushes = deps.watchPushes;
    const live = new Registry.LiveViews({
        createSession: (key, publish) => {
            const target = starting ?? Raise.unreachable("subscribe names a bank and an account before it starts a session");
            const session = new PositionsSession.PositionsSession({
                chainId: deps.chainId,
                marginBank: target.marginBank,
                account: target.account,
                read: async (known, signal) => {
                    const result = await PositionsRead.readAccountPositions(inputOf(target.marginBank, target.account, known ?? knownStates.get(key)?.state), deps.chain(), signal);
                    remember(key, result);
                    return result;
                },
                watch: (onLog, onError, onOpen) => deps.watch(target.marginBank, target.account, onLog, onError, onOpen),
                ...(watchPushes === undefined
                    ? {}
                    : {
                        push: (pushTarget, handlers) => {
                            const multicall = deps.chain().multicall(pushTarget.blockNumber);
                            if (multicall === undefined)
                                return undefined;
                            return PositionsPush.openPush({
                                account: target.account,
                                marginBank: target.marginBank,
                                pools: pushTarget.pools,
                                orderIds: pushTarget.orderIds,
                                multicall,
                                priceFeed: pushTarget.withPrice ? deps.priceFeed : undefined,
                            }, watchPushes, handlers);
                        },
                    }),
                publish,
                nextRevision,
                nowMs,
                backoffMs: deps.backoffMs,
                warn: deps.warn,
            });
            return session;
        },
        warn: deps.warn,
        onIdle: () => undefined,
        ...(deps.lingerMs === undefined ? {} : { lingerMs: deps.lingerMs }),
    });
    /** One account's snapshot, never older than what its live view's listeners already have. */
    const snapshotOf = async (marginBank, account, signal) => {
        const key = keyOf(marginBank, account);
        for (let attempt = 1;; attempt += 1) {
            // A live view that is ready was read at its block, and never older than what its listeners have.
            const current = live.current(key);
            if (current?.status === "ready")
                return current;
            const snapshot = await flights.run(key, undefined, (flight) => read(marginBank, account, flight), signal);
            const settled = settle(snapshot, live.current(key));
            if (settled !== "readAgain")
                return settled;
            if (attempt === SNAPSHOT_READS) {
                throw new RpcError(OPERATION, "every read answered from an older block than the account's live view");
            }
        }
    };
    const client = {
        getSnapshot(bankInput, accountInput, options) {
            try {
                const marginBank = addressOf(bankInput, "marginBank", OPERATION);
                const account = addressOf(accountInput, "account", OPERATION);
                if (options?.signal?.aborted)
                    return Promise.reject(options.signal.reason);
                // The owner closed the client: nothing reads for it any more.
                if (deps.ownerSignal?.aborted === true)
                    return Promise.reject(deps.ownerSignal.reason);
                return snapshotOf(marginBank, account, options?.signal);
            }
            catch (error) {
                return Promise.reject(error);
            }
        },
        subscribe(bankInput, accountInput, onView) {
            const marginBank = addressOf(bankInput, "marginBank", SUBSCRIBE);
            const account = addressOf(accountInput, "account", SUBSCRIBE);
            const value = onView;
            if (typeof value !== "function")
                throw new InvalidInputError(`${SUBSCRIBE} needs an onView function`);
            // The owner closed the client: no live view starts again.
            if (deps.ownerSignal?.aborted === true) {
                const closed = Object.freeze({
                    status: "closed",
                    chainId: deps.chainId,
                    marginBank: marginBank.toLowerCase(),
                    account: account.toLowerCase(),
                    revision: nextRevision(),
                });
                return live.deliverOnce(closed, onView);
            }
            starting = { marginBank, account };
            try {
                return live.subscribe(keyOf(marginBank, account), onView);
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
/** The pinned-batch chain calls, on the engine's viem client. */
export function chainOf(client) {
    return {
        // Uncached: viem reuses a head for up to its cache time, 500 ms on Somnia, and a read
        // pinned there misses the change that asked for it.
        blockNumber: () => client.getBlockNumber({ cacheTime: 0 }),
        multicall: (blockNumber) => {
            if (client.chain === undefined)
                return undefined;
            try {
                // Throws when the chain declares no Multicall3, or one deployed after this block.
                return getChainContractAddress({ chain: client.chain, contract: "multicall3", blockNumber });
            }
            catch (error) {
                if (error instanceof ChainDoesNotSupportContract)
                    return undefined;
                throw error;
            }
        },
        aggregate: (multicall, calls, blockNumber) => client.readContract({
            address: multicall,
            abi: multicall3Abi,
            functionName: "aggregate3",
            args: [calls.map(({ target, callData }) => ({ target, allowFailure: true, callData }))],
            blockNumber,
        }),
        call: async (target, callData, blockNumber, from) => {
            const { data } = await client.call({
                to: target,
                data: callData,
                blockNumber,
                ...(from === undefined ? {} : { account: from }),
            });
            // An empty return is `undefined` here; decoding it fails, as an empty return should.
            return data ?? "0x";
        },
        balance: (account, blockNumber) => client.getBalance({ address: account, blockNumber }),
    };
}
