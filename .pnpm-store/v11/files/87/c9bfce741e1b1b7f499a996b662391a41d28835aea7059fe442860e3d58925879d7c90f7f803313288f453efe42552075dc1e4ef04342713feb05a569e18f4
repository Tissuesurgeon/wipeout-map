// The bridge as an EXCHANGE member. The `/chains` bridge module is data plus a
// pure planner plus a raw-key sender; this binds the planner to the exchange's
// own chains and executors: both ends must be configured chains, the origin
// leg goes through the origin chain's executor (so a safe can bridge without a
// raw key), and delivery of that one Hyperlane message is observed on the
// destination engine's socket rather than polled.
import { isAddressEqual, pad, parseEventLogs, } from "viem";
import * as BridgeAbi from "../chains/bridge/abi.js";
import * as BridgeRegistry from "../chains/bridge/registry.js";
import { createBridgeTransfer } from "../chains/bridge/transfer.js";
import { BridgeLiquidityError, InvalidInputError, NotConfiguredError, RpcError, } from "../errors.js";
import { unreachable } from "../raise.js";
/**
 *  @internal The delivery wait when the caller passes no `deliveryTimeoutMs`.
 *  The live facade suite logs measured legs against it.
 *
 *  About 20 times the measured Hideki 2 median (7.5 s and 8.7 s for the two directions,
 *  2026-09-17), so the relayer's 5.1 s retry arm and a slow leg both fit.
 */
export const DEFAULT_DELIVERY_TIMEOUT_MS = 180_000;
/**
 *  The message id `transferRemote` dispatched, read from the origin receipt.
 *
 *  **Details**
 *
 *  The Mailbox emits `Dispatch` and then `DispatchId` for each message, so a
 *  `DispatchId` belongs to the `Dispatch` just before it among the Mailbox's
 *  logs. Only a pair whose sender is the origin router and whose destination is
 *  the target domain counts. The rule is the same for every executor: a Safe or
 *  a smart account adds its own logs around the pair, never between the two.
 */
function messageIdOf(receipt, mailbox, router, destination) {
    const events = parseEventLogs({
        abi: BridgeAbi.mailboxAbi,
        logs: receipt.logs.filter((log) => isAddressEqual(log.address, mailbox)),
    });
    const ids = events.flatMap((event, i) => {
        const next = events[i + 1];
        const ours = event.eventName === "Dispatch" &&
            isAddressEqual(event.args.sender, router) &&
            event.args.destination === destination;
        return ours && next?.eventName === "DispatchId" ? [next.args.messageId] : [];
    });
    const [id] = ids;
    if (ids.length !== 1 || id === undefined) {
        throw new RpcError("bridge message id", `receipt ${receipt.transactionHash} holds ${ids.length} Mailbox dispatches from router ${router} to domain ${destination}, expected exactly one`);
    }
    return id;
}
/**
 *  Resolve when the destination Mailbox processes `messageId`, or with
 *  `delivered: false` after `timeoutMs`. The watch opens first and the
 *  `delivered` read follows, so a delivery that lands between the two is seen
 *  by one of them. The two requests are issued in that order on one socket.
 *  When `closed` aborts, the owner is closing: the watch and the timer stop, and
 *  the wait resolves with `delivered: false`, as on a timeout (SDK-OWN-004).
 */
const awaitDelivery = (viem, mailbox, router, messageId, timeoutMs, closed) => new Promise((resolve, reject) => {
    let settled = false;
    let unwatch;
    let timer;
    const onClose = () => settle({ delivered: false });
    const settle = (outcome) => {
        if (settled)
            return;
        settled = true;
        unwatch?.();
        clearTimeout(timer);
        closed.removeEventListener("abort", onClose);
        if (outcome instanceof Error)
            reject(outcome);
        else
            resolve(outcome);
    };
    // ProcessId proves the Mailbox processed the message. The router's
    // ReceivedTransferRemote in the same transaction proves it paid out.
    const confirm = async (hash) => {
        // The message is processed, so the delivery timer no longer applies:
        // the read below carries the same bound instead of this one.
        clearTimeout(timer);
        let receipt;
        try {
            // Retries while a lagging node does not have the receipt yet. The
            // transaction is already mined, so there is no replacement to check.
            // `timeout` is passed explicitly: without it the read would fall back
            // to viem's own default, so the caller's bound would be discarded here.
            receipt = await viem.waitForTransactionReceipt({ hash, checkReplacement: false, timeout: timeoutMs });
        }
        catch (e) {
            settle(new RpcError("waitForTransactionReceipt", e instanceof Error ? e.message : String(e), { cause: e }));
            return;
        }
        const received = parseEventLogs({
            abi: BridgeAbi.warpRouterAbi,
            eventName: "ReceivedTransferRemote",
            logs: receipt.logs.filter((log) => isAddressEqual(log.address, router)),
        });
        if (received.length > 0) {
            settle({ delivered: true, hash });
            return;
        }
        settle(new RpcError("watch bridge delivery", `delivery ${hash} processed message ${messageId}, but router ${router} logged no ReceivedTransferRemote`));
    };
    if (closed.aborted) {
        onClose();
        return;
    }
    closed.addEventListener("abort", onClose, { once: true });
    try {
        unwatch = viem.watchContractEvent({
            address: mailbox,
            abi: BridgeAbi.mailboxAbi,
            eventName: "ProcessId",
            args: { messageId },
            onLogs: (logs) => {
                // The node filters on the id. Check it again instead of trusting the filter.
                const hit = logs.find((log) => log.args.messageId?.toLowerCase() === messageId.toLowerCase());
                if (hit?.transactionHash)
                    void confirm(hit.transactionHash);
            },
            onError: (e) => settle(new RpcError("watch bridge delivery", e.message, { cause: e })),
        });
    }
    catch (e) {
        settle(new RpcError("watch bridge delivery", e instanceof Error ? e.message : String(e), { cause: e }));
        return;
    }
    timer = setTimeout(() => settle({ delivered: false }), timeoutMs);
    // The message may have landed before the watch opened. This read only
    // covers that window. When it fails, the watch or the timeout still
    // decides, so a failed read never fails a transfer that is in flight.
    viem
        .readContract({ address: mailbox, abi: BridgeAbi.mailboxAbi, functionName: "delivered", args: [messageId] })
        .then((done) => {
        if (done)
            settle({ delivered: true });
    }, () => undefined);
});
/**
 *  Wait again for the message of a transfer that timed out, on the destination
 *  engine's socket. Resolves `true` when the destination Mailbox has processed
 *  it, `false` when it has not within the timeout. Sends nothing.
 *
 * @internal
 */
export async function awaitSentMessage(destinationViem, sent, timeoutMs, closed) {
    const network = BridgeRegistry.getBridgeNetwork(sent.plan.destination.chainId) ??
        unreachable(`chain ${sent.plan.destination.chainId} was a bridge destination, so it has a Hyperlane network`);
    const delivery = await awaitDelivery(destinationViem, network.mailbox, sent.plan.destination.router, sent.messageId, timeoutMs ?? DEFAULT_DELIVERY_TIMEOUT_MS, closed);
    return delivery.delivered;
}
/** @internal */
export function createExchangeBridge(deps) {
    const requireChain = (chainId, side) => {
        if (!deps.chainIds().includes(chainId)) {
            throw new NotConfiguredError(`a ChainBinding for chain ${chainId}`, `bridging ${side} chain ${chainId} (this exchange spans ${deps.chainIds().join(", ")})`);
        }
    };
    const plan = (params) => {
        requireChain(params.from, "from");
        requireChain(params.to, "to");
        const recipient = params.recipient ?? deps.account();
        const planParams = {
            token: params.token,
            from: params.from,
            to: params.to,
            amount: params.amount,
            recipient,
            ...(params.approveAmount !== undefined ? { approveAmount: params.approveAmount } : {}),
        };
        try {
            return createBridgeTransfer(planParams);
        }
        catch (e) {
            // The planner is import-light and throws plain Errors; at the exchange
            // boundary a bad plan is caller input.
            throw new InvalidInputError(e instanceof Error ? e.message : String(e), { cause: e });
        }
    };
    return {
        plan,
        async transfer(params, options = {}) {
            // Read once, now: a close() during the send also ends the wait that follows it.
            const closed = deps.closed();
            const transfer = plan(params);
            const executor = deps.executorFor(params.from);
            const destination = BridgeRegistry.getBridgeToken(params.token, params.to);
            const originNetwork = BridgeRegistry.getBridgeNetwork(params.from);
            const destinationNetwork = BridgeRegistry.getBridgeNetwork(params.to);
            if (!destination || !originNetwork || !destinationNetwork) {
                throw new InvalidInputError(`${params.token} is not bridged from chain ${params.from} to chain ${params.to}`);
            }
            // Taken before the send: a destination without a socket fails here, with nothing sent.
            const destinationViem = deps.engineFor(params.to).getViemClient();
            // A native route pays out of the destination router's own balance. A
            // router below the amount cannot deliver, and the funds would sit in
            // escrow on the origin, so refuse before anything is sent.
            if (destination.requiresDestinationLiquidity) {
                const available = await deps.engineFor(params.to).getNativeBalance(destination.router);
                // ponytail: compares origin units to destination units; equal on every
                // native route today (STT is 18 dp on both sides). Scale here if one differs.
                if (available < transfer.amount) {
                    throw new BridgeLiquidityError({
                        token: params.token,
                        from: params.from,
                        to: params.to,
                        router: destination.router,
                        amount: transfer.amount,
                        available,
                    });
                }
            }
            const onStep = options.onStep ?? (() => undefined);
            // The planner's transactions are UnsignedCalls already (chainId, to, data,
            // value, description), so they go to the executor as they are. A safe packs
            // approval + bridge into one transaction; a key sends them in order.
            const legs = transfer.approveStep ? [transfer.approveStep, transfer.bridgeStep] : [transfer.bridgeStep];
            if (transfer.approveStep)
                onStep({ kind: "approve", chainId: params.from, status: "sent" });
            onStep({ kind: "bridge", chainId: params.from, status: "sent" });
            const executed = await executor.execute(legs, { context: { functionName: "transferRemote" } });
            if (executed.failure)
                throw executed.failure;
            if (executed.receipt.status === "reverted") {
                throw new RpcError("transferRemote", `bridge transaction ${executed.hash} reverted`);
            }
            const bridgeHash = executed.hash;
            // Batched executors return the one outer hash; sequential ones return the last leg's.
            const approveHash = transfer.approveStep ? executed.hash : undefined;
            if (approveHash)
                onStep({ kind: "approve", chainId: params.from, status: "confirmed", hash: approveHash });
            onStep({ kind: "bridge", chainId: params.from, status: "confirmed", hash: bridgeHash });
            // The watch opens only now, once the id is known. Nothing waits on the
            // destination while the send runs, so no wait error can go unhandled.
            const messageId = messageIdOf(executed.receipt, originNetwork.mailbox, transfer.origin.router, destinationNetwork.domainId);
            const delivery = await awaitDelivery(destinationViem, destinationNetwork.mailbox, destination.router, messageId, options.deliveryTimeoutMs ?? DEFAULT_DELIVERY_TIMEOUT_MS, closed);
            onStep({
                kind: "deliver",
                chainId: params.to,
                status: delivery.delivered ? "delivered" : "timeout",
                ...(delivery.hash ? { hash: delivery.hash } : {}),
            });
            return {
                plan: transfer,
                bridgeHash,
                ...(approveHash ? { approveHash } : {}),
                messageId,
                delivered: delivery.delivered,
                ...(delivery.hash ? { deliveryHash: delivery.hash } : {}),
            };
        },
    };
}
/** A currency code as the bridge names it, when the code IS a bridge token. */
export function bridgeTokenForCode(code) {
    const upper = code.toUpperCase();
    const hit = ["STT", "USDso", "WBTC", "WETH", "HBTT"].find((t) => t.toUpperCase() === upper);
    return hit;
}
/** The bytes32 form of an address, as a warp message carries it. */
export function recipientBytes32(address) {
    return pad(address.toLowerCase(), { size: 32 });
}
