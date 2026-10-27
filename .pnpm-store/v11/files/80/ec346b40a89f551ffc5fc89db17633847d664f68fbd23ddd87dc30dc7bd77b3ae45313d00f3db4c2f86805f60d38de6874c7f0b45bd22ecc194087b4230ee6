import { concat, encodeAbiParameters, getAddress, keccak256, numberToHex, size, } from "viem";
import { InvalidInputError } from "./errors.js";
/** How many bytes each signer occupies in the static part, regardless of kind. */
const SLOT = 65;
function addressOf(entry) {
    if (entry.kind === "key")
        return getAddress(entry.signer);
    if (entry.kind === "sender")
        return getAddress(entry.sender);
    return getAddress(entry.account);
}
/**
 *  The 65 bytes that mean "the owner broadcasting this transaction approves it".
 *
 *  Safe's *pre-validated* signature: the owner's address in `r`, zero in `s`, `v = 1`. There is no
 *  cryptography in it — `checkNSignatures` sees `v == 1` and accepts the entry when
 *  `msg.sender == owner` (or when the owner has pre-approved the hash on chain), which is why it
 *  costs nothing and prompts nobody.
 *
 *  **This is the shape that makes acting from an account free.** A session key that both signs and
 *  sends was signing a hash for its own benefit: it is already `msg.sender`, so the signature was
 *  a round-trip through a wallet for a value Safe was going to ignore. Every write on that path —
 *  every trade, every transfer — was paying one `personal_sign` it did not need.
 *
 *  **The catch, and it is the whole catch: the blob is bound to one sender.** Anyone else
 *  broadcasting it reverts `GS025`, after the gas. Reach for {@link prevalidatedExecution}, which
 *  returns a {@link SenderBoundCall} carrying that address, rather than packing these bytes into a
 *  plain `Call` that looks submittable by anyone.
 *
 *  @param sender The owner that will send the transaction.
 *  @returns The 65 bytes, ready for {@link packSignatures} or as a blob on their own.
 */
export function prevalidatedSignature(sender) {
    return concat([
        // r: the owner's address, left-padded to a full word.
        numberToHex(BigInt(getAddress(sender)), { size: 32 }),
        // s: unused, and must be zero — a non-zero value is read as a dynamic-part offset.
        numberToHex(0n, { size: 32 }),
        // v: one marks "msg.sender is this owner, or this owner approved the hash on chain".
        "0x01",
    ]);
}
/**
 *  Pack signatures into the blob `execTransaction` expects.
 *
 *  Sorts for you, because the ordering rule is invisible in the failure. Offsets are computed
 *  after the whole static part, which also satisfies Safe's `GS021` guard by construction: the
 *  guard requires `offset >= requiredSignatures * 65`, and the first dynamic byte sits at
 *  `entries.length * 65`, which is at least that for any threshold the entries could satisfy.
 *
 *  **A `"sender"` entry makes the blob valid for one broadcaster only**, and nothing in the bytes
 *  records which — see {@link prevalidatedSignature}. More than one is encodable and not a
 *  mistake: `v = 1` is satisfied either by `msg.sender` or by an owner that called `approveHash`
 *  beforehand, so a 2-of-N account can be driven by one sender plus one on-chain approval. Only
 *  the first of those is free, and {@link prevalidatedExecution} covers it.
 *
 *  @throws {InvalidInputError} When `entries` is empty, an entry's signature is the wrong length,
 *          or two entries name one address.
 */
export function packSignatures(entries) {
    if (entries.length === 0) {
        throw new InvalidInputError("Cannot pack an empty signature set.");
    }
    for (const entry of entries) {
        if (entry.kind === "key" && size(entry.signature) !== SLOT) {
            throw new InvalidInputError(`A key's signature must be ${SLOT} bytes; ${entry.signer} gave ${size(entry.signature)}.`);
        }
    }
    const sorted = [...entries].sort((a, b) => addressOf(a).toLowerCase() < addressOf(b).toLowerCase() ? -1 : 1);
    for (let i = 1; i < sorted.length; i++) {
        // Safe rejects a repeated owner with GS026 rather than ignoring it, and a caller that
        // accidentally passed the same account twice would read that as "not an owner".
        if (addressOf(sorted[i]) === addressOf(sorted[i - 1])) {
            throw new InvalidInputError(`${addressOf(sorted[i])} appears twice in the signature set.`);
        }
    }
    const staticParts = [];
    const dynamicParts = [];
    // The first dynamic byte lands immediately after every static slot.
    let offset = sorted.length * SLOT;
    for (const entry of sorted) {
        if (entry.kind === "key") {
            staticParts.push(entry.signature);
            continue;
        }
        // A pre-validated entry is a full static slot and contributes no dynamic bytes, so it does not
        // move `offset`. It is otherwise an ordinary signer: it sorts by address with the rest, and it
        // counts towards the threshold like the rest.
        if (entry.kind === "sender") {
            staticParts.push(prevalidatedSignature(entry.sender));
            continue;
        }
        staticParts.push(concat([
            // r: the contract's address, left-padded to a full word.
            numberToHex(BigInt(getAddress(entry.account)), { size: 32 }),
            // s: where this signature's length-prefixed bytes begin.
            numberToHex(BigInt(offset), { size: 32 }),
            // v: zero marks a contract signature.
            "0x00",
        ]));
        const length = size(entry.signature);
        dynamicParts.push(concat([numberToHex(BigInt(length), { size: 32 }), entry.signature]));
        offset += 32 + length;
    }
    return concat([...staticParts, ...dynamicParts]);
}
/**
 *  Wrap a parent account's signature so a child account accepts it.
 *
 *  The one-signer case of {@link packSignatures}, named because it is the case a caller reaches
 *  for and because "nest a signature" is what they are trying to do. `parentSignature` is
 *  whatever satisfies the parent's own threshold — a key's 65 bytes, or another nested blob,
 *  which is what makes depth unbounded and gas the only limit.
 *
 *  The child must have `parent` as an owner, and the parent must have a fallback handler
 *  installed: the EIP-1271 check reaches the account through it, and an account with no handler
 *  cannot answer `isValidSignature` at all. Our factory installs one at creation, so this holds
 *  for anything it made.
 */
export function nestedSignature(parent, parentSignature) {
    return packSignatures([{ kind: "account", account: parent, signature: parentSignature }]);
}
/**
 *  `keccak256("EIP712Domain(uint256 chainId,address verifyingContract)")`.
 *
 *  Taken from Safe's own `DOMAIN_SEPARATOR_TYPEHASH` constant rather than re-derived, and the
 *  test asserts it against the preimage — the same treatment as the storage slots, for the same
 *  reason: a wrong typehash produces a hash that is valid-looking and rejected.
 */
const DOMAIN_SEPARATOR_TYPEHASH = "0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218";
/** `keccak256("SafeMessage(bytes message)")`, Safe's `SAFE_MSG_TYPEHASH`. */
const SAFE_MSG_TYPEHASH = "0x60b3cbf8b4a223d68d641b3b6ddf9a298e7f33710cf3d3a9d1146b5a6150fbca";
/** An account's EIP-712 domain separator. Computed offline: it is only the chain and the address. */
export function safeDomainSeparator(chainId, safe) {
    return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }, { type: "address" }], [DOMAIN_SEPARATOR_TYPEHASH, BigInt(chainId), getAddress(safe)]));
}
/**
 *  What an owner of `safe` must actually sign for the account to accept a message.
 *
 *  Without this, {@link nestedSignature} is unusable: the parent does not sign the child's
 *  transaction hash, it signs *this* — the child's hash wrapped in the parent's own EIP-712
 *  message envelope. Getting that wrong produces a signature that is well-formed, recovers to a
 *  real address, and is rejected as `GS026`, which is the least informative failure in the
 *  system.
 *
 *  Mirrors `CompatibilityFallbackHandler.getMessageHashForSafe`, computed offline because every
 *  input is known: the envelope is `\x19\x01 || domainSeparator || keccak256(SAFE_MSG_TYPEHASH,
 *  keccak256(message))`, and the domain separator is the chain id and the account. The live test
 *  checks this against the handler's own answer.
 */
export function safeMessageHash(chainId, safe, message) {
    const safeMessageHash = keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [SAFE_MSG_TYPEHASH, keccak256(message)]));
    return keccak256(concat(["0x19", "0x01", safeDomainSeparator(chainId, safe), safeMessageHash]));
}
/**
 *  The hash a parent account's owners sign so the parent can approve a child's transaction.
 *
 *  The composition callers actually need, named for what it is for. `childTxHash` is the child's
 *  `getTransactionHash(...)`; the result is what a key holding authority over `parent` signs, and
 *  its signature goes into {@link nestedSignature}.
 */
export function parentApprovalHash(chainId, parent, childTxHash) {
    // `abi.encode(_dataHash)` — a bare bytes32 word, which is what the handler wraps.
    return safeMessageHash(chainId, parent, encodeAbiParameters([{ type: "bytes32" }], [childTxHash]));
}
//# sourceMappingURL=signatures.js.map