# About data-first design

Discussion. Why this package is a set of free functions instead of a client object, and what that
buys the SDKs built on it.

## The shape

There is no `new SomniaAccounts(...)`. Every function takes the viem `Client` you already have:

```ts
import {ownersOf} from "@somnia-chain/accounts-sdk";

const set = await ownersOf(client, account);
void set;
```

Nothing here holds a client, a transport, a socket, a cache, a subscription or a lifecycle. There is
no `close()`, because there is nothing to close.

## Why, concretely

**Because this package is a dependency of other SDKs.** That is not aspirational — it is what it is
for, and it changes the calculus completely.

A client-owning SDK inside another SDK means two transports to the same chain, two nonce sources,
two reconnect policies and two cleanup responsibilities. The consuming SDK has its own opinions
about all of those, usually better-instrumented ones: `@somnia-chain/markets-sdk` sends through
Somnia's `realtime_sendRawTransaction`, which returns the receipt in the same round-trip. An
accounts client that opened its own connection would be strictly worse at the one thing it was
duplicating.

So the division is: **this package produces plans and calls; the consumer puts them on the wire.**

## What that makes possible

**Encoding without a network.** Every encoder is pure, so the whole write path is reachable offline
— which is why `buildSafeTx` takes the nonce as an argument instead of reading it, and why
`readSafeNonce` is a separate function you can skip when you are already tracking it.

**Testing without a chain.** `evaluateHealth` is pure over facts gathered elsewhere, so every health
condition is testable without an RPC. That separation is why the fact-gathering and the judging are
two functions rather than one.

**Substitution at every seam.** A relayer, a queue, a test double or another SDK's executor all fit,
because what they receive is data. `Relay` is one method for exactly this reason: everything ends in
a `Call`, and a `Call` is already _here are the bytes, send them however you like_.

**No second source of truth.** ABIs are generated from the compiled contracts and gated by
`abis-check`; addresses are baked from the deploy manifests at build time. A package that owned a
runtime would be tempted to cache both.

## What it costs

**More arguments.** `ownersOf(client, account)` instead of `accounts.ownersOf(account)`. Every call
threads the client.

**No shared cache.** Two calls that read the same thing read it twice. The SDK batches within a
single function — `ownersOf` reads owners and threshold concurrently, scans run with bounded
concurrency — but across calls, nothing remembers. Caching belongs to whoever owns the lifecycle,
and that is deliberately not us.

**Discovery is harder.** A client object is a menu; 113 free functions are not. That cost is real,
and it is what this documentation is for — the API reference lists everything, and the guides exist
because a list is not a menu.

## Where the line is drawn

Some things do carry state, as **values** rather than as objects:

- `Prepared` and `ExecutionPlan` are the middle of an operation, held by the caller.
- `Prepared.toCall(signature)` is a closure over what was prepared — a function, not a session.
- `SignedAccountAuthorization` carries its factory so a stored row is self-contained.

The test is whether a value survives being written to a database and read back somewhere else. All
of these do, which is why `serializeAccountAuthorization` exists: `bigint` does not survive
`JSON.stringify`, and leaving every consumer to invent a representation guarantees two that
disagree.

## The rule, as the repository states it

> **ACC-ARCH-001 — The SDK is data-first and owns no runtime.**

Which is enforced the way the rest of the rules are: by review, and by the fact that
`check-packed-consumer.mjs` installs the tarball into a scratch project outside the workspace and
imports it under plain Node. An accidental runtime dependency shows up there.

## Related

- [How to drive this SDK from another SDK](../how-to/integrate-with-another-sdk.md)
- [The call, and who may send it](../reference/the-call-and-who-may-send-it.md)
- `RULES.md` in the repository — the normative catalog
