# About the two-key model

Discussion, for reading away from the keyboard. Why an account has an owner key and a session key,
what the arrangement buys, and what it costs.

## The problem it solves

An application that trades, or does anything on a user's behalf more than once, has to choose
between two bad options if the user's wallet is the account:

- **Prompt for everything.** Correct, and unusable: a wallet dialog per order.
- **Hold the user's key.** Usable, and unacceptable.

A smart account splits the difference by making _authority_ something you can grant to a second key
without giving away the first.

## The two roles

|            | Owner key                                                         | Session key                 |
| ---------- | ----------------------------------------------------------------- | --------------------------- |
| What it is | the user's wallet — external, or an embedded key                  | a key the application holds |
| Its job    | it **is** the account's `accountId`, so it determines the address | acts, unattended            |
| Signs      | one consent decision                                              | everything afterwards       |
| Sends      | **never**                                                         | everything                  |
| Needs gas  | **no**                                                            | yes                         |

The owner key never needing gas is not a convenience. `execTransaction` checks signatures, not
`msg.sender`, so the submitter needs no authority at all — which means the account can be created
and granted by a key that holds nothing, or by a sponsor. Proven on chain: the onboarding test
submits from a throwaway key that owns nothing and asserts the owner key's transaction count is
**unchanged**.

## The one prompt

There is exactly one, and it is a real decision rather than a technical step: _this key may act for
me_. It is worth presenting as one.

Since `createAccountWithOwners`, that prompt covers **every chain at once**, because the
authorization's EIP-712 domain omits `chainId`. Before that it was one prompt per network, and the
reason was entirely in the grant: Safe's own domain contains the chain id, so the same consent
decision was a different message on each one.

## What it costs: threshold 1 means total authority

**The session key can do everything the owner can, including removing it.**

This is the part to be honest about. There is no threshold that grants partial authority:

- **Threshold 1, two owners** — either key acts alone. The session key is the account.
- **Threshold 2, two owners** — the session key cannot act alone, which is exactly what it was added
  for.

So the model does not restrict the key; it _isolates_ it. What bounds the damage is not the
threshold, it is **what the account holds**. A session key on an account with a day's trading float
is a bounded risk. The same key on an account holding everything is not.

Constraining a key to particular actions needs a module and a module guard — a different mechanism,
deliberately not part of this model yet. Anyone promising "a session key that can only trade" is
describing that, not this.

## Why the address does not move

The address derives from `keccak256(abi.encode(accountId, index))` under CREATE3. Owners are Safe
state and are not in that derivation, so rotating every owner leaves the account exactly where it
was — and, crucially, still **derivable** from the `accountId`.

Compare a CREATE2 recipe, where the address depends on the original `setup()` calldata: rotate the
owners and the address is no longer reproducible from a key you hold. The account still exists; you
just cannot find it. That is the difference between recovery being possible and not.

## The states an account can be in

`nextOnboardingStep` in the explorer models four, and the fourth is the interesting one:

| State      | Meaning                                             |
| ---------- | --------------------------------------------------- |
| `create`   | no code at the address                              |
| `activate` | deployed, owner key is an owner, session key is not |
| `ready`    | both keys are owners                                |
| `stranded` | deployed, and **neither** key is an owner           |

**`stranded` is reachable**, precisely because the address survives owner rotation. There is no step
out of it. Health reports it; nothing can fix it.

`activate` is the state the one-signature flow removes from the happy path — it is the gap where a
user could be left needing a second prompt, and `createAccountWithOwners` has no moment between
creating and granting.

## What the model deliberately does not do

**It does not remove one gas balance per chain.** The signature costs nothing and reaches
everywhere; the transactions still need a funded payer on each network, and that is the part that
actually fails. A cross-chain flow has to report per chain and read the owner list back rather than
trusting the call — an account someone else created first comes back deployed, with the granted key
missing, and no error anywhere.

**It does not authenticate creation.** `createAccount` is permissionless because the factory forces
the owner from the salt, so a stranger deploying your account cannot inject an owner. The account
comes out owned by that `accountId` alone. What this does mean is that account _existence_ is not a
signal you control — if your rollout gates on "does this account have code", anyone who knows the
user's login wallet can flip that gate.

## Related

- [About accounts owning accounts](./about-accounts-owning-accounts.md)
- [How to grant and revoke a session key](../how-to/grant-and-revoke-a-session-key.md)
- [Account authorization](../reference/authorization.md)
