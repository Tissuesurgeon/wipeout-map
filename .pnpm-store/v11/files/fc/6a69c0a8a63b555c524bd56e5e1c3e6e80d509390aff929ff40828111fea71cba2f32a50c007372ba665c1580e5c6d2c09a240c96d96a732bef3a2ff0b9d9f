# How to use the indexer

This guide shows you how to answer the two questions the chain provably cannot: whose account a
bare address is, and what happened to an account. Everything else — deriving addresses, scanning a
key's accounts, reading the current owner set — needs no indexer and lives in
[How to find an account](./find-an-account.md).

## Why these reads exist at all

The derivation does not invert. `keccak256(accountId, index)` turns an owner into addresses, never
an address back into its owner, and there are no candidate owners to try. And history is out of
reach over RPC on this chain: `eth_getLogs` caps at 999 blocks against ten blocks a second, so a
month of history is ~26,000 sequential requests. The indexer watched it happen instead, and this
module is the only way to reach what it saw — you never write GraphQL against it.

## No URLs: configure the chains once

The SDK knows the indexers we run, the same way it knows the contract addresses. You never pass a
URL. Every read covers the chains you configure once at startup, and takes `{chainIds}` as a
per-call override:

```ts
import {configureIndexer, listAccountsAt} from "@somnia-chain/accounts-sdk";

// Once, at startup. Without it, reads cover every chain we index (`INDEXED_CHAIN_IDS`).
configureIndexer({chainIds: [50312, 50383]});

const found = await listAccountsAt(account); // somnia-testnet and hideki
const onMainnet = await listAccountsAt(account, {chainIds: [5031]}); // this call only
void [found, onMainnet];
```

Chains that share a deployment — somnia-testnet and hideki do — are one request. Chains on different
deployments are one request each, merged. Either way every row carries its own `chainId`: our
accounts are CREATE3 and share an address across chains, so the same address can be a different
Safe on each.

To point a chain somewhere else — a local stack, a preview deployment — replace its URL, once:

```ts
import {configureIndexer, indexerUrl} from "@somnia-chain/accounts-sdk";

configureIndexer({urls: {50312: "http://localhost:8080/v1/graphql"}});
configureIndexer({urls: {50383: null}}); // no indexer for this chain: reads on it throw
indexerUrl(50383); // null — check this before offering an indexed feature on a chain
```

**No indexer is a supported state, not a failure.** An app without one for a chain loses these
answers and nothing else — the derivation path still works. Degrade the features that need history;
do not error the ones that never did. That is how the explorer treats it.

## Whose account is this address

```ts
import {listAccountsAt} from "@somnia-chain/accounts-sdk";

// One entry per chain that has seen the address, and an empty list when none has. The same
// address can be a DIFFERENT Safe on each chain — different owners, different threshold — so
// there is no single answer to collapse these into.
for (const found of await listAccountsAt(account)) {
  found.chainId; // which chain this one is
  found.derivation.accountId; // whose account it is
  found.derivation.deployer; // who paid, which need not be the owner
  found.derivation.accountIdIsOwner; // and whether that key can still act on it
}
```

**There is no branch, because every read here is about accounts `SomniaAccountFactory` made.** The
index watches more than that — the Safes of other estates, deliberately, so a multisig control
plane can read them — but this SDK is about _this_ system's accounts. Mixing a foreign Safe into
an answer about them would hand every caller a distinction it never asked for, so `derivation` is
always present and an address that is not one of ours simply does not come back.

`derivation.accountIdIsOwner === false` is the row worth rendering: the address derives from
`accountId` forever, but the Safe can remove that key like any other owner — and then the key that
names the address can no longer move anything in it.

## A key's accounts, both meanings

"Whose is it" has two directions that agree on day one and then drift apart:

```ts
import {getAccountsPage} from "@somnia-chain/accounts-sdk";

// What the salt says: every account whose address derives from this key.
const derived = await getAccountsPage({derivedFrom: owner});

// What the owner sets say: every account this key can currently act on.
const controlled = await getAccountsPage({controlledBy: owner});
void [derived, controlled];
```

They diverge the moment an owner is added or the original one removed — an owner added later is
invisible to every derivation, and a removed `accountId` stays in the address forever. Ask the
question you mean.

`getAccountsPage({derivedFrom})` is also the sub-account tree: an account derived from another account's
address is a sub-account, so passing an account here lists its children.

## Owner history

`ownersOf` (RPC) answers who the owners are now. The index answers how it got that way:

```ts
import {listOwners} from "@somnia-chain/accounts-sdk";

const history = await listOwners(account, {includeFormer: true});
for (const o of history) {
  o.active; // still an owner?
  o.addedAtBlock;
  o.removedAtBlock; // undefined while active
}
```

## The activity feed

One page of everything that happened, newest first, with a cursor to continue from:

```ts
import {getActivityPage} from "@somnia-chain/accounts-sdk";

let page = await getActivityPage({account, limit: 50});
for (const event of page.items) {
  event.kind; // "Executed", "OwnerAdded", "NativeReceived", …
  event.submitter; // the EOA that sent it — a relayed execution looks different here
  event.execution?.to; // what an execution actually did, when recoverable
}

// `nextCursor` is opaque and bound to this read: passing it to a read with another filter is
// refused. `null` means the feed is drained.
while (page.nextCursor !== null) {
  page = await getActivityPage({account, cursor: page.nextCursor});
}
```

Filter to the kinds you render, so a chatty account does not bury the page you wanted:

```ts
import {getActivityPage} from "@somnia-chain/accounts-sdk";

const executions = await getActivityPage({account, kinds: ["Executed", "ExecutionFailed"]});
void executions;
```

`event.execution` deserves its two caveats. `content: "Unavailable"` means the parameters were not
recoverable — a contract called the Safe rather than an EOA — which is reported rather than
rendered as "it had no target". And `operation === 1` is a delegatecall: foreign code ran with the
account's full authority, worth flagging wherever you show it.

## Everything at once: the network's feeds

Leave out the subject and the same reads answer for every account our factory made — what a front
page or a status screen lists:

```ts
import {getAccountsPage, getActivityPage, listFactories} from "@somnia-chain/accounts-sdk";

const newest = await getAccountsPage({limit: 20}); // newest accounts, every configured chain
const latest = await getActivityPage({limit: 20}); // the latest events, any account
for (const factory of await listFactories()) {
  factory.accountCount; // exact — a counter the index keeps, not a scan
}
void [newest, latest];
```

Across chains, pages merge by time and **each chain resumes from its own position** — block numbers
mean nothing across chains, so one shared "before block N" would skip one chain and repeat another.

## Who controls an account, beyond its owners

```ts
import {listAuthorizations, listModules} from "@somnia-chain/accounts-sdk";

// A module acts without any owner signature — part of who controls the account.
const modules = await listModules(account, {includeFormer: true});

// The signed terms it was created from, when it was: who the signature let in beside the signer.
for (const a of await listAuthorizations(account)) {
  a.additionalOwners;
  a.threshold;
  a.deadline;
}
void modules;
```

## The factory's own history

```ts
import {getFactoryHistoryPage} from "@somnia-chain/accounts-sdk";

// Upgrades, admin changes, a new Safe for new accounts — and `DomainChanged`, the moment every
// unspent authorization stopped verifying.
const history = await getFactoryHistoryPage({kinds: ["Upgraded", "OwnershipTransferred"]});
void history;
```

## Say when the answer is old

An owner set or a balance-shaped number drawn from a lagging index is a claim about who can move
somebody's money, made from data that was true hours ago. Ask how far behind the index is before
rendering anything that can go stale:

```ts
import {getIndexerStatus} from "@somnia-chain/accounts-sdk";

// One status per chain, in the order configured. A chain its indexer does not actually serve
// throws rather than being left out — a short list read as "everything is healthy" is how a whole
// missing chain goes unnoticed.
for (const status of await getIndexerStatus()) {
  status.chainId;
  status.behindBy; // chainHead - indexedBlock; 0n when caught up
  status.lagSeconds; // how old the newest indexed block is — "as of 4 seconds ago"
  status.ready; // false during a backfill: every count is a count so far
  if (status.behindBy > 500n) {
    // Hedge: "as of block N", not a confident number that stopped being true.
    // Chains lag independently — one being behind says nothing about the others.
  }
}
```

## When the indexer is busy, or was rebuilt

Two failures are worth handling apart from "the read broke":

```ts
import {
  FeedRestartRequiredError,
  getActivityPage,
  IndexerUnavailableError,
} from "@somnia-chain/accounts-sdk";

try {
  await getActivityPage({account});
} catch (error) {
  if (error instanceof IndexerUnavailableError) {
    // Rate-limited or unreachable: not broken, not now. Wait, then ask again.
    error.retryAfterMs; // how long the indexer asked for, when it said
  } else if (error instanceof FeedRestartRequiredError) {
    // The index was rebuilt since this cursor was issued; its position may point at other rows.
    // Start the read again without a cursor.
  }
}
```

`IndexerUnavailableError` is an `RpcError`, so code that already catches that keeps working.

## What no index can tell you

These are properties of the chain and the deployed contracts, not gaps to wait out:

- **Balances.** Outgoing native value is in no log, and value can arrive before an account exists.
  Balances are `eth_getBalance`; the feed's `NativeReceived` events are a lower bound on
  deliberate incoming transfers, never a total.
- **When an authorization was signed.** Only bounded, never emitted:
  `issuedAt >= deadline - MAX_AUTHORIZATION_WINDOW`.
- **Whether an approved hash is still standing.** Execution consumes an approval silently — the
  nonce the hash binds advances, nothing is emitted, and the storage entry is never cleared, so
  even the on-chain `approvedHashes` getter answers "approved" forever. Join `HashApproved`
  against the executions if you need the answer.

## Related

- [How to find an account](./find-an-account.md) — the derivation path, which needs none of this
- [How to check an account is healthy](./check-an-account-is-healthy.md)
- [`listAccountsAt`](../api/functions/listAccountsAt.md),
  [`getActivityPage`](../api/functions/getActivityPage.md),
  [`getIndexerStatus`](../api/functions/getIndexerStatus.md) — the full signatures
