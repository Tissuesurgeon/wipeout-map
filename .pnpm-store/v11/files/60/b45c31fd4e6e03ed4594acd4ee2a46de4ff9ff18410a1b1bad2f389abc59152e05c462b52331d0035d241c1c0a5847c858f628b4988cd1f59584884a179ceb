// One call, as data.
//
// Every write in this system is eventually a `(to, value, data)` triple: sent by an EOA to the
// factory, or signed by an owner and executed by their account through `execTransaction`, or packed
// into a `MultiSendCallOnly` batch. Encoders here return the triple rather than bare calldata,
// because the target is the part that goes wrong — Safe's owner functions must be called on the
// ACCOUNT and nothing else, and calldata alone leaves that to the caller to remember.
/**
 *  Whether a call may only be sent by one particular address.
 *
 *  A {@link SenderBoundCall} is structurally a {@link Call}, so a caller holding one as a `Call`
 *  cannot see the restriction in the type. This recovers it — which is what lets a submit path
 *  refuse the wrong sender rather than paying for a `GS025`.
 */
export function isSenderBound(call) {
    return typeof call.sender === "string";
}
//# sourceMappingURL=call.js.map