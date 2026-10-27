# About accounts owning accounts

Discussion. Why a sub-account is not a special case, how signing through one works, and why depth
turns out to be cheap.

## It falls out of the factory taking an address

`createAccount(accountId, index)` takes **any** address as `accountId`. Nothing says it has to be a
key. Pass an account and you get an account whose only owner is that account — fully operable,
proven on Somnia testnet to three levels, moved by a single EOA signature.

So there is no "sub-account feature". There is a derivation that happens to accept an account, and
`subAccountAddress` is `accountAddress` with vocabulary a reader already has.

That matters for how you should read the API: anything that works on an account works on a
sub-account, because they are the same thing.

## The trick: only the acting account has a nonce

This is the whole reason depth is affordable.

A parent does not execute anything. It **approves a hash**, through EIP-1271 — and an approval is a
_message_, not a transaction. Messages have no nonce, no ordering, and no gas.

So a three-level chain is one transaction, not three. The costs per level are one extra hash to
compute and one extra signature wrapper to build. No extra transactions, no extra reads, and no
ordering problem between levels.

## Hashes chain outward, signatures nest inward

The two directions are opposites, and getting either backwards produces a signature that is
well-formed, recovers to a real address, and is rejected as `GS026` — the least informative failure
in the system.

```
m0 = safeTxHash(account, tx)            what the acting account's owners must satisfy
m1 = parentApprovalHash(parent1, m0)    what parent1's owners must sign
m2 = parentApprovalHash(parent2, m1)    …and parent2's, and so on
                                        the key at the top signs the LAST one

signatures = nestedSignature(parent1, nestedSignature(parent2, keySignature))
```

Note the asymmetry: the hashes go _outward_ from the account, so the key signs `m2` — the
outermost. The signature then nests back _inward_, so `parent1` — the nearest parent — ends up
outermost in the blob.

`ExecutionPlan.hashes` carries every digest in the chain rather than just the one to sign, because a
mismatch at one level is otherwise indistinguishable from a wrong key.

## Why a parent's approval is not the child's hash

A parent approving a hash does not sign that hash. It signs the hash wrapped in **its own** EIP-712
message envelope:

```
\x19\x01 || domainSeparator(parent) || keccak256(SAFE_MSG_TYPEHASH, keccak256(message))
```

Each level therefore changes what the level above must sign. `parentApprovalHash` is that
composition, computed offline because every input is known, and cross-checked against
`CompatibilityFallbackHandler.getMessageHashForSafe`'s own answer by a live test.

**A parent with no fallback handler cannot answer `isValidSignature` at all**, so nesting does not
work on one. Our factory installs a handler at creation, so this holds for anything it made — but
it is worth knowing if you ever point this SDK at a Safe from elsewhere.

## Nested consent is per chain, even though the inner digest may not be

The account authorization's domain omits `chainId`, which is what makes one signature reach every
network. But an account's _message_ envelope is Safe's, and Safe's domain has the chain id in it.

So the moment consent passes through an account, it becomes per-chain again. `approvalHashes` takes
a `chainId` for that reason even when the digest underneath it is chain-agnostic. One signature
creating sub-accounts on three chains works because the _factory_ verifies it; a parent account
approving something on three chains does not.

## Depth is bounded by gas, not by design

`nestedSignature` takes any blob as the parent's signature — a key's 65 bytes, or another nested
blob. There is no depth parameter and no maximum in the encoding. Each level adds an EIP-1271
staticcall at verification time, so gas is the only limit.

`authorityPath` searches **breadth-first** so the shortest chain wins when an account is reachable
more than one way, which is also the cheapest to execute.

## Above threshold one, depth is refused rather than half-supported

`signExecutionWith` takes several signatures, and requires `through` to be empty. That is a real
limit, not an oversight: at depth the thing being signed is a _parent's approval_, so N-of-M applies
to the **parent's** owners and the blob has to be built inside the parent's EIP-1271 answer rather
than at the level you are calling from.

Threading that through would change what `ExecutionPlan.hashes` means. So it throws
`InvalidInputError` and says why, instead of producing a blob the chain rejects for a reason the
caller cannot see.

## Why the layout rules are a function and not documentation

Packing the `signatures` blob is three interlocking rules, none of them guessable:

1. Every signer occupies **exactly 65 bytes** in the static part, whatever kind it is.
2. A contract signature puts the **contract's address in `r`**, an **offset in `s`**, and **`v = 0`**;
   the real signature is appended after the whole static part, length-prefixed.
3. Signers must be in **ascending address order** — Safe checks `currentOwner <= lastOwner`.

And a fourth that costs nothing: an owner that sends the transaction itself is approved by doing so
(`v = 1`).

Get any of them wrong and the revert blames the signature rather than the layout. `packSignatures`
sorts for you, computes offsets after the whole static part — which satisfies Safe's `GS021` guard
by construction — and refuses a repeated address rather than letting it become `GS026`.

## Related

- [Act from a sub-account](../tutorials/act-from-a-sub-account.md)
- [About the two-key model](./about-the-two-key-model.md)
- [How to move funds between accounts](../how-to/move-funds-between-accounts.md)
