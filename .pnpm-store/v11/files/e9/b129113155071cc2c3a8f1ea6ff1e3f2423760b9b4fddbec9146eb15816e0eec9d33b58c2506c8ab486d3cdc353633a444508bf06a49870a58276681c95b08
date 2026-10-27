# Somnia Accounts SDK documentation

This page is the map of the `@somnia-chain/accounts-sdk` documentation. The pages are grouped by
what you need right now: to learn, to finish a task, to look something up, or to understand a
design.

**Every TypeScript example on every page is compiled against the published API, and the ones making
a claim about a result are executed.** `scripts/generate-doc-examples.mjs` lifts each fenced `ts`
block into a module that `pnpm typecheck` compiles; a block marked `<!-- docexample: run -->` becomes
a real test instead, where every `// => value` you see in the prose is an assertion. CI fails if a
document drifts from either.

That second tier exists because compiling is not the same as being true: a page once claimed a
function returned `undefined` where it returns a value, and the example compiled perfectly. Anything
chain-free that asserts a result is now checked against the implementation on every run.

The tutorials need a funded testnet key; they are type-correct but have not been executed for you.

## Start here

Two lessons take you from an empty directory to acting from a sub-account on Somnia testnet. Follow
them in order. Each takes about 15 minutes.

1. [Create your first account](./tutorials/create-your-first-account.md). Derive an address offline,
   create the account and grant a session key with one signature, then act with no signature at all.
2. [Act from a sub-account](./tutorials/act-from-a-sub-account.md). An account owned by an account:
   create it, fund it, and sign through the parent to empty it.

## Do a task

Goal-shaped guides for a developer who already knows what they want.

- [Drive this SDK from another SDK](./how-to/integrate-with-another-sdk.md) — the executor adapter,
  and the five things to get right at that seam
- [Create accounts on every chain](./how-to/create-accounts-on-every-chain.md) — one signature, all
  three networks
- [Act without a signature](./how-to/act-without-a-signature.md) — the pre-validated path
- [Grant and revoke a session key](./how-to/grant-and-revoke-a-session-key.md)
- [Sponsor a transaction](./how-to/sponsor-a-transaction.md) — when a relayer pays
- [Sign with a browser wallet](./how-to/sign-with-a-browser-wallet.md)
- [Find an account](./how-to/find-an-account.md) — scanning, owner sets, the ownership graph
- [Use the indexer](./how-to/use-the-indexer.md) — the reverse lookup, history, and saying when
  the answer is old
- [Move funds between accounts](./how-to/move-funds-between-accounts.md)
- [Check an account is healthy](./how-to/check-an-account-is-healthy.md)
- [Handle errors and reverts](./how-to/handle-errors-and-reverts.md)

## Look something up

Neutral descriptions of the machinery. Facts, defaults and constraints, without instruction.

- [Addresses and chains](./reference/addresses-and-chains.md) — coverage, contract names, salt
  versions, and what an unsupported chain does
- [Account derivation](./reference/account-derivation.md) — the formula, and what follows from it
- [Account authorization](./reference/authorization.md) — the chain-agnostic EIP-712 surface, field
  by field
- [Gas](./reference/gas.md) — the limits, the floors, and why estimation does not work here
- [The call, and who may send it](./reference/the-call-and-who-may-send-it.md) — `Call` vs
  `SenderBoundCall`
- [Safe transactions](./reference/safe-transactions.md) — `SafeTx`, batching, hashing, the outer
  transaction, and the ABIs
- [Errors](./reference/errors.md) — every class, its fields, and Safe's own codes
- The API reference lists every function, type and constant, generated from the source. Build it
  with `pnpm --filter @somnia-chain/accounts-sdk docs`; it lands in `docs/api/` and is not
  committed.

## Understand the design

Discussion for reading away from the keyboard.

- [About the two-key model](./explanation/about-the-two-key-model.md) — what the owner/session split
  buys, and the fact that threshold 1 grants total authority
- [About accounts owning accounts](./explanation/about-accounts-owning-accounts.md) — why depth is
  cheap, and why only the acting account has a nonce
- [About data-first design](./explanation/about-data-first-design.md) — why there is no client
- [Architecture](./ARCHITECTURE.md) — module by module, the three seams, and every generated file's
  gate

## If you only read four things

The failures that cost the most time, in the order you will hit them:

1. **Gas cannot be estimated here, and the failure is silent.** [Gas](./reference/gas.md).
2. **A receipt is not a success.** Assert `receipt.status`; `submitCall` does it for you.
3. **`deployed: undefined` is not `deployed: false`.** An unanswered read rendered as "nothing
   there" shows a funded account as empty. [How to find an account](./how-to/find-an-account.md).
4. **A pre-validated call is valid from one address only.**
   [The call, and who may send it](./reference/the-call-and-who-may-send-it.md).

## Elsewhere in the repository

- `docs/contracts.md` — every deployed contract, its address per chain, and the standing admin risk
- `docs/flows.md` — the exact onboarding and trading flows, written from the code
- `RULES.md` — the normative rule catalog; `STANDARDS.md` — the reasoning behind it
