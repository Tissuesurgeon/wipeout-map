# How to create accounts on every chain with one signature

This guide shows you how to take **one** owner signature and use it to create accounts on every
chain the factory is deployed on. It assumes you have the owner's wallet and a funded payer on each
chain you want to reach.

## Why one signature is possible

The naive flow costs one prompt per chain, and the cost is entirely in granting the session key:
Safe's EIP-712 domain contains the chain id, so _this key may act for me_ is a different message on
every network.

`AccountAuthorization` is signed against a domain with **no `chainId`**, and
`createAccountWithOwners` deploys the account and sets its owners in one transaction. So the consent
decision is made once, and there is never a moment where the account exists without its session key.

## Do it

```ts
import {
  buildAccountAuthorization,
  createAccountsGasLimit,
  prepareAccountCreation,
  signWith,
  submitCall,
} from "@somnia-chain/accounts-sdk";

// 1. Build the message. `indices` is every account this signature should create.
const authorization = buildAccountAuthorization({
  chainId: 50312, // only used to find the factory, which is the same address everywhere
  accountId: owner,
  indices: [0n, 1n, 2n], // the main account and two sub-accounts
  additionalOwners: [sessionKey],
  now: BigInt(Math.floor(Date.now() / 1000)),
});

// 2. One prompt. Only `accountId` can sign this.
const creation = prepareAccountCreation({authorization, chainId: 50312});
const sig = await signWith(signer, creation);

// 3. One call per chain, as data. Send each with its own funded payer.
const gas = createAccountsGasLimit(authorization.indices.length);
for (const perChain of creation.toCalls(sig, [5031, 50312, 50383])) {
  await submitCall(client, {
    chain,
    sender,
    call: perChain,
    gas,
    describe: "The create transaction",
  });
}
```

`toCalls` returns data rather than sending, because **each chain needs its own funded sender and a
chain that fails is retried rather than rolling the others back.**

## Check the chain accepts a batch before you collect the signature

**The factory is upgradeable, sits behind one proxy address on every chain, and the batch entry
point did not always exist.** So "which version is live here" is per chain and changes at whatever
pace a rollout takes. A client that assumes the new one collects a signature, sends it, and gets a
**revert with no data in it** — after the person has already approved something.

```ts
import {readFactoryImplementation, supportsBatchCreation} from "@somnia-chain/accounts-sdk";

if (!(await supportsBatchCreation(client, chainId))) {
  // This chain is on an older implementation: `createAccountWithOwners` is not there. Fall back
  // to create-then-grant (below), or skip the chain and say so.
  const impl = await readFactoryImplementation(client, chainId);
  console.warn(`chain ${chainId} factory is ${impl}, no batch authorization`);
}
```

It is a `view` probe, so it costs one `eth_call` and no gas. **A read that did not answer is not an
answer**: only a contract-level revert means "the old factory", while a timeout or a rate limit is
rethrown — so a caller can say "could not check" rather than reporting a chain as un-upgraded
because the RPC blinked.

All three deployed chains accept batches today. Check anyway if you span chains you do not control
the rollout of.

## Creating one account, without an authorization

The two-step flow still exists and is still the right one when there is **no second key to grant** —
a bot that owns its account outright, say. It is permissionless and needs no signature at all:

```ts
import {createAccountCall, submitCall} from "@somnia-chain/accounts-sdk";

// The whole transaction, ready to send from any EOA that holds gas.
const create = createAccountCall(chainId, owner, 0n);

const {receipt} = await submitCall(client, {
  chain,
  sender, // anyone. The factory forces the owner from the salt, so a payer cannot inject one
  call: create,
  gas: create.gas, // carried on the call, because this limit cannot be estimated
  describe: "The create transaction",
});
void receipt;
```

`createAccountCall` returns a `CreateAccountCall` — a `Call` that **carries its own `gas`**,
because the limit it needs is not something a caller can derive. `encodeCreateAccount` gives you the
calldata alone if you are assembling the transaction yourself.

**Idempotent.** An account that already exists is returned rather than redeployed, so a racing
sponsor and user do not make one of them fail.

What this flow costs you is a second transaction _and_ a second signature per chain to grant the
session key — which is the whole reason the authorization exists.

## Report per chain, and read the owners back

The signature reaches everywhere. The transactions do not — they need gas on each network, and that
is the part that actually fails.

Worse: `createAccount` is permissionless, so **someone else may have created the account first**. It
comes back deployed, with your session key missing, and no error anywhere. So do not trust the call:

```ts
import {ownersOf} from "@somnia-chain/accounts-sdk";

const set = await ownersOf(client, account);
const granted = set.owners.some((o) => o.address.toLowerCase() === sessionKey.toLowerCase());
if (!granted) {
  // The account exists but your key is not on it. Someone created it from the same accountId.
  // It is still owned by that accountId alone — no theft — but you need a grant transaction.
}
```

## Gas

`createAccountsGasLimit(count)`, where `count` is **how many indices the authorization names**,
including any that turn out to be taken already. A skip is cheap and nobody has to know offline
which indices are free.

Sending a batch with the single-account limit runs out partway through, and the failure is silent:
the send succeeds, the hash is real, the receipt says nothing was created. Assert `receipt.status`
— `submitCall` does.

The block gas limit is a hard ceiling. A batch too large for one block has to be split into several
calls, which the same signature covers.

## Windows

The authorization is valid for 15 minutes by default (`DEFAULT_AUTHORIZATION_WINDOW`), and no chain
accepts a window over 5 hours (`MAX_AUTHORIZATION_WINDOW`) measured from the **signed** `issuedAt`.
An over-long window is therefore refused forever rather than merely early —
`buildAccountAuthorization` refuses it offline so nobody signs a message that cannot work.

If the fan-out may take longer than the window — a queue, a manual approval — widen `window`
deliberately rather than re-prompting.

## Letting something else drain it

The signature is a bearer credential for exactly what it says. Store it and let a worker do the
sending:

```ts
import {
  checkAccountAuthorization,
  factoryAddress,
  serializeAccountAuthorization,
} from "@somnia-chain/accounts-sdk";

// The factory travels with the row, so the worker needs no manifest — and a row signed against a
// different deployment cannot be silently replayed against this one.
const signed = {factory: factoryAddress(chainId), authorization, signature};
const row = serializeAccountAuthorization(signed);

// …later, in the worker, before spending anything:
const problems = checkAccountAuthorization(signed, {
  now: BigInt(Math.floor(Date.now() / 1000)),
  chainId,
});
void [row, problems];
```

`bigint` does not survive `JSON.stringify`, which is why the serializers exist.

## Related

- [Account authorization](../reference/authorization.md) — the message, field by field
- [Gas](../reference/gas.md)
- [How to sponsor a transaction](./sponsor-a-transaction.md)
