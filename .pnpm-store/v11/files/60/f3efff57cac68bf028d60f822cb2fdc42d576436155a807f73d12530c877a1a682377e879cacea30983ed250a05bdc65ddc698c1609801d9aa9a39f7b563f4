# Account authorization

The EIP-712 surface that creates accounts. Its domain deliberately omits `chainId`, which is the
whole point: one signature reaches every chain.

## Why the domain has no chain id

Creating an account and granting it a second owner used to cost **one owner signature per chain**,
and the reason was entirely in the grant: Safe's EIP-712 domain contains the chain id, so the same
consent decision is a different message on every network. Three chains today means three prompts on
a first run.

`AccountAuthorization` is signed against a domain of `{name, version, verifyingContract}` and
nothing else. The factory is at the same address on every chain, so the signature verifies
everywhere — and `createAccountWithOwners` both deploys and sets the owners in one transaction, so
there is no moment in between where a second prompt could be needed.

## The message

```ts
import type {AccountAuthorization} from "@somnia-chain/accounts-sdk";

function readIt(a: AccountAuthorization) {
  a.accountId; // the owner EOA the addresses derive from, and the address that signs
  a.indices; // which of that owner's accounts. One entry per account the signature creates
  a.accounts; // the addresses those indices derive to, same order — signed, and asserted on chain
  a.additionalOwners; // the owners granted alongside `accountId`. Never the complete set
  a.threshold; // the threshold the account is set up with
  a.issuedAt; // unix seconds, signed — so the window bounds the message, not its submission
  a.deadline; // unix seconds, the last moment it may be used on any chain
}
void readIt;
```

`accounts` is in the message **and** re-derived on chain against each index before anything is
deployed. A signature cannot be replayed against a different set of addresses than the one its
signer was shown.

## Windows

| Constant                       | Value     | Means                                                 |
| ------------------------------ | --------- | ----------------------------------------------------- |
| `DEFAULT_AUTHORIZATION_WINDOW` | `900n`    | 15 minutes. What `buildAccountAuthorization` uses.    |
| `MAX_AUTHORIZATION_WINDOW`     | `18_000n` | 5 hours. What every chain accepts, as a hard ceiling. |

**The ceiling is measured from the signed `issuedAt`, not from submission.** So an over-long window
is refused _forever_ rather than merely early — the factory will never accept it, on any chain, at
any time. `buildAccountAuthorization` refuses it offline for that reason, before anyone is asked to
sign a message that cannot work.

A **forward-dated** `issuedAt` is a scheduled authorization rather than an invalid one: the contract
refuses it until that moment arrives. Which is exactly why it is worth reading before signing.

<!-- docexample: run -->

```ts
import {
  buildAccountAuthorization,
  DEFAULT_AUTHORIZATION_WINDOW,
  MAX_AUTHORIZATION_WINDOW,
  InvalidInputError,
} from "@somnia-chain/accounts-sdk";

DEFAULT_AUTHORIZATION_WINDOW; // => 900n
MAX_AUTHORIZATION_WINDOW; // => 18_000n

const base = {
  chainId: 50312,
  accountId: "0x000000000000000000000000000000000000dEaD",
  additionalOwners: [],
  now: 1_700_000_000n,
} as const;

// Over the ceiling is refused offline, before anyone signs something no chain will accept.
buildAccountAuthorization({...base, indices: [0n], window: MAX_AUTHORIZATION_WINDOW + 1n}); // => throws InvalidInputError

// And naming no index at all is refused for the same reason — on chain it is `NoIndices`,
// after the gas, after somebody approved a message authorising nothing.
buildAccountAuthorization({...base, indices: []}); // => throws InvalidInputError
```

## Building and signing one

```ts
import {
  buildAccountAuthorization,
  prepareAccountCreation,
  signWith,
} from "@somnia-chain/accounts-sdk";

const auth = buildAccountAuthorization({
  chainId, // only used to find the factory — the same address on every chain
  accountId: owner,
  indices: [0n, 1n, 2n], // a main account and two sub-accounts, one signature
  additionalOwners: [sessionKey],
  threshold: 1n, // the default, and what a session key needs
  now: BigInt(Math.floor(Date.now() / 1000)),
});

const creation = prepareAccountCreation({authorization: auth, chainId});
const sig = await signWith(signer, creation);
void sig;
```

`prepareAccountCreation` sets `signer` to `authorization.accountId`, and **only that address can
sign**: the factory recovers against exactly the address the accounts derive from. A session key
cannot stand in, however convenient that would be — a new account has no session key yet, which is
what the authorization is for.

Who _sends_ it is open, and usually a relayer.

## Fanning it out

```ts
import {createAccountWithOwnersCalls, prepareAccountCreation} from "@somnia-chain/accounts-sdk";

const creation = prepareAccountCreation({authorization, chainId});

// One signature, one call per chain. Returned as DATA rather than sent: each chain needs its own
// funded sender, and a chain that fails is retried rather than rolling the others back.
const perChain = creation.toCalls(signature, [5031, 50312, 50383]);
void [perChain, createAccountWithOwnersCalls];
```

**What this does not remove is one gas balance per chain.** The signature costs nothing and reaches
everywhere; the transactions still need a funded payer on each network, and that is the part that
actually fails. Report per chain, and read the owner list back rather than trusting the call — an
account someone else created first comes back deployed, with the granted key missing and no error
anywhere.

## Checking one before you trust it

```ts
import {checkAccountAuthorization, recoverAuthorizationSigner} from "@somnia-chain/accounts-sdk";

// Offline. Returns the problems, so a broadcaster can refuse before spending gas.
const problems = checkAccountAuthorization(
  {factory: account, authorization, signature},
  {now: BigInt(Math.floor(Date.now() / 1000)), chainId},
);
for (const problem of problems) {
  problem.kind; // "expired" | "window" | "notYetValid" | "empty" | "length" | "derivation" | "factory"
}
```

**An empty array means every _offline_ check passed. It does not mean the signature is
`accountId`'s.** There is deliberately no `signer` problem variant: recovery is async, and an
EIP-1271 signer answers on chain and may answer differently per chain and over time — a variant
nothing produces would read as a check this function performs. So a sponsor that trusts
`problems.length === 0` alone will pay for authorizations signed by anybody.
`recoverAuthorizationSigner` is the second half, and both are needed.

What `checkAccountAuthorization` covers, as a tagged union you can branch on:

| `kind`        | Means                                                                     | Worth retrying?                                                                    |
| ------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `expired`     | the deadline has passed                                                   | only with a fresh signature                                                        |
| `window`      | the deadline sits further past `issuedAt` than any chain accepts          | **never** — malformed, and the answer is the same today and in a year              |
| `notYetValid` | `issuedAt` has not arrived                                                | yes, from `issuedAt` onwards                                                       |
| `empty`       | no indices at all; the contract's `NoIndices`                             | no                                                                                 |
| `length`      | `indices` and `accounts` differ in length; `ListLengthMismatch`           | no — the message was built by hand rather than through `buildAccountAuthorization` |
| `derivation`  | a signed account address is not what its index derives to; `WrongAccount` | no                                                                                 |
| `factory`     | signed against a different factory                                        | no                                                                                 |

`notYetValid` is the one to surface rather than discard. **A signature nobody meant to schedule is
the shape a phished authorization takes**, and it is a _scheduled_ row, not a dead one.

`derivation` names the position and the index as well as the two addresses, because a batch has
several and "one of them is wrong" is not something a caller can act on.

**Run it before every broadcast, not once after signing.** A fan-out is N transactions over minutes
against a deadline measured in minutes, and each of these failures costs a transaction that reverts
after the gas is spent — while looking, from the outside, like the chain rejected a legitimate
signature.

### Recovering the signer

```ts
import {recoverAuthorizationSigner} from "@somnia-chain/accounts-sdk";

// Handles both shapes the factory accepts from an EOA: a plain EIP-712 signature, and the digest
// signed as a message with `v + 4` — Safe's convention, and the escape hatch for a wallet that
// refuses typed data whose domain it cannot validate.
const who = await recoverAuthorizationSigner({factory: account, authorization, signature});
void who;
```

**Not for an EIP-1271 signer.** When `accountId` is itself an account there is nothing to recover —
the parent answers `isValidSignature` on the chain being reached, and the answer can differ per
chain and over time. It throws `InvalidInputError` on anything that is not 65 bytes, which is every
case it cannot answer; ask the chain instead.

## Storing one

```ts
import {
  deserializeAccountAuthorization,
  serializeAccountAuthorization,
} from "@somnia-chain/accounts-sdk";

const row = serializeAccountAuthorization({factory: account, authorization, signature});
const back = deserializeAccountAuthorization(row);
void back;
```

`bigint` does not survive `JSON.stringify`, so these exist rather than leaving every consumer to
invent a representation that disagrees with the next one's. The serialized form carries the factory,
so a stored row is self-contained: a broadcaster can verify and send it without resolving a
manifest, and a row signed against a different deployment cannot be silently replayed against this
one.

## The lower-level pieces

| Function                        | For                                                           |
| ------------------------------- | ------------------------------------------------------------- |
| `accountAuthorizationTypedData` | the full EIP-712 payload                                      |
| `accountAuthorizationPayload`   | the payload `prepareAccountCreation` signs                    |
| `accountAuthorizationHash`      | the digest, for a wallet that will not render typed data      |
| `authorizationDomain`           | the domain, to show that it has no `chainId`                  |
| `ACCOUNT_AUTHORIZATION_TYPES`   | the type definitions                                          |
| `encodeCreateAccountWithOwners` | calldata only, for a caller assembling the transaction itself |

## Related

- [How to create accounts on every chain](../how-to/create-accounts-on-every-chain.md)
- [Gas](./gas.md) — `createAccountsGasLimit`, and why a batch needs its own limit
