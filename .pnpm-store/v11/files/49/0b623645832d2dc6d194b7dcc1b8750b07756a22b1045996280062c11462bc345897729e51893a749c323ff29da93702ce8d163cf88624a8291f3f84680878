# How to act without a signature

This guide shows you how to make an account act when the key driving it also pays — the session-key
path — so the write costs **no signature at all**. It assumes an account that already has that key
as an owner at threshold 1.

## When it applies

All three have to hold:

1. The sender is a **direct owner** of the account.
2. The account's **threshold is 1**.
3. `plan.through` is **empty** — nothing is borrowed.

Safe's pre-validated signature is honoured when `msg.sender` is the owner. So a key that broadcasts
its own transaction has already proved who it is, and the signature it was being asked for produced
a value the contract discarded.

## Do it

```ts
import {
  prevalidatedExecution,
  readExecutionPlan,
  submitCall,
  EXECUTION_GAS_FLOOR,
} from "@somnia-chain/accounts-sdk";

const plan = await readExecutionPlan(client, {chainId: chain.id, account, calls});
const {hash} = await submitCall(client, {
  chain,
  sender, // the session key: it owns the account AND it pays
  call: prevalidatedExecution(plan, sender.address),
  gas: EXECUTION_GAS_FLOOR,
});
void hash;
```

That is the whole change. No `prepareExecution`, no `signWith`, no wallet round-trip.

## What you just gave up

**The call is valid from `sender.address` and no other address.** Sent by anyone else it reverts
`GS025` — after the gas, with nothing in the receipt naming the sender. `submitCall` refuses a
mismatch before broadcasting, and a relayer is refused outright because its address cannot be
checked.

So: **a sponsored write cannot use this path.** If the same code path sometimes pays for itself and
sometimes hands off to a sponsor, branch:

```ts
import {
  prepareExecution,
  prevalidatedExecution,
  signAndSubmit,
  submitCall,
  EXECUTION_GAS_FLOOR,
} from "@somnia-chain/accounts-sdk";

async function run(sponsored: boolean): Promise<void> {
  if (sponsored) {
    // A relayer pays, so the authority has to be in the bytes: sign it.
    await signAndSubmit(client, {
      prepared: prepareExecution(plan, signer.address),
      signer,
      sender: relay,
      chain,
    });
    return;
  }
  await submitCall(client, {
    chain,
    sender,
    call: prevalidatedExecution(plan, sender.address),
    gas: EXECUTION_GAS_FLOOR,
  });
}
void run;
```

## Above threshold one

The sender's half is still free; the other owners still sign. Pass a `"sender"` entry beside the
real signatures:

```ts
import {signExecutionWith, submitCall, EXECUTION_GAS_FLOOR} from "@somnia-chain/accounts-sdk";

const call = signExecutionWith(plan, [
  {kind: "key", signer: owner, signature},
  {kind: "sender", sender: sessionKey}, // pays, so it does not sign
]);
await submitCall(client, {chain, sender, call, gas: EXECUTION_GAS_FLOOR});
```

`packSignatures` sorts the entries for you — `checkNSignatures` walks the blob expecting ascending
signer addresses, and a blob in the wrong order fails exactly like a forged one.

**Only one entry may be a `"sender"`.** Only one address is `msg.sender`; `signExecutionWith` refuses
two rather than guessing which one broadcasts.

## At depth, it does not apply

`prevalidatedExecution` throws `InvalidInputError` when `plan.through` is non-empty, and that is not
a limitation that can be lifted. At depth the acting account checks a **parent's EIP-1271 answer**,
not `msg.sender` — there is no sender in that check for a pre-validated entry to stand in for. Sign
the parent's approval instead; see
[About accounts owning accounts](../explanation/about-accounts-owning-accounts.md).

## Related

- [The call, and who may send it](../reference/the-call-and-who-may-send-it.md)
- [How to grant and revoke a session key](./grant-and-revoke-a-session-key.md)
- [How to sponsor a transaction](./sponsor-a-transaction.md)
