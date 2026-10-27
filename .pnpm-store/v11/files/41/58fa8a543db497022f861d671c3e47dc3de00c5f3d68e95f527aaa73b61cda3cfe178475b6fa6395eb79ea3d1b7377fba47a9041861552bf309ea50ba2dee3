# @somnia-chain/accounts-sdk

Smart accounts on Somnia. An account is a Safe, deployed by `SomniaAccountFactory` at an address
that is a pure function of `(accountId, index)` — the same address on every chain, derivable before
anything is deployed, and stable when every key around it is replaced.

This package is the one gateway to that: the ABIs, the addresses, the derivation and the encoders.
An app never writes a `parseAbi([...])`, never pastes an address, and never reimplements the salt.

```sh
pnpm add @somnia-chain/accounts-sdk viem
```

`viem` is a peer dependency (`^2`) — you bring your own, so the `Client` you pass in is the same
`Client` type the SDK compiles against.

## 📚 [Full documentation](./docs/README.md)

This page is a tour. The documentation is grouped by what you need:

- **[Tutorials](./docs/README.md#start-here)** — from an empty directory to acting from a
  sub-account on testnet
- **[How-to guides](./docs/README.md#do-a-task)** — including
  [driving this SDK from another SDK](./docs/how-to/integrate-with-another-sdk.md)
- **[Reference](./docs/README.md#look-something-up)** —
  [gas](./docs/reference/gas.md), [errors](./docs/reference/errors.md),
  [addresses and chains](./docs/reference/addresses-and-chains.md)
- **[Explanation](./docs/README.md#understand-the-design)** — the two-key model, accounts owning
  accounts, why there is no client

## The shape of it

Nothing here owns a client, a transport or a lifecycle: every function takes the viem `Client` you
already have. So this package produces **plans and calls**, and whatever is calling it puts them on
the wire — which is what makes it safe to depend on from inside another SDK.

```
planExecution ──> ExecutionPlan ──> prepareExecution ──> Prepared ──> toCall(sig) ──> Call
                  (pure)                                 (pure)                      (data)
```

Stop at any of those.

## The address, before there is an account

```ts
import {accountAddress, readAccountAddress} from "@somnia-chain/accounts-sdk";

accountAddress(50312, owner, 0n); // offline, no round trip
await readAccountAddress(client, 50312, owner, 0n); // what the deployed factory says
```

Both are the same arithmetic; the offline form is pinned against the contracts' own fixtures. Use it
for a screen, and ask the chain before publishing a deposit address or moving value — the factory is
upgradeable, so the chain is the authority.

→ [Account derivation](./docs/reference/account-derivation.md)

## One signature, every chain

Creating an account and granting it a session key is one transaction authorised by one signature,
against an EIP-712 domain that deliberately omits `chainId`:

```ts
import {
  buildAccountAuthorization,
  createAccountsGasLimit,
  prepareAccountCreation,
  signWith,
} from "@somnia-chain/accounts-sdk";

const authorization = buildAccountAuthorization({
  chainId: 50312,
  accountId: owner,
  indices: [0n, 1n, 2n], // a main account and two sub-accounts, one prompt
  additionalOwners: [sessionKey],
  now: BigInt(Math.floor(Date.now() / 1000)),
});

const creation = prepareAccountCreation({authorization, chainId: 50312});
const sig = await signWith(signer, creation);

// One call per chain, returned as data: each needs its own funded sender.
const calls = creation.toCalls(sig, [5031, 50312, 50383]);
const gas = createAccountsGasLimit(authorization.indices.length);
void [calls, gas];
```

The owner key signs and **never sends** — `execTransaction` and the factory both check signatures
rather than `msg.sender`, so it never needs gas.

→ [Account authorization](./docs/reference/authorization.md) ·
[How to create accounts on every chain](./docs/how-to/create-accounts-on-every-chain.md)

## Owning, and acting

```ts
import {addOwnerCall, ownersOf, readExecutionPlan} from "@somnia-chain/accounts-sdk";

const grant = addOwnerCall(account, sessionKey, 1n); // one execTransaction the owner signs
const current = await ownersOf(client, account); // owners, threshold, and which are accounts
const plan = await readExecutionPlan(client, {chainId: 50312, account, calls});
void [grant, current, plan];
```

`createAccount` takes no owner list, and that is a security property rather than an omission: the
factory forces the owner from the salt, so a third party cannot inject one — which is why creation
is safe to leave permissionless and why anyone can pay for it.

→ [How to grant and revoke a session key](./docs/how-to/grant-and-revoke-a-session-key.md)

## Acting with no signature at all

When the key that authorises is also the key that pays, Safe already knows who is asking:

```ts
import {prevalidatedExecution, submitCall, EXECUTION_GAS_FLOOR} from "@somnia-chain/accounts-sdk";

const call = prevalidatedExecution(plan, sender.address); // no signature, no wallet round-trip
const {hash, receipt} = await submitCall(client, {chain, sender, call, gas: EXECUTION_GAS_FLOOR});
void [hash, receipt];
```

**The result is the one `Call` in this package that is not submittable by anyone** — the authority is
in who broadcasts, not in the bytes.

→ [How to act without a signature](./docs/how-to/act-without-a-signature.md) ·
[The call, and who may send it](./docs/reference/the-call-and-who-may-send-it.md)

## Accounts owned by accounts

A sub-account is an ordinary account whose `accountId` is an account. Only the **acting** account has
a nonce — a parent approves a message, not a transaction — so depth costs one hash and one signature
wrapper per level, and nothing else.

```ts
import {authorityPath, subAccountAddress} from "@somnia-chain/accounts-sdk";

const desk = subAccountAddress(50312, account, 1n);
const path = await authorityPath(client, desk, sessionKey); // what to pass as `through`
void [desk, path];
```

→ [Act from a sub-account](./docs/tutorials/act-from-a-sub-account.md) ·
[About accounts owning accounts](./docs/explanation/about-accounts-owning-accounts.md)

## Finding accounts, and what controls them

Derivation-based, so no indexer is needed:

```ts
import {accountsOf, accountTree, custodyChain, ownersOf} from "@somnia-chain/accounts-sdk";

const scan = await accountsOf(client, 50312, owner); // what exists under a key
const tree = await accountTree(client, 50312, account); // downward
const up = await custodyChain(client, account); // upward, to the key at the top
void [scan, tree, up, ownersOf];
```

Every one of these distinguishes **absent** from **unread**. `deployed: undefined` is not
`deployed: false`, and rendering them alike shows a funded account as empty.

→ [How to find an account](./docs/how-to/find-an-account.md)

## What only an index can answer

Whose account a bare address is, and anything shaped like history, cannot be read from the chain.
The SDK knows the indexers we run — you pass chain ids, never a URL:

```ts
import {getActivityPage, getIndexerStatus, listAccountsAt} from "@somnia-chain/accounts-sdk";

const whose = await listAccountsAt(account); // one entry per chain that has it, with its derivation
const history = await getActivityPage({account, limit: 25}); // {items, nextCursor}
const fresh = await getIndexerStatus(); // how far behind, in blocks and seconds
void [whose, history, fresh];
```

Pages carry an opaque `nextCursor`; feeds across chains merge by time. `configureIndexer` sets the
chains once, or points one at your own deployment.

→ [How to use the indexer](./docs/how-to/use-the-indexer.md)

## When something goes wrong

```ts
import {SomniaAccountsError, TransactionRevertedError} from "@somnia-chain/accounts-sdk";

try {
  await Promise.resolve();
} catch (e) {
  if (e instanceof TransactionRevertedError) console.error(e.reason ?? "reverted");
  else if (e instanceof SomniaAccountsError) console.error("ours:", e.message);
  else throw e;
}
```

Every failure extends `SomniaAccountsError`, so one `catch` tells you whether it was us, and the
leaf class tells you what to do about it. Nothing raw escapes: a wallet that answers badly is a
`WalletResponseError`, a chain that does not answer is an `RpcError`, an argument refusable offline
is an `InvalidInputError`.

→ [Errors](./docs/reference/errors.md) ·
[How to handle errors and reverts](./docs/how-to/handle-errors-and-reverts.md)

## Gas, in one paragraph

Safe's `setup` and `execTransaction` run nested, so EIP-150's 63/64 rule hands the inner frame a
fraction of what _remains_ rather than everything left in the transaction. These calls need a floor
of gas **remaining**; `eth_estimateGas` measures gas **spent**; no multiplier on the latter reliably
clears the former. Sending 3,000,000 reverts after burning 2,908,286 while 20,000,000 succeeds on
2,774,511. Use `CREATE_ACCOUNT_GAS_LIMIT`, `createAccountsGasLimit`, `EXECUTION_GAS_FLOOR` and
`measureGas` — and assert `receipt.status`, because an out-of-gas revert produces a real hash and no
account.

→ [Gas](./docs/reference/gas.md)

## When something goes wrong

```ts
import {SomniaAccountsError, TransactionRevertedError} from "@somnia-chain/accounts-sdk";
```

Every failure this SDK raises extends `SomniaAccountsError`, so one `catch` tells you whether it
was us, and the leaf class tells you what to do about it. The classes carry the values you branch
on as readonly fields — `WrongSignerError` names both addresses, `TransactionRevertedError` carries
the hash and, where the replay could decode one, the reason — and chain whatever caused them in
`cause`. Nothing raw escapes: a wallet that answers badly is a `WalletResponseError`, a chain that
does not answer at all is an `RpcError`, and an argument that could be refused offline is an
`InvalidInputError` rather than a `RangeError`.

## Using it as an execution layer

This package is designed to be driven by another SDK. Nothing here owns a client, a transport or a
lifecycle: every function takes the viem `Client` you already have, so the calling SDK keeps its
own chain, its own RPC and its own cleanup, and there is never a second transport.

That makes an adapter small. The shape below is the one Somnia Markets' trader expects — an object
that says which chain and which actor it sends as, turns a list of calls into a receipt, and lets
the SDK decode the result out of `receipt.logs` without fetching it again:

```ts
import {
  readExecutionPlan,
  prepareExecution,
  signAndSubmit,
  type Call,
} from "@somnia-chain/accounts-sdk";

const executor = {
  chainId: chain.id,
  actor: account, // what the chain sees as msg.sender
  async execute(calls: readonly Call[]) {
    const plan = await readExecutionPlan(client, {chainId: chain.id, account, calls, through});
    const {hash, receipt} = await signAndSubmit(client, {
      prepared: prepareExecution(plan, signer.address),
      signer,
      sender, // a relayer, or the signer itself when it can pay
      chain,
    });
    return {hash, receipt};
  },
};
```

`through` is the part a generic Safe integration does not have. It is the chain of accounts between
the signer and the account being acted on, so an account owned by an account signs correctly at any
depth — where a one-level integration requires the signer to be a direct owner on a threshold-1
Safe. Pass `[]` for the direct case.

If you take `prepared.toCall(signature)` and broadcast the bytes yourself rather than going through
`signAndSubmit`, use `measureGas` for the limit — it is the same policy `signAndSubmit` applies, and
the reason it is exported is that a copy of it drifts:

```ts
import {measureGas} from "@somnia-chain/accounts-sdk";

const call = prepared.toCall(signature);
const gas = await measureGas(client, {call, payer: sender.address, floor: prepared.gasFloor});
```

A fifth over the estimate, never below `prepared.gasFloor`. Omit `payer` for a relayer. Estimating
from an address that cannot afford the call fails with an insufficient-funds error that reads as
though the call itself is broken, which is why the payer is a parameter rather than an afterthought.

If `sender` is a relayer, implement `send(call, chainId, hints)` and **use `hints.gas`**. Safe's
`setup` and `execTransaction` run nested, so EIP-150's 63/64 rule hands the inner frame a fraction
of what remains rather than everything left in the transaction: these calls need a floor of gas
_remaining_, `eth_estimateGas` measures gas _spent_, and no multiplier on the latter reliably clears
the former. Account creation carries a measured 20,000,000 for that reason, and a relayer that
hardcodes something reasonable-looking instead fails every creation with an out-of-gas receipt that
does not say why. The third argument is optional, so a two-argument `send` still compiles — it just
guesses.

Two things worth knowing before you wire this up. A Safe can swallow an inner revert: the outer
transaction mines with `status: "success"` while a failure event says the inner call did not run.
Which path a Safe takes depends on the gas fields, and `execTransactionCall` sets `safeTxGas` and
`gasPrice` to zero, so a failure reverts the outer transaction and arrives as
`TransactionRevertedError`. And `signAndSubmit` needs a sender that can pay; give it a signer that
cannot and it raises `SenderRequiredError` rather than failing at broadcast against the wrong
address.

## Licence

MIT.
