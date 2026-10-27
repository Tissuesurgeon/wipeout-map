import { type Address, type Client, type Hex } from "viem";
import type { Call, SenderBoundCall } from "./call.js";
import { type SafeTx } from "./safe-tx.js";
import { type SignatureEntry } from "./signatures.js";
/**
 *  Everything needed to make an account act, except the signature.
 *
 *  Produced offline from facts read elsewhere, so the hash a user is asked to sign can be shown,
 *  logged and compared before anything is sent.
 */
export interface ExecutionPlan {
    readonly chainId: number;
    /** The account that acts — the one the transaction runs as. */
    readonly account: Address;
    /** What it runs. */
    readonly tx: SafeTx;
    /**
     *  The accounts whose authority is borrowed, nearest first.
     *
     *  Empty when the signer owns `account` directly. `[main]` for a sub-account whose owner is the
     *  main account. Longer for deeper nesting.
     */
    readonly through: readonly Address[];
    /**
     *  Every digest in the chain, innermost first.
     *
     *  `hashes[0]` is the account's own transaction hash; each later entry is the next parent's
     *  approval of the one before it. Carried in full because a mismatch at one level is otherwise
     *  indistinguishable from a wrong key.
     */
    readonly hashes: readonly Hex[];
    /** The single digest the key at the top of the chain must sign. */
    readonly hash: Hex;
}
/**
 *  Plan an execution from a nonce the caller already has.
 *
 *  Pure, so the hash is reproducible without a chain — which is what lets a test pin it and a UI
 *  show it before asking for a signature.
 *
 *  @param args.chainId EIP-155 chain id.
 *  @param args.account The account that acts.
 *  @param args.calls What it does. Several are batched through `MultiSendCallOnly`.
 *  @param args.nonce `account`'s current nonce.
 *  @param args.through The accounts between the signer and `account`, nearest first. Omit when the
 *         signer owns `account` directly — including the case where a session key was added as a
 *         second owner of a sub-account, which is the whole point of adding one.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The plan.
 *  @throws {InvalidInputError} When `calls` is empty.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export declare function planExecution(args: {
    chainId: number;
    account: Address;
    calls: readonly Call[];
    nonce: bigint;
    through?: readonly Address[];
    saltVersion?: string;
}): ExecutionPlan;
/**
 *  Wrap a digest in each account's message envelope, outward.
 *
 *  The shared arithmetic behind every nested approval: an account approving a hash does not sign
 *  that hash, it signs the hash wrapped in its OWN EIP-712 message envelope, so each level changes
 *  what the level above must sign. Used for a transaction hash by {@link planExecution} and for the
 *  factory's authorization digest when an account authorises its own sub-account.
 *
 *  @param chainId EIP-155 chain id. Present here even though the innermost digest may be
 *         chain-agnostic: an account's message envelope is Safe's, and Safe's domain has the chain
 *         id in it. That is why nested consent is per-chain however the inner digest was made.
 *  @param inner The digest at the bottom.
 *  @param chain The accounts that must approve, nearest first.
 *  @returns `[inner, ...one hash per account]`, so the last entry is what the key signs.
 */
export declare function approvalHashes(chainId: number, inner: Hex, chain: readonly Address[]): readonly Hex[];
/**
 *  Fold a key's signature back through a chain of accounts.
 *
 *  The inverse of {@link approvalHashes}: the hashes chain outward from the innermost digest, and
 *  the signature nests back inward, so the nearest account ends up outermost in the blob.
 *
 *  @param signature The key's 65 bytes over the last hash.
 *  @param through The accounts whose authority is borrowed, nearest first.
 *  @returns The blob the innermost verifier checks.
 */
export declare function nestThrough(signature: Hex, through: readonly Address[]): Hex;
/**
 *  Plan an execution, reading the acting account's nonce.
 *
 *  One read, however deep the chain: parents approve a message rather than execute a transaction,
 *  so they have no nonce that enters this.
 *
 *  @param client Any viem client that can read.
 *  @param args As {@link planExecution}, without the nonce.
 *  @returns The plan.
 */
export declare function readExecutionPlan(client: Client, args: {
    chainId: number;
    account: Address;
    calls: readonly Call[];
    through?: readonly Address[];
    saltVersion?: string;
}): Promise<ExecutionPlan>;
/**
 *  Turn one key's signature into the transaction that carries it.
 *
 *  The signature must be over {@link ExecutionPlan.hash} — the LAST hash in the chain, not the
 *  account's own transaction hash. Signing the wrong one is the mistake this whole module exists
 *  to prevent, and it fails as `GS026` rather than as anything that names a hash.
 *
 *  @param plan The plan the signature was made against.
 *  @param signature The key's 65 bytes over `plan.hash`.
 *  @returns The call to send, aimed at the acting account. Any sender may submit it.
 */
export declare function signExecution(plan: ExecutionPlan, signature: Hex): Call;
/**
 *  The transaction an owner can send **without signing anything**.
 *
 *  The case every other function here charges a signature for and this one does not: when the key
 *  that authorises the execution is also the key that broadcasts it, Safe already knows who is
 *  asking. `checkNSignatures` accepts a pre-validated entry — `v = 1` — when `msg.sender` is that
 *  owner, so the wallet round-trip produces a value the contract discards.
 *
 *  **This is the session-key path.** A key added as a second owner in order to act unattended
 *  signs and sends every transaction itself; asking it for a signature first was one wallet call
 *  per write, on the one path built to have none.
 *
 *  **The result is submittable by `sender` and nobody else.** That is why it comes back as a
 *  {@link SenderBoundCall} rather than a `Call`: sent from any other address it reverts `GS025`,
 *  and the receipt does not say why. {@link submitCall} refuses the mismatch before broadcasting.
 *
 *  @param plan The plan to execute. `through` must be empty — see below.
 *  @param sender The owner that will broadcast. Must be a direct owner of `plan.account`, and the
 *         account's threshold must be 1 for this to be sufficient on its own; neither is checkable
 *         offline, and both surface as `GS025` / `GS020`. Use {@link signExecutionWith} with a
 *         `"sender"` entry beside real signatures for a higher threshold.
 *  @returns The call, bound to `sender`.
 *  @throws {InvalidInputError} When `plan.through` is not empty. At depth the thing being approved
 *          is a parent's *message*, and a parent approves it through EIP-1271 — there is no
 *          `msg.sender` in that check to stand in for a signature, so borrowed authority cannot be
 *          pre-validated at any level but the one actually sending.
 */
export declare function prevalidatedExecution(plan: ExecutionPlan, sender: Address): SenderBoundCall;
/**
 *  Turn SEVERAL owners' signatures into the transaction that carries them.
 *
 *  **Needed the moment an account's threshold is above one, and without it such an account cannot
 *  act at all.** Every signing path here took a single signature, which is correct for 1-of-N and
 *  silently makes 2-of-N unusable: the account is fine, the keys are fine, and every transaction
 *  is refused as `GS026`. An app that offers to raise a threshold without this is offering to
 *  brick an account.
 *
 *  Ordering is `packSignatures`' problem, not the caller's — `checkNSignatures` walks the blob
 *  expecting ascending signer addresses and a blob in the wrong order fails identically to a
 *  forged one. Pass the entries in whatever order the signatures arrived.
 *
 *  **Direct owners only, and that limit is real rather than an oversight.** At depth, the thing
 *  being signed is a parent's approval, so N-of-M applies to the PARENT's owners and the blob has
 *  to be built inside the parent's EIP-1271 answer rather than at this level. Threading that
 *  through would change what {@link ExecutionPlan.hashes} means, so it is refused here instead of
 *  being half-supported.
 *
 *  A `"sender"` entry is how one of those signers can be the broadcaster rather than a signature —
 *  a 2-of-N account driven by a session key that sends plus one key that signs. The result is then
 *  a {@link SenderBoundCall}, since it is valid from that address only.
 *
 *  @param plan The plan the signatures were made against. Must have an empty `through`.
 *  @param entries One per signer, each over `plan.hash`. At most one may be a `"sender"` entry.
 *  @returns The call to send, aimed at the acting account. Carries `sender` when an entry named
 *           one, so {@link isSenderBound} recovers the restriction from a value typed as `Call`.
 *  @throws {InvalidInputError} When `plan.through` is not empty, `entries` is empty, or more than
 *          one entry is a `"sender"`: only one address can be `msg.sender`, so the others would
 *          need an on-chain `approveHash` and the call could not be bound to one broadcaster.
 *          Pack those with {@link packSignatures} and {@link execTransactionCall} directly.
 */
export declare function signExecutionWith(plan: ExecutionPlan, entries: readonly SignatureEntry[]): Call;
/**
 *  The accounts a signer must borrow authority through to act as `account`.
 *
 *  Answers the question a caller actually has — "I hold this key, what do I pass as `through`" —
 *  by walking the ownership graph upward until the signer appears. `null` when it does not, which
 *  is a real answer rather than an error: the account may be controlled by keys this session does
 *  not hold, and offering an execution that is guaranteed to revert is worse than saying so.
 *
 *  Breadth-first, so the SHORTEST chain wins when an account is reachable more than one way — the
 *  shortest is also the cheapest to execute, since every level adds a wrapper and an EIP-1271 call.
 *
 *  @param client Any viem client that can read.
 *  @param account The account that should act.
 *  @param signer The key the caller holds.
 *  @param options.maxDepth How far up to look. Past this, `null` means "not within this depth".
 *  @returns The parents, nearest first, or `null` when the signer has no authority here.
 */
export declare function authorityPath(client: Client, account: Address, signer: Address, options?: {
    maxDepth?: number;
}): Promise<readonly Address[] | null>;
//# sourceMappingURL=execute.d.ts.map