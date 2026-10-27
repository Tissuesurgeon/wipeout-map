# How to find an account

This guide shows you how to go from a key you hold to the accounts it controls, and from an account
to who controls it. It assumes a read-only client; none of this needs a wallet.

## None of this needs the indexer

Accounts are **derived**, not discovered. From a key and an index you compute the address offline,
and `eth_getCode` tells you whether anything is there. So the answer to "what accounts does this key
have" is a derivation plus a batch of reads — no indexer, no event history.

What _is_ unreachable this way: whose account a bare address is, and history — when an account was
created, who paid, what it did. Those reads exist too, and
[How to use the indexer](./use-the-indexer.md) is their guide.

## From a key to its accounts

```ts
import {accountsOf} from "@somnia-chain/accounts-sdk";

// Indices 0..maxIndex, which defaults to 19n — twenty addresses, twenty `eth_getCode` calls.
const scan = await accountsOf(client, chainId, owner, {maxIndex: 19n});
for (const slot of scan.slots) {
  slot.index;
  slot.address; // derived, correct whether or not anything is deployed there
  slot.deployed; // true | false | undefined  <- three states, see below
}
scan.requests; // how many reads this cost
```

**`maxIndex` is a scan bound, not a property of the factory.** The factory reserves nothing and
counts nothing — index 7 is simply the eighth address that `accountId` may occupy — so a scan can
always be wrong about "no more accounts".

Say **"none in the first twenty"**, never "none". `describeCoverage(scan)` turns the scan into
exactly that sentence, so a UI does not have to phrase it itself:

```ts
import {accountsOf, describeCoverage} from "@somnia-chain/accounts-sdk";

const scan = await accountsOf(client, chainId, owner);
console.log(`checked ${describeCoverage(scan)}`); // e.g. "indices 0 to 19"
```

**`deployed` has three values and they are all distinct product states.**

| Value       | Means                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `true`      | code is present                                                                                             |
| `false`     | the address is empty — **not an error.** The address is real and funds can arrive before the account exists |
| `undefined` | the read did not answer. **Not an empty slot**                                                              |

Rendering `undefined` as "nothing there" shows an existing, funded account as empty. That is the
single most consequential mistake in this area, which is why the type makes you handle it.

## Specific indices, or a range

```ts
import {
  accountsAt,
  accountsInRange,
  rangeIndices,
  MAX_SCAN_WIDTH,
} from "@somnia-chain/accounts-sdk";

await accountsAt(client, chainId, owner, [0n, 5n, 12n]);
await accountsInRange(client, chainId, owner, {from: 0n, count: 50n});
void [rangeIndices, MAX_SCAN_WIDTH];
```

Capped at `MAX_SCAN_WIDTH` (`1000n`) per call, because each index is an `eth_getCode` and a range is
a request count with a different name. `accountsInRange` with a typo'd width does not fail — it
hangs, and rate-limits everything else your app is doing. Page instead.

## The first free index

```ts
import {accountsOf, firstFreeIndex, nextFreeIndex} from "@somnia-chain/accounts-sdk";

const scan = await accountsOf(client, chainId, owner);
const free = firstFreeIndex(scan); // from a scan you already have
const next = await nextFreeIndex(client, chainId, owner); // reads for you
void [free, next];
```

`nextFreeIndex` throws rather than guessing when no read answered: "the first free index is 0" is
indistinguishable from "I could not see anything", and one of those creates an account on top of
another.

## A main account's sub-accounts

The same three functions, named for the case you are in:

```ts
import {subAccountsAt, subAccountsInRange, subAccountsOf} from "@somnia-chain/accounts-sdk";

const desks = await subAccountsOf(client, chainId, account);
void [desks, subAccountsAt, subAccountsInRange];
```

`subAccountsOf(client, chainId, main)` **is** `accountsOf(client, chainId, main)` — a sub-account is
an ordinary account whose `accountId` happens to be an account. The alias exists so that having to
already know that is not how you find out. Same `maxIndex` bound, same three-state `deployed`, same
`describeCoverage`.

Note that index `0` under a main account is a perfectly ordinary sub-account here; the "index 0 is
the main account" convention applies to a _key's_ accounts, not to an account's.

## From an account to who controls it

```ts
import {ownersOf} from "@somnia-chain/accounts-sdk";

const set = await ownersOf(client, account);
set.threshold;
for (const o of set.owners) {
  o.address;
  o.kind; // "key" | "account" | "unknown"
}
```

**`kind` is answerable on chain and worth answering.** An owner with code that behaves like a Safe
is an account — the sub-account model — and one without is a key. `unknown` means the code read
failed, not that it is neither. An owner that has code but is not a Safe is reported as a key,
deliberately: it cannot be signed through as a parent.

## Walking upward, and the whole tree

```ts
import {accountTree, custodyChain} from "@somnia-chain/accounts-sdk";

// Upward: the chain of accounts between this one and the key at the top.
const chainUp = await custodyChain(client, account);
chainUp.complete; // false when a read on the way up failed — say so rather than implying a leaf

// Downward: this account and its sub-accounts, recursively.
const tree = await accountTree(client, chainId, account);
void [chainUp, tree];
```

Both report incompleteness explicitly. A tree that silently stops at a failed read looks exactly
like a tree that ended.

**`complete: false` means one of three things** — depth ran out, the request budget ran out, or a
read did not answer — and it does not say which. Treat it as "there may be more", never as the
full set.

### Every walk is budgeted, and the numbers differ per function

The cost is multiplicative — each level multiplies the accounts to inspect — so these are bounded by
a request budget as well as by depth. **The defaults are not the same, so do not carry one number
across:**

| Function        | `maxDepth` | `maxRequests` |
| --------------- | ---------- | ------------- |
| `custodyChain`  | `8`        | `200`         |
| `accountTree`   | `3`        | `400`         |
| `authorityPath` | `4`        | —             |

`accountTree`'s depth of `3` is the one most likely to surprise: a four-level tree comes back
`complete: false` with the default. Raise it deliberately, and expect the request count to grow
with it — `scan.requests` and the tree's own `requests` say what a call actually cost.

`authorityPath` returning `null` therefore means **"no authority within four levels"**, not "no
authority". Both are real answers; only one of them is what a UI should say.

## Which parents to sign through

```ts
import {authorityPath} from "@somnia-chain/accounts-sdk";

// "I hold this key — what do I pass as `through`?"
const path = await authorityPath(client, account, sessionKey);
if (path === null) {
  // This key has no authority here, within the search depth. A real answer, not an error:
  // offering an execution guaranteed to revert is worse than saying so.
}
void path;
```

Breadth-first, so the **shortest** chain wins when an account is reachable more than one way — which
is also the cheapest to execute, since every level adds a wrapper and an EIP-1271 call.

## Across chains

```ts
import {
  scanAcrossChains,
  setupsAcrossChains,
  sharedSetup,
  deviatingSetups,
} from "@somnia-chain/accounts-sdk";

const clients = [{client, chainId: 50312}];
const across = await scanAcrossChains(clients, owner);

// Same address everywhere, but the owner sets can differ — a grant that failed on one chain.
const setups = await setupsAcrossChains(clients, account);
const common = sharedSetup(setups);
// Which chains disagree with the one you treat as the reference.
const odd = deviatingSetups(setups, 50312);
void [across, common, odd];
```

The address is identical on every chain; **the state behind it is not.** `deviatingSetups` is how you
find the chain where the grant transaction ran out of gas.

## Configuration beyond owners

```ts
import {configOf, attributeAddress} from "@somnia-chain/accounts-sdk";

const cfg = await configOf(client, account); // modules, guard, fallback handler, singleton
const derivation = attributeAddress(chainId, account, [owner], {maxIndex: 8n}); // offline: is it ours?
void [cfg, derivation];
```

## Related

- [Account derivation](../reference/account-derivation.md)
- [How to use the indexer](./use-the-indexer.md) — the reverse lookup, and history
- [How to check an account is healthy](./check-an-account-is-healthy.md)
- [About accounts owning accounts](../explanation/about-accounts-owning-accounts.md)
