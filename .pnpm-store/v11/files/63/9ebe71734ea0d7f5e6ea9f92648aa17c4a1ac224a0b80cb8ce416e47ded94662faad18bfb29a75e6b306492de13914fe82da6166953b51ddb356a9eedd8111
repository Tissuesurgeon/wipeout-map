# How to sponsor a transaction

This guide shows you how to have something other than the user pay: a relayer, a sponsor endpoint, a
queue. It assumes you already build the call you want sent.

## The seam

Everything this SDK builds ends in a `Call`, and a `Call` is already _here are the bytes, send them
however you like_. So a sponsor is one method:

```ts
import {submitCall, type Relay} from "@somnia-chain/accounts-sdk";

const sponsor: Relay = {
  async send(bytes, id, hints) {
    const response = await fetch("https://sponsor.example/send", {
      method: "POST",
      body: JSON.stringify({
        to: bytes.to,
        data: bytes.data,
        chainId: id,
        // USE THIS. See below.
        gas: String(hints?.gas ?? 20_000_000n),
      }),
    });
    const {hash} = (await response.json()) as {hash: `0x${string}`};
    return hash;
  },
};

const {hash, receipt} = await submitCall(client, {chain, sender: sponsor, call, gas: 20_000_000n});
void [hash, receipt];
```

A `Relay` has **no address, no provider and no network to check**, deliberately. It is asked to put
bytes on a chain and to say which transaction that became. Everything after that — waiting, revert
detection, the unconfirmed case — stays in the SDK, because those are wrong in the same three ways
whoever broadcast.

## Your relayer must not wait for a receipt

`send` returns as soon as it has a hash. A relayer that waits hides the distinction between
**reverted** and **not confirmed yet**, and that distinction is the one the caller depends on:
`TransactionRevertedError` means nothing changed, `UnconfirmedSendError` means it may still land.

## Use `hints.gas`

The third argument carries what the SDK already worked out. A relayer that ignores it and picks
something reasonable-looking — 2,500,000 is the natural guess — **silently fails every account
creation**, and the receipt says out-of-gas rather than naming the cause.

Safe's `setup` runs nested, so it needs a floor of gas _remaining_ while `eth_estimateGas` measures
gas _spent_. Your relayer cannot re-derive this. If you must cap it, cap it above the floor. See
[Gas](../reference/gas.md).

The parameter is optional so an existing two-argument `send` still satisfies the interface — which
means a relayer that ignores the hint compiles fine.

## What a sponsor should check before paying

If your sponsor is an endpoint taking an authorization from a client, verify it before spending:

```ts
import {checkAccountAuthorization, recoverAuthorizationSigner} from "@somnia-chain/accounts-sdk";

const signed = {factory: account, authorization, signature};
const problems = checkAccountAuthorization(signed, {
  now: BigInt(Math.floor(Date.now() / 1000)),
  chainId,
});
if (problems.length > 0) throw new Error(`refusing to sponsor: ${problems.join(", ")}`);

const who = await recoverAuthorizationSigner(signed);
// …now decide whether `who` is someone you sponsor.
void who;
```

**Both halves are required.** `checkAccountAuthorization` is every check that can be made offline —
expiry, the window ceiling, the factory, the derivations — and an empty array **does not mean the
signature is `accountId`'s**. There is deliberately no `signer` variant, because recovery is async
and an EIP-1271 signer answers on chain. A sponsor that stops at `problems.length === 0` will pay
for authorizations signed by anybody.

Branch on `problem.kind` rather than stringifying: `notYetValid` is a _scheduled_ row worth
surfacing — a signature nobody meant to schedule is the shape a phished authorization takes —
while `window` is malformed and will never become valid. The full table is in
[Account authorization](../reference/authorization.md).

Run it **before every broadcast**, not once when the row arrives: a fan-out is N transactions over
minutes against a deadline measured in minutes.

## A sponsor cannot send a pre-validated call

`prevalidatedExecution` produces a call that is only valid from one address, and a relayer's address
cannot be checked — so `submitCall` refuses it with `WrongSenderError` rather than letting it revert
as `GS025` after the gas.

**A sponsored write needs a real signature.** Use `prepareExecution` + `signAndSubmit`, or
`signExecution`, and keep the pre-validated path for the case where the actor pays for itself. See
[The call, and who may send it](../reference/the-call-and-who-may-send-it.md).

## Creation is permissionless, so sponsoring it is safe

`createAccount` takes no owner list: the factory forces the owner from the salt. A sponsor paying
for someone's account creation cannot end up owning it, and cannot inject an owner. That is why this
is safe to expose as an unauthenticated endpoint if you want to — the worst case is paying for an
account you did not mean to.

Granting an owner is **not** permissionless, and needs the owner's signature.

## Related

- [Gas](../reference/gas.md)
- [Account authorization](../reference/authorization.md)
- [Errors](../reference/errors.md) — `UnconfirmedSendError`, `CannotPayError`
