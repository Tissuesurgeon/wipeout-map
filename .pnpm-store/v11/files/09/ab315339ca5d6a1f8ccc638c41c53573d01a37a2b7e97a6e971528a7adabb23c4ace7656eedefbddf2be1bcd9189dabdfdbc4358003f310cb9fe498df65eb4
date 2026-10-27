# Tutorial: act from a sub-account

By the end of this you will have created an account owned by another account, funded it, and moved
value back out of it — which needs a signature that travels through the parent.

**You need:** the account from [Create your first account](./create-your-first-account.md), and a
little more testnet STT. About 15 minutes.

## 1. A sub-account is not a special kind of account

It is an ordinary account whose `accountId` happens to be an account rather than a key:

```ts
import {accountAddress, subAccountAddress} from "@somnia-chain/accounts-sdk";

const main = accountAddress(50312, owner, 0n);
// Same derivation. The `accountId` is just an account now.
const desk = subAccountAddress(50312, main, 1n);
console.log(`main ${main}`);
console.log(`desk ${desk}`);
```

`subAccountAddress(chainId, main, i)` and `accountAddress(chainId, main, i)` are the same function.
The two names exist because "a sub-account" is the vocabulary you think in, and having to already
know that it is a derivation from the parent is a bad way to find out.

## 2. Create it — the parent authorises

The parent account is the `accountId`, so the parent has to authorise the creation. It is an account
rather than a key, so its consent is a Safe transaction signed by _its_ owners:

```ts
import {
  createAccountsGasLimit,
  planSubAccountCreation,
  signSubAccountCreation,
  signWith,
  submitCall,
} from "@somnia-chain/accounts-sdk";

const now = BigInt(Math.floor(Date.now() / 1000));
const creation = planSubAccountCreation({
  chainId: 50312,
  mainAccount: account,
  index: 1n,
  additionalOwners: [sessionKey], // so the same key can act for the sub-account directly
  threshold: 1n, // no default: this is a decision, not a setting
  issuedAt: now,
  deadline: now + 900n,
});

// `creation.hash` is what your key signs — NOT `creation.digest`, which is the factory's own
// chain-agnostic digest and is not what anybody signs here.
const sig = await signWith(signer, {
  typedData: creation.authorization,
  digest: creation.hash,
  chainBound: true,
});

await submitCall(client, {
  chain,
  sender,
  call: signSubAccountCreation(creation, sig),
  gas: createAccountsGasLimit(1),
  describe: "The sub-account creation",
});

console.log("sub-account at", creation.subAccount);
```

`prepareSubAccountCreation` is the same thing as a `Prepared`, if you would rather hand it to
`signAndSubmit` than drive `signWith` and `submitCall` yourself.

Two things to note.

`threshold` has **no default**. Threshold 1 with two owners means the second key can do everything
the main account can, including removing it — there is no owner configuration that grants partial
authority. Making you pass it is the point.

Granting `sessionKey` on the sub-account is the difference between one you can act as directly and
one you must reach through the parent every time. Both work; the first is cheaper.

## 3. Fund it

An ordinary transfer, executed by the main account:

```ts
import {prepareExecution, readTransferPlan, signAndSubmit} from "@somnia-chain/accounts-sdk";

const funding = await readTransferPlan(client, {
  chainId: 50312,
  from: account, // the main account executes
  to: other, // the sub-account
  native: 10n ** 15n,
});

await signAndSubmit(client, {
  prepared: prepareExecution(funding, signer.address),
  signer,
  sender,
  chain,
});
```

`through` is empty: the key owns the main account directly.

## 4. Move it back — this is the part that is different

Now the **sub-account** has to execute, and the key does not own it directly. Its authority comes
_through_ the parent:

```ts
import {prepareExecution, readTransferPlan, signAndSubmit} from "@somnia-chain/accounts-sdk";

const back = await readTransferPlan(client, {
  chainId: 50312,
  from: other, // the SUB-account executes
  to: account,
  native: 10n ** 14n,
  through: [account], // <- its authority runs through the main account
});

await signAndSubmit(client, {
  prepared: prepareExecution(back, signer.address),
  signer,
  sender,
  chain,
});
```

**Leave `through` off and it fails as `GS026`** — a code that also means "wrong signature" and
"signers out of order", so it would tell you nothing about the actual mistake.

## 5. What `through` actually did

Only the **acting** account has a nonce. A parent does not execute anything: it _approves a hash_
through EIP-1271, and an approval is a message rather than a transaction. So depth costs one extra
hash and one extra signature wrapper per level — no extra transactions, no extra reads, and no
ordering problem between levels.

The hashes chain outward and the signature nests back inward:

```
m0 = safeTxHash(subAccount, tx)              what the sub-account's owners must satisfy
m1 = parentApprovalHash(main, m0)            what the main account's owners must sign
                                             your key signs m1

signatures = nestedSignature(main, keySignature)
```

You can see both directions on the plan:

```ts
import {readTransferPlan} from "@somnia-chain/accounts-sdk";

const p = await readTransferPlan(client, {
  chainId: 50312,
  from: other,
  to: account,
  native: 1n,
  through: [account],
});

console.log(p.hashes); // [m0, m1] — innermost first
console.log(p.hash); // m1: the ONE digest your key signs
```

`hashes` is carried in full because a mismatch at one level is otherwise indistinguishable from a
wrong key.

## 6. Let the SDK work out the path

Hardcoding `through` is fine when you know the shape. When you do not:

```ts
import {authorityPath} from "@somnia-chain/accounts-sdk";

const path = await authorityPath(client, other, sessionKey);
if (path === null) {
  console.log("this key has no authority over that account");
} else {
  console.log("sign through", path); // [] when it owns it directly
}
```

Breadth-first, so the **shortest** path wins — which is also the cheapest, since every level adds a
wrapper and an EIP-1271 staticcall.

## 7. See the whole shape

```ts
import {accountTree, custodyChain} from "@somnia-chain/accounts-sdk";

const tree = await accountTree(client, 50312, account); // downward
const up = await custodyChain(client, other); // upward, to the key at the top
console.log(tree, up.complete);
```

Both say when they are **incomplete**, because a tree that silently stopped at a failed read looks
exactly like a tree that ended.

## Why this is worth having

Depth is cheap and unbounded — proven on Somnia testnet to three levels, moved by a single EOA
signature. So "a desk per strategy, all under one key" costs derivation and nothing else: no extra
keys to hold, no extra consent decisions, and every sub-account's address known offline before it
exists.

## Next

- [How to move funds between accounts](../how-to/move-funds-between-accounts.md)
- [About accounts owning accounts](../explanation/about-accounts-owning-accounts.md)
- [How to find an account](../how-to/find-an-account.md)
