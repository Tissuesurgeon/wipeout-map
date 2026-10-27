// The session-key executor: Somnia's node-side session accounts. The node
// holds the key, tracks the nonce, signs, submits, and answers
// `somnia_sendSessionTransaction` with the receipt — so this executor is a
// thin shape adapter over the `/native` module's call, and the receipt it
// returns is the one the node produced, fetched exactly once.
//
// The seed is a bearer credential (the node derives the key from it), and this
// executor puts it on the wire with every write. So a session account should
// hold gas dust only, and this executor is never an account's `inner`: the
// account factories refuse it (see `isSessionKeyExecutor`). An account that
// holds funds signs locally from `sessionPrivateKey(seed)` instead. See the
// `/native` module's docs.
import { InvalidInputError, NotConfiguredError, TransactionOutcomeUnknownError } from "../errors.js";
import * as Session from "../native/session.js";
import * as Raise from "../raise.js";
import * as TxSend from "../txSend.js";
import * as Boundary from "./boundary.js";
import * as Guard from "./guard.js";
/**
 *  Marks what {@link createSessionKeyExecutor} builds. A property on the
 *  executor itself, so the mark is instance data (SDK-ARCH-002), not a
 *  module-level registry.
 */
const NODE_SIDE_SESSION = Symbol("somnia.nodeSideSession");
/**
 *  True when `executor` came from {@link createSessionKeyExecutor}, so it sends
 *  its seed to the node. The smart-account spec and `accountFor` refuse it as
 *  `inner`.
 *
 * @internal
 */
export function isSessionKeyExecutor(executor) {
    return NODE_SIDE_SESSION in executor;
}
/**
 *  Build the session-key executor. Internal: `client.createExecutor({ sessionSeed })`
 *  hands one out.
 *
 * @internal
 */
export function createSessionKeyExecutor(deps) {
    const { chainId, native, seed, defaultGas } = deps;
    // The node derives the same account locally; computing it here means the
    // writer can read allowances for the actor without a round-trip.
    const actor = Session.sessionAddress(seed);
    async function sendOne(call, options) {
        const gas = options.gas ?? defaultGas;
        // Refused here, before the send: below, any failure that is not the
        // node's own answer is read as "the transaction may have landed".
        if (gas <= 0n)
            throw new InvalidInputError(`a session transaction needs a positive gas limit (got ${gas})`);
        let receipt;
        try {
            receipt = await native.sendSessionTransaction({
                seed,
                gas,
                to: call.to,
                data: call.data,
                ...(call.value !== 0n ? { value: call.value } : {}),
            });
        }
        catch (e) {
            // A binding check refused the endpoint INSTEAD of sending (the genesis
            // guard on the RPC): nothing reached the node, so this is not an unknown
            // outcome. Reporting it as one would send the caller looking for a
            // transaction that was never signed. It crosses as itself.
            if (e instanceof NotConfiguredError)
                throw e;
            // No answer from the node (a timeout, a dropped socket, an empty
            // result): the node may have signed and sent the transaction. The
            // protocol gives no hash before the receipt, so there is none to report.
            if (!TxSend.isNodeRefusal(e)) {
                throw new TransactionOutcomeUnknownError({ chainId, operation: "somnia_sendSessionTransaction" }, { cause: e });
            }
            // The node's refusal (a session error, a revert it surfaced) crosses the
            // boundary as the SDK error the contract names, the original as `cause`;
            // the context is THIS call's.
            throw Boundary.asExecuteError(e, "somnia_sendSessionTransaction", {
                address: call.to,
                functionName: call.functionName ?? options.context?.functionName,
            });
        }
        return TxSend.sentResult(receipt);
    }
    const executor = {
        [NODE_SIDE_SESSION]: true,
        chainId,
        actor,
        async execute(calls, options = {}) {
            Guard.assertCallsOnChain(chainId, calls);
            // One session transaction per call, in order; a mined revert ends the
            // sequence so the calls behind it are never sent (see Executor.execute).
            let last;
            for (const call of calls) {
                last = await sendOne(call, options);
                if (last.receipt.status === "reverted")
                    return last;
            }
            // assertCallsOnChain rejected an empty list, so the loop ran at least once.
            return last ?? Raise.unreachable("execute ran no call");
        },
    };
    return executor;
}
