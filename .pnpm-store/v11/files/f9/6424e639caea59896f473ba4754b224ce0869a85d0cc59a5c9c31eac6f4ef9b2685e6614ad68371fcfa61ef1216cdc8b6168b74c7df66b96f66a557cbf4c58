# How to move funds between accounts

This guide shows you how to move native value and ERC-20 tokens out of one account into another,
including out of a sub-account, which is the direction that needs more authority than it looks.

## The direction is in the signature

**`from` is the account that executes.** So its balance moves, its nonce is used, and its authority
chain is the one that has to be satisfied.

Funding a sub-account and emptying it are the same call with the two addresses swapped — but they
are **not** the same authority. A main account is usually reachable by a key directly; a sub-account
is reached _through_ it.

## Down: main account to sub-account

```ts
import {readTransferPlan} from "@somnia-chain/accounts-sdk";

const plan = await readTransferPlan(client, {
  chainId: chain.id,
  from: account, // the main account executes
  to: other, // the sub-account
  native: 10n ** 16n,
  tokens: [{token, amount}],
});
void plan;
```

An ordinary execution: the key owns `from` directly, so `through` is empty.

## Up: sub-account back to the main account

```ts
import {readTransferPlan} from "@somnia-chain/accounts-sdk";

const plan = await readTransferPlan(client, {
  chainId: chain.id,
  from: other, // the SUB-account executes
  to: account,
  native: 10n ** 16n,
  through: [account], // …and its authority comes through the main account
});
void plan;
```

`through: [account]` is the whole difference. Leave it off and the plan is built for a signer that
does not own `from`, which fails as `GS026` — a code that also means "wrong signature" and "signers
out of order", so it tells you nothing about the real mistake.

`authorityPath(client, from, signerAddress)` computes that list if you would rather not hardcode it.

## Then sign and send it

A transfer plan is an ordinary `ExecutionPlan`, so everything from
[How to act without a signature](./act-without-a-signature.md) and the executor guide applies:

```ts
import {prepareExecution, signAndSubmit} from "@somnia-chain/accounts-sdk";

const {hash} = await signAndSubmit(client, {
  prepared: prepareExecution(plan, signer.address),
  signer,
  sender,
  chain,
});
void hash;
```

## Reading balances first

```ts
import {readHoldings, readTokenInfo} from "@somnia-chain/accounts-sdk";

// Native plus whichever tokens you name — there is no token list on chain to enumerate.
const holdings = await readHoldings(client, account, [token]);
const info = await readTokenInfo(client, token); // symbol, decimals, for display
void [holdings, info];
```

**You have to name the tokens.** Nothing on chain enumerates what an address holds; an indexer or a
curated list is the only way to discover them, and that is your application's decision rather than
this SDK's. Omit `tokens` and you get the native balance only.

**Both reads use `undefined` for "the read did not answer", and neither means zero.**

```ts
import {readHoldings, readTokenInfo} from "@somnia-chain/accounts-sdk";

const holdings = await readHoldings(client, account, [token]);
if (holdings.native === undefined) {
  // Ask again later. Rendering this as 0 is the one wrong answer that makes someone send twice.
}

const info = await readTokenInfo(client, token);
if (info.decimals === undefined) {
  // DO NOT default to 18. A token that did not answer is not an 18-decimal token, and guessing
  // turns a display bug into an amount bug.
}
```

`undefined` does not say _why_ — a node that is down, a token with no `balanceOf`, and a call that
timed out all arrive as the same value. Distinguishing them needs a richer return type, which would
be a breaking change to a read that is otherwise doing its job; it is tracked as
`holdings-failure-detail` in the repository's `RULES.md`.

## Just the calls

If you are batching a transfer into something larger:

```ts
import {erc20TransferCall, nativeTransferCall, transferCalls} from "@somnia-chain/accounts-sdk";

const calls = transferCalls({to: other, native: 10n ** 16n, tokens: [{token, amount}]});
void [calls, erc20TransferCall, nativeTransferCall];
```

`planTransfer` is the pure form of `readTransferPlan` when you already hold the nonce.

## Amounts are raw

Every amount is in the token's own decimals — `bigint`, never a decimal number. This SDK does no
unit conversion, because a protocol quantity that passes through a float is a protocol quantity that
has been rounded.

## Related

- [How to find an account](./find-an-account.md)
- [About accounts owning accounts](../explanation/about-accounts-owning-accounts.md)
