// Every failure this SDK raises, in one place, under one base class.
//
// **Why one file and one base.** This package is a dependency of other SDKs now, not only of
// our own explorer. A consumer that cannot write
//
//     catch (e) { if (e instanceof SomniaAccountsError) … }
//
// has to enumerate our class names by hand and gets them wrong the first time we add one. Before
// this file the classes lived in `contracts.ts`, `prepare.ts`, `safe.ts` and `submit.ts` with no
// shared ancestor, and seventeen more failures left as bare `Error` — indistinguishable from a
// bug in the consumer's own code.
//
// **What belongs here.** One class per *branchable caller outcome*, not one per throw site: if two
// failures lead a caller to do the same thing, they are the same class with different fields. The
// fields are the part a caller branches on, so they are readonly, typed, and the message is built
// from them rather than the other way round. Anything that caused the failure is chained in
// `cause` — never swallowed, never re-wrapped when it is already one of ours.
//
// **What does not belong here.** Reverts decoded from chain data keep their own shape in
// `revert.ts`; this file names the *transaction* that reverted. Nothing here reaches the network.
import { deployments } from "./generated/deployments.js";
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
export class SomniaAccountsError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = "SomniaAccountsError";
    }
}
// ---------------------------------------------------------------- caller input
/**
 *  Thrown when an argument is refused before anything is sent.
 *
 *  Every instance of this is decidable offline: an empty list where the contract needs one, a
 *  signature of the wrong length, a range that counts down. It never means the chain said no —
 *  that is {@link TransactionRevertedError}.
 */
export class InvalidInputError extends SomniaAccountsError {
    constructor(message, options) {
        super(message, options);
        this.name = "InvalidInputError";
    }
}
/**
 *  Thrown when an SDK invariant does not hold.
 *
 *  This is a bug here, not a mistake by the caller. It replaces the `throw new Error("unreachable:
 *  …")` lines that used to mark these spots — same intent, but a consumer can now tell our bug
 *  from their own without reading the message.
 */
export class InvariantError extends SomniaAccountsError {
    constructor(message, options) {
        super(`Invariant broken: ${message}. This is a bug in @somnia-chain/accounts-sdk.`, options);
        this.name = "InvariantError";
    }
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
export function present(value, what) {
    if (value === null || value === undefined)
        throw new InvariantError(what);
    return value;
}
// ------------------------------------------------------------------ deployment
/**
 *  Thrown when a chain has no committed deployment.
 *
 *  The addresses are baked in at build time from the manifests, so this is a chain nobody has
 *  deployed to rather than a lookup that failed.
 */
export class UnsupportedChainError extends SomniaAccountsError {
    /** The chain that was asked for. */
    chainId;
    /** @param chainId The chain that has no manifest. */
    constructor(chainId) {
        const deployed = [...new Set(deployments.map((d) => d.chainId))].join(", ");
        super(`Chain ${chainId} has no committed deployment. Deployed chains: ${deployed}.`);
        this.name = "UnsupportedChainError";
        this.chainId = chainId;
    }
}
/**
 *  Thrown when a chain has several salt versions committed and the call named none.
 *
 *  Two salt versions are two independent deployments that can both be live, so picking one for
 *  the caller would silently choose which set of addresses their funds go to.
 */
export class AmbiguousDeploymentError extends SomniaAccountsError {
    /** The chain that was asked for. */
    chainId;
    /** The salt versions that matched, so the message says what to choose between. */
    saltVersions;
    /**
     *  @param chainId The chain that was asked for.
     *  @param saltVersions Every salt version committed for it.
     */
    constructor(chainId, saltVersions) {
        super(`Chain ${chainId} has ${saltVersions.length} salt versions committed ` +
            `(${saltVersions.join(", ")}). Pass one explicitly.`);
        this.name = "AmbiguousDeploymentError";
        this.chainId = chainId;
        this.saltVersions = saltVersions;
    }
}
/**
 *  Thrown when a manifest exists but does not name the contract that was asked for.
 *
 *  Either that deploy step has not run on this chain, or it wrote a zero address.
 */
export class MissingContractError extends SomniaAccountsError {
    /** The chain that was asked for. */
    chainId;
    /** The name that was not there. */
    contractName;
    /**
     *  @param chainId The chain whose manifest was read.
     *  @param contractName The name that was absent.
     */
    constructor(chainId, contractName) {
        super(`${contractName} is not in the manifest for chain ${chainId}. ` +
            `Either that deploy step has not run, or it wrote a zero address.`);
        this.name = "MissingContractError";
        this.chainId = chainId;
        this.contractName = contractName;
    }
}
// --------------------------------------------------------------------- authority
/**
 *  Thrown when the key on hand is not the one the flow needs.
 *
 *  The two addresses are both named because the interesting case is a wallet that switched
 *  accounts between building a plan and signing it — the plan is still valid, for somebody else.
 */
export class WrongSignerError extends SomniaAccountsError {
    /** The address the flow requires. */
    required;
    /** The address that was offered. */
    offered;
    /**
     *  @param required The address the flow requires.
     *  @param offered The address that was offered.
     */
    constructor(required, offered) {
        super(`This must be signed by ${required}, not ${offered}.`);
        this.name = "WrongSignerError";
        this.required = required;
        this.offered = offered;
    }
}
/**
 *  Thrown when an owner action names an address the account does not have as an owner.
 *
 *  Raised offline against the owner list that was read, rather than letting Safe answer `GS026`
 *  from inside a transaction the caller has already paid for.
 */
export class NotAnOwnerError extends SomniaAccountsError {
    /** The address that was not in the list. */
    owner;
    /** The list it was looked for in. */
    owners;
    /**
     *  @param owner The address that was not an owner.
     *  @param owners The list it was looked for in.
     */
    constructor(owner, owners) {
        super(`${owner} is not an owner. Owners: ${owners.join(", ") || "(none)"}.`);
        this.name = "NotAnOwnerError";
        this.owner = owner;
        this.owners = owners;
    }
}
/**
 *  Thrown when something that can sign was given where something that can also send is needed.
 *
 *  A signer proves authority; a sender pays gas. They are separate on purpose — a session key
 *  usually signs while a relayer sends — so this names which half is missing rather than failing
 *  at broadcast with an out-of-funds error that points at the wrong address.
 */
export class SenderRequiredError extends SomniaAccountsError {
    /** The address that can sign but cannot send. */
    signer;
    /** @param signer The address that can sign but cannot send. */
    constructor(signer) {
        super(`${signer} can sign but cannot send. Pass a sender — a relayer, or a wallet that pays.`);
        this.name = "SenderRequiredError";
        this.signer = signer;
    }
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
export class WrongSenderError extends SomniaAccountsError {
    /** The only address that may send the call. */
    required;
    /** The sender that was offered, or `null` for a relayer, whose address the SDK cannot know. */
    offered;
    /**
     *  @param required The only address that may send the call.
     *  @param offered The sender that was offered; `null` for a relayer.
     */
    constructor(required, offered) {
        super(offered === null
            ? `This call is only valid sent from ${required}, and a relayer broadcasts from an ` +
                "address this SDK cannot check. Send it with that wallet, or authorise the " +
                "execution with a signature so anyone can relay it."
            : `This call is only valid sent from ${required}, not ${offered}.`);
        this.name = "WrongSenderError";
        this.required = required;
        this.offered = offered;
    }
}
// ------------------------------------------------------------- the other side
/**
 *  Thrown when a wallet or provider answers with something this SDK cannot use.
 *
 *  A malformed signature, a send that returned no hash, a recovery id outside the range. The
 *  distinction from {@link RpcError} is who misbehaved: this is the wallet the user chose, and
 *  the remedy is usually a different wallet rather than a retry.
 */
export class WalletResponseError extends SomniaAccountsError {
    /** The RPC method or the thing being signed, when there was one. */
    method;
    /**
     *  @param message What was wrong with the answer.
     *  @param options `method` names the call; `cause` carries the original failure.
     */
    constructor(message, options) {
        super(message, options);
        this.name = "WalletResponseError";
        this.method = options?.method;
    }
}
/**
 *  Thrown when a wallet does not implement a method this flow needs.
 *
 *  Separate from {@link WalletResponseError} because the caller's move is different: not "try
 *  again", but "this flow is not available with this wallet".
 */
export class UnsupportedMethodError extends SomniaAccountsError {
    /** The method the wallet did not answer. */
    method;
    /** @param method The method the wallet did not answer usefully. */
    constructor(method) {
        super(`The wallet did not answer ${method} usefully.`);
        this.name = "UnsupportedMethodError";
        this.method = method;
    }
}
/**
 *  Thrown when the chain did not answer well enough to act on.
 *
 *  Reads are retried and batched in several places here, so this means every attempt failed —
 *  not that one did. Where the SDK can still give a safe partial answer it does that instead of
 *  throwing; this is raised only where continuing would mean guessing.
 */
export class RpcError extends SomniaAccountsError {
    constructor(message, options) {
        super(message, options);
        this.name = "RpcError";
    }
}
/**
 *  Thrown when the indexer is there but will not answer right now: rate-limited, overloaded, or
 *  unreachable.
 *
 *  A subclass of {@link RpcError}, so code that already catches that keeps working. Distinct
 *  because the right reaction is different — wait and ask again, not report a broken read — and
 *  `retryAfterMs` says how long when the indexer said so.
 */
export class IndexerUnavailableError extends RpcError {
    /** How long the indexer asked to wait, when it said. `undefined` when it did not. */
    retryAfterMs;
    constructor(message, options) {
        super(message, options);
        this.name = "IndexerUnavailableError";
        this.retryAfterMs = options?.retryAfterMs;
    }
}
/**
 *  Thrown when a feed's cursor was issued against an index that has since been rebuilt.
 *
 *  A reindex replays history from the start, so the position a cursor remembers may now point at
 *  different rows, or at rows not yet re-read. Continuing would skip or repeat silently. Start the
 *  read again without a cursor.
 */
export class FeedRestartRequiredError extends SomniaAccountsError {
    /** The chain whose index was rebuilt. */
    chainId;
    constructor(chainId) {
        super(`the index for chain ${chainId} was rebuilt since this cursor was issued — start the read again without a cursor`);
        this.name = "FeedRestartRequiredError";
        this.chainId = chainId;
    }
}
/**
 *  Thrown when the client is connected to a different chain than the call is for.
 *
 *  Caught before any read, because the factory answers on every chain and would return a real,
 *  wrong address computed by the wrong chain's deployment.
 */
export class WrongNetworkError extends SomniaAccountsError {
    /** The chain the action is for. */
    expected;
    /** The chain the client or wallet is on. */
    actual;
    /**
     *  @param expected The chain the action is for.
     *  @param actual The chain the client or wallet is on.
     */
    constructor(expected, actual) {
        super(`This action is for chain ${expected}, but the connection is on ${actual}. ` +
            "Switch the wallet, or pass a client for the right chain.");
        this.name = "WrongNetworkError";
        this.expected = expected;
        this.actual = actual;
    }
}
// ------------------------------------------------------------------ submission
/**
 *  Thrown when the sender cannot pay for the transaction.
 *
 *  Raised from the failure the node gave rather than from a balance read, so it stays true for a
 *  sender whose balance is fine but whose allowance of some other resource is not.
 */
export class CannotPayError extends SomniaAccountsError {
    /** The address that could not pay. */
    address;
    /**
     *  @param address The address that could not pay.
     *  @param cause The failure that said so.
     */
    constructor(address, cause) {
        super(`${address} does not hold enough to pay for this transaction.`, { cause });
        this.name = "CannotPayError";
        this.address = address;
    }
}
/**
 *  Thrown when a transaction was sent but no receipt arrived in time.
 *
 *  **Not a failure of the transaction.** It may still land. The hash is the field that matters:
 *  a caller that retries without looking it up first can pay twice for one action.
 */
export class UnconfirmedSendError extends SomniaAccountsError {
    /** The transaction that was sent and not confirmed. */
    hash;
    /**
     *  @param hash The transaction that was sent.
     *  @param what What it was doing, for the message.
     */
    constructor(hash, what) {
        super(`${what} was sent (${hash}) but has not been confirmed yet. It may still land — ` +
            "look it up before sending again.");
        this.name = "UnconfirmedSendError";
        this.hash = hash;
    }
}
/**
 *  Thrown when a transaction mined and reverted.
 *
 *  `reason` is filled in when the revert could be replayed and decoded, and left `undefined` when
 *  it could not — an absent reason means the SDK did not learn one, never that there was none.
 *  `blockNumber` is carried so a caller can replay it against ABIs this SDK does not hold.
 */
export class TransactionRevertedError extends SomniaAccountsError {
    /** The transaction that reverted. */
    hash;
    /** The block it reverted in, so a caller can replay it against different error ABIs. */
    blockNumber;
    /** Why, when it could be recovered. `undefined` when the replay found nothing to name. */
    reason;
    /**
     *  @param hash The transaction that reverted.
     *  @param what What it was doing, for the message.
     *  @param detail `blockNumber` and `reason` when they are known.
     */
    constructor(hash, what, detail) {
        const why = detail?.reason === undefined ? "" : ` ${detail.reason}`;
        super(`${what} reverted (${hash}). Nothing changed.${why}`);
        this.name = "TransactionRevertedError";
        this.hash = hash;
        this.blockNumber = detail?.blockNumber;
        this.reason = detail?.reason;
    }
}
//# sourceMappingURL=errors.js.map