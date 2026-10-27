import { type Address, type Hex, type TypedDataDefinition } from "viem";
import type { Call } from "./call.js";
/**
 *  The EIP-712 type of an authorization, as viem wants it.
 *
 *  `additionalOwners` is the owners granted ALONGSIDE the signer, never the complete set. The
 *  contract prepends `accountId` itself, so a message cannot hand the signer's own deterministic
 *  address to somebody else — which is the shape a phishing prompt would take for something this
 *  replayable.
 *
 *  `indices` and `accounts` are parallel: one signed address per index, in the same order. The
 *  addresses are redundant — each is derivable from its index — and are signed anyway, for the
 *  reason the contract gives: the signer was shown those addresses, and the factory is
 *  upgradeable, so signing them turns the derivation into something the chain checks rather than
 *  something this SDK promises.
 *
 *  **The array encoding is the part that has to agree byte for byte.** EIP-712 hashes a dynamic
 *  array as the keccak of its members' 32-byte encodings concatenated, which viem does natively
 *  and which the contract spells out as `keccak256(abi.encodePacked(list))` — packed encoding pads
 *  array members to a full word, so the two are the same bytes. `abi.encode` there would prepend
 *  an offset and a length and hash something no client reproduces.
 */
export declare const ACCOUNT_AUTHORIZATION_TYPES: {
    readonly AccountAuthorization: readonly [{
        readonly name: "accountId";
        readonly type: "address";
    }, {
        readonly name: "indices";
        readonly type: "uint256[]";
    }, {
        readonly name: "accounts";
        readonly type: "address[]";
    }, {
        readonly name: "additionalOwners";
        readonly type: "address[]";
    }, {
        readonly name: "threshold";
        readonly type: "uint256";
    }, {
        readonly name: "issuedAt";
        readonly type: "uint256";
    }, {
        readonly name: "deadline";
        readonly type: "uint256";
    }];
};
/**
 *  The furthest a deadline may sit past `issuedAt`, in seconds, as the contract enforces it.
 *
 *  Mirrored from `MAX_AUTHORIZATION_WINDOW` so a client can refuse offline rather than discover it
 *  from a revert on every chain at once. The contract is the authority; this is a courtesy.
 *
 *  **Measured from the signed `issuedAt`, not from now.** That is what makes the bound decidable
 *  offline and permanent: an authorization that exceeds it is malformed on every chain forever,
 *  rather than merely early. It used to be measured against `block.timestamp`, which bounded the
 *  time REMAINING — so a far-dated deadline was refused today and accepted five hours before it,
 *  and this module reported the live signature as one that "was never usable".
 *
 *  LOCKSTEP: `smart-contracts/test/AuthorizationFixtures.t.sol` pins the contract's value and names
 *  this constant, so lowering one without the other fails there rather than in production — where
 *  the symptom would be a client happily minting authorizations every chain refuses.
 */
export declare const MAX_AUTHORIZATION_WINDOW = 18000n;
/**
 *  What {@link buildAccountAuthorization} uses when no window is given.
 *
 *  Fifteen minutes: long enough to fan out over several chains and retry the one whose RPC was
 *  down, short enough that the signature is worthless by the time anything could be done with it.
 *  **Nothing forces this number.** It is what {@link buildAccountAuthorization} uses when a caller
 *  says nothing; pass `window` for anything else, up to {@link MAX_AUTHORIZATION_WINDOW}. Short is
 *  the better default because the signature is worthless once the fan-out is done, and the room
 *  left over is headroom for the fact that `block.timestamp` is a per-chain clock — the deadline is
 *  absolute, so a chain running behind would otherwise refuse a signature its signer considers
 *  live.
 */
export declare const DEFAULT_AUTHORIZATION_WINDOW = 900n;
/** The fields an owner signs to authorise one or more accounts and the owners they start with. */
export interface AccountAuthorization {
    /** The owner EOA the addresses derive from, and the address that signs. */
    readonly accountId: Address;
    /**
     *  Which of that owner's accounts. One entry per account the signature creates.
     *
     *  Never empty — the factory refuses an empty batch with `NoIndices`. Duplicates are legal and
     *  need no special case: the first occurrence deploys and the second finds code at the same
     *  address and is skipped.
     */
    readonly indices: readonly bigint[];
    /**
     *  The addresses those indices derive to, in the same order. Signed, and each asserted on chain
     *  against its own index before anything is deployed.
     */
    readonly accounts: readonly Address[];
    /** The owners granted alongside `accountId`. Never the complete set. */
    readonly additionalOwners: readonly Address[];
    /** The threshold the account is set up with. */
    readonly threshold: bigint;
    /**
     *  Unix seconds. When the authorization was issued, signed so the window bounds the message
     *  rather than the moment it is submitted.
     *
     *  The contract refuses it until this moment arrives, so a forward-dated value is a scheduled
     *  authorization rather than an invalid one — which is exactly why it is worth reading before
     *  signing.
     */
    readonly issuedAt: bigint;
    /** Unix seconds. The last moment this may be used, on any chain. */
    readonly deadline: bigint;
}
/**
 *  An authorization, its signature, and the factory it is bound to — everything a broadcaster
 *  needs and nothing about any one chain.
 *
 *  The factory address travels with it deliberately. It is the same on every chain, so carrying it
 *  makes a stored row self-contained: a broadcaster can verify and send it without resolving a
 *  manifest, and a row that was signed against a different deployment cannot be silently replayed
 *  against this one.
 */
export interface SignedAccountAuthorization {
    /** The factory the signature is bound to, as the EIP-712 `verifyingContract`. */
    readonly factory: Address;
    /** What was signed. */
    readonly authorization: AccountAuthorization;
    /** `accountId`'s signature. 65 bytes, or an EIP-1271 blob when `accountId` is an account. */
    readonly signature: Hex;
}
/**
 *  The EIP-712 domain authorizations are signed against.
 *
 *  **There is no `chainId`, and that is the entire feature.** EIP-712 says a domain carries only
 *  the fields that make sense for it; leaving this one out makes the separator a function of the
 *  factory's address alone, and the factory sits at one address on every chain. One signature,
 *  every network.
 *
 *  Omitted rather than set to zero, which matters twice over. A `chainId` of zero is still a
 *  present field, so a wallet that validates it against its selected network would reject the
 *  request or demand a chain switch; and viem builds the `EIP712Domain` type from the fields
 *  actually present, so an explicit zero would change the separator into something the contract
 *  does not compute.
 *
 *  @param factory The factory's address, which is the `verifyingContract`.
 *  @returns The domain.
 */
export declare function authorizationDomain(factory: Address): {
    readonly name: "SomniaAccountFactory";
    readonly version: "1";
    readonly verifyingContract: Address;
};
/**
 *  The typed data to hand a wallet.
 *
 *  Pass it to `signTypedData`. What comes back goes into a {@link SignedAccountAuthorization} and
 *  never needs to be produced again, however many chains it is sent to.
 *
 *  @param factory The factory's address.
 *  @param authorization What is being authorised.
 *  @returns The typed data.
 */
export declare function accountAuthorizationTypedData(factory: Address, authorization: AccountAuthorization): TypedDataDefinition<typeof ACCOUNT_AUTHORIZATION_TYPES, "AccountAuthorization">;
/**
 *  The typed data as a wallet or a signing enclave wants it on the wire: every field spelled out,
 *  every integer a decimal string.
 *
 *  **This exists so no consumer has to spell out `EIP712Domain` itself**, which is the one thing in
 *  this design that must not be guessed. Privy's enclave rejects a payload whose `types` lacks the
 *  domain entry, and `JSON.stringify` throws on a `bigint`, so every consumer would otherwise
 *  hand-write both — and hand-writing the domain's field list means hand-writing the absence of
 *  `chainId`. A copy that gained the field back would produce signatures the factory rejects with
 *  nothing to point at.
 *
 *  The domain's field list is derived from {@link authorizationDomain} rather than written out
 *  again here, so there is one place the domain is decided even inside this module.
 *
 *  @param factory The factory's address.
 *  @param authorization What is being authorised.
 *  @returns A JSON-serialisable payload for `eth_signTypedData_v4`.
 */
export declare function accountAuthorizationPayload(factory: Address, authorization: AccountAuthorization): {
    readonly domain: ReturnType<typeof authorizationDomain>;
    readonly types: Record<string, readonly {
        readonly name: string;
        readonly type: string;
    }[]>;
    readonly primaryType: "AccountAuthorization";
    readonly message: Record<string, string | readonly string[]>;
};
/**
 *  The digest the wallet actually signs, computed offline.
 *
 *  Agrees with the factory's `hashAccountAuthorization`, which is the authority — ask the chain
 *  before signing anything that matters, and use this for a screen, a log line, or a database key.
 *
 *  @param factory The factory's address.
 *  @param authorization What is being authorised.
 *  @returns The EIP-712 digest.
 */
export declare function accountAuthorizationHash(factory: Address, authorization: AccountAuthorization): Hex;
/**
 *  Assemble an authorization for one or more of an owner's accounts, with the addresses already
 *  derived.
 *
 *  The everyday entry point: takes what a caller knows and fills in the two things they would
 *  otherwise have to get right themselves — one account address per index, which the contract
 *  asserts, and the deadline, which it bounds.
 *
 *  `now` is a parameter rather than a call to the clock so that the whole module stays pure and a
 *  test can pin a deadline. Pass `BigInt(Math.floor(Date.now() / 1000))`.
 *
 *  Nothing is deduplicated or sorted: the list is signed in the order given, so reordering it here
 *  would produce a message the caller did not ask for and did not see. A repeated index is legal —
 *  the factory deploys the first and skips the second.
 *
 *  @param args.chainId Any chain the factory is deployed on. Only used to find the factory, whose
 *         address — and therefore every value here — is the same on all of them.
 *  @param args.accountId The owner EOA that will sign.
 *  @param args.indices Which of that owner's accounts. One signature covers all of them.
 *  @param args.additionalOwners The keys to grant alongside `accountId`, in order. The same set
 *         for every account in the batch.
 *  @param args.threshold The threshold. Defaults to 1, which is what a session key needs.
 *  @param args.now Unix seconds, from the caller's clock.
 *  @param args.window How long the authorization should live. Defaults to
 *         {@link DEFAULT_AUTHORIZATION_WINDOW}.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The authorization, ready to sign.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 *  @throws {InvalidInputError} When the window exceeds {@link MAX_AUTHORIZATION_WINDOW}, or when no index
 *          is named at all — both of which every chain would refuse.
 */
export declare function buildAccountAuthorization(args: {
    chainId: number;
    accountId: Address;
    indices: readonly bigint[];
    additionalOwners: readonly Address[];
    threshold?: bigint;
    now: bigint;
    window?: bigint;
    saltVersion?: string;
}): AccountAuthorization;
/** Why a stored authorization cannot be broadcast. */
export type AuthorizationProblem = 
/** Its deadline has passed. Nothing to do but ask for a new signature. */
{
    readonly kind: "expired";
    readonly deadline: bigint;
    readonly now: bigint;
}
/**
 *  Its deadline sits further past `issuedAt` than any chain accepts, so it is malformed and
 *  always will be. Unlike every other problem here this one does not depend on `now` — the
 *  window is measured from the signed issue time, so the answer is the same today and in a year.
 */
 | {
    readonly kind: "window";
    readonly deadline: bigint;
    readonly latest: bigint;
}
/**
 *  It claims an issue time that has not arrived, so every chain refuses it for now and accepts
 *  it from `issuedAt` onwards. **Not a dead row — a scheduled one.** Worth surfacing rather than
 *  discarding: a signature nobody meant to schedule is the shape a phished authorization takes.
 */
 | {
    readonly kind: "notYetValid";
    readonly issuedAt: bigint;
    readonly now: bigint;
}
/** It names no indices at all, which the contract refuses as `NoIndices`. */
 | {
    readonly kind: "empty";
}
/**
 *  `indices` and `accounts` are different lengths, which the contract refuses as
 *  `ListLengthMismatch`. They are parallel by construction, so this is a caller that built the
 *  message by hand rather than through {@link buildAccountAuthorization}.
 */
 | {
    readonly kind: "length";
    readonly indices: number;
    readonly accounts: number;
}
/**
 *  One signed account address is not what its index derives to — the contract's `WrongAccount`,
 *  which names only the two addresses. This names the position and the index as well, because a
 *  batch has several and "one of them is wrong" is not something a caller can act on.
 */
 | {
    readonly kind: "derivation";
    /** Where in the lists, so a duplicated index is still unambiguous. */
    readonly position: number;
    /** The index at that position. */
    readonly index: bigint;
    readonly signed: Address;
    readonly derived: Address;
}
/** It was signed against a different factory. */
 | {
    readonly kind: "factory";
    readonly signed: Address;
    readonly expected: Address;
};
/**
 *  Everything about a stored authorization that can be checked without a chain.
 *
 *  Worth running before every broadcast, not just once after signing. A fan-out is N transactions
 *  over minutes against a deadline measured in minutes, and each of these failures costs a
 *  transaction that reverts after the gas is spent — while looking, from the outside, like the
 *  chain rejected a legitimate signature.
 *
 *  Returns the problems rather than throwing on the first, because a row that is both expired and
 *  derived against the wrong factory is a different bug from either alone. An empty array means
 *  every offline check passed; it does not mean the ECDSA recovery did — that is
 *  {@link recoverAuthorizationSigner}, which is async and may need a chain for an EIP-1271 signer.
 *
 *  @param signed The stored authorization.
 *  @param args.chainId The chain it is about to be sent to.
 *  @param args.now Unix seconds.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns Every problem found, in the order they are checked. Empty when there are none.
 */
export declare function checkAccountAuthorization(signed: SignedAccountAuthorization, args: {
    chainId: number;
    now: bigint;
    saltVersion?: string;
}): readonly AuthorizationProblem[];
/**
 *  Who signed a stored authorization, for a plain key.
 *
 *  Handles both shapes the factory accepts from an EOA: a plain EIP-712 signature, and the digest
 *  signed as a message with `v + 4`, which is Safe's convention and the escape hatch for a wallet
 *  that refuses typed data whose domain it cannot validate.
 *
 *  **Not for an EIP-1271 signer.** When `accountId` is itself an account there is nothing to
 *  recover — the parent answers `isValidSignature` on the chain being reached, and the answer can
 *  differ per chain and over time. Ask the chain in that case.
 *
 *  @param signed The stored authorization.
 *  @returns The address that produced the signature.
 *  @throws {InvalidInputError} When the signature is not 65 bytes, which is every case this cannot
 *          answer — an EIP-1271 signature is answered by the signing account, on chain.
 */
export declare function recoverAuthorizationSigner(signed: SignedAccountAuthorization): Promise<Address>;
/**
 *  Calldata for `createAccountWithOwners`.
 *
 *  Creates every index the authorization names. One whose account already exists is skipped rather
 *  than reverting, so this is safe to send twice — unless EVERY index is already taken, which is
 *  `NothingToCreate` and the one place the entry point is deliberately not idempotent.
 *
 *  @param signed The authorization and its signature.
 *  @returns The calldata, identical for every chain.
 */
export declare function encodeCreateAccountWithOwners(signed: SignedAccountAuthorization): Hex;
/**
 *  The whole `createAccountWithOwners` transaction for one chain.
 *
 *  `gas` comes from {@link createAccountsGasLimit}, sized to the batch, for the reason that
 *  function's comment gives: the limit this call needs is not something a caller can estimate,
 *  because Safe's `setup` runs nested inside the factory's frame and needs a floor of gas REMAINING
 *  rather than a budget of gas spent — and a batch runs that nested call once per account. Setting
 *  up two owners instead of one costs about 56,000 gas more than `createAccount` — measured in
 *  `AccountAuthorization.t.sol` — which is noise against that floor.
 *
 *  @param chainId EIP-155 chain id, used to find the factory.
 *  @param signed The authorization and its signature.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The call.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 *  @throws {InvalidInputError} When the authorization names no indices, which has no gas limit because it
 *          has nothing to do — `NoIndices` on chain. {@link checkAccountAuthorization} reports it
 *          as a problem rather than throwing, for a stored row being triaged.
 */
export declare function createAccountWithOwnersCall(chainId: number, signed: SignedAccountAuthorization, saltVersion?: string): Call & {
    readonly gas: bigint;
};
/**
 *  The same authorization as one call per chain — the fan-out, as data.
 *
 *  The calldata is byte-identical across them; only the target differs, and today not even that.
 *  Returned as a list rather than sent, because who pays and in what order is the caller's: they
 *  are independent transactions on independent chains, each needing its own funded sender, and a
 *  chain that fails is retried rather than rolling anything back.
 *
 *  @param chainIds The chains to reach.
 *  @param signed The authorization and its signature.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns One call per chain, in the order given.
 *  @throws {UnsupportedChainError} When nothing is committed for one of them.
 */
export declare function createAccountWithOwnersCalls(chainIds: readonly number[], signed: SignedAccountAuthorization, saltVersion?: string): readonly (Call & {
    readonly gas: bigint;
    readonly chainId: number;
})[];
/** A {@link SignedAccountAuthorization} with every `bigint` as a decimal string. */
export interface SerializedAccountAuthorization {
    readonly factory: Address;
    readonly accountId: Address;
    /** Parallel to {@link SerializedAccountAuthorization.accounts}, each index as a decimal string. */
    readonly indices: readonly string[];
    readonly accounts: readonly Address[];
    readonly additionalOwners: readonly Address[];
    readonly threshold: string;
    readonly issuedAt: string;
    readonly deadline: string;
    readonly signature: Hex;
}
/**
 *  Flatten a signed authorization into something `JSON.stringify` accepts.
 *
 *  This exists because the thing a consumer does with a signature is put it somewhere for the few
 *  minutes it takes to reach every chain, and `JSON.stringify` throws on a `bigint` — so every
 *  consumer would otherwise write this conversion, and one of them would write it wrong. Decimal
 *  strings rather than numbers: an index is a `uint256` and `deadline` will outlive `Number`'s
 *  exactness long after nobody is checking.
 *
 *  @param signed The authorization and its signature.
 *  @returns A JSON-safe row.
 */
export declare function serializeAccountAuthorization(signed: SignedAccountAuthorization): SerializedAccountAuthorization;
/**
 *  The inverse of {@link serializeAccountAuthorization}.
 *
 *  Checksums every address on the way back, so a row that was lowercased by a database round trip
 *  produces the same digest it did before it was stored — which is the whole point of storing it.
 *
 *  @param row A row produced by {@link serializeAccountAuthorization}.
 *  @returns The signed authorization.
 */
export declare function deserializeAccountAuthorization(row: SerializedAccountAuthorization): SignedAccountAuthorization;
//# sourceMappingURL=authorization.d.ts.map