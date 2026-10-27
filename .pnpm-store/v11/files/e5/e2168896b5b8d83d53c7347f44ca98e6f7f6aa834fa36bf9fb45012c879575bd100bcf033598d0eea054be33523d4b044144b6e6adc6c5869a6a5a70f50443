# Account derivation

How an account's address is computed, offline, before anything exists.

## The formula

```
salt    = keccak256(abi.encode(accountId, index))
address = CREATE3(factory, salt)
```

`accountId` is any address. `index` is which account under it — **any `uint256`**, not a small
counter: the factory reserves nothing and counts nothing, so index `2**256 - 1` is as valid as `0`.
That is the whole input — no owner list, no bytecode, no nonce, no chain.

The scan bounds elsewhere (`maxIndex`, `MAX_SCAN_WIDTH`) are limits on _how much you look_, not on
what exists. Nothing on chain enumerates an `accountId`'s accounts, so if your application hands out
indices from a sparse or hashed space, only you know where to look.

## What follows from it

**The address is known before the account exists.** No RPC, no round-trip: it can be on screen
before a single transaction, and funds can arrive at it beforehand.

**The address is the same on every chain.** CREATE3 derives from the deployer and the salt, and the
factory is at one address everywhere (see [Addresses and chains](./addresses-and-chains.md)). One
key, one index, one address, all three networks.

**The address survives owner rotation.** Owners are Safe state; the address is not derived from
them. Rotate every owner and the account stays where it is — and stays _derivable_ from the
`accountId`, which is what makes recovery possible at all. Under a CREATE2 recipe the address is
only reproducible from the original `setup()` calldata, so an account whose owners were rotated is
an account you can no longer find from a key you hold.

**The owner cannot be injected.** `createAccount` takes no owner list: the factory forces the owner
from the salt. So a third party cannot deploy your account with themselves as owner, which is why
creation is safe to leave permissionless and why anyone may pay for it.

## Computing it

```ts
import {
  accountAddress,
  accountSalt,
  predictAccountAddress,
  readAccountAddress,
} from "@somnia-chain/accounts-sdk";

accountAddress(chainId, accountId, 0n); // offline; resolves the factory from the manifests
accountSalt(accountId, 0n); // just the salt
predictAccountAddress(await Promise.resolve(account), accountId, 0n); // against a factory you name
await readAccountAddress(client, chainId, accountId, 0n); // what the deployed factory says
```

`accountAddress` is the one to reach for. `predictAccountAddress` exists for a caller that resolved
the factory itself or is testing against a substitute; `readAccountAddress` exists to check the
offline derivation against the chain, which is worth doing once in a test rather than on every
render.

`CREATE3_PROXY_INITCODE_HASH` is exported for a caller reimplementing the derivation in another
language. The TypeScript derivation is pinned against values the contracts produced.

The two properties the formula buys, as assertions rather than prose:

<!-- docexample: run -->

```ts
import {accountAddress} from "@somnia-chain/accounts-sdk";

const KEY = "0x000000000000000000000000000000000000dEaD" as const;

// The same on every chain, because CREATE3 derives from the deployer and the salt.
accountAddress(5031, KEY, 0n); // => accountAddress(50312, KEY, 0n)
accountAddress(50383, KEY, 0n); // => accountAddress(5031, KEY, 0n)

// And a different index is a different account.
accountAddress(50312, KEY, 1n) === accountAddress(50312, KEY, 0n); // => false
```

## Index zero is the main account

Index `0` is conventionally "the account for this key". Everything above it is a sub-account, and
`subAccountAddress(chainId, mainAccount, index)` is the same function with the vocabulary of one:

```ts
import {accountAddress, subAccountAddress} from "@somnia-chain/accounts-sdk";

const main = accountAddress(chainId, owner, 0n);
const desk = subAccountAddress(chainId, main, 1n); // an account whose accountId is an account
void [main, desk];
```

A sub-account is not a different kind of thing. It is an ordinary account whose `accountId` happens
to be an account rather than a key — see
[About accounts owning accounts](../explanation/about-accounts-owning-accounts.md).

## Attributing an address you were given

```ts
import {attributeAddress} from "@somnia-chain/accounts-sdk";

// Offline proof of which key and index produced an address — `undefined` when none of them did.
const derivation = attributeAddress(chainId, account, [owner, sessionKey], {maxIndex: 8n});
if (derivation !== undefined) {
  derivation.accountId; // which candidate
  derivation.index; // and at which index
}
```

Useful for "is this address one of ours" without trusting a label, and for showing a user _why_ an
address is theirs.

`maxIndex` defaults to `19n`, so the search covers the first twenty indices per candidate. A
negative answer is therefore "not in the first twenty under any of these keys", not "not theirs" —
widen it if your application hands out higher indices.

## Finding what exists

Derivation tells you where an account _would_ be; `eth_getCode` tells you whether it is there.
`accountsOf`, `accountsAt` and `accountsInRange` do both, and report three distinct states — present,
absent, and **read did not answer** — because an unanswered read rendered as "nothing there" shows a
funded account as empty. See [How to find an account](../how-to/find-an-account.md).

Scans are capped at `MAX_SCAN_WIDTH` (`1000n`) indices per call: each index is an `eth_getCode`, so
a range is a request count with a different name. `accountsInRange(0n, 2n ** 32n)` from a typo does
not fail — it hangs, and rate-limits everything else the app is doing.

## Related

- [Addresses and chains](./addresses-and-chains.md)
- [How to create accounts on every chain](../how-to/create-accounts-on-every-chain.md)
