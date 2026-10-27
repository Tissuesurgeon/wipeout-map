# How to drive this SDK from another SDK

This guide shows you how to put `@somnia-chain/accounts-sdk` behind your own SDK's write path, so
your users act from a smart account instead of an EOA without your API growing a Safe in it. It
assumes you already own a viem `Client`, a chain, and whatever decides who signs.

The shape it builds towards is the one `@somnia-chain/markets-sdk` expects — an object that names a
chain and an actor, turns a list of calls into a receipt, and hands back the receipt it already
holds. If you are integrating somewhere else, the same three rules apply; only the interface name
changes.

## The one thing to get right first

**This package owns no runtime.** Nothing here holds a client, a transport, a socket, a cache or a
lifecycle: every function takes the `Client` you already have. That is what makes it safe to depend
on from inside another SDK — there is never a second transport, never a second nonce source, and
never a cleanup you have to remember.

The consequence for your adapter is that **the accounts SDK produces plans and calls, and your SDK
puts them on the wire.** Resist the temptation to call `submitCall` from inside your executor: your
SDK almost certainly has a faster or better-instrumented send (markets uses Somnia's
`realtime_sendRawTransaction`, which returns the receipt in the same round-trip). Take the `Call`
and send it yourself.

## Encode, don't send

Every write in this SDK ends in a `Call` — `{to, value, data}` — and every encoder is pure. So the
whole write path is reachable without touching the network:

```ts
import {buildSafeTx, execTransactionCall, packSignatures} from "@somnia-chain/accounts-sdk";

// Pure: no client, no reads. The nonce is injected because YOU may already know it.
const tx = buildSafeTx(chainId, calls, 4n);
const outer = execTransactionCall(
  account,
  tx,
  packSignatures([{kind: "sender", sender: sessionKey}]),
);
```

`readSafeNonce` is the one read that path needs, and it is a separate function precisely so you can
skip it when your SDK is already tracking the account's nonce.

## The adapter

`planExecution` is the pure form and `readExecutionPlan` is the same thing with the nonce read for
you. Either way you get an `ExecutionPlan`, and `signExecution(plan, signature)` turns one signature
into the call to send:

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
void executor;
```

`through` is the part a generic Safe integration does not have: the chain of accounts between the
signer and the account being acted on. Pass `[]` when the signer is a direct owner. Anything longer
is an account owned by an account, which signs correctly at any depth — see
[About accounts owning accounts](../explanation/about-accounts-owning-accounts.md).

## Take the free path when your actor pays

If your executor's signer is also its sender — a session key that broadcasts its own transactions,
which is the normal case for an unattended actor — **it should not be signing at all.** Safe honours
a pre-validated signature when `msg.sender` is the owner, so the signature round-trip produces a
value the contract discards:

```ts
import {prevalidatedExecution, readExecutionPlan} from "@somnia-chain/accounts-sdk";

const plan = await readExecutionPlan(client, {chainId: chain.id, account, calls});
const call = prevalidatedExecution(plan, sender.address);
// Now send `call` with YOUR send path. It is only valid from `sender.address`.
```

The result is a `SenderBoundCall`, and that restriction is the one thing about it you cannot ignore
— see [The call, and who may send it](../reference/the-call-and-who-may-send-it.md). If your
executor supports a sponsor or a relayer, that path needs a real signature instead.

## Resolve the batcher from the manifests, not from a constant

Several calls become one transaction through `MultiSendCallOnly`, delegatecalled from the account.
Take the address from here:

```ts
import {contractAddress} from "@somnia-chain/accounts-sdk";

const batcher = contractAddress(chainId, "MultiSendCallOnly");
void batcher;
```

`buildSafeTx` already does this for you; reach for `contractAddress` only if you are assembling the
batch yourself with `batchedSafeTx`.

**`MultiSend` and `MultiSendCallOnly` take identical calldata and grant different authority**, and
no type system distinguishes them. `MultiSend` permits a nested `delegatecall`, which means one
entry in a batch can rewrite the account's own storage — its owners, its modules, its
implementation. This SDK uses `MultiSendCallOnly` everywhere and names the distinction in
`batchedSafeTx`'s own signature. If your integration takes a batcher address as configuration, this
is the mistake worth a comment in your code.

## Do not hand-write the ABI

The ABIs are generated from the compiled contracts and gated against drift by `mise run abis-check`.
Import them instead of pasting a fragment:

```ts
import {safeAbi, somniaAccountFactoryAbi} from "@somnia-chain/accounts-sdk";

void [safeAbi, somniaAccountFactoryAbi];
```

They are `as const`, so viem infers argument and return types from them. A hand-written four-entry
Safe ABI compiles, works, and then silently disagrees with the deployed contract after an upgrade —
which is exactly the failure this package exists to prevent.

## Normalise the errors at your boundary

Every failure this SDK raises extends `SomniaAccountsError`, with one class per branchable outcome
and the values you branch on as readonly fields. If your SDK guarantees that nothing foreign leaks
out of its own API — most do — map them once, at the seam:

```ts
import {
  signAndSubmit,
  SomniaAccountsError,
  TransactionRevertedError,
} from "@somnia-chain/accounts-sdk";

try {
  await signAndSubmit(client, {prepared, signer, sender, chain});
} catch (e) {
  if (e instanceof TransactionRevertedError) {
    // Mined and reverted. `e.reason` is the decoded revert where the replay could decode one.
    throw new Error(`the account refused it: ${e.reason ?? "no reason in the receipt"}`, {
      cause: e,
    });
  }
  if (e instanceof SomniaAccountsError) {
    throw new Error(`accounts SDK: ${e.message}`, {cause: e});
  }
  throw e; // not ours
}
```

The full table is in [Errors](../reference/errors.md). Chain the original in `cause` rather than
flattening it to a string: the leaf class is how a caller two levels up decides whether to retry.

## Gas is not estimable here, and that is not a style preference

Safe's `setup` and `execTransaction` run nested, so EIP-150's 63/64 rule hands the inner frame a
fraction of what _remains_ rather than everything left in the transaction. These calls need a floor
of gas **remaining**; `eth_estimateGas` measures gas **spent**; and no multiplier on the latter
reliably clears the former. Use the constants and `measureGas`, and if your SDK has a fixed-fee
policy, make sure it can be overridden for these calls. [Gas](../reference/gas.md) has the numbers
and the measurement behind them.

## What a Safe will do to your error reporting

Two behaviours will otherwise reach your users as bugs in your SDK.

**A Safe can swallow an inner revert.** The outer transaction mines with `status: "success"` while a
failure event says the inner call did not run. Which path it takes depends on the gas fields, and
`execTransactionCall` sets `safeTxGas` and `gasPrice` to zero — so a Gnosis Safe reverts the outer
transaction instead of emitting `ExecutionFailure`, and the failure arrives as a reverted receipt.
If you build the outer call yourself with non-zero gas fields, you are back on the swallowing path
and have to inspect logs.

**A receipt is not a success.** Assert `receipt.status` on every path. An out-of-gas revert produces
a real receipt with a real hash and an account that does not exist; `submitCall` and `signAndSubmit`
already do this, a hand-rolled send does not.

## Check the chain is actually covered

A chain with no committed deployment throws `UnsupportedChainError` rather than returning
`undefined`, because `undefined` at the point an address goes into a transaction becomes the zero
address. If your SDK supports more chains than this one does — it probably does — decide what that
means _before_ a user hits it:

```ts
import {SUPPORTED_CHAIN_IDS} from "@somnia-chain/accounts-sdk";

const accountsAvailable = SUPPORTED_CHAIN_IDS.includes(chainId);
void accountsAvailable;
```

[Addresses and chains](../reference/addresses-and-chains.md) lists the coverage.

## Next

- [Act without a signature](./act-without-a-signature.md) — the pre-validated path in full
- [Sponsor a transaction](./sponsor-a-transaction.md) — when a relayer pays
- [About data-first design](../explanation/about-data-first-design.md) — why this package has no client
