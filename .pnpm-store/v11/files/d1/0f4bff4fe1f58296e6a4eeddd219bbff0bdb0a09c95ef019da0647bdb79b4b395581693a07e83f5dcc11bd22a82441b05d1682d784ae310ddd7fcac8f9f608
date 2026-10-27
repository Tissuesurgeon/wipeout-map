// Building a Safe transaction: the write half of an account.
//
// Everything an account DOES is one of these. `execTransaction` takes a `(to, value, data,
// operation)` tuple, a nonce, and a signature blob from its owners — and any sender may submit it,
// because the Safe checks signatures rather than `msg.sender`. That last property is what lets a
// session key pay for an owner's decision, and it is why this module produces calldata rather than
// sending anything.
//
// **This lived in the explorer until TRAD-314.** It moved because the SDK could not build a write
// at all: it could derive accounts, read them, and pack a nested signature, but the thing being
// nested had no representation. Sub-accounts made that gap load-bearing — a sub-account's owner is
// another account, so every operation on one is a Safe transaction signed by a Safe.
//
// LOCKSTEP: the domain here is Safe's, not ours. `{chainId, verifyingContract}` and nothing else —
// no `name`, no `version`. Adding either produces a hash the Safe rejects as `GS026`, and 1.4.1 and
// 1.5.0 agree on it, so it does not come from a deployment record. `signatures.ts` derives the same
// separator for the EIP-1271 path and its test pins both against the vendored contracts.
import { concat, encodeFunctionData, encodePacked, getAddress, hashTypedData, size, zeroAddress, } from "viem";
import { readContract } from "viem/actions";
import { multiSendCallOnlyAbi, safeAbi } from "./abi/generated/index.js";
import { contractAddress } from "./contracts.js";
import { InvalidInputError } from "./errors.js";
/**
 *  Safe's two call kinds.
 *
 *  A const object rather than an `enum` so that a consumer importing only the type pays nothing at
 *  runtime, and so the values are inspectable as data.
 */
export const SafeOperation = {
    Call: 0,
    DelegateCall: 1,
};
/** The EIP-712 type of a Safe transaction, spelled exactly as Safe hashes it. */
export const SAFE_TX_TYPES = {
    SafeTx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "operation", type: "uint8" },
        { name: "safeTxGas", type: "uint256" },
        { name: "baseGas", type: "uint256" },
        { name: "gasPrice", type: "uint256" },
        { name: "gasToken", type: "address" },
        { name: "refundReceiver", type: "address" },
        { name: "nonce", type: "uint256" },
    ],
};
/**
 *  Pack calls the way `MultiSend.multiSend` reads them.
 *
 *  Every entry is forced to `SafeOperation.Call`, which is the property that makes a batch safe to
 *  sign: a batched entry can never do more than the same call could do on its own. That is also
 *  why the batcher is `MultiSendCallOnly` rather than `MultiSend` — the two take identical
 *  calldata and grant different authority, and there is no ABI or type error to catch the wrong
 *  one.
 *
 *  @param calls The calls, in order.
 *  @returns The packed payload for `multiSend`.
 */
export function encodeMultiSendCalls(calls) {
    return concat(calls.map((call) => encodePacked(["uint8", "address", "uint256", "uint256", "bytes"], [SafeOperation.Call, getAddress(call.to), call.value, BigInt(size(call.data)), call.data])));
}
/**
 *  Collapse calls into the single Safe transaction an owner signs.
 *
 *  One call goes as itself. Several go through the chain's `MultiSendCallOnly` by delegatecall —
 *  the one delegatecall anything in this system signs — so an approve and the call that needs it
 *  land atomically or not at all.
 *
 *  The inner `value`s ride inside the batch payload and are funded by the account's own balance,
 *  so the outer transaction to the batcher carries no value of its own.
 *
 *  @param chainId EIP-155 chain id, used to find `MultiSendCallOnly`.
 *  @param calls The calls. At least one.
 *  @param nonce The acting account's `nonce()`.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The transaction to sign.
 *  @throws {InvalidInputError} When `calls` is empty — there is no such thing as an empty Safe
 *          transaction, and encoding one would produce a signature over a no-op.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export function buildSafeTx(chainId, calls, nonce, saltVersion) {
    return batchedSafeTx(contractAddress(chainId, "MultiSendCallOnly", saltVersion), calls, nonce);
}
/**
 *  {@link buildSafeTx} against a batcher you already hold.
 *
 *  Pure — no manifest lookup, no chain id — for a caller that resolved the address itself or is
 *  testing against a substitute. The chain-aware form is the one to reach for; this exists so that
 *  having the address is not a reason to reimplement the batching.
 *
 *  @param batcher `MultiSendCallOnly`. Not `MultiSend`: the two take identical calldata and grant
 *         different authority, and nothing in a type system distinguishes them.
 *  @param calls The calls. At least one.
 *  @param nonce The acting account's `nonce()`.
 *  @returns The transaction to sign.
 *  @throws {InvalidInputError} When `calls` is empty.
 */
export function batchedSafeTx(batcher, calls, nonce) {
    const [first] = calls;
    if (first === undefined) {
        throw new InvalidInputError("A Safe transaction needs at least one call.");
    }
    if (calls.length === 1) {
        return {
            to: getAddress(first.to),
            value: first.value,
            data: first.data,
            operation: SafeOperation.Call,
            nonce,
        };
    }
    return {
        to: getAddress(batcher),
        value: 0n,
        data: encodeFunctionData({
            abi: multiSendCallOnlyAbi,
            functionName: "multiSend",
            args: [encodeMultiSendCalls(calls)],
        }),
        operation: SafeOperation.DelegateCall,
        nonce,
    };
}
/**
 *  The EIP-712 payload an owner signs.
 *
 *  The domain is `{chainId, verifyingContract}` and **nothing else** — no `name`, no `version`.
 *  That is the Safe's actual domain separator; adding either produces a different hash and the
 *  account rejects the signature as `GS026`, the code that means three different things.
 *
 *  Note the contrast with our own factory's domain, which deliberately omits `chainId` so one
 *  signature reaches every chain. This one cannot: the chain id is Safe's to include, so every
 *  write against an account is bound to the chain it was signed for.
 *
 *  @param chainId EIP-155 chain id.
 *  @param account The acting account, which is the `verifyingContract`.
 *  @param tx The transaction.
 *  @returns The typed data.
 */
export function safeTxTypedData(chainId, account, tx) {
    return {
        domain: { chainId, verifyingContract: getAddress(account) },
        types: SAFE_TX_TYPES,
        primaryType: "SafeTx",
        message: {
            to: getAddress(tx.to),
            value: tx.value,
            data: tx.data,
            operation: tx.operation,
            safeTxGas: 0n,
            baseGas: 0n,
            gasPrice: 0n,
            gasToken: zeroAddress,
            refundReceiver: zeroAddress,
            nonce: tx.nonce,
        },
    };
}
/**
 *  The digest `execTransaction` checks signatures against.
 *
 *  Exposed because an owner does not have to sign it as *typed data*. An injected wallet validates
 *  `domain.chainId` against whichever network it is on and rejects a mismatch, so signing typed
 *  data for another chain means switching the wallet first — a second interaction, and an
 *  add-chain prompt on a wallet that has never seen Somnia. Signing this hash as an opaque message
 *  avoids all of it, because the chain id is *inside* the hash.
 *
 *  It is also what a parent account signs over, wrapped in its own message envelope — see
 *  {@link parentApprovalHash}.
 *
 *  @param chainId EIP-155 chain id.
 *  @param account The acting account.
 *  @param tx The transaction.
 *  @returns The digest.
 */
export function safeTxHash(chainId, account, tx) {
    return hashTypedData(safeTxTypedData(chainId, account, tx));
}
/**
 *  The `execTransaction` call for a signed Safe transaction.
 *
 *  **These are the bytes that go on the wire**, and the account is the target: sent anywhere else
 *  they revert. Any sender may submit it — `execTransaction` checks signatures, not `msg.sender` —
 *  which is the entire reason a session key or a sponsor can pay for an owner's decision.
 *
 *  @param account The acting account, which is also where the call goes.
 *  @param tx The transaction that was signed.
 *  @param signatures The blob from {@link packSignatures}, or one owner's 65 bytes.
 *  @returns The call to send.
 */
export function execTransactionCall(account, tx, signatures) {
    return { to: getAddress(account), value: 0n, data: encodeExecTransaction(tx, signatures) };
}
/**
 *  The `execTransaction` calldata on its own.
 *
 *  {@link execTransactionCall} is the one to reach for, because the target is the part that goes
 *  wrong — these bytes sent anywhere but the acting account revert. This exists for a caller
 *  assembling the outer transaction itself.
 *
 *  @param tx The transaction that was signed.
 *  @param signatures The blob.
 *  @returns The calldata.
 */
export function encodeExecTransaction(tx, signatures) {
    return encodeFunctionData({
        abi: safeAbi,
        functionName: "execTransaction",
        args: [
            getAddress(tx.to),
            tx.value,
            tx.data,
            tx.operation,
            0n,
            0n,
            0n,
            zeroAddress,
            zeroAddress,
            signatures,
        ],
    });
}
/**
 *  An account's current `execTransaction` nonce.
 *
 *  **Read, never assumed, and never cached here.** The nonce is chain state that moves only when an
 *  `execTransaction` SUCCEEDS — because {@link SafeTx} signs `safeTxGas = 0`, a failed inner call
 *  reverts the whole outer transaction and leaves the nonce where it was. A caller that caches has
 *  to get that direction right: a success commits `nonce + 1`, a revert commits nothing, and an
 *  unknown outcome invalidates. Backwards, it wedges permanently — every later send signing over a
 *  nonce the account will not accept.
 *
 *  That policy is the caller's, so it lives with the caller. This is the read.
 *
 *  @param client Any viem client that can read.
 *  @param account The account.
 *  @returns Its nonce.
 */
export async function readSafeNonce(client, account) {
    return readContract(client, {
        address: getAddress(account),
        abi: safeAbi,
        functionName: "nonce",
    });
}
//# sourceMappingURL=safe-tx.js.map