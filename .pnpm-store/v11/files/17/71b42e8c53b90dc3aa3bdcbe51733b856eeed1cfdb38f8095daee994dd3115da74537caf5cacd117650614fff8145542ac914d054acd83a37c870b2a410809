import { type Address, type Hex } from "viem";
/**
 *  Packing the `signatures` blob Safe's `checkNSignatures` reads.
 *
 *  This exists so that signing **through** a chain of accounts is reachable from an app. An
 *  account owned by another account is not a hypothetical here — our factory takes any address as
 *  `accountId`, and it is proven live to three levels — but the parent's approval has to be
 *  encoded as an EIP-1271 contract signature, and that encoding is three interlocking rules none
 *  of which are guessable:
 *
 *  1. Every signer occupies **exactly 65 bytes** in the static part, whatever kind it is.
 *  2. A contract signature puts the **contract's address in `r`**, an **offset in `s`**, and
 *     **`v = 0`**; the real signature is appended after the whole static part, length-prefixed.
 *  3. Signers must be in **ascending address order**. Safe checks
 *     `currentOwner <= lastOwner` and reverts `GS026` — the code that means three things — so a
 *     correctly-signed transaction in the wrong order fails as if the keys were wrong.
 *  4. An owner that **sends the transaction itself** needs no signature at all: the owner's
 *     address in `r`, zero in `s`, **`v = 1`**, and Safe accepts it when `msg.sender` is that
 *     owner. This is the one entry whose validity depends on something outside the blob.
 *
 *  Getting any of them wrong produces a revert that blames the signature rather than the layout,
 *  which is why this is a function and not a paragraph of documentation.
 */
/** One signer's contribution to a blob. */
export type SignatureEntry = 
/**
 *  A plain key's 65-byte ECDSA signature.
 *
 *  `signer` is carried because the entries have to be sorted by address and an ECDSA signature
 *  does not contain one — recovering it needs the hash, which this function deliberately does
 *  not take. A caller always knows which key it just asked.
 */
{
    readonly kind: "key";
    readonly signer: Address;
    readonly signature: Hex;
}
/** Another account's approval, as an EIP-1271 contract signature. */
 | {
    readonly kind: "account";
    readonly account: Address;
    readonly signature: Hex;
}
/**
 *  An owner that is sending the transaction, approving it by doing so.
 *
 *  No signature, because there is nothing to sign: Safe reads `msg.sender` instead. Carries the
 *  consequence that the resulting blob is valid for exactly one broadcaster — see
 *  {@link prevalidatedSignature}.
 */
 | {
    readonly kind: "sender";
    readonly sender: Address;
};
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
export declare function prevalidatedSignature(sender: Address): Hex;
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
export declare function packSignatures(entries: readonly SignatureEntry[]): Hex;
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
export declare function nestedSignature(parent: Address, parentSignature: Hex): Hex;
/** An account's EIP-712 domain separator. Computed offline: it is only the chain and the address. */
export declare function safeDomainSeparator(chainId: number, safe: Address): Hex;
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
export declare function safeMessageHash(chainId: number, safe: Address, message: Hex): Hex;
/**
 *  The hash a parent account's owners sign so the parent can approve a child's transaction.
 *
 *  The composition callers actually need, named for what it is for. `childTxHash` is the child's
 *  `getTransactionHash(...)`; the result is what a key holding authority over `parent` signs, and
 *  its signature goes into {@link nestedSignature}.
 */
export declare function parentApprovalHash(chainId: number, parent: Address, childTxHash: Hex): Hex;
//# sourceMappingURL=signatures.d.ts.map