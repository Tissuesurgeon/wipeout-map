import { type Address, type Client, type Hex, type TypedDataDefinition } from "viem";
import type { Call } from "./call.js";
/**
 *  Safe's two call kinds.
 *
 *  A const object rather than an `enum` so that a consumer importing only the type pays nothing at
 *  runtime, and so the values are inspectable as data.
 */
export declare const SafeOperation: {
    readonly Call: 0;
    readonly DelegateCall: 1;
};
/** {@link SafeOperation}'s values. */
export type SafeOperationValue = (typeof SafeOperation)[keyof typeof SafeOperation];
/**
 *  The fields an owner signs.
 *
 *  `safeTxGas`, `baseGas`, `gasPrice`, `gasToken` and `refundReceiver` are always zero and are
 *  therefore not fields here: the account reimburses nobody, because whoever sends the outer
 *  transaction is the one paying gas and there is no relayer to pay back.
 *
 *  **`safeTxGas = 0` is also what makes a failed inner call revert the WHOLE `execTransaction`**,
 *  which is why an account's nonce only moves on success. A caller that caches a nonce has to get
 *  that right in the same direction — see {@link readSafeNonce}.
 */
export interface SafeTx {
    /** Where the account sends the call. */
    readonly to: Address;
    /** Native value in wei, paid out of the ACCOUNT's balance. */
    readonly value: bigint;
    /** The calldata. */
    readonly data: Hex;
    /** Call, or delegatecall for a batch through `MultiSendCallOnly`. */
    readonly operation: SafeOperationValue;
    /** The account's `nonce()` at signing time. */
    readonly nonce: bigint;
}
/** The EIP-712 type of a Safe transaction, spelled exactly as Safe hashes it. */
export declare const SAFE_TX_TYPES: {
    readonly SafeTx: readonly [{
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly name: "data";
        readonly type: "bytes";
    }, {
        readonly name: "operation";
        readonly type: "uint8";
    }, {
        readonly name: "safeTxGas";
        readonly type: "uint256";
    }, {
        readonly name: "baseGas";
        readonly type: "uint256";
    }, {
        readonly name: "gasPrice";
        readonly type: "uint256";
    }, {
        readonly name: "gasToken";
        readonly type: "address";
    }, {
        readonly name: "refundReceiver";
        readonly type: "address";
    }, {
        readonly name: "nonce";
        readonly type: "uint256";
    }];
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
export declare function encodeMultiSendCalls(calls: readonly Call[]): Hex;
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
export declare function buildSafeTx(chainId: number, calls: readonly Call[], nonce: bigint, saltVersion?: string): SafeTx;
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
export declare function batchedSafeTx(batcher: Address, calls: readonly Call[], nonce: bigint): SafeTx;
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
export declare function safeTxTypedData(chainId: number, account: Address, tx: SafeTx): TypedDataDefinition<typeof SAFE_TX_TYPES, "SafeTx">;
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
export declare function safeTxHash(chainId: number, account: Address, tx: SafeTx): Hex;
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
export declare function execTransactionCall(account: Address, tx: SafeTx, signatures: Hex): Call;
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
export declare function encodeExecTransaction(tx: SafeTx, signatures: Hex): Hex;
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
export declare function readSafeNonce(client: Client, account: Address): Promise<bigint>;
//# sourceMappingURL=safe-tx.d.ts.map