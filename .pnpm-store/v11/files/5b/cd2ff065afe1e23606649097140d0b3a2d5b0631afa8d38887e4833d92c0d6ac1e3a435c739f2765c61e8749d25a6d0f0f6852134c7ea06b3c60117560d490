// One account's perp positions and margin, read from the chain at one block.
//
// The MarginBank keeps the account's own list of the pools it is active in, so the
// chain answers "which positions" completely: unlisted and restricted pools, and
// positions the account never opened itself (ADL, transfers), are all on it. Every
// mark-dependent figure only exists on the chain. So this read needs no indexer.
//
// Everything is pinned to one block, so the rows describe one state: a fill between two
// reads would otherwise pair a new size with an old mark. The reads go out as two
// Multicall3 batches at that block: first the account's state in each bank (which names
// its pools), then the pools. Pools already known from a previous read ride the first
// batch, so a steady view costs one batch. Where the chain has no usable Multicall3,
// the same calls go out one by one, still at that block.
//
// A failed member degrades its own figure. Only a read that makes the LIST incomplete
// fails the whole read: the account state or a position itself, because a position
// that cannot be read cannot be shown, and a shortened list must never look complete.
//
// The same pools hold the account's resting orders: the bank lists a pool where the
// account only has orders too. A pool's `getOwnOpenOrders` answers for its caller, so
// it goes out as one direct call per pool, sent as the account, never through
// Multicall3 (which would ask for Multicall3's own orders). The orders' details then
// ride a batch; ids already known from a previous read ride the first one. An order
// list that cannot be read in full is unknown, and the positions still stand.
import { decodeFunctionResult, encodeFunctionData } from "viem";
import { RpcError } from "../errors.js";
import * as Margin from "../perp/margin.js";
import * as Raise from "../raise.js";
import * as ReadsAbi from "../readsAbi.js";
import * as Canonical from "./canonical.js";
import * as PinnedBatch from "./pinnedBatch.js";
import * as PoolOrders from "./poolOrders.js";
// ---------------------------------------------------------------- the calls
const bankAbi = ReadsAbi.marginBankReadAbi;
const poolAbi = ReadsAbi.perpPoolReadAbi;
function accountStateCall(bank, account) {
    const request = { abi: bankAbi, functionName: "getAccountState", args: [account] };
    return {
        target: bank,
        functionName: request.functionName,
        callData: encodeFunctionData(request),
        decode: (data) => decodeFunctionResult({ abi: bankAbi, functionName: request.functionName, data }),
    };
}
function accountHealthCall(bank, account) {
    const request = { abi: bankAbi, functionName: "getAccountHealth", args: [account] };
    return {
        target: bank,
        functionName: request.functionName,
        callData: encodeFunctionData(request),
        decode: (data) => {
            const [equity, imReq, mmReq, cmReq] = decodeFunctionResult({
                abi: bankAbi,
                functionName: request.functionName,
                data,
            });
            return { equity, imReq, mmReq, cmReq };
        },
    };
}
function withdrawableCall(bank, account) {
    const request = { abi: bankAbi, functionName: "getWithdrawableCollateral", args: [account] };
    return {
        target: bank,
        functionName: request.functionName,
        callData: encodeFunctionData(request),
        decode: (data) => decodeFunctionResult({ abi: bankAbi, functionName: request.functionName, data }),
    };
}
function marginStatusCall(bank, account) {
    const request = { abi: bankAbi, functionName: "getMarginStatus", args: [account] };
    return {
        target: bank,
        functionName: request.functionName,
        callData: encodeFunctionData(request),
        decode: (data) => {
            const raw = decodeFunctionResult({ abi: bankAbi, functionName: request.functionName, data });
            // An enum value this SDK does not know is not "Healthy".
            return (Margin.MARGIN_STATUS[raw] ??
                Raise.raise(new RpcError(request.functionName, `unrecognised margin status ${raw}`)));
        },
    };
}
function surchargeCall(bank, account) {
    const request = { abi: bankAbi, functionName: "getLeverageImSurcharge", args: [account] };
    return {
        target: bank,
        functionName: request.functionName,
        callData: encodeFunctionData(request),
        decode: (data) => decodeFunctionResult({ abi: bankAbi, functionName: request.functionName, data }),
    };
}
function positionCall(bank, account, pool) {
    const request = { abi: bankAbi, functionName: "getPosition", args: [account, pool] };
    return {
        target: bank,
        functionName: request.functionName,
        callData: encodeFunctionData(request),
        decode: (data) => decodeFunctionResult({ abi: bankAbi, functionName: request.functionName, data }),
    };
}
function leverageCapCall(bank, account, pool) {
    const request = { abi: bankAbi, functionName: "getMaxLeverage", args: [account, pool] };
    return {
        target: bank,
        functionName: request.functionName,
        callData: encodeFunctionData(request),
        decode: (data) => decodeFunctionResult({ abi: bankAbi, functionName: request.functionName, data }),
    };
}
function healthSnapshotCall(pool) {
    const request = { abi: poolAbi, functionName: "tryGetHealthSnapshot" };
    return {
        target: pool,
        functionName: request.functionName,
        callData: encodeFunctionData(request),
        decode: (data) => decodeFunctionResult({ abi: poolAbi, functionName: request.functionName, data }),
    };
}
function poolKey(bank, pool) {
    return `${bank.toLowerCase()}:${pool.toLowerCase()}`;
}
function orderKey(poolKeyed, orderId) {
    return `${poolKeyed}:${orderId}`;
}
function addPool(batch, account, bank, pool) {
    return {
        position: batch.add(positionCall(bank, account, pool)),
        snapshot: batch.add(healthSnapshotCall(pool)),
        leverageCap: batch.add(leverageCapCall(bank, account, pool)),
    };
}
function figureOf(settled) {
    return settled.ok
        ? { status: "known", value: settled.value }
        : { status: "unknown", reason: "readFailed", error: settled.error };
}
/** The value of a read the list cannot do without. Its failure fails the whole read. */
function required(settled) {
    if (settled.ok)
        return settled.value;
    throw settled.error;
}
/**
 *  A read's first batch: each bank's account-level calls, then the pools already known,
 *  then the details of their orders already known.
 */
function firstBatchOf(input) {
    const { account } = input;
    const batch = new PinnedBatch.Batch();
    const banks = input.marginBanks.map((bank) => ({
        bank,
        state: batch.add(accountStateCall(bank, account)),
        health: batch.add(accountHealthCall(bank, account)),
        withdrawable: batch.add(withdrawableCall(bank, account)),
        marginStatus: batch.add(marginStatusCall(bank, account)),
        surcharge: batch.add(surchargeCall(bank, account)),
    }));
    const pools = new Map();
    const orders = new Map();
    for (const { key, bank, pool } of knownPoolList(input)) {
        pools.set(key, addPool(batch, account, bank, pool));
        for (const orderId of input.knownOrders?.get(key) ?? []) {
            orders.set(orderKey(key, orderId), batch.add(PoolOrders.orderCall(pool, orderId)));
        }
    }
    return { batch, banks, pools, orders };
}
/** The pools `input.knownPools` names, in bank order: the order a push asks for their order ids. */
export function knownPoolList(input) {
    return input.marginBanks.flatMap((bank) => (input.knownPools?.get(bank.toLowerCase()) ?? []).map((pool) => ({ key: poolKey(bank, pool), bank, pool })));
}
/** Each bank's account state, from a settled first batch. An unreadable one fails the read. */
function statesOf(first) {
    return first.banks.map((slots) => ({ slots, state: required(slots.state.result) }));
}
/** The pools the banks list for the account. */
function listedPoolsOf(states) {
    return states.flatMap(({ slots, state }) => state.activePerpPools.map((pool) => ({ key: poolKey(slots.bank, pool), bank: slots.bank, pool })));
}
/**
 *  Reads one account's open perp positions, resting orders and margin in the given
 *  banks, at one block.
 *
 *  Rejects with the read's error when the account state or a position cannot be read,
 *  because the list would then be incomplete. An order list that cannot be read in full
 *  is unknown. Every other failure makes one figure unknown. Rejects with `signal`'s
 *  reason once it aborts, before the next call.
 */
export async function readAccountPositions(input, chain, signal) {
    PinnedBatch.stopIfAborted(signal);
    const blockNumber = await chain.blockNumber();
    const first = firstBatchOf(input);
    await first.batch.run(chain, blockNumber, signal);
    const states = statesOf(first);
    const listed = listedPoolsOf(states);
    const second = new PinnedBatch.Batch();
    for (const { key, bank, pool } of listed) {
        if (!first.pools.has(key))
            first.pools.set(key, addPool(second, input.account, bank, pool));
    }
    // The new pools and every pool's order ids do not wait on each other.
    const [, ids] = await Promise.all([
        second.run(chain, blockNumber, signal),
        PoolOrders.readOrderIds(chain, input.account, listed, blockNumber, signal),
    ]);
    const third = new PinnedBatch.Batch();
    for (const { key, pool } of listed) {
        const settled = ids.get(key);
        if (settled?.ok !== true)
            continue;
        for (const orderId of settled.value) {
            const keyed = orderKey(key, orderId);
            if (!first.orders.has(keyed))
                first.orders.set(keyed, third.add(PoolOrders.orderCall(pool, orderId)));
        }
    }
    await third.run(chain, blockNumber, signal);
    return assemble(input.account, states, first, ids, blockNumber);
}
/**
 *  The calls of a read whose pools and orders are already known, as Multicall3
 *  `aggregate3` members on `multicall`. {@link readFromResults} reads their results in
 *  this order. The pools' order ids are not among them: see {@link knownPoolList}.
 */
export function knownPoolCalls(input, multicall) {
    return firstBatchOf(input).batch.members(multicall);
}
/**
 *  Completes a read from the results of {@link knownPoolCalls} and the order ids of
 *  {@link knownPoolList}, made at `blockNumber`.
 *
 *  Only a full read is complete when the results miss a pool or an order: that is
 *  `poolsChanged` or `ordersChanged`. Throws as {@link readAccountPositions} rejects, and
 *  `RpcError` when the number of results is not the number of calls.
 */
export function readFromResults(input, results, ids, blockNumber) {
    const first = firstBatchOf(input);
    first.batch.settle(results);
    const states = statesOf(first);
    const listed = listedPoolsOf(states);
    for (const { key } of listed) {
        if (!first.pools.has(key) || !ids.has(key))
            return { kind: "poolsChanged" };
    }
    for (const { key } of listed) {
        const settled = ids.get(key);
        if (settled?.ok !== true)
            continue;
        for (const orderId of settled.value) {
            if (!first.orders.has(orderKey(key, orderId)))
                return { kind: "ordersChanged" };
        }
    }
    return { kind: "read", read: assemble(input.account, states, first, ids, blockNumber) };
}
/** The read, once every pool the banks list and every order they hold has been read. */
function assemble(account, states, first, ids, blockNumber) {
    const positions = [];
    const orders = [];
    let ordersError;
    const listed = new Map();
    const orderIds = new Map();
    const margins = states.map(({ slots, state }) => {
        const health = figureOf(slots.health.result);
        listed.set(slots.bank.toLowerCase(), state.activePerpPools);
        for (const pool of state.activePerpPools) {
            const key = poolKey(slots.bank, pool);
            const settled = ids.get(key) ?? Raise.unreachable("every listed pool's order ids were asked for");
            if (settled.ok) {
                orderIds.set(key, settled.value);
                for (const orderId of settled.value) {
                    const slot = first.orders.get(orderKey(key, orderId)) ?? Raise.unreachable("every listed order was read");
                    const detail = slot.result;
                    if (detail.ok)
                        orders.push(PoolOrders.toRestingOrder(pool, detail.value));
                    else
                        ordersError ??= detail.error;
                }
            }
            else {
                ordersError ??= settled.error;
            }
            const read = first.pools.get(key) ?? Raise.unreachable("every listed pool was read");
            const position = required(read.position.result);
            // `activePerpPools` also lists pools where the account only has resting orders.
            if (position.size === 0n)
                continue;
            positions.push(toPosition(account, slots.bank, pool, position, read, health));
        }
        return {
            marginBank: slots.bank.toLowerCase(),
            unlockedCollateralBalance: state.unlockedCollateralBalance,
            lockedCollateral: state.lockedCollateral,
            health,
            withdrawable: figureOf(slots.withdrawable.result),
            marginStatus: figureOf(slots.marginStatus.result),
            leverageSurcharge: figureOf(slots.surcharge.result),
        };
    });
    positions.sort((left, right) => Canonical.compareCodeUnits(left.id, right.id));
    orders.sort((left, right) => Canonical.compareCodeUnits(left.id, right.id));
    return {
        blockNumber,
        positions,
        margins,
        orders: Object.freeze(ordersError === undefined
            ? { status: "known", value: Object.freeze(orders) }
            : { status: "unknown", reason: "readFailed", error: ordersError }),
        pools: listed,
        orderIds,
    };
}
function toPosition(account, bank, pool, position, read, health) {
    const snapshot = read.snapshot.result;
    let marks;
    let liquidationPrice;
    if (!snapshot.ok) {
        marks = { status: "unknown", reason: "readFailed", error: snapshot.error };
        liquidationPrice = { status: "unknown", reason: "readFailed", error: snapshot.error };
    }
    else {
        const [priceable, snap] = snapshot.value;
        if (!priceable) {
            marks = { status: "unknown", reason: "unpriceable", error: null };
            liquidationPrice = { status: "unknown", reason: "unpriceable", error: null };
        }
        else {
            const metrics = Margin.perpPositionAnalytics({
                size: position.size,
                avgEntryPrice: position.avgEntryPrice,
                entryFundingIndex: position.entryFundingIndex,
                markPrice: snap.markPrice,
                projectedCumulativeFunding: snap.projectedCumulativeFunding,
                oneBase: snap.oneBase,
                effectiveImfBps: snap.effectiveIMFBps,
                maintenanceMarginBps: snap.maintenanceMarginBps,
                closeOutMarginBps: snap.closeOutMarginBps,
            });
            marks = {
                status: "known",
                markPrice: snap.markPrice,
                notional: metrics.notional,
                unrealizedPnl: metrics.unrealizedPnl,
                accruedFunding: metrics.accruedFunding,
                equityContribution: metrics.equityContribution,
                initialMarginRequirement: metrics.initialMarginRequirement,
                maintenanceMarginRequirement: metrics.maintenanceMarginRequirement,
                closeOutMarginRequirement: metrics.closeOutMarginRequirement,
                returnOnMarginBps: metrics.returnOnMarginBps,
            };
            // The same solve `getLiquidationPrice` runs, on reads from this same block.
            liquidationPrice =
                health.status === "known"
                    ? {
                        status: "known",
                        value: Margin.perpLiquidationPrice({
                            equity: health.value.equity,
                            mmReq: health.value.mmReq,
                            size: position.size,
                            markPrice: snap.markPrice,
                            maintenanceMarginBps: snap.maintenanceMarginBps,
                            oneBase: snap.oneBase,
                        }),
                    }
                    : { status: "unknown", reason: "healthUnreadable", error: health.error };
        }
    }
    const poolId = pool.toLowerCase();
    return {
        id: `${poolId}_${account.toLowerCase()}`,
        pool: poolId,
        marginBank: bank.toLowerCase(),
        size: position.size,
        avgEntryPrice: position.avgEntryPrice,
        entryFundingIndex: position.entryFundingIndex,
        lastUpdatedTimestampNs: position.lastUpdatedTimestampNs,
        leverageCap: figureOf(read.leverageCap.result),
        marks,
        liquidationPrice,
    };
}
