// One signature, every chain.
//
// LOCKSTEP: this module mirrors the EIP-712 surface of `SomniaAccountFactory` — the domain, the
// type string, and the digest composition. `test/authorization.test.ts` pins this side against
// values `smart-contracts/test/AuthorizationFixtures.t.sol` produced. Change one, change the
// other, in the same PR. Nothing in either type system can catch a drift, and the symptom is the
// worst one this codebase has: the wallet signs, the factory recovers a different address, and the
// failure reads as "invalid signature" — pointing the reader at the key rather than at the hash.
//
// **What this is for.** Granting a session key authority over an account is a Safe
// `execTransaction`, and Safe's EIP-712 domain contains the chain id, so the same consent decision
// has to be re-signed on every network: four chains, four prompts. The factory's
// `createAccountWithOwners` takes that decision as one signature against a domain with NO chain id
// (see `authorizationDomain`), deploys the account and sets the whole owner set in one transaction,
// and accepts the same bytes on every chain the factory sits at.
//
// **Several accounts, one signature too.** The message names parallel lists — `indices` and the
// `accounts` they derive to — so a dapp that wants a main account and four sub-accounts asks for
// five indices rather than for five prompts. On chain an index whose account already exists is
// SKIPPED rather than reverting (`AccountCreationSkipped`), so the same authorization can be drained
// twice, or raced by a plain `createAccount`, without failing; a batch where every index was
// already taken is the one exception and reverts with `NothingToCreate`.
//
// **What keeps that safe** is not this module — it is `MAX_AUTHORIZATION_WINDOW` in the contract,
// which refuses any authorization that could still be used more than five hours from now. A signature
// here is a work item with minutes to live, not a credential: whatever stores one is a queue, and a
// row past its deadline is dead weight rather than a liability.
import { encodeFunctionData, getAddress, getTypesForEIP712Domain, hashMessage, hashTypedData, isAddressEqual, recoverAddress, size, slice, } from "viem";
import { somniaAccountFactoryAbi } from "./abi/generated/index.js";
import { accountAddress, createAccountsGasLimit, factoryAddress } from "./factory.js";
import { InvalidInputError } from "./errors.js";
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
export const ACCOUNT_AUTHORIZATION_TYPES = {
    AccountAuthorization: [
        { name: "accountId", type: "address" },
        { name: "indices", type: "uint256[]" },
        { name: "accounts", type: "address[]" },
        { name: "additionalOwners", type: "address[]" },
        { name: "threshold", type: "uint256" },
        { name: "issuedAt", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
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
export const MAX_AUTHORIZATION_WINDOW = 18000n;
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
export const DEFAULT_AUTHORIZATION_WINDOW = 900n;
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
export function authorizationDomain(factory) {
    return {
        name: "SomniaAccountFactory",
        version: "1",
        verifyingContract: getAddress(factory),
    };
}
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
export function accountAuthorizationTypedData(factory, authorization) {
    return {
        domain: authorizationDomain(factory),
        types: ACCOUNT_AUTHORIZATION_TYPES,
        primaryType: "AccountAuthorization",
        message: {
            accountId: getAddress(authorization.accountId),
            indices: [...authorization.indices],
            accounts: authorization.accounts.map((account) => getAddress(account)),
            additionalOwners: authorization.additionalOwners.map((owner) => getAddress(owner)),
            threshold: authorization.threshold,
            issuedAt: authorization.issuedAt,
            deadline: authorization.deadline,
        },
    };
}
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
export function accountAuthorizationPayload(factory, authorization) {
    const domain = authorizationDomain(factory);
    return {
        domain,
        types: {
            EIP712Domain: getTypesForEIP712Domain({ domain }),
            ...ACCOUNT_AUTHORIZATION_TYPES,
        },
        primaryType: "AccountAuthorization",
        message: {
            accountId: getAddress(authorization.accountId),
            indices: authorization.indices.map((index) => index.toString()),
            accounts: authorization.accounts.map((account) => getAddress(account)),
            additionalOwners: authorization.additionalOwners.map((owner) => getAddress(owner)),
            threshold: authorization.threshold.toString(),
            issuedAt: authorization.issuedAt.toString(),
            deadline: authorization.deadline.toString(),
        },
    };
}
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
export function accountAuthorizationHash(factory, authorization) {
    return hashTypedData(accountAuthorizationTypedData(factory, authorization));
}
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
export function buildAccountAuthorization(args) {
    const window = args.window ?? DEFAULT_AUTHORIZATION_WINDOW;
    if (window > MAX_AUTHORIZATION_WINDOW) {
        throw new InvalidInputError(`A ${window}s window is longer than the ${MAX_AUTHORIZATION_WINDOW}s every chain accepts.`);
    }
    // Refused here rather than on chain, where it is `NoIndices` after the gas is spent and after
    // somebody has already been asked to sign a message authorising nothing.
    if (args.indices.length === 0) {
        throw new InvalidInputError("An authorization must name at least one index; every chain refuses none.");
    }
    return {
        accountId: getAddress(args.accountId),
        indices: [...args.indices],
        accounts: args.indices.map((index) => accountAddress(args.chainId, args.accountId, index, args.saltVersion)),
        additionalOwners: args.additionalOwners.map((owner) => getAddress(owner)),
        threshold: args.threshold ?? 1n,
        issuedAt: args.now,
        deadline: args.now + window,
    };
}
// No `signer` case, deliberately. Whether the signature is `accountId`'s cannot be
// decided here: recovery is async, and an EIP-1271 signer answers on chain and may
// answer differently per chain and over time. A variant nothing produces would read
// as a check this function performs. See {@link recoverAuthorizationSigner}.
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
export function checkAccountAuthorization(signed, args) {
    const problems = [];
    const { authorization } = signed;
    if (args.now > authorization.deadline) {
        problems.push({ kind: "expired", deadline: authorization.deadline, now: args.now });
    }
    if (args.now < authorization.issuedAt) {
        problems.push({ kind: "notYetValid", issuedAt: authorization.issuedAt, now: args.now });
    }
    // From the SIGNED issue time. Against `args.now` this reported a dormant authorization as one
    // that "was never usable", so a client pruning on it would drop the row five hours before it
    // became live on every chain at once.
    const latest = authorization.issuedAt + MAX_AUTHORIZATION_WINDOW;
    if (authorization.deadline > latest) {
        problems.push({ kind: "window", deadline: authorization.deadline, latest });
    }
    const expectedFactory = factoryAddress(args.chainId, args.saltVersion);
    if (!isAddressEqual(getAddress(signed.factory), expectedFactory)) {
        problems.push({ kind: "factory", signed: getAddress(signed.factory), expected: expectedFactory });
    }
    const { indices, accounts } = authorization;
    if (indices.length === 0) {
        problems.push({ kind: "empty" });
    }
    if (indices.length !== accounts.length) {
        problems.push({ kind: "length", indices: indices.length, accounts: accounts.length });
    }
    // Every position the two lists agree on is still checked, even when they do not agree on their
    // length: a row that is short by one entry AND wrong about an address is two bugs, and stopping
    // at the first hides the second — which is the same reason nothing here throws.
    for (let position = 0; position < Math.min(indices.length, accounts.length); position++) {
        const index = indices[position];
        const account = accounts[position];
        const derived = accountAddress(args.chainId, authorization.accountId, index, args.saltVersion);
        if (!isAddressEqual(getAddress(account), derived)) {
            problems.push({ kind: "derivation", position, index, signed: getAddress(account), derived });
        }
    }
    return problems;
}
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
export async function recoverAuthorizationSigner(signed) {
    if (size(signed.signature) !== 65) {
        throw new InvalidInputError(`Only a 65-byte signature can be recovered from; this one is ${size(signed.signature)} bytes. ` +
            "An EIP-1271 signature is answered by the signing account, on chain.");
    }
    const digest = accountAuthorizationHash(signed.factory, signed.authorization);
    const v = Number(BigInt(slice(signed.signature, 64, 65)));
    // Safe's marker: the wallet signed the digest as a message rather than as typed data, and added
    // four to `v` to say so. Recovering it as typed data would return a real, wrong address.
    if (v > 30) {
        const unmarked = (slice(signed.signature, 0, 64) +
            (v - 4).toString(16).padStart(2, "0"));
        return recoverAddress({ hash: hashMessage({ raw: digest }), signature: unmarked });
    }
    return recoverAddress({ hash: digest, signature: signed.signature });
}
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
export function encodeCreateAccountWithOwners(signed) {
    const { authorization } = signed;
    return encodeFunctionData({
        abi: somniaAccountFactoryAbi,
        functionName: "createAccountWithOwners",
        args: [
            authorization.accountId,
            authorization.indices,
            authorization.accounts,
            authorization.additionalOwners,
            authorization.threshold,
            authorization.issuedAt,
            authorization.deadline,
            signed.signature,
        ],
    });
}
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
export function createAccountWithOwnersCall(chainId, signed, saltVersion) {
    return {
        to: factoryAddress(chainId, saltVersion),
        value: 0n,
        data: encodeCreateAccountWithOwners(signed),
        gas: createAccountsGasLimit(signed.authorization.indices.length),
    };
}
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
export function createAccountWithOwnersCalls(chainIds, signed, saltVersion) {
    return chainIds.map((chainId) => ({
        chainId,
        ...createAccountWithOwnersCall(chainId, signed, saltVersion),
    }));
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
export function serializeAccountAuthorization(signed) {
    const { authorization } = signed;
    return {
        factory: getAddress(signed.factory),
        accountId: getAddress(authorization.accountId),
        indices: authorization.indices.map((index) => index.toString()),
        accounts: authorization.accounts.map((account) => getAddress(account)),
        additionalOwners: authorization.additionalOwners.map((owner) => getAddress(owner)),
        threshold: authorization.threshold.toString(),
        issuedAt: authorization.issuedAt.toString(),
        deadline: authorization.deadline.toString(),
        signature: signed.signature,
    };
}
/**
 *  The inverse of {@link serializeAccountAuthorization}.
 *
 *  Checksums every address on the way back, so a row that was lowercased by a database round trip
 *  produces the same digest it did before it was stored — which is the whole point of storing it.
 *
 *  @param row A row produced by {@link serializeAccountAuthorization}.
 *  @returns The signed authorization.
 */
export function deserializeAccountAuthorization(row) {
    return {
        factory: getAddress(row.factory),
        authorization: {
            accountId: getAddress(row.accountId),
            indices: row.indices.map((index) => BigInt(index)),
            accounts: row.accounts.map((account) => getAddress(account)),
            additionalOwners: row.additionalOwners.map((owner) => getAddress(owner)),
            threshold: BigInt(row.threshold),
            issuedAt: BigInt(row.issuedAt),
            deadline: BigInt(row.deadline),
        },
        signature: row.signature,
    };
}
//# sourceMappingURL=authorization.js.map