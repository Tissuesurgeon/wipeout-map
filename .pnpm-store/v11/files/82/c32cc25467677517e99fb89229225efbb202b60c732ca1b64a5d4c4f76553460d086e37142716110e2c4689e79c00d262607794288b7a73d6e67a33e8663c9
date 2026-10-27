# How to grant and revoke a session key

This guide shows you how to add a second key to an account so it can act unattended, and how to take
it away again. It assumes a deployed account whose owner key you hold.

## What a grant actually is

One `execTransaction` carrying `addOwnerWithThreshold(sessionKey, 1)`, signed by the owner. It is
**the only consent decision in the whole model**, and it is worth presenting as one: _this key may
act for me_.

Everything else about the flow is mechanical. The owner key signs and **never sends** —
`execTransaction` checks signatures, not `msg.sender`, so the submitter needs no authority at all
and the owner key never needs gas.

## Grant

```ts
import {
  addOwnerCall,
  prepareExecution,
  readExecutionPlan,
  signAndSubmit,
} from "@somnia-chain/accounts-sdk";

const plan = await readExecutionPlan(client, {
  chainId: chain.id,
  account,
  calls: [addOwnerCall(account, sessionKey, 1n)],
});

// The owner signs; the session key pays. Two roles, two arguments.
const {hash} = await signAndSubmit(client, {
  prepared: prepareExecution(plan, owner),
  signer, // the owner's wallet
  sender, // whoever pays — the session key, or a sponsor
  chain,
});
void hash;
```

`addOwnerCall` takes the **account** as its first argument, not an owner list. Safe's owner
functions must be called on the account and nothing else, which is why every encoder here returns
`{to, value, data}` rather than bare calldata.

## Threshold 1 with two owners means what it says

**The session key can do everything the owner can, including removing it.** There is no threshold
that grants partial authority: threshold 2 would mean the session key cannot act alone, which
defeats the point of having one.

Constraining a key to _some_ actions needs a module and a module guard. That is deliberately not
part of this model yet. If you are granting a key, you are granting it the account.

## Revoke

```ts
import {ownersOf, readExecutionPlan, removeOwnerCall} from "@somnia-chain/accounts-sdk";

// Safe stores owners as a linked list, so removal needs the PREVIOUS entry — pass the whole
// list and the SDK finds it.
const set = await ownersOf(client, account);
const plan = await readExecutionPlan(client, {
  chainId: chain.id,
  account,
  calls: [
    removeOwnerCall(
      account,
      set.owners.map((o) => o.address),
      sessionKey,
      1n,
    ),
  ],
});
void plan;
```

The list argument is there because getting the previous entry wrong is `GS026`, which means three
different things. `prevOwner(owners, owner)` is the same lookup exposed on its own, and
`SENTINEL_OWNERS` is the head of the list — the answer when the owner being removed is the first
one.

**Read the owner list immediately before building the call.** It is live state: if the session key
rotated it since you last read, the position is stale and the transaction fails for a reason that
looks like a signature problem.

## Rotate

`swapOwnerCall` replaces an owner in one transaction, which is what recovery looks like:

```ts
import {ownersOf, swapOwnerCall} from "@somnia-chain/accounts-sdk";

const set = await ownersOf(client, account);
const rotate = swapOwnerCall(
  account,
  set.owners.map((o) => o.address),
  sessionKey, // out
  other, // in
);
void rotate;
```

**The account's address does not move.** Owners are Safe state; the address is derived from the
`accountId` and the index. So an account survives rotating every one of its owners and stays
derivable afterwards — which is the property that makes recovery possible at all.

## Change the threshold

```ts
import {changeThresholdCall} from "@somnia-chain/accounts-sdk";

const raise = changeThresholdCall(account, 2n);
void raise;
```

**Read [How to act without a signature](./act-without-a-signature.md) before raising a threshold.**
Above 1, a single key can no longer act alone — which is the point, and also means an unattended
session key stops working unless every write collects the other owners' signatures too. `signExecutionWith`
is what makes a 2-of-N account usable at all; without it the account is fine, its keys are fine, and
every transaction it tries is refused as `GS026`.

Lowering it back to 1 is the same call with `1n`.

## On a sub-account, owner management goes through the parent

A sub-account's owner is an account, not a key, so its consent is a Safe transaction signed by
_that_ account's owners. The SDK names those cases rather than making you assemble them:

```ts
import {readAddSubAccountOwnerPlan, planRemoveSubAccountOwner} from "@somnia-chain/accounts-sdk";

// Reads the sub-account's nonce for you.
const grant = await readAddSubAccountOwnerPlan(client, {
  chainId: chain.id,
  subAccount: other,
  mainAccount: account, // its owner, whose authority signs
  owner: sessionKey,
  threshold: 1n,
});
void [grant, planRemoveSubAccountOwner];
```

**Why these are Safe transactions and not factory calls:** Safe's owner functions are `authorized`
— only the account itself may call them — so they go through the sub-account's own
`execTransaction`, signed by its owner, which is the main account. `planAddSubAccountOwner` is the
pure form when you already hold the nonce.

Both take `through` for a sub-account further down than one level.

## Refusals you get offline

`NotAnOwnerError` names the address and the owner list it was checked against, raised against the
list you read rather than letting Safe answer `GS026` from inside a transaction you already paid
for.

## Creating and granting in one step

If the account does not exist yet, do not do this in two transactions. `createAccountWithOwners`
deploys it and sets both owners at once, from one signature that works on every chain — see
[How to create accounts on every chain](./create-accounts-on-every-chain.md). The two-step flow
above is the right one only when the account is already deployed.

## Related

- [How to act without a signature](./act-without-a-signature.md) — what the granted key can then do for free
- [About the two-key model](../explanation/about-the-two-key-model.md)
- [How to check an account is healthy](./check-an-account-is-healthy.md)
