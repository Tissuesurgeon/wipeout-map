import type { Address, Hex } from "viem";
import { type DeployedName } from "./generated/deployments.js";
/**
 *  The base every error this SDK throws extends.
 *
 *  Catch this to catch all of them. Every subclass sets `name` to its own class name, exposes the
 *  values a caller branches on as readonly fields, and chains whatever it was caused by.
 *
 *  **Details**
 *
 *  `name` is assigned explicitly in each subclass rather than derived from `new.target`, because a
 *  consumer that minifies the bundle would otherwise see mangled class names in logs — the one
 *  place the name still has to be readable after the type information is gone.
 */
export declare class SomniaAccountsError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 *  Thrown when an argument is refused before anything is sent.
 *
 *  Every instance of this is decidable offline: an empty list where the contract needs one, a
 *  signature of the wrong length, a range that counts down. It never means the chain said no —
 *  that is {@link TransactionRevertedError}.
 */
export declare class InvalidInputError extends SomniaAccountsError {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 *  Thrown when an SDK invariant does not hold.
 *
 *  This is a bug here, not a mistake by the caller. It replaces the `throw new Error("unreachable:
 *  …")` lines that used to mark these spots — same intent, but a consumer can now tell our bug
 *  from their own without reading the message.
 */
export declare class InvariantError extends SomniaAccountsError {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 *  Proves a value exists, and names the invariant when it does not.
 *
 *  Used instead of a non-null assertion so the failure is a typed error with a sentence in it
 *  rather than a `TypeError` about `undefined` several frames later.
 *
 *  @param value What must exist.
 *  @param what The invariant, phrased as the thing that should have been true.
 *  @returns `value`, narrowed.
 *  @throws {InvariantError} When `value` is `null` or `undefined`.
 */
export declare function present<T>(value: T | null | undefined, what: string): T;
/**
 *  Thrown when a chain has no committed deployment.
 *
 *  The addresses are baked in at build time from the manifests, so this is a chain nobody has
 *  deployed to rather than a lookup that failed.
 */
export declare class UnsupportedChainError extends SomniaAccountsError {
    /** The chain that was asked for. */
    readonly chainId: number;
    /** @param chainId The chain that has no manifest. */
    constructor(chainId: number);
}
/**
 *  Thrown when a chain has several salt versions committed and the call named none.
 *
 *  Two salt versions are two independent deployments that can both be live, so picking one for
 *  the caller would silently choose which set of addresses their funds go to.
 */
export declare class AmbiguousDeploymentError extends SomniaAccountsError {
    /** The chain that was asked for. */
    readonly chainId: number;
    /** The salt versions that matched, so the message says what to choose between. */
    readonly saltVersions: readonly string[];
    /**
     *  @param chainId The chain that was asked for.
     *  @param saltVersions Every salt version committed for it.
     */
    constructor(chainId: number, saltVersions: readonly string[]);
}
/**
 *  Thrown when a manifest exists but does not name the contract that was asked for.
 *
 *  Either that deploy step has not run on this chain, or it wrote a zero address.
 */
export declare class MissingContractError extends SomniaAccountsError {
    /** The chain that was asked for. */
    readonly chainId: number;
    /** The name that was not there. */
    readonly contractName: DeployedName;
    /**
     *  @param chainId The chain whose manifest was read.
     *  @param contractName The name that was absent.
     */
    constructor(chainId: number, contractName: DeployedName);
}
/**
 *  Thrown when the key on hand is not the one the flow needs.
 *
 *  The two addresses are both named because the interesting case is a wallet that switched
 *  accounts between building a plan and signing it — the plan is still valid, for somebody else.
 */
export declare class WrongSignerError extends SomniaAccountsError {
    /** The address the flow requires. */
    readonly required: Address;
    /** The address that was offered. */
    readonly offered: Address;
    /**
     *  @param required The address the flow requires.
     *  @param offered The address that was offered.
     */
    constructor(required: Address, offered: Address);
}
/**
 *  Thrown when an owner action names an address the account does not have as an owner.
 *
 *  Raised offline against the owner list that was read, rather than letting Safe answer `GS026`
 *  from inside a transaction the caller has already paid for.
 */
export declare class NotAnOwnerError extends SomniaAccountsError {
    /** The address that was not in the list. */
    readonly owner: Address;
    /** The list it was looked for in. */
    readonly owners: readonly Address[];
    /**
     *  @param owner The address that was not an owner.
     *  @param owners The list it was looked for in.
     */
    constructor(owner: Address, owners: readonly Address[]);
}
/**
 *  Thrown when something that can sign was given where something that can also send is needed.
 *
 *  A signer proves authority; a sender pays gas. They are separate on purpose — a session key
 *  usually signs while a relayer sends — so this names which half is missing rather than failing
 *  at broadcast with an out-of-funds error that points at the wrong address.
 */
export declare class SenderRequiredError extends SomniaAccountsError {
    /** The address that can sign but cannot send. */
    readonly signer: Address;
    /** @param signer The address that can sign but cannot send. */
    constructor(signer: Address);
}
/**
 *  Thrown when a call that only one address may send is handed to a different sender.
 *
 *  A pre-validated signature puts the owner's address where a signature would go and Safe honours
 *  it only for `msg.sender`, so the call is authority-bearing for one broadcaster and worthless
 *  from anywhere else. Distinct from {@link WrongSignerError} because nothing was signed and the
 *  remedy is different: the caller has the right call and the wrong wallet.
 *
 *  Raised before broadcasting. Left to the chain it is `GS025` — paid for, and with nothing in the
 *  receipt naming the sender as the cause.
 */
export declare class WrongSenderError extends SomniaAccountsError {
    /** The only address that may send the call. */
    readonly required: Address;
    /** The sender that was offered, or `null` for a relayer, whose address the SDK cannot know. */
    readonly offered: Address | null;
    /**
     *  @param required The only address that may send the call.
     *  @param offered The sender that was offered; `null` for a relayer.
     */
    constructor(required: Address, offered: Address | null);
}
/**
 *  Thrown when a wallet or provider answers with something this SDK cannot use.
 *
 *  A malformed signature, a send that returned no hash, a recovery id outside the range. The
 *  distinction from {@link RpcError} is who misbehaved: this is the wallet the user chose, and
 *  the remedy is usually a different wallet rather than a retry.
 */
export declare class WalletResponseError extends SomniaAccountsError {
    /** The RPC method or the thing being signed, when there was one. */
    readonly method: string | undefined;
    /**
     *  @param message What was wrong with the answer.
     *  @param options `method` names the call; `cause` carries the original failure.
     */
    constructor(message: string, options?: {
        method?: string;
        cause?: unknown;
    });
}
/**
 *  Thrown when a wallet does not implement a method this flow needs.
 *
 *  Separate from {@link WalletResponseError} because the caller's move is different: not "try
 *  again", but "this flow is not available with this wallet".
 */
export declare class UnsupportedMethodError extends SomniaAccountsError {
    /** The method the wallet did not answer. */
    readonly method: string;
    /** @param method The method the wallet did not answer usefully. */
    constructor(method: string);
}
/**
 *  Thrown when the chain did not answer well enough to act on.
 *
 *  Reads are retried and batched in several places here, so this means every attempt failed —
 *  not that one did. Where the SDK can still give a safe partial answer it does that instead of
 *  throwing; this is raised only where continuing would mean guessing.
 */
export declare class RpcError extends SomniaAccountsError {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 *  Thrown when the indexer is there but will not answer right now: rate-limited, overloaded, or
 *  unreachable.
 *
 *  A subclass of {@link RpcError}, so code that already catches that keeps working. Distinct
 *  because the right reaction is different — wait and ask again, not report a broken read — and
 *  `retryAfterMs` says how long when the indexer said so.
 */
export declare class IndexerUnavailableError extends RpcError {
    /** How long the indexer asked to wait, when it said. `undefined` when it did not. */
    readonly retryAfterMs: number | undefined;
    constructor(message: string, options?: {
        cause?: unknown;
        retryAfterMs?: number;
    });
}
/**
 *  Thrown when a feed's cursor was issued against an index that has since been rebuilt.
 *
 *  A reindex replays history from the start, so the position a cursor remembers may now point at
 *  different rows, or at rows not yet re-read. Continuing would skip or repeat silently. Start the
 *  read again without a cursor.
 */
export declare class FeedRestartRequiredError extends SomniaAccountsError {
    /** The chain whose index was rebuilt. */
    readonly chainId: number;
    constructor(chainId: number);
}
/**
 *  Thrown when the client is connected to a different chain than the call is for.
 *
 *  Caught before any read, because the factory answers on every chain and would return a real,
 *  wrong address computed by the wrong chain's deployment.
 */
export declare class WrongNetworkError extends SomniaAccountsError {
    /** The chain the action is for. */
    readonly expected: number;
    /** The chain the client or wallet is on. */
    readonly actual: number;
    /**
     *  @param expected The chain the action is for.
     *  @param actual The chain the client or wallet is on.
     */
    constructor(expected: number, actual: number);
}
/**
 *  Thrown when the sender cannot pay for the transaction.
 *
 *  Raised from the failure the node gave rather than from a balance read, so it stays true for a
 *  sender whose balance is fine but whose allowance of some other resource is not.
 */
export declare class CannotPayError extends SomniaAccountsError {
    /** The address that could not pay. */
    readonly address: Address;
    /**
     *  @param address The address that could not pay.
     *  @param cause The failure that said so.
     */
    constructor(address: Address, cause: unknown);
}
/**
 *  Thrown when a transaction was sent but no receipt arrived in time.
 *
 *  **Not a failure of the transaction.** It may still land. The hash is the field that matters:
 *  a caller that retries without looking it up first can pay twice for one action.
 */
export declare class UnconfirmedSendError extends SomniaAccountsError {
    /** The transaction that was sent and not confirmed. */
    readonly hash: Hex;
    /**
     *  @param hash The transaction that was sent.
     *  @param what What it was doing, for the message.
     */
    constructor(hash: Hex, what: string);
}
/**
 *  Thrown when a transaction mined and reverted.
 *
 *  `reason` is filled in when the revert could be replayed and decoded, and left `undefined` when
 *  it could not — an absent reason means the SDK did not learn one, never that there was none.
 *  `blockNumber` is carried so a caller can replay it against ABIs this SDK does not hold.
 */
export declare class TransactionRevertedError extends SomniaAccountsError {
    /** The transaction that reverted. */
    readonly hash: Hex;
    /** The block it reverted in, so a caller can replay it against different error ABIs. */
    readonly blockNumber: bigint | undefined;
    /** Why, when it could be recovered. `undefined` when the replay found nothing to name. */
    readonly reason: string | undefined;
    /**
     *  @param hash The transaction that reverted.
     *  @param what What it was doing, for the message.
     *  @param detail `blockNumber` and `reason` when they are known.
     */
    constructor(hash: Hex, what: string, detail?: {
        blockNumber?: bigint;
        reason?: string;
    });
}
//# sourceMappingURL=errors.d.ts.map